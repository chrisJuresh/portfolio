import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * The stub Section's Timeline.
 *
 * One named, seekable object (ADR 0003), returned so the Kernel's loader can
 * register it under this Section's name. Paused and driven from a ScrollTrigger's
 * onUpdate rather than handed to `gsap.timeline({ scrollTrigger })`: both scrub
 * the same, but a paused timeline stays authoritative about its own progress, so
 * a Check that asks it for a moment gets a frame that stays put.
 *
 * It runs FROM the settled state, never towards it. At progress 0 the Section
 * reads exactly as the markup does, so this module failing to arrive costs the
 * motion and nothing else.
 */
export default function stubTimeline(root: HTMLElement): gsap.core.Timeline {
  const risen = root.querySelectorAll('[data-stub-rise]');
  const timeline = gsap.timeline({ paused: true });

  timeline.to(risen, {
    y: (index: number) => -1 * (index + 1) * parseFloat(getComputedStyle(root).getPropertyValue('--stub-rise') || '8'),
    opacity: 0.35,
    duration: 1,
    ease: 'none',
    stagger: 0.05,
  });

  // A reader who asked for less motion gets the Section settled and nothing
  // scrubbing. The Timeline still exists and is still seekable, so a Check reads
  // the same numbers either way.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return timeline;

  ScrollTrigger.create({
    trigger: root,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => timeline.progress(self.progress),
  });

  return timeline;
}
