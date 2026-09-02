import { hex, luminance } from '../lib/colour.mjs';
import { open, settle } from '../lib/page.mjs';

/**
 * The crossing OUTSIDE the landing band: one page, one number, one rate.
 *
 * Above 1100x700 the document is a page turn and `turn` is the Check for it —
 * two ports, one notch, and the Panel painting no ground of its own because the
 * document has one. Below that band the same crossing is a scroll, both Sections
 * paint, and every failure this Check exists for is one a still of either
 * resting place looks perfect in. That is the whole reason it is a Check: the
 * page is right at the top and right at the bottom, and wrong all the way
 * between.
 *
 * FOUR THINGS, and each of them has been shipped wrong at least once.
 *
 *   * THE TWO SECTIONS ARE THE SAME COLOUR. The Panel's palette is a `color-mix`
 *     on `--turn`, and mixing it against `--ground` — which is itself a crossing
 *     on that same number — composes two crossings and leaves this Section a
 *     quarter darker than the page at the middle. Both are white at 0 and black
 *     at 1, so only the crossing is wrong: a hard step across the page at the
 *     Panel's top edge, travelling up with the scroll. That is what "banding"
 *     has meant every time it has been reported here.
 *   * IT ARRIVES WITH THE SECTION. The Turn's span out here is the first
 *     Section's own height, so the page is dark at exactly the moment the Panel
 *     reaches the top of the window. Spread over the document's whole scroll
 *     instead, the Panel comes to rest grey — a Section at its resting place on
 *     a page that has finished turning everywhere except in its colours.
 *   * AND IT IS NOT A FLIP. The other end of the same mistake: a span of a few
 *     pixels leaves `--turn` at 0 on the first screen and 1 on the second, every
 *     colour assertion passing, and no crossing on the page at all.
 *   * THE FOLD TAKES THE BITE, AND THE WORD IS WHOLE. Two assertions, and each
 *     is satisfiable by breaking the other, which is why both are here. PROJECTS
 *     meets the reader part-cut on the first screen — that is the screen's last
 *     gesture, and a whole word up there takes it away — and PROJECTS is a WHOLE
 *     word by the time the reader reaches the Section it is the head of, because
 *     with the Panel's masthead hidden it is the only title that Section has.
 *     Cutting it with a BOX satisfies the first and breaks the second, and that
 *     shipped: a title chopped through the middle, on screen, in the Section it
 *     titles. Cutting it with the FOLD and letting the rest hang past the
 *     Section's foot satisfies both — and the failure mode of THAT is the box
 *     growing instead of overhanging, because the column is `flex: 1 1 auto`
 *     inside a Section floored at `--fold`, so a taller box is absorbed and its
 *     foot stays on the fold with the whole word above it.
 *   * AND IT IS DRAWN ONCE. A second copy laid over the first is invisible while
 *     the two agree and is two typefaces on top of each other the moment they do
 *     not — which is exactly what a copy that does not morph is, and what it
 *     looked like was dark theme breaking the headline.
 *   * AND SO IS THE PANEL'S MASTHEAD, which is the OTHER way to put the word on
 *     the page twice and the one this Check did not have. The Cut Title is this
 *     Section's head out here as much as it is in the band — the reader scrolls
 *     past a cut PROJECTS and arrives at the index it belongs to — so the
 *     masthead holding the same word a few lines below it is a second title, in
 *     a second face, at a second size. It went `visibility: hidden` in the band
 *     and by another route entirely out here; when that route was deleted the
 *     band's gate stayed, and the duplicate came back at every window below
 *     1100x700 and every window shorter than 700 without one assertion moving.
 *     `turn` asserts this inside the band, in the same words, and the two halves
 *     of one rule are now covered by one Check each.
 *
 *     It has to keep its `display`, and that is not a detail of the mechanism:
 *     the Section's `aria-labelledby` names this element, and a display:none
 *     element supplies no accessible name where a hidden one still does. So
 *     "hidden but not gone" is the assertion, both times.
 *
 * TWO WINDOWS THAT FAIL THE BAND FOR TWO DIFFERENT REASONS, because the band is
 * an `and` of two limits and a regression can be on either side of it. PORTRAIT
 * is the reader's own case — taller than it is wide — and SHORT is a maximised
 * window on a laptop that is wide enough for the band and not tall enough.
 *
 * WHY THE COLOURS ARE RASTERISED: `ground.mjs` carries it. A `color-mix` is
 * serialised as `oklab(…)` or `color(srgb …)` depending on the mix, so comparing
 * computed strings compares spellings; a 1x1 canvas compares colours.
 */

/** Taller than wide — the case this Check was asked for. */
const PORTRAIT = { width: 820, height: 1180 };

/** Wide enough for the band and too short for it: the other way to be outside it. */
const SHORT = { width: 1440, height: 640 };

const WINDOWS = [
  { name: 'portrait', viewport: PORTRAIT },
  { name: 'short', viewport: SHORT },
];

/** Where across the crossing the two grounds are compared. The ends are where a
 *  seam is invisible, so they are in the list to prove the sampling works rather
 *  than to catch anything. */
const AT = [0, 0.25, 0.5, 0.75, 1];

/**
 * How far apart the two grounds may be, per channel, out of 255.
 *
 * Two `color-mix`es of the same two colours at the same weight, taken through
 * different property chains, are the same colour and not merely a close one — so
 * this is rounding and nothing else. The failure it is drawn against is a
 * quarter of the way across the page, which is about 60.
 */
const TOGETHER = 2;

/** The crossing has to take at least this much of a screen, or it is a flip. */
const SPAN_AT_LEAST = 0.5;

/** How near `--turn` has to be to 1 by the time the Panel owns the screen. */
const ARRIVED_WITHIN = 0.02;

/**
 * How much of the cap the fold has to take on the first screen, as a share.
 *
 * A BAND AND NOT THE TOKEN'S OWN VALUE, for the reason NOTES.md gives: how deep
 * the bite is is the author's, and `--front-screen-cut-show` is a Token they may
 * drag. What may not happen is the bite going away — so this is drawn well under
 * the shipped 0.38 and only fails a cut that has stopped cutting.
 *
 * AND ON MOST WINDOWS OUT HERE IT IS SATISFIED BY THE WORD BEING BELOW THE FOLD
 * ENTIRELY, which is worth saying so nobody reads a pass as proof the bite was
 * measured. The Front Screen is as tall as its content and only floored at
 * `--fold`, so it is only where that floor BINDS — the portrait window, where
 * the content is shorter than a screen — that the word's foot lands on the fold
 * and this compares an actual bite. The measured share is printed either way.
 */
const CUT_AT_LEAST = 0.1;

export const check = {
  name: 'crossing',
  title: 'outside the band the page crosses as one, arrives with the Panel, and cuts the word once',

  /** @param {{ browser: import('playwright').Browser, origin: string }} ctx */
  async run({ browser, origin }) {
    /** @type {string[]} */
    const failures = [];
    /** @type {string[]} */
    const notes = [];

    for (const { name, viewport } of WINDOWS) {
      for (const theme of /** @type {const} */ (['light', 'dark'])) {
        const where = `${name} ${viewport.width}x${viewport.height} in ${theme} theme`;
        const { context, page } = await open(browser, origin, { viewport, theme });
        try {
          failures.push(...(await settle(page)).map((why) => `${where}: ${why}`));

          const read = await page.evaluate(
            async ([sampleAt, spanAtLeast]) => {
              const kernel = window.portfolio;
              const timeline = kernel?.timelines.get('turn');
              if (!timeline) return { missing: 'no Timeline is registered as "turn"' };

              const root = document.documentElement;
              const panel = document.querySelector('[data-section="projects-panel"]');
              // By class name, the way `turn` reaches for the same element: the
              // Cut Title publishes no attribute of its own, and inventing one
              // here would be a contract the Section does not know it has.
              const cut = document.querySelector('.front-screen__cut');
              const masthead = panel?.querySelector('.projects-panel__masthead');
              if (!panel) return { missing: 'no [data-section="projects-panel"] on the page' };
              if (!cut) return { missing: 'no .front-screen__cut on the page — the Cut Title did not render' };
              if (!masthead) {
                return {
                  missing:
                    'no .projects-panel__masthead in the Panel — the element this Section is named by is ' +
                    'gone from the markup, so it cannot be the one that is hidden',
                };
              }

              const canvas = document.createElement('canvas');
              canvas.width = canvas.height = 1;
              const ink = canvas.getContext('2d');
              if (!ink) return { missing: 'no 2d context — the grounds cannot be rasterised' };

              // The alpha is read for the reason ground.mjs gives: a colour that
              // was never painted rasterises to #000000 and would satisfy every
              // "the two agree" comparison once the page is dark.
              const sample = (element) => {
                ink.clearRect(0, 0, 1, 1);
                ink.fillStyle = getComputedStyle(element).backgroundColor;
                ink.fillRect(0, 0, 1, 1);
                const [r, g, b, a] = ink.getImageData(0, 0, 1, 1).data;
                return { rgb: [r, g, b], alpha: a };
              };

              const frame = () => new Promise((next) => requestAnimationFrame(next));

              // ---- the two grounds, across the crossing -----------------------
              // Held, or the seek is recomputed from the scroll on the next tick
              // and every reading is of whatever the page was already showing.
              const grounds = [];
              const was = timeline.progress();
              kernel.hold?.();
              try {
                for (const at of sampleAt) {
                  timeline.progress(at);
                  grounds.push({ at, page: sample(root), panel: sample(panel) });
                }
              } finally {
                timeline.progress(was);
                kernel.release?.();
              }

              // ---- where the crossing starts and where it arrives -------------
              // The Panel's own top edge in the document is the scroll that puts
              // it at the top of the window, which is what the span is stated
              // against. Nothing snaps out here — `scroll-snap-type` is declared
              // inside the band and nowhere else — but the handle is asked for
              // anyway, so a band that grows to cover this window fails loudly
              // rather than by reading a document that jumps.
              kernel.snapping?.(false);
              const turn = () => Number(getComputedStyle(root).getPropertyValue('--turn')) || 0;
              const owns = panel.getBoundingClientRect().top + window.scrollY;
              const tall = window.innerHeight;
              const scrollable = document.documentElement.scrollHeight - tall;

              window.scrollTo(0, 0);
              await frame();
              const atTop = turn();

              window.scrollTo(0, Math.min(owns, scrollable));
              await frame();
              const atLanding = turn();

              // Where it FIRST finishes, walked at a tenth of a screen, so a
              // crossing that completes in the first few pixels is caught by its
              // span rather than by its ends — both of which look right.
              //
              // THE FOOT OF THE SCROLL IS ALWAYS SAMPLED, and leaving it out is
              // not a rounding: a crossing spanning the document's whole scroll
              // arrives on the last pixel, so a walk that stops one step short
              // reports a page that never turns at all. That is a Check failing
              // on its own sampling, which is the most expensive kind.
              const step = Math.max(1, Math.round(tall / 10));
              const stops = [];
              for (let y = 0; y < scrollable; y += step) stops.push(y);
              stops.push(scrollable);
              let finished = null;
              for (const y of stops) {
                window.scrollTo(0, y);
                await frame();
                if (turn() >= 1) {
                  finished = y;
                  break;
                }
              }
              window.scrollTo(0, 0);
              await frame();
              kernel.snapping?.(true);

              // ---- the word ---------------------------------------------------
              // Read at the TOP of the document, which the walk above has just
              // put the page back to. How much of the word is on the first
              // screen is the whole of what is asserted about the bite, and it
              // is a viewport measurement: `top` and `bottom` are against the
              // window's own edges here and deliberately not offset by the
              // scroll.
              const link = cut.querySelector('a');
              const drawings = cut.querySelectorAll('svg');
              const box = link?.getBoundingClientRect();
              const onFirstScreen = box ? Math.max(0, Math.min(tall, box.bottom) - Math.max(0, box.top)) : 0;

              // THE CAP SLAB, MEASURED BY ASKING THE PAGE FOR IT rather than
              // recomputed here. It is stated in container units against the Cut
              // Title's own container, so an absolutely-positioned probe inside
              // that container resolves it exactly as the Section does — and
              // this Check learns nothing about the drawing's cap share or the
              // Bake that printed it. Comparing the box against the DRAWING
              // instead is the trap: the drawing is taller than the cap by the
              // J's tail and the overshoot, so a box given the slab's full
              // height is still shorter than the drawing and the cut reads as
              // present while taking nothing off.
              const probe = document.createElement('div');
              probe.style.cssText =
                'position:absolute;left:0;top:0;width:0;visibility:hidden;height:var(--front-screen-cut-slab)';
              cut.append(probe);
              const slab = probe.getBoundingClientRect().height;
              probe.remove();

              return {
                grounds,
                atTop,
                atLanding,
                finished,
                owns,
                tall,
                scrollable,
                spanAtLeast,
                word: {
                  drawings: drawings.length,
                  boxHeight: box?.height ?? 0,
                  onFirstScreen,
                  slab,
                },
                // The Panel's own drawing of the same word. Read as computed
                // style rather than as a rect, because the failure is that it
                // PAINTS: out here its box is taken out of flow as well, so a
                // masthead doing exactly the right thing measures 1px and a
                // regression that measures the same could still be on screen.
                masthead: {
                  visibility: getComputedStyle(masthead).visibility,
                  display: getComputedStyle(masthead).display,
                },
              };
            },
            [AT, SPAN_AT_LEAST],
          );

          if ('missing' in read) {
            failures.push(`${where}: ${read.missing}`);
            continue;
          }

          // ---- one page, one colour ----------------------------------------
          for (const one of read.grounds) {
            if (one.panel.alpha === 0) {
              // A Panel that paints nothing shows the document's ground, which
              // is seamless by construction — but out here it is meant to paint,
              // and silently losing the declaration would make every comparison
              // below pass. Named rather than tolerated.
              failures.push(
                `${where}: the Panel paints no ground of its own at --turn ${one.at} — out of the band it has to, ` +
                  'because it is the ground under the Section rather than a window onto the page above it',
              );
              continue;
            }
            const apart = Math.max(
              ...one.page.rgb.map((channel, index) => Math.abs(channel - one.panel.rgb[index])),
            );
            if (apart > TOGETHER) {
              failures.push(
                `${where}: at --turn ${one.at} the page is ${hex(one.page.rgb)} and the Panel is ` +
                  `${hex(one.panel.rgb)} — ${apart} apart on a channel, wanted <= ${TOGETHER}. ` +
                  'A step at the Section boundary that travels with the scroll: the Panel is mixing ' +
                  'against --ground rather than against the theme\'s --paper, so it crosses twice.',
              );
            }
          }

          const middle = read.grounds.find((one) => one.at === 0.5);
          if (middle) {
            notes.push(
              `${where}: mid-crossing the page is ${hex(middle.page.rgb)} and the Panel ` +
                `${hex(middle.panel.rgb)} (luminance ${luminance(middle.page.rgb).toFixed(3)})`,
            );
          }

          // ---- it arrives with the Section ----------------------------------
          if (read.atTop !== 0) {
            failures.push(
              `${where}: the page is already crossing at the top — --turn is ${read.atTop} before the ` +
                'reader has moved',
            );
          }
          if (Math.abs(1 - read.atLanding) > ARRIVED_WITHIN) {
            failures.push(
              `${where}: with the Panel's top edge at the top of the window (${Math.round(read.owns)}px ` +
                `of scroll) --turn is ${read.atLanding.toFixed(3)}, wanted 1 within ${ARRIVED_WITHIN}. ` +
                'The Turn is spanning something other than the Section above the Panel, so the Panel ' +
                'comes to rest on a page that has not finished turning.',
            );
          }
          if (read.finished === null) {
            failures.push(
              `${where}: --turn never reaches 1 in ${read.scrollable}px of scroll — the crossing does not finish`,
            );
          } else if (read.finished < SPAN_AT_LEAST * read.tall) {
            failures.push(
              `${where}: the crossing is complete after ${read.finished}px, which is ` +
                `${(read.finished / read.tall).toFixed(2)} of a screen — wanted at least ${SPAN_AT_LEAST}. ` +
                'A crossing this short is a flip, and every reading at either end of it still looks right.',
            );
          } else {
            notes.push(
              `${where}: paper at 0, dark by ${read.finished}px, and the Panel owns the screen at ` +
                `${Math.round(read.owns)}px`,
            );
          }

          // ---- the word ------------------------------------------------------
          if (read.word.drawings !== 1) {
            failures.push(
              `${where}: the Cut Title holds ${read.word.drawings} drawings of PROJECTS, wanted 1. ` +
                'A second copy is registered with the first and invisible until the two stop agreeing — ' +
                'and only one of them is the one the morph redraws, so the far end of the Turn is two ' +
                'typefaces on top of each other.',
            );
          }
          if (read.word.slab <= 0) {
            failures.push(
              `${where}: --front-screen-cut-slab measured 0 — the Cut Title's container units did not ` +
                'resolve, so nothing below this was actually compared',
            );
          } else {
            // THE BITE IS THE FOLD'S AND THE WORD IS WHOLE, and both halves have
            // to be asserted or each is satisfiable by breaking the other.
            if (read.word.onFirstScreen > read.word.slab * (1 - CUT_AT_LEAST)) {
              failures.push(
                `${where}: ${read.word.onFirstScreen.toFixed(1)}px of a ${read.word.slab.toFixed(1)}px cap ` +
                  `is on the first screen — ${(read.word.onFirstScreen / read.word.slab).toFixed(3)} of the ` +
                  `word, wanted at most ${(1 - CUT_AT_LEAST).toFixed(2)}. The reader is meeting the whole ` +
                  'of PROJECTS before scrolling, and the first screen has lost its last gesture. The box is ' +
                  'growing into the fold instead of hanging past it: the column is `flex: 1 1 auto` inside a ' +
                  'Section floored at --fold, so a taller box is absorbed and its foot stays on the fold.',
              );
            }
            if (Math.abs(read.word.boxHeight - read.word.slab) > 1) {
              failures.push(
                `${where}: the Cut Title's box is ${read.word.boxHeight.toFixed(1)}px of a ` +
                  `${read.word.slab.toFixed(1)}px cap — the word is cut by a BOX rather than by the fold, so ` +
                  'it is still cut when the reader reaches the Section it is the head of. With the Panel\'s ' +
                  'masthead hidden this drawing is the only title that Section has, and half a title is not ' +
                  'one.',
              );
            }
            notes.push(
              `${where}: the word is whole — a ${read.word.boxHeight.toFixed(1)}px box on a ` +
                `${read.word.slab.toFixed(1)}px cap, with ${read.word.onFirstScreen.toFixed(1)}px of it on ` +
                'the first screen, in one copy',
            );
          }

          // ---- and the Panel does not draw it a second time -------------------
          if (read.masthead.visibility !== 'hidden') {
            failures.push(
              `${where}: the Panel's masthead is \`visibility: ${read.masthead.visibility}\` — the page says ` +
                'PROJECTS twice, in two faces a few lines apart, and the Cut Title the reader just scrolled ' +
                'past stops reading as this Section’s head. It is hidden inside the band by the same rule; a ' +
                'gate on that band is how this came back once already.',
            );
          } else if (read.masthead.display === 'none') {
            failures.push(
              `${where}: the Panel's masthead is \`display: none\` — the word is gone and so is the Section's ` +
                'accessible name, which `aria-labelledby` takes from this element. A directly-referenced ' +
                'hidden element still supplies one; a display:none element supplies nothing.',
            );
          } else {
            notes.push(`${where}: the Panel's masthead is hidden and still named — one PROJECTS on the page`);
          }
        } finally {
          await context.close();
        }
      }
    }

    return { failures, notes };
  },
};
