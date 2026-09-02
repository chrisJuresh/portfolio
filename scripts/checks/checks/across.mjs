import { DESK, open, settle } from '../lib/page.mjs';

/**
 * Nothing reaches past the page across.
 *
 * WHY THIS IS PAGE-WIDE AND NOT A SECTION'S. Every other Check here knows which
 * Section it is asking about. This one asks about the DOCUMENT, and that is the
 * whole point of it: what it catches is a full-bleed box that was sized off a
 * viewport unit, and which Section that box happens to live in is exactly the
 * thing nobody can predict. `eater-map` had this assertion for one run while #179
 * was being written, caught the Front Screen's photograph strip with it, and took
 * it out again because a Section's Check answering for another Section's box is a
 * failure nobody can act on. #186 is where it came back, in a file of its own.
 *
 * THE FAILURE IT EXISTS FOR, TWICE. `100vw` is the viewport INCLUDING a classic
 * scrollbar's gutter and the boxes the page is laid out in are the client width,
 * which excludes it — so a box bled to `100vw` is about 15px wider than the page
 * it is on. The Plinth was solved off it and ended 15px past the page's right
 * edge; the photograph strip was bled off it and hung 7.5px past BOTH edges, at
 * every window with a gutter, which is every desktop. `--page-across` is the
 * Kernel's answer to both — ground.css owns it and says why the measure cannot be
 * a viewport unit — and this is what notices the third one.
 *
 * WHY IT IS INVISIBLE, WHICH IS WHAT MAKES IT A CHECK. On a phone the bar is an
 * overlay, so `100vw` and the client width agree and there is nothing to see. On
 * a desktop the page is clipped at the root, so what a reader gets is a strip
 * whose first and last 7.5px are simply not there — a photograph slightly cut
 * rather than a layout visibly broken. It looks like a photograph.
 *
 * WHY `scrollWidth` IS THE ASSERTION AND THE WALK IS ONLY THE DIAGNOSIS.
 * `html` carries `overflow-x: clip`, so a box hanging off the page cannot be
 * dragged into view and there is no honest per-element rule to write: an
 * overhang INSIDE a Section that clips its own is legitimate and deliberate —
 * the Plinth's slab still runs off the edge outside the landing band, and the
 * Section's `overflow-x: clip` is what makes that fine. What is never legitimate
 * is reaching the ROOT's clip, because that is the page itself being asked to
 * hide something. `scrollWidth` against `clientWidth` is that question asked
 * mechanically, and it needs no opinion about which box is allowed to overhang.
 * The walk under it exists so the failure names the element instead of the
 * number: "something is 8px too wide" costs a diagnosis session.
 *
 * WHY THREE WINDOWS. Not padding, and not a size each — a COMPOSITION each. The
 * page is three different drawings: the landing band above 1100x700, the stacked
 * page below it, and the collapse a phone gets. A full-bleed box added to any one
 * of them is a different rule in a different block, and the two below the band
 * are the ones no other Check opens by default.
 *
 * WHAT IT DOES NOT ASSERT. Anything vertical. The document is meant to be taller
 * than the window and the Turn depends on it.
 */

/** Inside the landing band, and the window every other Check reads. */
const WIDE = DESK;

/** Below the band, and a DESKTOP — which is the reader who actually loses the
 *  7.5px, because their scrollbar reserves a gutter. The stacked composition at a
 *  window a browser really has rather than a number chosen to be under 1100. */
const NARROW_DESK = { width: 1000, height: 800 };

/** The collapse, and the window #179 measured Eater at. Headless keeps its
 *  scrollbars (run.mjs undoes `--hide-scrollbars`), so the gutter is here too —
 *  what this window changes is which composition is on screen, not the gutter. */
const PHONE = { width: 390, height: 844 };

const WINDOWS = [WIDE, NARROW_DESK, PHONE];

/** How far past the page across anything may reach, in px. A ROUNDING and not an
 *  allowance: `scrollWidth` is an integer over a subpixel layout, so one pixel is
 *  what that costs. The failure this exists for is the width of a scrollbar —
 *  7px on the side that scrolls — so a tolerance that could hide it would be the
 *  bug's own hiding place, which is the mistake the Plinth's 20px corner
 *  allowance already made once. */
const TOLERANCE = 1;

export const check = {
  name: 'across',
  title: 'nothing reaches past the page across, in any of the three compositions',

  /** @param {{ browser: import('playwright').Browser, origin: string }} ctx */
  async run({ browser, origin }) {
    /** @type {string[]} */
    const failures = [];
    /** @type {string[]} */
    const notes = [];

    for (const viewport of WINDOWS) {
      const where = `${viewport.width}x${viewport.height}`;
      const { context, page } = await open(browser, origin, { viewport });
      try {
        failures.push(...(await settle(page)).map((why) => `${where}: ${why}`));

        // READ WHERE `settle()` LEFT IT, AND ONCE. This is a claim about layout,
        // and layout does not depend on the scroll position — `settle()` has
        // already been through every Section, so everything is mounted and
        // measured. A second read at the foot would be a second chance to catch a
        // snap mid-flight and nothing else.
        const seen = await page.evaluate(
          ({ tolerance }) => {
            const root = document.documentElement;
            const across = root.clientWidth;

            /** Every box that reaches past the page with nothing but the ROOT's
             *  own clip to stop it. An ancestor that clips its own overflow is a
             *  Section taking responsibility for what hangs off it, which is
             *  legitimate and is not this Check's business. */
            const loose = [];
            for (const element of document.body.querySelectorAll('*')) {
              const box = element.getBoundingClientRect();
              if (box.width === 0 && box.height === 0) continue;
              if (box.right <= across + tolerance && box.left >= -tolerance) continue;

              let held = false;
              for (let up = element.parentElement; up && up !== root; up = up.parentElement) {
                if (getComputedStyle(up).overflowX !== 'visible') {
                  held = true;
                  break;
                }
              }
              if (held) continue;
              loose.push(element);
            }

            // The OUTERMOST of a nest, because a box that hangs off the page
            // takes its children with it and naming all of them buries the one
            // with the rule in it. The strip and the track it holds are one
            // failure with one cause.
            const outermost = loose.filter((element) => !loose.includes(element.parentElement));

            return {
              across,
              scrollWidth: root.scrollWidth,
              // The `astro-…` class is a hash of a component's bytes, so it is a
              // different string after every build and says nothing to a reader.
              loose: outermost.slice(0, 6).map((element) => {
                const box = element.getBoundingClientRect();
                const classes = [...element.classList]
                  .filter((one) => !one.startsWith('astro-'))
                  .map((one) => `.${one}`)
                  .join('');
                return {
                  what: `${element.tagName.toLowerCase()}${classes}`,
                  left: Number(box.left.toFixed(1)),
                  right: Number(box.right.toFixed(1)),
                };
              }),
              extra: outermost.length - Math.min(outermost.length, 6),
            };
          },
          { tolerance: TOLERANCE },
        );

        const over = seen.scrollWidth - seen.across;
        notes.push(`${where}: ${seen.across}px across, ${seen.scrollWidth}px of document`);

        if (over > TOLERANCE) {
          const named = seen.loose
            .map((one) => `${one.what} runs from x=${one.left} to x=${one.right}`)
            .join('; ');
          failures.push(
            `${where}: the document is ${seen.scrollWidth}px wide on a ${seen.across}px page — ${over}px ` +
              'past it, which the root clips rather than shows. ' +
              (named
                ? `Reaching past it: ${named}${seen.extra > 0 ? ` (and ${seen.extra} more)` : ''}`
                : 'Nothing in the body reaches past it, so the overflow is the Shell\'s own box') +
              '. A box sized from a viewport unit counts the scrollbar\'s gutter and the page does not — ' +
              '--page-across is the length that does not',
          );
        } else if (seen.loose.length > 0) {
          // Reaching past the page without widening it: the root's clip has
          // swallowed it whole. Same cause, and the number above cannot see it.
          const named = seen.loose
            .map((one) => `${one.what} runs from x=${one.left} to x=${one.right}`)
            .join('; ');
          failures.push(
            `${where}: the document fits the ${seen.across}px page, but ${named} — drawn outside it with ` +
              'nothing but the root\'s own clip to stop it, so that much of it is cut off and unreachable',
          );
        }
      } finally {
        await context.close();
      }
    }

    // Printed on a passing run for the same reason ground prints its luminances:
    // these are the numbers that moved when the Plinth and the strip were wrong,
    // and a run that only ever says "ok" cannot show a gutter creeping back.
    return { failures, notes };
  },
};
