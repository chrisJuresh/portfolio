/* ============================================================================
   check-capture-origin.mjs — is the origin record is about to photograph the
   one the author signed off?

     node design/tools/check-capture-origin.mjs
     node design/tools/check-capture-origin.mjs --origin http://127.0.0.1:8792

   Exit 0 means the clip may be captured. Exit 1 means it may not, and says why.

   It drives design/censor/capture-origin.mjs the way the clip does — the same
   viewport, the same scroll range — and asks the page four questions that a
   capture cannot ask itself:

     stacked        did the grid mount stacked? The roll was assembled over the
                    stacked view and does not cover the unstacked one.
     light          did it mount light? The vault's default is dark and has no
                    `prefers-color-scheme` fallback, so an origin that stopped
                    seeding the theme would produce a dark clip that looks
                    entirely correct — which is the clip this one replaced.
     obscured       was every confirmed photograph the walk requested served as
                    the mosaic mosaic.py baked, byte for byte?
     substituted    are those bytes actually different from the vault's own? A
                    manifest agreeing with itself proves nothing.

   It lives here rather than in design/censor/ for collect-roll.mjs's reason:
   this is where the repo's one Playwright install is.

   IT DELIBERATELY DOES NOT SEED ANYTHING ITSELF.
   ----------------------------------------------
   collect-roll.mjs seeds stacking with addInitScript, because it drives the
   vault directly and Playwright has a hook that early. This must not: the
   question here is whether the ORIGIN seeds both, since record has no such hook
   and that is the whole reason the origin exists. A check that seeded either
   setting would pass against an origin that had stopped doing so, which is the
   failure it is here to catch.

   WHAT IT CANNOT TELL YOU
   -----------------------
   Whether the roll still describes the live library — that is
   `node design/tools/collect-roll.mjs --check`, and it is the first of the two.
   A confirmed list can be perfectly served and still be a list about a grid
   that has since taken on a new photograph.
   ========================================================================== */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const CENSOR = resolve(HERE, "..", "censor");

/* record's settings, and below them record's own expressions, both copied
   verbatim out of collect-roll.mjs rather than shared with it.

   The settings are copied for the reason that file gives: this repository does
   not depend on record's source tree, and roll.json is what catches a copy going
   stale. The EXPRESSIONS are a plainer duplication, and it is deliberate too —
   collect-roll.mjs is the tool a signed review was assembled with, and a shared
   module would mean an edit made for this file's sake could change how that roll
   is collected. Two files that walk the same grid the same way, and neither able
   to move the other, is worth sixty lines. If a third one ever appears, that is
   the moment to extract. */
const VIEWPORT = { width: 1440, height: 900 };
const DISTANCE = 1200;
const STEP = 100;

const DEFAULT_ORIGIN = "http://127.0.0.1:8792";
const DEFAULT_VAULT = "http://127.0.0.1:8770";

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
const KNOWN = new Set(["origin", "vault", "distance"]);
const unknown = Object.keys(opt).filter((key) => !KNOWN.has(key));
if (unknown.length) {
  console.error(`error: unknown flag${unknown.length > 1 ? "s" : ""} ${unknown.map((k) => `--${k}`).join(", ")}`);
  console.error(`       have: ${[...KNOWN].map((k) => `--${k}`).join(", ")}`);
  process.exit(2);
}
const origin = (opt.origin || DEFAULT_ORIGIN).replace(/\/$/, "");
const vault = (opt.vault || DEFAULT_VAULT).replace(/\/$/, "");
const distance = Number(opt.distance || DISTANCE);

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

const signed = JSON.parse(await readFile(resolve(CENSOR, "censored.json"), "utf8"));
const roll = JSON.parse(await readFile(resolve(CENSOR, "roll.json"), "utf8"));
const manifest = JSON.parse(await readFile(resolve(CENSOR, "mosaic", "manifest.json"), "utf8"));

const confirmed = new Set(signed.tiles.filter((tile) => tile.censor).map((tile) => tile.sha));
const inRoll = new Set(roll.tiles.map((tile) => tile.sha));

/* Every thumbnail the walk was served, by hash, with the digest of what came
   back. Recorded from the response rather than from the request, because the
   question is what the browser was given. */
const served = new Map();
const problems = [];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
const page = await context.newPage();

page.on("response", async (response) => {
  const match = /\/([td])\/([0-9a-f]{64})\.webp$/.exec(new URL(response.url()).pathname);
  if (match === null || !response.ok()) return;
  try {
    const body = await response.body();
    served.set(`${match[1]}/${match[2]}`, createHash("sha256").update(body).digest("hex"));
  } catch {
    /* A response the browser discarded before the body could be read. It is not
       evidence either way, so it is not counted as either. */
  }
});

let decks = 0;
let theme = "";
try {
  await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".tile", { timeout: 30_000 });
  await page.waitForTimeout(1500);
  await page.evaluate(STOP_SMOOTH_SCROLLING);
  await page.evaluate(FIND_SCROLLER);

  for (let at = 0; at <= distance; at += STEP) {
    await page.evaluate(`window.__recordScroller.scrollTop = ${at}`);
    await page.waitForTimeout(250);
  }
  await page.evaluate(`window.__recordScroller.scrollTop = ${distance}`);
  await page.waitForTimeout(600);
  /* Back to the top, because the clip returns there and the tiles it remounts
     on the way are served again. */
  await page.evaluate(`window.__recordScroller.scrollTop = 0`);
  await page.waitForTimeout(600);

  decks = await page.evaluate(`document.querySelectorAll(".tile .card:not([hidden])").length`);
  /* theme.js's own reading of it: the attribute is the theme, and anything that
     is not "light" is the dark default however it got there. Read off the
     document rather than out of localStorage for the reason `decks` is — the
     question is what the camera would photograph, not what was stored. */
  theme = await page.evaluate(`document.documentElement.dataset.theme || "dark"`);
} finally {
  await browser.close();
}

/* ---- stacked ------------------------------------------------------------ */
if (decks === 0) {
  problems.push(
    "the grid mounted UNSTACKED — no tile drew a card. The origin did not seed " +
      'localStorage["photos.stack"], or the vault has moved the key. The signed roll was ' +
      "assembled over the stacked view and does not cover this one.",
  );
}

/* ---- light -------------------------------------------------------------- */
if (theme !== "light") {
  problems.push(
    `the grid mounted ${theme.toUpperCase()} — the origin did not seed ` +
      'localStorage["photos.theme"], or the vault has moved the key or renamed the theme. ' +
      "Check photos ui/src/lib/theme.js against the SEED in design/censor/capture-origin.mjs. " +
      "A dark capture looks entirely correct and is the clip this one replaced.",
  );
}

/* ---- obscured ----------------------------------------------------------- */
let checked = 0;
const missed = new Set(confirmed);
const beyond = new Set();
for (const [key, digest] of served) {
  const [rendition, sha] = key.split("/");
  if (confirmed.has(sha)) {
    missed.delete(sha);
    const baked = manifest.tiles[sha]?.[rendition]?.digest;
    if (baked === undefined) {
      problems.push(`${sha.slice(0, 8)} /${rendition}/ was served and was never baked`);
    } else if (baked !== digest) {
      problems.push(
        `${sha.slice(0, 8)} /${rendition}/ was served as something other than the baked mosaic — ` +
          "an unobscured photograph reached the browser",
      );
    } else {
      checked++;
    }
  } else if (!inRoll.has(sha)) {
    /* Reported, never fatal. The roll is the band the CAMERA sees; the
       virtualised sheet mounts a margin outside it and fetches those thumbnails
       too, so a fetch beyond the roll is the sheet working rather than the roll
       being wrong — and a photograph outside the band is never painted into a
       Frame. Counted because the number moving a lot is worth a look: it tracks
       how far the sheet overscans, not what the clip shows. */
    beyond.add(sha);
  }
}

/* ---- substituted -------------------------------------------------------- */
const [sample] = [...confirmed];
if (sample !== undefined) {
  const theirs = await fetch(`${vault}/t/${sample}.webp`)
    .then(async (response) => createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex"))
    .catch(() => null);
  if (theirs === null) {
    problems.push(`could not reach the vault at ${vault} to compare against`);
  } else if (theirs === manifest.tiles[sample]?.t?.digest) {
    problems.push(
      `${sample.slice(0, 8)} is baked as the vault's own bytes — mosaic.py wrote through, ` +
        "and nothing is actually obscured",
    );
  }
}

/* ---- the report --------------------------------------------------------- */
console.log(`origin           ${origin}`);
console.log(`stacking         ${decks > 0 ? `on — ${decks} tile(s) drew a card` : "OFF"}`);
console.log(`theme            ${theme === "light" ? "light" : `${theme.toUpperCase()} — the clip is meant to be light`}`);
console.log(
  `thumbnails       ${served.size} served over the clip's scroll range, ` +
    `${beyond.size} of them outside the roll's band (the sheet's overscan — never painted)`,
);
console.log(
  `confirmed        ${confirmed.size} on the list, ` +
    `${confirmed.size - missed.size} requested, ${checked} rendition(s) matched the baked mosaic`,
);
if (missed.size) {
  /* Not a failure. A tile the walk never asked for is a tile the clip does not
     paint either, and it is still substituted the moment anything asks. */
  console.log(`                 ${missed.size} never requested: ${[...missed].map((s) => s.slice(0, 8)).join(" ")}`);
}

if (problems.length) {
  console.error("\nREFUSED — do not capture");
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log("\nthe origin is the one the author signed off — the clip may be captured");
