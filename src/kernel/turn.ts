import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { crossOwnsTurn } from './cross';
import { register } from './handles';

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
 * A Section says where the crossing happens by marking one element
 * `data-turn`; with nothing marked the Turn spans the document's whole scroll.
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

  // Across the marked element's own scroll: paper when its top reaches the top
  // of the window, dark when its bottom reaches the bottom. The same two edges
  // for the document as for a Section, so the page opens on paper either way —
  // `top bottom` reads better in prose and starts the Turn half-crossed, because
  // an element at the top of the document is already past that edge at load.
  const trigger = document.querySelector<HTMLElement>('[data-turn]') ?? root;
  ScrollTrigger.create({
    trigger,
    start: 'top top',
    end: 'bottom bottom',
    // The `turn` candidate re-anchors the crossing to the word rather than to
    // the document's whole scroll (src/kernel/cross.ts), and then it drives this
    // Timeline itself. Standing aside rather than fighting it: two writers on one
    // progress is a frame of whichever ran second.
    onUpdate: (self) => {
      if (crossOwnsTurn()) return;
      timeline.progress(self.progress);
    },
  });

  register(TURN, timeline);
  return timeline;
}
