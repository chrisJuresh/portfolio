import assert from 'node:assert/strict';
import { test } from 'node:test';

import { TEXT } from './annotations.mjs';
import { headline, moved, report } from './changes.mjs';

/**
 * The Recording, on its own.
 *
 * Most of what is asserted here is about what the document must NOT say, because
 * this is a document an agent acts on: a change reported as unwritten when it has
 * already been written gets applied twice, and the second application is
 * arithmetic on a number that has already moved — silently wrong rather than a
 * no-op. The rest is the format holding its shape as the thing it describes grows,
 * which is the whole reason it is not `annotate()` twenty times over.
 */

/** A `measurement()` record, as `client/measure.js` builds one. */
const measured = (over = {}) => ({
  named: { phrase: 'the Projects Panel’s Frame', vocabulary: true, part: 'frame' },
  selector: '.projects-panel__frame',
  viewport: { width: 1512, height: 860 },
  root: 16,
  parent: { phrase: 'the Projects Panel’s Stage', width: 1200, height: 700 },
  before: { left: 120, top: 40, width: 800, height: 450 },
  after: { left: 120, top: 40, width: 960, height: 540 },
  text: { before: 18, after: 18 },
  translate: { x: 0, y: 0 },
  promoted: false,
  tokens: [],
  ...over,
});

const entry = (over = {}) => ({ measured: measured(over.measured), scaled: over.scaled ?? null });

test('only what moved takes a row', () => {
  const text = report({ entries: [entry()] });
  assert.match(text, /^   width/m);
  assert.match(text, /^   height/m);
  // left and top did not move, so they are not rows: twenty elements printing
  // eighty axes to say something about nineteen of them is a worse document.
  assert.doesNotMatch(text, /^   left/m);
  assert.doesNotMatch(text, /^   top/m);
});

test('a delta that rounds away is not a change', () => {
  const still = entry({
    measured: { after: { left: 120, top: 40, width: 800.001, height: 450 } },
  });
  assert.deepEqual(moved(still.measured), []);
  assert.match(report({ entries: [still] }), /nothing moved/);
});

test('every number is a share of what the composition is written in', () => {
  const text = report({ entries: [entry()] });
  // A box against its parent…
  assert.match(text, /0\.667 → 0\.8\b/);
  // …and a text size against the ROOT, because that is the unit a type ladder is
  // written in and whether this one is rem or px is the change to make.
  const retyped = entry({ measured: { text: { before: 18, after: 21.6 } } });
  assert.match(report({ entries: [retyped] }), /1\.125 → 1\.35 × root/);
});

test('a written value is kept out of the measured blocks, under a heading that says not to reapply it', () => {
  const text = report({
    entries: [entry()],
    written: [
      {
        kind: 'token',
        what: '--projects-panel-frame-width',
        value: '80%',
        file: 'src/sections/projects-panel/tokens.css',
        where: 'a Token',
      },
    ],
  });
  assert.match(text, /ALREADY WRITTEN — do not apply these again/);
  assert.match(text, /--projects-panel-frame-width = 80%/);
  assert.match(text, /1 value already written/);
});

test('an Override in the written list is called debt, because that is what it is', () => {
  const text = report({
    entries: [],
    written: [
      {
        kind: 'override',
        what: '.projects-panel__frame',
        value: 'width: 960px; height: 540px',
        file: 'src/overrides.css',
        where: 'an Override',
      },
    ],
  });
  assert.match(text, /debt by construction/);
  assert.match(text, /src\/overrides\.css/);
});

test('a Token nothing can write is reported with its reason and never as a value to set', () => {
  const text = report({
    entries: [
      entry({
        measured: {
          tokens: [
            {
              axis: 'width',
              property: 'width',
              token: 'width',
              selector: '.projects-panel__frame',
              section: null,
              key: null,
              was: 'clamp(20rem, 40vw, 60rem)',
              wants: null,
              why: 'it is a relationship built out of nothing this can restate',
            },
          ],
        },
      }),
    ],
  });
  // Wrapped to the report's width, so the sentence can break at any space — which
  // is why this looks for it across a line rather than on one.
  assert.match(text, /not a Token\s+the Editor can write/);
  assert.match(text, /clamp\(20rem, 40vw, 60rem\)/);
  assert.doesNotMatch(text, /→ null/);
});

test('a Kernel Token names the file it is actually in', () => {
  const text = report({
    entries: [
      entry({
        measured: {
          tokens: [
            {
              axis: 'width',
              property: 'width',
              token: '--effects-veil-width',
              selector: ':root',
              section: 'kernel-effects',
              key: '0:--effects-veil-width',
              was: '40rem',
              wants: '60rem',
              why: null,
            },
          ],
        },
      }),
    ],
  });
  // NOT src/sections/kernel-effects/tokens.css, which is a path that does not
  // exist — the Effect Stack's Tokens are the Kernel's, and the Measure surface
  // can reach every one of them.
  assert.match(text, /src\/kernel\/tokens\/effects\.css/);
  assert.doesNotMatch(text, /src\/sections\/kernel-effects/);
});

test('a scaled text size says it was not scrubbed, and by what ratio', () => {
  const text = report({
    entries: [entry({ measured: { text: { before: 18, after: 21.6 } }, scaled: { by: 1.2 } })],
  });
  assert.match(text, /followed the box/);
  assert.match(text, /×1\.2/);
});

test('the composing caveat is there only when changes were kept', () => {
  assert.match(report({ entries: [entry()], kept: true }), /they COMPOSE/);
  assert.doesNotMatch(report({ entries: [entry()], kept: false }), /they COMPOSE/);
});

test('a part with no glossary term is named once in a footer, not once per block', () => {
  const nameless = entry({
    measured: { named: { phrase: 'the Projects Panel’s address text', vocabulary: false, part: 'address-text' } },
  });
  const text = report({ entries: [nameless, nameless] });
  assert.equal(text.match(/has no word for/g).length, 1);
  assert.match(text, /address-text/);
});

test('the caveats are said once however many elements there are', () => {
  const many = Array.from({ length: 12 }, () => entry());
  const text = report({ entries: many });
  assert.equal(text.match(/not an instruction to hard-code them/g).length, 1);
  assert.equal(text.match(/^12\. /m) !== null, true);
  assert.equal(text.match(/^1\. /m) !== null, true);
});

test('an empty session says so rather than producing a document about nothing', () => {
  assert.match(report({ entries: [], written: [] }), /Nothing has been measured yet/);
});

test('a headline names what changed, and says so when nothing did', () => {
  assert.match(headline(entry()), /width \+160px and height \+90px/);
  assert.match(
    headline(entry({ measured: { after: { left: 120, top: 40, width: 800, height: 450 } } })),
    /nothing moved/,
  );
  assert.match(
    headline(entry({ measured: { text: { before: 18, after: 21.6 } } })),
    /text size to 21\.6px/,
  );
});

test('moved() counts the text size beside the four axes and never among them', () => {
  const retyped = measured({ after: { left: 120, top: 40, width: 800, height: 450 }, text: { before: 18, after: 20 } });
  assert.deepEqual(moved(retyped), [TEXT]);
});

test('a measurement with no text at all reports on the box and says nothing about type', () => {
  // An honest absence: a caller that did not look at the type says nothing rather
  // than reporting a zero, which is `annotate()`'s rule for the same field.
  const text = report({ entries: [entry({ measured: { text: null } })] });
  assert.doesNotMatch(text, /text size/);
  assert.match(text, /^   width/m);
});

test('an axis already written is marked on the axis, not only in the list at the foot', () => {
  const governed = entry({
    measured: {
      tokens: [
        {
          axis: 'width', property: 'width', token: '--projects-panel-frame-width',
          selector: '.projects-panel', section: 'projects-panel',
          key: '0:--projects-panel-frame-width', was: '66.7%', wants: '80%', why: null,
        },
      ],
    },
  });
  const text = report({
    entries: [governed],
    written: [
      {
        kind: 'token', what: '--projects-panel-frame-width', value: '80%',
        file: 'src/sections/projects-panel/tokens.css', where: 'a Token',
      },
    ],
  });
  // An element whose width landed and whose height did not is the case an agent
  // has to get right, and a reader should not have to match a custom property
  // against a block to work out which half is done.
  assert.match(text, /width is --projects-panel-frame-width — 66\.7% → 80%\s+\[ALREADY WRITTEN/);
  assert.doesNotMatch(text, /height is .*ALREADY WRITTEN/);
});

test('a Token written to a DIFFERENT value leaves the axis unmarked', () => {
  // The mark is derived, and this is the case it exists to get right: the Token was
  // written, and then the author moved the box again. What is in the file is not
  // what this block asks for, so the block is an instruction and not a duplicate.
  const governed = entry({
    measured: {
      tokens: [
        {
          axis: 'width', property: 'width', token: '--projects-panel-frame-width',
          selector: '.projects-panel', section: 'projects-panel',
          key: '0:--projects-panel-frame-width', was: '80%', wants: '90%', why: null,
        },
      ],
    },
  });
  const text = report({
    entries: [governed],
    written: [
      {
        kind: 'token', what: '--projects-panel-frame-width', value: '80%',
        file: 'src/sections/projects-panel/tokens.css', where: 'a Token',
      },
    ],
  });
  assert.doesNotMatch(text, /→ 90%\s+\[ALREADY WRITTEN/);
});

test('an Override in the written list never marks a Token line', () => {
  // Two different kinds of thing, and only one of them means "this Token already
  // holds that". An Override with a coincidentally matching value must not silence
  // a real instruction.
  const governed = entry({
    measured: {
      tokens: [
        {
          axis: 'width', property: 'width', token: '--projects-panel-frame-width',
          selector: '.projects-panel', section: 'projects-panel',
          key: '0:--projects-panel-frame-width', was: '66.7%', wants: '80%', why: null,
        },
      ],
    },
  });
  const text = report({
    entries: [governed],
    written: [
      {
        kind: 'override', what: '--projects-panel-frame-width', value: '80%',
        file: 'src/overrides.css', where: 'an Override',
      },
    ],
  });
  assert.doesNotMatch(text, /→ 80%\s+\[ALREADY WRITTEN/);
});

test('an axis not written carries no mark', () => {
  const text = report({ entries: [entry()] });
  assert.doesNotMatch(text, /ALREADY WRITTEN/);
});
