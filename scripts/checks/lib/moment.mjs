/**
 * Asking a Section's Timeline for a moment, and reading what is on screen there.
 *
 * This is ADR 0003's seam and the reason a Section's motion is one named
 * seekable object rather than a per-frame loop: `seek` produces a deterministic
 * frame, so a Check can say "this element is here at this moment" instead of
 * asserting nothing about choreography at all.
 *
 * `hold()` FIRST, AND IT IS NOT OPTIONAL. A scrubbed Timeline is recomputed from
 * the scroll position, so a bare seek survives about one frame and a Check that
 * reads geometry after it is a coin toss — src/kernel/NOTES.md records the wrong
 * diagnosis that cost. Every read below happens inside one hold, the page is put
 * back where it was found, and the hold is released even when a seek throws.
 */

/**
 * A box in DOCUMENT coordinates, not viewport ones.
 *
 * `getBoundingClientRect` is relative to the viewport, so a reading taken after
 * the page has scrolled differs from one taken before it by the scroll distance
 * alone — which makes "did the Timeline move this" and "did the page scroll"
 * indistinguishable. The scroll offset is added back so a box is where the
 * element is on the page, and a Check comparing two moments is comparing motion.
 *
 * @typedef {{ x: number, y: number, width: number, height: number }} Box
 */

/**
 * @typedef {object} Moment
 * @property {number} at   the progress that was asked for
 * @property {{ [selector: string]: Box | null }} boxes  one box per selector, null if it is not on the page
 */

/**
 * The one thing that runs in the page, and the only place the reader and the
 * hold/restore dance are written.
 *
 * Both exports below are this function with different arguments. They were two
 * copies of it once, twenty duplicated lines each, which is a poor place for a
 * copy: a fix to the coordinate handling in one is a silent disagreement between
 * two Checks.
 *
 * @param {import('playwright').Page} page
 * @param {{ timeline: string, selectors: string[], progresses: number[], thenScroll: boolean }} asking
 */
function seekAndRead(page, asking) {
  return page.evaluate(
    async ([name, wanted, progresses, thenScroll]) => {
      const kernel = window.portfolio;
      if (!kernel) return { missing: 'window.portfolio is not there — the Kernel never booted' };
      const tl = kernel.timelines.get(name);
      if (!tl) {
        const have = [...kernel.timelines.keys()];
        return {
          missing: `no Timeline is registered as "${name}" — registered: ${have.length ? have.join(', ') : '(none)'}`,
        };
      }

      const round = (n) => Math.round(n * 100) / 100;
      const read = () => {
        /** @type {Record<string, object | null>} */
        const boxes = {};
        for (const selector of wanted) {
          const element = document.querySelector(selector);
          if (!element) {
            boxes[selector] = null;
            continue;
          }
          const box = element.getBoundingClientRect();
          boxes[selector] = {
            x: round(box.x + window.scrollX),
            y: round(box.y + window.scrollY),
            width: round(box.width),
            height: round(box.height),
          };
        }
        return boxes;
      };

      const was = { progress: tl.progress(), scroll: window.scrollY };
      kernel.hold?.();
      try {
        const moments = progresses.map((progress) => {
          tl.progress(progress);
          return { at: progress, boxes: read() };
        });
        if (!thenScroll) return { moments };

        // The foot of the document: as far from a moment in the middle as the
        // scroll can put it, so anything still listening reports a progress that
        // is unmistakably not the one that was asked for.
        window.scrollTo(0, document.body.scrollHeight);
        for (let frame = 0; frame < 6; frame += 1) {
          await new Promise((next) => requestAnimationFrame(next));
        }
        return { moments, after: read(), held: tl.progress() };
      } finally {
        window.scrollTo(0, was.scroll);
        tl.progress(was.progress);
        kernel.release?.();
      }
    },
    [asking.timeline, asking.selectors, asking.progresses, asking.thenScroll],
  );
}

/**
 * Read the boxes of `selectors` at each progress in `at`, from one held page.
 *
 * @param {import('playwright').Page} page
 * @param {string} timeline  the name the Timeline is registered under
 * @param {number[]} at      progresses, in the order they should be visited
 * @param {string[]} selectors
 * @returns {Promise<{ moments: Moment[] } | { missing: string }>}
 */
export async function atMoments(page, timeline, at, selectors) {
  const read = await seekAndRead(page, {
    timeline,
    selectors,
    progresses: at,
    thenScroll: false,
  });
  return 'missing' in read ? read : { moments: read.moments };
}

/**
 * Seek a Timeline, scroll the page to the foot of the document, and see whether
 * the moment is still the moment.
 *
 * TWO THINGS HERE WERE EACH A CHECK THAT ASSERTED NOTHING, so both are written
 * down rather than left to be rediscovered.
 *
 * The scroll has to actually move. Seeking four times inside one synchronous
 * evaluate always agrees with itself, because ScrollTrigger recomputes a Timeline
 * when the SCROLL moves and not when a frame passes — so reading the same moment
 * twice in a row passes just as happily with `hold()` stubbed out to do nothing.
 *
 * And what is judged is the Timeline's OWN PROGRESS, not the geometry. A
 * staggered tween saturates: with six elements at `stagger: 0.05` the first one
 * finishes its own tween at progress 0.8, so a recompute from 1 to 0.857 moves
 * the Timeline and moves that element not at all. A geometry-only assertion
 * passed a completely stubbed `hold()`. The boxes are still read and returned,
 * because they are what a caller wants to see, but the hold is judged on the
 * number that cannot absorb it.
 *
 * @param {import('playwright').Page} page
 * @param {string} timeline
 * @param {number} at  a moment away from either end, so a recompute has somewhere to go
 * @param {string[]} selectors
 * @returns {Promise<{ asked: number, held: number, before: { [selector: string]: Box | null }, after: { [selector: string]: Box | null } } | { missing: string }>}
 */
export async function heldThroughAScroll(page, timeline, at, selectors) {
  const read = await seekAndRead(page, {
    timeline,
    selectors,
    progresses: [at],
    thenScroll: true,
  });
  if ('missing' in read) return read;
  return { asked: at, held: read.held, before: read.moments[0].boxes, after: read.after };
}

/**
 * Every element under a Section's root that a `[data-*]` attribute marks as moved
 * by that Section's Timeline, as selectors this Section can be asked about.
 *
 * A Section names what its Timeline moves — the stub uses `data-stub-rise` — so
 * this reads the convention off the page rather than holding a list that every
 * new Section has to be added to.
 *
 * ONE SELECTOR PER MARK, not per element, and the boundary is worth stating: the
 * reader takes the first match, so a Section that marks six elements and wires up
 * only the first still satisfies "something moves". That is a composition the
 * author would see; what this catches is a Timeline wired to nothing at all,
 * which they would not.
 *
 * @param {import('playwright').Page} page
 * @param {string} section
 * @returns {Promise<string[]>}
 */
export async function movedBy(page, section) {
  return page.evaluate((name) => {
    const root = document.querySelector(`[data-section="${name}"]`);
    if (!root) return [];
    const marks = new Set();
    for (const element of root.querySelectorAll('*')) {
      for (const attribute of element.getAttributeNames()) {
        if (attribute.startsWith(`data-${name}-`)) marks.add(attribute);
      }
    }
    return [...marks].map((mark) => `[data-section="${name}"] [${mark}]`);
  }, section);
}

/** Every Timeline the Kernel has registered, and every Section mount point on the page. */
export async function registered(page) {
  return page.evaluate(() => ({
    timelines: [...(window.portfolio?.timelines.keys() ?? [])],
    sections: [...document.querySelectorAll('[data-section]')].map(
      (root) => root.dataset.section ?? '(unnamed)',
    ),
  }));
}
