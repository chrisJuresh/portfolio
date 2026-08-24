/**
 * Who is listening on a port.
 *
 * `feature start` records the pid it spawned, and that pid is not the server.
 * Astro's `bin/astro.mjs` spawns a child, so the process that binds the port is
 * a grandchild of the recorded one — and on Windows a detached spawn has no
 * process group to kill either. `taskkill` then reports "process not found" for
 * a pid that has already exited, the teardown reads as done, and the port stays
 * held by a dev server nothing is tracking.
 *
 * So the port is the handle. It is the one thing the state file knows that is
 * still true a minute later.
 */

import { spawnSync } from 'node:child_process';

/**
 * Pids LISTENING on `port`, from `netstat -ano`.
 *
 * @param {string} output
 * @param {number} port
 * @returns {number[]}
 */
export function fromNetstat(output, port) {
  const found = new Set();
  for (const line of String(output).split(/\r?\n/)) {
    const fields = line.trim().split(/\s+/);
    // `TCP  <local>  <foreign>  LISTENING  <pid>` — the state column is what
    // separates a server from something merely connected TO it, and a connection
    // has the wanted port as its FOREIGN address.
    if (fields.length < 5 || fields[3] !== 'LISTENING') continue;
    // Anchored at the end, so 43210 is not read as 4321.
    if (!new RegExp(`:${port}$`).test(fields[1])) continue;
    const pid = Number(fields[4]);
    if (Number.isInteger(pid) && pid > 0) found.add(pid);
  }
  // One server bound to both 127.0.0.1 and [::1] is two lines and one process.
  return [...found];
}

/**
 * Pids from `lsof -ti tcp:<port> -sTCP:LISTEN`, which prints them one to a line.
 *
 * @param {string} output
 * @returns {number[]}
 */
export function fromLsof(output) {
  const found = new Set();
  for (const line of String(output).split(/\r?\n/)) {
    const pid = Number(line.trim());
    if (Number.isInteger(pid) && pid > 0) found.add(pid);
  }
  return [...found];
}

/**
 * Ask the operating system.
 *
 * @param {number} port
 * @returns {number[]}
 */
export function listeners(port) {
  if (process.platform === 'win32') {
    const asked = spawnSync('netstat', ['-ano'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    return fromNetstat(asked.stdout ?? '', port);
  }
  // `lsof` is not everywhere, and a missing one is not an error — it just means
  // the pid is all there is to go on.
  const asked = spawnSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' });
  return fromLsof(asked.stdout ?? '');
}

/**
 * Which of them is this feature's — the answer a failed teardown needs.
 *
 * `EBUSY: resource busy or locked, rmdir '…'` does not name what is holding the
 * directory, and two sessions have now spent a turn finding that out by hand
 * with `netstat -ano`. There are two ways to know without asking a person: the
 * port the registry recorded, and `<worktree>/.astro/dev.json`, which is astro's
 * own lock file and names the process that bound the socket.
 *
 * Neither is believed on its own. **`listeners()` is machine-wide**, so a pid on
 * the recorded port is a pid on that port and nothing stronger — the report says
 * exactly that and no more. And astro deletes its lock on a clean stop, so one
 * left behind by a killed server would otherwise be reported as a live holder;
 * the socket is what confirms it. An **unconfirmed** row is named and never
 * stopped: the only pid it has came out of a file, and a pid out of a file is
 * one the operating system may have handed to somebody else since.
 *
 * Pure, and given the world rather than asking it, because this is the decision
 * and `server.mjs` is the syscall under it.
 *
 * @param {object} world
 * @param {{ port: number, pid: number } | null} world.lock astro's lock, parsed
 * @param {number[]} world.onLockPort pids listening on the lock's port
 * @param {boolean} world.lockPidAlive whether the lock's own pid still exists
 * @param {number | null} world.recordedPort the registry's port for this feature
 * @param {number[]} world.onRecordedPort pids listening on it
 * @returns {{ rows: { port: number, pid: number, from: string, confirmed: boolean }[],
 *             stop: number[] }}
 *   `stop` is the ports worth stopping, recorded first. A recorded port with
 *   nothing on it stays in the list: `stop` reports "already free", which is a
 *   fact the author wants, and leaving it out would make a quiet teardown
 *   indistinguishable from one that never looked.
 */
export function holders({ lock, onLockPort, lockPidAlive, recordedPort, onRecordedPort }) {
  /** @type {{ port: number, pid: number, from: string, confirmed: boolean }[]} */
  const rows = [];
  const seen = new Set();
  const note = (port, pid, from, confirmed) => {
    const key = `${port}:${pid}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ port, pid, from, confirmed });
  };

  if (lock) {
    for (const pid of onLockPort) note(lock.port, pid, 'astro’s lock file in this worktree', true);
    if (onLockPort.length === 0 && lockPidAlive) {
      note(lock.port, lock.pid, 'astro’s lock file, which the socket does not confirm', false);
    }
  }
  if (recordedPort !== null) {
    for (const pid of onRecordedPort) note(recordedPort, pid, 'the port this feature recorded', true);
  }

  const stop = [
    ...new Set([recordedPort, ...rows.filter((row) => row.confirmed).map((row) => row.port)]),
  ].filter((port) => Number.isInteger(port) && port > 0);

  return { rows, stop };
}
