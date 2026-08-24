import assert from 'node:assert/strict';
import { test } from 'node:test';
import { announced, locked } from './astro.mjs';

/** What `dev-server.log` actually holds when astro decides it is being run by an
 *  agent: one JSON object a line, the message carrying embedded newlines. */
const JSON_LINE =
  '{"message":"Dev server running at http://127.0.0.1:4323 (pid 10108)\\n  Stop:   astro dev stop\\n  Status: astro dev status\\n  Logs:   astro dev logs","label":"SKIP_FORMAT","level":"info"}';

/** The same run in a plain terminal: astro stays in the foreground and prints
 *  its banner. `┃` is the box-drawing bar, and the colours are real SGR. */
const BANNER = [
  '',
  '\u001b[42m\u001b[1m astro \u001b[22m\u001b[49m \u001b[32mv7.2.4\u001b[39m \u001b[2mready in\u001b[22m 431 \u001b[2mms\u001b[22m',
  '',
  '\u001b[2m┃\u001b[22m Local    \u001b[36mhttp://127.0.0.1:4322/\u001b[39m',
  '\u001b[2m┃\u001b[22m Network  \u001b[2muse --host to expose\u001b[22m',
  '',
].join('\n');

test('it reads the port out of astro’s JSON line', () => {
  // The whole ticket: astro is the process that bound the socket, so its line is
  // the authority and the port `feature start` asked for is only a request.
  assert.deepEqual(announced(JSON_LINE), { port: 4323, pid: 10108 });
});

test('it reads the port out of the foreground banner too', () => {
  // Astro backgrounds itself only when it thinks an agent is running it. A
  // person typing `pnpm feature start` gets the banner instead, and a reader
  // that only understood JSON would report no server for every human run.
  assert.deepEqual(announced(BANNER), { port: 4322, pid: null });
});

test('it reads the plain background line, unwrapped by any logger', () => {
  assert.deepEqual(announced('Dev server running at http://localhost:4327 (pid 42)'), {
    port: 4327,
    pid: 42,
  });
});

test('an already-running server is still a server', () => {
  // `astro dev` prints this instead when its lock file says one is up. The port
  // is just as true, and reading it as nothing would report no server while one
  // was serving the tree.
  assert.deepEqual(announced('Dev server already running at http://127.0.0.1:4321 (pid 7)'), {
    port: 4321,
    pid: 7,
  });
});

test('the LAST announcement wins', () => {
  // The log is appended to, and a restarted server writes a second line. Taking
  // the first would hand the teardown a port that has since been given up.
  const log = ['Dev server running at http://127.0.0.1:4321 (pid 1)', '', BANNER].join('\n');
  assert.deepEqual(announced(log), { port: 4322, pid: null });
});

test('nothing announced reads as nothing', () => {
  assert.equal(announced(''), null);
  assert.equal(announced('watching for file changes...'), null);
  assert.equal(announced(undefined), null);
});

test('a line that is not JSON does not throw', () => {
  // Astro's own errors arrive on the same stream, and one that happens to start
  // with a brace would otherwise take the whole start down.
  assert.equal(announced('{ this is not json'), null);
});

test('a URL without a port is not a port', () => {
  // `http://localhost/` has no `:port`, and reading 80 out of nowhere would send
  // the teardown after somebody else's process.
  assert.equal(announced('Dev server running at http://localhost/ (pid 9)'), null);
});

test('it reads astro’s own lock file', () => {
  // The holder writes this itself, so it is the honest answer to "what is still
  // inside this worktree" when the removal fails with EBUSY.
  const lock = JSON.stringify({
    pid: 10108,
    port: 4323,
    url: 'http://127.0.0.1:4323',
    background: true,
    startedAt: '2026-08-24T16:19:31.842Z',
  });
  assert.deepEqual(locked(lock), { port: 4323, pid: 10108 });
});

test('a lock file that is missing, empty or half-written reads as nothing', () => {
  assert.equal(locked(''), null);
  assert.equal(locked(undefined), null);
  assert.equal(locked('{"pid":10108'), null);
  assert.equal(locked('{"pid":10108}'), null);
  assert.equal(locked('{"port":4323}'), null);
});
