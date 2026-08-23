import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Refused } from './content.mjs';
import { EMPTY, LONGEST_FILE, PROPERTIES, parse, render, write } from './overrides.mjs';

/**
 * The Overrides write boundary, at the bytes.
 *
 * Same seam and same reason as `content.test.mjs` and `tokens.test.mjs` (ADR
 * 0004, and #129's testing decisions): a bug here corrupts a source file rather
 * than showing up on screen.
 *
 * ONE THING HERE IS THE OPPOSITE OF THE OTHER TWO BOUNDARIES, and it is what
 * most of these assertions are about. Content and Tokens are AUTHORED files, so
 * those two replace one span and never re-serialise. This file is GENERATED and
 * the Editor is its only writer, so this one always re-serialises — and what
 * pays for that is the round trip: a file whose bytes are not exactly what
 * `render` would have produced is refused rather than rewritten, so a hand edit
 * is a refusal and never a silent clobber.
 */

const FRAME = ':root #projects-panel .projects-panel__frame';
const RAIL = ':root #projects-panel .projects-panel__rail';

const moved = {
  selector: FRAME,
  name: 'the Projects Panel’s Frame',
  note: ['moved by 24px, -8px — measured at 1440×900'],
  declarations: { translate: '24px -8px' },
};

const BLOCK = [
  '/* the Projects Panel’s Frame',
  '   moved by 24px, -8px — measured at 1440×900 */',
  FRAME + ' {',
  '  translate: 24px -8px !important;',
  '}',
  '',
].join('\n');

// ---------------------------------------------------------------------------
// A file with nothing in it
// ---------------------------------------------------------------------------

test('a fresh file holds no Overrides', () => {
  assert.deepEqual(parse(EMPTY), []);
  assert.equal(render([]), EMPTY);
  assert.ok(EMPTY.endsWith('\n'), 'the file ends with a newline');
});

test('every property the boundary will write is one it names', () => {
  assert.deepEqual(PROPERTIES, ['display', 'translate', 'width', 'height']);
});

test('display takes one value, because it is here to make an inline box measurable', () => {
  const bytes = write(EMPTY, { ...moved, declarations: { display: 'inline-block', width: '4rem' } });
  assert.match(bytes, /\n {2}display: inline-block !important;\n {2}width: 4rem !important;\n}/);
  for (const value of ['block', 'flex', 'none', 'inline', 'inline-Block']) {
    assert.throws(
      () => write(EMPTY, { ...moved, declarations: { display: value } }),
      (error) => {
        assert.ok(error instanceof Refused);
        assert.match(error.message, /only set display to inline-block/);
        return true;
      },
      value,
    );
  }
});

// ---------------------------------------------------------------------------
// Writing one
// ---------------------------------------------------------------------------

test('an Override is a named comment, a selector, and one declaration per property', () => {
  const bytes = write(EMPTY, moved);
  assert.ok(bytes.endsWith('\n' + BLOCK), 'wrote:\n' + bytes);
  assert.ok(bytes.startsWith(EMPTY.slice(0, EMPTY.indexOf('*/') + 2)), 'the header survives');

  const [record] = parse(bytes);
  assert.equal(record.selector, FRAME);
  assert.equal(record.name, 'the Projects Panel’s Frame');
  assert.deepEqual(record.note, ['moved by 24px, -8px — measured at 1440×900']);
  assert.deepEqual(record.declarations, [{ property: 'translate', value: '24px -8px' }]);
});

test('every declaration carries !important, because an Override outranks the composition', () => {
  const bytes = write(EMPTY, { ...moved, declarations: { width: '720px', height: '420px' } });
  assert.match(bytes, /\n {2}width: 720px !important;\n {2}height: 420px !important;\n}/);
  assert.deepEqual(parse(bytes)[0].declarations, [
    { property: 'width', value: '720px' },
    { property: 'height', value: '420px' },
  ]);
});

test('a note may run to several lines, and none of them leaves the comment', () => {
  const bytes = write(EMPTY, { ...moved, note: ['moved by 24px, -8px', 'measured at 1440x900'] });
  assert.ok(bytes.includes('   moved by 24px, -8px\n   measured at 1440x900 */\n'), bytes);
  assert.deepEqual(parse(bytes)[0].note, ['moved by 24px, -8px', 'measured at 1440x900']);
});

test('an Override with no note is a comment holding only the name', () => {
  const bytes = write(EMPTY, { ...moved, note: [] });
  assert.ok(bytes.includes('/* the Projects Panel’s Frame */\n:root '), bytes);
  assert.deepEqual(parse(bytes)[0].note, []);
});

// ---------------------------------------------------------------------------
// Writing a second, replacing the first, and taking one away
// ---------------------------------------------------------------------------

const rail = { selector: RAIL, name: 'the Rail', note: [], declarations: { width: '12rem' } };

test('a second selector is appended, and the first is untouched', () => {
  const one = write(EMPTY, moved);
  const two = write(one, rail);
  assert.ok(two.startsWith(one.slice(0, -1)), 'the first record’s bytes are exactly what they were');
  assert.deepEqual(
    parse(two).map((record) => record.selector),
    [FRAME, RAIL],
  );
});

test('writing the same selector again replaces it where it stands', () => {
  const two = write(write(EMPTY, moved), rail);
  const again = write(two, { ...moved, note: ['moved by 30px, 0'], declarations: { translate: '30px 0' } });
  assert.deepEqual(
    parse(again).map((record) => record.selector),
    [FRAME, RAIL],
    'the replaced record keeps its position, so the diff stays one record wide',
  );
  assert.deepEqual(parse(again)[0].declarations, [{ property: 'translate', value: '30px 0' }]);
  assert.equal(parse(again)[1].declarations[0].value, '12rem');
});

test('writing what is already there returns the same bytes', () => {
  const one = write(EMPTY, moved);
  assert.equal(write(one, moved), one);
});

test('an Override with no declarations is discarded, and the file goes back', () => {
  const one = write(EMPTY, moved);
  assert.equal(write(one, { selector: FRAME, declarations: {} }), EMPTY);
});

test('discarding one of two leaves the other exactly as it was', () => {
  const two = write(write(EMPTY, moved), rail);
  const left = write(two, { selector: FRAME, declarations: {} });
  assert.deepEqual(
    parse(left).map((record) => record.selector),
    [RAIL],
  );
  assert.equal(parse(left)[0].declarations[0].value, '12rem');
});

test('discarding an Override that is not there is a refusal, and says what is', () => {
  assert.throws(
    () => write(write(EMPTY, moved), { selector: RAIL, declarations: {} }),
    (error) => {
      assert.ok(error instanceof Refused);
      assert.match(error.message, /no Override/);
      assert.match(error.message, /projects-panel__frame/);
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// The round trip, which is what pays for re-serialising
// ---------------------------------------------------------------------------

test('what render writes, parse reads back, and render writes again', () => {
  const two = write(write(EMPTY, moved), {
    ...rail,
    note: ['narrowed from 14rem', 'measured at 1440x900'],
  });
  assert.equal(render(parse(two)), two);
});

test('a file the Editor did not write is refused rather than rewritten', () => {
  const one = write(EMPTY, moved);
  for (const [what, source] of [
    ['a hand-added rule', one + '.projects-panel { color: red; }\n'],
    ['a missing header', BLOCK],
    ['a re-indented record', one.replace('\n  translate', '\n    translate')],
    ['a dropped !important', one.replace(' !important', '')],
    ['an @media around it', EMPTY + '\n@media (min-width: 40rem) { .a { width: 1px; } }\n'],
    ['a blank line inside a record', one.replace('{\n  translate', '{\n\n  translate')],
  ]) {
    assert.throws(
      () => write(source, moved),
      (error) => {
        assert.ok(error instanceof Refused, what + ': ' + error);
        return true;
      },
      what,
    );
  }
});

// ---------------------------------------------------------------------------
// What it refuses
// ---------------------------------------------------------------------------

test('only the three properties, and by name', () => {
  for (const property of ['color', 'position', 'inset', 'Translate', '--x', 'translate ']) {
    assert.throws(
      () => write(EMPTY, { ...moved, declarations: { [property]: '1px' } }),
      (error) => {
        assert.ok(error instanceof Refused);
        assert.match(error.message, /translate, width and height/);
        return true;
      },
      property,
    );
  }
});

test('an Override with no property at all is a refusal and not an empty rule', () => {
  assert.throws(() => write(EMPTY, { ...moved, declarations: {} }), Refused);
});

test('a value that could leave the declaration is refused', () => {
  for (const value of ['1px; color: red', '1px }', '1px !important', '1px /* x', '', '   ', '1px\n2px', 42]) {
    assert.throws(
      () => write(EMPTY, { ...moved, declarations: { width: value } }),
      Refused,
      JSON.stringify(value),
    );
  }
});

test('a selector is an Override’s selector or it is nothing', () => {
  for (const selector of [
    '#projects-panel .frame',
    ':root #a, :root #b',
    ':root #a[data-x]',
    ':root #a:hover',
    ':root #a { color: red }',
    ':root',
    ':root  #a',
    ':root > #a',
    ':root #a >',
    ':root #a > > .b',
    ':root #a + .b',
    ':root #a ~ .b',
    ':root .a/*',
    ':root .a!',
    '',
    42,
  ]) {
    assert.throws(() => write(EMPTY, { ...moved, selector }), Refused, JSON.stringify(selector));
  }
});

test('a selector the client actually builds is accepted', () => {
  for (const selector of [
    ':root #projects-panel .projects-panel__frame',
    ':root #front-screen .front-screen__strip img:nth-of-type(3)',
    ':root #projects-panel div.projects-panel__inner span',
    // The child combinator, which the Panel needs: its Plinth holds a live clone
    // of the Frame, so no descendant-only chain tells the two apart.
    ':root .projects-panel__stage > .projects-panel__frame',
    ':root #projects-panel > div > span:nth-of-type(2)',
  ]) {
    assert.doesNotThrow(() => write(EMPTY, { ...moved, selector }), selector);
  }
});

test('a name or a note cannot close the comment it is inside', () => {
  assert.throws(() => write(EMPTY, { ...moved, name: 'the Frame */ .a {' }), Refused);
  assert.throws(() => write(EMPTY, { ...moved, note: ['fine', 'not */ fine'] }), Refused);
  assert.throws(() => write(EMPTY, { ...moved, name: 'the\nFrame' }), Refused);
  assert.throws(() => write(EMPTY, { ...moved, name: '' }), Refused);
  assert.throws(() => write(EMPTY, { ...moved, note: 'not an array' }), Refused);
});

test('the file has a ceiling, because an Override is debt and not a stylesheet', () => {
  let bytes = EMPTY;
  for (let i = 0; i < LONGEST_FILE; i += 1) {
    bytes = write(bytes, { ...moved, selector: ':root #projects-panel .a' + i });
  }
  assert.equal(parse(bytes).length, LONGEST_FILE);
  assert.throws(
    () => write(bytes, { ...moved, selector: ':root #projects-panel .one-too-many' }),
    (error) => {
      assert.ok(error instanceof Refused);
      assert.match(error.message, new RegExp(String(LONGEST_FILE)));
      return true;
    },
  );
});

test('the change itself has to be a change', () => {
  for (const change of [null, 'a string', { declarations: { width: '1px' } }, { selector: FRAME }]) {
    assert.throws(() => write(EMPTY, change), Refused, JSON.stringify(change));
  }
});

test('the source has to be a string', () => {
  assert.throws(() => write(null, moved), Refused);
  assert.throws(() => parse(42), Refused);
});
