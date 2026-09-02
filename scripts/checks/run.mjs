#!/usr/bin/env node
/**
 * The Checks. One command, and it exits non-zero if any of them fails.
 *
 *   pnpm check                  build this tree, serve it, run every Check
 *   pnpm check -- --no-build    against the dist/ already there, for iterating
 *   pnpm check -- --only ground,moments
 *
 * WHAT A CHECK IS. A headless assertion about a Section that a person would not
 * notice failing. Checks BLOCK rather than report (ADR 0006), because an advisory
 * check inside an agent loop is one that gets read and stepped over — and the
 * price of blocking is that a false positive costs the author a prompt, so the
 * suite stays small and asserts only things a legitimate change cannot trip.
 *
 * NO CHECK ASSERTS THAT ANYTHING LOOKS GOOD. Taste is the author's, exercised
 * through Variants and the Editor. A Check that measured a gap, a size, a weight
 * or a colour against a number somebody chose does not belong in here — it would
 * fail the next time that number was chosen differently, which is the whole
 * activity this repository exists to make cheap. NOTES.md says more.
 *
 * IT SERVES THE TREE IT WAS INVOKED FROM. The in-app browser preview serves the
 * main checkout, so in a worktree it reports on `development` while looking like
 * it reported on the branch. Everything below builds and serves this directory.
 */

import { spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { check as across } from './checks/across.mjs';
import { check as assets } from './checks/assets.mjs';
import { check as carousel } from './checks/carousel.mjs';
import { check as consoleQuiet } from './checks/console.mjs';
import { check as crossing } from './checks/crossing.mjs';
import { check as deepLinks } from './checks/deep-links.mjs';
import { check as eaterMap } from './checks/eater-map.mjs';
import { check as editor } from './checks/editor.mjs';
import { check as faces } from './checks/faces.mjs';
import { check as frontScreen } from './checks/front-screen.mjs';
import { check as ground } from './checks/ground.mjs';
import { check as moments } from './checks/moments.mjs';
import { check as projectsPanel } from './checks/projects-panel.mjs';
import { check as rail } from './checks/rail.mjs';
import { check as turn } from './checks/turn.mjs';
import { check as unpublishable } from './checks/unpublishable.mjs';
import { serve } from './lib/serve.mjs';

/** In the order they are cheapest to read a failure from. */
const CHECKS = [
  assets,
  consoleQuiet,
  across,
  faces,
  carousel,
  frontScreen,
  projectsPanel,
  eaterMap,
  rail,
  ground,
  turn,
  crossing,
  moments,
  deepLinks,
  unpublishable,
  editor,
];

/** Wide enough for the longest name and a space. Measured rather than chosen:
 *  the padding was a literal 14, and `projects-panel` is exactly 14 characters,
 *  so its name and its title ran together with nothing between them. */
const NAME_COLUMN = Math.max(...CHECKS.map((check) => check.name.length)) + 1;

const repoRoot = fileURLToPath(new URL('../..', import.meta.url)).replace(/[\\/]+$/, '');
const dist = `${repoRoot}/dist`;

const argv = process.argv.slice(2);
const build = !argv.includes('--no-build');
const onlyArg = argv.indexOf('--only');
const only =
  onlyArg === -1 ? null : new Set((argv[onlyArg + 1] ?? '').split(',').map((name) => name.trim()));

if (only) {
  const unknown = [...only].filter((name) => !CHECKS.some((check) => check.name === name));
  if (unknown.length > 0) {
    console.error(
      `checks: no Check called ${unknown.join(', ')} — have: ${CHECKS.map((c) => c.name).join(', ')}`,
    );
    process.exit(2);
  }
}

/**
 * Which stage draws the Eater Map Section's Slab, for the whole run.
 *
 *   pnpm check -- --stage webgl
 *
 * #181's last acceptance criterion is that every Check passes with either stage
 * selected, and this is what makes that a command rather than a claim. It is a
 * property of the SUITE and not of a Check, so it is handed to `lib/page.mjs`
 * through the environment and no Check mentions it — see the note there. The
 * default is the shipped stage and the default path is untouched.
 */
const STAGES = ['dom', 'webgl'];
const stageArg = argv.indexOf('--stage');
if (stageArg !== -1) {
  const stage = argv[stageArg + 1] ?? '';
  if (!STAGES.includes(stage)) {
    console.error(`checks: --stage takes one of ${STAGES.join(', ')}, not "${stage}"`);
    process.exit(2);
  }
  process.env.PORTFOLIO_STAGE = stage;
  console.log(`checks: every page opens with the ${stage} stage selected.
`);
}

/**
 * The pure logic under `scripts/`, before the browser is started.
 *
 * Not Checks — nothing here is an assertion about a Section — but they run from
 * the same command on purpose. The denylist's patterns and the luminance bands
 * are what several Checks below decide with, and a runner that reported on the
 * page while its own matching was broken would be worse than no runner. The same
 * argument covers `scripts/feature/`: `pnpm check` is what the pre-commit hook
 * and `pnpm feature land` are, so the lifecycle's own naming, port choice and
 * teardown verification are gated by the command that gates everything else.
 */
// Outside the --no-build guard on purpose: --no-build is the iterating path, and
// iterating is exactly when the matching logic is being changed.
//
// The glob is quoted and passed through, not expanded by a shell: PowerShell does
// not expand one, and handing `--test` a bare directory makes it try to require
// the directory itself.
const tested = spawnSync(
  process.execPath,
  ['--test', '--test-reporter=dot', 'scripts/**/*.test.mjs'],
  { cwd: repoRoot, stdio: 'inherit' },
);
if (tested.status !== 0) {
  console.error("\nchecks: the runner's own unit tests fail, so no Check has been run.");
  process.exit(1);
}

if (build) {
  console.log('checks: building this tree…\n');
  const built = spawnSync('pnpm', ['build'], { cwd: repoRoot, stdio: 'inherit', shell: true });
  if (built.status !== 0) {
    console.error('\nchecks: the build failed, so nothing was checked.');
    process.exit(1);
  }
}

try {
  statSync(dist);
} catch {
  console.error(`checks: ${dist} does not exist — run without --no-build.`);
  process.exit(2);
}

const served = await serve(dist);

// `pnpm install` does not fetch a browser. Playwright's npm package carries the
// driver and not the binaries, and pnpm blocks install scripts anyway — so on a
// fresh clone `launch()` throws about an executable nobody has been told to
// download, and the whole suite fails with something that reads like a broken
// Check. Naming the one command is the difference between a diagnosis and a
// paste.
// AND IT KEEPS ITS SCROLLBARS, which is not a detail. Playwright passes
// `--hide-scrollbars` in headless by default, and a page with no scrollbar has no
// gutter — so `100vw` and the client width are equal, every full-bleed box lands
// exactly where the arithmetic says, and the whole suite measures a window nobody
// has. It cost a shipped bug: the Plinth is solved to end on the page's right edge
// and, read off `100vw`, ended 15px past it on every real browser. Twelve Checks
// passed and the marble was clipped on the author's own screen.
//
// Undoing the flag is what makes the default window a REAL one. It moves every
// horizontal measurement in the suite by the gutter, which is the point: those
// are the numbers the reader gets.
let browser;
try {
  browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
} catch (error) {
  await served.close();
  console.error(`checks: Chromium will not start.\n\n  ${String(error?.message ?? error).split('\n')[0]}\n`);
  console.error('  If this is a fresh clone, the browser has not been downloaded yet:\n');
  console.error('      pnpm exec playwright install chromium\n');
  process.exit(2);
}

console.log(`checks: serving ${dist}`);
console.log(`checks: on ${served.origin}\n`);

/** @type {{ name: string, title: string, failures: string[], notes: string[] }[]} */
const results = [];

try {
  for (const check of CHECKS) {
    if (only && !only.has(check.name)) continue;
    let outcome;
    try {
      outcome = await check.run({ browser, origin: served.origin, repoRoot, dist });
    } catch (error) {
      // A Check that throws is a broken Check, and saying so is more useful than
      // a stack trace with the rest of the suite abandoned behind it.
      outcome = {
        failures: [`the Check itself threw — ${String(error?.stack ?? error).split('\n').slice(0, 3).join(' / ')}`],
      };
    }
    const failures = Array.isArray(outcome) ? outcome : (outcome?.failures ?? []);
    const notes = Array.isArray(outcome) ? [] : (outcome?.notes ?? []);
    results.push({ name: check.name, title: check.title, failures, notes });

    const mark = failures.length === 0 ? 'ok  ' : 'FAIL';
    console.log(`  ${mark}  ${check.name.padEnd(NAME_COLUMN)}${check.title}`);
    for (const note of notes) console.log(`          · ${note}`);
    for (const failure of failures) console.log(`          ✗ ${failure}`);
  }
} finally {
  await browser.close();
  await served.close();
}

const broken = results.filter((result) => result.failures.length > 0);
const complaints = broken.reduce((n, result) => n + result.failures.length, 0);

if (broken.length === 0) {
  console.log(`\nchecks: ${results.length} Check(s) pass.`);
  process.exit(0);
}

console.error(
  `\nchecks: ${broken.length} of ${results.length} failed — ${complaints} thing(s) broken: ${broken.map((result) => result.name).join(', ')}`,
);
process.exit(1);
