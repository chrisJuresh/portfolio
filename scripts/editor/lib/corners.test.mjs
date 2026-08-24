import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CORNERS, HOLDS, OPPOSITE, drift, label, resize } from './corners.mjs';

/**
 * The corner arithmetic, on its own.
 *
 * The Measure surface's resize used to be one handle in the bottom right, which
 * needed no arithmetic worth testing: the top left never moved, so a drag was
 * `width += dx`. Four corners are a different thing — three of them move the box
 * as well as size it, and a sign wrong on any one of them is a corner that runs
 * away from the pointer. The rule that makes them all one rule is the ANCHOR: the
 * corner opposite the one being dragged does not move. That is what is asserted
 * here, per corner, rather than four sets of remembered signs.
 *
 * It is a pure function so it can be tested in node at all — `client/measure.js`
 * needs a page, and this is the half that does not.
 */

/** The box a drag starts from, in the shape `resize` takes: the sizes the element
 *  is standing at and the translate it is standing on. */
const from = { width: 100, height: 50, dx: 0, dy: 0 };

/** Where each corner of the box is, given a resize's answer — measured from the
 *  same origin the drag was, so "the anchor did not move" is one comparison. */
const corners = ({ width, height, dx, dy }) => ({
  nw: [dx, dy],
  ne: [dx + width, dy],
  sw: [dx, dy + height],
  se: [dx + width, dy + height],
});

test('there are four corners, and each is opposite exactly one other', () => {
  assert.deepEqual(CORNERS, ['nw', 'ne', 'sw', 'se']);
  for (const corner of CORNERS) {
    assert.equal(OPPOSITE[OPPOSITE[corner]], corner, `${corner} is not opposite its own opposite`);
  }
});

test('each corner holds the two edges its name says', () => {
  assert.deepEqual(HOLDS, {
    nw: ['north', 'west'],
    ne: ['north', 'east'],
    sw: ['south', 'west'],
    se: ['south', 'east'],
  });
});

test('every corner is named in words, for the label a pointer cannot read', () => {
  assert.deepEqual(
    CORNERS.map(label),
    ['resize from the top left', 'resize from the top right', 'resize from the bottom left', 'resize from the bottom right'],
  );
});

// ---------------------------------------------------------------------------
// The anchor, which is the whole rule
// ---------------------------------------------------------------------------

test('the opposite corner does not move, whichever corner is dragged', () => {
  for (const corner of CORNERS) {
    for (const [dx, dy] of [
      [12, 7],
      [-12, -7],
      [12, -7],
      [-12, 7],
    ]) {
      const anchor = OPPOSITE[corner];
      const was = corners(from)[anchor];
      const now = corners(resize(corner, { dx, dy }, from))[anchor];
      assert.deepEqual(now, was, `dragging ${corner} by ${dx},${dy} moved the ${anchor} corner`);
    }
  }
});

test('the dragged corner follows the pointer', () => {
  for (const corner of CORNERS) {
    const was = corners(from)[corner];
    const now = corners(resize(corner, { dx: 9, dy: 4 }, from))[corner];
    assert.deepEqual(now, [was[0] + 9, was[1] + 4], `${corner} did not follow the pointer`);
  }
});

// ---------------------------------------------------------------------------
// Per corner, spelled out — a sign wrong here is the failure this file exists for
// ---------------------------------------------------------------------------

test('the bottom right sizes and never moves', () => {
  assert.deepEqual(resize('se', { dx: 10, dy: 6 }, from), { width: 110, height: 56, dx: 0, dy: 0 });
});

test('the top left sizes the other way and moves by what it took off', () => {
  assert.deepEqual(resize('nw', { dx: 10, dy: 6 }, from), { width: 90, height: 44, dx: 10, dy: 6 });
});

test('the top right moves on one axis only', () => {
  assert.deepEqual(resize('ne', { dx: 10, dy: 6 }, from), { width: 110, height: 44, dx: 0, dy: 6 });
  assert.deepEqual(resize('sw', { dx: 10, dy: 6 }, from), { width: 90, height: 56, dx: 10, dy: 0 });
});

test('a translate the box already stands on is where the drag starts from', () => {
  const stood = { width: 100, height: 50, dx: 30, dy: -20 };
  assert.deepEqual(resize('nw', { dx: 10, dy: 6 }, stood), { width: 90, height: 44, dx: 40, dy: -14 });
  assert.deepEqual(resize('se', { dx: 10, dy: 6 }, stood), { width: 110, height: 56, dx: 30, dy: -20 });
});

// ---------------------------------------------------------------------------
// The clamp, which is where the anchor is easiest to lose
// ---------------------------------------------------------------------------

test('a box cannot be dragged through itself into a negative size', () => {
  const past = resize('nw', { dx: 400, dy: 400 }, from);
  assert.deepEqual(past, { width: 0, height: 0, dx: 100, dy: 50 });
});

test('the anchor holds even once the box has collapsed', () => {
  for (const corner of CORNERS) {
    const anchor = OPPOSITE[corner];
    const was = corners(from)[anchor];
    const now = corners(resize(corner, { dx: -400, dy: -400 }, from))[anchor];
    assert.deepEqual(now, was, `${corner} collapsed and took the ${anchor} corner with it`);
  }
});

test('a corner is rounded to the hundredth, like every other number on this surface', () => {
  assert.deepEqual(resize('nw', { dx: 0.126, dy: 0.124 }, from), {
    width: 99.87,
    height: 49.88,
    dx: 0.13,
    dy: 0.12,
  });
});

test('a corner nobody named is refused rather than guessed at', () => {
  for (const corner of ['n', 'north-west', 'NW', '', null]) {
    assert.throws(() => resize(corner, { dx: 1, dy: 1 }, from), /corner/i, `${corner} was not refused`);
  }
});

// ---------------------------------------------------------------------------
// Whether the anchor actually held, which the arithmetic above cannot know
// ---------------------------------------------------------------------------

/** A box as `client/measure.js` measures one: parent-relative, border box. */
const box = (left, top, width, height) => ({ left, top, width, height });

test('an anchor the layout held still reports as held', () => {
  const held = drift('se', box(20, 30, 100, 50), box(20, 30, 60, 25));
  assert.deepEqual(held, { corner: 'nw', dx: 0, dy: 0, held: true });
});

test('a centred box drifts by half of what its width lost', () => {
  // `margin-inline: auto`: the box shrank by 40 and both edges came in by 20, so
  // a translate of 40 overshoots the anchor by 20.
  const moved = drift('se', box(20, 30, 100, 50), box(40, 30, 60, 50));
  assert.deepEqual(moved, { corner: 'nw', dx: 20, dy: 0, held: false });
});

test('a right-anchored box drifts by all of it', () => {
  const moved = drift('se', box(20, 30, 100, 50), box(60, 30, 60, 50));
  assert.deepEqual(moved, { corner: 'nw', dx: 40, dy: 0, held: false });
});

test('each corner is judged by the corner opposite it and not by the left edge', () => {
  // The box lost 40 of its width and was translated 40 right, which is exactly
  // what dragging the WEST edge asks for — so the east edge, which is `nw`'s
  // anchor, is where it always was and nothing has drifted.
  assert.deepEqual(drift('nw', box(20, 30, 100, 50), box(60, 30, 60, 50)), {
    corner: 'se',
    dx: 0,
    dy: 0,
    held: true,
  });
  // The same two boxes judged from the other end: `se`'s anchor is the WEST edge,
  // and it moved 40.
  assert.equal(drift('se', box(20, 30, 100, 50), box(60, 30, 60, 50)).held, false);
});

test('a drift is read on both axes, not only across', () => {
  const moved = drift('nw', box(20, 30, 100, 50), box(20, 30, 100, 50));
  assert.deepEqual(moved, { corner: 'se', dx: 0, dy: 0, held: true });
  assert.deepEqual(drift('nw', box(20, 30, 100, 50), box(20, 40, 100, 50)), {
    corner: 'se',
    dx: 0,
    dy: 10,
    held: false,
  });
});

test('a pixel is not a drift, and more than one is', () => {
  // Sub-pixel layout and the hundredth everything is rounded to put a fraction on
  // most measurements, and a report line for it would cry wolf on every drag.
  assert.equal(drift('se', box(20, 30, 100, 50), box(21, 30, 99, 50)).held, true);
  assert.equal(drift('se', box(20, 30, 100, 50), box(21.5, 30, 98.5, 50)).held, false);
});

test('a drift is rounded to the hundredth, like every other number here', () => {
  assert.deepEqual(drift('se', box(0, 0, 100, 50), box(2.005, 0, 100, 50)), {
    corner: 'nw',
    dx: 2.01,
    dy: 0,
    held: false,
  });
});

test('a drift on a corner nobody named is refused rather than guessed at', () => {
  for (const corner of ['n', 'north-west', 'NW', '', null]) {
    assert.throws(() => drift(corner, box(0, 0, 10, 10), box(0, 0, 10, 10)), /corner/i, `${corner} was not refused`);
  }
});
