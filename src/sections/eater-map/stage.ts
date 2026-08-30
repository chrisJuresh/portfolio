/**
 * The **stage**: the part of the Exploded View that reads the Tokens and draws
 * the Slab. One boundary, two implementations behind it (#177, #181).
 *
 * WHAT IS ON EITHER SIDE OF IT, because the split is not the obvious one. The
 * stage owns the SLAB — its size, its camera and, if it has one, its thickness.
 * It does NOT own the Cards. The Cards are the Eater app's own markup and have to
 * stay real, selectable, screen-readable text (#171, #176), so they ride the same
 * CSS plane under either stage and are positioned by the same three lines of
 * `EaterMap.astro`. A stage that drew them would be drawing a picture of them, and
 * the Section would have traded the whole point of the vendoring for a renderer.
 *
 * WHAT A STAGE MAY ASSUME. `--eater-map-lift` is on the Section's root, 0 flat and
 * 1 raised, and it is the only thing that moves; every angle, depth and distance
 * it is spent on is a Token. A stage never animates: `timeline.ts` is the one
 * authority on where the drawing is, and a stage reflects it. That is what makes
 * reduced motion free — the Timeline rests the playhead at 1 and creates no
 * trigger, and both stages simply draw 1.
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
 * `flat` is the shipped composition — a picture with no thickness at all, which
 * is what the flat frame of the Lift is and what every Check reads. The other two
 * are #181's comparison: `thick` is a Slab with a depth and a plain edge, and
 * `wrapped` is the same Slab with the captured pixels continuing over its rounded
 * edge. **`wrapped` is the cell DOM cannot reach**, and that is the finding rather
 * than a gap in the work: six faces would give DOM the silhouette and no amount of
 * them runs a continuous texture round a fillet.
 */
export type EdgeName = 'flat' | 'thick' | 'wrapped';

export const STAGES: readonly StageName[] = ['dom', 'webgl'];
export const EDGES: readonly EdgeName[] = ['flat', 'thick', 'wrapped'];

/**
 * Where the light for the Slab's edge stands, in the plane's own axes, and how
 * much of the edge is lit before it is pointed anywhere.
 *
 * ON THE BOUNDARY AND NOT IN EITHER STAGE, because it is a fact about the DRAWING
 * rather than about a renderer: two stages lit differently would be a comparison
 * of two lightings as much as of two renderers, which is exactly the confound the
 * sheet exists to remove. What each stage can DO with it is the honest difference
 * — the extrusion points every vertex at it, and the DOM slices can only take its
 * depth component, because a slice is one element with one background.
 *
 * THE FRONT FACE IS NEVER LIT BY IT. It is a photograph, and both stages have to
 * draw the same photograph.
 */
const EDGE_LIGHT = normalise(-0.36, 0.52, 0.78);
const EDGE_AMBIENT = 0.62;

function normalise(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

/**
 * How lit a piece of the edge is, given which way it faces.
 *
 * THE FORMULA IS HERE AND NOT IN EITHER STAGE for the same reason the light's
 * position is: two stages shading differently would be a comparison of two
 * shadings as much as of two renderers. What differs between them is what each
 * can put in — the extrusion has a real normal per vertex, and a DOM slice has
 * only the depth component, because one element has one background.
 *
 * @returns a multiplier on the edge's own colour, never below the ambient
 */
export function edgeShade(nx: number, ny: number, nz: number): number {
  const facing = nx * EDGE_LIGHT[0] + ny * EDGE_LIGHT[1] + nz * EDGE_LIGHT[2];
  return EDGE_AMBIENT + (1 - EDGE_AMBIENT) * Math.max(0, facing);
}

/** Which edges each stage can actually draw. The empty cell is a result. */
const REACHES: Record<StageName, readonly EdgeName[]> = {
  dom: ['flat', 'thick'],
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

/** Which edge this page is asking for, held to what the chosen stage can draw. */
export function chosenEdge(stage: StageName = chosenStage()): EdgeName {
  const asked =
    named(document.documentElement.dataset.eaterMapEdge, EDGES) ?? named(param('edge'), EDGES) ?? 'flat';
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
