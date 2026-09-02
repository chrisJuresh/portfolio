/**
 * The files a worktree needs that git will not put there.
 *
 * A worktree is a checkout of TRACKED files and nothing else, so everything
 * `.gitignore` covers is simply absent from a fresh one — and the failure that
 * makes reads as the tool being broken rather than as a file being missing.
 * `.claude/settings.local.json` is this machine's permission mode: without it a
 * new worktree falls back to the default, and the protocol's own writes start
 * being refused in a tree cut minutes after one where they were allowed.
 *
 * `.worktreeinclude` at the repository root names them, one path a line. The
 * file is the vendored `worktree-per-change` installer's, and Claude Code's own
 * `EnterWorktree` reads it — which this repository does not call (ADR 0005), so
 * without this module the file would sit in the tree meaning nothing. `feature
 * start` is what cuts worktrees here, so `feature start` is what has to honour
 * it.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * The paths a `.worktreeinclude` names.
 *
 * Comments and blank lines out, whitespace trimmed, order and duplicates kept as
 * written — the file is short and hand-maintained, and a copier that silently
 * reordered it would make a diff nobody could read. A path is taken as relative
 * to the repository root, which is the only thing it can be.
 *
 * @param {string} [text] the file's contents, or nothing when there is no file
 * @returns {string[]}
 */
export function included(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

/**
 * Copy each of them from the main checkout into a fresh worktree.
 *
 * Missing is not an error and is reported rather than thrown: `.worktreeinclude`
 * names what a worktree *would* need, and a machine that never wrote a
 * `settings.local.json` is a machine where there is nothing to carry. Saying so
 * is the point — the failure this exists to prevent is invisible, so a run that
 * carried nothing has to say it carried nothing.
 *
 * @param {object} options
 * @param {string} options.root the main checkout
 * @param {string} options.worktree
 * @param {string[]} options.entries what `included` gave
 * @param {(from: string, to: string) => void} [options.copy] for the tests
 * @param {(path: string) => boolean} [options.exists] for the tests
 * @returns {{ carried: string[], missing: string[] }}
 */
export function carry({ root, worktree, entries, copy = copyOne, exists = existsSync }) {
  const carried = [];
  const missing = [];
  for (const entry of entries) {
    const from = `${root}/${entry}`;
    if (!exists(from)) {
      missing.push(entry);
      continue;
    }
    copy(from, `${worktree}/${entry}`);
    carried.push(entry);
  }
  return { carried, missing };
}

/** The directories a fresh worktree has are the ones git made for tracked files,
 *  and `.claude/` is only there because the guard is tracked. Anything deeper is
 *  this function's to create.
 *
 *  @param {string} from
 *  @param {string} to */
function copyOne(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}

/**
 * What `.worktreeinclude` says, or nothing at all when there is no such file.
 *
 * @param {string} root the main checkout
 * @returns {string[]}
 */
export function declared(root) {
  try {
    return included(readFileSync(`${root}/.worktreeinclude`, 'utf8'));
  } catch {
    return [];
  }
}
