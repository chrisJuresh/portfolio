/**
 * The Editor's other write boundary: given a Section's `tokens.css` and a key
 * and a value, produce the file's bytes.
 *
 * ADR 0004 says the Editor writes Content and Tokens and nothing else, and this
 * is the Tokens half. It is a sibling of `content.mjs` rather than a variation
 * on it, and everything that file says about itself is true here for the same
 * reasons:
 *
 * IT REPLACES A SPAN, IT DOES NOT RE-SERIALISE. A `tokens.css` is mostly
 * comments — the paragraphs that say what a number does and where it was
 * measured are the reason the file is worth having — and a stylesheet read into
 * an object and printed back out loses every one of them. So the only edit made
 * here is: find the bytes of one declaration's VALUE, and put different bytes
 * there. The property, the selector, the semicolon, the blank lines and every
 * comment are copied verbatim, which the tests assert directly.
 *
 * IT REFUSES RATHER THAN GUESSES. A value that could close the declaration, the
 * rule or a comment is refused rather than escaped, because a Token is one CSS
 * value and anything else is a second rule smuggled through a text box. And the
 * last thing `write` does is read its own output back and require the same
 * declarations in the same order with one value changed.
 *
 * WHAT IT DOES NOT DO. It never writes a property name, a selector or a rule, so
 * `scripts/check-source.mjs`'s grammar for this file — Tokens only, on the
 * Section's own root — is preserved by construction rather than by checking.
 *
 * A KEY NAMES THE RULE AS WELL AS THE PROPERTY. `--front-screen-thumb-at` is
 * declared twice: once on the Section's root and once under
 * `:root[data-theme='dark']`, because where the switch's thumb stands depends on
 * the paper. Those are two Tokens the author will want two controls for, so the
 * key is `<rule index>:<property>` — and `write` requires the property at that
 * index to be the one the key names, so a key built against an older file is a
 * refusal rather than a write to whatever now stands in that position.
 *
 * `scripts/editor/NOTES.md` is the rest of the reasoning.
 */

import { Refused } from './content.mjs';

/** Long enough for the longest `color-mix()` in the repository, short enough
 *  that a runaway paste is caught before it reaches a file. */
const LONGEST = 300;

/** A custom property, which is the only thing this file may address. */
const PROPERTY = /^--[a-z0-9-]+$/;

/**
 * The first character in `value` that is not printable, or null.
 *
 * A code-point walk rather than a character class, because a Token edit has to
 * stay a one-line diff and the thing being looked for is precisely the
 * characters a regex literal cannot be trusted to carry through a tool chain.
 */
function unprintable(value) {
  for (const ch of value) {
    const code = ch.codePointAt(0);
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return ch;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Reading the file
// ---------------------------------------------------------------------------

/**
 * Past whitespace and comments, handing each comment to `onComment`.
 *
 * The comments are not skipped in the sense of being thrown away: the last one
 * before a declaration is that declaration's group heading, which is what makes
 * a hundred and sixty controls navigable rather than a wall.
 */
function skipTrivia(source, at, onComment) {
  let i = at;
  for (;;) {
    while (i < source.length && /\s/.test(source[i])) i += 1;
    if (!source.startsWith('/*', i)) return i;
    const close = source.indexOf('*/', i + 2);
    if (close === -1) throw new Refused('an unterminated comment — this is not a file I can read');
    onComment?.(source.slice(i + 2, close));
    i = close + 2;
  }
}

/**
 * A comment's own words, as a heading and as the whole of it.
 *
 * These files head their groups two ways: a rule of dashes with a phrase in the
 * middle of it, and a plain sentence. The dashes are decoration rather than
 * words, so they come off; anything else gives up its first line. The WHOLE
 * comment is kept either way, because the paragraph under a heading is what
 * says what each Token in the group does, and the panel has somewhere to put it.
 */
function heading(comment) {
  const text = comment.replace(/\r/g, '').trim();
  if (text === '') return null;
  const joined = text
    .split('\n')
    .map((line) => line.trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  // A decorated comment states its own heading, and the dashes come off it. An
  // undecorated one gives up its first CLAUSE rather than its first line: these
  // paragraphs are wrapped at the margin, so a line break falls where the margin
  // was and not where the sentence ends.
  const decorated = /^-{2,}\s*(.*?)\s*-{2,}(?:\s|$)/.exec(joined);
  const clause = /^(.{8,72}?[.:])(?:\s|$)/.exec(joined);
  const title = (decorated?.[1] ?? clause?.[1] ?? joined).replace(/\s+/g, ' ').trim();
  if (title === '') return null;

  // The rules of dashes are decoration, so they come off the note too — a note
  // that repeated its own heading's decoration back would be the panel saying
  // the same thing twice, which is what the panel exists to not do.
  const note = joined.replace(/-{3,}/g, ' ').replace(/\s+/g, ' ').trim();
  return { title: title.length > 72 ? `${title.slice(0, 71)}…` : title, note };
}

/**
 * One declaration's value span, from just after the colon.
 *
 * Ended by the `;` or the `}` that ends the declaration, with brackets counted
 * so a `color-mix(in oklab, …)` is one value and not three. Trailing whitespace
 * is left outside the span: the span is what a write replaces, so it holds the
 * value and nothing that merely stands beside it.
 */
function readValue(source, at) {
  let i = at;
  let depth = 0;
  for (;;) {
    if (i >= source.length) throw new Refused(`a declaration at ${at} is never closed`);
    const ch = source[i];
    // A quoted string is one token of the value, and a `;` or a `}` inside one
    // does not end anything. No Token in the repository is quoted today — a font
    // stack is the shape that would be — and the alternative to four lines here
    // is a whole Section's controls refusing to load the day one is.
    if (ch === "'" || ch === '"') {
      const close = source.indexOf(ch, i + 1);
      if (close === -1) throw new Refused(`a quote at ${i} is never closed`);
      i = close + 1;
      continue;
    }
    if (depth === 0 && (ch === ';' || ch === '}')) break;
    if (ch === '(' || ch === '[') depth += 1;
    else if (ch === ')' || ch === ']') depth -= 1;
    i += 1;
  }
  const raw = source.slice(at, i);
  const lead = raw.length - raw.trimStart().length;
  const value = raw.trim();
  if (value === '') throw new Refused(`a declaration at ${at} has no value`);
  return { start: at + lead, end: at + lead + value.length, value, ends: i };
}

/**
 * Every Token a Section declares, in source order.
 *
 * This is the discovery the ticket asks for: a Section that promotes a new
 * number to a Token gets a control for free, because nothing anywhere lists
 * them. What is relied on is the grammar `scripts/check-source.mjs` already
 * enforces on this file — a flat list of style rules, and nothing in one but
 * custom properties named for the Section — so anything else is refused here
 * rather than half-read.
 *
 * @param {string} source the contents of a Section's tokens.css
 * @returns {Array<{ key: string, rule: number, selector: string, ruleNote: string | null,
 *                   property: string, value: string, group: string | null, note: string | null,
 *                   start: number, end: number }>}
 */
export function tokens(source) {
  if (typeof source !== 'string') throw new Refused('the Tokens to read are not a string');

  const found = [];
  let i = 0;
  let rule = 0;
  let above = null;

  for (;;) {
    i = skipTrivia(source, i, (comment) => {
      above = heading(comment);
    });
    if (i >= source.length) return found;

    const open = source.indexOf('{', i);
    if (open === -1) throw new Refused(`"${source.slice(i, i + 32).trim()}" is not a rule — this file is a flat list of rules`);
    const selector = source.slice(i, open).replace(/\s+/g, ' ').trim();
    if (selector === '' || selector.startsWith('@')) {
      throw new Refused(
        `"${selector || '{'}" is not a selector — the Editor writes a value and not a breakpoint,` +
          ' so a Token file is rules on the Section’s own root and nothing else',
      );
    }
    const ruleNote = above?.note ?? null;
    above = null;

    // Inside the rule. A comment here heads the group the declarations under it
    // belong to, and the file says where a group starts and never where it ends,
    // so the last heading seen is the answer until the rule does end.
    let group = null;
    let j = open + 1;
    for (;;) {
      j = skipTrivia(source, j, (comment) => {
        group = heading(comment);
      });
      if (j >= source.length) throw new Refused(`the rule "${selector}" is never closed`);
      if (source[j] === '}') {
        j += 1;
        break;
      }

      const colon = source.indexOf(':', j);
      const ends = source.indexOf('}', j);
      if (colon === -1 || (ends !== -1 && ends < colon)) {
        throw new Refused(`"${source.slice(j, Math.min(ends === -1 ? j + 32 : ends, j + 32)).trim()}" in "${selector}" is not a declaration`);
      }
      const property = source.slice(j, colon).trim();
      if (!PROPERTY.test(property)) {
        throw new Refused(
          `"${property}" is not a Token — this file holds custom properties and nothing else,` +
            ' which is what scripts/check-source.mjs fails the build on',
        );
      }

      const read = readValue(source, colon + 1);
      found.push({
        key: `${rule}:${property}`,
        rule,
        selector,
        ruleNote,
        property,
        value: read.value,
        group: group?.title ?? null,
        note: group?.note ?? null,
        start: read.start,
        end: read.end,
      });
      j = source[read.ends] === ';' ? read.ends + 1 : read.ends;
    }

    i = j;
    rule += 1;
  }
}

// ---------------------------------------------------------------------------
// What kind of control a value asks for
// ---------------------------------------------------------------------------

/**
 * A number with an optional unit, a colour, or neither.
 *
 * This is the one piece of the Tokens surface that is worth testing in node
 * rather than in a browser, so it lives beside the boundary: what the panel
 * draws for a Token is decided entirely by the bytes in the file, and the
 * decision is the ticket's whole premise — a size, a gap, a weight, a colour or
 * a duration is DRAGGED, and everything else is typed.
 *
 * A `clamp()`, a `calc()`, a `color-mix()` and a `var()` are text on purpose,
 * and it is ADR 0004's reason rather than a limitation of the parser: those are
 * RELATIONSHIPS, and dragging one end of one destroys it rather than editing it.
 * The front-screen Tokens say so of their own clamp in as many words.
 *
 * @param {string} value
 * @returns {{ kind: 'number', number: number, unit: string, min: number, max: number, step: number }
 *          | { kind: 'colour', hex: string, alpha: number }
 *          | { kind: 'text' }}
 */
export function control(value) {
  const text = String(value ?? '').trim();

  const measured = /^(-?(?:\d+\.?\d*|\.\d+))([a-z]*|%)$/i.exec(text);
  if (measured) {
    const number = Number.parseFloat(measured[1]);
    // The range is derived from the value in the file, because nothing declares
    // one: four times what the author chose, on the side of nothing they chose
    // it on. So the slider is a NUDGE around the composition's own value, and
    // the number beside it is the value — which is also what lets a Token leave
    // the range it was given.
    const span = number === 0 ? 1 : Math.abs(number) * 4;
    return {
      kind: 'number',
      number,
      unit: measured[2].toLowerCase(),
      min: number < 0 ? -span : 0,
      max: span,
      // Fine enough to move the last digit the file holds: a share written to
      // four places needs a thousandth, and a font weight does not.
      step: 10 ** Math.floor(Math.log10(span / 1000)),
    };
  }

  const hex = /^#([0-9a-f]{3,8})$/i.exec(text);
  if (hex && [3, 4, 6, 8].includes(hex[1].length)) {
    const digits = hex[1].length <= 4 ? [...hex[1]].map((d) => d + d).join('') : hex[1];
    return {
      kind: 'colour',
      hex: `#${digits.slice(0, 6).toLowerCase()}`,
      alpha: digits.length === 8 ? Number((Number.parseInt(digits.slice(6), 16) / 255).toFixed(3)) : 1,
    };
  }

  const rgb = /^rgba?\(\s*([^)]*)\)$/i.exec(text);
  if (rgb) {
    const parts = rgb[1].split(/[,/]/).map((part) => part.trim());
    const numbers = parts.map(Number);
    if ((parts.length === 3 || parts.length === 4) && numbers.every(Number.isFinite)) {
      const byte = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
      return {
        kind: 'colour',
        hex: `#${byte(numbers[0])}${byte(numbers[1])}${byte(numbers[2])}`,
        alpha: parts.length === 4 ? numbers[3] : 1,
      };
    }
  }

  return { kind: 'text' };
}

/**
 * A number and its unit, as the bytes to put in the file.
 *
 * A slider's own value carries float noise — three steps of 0.1 is
 * 0.30000000000000004 — and a Token file is read by people, so the value is
 * rounded to the precision its own step implies and the trailing zeros come off.
 */
export function amount(number, unit, step) {
  const places = Math.max(0, Math.min(8, -Math.floor(Math.log10(step || 1))));
  const fixed = Number(number).toFixed(places);
  const trimmed = places === 0 ? fixed : fixed.replace(/0+$/, '').replace(/\.$/, '');
  return `${trimmed}${unit}`;
}

/** A colour and an alpha, as the bytes to put in the file: a hex while it is
 *  opaque, and the `rgba()` the Sections' own veils are written as otherwise. */
export function colour(hex, alpha) {
  const digits = /^#([0-9a-f]{6})$/i.exec(String(hex ?? '').trim());
  if (!digits) throw new Refused(`"${hex}" is not a six-digit colour`);
  if (!(alpha >= 0 && alpha < 1)) return `#${digits[1].toLowerCase()}`;
  const channel = (at) => Number.parseInt(digits[1].slice(at, at + 2), 16);
  return `rgba(${channel(0)}, ${channel(2)}, ${channel(4)}, ${Number(alpha.toFixed(3))})`;
}

// ---------------------------------------------------------------------------
// Writing it
// ---------------------------------------------------------------------------

/** A rule's number and a property. Not a path, not a selector, not a file. */
const KEY = /^(\d+):(--[a-z0-9-]+)$/;

/** The nearest Tokens to a key that is not there, so a stale one is one glance. */
function nearest(rule, available) {
  const inRule = available.filter((token) => token.rule === rule);
  return (inRule.length > 0 ? inRule : available)
    .slice(0, 6)
    .map((token) => token.key)
    .join(', ');
}

/**
 * Everything a Token's value may not be.
 *
 * The list is short and every entry is the same worry: a text box that reaches a
 * stylesheet must not be able to write anything but a value. A `;` starts a
 * second declaration, a `}` ends the rule and everything after it is outside
 * one, a comment marker can take the rest of the file with it, and `!important`
 * is a value that outranks the composition rather than one that belongs to it.
 * All refusals, none escaped: escaping would mean deciding what the author meant.
 */
function refuse(key, value) {
  if (typeof value !== 'string') {
    throw new Refused(`${key}: a Token is a CSS value, and this is ${value === null ? 'null' : `a ${typeof value}`}`);
  }
  const text = value.trim();
  if (text === '') throw new Refused(`${key}: empty — a Token is one CSS value`);
  const bad = unprintable(text);
  if (bad) {
    throw new Refused(
      `${key}: holds the control character U+${bad.codePointAt(0).toString(16).padStart(4, '0').toUpperCase()}` +
        ' — a Token is one CSS value on one line',
    );
  }
  if (text.length > LONGEST) {
    throw new Refused(`${key}: ${text.length} characters, and the longest a Token may be is ${LONGEST}`);
  }
  for (const [what, why] of [
    [';', 'a semicolon would start a second declaration'],
    ['{', 'a brace would open a rule'],
    ['}', 'a brace would close the rule and put everything after it outside one'],
    ['/*', 'a comment would swallow the rest of the file'],
    ['*/', 'a comment end would close one this did not open'],
    ['!', '`!important` outranks the composition rather than belonging to it'],
  ]) {
    if (text.includes(what)) throw new Refused(`${key}: ${why} — refused, nothing written`);
  }
  let depth = 0;
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth += 1;
    if (ch === ')' || ch === ']') depth -= 1;
    if (depth < 0) throw new Refused(`${key}: a bracket closes something this value never opened`);
  }
  if (depth !== 0) throw new Refused(`${key}: ${depth} bracket(s) left open — a Token is one complete value`);
  return text;
}

/**
 * The bytes of `source` with the Token at `key` set to `value`.
 *
 * Throws `Refused` and writes nothing on anything it does not fully understand.
 *
 * @param {string} source the current contents of a Section's tokens.css
 * @param {string} key `<rule index>:<property>`, as `tokens` gives them
 * @param {string} value one CSS value
 * @returns {string} the file's new bytes
 */
export function write(source, key, value) {
  const named = typeof key === 'string' ? KEY.exec(key) : null;
  if (!named) {
    throw new Refused(
      `"${key}" is not a Token key — a key is a rule’s number and a property, as in 0:--stub-height`,
    );
  }
  const text = refuse(key, value);

  const before = tokens(source);
  const target = before.find((token) => token.key === key);
  if (!target) {
    throw new Refused(
      `${key}: no such Token — in this file are ${nearest(Number(named[1]), before)}`,
    );
  }
  // Unreachable while a key is built out of the property it names, and the
  // assertion that survives someone building one out of a position alone.
  if (target.property !== named[2]) {
    throw new Refused(`${key}: rule ${named[1]} declares ${target.property} there — refused, nothing written`);
  }
  if (target.value.includes('/*')) {
    throw new Refused(
      `${key}: a comment stands inside this value, and replacing the value’s bytes would delete it`,
    );
  }
  if (target.value === text) return source;

  const bytes = source.slice(0, target.start) + text + source.slice(target.end);

  // The self-check, and the reason a parser bug here is a refusal rather than a
  // damaged stylesheet: read the output back and require the same declarations,
  // in the same rules, in the same order, with one value changed.
  let after;
  try {
    after = tokens(bytes);
  } catch (error) {
    throw new Refused(`${key}: writing that would produce a file this cannot read back — ${error.message}`);
  }
  if (after.length !== before.length) {
    throw new Refused(`${key}: writing that would change the shape of the file — refused, nothing written`);
  }
  for (const [i, token] of after.entries()) {
    const was = before[i];
    if (token.key !== was.key || token.selector !== was.selector) {
      throw new Refused(`${key}: writing that would move ${was.key} — refused, nothing written`);
    }
    const wanted = token.key === key ? text : was.value;
    if (token.value !== wanted) {
      throw new Refused(
        token.key === key
          ? `${key}: the value did not survive being written — refused, nothing written`
          : `${key}: writing that would also change ${token.key} — refused, nothing written`,
      );
    }
  }

  return bytes;
}
