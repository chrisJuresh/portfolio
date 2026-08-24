/**
 * Reading astro's own answers.
 *
 * The sibling of `parse.mjs`, for the other process this lifecycle depends on.
 * Everything here is a string in and a value out, which is the half that can be
 * tested without a dev server — and the half that was wrong.
 *
 * WHY THIS EXISTS: `feature start` chooses a port, passes it with `--port`, and
 * then used to wait for THAT port and record it. Astro does not promise to take
 * it. When something else already holds the number — a server from a tree that
 * was removed without a teardown, a `pnpm preview`, anything — astro increments
 * to the next free one, binds it, and says so. The script kept watching the port
 * it had asked for, reported "no dev server" about a server that was serving,
 * and then, at teardown, stopped a port that was already free while the real
 * server sat inside the worktree holding the directory (#167).
 *
 * **Astro is the authority, because astro is the process that bound the socket.**
 * A probe that polls harder finds the same wrong port. So the line astro prints
 * is read, and the port in it is the feature's port.
 *
 * It prints that line in three shapes, and all three have to be understood:
 *
 *   - **JSON**, one object a line, when astro decides it is being run by an agent
 *     (`am-i-vibing`, which sees `CLAUDECODE`). It then also backgrounds itself,
 *     so this is the shape almost every run in this repository produces.
 *   - **The plain sentence**, `Dev server running at <url> (pid N)`, which is
 *     what the JSON's `message` carries and what `--background` prints on its own.
 *   - **The banner**, `┃ Local    <url>`, when astro stays in the foreground.
 *
 * The pid is worth taking with the port. In the backgrounded shapes it is the
 * process that holds the socket, which is the one thing the teardown needs and
 * the one thing the spawned pid is not.
 */

/** Astro's stdout is a TTY-shaped stream even when it is a file, so the banner
 *  arrives coloured. Colour is not data. */
const SGR = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

/** `Dev server running at http://127.0.0.1:4323 (pid 10108)`, and the
 *  `already running` wording astro uses when its lock file says one is up. */
const SENTENCE = /\b(?:running|already running) at\s+(\S+?)\/?(?:\s|$)(?:\(pid\s+(\d+)\))?/i;

/** `┃ Local    http://127.0.0.1:4322/` — the foreground banner. The bar is
 *  optional so that a line that lost it to some wrapper still reads. */
const BANNER = /^\s*(?:┃\s*)?Local\s+(\S+)/;

/**
 * The port astro said it took, and the pid it said took it.
 *
 * The LAST announcement in the text wins: the log is appended to, and a restart
 * writes a second line. Taking the first would hand the teardown a port the
 * server has since given up.
 *
 * @param {string} output whatever astro has written since the spawn
 * @returns {{ port: number, pid: number | null } | null}
 */
export function announced(output) {
  /** @type {{ port: number, pid: number | null } | null} */
  let found = null;
  for (const line of String(output ?? '').split(/\r?\n/)) {
    for (const said of unwrap(line)) {
      const one = fromLine(said);
      if (one) found = one;
    }
  }
  return found;
}

/**
 * A log line, and — when it is one of astro's JSON records — the message inside
 * it, split at the newlines the message itself carries.
 *
 * A line that merely starts with a brace is not a record, and astro's own errors
 * arrive on the same stream. So a parse failure is a line, not a throw.
 *
 * @param {string} line
 * @returns {string[]}
 */
function unwrap(line) {
  const said = line.replace(SGR, '');
  if (!said.trimStart().startsWith('{')) return [said];
  try {
    const record = JSON.parse(said);
    if (typeof record?.message !== 'string') return [said];
    return record.message.replace(SGR, '').split(/\r?\n/);
  } catch {
    return [said];
  }
}

/** @returns {{ port: number, pid: number | null } | null} */
function fromLine(said) {
  const sentence = SENTENCE.exec(said);
  if (sentence) {
    const port = portOf(sentence[1]);
    if (port !== null) return { port, pid: numberOr(sentence[2], null) };
  }
  const banner = BANNER.exec(said);
  if (banner) {
    const port = portOf(banner[1]);
    // The banner names no pid. Null rather than the spawned one: the spawned pid
    // is exactly the lie this module exists to stop telling.
    if (port !== null) return { port, pid: null };
  }
  return null;
}

/**
 * The port out of a URL, and null when there is none.
 *
 * `new URL('http://localhost/').port` is the empty string, and reading that as a
 * port would send the teardown after whatever holds 80.
 *
 * @param {string} url
 * @returns {number | null}
 */
function portOf(url) {
  try {
    return numberOr(new URL(url).port, null);
  } catch {
    return null;
  }
}

/**
 * Astro's own lock file, `<worktree>/.astro/dev.json`.
 *
 * The holder writes it, so it is the honest answer to "what is still inside this
 * worktree" once a removal has failed with nothing but `EBUSY` to show for it.
 * A half-written or superseded one reads as nothing: every field this cares
 * about has to be there and be a number.
 *
 * @param {string} text
 * @returns {{ port: number, pid: number | null } | null}
 */
export function locked(text) {
  try {
    const held = JSON.parse(String(text ?? ''));
    const port = numberOr(held?.port, null);
    const pid = numberOr(held?.pid, null);
    if (port === null || pid === null) return null;
    return { port, pid };
  } catch {
    return null;
  }
}

/** A positive integer, or the fallback. `Number('')` is 0, which is why this is
 *  not a bare cast. */
function numberOr(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
