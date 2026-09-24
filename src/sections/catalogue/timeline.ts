import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * The Catalogue's arrival, scrubbed by the scroll: the masthead closes up out of
 * wide tracking, and as each Entry comes up the screen its Still slides in from
 * its own side while it is uncovered from the spine outward and its picture
 * settles out of a zoom, its words come up line by line, and its number on the
 * spine lights as the drawn tip of the spine reaches it. The spine's drawing is
 * the stylesheet's, off a view timeline, and not this file's — NOTES.md says why.
 *
 * ONE NAMED SEEKABLE TIMELINE (ADR 0003), PAUSED, AND IT ANIMATES AWAY FROM THE
 * MARKUP. The stylesheet rests everything in place, and every custom property
 * written here falls back to its resting value when it is not, so a reader whose
 * scripts never arrive, or who asked for less motion, gets the finished
 * Catalogue. Progress 0 is everything displaced and 1 is the page as the markup
 * reads, scrubbed by one ScrollTrigger spanning the Section exactly as the
 * Kernel's Turn is, so `hold()` freezes it and a Check or the Editor can ask it
 * for a moment.
 *
 * WHERE EACH PART ARRIVES ALONG THE PLAYHEAD IS LAID OUT, NOT CHOSEN. Progress is
 * the share of the Section's own height that has come up past the foot of the
 * window, so a part whose top stands `t` into the Section begins arriving at
 * `t / height` and has arrived once it has risen `--catalogue-reach` of a screen.
 * The spine's tip is drawn at that same line, which is what puts the line on each
 * number just as its Entry settles. NOTES.md carries the arithmetic.
 *
 * READ ONCE AT MOUNT. The positions and the two Tokens spent here are read when
 * the Section mounts; the Tokens the stylesheet spends move under a drag.
 */

/** The shortest arrival, as a share of the whole Timeline — so a Section barely
 *  taller than a screen still hands every part a tween with a length. */
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
  const reach = token(root, '--catalogue-reach', 0.25);

  const timeline = gsap.timeline({ paused: true, onUpdate: () => gate(timeline.progress()) });
  // THE RULER: one inert tween the whole length of the Timeline, so its duration
  // is exactly 1 and progress IS the share of the Section's scroll whatever the
  // last arrival happens to end at.
  timeline.to({ p: 0 }, { p: 1, duration: 1, ease: 'none' }, 0);

  const box = root.getBoundingClientRect();
  const height = Math.max(1, box.height);
  const rise = reach * window.innerHeight;

  /** Where a part whose top is `element`'s arrives: its start and its length. */
  const span = (element: Element): { from: number; length: number } => {
    const top = element.getBoundingClientRect().top - box.top;
    const from = Math.min(1 - AT_LEAST, Math.max(0, top / height));
    const to = Math.min(1, Math.max(from + AT_LEAST, (top + rise) / height));
    return { from, length: to - from };
  };

  /** Add a tween at `at` for `length`, kept inside the ruler so progress stays
   *  the share of the scroll. */
  const at = (start: number, length: number): number => Math.max(0, Math.min(start, 1 - length));

  /** One line coming up to full ink as it rises into place. */
  const line = (element: Element, start: number, length: number): void => {
    timeline.fromTo(
      element,
      { '--catalogue-in': 0 },
      { '--catalogue-in': 1, duration: length, ease: 'power3.out' },
      at(start, length),
    );
  };

  /** What is still arriving, and when it has finished: short of its end each
   *  one carries `data-catalogue-arriving`, which is the only thing that puts the
   *  stylesheet's arrival rules in the cascade. */
  const arriving: { element: HTMLElement; end: number }[] = [];

  // ---- the head ------------------------------------------------------------
  const masthead = root.querySelector('.catalogue__masthead');
  const standfirst = root.querySelector('.catalogue__standfirst');
  if (masthead) {
    const { from, length } = span(masthead);
    timeline.fromTo(
      masthead,
      { '--catalogue-in': 0, '--catalogue-track': 1 },
      { '--catalogue-in': 1, '--catalogue-track': 0, duration: length, ease: 'power3.out' },
      at(from, length),
    );
    if (standfirst) line(standfirst, from + length * 0.25, length * 0.75);
    const head = masthead.closest<HTMLElement>('.catalogue__head');
    if (head) arriving.push({ element: head, end: Math.min(1, from + length) });
  }

  // ---- the Entries -----------------------------------------------------------
  for (const entry of entries) {
    const { from, length } = span(entry);
    // A Still on the left comes in from the left, one on the right from the right.
    const sign = entry.dataset.catalogueSide === 'right' ? 1 : -1;
    const still = entry.querySelector<HTMLElement>('[data-catalogue-still]');
    const station = entry.querySelector<HTMLElement>('.catalogue__station');
    const lines = entry.querySelectorAll('[data-catalogue-note] > *');

    if (still) {
      timeline
        .fromTo(
          still,
          { xPercent: sign * arrive * 100 },
          { xPercent: 0, duration: length, ease: 'power2.out' },
          at(from, length),
        )
        .fromTo(
          still,
          { '--catalogue-reveal': 0 },
          { '--catalogue-reveal': 1, duration: length, ease: 'power3.inOut' },
          at(from, length),
        );
    }
    // The words a line at a time, the last one landing as the Entry does.
    const each = length * 0.6;
    const step = lines.length > 1 ? (length - each - length * 0.1) / (lines.length - 1) : 0;
    lines.forEach((element, n) => line(element, from + length * 0.1 + n * step, each));
    // The number lights as the spine's tip arrives at it — the end of the rise.
    if (station) {
      const lit = length * 0.5;
      timeline.fromTo(
        station,
        { '--catalogue-lit': 0 },
        { '--catalogue-lit': 1, duration: lit, ease: 'back.out(2.6)' },
        at(from + length * 0.75, lit),
      );
    }
    // Its end is its LAST tween's, the number's pop included, so no rule leaves
    // the cascade while something it spends is still moving.
    arriving.push({ element: entry, end: Math.min(1, from + length * 1.25) });
  }

  /** Every rule the arrival spends is gated, so at rest none of them is in the
   *  cascade: a Still's `inset(0)` clip left standing would keep a layer, and a
   *  settled `translate` still makes a stacking context. */
  function gate(progress: number): void {
    for (const { element, end } of arriving) {
      element.toggleAttribute('data-catalogue-arriving', progress < end - 1e-4);
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
  // The trigger drives the playhead and nothing else writes it, which is what
  // makes `hold()` — every trigger disabled, every Timeline left where it is —
  // enough for a Check to read a moment.
  const trigger = ScrollTrigger.create({
    trigger: root,
    start: 'top bottom',
    end: 'bottom bottom',
    invalidateOnRefresh: true,
    onUpdate: (self) => timeline.progress(self.progress),
  });
  timeline.progress(trigger.progress);
  gate(timeline.progress());

  return timeline;
}
