---
name: feature-start
description: Start a change — a worktree on a new branch from the fetched origin/development, installed, with a dev server on its own port.
disable-model-invocation: true
---

# feature start

```bash
pnpm feature start <name>
```

That is the whole command. It fetches `origin/development`, picks a free name,
cuts a worktree on a new branch from the **fetched** remote tip, installs it, and
starts a dev server on a port nothing else holds. Then **call `EnterWorktree` with
the path it printed** and do the work there.

`<name>` is what the change is, in words — `feature start "port the Projects
Panel"`. It is slugged into the branch name, and a name already taken gets a
numeric suffix rather than an error.

Nothing else needs doing first. In particular do not create the worktree with
`git worktree add` and do not use a bare `EnterWorktree`: `worktree.baseRef`
chooses between the repository's default branch and local HEAD, and in a
repository that integrates through `development` both are wrong.

## What to do with what it prints

It prints the worktree path, the branch, and the URL the dev server is on. Enter
the worktree by that path. If the author is starting fresh rather than mid-session,
the `cd` line it prints is the better route — the working directory is in the
system prompt, so entering a worktree mid-session pays the cold start twice.

## Then

Work, and commit. `.githooks/pre-commit` runs the Checks and blocks the commit if
one fails; `pnpm feature land` runs them again and is the gate that matters.

`scripts/feature/NOTES.md` is the rest of it — what `land` refuses and in what
order, and the five things that were wrong on the first attempt.
