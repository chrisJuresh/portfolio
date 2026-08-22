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

/** Thrown when a command fails. `refused` says whether it was a gate. */
export class CommandFailed extends Error {
  constructor(shown, result, refused) {
    const said = firstLine(result.stderr) || firstLine(result.stdout) || `exit ${result.status}`;
    super(`${shown}\n  ${said}`);
    this.name = 'CommandFailed';
    this.shown = shown;
    this.result = result;
    this.refused = refused ?? null;
  }
}

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
   *  about itself, or one a caller recognised that `classify` would not. */
  function note({ what, gate, refusal, fix }) {
    denials.push(entry({ at: now(), command, what, gate, refusal, fix }));
  }

  /**
   * Run something. Never throws; returns what happened.
   *
   * @param {string} file
   * @param {string[]} args
   * @param {{ cwd?: string, shell?: boolean, inherit?: boolean, input?: string }} [options]
   */
  function run(file, args, { cwd, shell = false, inherit = false, input } = {}) {
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
    const out = { status, stdout: result.stdout ?? '', stderr, shown };

    if (status !== 0) {
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
      const done = (status) => {
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

  /** Run something that has to work. */
  function ok(file, args, options) {
    const result = run(file, args, options);
    if (result.status !== 0) throw new CommandFailed(result.shown, result, result.refused);
    return result;
  }

  /** Run something that has to work, and read its stdout. */
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
