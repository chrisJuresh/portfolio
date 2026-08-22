import { hex, luminance } from '../lib/colour.mjs';
import { open, settle } from '../lib/page.mjs';

/**
 * The page is paper where it should be paper, and dark where it should be dark —
 * in both themes, at both ends of the Turn.
 *
 * WHY THE GROUND AND NOT THE INK. The ground is the one colour every other one on
 * the page is mixed against, it is painted by a single element, and it is what the
 * silent failure looks like: a theme regression that turns the whole document
 * black is invisible to every other Check here and to the build. ADR 0006 retired
 * the hourly external capture partly because it asserted geometry hard and colour
 * not at all, and asked for this in its place.
 *
 * WHY A BAND AND NOT AN EQUALITY. The two papers and the Turn's arrival are the
 * author's to choose; a Check pinned to `#ffffff` would fail the moment a warmer
 * paper was picked, and a blocking Check may not cost a prompt for a legitimate
 * change. So what is asserted is the only thing that cannot legitimately move:
 * paper is light, dark is dark, and they are not the same colour. The measured
 * hex and luminance are reported either way, so a drift that is deliberate is
 * still visible in a passing run.
 *
 * WHY RASTERISED. `--ground` is a `color-mix(in oklab, …)`, which Chromium
 * serialises as `oklab(…)` or `color(srgb …)` depending on the mix, while the
 * theme's endpoints are plain hex. Comparing computed strings compares different
 * things at different scales; painting the colour into a 1x1 canvas and reading
 * the pixel back is a comparison about the colour rather than about its spelling.
 */

/** Paper has to be at least this light, and dark at most this dark. */
const PAPER_AT_LEAST = 0.6;
const DARK_AT_MOST = 0.2;

/** And paper and dark have to be this far apart, so a page stuck mid-Turn fails. */
const APART_AT_LEAST = 0.4;

export const check = {
  name: 'ground',
  title: "the page's ground is paper and dark where it should be, in both themes",

  /** @param {{ browser: import('playwright').Browser, origin: string }} ctx */
  async run({ browser, origin }) {
    /** @type {string[]} */
    const failures = [];
    /** @type {Record<string, { rgb: number[], light: number }>} */
    const measured = {};

    for (const theme of /** @type {const} */ (['light', 'dark'])) {
      const { context, page } = await open(browser, origin, { theme });
      try {
        failures.push(...(await settle(page)).map((why) => `${theme}: ${why}`));

        const read = await page.evaluate(() => {
          const kernel = window.portfolio;
          const turn = kernel?.timelines.get('turn');
          if (!turn) return { missing: 'no Timeline is registered as "turn" — the Turn never built' };

          const root = document.documentElement;
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1;
          const ink = canvas.getContext('2d');
          if (!ink) return { missing: 'no 2d context — the ground cannot be rasterised' };

          const sample = () => {
            ink.clearRect(0, 0, 1, 1);
            ink.fillStyle = getComputedStyle(root).backgroundColor;
            ink.fillRect(0, 0, 1, 1);
            const [r, g, b] = ink.getImageData(0, 0, 1, 1).data;
            return [r, g, b];
          };

          const was = turn.progress();
          kernel.hold?.();
          try {
            turn.progress(0);
            const paper = sample();
            turn.progress(1);
            const arrived = sample();
            return { theme: root.dataset.theme, paper, arrived };
          } finally {
            turn.progress(was);
            kernel.release?.();
          }
        });

        if ('missing' in read) {
          failures.push(`${theme}: ${read.missing}`);
          continue;
        }
        if (read.theme !== theme) {
          failures.push(
            `${theme}: the page came up as data-theme="${read.theme}" — the Shell's inline script ignored both storage and the media query`,
          );
        }

        measured[`${theme} at the start of the Turn`] = { rgb: read.paper, light: luminance(read.paper) };
        measured[`${theme} at the end of the Turn`] = { rgb: read.arrived, light: luminance(read.arrived) };
      } finally {
        await context.close();
      }
    }

    const at = (key) => measured[key];
    const say = (key) => {
      const found = at(key);
      return found ? `${hex(found.rgb)} (luminance ${found.light.toFixed(3)})` : '(not measured)';
    };

    // Light theme, before the crossing: this is the one a reader arrives on, and
    // the one whose failure looks like the author's own preview going black.
    const paper = at('light at the start of the Turn');
    if (paper && paper.light < PAPER_AT_LEAST) {
      failures.push(
        `light theme is not on paper at the start of the Turn: ${say('light at the start of the Turn')}, wanted luminance >= ${PAPER_AT_LEAST}`,
      );
    }

    for (const key of [
      'light at the end of the Turn',
      'dark at the start of the Turn',
      'dark at the end of the Turn',
    ]) {
      const found = at(key);
      if (found && found.light > DARK_AT_MOST) {
        failures.push(`${key} is not dark: ${say(key)}, wanted luminance <= ${DARK_AT_MOST}`);
      }
    }

    const arrived = at('light at the end of the Turn');
    if (paper && arrived && paper.light - arrived.light < APART_AT_LEAST) {
      failures.push(
        `the Turn barely moves the ground: ${say('light at the start of the Turn')} to ` +
          `${say('light at the end of the Turn')}, wanted them >= ${APART_AT_LEAST} apart in luminance`,
      );
    }

    // Reported whether or not anything failed: the bands are wide on purpose, so
    // a deliberate drift towards a warmer paper passes, and the only way the
    // author sees it happened is a passing run that still prints the numbers.
    return {
      failures,
      notes: Object.entries(measured).map(([key, found]) => `${key}: ${hex(found.rgb)} (luminance ${found.light.toFixed(3)})`),
    };
  },
};
