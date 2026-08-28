import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Refused, fields, write } from './content.mjs';

/**
 * The write boundary, at the bytes.
 *
 * This is the seam the whole Editor is tested at (ADR 0004, and #129's testing
 * decisions): the Editor is the one component whose bugs corrupt source files
 * rather than appearing on screen, so the assertion is on the file's bytes and
 * not on a rendered page.
 *
 * Every fixture below is a real shape out of a Section's content.ts — the
 * comments between fields, the long string written as a sum of two literals, the
 * tuple, the array of objects, the optional key. A boundary tested only against
 * a flat object would pass while destroying the file it was pointed at.
 */

const SOURCE = `import { defineContent, z } from '../../kernel/content';

/** A comment above the schema, holding a { brace } and a 'quote'. */
const schema = z.object({
  name: z.string().min(1),
  bio: z.array(z.string().min(1)).min(1),
});

export type Content = z.output<typeof schema>;

export const content = defineContent(schema, {
  name: 'Christian Juresh',
  /** A comment between two fields. */
  location: 'London, UK',
  bio: [
    'One paragraph.',
    'Another that is long enough to have been written as a sum ' +
      'of two literals, the way a real one is.',
  ],
  subheading: ['Self-stacking', 'photo gallery'],
  projects: { label: 'Projects', href: '#projects' },
  entries: [
    { name: 'Photo Vault', href: '#projects' },
    { name: 'Eater Map' },
  ],
});
`;

const valuesIn = (source) => new Map(fields(source).map((field) => [field.key, field.value]));

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

test('fields finds every string, at a dotted path, arrays indexed by number', () => {
  const found = valuesIn(SOURCE);

  assert.equal(found.get('name'), 'Christian Juresh');
  assert.equal(found.get('location'), 'London, UK');
  assert.equal(found.get('bio.0'), 'One paragraph.');
  assert.equal(found.get('subheading.1'), 'photo gallery');
  assert.equal(found.get('projects.href'), '#projects');
  assert.equal(found.get('entries.0.name'), 'Photo Vault');
  assert.equal(found.get('entries.1.name'), 'Eater Map');
});

test('fields joins a concatenation into the one string the page shows', () => {
  assert.equal(
    valuesIn(SOURCE).get('bio.1'),
    'Another that is long enough to have been written as a sum of two literals, the way a real one is.',
  );
});

test('fields reads the data literal and not the schema above it', () => {
  const keys = fields(SOURCE).map((field) => field.key);
  // The schema is full of strings-in-calls and braces; none of it is Content.
  assert.deepEqual(
    keys.filter((key) => key.startsWith('name') || key.startsWith('bio')),
    ['name', 'bio.0', 'bio.1'],
  );
});

test('fields refuses a file with no defineContent call', () => {
  assert.throws(() => fields('export const content = { name: 1 };'), Refused);
});

// ---------------------------------------------------------------------------
// Writing — the bytes, and nothing but the bytes
// ---------------------------------------------------------------------------

test('write changes the one literal and leaves every other byte alone', () => {
  const bytes = write(SOURCE, 'location', 'Lisbon, PT');

  assert.equal(bytes, SOURCE.replace("'London, UK'", "'Lisbon, PT'"));
  assert.equal(valuesIn(bytes).get('location'), 'Lisbon, PT');
});

test('write keeps the comments and the formatting around it', () => {
  const bytes = write(SOURCE, 'location', 'Lisbon, PT');

  assert.ok(bytes.includes('/** A comment between two fields. */'));
  assert.ok(bytes.includes("import { defineContent, z } from '../../kernel/content';"));
  assert.equal(bytes.split('\n').length, SOURCE.split('\n').length);
});

test('write replaces a whole concatenation with one literal', () => {
  const bytes = write(SOURCE, 'bio.1', 'Short now.');

  assert.ok(bytes.includes("'Short now.',"));
  assert.ok(!bytes.includes('of two literals'));
  assert.equal(valuesIn(bytes).get('bio.1'), 'Short now.');
});

test('write reaches into an array of objects by index', () => {
  const bytes = write(SOURCE, 'entries.1.name', 'Eater Atlas');

  assert.equal(valuesIn(bytes).get('entries.1.name'), 'Eater Atlas');
  assert.equal(valuesIn(bytes).get('entries.0.name'), 'Photo Vault');
});

test('write moves no other field', () => {
  const before = valuesIn(SOURCE);
  const after = valuesIn(write(SOURCE, 'name', 'Someone Else'));

  assert.deepEqual([...after.keys()], [...before.keys()]);
  for (const [key, value] of before) {
    if (key !== 'name') assert.equal(after.get(key), value, key);
  }
});

test('write escapes a quote and a backslash rather than breaking the literal', () => {
  const bytes = write(SOURCE, 'name', "O'Hara \\ and a backslash");

  assert.equal(valuesIn(bytes).get('name'), "O'Hara \\ and a backslash");
});

test('write keeps a typographic apostrophe as itself', () => {
  const bytes = write(SOURCE, 'name', 'I’m fine');

  assert.ok(bytes.includes("'I’m fine'"));
  assert.equal(valuesIn(bytes).get('name'), 'I’m fine');
});

test('write is idempotent, and writing the same value changes no byte', () => {
  assert.equal(write(SOURCE, 'name', 'Christian Juresh'), SOURCE);
});

// ---------------------------------------------------------------------------
// Refusals — malformed input is refused rather than written
// ---------------------------------------------------------------------------

test('write refuses a key that is not in the file', () => {
  assert.throws(() => write(SOURCE, 'nothing.like.this', 'x'), Refused);
});

test('write refuses a key that is not a string', () => {
  // An object and an array are Content's structure, not its words. Editing one
  // would mean re-serialising, which is what this boundary exists not to do.
  assert.throws(() => write(SOURCE, 'projects', 'x'), Refused);
  assert.throws(() => write(SOURCE, 'bio', 'x'), Refused);
});

test('write refuses a value that is not a string', () => {
  for (const value of [1, null, undefined, {}, ['a'], true]) {
    assert.throws(() => write(SOURCE, 'name', value), Refused, String(value));
  }
});

test('write refuses an empty value, because every Content string is min(1)', () => {
  assert.throws(() => write(SOURCE, 'name', ''), Refused);
  assert.throws(() => write(SOURCE, 'name', '   '), Refused);
});

test('write refuses a newline or any other control character', () => {
  for (const value of ['two\nlines', 'a\ttab', `a${String.fromCharCode(0)}null`, 'a\rreturn']) {
    assert.throws(() => write(SOURCE, 'name', value), Refused, JSON.stringify(value));
  }
});

test('write refuses a runaway paste', () => {
  assert.throws(() => write(SOURCE, 'name', 'x'.repeat(4001)), Refused);
});

test('a refusal says which key and why', () => {
  assert.throws(
    () => write(SOURCE, 'projects', 'x'),
    (error) => error instanceof Refused && /projects/.test(error.message),
  );
});
