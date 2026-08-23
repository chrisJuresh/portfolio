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
 * is still always a mistake: two sources claiming the same file.
 */

import { cp, mkdir, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
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
 * Copy `from` into `to`, refusing any file that is already there.
 *
 * Depth-first and file-by-file rather than one recursive `cp`, because `cp`
 * merges directories silently and overwrites files — which is exactly the
 * failure this is here to catch.
 *
 * @returns {Promise<{ copied: number, clashes: string[] }>}
 */
async function layDown(from, to) {
  const clashes = [];
  let copied = 0;

  const entries = await readdir(from, { withFileTypes: true });
  await mkdir(to, { recursive: true });

  for (const entry of entries) {
    const source = join(from, entry.name);
    const target = join(to, entry.name);
    if (entry.isDirectory()) {
      const inner = await layDown(source, target);
      copied += inner.copied;
      clashes.push(...inner.clashes);
      continue;
    }
    if (await present(target)) {
      clashes.push(relative(dist, target).replace(/\\/g, '/'));
      continue;
    }
    await cp(source, target);
    copied += 1;
  }

  return { copied, clashes };
}

if (!(await present(dist))) {
  console.error('assemble-dist: dist/ does not exist — run `astro build` first.');
  process.exit(1);
}

let copied = 0;
/** @type {string[]} */
const clashes = [];

for (const root of STATIC_ROOTS) {
  const from = join(repoRoot, root);
  if (!(await present(from))) {
    console.error(`assemble-dist: ${root} is missing from the repository.`);
    process.exit(1);
  }
  const target = join(dist, root);
  if ((await stat(from)).isDirectory()) {
    const laid = await layDown(from, target);
    copied += laid.copied;
    clashes.push(...laid.clashes);
  } else if (await present(target)) {
    clashes.push(relative(dist, target).replace(/\\/g, '/'));
  } else {
    await cp(from, target);
    copied += 1;
  }
}

if (clashes.length > 0) {
  console.error(
    `assemble-dist: the build already wrote ${clashes.length} of the file(s) the repository serves verbatim.\n` +
      '  Some of the tree has been copied. Rename the route, or delete the file the build has taken over.\n',
  );
  for (const clash of clashes) console.error(`  dist/${clash}`);
  process.exit(1);
}

console.log(`assemble-dist: ${copied} verbatim file(s) laid down beside the build.`);
