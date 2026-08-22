/**
 * A colour, once it has stopped being a spelling.
 *
 * The ground is `color-mix(in oklab, …)`, which Chromium serialises as
 * `oklab(…)` or `color(srgb …)` depending on the mix while the theme's own
 * endpoints are plain hex — so comparing computed strings compares different
 * things at different scales. The browser half of the ground Check paints the
 * colour into a 1x1 canvas and reads the pixel back; this half turns those three
 * bytes into the two numbers a Check asserts on. NOTES.md carries why the
 * assertion is a luminance band and not an equality.
 */

/** Not `check`: CONTEXT.md gives that word a meaning, and every module in
 *  ../checks/ exports it as the Check itself.
 *  @param {number[]} rgb */
function assertChannels(rgb) {
  if (!Array.isArray(rgb) || rgb.length !== 3) {
    throw new TypeError(`expected three channels, got ${JSON.stringify(rgb)}`);
  }
  for (const channel of rgb) {
    if (!Number.isFinite(channel) || channel < 0 || channel > 255) {
      throw new RangeError(`channel out of 0-255: ${JSON.stringify(rgb)}`);
    }
  }
}

/** @param {number[]} rgb @returns {string} */
export function hex(rgb) {
  assertChannels(rgb);
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * WCAG relative luminance, 0 for black and 1 for white.
 *
 * Linearised per channel and weighted, rather than averaged: the eye reads a mid
 * grey as about a fifth of the way up rather than half, and a Check whose band
 * was drawn around a channel mean would call `#808080` paper.
 *
 * @param {number[]} rgb @returns {number}
 */
export function luminance(rgb) {
  assertChannels(rgb);
  const [r, g, b] = rgb.map((channel) => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
