/**
 * Opening the Portfolio the way a reader arrives at it, and recording what the
 * browser did while it loaded.
 *
 * Every Check gets its own context, so nothing one Check does to the page — a
 * theme flip, a held Timeline, a fully-lit Effect Stack — can reach the next one.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The route the Portfolio is served at. */
export const PAGE = '/portfolio';

/** The same window the /portfolio checks in design/tools/ use, so the two agree about one drawing. */
export const DESK = { width: 1440, height: 900 };

/**
 * Where the theme is stored, READ OUT OF THE KERNEL rather than written down here.
 *
 * `src/kernel/theme.ts` owns the name and exports it, but this is a plain `.mjs`
 * script and Node will not import a `.ts` module — so the constant is lifted out
 * of the source instead of copied. Copied, it would go stale on a rename with one
 * symptom: the Checks priming a key nothing reads, both themes coming up as
 * whatever the media query said, and only ground's `data-theme` line to say so.
 * Failing here instead names the file.
 */
const THEME_KEY = (() => {
  const file = fileURLToPath(new URL('../../../src/kernel/theme.ts', import.meta.url));
  const found = /THEME_KEY\s*=\s*['"]([^'"]+)['"]/.exec(readFileSync(file, 'utf8'));
  if (!found) throw new Error(`page.mjs: no THEME_KEY in ${file} — the Kernel renamed it`);
  return found[1];
})();

/**
 * Which stage draws the Eater Map Section's Slab, for every Check in this run.
 *
 * WHY IT IS AN ENVIRONMENT VARIABLE AND NOT AN OPTION. #181 builds the Exploded
 * View a second time in WebGL, and its last acceptance criterion is that every
 * Check passes with EITHER stage selected — which is a property of the whole
 * suite rather than of any one Check, and threading a parameter through fourteen
 * modules to say so would put the alternative's name in every one of them. The
 * runner sets this from `--stage`; a Check never mentions it, and the default
 * path is exactly what it was.
 *
 * Set on the document's root element rather than put on the URL, because a Check
 * that opens a deep link chooses its own path and this must not rewrite it.
 * `src/sections/eater-map/stage.ts` reads both and prefers this one.
 *
 * READ WHEN A PAGE IS OPENED AND NEVER AT MODULE SCOPE, and this cost a whole
 * verification. `run.mjs` sets the variable in its own body — but it also
 * `import`s all fourteen Checks at the top, every one of them imports this file,
 * and ESM evaluates the WHOLE import graph before the importing module's first
 * statement runs. A `const` here is therefore always `undefined`, the init script
 * below never runs, and the suite quietly opens every page with the shipped stage
 * while printing that it opened them with the other one. It passes, which is
 * exactly the failure NOTES.md warns about twice: a run that reads as asserting
 * something and asserts nothing.
 */
const stageAsked = () => process.env.PORTFOLIO_STAGE;

/**
 * An init script that puts one attribute on the document's root element.
 *
 * A MutationObserver because at document start there is no `documentElement` to
 * hang anything off yet, and both attributes below are read by the Shell before
 * first paint — too early for anything the page could be told afterwards.
 *
 * @param {string} name
 * @param {string} value
 */
function stamps(name, value) {
  return `
    new MutationObserver((_, observer) => {
      if (!document.documentElement) return;
      document.documentElement.setAttribute(${JSON.stringify(name)}, ${JSON.stringify(value)});
      observer.disconnect();
    }).observe(document, { childList: true, subtree: true });
  `;
}

/** A URL with the throwaway origin taken off, so a failure reads as a path. */
export function withoutOrigin(url, origin) {
  return String(url).startsWith(origin) ? String(url).slice(origin.length) : String(url);
}

/**
 * What the browser did while the page loaded.
 *
 * `Recording` and not `Record`: the latter shadows TypeScript's built-in
 * `Record<K, V>` for every annotation in this file, and the two Checks that
 * annotate a `Record<string, …>` would silently resolve it to this object
 * instead. `Check` is taken too — CONTEXT.md gives it a meaning and every Check
 * module exports it.
 *
 * @typedef {object} Recording
 * @property {{ status: number, url: string }[]} responses  every response the page received
 * @property {{ url: string, failure: string }[]} failed     requests that never got one
 * @property {{ type: string, text: string, at: string }[]} logged  console messages
 * @property {string[]} thrown  uncaught exceptions
 */

/**
 * `viewport` is DESK unless a Check names another one, and a Check that does had
 * better say why: the same window for every Check is what makes two failures
 * comparable, and a composition fitted to one screen has regimes that are only
 * reachable at particular sizes.
 *
 * `reducedMotion` and `javaScriptEnabled` are the two reader states the page
 * behaves DIFFERENTLY in rather than merely more quietly, so a Check asking about
 * either has to say so. Both default to the ordinary reader, and a Check that
 * changes one is asserting about the promise that state carries: that the
 * recording's bytes are never fetched, and that what the page draws without
 * script is a whole composition rather than a hole where one should be. A Check
 * in either state cannot `settle()` a Section's Timeline — nothing scrubs under
 * the first and nothing mounts at all under the second.
 *
 * @param {import('playwright').Browser} browser
 * @param {string} origin
 * @param {{ theme?: 'light' | 'dark', path?: string, fx?: string, viewport?: { width: number, height: number }, reducedMotion?: 'reduce' | 'no-preference', javaScriptEnabled?: boolean }} [options]
 */
export async function open(browser, origin, options = {}) {
  const {
    theme = 'light',
    path = PAGE,
    fx,
    viewport = DESK,
    // Not `reduce`: a reader who asked for less motion gets the Section settled
    // and nothing scrubbing, which is the one state where a Timeline's moments
    // are not on screen. The Checks assert the default reader's experience unless
    // one of them names this.
    reducedMotion = 'no-preference',
    javaScriptEnabled = true,
  } = options;

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion,
    javaScriptEnabled,
    colorScheme: theme,
  });

  // Both routes into a theme, because the Shell's inline script prefers storage
  // and falls back to the media query — priming only one leaves the other Check
  // asserting about whichever the browser happened to pick.
  await context.addInitScript(`try { localStorage.setItem(${JSON.stringify(THEME_KEY)}, ${JSON.stringify(theme)}) } catch {}`);
  // Both of these are attributes the Shell's own script reads before first paint,
  // so they have to be on the element before it exists — hence the observer, and
  // hence one helper rather than two spellings of it.
  const stage = stageAsked();
  if (stage !== undefined) await context.addInitScript(stamps('data-eater-map-stage', stage));
  if (fx !== undefined) await context.addInitScript(stamps('data-fx', fx));

  /** @type {Recording} */
  const record = { responses: [], failed: [], logged: [], thrown: [] };

  const page = await context.newPage();
  page.on('response', (response) => {
    record.responses.push({ status: response.status(), url: response.url() });
  });
  page.on('requestfailed', (request) => {
    record.failed.push({ url: request.url(), failure: request.failure()?.errorText ?? 'unknown' });
  });
  page.on('console', (message) => {
    const where = message.location();
    record.logged.push({
      type: message.type(),
      text: message.text(),
      at: where.url ? `${where.url}:${where.lineNumber}` : '',
    });
  });
  page.on('pageerror', (error) => {
    record.thrown.push(error.stack ?? String(error));
  });

  await page.goto(origin + path, { waitUntil: 'load' });

  return { context, page, record };
}

/**
 * Run `visit` against the page in each theme, and close each context whatever
 * happens inside it.
 *
 * Three Checks need both themes — the corner pictures fetch the ladder for the
 * theme on screen, and the ground is a different colour in each — and the `try`
 * / `finally` that closes the context is the part it is possible to forget. A
 * leaked context holds its Chromium target open for the rest of the run.
 *
 * `visit` is handed `{ theme, page, record }` and whatever it returns is
 * collected, in theme order.
 *
 * @template T
 * @param {import('playwright').Browser} browser
 * @param {string} origin
 * @param {{ fx?: string, path?: string }} options
 * @param {(seen: { theme: 'light' | 'dark', page: import('playwright').Page, record: Recording }) => Promise<T>} visit
 * @returns {Promise<T[]>}
 */
export async function inBothThemes(browser, origin, options, visit) {
  /** @type {T[]} */
  const seen = [];
  for (const theme of /** @type {const} */ (['light', 'dark'])) {
    const { context, page, record } = await open(browser, origin, { ...options, theme });
    try {
      seen.push(await visit({ theme, page, record }));
    } finally {
      await context.close();
    }
  }
  return seen;
}

/**
 * Bring the page to the state a reader who has scrolled through it would see:
 * every Section mounted, every face resolved, nothing still in flight.
 *
 * A Section mounts on approach rather than at load (ADR 0001), so a Check that
 * reads the page without scrolling reads a document with no Sections in it —
 * which looks like every Section-shaped assertion passing vacuously.
 */
export async function settle(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, window.innerHeight / 2);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((frame) => requestAnimationFrame(frame));
    }
    window.scrollTo(0, 0);
    await new Promise((frame) => requestAnimationFrame(frame));
  });

  const stuck = await page
    .waitForFunction(
      () => {
        const roots = [...document.querySelectorAll('[data-section]')];
        return roots.length > 0 && roots.every((root) => root.dataset.mounted === 'true');
      },
      undefined,
      { timeout: 10_000 },
    )
    .then(() => null)
    .catch(() =>
      page.evaluate(() =>
        [...document.querySelectorAll('[data-section]')].map(
          (root) => `${root.dataset.section ?? '(unnamed)'}=${root.dataset.mounted ?? 'never'}`,
        ),
      ),
    );

  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle').catch(() => {});

  // A Section stuck at `pending` is a failure for whichever Check is asking, not
  // for this helper — so it is reported rather than thrown, and the Check names
  // which mount point never arrived.
  if (stuck === null) return [];
  if (stuck.length === 0) {
    return ['the Shell laid down no [data-section] mount points — nothing on the page is a Section'];
  }
  return [`a Section never mounted: ${stuck.join(', ')} — the loader or its chunk did not arrive`];
}
