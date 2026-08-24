/**
 * `feature start <name>` — a worktree on a new branch cut from the FETCHED
 * `origin/development`, installed, with a dev server on a port nothing else
 * holds.
 *
 * The base is fetched first and named as `origin/development` on purpose. Not
 * local HEAD, not whatever the main checkout is standing on, and not an
 * unfetched local ref: each of those quietly carries somebody else's divergence
 * into the diff, and none of them complains while doing it.
 */

import { existsSync } from 'node:fs';
import { git as gitOf } from './lib/git.mjs';
import { ensureHooksPath, hooksReport } from './lib/hooks.mjs';
import { pick } from './lib/names.mjs';
import { choosePort } from './lib/ports.mjs';
import { logPath, start as startServer } from './lib/server.mjs';
import { add, load, lock, ports, reconcile, remove, save, statePath } from './lib/state.mjs';

/**
 * @param {object} options
 * @param {ReturnType<import('./lib/exec.mjs').session>} options.sh
 * @param {string} options.cwd
 * @param {string} options.name
 * @param {boolean} options.install
 * @param {boolean} options.server
 * @returns {Promise<number>} exit code
 */
export async function start({ sh, cwd, name, install, server }) {
  const git = gitOf(sh, cwd);
  const { common, root } = git.mainCheckout();

  // Before the network. A name that is reserved, or that slugs to nothing, is
  // refused by `pick` — and hearing about it after a fetch has run is a wasted
  // round trip for a typo.
  pick(name, new Set());

  // Once per clone, and idempotent. Set here rather than in a `postinstall` so
  // that a deploy's install never touches anybody's git config.
  const said = hooksReport(ensureHooksPath(git));
  if (said) console.log(said);

  console.log('feature: fetching origin/development…');
  git.fetch('development');

  const state = statePath(common);

  // Two windows rather than one held across the install, which is minutes: the
  // name and the branch are claimed under the first, the port under the second.
  // Between them nothing is being chosen, so nothing can be chosen twice.
  let chosen;
  let held = await lock(state);
  try {
    chosen = pick(name, git.takenNames());
    const path = `${root}/.claude/worktrees/${chosen.directory}`;
    if (existsSync(path)) {
      // A directory git does not know about, left by a worktree that was removed
      // from the index but not from disk. `pick` cannot see it, and
      // `git worktree add` would refuse with something less clear than this.
      throw new Error(
        `${path} already exists but is not a worktree — delete it, or run \`git worktree prune\`.`,
      );
    }
    console.log(`feature: cutting ${chosen.branch} from origin/development…`);
    git.addWorktree(path, chosen.branch, 'origin/development');
    chosen.path = path;
  } finally {
    held.release();
  }

  if (install) {
    // A fresh worktree has no node_modules — a worktree only gets a file if git
    // puts it there, and node_modules is ignored. Without this the dev server,
    // the Checks and the pre-commit hook all fail in the same confusing way.
    //
    // Streamed rather than inherited: an install is minutes, so watching it is
    // not optional — but an inherited stdio leaves `stderr` uncaptured, and a
    // refusal that nothing captured is a refusal that cannot reach the friction
    // log. `stream` does both.
    console.log('feature: installing (a fresh worktree has no node_modules)…');
    const installed = await sh.stream('pnpm', ['install', '--frozen-lockfile'], {
      cwd: chosen.path,
      shell: true,
    });
    if (installed.status !== 0) {
      console.error(
        `\nfeature: the install failed, so the worktree at ${chosen.path} has no node_modules.\n` +
          '  The worktree and the branch are there. Fix the install and run `pnpm install` in it,\n' +
          `  or take it down with \`git worktree remove ${chosen.path} && git branch -D ${chosen.branch}\`.`,
      );
      return 1;
    }
  }

  // Reserve the port and record the feature UNDER the lock; start the server
  // OUTSIDE it. Waiting for astro to bind takes up to thirty seconds, and a lock
  // held across that would make the second of two features started at once fail
  // after two seconds with "another feature is already choosing a port" — the
  // exact case the lock exists to make work. Once the port is in the state file
  // it is reserved, so nothing else can pick it while this one comes up.
  const record = {
    branch: chosen.branch,
    directory: chosen.directory,
    path: chosen.path,
    port: null,
    // Both, because they are not the same process: astro's bin spawns a child,
    // and the child is what holds the port. `feature land` kills the one that
    // binds and the one that was spawned.
    pid: null,
    listener: null,
    startedAt: new Date().toISOString(),
  };

  held = await lock(state);
  let dropped = [];
  try {
    // Reconciled first, because `ports` below is the whole reason the registry is
    // read here and a row whose worktree is gone reserves a port nothing is
    // holding. Seven of the eight ports in the pool had leaked that way. Not
    // `prune`, which takes the lock this already holds.
    const { live, spent } = reconcile(load(state), {
      listed: git.worktrees().map((tree) => tree.path),
    });
    dropped = spent;
    if (server) record.port = await choosePort({ taken: ports(live) });
    save(state, add(live, record));
  } finally {
    held.release();
  }
  if (dropped.length > 0) {
    console.log(
      `feature: dropped ${dropped.length} stale record(s) whose worktree is gone — ` +
        `${dropped.map((one) => one.branch).join(', ')}.`,
    );
  }

  if (server) {
    const asked = record.port;
    console.log(`feature: starting a dev server on ${asked}…`);
    const started = await startServer({ worktree: chosen.path, port: asked });
    record.pid = started.pid;
    record.listener = started.listener;

    // THE PORT ASTRO TOOK, not the one it was asked for. `--port` is a request:
    // when something else holds the number astro moves up and says so, and the
    // version of this that recorded the request reported no server at all and
    // then left one running that no teardown could find (#167). The reservation
    // made under the lock above was for `asked`; the row saved below reserves
    // this one instead, which is the port that is actually held.
    if (started.port !== null) record.port = started.port;
    if (started.port !== null && started.port !== asked) {
      console.log(
        `feature: astro took ${started.port}, not the ${asked} it was asked for — something\n` +
          `  else holds ${asked}. ${started.port} is what is recorded, listed and taken down.`,
      );
    }
    if (started.reason) console.error(`feature: no dev server — ${started.reason}`);

    // Written back so `feature land` can take down what actually came up. Read
    // afresh inside the lock, because another `feature start` may have added
    // itself while this server was coming up.
    held = await lock(state);
    try {
      const others = remove(load(state), record.branch);
      // The reservation taken before the server started was for `asked`. Astro
      // choosing its own number can land on one another feature has reserved and
      // not yet bound, and nothing here can undo that — the choice was astro's
      // and it has already bound the socket. So it is said rather than hidden:
      // two rows on one port is a teardown that stops somebody else's server.
      const clash = others.features.find((one) => one.port === record.port);
      if (clash) {
        console.error(
          `feature: ${record.port} is also recorded for ${clash.branch} — astro chose it after\n` +
            '  the reservation was made, so two features now name one port. Take one of them\n' +
            '  down before landing either, or the teardown will stop the wrong server.',
        );
      }
      save(state, add(others, record));
    } finally {
      held.release();
    }
  }

  report({ chosen, port: record.port, listener: record.listener, root });
  return 0;
}

function report({ chosen, port, listener, root }) {
  const lines = [
    '',
    `feature: ${chosen.branch} is ready.`,
    '',
    `  worktree   ${chosen.path}`,
    `  branch     ${chosen.branch}  (from origin/development)`,
  ];
  if (port !== null && listener !== null) {
    // -1 is `server.mjs` saying the port is held by something it could not name
    // — `lsof` missing, say. Printing it as a pid would be printing a lie.
    const who = listener > 0 ? `pid ${listener}` : 'pid unknown';
    lines.push(
      `  serving    http://127.0.0.1:${port}/portfolio   (${who}, log ${logPath(chosen.path)})`,
    );
  } else if (port !== null) {
    lines.push(`  serving    nothing — the server did not start; log ${logPath(chosen.path)}`);
  } else {
    lines.push('  serving    nothing — asked for with --no-server');
  }
  lines.push(
    '',
    '  Work in the worktree, not here. Start a session INSIDE it rather than',
    '  entering one afterwards — the working directory is in the system prompt,',
    '  so entering it mid-session pays the cold start twice:',
    '',
    `      cd ${relative(root, chosen.path)}`,
    '',
    '  Then, when the Checks pass and the work is committed, from that worktree:',
    '',
    '      pnpm feature land',
    '',
  );
  console.log(lines.join('\n'));
}

/** The shortest way to say the path, for a line meant to be pasted. */
function relative(root, path) {
  const from = root.replace(/\\/g, '/');
  const to = path.replace(/\\/g, '/');
  return to.startsWith(`${from}/`) ? to.slice(from.length + 1) : to;
}
