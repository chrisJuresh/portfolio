/**
 * Running things, and noticing when something refuses.
 *
 * Every command either of the two feature commands runs goes through here, so
 * that "any denial the scripts hit is appended to the friction log" is a
 * property of one function rather than a promise made in nine places.
 *
 * Entries are collected in memory and written once, at the end, by `finish()`.
 * That is not tidiness: `feature land` deletes the worktree it was run in and
 * pulls the main checkout, so an entry written while it was working would either
 * be deleted with the tree or be an uncommitted file in the way of the pull.
 */

import { spawn, spawnSync } from 'node:child_process';
import { entry, flush } from './friction.mjs';
import { classify } from './refusal.mjs';

/**
 * What every run here answers with. `refused` is set only when a gate said no,
 * which is why it is optional rather than nullable: the two callers that read it
 * are asking "was this friction", not "what was the friction".
 *
 * @typedef {{ gate: string, fix: string }} Refusal
 * @typedef {{ status: number, stdout: string, stderr: string, shown: string, refused?: Refusal }} Run
 */

/** Thrown when a command fails. `refused` says whether it was a gate. */
export class CommandFailed extends Error {
  /**
   * @param {string} shown
   * @param {Run} result
   * @param {Refusal | null} [refused]
   */
  constructor(shown, result, refused) {
    const said = firstLine(result.stderr) || firstLine(result.stdout) || `exit ${result.status}`;
    super(`${shown}\n  ${said}`);
    this.name = 'CommandFailed';
    this.shown = shown;
    this.result = result;
    this.refused = refused ?? null;
  }
}

/** @param {unknown} text */
function firstLine(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line !== '');
}

/**
 * @param {object} options
 * @param {string} options.command what to call this run in the log — `feature land`
 * @param {() => Date} [options.now]
 */
export function session({ command, now = () => new Date() }) {
  /** @type {string[]} */
  const denials = [];

  /** Record a refusal that was not a command failing — one this script decided
   *  about itself, or one a caller recognised that `classify` would not.
   *
   *  @param {{ what: string, gate: string, refusal: string, fix: string }} denial */
  function note({ what, gate, refusal, fix }) {
    denials.push(entry({ at: now(), command, what, gate, refusal, fix }));
  }

  /**
   * Run something. Never throws; returns what happened.
   *
   * @param {string} file
   * @param {string[]} args
   * @param {object} [options]
   * @param {string} [options.cwd]
   * @param {boolean} [options.shell]
   * @param {boolean} [options.inherit]
   * @param {string} [options.input]
   * @param {boolean} [options.expected] this command failing is an ordinary step
   *   of the flow with a handled outcome, so do not record it as friction. See
   *   `finish` below for why that distinction is worth having.
   * @returns {Run}
   */
  function run(file, args, { cwd, shell = false, inherit = false, input, expected = false } = {}) {
    const shown = [file, ...args].join(' ');
    const result = spawnSync(file, args, {
      cwd,
      shell,
      input,
      encoding: 'utf8',
      // `inherit` is for the commands whose output is the point — `pnpm check`,
      // `pnpm install`. Everything else is captured so a refusal can be quoted.
      stdio: inherit ? ['ignore', 'inherit', 'inherit'] : 'pipe',
      // A build in a fresh worktree is not fast, and neither is Chromium.
      maxBuffer: 64 * 1024 * 1024,
    });

    // `?? -1`, and never `?? 0`. `spawnSync` leaves `status` null when the child
    // was killed by a signal — a Ctrl-C during `pnpm check` — and reads `signal`
    // instead. Defaulting that to 0 would make an interrupted Check run look like
    // a passing one, and `feature land` would push on the strength of it.
    const status = result.status ?? -1;
    const stderr =
      result.stderr ??
      String(result.error?.message ?? (result.signal ? `killed by ${result.signal}` : ''));
    /** @type {Run} */
    const out = { status, stdout: result.stdout ?? '', stderr, shown };

    if (status !== 0 && !expected) {
      const refused = classify(stderr, out.stdout);
      if (refused) {
        note({ what: shown, gate: refused.gate, refusal: `${stderr}\n${out.stdout}`, fix: refused.fix });
        out.refused = refused;
      }
    }
    return out;
  }

  /**
   * Run something slow whose output is the point, and keep a copy of it.
   *
   * `pnpm check` is a minute of build and browser, so watching it happen is not
   * optional — but `feature land` also has to say WHICH Check failed, and that
   * is a line in the output. Teed rather than captured for exactly that reason:
   * `spawnSync` can give one or the other and not both.
   *
   * @param {string} file
   * @param {string[]} args
   * @param {{ cwd?: string, shell?: boolean }} [options]
   * @returns {Promise<Run>}
   */
  function stream(file, args, { cwd, shell = false } = {}) {
    const shown = [file, ...args].join(' ');
    return new Promise((resolve) => {
      const child = spawn(file, args, { cwd, shell, stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
        process.stdout.write(chunk);
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
        process.stderr.write(chunk);
      });
      /** @param {number} status */
      const done = (status) => {
        /** @type {Run} */
        const out = { status, stdout, stderr, shown };
        if (status !== 0) {
          const refused = classify(stderr, stdout);
          if (refused) {
            note({ what: shown, gate: refused.gate, refusal: `${stderr}\n${stdout}`, fix: refused.fix });
            out.refused = refused;
          }
        }
        resolve(out);
      };
      child.on('error', (error) => {
        stderr += String(error?.message ?? error);
        done(-1);
      });
      child.on('close', (code) => done(code ?? -1));
    });
  }

  /** Run something that has to work.
   *
   *  @param {string} file
   *  @param {string[]} args
   *  @param {Parameters<typeof run>[2]} [options] */
  function ok(file, args, options) {
    const result = run(file, args, options);
    if (result.status !== 0) throw new CommandFailed(result.shown, result, result.refused);
    return result;
  }

  /** Run something that has to work, and read its stdout.
   *
   *  @param {string} file
   *  @param {string[]} args
   *  @param {Parameters<typeof run>[2]} [options] */
  function out(file, args, options) {
    return ok(file, args, options).stdout;
  }

  /**
   * Write whatever was refused. Called once, last, whatever happened.
   *
   * The path is passed in here rather than at construction because it is not
   * known until git has been asked where the main checkout is — and asking git
   * is itself something that can be refused.
   *
   * WHAT DOES NOT BELONG IN THE LOG. A refusal is worth an entry when the gate
   * should not have been there. `git worktree remove` failing on a locked
   * directory is not that: it is an ordinary step of this flow with a documented
   * completion, and `pnpm feature clean` finishes it. Logging it anyway wrote an
   * identical entry on every single land, into the main checkout, uncommitted —
   * which then blocked the NEXT land's `pull --ff-only` on a locally modified
   * file. A log that restates a fixed problem until it breaks something else is
   * worse than no log. Callers mark those `expected: true`.
   *
   * @param {string} frictionLog absolute path
   * @returns {number} how many entries were written
   */
  function finish(frictionLog) {
    if (denials.length === 0) return 0;
    flush(frictionLog, denials);
    return denials.length;
  }

  return {
    run,
    stream,
    ok,
    out,
    note,
    finish,
    get denials() {
      return denials.length;
    },
  };
}
