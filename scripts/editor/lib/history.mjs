/**
 * What the Measure surface can take back, as a stack.
 *
 * WHAT IT IS FOR. Every other surface in the Editor changes one named thing at a
 * time and shows you the value it now holds: a word, a Token, a Bake's parameter.
 * Measure is the one that changes the PAGE, by pointer, at sixty frames a second,
 * and the author's only way back was *put back* — which takes the whole element to
 * where the composition had it and loses the four gestures before the bad one with
 * it. So a mis-drag cost the arrangement, and the author stopped exploring. This
 * is the stack that makes a gesture cheap to try.
 *
 * IT IS THE STACK AND NOT THE REVERSAL. What a step MEANS — which inline styles to
 * put back, which Token to write, which Override to discard — is
 * `client/measure.js`'s, because every one of those is a DOM or a POST. What is
 * here is the part that is pure and the part that is easy to get quietly wrong:
 * the two stacks, the rule that a new step throws the redos away, the cap, and
 * what happens to a step whose element the surface has already let go of. Same
 * split as `lib/typefit.mjs` and `lib/corners.mjs` — plain objects in, plain
 * objects out, no DOM, no `node:` import.
 *
 * A STEP IS A GESTURE AND NOT A FRAME. `client/measure.js` records one on a
 * pointerup, on a row committed, on an Override written and on a *put back* — never
 * from `pointermove`. So there is no coalescing here and nothing that has to guess
 * where one gesture ended and the next began: fifty frames of one drag are one
 * step because only the last of them is offered to this file.
 *
 * A STEP CARRIES BOTH SIDES. `from` and `to`, `was` and `wants`, `had` and `now` —
 * so redo is the same walk in the other direction rather than a second recording
 * made while undoing. The alternative, re-recording during an undo, is the bug this
 * shape exists to make impossible: the undo has already moved the page, so anything
 * measured then describes the state being left rather than the one being restored.
 *
 * THE ELEMENT IS THE KEY AND THE RECORD IS NOT. A step names the element node, and
 * the surface resolves it to whatever record it is holding for that element at the
 * moment the undo runs. It has to: writing a Token repicks, which throws every
 * record away and makes fresh ones from where the page now is, so a step holding a
 * record would be holding a stale one the first time anything landed in a file.
 */

/** How many gestures deep the stack goes.
 *
 *  Bounded because a step holds element nodes, and an unbounded stack in a page
 *  the author leaves open all afternoon holds every element it ever measured
 *  against the garbage collector. Fifty is deeper than the author will ever reach
 *  by hand and shallow enough that the oldest of them is genuinely gone from the
 *  arrangement being worked on. */
export const LIMIT = 50;

/** The five things a gesture can ask of an element — `wanted`, in
 *  `client/measure.js`. */
const WANTED = ['dx', 'dy', 'width', 'height', 'size'];

const same = (from, to) => WANTED.every((key) => (from?.[key] ?? null) === (to?.[key] ?? null));

/**
 * Whether a step asks for nothing at all.
 *
 * A PICK IS NOT A GESTURE. Clicking an element, looking at its numbers and
 * clicking the next one asks nothing of the page, and a stack that recorded it
 * would make the author press undo twice to reverse one drag — which reads as a
 * broken button rather than as a strict reading of what happened.
 *
 * Asked of the WHOLE step and not of each measure: a selection of five where one
 * member was capped by its layout and did not move is still one gesture that moved
 * the page, and dropping the four that did move would be worse than recording the
 * one that did not.
 *
 * @param {object} step
 * @returns {boolean}
 */
export function empty(step) {
  if (!step) return true;
  if ((step.tokens?.length ?? 0) > 0) return false;
  if ((step.overrides?.length ?? 0) > 0) return false;
  return (step.measures ?? []).every(({ from, to }) => same(from, to));
}

export class History {
  /** @param {number} [limit] how many steps deep, for the test to reach the cap
   *   without recording fifty of them */
  constructor(limit = LIMIT) {
    this.limit = limit;
    /** Oldest first, so the newest — the one an undo takes — is the last. */
    this.done = [];
    /** Undone steps, newest first: a redo takes the front, which is the one the
     *  last undo put there. */
    this.undone = [];
  }

  get canUndo() {
    return this.done.length > 0;
  }

  get canRedo() {
    return this.undone.length > 0;
  }

  /** What the next undo and the next redo would reverse, for the two buttons'
   *  titles — read without moving either stack. */
  get next() {
    return {
      undo: this.done.at(-1)?.label ?? null,
      redo: this.undone[0]?.label ?? null,
    };
  }

  /**
   * Take a gesture.
   *
   * A NEW STEP THROWS THE REDOS AWAY, which is the one rule in this file that is
   * both universally expected and easy to leave out — and leaving it out is not a
   * missing feature but a wrong answer: redoing after a divergence replays a
   * gesture against a page that no longer has the state it was measured from, so
   * the numbers it writes describe nothing that ever happened.
   *
   * @returns {boolean} whether it was worth recording
   */
  record(step) {
    if (empty(step)) return false;
    this.done.push(step);
    if (this.done.length > this.limit) this.done.shift();
    this.undone = [];
    return true;
  }

  /** The step to reverse, moved onto the redo stack, or null. */
  undo() {
    const step = this.done.pop();
    if (!step) return null;
    this.undone.unshift(step);
    return step;
  }

  /** The step to re-apply, moved back onto the undo stack, or null. */
  redo() {
    const step = this.undone.shift();
    if (!step) return null;
    this.done.push(step);
    return step;
  }

  /**
   * An element the surface has let go of.
   *
   * WHY THIS EXISTS AT ALL. With the `keep` toggle off, picking something else puts
   * the last thing back — so by the time the author presses undo, the page has
   * already dropped that gesture and the surface is no longer holding a record to
   * put it back INTO. A step still naming it would either do nothing at all, or,
   * worse, appear to work while the numbers it restored were measured against a
   * page that has moved. So it comes out.
   *
   * PER MEASURE AND NOT PER STEP, because a shift-click out of a series lets go of
   * ONE member of a selection of five and the other four are still standing. The
   * step keeps the four.
   *
   * A STEP THAT WROTE A FILE SURVIVES WHATEVER HAPPENS TO ITS ELEMENTS. A Token and
   * an Override are reversed by writing them again, and neither needs the element
   * that was measured to still be picked — or, after a re-bake, to still be in the
   * document.
   *
   * @returns {number} how many steps went entirely
   */
  forget(element) {
    let dropped = 0;
    const sift = (steps) =>
      steps.filter((step) => {
        if (!step.measures) return true;
        step.measures = step.measures.filter((measure) => measure.element !== element);
        if (step.kept) step.kept = step.kept.filter((held) => held.element !== element);
        if (!empty(step)) return true;
        dropped += 1;
        return false;
      });
    this.done = sift(this.done);
    this.undone = sift(this.undone);
    return dropped;
  }

  clear() {
    const had = this.done.length + this.undone.length;
    this.done = [];
    this.undone = [];
    return had;
  }
}
