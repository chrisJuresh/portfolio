/**
 * The **stage**: the part of the Exploded View that reads the Tokens and draws
 * the Slab. One boundary, two implementations behind it (#177, #181).
 *
 * WHAT IS ON EITHER SIDE OF IT, because the split is not the obvious one. The
 * stage owns the SLAB — its size, its projection and its thickness. It does NOT
 * own the Cards. The Cards are the Eater app's own markup and have to
 * stay real, selectable, screen-readable text (#171, #176), so they ride the same
 * CSS plane under either stage and are positioned by the same three lines of
 * `EaterMap.astro`. A stage that drew them would be drawing a picture of them, and
 * the Section would have traded the whole point of the vendoring for a renderer.
 *
 * WHAT A STAGE MAY ASSUME, AND #189 NARROWED IT. Every term of the Slab — its
 * attitude, its depth, its radius — is a Token and a CONSTANT: `--eater-map-lift`
 * is the Cards' and the Cards are not a stage's, so nothing a stage draws is a
 * function of the playhead. What a stage does read beside the Tokens is
 * `--eater-map-solid`, which is 1 in the band and 0 where the Section has
 * collapsed. A stage never animates either way, which is what makes reduced motion
 * free: there is nothing to redraw.
 *
 * SELECTED AT RUNTIME AND NEVER AT BUILD TIME, which is what #181 needs to render
 * the two side by side out of one `dist/`. `?stage=webgl` on the URL, or
 * `data-eater-map-stage` on the document's root element for a tool that drives the
 * page rather than links to it. The WebGL implementation is behind a dynamic
 * import, so a reader who did not ask for it fetches none of it.
 *
 * THE DOM STAGE IS THE SHIPPED ONE and is the default in every case, including a
 * spelling nobody recognises: a query string is something a reader can be handed,
 * so an unknown one has to fall back to the composition rather than to a blank
 * box.
 */

/** Which renderer draws the Slab. */
export type StageName = 'dom' | 'webgl';

/**
 * What the Slab's edge is made of.
 *
 * `thick` IS THE SHIPPED COMPOSITION SINCE #189 — a Slab with a real depth,
 * three per cent of its own width, drawn at every window in the band. `flat` is a
 * picture with no thickness at all: it was the default while the edge was a
 * comparison nothing shipped, and what it is now is the collapsed composition
 * below the band, reached through `--eater-map-solid` rather than through this
 * name. `wrapped` is the captured pixels continuing over the rounded edge, and it
 * is #181's third column.
 *
 * **`wrapped` IS THE SHIPPED COMPOSITION SINCE #204**, which is what this default
 * now says. The author asked for the map to wrap slightly round the edge rather
 * than the edge wrapping round the map — a phone with a curved screen, all the way
 * round — and that is this name. `thick` is still what the sheet compares against
 * and still what a Card's glass is drawn as; only the Slab's fillet changed.
 *
 * **AND DOM REACHES IT NOW, WHICH RETIRES THE LAST OF AN ARGUMENT #189 ALREADY
 * HALVED.** The empty cell was read as "DOM cannot run captured pixels round a
 * fillet, so the renderer is decided"; #189 pointed out the second half never
 * followed from the first, and #204 removed the first. A slice's box and the face
 * are CONCENTRIC rectangles, so running the picture onto a ring is a scale about
 * their shared centre — two `background-size` percentages and `center` — and
 * `edge.ts`'s `wrapped()` is the whole of it. What is left of #182 is the narrow
 * question it was always meant to be: whether a faceted 24-slice fillet is
 * distinguishable from a swept one at the size the Slab is actually drawn.
 */
export type EdgeName = 'flat' | 'thick' | 'wrapped';

export const STAGES: readonly StageName[] = ['dom', 'webgl'];
export const EDGES: readonly EdgeName[] = ['flat', 'thick', 'wrapped'];

/** Degrees to radians. */
const RAD = Math.PI / 180;

/**
 * Where the light for the edge stands, ON THE PAGE, and how much of the edge is
 * lit before it is pointed anywhere.
 *
 * `azimuth` is a bearing on the page — 0deg straight up, turning clockwise, the
 * way every other angle in CSS is stated — and `elevation` is how far out of the
 * page the light stands, 0deg grazing and 90deg straight at the reader.
 *
 * ON THE BOUNDARY AND NOT IN EITHER STAGE, so one light serves both renderers and
 * every glass surface the Cards are made of. `NOTES.md` carries why it is the page
 * it is fixed to and not the object, and what that cost to get wrong.
 *
 * THE FRONT FACE IS NEVER LIT BY IT. It is a photograph, and both stages have to
 * draw the same photograph.
 */
export interface Lighting {
  readonly azimuth: number;
  readonly elevation: number;
  readonly ambient: number;
}

/** The plane's attitude — the two angles `EaterMap.astro` writes as
 *  `rotateX(tilt) rotateZ(swing)`, in degrees. */
export interface Attitude {
  readonly tilt: number;
  readonly swing: number;
}

/** How lit a piece of the edge is, given which way it faces in the drawn
 *  object's OWN axes. A multiplier on the edge's colour, never below the
 *  ambient. */
export type Shade = (nx: number, ny: number, nz: number) => number;

/**
 * A LIGHT TO FALL BACK ON, AND NOT A SECOND HOME FOR THE COMPOSITION'S.
 *
 * A Token that cannot be read must not paint NOTHING. The DOM stage bakes the
 * shading into a `conic-gradient`, and one `NaN%` in one stop makes the whole
 * `background` declaration invalid at parse time — so an unreadable Token would
 * leave twenty-four transparent slices and an edge that was never drawn, which
 * looks exactly like a Slab with no thickness. Zero is the honest reading of a
 * missing TILT (no tilt), and it is not the honest reading of a missing ambient:
 * zero ambient is a black edge, which is a decision nobody made.
 *
 * **NOTHING KEEPS THESE EQUAL TO `tokens.css`, AND NOTHING SHOULD.** They agree
 * today because they were written together, but the composition's light is the
 * Token's and an author who drags it is not obliged to come here — this is a
 * floor under a degenerate page and never the value the drawing is made from. A
 * Check that asserted the two agreed would be a Check that fails on a legitimate
 * drag, which is the one thing `docs/adr/0006` says the suite may not do.
 */
const LIGHT: Lighting = { azimuth: 315, elevation: 38, ambient: 0.42 };

/** The three light Tokens, off whatever element the stage is reading. */
export function lightingIn(style: CSSStyleDeclaration): Lighting {
  const token = (name: string, fallback: number) => {
    const value = Number.parseFloat(style.getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    azimuth: token('--eater-map-light-azimuth', LIGHT.azimuth),
    elevation: token('--eater-map-light-elevation', LIGHT.elevation),
    ambient: token('--eater-map-light-ambient', LIGHT.ambient),
  };
}

function normalise(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

/**
 * How lit each direction is, for one attitude and one light.
 *
 * THE FORMULA IS HERE AND NOT IN EITHER STAGE for the same reason the light's
 * position is. What differs between them is what each can put IN: the extrusion
 * has a real normal per vertex, and a DOM slice has one background — which since
 * #197 is a `conic-gradient`, so it has a real lateral normal too and the two
 * stages are asking the same question of the same function.
 *
 * THE ROTATION IS CSS's OWN, WRITTEN OUT. `rotateX(tilt) rotateZ(swing)` applies
 * right to left, so the swing happens first and the matrix is `Rx . Rz` in CSS's
 * axes — x right, y DOWN, z towards the reader. Multiplied out rather than held
 * in an array, because every term is used exactly once and the third column of
 * the first row is zero.
 */
export function edgeShade(attitude: Attitude, light: Lighting): Shade {
  const ca = Math.cos(attitude.tilt * RAD);
  const sa = Math.sin(attitude.tilt * RAD);
  const cc = Math.cos(attitude.swing * RAD);
  const sc = Math.sin(attitude.swing * RAD);
  // The direction TOWARDS the light, in screen axes. `-cos` on y because y
  // points down: a light bearing north stands UP the page.
  const lateral = Math.cos(light.elevation * RAD);
  const [lx, ly, lz] = normalise(
    lateral * Math.sin(light.azimuth * RAD),
    -lateral * Math.cos(light.azimuth * RAD),
    Math.sin(light.elevation * RAD),
  );
  const ambient = Math.min(1, Math.max(0, light.ambient));
  return (nx, ny, nz) => {
    const sx = cc * nx - sc * ny;
    const sy = ca * sc * nx + ca * cc * ny - sa * nz;
    const sz = sa * sc * nx + sa * cc * ny + ca * nz;
    const facing = sx * lx + sy * ly + sz * lz;
    return ambient + (1 - ambient) * Math.max(0, facing);
  };
}

/** Which edges each stage can actually draw. **THERE IS NO EMPTY CELL NOW** — #204
 *  filled the one DOM could not reach, so `pnpm stages` is six cells of the same
 *  three edges and the comparison is purely faceted-against-swept, which is the
 *  narrow question #182 was left with. */
const REACHES: Record<StageName, readonly EdgeName[]> = {
  dom: ['flat', 'thick', 'wrapped'],
  webgl: ['flat', 'thick', 'wrapped'],
};

/** Can this stage draw this edge at all? */
export function reaches(stage: StageName, edge: EdgeName): boolean {
  return REACHES[stage].includes(edge);
}

/** The four boxes a stage is handed, found once so neither implementation repeats
 *  the selectors. `EaterMap.astro` says what each one is for. */
export interface StageParts {
  /** `.eater-map` — where the Lift's playhead and every Token are read from. */
  readonly root: HTMLElement;
  /** `.eater-map__slab` — the SIZE, and the container the plane's lengths are shares of. */
  readonly slab: HTMLElement;
  /** `.eater-map__plane` — the camera and the one rotation the Cards ride. */
  readonly plane: HTMLElement;
  /** The captured picture, as the markup left it. */
  readonly still: HTMLImageElement;
  /** What this stage was asked to make the Slab's edge out of. */
  readonly edge: EdgeName;
}

/**
 * What got mounted, which is a DESCRIPTION and not a handle.
 *
 * There is deliberately no `destroy()`. Nothing in this repository unmounts a
 * Section — the loader mounts one as it approaches and that is the whole
 * lifecycle — and the sheet that compares the two stages gives each cell its own
 * page rather than swapping one for the other in a live document. A teardown
 * nothing calls is a promise nothing keeps: it would be written once, never run,
 * and wrong by the time anything needed it.
 */
export interface Stage {
  readonly name: StageName;
  readonly edge: EdgeName;
  /**
   * Draw the Slab again from the Tokens as they stand now (#196).
   *
   * NOT A TEARDOWN'S TWIN, and it is here for the opposite reason there is no
   * `destroy()`: this one has a caller — `redraw.ts`, under the Editor and nowhere
   * else. OPTIONAL because the WebGL stage already reads every Token on every
   * frame; NOTES.md.
   */
  readonly redraw?: () => void;
}

/** One of the names, or null for anything else — including nothing at all. */
function named<T extends string>(value: string | null | undefined, allowed: readonly T[]): T | null {
  const found = allowed.find((one) => one === value);
  return found ?? null;
}

function param(name: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}

/**
 * Which stage this page is asking for.
 *
 * The attribute wins over the query, because a tool that drives the page sets the
 * attribute and a reader types the query — and a tool has to be able to shoot a
 * deep link without rewriting the URL it is checking.
 */
export function chosenStage(): StageName {
  return (
    named(document.documentElement.dataset.eaterMapStage, STAGES) ??
    named(param('stage'), STAGES) ??
    'dom'
  );
}

/**
 * Which edge this page is asking for, held to what the chosen stage can draw.
 *
 * `thick` IS THE DEFAULT AND THAT IS THE SHIPPED PAGE (#189), and a spelling
 * nobody recognises gets it too — `named()` answers null, so `?edge=chrome` falls
 * through to the default exactly as `?stage=nonsense` falls through to `dom`. A
 * query string is something a reader can be handed, and the honest answer to one
 * nobody can read is the composition rather than a guess.
 *
 * `flat` IS THE OTHER BRANCH AND IT IS A DIFFERENT QUESTION: an edge that IS
 * recognised and that the chosen stage cannot draw — `?stage=dom&edge=wrapped`.
 * That is the sheet's empty cell, and it is answered with the plainest drawing so
 * that `design/tools/render-stages.mjs` can ask the page what it drew and get
 * something other than the edge it asked for.
 */
export function chosenEdge(stage: StageName = chosenStage()): EdgeName {
  const asked =
    named(document.documentElement.dataset.eaterMapEdge, EDGES) ??
    named(param('edge'), EDGES) ??
    'wrapped';
  return reaches(stage, asked) ? asked : 'flat';
}

/** The Slab's own boxes, or null if the Exploded View is not on this page. */
function partsIn(root: HTMLElement, edge: EdgeName): StageParts | null {
  const slab = root.querySelector<HTMLElement>('[data-eater-map-slab]');
  const plane = root.querySelector<HTMLElement>('[data-eater-map-plane]');
  const still = root.querySelector<HTMLImageElement>('[data-eater-map-still]');
  if (!slab || !plane || !still) return null;
  return { root, slab, plane, still, edge };
}

/**
 * Mount whichever stage this page asked for.
 *
 * ASYNCHRONOUS, AND THE COMPOSITION DOES NOT WAIT FOR IT. The DOM stage is what
 * the markup already reads as, so nothing is missing while this is in flight and
 * nothing is missing if it never lands — which is the same promise `timeline.ts`
 * keeps and for the same reason. `data-eater-map-stage` goes on the Section's root
 * when a stage is up, so a tool comparing the two has something to wait for.
 */
export async function mountStage(root: HTMLElement): Promise<Stage | null> {
  const name = chosenStage();
  const parts = partsIn(root, chosenEdge(name));
  if (!parts) return null;

  const mount =
    name === 'webgl'
      ? (await import('./stage-webgl')).default
      : (await import('./stage-dom')).default;

  const stage = await mount(parts);
  root.dataset.eaterMapStage = stage.name;
  root.dataset.eaterMapEdge = stage.edge;
  return stage;
}
