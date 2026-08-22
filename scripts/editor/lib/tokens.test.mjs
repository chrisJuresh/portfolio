import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Refused } from './content.mjs';
import { amount, colour, control, tokens, write } from './tokens.mjs';

/**
 * The Tokens half of the write boundary, at the bytes.
 *
 * Same seam and same reason as `content.test.mjs` (ADR 0004, and #129's testing
 * decisions): a bug here corrupts a source file rather than showing up on
 * screen, so the assertion is on the file's bytes.
 *
 * The fixture below is every shape a real `tokens.css` holds — a file header
 * above the rule, section headings inside it, a paragraph explaining four
 * Tokens at once, a `clamp()` and a `calc()` and a `color-mix()`, a hex and an
 * `rgba()`, a keyword, a negative ratio, both spellings of a duration, and the
 * same property declared twice because the dark paper changes it. A boundary
 * tested against a flat list of lengths would pass while destroying the file it
 * was pointed at.
 */

const SOURCE = `/* The stub Section's Tokens: plain custom properties on the Section's own root,
   and the only style file the Editor writes. */
.stub {
  --stub-height: 240svh;
  --stub-measure: 34rem;

  /* ---- the type, and how it is set ---------------------------------------
     A paragraph under the heading, saying what these four do and why the
     clamp is the composition's rather than the Editor's. */
  --stub-heading-size: clamp(2.5rem, 9vmin, 6rem);
  --stub-heading-weight: 400;
  --stub-lead-leading: 1.55;
  --stub-rule: 1px;

  /* The palette. */
  --stub-ink: #f2f1ee;
  --stub-veil: rgba(242, 241, 238, 0.16);
  --stub-muted: color-mix(in oklab, var(--ink), var(--ground) 45%);
  --stub-sub: calc(0.625 * var(--stub-heading-size));

  --stub-word: inline;
  --stub-lean: -0.5;
  --stub-settle: 0.32s;
  --stub-wait: 140ms;
}

/* What the dark paper changes. */
:root[data-theme='dark'] .stub {
  --stub-word: none;
  --stub-veil: rgba(0, 0, 0, 0.4);
}
`;

const byKey = (source) => new Map(tokens(source).map((token) => [token.key, token]));

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

test('tokens finds every declaration, in source order, with its rule', () => {
  const found = tokens(SOURCE);

  assert.equal(found.length, 16);
  assert.equal(found[0].property, '--stub-height');
  assert.equal(found[0].value, '240svh');
  assert.equal(found[0].selector, '.stub');
  assert.equal(found[0].rule, 0);
  assert.equal(found.at(-1).property, '--stub-veil');
  assert.equal(found.at(-1).value, 'rgba(0, 0, 0, 0.4)');
  assert.equal(found.at(-1).selector, ":root[data-theme='dark'] .stub");
  assert.equal(found.at(-1).rule, 1);
});

test('tokens keeps a value that holds commas and brackets whole', () => {
  const found = byKey(SOURCE);

  assert.equal(found.get('0:--stub-heading-size').value, 'clamp(2.5rem, 9vmin, 6rem)');
  assert.equal(
    found.get('0:--stub-muted').value,
    'color-mix(in oklab, var(--ink), var(--ground) 45%)',
  );
  assert.equal(found.get('0:--stub-sub').value, 'calc(0.625 * var(--stub-heading-size))');
});

test('a key names the rule as well as the property, so a Token declared twice is two controls', () => {
  const found = byKey(SOURCE);

  assert.equal(found.get('0:--stub-word').value, 'inline');
  assert.equal(found.get('1:--stub-word').value, 'none');
  assert.equal(found.get('0:--stub-veil').value, 'rgba(242, 241, 238, 0.16)');
  assert.equal(found.get('1:--stub-veil').value, 'rgba(0, 0, 0, 0.4)');
});

test('a Token is grouped under the comment above it, and carries the whole of it', () => {
  const found = byKey(SOURCE);

  // Nothing above it inside the rule: the rule itself is the group.
  assert.equal(found.get('0:--stub-height').group, null);

  // A decorated heading gives up its own words, and the paragraph under it is
  // the note — those comments are what say what a Token does.
  const heading = found.get('0:--stub-heading-weight');
  assert.equal(heading.group, 'the type, and how it is set');
  assert.match(heading.note, /clamp is the composition's/);

  // An undecorated one-line comment is a heading too.
  assert.equal(found.get('0:--stub-ink').group, 'The palette.');

  // A Token after a group, with a blank line and no comment of its own, is
  // still that group's: the file says where a group starts and never where it
  // ends, so the last heading seen is the answer.
  assert.equal(found.get('0:--stub-word').group, 'The palette.');
});

test('tokens refuses a file it cannot read as a flat list of rules', () => {
  assert.throws(() => tokens('@media (min-width: 40rem) { .stub { --stub-rule: 2px; } }'), Refused);
  assert.throws(() => tokens('.stub { --stub-rule: 1px;'), Refused);
  assert.throws(() => tokens('.stub { --stub-rule }'), Refused);
  assert.throws(() => tokens(42), Refused);
});

// ---------------------------------------------------------------------------
// What kind of control a value asks for
// ---------------------------------------------------------------------------

test('control reads a number and its unit, and a range around the value in the file', () => {
  const measure = control('34rem');
  assert.equal(measure.kind, 'number');
  assert.equal(measure.number, 34);
  assert.equal(measure.unit, 'rem');
  assert.equal(measure.min, 0);
  assert.equal(measure.max, 136);

  assert.equal(control('1.55').kind, 'number');
  assert.equal(control('1.55').unit, '');
  assert.equal(control('140ms').unit, 'ms');
  assert.equal(control('240svh').unit, 'svh');
  assert.equal(control('45%').unit, '%');
});

test('a negative number gets a range on both sides of nothing', () => {
  const lean = control('-0.5');
  assert.equal(lean.min, -2);
  assert.equal(lean.max, 2);
});

test('a step is fine enough to move the last digit the file holds', () => {
  assert.ok(control('0.5651').step <= 0.001, 'a four-decimal share needs a step of 0.001 or finer');
  assert.ok(control('0.0095').step <= 0.0001);
  assert.equal(control('400').step, 1);
});

test('control reads a colour, hex or rgba, as a colour and an alpha', () => {
  assert.deepEqual(control('#f2f1ee'), { kind: 'colour', hex: '#f2f1ee', alpha: 1 });
  assert.deepEqual(control('#000'), { kind: 'colour', hex: '#000000', alpha: 1 });
  assert.deepEqual(control('rgba(242, 241, 238, 0.16)'), {
    kind: 'colour',
    hex: '#f2f1ee',
    alpha: 0.16,
  });
  assert.deepEqual(control('rgb(0, 0, 0)'), { kind: 'colour', hex: '#000000', alpha: 1 });
});

test('a relationship is text, not a slider', () => {
  // ADR 0004: these compositions are held together by relationships, and a
  // control that dragged one end of one would destroy it rather than edit it.
  for (const value of [
    'clamp(2.5rem, 9vmin, 6rem)',
    'calc(0.625 * var(--stub-heading-size))',
    'color-mix(in oklab, var(--ink), var(--ground) 45%)',
    'var(--ink)',
    'inline',
    'none',
  ]) {
    assert.equal(control(value).kind, 'text', `${value} should be text`);
  }
});

test('amount and colour write a value back without float noise', () => {
  assert.equal(amount(0.30000000000000004, 'rem', 0.001), '0.3rem');
  assert.equal(amount(34, 'rem', 0.1), '34rem');
  assert.equal(amount(400, '', 1), '400');
  assert.equal(colour('#f2f1ee', 1), '#f2f1ee');
  assert.equal(colour('#f2f1ee', 0.16), 'rgba(242, 241, 238, 0.16)');
});

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/** Everything the write did not touch, so "one value moved" is an assertion. */
const around = (source, key) => {
  const token = byKey(source).get(key);
  return { before: source.slice(0, token.start), after: source.slice(token.end) };
};

test('write puts new bytes where the value was, and copies the rest verbatim', () => {
  const bytes = write(SOURCE, '0:--stub-measure', '40rem');

  assert.equal(byKey(bytes).get('0:--stub-measure').value, '40rem');
  assert.deepEqual(around(bytes, '0:--stub-measure'), around(SOURCE, '0:--stub-measure'));
  assert.equal(bytes.split('\n').length, SOURCE.split('\n').length);
  assert.ok(bytes.includes('the only style file the Editor writes'), 'the comments survive');
  assert.ok(
    bytes.includes('--stub-heading-size: clamp(2.5rem, 9vmin, 6rem);'),
    'its neighbours do not move',
  );
});

test('write reaches the rule the key names and not the other one', () => {
  const bytes = write(SOURCE, '1:--stub-word', 'block');
  const found = byKey(bytes);

  assert.equal(found.get('1:--stub-word').value, 'block');
  assert.equal(found.get('0:--stub-word').value, 'inline');
});

test('write returns the source untouched when the value is already that', () => {
  assert.equal(write(SOURCE, '0:--stub-measure', '34rem'), SOURCE);
});

test('write refuses a key that is not there, and says what is', () => {
  assert.throws(
    () => write(SOURCE, '0:--stub-nothing', '1px'),
    (error) => {
      assert.ok(error instanceof Refused);
      assert.match(error.message, /--stub-measure/);
      return true;
    },
  );
  assert.throws(() => write(SOURCE, '9:--stub-measure', '1px'), Refused);
  assert.throws(() => write(SOURCE, '--stub-measure', '1px'), Refused);
  assert.throws(() => write(SOURCE, '', '1px'), Refused);
});

test('write refuses a key whose property is not the one at that rule', () => {
  // A stale key from a panel built against an older file must be a refusal and
  // never a write to whatever now stands in that position.
  assert.throws(() => write(SOURCE, '1:--stub-measure', '1px'), Refused);
});

test('write refuses anything that would not stay one value', () => {
  const refused = [
    ['1px; --stub-measure: 0', 'a second declaration'],
    ['1px }', 'the end of the rule'],
    ['{ 1px', 'the start of one'],
    ['1px /* smuggled */', 'a comment'],
    ['*/ 1px', 'the end of one'],
    ['calc(1px', 'an unclosed bracket'],
    ['1px)', 'a bracket that closes nothing'],
    ['1px !important', 'a weapon rather than a value'],
    ['1px\n2px', 'a line break'],
    ['1px\tred', 'a tab'],
    ['', 'nothing'],
    ['   ', 'nothing but space'],
  ];
  for (const [value, why] of refused) {
    assert.throws(() => write(SOURCE, '0:--stub-rule', value), Refused, `${why} was allowed`);
  }
});

test('write refuses a value that is not a string, and one that is a runaway', () => {
  assert.throws(() => write(SOURCE, '0:--stub-rule', 2), Refused);
  assert.throws(() => write(SOURCE, '0:--stub-rule', null), Refused);
  assert.throws(() => write(SOURCE, '0:--stub-rule', 'a'.repeat(1000)), Refused);
});

test('write refuses to replace a value a comment is standing inside', () => {
  // Replacing the span would delete the comment, and the Editor does not.
  const commented = '.stub {\n  --stub-rule: 1px /* measured */ solid;\n}\n';
  assert.throws(() => write(commented, '0:--stub-rule', '2px solid'), Refused);
});

test('write refuses rather than moving anything else', () => {
  // The self-check, the same one content.mjs runs: read the output back and
  // require the same declarations in the same order with one value changed.
  const bytes = write(SOURCE, '0:--stub-lean', '-0.25');
  const before = tokens(SOURCE);
  const after = tokens(bytes);

  assert.equal(after.length, before.length);
  for (const [i, token] of after.entries()) {
    assert.equal(token.key, before[i].key);
    assert.equal(token.value, token.key === '0:--stub-lean' ? '-0.25' : before[i].value);
  }
});
