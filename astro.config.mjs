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
  devToolbar: { enabled: false },
  vite: { plugins: [servesTheExistingSite()] },
});
