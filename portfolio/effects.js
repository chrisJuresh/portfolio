/* The effect stack — the runtime half of THE EFFECT STACK in styles.css.
 *
 * Almost all of the stack is CSS, and deliberately: a texture, a blend mode and
 * a mask are things a browser already does on the compositor, and a script that
 * redrew any of it every frame would be paying for what is free. What is left
 * here is the four jobs CSS genuinely cannot do:
 *
 *   1. own `data-fx`, reading the URL and localStorage over the default the
 *      markup ships with;
 *   2. build the chromatic-aberration filter's reference and write the two
 *      feOffset primitives it turns on, since SVG filter primitives take
 *      attributes and no custom property can reach them;
 *   3. make the grain tile, which is one square of white noise and has no
 *      business being a request;
 *   4. draw the ASCII pass, which is the only effect here that has to look at
 *      what it is drawing.
 *
 * Nothing on the page depends on this file. It is loaded last, after app.js, and
 * a browser that never runs it — parse error, blocked script, anything — gets the
 * CV, the three corner photographs and the cut title exactly as they were before
 * any of this existed. The one thing that is NOT deferred to it is the default
 * set of effects, which is written on <html> in the markup, so the page opens in
 * its intended state rather than flashing untreated and then being decorated.
 */
(function () {
  "use strict";

  var root = document.documentElement;

  /* What the markup ships. Read rather than declared, so the default lives in
     one place — index.html — and this file cannot drift from it. */
  var SHIPPED = (root.getAttribute("data-fx") || "").trim();

  /* Every token the stylesheet knows about, in the order the tuner lists them.
     Its only other job is to be the whitelist: `?fx=` comes off a URL, and a URL
     is somewhere anybody can write anything, so what goes back onto the document
     is the intersection of what was asked for with what exists rather than the
     string as given. */
  var EFFECTS = ["film", "paper", "chroma", "chroma-pictures", "grain", "halftone",
                 "vignette", "halation", "ascii", "crt", "weave"];

  var STORE = "portfolio-fx";

  function tokens(s) {
    return String(s || "").trim().split(/\s+/).filter(function (t) {
      return EFFECTS.indexOf(t) >= 0;
    });
  }

  /* ---- which effects are on ---------------------------------------------
     Three sources, most explicit first. The URL wins because it is the thing
     somebody just typed; localStorage next, because it is what they chose last
     time; the markup's default last.

     `?fx=` with an empty value is meaningful and is not the same as no `?fx=` at
     all — it is "none of them", and it is the way to see the page underneath
     without clearing anything. Hence the `has` test rather than a truthiness
     one. */
  function initial() {
    try {
      var q = new URLSearchParams(location.search);
      if (q.has("fx")) return tokens(q.get("fx"));
    } catch (_) {}
    try {
      var saved = localStorage.getItem(STORE);
      if (saved !== null) return tokens(saved);
    } catch (_) {}
    return tokens(SHIPPED);
  }

  var on = initial();

  function apply(remember) {
    root.setAttribute("data-fx", on.join(" "));
    if (remember) {
      try { localStorage.setItem(STORE, on.join(" ")); } catch (_) {}
    }
    /* The ASCII pass is the one effect with work to do at the moment it is
       switched on, and nothing to do while it is off. */
    if (on.indexOf("ascii") >= 0) scheduleAscii(); else clearAscii();
  }

  /* ---- chromatic aberration ---------------------------------------------
     The reference first, and it is built off `location` for a reason worth
     repeating outside the stylesheet: this page carries <base href="/portfolio/">,
     so a bare url(#fx-chroma) in CSS resolves against the BASE and becomes
     /portfolio/#fx-chroma — which names this document only when the page was
     reached with the trailing slash. The site answers on /portfolio too, and
     there the lookup would fail and the three corner pictures would quietly lose
     their filter. Off location.href it is right on both.

     The hash is stripped rather than assumed absent: arriving at
     /portfolio#contact would otherwise produce a reference to a filter id nobody
     has. */
  function chromaUrl() {
    var here = location.href.split("#")[0];
    return 'url("' + here + '#fx-chroma")';
  }

  /* The split itself, and the softness of it. dx/dy are attributes on the two
     feOffset primitives and stdDeviation is one on the two feGaussianBlurs, so
     they are set here and not in the sheet; the values come FROM the sheet, so
     --fx-chroma-pic-* stays the one place each number is written and the tuner
     can move them like any others.

     --fx-chroma-pic-* and not --fx-chroma-*: this filter is the PICTURES' half
     of the effect and the type's shadows are the other, and the two carry their
     own numbers because a split only means anything against the size of what it
     is splitting. See the chroma block in styles.css.

     Through measure(), for the reason under `resolving a length` below: a custom
     property is not resolved by getComputedStyle, so a value written in rem, or
     as a calc, would arrive here as text and parseFloat would take a plausible
     wrong number out of it. Measuring costs one layout on a drag and is right
     whatever unit the sheet or the tuner ends up expressing the split in. */
  function syncChroma() {
    var dx = len("--fx-chroma-pic-x");
    var dy = len("--fx-chroma-pic-y");
    var soft = len("--fx-chroma-pic-blur");
    var r = document.getElementById("fx-chroma-r");
    var b = document.getElementById("fx-chroma-b");
    if (!r || !b) return;
    r.setAttribute("dx", -dx);
    r.setAttribute("dy", -dy);
    b.setAttribute("dx", dx);
    b.setAttribute("dy", dy);
    var rs = document.getElementById("fx-chroma-r-blur");
    var bs = document.getElementById("fx-chroma-b-blur");
    if (rs) rs.setAttribute("stdDeviation", soft);
    if (bs) bs.setAttribute("stdDeviation", soft);
  }

  /* ---- the grain tile ----------------------------------------------------
     One square of white noise as a data URI. Procedural because it is cheaper to
     make than to fetch — 128x128 of Math.random is well under a millisecond, and
     an asset would be a request, a cache entry and a version to keep in step for
     something with no content.

     Neutral grey with the noise in the alpha, not in the colour: the layer
     blends with `overlay`, which is a no-op at mid-grey, so a transparent pixel
     and a 50%-grey pixel both leave the page alone and the visible range is
     symmetric about doing nothing. Noise in the colour channels at full alpha
     would instead have made the average pixel lighten or darken the page
     depending on which way the random numbers fell. */
  function grainTile() {
    var n = 128;
    var c = document.createElement("canvas");
    c.width = c.height = n;
    var ctx = c.getContext("2d");
    if (!ctx) return null;
    var img = ctx.createImageData(n, n);
    var d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var v = (Math.random() * 255) | 0;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    try { return 'url("' + c.toDataURL("image/png") + '")'; } catch (_) { return null; }
  }

  /* ---- the ASCII pass ----------------------------------------------------
     The three corner pictures, redrawn as characters. It replaces them rather
     than covering them: the stylesheet takes all three opacities to 0 while the
     token is on, and this canvas stands in the same band at the same z-index.

     THE GEOMETRY IS COPIED, NOT MEASURED, and that is the one thing to know
     before changing either end. Two of the pictures are real elements and could
     be measured, but the plate is `body::after` and a pseudo-element has no box
     to ask about; and `background-position` in its four-value form comes back
     from getComputedStyle already normalised into a shape that is a chore to
     parse and differs between engines. So each picture's placement is restated
     below out of the same custom properties the sheet builds it from — every one
     of which is a plain length or a plain number, and all of which the plate
     tuner already probes the same way.

     What that costs: this table has to be kept in step with the corner-plate,
     corner-car and corner-eye blocks in styles.css. What it buys is that it is
     exact, and that it goes on being exact when the pictures are re-tuned, since
     it reads the variables rather than hard-coding what they currently say. */
  var PICTURES = [
    /* the plate, bottom-left: box is the band, picture pinned to the left edge,
       crop pushes its foot out through the box's bottom */
    { src: "--plate-src", w: "--plate-w", x: "--plate-x", crop: "--plate-crop",
      band: "var(--plate-band)", anchor: "left", foot: "bottom" },
    /* the car, top-right: box is the whole fold, picture pinned to the right
       edge and hung from the top, with a soft inner edge across the gantry */
    { src: "--car-src", w: "--car-w", x: "--car-x", y: "--car-y", crop: "--car-crop",
      band: "var(--fold)", anchor: "right", foot: "top", fade: "--car-fade" },
    /* the eye, bottom-right: the car's anchoring with the plate's foot. Its box
       is the one of the three the sheet does not name — .eye writes the
       subtraction into its own `height` rather than declaring an --eye-band — so
       it is restated here as the expression rather than as a variable. */
    { src: "--eye-src", w: "--eye-w", x: "--eye-x", crop: "--eye-crop",
      band: "calc(var(--fold) - var(--eye-y))", anchor: "right", foot: "bottom" }
  ];

  /* Light to dark. Ten steps, chosen so each is roughly as much darker than the
     last — a ramp that is even in COVERAGE rather than one that looks orderly in
     a source file, since the eye reads the field as tone and an uneven ramp
     comes out as banding. */
  var RAMP = " .:-=+*#%@";

  var canvas = document.querySelector(".fx-ascii");
  var asciiTimer = null;
  var loaded = {};      /* url -> HTMLImageElement, so a redraw is not a refetch */

  /* ---- resolving a length ------------------------------------------------
     getComputedStyle does NOT resolve a custom property. It hands back the token
     sequence the property was declared with, so `--fold` comes back as the four
     characters "100svh" and `--plate-w` as the whole of
     `min(calc(0.863 * var(--plate-band)), 2400px)`. parseFloat on either is a
     number, which is what makes this trap expensive: it returns 100 and 0
     respectively rather than failing, and the pictures land in the wrong place
     for a reason nothing in the console mentions.
     (design/plate/plate-tuner.html has the same problem and answers it the other
     way — by only ever offering rows whose values ARE plain numbers, which is
     why its size control is --plate-fill and not --plate-w.)

     So lengths are resolved by measurement, not by reading. A hidden probe is
     given the expression as a `width` or a `height` and asked how big it came
     out; layout does the substitution, the arithmetic, the min(), the svh and
     the clamp, and the answer is a used value in pixels. It is a child of body
     so it inherits the same custom properties the real elements do.

     Unitless numbers — --plate-crop, --car-fade, --fx-ascii-contrast — are
     exempt and read directly. A number has nothing to resolve. */
  var probe = null;
  function measure(expr, vertical) {
    if (!probe) {
      probe = document.createElement("div");
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText = "position:absolute;left:-9999px;top:0;" +
                            "visibility:hidden;pointer-events:none;contain:strict";
      document.body.appendChild(probe);
    }
    probe.style.width = probe.style.height = "0";
    probe.style[vertical ? "height" : "width"] = expr;
    var r = probe.getBoundingClientRect();
    return vertical ? r.height : r.width;
  }
  function len(name) { return measure("var(" + name + ")", false); }
  function num(cs, name) { return parseFloat(cs.getPropertyValue(name)) || 0; }

  /* `url("img/plate-800.webp?v=…")` as the sheet holds it → the bare URL. */
  function srcOf(cs, name) {
    var m = /url\((['"]?)(.*?)\1\)/.exec(cs.getPropertyValue(name));
    return m ? m[2] : null;
  }

  function image(url, then) {
    if (loaded[url]) { then(loaded[url]); return; }
    var img = new Image();
    img.onload = function () { loaded[url] = img; then(img); };
    img.onerror = function () { then(null); };
    img.src = url;
  }

  function clearAscii() {
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /* Coalesced, because every one of its triggers can fire in bursts — a resize
     is a stream of events, and a theme change is followed by three picture
     swaps as index.html re-points --plate-src and friends at the other ladder. */
  function scheduleAscii() {
    clearTimeout(asciiTimer);
    asciiTimer = setTimeout(drawAscii, 90);
  }

  function drawAscii() {
    if (!canvas || on.indexOf("ascii") < 0) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    var cs = getComputedStyle(root);
    var cell = len("--fx-ascii-cell") || 9;
    var contrast = num(cs, "--fx-ascii-contrast") || 1;
    var invert = num(cs, "--fx-ascii-invert") > 0.5;
    var dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);

    var cols = Math.ceil(box.width / cell);
    var rows = Math.ceil(box.height / cell);

    /* One cell per pixel. The whole point of the pass is that a cell is a single
       tone, so the averaging is done by the browser's own downscale of the
       source into a canvas this size rather than by summing pixels here — same
       answer, one drawImage instead of a loop over a few million samples. */
    var s = document.createElement("canvas");
    s.width = cols;
    s.height = rows;
    var sctx = s.getContext("2d", { willReadFrequently: true });
    if (!sctx) return;

    var pending = 0, started = false;

    PICTURES.forEach(function (p) {
      var url = srcOf(cs, p.src);
      if (!url) return;
      pending++;
      image(url, function (img) {
        if (img) place(sctx, cs, p, img, box, cols, rows);
        if (--pending === 0 && started) paint();
      });
    });
    started = true;
    if (pending === 0) paint();

    function paint() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, box.width, box.height);
      ctx.fillStyle = getComputedStyle(document.body).color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = Math.round(cell * 1.15) + "px ui-monospace, Consolas, monospace";

      var data = sctx.getImageData(0, 0, cols, rows).data;
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var i = (y * cols + x) * 4;
          var a = data[i + 3] / 255;
          if (a < 0.02) continue;          /* knocked-out sky: no character */
          /* Rec.709 luma, then how much INK it is — the pictures are dark
             subjects on a page whose paper is the sky, so density is darkness,
             and the alpha is in it because a half-covered pixel is half a mark. */
          var luma = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
          var ink = (invert ? luma : 1 - luma) * a;
          ink = Math.min(1, Math.max(0, (ink - 0.5) * contrast + 0.5));
          var ch = RAMP[Math.round(ink * (RAMP.length - 1))];
          if (ch === " ") continue;
          ctx.fillText(ch, (x + 0.5) * cell, (y + 0.5) * cell);
        }
      }
    }
  }

  /* One picture into the sampling canvas, at 1/cell scale, positioned exactly as
     the stylesheet positions it. Every branch here mirrors a `background-position`
     in styles.css and is commented with which.

     It goes through a scratch canvas of its own rather than straight onto the
     shared one, and that is not tidiness. The car's inner edge is a mask, a mask
     is applied by erasing, and an erase on a shared surface takes whatever else
     is already on it. Worse, a canvas gradient CLAMPS outside its two stops —
     before the start point it is the first colour, at full opacity — so an erase
     painted with the car's ramp does not stop at the gantry: it wipes everything
     to the left of it, which is the whole of the plate. The symptom was a page
     with a cable car and a wheel on it and no St Paul's anywhere.
     Each picture is masked inside its own layer and only the finished layer is
     composited. Three canvases of about 160x100 cells; the cost does not
     register. */
  function place(sctx, cs, p, img, box, cols, rows) {
    var kx = cols / box.width, ky = rows / box.height;   /* CSS px → cell */
    var w = len(p.w);
    var h = w * img.naturalHeight / img.naturalWidth;    /* background-size: W auto */
    var crop = num(cs, p.crop);
    var band = measure(p.band, true);

    /* `left --x` / `right --x`: a distance out from the corner it stands in. */
    var left = p.anchor === "left" ? len(p.x) : box.width - len(p.x) - w;

    /* The foot. `bottom calc(-1 * crop * w)` pushes the picture's foot below the
       box's own bottom edge so the box clips it — the plate and the eye. `top
       calc(y - crop * w)` hangs it from the top instead — the car. */
    var top;
    if (p.foot === "bottom") top = band - h + crop * w;
    else top = len(p.y) - crop * w;

    var layer = document.createElement("canvas");
    layer.width = cols;
    layer.height = rows;
    var lctx = layer.getContext("2d");
    if (!lctx) return;

    lctx.save();
    lctx.beginPath();
    lctx.rect(0, 0, cols, Math.min(rows, band * ky));    /* the box clips */
    lctx.clip();
    lctx.drawImage(img, left * kx, top * ky, w * kx, h * ky);
    lctx.restore();

    /* The car's inner edge, and without it the gantry comes out as a hard
       vertical wall of characters running down the page. The same two stops the
       sheet's mask uses, so the letters stop where the photograph does. */
    if (p.fade) {
      var fade = num(cs, p.fade);
      if (fade > 0) {
        var inner = (box.width - len(p.x) - w) * kx;
        var g = lctx.createLinearGradient(inner, 0, inner + fade * w * kx, 0);
        g.addColorStop(0, "rgba(0,0,0,1)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        lctx.globalCompositeOperation = "destination-out";
        lctx.fillStyle = g;
        lctx.fillRect(0, 0, cols, rows);
      }
    }
    sctx.drawImage(layer, 0, 0);
  }

  /* ---- boot --------------------------------------------------------------- */

  root.style.setProperty("--fx-chroma-url", chromaUrl());
  var tile = grainTile();
  if (tile) root.style.setProperty("--fx-grain-src", tile);
  syncChroma();
  apply(false);

  /* Both of the things the ASCII pass is measured against can move under it: the
     window, which changes the band and every picture's size with it, and the
     theme, which swaps all three pictures for the other ladder's files. The
     theme is watched on the attribute for index.html's reason — it is where every
     route into a theme change lands. */
  var t;
  window.addEventListener("resize", function () {
    clearTimeout(t);
    t = setTimeout(scheduleAscii, 200);
  });
  if (window.MutationObserver) {
    new MutationObserver(scheduleAscii)
      .observe(root, { attributes: true, attributeFilter: ["data-theme", "style"] });
  }

  /* ---- the seam the tuner comes in through --------------------------------
     design/effects/effects-tuner.html drives the real page in an iframe, exactly
     as the type tuner does, so it needs a way in that is not "reach into the
     document and hope". Everything it does goes through here.

     `set` deliberately does NOT remember: the tuner is somewhere numbers are
     being tried, and having it write every drag into the localStorage a visitor
     shares would mean a session at the tuner silently redecorating the site for
     the person who ran it. Only toggle() and reset(), which are the two things a
     visitor could also do, persist. */
  window.portfolioFx = {
    effects: EFFECTS.slice(),
    shipped: tokens(SHIPPED),
    list: function () { return on.slice(); },
    has: function (name) { return on.indexOf(name) >= 0; },
    toggle: function (name, want) {
      if (EFFECTS.indexOf(name) < 0) return false;
      var at = on.indexOf(name);
      var next = want === undefined ? at < 0 : !!want;
      if (next && at < 0) on.push(name);
      if (!next && at >= 0) on.splice(at, 1);
      apply(true);
      return next;
    },
    /* One custom property, on the root, plus whatever has to be re-derived from
       it. The two names that are not just a number to the compositor are listed
       explicitly rather than re-syncing everything on every drag. */
    set: function (name, value) {
      root.style.setProperty(name, value);
      if (name.indexOf("--fx-chroma-pic-") === 0) syncChroma();
      if (name.indexOf("--fx-ascii") === 0 || name === "--fx-y") scheduleAscii();
    },
    /* Every --fx- override off the root, back to what the sheet declares, with
       the effects left exactly as they are. The tuner needs this on every theme
       switch: four of the film's numbers and four of the paper's are declared
       once per theme, and an inline override set while looking at one theme
       would otherwise follow you into the other and hide what that theme
       actually ships.

       NOT removeAttribute("style"): index.html's boot script keeps --plate-src,
       --car-src and --eye-src there — the rung and the theme's ladder, decided
       by measurement and unrecoverable from the sheet — so clearing the
       attribute wholesale would take the three corner photographs off the page
       and leave them off until the next resize. Our own two derived properties
       are put back rather than kept, for the same reason they were derived. */
    clearVars: function () {
      var style = root.style;
      for (var i = style.length - 1; i >= 0; i--) {
        var name = style[i];
        if (name.indexOf("--fx-") === 0) style.removeProperty(name);
      }
      style.setProperty("--fx-chroma-url", chromaUrl());
      if (tile) style.setProperty("--fx-grain-src", tile);
      syncChroma();
      scheduleAscii();
    },
    reset: function () {
      window.portfolioFx.clearVars();
      on = tokens(SHIPPED);
      apply(true);
    },
    redraw: scheduleAscii
  };
})();
