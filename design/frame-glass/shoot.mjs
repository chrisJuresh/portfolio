/* ============================================================================
   shoot.mjs — the two stills the clip's THEME is chosen between.

     node design/censor/capture-origin.mjs          # in another terminal
     node design/frame-glass/shoot.mjs

   Writes design/frame-glass/local/grid-light.png and grid-dark.png, 1440x900,
   which is `record`'s own viewport for this Project — so a still dropped into
   the studio's Frame is framed exactly as the clip is.

   WHY STILLS AND NOT A SECOND CLIP. The question is a colour, and a colour does
   not need 171 frames to answer. Re-cutting the clip in the other theme is the
   thing this is deciding WHETHER to do, so doing it to find out would be the
   whole cost of the decision paid to make the decision.

   IT SHOOTS THROUGH THE CENSORED ORIGIN AND NOT THE VAULT. 127.0.0.1:8792, not
   8770: the origin serves design/censor/mosaic.py's baked tiles in place of the
   fourteen confirmed ones, so no unobscured pixel of a real photograph is ever
   in the browser taking the picture — which is the same reason record is pointed
   at it. Run `node design/tools/check-capture-origin.mjs` first; it says whether
   the origin is the one the author signed off.

   THE DARK SHOT CHANGES THE ORIGIN'S OWN SEED, IN FLIGHT. capture-origin.mjs
   writes `photos.theme` into localStorage from a classic script at the top of
   <head>, which is the only place earlier than the app — both settings are read
   once before the first paint (see 4ca13a2). Seeding the key beforehand does not
   work and should not: that script is the LAST writer before the app reads it,
   which is the whole point of where it sits, so it wins. What this does instead
   is rewrite the one value inside that script as it is served, which is also the
   one line a dark re-cut would change in capture-origin.mjs itself. The theme is
   then read back off the page rather than assumed, so a shot that did not take is
   a shot that says so.

   Playwright resolves from the root install, not design/tools — this is not one
   of that folder's tools and does not want its lockfile.
   ============================================================================ */

import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ORIGIN = process.env.CAPTURE_ORIGIN ?? 'http://127.0.0.1:8792/';
const OUT = fileURLToPath(new URL('./local/', import.meta.url));

/* record's viewport for this Project, and the geometry design/censor/roll.json
   was assembled at. Restated here rather than read, the way
   design/tools/collect-roll.mjs restates it and for the same reason: this repo
   is not in record's node_modules. A shot at another size is a shot of a
   different layout. */
const VIEWPORT = { width: 1440, height: 900 };

/* Where the clip's Timeline starts: `startsAt: { scrollTop: 0 }` in
   design/record/projects/photos-censored/actions/scroll-peek.ts. The first Frame
   and the last are both here, which is what makes it the honest one to judge a
   ground colour on. */
const SCROLL_TOP = 0;

async function shoot(browser, theme) {
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });

  /* THE SEED IS REWRITTEN IN FLIGHT, NOT SET BEFOREHAND. An `addInitScript` runs
     before any document script and is then immediately overwritten by
     /__capture/seed.js, which is the origin's own seeding working exactly as it
     should — it is the last writer before the app reads the key, which is the
     whole point of it being at the top of <head>. So this intercepts that one
     script and swaps the value inside it: the same file, at the same moment, by
     the same mechanism, which is also the one line a dark re-cut would change in
     capture-origin.mjs. `photos.stack` in the same script is left alone, so the
     grid still mounts stacked and the shot is of the grid the clip shows. */
  await page.route('**/__capture/seed.js', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace('"photos.theme", "light"', `"photos.theme", "${theme}"`);
    await route.fulfill({ response, body });
  });

  await page.goto(ORIGIN, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.evaluate((top) => window.scrollTo(0, top), SCROLL_TOP);
  await page.waitForTimeout(1200);

  /* What the page READS AS, not what it was told. record's own theme module
     reports this rather than enforcing it, for the reason its comment gives: a
     site with only one theme is legitimately recorded in that theme. */
  const read = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme ?? '(unset)',
    corner: getComputedStyle(document.body).backgroundColor,
  }));

  const file = `${OUT}grid-${theme}.png`;
  await page.screenshot({ path: file, clip: { x: 0, y: 0, ...VIEWPORT } });
  await page.close();
  return { file, ...read };
}

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });
for (const theme of ['light', 'dark']) {
  const result = await shoot(browser, theme);
  console.log(`asked ${theme.padEnd(5)} → page reads ${result.theme.padEnd(7)} ground ${result.corner}`);
  if (result.theme !== theme) {
    console.log('  ^ the page did not take the seed; the shot is of whatever it decided instead');
  }
}
await browser.close();
console.log(`\nwrote to ${OUT} — gitignored, and deliberately so`);
