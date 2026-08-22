/**
 * Publish: commit the Content the Editor wrote, push it, and say what it did.
 *
 * The whole point of the Editor is that a wording change costs no tokens, and
 * that includes not costing a session to land it — so Publish is part of the
 * tool rather than something the author goes elsewhere to do (#129, story 22).
 *
 * TWO THINGS ARE LOAD-BEARING ABOUT HOW IT COMMITS.
 *
 * The commit is PATHSPEC-LIMITED to the Content files git itself reports as
 * changed. `git commit -- <paths>` commits those paths and leaves the rest of the
 * index alone, so an agent's staged work in another window cannot ride along in a
 * commit the author thinks is a typo fix. The paths come from `git status`
 * filtered to Content, never from anything the browser said — the browser cannot
 * name a file at all (see sections.mjs).
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
import { CONTENT } from './sections.mjs';

/** One line of words, long enough to say what changed. */
const LONGEST_MESSAGE = 300;

const lines = (text) =>
  String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line !== '');

const said = (result) => lines(result?.stderr).concat(lines(result?.stdout)).join(' / ') || 'no output';

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

/** The Content files under `sections`, and nothing that merely looks like one. */
export function contentAmong(paths, sections) {
  const root = sections.replace(/\\/g, '/').replace(/\/+$/, '');
  const shape = new RegExp(`^${root}/[a-z][a-z0-9-]*/${CONTENT.replace('.', '\\.')}$`);
  return paths.filter((path) => shape.test(path.replace(/\\/g, '/')));
}

/**
 * Commit and push the Editor's Content edits.
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
  if (status.status !== 0) throw new Refused(`git status failed — ${said(status)}`);

  const dirty = changed(status.stdout);
  const files = contentAmong(dirty, sections);
  if (files.length === 0) {
    throw new Refused(
      dirty.length === 0
        ? 'nothing to publish — the tree is clean'
        : `nothing to publish — no Section’s Content has changed (${dirty.length} other file(s) have)`,
    );
  }

  const named = [...new Set(files.map((file) => file.split('/').at(-2)))];
  const wanted = message ?? `Edit the ${named.join(' and ')} Content`;
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
    throw new Refused(`nothing was committed — ${said(committed)}`);
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
    ...(pushed.status === 0 ? {} : { why: said(pushed) }),
  };
}
