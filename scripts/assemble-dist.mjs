#!/usr/bin/env node
/**
 * Lay the paths the build does not produce down beside what Astro just built.
 *
 * The deployment serves one directory, and two things write into it: Astro,
 * which renders the document and its bundles, and this, which copies in the
 * files that are served verbatim — the portal at `/`, the pictures and
 * recordings under `/portfolio/`, `/projects/` and the faces. Astro writes dist/
 * and empties it first, so this runs after it.
 *
 * A COLLISION IS A FAILURE AND NOT A MERGE, and it is judged per FILE. It used
 * to be judged per directory, which was right while `/portfolio` was a
 * hand-written tree and the build wrote `/next`: the two could not overlap at
 * all, and a directory the build had written was proof one of them had moved.
 * They overlap by design now — `dist/portfolio/index.html` is the document and
 * `dist/portfolio/img/` is its pictures — so the guard is on the one thing that
 * is still always a mistake: two sources claiming the same file. Every file is
 * planned before any is written, so a refusal leaves dist/ untouched.
 */

import { cp, mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATIC_ROOTS } from './static-tree.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const dist = join(repoRoot, 'dist');

async function present(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Every file under `from`, paired with where it would land under `to`.
 *
 * File-by-file rather than one recursive `cp`, because `cp` merges directories
 * silently and overwrites files — which is exactly the failure this is here to
 * catch.
 *
 * @returns {Promise<{ source: string, target: string }[]>}
 */
async function filesUnder(from, to) {
  /** @type {{ source: string, target: string }[]} */
  const found = [];
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const source = join(from, entry.name);
    const target = join(to, entry.name);
    if (entry.isDirectory()) found.push(...(await filesUnder(source, target)));
    else found.push({ source, target });
  }
  return found;
}

if (!(await present(dist))) {
  console.error('assemble-dist: dist/ does not exist — run `astro build` first.');
  process.exit(1);
}

// EVERY FILE IS PLANNED BEFORE ANY IS WRITTEN, so a refusal leaves dist/ exactly
// as the build left it. A guard that fails halfway is a guard that hands back a
// tree nobody can reason about — and this one refuses on a case that is always a
// mistake, which is precisely when the state afterwards has to be clean.
/** @type {{ source: string, target: string }[]} */
const planned = [];

for (const root of STATIC_ROOTS) {
  const from = join(repoRoot, root);
  if (!(await present(from))) {
    console.error(`assemble-dist: ${root} is missing from the repository.`);
    process.exit(1);
  }
  const target = join(dist, root);
  if ((await stat(from)).isDirectory()) planned.push(...(await filesUnder(from, target)));
  else planned.push({ source: from, target });
}

/** @type {string[]} */
const clashes = [];
for (const { target } of planned) {
  if (await present(target)) clashes.push(relative(dist, target).replace(/\\/g, '/'));
}

if (clashes.length > 0) {
  console.error(
    `assemble-dist: the build already wrote ${clashes.length} of the file(s) the repository serves verbatim.\n` +
      '  Nothing has been copied. Rename the route, or delete the file the build has taken over.\n',
  );
  for (const clash of clashes) console.error(`  dist/${clash}`);
  process.exit(1);
}

for (const { source, target } of planned) {
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target);
}

console.log(`assemble-dist: ${planned.length} verbatim file(s) laid down beside the build.`);
