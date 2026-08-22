/**
 * Deleting a spent worktree's directory, when git will not.
 *
 * `git worktree remove` fails on every worktree this repository actually
 * produces. `feature start` installs, and pnpm's store links land at paths like
 * `.claude/worktrees/<name>/node_modules/.pnpm/@astrojs+compiler-rs@0.3.2__<32
 * hex>/node_modules/@astrojs/compiler-rs/dist/async.d.mts` — past 250 characters
 * from the drive root. Git for Windows gives up on those with
 * `Directory not empty`, having already deleted everything it could, and leaves
 * about thirteen thousand files standing. Node's own recursive removal is
 * long-path aware and takes four seconds over the same tree.
 *
 * So this exists, and because it is a recursive delete it is guarded rather than
 * trusted. Three conditions, all of them, every time: git listed the path as a
 * worktree, the path is under `.claude/worktrees/`, and the path is not the main
 * checkout. `deletable` is the whole guard and is tested on its own.
 */

import { rmSync } from 'node:fs';

/** One spelling, so paths from `git worktree list` (C:/…), `process.cwd()`
 *  (C:\…) and a config file all compare as the same string. Lower-cased because
 *  the drive letter's case is not stable between them, and this only ever runs
 *  against Windows and case-insensitive macOS. */
function same(path) {
  return String(path).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

/**
 * May this path be recursively deleted?
 *
 * @param {object} options
 * @param {string} options.path the worktree
 * @param {string} options.root the main checkout
 * @param {string[]} options.listed paths `git worktree list` gave
 * @returns {{ ok: boolean, why: string }}
 */
export function deletable({ path, root, listed }) {
  const target = same(path);
  const main = same(root);

  if (target === main) {
    return { ok: false, why: 'that is the main checkout, and nothing deletes that' };
  }
  if (!target.startsWith(`${main}/.claude/worktrees/`)) {
    return { ok: false, why: `${path} is not under .claude/worktrees/` };
  }
  if (!listed.some((one) => same(one) === target)) {
    return { ok: false, why: `git does not list ${path} as a worktree` };
  }
  return { ok: true, why: '' };
}

/**
 * Delete it, if the guard allows.
 *
 * @param {object} options
 * @param {string} options.path
 * @param {string} options.root
 * @param {string[]} options.listed
 * @returns {{ removed: boolean, why: string }}
 */
export function removeTree({ path, root, listed }) {
  const allowed = deletable({ path, root, listed });
  if (!allowed.ok) return { removed: false, why: allowed.why };
  try {
    // maxRetries because a file a dying vite worker still has open comes free a
    // moment later, and the alternative is telling the author to delete it by
    // hand over a lock that lasted 200ms.
    rmSync(path, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    return { removed: true, why: '' };
  } catch (error) {
    return { removed: false, why: String(error?.message ?? error) };
  }
}
