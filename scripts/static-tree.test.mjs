/**
 * The static tree's own logic, without a server in front of it.
 *
 * `servedFromStaticTree` is the dev server's answer to a question the deployment
 * never has to ask, so it is the part worth pinning: astro.config.mjs registers
 * its middleware AHEAD of Astro's, and this predicate is the only thing standing
 * between that and a real page being shadowed by a file of the same name.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { isStaticPath, servedFromStaticTree } from './static-tree.mjs';

/** As `astro:routes:resolved` gives them — the src/pages route that exists. */
const NEXT = /^\/next\/?$/;
/** Astro's internal fallback, which astro.config.mjs filters out by origin. */
const FOUR_OH_FOUR = /^\/404\/?$/;

test('the paths STATIC_ROOTS owns are the static tree to answer', () => {
  for (const pathname of ['/', '/portfolio', '/portfolio/', '/portfolio/index.html', '/fonts/fonts.css', '/projects/og.jpg']) {
    assert.equal(servedFromStaticTree(pathname, [NEXT]), true, pathname);
  }
});

test("a path outside STATIC_ROOTS is not the static tree's", () => {
  for (const pathname of ['/next', '/src/pages/next.astro', '/@vite/client', '/_astro/index.css']) {
    assert.equal(servedFromStaticTree(pathname, [NEXT]), false, pathname);
  }
});

test('a real Astro route takes its path back off the static tree', () => {
  // What adding src/pages/portfolio.astro looks like from here. The file
  // portfolio/index.html still exists — the point is that it stops being served.
  const portfolio = /^\/portfolio\/?$/;
  assert.equal(servedFromStaticTree('/portfolio', [NEXT, portfolio]), false);
  assert.equal(servedFromStaticTree('/portfolio/', [NEXT, portfolio]), false);
  // Only the route's own path, though. The assets under it are nobody else's.
  assert.equal(servedFromStaticTree('/portfolio/styles.css', [NEXT, portfolio]), true);
});

test('no routes yet is the static tree answering, not nothing', () => {
  // The hook has fired before the server listens every time it has been looked
  // at, but a middleware that served 404s until it did would be a worse failure
  // than one that briefly ignored a route nobody has added.
  assert.equal(servedFromStaticTree('/portfolio', []), true);
  assert.equal(servedFromStaticTree('/next', []), false);
});

test("Astro's internal 404 route does not claim the portal", () => {
  // It cannot match `/` anyway; the assertion is that passing it in changes
  // nothing, so filtering by origin at the call site stays a guard and not a fix.
  assert.equal(servedFromStaticTree('/', [NEXT, FOUR_OH_FOUR]), true);
  assert.equal(servedFromStaticTree('/portfolio', [NEXT, FOUR_OH_FOUR]), true);
});

test('isStaticPath is the whitelist and nothing more', () => {
  assert.equal(isStaticPath('/'), true);
  assert.equal(isStaticPath('/portfolio/img/tex/paper-512.webp'), true);
  assert.equal(isStaticPath('/docs/agents/domain.md'), false);
  assert.equal(isStaticPath('/README.md'), false);
});
