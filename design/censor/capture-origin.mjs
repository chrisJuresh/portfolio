/* ============================================================================
   capture-origin.mjs — the origin the clip is recorded against.

     node design/censor/capture-origin.mjs
     node design/censor/capture-origin.mjs --port 8792 --vault http://127.0.0.1:8770

   Node builtins only; nothing here is deployed (.vercelignore excludes design/).

   The vault as it stands is not the thing #65 is allowed to photograph, in
   four separate ways. This stands in front of it and fixes all four, and
   record then records this rather than the vault:

     the confirmed tiles     served as the mosaics design/censor/mosaic.py baked,
                             so the browser taking the picture is never sent an
                             unobscured pixel of one
     stacking                seeded into this origin's localStorage by a script
                             served from this origin, so the grid mounts stacked
     the theme               seeded the same way, so the grid mounts light — the
                             vault's default is dark and the clip is not
     the titlebar's room     a stylesheet served from this origin, so the page is
                             filmed with the Frame's glass strip's height of its
                             own ground above the vault's toolbar rather than
                             with the toolbar cut through the middle by it.
                             design/censor/capture-frame.mjs is the whole of it

   Everything else is forwarded untouched, headers included — the vault's own
   Content-Security-Policy above all, so the page being photographed is under
   exactly the restrictions the real one is.

   WHY A PROXY AND NOT record's `.evaluate()` HATCH
   ------------------------------------------------
   #57 and #65 both describe injecting a censoring stylesheet through record's
   Timeline. design/censor/README.md, written after the selectors were checked
   against the live page, already records two things that hatch cannot do — a
   `<style>` element is refused by the vault's CSP, and a per-element filter
   desynchronises when the virtualised sheet recycles a tile. Two more turned up
   here:

   - **A stylesheet has no mosaic.** `blur()` is CSS's only obscuring primitive
     and README.md rejects blur on the record. mosaic.py has the rest of it.
   - **The Timeline is too late.** record photographs a settled page once before
     the first Frame of the Timeline — `captureFrames` in its
     packages/core/src/capture.ts — so a rule the Timeline injects is not in the
     page when that picture is taken.

   And the hatch cannot do stacking at all, which README.md says outright: the
   setting is read from localStorage once at mount, and the Timeline runs after
   navigation. Left alone, #65 produces a clip that looks entirely correct and
   shows the unstacked grid — a view the signed roll was never assembled over.
   The theme is the same shape of problem and the same answer: `photos.theme` is
   read once from localStorage before the app mounts, so a Timeline that flipped
   it would flip it after the settled frame had already been photographed.

   The titlebar's room is the fourth, and the reason it is here rather than in
   the Timeline is the SETTLED FRAME again: record photographs the page once
   before the first Frame of the Timeline, so a margin the Timeline laid on
   would be missing from the picture that decides what the clip opens on — which
   is the one frame the whole margin is for. Not a fifth reason, then: the fourth
   one, met by a second thing that has to be in the page before record looks at
   it.

   One proxy answers all four, and it answers them in the only place that is
   strictly earlier than the page: the bytes.

   WHAT IT REFUSES TO START WITHOUT
   --------------------------------
   The failure this guards against is a capture that runs, looks right, and is
   not covered by anything anybody signed. So the confirmed list must be signed
   and must match the roll on disk, and mosaic.py's manifest must have been
   baked against that same signature, with every file it named still on disk and
   still the bytes it recorded. Anything less and this refuses to listen.

   It cannot, however, tell you that the roll still describes the live grid —
   importing one photograph shifts it. That is
   `node design/tools/collect-roll.mjs --check`, and it is a separate command
   because it drives a browser. Run it first.
   ========================================================================== */

import http from "node:http";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* The capture's geometry, stated once. Imported rather than restated because
   this file, collect-roll.mjs and check-capture-origin.mjs have to agree about
   it exactly — and unlike record's viewport, which is a copy of something in
   another repository, the shift and the travel are two halves of one piece of
   arithmetic that only works if nothing can move one without the other. */
import { BAR, CSS, CSS_PATH, HEADER_TOP, LINK_TAG } from "./capture-frame.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFIRMED = resolve(HERE, "censored.json");
const ROLL = resolve(HERE, "roll.json");
const MOSAIC = resolve(HERE, "mosaic");
const MANIFEST = resolve(MOSAIC, "manifest.json");

/** mosaic.py's ceiling, restated. See where it is used for why it is restated. */
const MAX_BLOCKS = 8;

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

/* An unrecognised flag is fatal, for collect-roll.mjs's reason: a misspelling
   that falls through to a default is how a capture ends up made against
   something other than what was asked for. */
const KNOWN = new Set(["port", "vault"]);
const opt = args(process.argv.slice(2));
for (const key of Object.keys(opt)) {
  if (!KNOWN.has(key)) {
    console.error(`error: --${key} is not a flag this takes (${[...KNOWN].join(", ")})`);
    process.exit(2);
  }
}
const port = Number(opt.port || 8792);
const vault = opt.vault || "http://127.0.0.1:8770";

/* ---------------------------------------------------------------------------
   THE SEEDED SETTINGS

   A classic script in <head>, so it runs before the module the vault mounts its
   app from — `<script type="module">` is deferred, and this is not. Served from
   this origin, which is what gets it past `script-src 'self'` without the CSP
   being rewritten: the page is photographed under the policy it really carries.

   TWO SETTINGS, ONE SCRIPT, AND BOTH FOR THE SAME REASON. Each is read out of
   localStorage exactly once before the app paints, so each has to be there
   before the document's own scripts run and neither can be set from anywhere
   later. They are written in the shape their own module validates against —
   stack.js and theme.js — because both files check what they read rather than
   trusting it, and a near-miss comes back as the default with nothing said.

     photos.stack   the grid drawn stacked, which is the view the Panel exists
                    to show off and the view the signed roll was assembled over.
                    Both knobs stay null, meaning "whichever assignment the
                    server is pointed at": this seeds how the grid is drawn and
                    has no business choosing a threshold.
     photos.theme   "light". The vault's default is dark and theme.js has no
                    `prefers-color-scheme` fallback, so a fresh profile — which
                    is what record photographs — mounts dark unless told.

   The theme is a decision about the clip and not about the roll: it repaints
   the ground behind the photographs and moves nothing. Measured rather than
   assumed — the same walk run under each theme returns the same 84 tiles at the
   same boxes and the same roll_digest, so the signed list covers the light clip
   exactly as it covered the dark one. README.md records that.
   ------------------------------------------------------------------------ */
const SEED = `/* Written by design/censor/capture-origin.mjs. See design/censor/README.md. */
try {
  localStorage.setItem("photos.stack", JSON.stringify({ on: true, strictness: null, linkage: null }));
  localStorage.setItem("photos.theme", "light");
} catch (error) {
  /* Nothing to fall back to, so say it where the check can see it. */
  console.error("capture-origin: could not seed the capture settings —", error);
}
`;

const SEED_TAG = '<script src="/__capture/seed.js"></script>';

/* ---------------------------------------------------------------------------
   WHAT IS SUBSTITUTED
   ------------------------------------------------------------------------ */

/** The confirmed list, the roll, and the baked mosaics, or a reason not to serve. */
async function load() {
  const signed = JSON.parse(await readFile(CONFIRMED, "utf8"));
  const roll = JSON.parse(await readFile(ROLL, "utf8"));

  if (signed.roll_digest !== roll.roll_digest) {
    throw new Error(
      "the confirmed list was signed against a different roll than the one on disk — " +
        "re-collect and re-review, see design/censor/README.md",
    );
  }
  if (!(signed.confirmed_by ?? "").trim()) {
    throw new Error("the confirmed list is unsigned");
  }

  let manifest;
  try {
    manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  } catch {
    throw new Error("no mosaics are baked — run `python design/censor/mosaic.py`");
  }
  if (manifest.roll_digest !== signed.roll_digest || manifest.confirmed_at !== signed.confirmed_at) {
    throw new Error("the baked mosaics are older than the signature — re-run `python design/censor/mosaic.py`");
  }

  /* Restated from mosaic.py's MAX_BLOCKS, and restated on purpose. mosaic.py
     refuses to BAKE finer than this and this refuses to SERVE it, so a
     hand-edited manifest or a bake made by an older copy of the script cannot
     put a fine mosaic in front of the camera. It is the acceptance criterion —
     "coarse enough that a tile resolves to a handful of blocks" — and the only
     one every other check here is blind to: digests agree with whatever they
     were taken over, however fine. */
  if (!(manifest.blocks <= MAX_BLOCKS)) {
    throw new Error(
      `the mosaics were baked at ${manifest.blocks} blocks, finer than the ${MAX_BLOCKS} ` +
        "this will serve — re-bake coarser, see design/censor/README.md",
    );
  }

  /* "<rendition>/<sha>" -> the bytes to serve. Read into memory once: fourteen
     tiles of flat blocks is a few hundred kilobytes, and a capture that had to
     wait on a disk read per tile would be measuring the disk. */
  const substitutes = new Map();
  for (const tile of signed.tiles.filter((tile) => tile.censor)) {
    const baked = manifest.tiles[tile.sha];
    if (baked === undefined) {
      throw new Error(`${tile.sha.slice(0, 8)} is on the confirmed list and was never baked`);
    }
    for (const [rendition, facts] of Object.entries(baked)) {
      const bytes = await readFile(resolve(MOSAIC, rendition, `${tile.sha}.webp`)).catch(() => null);
      if (bytes === null) {
        throw new Error(`${tile.sha.slice(0, 8)} /${rendition}/ is missing from design/censor/mosaic/`);
      }
      if (createHash("sha256").update(bytes).digest("hex") !== facts.digest) {
        throw new Error(`${tile.sha.slice(0, 8)} /${rendition}/ is not the file mosaic.py baked`);
      }
      substitutes.set(`${rendition}/${tile.sha}`, bytes);
    }
  }

  return { signed, manifest, substitutes };
}

/* ---------------------------------------------------------------------------
   THE PROXY
   ------------------------------------------------------------------------ */

/* The vault refuses a Host header it does not recognise, so requests are
   forwarded to it by address rather than rewritten onto this origin — the same
   arrangement review.mjs uses. Headers come back as they went out, so the
   page's CSP, its cache directives and its content types are the vault's.

   Hop-by-hop headers are dropped rather than forwarded: fetch has already
   decoded the body, so a content-encoding claiming otherwise would be a lie the
   browser acts on. */
const NOT_FORWARDED = new Set(["content-encoding", "content-length", "transfer-encoding", "connection"]);

const THUMBNAIL = /^\/([td])\/([0-9a-f]{64})\.webp$/;

function serve(res, status, body, headers = {}) {
  res.writeHead(status, { "cache-control": "no-store", ...headers });
  res.end(body);
}

function proxy(substitutes, counts) {
  return async (req, res) => {
    const path = req.url.split("?")[0];

    if (path === "/__capture/seed.js") {
      counts.seed++;
      return serve(res, 200, SEED, { "content-type": "text/javascript; charset=utf-8" });
    }

    /* Same origin, which is what gets it past `style-src 'self'` — the CSP the
       vault really serves, forwarded untouched below. A <style> element built
       in the page would be refused by that same policy without throwing;
       capture-frame.mjs has the measurement. */
    if (path === CSS_PATH) {
      counts.css++;
      return serve(res, 200, CSS, { "content-type": "text/css; charset=utf-8" });
    }

    const thumbnail = THUMBNAIL.exec(path);
    if (thumbnail !== null) {
      const obscured = substitutes.get(`${thumbnail[1]}/${thumbnail[2]}`);
      if (obscured !== undefined) {
        counts.obscured++;
        return serve(res, 200, obscured, { "content-type": "image/webp" });
      }
    }

    let response;
    try {
      response = await fetch(vault + req.url, {
        method: req.method,
        headers: { accept: req.headers.accept ?? "*/*" },
      });
    } catch (error) {
      return serve(res, 502, `vault unreachable — is the grid running on ${vault}? (${error.message})`, {
        "content-type": "text/plain; charset=utf-8",
      });
    }

    const headers = {};
    for (const [name, value] of response.headers) {
      if (!NOT_FORWARDED.has(name.toLowerCase())) headers[name] = value;
    }

    let body = Buffer.from(await response.arrayBuffer());

    /* The one rewrite, and it inserts two things. The seed goes in immediately
       after <head>, so it is the first script the document has and runs before
       the deferred module the app mounts from; the stylesheet follows it, and
       where in the head it lands does not matter, because its one declaration
       is `!important` and has to outrank an inline style rather than another
       rule. Refusing rather than serving an unseeded document: a page that
       quietly mounted unstacked, or dark, or with its toolbar under the glass,
       is exactly the failure this exists to stop, and every one of them would
       look like a working capture. */
    if ((headers["content-type"] ?? "").startsWith("text/html")) {
      const html = body.toString("utf8");
      const at = html.indexOf("<head>");
      if (at < 0) {
        return serve(res, 500, `no <head> in ${path} — cannot seed the capture settings, refusing to serve it`, {
          "content-type": "text/plain; charset=utf-8",
        });
      }
      counts.seeded++;
      body = Buffer.from(
        html.slice(0, at + 6) + "\n" + SEED_TAG + "\n" + LINK_TAG + html.slice(at + 6),
        "utf8",
      );
    }

    res.writeHead(response.status, { ...headers, "content-length": body.length });
    res.end(body);
  };
}

/* ---------------------------------------------------------------------------
   START
   ------------------------------------------------------------------------ */

let loaded;
try {
  loaded = await load();
} catch (error) {
  console.error(`refusing to serve: ${error.message}`);
  process.exit(1);
}

const { signed, manifest, substitutes } = loaded;
const counts = { obscured: 0, seed: 0, css: 0, seeded: 0 };
const server = http.createServer(proxy(substitutes, counts));

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`error: something is already listening on 127.0.0.1:${port}.`);
    console.error(`       if it is another capture origin, record against that one. Otherwise: --port ${port + 1}`);
    process.exit(1);
  }
  throw error;
});

/* Counts rather than a line per request: a Run of the clip asks for a few
   hundred tiles and a log of every one of them would bury the number that
   matters, which is that no censored tile was ever served from the vault. */
process.on("SIGINT", () => {
  console.log(
    `\n${counts.obscured} obscured tile(s) served, ` +
      `${counts.seeded} document(s) seeded, seed.js fetched ${counts.seed} time(s), ` +
      `frame.css fetched ${counts.css} time(s)`,
  );
  server.close(() => process.exit(0));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`capture origin   http://127.0.0.1:${port}/`);
  console.log(`vault            ${vault}`);
  console.log(
    `obscuring        ${substitutes.size} rendition(s) of ${signed.censored} tile(s), ` +
      `${manifest.blocks} blocks on the shorter side`,
  );
  console.log(`signed by        ${signed.confirmed_by} at ${signed.confirmed_at}`);
  console.log(`stacking, theme  seeded before the app mounts — stacked, light`);
  console.log(
    `titlebar's room  --header-top ${HEADER_TOP}px, ` +
      `so the toolbar sits clear of the Frame's ${BAR}px strip`,
  );
  console.log(`\nverify with      node design/tools/check-capture-origin.mjs`);
});
