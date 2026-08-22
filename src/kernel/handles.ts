/**
 * `window.portfolio` — the Kernel's handles, and the only thing on the page a
 * Check or the Editor is allowed to reach for.
 *
 * `timelines` is ADR 0003's seam: ask a named Timeline for a moment and read the
 * frame — with `hold()` called first, or the scroll recomputes it a frame later.
 * The rest are filled in by kernel.ts once the modules that own them have run, so
 * this file can be imported by any of them without importing any of them.
 */
export interface Handles {
  timelines: Map<string, gsap.core.Timeline>;
  observeSection?: (root: HTMLElement) => void;
  toggleTheme?: () => 'light' | 'dark';
  hold?: () => void;
  release?: () => void;
}

declare global {
  interface Window {
    portfolio?: Handles;
  }
}

export function handles(): Handles {
  window.portfolio ??= { timelines: new Map() };
  return window.portfolio;
}

export function register(name: string, timeline: gsap.core.Timeline): void {
  handles().timelines.set(name, timeline);
}
