#!/usr/bin/env node
/* ============================================================================
   capture-slab.mjs — the Eater Map Showcase's Slab: one still of the Eater map
   over central London, with the rail network drawn on it and none of the app's
   interface on top.

     node design/eater-slab/capture-slab.mjs
     node design/eater-slab/capture-slab.mjs --restaurant "St. John"
     node design/eater-slab/capture-slab.mjs --centre 51.51340,-0.13125 --zoom 16
     node design/eater-slab/capture-slab.mjs --out portfolio/img/eater/slab-alt.png

   EVERY NUMBER IS IN slab.json AND NOT IN HERE. That is the point of the pair:
   changing the project's example is changing one field and running the command
   again, which is what makes this a script rather than a committed picture.
   README.md beside it says what each field is for.

   WHY A SCRIPT AND NOT A BAKE
   ---------------------------
   A Bake's cost over a script is the Editor plumbing, and the author has said
   they do not need to re-capture without an agent (#173). Promoting it later is
   moving this folder under design/bake/ and adding a recipe.json — nothing here
   forecloses it, which is why the parameters are already declared as data.

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
   to is the whole of London at zoom 11, which is a perfectly ordinary-looking
   picture of the wrong thing. Eater writes the camera it settled on back into
   the URL, so reading the hash afterwards is the app's own account of where it
   is pointing.

   The restaurant markers stay. They are Eater's data drawn into the map rather
   than interface laid over it, and a transit map with no restaurants on it is
   not the Eater map.
   ========================================================================== */

import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

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

export function parseZoom(text) {
  const zoom = Number(text);
  // Eater's own floor offline is 4 and its ceiling is 18; outside that the app
  // silently clamps and the Slab is not the one that was asked for.
  if (!Number.isFinite(zoom) || zoom < 4 || zoom > 18) {
    throw new Refusal(`--zoom wants a number between 4 and 18, not ${JSON.stringify(text)}`);
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
export function cameraMatches(asked, got) {
  if (!got) return false;
  return (
    Math.abs(got.zoom - asked.zoom) <= 0.01 &&
    Math.abs(got.lat - asked.lat) <= 0.0001 &&
    Math.abs(got.lon - asked.lon) <= 0.0001
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
  const child = spawn(
    process.execPath,
    [join(checkout, 'node_modules', 'vite', 'bin', 'vite.js'), 'dev', '--host', '127.0.0.1'],
    { cwd: checkout, stdio: ['ignore', 'pipe', 'pipe'] },
  );

  let said = '';
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
        said += String(chunk).replace(ANSI, '');
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
    child.removeAllListeners('exit');
    return { child, origin };
  } catch (error) {
    child.kill();
    throw error;
  }
}

/**
 * Where the Slab is pointed, and what to call that in the report.
 *
 * An explicit centre wins over a derived one, which is what `--centre` is for —
 * but naming a restaurant AND a centre is a refusal rather than a precedence,
 * because one of the two is then being ignored and the report would say so in
 * one line nobody reads.
 */
function aim(flags, checkout) {
  if (flags.centre && flags.restaurant !== undefined) {
    throw new Refusal('--centre and --restaurant both say where to point; pass one of them.');
  }
  const explicit = flags.centre ?? (SLAB.centre ? { lat: SLAB.centre.lat, lon: SLAB.centre.lon } : null);
  if (explicit) return { centre: explicit, centredOn: 'a centre given on the command line' };

  const name = flags.restaurant ?? SLAB.restaurant;
  let dataset;
  try {
    dataset = JSON.parse(readFileSync(join(checkout, 'static', 'data', 'restaurants.json'), 'utf8'));
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

async function capture({ origin, asked, output }) {
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

    const page = await context.newPage();
    const thrown = [];
    page.on('pageerror', (error) => thrown.push(String(error).split('\n')[0]));

    await page.goto(`${origin}/${viewHash(asked.zoom, asked.lat, asked.lon)}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(SLAB.capture.settleMs);

    if (thrown.length > 0) {
      throw new Refusal(`Eater threw while loading, so this would be a still of a broken app:\n      ${thrown.join('\n      ')}`);
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
      const section = document.querySelector(container);
      if (!section) return { container: false };
      const canvas = section.querySelector('canvas.maplibregl-canvas');
      return { container: true, canvas: canvas ? { width: canvas.width, height: canvas.height } : null };
    }, SLAB.capture.container);

    if (!drew.container) {
      throw new Refusal(`Eater has no ${SLAB.capture.container} on the page — capture.container in slab.json is out of date.`);
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
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, previous);
    return {
      bytes: previous.length,
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
  const output = isAbsolute(wanted) ? wanted : join(REPO, wanted);

  console.log(`slab: ${centredOn}`);
  console.log(`slab: ${asked.lat.toFixed(5)}, ${asked.lon.toFixed(5)} at zoom ${asked.zoom}`);
  console.log(`slab: ${SLAB.viewport.width}x${SLAB.viewport.height} at ${SLAB.viewport.deviceScaleFactor}x`);
  console.log(`slab: driving ${checkout}`);

  // die() exits the process, and an exit does not run a finally - so a refusal
  // is carried OUT of the block that owns the dev server rather than announced
  // inside it. Announcing it there leaves Eater's vite running.
  let eater = null;
  let refusal = null;
  try {
    eater = await startEater(checkout, SLAB.eater.readyTimeoutMs);
    console.log(`slab: Eater on ${eater.origin}\n`);
    const written = await capture({ origin: eater.origin, asked, output });
    console.log(`slab: ${output}`);
    console.log(`slab: ${written.width}x${written.height} px, ${(written.bytes / 1024).toFixed(0)} KB\n`);
  } catch (error) {
    refusal = error instanceof Refusal ? error.message : String(error?.stack ?? error);
  } finally {
    eater?.child.kill();
  }
  if (refusal) die(refusal);
}

// The guard is so the decisions above can be imported without driving anything.
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  await main();
}
