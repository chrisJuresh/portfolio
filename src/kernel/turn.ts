import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { register } from './handles';
import { ports } from './page-turn';

gsap.registerPlugin(ScrollTrigger);

export const TURN = 'turn';

/**
 * Anything drawn against the Turn that CSS cannot draw for itself.
 *
 * The Turn is a number and most of the page reads it as one — `--turn` mixes
 * every colour on the page out of it. The Cut Title's morph cannot: eight letters
 * interpolated between two sets of outlines is arithmetic, so it needs the number
 * rather than a property carrying it.
 *
 * Called from the Timeline's own `onUpdate` and from nowhere else, which is what
 * makes a seek enough: `timelines.get('turn').seek(0.5)` redraws the letters, so
 * the morph is assertable through exactly the seam ADR 0003 asks for and the
 * Editor's scrub moves it without moving the page.
 */
type Watcher = (turn: number) => void;
const watchers: Watcher[] = [];

/** Draw against the Turn. Called at once with where the Turn already is. */
export function onTurn(watcher: Watcher): void {
  watchers.push(watcher);
  watcher(Number(getComputedStyle(document.documentElement).getPropertyValue('--turn')) || 0);
}

/** The one-screen band, restated. src/kernel/landing.css owns it. */
const BAND = '(min-width: 1100px) and (min-height: 700px)';

/**
 * HOW FAR THE READER SCROLLS TO CROSS, and the whole of what makes the Turn the
 * same crossing at every window rather than two different ones.
 *
 * IN THE BAND IT IS ONE WHEEL NOTCH: from the first resting place to the SECOND,
 * which is where the Projects Panel lands. The page is paper on the first port
 * and dark on the second, and there is nowhere in between to come to rest.
 *
 * IT USED TO SAY "the document's whole scroll", AND THAT WAS THE SAME NUMBER
 * RIGHT UP UNTIL A THIRD SECTION LANDED. With two Sections the second port IS
 * the foot of the document — 677px at 1536x760, to the pixel, on both readings.
 * With three the document's scroll is two notches long, so spanning it would
 * leave the Panel a shade off black at its own resting place and finish the
 * crossing in a Section that has nothing to do with it. The crossing is the page
 * turn, and the page turn is one notch; ports() is where the resting places are
 * read off the cascade, so this asks that rather than counting Sections.
 *
 * OUT OF THE BAND IT IS THE FOLD GOING PAST, and it has to be stated rather than
 * inherited. The document out here is as tall as its content, so the document's
 * whole scroll spreads one crossing over every screen there is: the page is still
 * a quarter short of black by the time the Projects Panel owns the screen — a
 * grey Section, at rest, on a page that has finished turning everywhere except in
 * its own colours. The crossing that means something is the FIRST SECTION going
 * past, which is exactly the fold the band snaps across, so that is what this
 * spans: dark by the moment the Panel's top edge reaches the top of the window,
 * and dark for the rest of the scroll.
 *
 * Measured rather than assumed — out here the first Section is as tall as its
 * content and only floored at the fold, so a phone crosses over more than a
 * screen and a wide short window over exactly one. Capped at the scroll the
 * document actually has, so a page too short to finish the crossing arrives at
 * dark on its last pixel instead of never arriving.
 */
function span(): number {
  const doc = document.documentElement;
  const scroll = Math.max(1, doc.scrollHeight - window.innerHeight);
  if (window.matchMedia(BAND).matches) {
    // The second resting place, or the whole scroll if there is somehow only
    // one: a band with nothing to turn to still crosses rather than standing on
    // paper for the length of the document.
    return Math.max(1, Math.min(scroll, ports()[1] ?? scroll));
  }
  const first = document.querySelector<HTMLElement>('[data-section]');
  const fold = first?.getBoundingClientRect().height ?? window.innerHeight;
  return Math.max(1, Math.min(scroll, fold));
}

/**
 * WHERE THE TURN IS WRITTEN, and why that is a list of boxes and not the root.
 *
 * Chromium restyles every element under a box whose inherited custom property
 * changed, whether or not anything reads it, so the Turn written on the root was
 * a whole-document restyle on every frame of the first page turn — ~15ms at
 * 1440x900, and that turn ran at 40fps against 60 (src/kernel/NOTES.md). `--turn` does not inherit now
 * (ground.css): it is written on the root, whose own paint reads it, and on each
 * of the body's top-level boxes, which pass it down inside themselves.
 *
 * A box goes in CROSSING if the reader can see any of it while the Turn is
 * between its ends — fixed, or overlapping the window anywhere from the
 * crossing's first scroll to its last — and those are written every frame. The
 * rest are SETTLED: the Eater Map and the Catalogue, which are most of the
 * document and are only ever on the screen once the page has arrived. They are
 * written when the Turn reaches either end, when it is moved by anything but the
 * scroll (a Check's seek, the Editor's scrub, a Variant's render), and once the
 * scroll has been still for a moment, so a sort that a later layout has made
 * stale costs one late frame rather than a wrong colour.
 *
 * SETTLED IS READ LIVE rather than listed, so a box appended to
 * the body after the sort — the Panel's lens filters are — is still written.
 * Rewriting a value a box already holds costs nothing (measured: 0.00ms against
 * 6.3ms for a change on the Eater Map), so nothing has to remember what was
 * written. Before the first sort nothing is CROSSING, which writes every box:
 * correct at the cost of the old restyle, for however few frames that is.
 */
const STILL_MS = 150;
type Box = HTMLElement | SVGElement;
let crossing: Box[] = [];
let scrolling = false;
let pending = 0;

function isBox(element: Element): element is Box {
  if (['SCRIPT', 'STYLE', 'TEMPLATE', 'LINK', 'META'].includes(element.tagName)) return false;
  return element instanceof HTMLElement || element instanceof SVGElement;
}

function sort(start: number, end: number): void {
  const reach = end + window.innerHeight;
  crossing = [];
  for (const box of [...document.body.children].filter(isBox)) {
    const { position } = getComputedStyle(box);
    const rect = box.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    // A pixel of grace at each end: a box that only TOUCHES the crossing's
    // last screen — the Eater Map, whose top is the Panel's foot — is not seen.
    const seen =
      position === 'fixed' || position === 'sticky' || (rect.bottom + window.scrollY > start + 1 && top < reach - 1);
    if (seen) crossing.push(box);
  }
}

function write(turn: number): void {
  const value = String(turn);
  document.documentElement.style.setProperty('--turn', value);
  for (const box of crossing) box.style.setProperty('--turn', value);
  window.clearTimeout(pending);
  if (!scrolling || turn === 0 || turn === 1) settled(value);
  else pending = window.setTimeout(() => settled(value), STILL_MS);
}

function settled(value: string): void {
  for (const box of document.body.children) {
    if (isBox(box) && !crossing.includes(box)) box.style.setProperty('--turn', value);
  }
}

/**
 * The Turn: the Portfolio crossing from paper into dark as the reader scrolls.
 *
 * Built PAUSED and driven from a separate ScrollTrigger rather than handed to
 * `gsap.timeline({ scrollTrigger })`. Both scrub identically; the difference is
 * that a paused timeline stays authoritative about its own progress, so
 * `seek(0.34)` produces a frame that stays put until the reader scrolls again.
 * That is the whole reason ADR 0003 asks for a named seekable Timeline — it is
 * how a Check asserts the crossing and how the Editor scrubs it.
 *
 * A Section says where the crossing STARTS by marking one element `data-turn`;
 * with nothing marked it starts at the top of the document. How far it runs from
 * there is `span()` above, and it is not the same length in both regimes.
 */
export function createTurn(): gsap.core.Timeline {
  const root = document.documentElement;
  const state = { turn: 0 };

  const timeline = gsap.timeline({ paused: true });
  timeline.to(state, {
    turn: 1,
    duration: 1,
    ease: 'none',
    onUpdate: () => {
      write(state.turn);
      for (const watcher of watchers) watcher(state.turn);
    },
  });

  /**
   * The span, published as a length, because one thing outside this file has to
   * know how far the crossing runs and cannot work it out for itself.
   *
   * That thing is the Effect Stack. Its veil is a function of `--turn`, so the
   * whole stack is masked to nothing once the Turn has finished — and everything
   * below the deepest pixel the reader can see while it is still open is a
   * layer that is filtered, blended and masked for no one. CSS can measure
   * neither the first Section's height nor a resting place, so it cannot know
   * where that is; this is the one number it needs, and effect-stack.css does
   * the rest of the arithmetic in the Tokens' own terms.
   *
   * A LENGTH AND NOT THE HEIGHT ITSELF. What is published is what this file
   * knows — how far the reader scrolls to cross — and not a box for somebody
   * else's element. Which is what keeps `--fx-veil-to` a Token that stays in
   * CSS: a stack that gives up early because its author finished the veil early
   * is that Token's business, not this file's.
   */
  const publish = () => root.style.setProperty('--turn-span', `${span()}px`);

  // Paper when the marked element's top reaches the top of the window, dark a
  // span later. `end` is a FUNCTION and `invalidateOnRefresh` is what makes that
  // worth writing: the span is measured, and a resize that crosses the band —
  // or one that only changes how tall the first Section's content is — has to
  // re-measure it. Without the flag the length is whatever it was at boot.
  //
  // `onRefresh` is where the published length is kept honest, and it is the same
  // moment `end` is asked for: every re-measure that moves the crossing moves
  // the stack's foot with it — and re-sorts which boxes the crossing is seen in,
  // since a resize moves those too.
  const trigger = document.querySelector<HTMLElement>('[data-turn]') ?? root;
  ScrollTrigger.create({
    trigger,
    start: 'top top',
    end: () => `+=${span()}`,
    invalidateOnRefresh: true,
    onRefresh: (self) => {
      publish();
      sort(self.start, self.end);
      write(state.turn);
    },
    onUpdate: (self) => {
      scrolling = true;
      timeline.progress(self.progress);
      scrolling = false;
    },
  });

  publish();

  register(TURN, timeline);
  return timeline;
}
