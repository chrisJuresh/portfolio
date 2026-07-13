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
    ? '<section class="carousel at-start" aria-roledescription="carousel">' +
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

  var work = (C.work && C.work.length) ? section("Work experience", C.work.map(workItem).join("")) : "";
  var edu = (C.education && C.education.length) ? section("Education", C.education.map(eduItem).join("")) : "";
  var contact = (C.contact && C.contact.length)
    ? section("Contact", '<ul class="contact">' + C.contact.map(function (c, i) {
        return "<li" + (i === 0 ? ' class="primary"' : "") + '><a href="' + esc(c.href) + '">' +
               esc(c.text) + "</a></li>";
      }).join("") + "</ul>")
    : "";

  page.innerHTML =
    '<main class="col">' +
      '<header class="masthead"><h1 class="name">' + esc(C.name) + "</h1>" +
        (C.subtitle ? '<p class="tagline">' + esc(C.subtitle) + "</p>" : "") + "</header>" +
      intro + carousel + cbar + work + edu + contact +
    "</main>";

  // ---- carousel behaviour --------------------------------------------------
  var cEl = page.querySelector(".carousel");
  var track = page.querySelector(".track");
  if (track) {
    // reflect scroll position so the edge fades appear/disappear correctly
    function updateEdges() {
      var max = track.scrollWidth - track.clientWidth;
      cEl.classList.toggle("at-start", track.scrollLeft <= 2);
      cEl.classList.toggle("at-end", track.scrollLeft >= max - 2);
    }
    track.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    window.addEventListener("load", updateEdges);   // re-measure once images give the track its width
    updateEdges();

    // ---- momentum ("roulette wheel") scrolling + snap-to-centre --------------
    // Each flick adds to a velocity that decays with friction every frame; when
    // motion settles, the photo nearest the screen centre eases into the centre
    // (the first photo stays left-aligned with the text — it can't reach centre).
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var vel = 0, raf = null, mode = null;             // mode: "coast" | "tween"
    var FRICTION = 0.95, MIN_V = 0.35, MAX_V = 180;
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
    // centre the photo closest to the middle of the screen (clamped: first → left,
    // last → its resting spot)
    function snap() {
      if (down) return;
      var slides = track.querySelectorAll(".slide");
      if (!slides.length) return;
      var mid = window.innerWidth / 2, cur = track.scrollLeft, max = maxScroll();
      // snap points (in scrollLeft): first photo left-aligned (0), every other centred.
      // Pick the one nearest the current position so photo 1 doesn't steal the start.
      var best = 0, bestD = Math.abs(cur);
      for (var i = 1; i < slides.length; i++) {
        var r = slides[i].getBoundingClientRect();
        var s = cur + (r.left + r.width / 2 - mid);   // scrollLeft that centres photo i
        s = Math.max(0, Math.min(max, s));
        var d = Math.abs(s - cur);
        if (d < bestD) { bestD = d; best = s; }
      }
      if (Math.abs(best - cur) < 2) return;   // already at the nearest snap point
      tweenTo(best);
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

    // wheel spins the strip; repeated fast flicks build up speed
    track.addEventListener("wheel", function (e) {
      var d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      var m = maxScroll();
      if ((d < 0 && track.scrollLeft <= 0) || (d > 0 && track.scrollLeft >= m)) return; // at an end → let the page scroll
      e.preventDefault();
      var unit = e.deltaMode === 1 ? 16 : 1;            // line deltas vs pixel deltas
      kick(d * unit * (reduce ? 1 : 0.28));
    }, { passive: false });

    // drag to scroll (mouse / pen), with a fling on release; touch stays native
    var down = false, lastX = 0, flingV = 0;
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
    });
    function endDrag() {
      if (!down) return;
      down = false; track.classList.remove("dragging");
      if (!reduce && Math.abs(flingV) > 2) kick(flingV * 1.3);
      else scheduleSnap();                              // no fling → settle to centre
    }
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);

    // keyboard: arrow keys move roughly one photo, then it settles to centre
    track.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      halt();
      var step = track.clientWidth * 0.8 * (e.key === "ArrowLeft" ? -1 : 1);
      track.scrollBy({ left: step, behavior: reduce ? "auto" : "smooth" });
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
