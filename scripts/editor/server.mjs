/**
 * The Editor's server: the real Portfolio, with the Editor on top of it.
 *
 * WHAT IT SERVES. `dist/` OF THE TREE IT WAS GIVEN, exactly as the deployment
 * would — the same resolver `pnpm preview` and the Checks use — with one script
 * and one stylesheet injected into each HTML response. So the page the author
 * clicks on is the built Portfolio and not a copy of it, and nothing about the
 * Editor exists in `dist/` itself: the injection happens in this response, on
 * this origin, and `scripts/` is not among the paths a build assembles.
 *
 * WHAT IT WRITES, part two. Tokens, through `lib/tokens.mjs`, on their own route
 * — and the route is what chooses the file name (see sections.mjs), so a Content
 * edit cannot land in a stylesheet however it is addressed. A Token's controls are
 * DISCOVERED: nothing here lists them, the Section's own `tokens.css` does, so a
 * Section that promotes a new number gets a control for free.
 *
 * THE BASELINE, WHICH IS THE ONE SUBTLE THING IN HERE. The served page is a
 * build, so its words are the Content as it stood when that build ran. The
 * Editor's client has to do two different things with a Content value: FIND the
 * element on the page, which needs the words the build put there, and DISPLAY the
 * current value, which after an edit is something else. So this captures every
 * Content value at startup — that is the `built` half of each field — and reads
 * the current half off disk on every request. A field whose `built` value is not
 * on the page is reported as not found rather than silently unbound, which is
 * also how a stale `--no-build` dist announces itself.
 *
 * A TOKEN HAS A BASELINE TOO, for a different reason: it is what "return this to
 * what it was before the session" means, and it is also where each control's
 * RANGE comes from. Deriving the range from the current value instead would move
 * the slider under the author's own finger as they dragged it.
 *
 * WHAT IT WRITES, part three, AND THE SECOND SPEED. A Bake's parameters, on
 * their own route. A Token moves the page in the frame it is dragged in; a baked
 * parameter moves nothing until a Python generator has run, so `/bake` writes the
 * number and `/bake/run` starts the generator and answers immediately with an
 * id. The surface polls `/bakes`. When a run succeeds the tree is REBUILT and both
 * baselines are recaptured, which is what makes the page show the new asset — see
 * `rebuild`, where the recapture is the part that is not optional.
 *
 * WHAT IT WILL WRITE. Two files per Section, named `content.ts` and `tokens.css`,
 * a Tokens file per part of the Kernel, and a `params.json` per Bake — every one
 * of them chosen by `lib/sections.mjs` from a NAME. Nothing on the wire ever
 * becomes a path, and a Bake's `recipe.json` is not writable at all. ADR 0004 is
 * the rule; that module is the mechanism.
 */

import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { contentType, deployedFile } from '../static-tree.mjs';
import { terms } from './lib/annotations.mjs';
import { command, effective, moved } from './lib/bakes.mjs';
import { Refused } from './lib/content.mjs';
import { publish } from './lib/publish.mjs';
import { Runs } from './lib/runs.mjs';
import {
  discoverBakes,
  paramsOf,
  put,
  putOverride,
  putParam,
  putToken,
  readAll,
  readAllTokens,
  readOverrides,
  recipeOf,
} from './lib/sections.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));

/**
 * The route the Portfolio is served at. `scripts/checks/lib/page.mjs` holds the
 * Checks' own copy — this one is the tool's, so the Editor does not depend on
 * the test harness for it.
 */
export const PAGE = '/portfolio';

/** Where the Editor's own two files answer, and the prefix nothing in dist uses. */
const MOUNT = '/__editor';

/**
 * A header no cross-origin form or image can set.
 *
 * This server writes source files and answers on localhost, so any page in any
 * browser tab can reach it. A simple POST is not subject to a preflight, so a
 * drive-by page could otherwise post to it; requiring a custom header means the
 * browser must preflight, and nothing here answers a preflight. Cheap, and the
 * alternative is a tool that edits the repository on anyone's say-so.
 */
const HANDSHAKE = 'x-editor';

/** Room for the longest Content string and its JSON, and nothing like a file. */
const LONGEST_BODY = 64 * 1024;

/** Every route that changes something, and therefore needs the handshake. */
const WRITES = new Set(['/content', '/tokens', '/overrides', '/bake', '/bake/run', '/publish']);

/**
 * What is run to bring the served build up to date after a bake.
 *
 * THE WHOLE BUILD AND NOT A COPY, because a baked asset reaches the page two
 * different ways and only one of them survives a copy: the corner pictures are
 * fetched at run time by `corners.ts` and land in `dist/` with the static tree,
 * while the two Texturelabs plates are named in a `url()` and are fingerprinted
 * into the bundle. Assembling alone would show the new plate for one of those
 * and the old one for the other, which is the quietest possible wrong answer.
 */
const REBUILD = ['build'];

/**
 * The Editor's own files, and the two library modules the surface shares with the
 * boundary.
 *
 * `lib/tokens.mjs` is served to the browser on purpose. It has no node imports —
 * only `Refused` out of `lib/content.mjs`, which has none either — so the surface
 * can import the very functions that decide what control a value asks for and how
 * a number is written back. Two spellings of "0.1 + 0.2 is 0.3rem", one in node
 * and one in the browser, is exactly the kind of disagreement this repository
 * pays for elsewhere; this is one spelling, used by both.
 */
const CLIENT = {
  '/client.js': { file: 'client/editor.js', type: 'text/javascript; charset=utf-8' },
  '/tokens.js': { file: 'client/tokens.js', type: 'text/javascript; charset=utf-8' },
  '/measure.js': { file: 'client/measure.js', type: 'text/javascript; charset=utf-8' },
  '/client.css': { file: 'client/editor.css', type: 'text/css; charset=utf-8' },
  '/bakes.js': { file: 'client/bakes.js', type: 'text/javascript; charset=utf-8' },
  '/changes.js': { file: 'client/changes.js', type: 'text/javascript; charset=utf-8' },
  '/lib/tokens.mjs': { file: 'lib/tokens.mjs', type: 'text/javascript; charset=utf-8' },
  '/lib/bakes.mjs': { file: 'lib/bakes.mjs', type: 'text/javascript; charset=utf-8' },
  '/lib/content.mjs': { file: 'lib/content.mjs', type: 'text/javascript; charset=utf-8' },
  '/lib/annotations.mjs': { file: 'lib/annotations.mjs', type: 'text/javascript; charset=utf-8' },
  '/lib/changes.mjs': { file: 'lib/changes.mjs', type: 'text/javascript; charset=utf-8' },
  '/lib/corners.mjs': { file: 'lib/corners.mjs', type: 'text/javascript; charset=utf-8' },
  '/lib/boxes.mjs': { file: 'lib/boxes.mjs', type: 'text/javascript; charset=utf-8' },
  '/lib/typefit.mjs': { file: 'lib/typefit.mjs', type: 'text/javascript; charset=utf-8' },
  '/lib/overrides.mjs': { file: 'lib/overrides.mjs', type: 'text/javascript; charset=utf-8' },
};

function send(response, status, body, type = 'text/plain; charset=utf-8') {
  response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  response.end(body);
}

const sendJson = (response, status, value) =>
  send(response, status, JSON.stringify(value), 'application/json; charset=utf-8');

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > LONGEST_BODY) throw new Refused('that request is larger than any Content edit');
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    return text === '' ? {} : JSON.parse(text);
  } catch {
    throw new Refused('that request is not JSON');
  }
}

/** Every Content value as it stood when the served build was made. */
function baselineOf(roots) {
  const baseline = new Map();
  for (const { section, fields } of readAll(roots)) {
    baseline.set(section, new Map(fields.map((field) => [field.key, field.value])));
  }
  return baseline;
}

/** Every Token as it stood before the session — what a control can be returned
 *  to, and what its range is derived from. */
function tokenBaselineOf(roots) {
  const baseline = new Map();
  for (const { section, tokens } of readAllTokens(roots)) {
    baseline.set(section, new Map(tokens.map((token) => [token.key, token.value])));
  }
  return baseline;
}

/**
 * The Editor's two files, in front of every HTML response.
 *
 * Before `</body>` so the page's own scripts and its markup are both already
 * there, and appended if a document somehow has no closing tag rather than
 * silently doing nothing.
 */
function inject(html) {
  const tags =
    `<link rel="stylesheet" href="${MOUNT}/client.css" data-editor />` +
    `<script type="module" src="${MOUNT}/client.js" data-editor></script>`;
  const close = html.lastIndexOf('</body>');
  return close === -1 ? html + tags : html.slice(0, close) + tags + html.slice(close);
}

/**
 * Start the Editor.
 *
 * @param {object} options
 * @param {string} options.dist          the built tree to serve
 * @param {{ sections: string, kernel: string, bakes: string, overrides: string }} options.roots  the four the Editor reads
 * @param {string} options.repoRoot       the repository Publish commits in
 * @param {number} [options.port]         0 for an ephemeral one
 * @param {boolean} [options.canPublish]  false makes Publish refuse, for the Check
 * @param {boolean} [options.canBake]     false makes a re-bake refuse, for the Check
 * @returns {Promise<{ origin: string, port: number, close: () => Promise<void> }>}
 */
export async function start({ dist, roots, repoRoot, port = 0, canPublish = true, canBake = true }) {
  // Read at startup: this is what the served build says. A bake rebuilds, so
  // both are recaptured after one — see `rebuild`, and the note above it.
  let baseline = baselineOf(roots);
  let wasToken = tokenBaselineOf(roots);
  const relatively = (path) => relative(repoRoot, path).split(sep).join('/');
  const relativeRoots = {
    sections: relatively(roots.sections),
    kernel: relatively(roots.kernel),
    overrides: relatively(roots.overrides),
  };
  // The glossary, read once: an Annotation names an element in CONTEXT.md’s own
  // words, and that file is the authority for them. Missing is not an error — the
  // Annotation then says it could not name the part, which is true.
  const glossary = (() => {
    try {
      return terms(readFileSync(join(repoRoot, 'CONTEXT.md'), 'utf8'));
    } catch {
      return [];
    }
  })();
  const runs = new Runs();

  const git = (args) => {
    const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return {
      status: result.status ?? -1,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? String(result.error?.message ?? ''),
    };
  };

  /** Current values from disk, paired with what the build put on the page. The
   *  Bakes are not in here: they are polled while a generator runs, and this
   *  re-reads every Content and Tokens file in the tree. */
  const state = () => ({
    glossary,
    // Read per request rather than captured at startup: an Override written a
    // moment ago has to be in the list, which is the whole of "Overrides are
    // visible somewhere the author will see them".
    overrides: readOverrides(roots),
    sections: readAll(roots).map(({ section, fields }) => ({
      section,
      fields: fields.map(({ key, value }) => ({
        key,
        value,
        built: baseline.get(section)?.get(key) ?? null,
      })),
    })),
    tokens: readAllTokens(roots).map(({ section, tokens }) => ({
      section,
      // What the file says, and what it said before the session. WHAT CONTROL to
      // draw for it is the surface's decision and is made there — out of the same
      // `control()` this module could have called, because the surface imports the
      // boundary rather than carrying a copy of it.
      tokens: tokens.map((token) => ({
        key: token.key,
        selector: token.selector,
        ruleNote: token.ruleNote,
        property: token.property,
        value: token.value,
        was: wasToken.get(section)?.get(token.key) ?? token.value,
        group: token.group,
        note: token.note,
      })),
    })),
  });

  /**
   * Every Bake, its parameters at their effective values, and how its last run
   * went.
   *
   * A recipe that cannot be read is REPORTED AS ONE rather than taken down with
   * the rest of the surface: a Bake is authored JSON, so a broken one is a
   * mistake somebody wants to see named, and four working Bakes disappearing
   * because a fifth has a trailing comma in it is the worst way to say so.
   */
  const bakes = () =>
    discoverBakes(roots.bakes).map((name) => {
      const run = runs.latest().find((one) => one.bake === name) ?? null;
      const report = run && {
        id: run.id,
        state: run.state,
        why: run.why,
        log: run.log,
        argv: run.argv,
        ms: (run.ended ?? Date.now()) - run.started,
      };
      try {
        const read = recipeOf(roots, name);
        const held = paramsOf(roots, name);
        const now = effective(read, held);
        const off = new Set(moved(read, held));
        return {
          name,
          title: read.title,
          note: read.note,
          needs: read.needs,
          shows: read.shows,
          // What pressing Re-bake will actually run, so the author can read it
          // before pressing it and can type it into a shell instead.
          argv: command(read, now),
          params: read.params.map((param) => ({
            key: param.key,
            label: param.label,
            note: param.note,
            group: param.group,
            groupNote: param.groupNote,
            options: param.options,
            min: param.min,
            max: param.max,
            step: param.step,
            // `was` is the recipe's own default, which is what "put this back"
            // means here — the Tokens surface's `was` is the session's opening
            // value, and these two are different things on purpose: a Bake's
            // default lives in a committed file and does not move under a
            // session, so it is the honest thing to return to.
            was: param.value,
            value: now[param.key],
            moved: off.has(param.key),
          })),
          run: report,
        };
      } catch (error) {
        return { name, error: String(error?.message ?? error), run: report };
      }
    });

  /**
   * Bring the served build up to date, and recapture what it was made from.
   *
   * RECAPTURING IS NOT OPTIONAL. The Content baseline is "what the served build
   * says", and the whole binding of an element to a Content key is made against
   * it — so a rebuild that left the old baseline standing would report every
   * field edited this session as not found on the page. Rebuilding and
   * recapturing are one operation for that reason.
   */
  const rebuild = () =>
    new Promise((ok, no) => {
      // SPAWNED AND NOT spawnSync, and this is the one line in here that has to
      // stay asynchronous. A build is ten to twenty seconds; running it
      // synchronously blocks this server's whole event loop for that long, so
      // the surface's poll cannot be answered, the keep-alive it is on times out
      // the moment the loop is given back, and the page sees ECONNRESET rather
      // than "baking". Which is also just the Editor freezing while the author
      // watches it.
      const built = spawn('pnpm', REBUILD, {
        cwd: repoRoot,
        shell: true,
        windowsHide: true,
      });
      let said = '';
      const keep = (chunk) => {
        said += chunk;
      };
      built.stdout?.setEncoding('utf8');
      built.stderr?.setEncoding('utf8');
      built.stdout?.on('data', keep);
      built.stderr?.on('data', keep);
      built.on('error', (error) => no(new Error(`could not run pnpm ${REBUILD.join(' ')} — ${error.message}`)));
      built.on('close', (code) => {
        if (code !== 0) {
          const tail = said.trim().split(/\r?\n/).slice(-4).join(' / ');
          no(new Error(tail || `pnpm ${REBUILD.join(' ')} exited ${code}`));
          return;
        }
        baseline = baselineOf(roots);
        wasToken = tokenBaselineOf(roots);
        ok();
      });
    });

  const server = createServer((request, response) => {
    void handle(request, response).catch((error) => {
      if (!response.headersSent) {
        sendJson(response, error instanceof Refused ? 400 : 500, { error: String(error?.message ?? error) });
      }
    });
  });

  async function handle(request, response) {
    const path = (request.url ?? '/').split('?')[0];

    if (path.startsWith(`${MOUNT}/`)) {
      const rest = path.slice(MOUNT.length);

      const asset = CLIENT[rest];
      if (asset) {
        if (request.method !== 'GET') return send(response, 405, 'GET only');
        return send(response, 200, readFileSync(join(here, asset.file), 'utf8'), asset.type);
      }

      if (rest === '/state') {
        if (request.method !== 'GET') return send(response, 405, 'GET only');
        return sendJson(response, 200, state());
      }

      // The Bakes on their own, because this one is POLLED while a generator
      // runs and `/state` re-reads every Content and Tokens file in the tree.
      if (rest === '/bakes') {
        if (request.method !== 'GET') return send(response, 405, 'GET only');
        return sendJson(response, 200, { bakes: bakes() });
      }

      // An unknown route is a 404 before it is a wrong method, or a mistyped
      // GET comes back as "POST only" and reads like a route that exists.
      if (!WRITES.has(rest)) {
        return send(response, 404, `no such Editor route: ${rest}`);
      }

      // Everything that changes something needs the handshake header.
      if (request.method !== 'POST') return send(response, 405, 'POST only');
      if (request.headers[HANDSHAKE] !== '1') {
        return sendJson(response, 403, {
          error: `a write to the Editor needs the ${HANDSHAKE} header — this request did not come from the Editor`,
        });
      }

      if (rest === '/content') {
        const { section, key, value } = await readBody(request);
        const written = put(roots, section, key, value);
        return sendJson(response, 200, {
          section,
          key: written.key,
          value: written.value,
          changed: written.changed,
          file: relative(repoRoot, written.file).replace(/\\/g, '/'),
        });
      }

      // The route is what decides which file name is written, which is why there
      // are two of these and not one with a kind in the body.
      if (rest === '/tokens') {
        const { section, key, value } = await readBody(request);
        const written = putToken(roots, section, key, value);
        return sendJson(response, 200, {
          section,
          key: written.key,
          value: written.value,
          changed: written.changed,
          file: relative(repoRoot, written.file).replace(/\\/g, '/'),
        });
      }

      // A Bake's parameter. The route decides the file, as everywhere else here:
      // this one reaches a params.json and can reach nothing else, and it cannot
      // reach a recipe at all — that is the declaration, and it is authored.
      if (rest === '/bake') {
        const { bake, key, value } = await readBody(request);
        const written = putParam(roots, bake, key, value);
        return sendJson(response, 200, {
          bake,
          key: written.key,
          value: written.value,
          changed: written.changed,
          file: relatively(written.file),
        });
      }

      // THE SECOND SPEED. This answers as soon as the generator has started, and
      // the surface polls /bakes for how it is going — a bake is fifteen seconds
      // of Cycles or two minutes of Pillow, and holding a request open for that
      // is a request that times out somewhere and a page that says nothing.
      if (rest === '/bake/run') {
        if (!canBake) throw new Refused('this Editor was started with re-baking off');
        const { bake } = await readBody(request);
        const read = recipeOf(roots, bake);
        const argv = command(read, effective(read, paramsOf(roots, bake)));
        const already = runs.running(bake);
        if (already) {
          throw new Refused(
            `${bake} is already baking — one at a time per Bake, because two runs of one generator` +
              ' race for the same output files',
          );
        }
        const run = runs.start({ bake, argv, cwd: repoRoot, after: rebuild });
        return sendJson(response, 200, { bake, id: run.id, argv });
      }

      // The fourth route, and the fourth family of file. An Override carries a
      // selector and some declarations and never a holder's name, because it
      // belongs to none — and no declarations at all is how one is discarded.
      if (rest === '/overrides') {
        const { selector, name, note, declarations } = await readBody(request);
        const written = putOverride(roots, { selector, name, note, declarations });
        return sendJson(response, 200, {
          selector: written.selector,
          changed: written.changed,
          overrides: written.overrides,
          file: relatively(written.file),
        });
      }

      if (rest === '/publish') {
        if (!canPublish) throw new Refused('this Editor was started with publishing off');
        const { message } = await readBody(request);
        return sendJson(response, 200, await publish({ run: git, roots: relativeRoots, message }));
      }

    }

    if (request.method !== 'GET' && request.method !== 'HEAD') return send(response, 405, 'GET only');

    const file = deployedFile(dist, path, { statSync });
    if (!file) return send(response, 404, 'not found\n');

    const type = contentType(file);
    if (type.startsWith('text/html')) {
      return send(response, 200, inject(readFileSync(file, 'utf8')), type);
    }
    response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
    createReadStream(file)
      .on('error', () => response.destroy())
      .pipe(response);
  }

  await new Promise((ok, no) => {
    server.once('error', no);
    server.listen(port, '127.0.0.1', ok);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('editor: no port');

  return {
    origin: `http://127.0.0.1:${address.port}`,
    port: address.port,
    close: () =>
      new Promise((ok) => {
        server.closeAllConnections();
        server.close(() => ok());
      }),
  };
}
