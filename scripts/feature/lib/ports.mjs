/**
 * Which port a feature's dev server listens on.
 *
 * Deliberately allocated and recorded rather than left to `astro dev`, which
 * silently increments past a busy port: two features started at once would each
 * report 4321 and one of them would be lying. `feature land` also has to know
 * which port to take down, and a port it was never told is one it cannot.
 */

import { createServer } from 'node:http';

/** Where the scan starts. Astro's own default, so the first feature's URL is the
 *  one anybody working in this repository already expects. */
export const FIRST = 4321;

/** How far up to look before giving up. */
const SPAN = 200;

/**
 * Ports a browser refuses to fetch from, whatever is listening on them.
 *
 * Chromium's restricted list, reduced to the ones this scan can reach. A dev
 * server on one of these answers `curl` and fails every page load with
 * `net::ERR_UNSAFE_PORT`, which reads like a broken tree rather than a bad port.
 * `scripts/checks/lib/serve.mjs` carries the same list for its ephemeral
 * allocation; this one is a window rather than a lottery, so only two of them
 * are in range — but the scan is a window that can be moved with `from`.
 */
export const BROWSERS_REFUSE = new Set([
  1719, 1720, 1723, 2049, 3659, 4045, 4160, 4190, 4444, 5060, 5061, 6000, 6379, 6566, 6665, 6666,
  6667, 6668, 6669, 6679, 6697, 10080,
]);

/**
 * Is anything listening on this port?
 *
 * Asked by binding it, which is the only answer that is not a guess: a probe
 * that connects and gets refused says nothing about whether the bind will be
 * permitted.
 *
 * @param {number} port
 * @returns {Promise<boolean>}
 */
export function free(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true));
    });
  });
}

/**
 * The first port at or after `from` that no other feature holds, no browser
 * refuses, and nothing is listening on.
 *
 * @param {object} options
 * @param {Set<number>} options.taken ports the state file says other features hold
 * @param {(port: number) => boolean | Promise<boolean>} [options.isFree]
 * @param {number} [options.from]
 * @returns {Promise<number>}
 */
export async function choosePort({ taken, isFree = free, from = FIRST }) {
  for (let port = from; port < from + SPAN; port += 1) {
    if (taken.has(port)) continue;
    if (BROWSERS_REFUSE.has(port)) continue;
    if (await isFree(port)) return port;
  }
  throw new Error(
    `no free port between ${from} and ${from + SPAN - 1} — something is holding all of them.`,
  );
}
