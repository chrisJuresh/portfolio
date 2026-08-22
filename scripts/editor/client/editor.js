/**
 * The Editor's browser surface: click a piece of text on the real page, change
 * it, and the page follows.
 *
 * HOW A CLICK FINDS A CONTENT KEY, WHICH IS THE WHOLE TRICK. Nothing in a
 * Section's markup says which Content field it draws, and nothing should — an
 * attribute per string would be markup written for a tool, shipped to every
 * reader, in the one repository whose point is that a Section holds only itself.
 * So the binding is made by MATCHING: the server hands over every Content value,
 * and an element whose own text is exactly one of them is that field. Content is
 * the words on the page, so the words on the page are how it is found.
 *
 * The value matched against is the one the SERVED BUILD was made from (`built`),
 * not the current one — see the note in server.mjs. That is what makes an edit
 * survive a reload: the element still says what the build put there, and this
 * puts the current value over it.
 *
 * Two values that are the same string are left unbound rather than guessed at.
 * `Projects` is the Front Screen's link, its Cut Title, the Panel's masthead and
 * the Rail's spoken name, and picking one of those for the author would edit a
 * field they were not looking at. The panel's field list is how those are
 * reached, and it is also how anything the page speaks without drawing — an aria
 * label, an href — is reached at all.
 *
 * THE PANEL HOSTS THREE SURFACES AND OWNS ONE. Content is here, because it is
 * this file's binding-by-matching that reaches it. Tokens and the Timelines are
 * `client/tokens.js`, and the split is at a real seam rather than a tidy one: a
 * Token is addressed by a rule and a property and is bound to no element at all,
 * so it shares none of the field index everything in this file turns on. What is
 * shared is the panel, the report line and Publish, and those are passed in.
 */

import { Motion, Tokens } from './tokens.js';

const API = '/__editor';
/** Elements whose text is not words on the page. */
const SKIP = new Set(['SCRIPT', 'STYLE', 'TITLE', 'NOSCRIPT', 'TEMPLATE']);

const post = async (route, body) => {
  const response = await fetch(`${API}${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-editor': '1' },
    body: JSON.stringify(body),
  });
  const answer = await response.json().catch(() => ({ error: `${response.status}` }));
  if (!response.ok) throw new Error(answer.error ?? `${response.status}`);
  return answer;
};

/**
 * The whole of an element's text, when the element owns all of it.
 *
 * Null when the element has an element child, and that is the boundary of the
 * click surface rather than an oversight. A Rail item is `Eater Map` followed by
 * a `<span>` holding another field, so its text is two fields' worth; making the
 * item editable would let one edit rewrite both, and the safe alternative —
 * editing the text node under a contenteditable parent — cannot stop the author
 * deleting the sibling. Those fields are reached through the panel's field list,
 * and the panel says which they are.
 */
function ownText(element) {
  let text = '';
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) text += node.nodeValue;
    else if (node.nodeType === Node.ELEMENT_NODE) return null;
  }
  return text.trim() === '' ? null : text.trim();
}

/**
 * A Content value's leading and trailing space, kept aside.
 *
 * Markup adds whitespace around text, so an element's text has to be compared
 * trimmed — and the Rail's ` — no page yet` is a value whose leading space is
 * doing typographic work. Matching trimmed and putting the edges back on the way
 * out is what lets that field be edited without the space being silently eaten.
 */
function edges(value) {
  const [, before, , after] = /^(\s*)([\s\S]*?)(\s*)$/.exec(value);
  return { before, after };
}

class Editor {
  constructor(state) {
    this.state = state;
    /** What this session has written — a Content field or a Token — for the
     *  panel's count. Both, because the count is a count of unpublished work. */
    this.edits = new Set();
    /** element -> { section, key } */
    this.bound = new Map();
    /** `${section} ${key}` -> every element drawing it. A Section may draw one
     *  Content string in more than one place — the Rail says ` — no page yet`
     *  once per unbuilt project — and an edit has to reach all of them, or the
     *  page half-updates and reads as a bug in the write. */
    this.byKey = new Map();
    this.unfound = [];
    this.editing = null;
    this.panel = null;
  }

  field(section, key) {
    return this.state.sections
      .find((entry) => entry.section === section)
      ?.fields.find((entry) => entry.key === key);
  }

  /** Walk each Section on the page and bind every element that is one field. */
  bind() {
    this.bound.clear();
    this.byKey.clear();
    this.unfound = [];

    for (const { section, fields } of this.state.sections) {
      const root = document.querySelector(`[data-section="${section}"]`);
      if (!root) continue;

      // Only the values that appear once in this Section can be bound by text.
      const seen = new Map();
      for (const field of fields) {
        if (field.built === null) continue;
        const text = field.built.trim();
        seen.set(text, (seen.get(text) ?? 0) + 1);
      }
      const unique = new Map();
      for (const field of fields) {
        if (field.built !== null && seen.get(field.built.trim()) === 1) {
          unique.set(field.built.trim(), field);
        }
      }

      const found = new Set();
      for (const element of root.querySelectorAll('*')) {
        if (SKIP.has(element.tagName) || element.closest('[data-editor]')) continue;
        const text = ownText(element);
        if (text === null) continue;
        const field = unique.get(text);
        if (!field) continue;
        found.add(field.key);
        const id = `${section} ${field.key}`;
        this.bound.set(element, { section, key: field.key });
        this.byKey.set(id, (this.byKey.get(id) ?? []).concat(element));
        element.dataset.editorBound = '';
        // Which field this element draws. Nothing on the page needs these; they
        // are how the smoke Check names an element, and how a `$0.dataset` in
        // devtools answers "what am I looking at". Three attributes and not one
        // composite: a field key holds dots of its own, so anything handed
        // `front-screen.work.entries.0.org` has to guess where the Section ends.
        element.dataset.editorKey = `${section}.${field.key}`;
        element.dataset.editorSection = section;
        element.dataset.editorField = field.key;
        // The build's words are on the page; the current ones are what to show.
        if (field.value !== field.built) element.textContent = field.value;
      }

      for (const field of fields) {
        if (!found.has(field.key)) this.unfound.push(`${section}.${field.key}`);
      }
    }
  }

  /** Turn one bound element into a text box, in place. */
  edit(element) {
    if (this.editing) this.stop(true);
    const at = this.bound.get(element);
    if (!at) return;

    const before = element.textContent;
    element.contentEditable = 'plaintext-only';
    element.spellcheck = true;
    element.dataset.editorEditing = '';
    element.focus();
    getSelection()?.selectAllChildren(element);
    this.editing = { element, at, before };
    this.say(`editing ${at.section}.${at.key}`);
  }

  /** Finish editing. `revert` puts back what was there and writes nothing. */
  async stop(revert) {
    const editing = this.editing;
    if (!editing) return;
    this.editing = null;

    const { element, at, before } = editing;
    element.removeAttribute('contenteditable');
    delete element.dataset.editorEditing;

    // Collapsed, and this is not a convenience: an element's textContent carries
    // the MARKUP's whitespace, so a heading authored over two source lines reads
    // back with a newline in it that the author never typed — and the boundary
    // refuses control characters, so without this an ordinary edit of an
    // ordinary element would be refused. Joining a pasted paragraph is the same
    // rule applied to the same character, and it is the right answer for the
    // same reason: a Content string is one run of words, and a paragraph break
    // is a new array entry.
    const typed = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
    const held = edges(this.field(at.section, at.key)?.value ?? '');
    const wanted = held.before + typed + held.after;
    if (revert || wanted === before) {
      element.textContent = before;
      return;
    }

    try {
      await this.write(at.section, at.key, wanted);
    } catch (error) {
      element.textContent = before;
      this.say(`refused: ${error.message}`, true);
    }
  }

  /** The one write. Both the page and the panel go through here. */
  async write(section, key, value) {
    const answer = await post('/content', { section, key, value });
    const field = this.field(section, key);
    if (field) field.value = answer.value;
    const input = this.panel?.querySelector(`[data-editor-input="${section} ${key}"]`);
    if (input && input.value !== answer.value) input.value = answer.value;
    for (const element of this.byKey.get(`${section} ${key}`) ?? []) {
      if (element.textContent !== answer.value) element.textContent = answer.value;
    }
    this.edits.add(`${section}.${key}`);
    this.count();
    this.say(answer.changed ? `wrote ${section}.${key} to ${answer.file}` : `${section}.${key} was already that`);
    return answer;
  }

  // -------------------------------------------------------------------------
  // The panel
  // -------------------------------------------------------------------------

  mountPanel() {
    const panel = document.createElement('aside');
    panel.dataset.editor = '';
    panel.innerHTML = `
      <header>
        <strong>Editor</strong>
        <span data-editor-count></span>
        <button type="button" data-editor-fold aria-expanded="true">fold</button>
      </header>
      <div data-editor-body>
        <nav data-editor-tabs>
          <button type="button" data-editor-tab="content" aria-pressed="true">Content</button>
          <button type="button" data-editor-tab="tokens" aria-pressed="false">Tokens</button>
          <button type="button" data-editor-tab="motion" aria-pressed="false">Motion</button>
        </nav>
        <div data-editor-pane="content"><div data-editor-fields></div></div>
        <div data-editor-pane="tokens" hidden></div>
        <div data-editor-pane="motion" hidden></div>
        <div data-editor-publish>
          <input type="text" data-editor-message placeholder="what changed (optional)" />
          <button type="button" data-editor-go>Publish</button>
        </div>
        <p data-editor-said>click any text on the page to change it</p>
      </div>`;
    document.body.append(panel);
    this.panel = panel;

    const fields = panel.querySelector('[data-editor-fields]');
    for (const { section, fields: list } of this.state.sections) {
      const group = document.createElement('details');
      group.innerHTML = `<summary>${section} <small>${list.length}</small></summary>`;
      for (const field of list) {
        const row = document.createElement('label');
        const id = `${section} ${field.key}`;
        row.innerHTML = `<span>${field.key}</span>`;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = field.value;
        input.dataset.editorInput = id;
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') input.blur();
          if (event.key === 'Escape') {
            input.value = this.field(section, field.key)?.value ?? field.value;
            input.blur();
          }
        });
        input.addEventListener('change', async () => {
          try {
            await this.write(section, field.key, input.value);
          } catch (error) {
            input.value = this.field(section, field.key)?.value ?? field.value;
            this.say(`refused: ${error.message}`, true);
          }
        });
        row.append(input);
        group.append(row);
      }
      fields.append(group);
    }

    // Tokens and the Timelines. Handed the panel's own report line and its edit
    // count rather than growing their own, so "3 edited" and "refused: …" mean
    // the same thing whichever surface produced them.
    this.tokens = new Tokens({
      sections: this.state.tokens ?? [],
      post,
      say: (text, bad) => this.say(text, bad),
      edited: (id) => {
        this.edits.add(id);
        this.count();
      },
    });
    this.tokens.mount(panel.querySelector('[data-editor-pane="tokens"]'));

    this.motion = new Motion({ say: (text, bad) => this.say(text, bad) });
    this.motion.mount(panel.querySelector('[data-editor-pane="motion"]'));

    for (const tab of panel.querySelectorAll('[data-editor-tab]')) {
      tab.addEventListener('click', () => this.show(tab.dataset.editorTab));
    }

    panel.querySelector('[data-editor-fold]').addEventListener('click', (event) => {
      const open = panel.toggleAttribute('data-editor-folded');
      event.currentTarget.setAttribute('aria-expanded', String(!open));
    });
    panel.querySelector('[data-editor-go]').addEventListener('click', () => this.publish());

    this.count();
    if (this.unfound.length > 0) {
      this.say(
        `${this.unfound.length} field(s) are not clickable on this page — use the list above: ${this.unfound.join(', ')}`,
      );
    }
  }

  /** Which surface is in front. One at a time, because three at once is the wall
   *  this panel exists to not be. */
  show(which) {
    for (const tab of this.panel?.querySelectorAll('[data-editor-tab]') ?? []) {
      tab.setAttribute('aria-pressed', String(tab.dataset.editorTab === which));
    }
    for (const pane of this.panel?.querySelectorAll('[data-editor-pane]') ?? []) {
      pane.toggleAttribute('hidden', pane.dataset.editorPane !== which);
    }
    if (which === 'motion') this.motion?.refresh();
  }

  count() {
    const badge = this.panel?.querySelector('[data-editor-count]');
    if (badge) badge.textContent = this.edits.size === 0 ? '' : `${this.edits.size} edited`;
  }

  say(text, bad = false) {
    const said = this.panel?.querySelector('[data-editor-said]');
    if (!said) return;
    said.textContent = text;
    said.toggleAttribute('data-editor-bad', bad);
  }

  async publish() {
    const button = this.panel.querySelector('[data-editor-go]');
    const message = this.panel.querySelector('[data-editor-message]').value.trim();
    button.disabled = true;
    this.say('publishing — the Checks run on the commit, so this takes about a minute');
    try {
      const done = await post('/publish', message === '' ? {} : { message });
      const left = done.left.length === 0 ? '' : `; left alone: ${done.left.join(', ')}`;
      this.say(
        done.pushed
          ? `published ${done.commit} on ${done.branch} — ${done.files.length} file(s)${left}`
          : `committed ${done.commit} on ${done.branch} but the push failed: ${done.why}${left}`,
        !done.pushed,
      );
      if (done.pushed) {
        this.edits.clear();
        this.count();
      }
    } catch (error) {
      this.say(`did not publish: ${error.message}`, true);
    } finally {
      button.disabled = false;
    }
  }

  // -------------------------------------------------------------------------
  // Listening
  // -------------------------------------------------------------------------

  listen() {
    // Capture, so a bound <a> is edited rather than followed, and a bound word
    // inside the theme switch does not throw it.
    document.addEventListener(
      'click',
      (event) => {
        if (event.target.closest?.('[data-editor]')) return;
        const element = event.target.closest?.('[data-editor-bound]');
        if (!element) return;
        if (this.editing?.element === element) return;
        event.preventDefault();
        event.stopPropagation();
        this.edit(element);
      },
      true,
    );

    document.addEventListener(
      'keydown',
      (event) => {
        if (!this.editing) return;
        if (event.key === 'Enter') {
          event.preventDefault();
          void this.stop(false);
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          void this.stop(true);
        }
      },
      true,
    );

    document.addEventListener('focusout', (event) => {
      if (this.editing?.element === event.target) void this.stop(false);
    });
  }
}

const state = await fetch(`${API}/state`).then((response) => response.json());
const editor = new Editor(state);
editor.bind();
editor.mountPanel();
editor.listen();
