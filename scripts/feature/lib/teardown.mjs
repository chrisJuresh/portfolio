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

/**
 * Did git refuse because the tree has work in it, rather than because it could
 * not delete a path?
 *
 * The two failures look the same from an exit code and mean opposite things. A
 * path-length or lock failure is git being unable to finish a removal that should
 * happen, and the by-hand removal is the answer. **"Contains modified or
 * untracked files" is git protecting somebody's work**, and deleting by hand over
 * the top of that is destroying it.
 *
 * This exists because the first version did not have it, and `feature clean` on a
 * worktree full of uncommitted work went straight past git's refusal to a
 * recursive delete. Nothing was lost, and only because node's `rmSync` happened
 * to fail on the top-level `rmdir` before it recursed.
 *
 * @param {string} said git's stderr
 * @returns {boolean}
 */
export function refusedForDirt(said) {
  return /contains modified or untracked files|is dirty|use --force/i.test(String(said ?? ''));
}

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
 * @param {boolean} [options.orphan] the caller has established that this is a
 *   directory a removal already unregistered — see below
 * @returns {{ ok: boolean, why: string }}
 */
export function deletable({ path, root, listed, orphan = false }) {
  const target = same(path);
  const main = same(root);

  if (target === main) {
    return { ok: false, why: 'that is the main checkout, and nothing deletes that' };
  }
  if (!target.startsWith(`${main}/.claude/worktrees/`)) {
    return { ok: false, why: `${path} is not under .claude/worktrees/` };
  }

  const known = listed.some((one) => same(one) === target);
  if (known) return { ok: true, why: '' };

  // A directory git no longer lists is the state a failed removal leaves behind:
  // `git worktree remove` unregisters the worktree and *then* deletes the files,
  // so a removal that dies on a locked file leaves the whole tree on disk with
  // nothing pointing at it. `feature clean` is the caller that has established
  // that, having also established that the work landed — which is why the
  // exception is a flag it has to pass rather than a hole in the guard.
  if (orphan) return { ok: true, why: '' };

  return { ok: false, why: `git does not list ${path} as a worktree` };
}

/**
 * Delete it, if the guard allows — and wait for a lock rather than giving up on
 * one.
 *
 * Measured: a `feature land` whose Checks had just run a build and a headless
 * browser could not delete its own worktree, and the identical removal succeeded
 * about a minute later with nothing done in between. Something the build leaves
 * holding a file under `node_modules` lets go on its own, so the right answer is
 * to wait — the alternative is handing the author a directory to delete over a
 * lock that was going to clear anyway.
 *
 * @param {object} options
 * @param {string} options.path
 * @param {string} options.root
 * @param {string[]} options.listed
 * @param {number} [options.attempts]
 * @param {number} [options.wait] milliseconds between attempts
 * @param {(path: string, options: object) => void} [options.rm] for the tests
 * @returns {Promise<{ removed: boolean, why: string }>}
 */
export async function removeTree({
  path,
  root,
  listed,
  // Forwarded, and it has to be named here to be forwarded at all. Leaving it
  // out of this destructuring meant `feature clean` passed `orphan: true` all the
  // way down and the guard never saw it, so the one case the flag exists for was
  // the one case that did not work.
  orphan = false,
  attempts = 12,
  wait = 1_000,
  rm = rmSync,
}) {
  // Before any waiting. The guard's answer will not change on a second try, and
  // a command that paused for twelve seconds before saying "that is the main
  // checkout" would read as broken.
  const allowed = deletable({ path, root, listed, orphan });
  if (!allowed.ok) return { removed: false, why: allowed.why };

  let last = '';
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      // node's own retries as well, for the sub-second locks — a file a dying
      // vite worker still has open. The outer loop is for the ones that last.
      rm(path, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      return { removed: true, why: '' };
    } catch (error) {
      last = String(error?.message ?? error);
      if (attempt < attempts) await new Promise((ok) => setTimeout(ok, wait));
    }
  }
  return { removed: false, why: `after ${attempts} attempts: ${last}` };
}
