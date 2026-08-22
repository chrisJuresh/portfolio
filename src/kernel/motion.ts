import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Stop the scroll driving the Timelines, and start it again.
 *
 * ADR 0003 says a Check asserts choreography by asking a Timeline for a moment.
 * On its own that is not enough: a scrubbed Timeline is recomputed from the
 * scroll position on the next tick, so a `seek()` survives about one frame and a
 * Check that reads geometry after it is a coin toss. This is the missing half —
 * `hold()` first, then seek as many moments as you like, then `release()`.
 *
 * `disable(false)` leaves every Timeline exactly where it is rather than
 * reverting it, so holding does not itself move the page.
 */
export function hold(): void {
  for (const trigger of ScrollTrigger.getAll()) trigger.disable(false);
}

export function release(): void {
  for (const trigger of ScrollTrigger.getAll()) trigger.enable();
  ScrollTrigger.refresh();
}
