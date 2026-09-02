import { DESK, open, settle } from '../lib/page.mjs';

/**
 * The Eater Map Section's Exploded View — the eight things about it that break
 * without anybody noticing.
 *
 * None is aesthetic. Every Token in `src/sections/eater-map/tokens.css` may be set
 * to anything without failing most of what is here: the Slab may take any share of
 * the stage, the Cards may sit anywhere on it, and the plane may be tilted to any
 * attitude. What is asserted is a RELATIONSHIP that has to hold whatever those are
 * set to, and facts about the markup. **FOUR TOKENS THIS CHECK HAS AN OPINION
 * ABOUT**, each named where its opinion is: the rise, and the three depths.
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
 * ONE. THE CARDS ARE DRAWN AT THE SLAB'S OWN SCALE. The whole trick of this
 * Section is that a photograph and three live surfaces read as one screenshot,
 * and the only thing making that true is that the Cards are scaled by the Slab's
 * drawn width over the phone Eater was captured at. The composition derives that
 * with `tan(atan2(…))`, because CSS cannot otherwise divide one length by
 * another, and it carries a constant to fall back on. So the failure this exists
 * for is the derivation quietly going away: the fallback renders a perfectly
 * plausible screenshot, and it is a plausible screenshot at ONE window and an
 * interface floating over a map of the wrong scale at every other.
 *
 * READ WITH THE PROJECTION LIFTED, AND THAT IS #189's DOING. A Card's rect is the
 * axis-aligned bounding box of a quad projected under the plane's rotation, which
 * is not the Card's drawn width — the two agreed while the Lift's flat end was an
 * untilted screenshot, and the Slab stands at its attitude at every moment now. So
 * the plane's transform comes off for the length of one read and goes straight back
 * on. The alternative is reading `--eater-map-app-scale` off the element, which
 * would be asking the composition to confirm its own arithmetic.
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
 * other two came off it.
 *
 * SEVEN. THE SLAB DOES NOT MOVE, AND IT STANDS IN A PARALLEL PROJECTION (#189).
 * The two halves of the Section's headline invariant, and the author's own first
 * concern: turning onto the Section must not resize the thing being looked at. The
 * plane's projected box is read at both ends of the Lift and has to be the same
 * box, which fails the moment either angle goes back inside a `calc()` with the
 * playhead in it. And two identical PROBES — boxes this Check puts on the plane at
 * the Slab's head and foot and takes back off — have to project to the same size,
 * which is the only way to ask whether a projection converges: the head leans away
 * from the reader and the foot leans towards them, so a `perspective()` at any
 * distance anybody would compose with draws one bigger than the other. Restoring
 * the camera the Section shipped with before #189 fails it by 12%.
 *
 * EIGHT. THE THREE CARDS RISE TOGETHER, AND STILL IN THE APP'S ORDER. Each Card's
 * screen-space rise is measured against the same Card with its rise taken away, and
 * the three have to agree within a stated tolerance — which is the difference
 * between one object taken apart and three objects hanging at three heights, and is
 * the one place this Check has an opinion about a Token's VALUE rather than about a
 * relationship. Two mutations fall out of it and both are meant to: spreading the
 * depths back out to 1 / 0.62 / 0.26 fails the tolerance, and setting all three
 * equal fails the ordering underneath it. **And a floor under each rise is what
 * makes a dead drawing fail**: a depth under a parallel projection reaches the
 * screen only through the attitude, so a plane at zero attitude has three Cards
 * that climb and never move — which SEVEN's two assertions both pass.
 *
 * FOUR. NOTHING IS HIDDEN AND UNCOVERED. A reveal written the obvious way puts
 * `opacity: 0` in the stylesheet and lets the Timeline take it off — and then a
 * reader whose script never arrived gets a hole where the composition should be.
 * The Section's own boxes are checked at BOTH ends, because at the raised end
 * they are what a scriptless reader is looking at.
 *
 * FIVE. EVERY RULE IS STILL ATTACHED TO THE PART IT NAMES. The four leader lines
 * are the correspondence between the numbered points and the pieces of the
 * drawing, and each one's far end is a Card's own corner while that Card is
 * turned in three dimensions. So the failure is a rule computed from where the
 * Card's UNTRANSFORMED box is, or computed once and never again: both look right
 * at the flat end of the Lift, which is the one frame a still is most likely to
 * be taken at, and are wrong at every other. Read at THREE moments for that
 * reason — flat, half way, raised — against the anchor's own projected position,
 * which is a fact this Check reads off the page rather than one the drawing
 * hands it. An anchor that is not inside the camera passes all of that, and is
 * caught by the anchors themselves having to move between the Lift's two ends.
 *
 * AND THE CORRESPONDENCE IS COUNTED. No part without a number and no number
 * without a part: one rule per numbered point, and the parts they name are
 * exactly the parts that carry an anchor. The Content's own schema fails the
 * build on the first half of that; this is the half a schema cannot see, because
 * a part is a thing on the page rather than a string in a file.
 *
 * NO POSITION AND NO ANGLE IS ASSERTED. Which corner a rule ends on is a Token
 * and how far its shoulder runs is another; what is asserted is that the end of
 * the rule is where the anchor is and that the anchor is somewhere on the part.
 *
 * AND WHETHER AN ANCHOR IS INSIDE THE CAMERA IS ASKED OF THE MARKUP NOW. It was
 * geometry — an anchor outside the projection stands still while its part turns, so
 * both ends of the Lift found it in one place — and the SLAB's anchor stands still
 * legitimately since #189, because the Slab does. Containment is what that
 * assertion was asking all along; the movement half is kept for the three Cards,
 * which are what the Lift carries.
 *
 * SIX. BELOW THE BAND THE DRAWING HAS COLLAPSED, AND EVERY READER GETS THE SAME
 * ONE. An Exploded View is fitted to a wide window; a column has no width to
 * spend on a camera. So down there the Slab lies flat and full-bleed with the four
 * features as a list under it, and the Lift never runs (#179). Four of the five
 * things asserted about it fail invisibly — a perspective left standing on a
 * column is a drawing skewed by a degree or two, a Slab that stops short of the
 * window's edge is a composition rather than a fault, a Card at the wrong scale
 * is a plausible screenshot of another phone, and a Lift still running is a phone
 * quietly tilting itself under a column. THE LAST IS THE ONE #179 IS ABOUT: the narrow reader, the reader
 * who asked for no motion and the reader whose scripts never arrived are handed
 * the same composition, and that is asserted as an EQUALITY between the three
 * rather than as three separate descriptions — which is what stops a fourth
 * arrangement growing under one of them.
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

/** Below the band, and a phone rather than a number chosen to be under it: the
 *  collapse exists for a reader holding one, and 390 is the window Eater itself
 *  was captured at. Nothing about the number is asserted — every assertion down
 *  there is a relationship or a fact about the markup. */
const NARROW = { width: 390, height: 844 };

/** How far the full-bleed Slab may miss the window's edges by, in px. Tight,
 *  because the two ways of getting this wrong — `100vw` where a scrollbar has a
 *  gutter, and a margin that does not spend the whole of the page's — both miss
 *  by the width of something rather than by a rounding. */
const BLEED_TOLERANCE = 0.5;

/** How far the three readers' compositions may differ, in px. They are the same
 *  stylesheet answering the same window, so this is subpixel rounding and not an
 *  allowance for a difference. */
const SAME_TOLERANCE = 1;

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

/** How far a leader line's end may sit from the corner it is drawn to, in px.
 *  The two are read one after the other out of one layout, so this is rounding
 *  and nothing else — measured at a hundredth of a pixel — and it is nowhere near
 *  loose enough to swallow a rule drawn to an untransformed box, which is tens of
 *  pixels out at the first degree of tilt. */
const ATTACHED = 1;

/** How far outside its part's own box an anchor may sit, in px. A point inside
 *  the unit square of a rotated Card is inside that Card's bounding box by
 *  convexity, whatever the two placement Tokens are set to — so this is rounding
 *  again, and the failure it names is an anchor that is not on the part at all. */
const ON_THE_PART = 1;

/** The moment between the two ends, where a rule drawn once and never again is
 *  wrong and a still of either end would not say so. */
const HALF_WAY = 0.5;

/** How far the Slab's projected box may move between the two ends of the Lift, in
 *  px. Rounding and nothing else: it is one element under one constant transform
 *  read twice out of the same layout, so the two answers are the same number or
 *  the attitude is a term of the playhead again (#189). */
const STILL = 0.5;

/** The two probes' size, in px, and how far their projected boxes may differ as a
 *  share of the larger.
 *
 *  A PROBE IS A BOX THIS CHECK PUTS ON THE PLANE AND TAKES BACK OFF, which is the
 *  only way to ask whether a projection converges: two identical boxes at opposite
 *  ends of the Slab project to the same size under a parallel projection and to
 *  different sizes under any camera standing at a finite distance. Measured with
 *  the composition's own camera restored, the two differed by 12% at DESK — so
 *  this tolerance is antialiasing on two rects and nowhere near loose enough to
 *  swallow a `perspective()` anybody would compose with. */
const PROBE = 40;
const PARALLEL = 0.01;

/** How far the three Cards' screen-space rises may differ, as a share of the
 *  largest, and the floor under each one in px.
 *
 *  THE FIRST IS THE ONE OPINION THIS CHECK HAS ABOUT THREE TOKENS, and it is
 *  #189's own: the three Cards RISE TOGETHER, so the drawing reads as one object
 *  taken apart rather than as three objects hanging at three heights. The depths
 *  that shipped before it were 1 / 0.62 / 0.26, which is 74% apart; 1 / 0.94 /
 *  0.88 is 12%. The author may move all three and may reorder nothing.
 *
 *  THE SECOND IS WHAT MAKES A DEAD DRAWING FAIL. A rise is a translation along the
 *  plane's own normal, and under a parallel projection a normal pointing at the
 *  reader projects to nothing at all — so a plane at zero attitude has three Cards
 *  that climb and never move, which is the Exploded View switched off while every
 *  other assertion here passes. */
const TOGETHER = 0.2;
const RISEN = 1;

async function atWindow(browser, origin, viewport) {
  const { context, page } = await open(browser, origin, { viewport });
  try {
    const failures = (await settle(page)).map((why) => `${viewport.width}x${viewport.height}: ${why}`);

    const seen = await page.evaluate(async ({ focusable, onThePart, halfWay, probe }) => {
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

      // WHICH ELEMENT EACH POINT NAMES. Three of the four are Cards and the
      // fourth is the picture itself, and knowing that here is the point: it is
      // the claim being checked rather than something the drawing hands over.
      const partNamed = (part) =>
        part === 'slab'
          ? document.querySelector('.eater-map__plane')
          : document.querySelector(`[data-eater-map-card="${part}"]`);

      const overlay = document.querySelector('[data-eater-map-leaders]');
      const rules = () => {
        if (!overlay) return [];
        const frame = overlay.getBoundingClientRect();
        return [...overlay.querySelectorAll('[data-eater-map-leader]')].map((line) => {
          const part = line.getAttribute('data-eater-map-leader') ?? '(unnamed)';
          const anchor = document.querySelector(`[data-eater-map-anchor="${part}"]`);
          const hook = document.querySelector(`[data-eater-map-hook="${part}"]`);
          const on = partNamed(part);
          // The drawn geometry, exactly as the overlay carries it.
          const drawn = (line.getAttribute('points') ?? '')
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map((pair) => pair.split(',').map(Number));
          // A zero-sized box inside the camera projects to a POINT, so this rect
          // IS the corner's position on screen — which is the whole difference
          // between the anchor and the Card's own axis-aligned bounding box.
          const at = anchor?.getBoundingClientRect();
          const box = on?.getBoundingClientRect();
          return {
            part,
            drawn,
            anchor: at ? { x: round(at.left - frame.left), y: round(at.top - frame.top) } : null,
            hookY: hook ? round(hook.getBoundingClientRect().top - frame.top) : null,
            named: Boolean(on),
            sits:
              at && box
                ? at.left >= box.left - onThePart &&
                  at.left <= box.right + onThePart &&
                  at.top >= box.top - onThePart &&
                  at.top <= box.bottom + onThePart
                : null,
          };
        });
      };

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

      // NAMED RATHER THAN DEREFERENCED, for the reason the Slab and the Timeline
      // are above and every box in `collapsedBelowTheBand` is: a renamed box
      // otherwise makes this Check reject with `Cannot read properties of null`
      // out of an `evaluate`, which fails the run and says nothing about why.
      const plane = document.querySelector('.eater-map__plane');
      const cardHost = document.querySelector('.eater-map__cards');
      if (!plane || !cardHost) {
        return {
          missing:
            'the Exploded View has no ' +
            (plane ? '.eater-map__cards' : '.eater-map__plane') +
            ', so nothing about the projection, the Slab standing still or the ' +
            "Cards' rise could be read",
        };
      }

      /** The Slab's own projected box, which #189 asks to be the same at both ends
       *  of the Lift. The plane is the picture's box exactly — `inset: 0` on the
       *  Slab — so this rect IS the drawing's outline under the projection. */
      const planeBox = () => {
        const box = plane.getBoundingClientRect();
        return { x: round(box.x), y: round(box.y), w: round(box.width), h: round(box.height) };
      };

      /** TWO IDENTICAL BOXES AT OPPOSITE ENDS OF THE SLAB, projected. Put on the
       *  plane and taken back off inside one read, because a probe is a question
       *  and not part of the composition — and put on `.eater-map__cards`, which is
       *  the box inside the projection whose own transform is nothing, so what
       *  moves them is the plane's projection and nothing else.
       *
       *  THE TILT IS WHAT MAKES THIS THE RIGHT PAIR: the head of the Slab leans
       *  away from the reader and the foot leans towards them, so under a camera at
       *  a finite distance these two are at different distances from the lens and
       *  are drawn at different sizes. `top: 100%` puts the second one just PAST
       *  the foot rather than on it — its own height below the Slab's bottom edge —
       *  which is further along the same axis and so a wider separation, not a
       *  different question. Under a parallel projection they are
       *  congruent, and `getBoundingClientRect` on a rotated box is the projected
       *  quad's axis-aligned bounding box — which is the same box for two congruent
       *  quads wherever they stand. */
      const probes = () => {
        const at = (top) => {
          const box = document.createElement('div');
          box.style.cssText =
            `position:absolute;left:50%;top:${top}%;width:${probe}px;height:${probe}px;` +
            'pointer-events:none;visibility:hidden';
          cardHost.append(box);
          const rect = box.getBoundingClientRect();
          box.remove();
          return { w: round(rect.width), h: round(rect.height) };
        };
        return { head: at(0), foot: at(100) };
      };

      /** Each Card's SCREEN-SPACE RISE off the plane, in px.
       *
       *  Measured against the same Card with its rise taken away rather than
       *  against a second element, so what is being read is the Card the reader is
       *  looking at. `--eater-map-card-rise` is the derived length the transform
       *  spends, so setting it to 0 removes the depth and leaves the along-plane
       *  slide standing — which is the difference between "how far did it come off
       *  the map" and "where did it end up".
       *
       *  OFF THE ANCHOR AND NOT OFF THE CARD'S OWN RECT, for the reason the leader
       *  lines are: a zero-sized box projects to a POINT, and the bounding box of a
       *  projected quad moves by a different amount from the quad itself. */
      const rises = () =>
        [...document.querySelectorAll('.eater-map__card')].map((card) => {
          const anchor = card.querySelector('.eater-map__anchor');
          const name = card.getAttribute('data-eater-map-card') ?? '(unnamed)';
          if (!anchor) return { name, rise: null };
          const up = anchor.getBoundingClientRect();
          const held = card.style.getPropertyValue('--eater-map-card-rise');
          card.style.setProperty('--eater-map-card-rise', '0');
          const down = anchor.getBoundingClientRect();
          if (held) card.style.setProperty('--eater-map-card-rise', held);
          else card.style.removeProperty('--eater-map-card-rise');
          return { name, rise: round(Math.hypot(up.x - down.x, up.y - down.y)) };
        });

      const was = { progress: lift.progress(), scroll: window.scrollY };
      kernel.hold?.();
      try {
        lift.progress(0);
        const down = cardBoxes();
        const flatPlane = planeBox();
        const flatHidden = invisible();
        const rulesFlat = rules();
        lift.progress(halfWay);
        const rulesHalfWay = rules();
        lift.progress(1);
        const raised = cardBoxes();
        const raisedPlane = planeBox();
        const raisedHidden = invisible();
        const rulesRaised = rules();
        const probed = probes();
        const risen = rises();

        // THE CAMERA IS LIFTED FOR ONE READ, AND ONLY FOR THE SCALE. A Card's
        // `getBoundingClientRect` is the axis-aligned bounding box of a quad
        // projected under the plane's rotation, which is not the Card's own drawn
        // width and never was — it agreed with it while the Lift's flat end was an
        // untilted screenshot, and #189 took that frame away. So the projection is
        // taken off the plane for the length of this read and put straight back: the
        // Card's own `scale()` is what is left, and its rect over its declared width
        // IS the scale the composition applied. `transform-style: flat` goes with it,
        // or the Cards' depths would still be carried under a plane that no longer
        // turns and the topmost Card would be measured a per cent large.
        const heldTransform = plane.style.transform;
        const heldStyle = plane.style.transformStyle;
        let square;
        try {
          plane.style.transform = 'none';
          plane.style.transformStyle = 'flat';
          square = cardBoxes();
        } finally {
          // Restored the way the playhead and the scroll are, and for the same
          // reason: an inline `transform: none` left standing on the plane would
          // outlive the failure that caused it, so a screenshot taken to work out
          // why the run broke would show a drawing nobody composed.
          plane.style.transform = heldTransform;
          plane.style.transformStyle = heldStyle;
        }

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
          square,
          down,
          raised,
          flatPlane,
          raisedPlane,
          probed,
          risen,
          flatHidden,
          raisedHidden,
          reachable,
          announced,
          overlay: overlay
            ? {
                spoken: overlay.getAttribute('aria-hidden') !== 'true',
                says: (overlay.textContent ?? '').trim(),
              }
            : null,
          numbered: document.querySelectorAll('.eater-map__points > li').length,
          // AND WHETHER EACH ONE IS INSIDE THE CAMERA, which is a fact about the
          // markup and has to be, since #189. An anchor outside the transformed
          // subtree used to be caught by geometry — it stood still while its part
          // was turned, and both ends of the Lift found it in one place — and the
          // Slab's own anchor now stands still legitimately, because the Slab does.
          // Containment is the question that assertion was asking all along.
          anchored: [...document.querySelectorAll('[data-eater-map-anchor]')].map((element) => ({
            part: element.getAttribute('data-eater-map-anchor'),
            projected: plane.contains(element),
          })),
          rules: { flat: rulesFlat, halfWay: rulesHalfWay, raised: rulesRaised },
        };
      } finally {
        window.scrollTo(0, was.scroll);
        lift.progress(was.progress);
        kernel.release?.();
      }
    }, { focusable: FOCUSABLE, onThePart: ON_THE_PART, halfWay: HALF_WAY, probe: PROBE });

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
    if (seen.square.length === 0) {
      failures.push(`${where}: no Card on the Slab, so nothing about their scale was checked`);
    }

    const slabScale = seen.slabWidth / seen.app;
    for (const card of seen.square) {
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
          `${where}: with the projection lifted, the ${card.name} Card is drawn at ` +
            `${drawnScale.toFixed(4)} and the Slab at ${slabScale.toFixed(4)} — the Card is not at the ` +
            "map's scale, so this is three stickers on a photograph rather than one screenshot",
        );
      }
    }

    for (const card of seen.down) {
      const up = seen.raised.find((other) => other.name === card.name);
      if (!up) {
        failures.push(`${where}: the ${card.name} Card is down on the map and not on the raised drawing`);
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
            `${card.drawn}x${card.height} at ${card.x},${card.y} down and ${up.drawn}x${up.height} at ` +
            `${up.x},${up.y} raised. The Exploded View is not exploding this one`,
        );
      }
    }

    // ---- the Slab stands still, and it stands in a parallel projection --------
    // THE INVARIANT #189 IS ABOUT, and the one the author cares most about: a
    // reader turning onto the Section does not watch the thing they are looking at
    // resize itself. Both angles were terms of `--eater-map-lift` before it, so the
    // plane tipped up as the page arrived; the mutation that puts either of them
    // back inside a `calc()` with the playhead in it fails here.
    const slabMoved = Math.max(
      Math.abs(seen.raisedPlane.x - seen.flatPlane.x),
      Math.abs(seen.raisedPlane.y - seen.flatPlane.y),
      Math.abs(seen.raisedPlane.w - seen.flatPlane.w),
      Math.abs(seen.raisedPlane.h - seen.flatPlane.h),
    );
    if (!Number.isFinite(slabMoved)) {
      failures.push(
        `${where}: the Slab's projected box cannot be measured — ${JSON.stringify(seen.flatPlane)} down ` +
          `against ${JSON.stringify(seen.raisedPlane)} raised. Nothing about it standing still was asserted`,
      );
    } else if (slabMoved > STILL) {
      failures.push(
        `${where}: the Slab is drawn ${seen.flatPlane.w}x${seen.flatPlane.h} at ` +
          `${seen.flatPlane.x},${seen.flatPlane.y} at one end of the Lift and ` +
          `${seen.raisedPlane.w}x${seen.raisedPlane.h} at ${seen.raisedPlane.x},${seen.raisedPlane.y} at ` +
          `the other — ${slabMoved.toFixed(2)}px apart. It does not change when the reader turns onto ` +
          'the Section; only the Cards move',
      );
    }

    const { head, foot } = seen.probed;
    const spread = Math.max(
      Math.abs(head.w - foot.w) / Math.max(head.w, foot.w),
      Math.abs(head.h - foot.h) / Math.max(head.h, foot.h),
    );
    if (!Number.isFinite(spread)) {
      failures.push(
        `${where}: the two probes cannot be measured — ${head.w}x${head.h} at the Slab's head and ` +
          `${foot.w}x${foot.h} at its foot. Nothing about the projection was asserted`,
      );
    } else if (spread > PARALLEL) {
      failures.push(
        `${where}: two identical ${PROBE}px probes are drawn ${head.w}x${head.h} at the Slab's head and ` +
          `${foot.w}x${foot.h} at its foot — ${(spread * 100).toFixed(1)}% apart. The projection is ` +
          'converging, and this drawing is parallel: nothing may grow because it is nearer the reader',
      );
    }

    // ---- and the three Cards rise together -----------------------------------
    const rises = seen.risen.filter((one) => Number.isFinite(one.rise));
    if (rises.length !== seen.risen.length) {
      failures.push(
        `${where}: ${seen.risen.length - rises.length} Card(s) have no measurable rise off the plane — ` +
          `${JSON.stringify(seen.risen)}. Nothing about the Lift's distance was asserted`,
      );
    }
    for (const one of rises) {
      if (!(one.rise > RISEN)) {
        failures.push(
          `${where}: the ${one.name} Card rises ${one.rise}px off the plane — a depth under a parallel ` +
            'projection reaches the screen only through the attitude, so a plane standing at none is an ' +
            'Exploded View with nothing exploded, and every other assertion here passes',
        );
      }
    }
    if (rises.length > 1) {
      const highest = Math.max(...rises.map((one) => one.rise));
      const lowest = Math.min(...rises.map((one) => one.rise));
      const apart = (highest - lowest) / highest;
      if (apart > TOGETHER) {
        failures.push(
          `${where}: the three Cards rise ${rises.map((one) => `${one.name} ${one.rise}px`).join(', ')} — ` +
            `${(apart * 100).toFixed(0)}% apart, against ${TOGETHER * 100}% allowed. They come off the map ` +
            'TOGETHER, so the drawing reads as one object taken apart rather than three objects hanging ' +
            'at three heights',
        );
      }
      // AND THEY ARE STILL A STACK. Rising together is half of it; the other half
      // is that the app's own order survives — the detail panel is a sheet on the
      // map, the lines popup floats above it, the search bar is on top. Three equal
      // depths satisfy the tolerance above perfectly and draw one raised plate.
      const order = ['search', 'lines', 'details'];
      for (let index = 1; index < order.length; index += 1) {
        const above = rises.find((one) => one.name === order[index - 1]);
        const below = rises.find((one) => one.name === order[index]);
        // A MISSED NAME IS A FAILURE AND NOT A SKIP. `order` is the app's own
        // stacking order written a second time — `cards.ts` owns the first copy
        // and this file cannot import it — so a renamed Card would otherwise make
        // both lookups miss, the loop skip, and this assertion pass while having
        // read nothing. That is the shape scripts/checks/NOTES.md warns about
        // three times, and it is worth the noisier branch.
        if (!above || !below) {
          failures.push(
            `${where}: no Card is named ${above ? order[index] : order[index - 1]} — this Check knows the ` +
              `stack as ${order.join(' over ')}, which is cards.ts's own order written a second time. ` +
              'Nothing about the stack having an order was asserted',
          );
          continue;
        }
        if (!(above.rise - below.rise > RISEN)) {
          failures.push(
            `${where}: the ${order[index - 1]} Card rises ${above.rise}px and the ${order[index]} Card ` +
              `${below.rise}px — the stack has lost its order, and three Cards at one depth are a raised ` +
              'plate rather than an exploded assembly',
          );
        }
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

    // ---- the leader lines -------------------------------------------------
    if (seen.overlay === null) {
      failures.push(
        `${where}: the composition has no leader-line overlay, so nothing joins the four numbered ` +
          'points to the parts of the Exploded View they name',
      );
    } else {
      if (seen.overlay.spoken) {
        failures.push(
          `${where}: the leader lines are not aria-hidden — they carry nothing that is not already ` +
            "in the four points' own words, and a reader listening is owed the words rather than " +
            'four rules read out as graphics',
        );
      }
      if (seen.overlay.says.length > 0) {
        failures.push(
          `${where}: the leader-line overlay carries text — "${seen.overlay.says.slice(0, 40)}". A rule ` +
            'may say nothing the text does not',
        );
      }

      const named = seen.rules.raised.map((rule) => rule.part);
      // ONE RULE PER POINT AND ONE PART PER RULE. The schema fails the build if a
      // point names no part or if two name one; this is the half a schema cannot
      // see — whether the parts named are the parts that are actually there.
      if (named.length !== seen.numbered) {
        failures.push(
          `${where}: ${seen.numbered} numbered point(s) and ${named.length} leader line(s) — every point ` +
            'is joined to the part it names, and no rule belongs to no point',
        );
      }
      for (const { part } of seen.anchored) {
        if (!named.includes(part)) {
          failures.push(
            `${where}: the ${part} is part of the Exploded View and no numbered point names it — ` +
              'no part without a number',
          );
        }
      }
      for (const rule of seen.rules.raised) {
        if (!rule.named) {
          failures.push(
            `${where}: a point names "${rule.part}", which is nothing in the Exploded View — ` +
              'no number without a part',
          );
        }
      }
    }

    // EVERY MOMENT, NOT JUST THE TWO ENDS. A rule computed from a Card's
    // untransformed box, or computed once and never again, is right at the flat
    // frame and wrong everywhere else — and the flat frame is the one a still is
    // most likely to be taken at.
    for (const [when, drawn] of [
      ['flat', seen.rules.flat],
      [`${HALF_WAY} of the way up`, seen.rules.halfWay],
      ['raised', seen.rules.raised],
    ]) {
      for (const rule of drawn) {
        if (rule.anchor === null || rule.hookY === null) {
          failures.push(
            `${where}: the ${rule.part} rule has no ${rule.anchor === null ? 'anchor' : 'hook'} to be ` +
              'drawn between, so nothing about where it lands was checked',
          );
          continue;
        }
        if (rule.drawn.length < 2) {
          failures.push(
            `${where}, ${when}: the ${rule.part} rule is not drawn — ${rule.drawn.length} point(s) on it. ` +
              'A numbered point with no line is a claim with nothing to attach it to',
          );
          continue;
        }
        const [tipX, tipY] = rule.drawn[rule.drawn.length - 1];
        const off = Math.hypot(tipX - rule.anchor.x, tipY - rule.anchor.y);
        // NaN on either side is a comparison that is false, which would read as a
        // pass — the shape scripts/checks/NOTES.md warns about three times.
        if (!Number.isFinite(off)) {
          failures.push(
            `${where}, ${when}: the ${rule.part} rule cannot be measured — it ends at ${tipX},${tipY} and ` +
              `the corner is at ${rule.anchor.x},${rule.anchor.y}. Nothing about it was asserted`,
          );
        } else if (off > ATTACHED) {
          failures.push(
            `${where}, ${when}: the ${rule.part} rule ends ${off.toFixed(1)}px from the corner it names — ` +
              `at ${tipX},${tipY} against ${rule.anchor.x},${rule.anchor.y}. A leader line beginning in ` +
              'empty space is the fault the design reference has and this Section does not',
          );
        }
        const [footX, footY] = rule.drawn[0];
        if (Math.abs(footY - rule.hookY) > ATTACHED) {
          failures.push(
            `${where}, ${when}: the ${rule.part} rule leaves its point at ${footX},${footY} and the point's ` +
              `own row is at ${rule.hookY} — the rule is not attached to the number it belongs to`,
          );
        }
        if (rule.sits === false) {
          failures.push(
            `${where}, ${when}: the ${rule.part} rule's anchor is not on the part it names — it is drawn ` +
              'from a corner of something else, so the correspondence is wrong wherever it looks right',
          );
        }
      }
    }

    // THE ANCHOR RIDES THE CAMERA, AND SINCE #189 THAT IS ASKED OF THE MARKUP. An
    // anchor outside the transformed subtree stands still while its part is turned,
    // and a rule to it stays attached to the anchor and detaches from the PART —
    // which every assertion above would still pass. It used to be caught by
    // geometry: both ends of the Lift found such an anchor in one place. The SLAB's
    // anchor is in one place at both ends now because the Slab is, which is the
    // whole point of the ticket, so the geometry can no longer tell the two apart
    // and containment is the question that assertion was asking all along.
    for (const { part, projected } of seen.anchored) {
      if (!projected) {
        failures.push(
          `${where}: the ${part}'s anchor is not inside .eater-map__plane — it stands outside the ` +
            'projection, so what the rule is drawn to is where the part would be if it were never turned',
        );
      }
    }

    // AND THE THREE CARDS' ANCHORS STILL MOVE, which is the geometry half and is
    // the Cards' alone: they are what the Lift carries, so an anchor of theirs that
    // stands still is one that is not riding the depth even though it is inside the
    // projection — a `position: fixed` in the vendored markup would do it, and
    // containment would not notice.
    for (const rule of seen.rules.flat) {
      if (rule.part === 'slab') continue;
      const up = seen.rules.raised.find((other) => other.part === rule.part);
      if (!rule.anchor || !up?.anchor) continue;
      if (Math.hypot(up.anchor.x - rule.anchor.x, up.anchor.y - rule.anchor.y) <= ATTACHED) {
        failures.push(
          `${where}: the ${rule.part}'s anchor is in the same place at both ends of the Lift — ` +
            `${rule.anchor.x},${rule.anchor.y}. It is inside the projection and is not riding its Card's ` +
            'own climb, so a rule to it comes off the map rather than off the Card',
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

/**
 * The Section's own boxes, in the SECTION'S OWN COORDINATES.
 *
 * Relative to `.eater-map`'s top-left rather than to the document's, and that is
 * the whole of what makes the three readers comparable: a scriptless page has no
 * Front Screen reveal and a Panel that answers `@media (scripting: none)`, so the
 * Sections ABOVE this one are not the same height in all three — and a comparison
 * in document coordinates would report every box in this Section as moved by the
 * same number and say nothing at all about this Section.
 */
function composition(page) {
  return page.evaluate(() => {
    const section = document.querySelector('.eater-map');
    if (!section) return null;
    const origin = section.getBoundingClientRect();
    const round = (n) => Math.round(n * 100) / 100;
    /** @type {Record<string, { x: number, y: number, w: number, h: number }>} */
    const boxes = {};
    const put = (name, element) => {
      if (!element) return;
      const box = element.getBoundingClientRect();
      boxes[name] = {
        x: round(box.x - origin.x),
        y: round(box.y - origin.y),
        w: round(box.width),
        h: round(box.height),
      };
    };
    for (const part of ['__head', '__copy', '__stage', '__slab', '__points']) {
      put(part, section.querySelector('.eater-map' + part));
    }
    for (const card of section.querySelectorAll('[data-eater-card]')) {
      put('card:' + card.getAttribute('data-eater-card'), card);
    }
    // THE PLAYHEAD TRAVELS WITH THE BOXES, because it is spent on more than them.
    // Collapsed, the geometry is pinned by `transform: none` whatever the playhead
    // holds — so a reader left at the raised end gets an IDENTICALLY SHAPED
    // drawing whose Cards' glass is filled to the plate, which is a Card that has
    // left a map it is still lying on. A comparison of rects alone reports that as
    // one composition; this is what makes it a difference.
    return { lift: getComputedStyle(section).getPropertyValue('--eater-map-lift').trim(), boxes };
  });
}

/**
 * Below the band: the drawing has collapsed, and every reader gets the same one.
 *
 * Six things, and the reason each is here rather than left to a person looking
 * at the page is that each fails by a few pixels or by nothing visible at all.
 *
 * ONE. IT IS ACTUALLY COLLAPSED. Asked first and answered with a bail, because
 * every assertion under it is about the collapsed composition and would pass
 * VACUOUSLY against the wide one — a Check reading the Exploded View and finding
 * the Exploded View intact is the shape scripts/checks/NOTES.md warns about three
 * times.
 *
 * TWO. NO PART OF THE PERSPECTIVE SURVIVES. The plane carries no transform and
 * stands in no 3D rendering context, and every Card is drawn at the Slab's own
 * scale — which is the flat frame's one relationship, asserted here for the same
 * reason it is asserted in the band and with more force: down here it is not a
 * frame the drawing passes through, it is where the drawing stays.
 *
 * THREE. THE SLAB IS FULL-BLEED. Both edges, against the DOCUMENT'S client width
 * and not `100vw` — the scrollbar's gutter is the difference between the two, the
 * suite runs with the gutter on for exactly that reason, and a box centred in what
 * it overflows would hang half the error out of each edge.
 *
 * FOUR. THE FOUR FEATURES ARE AN ORDINARY LIST BENEATH IT, in the LAYOUT and in
 * the DOCUMENT both. The second half is the one worth writing down: the collapse
 * could have been had with `order` or a `grid-row`, and then a reader looking at
 * the page and a reader hearing it would be given two different sequences — which
 * is invisible to everyone who can see the screen.
 *
 * FIVE. THERE ARE NO LEADER LINES. The points stand BENEATH the picture out
 * here, so a rule from one to its part would run back up the page and join a
 * paragraph to a corner off the top of the screen (#178). The rules may go —
 * everything they carry is in the points' own words — and they have to, because
 * a rule drawn before a resize would otherwise still be lying across the stack
 * afterwards. Asserted of the overlay's own `display`, which is the declaration
 * leaders.ts reads, so this is the same question the drawing asks itself.
 *
 * SIX. THE LIFT DOES NOT RUN. Waited out rather than sampled: the Lift takes
 * `--eater-map-lift-time` end to end, so the page is put on the Section and the
 * playhead is watched for longer than that. A Lift that ran would be well off 0
 * within a frame or two of arriving. **The pass is a TIMEOUT and not merely a
 * rejection**, and the two are told apart on purpose — a predicate that throws
 * rejects exactly as a playhead that never moved does, and taking either for the
 * answer is how a Check comes to assert nothing while reading as though it does.
 */
async function collapsedBelowTheBand(browser, origin) {
  const { context, page } = await open(browser, origin, { viewport: NARROW });
  const where = `${NARROW.width}x${NARROW.height}`;
  try {
    const failures = (await settle(page)).map((why) => `${where}: ${why}`);

    const seen = await page.evaluate(
      (focusable) => {
        const section = document.querySelector('.eater-map');
        const slab = document.querySelector('.eater-map__slab');
        const plane = document.querySelector('.eater-map__plane');
        const cardHost = document.querySelector('.eater-map__cards');
        const stage = document.querySelector('.eater-map__stage');
        const points = document.querySelector('.eater-map__points');
        if (!section || !slab || !plane || !cardHost || !stage || !points) {
          return { missing: 'the Section, the Slab, the plane, the Cards or the points are not on the page' };
        }

        const round = (n) => Math.round(n * 100) / 100;
        const slabBox = slab.getBoundingClientRect();
        const stageBox = stage.getBoundingClientRect();
        const pointsBox = points.getBoundingClientRect();
        const items = [...points.children].map((item) => {
          const box = item.getBoundingClientRect();
          return { top: round(box.top), bottom: round(box.bottom) };
        });

        return {
          missing: null,
          collapsed: getComputedStyle(section).getPropertyValue('--eater-map-collapsed').trim(),
          lift: getComputedStyle(section).getPropertyValue('--eater-map-lift').trim(),
          planeTransform: getComputedStyle(plane).transform,
          planeStyle: getComputedStyle(plane).transformStyle,
          cardsStyle: getComputedStyle(cardHost).transformStyle,
          app: Number.parseFloat(getComputedStyle(slab).getPropertyValue('--eater-map-app-w')),
          slabWidth: round(slabBox.width),
          slabLeft: round(slabBox.left),
          clientWidth: document.documentElement.clientWidth,
          stageBottom: round(stageBox.bottom),
          pointsTop: round(pointsBox.top),
          items,
          // `DOCUMENT_POSITION_FOLLOWING` on the stage's answer about the points:
          // the picture comes first in the markup as well as on the screen.
          pointsFollowTheStage: Boolean(
            stage.compareDocumentPosition(points) & Node.DOCUMENT_POSITION_FOLLOWING,
          ),
          cards: [...document.querySelectorAll('[data-eater-card]')].map((card) => {
            const box = card.getBoundingClientRect();
            return {
              name: card.getAttribute('data-eater-card') ?? '(unnamed)',
              drawn: round(box.width),
              declared: Number.parseFloat(getComputedStyle(card).width),
            };
          }),
          hidden: [...document.querySelectorAll('.eater-map__stage [class*="eater-map__"]')]
            .filter((element) => {
              const style = getComputedStyle(element);
              return Number.parseFloat(style.opacity) === 0 || style.visibility === 'hidden';
            })
            .map((element) => element.className),
          reachable: [...stage.querySelectorAll(focusable)].filter((el) => el.tabIndex >= 0).length,
          leaders: (() => {
            const overlay = document.querySelector('[data-eater-map-leaders]');
            return overlay ? getComputedStyle(overlay).display : null;
          })(),
        };
      },
      FOCUSABLE,
    );

    if (seen.missing) {
      failures.push(`${where}: ${seen.missing}`);
      return { failures, composition: null };
    }

    // ONE, and it bails: everything under it reads the collapsed composition, and
    // against the wide one every line of it would pass while asserting nothing.
    if (seen.collapsed !== '1') {
      failures.push(
        `${where}: the Section says --eater-map-collapsed is "${seen.collapsed}" — this window is below the ` +
          'band and the composition is meant to have collapsed here, so nothing about the collapse was ' +
          'checked. Either the breakpoint moved or this Check is reading the wrong window',
      );
      return { failures, composition: null };
    }

    // Read before the page is moved onto the Section below, and handed back so
    // the two other readers are compared against a composition rather than
    // against a second description of one.
    const ordinary = await composition(page);

    // TWO.
    if (seen.planeTransform !== 'none' || seen.planeStyle !== 'flat' || seen.cardsStyle !== 'flat') {
      failures.push(
        `${where}: the plane is drawn with transform ${seen.planeTransform} in a ${seen.planeStyle} ` +
          `rendering context and the Cards stand in a ${seen.cardsStyle} one — no part of the Exploded ` +
          "View's perspective may survive the collapse, and a camera with every angle at zero still " +
          'projects',
      );
    }
    if (Number.parseFloat(seen.lift) !== 0) {
      failures.push(
        `${where}: --eater-map-lift computes to ${seen.lift} on a collapsed composition — the playhead is ` +
          "spent on the Cards' glass as well as on the geometry, and glass filled to the plate is a Card " +
          'that has left a map it is still lying on',
      );
    }

    const slabScale = seen.slabWidth / seen.app;
    for (const card of seen.cards) {
      const drawnScale = card.drawn / card.declared;
      if (!Number.isFinite(drawnScale) || !Number.isFinite(slabScale) || drawnScale <= 0) {
        failures.push(
          `${where}: the ${card.name} Card cannot be measured — ${card.drawn}px drawn over ` +
            `${card.declared}px declared. Nothing about its scale was asserted`,
        );
        continue;
      }
      if (Math.abs(drawnScale - slabScale) / slabScale > SCALE_TOLERANCE) {
        failures.push(
          `${where}: collapsed, the ${card.name} Card is drawn at ${drawnScale.toFixed(4)} and the Slab at ` +
            `${slabScale.toFixed(4)} — the flat composition is a screenshot of the app, and a Card at any ` +
            'other scale is a sticker on a photograph',
        );
      }
    }

    // THREE.
    if (
      Math.abs(seen.slabWidth - seen.clientWidth) > BLEED_TOLERANCE ||
      Math.abs(seen.slabLeft) > BLEED_TOLERANCE
    ) {
      failures.push(
        `${where}: the Slab is ${seen.slabWidth}px wide at x=${seen.slabLeft} in a ${seen.clientWidth}px ` +
          'document — collapsed it runs to both edges of the window, and the page\'s own margin on either ' +
          'side is what it has to spend back',
      );
    }
    // NOT "does the DOCUMENT overflow", which is the obvious next assertion and
    // is a claim about the whole page rather than about this Section. The Section
    // is `overflow-x: clip`, so it could not push the page sideways if it tried,
    // and the assertion would be answering for whichever Section happens to have
    // a full-bleed box in it — it caught the Front Screen's `100vw` photograph
    // strip on its first run, which is a real 7.5px on either side and none of
    // this ticket's business. THAT ASSERTION NOW HAS ITS OWN CHECK — `across`,
    // added by #186, which fixed the strip — so what is left here is deliberately
    // narrower rather than missing. The two lines above are the claim with teeth:
    // a `100vw` Slab in a window with a scrollbar is 15px too wide and CENTRED in
    // what it overflows, so it misses both edges by half of that, and neither
    // half is something `across` could say about this Section.

    // FOUR.
    if (!(seen.pointsTop >= seen.stageBottom - 1)) {
      failures.push(
        `${where}: the four features start at y=${seen.pointsTop} and the Slab ends at y=${seen.stageBottom} ` +
          '— collapsed they read as an ordinary list BENEATH the picture, not beside it or above it',
      );
    }
    if (!seen.pointsFollowTheStage) {
      failures.push(
        `${where}: the points come BEFORE the stage in the document while coming after it on the screen — a ` +
          'reader hearing the page and a reader looking at it are being given two different sequences',
      );
    }
    if (seen.items.length !== 4) {
      failures.push(
        `${where}: the list under the Slab has ${seen.items.length} item(s) — the Exploded View names four ` +
          'features and the collapse is where they are read as a list',
      );
    }
    for (let index = 1; index < seen.items.length; index += 1) {
      const above = seen.items[index - 1];
      const item = seen.items[index];
      if (!(item.top >= above.bottom - 1)) {
        failures.push(
          `${where}: feature ${index + 1} starts at y=${item.top} and feature ${index} ends at ` +
            `y=${above.bottom} — collapsed the four are one under another, which is what "an ordinary list" ` +
            'means and what a column has room for',
        );
      }
    }

    if (seen.hidden.length > 0) {
      failures.push(
        `${where}: ${seen.hidden.length} of the Section's own boxes are invisible — ${seen.hidden.join(', ')}. ` +
          'The collapsed composition is what a reader down here is looking at, and nothing in it may be ' +
          'hidden in CSS waiting for a Timeline that never runs',
      );
    }
    if (seen.reachable > 0) {
      failures.push(
        `${where}: ${seen.reachable} focusable element(s) inside the collapsed picture — it is a picture of ` +
          'an app, and its controls belong to no page a reader can be sent to',
      );
    }

    // FIVE.
    if (seen.leaders !== null && seen.leaders !== 'none') {
      failures.push(
        `${where}: the leader lines are still drawn (display: ${seen.leaders}) where the Exploded View has ` +
          'collapsed — the points stand beneath the picture out here, so a rule from one to its part runs ' +
          'back up the page to a corner off the top of the screen',
      );
    }

    // SIX. Long enough that a Lift which ran would be at its far end, read off
    // the Section's own Token rather than guessed at, so a slower Lift does not
    // quietly turn this into a sampling window that misses.
    const lifted = await page
      .evaluate(async () => {
        const section = document.querySelector('.eater-map');
        if (!section) return 0;
        const raw = getComputedStyle(section).getPropertyValue('--eater-map-lift-time');
        const value = Number.parseFloat(raw);
        const seconds = Number.isFinite(value) ? (raw.trim().endsWith('ms') ? value / 1000 : value) : 1.15;
        // Onto the Section, which is where the Lift would be armed if anything
        // armed it. No snapping to lift: below the band there is one port and no
        // page turn, which is the whole reason the composition collapsed.
        window.scrollTo(0, section.getBoundingClientRect().top + window.scrollY);
        return Math.max(1, seconds);
      })
      .then((seconds) =>
        page.waitForFunction(
          () => (window.portfolio?.timelines.get('eater-map')?.progress() ?? 0) > 0.001,
          undefined,
          { timeout: seconds * 1000 + 500 },
        ),
      )
      .then(() => 'ran')
      // A TIMEOUT IS THE PASS AND EVERY OTHER REJECTION IS NOT, which is the
      // difference between an assertion and the appearance of one. `waitForFunction`
      // rejects with a TimeoutError when the playhead never moved — that is the
      // answer this wants. It rejects the same way if the predicate throws, if the
      // page navigated, or if the Kernel stopped registering a Timeline under this
      // name, and a bare `catch(() => null)` reports every one of those as "the
      // Lift correctly did not run" while having read nothing.
      .catch((error) => (error?.name === 'TimeoutError' ? null : error));

    if (lifted === 'ran') {
      const at = await page.evaluate(
        () => window.portfolio?.timelines.get('eater-map')?.progress() ?? null,
      );
      failures.push(
        `${where}: coming to rest on the Section ran the Lift to ${at} — below the band there is no page ` +
          'turn to settle and no Exploded View to assemble, and a phone quietly tilting itself under a ' +
          'column is the composition this window collapsed to get away from',
      );
    } else if (lifted !== null) {
      failures.push(
        `${where}: watching the Lift's playhead failed rather than timing out — ${lifted}. Nothing was ` +
          'asserted about whether the Lift runs below the band',
      );
    }

    return { failures, composition: ordinary };
  } finally {
    await context.close();
  }
}

/**
 * One composition, and not a third arrangement.
 *
 * The collapse is written as rules on the markup's own resting state, so the
 * narrow reader, the reader who asked for no motion and the reader whose scripts
 * never arrived are all handed the same drawing — and this is that stated as an
 * EQUALITY rather than as three descriptions of what each one should get. Three
 * descriptions is three things to keep true; one equality is what actually stops
 * a fourth arrangement growing under one reader while nobody is looking at that
 * reader's window.
 *
 * NEITHER OF THE TWO IS SETTLED, and for two different reasons. Nothing scrubs
 * under reduced motion, and nothing MOUNTS with no script at all — everything
 * compared here is prerendered and laid out by a stylesheet, which is exactly the
 * claim. What is waited for instead is the faces, because three of the boxes are
 * text and a comparison taken mid-swap would report a difference that is a font
 * arriving.
 */
async function everyReaderGetsIt(browser, origin, ordinary) {
  /** @type {string[]} */
  const failures = [];
  const where = `${NARROW.width}x${NARROW.height}`;

  for (const [reader, options] of [
    ['who asked for no motion', { reducedMotion: 'reduce' }],
    ['whose scripts never arrived', { javaScriptEnabled: false }],
  ]) {
    const { context, page } = await open(browser, origin, { viewport: NARROW, ...options });
    try {
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      const theirs = await composition(page);
      if (theirs === null) {
        failures.push(`${where}: the reader ${reader} has no Eater Map Section on the page at all`);
        continue;
      }
      if (theirs.lift !== ordinary.lift) {
        failures.push(
          `${where}: the reader ${reader} is given --eater-map-lift ${theirs.lift} where an ordinary reader ` +
            `gets ${ordinary.lift} — collapsed, the playhead is what fills the Cards' glass, and a drawing ` +
            'the same shape with different glass in it is still a second composition',
        );
      }
      for (const [name, box] of Object.entries(ordinary.boxes)) {
        const mine = theirs.boxes[name];
        if (!mine) {
          failures.push(
            `${where}: the reader ${reader} has no ${name} in the Section — the collapsed composition is ` +
              'one drawing every reader down here gets, and this one is missing a piece of it',
          );
          continue;
        }
        const apart = Math.max(
          Math.abs(mine.x - box.x),
          Math.abs(mine.y - box.y),
          Math.abs(mine.w - box.w),
          Math.abs(mine.h - box.h),
        );
        if (apart > SAME_TOLERANCE) {
          failures.push(
            `${where}: the reader ${reader} gets ${name} at ${mine.x},${mine.y} ${mine.w}x${mine.h} where an ` +
              `ordinary reader gets ${box.x},${box.y} ${box.w}x${box.h} — the collapse is meant to be ONE ` +
              'composition serving all three, and this is a third arrangement',
          );
        }
      }
    } finally {
      await context.close();
    }
  }
  return failures;
}

export const check = {
  name: 'eater-map',
  title:
    'the Cards lie on the Slab at its own scale, come off it and go back, are joined to their numbers, ' +
    'are only a picture, and lie flat and full-bleed below the band',

  /** @param {{ browser: import('playwright').Browser, origin: string }} ctx */
  async run({ browser, origin }) {
    const found = [];
    for (const viewport of [WIDE, SHORT]) {
      found.push(...(await atWindow(browser, origin, viewport)));
    }
    found.push(...(await reversesOnTheWayOut(browser, origin)));

    const collapse = await collapsedBelowTheBand(browser, origin);
    found.push(...collapse.failures);
    // Only when there IS a collapsed composition to compare against. Without the
    // guard the equality would be asserted against nothing and pass, which is the
    // whole failure mode the bail above exists to avoid rather than to relocate.
    if (collapse.composition) {
      found.push(...(await everyReaderGetsIt(browser, origin, collapse.composition)));
    }
    return found;
  },
};
