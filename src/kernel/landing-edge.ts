import gsap from 'gsap';
import { handles } from './handles';

/**
 * THE TURN AS AN EDGE, for every window that is not the landing band.
 *
 * IN THE BAND THE TURN IS ALREADY AN EDGE, and nothing here runs. The document
 * is a page turn: the Front Screen ends under the Cut Title, the Projects Panel
 * below it is black, and the boundary between the two Sections crosses PROJECTS
 * about half way up — which is why the word ships cut across the middle. The
 * fold IS the line. See landing.css.
 *
 * OUT OF THE BAND THERE IS NO FOLD, so the same crossing degenerates into a MIX:
 * --ground carries the whole document from paper into dark together, over the
 * document's entire scroll. Every frame between the two ends is a grey page with
 * a grey word on it, there is no moment anything happens AT, and the reader gets
 * banding rather than a turn. The word is cut across the middle by a fold that
 * is not there, and the Panel prints a second PROJECTS a hundred and fifty
 * pixels below the first.
 *
 * So the line is drawn instead. A plate climbs the screen, clocked on the word's
 * own travel up it; the word is drawn twice and masked at the line so it reads
 * dark on the paper above and light on the black below; and the Turn — the
 * letterforms, the Effect Stack's veil, everything else the page draws against
 * it — is re-anchored to that same climb. One number, and everything on it.
 *
 * THE WORD IS NOT TOUCHED. Not held, not moved, not resized. It is the Front
 * Screen's own word, where the column puts it, at the size the column gives it,
 * and the only thing that changes is where the dark starts underneath. What made
 * that possible is that the Panel's duplicate masthead goes: with it gone the
 * three names stand directly under the word they are an index of, and the word
 * is the Panel's head without ever having to travel to it.
 *
 * WHAT IS MEASURED, AND WHY IT CANNOT BE COMPUTED. The word's cap height is what
 * every number here is stated in, and it is a picture scaled to a container
 * query — so CSS knows it and cannot hand it back. The same goes for the foot of
 * the contact block, which the climb is clamped to. Both are read once per
 * resize. The Kernel may not know a Section's class names, so the three elements
 * name themselves — `data-landing-word`, `data-landing-names` and
 * `data-landing-over` — the same contract as `data-section`.
 */

const BAND = '(min-width: 1100px) and (min-height: 700px)';

/**
 * WHERE THE CLIMB STARTS AND FINISHES, as the word's cap top's share of the
 * window. The edge is clocked on the WORD and not on a scroll distance, which is
 * what makes it arrive with the word at every viewport rather than at the one it
 * was tuned on.
 *
 * 1 is the foot of the screen: the dark starts moving the moment there is a word
 * to move it against. 0.12 is the word's own resting place near the top — so the
 * page has finished turning exactly as PROJECTS gets there, rather than a screen
 * before it or a screen after.
 */
const FROM = 1;
const TO = 0.12;

/**
 * The air left above the cap once the climb has finished, in caps.
 *
 * This is the "with some margin" of the ask, and it also buys the gap BELOW the
 * contact block: a climb that finishes nine tenths of a cap above the word needs
 * at least that much paper up there to finish IN, or it takes the last contact
 * line with it while there is still white on the screen.
 */
const MARGIN = 0.9;

/** What that gap carries on top of MARGIN, in caps — the clearance that leaves
 *  between the contact block's foot and the line's highest point. */
const CLEARANCE = 0.35;

/** The air between the word and the three names it is an index of, in caps. The
 *  two ship hard against each other once the duplicate masthead between them has
 *  gone, and nothing else has to clear the word, so this is small on purpose. */
const HEAD_ROOM = 0.4;

/** Where up the window the index finishes arriving, and how much of a window it
 *  takes to get there. */
const NAMES_REST = 0.28;
const NAMES_RUN = 0.6;

const root = document.documentElement;

type Watcher = (cross: number) => void;
const watchers: Watcher[] = [];

/** Everything publish() measures, and everything a frame may read. */
interface Flight {
  /** The word's cap top, in the document. */
  capDoc: number;
  /** The word's cap height — the whole of it, with the cut fully open. Every
   *  number above is stated in these. */
  cap: number;
  /** How far the drawing's own top edge stands ABOVE that cap top. The lit copy
   *  of the word is masked in the DRAWING's coordinates and the line is stated
   *  in the CAP's, so this is what carries one into the other. */
  inkLead: number;
  /** The foot of the last thing on the page that has to stay on paper — the
   *  contact block — in the document. */
  overDoc: number;
}

let flight: Flight | null = null;

/** Draw against the crossing. Called at once with where it already is. */
export function onCross(watcher: Watcher): void {
  watchers.push(watcher);
  watcher(crossing() ?? 0);
}

/**
 * True when the Turn is an edge rather than the document's whole scroll.
 *
 * turn.ts asks this and stands aside: two writers on one Timeline progress is a
 * frame of whichever ran second.
 */
export function edged(): boolean {
  return !window.matchMedia(BAND).matches;
}

interface Parts {
  word: HTMLElement;
  link: HTMLElement;
  ink: Element;
  names: HTMLElement | null;
  over: HTMLElement | null;
}

function parts(): Parts | null {
  const word = document.querySelector<HTMLElement>('[data-landing-word]');
  const link = word?.querySelector<HTMLElement>('a') ?? null;
  const ink = word?.querySelector('svg') ?? null;
  if (!word || !link || !ink) return null;
  return {
    word,
    link,
    ink,
    names: document.querySelector<HTMLElement>('[data-landing-names]'),
    over: document.querySelector<HTMLElement>('[data-landing-over]'),
  };
}

/**
 * The state, restated on every Section's own root.
 *
 * A Section's stylesheet is scoped by the compiler, so `:root[data-turn-edge]`
 * written in one matches nothing at all — silently, which is the trap tokens.css
 * already carries a paragraph about. An attribute on the Section's OWN element
 * is a compound the scoping narrows the ordinary way, so
 * `.front-screen[data-turn-edge]` works.
 *
 * The Kernel writing on a Section is not a pattern to copy. It is the same
 * exception the landing already is: the line crosses the boundary BETWEEN the
 * two Sections, so neither of them can own it, and a media query in each would
 * be two copies of one decision that could then disagree.
 */
function mirror(on: boolean): void {
  for (const section of document.querySelectorAll<HTMLElement>('[data-section]')) {
    if (on) section.dataset.turnEdge = '';
    else delete section.dataset.turnEdge;
  }
  // The plate is the Kernel's own element and is therefore the one thing here a
  // `:root` selector can reach.
  if (on) root.dataset.turnEdge = '';
  else delete root.dataset.turnEdge;
}

const PUBLISHED = [
  '--landing-edge-gap',
  '--landing-edge-top',
  '--landing-edge-word',
  '--landing-head-room',
  '--landing-names-cross',
];

/**
 * Everything the line needs that only layout knows.
 *
 * THE CAP IS READ FIRST AND ON ITS OWN, because the gap above the word is a
 * function of it and where the word STANDS is a function of the gap. There is no
 * cycle in that — a margin above the word does not change how tall the word is —
 * but there is an ORDER, and reading one rect at the top and using it after the
 * margin had moved is exactly the bug it would look like.
 */
function publish(): void {
  const body = document.body;
  const on = edged();
  const found = parts();
  mirror(on);
  for (const name of PUBLISHED) body.style.removeProperty(name);
  if (!on || !found) {
    flight = null;
    return;
  }

  const cap = found.link.getBoundingClientRect().height;
  if (cap <= 0) {
    flight = null;
    return;
  }

  // The air above the word, and it belongs to the edge rather than to taste —
  // see MARGIN. The Front Screen takes the LARGER of this and its own rhyme, so
  // a window where the rhyme is already the more generous of the two keeps it.
  body.style.setProperty('--landing-edge-gap', `${((MARGIN + CLEARANCE) * cap).toFixed(2)}px`);
  body.style.setProperty('--landing-head-room', `${(HEAD_ROOM * cap).toFixed(2)}px`);

  const link = found.link.getBoundingClientRect();
  const ink = found.ink.getBoundingClientRect();

  flight = {
    capDoc: link.top + window.scrollY,
    cap,
    inkLead: link.top - ink.top,
    overDoc:
      (found.over?.getBoundingClientRect().bottom ?? Number.NEGATIVE_INFINITY) + window.scrollY,
  };
}

/**
 * How far BELOW the word's cap top the dark starts, in pixels.
 *
 * Half a cap at rest — the fold's own answer, and why the word ships cut across
 * the middle — climbing to MARGIN caps ABOVE it, which is why this goes negative.
 *
 * THE CLAMP IS NOT THE SAME KIND OF NUMBER as the three constants it bounds.
 * FROM, TO and MARGIN are a composition; the clamp is the one hard constraint —
 * the contact block may not be taken by the dark while there is still paper on
 * the screen — and it holds whatever those three are set to. It is written in
 * DOCUMENT coordinates and compared against the line's, so a viewport where the
 * gap turned out too small loses some of its margin instead of losing the rule.
 *
 * AND IT DOES NOT BIND TODAY, WHICH IS THE POINT OF IT. `--landing-edge-gap` is
 * derived from the same MARGIN and CLEARANCE, so the climb's end and this floor
 * are TANGENT: the line finishes exactly CLEARANCE caps below the contact
 * block's foot, at every viewport measured. Deleting the clamp changes not one
 * pixel — which is a thing to know before deleting it, because what it is for is
 * the edit that has not happened yet. Move MARGIN and leave the gap alone and it
 * is the only thing standing between the dark and the last contact line. The
 * `landing-edge` Check asserts the OUTCOME rather than this mechanism, and
 * records that this mutation is one it does not catch.
 */
function belowCap(): number {
  if (!flight) return 0;
  const tall = window.innerHeight;
  const capTop = flight.capDoc - window.scrollY;
  const run = Math.max(1, (FROM - TO) * tall);
  const climb = Math.min(1, Math.max(0, (FROM * tall - capTop) / run));
  const below = 0.5 * flight.cap + climb * (-MARGIN * flight.cap - 0.5 * flight.cap);
  const floor = flight.overDoc + CLEARANCE * flight.cap - flight.capDoc;
  return Math.max(below, floor);
}

/**
 * How far the crossing has opened: 0 with the word still below the screen, 1
 * once the dark has closed over it.
 *
 * It is the LINE's own progress and not a second clock, which is the whole point
 * of the device — the letterforms turn out of Friz Quadrata into the sans, the
 * Effect Stack's veil takes the paper's treatment out with the paper, and the
 * dark arrives, all on one number.
 */
export function crossing(): number | null {
  if (!edged()) return null;
  if (!flight) return 0;
  const span = (0.5 + MARGIN) * flight.cap;
  return Math.min(1, Math.max(0, (0.5 * flight.cap - belowCap()) / Math.max(1, span)));
}

/**
 * How far the three names have closed on their place under the word.
 *
 * NOT the crossing, and that distinction cost a candidate. The word does not
 * move here, so the names sit a fixed distance beneath it and the two travel
 * together — a distance which is a constant of the layout, and an index drawn
 * from it would be at one opacity for the whole page. What a reader notices
 * about an index is it coming up the SCREEN, so that is what this counts.
 */
function arriving(): number {
  const found = parts();
  if (!flight || !found?.names) return 1;
  const height = window.innerHeight;
  const left = found.names.getBoundingClientRect().top - NAMES_REST * height;
  return Math.min(1, Math.max(0, 1 - left / Math.max(1, NAMES_RUN * height)));
}

function frame(): void {
  const cross = crossing();
  if (cross === null || !flight) return;
  const body = document.body;
  const below = belowCap();

  // TWO NUMBERS FOR ONE LINE, in two coordinate systems, because the line is
  // drawn twice.
  //
  // The PLATE is fixed to the viewport, so its number is in the viewport's
  // coordinates. The MASK is in the DRAWING's own box, and is what makes the
  // letters read light below the line and dark above it without a blend mode:
  // the lit copy of the word is simply not painted above it.
  body.style.setProperty(
    '--landing-edge-top',
    `${(flight.capDoc - window.scrollY + below).toFixed(2)}px`,
  );
  body.style.setProperty('--landing-edge-word', `${(below + flight.inkLead).toFixed(2)}px`);
  body.style.setProperty('--landing-names-cross', arriving().toFixed(3));

  for (const watcher of watchers) watcher(cross);

  // THE TURN, ON THAT SAME NUMBER. Driving the Timeline rather than writing
  // --turn, so everything already drawn against the Turn — the morph through
  // turn.ts's own watchers, the veil, the Panel — is wired by construction and
  // there is no second number for any of it to come apart from.
  //
  // AND IT IS SAFE TO RUN IT THROUGH THE CLIMB, which it was not before
  // ground.css pinned the paper end. --turn mixes --ground, --ink and
  // --ink-soft, so moving it while the line is still climbing paints the paper
  // ABOVE the line grey — the banding this whole device exists to remove. The
  // fault was never the timing: with an edge, the dark side of the page is the
  // plate and the Panel, both of which state their own colours, so those three
  // mixes have nothing left to interpolate. ground.css says so, and the Turn is
  // free to arrive when everything else does.
  handles().timelines.get('turn')?.progress(cross);
}

export function mountLandingEdge(): void {
  publish();
  frame();
  gsap.ticker.add(frame);
  window.addEventListener('resize', publish);
  // The measurement is of a layout the faces have to have arrived for: the
  // contact block is type, and the gap above the word is measured against it.
  document.fonts?.ready.then(publish).catch(() => undefined);
}
