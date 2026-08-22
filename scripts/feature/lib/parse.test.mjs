import assert from 'node:assert/strict';
import { test } from 'node:test';
import { heads, refNames, taken, uncommitted, worktrees } from './parse.mjs';

const PORCELAIN = `worktree C:/Users/Chris/Desktop/portfolio
HEAD 972ead09df65dc9df878f73b99c0a195185341a4
branch refs/heads/development

worktree C:/Users/Chris/Desktop/portfolio/.claude/worktrees/port-the-panel
HEAD d0fdfceaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
branch refs/heads/port-the-panel

worktree C:/Users/Chris/Desktop/portfolio/.claude/worktrees/left-behind
HEAD f5ee988bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
detached
`;

test('worktrees reads the path and the branch of each, detached ones included', () => {
  assert.deepEqual(worktrees(PORCELAIN), [
    { path: 'C:/Users/Chris/Desktop/portfolio', branch: 'development' },
    {
      path: 'C:/Users/Chris/Desktop/portfolio/.claude/worktrees/port-the-panel',
      branch: 'port-the-panel',
    },
    {
      // A detached worktree still has to be listed: it is holding a directory
      // name, so a new feature must not be given that name — and `feature land`
      // has to be able to say it is not one of ours.
      path: 'C:/Users/Chris/Desktop/portfolio/.claude/worktrees/left-behind',
      branch: null,
    },
  ]);
});

test('worktrees reads an empty list as none, not as one blank entry', () => {
  assert.deepEqual(worktrees(''), []);
  assert.deepEqual(worktrees('\n\n'), []);
});

test('refNames reads the local branches', () => {
  assert.deepEqual(
    refNames('development\nfeature-lifecycle\nport-the-panel\n'),
    new Set(['development', 'feature-lifecycle', 'port-the-panel']),
  );
  assert.deepEqual(refNames(''), new Set());
});

test('heads reads the remote branches out of ls-remote', () => {
  const output = [
    '972ead09df65dc9df878f73b99c0a195185341a4\trefs/heads/development',
    'd0fdfceaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\trefs/heads/port-the-panel',
    '',
  ].join('\n');
  assert.deepEqual(heads(output), new Set(['development', 'port-the-panel']));
  // An empty answer is what "the remote branch is gone" looks like, and it is
  // the assertion `feature land` verifies its own teardown with.
  assert.deepEqual(heads(''), new Set());
});

test('heads keeps a slash in a branch name rather than cutting at it', () => {
  assert.deepEqual(heads('abc\trefs/heads/chris/spike\n'), new Set(['chris/spike']));
});

test('taken is the union of local branches, remote branches and worktree directories', () => {
  // A name is free only when all three agree. Checking one of them is how two
  // features end up sharing a directory or a branch.
  const found = taken({
    local: new Set(['development', 'a']),
    remote: new Set(['b']),
    worktrees: worktrees(PORCELAIN),
  });
  assert.ok(found.has('a'), 'a local branch');
  assert.ok(found.has('b'), 'a remote branch');
  assert.ok(found.has('port-the-panel'), 'a worktree directory');
  assert.ok(found.has('left-behind'), 'a detached worktree still holds its directory');
  assert.ok(!found.has('portfolio'), 'the main checkout is not a feature directory');
});

test('uncommitted reads porcelain status, and calls a clean tree clean', () => {
  assert.deepEqual(uncommitted(''), []);
  assert.deepEqual(uncommitted('\n'), []);
});

test('uncommitted names the files, because "the tree is dirty" is not actionable', () => {
  const status = [' M scripts/feature/cli.mjs', '?? scratch.txt', 'A  docs/friction-log.md', ''].join(
    '\n',
  );
  assert.deepEqual(uncommitted(status), [
    'scripts/feature/cli.mjs',
    'scratch.txt',
    'docs/friction-log.md',
  ]);
});

test('uncommitted reads the destination of a rename, not the arrow', () => {
  assert.deepEqual(uncommitted('R  old/name.mjs -> new/name.mjs\n'), ['new/name.mjs']);
});

test('uncommitted survives a first line whose leading space has been eaten', () => {
  // A regression. ` M package.json` is the commonest line git writes, and the
  // caller was trimming the whole block before handing it over — so a blind
  // slice at three characters reported `ackage.json` in a message whose entire
  // job is to name the file the author has to go and commit.
  assert.deepEqual(uncommitted('M package.json\n M scripts/checks/run.mjs\n'), [
    'package.json',
    'scripts/checks/run.mjs',
  ]);
});
