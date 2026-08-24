/**
 * The feature's own dev server: one per worktree, on its own port.
 *
 * Astro is started DIRECTLY — `node node_modules/astro/bin/astro.mjs` — rather
 * than through `pnpm dev`, because a shelled `pnpm` on Windows is `cmd.exe`
 * wrapping node wrapping astro, and the pid that comes back is a shell that has
 * already exited.
 *
 * THE PID IS NOT THE SERVER, even so. Astro's bin spawns a child, so what binds
 * the port is a grandchild of what was spawned; and a `detached` spawn on Windows
 * has no process group to kill. The first version of this recorded the spawned
 * pid, and `feature land` then reported stopping a server while `taskkill` said
 * "process not found" and the port stayed held. So the port is the handle: it is
 * waited for, the pid holding it is recorded beside the spawned one, and the
 * teardown verifies against the socket rather than against an exit code.
 *
 * The port is passed explicitly rather than left to astro, which silently
 * increments past a busy one — a server left to choose is one that cannot be
 * trusted to be where it said it was.
 *
 * **THE PORT ASKED FOR IS NOT THE PORT TAKEN, either.** `--port` is a request,
 * and when something else holds the number astro moves to the next free one and
 * prints where it went. This waited for the port it had asked for, so it reported
 * "no dev server" about a server that was serving — and the teardown then stopped
 * a port that was already free while the real server held the worktree open
 * (#167). So the announcement is read out of the log and THAT is the feature's
 * port. `astro.mjs` is the reader; a probe that polls harder finds the same wrong
 * port.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, openSync, readFileSync, statSync } from 'node:fs';
import { announced, locked } from './astro.mjs';
import { listeners } from './listeners.mjs';
import { free } from './ports.mjs';

/** Where the server's output goes. `*.log` is gitignored repository-wide. */
export function logPath(worktree) {
  return `${worktree}/dev-server.log`;
}

/** Astro's own two files: the lock naming the process that bound the socket, and
 *  the log the backgrounded server writes its requests and errors to. Ours only
 *  ever holds the one announcement, because the process we spawn hands the
 *  serving to a child and exits. */
export function astroLockPath(worktree) {
  return `${worktree}/.astro/dev.json`;
}
export function astroLogPath(worktree) {
  return `${worktree}/.astro/dev.log`;
}

/**
 * @param {object} options
 * @param {string} options.worktree absolute path
 * @param {number} options.port the port to ASK for
 * @returns {Promise<{ port: number | null, asked: number, pid: number | null,
 *                     listener: number | null, log: string, reason?: string }>}
 *   `port` is the one astro took, which is what everything downstream must
 *   record: `feature list` prints it and the teardown stops it.
 */
export async function start({ worktree, port: asked }) {
  const log = logPath(worktree);
  const astro = `${worktree}/node_modules/astro/bin/astro.mjs`;
  if (!existsSync(astro)) {
    return {
      port: null,
      asked,
      pid: null,
      listener: null,
      log,
      reason: `astro is not installed in ${worktree} — run \`pnpm install\` there, then \`pnpm dev --port ${asked}\``,
    };
  }

  // Where this run's output starts. The log is appended to, so a second start in
  // the same worktree would otherwise read the FIRST run's announcement and
  // record a port that server has already given up.
  const since = existsSync(log) ? statSync(log).size : 0;

  const handle = openSync(log, 'a');
  const child = spawn(
    process.execPath,
    [astro, 'dev', '--port', String(asked), '--host', '127.0.0.1'],
    {
      cwd: worktree,
      // Detached, so the server outlives the `feature start` that made it — the
      // author is going to be looking at it for the next hour.
      detached: true,
      stdio: ['ignore', handle, handle],
      windowsHide: true,
    },
  );
  child.unref();

  const came = await waitForServer({ log, since, asked });
  return {
    port: came?.port ?? null,
    asked,
    pid: child.pid ?? null,
    listener: came?.listener ?? null,
    log,
    reason: came
      ? undefined
      : `astro announced no server within 30 seconds — see ${log}` +
        (existsSync(astroLogPath(worktree)) ? ` and ${astroLogPath(worktree)}` : ''),
  };
}

/**
 * Wait for astro to say where it is, and then ask the socket who is there.
 *
 * THE LOG IS ASKED FIRST, every time round, and the port probe is only a
 * fallback. The other order is the bug: if astro has moved to another port then
 * something else is holding the one that was asked for, so "the asked port is no
 * longer bindable" is true and means nothing about our server.
 *
 * @returns {Promise<{ port: number, listener: number } | null>}
 */
async function waitForServer({ log, since, asked, attempts = 60, wait = 500 }) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const said = announced(sinceBytes(log, since));
    if (said) return { port: said.port, listener: await whoHas(said.port, said.pid) };
    await new Promise((ok) => setTimeout(ok, wait));
  }
  // Nothing this reader understood. An astro that says nothing is still a
  // server, so a port that has become bound is worth taking — LAST, and never
  // as the first answer, because if astro moved then something else is holding
  // the port that was asked for and this would record that instead.
  if (!(await free(asked))) return { port: asked, listener: await whoHas(asked, null) };
  return null;
}

/**
 * The pid holding a port.
 *
 * Given a moment: astro announces on `listen`, and the socket takes a beat to
 * show up in `netstat`. `announced` is the fallback, because in the backgrounded
 * shapes the pid astro names IS the one that bound. `-1` is "held by something
 * that could not be named" — `lsof` missing, say — and the report prints that as
 * "pid unknown" rather than as a pid.
 */
async function whoHas(port, announcedPid, attempts = 10, wait = 200) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const holding = listeners(port)[0];
    if (holding !== undefined) return holding;
    if (attempt < attempts - 1) await new Promise((ok) => setTimeout(ok, wait));
  }
  return announcedPid ?? -1;
}

/** What has been written to a file since a byte offset. Sliced as bytes, not as
 *  characters: astro's banner is not ASCII, so a character slice drifts. */
function sinceBytes(file, since) {
  try {
    return readFileSync(file).subarray(since).toString('utf8');
  } catch {
    return '';
  }
}

/**
 * What is still serving inside a worktree — a port and a pid, not just `EBUSY`.
 *
 * The one thing a failed removal never said. Twice now a session has been handed
 * `EBUSY: resource busy or locked, rmdir '…'` and has had to find the holder by
 * hand with `netstat -ano`, which is a turn spent on something the script already
 * has two ways to know: the port it recorded, and astro's own lock file, which
 * the holder wrote itself.
 *
 * @param {object} options
 * @param {string} options.worktree
 * @param {number | null} [options.port] what the registry recorded
 * @returns {{ port: number, pid: number, from: string, confirmed: boolean }[]}
 *   `confirmed` means the socket says so. An unconfirmed holder is named in the
 *   report and NOT killed: the only pid available for it came out of a file, and
 *   a pid out of a file is a pid the operating system may have handed to
 *   somebody else since.
 */
export function serving({ worktree, port = null }) {
  /** @type {{ port: number, pid: number, from: string, confirmed: boolean }[]} */
  const found = [];
  const seen = new Set();
  const note = (candidate, from, confirmed) => {
    const key = `${candidate.port}:${candidate.pid}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ ...candidate, from, confirmed });
  };

  // Astro's lock first: it names both halves, and the holder wrote it. It is not
  // believed on its own, though — astro removes it on a clean stop, so one left
  // behind by a killed server would otherwise be reported as a live holder. The
  // socket is what makes it true.
  const held = locked(readOr(astroLockPath(worktree)));
  if (held) {
    const holding = listeners(held.port);
    for (const pid of holding) note({ port: held.port, pid }, 'astro’s lock file', true);
    if (holding.length === 0 && alive(held.pid)) {
      note(held, 'astro’s lock file, which the socket does not confirm', false);
    }
  }
  // Then whatever is on the recorded port, which catches a holder that is not
  // astro at all.
  if (port !== null) {
    for (const pid of listeners(port)) note({ port, pid }, 'the recorded port', true);
  }
  return found;
}

/** Is this process still there? Signal 0 asks without sending anything. */
function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** @returns {string} the file, or '' if it is not there */
function readOr(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

/**
 * Stop a server, and say whether the port actually came free.
 *
 * @param {object} options
 * @param {number | null} options.pid what was spawned
 * @param {number | null} [options.listener] what was holding the port
 * @param {number} options.port
 * @returns {Promise<{ stopped: boolean, said: string }>}
 */
export async function stop({ pid, listener, port }) {
  if (await free(port)) {
    return { stopped: true, said: `${port} was already free` };
  }

  const said = [];

  // What was recorded, then what is actually there. The second is what works,
  // and the first is kept because a spawned parent that is still alive would
  // otherwise be left behind holding nothing.
  for (const target of dedupe([pid, listener, ...listeners(port)])) {
    said.push(kill(target));
    if (await free(port)) return { stopped: true, said: said.join('; ') };
  }

  // Killing a tree is not instant.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await free(port)) return { stopped: true, said: said.join('; ') };
    await new Promise((ok) => setTimeout(ok, 100));
  }

  const left = listeners(port);
  return {
    stopped: false,
    said: `${said.join('; ') || 'nothing to kill was recorded'}; ${port} is still held${
      left.length > 0 ? ` by ${left.join(', ')}` : ''
    }`,
  };
}

function dedupe(pids) {
  return [...new Set(pids.filter((pid) => Number.isInteger(pid) && pid > 0))];
}

/** @returns {string} what happened, for the report */
function kill(pid) {
  if (process.platform === 'win32') {
    // /T for the tree and /F because a dev server does not stop politely: vite
    // spawns workers, and killing only the parent leaves the port held.
    const killed = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { encoding: 'utf8' });
    const answered = (killed.stdout || killed.stderr || '').trim().split(/\r?\n/)[0] ?? '';
    return `taskkill ${pid} → ${answered}`;
  }
  try {
    // The negative pid is the process group a detached spawn made; a plain pid
    // for anything found by port, which is not a group leader.
    process.kill(-pid, 'SIGTERM');
    return `SIGTERM to group ${pid}`;
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
      return `SIGTERM to ${pid}`;
    } catch (error) {
      return `SIGTERM to ${pid} → ${String(error?.message ?? error)}`;
    }
  }
}
