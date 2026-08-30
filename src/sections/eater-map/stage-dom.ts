import { EDGE_AMBIENT, EDGE_LIGHT, type Stage, type StageParts } from './stage';

/**
 * The DOM stage: the shipped Exploded View, and the one the markup already reads
 * as.
 *
 * FLAT IS THIS MODULE DOING NOTHING, and that is the point rather than an
 * omission. The camera, the rotation, the Cards' depths and the picture itself
 * are all in `EaterMap.astro`'s scoped stylesheet, spent by `--eater-map-lift`,
 * so a reader whose scripts never arrived has the whole composition and this
 * module is bytes they were never sent. What is here is the ONE thing the shipped
 * composition does not draw and #181 asks for a comparison of: a Slab with
 * thickness.
 *
 * AND IT IS A FAKE, WHICH IS THE FINDING. DOM has no extrusion. What it has is
 * elements at depths — so the Slab is SLICED, and each slice is one flat element
 * standing where that slice of the solid would stand. The slices are the real
 * solid's own: a quarter-round fillet rolling from the front face to the side
 * wall, then the wall itself, each slice inset and rounded by exactly as much as
 * the section at its depth is. Enough of them and the steps close up.
 *
 * This is DOM's BEST attempt and not a straw man, and the sheet is worth nothing
 * if it is not: the comparison is only interesting where the two stages are both
 * trying. So the picture is clipped back to the flat face the way the extrusion
 * clips it, the fillet is a real quarter-round rather than a chamfer, and the
 * slices are shaded down their depth.
 *
 * WHERE IT STOPS IS EXACTLY WHERE #181 SAYS IT STOPS. Every slice is ONE COLOUR
 * ALL THE WAY ROUND, because a slice is one element and an element has one
 * background — so the fillet cannot be lit from a direction, and it cannot carry
 * the picture. Six faces would not help and neither would six hundred slices:
 * the captured pixels stop at the flat face and the edge is paint. `wrapped` is
 * not in this stage's list of edges for that reason, and the empty cell on the
 * sheet is the result.
 *
 * WHY THE SLICES ARE INLINE-STYLED. Astro scopes a component's `<style>` by
 * stamping an attribute on the elements ITS OWN TEMPLATE renders, and these are
 * built here, so no scoped selector can reach them — the same wall `cards.ts`
 * hits with the vendored markup, and the same answer. `:global()` is the escape
 * hatch and `check-source.mjs` fails the build on it.
 *
 * EVERY LENGTH BELOW IS SPENT BY THE LIFT, so the flat frame is untouched: at
 * progress 0 the thickness is 0, the fillet is 0, the clip is `inset(0)` and the
 * composition is the screenshot #176 built, to the pixel. And every one is
 * written in `cqw` for the reason everything else on the plane is — these are
 * children of `.eater-map__slab`, which is the container, so a share of the Slab
 * holds at every window.
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

/** The Lift's playhead times the Token, as a length on the plane. Written out
 *  rather than held in a variable, because these are CSS expressions the browser
 *  re-evaluates as the Lift runs — nothing here is computed once at mount. */
const DEPTH = 'var(--eater-map-lift) * var(--eater-map-slab-thickness) * 100cqw';
const ROUND = 'var(--eater-map-lift) * var(--eater-map-slab-edge-radius) * 100cqw';

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
        // ONLY THE LIGHT'S DEPTH COMPONENT REACHES THIS. A slice is one element
        // with one background, so it cannot be brighter on the side facing the
        // light — the fillet is lit as though the light stood straight in front.
        // That is the fake showing, and it is left showing.
        EDGE_AMBIENT + (1 - EDGE_AMBIENT) * Math.max(0, Math.cos(angle) * EDGE_LIGHT[2]),
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
        EDGE_AMBIENT,
      );
    }
  }

  return { name: 'dom', edge };
};

export default mountDomStage;
