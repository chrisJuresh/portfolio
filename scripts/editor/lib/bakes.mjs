/**
 * The Editor's third write boundary: a Bake's parameters, and the command that
 * runs one.
 *
 * A BAKE IS A GENERATOR AND THE NUMBERS IT IS RUN WITH. Five of them, absorbed
 * from the five tuners #146 retires — the corner pictures, the two Texturelabs
 * plates, the procedural plinth, a plinth cut from a photograph, and the cut
 * title's face. What makes them a second kind of thing rather than more Tokens
 * is SPEED: a Token moves the page in the frame it is dragged in, and a baked
 * parameter moves nothing until a Python script has run, which is fifteen
 * seconds of Cycles or two minutes of Pillow.
 *
 * TWO FILES PER BAKE, AND ONLY ONE OF THEM IS EVER WRITTEN.
 *
 * `recipe.json` is the declaration: what the Bake is, what it needs that this
 * repository does not carry, the command, and every parameter with its default,
 * its label, its range and the paragraph that says what it does. It is authored,
 * committed, and never written by anything here — which is what lets it hold the
 * prose, because nothing has to preserve a comment it never rewrites.
 *
 * `params.json` is what has MOVED off those defaults, and nothing else. It is a
 * flat object of strings with no comment, no ordering and no formatting worth
 * keeping, so this boundary re-serialises it where `content.mjs` and
 * `tokens.mjs` refuse to — sorted, two-space, one trailing newline, so two
 * sessions that tuned the same two numbers wrote the same bytes. A parameter put
 * back to its default LOSES ITS LINE rather than getting one that repeats the
 * recipe, which is the same rule the Tokens surface's preview stylesheet follows
 * and for the same reason: the file then reads as exactly what has been tuned.
 *
 * EVERY VALUE CROSSES AS TEXT, defaults included. A number in JSON would arrive
 * as a float with its own rounding, and half of these parameters are not numbers
 * at all — a colour, a path, a grade's name. So the file holds `"0.34"`, the
 * boundary refuses a value that is not a number where the default was one, and
 * the generator parses it once on the way in.
 *
 * A PARAMETER REACHES THE GENERATOR ONE OF TWO WAYS, and the recipe says which.
 * A `{key}` in the command is substituted; a parameter declaring `arg` becomes
 * that flag; and everything else reaches `params.json` and is read there by the
 * generator itself. The split is not a design preference — it is what each
 * generator already had a door for. `add-stone.py` takes every one of its
 * parameters as a flag and always has, and putting those in a file as well would
 * be a second way to say the same thing that a shell run would not agree with.
 *
 * WHICH IS THE POINT OF THE FILE, AND THE THING THE TUNERS COULD NOT DO. Each of
 * the five printed a block of Python to paste back into the generator by hand,
 * and a paste that was not made is a shipped asset nothing in the tree describes.
 * A generator reading `params.json` is run the same way from the Editor and from
 * a shell, so there is nothing to paste and nothing to drift.
 *
 * `scripts/editor/NOTES.md` is the rest of the reasoning.
 */

import { Refused, unprintable } from './content.mjs';

/** The two file names a Bake holds. Neither is a parameter, anywhere. */
export const RECIPE = 'recipe.json';
export const PARAMS = 'params.json';

/** A parameter's key. Dots so a grade's field can be named for what it is —
 *  `PLATE_LIGHT.EXPOSURE_TARGET` is what build-plate.py calls it — and nothing
 *  that could be a path, because these are read straight out of a file by name. */
const KEY = /^[A-Za-z][A-Za-z0-9_.-]*$/;

/** Long enough for the longest path a source photograph could sit at. */
const LONGEST = 300;

/** A flag, as a generator's own argument parser spells one. */
const FLAG = /^--[a-z0-9][a-z0-9-]*$/;

const isNumber = (text) => text.trim() !== '' && Number.isFinite(Number(text));

function say(what) {
  throw new Refused(what);
}

// ---------------------------------------------------------------------------
// Reading a recipe
// ---------------------------------------------------------------------------

function text(where, value, { empty = false } = {}) {
  if (typeof value !== 'string') say(`${where} is ${value === undefined ? 'missing' : 'not text'}`);
  if (!empty && value.trim() === '') say(`${where} is empty`);
  return value;
}

function optionalText(where, value) {
  if (value === undefined || value === null) return null;
  return text(where, value, { empty: true });
}

function optionalNumber(where, value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) say(`${where} is not a number`);
  return value;
}

function readParam(group, raw, seen) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    say(`a parameter of "${group}" is not an object`);
  }
  const key = text(`a parameter of "${group}"`, raw.key);
  if (!KEY.test(key)) say(`"${key}" is not a parameter key — letters, digits, dots, dashes`);
  if (seen.has(key)) say(`"${key}" is declared twice — a write could reach either`);
  seen.add(key);

  // The default is text like every other value: see EVERY VALUE CROSSES AS TEXT.
  const value = text(`"${key}"`, raw.value, { empty: true });

  let options = null;
  if (raw.options !== undefined) {
    if (!Array.isArray(raw.options) || raw.options.length === 0) say(`"${key}" declares empty options`);
    options = raw.options.map((option, at) => text(`option ${at} of "${key}"`, option));
    if (value !== '' && !options.includes(value)) say(`"${key}" opens on a value that is not one of its options`);
  }

  const arg = optionalText(`the arg of "${key}"`, raw.arg);
  if (arg !== null && !FLAG.test(arg)) say(`"${arg}" is not a flag — a bake's argument is --like-this`);
  const when = optionalText(`the when of "${key}"`, raw.when);
  if (when !== null && arg === null) say(`"${key}" declares when without an arg — there is no flag to withhold`);
  // A flag that takes more than one number: `add-stone.py --bump 0.22 0.00035`
  // is argparse's `nargs=2`, so the value is one control holding two words and
  // the words are separate argv elements. Only a flag can be one — nothing else
  // reaches an argument list at all.
  const words = raw.words === undefined ? false : raw.words === true || say(`the words of "${key}" is not true`);
  if (words && arg === null) say(`"${key}" declares words without an arg — nothing else is split`);
  if (words && when !== null) say(`"${key}" declares words and when — a switch carries no words`);

  return {
    key,
    label: optionalText(`the label of "${key}"`, raw.label) ?? key,
    note: optionalText(`the note of "${key}"`, raw.note),
    value,
    options,
    min: optionalNumber(`the min of "${key}"`, raw.min),
    max: optionalNumber(`the max of "${key}"`, raw.max),
    step: optionalNumber(`the step of "${key}"`, raw.step),
    arg,
    when,
    words,
    group,
    groupNote: null,
  };
}

/**
 * A Bake's declaration, validated, with its parameters flattened in source order
 * and each carrying the group it came from.
 *
 * Everything is refused rather than defaulted. A recipe is authored and
 * committed, so a malformed one is a mistake somebody made a minute ago and
 * wants told about — not a surface that quietly draws four controls where the
 * file declares five.
 *
 * @param {string} source the contents of a Bake's recipe.json
 */
export function recipe(source) {
  if (typeof source !== 'string') say('the recipe to read is not a string');
  let raw;
  try {
    raw = JSON.parse(source);
  } catch (error) {
    say(`that recipe is not JSON — ${error.message}`);
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) say('a recipe is a JSON object');

  if (!Array.isArray(raw.run) || raw.run.length === 0) {
    say('a recipe declares run: the program and its arguments, and a Bake without one cannot be run');
  }
  const run = raw.run.map((word, at) => {
    if (typeof word !== 'string' || word === '') say(`word ${at} of run is not a command word`);
    return word;
  });

  const groups = Array.isArray(raw.groups) ? raw.groups : say('a recipe declares groups');
  const seen = new Set();
  const params = [];
  for (const group of groups) {
    if (group === null || typeof group !== 'object' || Array.isArray(group)) say('a group is not an object');
    const name = text('a group name', group.name);
    const note = optionalText(`the note of "${name}"`, group.note);
    const list = Array.isArray(group.params) ? group.params : say(`"${name}" declares no params`);
    for (const one of list) params.push({ ...readParam(name, one, seen), groupNote: note });
  }

  return {
    title: text('a recipe title', raw.title),
    note: optionalText('a recipe note', raw.note),
    // What the Bake needs that this repository does not carry — a raw frame, a
    // 12 MB JPEG, Blender, a font. Every one of the five needs something, and
    // saying so up front is the difference between a failure that reads as a
    // broken tool and one that reads as a missing file.
    needs: optionalText('a recipe needs', raw.needs),
    run,
    shows: (raw.shows ?? []).map((path, at) => text(`shows ${at}`, path)),
    params,
  };
}

/** A recipe's parameters, in source order. */
export const parameters = (read) => read.params;

// ---------------------------------------------------------------------------
// The overrides
// ---------------------------------------------------------------------------

/**
 * What a Bake's `params.json` says, as a flat object of strings.
 *
 * A missing or empty file is no overrides, because that is what a Bake standing
 * at every one of its defaults looks like and it is the state most of them are
 * in.
 */
export function values(source) {
  const written = String(source ?? '').trim();
  if (written === '') return {};
  let raw;
  try {
    raw = JSON.parse(written);
  } catch (error) {
    say(`those parameters are not JSON — ${error.message}`);
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    say('a Bake’s parameters are a JSON object of names and values');
  }
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== 'string') say(`"${key}" is not text — every value crosses as text`);
  }
  return raw;
}

/**
 * The recipe's defaults with the overrides over them.
 *
 * An override naming a parameter the recipe no longer declares is IGNORED rather
 * than refused: a recipe is edited by hand and a dropped parameter leaves a line
 * behind, and refusing would make the whole Bake unopenable over a stale line
 * nothing reads. It cannot reach a command either — `command` only ever asks for
 * keys the recipe declares.
 */
export function effective(read, overrides) {
  const now = {};
  for (const param of read.params) {
    const over = overrides?.[param.key];
    now[param.key] = typeof over === 'string' ? over : param.value;
  }
  return now;
}

/** The keys that are not at their default, in source order. */
export function moved(read, overrides) {
  return read.params
    .filter((param) => typeof overrides?.[param.key] === 'string' && overrides[param.key] !== param.value)
    .map((param) => param.key);
}

/** The nearest keys to one that is not there, so a stale key is one glance. */
const nearest = (read) =>
  read.params
    .slice(0, 8)
    .map((param) => param.key)
    .join(', ');

/**
 * `value`, if it is one this parameter may hold — and a `Refused` saying why if
 * not.
 *
 * Exported because the SURFACE asks the same question before it shows anything,
 * which is one spelling of the rule rather than two.
 */
export function asValue(param, value) {
  if (typeof value !== 'string') {
    say(`${param.key}: a parameter is text, and this is ${value === null ? 'null' : `a ${typeof value}`}`);
  }
  const wanted = value.trim();
  const bad = unprintable(value);
  if (bad) {
    say(
      `${param.key}: holds the control character U+${bad.codePointAt(0).toString(16).padStart(4, '0').toUpperCase()}` +
        ' — this value reaches a command line',
    );
  }
  if (value.length > LONGEST) {
    say(`${param.key}: ${value.length} characters, and the longest a parameter may be is ${LONGEST}`);
  }
  // The default is what "put this back" means, so it is always allowed — which
  // is also the only way an empty parameter is ever written, and it is written
  // by being removed.
  if (value === param.value) return value;
  if (wanted === '') say(`${param.key}: empty, and its default is not — put it back rather than clearing it`);
  if (param.options && !param.options.includes(wanted)) {
    say(`${param.key}: "${wanted}" is not one of ${param.options.join(', ')}`);
  }
  // A number, if the recipe said so either way: by opening on one, or by
  // declaring a range. The second is not the same test — several of these open
  // EMPTY, because empty is what makes the generator fall back to its own answer
  // — and a range is the recipe saying what kind of thing may go in instead.
  if ((isNumber(param.value) || param.min !== null) && !isNumber(wanted)) {
    say(`${param.key}: "${wanted}" is not a number, and this parameter takes one`);
  }
  return wanted;
}

/**
 * The bytes of a Bake's `params.json` with `key` set to `value`.
 *
 * Throws `Refused` and writes nothing on anything it does not fully understand.
 *
 * @param {string} source the current contents of the Bake's params.json
 * @param {ReturnType<typeof recipe>} read the Bake's recipe
 * @param {string} key a parameter the recipe declares
 * @param {string} value
 * @returns {string} the file's new bytes
 */
export function write(source, read, key, value) {
  const param = read.params.find((one) => one.key === key);
  if (!param) say(`"${key}": no such parameter — this Bake declares ${nearest(read)}`);

  const wanted = asValue(param, value);
  const held = values(source);
  const next = { ...held };
  // A value back at its default loses its line: the file is what has MOVED.
  if (wanted === param.value) delete next[key];
  else next[key] = wanted;

  // Nothing to write, so nothing is written — and the comparison is on the
  // OVERRIDES rather than on the bytes, because the two are not the same
  // question when the file does not exist. Putting a parameter back that was
  // never moved leaves no file at all; comparing bytes would create one holding
  // `{}`, which reads in git as a Bake somebody tuned.
  if (Object.keys(next).length === Object.keys(held).length &&
      Object.keys(next).every((at) => held[at] === next[at])) {
    return source;
  }

  const bytes = serialise(next);
  // The self-check, and the reason a bug here is a refusal rather than a file a
  // generator reads wrong: read the output back and require exactly the pairs
  // that were meant to be in it.
  const back = values(bytes);
  const keys = Object.keys(next).sort();
  if (keys.join(',') !== Object.keys(back).sort().join(',')) {
    say(`${key}: writing that would change which parameters are set — refused, nothing written`);
  }
  for (const at of keys) {
    if (back[at] !== next[at]) say(`${key}: ${at} did not survive being written — refused, nothing written`);
  }
  return bytes === source ? source : bytes;
}

/** Sorted, two-space, one trailing newline. */
function serialise(overrides) {
  const sorted = {};
  for (const key of Object.keys(overrides).sort()) sorted[key] = overrides[key];
  return `${JSON.stringify(sorted, null, 2)}\n`;
}

// ---------------------------------------------------------------------------
// What the generator is actually run with
// ---------------------------------------------------------------------------

/** A `{key}` standing in a command word. */
const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9_.-]*)\}/g;

/**
 * The argument list a Bake is run with, from its recipe and its effective
 * values.
 *
 * Nothing here goes through a shell, so an argv element holding a space is a
 * path with a space in it rather than two arguments — which is why a space is
 * not among the characters refused, and a control character is: that is the one
 * that changes what a program sees.
 *
 * @param {ReturnType<typeof recipe>} read
 * @param {Record<string, string>} now  as `effective` gives them
 * @returns {string[]}
 */
export function command(read, now) {
  const argv = read.run.map((word) =>
    word.replace(PLACEHOLDER, (whole, key) => {
      const held = now[key];
      if (typeof held !== 'string') {
        say(`the command names {${key}}, and this Bake declares no such parameter`);
      }
      return held;
    }),
  );

  for (const param of read.params) {
    if (param.arg === null) continue;
    const held = now[param.key] ?? '';
    // A `when` makes the flag a switch: present only at that value, and never
    // followed by anything. `--crack` is the case, and it takes no argument.
    if (param.when !== null) {
      if (held === param.when) argv.push(param.arg);
      continue;
    }
    if (held.trim() === '') continue;
    if (param.words) argv.push(param.arg, ...held.trim().split(/\s+/));
    else argv.push(param.arg, held);
  }

  for (const word of argv) {
    const bad = unprintable(word);
    if (bad) {
      say(
        `"${word.slice(0, 40)}" holds the control character U+` +
          `${bad.codePointAt(0).toString(16).padStart(4, '0').toUpperCase()} — nothing is run with it`,
      );
    }
  }
  return argv;
}
