import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { BROWSERS_REFUSE, FIRST, choosePort, free } from './ports.mjs';

/** Every port is free, and nothing is recorded. */
const anything = { isFree: () => true, taken: new Set() };

test('the first feature gets the first port', async () => {
  assert.equal(await choosePort(anything), FIRST);
});

test('a second feature gets the next one, so two in flight do not collide', async () => {
  // `taken` is what the state file says other features hold. It is consulted
  // before the socket is, because a dev server that has crashed leaves its port
  // free while the feature that owns it is still live — and handing the same
  // port to a second feature would make the first one's URL point at the second
  // one's tree the moment it was restarted.
  assert.equal(await choosePort({ ...anything, taken: new Set([FIRST]) }), FIRST + 1);
  assert.equal(await choosePort({ ...anything, taken: new Set([FIRST, FIRST + 1]) }), FIRST + 2);
});

test('a port something else is listening on is stepped over', async () => {
  const busy = new Set([FIRST, FIRST + 1]);
  assert.equal(await choosePort({ taken: new Set(), isFree: (port) => !busy.has(port) }), FIRST + 2);
});

test('the ports a browser refuses to fetch from are never offered', async () => {
  // A dev server on one of these answers a curl and fails every page load with
  // net::ERR_UNSAFE_PORT, which reads like a broken tree. scripts/checks/lib/
  // serve.mjs hits the same list from the other direction.
  const refused = [...BROWSERS_REFUSE][0];
  assert.ok(refused !== undefined && refused > 1024, 'the list is of ports an allocation can land on');
  assert.notEqual(await choosePort({ ...anything, from: refused }), refused);
});

test('choosePort gives up rather than scanning to 65535', async () => {
  await assert.rejects(() => choosePort({ taken: new Set(), isFree: () => false }), /no free port/);
});

test('free reports true for a port nothing holds and false for one held', async () => {
  // The one impure thing in here, tested because "is this port free" answering
  // wrongly is the failure that hands two features one port.
  const server = createServer(() => {});
  await new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(undefined)));
  const bound = server.address();
  assert.ok(bound !== null && typeof bound !== 'string', 'the server bound a TCP port');
  const held = bound.port;
  try {
    assert.equal(await free(held), false, `${held} is held by this test`);
  } finally {
    await new Promise((ok) => server.close(ok));
  }
  assert.equal(await free(held), true, `${held} was released`);
});
