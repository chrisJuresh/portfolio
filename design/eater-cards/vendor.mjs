#!/usr/bin/env node
/* ============================================================================
   vendor.mjs — the Eater app's three Cards, taken from the app and committed here.

     node design/eater-cards/vendor.mjs            # regenerate and report
     node design/eater-cards/vendor.mjs --write    # …and take the difference
     node design/eater-cards/vendor.mjs --check    # is the copy stale? (no browser)
     node design/eater-cards/vendor.mjs --restaurant "St. John"

   The Cards are the Eater app's own search bar, rail-lines popup and restaurant
   detail panel (CONTEXT.md). They are drawn by the Portfolio rather than
   photographed, which is what keeps their text real — but they are not REDRAWN:
   this asks the app for them.

   WHY THE OUTPUT IS COMMITTED RATHER THAN FETCHED AT BUILD TIME. `pnpm build` is
   this repository's gate, and a gate that only closes when a sibling checkout
   happens to be on disk is not one. Everything else in this tree that came from
   somewhere else is committed bytes for the same reason.

   WHAT THE STAMP IS FOR. cards.json carries the Eater commit the Cards were
   generated from. When the app's interface moves, this says so — `--check`
   compares the stamp against that checkout's HEAD, and a plain run regenerates
   and REPORTS the difference rather than taking it, so a change to somebody
   else's repository cannot land here by being run past. `--write` is how the
   difference is accepted. Same job the recording's content digest does in the
   Projects Panel.

   WHERE THE OUTPUT LANDS. `src/sections/eater-map/assets/cards/`, because
   check-source.mjs enforces that a Section may import from its own folder and
   from the Kernel and nowhere else — so anywhere under design/ would be a place
   the Section is not allowed to read.

   THE PARAMETERS ARE IN config.json and nowhere else, the /export route's own
   defaults included: that route has a fallback restaurant so it shows something
   when it is opened by hand, and this passes every parameter explicitly so the
   two cannot drift into disagreeing about what was vendored.
   ========================================================================== */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MANIFEST, files, report, staleness } from './compare.mjs';
import { auditRowCap, capModule, planRowCap, rowCapReport } from './rows.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]+$/, '');
const ROOT = resolve(HERE, '..', '..');

function fail(message, ...rest) {
  console.error(`error: ${message}`);
  for (const line of rest) console.error(`  ${line}`);
  process.exit(1);
}

/* ---- arguments ----------------------------------------------------------- */

const argv = process.argv.slice(2);
function option(name) {
  const at = argv.indexOf(`--${name}`);
  if (at === -1) return undefined;
  const value = argv[at + 1];
  if (value === undefined || value.startsWith('--')) fail(`--${name} takes a value`);
  return value;
}
const WRITE = argv.includes('--write');
const CHECK_ONLY = argv.includes('--check');

const config = JSON.parse(readFileSync(join(HERE, 'config.json'), 'utf8'));
const RESTAURANT = option('restaurant') ?? config.restaurant;
const QUERY = option('query') ?? config.query;
const OUT = join(ROOT, config.out);

/* ---- the Eater checkout -------------------------------------------------- */

/**
 * Where the app is.
 *
 * Two candidates and both are reported when neither answers, because the one
 * that works depends on where this is run from: a session in the main checkout
 * has the sibling directory beside it, and a session in a worktree does not —
 * `.claude/worktrees/<name>/../eater` is not anything. So the main checkout is
 * asked for as well, through the git directory every worktree of this repository
 * shares.
 */
function eaterRoot() {
  const named = process.env[config.eater.env];
  if (named) {
    const at = resolve(named);
    if (!existsSync(at)) {
      fail(`${config.eater.env} is set to "${named}", and there is nothing there.`);
    }
    return at;
  }

  const candidates = [resolve(ROOT, '..', config.eater.sibling)];
  const common = spawnSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (common.status === 0) {
    const mainCheckout = resolve(common.stdout.trim(), '..');
    candidates.push(resolve(mainCheckout, '..', config.eater.sibling));
  }

  for (const candidate of new Set(candidates)) if (existsSync(candidate)) return candidate;
  fail(
    `the ${config.eater.repo} checkout is not where this looked for it.`,
    ...[...new Set(candidates)].map((one) => `tried  ${one}`),
    '',
    `Set ${config.eater.env} to the checkout, or clone it beside this repository:`,
    `  git clone https://github.com/${config.eater.repo}.git`,
  );
}

/** That it is the right checkout, and that it can actually be run. A generator
 *  that quietly produces nothing looks exactly like one that succeeded. */
function verify(eater) {
  const manifest = join(eater, 'package.json');
  if (!existsSync(manifest)) fail(`${eater} is not a checkout of ${config.eater.repo} — no package.json.`);
  const name = JSON.parse(readFileSync(manifest, 'utf8')).name;
  if (name !== config.eater.package) {
    fail(`${eater} is a checkout of "${name}", not ${config.eater.package}.`);
  }
  if (!existsSync(join(eater, 'node_modules', 'vite'))) {
    fail(`${eater} has no installed dependencies.`, `  cd ${eater} && pnpm install`);
  }
  if (!existsSync(join(eater, 'static', 'data', 'restaurants.json'))) {
    fail(
      `${eater} has no restaurant dataset at static/data/restaurants.json.`,
      'The Cards are rendered for a real restaurant, so the app needs its data.',
      `  cd ${eater} && pnpm fetch:data      (needs DATA_REPO_TOKEN)`,
    );
  }
}

function git(eater, ...args) {
  const run = spawnSync('git', args, { cwd: eater, encoding: 'utf8' });
  if (run.status !== 0) fail(`git ${args.join(' ')} failed in ${eater}`, (run.stderr || '').trim());
  return run.stdout.trim();
}

/* ---- staleness ----------------------------------------------------------- */

async function vendored() {
  try {
    return JSON.parse(await readFile(join(OUT, MANIFEST), 'utf8'));
  } catch {
    return null;
  }
}

/** What changed between the vendored commit and HEAD, under the paths a Card can
 *  be made of. Null when that commit is not in this checkout — unfetched, or
 *  rewritten — because then there is nothing to compare against. */
function changedSince(eater, commit) {
  const known = spawnSync('git', ['cat-file', '-e', `${commit}^{commit}`], { cwd: eater });
  if (known.status !== 0) return null;
  const changed = git(eater, 'diff', '--name-only', `${commit}..HEAD`, '--', ...config.eater.surfaces);
  return changed ? changed.split('\n') : [];
}

async function checkOnly(eater) {
  const held = await vendored();
  if (!held) {
    console.error(`eater-cards: nothing is vendored at ${config.out}.`);
    process.exit(1);
  }
  const head = git(eater, 'rev-parse', 'HEAD');
  const subject = git(eater, 'log', '-1', '--format=%s');
  const changed = changedSince(eater, held.eater.commit);
  const moved =
    `  vendored from  ${held.eater.commit.slice(0, 8)}  ${held.eater.subject}\n` +
    `  ${config.eater.repo} is now  ${head.slice(0, 8)}  ${subject}\n`;

  switch (staleness({ vendored: held.eater.commit, head, changed })) {
    case 'current':
      console.log(`eater-cards: current — ${config.eater.repo} @ ${head.slice(0, 8)} (${held.eater.subject})`);
      return;

    case 'stamp-behind':
      // The app has moved and nothing a Card is made of has, so the Cards cannot
      // be showing an interface that no longer exists — which is the only
      // question this mode is asked. Exit 0: a check that failed here would fail
      // on every commit to that repository's README, and one that fails for
      // nothing is one that gets run with `|| true` in front of it.
      console.log(
        `eater-cards: current — nothing under ${config.eater.surfaces.join(', ')} has changed.\n` +
          moved +
          '  Only the stamp is behind, which a regeneration would refresh.',
      );
      return;

    case 'unknown':
      console.error(
        `eater-cards: cannot tell.\n` +
          moved +
          `\n  ${held.eater.commit.slice(0, 8)} is not in that checkout, so there is nothing to\n` +
          '  compare against. Fetch it, or regenerate:\n' +
          '    node design/eater-cards/vendor.mjs',
      );
      process.exit(1);

    default:
      console.error(
        `eater-cards: STALE — ${changed.length} file(s) the Cards are made of have changed.\n` +
          moved +
          `\n${changed
            .slice(0, 12)
            .map((one) => `    ${one}`)
            .join('\n')}\n` +
          (changed.length > 12 ? `    …and ${changed.length - 12} more\n` : '') +
          '\n  Regenerate to see whether any of it reached a surface:\n' +
          '    node design/eater-cards/vendor.mjs',
      );
      process.exit(1);
  }
}

/* ---- the app, running ---------------------------------------------------- */

/**
 * Wait for the app to answer on `port`, and give up the moment it cannot.
 *
 * `alive()` is what stops two bad outcomes, and the second is the one that
 * matters. `--strictPort` makes vite EXIT when something else already holds the
 * port; without watching for that, this would poll a stranger's server for a
 * full minute and then either time out — a silent minute for a failure that was
 * known in the first second — or, if that stranger answers 200, drive it and
 * export whatever it happens to serve.
 *
 * The path asked for is one only this app has, for the same reason.
 */
async function answering(port, alive, until) {
  const url = `http://127.0.0.1:${port}/manifest.webmanifest`;
  while (Date.now() < until) {
    if (!alive()) return 'gone';
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (response.ok && (await response.text()).includes('Eater')) return 'up';
      if (response.ok) return 'stranger';
    } catch {
      // not up yet
    }
    await new Promise((settle) => setTimeout(settle, 300));
  }
  return 'timeout';
}

/**
 * Start the app's dev server and hand back how to stop it.
 *
 * `node …/vite.js` rather than a package manager: a spawned `pnpm` on Windows is
 * a shell wrapper around the process that actually holds the port, so killing
 * the child leaves the server running and the next run fails on --strictPort
 * with nothing to point at.
 */
async function serve(eater, port) {
  const child = spawn(process.execPath, [join(eater, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: eater,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  let running = true;
  child.stdout.on('data', (chunk) => (log += chunk));
  child.stderr.on('data', (chunk) => (log += chunk));
  child.on('exit', (code) => {
    running = false;
    log += `\n(vite exited with ${code})`;
  });
  // Without this, a spawn that cannot start — no node, a path that moved —
  // throws an unhandled 'error' out of an event loop nothing is watching.
  child.on('error', (error) => {
    running = false;
    log += `\n(vite could not start: ${error.message})`;
  });

  const stop = () => {
    try {
      child.kill();
    } catch {
      // already gone
    }
  };

  const said = {
    gone: `the app's dev server stopped before it answered on 127.0.0.1:${port}.`,
    stranger: `something that is not ${config.eater.repo} is already serving 127.0.0.1:${port}.`,
    timeout: `the app's dev server did not come up on 127.0.0.1:${port} within a minute.`,
  };
  const verdict = await answering(port, () => running, Date.now() + 60_000);
  if (verdict !== 'up') {
    stop();
    fail(said[verdict], ...log.trim().split('\n'));
  }
  return stop;
}

/* ---- the fourth surface, off the running app ----------------------------- */

/**
 * The search results dropdown, which `/export` does not declare.
 *
 * WHY THIS IS A SECOND STAGE AND NOT A FOURTH NAME IN THE HARNESS. The export
 * route over there declares `['search', 'lines', 'details']`, and the Showcase
 * wants what SEARCHING PRODUCES as well as the bar it is typed into (#194).
 * Adding a fourth surface to that harness is a change in the other repository
 * and is a decision rather than a detail, so until it is taken this drives the
 * REAL APP instead and hands the app's own collector a fourth root. The markup
 * and the stylesheet therefore come out through the same code path the other
 * three did, which is what keeps re-vendoring honest, and nothing in the Eater
 * checkout is edited.
 *
 * THE ROW CAP IS REWRITTEN IN FLIGHT AND ASSERTED, which is the same discipline
 * #188 puts on the dark Slab and is here for the same reason: the panel's height
 * is `rows x 56px` off one constant, and a four-row card on disk looks exactly
 * like a two-row one. `rows.mjs` is the decision; this is the socket under it.
 *
 * @param {import('playwright').Browser} browser
 * @param {number} port
 * @param {import('./rows.mjs').RowCap} plan
 * @param {any} config
 */
async function results(browser, port, plan, config) {
  const asked = config.results;
  const refuse = (...lines) => {
    throw new Error(lines.join('\n'));
  };

  const context = await browser.newContext({ viewport: config.viewport });
  /** @type {import('./rows.mjs').Served[]} */
  const served = [];
  /** @type {string[]} */
  const unfetchable = [];
  // One route, over the module the cap claims and nothing else — so a run with
  // no `results` block never stands between vite and the page at all.
  await context.route(new RegExp(plan.module.source), async (route) => {
    const url = route.request().url();
    let response;
    try {
      response = await route.fetch();
    } catch (error) {
      // Recorded rather than thrown: this runs on Playwright's own thread, and a
      // throw here is swallowed into a hung request. What it becomes downstream
      // is the audit's "never served", which is true but is the symptom rather
      // than the cause, so the cause is carried out beside it.
      unfetchable.push(`could not fetch ${url} — ${String(error?.message ?? error).split('\n')[0]}`);
      return route.abort();
    }
    const { source, count } = capModule(url, await response.text(), plan);
    served.push({ url, count });
    await route.fulfill({ response, body: source });
  });

  try {
    const page = await context.newPage();
    /** @type {string[]} */
    const thrown = [];
    page.on('pageerror', (error) => thrown.push(String(error).split('\n')[0]));

    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
    const field = page.locator(asked.field).first();
    try {
      await field.waitFor({ timeout: 60_000 });
    } catch {
      refuse(
        `the app's search field (${asked.field}) never appeared, so there was nothing to type into.`,
        ...thrown.map((one) => `  the app threw: ${one}`),
      );
    }
    await field.click();
    await field.fill(asked.query);
    try {
      await page.waitForSelector(asked.shell, { timeout: 30_000 });
    } catch {
      refuse(
        `"${asked.query}" produced no ${asked.shell} in the app, so there is no dropdown to take.`,
        'Either the dataset has moved under the query or the component has been renamed;',
        'results.query and results.shell in config.json are where both are said.',
      );
    }
    await page.waitForTimeout(asked.settleMs);

    // A module the cap could not fetch is ABORTED above, so the app then throws
    // about an import it could not resolve — which is true, and is the symptom.
    // Reported first for that reason.
    if (unfetchable.length > 0) {
      refuse('the row cap could not read a module it had claimed, so Eater was served nothing for it:', ...unfetchable);
    }

    // BEFORE the collector, and that order is the whole point: a cap that missed
    // collects perfectly — the right component, of the right restaurants, at the
    // wrong height — and every check after this one would pass.
    const missed = auditRowCap(plan, served);
    if (missed.length > 0) {
      refuse(
        "the row cap did not take, so this would be the app's own uncapped panel:",
        ...missed.map((one) => `  ${one}`),
        '',
        "  results.cap in config.json no longer matches Eater's source.",
      );
    }

    const got = await page.evaluate(
      async ({ shell, row }) => {
        // The app's OWN collector, imported out of the running dev server rather
        // than reimplemented here — the same module `/export` calls, so the
        // fourth surface is emitted by the same code path as the other three.
        const { collect } = await import('/src/routes/export/collect.js');
        const root = document.querySelector(shell);
        if (!root) return null;
        const out = collect([{ name: 'results', root }], document, window);
        const card = out.cards.find((one) => one.name === 'results');
        return card ? { ...card, css: out.css, held: root.querySelectorAll(row).length } : null;
      },
      { shell: asked.shell, row: asked.row },
    );
    if (!got) {
      refuse(
        "the app's own collector produced no results card.",
        `  ${asked.shell} was on the page, so this is the collector itself or its name for the surface.`,
      );
    }
    if (thrown.length > 0) {
      refuse('the app threw while the dropdown was being taken, so this would be a card of a broken app:', ...thrown.map((one) => `  ${one}`));
    }

    console.log(
      `eater-cards: results  ${got.width}x${got.height}, ${plan.rows} row(s) shown of ${got.held} in the ` +
        "panel's own scroll",
    );
    return { name: 'results', width: got.width, height: got.height, html: got.html, css: got.css, rows: plan.rows };
  } finally {
    await context.close();
  }
}

/* ---- the files ----------------------------------------------------------- */

/** The generated files as they stand, so the report can say what moved. */
async function onDisk() {
  const out = new Map();
  if (!existsSync(OUT)) return out;
  for (const name of readdirSync(OUT)) out.set(name, await readFile(join(OUT, name), 'utf8'));
  return out;
}

/* ---- the run ------------------------------------------------------------- */

const eaterAt = eaterRoot();
verify(eaterAt);

if (CHECK_ONLY) {
  await checkOnly(eaterAt);
  process.exit(0);
}

const eater = {
  commit: git(eaterAt, 'rev-parse', 'HEAD'),
  subject: git(eaterAt, 'log', '-1', '--format=%s'),
};
const dirty = git(eaterAt, 'status', '--porcelain');
if (dirty) {
  // A stamp names a commit, so Cards taken off a working tree that is not that
  // commit are stamped with a lie. Said out loud rather than refused: generating
  // against uncommitted work is exactly what happens while the export route
  // itself is being written.
  //
  // The paths are listed rather than counted, because most of what makes that
  // checkout dirty cannot reach a Card — a note under docs/ is not the same
  // warning as an edited component, and a warning that cannot tell them apart
  // is one that gets read past.
  console.warn(
    `warning: ${eaterAt} has uncommitted changes — the Cards will be stamped ${eater.commit.slice(0, 8)},\n` +
      '         which is not what they were taken from. Commit there first if any of\n' +
      '         these can reach a surface:\n' +
      dirty
        .split('\n')
        .map((line) => `           ${line}`)
        .join('\n'),
  );
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch (error) {
  if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  fail('playwright is not installed.', 'pnpm install');
}

// Read before a browser is started, so a declaration that cannot be met is a
// refusal now rather than a minute from now, and printed so the run says which
// card it is about to take and at what cap.
const plan = planRowCap(config.results);
for (const line of rowCapReport(plan, eaterAt)) console.log(line);

const port = config.eater.port;
const stop = await serve(eaterAt, port);
let payload;
let fourth = null;
/** @type {Error | null} */
let refused = null;
const noise = [];
try {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: config.viewport });
    page.on('console', (message) => message.type() === 'error' && noise.push(message.text()));
    page.on('pageerror', (error) => noise.push(String(error)));

    const url = new URL(`http://127.0.0.1:${port}/export`);
    url.searchParams.set('restaurant', RESTAURANT);
    url.searchParams.set('offline', config.offline);
    if (QUERY !== null && QUERY !== undefined) url.searchParams.set('query', QUERY);

    await page.goto(url.href, { waitUntil: 'load' });
    try {
      await page.waitForSelector('html[data-export-ready]', { timeout: 90_000 });
    } catch {
      const said = await page.textContent('.bar').catch(() => '');
      fail(
        'the export route did not finish.',
        said ? said.trim() : 'it said nothing',
        ...noise.map((one) => `console: ${one}`),
      );
    }
    payload = await page.evaluate(() => window.__eaterCards);
    await page.close();

    // AND THE FOURTH, off the running app rather than off /export. Its refusals
    // are carried out rather than exited on, so the browser and the dev server
    // are put down before anything is printed.
    if (plan) {
      try {
        fourth = await results(browser, port, plan, config);
      } catch (error) {
        refused = error instanceof Error ? error : new Error(String(error));
      }
    }
  } finally {
    await browser.close();
  }
} finally {
  stop();
}

if (refused) fail(...String(refused.message).split('\n'));
if (noise.length) {
  fail('the app logged errors while the Cards were being taken.', ...noise);
}
if (!payload?.cards?.length) fail('the export route produced no Cards.');
if (fourth) payload.cards.push(fourth);

const after = files(payload, eater, config);
const before = await onDisk();
const { moved, surfacesMoved, lines } = report(before, after, config.eater.repo);

if (!moved.length) {
  console.log(`eater-cards: unchanged — ${config.eater.repo} @ ${eater.commit.slice(0, 8)}`);
  process.exit(0);
}

if (!WRITE) {
  const headline = surfacesMoved
    ? 'the app has moved under the vendored Cards.'
    : 'the app has moved, and the Cards have not.';
  console.error(
    `eater-cards: ${headline}\n\n${lines.join('\n')}\n\n` +
      '  Nothing was written. Look at what changed, then take it:\n' +
      '    node design/eater-cards/vendor.mjs --write',
  );
  process.exit(1);
}

await mkdir(OUT, { recursive: true });
for (const [name, text] of after) await writeFile(join(OUT, name), text);
// A Card the app no longer has leaves a file behind, and a file left in this
// folder is still importable from the Section — so the report would say
// `- lines.html` while the Section went on rendering it.
for (const name of before.keys()) if (!after.has(name)) await rm(join(OUT, name));
console.log(`eater-cards: written to ${config.out}\n\n${lines.join('\n')}`);
for (const card of payload.cards) {
  console.log(`\n  ${card.name.padEnd(8)} ${card.width}×${card.height}`);
}
