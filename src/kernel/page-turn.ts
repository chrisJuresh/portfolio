import { pageOwnsWheel } from './wheel';

/**
 * The page turn: one wheel notch carries the reader from one Section's resting
 * place to the next, and one notch the other way brings them back.
 *
 * WHY THIS IS A SCRIPT AND NOT THE BROWSER'S OWN SNAP FLING. Inside the landing
 * band the document is ports and nothing between (src/kernel/landing.css),
 * so the browser will turn the page for us — with a fling that OWNS THE SCROLLER
 * for as long as it flies. Wheel events that land while it is in the air are
 * filtered out, so the turn back cannot be taken until it has landed: you stop,
 * wait, and scroll again. Here instead, one wheel event picks the port its
 * direction is heading for and eases the window onto it, and a wheel the other
 * way retargets the ease on the spot, mid-flight.
 *
 * Snapping comes off for the length of the ease and goes back on at the end. It
 * has to: a mandatory snap pulls every intermediate frame straight back onto the
 * port the ease started from, which is why the same turn written as
 * `scrollTo({ behavior: 'smooth' })` does not move the page at all. Off, the ease
 * runs; back on, CSS holds the two resting places as it always did, and owns the
 * turn again for the keyboard and for touch, which never come here.
 *
 * THE CURVE IS ONE QUINTIC HERMITE IN SCROLL POSITION: it leaves where the page
 * IS, at the speed it is ALREADY MOVING and under the acceleration already on it,
 * and arrives at the port with both back at zero. From a standstill the two
 * carried terms drop out and what is left is smootherstep, 10s³ - 15s⁴ + 6s⁵.
 *
 * What that replaced was a cubic, which from rest is smoothstep. Smoothstep
 * leaves and arrives at rest, but its ACCELERATION steps from nothing to full in
 * one frame at each end and holds a straight ramp between — a motor, not a sheet
 * of paper, and it is what read as linear. A curve is only as smooth as its
 * roughest derivative. The quintic has three boundary conditions per end instead
 * of two, so the force swells into the paper and ebbs out of it, and the middle
 * is a genuine peak at 1.875x rather than a plateau. Nothing moves faster for it:
 * the duration went up by exactly the ratio the peak did, so peak speed is
 * unchanged to the pixel and the whole of the extra time is spent in the leaving
 * and the arriving.
 *
 * The two carried terms are what make a REVERSAL continuous. Restarting a tween
 * from the current position leaves the page travelling one way at full speed and
 * the next frame travelling the other way at full speed, and there is no such
 * thing in paper. Both terms are zero at both ends of their basis in value, slope
 * and curvature, so whatever a turn is handed it still lands on the far port at a
 * standstill.
 *
 * The Cut Title's morph inherits all of it for nothing: it is drawn against the
 * Turn, and the Turn is a function of the scroll position this writes.
 */

/** Milliseconds for a whole page turn, across the document's full scroll. */
const TURN = 800;

/** Two px of travel is "already there". */
const SLACK = 1;

const root = document.documentElement;

let raf: number | null = null;
let target: number | null = null;
/** In px/ms and px/ms², both signed: the speed and the force this turn carries. */
let speed = 0;
let force = 0;
/** True while something outside has asked for the snapping to stay off. */
let frozen = false;

const lessMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
const reduced = () => lessMotion?.matches === true;

const pageMax = () => Math.max(0, root.scrollHeight - window.innerHeight);

/**
 * The resting places, in document pixels, in order and starting at the top.
 *
 * READ OFF THE CASCADE rather than restated here: a Section is a port when its
 * computed `scroll-snap-align` is not `none`, which IS the band's own rule
 * without a second copy of it to drift. Its port is its snap position — the box's
 * top edge less its own `scroll-margin-top`, which is what puts the Panel's
 * landing on the word rather than on the Section's edge.
 *
 * Deliberately not probing `scroll-snap-type` on the root, which would be the
 * obvious question and is a trap: the ease below sets it to `none` for its own
 * duration, so a turn in flight would report the regime off and a reversal
 * mid-flight would be handed back to the browser.
 */
export function ports(): number[] {
  const max = pageMax();
  const found = [0];
  for (const section of document.querySelectorAll<HTMLElement>('[data-section]')) {
    const style = getComputedStyle(section);
    if (style.scrollSnapAlign === 'none') continue;
    const top = section.getBoundingClientRect().top + window.scrollY;
    const margin = Number.parseFloat(style.scrollMarginTop) || 0;
    found.push(Math.max(0, Math.min(max, top - margin)));
  }
  return [...new Set(found)].sort((a, b) => a - b);
}

/** Is the page turnable at all? Below the band there is one port and no turn. */
const turnable = () => ports().length > 1;

/**
 * Lift the mandatory snapping, or put it back.
 *
 * The Kernel's handle for a Check or the Editor that wants the page placed
 * somewhere the reader could not rest: with the snapping on, every `scrollTo` in
 * between is pulled straight back onto a port, so a sweep of the scroll reads as
 * a document that jumps rather than one that crosses.
 */
export function snapping(on: boolean): void {
  frozen = !on;
  root.style.scrollSnapType = on && raf === null ? '' : 'none';
}

function land(): void {
  raf = null;
  target = null;
  speed = 0;
  force = 0;
  if (!frozen) root.style.scrollSnapType = '';
}

/** Ease the window onto `to`, carrying whatever speed and force are already on it. */
export function turnPage(to: number): void {
  const start = window.scrollY;
  const distance = to - start;
  const v0 = raf === null ? 0 : speed;
  const a0 = raf === null ? 0 : force;
  if (raf !== null) cancelAnimationFrame(raf);
  target = to;

  if (reduced() || !distance) {
    window.scrollTo(0, to);
    land();
    return;
  }

  // TURN is written for the whole document; anything shorter takes the same top
  // speed rather than the same time, which is the square root of the fraction.
  // Floored so a reversal caught near its own port still has room to absorb the
  // speed it came in with instead of being flung past it.
  const full = Math.max(1, pageMax());
  const duration = TURN * Math.max(0.45, Math.sqrt(Math.min(1, Math.abs(distance) / full)));
  // The carried speed and force expressed per unit of s, which is what the basis
  // below is written in.
  const m0 = v0 * duration;
  const c0 = a0 * duration * duration;

  root.style.scrollSnapType = 'none';
  let began: number | null = null;
  raf = requestAnimationFrame(function frame(now) {
    began ??= now;
    const s = Math.min(1, (now - began) / duration);
    const u = 1 - s;
    // Three terms, one per thing the turn has to honour. s³(10 - 15s + 6s²)
    // carries the DISTANCE and is smootherstep; s(1 - s)³(3s + 1) carries the
    // SPEED in and ½s²(1 - s)³ the FORCE. Both of the latter are zero at s = 0
    // and s = 1 in value, slope and curvature, so neither can move where the turn
    // lands or disturb the standstill it lands at.
    const y =
      start +
      distance * (s * s * s * (10 - 15 * s + 6 * s * s)) +
      m0 * (s * u * u * u * (3 * s + 1)) +
      c0 * (0.5 * s * s * u * u * u);
    // The same three differentiated once and twice: what this turn hands on to
    // one that interrupts it.
    speed =
      (distance * 30 * s * s * u * u +
        m0 * (1 + s * s * (-18 + s * (32 - 15 * s))) +
        c0 * (s * (1 + s * (-4.5 + s * (6 - 2.5 * s))))) /
      duration;
    force =
      (distance * 60 * s * (1 + s * (-3 + 2 * s)) +
        m0 * (s * (-36 + s * (96 - 60 * s))) +
        c0 * (1 + s * (-9 + s * (18 - 10 * s)))) /
      (duration * duration);
    window.scrollTo(0, s < 1 ? y : to);
    if (s < 1) raf = requestAnimationFrame(frame);
    else land();
  });
}

/** Turn to `to` unless the page is already standing there with nothing in flight. */
function turnTo(to: number): boolean {
  if (raf === null && Math.abs(window.scrollY - to) < SLACK) return false;
  if (raf === null || target !== to) turnPage(to);
  return true;
}

function onWheel(event: WheelEvent): void {
  if (!pageOwnsWheel()) return; // a roll has this gesture
  const delta = event.deltaY; // the turn is vertical only: a sideways swipe is a roll's
  if (!delta) return;
  const list = ports();
  if (list.length < 2) return;

  // Past the last port, inside a Section taller than the window, the wheel is the
  // browser's again: there is a composition to read down there and the turn has
  // already done its job. CSS agrees — a snap area larger than the scrollport
  // relaxes snapping inside itself. Coming back up, the reader scrolls natively
  // to the port and the next notch turns the page.
  const last = list[list.length - 1] as number;
  if (window.scrollY > last + SLACK) return;

  const y = window.scrollY;
  const to =
    delta > 0
      ? (list.find((port) => port > y + SLACK) ?? last)
      : ([...list].reverse().find((port) => port < y - SLACK) ?? 0);
  if (raf === null && Math.abs(y - to) < SLACK) return; // nothing to turn
  event.preventDefault();
  turnTo(to);
}

/**
 * A link into the document is the direct route, and it goes through the same
 * ease the wheel does.
 *
 * A THIRD CONSUMER OF THE ARBITRATION ABOVE RATHER THAN A SECOND LISTENER: it
 * does not read the wheel at all, it calls `turnPage()`, so a notch taken while a
 * link's turn is in the air arrives at the handler above with the turn already
 * running and RETARGETS it — the two carried terms reverse the speed and the
 * force continuously. A second listener easing the window itself would be the
 * same journey driven twice, and a reversal is what would have shown it.
 *
 * OUTSIDE THE BAND, AND FOR A READER WHO ASKED FOR NO MOVEMENT, THE LINK IS THE
 * WHOLE ROUTE. There is no turn to run — the Sections are an ordinary column —
 * so the browser jumps to the fragment and `scroll-margin-top` puts it where the
 * landing wants it.
 */
function onClick(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const from = event.target;
  const link = from instanceof Element ? from.closest('a[href]') : null;
  if (!(link instanceof HTMLAnchorElement) || !link.hash) return;
  if (link.host !== location.host || link.pathname !== location.pathname) return;

  const dest = document.getElementById(link.hash.slice(1));
  if (!dest?.hasAttribute('data-section')) return;
  if (reduced() || !turnable()) return;
  if (getComputedStyle(dest).scrollSnapAlign === 'none') return;

  const top = dest.getBoundingClientRect().top + window.scrollY;
  const margin = Number.parseFloat(getComputedStyle(dest).scrollMarginTop) || 0;
  const to = Math.max(0, Math.min(pageMax(), top - margin));
  if (!turnTo(to)) return;
  event.preventDefault();
  // The fragment the anchor would have left, without the history entry it would
  // have left with it: the turn is not a navigation, and a Back that only un-set
  // a fragment would move the page without the reader asking. Reloading on this
  // URL lands on the Section already settled, which is what a deep link does.
  try {
    history.replaceState(null, '', link.href);
  } catch {
    /* a document served from a file:// URL refuses this, and the turn is done */
  }
}

export function mountPageTurn(): void {
  document.addEventListener('wheel', onWheel, { passive: false });
  document.addEventListener('click', onClick);
}
