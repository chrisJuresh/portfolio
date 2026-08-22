import { open, settle } from '../lib/page.mjs';

/**
 * Nothing on the page complains.
 *
 * A console error is the one signal that is loud in a browser and silent
 * everywhere else — the reader never sees it, the build never sees it, and the
 * author sees it only if a devtools panel happens to be open. `errors` and
 * `warnings` are both counted, because a Section's chunk failing to arrive is
 * logged by the loader as an error and is otherwise invisible: the Section just
 * has no motion.
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
    /** @type {string[]} */
    const failures = [];

    for (const theme of /** @type {const} */ (['light', 'dark'])) {
      const { context, page, record } = await open(browser, origin, { theme });
      try {
        await settle(page);
        // The theme toggle is a route into every theme-driven repaint on the
        // page, and a Section that throws only on a flip would otherwise never
        // be asked to.
        await page.evaluate(() => window.portfolio?.toggleTheme?.());
        await page.waitForTimeout(250);

        for (const { type, text, at } of record.logged) {
          if (type !== 'error' && type !== 'warning') continue;
          if (CHROMIUM_ABOUT_A_FETCH.test(text)) continue;
          failures.push(`${theme}: console.${type} — ${text}${at ? ` (${where(at, origin)})` : ''}`);
        }
        for (const stack of record.thrown) {
          failures.push(`${theme}: uncaught — ${firstLines(stack)}`);
        }
      } finally {
        await context.close();
      }
    }

    return failures;
  },
};

function where(at, origin) {
  return at.startsWith(origin) ? at.slice(origin.length) : at;
}

function firstLines(stack) {
  return stack.split('\n').slice(0, 3).join(' / ');
}
