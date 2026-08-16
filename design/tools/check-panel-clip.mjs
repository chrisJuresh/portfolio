/* ============================================================================
   check-panel-clip.mjs — does the Panel's recording behave the way #65 says?

     node design/tools/check-panel-clip.mjs

   Exit 0 if every one of #65's behavioural criteria holds, 1 if any does not,
   and it names which. It serves the tree it is invoked from, so it answers for
   the working copy rather than for whatever is deployed —
   `preview_start` serves the main checkout in this repository and would
   silently report on `development` while looking like it reported on the branch.

   IT LOADS THE PAGE TWICE, which is the whole design. Four of the criteria are
   about what the clip does and one is about what it declines to do, and the
   second cannot be observed in the same load as the first:

     no-preference   plays, loops, is silent, plays inline, and one of the two
                     formats won — reported by name, because "a source resolved"
                     and "the format you meant resolved" are different facts
     reduce          NOT ONE BYTE of either video file is requested. The poster
                     is, and that is the frozen still the criterion asks for.

   The reduced-motion half is asserted from the NETWORK and not from the DOM.
   A paused element with a poster over it looks identical whether the file was
   downloaded or not, and #57's user story 25 is about the bandwidth rather than
   about the stillness. So every request the page makes is recorded and the
   video files must simply not be among them.
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

/* The clip's own directory, which is the whole of what must not be fetched. The
   poster lives there too and is fetched in both states, so the test is by
   extension rather than by directory. */
const VIDEO = /\/portfolio\/video\/.*\.(webm|mp4)(\?|$)/;
const POSTER = /\/portfolio\/video\/.*\.webp(\?|$)/;

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

/** What one load of the page saw. */
async function load(browser, origin, reducedMotion) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion,
  });
  const asked = [];
  context.on("request", (request) => asked.push(request.url()));
  const page = await context.newPage();
  try {
    await page.goto(origin + PAGE, { waitUntil: "load" });
    /* Long enough for a fetch that was going to happen to have happened, and
       for a clip that was going to play to have started. Both of the things
       being asserted are decided in the first frames after load. */
    await page.waitForTimeout(2500);
    const clip = await page.evaluate(() => {
      const video = document.querySelector(".panel-clip");
      if (!video) return null;
      const style = getComputedStyle(video);
      return {
        currentSrc: video.currentSrc,
        sources: [...video.querySelectorAll("source")].length,
        paused: video.paused,
        loop: video.loop,
        muted: video.muted,
        inline: video.hasAttribute("playsinline"),
        readyState: video.readyState,
        decoded: `${video.videoWidth}x${video.videoHeight}`,
        poster: video.getAttribute("poster"),
        objectFit: `${style.objectFit} ${style.objectPosition}`,
        /* Reported so a Frame that has silently lost its shape is visible here
           rather than only on a contact sheet. */
        box: (({ width, height }) => `${Math.round(width)}x${Math.round(height)}`)(
          video.getBoundingClientRect(),
        ),
      };
    });
    return { clip, asked };
  } finally {
    await context.close();
  }
}

const server = await serve();
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();

let moving;
let still;
try {
  moving = await load(browser, origin, "no-preference");
  still = await load(browser, origin, "reduce");
} finally {
  await browser.close();
  server.close();
}

const problems = [];
const say = (label, value) => console.log(`${label.padEnd(17)}${value}`);

console.log(`serving          ${ROOT}`);
console.log(`page             ${PAGE}\n`);

/* ---- the clip is there at all ------------------------------------------- */
if (moving.clip === null || still.clip === null) {
  console.error("REFUSED — there is no .panel-clip on the page at all");
  process.exit(1);
}

/* ---- no-preference ------------------------------------------------------ */
const won = moving.clip.currentSrc.match(/\.(webm|mp4)/);
say("format", won ? `${won[1]} won — ${moving.clip.currentSrc.replace(origin, "")}` : "NONE resolved");
say("plays", moving.clip.paused ? "PAUSED" : `playing, decoded at ${moving.clip.decoded}`);
say("loops", moving.clip.loop ? "yes" : "NO");
say("silent", moving.clip.muted ? "muted" : "NOT MUTED");
say("inline", moving.clip.inline ? "playsinline" : "NO playsinline");
say("in the Frame", `${moving.clip.box}, ${moving.clip.objectFit}`);

if (!won) problems.push("no source resolved — the clip plays nothing");
if (moving.clip.paused) problems.push("the clip is not playing; #57 asks it to start on its own");
if (!moving.clip.loop) problems.push("the clip does not loop; #57 asks not to end on a frozen frame");
if (!moving.clip.muted) problems.push("the clip is not muted — the page can make noise, and it must not");
if (!moving.clip.inline) problems.push("no playsinline — iOS takes the clip fullscreen instead");
if (moving.clip.decoded !== "1440x900") {
  problems.push(`decoded at ${moving.clip.decoded}, not the 1440x900 the roll was collected at`);
}

/* ---- reduce ------------------------------------------------------------- */
const fetched = still.asked.filter((url) => VIDEO.test(url));
const poster = still.asked.filter((url) => POSTER.test(url));
console.log("");
say("reduced motion", still.clip.paused ? "frozen" : "STILL PLAYING");
say("video fetched", fetched.length === 0 ? "none — not one byte" : `${fetched.length}: ${fetched.join(", ")}`);
say("poster fetched", poster.length ? `yes — ${poster[0].replace(origin, "")}` : "NO, so there is nothing to freeze to");
say("sources", still.clip.sources === 0 ? "none given" : `${still.clip.sources} GIVEN`);

if (fetched.length) {
  problems.push(`${fetched.length} video file(s) fetched under prefers-reduced-motion; #57 asks for none`);
}
if (!poster.length) problems.push("the poster was not fetched, so a reduced-motion reader sees an empty Frame");
if (!still.clip.paused) problems.push("the clip is playing under prefers-reduced-motion");
if (!still.clip.poster) problems.push("the video element carries no poster attribute");

/* ---- the report --------------------------------------------------------- */
if (problems.length) {
  console.error("\nFAILED");
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log("\nthe Panel's recording behaves the way #65 asks");
