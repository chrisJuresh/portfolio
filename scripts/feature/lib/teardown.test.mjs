import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { deletable, removeTree } from './teardown.mjs';

const root = 'C:/Users/Chris/Desktop/portfolio';
const under = `${root}/.claude/worktrees/port-the-panel`;

test('a worktree git listed, under .claude/worktrees, may be deleted', () => {
  assert.equal(deletable({ path: under, root, listed: [under] }).ok, true);
});

test('the main checkout may never be deleted, whatever else is true', () => {
  // This is the guard that matters. Everything below it is a variation on
  // "something told us a path and we did not check it".
  const found = deletable({ path: root, root, listed: [root, under] });
  assert.equal(found.ok, false);
  assert.match(found.why, /main checkout/i);
});

test('a path outside .claude/worktrees may not be deleted', () => {
  for (const path of ['C:/Users/Chris', `${root}/src`, `${root}/.claude`, 'C:/']) {
    const found = deletable({ path, root, listed: [path] });
    assert.equal(found.ok, false, path);
    assert.match(found.why, /\.claude[\\/]worktrees/i, path);
  }
});

test('a path git never listed as a worktree may not be deleted', () => {
  // Being in the right place is not enough: a directory nobody registered is
  // somebody's work in progress, not a spent worktree.
  const found = deletable({ path: under, root, listed: [] });
  assert.equal(found.ok, false);
  assert.match(found.why, /does not list .* as a worktree/i);
});

test('a worktree that is a level deeper is still under the worktrees directory', () => {
  const deep = `${root}/.claude/worktrees/group/name`;
  assert.equal(deletable({ path: deep, root, listed: [deep] }).ok, true);
});

test('the comparison survives the separators and the casing Windows hands over', () => {
  // `git worktree list` says C:/…, `process.cwd()` says C:\…, and the drive
  // letter's case is not stable between them. A guard that compared these
  // strictly would refuse every real teardown and be turned off.
  const found = deletable({
    path: 'c:\\Users\\Chris\\Desktop\\portfolio\\.claude\\worktrees\\port-the-panel',
    root,
    listed: [under],
  });
  assert.equal(found.ok, true, found.why);
});

test('a trailing separator does not make a path a different path', () => {
  assert.equal(deletable({ path: `${under}/`, root, listed: [under] }).ok, true);
  assert.equal(deletable({ path: root, root: `${root}/`, listed: [root] }).ok, false);
});

test('removeTree refuses rather than deleting when the guard says no', () => {
  // The one test that matters if this module is ever edited: the guard is not
  // advisory.
  const scratch = mkdtempSync(join(tmpdir(), 'teardown-'));
  mkdirSync(join(scratch, 'keep'), { recursive: true });
  writeFileSync(join(scratch, 'keep', 'file.txt'), 'still here', 'utf8');
  const found = removeTree({ path: join(scratch, 'keep'), root: scratch, listed: [] });
  assert.equal(found.removed, false);
  assert.notEqual(found.why, '', 'it says why');
  assert.equal(existsSync(join(scratch, 'keep', 'file.txt')), true, 'unchanged on disk');
});

test('removeTree deletes a tree the guard allows, node_modules depth and all', () => {
  // The case this module exists for. `git worktree remove` gives up on pnpm's
  // `.pnpm/<mangled>/node_modules/...` paths on Windows with "Directory not
  // empty" — over 250 characters from the drive root — and leaves thirteen
  // thousand files behind. Node's own removal is long-path aware.
  const scratch = mkdtempSync(join(tmpdir(), 'teardown-'));
  const tree = join(scratch, '.claude', 'worktrees', 'deep-one');
  const deep = join(tree, 'node_modules', '.pnpm', `${'a'.repeat(60)}@1.0.0_${'b'.repeat(32)}`, 'node_modules', '@scope', 'name', 'dist');
  mkdirSync(deep, { recursive: true });
  writeFileSync(join(deep, 'index.mjs'), 'export default 1', 'utf8');
  const found = removeTree({ path: tree, root: scratch, listed: [tree] });
  assert.equal(found.removed, true, found.why);
  assert.equal(existsSync(tree), false);
});
