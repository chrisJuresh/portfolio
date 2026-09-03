/**
 * The Editor's fourth surface: the five generators, and the numbers they run
 * with.
 *
 * THE SECOND SPEED, WHICH IS THE WHOLE REASON THIS IS NOT THE TOKENS SURFACE.
 * A Token moves the page in the frame it is dragged in, because the value is a
 * custom property and a stylesheet of this tool's own can hold it. A baked
 * parameter moves NOTHING until a Python generator has run: the number is in a
 * photograph's grade or a marble's veining, and the only thing that can apply it
 * is fifteen seconds of Cycles or two minutes of Pillow. So this surface writes
 * the number when a control is released, exactly as the Tokens surface does, and
 * then does nothing at all until Re-bake is pressed.
 *
 * NOTHING IS PREVIEWED, AND NOT PREVIEWING IS THE HONEST ANSWER. Every one of the
 * five tuners this replaces drew SOMETHING before the bake — a canvas
 * transcription of the grade, a GLSL twin of the marble, a rectangle showing
 * which part of a photograph lands on the block — and every one of them then had
 * to say, at length, where its picture parted company with the real one. The
 * plinth studio put it best: what it can show you before a bake is the WINDOW,
 * which answers two parameters and is honest about answering nothing else. A
 * second transcription of each pipeline is a second thing to keep in step with
 * the first, and this repository has already paid for that once.
 *
 * WHAT IT SHOWS INSTEAD IS THE COMMAND. Every Bake prints the exact argument list
 * pressing Re-bake will run, so the author can read it before pressing it, and
 * can type it into a shell instead — which is the whole of "every generator still
 * runs standalone".
 *
 * A RUN IS POLLED. `/bake/run` answers as soon as the generator has started, and
 * this asks `/bakes` how it is going until it stops. A failure keeps the tail of
 * whatever the generator printed, because that is where the reason is: every one
 * of the five needs something this repository deliberately does not carry, so
 * "no such file: photos/plate.rw2" is not an error case, it is the ordinary
 * answer on a machine that has not got the frame.
 *
 * A SUCCESS REBUILDS AND RELOADS. The server rebuilds the tree — see `rebuild` in
 * server.mjs, and the baseline recapture that goes with it — and then this
 * reloads the page, because a baked asset reaches it through the build and there
 * is nothing in the DOM to swap.
 */

import { control } from './lib/tokens.mjs';

/** How often a running generator is asked how it is going. Slow enough that a
 *  two-minute bake is not a hundred requests, quick enough to read as live. */
const POLL = 1200;

const seconds = (ms) => `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;

export class Bakes {
  /**
   * @param {object} wiring
   * @param {(route: string, body: object) => Promise<any>} wiring.post
   * @param {(route: string) => Promise<any>} wiring.get
   * @param {(text: string, bad?: boolean) => void} wiring.say
   * @param {(id: string) => void} wiring.edited  told what this session has written
   */
  constructor({ post, get, say, edited }) {
    this.post = post;
    this.get = get;
    this.say = say;
    this.edited = edited;
    this.surface = null;
    this.bakes = [];
    /** The name of every Bake whose report is currently open, so a re-render
     *  does not shut a log the author is reading. */
    this.open = new Set();
    /** `${bake} ${group}` for every group of parameters currently open, for the
     *  same reason against a worse version of the same problem: one picture is
     *  six controls in ONE group, and every one of them redraws on release. */
    this.groups = new Set();
    this.polling = null;
  }

  async mount(surface) {
    this.surface = surface;
    surface.innerHTML = '<p data-editor-note>reading the Bakes…</p>';
    await this.refresh();
  }

  /** Ask the server what the Bakes are and how their last runs went. */
  async refresh() {
    const before = new Map(this.bakes.map((bake) => [bake.name, bake.run?.state]));
    try {
      const answer = await this.get('/bakes');
      this.bakes = answer.bakes ?? [];
    } catch (error) {
      this.say(`could not read the Bakes: ${error.message}`, true);
      return;
    }
    this.draw();
    this.watch();
    // Only a run this surface watched START is worth reporting. A report already
    // sitting there when the panel opened is a run from before, and reloading
    // the page over it would be a bake nobody just pressed.
    for (const bake of this.bakes) {
      if (before.get(bake.name) !== 'running' || bake.run?.state === 'running') continue;
      if (bake.run?.state === 'done') this.finished(bake);
      else this.say(`${bake.name}: ${bake.run?.why ?? 'the bake did not finish'}`, true);
    }
  }

  /** Poll while anything is running, and stop when nothing is. */
  watch() {
    const running = this.bakes.some((bake) => bake.run?.state === 'running');
    if (running && this.polling === null) {
      this.polling = window.setInterval(() => void this.refresh(), POLL);
    }
    if (!running && this.polling !== null) {
      window.clearInterval(this.polling);
      this.polling = null;
    }
  }

  draw() {
    if (!this.surface) return;
    const restore = this.holding();
    this.surface.textContent = '';
    if (this.bakes.length === 0) {
      const none = document.createElement('p');
      none.dataset.editorNote = '';
      none.textContent = 'no Bakes — a Bake is a folder under design/bake/ holding a recipe.json';
      this.surface.append(none);
    } else {
      for (const bake of this.bakes) this.surface.append(this.one(bake));
    }
    restore();
  }

  /**
   * Remember which control has the keyboard, and hand it back after the redraw.
   *
   * A REDRAW REPLACES EVERY CONTROL, so whatever the author was using stops
   * existing — and this surface redraws twice for reasons of its own: once per
   * write, because the tuned count and the revert's label both move with it, and
   * once per `POLL` for as long as a generator is running. Without this a slider
   * cannot be nudged twice with the arrow keys, and a bake in progress takes the
   * keyboard away every 1.2 seconds.
   *
   * Matched on whichever `data-editor-…` attribute the focused element carries,
   * because that is already what identifies one, and COMPARED rather than put in
   * a selector so that a value with a space in it needs no escaping.
   */
  holding() {
    const focused = document.activeElement;
    const named =
      focused instanceof HTMLElement && this.surface?.contains(focused)
        ? [...focused.attributes].find((one) => one.name.startsWith('data-editor-'))
        : undefined;
    return () => {
      if (!named || !this.surface) return;
      const again = [...this.surface.querySelectorAll(`[${named.name}]`)].find(
        (one) => one.getAttribute(named.name) === named.value,
      );
      // `preventScroll`, or handing the keyboard back scrolls the panel to it and
      // the surface jumps under the author once a poll.
      if (again instanceof HTMLElement) again.focus({ preventScroll: true });
    };
  }

  /** One Bake: what it is, what it needs, its parameters, and its last run. */
  one(bake) {
    const holder = document.createElement('details');
    holder.dataset.editorBake = bake.name;
    if (this.open.has(bake.name)) holder.open = true;
    holder.addEventListener('toggle', () => {
      if (holder.open) this.open.add(bake.name);
      else this.open.delete(bake.name);
    });

    const summary = document.createElement('summary');
    summary.textContent = bake.title ?? bake.name;
    const moved = (bake.params ?? []).filter((param) => param.moved).length;
    const count = document.createElement('small');
    count.textContent = moved === 0 ? bake.name : `${bake.name} · ${moved} tuned`;
    summary.append(' ', count);
    holder.append(summary);

    if (bake.error) {
      holder.append(this.note(`this Bake's recipe.json cannot be read — ${bake.error}`, true));
      return holder;
    }

    if (bake.note) holder.append(this.note(bake.note));
    // What it needs that this repository does not carry, said before the button
    // rather than after the failure.
    if (bake.needs) holder.append(this.note(`needs ${bake.needs}`));

    holder.append(this.controls(bake));
    holder.append(this.actions(bake));
    if (bake.run) holder.append(this.report(bake));
    return holder;
  }

  note(text, bad = false) {
    const said = document.createElement('p');
    said.dataset.editorNote = '';
    if (bad) said.dataset.editorBad = '';
    said.textContent = text;
    return said;
  }

  /** The parameters, grouped as the recipe groups them. */
  controls(bake) {
    const into = document.createDocumentFragment();
    let group = null;
    let holder = null;
    for (const param of bake.params) {
      if (param.group !== group) {
        group = param.group;
        const id = `${bake.name} ${group}`;
        // A `const` of its own rather than the loop's `holder`, which is
        // reassigned at every group: a listener closing over THAT would record
        // whichever group came last, whatever the author actually clicked.
        const box = document.createElement('details');
        box.dataset.editorGroup = '';
        // Per Bake and not per name, because two recipes may head a group the
        // same way and opening one of them is not opening the other.
        box.open = this.groups.has(id);
        box.addEventListener('toggle', () => {
          if (box.open) this.groups.add(id);
          else this.groups.delete(id);
        });
        const summary = document.createElement('summary');
        summary.textContent = group;
        box.append(summary);
        if (param.groupNote) box.append(this.note(param.groupNote));
        into.append(box);
        holder = box;
      }
      holder.append(this.row(bake, param));
    }
    return into;
  }

  /**
   * One parameter's control.
   *
   * WHAT KIND IS DECIDED BY THE RECIPE FIRST and by the value second, which is
   * the one place this differs from the Tokens surface. A Token has nothing but
   * its own bytes to go on, so `control()` reads them; a parameter is DECLARED,
   * with the range the tuner it came from spent a session choosing — 90 to 99.99
   * for an exposure percentile is knowledge, and deriving four-times-the-value
   * from 99 instead would throw it away. So a declared range makes a number, a
   * declared set of options makes a picker, and only what declares neither falls
   * through to reading the value.
   */
  row(bake, param) {
    const row = document.createElement('div');
    row.dataset.editorToken = `${bake.name} ${param.key}`;
    row.toggleAttribute('data-editor-moved', param.moved);

    const label = document.createElement('span');
    label.textContent = param.label;
    label.title = `${param.key}${param.note ? ` — ${param.note}` : ''}`;
    row.append(label);

    const back = document.createElement('button');
    back.type = 'button';
    back.dataset.editorWas = `${bake.name} ${param.key}`;
    back.title = param.was === '' ? 'unset — let the generator decide' : `back to ${param.was}`;
    back.textContent = '↺';
    back.addEventListener('click', () => void this.set(bake, param, param.was));

    if (param.options) {
      const pick = document.createElement('select');
      pick.dataset.editorInput = `${bake.name} ${param.key}`;
      for (const option of param.options) {
        const one = document.createElement('option');
        one.value = option;
        one.textContent = option;
        pick.append(one);
      }
      pick.value = param.value;
      pick.addEventListener('change', () => void this.set(bake, param, pick.value));
      row.append(pick, back);
      return row;
    }

    if (param.min !== null && param.max !== null) {
      const step = param.step ?? 0.01;
      const slider = document.createElement('input');
      slider.type = 'range';
      // Named, and it is the one control here that was not: a drag leaves the
      // keyboard on the SLIDER rather than on the box beside it, so without a
      // name of its own it is the one control a redraw cannot hand back.
      slider.dataset.editorDrag = `${bake.name} ${param.key}`;
      slider.min = String(param.min);
      slider.max = String(param.max);
      slider.step = String(step);
      const exact = document.createElement('input');
      exact.type = 'number';
      exact.step = String(step);
      exact.dataset.editorInput = `${bake.name} ${param.key}`;
      // An empty value is a parameter left for the generator to answer, so the
      // slider stands at the bottom of its range and the box stays empty until
      // something is typed or dragged. Dragging it is what sets it.
      slider.value = param.value === '' ? String(param.min) : param.value;
      exact.value = param.value;
      slider.addEventListener('input', () => {
        exact.value = slider.value;
      });
      // On release and not on every frame: there is no preview to feed, so a
      // write per frame would be a file written sixty times for one drag.
      slider.addEventListener('change', () => void this.set(bake, param, slider.value));
      exact.addEventListener('change', () => {
        slider.value = exact.value;
        void this.set(bake, param, exact.value);
      });
      row.append(slider, exact, back);
      return row;
    }

    const shape = control(param.was === '' ? param.value : param.was);
    if (shape.kind === 'colour') {
      const swatch = document.createElement('input');
      swatch.type = 'color';
      swatch.dataset.editorInput = `${bake.name} ${param.key}`;
      swatch.value = control(param.value).hex ?? shape.hex;
      const seen = document.createElement('small');
      seen.textContent = param.value;
      swatch.addEventListener('change', () => void this.set(bake, param, swatch.value));
      row.append(swatch, seen, back);
      return row;
    }

    const box = document.createElement('input');
    box.type = 'text';
    box.dataset.editorInput = `${bake.name} ${param.key}`;
    box.value = param.value;
    box.addEventListener('change', () => void this.set(bake, param, box.value));
    box.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') box.blur();
      if (event.key === 'Escape') {
        box.value = param.value;
        box.blur();
      }
    });
    row.append(box, back);
    return row;
  }

  /** Re-bake, and the command it will run. */
  actions(bake) {
    const holder = document.createElement('div');
    holder.dataset.editorBakeGo = '';

    const go = document.createElement('button');
    go.type = 'button';
    go.dataset.editorRebake = bake.name;
    const running = bake.run?.state === 'running';
    go.disabled = running;
    go.textContent = running ? 'baking…' : 'Re-bake';
    go.addEventListener('click', () => void this.run(bake));

    // The exact argument list, so it can be read before it is run and typed into
    // a shell instead of pressed.
    const argv = document.createElement('code');
    argv.dataset.editorArgv = '';
    argv.textContent = (bake.argv ?? []).join(' ');
    holder.append(go, argv);
    return holder;
  }

  /** How the last run went, and what it printed. */
  report(bake) {
    const run = bake.run;
    const holder = document.createElement('details');
    holder.dataset.editorRun = run.state;
    holder.open = run.state !== 'done';

    const summary = document.createElement('summary');
    summary.textContent =
      run.state === 'running'
        ? `baking — ${seconds(run.ms)}`
        : `${run.state === 'done' ? 'baked' : 'failed'} in ${seconds(run.ms)} — ${run.why}`;
    holder.append(summary);

    const log = document.createElement('pre');
    log.dataset.editorLog = '';
    log.textContent = run.log === '' ? '(the generator has printed nothing yet)' : run.log;
    holder.append(log);
    return holder;
  }

  /** Write one parameter. */
  async set(bake, param, value) {
    try {
      const answer = await this.post('/bake', { bake: bake.name, key: param.key, value });
      this.edited(`${bake.name}.${param.key}`);
      this.say(
        answer.changed
          ? `${answer.value === param.was ? 'put back' : 'wrote'} ${param.key} = ${answer.value || '(unset)'} in ${answer.file}`
          : `${param.key} was already ${answer.value || '(unset)'}`,
      );
      await this.refresh();
    } catch (error) {
      this.say(`refused: ${error.message}`, true);
      await this.refresh();
    }
  }

  /** Start one. */
  async run(bake) {
    this.say(`${bake.name}: starting ${(bake.argv ?? []).join(' ')}`);
    try {
      await this.post('/bake/run', { bake: bake.name });
    } catch (error) {
      this.say(`did not start: ${error.message}`, true);
      return;
    }
    this.open.add(bake.name);
    await this.refresh();
  }

  /**
   * Reload, once a run has finished well.
   *
   * The page is reloaded rather than an element swapped, because a baked asset
   * is not in the DOM: the corner pictures are fetched by `corners.ts` off a
   * ladder, and the two Texturelabs plates are named in a `url()` that the build
   * fingerprints. Neither is a thing this could reach into and change.
   */
  finished(bake) {
    this.say(`${bake.name}: baked, and the tree rebuilt — reloading to show it`);
    window.setTimeout(() => window.location.reload(), 400);
  }
}
