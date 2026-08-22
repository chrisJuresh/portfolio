import { atMoments, heldThroughAScroll, movedBy, registered } from '../lib/moment.mjs';
import { open, settle } from '../lib/page.mjs';

/**
 * A Timeline can be asked for a moment, and the frame stays put.
 *
 * This is the Check that keeps ADR 0003's seam honest, and it is deliberately
 * generic: it asserts the MECHANISM every later ticket verifies its Section
 * through, not any Section's particular choreography. What a Section's motion
 * should look like is the author's, and no Check here says.
 *
 * Four things, each of which a person would not notice failing:
 *
 *   1. Every Timeline registered belongs to something on the page, and the
 *      Kernel's Turn is one of them. A Section whose mount point was duplicated
 *      loses its Timeline out of the register silently — src/kernel/NOTES.md
 *      records that one — and the symptom turns up much later as a Timeline that
 *      will not seek.
 *   2. A moment survives the page moving under it. `hold()` is what makes a seek
 *      more than one frame long, and the only way to see that it works is to
 *      scroll between two reads: ScrollTrigger recomputes on a SCROLL and not on
 *      a frame, so reading the same moment twice in a row agrees with itself even
 *      with `hold()` stubbed out to do nothing. Finding that out cost this Check
 *      one revision as a check that asserted nothing.
 *   3. A Timeline moves something. A Timeline built, registered and wired to
 *      nothing scrubs perfectly and animates no element on the page, and there is
 *      no other signal that it does not.
 *   4. `release()` hands the scroll back, or a scrub is a one-way door and the
 *      page stays frozen for the reader after it.
 */
export const check = {
  name: 'moments',
  title: 'a Timeline can be asked for a moment, and the frame stays put',

  /** @param {{ browser: import('playwright').Browser, origin: string }} ctx */
  async run({ browser, origin }) {
    const { context, page } = await open(browser, origin);
    try {
      /** @type {string[]} */
      const failures = [...(await settle(page))];
      /** @type {string[]} */
      const notes = [];

      const { timelines, sections } = await registered(page);

      if (!timelines.includes('turn')) {
        failures.push(
          `the Kernel's Turn is not registered — Timelines on the page: ${timelines.length ? timelines.join(', ') : '(none)'}`,
        );
      }
      for (const name of timelines) {
        if (name === 'turn') continue;
        if (!sections.includes(name)) {
          failures.push(
            `a Timeline is registered as "${name}" but no [data-section="${name}"] is on the page — Sections: ${sections.join(', ') || '(none)'}`,
          );
        }
      }
      const doubled = sections.filter((name, index) => sections.indexOf(name) !== index);
      for (const name of new Set(doubled)) {
        failures.push(
          `"${name}" has more than one mount point — the second replaces the first's Timeline in the register, and the symptom is a Timeline that will not seek`,
        );
      }

      for (const name of timelines) {
        // The Turn moves the ground's colour rather than a box, so the elements
        // it is asked about are the whole document; a Section is asked about the
        // elements it marks as moved.
        const selectors =
          name === 'turn'
            ? ['body']
            : await movedBy(page, name).then((found) =>
                found.length > 0 ? found : [`[data-section="${name}"]`],
              );

        const asked = await atMoments(page, name, [0, 1], selectors);
        if ('missing' in asked) {
          failures.push(`${name}: ${asked.missing}`);
          continue;
        }
        const [start, end] = asked.moments;

        for (const selector of selectors) {
          if (start.boxes[selector] === null) {
            failures.push(`${name}: ${selector} is not on the page, so no moment can be read from it`);
          }
        }

        // A moment has to survive the page moving under it, which is the only
        // thing that distinguishes a held Timeline from an unheld one:
        // ScrollTrigger recomputes on a scroll and not on a frame, so two reads
        // in a row agree even with hold() stubbed out. A quarter of the way in,
        // because a moment at either end is one a recompute cannot move away from.
        const held = await heldThroughAScroll(page, name, 0.25, selectors);
        if ('missing' in held) {
          failures.push(`${name}: ${held.missing}`);
        } else {
          if (Math.abs(held.held - held.asked) > 0.001) {
            failures.push(
              `${name}: a moment does not survive a scroll — seeked to ${held.asked}, and the page moving took it to ` +
                `${held.held.toFixed(4)}. hold() is not stopping the scroll from recomputing the Timeline, so every ` +
                'geometry a Check reads after a seek is a coin toss.',
            );
          }
          for (const selector of selectors) {
            const before = held.before[selector];
            const after = held.after[selector];
            if (before === null || after === null) continue;
            if (!same(before, after)) {
              failures.push(
                `${name}: ${selector} moved while the Timeline was held at ${held.asked} — ${box(before)} became ${box(after)} ` +
                  'when the page scrolled. Something outside the Timeline is moving it.',
              );
            }
          }
        }

        if (name === 'turn') continue;

        const moved = selectors.filter((selector) => {
          const from = start.boxes[selector];
          const to = end.boxes[selector];
          return from !== null && to !== null && !same(from, to);
        });
        if (moved.length === 0) {
          failures.push(
            `${name}: nothing moves between progress 0 and 1 — asked about ${selectors.join(', ')}. ` +
              'A Timeline registered and wired to nothing scrubs perfectly and animates no element.',
          );
        } else {
          const selector = moved[0];
          notes.push(
            `${name}: ${selector} is at ${box(start.boxes[selector])} at progress 0 and ${box(end.boxes[selector])} at progress 1`,
          );
        }
      }

      // The other half of the mechanism: `release()` has to hand the scroll back,
      // or the Editor's scrub is a one-way door and the page is frozen after any
      // Check that ran before it.
      const released = await page.evaluate(async () => {
        const root = document.documentElement;
        window.scrollTo(0, document.body.scrollHeight);
        for (let frame = 0; frame < 8; frame += 1) {
          await new Promise((next) => requestAnimationFrame(next));
        }
        const turn = Number(getComputedStyle(root).getPropertyValue('--turn'));
        window.scrollTo(0, 0);
        return turn;
      });
      if (!(released > 0)) {
        failures.push(
          `after release() the scroll no longer drives the Turn — --turn read ${released} at the foot of the document`,
        );
      }

      return { failures, notes };
    } finally {
      await context.close();
    }
  },
};

/**
 * A box is in DOCUMENT coordinates, which is the viewport rect plus the scroll
 * offset — so a read taken at the foot of the document and one taken at the top
 * differ by whatever the browser rounds those two quantities to. Measured, that
 * is hundredths of a pixel: 225.33 became 225.31 on an element nothing had
 * touched, and exact equality read it as "something outside the Timeline is
 * moving it".
 *
 * A tenth of a pixel is well under anything a recomputed Timeline could do — the
 * failure this is guarding against moves an element tens or hundreds of pixels —
 * and well over the rounding. Written as a named tolerance rather than a rounder
 * because the two directions are not the same: it is used both to assert that
 * something HAS moved and that something has NOT, and a coarser rounding would
 * quietly weaken the first.
 */
const STILL = 0.1;

function same(a, b) {
  return (
    Math.abs(a.x - b.x) <= STILL &&
    Math.abs(a.y - b.y) <= STILL &&
    Math.abs(a.width - b.width) <= STILL &&
    Math.abs(a.height - b.height) <= STILL
  );
}

function box(b) {
  return b === null ? '(absent)' : `${b.width}x${b.height} at ${b.x},${b.y}`;
}
