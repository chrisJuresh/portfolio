import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RESERVED, pick, slug } from './names.mjs';

test('slug turns what a person types into something git will accept as a ref', () => {
  assert.equal(slug('feature lifecycle'), 'feature-lifecycle');
  assert.equal(slug('Port the Projects Panel'), 'port-the-projects-panel');
  assert.equal(slug('#135'), '135');
  assert.equal(slug('front screen — the Turn'), 'front-screen-the-turn');
  assert.equal(slug('a//b'), 'a-b');
});

test('slug collapses and trims the separators rather than leaving them doubled', () => {
  // `refs/heads/a--b` is legal and `refs/heads/-a` is not, so this is about
  // validity as much as tidiness.
  assert.equal(slug('a   b'), 'a-b');
  assert.equal(slug('--a--'), 'a');
  assert.equal(slug('...a...'), 'a');
});

test('slug caps the length, because the worktree path is the branch name', () => {
  // The worktree lives at .claude/worktrees/<slug> inside a repository that is
  // already ~30 characters deep on this machine, and Windows still has paths
  // that give up around 260.
  const long = slug('a'.repeat(200));
  assert.ok(long.length <= 48, `${long.length} characters`);
  // Cutting mid-word must not leave a trailing separator behind.
  assert.ok(!slug(`${'ab '.repeat(40)}`).endsWith('-'));
});

test('slug refuses a name that has nothing left in it', () => {
  assert.throws(() => slug(''), /a name/);
  assert.throws(() => slug('   '), /a name/);
  assert.throws(() => slug('///'), /a name/);
});

test('the branch names nothing lands on are refused outright', () => {
  // `feature land` pushes HEAD to development. A feature branch called
  // `development` would make that push a no-op that reported success.
  for (const reserved of RESERVED) {
    assert.throws(() => pick(reserved, new Set()), /reserved/, reserved);
  }
});

test('pick returns the slug when nothing is holding it', () => {
  assert.deepEqual(pick('feature lifecycle', new Set()), {
    branch: 'feature-lifecycle',
    directory: 'feature-lifecycle',
  });
});

test('pick steps past anything already taken, so two features never collide', () => {
  // The set is the union of local branches, remote branches and worktree
  // directories: a name is free only when all three agree it is. Suffixes start
  // at 2 because the unsuffixed name is the first.
  assert.equal(pick('port', new Set(['port'])).branch, 'port-2');
  assert.equal(pick('port', new Set(['port', 'port-2'])).branch, 'port-3');
  assert.equal(pick('port', new Set(['port', 'port-3'])).branch, 'port-2');
});

test('pick keeps the suffixed name inside the length cap too', () => {
  const taken = new Set([slug('a'.repeat(200))]);
  const picked = pick('a'.repeat(200), taken);
  assert.ok(picked.branch.length <= 48, picked.branch);
  assert.ok(!taken.has(picked.branch));
});

test('pick gives up rather than looping forever', () => {
  const taken = new Set(['port']);
  for (let n = 2; n < 200; n += 1) taken.add(`port-${n}`);
  assert.throws(() => pick('port', taken), /already/);
});

test('the branch and the directory are the same string', () => {
  // One identifier, so there is one collision domain rather than two that can
  // disagree — `git worktree remove` and `git branch -D` are then never asked
  // about different features.
  const picked = pick('some name', new Set(['some-name']));
  assert.equal(picked.branch, picked.directory);
});
