/**
 * The generated geometry drawn again while the Editor drags a Token (#196).
 * NOTES.md — the seam, the gate, the signature, and what each cost to get wrong.
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
 * Draw `root`'s generated geometry again whenever the Editor previews one of this
 * Section's Tokens — and do nothing at all if there is no Editor.
 */
export default function mountRedraw(root: HTMLElement, again: () => void): void {
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
