import { CARDS } from './cards';
import { clearEdge, type Corners, extrude, fitRadii, SOLID } from './edge';
import { SLAB } from './slab';

/**
 * The Cards' **glass**: a blurred copy of the Slab behind every glass surface, and
 * an edge round every one of them (#190).
 *
 * WHY A COPY OF THE MAP AND NOT `backdrop-filter`. A backdrop filter samples what
 * is painted behind an element IN ITS OWN 3D RENDERING CONTEXT, and while the plane
 * was `preserve-3d` and turned there was no such thing: Chromium handed the filter
 * an empty backdrop and it became a no-op, silently, at the FIRST DEGREE of tilt —
 * measured, with the rise and the slides all at 0 and only the tilt standing. So
 * the app's own frosted surfaces were clear glass with a sharp map behind their
 * text, which is a composition a reader cannot read.
 *
 * #207 TOOK THE RENDERING CONTEXT AWAY AND THE FILTERS WOKE UP, which is what #211
 * is. They are turned off by name on `.eater-map__card` now — a second frost over
 * this one, and a render surface per glass surface, which is what made the Cards'
 * text soft again. This module is unaffected and is still the whole of the frost;
 * `EaterMap.astro` carries the measurement.
 *
 * WHAT THIS REPLACES, AND IT IS THE OPPOSITE OF IT. Until #190 the Section mixed
 * each Card's three glass colours towards `--eater-map-plate` in step with its
 * climb, so a raised Card went opaque WHITE. That was legible and it was the
 * reverse of the reference, which wants transparent, heavily blurred, dark glass
 * with the map smeared behind it. The plate is gone, the mix with it, and what
 * stands in its place is this: each surface carries a copy of the Slab, offset by
 * that surface's own place on it, blurred and brightened.
 *
 * BRIGHTENED, BECAUSE A DARK MAP BEHIND A DARK SURFACE READS AS A HOLE rather than
 * as glass. That is a Token and so are the blur and the saturation.
 *
 * THE OFFSET DOES NOT FOLLOW THE CLIMB, AND THAT IS THE PARALLAX. The copy is a
 * child of the Card, so it travels with the Card: a Card raised off the map shows
 * the piece of map it was LYING on rather than the piece it is now over. That is
 * what a sheet of glass lifted off a table does, and it is why the offset is the
 * Card's resting place and never its drift.
 *
 * A CARD IS ITS GLASS SURFACES AND NOT ITS BOUNDING BOX. `cards.ts` says which
 * elements those are; the search Card has TWO, and one backdrop round the pair
 * welds them into a single long component with two buttons stuck on the end.
 *
 * AND EVERY NUMBER IS MEASURED RATHER THAN TYPED. The vendored markup is rendered
 * into an offscreen RULER at its natural size and each named surface's offset and
 * its four computed corner radii are read there. Measuring after the Card is on the
 * plane does not work: `getBoundingClientRect` on a turned element is the
 * axis-aligned bounding box of the projected quad, so the rects come back
 * projected. A radius stated in this repository would be a second opinion about a
 * number `cards.css` already holds — the mockup typed `24 / 18 / 22` against the
 * stylesheet's own `--r-full`, `--r-menu: 14px` and `--r-sheet: 28px 28px 0 0`, and
 * two of the three were drawn to the wrong outline.
 *
 * MEASURED ONCE FOR THE READER, which is not an optimisation but a fact about what
 * is being measured: the Cards are frozen to the viewport they were exported at
 * (NOTES.md), so a surface's offset and radii are the same numbers at every window
 * the Portfolio is ever drawn at. Everything that DOES change with the window — the
 * Card's place on the Slab, the thickness of its edge, the blur — is a CSS
 * expression the browser re-evaluates, so a Token dragged in the Editor and a
 * window carried across the breakpoint both move the drawing with nothing
 * re-mounted.
 *
 * AND THE ONE LENGTH THAT IS NEITHER IS CARRIED RATHER THAN MEASURED (#194). The
 * results dropdown hangs a derived clearance below the search bar, and that
 * clearance is a function of two Tokens the author may drag — so measuring it
 * would write a number that goes stale the first time either moves, and the
 * dropdown would slide out from under its own glass. The ruler is handed a
 * clearance of ZERO and a hung surface's top comes back as `<measured>px +
 * var(…)`, so the measurement stays the constant it claims to be and the offset
 * stays live.
 *
 * THE SHADING IS THE ONE THING THAT IS NOT A CSS EXPRESSION AT ALL, so this
 * function is called again under the Editor and only there — `redraw.ts` is the
 * caller, and it is idempotent for it. NOTES.md.
 *
 * A READER WITH NO SCRIPTS GETS THE APP'S OWN TRANSLUCENCY OVER THE MAP, which is
 * the same trade the Slab's edge and the leader lines make and is affordable for
 * the same reason: what is lost is a drawing convention rather than a claim. It is
 * affordable HERE only because the Cards are dark now — a light translucent surface
 * over a light map was the illegible case, and dark ink on dark ink is not.
 */

/** The class the copies carry, and the attribute a Check asks them by. Nothing
 *  styles either: every rule below is inline, because these are built here and
 *  Astro's scoped selectors reach only what its own template rendered. */
const GLASS = 'eater-map__glass';

/**
 * The Card's own scale ABOVE the app's — its boost.
 *
 * A CARD IS DRAWN AT `app-scale x boost` AND ITS MAP MUST STILL BE DRAWN AT
 * `app-scale`, or a boosted Card shows a map through itself larger than the map it
 * is lying on. So one capture pixel is `1 / boost` of that Card's own units, and
 * every length inside the backdrop divides by it: the copy's size, its offset, and
 * the blur. #187 adopts a boost of 1.10 for the rail popup alone, and this is the
 * whole mechanical cost of that — one division.
 *
 * The edge divides by it too, and for a second reason: `scale()` is
 * `scale3d(s, s, 1)`, so a Card's DEPTH is not scaled with its face. See
 * `Solid.filletBack`.
 */
const BOOST = 'var(--eater-map-card-scale)';

/** The phone Eater was captured at, which is the coordinate system a Card's own
 *  units are. `slab.ts` is the one file that knows. */
const APP_W = SLAB.viewport.width;
const APP_H = SLAB.viewport.height;

/** A surface's own thickness and the roll from its face to its wall, as shares of
 *  the SLAB's width — the same unit the Slab's own pair is in, so one object is one
 *  material. `min()` holds the second to the first for the reason `stage-dom.ts`
 *  states: an edge cannot be rounder than it is deep. */
const CARD_DEPTH = `${SOLID} * var(--eater-map-card-thickness)`;
const CARD_ROUND =
  `${SOLID} * min(var(--eater-map-card-edge-radius), var(--eater-map-card-thickness))`;

/**
 * The gap a hung surface stands below the one it hangs from, and the ONE length
 * in a Card that is not frozen to the export's viewport (#194).
 *
 * `EaterMap.astro` derives it from the Card's thickness and the plane's tilt,
 * because a surface sitting below another on the plane has to clear that one's
 * EDGE rather than its face. So it moves when either Token is dragged — which is
 * why it is carried through the measurement as an expression rather than
 * measured: the ruler is given a clearance of ZERO and every hung surface's top
 * comes back as `<measured>px + this`, so what is written down stays a constant
 * and what the author can move stays live.
 */
const HANG = 'var(--eater-map-results-clear)';

/** The box a hung surface arrives in, which is what says it is hung at all. */
const HUNG = 'eater-map__hang';

/** One glass surface, measured off the vendored stylesheet at its natural size. */
interface Surface {
  /** `<card> <selector>`, written on the backdrop and on every slice of its edge */
  readonly name: string;
  readonly x: number;
  /**
   * Where its top edge is inside the Card, as a BARE CSS expression — the
   * convention `edge.ts` states, so it composes without being unwrapped.
   *
   * A STRING WHERE `x` IS A NUMBER, and the asymmetry is the whole of what a hung
   * surface costs: nothing in this composition moves a surface sideways inside its
   * Card, and the clearance above one moves down.
   */
  readonly top: string;
  readonly w: number;
  readonly h: number;
  /** top-left clockwise, already clamped to the box the way a browser clamps them */
  readonly radii: Corners;
}

/**
 * Measure one Card's glass surfaces at their natural size.
 *
 * The vendored subtree is CLONED rather than re-parsed from `cards.ts`, so what is
 * measured is the markup that is actually on the page — including whatever
 * `cards.ts` did to it on the way in.
 *
 * THE CARD'S FACE AND NOT ITS FIRST SURFACE, since #194: a Card may hold a second
 * vendored root hanging under the first, and both are the face's children. The
 * face carries no size of its own, so cloning it changes nothing about what the
 * measurement finds for the three Cards that have one root.
 */
function measure(ruler: HTMLElement, card: HTMLElement, selectors: readonly string[]): Surface[] {
  const name = card.dataset.eaterMapCard ?? '(unnamed)';
  const face = card.querySelector('.eater-map__face');
  if (!face) return [];

  const host = document.createElement('div');
  // The vendored stylesheet's own host, which is its containment: every selector in
  // `cards.css` begins with this class, so the clone is laid out exactly as the
  // Card is and nothing on the page reaches into it.
  //
  // THIS HOST AND THIS CLONE ARE EVERY ANCESTOR THE MEASUREMENT HAS, which is
  // load-bearing rather than incidental: it is the whole of what a rule in
  // `cards-shape.css` may select through (#195). NOTES.md.
  host.className = 'eater-cards';
  // STATED RATHER THAN LEFT UNRESOLVED. The Section's Tokens are out of scope down
  // here, so the clearance would compute to nothing anyway — and a measurement that
  // is right by accident is one that stops being right the day the ruler moves.
  host.style.setProperty('--eater-map-results-clear', '0px');
  const copy = face.cloneNode(true) as HTMLElement;
  // A backdrop built on an earlier mount would be measured as part of the Card.
  // They are cleared before this runs; this is what makes that ordering a fact
  // rather than a hope.
  for (const stale of copy.querySelectorAll(`.${GLASS}`)) stale.remove();
  host.append(copy);
  ruler.append(host);

  const root = host.querySelector('[data-eater-card]');
  const origin = (root ?? host).getBoundingClientRect();
  const found: Surface[] = [];
  for (const selector of selectors) {
    const element = host.querySelector(selector);
    if (!element) {
      // LOUD, AND THE `console` CHECK MAKES IT A BUILD FAILURE. A re-vendoring that
      // renamed a glass surface would otherwise ship a Card with no map behind it
      // and no edge round it, which reads as a composition rather than as a break.
      console.error(`eater-map: the ${name} Card has no ${selector} to make glass of`);
      continue;
    }
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const y = box.top - origin.top;
    found.push({
      name: `${name} ${selector}`,
      x: box.left - origin.left,
      top: element.closest(`.${HUNG}`) ? `${y}px + ${HANG}` : `${y}px`,
      w: box.width,
      h: box.height,
      // `border-radius: 999px` is what a pill STATES and `999px` is what the
      // computed value hands back; the used value is the browser's own arithmetic
      // and there is no property to read it off. `fitRadii` is that arithmetic.
      radii: fitRadii(box.width, box.height, [
        Number.parseFloat(style.borderTopLeftRadius) || 0,
        Number.parseFloat(style.borderTopRightRadius) || 0,
        Number.parseFloat(style.borderBottomRightRadius) || 0,
        Number.parseFloat(style.borderBottomLeftRadius) || 0,
      ]),
    });
  }

  host.remove();
  return found;
}

/** A blurred copy of the Slab, cut to one glass surface's outline. */
function backdrop(surface: Surface): HTMLElement {
  const box = document.createElement('div');
  box.className = GLASS;
  box.dataset.eaterMapGlass = surface.name;
  box.setAttribute('aria-hidden', 'true');
  box.style.cssText = [
    'position:absolute',
    `left:${surface.x}px`,
    `top:calc(${surface.top})`,
    `width:${surface.w}px`,
    `height:${surface.h}px`,
    `border-radius:${surface.radii.map((r) => `${r}px`).join(' ')}`,
    'overflow:hidden',
    'pointer-events:none',
  ].join(';');

  const map = document.createElement('img');
  map.src = SLAB.src;
  map.alt = '';
  map.decoding = 'async';
  map.draggable = false;
  // BOTH OFFSETS ARE A SHARE OF THE SLAB'S WIDTH, and the vertical one is the part
  // that is easy to get wrong. `--eater-map-card-y` was a share of the Slab's
  // HEIGHT until #189 collapsed the pair onto one unit, so the mockup's own formula
  // — `top: -y * 852px` — is 2.17 times the answer here. The Card's `top` is
  // `y * 100cqw`, one capture pixel is `100cqw / 393` of the plane, and the Card's
  // own units are capture pixels divided by the boost: so the copy sits at
  // `-y * 393px / boost`, exactly as `left` does.
  map.style.cssText = [
    'position:absolute',
    `left:calc(-1 * var(--eater-map-card-x) * ${APP_W}px / ${BOOST} - ${surface.x}px)`,
    `top:calc(-1 * var(--eater-map-card-y) * ${APP_W}px / ${BOOST} - (${surface.top}))`,
    `width:calc(${APP_W}px / ${BOOST})`,
    `height:calc(${APP_H}px / ${BOOST})`,
    'object-fit:cover',
    // The blur is in the capture's own pixels and divides by the boost with
    // everything else, so the map is smeared by the same amount behind every
    // surface however large that surface is drawn. A `filter` here is safe where it
    // would be fatal on a slice: this img is inside the Card's FLAT face, not in
    // the preserve-3d context (NOTES.md).
    `filter:blur(calc(var(--eater-map-glass-blur) / ${BOOST}))` +
      ' brightness(var(--eater-map-glass-brighten))' +
      ' saturate(var(--eater-map-glass-saturate))',
  ].join(';');
  box.append(map);
  return box;
}

/**
 * Give every Card's glass surfaces a map behind them and an edge round them.
 *
 * CLEARED ONCE PER CARD AND THEN BUILT PER SURFACE, and the order is the whole
 * point. A Card with two glass surfaces has two stacks under one host, so a clear
 * written inside the per-surface loop deletes the first surface's slices when the
 * second is built — and only the last surface keeps an edge. The surviving surface
 * looks perfect, so the failure reads as "the search bar has no edge" rather than
 * as a broken rebuild. #197 carries it as a bug to inherit rather than rediscover,
 * `clearEdge` is where that distinction now lives so both callers spell it once,
 * and the `eater-map` Check asserts that EVERY surface carries slices.
 */
export default function mountGlass(root: HTMLElement): void {
  const cards = [...root.querySelectorAll<HTMLElement>('[data-eater-map-card]')];
  if (cards.length === 0) return;

  /** How far a surface's fillet rolls in across its face, in the APP'S OWN PIXELS
   *  — the plan half of `CARD_ROUND`, for the shading (#197).
   *
   *  A SHARE OF THE SLAB'S WIDTH TIMES THE PHONE'S OWN WIDTH, which is the same
   *  arithmetic `CARD_ROUND` does in `cqw` and `APP_W` puts into the Card's units.
   *  Held to the thickness here as `min()` holds it there, so one constraint is not
   *  two opinions. */
  const style = getComputedStyle(root);
  const token = (name: string) => {
    const value = Number.parseFloat(style.getPropertyValue(name));
    return Number.isFinite(value) ? value : 0;
  };
  const round =
    Math.max(
      0,
      Math.min(token('--eater-map-card-edge-radius'), token('--eater-map-card-thickness')),
    ) * APP_W;

  const ruler = document.createElement('div');
  ruler.setAttribute('aria-hidden', 'true');
  // Off the left of the document, which costs no scroll in a left-to-right page,
  // and gone again before this function returns — so nothing else can ever read a
  // layout it is in.
  ruler.style.cssText = 'position:absolute;left:-10000px;top:0;pointer-events:none';
  document.body.append(ruler);

  try {
    for (const card of cards) {
      const named = CARDS.find((one) => one.name === card.dataset.eaterMapCard);
      const face = card.querySelector<HTMLElement>('.eater-map__face');
      if (!named || !face) continue;

      clearEdge(card);
      for (const stale of face.querySelectorAll(`:scope > .${GLASS}`)) stale.remove();

      for (const surface of measure(ruler, card, named.surfaces)) {
        // The copy goes INSIDE the flat face, first, so the vendored markup paints
        // over it. The edge goes OUTSIDE the face, as its sibling, because a slice
        // is at a depth and a depth inside a flat face is nothing at all.
        face.insertBefore(backdrop(surface), face.firstChild);
        extrude(card, face, {
          box: {
            x: `${surface.x}px`,
            y: surface.top,
            w: `${surface.w}px`,
            h: `${surface.h}px`,
          },
          radii: [
            `${surface.radii[0]}px`,
            `${surface.radii[1]}px`,
            `${surface.radii[2]}px`,
            `${surface.radii[3]}px`,
          ],
          // THE SAME OUTLINE AS ARITHMETIC, for the shading (#197), in the app's
          // own pixels — which is what `measure` already handed back, so a Card's
          // plan costs one field and no second measurement. Its four radii are the
          // browser's own clamped values, and the details sheet's really are
          // `28 / 28 / 0 / 0`, so two of its corners are a hard stop in the
          // gradient and two are a sweep.
          //
          // NOT DIVIDED BY THE BOOST, unlike every length beside it. The gradient
          // is exactly scale-invariant, so scaling this outline changes not one
          // stop — and the boost is a scale.
          plan: {
            w: surface.w,
            h: surface.h,
            radii: surface.radii,
            fillet: round,
          },
          // ACROSS THE FACE, in the Card's own units — divided by the boost,
          // because the Card's face is scaled by it.
          fillet: `(${CARD_ROUND}) * ${APP_W}px / ${BOOST}`,
          // ...and ALONG Z, in the plane's units, because `scale()` leaves Z alone.
          // The two are the same distance said twice.
          filletBack: `(${CARD_ROUND}) * 100cqw`,
          depth: `(${CARD_DEPTH}) * 100cqw`,
          // AND THE DEPTH IS DRAWN FLAT, which is what keeps the app's own text
          // sharp (#207): a `preserve-3d` Card is rasterised square and resampled
          // onto the tilted plane, and the drawing is a picture of an INTERFACE.
          // The two depths above are in the plane's units and a `translate` on a
          // child of this Card is scaled by the Card, so the projection divides by
          // exactly that scale — read off the Card rather than rebuilt here, so
          // the boost and the app's own scale are one name and not three.
          flatten: 'var(--eater-map-card-total)',
          colour: 'var(--eater-map-card-edge)',
          surface: surface.name,
        });
      }
    }
  } finally {
    ruler.remove();
  }
}
