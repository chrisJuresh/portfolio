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
 *  `min()` IS THE CONSTRAINT tokens.css STATES, MADE REAL. An edge cannot be
 *  rounder than it is deep, and without this the wall's depth —
 *  `ROUND + (DEPTH - ROUND) * along` — goes NEGATIVE for a radius dragged past
 *  the thickness, so the eight wall slices stand in FRONT of the fillet's
 *  deepest ring and paint a solid ring of edge colour over the map. `stage-webgl.ts`
 *  clamps the same pair in `Slab.write`, and one boundary answering a Token two
 *  ways is the confound #182's sheet exists to remove.
 *
 *  `SOLID` is `edge.ts`'s, because both callers of the slice stack close up the
 *  same way below the band and one spelling is the point of it being there. */
const DEPTH = `${SOLID} * var(--eater-map-slab-thickness) * 100cqw`;
const ROUND =
  `${SOLID} * min(var(--eater-map-slab-edge-radius), var(--eater-map-slab-thickness)) * 100cqw`;

const mountDomStage = (parts: StageParts): Stage => {
  const { root, plane, still, edge } = parts;

  if (edge !== 'thick') return { name: 'dom', edge };

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
    const SLAB_ROUND =
      SLAB.viewport.width *
      Math.max(
        0,
        Math.min(token('--eater-map-slab-edge-radius'), token('--eater-map-slab-thickness')),
      );

    clearEdge(plane);

    // The picture is CLIPPED back to the flat face rather than scaled into it.
    // Scaling would draw the map at a size the Cards are not drawn at, which is
    // the one thing this Section is built against — NOTES.md's one piece of
    // arithmetic. Clipped, every pixel stays where it was and the band the fillet
    // occupies is simply given up, which is exactly what the extrusion does with
    // it.
    still.style.clipPath = `inset(calc(${ROUND}))`;

    // THE SLAB'S PLAN CORNER IS THE FILLET RADIUS, and one `border-radius` per
    // slice is why: the DOM stage has one number for both, held to the thickness
    // by the `min()` above. A Card's two are separate, because a pill's plan
    // corner is 24px and its edge is 4px deep.
    extrude(plane, still, {
      box: { x: '0px', y: '0px', w: '100%', h: '100%' },
      radii: [ROUND, ROUND, ROUND, ROUND],
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
        radii: [SLAB_ROUND, SLAB_ROUND, SLAB_ROUND, SLAB_ROUND],
        fillet: SLAB_ROUND,
      },
      fillet: ROUND,
      filletBack: ROUND,
      depth: DEPTH,
      colour: 'var(--eater-map-slab-edge)',
      surface: 'slab',
    });
  };

  draw();
  return { name: 'dom', edge, redraw: draw };
};

export default mountDomStage;
