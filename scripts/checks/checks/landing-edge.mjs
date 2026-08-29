import { open, settle } from '../lib/page.mjs';

/**
 * Out of the landing band the Turn is an EDGE, and it holds the four promises
 * that make it one.
 *
 * WHY THIS IS NOT MEASURED AT DESK, and the reason is the mechanism rather than
 * a preference: it is gated on NOT being in the band, so the suite's own window
 * is the one window where none of it runs. Two are used, and they fail the band
 * for DIFFERENT REASONS — a phone is too narrow, and a short wide window is tall
 * enough for nothing and wide enough for everything. The band is one query with
 * two terms, so a Check that only ever failed it on width would pass a query
 * whose height term had been deleted. DESK is opened too, and asserts the
 * opposite: that in the band none of this is switched on at all.
 *
 * WHAT IT ASSERTS, and none of it is a number somebody chose:
 *
 *   THE CONTACT BLOCK IS NEVER TAKEN BY THE DARK while there is still paper on
 *   the screen. This is the one hard constraint the composition has — the line
 *   climbs past the word and stops, and where it stops has to be below the last
 *   thing that has to stay readable on paper. It is a relationship between two
 *   boxes at every scroll position, not a gap of so many pixels.
 *
 *   THE LINE ONLY EVER CLIMBS. A line that travels back down is a page that
 *   un-turns, and it is what an arithmetic error in the clamp looks like: the
 *   floor catches the line, the reader scrolls on, and the dark retreats.
 *
 *   THE WORD IS CUT BY IT. The device is the boundary passing THROUGH the
 *   letterforms — dark ink on the paper above, light ink on the black below —
 *   which is what the fold does to this same word inside the band. A dark that
 *   arrives entirely above the word or entirely below it is a different effect
 *   that would pass every other assertion here.
 *
 *   AND THE PAGE NEVER BECOMES A MIX. This is the regression the whole device
 *   replaced: with no fold to cross at, --ground carried the entire document
 *   from paper into dark together and the reader got a grey page with a grey
 *   word on it for the length of a scroll. So --ground has to hold exactly ONE
 *   value for the whole scroll, in both themes. One value is a page that is
 *   paper until the plate covers it; two or more is a wash, whatever the two
 *   happen to be.
 *
 * AND THE TURN IS THE LINE'S OWN NUMBER. Not a second clock: --turn is 0 while
 * the word is still below the screen and 1 by the time the word has reached the
 * top, so the letterforms, the Effect Stack's veil and the dark all arrive
 * together. An earlier answer deferred the Turn until the line had gone, which
 * satisfies "is it dark at the end" and reads as two crossings; that one fails
 * here, which is the point.
 *
 * WHAT IT DOES NOT ASSERT: anything about how it looks. Not the margin above the
 * word, not where up the screen the climb finishes, not the gap under the
 * contact block. Those are the composition and they are the author's.
 *
 * WHAT IT HAS BEEN BROKEN WITH. Five mutations, each applied on its own, built,
 * and run: the Turn deferred until the line had left the screen (the answer this
 * replaced); the paper end of the mix left free to move; the word's `z-index`
 * taken off so the line paints across the letters; the duplicate masthead left
 * painting; and the line moved above the word so the dark arrives over it rather
 * than through it. All five fail here.
 *
 * AND ONE THAT DOES NOT, which is worth more than the five. Defeating the clamp
 * in `belowCap()` — the floor that keeps the dark off the contact block — passes
 * every assertion, because `--landing-edge-gap` is derived from the same margin
 * and puts the climb's end exactly ON that floor. The two are tangent, so the
 * clamp is inert at the composition's current numbers and there is nothing on
 * screen to see when it goes. What is asserted here is the OUTCOME — the contact
 * block is clear at every scroll — which holds whether the clamp or the gap is
 * what delivers it, and which would fail if a future margin made them disagree.
 * A Check for the clamp itself would be a Check that MARGIN appears twice in one
 * file, which is not a fact about the page.
 */

/** Too narrow for the band. */
const PHONE = { width: 390, height: 844 };

/** Too short for it, and wide enough that only the height term can be failing. */
const SHORT = { width: 1200, height: 640 };

/** In it, and there to assert that none of this is switched on. */
const DESK = { width: 1440, height: 900 };

/** A line that climbs by this much between two samples has travelled back. Not
 *  zero, because the line is published to two decimals and read back as a
 *  computed length. */
const BACKWARDS = 0.6;

/** The crossing has to take at least this much of a screen of scroll. A
 *  degenerate ScrollTrigger reports 0 at the top and 1 one pixel later, which
 *  satisfies both ends of every other assertion here while having stopped being
 *  a crossing — scripts/checks/NOTES.md has the same trap under `front-screen`. */
const SPAN_AT_LEAST = 0.5;

/** How far apart the samples are, in pixels of scroll. */
const STEP = 16;

export const check = {
  name: 'landing-edge',
  title: 'out of the band the Turn is an edge that climbs through PROJECTS, and the page never greys',

  /** @param {{ browser: import('playwright').Browser, origin: string }} ctx */
  async run({ browser, origin }) {
    /** @type {string[]} */
    const failures = [];
    /** @type {string[]} */
    const notes = [];

    for (const [label, viewport] of [
      ['phone', PHONE],
      ['short', SHORT],
    ]) {
      for (const theme of /** @type {const} */ (['light', 'dark'])) {
        const where = `${label} ${viewport.width}x${viewport.height} ${theme}`;
        const { context, page } = await open(browser, origin, { theme, viewport });
        try {
          failures.push(...(await settle(page)).map((why) => `${where}: ${why}`));

          const read = await page.evaluate(async (step) => {
            const frame = () =>
              new Promise((go) => requestAnimationFrame(() => requestAnimationFrame(go)));
            const root = document.documentElement;
            const word = document.querySelector('[data-landing-word] a');
            const over = document.querySelector('[data-landing-over]');
            const plate = document.querySelector('.kernel-edge');
            if (!word) return { missing: 'nothing on the page carries data-landing-word' };
            if (!over) return { missing: 'nothing on the page carries data-landing-over' };
            if (!plate) return { missing: 'the Kernel laid down no .kernel-edge plate' };

            // The Kernel may not have switched the device on at all, and every
            // assertion below would then pass against a page that simply never
            // does any of this.
            const on = root.hasAttribute('data-turn-edge');
            const shown = getComputedStyle(plate).display;
            const lit = document.querySelector('.front-screen__cut-lit');
            const litShown = lit ? getComputedStyle(lit).display : '(absent)';

            // THE PAGE SAYS PROJECTS ONCE. Out here it used to say it twice — the
            // Friz word at the foot of the column and the Panel's masthead a
            // hundred and fifty pixels below it — and the word only reads as the
            // Panel's head because the second one goes.
            //
            // ASKED AS TWO QUESTIONS RATHER THAN ABOUT A DECLARATION, because
            // the two ways of getting this wrong are opposite. `checkVisibility`
            // is the reader's question and does not care which property did it;
            // `display` is the screen reader's, because this Section's
            // `aria-labelledby` names this element and a display:none element
            // supplies no accessible name where a hidden one still does. Taking
            // it out of the flow with a 1px box and forgetting to hide it leaves
            // the word overflowing that box and painting anyway, which passed
            // every other assertion here.
            const mast = document.querySelector('#projects-panel-masthead');
            const masthead = mast
              ? {
                  seen: mast.checkVisibility({
                    visibilityProperty: true,
                    opacityProperty: true,
                    contentVisibilityAuto: true,
                  }),
                  display: getComputedStyle(mast).display,
                }
              : null;

            // The ordering the whole device rests on, and it is spread over three
            // files: the plate has to be above every Effect Stack layer, the
            // Panel above the plate, and the word above the Panel. Read rather
            // than assumed, because each of the four is declared somewhere else.
            const zOf = (element) => {
              const z = Number.parseInt(getComputedStyle(element).zIndex, 10);
              return Number.isFinite(z) ? z : null;
            };
            const layers = [...document.querySelectorAll('.fx > *')].map(zOf).filter((z) => z !== null);
            const order = {
              fx: layers.length ? Math.max(...layers) : null,
              plate: zOf(plate),
              panel: zOf(document.querySelector('[data-section="projects-panel"]')),
              word: zOf(document.querySelector('[data-landing-word]')),
            };

            const max = document.documentElement.scrollHeight - innerHeight;
            const grounds = new Set();
            /** every sample, so the failures below can name where it went wrong */
            let worstClearance = Number.POSITIVE_INFINITY;
            let worstAt = null;
            let back = 0;
            let backAt = null;
            let previous = Number.POSITIVE_INFINITY;
            let cutsTheWord = false;
            let turnBelowFold = 0;
            let turnAtTop = null;
            let turnFirstMoved = null;
            let turnArrived = null;

            for (let y = 0; y <= max; y += step) {
              scrollTo(0, y);
              await frame();

              const line = Number.parseFloat(
                getComputedStyle(document.body).getPropertyValue('--landing-edge-top'),
              );
              const turn = Number(getComputedStyle(root).getPropertyValue('--turn')) || 0;
              const cap = word.getBoundingClientRect();
              grounds.add(getComputedStyle(root).getPropertyValue('--ground').trim());

              if (!Number.isFinite(line)) continue;

              // While any paper is on the screen — the line has not reached the
              // top edge — the contact block's foot must be above the line.
              if (line > 0) {
                const clear = line - over.getBoundingClientRect().bottom;
                if (clear < worstClearance) {
                  worstClearance = clear;
                  worstAt = y;
                }
              }
              if (line > previous + 0.6 && backAt === null) backAt = y;
              if (line > previous + 0.6) back += 1;
              previous = line;

              // The boundary strictly inside the word's own cap box, which is
              // the device: the word is cut by the line rather than met by it.
              if (line > cap.top + 1 && line < cap.bottom - 1) cutsTheWord = true;

              // The Turn against the WORD's place on the screen, which is what
              // makes it one crossing rather than two.
              if (cap.top > innerHeight) turnBelowFold = Math.max(turnBelowFold, turn);
              if (cap.top <= 0 && turnAtTop === null) turnAtTop = turn;
              if (turn > 0.02 && turnFirstMoved === null) turnFirstMoved = y;
              if (turn > 0.98 && turnArrived === null) turnArrived = y;
            }

            return {
              on,
              shown,
              litShown,
              masthead,
              order,
              max,
              grounds: [...grounds],
              clearance: worstClearance,
              clearanceAt: worstAt,
              back,
              backAt,
              cutsTheWord,
              turnBelowFold,
              turnAtTop,
              span:
                turnFirstMoved !== null && turnArrived !== null ? turnArrived - turnFirstMoved : null,
            };
          }, STEP);

          if ('missing' in read) {
            failures.push(`${where}: ${read.missing}`);
            continue;
          }

          // Everything below is about a device that is switched on. If it is not,
          // say so once rather than reporting eight consequences of it.
          if (!read.on) {
            failures.push(
              `${where}: the Kernel never wrote data-turn-edge on the document — this window is outside the landing band, so the Turn should be an edge here and is still the whole document's mix`,
            );
            continue;
          }
          if (read.shown === 'none') {
            failures.push(
              `${where}: .kernel-edge computes display:none with data-turn-edge set — the plate that draws the line is not painted`,
            );
          }
          if (read.litShown !== 'block') {
            failures.push(
              `${where}: the lit copy of the word computes display:${read.litShown} — nothing draws the half of PROJECTS that stands on the black`,
            );
          }

          if (read.masthead === null) {
            failures.push(
              `${where}: the Panel has no #projects-panel-masthead — the element its own aria-labelledby names is gone`,
            );
          } else if (read.masthead.seen) {
            failures.push(
              `${where}: the Panel's masthead is still visible — the page says PROJECTS twice out here, once as the Cut Title and once in the sans below it`,
            );
          } else if (read.masthead.display === 'none') {
            failures.push(
              `${where}: the Panel's masthead is display:none — this Section's aria-labelledby names it, so the Panel has lost its accessible name to hide a duplicate`,
            );
          }

          const { fx, plate, panel, word } = read.order;
          if (fx === null || plate === null || panel === null || word === null) {
            failures.push(
              `${where}: one of the four layers carries no z-index — fx ${fx}, plate ${plate}, panel ${panel}, word ${word}`,
            );
          } else {
            if (!(plate > fx)) {
              failures.push(
                `${where}: the plate is not above the Effect Stack — plate z ${plate}, topmost layer z ${fx}, so the paper's treatment runs on over the dark`,
              );
            }
            if (!(panel > plate)) {
              failures.push(
                `${where}: the Projects Panel is not above the plate — panel z ${panel}, plate z ${plate}, so the black is painted over the Panel's own text`,
              );
            }
            if (!(word > panel)) {
              failures.push(
                `${where}: the Cut Title is not above the Panel — word z ${word}, panel z ${panel}, so the line is painted across the letters instead of behind them`,
              );
            }
            notes.push(`${where}: z fx ${fx} < plate ${plate} < panel ${panel} < word ${word}`);
          }

          if (read.grounds.length !== 1) {
            failures.push(
              `${where}: --ground took ${read.grounds.length} values across the scroll (${read.grounds.join(', ')}) — the page is crossing as a MIX again, which is the grey wash the edge replaced`,
            );
          }

          if (!Number.isFinite(read.clearance)) {
            failures.push(
              `${where}: the line was never below the top of the window at any scroll — nothing was measured about the contact block`,
            );
          } else if (read.clearance <= 0) {
            failures.push(
              `${where}: the dark took the contact block while paper was still on screen — the line was ${(-read.clearance).toFixed(1)}px ABOVE its foot at scroll ${read.clearanceAt}`,
            );
          } else {
            notes.push(
              `${where}: contact block clear by ${read.clearance.toFixed(1)}px at its worst (scroll ${read.clearanceAt} of ${read.max})`,
            );
          }

          if (read.back > 0) {
            failures.push(
              `${where}: the line travelled back down ${read.back} time(s), first at scroll ${read.backAt} — the page un-turns as the reader goes on`,
            );
          }

          if (!read.cutsTheWord) {
            failures.push(
              `${where}: the line was never inside the word's own cap box — the dark arrives above or below PROJECTS instead of through it, which is not the crossing the band does`,
            );
          }

          if (read.turnBelowFold > 0.02) {
            failures.push(
              `${where}: --turn had already reached ${read.turnBelowFold.toFixed(3)} while the word was still below the bottom of the window — the Turn is running on something other than the word`,
            );
          }
          if (read.turnAtTop === null) {
            failures.push(
              `${where}: the word never reached the top of the window in ${read.max}px of scroll — the crossing could not be measured against it`,
            );
          } else if (read.turnAtTop < 0.98) {
            failures.push(
              `${where}: --turn was only ${read.turnAtTop.toFixed(3)} by the time PROJECTS reached the top of the window — the page has not finished turning where the word finishes arriving, so the Turn is a second clock`,
            );
          }

          const wanted = Math.round(SPAN_AT_LEAST * viewport.height);
          if (read.span === null) {
            failures.push(`${where}: --turn never moved off 0, or never reached 1`);
          } else if (read.span < wanted) {
            failures.push(
              `${where}: the crossing took ${read.span}px of scroll, wanted at least ${wanted} — a Turn that flips rather than crosses passes every other assertion here`,
            );
          } else {
            notes.push(`${where}: the crossing takes ${read.span}px of scroll`);
          }
        } finally {
          await context.close();
        }
      }
    }

    // AND IN THE BAND, NOTHING. The fold is the line in there and every rule
    // above would be a second one drawn across it.
    const { context, page } = await open(browser, origin, { viewport: DESK });
    try {
      failures.push(...(await settle(page)).map((why) => `desk: ${why}`));
      const band = await page.evaluate(() => {
        const plate = document.querySelector('.kernel-edge');
        const lit = document.querySelector('.front-screen__cut-lit');
        return {
          on: document.documentElement.hasAttribute('data-turn-edge'),
          sections: [...document.querySelectorAll('[data-section]')].filter((one) =>
            one.hasAttribute('data-turn-edge'),
          ).length,
          plate: plate ? getComputedStyle(plate).display : '(absent)',
          lit: lit ? getComputedStyle(lit).display : '(absent)',
        };
      });
      if (band.on || band.sections > 0) {
        failures.push(
          `desk ${DESK.width}x${DESK.height}: data-turn-edge is set inside the landing band (root ${band.on}, ${band.sections} Section(s)) — the fold is already the line in here, and this would draw a second one across it`,
        );
      }
      if (band.plate !== 'none') {
        failures.push(
          `desk ${DESK.width}x${DESK.height}: .kernel-edge computes display:${band.plate} in the band — the plate is painted over a page that is already crossing at the fold`,
        );
      }
      if (band.lit !== 'none') {
        failures.push(
          `desk ${DESK.width}x${DESK.height}: the lit copy of the word computes display:${band.lit} in the band — a second PROJECTS is drawn over the first`,
        );
      }
    } finally {
      await context.close();
    }

    return { failures, notes };
  },
};
