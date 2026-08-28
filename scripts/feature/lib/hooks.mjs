/**
 * Pointing git at the tracked hooks.
 *
 * `core.hooksPath` is local config, so it is set once per clone and shared by
 * every worktree of it — but it is not committed, so a fresh clone has the
 * pre-commit Check inert until something sets it. `feature start` does, and
 * `feature hooks` does it on its own for a clone that has not started a feature
 * yet.
 *
 * RELATIVE on purpose. Git resolves a relative `core.hooksPath` against the root
 * of the working tree the hook runs in, so each worktree runs its own tracked
 * copy against its own tree. An absolute path into the main checkout would build
 * and check `development` while appearing to gate the branch — the same mistake
 * the in-app preview makes, and the reason `pnpm check` serves its own tree.
 */

export const HOOKS_PATH = '.githooks';

/**
 * @param {ReturnType<import('./git.mjs').git>} git
 * @returns {{ was: string | null, changed: boolean }}
 */
export function ensureHooksPath(git) {
  const was = git.hooksPath();
  if (was === HOOKS_PATH) return { was, changed: false };
  git.setHooksPath(HOOKS_PATH);
  return { was, changed: true };
}

/**
 * @param {{ was: string | null, changed: boolean }} result
 * @returns {string | null} what to tell the author, if anything
 */
export function hooksReport({ was, changed }) {
  if (!changed) return null;
  return was === null
    ? `feature: core.hooksPath set to ${HOOKS_PATH} — the Checks now block a commit.`
    : `feature: core.hooksPath was ${was}; set to ${HOOKS_PATH}.`;
}
