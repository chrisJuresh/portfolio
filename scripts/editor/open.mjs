#!/usr/bin/env node
/**
 * One command opens the Editor on the real page.
 *
 *   pnpm editor                  build this tree, serve it, print the URL
 *   pnpm editor -- --no-build    against the dist/ already there
 *   pnpm editor -- --port 8790   a fixed port rather than an ephemeral one
 *
 * IT BUILDS FIRST, and that is not politeness. The Editor serves a build, and the
 * words on a built page are the Content as it stood when the build ran — that is
 * the `built` baseline the surface matches elements against (server.mjs). A stale
 * dist therefore does not show stale words and carry on; it shows fields the
 * Editor cannot find on the page, and says so. Building first is what makes that
 * case rare enough to be a diagnostic rather than the normal state.
 *
 * A TOKEN HAS THE SAME PROBLEM WITH A QUIETER SYMPTOM. Its value is baked into
 * the built stylesheet, and the Tokens surface shows the file's value over the top
 * of it — so against a stale dist every control is right and the page under it is
 * a build ago, with nothing out of place to notice. That is the other reason this
 * builds first, and the reason `--no-build` says so in the report below.
 *
 * IT SERVES THE TREE IT WAS INVOKED FROM, for the same reason `pnpm preview` and
 * the Checks do: the in-app preview serves the main checkout, so in a worktree it
 * would show `development` while looking like it showed the branch — and here it
 * would then let the author edit one tree's Content while looking at another's.
 */

import { spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { PAGE, start } from './server.mjs';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url)).replace(/[\\/]+$/, '');
const dist = `${repoRoot}/dist`;
const sectionsRoot = `${repoRoot}/src/sections`;

const argv = process.argv.slice(2);
const build = !argv.includes('--no-build');
const at = argv.indexOf('--port');
const port = at === -1 ? 0 : Number(argv[at + 1]);
if (Number.isNaN(port) || port < 0 || port > 65535) {
  console.error(`editor: --port ${argv[at + 1]} is not a port.`);
  process.exit(2);
}

if (build) {
  console.log('editor: building this tree…\n');
  const built = spawnSync('pnpm', ['build'], { cwd: repoRoot, stdio: 'inherit', shell: true });
  if (built.status !== 0) {
    console.error('\neditor: the build failed, so there is nothing to edit against.');
    process.exit(1);
  }
  console.log('');
}

try {
  statSync(dist);
} catch {
  console.error(`editor: ${dist} does not exist — run without --no-build.`);
  process.exit(2);
}

const served = await start({ dist, sectionsRoot, repoRoot, port });

console.log('editor: the Portfolio, editable.\n');
console.log(`  open       ${served.origin}${PAGE}`);
console.log(`  serving    ${dist}`);
console.log(`  writing    src/sections/*/{content.ts,tokens.css}   ${build ? '' : '(against a dist this did not build)'}`);
console.log('\n  Click any text to change it. Enter commits, Escape puts it back.');
console.log('  The Tokens surface drags every Token a Section declares; Motion scrubs its Timeline.');
console.log('  Publish commits and pushes — the Checks run on the commit, so it takes a minute.');
console.log('\n  Ctrl-C to stop.');

const stop = async () => {
  await served.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
