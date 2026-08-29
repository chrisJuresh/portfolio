import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Refused } from './content.mjs';
import { publish, writtenAmong } from './publish.mjs';

/** Both roots the Editor writes under, as `git status` spells them. */
const ROOTS = { sections: 'src/sections', kernel: 'src/kernel' };

/**
 * Publish: commit what the Editor wrote, push it, and say what it did.
 *
 * git is injected, because what is worth asserting here is not that git works —
 * it does — but WHICH ARGUMENTS it is handed. Two of those carry the whole of the
 * Editor's limit on reach: the commit is pathspec-limited to the two files the
 * Editor writes, so nothing else in the tree can ride along even if it is already
 * staged, and the paths in that pathspec come from git's own status output
 * filtered to those two names rather than from anything the browser said.
 */

/** A git that answers from a script of replies and records what it was asked. */
function fakeGit(replies = {}) {
  const calls = [];
  const answer = (args) => {
    const key = args.slice(0, 2).join(' ');
    return (
      replies[args.join(' ')] ??
      replies[key] ??
      replies[args[0]] ?? { status: 0, stdout: '', stderr: '' }
    );
  };
  const run = (args) => {
    calls.push(args);
    return answer(args);
  };
  return { run, calls, ran: (name) => calls.filter((args) => args[0] === name) };
}

const DIRTY = [
  ' M src/sections/front-screen/content.ts',
  ' M src/sections/projects-panel/content.ts',
  ' M src/sections/front-screen/tokens.css',
  ' M src/kernel/kernel.ts',
  '?? scratch.md',
].join('\n');

const setup = (replies = {}) =>
  fakeGit({
    status: { status: 0, stdout: `${DIRTY}\n`, stderr: '' },
    'rev-parse --abbrev-ref': { status: 0, stdout: 'development\n', stderr: '' },
    'rev-parse --short': { status: 0, stdout: 'a1b2c3d\n', stderr: '' },
    ...replies,
  });

const run = (git, options = {}) =>
  publish({ run: git.run, roots: ROOTS, message: 'Edit some words', ...options });

// ---------------------------------------------------------------------------
// What it commits
// ---------------------------------------------------------------------------

test('it commits the Content and Tokens that changed, and only those', async () => {
  const git = setup();
  const done = await run(git);

  assert.deepEqual(done.files, [
    'src/sections/front-screen/content.ts',
    'src/sections/projects-panel/content.ts',
    'src/sections/front-screen/tokens.css',
  ]);

  const [commit] = git.ran('commit');
  assert.ok(commit.includes('--'), commit.join(' '));
  const pathspec = commit.slice(commit.indexOf('--') + 1);
  assert.deepEqual(pathspec, done.files);
});

test('the commit is pathspec-limited, so nothing already staged rides along', async () => {
  // `git commit -- <paths>` commits those paths and leaves the rest of the index
  // alone. Without the pathspec, a Publish would carry whatever an agent or the
  // author had staged in another window into a commit nobody reviewed.
  const git = setup();
  await run(git);

  const [commit] = git.ran('commit');
  assert.ok(!commit.includes('--all') && !commit.includes('-a'), commit.join(' '));
  assert.ok(!commit.some((arg) => arg.endsWith('kernel.ts')), commit.join(' '));
  assert.ok(!commit.some((arg) => arg.endsWith('scratch.md')), commit.join(' '));
  assert.equal(git.ran('add').length, 0);
});

test('it never skips the hooks that gate a commit', async () => {
  const git = setup();
  await run(git);

  const [commit] = git.ran('commit');
  assert.ok(!commit.includes('--no-verify'), commit.join(' '));
});

test('it reports what it left alone, so a dirty tree is visible rather than silent', async () => {
  const git = setup();
  const done = await run(git);

  assert.deepEqual(done.left, ['src/kernel/kernel.ts', 'scratch.md']);
});

test('it reports the branch, the commit and the push', async () => {
  const done = await run(setup());

  assert.equal(done.branch, 'development');
  assert.equal(done.commit, 'a1b2c3d');
  assert.equal(done.pushed, true);
  assert.equal(done.message, 'Edit some words');
});

test('a message it was not given names the Sections it published, and what of them', async () => {
  const done = await run(setup(), { message: undefined });

  assert.match(done.message, /front-screen/);
  assert.match(done.message, /projects-panel/);
  assert.match(done.message, /Content and Tokens/);
});

test('a message it was not given says Tokens alone when that is what moved', async () => {
  const git = setup({
    status: { status: 0, stdout: ' M src/sections/eater-map/tokens.css\n', stderr: '' },
  });
  const done = await run(git, { message: undefined });

  assert.equal(done.message, 'Edit the eater-map Tokens');
});

// ---------------------------------------------------------------------------
// Refusals, and the one failure that is not a refusal
// ---------------------------------------------------------------------------

test('it refuses when nothing the Editor writes has changed', async () => {
  const git = setup({ status: { status: 0, stdout: ' M src/kernel/kernel.ts\n', stderr: '' } });

  await assert.rejects(() => run(git), Refused);
  assert.equal(git.ran('commit').length, 0);
});

test('it refuses when the tree is clean', async () => {
  const git = setup({ status: { status: 0, stdout: '', stderr: '' } });

  await assert.rejects(() => run(git), Refused);
  assert.equal(git.ran('commit').length, 0);
});

test('a Check failing in the pre-commit hook is a refusal that quotes it', async () => {
  const git = setup({
    commit: { status: 1, stdout: '', stderr: 'pre-commit: a Check failed, so nothing was committed.' },
  });

  await assert.rejects(() => run(git), (error) => {
    assert.ok(error instanceof Refused);
    assert.match(error.message, /a Check failed/);
    return true;
  });
  assert.equal(git.ran('push').length, 0);
});

test('a push that fails leaves the commit reported, and says it is not pushed', async () => {
  // The commit landed. Calling the whole thing a failure would send the author
  // looking for work that is already committed, so this is a report and not a
  // refusal.
  const git = setup({ push: { status: 1, stdout: '', stderr: 'fatal: no upstream' } });
  const done = await run(git);

  assert.equal(done.commit, 'a1b2c3d');
  assert.equal(done.pushed, false);
  assert.match(done.why, /no upstream/);
});

test('it refuses a message that is not one line of words', async () => {
  for (const message of ['', '   ', 'two\nlines', 'x'.repeat(301)]) {
    await assert.rejects(() => run(setup(), { message }), Refused, JSON.stringify(message));
  }
});

test('either file outside the Sections root is not something it publishes', async () => {
  const git = setup({
    status: {
      status: 0,
      stdout: ' M design/legacy/content.ts\n M scripts/editor/content.ts\n M portfolio/tokens.css\n',
      stderr: '',
    },
  });

  await assert.rejects(() => run(git), Refused);
});

test('it reads a renamed and a staged Content file as changed', async () => {
  // git's status codes are two columns, and the Editor's own write shows up in
  // the second. A filter that only looked for ` M` would call a staged edit
  // nothing to publish.
  const git = setup({
    status: { status: 0, stdout: 'M  src/sections/front-screen/content.ts\n', stderr: '' },
  });
  const done = await run(git);

  assert.deepEqual(done.files, ['src/sections/front-screen/content.ts']);
});

test('what counts as one of the Editor’s paths is the Section-name pattern, not a looser copy', () => {
  // The name half comes from sections.mjs so that the two files cannot disagree,
  // and so do both file names. The middle four are what a hand-written
  // `[a-z][a-z0-9-]*` would have let through; the last four are the shapes that
  // look like the Editor's files and are not.
  assert.deepEqual(
    writtenAmong(
      [
        'src/sections/front-screen/content.ts',
        'src/sections/front-screen/tokens.css',
        'src/sections/a--b/content.ts',
        'src/sections/trailing-/content.ts',
        'src/sections/-leading/content.ts',
        'src/sections/a--b/tokens.css',
        'src/sections/front-screen/nested/content.ts',
        'src/sections/front-screen/variants.css',
        'src/sections/front-screen/content.ts.bak',
        'src/sections/front-screen/contentXts',
        'design/legacy/front-screen/content.ts',
      ],
      ROOTS,
    ),
    ['src/sections/front-screen/content.ts', 'src/sections/front-screen/tokens.css'],
  );
});

test('a Windows path separator is read as a path separator', () => {
  // git reports forward slashes, so the normalisation in writtenAmong is
  // defensive — but it is there, so it is asserted. Built rather than written as
  // a literal: a backslash in a path in a test in a heredoc is four layers of
  // escaping and the last version of this test asserted a mangled string.
  const sep = String.fromCharCode(92);
  const windows = ['src', 'sections', 'front-screen', 'content.ts'].join(sep);

  assert.deepEqual(writtenAmong([windows], ROOTS), [windows]);
});

test('one of the Kernel’s Tokens files is the Editor’s own path too', () => {
  // #146 gave the Editor the Effect Stack's numbers and the corner pictures'
  // placement, which are Tokens under src/kernel/tokens rather than under a
  // Section — so Publish has to recognise them or an edit made in the panel is
  // one Publish reports as "nothing to publish".
  assert.deepEqual(
    writtenAmong(
      [
        'src/kernel/tokens/effects.css',
        'src/kernel/tokens/corners.css',
        'src/kernel/corners.css',
        'src/kernel/effect-stack/effect-stack.css',
        'src/kernel/tokens/nested/effects.css',
        'src/kernel/tokens/effects.ts',
        'src/kernel/tokens/-leading.css',
      ],
      ROOTS,
    ),
    ['src/kernel/tokens/effects.css', 'src/kernel/tokens/corners.css'],
  );
});

test('a Kernel Tokens edit is committed, and named for the holder rather than a folder', async () => {
  const git = setup({ status: { status: 0, stdout: ' M src/kernel/tokens/effects.css\n', stderr: '' } });
  const done = await run(git, { message: undefined });
  assert.deepEqual(done.files, ['src/kernel/tokens/effects.css']);
  assert.match(done.message, /kernel-effects/);
  assert.match(done.message, /Tokens/);
});

// ---------------------------------------------------------------------------
// The Overrides file, which belongs to no Section
// ---------------------------------------------------------------------------

test('the Overrides file is published, and only the one the Editor was given', () => {
  assert.deepEqual(
    writtenAmong(
      [
        'src/overrides.css',
        'src/sections/front-screen/content.ts',
        'src/kernel/overrides.css',
        'overrides.css',
        'src/overrides.css.bak',
        'design/legacy/src/overrides.css',
      ],
      { ...ROOTS, overrides: 'src' },
    ),
    ['src/overrides.css', 'src/sections/front-screen/content.ts'],
  );
});

test('an Editor started without an Overrides file publishes none', () => {
  assert.deepEqual(writtenAmong(['src/overrides.css'], ROOTS), []);
  assert.deepEqual(writtenAmong(['src/overrides.css'], { ...ROOTS, overrides: '' }), []);
});

test('a message it was not given names an Override by its kind and not by src/', async () => {
  const git = setup({
    status: { status: 0, stdout: ' M src/overrides.css\n', stderr: '' },
  });
  const done = await publish({ run: git.run, roots: { ...ROOTS, overrides: 'src' } });

  assert.deepEqual(done.files, ['src/overrides.css']);
  assert.equal(done.message, 'Write the Editor’s Overrides');
});

test('an Override rides along with the Content it was taken beside', async () => {
  const git = setup({
    status: {
      status: 0,
      stdout: ' M src/sections/front-screen/content.ts\n M src/overrides.css\n M src/kernel/kernel.ts\n',
      stderr: '',
    },
  });
  const done = await publish({ run: git.run, roots: { ...ROOTS, overrides: 'src' } });

  assert.deepEqual(done.files, ['src/sections/front-screen/content.ts', 'src/overrides.css']);
  assert.equal(done.message, 'Edit the front-screen Content and Overrides');
  assert.deepEqual(done.left, ['src/kernel/kernel.ts']);
});

test('it says an Override is among what has not changed', async () => {
  const git = setup({ status: { status: 0, stdout: ' M src/kernel/kernel.ts\n', stderr: '' } });
  await assert.rejects(
    publish({ run: git.run, roots: { ...ROOTS, overrides: 'src' } }),
    (error) => {
      assert.match(error.message, /no Override/);
      return true;
    },
  );
});
