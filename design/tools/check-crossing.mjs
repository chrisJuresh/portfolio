/* ============================================================================
   check-crossing.mjs — does the page cross into dark where the sheet says, and
   come back? #73's crossing, made tunable by #58's last user story.

     node design/tools/check-crossing.mjs

   Exit 0 if every criterion holds, 1 if any does not, and it names which. It
   serves the tree it is invoked from, so it answers for the working copy rather
   than for whatever is deployed — `preview_start` serves the main checkout in
   this repository and would silently report on `development` while looking like
   it reported on the branch.

   WHAT IS BEING ASSERTED, AND IT IS A COLOUR AND NOT A PROPERTY. #58's testing
   note asks for the reader's experience rather than the mechanism, and for the
   crossing the reader's experience is one thing: what colour the page is. So
   nothing below reads --dark to decide whether the page is dark. Every number in
   this file is body's own computed background, rasterised to sRGB through a 1x1
   canvas so that a `color-mix` in oklab, a `color(srgb ...)` and a plain hex are
   all the same three integers. --dark is READ in one place — the report — and
   asserted nowhere.

   WHY THE GROUND AND NOT THE INK. The ground is the only colour on the page that
   every other one is mixed against, it is painted by ONE element (body — see the
   crossing block's argument for why there is exactly one), and it is what the
   silent failure mode looks like: the author's profile preview going black. The
   two ink remaps are #73's and are measured in that ticket's own terms; what this
   file asks is whether the page is paper or not, and when.

   THE CROSSING'S TWO ENDS ARE REPORTED AND NOT ASSERTED, deliberately. --cross-in
   and --cross-out are the author's to choose — that is the whole of the user
   story — so a test that pinned them to 0 and 1 would fail the moment the choice
   was made. What is asserted is that whatever pair the sheet declares is the pair
   the page HONOURS: light before it, dark after it, moving in between, and the
   same in both directions.
   ========================================================================== */

import http from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const PAGE = "/portfolio/";

/* The turn regime is `(min-width: 1100px) and (min-height: 700px)`, and this is
   the window check-panel-nav.mjs and check-panel-exit.mjs both use, so the three
   answer about the same drawing. */
const DESK = { width: 1440, height: 900 };

/* A pair well inside the turn, so both ends have samples on either side of them
   and neither lands on 0 or 1 where the shipped pair already is. */
const MOVED = { in: 0.3, out: 0.7 };

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2",
  ".webm": "video/webm", ".mp4": "video/mp4",
  ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8",
};

async function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const target = resolve(ROOT, "." + normalize(clean).replace(/^([/\\])+/, sep));
  if (target !== ROOT && !target.startsWith(ROOT + sep)) return null;
  try {
    const info = await stat(target);
    if (info.isDirectory()) {
      const index = join(target, "index.html");
      await stat(index);
      return index;
    }
    return target;
  } catch {
    return null;
  }
}

function serve() {
  const server = http.createServer(async (req, res) => {
    const file = await resolveFile(req.url);
    if (!file) return void res.writeHead(404).end("not found");
    res.writeHead(200, { "content-type": MIME[extname(file).toLowerCase()] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

async function open(browser, origin, options = {}, path = PAGE) {
  const context = await browser.newContext({
    viewport: DESK,
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
    colorScheme: "light",
    ...options,
  });
  const page = await context.newPage();
  await page.goto(origin + path, { waitUntil: "load" });
  /* The corner pictures settle the CV's height, and the CV's height IS the
     landing every fraction below is a fraction of. Nothing may be read until
     they have arrived. */
  await page.waitForTimeout(2500);
  await page.evaluate(PROBE);
  return { context, page };
}

/* ---------------------------------------------------------------------------
   the page's own numbers, and one 1x1 canvas
   ------------------------------------------------------------------------
   RASTERISED AND NOT PARSED, which is the one piece of machinery in this file
   worth explaining. `color-mix(in oklab, ...)` computes to a colour Chromium may
   serialise as `oklab(...)` or `color(srgb ...)` depending on the mix, while
   `--bg` is `#fff` and a hex — so comparing the strings, or pulling numbers out
   of them with a regexp, compares different things at different scales. Painting
   both into a canvas and reading the pixel back is the only comparison that is
   about the colour rather than about its spelling, and it is what a reader's eye
   does anyway. */
const PROBE = () => {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  window.__px = (value) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  };
  window.__ground = () => window.__px(getComputedStyle(document.body).backgroundColor);
  window.__token = (name) => window.__px(
    getComputedStyle(document.documentElement).getPropertyValue(name).trim());
  /* THREE FRAMES BETWEEN MOVING THE PAGE AND READING IT. The driver is a scroll
     listener that queues a rAF, so a synchronous read after scrollTo() gets the
     colour written for wherever the page WAS — the trap check-panel-nav.mjs
     names, and it costs this file the whole sweep rather than one sample. */
  window.__settle = () => new Promise((done) => {
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(done)));
  });
};

const GEOMETRY = () => {
  const panel = document.querySelector(".panel");
  const cs = getComputedStyle(panel);
  const docTop = (el) => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
  const pageMax = document.documentElement.scrollHeight - window.innerHeight;
  return {
    regime: cs.scrollSnapAlign !== "none",
    port: Math.min(pageMax, docTop(panel) - (parseFloat(cs.scrollMarginTop) || 0)),
    pageMax,
    theme: document.documentElement.getAttribute("data-theme"),
    /* What the sheet says, read rather than restated — the pair the page is
       actually wearing, whatever this file was written against. */
    crossIn: Number(getComputedStyle(document.documentElement).getPropertyValue("--cross-in")),
    crossOut: Number(getComputedStyle(document.documentElement).getPropertyValue("--cross-out")),
    near: window.__token("--bg"),
    far: window.__token("--panel-bg-far"),
  };
};

/* The ground at every fraction of the turn, down and then back up. Both
   directions in one pass because "it reverses" is a comparison between the two
   and not a second measurement.

   SNAPPING COMES OFF FOR THE LENGTH OF THE SWEEP, and this is not the test
   loosening the page to get an answer it likes — it is the page's own lever,
   pulled the page's own way. `html { scroll-snap-type: y mandatory }` makes the
   document two ports and nothing between, so a mandatory snap pulls every
   intermediate scrollTo straight back to the port it started from: the first run
   of this file sampled 41 positions across the turn and got two colours, because
   the page had only been at two positions. app.js takes the same property off for
   exactly the length of the turn's ease and puts it back on landing — its own
   comment says a turn written as `scrollTo({ behavior: "smooth" })` does not move
   the page at all otherwise — so the middle of the turn IS a place the reader
   goes, with snapping off, and this is how to stand there.

   THE FRACTION IS MEASURED AND NOT REQUESTED. Every sample carries the scroll
   position the page actually reached over the landing, so a snap that came back,
   a rounded scrollHeight or a fractional port shows up as a moved fraction rather
   than as a colour attributed to a place the page never was. */
const SWEEP = async ({ port, samples }) => {
  const root = document.documentElement;
  const wasSnap = root.style.scrollSnapType;
  root.style.scrollSnapType = "none";
  const at = async (y) => {
    window.scrollTo(0, y);
    await window.__settle();
    return {
      y: window.scrollY,
      t: window.scrollY / port,
      rgb: window.__ground(),
      dark: Number(getComputedStyle(root).getPropertyValue("--dark")),
    };
  };
  const down = [], up = [];
  for (let i = 0; i <= samples; i++) down.push(await at((port * i) / samples));
  for (let i = samples; i >= 0; i--) up.push(await at((port * i) / samples));
  up.reverse();
  window.scrollTo(0, 0);
  await window.__settle();
  root.style.scrollSnapType = wasSnap;
  return { down, up };
};

/* ---------------------------------------------------------------------------
   the run
   ------------------------------------------------------------------------ */
const server = await serve();
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();

const problems = [];
const pad = 24;
const say = (k, v) => console.log(k.padEnd(pad) + " " + v);

const SAMPLES = 40;
let geo, shipped, moved, restored, collapsed, pinned, released, toggled, still, deep, capture;

try {
  /* ---- the shipped crossing, and a moved one, in one page ---------------- */
  {
    const { context, page } = await open(browser, origin);
    geo = await page.evaluate(GEOMETRY);
    if (!geo.regime) throw new Error(`${DESK.width}x${DESK.height} is not in the turn regime`);

    shipped = await page.evaluate(SWEEP, { port: geo.port, samples: SAMPLES });

    /* ---- the pair the sheet declares is the pair the page honours --------
       Written inline on <html>, which is exactly what the tuner does, and then
       re-read through the handle arrival.js exposes for it. If the two ends were
       constants in that file instead of declarations in the sheet, this would be
       unreachable from out here and so would the tuner. */
    await page.evaluate(({ a, b }) => {
      document.documentElement.style.setProperty("--cross-in", String(a));
      document.documentElement.style.setProperty("--cross-out", String(b));
      window.__arrival.remeasure();
    }, { a: MOVED.in, b: MOVED.out });
    moved = await page.evaluate(SWEEP, { port: geo.port, samples: SAMPLES });

    /* ---- and taking them off puts the shipped ramp back ------------------
       The one assertion that catches a tuner leaving a page changed: an override
       removed has to be an override gone, not a value the driver has copied. */
    await page.evaluate(() => {
      document.documentElement.style.removeProperty("--cross-in");
      document.documentElement.style.removeProperty("--cross-out");
      window.__arrival.remeasure();
    });
    restored = await page.evaluate(SWEEP, { port: geo.port, samples: SAMPLES });

    /* ---- and a pair too short to be a crossing still lands dark ----------
       arrival.js floors the span rather than dividing by nothing, and WHICH END
       it anchors the floor to is the difference between degrading and breaking:
       anchored at the near end, a pair like 0.99 / 1 puts the far end of the
       crossing past the landing and the page comes to REST at --dark 0.5, with
       the composition on a mid-grey ground. Anchored at the far end the start
       moves and the finish does not. Asserted rather than argued because the
       tuner can produce this pair with two drags. */
    collapsed = await page.evaluate(async ({ port }) => {
      document.documentElement.style.setProperty("--cross-in", "0.99");
      document.documentElement.style.setProperty("--cross-out", "1");
      window.__arrival.remeasure();
      const root = document.documentElement;
      const wasSnap = root.style.scrollSnapType;
      root.style.scrollSnapType = "none";
      window.scrollTo(0, port);
      await window.__settle();
      const rest = window.__ground();
      window.scrollTo(0, 0);
      await window.__settle();
      const top = window.__ground();
      root.style.scrollSnapType = wasSnap;
      root.style.removeProperty("--cross-in");
      root.style.removeProperty("--cross-out");
      window.__arrival.remeasure();
      return { rest, top };
    }, { port: geo.port });

    /* ---- the turn, held ------------------------------------------------- */
    pinned = await page.evaluate(async () => {
      const seen = [];
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        window.__arrival.setTurn(t);
        await window.__settle();
        seen.push({ t, y: Math.round(window.scrollY), rgb: window.__ground() });
      }
      return seen;
    });
    released = await page.evaluate(async () => {
      window.__arrival.setTurn(null);
      await window.__settle();
      return { y: Math.round(window.scrollY), rgb: window.__ground() };
    });

    await context.close();
  }

  /* ---- the toggle still chooses what the page crosses FROM ---------------
     #58's user story 13, and the one that would read as the toggle silently
     breaking. A reader whose machine is dark, who has chosen light, scrolls into
     the section and comes back: what they must get at the top is their own
     choice and not the ground they were just looking at. */
  {
    const { context, page } = await open(browser, origin, { colorScheme: "dark" });
    const before = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    await page.evaluate(() => document.querySelector(".theme-toggle").click());
    await page.waitForTimeout(600);
    const g = await page.evaluate(GEOMETRY);
    const trip = await page.evaluate(async ({ port }) => {
      const read = () => ({ y: Math.round(window.scrollY), rgb: window.__ground() });
      window.scrollTo(0, 0); await window.__settle();
      const top = read();
      window.scrollTo(0, port); await window.__settle();
      const rest = read();
      window.scrollTo(0, 0); await window.__settle();
      return { top, rest, back: read() };
    }, { port: g.port });
    toggled = { before, after: g.theme, near: g.near, far: g.far, ...trip };
    await context.close();
  }

  /* ---- reduced motion --------------------------------------------------- */
  {
    const { context, page } = await open(browser, origin, { reducedMotion: "reduce" });
    const g = await page.evaluate(GEOMETRY);
    const sweep = await page.evaluate(SWEEP, { port: g.port, samples: 20 });
    /* AND A MOVED PAIR DOES NOT WAKE IT UP, which is the new thing to be sure
       of: two numbers in the sheet that a reader who asked for no movement can
       still be crossed by would be #73's criterion undone by #58's feature. The
       handle is not there to ask — arrival.js returns before it defines one — so
       the declarations are moved and the page is swept again. */
    const withMoved = await page.evaluate(async ({ port, a, b }) => {
      document.documentElement.style.setProperty("--cross-in", String(a));
      document.documentElement.style.setProperty("--cross-out", String(b));
      const seen = [];
      for (let i = 0; i <= 20; i++) {
        window.scrollTo(0, (port * i) / 20);
        await window.__settle();
        seen.push(window.__ground());
      }
      window.scrollTo(0, 0);
      return { handle: !!window.__arrival, seen };
    }, { port: g.port, a: MOVED.in, b: MOVED.out });
    still = { port: g.port, near: g.near, far: g.far, sweep, withMoved };
    await context.close();
  }

  /* ---- a deep link lands settled, not mid-crossing ---------------------- */
  {
    const { context, page } = await open(browser, origin, {}, PAGE + "#projects");
    const g = await page.evaluate(GEOMETRY);
    deep = await page.evaluate(() => ({
      y: Math.round(window.scrollY),
      rgb: window.__ground(),
      dark: Number(getComputedStyle(document.documentElement).getPropertyValue("--dark")),
      exit: Number(getComputedStyle(document.querySelector(".panel")).getPropertyValue("--exit")),
      hash: location.hash,
    }));
    deep.port = g.port;
    deep.far = g.far;

    /* ---- and there is nothing for the capture to fast-forward -----------
       The hazard #73 names, asserted rather than argued. The profile capture runs
       with Playwright's `animations: "disabled"`, which fast-forwards finite CSS
       animations to their end state — so what must be true of every element
       carrying the crossing is that no animation and no transition is running on
       it at all. body's own 0.35s theme fade is switched off inside the turn
       regime for a different reason (the crossing block says which) and this is
       the assertion that keeps it off. */
    capture = await page.evaluate(() => {
      const of = (el) => {
        const cs = getComputedStyle(el);
        return {
          animation: cs.animationName,
          transition: cs.transitionProperty + " " + cs.transitionDuration,
          duration: cs.transitionDuration.split(",").map((s) => parseFloat(s) || 0),
        };
      };
      return { html: of(document.documentElement), body: of(document.body) };
    });
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

/* ===========================================================================
   the report
   ======================================================================== */
const near = geo.near, far = geo.far;
const same = (a, b) => a && b && Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1 && Math.abs(a[2] - b[2]) <= 1;
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const show = (c) => (c ? `rgb(${c.join(" ")})` : "nothing");

say("serving", ROOT);
say("page", PAGE);
say("window", `${DESK.width}x${DESK.height}`);
say("rest position", `${geo.port}px, document max ${geo.pageMax}px`);
say("theme", `${geo.theme} — the page's ground is ${show(near)}`);
say("the section's far ground", show(far));
console.log("");

if (same(near, far)) {
  problems.push(`the theme's ground and the section's far ground are both ${show(near)}, ` +
    "so this run cannot see the crossing at all — measure it in a theme whose ground differs");
}

/* ---- 1. the shape of a crossing ---------------------------------------- */
/* Where a sweep leaves the near ground and where it reaches the far one, as
   fractions of the turn. Reported for the shipped pair and ASSERTED against the
   declared pair for the moved one: with the two ends at 0 and 1 the first
   sample past the top is already a shade off white, which is the crossing
   working and not a boundary to test. */
function edges(sweep) {
  const s = sweep.down;
  let lastNear = -1, firstFar = -1;
  for (let i = 0; i < s.length; i++) if (same(s[i].rgb, near)) lastNear = i;
  for (let i = 0; i < s.length; i++) if (same(s[i].rgb, far)) { firstFar = i; break; }
  return {
    leaves: lastNear < 0 ? null : s[lastNear].t,
    arrives: firstFar < 0 ? null : s[firstFar].t,
    lastNear, firstFar,
  };
}
function monotone(sweep) {
  return sweep.down.every((s, i) => i === 0 || lum(s.rgb) <= lum(sweep.down[i - 1].rgb) + 1);
}
function hysteresis(sweep) {
  return Math.max(...sweep.down.map((s, i) =>
    Math.max(...s.rgb.map((v, j) => Math.abs(v - sweep.up[i].rgb[j])))));
}

const e1 = edges(shipped);
const ends1 = { top: shipped.down[0], rest: shipped.down[SAMPLES] };
say("the sheet's crossing", `--cross-in ${geo.crossIn}, --cross-out ${geo.crossOut}`);
say("measured", `leaves the paper by turn ${e1.leaves === null ? "?" : e1.leaves.toFixed(3)}, ` +
  `fully dark from turn ${e1.arrives === null ? "NEVER" : e1.arrives.toFixed(3)}`);
say("ends", `${show(ends1.top.rgb)} at the top, ${show(ends1.rest.rgb)} at rest ` +
  `(--dark ${ends1.top.dark} to ${ends1.rest.dark})`);
say("gradual", `${new Set(shipped.down.map((s) => s.rgb.join(","))).size} distinct grounds ` +
  `over ${SAMPLES + 1} samples of the turn`);
say("monotone", monotone(shipped) ? "the ground only ever darkens on the way down" : "NO");
say("reverses", hysteresis(shipped) === 0
  ? "every sample identical scrolling up and scrolling down"
  : `DIFFERS by up to ${hysteresis(shipped)} of 255`);

if (!Number.isFinite(geo.crossIn) || !Number.isFinite(geo.crossOut)) {
  problems.push(`the sheet declares --cross-in ${geo.crossIn} and --cross-out ${geo.crossOut}, ` +
    "and a crossing cannot be driven from a value that is not a number");
} else if (geo.crossIn < 0 || geo.crossOut > 1 || geo.crossOut - geo.crossIn < 0.02) {
  problems.push(`the declared crossing runs from ${geo.crossIn} to ${geo.crossOut} of the turn, ` +
    "which is either outside it or too short to be gradual");
}
if (!same(ends1.top.rgb, near)) {
  problems.push(`at the top of the page the ground is ${show(ends1.top.rgb)} and the theme's is ` +
    `${show(near)} — the page is already partly crossed at scroll 0, which is what the profile capture photographs`);
}
if (!same(ends1.rest.rgb, far)) {
  problems.push(`at rest the ground is ${show(ends1.rest.rgb)} rather than the section's ${show(far)}, ` +
    "so the composition is not sitting on its own ground");
}
if (!monotone(shipped)) problems.push("the ground does not darken monotonically through the turn — it comes back before it has finished");
if (hysteresis(shipped) !== 0) {
  problems.push(`the ground depends on which way the page was scrolled (by up to ${hysteresis(shipped)} of 255), ` +
    "so the crossing does not reverse — a reader who scrolls back does not get the page they had");
}
if (new Set(shipped.down.map((s) => s.rgb.join(","))).size < 8) {
  problems.push("the ground takes fewer than 8 distinct values across the turn, which is a flip rather than a crossing");
}

/* ---- 2. a moved pair is honoured --------------------------------------- */
console.log("");
const e2 = edges(moved);
const beforeIn = moved.down.filter((s) => s.t <= MOVED.in && !same(s.rgb, near));
const afterOut = moved.down.filter((s) => s.t >= MOVED.out && !same(s.rgb, far));
const between = moved.down.filter((s) => s.t > MOVED.in && s.t < MOVED.out);
const betweenMoving = new Set(between.map((s) => s.rgb.join(","))).size;
say("moved to", `--cross-in ${MOVED.in}, --cross-out ${MOVED.out}`);
say("measured", `leaves the paper by turn ${e2.leaves === null ? "?" : e2.leaves.toFixed(3)}, ` +
  `fully dark from turn ${e2.arrives === null ? "NEVER" : e2.arrives.toFixed(3)}`);
say("still paper before it", beforeIn.length === 0
  ? `every sample up to turn ${MOVED.in} is exactly ${show(near)}`
  : `NO — ${beforeIn.length} sample(s) had left it, the first at ${show(beforeIn[0].rgb)}`);
say("still dark after it", afterOut.length === 0
  ? `every sample from turn ${MOVED.out} is exactly ${show(far)}`
  : `NO — ${afterOut.length} sample(s) had not arrived, the first at ${show(afterOut[0].rgb)}`);
say("and moving between", `${betweenMoving} distinct grounds over ${between.length} samples`);
say("reverses", hysteresis(moved) === 0 ? "yes" : `DIFFERS by up to ${hysteresis(moved)} of 255`);
if (beforeIn.length) problems.push(`with the crossing declared to start at turn ${MOVED.in} the ground had already left the paper before it — the declared start is not honoured`);
if (afterOut.length) problems.push(`with the crossing declared to finish at turn ${MOVED.out} the ground had not arrived by it — the declared finish is not honoured`);
if (betweenMoving < 8) problems.push(`between the two declared ends the ground takes only ${betweenMoving} values, so a shortened crossing is a flip`);
if (!monotone(moved)) problems.push("a moved crossing is not monotone in the scroll position");
if (hysteresis(moved) !== 0) problems.push("a moved crossing does not reverse identically");

/* ---- 3. and removing the override puts the page back ------------------- */
const drift = Math.max(...restored.down.map((s, i) =>
  Math.max(...s.rgb.map((v, j) => Math.abs(v - shipped.down[i].rgb[j])))));
say("override removed", drift === 0
  ? "the sheet's own crossing again, identical at all 41 samples"
  : `the page did NOT go back — up to ${drift} of 255 different`);
if (drift !== 0) problems.push(`taking the inline pair off left the page ${drift} of 255 from the sheet's own crossing, so a tuner cannot be closed without changing the page`);
say("a collapsed pair", `0.99 / 1 lands on ${show(collapsed.rest)} at rest, ${show(collapsed.top)} at the top`);
if (!same(collapsed.rest, far)) {
  problems.push(`with a crossing too short to run (0.99 to 1 of the turn) the page comes to rest on ${show(collapsed.rest)} ` +
    `rather than ${show(far)} — the span floor is anchored at the near end, so the crossing finishes past the landing ` +
    "and the composition sits on a half-crossed ground");
}
if (!same(collapsed.top, near)) problems.push(`a collapsed pair left the top of the page at ${show(collapsed.top)} rather than ${show(near)}`);

/* ---- 4. the turn, held -------------------------------------------------- */
console.log("");
const heldUnscrolled = pinned.every((p) => p.y === 0);
const heldMatches = pinned.map((p) => {
  const i = Math.round(p.t * SAMPLES);
  return { t: p.t, held: p.rgb, scrolled: shipped.down[i].rgb, ok: same(p.rgb, shipped.down[i].rgb) };
});
say("held turn", pinned.map((p) => `${p.t}:${show(p.rgb)}`).join("  "));
say("without scrolling", heldUnscrolled ? "the page never moved" : "NO — the hold scrolled the page");
say("and it agrees", heldMatches.every((m) => m.ok)
  ? "every held fraction is the colour that scrolling to it gives"
  : heldMatches.filter((m) => !m.ok).map((m) => `${m.t}: ${show(m.held)} vs ${show(m.scrolled)}`).join(", "));
say("released", `${show(released.rgb)} at ${released.y}px`);
if (!heldUnscrolled) problems.push("holding the turn scrolled the page, so a tuner cannot look at the middle of the crossing without moving what it is looking at");
if (!heldMatches.every((m) => m.ok)) problems.push("a held turn draws a different colour from scrolling to the same fraction, so the tuner is not showing the page a reader would get");
if (!same(released.rgb, near)) problems.push(`releasing the hold left the ground at ${show(released.rgb)} rather than the theme's ${show(near)} at scroll 0`);

/* ---- 5. the toggle ----------------------------------------------------- */
console.log("");
say("machine dark, chose", `${toggled.before} -> ${toggled.after}, whose ground is ${show(toggled.near)}`);
say("at the top", show(toggled.top.rgb));
say("in the section", show(toggled.rest.rgb));
say("and back at the top", show(toggled.back.rgb));
if (toggled.after !== "light") {
  problems.push(`the toggle did not reach light (data-theme is "${toggled.after}"), so nothing about the reader's choice was measured`);
} else {
  if (!same(toggled.top.rgb, toggled.near)) problems.push(`with light chosen on a dark machine the top of the page is ${show(toggled.top.rgb)} rather than ${show(toggled.near)}`);
  if (!same(toggled.rest.rgb, toggled.far)) problems.push(`with light chosen the section is ${show(toggled.rest.rgb)} rather than ${show(toggled.far)} — the crossing does not happen`);
  if (!same(toggled.back.rgb, toggled.near)) problems.push(`after scrolling into the section and back, a reader who chose light gets ${show(toggled.back.rgb)} — the toggle has silently stopped working`);
}

/* ---- 6. reduced motion ------------------------------------------------- */
console.log("");
const stillMoved = still.sweep.down.filter((s) => !same(s.rgb, still.near));
const stillMovedPair = still.withMoved.seen.filter((c) => !same(c, still.near));
say("reduced motion", stillMoved.length
  ? `CROSSES — ${stillMoved.length} of 21 samples left the paper`
  : `the ground is ${show(still.near)} at all 21 scroll positions across the turn`);
say("with a moved pair", stillMovedPair.length
  ? `CROSSES — ${stillMovedPair.length} of 21 samples moved`
  : "still nothing, so the two ends cannot be used to reintroduce the movement");
say("and no handle", still.withMoved.handle ? "window.__arrival is defined" : "window.__arrival is absent, as the file's early return says");
if (stillMoved.length) problems.push("under prefers-reduced-motion the page still crosses into dark; #73 asks for the transition removed rather than shortened");
if (stillMovedPair.length) problems.push("under prefers-reduced-motion a declared crossing window reintroduces the movement");

/* ---- 7. the deep link ------------------------------------------------- */
console.log("");
say("/portfolio/#projects", `landed at ${deep.y}px against a port of ${deep.port}px, url "${deep.hash}"`);
say("and settled", `ground ${show(deep.rgb)}, --dark ${deep.dark}, --exit ${deep.exit}`);
if (deep.y !== deep.port) problems.push(`a deep link to the section landed at ${deep.y}px rather than on the port at ${deep.port}px`);
if (!same(deep.rgb, deep.far)) problems.push(`a deep link to the section lands on a ground of ${show(deep.rgb)} rather than ${show(deep.far)} — the reader arrives mid-crossing`);
if (deep.exit !== 0) problems.push(`a deep link to the section lands with --exit ${deep.exit}, so the composition is mid-arrival`);

/* ---- 8. nothing to fast-forward -------------------------------------- */
const running = ["html", "body"].filter((k) => capture[k].animation !== "none");
const easing = ["html", "body"].filter((k) => capture[k].duration.some((d) => d > 0));
say("no animation", running.length ? `${running.join(" and ")} carries ${running.map((k) => capture[k].animation).join(", ")}` : "neither <html> nor body");
say("no transition", easing.length ? `${easing.map((k) => k + ": " + capture[k].transition).join("; ")}` : "neither <html> nor body");
if (running.length) {
  problems.push(`${running.join(" and ")} carries a CSS animation in the turn regime — the profile capture runs with ` +
    "animations disabled, which fast-forwards it to its end state and photographs this page dark at scroll 0");
}
if (easing.length) {
  problems.push(`${easing.join(" and ")} eases its colour (${easing.map((k) => capture[k].transition).join("; ")}), ` +
    "so the ground lags the rest of the crossing — one ground means one timing, and a scroll-driven crossing wants none");
}

/* ---- and the verdict -------------------------------------------------- */
console.log("");
if (problems.length) {
  console.log(`${problems.length} problem${problems.length === 1 ? "" : "s"}:`);
  for (const p of problems) console.log("  - " + p);
  process.exit(1);
}
console.log("the page crosses into dark where the sheet says, and comes back — #73, tunable per #58");
