/**
 * What features are in flight — which worktree, which branch, which port, which
 * dev server process.
 *
 * `feature land` cannot take down a server whose pid it was never told, and
 * `feature start` cannot avoid a port it does not know is held, so both facts
 * have to outlive the process that learned them.
 *
 * IT LIVES IN THE GIT COMMON DIR, not in the working tree. A worktree only gets
 * a file if git puts it there, and this file has to be readable from worktrees
 * that did not exist when it was written; the common dir is the one directory
 * every worktree of a clone shares, and nothing in it is ever committed.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { listsWorktree } from './teardown.mjs';

/** @typedef {{ branch: string, directory: string, path: string, port: number,
 *              pid: number | null, startedAt: string }} Feature */
/** @typedef {{ features: Feature[] }} State */

/**
 * @param {string} gitCommonDir as `git rev-parse --path-format=absolute --git-common-dir` gives it
 * @returns {string}
 */
export function statePath(gitCommonDir) {
  return `${String(gitCommonDir).replace(/[\\/]+$/, '')}/feature-state.json`;
}

/**
 * @param {string} file
 * @returns {State}
 */
export function load(file) {
  // Both the missing and the corrupt case read as empty on purpose. One
  // interrupted write must not make every later `feature start` throw about a
  // file nobody would think to look at — and the worst an empty read costs is a
  // port collision that the socket probe catches anyway.
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    if (!Array.isArray(parsed?.features)) return { features: [] };
    return { features: parsed.features };
  } catch {
    return { features: [] };
  }
}

/**
 * @param {string} file
 * @param {State} state
 */
export function save(file, state) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

/**
 * @param {State} state
 * @param {Feature} feature
 * @returns {State}
 */
export function add(state, feature) {
  if (state.features.some((held) => held.branch === feature.branch)) {
    throw new Error(
      `${feature.branch} is already recorded as in flight — land it or remove it first.`,
    );
  }
  return { features: [...state.features, feature] };
}

/**
 * @param {State} state
 * @param {string} branch
 * @returns {State}
 */
export function remove(state, branch) {
  // Removing something that was never recorded is not an error: a worktree made
  // by hand must still be landable.
  return { features: state.features.filter((held) => held.branch !== branch) };
}

/**
 * @param {State} state
 * @returns {Set<number>}
 */
export function ports(state) {
  return new Set(state.features.map((held) => held.port).filter((port) => Number.isInteger(port)));
}

/**
 * Split the registry into the features that are still there and the rows that
 * are about a worktree that is not.
 *
 * A row comes out in `takedown.mjs`, and only when a teardown runs. A worktree
 * removed any other way — by hand, by `git worktree remove`, by an agent harness
 * that made its own — leaves its row behind for good, and the row then lies about
 * two things at once: `feature list` calls it in flight, and `ports` above hands
 * `feature start` a port that nothing is holding. Seven of eight ports in the
 * pool had leaked that way before this existed.
 *
 * **A directory git has stopped listing but which is still on disk stays**, and
 * that half is not tidiness. That state is exactly the orphan `feature clean`
 * exists for — `git worktree remove` unregisters the tree and *then* deletes the
 * files, so one that died on a locked file is unlisted and still there — and this
 * row is the only record of the port and the pid `clean` needs in order to stop
 * the server still running inside it. Dropping it would leave the port genuinely
 * held and nothing able to name what is holding it.
 *
 * @param {State} state
 * @param {object} world what git and the filesystem say, injected so the
 *   decision can be tested without either
 * @param {string[]} world.listed paths `git worktree list` gave
 * @param {(path: string) => boolean} [world.onDisk]
 * @returns {{ live: State, spent: Feature[] }}
 */
export function reconcile(state, { listed, onDisk = existsSync }) {
  /** @type {Feature[]} */
  const live = [];
  /** @type {Feature[]} */
  const spent = [];
  for (const held of state.features) {
    const there = listsWorktree(listed, held.path) || onDisk(held.path);
    (there ? live : spent).push(held);
  }
  return { live: { features: live }, spent };
}

/**
 * Reconcile the registry on disk, and say what went.
 *
 * Written back rather than filtered at the point of reading: `feature start`
 * chooses its port out of this same file, so a `list` that only hid the ghosts
 * would leave the port leak exactly where it was.
 *
 * Under the lock, because it is a read-modify-write of the file two `feature
 * start` runs may be racing for. Callers that already hold the lock call
 * `reconcile` themselves — taking it twice in one process is a two-second wait
 * and then a throw.
 *
 * @param {string} file
 * @param {string[]} listed paths `git worktree list` gave
 * @returns {Promise<Feature[]>} the rows that were dropped
 */
export async function prune(file, listed) {
  const held = await lock(file);
  try {
    const { live, spent } = reconcile(load(file), { listed });
    if (spent.length > 0) save(file, live);
    return spent;
  } finally {
    held.release();
  }
}

/**
 * Hold the right to choose a port and record a feature.
 *
 * Two `feature start` runs at once would otherwise both probe the same port and
 * find it free, because neither has bound it yet — and one of the two dev
 * servers then fails to start with the other's port in its error. Git is its own
 * lock for the branch; nothing is for the port.
 *
 * A lock file with a staleness window rather than anything cleverer: the failure
 * being guarded against is two processes seconds apart on one machine, and a
 * lock that outlives a Ctrl-C forever would be worse than the collision.
 *
 * @param {string} file the state file the lock is for
 * @param {{ attempts?: number, wait?: number, stale?: number }} [options]
 * @returns {Promise<{ path: string, release: () => void }>}
 */
export async function lock(file, { attempts = 40, wait = 50, stale = 30_000 } = {}) {
  const path = `${file}.lock`;
  mkdirSync(dirname(path), { recursive: true });

  /** 'wx' fails if the file exists, which is the whole mechanism. */
  const take = () => {
    try {
      writeFileSync(path, JSON.stringify({ at: Date.now(), pid: process.pid }), {
        encoding: 'utf8',
        flag: 'wx',
      });
      return { path, release: () => rmSync(path, { force: true }) };
    } catch {
      return null;
    }
  };

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const held = take();
    if (held) return held;
    // Breaking a stale lock and then waiting a whole attempt would mean
    // `attempts: 1` never succeeds against one, which is the case the staleness
    // window exists for.
    if (staleEnough(path, stale)) {
      rmSync(path, { force: true });
      const taken = take();
      if (taken) return taken;
    }
    await new Promise((ok) => setTimeout(ok, wait));
  }

  throw new Error(
    `another feature is already choosing a port (${path}) — if nothing is, delete that file.`,
  );
}

/** Held by a process that is gone, or held longer than any start takes. */
function staleEnough(path, stale) {
  if (!existsSync(path)) return false;
  try {
    const held = JSON.parse(readFileSync(path, 'utf8'));
    if (Date.now() - Number(held?.at ?? 0) > stale) return true;
  } catch {
    // Unreadable is stale: nothing that is still holding it wrote that.
    return true;
  }
  try {
    return Date.now() - statSync(path).mtimeMs > stale;
  } catch {
    return false;
  }
}
