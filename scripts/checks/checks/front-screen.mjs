import { DESK, open, settle } from '../lib/page.mjs';

/**
 * The Front Screen's former invariants, as assertions.
 *
 * Every one of these was a paragraph in `portfolio/styles.css` saying "do not
 * break this", and every one of them fails in a way a person looking at the
 * running page would not notice: a word that is a picture losing the text a
 * screen reader announces, a drawing cut two and a half per cent of a capital
 * too high, the two margins the composition is built on drifting apart by four
 * pixels, a switch whose ARIA stops agreeing with the paper it is on.
 *
 * None of them is aesthetic. The sizes, the gaps and the colours are the
 * author's, exercised through Tokens; what is asserted here is only ever a
 * RELATIONSHIP between two things that have to stay equal, or a fact about the
 * markup. `--front-screen-cut-show` may be set anywhere from 0 to 1 without
 * failing this Check, and so may every other Token.
 *
 * TWO WINDOWS, AND THE SECOND ONE IS NOT PADDING. The composition is fitted to
 * one screen by handing the leftover to the photographs' slot, and that slot has
 * a ceiling — past it the leftover is split between the two margins instead, by
 * a mechanism that is INERT at every ordinary desktop height. Measured only at
 * DESK, this Check passes with that mechanism deleted, which is the shape of
 * assertion `scripts/checks/NOTES.md` warns about three times. So the two
 * relationships that hold across the whole band are asserted at both ends of it.
 */

/** Inside the one-screen band, and below the slot's ceiling: the slot is growing
 *  and the two margins are the Tokens' own. */
const GROWING = DESK;

/** Inside the band and past the ceiling: the slot has stopped growing and the
 *  leftover is what keeps the two margins equal. */
const CAPPED = { width: 1440, height: 1440 };

/** Rects are subpixel and each white is a sum of six boxes. */
const RHYME_TOLERANCE = 1.5;

/** The overshoot lift is between 0.8px and 3.4px across the band, so this has to
 *  be small enough to catch it having been dropped altogether. */
const LIFT_TOLERANCE = 0.5;

/** The picture is drawn from its own viewBox, so the two agree to the
 *  rasteriser's own rounding or the drawing is letterboxed inside its box. */
const RATIO_TOLERANCE = 0.01;

/**
 * The reveal has to be over before anything is measured.
 *
 * It translates the whole Section 8px down for its first 0.9 seconds, and three
 * of the assertions below are in viewport coordinates — a reading taken mid-fade
 * puts the Cut Title 8px LOWER than it belongs, which makes "is it cut by the
 * fold" easier to satisfy rather than harder. `settle()` usually outlasts the
 * animation, and "usually" is how a Check comes to assert less than it says.
 *
 * The Section's own animations only, and bounded: `document.getAnimations()`
 * would wait on anything infinite the Effect Stack is running, and an await that
 * never resolves is a hang rather than a failure.
 */
async function revealed(page) {
  await page.evaluate(async () => {
    const section = document.querySelector('.front-screen');
    if (!section) return;
    const done = Promise.all(section.getAnimations().map((one) => one.finished.catch(() => {})));
    await Promise.race([done, new Promise((give) => setTimeout(give, 2000))]);
  });
}

/** Everything this Check reads off the page, in one round trip. */
async function readPage(page) {
  return page.evaluate(() => {
    const section = document.querySelector('.front-screen');
    if (!section) return { missing: 'no .front-screen is on the page — the Section did not render' };

    const link = section.querySelector('.front-screen__cut > a');
    const word = section.querySelector('.front-screen__cut-word');
    const masthead = section.querySelector('.front-screen__masthead');
    const listings = [...section.querySelectorAll('.front-screen__listing')];
    const last = listings[listings.length - 1];
    const absent = [
      ['the Cut Title link', link],
      ['the Cut Title drawing', word],
      ['the masthead', masthead],
      ['a listing', last],
    ].filter(([, found]) => !found);
    if (absent.length > 0) {
      return {
        missing: `the Front Screen is missing a part this Check reads: ${absent.map(([what]) => what).join(', ')}`,
      };
    }

    // The two measured constants, RESOLVED. A custom property comes back off
    // getComputedStyle as the token sequence it was declared as — `calc(0.294 *
    // 0.78rem)` — so it is spent on a throwaway element's padding instead, which
    // computes to px. Absolutely positioned, so measuring cannot move anything.
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.paddingTop = 'var(--front-screen-half-leading)';
    probe.style.paddingBottom = 'var(--front-screen-contact-tail)';
    section.append(probe);
    const spent = getComputedStyle(probe);
    const halfLeading = parseFloat(spent.paddingTop);
    const tail = parseFloat(spent.paddingBottom);
    probe.remove();

    const rect = (element) => {
      const r = element.getBoundingClientRect();
      return {
        top: r.top,
        bottom: r.bottom,
        left: r.left,
        right: r.right,
        width: r.width,
        height: r.height,
      };
    };
    const viewBox = (word.getAttribute('viewBox') ?? '').trim().split(/\s+/);

    // The type's own z, and the two Effect Stack layers it is lifted over — read
    // off the elements rather than written down here, so the Kernel renumbering
    // its layers is caught rather than silently un-lifting the type.
    const layerZ = (selector) => {
      const layer = document.querySelector(selector);
      return layer ? Number(getComputedStyle(layer).zIndex) : null;
    };

    return {
      typeZ: Number(getComputedStyle(masthead).zIndex),
      paperZ: layerZ('.fx-paper'),
      halftoneZ: layerZ('.fx-halftone'),
      section: rect(section),
      masthead: rect(masthead),
      lastListing: rect(last),
      cut: rect(link),
      word: rect(word),
      halfLeading,
      tail,
      overshoot: Number(getComputedStyle(section).getPropertyValue('--front-screen-cut-overshoot')),
      viewBox: { wide: Number(viewBox[2]), tall: Number(viewBox[3]) },
      drawingHidden: word.getAttribute('aria-hidden') === 'true',
      announced: (link.textContent ?? '').trim(),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      turnAtTop: Number(getComputedStyle(document.documentElement).getPropertyValue('--turn')),
    };
  });
}

/**
 * The two things that hold everywhere inside the one-screen band: the page's
 * vertical rhyme, and the composition standing inside exactly one screen.
 *
 * The rhyme is the assertion that replaces `--cv-static`. That was a measured
 * constant with a comment asking whoever changed the ladder to re-measure it, and
 * being out of date drifted the two margins apart with nothing to say so.
 */
function composed(read) {
  /** @type {string[]} */
  const failures = [];
  const where = `${read.viewport.width}x${read.viewport.height}`;

  // Measured to the INK at both ends, which is what the two constants are for:
  // the name's line box stands half a leading above its own ascenders, and the
  // switch beside the last contact line hangs a tail below its baseline.
  const above = read.masthead.top - read.section.top + read.halfLeading;
  const below = read.cut.top - (read.lastListing.bottom - read.tail);
  if (Math.abs(above - below) > RHYME_TOLERANCE) {
    failures.push(
      `at ${where} the page's vertical rhyme is broken: ${above.toFixed(1)}px of white above the name's ink ` +
        `and ${below.toFixed(1)}px below the last contact line's, which have to be the same measure`,
    );
  }

  if (Math.abs(read.section.height - read.viewport.height) > 1) {
    failures.push(
      `at ${where} the Front Screen is ${read.section.height.toFixed(1)}px tall — inside the one-screen band ` +
        'it is exactly one screen',
    );
  }
  if (read.lastListing.bottom > read.cut.top) {
    failures.push(
      `at ${where} the composition runs into the Cut Title: the contact block ends at ` +
        `${read.lastListing.bottom.toFixed(1)}px and the word's cap top is at ${read.cut.top.toFixed(1)}px. ` +
        'The one-screen budget has overflowed.',
    );
  }
  // Read off the DRAWING and not off the box that shows it, so that
  // --front-screen-cut-show may legitimately be set anywhere from 0 to 1: at 1 the
  // whole cap slab stands above the fold and it is the J's descender that hangs
  // below, and this still holds.
  if (!(read.cut.top <= read.viewport.height + 1 && read.word.bottom > read.viewport.height)) {
    failures.push(
      `at ${where} the Cut Title is not cut by the fold: the slice starts at ${read.cut.top.toFixed(1)}px ` +
        `and the drawing ends at ${read.word.bottom.toFixed(1)}px`,
    );
  }
  if (read.section.left < -1 || read.section.right > read.viewport.width + 1) {
    failures.push(
      `at ${where} the Front Screen runs ${read.section.left.toFixed(1)}px to ` +
        `${read.section.right.toFixed(1)}px — something in it is wider than the page`,
    );
  }

  return {
    failures,
    note: `at ${where}: ${above.toFixed(1)}px of white above the name, ${below.toFixed(1)}px below the contact block`,
  };
}

export const check = {
  name: 'front-screen',
  title: "the Front Screen's invariants: the rhyme, the cut, the switch and the paper",

  /** @param {{ browser: import('playwright').Browser, origin: string }} ctx */
  async run({ browser, origin }) {
    /** @type {string[]} */
    const failures = [];
    /** @type {string[]} */
    const notes = [];

    // The composition, at both ends of the band.
    for (const viewport of [GROWING, CAPPED]) {
      const { context, page } = await open(browser, origin, { viewport });
      try {
        failures.push(...(await settle(page)));
        await revealed(page);
        const read = await readPage(page);
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

    // Everything else, in the one window the rest of the suite uses.
    const { context, page } = await open(browser, origin, { viewport: GROWING });
    try {
      failures.push(...(await settle(page)));
      await revealed(page);
      const read = await readPage(page);
      if ('missing' in read) return { failures: [...failures, read.missing], notes };

      // ---- the word is a picture, so the text has to still be there --------
      // This is what the whole device rests on: the visible word is an outline
      // and cannot be read, selected or indexed, and the only reason that is
      // allowed is the text beside it.
      if (read.announced.length === 0) {
        failures.push(
          'the Cut Title announces nothing — its word is a picture, so the text beside it is the only thing a ' +
            'screen reader reads and a crawler indexes. Losing it makes the link nameless.',
        );
      }
      if (!read.drawingHidden) {
        failures.push(
          "the Cut Title's drawing is not aria-hidden — the word is then announced twice, once as a picture " +
            'with no name and once as the text beside it',
        );
      }

      // ---- the drawing keeps its own proportion ---------------------------
      // The picture is fitted to a measure and its height follows from its
      // viewBox. If the two ever disagree the word letterboxes inside its own
      // box rather than distorting: a smaller word, sitting off the margin it is
      // set to, and nothing that reads as an error.
      const drawn = read.word.width / read.word.height;
      const declared = read.viewBox.wide / read.viewBox.tall;
      if (!(declared > 0)) {
        failures.push(
          `the Cut Title's drawing has no usable viewBox — read "${read.viewBox.wide} ${read.viewBox.tall}"`,
        );
      } else if (Math.abs(drawn - declared) > RATIO_TOLERANCE) {
        failures.push(
          `the Cut Title is drawn at ${drawn.toFixed(4)} and its viewBox says ${declared.toFixed(4)} — the ` +
            'picture is letterboxed inside its own box',
        );
      }

      // ---- the cut is taken from the CAP LINE, not from the ink -----------
      // The round letters overshoot the cap, so the picture's top edge is the
      // O's and not the line the cut is measured from. Drop the lift and every
      // letter is cut a fraction of a capital too high, which is invisible
      // unless the two versions are put side by side.
      const lift = read.cut.top - read.word.top;
      const wanted = read.overshoot * read.word.width;
      if (!(read.overshoot > 0)) {
        failures.push(
          `--front-screen-cut-overshoot read ${read.overshoot} — without it the cut is taken from the ink's ` +
            'top edge rather than from the cap line, and every letter is cut too high',
        );
      } else if (Math.abs(lift - wanted) > LIFT_TOLERANCE) {
        failures.push(
          `the Cut Title's drawing is lifted ${lift.toFixed(2)}px and its overshoot asks for ` +
            `${wanted.toFixed(2)}px — the cut is not being taken from the cap line`,
        );
      }

      // ---- the paper and the halftone stay off the type -------------------
      // Paint order, so the glyphs come out untouched while the paper around
      // them takes the texture. The live page recomputed the number in script;
      // this Section states it, so what keeps the statement honest is reading
      // the two layers' own z-indexes back and comparing. The failure is type
      // printed through by two textures — which reads as the strengths being too
      // high, and is a day spent tuning the wrong numbers.
      for (const [layer, z] of [
        ['the paper', read.paperZ],
        ['the halftone', read.halftoneZ],
      ]) {
        if (z === null) {
          failures.push(`${layer} layer is not on the page — the Effect Stack did not render`);
        } else if (!(read.typeZ > z)) {
          failures.push(
            `the type stands at z-index ${read.typeZ} and ${layer} at ${z} — the layer is painting over the ` +
              'glyphs instead of around them',
          );
        }
      }

      // ---- the page opens on paper ---------------------------------------
      // The Front Screen carries no data-turn, and this is why: it is one screen
      // tall, so `top top` and `bottom bottom` are the same scroll position and
      // the crossing would be complete before the reader had moved. The failure
      // is a page that opens half dark, which reads as a theme bug.
      if (read.turnAtTop !== 0) {
        failures.push(
          `the page is already crossing at the top: --turn is ${read.turnAtTop}. The Turn has to span the ` +
            'Section AFTER this one — a data-turn on a one-screen Section completes at scroll 0.',
        );
      }
      // And it crosses over a STRETCH of scroll rather than at a point. This is
      // the half that catches the mistake: marking a one-screen Section leaves
      // `top top` and `bottom bottom` at the same scroll position, and GSAP does
      // not report that as an error — it reports 0 at the top and 1 one pixel
      // later. The page still opens on paper, so the only symptom is that the
      // crossing is a flip, which is the one thing it may not be.
      const crossing = await page.evaluate(async () => {
        const root = document.documentElement;
        const turn = () => Number(getComputedStyle(root).getPropertyValue('--turn'));
        const travel = document.body.scrollHeight - window.innerHeight;
        /** @type {{ y: number, turn: number }[]} */
        const sampled = [];
        for (let step = 0; step <= 40; step += 1) {
          const y = (travel * step) / 40;
          window.scrollTo(0, y);
          await new Promise((next) => requestAnimationFrame(next));
          sampled.push({ y, turn: turn() });
        }
        window.scrollTo(0, 0);
        const leaves = sampled.find((one) => one.turn > 0.01);
        const arrives = sampled.find((one) => one.turn > 0.99);
        return {
          span: leaves && arrives ? arrives.y - leaves.y : null,
          reached: Math.max(...sampled.map((one) => one.turn)),
          screen: window.innerHeight,
        };
      });
      if (!(crossing.reached > 0.99)) {
        failures.push(
          `--turn never gets past ${crossing.reached.toFixed(3)} anywhere in the document — the crossing does ` +
            'not arrive, so nothing marks where the page turns',
        );
      } else if (crossing.span === null || crossing.span < crossing.screen / 2) {
        failures.push(
          `the crossing spans ${crossing.span === null ? 'no' : `${crossing.span.toFixed(0)}px of`} scroll in a ` +
            `${crossing.screen}px window — a stretch that short is one wheel notch, which makes the Turn a flip ` +
            'rather than a crossing. A one-screen Section marked data-turn does exactly this.',
        );
      }
      notes.push(
        `the Turn: ${read.turnAtTop} at the top, crossing over ${crossing.span === null ? '?' : crossing.span.toFixed(0)}px of scroll`,
      );

      // ---- the switch and the paper agree --------------------------------
      // The pill moving is the half a person sees. `aria-checked` drifting from
      // the theme is the half nobody does, and it is the half that makes the
      // control a lie to anyone who is not looking at it.
      const thrown = await page.evaluate(async () => {
        const at = () => {
          const button = document.querySelector('.front-screen__toggle');
          const thumb = document.querySelector('.front-screen__thumb');
          const words = [
            ...document.querySelectorAll('.front-screen__word-paper, .front-screen__word-dark'),
          ];
          return {
            theme: document.documentElement.dataset.theme,
            checked: button?.getAttribute('aria-checked'),
            thumb: thumb ? thumb.getBoundingClientRect().left : null,
            shown: words
              .filter((one) => getComputedStyle(one).display !== 'none')
              .map((one) => one.textContent),
          };
        };
        const before = at();
        document.querySelector('.front-screen__toggle')?.click();
        // The pill travels on a transition, so it is read once it has arrived
        // rather than while it is on its way.
        await new Promise((done) => setTimeout(done, 600));
        return { before, after: at() };
      });

      const { before, after } = thrown;
      if (before.theme === after.theme) {
        failures.push(`the toggle did not change the paper — data-theme stayed "${before.theme}"`);
      }
      if (before.checked === after.checked) {
        failures.push(
          `the toggle's aria-checked stayed "${before.checked}" across a change of paper — the switch's state ` +
            'is what a reader who cannot see the pill is told',
        );
      }
      for (const state of [before, after]) {
        const wantsChecked = state.theme === 'dark' ? 'true' : 'false';
        if (state.checked !== wantsChecked) {
          failures.push(
            `on the ${state.theme} paper the switch reads aria-checked="${state.checked}" — it has to be ` +
              `"${wantsChecked}"`,
          );
        }
        if (state.shown.length !== 1) {
          failures.push(
            `on the ${state.theme} paper the switch shows ${state.shown.length} words ` +
              `(${state.shown.join(', ') || 'none'}) — exactly one of the two is on screen`,
          );
        }
      }
      if (before.shown[0] === after.shown[0]) {
        failures.push(`the switch's word stayed "${before.shown[0]}" across a change of paper`);
      }
      if (before.thumb !== null && after.thumb !== null && before.thumb === after.thumb) {
        failures.push(`the switch's pill did not move — its thumb stayed at ${before.thumb.toFixed(1)}px`);
      }
      notes.push(
        `the switch: ${before.theme}/${before.checked}/"${before.shown[0]}" became ` +
          `${after.theme}/${after.checked}/"${after.shown[0]}"`,
      );

      return { failures, notes };
    } finally {
      await context.close();
    }
  },
};
