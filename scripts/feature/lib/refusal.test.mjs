import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classify } from './refusal.mjs';

test('a remote that refuses the push is named as the remote, not as the tree', () => {
  // The distinction is the whole value of the log: a 403 is fixed by looking at
  // the token, and nothing about the branch or the Checks would have helped.
  const found = classify(
    'remote: Permission to chrisJuresh/portfolio.git denied to somebody.\nfatal: unable to access',
  );
  assert.match(found.gate, /remote/i);
  assert.match(found.fix, /gh auth status/);
});

test('a 403 from the forge reads the same way', () => {
  assert.match(classify('fatal: unable to access ...: The requested URL returned error: 403').gate, /remote/i);
});

test('a server-side hook refusal is named as one', () => {
  const found = classify('remote: error: hook declined to update refs/heads/development');
  assert.match(found.gate, /hook/i);
  assert.match(found.fix, /branch protection|hook/i);
});

test('a file the operating system will not let go of is named as that', () => {
  // The documented failure of `git worktree remove` on Windows, and the one a
  // teardown actually hits: a dev server or an editor still holding a file.
  const found = classify(
    "fatal: 'C:/repo/.claude/worktrees/a': the process cannot access the file because it is being used by another process",
  );
  assert.match(found.gate, /lock|operating system/i);
  assert.match(found.fix, /holding/i);
});

test('EBUSY and EPERM are the same thing arriving from node', () => {
  assert.match(classify('Error: EBUSY: resource busy or locked, rmdir').gate, /lock|operating system/i);
  assert.match(classify('Error: EPERM: operation not permitted, unlink').gate, /lock|operating system/i);
});

test('a local permission denial is named as a permission denial', () => {
  assert.match(classify('error: cannot open .git/config: Permission denied').gate, /permission/i);
  assert.match(classify('Error: EACCES: permission denied, open').gate, /permission/i);
});

test('an ordinary failure is not a denial, and does not reach the log', () => {
  // A rebase conflict, a failing Check, a non-fast-forward — each is the command
  // working correctly and saying so. Logging them as friction would bury the
  // entries that are actually about a gate that should not have been there.
  assert.equal(classify('CONFLICT (content): Merge conflict in scripts/feature/cli.mjs'), null);
  assert.equal(classify('! [rejected] development -> development (non-fast-forward)'), null);
  assert.equal(classify(''), null);
  assert.equal(classify(undefined), null);
});

test('the classification reads both streams, because git splits itself across them', () => {
  assert.match(classify('', 'remote: Permission to x denied').gate, /remote/i);
});
