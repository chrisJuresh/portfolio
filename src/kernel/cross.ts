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
 * THAT DEVICE IS FREE IN THE BAND AND IS NOT FREE OUT HERE, and the first spike
 * missed why. In the band the word's two poses — the Front Screen's Cut Title
 * and the Panel's masthead — are THE SAME BOX, solved from --landing-w, so
 * "never moves and never resizes" costs nothing. Out here they are two different
 * boxes and they are far apart:
 *
 *     390x844    the drawing is 330.9 wide, cap 51.1; the masthead's cap is
 *                33.4 and sits 134px further down the page.
 *     1000x1000  the drawing is 503.4 wide, cap 77.8, centred in the column;
 *                the masthead's cap is 66.8, on the page's left margin,
 *                222px to the left and 150px down.
 *
 * The first spike answered that by DRAWING THE WORD IN THE DESTINATION POSE FROM
 * THE FIRST FRAME — the Cut Title fitted to the masthead's cap and stood in its
 * slot before the reader had scrolled at all. Which is why every clip of it
 * opened on the big Friz word and then snapped: the word was never the Front
 * Screen's word, it only looked like it for as long as it took the mode to be
 * applied. Nothing about that reads as one word turning into another.
 *
 * WHAT IS SHARED BY EVERY CANDIDATE HERE ("the spine"): at --cross: 0 the page
 * is EXACTLY the page that ships — same Cut Title, same column, same measure,
 * same 0.62 of its cap showing above the Section's foot, nothing out of flow and
 * nothing resized. As the crossing opens, that one word TRAVELS: it slides, it
 * scales to the masthead's cap, the cut opens downward to uncover the rest of it,
 * and the letterforms turn — all four on the same 0 -> 1, so the arrival is one
 * gesture and not four. At --cross: 1 it is standing in the masthead's slot at
 * the masthead's size, and the masthead is invisible underneath it. That is the
 * band's device restated for a page where the two poses do not coincide: the
 * word still becomes the masthead, it just has to go there.
 *
 * WHAT THE CROSSING IS. Measured off the DESTINATION and never off the word:
 * how far the masthead's cap top has risen from the bottom edge of the window to
 * its resting line. The word is the thing being moved, so reading the progress
 * off the word's own rectangle would be a feedback loop — the transform moves the
 * rectangle, the rectangle moves the transform. The masthead is in flow and
 * never transformed, so it is the honest clock.
 *
 * THE FOUR CANDIDATES, chosen by `data-cross` on <html>:
 *
 *   fly     the flight, linear in the scroll. The plainest reading.
 *   ease    the flight on a smoothstep, so it leaves and arrives softly and
 *           does most of its travelling in the middle.
 *   early   `ease`, finishing lower down the window, so the word is landed and
 *           settled while there is still Panel underneath it to read.
 *   paper   `ease`, and the Turn re-anchored to the same crossing, so ink, veil,
 *           letterform and flight all cross together the way they do in the band
 *           instead of the paper being smeared over the whole document.
 *
 * With no attribute the page behaves exactly as it ships. Nothing here runs in
 * the band at all.
 *
 * WHY THE THREE NUMBERS ARE MEASURED AND NOT DERIVED. In the band both Sections
 * are solved from --landing-w, so the two poses are arithmetic. Out here the
 * Panel is a stack whose masthead stands under a Rail of names that wrap, and the
 * Front Screen's column is a flex remainder — the distance between the poses is
 * something layout works out and CSS cannot read back. So it is measured, once
 * per resize, the way the Front Screen's Timeline measures the photograph it
 * cannot compute. The Kernel may not know a Section's class names, so the two
 * elements name themselves: `data-landing-mast` on the masthead and
 * `data-landing-word` on the Cut Title, the same kind of contract as
 * `data-section` and `data-turn`.
 *
 * AND WHY THEY ARE MEASURED IN A POSE THIS FILE PUTS THE PAGE INTO. The natural
 * cap is the height of the cut when it is fully open, which is a number only the
 * Section's own tokens know — `--front-screen-cut-slab`, in container units, and
 * the Kernel is not allowed to know that name. So instead of reading the token,
 * the page is briefly stood at `--cross: 1` with the flight neutralised, every
 * box is read off THAT, and the live value is put back before anything paints.
 * Geometry the Kernel is entitled to, in place of vocabulary it is not.
 */

const BAND = '(min-width: 1100px) and (min-height: 700px)';

export type CrossMode = 'fly' | 'ease' | 'early' | 'paper';

/**
 * Each candidate's resting line — where up the window the masthead's cap top has
 * got to when the flight is over — as a fraction of the window's height, and the
 * shape of the flight in between.
 */
const CANDIDATES: Record<CrossMode, { rest: number; shape: (p: number) => number }> = {
  fly: { rest: 0.25, shape: (p) => p },
  ease: { rest: 0.25, shape: smooth },
  early: { rest: 0.42, shape: smooth },
  paper: { rest: 0.25, shape: smooth },
};

/** The smoothstep: zero slope at both ends, so nothing starts or stops abruptly. */
function smooth(p: number): number {
  return p * p * (3 - 2 * p);
}

const root = document.documentElement;

type Watcher = (cross: number) => void;
const watchers: Watcher[] = [];

/** The masthead's own size, cached by publish() — crossing() runs every frame. */
let mastSize = 0;

/** Draw against the crossing. Called at once with where the crossing already is. */
export function onCross(watcher: Watcher): void {
  watchers.push(watcher);
  watcher(crossing() ?? 0);
}

export function mode(): CrossMode | null {
  const named = root.dataset.cross ?? '';
  if (!(named in CANDIDATES)) return null;
  return window.matchMedia(BAND).matches ? null : (named as CrossMode);
}

/** True while the crossing rather than the document's scroll owns the Turn. */
export function crossOwnsTurn(): boolean {
  return mode() === 'paper';
}

function parts(): { mast: HTMLElement; word: HTMLElement; link: HTMLElement; ink: Element } | null {
  const mast = document.querySelector<HTMLElement>('[data-landing-mast]');
  const word = document.querySelector<HTMLElement>('[data-landing-word]');
  const link = word?.querySelector<HTMLElement>('a') ?? null;
  const ink = word?.querySelector('svg') ?? null;
  if (!mast || !word || !link || !ink) return null;
  return { mast, word, link, ink };
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
 * The flight: where the word's cap top and left edge have to end up, and how much
 * smaller it has to be when it gets there. Published on the body, where the
 * Sections' own boxes can read them — the same place the landing publishes its
 * measure, and for the same reason.
 *
 * Both deltas are differences between two boxes read in the same frame, so the
 * scroll cancels out of them and they are constants of the layout rather than of
 * the moment. One literal: the cap top sits 0.080 em below the masthead's line
 * box, which is the figure landing.css already carries for the same face.
 */
function publish(): void {
  const body = document.body;
  const found = parts();
  mirror();
  if (mode() === null || !found) {
    body.style.removeProperty('--landing-fly-dx');
    body.style.removeProperty('--landing-fly-dy');
    body.style.removeProperty('--landing-fly-scale');
    return;
  }

  // Stand the page at the far end of the flight with the flight itself
  // neutralised: the cut is fully open, so the link's box IS the whole cap, and
  // nothing is translated or scaled, so every rectangle is the layout's own.
  const live = root.style.getPropertyValue('--cross');
  body.style.setProperty('--landing-fly-dx', '0px');
  body.style.setProperty('--landing-fly-dy', '0px');
  body.style.setProperty('--landing-fly-scale', '1');
  root.style.setProperty('--cross', '1');

  const cap = found.link.getBoundingClientRect().height;
  const box = found.word.getBoundingClientRect();
  const ink = found.ink.getBoundingClientRect();
  const mast = found.mast.getBoundingClientRect();
  mastSize = Number.parseFloat(getComputedStyle(found.mast).fontSize) || 0;

  root.style.setProperty('--cross', live);

  if (cap <= 0 || mastSize <= 0) return;

  // The scale is the two caps. The x is the one that needs an argument. The
  // origin is the CONTAINER's corner but the thing that has to land on the
  // masthead's margin is the INK, which sits a left bearing inside it — and that
  // bearing is scaled too, so what the translation owes at the end is the
  // bearing's FINAL width and not its change. Take that off and the ink's left
  // edge runs from where the column puts it to the masthead's margin, in a
  // straight line, with the scale folding out of the arithmetic exactly.
  const scale = (0.7 * mastSize) / cap;
  const lead = ink.left - box.left;
  const dx = mast.left - box.left - scale * lead;
  const dy = mast.top + 0.08 * mastSize - box.top;

  body.style.setProperty('--landing-fly-scale', scale.toFixed(4));
  body.style.setProperty('--landing-fly-dx', `${dx.toFixed(2)}px`);
  body.style.setProperty('--landing-fly-dy', `${dy.toFixed(2)}px`);
}

/**
 * How far the crossing has opened: 0 with the masthead's cap top on the bottom
 * edge of the window, 1 with it on the candidate's resting line. Read off the DOM
 * rather than off a cached number, so it cannot be asked before the frame it
 * belongs to — turn.ts asks for it from its own listener.
 */
export function crossing(): number | null {
  const named = mode();
  if (named === null) return null;
  const found = parts();
  if (!found || mastSize <= 0) return 0;
  const height = window.innerHeight;
  const rest = CANDIDATES[named].rest * height;
  const capTop = found.mast.getBoundingClientRect().top + 0.08 * mastSize;
  const travel = height - rest;
  if (travel <= 0) return 0;
  return CANDIDATES[named].shape(Math.min(1, Math.max(0, (height - capTop) / travel)));
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
  // `?cross=ease` chooses a candidate before the first frame rather than a
  // handle chosen after it. It is how the clips are recorded — a Run that calls
  // the handle records the change itself, and a change at frame twenty reads as
  // the very snap the candidates exist to remove — and it is how the author
  // opens one on an actual phone.
  const asked = new URLSearchParams(window.location.search).get('cross') ?? '';
  if (asked in CANDIDATES) root.dataset.cross = asked;
  publish();
  frame();
  gsap.ticker.add(frame);
  window.addEventListener('resize', publish);
  // The measurement is of a layout the faces have to have arrived for: a
  // fallback face and the real one give two different masthead boxes, and the
  // flight is the difference between two boxes.
  document.fonts?.ready.then(publish).catch(() => undefined);
}
