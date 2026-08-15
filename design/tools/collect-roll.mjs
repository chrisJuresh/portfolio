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

   THE GEOMETRY IS RECORD'S, RESTATED
   -----------------------------------
   The defaults below are the settings the recording is made with, and they are
   the whole reason the roll is what it is:

     viewport 1440x900   record/projects/photos/project.toml   [viewport]
     scroll 0 -> 1200    record/projects/photos/actions/scroll-peek.overrides.toml
     document scroller   record/packages/core/src/page.ts      findScroller

   They are copied rather than imported: this repo does not depend on record's
   source tree, and a silent import would let record's settings move without
   anything here noticing. Copied means they can go stale instead — so they are
   written into roll.json, and --check reports a roll assembled at a geometry
   that no longer matches. If record's viewport or distance changes, re-run.

   WHAT COUNTS AS "PASSED OVER"
   -----------------------------
   The band of the document the camera ever sees is [0, distance + height] —
   scroll 0 puts the top 900px on screen, scroll 1200 puts [1200, 2100] on
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

const HERE = dirname(fileURLToPath(import.meta.url));

/* ---- record's settings, restated ---------------------------------------- */
const GRID_URL = "http://127.0.0.1:8770/";
const VIEWPORT = { width: 1440, height: 900 };
const DISTANCE = 1200;

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
const url = opt.url || GRID_URL;
const width = Number(opt.width || VIEWPORT.width);
const height = Number(opt.height || VIEWPORT.height);
const distance = Number(opt.distance || DISTANCE);
const out = resolve(opt.out ? opt.out : resolve(HERE, "..", "censor", "roll.json"));
const checking = opt.check === "true";

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
      const box = tile.getBoundingClientRect();
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
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".tile", { timeout: 30_000 });
    await page.evaluate(STOP_SMOOTH_SCROLLING);
    await page.evaluate(FIND_SCROLLER);

    /* Keyed by hash, not by index: a recycled tile comes back under a new index
       and the same photograph must not enter the roll twice. */
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

    return { tiles: inBand, mounted: seen.size };
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

const { tiles, mounted } = await collect();
const digest = digestOf(tiles);

if (checking) {
  let previous;
  try {
    previous = JSON.parse(await readFile(out, "utf8"));
  } catch {
    console.error(`error: no roll at ${out} to check against — run without --check first`);
    process.exit(1);
  }
  const same = previous.roll_digest === digest;
  const geometry =
    previous.viewport?.width === width &&
    previous.viewport?.height === height &&
    previous.distance === distance;
  console.log(`roll on disk   ${previous.tiles.length} tiles  ${previous.roll_digest}`);
  console.log(`roll now       ${tiles.length} tiles  ${digest}`);
  if (!geometry) {
    console.log(
      `geometry       DRIFTED — on disk ${previous.viewport?.width}x${previous.viewport?.height} ` +
        `distance ${previous.distance}, asked for ${width}x${height} distance ${distance}`,
    );
  }
  if (same && geometry) {
    console.log("unchanged — a review signed against this roll still covers the clip");
    process.exit(0);
  }
  console.log("DRIFTED — the confirmed list no longer covers the clip; re-collect and re-review");
  process.exit(1);
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
      roll_digest: digest,
      tiles,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

console.log(`${tiles.length} photographs in the band [0, ${band}] (${mounted} tiles mounted in all)`);
console.log(`roll_digest ${digest}`);
console.log(`written ${out}`);
