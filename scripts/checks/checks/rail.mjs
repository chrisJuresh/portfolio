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

/** Below the band, where the page is a scroll and the Rail is a row. The same
 *  window `crossing.mjs` calls PORTRAIT, deliberately and not by accident: it is
 *  the reader's own case — taller than it is wide — and reading the two Checks'
 *  failures side by side is worth more than sharing the constant, which every
 *  Check in this suite declares for itself. */
const STACKED = { width: 820, height: 1180 };

/** Wide enough for the band and too short for it — the regime the two Sections
 *  drew a vertical Rail in and the Kernel draws the row in, and therefore the one
 *  regime #192 moved. The same window `projects-panel` opens for its container
 *  query, so a failure here and a failure there are comparable. */
const WIDE_SHORT = { width: 1440, height: 450 };

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
          /**
           * WHAT IS ACTUALLY HIT AT EACH ENTRY, which is a different question
           * from where the Rail is drawn and the one this Check did not ask.
           *
           * The Rail is out of flow and BEFORE the Gallery in the document, so
           * a positioned Section following it is hit-tested ABOVE it however
           * correctly the box paints. That shipped for one commit: every link in
           * the Rail was dead at the Gallery's resting place and alive at the
           * Eater Map's — because that Section is unpositioned — and both screens
           * screenshot perfectly. A rect cannot see it and neither can
           * `aria-current`.
           *
           * Reported as "is the thing under the pointer inside the Rail", per
           * entry, because that is the whole claim: the reader can reach the
           * index. Which ELEMENT it is is handed back too, so a failure names
           * what is covering it.
           */
          const reachable = () =>
            [...rail.querySelectorAll('[data-rail-item]')].map((item) => {
              const rect = item.getBoundingClientRect();
              const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
              return {
                entry: item.getAttribute('data-rail-for') ?? '(unbuilt)',
                inside: hit instanceof Node && rail.contains(hit),
                hit: hit
                  ? hit.tagName.toLowerCase() +
                    (typeof hit.className === 'string' && hit.className ? `.${hit.className.split(' ')[0]}` : '')
                  : 'nothing',
              };
            });

          /** Which entry is current, by the Section it names. One name and not a
           *  list: `count` is what says whether more than one was marked, and it
           *  is asserted separately. */
          const current = () => {
            const marked = [...rail.querySelectorAll('[aria-current]')];
            const item = marked[0]?.closest('[data-rail-item]');
            return {
              count: marked.length,
              named: item instanceof HTMLElement ? (item.dataset.railFor ?? null) : null,
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
          //
          // THE ARRIVAL IS WAITED FOR AND THEN REPORTED, rather than assumed
          // after a frame or two. `scrollTo` sets the position synchronously but
          // the `scroll` event — which is what moves the highlight — is dispatched
          // at the next rendering opportunity, so a fixed number of frames is a
          // sampling window to miss. This waits until the page is actually
          // standing on the port and hands `landed` back, so a Check that read
          // the highlight before it moved fails on the scroll rather than on the
          // Rail. NOTES.md: no clock in a Check.
          // EACH STOP CARRIES WHAT IT EXPECTS, which is not tidiness: the first
          // draft had the three stops here and their three expected names in a
          // second list next to the assertion, in an order that had to agree
          // silently — so reordering either one would have compared the Gallery's
          // stop against the Eater Map's answer and passed. The port index and the
          // Section it names travel together.
          const stops = [];
          for (const [label, y, wants] of [
            ['the Gallery', ports[1], 'projects'],
            ['the Eater Map', ports[2], 'eater-map'],
            ['the Gallery again', ports[1], 'projects'],
          ]) {
            window.scrollTo(0, y);
            let waited = 0;
            while (Math.abs(window.scrollY - y) > 1 && waited < 60) {
              await frame();
              waited += 1;
            }
            // One further rendering opportunity once it has arrived: the scroll
            // event for the last movement is delivered before it.
            await frame();
            stops.push({
              label,
              y,
              wants,
              landed: window.scrollY,
              box: box(),
              current: current(),
              reachable: reachable(),
            });
          }

          // AND THE FIRST SCREEN, WHERE THE RAIL IS INVISIBLE AND MUST THEREFORE
          // BE UNREACHABLE. `opacity: 0` leaves a box hit-testable and focusable,
          // so a fixed Rail put three invisible links over the Front Screen's own
          // margin — the opposite failure from the one above, in the same
          // mechanism, and it needs the same question asked with the answer
          // inverted.
          window.scrollTo(0, 0);
          await frame();
          await frame();
          const atTop = {
            turn: Number(getComputedStyle(document.documentElement).getPropertyValue('--turn')) || 0,
            reachable: reachable(),
            focusable: rail.querySelectorAll('a').length,
            visibility: getComputedStyle(rail).visibility,
          };

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
            atTop,
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
        for (const stop of read.stops) {
          // THE ARRIVAL FIRST, or the highlight is being read at a scroll
          // position the page never reached and the failure names the wrong
          // thing.
          if (Math.abs(stop.landed - stop.y) > 1) {
            failures.push(
              `${name}: sent to ${Math.round(stop.y)}px for ${stop.label} and the page came to rest at ` +
                `${Math.round(stop.landed)}px — the resting place is not where the Kernel says it is, so ` +
                'the highlight below was read somewhere a reader could not be',
            );
            continue;
          }
          if (stop.current.count !== 1) {
            failures.push(
              `${name}: at ${stop.label} ${stop.current.count} entries are aria-current, wanted 1 — ` +
                'the Rail marks the Section the page is resting on, and exactly one Section is',
            );
          } else if (stop.current.named !== stop.wants) {
            failures.push(
              `${name}: at ${stop.label} the current entry names "${stop.current.named}", wanted ` +
                `"${stop.wants}". The entry is derived from the Section at rest, so this is the highlight ` +
                'not following the page turn' +
                (stop.label.endsWith('again') ? ' BACK, which a one-way walk would pass.' : '.'),
            );
          }

          // ---- and the reader can actually reach it -------------------------
          const covered = stop.reachable.filter((one) => !one.inside);
          if (covered.length > 0) {
            failures.push(
              `${name}: at ${stop.label} ${covered.length} of ${stop.reachable.length} entries are ` +
                `covered — ${covered.map((one) => `${one.entry} is under ${one.hit}`).join(', ')}. The Rail ` +
                'is out of flow and BEFORE the Gallery in the document, so a positioned Section after it ' +
                'is hit-tested above it however correctly the box paints: the links are dead and both ' +
                'screens screenshot perfectly. A z-index on the Rail is what settles it.',
            );
          }
        }

        // ---- invisible on the first screen means unreachable there ----------
        if (read.atTop.turn > 0) {
          failures.push(
            `${name}: --turn is ${read.atTop.turn} at the top of the document, so the Rail is not ` +
              'transparent there and this assertion is about the wrong screen',
          );
        } else {
          const live = read.atTop.reachable.filter((one) => one.inside);
          if (live.length > 0) {
            failures.push(
              `${name}: at the top of the document the Rail is drawn at --turn 0 and ${live.length} of ` +
                `its ${read.atTop.reachable.length} entries are still hit-testable (\`visibility: ` +
                `${read.atTop.visibility}\`). An invisible index over the Front Screen's own margin is ` +
                `${read.atTop.focusable} links and ${read.atTop.focusable} tab stops a reader cannot see ` +
                '— `opacity` hides a box and leaves both, so the Rail has to be taken out of hit testing ' +
                'and out of the tab order while it is away.',
            );
          } else {
            notes.push(
              `${name}: at the top the Rail is \`visibility: ${read.atTop.visibility}\` — invisible, and ` +
                'unreachable with it',
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
    //
    // TWO WINDOWS, AND THE SECOND IS THE ONE REGIME THIS TICKET ACTUALLY MOVED.
    // The two Sections split the Rail on the WIDTH alone, so above 1100px and
    // under 700 it was a vertical grid column inside each of them; the Kernel
    // splits on the BAND, so out there it is the row. That is the only placement
    // that changed and it would otherwise have shipped with no window opened on
    // it — which is this file's own rule about a Check reading three windows
    // because they are three compositions rather than three sizes.
    //
    // ONLY THE STACKED ONE SHARES A LEFT EDGE WITH THE COMPOSITION, and the flag
    // says so rather than the assertion being quietly skipped. Wide and short,
    // the Panel's composition is capped by the screen's HEIGHT and centred, so
    // it stands hundreds of pixels in from the page's margin the Rail is set on
    // — asserting they agree there would be asserting a coincidence, and
    // src/kernel/NOTES.md carries why the Kernel cannot read that offset.
    for (const { where, viewport, sharesEdge } of [
      { where: `stacked ${STACKED.width}x${STACKED.height}`, viewport: STACKED, sharesEdge: true },
      { where: `wide-short ${WIDE_SHORT.width}x${WIDE_SHORT.height}`, viewport: WIDE_SHORT, sharesEdge: false },
    ]) {
      const { context, page } = await open(browser, origin, { viewport });
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
          // WHERE THE INK STARTS: the box's own left edge plus its left padding,
          // which for both of these boxes is the page's side margin. Read off the
          // ELEMENT and not off a rule — `padding: var(--rail-crown) var(--rail-side) 0`
          // has no `padding-left` a stylesheet walk can see, and a computed style
          // resolves the shorthand.
          //
          // NO FALLBACK, AND THE CALLER IS WHY. A `0` here would be a number the
          // two boxes could AGREE about while neither had a padding, so it would
          // hide the failure; a `NaN` cannot be agreed about — but `NaN > 0.5` is
          // also false, so on its own it would hide the failure just as well. What
          // makes returning it the right answer is the `Number.isFinite` pair the
          // caller checks FIRST. Neither half works without the other.
          const inset = (element) => {
            const style = getComputedStyle(element);
            return element.getBoundingClientRect().x + Number.parseFloat(style.paddingLeft);
          };

          return {
            rails: 1,
            position: getComputedStyle(rail).position,
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
                `head of the thing it indexes (it is \`position: ${read.position}\`)`,
            );
          }
          // TWO CLAMPS IN TWO FILES, HELD TO EACH OTHER ON THE PAGE. `--rail-side`
          // restates the Panel's `--projects-panel-stack-side` because the Kernel
          // may not read a Section, and a restatement that nothing compares is a
          // number waiting to drift.
          //
          // BOTH READINGS ARE CHECKED FOR BEING NUMBERS FIRST, and that is not
          // ceremony: `Math.abs(NaN - x) > tolerance` is FALSE, so a padding that
          // stopped resolving would make the comparison below pass rather than
          // fail — which is NOTES.md's own trap, and the one the band's margin
          // probe exists for a few lines up.
          if (!sharesEdge) {
            notes.push(
              `${where}: one Rail, in flow at ${read.railTop.toFixed(0)}px — its left edge is the page's ` +
                `own at x=${read.railInk.toFixed(1)}, against the Section's content edge at ` +
                `x=${read.galleryInk.toFixed(1)} with the composition centred inside it. The two are not ` +
                'meant to agree here, and this is the one regime #192 moved',
            );
          } else if (!Number.isFinite(read.railInk) || !Number.isFinite(read.galleryInk)) {
            failures.push(
              `${where}: the Rail's left inset read ${read.railInk} and the Gallery's ${read.galleryInk} ` +
                '— one of the two paddings did not resolve, so the two left edges were not compared at all',
            );
          } else if (Math.abs(read.railInk - read.galleryInk) > TOGETHER) {
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
