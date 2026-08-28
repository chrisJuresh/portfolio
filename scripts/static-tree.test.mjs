/**
 * The static tree's own logic, without a server in front of it.
 *
 * `servedFromStaticTree` is the dev server's answer to a question the deployment
 * never has to ask, so it is the part worth pinning: astro.config.mjs registers
 * its middleware AHEAD of Astro's, and this predicate is the only thing standing
 * between that and a real page being shadowed by a file of the same name.
 *
 * `rewriteTarget` is the opposite — the deployment's own rule, mirrored locally
 * so `pnpm preview` and the Checks answer a deep link the way production does.
 * The rewrites it reads are vercel.json's; what is pinned here is the matching,
 * and every case is passed its own table so the tests say nothing about which
 * Sections happen to exist today.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { deployedFile, isStaticPath, rewriteTarget, servedFromStaticTree } from './static-tree.mjs';

/** As `astro:routes:resolved` gives them — the src/pages route that exists. */
const PORTFOLIO = /^\/portfolio\/?$/;
/** Astro's internal fallback, which astro.config.mjs filters out by origin. */
const FOUR_OH_FOUR = /^\/404\/?$/;

/** A deep link, as vercel.json spells one. */
const REWRITES = [{ source: '/portfolio/projects', destination: '/portfolio' }];

test('the paths STATIC_ROOTS owns are the static tree to answer', () => {
  for (const pathname of ['/', '/portfolio/img/plate-800.webp', '/fonts/fonts.css', '/projects/og.jpg']) {
    assert.equal(servedFromStaticTree(pathname, [PORTFOLIO]), true, pathname);
  }
});

test("a path outside STATIC_ROOTS is not the static tree's", () => {
  for (const pathname of ['/design/sheets/index.html', '/src/pages/portfolio.astro', '/@vite/client', '/_astro/index.css']) {
    assert.equal(servedFromStaticTree(pathname, [PORTFOLIO]), false, pathname);
  }
});

test('a real Astro route takes its path back off the static tree', () => {
  // The document's own path belongs to the page Astro renders, and the assets
  // under it belong to nobody else — which is the overlap the whole arrangement
  // is built around.
  assert.equal(servedFromStaticTree('/portfolio', [PORTFOLIO]), false);
  assert.equal(servedFromStaticTree('/portfolio/', [PORTFOLIO]), false);
  assert.equal(servedFromStaticTree('/portfolio/video/photos-grid.webm', [PORTFOLIO]), true);
});

test('no routes yet is the static tree answering, not nothing', () => {
  // The hook has fired before the server listens every time it has been looked
  // at, but a middleware that served 404s until it did would be a worse failure
  // than one that briefly ignored a route nobody has added.
  assert.equal(servedFromStaticTree('/portfolio', []), true);
  assert.equal(servedFromStaticTree('/_astro/index.css', []), false);
});

test("Astro's internal 404 route does not claim the portal", () => {
  // It cannot match `/` anyway; the assertion is that passing it in changes
  // nothing, so filtering by origin at the call site stays a guard and not a fix.
  assert.equal(servedFromStaticTree('/', [PORTFOLIO, FOUR_OH_FOUR]), true);
  assert.equal(servedFromStaticTree('/portfolio/img/eye-800.webp', [PORTFOLIO, FOUR_OH_FOUR]), true);
});

test('isStaticPath is the whitelist and nothing more', () => {
  assert.equal(isStaticPath('/'), true);
  assert.equal(isStaticPath('/portfolio/img/tex/paper-512.webp'), true);
  assert.equal(isStaticPath('/docs/agents/domain.md'), false);
  assert.equal(isStaticPath('/README.md'), false);
});

test('a deep link is rewritten onto the document', () => {
  assert.equal(rewriteTarget('/portfolio/projects', REWRITES), '/portfolio');
  // cleanUrls serves the trailing-slash form at the bare path, so the rewrite
  // has to see one path where the reader may type two.
  assert.equal(rewriteTarget('/portfolio/projects/', REWRITES), '/portfolio');
  assert.equal(rewriteTarget('/portfolio/projects?fx=paper', REWRITES), '/portfolio');
});

test('everything else is served from its own path', () => {
  // Literal sources only. A `:param` pattern would answer for every spelling,
  // and a deep link nothing declares is meant to 404 rather than quietly serve
  // the document — which is what makes the Check that walks them worth having.
  for (const pathname of ['/portfolio', '/portfolio/nonsense', '/portfolio/img/plate-800.webp', '/']) {
    assert.equal(rewriteTarget(pathname, REWRITES), null, pathname);
  }
});

/**
 * A filesystem with only the paths named in it, for `deployedFile`.
 *
 * The real one is injected for the same reason: what is being asserted is the
 * ORDER — a file that exists wins, and a rewrite is what answers when none does
 * — and that is a statement about the resolver, not about any tree on disk.
 */
const only = (...paths) => ({
  statSync(path) {
    if (paths.includes(path)) return { isFile: () => true, isDirectory: () => false };
    throw new Error(`ENOENT ${path}`);
  },
});

test('a file that exists is served from its own path, rewrite or no rewrite', () => {
  const fs = only('/d/portfolio/index.html', '/d/portfolio/img/plate-800.webp');
  assert.equal(deployedFile('/d', '/portfolio/img/plate-800.webp', fs), '/d/portfolio/img/plate-800.webp');
  assert.equal(deployedFile('/d', '/portfolio', fs), '/d/portfolio/index.html');
});

test('a path no file answers falls through to the rewrite', () => {
  // The deep link, end to end: nothing is on disk at /portfolio/projects, and
  // what comes back is the document the rewrite names. This is the whole reason
  // `pnpm preview`, the Check runner and the Editor go through one function —
  // three servers agreeing with production by construction rather than by three
  // people remembering.
  const fs = only('/d/portfolio/index.html');
  assert.equal(deployedFile('/d', '/portfolio/projects', fs), '/d/portfolio/index.html');
});

test('a path with neither a file nor a rewrite is a 404', () => {
  const fs = only('/d/portfolio/index.html');
  assert.equal(deployedFile('/d', '/portfolio/nonsense', fs), null);
  assert.equal(deployedFile('/d', '/next', fs), null);
});
