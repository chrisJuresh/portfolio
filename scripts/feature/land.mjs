/**
 * `feature land` — run the Checks, put the work on `development`, and take the
 * worktree, the branch and the remote branch down together.
 *
 * No pull request (ADR 0005): there is no reviewer, and the author validates by
 * pulling `development` and looking at the running site. The Checks failing is
 * the only gate, and it is a real one — nothing below runs if they do not pass.
 *
 * The teardown VERIFIES itself rather than trusting three exit codes. A merged
 * branch left standing is a live push target after the thing that reviewed it
 * has closed, and `gh` is documented in this repository as reporting a deletion
 * it did not perform. So each of the three is asked about afterwards, and a
 * `feature land` that could not finish says which one is still there.
 */

import { existsSync } from 'node:fs';
import { git as gitOf } from './lib/git.mjs';
import { stop as stopServer } from './lib/server.mjs';
import { load, lock, remove, save, statePath } from './lib/state.mjs';
import { removeTree } from './lib/teardown.mjs';
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
  return await teardown({ sh, common, root, worktree, branch });
}

/**
 * Take down the server, the worktree, the local branch and the remote branch —
 * then ask about each of them.
 */
async function teardown({ sh, common, root, worktree, branch }) {
  const state = statePath(common);
  const recorded = load(state).features.find((held) => held.branch === branch) ?? null;

  console.log('\nfeature: taking it down…');

  if (recorded?.port) {
    const stopped = await stopServer({
      pid: recorded.pid,
      listener: recorded.listener ?? null,
      port: recorded.port,
    });
    console.log(`  server     ${stopped.stopped ? 'stopped' : 'STILL RUNNING'} — ${stopped.said}`);
    if (!stopped.stopped) {
      // Named as friction because this is what makes the worktree removal below
      // fail on Windows, and the fix is a change to something rather than a
      // retry.
      sh.note({
        what: `stopping the dev server for ${branch} (pid ${recorded.pid}, port ${recorded.port})`,
        gate: 'a process that would not stop',
        refusal: stopped.said,
        fix: 'find what is still listening on that port and stop it — a worktree cannot be removed while a process inside it holds a file',
      });
    }
  }

  // Nothing can remove the tree it is standing in, and on Windows nothing can
  // remove a directory a process has as its working directory either.
  process.chdir(root);
  const mainGit = gitOf(sh, root);

  // Git first, so its own bookkeeping is what happens in the ordinary case.
  const listed = mainGit.worktrees().map((tree) => tree.path);
  const removed = mainGit.removeWorktree(worktree);
  let byHand = null;
  if (removed.status !== 0) {
    // And then by hand, because git fails on this every time a feature was
    // installed: pnpm's store links go past 250 characters and Git for Windows
    // gives up on them with `Directory not empty`, having already deleted
    // everything shallower. teardown.mjs carries the guard and the measurements.
    byHand = removeTree({ path: worktree, root, listed });
  }
  mainGit.pruneWorktrees();

  const deleted = mainGit.deleteBranch(branch);
  const remoteWas = mainGit.hasRemoteBranch(branch);
  const unpushed = remoteWas ? mainGit.deleteRemoteBranch(branch) : { status: 0, stdout: '' };
  mainGit.fetchPrune();

  // ------------------------------------------------------------- verification
  const left = [];
  const stillThere = mainGit.hasWorktree(worktree) || existsSync(worktree);
  const stillLocal = mainGit.hasLocalBranch(branch);
  const stillRemote = mainGit.hasRemoteBranch(branch);

  // How it went, not just whether: git failing and the by-hand removal saving it
  // is the ordinary path here, and a line that hid that would make the next
  // person think git had done it.
  const how = byHand === null ? '' : byHand.removed ? ' (git could not; removed by hand)' : ` — ${byHand.why}`;
  console.log(`  worktree   ${stillThere ? `STILL THERE at ${worktree}` : `gone${how}`}`);
  console.log(`  branch     ${stillLocal ? `STILL THERE — ${branch}` : 'gone'}`);
  console.log(
    `  remote     ${stillRemote ? `STILL THERE — origin/${branch}` : remoteWas ? 'gone' : 'there was none'}`,
  );

  if (stillThere) {
    // Not `git worktree remove --force`: that is what just failed, and on a
    // tree with node_modules in it it will fail again. Deleting the directory
    // and pruning is what works.
    left.push(
      `the worktree at ${worktree} — delete that directory, then \`git worktree prune\``,
    );
  }
  if (stillLocal) left.push(`the branch ${branch} — \`git branch -D ${branch}\``);
  if (stillRemote) {
    left.push(
      `origin/${branch} — \`git push origin --delete ${branch}\`, or ` +
        `\`gh api -X DELETE repos/chrisJuresh/portfolio/git/refs/heads/${branch}\``,
    );
  }

  // The record goes whatever happened: leaving a feature listed as in flight
  // would hold its port against every later `feature start`.
  const held = await lock(state);
  try {
    save(state, remove(load(state), branch));
  } finally {
    held.release();
  }

  if (left.length > 0) {
    // The worktree removal failing is expected and handled, so it is only worth
    // printing when the by-hand removal did not save it.
    if (removed.status !== 0 && byHand?.removed !== true) {
      console.error(`  ${(removed.stderr || removed.stdout).trim()}`);
    }
    for (const failure of [deleted, unpushed]) {
      if (failure.status !== 0) console.error(`  ${(failure.stderr || failure.stdout).trim()}`);
    }
    console.error(
      `\nfeature: the work LANDED, but ${left.length} thing(s) are still standing:\n` +
        left.map((one) => `    ${one}`).join('\n'),
    );
    return 1;
  }

  console.log('\nfeature: landed, and nothing is left standing.');
  return 0;
}

