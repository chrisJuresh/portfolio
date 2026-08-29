import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classify } from './refusal.mjs';

/** Every test below is about something that IS a gate, and `classify` answers
 *  null for anything that is not — so a null is this test failing, said here,
 *  rather than a `TypeError` on the next line.
 *
 *  @param {string} [stderr]
 *  @param {string} [stdout]
 *  @returns {{ gate: string, fix: string }} */
function gate(stderr, stdout) {
  const found = classify(stderr, stdout);
  assert.ok(found, `nothing was classified as a gate: ${stderr ?? ''} ${stdout ?? ''}`);
  return found;
}

test('a remote that refuses the push is named as the remote, not as the tree', () => {
  // The distinction is the whole value of the log: a 403 is fixed by looking at
  // the token, and nothing about the branch or the Checks would have helped.
  const found = gate(
    'remote: Permission to chrisJuresh/portfolio.git denied to somebody.\nfatal: unable to access',
  );
  assert.match(found.gate, /remote/i);
  assert.match(found.fix, /gh auth status/);
});

test('a 403 from the forge reads the same way', () => {
  assert.match(gate('fatal: unable to access ...: The requested URL returned error: 403').gate, /remote/i);
});

test('a server-side hook refusal is named as one', () => {
  const found = gate('remote: error: hook declined to update refs/heads/development');
  assert.match(found.gate, /hook/i);
  assert.match(found.fix, /branch protection|hook/i);
});

test('a file the operating system will not let go of is named as that', () => {
  // The documented failure of `git worktree remove` on Windows, and the one a
  // teardown actually hits: a dev server or an editor still holding a file.
  const found = gate(
    "fatal: 'C:/repo/.claude/worktrees/a': the process cannot access the file because it is being used by another process",
  );
  assert.match(found.gate, /lock|operating system/i);
  // The fix names the command that finishes the job. This is the commonest entry
  // in the log by some distance and it is usually not a problem — the work has
  // landed and only the directory is left — so an entry that sent the reader
  // hunting for a process would be the wrong advice most of the time.
  assert.match(found.fix, /feature clean/);
});

test('EBUSY and EPERM are the same thing arriving from node', () => {
  assert.match(gate('Error: EBUSY: resource busy or locked, rmdir').gate, /lock|operating system/i);
  assert.match(gate('Error: EPERM: operation not permitted, unlink').gate, /lock|operating system/i);
});

test('a local permission denial is named as a permission denial', () => {
  assert.match(gate('error: cannot open .git/config: Permission denied').gate, /permission/i);
  assert.match(gate('Error: EACCES: permission denied, open').gate, /permission/i);
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
  assert.match(gate('', 'remote: Permission to x denied').gate, /remote/i);
});
