/* The crossing into dark — three numbers off one scroll position, and nothing
 * else. #73 owns the crossing; the landing block at the foot of styles.css is
 * what each of the three reaches, and this file only says where in the turn we
 * are.
 *
 *   --dark    0 to 1 over the whole turn. Every colour on the page is a mix
 *             against it: the ground, the CV's ink, the section's palette and
 *             the Frame's chrome. The two screens go dark together, which is
 *             the point — they are one sheet of paper.
 *   --turn    the same ramp UNEASED, which is what the three corner pictures
 *             are lifted by. They have to clear the window exactly as the page
 *             comes to rest, and a picture that eased out of the way while the
 *             page kept scrolling would drift back down into the second screen
 *             through the middle of the turn.
 *   --enter   the section's paragraph and its Rail, which are the only two
 *             things standing above the fold at rest. 0 there, 1 by a third of
 *             the way in.
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
 * NOTHING ON THE PAGE DEPENDS ON THIS FILE, the same stance effects.js and
 * cut-morph.js take. All three properties are declared in the sheet at the
 * values they hold at the top of the page — --dark 0, --turn 0, --enter 1 — so
 * a browser that never runs this gets the CV on paper with the section present
 * and nothing to watch, which is also exactly what a reader who has asked for
 * reduced motion gets. #73 asks for the transition removed rather than
 * shortened, and that is what removing it looks like.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var panel = document.querySelector(".panel");
  if (!panel) return;

  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  if (still && still.matches) return;

  var landing = 0, ready = false, queued = false;

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
    /* The turn regime, read off the cascade rather than restated here: .panel
       takes `scroll-snap-align` inside the one-screen media query and nowhere
       else. Outside it the page is an ordinary column with no turn to cross. */
    var cs = window.getComputedStyle(panel);
    if (cs.scrollSnapAlign === "none") {
      root.style.removeProperty("--dark");
      root.style.removeProperty("--turn");
      root.style.removeProperty("--enter");
      return;
    }
    landing = Math.max(1, docTop(panel) - (parseFloat(cs.scrollMarginTop) || 0));
    ready = true;
  }

  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  /* Smoothstep, the same curve the letters are eased with in cut-morph.js: it
     leaves and arrives at rest, which is all either end of this needs. The drama
     belongs to the page turn, and the turn is already a quintic. */
  function smooth(t) { return t * t * (3 - 2 * t); }

  function frame() {
    queued = false;
    if (!ready) return;
    var t = clamp01((window.pageYOffset || root.scrollTop || 0) / landing);
    root.style.setProperty("--turn", t.toFixed(4));
    root.style.setProperty("--dark", smooth(t).toFixed(3));
    /* The first third of the turn, and not eased: what it drives is an opacity
       on two blocks that are only just above the fold, and easing it would keep
       them faintly drawn over the opening composition for longer rather than
       less. */
    root.style.setProperty("--enter", clamp01(t / 0.34).toFixed(3));
  }

  function kick() {
    if (!queued) { queued = true; window.requestAnimationFrame(frame); }
  }

  window.addEventListener("scroll", kick, { passive: true });
  window.addEventListener("resize", function () { measure(); kick(); });
  /* `load` is for the three corner pictures: they arrive late and settle the
     CV's height, which is what the landing is measured from. */
  window.addEventListener("load", function () { measure(); kick(); });
  measure();
  kick();
})();
