# The change lifecycle

Two commands. ADR 0005: no pull request, no reviewer, no manual teardown.

```bash
pnpm feature start <name>
```

```bash
pnpm feature land
```

`start` cuts a worktree on a new branch from the **fetched** `origin/development`,
installs it, and serves it on a port nothing else holds. `land` runs the Checks,
puts the work on `development`, and takes the worktree, the local branch and the
remote branch down — then asks git whether each of the three is actually gone.

The Checks failing is the only gate. There is no reviewer: the author validates by
pulling `development` and looking at the running site, which is what makes a pull
request here a round trip that produces nothing.

`pnpm feature list` says what is in flight and on which port. `pnpm feature hooks`
points a fresh clone's git at `.githooks`, which `start` does anyway.

## Why it is `pnpm feature`, and also two skills

`pnpm feature start` is what a person types. `/feature-start` and `/feature-land`
are the same two commands as **manual-only** project skills, which is the form
`docs/agents/claude-code-and-opus-5.md` settled on: `disable-model-invocation:
true` keeps even their descriptions out of context until they are invoked. Neither
form has logic in it — both run `scripts/feature/cli.mjs` — because a rule that
lives in two places is a rule that disagrees with itself within a month.

## The five things that were wrong on the first attempt

Each cost a wrong diagnosis while this was being built. None of them is visible
from reading the code that replaced it.

**`git worktree remove` fails on every worktree this repository produces.**
`start` installs, and pnpm's store links land at paths like
`.claude/worktrees/<name>/node_modules/.pnpm/@astrojs+compiler-rs@0.3.2__<32
hex>/node_modules/@astrojs/compiler-rs/dist/async.d.mts` — past 250 characters
from the drive root. Git for Windows gives up with `Directory not empty`, having
already deleted everything shallower, and leaves about **thirteen thousand files**
standing. Node's own recursive removal is long-path aware and clears the same tree
in four seconds. So the teardown tries git, then deletes the directory itself
under the guard in `lib/teardown.mjs`, then prunes. `--force` is not the fix and
never was; it is what fails.

**The pid `start` records is not the server.** `astro dev` is spawned as
`node node_modules/astro/bin/astro.mjs`, and astro's bin spawns a child — so what
binds the port is a grandchild, and a detached spawn on Windows has no process
group to kill. The first version killed the recorded pid, `taskkill` answered
`process not found`, the teardown read as done, and the port stayed held. **The
port is the handle**: `start` waits for it, records whoever is holding it, and
`stop` kills the recorded pid, the recorded listener, and anything `netstat` still
shows on that port — then verifies against the socket rather than an exit code.

**Trimming git's output ate a filename.** `git status --porcelain` writes ` M
package.json`, and the leading space is data. The git layer trimmed every answer
for tidiness, so a slice at three characters reported `ackage.json` in a message
whose entire job is to name the file the author has to go and commit. `parse.mjs`
matches the status columns rather than slicing, and `git.mjs` has one deliberately
untrimmed reader for that one answer.

**`astro dev` silently increments past a busy port.** A server left to choose its
own port is one that cannot be trusted to be where it said it was, and two
features started at once would both report 4321. Ports are chosen deliberately,
probed by binding, and recorded — and a `feature start` holds a lock file while it
chooses, because two processes seconds apart would otherwise both find the same
port free, neither having bound it yet.

**A browser refuses to fetch from some ports.** A dev server on one answers
`curl` and fails every page load with `net::ERR_UNSAFE_PORT`, which reads like a
broken tree. `lib/ports.mjs` skips them; `scripts/checks/lib/serve.mjs` carries
the same list for its ephemeral allocation.

## The pre-commit hook

`.githooks/pre-commit` runs `pnpm check` and blocks the commit if it fails
(ADR 0006 — Checks block, they do not warn). It is reached through
`core.hooksPath`, set to the **relative** `.githooks`, because git resolves a
relative hooksPath against the root of the working tree the hook runs in — so
each worktree runs its own tracked copy against its own tree. An absolute path
into the main checkout would build and check `development` while appearing to gate
the branch, which is the same mistake the in-app preview makes.

`core.hooksPath` is local config, so it is not committed and a fresh clone has the
hook inert until `pnpm feature start` or `pnpm feature hooks` sets it. Deliberately
not a `postinstall`: a deploy's install has no business touching anybody's git
config.

It is not fast — a build and a headless browser, call it a minute. `git commit
--no-verify` skips it for one commit and `FEATURE_NO_CHECK=1` skips it for a tool
that does not pass `--no-verify`. **Neither skips `pnpm feature land`'s run**,
which is the gate that matters: `land` runs the Checks itself precisely because a
commit may have been made either way.

## What `land` refuses, and in what order

Cheapest refusal first, so a mistake costs the least. Everything before the Checks
is instant.

| refuses when | says |
| --- | --- |
| run from the main checkout | run it from the feature's worktree |
| detached HEAD, or on `development`/`main` | there is no feature branch here |
| the tree is dirty | the file names, so the commit can be made |
| nothing is ahead of `origin/development` | there is nothing to land, and how to take it down |
| the rebase onto a moved `development` stops | the rebase is still in progress; resolve and run it again |
| a Check fails | **which** Check, read off the runner's own last line |
| the push is refused | run it again; it will fetch, rebase and re-check from the top |
| the remote's `development` is not what was pushed | nothing has been taken down |

There is no hidden retry around the push. If `development` moved while the Checks
were running, the second `feature land` re-runs them against the rebased tree —
which is the whole point of the gate, and worth a minute.

## It asks the forge rather than reading an exit code

The landing is verified with `git ls-remote`, and the teardown with
`git worktree list`, `git rev-parse --verify` and `git ls-remote --heads`. That is
not belt and braces: this repository dropped pull requests partly because
`gh pr merge` reported a deletion it had not performed, and a teardown that
trusted three exit codes would leave a live push target behind after the thing
that was reviewing it had closed.

## The friction log

Any refusal either command hits is appended to `docs/friction-log.md` — what was
attempted, which gate refused, the refusal verbatim, and the change that would
prevent it. `lib/refusal.mjs` decides what counts: a rebase conflict, a failing
Check and a non-fast-forward push are the commands working correctly and saying
so, and logging those would bury the entries that are about a gate that should not
have been in the way.

Entries are collected in memory and written **once, at the end**, to the **main
checkout's** copy. Both halves matter. `land` deletes the tree it runs in, so an
entry written into that tree goes with it — and the one refusal most worth
recording is the remote branch delete, which happens after the point of no return.
The flush also comes after the main checkout is pulled, so it cannot be the
uncommitted file that makes that pull fail.

## What it deliberately does not do

**It does not close the issue.** `Closes #n` never fires here — GitHub
auto-closes only on a merge into the default branch, which is `main`, and nothing
merges there from a feature. So the close stays manual, because the closing
comment is where the acceptance criteria get ticked off against what actually
shipped, and that is the part worth having a person write.
`docs/agents/issue-tracker.md` has the recipe.

**It does not push the feature branch.** Nothing needs it: the work is landed
from the local branch. `land` still deletes the remote branch if one exists and
verifies it is gone, so pushing one by hand costs nothing later.

## Adding to it

`cli.mjs` dispatches and owns the exit codes — 0 done, 1 refused or failed, 2
could not start, matching the Check runner's so a script can tell the three apart.
`start.mjs` and `land.mjs` are the two commands. Everything under `lib/` is either
a pure function with a test beside it — `names`, `ports`, `parse`, `friction`,
`refusal`, `verdict`, `teardown`, `listeners`, `state` — or the one thin impure
layer over it, `exec.mjs` and `git.mjs`.

Put the decision in a pure function and the syscall in the layer under it. That
split is why the four bugs above were findable at all: every one of them was in
the glue, and each is now pinned by a test in the half that could hold it.
`pnpm check` runs these tests before it runs a Check, so they gate a commit too.
