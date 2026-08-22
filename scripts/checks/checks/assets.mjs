import { inBothThemes, settle, withoutOrigin } from '../lib/page.mjs';

/**
 * Every asset the page reaches for arrives.
 *
 * Run in both themes, and with the whole Effect Stack lit, because a reference
 * that is never followed is a reference this Check cannot see: the corner
 * pictures fetch the ladder for the theme ON SCREEN, so a broken dark rung is
 * invisible from light, and a layer's texture is only referenced once that layer
 * is named.
 *
 * WHERE THIS STOPS, stated so nobody reads more into a pass than is there: it
 * asserts that everything the page FETCHED arrived. A file that exists in the
 * tree, is named in the source, and is not fetched in this run — the 1300px rung
 * of a corner picture at this viewport and this pixel ratio — is not covered.
 * Widening it means either walking the CSS for `url()`s or rendering the whole
 * rung grid, and both are more machinery than the failure is worth: a missing
 * rung shows up the moment a display asks for it, and `assets` catches it then.
 */

/** Every layer, so both Effect Stack textures are actually fetched. */
const ALL_LAYERS = 'paper halftone film grain grille scan roll tube vignette';

/**
 * The one 404 that is not a failure.
 *
 * `design/plate/build-plate.py` writes no dark ladder while dark's grade matches
 * light's, and `corners.ts` retries the light rung of the same width when a dark
 * one misses. That is the ordinary untuned state, documented in
 * src/kernel/NOTES.md, so failing on it would fail a tree nobody has broken.
 * A LIGHT rung is not covered: nothing falls back past that one.
 */
const UNTUNED_DARK_RUNG = /\/portfolio\/img\/(?:plate|car|eye)-dark-\d+\.webp(?:\?|$)/;

export const check = {
  name: 'assets',
  title: 'every asset the page reaches for arrives',

  /** @param {{ browser: import('playwright').Browser, origin: string }} ctx */
  async run({ browser, origin }) {
    const found = await inBothThemes(
      browser,
      origin,
      { fx: ALL_LAYERS },
      async ({ theme, page, record }) => {
        /** @type {string[]} */
        const failures = (await settle(page)).map((why) => `${theme}: ${why}`);

        const reported = new Set();
        for (const { status, url } of record.responses) {
          if (status < 400) continue;
          if (UNTUNED_DARK_RUNG.test(url)) continue;
          if (reported.has(url)) continue;
          reported.add(url);
          failures.push(`${theme}: ${status} for ${withoutOrigin(url, origin)}`);
        }
        for (const { url, failure } of record.failed) {
          if (UNTUNED_DARK_RUNG.test(url)) continue;
          // A 404 already reported above also arrives here as an aborted request,
          // and one broken file is one thing to fix rather than two lines to read.
          if (reported.has(url)) continue;
          reported.add(url);
          failures.push(`${theme}: ${withoutOrigin(url, origin)} never answered — ${failure}`);
        }

        // A page that fetched almost nothing is a page whose stylesheet did not
        // arrive, which would otherwise read as "no asset 404'd".
        if (record.responses.length < 4) {
          failures.push(
            `${theme}: only ${record.responses.length} response(s) — the document fetched nothing, so nothing was checked`,
          );
        }

        return failures;
      },
    );

    return found.flat();
  },
};
