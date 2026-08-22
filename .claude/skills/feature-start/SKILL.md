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
starts a dev server on a port nothing else holds. Then work in that tree **by the
path it printed**.

`<name>` is what the change is, in words — `feature start "port the Projects
Panel"`. It is slugged into the branch name, and a name already taken gets a
numeric suffix rather than an error.

Nothing else needs doing first, and in particular **do not call `EnterWorktree`**.
`CLAUDE.md` has the whole of why: it turns on Claude Code's own worktree
isolation, which is a second gate on top of the vendored guard, buys nothing here,
and refuses every compound shell command it cannot statically verify — five
refusals across three entries in `docs/friction-log.md`. Do not create the
worktree with `git worktree add` either; this command already did, from the right
base.

## What to do with what it prints

It prints the worktree path, the branch, the `cd`, and the URL the dev server is
on. Work in the tree by path, from a session that was never isolated into it. The
`cd` line is the better route when the author is starting fresh rather than
mid-session — the working directory is in the system prompt, so moving into a
worktree mid-session pays the cold start twice.

## Then

Work, and commit. `.githooks/pre-commit` runs the Checks and blocks the commit if
one fails; `pnpm feature land` runs them again and is the gate that matters.

`scripts/feature/NOTES.md` is the rest of it — what `land` refuses and in what
order, and the five things that were wrong on the first attempt.
