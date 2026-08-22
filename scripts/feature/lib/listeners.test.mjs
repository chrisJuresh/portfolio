import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fromLsof, fromNetstat } from './listeners.mjs';

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
