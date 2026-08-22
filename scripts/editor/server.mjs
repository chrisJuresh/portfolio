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
 * WHAT IT WILL WRITE. One file per Section, named `content.ts`, chosen by
 * `lib/sections.mjs` from a Section NAME. Nothing on the wire ever becomes a
 * path. ADR 0004 is the rule; that module is the mechanism.
 */

import { spawnSync } from 'node:child_process';
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { contentType, resolveFile } from '../static-tree.mjs';
import { Refused } from './lib/content.mjs';
import { publish } from './lib/publish.mjs';
import { put, readAll } from './lib/sections.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));

/**
 * The route the Portfolio's new foundation is served at, until the ticket that
 * flips it. `scripts/checks/lib/page.mjs` holds the Checks' own copy — this one
 * is the tool's, so the Editor does not depend on the test harness for it.
 */
export const PAGE = '/next';

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

const CLIENT = {
  '/client.js': { file: 'client/editor.js', type: 'text/javascript; charset=utf-8' },
  '/client.css': { file: 'client/editor.css', type: 'text/css; charset=utf-8' },
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
function baselineOf(sectionsRoot) {
  const baseline = new Map();
  for (const { section, fields } of readAll(sectionsRoot)) {
    baseline.set(section, new Map(fields.map((field) => [field.key, field.value])));
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
 * @param {string} options.sectionsRoot   absolute path of src/sections
 * @param {string} options.repoRoot       the repository Publish commits in
 * @param {number} [options.port]         0 for an ephemeral one
 * @param {boolean} [options.canPublish]  false makes Publish refuse, for the Check
 * @returns {Promise<{ origin: string, port: number, close: () => Promise<void> }>}
 */
export async function start({ dist, sectionsRoot, repoRoot, port = 0, canPublish = true }) {
  // Read once, at startup, and never again: this is what the served build says.
  const baseline = baselineOf(sectionsRoot);
  const sectionsRelative = relative(repoRoot, sectionsRoot).replace(/\\/g, '/');

  const git = (args) => {
    const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return {
      status: result.status ?? -1,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? String(result.error?.message ?? ''),
    };
  };

  /** Current values from disk, paired with what the build put on the page. */
  const state = () => ({
    sections: readAll(sectionsRoot).map(({ section, fields }) => ({
      section,
      fields: fields.map(({ key, value }) => ({
        key,
        value,
        built: baseline.get(section)?.get(key) ?? null,
      })),
    })),
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

      // An unknown route is a 404 before it is a wrong method, or a mistyped
      // GET comes back as "POST only" and reads like a route that exists.
      if (rest !== '/content' && rest !== '/publish') {
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
        const written = put(sectionsRoot, section, key, value);
        return sendJson(response, 200, {
          section,
          key: written.key,
          value: written.value,
          changed: written.changed,
          file: relative(repoRoot, written.file).replace(/\\/g, '/'),
        });
      }

      if (rest === '/publish') {
        if (!canPublish) throw new Refused('this Editor was started with publishing off');
        const { message } = await readBody(request);
        return sendJson(response, 200, await publish({ run: git, sections: sectionsRelative, message }));
      }

    }

    if (request.method !== 'GET' && request.method !== 'HEAD') return send(response, 405, 'GET only');

    const file = resolveFile(dist, path, { statSync });
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
