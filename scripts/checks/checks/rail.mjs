import { DESK, open, settle } from '../lib/page.mjs';

/**
 * One Rail, standing still, naming the Section the page is resting on.
 *
 * #192 moved the Rail out of the two Sections that each drew one and into the
 * Kernel, and every failure that move can have is invisible on a still. A second
 * Rail is invisible because the two agree; a Rail that scrolls away with its
 * Section looks perfect at both resting places and wrong for the 800ms between
 * them; a highlight that stops following the page turn looks right on the way
 * down and wrong on the way back; and an entry that says "not built" in colour
 * and not in words is only wrong to a reader who cannot see the colour.
 *
 * FIVE THINGS, and the reason each is here rather than left to a person looking:
 *
 *   * THERE IS EXACTLY ONE. Two Sections used to render one each and the page
 *     swapped them, which is the whole of what that ticket deleted — and it is
 *     the failure a screenshot cannot show, because the second one is a screen
 *     away from the first. Counted at every window, because the Rail has two
 *     regimes and a duplicate could be introduced in either.
 *   * IT DOES NOT MOVE ACROSS THE PAGE TURN. The ticket's own sentence is
 *     "turning from the Gallery to the Eater Map moves the highlight and nothing
 *     else", and this is that sentence as an assertion: the box is read in
 *     VIEWPORT coordinates at both resting places and the two have to be the same
 *     box. A Rail drawn inside a Section fails it by a whole screen; one drawn in
 *     the Kernel and left in flow fails it by the same amount.
 *   * AND IT STANDS IN THE PAGE'S OWN MARGIN. In the band that is `--landing-side`,
 *     the length both Sections read for the column the composition leaves — so
 *     this is an equality between the drawn box and the Kernel's own published
 *     margin rather than a number anybody typed. Outside the band the Rail is a
 *     row above the Gallery, and what has to agree there is its left edge with
 *     the composition's: two different clamps, in two different files, which is
 *     exactly the shape NOTES.md says a Check has to hold rather than a comment.
 *   * THE HIGHLIGHT FOLLOWS, IN BOTH DIRECTIONS. Derived from the Section at rest
 *     rather than declared, so the failure is a stale entry rather than a missing
 *     one: at the Gallery's port the Gallery's entry is current, at the Eater
 *     Map's the Eater Map's, and turning BACK has to put it back. The way back is
 *     the half that a one-way "have we arrived" walk passes.
 *   * AND THE TWO READERS WHO ARE NOT LOOKING GET IT. An entry with no Section of
 *     its own says so in words to a screen reader and in grey to everybody else,
 *     so the words have to be there AND have to be invisible — either one alone
 *     is satisfiable by breaking the other. And a reader whose scripts never
 *     arrived gets a Rail with exactly one current entry, because nothing will
 *     ever run `rail.ts` for them.
 *
 * THREE WINDOWS AND THEY ARE TWO REGIMES PLUS A CORNER. The Rail is pinned to the
 * window inside the landing band and in flow outside it, so both have to be read;
 * and the band's SHORT corner is read as well because `--landing-side` is a `vh`
 * clamp against a size that is a share of a composition, and the two only part
 * company where the window is short.
 */

/** The band's short corner: the smallest window that is still a page turn. */
const CORNER = { width: 1100, height: 700 };

/** Below the band, where the page is a scroll and the Rail is a row. */
const STACKED = { width: 820, height: 1180 };

/** Two lengths that are meant to be the same length, in px. Chromium lays boxes
 *  out in 1/64px units and a clamp resolved twice is not resolved twice — this is
 *  rounding, and the failures it is drawn against are a whole column wide. */
const TOGETHER = 0.5;

/** How far apart two readings of a box that must not have moved may be, in px.
 *  A fixed box is fixed: this is the same rounding, not a tolerance for travel. */
const STILL = 0.5;

export const check = {
  name: 'rail',
  title: 'one Rail, standing still, naming the Section the page is resting on',

  /** @param {{ browser: import('playwright').Browser, origin: string }} ctx */
  async run({ browser, origin }) {
    /** @type {string[]} */
    const failures = [];
    /** @type {string[]} */
    const notes = [];

    // ---- the band, at both of its ends ------------------------------------
    for (const { name, viewport } of [
      { name: `desk ${DESK.width}x${DESK.height}`, viewport: DESK },
      { name: `corner ${CORNER.width}x${CORNER.height}`, viewport: CORNER },
    ]) {
      const { context, page } = await open(browser, origin, { viewport });
      try {
        failures.push(...(await settle(page)).map((why) => `${name}: ${why}`));

        const read = await page.evaluate(async () => {
          const kernel = window.portfolio;
          const rails = document.querySelectorAll('[data-rail]');
          if (rails.length !== 1) return { rails: rails.length };
          const rail = /** @type {HTMLElement} */ (rails[0]);

          const frame = () => new Promise((next) => requestAnimationFrame(next));
          const box = () => {
            const rect = rail.getBoundingClientRect();
            return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
          };
          /** Which entry is current, by the Section it names. */
          const current = () => {
            const marked = [...rail.querySelectorAll('[aria-current]')];
            const item = marked[0]?.closest('[data-rail-item]');
            return {
              count: marked.length,
              names: item instanceof HTMLElement ? (item.dataset.railFor ?? null) : null,
            };
          };

          // The two resting places, asked of the Kernel rather than computed:
          // the Panel's port is its own scroll-margin-top off its top edge, and
          // restating that here would be a second copy of page-turn.ts.
          const ports = kernel?.ports?.() ?? [];
          if (ports.length < 3) return { rails: 1, ports: ports.length };

          // Snapping stays ON: every position below is a port, which is exactly
          // where a reader is allowed to rest, so there is nothing for the snap
          // to pull back — and asserting from the ports is the point.
          const stops = [];
          for (const [label, y] of [
            ['the Gallery', ports[1]],
            ['the Eater Map', ports[2]],
            ['the Gallery again', ports[1]],
          ]) {
            window.scrollTo(0, y);
            await frame();
            await frame();
            stops.push({ label, y, box: box(), current: current() });
          }
          window.scrollTo(0, 0);
          await frame();

          const style = getComputedStyle(rail);

          // THE MARGIN IS MEASURED BY ASKING THE PAGE FOR IT, not by reading the
          // property. `--landing-side` is unregistered, so its computed value is
          // the token sequence it was written as — `clamp(2.25rem, 6.5vh, 5rem)`,
          // which parses as NaN and would make every comparison below vacuous. A
          // probe resolves it exactly as the Kernel does, against the same body.
          const probe = document.createElement('div');
          probe.style.cssText =
            'position:absolute;left:0;top:0;height:0;visibility:hidden;width:var(--landing-side)';
          document.body.append(probe);
          const margin = probe.getBoundingClientRect().width;
          probe.remove();

          // The unbuilt entry: the one with no link. Its extra words have to be
          // in the tree and out of the picture.
          const unlinked = [...rail.querySelectorAll('[data-rail-item]')].filter(
            (item) => !item.querySelector('a'),
          );
          const quiet = unlinked.map((item) => {
            const spans = [...item.querySelectorAll('span')].map((span) => {
              const rect = span.getBoundingClientRect();
              return {
                said: (span.textContent ?? '').trim(),
                w: rect.width,
                h: rect.height,
              };
            });
            return { text: (item.textContent ?? '').trim(), spans };
          });

          return {
            rails: 1,
            stops,
            margin,
            position: style.position,
            entries: rail.querySelectorAll('[data-rail-item]').length,
            quiet,
          };
        });

        if (read.rails !== 1) {
          failures.push(
            `${name}: ${read.rails} element(s) carry [data-rail], wanted exactly 1. The Rail is one ` +
              'piece of furniture standing on the page (#192); a second one is invisible for as long ' +
              'as the two agree and is two indexes the moment they do not.',
          );
          continue;
        }
        if (!read.stops) {
          failures.push(
            `${name}: the Kernel reports ${read.ports} resting place(s) — this window is meant to be ` +
              'a page turn with one port per Section, so nothing about the turn was compared',
          );
          continue;
        }

        // ---- it does not move -----------------------------------------------
        const [gallery, eaterMap, back] = read.stops;
        let travelled = 0;
        for (const later of [eaterMap, back]) {
          const moved = Math.max(
            Math.abs(later.box.x - gallery.box.x),
            Math.abs(later.box.y - gallery.box.y),
            Math.abs(later.box.w - gallery.box.w),
            Math.abs(later.box.h - gallery.box.h),
          );
          travelled = Math.max(travelled, moved);
          if (moved > STILL) {
            failures.push(
              `${name}: the Rail is at ${describe(gallery.box)} at the Gallery and ${describe(later.box)} ` +
                `at ${later.label} — ${moved.toFixed(1)}px apart, wanted <= ${STILL}. Turning the page has ` +
                'to move the highlight and nothing else; a Rail that travels is one drawn inside a ' +
                'Section, or one left in the document flow.',
            );
          }
        }

        // ---- and it stands in the page's own margin --------------------------
        if (Math.abs(gallery.box.x) > TOGETHER) {
          failures.push(
            `${name}: the Rail's left edge is at x=${gallery.box.x.toFixed(1)}, wanted the page's own ` +
              'edge at 0 — its column IS the page\'s left margin',
          );
        }
        if (!Number.isFinite(read.margin) || read.margin <= 0) {
          failures.push(
            `${name}: --landing-side did not resolve on the body, so the Rail's column was compared ` +
              'against nothing',
          );
        } else if (Math.abs(gallery.box.w - read.margin) > TOGETHER) {
          failures.push(
            `${name}: the Rail is ${gallery.box.w.toFixed(1)}px wide in a ${read.margin.toFixed(1)}px ` +
              'margin — the column the composition leaves and the column the names are set across are ' +
              'the same column, and --landing-side is the one length both read for it',
          );
        } else {
          notes.push(
            `${name}: the Rail is ${gallery.box.w.toFixed(1)}px of a ${read.margin.toFixed(1)}px margin, ` +
              `${read.entries} entries, ${read.position}, and travels ${travelled.toFixed(1)}px across ` +
              'the turn',
          );
        }

        // ---- the highlight follows, in both directions -----------------------
        for (const [stop, wanted] of [
          [gallery, 'projects'],
          [eaterMap, 'eater-map'],
          [back, 'projects'],
        ]) {
          if (stop.current.count !== 1) {
            failures.push(
              `${name}: at ${stop.label} ${stop.current.count} entries are aria-current, wanted 1 — ` +
                'the Rail marks the Section the page is resting on, and exactly one Section is',
            );
          } else if (stop.current.names !== wanted) {
            failures.push(
              `${name}: at ${stop.label} the current entry names "${stop.current.names}", wanted ` +
                `"${wanted}". The entry is derived from the Section at rest, so this is the highlight ` +
                'not following the page turn' +
                (stop.label.endsWith('again') ? ' BACK, which a one-way walk would pass.' : '.'),
            );
          }
        }

        // ---- and the entry with no Section says so out loud ------------------
        if (read.quiet.length === 0) {
          failures.push(
            `${name}: every entry of the Rail is a link, so nothing said "not built" — this Check ` +
              'then asserts nothing about the one thing an unbuilt entry has to do (ADR 0007)',
          );
        }
        for (const entry of read.quiet) {
          const hidden = entry.spans.filter((span) => span.said.length > 0 && span.w <= 1 && span.h <= 1);
          if (hidden.length === 0) {
            failures.push(
              `${name}: the unbuilt entry reads "${entry.text}" and carries no clipped span — a project ` +
                'with no Section of its own is grey to anything looking and has to be said in words to ' +
                'anything listening',
            );
          } else {
            notes.push(`${name}: the unbuilt entry says "${hidden[0].said.trim()}" to a screen reader only`);
          }
        }
      } finally {
        await context.close();
      }
    }

    // ---- outside the band: one Rail, at the head of the index ---------------
    {
      const where = `stacked ${STACKED.width}x${STACKED.height}`;
      const { context, page } = await open(browser, origin, { viewport: STACKED });
      try {
        failures.push(...(await settle(page)).map((why) => `${where}: ${why}`));

        const read = await page.evaluate(() => {
          const rails = document.querySelectorAll('[data-rail]');
          if (rails.length !== 1) return { rails: rails.length };
          const rail = /** @type {HTMLElement} */ (rails[0]);
          const first = document.querySelector('[data-section]');
          const gallery = document.querySelector('[data-section="projects-panel"]');
          if (!first || !gallery) return { rails: 1, missing: true };

          const at = (element) => {
            const rect = element.getBoundingClientRect();
            return { top: rect.top + window.scrollY, bottom: rect.bottom + window.scrollY };
          };
          const inset = (element) => {
            const style = getComputedStyle(element);
            return element.getBoundingClientRect().x + Number.parseFloat(style.paddingLeft || '0');
          };

          return {
            rails: 1,
            snapping: getComputedStyle(rail).position,
            firstFoot: at(first).bottom,
            railTop: at(rail).top,
            railFoot: at(rail).bottom,
            galleryTop: at(gallery).top,
            railInk: inset(rail),
            galleryInk: inset(gallery),
          };
        });

        if (read.rails !== 1) {
          failures.push(
            `${where}: ${read.rails} element(s) carry [data-rail], wanted exactly 1 — the page below ` +
              'the band is one scroll, and the index is printed once at the head of it',
          );
        } else if (read.missing) {
          failures.push(`${where}: no first Section or no Gallery on the page — nothing was compared`);
        } else {
          // IN FLOW, and it has to be: out here the Rail is the box between the
          // first Section's foot and the Gallery's top edge, which is where the
          // Panel used to draw it. Pinned to the window it would ride over the
          // scroll instead, which is a nav bar and a different design.
          if (!(read.railTop >= read.firstFoot - TOGETHER && read.railFoot <= read.galleryTop + TOGETHER)) {
            failures.push(
              `${where}: the Rail runs ${read.railTop.toFixed(0)}–${read.railFoot.toFixed(0)}px in the ` +
                `document, and the first Section ends at ${read.firstFoot.toFixed(0)} with the Gallery ` +
                `beginning at ${read.galleryTop.toFixed(0)} — out of the band the index is in flow at the ` +
                `head of the thing it indexes (it is \`position: ${read.snapping}\`)`,
            );
          }
          // TWO CLAMPS IN TWO FILES, HELD TO EACH OTHER ON THE PAGE. `--rail-side`
          // restates the Panel's `--projects-panel-stack-side` because the Kernel
          // may not read a Section, and a restatement that nothing compares is a
          // number waiting to drift.
          if (Math.abs(read.railInk - read.galleryInk) > TOGETHER) {
            failures.push(
              `${where}: the Rail's names start at x=${read.railInk.toFixed(1)} and the composition ` +
                `under them at x=${read.galleryInk.toFixed(1)} — the index and the thing it indexes ` +
                'share one left edge, and --rail-side is a restatement of the Section\'s own margin',
            );
          } else {
            notes.push(
              `${where}: one Rail, in flow at ${read.railTop.toFixed(0)}px, sharing the composition's ` +
                `left edge at x=${read.railInk.toFixed(1)}`,
            );
          }
        }
      } finally {
        await context.close();
      }
    }

    // ---- and a reader who runs nothing ---------------------------------------
    {
      const where = 'scripting off';
      const { context, page } = await open(browser, origin, { javaScriptEnabled: false });
      try {
        // No settle(): nothing mounts for this reader, which is the point.
        const read = await page.evaluate(() => {
          const rails = document.querySelectorAll('[data-rail]');
          const rail = rails[0];
          return {
            rails: rails.length,
            current: rail ? rail.querySelectorAll('[aria-current]').length : 0,
            names: rail
              ? [...rail.querySelectorAll('[aria-current]')].map((one) => {
                  const item = one.closest('[data-rail-item]');
                  return item instanceof HTMLElement ? (item.dataset.railFor ?? '(unnamed)') : '(loose)';
                })
              : [],
          };
        });

        if (read.rails !== 1) {
          failures.push(
            `${where}: ${read.rails} element(s) carry [data-rail], wanted exactly 1 — the Rail is markup ` +
              'and not something a script builds',
          );
        } else if (read.current !== 1) {
          failures.push(
            `${where}: ${read.current} entries are aria-current, wanted 1. Nothing will ever run rail.ts ` +
              'for this reader, so the entry the page opens on has to be in the document Astro rendered.',
          );
        } else {
          notes.push(`${where}: one Rail, opening on "${read.names[0]}"`);
        }
      } finally {
        await context.close();
      }
    }

    return { failures, notes };
  },
};

function describe(box) {
  return `${box.w.toFixed(1)}x${box.h.toFixed(1)} at (${box.x.toFixed(1)}, ${box.y.toFixed(1)})`;
}
