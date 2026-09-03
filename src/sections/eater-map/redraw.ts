/**
 * The generated geometry drawn again when what it was generated FROM has moved.
 *
 * TWO THINGS MOVE IT AND THEY ARE NOT ALIKE, which is why this module has two
 * halves and one `again`. The **Editor** previewing a Token is a drag — dozens of
 * times a second, on a page no reader ever opens (#196), and it is observed
 * through the Editor's own preview sheet. The **window leaving the band** is once,
 * on every reader's page, and it is a media query answering `--eater-map-solid`
 * differently. Both want exactly the same call: draw it again.
 *
 * WHY THE SECOND HALF EXISTS AT ALL, since it did not used to. `edge.ts`
 * substitutes every Token into the lengths at mount now, because a declaration
 * carrying a `var()` is re-parsed on every style recalc and the page turn
 * recalculates the document every frame. What that gives up is a Token moving
 * under a mounted drawing — and the band's collapse is a Token moving. The
 * container units are NOT substituted, so an ordinary resize still needs nothing
 * from here; it is the crossing and only the crossing.
 *
 * NOTES.md — the seam, the gate, the signature, the measurement, and what each
 * cost to get wrong.
 */

/** The Editor's own footprint: the two tags it injects into every HTML response,
 *  its panel, and every stylesheet it previews through. */
const EDITOR = '[data-editor]';

/** ...and the stylesheets alone, which are the ones worth watching. */
const SHEET = 'style[data-editor]';

/** One of this Section's Tokens, as the declaration itself: what has to be
 *  noticed is a VALUE moving, and the same Token under two rules is two of these. */
const DECLARED = /--eater-map-[a-z0-9-]+\s*:[^;}]*/g;

/** Every one of them the Editor is previewing, in one string. */
function signature(): string {
  let found = '';
  for (const sheet of document.querySelectorAll<HTMLStyleElement>(SHEET)) {
    found += `${(sheet.textContent ?? '').match(DECLARED)?.join(';') ?? ''};`;
  }
  return found;
}

/** Is this node one of the Editor's stylesheets? */
function isSheet(node: Node | null): boolean {
  return node instanceof HTMLStyleElement && node.dataset.editor !== undefined;
}

/**
 * Whether the Slab is a solid here, as the string the root holds.
 *
 * `edge.ts`'s `SOLID` is the expression every generated length carried; this is
 * the value it was substituted with. **The one term in that arithmetic that is not
 * a Token** — `EaterMap.astro` declares it beside `--eater-map-collapsed` and says
 * why: it is a regime and not a number the author chooses, so it is the one input
 * a media query answers and the author never drags.
 *
 * READ OFF THE ROOT AND COMPARED AS A STRING. The root is where both regimes
 * declare it, and a string comparison cannot be fooled by `0` and `0.0` being one
 * number: what is being asked is whether the stylesheet's answer CHANGED, and any
 * change at all means the drawing was generated from something that is no longer
 * true.
 */
function solidity(root: HTMLElement): string {
  return getComputedStyle(root).getPropertyValue('--eater-map-solid').trim();
}

/**
 * The band half: draw it again when the window carries the Section out of the band
 * or back into it.
 *
 * NOT GATED ON ANYTHING, unlike the Editor half below — every reader has a window
 * they can resize. What it costs a reader who does is one `getComputedStyle` of
 * one property per frame of the drag, because the read is coalesced onto a frame
 * the same way the Editor's is; the rebuild itself happens on the crossing and
 * nowhere else.
 *
 * AND IT IS THE CROSSING RATHER THAN THE RESIZE, which is the whole reason
 * substituting the Tokens was affordable. `edge.ts` leaves `100cqw` and `100%`
 * alone, so a window that changes the Slab's size moves every slice with it for
 * free; only a Token answered differently needs the hundred and forty-four
 * elements built again, and there is exactly one of those.
 *
 * NO LISTENER IS REMOVED, because this Section is mounted once and lives as long
 * as the document — the same reason `timeline.ts`'s own resize listener is not.
 */
function mountBand(root: HTMLElement, again: () => void): void {
  let held = solidity(root);
  let frame = 0;
  const look = (): void => {
    frame = 0;
    const now = solidity(root);
    if (now === held) return;
    // BEFORE the rebuild and not after it. `again()` is synchronous and long — a
    // hundred and forty-four elements — and a resize keeps firing while it runs,
    // so a hold written afterwards is a hold written from a value that has already
    // been read again.
    held = now;
    again();
  };
  window.addEventListener(
    'resize',
    () => {
      if (frame === 0) frame = requestAnimationFrame(look);
    },
    { passive: true },
  );
}

/**
 * Draw `root`'s generated geometry again whenever what it was generated from moves
 * — the window leaving the band, always, and the Editor previewing one of this
 * Section's Tokens where there is an Editor to do it.
 */
export default function mountRedraw(root: HTMLElement, again: () => void): void {
  // FIRST, AND OUTSIDE THE GATE. The band is every reader's; the observer below is
  // the Editor's alone, and the early return is that gate.
  mountBand(root, again);

  if (!document.querySelector(EDITOR)) return;

  let held = signature();
  let frame = 0;

  const moved = (): void => {
    frame = 0;
    const now = signature();
    if (now === held) return;
    held = now;
    again();
  };

  // The Editor's sheets and nothing else, which is what keeps this redraw's own
  // hundred and twenty slices — and `glass.ts`'s offscreen ruler going onto the
  // body and off it again — from being records it acts on. The body is watched
  // only for a sheet ARRIVING, because the preview sheet is made on the first drag.
  const watch = new MutationObserver((records) => {
    let touched = false;
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!isSheet(node)) continue;
        watch.observe(node, { characterData: true, childList: true, subtree: true });
        touched = true;
      }
      if (isSheet(record.target) || isSheet(record.target.parentNode)) touched = true;
    }
    if (touched && frame === 0) frame = requestAnimationFrame(moved);
  });
  watch.observe(document.body, { childList: true });
  for (const sheet of document.querySelectorAll<HTMLStyleElement>(SHEET)) {
    watch.observe(sheet, { characterData: true, childList: true, subtree: true });
  }

  // So "is this wired" is a question the page answers from either side: a page
  // under the Editor carries this and the shipped page must not.
  root.dataset.eaterMapRedraw = 'editor';
}
