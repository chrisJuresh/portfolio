import gsap from 'gsap';
import { handles } from './handles';

/**
 * THE LANDING, OUT OF THE BAND — a spike, and nine candidate answers to one
 * question: what should PROJECTS do when the page is square or on a phone?
 *
 * Inside the landing band there is one PROJECTS on the page. It is drawn at the
 * Projects Panel masthead's own cap, the Panel's masthead goes invisible
 * underneath it, and the word NEITHER TRAVELS NOR RESIZES — the document moves
 * past it and the letterforms turn out of Friz Quadrata into the sans as it goes
 * (src/kernel/landing.css, src/sections/front-screen/cut-morph.ts).
 *
 * TWO EARLIER SPIKES GOT THIS WRONG IN TWO DIFFERENT WAYS, and both are worth
 * keeping written down because both looked right in a still.
 *
 *   The first DREW THE WORD IN THE DESTINATION POSE FROM THE FIRST FRAME — the
 *   Cut Title fitted to the masthead's cap and stood in its slot before the
 *   reader had scrolled at all. Every clip of it opened on the big Friz word and
 *   then snapped, because the word was never the Front Screen's word.
 *
 *   The second made the word FLY: it started where the column puts it and was
 *   carried to the masthead's slot, sliding and scaling on one 0 -> 1. Smooth,
 *   verified, and still wrong — a word that shrinks by a third while it moves is
 *   two words being cross-faded by another name, and it reads as one.
 *
 * WHAT THE BAND ACTUALLY DOES, and what neither of those was: the word stays
 * where it is ON THE SCREEN while the page goes past it. That is the device. It
 * is free in the band because both poses are the same box, solved from
 * --landing-w. Out here the two boxes are different and 137px apart on a phone,
 * so the device has to be BUILT rather than fallen into — and building it means
 * a pin, not a flight.
 *
 * THE SPINE. Every candidate here holds the word still on the screen: it rides up
 * with the page until its cap top reaches a resting line, and from there the page
 * scrolls under it while it does not move. At --cross: 0 the page is exactly the
 * page that ships. Two things separate the candidates:
 *
 *   HOW FAR THE PIN REACHES. `slot` holds the word only as far as the Panel
 *   masthead's own cap top, which arrives under it and IS where it lets go — the
 *   band's handoff, compressed into the 137px the two words are actually apart.
 *   `far` holds it for as long as there is Panel to read under it: the word is
 *   the page's header, the whole read goes beneath it, and it lets go one gap
 *   before the picture would reach it — after which the page takes it off the top
 *   the same way it brought it in.
 *
 *   WHAT ELSE CROSSES WITH IT. The letterforms always turn — that is the site's
 *   own device and cut-morph.ts already draws against --cross. A candidate may
 *   also bring the three names up under the word, let it grow to the page's own
 *   edges, settle it into the masthead's smaller size, or hand it the Turn so the
 *   paper crosses on the same number as the word.
 *
 * TWO NUMBERS AND NOT ONE, which is the thing to understand before editing this
 * file. `--landing-hold-dy` is the PIN, in pixels, and it can run for a whole
 * Panel. `--cross` is the HANDOFF, and it is normalised over a short distance at
 * the start of the pin — a fifth of a screen, not the whole hold — so the morph,
 * the names and the plate arrive as the word settles rather than being smeared
 * across everything that follows. One number for both is what made the long pins
 * read as a page that never finished turning.
 *
 * WHAT IS MEASURED, AND WHY IT CANNOT BE COMPUTED. In the band both Sections are
 * solved from --landing-w, so the two poses are arithmetic. Out here the Panel is
 * a stack whose masthead stands under a Rail of names that wrap, and the Front
 * Screen's column is a flex remainder — the distance between the poses is
 * something layout works out and CSS cannot read back. So it is measured, once
 * per resize, in three passes, because each pass changes what the next one has to
 * read: the word's own cap; then the masthead resized to match it; then the three
 * names stood on the line the word will land on. The Kernel may not know a
 * Section's class names, so the four elements name themselves —
 * `data-landing-word`, `data-landing-mast`, `data-landing-names` and
 * `data-landing-under` — the same kind of contract as `data-section`.
 */

const BAND = '(min-width: 1100px) and (min-height: 700px)';

/**
 * How much wider than the page `wide` takes the word.
 *
 * Over 1, deliberately. On a phone the Cut Title is already 85% of the window,
 * so a word grown to FIT the page is a word 18% bigger and nothing else — the
 * candidate reads as a rounding error. Cropped at both edges it is a decision,
 * and the same decision at every window rather than one that only shows up on a
 * square.
 */
const BLEED = 1.3;

export type CrossMode =
  | 'fixed'
  | 'land'
  | 'settle'
  | 'stay'
  | 'header'
  | 'rail'
  | 'curtain'
  | 'wide'
  | 'under'
  | 'swap';

interface Shape {
  /** Whether this candidate replaces the Panel's masthead with the word at all.
   *  `fixed` does not: it is the page as it stands, with the two plain bugs out
   *  of it and nothing else touched, and it is what the rest are judged against. */
  join: boolean;
  /** Where up the window the word comes to rest, as a fraction of the window. */
  line: number;
  /** Whether the word is held on that line, or simply rides past it. */
  pin: boolean;
  /** How far the pin may run: to the masthead's slot, or for as long as there is
   *  Panel to read under it. */
  reach: 'slot' | 'far';
  /** How much of a window the handoff takes. The pin can be far longer. */
  arrive: number;
  /** Whether the word keeps its size, settles into the masthead's own, or grows
   *  to the page's edges. */
  size: 'keep' | 'settle' | 'bleed';
  /** Whether the three names are left in the Panel's flow, or stood under the
   *  word's own landing line.
   *
   *  ONLY A CANDIDATE THAT LANDS CAN MOVE THEM. `under` positions them in the
   *  PANEL, in document coordinates, beneath where the word comes to rest — and a
   *  header pinned to the screen never comes to rest anywhere in the document, so
   *  there is no line to stand them under. Those leave the names in flow and let
   *  them arrive by scrolling up beneath the held word, which is what a sticky
   *  header does anyway. */
  names: 'flow' | 'under';
  /** Whether the crossing owns the Turn — the paper crossing on the same number
   *  as the word, rather than over the whole document's scroll. */
  turn: boolean;
}

const KEEP: Shape = {
  join: true,
  line: 0.1,
  pin: true,
  reach: 'slot',
  arrive: 0.2,
  size: 'keep',
  names: 'under',
  turn: false,
};

const CANDIDATES: Record<CrossMode, Shape> = {
  /* the page as it stands, less the chopped word and the second ground */
  fixed: { ...KEEP, join: false, pin: false, names: 'flow' },

  /* the band's handoff, compressed into the distance the two words really are
     apart: the word holds at the line, the masthead's slot arrives under it, and
     that is where it lets go */
  land: { ...KEEP },

  /* the same handoff, but the word gives up its size on the way in, so it
     arrives AS the Panel's masthead rather than replacing it */
  settle: { ...KEEP, size: 'settle', line: 0.12 },

  /* the word is the Panel's header: it holds near the top, the whole read goes
     under it, and it lets go when the picture arrives */
  stay: { ...KEEP, reach: 'far', names: 'flow' },

  /* the same, flush to the very top edge */
  header: { ...KEEP, reach: 'far', line: 0.03, arrive: 0.16, names: 'flow' },

  /* the handoff, and the index is the point of it: the three names stand under
     the word where it lands and assemble themselves one at a time. A long hold
     cannot have this — the names would arrive and then be eaten by the header on
     their way up the screen */
  rail: { ...KEEP, arrive: 0.26 },

  /* the Turn arrives as an edge sweeping up THROUGH the held word, which is drawn
     as a difference against whatever is behind it, so the letters invert as the
     dark passes them */
  curtain: { ...KEEP, reach: 'far', line: 0.14, arrive: 0.28, turn: true, names: 'flow' },

  /* the word grows PAST the page's edges as it settles, so it is cropped at both
     of them: a banner rather than a masthead, and the one candidate that argues
     with the composition rather than restating it */
  wide: { ...KEEP, reach: 'far', line: 0.08, arrive: 0.3, size: 'bleed', names: 'flow' },

  /* the word is not touched AT ALL. The duplicate masthead simply goes, and the
     Panel's head rises to meet the word the page already has — the three names
     arriving under it as it comes. The least that can be done and still be an
     answer, and the one to beat */
  under: { ...KEEP, pin: false, reach: 'far', arrive: 0.25 },

  /* the handoff, and the paper crossing on the same number as the word */
  swap: { ...KEEP, arrive: 0.24, turn: true },
};

const root = document.documentElement;

type Watcher = (cross: number) => void;
const watchers: Watcher[] = [];

/** Everything publish() measures, and everything a frame is allowed to read. */
interface Flight {
  /** The word's cap top in the document, and its container's left edge. */
  capDoc: number;
  boxLeft: number;
  /** The ink's left bearing inside that container. */
  lead: number;
  /** The word's cap height — the whole of it, with the cut fully open. */
  cap: number;
  /** How far the word has to travel to stand in the masthead's slot, and how far
   *  it may be held before the picture would reach it. */
  slot: number;
  far: number;
  /** Where the ink has to end up across the page, and what it is multiplied by
   *  when it gets there. */
  toLeft: number;
  toScale: number;
}

let flight: Flight | null = null;

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

function shape(): Shape | null {
  const named = mode();
  return named === null ? null : CANDIDATES[named];
}

/**
 * True while the word is standing in for the Panel's masthead.
 *
 * The morph asks this rather than `mode()`: `fixed` is a chosen candidate — it
 * carries the two bug fixes — and it must still turn its letters against the
 * Turn like the shipped page, because nothing about it is a handoff.
 */
export function joined(): boolean {
  return shape()?.join === true;
}

/** True while the crossing rather than the document's scroll owns the Turn. */
export function crossOwnsTurn(): boolean {
  return shape()?.turn === true;
}

interface Parts {
  mast: HTMLElement;
  word: HTMLElement;
  link: HTMLElement;
  ink: Element;
  names: HTMLElement | null;
  under: HTMLElement | null;
}

function parts(): Parts | null {
  const mast = document.querySelector<HTMLElement>('[data-landing-mast]');
  const word = document.querySelector<HTMLElement>('[data-landing-word]');
  const link = word?.querySelector<HTMLElement>('a') ?? null;
  const ink = word?.querySelector('svg') ?? null;
  if (!mast || !word || !link || !ink) return null;
  return {
    mast,
    word,
    link,
    ink,
    names: document.querySelector<HTMLElement>('[data-landing-names]'),
    under: document.querySelector<HTMLElement>('[data-landing-under]'),
  };
}

/**
 * The chosen candidate, restated on every Section's own root.
 *
 * A Section's stylesheet is scoped by the compiler, so `:root[data-cross]` in one
 * matches nothing at all — silently, which is the trap tokens.css already carries
 * a paragraph about. An attribute on the Section's OWN element is a compound the
 * scoping narrows the ordinary way, so `.front-screen[data-cross]` works. This is
 * the Kernel writing on a Section, which is a spike's liberty and not a pattern.
 *
 * `data-join` is a SECOND attribute rather than a value of the first, and that is
 * the whole reason it exists: the two plain bugs — the word chopped across the
 * middle, and the Panel painting a second ground over the Kernel's — are fixed
 * for every candidate INCLUDING the one that changes nothing else, so those rules
 * cannot be gated on the handoff.
 */
function mirror(): void {
  const named = mode();
  const joins = shape()?.join === true;
  for (const section of document.querySelectorAll<HTMLElement>('[data-section]')) {
    if (named) section.dataset.cross = named;
    else delete section.dataset.cross;
    if (joins) section.dataset.join = '';
    else delete section.dataset.join;
  }
  if (joins) root.dataset.join = '';
  else delete root.dataset.join;
}

const PUBLISHED = [
  '--landing-names-cross',
  '--landing-hold-dx',
  '--landing-hold-dy',
  '--landing-hold-scale',
  '--landing-word-size',
  '--landing-names-top',
  '--landing-names-room',
  '--landing-head-room',
];

/**
 * Everything the pin needs that only layout knows, in three passes.
 *
 * PASS ONE reads the word: its cap top, its cap height, and where its ink sits
 * inside the box the transform is applied to. Nothing has been changed yet, so
 * these are the page's own numbers.
 *
 * PASS TWO resizes the Panel's masthead to that same cap and reads where it then
 * stands. One word at one size all the way through is the whole of what was
 * asked for, and the only way to have it is for the SLOT to change rather than
 * the word — the word is what the reader is watching. `settle` is the candidate
 * that declines that and takes the masthead as it is.
 *
 * PASS THREE stands the three names on the line the word will land on, which
 * needs pass two's answer, and reserves exactly their height above the
 * subheading so nothing below them moves when they arrive.
 *
 * The transform is neutralised for all three, so every rectangle read here is the
 * layout's own and not the moment's.
 */
function publish(): void {
  const body = document.body;
  const found = parts();
  const wanted = shape();
  mirror();
  for (const name of PUBLISHED) body.style.removeProperty(name);
  if (!wanted || !found) {
    flight = null;
    return;
  }

  body.style.setProperty('--landing-hold-dx', '0px');
  body.style.setProperty('--landing-hold-dy', '0px');
  body.style.setProperty('--landing-hold-scale', '1');

  // ---- pass one: the word ------------------------------------------------
  const link = found.link.getBoundingClientRect();
  const box = found.word.getBoundingClientRect();
  const ink = found.ink.getBoundingClientRect();
  const cap = link.height;
  if (cap <= 0) {
    flight = null;
    return;
  }

  // ---- pass two: the slot ------------------------------------------------
  // 0.7 is this face's cap as a share of its em — the figure landing.css already
  // carries for the same face, and what makes a font-size solvable from a cap.
  if (wanted.size !== 'settle') {
    body.style.setProperty('--landing-word-size', `${(cap / 0.7).toFixed(3)}px`);
  }
  const mastSize = Number.parseFloat(getComputedStyle(found.mast).fontSize) || 0;
  const mast = found.mast.getBoundingClientRect();
  const capTop = mast.top + 0.08 * mastSize;

  // The scale is the two caps, or the page's own width. The x is the one that
  // needs an argument: the origin is the CONTAINER's corner, but the thing that
  // has to land on the page's margin is the INK, which sits a left bearing inside
  // it — and that bearing is scaled too, so what the translation owes at the end
  // is the bearing's FINAL width and not its change.
  const toScale =
    wanted.size === 'settle'
      ? (0.7 * mastSize) / cap
      : wanted.size === 'bleed'
        ? (BLEED * window.innerWidth) / Math.max(1, ink.width)
        : 1;

  flight = {
    capDoc: link.top + window.scrollY,
    boxLeft: box.left,
    lead: ink.left - box.left,
    cap,
    slot: Math.max(0, capTop - link.top),
    // WHERE A HEADER LETS GO. A word held on the screen for as long as there is
    // Panel still has to leave, and the honest way for a header to leave is the
    // way it arrived: it stops being held and the page takes it off the top. So
    // the hold is capped at the distance that puts the picture's own top edge one
    // gap below the word — after which the word rides up and out, plate and all,
    // and there is no frame in which anything is showing through anything else.
    //
    // Both terms are read in the same frame, so the scroll cancels out and this
    // is a constant of the layout: it does not matter where the reader is when it
    // is measured.
    far: Math.max(
      0,
      (found.under?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY) - link.top - 1.6 * cap,
    ),
    toLeft: wanted.size === 'bleed' ? ((1 - BLEED) / 2) * window.innerWidth : mast.left,
    toScale,
  };

  // ---- pass three: the names --------------------------------------------
  // `--landing-names-top` is measured against the PANEL's own box, because that
  // is what the names are positioned inside; `--landing-names-room` is what is
  // reserved for them, so the subheading and everything under it stands where it
  // would have stood anyway.
  if (wanted.names === 'under' && found.names) {
    const panel = found.names.closest<HTMLElement>('[data-section]');
    const names = found.names.getBoundingClientRect();
    const gap = 0.42 * cap;
    if (panel) {
      const top = capTop + cap + gap - panel.getBoundingClientRect().top;
      body.style.setProperty('--landing-names-top', `${top.toFixed(2)}px`);
    }
    body.style.setProperty('--landing-names-room', `${(names.height + gap).toFixed(2)}px`);
  }

  // A header that never lets go needs the Panel's first line to start below it
  // rather than under it. One three-quarter cap and no more: the room is paid for
  // by the reader's scroll, so it is the number here worth being stingy with.
  if (wanted.reach === 'far' && wanted.pin) {
    body.style.setProperty('--landing-head-room', `${(0.75 * cap).toFixed(2)}px`);
  }
}

/** How far the pin has run, in pixels, before anything is done with it. */
function held(): number {
  const wanted = shape();
  if (!wanted || !flight) return 0;
  const reach = wanted.reach === 'far' ? flight.far : flight.slot;
  const want = wanted.line * window.innerHeight;
  return Math.min(reach, Math.max(0, want - (flight.capDoc - window.scrollY)));
}

/**
 * How far the handoff has opened: 0 before the word reaches its resting line, 1
 * once it has settled. Read off the DOM rather than off a cached number, so it
 * cannot be asked before the frame it belongs to — turn.ts asks from its own
 * listener.
 */
export function crossing(): number | null {
  const wanted = shape();
  if (!wanted) return null;
  if (!flight) return 0;
  const reach = wanted.reach === 'far' ? window.innerHeight : flight.slot;
  const arrive = Math.max(1, Math.min(reach, wanted.arrive * window.innerHeight));
  return Math.min(1, held() / arrive);
}

/**
 * How far the three names have CLOSED ON THEIR PLACE under the word.
 *
 * Not --cross, and not their own entry into the window, and both of those were
 * tried. --cross is the word's: it is zero until the word reaches its resting
 * line, so an index drawn against it sits on the screen at nothing for a third of
 * a screen of scrolling, which is a hole where the index should be. Their entry
 * into the window is worse in the other direction — they cross the bottom edge
 * long before the word settles, so the arrival was over before the clip of it
 * started and `rail` and `land` recorded byte for byte identical.
 *
 * So it is the DISTANCE LEFT: 1 when the names are standing where they finish,
 * under the held word and one gap below it, and 0 half a screen short of that.
 * Which is the same clock in both families — a candidate that stands them under
 * the word is measuring the last of their travel, and one that leaves them in the
 * Panel's flow is measuring them coming up the page — and in both it is the thing
 * a reader actually notices.
 */
function arriving(): number {
  const wanted = shape();
  const found = parts();
  if (!wanted || !flight || !found?.names) return 1;
  const height = window.innerHeight;
  const rest = wanted.line * height + flight.cap * flight.toScale + 0.42 * flight.cap;
  const left = found.names.getBoundingClientRect().top - rest;
  return Math.min(1, Math.max(0, 1 - left / Math.max(1, 0.5 * height)));
}

function frame(): void {
  const cross = crossing();
  if (cross === null || !flight) return;
  const body = document.body;
  root.style.setProperty('--cross', String(Math.round(cross * 1000) / 1000));

  // A candidate that does not pin does not touch the word at all — not its
  // place, not its size, not its opacity. Everything it changes is the Panel's.
  const pinned = shape()?.pin === true;
  const scale = pinned ? 1 + cross * (flight.toScale - 1) : 1;
  const dx = pinned ? cross * (flight.toLeft - flight.boxLeft - flight.toScale * flight.lead) : 0;
  body.style.setProperty('--landing-hold-scale', scale.toFixed(4));
  body.style.setProperty('--landing-hold-dx', `${dx.toFixed(2)}px`);
  body.style.setProperty('--landing-hold-dy', `${(pinned ? held() : 0).toFixed(2)}px`);
  body.style.setProperty('--landing-names-cross', arriving().toFixed(3));

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
  // `?cross=stay` chooses a candidate before the first frame rather than a handle
  // called after it. It is how the clips are recorded, and it is how the author
  // opens one on an actual phone.
  const asked = new URLSearchParams(window.location.search).get('cross') ?? '';
  if (asked in CANDIDATES) root.dataset.cross = asked;
  publish();
  frame();
  gsap.ticker.add(frame);
  window.addEventListener('resize', publish);
  // The measurement is of a layout the faces have to have arrived for: a fallback
  // face and the real one give two different masthead boxes, and the pin is the
  // difference between two boxes.
  document.fonts?.ready.then(publish).catch(() => undefined);
}
