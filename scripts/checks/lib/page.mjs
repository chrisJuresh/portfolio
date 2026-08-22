/**
 * Opening the Portfolio the way a reader arrives at it, and recording what the
 * browser did while it loaded.
 *
 * Every Check gets its own context, so nothing one Check does to the page — a
 * theme flip, a held Timeline, a fully-lit Effect Stack — can reach the next one.
 */

/** The route the Portfolio's new foundation is served at until the ticket that flips it. */
export const PAGE = '/next';

/** The same window the /portfolio checks in design/tools/ use, so the two agree about one drawing. */
export const DESK = { width: 1440, height: 900 };

const THEME_KEY = 'portfolio-theme';

/**
 * @typedef {object} Record
 * @property {{ status: number, url: string }[]} responses  every response the page received
 * @property {{ url: string, failure: string }[]} failed     requests that never got one
 * @property {{ type: string, text: string, at: string }[]} logged  console messages
 * @property {string[]} thrown  uncaught exceptions
 */

/**
 * @param {import('playwright').Browser} browser
 * @param {string} origin
 * @param {{ theme?: 'light' | 'dark', path?: string, fx?: string }} [options]
 */
export async function open(browser, origin, options = {}) {
  const { theme = 'light', path = PAGE, fx } = options;

  const context = await browser.newContext({
    viewport: DESK,
    deviceScaleFactor: 1,
    // Not `reduce`: a reader who asked for less motion gets the Section settled
    // and nothing scrubbing, which is the one state where a Timeline's moments
    // are not on screen. The Checks assert the default reader's experience.
    reducedMotion: 'no-preference',
    colorScheme: theme,
  });

  // Both routes into a theme, because the Shell's inline script prefers storage
  // and falls back to the media query — priming only one leaves the other Check
  // asserting about whichever the browser happened to pick.
  await context.addInitScript(`try { localStorage.setItem(${JSON.stringify(THEME_KEY)}, ${JSON.stringify(theme)}) } catch {}`);
  if (fx !== undefined) {
    await context.addInitScript(`
      new MutationObserver((_, observer) => {
        if (!document.documentElement) return;
        document.documentElement.setAttribute('data-fx', ${JSON.stringify(fx)});
        observer.disconnect();
      }).observe(document, { childList: true, subtree: true });
    `);
  }

  /** @type {Record} */
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
