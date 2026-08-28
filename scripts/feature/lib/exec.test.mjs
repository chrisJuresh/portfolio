import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { session } from './exec.mjs';

/** A command that fails with a refusal-shaped message, on any platform. */
const REFUSES = [
  '-e',
  "process.stderr.write('EBUSY: resource busy or locked, rmdir'); process.exit(1)",
];

function log() {
  return join(mkdtempSync(join(tmpdir(), 'exec-')), 'friction-log.md');
}

test('a refusal is recorded, and reaches the log', () => {
  const sh = session({ command: 'pnpm feature land' });
  const result = sh.run(process.execPath, REFUSES);
  assert.equal(result.status, 1);
  assert.ok(result.refused, 'it was classified as a refusal');
  const file = log();
  assert.equal(sh.finish(file), 1);
  assert.match(readFileSync(file, 'utf8'), /EBUSY/);
});

test('an expected failure is not recorded, and the log is not created', () => {
  // `git worktree remove` failing on a locked directory is an ordinary step of
  // this flow with a documented completion, not a gate that should not have been
  // there. Recording it anyway wrote an identical entry on every land, into the
  // main checkout, uncommitted — which then blocked the NEXT land's
  // `pull --ff-only` on a locally modified file.
  const sh = session({ command: 'pnpm feature land' });
  const result = sh.run(process.execPath, REFUSES, { expected: true });
  assert.equal(result.status, 1, 'it still failed, and still says so');
  assert.equal(result.refused, undefined, 'but it is not a refusal');
  const file = log();
  assert.equal(sh.finish(file), 0);
  assert.throws(() => readFileSync(file, 'utf8'), /ENOENT/);
});

test('a command killed by a signal is a failure, not a success', () => {
  // `spawnSync` leaves `status` null and sets `signal` instead. Defaulting that
  // to 0 made a Ctrl-C'd `pnpm check` read as a passing one, and `feature land`
  // would have pushed on the strength of it.
  const sh = session({ command: 'pnpm feature land' });
  const result = sh.run(process.execPath, ['-e', 'process.kill(process.pid, "SIGKILL")']);
  assert.notEqual(result.status, 0, `status was ${result.status}`);
});

test('note records something no command reported', () => {
  // The dev server that would not stop: nothing exited non-zero, and it is still
  // the thing that will make the next step fail.
  const sh = session({ command: 'pnpm feature land' });
  sh.note({
    what: 'stopping the dev server on 4321',
    gate: 'a process that would not stop',
    refusal: '4321 is still held two seconds later',
    fix: 'find what is listening and stop it',
  });
  const file = log();
  assert.equal(sh.finish(file), 1);
  assert.match(readFileSync(file, 'utf8'), /still held two seconds later/);
});
