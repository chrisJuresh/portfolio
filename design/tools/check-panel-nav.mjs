/* ============================================================================
   check-panel-nav.mjs — does the reader get carried into the section, and does
   the Rail tell the truth? #72.

     node design/tools/check-panel-nav.mjs

   Exit 0 if every one of #72's criteria holds, 1 if any does not, and it names
   which. It serves the tree it is invoked from, so it answers for the working
   copy rather than for whatever is deployed — `preview_start` serves the main
   checkout in this repository and would silently report on `development` while
   looking like it reported on the branch.

   WHAT IS BEING ASSERTED. #58's testing note asks for the reader's experience
   rather than the mechanism: that scrolling reaches the section, that the Rail
   reports the right selection, that a reversal does not snap, that reduced
   motion removes the movement and leaves the navigation. So nothing below reads
   an easing function or a property by name to check its shape. What it reads is
   where the page ended up, what the composition was drawn at while it got there,
   and what a screen reader would be handed.

   THE ARRIVAL IS AFFINE IN THE SCROLL POSITION, WHICH IS THE WHOLE ARGUMENT.
   --exit is (scroll / landing) - 1 and holds no state, so continuity, reversal
   and fast scrolling are not three behaviours to test but one identity to
   measure: if the composition is welded to the page at every frame, then
   whatever the page does smoothly the composition does smoothly, and there is
   nothing to strand. Section 2 measures the weld frame by frame through a real
   mid-flight reversal; sections 3 and 4 then only have to show that the PAGE
   behaves — which is app.js's quintic, and unchanged by this ticket.

   ONE PANEL, WHICH BOUNDS WHAT CAN BE ASSERTED AND IS SAID RATHER THAN WORKED
   AROUND. #58 puts the other two Panels out of scope, so "the selected label
   always matches what is on screen" has one Panel to be right about and the two
   inert entries are asserted to be inert — no link, nothing to follow, and said
   out loud to a screen reader. When a second Panel arrives, section 5's count of
   routes changes and nothing else here has to.
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
   the window check-panel-exit.mjs and the render harness both use, so the three
   answer about the same drawing. */
const DESK = { width: 1440, height: 900 };

/* One wheel notch, in the units the page's own DETENT is written in. */
const NOTCH = 120;

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

async function open(browser, origin, options) {
  const context = await browser.newContext({
    viewport: DESK,
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
    ...options,
  });
  const page = await context.newPage();
  await page.goto(origin + PAGE, { waitUntil: "load" });
  /* The corner pictures settle the CV's height, and the CV's height IS the
     landing. Everything below is measured against it, so nothing may be read
     until they have arrived. */
  await page.waitForTimeout(2500);
  return { context, page };
}

/* The page's own numbers, read once per context: where it comes to rest, and the
   divisor arrival.js writes --exit against. Both are computed the way that file
   computes them rather than restated, so a change to the landing shows up here
   as a moved measurement instead of as a passing test. */
const GEOMETRY = () => {
  const panel = document.querySelector(".panel");
  const cs = getComputedStyle(panel);
  const docTop = (el) => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
  const pageMax = document.documentElement.scrollHeight - window.innerHeight;
  return {
    regime: cs.scrollSnapAlign !== "none",
    port: Math.min(pageMax, docTop(panel) - (parseFloat(cs.scrollMarginTop) || 0)),
    pageMax,
  };
};

/* ---------------------------------------------------------------------------
   1. the arrival is welded to the scroll position
   ------------------------------------------------------------------------ */
const WELD = async ({ port, samples }) => {
  const panel = document.querySelector(".panel");
  const head = document.querySelector(".panel-head");
  const read = () => ({
    y: window.scrollY,
    exit: Number(getComputedStyle(panel).getPropertyValue("--exit").trim()),
    head: Number(getComputedStyle(head).opacity),
  });
  /* THREE FRAMES BETWEEN MOVING THE PAGE AND READING IT, and reading sooner is
     the trap that cost the first run of this file three false failures. The
     driver is a scroll listener that queues a rAF, so a synchronous read after
     scrollTo() gets the value written for wherever the page WAS — the whole
     sweep came back at -1 and looked like a driver that never ran. One frame for
     the scroll event to be delivered, one for the rAF it queues to run, one to
     be sure. */
  const settle = () => new Promise((done) => {
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(done)));
  });
  const at = async (y) => { window.scrollTo(0, y); await settle(); return read(); };
  const down = [], up = [];
  for (let i = 0; i <= samples; i++) down.push(await at((port * i) / samples));
  for (let i = samples; i >= 0; i--) up.push(await at((port * i) / samples));
  up.reverse();
  return { down, up };
};

/* ---------------------------------------------------------------------------
   2. a real mid-flight reversal, frame by frame
   ------------------------------------------------------------------------
   Recorded from inside the page because what is being measured is per-FRAME
   continuity, and a round trip per sample would be slower than the thing it is
   sampling. The recorder is started, the wheels are dispatched from outside, and
   the trace is collected afterwards. */
const RECORD = (frames) => {
  const panel = document.querySelector(".panel");
  window.__trace = [];
  const step = (ts) => {
    window.__trace.push([ts, window.scrollY, Number(getComputedStyle(panel).getPropertyValue("--exit").trim())]);
    if (window.__trace.length < frames) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

/* ---------------------------------------------------------------------------
   The run
   ------------------------------------------------------------------------ */
const server = await serve();
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();

const problems = [];
const pad = 22;
const say = (k, v) => console.log(k.padEnd(pad) + " " + v);

let geo, weld, reversal, burst, touch, railShape, keyboard, tree, still, turn;

try {
  /* ---- the desktop context, which is most of the ticket ------------------- */
  {
    const { context, page } = await open(browser, origin);
    geo = await page.evaluate(GEOMETRY);
    if (!geo.regime) throw new Error(`${DESK.width}x${DESK.height} is not in the turn regime`);

    weld = await page.evaluate(WELD, { port: geo.port, samples: 40 });

    /* ---- the reversal ---------------------------------------------------- */
    await page.evaluate((y) => window.scrollTo(0, y), 0);
    await page.waitForTimeout(400);
    /* Away from the carousel, so the capture-phase listener in app.js assigns
       the gesture to the page rather than to the strip. The left margin at the
       foot of the first screen is the Rail's column and holds nothing else. */
    await page.mouse.move(20, DESK.height - 40);
    await page.evaluate(RECORD, 90);
    await page.mouse.wheel(0, NOTCH);              // start the turn down
    await page.waitForTimeout(220);                // ~13 frames in
    await page.mouse.wheel(0, -NOTCH);             // and reverse it mid-flight
    await page.waitForTimeout(1600);
    reversal = await page.evaluate(() => ({
      trace: window.__trace,
      y: window.scrollY,
      exit: Number(getComputedStyle(document.querySelector(".panel")).getPropertyValue("--exit").trim()),
    }));

    /* ---- fast scrolling -------------------------------------------------- */
    await page.evaluate((y) => window.scrollTo(0, y), 0);
    await page.waitForTimeout(400);
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, NOTCH * 4);
    await page.waitForTimeout(1800);
    burst = await page.evaluate(() => ({
      y: window.scrollY,
      exit: Number(getComputedStyle(document.querySelector(".panel")).getPropertyValue("--exit").trim()),
    }));

    /* ---- the page turn, unchanged --------------------------------------- */
    await page.evaluate((y) => window.scrollTo(0, y), 0);
    await page.waitForTimeout(400);
    await page.mouse.wheel(0, NOTCH);
    await page.waitForTimeout(1400);
    const downTo = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, -NOTCH);
    await page.waitForTimeout(1400);
    const upTo = await page.evaluate(() => window.scrollY);
    /* And the strip still takes a gesture that begins on it, without turning
       the page — the arbitration this ticket had to cooperate with rather than
       join. The pointer goes onto a photograph and the wheel is vertical, which
       is the case the capture-phase listener exists to settle. */
    const strip = await page.locator(".track").boundingBox();
    await page.mouse.move(strip.x + strip.width / 2, strip.y + strip.height / 2);
    const before = await page.evaluate(() => ({ y: window.scrollY, x: document.querySelector(".track").scrollLeft }));
    await page.mouse.wheel(0, NOTCH * 2);
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => ({ y: window.scrollY, x: document.querySelector(".track").scrollLeft }));
    turn = { port: geo.port, downTo, upTo, stripBefore: before, stripAfter: after };

    /* ---- the Rail's shape, and what it says ------------------------------ */
    railShape = await page.evaluate(() => {
      const rail = document.querySelector(".panel-rail");
      if (!rail) return null;
      const items = [...rail.querySelectorAll("li")];
      const onScreen = [...document.querySelectorAll(".panel")];
      return {
        tag: rail.tagName.toLowerCase(),
        label: rail.getAttribute("aria-label"),
        listRole: rail.querySelector("ul") ? rail.querySelector("ul").getAttribute("role") : null,
        panels: onScreen.map((p) => p.id),
        entries: items.map((li) => {
          const a = li.querySelector("a[href]");
          return {
            text: li.textContent.trim(),
            selected: li.classList.contains("is-selected"),
            href: a ? a.getAttribute("href") : null,
            /* The resolved URL, which is the whole of the base-href trap: a
               fragment that resolves to a different path is a page RELOAD. */
            samePath: a ? new URL(a.href).pathname === location.pathname : null,
            current: a ? a.getAttribute("aria-current") : null,
            hidden: [...li.querySelectorAll(".visually-hidden")].map((s) => s.textContent.trim()),
          };
        }),
      };
    });

    /* ---- the Rail as a route -------------------------------------------- */
    await page.evaluate((y) => window.scrollTo(0, y), 0);
    await page.waitForTimeout(400);
    /* Activated the way a reader would, from the keyboard, which also proves the
       entry is operable rather than merely focusable. The Rail is drawn at
       nothing at the top of the page, so this is also the one activation that
       could not happen with a pointer. */
    const link = page.locator(".panel-rail a").first();
    await link.focus();
    const focused = await page.evaluate(() => {
      const a = document.activeElement;
      const cs = getComputedStyle(a);
      return {
        inRail: !!a.closest(".panel-rail"),
        tag: a.tagName.toLowerCase(),
        /* :focus-visible is the page's convention and cannot be read off a
            computed style directly, so the ring is read as what a focused
            element resolves to under `matches`. */
        focusVisible: a.matches(":focus-visible"),
        outlineStyle: cs.outlineStyle,
        outlineWidth: parseFloat(cs.outlineWidth),
        railOpacity: Number(getComputedStyle(document.querySelector(".panel-rail")).opacity),
        /* .panel is `overflow: clip` and the Rail stands at `left: 0` in the turn
           regime, so a ring drawn 3px outside its box could be cut off by the
           section's own edge. What saves it is that the ITEM is centred in a
           --corner-wide column and measures one line of type across — measured
           rather than argued, because it is the difference between "an outline is
           computed" and "a reader can see one". */
        ringRoom: Math.round(a.getBoundingClientRect().left -
                             document.querySelector(".panel").getBoundingClientRect().left),
        /* And the Rail is not a pointer target while it is still fading in: an
           opacity-0 link over the CV's bottom-left corner would take a click. */
        faint: document.querySelector(".panel-rail").hasAttribute("data-faint"),
        pointerEvents: getComputedStyle(document.querySelector(".panel-rail")).pointerEvents,
      };
    });
    /* How far into the tab order it is, from the top of the document — the
       criterion is "reachable", and a number says it rather than a boolean. */
    await page.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
    let tabs = 0, reached = false;
    for (; tabs < 60 && !reached; tabs++) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => !!(document.activeElement && document.activeElement.closest(".panel-rail a")));
    }
    keyboard = { ...focused, tabs: reached ? tabs : null };

    await link.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1800);
    const routed = await page.evaluate(() => ({
      y: window.scrollY,
      exit: Number(getComputedStyle(document.querySelector(".panel")).getPropertyValue("--exit").trim()),
      hash: location.hash,
      selected: [...document.querySelectorAll(".panel-rail li.is-selected")].map((li) => li.textContent.trim()),
      current: [...document.querySelectorAll(".panel-rail [aria-current]")].map((a) => a.textContent.trim()),
    }));
    keyboard.routed = routed;

    /* ---- and what a screen reader is handed -----------------------------
       THE BROWSER'S OWN ARIA TREE, and not a reading of the markup. The
       criterion is that the Rail IS ANNOUNCED as a list of projects, and the gap
       between "the markup says <ul>" and "the browser computes a list" is
       exactly where `list-style: none` costs a list its role. Only the tree can
       tell those two apart, and it is printed whole in the report because it is
       the most readable thing this file produces.

       `aria-current` IS NOT IN IT, and that is a limitation of the tools rather
       than of the page: neither this snapshot nor CDP's own AXPropertyName enum
       carries `current`, so the one criterion the tree cannot answer is asserted
       off the DOM in section 5 instead. Said here so the next reader does not go
       looking for it and conclude it was forgotten. */
    tree = await page.locator(".panel-rail").ariaSnapshot();

    await context.close();
  }

  /* ---- touch ------------------------------------------------------------- */
  {
    /* A touch drag never reaches app.js's wheel listener — the comment on the
       turn says so — so this is the one input where the whole of the movement is
       the browser's own scroll plus mandatory snap, and the arrival has to
       follow it anyway. Dispatched through CDP because Playwright's touchscreen
       taps and does not drag. */
    const { context, page } = await open(browser, origin, { hasTouch: true });
    const g = await page.evaluate(GEOMETRY);
    const cdp = await context.newCDPSession(page);
    /* Down the left margin, clear of the carousel — a drag that began on the
       strip would scroll the strip, which is the arbitration working and not the
       thing being measured here. Far enough that snap has a nearer port to choose
       than the one it started from: the drag is repeated from wherever it got to,
       because one finger's travel is a window's height at most and the turn is a
       little more than that. */
    const x = 20, y0 = DESK.height - 60, step = 40, moves = 18;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y0 }] });
    for (let i = 1; i <= moves; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y0 - i * step }] });
    }
    /* Read inside the drag rather than after it: "the arrival follows the drag"
       is a statement about the middle of it, and after the release snap has
       already tidied the ends. */
    const during = await page.evaluate(() => ({
      y: window.scrollY,
      exit: Number(getComputedStyle(document.querySelector(".panel")).getPropertyValue("--exit").trim()),
    }));
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(1800);
    const settled = await page.evaluate(() => ({
      y: window.scrollY,
      exit: Number(getComputedStyle(document.querySelector(".panel")).getPropertyValue("--exit").trim()),
    }));
    touch = { regime: g.regime, port: g.port, during, settled };
    await context.close();
  }

  /* ---- reduced motion ---------------------------------------------------- */
  {
    const { context, page } = await open(browser, origin, { reducedMotion: "reduce" });
    const g = await page.evaluate(GEOMETRY);
    const pinned = await page.evaluate(({ port }) => {
      const panel = document.querySelector(".panel");
      const seen = [];
      for (let i = 0; i <= 20; i++) {
        window.scrollTo(0, (port * i) / 20);
        seen.push(Number(getComputedStyle(panel).getPropertyValue("--exit").trim()));
      }
      window.scrollTo(0, 0);
      return seen;
    }, { port: g.port });
    /* And the Rail still navigates, by the anchor rather than by a turn — which
       is what "the movement is removed, not shortened" has to mean for a link. */
    await page.waitForTimeout(300);
    await page.locator(".panel-rail a").first().click();
    await page.waitForTimeout(900);
    const arrived = await page.evaluate(() => ({
      y: window.scrollY,
      hash: location.hash,
      exit: Number(getComputedStyle(document.querySelector(".panel")).getPropertyValue("--exit").trim()),
    }));
    still = { port: g.port, pinned, arrived };
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

/* ===========================================================================
   The report
   ======================================================================== */
say("serving", ROOT);
say("page", PAGE);
say("window", `${DESK.width}x${DESK.height}`);
say("rest position", `${geo.port}px, document max ${geo.pageMax}px`);
console.log("");

/* ---- 1. the arrival ------------------------------------------------------ */
const EPS = 6e-4;                       // arrival.js writes --exit to four places
const expect = (y) => y / geo.port - 1;
const off = weld.down.map((s) => Math.abs(s.exit - expect(s.y)));
const worstOff = Math.max(...off);
const ends = { top: weld.down[0], rest: weld.down[weld.down.length - 1] };
const monotone = weld.down.every((s, i) => i === 0 || s.exit >= weld.down[i - 1].exit - EPS);
const headMono = weld.down.every((s, i) => i === 0 || s.head >= weld.down[i - 1].head - 1e-3);
say("arrival", `--exit tracks scroll to within ${worstOff.toFixed(5)} over 41 samples`);
say("ends", `${ends.top.exit.toFixed(4)} at the top, ${ends.rest.exit.toFixed(4)} at rest`);
say("monotone", monotone && headMono ? "--exit and the composition's opacity, both" : "NO");
if (worstOff > EPS) problems.push(`--exit is not the scroll position: it is out by up to ${worstOff.toFixed(5)} across the turn`);
if (ends.top.exit !== -1) problems.push(`at the top of the page --exit is ${ends.top.exit}, so the composition has already partly arrived`);
if (ends.rest.exit !== 0) problems.push(`at rest --exit is ${ends.rest.exit} and not 0, so the composition never quite settles`);
if (!monotone || !headMono) problems.push("the arrival is not monotone in the scroll position — the composition comes back before it has finished arriving");

/* ---- 1b. no hysteresis -------------------------------------------------- */
const hyst = Math.max(...weld.down.map((s, i) => Math.abs(s.exit - weld.up[i].exit)));
say("no hysteresis", hyst === 0
  ? "every sample identical scrolling up and scrolling down"
  : `DIFFERS by up to ${hyst.toFixed(5)}`);
if (hyst !== 0) problems.push(`the arrival depends on which way the page was scrolled (up to ${hyst.toFixed(5)}), so a reversal cannot be continuous`);

/* ---- 2. the reversal ---------------------------------------------------- */
console.log("");
const tr = reversal.trace.filter((_, i, a) => i === 0 || a[i][0] !== a[i - 1][0]);
const moved = tr.filter((s, i) => i > 0 && Math.abs(s[1] - tr[i - 1][1]) > 0.01);
/* The quintic's peak speed from REST: 1.875 x distance over the duration, and
   the duration is TURN scaled by the square root of the fraction of the document
   being crossed, floored at 0.45. A whole turn is the whole document, so the
   fraction is 1 and the duration is TURN. Reported, and NOT asserted against,
   for a reason worth writing down rather than rediscovering: the recorder below
   and the turn are two separate rAF callbacks, and which of the two runs first
   within a frame can flip — turnPage() re-registers its own every frame and
   cancels it on a reversal. When it flips, one sample sees no movement and the
   next sees two frames of it, so a per-frame VELOCITY off this trace reads 2x
   high at random. Measured at 2.13, 3.23 and 4.40 px/ms across three runs of the
   same reversal, which is a property of the sampling and not of the page.

   A PER-FRAME DISTANCE IS NO BETTER, for a second reason found the same way:
   headless Chromium starves the turn's own rAF down to about 10Hz while the
   recorder keeps running, so a single turn frame legitimately carries 150px of a
   782px turn. Any bound loose enough to allow that is too loose to catch
   anything.

   SO THE ASSERTIONS COUNT RATHER THAN DIVIDE, which nothing about frame rate can
   fool. A reversal that CARRIES its speed leaves the page travelling the old way
   for a while, reaches a far point past where it ends up, and traverses back
   through every position in between. A restart from the current position flips
   to full speed the other way within a frame of the input — no far point, and
   nothing between it and the landing. So: is there an overshoot, and how many
   distinct positions are there on the way back. Both are reported as numbers. */
const PEAK = (1.875 * geo.port) / 800;
const WAYPOINTS = 5;
const steps = [];
for (let i = 1; i < tr.length; i++) {
  const dt = tr[i][0] - tr[i - 1][0];
  if (dt > 0) steps.push({ dt, dy: tr[i][1] - tr[i - 1][1], v: (tr[i][1] - tr[i - 1][1]) / dt });
}
const fastest = steps.reduce((a, s) => Math.max(a, Math.abs(s.v)), 0);
const biggest = steps.reduce((a, s) => Math.max(a, Math.abs(s.dy)), 0);
/* THE SIGNATURE OF A CARRIED REVERSAL, and the reason this is not measured as an
   acceleration: frame timing in a headless browser jitters, and an acceleration
   is a second difference of a jittery number. An OVERSHOOT is discrete. A turn
   that restarts from the current position reverses within one frame of the
   input; one that carries its speed and its force keeps going the old way,
   slows, stops, and comes back — so the trace has a maximum past which it
   returns, and that maximum is after the reversing wheel. */
const peakY = tr.reduce((a, s) => (s[1] > a[1] ? s : a), tr[0]);
const landedAt = tr[tr.length - 1][1];
const overshoot = peakY[1] - landedAt;
const framesAfterPeak = tr.length - 1 - tr.indexOf(peakY);
/* How many distinct places the page was seen at on the way back down, strictly
   between the far point and where it came to rest. A snap has none. */
const waypoints = new Set(tr.slice(tr.indexOf(peakY) + 1)
  .map((s) => s[1])
  .filter((y) => y > landedAt + 0.5 && y < peakY[1] - 0.5)
  .map((y) => Math.round(y))).size;
/* And the composition never lags the page by more than the frame it is being
   drawn in: arrival.js writes --exit from its own rAF, so a sample may catch the
   value written for the previous frame's position and no older. */
const lag = tr.filter((s) => {
  const here = Math.abs(s[2] - expect(s[1]));
  return here > EPS;
}).length;
const lagWorse = tr.filter((s, i) => {
  if (i === 0) return false;
  const here = Math.abs(s[2] - expect(s[1]));
  const prev = Math.abs(s[2] - expect(tr[i - 1][1]));
  return here > EPS && prev > EPS;
}).length;
say("reversal trace", `${tr.length} frames, ${moved.length} of them moving`);
say("fastest frame", `${biggest.toFixed(0)}px, nominally ${fastest.toFixed(2)} px/ms ` +
  `against ${PEAK.toFixed(2)} from rest — reported, not asserted; see the note`);
say("carried through", overshoot > 0.5
  ? `yes — ${overshoot.toFixed(0)}px past where it landed, ${framesAfterPeak} frames of coming back`
  : `NO — the page reversed without overshooting (${overshoot.toFixed(1)}px)`);
say("through, not over", `${waypoints} distinct positions between the far point and the landing`);
say("welded", lagWorse === 0
  ? `every frame, ${lag} of ${tr.length} matching the previous frame's position`
  : `${lagWorse} frames where the composition is neither at this position nor the last`);
say("landed", `${reversal.y}px, --exit ${reversal.exit.toFixed(4)}`);
if (overshoot <= 0.5) problems.push("the page reversed direction without carrying its speed through zero: a reversal mid-transition restarts rather than continuing");
if (waypoints < WAYPOINTS) problems.push(`the page was seen at only ${waypoints} positions between the far point and the landing, so the way back is a snap rather than a traverse`);
if (lagWorse !== 0) problems.push(`${lagWorse} frames of the reversal draw the composition at a scroll position the page was not at — the arrival is not welded to the page`);
if (reversal.y !== 0 || reversal.exit !== -1) problems.push(`the reversal did not land back at the top: ${reversal.y}px, --exit ${reversal.exit}`);

/* ---- 3. fast scrolling -------------------------------------------------- */
console.log("");
const stranded = burst.y !== 0 && burst.y !== geo.port;
say("12 notches fast", `landed at ${burst.y}px, --exit ${burst.exit.toFixed(4)}`);
if (stranded) problems.push(`a fast scroll left the page at ${burst.y}px, which is neither port — the page is stranded mid-transition`);
if (!stranded && burst.exit !== (burst.y === 0 ? -1 : 0)) problems.push(`the page settled on a port but the composition did not: --exit ${burst.exit}`);

/* ---- 4. the turn and the carousel, unchanged ---------------------------- */
const stripMoved = turn.stripAfter.x !== turn.stripBefore.x;
const pageHeld = turn.stripAfter.y === turn.stripBefore.y;
say("one notch down", `${turn.downTo}px — the port is ${turn.port}px`);
say("one notch up", `${turn.upTo}px`);
say("a notch on the strip", `strip ${turn.stripBefore.x} -> ${turn.stripAfter.x}, page ${turn.stripBefore.y} -> ${turn.stripAfter.y}`);
if (turn.downTo !== turn.port) problems.push(`one notch down landed at ${turn.downTo}px rather than on the port at ${turn.port}px`);
if (turn.upTo !== 0) problems.push(`one notch up landed at ${turn.upTo}px rather than back at the top`);
if (!stripMoved) problems.push("a wheel notch over the carousel no longer moves the strip");
if (!pageHeld) problems.push("a wheel notch over the carousel now turns the page as well — the gesture arbitration has been broken");

/* ---- 5. the Rail -------------------------------------------------------- */
console.log("");
if (!railShape) {
  problems.push("there is no .panel-rail on the page at all");
} else {
  const routes = railShape.entries.filter((e) => e.href);
  const inert = railShape.entries.filter((e) => !e.href);
  const selected = railShape.entries.filter((e) => e.selected);
  const current = railShape.entries.filter((e) => e.current);
  say("the Rail", `<${railShape.tag}> named "${railShape.label}", list role "${railShape.listRole}", ${railShape.entries.length} entries`);
  say("routes", `${routes.length} — ${routes.map((e) => e.text).join(", ") || "none"}`);
  say("inert", `${inert.length} — ${inert.map((e) => e.text.replace(/\s+/g, " ")).join("; ") || "none"}`);
  say("selection", `${selected.length} drawn, ${current.length} announced` +
    (selected.length === 1 && current.length === 1 ? ` — ${selected[0].text}` : ""));
  say("same document", routes.every((e) => e.samePath) ? "every route resolves to this page's own path" : "NO — a route would RELOAD");
  if (railShape.entries.length !== railShape.panels.length + inert.length) {
    problems.push(`the Rail has ${railShape.entries.length} entries and ${routes.length} routes against ${railShape.panels.length} Panels on the page`);
  }
  if (routes.length !== railShape.panels.length) problems.push(`${routes.length} Rail entries are links against ${railShape.panels.length} Panels — an entry that leads nowhere or a Panel with no way to it`);
  if (selected.length !== 1) problems.push(`${selected.length} Rail entries are drawn as selected; exactly one is on screen`);
  if (current.length !== 1) problems.push(`${current.length} Rail entries carry aria-current; exactly one is on screen`);
  if (selected.length === 1 && current.length === 1 && selected[0].text !== current[0].text) {
    problems.push(`the Rail draws "${selected[0].text}" as selected and announces "${current[0].text}" — they have to be the same entry`);
  }
  if (!inert.every((e) => e.hidden.length)) problems.push("an inert Rail entry says nothing about being inert, so a screen reader is read a project with no way to reach it and no explanation");
  if (!routes.every((e) => e.samePath)) problems.push("a Rail route resolves to a different path from the document's own, so following it reloads the page to reach an anchor one frame away");
}

/* ---- 6. the keyboard ---------------------------------------------------- */
console.log("");
say("focus", keyboard.inRail ? `reaches the Rail's <${keyboard.tag}>` : "DOES NOT reach the Rail");
say("in the tab order", keyboard.tabs === null ? "NOT REACHED in 60 tabs" : `${keyboard.tabs} tabs from the top of the document`);
say("focus ring", `${keyboard.outlineStyle} ${keyboard.outlineWidth}px, :focus-visible ${keyboard.focusVisible}`);
say("and visible", `the Rail is drawn at opacity ${keyboard.railOpacity} while it holds focus, ` +
  `${keyboard.ringRoom}px clear of the section's clip`);
say("not a click target", `at the top of the page: data-faint ${keyboard.faint}, ` +
  `pointer-events ${keyboard.pointerEvents}`);
say("Enter", `${keyboard.routed.y}px, --exit ${keyboard.routed.exit.toFixed(4)}, url "${keyboard.routed.hash}"`);
if (!keyboard.inRail) problems.push("the Rail's entries cannot be focused");
if (keyboard.tabs === null) problems.push("the Rail is not reachable by tabbing from the top of the document");
if (!keyboard.focusVisible || keyboard.outlineStyle === "none" || !(keyboard.outlineWidth > 0)) {
  problems.push(`a focused Rail entry draws no ring (${keyboard.outlineStyle} ${keyboard.outlineWidth}px)`);
}
if (keyboard.railOpacity !== 1) problems.push(`the Rail is drawn at opacity ${keyboard.railOpacity} while focused, so the focus ring is on something invisible`);
if (!(keyboard.ringRoom > keyboard.outlineWidth + 3)) {
  problems.push(`the focused entry sits ${keyboard.ringRoom}px from the section's clip and its ring is drawn ${keyboard.outlineWidth + 3}px outside it, so the ring is cut off`);
}
if (!keyboard.faint || keyboard.pointerEvents !== "none") {
  problems.push("at the top of the page the Rail is invisible and still takes clicks — a link nobody can see over the foot of the CV");
}
if (keyboard.routed.y !== geo.port || keyboard.routed.exit !== 0) {
  problems.push(`activating the Rail left the page at ${keyboard.routed.y}px with --exit ${keyboard.routed.exit}, not settled on the section`);
}
if (keyboard.routed.hash !== "#projects") problems.push(`the url after following the Rail is "${keyboard.routed.hash}", so a reload would not land on the section`);
if (keyboard.routed.selected.length !== 1 || keyboard.routed.current.length !== 1) {
  problems.push("after following the Rail the selection is no longer exactly one entry");
}

/* ---- 7. what a screen reader is handed --------------------------------- */
console.log("");
const lines = String(tree || "").split("\n").filter((l) => l.trim());
const roleCount = (r) => lines.filter((l) => new RegExp(`- ${r}\\b`).test(l)).length;
say("announced as", lines[0] ? lines[0].replace(/^-\s*/, "").replace(/:$/, "") : "NOTHING");
say("containing", `${roleCount("list") ? "a list" : "NO list"} of ${roleCount("listitem")} items, ${roleCount("link")} link(s)`);
console.log("");
for (const l of lines) console.log("  " + l);
if (!/^- navigation "Projects"/.test(lines[0] || "")) problems.push("the Rail is not announced as a navigation named Projects");
if (!roleCount("list")) problems.push("the Rail is not announced as a list — #72 asks for a list of projects");
if (roleCount("listitem") !== 3) problems.push(`the Rail is announced as ${roleCount("listitem")} list items rather than 3 projects`);
if (!lines.some((l) => /no page yet/i.test(l))) problems.push("the two inert entries are not announced as unavailable");

/* ---- 8. touch ---------------------------------------------------------- */
console.log("");
say("touch drag", `moved the page to ${touch.during.y}px, --exit ${touch.during.exit.toFixed(4)} mid-drag`);
say("and settled", `${touch.settled.y}px, --exit ${touch.settled.exit.toFixed(4)} — the port is ${touch.port}px`);
if (!(touch.during.y > 0)) problems.push("a touch drag did not scroll the page at all, so nothing about the arrival was measured under touch");
if (touch.during.exit <= -1 || touch.during.exit > 0) problems.push(`mid-drag the composition is at --exit ${touch.during.exit}, so it is not following a touch scroll`);
if (touch.settled.y !== touch.port && touch.settled.y !== 0) problems.push(`a touch drag left the page at ${touch.settled.y}px, which is neither port`);
if (touch.settled.exit !== (touch.settled.y === 0 ? -1 : 0)) problems.push(`after a touch drag the page is on a port and the composition is not: --exit ${touch.settled.exit}`);

/* ---- 9. reduced motion ------------------------------------------------- */
console.log("");
const anyMovement = still.pinned.filter((v) => v !== 0);
say("reduced motion", anyMovement.length
  ? `MOVES — --exit reached ${anyMovement.map((v) => v.toFixed(3)).join(", ")}`
  : "--exit is 0 at all 21 scroll positions across the turn");
say("and the Rail", `still navigates — ${still.arrived.y}px against a port of ${still.port}px, url "${still.arrived.hash}"`);
if (anyMovement.length) problems.push("under prefers-reduced-motion the composition still arrives as the page scrolls; #72 asks for the movement removed");
if (still.arrived.y !== still.port) problems.push(`under prefers-reduced-motion the Rail left the page at ${still.arrived.y}px rather than on the section at ${still.port}px`);
if (still.arrived.hash !== "#projects") problems.push(`under prefers-reduced-motion following the Rail did not set the fragment ("${still.arrived.hash}")`);

/* ---- and the verdict -------------------------------------------------- */
console.log("");
if (problems.length) {
  console.log(`${problems.length} problem${problems.length === 1 ? "" : "s"}:`);
  for (const p of problems) console.log("  - " + p);
  process.exit(1);
}
console.log("scrolling carries the reader into the section and the Rail tells the truth — #72");
