import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { TEXT, annotate, asUnit, name, nudge, restate, terms } from './annotations.mjs';

/**
 * The Annotation, as text.
 *
 * THIS IS THE DELIVERABLE AND NOT A DETAIL. #145's output is a measured
 * instruction the author pastes to an agent, so the sentence IS the product —
 * which makes it the one part of the measuring surface worth testing in node:
 * reading geometry off the page needs a browser and asserts nothing interesting,
 * and turning numbers into words needs neither.
 *
 * The vocabulary half is tested against the real `CONTEXT.md` as well as a
 * fixture, because the glossary being the authority is the whole mechanism: an
 * element is named in the glossary's words or the Annotation says it could not
 * be, and nothing in the Editor holds a second list of terms to drift from it.
 */

const CONTEXT = readFileSync(fileURLToPath(new URL('../../../CONTEXT.md', import.meta.url)), 'utf8');
const GLOSSARY = terms(CONTEXT);

// ---------------------------------------------------------------------------
// The vocabulary
// ---------------------------------------------------------------------------

test('the glossary is read out of CONTEXT.md and not held anywhere else', () => {
  for (const term of ['Portfolio', 'Section', 'Front Screen', 'Projects Panel', 'Rail', 'Frame', 'Plinth', 'Cut Title', 'Timeline', 'Token', 'Override', 'Annotation']) {
    assert.ok(GLOSSARY.includes(term), `${term} is in CONTEXT.md and should be a term`);
  }
  assert.ok(!GLOSSARY.includes('Avoid'), 'the Avoid lines are not terms');
  assert.ok(GLOSSARY.length > 20 && GLOSSARY.length < 60, `${GLOSSARY.length} terms`);
});

test('a term is a bolded line ending in a colon, and nothing else is', () => {
  const found = terms(['**Frame**:', 'The browser window.', '_Avoid_: window', '**Not a term** in a sentence', '**Plinth**:'].join('\n'));
  assert.deepEqual(found, ['Frame', 'Plinth']);
});

test('a Section’s own name comes from its folder', () => {
  assert.equal(name({ section: 'projects-panel', root: true }, GLOSSARY).phrase, 'the Projects Panel');
  assert.equal(name({ section: 'front-screen', root: true }, GLOSSARY).phrase, 'the Front Screen');
  assert.equal(name({ section: 'projects-panel', root: true }, GLOSSARY).vocabulary, true);
});

test('a part the glossary names is named the glossary’s way', () => {
  for (const [part, phrase] of [
    ['frame', 'the Projects Panel’s Frame'],
    ['plinth', 'the Projects Panel’s Plinth'],
    ['rail', 'the Projects Panel’s Rail'],
    ['cut-title', 'the Projects Panel’s Cut Title'],
  ]) {
    const named = name({ section: 'projects-panel', part }, GLOSSARY);
    assert.equal(named.phrase, phrase);
    assert.equal(named.vocabulary, true);
  }
});

test('a part the glossary does not name says so rather than inventing a term', () => {
  const named = name({ section: 'projects-panel', part: 'address-text', tag: 'span' }, GLOSSARY);
  assert.equal(named.phrase, 'the Projects Panel’s address text');
  assert.equal(named.vocabulary, false);
});

test('an element with no part of its own is named by the one it is inside', () => {
  const named = name(
    { section: 'projects-panel', part: null, inside: ['bar', 'frame'], tag: 'i', nth: 2, of: 3 },
    GLOSSARY,
  );
  assert.equal(named.phrase, 'the Projects Panel’s bar, its 2nd of 3 <i>');
  assert.equal(named.vocabulary, false);
});

test('an element inside something the glossary names keeps the glossary’s word', () => {
  const named = name({ section: 'projects-panel', part: null, inside: ['frame'], tag: 'div' }, GLOSSARY);
  assert.equal(named.phrase, 'the Projects Panel’s Frame, its <div>');
});

test('an element belonging to no Section at all is still named', () => {
  assert.equal(name({ section: null, tag: 'div', part: null, nth: 1, of: 4 }, GLOSSARY).phrase, 'the 1st of 4 <div> on the page');
});

// ---------------------------------------------------------------------------
// The numbers
// ---------------------------------------------------------------------------

const CTX = { root: 16, font: 20, parent: { width: 1440, height: 800 }, viewport: { width: 1600, height: 900 } };

test('a length in px is restated in whichever unit the file already holds', () => {
  assert.equal(asUnit(720, 'px', CTX), 720);
  assert.equal(asUnit(720, 'rem', CTX), 45);
  assert.equal(asUnit(720, 'em', CTX), 36);
  assert.equal(asUnit(720, '%', { ...CTX, axis: 'x' }), 50);
  assert.equal(asUnit(400, '%', { ...CTX, axis: 'y' }), 50);
  assert.equal(asUnit(800, 'vw', CTX), 50);
  assert.equal(asUnit(450, 'vh', CTX), 50);
  assert.equal(asUnit(720, 'ch', CTX), null, 'a unit nothing here can convert is not guessed at');
  assert.equal(asUnit(720, '', CTX), null);
});

test('restate keeps the unit the composition chose', () => {
  assert.equal(restate('42.5rem', 720, CTX), '45rem');
  assert.equal(restate('680px', 720.4, CTX), '720.4px');
  assert.equal(restate('50%', 360, { ...CTX, axis: 'x' }), '25%');
  assert.equal(restate('40vw', 800, CTX), '50vw');
  assert.equal(restate('clamp(2rem, 5vw, 4rem)', 720, CTX), null, 'a relationship is not restated as a length');
  assert.equal(restate('42.5rem', 720, { root: 0 }), null, 'nothing is divided by nothing');
});

test('nudge moves the value the file holds by the distance that was dragged', () => {
  assert.equal(nudge('2rem', 24, CTX), '3.5rem');
  assert.equal(nudge('10px', -8, CTX), '2px');
  assert.equal(nudge('0', 16, CTX), null, 'a unitless number is not a length to nudge');
  assert.equal(nudge('-0.5rem', -8, CTX), '-1rem');
  assert.equal(nudge('calc(2rem + 1px)', 8, CTX), null);
});

test('a written number keeps its precision and loses its trailing zeros', () => {
  assert.equal(restate('1rem', 24.000001, CTX), '1.5rem');
  assert.equal(restate('1px', 1 / 3, CTX), '0.3333px');
  assert.equal(restate('1px', 12, CTX), '12px');
});

// ---------------------------------------------------------------------------
// The Annotation
// ---------------------------------------------------------------------------

const MEASURED = {
  named: { phrase: 'the Projects Panel’s Frame', vocabulary: true, part: 'projects-panel__frame' },
  selector: ':root #projects-panel .projects-panel__frame',
  viewport: { width: 1440, height: 900 },
  root: 16,
  parent: { phrase: 'the Projects Panel’s stage', width: 1440, height: 812 },
  before: { left: 412, top: 180, width: 680, height: 420 },
  after: { left: 436, top: 172, width: 720, height: 420 },
  tokens: [
    {
      axis: 'width',
      property: 'width',
      token: '--projects-panel-frame-width',
      selector: '.projects-panel',
      section: 'projects-panel',
      key: '0:--projects-panel-frame-width',
      was: '42.5rem',
      wants: '45rem',
    },
  ],
};

test('an Annotation names the element, and both numbers of everything that moved', () => {
  const { text } = annotate(MEASURED);
  assert.ok(text.startsWith('the Projects Panel’s Frame — moved and resized'), text);
  assert.ok(text.includes('1440×900'), 'the size it was measured at is in it');
  assert.ok(text.includes('412px'), 'before');
  assert.ok(text.includes('436px'), 'after');
  assert.ok(text.includes('+24px'), 'the change');
  assert.ok(text.includes('-8px'));
  assert.ok(text.includes('680px'));
  assert.ok(text.includes('720px'));
  assert.ok(text.includes(':root #projects-panel .projects-panel__frame'), 'the selector');
  assert.ok(!/[\t\r]/.test(text), 'it is plain text on plain lines');
});

test('an Annotation says which change maps onto a Token, and what to write', () => {
  const { text } = annotate(MEASURED);
  assert.ok(text.includes('--projects-panel-frame-width'), text);
  assert.ok(text.includes('42.5rem'), 'what the Token holds');
  assert.ok(text.includes('45rem'), 'what the measurement makes it');
  assert.ok(/left|top/.test(text));
});

test('an Annotation says plainly where nothing maps onto a Token', () => {
  const { text } = annotate({ ...MEASURED, tokens: [] });
  assert.ok(/no Token/i.test(text), text);
  assert.ok(!text.includes('--projects-panel'), 'and does not name one that does not exist');
});

test('an unchanged element is measured rather than refused', () => {
  const { text, headline } = annotate({ ...MEASURED, after: { ...MEASURED.before } });
  assert.ok(headline.includes('unchanged') || headline.includes('not moved'), headline);
  assert.ok(text.includes('412px'));
});

test('an Annotation says when it could not name the element in the glossary’s words', () => {
  const { text } = annotate({
    ...MEASURED,
    named: { phrase: 'the Projects Panel’s address text', vocabulary: false, part: 'projects-panel__address-text' },
  });
  assert.ok(text.includes('projects-panel__address-text'), text);
  assert.ok(/glossary/i.test(text));
});

test('a moved element gets the fraction of its parent it stands at, because the composition is relationships', () => {
  const { text } = annotate(MEASURED);
  assert.ok(text.includes('the Projects Panel’s stage'), text);
  assert.ok(text.includes('0.286') || text.includes('0.2861'), text);
});

test('the note that goes in the Overrides file is short lines and no wider than the file allows', () => {
  const { note } = annotate(MEASURED);
  assert.ok(Array.isArray(note) && note.length > 0 && note.length <= 12);
  for (const one of note) {
    assert.equal(typeof one, 'string');
    assert.ok(one.length <= 200, one);
    assert.ok(!one.includes('*/') && !one.includes('\n'), one);
  }
});

test('the declarations an Override would need come back with it', () => {
  assert.deepEqual(annotate(MEASURED).declarations, { translate: '24px -8px', width: '720px', height: '420px' });
  assert.deepEqual(annotate({ ...MEASURED, after: { ...MEASURED.before, left: 436 } }).declarations, {
    translate: '24px 0px',
  });
  assert.deepEqual(annotate({ ...MEASURED, after: { ...MEASURED.before } }).declarations, {});
});

test('translate is the absolute value the page shows, not the delta that was dragged', () => {
  // An Override declares translate !important and so REPLACES whatever the
  // composition had. An element already standing at 10px, dragged 24px further,
  // has to be written 34px or it jumps back by ten the moment the Override lands.
  assert.deepEqual(annotate({ ...MEASURED, translate: { x: 34, y: -8 } }).declarations, {
    translate: '34px -8px',
    width: '720px',
    height: '420px',
  });
});

// ---------------------------------------------------------------------------
// The text size, which is the fifth thing and not the fifth axis
// ---------------------------------------------------------------------------

test('a text size is reported in px, as a multiple of the root, and in the headline', () => {
  const { text, headline } = annotate({
    ...MEASURED,
    after: { ...MEASURED.before },
    text: { before: 16, after: 20 },
  });
  assert.ok(headline.includes('its text size changed'), headline);
  assert.ok(text.includes(TEXT), text);
  assert.ok(text.includes('16px → 20px'), text);
  assert.ok(text.includes('+4px'), 'the change');
  // The root multiple, because a type ladder is written in rem and the unit is
  // the change an agent has to make.
  assert.ok(text.includes('1 → 1.25'), text);
});

test('a measurement that looked at no text says nothing about a text size', () => {
  const { text, headline, declarations } = annotate(MEASURED);
  assert.ok(!text.includes(TEXT), text);
  assert.ok(!headline.includes('text size'), headline);
  assert.ok(!('font-size' in declarations));
});

test('a text size that did not move is measured, not reported as a change', () => {
  const { headline, declarations } = annotate({
    ...MEASURED,
    after: { ...MEASURED.before },
    text: { before: 16, after: 16 },
  });
  assert.ok(headline.includes('unchanged'), headline);
  assert.ok(!('font-size' in declarations));
});

test('an Override carries the measured text size, absolute and in this module’s order', () => {
  const { declarations } = annotate({ ...MEASURED, promoted: true, text: { before: 16, after: 20 } });
  assert.equal(declarations['font-size'], '20px');
  // The same order `lib/overrides.mjs` writes them in, so the two never disagree
  // about what a re-write of the same measurement looks like.
  assert.deepEqual(Object.keys(declarations), ['display', 'font-size', 'translate', 'width', 'height']);
});

test('a text size with no Token behind it is named among what nothing declares', () => {
  const { text } = annotate({
    ...MEASURED,
    after: { ...MEASURED.before },
    text: { before: 16, after: 20 },
    tokens: [],
  });
  assert.ok(/no Token/i.test(text), text);
  assert.ok(text.includes(TEXT), text);
});

test('a text size that maps onto a Token is offered like any other length', () => {
  const { text } = annotate({
    ...MEASURED,
    after: { ...MEASURED.before },
    text: { before: 16, after: 20 },
    tokens: [
      {
        axis: TEXT,
        property: 'font-size',
        token: '--front-screen-lead-size',
        selector: '.front-screen',
        section: 'front-screen',
        key: '0:--front-screen-lead-size',
        was: '1rem',
        wants: '1.25rem',
      },
    ],
  });
  assert.ok(text.includes('--front-screen-lead-size'), text);
  assert.ok(text.includes('1.25rem'), text);
  assert.ok(text.includes(`${TEXT} maps onto a Token`), text);
});

/**
 * A text size the element does not own.
 *
 * The failure these guard is a silent one and it was reported as "resizing the
 * Rail does nothing to its text": a box that draws no words of its own carries an
 * inherited `font-size`, and a `font-size` written back onto it is a declaration
 * nothing on the page ever reads. So the Annotation has to say where the size
 * actually lives, and the Override this record carries must not claim it.
 */

test('a text size the element does not own is named where it lives, and left out of its Override', () => {
  const { text, declarations, note } = annotate({
    ...MEASURED,
    after: { ...MEASURED.before },
    text: { before: 10, after: 12, own: false, on: ':root .projects-panel__rail-item' },
  });
  assert.ok(text.includes('10px → 12px'), text);
  assert.ok(text.includes(':root .projects-panel__rail-item'), text);
  assert.ok(/draws no words itself/.test(text), text);
  // The whole point: this record is the BOX's, and the box declares nothing about
  // the type. The caller writes that on the rule the words answer to.
  assert.ok(!('font-size' in declarations), JSON.stringify(declarations));
  assert.ok(!note.some((line) => line.includes('text set to')), note.join(' | '));
});

test('a text size the element does not own, with no rule to name, still says whose it is', () => {
  const { text, declarations } = annotate({
    ...MEASURED,
    after: { ...MEASURED.before },
    text: { before: 10, after: 12, own: false, on: null },
  });
  assert.ok(/set by rules of their own/.test(text), text);
  assert.ok(!('font-size' in declarations));
});

test('a measurement that says nothing about whose text it is reads as the element’s own', () => {
  // Every caller written before this existed, and every element that does draw its
  // own words: `own` absent is the ordinary case and nothing about it changes.
  const { text, declarations } = annotate({
    ...MEASURED,
    after: { ...MEASURED.before },
    text: { before: 16, after: 20 },
  });
  assert.equal(declarations['font-size'], '20px');
  assert.ok(!/draws no words itself/.test(text), text);
});

test('an inline box that had to be promoted to be measured says so in the declarations', () => {
  const { declarations, text } = annotate({ ...MEASURED, promoted: true });
  assert.equal(declarations.display, 'inline-block');
  assert.deepEqual(Object.keys(declarations), ['display', 'translate', 'width', 'height']);
  assert.ok(text.length > 0);
});
