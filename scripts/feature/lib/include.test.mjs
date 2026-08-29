import assert from 'node:assert/strict';
import { test } from 'node:test';
import { carry, included } from './include.mjs';

test('included reads the paths and nothing else', () => {
  // The installer writes the file with a seven-line comment on top explaining why
  // it exists, so a parser that took every line would try to copy prose.
  const text = [
    '# Untracked files copied into every new worktree.',
    '#',
    '# settings.local.json is this machine\u2019s permission mode.',
    '',
    '.claude/settings.local.json',
    '   .env.local   ',
  ].join('\n');
  assert.deepEqual(included(text), ['.claude/settings.local.json', '.env.local']);
});

test('included is empty for an empty file, and for no file at all', () => {
  // `declared` hands this whatever it could read, which is '' when there is no
  // `.worktreeinclude` — and a repository without one is the ordinary case
  // everywhere this is not installed.
  assert.deepEqual(included(''), []);
  assert.deepEqual(included(undefined), []);
  assert.deepEqual(included('# only a comment\n\n'), []);
});

test('carry copies each named file from the main checkout into the worktree', () => {
  /** @type {string[][]} */
  const done = [];
  const found = carry({
    root: 'C:/repo',
    worktree: 'C:/repo/.claude/worktrees/a',
    entries: ['.claude/settings.local.json'],
    exists: () => true,
    copy: (from, to) => done.push([from, to]),
  });
  assert.deepEqual(done, [
    ['C:/repo/.claude/settings.local.json', 'C:/repo/.claude/worktrees/a/.claude/settings.local.json'],
  ]);
  assert.deepEqual(found, { carried: ['.claude/settings.local.json'], missing: [] });
});

test('carry reports a missing file rather than throwing over it', () => {
  // `.worktreeinclude` names what a worktree WOULD need. A machine that never
  // wrote a `settings.local.json` has nothing to carry, and that is not a broken
  // `feature start` — but it is worth saying, because the failure this prevents
  // is otherwise invisible.
  let copies = 0;
  const found = carry({
    root: 'C:/repo',
    worktree: 'C:/repo/.claude/worktrees/a',
    entries: ['.claude/settings.local.json', '.env.local'],
    exists: (path) => path.endsWith('settings.local.json'),
    copy: () => {
      copies += 1;
    },
  });
  assert.equal(copies, 1);
  assert.deepEqual(found, { carried: ['.claude/settings.local.json'], missing: ['.env.local'] });
});
