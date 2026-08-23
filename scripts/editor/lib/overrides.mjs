/**
 * The Editor's third write boundary: given the Overrides file and one element's
 * geometry, produce the file's bytes.
 *
 * WHY THERE IS A THIRD ONE AT ALL. ADR 0004 gives the Editor Content and Tokens
 * and says in the same breath what happens to a change neither can express: it
 * becomes an Annotation, and optionally an OVERRIDE — a value written OUTSIDE a
 * Section's composition so the page looks right now, while the composition is
 * corrected later (CONTEXT.md). Outside is the whole of it. This never touches a
 * Section's folder, so the rule that a bug in the Editor cannot corrupt a
 * composition is unchanged: the worst this can damage is a file whose only
 * author it is.
 *
 * AND IT IS THE OPPOSITE OF THE OTHER TWO IN THE ONE WAY THAT MATTERS. Content
 * and Tokens are AUTHORED files carrying comments, formatting and judgement, so
 * those boundaries replace one span and never re-serialise. This file is
 * GENERATED, so this one always re-serialises — and what pays for that is the
 * ROUND TRIP: `parse` accepts only the bytes `render` would have written, so a
 * file somebody edited by hand stops the tool instead of being clobbered by it.
 *
 * EVERY DECLARATION CARRIES `!important`, which is the one place this disagrees
 * with `tokens.mjs` — that boundary refuses `!important` because a Token's value
 * belongs to a composition. An Override's job is the reverse: to outrank the rule
 * it argues with, from outside it, until an agent folds it in. Saying so at the
 * bytes is also what makes this file greppable as debt.
 *
 * WHAT IT WILL WRITE IS THREE PROPERTIES. Moving and resizing is what the Editor
 * cannot express (#145), so `translate`, `width` and `height` are the whole list
 * and anything else is refused by name. `translate` rather than `transform`
 * deliberately: it is a property of its own that composes with whatever GSAP
 * writes into `transform`, so an Override cannot freeze a Timeline.
 *
 * `scripts/editor/NOTES.md` is the rest of the reasoning.
 */

import { Refused } from './content.mjs';
import { asValue } from './tokens.mjs';

/**
 * The only properties an Override may set. Move and resize, and nothing else.
 *
 * `display` is here for one reason and takes one value: `translate`, `width` and
 * `height` do not apply to a non-replaced INLINE box, so a `<span>` or an `<a>` —
 * most of the text on this page — could otherwise be dragged with no effect
 * whatever, which fails the first thing #145 asks for. The surface promotes such
 * an element to `inline-block` to measure it and says so in the Annotation, and an
 * Override has to carry that promotion or the page would not look the way it was
 * measured. Any other value is refused by name: this is the one box-model change
 * the tool is allowed to make, not an opening.
 */
export const PROPERTIES = ['display', 'translate', 'width', 'height'];

/** The only value `display` may be given, and why is above. */
export const DISPLAY = 'inline-block';

/** How many Overrides the file may hold. An Override is debt taken knowingly,
 *  and a hundred of them is a second composition nobody decided on. */
export const LONGEST_FILE = 64;

/** Room for the longest name a Section part can be given, and its measurement. */
const LONGEST_LINE = 200;
const LONGEST_NOTE = 12;
const LONGEST_SELECTOR = 300;

/**
 * The file's preamble, byte for byte.
 *
 * It is part of the format rather than decoration: `parse` requires it, so a
 * stylesheet that is not this one cannot be read as Overrides even by accident,
 * and the first thing anybody opening the file reads is that the Editor owns it.
 */
export const HEADER = `/* Overrides — the Editor wrote every line of this file, and nothing else may.
 *
 * An Override is a value the Editor put OUTSIDE a Section's composition so the
 * page looks right now, pending an agent folding it in properly (CONTEXT.md).
 * Every record below is therefore debt: it is here because a change the Editor
 * could not express was wanted anyway, and the Annotation it came with says what
 * was measured. The Editor lists them all, so none of them is invisible.
 *
 * One record is one element: a comment naming it in the glossary's vocabulary,
 * and a rule setting the geometry that was dragged. The declarations are
 * important! on purpose — an Override's job is to outrank the rule it argues
 * with, and saying so here is what makes this file greppable as debt.
 *
 * DO NOT EDIT IT BY HAND. Every write re-serialises the whole file, and refuses
 * bytes that are not exactly what it would have written — so a hand edit does
 * not get clobbered, it stops the tool. Fold a record into the Section it names
 * and let the Editor discard it.
 */`;

/** What the file looks like holding nothing. */
export const EMPTY = HEADER + '\n';

/**
 * One compound selector: a tag, an id, classes, and a position among siblings.
 *
 * Deliberately far narrower than CSS. An Override's selector is built by the
 * Editor's own surface out of what it found on the page, so this is the shape of
 * that and nothing else — no attribute selector, no pseudo-class, no comma, and
 * only the two combinators a path needs. What the narrowness buys is that there is
 * no selector this boundary will accept which could match something the author
 * was not looking at, and nothing that could carry a brace or a comment through.
 */
const SIMPLE = /^(?:[a-z][a-z0-9]*)?(?:#[A-Za-z][A-Za-z0-9_-]*)?(?:\.[A-Za-z_-][A-Za-z0-9_-]*)*(?::nth-of-type\(\d+\))?$/;

/**
 * The child combinator, which is not a luxury.
 *
 * The Projects Panel's Plinth holds a live CLONE of the Frame, classes and all,
 * so `.projects-panel__stage .projects-panel__frame` matches two elements and no
 * descendant-only chain upwards ever separates them. The composition's own
 * stylesheet writes `.projects-panel__stage > .projects-panel__frame` for exactly
 * that reason, and so does this.
 */
const CHILD = '>';

/** The unprintable characters a comment or a selector may not carry. */
function unprintable(text) {
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return ch;
  }
  return null;
}

function line(what, text) {
  if (typeof text !== 'string') {
    throw new Refused(`${what}: one line of words, and this is ${text === null ? 'null' : `a ${typeof text}`}`);
  }
  const trimmed = text.trim();
  if (trimmed === '') throw new Refused(`${what}: empty — a record says what it is or it does not go in`);
  const bad = unprintable(trimmed);
  if (bad) {
    throw new Refused(
      `${what}: holds the control character U+${bad.codePointAt(0).toString(16).padStart(4, '0').toUpperCase()}` +
        ' — a record’s comment is lines of words',
    );
  }
  if (trimmed.length > LONGEST_LINE) {
    throw new Refused(`${what}: ${trimmed.length} characters, and the longest a line may be is ${LONGEST_LINE}`);
  }
  // Both markers, because either one turns the rest of the record into something
  // else: `*/` closes the comment and puts a selector where a sentence was, and
  // `/*` opens one this file never closes.
  if (trimmed.includes('*/')) throw new Refused(`${what}: "*/" would close the comment it is inside — refused`);
  if (trimmed.includes('/*')) throw new Refused(`${what}: "/*" would open a comment inside one — refused`);
  return trimmed;
}

/** An Override's name: how the surface said it in the glossary's vocabulary. */
const asName = (name) => line('the name of an Override', name);

/** The measurement under the name, as lines. */
function asNote(note) {
  if (!Array.isArray(note)) {
    throw new Refused(`an Override’s note is a list of lines, and this is ${note === null ? 'null' : `a ${typeof note}`}`);
  }
  if (note.length > LONGEST_NOTE) {
    throw new Refused(`an Override’s note may run to ${LONGEST_NOTE} lines, and this one is ${note.length}`);
  }
  return note.map((text, at) => line(`line ${at + 1} of an Override’s note`, text));
}

/**
 * `selector`, if it is a selector this boundary will write.
 *
 * It has to start at `:root`, and that is not decoration either: an Override
 * reaches into a composition from outside it, and the extra specificity is what
 * makes it do so on purpose rather than by luck of source order.
 */
export function asSelector(selector) {
  if (typeof selector !== 'string') {
    throw new Refused(`an Override’s selector is a string, and this is ${selector === null ? 'null' : `a ${typeof selector}`}`);
  }
  const text = selector.trim();
  if (text.length > LONGEST_SELECTOR) {
    throw new Refused(`that selector is ${text.length} characters, and the longest one may be is ${LONGEST_SELECTOR}`);
  }
  const parts = text.split(' ');
  if (parts.shift() !== ':root') {
    throw new Refused(
      `"${text}" is not an Override’s selector — one starts at :root, which is what makes it outrank the` +
        ' composition it is reaching into',
    );
  }
  if (parts.length === 0) {
    throw new Refused('an Override names an element, and ":root" on its own is the whole document');
  }
  for (const [at, part] of parts.entries()) {
    if (part === CHILD) {
      // Never first, because `:root > x` would be a child of the document; never
      // last, because it would combine with nothing; never twice running.
      if (at === 0 || at === parts.length - 1 || parts[at - 1] === CHILD) {
        throw new Refused(`"${text}" puts a ">" where there is nothing for it to join — refused`);
      }
      continue;
    }
    if (part === '' || !SIMPLE.test(part)) {
      throw new Refused(
        `"${part}" in "${text}" is not something the Editor builds — a selector here is a tag, an id, classes` +
          ' and a position, joined by single spaces or by ">", and nothing else',
      );
    }
  }
  return text;
}

/**
 * The declarations to write, in this module's own order.
 *
 * The order is fixed here rather than taken from the request so that two writes
 * asking for the same geometry produce the same bytes — which is what the round
 * trip is checked against, and what keeps a re-write out of the diff.
 */
function asDeclarations(declarations) {
  if (declarations === null || typeof declarations !== 'object' || Array.isArray(declarations)) {
    throw new Refused(
      `an Override’s declarations are a property-to-value object, and this is ${
        declarations === undefined ? 'nothing at all' : `a ${Array.isArray(declarations) ? 'list' : typeof declarations}`
      }`,
    );
  }
  for (const property of Object.keys(declarations)) {
    if (!PROPERTIES.includes(property)) {
      throw new Refused(
        `"${property}" is not something an Override sets — moving and resizing is translate, width and height,` +
          ' and anything else is a change to the composition rather than a measurement of one',
      );
    }
  }
  return PROPERTIES.filter((property) => property in declarations).map((property) => {
    const value = asValue(property, declarations[property]);
    if (property === 'display' && value !== DISPLAY) {
      throw new Refused(
        `an Override may only set display to ${DISPLAY}, and this asks for "${value}" — that one value is here` +
          ' so an inline element can be measured at all, and is not an opening for changing a box model',
      );
    }
    return { property, value };
  });
}

/**
 * One record's rule, without its comment.
 *
 * Exported because the browser surface previews an Override by writing the same
 * rule into a stylesheet of its own, and two spellings of "this is what the file
 * says" would drift silently — the preview is what the author judges the page by,
 * so a preview that stopped matching the file is the worst kind of wrong.
 */
export const rule = (record) =>
  `${record.selector} {\n${record.declarations
    .map(({ property, value }) => `  ${property}: ${value} !important;`)
    .join('\n')}\n}`;

// ---------------------------------------------------------------------------
// The bytes
// ---------------------------------------------------------------------------

/** One record's bytes: the comment naming it, and the rule. */
function block(record) {
  const comment =
    record.note.length === 0
      ? `/* ${record.name} */`
      : `/* ${record.name}\n` + record.note.map((text) => `   ${text}`).join('\n') + ' */';
  return `${comment}\n${rule(record)}`;
}

/**
 * The whole file, from a list of records.
 *
 * @param {Array<{ name: string, note: string[], selector: string,
 *                 declarations: Array<{ property: string, value: string }> }>} records
 * @returns {string}
 */
export function render(records) {
  return [HEADER, ...records.map(block)].join('\n\n') + '\n';
}

/** One record out of its bytes, or a refusal saying which line was not one. */
function readBlock(text) {
  const lines = text.split('\n');
  const closes = lines.findIndex((one) => one.endsWith(' */'));
  if (!lines[0]?.startsWith('/* ') || closes === -1) {
    throw new Refused(`"${lines[0] ?? ''}" does not open a record — every one starts with a comment naming it`);
  }
  const said = lines.slice(0, closes + 1);
  const name = /^\/\* (.*?)(?: \*\/)?$/.exec(said[0])?.[1] ?? '';
  const note = said.slice(1).map((one, at) => {
    const last = at === said.length - 2;
    const read = (last ? /^ {3}(.*) \*\/$/ : /^ {3}(.*)$/).exec(one);
    if (!read) throw new Refused(`"${one}" is not a line of a record’s note — a note is indented three spaces`);
    return read[1];
  });

  const rest = lines.slice(closes + 1);
  const opens = /^(\S.*) \{$/.exec(rest[0] ?? '');
  if (!opens) throw new Refused(`"${rest[0] ?? ''}" is not a record’s rule — the comment is followed by one`);
  if (rest.at(-1) !== '}') throw new Refused(`the rule on "${opens[1]}" is never closed on a line of its own`);

  const declarations = rest.slice(1, -1).map((one) => {
    const read = /^ {2}([a-z-]+): (.*) !important;$/.exec(one);
    if (!read) {
      throw new Refused(`"${one}" is not a declaration the Editor wrote — one is two spaces, a property, a value and !important`);
    }
    return { property: read[1], value: read[2] };
  });
  if (declarations.length === 0) throw new Refused(`the rule on "${opens[1]}" holds no declaration`);

  // Read back through the same guards a write goes through, so the file cannot
  // hold anything this boundary would have refused to put there.
  return {
    name: asName(name),
    note: asNote(note),
    selector: asSelector(opens[1]),
    declarations: asDeclarations(Object.fromEntries(declarations.map(({ property, value }) => [property, value]))),
  };
}

/**
 * Every Override in the file.
 *
 * Refuses anything that is not exactly what `render` writes. That strictness is
 * the point: this is the only boundary in the Editor that re-serialises, so the
 * guarantee that replaces "it only replaces one span" is "it only ever reads its
 * own output".
 *
 * @param {string} source
 * @returns {Array<{ name: string, note: string[], selector: string,
 *                   declarations: Array<{ property: string, value: string }> }>}
 */
export function parse(source) {
  if (typeof source !== 'string') throw new Refused('the Overrides to read are not a string');
  if (!source.startsWith(HEADER)) {
    throw new Refused(
      'this file does not open with the Overrides header — the Editor writes every byte of that file, so' +
        ' anything else is a file it must not touch',
    );
  }
  const rest = source.slice(HEADER.length);
  if (rest === '\n') return [];
  if (!rest.startsWith('\n\n') || !rest.endsWith('\n')) {
    throw new Refused('the Overrides file’s records are separated from the header by one blank line, and this is not');
  }
  return rest.slice(2, -1).split('\n\n').map(readBlock);
}

/**
 * The bytes of `source` with the Override on one selector set — or, given no
 * declarations, discarded.
 *
 * Throws `Refused` and writes nothing on anything it does not fully understand.
 *
 * @param {string} source the current contents of src/overrides.css
 * @param {{ selector: string, name?: string, note?: string[],
 *           declarations: Record<string, string> }} change
 * @returns {string} the file's new bytes
 */
export function write(source, change) {
  if (typeof source !== 'string') throw new Refused('the Overrides to write are not a string');
  if (change === null || typeof change !== 'object' || Array.isArray(change)) {
    throw new Refused(`an Override is an object, and this is ${change === null ? 'null' : `a ${typeof change}`}`);
  }

  const records = parse(source);
  // Unreachable while `parse` accepts only what `render` writes, and the
  // assertion that survives someone loosening that later.
  if (render(records) !== source) {
    throw new Refused('the Overrides file is not the bytes the Editor writes — refused, nothing written');
  }

  const selector = asSelector(change.selector);
  const declarations = asDeclarations(change.declarations);
  const at = records.findIndex((record) => record.selector === selector);

  if (declarations.length === 0) {
    if (at === -1) {
      throw new Refused(
        `no Override on "${selector}" to discard — this file holds ${
          records.length === 0 ? 'none' : records.map((record) => record.selector).join(', ')
        }`,
      );
    }
    records.splice(at, 1);
  } else {
    const record = { name: asName(change.name), note: asNote(change.note), selector, declarations };
    if (at === -1) {
      if (records.length >= LONGEST_FILE) {
        throw new Refused(
          `this file already holds ${LONGEST_FILE} Overrides, which is as many as it may — an Override is debt,` +
            ' and that many is a second composition nobody decided on',
        );
      }
      records.push(record);
    } else {
      // In place, so replacing one is a one-record diff rather than a reordering.
      records[at] = record;
    }
  }

  const bytes = render(records);
  if (bytes === source) return source;

  // The self-check, and the reason a bug here is a refusal rather than a damaged
  // stylesheet: read the output back and require exactly the records asked for.
  let after;
  try {
    after = parse(bytes);
  } catch (error) {
    throw new Refused(`writing that would produce a file this cannot read back — ${error.message}`);
  }
  if (JSON.stringify(after) !== JSON.stringify(records)) {
    throw new Refused('the Overrides did not survive being written — refused, nothing written');
  }
  return bytes;
}
