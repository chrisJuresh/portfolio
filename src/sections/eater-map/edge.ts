import { edgeShade } from './stage';

/**
 * The **slice stack**: how anything on this plane is given thickness.
 *
 * A solid is drawn as a run of flat elements at depths, each standing where that
 * cross-section of the object stands — a quarter-round fillet rolling from the
 * front face to the side wall, then the wall itself, each inset and rounded by
 * exactly as much as the section at its depth is. Enough of them and the steps
 * close up.
 *
 * FOUR HINGED WALLS WAS THE OBVIOUS BUILD AND IT IS WRONG, which is worth having
 * written down because #189 was specified that way before it was corrected. A wall
 * hinged along one edge of a rounded rectangle has to be inset by the corner radius
 * at BOTH ends, so four of them leave four empty notches — 17.1 x 11.4px on a 380px
 * Slab, which is the author's "the corners are missing". A slice is a FULL
 * PERIMETER: its corners are the same element as its sides, so there is nothing to
 * leave out.
 *
 * WHY THIS IS ITS OWN MODULE AND NOT `stage-dom.ts`'s, WHICH IS WHERE IT WAS
 * (#190). The Slab is a stage's — `stage.ts` is the boundary and `stage-webgl.ts`
 * extrudes the same solid its own way. **The CARDS are nobody's stage**: they are
 * the Eater app's own markup and ride the CSS plane whichever renderer draws the
 * Slab (NOTES.md), so their edge has to be drawn by DOM at every window and under
 * both stages. A copy of this arithmetic living in a stage would be one boundary
 * answering a Token two ways, which is the confound #182's sheet exists to remove.
 * So it moved out to where both callers can reach it, and `stage-dom.ts` is a thin
 * caller now. Giving each slice a DIRECTION is #197, and is the one line below that
 * paints.
 *
 * WHERE IT STOPS. Every slice is ONE COLOUR ALL THE WAY ROUND, because a slice is
 * one element and an element has one background — so the fillet cannot be lit from
 * a direction, and it cannot carry the picture. Six faces would not help and
 * neither would six hundred slices.
 *
 * WHY THE SLICES ARE INLINE-STYLED. Astro scopes a component's `<style>` by
 * stamping an attribute on the elements ITS OWN TEMPLATE renders, and these are
 * built here, so no scoped selector can reach them — the same wall `cards.ts` hits
 * with the vendored markup, and the same answer. `:global()` is the escape hatch
 * and `check-source.mjs` fails the build on it.
 *
 * EVERY LENGTH IS A CSS EXPRESSION AND NOT A NUMBER, which is what lets a Token
 * dragged in the Editor and a window carried across the breakpoint both move the
 * drawing without anything being re-mounted. Nothing here is computed once.
 */

/** Four corner radii, top-left clockwise, as bare CSS length expressions. */
export type Radii = readonly [string, string, string, string];

/** The same four, in pixels, for a box whose size is already known. */
export type Corners = readonly [number, number, number, number];

/**
 * Is there a solid here at all? 1 in the band, 0 where the Section has collapsed
 * to a flat full-bleed picture with the four features under it (#179).
 *
 * ONE SPELLING FOR BOTH CALLERS, and it carries a FALLBACK for a reason: the WebGL
 * stage reads a value it cannot parse as 1, and a `var()` with no fallback would
 * make every slice's `left`, `border-radius` and `transform` invalid at
 * computed-value time — no edge at all, against the other stage's full depth.
 */
export const SOLID = 'var(--eater-map-solid, 1)';

/**
 * One extruded solid, as the CSS expressions its slices are built from.
 *
 * Every field is a BARE expression — `0.03 * 100cqw`, not `calc(0.03 * 100cqw)` —
 * because they are composed with each other before they are wrapped. That is the
 * convention `stage-dom.ts` already wrote its two lengths in.
 */
export interface Solid {
  /** the flat face's own box inside the host, in the HOST'S layout units */
  readonly box: {
    readonly x: string;
    readonly y: string;
    readonly w: string;
    readonly h: string;
  };
  /** the face's four plan corner radii, already clamped to the box */
  readonly radii: Radii;
  /** how far the fillet rolls IN ACROSS THE FACE, in the host's layout units */
  readonly fillet: string;
  /**
   * The same distance ALONG Z — and it is a second expression rather than the
   * same one, which is the trap this interface exists to make impossible to fall
   * into.
   *
   * `scale(s)` IS `scale3d(s, s, 1)`, so a host that scales its children does not
   * scale their DEPTH. The Slab's slices hang under `.eater-map__plane`, which
   * carries no scale, and its two expressions are identical. A Card's hang under
   * `.eater-map__card`, which is drawn at the app's own scale times the Card's
   * boost — so a `translateZ` written in the Card's units would draw an edge the
   * same number of plane pixels deep at every window while its face grew and
   * shrank, and the object would come apart. In the Card's units the two differ by
   * exactly that scale.
   */
  readonly filletBack: string;
  /** the whole depth, along Z, in the same units as `filletBack` */
  readonly depth: string;
  /** what the edge is painted from: any CSS colour */
  readonly colour: string;
  /**
   * Which glass surface this stack belongs to, written on every slice as
   * `data-eater-map-edge`.
   *
   * Not decoration: a Card with two glass surfaces has two stacks under one host,
   * and #197 carries a rebuild bug where the second stack's clear deletes the
   * first stack's slices. The surviving surface looks perfect, so the failure
   * reads as "the search bar has no edge" rather than as a broken rebuild — which
   * is why the `eater-map` Check asks whether EVERY surface carries slices rather
   * than whether any do, and why it needs a name to ask about.
   */
  readonly surface?: string;
}

/**
 * How many slices the fillet is cut into, and how many the wall behind it is.
 *
 * Counts and not Tokens: they are how finely the solid is chopped before the steps
 * stop reading as steps, which is a property of the FAKE rather than anything about
 * the composition, and the author has no reason to drag one. The fillet gets most
 * of them because it is the part that curves; the wall is a straight prism and
 * needs only enough slices that its own side does not show daylight.
 */
const FILLET = 16;
const WALL = 8;

/** The class the slices carry, so a reader of the DOM can see what they are. Not a
 *  Token-bearing name: nothing styles it. */
const SLICE = 'eater-map__slice';

/** Enough places that a fillet's steps do not round into each other, and few enough
 *  that a slice's `cssText` stays readable in devtools. */
function figure(n: number): string {
  return String(Math.round(n * 1e6) / 1e6);
}

/**
 * Four radii clamped so that no edge of the box is asked for more than it has.
 *
 * `border-radius: 999px` is what a pill states and `999px` is what
 * `getComputedStyle` hands back — the used value is the browser's own arithmetic
 * and there is no property to read it off. So a backdrop or an edge drawn to the
 * stated number is drawn to an outline the surface does not have, and this is that
 * arithmetic done here instead. CSS Backgrounds 3 §5.5: one factor, the smallest
 * over the four sides, applied to all eight radii together.
 */
export function fitRadii(w: number, h: number, radii: Corners): Corners {
  const [tl, tr, br, bl] = radii;
  let k = 1;
  const pair = (a: number, b: number, span: number) => {
    if (a + b > span && a + b > 0) k = Math.min(k, span / (a + b));
  };
  pair(tl, tr, w);
  pair(bl, br, w);
  pair(tl, bl, h);
  pair(tr, br, h);
  const fit = (v: number) => Math.max(0, v * k);
  return [fit(tl), fit(tr), fit(br), fit(bl)];
}

/**
 * Build one solid's slices into `host`, before `before` in the document.
 *
 * BEFORE THE FACE, and not appended after it. With `preserve-3d` two elements at
 * the same depth are painted in document order, and the first slice of the fillet
 * stands within a fraction of a pixel of the face's own depth — appended, it paints
 * a solid rectangle over the picture. Ordered this way the face wins every tie,
 * which is the right answer for all of them.
 */
export function extrude(host: HTMLElement, before: Node | null, solid: Solid): void {
  const { box, radii, colour, surface } = solid;

  /** One slice: how far in from the face's own outline it stands, and how far
   *  back. Its corners follow from the inset — a section taken `i` in from the
   *  outline is rounded by `r - i`, which is the same rule for a uniform radius
   *  and for the details sheet's 28 / 28 / 0 / 0. */
  const slice = (inset: string, back: string, shade: number) => {
    const sheet = document.createElement('div');
    sheet.className = SLICE;
    sheet.setAttribute('aria-hidden', 'true');
    if (surface !== undefined) sheet.dataset.eaterMapEdge = surface;
    const corner = radii.map((r) => `max(0px, (${r}) - (${inset}))`).join(' ');
    sheet.style.cssText = [
      'position:absolute',
      `left:calc((${box.x}) + (${inset}))`,
      `top:calc((${box.y}) + (${inset}))`,
      `width:calc((${box.w}) - 2 * (${inset}))`,
      `height:calc((${box.h}) - 2 * (${inset}))`,
      'pointer-events:none',
      `border-radius:${corner}`,
      // Mixed towards black rather than filtered: a `filter` would put the element
      // in its own rendering context inside a `preserve-3d` parent, and one
      // grouping property on the wrong element is how this whole Section loses its
      // third dimension without an error (NOTES.md).
      `background:color-mix(in srgb, ${colour}, #000 ${Math.round((1 - shade) * 1000) / 10}%)`,
      `transform:translateZ(calc(-1 * (${back})))`,
    ].join(';');
    host.insertBefore(sheet, before);
  };

  // THE FILLET, as the sections of a quarter-round. At angle 0 the section is the
  // flat face's own edge; at a right angle it is the object's outline, a full
  // fillet radius back. Both the inset and the corner follow from that one angle,
  // so the slices are the solid's own cross-sections rather than a chamfer that
  // looks like one.
  // FROM ONE AND NOT FROM ZERO. The slice at angle zero is the flat face's own edge
  // — a ring of no width, at the face's own depth — so it draws nothing and can
  // only get in the picture's way.
  for (let step = 1; step <= FILLET; step += 1) {
    const angle = (Math.PI / 2) * (step / FILLET);
    slice(
      `(${solid.fillet}) * ${figure(1 - Math.sin(angle))}`,
      `(${solid.filletBack}) * ${figure(1 - Math.cos(angle))}`,
      // A NORMAL WITH NO LATERAL COMPONENT, which is the fake showing and is left
      // showing. The section's true normal points outwards as well as forwards, but
      // a slice is one element with one background, so it cannot be brighter on the
      // side facing the light. What reaches it is the depth component alone: the
      // fillet is lit as though the light stood straight in front of the page.
      edgeShade(0, 0, Math.cos(angle)),
    );
  }
  // THE WALL: straight from the fillet's foot to the back of the solid, at the
  // outline the whole way. Fewer slices, because nothing about it curves — they are
  // here so that the side of the stack does not show daylight when the swing turns
  // an edge towards the reader.
  for (let step = 1; step <= WALL; step += 1) {
    const along = step / WALL;
    slice(
      '0px',
      `(${solid.filletBack}) + ((${solid.depth}) - (${solid.filletBack})) * ${figure(along)}`,
      edgeShade(0, 0, 0),
    );
  }
}
