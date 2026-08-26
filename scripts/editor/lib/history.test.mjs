import assert from 'node:assert/strict';
import { test } from 'node:test';

import { History, empty } from './history.mjs';

/**
 * The undo stack, on its own.
 *
 * Four things here are worth an assertion rather than a reading, and each of them
 * is a way this could look right in a review and be wrong under the author's hand:
 *
 * A NEW GESTURE THROWS THE REDOS AWAY. Without it, redo replays a gesture against a
 * page that has since diverged, and writes numbers describing a state that never
 * existed. It is the classic omission and it fails silently.
 *
 * A PICK IS NOT A GESTURE. A step asking for nothing must not go on, or the author
 * presses undo twice to reverse one drag and reads the button as broken.
 *
 * LETTING GO OF AN ELEMENT TAKES ITS MEASURES OUT, per measure and not per step,
 * because a shift-click out of a series lets go of one member of five. A step that
 * wrote a file survives it, because a Token is reversed by writing it again and
 * needs nothing on the page.
 *
 * THE CAP DROPS THE OLDEST. A step holds element nodes, so an unbounded stack in a
 * page left open all afternoon is a leak with no symptom.
 */

const zero = { dx: 0, dy: 0, width: null, height: null, size: null };
const moved = { ...zero, dx: 40 };

/** A gesture on one element, named so the assertions read. */
const drag = (element, label = 'moved it') => ({
  label,
  measures: [{ element, from: zero, to: moved }],
});

test('a gesture that asked for nothing is not a step', () => {
  const history = new History();
  assert.equal(empty({ label: 'picked it', measures: [{ element: 'a', from: zero, to: { ...zero } }] }), true);
  assert.equal(history.record({ label: 'picked it', measures: [{ element: 'a', from: zero, to: zero }] }), false);
  assert.equal(history.canUndo, false);
  assert.equal(history.record({ label: 'picked it' }), false);
});

test('a selection where only some members moved is one step, not four', () => {
  // A member capped by its layout ends where it started; dropping it would be a
  // strict reading of one element and a wrong reading of the gesture.
  const step = {
    label: 'resized 2',
    measures: [
      { element: 'a', from: zero, to: moved },
      { element: 'b', from: zero, to: { ...zero } },
    ],
  };
  assert.equal(empty(step), false);
});

test('a step that wrote a Token is never empty, whatever the page did', () => {
  // Writing a Token repicks, so by the time the step is recorded there is no
  // measurement left standing on the page at all — and it is still the most
  // reversible thing this surface does.
  assert.equal(empty({ label: 'wrote it', measures: [], tokens: [{ what: '--x', was: '1rem', wants: '2rem' }] }), false);
  assert.equal(empty({ label: 'overrode it', overrides: [{ selector: ':root p' }] }), false);
});

test('undo and redo walk the same steps in opposite directions', () => {
  const history = new History();
  history.record(drag('a', 'one'));
  history.record(drag('b', 'two'));
  assert.deepEqual(history.next, { undo: 'two', redo: null });

  assert.equal(history.undo().label, 'two');
  assert.equal(history.undo().label, 'one');
  assert.equal(history.undo(), null);
  assert.equal(history.canUndo, false);
  assert.deepEqual(history.next, { undo: null, redo: 'one' });

  // Front of the redo stack first: the last thing undone is the first thing
  // redone, or the page comes back in an order nobody made it in.
  assert.equal(history.redo().label, 'one');
  assert.equal(history.redo().label, 'two');
  assert.equal(history.redo(), null);
  assert.equal(history.canRedo, false);
});

test('a new gesture throws the redo stack away', () => {
  const history = new History();
  history.record(drag('a', 'one'));
  history.record(drag('b', 'two'));
  history.undo();
  assert.equal(history.canRedo, true);
  history.record(drag('c', 'three'));
  assert.equal(history.canRedo, false);
  assert.deepEqual(history.next, { undo: 'three', redo: null });
});

test('letting go of an element takes it out of every step, both stacks', () => {
  const history = new History();
  history.record(drag('a', 'one'));
  history.record(drag('b', 'two'));
  history.undo();
  assert.equal(history.forget('a'), 1);
  assert.equal(history.canUndo, false);
  // 'two' was on the redo stack and named 'b', which is untouched.
  assert.equal(history.next.redo, 'two');
  assert.equal(history.forget('b'), 1);
  assert.equal(history.canRedo, false);
});

test('letting go of one member of a series keeps the step for the rest', () => {
  const history = new History();
  history.record({
    label: 'moved 2',
    measures: [
      { element: 'a', from: zero, to: moved },
      { element: 'b', from: zero, to: moved },
    ],
  });
  assert.equal(history.forget('a'), 0);
  assert.equal(history.canUndo, true);
  assert.deepEqual(history.done[0].measures, [{ element: 'b', from: zero, to: moved }]);
});

test('a step that wrote a file survives losing the element it measured', () => {
  const history = new History();
  history.record({
    label: 'wrote --x',
    measures: [{ element: 'a', from: zero, to: moved }],
    tokens: [{ section: 'stub', key: '0:--x', was: '1rem', wants: '2rem' }],
  });
  assert.equal(history.forget('a'), 0);
  assert.equal(history.canUndo, true);
  assert.deepEqual(history.done[0].measures, []);
});

test('the stack is capped, and it is the oldest that goes', () => {
  const history = new History(3);
  for (const name of ['one', 'two', 'three', 'four']) history.record(drag(name, name));
  assert.deepEqual(
    history.done.map((step) => step.label),
    ['two', 'three', 'four'],
  );
});

test('clearing says how much it dropped, and leaves nothing behind', () => {
  const history = new History();
  history.record(drag('a', 'one'));
  history.record(drag('b', 'two'));
  history.undo();
  assert.equal(history.clear(), 2);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
});
