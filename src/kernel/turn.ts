import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { register } from './handles';

gsap.registerPlugin(ScrollTrigger);

export const TURN = 'turn';

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
    onUpdate: () => root.style.setProperty('--turn', String(state.turn)),
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
    onUpdate: (self) => timeline.progress(self.progress),
  });

  register(TURN, timeline);
  return timeline;
}
