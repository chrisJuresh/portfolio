/**
 * What a feature is called, everywhere it is called something.
 *
 * ONE identifier. The branch name and the worktree directory name are the same
 * string, so there is one collision domain rather than two that can disagree —
 * which is what makes `git worktree remove` and `git branch -D` at the end of
 * `feature land` provably about the same feature.
 */

/** Long enough to say what the feature is, short enough that
 *  `.claude/worktrees/<name>/node_modules/.pnpm/…` survives Windows. */
const LIMIT = 48;

/** Branches a feature may not be called, as slugs.
 *
 *  `feature land` pushes `HEAD` to `development`. A feature branch called
 *  `development` would make that push a no-op reporting success, and the work
 *  would be torn down immediately afterwards. */
export const RESERVED = ['development', 'main', 'master', 'head'];

/** Trim the separators a cut or a substitution can leave at either end.
 *  `refs/heads/-a` is not a legal ref, and `a-` reads like a mistake. */
function trim(text) {
  return text.replace(/^-+/, '').replace(/-+$/, '');
}

/**
 * The ref-safe, path-safe form of whatever a person typed.
 *
 * @param {string} name
 * @returns {string}
 */
export function slug(name) {
  const slugged = trim(
    String(name ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-'),
  );
  if (slugged === '') {
    throw new Error(`"${name}" leaves nothing to name a branch after — give it a name.`);
  }
  return trim(slugged.slice(0, LIMIT));
}

/**
 * The first free name at or after `slug(name)`.
 *
 * @param {string} name what the author typed
 * @param {Set<string>} taken every local branch, remote branch and worktree
 *   directory that exists — a name is free only when all three agree it is
 * @returns {{ branch: string, directory: string }}
 */
export function pick(name, taken) {
  const base = slug(name);
  if (RESERVED.includes(base)) {
    throw new Error(
      `"${base}" is reserved — a feature branch by that name would land on itself.`,
    );
  }
  if (!taken.has(base)) return { branch: base, directory: base };

  // Suffixes start at 2 because the bare name was the first.
  for (let n = 2; n < 100; n += 1) {
    const suffix = `-${n}`;
    const candidate = trim(base.slice(0, LIMIT - suffix.length)) + suffix;
    if (!taken.has(candidate)) return { branch: candidate, directory: candidate };
  }
  throw new Error(
    `"${base}" and 98 suffixed forms of it are already taken — land or remove some first.`,
  );
}
