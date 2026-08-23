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
 * reports as changed — a Section's `content.ts`, a Section's `tokens.css` and one
 * of the Kernel's Tokens files, and nothing else in the repository whatever state
 * it is in. `git commit -- <paths>` commits those paths and leaves the rest of the
 * index alone, so an agent's staged work in another window cannot ride along in a
 * commit the author thinks is a typo fix or a nudged gap. The paths come from
 * `git status` filtered to those shapes, never from anything the browser said —
 * the browser cannot name a file at all (see sections.mjs).
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
import { CONTENT, KERNEL, KERNEL_TOKENS, NAME, TOKENS } from './sections.mjs';

/** One line of words, long enough to say what changed. */
const LONGEST_MESSAGE = 300;

/** What each of the Editor's two files is called in a commit message. */
const KIND = { [CONTENT]: 'Content', [TOKENS]: 'Tokens' };

/**
 * What a written path is called in the commit message, and which of the two
 * kinds it is.
 *
 * A Section's file is named by its folder; one of the Kernel's Tokens files is
 * named by its own stem, prefixed as the surface addresses it. Read off the path
 * rather than remembered from the write, because the paths come from `git
 * status` and not from anything the Editor kept.
 */
function holderOf(path) {
  const parts = path.split('/');
  const file = parts.at(-1);
  return file === CONTENT || file === TOKENS
    ? { name: parts.at(-2), kind: KIND[file] }
    : { name: `${KERNEL}${file.replace(/\.css$/, '')}`, kind: KIND[TOKENS] };
}

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

/** A repository-relative directory, as `git status` spells one. */
const under = (root) => String(root).replace(/\\/g, '/').replace(/\/+$/, '');

/** A pattern's source, with its anchors off, so it can stand inside another. */
const shapeOf = (pattern) => pattern.source.replace(/^\^/, '').replace(/\$$/, '');

/**
 * The files under `roots` that the Editor writes, and nothing that merely looks
 * like one.
 *
 * Two shapes, because there are two kinds of holder: a Section's folder holding
 * either of the two file names, and one of the Kernel's Tokens files. Both
 * halves come from `sections.mjs`'s own constants rather than a second spelling
 * of them — this decides what gets committed, and a looser copy here would be
 * two files disagreeing about what a holder is called or about which of its
 * files the Editor is allowed to touch.
 *
 * @param {string[]} paths
 * @param {{ sections: string, kernel: string }} roots  both relative to the repository
 */
export function writtenAmong(paths, roots) {
  const name = shapeOf(NAME);
  // `[.]` and not a backslash: the dot in a file name is a literal, and a
  // character class says so without an escape to lose in a tool chain.
  const files = [CONTENT, TOKENS].map((file) => file.replace('.', '[.]')).join('|');
  const section = new RegExp(`^${under(roots.sections)}/(?:${name})/(?:${files})$`);
  // The STEM stands in the path and not the name: `kernel-effects` is
  // `tokens/effects.css`, so the prefix is off by the time a path is spelled.
  const kernel = new RegExp(`^${under(roots.kernel)}/${KERNEL_TOKENS}/(?:${name})[.]css$`);
  return paths.filter((path) => {
    const at = path.replace(/\\/g, '/');
    return section.test(at) || kernel.test(at);
  });
}

/**
 * Commit and push the Editor's edits.
 *
 * @param {object} options
 * @param {(args: string[]) => { status: number, stdout: string, stderr: string }} options.run  git, bound to the repository
 * @param {{ sections: string, kernel: string }} options.roots  both relative to the repository
 * @param {string} [options.message]
 * @returns {Promise<{ branch: string, commit: string, files: string[], left: string[],
 *                     message: string, pushed: boolean, why?: string }>}
 */
export async function publish({ run, roots, message }) {
  const status = run(['status', '--porcelain']);
  if (status.status !== 0) throw new Refused(`git status failed — ${outputOf(status)}`);

  const dirty = changed(status.stdout);
  const files = writtenAmong(dirty, roots);
  if (files.length === 0) {
    throw new Refused(
      dirty.length === 0
        ? 'nothing to publish — the tree is clean'
        : `nothing to publish — no Content or Tokens have changed (${dirty.length} other file(s) have)`,
    );
  }

  const holders = files.map(holderOf);
  const named = [...new Set(holders.map((holder) => holder.name))];
  const kinds = [...new Set(holders.map((holder) => holder.kind))].sort();
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
