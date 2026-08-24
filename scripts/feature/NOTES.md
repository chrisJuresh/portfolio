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

```bash
pnpm feature clean <name>
```

`clean` finishes a teardown that something was holding — see **Landing and taking
down are two things** below. `pnpm feature list` says what is in flight and on
which port. `pnpm feature hooks` points a fresh clone's git at `.githooks`, which
`start` does anyway.

## Landing and taking down are two things

Only the first is irreversible, and treating them as one cost the first version
of this its own teardown. `land` pushes, and then tries to delete a worktree in
which a build and a headless browser have just run — and something under
`node_modules` is sometimes still holding a file when it does. Measured: a
removal that failed succeeded about a minute later with nothing done in between.

So `removeTree` waits (twelve attempts a second apart), and when a wait ends the
work is already on `development` and the only thing left is a directory.
`pnpm feature clean <name>` finishes it, and `land` names that command in its own
report rather than leaving the author to work out what is safe to delete.

`node_modules` is not the commonest reason it is needed, though — the shell `land`
was run from is. See **`EBUSY` does not name what is holding it** below, and note
that the remedy is two commands and not one.

**What makes `clean` safe to have at all is that it refuses unless the work
landed**, and it asks that twice, in this order:

1. **Uncommitted changes in the worktree** — refuse, and name them. This comes
   first because the commit count below is 0 for a worktree that has never
   committed anything, which is exactly what one somebody is working in looks
   like. The first version checked only commits, said "the work landed" about a
   tree full of live edits, and went on to try to delete it. Nothing was lost, and
   only because node's removal happened to fail on the top-level directory before
   it recursed.
2. **Commits `origin/development` does not have** — refuse, and say to land it. A
   branch that is already gone needs no check: `land` deletes it only after
   verifying the push.

`clean` is also the answer for an **orphan** — a directory git no longer lists at
all. `git worktree remove` unregisters the worktree and *then* deletes the files,
so one that dies on a locked file leaves the whole tree on disk with nothing
pointing at it. `deletable` takes an `orphan` flag for exactly that, and the flag
is an exception to "git lists it" and to nothing else: the main checkout and
anything outside `.claude/worktrees/` stay refused however it is set.

## The registry, and the rows nothing was taking out

`<git-common-dir>/feature-state.json` is what `feature list` prints and what
`feature start` picks the next port out of. A row goes in at `start` and comes
out in `takedown.mjs` — **and only there**, so a worktree removed by anything
else left its row behind for good. Measured: nine rows, two worktrees, and seven
of the eight ports in the pool reserved by features that had landed days
earlier. The list is the thing a session reads to find out whether a name is
taken and which port a feature is on, so both answers were wrong.

So both readers reconcile the registry against `git worktree list` first, and
**write it back** — `state.mjs`'s `reconcile` decides, `prune` takes the lock and
saves. Filtering in `list` alone would have made the printout right and left the
port leak exactly where it was, because `start` reads the file and not the
printout.

**A directory git has stopped listing but which is still on disk keeps its row**,
and that half is not tidiness. That is the orphan above, the state `feature
clean` exists to finish — and the row is the only record of the port and the pid
`clean` needs in order to stop what is still serving inside it. Dropping it would
leave the port genuinely held with nothing able to name the process holding it.

The comparison is `teardown.mjs`'s `listsWorktree`, not a second one. There were
four hand-written copies of "is this the same worktree path" — `git worktree
list` says `C:/…`, `process.cwd()` says `C:\…`, the drive letter's case is not
stable between them and a trailing separator is not data — and the one that had
to be right about a path nobody typed was the new one. A strict comparison there
does not fail loudly; it drops every live feature and takes its port with it.

## Why it is `pnpm feature`, and also two skills

`pnpm feature start` is what a person types. `/feature-start` and `/feature-land`
are the same two commands as **manual-only** project skills, which is the form
`docs/agents/claude-code-and-opus-5.md` settled on: `disable-model-invocation:
true` keeps even their descriptions out of context until they are invoked. Neither
form has logic in it — both run `scripts/feature/cli.mjs` — because a rule that
lives in two places is a rule that disagrees with itself within a month.

## The things that were wrong on the first attempt

Each cost a wrong diagnosis while this was being built. None of them is visible
from reading the code that replaced it. The last three are the reason the
teardown is a shared module with a guard rather than a few lines at the end of
`land`.

**"Contains modified or untracked files" is not "could not delete".** The two
git failures look identical from an exit code and mean opposite things: one is
git unable to finish a removal that should happen, the other is git protecting
somebody's work. The by-hand removal ran over the top of the second, on a
worktree full of live uncommitted edits. Nothing was lost, and only because
node's `rmSync` happened to fail on the top-level `rmdir` before it recursed.
`refusedForDirt` is the whole difference and is tested on its own.

**A flag that is not named in a destructuring is a flag that is silently
dropped.** `deletable` took `orphan`, `clean` passed it, and `removeTree` in
between did not list it in its parameters — so the one case the flag exists for
was the one case that did not work, and `feature clean` refused every orphan with
"git does not list it as a worktree". Invisible from either end.

**A safety check against HEAD is a safety check that passes vacuously.**
`feature clean` runs from the main checkout, which is standing on `development`,
so "is this branch ahead of `origin/development`" had to be asked about a *named*
ref. `aheadOf(base, ref)` exists rather than reusing `againstBase`, which is
HEAD-relative and would have answered 0 every time.

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

**And `--port` is a request, not an instruction** — which is the other half of
the same fact and cost its own day (#167). Astro still increments when the number
it was handed turns out to be busy, and the window between this probing a port
and astro binding it is real: something can take it in between, and something
did. So the port that was asked for and the port that is being served are two
different things, and everything downstream needs the second one. The version
that recorded the first said `no dev server — nothing was listening on 4321`
about a server that was serving on 4322 and saying so in its own log; `feature
list` could not name it; and `land` then "stopped" a port that was already free
while the real server sat inside the worktree holding the directory open,
leaving nothing but `EBUSY` to work from.

The fix is not a better probe — a probe that polls harder finds the same wrong
port. **Astro is the authority, because astro is the process that bound the
socket**, and it prints where it went. `lib/astro.mjs` reads that line and is the
sibling of `parse.mjs`: string in, value out, tested without a server. Three
shapes, because astro has three:

| shape | when |
| --- | --- |
| `{"message":"Dev server running at …","label":"SKIP_FORMAT",…}` | astro thinks an agent is running it (`am-i-vibing`, which sees `CLAUDECODE`) — so, almost always here. It backgrounds itself in the same breath |
| `Dev server running at <url> (pid N)` | the message inside that JSON, and what `--background` prints unwrapped |
| `┃ Local    <url>` | the ordinary foreground banner, coloured |

Three things about the reader are load-bearing. **The log is read from the byte
offset the spawn started at**, because it is appended to and a second start would
otherwise find the first one's announcement and record a port that server has
already given up. **The last announcement wins**, for the same reason within one
run. And **there is no fallback to probing the port that was asked for** — that
probe is the bug wearing a different hat. If astro moved, then something else is
holding the port that was asked for, so "the asked port is no longer bindable" is
perfectly true and says nothing whatever about our server; a start that recorded
it would hand the teardown a stranger's process to kill. An astro that says
nothing this reader understands is therefore reported as **no server**, loudly,
with both logs named. That is a wrong answer somebody can act on, and the probe's
is one nobody can see.

A start that lands somewhere else says so on the way past, rather than reporting
no server at all.

One thing this cannot fix, and says instead: the port is reserved in the registry
*before* astro is started, and astro's own choice can land on one another feature
has reserved and not yet bound. Nothing here can undo that — astro has already
bound the socket — so `start` prints that two rows now name one port, because a
teardown that stopped the wrong server would be the worse silence.

**`EBUSY` does not name what is holding it.** Two sessions have now spent a turn
running `netstat -ano | grep LISTENING` by hand to find the dev server that was
keeping a spent worktree alive. There are two ways to know without asking a
person: the port in the registry, and `<worktree>/.astro/dev.json`, which is
astro's own lock file and names the pid that bound the socket.
`listeners.mjs`'s `holders` is that decision — pure, tested, given the world
rather than asking it — and `server.mjs`'s `serving()` is the syscall under it.
The teardown stops every port it hands back rather than only the recorded row,
and a removal that still fails prints the port, the pid, where the answer came
from and the one command that shifts it.

Neither source is believed on its own, and the wording is exact about which is
which. **`listeners()` is machine-wide**, so a pid on the recorded port is a pid
on that port and nothing stronger — the report says "held by", never "inside the
worktree". And astro deletes its lock on a clean stop, so one left behind by a
killed server would otherwise read as a live holder; the socket is what confirms
it. An unconfirmed row is **named and never stopped** — the only pid it has came
out of a file, and a pid out of a file is one the operating system may have
handed to somebody else since.

**And the commonest holder is not on a port at all — it is the shell `land` was
run from.** `land` refuses to run from the main checkout, so the shell that
invokes it has the worktree as its working directory on *every single land*. On
Windows a process's working directory is an open handle to that directory without
`FILE_SHARE_DELETE`: the contents delete perfectly well and the final `rmdir` on
the worktree root cannot. That is the signature — an empty tree and `EBUSY` on the
top-level directory — and `removeTree` then spends twelve attempts on a lock that
can never clear.

Measured (#168, and #167 before anybody knew why): `land` from inside
`.claude/worktrees/feature-port-from-astro` stopped the dev server correctly and
then failed twelve removals with `EBUSY`. `cd` to the main checkout **in a call of
its own**, then `pnpm feature clean feature-port-from-astro`, removed it on the
first attempt with nothing else changed. `takedown.mjs` already chdirs its OWN
process out of the tree; the shell is a different process and nothing here can
move it.

So the report names it, and the remedy it prints when it does is the two commands
in that order — the `cd` first, alone. Running `clean` without moving the shell
leaves it standing in a directory whose contents have just been deleted.

`listeners.mjs`'s `standingIn` is that decision, a sibling of `holders` rather than
a branch inside it: a `stop` list is ports, and **a shell must never be killed**,
so folding a portless row into the rows that feed `stop` would be the same shape
as the bugs the rest of this file is about. It has two sources and is exact about
which is which:

| source | worth |
| --- | --- |
| the directory the process started in, captured before the chdir | **exact.** pnpm inherited it from whoever called it, so a directory inside the worktree means a live process has it — live because it is blocked waiting for us. True of a `cd &&`, a `( … )` subshell and a `bash -c` alike |
| a `Win32_Process` command line naming a path inside the tree | **named, never believed.** A command line is not a working directory. It earns its place because `astro dev` is spawned with an absolute `<worktree>/node_modules/astro/bin/astro.mjs`, so a server both port checks missed turns up here |

The wording of the exact half says *the directory* and not *the shell*, because
`pnpm --dir <worktree>` would make it this process's own working directory and
nobody else's — and the author is about to act on that sentence.

**There is no third source, and that is a property of Windows rather than an
omission.** `Win32_Process` carries `CommandLine` and `ExecutablePath` and has no
working-directory property at all, so a shell sitting in the tree that is not the
one that ran the command is invisible from here. When the removal fails and
nothing at all is found — no port, no directory, no named process — the report
says to check for exactly that rather than saying nothing. `EBUSY` alone is what
sent two sessions to `netstat -ano` by hand and a third to guessing.

Two things it deliberately does not do. It does not shorten the twelve-attempt
wait when a standing directory is found, though that wait is knowably futile:
a `node_modules` lock can coexist with it, and ending the wait is what `feature
clean` is for. And it writes **no friction-log entry** — `git worktree remove`
failing already passes `expected: true`, and per the rules below a refusal with a
documented completion in `feature clean` earns no entry. An identical line on
every land is what blocked the next land's `pull --ff-only` once already.

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

**A command whose failure is an ordinary step passes `expected: true` and writes
nothing.** `git worktree remove` is the one that does. It was the log's whole
content for a while: an identical entry on every single land, in the main
checkout, uncommitted — which then blocked the *next* land's `pull --ff-only` on a
locally modified file. The distinction is not tidiness. An entry earns its place
when the gate should not have been there; this one has a documented completion in
`feature clean`, so recording it made the log restate a fixed problem until it
broke something else. Use the flag sparingly and for that reason only: a refusal
nobody has decided about yet belongs in the log.

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
`start.mjs`, `land.mjs` and `clean.mjs` are the commands, and `lib/takedown.mjs`
is the teardown the last two share — one implementation on purpose, because the
verification is the valuable half and two copies of it would drift into one that
verified less. Everything else under `lib/` is either a pure function with a test
beside it — `names`, `ports`, `parse`, `astro`, `friction`, `refusal`, `verdict`,
`teardown`, `listeners`, `state` — or the one thin impure layer over it,
`exec.mjs` and `git.mjs`.

Put the decision in a pure function and the syscall in the layer under it. That
split is why the four bugs above were findable at all: every one of them was in
the glue, and each is now pinned by a test in the half that could hold it.
`pnpm check` runs these tests before it runs a Check, so they gate a commit too.
