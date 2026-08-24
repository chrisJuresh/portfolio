/**
 * Taking a spent feature down, and then asking whether it went.
 *
 * Shared by `feature land`, which does it once the work is on `development`, and
 * by `feature clean`, which finishes one that a file lock interrupted. One
 * implementation on purpose: the verification is the valuable half, and two
 * copies of it would drift into one that verified less.
 *
 * It VERIFIES rather than trusting three exit codes. A branch left standing
 * after the thing that reviewed it has closed is a live push target, and this
 * repository dropped pull requests partly because `gh` reported a deletion it
 * had not performed. So the worktree, the local branch and the remote branch are
 * each asked about afterwards, and what is still there is named with the command
 * that would shift it.
 */

import { existsSync } from 'node:fs';
import { git as gitOf } from './git.mjs';
import { serving, stop as stopServer } from './server.mjs';
import { load, lock, remove, save, statePath } from './state.mjs';
import { refusedForDirt, removeTree, samePath } from './teardown.mjs';

/**
 * @param {object} options
 * @param {ReturnType<import('./exec.mjs').session>} options.sh
 * @param {string} options.common the git common dir
 * @param {string} options.root the main checkout
 * @param {string} options.worktree the tree to take down
 * @param {string} options.branch
 * @param {boolean} [options.orphan] git no longer lists the worktree, and the
 *   caller has established that the work landed
 * @returns {Promise<number>} 0 if nothing is left standing
 */
export async function takeDown({ sh, common, root, worktree, branch, orphan = false }) {
  const state = statePath(common);
  const recorded = load(state).features.find((held) => held.branch === branch) ?? null;

  console.log('\nfeature: taking it down…');

  // The recorded port, AND whatever is actually serving inside the tree. Those
  // are the same thing now that `start` records the port astro took rather than
  // the one it asked for (#167) — but a row written before that fix names a port
  // nothing is on, and a server restarted by hand may have moved since. Stopping
  // only the record is what left a server running inside a worktree that then
  // could not be removed, twice.
  const running = serving({ worktree, port: recorded?.port ?? null });
  const ports = [
    ...new Set([
      recorded?.port ?? null,
      ...running.filter((one) => one.confirmed).map((one) => one.port),
    ]),
  ].filter((port) => Number.isInteger(port) && port > 0);

  for (const port of ports) {
    const onThisPort = running.find((one) => one.port === port) ?? null;
    const stopped = await stopServer({
      // The recorded pids belong to the recorded port and to nothing else.
      pid: port === recorded?.port ? recorded.pid : null,
      listener: port === recorded?.port ? (recorded.listener ?? null) : (onThisPort?.pid ?? null),
      port,
    });
    const which = port === recorded?.port ? '' : ` (${onThisPort?.from ?? 'found in the tree'})`;
    console.log(
      `  server     ${stopped.stopped ? 'stopped' : 'STILL RUNNING'} on ${port}${which} — ${stopped.said}`,
    );
    if (!stopped.stopped) {
      // Recorded as friction because this is what makes the removal below fail,
      // and the fix is a change to something rather than a retry.
      sh.note({
        what: `stopping the dev server for ${branch} (port ${port}, pid ${onThisPort?.pid ?? recorded?.pid ?? 'unrecorded'})`,
        gate: 'a process that would not stop',
        refusal: stopped.said,
        fix: 'find what is still listening on that port and stop it — a worktree cannot be removed while a process inside it holds a file',
      });
    }
  }

  // Nothing can remove the tree it is standing in, and on Windows nothing can
  // remove a directory a process has as its working directory either.
  if (samePath(process.cwd()).startsWith(samePath(worktree))) process.chdir(root);
  const git = gitOf(sh, root);

  // Captured BEFORE the removal, and that ordering is load-bearing: `git
  // worktree remove` unregisters the tree before it deletes the files, so a
  // list taken afterwards would not contain the path the guard is about to be
  // asked about.
  const listed = git.worktrees().map((tree) => tree.path);
  const removed = existsSync(worktree) ? git.removeWorktree(worktree) : { status: 0, stdout: '' };

  // Whatever git said, what matters is whether the directory is gone. Git fails
  // on this every time a feature was installed — pnpm's store links go past 250
  // characters and Git for Windows gives up with `Directory not empty`, having
  // already deleted everything shallower — and it also reports success while
  // leaving files behind. teardown.mjs carries the guard, the retry and the
  // measurements.
  //
  // UNLESS git refused because the tree has work in it. That refusal is git
  // protecting somebody, and going past it by hand is destroying what it was
  // protecting. `refusedForDirt` is the whole difference, and the reason it
  // exists is that the first version of this did not have it.
  const dirt = removed.status !== 0 && refusedForDirt(removed.stderr || removed.stdout);
  const byHand =
    existsSync(worktree) && !dirt
      ? await removeTree({ path: worktree, root, listed, orphan })
      : null;
  git.pruneWorktrees();

  const deleted = git.hasLocalBranch(branch) ? git.deleteBranch(branch) : { status: 0, stdout: '' };
  const remoteWas = git.hasRemoteBranch(branch);
  const unpushed = remoteWas ? git.deleteRemoteBranch(branch) : { status: 0, stdout: '' };
  git.fetchPrune();

  // ------------------------------------------------------------- verification
  const stillThere = git.hasWorktree(worktree) || existsSync(worktree);
  const stillLocal = git.hasLocalBranch(branch);
  const stillRemote = git.hasRemoteBranch(branch);

  // How it went, not just whether — in BOTH directions. Git failing and the
  // by-hand removal saving it is the ordinary path here. The other direction
  // cost a diagnosis: when both removals failed, the reason the second gave was
  // computed and then dropped, so the report said the worktree was still there
  // and nothing at all about why.
  const how = byHand === null ? '' : byHand.removed ? ' (git could not; removed by hand)' : '';
  const because = dirt
    ? ' — it has uncommitted work in it, and git refused; nothing here deletes that'
    : byHand !== null && !byHand.removed
      ? ` — ${byHand.why}`
      : '';
  console.log(`  worktree   ${stillThere ? `STILL THERE at ${worktree}${because}` : `gone${how}`}`);
  console.log(`  branch     ${stillLocal ? `STILL THERE — ${branch}` : 'gone'}`);
  console.log(
    `  remote     ${stillRemote ? `STILL THERE — origin/${branch}` : remoteWas ? 'gone' : 'there was none'}`,
  );

  // WHO IS HOLDING IT, and not only `EBUSY`. Asked after the removal rather than
  // before, because the question is only interesting once the removal has failed
  // — and asked at all because two sessions have now spent a turn finding the
  // answer by hand with `netstat -ano`. A dirty tree is not this: git refused
  // there on purpose, and nothing is holding anything.
  const holders = stillThere && !dirt ? serving({ worktree, port: recorded?.port ?? null }) : [];
  for (const holder of holders) {
    console.log(
      `  holding    pid ${holder.pid} is listening on ${holder.port} inside it (${holder.from})`,
    );
  }

  const left = [];
  if (stillThere) {
    // Not `git worktree remove --force`: that is what just failed, and on a tree
    // with node_modules in it it fails again. What works is deleting the
    // directory and pruning — and `pnpm feature clean` does exactly that, which
    // is the whole reason it exists.
    left.push(`the worktree at ${worktree} — \`pnpm feature clean ${branch}\` finishes it`);
    for (const holder of holders) {
      left.push(
        `pid ${holder.pid} on port ${holder.port}, inside that worktree, from ${holder.from} — ` +
          `\`${stopCommand(holder.pid)}\``,
      );
    }
  }
  if (stillLocal) left.push(`the branch ${branch} — \`git branch -D ${branch}\``);
  if (stillRemote) {
    left.push(
      `origin/${branch} — \`git push origin --delete ${branch}\`, or ` +
        `\`gh api -X DELETE repos/chrisJuresh/portfolio/git/refs/heads/${branch}\``,
    );
  }

  // The record goes whatever happened, EXCEPT while the worktree is still there:
  // `feature clean` reads the port and the pid out of it to finish the job, and
  // a record dropped now would leave it nothing to stop.
  if (!stillThere) {
    const held = await lock(state);
    try {
      save(state, remove(load(state), branch));
    } finally {
      held.release();
    }
  }

  if (left.length > 0) {
    // The worktree removal failing is expected and handled, so git's complaint
    // about it is only worth printing when the by-hand removal did not save it.
    if (removed.status !== 0 && byHand?.removed !== true) {
      console.error(`  ${(removed.stderr || removed.stdout || '').trim()}`);
    }
    for (const failure of [deleted, unpushed]) {
      if (failure.status !== 0) console.error(`  ${(failure.stderr || failure.stdout || '').trim()}`);
    }
    console.error(
      `\nfeature: ${left.length} thing(s) are still standing:\n` +
        left.map((one) => `    ${one}`).join('\n'),
    );
    return 1;
  }

  console.log('\nfeature: nothing is left standing.');
  return 0;
}

/** The one command that stops a process, spelled for the shell the author is in. */
function stopCommand(pid) {
  return process.platform === 'win32' ? `taskkill /PID ${pid} /T /F` : `kill -9 ${pid}`;
}
