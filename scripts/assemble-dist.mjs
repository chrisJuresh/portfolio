#!/usr/bin/env node
/**
 * Lay the site that already exists down beside what Astro just built.
 *
 * The deployment serves one directory, and this repository is two things: a
 * plain static tree that is the live site, and an Astro build that is `/next`.
 * Astro writes dist/ and empties it first, so this runs after it and copies the
 * static tree in.
 *
 * A collision is a failure and not a merge. That is the guard that `/next`
 * cannot quietly land on top of a path `/portfolio` already answers on — and it
 * is the whole reason this ticket's route is `/next` and not `/portfolio`.
 */

import { cp, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
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

if (!(await present(dist))) {
  console.error('assemble-dist: dist/ does not exist — run `astro build` first.');
  process.exit(1);
}

const built = new Set(await readdir(dist));
let copied = 0;

for (const root of STATIC_ROOTS) {
  const from = join(repoRoot, root);
  if (!(await present(from))) {
    console.error(`assemble-dist: ${root} is missing from the repository.`);
    process.exit(1);
  }
  if (built.has(root)) {
    console.error(
      `assemble-dist: the build wrote dist/${root}, which the existing site also owns.\n` +
        '  Nothing has been copied. Rename the route, or land the ticket that replaces that path.',
    );
    process.exit(1);
  }
  await cp(from, join(dist, root), { recursive: true });
  copied += 1;
}

console.log(`assemble-dist: ${copied} static path(s) laid down beside ${built.size} built one(s).`);
