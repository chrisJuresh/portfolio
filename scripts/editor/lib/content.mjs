/**
 * The Editor's write boundary: given a Section's `content.ts` and a key and a
 * value, produce the file's bytes.
 *
 * ADR 0004 makes this the Editor's whole interface, and the browser surface sits
 * on top of it. Two things follow from that, and both are why this file is a
 * parser rather than three lines of `JSON.stringify`:
 *
 * IT REPLACES A SPAN, IT DOES NOT RE-SERIALISE. A Section's Content is a
 * TypeScript file carrying comments, a schema, authored line breaks and long
 * strings written as a sum of two literals. Reading it into an object and writing
 * it back out would produce a file that parses and has lost every one of those.
 * So the only edit this makes is: find the bytes of one string literal, and put
 * different bytes there. Everything else in the file is copied verbatim, which is
 * a property the tests assert directly rather than a hope.
 *
 * IT REFUSES RATHER THAN GUESSES. This is the one component in the repository
 * whose bugs corrupt source files instead of showing up on screen, so anything
 * it does not fully understand — a key that is not there, a value that is not a
 * string, a structure it cannot locate exactly — is a refusal. The last thing
 * `write` does before returning is re-read its own output and check that exactly
 * one field moved; if a bug here ever produced something else, that is a refusal
 * too, and not a written file.
 *
 * `scripts/editor/NOTES.md` is the rest of the reasoning.
 */

/** A refusal. Everything this module rejects is one of these, and it says why. */
export class Refused extends Error {
  constructor(message) {
    super(message);
    this.name = 'Refused';
  }
}

/** A Content string is one run of words, so a newline or a tab is a refusal. */
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

/** Long enough for the longest paragraph on the page, short enough that a
 *  runaway paste is caught before it reaches a file. */
const LONGEST = 4000;

// ---------------------------------------------------------------------------
// Reading the file
// ---------------------------------------------------------------------------

/** Whitespace and both kinds of comment. The comments are the thing being
 *  preserved, so the parser has to know they are there. */
function skipTrivia(source, at) {
  let i = at;
  for (;;) {
    while (i < source.length && /\s/.test(source[i])) i += 1;
    if (source.startsWith('//', i)) {
      const line = source.indexOf('\n', i);
      i = line === -1 ? source.length : line + 1;
      continue;
    }
    if (source.startsWith('/*', i)) {
      const close = source.indexOf('*/', i + 2);
      if (close === -1) throw new Refused('an unterminated block comment — this is not a file I can read');
      i = close + 2;
      continue;
    }
    return i;
  }
}

const ESCAPES = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', 0: '\u0000' };

/**
 * One string literal, decoded. Null when `at` is not the start of one.
 *
 * A template literal is read as a string only when it interpolates nothing —
 * `${` makes the value a computed thing rather than words, and the Editor does
 * not edit those.
 */
function readLiteral(source, at) {
  const quote = source[at];
  if (quote !== "'" && quote !== '"' && quote !== '`') return null;

  let value = '';
  let i = at + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\\') {
      const next = source[i + 1];
      if (next === 'u') {
        const braced = /^\{([0-9a-fA-F]{1,6})\}/.exec(source.slice(i + 2));
        const plain = /^([0-9a-fA-F]{4})/.exec(source.slice(i + 2));
        const hex = braced ?? plain;
        if (!hex) return null;
        value += String.fromCodePoint(Number.parseInt(hex[1], 16));
        i += 2 + hex[0].length;
        continue;
      }
      if (next === 'x') {
        const hex = /^([0-9a-fA-F]{2})/.exec(source.slice(i + 2));
        if (!hex) return null;
        value += String.fromCharCode(Number.parseInt(hex[1], 16));
        i += 4;
        continue;
      }
      // A line continuation carries no character of its own.
      if (next === '\n') {
        i += 2;
        continue;
      }
      value += ESCAPES[next] ?? next;
      i += 2;
      continue;
    }
    if (ch === quote) return { start: at, end: i + 1, value };
    if (quote === '`' && source.startsWith('${', i)) return null;
    if (quote !== '`' && (ch === '\n' || ch === '\r')) return null;
    value += ch;
    i += 1;
  }
  return null;
}

/**
 * A string literal, or several summed together.
 *
 * `'a ' + 'b'` is one Content string that happened to be authored over two lines
 * — which is how every long paragraph in this repository is written — so the
 * whole sum is the span, and replacing it puts one literal where two were.
 * A sum with anything other than a literal in it is not a Content string at all,
 * and comes back null.
 */
function readString(source, at) {
  const first = readLiteral(source, at);
  if (!first) return null;

  let value = first.value;
  let end = first.end;
  for (;;) {
    const plus = skipTrivia(source, end);
    if (source[plus] !== '+') return { start: at, end, value };
    const next = readLiteral(source, skipTrivia(source, plus + 1));
    if (!next) return null;
    value += next.value;
    end = next.end;
  }
}

const CLOSES = { '{': '}', '[': ']', '(': ')' };

/**
 * Past a value this module does not edit — a number, a call, an identifier — to
 * the comma or bracket that ends it. Brackets are counted and strings and
 * comments skipped, so a `,` inside either does not end anything.
 */
function skipValue(source, at) {
  let i = at;
  const open = [];
  for (;;) {
    i = skipTrivia(source, i);
    if (i >= source.length) return i;
    const ch = source[i];
    if (open.length === 0 && (ch === ',' || ch === '}' || ch === ']' || ch === ')')) return i;
    const literal = readLiteral(source, i);
    if (literal) {
      i = literal.end;
      continue;
    }
    if (CLOSES[ch]) {
      open.push(CLOSES[ch]);
      i += 1;
      continue;
    }
    if (ch === '}' || ch === ']' || ch === ')') {
      if (open.pop() !== ch) throw new Refused(`a bracket at ${i} closes something that was never opened`);
      i += 1;
      continue;
    }
    i += 1;
  }
}

/** A key in an object literal: bare, or quoted. */
function readKey(source, at) {
  const bare = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(source.slice(at));
  if (bare) return { name: bare[0], end: at + bare[0].length };
  const quoted = readLiteral(source, at);
  if (quoted) return { name: quoted.value, end: quoted.end };
  return null;
}

const join = (path, step) => (path === '' ? String(step) : `${path}.${step}`);

/**
 * Walk one value, recording a node for it and for everything under it, and
 * return where it ended.
 */
function walk(source, at, path, found) {
  const i = skipTrivia(source, at);
  const ch = source[i];

  if (ch === '{') {
    const node = { key: path, kind: 'object', start: i, end: 0 };
    found.push(node);
    let j = i + 1;
    for (;;) {
      j = skipTrivia(source, j);
      if (j >= source.length) throw new Refused(`an object literal at ${i} is never closed`);
      if (source[j] === '}') {
        node.end = j + 1;
        return node.end;
      }
      if (source.startsWith('...', j)) {
        // A spread is structure the Editor cannot address, so it is walked past
        // rather than named. Nothing under it becomes editable.
        j = skipValue(source, j + 3);
        if (source[j] === ',') j += 1;
        continue;
      }
      const key = readKey(source, j);
      if (!key) throw new Refused(`cannot read an object key at ${j}`);
      j = skipTrivia(source, key.end);
      if (source[j] !== ':') {
        // Shorthand — `{ name }`. A reference, not words.
        j = skipValue(source, key.end);
        if (source[j] === ',') j += 1;
        continue;
      }
      j = walk(source, j + 1, join(path, key.name), found);
      j = skipTrivia(source, j);
      if (source[j] === ',') j += 1;
    }
  }

  if (ch === '[') {
    const node = { key: path, kind: 'array', start: i, end: 0 };
    found.push(node);
    let j = i + 1;
    let index = 0;
    for (;;) {
      j = skipTrivia(source, j);
      if (j >= source.length) throw new Refused(`an array literal at ${i} is never closed`);
      if (source[j] === ']') {
        node.end = j + 1;
        return node.end;
      }
      j = walk(source, j, join(path, index), found);
      index += 1;
      j = skipTrivia(source, j);
      if (source[j] === ',') j += 1;
    }
  }

  const string = readString(source, i);
  if (string) {
    found.push({ key: path, kind: 'string', value: string.value, start: string.start, end: string.end });
    return string.end;
  }

  const end = skipValue(source, i);
  found.push({ key: path, kind: 'other', start: i, end });
  return end;
}

/**
 * Where `defineContent`'s second argument starts.
 *
 * The schema above it is full of braces and string literals and is not Content,
 * so the parser is pointed at the data literal and nowhere else. A file this
 * cannot find is refused rather than half-read.
 */
function dataLiteral(source) {
  const call = /\bdefineContent\s*\(/.exec(source);
  if (!call) {
    throw new Refused('no defineContent(…) call — this is not a Section’s Content');
  }
  const comma = skipValue(source, call.index + call[0].length);
  if (source[comma] !== ',') {
    throw new Refused('defineContent(…) was called with one argument — there is no data literal to read');
  }
  const at = skipTrivia(source, comma + 1);
  if (source[at] !== '{') {
    throw new Refused('defineContent’s second argument is not an object literal');
  }
  return at;
}

/**
 * Every addressable node in a Section's Content, in source order: the strings
 * and the structure both.
 *
 * The structure is in here so that asking to edit an array can be refused by
 * name — "an array, not a string" is a diagnosis, and "no such key" is not.
 */
export function nodes(source) {
  if (typeof source !== 'string') throw new Refused('the Content to read is not a string');
  const found = [];
  walk(source, dataLiteral(source), '', found);
  // The data literal itself is the root and is not a field.
  return found.filter((node) => node.key !== '');
}

/**
 * Every string in a Section's Content, keyed by a dotted path with array
 * positions as numbers: `location`, `bio.0`, `work.entries.1.org`.
 *
 * These are exactly the values the Editor may write, which is the same thing as
 * saying they are exactly the words on the page.
 */
export function fields(source) {
  return nodes(source)
    .filter((node) => node.kind === 'string')
    .map(({ key, value }) => ({ key, value }));
}

// ---------------------------------------------------------------------------
// Writing it
// ---------------------------------------------------------------------------

/** A single-quoted literal. The repository's Content is single-quoted, and a
 *  typographic apostrophe needs no escape, so most values come out untouched. */
function quote(value) {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function describe(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  return `a ${typeof value}`;
}

/** The nearest keys to one that is not there, so a typo is one glance. */
function nearest(key, available) {
  const head = key.split('.')[0];
  const close = available.filter((candidate) => candidate.split('.')[0] === head);
  return (close.length > 0 ? close : available).slice(0, 6).join(', ');
}

/**
 * The bytes of `source` with the string at `key` set to `value`.
 *
 * Throws `Refused` and writes nothing on anything it does not fully understand.
 *
 * @param {string} source the current contents of a Section's content.ts
 * @param {string} key a dotted path, as `fields` gives them
 * @param {string} value the words to put there
 * @returns {string} the file's new bytes
 */
export function write(source, key, value) {
  if (typeof key !== 'string' || key === '') throw new Refused('no Content key was named');
  if (typeof value !== 'string') {
    throw new Refused(`${key}: a Content value is a string, and this is ${describe(value)}`);
  }
  if (value.trim() === '') {
    throw new Refused(`${key}: empty — every Content string is min(1) in its Section’s schema`);
  }
  const control = CONTROL.exec(value);
  if (control) {
    throw new Refused(
      `${key}: holds the control character U+${control[0].codePointAt(0).toString(16).padStart(4, '0').toUpperCase()}` +
        ' — a Content string is one run of words, and a paragraph break is a new array entry',
    );
  }
  if (value.length > LONGEST) {
    throw new Refused(
      `${key}: ${value.length} characters, and the longest a Content string may be is ${LONGEST}` +
        ' — this is a runaway paste rather than words',
    );
  }

  const before = nodes(source);
  const target = before.find((node) => node.key === key);
  if (!target) {
    throw new Refused(`${key}: no such Content key — near it are ${nearest(key, before.map((n) => n.key))}`);
  }
  if (target.kind !== 'string') {
    throw new Refused(
      `${key}: ${target.kind === 'other' ? 'not words' : `an ${target.kind}`}, so it is this Section’s` +
        ' structure rather than its words — the Editor writes strings',
    );
  }

  // Nothing to do, and saying so rather than rewriting matters for one shape:
  // a long paragraph authored as a sum of literals collapses to a single long
  // one when it is written, so a click-in-click-out that changed no word would
  // otherwise reflow the file for nothing.
  if (target.value === value) return source;

  const bytes = source.slice(0, target.start) + quote(value) + source.slice(target.end);

  // The self-check, and the reason a parser bug in this file is a refusal rather
  // than a corrupted source file: read the output back, and require that it
  // holds the same fields in the same order with one value changed. Nothing
  // above can produce anything else — which is exactly why it is cheap to say so
  // out loud, and why it is the assertion that survives a later rewrite of the
  // walk above.
  let after;
  try {
    after = nodes(bytes);
  } catch (error) {
    throw new Refused(`${key}: writing that would produce a file this cannot read back — ${error.message}`);
  }
  if (after.length !== before.length) {
    throw new Refused(`${key}: writing that would change the shape of the file — refused, nothing written`);
  }
  for (const [i, node] of after.entries()) {
    const was = before[i];
    if (node.key !== was.key || node.kind !== was.kind) {
      throw new Refused(`${key}: writing that would move ${was.key} — refused, nothing written`);
    }
    if (node.kind !== 'string') continue;
    const wanted = node.key === key ? value : was.value;
    if (node.value !== wanted) {
      throw new Refused(
        node.key === key
          ? `${key}: the value did not survive being written — refused, nothing written`
          : `${key}: writing that would also change ${node.key} — refused, nothing written`,
      );
    }
  }

  return bytes;
}
