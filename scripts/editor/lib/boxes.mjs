/**
 * The one place the Measure surface converts between the box it MEASURES and the
 * box it WRITES, because on most of this page they are different numbers.
 *
 * WHY THIS IS A FILE. Every number the surface shows is read off
 * `getBoundingClientRect()`, which is the BORDER box: padding and border
 * included. A `width` in a style is a CONTENT box unless the element computes
 * `box-sizing: border-box`, and this repository has no global rule making it so —
 * only three Sections set it locally. So writing a measured width straight back
 * renders a box that is padding-plus-border WIDER than the one that was measured,
 * on most of the page.
 *
 * WHY IT ONLY SHOWED UP WITH FOUR CORNERS. While the surface had one handle in
 * the bottom right, that inflation was a size jump on the first frame and nothing
 * else: the box grew away from an anchor the layout was holding anyway.
 * `lib/corners.mjs` derives a corner's MOVE from the size it asked for, so for
 * `nw`, `ne` and `sw` the anchor edge drifts by exactly padding-plus-border and
 * stays drifted for the rest of the drag. Same bug, three visible failures.
 *
 * WHY IT SUBTRACTS RATHER THAN WRITING `box-sizing`. Writing `border-box` would
 * make the number correct too, and would be a SECOND box-model change made by
 * this tool. The first — the `display: inline-block` promotion — is said out loud
 * in the report line, carried in the Annotation and carried in the Override,
 * because it is a real difference between what was measured and what the page
 * does. A second would have to earn the same treatment. Subtracting changes no
 * box model at all: the rendered border box comes out at the number that was
 * measured, which is the whole of what was asked for.
 *
 * IT IS PURE SO IT CAN BE TESTED. It takes the nine computed values it needs as
 * strings, exactly as `getComputedStyle` hands them over, and touches no DOM —
 * see `boxes.test.mjs`. Like `lib/corners.mjs` it is served to the browser and
 * imports nothing from node.
 */

/** The hundredth, which is what every number on the Measure surface is rounded
 *  to. */
const round = (n) => Math.round(n * 100) / 100;

/** A computed length as a number. `getComputedStyle` on a detached element
 *  answers '' for everything, and one NaN reaching a style would write `NaNpx`
 *  and lose the whole drag. */
const px = (value) => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * How much of the element's rendered border box is not its `width` and `height`.
 *
 * @param {CSSStyleDeclaration|Record<string, string>} computed
 * @returns {{ x: number, y: number }} zero on both axes for a `border-box`
 *   element, which already measures the way it is written
 */
export function insets(computed) {
  if (computed.boxSizing !== 'content-box') return { x: 0, y: 0 };
  return {
    x:
      px(computed.paddingLeft) +
      px(computed.paddingRight) +
      px(computed.borderLeftWidth) +
      px(computed.borderRightWidth),
    y:
      px(computed.paddingTop) +
      px(computed.paddingBottom) +
      px(computed.borderTopWidth) +
      px(computed.borderBottomWidth),
  };
}

/**
 * The sizes to write so the rendered border box comes out at the sizes measured.
 *
 * @param {{ width: number|null, height: number|null }} wanted  border-box sizes,
 *   `null` on an axis nothing has asked for — which stays `null`, because
 *   subtracting a padding from it would ask for a size the author never dragged
 *   and freeze that axis
 * @param {{ x: number, y: number }} inset  from `insets()`
 * @returns {{ width: number|null, height: number|null }}
 */
export function asWritten({ width, height }, inset) {
  // Clamped at zero for the same reason `lib/corners.mjs` clamps: a negative
  // width is not a size, and a box narrower than its own padding renders at its
  // padding whatever is written. `applyTo()` re-measures either way, so the
  // read-out and the Annotation stay truthful about where it landed.
  const off = (size, by) => (size === null ? null : round(Math.max(0, size - by)));
  return { width: off(width, inset.x), height: off(height, inset.y) };
}
