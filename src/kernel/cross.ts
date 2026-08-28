import gsap from 'gsap';
import { handles } from './handles';

/**
 * THE LANDING, OUT OF THE BAND — a spike, and four candidate answers to one
 * question: what should PROJECTS do when the page is square or on a phone?
 *
 * Inside the landing band there is one PROJECTS on the page. It is drawn at the
 * Projects Panel masthead's own cap, the Panel's masthead goes invisible
 * underneath it, and the word neither travels nor resizes — the document moves
 * past it and the letterforms turn out of Friz Quadrata into the sans as it goes
 * (src/kernel/landing.css, src/sections/front-screen/cut-morph.ts).
 *
 * Outside the band NONE of that holds. The word is drawn twice and shown twice:
 * a Friz word clipped to 0.62 of its cap at the foot of the Front Screen's
 * column, centred in that column's measure, and the Panel's own sans masthead
 * about 150px below it on the page's left margin, at a different size. The morph
 * still runs — it is drawn against the Turn, and the Turn out here spans the
 * WHOLE document — so the Friz word turns into a second sans PROJECTS while the
 * first one is still on screen, and the crossing is smeared across two and a
 * half screens instead of happening at the seam.
 *
 * WHAT IS SHARED BY EVERY CANDIDATE ("the spine"): the Panel's masthead goes
 * invisible out here too, the Cut Title is fitted to that masthead's cap and
 * stood in its slot on the page's left margin, and the morph is driven by a
 * crossing of ITS OWN rather than by the document's whole scroll. That is the
 * band's device restated for a page that scrolls: one PROJECTS, arrived at in
 * Friz, leaving as the Panel's masthead.
 *
 * WHAT THE CROSSING IS. In the band the word's cap top travels from the fold to
 * --landing-top over exactly one screen of scroll, and the morph is that travel.
 * Out here the word is fixed in the document and the window still travels past
 * it, so the same number is available: how far the word's cap top has risen from
 * the bottom edge of the screen to the top of it. One screen, both regimes, and
 * on the desktop page the two are the same measurement.
 *
 * THE FOUR CANDIDATES, chosen by `data-cross` on <html>:
 *
 *   drift    the spine and nothing else. The word rises from the bottom edge as
 *            the reader scrolls, turning across one screen of its own travel.
 *   seam     the other structural answer: the word does not go down to the
 *            masthead's slot at all, it stands ON the boundary between the two
 *            papers the way it stands on the fold in the band — cut by the light
 *            paper, finished on the dark — and the Panel's head closes up under
 *            it.
 *   turn     drift, and the paper crosses with it: the Turn is re-anchored to
 *            the word's crossing instead of the document's whole scroll, so ink,
 *            veil and letterform turn together at the seam the way they do in
 *            the band.
 *   stagger  drift, with the eight letters turning one at a time across the
 *            crossing rather than nearly together.
 *
 * With no attribute the page behaves exactly as it ships. Nothing here runs in
 * the band at all.
 *
 * WHY THE MEASUREMENTS ARE TAKEN AND NOT DERIVED. In the band both Sections are
 * solved from --landing-w, so the cap and the drop are arithmetic. Out here the
 * Panel is a stack whose masthead sits under a Rail of wrapped names, and its
 * drop is that Rail's height plus two gaps — a thing layout works out and CSS
 * cannot read back. So it is measured, once per resize, the way the Front
 * Screen's Timeline measures the photograph it cannot compute. The Kernel may
 * not know a Section's class names, so the two elements name themselves:
 * `data-landing-mast` on the masthead and `data-landing-word` on the Cut Title,
 * the same kind of contract as `data-section` and `data-turn`.
 */

const BAND = '(min-width: 1100px) and (min-height: 700px)';

export type CrossMode = 'drift' | 'seam' | 'turn' | 'stagger';

const MODES: readonly string[] = ['drift', 'seam', 'turn', 'stagger'];

const root = document.documentElement;

type Watcher = (cross: number) => void;
const watchers: Watcher[] = [];

/** Draw against the crossing. Called at once with where the crossing already is. */
export function onCross(watcher: Watcher): void {
  watchers.push(watcher);
  watcher(crossing() ?? 0);
}

export function mode(): CrossMode | null {
  const named = root.dataset.cross ?? '';
  if (!MODES.includes(named)) return null;
  return window.matchMedia(BAND).matches ? null : (named as CrossMode);
}

/** True while the crossing rather than the document's scroll owns the Turn. */
export function crossOwnsTurn(): boolean {
  return mode() === 'turn';
}

function parts(): { mast: HTMLElement; word: HTMLElement; before: HTMLElement } | null {
  const mast = document.querySelector<HTMLElement>('[data-landing-mast]');
  const word = document.querySelector<HTMLElement>('[data-landing-word]');
  const panel = mast?.closest<HTMLElement>('[data-section]');
  // Walking back rather than taking the sibling: a Section is followed by its
  // own <script>, so the element before the Panel is a SCRIPT and not a Section.
  let before = panel?.previousElementSibling ?? null;
  while (before && !before.hasAttribute('data-section')) before = before.previousElementSibling;
  if (!mast || !word || !(before instanceof HTMLElement)) return null;
  return { mast, word, before };
}

/**
 * The chosen candidate, restated on every Section's own root.
 *
 * A Section's stylesheet is scoped by the compiler, so `:root[data-cross]` in one
 * matches nothing at all — silently, which is the trap tokens.css already carries
 * a paragraph about. An attribute on the Section's OWN element is a compound the
 * scoping narrows the ordinary way, so `.front-screen[data-cross]` works. This is
 * the Kernel writing on a Section, which is a spike's liberty and not a pattern.
 */
function mirror(): void {
  const named = mode();
  for (const section of document.querySelectorAll<HTMLElement>('[data-section]')) {
    if (named) section.dataset.cross = named;
    else delete section.dataset.cross;
  }
}

/**
 * The masthead's cap, and how far below the Front Screen's foot its cap top
 * stands. Published on the body, where the Sections' own boxes can read them —
 * the same place the landing publishes its measure, and for the same reason.
 *
 * The two literals are the faces' own metrics and are the ones landing.css
 * already carries: the cap is 0.700 em of the size and the cap top sits 0.080 em
 * below the line box's top edge.
 */
function publish(): void {
  const body = document.body;
  const found = parts();
  mirror();
  if (mode() === null || !found) {
    body.style.removeProperty('--landing-stack-cap');
    body.style.removeProperty('--landing-stack-drop');
    body.style.removeProperty('--landing-stack-under');
    return;
  }
  const size = Number.parseFloat(getComputedStyle(found.mast).fontSize) || 0;
  const capTop = found.mast.getBoundingClientRect().top + 0.08 * size;
  const foot = found.before.getBoundingClientRect().bottom;
  body.style.setProperty('--landing-stack-cap', `${(0.7 * size).toFixed(2)}px`);
  body.style.setProperty('--landing-stack-drop', `${(capTop - foot).toFixed(2)}px`);

  // How much of the word hangs BELOW the seam — nothing at all unless the
  // candidate is `seam`, and there the Panel owes it that much air before its
  // Rail or the two are printed over each other. Off the drawing's own box and
  // not off the cap, because the J's hook is what reaches lowest and the cap
  // slab does not contain it.
  const ink = found.word.querySelector('svg')?.getBoundingClientRect().bottom ?? 0;
  body.style.setProperty('--landing-stack-under', `${Math.max(0, ink - foot).toFixed(2)}px`);
}

/**
 * How far the word has crossed the window: 0 with its cap top on the bottom
 * edge, 1 with it on the top edge. Read off the DOM rather than off a cached
 * number, so it cannot be asked before the frame it belongs to — turn.ts asks
 * for it from its own listener.
 */
export function crossing(): number | null {
  if (mode() === null) return null;
  const found = parts();
  if (!found) return 0;
  const height = window.innerHeight;
  const top = found.word.getBoundingClientRect().top;
  return Math.min(1, Math.max(0, (height - top) / height));
}

function frame(): void {
  const cross = crossing();
  if (cross === null) return;
  root.style.setProperty('--cross', String(Math.round(cross * 1000) / 1000));
  for (const watcher of watchers) watcher(cross);
  if (crossOwnsTurn()) handles().timelines.get('turn')?.progress(cross);
}

/** Choose a candidate, or clear it. Also the handle a Run drives this from. */
export function cross(named: string | null): void {
  if (named) root.dataset.cross = named;
  else delete root.dataset.cross;
  publish();
  frame();
}

export function mountCross(): void {
  publish();
  frame();
  gsap.ticker.add(frame);
  window.addEventListener('resize', publish);
  // The measurement is of a layout the faces have to have arrived for: a
  // fallback face and the real one give two different masthead boxes, and the
  // drop is the difference between two boxes.
  document.fonts?.ready.then(publish).catch(() => undefined);
}
