import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { deletable, listsWorktree, refusedForDirt, removeTree, samePath } from './teardown.mjs';

const root = 'C:/Users/Chris/Desktop/portfolio';
const under = `${root}/.claude/worktrees/port-the-panel`;

test('one spelling of a path, whichever side of the process it came from', () => {
  // `git worktree list` says C:/…, `process.cwd()` says C:\…, the drive letter's
  // case is not stable between them, and a trailing separator is not data. This
  // is the comparison four modules were each writing their own version of.
  assert.equal(samePath('C:\\repo\\a\\'), 'c:/repo/a');
  assert.equal(samePath('C:/repo/a'), samePath('c:\\repo\\a\\'));
});

test('listsWorktree answers the one question three commands ask of git', () => {
  // `feature clean` asks it to decide whether a directory is an orphan, the
  // guard below asks it before deleting, and `state.mjs` asks it of every row in
  // the registry. A second spelling would show up there as ghosts nothing could
  // explain.
  assert.equal(listsWorktree([under, root], `${under}/`), true);
  assert.equal(listsWorktree([under], under.replace(/\//g, '\\').toUpperCase()), true);
  assert.equal(listsWorktree([under], `${root}/.claude/worktrees/other`), false);
  assert.equal(listsWorktree([], under), false);
});

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

test('an orphan is deletable only when the caller says it has established that', () => {
  // The state a failed removal leaves: `git worktree remove` unregisters and
  // then deletes, so one that dies on a locked file leaves the tree on disk with
  // nothing pointing at it. `feature clean` finishes those, having first
  // established that the work landed.
  assert.equal(deletable({ path: under, root, listed: [], orphan: true }).ok, true);
  assert.equal(deletable({ path: under, root, listed: [], orphan: false }).ok, false);
});

test('orphan does not open the two guards that matter', () => {
  // The flag is an exception to "git lists it" and to nothing else.
  assert.equal(deletable({ path: root, root, listed: [], orphan: true }).ok, false);
  assert.equal(deletable({ path: `${root}/src`, root, listed: [], orphan: true }).ok, false);
  assert.equal(deletable({ path: 'C:/Users/Chris', root, listed: [], orphan: true }).ok, false);
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

test('git protecting somebody\'s work is told apart from git being unable to delete', () => {
  // These two look identical from an exit code and mean opposite things. Getting
  // it wrong once meant a recursive delete run over the top of git's refusal, on
  // a worktree full of uncommitted work; nothing was lost only because node's
  // rmSync failed on the top-level rmdir before it recursed.
  assert.equal(
    refusedForDirt(
      "fatal: 'C:/repo/.claude/worktrees/a' contains modified or untracked files, use --force to delete it",
    ),
    true,
  );
  // Every failure that means "git could not finish", and for which the by-hand
  // removal IS the answer.
  assert.equal(refusedForDirt("fatal: failed to delete 'C:/repo/…/a': Directory not empty"), false);
  assert.equal(refusedForDirt('error: EBUSY: resource busy or locked'), false);
  assert.equal(refusedForDirt('fatal: validation failed, cannot remove working tree'), false);
  assert.equal(refusedForDirt(''), false);
  assert.equal(refusedForDirt(undefined), false);
});

test('removeTree retries, because the lock that blocked it clears on its own', async () => {
  // Measured: a `feature land` whose Checks had just run a build and a headless
  // browser could not delete its own worktree, and the same removal succeeded a
  // minute later with nothing done in between. Something the build left holding a
  // file under node_modules lets go by itself, so the removal waits rather than
  // handing the author a directory to delete.
  let calls = 0;
  const rm = () => {
    calls += 1;
    if (calls < 3) {
      const error = new Error('EBUSY: resource busy or locked');
      error.code = 'EBUSY';
      throw error;
    }
  };
  const found = await removeTree({
    path: `${root}/.claude/worktrees/a`,
    root,
    listed: [`${root}/.claude/worktrees/a`],
    rm,
    wait: 1,
  });
  assert.equal(found.removed, true, found.why);
  assert.equal(calls, 3);
});

test('removeTree gives up after its attempts, and says what the last refusal was', async () => {
  let calls = 0;
  const rm = () => {
    calls += 1;
    throw new Error('EPERM: operation not permitted');
  };
  const found = await removeTree({
    path: `${root}/.claude/worktrees/a`,
    root,
    listed: [`${root}/.claude/worktrees/a`],
    rm,
    wait: 1,
    attempts: 4,
  });
  assert.equal(found.removed, false);
  assert.equal(calls, 4, 'it tried every attempt');
  // The reason has to survive: the report is the only place the author sees it,
  // and dropping it cost a diagnosis session once.
  assert.match(found.why, /EPERM/);
  assert.match(found.why, /4 attempt/);
});

test('removeTree does not retry a refusal from the guard', async () => {
  // The guard's answer will not change on a second try, and a command that
  // paused for ten seconds before saying "that is the main checkout" would read
  // as broken.
  let calls = 0;
  const found = await removeTree({
    path: root,
    root,
    listed: [root],
    rm: () => {
      calls += 1;
    },
    wait: 10_000,
  });
  assert.equal(found.removed, false);
  assert.equal(calls, 0, 'it never reached the removal');
});

test('removeTree refuses rather than deleting when the guard says no', async () => {
  // The one test that matters if this module is ever edited: the guard is not
  // advisory.
  const scratch = mkdtempSync(join(tmpdir(), 'teardown-'));
  mkdirSync(join(scratch, 'keep'), { recursive: true });
  writeFileSync(join(scratch, 'keep', 'file.txt'), 'still here', 'utf8');
  const found = await removeTree({ path: join(scratch, 'keep'), root: scratch, listed: [] });
  assert.equal(found.removed, false);
  assert.notEqual(found.why, '', 'it says why');
  assert.equal(existsSync(join(scratch, 'keep', 'file.txt')), true, 'unchanged on disk');
});

test('removeTree forwards orphan to the guard, so an unregistered tree can be cleaned', async () => {
  // A regression, and the kind that is invisible from either side: `deletable`
  // took the flag and `clean` passed it, but `removeTree` in between did not name
  // it in its destructuring — so the one case the flag exists for was the one
  // case that did not work, and `feature clean` refused every orphan with "git
  // does not list it as a worktree".
  const scratch = mkdtempSync(join(tmpdir(), 'teardown-'));
  const tree = join(scratch, '.claude', 'worktrees', 'an-orphan');
  mkdirSync(tree, { recursive: true });
  writeFileSync(join(tree, 'left-behind.txt'), 'x', 'utf8');
  const found = await removeTree({ path: tree, root: scratch, listed: [], orphan: true });
  assert.equal(found.removed, true, found.why);
  assert.equal(existsSync(tree), false);
});

test('removeTree deletes a tree the guard allows, node_modules depth and all', async () => {
  // The case this module exists for. `git worktree remove` gives up on pnpm's
  // `.pnpm/<mangled>/node_modules/...` paths on Windows with "Directory not
  // empty" — over 250 characters from the drive root — and leaves thirteen
  // thousand files behind. Node's own removal is long-path aware.
  const scratch = mkdtempSync(join(tmpdir(), 'teardown-'));
  const tree = join(scratch, '.claude', 'worktrees', 'deep-one');
  const deep = join(tree, 'node_modules', '.pnpm', `${'a'.repeat(60)}@1.0.0_${'b'.repeat(32)}`, 'node_modules', '@scope', 'name', 'dist');
  mkdirSync(deep, { recursive: true });
  writeFileSync(join(deep, 'index.mjs'), 'export default 1', 'utf8');
  const found = await removeTree({ path: tree, root: scratch, listed: [tree] });
  assert.equal(found.removed, true, found.why);
  assert.equal(existsSync(tree), false);
});
