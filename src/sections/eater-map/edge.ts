import { edgeShade, lightingIn, type Shade } from './stage';

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
 * caller now. **#197 is why that mattered more than it looked**: the shading below
 * is the same shading for the Slab and for every glass surface of every Card,
 * because there is one light on the page and one function that runs it round a
 * perimeter. Two copies would have been two lightings on one drawing.
 *
 * EVERY SLICE IS LIT ROUND ITS OWN PERIMETER, WHICH IS #197. An element has one
 * `background` — and a `conic-gradient` VARIES a background around a box, which is
 * the one variation an edge needs. So a slice carries one stop per point of its own
 * perimeter, each mixed by the shade of the direction the edge faces there: flat
 * across each straight side, where the normal genuinely is constant, and a ramp
 * across each corner's angular range. `stage.ts` is where the light stands.
 *
 * WHERE IT STILL STOPS. A slice cannot carry the PICTURE: the captured pixels end
 * at the flat face and the edge is paint. That is the sheet's one empty cell, and
 * it does NOT decide #182 — the corner is closed and the edge has a direction, so
 * what is left to judge is whether a faceted fillet is distinguishable from a swept
 * one at the size the Slab is drawn.
 *
 * WHY THE SLICES ARE INLINE-STYLED. Astro scopes a component's `<style>` by
 * stamping an attribute on the elements ITS OWN TEMPLATE renders, and these are
 * built here, so no scoped selector can reach them — the same wall `cards.ts` hits
 * with the vendored markup, and the same answer. `:global()` is the escape hatch
 * and `check-source.mjs` fails the build on it.
 *
 * EVERY LENGTH IS A CSS EXPRESSION AND NOT A NUMBER, which is what lets a Token
 * dragged in the Editor and a window carried across the breakpoint both move the
 * drawing without anything being re-mounted. **The SHADING is the one thing that
 * is computed once**, and it can afford to be: the gradient is exactly
 * scale-invariant, so a window that changes an object's size cannot make it wrong.
 * What a mount does not survive is a dragged Token, and `redraw.ts` is the answer
 * to that — NOTES.md.
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
  /** the same outline as arithmetic, for the SHADING — see `Plan` for why it
   *  cannot be the same field and why its unit does not matter */
  readonly plan: Plan;
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
  /**
   * The picture the fillet's rings are drawn from instead of the edge colour, as a
   * URL — the `wrapped` edge, and undefined for `thick`.
   *
   * THE ONLY DIFFERENCE BETWEEN THE TWO, exactly as it is in `stage-webgl.ts`'s
   * `faces()`: the geometry is identical and the WALL is the edge colour either
   * way. A phone's screen curls over its own shoulder and its SIDE is still
   * aluminium, so what wraps is the fillet and nothing else.
   *
   * AND IT IS UNSHADED, which is a match rather than an omission. The WebGL stage
   * draws its wrapped fillet with a `MeshBasicMaterial` carrying the texture and no
   * vertex colours at all, so putting a shading overlay on this one would make the
   * two stages draw different objects from the same Token — the confound #182's
   * sheet exists to remove. A curved screen does not darken as it turns, either.
   */
  readonly wrap?: string;
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

/**
 * Take one host's slices back off, which is what makes a redraw land on the DOM it
 * started from.
 *
 * PER HOST AND NEVER PER BOX — a Card with two glass surfaces has two stacks under
 * one host, and NOTES.md carries what a clear written per box costs.
 */
export function clearEdge(host: HTMLElement): void {
  for (const stale of host.querySelectorAll(`:scope > .${SLICE}`)) stale.remove();
}

/** Degrees to radians. */
const RAD = Math.PI / 180;

/**
 * How many points a corner's quarter-turn is cut into for the SHADING.
 *
 * A count, for the same reason `FILLET` and `WALL` are: it is how finely the sweep
 * is chopped before the steps stop reading as steps. Five interior points, because
 * the two ends of the arc are already pushed as the straight sides' own endpoints.
 */
const ARC = 6;

/**
 * Under this, in the plan's own unit, a corner is ONE HARD STOP rather than a
 * sweep.
 *
 * A square corner is two coincident points carrying two different normals, which
 * is a hard transition in a conic gradient and is the right drawing: there is no
 * arc to run a ramp along. That is not hypothetical here — the details sheet's plan
 * corner is `28px 28px 0 0`, so two of its four corners take this branch and two do
 * not.
 */
const SQUARE = 0.5;

/**
 * The face's outline as NUMBERS, in ANY ONE UNIT, for the shading and nothing else.
 *
 * WHY A SECOND STATEMENT OF A SHAPE THE `box` ABOVE ALREADY GIVES. That one is CSS
 * expressions, which is what makes the drawing follow a Token and a window without
 * being re-mounted; a gradient's stops are angles and have to be arithmetic. The
 * two cannot be one field.
 *
 * AND IT COSTS NOTHING TO BE APPROXIMATE ABOUT THE UNIT, because the gradient is
 * EXACTLY scale-invariant: every stop's angle is `atan2` of a point whose
 * coordinates all scale together, so what this fixes is the ASPECT and the radii as
 * proportions of it. The Slab states its plan in the phone's own pixels and a Card
 * states its in the app's, and neither has to be the unit anything is drawn in.
 * Verified at the three widths the Slab is drawn at — 220, 380 and 478 — which
 * produce ONE gradient string and not three; measured off `getBoundingClientRect`
 * and rounded to whole pixels instead, the aspect drifts and the worst stop moves
 * 0.0627deg.
 */
export interface Plan {
  readonly w: number;
  readonly h: number;
  /** the face's four plan corners, already clamped by `fitRadii` */
  readonly radii: Corners;
  /** how far the fillet rolls in across the face, in the same unit */
  readonly fillet: number;
}

/** One point of a perimeter: the conic angle it sits at, in degrees clockwise from
 *  straight up, and the outward direction of the outline there. */
interface Facet {
  readonly at: number;
  readonly nx: number;
  readonly ny: number;
}

/**
 * The perimeter of a rounded rectangle, as points carrying their outward normal,
 * sorted by the conic angle each one sits at.
 *
 * `atan2(x, -y)` IS THE CONIC ANGLE. A `conic-gradient` starts straight up and
 * turns clockwise, and CSS's y points down — so the point at the top of the box is
 * at 0deg and the point at its right is at 90deg, which is what that argument order
 * says. The sort is what closes the loop: the top side's left endpoint comes out
 * just under 360deg and lands at the end.
 */
function perimeter(w: number, h: number, radii: Corners): Facet[] {
  const [tl, tr, br, bl] = radii;
  const hw = w / 2;
  const hh = h / 2;
  const out: Facet[] = [];
  const push = (x: number, y: number, nx: number, ny: number) =>
    out.push({ at: (Math.atan2(x, -y) / RAD + 360) % 360, nx, ny });
  /** A corner's quarter-turn, from `t0` degrees, about a centre a radius in from
   *  both of its sides. The outward direction on an arc is the arc's own angle,
   *  which is what makes the shape and the shading fall out of one parameter. */
  const arc = (cx: number, cy: number, t0: number, r: number) => {
    if (r < SQUARE) return;
    for (let step = 1; step < ARC; step += 1) {
      const t = (t0 + 90 * (step / ARC)) * RAD;
      push(cx + r * Math.cos(t), cy + r * Math.sin(t), Math.cos(t), Math.sin(t));
    }
  };
  push(-hw + tl, -hh, 0, -1);
  push(hw - tr, -hh, 0, -1);
  arc(hw - tr, -hh + tr, -90, tr);
  push(hw, -hh + tr, 1, 0);
  push(hw, hh - br, 1, 0);
  arc(hw - br, hh - br, 0, br);
  push(hw - br, hh, 0, 1);
  push(-hw + bl, hh, 0, 1);
  arc(-hw + bl, hh - bl, 90, bl);
  push(-hw, hh - bl, -1, 0);
  push(-hw, -hh + tl, -1, 0);
  arc(-hw + tl, -hh + tl, 180, tl);
  // STABLE, AND THAT IS LOAD-BEARING FOR A SQUARE CORNER. Two coincident points sit
  // at the same angle there, and the one pushed first is the one on the side walked
  // first — so a stable sort is what keeps the hard transition pointing the way
  // round the box goes. Array.prototype.sort has been stable since ES2019.
  return out.sort((one, two) => one.at - two.at);
}

/**
 * One slice's background: a `conic-gradient` of that slice's own perimeter, each
 * stop painted by the direction the edge faces there.
 *
 * `nz` IS THE SLICE'S OWN COMPONENT OUT OF THE FACE — `cos(angle)` for a section of
 * the fillet, 0 for the wall — and the lateral part of the normal is whatever is
 * left of a unit vector, which is what makes the fillet roll from facing the reader
 * to facing sideways rather than jumping.
 *
 * THE COLOUR IS NEVER RESOLVED HERE. `colour` arrives as a CSS expression and
 * leaves inside a `color-mix()`, so `var(--eater-map-slab-edge)` survives into every
 * stop and the Editor's drag of that Token still moves the drawing. `color-mix()` is
 * valid wherever a colour is, gradient stops included — and it stays a `color-mix`
 * rather than a `filter` for the reason `slice` gives below.
 *
 * THE LOOP IS CLOSED AT 360deg with the first stop's own colour, because a conic
 * gradient does not wrap: without it the arc from the last stop round to the first
 * is interpolated against nothing and the top of the box is a seam.
 */
function conicEdge(
  w: number,
  h: number,
  radii: Corners,
  nz: number,
  colour: string,
  shade: Shade,
): string {
  const lateral = Math.sqrt(Math.max(0, 1 - nz * nz));
  const mix = (point: Facet) =>
    `color-mix(in srgb, ${colour}, #000 ${
      Math.round((1 - shade(point.nx * lateral, point.ny * lateral, nz)) * 1000) / 10
    }%)`;
  const points = perimeter(w, h, radii);
  const first = points[0];
  // A slice with no width or no height has no perimeter to walk, and a gradient
  // with no stops is an invalid declaration — which paints NOTHING and reads as an
  // edge that was never built. One flat colour is the honest answer.
  if (!first) return `color-mix(in srgb, ${colour}, #000 ${Math.round((1 - shade(0, 0, nz)) * 1000) / 10}%)`;
  const stops = points.map((point) => `${mix(point)} ${point.at.toFixed(2)}deg`);
  stops.push(`${mix(first)} 360deg`);
  return `conic-gradient(${stops.join(',')})`;
}

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
  const { box, radii, plan, colour, surface } = solid;

  // ONE LIGHT, READ OFF THE HOST ITSELF (#197). Not a field of `Solid` and not a
  // parameter: every caller is inside `.eater-map`, the light and the attitude are
  // custom properties and custom properties inherit, so asking the host is asking
  // the Section — and there is then no way for two callers to be handed two
  // lights. The plane's attitude is read with it, because the light stands on the
  // PAGE and a local normal has to be carried into screen space before it is
  // dotted. Zero is the honest reading of a missing attitude; `stage.ts` says why
  // the light's own fallbacks are not zero.
  const style = getComputedStyle(host);
  const angle = (name: string) => {
    const value = Number.parseFloat(style.getPropertyValue(name));
    return Number.isFinite(value) ? value : 0;
  };
  const shade: Shade = edgeShade(
    { tilt: angle('--eater-map-tilt'), swing: angle('--eater-map-swing') },
    lightingIn(style),
  );

  /** One slice: how far in from the face's own outline it stands, and how far
   *  back. Its corners follow from the inset — a section taken `i` in from the
   *  outline is rounded by `r - i`, which is the same rule for a uniform radius
   *  and for the details sheet's 28 / 28 / 0 / 0.
   *
   *  `inset` ARRIVES TWICE, as the CSS expression the box is built from and as the
   *  same distance in the plan's own unit. The first draws the slice and follows
   *  every Token; the second is what the gradient's angles are arithmetic on. */
  /**
   * The picture, scaled so that ITS contour at plan inset `u` lands on the edge of a
   * slice standing at plan inset `a` — which is what makes the captured pixels run
   * off the front, round the roll, and stop where the object does.
   *
   * TWO PERCENTAGES AND `center`, AND THE CENTRING IS THE WHOLE TRICK. A slice's box
   * is the face's box inset by `a` on all four sides and the picture covers the
   * face, so the two rectangles are CONCENTRIC — the mapping is therefore a pure
   * scale about their shared centre, and the offset `background-position` would
   * otherwise have to carry works out to exactly 50%. Only the size is left, and a
   * `background-size` percentage resolves against the slice's own box, so both
   * factors are pure numbers: `1 / (1 - 2u/W)` across and `1 / (1 - 2u/H)` down.
   *
   * `u` is the same texture inset `stage-webgl.ts` walks — `roll(1 - 2phi/pi)`, the
   * band of pixels spread evenly along the arc — so the two stages read the same
   * pixels onto the same ring. At the last ring `u` is 0 and this is the picture at
   * its own size, meeting the object's silhouette; at the first it is the fillet,
   * meeting the face where `stage-dom.ts` clipped it back to.
   *
   * NO SHADING, AND NO `--eater-map-solid` EITHER. Both are `Solid.wrap`'s comment.
   * The collapse closes every box to the face's own and puts the picture over all of
   * them, so a ring given a size it is not on screen to use cannot be wrong.
   */
  const wrapped = (u: number): string => {
    const across = 1 - (2 * u) / plan.w;
    const down = 1 - (2 * u) / plan.h;
    // A ring cannot be given a picture scaled through infinity, which is what a
    // fillet at half the plan would ask for. Unreachable while the thickness clamps
    // it — 0.03 of the width against 0.5 — so this is the honest degenerate answer
    // rather than a case with a look of its own.
    const size =
      across > 0 && down > 0 ? `${figure(100 / across)}% ${figure(100 / down)}%` : '100% 100%';
    return `url("${solid.wrap}") center / ${size} no-repeat`;
  };

  const slice = (
    part: 'fillet' | 'wall',
    inset: string,
    apart: number,
    back: string,
    nz: number,
    /** the TEXTURE inset for a wrapped fillet ring, in the plan's own unit. Not the
     *  same number as `apart`, which is where the ring physically stands: the
     *  geometry follows `sin` and the pixels are spread evenly along the arc, and
     *  the two only agree at the ends. */
    texture?: number,
  ) => {
    const sheet = document.createElement('div');
    sheet.className = SLICE;
    sheet.setAttribute('aria-hidden', 'true');
    // WHICH PART OF THE SOLID THIS IS, so a Check can find the WALL without
    // counting elements in document order. The wall is where the whole normal is
    // lateral, so its gradient carries the four sides at their full difference and
    // it is the one slice worth reading to ask whether the edge has a direction.
    sheet.dataset.eaterMapSlice = part;
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
      //
      // ...OR THE PICTURE, on a wrapped fillet ring and on nothing else. The wall
      // keeps its gradient either way, which is `Solid.wrap`'s own comment.
      part === 'fillet' && solid.wrap !== undefined && texture !== undefined
        ? `background:${wrapped(texture)}`
        : `background:${conicEdge(
        plan.w - 2 * apart,
        plan.h - 2 * apart,
        // The same rule the `corner` above writes, in the plan's own unit — so the
        // outline the gradient walks and the outline `border-radius` draws are one
        // shape, and the shading is not rotated against the edge it is shading.
        [
          Math.max(0, plan.radii[0] - apart),
          Math.max(0, plan.radii[1] - apart),
          Math.max(0, plan.radii[2] - apart),
          Math.max(0, plan.radii[3] - apart),
        ],
        nz,
        colour,
        shade,
      )}`,
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
    const turn = (Math.PI / 2) * (step / FILLET);
    slice(
      'fillet',
      `(${solid.fillet}) * ${figure(1 - Math.sin(turn))}`,
      plan.fillet * (1 - Math.sin(turn)),
      `(${solid.filletBack}) * ${figure(1 - Math.cos(turn))}`,
      // THE DEPTH COMPONENT OF THE SECTION'S TRUE NORMAL, and `conicEdge` supplies
      // the lateral part from whatever is left of a unit vector. At the first step
      // the section almost faces the reader and its edge is almost one colour; at
      // the last it is the object's silhouette and its edge is lit entirely from
      // the side.
      Math.cos(turn),
      // WHERE THIS RING READS THE PICTURE, which is `stage-webgl.ts`'s
      // `roll(1 - 2phi/pi)` said in this loop's own counter — the band of pixels
      // spread EVENLY along the arc, against a geometry that follows `sin`. Ignored
      // unless the caller asked for a wrapped edge.
      plan.fillet * (1 - step / FILLET),
    );
  }
  // THE WALL: straight from the fillet's foot to the back of the solid, at the
  // outline the whole way. Fewer slices, because nothing about it curves — they are
  // here so that the side of the stack does not show daylight when the swing turns
  // an edge towards the reader.
  for (let step = 1; step <= WALL; step += 1) {
    const along = step / WALL;
    slice(
      'wall',
      '0px',
      0,
      `(${solid.filletBack}) + ((${solid.depth}) - (${solid.filletBack})) * ${figure(along)}`,
      0,
    );
  }
}
