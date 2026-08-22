/**
 * Publish: commit what the Editor wrote, push it, and say what it did.
 *
 * The whole point of the Editor is that a wording change costs no tokens, and
 * that includes not costing a session to land it — so Publish is part of the
 * tool rather than something the author goes elsewhere to do (#129, story 22).
 *
 * TWO THINGS ARE LOAD-BEARING ABOUT HOW IT COMMITS.
 *
 * The commit is PATHSPEC-LIMITED to the files the Editor writes and git itself
 * reports as changed — a Section's `content.ts` and a Section's `tokens.css`,
 * and nothing else in the repository whatever state it is in. `git commit --
 * <paths>` commits those paths and leaves the rest of the index alone, so an
 * agent's staged work in another window cannot ride along in a commit the author
 * thinks is a typo fix or a nudged gap. The paths come from `git status` filtered
 * to those two file names, never from anything the browser said — the browser
 * cannot name a file at all (see sections.mjs).
 *
 * It does NOT pass `--no-verify`. `.githooks/pre-commit` runs the Checks on every
 * commit (ADR 0006), so a Publish takes about a minute and a broken tree refuses
 * to publish. That is the gate working, and the refusal quotes it rather than
 * reporting "git failed".
 *
 * A push that fails is a REPORT and not a refusal: the commit has landed by then,
 * and calling the whole thing a failure would send the author looking for work
 * that is already committed.
 */

import { Refused } from './content.mjs';
import { CONTENT, NAME, TOKENS } from './sections.mjs';

/** One line of words, long enough to say what changed. */
const LONGEST_MESSAGE = 300;

/** What each of the Editor's two files is called in a commit message. */
const KIND = { [CONTENT]: 'Content', [TOKENS]: 'Tokens' };

const lines = (text) =>
  String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line !== '');

const outputOf = (result) => lines(result?.stderr).concat(lines(result?.stdout)).join(' / ') || 'no output';

/**
 * `git status --porcelain` is two status columns, a space, then the path — and a
 * rename is `R  old -> new`. The Editor's own write lands in the second column
 * and a staged one in the first, so both are read.
 */
export function changed(porcelain) {
  return lines(porcelain).map((line) => {
    const path = line.slice(3);
    const arrow = path.indexOf(' -> ');
    return arrow === -1 ? path : path.slice(arrow + 4);
  });
}

/**
 * The files under `sections` that the Editor writes, and nothing that merely
 * looks like one.
 *
 * The Section-name half comes from `sections.mjs`'s own pattern rather than a
 * second spelling of it, and so do both file names: this decides what gets
 * committed, and a looser copy here would be two files disagreeing about what a
 * Section is called or about which of its files the Editor is allowed to touch.
 */
export function writtenAmong(paths, sections) {
  const root = sections.replace(/\\/g, '/').replace(/\/+$/, '');
  const name = NAME.source.replace(/^\^/, '').replace(/\$$/, '');
  // `[.]` and not a backslash: the dot in a file name is a literal, and a
  // character class says so without an escape to lose in a tool chain.
  const files = [CONTENT, TOKENS].map((file) => file.replace('.', '[.]')).join('|');
  const shape = new RegExp(`^${root}/(?:${name})/(?:${files})$`);
  return paths.filter((path) => shape.test(path.replace(/\\/g, '/')));
}

/**
 * Commit and push the Editor's edits.
 *
 * @param {object} options
 * @param {(args: string[]) => { status: number, stdout: string, stderr: string }} options.run  git, bound to the repository
 * @param {string} options.sections  the Sections root, relative to the repository
 * @param {string} [options.message]
 * @returns {Promise<{ branch: string, commit: string, files: string[], left: string[],
 *                     message: string, pushed: boolean, why?: string }>}
 */
export async function publish({ run, sections, message }) {
  const status = run(['status', '--porcelain']);
  if (status.status !== 0) throw new Refused(`git status failed — ${outputOf(status)}`);

  const dirty = changed(status.stdout);
  const files = writtenAmong(dirty, sections);
  if (files.length === 0) {
    throw new Refused(
      dirty.length === 0
        ? 'nothing to publish — the tree is clean'
        : `nothing to publish — no Section’s Content or Tokens have changed (${dirty.length} other file(s) have)`,
    );
  }

  const named = [...new Set(files.map((file) => file.split('/').at(-2)))];
  const kinds = [...new Set(files.map((file) => KIND[file.split('/').at(-1)]))].sort();
  const wanted = message ?? `Edit the ${named.join(' and ')} ${kinds.join(' and ')}`;
  if (typeof wanted !== 'string' || wanted.trim() === '') {
    throw new Refused('a commit message is one line of words, and this one is empty');
  }
  if (/[\r\n]/.test(wanted)) {
    throw new Refused('a commit message is one line, and this one has a line break in it');
  }
  if (wanted.length > LONGEST_MESSAGE) {
    throw new Refused(`a commit message may be ${LONGEST_MESSAGE} characters, and this one is ${wanted.length}`);
  }

  // No --no-verify: the Checks gate this commit like any other (ADR 0006), which
  // is why it takes a minute and why a broken tree cannot be published.
  const committed = run(['commit', '-m', wanted, '--', ...files]);
  if (committed.status !== 0) {
    throw new Refused(`nothing was committed — ${outputOf(committed)}`);
  }

  const branch = lines(run(['rev-parse', '--abbrev-ref', 'HEAD']).stdout)[0] ?? '(unknown)';
  const commit = lines(run(['rev-parse', '--short', 'HEAD']).stdout)[0] ?? '(unknown)';

  const pushed = run(['push']);
  return {
    branch,
    commit,
    files,
    left: dirty.filter((path) => !files.includes(path)),
    message: wanted,
    pushed: pushed.status === 0,
    ...(pushed.status === 0 ? {} : { why: outputOf(pushed) }),
  };
}
