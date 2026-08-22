/**
 * `feature clean <name>` — finish a teardown that something was holding.
 *
 * Landing and taking down are two things, and only the first is irreversible.
 * `feature land` pushes, and then tries to delete the worktree — and a build and
 * a headless browser have just run in that worktree, so something is sometimes
 * still holding a file under `node_modules` when it does. Measured: a removal
 * that failed succeeded about a minute later with nothing done in between.
 * `land` now waits, but a wait has to end somewhere, and when it does the work is
 * already on `development` and the only thing left is a directory.
 *
 * THE SAFETY PROPERTY, and the whole reason this can be a command rather than an
 * instruction to delete something by hand: **it refuses unless the work landed.**
 * A branch that still has a commit `origin/development` does not have is
 * unlanded work, and no amount of naming it makes this delete it.
 */

import { existsSync } from 'node:fs';
import { git as gitOf } from './lib/git.mjs';
import { takeDown } from './lib/takedown.mjs';
import { load, statePath } from './lib/state.mjs';

const BASE = 'origin/development';

/**
 * @param {object} options
 * @param {ReturnType<import('./lib/exec.mjs').session>} options.sh
 * @param {string} options.cwd
 * @param {string} options.name the branch, or the worktree directory's name
 * @returns {Promise<number>} exit code
 */
export async function clean({ sh, cwd, name }) {
  const git = gitOf(sh, cwd);
  const { common, root } = git.mainCheckout();
  const worktree = `${root}/.claude/worktrees/${name}`;

  const listed = git.worktrees();
  const known = listed.find(
    (tree) => tree.path.replace(/\\/g, '/').toLowerCase() === worktree.toLowerCase(),
  );
  const recorded = load(statePath(common)).features.find((held) => held.branch === name) ?? null;

  if (!existsSync(worktree) && !known && !recorded && !git.hasLocalBranch(name)) {
    console.error(
      `feature: there is no worktree, branch or record called ${name} — nothing to clean.\n` +
        '  `pnpm feature list` says what is in flight.',
    );
    return 2;
  }

  // The branch to check and to delete. A worktree git still lists tells us its
  // branch; otherwise the name is the branch, which is the invariant `names.mjs`
  // exists to maintain.
  const branch = known?.branch ?? name;

  // A detached worktree is not a feature and is somebody else's business — the
  // ones this repository accumulates from interrupted sessions are exactly that.
  if (known && known.branch === null) {
    console.error(
      `feature: ${worktree} is on a detached HEAD, so nothing here can say whether its work\n` +
        '  landed. Take it down by hand if you are sure it is spent.',
    );
    return 2;
  }

  // ------------------------------------------------------ the safety property
  //
  // UNCOMMITTED WORK FIRST, and this order is the point. The commit count below
  // is 0 for a worktree that has never committed anything — which is exactly what
  // a worktree somebody is in the middle of working in looks like. The first
  // version checked only commits, said "the work landed" about a tree full of
  // live edits, and went on to try to delete it. Nothing was lost, and only
  // because node's removal happened to fail on the top-level directory before it
  // recursed.
  if (known && existsSync(worktree)) {
    const dirty = gitOf(sh, worktree).uncommitted();
    if (dirty.length > 0) {
      console.error(
        `feature: ${worktree} has ${dirty.length} uncommitted change(s), so it is being worked in\n` +
          '  and nothing here will delete it:\n' +
          dirty.map((path) => `    ${path}`).join('\n'),
      );
      return 1;
    }
  }

  git.fetch('development');
  if (git.hasLocalBranch(branch)) {
    const unlanded = git.aheadOf(BASE, branch);
    if (unlanded > 0) {
      console.error(
        `feature: ${branch} has ${unlanded} commit(s) that ${BASE} does not, so the work has NOT\n` +
          '  landed and nothing here will delete it. Land it first:\n' +
          `      cd ${worktree} && pnpm feature land`,
      );
      return 1;
    }
    console.log(`feature: ${branch} has nothing ${BASE} does not — the work landed.`);
  } else {
    // `land` deletes the branch only after verifying the push, so a branch that
    // is gone is a push that happened.
    console.log(`feature: ${branch} is already gone, which only happens after a verified push.`);
  }

  // An orphan is what a failed removal leaves: `git worktree remove` unregisters
  // the tree and then deletes the files, so one that died on a locked file left
  // the whole tree on disk with nothing pointing at it. Declared here rather than
  // assumed in the guard, because the check above is what earns it.
  const code = await takeDown({
    sh,
    common,
    root,
    worktree,
    branch,
    orphan: !known,
  });
  console.log(
    code === 0 ? '\nfeature: cleaned.' : '\nfeature: what is listed above is still there.',
  );
  return code;
}
