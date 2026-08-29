import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { add, load, lock, ports, prune, reconcile, remove, save, statePath } from './state.mjs';

function scratch() {
  return join(mkdtempSync(join(tmpdir(), 'feature-state-')), 'feature-state.json');
}

/** @type {import('./state.mjs').Feature} */
const feature = {
  branch: 'port-the-panel',
  directory: 'port-the-panel',
  path: 'C:/repo/.claude/worktrees/port-the-panel',
  port: 4321,
  pid: 12345,
  listener: 12346,
  startedAt: '2026-08-22T14:00:00.000Z',
};

test('the state file lives in the git common dir, so every worktree sees one', () => {
  // Not in a worktree and not in the working tree: a worktree only gets a file
  // if git puts it there, and this file has to be readable from a worktree that
  // was created after it was written. The common dir is the one directory every
  // worktree of a clone shares, and nothing there is ever committed.
  assert.equal(statePath('C:/repo/.git'), 'C:/repo/.git/feature-state.json');
  assert.equal(statePath('C:/repo/.git/'), 'C:/repo/.git/feature-state.json');
});

test('a state file that is not there reads as no features', () => {
  assert.deepEqual(load(join(tmpdir(), 'definitely-not-here-42', 'x.json')), { features: [] });
});

test('a half-written state file reads as no features rather than wedging', () => {
  // The failure this prevents: one interrupted write making every later
  // `feature start` throw on a file nobody would think to look at.
  const file = scratch();
  writeFileSync(file, '{"features": [{"branch": "por', 'utf8');
  assert.deepEqual(load(file), { features: [] });
});

test('a feature survives a save and a load', () => {
  const file = scratch();
  save(file, add({ features: [] }, feature));
  assert.deepEqual(load(file).features, [feature]);
});

test('add refuses to record a branch twice', () => {
  // Two entries for one branch means `feature land` tears down one and leaves
  // the other pointing at a directory that is gone.
  assert.throws(() => add({ features: [feature] }, feature), /already recorded/);
});

test('remove takes exactly the named feature out', () => {
  const two = add(add({ features: [] }, feature), { ...feature, branch: 'other', port: 4322 });
  assert.deepEqual(
    remove(two, 'other').features.map((f) => f.branch),
    ['port-the-panel'],
  );
  // Removing something that was never there is not an error: `feature land`
  // must still finish for a worktree made by hand.
  assert.deepEqual(remove({ features: [] }, 'nothing').features, []);
});

test('ports reports what is held, which is what stops two features colliding', () => {
  const two = add(add({ features: [] }, feature), { ...feature, branch: 'other', port: 4322 });
  assert.deepEqual(ports(two), new Set([4321, 4322]));
});

/** A feature that landed, whose worktree was removed by something that never
 *  touched the registry — by hand, or by an agent harness that made its own. */
const gone = {
  ...feature,
  branch: 'landed-last-week',
  directory: 'landed-last-week',
  path: 'C:/repo/.claude/worktrees/landed-last-week',
  port: 4322,
};

test('reconcile keeps a feature whose worktree git still lists', () => {
  const state = { features: [feature] };
  const { live, spent } = reconcile(state, { listed: [feature.path], onDisk: () => false });
  assert.deepEqual(live.features, [feature]);
  assert.deepEqual(spent, []);
});

test('reconcile drops a row whose worktree git no longer lists and which is not on disk', () => {
  // The bug this exists for: a row only comes out of the registry when a
  // teardown runs, so a worktree removed any other way leaves one behind for
  // good. Eight rows, one worktree, and `feature list` calling all eight of them
  // in flight.
  const state = { features: [feature, gone] };
  const { live, spent } = reconcile(state, { listed: [feature.path], onDisk: () => false });
  assert.deepEqual(
    live.features.map((one) => one.branch),
    ['port-the-panel'],
  );
  assert.deepEqual(
    spent.map((one) => one.branch),
    ['landed-last-week'],
  );
});

test('dropping the row frees the port it was holding', () => {
  // The half that is not cosmetic. `feature start` chooses out of `ports`, so
  // every stale row eats a port out of the pool permanently.
  const state = { features: [feature, gone] };
  assert.deepEqual(ports(state), new Set([4321, 4322]));
  const { live } = reconcile(state, { listed: [feature.path], onDisk: () => false });
  assert.deepEqual(ports(live), new Set([4321]));
});

test('an orphan still on disk keeps its row, because clean needs the port and the pid', () => {
  // `git worktree remove` unregisters the tree and THEN deletes the files, so one
  // that died on a locked file is unlisted and still there — the exact state
  // `feature clean` exists to finish. Its row is the only record of what is still
  // serving inside it, and dropping that would leave the port genuinely held with
  // nothing able to name the process holding it.
  const { live, spent } = reconcile(
    { features: [gone] },
    { listed: [], onDisk: (path) => path === gone.path },
  );
  assert.deepEqual(live.features, [gone]);
  assert.deepEqual(spent, []);
});

test('reconcile reads the two spellings of a path as one path', () => {
  // `git worktree list` says C:/…, the registry was written from a value that may
  // say C:\…, and the drive letter's case is not stable between them. A strict
  // comparison here would drop every live feature and take its port with it —
  // which is the same bug as the one above, pointing the other way.
  const { live, spent } = reconcile(
    { features: [feature] },
    {
      listed: ['c:\\repo\\.claude\\worktrees\\port-the-panel\\'],
      onDisk: () => false,
    },
  );
  assert.deepEqual(live.features, [feature]);
  assert.deepEqual(spent, []);
});

test('reconcile is unmoved by an empty registry and by git listing nothing', () => {
  assert.deepEqual(reconcile({ features: [] }, { listed: [], onDisk: () => false }), {
    live: { features: [] },
    spent: [],
  });
});

test('prune writes the reconciled registry back, rather than filtering on the way out', async () => {
  // Filtering in `feature list` alone would leave the port leak exactly where it
  // was, because `feature start` reads the file and not the printout.
  const file = scratch();
  const here = mkdtempSync(join(tmpdir(), 'feature-tree-'));
  const orphan = join(here, 'an-orphan');
  mkdirSync(orphan, { recursive: true });

  save(file, {
    features: [
      { ...feature, path: here },
      gone,
      { ...feature, branch: 'an-orphan', port: 4323, path: orphan },
    ],
  });

  const dropped = await prune(file, [here]);
  assert.deepEqual(
    dropped.map((one) => one.branch),
    ['landed-last-week'],
  );
  assert.deepEqual(
    load(file).features.map((one) => one.branch),
    ['port-the-panel', 'an-orphan'],
    'the orphan on disk survives; only the row about nothing goes',
  );
});

test('prune leaves a registry with nothing to drop alone', async () => {
  const file = scratch();
  const here = mkdtempSync(join(tmpdir(), 'feature-tree-'));
  save(file, { features: [{ ...feature, path: here }] });
  const before = readFileSync(file, 'utf8');
  assert.deepEqual(await prune(file, [here]), []);
  assert.equal(readFileSync(file, 'utf8'), before);
});

test('prune takes the lock, so it cannot race a feature start choosing a port', async () => {
  const file = scratch();
  save(file, { features: [gone] });
  const held = await lock(file);
  await assert.rejects(() => prune(file, []), /already choosing/);
  held.release();
  assert.equal((await prune(file, [])).length, 1);
});

test('the lock is exclusive, and releasing it lets the next one in', async () => {
  const file = scratch();
  const held = await lock(file);
  await assert.rejects(() => lock(file, { attempts: 2, wait: 1 }), /already choosing/);
  held.release();
  const next = await lock(file, { attempts: 2, wait: 1 });
  next.release();
});

test('a lock left behind by a killed process goes stale rather than forever', async () => {
  // Otherwise one Ctrl-C during `feature start` makes every later one fail, and
  // the fix is deleting a file nobody has been told about.
  const file = scratch();
  const held = await lock(file);
  assert.equal(typeof held.path, 'string');
  writeFileSync(held.path, JSON.stringify({ at: 0, pid: process.pid }), 'utf8');
  const next = await lock(file, { attempts: 1, stale: 1 });
  next.release();
  assert.throws(() => readFileSync(held.path, 'utf8'), /ENOENT/);
});
