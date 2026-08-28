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
 * AND THE SIZE IT SCALES IS THE TEXT'S OWN AND NOT THE BOX'S. A box that draws no
 * words of its own has a `font-size` all the same — the one it inherited — and
 * scaling THAT moves nothing, because the elements inside it that do draw words
 * declare their own and so never see it. That is the Projects Panel's Rail exactly:
 * the list is the box the author resizes and every item inside it sets
 * `font-size` for itself, so the whole feature appeared to do nothing on the one
 * element it was most obviously wanted for. `carried()` is the rule for whose size
 * the row speaks; `Measure.typeHolders()` is the walk that finds the candidates,
 * because that half needs a page.
 *
 * IT IS PURE SO IT CAN BE TESTED, like `lib/boxes.mjs` and `lib/corners.mjs`: two
 * plain objects in, a number or null out, no DOM and no node imports.
 */

/** The hundredth, which is what every number on the Measure surface is rounded
 *  to. */
const round = (n) => Math.round(n * 100) / 100;

/**
 * Whose text size one row can speak for, out of the elements that actually carry
 * the type inside a box.
 *
 * ONE ROW IS ONE NUMBER, which is the whole of the rule. Where every holder is set
 * at the same size, that size IS the box's text size: the row reads it, a scrub
 * sets it, and `scale text` multiplies it. Where they are set at several, there is
 * no single number for the row to show and no single Token behind it — so this
 * answers null and the caller falls back to the element's own inherited size,
 * which is what it always showed. Picking one of several would be this tool
 * choosing which text the author meant.
 *
 * THE SELECTOR IS OFFERED ONLY WHERE THEY SHARE ONE. An Override for a text size
 * has to be written where the composition writes it — on the rule the holders
 * answer to — and two rules governing two halves of the words inside a box is a
 * judgement rather than a lookup. The size still stands in that case; only the
 * Override goes.
 *
 * @param {{ size: number, selector: string|null }[]} holders  one per element
 *   whose `font-size` the words inside the box are actually drawn at, with the
 *   selector the composition declares it on where there is one
 * @returns {{ size: number, selector: string|null }|null} null where the holders
 *   do not agree on a size, or where there are none
 */
export function carried(holders) {
  if (!Array.isArray(holders) || holders.length === 0) return null;
  const sizes = new Set(holders.map((one) => round(one?.size)));
  if (sizes.size !== 1) return null;
  const [size] = sizes;
  if (!Number.isFinite(size)) return null;
  const selectors = new Set(holders.map((one) => one?.selector ?? null));
  const [only] = selectors;
  return { size, selector: selectors.size === 1 && typeof only === 'string' ? only : null };
}

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
