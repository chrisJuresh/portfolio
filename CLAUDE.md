# CLAUDE.md

Agent-facing notes for this repo. Human-facing docs are in [README.md](README.md).

## Branching and merging

> **Two commands now, and no pull request.** ADR 0005 supersedes the fifteen-call
> protocol below, and #135 built it:
>
> ```bash
> pnpm feature start <name>
> ```
>
> ```bash
> pnpm feature land
> ```
>
> `start` cuts the worktree from the fetched `origin/development`, installs it and
> serves it on a free port. `land` runs the Checks, lands on `development`, and
> takes the worktree, the local branch and the remote branch down, verifying each.
> The Checks failing is the only gate, and `.githooks/pre-commit` runs them on
> every commit too. `/feature-start` and `/feature-land` are the same two commands
> as skills. **`scripts/feature/NOTES.md` is the authority**;
> `docs/friction-log.md` is where a refusal goes.
>
> Everything below is still true about *worktrees* — one per change, and nothing
> is ever written in the main checkout — and no longer true about pull requests,
> `gh pr merge`, or taking a worktree down by hand. #147 rewrites this file.

Every change is made in its own git worktree, on its own branch, and reaches
`development` as a merged pull request. **Nothing is ever written in the main
checkout** — not a one-line fix, not a typo, not "just this once". A committed
`PreToolUse` hook denies it.

**`/worktree-per-change` is the protocol and the authority on it.** Below is only
what is specific to this repository. Where the two ever disagree the skill is
right, because it is the thing that gets maintained — this file is a copy that
drifted once already.

`development` is the integration branch; it reaches `main` separately. Never
open a PR into `main`.

1. Before the first edit, cut a worktree from the **fetched** `origin/development`:

   ```bash
   git fetch origin development
   git worktree add .claude/worktrees/<name> -b <short-topic-name> origin/development
   ```

   Then call **`EnterWorktree`** with that path. A bare `EnterWorktree` is wrong
   here whichever way `worktree.baseRef` is set: it never accepts a branch name,
   and both values it does accept are wrong in a repo that integrates through
   anything but its default branch — `fresh` cuts from `main` and carries the
   whole divergence into your diff, `head` cuts from whatever the last session
   left in the main checkout. Neither complains.

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

   That last command **ends in a git error on every change here**, after the merge
   has already landed: `fatal: 'development' is already used by worktree at ...`.
   It is `gh` checking the base branch out locally once the forge is done, and the
   main checkout is standing on it. The merge is not what failed. Ask the forge
   rather than the exit code — `gh pr view <n> --json state --jq .state` — and
   carry on.

   **Then close the ticket by hand.** `Closes #n` in a PR body does nothing here:
   GitHub only auto-closes on merge into the *default* branch, which is `main`,
   and nothing merges there from here. `docs/agents/issue-tracker.md` has the rest
   of it, and the comment to leave when closing.

4. One worktree, one branch, one PR, one change. A second, unrelated fix means a
   second worktree and a second PR — the hook denies further edits in a worktree
   whose PR has already merged.

5. **Then take all three down.** The change is finished when the worktree is
   gone, not when the PR merges: a merged branch left standing is a live push
   target after the PR that reviewed it has closed, and a commit pushed there
   looks like ordinary work while reaching `development` never.

   Confirm against GitHub first. Everything merges here with `--squash`, which
   replays the diff as one new commit and keeps no ancestry, so `git branch -d`,
   `git branch --merged` and `git merge-base --is-ancestor` all read a merged
   branch as unmerged — every branch in this repo, not an edge case:

   ```bash
   gh pr view <n> --json state --jq .state   # expect MERGED
   ```

   Then `ExitWorktree` with **`action: "keep"`**, `git worktree remove <path>`,
   `git branch -D <branch>` — in that order, because nothing can remove the tree
   it is standing in, and deleting a branch out from under a live worktree leaves
   it on a detached HEAD.

   **`action: "remove"` does not work here.** It only removes a worktree
   `EnterWorktree` itself created, and under this protocol the tree is made with
   `git worktree add` and entered by path. It refuses, and costs a round trip at
   the one moment the session is trying to finish.

   **Check that `--delete-branch` actually deleted the remote.** `gh` deletes the
   local branch first and abandons the remote when that fails — which it does
   whenever a worktree still holds the branch, so every change here. It reports
   only `failed to delete local branch` and leaves the branch it was asked to
   remove:

   ```bash
   git fetch origin --prune
   git branch -r
   git push origin --delete <branch>   # if it is still listed
   ```

   If a permission rule refuses that push, `gh` reaches the same ref:
   `gh api -X DELETE repos/chrisJuresh/portfolio/git/refs/heads/<branch>`.

The main checkout is for reading and pulling. `git pull --ff-only origin
development` is how it is brought up to date; `reset`, `merge` and `checkout` are
denied there, and **a session cannot turn the guard off to get around that** —
`CLAUDE_WORKTREE_GATE` is read from the hook's own environment, so a per-command
prefix is set after the hook has already run. If a denial is wrong, say so in
your reply and stop.

### The guard is vendored, not written here

`.claude/hooks/worktree-guard.py` is a copy taken from
[chrisJuresh/skills](https://github.com/chrisJuresh/skills). **Do not edit it in
this repo** — a fix made here is lost at the next resync and leaves the copy
undatable. Fix it upstream and resync.

One known false positive, so a session that hits it does not spend a turn
deciding the guard is right: the spent-worktree mark is written whenever `gh pr
merge` appears **anywhere in a shell command string**, matched by regex rather
than by what ran. So `grep "gh pr merge" CLAUDE.md` marks the worktree it was run
in as merged, and the next edit in that tree is denied. The check the denial
names settles it — `gh pr list --head <branch> --state all` returning `[]` means
there is no PR to have merged — and the fix is to delete the marker it names.
Report it upstream; do not patch it here.

`.claude/worktree-per-change.json` records which upstream commit the copy came
from and the sha256 of its LF-normalised bytes, so "is this current" is a
question this repo can answer on its own. Both are written by the installer; to
resync, from a worktree:

```bash
python ~/.claude/skills/worktree-per-change/scripts/install.py --repo . --branch development --dry-run
```

Then without `--dry-run`. That path is the skill link the installer makes itself,
so it works wherever the skill is installed; `${CLAUDE_SKILL_DIR}` is only set
while a skill is running and is unset in a plain shell. `--status` alone reports
what is installed and what each worktree is still holding.

The install also rewrites `.claude/settings.json` — revert it if the only change
is line endings — and leaves a `settings.json.*.bak` to delete.

`.gitignore` ignores `.claude/` except the three files that carry this rule —
`settings.json`, `hooks/worktree-guard.py`, `worktree-per-change.json` — and
`launch.json`, which the preview starts the dev server from. A worktree only gets
a file if git puts it there, so anything ignored is missing from every tree the
work is actually done in.

## The build, and /next

This repository is two sites in one tree, and which one you are looking at
decides everything else about how to work in it.

`/portfolio` is the live document, and it is still plain files with no build step:
`portfolio/index.html`, `portfolio/styles.css` and the scripts beside them. It is
served exactly as it sits. Nothing below applies to it.

`/next` is the Portfolio's new foundation — an Astro and TypeScript tree under
`src/`, built to a temporary route so `/portfolio` keeps working through every
porting ticket. A later ticket flips the route. ADRs 0001–0006 in `docs/adr/` are
binding on it, and `CONTEXT.md` is the vocabulary: **Shell**, **Kernel**,
**Section**, **Turn**, **Timeline**, **Token**, **Content**, **Variant**,
**Check**. Where a name in `portfolio/` disagrees, the glossary wins.

```bash
pnpm install --frozen-lockfile
```

```bash
pnpm build
```

`pnpm dev` runs Astro's dev server and serves the existing static site beside it,
so `/portfolio` and `/next` both answer on one origin. `pnpm build` runs the
source checks, typechecks, builds, and assembles `dist/` — Astro's output plus
`index.html`, `portfolio/`, `projects/` and `fonts/` copied in. `pnpm preview`
serves that `dist/`, **of the tree it is run from**, which is why it exists rather
than `preview_start`: the in-app preview serves the main checkout and would report
on `development` while looking like it reported on your branch.

Every dependency version is pinned exactly and nothing is updated on a schedule
(ADR 0002). pnpm's settings live in `pnpm-workspace.yaml`, not `.npmrc` — pnpm 11
ignores `.npmrc` for `saveExact`, and the failure mode is a caret quietly
reappearing in `package.json`.

**Read `src/kernel/NOTES.md` before touching the Kernel, and
`src/sections/stub/NOTES.md` before adding a Section.** Between them they carry
the folder convention, what the build actually enforces about it, and the two
things that have already cost a wrong diagnosis: `hold()` before you seek a
Timeline, and one mount point per Section. `scripts/check-source.mjs` is what
turns those rules into build failures rather than hopes — it runs first in
`pnpm build`, and on its own as `pnpm check:sections`.

A Section's alternative directions are its **Variants**, and choosing between
them is looking rather than describing:

```bash
pnpm variants
```

That renders every Variant of every Section into `design/sheets/index.html`,
captioned with what each one declares. Two things about them are easy to get
wrong and silent when you do — `:root` in a Variant's selector is what makes it
outrank the composition it argues with, and nothing imports `variants.css`,
because an unselected Variant has to cost the shipped page nothing.
`docs/agents/variants.md` is the authority; read it before writing one.

`IntersectionObserver` never delivers in the in-app browser pane, for the same
reason `requestAnimationFrame` never ticks there: the pane does not run the
rendering steps. Lazy mounting and motion have to be verified in a real headless
browser, never in the preview.

## Verifying a change to /next

```bash
pnpm check
```

Builds this tree, serves that `dist/`, drives headless Chromium and runs every
Check. Exit 0 passes, 1 is a broken Check or a broken tree, 2 is a runner that
could not start. It is the gate a ticket's "every Check passes" means, and it
serves the tree it is invoked from — `preview_start` serves the main checkout and
would report on `development` while looking like it reported on your branch.

`pnpm install` does **not** download a browser — the `playwright` package carries
the driver and not the binaries, and pnpm blocks install scripts. Once per
machine:

```bash
pnpm exec playwright install chromium
```

**Read `scripts/checks/NOTES.md` before adding or changing a Check.** It carries
what a Check may assert and what it may never (nothing aesthetic, ever), what a
passing run does *not* mean, how to add one, and six traps that each cost a wrong
answer while it was being built — three of which make a Check silently assert
nothing while reading as though it asserts something.

`pnpm check -- --no-build --only ground,moments` while iterating. `pnpm test` runs
the runner's own unit tests on their own; `pnpm check` runs them first anyway.

## Verifying a change to /portfolio

`/portfolio` has a consumer outside this repository: the author's GitHub profile
README is an hourly screenshot of it, taken by `chrisJuresh/chrisJuresh`. It
asserts hard on structure and geometry, so it breaks loudly, and asserts nothing
about colour, so a theme regression breaks it silently for an hour. Before
merging anything that touches `/portfolio`'s markup, layout, spacing or colour:

```bash
python design/tools/check-capture-contract.py
```

It serves the tree it is invoked from, fetches the profile repo's capture script
at run time, and reports `captureWidth` (592), `cropHeight` (852), the four
gutters (80) and the mean luminance of both renders. Exit `0` passes, `1` is a
broken contract, `2` means it could not run.

**Do not verify this with `preview_start`** — it serves the main checkout, not
the worktree the edit is in, so it measures `development` while looking like it
measured your branch. `docs/agents/capture-contract.md` has the rest of the
traps, the baseline comparison recipe, and which of the four numbers may
legitimately move.

## Agent skills

### Issue tracker

Issues live as GitHub issues in `chrisJuresh/portfolio`, driven by the `gh` CLI.
See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, each label string equal to its name. **Four of the five
do not exist on the repo yet**, so `gh issue edit --add-label` fails on them —
see `docs/agents/triage-labels.md` for which, and the one command that creates
them.

### The Projects Panel's plinth

Two generators, two rooms, and a bake-off between them. `docs/agents/plinth-marble.md`
is the authority — read it before touching `design/plinth/`. It carries the one
rule that cost three wrong diagnoses to find: **a light reads as a highlight or
as a veil depending on its ANGULAR size against the ±14° arc the front face
sweeps**, so anything wider than about a third of a model unit is a wall however
dim it is made.

### Domain docs

Single-context — one `CONTEXT.md` and one `docs/adr/` at the repo root. Neither
exists yet, and that is the intended state: they are written lazily, by
`/domain-modeling`, when a term or a decision actually gets resolved. Proceed
silently when they are absent rather than flagging it. See
`docs/agents/domain.md`.

### Claude Code and Opus 5

`docs/agents/claude-code-and-opus-5.md` is what the official docs say about
running this repository well, with sources: which effort level suits which class
of work, what invalidates the prompt cache, and why **one worktree per change
means no two changes ever share a cache**. Read it before changing `.claude/`.
