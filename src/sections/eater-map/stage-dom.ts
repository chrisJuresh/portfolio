import { clearEdge, extrude, SOLID } from './edge';
import { SLAB } from './slab';
import { type Stage, type StageParts } from './stage';

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
 * THE SLICE STACK ITSELF IS `edge.ts`'s NOW (#190), and this file is a thin
 * caller. It used to be here, and it moved for one reason: the CARDS are given
 * thickness by the same arithmetic and the Cards are not a stage's — they ride
 * the CSS plane whichever renderer draws the Slab, so their edge would have had
 * to be either a second copy or an import out of one of two implementations.
 * `edge.ts` carries the reasoning that used to be at the top of this file: why a
 * slice is a full perimeter, why four hinged walls leave the corners open, where
 * a slice's one background stops, and why every length is a CSS expression.
 *
 * WHAT IS STILL THIS MODULE'S is the SLAB: which Tokens the solid is made of, and
 * that the picture is clipped back to the flat face rather than scaled into it.
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
 * Both are written in `cqw` for the reason everything else on the plane is — the
 * slices are children of `.eater-map__plane`, which is inside
 * `.eater-map__slab`, which is the container, so a share of the Slab holds at
 * every window. And that plane carries no `scale()`, which is why the Slab hands
 * `edge.ts` the SAME expression for its fillet across the face and along Z; a
 * Card does not, and `Solid.filletBack` is where that is written down.
 */

/** The Token, as a length on the plane, closed up to nothing where the Section has
 *  collapsed. Written out rather than held in a variable, because these are CSS
 *  expressions the browser re-evaluates — nothing here is computed once at mount,
 *  which is what lets a Token dragged in the Editor and a window carried across
 *  the breakpoint both move the drawing.
 *
 *  `min()` IS THE CONSTRAINT tokens.css STATES, MADE REAL — AND IT IS ON THE
 *  FILLET, which is #200. An edge cannot be rounder than it is deep, and without
 *  this the wall's depth — `FILLET + (DEPTH - FILLET) * along` — goes NEGATIVE for
 *  a fillet dragged past the thickness, so the eight wall slices stand in FRONT of
 *  the fillet's deepest ring and paint a solid ring of edge colour over the map.
 *  `stage-webgl.ts` clamps the same pair in `Slab.write`, and one boundary
 *  answering a Token two ways is the confound #182's sheet exists to remove.
 *
 *  THE PLAN CORNER IS NOT CLAMPED AND MUST NOT BE. It was, and the two were one
 *  Token, and the consequence was not merely a square-looking object: the slices
 *  are cut to `PLAN - inset` and the fillet's insets reach the fillet, so with the
 *  two equal the innermost ring's corner came out at zero. The roll went square
 *  precisely at the corners and the shading broke there in one step — the "wrapped
 *  around" bead. tokens.css carries the arithmetic.
 *
 *  `SOLID` is `edge.ts`'s, because both callers of the slice stack close up the
 *  same way below the band and one spelling is the point of it being there. */
const DEPTH = `${SOLID} * var(--eater-map-slab-thickness) * 100cqw`;
const PLAN = `${SOLID} * var(--eater-map-slab-edge-radius) * 100cqw`;
const FILLET =
  `${SOLID} * min(var(--eater-map-slab-fillet), var(--eater-map-slab-thickness)) * 100cqw`;

const mountDomStage = (parts: StageParts): Stage => {
  const { root, plane, still, edge } = parts;

  // `flat` IS THE ONE THIS STAGE HAS NOTHING TO DRAW FOR — a picture with no
  // thickness is the markup on its own. `thick` and `wrapped` are the same solid
  // and differ only in what the fillet is painted from (#182's third column, and
  // no longer WebGL's alone).
  if (edge === 'flat') return { name: 'dom', edge };

  /**
   * The whole of the Slab's solidity, as something that can be run TWICE — a mount
   * and a redraw are the same call (#196, `redraw.ts`).
   *
   * EVERYTHING IT READS IS READ HERE rather than closed over: a `SLAB_ROUND`
   * computed once outside would draw the gradient from the radius the page loaded
   * with, whatever the Token now holds.
   */
  const draw = (): void => {
    /** The edge's radius as a length on the PLAN, held to the thickness the way
     *  `ROUND` holds it in CSS — one constraint, stated twice because one of the two
     *  has to be an expression the browser re-evaluates and the other has to be a
     *  number the gradient can be built from. */
    const style = getComputedStyle(root);
    const token = (name: string) => {
      const value = Number.parseFloat(style.getPropertyValue(name));
      return Number.isFinite(value) ? value : 0;
    };
    const SLAB_PLAN = SLAB.viewport.width * Math.max(0, token('--eater-map-slab-edge-radius'));
    const SLAB_FILLET =
      SLAB.viewport.width *
      Math.max(
        0,
        Math.min(token('--eater-map-slab-fillet'), token('--eater-map-slab-thickness')),
      );

    clearEdge(plane);

    // The picture is CLIPPED back to the flat face rather than scaled into it.
    // Scaling would draw the map at a size the Cards are not drawn at, which is
    // the one thing this Section is built against — NOTES.md's one piece of
    // arithmetic. Clipped, every pixel stays where it was and the band the fillet
    // occupies is simply given up, which is exactly what the extrusion does with
    // it.
    //
    // AND THE CLIP IS ROUNDED, which it did not have to be while one Token was
    // both numbers. It is inset by the FILLET — that is the band given up — and
    // cut to `PLAN - FILLET`, which is exactly the innermost fillet ring's own
    // corner, so the picture meets the roll along its whole length. Inset by the
    // fillet and left SQUARE, the picture's corners would stand outside the
    // Slab's rounded outline and the object would have four square corners of map
    // hanging off a rounded solid. At FILLET == PLAN the radius is zero and this
    // is the plain `inset()` it used to be.
    still.style.clipPath = `inset(calc(${FILLET}) round calc(${PLAN} - (${FILLET})))`;

    // TWO NUMBERS NOW, AND THE `radii` ARE THE PLAN ONE (#200). Every slice is cut
    // to `PLAN - its own inset` by `edge.ts`, and the fillet's insets run out to
    // FILLET — so the plan corner is what the outline is and the fillet is only
    // how far the face rolls into it. A Card's pair has always been separate, for
    // the same reason: a pill's plan corner is 24px and its edge is 4px deep.
    extrude(plane, still, {
      box: { x: '0px', y: '0px', w: '100%', h: '100%' },
      radii: [PLAN, PLAN, PLAN, PLAN],
      // THE SAME OUTLINE AS ARITHMETIC, for the shading, in the PHONE'S OWN PIXELS
      // — the coordinate system the app drew in, which is what `slab.ts` says
      // `viewport` is for. Any unit would do, because the gradient is exactly
      // scale-invariant (`edge.ts`); this is the one the shape was verified in, and
      // `--eater-map-slab-ratio` is written from `pixels`, which is `viewport` times
      // the capture's scale factor and therefore the same ratio. So the outline the
      // gradient walks and the box the browser lays out cannot disagree.
      //
      // `--eater-map-solid` IS NOT A TERM OF IT. Below the band the slices close up
      // to nothing and the picture covers every one of them, so the gradient they
      // were given is not on screen to be wrong.
      plan: {
        w: SLAB.viewport.width,
        h: SLAB.viewport.height,
        radii: [SLAB_PLAN, SLAB_PLAN, SLAB_PLAN, SLAB_PLAN],
        fillet: SLAB_FILLET,
      },
      fillet: FILLET,
      filletBack: FILLET,
      depth: DEPTH,
      colour: 'var(--eater-map-slab-edge)',
      // THE PICTURE THE FILLET IS PAINTED FROM, on `wrapped` and on nothing else.
      // `currentSrc` and not `src`, because that is the URL the browser actually
      // chose and settled on — the one already decoded and in cache, so the roll
      // and the face are the same bytes rather than a second fetch that might
      // resolve differently. It is empty until the image has begun loading, which
      // is why `src` stands behind it: this Slab is `loading="lazy"` and a redraw
      // can land before the picture has.
      wrap: edge === 'wrapped' ? still.currentSrc || still.src : undefined,
      surface: 'slab',
    });
  };

  draw();
  return { name: 'dom', edge, redraw: draw };
};

export default mountDomStage;
