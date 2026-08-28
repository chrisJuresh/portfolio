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

/** Every Section mount point the Shell laid down. */
export function mountSections(): void {
  for (const root of document.querySelectorAll<HTMLElement>('[data-section]')) {
    observeSection(root);
  }
}
