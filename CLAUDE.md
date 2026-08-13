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
   gh pr merge --squash --delete-branch
   ```

4. One worktree, one branch, one PR, one change. A second, unrelated fix means a
   second worktree and a second PR — the hook denies further edits in a worktree
   whose PR has already merged.

5. Leave the worktree standing until its PR merges and name the path in your
   reply. **Once it has merged, take all three down**: the remote branch with
   `--delete-branch` above, the worktree with `ExitWorktree`
   (`action: "remove"`), then the local branch. In that order — deleting a
   branch out from under a live worktree leaves the worktree on a detached
   HEAD.

   A merged branch left standing is not untidiness. It is a live push target
   after the PR that reviewed it has closed, and a commit pushed there looks
   like ordinary work while reaching `development` never.

   **Check that `--delete-branch` actually did it.** `gh` deletes the local
   branch first and the remote second, and abandons the remote when the local
   one fails — which it does whenever a worktree still holds the branch, so
   every change here. It reports only `failed to delete local branch` and
   leaves the branch it was asked to remove:

   ```bash
   git fetch origin --prune
   git branch -r
   git push origin --delete <branch>   # if it is still listed
   ```

   **Confirm the merge against GitHub, not against git.** Everything merges
   here with `--squash`, which replays the diff as one new commit and keeps no
   ancestry, so `git branch -d`, `git branch --merged` and
   `git merge-base --is-ancestor` all read a merged branch as unmerged — every
   branch in this repo, not an edge case. Ask
   `gh pr view <n> --json state --jq .state` for `MERGED`, then
   `git branch -D <branch>`.

The rule lives in `.claude/settings.json`, `.claude/hooks/worktree-guard.py` and
`.claude/worktree-per-change.json`, all committed — a worktree only gets a file
if git puts it there, so `.gitignore` un-ignores exactly those three.
