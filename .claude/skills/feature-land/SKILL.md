---
name: feature-land
description: Land a change — run the Checks, put the work on development with no pull request, and take the worktree, the branch and the remote branch down.
disable-model-invocation: true
---

# feature land

Run it **from inside the feature's worktree**, with the work committed:

```bash
pnpm feature land
```

It runs the Checks, and if they pass it pushes to `development`, pulls the main
checkout up to date, stops the dev server, and removes the worktree, the local
branch and the remote branch — then asks git whether each of the three is actually
gone.

There is no pull request (ADR 0005). Do not open one; `gh pr create --base main`
is refused and a PR into `development` is a round trip that produces nothing.

## If it refuses

It refuses cheaply-first and always says which thing stopped it. The three worth
knowing:

- **uncommitted changes** — it names the files. Commit them; that is what makes
  the Checks gate them.
- **a Check failed** — it names the Check. Iterate with
  `pnpm check -- --no-build --only <name>`, then commit and land again.
- **the rebase stopped** — the rebase is left in progress on purpose. Resolve it,
  `git rebase --continue`, and land again. `git rebase --abort` puts it back.

A refusal means nothing landed and nothing was taken down. Fix and run it again.

## If it landed but the worktree survived

It says so, and it says which of the three things is still standing. The usual one
is the worktree: a build and a headless browser have just run in it, and something
under `node_modules` is still holding a file. The work is on `development` either
way, so this is tidying and not a failure:

```bash
pnpm feature clean <name>
```

Run that from the main checkout. Call `ExitWorktree` (`action: "keep"`) first — a
session standing in the directory is itself something holding it. `clean` refuses
if the worktree has uncommitted changes or the branch has commits `development`
does not, so it cannot be pointed at live work by mistake.

## After it succeeds

Two things it deliberately leaves to you:

1. **Close the issue by hand.** `Closes #n` never fires here — GitHub auto-closes
   only on a merge into the default branch, which is `main`. The closing comment
   is where the acceptance criteria get ticked off against what actually shipped.
   `docs/agents/issue-tracker.md` has the recipe.
2. **Commit the friction log if it grew.** If anything refused the command it
   says so and names the entries it appended to `docs/friction-log.md` in the main
   checkout. That file is the record of gates that cost tokens.

Then call `ExitWorktree` with `action: "keep"` — the worktree is already gone, and
`action: "remove"` only removes one `EnterWorktree` itself created.

## A second change in the same session

Starts over: `/feature-start` again, a new worktree, a new branch. One worktree,
one branch, one change.

`scripts/feature/NOTES.md` is the rest of it.
