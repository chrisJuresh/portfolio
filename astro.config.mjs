import { createReadStream, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import {
  contentType,
  resolveFile,
  rewriteTarget,
  servedFromStaticTree,
} from './scripts/static-tree.mjs';

const repoRoot = fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]+$/, '');

/**
 * Answer, while `astro dev` is running, everything the deployment answers that
 * Astro does not build: the paths under STATIC_ROOTS, and the rewrites.
 *
 * The Kernel's corner pictures and the Effect Stack's textures are baked files
 * under /portfolio/img/, and a built page reaches them because the assemble step
 * puts them in the same dist/ Astro wrote. Without this the dev server is the
 * only place those URLs 404, which makes the dev server the one surface that
 * cannot be trusted.
 *
 * REGISTERED IN FRONT OF EVERYTHING, which is the opposite of what it used to
 * say, and the reason is that neither of the two middlewares ahead of it calls
 * next(). Astro's dev middleware answers an unmatched HTML request with its own
 * 404, so /portfolio, /portfolio/ and / never reached this at all. Vite's
 * transform middleware answers a plain .css under a static root by compiling it
 * into a JS module, `content-type: text/javascript` and an `import` of
 * /@vite/client at the top — which a <link rel="stylesheet"> will not apply, so
 * the page came up unstyled the moment its HTML was reachable. Registered behind
 * those, this middleware served nothing whatsoever; the assets that did work in
 * dev were Vite's static serving, not this.
 *
 * `enforce: 'pre'` and a direct `server.middlewares.use` — rather than the use
 * inside a returned function, which is Vite's post hook — put it ahead of both.
 * The files under STATIC_ROOTS are the deployment's verbatim bytes and not Astro
 * source, so passing them through a build pipeline was never right anyway: this
 * now serves them exactly as scripts/serve-dist.mjs does, which is what makes
 * `pnpm dev` and `pnpm preview` agree.
 *
 * A REWRITE IS HANDED BACK TO ASTRO rather than answered here, and it is tried
 * first. `/portfolio/<section>` is a path STATIC_ROOTS owns and no Astro route
 * matches, so without this it would fall to the resolver, find nothing under
 * portfolio/ and 404 — while production served the document. Rewriting req.url
 * and calling next() is what the deployment does: the page Astro renders for
 * /portfolio answers, and the browser keeps the path it asked for, which is the
 * whole point of a deep link.
 *
 * A REAL ASTRO ROUTE STILL WINS the static half. Running first, this could
 * otherwise shadow a page somebody adds under src/pages/, so the promise is kept
 * explicitly rather than by ordering: `astro:routes:resolved` hands over every
 * route Astro has — at startup before the server listens, and again whenever a
 * page is added or removed — and the middleware stands aside for any of them.
 */
function servesWhatAstroDoesNotBuild() {
  // Filled in by the routes:resolved hook below, and read on every request.
  /** @type {RegExp[]} */
  let astroRoutes = [];

  const middleware = {
    name: 'portfolio:unbuilt-paths',
    enforce: 'pre',
    /** Structurally, rather than as `ViteDevServer`: vite is astro's dependency
     *  and not one of ours, so naming its type here would be a `tsc` failure the
     *  moment astro moved it.
     *
     *  @param {{ middlewares: { use: (handler: (
     *      req: import('node:http').IncomingMessage,
     *      res: import('node:http').ServerResponse,
     *      next: () => void,
     *    ) => void) => void } }} server */
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '/';
        const pathname = url.split('?')[0] ?? '/';
        const query = url.slice(pathname.length);

        // A FILE FIRST, A REWRITE LAST, which is the order Vercel resolves in
        // and therefore the only order that makes this server a stand-in for
        // it. Reversed, a rewrite would take a path off the static tree AND off
        // a real Astro route without either of them being asked — and nothing
        // collides today, so it would sit there silently until one did.
        if (servedFromStaticTree(pathname, astroRoutes)) {
          const file = resolveFile(repoRoot, pathname, { statSync });
          if (file) return serve(res, file);
        }

        // Nothing on disk answers it, so the deployment's rewrites get their
        // turn. Handed back to Astro rather than answered here: the page it
        // renders for the destination is what production serves, and the
        // browser keeps the path it asked for. The query survives the rewrite
        // because `?fx=` is a real thing to put on a deep link.
        const rewritten = rewriteTarget(pathname);
        if (rewritten !== null) {
          req.url = rewritten + query;
          return next();
        }
        return next();
      });

      /** @param {import('node:http').ServerResponse} res
       *  @param {string} file */
      function serve(res, file) {
        res.setHeader('content-type', contentType(file));
        // A read that fails after the stat would otherwise take the dev
        // server down on an unhandled 'error'.
        createReadStream(file)
          .on('error', () => res.destroy())
          .pipe(res);
      }
    },
  };

  return {
    name: 'portfolio:unbuilt-paths',
    hooks: {
      'astro:config:setup': (/** @type {{ updateConfig: (config: object) => void }} */ { updateConfig }) => {
        updateConfig({ vite: { plugins: [middleware] } });
      },
      'astro:routes:resolved': (
        /** @type {{ routes: { origin: string, patternRegex: RegExp }[] }} */ { routes },
      ) => {
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
  // /portfolio, not /portfolio/index.html — vercel.json's cleanUrls serves the
  // directory form at the bare path. It is also what puts the document at
  // dist/portfolio/index.html, beside the assets the assemble step lays in.
  build: { format: 'directory' },
  // Astro scopes a component's rules by narrowing every compound in them, and
  // the DEFAULT strategy narrows with a bare attribute selector — which adds
  // (0,1,0) of specificity per compound. That makes a scoped rule's weight grow
  // with the length of its selector, and a Variant, which is one fixed gate in
  // front of the same selector, then wins or loses depending on how many
  // compounds the composition happened to write. A two-compound selector was an
  // exact tie, settled by whichever stylesheet the bundler emitted second.
  //
  // `where` wraps the same attribute in :where(), so it selects identically and
  // weighs nothing. Scoped rules keep the specificity they are written with, and
  // `:root[data-variant='…']` in front of one always outranks it by (0,2,0) —
  // which is the whole mechanism a Variant is selected by. See
  // src/sections/NOTES.md.
  scopedStyleStrategy: 'where',
  devToolbar: { enabled: false },
  integrations: [servesWhatAstroDoesNotBuild()],
});
