import { edgeShade, type Stage, type StageParts } from './stage';

/**
 * The DOM stage: the shipped Exploded View, and the one the markup already reads
 * as.
 *
 * THE PROJECTION IS NOT THIS MODULE'S, and that has not changed. The rotation,
 * the Cards' depths and the picture itself are all in `EaterMap.astro`'s scoped
 * stylesheet, so a reader whose scripts never arrived has the whole composition
 * out of the markup. What is here is the ONE thing a stylesheet cannot draw: the
 * Slab's own solidity. **A READER WITH NO SCRIPTS THEREFORE GETS THE EXPLODED
 * VIEW WITHOUT AN EDGE**, exactly as they get it without the leader lines
 * (#178), and that is the honest cost of the boundary rather than an oversight —
 * an extrusion is twenty-four elements and a renderer choice (#182), and it is
 * the one part of this Section a template could not hold on behalf of both
 * stages.
 *
 * THE SLAB IS SLICED, WHICH IS DOM'S ANSWER TO HAVING NO EXTRUSION. What it has
 * is elements at depths, so each slice is one flat element standing where that
 * slice of the solid stands. The slices are the real solid's own: a quarter-round
 * fillet rolling from the front face to the side wall, then the wall itself, each
 * inset and rounded by exactly as much as the section at its depth is. Enough of
 * them and the steps close up.
 *
 * FOUR HINGED WALLS WAS THE OBVIOUS BUILD AND IT IS WRONG, which is worth having
 * written down because #189 was specified that way before it was corrected. A
 * wall hinged along one edge of a rounded rectangle has to be inset by the corner
 * radius at BOTH ends, so four of them leave four empty notches — 17.1 x 11.4px
 * on a 380px Slab, which is the author's "the corners are missing". A slice is a
 * full perimeter: its corners are the same element as its sides, so there is
 * nothing to leave out.
 *
 * WHERE IT STOPS. Every slice is ONE COLOUR ALL THE WAY ROUND, because a slice is
 * one element and an element has one background — so the fillet cannot be lit
 * from a direction, and it cannot carry the picture. Six faces would not help and
 * neither would six hundred slices: the captured pixels stop at the flat face and
 * the edge is paint. `wrapped` is not in this stage's list of edges for that
 * reason, and the empty cell on the sheet is the result. **What that empty cell
 * does NOT settle is #182**: the corner is closed, so what is left to judge is
 * whether a faceted fillet is distinguishable from a swept one at the size the
 * Slab is drawn. Giving each slice a direction is #197 and is one line below.
 *
 * WHY THE SLICES ARE INLINE-STYLED. Astro scopes a component's `<style>` by
 * stamping an attribute on the elements ITS OWN TEMPLATE renders, and these are
 * built here, so no scoped selector can reach them — the same wall `cards.ts`
 * hits with the vendored markup, and the same answer. `:global()` is the escape
 * hatch and `check-source.mjs` fails the build on it.
 *
 * NO LENGTH BELOW IS SPENT BY THE LIFT, AND THAT IS #189. They all used to be:
 * at progress 0 the thickness was 0, the fillet was 0, the clip was `inset(0)`
 * and the composition was the screenshot #176 built, to the pixel. The Slab is
 * the same solid at both ends of the Lift now — a depth that grew as the reader
 * arrived would be the Slab changing under them, which is the one thing this
 * Section is built against — so what these are spent by is `--eater-map-solid`
 * instead: 1 in the band and 0 below it, which is the collapse taking the edge
 * away without anything being re-mounted on a resize.
 *
 * Every one is written in `cqw` for the reason everything else on the plane is —
 * these are children of `.eater-map__slab`, which is the container, so a share of
 * the Slab holds at every window.
 */

/**
 * How many slices the fillet is cut into, and how many the wall behind it is.
 *
 * Counts and not Tokens: they are how finely the solid is chopped before the
 * steps stop reading as steps, which is a property of the FAKE rather than
 * anything about the composition, and the author has no reason to drag one. The
 * fillet gets most of them because it is the part that curves; the wall is a
 * straight prism and needs only enough slices that its own side does not show
 * daylight.
 */
const FILLET = 16;
const WALL = 8;

/** The class the slices carry, so a reader of the DOM — and the sheet, which
 *  counts them under each picture — can see what they are. Not a Token-bearing
 *  name: nothing styles it. */
const SLICE = 'eater-map__slice';

/** The Token, as a length on the plane, closed up to nothing where the Section has
 *  collapsed. Written out rather than held in a variable, because these are CSS
 *  expressions the browser re-evaluates — nothing here is computed once at mount,
 *  which is what lets a Token dragged in the Editor and a window carried across
 *  the breakpoint both move the drawing.
 *
 *  `min()` IS THE CONSTRAINT tokens.css STATES, MADE REAL. An edge cannot be
 *  rounder than it is deep, and without this the wall's depth —
 *  `ROUND + (DEPTH - ROUND) * along` — goes NEGATIVE for a radius dragged past
 *  the thickness, so the eight wall slices stand in FRONT of the fillet's
 *  deepest ring and paint a solid ring of edge colour over the map. `stage-webgl.ts`
 *  clamps the same pair in `Slab.write`, and one boundary answering a Token two
 *  ways is the confound #182's sheet exists to remove.
 *
 *  AND `--eater-map-solid` CARRIES A FALLBACK for the same reason: the WebGL stage
 *  reads a value it cannot parse as 1, and a `var()` with no fallback here would
 *  make every slice's `inset`, `border-radius` and `transform` invalid at
 *  computed-value time — no edge at all, against the other stage's full depth. */
const SOLID = 'var(--eater-map-solid, 1)';
const DEPTH = `${SOLID} * var(--eater-map-slab-thickness) * 100cqw`;
const ROUND =
  `${SOLID} * min(var(--eater-map-slab-edge-radius), var(--eater-map-slab-thickness)) * 100cqw`;

const mountDomStage = (parts: StageParts): Stage => {
  const { plane, still, edge } = parts;

  if (edge === 'thick') {
    // The picture is CLIPPED back to the flat face rather than scaled into it.
    // Scaling would draw the map at a size the Cards are not drawn at, which is
    // the one thing this Section is built against — NOTES.md's one piece of
    // arithmetic. Clipped, every pixel stays where it was and the band the fillet
    // occupies is simply given up, which is exactly what the extrusion does with
    // it.
    still.style.clipPath = `inset(calc(${ROUND}))`;

    /** One slice: how far in from the Slab's own outline it stands, how round it
     *  is there, how far back, and how lit. */
    const slice = (inset: string, radius: string, back: string, shade: number) => {
      const sheet = document.createElement('div');
      sheet.className = SLICE;
      sheet.setAttribute('aria-hidden', 'true');
      sheet.style.cssText = [
        'position:absolute',
        `inset:calc(${inset})`,
        'pointer-events:none',
        `border-radius:calc(${radius})`,
        // Mixed towards black rather than filtered: a `filter` would put the
        // element in its own rendering context inside a `preserve-3d` parent, and
        // one grouping property on the wrong element is how this whole Section
        // loses its third dimension without an error (NOTES.md).
        `background:color-mix(in srgb, var(--eater-map-slab-edge), #000 ${
          Math.round((1 - shade) * 1000) / 10
        }%)`,
        `transform:translateZ(calc(-1 * (${back})))`,
      ].join(';');
      // BEFORE THE PICTURE, and not appended after it. With `preserve-3d` two
      // elements at the same depth are painted in document order, and the first
      // slice of the fillet stands at the flat face's own depth — appended, it
      // paints a solid rectangle over the map. Ordered this way the picture wins
      // every tie, which is the right answer for all of them.
      plane.insertBefore(sheet, still);
    };

    // THE FILLET, as the sections of a quarter-round. At angle 0 the section is
    // the flat face's own edge; at a right angle it is the Slab's outline, a full
    // radius back. Both the inset and the corner follow from that one angle, so
    // the slices are the solid's own cross-sections rather than a chamfer that
    // looks like one.
    // FROM ONE AND NOT FROM ZERO. The slice at angle zero is the flat face's own
    // edge — a ring of no width, at the picture's own depth — so it draws nothing
    // and can only get in the picture's way.
    for (let step = 1; step <= FILLET; step += 1) {
      const angle = (Math.PI / 2) * (step / FILLET);
      const out = Math.sin(angle);
      slice(
        `(${ROUND}) * ${1 - out}`,
        `(${ROUND}) * ${out}`,
        `(${ROUND}) * ${1 - Math.cos(angle)}`,
        // A NORMAL WITH NO LATERAL COMPONENT, which is the fake showing and is
        // left showing. The section's true normal points outwards as well as
        // forwards, but a slice is one element with one background, so it cannot
        // be brighter on the side facing the light. What reaches it is the depth
        // component alone: the fillet is lit as though the light stood straight
        // in front of the page.
        edgeShade(0, 0, Math.cos(angle)),
      );
    }
    // THE WALL: straight from the fillet's foot to the back of the Slab, at the
    // outline the whole way. Fewer slices, because nothing about it curves — they
    // are here so that the side of the stack does not show daylight when the
    // swing turns an edge towards the reader.
    for (let step = 1; step <= WALL; step += 1) {
      const along = step / WALL;
      slice(
        '0px',
        `(${ROUND})`,
        `(${ROUND}) + ((${DEPTH}) - (${ROUND})) * ${along}`,
        edgeShade(0, 0, 0),
      );
    }
  }

  return { name: 'dom', edge };
};

export default mountDomStage;
