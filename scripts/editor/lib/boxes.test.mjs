import assert from 'node:assert/strict';
import { test } from 'node:test';

import { asWritten, insets } from './boxes.mjs';

/**
 * The box model, on its own.
 *
 * Every number the Measure surface shows is a BORDER box, because every one of
 * them is read off `getBoundingClientRect()`. A `width` written into a style is a
 * CONTENT box unless the element says otherwise, and this repository has no
 * global `box-sizing: border-box` — so the two are different numbers on most of
 * the page, and writing one where the other was measured inflates the box by its
 * padding and border.
 *
 * That was invisible while the surface had one handle in the bottom right: the
 * box grew away from its anchor and nothing else moved. With four corners it is a
 * drift that lasts the whole drag, because `lib/corners.mjs` derives the move
 * from the size it ASKED for and the page gave a bigger one.
 */

/** What `getComputedStyle` hands back for a padded, bordered content box. Only
 *  the nine properties this reads, because that is the whole of its input. */
const padded = {
  boxSizing: 'content-box',
  paddingLeft: '10px',
  paddingRight: '6px',
  paddingTop: '4px',
  paddingBottom: '8px',
  borderLeftWidth: '2px',
  borderRightWidth: '2px',
  borderTopWidth: '1px',
  borderBottomWidth: '3px',
};

test('a border-box element has no insets, however much padding it carries', () => {
  assert.deepEqual(insets({ ...padded, boxSizing: 'border-box' }), { x: 0, y: 0 });
});

test('a content-box element is inset by its padding and its border, both sides', () => {
  assert.deepEqual(insets(padded), { x: 20, y: 16 });
});

test('a bare content box is inset by nothing', () => {
  assert.deepEqual(
    insets({
      boxSizing: 'content-box',
      paddingLeft: '0px',
      paddingRight: '0px',
      paddingTop: '0px',
      paddingBottom: '0px',
      borderLeftWidth: '0px',
      borderRightWidth: '0px',
      borderTopWidth: '0px',
      borderBottomWidth: '0px',
    }),
    { x: 0, y: 0 },
  );
});

test('a value the page did not give is nothing rather than NaN', () => {
  // `getComputedStyle` on a detached element answers '' for everything, and one
  // NaN here would put `NaNpx` in a style and lose the whole drag.
  assert.deepEqual(insets({ boxSizing: 'content-box' }), { x: 0, y: 0 });
});

test('a fractional border is kept, because a half-pixel drift is still a drift', () => {
  assert.deepEqual(
    insets({ ...padded, borderLeftWidth: '0.5px', borderRightWidth: '0.5px' }),
    { x: 17, y: 16 },
  );
});

// ---------------------------------------------------------------------------
// What gets written
// ---------------------------------------------------------------------------

test('a border-box element is written the number that was measured', () => {
  assert.deepEqual(asWritten({ width: 240, height: 160 }, { x: 0, y: 0 }), { width: 240, height: 160 });
});

test('a content-box element is written the number that RENDERS as what was measured', () => {
  assert.deepEqual(asWritten({ width: 240, height: 160 }, { x: 20, y: 16 }), { width: 220, height: 144 });
});

test('an axis nothing has asked for stays unasked for', () => {
  // null is "no width was wanted", and subtracting a padding from it would ask
  // for one — which would freeze an axis the author never dragged.
  assert.deepEqual(asWritten({ width: null, height: 160 }, { x: 20, y: 16 }), { width: null, height: 144 });
  assert.deepEqual(asWritten({ width: null, height: null }, { x: 20, y: 16 }), { width: null, height: null });
});

test('a box smaller than its own padding is written zero and never a negative', () => {
  assert.deepEqual(asWritten({ width: 8, height: 4 }, { x: 20, y: 16 }), { width: 0, height: 0 });
});

test('what is written is rounded to the hundredth, like every other number here', () => {
  assert.deepEqual(asWritten({ width: 240, height: 160 }, { x: 0.125, y: 0.124 }), {
    width: 239.88,
    height: 159.88,
  });
});
