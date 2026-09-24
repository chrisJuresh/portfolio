import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { portOf } from '../../kernel/page-turn';

/**
 * The **wake**: the Frame switching on as the page lands on this Section.
 *
 * The lights come on one after another and flare as they do, the address types
 * itself while a load line runs under it and the reload glyph turns, the veil
 * over the window's content is drawn down off the recording, a glint crosses the
 * marble, and the engineering points ink in and rise into their places. NOTES.md
 * has the choreography and the one rule it is built round: NOTHING A CHECK
 * MEASURES CHANGES ITS BOX. The Frame's parts are touched only in paint —
 * opacity, a clip, a filter, two pseudo-elements — so the chrome's geometry is
 * the same at every moment, and the only boxes that move are the points', whose
 * column the Check reads as one box.
 *
 * ONE NAMED SEEKABLE TIMELINE (ADR 0003), PAUSED, AND IT ANIMATES AWAY FROM THE
 * MARKUP. Every rule it drives is gated on `data-projects-panel-waking` on the
 * Section, and the attribute is there only while the playhead is short of 1 —
 * so the resting page is the page as it was before this file, byte for byte, and
 * a reader whose scripts never arrive, or who asked for stillness, gets it.
 *
 * THE LIFT'S SHAPE, ONE SECTION UP. A transport tween moves the playhead when the
 * turn settles on this Section's resting place and takes it back when the reader
 * leaves, from wherever it has got to; it yields to anyone else who moves the
 * playhead, so a Check's seek or the Editor's scrub is never scrubbed out from
 * under them. `src/sections/eater-map/timeline.ts` carries the long form of why.
 */

/** Two pixels either side of the resting place. ScrollTrigger's own isActive is
 *  `0 < progress < 1`, so a trigger starting ON the port never fires there. */
const ARRIVE = 2;

/** A thousandth of the wake is "already there", for either end and for a retarget. */
const SLACK = 0.001;

/** How far into the window the stage has to come, outside the band, before it
 *  wakes — there is no resting place to land on out there. */
const INTO_VIEW = 0.7;

const lessMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

function seconds(raw: string, fallback: number): number {
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return fallback;
  return raw.trim().endsWith('ms') ? value / 1000 : value;
}

/** Is this Section a resting place? The band's own rule, read off the cascade the
 *  way `ports()` reads it, rather than a second copy of the breakpoint. */
const isPort = (root: HTMLElement): boolean => getComputedStyle(root).scrollSnapAlign !== 'none';

export default function mountWake(root: HTMLElement): gsap.core.Timeline | void {
  const stage = root.querySelector<HTMLElement>('.projects-panel__stage');
  const points = [...root.querySelectorAll<HTMLElement>('[data-projects-panel-point]')];
  if (!stage || points.length === 0) return;

  gsap.registerPlugin(ScrollTrigger);

  // The lights by position, the real Frame's and the reflection's together, so
  // the window in the stone comes on with the window standing on it.
  const lights = [0, 1, 2].map((n) => [
    ...stage.querySelectorAll<HTMLElement>(`.projects-panel__lights i:nth-child(${n + 1})`),
  ]);
  const address =
    stage.querySelector<HTMLElement>('.projects-panel__address-text')?.textContent?.trim() ?? '';

  const gate = (progress: number) =>
    root.toggleAttribute('data-projects-panel-waking', progress < 1 - SLACK / 10);

  const wake = gsap.timeline({ paused: true, onUpdate: () => gate(wake.progress()) });

  // THE RULER: one inert tween the whole length, so the duration is exactly 1 and
  // every position below is a share of the wake whatever ends last.
  wake.to({ p: 0 }, { p: 1, duration: 1, ease: 'none' }, 0);

  wake
    // The chrome's glyphs, dim to their own ink.
    .fromTo(stage, { '--projects-panel-chrome': 0 }, { '--projects-panel-chrome': 1, duration: 0.14, ease: 'power1.out' }, 0)
    // The address, one character at a time.
    .fromTo(
      stage,
      { '--projects-panel-type': 0 },
      { '--projects-panel-type': 1, duration: 0.26, ease: `steps(${Math.max(1, address.length)})` },
      0.05,
    )
    // The load: the line under the address and the reload glyph's one turn.
    .fromTo(stage, { '--projects-panel-load': 0 }, { '--projects-panel-load': 1, duration: 0.46, ease: 'power2.inOut' }, 0.1)
    // The veil drawn down off the recording.
    .fromTo(stage, { '--projects-panel-reveal': 0 }, { '--projects-panel-reveal': 1, duration: 0.5, ease: 'power3.inOut' }, 0.3)
    // The glint across the marble, last.
    .fromTo(stage, { '--projects-panel-glint': 0 }, { '--projects-panel-glint': 1, duration: 0.44, ease: 'power1.inOut' }, 0.56);

  // Close, minimise, zoom — each overshoots 1, which the stylesheet spends as a
  // flare of brightness that settles as the light does.
  lights.forEach((pair, n) => {
    if (pair.length === 0) return;
    wake.fromTo(
      pair,
      { '--projects-panel-light': 0 },
      { '--projects-panel-light': 1, duration: 0.2, ease: 'back.out(3.2)' },
      0.02 + n * 0.07,
    );
  });

  // The points, in their ranking order, finishing exactly as the wake does.
  const pointsFrom = 0.42;
  const pointTime = 0.34;
  const stagger = points.length > 1 ? (1 - pointsFrom - pointTime) / (points.length - 1) : 0;
  wake.fromTo(
    points,
    { '--projects-panel-point-in': 0 },
    { '--projects-panel-point-in': 1, duration: pointTime, ease: 'power3.out', stagger },
    pointsFrom,
  );

  // Every fromTo has rendered its start values by now, so the Frame is dark; the
  // gate is set to match, before anything could paint the two disagreeing.
  gate(wake.progress());

  // A reader who asked for stillness gets the resting composition and no trigger
  // at all. Still registered and seekable, because the Editor scrubs it and a
  // reader's setting is not the author's.
  if (lessMotion()) {
    wake.progress(1);
    return wake;
  }

  let transport: gsap.core.Tween | null = null;
  const head = { at: 0 };
  let wrote = wake.progress();

  const stop = (): void => {
    transport?.kill();
    transport = null;
  };

  /** Take the wake to `to` from wherever it has got to, in the time that is left. */
  function drive(to: number): void {
    stop();
    const from = wake.progress();
    const distance = Math.abs(to - from);
    const time = seconds(getComputedStyle(root).getPropertyValue('--projects-panel-wake-time'), 1.9);
    if (distance < SLACK || !(time > 0)) {
      wake.progress(to);
      wrote = wake.progress();
      return;
    }
    head.at = from;
    wrote = from;
    transport = gsap.to(head, {
      at: to,
      // Going dark is quicker than waking: a window switched off is switched off.
      duration: time * distance * (to < from ? 0.5 : 1),
      ease: 'none',
      onUpdate: () => {
        if (Math.abs(wake.progress() - wrote) > SLACK) {
          stop();
          return;
        }
        wake.progress(head.at);
        wrote = wake.progress();
      },
      onComplete: () => {
        transport = null;
      },
    });
  }

  /** The stage's top in document pixels. */
  const stageTop = (): number => stage.getBoundingClientRect().top + window.scrollY;

  const trigger = ScrollTrigger.create({
    trigger: root,
    // Inside the band: standing on this Section's resting place, to the pixel,
    // so a turn away starts the window going dark the moment it starts. Outside
    // it: the stage most of the way up the window, for as long as the Section is
    // on screen at all.
    start: () => (isPort(root) ? portOf(root) - ARRIVE : stageTop() - INTO_VIEW * window.innerHeight),
    end: () =>
      isPort(root)
        ? portOf(root) + ARRIVE
        : root.getBoundingClientRect().bottom + window.scrollY,
    invalidateOnRefresh: true,
    onToggle: (self) => drive(arrived(self) ? 1 : 0),
    onRefresh: (self) => drive(arrived(self) ? 1 : 0),
  });

  // Asked of the live scroll, strictly, for the reasons the Lift gives at length.
  function arrived(self: ScrollTrigger): boolean {
    return self.scroll() > self.start && self.scroll() < self.end;
  }

  // A deep link opens the document on this Section and it mounts after the
  // arrival, with the Frame already on screen at rest: waking it from dark there
  // would take the window away to give it back. So a reader who is already here
  // is given the resting composition, and the next arrival wakes it.
  if (arrived(trigger)) {
    wake.progress(1);
    wrote = 1;
  }

  return wake;
}
