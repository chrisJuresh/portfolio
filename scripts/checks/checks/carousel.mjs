import { atMoments } from '../lib/moment.mjs';
import { DESK, open, settle } from '../lib/page.mjs';

/**
 * The photograph strip: its Timeline, its two ends, its keys and its dissolve.
 *
 * This is the Check ADR 0003 was written for. `moments` already asserts the
 * MECHANISM — that a Timeline can be asked for a moment and the frame stays put —
 * and says nothing about any Section's choreography. This asserts what the Front
 * Screen's Timeline actually MEANS: progress p puts the strip p of the way along
 * its travel, so a seek is a position and not just a number that changed.
 *
 * That is worth having a Check for because the failure is invisible. The strip
 * moved before #137 too — by a friction loop advancing `scrollLeft` once a frame
 * — and it looked exactly the same doing it. What it could not do was answer
 * "where are you at 0.34", and a Timeline that has stopped being the authority on
 * the strip's position would go on scrubbing and go on looking right while every
 * moment a Check or the Editor asked it for was a fiction.
 *
 * NO ASSERTION IN HERE COMPARES AGAINST A NUMBER SOMEBODY CHOSE. Every one is a
 * relationship: the position at a moment against the position the Timeline's own
 * progress predicts, the first photograph against the column's left edge, the
 * strip's height against the floor the Section's own Token states, the dissolve's
 * two ends against its middle. Every Token can be set to anything without failing
 * this — the floor to zero, the dissolve's span to nothing, the settle to an hour.
 *
 * The two WINDOWS are chosen, as every Check's are, and `SHORT` says why it is
 * the one it is.
 */

/**
 * The band's SHORT corner, and it is the one window this Check adds.
 *
 * The one-screen composition hands its leftover to the photographs' slot, so a
 * short screen is where that leftover runs out — and it is the whole reason the
 * Kernel scales the page's type inside the band at all. At 16px of type the slot
 * measures 27px here, which is not a photograph of anything. Nothing else in the
 * suite looks at this end of the band, and `front-screen` measures the tall end,
 * so a `--type-scale` that had been dragged, or a media gate that had drifted out
 * of step with the Front Screen's own, would show up nowhere.
 */
const SHORT = { width: 1440, height: 700 };

/** The moments asked about, away from both ends so a slip in either shows. */
const MOMENTS = [0, 0.25, 0.5, 0.75, 1];

/** Boxes are rounded to 2dp and `scrollLeft` is quantised, so a pixel is exact enough. */
const PLACED = 1;

/** A resting place is a photograph centred on the strip; two pixels is centred. */
const CENTRED = 2;

const FIRST = '[data-section="front-screen"] .front-screen__slide:first-child';
const LAST = '[data-section="front-screen"] .front-screen__slide:last-child';
const COLUMN = '[data-section="front-screen"] .front-screen__col';

/** The strip's own numbers, read in one round trip. */
async function readStrip(page) {
  return page.evaluate(() => {
    const section = document.querySelector('.front-screen');
    const strip = document.querySelector('.front-screen__strip');
    const photos = document.querySelector('.front-screen__photos');
    const slides = [...document.querySelectorAll('.front-screen__slide')];
    if (!section || !strip || !photos || slides.length === 0) {
      return {
        missing:
          'the photograph strip is not on the page: ' +
          [
            ['.front-screen', section],
            ['.front-screen__strip', strip],
            ['.front-screen__photos', photos],
          ]
            .filter(([, found]) => !found)
            .map(([name]) => name)
            .join(', ') +
          (slides.length === 0 ? ' (and no .front-screen__slide)' : ''),
      };
    }

    // A Token that is a length, resolved: `getPropertyValue` gives back `15rem`.
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    const resolve = (length) => {
      probe.style.height = length;
      section.append(probe);
      const height = probe.getBoundingClientRect().height;
      probe.remove();
      return height;
    };
    const floor = resolve('var(--front-screen-strip-min)');
    // What the Section gives up to the landing: the slice of the word standing
    // below the fold, and the drop the Panel's masthead needs to begin above it.
    const landing = resolve(
      'calc(var(--front-screen-cut-clip) + var(--landing-mast-top))',
    );

    const box = (element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
    };

    return {
      slides: slides.length,
      travel: photos.scrollWidth - photos.clientWidth,
      floor,
      landing,
      section: box(section),
      strip: box(strip),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      photographs: slides.map((slide) => {
        const image = slide.querySelector('img');
        return {
          alt: image?.getAttribute('alt') ?? null,
          src: image?.getAttribute('src') ?? null,
        };
      }),
    };
  });
}

/**
 * The composition, with photographs in it.
 *
 * Two assertions and they are the pair that pins the page's type scale: the
 * Section still stands inside one screen, and the slot is at least as tall as the
 * Section's own floor Token says a photograph may be. Neither is a number chosen
 * here — the first is the band's definition and the second is the Token's.
 *
 * ONE SCREEN LESS WHAT THE LANDING TAKES. Inside the band the Section gives up
 * the slice of the Cut Title that hangs below the fold and the drop the Panel's
 * masthead needs above it, so that the word can stand in that masthead's slot —
 * src/kernel/landing.css. Both terms are read off the page rather than restated,
 * so the assertion is that the composition spends exactly the budget and not that
 * the budget is any particular number.
 */
function composed(read) {
  /** @type {string[]} */
  const failures = [];
  const where = `${read.viewport.width}x${read.viewport.height}`;

  if (Math.abs(read.section.height + read.landing - read.viewport.height) > 1) {
    failures.push(
      `at ${where} the Front Screen is ${read.section.height.toFixed(1)}px tall and gives ` +
        `${read.landing.toFixed(1)}px to the landing, against a ${read.viewport.height}px screen — the ` +
        'photographs have pushed the composition off one screen',
    );
  }
  if (read.strip.height + 0.5 < read.floor) {
    failures.push(
      `at ${where} the photographs' slot is ${read.strip.height.toFixed(1)}px and ` +
        `--front-screen-strip-min asks for ${read.floor.toFixed(1)}px. The slot is the one-screen budget's ` +
        "remainder, so what buys it that height is the Kernel's type size — either --type-zoom has been " +
        'dragged up, or --type-scale has been dragged, or its media gate and the Front ' +
        "Screen's band have drifted out of step.",
    );
  }
  return {
    failures,
    note: `at ${where}: a ${read.strip.width.toFixed(0)}px strip ${read.strip.height.toFixed(0)}px tall, floor ${read.floor.toFixed(0)}px`,
  };
}

export const check = {
  name: 'carousel',
  title: "the photograph strip's Timeline is where the strip is",

  /** @param {{ browser: import('playwright').Browser, origin: string }} ctx */
  async run({ browser, origin }) {
    /** @type {string[]} */
    const failures = [];
    /** @type {string[]} */
    const notes = [];

    // ---- the composition, at both ends of the band ------------------------
    for (const viewport of [DESK, SHORT]) {
      const { context, page } = await open(browser, origin, { viewport });
      try {
        failures.push(...(await settle(page)));
        const read = await readStrip(page);
        if ('missing' in read) {
          failures.push(read.missing);
          continue;
        }
        const { failures: broken, note } = composed(read);
        failures.push(...broken);
        notes.push(note);
      } finally {
        await context.close();
      }
    }

    const { context, page } = await open(browser, origin, { viewport: DESK });
    try {
      failures.push(...(await settle(page)));
      const read = await readStrip(page);
      if ('missing' in read) return { failures: [...failures, read.missing], notes };

      if (read.slides < 2) {
        return {
          failures: [
            ...failures,
            `${read.slides} photograph(s) on the page — the strip's two ends are two different pictures, and ` +
              'with one there is no travel for a Timeline to be the length of',
          ],
          notes,
        };
      }
      if (!(read.travel > 0)) {
        return {
          failures: [
            ...failures,
            `the strip has ${read.travel}px of travel — every moment of the Timeline is then the same frame, ` +
              'and every assertion below would pass without asserting anything',
          ],
          notes,
        };
      }

      // ---- a moment IS a position ----------------------------------------
      // The whole of what #137 asks for. Held, seeked, and the geometry compared
      // against what the Timeline's own progress predicts: the first photograph
      // starts at the column's left edge and is carried left by exactly its
      // share of the travel. A Timeline that had stopped driving the strip — or
      // that drove it through some other curve — comes apart here.
      const asked = await atMoments(page, 'front-screen', MOMENTS, [FIRST, LAST, COLUMN]);
      if ('missing' in asked) {
        failures.push(`the strip's Timeline: ${asked.missing}`);
      } else {
        const start = asked.moments[0];
        const from = start?.boxes[FIRST];
        const column = start?.boxes[COLUMN];
        if (!from || !column) {
          failures.push(
            'the first photograph or the text column is not on the page, so no moment can be read from it',
          );
        } else {
          for (const moment of asked.moments) {
            const seen = moment.boxes[FIRST];
            if (!seen) continue;
            const wanted = from.x - moment.at * read.travel;
            if (Math.abs(seen.x - wanted) > PLACED) {
              failures.push(
                `at moment ${moment.at} the first photograph is at ${seen.x.toFixed(2)}px and the Timeline's own ` +
                  `progress puts it at ${wanted.toFixed(2)}px, ${read.travel.toFixed(0)}px of travel in. The ` +
                  'Timeline is no longer where the strip is, so every moment it is asked for is a fiction.',
              );
            }
          }

          // ---- and the two ends meet the text column --------------------
          // The first photograph rests on the column's left edge and the last on
          // its right, and NEITHER is stated anywhere: the first rests at 0 and
          // every other photograph rests centred, clamped to the travel — so the
          // last one's centre lies past the end and the clamp stands it on the
          // edge. That is one mechanism producing both ends, which is why losing
          // it is easy and invisible.
          const end = asked.moments[asked.moments.length - 1];
          const last = end?.boxes[LAST];
          if (Math.abs(from.x - column.x) > PLACED) {
            failures.push(
              `at rest the first photograph's left edge is at ${from.x.toFixed(2)}px and the text column's is at ` +
                `${column.x.toFixed(2)}px — the strip's near end has come off the column`,
            );
          }
          if (last) {
            const columnRight = column.x + column.width;
            const lastRight = last.x + last.width;
            if (Math.abs(lastRight - columnRight) > PLACED) {
              failures.push(
                `at the far end the last photograph's right edge is at ${lastRight.toFixed(2)}px and the text ` +
                  `column's is at ${columnRight.toFixed(2)}px — the strip's far end has come off the column`,
              );
            }
          }
          notes.push(
            `the strip travels ${read.travel.toFixed(0)}px over ${read.slides} photographs, ` +
              `from ${from.x.toFixed(0)}px to ${(from.x - read.travel).toFixed(0)}px`,
          );
        }
      }

      // ---- the dissolve is a function of where the strip is ---------------
      // Not of when it moved, which is what lets it run backwards as smoothly as
      // forwards. Asserted as a shape and not as a number: shut at both rests,
      // open somewhere in between. A dissolve wired to a scroll event rather than
      // to the Timeline reads 0 at every moment a seek asks about, and nothing
      // else would say so.
      const dissolve = await page.evaluate(async (at) => {
        const kernel = window.portfolio;
        const timeline = kernel?.timelines.get('front-screen');
        const section = document.querySelector('.front-screen');
        if (!timeline || !section) return null;
        const was = timeline.progress();
        kernel?.hold?.();
        try {
          return at.map((moment) => {
            timeline.progress(moment);
            return Number(
              getComputedStyle(section).getPropertyValue('--front-screen-fade-open'),
            );
          });
        } finally {
          timeline.progress(was);
          kernel?.release?.();
        }
      }, MOMENTS);
      if (dissolve === null) {
        failures.push("the dissolve could not be read — the Section or its Timeline is not there");
      } else {
        const [shut, ...rest] = dissolve;
        const closed = rest[rest.length - 1];
        const middle = Math.max(...dissolve.slice(1, -1));
        if (shut !== 0 || closed !== 0) {
          failures.push(
            `the dissolve is ${shut} at the strip's near rest and ${closed} at its far one — it has to be shut at ` +
              'both, so the photograph standing against the column stands against nothing',
          );
        }
        if (!(middle > 0)) {
          failures.push(
            `the dissolve never opens: --front-screen-fade-open reads ${dissolve.join(', ')} across ` +
              `${MOMENTS.join(', ')}. It is a function of where the strip is, so a seek has to open it.`,
          );
        }
        notes.push(`the dissolve across ${MOMENTS.join(', ')}: ${dissolve.join(', ')}`);
      }

      // ---- the keyboard, and the ring that says where the focus went ------
      const keys = await page.evaluate(async (centre) => {
        const photos = document.querySelector('.front-screen__photos');
        const timeline = window.portfolio?.timelines.get('front-screen');
        if (!photos || !timeline) return null;
        const strip = document.querySelector('.front-screen__strip');
        const press = async (key) => {
          photos.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
          await new Promise((done) => setTimeout(done, 800));
          return timeline.progress();
        };
        // Is any photograph standing on the strip's own middle? Read after the
        // FORWARD press and not after both, because coming back lands on the near
        // end — where the first photograph is aligned with the column rather than
        // centred, which is the composition and not a miss.
        const centred = () =>
          [...document.querySelectorAll('.front-screen__slide')].some((slide) => {
            if (!strip) return false;
            const box = slide.getBoundingClientRect();
            const outer = strip.getBoundingClientRect();
            return Math.abs(box.left + box.width / 2 - (outer.left + outer.width / 2)) < centre;
          });
        const at = timeline.progress();
        const forward = await press('ArrowRight');
        const landed = centred();
        return {
          focusable: photos.tabIndex,
          named: photos.getAttribute('aria-label') ?? '',
          role: photos.getAttribute('role') ?? '',
          at,
          forward,
          centred: landed,
          back: await press('ArrowLeft'),
        };
      }, CENTRED);
      if (keys === null) {
        failures.push('the strip or its Timeline is not there, so the keyboard cannot be tried');
      } else {
        if (keys.focusable < 0) {
          failures.push(
            `the strip's photographs have tabIndex ${keys.focusable} — nothing reaches them by keyboard`,
          );
        }
        if (keys.named.trim().length === 0 || keys.role.length === 0) {
          failures.push(
            `the strip is announced as role "${keys.role}" named "${keys.named}" — a reader who cannot see it ` +
              'has no way to know what they have landed on',
          );
        }
        if (!(keys.forward > keys.at)) {
          failures.push(
            `an arrow key does not move the strip: it was at ${keys.at} and ArrowRight left it at ${keys.forward}`,
          );
        }
        if (Math.abs(keys.back - keys.at) > 0.001) {
          failures.push(
            `an arrow key is not reversible: from ${keys.at}, right then left came back to ${keys.back}. One press ` +
              'is one photograph, so the two have to be the same step in opposite directions.',
          );
        }
        if (!keys.centred) {
          failures.push(
            'after an arrow press no photograph is centred on the strip — a press lands on a resting place ' +
              'rather than near one, and this is the only thing that says so',
          );
        }
      }

      // The ring is read with a real keyboard, because `:focus-visible` is about
      // how the focus ARRIVED and a scripted `focus()` does not match it.
      const ring = await (async () => {
        for (let press = 0; press < 12; press += 1) {
          await page.keyboard.press('Tab');
          const found = await page.evaluate(() => {
            const active = document.activeElement;
            if (!active?.classList.contains('front-screen__photos')) return null;
            const style = getComputedStyle(active);
            return {
              visible: active.matches(':focus-visible'),
              style: style.outlineStyle,
              width: Number.parseFloat(style.outlineWidth),
            };
          });
          if (found) return found;
        }
        return null;
      })();
      if (ring === null) {
        failures.push(
          'twelve tabs from the top of the document never reach the photographs — they are not in the ' +
            "document's own focus order",
        );
      } else if (!ring.visible || ring.style === 'none' || !(ring.width > 0)) {
        failures.push(
          `the photographs take focus and draw no ring: :focus-visible ${ring.visible ? 'matches' : 'does not match'}` +
            `, outline is ${ring.style} at ${ring.width}px. The arrow keys then move a strip nobody can see they ` +
            'have hold of.',
        );
      }

      // ---- the alt text is the only description of a photograph -----------
      // Nothing on the page captions one, so an empty alt is a picture nobody can
      // see described anywhere, and a filename in an alt is worse than nothing:
      // it reads as a description to a crawler and as noise to a reader.
      const nameless = read.photographs.filter((one) => (one.alt ?? '').trim().length === 0);
      if (nameless.length > 0) {
        failures.push(
          `${nameless.length} of ${read.photographs.length} photographs have no alt text — the first is ` +
            `${nameless[0]?.src ?? '(no src)'}`,
        );
      }
      const filenamed = read.photographs.filter((one) => {
        const stem = (one.src ?? '').split('/').pop()?.replace(/\.[a-z]+$/i, '') ?? '';
        return stem.length > 0 && (one.alt ?? '').includes(stem);
      });
      if (filenamed.length > 0) {
        failures.push(
          `${filenamed.length} photographs are described by their own filename — the first is ` +
            `${filenamed[0]?.src ?? '(no src)'} with alt "${filenamed[0]?.alt ?? ''}"`,
        );
      }
      notes.push(`${read.photographs.length} photographs, each with its own alt text`);

      // ---- a reader who asked for less motion -----------------------------
      // Gets every leg's destination and none of the travelling: the strip is
      // operable by exactly the same gestures, it just arrives. Asserted as
      // "it does not move between two reads", which is the observable form of
      // "it was already there" and does not depend on a duration.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const still = await page.evaluate(async () => {
        const photos = document.querySelector('.front-screen__photos');
        const strip = document.querySelector('.front-screen__strip');
        const timeline = window.portfolio?.timelines.get('front-screen');
        if (!photos || !strip || !timeline) return null;
        const before = timeline.progress();
        photos.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
        );
        const arrived = timeline.progress();
        await new Promise((done) => setTimeout(done, 500));
        return {
          before,
          arrived,
          after: timeline.progress(),
          ramp: getComputedStyle(strip).transitionDuration,
        };
      });
      if (still === null) {
        failures.push('the strip is not there under a reduced-motion preference');
      } else {
        if (!(still.arrived > still.before)) {
          failures.push(
            `under prefers-reduced-motion an arrow key leaves the strip where it was: ${still.before} became ` +
              `${still.arrived}. The preference asks for less movement, not for a strip that cannot be operated.`,
          );
        } else if (Math.abs(still.after - still.arrived) > 0.001) {
          failures.push(
            `under prefers-reduced-motion the strip is still travelling after the key: it read ${still.arrived} ` +
              `at the press and ${still.after} half a second later. The destination has to be reached at once.`,
          );
        }
        if (/[1-9]/.test(still.ramp)) {
          failures.push(
            `under prefers-reduced-motion the dissolve still ramps over ${still.ramp} — the only part of it that ` +
              'moves is the one the preference is about',
          );
        }
        notes.push(
          `reduced motion: ${still.before} → ${still.arrived} at the press, dissolve ramp ${still.ramp}`,
        );
      }

      return { failures, notes };
    } finally {
      await context.close();
    }
  },
};
