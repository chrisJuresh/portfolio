/**
 * How much the text size follows the box, when the author has asked it to.
 *
 * WHAT IT IS FOR. Enlarging a box on this page almost never means "the same words
 * bigger" — a Frame twice the width wants type to match, and the author was doing
 * that by resizing the box and then scrubbing the text size to something that
 * looked right. Two gestures for one intention. The `scale text` toggle on the
 * Measure surface makes the second one follow the first, and this file is the
 * arithmetic that decides by how much.
 *
 * IT IS A SCALE AND NOT A FIT, and the distinction is the reason this is eight
 * lines rather than a loop. A real fit — the largest size at which the words stop
 * overflowing — is a SEARCH: set a size, re-read `scrollHeight`, try again. That
 * runs on every frame of a corner drag, it answers differently depending on where
 * the words happen to break, and it is a number computed by a tool rather than a
 * relationship the author chose. Scaling by what the box did keeps the ratio
 * between a box and its type exactly where it was, which is the thing these
 * compositions are actually written in.
 *
 * THE SMALLER RATIO WINS. A corner drag moves both axes and a scrubbed row moves
 * one, so there are one or two ratios to choose between; the smaller of them is
 * the one that keeps the words inside the box. A box made wider and shorter has
 * less room for type than it had, and following its width would spill the text out
 * of the bottom of it.
 *
 * MEASURED FROM THE PICK, NEVER FROM THE LAST FRAME. `before` is the box as it
 * stood when the element was picked and `wanted` is the size being asked for now,
 * so a slow drag through fifty frames arrives at one ratio rather than compounding
 * fifty of them. This is the same trap `lib/corners.mjs` resolves its sizes at
 * pointerdown for, and it fails the same way: the drag outruns the pointer.
 *
 * IT IS PURE SO IT CAN BE TESTED, like `lib/boxes.mjs` and `lib/corners.mjs`: two
 * plain objects in, a number or null out, no DOM and no node imports.
 */

/** The hundredth, which is what every number on the Measure surface is rounded
 *  to. */
const round = (n) => Math.round(n * 100) / 100;

/**
 * The factor the text size should be multiplied by, or null where there is no
 * answer to give.
 *
 * @param {{ width: number, height: number }} before  the box when it was picked
 * @param {{ width: number|null, height: number|null }} wanted  border-box sizes
 *   being asked for, `null` on an axis nothing has asked for
 * @returns {number|null} null when nothing has been resized yet, and null when the
 *   axes that were resized started at zero — a box with no width to grow from has
 *   no ratio, and returning 1 there would claim the text was deliberately left
 *   alone
 */
export function scale(before, wanted) {
  const ratios = [];
  for (const axis of ['width', 'height']) {
    if (wanted?.[axis] === null || wanted?.[axis] === undefined) continue;
    if (!(before?.[axis] > 0)) continue;
    ratios.push(wanted[axis] / before[axis]);
  }
  if (ratios.length === 0) return null;
  return Math.min(...ratios);
}

/**
 * The text size to ask for, given the size the element was picked at.
 *
 * Floored at zero and not at one: `lib/corners.mjs` clamps a box dragged through
 * itself to zero, so a ratio of zero is a real answer to a real gesture, and *put
 * back* is one press. A floor chosen here would be this file deciding how small
 * the author is allowed to go, which is the judgement ADR 0004 keeps out of the
 * Editor.
 *
 * @param {number} size  the element's text size when it was picked, in px
 * @param {{ width: number, height: number }} before
 * @param {{ width: number|null, height: number|null }} wanted
 * @returns {{ size: number, by: number }|null} null where `scale()` has no answer
 */
export function fitted(size, before, wanted) {
  const by = scale(before, wanted);
  if (by === null || !Number.isFinite(size)) return null;
  return { size: round(Math.max(0, size * by)), by: round(by) };
}
