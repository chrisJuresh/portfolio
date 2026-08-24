/**
 * Who is holding a spent worktree open — on a port, or by standing in it.
 *
 * Two answers, because `EBUSY` gives neither. A dev server on a port is the one
 * this module was written for; a process whose working directory is the worktree
 * is the one that turned out to be commoner (#168), because `feature land`
 * refuses to run from the main checkout and so is always invoked from inside the
 * tree it is about to delete.
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
import { inside, samePath } from './teardown.mjs';

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

/**
 * Processes whose command line names a path inside `worktree`.
 *
 * The weaker of the two signals here, and the only one that comes with a pid.
 * The question that matters cannot be asked on Windows at all: `Win32_Process`
 * carries `CommandLine` and `ExecutablePath` and **has no working-directory
 * property**, so no scan finds the shell. What a command line does catch is
 * anything started BY a path inside the tree — `astro dev` is spawned as
 * `<worktree>/node_modules/astro/bin/astro.mjs`, absolute — so a server both
 * port checks missed still turns up.
 *
 * Matched at a boundary rather than as a substring, for the same reason
 * `inside` exists: `…/worktrees/panel` is a prefix of `…/worktrees/panel-two`.
 *
 * @param {string} output one `<pid>\t<command line>` a line
 * @param {string} worktree
 * @param {number} [self] a pid to leave out — this process is running the
 *   teardown from inside the tree, and naming ourselves would be true and useless
 * @returns {{ pid: number, said: string }[]}
 */
export function fromCommandLines(output, worktree, self = 0) {
  const target = samePath(worktree);
  const found = [];
  const seen = new Set();
  for (const line of String(output).split(/\r?\n/)) {
    const at = line.indexOf('\t');
    if (at < 1) continue;
    const pid = Number(line.slice(0, at).trim());
    const said = line.slice(at + 1).trim();
    if (!Number.isInteger(pid) || pid <= 0 || pid === self || seen.has(pid)) continue;
    if (!names(samePath(said), target)) continue;
    seen.add(pid);
    found.push({ pid, said });
  }
  return found;
}

/**
 * Does this command line name `target` as a path, rather than merely contain its
 * characters?
 *
 * Written out rather than built as a regexp from an escaped path: a path is full
 * of regexp metacharacters, and the escaping is the part that would be wrong.
 *
 * @param {string} said normalised by `samePath`
 * @param {string} target normalised by `samePath`
 * @returns {boolean}
 */
function names(said, target) {
  for (let at = said.indexOf(target); at !== -1; at = said.indexOf(target, at + 1)) {
    const after = said[at + target.length];
    // End of the string, a separator, or a quote closing the argument. Anything
    // else and this is `…/worktrees/panel` matching `…/worktrees/panel-two`,
    // which is somebody else's feature.
    if (after === undefined || after === '/' || after === '"' || after === "'" || /\s/.test(after)) {
      return true;
    }
  }
  return false;
}

/**
 * What is holding the worktree open without being on a port.
 *
 * On Windows a process's working directory is an open handle to that directory
 * without `FILE_SHARE_DELETE`, so it blocks the final `rmdir` on the worktree
 * root while everything inside deletes perfectly well. That is the signature, and
 * it is exactly what `land` reports: contents gone, `EBUSY` on the top directory.
 *
 * **`feature land` refuses to run from the main checkout**, so the shell that
 * invoked it has this worktree as its working directory on every single land.
 * That makes this the commonest cause of a failed teardown here, and the one the
 * report said nothing whatever about — twelve `EBUSY` attempts and no cause
 * (#168). `takedown.mjs` chdirs its OWN process out of the tree; the shell is a
 * different process and cannot be moved from here, which is why this names it
 * rather than fixing it.
 *
 * `startedIn` is the exact half. pnpm inherited that directory from whoever
 * called it, so a directory inside the worktree means a live process has it —
 * live because it is blocked waiting for us. The wording says the directory and
 * not which process, because `pnpm --dir <worktree>` would make it this process's
 * own and nothing else's, and a report that named the shell would then be wrong
 * about the one thing the author is about to act on.
 *
 * Pure, and given the world rather than asking it: `server.mjs` is the syscall.
 *
 * @param {object} world
 * @param {string} world.worktree
 * @param {string | null} world.startedIn the directory this process started in,
 *   captured before anything chdired out of it
 * @param {{ pid: number, said: string }[]} [world.named] from `fromCommandLines`
 * @returns {{ pid: number | null, from: string, confirmed: boolean }[]}
 *   `confirmed` is whether to believe it — a directory is a fact, a command line
 *   is a string that mentions one.
 */
export function standingIn({ worktree, startedIn, named = [] }) {
  /** @type {{ pid: number | null, from: string, confirmed: boolean }[]} */
  const rows = [];

  if (startedIn && inside(worktree, startedIn)) {
    rows.push({
      pid: null,
      from:
        `${startedIn} is the directory this command was run in, and on Windows that alone ` +
        'blocks the rmdir — whatever is holding it cannot be moved from here',
      confirmed: true,
    });
  }
  for (const one of named) {
    rows.push({
      pid: one.pid,
      // Not "is inside the worktree": a command line is not a working directory,
      // and Windows will not report one. `holders` above is careful in the same
      // way about a port being machine-wide, and for the same reason — a report
      // that overstates sends the author after the wrong process.
      from: `its command line names a path inside this worktree — ${one.said}`,
      confirmed: false,
    });
  }
  return rows;
}
