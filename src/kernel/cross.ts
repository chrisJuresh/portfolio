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
  | 'swap'
  | 'edge'
  | 'edge-deep'
  | 'edge-late'
  | 'edge-hold'
  | 'edge-wash'
  | 'edge-sweep';

/**
 * THE TURN AS AN EDGE — where the dark starts, and how it climbs.
 *
 * Out of the band the Turn is a MIX: --ground carries the whole document from
 * paper into dark together, so every frame between the two ends is a grey wash
 * with a grey word in it. In the band it reads as an edge instead, and that is
 * not a different device — it is the FOLD. The Front Screen ends under the word,
 * the Panel below it is already black, so the boundary between the two crosses
 * PROJECTS about half way up and the word's own cut is where the dark begins.
 *
 * Out here there is no fold, so the edge has to be drawn. All four numbers are
 * about the word, because the word is what it is drawn against:
 *
 *   `from` and `to` are where the word's cap top is, as a share of the window,
 *   when the climb starts and when it finishes — so the edge is clocked on the
 *   word's own travel up the screen rather than on a scroll distance, and it
 *   arrives when the word does at every viewport.
 *
 *   `margin` is the air left above the cap once it has finished, in caps. This
 *   is the "with some margin" in the ask, and it is also what buys the gap
 *   below the contact block: a word that ends up with a cap of black above it
 *   needs a cap of paper above it to take it from, or the climb runs over the
 *   last contact line while there is still white on the screen.
 *
 *   `wash` softens the boundary, in caps. 0 is a cut.
 */
interface Edge {
  from: number;
  to: number;
  margin: number;
  wash: number;
}

interface Shape {
  /** Whether this candidate replaces the Panel's masthead with the word at all.
   *  `fixed` does not: it is the page as it stands, with the two plain bugs out
   *  of it and nothing else touched, and it is what the rest are judged against. */
  join: boolean;
  /** Where up the window the word comes to rest, as a fraction of the window. */
  line: number;
  /** Whether the word is held on that line, or simply rides past it. */
  pin: boolean;
  /** How far the pin may run: to the masthead's slot, for as long as there is
   *  Panel to read under it, or a stated number of the word's own caps. */
  reach: 'slot' | 'far' | 'caps';
  /** What `caps` means, when that is the reach. In caps of the word. */
  caps: number;
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
  /** Whether the dark arrives as an edge climbing through the word, and how. */
  edge: Edge | null;
}

const KEEP: Shape = {
  join: true,
  line: 0.1,
  pin: true,
  reach: 'slot',
  caps: 2.7,
  arrive: 0.2,
  size: 'keep',
  names: 'under',
  turn: false,
  edge: null,
};

/**
 * The edge family's spine: the word is the page's own, untouched, and what
 * changes underneath it is where the dark starts.
 *
 * `pin: false` is `under` — the least that can be done and still be an answer.
 * `turn: true` is the paper crossing on the crossing's own number rather than
 * over the document's whole scroll, which is what stops the grey wash.
 * `names: 'flow'` leaves the three names where the Panel puts them, which out
 * here is directly under the word once the duplicate masthead has gone.
 */
const RISE: Shape = {
  ...KEEP,
  pin: false,
  reach: 'far',
  arrive: 0.25,
  names: 'flow',
  turn: true,
  edge: { from: 0.72, to: 0.06, margin: 0.5, wash: 0 },
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

  /* ---- the edge family --------------------------------------------------
     `under` for the word, `swap` for the ground, and the ground is now an EDGE:
     it starts half way up PROJECTS the way the fold does in the band, and it
     climbs as the word rides up the screen until the word is standing on black
     with air above it. The six differ in when it climbs and how far past the
     word it goes. */

  /* the literal reading: the climb runs the length of the word's own travel, and
     it stops half a cap above the cap top */
  edge: { ...RISE },

  /* the same, ending with a cap and a sixth of black above the word — the air
     the band's landing leaves over it, rather than the least that reads as a
     margin */
  'edge-deep': { ...RISE, edge: { from: 0.72, to: 0.06, margin: 1.15, wash: 0 } },

  /* the dark waits. It sits at the word's middle for the first two thirds of the
     travel and then closes over it in the last, so the reader has read the word
     half lit for a while before the page takes it */
  'edge-late': { ...RISE, edge: { from: 0.34, to: 0.06, margin: 0.5, wash: 0 } },

  /* the literal reading, and then the word STOPS: the `land` handoff, 2.7 caps
     of it, so the page and the index run up under a word that is standing still
     with the dark already closed over it */
  'edge-hold': {
    ...RISE,
    pin: true,
    reach: 'caps',
    caps: 2.7,
    line: 0.1,
    arrive: 0.24,
    edge: { from: 0.72, to: 0.1, margin: 0.5, wash: 0 },
  },

  /* the boundary is a veil rather than a cut — two caps of gradient, so the dark
     arrives as something the word sinks into instead of a line crossing it */
  'edge-wash': { ...RISE, edge: { from: 0.72, to: 0.06, margin: 0.6, wash: 0.8 } },

  /* the one that argues with the ask. The dark OVERTAKES the word: it starts
     climbing the moment the word appears at the foot of the screen and has
     closed over it by the middle, so the word finishes its travel already on
     black instead of arriving with it */
  'edge-sweep': { ...RISE, edge: { from: 1, to: 0.46, margin: 0.9, wash: 0 } },
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
  /** How far the drawing's own top edge stands ABOVE the cap top. The lit copy
   *  of the word is masked in the drawing's coordinates and the edge is stated
   *  in the cap's, so this is what carries one into the other. */
  inkLead: number;
  /** The foot of the last thing that has to stay on paper — the contact block —
   *  in the document. The climb is clamped to it, so the edge cannot take the
   *  linkedin line while there is still white on the screen however the four
   *  numbers above are set. */
  overDoc: number;
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
  over: HTMLElement | null;
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
    over: document.querySelector<HTMLElement>('[data-landing-over]'),
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
  const edges = shape()?.edge != null;
  for (const section of document.querySelectorAll<HTMLElement>('[data-section]')) {
    if (named) section.dataset.cross = named;
    else delete section.dataset.cross;
    if (joins) section.dataset.join = '';
    else delete section.dataset.join;
    if (edges) section.dataset.edge = '';
    else delete section.dataset.edge;
  }
  if (joins) root.dataset.join = '';
  else delete root.dataset.join;
  // The plate is the Kernel's own element and is therefore the one thing here
  // that a `:root` selector can reach.
  if (edges) root.dataset.edge = '';
  else delete root.dataset.edge;
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
  '--landing-edge-gap',
  '--landing-edge-top',
  '--landing-edge-word',
  '--landing-edge-cut',
  '--landing-edge-wash',
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
  // THE CAP IS READ FIRST AND ON ITS OWN, because the gap below is a function of
  // it and everything after the gap is a function of the gap. There is no cycle
  // in that — a margin above the word does not change how tall the word is — but
  // there is an ORDER, and reading the whole rect once at the top and using it
  // after the margin had moved is exactly the bug it would look like.
  const cap = found.link.getBoundingClientRect().height;
  if (cap <= 0) {
    flight = null;
    return;
  }

  // THE AIR ABOVE THE WORD, and it belongs to the edge rather than to taste. A
  // climb that finishes `margin` caps above the cap top needs at least that much
  // paper up there to finish IN, or it takes the last contact line with it while
  // there is still white on the screen — which is the one thing the ask rules
  // out. A third of a cap on top of the margin is the clearance that leaves.
  // The Front Screen takes the larger of this and its own rhyme, so a window
  // where the rhyme is already generous is not made airier still.
  if (wanted.edge) {
    body.style.setProperty(
      '--landing-edge-gap',
      `${((wanted.edge.margin + 0.35) * cap).toFixed(2)}px`,
    );
    body.style.setProperty('--landing-edge-wash', `${(wanted.edge.wash * cap).toFixed(2)}px`);
  }

  const link = found.link.getBoundingClientRect();
  const box = found.word.getBoundingClientRect();
  const ink = found.ink.getBoundingClientRect();

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
    inkLead: link.top - ink.top,
    overDoc:
      (found.over?.getBoundingClientRect().bottom ?? Number.NEGATIVE_INFINITY) + window.scrollY,
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

  // The edge family's is smaller and buys something else: the word does not go
  // anywhere, so nothing has to clear it — this is only the air between the word
  // and the three names it is an index of, which ship hard against each other
  // once the duplicate masthead between them has gone.
  if (wanted.edge) {
    body.style.setProperty('--landing-head-room', `${(0.4 * cap).toFixed(2)}px`);
  }
}

/** How far the pin is allowed to run, in pixels. */
function reachOf(wanted: Shape, tall: number): number {
  if (!flight) return 0;
  if (wanted.reach === 'far') return flight.far;
  if (wanted.reach === 'caps') return Math.min(flight.far || tall, wanted.caps * flight.cap);
  return flight.slot;
}

/** How far the pin has run, in pixels, before anything is done with it. */
function held(): number {
  const wanted = shape();
  if (!wanted || !flight) return 0;
  const want = wanted.line * window.innerHeight;
  return Math.min(
    reachOf(wanted, window.innerHeight),
    Math.max(0, want - (flight.capDoc - window.scrollY)),
  );
}

/**
 * Where the word's cap top actually IS on the screen — the flow's answer plus
 * whatever the pin is holding it back by.
 *
 * The edge is clocked on this and not on the scroll, which is the whole reason
 * it exists: a pinned word stops moving up the screen, so a climb clocked on the
 * scroll would go on climbing past a word that had stopped, and one clocked on
 * the untransformed position would climb past a word that only LOOKS stopped.
 */
function capTopScreen(): number {
  if (!flight) return 0;
  const pinned = shape()?.pin === true;
  return flight.capDoc - window.scrollY + (pinned ? held() : 0);
}

/**
 * How far BELOW the word's cap top the dark starts, in pixels. Half a cap at
 * rest — the fold's own answer — climbing to `margin` caps ABOVE it, which is
 * why this goes negative.
 *
 * THE CLAMP IS NOT THE SAME KIND OF NUMBER as the three above it. `from`, `to`
 * and `margin` are a candidate's argument; the clamp is the ask's one hard
 * constraint — the contact block may not be taken by the dark while there is
 * still paper on the screen — and it holds whatever those three are set to. It
 * is written in DOCUMENT coordinates and compared against the edge's, so a
 * viewport where the gap turned out too small loses some of its margin instead
 * of losing the rule. `--landing-edge-gap` is sized so it never binds, and the
 * `edge-margin` Check is what says so at each viewport rather than at one.
 */
function edgeBelowCap(): number {
  const wanted = shape();
  if (!wanted?.edge || !flight) return 0;
  const { from, to, margin } = wanted.edge;
  const tall = window.innerHeight;
  const run = Math.max(1, (from - to) * tall);
  const climb = Math.min(1, Math.max(0, (from * tall - capTopScreen()) / run));
  const below = 0.5 * flight.cap + climb * (-margin * flight.cap - 0.5 * flight.cap);
  const floor = flight.overDoc + 0.35 * flight.cap - flight.capDoc;
  return Math.max(below, floor);
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
  // AN EDGE CANDIDATE'S CROSSING IS THE CLIMB, not the pin: five of the six do
  // not pin at all, so a --cross read off the hold would be zero for the whole
  // page and the letterforms would never turn. It is the same number the dark is
  // drawn from, which is the point of the family — the word turns out of Friz
  // Quadrata into the sans exactly as the dark takes it.
  if (wanted.edge) {
    const span = (0.5 + wanted.edge.margin) * flight.cap;
    return Math.min(1, Math.max(0, (0.5 * flight.cap - edgeBelowCap()) / Math.max(1, span)));
  }
  const reach = wanted.reach === 'far' ? window.innerHeight : reachOf(wanted, window.innerHeight);
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
  // THE EDGE FAMILY MEASURES THE SAME THING AGAINST A DIFFERENT DATUM, and it
  // has to. The clock below is the distance left to a resting line, and it works
  // because a pinned word stops while the names keep coming. Under an UNPINNED
  // word the names sit a fixed distance beneath it and the two travel together —
  // so that distance is a constant of the layout, and an index drawn from it
  // would be at one opacity for the whole page. What a reader notices instead is
  // the index coming up the screen, so that is what these count: nothing at
  // seven eighths of the way down, whole by the time it reaches the top third.
  if (wanted.edge) {
    const left = found.names.getBoundingClientRect().top - 0.28 * height;
    return Math.min(1, Math.max(0, 1 - left / Math.max(1, 0.6 * height)));
  }
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

  // ---- the edge ----------------------------------------------------------
  // Two numbers for one line, in two coordinate systems, because the line is
  // drawn twice. The PLATE is fixed to the viewport — it has to be, because a
  // pinned word is held by a transform and a plate in the document's flow would
  // stay behind while the word it belongs to did not. The MASK is in the
  // drawing's own box, and is what makes the letters read white below the line
  // and dark above it without a blend mode: the lit copy of the word is simply
  // not painted above it.
  const wanted = shape();
  let edgeTop = Number.POSITIVE_INFINITY;
  if (wanted?.edge) {
    const below = edgeBelowCap();
    edgeTop = capTopScreen() + below;
    body.style.setProperty('--landing-edge-top', `${edgeTop.toFixed(2)}px`);
    body.style.setProperty('--landing-edge-word', `${(below + flight.inkLead).toFixed(2)}px`);
    // The same line a third time, in the CUT's box, for the one candidate that
    // holds the word: a held word needs the page to go BEHIND it rather than
    // through it, and the plate that does that is the word's own.
    body.style.setProperty('--landing-edge-cut', `${below.toFixed(2)}px`);
  }

  for (const watcher of watchers) watcher(cross);

  // THE TURN, WHEN THE CROSSING OWNS IT. For the handoff family it is the
  // handoff; for the edge family it is what happens AFTER the edge, and that
  // difference is the whole reason the wash went away. --turn mixes every colour
  // on the page at once, so running it while the edge is still climbing paints
  // the paper above the line grey — which is the banding this family exists to
  // remove. So it stays at 0 for the entire climb and only starts once the line
  // has left the top of the screen, by which point every pixel the reader can
  // see is the plate or the Panel and the crossing underneath it is invisible.
  // What it is actually for by then is the Effect Stack: the veil takes the
  // paper treatment out with the paper, one screen after the paper has gone.
  if (crossOwnsTurn()) {
    const after = Math.min(1, Math.max(0, -edgeTop / (0.6 * window.innerHeight)));
    handles().timelines.get('turn')?.progress(wanted?.edge ? after : cross);
  }
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
