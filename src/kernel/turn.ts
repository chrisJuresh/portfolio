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
      root.style.setProperty('--turn', String(state.turn));
      for (const watcher of watchers) watcher(state.turn);
    },
  });

  // Paper when the marked element's top reaches the top of the window, dark a
  // span later. `end` is a FUNCTION and `invalidateOnRefresh` is what makes that
  // worth writing: the span is measured, and a resize that crosses the band —
  // or one that only changes how tall the first Section's content is — has to
  // re-measure it. Without the flag the length is whatever it was at boot.
  const trigger = document.querySelector<HTMLElement>('[data-turn]') ?? root;
  ScrollTrigger.create({
    trigger,
    start: 'top top',
    end: () => `+=${span()}`,
    invalidateOnRefresh: true,
    onUpdate: (self) => timeline.progress(self.progress),
  });

  register(TURN, timeline);
  return timeline;
}
