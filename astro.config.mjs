import { createReadStream, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { contentType, resolveFile, servedFromStaticTree } from './scripts/static-tree.mjs';

const repoRoot = fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]+$/, '');

/**
 * Serve the site that already exists beside /next while `astro dev` is running.
 *
 * The Kernel's corner pictures and the Effect Stack's textures are baked files
 * under /portfolio/img/, and a built /next reaches them because the assemble
 * step puts both trees in one dist/. Without this the dev server is the only
 * place those URLs 404, which makes the dev server the one surface that cannot
 * be trusted.
 *
 * REGISTERED IN FRONT OF EVERYTHING, which is the opposite of what it used to
 * say, and the reason is that neither of the two middlewares ahead of it calls
 * next(). Astro's dev middleware answers an unmatched HTML request with its own
 * 404, so /portfolio, /portfolio/ and / never reached this at all. Vite's
 * transform middleware answers /portfolio/styles.css and /fonts/fonts.css by
 * compiling them into JS modules, `content-type: text/javascript` and an
 * `import` of /@vite/client at the top — which a <link rel="stylesheet"> will
 * not apply, so the page came up unstyled the moment its HTML was reachable.
 * Registered behind those, this middleware served nothing whatsoever; the assets
 * that did work in dev were Vite's static serving, not this.
 *
 * `enforce: 'pre'` and a direct `server.middlewares.use` — rather than the use
 * inside a returned function, which is Vite's post hook — put it ahead of both.
 * The files under STATIC_ROOTS are the deployment's verbatim bytes and not Astro
 * source, so passing them through a build pipeline was never right anyway: this
 * now serves them exactly as scripts/serve-dist.mjs does, which is what makes
 * `pnpm dev` and `pnpm preview` agree.
 *
 * A REAL ASTRO ROUTE STILL WINS. Running first, this could otherwise shadow a
 * page somebody adds at src/pages/portfolio.astro, so the promise is kept
 * explicitly now rather than by ordering: `astro:routes:resolved` hands over
 * every route Astro has — at startup before the server listens, and again
 * whenever a page is added or removed — and the middleware stands aside for any
 * of them.
 */
function servesTheExistingSite() {
  // Filled in by the routes:resolved hook below, and read on every request.
  let astroRoutes = [];

  const middleware = {
    name: 'portfolio:existing-site',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '/').split('?')[0];
        if (!servedFromStaticTree(pathname, astroRoutes)) return next();
        const file = resolveFile(repoRoot, pathname, { statSync });
        if (!file) return next();
        res.setHeader('content-type', contentType(file));
        // A read that fails after the stat would otherwise take the dev
        // server down on an unhandled 'error'.
        createReadStream(file)
          .on('error', () => res.destroy())
          .pipe(res);
      });
    },
  };

  return {
    name: 'portfolio:existing-site',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        updateConfig({ vite: { plugins: [middleware] } });
      },
      'astro:routes:resolved': ({ routes }) => {
        // Only routes somebody wrote under src/pages. Astro's own — /404,
        // /_image, /_server-islands/[name] — come through as
        // `origin: 'internal'`, and none of them is a page a static path could
        // legitimately lose to. None of their patterns matches a static root
        // today either, so this filter is a guard and not a fix: it is here so
        // that an internal route with a broader pattern, in some later Astro,
        // cannot quietly take the whole static tree away.
        astroRoutes = routes
          .filter((route) => route.origin === 'project')
          .map((route) => route.patternRegex);
      },
    },
  };
}

export default defineConfig({
  site: 'https://chrisj.uk',
  // dist/ is where the deployment's output directory points, and where the
  // assemble step lays the existing site down beside what Astro wrote.
  outDir: './dist',
  // /next, not /next/index.html — vercel.json's cleanUrls serves the directory
  // form at the bare path.
  build: { format: 'directory' },
  // Astro scopes a component's rules by narrowing every compound in them, and
  // the DEFAULT strategy narrows with a bare attribute selector — which adds
  // (0,1,0) of specificity per compound. That makes a scoped rule's weight grow
  // with the length of its selector, and a Variant, which is one fixed gate in
  // front of the same selector, then wins or loses depending on how many
  // compounds the composition happened to write. `.stub__points li` was an exact
  // tie, settled by whichever stylesheet the bundler emitted second.
  //
  // `where` wraps the same attribute in :where(), so it selects identically and
  // weighs nothing. Scoped rules keep the specificity they are written with, and
  // `:root[data-variant='…']` in front of one always outranks it by (0,2,0) —
  // which is the whole mechanism a Variant is selected by. See
  // src/sections/stub/NOTES.md.
  scopedStyleStrategy: 'where',
  devToolbar: { enabled: false },
  integrations: [servesTheExistingSite()],
});
