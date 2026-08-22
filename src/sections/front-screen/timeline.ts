import gsap from 'gsap';

/**
 * The Front Screen's Timeline: the photograph strip's travel, end to end.
 *
 * ADR 0003 asks for a Section's motion as ONE NAMED SEEKABLE object, and this is
 * the first Section where that costs something to honour. What was here before —
 * `portfolio/app.js` — advanced a velocity by a friction factor once per animation
 * frame and added it to `scrollLeft`. There is no moment to ask such a thing for:
 * where the strip is depends on how many frames have gone by, so a Check can
 * assert nothing about it and the Editor has nothing to scrub.
 *
 * WHAT THE TIMELINE'S PROGRESS MEANS, and it is the whole design: progress 0 is
 * the strip standing at its left end, with the first photograph on the text
 * column's left edge; progress 1 is the strip standing at its right end, with the
 * last photograph on the column's right edge; and progress p is p of the way
 * along the travel between them. That mapping never changes and never goes stale,
 * so `seek(0.34)` is a deterministic frame at every window size and after every
 * gesture — which is what `scripts/checks/checks/carousel.mjs` asserts against.
 *
 * Every gesture therefore does exactly one thing: it moves this Timeline's
 * playhead. Nothing else in this file writes `scrollLeft`, and nothing else is
 * allowed to: the Timeline is the authority on where the strip is, and the
 * dissolve, the edge states and the scrollbar are all read off it.
 *
 * THE FRICTION MODEL, RE-AUTHORED AS A FUNCTION OF TIME. The per-frame loop was
 *
 *     v *= f ;  x += v          once per frame, stopping when |v| < floor
 *
 * which is a geometric series, so it has a closed form. After n frames the strip
 * has covered
 *
 *     x(n) = v0 (1 - f^n) / (1 - f)
 *
 * and the speed is v0 f^n. So the spin ends after
 *
 *     N = log(floor / |v0|) / log f
 *
 * frames, having covered x(N); and the whole of it is one tween of N / 60 seconds
 * whose ease is that same curve, normalised:
 *
 *     e(u) = (1 - f^(N u)) / (1 - f^N)
 *
 * Two things fall out of writing it this way rather than as the loop. The decay
 * no longer depends on how often the browser paints — the old model was a third
 * faster on a 144 Hz screen than on a 60 Hz one, which nothing said. And a spin
 * that runs into either end of the travel is the SAME curve stopped early rather
 * than a special case: solve x(n) for the distance the end left of it and the
 * answer is another N, so `coast()` re-solves the leg instead of clamping frame
 * by frame the way `scrollLeft` used to.
 *
 * WHAT IS STILL A TWEEN AND WHY THAT IS NOT THE SAME THING. The playhead is moved
 * by a GSAP tween — `drive()` below — and GSAP advances that on its own ticker.
 * The difference from what this replaced is not that no clock is involved, it is
 * that the clock is no longer where the position comes from: the leg states its
 * whole journey up front, so the Timeline can be asked for any point of it
 * without running it, which is the property ADR 0003 is actually after.
 *
 * NOTES.md carries the composition: the bleed and the inset, the dissolve's two
 * ends, what the resting places are, and what a reader who asked for less motion
 * gets instead.
 */

/** What the friction Token is per: it is what is left of the speed after 1/60 s. */
const FRAME = 60;

/**
 * How recently the pointer has to have moved for letting go to count as a flick.
 *
 * Not a Token: it is not the strength of a fling — `--front-screen-fling` is that
 * — it is the question "was this a throw or a release", and releasing after a
 * pause has to leave the strip where it was put.
 */
const FLICK_WINDOW = 80;

/** A pause in the wheel this long ends the gesture, and the next notch starts a new one. */
const GESTURE_GAP = 200;

/** Two px of travel is "already there", for a resting place and for either end. */
const SLACK = 2;

export default function frontScreenTimeline(root: HTMLElement): gsap.core.Timeline | void {
  const stripFound = root.querySelector<HTMLElement>('.front-screen__strip');
  const trackFound = root.querySelector<HTMLElement>('.front-screen__photos');
  const bar = root.querySelector<HTMLElement>('.front-screen__bar');
  const thumb = root.querySelector<HTMLElement>('.front-screen__bar-thumb');
  const slides = trackFound
    ? [...trackFound.querySelectorAll<HTMLElement>('.front-screen__slide')]
    : [];
  const firstFound = slides[0];

  // Fewer than two photographs is not a strip: there is no travel, so there is
  // nothing for a Timeline to be the length of. Registering one anyway would give
  // the `moments` Check a Timeline that moves nothing, which is the exact failure
  // it exists to catch — so this Section registers none, as it did before #137.
  if (!stripFound || !trackFound || !firstFound || slides.length < 2) return;

  // Re-bound past the guard, and not for tidiness: TypeScript does not carry a
  // narrowing into a hoisted function declaration, because such a function could
  // in principle be called before the check ran. Every helper below is one, so
  // without these three the file is seventeen "possibly null" errors.
  const strip: HTMLElement = stripFound;
  const track: HTMLElement = trackFound;
  const first: HTMLElement = firstFound;

  const lessMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduced = () => lessMotion?.matches === true;

  const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);
  const travel = () => track.scrollWidth - track.clientWidth;

  // ---- the Tokens the motion reads ----------------------------------------
  // Read per gesture rather than once at mount, so the Editor dragging one of
  // them changes how the next flick feels without a reload. A getComputedStyle
  // per gesture is nothing next to what a gesture already costs.

  /** A duration Token, in seconds, written in either `s` or `ms`. */
  function seconds(raw: string, fallback: number): number {
    const value = Number.parseFloat(raw);
    if (!Number.isFinite(value)) return fallback;
    return raw.trim().endsWith('ms') ? value / 1000 : value;
  }

  function feel() {
    const style = getComputedStyle(root);
    const num = (name: string, fallback: number) => {
      const value = Number.parseFloat(style.getPropertyValue(name));
      return Number.isFinite(value) ? value : fallback;
    };
    const time = (name: string, fallback: number) => seconds(style.getPropertyValue(name), fallback);
    const friction = num('--front-screen-friction', 0.95);
    return {
      // Outside (0, 1) there is no decay to speak of — 1 never stops and 0 never
      // starts — and both would hang the arithmetic below rather than look wrong.
      friction: friction > 0 && friction < 1 ? friction : 0.95,
      coastMin: Math.max(0.01, num('--front-screen-coast-min', 0.35)),
      coastMax: num('--front-screen-coast-max', 360),
      fling: num('--front-screen-fling', 3.2),
      detent: Math.max(1, num('--front-screen-detent', 100)),
      spinGain: num('--front-screen-spin-gain', 0.8),
      spinMax: num('--front-screen-spin-max', 6),
      stepGap: time('--front-screen-step-gap', 0.12) * 1000,
      settle: time('--front-screen-settle', 0.32),
      settleWait: time('--front-screen-settle-wait', 0.14) * 1000,
    };
  }

  // ---- the Timeline -------------------------------------------------------
  // Paused, and driven by nothing but `progress()`. One tween of one number with
  // `ease: 'none'`, so progress and position are the same quantity and the
  // mapping in the header holds exactly.

  const state = { at: 0 };
  const timeline = gsap.timeline({ paused: true });
  timeline.to(state, {
    at: 1,
    duration: 1,
    ease: 'none',
    onUpdate: () => place(state.at),
  });

  /** The one place `scrollLeft` is written, and everything read off it. */
  function place(at: number): void {
    const want = at * travel();
    // Only when it has actually moved: the write is what makes the browser fire a
    // scroll event, and the handler below has to be able to tell the Timeline's
    // own writes from a reader's.
    if (Math.abs(track.scrollLeft - want) > 0.5) track.scrollLeft = want;
    dress(at);
  }

  // ---- the transport ------------------------------------------------------

  /** A spin in flight: what it left at, and how many frames of decay it is. */
  type Leg = { speed: number; frames: number };
  let leg: Leg | null = null;
  let transport: gsap.core.Tween | null = null;
  const head = { at: 0 };

  function stop(): void {
    transport?.kill();
    transport = null;
    leg = null;
  }

  /**
   * Move the playhead to `at`, and record which leg it is running.
   *
   * A reader who asked for less motion is handed the destination instead: every
   * leg still ends where it would have ended, it just arrives at once. So the
   * strip is operable in exactly the same ways and by exactly the same gestures,
   * which is what respecting the preference means here — not switching it off.
   */
  function drive(
    at: number,
    duration: number,
    ease: string | ((u: number) => number),
    running: Leg | null,
  ): void {
    transport?.kill();
    transport = null;
    leg = running;
    const target = clamp01(at);
    if (reduced() || !(duration > 0)) {
      leg = null;
      timeline.progress(target);
      settleSoon();
      return;
    }
    head.at = timeline.progress();
    transport = gsap.to(head, {
      at: target,
      duration,
      ease,
      onUpdate: () => timeline.progress(head.at),
      onComplete: () => {
        transport = null;
        leg = null;
        settleSoon();
      },
    });
  }

  /**
   * The speed the strip is carrying right now, in px per frame.
   *
   * This is what makes a second flick add to the first instead of replacing it,
   * which was `vel += dv` in the loop. Reading it off the leg's own progress is
   * the closed form of the same thing.
   */
  function liveSpeed(): number {
    if (!leg || !transport) return 0;
    return leg.speed * Math.pow(feel().friction, leg.frames * transport.progress());
  }

  /** A spin, as one tween of the friction curve. The header derives all of this. */
  function coast(speed: number): void {
    const { friction, coastMin } = feel();
    const span = travel();
    if (span <= 0 || Math.abs(speed) <= coastMin) {
      settleSoon();
      return;
    }
    const decay = Math.log(friction);
    const frames = Math.log(coastMin / Math.abs(speed)) / decay;
    const whole = (speed * (1 - Math.pow(friction, frames))) / (1 - friction);
    const from = timeline.progress();
    const wanted = clamp01(from + whole / span) - from;
    const distance = wanted * span;
    if (distance === 0) {
      settleSoon();
      return;
    }
    // Cut short by an end: the same curve, re-solved for the distance that is
    // actually left, rather than the frame-by-frame clamp `scrollLeft` used to do.
    const running =
      Math.abs(distance) < Math.abs(whole)
        ? Math.log(1 - (distance * (1 - friction)) / speed) / decay
        : frames;
    if (!(running > 0)) {
      settleSoon();
      return;
    }
    const ease = (u: number) =>
      (1 - Math.pow(friction, running * u)) / (1 - Math.pow(friction, running));
    drive(from + wanted, running / FRAME, ease, { speed, frames: running });
  }

  /** A flick: add to whatever speed is already on the strip, and spin. */
  function kick(delta: number): void {
    const { coastMax } = feel();
    const span = travel();
    if (span <= 0) return;
    if (reduced()) {
      stop();
      timeline.progress(clamp01(timeline.progress() + delta / span));
      settleSoon();
      return;
    }
    coast(Math.max(-coastMax, Math.min(coastMax, liveSpeed() + delta)));
  }

  // ---- where the strip comes to rest --------------------------------------

  /**
   * The resting places, as progresses.
   *
   * The first photograph rests at 0 — left-aligned with the text — and every
   * other one rests centred. Clamped to the travel, which is what leaves the LAST
   * photograph right-aligned with the text rather than centred: its centre lies
   * past the end of the travel, so the clamp stands it on the edge. That is the
   * whole of how the two ends of the strip meet the column, and it is why nothing
   * here states either of them as a special case.
   *
   * Centred on the STRIP's own middle and not the window's. The strip is the
   * full-bleed box, and on a page with a vertical scrollbar `innerWidth / 2` is
   * half a scrollbar to the right of it — which the live sheet's own comment
   * about `50vw` overshooting is the other half of.
   */
  function restingPlaces(): number[] {
    const span = travel();
    if (span <= 0) return [0];
    const box = strip.getBoundingClientRect();
    const middle = box.left + box.width / 2;
    const now = track.scrollLeft;
    const places = [0];
    for (const [index, slide] of slides.entries()) {
      if (index === 0) continue;
      const at = slide.getBoundingClientRect();
      places.push(clamp01((now + (at.left + at.width / 2 - middle)) / span));
    }
    return places;
  }

  /** The nearest resting place past `from` in `direction` — one photograph along. */
  function nextPlace(from: number, direction: number): number | null {
    const span = travel();
    const slack = span > 0 ? SLACK / span : 0;
    let best: number | null = null;
    for (const place of restingPlaces()) {
      if (direction > 0 ? place <= from + slack : place >= from - slack) continue;
      if (best === null || Math.abs(place - from) < Math.abs(best - from)) best = place;
    }
    return best;
  }

  /** Centre the photograph nearest the middle, once nothing is moving. */
  function snap(): void {
    if (dragging || seeking) return;
    const span = travel();
    const places = restingPlaces();
    if (span <= 0 || places.length < 2) return;
    const now = timeline.progress();
    let best = now;
    let nearest = Infinity;
    for (const place of places) {
      const away = Math.abs(place - now);
      if (away < nearest) {
        nearest = away;
        best = place;
      }
    }
    if (nearest * span < SLACK) return;
    drive(best, feel().settle, 'power2.out', null);
  }

  let waiting: ReturnType<typeof setTimeout> | undefined;

  /**
   * Snap once the movement has settled.
   *
   * Armed by a GESTURE finishing and never by the Timeline being written, and the
   * difference matters twice. It is the honest reading — a snap answers a reader
   * letting go, not the strip being placed — and it is what keeps a Check's seek
   * deterministic: a snap armed on every scroll event would fire a fifth of a
   * second after `progress(0.25)` and move the frame out from under whatever was
   * reading it.
   */
  function settleSoon(): void {
    clearTimeout(waiting);
    waiting = setTimeout(() => {
      if (dragging || seeking || transport) {
        settleSoon();
        return;
      }
      snap();
    }, feel().settleWait);
  }

  // ---- the dissolve, the edges and the scrollbar ---------------------------
  // All three are functions of where the strip is, so all three are read off the
  // Timeline rather than off a scroll event.

  /** Where the dissolve is fully open, and where it has closed again, as progresses. */
  let openAt = 1;
  let closeAt = 1;
  let slideWidth = -1;
  let thumbLeast = 0;
  let shown = -1;

  /** A Token that is a length, in px. `getPropertyValue` gives back `1.5rem`. */
  function tokenPx(name: string): number {
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.width = `var(${name})`;
    root.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }

  function gap(): number {
    const value = Number.parseFloat(getComputedStyle(track).columnGap);
    return Number.isFinite(value) ? value : 0;
  }

  /**
   * Everything about the strip that CSS cannot work out for itself.
   *
   * The photograph's width is the one that matters: the dissolve's reach and span
   * are stated in photo-widths, and inside the one-screen band a photograph's
   * height is the budget's remainder — a layout result CSS has no way to read
   * back. So it is measured here and written as a length.
   */
  function measure(): void {
    const span = travel();
    const width = first.getBoundingClientRect().width;
    if (width > 0 && width !== slideWidth) {
      slideWidth = width;
      root.style.setProperty('--front-screen-slide-w', `${width}px`);
    }
    thumbLeast = tokenPx('--front-screen-bar-thumb-min');

    // The whole travel is spent on the strip's FIRST move: from a standstill to
    // the second photograph's resting place, dead centre, which is the state the
    // open numbers were drawn for. It closes again over the last photograph's
    // travel, so the strip arrives at the right-hand end wearing exactly what it
    // wore at the left, and the two ends are one composition. Both are asked of
    // the resting places rather than rebuilt out of the padding, because the
    // bleed and the inset cancel and only the rects know where the photographs
    // really are.
    const places = restingPlaces();
    const floor = span > 0 ? 1 / span : 1;
    const second = places[1] ?? 1;
    const penultimate = places[places.length - 2] ?? 0;
    openAt = Math.max(floor, Math.min(1, second));
    closeAt = Math.max(floor, Math.min(1, 1 - penultimate));
  }

  function dress(at: number): void {
    const span = travel();
    // Whichever end is nearer holds the dissolve shut: on a strip too short for
    // the two runs to clear each other, neither end lets go entirely.
    let open = clamp01(Math.min(at / openAt, (1 - at) / closeAt));
    open = open * open * (3 - 2 * open); // smoothstep: flat at both ends
    open = Math.round(open * 200) / 200; // and no repaint for a change nobody sees
    if (open !== shown) {
      shown = open;
      root.style.setProperty('--front-screen-fade-open', String(open));
    }

    const slack = span > 0 ? SLACK / span : 1;
    strip.classList.toggle('is-at-start', at <= slack);
    strip.classList.toggle('is-at-end', at >= 1 - slack);
    // Two-thirds of each neighbour plus one centred photograph, both gaps
    // included, is seven-thirds of a photograph. Below that the two dissolves
    // would meet over the photograph between them, so both come off.
    strip.classList.toggle(
      'has-fade-room',
      track.clientWidth > (first.getBoundingClientRect().width * 7) / 3 + gap() * 2 + 0.5,
    );

    drawBar(at);
  }

  function drawBar(at: number): void {
    if (!bar || !thumb) return;
    const width = bar.clientWidth;
    if (width <= 0 || travel() <= 0 || track.scrollWidth <= 0) {
      thumb.style.width = '0';
      return;
    }
    const size = Math.max(thumbLeast, (width * track.clientWidth) / track.scrollWidth);
    thumb.style.width = `${size}px`;
    thumb.style.transform = `translateX(${at * (width - size)}px)`;
  }

  // ---- a scroll the Timeline did not make ---------------------------------
  // Touch stays native, and so do Home, End and the page keys — the browser
  // scrolls the track and this adopts the result, so the Timeline goes on being
  // the authority on where the strip is. Compared in PIXELS and not in progress:
  // a progress tolerance loose enough to absorb the Timeline's own rounding is
  // several photographs wide on a strip this long.

  track.addEventListener(
    'scroll',
    () => {
      const span = travel();
      const at = span > 0 ? track.scrollLeft / span : 0;
      if (Math.abs(track.scrollLeft - timeline.progress() * span) <= 1) return;
      stop();
      timeline.progress(clamp01(at));
      settleSoon();
    },
    { passive: true },
  );

  // ---- drag, with a fling on release; touch stays native -------------------

  let dragging = false;
  let lastX = 0;
  let lastMove = 0;
  let flick = 0;

  track.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') return;
    stop();
    dragging = true;
    lastX = event.clientX;
    flick = 0;
    track.classList.add('is-dragging');
    track.setPointerCapture(event.pointerId);
  });

  track.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const span = travel();
    const moved = event.clientX - lastX;
    lastX = event.clientX;
    if (span > 0) timeline.progress(clamp01(timeline.progress() - moved / span));
    flick = -moved;
    lastMove = event.timeStamp;
  });

  function endDrag(event: PointerEvent): void {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('is-dragging');
    const moving = event.timeStamp - lastMove < FLICK_WINDOW && Math.abs(flick) > 2;
    if (moving && !reduced()) kick(flick * feel().fling);
    else settleSoon();
  }

  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  // ---- keyboard ------------------------------------------------------------
  // One photograph per press, landed on exactly rather than approached and then
  // corrected. Everything else the browser already does for a focusable scroll
  // container — Home, End, the page keys — is left alone and adopted above.

  track.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    stop();
    const place = nextPlace(timeline.progress(), event.key === 'ArrowLeft' ? -1 : 1);
    if (place !== null) drive(place, feel().settle, 'power2.out', null);
    event.preventDefault();
  });

  // ---- the wheel -----------------------------------------------------------

  /**
   * A wheel gesture belongs to whatever it began on, and keeps it until the wheel
   * stops.
   *
   * Begun on the strip, the strip holds it even after running out of travel, so
   * the notch that reaches the end cannot also scroll the page — stop, and scroll
   * again, to leave the roll. Begun on the page, the page holds it, so a scroll
   * is never hijacked half way through by the strip arriving under a pointer that
   * was nowhere near it when the scroll started.
   *
   * On the document and in the CAPTURE phase because it has to settle the owner
   * before the strip's own handler runs, for events the strip never sees. It
   * listens and does not act: nothing here is prevented, and the page scrolls as
   * it always did.
   *
   * `passive: false` ON A LISTENER THAT NEVER PREVENTS ANYTHING, and it is the
   * whole reason the arbitration works. A passive wheel listener lets Chromium
   * scroll on the compositor and deliver the event to the main thread AFTERWARDS
   * — so the target has been hit-tested against a page that has already moved.
   * Measured: a notch taken with the pointer over the masthead arrived with
   * `window.scrollY` already at 120 and its target already an `<img>` in the
   * strip, because the strip had slid up under a pointer that was nowhere near it
   * when the scroll started. Which is precisely the hijack this listener exists to
   * prevent, so the passive version prevented nothing and the strip took the
   * first notch of every page scroll begun near it. Non-passive, Chromium has to
   * ask the main thread first, and the hit-test is taken where the pointer
   * actually was. The cost is that no wheel on this page is fast-pathed, which is
   * what the live page has always paid for the same arbitration.
   */
  let lastWheel = -Infinity;
  let owner: 'strip' | 'page' | null = null;

  const wheelDelta = (event: WheelEvent) =>
    Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;

  const spent = (delta: number) =>
    (delta < 0 && timeline.progress() <= 0) || (delta > 0 && timeline.progress() >= 1);

  document.addEventListener(
    'wheel',
    (event) => {
      if (event.timeStamp - lastWheel > GESTURE_GAP) owner = null;
      lastWheel = event.timeStamp;
      if (owner) return;
      const inside = event.target instanceof Node && track.contains(event.target);
      owner = inside && !spent(wheelDelta(event)) ? 'strip' : 'page';
    },
    { capture: true, passive: false },
  );

  /** The photograph and the air after it: what one notch is worth. */
  function pitch(): number {
    const width = first.getBoundingClientRect().width;
    return width > 0 ? width + gap() : track.clientWidth * 0.8;
  }

  let lastNotch = -Infinity;
  let stepping: number | null = null;

  track.addEventListener(
    'wheel',
    (event) => {
      if (owner !== 'strip') return;
      event.preventDefault();
      const delta = wheelDelta(event);
      if (spent(delta)) return; // out of travel, but still the strip's gesture
      const { friction, detent, spinGain, spinMax, stepGap, settle } = feel();
      if (travel() <= 0) return;

      // Line and page deltas normalised to pixels.
      const px =
        event.deltaMode === 1
          ? delta * 16
          : event.deltaMode === 2
            ? delta * track.clientWidth
            : delta;
      const spinning = leg !== null || event.timeStamp - lastNotch < stepGap;
      lastNotch = event.timeStamp;

      // A lone notch is a step and not a throw: ease straight onto the next
      // resting place so it arrives exactly, with nothing to tidy up after it.
      // Chained notches retarget from the one in flight; only a real spin uses
      // momentum.
      if (!spinning && Math.abs(px) >= detent * 0.4) {
        const from = stepping !== null && transport ? stepping : timeline.progress();
        const place = nextPlace(from, px);
        if (place !== null) {
          stepping = place;
          drive(place, settle, 'power2.out', null);
          return;
        }
      }
      stepping = null;

      const step = pitch();
      const distance = (px / detent) * step;
      // Photographs still queued in the spin that is running — zero when the
      // strip is at rest, so a single notch stays a single notch.
      const queued = Math.abs(liveSpeed()) / (1 - friction) / step;
      const gain = Math.min(1 + spinGain * queued, spinMax);
      kick(reduced() ? distance : distance * gain * (1 - friction));
    },
    { passive: false },
  );

  // ---- the strip's own scrollbar, as a control -----------------------------

  let seeking = false;

  if (bar && thumb) {
    const seek = (clientX: number) => {
      const box = bar.getBoundingClientRect();
      const size = thumb.offsetWidth;
      const room = box.width - size;
      stop();
      timeline.progress(clamp01(room > 0 ? (clientX - box.left - size / 2) / room : 0));
    };
    bar.addEventListener('pointerdown', (event) => {
      seeking = true;
      bar.setPointerCapture(event.pointerId);
      seek(event.clientX);
      event.preventDefault();
    });
    bar.addEventListener('pointermove', (event) => {
      if (seeking) seek(event.clientX);
    });
    const done = () => {
      if (!seeking) return;
      seeking = false;
      settleSoon();
    };
    bar.addEventListener('pointerup', done);
    bar.addEventListener('pointercancel', done);
  }

  // ---- re-measuring --------------------------------------------------------
  // The strip keeps its FRACTION of the travel across a resize, which is the one
  // thing that stays meaningful when the photographs change size: the reader is
  // still looking at the same part of the sequence. That falls out of the
  // Timeline's progress being the position — there is nothing to convert.

  function remeasure(): void {
    measure();
    place(timeline.progress());
  }

  window.addEventListener('resize', remeasure);
  // The photographs' boxes are sized from the slot and the ratio, so a picture
  // arriving changes nothing — but the faces resolving changes the column, and
  // with it the slot. The observer is what actually notices, and its first
  // delivery is the strip's first measurement.
  new ResizeObserver(remeasure).observe(strip);

  measure();
  place(0);

  return timeline;
}
