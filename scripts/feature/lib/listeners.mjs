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
