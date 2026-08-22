import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { HEADING, entry, flush } from './friction.mjs';

const denial = {
  at: new Date('2026-08-22T14:30:00Z'),
  command: 'pnpm feature land',
  what: 'git push origin --delete feature-lifecycle',
  gate: 'permission rule',
  refusal: 'remote: Permission to chrisJuresh/portfolio.git denied.\nfatal: unable to access',
  fix: "add Bash(git push origin --delete:*) to .claude/settings.json's allow list",
};

test('an entry records all four things a fix needs, and the time', () => {
  const written = entry(denial);
  assert.match(written, /2026-08-22T14:30:00/, 'when');
  assert.match(written, /pnpm feature land/, 'which command was running');
  assert.match(written, /git push origin --delete feature-lifecycle/, 'what was attempted');
  assert.match(written, /permission rule/, 'which gate refused');
  assert.match(written, /Permission to chrisJuresh\/portfolio\.git denied/, 'the exact refusal');
  assert.match(written, /allow list/, 'the change that would prevent it');
});

test('the refusal is fenced, so a multi-line one stays one thing', () => {
  // A refusal is somebody else's output and routinely contains `#`, `-` and
  // backticks. Unfenced, a two-line git error becomes a heading and a list item
  // and the log stops being readable.
  const written = entry(denial);
  const fenced = written.split('```')[1] ?? '';
  assert.match(fenced, /Permission to/);
  assert.match(fenced, /fatal: unable to access/);
});

test('an entry says so when nobody knew what the fix was', () => {
  // Better than a blank: an entry with no fix is a question for the next
  // session, and it has to read as one.
  const written = entry({ ...denial, fix: undefined });
  assert.match(written, /not known/i);
});

test('flush creates the log, with the heading that states the format', () => {
  const log = join(mkdtempSync(join(tmpdir(), 'friction-')), 'friction-log.md');
  flush(log, [entry(denial)]);
  const written = readFileSync(log, 'utf8');
  assert.ok(written.startsWith(HEADING), 'the heading comes first');
  assert.match(written, /git push origin --delete/);
});

test('flush appends to a log that already exists, and keeps what was there', () => {
  const log = join(mkdtempSync(join(tmpdir(), 'friction-')), 'friction-log.md');
  writeFileSync(log, `${HEADING}\n## an earlier denial\n`, 'utf8');
  flush(log, [entry(denial)]);
  const written = readFileSync(log, 'utf8');
  assert.match(written, /an earlier denial/);
  assert.match(written, /git push origin --delete/);
  assert.equal(written.indexOf(HEADING), written.lastIndexOf(HEADING), 'one heading, not two');
});

test('flush writes nothing at all when nothing was refused', () => {
  // The common case. A log that grew an empty section on every clean run would
  // be a file nobody reads.
  const log = join(mkdtempSync(join(tmpdir(), 'friction-')), 'friction-log.md');
  flush(log, []);
  assert.throws(() => readFileSync(log, 'utf8'), /ENOENT/);
});

test('flush separates entries so two denials in one run stay two', () => {
  const log = join(mkdtempSync(join(tmpdir(), 'friction-')), 'friction-log.md');
  flush(log, [entry(denial), entry({ ...denial, what: 'git worktree remove' })]);
  const written = readFileSync(log, 'utf8');
  assert.equal(written.match(/^## /gm)?.length, 2);
});
