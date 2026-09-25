import { register } from './handles';

/**
 * What a Section's `timeline.ts` exports: a function handed the Section's root
 * element, returning the Section's Timeline. Returning nothing is allowed — a
 * Section with no motion still mounts, it just registers no Timeline.
 */
export type SectionTimeline = {
  default?: (root: HTMLElement) => gsap.core.Timeline | void;
};

/**
 * One chunk per Section, resolved lazily.
 *
 * The glob is what makes the Section folder convention mechanical rather than
 * described: dropping a folder under src/sections/ with a `timeline.ts` in it is
 * the whole of registering a Section, and there is no list anywhere to forget to
 * add it to. Vite code-splits each match, so a Section's motion is bytes the page
 * does not fetch until the reader is nearly at it.
 */
const timelineModules = import.meta.glob<SectionTimeline>('../sections/*/timeline.ts');

const byName = new Map<string, () => Promise<SectionTimeline>>();
for (const [path, load] of Object.entries(timelineModules)) {
  const name = /\/sections\/([^/]+)\/timeline\.ts$/.exec(path)?.[1];
  if (name) byName.set(name, load);
}

/**
 * How much of a screen ahead of the viewport counts as approaching. Generous on
 * purpose: the point is that the Section's work is done before the reader
 * arrives, not that it is done as late as possible.
 */
const APPROACH = '50%';

async function mount(root: HTMLElement): Promise<void> {
  const name = root.dataset.section;
  if (!name) return;

  // Set before the await, so the Section's own styles can start decoding assets
  // while its Timeline is still in flight.
  root.dataset.mounted = 'pending';

  const load = byName.get(name);
  if (load) {
    // A chunk that will not arrive — a stale deployment, a dead network — must
    // not leave the Section stuck at `pending`. Without this the mount point
    // never reaches `true`, which is the state a Check reads, so the failure
    // shows up as a Section that silently never mounted rather than as an error.
    try {
      const module = await load();
      const timeline = module.default?.(root);
      if (timeline) register(name, timeline);
    } catch (error) {
      console.error(`kernel: the ${name} Section's Timeline did not load`, error);
    }
  }

  root.dataset.mounted = 'true';
  root.dispatchEvent(new CustomEvent('section:mounted', { bubbles: true, detail: { name } }));
}

let observer: IntersectionObserver | undefined;

function sectionObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const root = entry.target as HTMLElement;
        observer?.unobserve(root);
        void mount(root);
      }
    },
    { rootMargin: `${APPROACH} 0px` },
  );
  return observer;
}

/** Mount this element's Section as it approaches the viewport. */
export function observeSection(root: HTMLElement): void {
  if (root.dataset.mounted) return;
  sectionObserver().observe(root);
}

/**
 * How long a page that never goes idle is allowed to put the rest off.
 *
 * A deadline and not a delay: `requestIdleCallback` runs the moment the main
 * thread has nothing to do, which on this page is well under a second after
 * load. This is only what happens if it never does.
 */
const IDLE_BY = 2000;

/** Do this when the main thread has nothing better to do — or by IDLE_BY. */
function whenIdle(run: () => void): void {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => run(), { timeout: IDLE_BY });
    return;
  }
  window.setTimeout(run, IDLE_BY);
}

/**
 * Everything the reader has not reached, one Section at a time, while nothing
 * else is happening.
 *
 * THE OBSERVER ABOVE IS ABOUT BYTES AND NOT ABOUT WHEN THE WORK LANDS, and inside
 * the landing band those two came apart badly. The second Section is one wheel
 * notch away at the top of the document, so "approaching" IS the middle of the
 * reader's first page turn — and that is where the Eater Map's hundred and
 * forty-four slices, its glass measurements and its leader lines were built, on a
 * frame the page was moving through. Measured at 1536x760: one task of 100-230ms
 * in the middle of the first turn, which is the worst hitch on the page and the
 * only one that is not a per-frame cost. It also moved the ground under the turn
 * itself — a Section that grows as it mounts moves the resting place the ease is
 * already flying towards.
 *
 * So the approach is the DEADLINE now and the idle time is the opportunity. The
 * chunks are still split and still fetched late, which is what the glob above is
 * for; what changes is that they are fetched with a still page rather than a
 * moving one, and the observer stays as the answer for a reader who gets there
 * before the browser is idle.
 *
 * ONE AT A TIME, AND ASKING FOR IDLE AGAIN BETWEEN THEM: mounting a Section is
 * tens of milliseconds of work, so a queue drained in one callback is the same
 * long task moved rather than broken up.
 */
function mountRest(queue: HTMLElement[]): void {
  const next = queue.shift();
  if (!next) return;
  const again = () => whenIdle(() => mountRest(queue));
  if (next.dataset.mounted) {
    again();
    return;
  }
  observer?.unobserve(next);
  void mount(next).finally(again);
}

/**
 * How long the page's opening is allowed to put the rest off. Longer than the
 * Front Screen's reveal at its Token's current tempo, so this is only what
 * happens if an opening animation is lengthened past all reason.
 */
const OPENING_BY = 4000;

/**
 * Once whatever the page opened with has finished moving — or by OPENING_BY.
 *
 * IDLE IS NOT STILL. The Front Screen composes itself for its first seconds,
 * and most of that reveal is masks, clips, filters and tracking, which Chromium
 * animates on the main thread. `requestIdleCallback` fires in the gaps between
 * those frames, well inside the reveal, so the queue below used to land its
 * first mount — the Eater Map's, one task of 150-250ms, and over a second on a
 * slower machine — half a second into the opening, and every track stood still
 * for the length of it. The finite animations running when the Kernel boots are
 * that opening; an infinite one (the Moonlight's breath) never finishes and is
 * not one, and a scroll-driven one is not on the document's clock at all.
 */
function whenOpened(run: () => void): void {
  const opening = document
    .getAnimations()
    .filter(
      (animation) =>
        animation.timeline === document.timeline &&
        Number.isFinite(Number(animation.effect?.getComputedTiming().endTime)),
    )
    .map((animation) => animation.finished.catch(() => {}));
  let ran = false;
  const once = () => {
    if (ran) return;
    ran = true;
    run();
  };
  void Promise.all(opening).then(once);
  window.setTimeout(once, OPENING_BY);
}

/** Every Section mount point the Shell laid down. */
export function mountSections(): void {
  const roots = [...document.querySelectorAll<HTMLElement>('[data-section]')];
  for (const root of roots) observeSection(root);
  whenOpened(() => whenIdle(() => mountRest(roots)));
}
