import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fitted, scale } from './typefit.mjs';

/**
 * The `scale text` toggle's arithmetic, on its own.
 *
 * Two things here are worth an assertion rather than a reading, and both of them
 * are ways this could be silently wrong on the page while looking right in a
 * review:
 *
 * THE SMALLER RATIO WINS, because the smaller one is the one that keeps the words
 * inside the box. Following the width of a box made wider and shorter spills the
 * text out of the bottom of it, and nothing on screen says why.
 *
 * IT IS MEASURED FROM THE PICK. `before` is the box the element was picked at, so
 * fifty frames of a slow drag arrive at one ratio. Measured from the last frame
 * they compound, the type runs away from the pointer, and it looks like a slow
 * machine rather than a bug — the same trap `lib/corners.mjs` resolves its sizes
 * at pointerdown for.
 */

const box = { width: 200, height: 100 };

test('nothing resized is no answer, not a ratio of one', () => {
  assert.equal(scale(box, { width: null, height: null }), null);
  // Null and not 1, because the caller writes a text size only where there is an
  // answer: a 1 would set `font-size` on every element that was merely picked.
  assert.equal(fitted(16, box, { width: null, height: null }), null);
});

test('one axis resized is that axis’s ratio', () => {
  assert.equal(scale(box, { width: 300, height: null }), 1.5);
  assert.equal(scale(box, { width: null, height: 50 }), 0.5);
});

test('both axes resized takes the smaller ratio, so the words stay inside', () => {
  // Wider and shorter: the width says grow the type and the height says shrink it,
  // and the height is right.
  assert.equal(scale(box, { width: 400, height: 50 }), 0.5);
  assert.equal(scale(box, { width: 100, height: 200 }), 0.5);
  assert.equal(scale(box, { width: 400, height: 300 }), 2);
});

test('an axis that started at zero has no ratio, and is ignored', () => {
  assert.equal(scale({ width: 0, height: 100 }, { width: 300, height: 200 }), 2);
  assert.equal(scale({ width: 0, height: 0 }, { width: 300, height: 200 }), null);
});

test('the ratio is taken from the picked box, so a drag does not compound', () => {
  // Three frames of one drag, each asking for a bigger box. The ratio is the
  // whole drag's and not the frame's, so the type ends at 1.5x and not 1.5^3.
  const frames = [220, 260, 300];
  const sizes = frames.map((width) => fitted(16, box, { width, height: null }).size);
  assert.deepEqual(sizes, [17.6, 20.8, 24]);
});

test('a fitted size is the picked size times the ratio, rounded to the hundredth', () => {
  assert.deepEqual(fitted(18, box, { width: 240, height: null }), { size: 21.6, by: 1.2 });
  assert.deepEqual(fitted(13.33, box, { width: 300, height: null }), { size: 20, by: 1.5 });
});

test('a box dragged through itself is a text size of zero, and never a negative one', () => {
  assert.deepEqual(fitted(16, box, { width: 0, height: 0 }), { size: 0, by: 0 });
});

test('a text size nothing could measure is no answer', () => {
  // `typeSize()` parses a computed `font-size`, and a detached element answers ''
  // for every one of them. A NaN reaching a style writes `NaNpx` and loses the
  // drag, which is the same failure `lib/boxes.mjs` guards its own parse against.
  assert.equal(fitted(Number.NaN, box, { width: 300, height: null }), null);
});
