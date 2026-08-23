import { hex, luminance } from '../lib/colour.mjs';
import { inBothThemes, settle } from '../lib/page.mjs';

/**
 * The page is paper where it should be paper, and dark where it should be dark —
 * in both themes, at both ends of the Turn.
 *
 * WHY THE GROUND AND NOT THE INK. The ground is the one colour every other one on
 * the page is mixed against, it is painted by a single element, and it is what the
 * silent failure looks like: a theme regression that turns the whole document
 * black is invisible to every other Check here and to the build. ADR 0006 asked
 * for this Check by name, and #148 is what it replaced —
 * docs/agents/external-capture.md, which also records what this does NOT cover.
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
    /** @type {Reading[]} */
    const measured = [];

    await inBothThemes(browser, origin, {}, async ({ theme, page }) => {
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

        // THE ALPHA IS READ AS WELL AS THE THREE CHANNELS, and it is what stops
        // the dark assertions from passing vacuously. A page whose stylesheet
        // never arrived computes `backgroundColor` to `rgba(0,0,0,0)`, which this
        // canvas rasterises to #000000 — so "the ground is dark" was satisfied by
        // a ground that was not painted at all, and a dark-theme regression would
        // have been invisible. An unpainted ground is its own failure below.
        const sample = () => {
          ink.clearRect(0, 0, 1, 1);
          ink.fillStyle = getComputedStyle(root).backgroundColor;
          ink.fillRect(0, 0, 1, 1);
          const [r, g, b, a] = ink.getImageData(0, 0, 1, 1).data;
          return { rgb: [r, g, b], opaque: a === 255 };
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
        return;
      }
      if (read.theme !== theme) {
        failures.push(
          `${theme}: the page came up as data-theme="${read.theme}" — the Shell's inline script ignored both storage and the media query`,
        );
      }

      measured.push(reading(theme, 'start', read.paper));
      measured.push(reading(theme, 'end', read.arrived));
    });

    const at = (theme, end) => measured.find((one) => one.theme === theme && one.end === end);

    for (const one of measured) {
      if (!one.opaque) {
        failures.push(
          `${where(one)} is not painted at all — the computed background is transparent, so the Kernel's ground.css did not arrive`,
        );
      }
    }

    // Light theme, before the crossing: this is the one a reader arrives on, and
    // the one whose failure looks like the author's own preview going black.
    const paper = at('light', 'start');
    if (paper && paper.light < PAPER_AT_LEAST) {
      failures.push(
        `${where(paper)} is not on paper: ${describe(paper)}, wanted luminance >= ${PAPER_AT_LEAST}`,
      );
    }

    // Everything else is somewhere the page has to be dark: dark theme at either
    // end, and light theme once the Turn has arrived.
    for (const one of measured) {
      if (one === paper) continue;
      if (one.light > DARK_AT_MOST) {
        failures.push(`${where(one)} is not dark: ${describe(one)}, wanted luminance <= ${DARK_AT_MOST}`);
      }
    }

    const arrived = at('light', 'end');
    if (paper && arrived && paper.light - arrived.light < APART_AT_LEAST) {
      failures.push(
        `the Turn barely moves the ground: ${describe(paper)} to ${describe(arrived)}, ` +
          `wanted them >= ${APART_AT_LEAST} apart in luminance`,
      );
    }

    if (measured.length < 4) {
      failures.push(
        `only ${measured.length} of 4 readings were taken — the ground was not measured in both themes at both ends`,
      );
    }

    // Reported whether or not anything failed: the bands are wide on purpose, so
    // a deliberate drift towards a warmer paper passes, and the only way the
    // author sees it happened is a passing run that still prints the numbers.
    return {
      failures,
      notes: measured.map((one) => `${where(one)}: ${describe(one)}`),
    };
  },
};

/** @typedef {{ theme: 'light' | 'dark', end: 'start' | 'end', rgb: number[], opaque: boolean, light: number }} Reading */

/** @returns {Reading} */
function reading(theme, end, sampled) {
  return { theme, end, rgb: sampled.rgb, opaque: sampled.opaque, light: luminance(sampled.rgb) };
}

/** Named by what was measured, and not by a sentence. The sentences were the keys
 *  of a lookup once, and a typo in one read as "(not measured)" rather than as a
 *  failure — a Check silently asserting three things instead of four. */
function where(one) {
  return `${one.theme} theme at the ${one.end} of the Turn`;
}

function describe(one) {
  return `${hex(one.rgb)} (luminance ${one.light.toFixed(3)})`;
}
