/* ============================================================================
   check-panel-exit.mjs — do the Panel's exit treatments behave the way #74 says?

     node design/tools/check-panel-exit.mjs

   Exit 0 if every one of #74's behavioural criteria holds, 1 if any does not,
   and it names which. It serves the tree it is invoked from, so it answers for
   the working copy rather than for whatever is deployed — `preview_start`
   serves the main checkout in this repository and would silently report on
   `development` while looking like it reported on the branch.

   WHAT IS BEING ASSERTED, AND WHAT IS DELIBERATELY NOT. Choosing a treatment is
   not a test: it is the author scrubbing design/plinth/plinth-tuner.html and
   picking one. What is testable is that whichever mixture is picked behaves —
   that it settles, that it never opens a hole, that it leaves the recording
   alone, that it disappears under `prefers-reduced-motion`, and that a phone
   composites one layer rather than five.

   THE CROSSING IS SIMULATED FROM ONE PANEL, WHICH IS THE HONEST THING TO DO
   AND NOT A SHORTCUT. There is one Panel on the page — #72 drove --exit off the
   scroll position and did not add a second, and #58 puts the other two out of
   scope — but the whole design of the treatments is that arrival IS
   departure reflected through zero: a crossing at progress t puts the outgoing
   Panel at --exit t and the incoming one at t - 1. So one Panel, read twice,
   is exactly the pair, and reading it twice is the only way to measure the pair
   before there are two of them.

   PRESENCE IS MEASURED AS COMPUTED OPACITY, and that is the right measure here
   rather than a screenshot: every named treatment fades to nothing by the far
   end except `hold`, which is the one that fades to nothing at all, and no
   treatment reaches for a property that opacity does not stand for — the block
   in styles.css is a transform and an opacity and nothing else, on purpose. A
   pixel comparison would answer the same question more slowly and with the
   recording, the glass and the marble in the way of it.
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

/* The three groups, each named by the attribute that picks its treatment and by
   the element the treatment actually moves. The Rail is here as a FOURTH row
   that must not move: it names the three projects and is what a reader
   navigates by, so a crossing that took it away would leave nothing to arrive
   at. Asserting that is asserting a decision, which is what it is for. */
const GROUPS = [
  { key: "text",   attr: "data-exit-text",   sel: ".panel-head",
    names: ["lift", "slide", "close", "dissolve", "scatter"] },
  { key: "frame",  attr: "data-exit-frame",  sel: ".panel-stage > .panel-frame",
    names: ["recede", "slide", "sink", "dissolve"] },
  { key: "plinth", attr: "data-exit-plinth", sel: ".panel-plinth",
    names: ["sink", "slide", "dissolve", "hold"] },
];

/* How thin both compositions are ever allowed to be at once. The straight ramp
   — rate 1, which is what ships — conserves presence exactly and sums to 1 at
   every t; the floor is below that because the rate is a control and its ends
   are legitimately thinner in the middle of a crossing. Zero would be an empty
   screen and is the thing #74 forbids; 0.5 is "one whole composition's worth of
   ink, shared between the two", which is the weakest thing worth calling not
   empty. */
const FLOOR = 0.5;
const RATES = [0, 0.5, 1, 1.5, 2];

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
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
    ...options,
  });
  const page = await context.newPage();
  await page.goto(origin + PAGE, { waitUntil: "load" });
  /* Long enough for the clip to have started and for the reflection to have
     been cloned in — both are things the sweep below reads. */
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    document.querySelector(".panel").scrollIntoView({ block: "end", behavior: "instant" });
  });
  await page.waitForTimeout(400);
  return { context, page };
}

/* ---------------------------------------------------------------------------
   The sweep. Everything below runs INSIDE the page in one call, because 51
   samples x 2 sides x 14 treatments is 1400 reads and a round trip each would
   make this a minute rather than a moment.
   ------------------------------------------------------------------------ */
const SWEEP = ([GROUPS, RATES]) => {
  const panel = document.querySelector(".panel");
  const shipped = {};
  for (const g of GROUPS) shipped[g.key] = panel.getAttribute(g.attr);

  const read = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      opacity: Number(cs.opacity),
      translate: cs.translate,
      scale: cs.scale,
    };
  };
  /* `translate: 0px 0px` and `translate: none` are the same picture and the
     browser reports whichever the declaration said. Settled means "does not
     move", not "declares nothing". */
  const still = (v) =>
    v !== null &&
    Math.abs(v.opacity - 1) < 1e-6 &&
    (v.translate === "none" || /^(0px)( 0px)?$/.test(v.translate)) &&
    (v.scale === "none" || v.scale === "1" || v.scale === "1 1");

  /* A page that has lost one of the three attributes reads back as null, and
     `setAttribute(attr, null)` writes the STRING "null" — a value no rule
     matches, so the sweeps that follow would run against the base declarations
     while the report said the attribute was merely missing. Put back as absent
     when it was absent. */
  const restoreShipped = (g) => {
    if (shipped[g.key]) panel.setAttribute(g.attr, shipped[g.key]);
    else panel.removeAttribute(g.attr);
  };

  const at = (t, sel) => {
    panel.style.setProperty("--exit", String(t));
    return read(sel);
  };

  const out = { shipped, settled: {}, sweeps: [], rail: null, growth: null, mix: null };

  /* ---- 1. the settled state ------------------------------------------------ */
  panel.style.setProperty("--exit", "0");
  for (const g of GROUPS) out.settled[g.key] = read(g.sel);
  out.settled.rail = read(".panel-rail");
  out.settled.copy = read(".panel-copy");
  out.settled.points = read(".panel-points");
  out.settled.mirror = read(".panel-mirror > .panel-frame");
  out.settled.stillness = Object.fromEntries(
    Object.entries(out.settled).filter(([, v]) => v && typeof v === "object" && "opacity" in v)
      .map(([k, v]) => [k, still(v)]),
  );

  /* ---- 2. every named treatment, at every rate, either side of zero -------- */
  const steps = [];
  for (let i = 0; i <= 50; i++) steps.push(i / 50);

  for (const g of GROUPS) {
    for (const name of g.names) {
      panel.setAttribute(g.attr, name);
      for (const rate of RATES) {
        panel.style.setProperty("--exit-" + g.key + "-rate", String(rate));
        let worst = Infinity, worstAt = 0, monotone = true, last = -1;
        for (const t of steps) {
          const leaving = at(t, g.sel);
          const arriving = at(t - 1, g.sel);
          const sum = leaving.opacity + arriving.opacity;
          if (sum < worst) { worst = sum; worstAt = t; }
          /* The ramp has to be monotone in t as well as onto [0,1], or a
             composition would come back before it had finished going. */
          if (leaving.opacity > last + 1e-6 && last >= 0) monotone = false;
          last = leaving.opacity;
        }
        out.sweeps.push({ group: g.key, name, rate, worst, worstAt, monotone });
      }
      panel.style.removeProperty("--exit-" + g.key + "-rate");
    }
    restoreShipped(g);
  }

  /* ---- 3. the Rail does not leave ----------------------------------------- */
  const railAt = steps.map((t) => at(t, ".panel-rail"));
  out.rail = {
    moved: railAt.some((v, i) => v.translate !== railAt[0].translate || v.scale !== railAt[0].scale),
    faded: railAt.some((v) => Math.abs(v.opacity - railAt[0].opacity) > 1e-6),
    opacity: railAt[0].opacity,
  };

  /* ---- 3b. past the ends, nothing keeps going -----------------------------
     Whatever ends up driving a crossing will overshoot — an ease that settles,
     a scroll position past the last Panel — and a composition that goes on
     travelling after it has faded out drifts back into shot when the overshoot
     comes back. --exit-c is the clamp that stops it and this is what says so. */
  out.clamp = GROUPS.map((g) => ({
    group: g.key,
    far: JSON.stringify(at(1, g.sel)) === JSON.stringify(at(2, g.sel)),
    near: JSON.stringify(at(-1, g.sel)) === JSON.stringify(at(-3, g.sel)),
  }));

  /* ---- 4. the document does not grow -------------------------------------- */
  panel.style.setProperty("--exit", "0");
  const rest = document.documentElement.scrollHeight;
  let tallest = rest;
  for (const t of steps) {
    panel.style.setProperty("--exit", String(t));
    tallest = Math.max(tallest, document.documentElement.scrollHeight);
    panel.style.setProperty("--exit", String(t - 1));
    tallest = Math.max(tallest, document.documentElement.scrollHeight);
  }
  out.growth = { rest, tallest };

  /* ---- 5. the three are genuinely independent ------------------------------
     Mixing is the whole ticket, so it is asserted rather than assumed: each
     group is read alone at a treatment that is not the shipped one, then all
     three are set at once and read again. Same numbers both ways means the
     three attributes touch disjoint variables and a combination really is its
     three parts. */
  const alone = {}, together = {};
  const other = (g) => g.names.find((n) => n !== shipped[g.key]);
  for (const g of GROUPS) {
    for (const h of GROUPS) if (h !== g) restoreShipped(h);
    panel.setAttribute(g.attr, other(g));
    alone[g.key] = at(0.5, g.sel);
  }
  for (const g of GROUPS) panel.setAttribute(g.attr, other(g));
  for (const g of GROUPS) together[g.key] = at(0.5, g.sel);
  for (const g of GROUPS) restoreShipped(g);
  out.mix = GROUPS.map((g) => ({
    group: g.key,
    treatment: other(g),
    same: JSON.stringify(alone[g.key]) === JSON.stringify(together[g.key]),
    alone: alone[g.key], together: together[g.key],
  }));

  panel.style.setProperty("--exit", "0");
  return out;
};

/* ---------------------------------------------------------------------------
   The run
   ------------------------------------------------------------------------ */
const server = await serve();
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();

let sweep, clip, still, phone;
try {
  {
    const { context, page } = await open(browser, origin);
    sweep = await page.evaluate(SWEEP, [GROUPS.map((g) => ({ key: g.key, attr: g.attr, sel: g.sel, names: g.names })), RATES]);

    /* The recording, through a whole crossing. Driven in real time rather than
       stepped, because "keeps playing" is a statement about wall-clock: a clip
       that has been paused reports the same currentTime however many values of
       --exit are written over it. */
    clip = await page.evaluate(async () => {
      const panel = document.querySelector(".panel");
      const video = document.querySelector(".panel-stage > .panel-frame .panel-clip");
      if (!video) return null;
      const started = video.currentTime;
      const pausedAt = [];
      const t0 = performance.now();
      await new Promise((done) => {
        const step = () => {
          const u = Math.min(1, (performance.now() - t0) / 1200);
          panel.style.setProperty("--exit", String(u));
          if (video.paused) pausedAt.push(Number(u.toFixed(2)));
          if (u < 1) requestAnimationFrame(step); else done();
        };
        requestAnimationFrame(step);
      });
      const ended = video.currentTime;
      panel.style.setProperty("--exit", "0");
      return { started, ended, advanced: ended - started, pausedAt, paused: video.paused,
               readyState: video.readyState };
    });
    await context.close();
  }
  {
    const { context, page } = await open(browser, origin, { reducedMotion: "reduce" });
    still = await page.evaluate(() => {
      const panel = document.querySelector(".panel");
      /* Written the way a driver that never asked about the setting would write
         it — inline, on the section — which is exactly the case the `!important`
         in the sheet exists for. */
      panel.style.setProperty("--exit", "1");
      const one = (sel) => {
        const cs = getComputedStyle(document.querySelector(sel));
        return { opacity: Number(cs.opacity), translate: cs.translate, scale: cs.scale };
      };
      return {
        exit: getComputedStyle(panel).getPropertyValue("--exit").trim(),
        head: one(".panel-head"),
        frame: one(".panel-stage > .panel-frame"),
        plinth: one(".panel-plinth"),
      };
    });
    await context.close();
  }
  {
    /* Inside the phone gate by width alone — the gate is
       `(max-width: 900px) and (pointer: coarse), (max-width: 600px)` and 390
       satisfies the second half, so this does not depend on how faithfully
       touch is emulated. */
    const { context, page } = await open(browser, origin,
      { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    phone = await page.evaluate(() => {
      const panel = document.querySelector(".panel");
      panel.style.setProperty("--exit", "0.5");
      const moving = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const cs = getComputedStyle(el);
        const t = cs.translate, s = cs.scale;
        return (t !== "none" && !/^(0px)( 0px)?$/.test(t)) ||
               (s !== "none" && s !== "1" && s !== "1 1") ||
               Math.abs(Number(cs.opacity) - 1) > 1e-6;
      };
      const layers = [".panel-inner", ".panel-head", ".panel-copy", ".panel-points",
                      ".panel-stage > .panel-frame", ".panel-plinth", ".panel-mirror > .panel-frame"];
      const state = {};
      for (const sel of layers) state[sel] = moving(sel);
      panel.style.setProperty("--exit", "0");
      return state;
    });
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

/* ---------------------------------------------------------------------------
   The report
   ------------------------------------------------------------------------ */
const problems = [];
const say = (label, value) => console.log(`${label.padEnd(22)}${value}`);

console.log(`serving               ${ROOT}`);
console.log(`page                  ${PAGE}\n`);

/* ---- what the page says it is wearing ----------------------------------- */
say("shipped mixture", GROUPS.map((g) => `${g.key}=${sweep.shipped[g.key] ?? "UNSET"}`).join("  "));
for (const g of GROUPS) {
  if (!sweep.shipped[g.key]) {
    problems.push(`the section carries no ${g.attr}, so nothing on the page says which ${g.key} treatment ships`);
  } else if (!g.names.includes(sweep.shipped[g.key])) {
    problems.push(`${g.attr}="${sweep.shipped[g.key]}" is not one of the treatments this check knows: ${g.names.join(", ")}`);
  }
}

/* ---- 1. settled --------------------------------------------------------- */
const notStill = Object.entries(sweep.settled.stillness).filter(([, ok]) => !ok).map(([k]) => k);
say("settled at --exit 0", notStill.length ? `MOVED: ${notStill.join(", ")}` : "every group still, every opacity 1");
if (notStill.length) {
  problems.push(`at --exit 0 these are not at rest: ${notStill.join(", ")} — the treatments cost the composition something before anything has moved`);
}

/* ---- 2. the crossing never empties -------------------------------------- */
const thin = sweep.sweeps.filter((s) => s.worst < FLOOR);
const notMono = sweep.sweeps.filter((s) => !s.monotone);
const worst = sweep.sweeps.reduce((a, b) => (b.worst < a.worst ? b : a));
console.log("");
say("treatments swept", `${sweep.sweeps.length} = ${GROUPS.map((g) => g.names.length).reduce((a, b) => a + b)} treatments x ${RATES.length} rates, 51 samples each`);
say("thinnest moment", `${worst.worst.toFixed(3)} of one composition — ${worst.group}/${worst.name} at rate ${worst.rate}, t ${worst.worstAt.toFixed(2)}`);
say("at the shipped rate", sweep.sweeps.filter((s) => s.rate === 1)
  .reduce((a, b) => Math.min(a, b.worst), Infinity).toFixed(3));
say("monotone", notMono.length ? `NO — ${notMono.length} of ${sweep.sweeps.length}` : "every ramp, every rate");
if (thin.length) {
  problems.push(`${thin.length} treatment/rate pairs fall below ${FLOOR} of one composition mid-crossing, the thinnest being ` +
    `${thin[0].group}/${thin[0].name} at rate ${thin[0].rate} (${thin[0].worst.toFixed(3)} at t ${thin[0].worstAt.toFixed(2)})`);
}
if (notMono.length) {
  problems.push(`${notMono.length} ramps are not monotone in the crossing's progress — a composition that comes back before it has finished going`);
}

/* ---- 3. the Rail -------------------------------------------------------- */
say("the Rail", sweep.rail.moved || sweep.rail.faded
  ? `LEAVES — moved ${sweep.rail.moved}, faded ${sweep.rail.faded}`
  : `stands, at opacity ${sweep.rail.opacity}`);
if (sweep.rail.moved || sweep.rail.faded) {
  problems.push("the Rail moves or fades with the composition; it is the index and has to survive the crossing");
}

/* ---- 3b. the clamp ------------------------------------------------------ */
const drifting = sweep.clamp.filter((c) => !c.far || !c.near).map((c) => c.group);
say("past the ends", drifting.length
  ? `KEEPS GOING — ${drifting.join(", ")}`
  : "--exit 2 draws what 1 draws, and -3 what -1 does");
if (drifting.length) {
  problems.push(`${drifting.join(", ")} go on travelling past --exit +-1, so an overshooting driver sends a faded-out composition further and brings it back on the way in`);
}

/* ---- 4. the document's height ------------------------------------------- */
say("document height", sweep.growth.tallest === sweep.growth.rest
  ? `${sweep.growth.rest}px throughout`
  : `GREW from ${sweep.growth.rest} to ${sweep.growth.tallest}`);
if (sweep.growth.tallest !== sweep.growth.rest) {
  problems.push(`the page grows by ${sweep.growth.tallest - sweep.growth.rest}px mid-crossing — a scrollbar that appears and goes away again`);
}

/* ---- 5. mixable --------------------------------------------------------- */
const notMixable = sweep.mix.filter((m) => !m.same);
say("mixable", notMixable.length
  ? `NO — ${notMixable.map((m) => m.group).join(", ")} read differently alone and together`
  : `yes — ${sweep.mix.map((m) => `${m.group}=${m.treatment}`).join("  ")} identical alone and combined`);
if (notMixable.length) {
  problems.push(`${notMixable.map((m) => m.group).join(", ")} do not compose: setting all three at once is not the same as setting each alone, so the treatments are presets rather than a mixture`);
}

/* ---- 6. the recording --------------------------------------------------- */
console.log("");
if (!clip) {
  problems.push("there is no .panel-clip in the stage at all");
} else {
  say("recording", clip.pausedAt.length
    ? `PAUSED at --exit ${clip.pausedAt.slice(0, 6).join(", ")}${clip.pausedAt.length > 6 ? " ..." : ""}`
    : `played throughout, ${clip.advanced.toFixed(2)}s of it over a 1.2s crossing`);
  if (clip.pausedAt.length) problems.push("the recording stops during a crossing; #74 asks it to keep playing");
  if (clip.advanced <= 0) problems.push(`the recording did not advance across the crossing (${clip.started} -> ${clip.ended})`);
}

/* ---- 7. reduced motion -------------------------------------------------- */
const settledUnderReduce =
  still.exit === "0" &&
  [still.head, still.frame, still.plinth].every((v) =>
    Math.abs(v.opacity - 1) < 1e-6 &&
    (v.translate === "none" || /^(0px)( 0px)?$/.test(v.translate)) &&
    (v.scale === "none" || v.scale === "1" || v.scale === "1 1"));
say("reduced motion", settledUnderReduce
  ? "--exit pinned to 0 against an inline 1; settled state reached directly"
  : `NOT REMOVED — --exit computed to "${still.exit}"`);
if (!settledUnderReduce) {
  problems.push("under prefers-reduced-motion a driver writing --exit still moves the composition; #74 asks for the treatments removed, not shortened");
}

/* ---- 8. lighter on a phone ---------------------------------------------- */
const inner = phone[".panel-inner"];
const parts = Object.entries(phone).filter(([sel]) => sel !== ".panel-inner");
const movingParts = parts.filter(([, m]) => m).map(([sel]) => sel);
say("on a phone", `${movingParts.length + (inner ? 1 : 0)} composited layer(s): ` +
  (inner ? ".panel-inner" : "NOT .panel-inner") +
  (movingParts.length ? ` and ${movingParts.join(", ")}` : " alone"));
if (!inner) problems.push("at phone widths nothing moves at all — the treatment did not survive the reflow");
if (movingParts.length) {
  problems.push(`at phone widths ${movingParts.length} inner box(es) still move separately (${movingParts.join(", ")}); #74 asks for a lighter treatment there`);
}

/* ---- the report --------------------------------------------------------- */
if (problems.length) {
  console.error("\nFAILED");
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log("\nthe Panel's exit treatments behave the way #74 asks");
