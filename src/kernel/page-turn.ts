import { pageOwnsWheel, standAside, wheelGesture } from './wheel';

/**
 * The page turn: one wheel GESTURE carries the reader from one Section's resting
 * place to the next, and one gesture the other way brings them back.
 *
 * A GESTURE, AND WITHIN IT A PUSH — never an event, and never the whole gesture
 * either. That is the difference between a trackpad turning one page, running the
 * whole document, and refusing to turn again until its own momentum has died: see
 * the shape the wheel handler follows at the foot of this file.
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
    if (getComputedStyle(section).scrollSnapAlign === 'none') continue;
    found.push(Math.max(0, Math.min(max, portOf(section))));
  }
  return [...new Set(found)].sort((a, b) => a - b);
}

/**
 * WHERE ONE SECTION'S RESTING PLACE IS, in document pixels: the box's top edge
 * less its own `scroll-margin-top`, which is what puts the Projects Panel's
 * landing on the word rather than on that Section's edge.
 *
 * ONE FUNCTION BECAUSE THERE WERE FOUR COPIES OF IT. `ports()` above, the deep
 * link below, the Rail's current entry and the hold all ask this same question,
 * and a Section's port is exactly the kind of relationship this repository holds
 * in one place rather than in four that agree today. The Rail's copy was already
 * subtly different — it did not clamp — which is why the clamping stays with the
 * CALLER: `ports()` wants a scroll position the window can actually reach, and
 * everything else wants the raw line the Section rests on.
 *
 * Measured per call rather than cached, for the reason `ports()` does the same on
 * every wheel notch: a Section mounts on approach and changes height when it
 * does, and its pictures change it again.
 */
export function portOf(section: HTMLElement): number {
  const style = getComputedStyle(section);
  const top = section.getBoundingClientRect().top + window.scrollY;
  return top - (Number.parseFloat(style.scrollMarginTop) || 0);
}

/** Is the page turnable at all? Below the band there is one port and no turn. */
const turnable = () => ports().length > 1;

/**
 * WHERE THE WHEEL IS THE BROWSER'S, THE KERNEL STANDS OUT OF ITS WAY — and not
 * only in the decision, which is all this used to be.
 *
 * Both of the Kernel's document-level wheel listeners are `passive: false` and
 * each has its reason: this one prevents the default scroll so it can ease the
 * page itself, and the arbitration is non-passive so a roll's target is hit-tested
 * where the pointer actually was (src/kernel/wheel.ts). A non-passive wheel
 * listener means Chromium may not scroll until the main thread has run — so both
 * reasons were being paid for on every notch the page saw, including every notch
 * neither of them can act on.
 *
 * Past the last port there is nothing for either of them to do. The handler below
 * hands the wheel back to the browser down there, and the only roll on the page is
 * the photograph strip, three screens up. MEASURED, 300px inside the Catalogue at
 * 1440x900, as the time a notch took to be handled: 41ms as shipped, 24ms with the
 * two listeners taken off, and 41ms again with every Timeline held — so it was
 * never the scrubbing. Half the reader's frames spent on two decisions that had
 * already been made, which is what "the Catalogue scrolls late" was (#218).
 *
 * So both listeners are re-registered PASSIVE wherever the turn cannot act — past
 * the last port, and below the band, where there is one port and no turn at all —
 * and non-passive again when it can. A passive listener still runs, so the push
 * tracking further down never stops following the wheel, and the way back is
 * decided from the reader's own scroll like everything else here.
 */
let aside = false;

/**
 * The ports as they were last read: what the cheap question is asked against.
 *
 * A stale reading costs a recompute and can never make a wrong decision, because
 * the recompute is what decides — which is what lets the scroll listener ask this
 * on every event without reading the layout on any of them.
 */
let known = { turnable: false, last: 0 };

/** Is this scroll position the browser's own, as far as the last reading knows? */
const browsersHere = (): boolean => !known.turnable || window.scrollY > known.last + SLACK;

/** Read the ports, and answer properly. */
function readRegion(): number[] {
  const list = ports();
  known = { turnable: list.length > 1, last: list[list.length - 1] as number };
  return list;
}

/** Re-register both listeners for whichever side of that line the reader is on. */
function handOver(toBrowser: boolean): void {
  if (toBrowser === aside) return;
  aside = toBrowser;
  document.removeEventListener('wheel', onWheel);
  document.addEventListener('wheel', onWheel, { passive: toBrowser });
  standAside(toBrowser);
}

/**
 * Ask again, now the page has moved.
 *
 * NOT WHILE A TURN IS IN FLIGHT. The ease carries the speed and the force already
 * on the page, so a reversal can take it past a port before it settles back onto
 * one, and standing aside on an overshot frame would leave the rest of that push
 * unable to prevent the default it is already preventing — a passive listener
 * calling `preventDefault` is a console warning and a page scrolled twice. Where
 * the reader ENDS UP is the answer, so `land()` asks.
 */
function place(): void {
  if (raf !== null) return;
  if (browsersHere() === aside) return;
  readRegion();
  handOver(browsersHere());
}

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
  // The one scroll position `place()` refuses to judge is a moving one, and this
  // is where it stops moving — a link clicked from inside the Catalogue eases the
  // reader back into the turn's own region, and nothing else would notice.
  place();
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

/**
 * THE UNIT IS A PUSH, NOT AN EVENT AND NOT A GESTURE, and both of the wrong
 * answers have shipped.
 *
 * A mouse notch is a single `wheel` event of about a hundred pixels, so deciding
 * per event was indistinguishable from deciding per push while a mouse was the
 * only device in the room. A trackpad delivers one light flick as a RISE under
 * the fingers and then a decaying momentum TAIL that keeps arriving for over a
 * second after they have left the glass. Per event, the first tail notch to land
 * after the turn had landed picked the port after it, and one flick chained
 * through every port and fell out of the bottom into the browser's own scroll —
 * measured at 1440x820, ports at 0, 731 and 1551: one flick carried the page
 * 0 -> 1551, and the Projects Panel could not be stopped on from a trackpad at
 * all (#205).
 *
 * Per GESTURE — one turn until the wheel falls silent for `GESTURE_GAP` — that
 * failure goes away and a worse one takes its place, because a gesture does not
 * end when the reader's fingers do. The tail is still a gesture, so a SECOND
 * deliberate flick lands inside the first one's momentum and is swallowed whole:
 * measured on the shipped page, flick, then flick again 400ms later, and the
 * document does not move. The reader has to wait out somebody else's animation
 * to be allowed to scroll (#210).
 *
 * A push is the thing the reader actually does, and the wheel's own SHAPE is what
 * says where one ends: a push RISES and a tail DECAYS. So the turn re-arms when
 * the wheel has ebbed to half of what it peaked at — that push is over, whatever
 * is still arriving is coasting — and then risen again to twice its trough, which
 * only fingers can do. Nothing here is a clock, which is the point: momentum
 * lasts as long as it lasts, and the reader is never made to wait out a number.
 *
 * THE WEB EXPOSES NO MOMENTUM FLAG, which is why this is inferred rather than
 * asked. `WheelEvent` carries deltas and a unit and nothing else; the phase that
 * would answer this outright is a macOS AppKit property with no DOM counterpart.
 * Every library that solves this solves it by shape — fullPage.js compares a
 * short rolling average of recent deltas against a longer one and acts only while
 * the short one leads. This is that idea with the averages replaced by the two
 * turning points they exist to find, which is cheaper and, more usefully, exact
 * at the moment the reader pushes again rather than a few frames after it.
 *
 * WHY HERE AND NOT IN THE ARBITRATION. The photograph strip wants the opposite —
 * it is a roll with many resting places, where one held push SHOULD keep spinning
 * for as long as the momentum lasts, and it reads the same stream as a spin
 * (src/sections/front-screen/timeline.ts). Only the silence is shared, which is
 * why `wheelGesture()` is imported and `GESTURE_GAP` is not copied.
 */

/** A push is over once the wheel has fallen to this share of what it peaked at. */
const EBB = 0.5;

/** And a new one has begun once it has risen to this multiple of its trough. */
const RISE = 2;

/** Under this many px a notch is the last of a tail rather than a push, whatever
 *  its shape: a dying tail flattens, and a flat run of ones would otherwise read
 *  as a rise the moment it stopped falling. */
const FLOOR = 4;

/** A line, in px, for a device that reports its wheel in lines rather than pixels
 *  — Firefox does. The three numbers above are px, so this is what makes them
 *  mean the same thing on every device. */
const LINE = 16;

/** Which gesture the push below belongs to; a silence starts both afresh. */
let gesture = -1;
/** The push in flight: what it peaked at, what it has fallen to, and whether it
 *  is still under the fingers or coasting. */
let peak = 0;
let ebb = 0;
let coasting = false;
/** What this push decided, and whether it has decided at all. */
let settled = false;
let turned = false;

/** One notch's travel in px, whatever unit the device chose to report it in. */
function pixels(event: WheelEvent): number {
  if (event.deltaMode === 1) return event.deltaY * LINE;
  if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

/** Start a push at this notch: it is the peak and the trough of itself, and it has
 *  decided nothing yet. */
function begin(px: number): void {
  peak = px;
  ebb = px;
  coasting = false;
  settled = false;
  turned = false;
}

/**
 * Follow the wheel's shape, and start a new push wherever one begins.
 *
 * Two states and one turning point each. Under the fingers the peak keeps rising
 * and nothing else happens; the moment a notch comes in at half of it the push is
 * over and the tail is coasting. Coasting, the trough keeps falling — a decaying
 * tail sets a new low every notch, so it can never be twice its own trough, which
 * is exactly why the test costs nothing to be sure of. Only a push can raise the
 * wheel against its own decay.
 */
function follow(px: number): void {
  const now = wheelGesture();
  if (now !== gesture) {
    // A silence: the reader stopped. Whatever comes next is a push by definition,
    // however gentle — which is what lets a slow, careful drag turn the page at
    // all, since it never gets near FLOOR.
    gesture = now;
    begin(px);
    return;
  }
  if (!coasting) {
    peak = Math.max(peak, px);
    if (px <= peak * EBB) {
      coasting = true;
      ebb = px;
    }
    return;
  }
  ebb = Math.min(ebb, px);
  if (px >= ebb * RISE && px >= FLOOR) begin(px);
}

function onWheel(event: WheelEvent): void {
  if (!pageOwnsWheel()) return; // a roll has this gesture
  const delta = event.deltaY; // the turn is vertical only: a sideways swipe is a roll's
  if (!delta) return;

  follow(Math.abs(pixels(event)));
  if (settled) {
    // `&& !aside`, because the two are independent: a resize can take the window
    // out of the band while a push that has already turned the page is still
    // preventing the default on its own tail, and preventing it from a passive
    // listener is a console warning and nothing else. Where the listener cannot
    // prevent, the tail is simply the browser's, which is what it would have been.
    if (turned && !aside) event.preventDefault();
    return;
  }
  // Settled from here, and native until something below actually turns: every
  // route out of this function is a decision the rest of the PUSH inherits — the
  // tail of a push that gave the wheel to the browser must not turn the page when
  // it coasts back onto a port, which is the same failure the other way up.
  settled = true;
  turned = false;

  // Past the last port, inside a Section taller than the window, the wheel is the
  // browser's again: there is a composition to read down there and the turn has
  // already done its job. CSS agrees — a snap area larger than the scrollport
  // relaxes snapping inside itself. Coming back up, the whole PUSH is the
  // browser's — it scrolls natively to the port and stops there, and the next
  // push turns the page. That is what the decision above buys: a tail long enough
  // to coast back onto the port used to carry straight on through it.
  const list = readRegion();
  const browsers = browsersHere();
  if (browsers !== aside) {
    // The listeners were standing on the wrong side of that line — normally the
    // scroll listener has already moved them, and this is the fallback for a
    // window that changed shape under a reader who has not scrolled since.
    handOver(browsers);
    // Either way this PUSH is the browser's. A registration governs the events
    // AFTER it, so an event delivered passively cannot be prevented, and a turn
    // eased on top of the browser's own scroll is the same journey driven twice.
    return;
  }
  if (browsers) return;

  const last = known.last;
  const y = window.scrollY;
  const to =
    delta > 0
      ? (list.find((port) => port > y + SLACK) ?? last)
      : ([...list].reverse().find((port) => port < y - SLACK) ?? 0);
  if (raf === null && Math.abs(y - to) < SLACK) return; // nothing to turn
  event.preventDefault();
  turned = true;
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

  const to = Math.max(0, Math.min(pageMax(), portOf(dest)));
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
  // The reader's own scroll is what carries them across the line `place()` judges,
  // so this is where the way back is noticed — and it is cheap enough to sit on
  // every scroll event because it compares against the last reading and only reads
  // the layout when that disagrees with where the two listeners are standing.
  window.addEventListener('scroll', place, { passive: true });
  // A resize is the one thing that moves the line itself — a window crossing the
  // band's own edge gains a turn or loses one without the page scrolling a pixel
  // — so this reads the ports rather than asking `place()`, which would compare
  // against the reading the resize just invalidated and see nothing to do.
  window.addEventListener(
    'resize',
    () => {
      readRegion();
      handOver(browsersHere());
    },
    { passive: true },
  );
  // And once at the start, because a window that never had a turn should not have
  // to be scrolled before it stops paying for one — a reload deep inside a tall
  // Section is the same case.
  place();
}
