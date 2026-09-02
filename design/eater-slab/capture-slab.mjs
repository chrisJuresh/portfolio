#!/usr/bin/env node
/* ============================================================================
   capture-slab.mjs — the Eater Map Showcase's Slab: one still of the Eater map
   over central London, with the rail network drawn on it and none of the app's
   interface on top.

     node design/eater-slab/capture-slab.mjs
     node design/eater-slab/capture-slab.mjs --restaurant "St. John"
     node design/eater-slab/capture-slab.mjs --centre 51.51340,-0.13125 --zoom 16
     node design/eater-slab/capture-slab.mjs --out portfolio/img/eater/slab-alt.webp

   EVERY NUMBER IS IN slab.json AND NOT IN HERE. That is the point of the pair:
   changing the project's example is changing one field and running the command
   again, which is what makes this a script rather than a committed picture.
   README.md beside it says what each field is for.

   Why this is a script and not a Bake, what a Slab is for, and what each field
   of slab.json means are all in README.md beside it, and are not repeated here.
   What follows is only what a reader of this FILE needs: the three things the
   code does that look arbitrary until the reason is given.

   WHY THE APP IS DRIVEN OFFLINE
   -----------------------------
   Eater picks its basemap from `navigator.onLine`: online it fetches vector
   tiles from the Protomaps API with a key that is CORS-locked to *.chrisj.uk,
   which from 127.0.0.1 fetches nothing at all. Its BUNDLED basemap is on disk in
   the checkout and needs no token, and the app reaches for it the moment the
   browser says it is offline — so the capture says so. That is also the honest
   Slab: the Section's fourth numbered point is that the app works on the Tube,
   and this is the map it draws there.

   Being offline puts Eater's "offline" watermark on the map container, visible
   only through tiles the bundled basemap does not cover. It is the app telling
   the reader about connectivity, so it is interface, and slab.json's `strip`
   takes it off with the rest.

   WHY THE MAP IS RE-THEMED IN FLIGHT AND NOT IN THE EATER CHECKOUT
   ----------------------------------------------------------------
   The Slab is a dark map and Eater draws a light one, so the modules its dev
   server serves are rewritten on their way to the browser. Nothing in that
   checkout is edited: it is another repository, the app is not dark, and a
   local edit there would be either a diff nobody asked for or a stash somebody
   loses.

   The rewrites are declared in slab.json's `retheme` and the decisions are in
   retheme.mjs, which is pure and has a test beside it. Each one says how many
   times it must match, and a count that does not agree stops the run — which is
   the same argument `strip` and `keep` make below, for the same reason.

   WHY THE INTERFACE IS STRIPPED AND THEN CHECKED
   ----------------------------------------------
   `strip` hides everything that is not the map; `keep` names what is left. They
   have to agree, and a selector that quietly stops matching — Eater renames a
   class, Svelte rearranges a wrapper — would put a search bar back on the Slab
   without anything failing. So after the CSS is applied the page is ASKED what
   is still visible, and anything outside `keep` stops the run before a file is
   written. A wrong Slab on disk looks exactly like a right one until somebody
   opens it.

   The camera is checked the same way and for the same reason. It is handed over
   as Eater's own deep link, `#zoom/lat/lon`, which the app parses with a strict
   regex and drops on the floor when it does not match — and what it falls back
   to is the whole of London, which is a perfectly ordinary-looking picture of
   the wrong thing. Eater writes the camera it settled on back into the URL, so
   reading the hash afterwards is the app's own account of where it is pointing.

   The same argument runs through aim(): a centre can come from a flag, from
   slab.json or from a restaurant's coordinates, and the report names which,
   because a Slab of the wrong place is indistinguishable from one of the right
   place.

   The restaurant markers stay. They are Eater's data drawn into the map rather
   than interface laid over it, and a transit map with no restaurants on it is
   not the Eater map.

   WHY THE FILE ON DISK IS NOT THE FILE THE BROWSER HANDED OVER
   ------------------------------------------------------------
   A browser screenshot is a PNG, and a PNG of a labelled map is about a
   megabyte. The Slab is on the page now (#176), so this is a file a reader is
   sent rather than one an agent looks at, and it is re-encoded to WebP before
   it is written — a tenth of the bytes for a picture nobody can tell apart at
   the size it is drawn.

   The encode happens IN THE SAME CHROMIUM that took the shot, through a canvas,
   rather than in Pillow or sharp. Two reasons and the second is the one that
   settled it: nothing new has to be installed for a script that already drives
   a browser, and the still that lands on disk came out of one encoder rather
   than two — a re-capture run on a machine with a different libwebp would
   otherwise be a diff that says nothing.

   The stability loop above it still compares PNG bytes. It is asking whether
   the MAP has stopped moving, and two encodes of one frame have to be equal for
   that question to mean anything.
   ========================================================================== */

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { auditRetheme, planRetheme, rewriteModule } from './retheme.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPO = resolve(HERE, '..', '..');
const SLAB = JSON.parse(readFileSync(join(HERE, 'slab.json'), 'utf8'));

const USAGE = `
  node design/eater-slab/capture-slab.mjs [options]

    --restaurant <name>    which restaurant the Slab is centred on
                           (default: ${SLAB.restaurant})
    --centre <lat,lon>     an explicit centre, instead of the restaurant's own
    --zoom <number>        an explicit zoom (default: ${SLAB.zoom})
    --out <path>           where to write it (default: ${SLAB.output})
    --checkout <path>      the Eater checkout, instead of $EATER_CHECKOUT
`;

// ---------------------------------------------------------------------------
// The decisions, before anything is started
// ---------------------------------------------------------------------------

/** Everything that can go wrong here is the author's to fix, so say it and go. */
class Refusal extends Error {}

/**
 * One of `eater.needs`, by name.
 *
 * The two paths this script opens for itself — the dataset and vite's entry
 * point — are already declared there as preconditions, and writing them a second
 * time in here is how one of the two copies moves and the other keeps checking a
 * path nothing uses. So the declaration is the only copy, and an `id` that no
 * longer exists is a refusal rather than an `undefined` joined onto a path.
 */
function needPath(id) {
  const need = SLAB.eater.needs.find((one) => one.id === id);
  if (!need) throw new Refusal(`slab.json's eater.needs has nothing called ${JSON.stringify(id)}.`);
  return need.path;
}

function die(message, detail = []) {
  console.error(`\nslab: ${message}`);
  for (const line of detail) console.error(`  ${line}`);
  console.error('');
  process.exit(1);
}

/**
 * The flags, in the order slab.json declares the fields they override.
 *
 * Unknown flags are a refusal rather than a shrug: `--restaraunt` silently
 * capturing the default is the failure this whole script is written against.
 */
export function parseArgs(argv) {
  const out = {};
  const takes = new Set(['--restaurant', '--centre', '--center', '--zoom', '--out', '--checkout']);
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--help' || flag === '-h') return { help: true };
    if (!takes.has(flag)) throw new Refusal(`no such option ${flag}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Refusal(`${flag} wants a value`);
    i += 1;
    if (flag === '--restaurant') out.restaurant = value;
    else if (flag === '--centre' || flag === '--center') out.centre = parseCentre(value);
    else if (flag === '--zoom') out.zoom = parseZoom(value);
    else if (flag === '--out') out.output = value;
    else out.checkout = value;
  }
  return out;
}

export function parseCentre(text) {
  const parts = String(text).split(',').map((part) => Number(part.trim()));
  if (parts.length !== 2 || !parts.every(Number.isFinite)) {
    throw new Refusal(`--centre wants "lat,lon", not ${JSON.stringify(text)}`);
  }
  const [lat, lon] = parts;
  if (lat < -90 || lat > 90) throw new Refusal(`--centre's latitude ${lat} is not on the planet`);
  if (lon < -180 || lon > 180) throw new Refusal(`--centre's longitude ${lon} is not on the planet`);
  return { lat, lon };
}

export function parseZoom(text, range = SLAB.zoomRange) {
  const zoom = Number(text);
  // The range is Eater's own — its offline floor and its ceiling. Outside it the
  // app silently clamps and the Slab is not the one that was asked for, so it is
  // declared in slab.json beside the zoom it bounds rather than written here.
  if (!Number.isFinite(zoom) || zoom < range.min || zoom > range.max) {
    throw new Refusal(`--zoom wants a number between ${range.min} and ${range.max}, not ${JSON.stringify(text)}`);
  }
  return zoom;
}

/**
 * Where the Eater checkout is: the flag, then the environment, then slab.json,
 * then a sibling of the repository called `eater`.
 *
 * The sibling default is a convenience and not an assumption — it is checked
 * like every other path, and its absence is named.
 *
 * `beside` is the MAIN CHECKOUT's parent and not this tree's. Every change here
 * is made in a worktree under `.claude/worktrees/`, so a sibling of the tree the
 * script runs from would be `.claude/worktrees/eater`, which is nobody's
 * checkout — the default would be dead exactly when an agent is using it.
 */
export function resolveCheckout({ flag, env, configured, beside, from }) {
  const chosen = flag ?? env ?? configured ?? join(beside, 'eater');
  return isAbsolute(chosen) ? chosen : resolve(from, chosen);
}

/**
 * The directory the main checkout sits in, asked of git rather than assumed.
 *
 * `--git-common-dir` is the one that answers the MAIN repository's `.git` from
 * inside a worktree; `--git-dir` answers the worktree's own. Falling back to
 * this tree's parent when git says nothing keeps an unpacked tarball working,
 * and the fallback is checked like every other path.
 */
function mainCheckoutParent(repo) {
  const asked = spawnSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
    cwd: repo,
    encoding: 'utf8',
  });
  const common = asked.status === 0 ? asked.stdout.trim() : '';
  return common ? dirname(dirname(common)) : dirname(repo);
}

/**
 * The one restaurant this name means, or a refusal that says why not.
 *
 * An exact name wins outright; otherwise the name has to pick out exactly one
 * entry. Two matches is a refusal rather than a first-past-the-post, because
 * "Dishoom" is several restaurants and quietly capturing whichever one sorts
 * first is the failure this script exists to prevent.
 */
export function findRestaurant(restaurants, name) {
  const wanted = String(name ?? '').trim().toLowerCase();
  if (!wanted) throw new Refusal('--restaurant wants a name');

  const exact = restaurants.filter((one) => String(one.name ?? '').trim().toLowerCase() === wanted);
  if (exact.length === 1) return exact[0];

  const pool =
    exact.length > 1 ? exact : restaurants.filter((one) => String(one.name ?? '').toLowerCase().includes(wanted));
  if (pool.length === 1) return pool[0];
  if (pool.length === 0) throw new Refusal(`no restaurant in the Eater dataset is called ${JSON.stringify(name)}`);

  throw new Refusal(
    `${pool.length} restaurants match ${JSON.stringify(name)} — name one of them exactly, or give --centre:\n` +
      pool
        .slice(0, 8)
        .map((one) => `      ${one.name} — ${one.address ?? 'no address'}`)
        .join('\n') +
      (pool.length > 8 ? `\n      …and ${pool.length - 8} more` : ''),
  );
}

/** Eater's deep link, spelled the way its own serializeView() spells it. */
export function viewHash(zoom, lat, lon) {
  return `#${zoom.toFixed(2)}/${lat.toFixed(5)}/${lon.toFixed(5)}`;
}

/**
 * Eater's parseUrlState(), restated, so the hash it writes back can be read.
 *
 * Copied rather than imported: this repository does not depend on Eater's source
 * tree, and the regex is the one thing about that file this script needs. What
 * catches it going stale is the check it is used for — a hash this cannot parse
 * fails the run rather than passing it.
 */
export function parseViewHash(hash) {
  const match = /^#(\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/.exec(hash ?? '');
  if (!match) return null;
  const [zoom, lat, lon] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return [zoom, lat, lon].every(Number.isFinite) ? { zoom, lat, lon } : null;
}

/**
 * Is the camera the app settled on the one it was asked for?
 *
 * The tolerances are the precision the hash is written at and nothing finer:
 * five places of degrees is about a metre, and two of zoom is under a pixel of
 * scale. This is not a taste judgement about the view — it is the difference
 * between the requested camera and Eater's fallback, which fits the whole of
 * London into the window and at this viewport lands around zoom 8.
 */
export function cameraMatches(asked, got, tolerance = SLAB.capture.cameraTolerance) {
  if (!got) return false;
  return (
    Math.abs(got.zoom - asked.zoom) <= tolerance.zoom &&
    Math.abs(got.lat - asked.lat) <= tolerance.degrees &&
    Math.abs(got.lon - asked.lon) <= tolerance.degrees
  );
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

/** Vite announces its URL in colour, and the port arrives wrapped in escapes. */
const ANSI = /\u001b\[[0-9;]*m/g;

/**
 * Eater's own dev server, started from the checkout's installed vite.
 *
 * `node node_modules/vite/bin/vite.js` rather than `pnpm dev`: one process to
 * kill rather than a shell holding one, and the entry point's absence is
 * already the named precondition for "the dependencies are not installed".
 */
async function startEater(checkout, timeoutMs) {
  const child = spawn(process.execPath, [join(checkout, needPath('vite')), 'dev', '--host', '127.0.0.1'], {
    cwd: checkout,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // The tail of what vite has said, bounded: the run is minutes long and this is
  // only ever read to explain a failure, so the last few thousand characters are
  // the useful ones and the rest is a slow leak.
  let said = '';
  const remember = (chunk) => {
    said = (said + String(chunk).replace(ANSI, '')).slice(-4000);
  };

  try {
    const origin = await new Promise((ok, no) => {
      const timer = setTimeout(
        () =>
          no(
            new Refusal(
              `Eater's dev server never announced a URL in ${Math.round(timeoutMs / 1000)}s. It said:\n      ${said.trim().split('\n').join('\n      ')}`,
            ),
          ),
        timeoutMs,
      );
      const settle = (result, error) => {
        clearTimeout(timer);
        if (error) no(error);
        else ok(result);
      };
      const look = (chunk) => {
        remember(chunk);
        const found = /(http:\/\/127\.0\.0\.1:\d+)\//.exec(said);
        if (found) settle(found[1]);
      };
      child.stdout.on('data', look);
      child.stderr.on('data', look);
      child.on('error', (error) => settle(null, new Refusal(`Eater's dev server would not start — ${error.message}`)));
      child.on('exit', (code) =>
        settle(
          null,
          new Refusal(
            `Eater's dev server exited with ${code} before it was ready. It said:\n      ${said.trim().split('\n').join('\n      ')}`,
          ),
        ),
      );
    });

    // From here on a death is not a start failure, it is a death MID-CAPTURE —
    // and without this the run does not notice: Playwright keeps driving a page
    // whose server has gone, and the refusal that lands minutes later is a
    // navigation timeout with nothing in it about vite. Recorded rather than
    // thrown, because there is nothing to throw at until the capture fails.
    const eater = { child, origin, died: null, said: () => said };
    child.removeAllListeners('exit');
    child.on('exit', (code) => {
      eater.died = `Eater's dev server exited with ${code} mid-capture. It said:\n      ${said.trim().split('\n').join('\n      ')}`;
    });
    return eater;
  } catch (error) {
    child.kill();
    throw error;
  }
}

/**
 * Stop vite, and the build workers under it.
 *
 * `child.kill()` reaches the node process and nothing below it. Vite runs an
 * esbuild service as a child of its own, and on Windows a terminated parent does
 * not take its children with it — so a plain kill leaves one behind per run,
 * silently, on the machine this is always run on. `taskkill /T` is the tree.
 */
function stopEater(eater) {
  if (!eater) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(eater.child.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  eater.child.kill();
}

/**
 * Where the Slab is pointed, and — the half that matters — WHERE THAT CAME FROM.
 *
 * Three sources, and the report names the one it used, because the whole point
 * of this script is that a Slab of the wrong place looks exactly like a Slab of
 * the right one. The precedence is the ordinary one, flag over file over
 * derivation:
 *
 *   --centre            a centre for this run
 *   --restaurant        a restaurant for this run, whatever slab.json pins
 *   slab.json centre    a centre pinned in the file
 *   slab.json restaurant  the default, derived from its coordinates
 *
 * `--centre` and `--restaurant` TOGETHER is a refusal rather than a precedence:
 * both say where to point, so one of them would be silently ignored. A pinned
 * `centre` and `--restaurant` is not that case — the flag is the later word and
 * wins, and the report says the restaurant is where the centre came from.
 */
function aim(flags, checkout) {
  if (flags.centre && flags.restaurant !== undefined) {
    throw new Refusal('--centre and --restaurant both say where to point; pass one of them.');
  }
  if (flags.centre) {
    return { centre: flags.centre, centredOn: 'a centre given on the command line' };
  }
  if (SLAB.centre && flags.restaurant === undefined) {
    return {
      centre: { lat: SLAB.centre.lat, lon: SLAB.centre.lon },
      centredOn: 'a centre pinned in slab.json',
    };
  }

  const name = flags.restaurant ?? SLAB.restaurant;
  let dataset;
  try {
    dataset = JSON.parse(readFileSync(join(checkout, needPath('dataset')), 'utf8'));
  } catch (error) {
    throw new Refusal(`the Eater dataset would not read — ${error.message}`);
  }
  const found = findRestaurant(dataset.restaurants ?? [], name);
  if (!Number.isFinite(Number(found.lat)) || !Number.isFinite(Number(found.lon))) {
    throw new Refusal(`${found.name} has no coordinates in the Eater dataset, so nothing can be centred on it.`);
  }
  return {
    centre: { lat: Number(found.lat), lon: Number(found.lon) },
    centredOn: `${found.name} — ${found.address ?? 'no address'}`,
  };
}

/**
 * Re-encode a screenshot as WebP, through the page that took it.
 *
 * Exported for the same reason the decisions above are: it is the one step of
 * this script that can be run without an Eater checkout — over a Slab that is
 * already on disk — and the day this moves under `scripts/` it is the one step
 * with a seam under it. The header says why the encoder is a canvas.
 *
 * @param {import('playwright').Page} page
 * @param {Buffer} png     the bytes the screenshot handed over
 * @param {number} quality 0..1, slab.json's `encode.quality`
 * @returns {Promise<Buffer>}
 */
export async function toWebp(page, png, quality) {
  // Base64 in both directions, because playwright serialises an argument as JSON:
  // a megabyte handed over as an array of numbers is a megabyte written out as a
  // million decimal literals, and the same on the way back.
  const encoded = await page.evaluate(
    async ({ base64, quality }) => {
      const binary = atob(base64);
      const source = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) source[i] = binary.charCodeAt(i);

      const bitmap = await createImageBitmap(new Blob([source], { type: 'image/png' }));
      // `OffscreenCanvas` and not a `<canvas>` in the document: the picture is
      // twice the width of the page it is being encoded in, so a real canvas
      // would be laid out, scrolled and composited for nothing.
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const paint = canvas.getContext('2d');
      if (!paint) throw new Error('no 2d context to encode through');
      paint.drawImage(bitmap, 0, 0);

      const blob = await canvas.convertToBlob({ type: 'image/webp', quality });
      // A browser that cannot encode WebP answers with a PNG and NO ERROR, which
      // would put a megabyte of PNG on disk under a .webp name. Ask the blob what
      // it actually is rather than trusting the request.
      if (blob.type !== 'image/webp') throw new Error(`the canvas encoded ${blob.type} rather than image/webp`);

      const out = new Uint8Array(await blob.arrayBuffer());
      let text = '';
      for (const byte of out) text += String.fromCharCode(byte);
      return btoa(text);
    },
    { base64: png.toString('base64'), quality },
  );
  return Buffer.from(encoded, 'base64');
}

/** The stamp src/sections/eater-map/slab.ts carries, so a re-capture is visible
 *  through a deployment that caches /portfolio/img/. Eight hex digits, the same
 *  length and the same job as the recording's in the Projects Panel. */
export function stamp(bytes) {
  return createHash('sha256').update(bytes).digest('hex').slice(0, 8);
}

/**
 * The re-theme, as the report says it before a browser is started.
 *
 * The plan is printed rather than summarised because the whole claim being made
 * is "the Slab you are about to get is this one" — a run that says only "re-themed"
 * is a run whose reader still has to open slab.json to know what they got.
 *
 * @param {ReturnType<typeof planRetheme>} plan
 * @param {string} checkout
 * @returns {string[]}
 */
function rethemeReport(plan, checkout) {
  if (plan.length === 0) return ['slab: no re-theme declared — Eater\'s own modules, unmodified'];
  const width = Math.max(...plan.map((one) => one.id.length));
  return [
    `slab: re-themed in flight; nothing in ${checkout} is edited`,
    ...plan.map((one) => `slab:   ${one.id.padEnd(width)}  ${one.value}  (x${one.expect}, ${one.is})`),
  ];
}

async function capture({ origin, asked, output, plan }) {
  let browser;
  try {
    browser = await chromium.launch();
  } catch (error) {
    throw new Refusal(
      `Chromium will not start — ${String(error?.message ?? error).split('\n')[0]}\n` +
        '\n      If this is a fresh clone, the browser has not been downloaded yet:\n' +
        '          pnpm exec playwright install chromium',
    );
  }

  try {
    const context = await browser.newContext({
      viewport: { width: SLAB.viewport.width, height: SLAB.viewport.height },
      deviceScaleFactor: SLAB.viewport.deviceScaleFactor,
      isMobile: true,
      hasTouch: true,
    });
    // See the header: this is what makes Eater reach for the bundled basemap
    // rather than an API key that only answers to chrisj.uk.
    await context.addInitScript(() => {
      Object.defineProperty(window.navigator, 'onLine', { get: () => false, configurable: true });
    });

    // ---- the re-theme, on the way to the browser ---------------------------
    // One route per module the plan claims, rather than one over everything:
    // an empty plan then routes NOTHING, so the reversal in slab.json is a run
    // in which Playwright never stands between vite and the page at all.
    /** @type {import('./retheme.mjs').Served[]} */
    const served = [];
    /** @type {string[]} */
    const unfetchable = [];
    for (const source of new Set(plan.map((one) => one.module.source))) {
      await context.route(new RegExp(source), async (route) => {
        const url = route.request().url();
        let response;
        try {
          response = await route.fetch();
        } catch (error) {
          // Recorded rather than thrown: this runs on Playwright's own thread,
          // and a throw here is swallowed into a hung request. What it becomes
          // downstream is the audit's "never served", which is the truth but
          // not the cause, so the cause is carried out alongside it.
          unfetchable.push(`could not fetch ${url} — ${String(error?.message ?? error).split('\n')[0]}`);
          return route.abort();
        }
        const { source: rewritten, found } = rewriteModule(url, await response.text(), plan);
        served.push({ url, found });
        await route.fulfill({ response, body: rewritten });
      });
    }

    const page = await context.newPage();
    const thrown = [];
    page.on('pageerror', (error) => thrown.push(String(error).split('\n')[0]));

    await page.goto(`${origin}/${viewHash(asked.zoom, asked.lat, asked.lon)}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(SLAB.capture.settleMs);

    // A module the re-theme could not fetch is ABORTED above, so the app then
    // throws about a module it could not import — which is true, and is the
    // symptom rather than the cause. Reported first for that reason.
    if (unfetchable.length > 0) {
      throw new Refusal(
        `the re-theme could not read a module it had claimed, so Eater was served nothing for it:\n      ${unfetchable.join('\n      ')}`,
      );
    }

    if (thrown.length > 0) {
      throw new Refusal(`Eater threw while loading, so this would be a still of a broken app:\n      ${thrown.join('\n      ')}`);
    }

    // ---- did the re-theme actually happen? ---------------------------------
    // Before the interface, the camera and the stability, because every one of
    // those would PASS: a rewrite that missed leaves a perfectly clean,
    // perfectly aimed, perfectly still LIGHT map, and that is indistinguishable
    // from the right one until somebody opens the file.
    const missed = auditRetheme(plan, served);
    if (missed.length > 0) {
      throw new Refusal(
        `the re-theme did not take, so this would be the un-re-themed Slab:\n      ${missed.join('\n      ')}\n` +
          "\n      retheme in slab.json no longer matches Eater's source.",
      );
    }

    // The stylesheet goes in AFTER the app has mounted. Svelte's dev server
    // injects component styles into <head> as it hydrates, and a <style> put
    // there beforehand does not reliably survive that; the body always does.
    await page.evaluate((css) => {
      const style = document.createElement('style');
      style.id = 'slab-strip';
      style.textContent = css;
      document.body.append(style);
    }, SLAB.capture.strip.join('\n'));

    // ---- did MapLibre actually draw a map? ---------------------------------
    const drew = await page.evaluate((container) => {
      const found = document.querySelectorAll(container);
      const section = found[0];
      if (!section) return { containers: 0 };
      const canvas = section.querySelector('canvas.maplibregl-canvas');
      return { containers: found.length, canvas: canvas ? { width: canvas.width, height: canvas.height } : null };
    }, SLAB.capture.container);

    if (drew.containers === 0) {
      throw new Refusal(`Eater has no ${SLAB.capture.container} on the page — capture.container in slab.json is out of date.`);
    }
    // The checks below read the FIRST match and the screenshot is taken through
    // a strict locator, so two of them would be checked and photographed apart.
    // Saying so beats Playwright's strict-mode error at the last step.
    if (drew.containers > 1) {
      throw new Refusal(
        `${drew.containers} elements match ${SLAB.capture.container} — capture.container in slab.json no longer names one thing.`,
      );
    }
    if (!drew.canvas || drew.canvas.width === 0 || drew.canvas.height === 0) {
      throw new Refusal("MapLibre never put a canvas on the page, so there is no map to capture.");
    }

    // ---- is the interface gone? --------------------------------------------
    const left = await page.evaluate(
      ({ container, keep }) => {
        const section = document.querySelector(container);
        const kept = keep.map((selector) => document.querySelector(selector)).filter(Boolean);
        const showing = [];
        for (const element of document.querySelectorAll('body *')) {
          // The container and everything it hangs from are structure, not
          // interface: they are what the Slab is cut out of.
          if (element === section || element.contains(section)) continue;
          if (kept.some((one) => one === element || one.contains(element))) continue;
          if (element.getClientRects().length === 0) continue;
          const tag = element.tagName.toLowerCase();
          const first = typeof element.className === 'string' ? element.className.trim().split(/\s+/)[0] : '';
          showing.push(first ? `${tag}.${first}` : tag);
        }
        return [...new Set(showing)];
      },
      { container: SLAB.capture.container, keep: SLAB.capture.keep },
    );

    if (left.length > 0) {
      throw new Refusal(
        `${left.length} thing(s) are still drawn over the map, so this would not be a clean Slab:\n` +
          `      ${left.join('\n      ')}\n` +
          "\n      capture.strip in slab.json no longer covers Eater's interface.",
      );
    }

    // ---- is it pointing where it was asked to? -----------------------------
    const hash = new URL(page.url()).hash;
    const got = parseViewHash(hash);
    if (!cameraMatches(asked, got)) {
      throw new Refusal(
        `Eater is not pointing where it was asked to. Asked for ${viewHash(asked.zoom, asked.lat, asked.lon)}, ` +
          `settled on ${got ? viewHash(got.zoom, got.lat, got.lon) : hash || '(no camera in the URL)'}.` +
          '\n      Its deep-link format has moved, and the Slab would be of somewhere else.',
      );
    }

    // ---- hold still ---------------------------------------------------------
    const slab = page.locator(SLAB.capture.container);
    let previous = null;
    let stable = false;
    for (let probe = 0; probe < SLAB.capture.stableProbes; probe += 1) {
      const shot = await slab.screenshot();
      if (previous && shot.equals(previous)) {
        previous = shot;
        stable = true;
        break;
      }
      previous = shot;
      await page.waitForTimeout(SLAB.capture.stableGapMs);
    }
    if (!stable) {
      throw new Refusal(
        `the map was still moving after ${SLAB.capture.stableProbes} probes — a still of it would be a half-drawn frame.`,
      );
    }

    const box = await slab.boundingBox();
    if (!box) throw new Refusal(`${SLAB.capture.container} has no box on the page, so there is nothing to cut a Slab out of.`);
    const written = await toWebp(page, previous, SLAB.encode.quality);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, written);
    return {
      bytes: written.length,
      shot: previous.length,
      stamp: stamp(written),
      retheme: served,
      width: Math.round(box.width * SLAB.viewport.deviceScaleFactor),
      height: Math.round(box.height * SLAB.viewport.deviceScaleFactor),
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

async function main() {
  let flags;
  try {
    flags = parseArgs(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof Refusal)) throw error;
    return die(error.message, USAGE.trim().split('\n'));
  }
  if (flags.help) return console.log(USAGE);

  const checkout = resolveCheckout({
    flag: flags.checkout,
    env: process.env.EATER_CHECKOUT,
    configured: SLAB.eater.checkout,
    beside: mainCheckoutParent(REPO),
    from: REPO,
  });

  const missing = SLAB.eater.needs.filter((need) => {
    try {
      statSync(join(checkout, need.path));
      return false;
    } catch {
      return true;
    }
  });
  if (missing.length > 0) {
    return die(`the Eater checkout at ${checkout} is not one this can drive.`, [
      ...missing.flatMap((need) => [`missing  ${need.path}`, `         that is ${need.is} — ${need.fix}`]),
      '',
      'Somewhere else? Set EATER_CHECKOUT, or pass --checkout <path>.',
    ]);
  }

  let asked;
  let centredOn;
  try {
    const aimed = aim(flags, checkout);
    asked = { zoom: flags.zoom ?? SLAB.zoom, lat: aimed.centre.lat, lon: aimed.centre.lon };
    centredOn = aimed.centredOn;
  } catch (error) {
    if (!(error instanceof Refusal)) throw error;
    return die(error.message);
  }

  const wanted = flags.output ?? SLAB.output;
  // A Slab is WebP now whatever it is called, so `--out slab.png` would write a
  // WebP under a name that says PNG — and a file lying about its own format is
  // one that opens fine everywhere and 404s the day something believes the
  // extension. Refused rather than silently corrected: the author asked for a
  // name, and picking a different one for them is the quiet kind of wrong this
  // script is written against.
  if (!/\.webp$/i.test(wanted)) {
    return die(
      `--out ${wanted} does not end in .webp, and the Slab is written as WebP.\n` +
        '      README.md, "The format", says why.',
    );
  }
  const output = isAbsolute(wanted) ? wanted : join(REPO, wanted);

  // Planned before the dev server is started, so a declaration that cannot be
  // pasted into a module refuses in a second rather than three minutes in.
  let plan;
  try {
    plan = planRetheme(SLAB.retheme);
  } catch (error) {
    return die(error.message);
  }

  console.log(`slab: ${centredOn}`);
  console.log(`slab: ${asked.lat.toFixed(5)}, ${asked.lon.toFixed(5)} at zoom ${asked.zoom}`);
  console.log(`slab: ${SLAB.viewport.width}x${SLAB.viewport.height} at ${SLAB.viewport.deviceScaleFactor}x`);
  console.log(`slab: driving ${checkout}`);
  for (const line of rethemeReport(plan, checkout)) console.log(line);

  // die() exits the process, and an exit does not run a finally - so a refusal
  // is carried OUT of the block that owns the dev server rather than announced
  // inside it. Announcing it there leaves Eater's vite running.
  let eater = null;
  let refusal = null;
  try {
    eater = await startEater(checkout, SLAB.eater.readyTimeoutMs);
    console.log(`slab: Eater on ${eater.origin}\n`);
    const written = await capture({ origin: eater.origin, asked, output, plan });
    console.log(`slab: ${output}`);
    console.log(
      `slab: ${written.width}x${written.height} px, ${(written.bytes / 1024).toFixed(0)} KB webp ` +
        `(from ${(written.shot / 1024).toFixed(0)} KB png)`,
    );
    if (plan.length > 0) {
      const made = written.retheme.reduce((sum, one) => sum + one.found.reduce((n, got) => n + got.count, 0), 0);
      console.log(
        `slab: re-theme held — ${made} substitution(s) over ${written.retheme.length} module fetch(es), ` +
          'every count as declared',
      );
    }
    // The size is the OTHER number slab.ts carries, and the size line above is
    // easy to read as information rather than as an instruction. It rarely
    // moves, which is exactly why it is the one that gets left behind when it
    // does — and a wrong `pixels` is an intrinsic ratio that fights the layout.
    console.log(
      `slab: pixels ${written.width}x${written.height} — the other number in src/sections/eater-map/slab.ts`,
    );
    // The last line is the one that has to be acted on, so it says what to do
    // with it rather than printing a digest and leaving the reader to work it
    // out. /portfolio/img/ is cached by the deployment, so a Slab whose stamp did
    // not move is a Slab nobody is served.
    console.log(`slab: stamp ${written.stamp} — put it in VERSION in src/sections/eater-map/slab.ts\n`);
  } catch (error) {
    // A server that died mid-capture is the CAUSE of whatever the browser then
    // complained about, so it is the thing to report rather than the timeout it
    // produced downstream.
    refusal = eater?.died ?? (error instanceof Refusal ? error.message : String(error?.stack ?? error));
  } finally {
    stopEater(eater);
  }
  if (refusal) die(refusal);
}

// The guard is so the decisions above can be imported without driving anything.
// The catch is not decoration: main() re-raises anything that is not a Refusal,
// and without it those land as a bare stack trace with no `slab:` on them.
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  await main().catch((error) => die(String(error?.stack ?? error)));
}
