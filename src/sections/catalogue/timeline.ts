import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * The Catalogue's arrival: as each Entry comes up the screen its Still slides in
 * from its own side and its words come up to full ink.
 *
 * ONE NAMED SEEKABLE TIMELINE (ADR 0003), PAUSED, AND IT ANIMATES AWAY FROM THE
 * MARKUP. The stylesheet rests every Entry in place — no transform, full ink — so
 * a reader whose scripts never arrive, or who asked for less motion, gets the
 * finished Catalogue for nothing. Progress 0 is every Entry displaced and 1 is the
 * page as the markup reads, and the playhead is scrubbed by one ScrollTrigger
 * spanning the Section exactly as the Kernel's Turn is, so `hold()` freezes it
 * and a Check or the Editor can ask it for a moment.
 *
 * WHERE EACH ENTRY ARRIVES ALONG THE PLAYHEAD IS LAID OUT, NOT CHOSEN. The trigger
 * runs from the Section's top meeting the window's foot to its foot meeting the
 * same edge, so progress is the share of the Section's own height that has come up
 * past the foot of the window. An Entry whose top stands `t` into the Section
 * therefore begins arriving at `t / height` and has arrived once it has risen a
 * quarter of a screen — which puts every Entry standing above the foot of the
 * window at rest by the time the page turn lands on this Section's port, and only
 * what is still below the fold mid-arrival. NOTES.md carries the arithmetic.
 *
 * READ ONCE AT MOUNT. The positions are laid out from the Entries' own boxes when
 * the Section mounts, and the two Tokens the motion spends are read then too, so
 * a resize that changes an Entry's place, or a drag of either Token, shows on the
 * next reload. The Stills are boxes of a stated shape rather than pictures that
 * arrive late, so nothing here moves the layout after mount.
 */

/** How much of a screen an Entry rises before it has arrived. */
const REACH = 0.25;

/** The shortest arrival, as a share of the whole Timeline — so a Section barely
 *  taller than a screen still hands every Entry a tween with a length. */
const AT_LEAST = 0.02;

const lessMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/** A Token off the Section's root as a number, or the fallback if it does not read. */
function token(root: HTMLElement, name: string, fallback: number): number {
  const read = Number.parseFloat(getComputedStyle(root).getPropertyValue(name));
  return Number.isFinite(read) ? read : fallback;
}

export default function mountCatalogue(root: HTMLElement): gsap.core.Timeline | void {
  // A reader who asked for less motion gets the Catalogue as the markup reads it,
  // and no Timeline is registered: one that scrubbed nothing would be the failure
  // the `moments` Check exists to catch.
  if (lessMotion()) return;
  const entries = [...root.querySelectorAll<HTMLElement>('[data-catalogue-entry]')];
  if (entries.length === 0) return;

  const arrive = token(root, '--catalogue-arrive', 0.06);
  const dim = token(root, '--catalogue-arrive-dim', 0.35);

  const timeline = gsap.timeline({ paused: true });
  // THE RULER: one inert tween the whole length of the Timeline, so its duration
  // is exactly 1 and progress IS the share of the Section's scroll whatever the
  // last Entry's arrival happens to end at.
  timeline.to({ p: 0 }, { p: 1, duration: 1, ease: 'none' }, 0);

  const box = root.getBoundingClientRect();
  const height = Math.max(1, box.height);
  const screen = window.innerHeight;
  for (const entry of entries) {
    const top = entry.getBoundingClientRect().top - box.top;
    const from = Math.min(1, Math.max(0, top / height));
    const to = Math.min(1, Math.max(from + AT_LEAST, (top + REACH * screen) / height));
    const duration = Math.max(AT_LEAST, to - from);
    // A Still on the left comes in from the left, one on the right from the right.
    const sign = entry.dataset.catalogueSide === 'right' ? 1 : -1;
    const still = entry.querySelector<HTMLElement>('[data-catalogue-still]');
    const note = entry.querySelector<HTMLElement>('[data-catalogue-note]');
    if (still) {
      timeline.fromTo(
        still,
        { xPercent: sign * arrive * 100 },
        { xPercent: 0, duration, ease: 'none' },
        from,
      );
    }
    if (note) {
      timeline.fromTo(
        note,
        { opacity: dim },
        { opacity: 1, duration, ease: 'none' },
        from,
      );
    }
  }

  // EVERY TWEEN RENDERS ITS START VALUES THE MOMENT IT IS BUILT — GSAP's default
  // for `fromTo`, kept on purpose. A tween the playhead has not reached is
  // otherwise never rendered at all, so at progress 0 an Entry below the first
  // one stands at REST, exactly as it does at progress 1, and the two ends of the
  // Timeline read as the same frame: the `moments` Check's "nothing moves", on a
  // Timeline that moves eight things. Rendered at build, the whole Catalogue
  // stands displaced at 0 and settled at 1, and the trigger's own progress is
  // written straight after so the frame the reader is on is the one drawn.
  //
  // Paper to dark is the Turn's; this is the same shape one Section down. The
  // trigger drives the playhead and nothing else writes it, which is what makes
  // `hold()` — every trigger disabled, every Timeline left where it is — enough for
  // a Check to read a moment.
  const trigger = ScrollTrigger.create({
    trigger: root,
    start: 'top bottom',
    end: 'bottom bottom',
    invalidateOnRefresh: true,
    onUpdate: (self) => timeline.progress(self.progress),
  });
  timeline.progress(trigger.progress);

  return timeline;
}
