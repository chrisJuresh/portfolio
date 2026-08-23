/**
 * Running a Bake, and saying what happened.
 *
 * THE SECOND SPEED. A Token moves the page in the frame it is dragged in; a
 * baked parameter moves nothing until a generator has run, and the generators
 * this drives take between two seconds and two minutes. So a bake is started,
 * polled and reported rather than awaited — the surface asks how it is going and
 * the Editor stays usable while it goes.
 *
 * A FAILURE HAS TO SAY WHY, which is #146's third acceptance criterion and the
 * only one of the five that is exercisable on a fresh checkout. Every one of
 * these generators needs something this repository deliberately does not carry —
 * a raw frame, a 12 MB JPEG, Blender, a font file — so the ordinary outcome of
 * pressing Re-bake on a machine that has not got them is a failure, and the
 * useful thing is the generator's own last words rather than a status code. So
 * the report carries both: `why`, one sentence about how the process ended, and
 * the tail of everything it printed on either stream.
 *
 * THE TAIL AND NOT THE HEAD. A Python traceback ends with the exception, Blender
 * ends with what it could not open, and Pillow ends with the file it wanted. The
 * first kilobyte of any of those is a banner.
 *
 * NOTHING GOES THROUGH A SHELL. The argument list comes from `bakes.mjs`, which
 * refuses a control character in any element, and is handed to `spawn` as an
 * array — so a path with a space in it is a path with a space in it, and there
 * is no line for anything to be quoted into.
 */

import { spawn } from 'node:child_process';

/** How much of a generator's output is kept, per stream pair. Enough for a
 *  traceback and Blender's last twenty lines; short enough to hand to a browser
 *  on every poll. */
export const KEPT = 16 * 1024;

/** How many finished runs are remembered. The surface only ever shows the last
 *  one per Bake; the rest are there so a report is not lost the moment a second
 *  Bake is started. */
const REMEMBERED = 20;

/**
 * The last `cap` characters of `text`, marked when anything was dropped.
 *
 * The tail, for the reason at the top of the file. Cut at a line boundary where
 * there is one within a tenth of the cap, so the first line kept is a whole one
 * rather than the back half of a path.
 */
export function tail(text, cap = KEPT) {
  const whole = String(text ?? '');
  if (whole.length <= cap) return whole;
  const cut = whole.slice(whole.length - cap);
  const first = cut.indexOf('\n');
  const kept = first !== -1 && first < cap / 10 ? cut.slice(first + 1) : cut;
  return `… ${whole.length - kept.length} earlier characters not kept …\n${kept}`;
}

/**
 * One sentence about how a process ended.
 *
 * `error` is what `spawn` reports when the program could not be started at all,
 * and it is the case worth naming separately: `python` not being on PATH reads
 * as a broken Editor if it is reported as "exit -1", and as a machine that has
 * not got Python if it is reported as itself.
 *
 * @returns {{ ok: boolean, why: string }}
 */
export function outcome({ code, signal, error }) {
  if (error) {
    const missing = error.code === 'ENOENT';
    return {
      ok: false,
      why: missing
        ? `could not start ${error.path ?? 'the generator'} — it is not on PATH on this machine`
        : `could not start the generator — ${error.message}`,
    };
  }
  if (signal) return { ok: false, why: `the generator was killed by ${signal}` };
  if (code === 0) return { ok: true, why: 'the generator finished' };
  return { ok: false, why: `the generator exited ${code}` };
}

/**
 * Every bake this Editor has started, and what became of them.
 *
 * One at a time PER BAKE and not overall: two generators writing two different
 * sets of files is fine and is how a session with Blender open actually goes,
 * while two runs of the same one race for the same output paths.
 */
export class Runs {
  constructor({ spawnProcess = spawn, now = () => Date.now() } = {}) {
    this.spawnProcess = spawnProcess;
    this.now = now;
    this.runs = new Map();
    this.next = 1;
  }

  /** The run in flight for `bake`, if there is one. */
  running(bake) {
    for (const run of this.runs.values()) if (run.bake === bake && run.state === 'running') return run;
    return null;
  }

  get(id) {
    return this.runs.get(id) ?? null;
  }

  /** The last run of each Bake, newest first, as the surface shows them. */
  latest() {
    const by = new Map();
    for (const run of this.runs.values()) by.set(run.bake, run);
    return [...by.values()];
  }

  /**
   * Start one.
   *
   * @param {object} what
   * @param {string} what.bake     the Bake's name, for the one-at-a-time rule
   * @param {string[]} what.argv   the program and its arguments, from `command`
   * @param {string} what.cwd
   * @param {(run: object) => Promise<void> | void} [what.after]  run on success,
   *        before the run is reported done — this is where the served build is
   *        brought up to date, so the page shows the new asset rather than the
   *        one it was built with.
   * @returns {object} the run
   */
  start({ bake, argv, cwd, after }) {
    const id = `run-${this.next}`;
    this.next += 1;
    const run = {
      id,
      bake,
      argv,
      state: 'running',
      started: this.now(),
      ended: null,
      ok: null,
      why: null,
      log: '',
    };
    this.runs.set(id, run);
    this.forget();

    let output = '';
    const keep = (chunk) => {
      output += chunk;
      run.log = tail(output);
    };

    const child = this.spawnProcess(argv[0], argv.slice(1), { cwd, windowsHide: true });
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', keep);
    child.stderr?.on('data', keep);

    const finish = async (how) => {
      if (run.state !== 'running') return;
      const { ok, why } = outcome(how);
      run.ok = ok;
      run.why = why;
      if (ok && after) {
        try {
          await after(run);
        } catch (error) {
          run.ok = false;
          run.why = `${why}, but the served build could not be brought up to date — ${error.message}`;
        }
      }
      run.state = run.ok ? 'done' : 'failed';
      run.ended = this.now();
    };

    child.on('error', (error) => void finish({ error }));
    child.on('close', (code, signal) => void finish({ code, signal }));
    return run;
  }

  /** Drop the oldest finished runs. A run in flight is never forgotten. */
  forget() {
    const finished = [...this.runs.values()].filter((run) => run.state !== 'running');
    for (const run of finished.slice(0, Math.max(0, finished.length - REMEMBERED))) {
      this.runs.delete(run.id);
    }
  }
}
