import { DESK, open, settle } from '../lib/page.mjs';

/**
 * The Eater Map Section's Exploded View — the four things about it that break
 * without anybody noticing.
 *
 * None is aesthetic and none is a number somebody chose. Every Token in
 * `src/sections/eater-map/tokens.css` may be set to anything without failing the
 * first two: the Slab may take any share of the stage, the Cards may sit anywhere
 * on it, the camera may stand anywhere and the plane may be tilted to any angle.
 * What is asserted is a RELATIONSHIP that has to hold whatever those are set to,
 * and facts about the markup. The one Token this Check does have an opinion about
 * is named where that opinion is, below.
 *
 * EVERY GEOMETRY IS READ AT A MOMENT OF THE LIFT AND NOT WHEREVER THE PAGE LEFT
 * IT. The Timeline runs from flat to raised, the markup rests at raised, and what
 * a Check finds on an unheld page is whatever the scroll last drove it to —
 * mid-flight as often as not. So the Timeline is held, both ends are read inside
 * one hold, and the page is put back. `hold()` before seeking is not optional
 * here for the usual reason (scripts/checks/NOTES.md) and for one more: this
 * Section's Timeline is driven by a transport tween, and a seek without a hold is
 * scrubbed back out from under the read within a frame.
 *
 * ONE. THE CARDS ARE DRAWN AT THE SLAB'S OWN SCALE, FLAT. The whole trick of this
 * Section is that a photograph and three live surfaces read as one screenshot,
 * and the only thing making that true is that the Cards are scaled by the Slab's
 * drawn width over the phone Eater was captured at. The composition derives that
 * with `tan(atan2(…))`, because CSS cannot otherwise divide one length by
 * another, and it carries a constant to fall back on. So the failure this exists
 * for is the derivation quietly going away: the fallback renders a perfectly
 * plausible screenshot, and it is a plausible screenshot at ONE window and an
 * interface floating over a map of the wrong scale at every other. Asserted at
 * the Lift's flat end, which is the frame the claim is about — raised, the Cards
 * are drawn under a projection and a Card's drawn width is a fact about the
 * camera rather than about the map.
 *
 * TWO WINDOWS FOR EXACTLY THAT REASON, and it is the lesson `front-screen`
 * already paid for. At DESK the constant is within a third of a per cent of the
 * derived answer, so a Check run only there passes with the derivation deleted.
 * At the short end of the band they are a quarter apart.
 *
 * TWO. THE PICTURE IS NOT PART OF THE DOCUMENT'S FURNITURE. The Cards are the
 * Eater app's own markup, so they arrive with a text field, links off to other
 * sites, buttons that do nothing here, and a restaurant's name marked up as the
 * page's top-level heading. Left alone that is thirteen tab stops in the middle
 * of the Portfolio and a restaurant in its outline — every one of them invisible
 * to a reader looking at the page and a surprise to one navigating it by keyboard
 * or by heading. `cards.ts` takes them out, and takes them out IN THE MARKUP
 * rather than in a stylesheet, which is exactly the kind of thing that is quietly
 * undone by a regeneration.
 *
 * THREE. THE LIFT LIFTS SOMETHING. Every Card's box differs between the two ends
 * of the Timeline — and NO PARTICULAR DISTANCE IS ASSERTED, because how far a
 * Card climbs is the author's and lives in a Token. `moments` already asks
 * whether a Timeline moves ANYTHING; this asks whether it moves all three, which
 * is the failure that would otherwise ship as a Card left on the map while the
 * other two came off it. **This is the one assertion here that a Token can fail**:
 * setting the rise, the gap, the dolly and the tilt all to zero is not a taste
 * decision, it is the device switched off, and this Section exists for the device.
 *
 * FOUR. NOTHING IS HIDDEN AND UNCOVERED. A reveal written the obvious way puts
 * `opacity: 0` in the stylesheet and lets the Timeline take it off — and then a
 * reader whose script never arrived gets a hole where the composition should be.
 * The Section's own boxes are checked at BOTH ends, because at the raised end
 * they are what a scriptless reader is looking at.
 *
 * WHAT IS NOT HERE. That the Cards render at all, that the map is the right map,
 * that the tilt is a good tilt, and that any of it looks right: a person opening
 * the page sees all four. And the Slab's bytes — `assets` already asserts that
 * everything the page fetches arrives, and how EARLY a lazy image is fetched is
 * Chromium's own distance policy rather than this page's. NOTES.md in the Section
 * says what was measured.
 */

/** Inside the band, and the window every other Check reads. */
const WIDE = DESK;

/** The short corner of the band. The derived scale here is about 0.56 against
 *  DESK's 0.72, which is what makes a constant impossible to hide at both. */
const SHORT = { width: 1100, height: 700 };

/** The Cards are laid out in whole pixels and the rects are subpixel, so this is
 *  loose enough for rounding and nowhere near loose enough to swallow a fallback
 *  standing in for the derivation. As a share of the scale. */
const SCALE_TOLERANCE = 0.005;

/** What counts as a Card having moved between the two ends of the Lift, in px.
 *  A floor on this Check's own honesty rather than a distance it asserts: without
 *  one, two rects that differ by a rounding read as a Card that climbed. */
const MOVED = 0.5;

/** How far out of the Section the reader is walked, a pixel per frame, before the
 *  turn back is finished with a jump. Wide enough to cross wherever the Lift is
 *  armed — which is just above the resting place, and is the only place the
 *  question "has the reader left" can be answered wrongly. */
const CREEP = 12;

/** Everything the browser will let a reader focus, and the query cards.ts is
 *  written against. `[tabindex]` catches one added by hand later. */
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex], [contenteditable]';

async function atWindow(browser, origin, viewport) {
  const { context, page } = await open(browser, origin, { viewport });
  try {
    const failures = (await settle(page)).map((why) => `${viewport.width}x${viewport.height}: ${why}`);

    const seen = await page.evaluate(async (focusable) => {
      const slab = document.querySelector('.eater-map__slab');
      if (!slab) return { missing: 'no .eater-map__slab on the page' };
      const kernel = window.portfolio;
      const lift = kernel?.timelines.get('eater-map');
      if (!lift) {
        const have = [...(kernel?.timelines.keys() ?? [])];
        return {
          missing:
            'no Timeline is registered as "eater-map", so the Exploded View has no flat end to be' +
            ` read at — registered: ${have.length ? have.join(', ') : '(none)'}`,
        };
      }

      const round = (n) => Math.round(n * 100) / 100;
      const cardBoxes = () =>
        [...document.querySelectorAll('[data-eater-card]')].map((card) => {
          const box = card.getBoundingClientRect();
          return {
            name: card.getAttribute('data-eater-card') ?? '(unnamed)',
            // The rect is the TRANSFORMED box and the computed width is the one
            // the vendored stylesheet froze it to, so their ratio is the scale
            // actually applied — which is the thing being asserted, rather than
            // the property it happens to be written in.
            drawn: round(box.width),
            height: round(box.height),
            x: round(box.x),
            y: round(box.y),
            declared: Number.parseFloat(getComputedStyle(card).width),
          };
        });

      // Only the boxes this Section drew. The Eater app's own markup may hide
      // whatever it likes inside a Card — that is another repository's decision
      // about its own interface, and this is a claim about the Portfolio's.
      const invisible = () =>
        [...document.querySelectorAll('.eater-map__stage [class*="eater-map__"]')]
          .filter((element) => {
            const style = getComputedStyle(element);
            return Number.parseFloat(style.opacity) === 0 || style.visibility === 'hidden';
          })
          .map((element) => element.className);

      const was = { progress: lift.progress(), scroll: window.scrollY };
      kernel.hold?.();
      try {
        lift.progress(0);
        const flat = cardBoxes();
        const flatHidden = invisible();
        lift.progress(1);
        const raised = cardBoxes();
        const raisedHidden = invisible();

        const stage = document.querySelector('.eater-map__stage');
        const reachable = stage
          ? [...stage.querySelectorAll(focusable)].filter((el) => el.tabIndex >= 0).length
          : 0;
        // A heading whose role has been taken off it is text; one that still has
        // it is an entry in the page's outline.
        const announced = stage
          ? [...stage.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter(
              (el) => !['presentation', 'none'].includes(el.getAttribute('role') ?? ''),
            ).length
          : 0;

        return {
          // The phone Eater was captured at, off the element the component writes
          // it on — so this reads the composition's own number rather than a copy.
          app: Number.parseFloat(getComputedStyle(slab).getPropertyValue('--eater-map-app-w')),
          slabWidth: round(slab.getBoundingClientRect().width),
          flat,
          raised,
          flatHidden,
          raisedHidden,
          reachable,
          announced,
        };
      } finally {
        window.scrollTo(0, was.scroll);
        lift.progress(was.progress);
        kernel.release?.();
      }
    }, FOCUSABLE);

    const where = `${viewport.width}x${viewport.height}`;
    if (seen.missing) {
      failures.push(`${where}: ${seen.missing}`);
      return failures;
    }

    if (!(seen.app > 0)) {
      failures.push(`${where}: the Slab does not say what phone it was captured at — --eater-map-app-w is ${seen.app}`);
    }
    if (!(seen.slabWidth > 0)) {
      failures.push(`${where}: the Slab has no width, so nothing about the scale on it could be read`);
    }
    if (seen.flat.length === 0) {
      failures.push(`${where}: no Card on the Slab, so nothing about their scale was checked`);
    }

    const slabScale = seen.slabWidth / seen.app;
    for (const card of seen.flat) {
      const drawnScale = card.drawn / card.declared;
      // EVERY COMPARISON BELOW IS FALSE WHEN EITHER SIDE IS NaN, which is the
      // shape scripts/checks/NOTES.md warns about three times: a Card that is
      // `display: none` computes a width of `auto`, parses to NaN, and would sail
      // through the tolerance while reading as though it had been measured.
      if (!Number.isFinite(drawnScale) || !Number.isFinite(slabScale) || drawnScale <= 0) {
        failures.push(
          `${where}: the ${card.name} Card cannot be measured — ${card.drawn}px drawn over ` +
            `${card.declared}px declared. Nothing about its scale was asserted`,
        );
        continue;
      }
      const off = Math.abs(drawnScale - slabScale) / slabScale;
      if (off > SCALE_TOLERANCE) {
        failures.push(
          `${where}: flat, the ${card.name} Card is drawn at ${drawnScale.toFixed(4)} and the Slab at ` +
            `${slabScale.toFixed(4)} — the Card is not at the map's scale, so this is three ` +
            'stickers on a photograph rather than one screenshot',
        );
      }
    }

    for (const card of seen.flat) {
      const up = seen.raised.find((other) => other.name === card.name);
      if (!up) {
        failures.push(`${where}: the ${card.name} Card is on the flat frame and not on the raised one`);
        continue;
      }
      const apart = Math.max(
        Math.abs(up.x - card.x),
        Math.abs(up.y - card.y),
        Math.abs(up.drawn - card.drawn),
        Math.abs(up.height - card.height),
      );
      if (!(apart > MOVED)) {
        failures.push(
          `${where}: the ${card.name} Card is in the same place at both ends of the Lift — ` +
            `${card.drawn}x${card.height} at ${card.x},${card.y} flat and ${up.drawn}x${up.height} at ` +
            `${up.x},${up.y} raised. The Exploded View is not exploding this one`,
        );
      }
    }

    for (const [end, hidden] of [
      ['flat', seen.flatHidden],
      ['raised', seen.raisedHidden],
    ]) {
      if (hidden.length > 0) {
        failures.push(
          `${where}: ${hidden.length} of the Section's own boxes are invisible at the Lift's ${end} end — ` +
            `${hidden.join(', ')}. Nothing here may be hidden in CSS and uncovered by the Timeline: the ` +
            'raised end is what a reader whose scripts never arrived is looking at',
        );
      }
    }

    if (seen.reachable > 0) {
      failures.push(
        `${where}: ${seen.reachable} focusable element(s) inside the Exploded View — it is a ` +
          'picture of an app, and its controls belong to no page a reader can be sent to',
      );
    }
    if (seen.announced > 0) {
      failures.push(
        `${where}: ${seen.announced} heading(s) inside the Exploded View — a restaurant's name is ` +
          "the app's heading and not this document's, and it is in the outline a reader navigates by",
      );
    }

    return failures;
  } finally {
    await context.close();
  }
}

/**
 * Leaving the Section part way up puts the drawing back down.
 *
 * The Lift runs when the reader comes to rest here and reverses if they leave
 * before it finishes, and **the failure this catches is one that shipped for an
 * afternoon**: `arrived()` compared the scroll against the trigger's start with
 * `>=` where ScrollTrigger's own `isActive` is strict, the leaving toggle is
 * delivered at exactly that position about half the time, and the Lift ran on to
 * the raised end instead of coming back down on half the turns back. A reader who
 * turns away meets a Section that carried on without them, and it is invisible on
 * any still of either end.
 *
 * NO WHEEL AND NO CLOCK IN IT. The page is put on the port and taken off it, which
 * is what the Lift's trigger actually reads — `turn` is where a wheel notch is
 * asserted, and borrowing it here would make this Check fail for the Kernel's
 * reasons. Both waits are `waitForFunction` rather than a sleep, so there is no
 * sampling window to miss: one waits for the Lift to be genuinely part way up, the
 * other for it to arrive back down.
 *
 * NO DISTANCE AND NO DURATION IS ASSERTED. How high, how fast and how far into the
 * Lift the reader gets are the author's; that it comes back down is the device.
 */
async function reversesOnTheWayOut(browser, origin) {
  const { context, page } = await open(browser, origin, { viewport: WIDE });
  try {
    const failures = await settle(page);

    // The Section's own resting place, and the one before it. Read off the Kernel
    // rather than computed here, so a Section that changes where it lands does not
    // need this Check changed with it.
    const ports = await page.evaluate(() => window.portfolio?.ports?.() ?? []);
    if (ports.length < 2) {
      failures.push(
        `the page has ${ports.length} resting place(s) at ${WIDE.width}x${WIDE.height}, so there is no ` +
          'turn to take and nothing about leaving the Section part way up was checked',
      );
      return failures;
    }
    const here = ports[ports.length - 1];
    const before = ports[ports.length - 2];

    const partWay = await page
      .evaluate((to) => {
        window.portfolio?.snapping?.(false);
        window.scrollTo(0, to);
      }, here)
      .then(() =>
        page.waitForFunction(
          () => {
            const at = window.portfolio?.timelines.get('eater-map')?.progress() ?? 0;
            return at > 0.05 && at < 0.95 ? at : false;
          },
          undefined,
          { timeout: 5000 },
        ),
      )
      .then((handle) => handle.jsonValue())
      .catch(() => null);

    if (partWay === null) {
      const at = await page.evaluate(
        () => window.portfolio?.timelines.get('eater-map')?.progress() ?? null,
      );
      failures.push(
        `arriving at the Section left the Lift at ${at} rather than running it — nothing was checked ` +
          'about a reader who turns back part way up',
      );
      return failures;
    }

    const back = await page
      .evaluate(async ([to, creep]) => {
        // OUT A PIXEL AT A TIME BEFORE THE JUMP, and this is the whole strength of
        // this Check rather than a flourish. The Lift is armed a hair ABOVE the
        // resting place — a trigger starting exactly on it would be at progress 0
        // when the reader is standing there and would never fire — so leaving is a
        // question asked at a boundary, and the answer is only wrong AT that
        // boundary. A reader easing out crosses it; a `scrollTo` past it does not,
        // and the version of this Check that only jumped passed the bug it was
        // written for three times in a row.
        for (let step = 1; step <= creep; step += 1) {
          window.scrollTo(0, window.scrollY - 1);
          await new Promise((frame) => requestAnimationFrame(frame));
        }
        window.scrollTo(0, to);
      }, [before, CREEP])
      .then(() =>
        page.waitForFunction(
          () => (window.portfolio?.timelines.get('eater-map')?.progress() ?? 1) < 0.001,
          undefined,
          { timeout: 5000 },
        ),
      )
      .then(() => true)
      .catch(() => false);

    if (!back) {
      const at = await page.evaluate(
        () => window.portfolio?.timelines.get('eater-map')?.progress() ?? null,
      );
      failures.push(
        `the reader left the Section at ${partWay.toFixed(3)} of the Lift and it went on to ${at} instead ` +
          'of reversing — the Section carried on without them',
      );
    }

    await page.evaluate(() => window.portfolio?.snapping?.(true));
    return failures;
  } finally {
    await context.close();
  }
}

export const check = {
  name: 'eater-map',
  title: 'the Cards lie on the Slab at its own scale, come off it and go back, and are only a picture',

  /** @param {{ browser: import('playwright').Browser, origin: string }} ctx */
  async run({ browser, origin }) {
    const found = [];
    for (const viewport of [WIDE, SHORT]) {
      found.push(...(await atWindow(browser, origin, viewport)));
    }
    found.push(...(await reversesOnTheWayOut(browser, origin)));
    return found;
  },
};
