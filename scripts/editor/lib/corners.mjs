/**
 * The four corners a picked element can be resized by, and the arithmetic behind
 * them.
 *
 * WHY THIS IS A FILE AND NOT FOUR SIGNS IN A POINTERMOVE. The Measure surface had
 * one handle, in the bottom right, and it needed no arithmetic: the top left
 * never moved, so a drag was `width += dx`. Four corners are a different thing —
 * three of them MOVE the box as well as size it, because the corner opposite the
 * one under the pointer has to stay exactly where it is. That anchor is the only
 * rule, and expressing it once here is what stops it being remembered four times
 * with one sign wrong.
 *
 * IT IS PURE SO IT CAN BE TESTED. `client/measure.js` needs a page and a pointer;
 * this half needs neither, so it is asserted in node beside the other write
 * boundaries — see `corners.test.mjs`. It is served to the browser the same way
 * `lib/annotations.mjs` and `lib/overrides.mjs` are, and like them it imports
 * nothing from node.
 *
 * A MOVE IS STILL A TRANSLATE AND NEVER A LEFT. Nothing here writes `left` or
 * `top`: the Measure surface expresses where a box stands as a `translate` delta
 * on top of whatever the composition already gave it, and an Override may only
 * write `translate`, `width` and `height` (`lib/overrides.mjs`). So a corner that
 * moves the box hands back a translate, in the same base-plus-delta the drag
 * already speaks.
 */

/** The four, in the order they are drawn and listed. */
export const CORNERS = ['nw', 'ne', 'sw', 'se'];

/** Which two edges each corner is holding. The names are the arithmetic: a west
 *  edge moving right makes the box narrower and moves it right; an east edge
 *  moving right only makes it wider. */
export const HOLDS = {
  nw: ['north', 'west'],
  ne: ['north', 'east'],
  sw: ['south', 'west'],
  se: ['south', 'east'],
};

/** The corner that must not move while this one is dragged. */
export const OPPOSITE = { nw: 'se', ne: 'sw', sw: 'ne', se: 'nw' };

/** What each corner is called out loud, for the `aria-label` a pointer does not
 *  need and everything else does. */
const WORDS = { nw: 'top left', ne: 'top right', sw: 'bottom left', se: 'bottom right' };

export const label = (corner) => `resize from the ${WORDS[corner]}`;

/** The hundredth, which is what every number on the Measure surface is rounded to
 *  — a resize that disagreed with the read-out beside it would be worse than a
 *  coarse one. */
const round = (n) => Math.round(n * 100) / 100;

/**
 * Where a corner drag leaves the box.
 *
 * @param {string} corner  one of `CORNERS`
 * @param {{ dx: number, dy: number }} by  how far the pointer has come since the
 *   drag started — a total and not a frame's worth, so a drag is recomputed from
 *   where it began and never accumulated
 * @param {{ width: number, height: number, dx: number, dy: number }} from  the
 *   box and the translate at the moment the drag started. Both sizes are real
 *   numbers: it is the caller's job to have measured the element, because "no
 *   width was asked for yet" is not a size to do arithmetic with
 * @returns {{ width: number, height: number, dx: number, dy: number }}
 */
export function resize(corner, { dx, dy }, from) {
  const holds = HOLDS[corner];
  if (!holds) throw new Error(`"${corner}" is not a corner — expected one of ${CORNERS.join(', ')}`);
  const [vertical, horizontal] = holds;

  // A box cannot be dragged through itself. Clamping the SIZE and then deriving
  // the move from it — rather than moving by the pointer and clamping after — is
  // what keeps the anchor still once the box has collapsed: past zero the corner
  // stops, and the far edge stays where it always was.
  const width = Math.max(0, horizontal === 'west' ? from.width - dx : from.width + dx);
  const height = Math.max(0, vertical === 'north' ? from.height - dy : from.height + dy);
  return place(corner, { width, height }, from);
}

/**
 * A size, and the translate that holds the anchor while the box takes it.
 *
 * EXTRACTED BECAUSE THERE ARE NOW TWO WAYS TO ARRIVE AT A SIZE — the pointer's two
 * axes, and one ratio applied to both — and the anchor is the same rule for both.
 * Remembered twice it would be remembered with one sign wrong, which is the whole
 * reason this file exists.
 *
 * @param {string} corner  the one under the pointer, one of `CORNERS`
 * @param {{ width: number, height: number }} to  the size being taken, unrounded
 * @param {{ width: number, height: number, dx: number, dy: number }} from  the box
 *   and the translate when the drag started
 */
function place(corner, to, from) {
  const [vertical, horizontal] = HOLDS[corner];
  const width = round(Math.max(0, to.width));
  const height = round(Math.max(0, to.height));
  return {
    width,
    height,
    // Only the edges that are not the anchor's move the box, and they move it by
    // exactly what they took off the size — which is the anchor, written down.
    dx: round(horizontal === 'west' ? from.dx + (from.width - width) : from.dx),
    dy: round(vertical === 'north' ? from.dy + (from.height - height) : from.dy),
  };
}

/**
 * The one ratio a corner drag asked for.
 *
 * THE AXIS THE POINTER MEANT, and that is the decision worth stating: the two axes
 * of a corner drag are two different ratios, and a proportional resize has to pick
 * one. It picks whichever is FURTHER FROM 1 — the axis the hand travelled further
 * along, in the only units that can be compared across two axes of different
 * lengths. So a drag that is mostly sideways scales by what it did sideways and the
 * height follows, which is what a hand expects; and a diagonal drag, where the two
 * ratios are close, gives the same answer either way.
 *
 * It is NOT `typefit.mjs`'s rule, which takes the SMALLER of the two, and the
 * difference is not an inconsistency. That one is answering "how big may the type
 * be and still fit", where the smaller ratio is the safe one. This one is
 * answering "how much bigger did the author ask for", where the smaller ratio
 * would make every drag lag the pointer.
 *
 * @param {{ width: number, height: number }} asked  the size the two axes came to
 * @param {{ width: number, height: number }} from  the box the drag started at
 * @returns {number|null} null where there is no ratio to have: a box with no width
 *   and no height to grow from cannot be scaled, and answering 1 would claim the
 *   author asked for no change
 */
export function ratio(asked, from) {
  const found = [];
  for (const axis of ['width', 'height']) {
    if (!(from?.[axis] > 0) || !Number.isFinite(asked?.[axis])) continue;
    found.push(asked[axis] / from[axis]);
  }
  if (found.length === 0) return null;
  return found.reduce((one, other) => (Math.abs(other - 1) > Math.abs(one - 1) ? other : one));
}

/**
 * Where a corner drag leaves the box when both axes move by the same ratio.
 *
 * The gesture the `resize by one ratio` toggle turns a corner drag into: the box
 * keeps its proportions and only its size changes, which is what "make the whole
 * thing bigger" is when the thing is a drawing rather than a container. The anchor
 * is held exactly as it is for an ordinary resize — `place()` is the one copy of
 * that rule — so the corner opposite the pointer stays where it was and the box
 * grows away from it.
 *
 * Falls back to the ordinary resize where there is no ratio to apply, so a zero-
 * sized box is still draggable rather than stuck.
 *
 * @returns {{ width: number, height: number, dx: number, dy: number }}
 */
export function proportional(corner, by, from) {
  const asked = resize(corner, by, from);
  const scale = ratio(asked, from);
  if (scale === null) return asked;
  return place(corner, { width: from.width * scale, height: from.height * scale }, from);
}

/** How far the anchor may have moved and still count as held. Sub-pixel layout
 *  and the hundredth every number here is rounded to put a fraction on most
 *  measurements, so a report line without a threshold would cry wolf on every
 *  drag. */
const STILL = 1;

/**
 * Whether the anchor actually held — which the arithmetic above cannot know.
 *
 * `resize()` compensates for a shrinking width with a `translate` of exactly what
 * the width lost, and that is right only when the LAYOUT holds the box's left
 * edge still. A box placed by `margin-inline: auto` moves both its edges when it
 * narrows, so the anchor drifts by half the delta; one placed by
 * `justify-content: flex-end` or `margin-left: auto` drifts by all of it.
 *
 * Nothing here fixes that, deliberately. This surface MEASURES: `applyTo()`
 * re-reads the box, so the read-out and the Annotation are already truthful about
 * where the box landed, and a tool that fought the layout to hold a corner would
 * be computing a position rather than reporting one — which is the line ADR 0004
 * draws. What was missing is that the author was not TOLD, so the drag felt wrong
 * under the pointer with nothing on screen saying why. This is what says it.
 *
 * @param {string} corner  the one being dragged, one of `CORNERS`
 * @param {{ left: number, top: number, width: number, height: number }} before
 *   where the box stood when the drag STARTED, as `client/measure.js` measures
 *   one — not where it was picked, or an element moved first would report the
 *   author's own translate as a drift
 * @param {{ left: number, top: number, width: number, height: number }} after
 *   the box as it now actually is
 * @returns {{ corner: string, dx: number, dy: number, held: boolean }} the corner
 *   that was supposed to stay still, how far it went, and whether that is within
 *   a pixel
 */
export function drift(corner, before, after) {
  const anchor = OPPOSITE[corner];
  if (!anchor) throw new Error(`"${corner}" is not a corner — expected one of ${CORNERS.join(', ')}`);
  const [vertical, horizontal] = HOLDS[anchor];
  const at = (box) => [
    horizontal === 'west' ? box.left : box.left + box.width,
    vertical === 'north' ? box.top : box.top + box.height,
  ];
  const [wasX, wasY] = at(before);
  const [nowX, nowY] = at(after);
  const dx = round(nowX - wasX);
  const dy = round(nowY - wasY);
  return { corner: anchor, dx, dy, held: Math.abs(dx) <= STILL && Math.abs(dy) <= STILL };
}

/** What one corner is called out loud, for a report line that has to name the
 *  anchor rather than the corner under the pointer. */
export const word = (corner) => WORDS[corner];
