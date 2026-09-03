/**
 * Who owns the wheel.
 *
 * The Portfolio has two things a wheel notch can mean at once: spinning the
 * Front Screen's photographs, and turning the page to the Section below. They
 * cannot both read the same notch, and which one should have it is not a
 * question either of them can answer on its own — so the Kernel answers it, and
 * both ask.
 *
 * A GESTURE BELONGS TO WHATEVER IT BEGAN ON, AND KEEPS IT UNTIL THE WHEEL STOPS.
 * Begun on a roll, the roll holds it even after running out of travel, so the
 * notch that reaches the end of the photographs cannot also turn the page — stop,
 * and scroll again, to leave the roll. Begun on the page, the page holds it, so a
 * page turn is never hijacked half way by a roll arriving under a pointer that
 * was nowhere near it when the scroll started.
 *
 * IN THE CAPTURE PHASE, because the owner has to be settled before either
 * claimant's own handler runs — including for events a roll never sees.
 *
 * AND THE GESTURE IS COUNTABLE, because "until the wheel stops" is a boundary a
 * claimant needs for its own reasons and not only for this one. A mouse notch is
 * one event, so a claimant deciding per event and one deciding per gesture were
 * the same thing while a mouse was the only device; a trackpad delivers one light
 * flick as dozens of events and its momentum tail as dozens more. A claimant
 * that has to act ONCE per gesture — the page turn does — asks `wheelGesture()`
 * rather than timing the gap a second time, because the two copies drifting means
 * an event that belongs to one gesture being acted on as another.
 *
 * `passive: false` ON A LISTENER THAT NEVER PREVENTS ANYTHING, and it is the
 * whole reason the arbitration works. A passive wheel listener lets Chromium
 * scroll on the compositor and deliver the event to the main thread AFTERWARDS,
 * so the target has been hit-tested against a page that has already moved.
 * Measured on the page this replaces: a notch taken with the pointer over the
 * masthead arrived with `scrollY` already at 120 and its target already an
 * `<img>` in the strip, because the strip had slid up under a pointer that was
 * nowhere near it when the scroll started — precisely the hijack this exists to
 * prevent. Non-passive, Chromium has to ask the main thread first and the
 * hit-test is taken where the pointer actually was. The cost is that no wheel on
 * this page is fast-pathed, which is what the live page has always paid for it.
 */

/** A pause this long in the wheel ends the gesture; the next notch starts a new one. */
const GESTURE_GAP = 200;

/**
 * A region that can take a wheel gesture off the page.
 *
 * `spent` says whether the roll has run out of travel in the direction the notch
 * is heading, which is the one thing that lets the page have a gesture that
 * started over a roll: a notch that could not move the roll anyway was never
 * really the roll's.
 */
interface Roll {
  element: HTMLElement;
  spent: (delta: number) => boolean;
}

const rolls: Roll[] = [];
let owner: HTMLElement | 'page' | null = null;
let lastWheel = -Infinity;
let gesture = 0;

/** The axis a notch is on: whichever of the two deltas is larger. */
export function wheelDelta(event: WheelEvent): number {
  return Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
}

/** Register a scrollable region as a claimant. Idempotent per element. */
export function claimWheel(element: HTMLElement, spent: (delta: number) => boolean): void {
  const already = rolls.findIndex((roll) => roll.element === element);
  if (already >= 0) rolls[already] = { element, spent };
  else rolls.push({ element, spent });
}

/** Does this roll own the gesture in flight? */
export function rollOwnsWheel(element: HTMLElement): boolean {
  return owner === element;
}

/** Does the page — the document's own scroll — own the gesture in flight? */
export function pageOwnsWheel(): boolean {
  return owner === 'page';
}

/**
 * Which gesture is in flight, as a number that only ever goes up.
 *
 * A claimant that must act once per gesture holds the number it last acted on
 * and compares. The count lives here because `GESTURE_GAP` does: the boundary a
 * claimant counts by has to be the same one the ownership is settled by.
 */
export function wheelGesture(): number {
  return gesture;
}

function arbitrate(event: WheelEvent): void {
  if (event.timeStamp - lastWheel > GESTURE_GAP) {
    owner = null;
    gesture += 1;
  }
  lastWheel = event.timeStamp;
  if (owner) return;
  const delta = wheelDelta(event);
  const target = event.target;
  const claimed =
    target instanceof Node
      ? rolls.find((roll) => roll.element.contains(target) && !roll.spent(delta))
      : undefined;
  owner = claimed ? claimed.element : 'page';
}

export function mountWheel(): void {
  document.addEventListener('wheel', arbitrate, { capture: true, passive: false });
}
