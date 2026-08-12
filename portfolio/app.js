/* ============================================================================
   Renders the page from content.js and runs the photo carousel.
   You shouldn't need to edit this file to change content — see content.js.
   ========================================================================== */
(function () {
  "use strict";
  var C = window.CONTENT || {};
  var page = document.getElementById("page");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // ---- build the markup ----------------------------------------------------
  var bio = (C.bio || []);
  var intro = bio.length
    ? '<section class="intro"><p class="lead"><em>' + esc(bio[0]) + "</em></p>" +
      bio.slice(1).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") +
      "</section>"
    : "";

  var slides = (C.photos || []).map(function (p, i) {
    var lazy = i < 2 ? "" : ' loading="lazy"';
    return '<figure class="slide"><img src="img/' + esc(p.file) + '" alt="' + esc(p.alt) +
           '"' + lazy + ' decoding="async" draggable="false"></figure>';
  }).join("");

  var carousel = (C.photos && C.photos.length)
    ? '<section class="carousel at-start has-fade-room" aria-roledescription="carousel">' +
        '<div class="track" tabindex="0" role="region" aria-label="Photographs">' + slides + "</div>" +
        '<div class="veil veil-left" aria-hidden="true"></div>' +
        '<div class="veil veil-right" aria-hidden="true"></div>' +
      "</section>"
    : "";

  // custom scrollbar lives outside the full-bleed carousel so it stays column-width
  var cbar = (C.photos && C.photos.length)
    ? '<div class="cbar" aria-hidden="true"><div class="cbar-thumb"></div></div>'
    : "";

  function workItem(it) {
    return '<div class="item"><p class="line"><span class="what">' + esc(it.org) +
           '</span><em class="when">' + esc(it.years) + "</em></p>" +
           (it.role ? '<p class="sub">' + esc(it.role) + "</p>" : "") + "</div>";
  }
  function eduItem(it) {
    return '<div class="item"><p class="line"><span class="what">' + esc(it.org) +
           '</span><em class="when">' + esc(it.years) + "</em></p>" +
           (it.subject ? '<p class="sub">' + esc(it.subject) + "</p>" : "") + "</div>";
  }
  function section(title, body) {
    return '<section class="listing"><h2>' + esc(title) + "</h2>" + body + "</section>";
  }

  var work = (C.work && C.work.length) ? section("Work Experience", C.work.map(workItem).join("")) : "";
  var edu = (C.education && C.education.length) ? section("Education", C.education.map(eduItem).join("")) : "";
  var toggle = '<footer class="site-footer"><button class="theme-toggle" type="button" role="switch" ' +
    'aria-checked="false" aria-label="Dark mode">' +
    '<span class="theme-toggle__label" aria-hidden="true">dark</span>' +
    '<span class="theme-toggle__track" aria-hidden="true"><span class="theme-toggle__thumb"></span></span>' +
    '</button></footer>';
  var contact = (C.contact && C.contact.length)
    ? section("Contact", '<div class="contact-corner"><ul class="contact">' + C.contact.map(function (c, i) {
        return "<li" + (i === 0 ? ' class="primary"' : "") + '><a href="' + esc(c.href) + '">' +
               esc(c.text) + "</a></li>";
      }).join("") + "</ul>" + toggle + "</div>")
    : toggle;

  // The cut title: one display word in the bottom corner, sliced off by the end
  // of the page. Full text in the markup, so it is read out and indexed whole
  // even though only the top of it is drawn. It sits OUTSIDE <main class="col">,
  // as a sibling of it — .page is a flex column and the title has to be .page's
  // own child to be held against the bottom edge. On a screen that composes to
  // one page it is pinned to the fold instead and the word carries on onto a
  // second screen, where the whole of it stands as that screen's title. All the
  // geometry is CSS either way: see --cue-* and the doorway block in styles.css.
  var cut = '<div class="cut-title"><a href="/projects"><span>Projects</span></a></div>';

  page.innerHTML =
    '<main class="col">' +
      '<header class="masthead"><h1 class="name">' + esc(C.name) + "</h1>" +
        '<div class="masthead-meta">' +
          (C.subtitle ? '<p class="tagline">' + esc(C.subtitle) + "</p>" : "<span></span>") +
          '<a class="projects-link" href="/projects">Projects</a>' +
        "</div></header>" +
      intro + carousel + cbar + work + edu + contact +
    "</main>" + cut;

  // ---- light / dark theme --------------------------------------------------
  var root = document.documentElement;
  var themeToggle = page.querySelector(".theme-toggle");
  var themeMeta = document.getElementById("theme-color");

  function setTheme(theme, remember) {
    var dark = theme === "dark";
    root.setAttribute("data-theme", dark ? "dark" : "light");
    if (themeToggle) {
      themeToggle.setAttribute("aria-checked", dark ? "true" : "false");
      themeToggle.setAttribute("aria-label", dark ? "Light mode" : "Dark mode");
      themeToggle.querySelector(".theme-toggle__label").textContent = dark ? "light" : "dark";
    }
    if (themeMeta) themeMeta.setAttribute("content", dark ? "#000" : "#fff");
    if (remember) {
      try { localStorage.setItem("portfolio-theme", dark ? "dark" : "light"); } catch (_) {}
    }
  }

  setTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light", false);
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark", true);
    });
  }

  // Follow changes to the operating-system theme until the visitor makes an
  // explicit choice with the toggle. Light remains the fallback where the
  // media query or local storage is unavailable.
  var systemTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
  function hasSavedTheme() {
    try {
      var saved = localStorage.getItem("portfolio-theme");
      return saved === "dark" || saved === "light";
    } catch (_) { return false; }
  }
  function syncSystemTheme(e) {
    if (!hasSavedTheme()) setTheme(e.matches ? "dark" : "light", false);
  }
  if (systemTheme) {
    if (systemTheme.addEventListener) systemTheme.addEventListener("change", syncSystemTheme);
    else if (systemTheme.addListener) systemTheme.addListener(syncSystemTheme);
  }

  // ---- carousel behaviour --------------------------------------------------
  var cEl = page.querySelector(".carousel");
  var track = page.querySelector(".track");
  if (track) {
    // reflect scroll position so the edge fades appear/disappear correctly
    function updateEdges() {
      var max = track.scrollWidth - track.clientWidth;
      var firstSlide = track.querySelector(".slide");
      var gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
      // Two-thirds of each neighbour + one centred slide, including both gaps,
      // is seven-thirds of a slide width in total.
      var twoThirdsNeighbours = firstSlide ? firstSlide.getBoundingClientRect().width * 7 / 3 + gap * 2 : Infinity;
      cEl.classList.toggle("at-start", track.scrollLeft <= 2);
      cEl.classList.toggle("at-end", track.scrollLeft >= max - 2);
      cEl.classList.toggle("has-fade-room", track.clientWidth > twoThirdsNeighbours + 0.5);
    }
    track.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    window.addEventListener("load", updateEdges);   // re-measure once images give the track its width
    updateEdges();

    // ---- the edge fade opens as the strip pulls away --------------------------
    // At rest the dissolve reaches in over the second photograph so the first one
    // stands alone; one photograph along it has drawn back to the text edge.
    // styles.css holds both ends and mixes them, so all that is reported here is
    // how far between the two the strip has got.
    var openDist = 0, closeDist = 0, travel = 0, lastOpen = -1;
    // The whole travel is spent on the strip's first move: from a standstill to
    // the resting place of photo 2, dead centre — the state the open numbers were
    // drawn for, first photo out to the left and the third one going. That is
    // also where the snap below lands from a single flick, so the two agree.
    // The last move spends it again in reverse: the strip closes back down over
    // the run from the second-to-last photo's centre to the end, so the final
    // photograph stands against the right-hand text edge under the same fade the
    // first one stands under, and the two ends of the strip are one composition.
    // Asked of the DOM rather than rebuilt out of the padding: the strip's
    // full-bleed margin and its padding are both a 50vw that overshoots by the
    // width of a classic scrollbar, and they cancel, so only the rects know where
    // the photos really are. This is snap()'s own expression, for i = 1 and n - 2.
    function measureFade() {
      var slides = track.querySelectorAll(".slide");
      var mid = window.innerWidth / 2;
      var reach = 0, backReach = 0;
      travel = track.scrollWidth - track.clientWidth;
      if (slides.length > 1) {
        var r = slides[1].getBoundingClientRect();
        reach = track.scrollLeft + (r.left + r.width / 2 - mid);
        var rn = slides[slides.length - 2].getBoundingClientRect();
        backReach = travel - (track.scrollLeft + (rn.left + rn.width / 2 - mid));
      }
      // never past what the strip can actually scroll, so the fade always reaches
      // the open end; the 1px floor keeps the divisions below safe.
      openDist  = Math.max(1, Math.min(travel, reach));
      closeDist = Math.max(1, Math.min(travel, backReach));
    }
    function drawFade() {
      // whichever end is nearer holds the fade shut — on a strip too short for
      // the two runs to clear each other, neither end lets go entirely
      var p = Math.min(track.scrollLeft / openDist, (travel - track.scrollLeft) / closeDist);
      p = Math.max(0, Math.min(1, p));
      p = p * p * (3 - 2 * p);                       // smoothstep: flat at both ends
      p = Math.round(p * 200) / 200;                 // ...and no repaint for a change no one can see
      if (p === lastOpen) return;
      lastOpen = p;
      root.style.setProperty("--fade-open", p);
    }
    function measureAndDrawFade() { measureFade(); drawFade(); }
    track.addEventListener("scroll", drawFade, { passive: true });
    window.addEventListener("resize", measureAndDrawFade);
    window.addEventListener("load", measureAndDrawFade);
    measureAndDrawFade();

    // ---- momentum ("roulette wheel") scrolling + snap-to-centre --------------
    // Each flick adds to a velocity that decays with friction every frame; when
    // motion settles, the photo nearest the screen centre eases into the centre
    // (the first and last photos stay aligned with their end of the text column —
    // the strip runs out of travel before either of them reaches the middle).
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var vel = 0, raf = null, mode = null;             // mode: "coast" | "tween"
    var FRICTION = 0.95, MIN_V = 0.35, MAX_V = 360;   // MAX_V ≈ a spin across ~30 photos
    function maxScroll() { return track.scrollWidth - track.clientWidth; }
    function stopAnim() { if (raf) cancelAnimationFrame(raf); raf = null; mode = null; }
    function halt() { vel = 0; stopAnim(); }

    function coast() {
      track.scrollLeft += vel;
      var m = maxScroll();
      if (track.scrollLeft <= 0) { track.scrollLeft = 0; vel = 0; }
      else if (track.scrollLeft >= m) { track.scrollLeft = m; vel = 0; }
      vel *= FRICTION;
      if (Math.abs(vel) < MIN_V) { stopAnim(); scheduleSnap(); return; }
      raf = requestAnimationFrame(coast);
    }
    function kick(dv) {
      if (reduce) { track.scrollLeft += dv; scheduleSnap(); return; }
      if (mode === "tween") stopAnim();               // a fresh flick cancels a snap in progress
      vel += dv;
      if (vel > MAX_V) vel = MAX_V; else if (vel < -MAX_V) vel = -MAX_V;
      if (!raf) { mode = "coast"; raf = requestAnimationFrame(coast); }
    }

    // ease scrollLeft to a target (used by snap); cancellable via stopAnim/halt
    function tweenTo(target) {
      stopAnim();
      if (reduce) { track.scrollLeft = target; return; }
      var start = track.scrollLeft, dist = target - start, t0 = null, DUR = 320;
      mode = "tween";
      function frame(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / DUR);
        track.scrollLeft = start + dist * (1 - Math.pow(1 - p, 3));   // ease-out cubic
        if (p < 1) raf = requestAnimationFrame(frame); else stopAnim();
      }
      raf = requestAnimationFrame(frame);
    }
    // resting places, in scrollLeft: the first photo sits left-aligned with the
    // text (0), every other photo centres; all clamped to the scrollable range,
    // which is what leaves the last photo right-aligned with the text — its
    // centre lies past the end of the travel, so the clamp stands it on the edge
    function snapPoints() {
      var slides = track.querySelectorAll(".slide");
      var mid = window.innerWidth / 2, cur = track.scrollLeft, max = maxScroll();
      var pts = [0];
      for (var i = 1; i < slides.length; i++) {
        var r = slides[i].getBoundingClientRect();
        pts.push(Math.max(0, Math.min(max, cur + (r.left + r.width / 2 - mid))));
      }
      return pts;
    }
    // centre the photo closest to the middle of the screen (clamped: first → left
    // edge of the text, last → right edge of it)
    function snap() {
      if (down) return;
      var pts = snapPoints(), cur = track.scrollLeft;
      if (pts.length < 2) return;
      var best = pts[0], bestD = Math.abs(pts[0] - cur);
      for (var i = 1; i < pts.length; i++) {
        var d = Math.abs(pts[i] - cur);
        if (d < bestD) { bestD = d; best = pts[i]; }
      }
      if (bestD < 2) return;                  // already at the nearest snap point
      tweenTo(best);
    }
    // the nearest resting place past `from` in direction `dir` — i.e. one photo
    // along, landed on exactly rather than approached and then corrected
    function nextPoint(from, dir) {
      var pts = snapPoints(), best = null;
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        if (dir > 0 ? p <= from + 2 : p >= from - 2) continue;
        if (best === null || Math.abs(p - from) < Math.abs(best - from)) best = p;
      }
      return best;
    }
    var snapT = null;
    function scheduleSnap() {                          // snap once motion has settled
      if (snapT) clearTimeout(snapT);
      snapT = setTimeout(function () {
        if (down || raf) { scheduleSnap(); return; }   // still dragging or animating → wait
        snap();
      }, 140);
    }
    track.addEventListener("scroll", scheduleSnap, { passive: true });

    // wheel spins the strip: one lone notch steps one photo, but notches that
    // land while it is still coasting compound, so a fast spin runs away
    var DETENT = 100;                                   // px of wheel delta in one notch
    var SPIN_GAIN = 0.8, MAX_GAIN = 6;                  // how hard stacked notches compound
    function slidePitch() {                             // photo width + the gap after it
      var s = track.querySelector(".slide");
      if (!s) return track.clientWidth * 0.8;
      var gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
      return s.getBoundingClientRect().width + gap;
    }
    var STEP_GAP = 120;                                 // notches this close read as a spin
    var stepTarget = null, lastNotch = -1e9;

    // A wheel gesture belongs to whatever it began on, and keeps it until the
    // wheel stops. Begun on the strip: the strip holds it even after running out
    // of travel, so the scroll that reaches the end cannot also turn the page —
    // stop and scroll again to leave the roll. Begun on the page: the page holds
    // it, so a page turn is never hijacked half way by the strip arriving under
    // a pointer that was nowhere near it when the scroll started. Which is why
    // this is on the document in the capture phase: it has to settle the owner
    // before the strip's own handler below runs, for events the strip never sees.
    var GESTURE_GAP = 200;                              // pause that ends a gesture
    var lastWheel = -1e9, owner = null;                 // "strip" | "page" | null
    function wheelDelta(e) {
      return Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    }
    function atEnd(d) {
      return (d < 0 && track.scrollLeft <= 0) || (d > 0 && track.scrollLeft >= maxScroll());
    }
    document.addEventListener("wheel", function (e) {
      if (e.timeStamp - lastWheel > GESTURE_GAP) owner = null;   // a pause starts a fresh gesture
      lastWheel = e.timeStamp;
      if (owner) return;
      var d = wheelDelta(e);
      owner = (track.contains(e.target) && !atEnd(d)) ? "strip" : "page";
    }, { capture: true, passive: true });

    track.addEventListener("wheel", function (e) {
      if (owner !== "strip") return;                    // the page is using this gesture
      e.preventDefault();
      var d = wheelDelta(e);
      if (atEnd(d)) return;                             // out of travel, but still the strip's
      // normalise line / page deltas to pixels, then size the kick so one notch
      // lands one photo along: a coast covers vel / (1 - FRICTION) before it dies.
      var px = e.deltaMode === 1 ? d * 16 : e.deltaMode === 2 ? d * track.clientWidth : d;
      var now = e.timeStamp, spinning = mode === "coast" || now - lastNotch < STEP_GAP;
      lastNotch = now;
      // A lone notch is a step, not a throw: ease straight onto the next resting
      // place so it arrives exactly, with no snap to tidy up after it. Chained
      // notches retarget from the one in flight; only a real spin uses momentum.
      if (!spinning && Math.abs(px) >= DETENT * 0.4) {
        var from = mode === "tween" && stepTarget !== null ? stepTarget : track.scrollLeft;
        var p = nextPoint(from, px);
        if (p !== null) { vel = 0; stepTarget = p; tweenTo(p); return; }
      }
      stepTarget = null;
      var pitch = slidePitch();
      var travel = (px / DETENT) * pitch;
      // photos still queued in the current coast — zero when the strip is at rest,
      // so a single step stays a single step
      var pending = Math.abs(vel) / (1 - FRICTION) / pitch;
      var gain = Math.min(1 + SPIN_GAIN * pending, MAX_GAIN);
      kick(reduce ? travel : travel * gain * (1 - FRICTION));
    }, { passive: false });

    // ---- the page turn -------------------------------------------------------
    // In the doorway regime the document is two snap ports and nothing between,
    // so the browser turns the page with a snap fling of its own — and that fling
    // owns the scroller for as long as it flies. Wheel events that land while it
    // is in the air are filtered out, so the turn back cannot be taken until it
    // has landed: you stop, wait, and scroll again. Hence turning the page here
    // instead. One wheel event picks the port its direction is heading for and
    // eases the window onto it, and a wheel the other way retargets the ease on
    // the spot, mid-flight — there is nothing to wait out.
    //
    // Snapping comes off for the length of the ease and goes back on at the end.
    // It has to: a mandatory snap pulls every intermediate frame straight back
    // onto the port the ease started from, which is why the same turn written as
    // scrollTo({ behavior: "smooth" }) does not move the page at all. Off, the
    // ease runs; back on, CSS holds the two resting places as it always did, and
    // owns the turn again for the keyboard and for touch, which never came here.
    // This lives inside the carousel's block because it shares its reading of who
    // owns the gesture — the roll is the one thing that takes the wheel first.
    var doorway = document.querySelector(".doorway");
    var TURN = 420;                                     // ms for a page turn
    var turnRaf = null, turnTarget = null;
    function inDoorway() {                              // the two-port regime, per CSS
      return doorway && window.getComputedStyle(doorway).display !== "none";
    }
    function pageMax() { return document.documentElement.scrollHeight - window.innerHeight; }
    function turnPage(target) {
      var root = document.documentElement;
      if (turnRaf) cancelAnimationFrame(turnRaf);
      turnTarget = target;
      function land() { turnRaf = null; turnTarget = null; root.style.scrollSnapType = ""; }
      if (reduce) { window.scrollTo(0, target); land(); return; }
      var start = window.scrollY, dist = target - start, t0 = null;
      root.style.scrollSnapType = "none";
      turnRaf = requestAnimationFrame(function frame(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / TURN);
        window.scrollTo(0, start + dist * (1 - Math.pow(1 - p, 3)));   // ease-out cubic
        if (p < 1) turnRaf = requestAnimationFrame(frame); else land();
      });
    }
    document.addEventListener("wheel", function (e) {
      if (owner === "strip") return;                    // the roll has this gesture
      if (!inDoorway()) return;
      var d = e.deltaY;                                 // the turn is vertical only:
      if (!d) return;                                   // a sideways swipe is the roll's
      var target = d > 0 ? pageMax() : 0;
      // nothing to turn: the page is already standing on that port and no turn is
      // in the air, so leave the event alone
      if (turnRaf === null && Math.abs(window.scrollY - target) < 1) return;
      e.preventDefault();
      if (turnRaf === null || turnTarget !== target) turnPage(target);
    }, { passive: false });

    // drag to scroll (mouse / pen), with a fling on release; touch stays native
    var down = false, lastX = 0, flingV = 0, lastMoveT = 0;
    var FLING = 3.2;                                    // how far a flick carries past the drag
    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") return;
      halt();
      down = true; lastX = e.clientX; flingV = 0;
      track.classList.add("dragging");
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - lastX; lastX = e.clientX;
      track.scrollLeft -= dx;
      flingV = -dx;                                     // remember last motion for the fling
      lastMoveT = e.timeStamp;
    });
    function endDrag(e) {
      if (!down) return;
      down = false; track.classList.remove("dragging");
      // fling only if the pointer was still moving as it lifted — releasing after
      // a pause should leave the strip where it is
      var moving = e && e.timeStamp - lastMoveT < 80 && Math.abs(flingV) > 2;
      if (!reduce && moving) kick(flingV * FLING);
      else scheduleSnap();                              // no fling → settle to centre
    }
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);

    // keyboard: arrow keys step one photo, onto its resting place
    track.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      halt();
      var p = nextPoint(track.scrollLeft, e.key === "ArrowLeft" ? -1 : 1);
      if (p !== null) tweenTo(p);
      e.preventDefault();
    });

    // ---- custom minimal scrollbar --------------------------------------------
    var cbarEl = page.querySelector(".cbar");
    var thumb = page.querySelector(".cbar-thumb");
    if (cbarEl && thumb) {
      function drawBar() {
        var max = track.scrollWidth - track.clientWidth;
        var barW = cbarEl.clientWidth;
        if (max <= 0 || barW <= 0) { thumb.style.width = "0"; return; }
        var tw = Math.max(24, barW * track.clientWidth / track.scrollWidth);
        var x = (track.scrollLeft / max) * (barW - tw);
        thumb.style.width = tw + "px";
        thumb.style.transform = "translateX(" + x + "px)";
      }
      track.addEventListener("scroll", drawBar, { passive: true });  // tracks momentum too
      window.addEventListener("resize", drawBar);
      window.addEventListener("load", drawBar);
      drawBar();

      // click / drag anywhere on the bar to scroll to that position
      var barDown = false;
      function seek(clientX) {
        var r = cbarEl.getBoundingClientRect();
        var tw = thumb.offsetWidth;
        var frac = (clientX - r.left - tw / 2) / (r.width - tw);
        frac = Math.max(0, Math.min(1, frac));
        halt();
        track.scrollLeft = frac * (track.scrollWidth - track.clientWidth);
      }
      cbarEl.addEventListener("pointerdown", function (e) {
        barDown = true; cbarEl.setPointerCapture(e.pointerId); seek(e.clientX); e.preventDefault();
      });
      cbarEl.addEventListener("pointermove", function (e) { if (barDown) seek(e.clientX); });
      function barUp() { barDown = false; }
      cbarEl.addEventListener("pointerup", barUp);
      cbarEl.addEventListener("pointercancel", barUp);
    }
  }

})();
