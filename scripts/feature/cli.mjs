#!/usr/bin/env node
/**
 * The whole change lifecycle, in two commands.
 *
 *   pnpm feature start <name>    a worktree from fetched origin/development,
 *                                installed, with a dev server on its own port
 *   pnpm feature land             the Checks, then development, then take it all
 *                                down and verify that it is down
 *
 * ADR 0005: no pull request, no reviewer, no manual teardown. The Checks failing
 * is the only gate.
 *
 * Exit codes match the Check runner's, so a script can tell the three apart:
 * 0 is done, 1 is something refused or failed, 2 is a command that could not
 * start — the wrong directory, a detached HEAD, a name that is not a name.
 *
 * scripts/feature/NOTES.md is the rest of it.
 */

import { clean } from './clean.mjs';
import { land } from './land.mjs';
import { session } from './lib/exec.mjs';
import { git as gitOf } from './lib/git.mjs';
import { HOOKS_PATH, ensureHooksPath, hooksReport } from './lib/hooks.mjs';
import { load, statePath } from './lib/state.mjs';
import { start } from './start.mjs';

const USAGE = `feature — the change lifecycle (ADR 0005)

  pnpm feature start <name>    cut a worktree from fetched origin/development,
                               install it, and serve it on a free port
      --no-server              do not start a dev server
      --no-install             do not run pnpm install (the server and the
                               Checks will not work until something does)

  pnpm feature land            run the Checks, land on development, and take the
                               worktree, the branch and the remote branch down
      --no-check               skip the Checks. There is then no gate at all,
                               and it says so on every run.

  pnpm feature clean <name>    finish a teardown something was holding — the work
                               is already on development by then. It REFUSES if
                               the branch has anything development does not.

  pnpm feature list            what is in flight, and on which port
  pnpm feature hooks           point this clone's git at .githooks, so the
                               Checks block a commit. \`start\` does it too;
                               this is for a fresh clone that has not started
                               a feature yet.
`;

const [verb, ...rest] = process.argv.slice(2);
const flag = (name) => rest.includes(`--${name}`);
const words = rest.filter((word) => !word.startsWith('--'));
const cwd = process.cwd();

if (verb === undefined || verb === 'help' || flag('help')) {
  console.log(USAGE);
  process.exit(verb === undefined ? 2 : 0);
}

// One session for the whole run, so every refusal anything below hits is
// collected in one place and written once, at the end, whatever happened.
const sh = session({ command: `pnpm feature ${verb}` });

// The MAIN checkout's log, not this tree's: `feature land` deletes the tree it
// runs in, and an entry written into that tree would go with it.
let frictionLog = `${cwd}/docs/friction-log.md`;
try {
  frictionLog = `${gitOf(sh, cwd).mainCheckout().root}/docs/friction-log.md`;
} catch {
  console.error('feature: this is not a git repository, or git is not on PATH.');
  process.exit(2);
}

let code = 2;
try {
  if (verb === 'start') {
    if (words.length === 0) {
      console.error(`feature: \`feature start\` needs a name.\n\n${USAGE}`);
    } else {
      code = await start({
        sh,
        cwd,
        name: words.join(' '),
        install: !flag('no-install'),
        server: !flag('no-server'),
      });
    }
  } else if (verb === 'land') {
    code = await land({ sh, cwd, check: !flag('no-check') });
  } else if (verb === 'clean') {
    if (words.length === 0) {
      console.error(`feature: \`feature clean\` needs the name of a feature.\n\n${USAGE}`);
    } else {
      code = await clean({ sh, cwd, name: words.join(' ') });
    }
  } else if (verb === 'list') {
    code = list(sh, cwd);
  } else if (verb === 'hooks') {
    const git = gitOf(sh, cwd);
    console.log(
      hooksReport(ensureHooksPath(git)) ??
        `feature: core.hooksPath is already ${HOOKS_PATH} — the Checks block a commit.`,
    );
    code = 0;
  } else {
    console.error(`feature: no command called \`${verb}\`.\n\n${USAGE}`);
  }
} catch (error) {
  // Anything that was refused has already been recorded by the session that hit
  // it. This is the one line that says what stopped.
  console.error(`\nfeature: ${String(error?.message ?? error)}`);
  code = 1;
} finally {
  const written = sh.finish(frictionLog);
  if (written > 0) {
    console.error(
      `\nfeature: ${written} refusal(s) appended to ${frictionLog}.\n` +
        '  That file is the record of gates that cost tokens. Commit it, and fix the causes.',
    );
  }
}

process.exit(code);

/** What is in flight. The answer to "which port was that again". */
function list(sh, cwd) {
  const { features } = load(statePath(gitOf(sh, cwd).mainCheckout().common));
  if (features.length === 0) {
    console.log('feature: nothing in flight.');
    return 0;
  }
  for (const held of features) {
    // A port with no pid behind it is a port that was chosen and then not
    // served, because the install had not happened. Printing a URL for it would
    // be printing a URL that answers nothing.
    const where =
      held.port === null
        ? 'no server'
        : held.pid === null
          ? `port ${held.port}, nothing serving it`
          : `http://127.0.0.1:${held.port}/portfolio`;
    console.log(`  ${held.branch.padEnd(30)} ${where.padEnd(34)} ${held.path}`);
  }
  return 0;
}
