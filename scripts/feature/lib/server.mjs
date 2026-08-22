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
 * The port is also passed explicitly rather than left to astro, which silently
 * increments past a busy one — a server left to choose is one that cannot be
 * trusted to be where it said it was.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, openSync } from 'node:fs';
import { listeners } from './listeners.mjs';
import { free } from './ports.mjs';

/** Where the server's output goes. `*.log` is gitignored repository-wide. */
export function logPath(worktree) {
  return `${worktree}/dev-server.log`;
}

/**
 * @param {object} options
 * @param {string} options.worktree absolute path
 * @param {number} options.port
 * @returns {Promise<{ pid: number | null, listener: number | null, log: string, reason?: string }>}
 */
export async function start({ worktree, port }) {
  const log = logPath(worktree);
  const astro = `${worktree}/node_modules/astro/bin/astro.mjs`;
  if (!existsSync(astro)) {
    return {
      pid: null,
      listener: null,
      log,
      reason: `astro is not installed in ${worktree} — run \`pnpm install\` there, then \`pnpm dev --port ${port}\``,
    };
  }

  const handle = openSync(log, 'a');
  const child = spawn(
    process.execPath,
    [astro, 'dev', '--port', String(port), '--host', '127.0.0.1'],
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

  // Wait for the port, then ask who has it. Without this the recorded listener
  // is null and the teardown is back to guessing.
  const listener = await waitForListener(port);
  return {
    pid: child.pid ?? null,
    listener,
    log,
    reason:
      listener === null
        ? `nothing was listening on ${port} after 30 seconds — see ${log}`
        : undefined,
  };
}

/** The pid that ends up holding the port, or null if nothing does. */
async function waitForListener(port) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (!(await free(port))) {
      const holding = listeners(port);
      // Held but unattributable — `lsof` missing, say. Better than reporting
      // nothing came up, since something plainly did.
      return holding[0] ?? -1;
    }
    await new Promise((ok) => setTimeout(ok, 500));
  }
  return null;
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
