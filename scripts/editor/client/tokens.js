/**
 * The Editor's second surface: a control per Token, and a scrub per Timeline.
 *
 * WHY THIS IS A SECOND FILE. `client/editor.js` says of itself that it is one
 * object and not four modules, and that the calculus would change if the Editor
 * grew a second surface. It has (#144). The seams that file lists all share one
 * piece of state — the field index that binds an element is the index the panel
 * renders and the index a write updates — and none of that is shared with
 * anything here: a Token is addressed by a rule and a property rather than by the
 * words on the page, and it is not bound to an element at all. So this splits at
 * the seam that is actually a seam, and it costs one entry in the server's CLIENT
 * map rather than a bundler, because the surface is already a module.
 *
 * IT IMPORTS THE BOUNDARY. `lib/tokens.mjs` has no node imports, so the browser
 * can have it, and the surface decides what control a Token asks for with the
 * same `control()` the tests are written against — and writes a number back with
 * the same `amount()`. The alternative was two spellings of one rule, one of
 * which nothing tests.
 *
 * HOW A DRAG SHOWS ON THE PAGE, which is the one thing here worth reading twice.
 * A Token lives in a stylesheet the served build BAKED, so writing the file does
 * not move the page — unlike Content, where the words are in the DOM and can be
 * replaced. So this keeps one stylesheet of its own, holding one declaration per
 * Token whose value differs from what the session started with, written with the
 * SAME SELECTOR the declaration came from. Same selector means same specificity,
 * and this sheet is later in the document, so it wins that tie — and only that
 * tie. A Token declared under `:root[data-theme='dark']` still outranks the one
 * on the Section's own root, which is right: those are two Tokens with two
 * controls, and dragging the light one must not move the dark paper.
 *
 * That sheet is also what "live" means, and it stays after the write lands: the
 * bundled stylesheet still holds the old value until the next build.
 */

import { amount, colour, control } from './lib/tokens.mjs';

/** Where a Section's Tokens are declared, so a preview can name it. */
const previewSheet = () => {
  let style = document.querySelector('style[data-editor-preview]');
  if (!style) {
    style = document.createElement('style');
    style.dataset.editorPreview = '';
    style.dataset.editor = '';
    // Appended to the BODY, so it is later in the document than the bundled
    // stylesheet in the head and wins a specificity tie against it.
    document.body.append(style);
  }
  return style;
};

const short = (property, section) =>
  property.startsWith(`--${section}-`) ? property.slice(section.length + 3) : property;

export class Tokens {
  /**
   * @param {object} wiring
   * @param {{ section: string, tokens: object[] }[]} wiring.sections  the state's `tokens`
   * @param {(route: string, body: object) => Promise<any>} wiring.post
   * @param {(text: string, bad?: boolean) => void} wiring.say
   * @param {(id: string) => void} wiring.edited  told what this session has written
   */
  constructor({ sections, post, say, edited }) {
    this.sections = sections;
    this.post = post;
    this.say = say;
    this.edited = edited;
    /** `${section} ${key}` -> the value this surface is showing. */
    this.live = new Map();
    /** The row for each Token, so a write can update the one it came from. */
    this.rows = new Map();
  }

  /** Every Token, grouped by Section and then by the comment above it. */
  mount(pane) {
    for (const { section, tokens } of this.sections) {
      const holder = document.createElement('details');
      holder.dataset.editorTokens = section;
      holder.innerHTML = `<summary>${section} <small>${tokens.length}</small></summary>`;

      // The file says where a group starts and never where it ends, so a run of
      // Tokens belongs to the last heading named above it — and a new rule starts
      // a new run whatever the last heading was.
      let group = null;
      let into = null;
      for (const token of tokens) {
        // The rule's number is the first half of the key, and a new rule starts a
        // new run whatever heading was last named: the dark paper's declarations
        // are not a continuation of the light paper's last group.
        const id = `${token.key.split(':')[0]} ${token.group}`;
        if (id !== group) {
          group = id;
          into = document.createElement('details');
          into.dataset.editorGroup = '';
          const summary = document.createElement('summary');
          summary.textContent = token.group ?? 'the Section’s own root';
          // A rule that is not the Section's own root is named, because which
          // paper a Token belongs to is the whole of what tells two of them apart.
          if (token.selector !== `.${section}`) {
            const where = document.createElement('small');
            where.textContent = token.selector;
            summary.append(' ', where);
          }
          into.append(summary);
          // The comment above the group, or — for a group the file did not head —
          // the one above the rule. Those paragraphs are what say what a Token
          // does, and they are the reason a control needs no label written for it.
          const said = token.note ?? (token.group === null ? token.ruleNote : null);
          if (said && said !== token.group) {
            const note = document.createElement('p');
            note.dataset.editorNote = '';
            note.textContent = said;
            into.append(note);
          }
          holder.append(into);
        }
        into.append(this.row(section, token));
      }
      pane.append(holder);
    }
  }

  /**
   * One Token's control.
   *
   * A number is dragged and typed; a colour is picked, with its alpha on a
   * slider of its own; and everything else is a text box, which is ADR 0004
   * rather than a shortcut — a `clamp()`, a `calc()` and a `color-mix()` are
   * RELATIONSHIPS, and dragging one end of one destroys it rather than edits it.
   */
  row(section, token) {
    const id = `${section} ${token.key}`;
    const shape = control(token.was);

    const row = document.createElement('div');
    row.dataset.editorToken = id;
    row.dataset.editorKind = shape.kind;

    const label = document.createElement('span');
    label.textContent = short(token.property, section);
    label.title = `${token.property} on ${token.selector}${token.note ? ` — ${token.note}` : ''}`;
    row.append(label);

    const back = document.createElement('button');
    back.type = 'button';
    back.dataset.editorWas = id;
    back.title = `back to ${token.was}`;
    back.textContent = '↺';
    back.addEventListener('click', () => void this.set(section, token, token.was, true));

    if (shape.kind === 'number') {
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = String(shape.min);
      slider.max = String(shape.max);
      slider.step = String(shape.step);
      const exact = document.createElement('input');
      exact.type = 'number';
      exact.step = String(shape.step);
      exact.dataset.editorInput = id;

      // The slider previews on every move and writes on release; the number box
      // writes when it is committed. Dragging must not post once a frame.
      slider.addEventListener('input', () => {
        exact.value = slider.value;
        this.preview(section, token, amount(Number(slider.value), shape.unit, shape.step));
      });
      slider.addEventListener('change', () =>
        void this.set(section, token, amount(Number(slider.value), shape.unit, shape.step)),
      );
      exact.addEventListener('change', () => {
        slider.value = exact.value;
        void this.set(section, token, amount(Number(exact.value), shape.unit, shape.step));
      });

      const unit = document.createElement('small');
      unit.textContent = shape.unit || '×';
      row.append(slider, exact, unit, back);
      this.rows.set(id, { token, shape, write: (value) => {
        const read = control(value);
        if (read.kind !== 'number') return;
        slider.value = String(read.number);
        exact.value = String(read.number);
      } });
      this.rows.get(id).write(token.value);
      return row;
    }

    if (shape.kind === 'colour') {
      const swatch = document.createElement('input');
      swatch.type = 'color';
      swatch.dataset.editorInput = id;
      const alpha = document.createElement('input');
      alpha.type = 'range';
      alpha.min = '0';
      alpha.max = '1';
      alpha.step = '0.01';
      const seen = document.createElement('small');

      const compose = () => colour(swatch.value, Number(alpha.value));
      const show = (value) => {
        seen.textContent = value;
      };
      swatch.addEventListener('input', () => {
        show(compose());
        this.preview(section, token, compose());
      });
      swatch.addEventListener('change', () => void this.set(section, token, compose()));
      alpha.addEventListener('input', () => {
        show(compose());
        this.preview(section, token, compose());
      });
      alpha.addEventListener('change', () => void this.set(section, token, compose()));

      row.append(swatch, alpha, seen, back);
      this.rows.set(id, { token, shape, write: (value) => {
        const read = control(value);
        if (read.kind !== 'colour') return;
        swatch.value = read.hex;
        alpha.value = String(read.alpha);
        show(value);
      } });
      this.rows.get(id).write(token.value);
      return row;
    }

    const box = document.createElement('input');
    box.type = 'text';
    box.dataset.editorInput = id;
    box.addEventListener('change', () => void this.set(section, token, box.value));
    box.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') box.blur();
      if (event.key === 'Escape') {
        box.value = this.live.get(id) ?? token.value;
        box.blur();
      }
    });
    row.append(box, back);
    this.rows.set(id, { token, shape, write: (value) => {
      box.value = value;
    } });
    this.rows.get(id).write(token.value);
    return row;
  }

  /**
   * Show a value on the page without writing it.
   *
   * One declaration per Token that has moved, in this surface's own stylesheet,
   * under the selector the declaration came from. A Token back at what it was
   * loses its declaration rather than getting one that repeats the build — so
   * the sheet is a list of exactly what this session has changed, which is also
   * what makes it readable in devtools.
   */
  preview(section, token, value) {
    const id = `${section} ${token.key}`;
    if (value === token.was) this.live.delete(id);
    else this.live.set(id, value);

    const by = new Map();
    for (const [at, held] of this.live) {
      const of = this.rows.get(at)?.token;
      if (!of) continue;
      by.set(of.selector, (by.get(of.selector) ?? []).concat(`${of.property}: ${held};`));
    }
    previewSheet().textContent = [...by]
      .map(([selector, declarations]) => `${selector} { ${declarations.join(' ')} }`)
      .join('\n');
  }

  /** The one write. Everything above ends up here. */
  async set(section, token, value, back = false) {
    const id = `${section} ${token.key}`;
    const showing = this.live.get(id) ?? token.value;
    this.preview(section, token, value);
    try {
      const answer = await this.post('/tokens', { section, key: token.key, value });
      token.value = answer.value;
      this.rows.get(id)?.write(answer.value);
      // The KEY and not the property: the same property declared on two rules is
      // two Tokens, and counting them as one would under-report the session.
      this.edited(`${section}.${token.key}`);
      const row = document.querySelector(`[data-editor-token="${id}"]`);
      row?.toggleAttribute('data-editor-moved', answer.value !== token.was);
      this.say(
        answer.changed
          ? `${back ? 'put back' : 'wrote'} ${token.property} = ${answer.value} in ${answer.file}`
          : `${token.property} was already ${answer.value}`,
      );
    } catch (error) {
      // The page goes back to what it was showing, because the file did.
      this.preview(section, token, showing);
      this.rows.get(id)?.write(showing);
      this.say(`refused: ${error.message}`, true);
    }
  }
}

/**
 * The Timelines, scrubbable.
 *
 * This is the other thing ADR 0003's named seekable Timeline was for, and the
 * reason it is in this file rather than beside the Content surface: a duration
 * and an easing are Tokens, so tuning motion is dragging a control here and then
 * scrubbing to the moment the change shows.
 *
 * `hold()` FIRST, ALWAYS. A scrubbed Timeline is recomputed from the scroll
 * position on the next tick, so a bare seek survives about one frame —
 * `src/kernel/NOTES.md` records the wrong diagnosis that cost. So the scrub
 * holds before it seeks, and holding is the pause: the playhead stays where it
 * was put until the author gives the scroll back.
 *
 * A Section registers its Timeline when it MOUNTS, which happens as the reader
 * approaches it, so the list is not complete at load and cannot be. It is built
 * from `window.portfolio.timelines` and rebuilt whenever a Section says it has
 * mounted, which is the event the Kernel's loader already dispatches.
 */
export class Motion {
  constructor({ say }) {
    this.say = say;
    this.held = false;
    this.pane = null;
  }

  get handles() {
    return window.portfolio;
  }

  mount(pane) {
    this.pane = pane;
    pane.innerHTML = `
      <div data-editor-hold>
        <button type="button" data-editor-holding aria-pressed="false">hold</button>
        <small>holding stops the scroll driving every Timeline, so a moment stays put</small>
      </div>
      <div data-editor-timelines></div>`;

    pane.querySelector('[data-editor-holding]').addEventListener('click', () => this.hold(!this.held));
    // A Section mounts on approach, so the list grows as the author scrolls — and
    // while nothing is held, the scroll is where each playhead comes from, so the
    // readouts follow it rather than needing a button of their own.
    document.addEventListener('section:mounted', () => this.refresh());
    document.addEventListener('scroll', () => this.read(), { passive: true });
    this.refresh();
  }

  hold(on) {
    const handles = this.handles;
    if (!handles?.hold || !handles.release) {
      this.say('the Kernel’s hold() is not on this page — nothing to hold', true);
      return;
    }
    this.held = on;
    if (on) handles.hold();
    else handles.release();
    const button = this.pane?.querySelector('[data-editor-holding]');
    if (button) {
      button.textContent = on ? 'release' : 'hold';
      button.setAttribute('aria-pressed', String(on));
    }
    this.pane?.toggleAttribute('data-editor-held', on);
    this.say(on ? 'held — the scroll no longer drives a Timeline' : 'released — the scroll drives them again');
  }

  /** One scrub per registered Timeline, rebuilt from the register. */
  refresh() {
    const into = this.pane?.querySelector('[data-editor-timelines]');
    if (!into) return;
    const timelines = this.handles?.timelines ?? new Map();

    const wanted = [...timelines.keys()].sort();
    if (wanted.join(',') === (this.showing ?? []).join(',')) return this.read();
    this.showing = wanted;
    into.textContent = '';

    if (wanted.length === 0) {
      const none = document.createElement('p');
      none.dataset.editorNote = '';
      none.textContent =
        'no Timeline is registered yet — a Section registers its own as the reader approaches it, so scroll to one';
      into.append(none);
      return;
    }

    for (const name of wanted) {
      const row = document.createElement('div');
      row.dataset.editorTimeline = name;
      const label = document.createElement('span');
      label.textContent = name;
      const scrub = document.createElement('input');
      scrub.type = 'range';
      scrub.min = '0';
      scrub.max = '1';
      scrub.step = '0.001';
      scrub.dataset.editorScrub = name;
      const at = document.createElement('small');
      scrub.addEventListener('input', () => {
        // Holding is what makes the seek survive the next tick, so it is not a
        // separate thing the author has to remember to do first.
        if (!this.held) this.hold(true);
        const timeline = this.handles?.timelines?.get(name);
        timeline?.progress(Number(scrub.value));
        at.textContent = Number(scrub.value).toFixed(3);
      });
      row.append(label, scrub, at);
      into.append(row);
    }
    this.read();
  }

  /** Put each scrub where its Timeline actually is. */
  read() {
    if (this.held) return;
    for (const scrub of this.pane?.querySelectorAll('[data-editor-scrub]') ?? []) {
      const timeline = this.handles?.timelines?.get(scrub.dataset.editorScrub);
      if (!timeline) continue;
      const at = timeline.progress();
      scrub.value = String(at);
      const said = scrub.nextElementSibling;
      if (said) said.textContent = at.toFixed(3);
    }
  }
}
