/**
 * The Editor's sixth surface: everything this session measured, as one document
 * to paste to an agent.
 *
 * WHAT IT IS FOR. The Measure surface answers "what did I just do to this one
 * element" and answered nothing at all about the twenty before it. The Annotation
 * box was the closest thing — but it is a transcript rather than a state: press it
 * twice on the same element and the document says two contradictory things about
 * it, and neither of them says which was the last. So the author's actual workflow
 * — resize a whole load of different elements, then hand the lot over — produced a
 * document nobody could act on. This is that document.
 *
 * ONE ENTRY PER ELEMENT, KEYED BY THE ELEMENT ITSELF. An element measured again
 * replaces its own entry, so twenty elements and two hundred gestures come out as
 * twenty blocks holding the LATEST state of each. Keyed by the node and not by a
 * selector, because a selector is a string this surface computes and two elements
 * on the page can legitimately fail to have one — `selectorFor` answers null, and
 * an entry per null would be one entry for all of them.
 *
 * IT HOLDS TWO LISTS AND THE DIFFERENCE MATTERS MORE THAN EITHER. `entries` are
 * measurements: nothing has been written and an agent is being asked to decide
 * what to change. `written` is what already reached a file, because the Measure
 * surface writes a Token when a scrubbed row has one behind it. Handing an agent
 * one flat list would get the written ones applied twice, and the second
 * application is arithmetic on a number that has already moved — silently wrong
 * rather than a no-op. `lib/changes.mjs` keeps them apart in the text and this
 * keeps them apart in the state.
 *
 * IT RENDERS NOTHING ITSELF. `lib/changes.mjs` is the format, it is pure, and it
 * is tested in node — same split as `lib/annotations.mjs` and the Annotation. What
 * is here is the store, the list the author reads, and the two buttons.
 */

import { headline, moved, report } from './lib/changes.mjs';

export class Changes {
  /**
   * @param {object} wiring
   * @param {(text: string, bad?: boolean) => void} wiring.say
   * @param {(n: number) => void} [wiring.counted]  told how many entries there are,
   *   for the badge in the panel's header
   */
  constructor({ say, counted }) {
    this.say = say;
    this.counted = counted ?? (() => {});
    /** @type {{ element: Element, measured: object, scaled: ({by: number}|null) }[]} */
    this.entries = [];
    /** @type {{ kind: string, what: string, value: string, file: string, where: string }[]} */
    this.written = [];
    /** Whether anything was ever left standing on the page while something else was
     *  measured, which is what makes the measurements compose. */
    this.kept = false;
    /** Set by `editor.js` once the Measure surface exists: putting the page back is
     *  that surface's to do, and this is where the button for it belongs — beside
     *  the list it empties. */
    this.putBack = () => {};
    this.panel = null;
  }

  mount(into) {
    this.panel = into;
    into.innerHTML = `
      <div data-editor-recording>
        <label><span>The Recording</span>
          <textarea data-editor-record rows="14" readonly
            placeholder="nothing measured yet — move or resize anything on the Measure surface and it lands here, one block per element, ready to paste to an agent"></textarea>
        </label>
        <div data-editor-record-buttons>
          <button type="button" data-editor-record-copy>copy</button>
          <button type="button" data-editor-record-back>put the page back</button>
          <button type="button" data-editor-record-forget>clear the Recording</button>
        </div>
      </div>
      <div data-editor-record-list></div>`;

    into.querySelector('[data-editor-record-copy]').addEventListener('click', () => void this.copy());
    into.querySelector('[data-editor-record-back]').addEventListener('click', () => this.putBack());
    into.querySelector('[data-editor-record-forget]').addEventListener('click', () => this.forgetAll());
    this.paint();
  }

  // -------------------------------------------------------------------------
  // The store
  // -------------------------------------------------------------------------

  at(element) {
    return this.entries.findIndex((entry) => entry.element === element);
  }

  /**
   * One element's latest measurement.
   *
   * A MEASUREMENT THAT MOVED NOTHING TAKES THE ENTRY OUT rather than going in as a
   * block saying nothing happened. Dragging something out and dragging it back is
   * the author deciding against it, and a document that reported it anyway would be
   * asking for a change nobody wants — which is the one way a log like this can be
   * actively harmful rather than merely long.
   *
   * Which of an axis's Tokens have ALREADY been written is not recorded here and is
   * not recorded anywhere: `lib/changes.mjs` derives it from `written` at render
   * time, and the note on `block()` is why — stored, it was a fact about the order
   * of two calls, and one extra `change` event out of a number box reversed them.
   */
  measured(element, measured, scaled = null) {
    const at = this.at(element);
    if (moved(measured).length === 0) {
      if (at !== -1) {
        this.entries.splice(at, 1);
        this.paint();
      }
      return;
    }
    const entry = { element, measured, scaled };
    if (at === -1) this.entries.push(entry);
    // In place, so the blocks stay in the order they were FIRST measured — which is
    // the order the author made them in, and the order the composing note at the
    // top of the document is about.
    else this.entries[at] = entry;
    this.paint();
  }

  /** Something that reached a file, with nothing on the page left to measure. */
  wrote(record) {
    // Replaced rather than appended where the same thing was written twice: two
    // lines saying one Token is 1.2rem and then 1.4rem read as two changes to make,
    // and only the second is true.
    const at = this.written.findIndex((one) => one.kind === record.kind && one.what === record.what);
    if (at === -1) this.written.push(record);
    else this.written[at] = record;
    this.paint();
  }

  /** One element off the Recording: it was put back, or what it measured has been
   *  superseded by an Override that says the same thing. */
  forget(element) {
    const at = this.at(element);
    if (at === -1) return;
    this.entries.splice(at, 1);
    this.paint();
  }

  /** Told that a change was left standing while something else was measured. */
  composed() {
    if (this.kept) return;
    this.kept = true;
    this.paint();
  }

  forgetAll() {
    const had = this.entries.length + this.written.length;
    this.entries = [];
    this.written = [];
    this.kept = false;
    this.paint();
    this.say(
      had === 0
        ? 'there was nothing in the Recording to clear'
        : 'the Recording is cleared — the page is untouched, so anything standing on it is still' +
            ' standing. “put the page back” is what takes those off.',
    );
  }

  // -------------------------------------------------------------------------
  // The document
  // -------------------------------------------------------------------------

  /** The whole session as text. The clock is read HERE and not in
   *  `lib/changes.mjs`, which is pure and has to stay testable. */
  text() {
    return report({
      entries: this.entries.map(({ measured, scaled }) => ({ measured, scaled })),
      written: this.written,
      kept: this.kept,
      at: new Date().toISOString().slice(0, 16).replace('T', ' '),
    });
  }

  async copy() {
    const text = this.text();
    if (this.entries.length === 0 && this.written.length === 0) {
      return this.say('there is nothing in the Recording to copy yet');
    }
    try {
      await navigator.clipboard.writeText(text);
      this.say(
        `the Recording is on the clipboard — ${this.entries.length} measured` +
          `${this.written.length > 0 ? `, ${this.written.length} already written` : ''}. Paste it to an agent.`,
      );
    } catch (error) {
      // Selecting it is the fallback rather than the failure, exactly as it is for
      // the Annotation: the clipboard needs a permission the page may not have, and
      // the text is right there.
      const box = this.panel?.querySelector('[data-editor-record]');
      box?.select();
      this.say(`could not reach the clipboard (${error.message}) — the text is selected, so copy it`, true);
    }
  }

  paint() {
    this.counted(this.entries.length);
    if (!this.panel) return;
    const box = this.panel.querySelector('[data-editor-record]');
    if (box) box.value = this.entries.length === 0 && this.written.length === 0 ? '' : this.text();

    const into = this.panel.querySelector('[data-editor-record-list]');
    if (!into) return;
    into.textContent = '';

    const head = document.createElement('p');
    head.dataset.editorNote = '';
    head.textContent =
      this.entries.length === 0
        ? 'Nothing measured yet. Every move, resize and scrub on the Measure surface lands here as one' +
          ' block per element — so a whole session of them is one document to paste, rather than one' +
          ' Annotation at a time.'
        : `${this.entries.length} element(s) measured` +
          `${this.written.length > 0 ? `, and ${this.written.length} value(s) already written` : ''}.` +
          ' The text above is the whole of it.';
    into.append(head);

    for (const entry of this.entries) {
      const row = document.createElement('div');
      row.dataset.editorRecordRow = '';
      const what = document.createElement('span');
      // The same sentence the block is titled with, so the row and the document
      // cannot disagree about what happened.
      what.textContent = headline(entry);
      // The row is one line and the sentence is longer than the panel, so the
      // whole of it is on the hover: the ellipsis lands mid-word on a name, and
      // "width +78px and te…" is not a summary of anything.
      what.title = headline(entry);
      const drop = document.createElement('button');
      drop.type = 'button';
      drop.dataset.editorRecordDrop = '';
      drop.textContent = 'drop';
      drop.title = 'take this one off the Recording. The page is not touched.';
      drop.addEventListener('click', () => {
        this.forget(entry.element);
        this.say('dropped it off the Recording — the page still has it, so put it back on Measure');
      });
      row.append(what, drop);
      // Derived exactly as the document derives it, so the row and the text cannot
      // disagree about which of an element's axes is already in a file.
      const landed = (entry.measured.tokens ?? []).filter((token) =>
        this.written.some((one) => one.kind === 'token' && one.what === token.token && one.value === token.wants),
      );
      if (landed.length > 0) {
        const said = document.createElement('small');
        said.dataset.editorRecordWritten = '';
        said.textContent = `${landed.map((token) => token.axis).join(', ')} already written`;
        row.append(said);
      }
      into.append(row);
    }

    for (const one of this.written) {
      const row = document.createElement('div');
      row.dataset.editorRecordWrote = one.kind;
      const what = document.createElement('span');
      what.textContent = `${one.what} = ${one.value}`;
      const where = document.createElement('small');
      where.textContent = one.file;
      row.append(what, where);
      into.append(row);
    }
  }
}
