import { inBothThemes, settle, withoutOrigin } from '../lib/page.mjs';

/**
 * Nothing on the page complains.
 *
 * A console error is the one signal that is loud in a browser and silent
 * everywhere else — the reader never sees it, the build never sees it, and the
 * author sees it only if a devtools panel happens to be open. The Section loader
 * reports a chunk that will not arrive this way and no other, so without this the
 * failure looks like a Section that simply has no motion.
 *
 * ERRORS ONLY, and warnings deliberately not. A warning on this page is nearly
 * always Chromium's own — a deprecation, a heuristic about an image, something
 * about a cookie — and none of it is under this repository's control. Blocking on
 * one would cost the author a prompt for a change nobody here made, which is the
 * single thing ADR 0006 says a blocking Check may not do. Everything the Kernel
 * and the Sections report themselves is `console.error`.
 */

/**
 * A failed fetch is Chromium's own console message and not the page's, and the
 * assets Check already reads the response codes with the one documented
 * exception. Counting it here as well would report the untuned dark ladder as an
 * error the assets Check has just decided is not one.
 */
const CHROMIUM_ABOUT_A_FETCH = /^Failed to load resource/;

export const check = {
  name: 'console',
  title: 'nothing on the page logs an error',

  /** @param {{ browser: import('playwright').Browser, origin: string }} ctx */
  async run({ browser, origin }) {
    const found = await inBothThemes(browser, origin, {}, async ({ theme, page, record }) => {
      /** @type {string[]} */
      const failures = [];
      await settle(page);

      // The theme toggle is a route into every theme-driven repaint on the page,
      // and a Section that throws only on a flip would otherwise never be asked to.
      await page.evaluate(() => window.portfolio?.toggleTheme?.());
      await page.waitForTimeout(250);

      for (const { type, text, at } of record.logged) {
        if (type !== 'error') continue;
        if (CHROMIUM_ABOUT_A_FETCH.test(text)) continue;
        failures.push(
          `${theme}: console.error — ${text}${at ? ` (${withoutOrigin(at, origin)})` : ''}`,
        );
      }
      for (const stack of record.thrown) {
        failures.push(`${theme}: uncaught — ${stack.split('\n').slice(0, 3).join(' / ')}`);
      }

      return failures;
    });

    return found.flat();
  },
};
