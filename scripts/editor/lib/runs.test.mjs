import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';

import { KEPT, Runs, outcome, tail } from './runs.mjs';

/**
 * Running a Bake, at the seam where the decision is made rather than at the
 * process.
 *
 * WHAT IS WORTH ASSERTING HERE is what the surface is going to READ: whether a
 * run is in flight, whether it ended well, and what it says when it did not.
 * Spawning a real generator is not that — every one of them needs something this
 * repository does not carry, so a test that ran one would be asserting the
 * machine and not the code. So `spawn` is handed in, and these drive a fake
 * child through the same events a real one emits.
 */

/** A child process, as far as `Runs` is concerned. */
function fakeChild() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdout.setEncoding = () => {};
  child.stderr.setEncoding = () => {};
  return child;
}

function harness() {
  const started = [];
  let child = null;
  const runs = new Runs({
    spawnProcess: (program, args, options) => {
      started.push({ program, args, options });
      child = fakeChild();
      return child;
    },
    now: () => 1000,
  });
  return { runs, started, child: () => child };
}

// ---------------------------------------------------------------------------
// Saying what happened
// ---------------------------------------------------------------------------

test('an exit of zero is the generator finishing', () => {
  assert.deepEqual(outcome({ code: 0 }), { ok: true, why: 'the generator finished' });
});

test('a non-zero exit says which', () => {
  const { ok, why } = outcome({ code: 2 });
  assert.equal(ok, false);
  assert.match(why, /exited 2/);
});

test('a program that is not there says so, rather than reporting a status', () => {
  const missing = Object.assign(new Error('spawn python ENOENT'), { code: 'ENOENT', path: 'python' });
  const { ok, why } = outcome({ error: missing });
  assert.equal(ok, false);
  assert.match(why, /python/);
  assert.match(why, /not on PATH/);
});

test('a signal is named', () => {
  assert.match(outcome({ signal: 'SIGTERM' }).why, /SIGTERM/);
});

// ---------------------------------------------------------------------------
// What is kept of the output
// ---------------------------------------------------------------------------

test('short output is kept whole', () => {
  assert.equal(tail('one line\n'), 'one line\n');
});

test('long output keeps the END, which is where a traceback says what broke', () => {
  const long = 'x'.repeat(KEPT) + '\nFileNotFoundError: photos/dome.rw2\n';
  const kept = tail(long);
  assert.match(kept, /FileNotFoundError/);
  assert.match(kept, /earlier characters not kept/);
  assert.ok(kept.length < long.length);
});

// ---------------------------------------------------------------------------
// The runs themselves
// ---------------------------------------------------------------------------

test('a started run is in flight, and is the one that Bake is running', () => {
  const { runs, started } = harness();
  const run = runs.start({ bake: 'plate', argv: ['python', 'x.py', '--a', 'b'], cwd: '/repo' });
  assert.equal(run.state, 'running');
  assert.equal(runs.running('plate'), run);
  assert.equal(runs.running('effects'), null);
  assert.deepEqual(started[0].args, ['x.py', '--a', 'b']);
  assert.equal(started[0].program, 'python');
});

test('a close of zero ends it well and keeps what it printed', async () => {
  const { runs, child } = harness();
  const run = runs.start({ bake: 'plate', argv: ['python', 'x.py'], cwd: '/repo' });
  child().stdout.emit('data', 'wrote portfolio/img/plate-800.webp\n');
  child().emit('close', 0, null);
  await Promise.resolve();
  assert.equal(run.state, 'done');
  assert.equal(run.ok, true);
  assert.match(run.log, /plate-800/);
  assert.equal(runs.running('plate'), null);
});

test('a failure keeps stderr, which is where the reason is', async () => {
  const { runs, child } = harness();
  const run = runs.start({ bake: 'plate', argv: ['python', 'x.py'], cwd: '/repo' });
  child().stderr.emit('data', 'no such file: photos/dome.rw2\n');
  child().emit('close', 1, null);
  await Promise.resolve();
  assert.equal(run.state, 'failed');
  assert.match(run.why, /exited 1/);
  assert.match(run.log, /no such file/);
});

test('what runs after a success can fail the run, and says it separately', async () => {
  const { runs, child } = harness();
  const run = runs.start({
    bake: 'plate',
    argv: ['python', 'x.py'],
    cwd: '/repo',
    after: () => {
      throw new Error('the build failed');
    },
  });
  child().emit('close', 0, null);
  await new Promise((ok) => setImmediate(ok));
  assert.equal(run.state, 'failed');
  assert.match(run.why, /the generator finished/);
  assert.match(run.why, /the build failed/);
});

test('a second close does not reopen a run that already ended', async () => {
  const { runs, child } = harness();
  const run = runs.start({ bake: 'plate', argv: ['python', 'x.py'], cwd: '/repo' });
  child().emit('close', 0, null);
  await Promise.resolve();
  child().emit('close', 1, null);
  await Promise.resolve();
  assert.equal(run.state, 'done');
});

test('latest holds one run per Bake, and a run is found by its id', async () => {
  const { runs, child } = harness();
  const first = runs.start({ bake: 'plate', argv: ['python', 'x.py'], cwd: '/repo' });
  child().emit('close', 0, null);
  await Promise.resolve();
  const second = runs.start({ bake: 'plate', argv: ['python', 'x.py'], cwd: '/repo' });
  child().emit('close', 0, null);
  await Promise.resolve();
  runs.start({ bake: 'effects', argv: ['python', 'y.py'], cwd: '/repo' });

  assert.equal(runs.get(first.id).id, first.id);
  const held = runs.latest();
  assert.equal(held.length, 2);
  assert.equal(held.find((run) => run.bake === 'plate').id, second.id);
});
