// The part of the repository that is already a served site, named once.
//
// `/next` is built by Astro into dist/; everything the site serves today is
// plain files at the repository root and is not built by anything. Two things
// need to agree about which those are — the dev server, which serves them
// alongside /next, and the assemble step, which copies them into dist/ after a
// build — so the list lives here rather than in both.
//
// Deliberately a whitelist of the four served paths and not "everything that is
// not source". README.md, CONTEXT.md, docs/ and run.bat are uploaded to the
// deployment today and nothing links them.

export const STATIC_ROOTS = ['index.html', 'portfolio', 'projects', 'fonts'];

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

export function contentType(file) {
  const dot = file.lastIndexOf('.');
  return (dot === -1 ? null : MIME[file.slice(dot).toLowerCase()]) ?? 'application/octet-stream';
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
    decoded = decodeURIComponent(pathname.split('?')[0].split('#')[0]);
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

/** True when `pathname` is one of the paths STATIC_ROOTS owns. */
export function isStaticPath(pathname) {
  const first = pathname.replace(/^\/+/, '').split('/')[0];
  if (first === '') return true; // the portal at /
  return STATIC_ROOTS.includes(first);
}
