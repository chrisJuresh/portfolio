/**
 * The git this repository's lifecycle needs, and nothing else.
 *
 * Every answer comes back parsed by `parse.mjs`, which is where the reading is
 * tested. Nothing here decides anything: `start.mjs` and `land.mjs` do that.
 */

import { heads, refNames, taken, uncommitted, worktrees } from './parse.mjs';

/**
 * @param {ReturnType<import('./exec.mjs').session>} sh
 * @param {string} cwd the tree to ask about
 */
export function git(sh, cwd) {
  const run = (...args) => sh.run('git', args, { cwd });
  const out = (...args) => sh.out('git', args, { cwd }).trim();
  /** Untrimmed, for the one answer whose leading whitespace is data:
   *  `status --porcelain` writes ` M path`, and trimming the block eats the
   *  first line's status column. */
  const raw = (...args) => sh.out('git', args, { cwd });
  const ok = (...args) => sh.ok('git', args, { cwd });

  return {
    /** The main checkout's root — `git rev-parse` is asked, rather than the path
     *  being walked upwards, because a worktree's own top level is not it. */
    mainCheckout() {
      // The common dir is `<main>/.git` for a normal clone; its parent is the
      // one tree every feature outlives.
      const common = out('rev-parse', '--path-format=absolute', '--git-common-dir').replace(
        /[\\/]+$/,
        '',
      );
      return { common, root: common.replace(/[\\/]\.git$/, '') };
    },

    topLevel() {
      return out('rev-parse', '--show-toplevel');
    },

    currentBranch() {
      const branch = out('rev-parse', '--abbrev-ref', 'HEAD');
      return branch === 'HEAD' ? null : branch;
    },

    /** Fetch, so everything after this is about the remote's tip and not a ref
     *  that was current whenever anybody last looked. */
    fetch(branch) {
      return ok('fetch', 'origin', branch);
    },

    fetchPrune() {
      return run('fetch', 'origin', '--prune');
    },

    localBranches() {
      return refNames(out('for-each-ref', '--format=%(refname:short)', 'refs/heads'));
    },

    remoteBranches() {
      return heads(out('ls-remote', '--heads', 'origin'));
    },

    worktrees() {
      return worktrees(out('worktree', 'list', '--porcelain'));
    },

    /** Every name a new feature may not have. */
    takenNames() {
      return taken({
        local: this.localBranches(),
        remote: this.remoteBranches(),
        worktrees: this.worktrees(),
      });
    },

    uncommitted() {
      return uncommitted(raw('status', '--porcelain'));
    },

    addWorktree(path, branch, base) {
      return ok('worktree', 'add', path, '-b', branch, base);
    },

    /**
     * How many commits `ref` has that `base` does not.
     *
     * Asked of a named ref rather than of HEAD, because `feature clean` runs from
     * the main checkout — which is standing on `development`, so a HEAD-relative
     * answer would be about the wrong branch and would always be 0. That is the
     * shape of mistake that makes a safety check pass vacuously.
     */
    aheadOf(base, ref) {
      const counted = out('rev-list', '--count', `${base}..${ref}`);
      return Number(counted) || 0;
    },

    /** How many commits this branch is ahead of, and behind, the given ref. */
    againstBase(base) {
      const counted = out('rev-list', '--left-right', '--count', `${base}...HEAD`);
      const [behind, ahead] = counted.split(/\s+/).map(Number);
      return { behind: behind || 0, ahead: ahead || 0 };
    },

    rebase(onto) {
      return run('rebase', onto);
    },

    rebaseAbort() {
      return run('rebase', '--abort');
    },

    /** Land it: HEAD onto the remote's development, fast-forward only.
     *  No `--force` anywhere, so a development that moved is a refusal to fix
     *  rather than somebody's work overwritten. */
    pushToDevelopment() {
      return run('push', 'origin', 'HEAD:refs/heads/development');
    },

    pullFastForward() {
      return run('pull', '--ff-only', 'origin', 'development');
    },

    removeWorktree(path) {
      return run('worktree', 'remove', path);
    },

    pruneWorktrees() {
      return run('worktree', 'prune');
    },

    deleteBranch(branch) {
      return run('branch', '-D', branch);
    },

    deleteRemoteBranch(branch) {
      return run('push', 'origin', '--delete', branch);
    },

    /** Does this local ref exist? Asked rather than inferred, because it is how
     *  the teardown verifies itself. */
    hasLocalBranch(branch) {
      return run('rev-parse', '--verify', '--quiet', `refs/heads/${branch}`).status === 0;
    },

    hasRemoteBranch(branch) {
      const result = run('ls-remote', '--heads', 'origin', branch);
      return result.status === 0 && heads(result.stdout).has(branch);
    },

    hasWorktree(path) {
      const wanted = path.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
      return this.worktrees().some(
        (tree) => tree.path.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase() === wanted,
      );
    },

    revision(ref) {
      const result = run('rev-parse', ref);
      return result.status === 0 ? result.stdout.trim() : null;
    },

    /** Point `core.hooksPath` at the tracked hooks. Relative on purpose: git
     *  resolves a relative hooksPath against the root of the working tree the
     *  hook runs in, so every worktree gets its own tracked copy — which is what
     *  makes the pre-commit Check run against the tree being committed to. */
    hooksPath() {
      const result = run('config', '--get', 'core.hooksPath');
      return result.status === 0 ? result.stdout.trim() : null;
    },

    setHooksPath(path) {
      return run('config', 'core.hooksPath', path);
    },
  };
}
