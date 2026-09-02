/**
 * Reading git's answers.
 *
 * Split from the running of git on purpose: everything here is a string in and a
 * value out, which is the half that can be tested without a repository — and the
 * half that has been wrong. `feature land` verifies its own teardown by asking
 * git three questions and believing the answers, so a parser that reads an empty
 * answer as one blank entry is a teardown that reports success wrongly.
 */

/**
 * The worktrees of this clone, from `git worktree list --porcelain`.
 *
 * @param {string} output
 * @returns {{ path: string, branch: string | null }[]}
 */
export function worktrees(output) {
  /** @type {{ path: string, branch: string | null }[]} */
  const found = [];
  for (const line of String(output).split(/\r?\n/)) {
    if (line.startsWith('worktree ')) {
      found.push({ path: line.slice('worktree '.length).trim(), branch: null });
      continue;
    }
    // A detached worktree says `detached` and no `branch`, so branch stays null
    // — it is still holding its directory name and still has to be listed.
    const last = found[found.length - 1];
    if (line.startsWith('branch ') && last) {
      last.branch = line.slice('branch refs/heads/'.length).trim();
    }
  }
  return found;
}

/**
 * Short branch names, from `git for-each-ref --format=%(refname:short)`.
 *
 * @param {string} output
 * @returns {Set<string>}
 */
export function refNames(output) {
  return new Set(
    String(output)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== ''),
  );
}

/**
 * Remote branch names, from `git ls-remote --heads origin`.
 *
 * @param {string} output
 * @returns {Set<string>}
 */
export function heads(output) {
  const found = new Set();
  for (const line of String(output).split(/\r?\n/)) {
    // Split on the first `refs/heads/` and keep everything after it: a branch
    // name may contain slashes, so cutting at the last one loses half of it.
    const at = line.indexOf('refs/heads/');
    if (at === -1) continue;
    const name = line.slice(at + 'refs/heads/'.length).trim();
    if (name !== '') found.add(name);
  }
  return found;
}

/**
 * Every name a new feature may not have.
 *
 * The union of three sources, because a name is free only when all three agree
 * it is: a local branch, a branch still on the remote, and a directory under
 * `.claude/worktrees/` that something is already standing in.
 *
 * @param {object} sources
 * @param {Set<string>} sources.local
 * @param {Set<string>} sources.remote
 * @param {{ path: string, branch: string | null }[]} sources.worktrees
 * @returns {Set<string>}
 */
export function taken({ local, remote, worktrees: trees }) {
  const found = new Set([...local, ...remote]);
  for (const tree of trees) {
    // Only the directory NAME, and only for trees under .claude/worktrees/ —
    // the main checkout's own directory is not a feature name and would
    // otherwise reserve the repository's own folder name forever.
    const match = /[\\/]\.claude[\\/]worktrees[\\/]([^\\/]+)[\\/]?$/.exec(tree.path);
    if (match?.[1]) found.add(match[1]);
    if (tree.branch) found.add(tree.branch);
  }
  return found;
}

/**
 * The paths `git status --porcelain` is complaining about.
 *
 * Named rather than counted: "the tree is dirty" sends the author looking, and
 * the file names are what they were going to look for.
 *
 * @param {string} output
 * @returns {string[]}
 */
export function uncommitted(output) {
  const found = [];
  for (const line of String(output).split(/\r?\n/)) {
    if (line.trim() === '') continue;
    // `XY path`, or `XY old -> new` for a rename — two status characters, one
    // space, then the path. Matched rather than sliced at 3: the commonest
    // status is ` M`, whose leading space anything that trimmed this output for
    // any reason has already eaten, and a blind slice then reports `ackage.json`
    // in a message whose whole job is to name a file. That cost a bug here once.
    const shaped = /^(..) (.*)$/.exec(line);
    const path = shaped?.[2] ?? line.replace(/^\s*\S{1,2}\s+/, '');
    const arrow = path.indexOf(' -> ');
    found.push(arrow === -1 ? path.trim() : path.slice(arrow + 4).trim());
  }
  return found;
}
