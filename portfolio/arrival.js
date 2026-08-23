/* The crossing into dark, and the Panel arriving in it — four numbers off one
 * scroll position, and nothing else. #73 owns the crossing and #72 the arrival;
 * the landing block at the foot of styles.css is what the first three reach, THE
 * EXIT TREATMENTS block is what the fourth reaches, and this file only says
 * where in the turn we are.
 *
 *   --dark    0 to 1 over the STRETCH OF THE TURN the sheet asks for, which is
 *             --cross-in to --cross-out and by default the whole of it. Every
 *             colour on the page is a mix against it: the ground, the CV's ink,
 *             the section's palette and the Frame's chrome. The two screens go
 *             dark together, which is the point — they are one sheet of paper.
 *   --turn    the same ramp UNEASED, which is what the three corner pictures
 *             are lifted by. They have to clear the window exactly as the page
 *             comes to rest, and a picture that eased out of the way while the
 *             page kept scrolling would drift back down into the second screen
 *             through the middle of the turn.
 *   --enter   the section's paragraph and its Rail, which are the only two
 *             things standing above the fold at rest. 0 there, 1 by a third of
 *             the way in.
 *   --exit    where the Panel is in the crossing — #72, and the one of the four
 *             written on the SECTION rather than on <html>, because that is
 *             where the sheet declares it and a root declaration would lose to
 *             `.panel { --exit: 0 }`. -1 at the top of the page, 0 at the port:
 *             the composition is not drawn and then arrives, which is the
 *             difference between being carried into the section and being
 *             dropped into it.
 *
 * WHY THE ARRIVAL IS t - 1 AND NOT SOMETHING SHAPED. #74 built the treatments so
 * that arrival IS departure reflected through zero — a crossing at progress t
 * puts the Panel being left at --exit t and the Panel being arrived at at t - 1
 * — and this is that, with the CV in the place of the Panel being left. It is
 * the RAW turn fraction and not the eased one on purpose: the page's own motion
 * through the turn is already a quintic in app.js, so easing the composition on
 * top of it would ease the same journey twice. And because it is a pure function
 * of scroll position with no state of its own, every one of #72's continuity
 * criteria comes for free — a reversal mid-turn unwinds exactly, a fast scroll
 * cannot strand the composition half-arrived, and a touch drag is the same
 * number as a wheel notch. There is nothing here to interrupt.
 *
 * WHY JAVASCRIPT AND NOT A SCROLL TIMELINE. #73 names the hazard and it is not
 * hypothetical: the author's GitHub profile is an hourly screenshot of this
 * page taken with Playwright's `animations: "disabled"`, which fast-forwards
 * finite CSS animations to their END state. A scroll-driven animation on a
 * registered custom property is the elegant way to write this and would render
 * the profile preview fully dark at scroll 0 while every geometry assertion
 * still passed — silent, and only visible on a page in another repository.
 * Read off scroll position in script, --dark is 0 at scroll 0 under any capture
 * setting.
 *
 * WHERE THE CROSSING STARTS AND STOPS IS THE SHEET'S TO SAY, and #58's last
 * user story is that the author can find those two points by watching rather
 * than by reading a description. --cross-in and --cross-out are declared in the
 * crossing block, read here on every measure, and scrubbed live by
 * design/legacy/plinth-tuner.html — so a pair arrived at by dragging is the
 * same pair that can be pasted back into the sheet. THEY MOVE --dark AND
 * NOTHING ELSE: --turn is what lifts the three corner pictures out of the way
 * and they have to clear the window as the page comes to rest whatever the
 * colour is doing, and --enter is two blocks above the fold at rest. Only the
 * COLOUR is a matter of taste; the other two are geometry.
 *
 * NOTHING ON THE PAGE DEPENDS ON THIS FILE, the same stance effects.js and
 * cut-morph.js take. All four properties are declared in the sheet at the values
 * they hold at the top of the page — --dark 0, --turn 0, --enter 1, --exit 0 —
 * so a browser that never runs this gets the CV on paper with the section
 * present and nothing to watch, which is also exactly what a reader who has
 * asked for reduced motion gets. #73 asks for the transition removed rather than
 * shortened, and that is what removing it looks like. The sheet says the same
 * thing a second time for --exit, with `!important` inside the reduced-motion
 * block, so the guarantee does not rest on the early return below.
 *
 * NOTE THE ASYMMETRY IN THOSE DEFAULTS, because it is the whole reason this can
 * be driven from a script at all: --enter is declared 1 and --exit is declared
 * 0, which are their values at the END of the turn, while --dark and --turn are
 * declared at their values at the start. Both are the same rule — a browser
 * running nothing must get the settled composition, present and drawn, on a page
 * that is not dark — and the two properties happen to reach that from opposite
 * ends of their own range.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var panel = document.querySelector(".panel");
  if (!panel) return;

  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  if (still && still.matches) return;

  var rail = panel.querySelector(".panel-rail");
  var landing = 0, ready = false, queued = false, wasFaint = null;
  var pinnedExit = null;             // a number while a tuner is holding --exit
  var pinnedTurn = null;             // a number while a tuner is holding the turn
  /* The crossing's two ends, as fractions of the turn. Read off the sheet in
     measure() rather than restated here — see the header. These are what the
     sheet declares, so a file that never re-measures still crosses the whole
     turn the way #73 shipped it. */
  var crossIn = 0, crossOut = 1;
  /* The narrowest crossing that is still a crossing. Below this a stretch of
     scroll is one frame of a wheel notch and the ramp is a flip, which is the one
     thing #73 says the crossing must not be — so an inverted or collapsed pair
     out of a tuner is held here rather than dividing by nothing. */
  var MIN_SPAN = 0.02;

  /* Document space, walked up the offsetParent chain rather than taken from a
     client rect. .page spends its first 0.9s translated 8px down by the page-in
     reveal and this file runs inside that window; a rect would be 8px out for
     the whole of it. Offsets are layout, so no transform above the element can
     reach them. */
  function docTop(el) {
    var y = 0;
    for (var n = el; n; n = n.offsetParent) y += n.offsetTop;
    return y;
  }

  /* The turn's far end, which is the section's SNAP PORT and not its top edge.
     The two differ by exactly `scroll-margin-top`, which is the whole of how the
     landing puts the page to rest with the cut word on --title-top rather than
     with the section's own edge on the window's — see the landing block. */
  function measure() {
    ready = false;
    /* THE CROSSING'S TWO ENDS, READ AND NOT REMEMBERED, off <html> because that
       is where the sheet declares them and where a tuner writes them. Here
       rather than in frame() because frame() runs on every scrolled frame and a
       getComputedStyle in it is a forced style recalculation sixty times a
       second for two numbers that only a resize or a tuner can change; a tuner
       that moves them asks for the remeasure that re-reads them. Read off the
       ROOT and not off the panel: a custom property inherits, so .panel would
       answer the same today and would quietly follow a per-section override
       tomorrow, and the crossing is the whole page's.
       ABOVE THE REGIME CHECK and not below it, because a held turn is drawn at
       every window size — including the ones with no turn to measure — and it
       has to be drawn against the pair the sheet says NOW rather than against
       whatever was read the last time the window was wide. */
    var rs = window.getComputedStyle(root);
    var a = parseFloat(rs.getPropertyValue("--cross-in"));
    var b = parseFloat(rs.getPropertyValue("--cross-out"));
    crossIn = clamp01(isFinite(a) ? a : 0);
    crossOut = clamp01(isFinite(b) ? b : 1);
    /* The turn regime, read off the cascade rather than restated here: .panel
       takes `scroll-snap-align` inside the one-screen media query and nowhere
       else. Outside it the page is an ordinary column with no turn to cross. */
    var cs = window.getComputedStyle(panel);
    if (cs.scrollSnapAlign === "none") {
      /* Left alone while a tuner is holding the turn, for the reason --exit is
         below: the hold is a deliberate value and a resize of the tuner's own
         panes is not a reason to lose it. */
      if (pinnedTurn === null) {
        root.style.removeProperty("--dark");
        root.style.removeProperty("--turn");
        root.style.removeProperty("--enter");
      }
      /* And the arrival with them: outside the turn regime the section is the
         next block in an ordinary column, so it is simply there. Removed rather
         than pinned to 0, so what is left is the sheet's own declaration and
         there is no inline value to go stale if the window is resized back into
         the regime. */
      if (pinnedExit === null) panel.style.removeProperty("--exit");
      if (rail) rail.removeAttribute("data-faint");
      wasFaint = null;
      return;
    }
    /* AND NOT PAST THE END OF THE DOCUMENT, which is the second half of "where
       the page comes to rest" and was invisible until #72 asked a composition to
       BE somewhere at the far end rather than merely to be a colour. The snap
       port is a fractional number off layout and the document's scrollable
       length is a rounded one: on a 1440x900 window the port computes to 782.77
       and the page cannot scroll past 782, so the turn was arriving at t =
       0.9990 and staying there. It cost --dark and --turn nothing — 0.999 of a
       colour is that colour — and it costs --exit a composition that is settled
       to within a tenth of a per cent and never quite settled, which is exactly
       what "arrives at rest" is not. The min is the honest definition either
       way: a landing the page cannot reach is not where it lands.
       BOTH TERMS COME OFF THE SAME LAYOUT, so this cannot disagree with itself
       while the page is still loading: sampled every frame with every image and
       the recording answered four seconds late, the port and the document's
       length are 782.77 and 782 from the first frame at 130 ms and never move. */
    landing = Math.max(1, Math.min(
      docTop(panel) - (parseFloat(cs.scrollMarginTop) || 0),
      document.documentElement.scrollHeight - window.innerHeight));
    ready = true;
  }

  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  /* Smoothstep, the same curve the letters are eased with in cut-morph.js: it
     leaves and arrives at rest, which is all either end of this needs. The drama
     belongs to the page turn, and the turn is already a quintic. */
  function smooth(t) { return t * t * (3 - 2 * t); }

  /* The turn fraction the CROSSING is at, which is the turn fraction remapped
     onto the stretch the sheet asked for. Nothing but --dark goes through this —
     see the header — and with the shipped 0 and 1 it is the identity, so #73's
     measurements hold unless somebody moves the pair. */
  function crossed(t) {
    var span = crossOut - crossIn;
    if (span >= MIN_SPAN) return clamp01((t - crossIn) / span);
    /* HELD AGAINST THE FAR END AND NOT THE NEAR ONE, which is the difference
       between degrading and breaking. Floored the other way — start where
       --cross-in says and run MIN_SPAN from there — a pair like 0.99 / 1 puts the
       crossing's far end past the landing, and the page comes to REST at --dark
       0.5: the composition on a mid-grey ground, which is the one thing the whole
       section is arranged not to be. Anchored at --cross-out the page always
       finishes where it was told to finish, and what a collapsed pair costs is
       the start moving rather than the end never arriving. */
    return clamp01((t - (crossOut - MIN_SPAN)) / MIN_SPAN);
  }

  /* WHERE IN THE TURN THE PAGE IS DRAWN, given the fraction. Split out of
     frame() so that a tuner holding the turn does not need a landing to divide
     by — the same reason setExit() writes --exit without going through frame(),
     and the reason a hold works at a window size where there is no turn at all. */
  function draw(t) {
    root.style.setProperty("--turn", t.toFixed(4));
    root.style.setProperty("--dark", smooth(crossed(t)).toFixed(3));
    /* The first third of the turn, and not eased: what it drives is an opacity
       on two blocks that are only just above the fold, and easing it would keep
       them faintly drawn over the opening composition for longer rather than
       less. */
    root.style.setProperty("--enter", clamp01(t / 0.34).toFixed(3));
    /* The Panel arriving — see the header. Written on the section, unclamped:
       the sheet clamps it once in --exit-c so that no driver has to. Skipped
       entirely while a tuner is holding the number, rather than written from it,
       so that the hold does not depend on this function being reached: outside
       the turn regime there is no landing and nothing above here runs. */
    if (pinnedExit === null) panel.style.setProperty("--exit", (t - 1).toFixed(4));
    /* AND THE RAIL IS NOT A POINTER TARGET WHILE IT IS STILL ARRIVING, which is
       the one thing turning its entries into links costs. The Rail stands above
       the fold at rest on purpose and --enter fades it in over the first third
       of the turn — so at the top of the page its first entry is a link that is
       drawn at nothing, over the bottom-left corner of the CV, and would still
       take a click. Same threshold as --enter's, so "drawn" and "clickable"
       start together. The attribute and not `opacity: 0` doing it: an opacity-0
       element is hit-tested, and the keyboard is unaffected either way, which is
       what keeps the focus route in #72's criteria open. A browser that never
       runs this file never gets the attribute, and gets a Rail that is drawn
       (--enter is declared 1) and clickable — which is the right pair. */
    if (rail) {
      var faint = t < 0.34;
      if (faint !== wasFaint) {
        if (faint) rail.setAttribute("data-faint", "");
        else rail.removeAttribute("data-faint");
        wasFaint = faint;
      }
    }
  }

  function frame() {
    queued = false;
    /* A HELD TURN IS DRAWN WHETHER OR NOT THERE IS A LANDING, which is what puts
       this before the ready check rather than after it: a tuner holds the turn at
       window sizes outside the turn regime as well, and there the landing does
       not exist. */
    if (pinnedTurn !== null) return void draw(pinnedTurn);
    if (!ready) return;
    draw(clamp01((window.pageYOffset || root.scrollTop || 0) / landing));
  }

  function kick() {
    if (!queued) { queued = true; window.requestAnimationFrame(frame); }
  }

  window.addEventListener("scroll", kick, { passive: true });
  window.addEventListener("resize", function () { measure(); kick(); });
  /* `load` is for the three corner pictures: they arrive late and settle the
     CV's height, which is what the landing is measured from. */
  window.addEventListener("load", function () { measure(); kick(); });

  /* THE TUNER'S HANDLE ON THIS, and the only reason anything here is exposed —
     the same arrangement, for the same reason, that cut-morph.js gives its own
     tuner through window.__cutMorph.

     design/legacy/plinth-tuner.html iframes this page and scrubs --exit to judge
     an exit treatment by watching. Before #72 nothing on the page wrote --exit,
     so writing it inline from out there was the whole of the job. Now this file
     writes it on every scroll and resize — and an iframe both scrolls (the tuner
     puts the Panel on screen with scrollIntoView) and resizes (its panes are
     laid out against the window), so a scrub set to 0.62 would silently snap
     back to wherever the iframe's scroll position said. Pinning is what stops
     that: a number holds --exit against the scroll, and null hands it back.

     SINCE #58 IT ALSO HOLDS THE TURN, for the crossing into dark — the same
     problem one property along. The tuner puts the Panel on screen with
     scrollIntoView, which lands at the far end of the turn, so a page seen
     through that iframe is ALWAYS fully crossed and there is nothing about the
     crossing to judge. Holding the turn is what lets it be looked at at 0.3.
     THE TWO PINS ARE INDEPENDENT ON PURPOSE: --exit is where the composition
     stands and the turn is where the page's colour is, and the whole point of
     scrubbing one is to hold the other still. */
  window.__arrival = {
    /* Anything that is not a finite number — null, for one — hands --exit back
       to the scroll position. Written here on the spot rather than queued
       through kick(), for the reason cut-morph.js gives for the same choice: it
       is one discrete change and waiting a frame to see it is the wrong feel,
       and the tuner reads the page back immediately after asking, so a deferred
       write would have it measuring the value it was replacing. Written WITHOUT
       going through frame(), so a hold works at any window size — frame() has a
       landing to divide by and outside the turn regime there is not one. */
    setExit: function (v) {
      pinnedExit = typeof v === "number" && isFinite(v) ? v : null;
      if (pinnedExit === null) { measure(); kick(); }
      else panel.style.setProperty("--exit", String(pinnedExit));
    },
    /* Where in the turn to draw the page, 0 to 1 — the crossing's own scrub, and
       #58's "the theme crossing tunable" is this plus the two ends the sheet
       declares. Anything that is not a finite number hands the turn back to the
       scroll position, and then measure() re-reads the two ends, so a tuner that
       has just written a new pair inline gets it applied by releasing.
       Drawn on the spot, for setExit's reasons: the tuner reads the page's
       colour back immediately after asking, and a deferred write would have it
       measuring the frame it was replacing. */
    setTurn: function (v) {
      pinnedTurn = typeof v === "number" && isFinite(v) ? clamp01(v) : null;
      if (pinnedTurn === null) { measure(); kick(); }
      else draw(pinnedTurn);
    },
    /* For a tuner that moves the layout without firing resize — swapping the
       section's wording or its size, which is what #69's does — and for one that
       has just written --cross-in or --cross-out inline and needs them re-read.
       The redraw goes through kick() rather than draw(), so a held turn is
       redrawn at its held value by frame(). */
    remeasure: function () { measure(); kick(); }
  };

  measure();
  kick();
})();
