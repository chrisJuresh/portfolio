import assert from 'node:assert/strict';
import { test } from 'node:test';
import { whichFailed } from './verdict.mjs';

test('it names the Checks that failed, because "the Checks failed" is not actionable', () => {
  // The runner's own last line. Reading it is the difference between the author
  // knowing where to look and running the suite again to find out.
  const said = [
    '  ok    assets        every asset the page fetches answers',
    '  FAIL  ground        the page is light in light theme, dark after the Turn',
    '',
    'checks: 2 of 6 failed — 3 thing(s) broken: ground, moments',
  ].join('\n');
  assert.equal(whichFailed({ status: 1, stdout: said, stderr: '' }), 'these Checks failed: ground, moments');
});

test('it reads the runner\'s report off either stream', () => {
  // The runner prints its pass line to stdout and its failure line to stderr.
  const line = 'checks: 1 of 6 failed — 1 thing(s) broken: faces';
  assert.match(whichFailed({ status: 1, stdout: '', stderr: line }), /faces/);
});

test('a broken tree is reported as a broken tree, not as a failed Check', () => {
  // Different fix entirely: nothing was checked, so there is nothing to look at
  // in a Check.
  assert.match(
    whichFailed({ status: 1, stdout: 'checks: the build failed, so nothing was checked.', stderr: '' }),
    /build failed/,
  );
  assert.match(
    whichFailed({ status: 1, stdout: "checks: the runner's own unit tests fail", stderr: '' }),
    /unit tests/,
  );
});

test('a browser that was never downloaded names the one command that fixes it', () => {
  // `pnpm install` does not fetch a browser, and this is the failure a fresh
  // clone hits first. Anything less than the command costs a diagnosis.
  const found = whichFailed({ status: 2, stdout: 'checks: Chromium will not start.', stderr: '' });
  assert.match(found, /playwright install chromium/);
});

test('an exit code nobody recognises still says something true', () => {
  assert.match(whichFailed({ status: 137, stdout: '', stderr: '' }), /exited 137/);
});
