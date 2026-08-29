import gsap from 'gsap';

/**
 * The Eater Map Section's Timeline.
 *
 * One named, seekable object (ADR 0003), and empty: the motion this Section is
 * owed is the **Lift**, which raises the Cards off the Slab, and neither the
 * Slab nor the Cards' places on it exist yet (#176, #177).
 *
 * It is here rather than absent because the convention the build enforces is
 * that every Section has one, and because an empty Timeline is still a Timeline
 * a Check can hold and seek — so the loader, the Check runner and the Variant
 * sheet all have the shape they expect before there is anything to watch.
 *
 * When the Lift arrives it runs FROM flat TOWARDS raised, which is the opposite
 * of the obvious build and the whole reason the Section reads correctly with no
 * script, under reduced motion, and on a narrow window. #177 and NOTES.md.
 */
export default function eaterMapTimeline(_root: HTMLElement): gsap.core.Timeline {
  return gsap.timeline({ paused: true });
}
