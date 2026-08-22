import { createReadStream, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { contentType, isStaticPath, resolveFile } from './scripts/static-tree.mjs';

const repoRoot = fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]+$/, '');

/**
 * Serve the site that already exists beside /next while `astro dev` is running.
 *
 * The Kernel's corner pictures and the Effect Stack's textures are baked files
 * under /portfolio/img/, and a built /next reaches them because the assemble
 * step puts both trees in one dist/. Without this the dev server is the only
 * place those URLs 404, which makes the dev server the one surface that cannot
 * be trusted. Registered after Astro's own middleware, so a real route always
 * wins and this only ever answers what Astro did not.
 */
function servesTheExistingSite() {
  return {
    name: 'portfolio:existing-site',
    configureServer(server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          const pathname = (req.url ?? '/').split('?')[0];
          if (!isStaticPath(pathname)) return next();
          const file = resolveFile(repoRoot, pathname, { statSync });
          if (!file) return next();
          res.setHeader('content-type', contentType(file));
          // A read that fails after the stat would otherwise take the dev
          // server down on an unhandled 'error'.
          createReadStream(file)
            .on('error', () => res.destroy())
            .pipe(res);
        });
      };
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
  vite: { plugins: [servesTheExistingSite()] },
});
