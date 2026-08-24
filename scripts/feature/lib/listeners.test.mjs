import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fromLsof, fromNetstat, holders } from './listeners.mjs';

const NETSTAT = `
Active Connections

  Proto  Local Address          Foreign Address        State           PID
  TCP    127.0.0.1:4321         0.0.0.0:0              LISTENING       3628
  TCP    [::1]:4321             [::]:0                 LISTENING       3628
  TCP    127.0.0.1:4322         0.0.0.0:0              LISTENING       26140
  TCP    127.0.0.1:43210        0.0.0.0:0              LISTENING       999
  TCP    127.0.0.1:52001        127.0.0.1:4321         ESTABLISHED     7777
  UDP    0.0.0.0:5353           *:*                                    1234
`;

test('it finds the process listening on a port', () => {
  // The pid `feature start` recorded is the one it spawned, and astro's bin
  // spawns a child that is the one that actually binds — so the port is the only
  // handle on the server that is reliably true. That cost a teardown that
  // reported killing something and killed nothing.
  assert.deepEqual(fromNetstat(NETSTAT, 4321), [3628]);
  assert.deepEqual(fromNetstat(NETSTAT, 26140 === 0 ? 0 : 4322), [26140]);
});

test('a longer port that merely starts with the wanted one is not it', () => {
  // 43210 contains 4321. A substring match would kill an unrelated process.
  assert.deepEqual(fromNetstat(NETSTAT, 43210), [999]);
  assert.ok(!fromNetstat(NETSTAT, 4321).includes(999));
});

test('a connection TO the port is not a process listening on it', () => {
  // The ESTABLISHED line has :4321 as its FOREIGN address. Killing that pid
  // would kill whatever was looking at the page.
  assert.ok(!fromNetstat(NETSTAT, 4321).includes(7777));
});

test('nothing listening reads as nothing, not as an empty-string pid', () => {
  assert.deepEqual(fromNetstat(NETSTAT, 9999), []);
  assert.deepEqual(fromNetstat('', 4321), []);
});

test('the same pid on two address families is reported once', () => {
  // 127.0.0.1 and [::1] are two lines for one server.
  assert.equal(fromNetstat(NETSTAT, 4321).length, 1);
});

test('lsof gives pids one to a line', () => {
  assert.deepEqual(fromLsof('3628\n26140\n'), [3628, 26140]);
  assert.deepEqual(fromLsof(''), []);
  assert.deepEqual(fromLsof('\n\n'), []);
});

const NOTHING = { lock: null, onLockPort: [], lockPidAlive: false, recordedPort: null, onRecordedPort: [] };

test('it names the port and the pid the teardown could not otherwise say', () => {
  // The whole of #167's last acceptance criterion: `EBUSY` on its own sent two
  // sessions to `netstat -ano` by hand.
  const { rows, stop } = holders({
    ...NOTHING,
    lock: { port: 4322, pid: 10108 },
    onLockPort: [10108],
    lockPidAlive: true,
    recordedPort: 4322,
    onRecordedPort: [10108],
  });
  assert.deepEqual(rows, [
    { port: 4322, pid: 10108, from: 'astro’s lock file in this worktree', confirmed: true },
  ]);
  // One row, not two: the lock and the registry agreeing is one server.
  assert.deepEqual(stop, [4322]);
});

test('a port astro moved to is stopped as well as the one that was recorded', () => {
  // The pre-#167 registry row: it names the port that was ASKED for, and the
  // server is somewhere else. Stopping only the record is what left a server
  // running inside a worktree that then could not be removed.
  const { rows, stop } = holders({
    ...NOTHING,
    lock: { port: 4322, pid: 10108 },
    onLockPort: [10108],
    lockPidAlive: true,
    recordedPort: 4321,
    onRecordedPort: [],
  });
  assert.deepEqual(rows.map((row) => row.port), [4322]);
  assert.deepEqual(stop, [4321, 4322]);
});

test('a lock the socket does not confirm is named and never stopped', () => {
  // Astro deletes its lock on a clean stop, so one left behind is a dead
  // server — and its pid came out of a file, which the operating system may
  // have handed to somebody else since.
  const { rows, stop } = holders({
    ...NOTHING,
    lock: { port: 4322, pid: 10108 },
    onLockPort: [],
    lockPidAlive: true,
    recordedPort: null,
    onRecordedPort: [],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].confirmed, false);
  assert.match(rows[0].from, /does not confirm/);
  assert.deepEqual(stop, []);
});

test('a lock whose process is gone is not a holder at all', () => {
  const { rows, stop } = holders({
    ...NOTHING,
    lock: { port: 4322, pid: 10108 },
    onLockPort: [],
    lockPidAlive: false,
  });
  assert.deepEqual(rows, []);
  assert.deepEqual(stop, []);
});

test('a foreign process on the recorded port is described as exactly that', () => {
  // `listeners()` is machine-wide. Saying "inside the worktree" about a pid that
  // merely holds the number would send the author after the wrong process.
  const { rows } = holders({ ...NOTHING, recordedPort: 4321, onRecordedPort: [999] });
  assert.deepEqual(rows, [
    { port: 4321, pid: 999, from: 'the port this feature recorded', confirmed: true },
  ]);
});

test('nothing serving still leaves the recorded port worth a look', () => {
  const { rows, stop } = holders({ ...NOTHING, recordedPort: 4321 });
  assert.deepEqual(rows, []);
  assert.deepEqual(stop, [4321]);
});

test('no record and no lock asks nothing of anybody', () => {
  assert.deepEqual(holders(NOTHING), { rows: [], stop: [] });
});
