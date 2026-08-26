/* ============================================================================
   collect-roll.mjs — enumerate every photograph the clip passes over.

     node design/tools/collect-roll.mjs                     # write roll.json
     node design/tools/collect-roll.mjs --check             # has the roll drifted?
     node design/tools/collect-roll.mjs --url http://127.0.0.1:8770/

   This is the mechanical half of the censored tile list. It answers "which
   photographs does the recording actually show", and nothing else — it does not
   look at a single pixel of any of them. Which of them contain an identifiable
   person is decided by the author in design/censor/review.html, for the reasons
   in design/censor/README.md.

   It lives here rather than in design/censor/ because this is where the repo's
   one Playwright install is. The rest of the censoring — the roll it writes, the
   review surface, the confirmed list — is in design/censor/.

   WHY A BROWSER AND NOT THE API
   -----------------------------
   /api/photos returns the library in sort order, but the clip does not show a
   sort order — it shows whatever the justified-row layout happened to put in
   front of the camera, at one viewport, over one scroll range. The sheet is
   virtualised and lays rows out from each photograph's own aspect ratio, so the
   only honest answer to "what does the clip pass over" comes from driving the
   real grid at the real geometry and reading the real boxes. Getting this wrong
   in the safe direction is not possible: a photograph missing from the roll is
   one the author never reviews and the mosaic never covers.

   THE GEOMETRY IS RECORD'S, RESTATED — EXCEPT THE TRAVEL, WHICH IS OURS
   ----------------------------------------------------------------------
   The defaults below are the settings the recording is made with, and they are
   the whole reason the roll is what it is:

     viewport 1440x900   record/projects/photos/project.toml   [viewport]
     scroll 0 -> 1250    design/censor/capture-frame.mjs       TRAVEL
     document scroller   record/packages/core/src/page.ts      findScroller

   The viewport is copied rather than imported: this repo does not depend on
   record's source tree, and a silent import would let record's settings move
   without anything here noticing. Copied means it can go stale instead — so it
   is written into roll.json, and --check reports a roll assembled at a geometry
   that no longer matches. If record's viewport changes, re-run.

   THE TRAVEL IS THE OTHER WAY ROUND NOW, and that is the one thing about this
   file that has changed since the review was signed. The page is filmed with
   the Frame's titlebar's height of clear ground above the vault's toolbar
   (design/censor/capture-frame.mjs says why), which pushes every tile down by
   that shift — and the travel is the same shift longer, so the band's far edge
   moves down by exactly as much. `top + BAR < travel + BAR + height` is the
   test that was already being applied: the same photographs, in the same order,
   under the same `roll_digest`. So the number is computed HERE and record's
   own overrides file is what has to agree, rather than the reverse. Moving one
   without the other is what a re-review costs.

   STACKING, AND WHY IT HAS TO BE SEEDED
   --------------------------------------
   The clip shows the grid **stacked** — frames verified to be the same
   photograph drawn as one tile, which is the view the Panel is meant to show
   off. That is not a default and not a URL parameter. The vault keeps it in
   localStorage under `photos.stack`, read once at mount (photos
   ui/src/lib/stack.js), and its default is `{on: false}`.

   So it has to be seeded into the browser profile BEFORE the page's script
   runs, which is what addInitScript below does. Any fresh browser that merely
   navigates to the URL gets the unstacked grid, however the operator's own
   browser is set — the setting lives in a profile, not in the server.

   Stacked and unstacked are genuinely different rolls, not the same
   photographs regrouped: 84 tiles against 73, at 153x216 against 162x216,
   because the justified rows lay out over a different set of aspect ratios.
   A roll collected one way does not cover a clip captured the other, so
   `stacking` is written into roll.json and --check compares it like geometry.

   **record cannot do this yet.** Its only page hook is the timeline's
   `evaluate`, which runs after navigation — too late, since the grid has
   already mounted unstacked. See design/censor/README.md; this is the thing
   most likely to produce a correct-looking clip of the wrong view.

   AND SO DOES THE TITLEBAR'S ROOM, FOR A DIFFERENT REASON
   -------------------------------------------------------
   The capture is served the margin as a stylesheet from an origin standing in
   front of the vault. This walks the VAULT — the origin refuses to start until
   the list it serves has been signed, so the collector cannot go through it —
   and therefore has to lay the same band over the page itself, which
   `addInitScript` below does. If it did not, the boxes in the roll would
   describe a page 50px above the one the camera sees: the band test would run
   on the wrong geometry, and review.html, which lays the roll out in the clip's
   own rows, would be a picture of a page that was never filmed.

   Playwright's `addStyleTag` cannot do it — it builds a `<style>` element, and
   the vault's `style-src 'self'` refuses one without throwing. The sheet is
   constructed instead. capture-frame.mjs carries both measurements.

   WHAT COUNTS AS "PASSED OVER"
   -----------------------------
   The band of the document the camera ever sees is [0, distance + height] —
   scroll 0 puts the top 900px on screen, scroll 1250 puts [1250, 2150] on
   screen, and the legs between are continuous. Any tile whose box touches that
   band is in the roll, including one showing a single pixel at the far edge.
   That is deliberate: the reviewer's job is to look, and a sliver of a face is
   still a face.

   Boxes are collected from mounted tiles at a series of stops rather than
   sampled per frame. The sheet only mounts tiles near the scroll position, so
   stepping is what makes them exist; the band test is then arithmetic on
   document coordinates and cannot miss a tile between two stops.
   ========================================================================== */

import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

/* The band the capture lays above the page, the travel that follows from it,
   and the two expressions that put it there and check it landed. One module
   rather than a constant here and another in capture-origin.mjs: the shift and
   the travel are two halves of one piece of arithmetic. */
import { ADOPT, BAR, TOOLBAR_TOP, TRAVEL, clearance } from "../censor/capture-frame.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/* ---- record's settings, restated ---------------------------------------- */
const GRID_URL = "http://127.0.0.1:8770/";
const VIEWPORT = { width: 1440, height: 900 };
const DISTANCE = TRAVEL;

/* The vault's own key and its own shape — the two knobs stay null, meaning
   "whichever assignment the server is pointed at", which is what the grid opens
   at when the reader has never moved them. */
const STACK_KEY = "photos.stack";
const STACK_ON = JSON.stringify({ on: true, strictness: null, linkage: null });

/* How far apart the stops are. Only has to be fine enough that the sheet mounts
   every tile in the band on the way past — the band test itself is exact — so
   this is well under a viewport rather than near one. */
const STEP = 100;

/* ---- args --------------------------------------------------------------- */
function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    out[key] = val;
  }
  return out;
}
const opt = args(process.argv.slice(2));

/* An unknown flag is fatal here, which it is not in render.mjs, and the reason
   is that the two have different worst cases. This parser only understands
   `--check`, not `--check=true`; render.mjs mistaking that for an unknown
   variant costs a re-render, whereas this script's non-checking path OVERWRITES
   the roll. So a mistyped drift check would replace the roll a confirmed list
   was signed against and report success, which is the one thing this file must
   not do quietly. Fail on anything unrecognised rather than fall through. */
const KNOWN = new Set(["url", "width", "height", "distance", "out", "check", "stack"]);
const unknown = Object.keys(opt).filter((key) => !KNOWN.has(key));
if (unknown.length) {
  console.error(`error: unknown flag${unknown.length > 1 ? "s" : ""} ${unknown.map((k) => `--${k}`).join(", ")}`);
  console.error(`       have: ${[...KNOWN].map((k) => `--${k}`).join(", ")} — and --check takes no value`);
  process.exit(2);
}

const url = opt.url || GRID_URL;
const width = Number(opt.width || VIEWPORT.width);
const height = Number(opt.height || VIEWPORT.height);
const distance = Number(opt.distance || DISTANCE);
const out = resolve(opt.out ? opt.out : resolve(HERE, "..", "censor", "roll.json"));
const checking = opt.check === "true";

/* Stacked is the default because stacked is what the clip shows. `--stack off`
   is here so the two views can be compared, not because either is a toss-up. */
if (opt.stack !== undefined && opt.stack !== "on" && opt.stack !== "off") {
  console.error(`error: --stack takes "on" or "off", not "${opt.stack}"`);
  process.exit(2);
}
const stacking = opt.stack !== "off";

const band = distance + height;

/* ---- record's own expressions, so the page scrolls the way the clip does -- */
const STOP_SMOOTH_SCROLLING = `
  (() => {
    const style = document.createElement("style");
    style.textContent = "*,html,body{scroll-behavior:auto !important}";
    document.head.appendChild(style);
  })()
`;
const FIND_SCROLLER = `
  (() => {
    const document_ = document.scrollingElement || document.documentElement;
    if (document_.scrollHeight > document_.clientHeight + 4) {
      window.__recordScroller = document_;
      return;
    }
    let best = null;
    let deepest = 0;
    for (const element of document.querySelectorAll("*")) {
      const overflow = element.scrollHeight - element.clientHeight;
      const scrollable = /(auto|scroll)/.test(getComputedStyle(element).overflowY);
      if (scrollable && overflow > deepest) { best = element; deepest = overflow; }
    }
    window.__recordScroller = best || document_;
  })()
`;

/* Every mounted tile, in document coordinates. `data-index` is the sheet's own
   position in the current sort and is rebound on recycling, so it is read at the
   same moment as the box. The hash is taken from the thumbnail URL because the
   vault addresses thumbnails by content — which is what makes a tile targetable
   by a selector at all, and targetable across a re-sort. */
const COLLECT = `
  (() => {
    const scroller = window.__recordScroller;
    const top = scroller.scrollTop;
    const found = [];
    for (const tile of document.querySelectorAll(".tile")) {
      const img = tile.querySelector("img");
      const src = img && img.getAttribute("src");
      const match = src && src.match(/([0-9a-f]{64})\\.webp$/);
      if (!match) continue;
      /* The photograph's box, not the tile element's. A stacked tile is taller
         than its picture — the deck draws a sliver of each extra member above
         it — while the tile-photo child frames the picture exactly where an
         unstacked tile in the same row frames its own. So the element's top
         varies within a row by how many members a stack has, and the
         photograph's does not. This is the box that answers both questions
         asked of it: what the reader actually sees, and which tiles share a
         row. (No backticks in here — this whole expression is a template
         literal, and one would end it.) */
      const box = (tile.querySelector(".tile-photo") ?? tile).getBoundingClientRect();
      found.push({
        sha: match[1],
        index: Number(tile.dataset.index),
        top: Math.round(box.top + top),
        left: Math.round(box.left),
        width: Math.round(box.width),
        height: Math.round(box.height),
      });
    }
    return found;
  })()
`;

async function collect() {
  const browser = await chromium.launch();
  /* A context rather than a bare page, because the stacking setting has to be in
     localStorage before the app's module runs and addInitScript is the only hook
     that early. */
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  if (stacking) {
    await context.addInitScript(`localStorage.setItem(${JSON.stringify(STACK_KEY)}, ${JSON.stringify(STACK_ON)})`);
  }
  /* The band the Frame's titlebar needs, laid on from the same hook and for a
     nearby reason: the sheet's top padding is read at layout, and a margin
     applied after the rows have been laid out would move every box the walk is
     about to measure. Unconditional — the roll describes the page the camera
     sees, and the camera always sees it through the Frame. */
  await context.addInitScript(ADOPT);
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".tile", { timeout: 30_000 });
    /* Stacked rows are laid out from an assignment the client asks for after
       mount, so the first tiles on screen can be the unstacked ones for a beat.
       Collecting those would put photographs in the roll that the clip never
       shows, and — worse — miss the covers that replace them. */
    await page.waitForTimeout(1500);
    await page.evaluate(STOP_SMOOTH_SCROLLING);
    await page.evaluate(FIND_SCROLLER);

    /* Keyed by hash, not by index: a recycled tile comes back under a new index
       and the same photograph must not enter the roll twice.

       The first sighting of a tile is the one kept, which is only sound if a
       tile's document box does not move after it is first mounted — otherwise
       the band test below runs on stale geometry and can drop a photograph the
       clip does show. It holds, and not by luck: the vault returns each file's
       width and height with the page, so rows are laid out before any image is
       requested and there is no load-time reflow to wait out (grid.py says so
       in as many words). Measured rather than taken from the comment — over the
       whole scroll range, 0 of 153 mounted tiles moved between stops. */
    const seen = new Map();
    for (let at = 0; at <= distance; at += STEP) {
      await page.evaluate(`window.__recordScroller.scrollTop = ${at}`);
      await page.waitForTimeout(250);
      for (const tile of await page.evaluate(COLLECT)) {
        if (!seen.has(tile.sha)) seen.set(tile.sha, tile);
      }
    }
    /* The far end exactly, in case distance is not a multiple of STEP. */
    await page.evaluate(`window.__recordScroller.scrollTop = ${distance}`);
    await page.waitForTimeout(400);
    for (const tile of await page.evaluate(COLLECT)) {
      if (!seen.has(tile.sha)) seen.set(tile.sha, tile);
    }

    const inBand = [...seen.values()]
      .filter((t) => t.top < band && t.top + t.height > 0)
      .sort((a, b) => a.top - b.top || a.left - b.left);

    /* Whether stacking actually engaged, asked of the DOM rather than assumed
       from having set the key — the same instinct render.mjs applies to fonts.
       A tile draws a card per extra member, so a visible card is the grid
       saying it is stacked. Without this a renamed key upstream would seed
       nothing, collect a perfectly good unstacked roll, and say nothing. */
    const decks = await page.evaluate(
      `document.querySelectorAll(".tile .card:not([hidden])").length`,
    );

    /* And whether the band actually landed, asked the same way and for the same
       reason. A constructed stylesheet that was adopted and lost the cascade —
       the vault writes this property inline, so the declaration is `!important`
       — collects a perfectly good roll of a page the camera never sees. */
    const toolbar = await page.evaluate(TOOLBAR_TOP);

    return { tiles: inBand, mounted: seen.size, decks, toolbar };
  } finally {
    await browser.close();
  }
}

/* The roll's identity: the hashes it holds, in the order the clip meets them.
   Two runs that agree on this are two runs of the same clip, and a review signed
   against one is a review of the other. Anything else in the file — boxes,
   indices, the run's own timestamp — is reporting. */
const digestOf = (tiles) =>
  createHash("sha256").update(tiles.map((t) => t.sha).join("\n")).digest("hex");

const { tiles, mounted, decks, toolbar } = await collect();
const digest = digestOf(tiles);

const covered = clearance(toolbar);
if (covered !== null) {
  console.error(`error: ${covered}`);
  console.error("       refusing to write a roll of a page the camera does not see.");
  process.exit(1);
}

if (stacking && decks === 0) {
  console.error("error: asked for the stacked grid and got an unstacked one — no tile drew a card.");
  console.error(`       the vault keeps this in localStorage under "${STACK_KEY}"; if that key or its`);
  console.error("       shape has moved, check photos ui/src/lib/stack.js and update STACK_ON here.");
  console.error("       refusing to write a roll that does not match the clip.");
  process.exit(1);
}

if (checking) {
  let previous;
  try {
    previous = JSON.parse(await readFile(out, "utf8"));
  } catch {
    console.error(`error: no roll at ${out} to check against — run without --check first`);
    process.exit(1);
  }
  if (!Array.isArray(previous.tiles)) {
    console.error(`error: ${out} parses but carries no tiles — an interrupted write, or hand-edited`);
    console.error("       re-collect it: run without --check");
    process.exit(1);
  }
  const same = previous.roll_digest === digest;
  const geometry =
    previous.viewport?.width === width &&
    previous.viewport?.height === height &&
    previous.distance === distance &&
    previous.stacking === stacking;
  console.log(`roll on disk   ${previous.tiles.length} tiles  ${previous.roll_digest}`);
  console.log(`roll now       ${tiles.length} tiles  ${digest}`);
  if (!geometry) {
    console.log(
      `geometry       DRIFTED — on disk ${previous.viewport?.width}x${previous.viewport?.height} ` +
        `distance ${previous.distance} stacking ${previous.stacking}, ` +
        `asked for ${width}x${height} distance ${distance} stacking ${stacking}`,
    );
  }
  if (same && geometry) {
    console.log("unchanged — a review signed against this roll still covers the clip");
    process.exit(0);
  }
  /* TWO DRIFTS, AND ONLY ONE OF THEM COSTS A RE-REVIEW. The roll's identity is
     the hashes it holds in the order the clip meets them, so a run that
     reproduces the digest is a run over the same photographs however much the
     geometry moved — which is exactly what happens when the page is pushed down
     and the travel is pushed down with it. Saying "re-review" there would send
     somebody to look at 84 photographs they have already signed for, and the
     review surface would refuse them anyway. Still exit 1 either way: the roll
     on disk describes a page the camera no longer sees, and the boxes in it are
     what review.html lays out. */
  if (same) {
    console.log(
      "DRIFTED — but only the geometry: the same photographs, in the same order, under the same " +
        "digest. The confirmed list still covers the clip and there is nothing to re-review — " +
        "re-collect (run without --check) so the roll records the page that is actually filmed.",
    );
    process.exit(1);
  }
  console.log("DRIFTED — the confirmed list no longer covers the clip; re-collect and re-review");
  process.exit(1);
}

/* Replacing the roll orphans any review signed against it, and the review is 73
   photographs of someone's afternoon. The downstream guards do catch the
   mismatch — review.mjs refuses a stale digest, --check reports DRIFTED — but
   they catch it later, and by then the roll it was signed against is gone. So
   this refuses rather than warns, and says which of the two situations it is:
   a roll that genuinely drifted needs a re-review either way, while an
   unchanged one means the re-run was a habit and there is nothing to do. */
const confirmed = resolve(dirname(out), "censored.json");
if (!checking) {
  let signed;
  try {
    signed = JSON.parse(await readFile(confirmed, "utf8"));
  } catch {
    signed = null;
  }
  if (signed && signed.roll_digest !== digest) {
    console.error(`error: ${confirmed} was signed against a roll this run does not reproduce.`);
    console.error(`       signed  ${signed.roll_digest}  (${signed.censored}/${signed.reviewed} obscured, by ${signed.confirmed_by})`);
    console.error(`       now     ${digest}  (${tiles.length} photographs)`);
    console.error("       the library or the geometry moved, so that review no longer covers the clip.");
    console.error("       delete both files and review again — there is no partial re-review.");
    process.exit(1);
  }
  if (signed) {
    console.log(`censored.json is signed against this roll and still stands (${signed.censored}/${signed.reviewed} obscured)`);
  }
}

await mkdir(dirname(out), { recursive: true });
await writeFile(
  out,
  JSON.stringify(
    {
      note:
        "Every photograph the recording passes over. Assembled by collect-roll.mjs; " +
        "not a decision about any of them. See README.md.",
      grid_url: url,
      viewport: { width, height },
      distance,
      band,
      stacking,
      /* Reporting, like the boxes: it is not part of the roll's identity, and it
         cannot be — the travel moves with it, so a change here leaves the
         digest alone by construction. It is written down because every `top`
         below is measured on a page carrying it, and a reader of this file with
         no way to know that would put every tile 50px too high. What catches a
         change is `distance`, which --check does compare. */
      header_top: toolbar,
      roll_digest: digest,
      tiles,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

console.log(
  `${tiles.length} photographs in the band [0, ${band}] ` +
    `(${mounted} tiles mounted in all, grid ${stacking ? "stacked" : "unstacked"}, ` +
    `toolbar ${toolbar}px down, clear of the Frame's ${BAR}px titlebar)`,
);
console.log(`roll_digest ${digest}`);
console.log(`written ${out}`);
