/**
 * `feature land` — run the Checks, put the work on `development`, and take the
 * worktree, the branch and the remote branch down together.
 *
 * No pull request (ADR 0005): there is no reviewer, and the author validates by
 * pulling `development` and looking at the running site. The Checks failing is
 * the only gate, and it is a real one — nothing below runs if they do not pass.
 *
 * The teardown itself is `lib/takedown.mjs`, shared with `feature clean` — which
 * exists because a file lock can survive the moment `land` wants to delete the
 * worktree, and the work has landed by then either way. Landing and taking down
 * are two things, and only the first of them is irreversible.
 */

import { git as gitOf } from './lib/git.mjs';
import { takeDown } from './lib/takedown.mjs';
import { whichFailed } from './lib/verdict.mjs';

const BASE = 'origin/development';

/**
 * @param {object} options
 * @param {ReturnType<import('./lib/exec.mjs').session>} options.sh
 * @param {string} options.cwd
 * @param {boolean} options.check whether to run the Checks — off is for nothing
 *   but working on these scripts, and says so on every run
 * @returns {Promise<number>} exit code
 */
export async function land({ sh, cwd, check }) {
  const git = gitOf(sh, cwd);
  const { common, root } = git.mainCheckout();
  const worktree = git.topLevel();
  const branch = git.currentBranch();

  // ---------------------------------------------------------------- refusals
  if (worktree.replace(/\\/g, '/').toLowerCase() === root.replace(/\\/g, '/').toLowerCase()) {
    console.error(
      'feature: this is the main checkout, and nothing lands from here.\n' +
        '  Run `pnpm feature land` from inside the feature\'s worktree.',
    );
    return 2;
  }
  if (branch === null) {
    console.error(
      `feature: ${worktree} is on a detached HEAD, so there is no branch to land.`,
    );
    return 2;
  }
  if (branch === 'development' || branch === 'main') {
    console.error(`feature: this worktree is on ${branch}, which is what work lands ON, not from.`);
    return 2;
  }

  const dirty = git.uncommitted();
  if (dirty.length > 0) {
    console.error(
      `feature: ${dirty.length} uncommitted change(s) — commit them first, so the Checks gate them:\n` +
        dirty.map((path) => `    ${path}`).join('\n'),
    );
    return 1;
  }

  console.log('feature: fetching origin/development…');
  git.fetch('development');

  const against = git.againstBase(BASE);
  if (against.ahead === 0) {
    console.error(
      `feature: ${branch} has nothing on it that ${BASE} does not — there is nothing to land.\n` +
        `  If the work is already on development, take this down with:\n` +
        `      git worktree remove ${worktree} && git branch -D ${branch}`,
    );
    return 1;
  }

  // ------------------------------------------------------------------ rebase
  if (against.behind > 0) {
    console.log(
      `feature: development has moved on by ${against.behind} commit(s) — rebasing ${branch} onto it…`,
    );
    const rebased = git.rebase(BASE);
    if (rebased.status !== 0) {
      console.error(
        `\nfeature: the rebase onto ${BASE} stopped, so nothing has landed.\n` +
          '  The rebase is still in progress — resolve it, `git rebase --continue`, and run\n' +
          '  `pnpm feature land` again. `git rebase --abort` puts it back as it was.\n\n' +
          `  ${(rebased.stderr || rebased.stdout).trim().split('\n').slice(0, 4).join('\n  ')}`,
      );
      return 1;
    }
  }

  // ------------------------------------------------------------- the one gate
  if (check) {
    console.log('\nfeature: running the Checks. This is the only gate.\n');
    const checked = await sh.stream('pnpm', ['check'], { cwd: worktree, shell: true });
    if (checked.status !== 0) {
      console.error(`\nfeature: nothing landed — ${whichFailed(checked)}.`);
      return 1;
    }
  } else {
    console.error('feature: --no-check — the Checks did NOT run, and this land is not gated.\n');
  }

  // -------------------------------------------------------------------- land
  const landing = git.revision('HEAD');
  console.log(`\nfeature: pushing ${landing?.slice(0, 7)} to development…`);
  const pushed = git.pushToDevelopment();
  if (pushed.status !== 0) {
    console.error(
      '\nfeature: the push was refused, so nothing landed and nothing has been taken down.\n' +
        '  If development moved while the Checks were running, run `pnpm feature land` again —\n' +
        '  it will fetch, rebase and re-check from the top.\n\n' +
        `  ${(pushed.stderr || pushed.stdout).trim().split('\n').slice(0, 4).join('\n  ')}`,
    );
    return 1;
  }

  // Asked of the remote rather than read off the exit code. This repository's
  // whole reason for dropping pull requests is a merge command that reported one
  // thing while the forge had done another, so the forge is asked.
  const landed = sh.run('git', ['ls-remote', 'origin', 'refs/heads/development'], { cwd: worktree });
  const remoteHead = (landed.stdout ?? '').trim().split(/\s+/)[0] ?? '';
  if (remoteHead !== landing) {
    console.error(
      `\nfeature: the push reported success but development is at ${remoteHead.slice(0, 7) || '(nothing)'}, not ${landing?.slice(0, 7)}.\n` +
        `  Nothing has been taken down. The worktree is still at ${worktree}.`,
    );
    return 1;
  }
  console.log(`feature: development is now ${remoteHead.slice(0, 7)}.`);

  // The main checkout is how the author looks at what landed, and it is one
  // command behind until this runs. Not fatal if it fails — the work is on the
  // remote either way — so it is reported rather than thrown.
  const pulled = gitOf(sh, root).pullFastForward();
  console.log(
    pulled.status === 0
      ? 'feature: the main checkout is up to date.'
      : `feature: the main checkout did not fast-forward — pull it by hand:\n    ${(pulled.stderr || pulled.stdout).trim().split('\n')[0]}`,
  );

  // ---------------------------------------------------------------- teardown
  const code = await takeDown({ sh, common, root, worktree, branch });
  console.log(
    code === 0
      ? '\nfeature: landed, and nothing is left standing.'
      : '\nfeature: the work LANDED. What is listed above did not come down.',
  );
  return code;
}
