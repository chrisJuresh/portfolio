import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { add, load, lock, ports, remove, save, statePath } from './state.mjs';

function scratch() {
  return join(mkdtempSync(join(tmpdir(), 'feature-state-')), 'feature-state.json');
}

const feature = {
  branch: 'port-the-panel',
  directory: 'port-the-panel',
  path: 'C:/repo/.claude/worktrees/port-the-panel',
  port: 4321,
  pid: 12345,
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
