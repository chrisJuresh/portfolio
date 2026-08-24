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
import { fromCommandLines, holders, listeners, standingIn } from './listeners.mjs';
import { free } from './ports.mjs';

/** Where the server's output goes. `*.log` is gitignored repository-wide. */
export function logPath(worktree) {
  return `${worktree}/dev-server.log`;
}

/** Astro's own two files: the lock naming the process that bound the socket, and
 *  the log the backgrounded server writes its requests and errors to. Ours only
 *  ever holds the one announcement, because the process we spawn hands the
 *  serving to a child and exits. */
function astroLockPath(worktree) {
  return `${worktree}/.astro/dev.json`;
}
function astroLogPath(worktree) {
  return `${worktree}/.astro/dev.log`;
}

/**
 * @param {object} options
 * @param {string} options.worktree absolute path
 * @param {number} options.port the port to ASK for
 * @returns {Promise<{ port: number | null, pid: number | null,
 *                     listener: number | null, log: string, reason?: string }>}
 *   `port` is the one astro took, which is what everything downstream must
 *   record: `feature list` prints it and the teardown stops it. Null means astro
 *   never said, and `reason` says where to look.
 */
export async function start({ worktree, port: asked }) {
  const log = logPath(worktree);
  const astro = `${worktree}/node_modules/astro/bin/astro.mjs`;
  if (!existsSync(astro)) {
    return {
      port: null,
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

  const came = await waitForServer({ log, since });
  return {
    port: came?.port ?? null,
    pid: child.pid ?? null,
    listener: came?.listener ?? null,
    log,
    reason: came
      ? undefined
      : `astro announced no server within 30 seconds (it was asked for ${asked}) — see ${log}` +
        (existsSync(astroLogPath(worktree)) ? ` and ${astroLogPath(worktree)}` : ''),
  };
}

/**
 * Wait for astro to say where it is, and then ask the socket who is there.
 *
 * THE LOG IS THE ONLY SOURCE, and there is deliberately no fallback to probing
 * the port that was asked for. That probe is the bug in a different coat: if
 * astro has moved then something else is holding the port that was asked for, so
 * "the asked port is no longer bindable" is perfectly true and says nothing
 * whatever about our server — and a start that recorded it would hand the
 * teardown a stranger's process to kill.
 *
 * So an astro that says nothing this reader understands is reported as no
 * server, loudly, with the two logs named. That is a wrong answer somebody can
 * act on; the probe's is one nobody can see.
 *
 * @returns {Promise<{ port: number, listener: number } | null>}
 */
async function waitForServer({ log, since, attempts = 60, wait = 500 }) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const said = announced(readOrEmpty(log, since));
    if (said) return { port: said.port, listener: await whoHas(said.port, said.pid) };
    await new Promise((ok) => setTimeout(ok, wait));
  }
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

/**
 * A file, or '' if it is not there — from a byte offset, when one is given.
 *
 * Sliced as bytes and not as characters: astro's banner is not ASCII, so a
 * character slice drifts away from the offset `statSync` reported.
 *
 * @returns {string}
 */
function readOrEmpty(file, since = 0) {
  try {
    return readFileSync(file).subarray(since).toString('utf8');
  } catch {
    return '';
  }
}

/**
 * What is still serving inside a worktree — a port and a pid, not just `EBUSY`.
 *
 * The syscalls under `listeners.mjs`'s `holders`, which is where the decision
 * and its tests are. This gathers the world: astro's lock file, who is on its
 * port, whether its pid still exists, and who is on the port the registry
 * recorded.
 *
 * @param {object} options
 * @param {string} options.worktree
 * @param {number | null} [options.port] what the registry recorded
 * @returns {ReturnType<typeof holders>}
 */
export function serving({ worktree, port = null }) {
  const lock = locked(readOrEmpty(astroLockPath(worktree)));
  return holders({
    lock,
    onLockPort: lock ? listeners(lock.port) : [],
    lockPidAlive: lock ? alive(lock.pid) : false,
    recordedPort: port,
    onRecordedPort: port === null ? [] : listeners(port),
  });
}

/**
 * What is holding the worktree open without being on a port — a working
 * directory, which is what `EBUSY` on the top-level `rmdir` actually means.
 *
 * The syscalls under `listeners.mjs`'s `standingIn`, where the decision and its
 * tests are. Only ever called once a removal has already failed, which is what
 * pays for spawning a shell here: `Get-CimInstance Win32_Process` is about a
 * second, and on a teardown that worked nobody would want to have waited for it.
 *
 * @param {object} options
 * @param {string} options.worktree
 * @param {string | null} options.startedIn the directory the process started in,
 *   captured before anything chdired out of it
 * @returns {ReturnType<typeof standingIn>}
 */
export function standing({ worktree, startedIn }) {
  return standingIn({
    worktree,
    startedIn,
    named: fromCommandLines(commandLines(), worktree, process.pid),
  });
}

/**
 * Every process's command line, `<pid>\t<command line>` a line.
 *
 * This is as close as Windows gets to the question. `Win32_Process` has
 * `CommandLine` and `ExecutablePath` and **no working-directory property**, so
 * the shell standing in the tree is not in here — only things launched from a
 * path inside it. `standingIn` is the half that is exact.
 *
 * @returns {string}
 */
function commandLines() {
  if (process.platform === 'win32') {
    // Composed with `[char]9` and no quotes of its own: the whole script is one
    // argv entry that node has to quote for a Windows command line, and a script
    // carrying its own double quotes is the thing that breaks on the way through.
    // `-NoProfile` because a profile that prints anything lands in this output.
    const asked = spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Get-CimInstance Win32_Process | ForEach-Object ' +
          '{ $_.ProcessId.ToString() + [char]9 + $_.CommandLine }',
      ],
      { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, windowsHide: true },
    );
    return asked.stdout ?? '';
  }
  // `ps` separates the pid from the command with spaces; the parser wants one
  // field boundary, and a missing `ps` is not an error — it just means the
  // exact half below is all there is.
  const asked = spawnSync('ps', ['-eo', 'pid=,args='], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  return (asked.stdout ?? '').replace(/^[ ]*(\d+)[ ]+/gm, '$1' + String.fromCharCode(9));
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

/**
 * The command a person would type to stop one, for a report that has run out of
 * things it can safely do itself.
 *
 * Here rather than beside the report, so that one module knows how a server dies
 * on each platform. `kill` below is the same decision, made in code.
 *
 * @param {number} pid
 * @returns {string}
 */
export function stopCommand(pid) {
  return process.platform === 'win32' ? `taskkill /PID ${pid} /T /F` : `kill -9 ${pid}`;
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
