import { PAGE, open, settle } from '../lib/page.mjs';

/**
 * Every Section on the page can be linked to, and the link opens the document
 * there.
 *
 * WHY THIS IS A CHECK AND NOT A LOOK. `/portfolio/<section>` is one document
 * served at several paths (ADR 0001), and the machinery that does it is spread
 * across three files that cannot see each other: the Section's own `id`, the
 * rewrite in vercel.json, and the jump in the Shell. Any one of them can go
 * missing without a single symptom on the page a person is looking at — the
 * document renders, every other Check passes, and the only thing that broke is a
 * URL somebody else is holding. A Section added without its rewrite is the same
 * failure with a shorter fuse.
 *
 * IT DERIVES THE LIST FROM THE PAGE, which is the direction that makes it worth
 * having. Reading vercel.json and asserting those paths work would pass a
 * deployment that had a rewrite for every Section it used to have; asking the
 * document which Sections it is made of, and then requiring a working deep link
 * for each, is the assertion that cannot be satisfied by standing still.
 *
 * WHERE AN ARRIVAL IS MEANT TO LAND IS THE SECTION'S OWN ANSWER, not this
 * file's. A Section may declare a `scroll-margin-top` — the Projects Panel does,
 * so that following a link brings its masthead's cap to rest on the line the
 * page's margin names rather than its box edge — and a Check asserting a bare
 * zero would fail that composition for being composed. So what is compared is
 * the Section's top edge against the inset the Section itself asked for. A jump
 * that never happened misses it by most of a screen.
 *
 * WHAT IT DOES NOT ASSERT: which Sections exist, what they are called, or what
 * that inset should be. Those are the composition's business.
 */

/** How far from where the Section asks to be put an arrival may land, in CSS
 *  pixels. A tolerance rather than an equality because both terms are computed
 *  lengths and half a device pixel of rounding is not a broken deep link. */
const AT_THE_TOP = 2;

export const check = {
  name: 'deep-links',
  title: 'every Section has a deep link, and it opens the document at that Section',

  /** @param {{ browser: import('playwright').Browser, origin: string }} ctx */
  async run({ browser, origin }) {
    /** @type {string[]} */
    const failures = [];
    /** @type {string[]} */
    const notes = [];

    // The document itself, settled, so every Section has mounted and can be
    // asked what it is called.
    const { context, page } = await open(browser, origin, { path: PAGE });
    /** @type {{ section: string, id: string }[]} */
    let sections = [];
    try {
      failures.push(...(await settle(page)));
      sections = await page.evaluate(() =>
        [...document.querySelectorAll('[data-section]')].map((root) => ({
          section: root.getAttribute('data-section') ?? '(unnamed)',
          id: root.id,
        })),
      );
    } finally {
      await context.close();
    }

    if (sections.length === 0) {
      return { failures: [...failures, `${PAGE} laid down no Sections — there is nothing to link to`] };
    }

    for (const { section, id } of sections) {
      if (!id) {
        failures.push(
          `the ${section} Section carries no id, so nothing can be linked to it — the id is the last segment ` +
            'of its deep link, and the Shell has nothing to jump to without one',
        );
        continue;
      }

      const path = `${PAGE}/${id}`;
      const answer = await fetch(origin + path);
      if (!answer.ok) {
        failures.push(
          `${path} answered ${answer.status} — the ${section} Section has an id and no rewrite. A deep link is ` +
            "declared in vercel.json, which is what the deployment reads and what the local servers mirror",
        );
        continue;
      }

      const served = await answer.text();
      if (!served.includes(`id="${id}"`)) {
        failures.push(`${path} answered with something that is not the document — no element carries id="${id}"`);
        continue;
      }

      const arrival = await open(browser, origin, { path });
      try {
        // NOT AT `load`, WHICH IS WHERE `open` LEAVES IT. A Section mounts on
        // approach and moves what is below it when it does, so the reader's
        // place has to be asserted once the page has stopped arriving —
        // measured at `load` this passes while a photograph landing a moment
        // later takes the Section off the top of the screen.
        await arrival.page.waitForLoadState('networkidle').catch(() => {});
        const landed = await arrival.page.evaluate(
          (wanted) => {
            const root = document.getElementById(wanted);
            if (!root) return null;
            return {
              top: root.getBoundingClientRect().top,
              asked: Number.parseFloat(getComputedStyle(root).scrollMarginTop) || 0,
              scrolled: window.scrollY,
            };
          },
          id,
        );
        if (landed === null) {
          failures.push(`${path} rendered without #${id} in it`);
          continue;
        }
        const missed = landed.top - landed.asked;
        if (Math.abs(missed) > AT_THE_TOP) {
          failures.push(
            `${path} opened with #${id} ${Math.round(missed)}px from where it asks to be put — its own ` +
              `scroll-margin-top is ${landed.asked.toFixed(1)}px and it came to rest ${landed.top.toFixed(1)}px ` +
              'down the viewport. The deep link served the document and then left the reader somewhere else in it',
          );
          continue;
        }
        notes.push(
          `${path} → #${id} at ${Math.round(landed.scrolled)}px` +
            (landed.asked > 0 ? `, on the ${landed.asked.toFixed(1)}px inset it asks for` : ''),
        );
      } finally {
        await arrival.context.close();
      }
    }

    return { failures, notes };
  },
};
