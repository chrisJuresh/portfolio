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

import { check as assets } from './checks/assets.mjs';
import { check as consoleQuiet } from './checks/console.mjs';
import { check as faces } from './checks/faces.mjs';
import { check as ground } from './checks/ground.mjs';
import { check as moments } from './checks/moments.mjs';
import { check as unpublishable } from './checks/unpublishable.mjs';
import { serve } from './lib/serve.mjs';

/** In the order they are cheapest to read a failure from. */
const CHECKS = [assets, consoleQuiet, faces, ground, moments, unpublishable];

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
 * The runner's own pure logic, before the browser is started.
 *
 * Not a Check — nothing here is an assertion about a Section — but it runs from
 * the same command on purpose: the denylist's patterns and the luminance bands
 * are what several Checks below decide with, and a runner that reported on the
 * page while its own matching was broken would be worse than no runner.
 */
if (build) {
  // The glob is quoted and passed through, not expanded by a shell: PowerShell
  // does not expand one, and handing `--test` a bare directory makes it try to
  // require the directory itself.
  const tested = spawnSync(
    process.execPath,
    ['--test', '--test-reporter=dot', 'scripts/checks/lib/**/*.test.mjs'],
    { cwd: repoRoot, stdio: 'inherit' },
  );
  if (tested.status !== 0) {
    console.error("\nchecks: the runner's own unit tests fail, so it has not been run.");
    process.exit(1);
  }

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
const browser = await chromium.launch();

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
    console.log(`  ${mark}  ${check.name.padEnd(14)}${check.title}`);
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
