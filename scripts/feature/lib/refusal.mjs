/**
 * Was that a refusal, or just a failure?
 *
 * Only a refusal belongs in the friction log. A rebase conflict, a failing Check
 * and a non-fast-forward push are all the command working correctly and saying
 * so — logging them as friction would bury the entries that are about a gate
 * that should not have been in the way.
 *
 * Ordered most specific first, because the strings overlap: a hook refusal from
 * the remote also contains the word `remote`, and a Windows file lock also
 * contains the word `access`.
 */

/** @type {{ match: RegExp, gate: string, fix: string }[]} */
const KINDS = [
  {
    match: /hook declined|pre-receive hook|protected branch|GH006/i,
    gate: 'a server-side git hook, or branch protection on the remote',
    fix: 'check the branch protection rules on `development` — landing without review needs direct pushes to it allowed (ADR 0005)',
  },
  {
    match: /remote: Permission to|returned error: 403|remote: Write access|could not read Username/i,
    gate: 'the remote (GitHub)',
    fix: 'run `gh auth status` and check the credential helper — the token needs `repo` scope for this clone',
  },
  {
    match: /being used by another process|EBUSY|EPERM|ETXTBSY|Directory not empty|ENOTEMPTY/i,
    gate: 'a file lock held by the operating system',
    // The commonest entry in the log by some distance, and it is usually not a
    // problem: the work has landed, and what is holding the directory — the
    // session standing in it, or something the build left behind — lets go. So
    // the fix names the command that finishes the job rather than sending anybody
    // hunting for a process.
    fix: 'run `pnpm feature clean <name>` from the main checkout once whatever is standing in the worktree has let go — `ExitWorktree` first if it is this session. The work has already landed by this point; only the directory is left. A dev server started by hand is the one holder `feature land` does not stop itself.',
  },
  {
    match: /Permission denied|EACCES|Access is denied|Operation not permitted/i,
    gate: 'a permission rule, or the file system',
    fix: 'record the exact path and command here — if this was a Claude Code permission prompt rather than the file system, an allow rule in `.claude/settings.json` is the fix, and bypass mode avoids the classifier entirely',
  },
];

/**
 * @param {string} [stderr]
 * @param {string} [stdout]
 * @returns {{ gate: string, fix: string } | null}
 */
export function classify(stderr, stdout) {
  const said = `${stderr ?? ''}\n${stdout ?? ''}`;
  for (const kind of KINDS) {
    if (kind.match.test(said)) return { gate: kind.gate, fix: kind.fix };
  }
  return null;
}
