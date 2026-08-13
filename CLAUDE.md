# CLAUDE.md

Agent-facing notes for this repo. Human-facing docs are in [README.md](README.md).

## Branching and merging

Every change is made in its own git worktree, on its own branch, and reaches
`development` as a merged pull request. **Nothing is ever written in the main
checkout** — not a one-line fix, not a typo, not "just this once". A committed
`PreToolUse` hook denies it, and `/worktree-per-change` is the full protocol.

`development` is the integration branch; it reaches `main` separately. Never
open a PR into `main`.

1. Before the first edit, take a worktree cut from `development`:

   ```bash
   git worktree add .claude/worktrees/<name> -b <short-topic-name> origin/development
   ```

   Then call **`EnterWorktree`** with that path. A bare `EnterWorktree` cuts from
   `main`, because `worktree.baseRef` cannot name a branch — that base is wrong
   here and carries the divergence into the diff without complaining.

2. Work and commit in the worktree, staging paths by name. Never `git add -A`,
   and never `git stash`: `refs/stash` is one stack for the whole repository, so
   a push in one worktree renumbers every other worktree's entries.

3. Finish the change without being asked — pushing and merging are part of
   delivering it, not a separate errand:

   ```bash
   git push -u origin HEAD
   gh pr create --base development --fill
   gh pr merge --squash
   ```

4. One worktree, one branch, one PR, one change. A second, unrelated fix means a
   second worktree and a second PR — the hook denies further edits in a worktree
   whose PR has already merged.

5. Leave the worktree standing until its PR merges and name the path in your
   reply; after it merges, `ExitWorktree` can remove it.

The rule lives in `.claude/settings.json`, `.claude/hooks/worktree-guard.py` and
`.claude/worktree-per-change.json`, all committed — a worktree only gets a file
if git puts it there, so `.gitignore` un-ignores exactly those three.
