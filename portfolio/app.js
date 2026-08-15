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
  // of the page. It sits OUTSIDE <main class="col">, as a sibling of it — .page
  // is a flex column and the title has to be .page's own child to be held
  // against the bottom edge. On a screen that composes to one page it is pinned
  // to the fold instead, and one page turn later the section it names is
  // standing on the screen with a masthead of its own. It does not move or
  // resize on the way: all the geometry is CSS — see --cut-* and the turn block
  // in styles.css — and cut-morph.js only turns its face.
  //
  // THE WORD IS A PICTURE, not type. It is the outlines of PROJECTS set in Friz
  // Quadrata, baked to one SVG path by design/cut-title/build-cut-title.py, and
  // it is here rather than in a file of its own so that it is on screen at first
  // paint — no second request to pop in behind the composition it belongs to.
  // Vector, so it is exact at any size on any display; `currentColor`, so the
  // two themes and the hover state are one file. Nothing about the face is on
  // the wire any more: see the cut-title block in styles.css for why the word
  // stopped being text and what the geometry is derived from now.
  //
  // The visible word being a picture is exactly why the text is still here. The
  // <svg> is aria-hidden and the .visually-hidden span beside it is what a
  // screen reader announces and a crawler indexes — the same "full text in the
  // markup" this line has always had, now stated rather than drawn.
  /* cut-title:begin — generated by design/cut-title/build-cut-title.py */
  var word = '<svg class="cut-title__word" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8723.7 1853.2" fill="currentColor" aria-hidden="true"><path d="M2 34.2H500Q706 34.2 837.5 130.2Q969 226.2 969 393.2Q969 507.2 904 596.8Q839 686.2 737 732.2Q635 778.2 518 778.2Q428 778.2 369 749.2Q461 744.2 542 708.2Q623 672.2 679 600.2Q735 528.2 735 434.2Q735 306.2 655.5 244.2Q576 182.2 445 182.2Q372 182.2 301 194.2V1118.2Q301 1153.2 301 1166.8Q301 1180.2 303 1208.2Q305 1236.2 309 1249.8Q313 1263.2 320.5 1284.8Q328 1306.2 339 1319.2Q350 1332.2 367.5 1347.8Q385 1363.2 408 1376.2V1382.2H0V1376.2Q19 1369.2 34 1356.2Q49 1343.2 58.5 1330.8Q68 1318.2 75 1294.8Q82 1271.2 85 1257.2Q88 1243.2 90 1213.8Q92 1184.2 92.5 1173.8Q93 1163.2 92.5 1131.2Q92 1099.2 92 1095.2V323.2Q92 318.2 92.5 287.2Q93 256.2 92.5 245.2Q92 234.2 90.5 205.2Q89 176.2 85.5 162.2Q82 148.2 75.5 125.2Q69 102.2 59.5 88.8Q50 75.2 35.5 61.8Q21 48.2 2 41.2ZM1095 34.2H1582Q1781 34.2 1893.5 126.8Q2006 219.2 2006 364.2Q2006 494.2 1910 594.2Q1814 694.2 1681 725.2L1976 1095.2Q2105 1254.2 2307 1382.2H2119Q2036 1382.2 1981 1359.2Q1926 1336.2 1881 1280.2L1631 970.2L1443 682.2Q1496 674.2 1543 660.8Q1590 647.2 1638 623.8Q1686 600.2 1720 568.8Q1754 537.2 1775.5 491.2Q1797 445.2 1797 389.2Q1797 283.2 1718.5 219.8Q1640 156.2 1533 161.2Q1481 163.2 1394 178.2V1095.2Q1394 1100.2 1393.5 1132.2Q1393 1164.2 1393.5 1174.8Q1394 1185.2 1395.5 1214.8Q1397 1244.2 1400.5 1257.8Q1404 1271.2 1411 1294.8Q1418 1318.2 1427.5 1330.8Q1437 1343.2 1452 1356.2Q1467 1369.2 1486 1376.2V1382.2H1095V1376.2Q1114 1369.2 1128.5 1356.8Q1143 1344.2 1152.5 1330.8Q1162 1317.2 1169 1294.8Q1176 1272.2 1179 1256.8Q1182 1241.2 1183.5 1214.2Q1185 1187.2 1185.5 1173.8Q1186 1160.2 1185.5 1131.8Q1185 1103.2 1185 1095.2V323.2Q1185 315.2 1185.5 286.8Q1186 258.2 1185.5 244.8Q1185 231.2 1183.5 203.8Q1182 176.2 1179 160.8Q1176 145.2 1169.5 123.2Q1163 101.2 1153 87.8Q1143 74.2 1128.5 61.2Q1114 48.2 1095 41.2ZM2975.9 0.2Q3132.9 -0.8 3270.9 55.8Q3408.9 112.2 3504.4 207.8Q3599.9 303.2 3654.4 430.2Q3708.9 557.2 3708.9 694.2Q3708.9 847.2 3648.4 982.8Q3587.9 1118.2 3485.9 1212.2Q3383.9 1306.2 3245.4 1360.8Q3106.9 1415.2 2955.9 1415.2Q2753.9 1415.2 2583.4 1326.2Q2412.9 1237.2 2310.4 1073.2Q2207.9 909.2 2207.9 704.2Q2207.9 512.2 2309.4 348.8Q2410.9 185.2 2588.4 90.2Q2765.9 -4.8 2975.9 0.2ZM2961.9 147.2Q2727.9 147.2 2584.9 299.2Q2441.9 451.2 2441.9 686.2Q2441.9 794.2 2479.4 898.2Q2516.9 1002.2 2582.9 1084.2Q2648.9 1166.2 2748.9 1216.8Q2848.9 1267.2 2965.9 1267.2Q3195.9 1267.2 3335.9 1117.2Q3475.9 967.2 3475.9 735.2Q3475.9 622.2 3440.4 517.2Q3404.9 412.2 3340.9 329.2Q3276.9 246.2 3178.4 196.8Q3079.9 147.2 2961.9 147.2ZM3976.9 1357.2V323.2Q3976.9 318.2 3977.4 286.2Q3977.9 254.2 3977.4 243.8Q3976.9 233.2 3975.4 203.8Q3973.9 174.2 3970.4 160.8Q3966.9 147.2 3959.9 123.8Q3952.9 100.2 3943.4 87.8Q3933.9 75.2 3918.9 61.8Q3903.9 48.2 3884.9 41.2V34.2H4275.9V41.2Q4256.9 48.2 4242.4 61.8Q4227.9 75.2 4218.4 87.8Q4208.9 100.2 4202.4 123.8Q4195.9 147.2 4192.4 160.8Q4188.9 174.2 4187.4 203.8Q4185.9 233.2 4185.4 244.2Q4184.9 255.2 4185.4 286.8Q4185.9 318.2 4185.9 323.2V1484.2Q4185.9 1803.2 3726.9 1853.2V1847.2Q3810.9 1793.2 3861.4 1742.2Q3911.9 1691.2 3936.9 1628.8Q3961.9 1566.2 3969.4 1508.2Q3976.9 1450.2 3976.9 1357.2ZM4758.8 725.2V1210.2L5018.8 1235.2Q5120.8 1244.2 5221.3 1212.8Q5321.8 1181.2 5397.8 1114.2H5403.8L5311.8 1382.2H4457.8V1376.2Q4476.8 1369.2 4491.8 1356.2Q4506.8 1343.2 4516.3 1330.8Q4525.8 1318.2 4532.8 1294.8Q4539.8 1271.2 4542.8 1257.2Q4545.8 1243.2 4547.8 1213.8Q4549.8 1184.2 4550.3 1173.8Q4550.8 1163.2 4550.3 1131.2Q4549.8 1099.2 4549.8 1095.2V323.2Q4549.8 318.2 4550.3 286.2Q4550.8 254.2 4550.3 243.8Q4549.8 233.2 4548.3 203.8Q4546.8 174.2 4543.3 160.8Q4539.8 147.2 4532.8 123.8Q4525.8 100.2 4516.3 87.8Q4506.8 75.2 4491.8 61.8Q4476.8 48.2 4457.8 41.2V34.2H5112.8Q5118.8 34.2 5132.8 34.8Q5146.8 35.2 5154.8 34.8Q5162.8 34.2 5173.8 33.8Q5184.8 33.2 5193.3 30.8Q5201.8 28.2 5209.8 24.2H5215.8V264.2H5209.8Q5166.8 214.2 5109.3 198.2Q5051.8 182.2 4967.8 182.2Q4835.8 182.2 4758.8 196.2V577.2H5002.8Q5067.8 577.2 5092.8 565.2H5098.8V782.2H5092.8Q5080.8 761.2 5061.3 748.8Q5041.8 736.2 5010.8 731.8Q4979.8 727.2 4963.3 726.2Q4946.8 725.2 4910.8 725.2ZM6609.8 53.2V288.2Q6427.8 172.2 6230.8 172.2Q6018.8 172.2 5884.8 312.2Q5750.8 452.2 5750.8 675.2Q5750.8 826.2 5814.3 955.8Q5877.8 1085.2 5998.3 1165.2Q6118.8 1245.2 6271.8 1245.2Q6482.8 1245.2 6707.8 1116.2H6713.8L6609.8 1353.2Q6477.8 1415.2 6299.8 1415.2Q5937.8 1415.2 5727.8 1224.8Q5517.8 1034.2 5517.8 706.2Q5517.8 497.2 5609.8 336.8Q5701.8 176.2 5864.8 89.2Q6027.8 2.2 6236.8 2.2Q6396.8 2.2 6609.8 53.2ZM7308.8 182.2V1116.2Q7308.8 1174.2 7310.3 1199.8Q7311.8 1225.2 7321.3 1263.8Q7330.8 1302.2 7353.8 1327.8Q7376.8 1353.2 7415.8 1376.2V1382.2H7009.8V1376.2Q7028.8 1369.2 7043.3 1355.8Q7057.8 1342.2 7067.3 1329.2Q7076.8 1316.2 7083.3 1293.2Q7089.8 1270.2 7093.3 1256.2Q7096.8 1242.2 7098.3 1213.2Q7099.8 1184.2 7100.3 1173.2Q7100.8 1162.2 7100.3 1131.2Q7099.8 1100.2 7099.8 1095.2V182.2H6919.8Q6763.8 182.2 6675.8 264.2H6669.8L6741.8 20.2H6747.8Q6758.8 25.2 6770.8 27.2Q6782.8 29.2 6800.8 31.2Q6818.8 33.2 6825.8 34.2H7640.8Q7703.8 34.2 7734.8 20.2H7740.8L7675.8 264.2H7669.8Q7638.8 182.2 7493.8 182.2ZM8605.7 47.2V278.2Q8546.7 218.2 8459.2 183.8Q8371.7 149.2 8283.7 149.2Q8236.7 149.2 8192.7 158.8Q8148.7 168.2 8108.7 188.8Q8068.7 209.2 8044.2 247.2Q8019.7 285.2 8019.7 335.2Q8019.7 392.2 8058.7 439.8Q8097.7 487.2 8159.7 522.2Q8221.7 557.2 8296.7 591.2Q8371.7 625.2 8446.7 662.8Q8521.7 700.2 8583.7 743.8Q8645.7 787.2 8684.7 850.8Q8723.7 914.2 8723.7 991.2Q8723.7 1100.2 8654.2 1197.2Q8584.7 1294.2 8457.2 1354.8Q8329.7 1415.2 8174.7 1415.2Q7977.7 1415.2 7808.7 1353.2L7748.7 1097.2Q7840.7 1176.2 7959.7 1221.8Q8078.7 1267.2 8197.7 1267.2Q8260.7 1267.2 8325.7 1244.8Q8390.7 1222.2 8440.7 1171.8Q8490.7 1121.2 8490.7 1054.2Q8490.7 1003.2 8466.7 960.8Q8442.7 918.2 8401.7 887.2Q8360.7 856.2 8307.7 828.8Q8254.7 801.2 8196.7 775.2Q8138.7 749.2 8080.2 722.2Q8021.7 695.2 7968.7 660.2Q7915.7 625.2 7874.7 584.2Q7833.7 543.2 7809.7 485.2Q7785.7 427.2 7785.7 358.2Q7785.7 265.2 7830.2 194.2Q7874.7 123.2 7949.7 82.8Q8024.7 42.2 8113.2 22.2Q8201.7 2.2 8299.7 2.2Q8463.7 2.2 8605.7 47.2Z"/></svg>';
  /* cut-title:end */
  // Where the two links into the projects section point, and that is the whole
  // of #71 on this page. The section the cut title is the title of is now on
  // this document — the panel after .doorway — so sending the reader to a URL
  // that 308s back to the page they are already standing on would reload the
  // document, discard the scroll position and re-run every script, to arrive
  // where an anchor gets in one frame. /projects still redirects here for the
  // links this repo does not own; see the redirects block in vercel.json.
  //
  // COMPUTED, NOT WRITTEN, and this is the trap: a fragment-only href resolves
  // against the BASE URL, not the document. This page sets <base href="/portfolio/">
  // (it has to — app.js builds every image path relative to it), while Vercel's
  // cleanUrls serves the page at /portfolio, with no trailing slash, which is
  // also what the canonical and og:url say. So a plain "#projects" resolves to
  // /portfolio/#projects, the path differs from the document's own, and the
  // browser does a full navigation — precisely the reload this link exists to
  // avoid, and invisible on a local server, which redirects /portfolio to
  // /portfolio/ and so makes base and document agree. Hardcoding
  // "/portfolio#projects" only moves the fault to the other URL. location.pathname
  // is whatever this document was actually served as, whichever that is, so the
  // fragment is the only part that ever differs and the scroll always stays in
  // the same document. Measured at both URLs before it was written this way.
  var panelHref = location.pathname + "#projects";

  var cut = '<div class="cut-title"><a href="' + panelHref + '">' + word +
            '<span class="visually-hidden">Projects</span></a></div>';

  page.innerHTML =
    '<main class="col">' +
      '<header class="masthead"><h1 class="name">' + esc(C.name) + "</h1>" +
        '<div class="masthead-meta">' +
          (C.subtitle ? '<p class="tagline">' + esc(C.subtitle) + "</p>" : "<span></span>") +
          '<a class="projects-link" href="' + panelHref + '">Projects</a>' +
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
    // In the one-screen regime the document is two snap ports and nothing between,
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
    //
    // THE CURVE. The turn is one QUINTIC Hermite in scroll position: it leaves
    // where the page IS, at the speed the page is ALREADY MOVING and under the
    // acceleration already ON it, and arrives at the port with both back at zero.
    // From a standstill the two carried terms drop out and what is left is
    // smootherstep, 10s³ - 15s⁴ + 6s⁵.
    //
    // What it replaced was the cubic, which from rest is smoothstep. Smoothstep
    // leaves and arrives at rest, but its ACCELERATION steps from nothing to full
    // in one frame at each end and holds a straight ramp in between — the page was
    // put under a constant force, carried across at a nearly steady 1.5× the
    // average, and had the force taken off it just as abruptly. That is a motor,
    // not a sheet of paper, and it is what read as linear. A curve is only as
    // smooth as its roughest derivative, and the cubic's second one is a step at
    // both ends. The quintic has three boundary conditions per end instead of two,
    // so acceleration starts and finishes at zero as well: the force swells into
    // the paper and ebbs out of it, nothing is ever switched on, and the middle is
    // a genuine peak at 1.875× rather than a plateau.
    //
    // NOTHING MOVES FASTER FOR IT. TURN went 640 → 800 ms in the same breath,
    // because 1.875 / 1.5 is exactly 800 / 640: peak speed on a 1440×1000 window
    // is 2051 px/s either way, to the pixel. The whole of the extra 160 ms is
    // spent in the leaving and the arriving — the stretch of the turn that
    // actually carries the distance is 405 ms where it was 389. The turn is not
    // slower; its ends are quieter.
    //
    // The word inherits all of that for nothing. cut-morph.js drives the morph off
    // the scroll fraction this writes, so this is also the first of the two
    // easings that reach a letter's shape, and stretching the turn by the same
    // factor the peak rose by leaves the second one exactly where it was: every
    // one of the eight letters peaks within 1% of the rate it peaked at before,
    // fractionally under it. See the note on SMOOTHSTEP in cut-morph.js.
    //
    // The two carried terms are what make a reversal continuous. Restarting the
    // old tween from the current position left the page travelling one way at full
    // speed and the next frame travelling the other way at full speed, and there
    // is no such thing in paper. The speed went in first; the acceleration is the
    // same argument one derivative up, and it is the one that matters at exactly
    // the moment a reversal happens, because that is when the force is largest.
    // Carried in, the sheet slows, stops, and comes back — and the word unwinds
    // with it, because it is reading the same number.
    //
    // Both carried terms are zero at BOTH ends of their basis, so whatever a turn
    // is handed, it still lands on the far port at a standstill. Swept at every
    // hundredth of a reversal it leaves the two ports untouched; swept again for a
    // reversal of a reversal — the one case where a turn is asked to change its
    // mind while a large force is on it — the page can be carried 26 px past a
    // port and clamped there by the browser for 109 ms, against the cubic's 13 px
    // and 247 ms. Further past, and a third of the time.
    var panel = document.querySelector(".panel");
    var TURN = 800;                                     // ms for a whole page turn
    // turnV in px/ms and turnA in px/ms², both signed: the speed and the force
    // this turn is carrying, read by the next one if it interrupts.
    var turnRaf = null, turnTarget = null, turnV = 0, turnA = 0;
    // The two-port regime, read off the cascade rather than restated here. The
    // panel takes `scroll-snap-align: start` inside the one-screen media query
    // and nowhere else, so this IS that query without a second copy of it to
    // drift. Deliberately not `scrollSnapType` on <html>, which would have been
    // the obvious probe and is a trap: turnPage() sets it to "none" for the
    // length of every ease, so a turn in the air would report the regime off and
    // a reversal mid-flight would be handed back to the browser.
    function inTurn() {
      return !!panel && window.getComputedStyle(panel).scrollSnapAlign !== "none";
    }
    function pageMax() { return document.documentElement.scrollHeight - window.innerHeight; }
    // The far port: the panel's own top edge, which is where `scroll-snap-align:
    // start` rests. NOT pageMax(), and the difference is only visible on a wide
    // window — the panel is min-height:--fold but the Frame grows with the width,
    // so past about 1600px the composition stands a few per cent past the fold
    // and the document is longer than the turn. Turning to pageMax() there would
    // fly the page to the panel's FOOT, overshooting the port and the masthead
    // with it — and the morph reads the same port, so the word would still be
    // turning after the page had stopped.
    function panelPort() {
      if (!panel) return pageMax();
      return Math.max(0, Math.min(pageMax(),
        panel.getBoundingClientRect().top + window.scrollY));
    }
    function turnPage(target) {
      var root = document.documentElement;
      var start = window.scrollY, dist = target - start;
      var v0 = turnRaf === null ? 0 : turnV;            // the speed already on the page
      var a0 = turnRaf === null ? 0 : turnA;            // and the force already on it
      if (turnRaf) cancelAnimationFrame(turnRaf);
      turnTarget = target;
      function land() {
        turnRaf = null; turnTarget = null; turnV = 0; turnA = 0;
        root.style.scrollSnapType = "";
      }
      if (reduce || !dist) { window.scrollTo(0, target); land(); return; }
      // TURN is written for the whole document; anything shorter takes the same
      // top speed rather than the same time, which is the square root of the
      // fraction. Floored so a reversal caught near its own port still has room
      // to absorb the speed it came in with instead of being flung past it.
      var full = Math.max(1, pageMax());
      var dur = TURN * Math.max(0.45, Math.sqrt(Math.min(1, Math.abs(dist) / full)));
      var t0 = null;
      root.style.scrollSnapType = "none";
      // the carried speed and force expressed per unit of s, which is what the
      // basis below is written in
      var m0 = v0 * dur, c0 = a0 * dur * dur;
      turnRaf = requestAnimationFrame(function frame(ts) {
        if (t0 === null) t0 = ts;
        var s = Math.min(1, (ts - t0) / dur), u = 1 - s;
        // Three terms, one per thing the turn has to honour. s³(10 - 15s + 6s²)
        // carries the DISTANCE and is smootherstep. s(1 - s)³(3s + 1) carries the
        // SPEED in, ½s²(1 - s)³ the FORCE; both are zero at s = 0 and s = 1 in
        // value, slope and curvature, so neither can move where the turn lands or
        // disturb the standstill it lands at.
        var y = start
              + dist * (s * s * s * (10 - 15 * s + 6 * s * s))
              + m0 * (s * u * u * u * (3 * s + 1))
              + c0 * (0.5 * s * s * u * u * u);
        // the same three differentiated once and twice: what this turn hands on to
        // one that interrupts it
        turnV = (dist * 30 * s * s * u * u
               + m0 * (1 + s * s * (-18 + s * (32 - 15 * s)))
               + c0 * (s * (1 + s * (-4.5 + s * (6 - 2.5 * s))))) / dur;
        turnA = (dist * 60 * s * (1 + s * (-3 + 2 * s))
               + m0 * (s * (-36 + s * (96 - 60 * s)))
               + c0 * (1 + s * (-9 + s * (18 - 10 * s)))) / (dur * dur);
        window.scrollTo(0, s < 1 ? y : target);
        if (s < 1) turnRaf = requestAnimationFrame(frame); else land();
      });
    }
    document.addEventListener("wheel", function (e) {
      if (owner === "strip") return;                    // the roll has this gesture
      if (!inTurn()) return;
      var d = e.deltaY;                                 // the turn is vertical only:
      if (!d) return;                                   // a sideways swipe is the roll's
      var port = panelPort();
      // Past the port, inside a panel taller than the window, the wheel is the
      // browser's again: there is a composition to read down there and the turn
      // has already done its job. CSS agrees — a snap area larger than the
      // scrollport relaxes snapping inside itself. Coming back up, the reader
      // scrolls natively to the port and the next notch turns the page.
      if (window.scrollY > port + 1) return;
      var target = d > 0 ? port : 0;
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
