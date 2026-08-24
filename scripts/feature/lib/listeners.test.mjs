import assert from 'node:assert/strict';
import { test } from 'node:test';
import { brief, fromCommandLines, fromLsof, fromNetstat, holders, standingIn } from './listeners.mjs';

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

// ------------------------------------------------- standing in the directory
//
// The commonest cause of a failed teardown here, and the one `EBUSY` never named
// (#168). `feature land` refuses to run from the main checkout, so the shell that
// invokes it has the worktree as its working directory on every single land — and
// on Windows that alone blocks the final rmdir while everything underneath
// deletes perfectly well.

const TREE = 'C:/Users/Chris/Desktop/portfolio/.claude/worktrees/panel';
const TAB = String.fromCharCode(9);

const PROCESSES = [
  ['4144', 'C:\\WINDOWS\\system32\\cmd.exe'],
  ['3628', `"C:\\Program Files\\nodejs\\node.exe" "${TREE}/node_modules/astro/bin/astro.mjs" dev`],
  ['9001', `node ${TREE}-two/node_modules/astro/bin/astro.mjs dev`],
  ['9002', 'node C:/Users/Chris/Desktop/portfolio/scripts/feature/cli.mjs land'],
  ['777', `cmd /c cd ${TREE}`],
]
  .map((row) => row.join(TAB))
  .join('\n');

const pids = (output, worktree, self) =>
  fromCommandLines(output, worktree, self)
    .map((one) => one.pid)
    .sort((a, b) => a - b);

test('a process launched from inside the worktree is named, with its pid', () => {
  // `astro dev` is spawned with an ABSOLUTE
  // `<worktree>/node_modules/astro/bin/astro.mjs`, so a server both port checks
  // missed still turns up here. That is the whole value of this half: Windows has
  // no working-directory property on `Win32_Process`, so the shell itself is not
  // in this output and never can be.
  assert.deepEqual(pids(PROCESSES, TREE), [777, 3628]);
});

test('a sibling worktree whose name merely starts with this one is not it', () => {
  // `…/worktrees/panel` is a prefix of `…/worktrees/panel-two`, which is somebody
  // else's feature. A substring match would report their dev server as ours.
  assert.ok(!pids(PROCESSES, TREE).includes(9001));
});

test('the main checkout is not inside the worktree, whatever the path spelling', () => {
  assert.ok(!pids(PROCESSES, TREE).includes(9002));
  // Backslashes, and a drive letter whose case is not stable between sources.
  assert.deepEqual(pids(PROCESSES, TREE.replace(/[/]/g, '\\').toUpperCase()), [777, 3628]);
});

test('this process is left out of its own report', () => {
  // True and useless: the teardown is running from inside the tree by design.
  assert.ok(!pids(PROCESSES, TREE, 3628).includes(3628));
});

test('nothing parseable reads as nothing', () => {
  assert.deepEqual(fromCommandLines('', TREE), []);
  assert.deepEqual(fromCommandLines('no tab here at all', TREE), []);
  // A tab in the first column is a line with no pid, not a pid of nothing.
  assert.deepEqual(fromCommandLines(`${TAB}${TREE}/x`, TREE), []);
});

test('the directory the command was run in is reported, and believed', () => {
  // The exact half. pnpm inherited that directory from whoever called it, so a
  // directory inside the worktree means a live process has it — live because it
  // is blocked waiting for us.
  const rows = standingIn({ worktree: TREE, startedIn: `${TREE}/scripts` });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].pid, null);
  assert.equal(rows[0].confirmed, true);
  assert.match(rows[0].from, /working directory|run in/i);
});

test('the worktree root itself counts as being inside it', () => {
  // Which is the case on every single land, `land` being run from the root.
  assert.equal(standingIn({ worktree: TREE, startedIn: TREE }).length, 1);
  assert.equal(standingIn({ worktree: TREE, startedIn: TREE.replace(/[/]/g, '\\') }).length, 1);
});

test('a command run from the main checkout is not standing in the worktree', () => {
  assert.deepEqual(standingIn({ worktree: TREE, startedIn: 'C:/Users/Chris/Desktop/portfolio' }), []);
  assert.deepEqual(standingIn({ worktree: TREE, startedIn: `${TREE}-two` }), []);
  assert.deepEqual(standingIn({ worktree: TREE, startedIn: null }), []);
});

test('a command line is cut to one line, from the front', () => {
  // A shell's command line here is seven hundred characters of snapshot-sourcing
  // preamble, and a row that wraps three times buries the `standing` line above
  // it (#169). The program is at the front, and the program is what identifies
  // the process.
  const long = `"C:/Program Files/Git/bin/bash.exe" -c "source ${'x'.repeat(400)}"`;
  const cut = brief(long);
  assert.equal(cut.length, 120);
  assert.ok(cut.startsWith('"C:/Program Files/Git/bin/bash.exe" -c'), cut);
  assert.ok(cut.endsWith('…'), 'elided visibly, so it is not read as the whole command');
});

test('a short command line is left exactly as it is', () => {
  assert.equal(brief('node astro.mjs dev'), 'node astro.mjs dev');
  assert.equal(brief(''), '');
});

test('newlines and runs of space in a command line collapse', () => {
  // One row, one line: a command line carrying a newline would otherwise put a
  // second, unlabelled line into the report.
  assert.equal(brief(` node${String.fromCharCode(10)}  --flag${String.fromCharCode(9)}x `), 'node --flag x');
});

test('a command line is named but never believed', () => {
  // A command line is not a working directory, and Windows will not report one.
  // `holders` is careful in the same way about a port being machine-wide, and for
  // the same reason: a report that overstates sends the author after the wrong
  // process.
  const rows = standingIn({
    worktree: TREE,
    startedIn: null,
    named: [{ pid: 3628, said: `node ${TREE}/node_modules/astro/bin/astro.mjs` }],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].pid, 3628);
  assert.equal(rows[0].confirmed, false);
  assert.match(rows[0].from, /command line/i);
});
