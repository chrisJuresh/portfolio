import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EDGES, closing, parts, scale, sides } from './fills.mjs';

/**
 * A box whose size is its parent's remainder, on its own.
 *
 * `.front-screen__col` is `flex: 1 1 auto` inside a Section with a definite
 * height, so it has no size of its own to drag: an inline `height` becomes its
 * flex-basis and is grown straight back to the fill. The number that moves its top
 * edge is the PARENT's padding, and these are the two things reading and writing
 * that padding takes.
 */

// ---------------------------------------------------------------------------
// Reading a side out of the shorthand that declared it
// ---------------------------------------------------------------------------

test('a shorthand splits on top-level spaces, leaving a function whole', () => {
  assert.deepEqual(parts('var(--a) calc(1rem + 2px) 0'), ['var(--a)', 'calc(1rem + 2px)', '0']);
});

test('the four CSS side orders', () => {
  assert.deepEqual(sides('1px'), { top: '1px', right: '1px', bottom: '1px', left: '1px' });
  assert.deepEqual(sides('1px 2px'), { top: '1px', right: '2px', bottom: '1px', left: '2px' });
  assert.deepEqual(sides('1px 2px 3px'), { top: '1px', right: '2px', bottom: '3px', left: '2px' });
  assert.deepEqual(sides('1px 2px 3px 4px'), { top: '1px', right: '2px', bottom: '3px', left: '4px' });
});

/** The declaration this whole gesture is about. CSSOM answers '' for its
 *  `padding-top` longhand — a shorthand carrying a `var()` has pending-substitution
 *  longhands — so the side has to be read out of the shorthand or not at all. */
test('the Front Screen’s own padding gives up its top side', () => {
  const read = sides('var(--front-screen-rhyme) var(--front-screen-side) 0');
  assert.equal(read.top, 'var(--front-screen-rhyme)');
  assert.equal(read.bottom, '0');
  assert.equal(read.left, 'var(--front-screen-side)');
});

test('nothing to split is not four sides', () => {
  assert.equal(sides(''), null);
  assert.equal(sides('1px 2px 3px 4px 5px'), null);
});

// ---------------------------------------------------------------------------
// Moving a value `restate()` refuses
// ---------------------------------------------------------------------------

test('a plain length scales, and keeps the unit the composition chose', () => {
  assert.equal(scale('4rem', 0.5), '2rem');
  assert.equal(scale('81px', 61 / 81), '61px');
  assert.equal(scale('9vh', 0.75), '6.75vh');
});

test('a bare zero stays a bare zero, whatever it is multiplied by', () => {
  assert.equal(scale('0', 0.5), '0');
});

/** The guarantee this rests on: clamp is positively homogeneous, so one ratio
 *  across all three terms is the same relationship at a different magnitude. */
test('a clamp scales term by term', () => {
  assert.equal(scale('clamp(3rem, 9vh, 6.5rem)', 0.75), 'clamp(2.25rem, 6.75vh, 4.875rem)');
});

test('a scaled clamp pins at exactly the windows it pinned at before', () => {
  // 9vh crosses 3rem at a 533.33px window and 6.5rem at 1155.56px, at a 16px root.
  const pins = (min, mid, max) => [(min * 16 * 100) / mid, (max * 16 * 100) / mid];
  const [wasFloor, wasCeiling] = pins(3, 9, 6.5);
  const [isFloor, isCeiling] = pins(2.25, 6.75, 4.875);
  assert.ok(Math.abs(wasFloor - isFloor) < 1e-9);
  assert.ok(Math.abs(wasCeiling - isCeiling) < 1e-9);
});

test('min and max scale the same way, and nest', () => {
  assert.equal(scale('min(4rem, 10vh)', 0.5), 'min(2rem, 5vh)');
  assert.equal(scale('clamp(1rem, min(4rem, 10vh), 8rem)', 0.5), 'clamp(0.5rem, min(2rem, 5vh), 4rem)');
});

/** Scaling the MENTION of a Token scales nothing, so a value carrying one is
 *  refused rather than half-moved — `calc(var(--a) + 4px)` doubled is not twice
 *  the value. */
test('anything mentioning another Token is refused', () => {
  assert.equal(scale('var(--front-screen-rhyme)', 0.5), null);
  assert.equal(scale('calc(var(--a) + 4px)', 0.5), null);
  assert.equal(scale('clamp(1rem, var(--a), 4rem)', 0.5), null);
});

/** A `calc()` is an expression rather than a list of lengths, so scaling its terms
 *  is not scaling it: `calc(2 * 3rem)` term by term would double the 2 as well. */
test('a calc is refused even with no Token in it', () => {
  assert.equal(scale('calc(1rem + 2px)', 0.5), null);
});

test('a ratio that is not one refuses, rather than writing a zero or a sign flip', () => {
  assert.equal(scale('4rem', 0), null);
  assert.equal(scale('4rem', -1), null);
  assert.equal(scale('4rem', Number.NaN), null);
});

test('a keyword is not a length', () => {
  assert.equal(scale('auto', 0.5), null);
  assert.equal(scale('', 0.5), null);
});

// ---------------------------------------------------------------------------
// Which padding a corner is on, and how far it closes
// ---------------------------------------------------------------------------

test('a corner names the parent’s padding under each of its two edges', () => {
  assert.deepEqual(EDGES.nw, { height: 'top', width: 'left' });
  assert.deepEqual(EDGES.se, { height: 'bottom', width: 'right' });
});

test('dragging a north edge up closes the top padding', () => {
  assert.deepEqual(closing(81, -20, 'top'), { to: 61, by: 61 / 81 });
});

test('dragging a south edge down closes the bottom padding', () => {
  assert.deepEqual(closing(80, 20, 'bottom'), { to: 60, by: 0.75 });
});

test('dragging the other way opens it again', () => {
  assert.deepEqual(closing(80, 20, 'top'), { to: 100, by: 1.25 });
});

/** Clamped at zero, and the ratio derived from where it LANDED — so past the
 *  bottom the margin stops closing and the Token stops moving, rather than the
 *  file recording a negative multiple of itself. */
test('a padding dragged past zero stops at zero', () => {
  assert.deepEqual(closing(40, -100, 'top'), { to: 0, by: 0 });
});

test('a padding that is already zero has no ratio that moves it', () => {
  assert.equal(closing(0, -20, 'top'), null);
});
