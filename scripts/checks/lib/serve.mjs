import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { contentType, deployedFile } from '../../static-tree.mjs';

/**
 * Ports Chromium refuses to fetch from, whatever is listening on them.
 *
 * A request to one fails as `net::ERR_UNSAFE_PORT` before it reaches the socket,
 * so the whole suite fails with a navigation error and nothing to do with the
 * tree — and only about one run in a few hundred, because it depends on which
 * port the OS hands out. This is Chromium's own restricted list, reduced to the
 * ones an ephemeral allocation can actually land on. It cost a confusing failure
 * once; asking for another port is the entire fix.
 */
const CHROMIUM_REFUSES = new Set([
  1719, 1720, 1723, 2049, 3659, 4045, 4160, 5060, 5061, 6000, 6379, 6566, 6665, 6666, 6667, 6668,
  6669, 6679, 6697, 10080,
]);

/**
 * Serve the assembled `dist/` OF THE TREE THE RUNNER WAS INVOKED FROM.
 *
 * That is the whole reason this exists rather than the in-app preview: the
 * preview serves the main checkout, so in a worktree it reports on
 * `development` while appearing to report on the branch. `scripts/serve-dist.mjs`
 * makes the same argument at length; this is the same resolver behind an
 * ephemeral port and a promise, because a Check must not care which port is free
 * and two features running at once must not collide on one.
 *
 * @param {string} dist absolute path to the directory to serve
 * @returns {Promise<{ origin: string, close: () => Promise<void> }>}
 */
export async function serve(dist) {
  const server = createServer((request, response) => {
    const file = deployedFile(dist, request.url ?? '/', { statSync });
    if (!file) {
      response.statusCode = 404;
      response.end('not found\n');
      return;
    }
    response.setHeader('content-type', contentType(file));
    createReadStream(file)
      .on('error', () => response.destroy())
      .pipe(response);
  });

  // Port 0 rather than a fixed one, so two features running at once never
  // collide — and asked again when the OS lands on a port Chromium will not
  // fetch from.
  let address = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((ok, no) => {
      server.once('error', no);
      server.listen(0, '127.0.0.1', ok);
    });
    address = server.address();
    if (address === null || typeof address === 'string') throw new Error('serve: no port');
    if (!CHROMIUM_REFUSES.has(address.port)) break;
    await new Promise((ok) => server.close(() => ok()));
    address = null;
  }
  if (address === null) throw new Error('serve: 20 ephemeral ports in a row were ones Chromium refuses');

  return {
    origin: `http://127.0.0.1:${address.port}`,
    // Sockets Chromium is still holding keep `close` pending forever otherwise,
    // and a runner that has printed its report should not then hang.
    close: () =>
      new Promise((ok) => {
        server.closeAllConnections();
        server.close(() => ok());
      }),
  };
}
