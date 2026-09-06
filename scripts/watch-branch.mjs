#!/usr/bin/env node
/**
 * Serve the build, and rebuild it whenever THIS CHECKOUT'S HEAD MOVES.
 *
 * `watch.bat` is this with a free port found and the browser opened, and it is
 * the form this is meant to be used in: leave the window open, leave the page
 * open, and the page follows `development` on its own. `pnpm feature land`
 * fast-forwards the main checkout as its last act before the teardown
 * (scripts/feature/land.mjs), so the ref moves a second or two after the push;
 * this notices, rebuilds, and tells every page it is serving to reload.
 *
 * HEAD AND NOT `refs/heads/development`, though in the main checkout — which
 * stands on `development` — they are the same ref. The thing being BUILT is a
 * checkout, so the thing being WATCHED has to be whatever that checkout is
 * standing on, or a copy of this run in a worktree would rebuild the feature
 * branch every time somebody else's work landed on development. The banner names
 * the branch it found.
 *
 * IT IS NOT `pnpm dev`, and the two watch different things. Astro's dev server
 * watches FILES and reloads on a save, which is the loop to WORK in. This watches
 * the BRANCH and serves a real `dist/`, which is the loop to READ in while
 * changes land from somewhere else — a worktree, the Editor, another machine.
 *
 * IT IS NOT `pnpm preview` EITHER, and the difference is one script tag. This
 * puts the reload channel into every HTML response before `</body>`, so what is
 * served here is the deployed document plus that. Nothing else is changed, but a
 * rendering question should still be asked of `pnpm preview`, which serves the
 * document and nothing added to it.
 *
 *   pnpm watch              — port 4321
 *   pnpm watch 4400         — or wherever
 *
 * No `--` before the port. pnpm 11 forwards it through as a literal argument, so
 * argv[2] would be "--" and the port NaN — the same trap serve-dist.mjs carries.
 */

import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { contentType, deployedFile } from './static-tree.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = fileURLToPath(new URL('../dist', import.meta.url));
const port = Number(process.argv[2] ?? process.env.PORT ?? 4321);

/** Where a served page listens for "there is a new build". */
const CHANNEL = '/__watch';

/** How often HEAD is asked for. A land takes the better part of a minute, so
 *  this is not a race — it is only how long after one the page turns over. */
const POLL = 2000;

/** How long a restored reading place is followed for. See RELOAD below. */
const SETTLE = 1500;

/** @param {string} line */
const say = (line) => console.log(`watch: ${line}`);

// ------------------------------------------------------------------------ git

/**
 * The commit this checkout is standing on, or null.
 *
 * `git rev-parse` and not a read of `.git/HEAD`: the file is one read, but
 * resolving what it says is four cases — a loose ref in this worktree's own git
 * dir, a loose ref in the common one, `packed-refs`, or a detached sha — and git
 * already knows all four. A process every couple of seconds is cheaper than
 * being wrong about one of them.
 */
function head() {
  const out = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  const sha = (out.stdout ?? '').trim();
  return /^[0-9a-f]{40}$/.test(sha) ? sha : null;
}

/** The branch this checkout is on, or null on a detached HEAD. */
function branch() {
  const out = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root, encoding: 'utf8' });
  const name = (out.stdout ?? '').trim();
  return name === '' || name === 'HEAD' ? null : name;
}

/** @param {string} sha */
function subject(sha) {
  const out = spawnSync('git', ['log', '-1', '--format=%s', sha], { cwd: root, encoding: 'utf8' });
  return (out.stdout ?? '').trim();
}

// ------------------------------------------------------- the page's other end

/**
 * The reload channel, put into every HTML response before `</body>`.
 *
 * TWO THINGS, and the second is what makes this usable rather than merely
 * correct. It listens for a new build and reloads; and it puts the reader back
 * where they were, as a SECTION AND AN OFFSET INTO IT rather than as a scroll
 * position. A rebuild can change the document's height — a Section mounts on
 * approach and its pictures arrive after that — so a raw `scrollY` saved and put
 * back lands somewhere else on the page.
 *
 * And the landing is FOLLOWED rather than done once, for exactly the reason the
 * deep link's jump in Shell.astro is: the Sections above this one change height
 * as they mount. `placed` is where we last put the reader and `at` is where the
 * target was when we did — a layout shift moves `at` and leaves `placed` alone, a
 * reader moves `placed` and leaves `at` alone, and that is what tells the two
 * apart. Inside the landing band the snapping pulls each landing onto the nearest
 * port, which is where the reader was resting anyway.
 *
 * `scrollRestoration` goes to `manual` for the one navigation this causes and
 * straight back afterwards, so the browser's own restore is not fighting this
 * one over the same frames.
 */
const RELOAD = `<script>/* pnpm watch — the reload channel. NOT in the deployed page. */
(() => {
  const KEY = 'pnpm-watch:place';

  const place = () => {
    let found = null;
    for (const section of document.querySelectorAll('[data-section]')) {
      if (!section.id) continue;
      const top = Math.round(section.getBoundingClientRect().top + scrollY);
      if (found !== null && top > scrollY) break;
      found = { id: section.id, into: Math.round(scrollY - top) };
    }
    return found;
  };

  const restore = (saved) => {
    let placed = -1;
    let at = -1;
    const land = () => {
      const target = document.getElementById(saved.id);
      if (!target) return false;
      if (placed >= 0 && Math.round(scrollY) !== placed) return false;
      const top = Math.round(target.getBoundingClientRect().top + scrollY);
      if (top !== at) {
        scrollTo(0, Math.max(0, top + saved.into));
        placed = Math.round(scrollY);
        at = top;
      }
      return true;
    };
    land();
    const until = performance.now() + ${SETTLE};
    const follow = () => {
      if (land() && performance.now() < until) requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
  };

  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    sessionStorage.removeItem(KEY);
    if (saved && saved.path === location.pathname) restore(saved);
    history.scrollRestoration = 'auto';
  } catch {}

  const source = new EventSource(${JSON.stringify(CHANNEL)});
  source.addEventListener('reload', () => {
    try {
      const here = place();
      if (here) sessionStorage.setItem(KEY, JSON.stringify({ id: here.id, into: here.into, path: location.pathname }));
      history.scrollRestoration = 'manual';
    } catch {}
    location.reload();
  });
})();
</script>
`;

/** @param {string} file */
function withReloadChannel(file) {
  const source = readFileSync(file, 'utf8');
  const close = source.lastIndexOf('</body>');
  return close === -1 ? source + RELOAD : source.slice(0, close) + RELOAD + source.slice(close);
}

// --------------------------------------------------------------- the readers

/** @type {Set<import('node:http').ServerResponse>} */
const readers = new Set();

/** @param {string} line */
function broadcast(line) {
  for (const reader of readers) {
    // A reader whose socket has gone without the 'close' having landed yet would
    // otherwise throw here and take the rebuild down with it.
    try {
      reader.write(line);
    } catch {
      readers.delete(reader);
    }
  }
}

// ---------------------------------------------------------------- rebuilding

/** `pnpm build`, streamed to this console. Resolves true when it passed. */
function build() {
  return new Promise((resolve) => {
    // `shell: true` because pnpm on Windows is a .cmd, which spawn will not run
    // on its own — it fails with EINVAL rather than with anything that names the
    // cause.
    const child = spawn('pnpm', ['build'], { cwd: root, shell: true, stdio: 'inherit' });
    child.on('error', () => resolve(false));
    child.on('exit', (code) => resolve(code === 0));
  });
}

let seen = head();
/** @type {string | null} */
let queued = null;
let building = false;

async function drain() {
  if (building) return;
  building = true;
  while (queued !== null) {
    const sha = queued;
    queued = null;
    say(`${sha.slice(0, 7)}  ${subject(sha)}`);
    console.log('');
    const passed = await build();
    console.log('');
    // Moved again while that build was running: what came out of it is already a
    // build behind, so it is not shown and the loop goes round instead.
    if (queued !== null) {
      say('the branch moved again while that was building — going round again.');
      continue;
    }
    if (passed) {
      say('rebuilt. Reloading every page open on this server.');
      broadcast('event: reload\ndata: {}\n\n');
    } else {
      say('THE BUILD FAILED — the output above says why.');
      say('Still serving the last build that worked, and still watching.');
    }
  }
  building = false;
}

// ------------------------------------------------------------------ standing

const on = branch();
say(`${root}`);
say(`following ${on ?? 'HEAD'} — a commit landing on it rebuilds this and reloads the page.`);
console.log('');

if (!(await build())) {
  console.log('');
  try {
    statSync(dist);
  } catch {
    say('the build failed and there is no dist/ to fall back on, so nothing is being served.');
    process.exit(1);
  }
  say('THE BUILD FAILED. Serving the dist/ that was already there, which is older than this tree.');
}

createServer((request, response) => {
  const url = request.url ?? '/';

  if ((url.split(/[?#]/)[0] ?? '') === CHANNEL) {
    response.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-store',
      connection: 'keep-alive',
    });
    response.write('retry: 1000\n\n');
    readers.add(response);
    request.on('close', () => readers.delete(response));
    return;
  }

  const file = deployedFile(dist, url, { statSync });
  if (!file) {
    response.statusCode = 404;
    response.end('not found\n');
    return;
  }

  const type = contentType(file);
  // NOTHING IS CACHED, and that is the point of this server rather than an
  // oversight. A reload has to fetch the build that has just replaced the one
  // the reader is looking at, and this sends no validator for a browser to
  // revalidate a held copy against.
  response.setHeader('cache-control', 'no-store');
  response.setHeader('content-type', type);

  if (type.startsWith('text/html')) {
    // Read whole rather than streamed, because the channel goes in before the
    // last `</body>` — and a read that fails is a file a rebuild removed between
    // the stat and here, which is a dropped request and not a dead server.
    try {
      response.end(withReloadChannel(file));
    } catch {
      response.destroy();
    }
    return;
  }

  createReadStream(file)
    .on('error', () => response.destroy())
    .pipe(response);
}).listen(port, () => {
  say(`http://localhost:${port}/portfolio`);
});

// Long enough to be idle and short enough to keep a proxy or a sleeping adapter
// from deciding the connection is dead. A comment frame: the page never sees it.
setInterval(() => broadcast(': ping\n\n'), 25000);

setInterval(() => {
  const sha = head();
  if (sha === null || sha === seen) return;
  seen = sha;
  queued = sha;
  void drain();
}, POLL);
