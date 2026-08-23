#!/usr/bin/env node
/**
 * Serve the assembled dist/ OF THE TREE THIS IS RUN FROM.
 *
 * That last part is the reason this exists rather than any off-the-shelf static
 * server: the in-app browser preview serves the main checkout, so in a worktree
 * it reports on `development` while appearing to report on the branch. Every
 * check in design/tools/ serves its own tree for the same reason.
 *
 * `cleanUrls`, as the deployment does, so a path that works here works there.
 *
 *   pnpm preview            — port 4321
 *   pnpm preview 4400       — or wherever
 *
 * No `--` before the port. pnpm 11 forwards it through as a literal argument,
 * so argv[2] is "--", the port is NaN and node throws ERR_SOCKET_BAD_PORT
 * before anything is served. `PORT=4400 pnpm preview` works too.
 */

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { contentType, deployedFile } from './static-tree.mjs';

const dist = fileURLToPath(new URL('../dist', import.meta.url));
const port = Number(process.argv[2] ?? process.env.PORT ?? 4321);

try {
  statSync(dist);
} catch {
  console.error('serve-dist: dist/ does not exist — run `pnpm build` first.');
  process.exit(1);
}

createServer((request, response) => {
  const file = deployedFile(dist, request.url ?? '/', { statSync });
  if (!file) {
    response.statusCode = 404;
    response.end('not found\n');
    return;
  }
  response.setHeader('content-type', contentType(file));
  // A read that fails after the stat — the file removed by a rebuild mid-request
  // — would otherwise take the whole server down on an unhandled 'error'.
  createReadStream(file)
    .on('error', () => response.destroy())
    .pipe(response);
}).listen(port, () => {
  console.log(`serve-dist: ${dist}\nserve-dist: http://localhost:${port}/portfolio`);
});
