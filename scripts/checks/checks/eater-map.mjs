import { DESK, open, settle } from '../lib/page.mjs';

/**
 * The Eater Map Section's flat Exploded View — the two things about it that
 * break without anybody noticing.
 *
 * Neither is aesthetic and neither is a number somebody chose. Every Token in
 * `src/sections/eater-map/tokens.css` may be set to anything without failing
 * this: the Slab may take any share of the stage, the Cards may sit anywhere on
 * it, and the interface may be drawn larger than life. What is asserted is a
 * RELATIONSHIP that has to hold whatever those are set to, and a fact about the
 * markup.
 *
 * ONE. THE CARDS ARE DRAWN AT THE SLAB'S OWN SCALE. The whole trick of this
 * Section is that a photograph and three live surfaces read as one screenshot,
 * and the only thing making that true is that the Cards are scaled by the Slab's
 * drawn width over the phone Eater was captured at. The composition derives that
 * with `tan(atan2(…))`, because CSS cannot otherwise divide one length by
 * another, and it carries a constant to fall back on. So the failure this exists
 * for is the derivation quietly going away: the fallback renders a perfectly
 * plausible screenshot, and it is a plausible screenshot at ONE window and an
 * interface floating over a map of the wrong scale at every other.
 *
 * TWO WINDOWS FOR EXACTLY THAT REASON, and it is the lesson `front-screen`
 * already paid for. At DESK the constant is within a third of a per cent of the
 * derived answer, so a Check run only there passes with the derivation deleted.
 * At the short end of the band they are a quarter apart.
 *
 * TWO. THE PICTURE IS NOT PART OF THE DOCUMENT'S FURNITURE. The Cards are the
 * Eater app's own markup, so they arrive with a text field, links off to other
 * sites, buttons that do nothing here, and a restaurant's name marked up as the
 * page's top-level heading. Left alone that is thirteen tab stops in the middle
 * of the Portfolio and a restaurant in its outline — every one of them invisible
 * to a reader looking at the page and a surprise to one navigating it by keyboard
 * or by heading. `cards.ts` takes them out, and takes them out IN THE MARKUP
 * rather than in a stylesheet, which is exactly the kind of thing that is quietly
 * undone by a regeneration.
 *
 * WHAT IS NOT HERE. That the Cards render at all, that the map is the right map,
 * and that any of it looks right: a person opening the page sees all three. And
 * the Slab's bytes — `assets` already asserts that everything the page fetches
 * arrives, and how EARLY a lazy image is fetched is Chromium's own distance
 * policy rather than this page's. NOTES.md in the Section says what was measured.
 */

/** Inside the band, and the window every other Check reads. */
const WIDE = DESK;

/** The short corner of the band. The derived scale here is about 0.56 against
 *  DESK's 0.72, which is what makes a constant impossible to hide at both. */
const SHORT = { width: 1100, height: 700 };

/** The Cards are laid out in whole pixels and the rects are subpixel, so this is
 *  loose enough for rounding and nowhere near loose enough to swallow a fallback
 *  standing in for the derivation. As a share of the scale. */
const SCALE_TOLERANCE = 0.005;

/** Everything the browser will let a reader focus, and the query cards.ts is
 *  written against. `[tabindex]` catches one added by hand later. */
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex], [contenteditable]';

async function atWindow(browser, origin, viewport) {
  const { context, page } = await open(browser, origin, { viewport });
  try {
    const failures = (await settle(page)).map((why) => `${viewport.width}x${viewport.height}: ${why}`);

    const seen = await page.evaluate((focusable) => {
      const slab = document.querySelector('.eater-map__slab');
      if (!slab) return { missing: 'no .eater-map__slab on the page' };

      // The phone Eater was captured at, off the element the component writes it
      // on — so this reads the composition's own number rather than a copy of it.
      const app = Number.parseFloat(getComputedStyle(slab).getPropertyValue('--eater-map-app-w'));
      const slabWidth = slab.getBoundingClientRect().width;

      const cards = [...document.querySelectorAll('[data-eater-card]')].map((card) => ({
        name: card.getAttribute('data-eater-card') ?? '(unnamed)',
        // The rect is the TRANSFORMED box and the computed width is the one the
        // vendored stylesheet froze it to, so their ratio is the scale actually
        // applied — which is the thing being asserted, rather than the property
        // it happens to be written in.
        drawn: card.getBoundingClientRect().width,
        declared: Number.parseFloat(getComputedStyle(card).width),
      }));

      const stage = document.querySelector('.eater-map__stage');
      const reachable = stage
        ? [...stage.querySelectorAll(focusable)].filter((el) => el.tabIndex >= 0).length
        : 0;
      // A heading whose role has been taken off it is text; one that still has it
      // is an entry in the page's outline.
      const announced = stage
        ? [...stage.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter(
            (el) => !['presentation', 'none'].includes(el.getAttribute('role') ?? ''),
          ).length
        : 0;

      return { app, slabWidth, cards, reachable, announced, cardCount: cards.length };
    }, FOCUSABLE);

    const where = `${viewport.width}x${viewport.height}`;
    if (seen.missing) {
      failures.push(`${where}: ${seen.missing}`);
      return failures;
    }

    if (!(seen.app > 0)) {
      failures.push(`${where}: the Slab does not say what phone it was captured at — --eater-map-app-w is ${seen.app}`);
    }
    if (!(seen.slabWidth > 0)) {
      failures.push(`${where}: the Slab has no width, so nothing about the scale on it could be read`);
    }
    if (seen.cardCount === 0) {
      failures.push(`${where}: no Card on the Slab, so nothing about their scale was checked`);
    }

    const slabScale = seen.slabWidth / seen.app;
    for (const card of seen.cards) {
      const drawnScale = card.drawn / card.declared;
      // EVERY COMPARISON BELOW IS FALSE WHEN EITHER SIDE IS NaN, which is the
      // shape scripts/checks/NOTES.md warns about three times: a Card that is
      // `display: none` computes a width of `auto`, parses to NaN, and would sail
      // through the tolerance while reading as though it had been measured.
      if (!Number.isFinite(drawnScale) || !Number.isFinite(slabScale) || drawnScale <= 0) {
        failures.push(
          `${where}: the ${card.name} Card cannot be measured — ${card.drawn}px drawn over ` +
            `${card.declared}px declared. Nothing about its scale was asserted`,
        );
        continue;
      }
      const off = Math.abs(drawnScale - slabScale) / slabScale;
      if (off > SCALE_TOLERANCE) {
        failures.push(
          `${where}: the ${card.name} Card is drawn at ${drawnScale.toFixed(4)} and the Slab at ` +
            `${slabScale.toFixed(4)} — the Card is not at the map's scale, so this is three ` +
            'stickers on a photograph rather than one screenshot',
        );
      }
    }

    if (seen.reachable > 0) {
      failures.push(
        `${where}: ${seen.reachable} focusable element(s) inside the Exploded View — it is a ` +
          'picture of an app, and its controls belong to no page a reader can be sent to',
      );
    }
    if (seen.announced > 0) {
      failures.push(
        `${where}: ${seen.announced} heading(s) inside the Exploded View — a restaurant's name is ` +
          "the app's heading and not this document's, and it is in the outline a reader navigates by",
      );
    }

    return failures;
  } finally {
    await context.close();
  }
}

export const check = {
  name: 'eater-map',
  title: 'the Cards lie on the Slab at its own scale, and the picture is only a picture',

  /** @param {{ browser: import('playwright').Browser, origin: string }} ctx */
  async run({ browser, origin }) {
    const found = [];
    for (const viewport of [WIDE, SHORT]) {
      found.push(...(await atWindow(browser, origin, viewport)));
    }
    return found;
  },
};
