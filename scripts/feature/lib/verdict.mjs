/**
 * Reading the Check runner's verdict.
 *
 * `feature land` has to say WHICH Check failed, not that the Checks failed —
 * "the Checks failed" sends the author back to run the suite again to find out,
 * which is a whole minute to learn something that was already printed. The
 * runner ends every failing run with a line naming them, so this reads that
 * line, and the three ways the suite can fail without any Check having run at
 * all.
 */

/**
 * @param {{ status: number, stdout?: string, stderr?: string }} checked
 * @returns {string} the second half of a sentence beginning "nothing landed — "
 */
export function whichFailed({ status, stdout, stderr }) {
  // Both streams: the runner prints its passing line to stdout and its failing
  // one to stderr.
  const said = `${stdout ?? ''}\n${stderr ?? ''}`;

  // `checks: 2 of 6 failed — 3 thing(s) broken: ground, moments`
  const broken = /checks: \d+ of \d+ failed[^\n]*?broken: ([^\n]+)/.exec(said);
  if (broken) return `these Checks failed: ${(broken[1] ?? '').trim()}`;

  // The three ways the suite stops before any Check has run. Each has a
  // different fix, and none of them is in a Check.
  if (/the build failed/.test(said)) return 'the build failed, so nothing was checked';
  if (/the runner's own unit tests fail/.test(said)) return "the Check runner's own unit tests fail";
  if (/Chromium will not start/.test(said)) {
    return 'Chromium will not start — `pnpm exec playwright install chromium`';
  }

  return `the Checks exited ${status} (their output is above)`;
}
