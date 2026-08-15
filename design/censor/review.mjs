/* ============================================================================
   review.mjs — serve the review surface, and take the author's signature.

     node design/censor/review.mjs            # then open the URL it prints
     node design/censor/review.mjs --port 8791

   Node builtins only; nothing here is deployed (.vercelignore excludes design/).

   WHY A SERVER AND NOT A FILE:// PAGE
   ------------------------------------
   The review has to read roll.json, show each photograph from the vault, and
   write the confirmed list back. Under file:// the first is blocked by the
   origin rules and the third is impossible, so the page would end up as a
   copy-and-paste drawer like the tuners — which is the wrong shape for a
   safety list. A list that only becomes real when someone pastes it correctly
   is a list that can be pasted incorrectly.

   So: this serves design/censor/ on localhost, proxies the vault's own routes
   through the same origin, and writes design/censor/censored.json itself.

   THE THREE VAULT ROUTES IT FORWARDS
   -----------------------------------
     /d/<sha>.webp   the 1536px substrate — the review surface. Eight times the
                     grid tile in each dimension, which is the whole point: the
                     judgement this ticket wants cannot be made from a thumbnail.
     /t/<sha>.webp   the grid thumbnail — the filmstrip, and it is also exactly
                     what the clip shows, so seeing it beside the substrate is
                     how the reviewer sees what the reader would.
     /api/reveal     opens the original file in Explorer. The escape hatch for a
                     photograph 1536px cannot settle. Needs the vault's numeric
                     id, which the roll does not carry, so the sha is resolved
                     through one page of /api/photos at startup — the roll is
                     the newest tiles in the vault's default sort, so they are
                     all inside the first page and one fetch resolves the lot.

   The vault refuses any request whose Host header it does not recognise, so
   these are forwarded to 127.0.0.1 rather than rewritten onto this origin.
   ========================================================================== */

import http from "node:http";
import { createReadStream } from "node:fs";
import { readFile, writeFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

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
const port = Number(opt.port || 8791);
const vault = opt.vault || "http://127.0.0.1:8770";

const ROLL = resolve(HERE, "roll.json");
const CONFIRMED = resolve(HERE, "censored.json");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

/* sha -> the vault's numeric id, for /api/reveal. Empty is not fatal: the
   reveal button reports that it cannot resolve and the review carries on with
   the substrate, which is the surface it is designed around anyway. */
const ids = new Map();
async function resolveIds() {
  try {
    const response = await fetch(`${vault}/api/photos?limit=500`);
    const page = await response.json();
    for (const photo of page.photos ?? []) ids.set(photo.s, photo.id);
  } catch (error) {
    console.warn(`warning: could not resolve photo ids for reveal — ${error.message}`);
  }
}

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}

/* Serve out of design/censor/ and nowhere else. The path is normalised and then
   checked to still be under the folder, rather than checked for "..", which is
   the check that survives encodings nobody thought of. */
async function serveStatic(res, urlPath) {
  const rel = decodeURIComponent(urlPath === "/" ? "/review.html" : urlPath);
  const file = normalize(join(HERE, rel));
  if (file !== HERE && !file.startsWith(HERE + sep)) return send(res, 403, "forbidden");
  try {
    const info = await stat(file);
    if (!info.isFile()) return send(res, 404, "not found");
  } catch {
    return send(res, 404, "not found");
  }
  res.writeHead(200, {
    "content-type": MIME[extname(file).toLowerCase()] ?? "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(file).pipe(res);
}

async function proxyImage(res, urlPath) {
  try {
    const response = await fetch(vault + urlPath);
    if (!response.ok) return send(res, response.status, "vault said no");
    const body = Buffer.from(await response.arrayBuffer());
    res.writeHead(200, { "content-type": "image/webp", "cache-control": "no-store" });
    res.end(body);
  } catch (error) {
    send(res, 502, `vault unreachable — is the grid running on ${vault}? (${error.message})`);
  }
}

function readBody(req) {
  return new Promise((resolve_, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      /* The confirmed list for a 73-tile roll is a few kilobytes. A megabyte is
         far past any honest one and far short of anything worth streaming. */
      if (size > 1_000_000) {
        req.destroy();
        reject(new Error("body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve_(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function reveal(req, res) {
  const sha = new URL(req.url, "http://localhost").searchParams.get("sha");
  const id = ids.get(sha);
  if (id === undefined) return send(res, 404, "no id for that hash");
  try {
    const response = await fetch(`${vault}/api/reveal`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    send(res, response.ok ? 200 : response.status, await response.text());
  } catch (error) {
    send(res, 502, error.message);
  }
}

/* The one write. It re-reads the roll from disk rather than trusting the page's
   copy, so what gets signed is the roll as committed and not whatever the tab
   was holding — a tab left open across a re-collect would otherwise sign the
   old one under the new one's name. */
async function confirm(req, res) {
  let submitted;
  try {
    submitted = JSON.parse(await readBody(req));
  } catch (error) {
    return send(res, 400, `unreadable: ${error.message}`);
  }
  const roll = JSON.parse(await readFile(ROLL, "utf8"));
  if (submitted.roll_digest !== roll.roll_digest) {
    return send(res, 409, "that review was made against a different roll — reload and start over");
  }

  const decisions = new Map(Object.entries(submitted.decisions ?? {}));
  const missing = roll.tiles.filter((tile) => !decisions.has(tile.sha));
  if (missing.length) return send(res, 400, `${missing.length} photographs were never looked at`);

  /* Checked here as well as in the page, because the acceptance criterion is
     that the author confirmed the list — so a file that does not say who
     confirmed it is not the artefact, and the page is the one part of this a
     stale tab or a paused script can skip. */
  const by = (submitted.confirmed_by ?? "").trim();
  if (!by) return send(res, 400, "unsigned — the list records who confirmed it");

  /* Anything not decided "clear" is censored. Written this way round on purpose:
     the failure mode of a bug here is a photograph obscured that need not have
     been, not a face published. */
  const tiles = roll.tiles.map((tile) => ({
    sha: tile.sha,
    index: tile.index,
    decision: decisions.get(tile.sha),
    censor: decisions.get(tile.sha) !== "clear",
    selector: `img[src$="${tile.sha}.webp"]`,
  }));
  const censored = tiles.filter((tile) => tile.censor);

  await writeFile(
    CONFIRMED,
    JSON.stringify(
      {
        note:
          "The confirmed censored tile list. Every tile with censor:true is obscured in " +
          "the page before capture. Assembled by review.mjs from a human pass over " +
          "roll.json; see README.md.",
        roll_digest: roll.roll_digest,
        viewport: roll.viewport,
        distance: roll.distance,
        confirmed_by: by,
        confirmed_at: submitted.confirmed_at,
        reviewed: tiles.length,
        censored: censored.length,
        selector_list: censored.map((tile) => tile.selector).join(",\n"),
        tiles,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log(`confirmed: ${censored.length} of ${tiles.length} censored — written ${CONFIRMED}`);
  send(res, 200, JSON.stringify({ censored: censored.length, reviewed: tiles.length }), MIME[".json"]);
}

const server = http.createServer(async (req, res) => {
  const path = req.url.split("?")[0];
  try {
    if (req.method === "POST" && path === "/confirm") return await confirm(req, res);
    if (req.method === "POST" && path === "/reveal") return await reveal(req, res);
    if (req.method !== "GET") return send(res, 405, "method not allowed");
    if (/^\/[td]\/[0-9a-f]{64}\.webp$/.test(path)) return await proxyImage(res, path);
    return await serveStatic(res, path);
  } catch (error) {
    send(res, 500, error.stack ?? String(error));
  }
});

await resolveIds();
server.listen(port, "127.0.0.1", () => {
  console.log(`review surface   http://127.0.0.1:${port}/`);
  console.log(`vault            ${vault}  (${ids.size} hashes resolved for reveal)`);
  console.log(`writes           ${CONFIRMED}`);
});
