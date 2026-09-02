// What the deployment does with a path, spelled once so every local server can
// do the same thing.
//
// Two halves. The paths the build does not produce — the portal, the pictures,
// the recordings, the faces — which are plain files at the repository root, laid
// into dist/ after Astro has written it; and the routing rules from vercel.json,
// which are the deployment's and which a local server has to mirror or it is
// answering a different question from the one production answers.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * The paths that are served verbatim rather than built.
 *
 * `portfolio` is on this list AND is a route the build writes, and that overlap
 * is the shape of the site rather than an accident: `/portfolio` is the document
 * Astro renders, and `/portfolio/img/`, `/portfolio/video/` are its assets, which
 * no build step produces. assemble-dist.mjs is what merges the two, and it
 * refuses on a FILE that both sides own rather than on a directory.
 *
 * Deliberately a whitelist of the four served paths and not "everything that is
 * not source". README.md, CONTEXT.md, docs/ and run.bat are uploaded to the
 * deployment today and nothing links them.
 */
export const STATIC_ROOTS = ['index.html', 'portfolio', 'projects', 'fonts'];

/**
 * The deployment's rewrites, READ OUT OF vercel.json rather than written down
 * here.
 *
 * A deep link is `/portfolio/<section>` served as `/portfolio` (ADR 0001), and
 * the file that decides it is vercel.json, because that is the one the
 * deployment reads. A second list here would be a second thing to keep in step,
 * and the failure it would cause is silent: the Checks passing against a rewrite
 * production does not have. So this reads the same file, and the Checks assert
 * that every Section on the page has one.
 *
 * @type {{ source: string, destination: string }[]}
 */
const REWRITES = (() => {
  const file = fileURLToPath(new URL('../vercel.json', import.meta.url));
  const config = JSON.parse(readFileSync(file, 'utf8'));
  return Array.isArray(config.rewrites) ? config.rewrites : [];
})();

/**
 * Where the deployment would serve `pathname` from, or null when it is served
 * from `pathname` itself.
 *
 * Literal sources only, which is what vercel.json holds: a `:param` pattern
 * would answer for paths nothing on the page names, and a deep link that 404s is
 * a better failure than one that serves the document under any spelling.
 *
 * REWRITES ARE THE LAST THING VERCEL TRIES, after a file that exists — so this
 * is only ever asked about a path that resolved to nothing, and `/portfolio/img/…`
 * can never be taken by one.
 *
 * @param {string} pathname  request path, still URL-encoded
 * @param {{ source: string, destination: string }[]} [rewrites]
 * @returns {string | null}
 */
export function rewriteTarget(pathname, rewrites = REWRITES) {
  const path = pathname.split(/[?#]/)[0] ?? '';
  // `cleanUrls` serves `/portfolio/projects/` as `/portfolio/projects`; the
  // rewrite has to see the same path either way.
  const bare = path.length > 1 ? path.replace(/\/+$/, '') : path;
  const found = rewrites.find((rewrite) => rewrite.source === bare);
  return found ? found.destination : null;
}

/** @type {Record<string, string>} */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

/** @param {string} file */
export function contentType(file) {
  const dot = file.lastIndexOf('.');
  const extension = dot === -1 ? '' : file.slice(dot).toLowerCase();
  return MIME[extension] ?? 'application/octet-stream';
}

/**
 * The file a request resolves to under `baseDir`, or null.
 *
 * Follows vercel.json's `cleanUrls: true` so a path served locally is the path
 * served in production: a directory resolves to its index.html, and an
 * extensionless path that is not a directory gets `.html` tried.
 *
 * @param {string} baseDir
 * @param {string} pathname  request path, still URL-encoded
 * @param {{ statSync: (p: string) => { isDirectory(): boolean, isFile(): boolean } }} fs
 * @returns {string | null}
 */
export function resolveFile(baseDir, pathname, fs) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname.split(/[?#]/)[0] ?? '');
  } catch {
    return null;
  }
  // Path traversal. Both separators, because this runs on Windows and a request
  // for `/%5C..%5C..%5C.env` decodes to backslashes that only Node's own path
  // handling would treat as separators — splitting on '/' alone lets it through
  // and the join below then climbs out of baseDir.
  const rel = decoded.replace(/^[/\\]+/, '');
  if (rel.split(/[/\\]/).includes('..')) return null;
  // Windows drive letters and UNC paths, for the same reason: `C:/…` joined onto
  // baseDir is still an absolute path to Node.
  if (/^[a-z]:/i.test(rel)) return null;

  const candidates = [];
  const base = rel === '' ? 'index.html' : rel;
  candidates.push(base);
  candidates.push(`${base}/index.html`.replace(/\/+/g, '/'));
  if (!/\.[a-z0-9]+$/i.test(base)) candidates.push(`${base}.html`);

  for (const candidate of candidates) {
    const full = `${baseDir}/${candidate}`;
    let stat;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }
    if (stat.isFile()) return full;
  }
  return null;
}

/**
 * The file the DEPLOYMENT would answer `pathname` with, out of a built `dist/`.
 *
 * `resolveFile` is the filesystem half and this is the whole of it: a path that
 * matches no file falls through to the rewrites, exactly as it does in
 * production. Every local server that stands in for the deployment — `pnpm
 * preview`, the Check runner, the Editor — goes through here, so a deep link is
 * verified rather than assumed.
 *
 * @param {string} baseDir
 * @param {string} pathname  request path, still URL-encoded
 * @param {{ statSync: (p: string) => { isDirectory(): boolean, isFile(): boolean } }} fs
 * @returns {string | null}
 */
export function deployedFile(baseDir, pathname, fs) {
  const direct = resolveFile(baseDir, pathname, fs);
  if (direct) return direct;
  const rewritten = rewriteTarget(pathname);
  return rewritten === null ? null : resolveFile(baseDir, rewritten, fs);
}

/**
 * True when the static tree is the thing that should answer `pathname`.
 *
 * Two conditions, and the second exists only for the dev server. The path has to
 * be one STATIC_ROOTS owns, AND no route Astro actually has may claim it.
 *
 * The second is what keeps `astro dev` honest. The middleware that serves this
 * tree runs BEFORE Astro's own — it has to, because Astro answers an unmatched
 * HTML request with its 404 instead of calling next(), so anything registered
 * behind it is never reached — and running first means it would happily shadow a
 * real page. Asking Astro which paths it has is what puts the route back in
 * front. In a built dist/ the same guarantee is assemble-dist.mjs refusing to
 * copy a static root over a path the build wrote.
 *
 * @param {string} pathname
 * @param {RegExp[]} astroRoutes  patterns for the routes Astro's own pages have,
 *   and only those — see astro.config.mjs for why its internal ones are dropped.
 */
export function servedFromStaticTree(pathname, astroRoutes = []) {
  if (!isStaticPath(pathname)) return false;
  return !astroRoutes.some((pattern) => pattern.test(pathname));
}

/** True when `pathname` is one of the paths STATIC_ROOTS owns.
 *
 *  @param {string} pathname */
export function isStaticPath(pathname) {
  const first = pathname.replace(/^\/+/, '').split('/')[0] ?? '';
  if (first === '') return true; // the portal at /
  return STATIC_ROOTS.includes(first);
}
