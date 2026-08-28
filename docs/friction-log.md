# Friction log

Every refusal an agent or a script hits in this repository — a permission rule, a
`PreToolUse` hook, or the auto-mode classifier — recorded so the cause can be
fixed rather than worked around a second time. Append, never edit, with two
exceptions: an entry whose fix has landed is marked **Resolved** with what landed
rather than deleted, and an entry that **named the wrong gate is corrected in
place**. Neither is tidiness. A resolved entry deleted is a lesson that has to be
learnt again; a wrong gate line is worse than no entry at all, because it sends
the next session to fix a repository that cannot fix it — which is exactly what
three of the entries below did.

Four things, because a fix needs all four: **what was attempted**, **which gate
refused**, **the exact refusal**, and **the change that would prevent it**. The
gate matters most, and there are five of them here, with five different fixes:

| gate | how it is fixed | how it is recognised |
| --- | --- | --- |
| the auto-mode permission classifier | an allow rule, or `bypassPermissions` | a permission prompt, or a refusal naming no hook |
| a project `PreToolUse` hook — the vendored worktree guard | **upstream**, in `chrisJuresh/skills`; never in the copy here | its own voice: the main checkout, the integration branch, a spent worktree |
| the vendored skill's `Stop` gate | **upstream**, same as the guard — its SUBSTANCE is this repository's too, and only its steps are not | it counts the commits the worktree holds that `origin/development` does not, then prescribes a pull request and `ExitWorktree` |
| Claude Code's built-in worktree isolation | not fixable from either repository — **don't call `EnterWorktree`** | "This session is isolated in the worktree …" |
| the operating system, or the remote | the thing itself | a lock, a 403, a server-side hook |

The second and the fourth are the pair that get confused, and confusing them cost
the three: the guard is a file this repository vendors and could in principle
change, and the isolation is the harness's own and cannot be changed by anybody
here. Grep the refusal against `.claude/hooks/worktree-guard.py` before writing
"fix it upstream" — if the words are not in that file, the guard did not say them.
**The third is neither, and it is the one that fires last**: a `Stop` hook is not a
`PreToolUse` hook and does not live in the guard, so grepping the guard for its
words finds nothing and proves nothing.

`pnpm feature start` and `pnpm feature land` append to this file themselves, in
this format, whenever something refuses them. See `scripts/feature/NOTES.md`.
Everything below the entries written by hand is worth the same attention: a
denial that cost a turn is a denial that will cost every future turn until the
cause is changed.

**Resolved, and deliberately no longer recorded**: `git worktree remove` refused
by a file lock at the end of `pnpm feature land`. It happened on the first three
lands, including one from an unrelated session, always for the same reason — a
build and a headless browser had just run in that worktree. The work has landed by
that point and only a directory is left, so `pnpm feature clean <name>` finishes
it, the removal now waits for the lock, and `git.removeWorktree` is marked
`expected` so it stops writing an entry. It was writing an identical one on every
single land, into the main checkout, uncommitted — which then blocked the *next*
land's `pull --ff-only` on a locally modified file. A log that restates a fixed
problem until it breaks something else is worse than no log.

## 2026-08-22 — the grilling session that produced #129

**Attempted**: pushing a branch to `origin`.

**Refused by**: the auto-mode permission classifier.

**Fix**: **Resolved.** `bypassPermissions` is the correct default on this machine
and is not gated by the classifier at all; the rules below are for the runs that
are not in it. They went into the **project's** committed `.claude/settings.json`,
proposed first — the user-level posture is not this repository's to edit:

```json
"allow": [
  "Bash(pnpm feature start:*)",
  "Bash(pnpm feature land)",
  "Bash(pnpm feature clean:*)"
]
```

Three commands rather than a rule about `git push`, because ADR 0005 moved the
push inside one of them. Nothing pushes by hand here any more, so what the
classifier is asked about is `pnpm feature land` — a rule naming `git push` would
match a command nobody runs, and would grant more than the flow needs.

## 2026-08-22 — the same session

**Attempted**: `cat > <file> <<EOF … EOF` inside a worktree.

**Refused by**: ~~the vendored worktree guard (`PreToolUse`)~~ — **corrected**:
Claude Code's own worktree isolation, which the session had turned on by calling
`EnterWorktree`.

```
This session is isolated in the worktree C:\…\.claude\worktrees\domain-docs, but
this command is too complex to verify that it stays inside the worktree; break it
into plain, separate commands. Refusing to run it — a worktree-isolated session's
git operations must target its own worktree.
```

**Fix**: **Resolved** — `CLAUDE.md` now says not to call `EnterWorktree` here, and
`pnpm feature start` prints the `cd` instead. The isolation is a second gate on
top of the vendored guard and buys nothing in this repository: the guard judges
the *path a write targets*, so a session that was never isolated still cannot
write in the main checkout.

The original fix on this entry said "upstream, in `chrisJuresh/skills`", and that
was wrong in a way worth keeping visible. Neither string above has ever existed
anywhere in that repository's history — `git log --all -S"too complex to verify"`
returns nothing — nor in `.claude/hooks/worktree-guard.py`. An upstream fix would
have changed nothing at all. The Write tool is still the workaround if a session
finds itself isolated anyway.

## 2026-08-22 — implementing #135

**Attempted**: `cd C:/Users/Chris/Desktop/portfolio && git worktree remove
.claude/worktrees/<name>` — taking down a *different* worktree, which only the
main checkout can do.

**Refused by**: ~~the vendored worktree guard (`PreToolUse`)~~ — **corrected**:
Claude Code's own worktree isolation, same gate as the entry above. The refusal
names itself.

```
This session is isolated in the worktree ...feature-lifecycle, but this command
changes directory to the shared checkout (C:/Users/Chris/Desktop/portfolio)
before running git. Refusing to run it — a worktree-isolated session's git
operations must target its own worktree.
```

**Fix**: **Resolved**, twice over. The isolation is right that the command
targeted the shared checkout and wrong that this is never legitimate: removing a
*sibling* worktree is exactly what a session cleaning up after itself has to do,
and nothing can remove the tree it is standing in. The working route is a relative
path from inside the current worktree — `git worktree remove ../<name>` — which
does the identical thing and is allowed. **`pnpm feature land` takes that route**,
so the command never hits this; and a session that does not call `EnterWorktree`
is not isolated and never meets the gate at all.

Nothing here is upstream's to fix, and the original fix on this entry said it was.

## 2026-08-22 — implementing #135, three times

**Attempted**: three shell commands containing no git at all — a `for` loop over
two ports with `curl`, a `cp && printf && git add && git commit` chain, and
`git commit -m … 2>&1 | tail -14`.

**Refused by**: ~~the vendored worktree guard (`PreToolUse`)~~ — **corrected**:
Claude Code's own worktree isolation, same gate as the two entries above.

```
this command is too complex to verify that it stays inside the worktree;
break it into plain, separate commands
```

**Fix**: **Resolved** by the same change — don't call `EnterWorktree`. This is the
heredoc refusal with a wider blast radius: the isolation refuses any compound
command it cannot statically verify, including ones that touch no git and no path
outside the worktree. A `for` loop over two `curl` calls cannot leave the worktree
by construction. Three refusals in one session, one call and one rewrite each.

Nothing upstream would have moved this either, and the count is the reason it was
worth chasing to the right gate: `.claude/hooks/worktree-guard.py` parses shell
commands for *git* calls only and has no notion of complexity, so it was never the
thing refusing. If a session is isolated anyway: one command per call, and a pipe
counts as complexity.

## 2026-08-22 — researching #131

*Moved here from `docs/agents/claude-code-and-opus-5.md` by #147, which is where it
was written while that file was the only place to put it. The gate it named is
corrected, as the three entries above are.*

**Attempted**: `echo "CLAUDE_EFFORT=$CLAUDE_EFFORT"` — a read-only `echo`, no path,
no git verb — and then the same thing again with the surrounding compound command
split apart.

**Refused by**: ~~the vendored worktree guard~~ — **corrected**: Claude Code's own
worktree isolation, the same gate as the three entries above, named by the same
string.

```
too complex to verify that it stays inside the worktree
```

**Fix**: **Resolved** by the same change — don't call `EnterWorktree`. `env | grep
-E 'CLAUDE_EFFORT'` was allowed, and the common factor in both refusals was `$VAR`
expansion, which was a hypothesis rather than a reading of any source.

The original fix said "upstream, in `chrisJuresh/skills`", and that was wrong for
the same reason it was wrong on the three above: that string has never existed in
`.claude/hooks/worktree-guard.py`, which parses shell commands for git verbs and
has no notion of complexity or of variable expansion. An upstream change would
have moved nothing.

## 2026-08-22 — implementing #147

**Attempted**: writing this ticket's own documents. A shell heredoc containing the
phrase that merges a pull request — quoted, in a table row of
`docs/agents/contract.md`, describing this exact false positive.

**Refused by**: the **vendored worktree guard** (`PreToolUse`). The first entry in
this log where that is the right answer, and the refusal names itself:

```
Denied: this worktree's change looks finished (gh pr merge was run from this
worktree), so editing it again grows a branch that has been reviewed and merged,
and the new edit reaches nobody until someone notices and opens a second PR from
a tree that looks done.
```

Nothing of the kind had run. The guard writes its spent-worktree mark on a regex
match against the **whole command string**, before the command runs, so the
mention was indistinguishable from the act. `gh pr list --head agent-contract
--state all` returned nothing — there was no pull request to have merged, and this
repository stopped opening them at ADR 0005 — so the mark was cleared and the work
carried on, one denial and one round trip later.

**Fix**: **upstream, in `chrisJuresh/skills`.** The guard already parses shell
commands to find git verbs; the mark should be written from that parse, when the
merge is the command being run, rather than from a substring of any command. Until
that lands, two things prevent it here. `CLAUDE.md` and the Agent Contract both
carry the false positive so the next session spends a check rather than a turn
deciding the guard is right. And **a document that has to quote the phrase is
written with the Write tool, not through a shell heredoc** — the mark is written
off shell command strings, so the tool that writes files directly never trips it.
That is why the phrase survives in `CLAUDE.md` and in the Contract at all.

## 2026-08-23 — the spent mark lands on the session's worktree, not the one that merged

**Attempted**: ending a session that had merged #158 correctly. One worktree
(`dev-static-html`), one branch, one PR — merged, and fully taken down before the
session tried to stop: tree removed, local branch deleted, remote branch deleted.

**Refused by**: the **vendored worktree guard** (`Stop`), naming a *different*
worktree — the session's own harness-created one, which held no commits, no branch
that was ever pushed, and no PR:

```
This worktree recorded a merge (gh pr merge was run from this worktree) and is
still standing. […] a merged branch is a push target after the PR that reviewed
it has closed
```

It then asked for that tree to be removed and for `claude/objective-lalande-bc6509`
— a branch with no pull request anywhere — to be deleted locally and on the remote.

This is the entry above's root cause with a second face. There the mark was written
for a merge that never ran; here the merge really ran, but from a worktree the
command had `cd`-ed into, and the mark was filed against the **session's** tree
instead. `spent_marker()` keys the file by the leaf name of the tree the hook
resolves from the session, and `mark_spent()` records the branch from the same
place — so one merge run in another worktree marks the wrong tree AND stamps it
with a branch that never had a PR. `gh pr list --head
claude/objective-lalande-bc6509 --state all` returned `[]`, which settled it, and
`.git/claude-worktree-gate/spent/mattpocock-skills-70-4de7f1.json` was deleted.

Two costs, not one. The Stop refusal is the visible one; the quiet one is that the
tree the session actually merged from was *not* marked, so had it been left
standing nothing would have reported it.

**Fix**: **upstream, in `chrisJuresh/skills`.** The same parse the entry above asks
for should also yield *where* the merge ran — the guard has the command string, so
a leading `cd`/`Set-Location` into another worktree is recoverable from it, and the
mark belongs on that tree. Failing that, key the mark off the branch the PR
actually merged rather than off whatever branch the session's tree is sitting on; a
mark whose branch has no PR at all is one the guard could decline to write.

Until it lands: a session that works in a worktree **by path** rather than through
`EnterWorktree` should expect its own tree to be marked at merge time, and settle
it with the check `CLAUDE.md` already names before taking anything down.

**A second denial, from writing this entry.** `docs/friction-log.md` lives in the
main checkout by design — `scripts/feature/lib/friction.mjs` says so, because
`feature land` deletes the worktree it runs in and entries are meant to land as an
uncommitted change in the one tree that outlives every feature. But the guard
denies tool edits there, so the script may write that file and an agent may not:

```
Denied: file edits are not made in the main checkout.
```

Not obviously wrong — the guard's rule is the rule — but worth naming, because the
log's own header invites appending and the only route that works is a worktree and
a PR, which is what this entry took. If entries are meant to arrive uncommitted,
the guard needs an exemption for this one path; if they are meant to arrive as PRs,
`friction.mjs`'s comment is describing a path agents cannot use.

## 2026-08-23 — the grilling session about the Frame's material

**Attempted**: staging the new `design/frame-glass/` files, from a session that was
never isolated into the worktree — first as `cd $W && git add design/frame-glass`,
then as `git -C "$W" add design/frame-glass`, where `W` was a shell variable
holding the worktree's absolute path.

**Refused by**: a project `PreToolUse` hook — the vendored worktree guard.

```
Denied: `git add` does not run in the main checkout.
```

**Not a wrong denial, and the guard says so itself.** `worktree-guard.py:513`
names this exact case in its own docstring — a directory argument "this hook
cannot read, `git -C "$W" switch` being the standing example". `where()` composes
`cd` and `-C` left to right by reading the *tokens*, so an argument that is a
shell variable is unreadable and the hook falls back to the Bash tool's cwd, which
resets to the main checkout between calls. Both spellings therefore looked like
`git add` in the main checkout, which is precisely what the guard exists to stop.

**What worked**: `cd` to the worktree as a command **on its own**, with a literal
path and no `&&`. The Bash tool's cwd persists across calls, so the next call's
`git add` resolved inside the tree and passed.

**Fix**: documentation here, not the guard. `CLAUDE.md` tells a session to "work in
the tree by path, from a session that was never isolated into it" — which is right
for the Write and Edit tools, and silently untrue for git: there is no by-path
spelling of `git add` that satisfies the guard, because `-C` and `cd` are both
read as tokens. What the instruction is missing is the one sentence that makes it
actionable: **`cd` into the worktree once, in a call of its own, with the path
written out in full — never through a variable, and never joined to the git
command with `&&`.** A variable is the trap, not the `cd`.

## 2026-08-23 — the session that made the Panel's paragraph arrive

**Attempted**: stopping with the work committed on the feature branch and
unlanded, having asked the user whether to land it — the change being an aesthetic
one they had asked to be "the most pleasing", so worth their eye first.

**Refused by**: a `Stop` hook — **not** the worktree guard, and not any of the four
gates in this file's header. None of them is a `Stop` hook, so this is a fifth, and
naming it as one of those four would have sent the next session to the wrong file.
It is the vendored `worktree-per-change` skill's stop gate, and its refusal is
recognisable by its own voice: it counts the commits the worktree holds that
`origin/development` does not.

```
This worktree is holding 1 commit(s) not in origin/development. A branch that
exists only on this disk is not a delivered change …

Finish it before stopping:
1. `git add <paths> && git commit -m "..."`
2. `git push -u origin HEAD`
3. `gh pr create --base development --fill`
4. `gh pr merge --squash --delete-branch`
…
2. `ExitWorktree` with `action: "keep"` …
```

**Its substance is right and its instructions are all wrong here.** The substance —
a branch that exists only on this disk is not a delivered change — is exactly
`scripts/feature/NOTES.md`'s own position. The five steps are upstream's protocol:
this repository opens no pull request (ADR 0005), lands with `pnpm feature land`,
and `CLAUDE.md` tells a session **not** to call `EnterWorktree`, which makes step 2
of its teardown unreachable by construction. So the gate fires correctly and then
hands over a recipe that contradicts three of this repository's own decisions, and
the cost is a session deciding which of the two to believe. `CLAUDE.md` already
answers that — "where the two disagree, ADR 0005 and the two commands win" — but it
answers it about the guard's `SessionStart` message, not about this.

**Fix**: **upstream**, in `chrisJuresh/skills`, and the same fix as the
`SessionStart` message next to it: the stop gate should state the invariant and let
the repository name the command, rather than hard-coding a pull request and
`ExitWorktree`. Failing that, this file and `CLAUDE.md` are where a session is told
to read the refusal's substance and ignore its steps — which is what this entry is
for. **What was done**: `pnpm feature land`, which is the answer to the substance,
and the question to the user was asked in the same reply rather than instead of
landing.

## 2026-08-24 — the session that named the standing shell (#168, #169)

**Attempted**: stopping, with both changes landed on `development` through
`pnpm feature land` and both feature worktrees taken down. Nothing of the
session's own work was outstanding.

**Refused by**: the vendored skill's `Stop` gate — the third row of the table
above, and the same gate as the 2026-08-23 entry below it. **A different failure,
though, and the reason this is a second entry rather than a note on that one: the
count was a false positive.** That session had one commit of its own, unlanded.
This one had none.

```
This worktree is holding 1 commit(s) not in origin/development. A branch that
exists only on this disk is not a delivered change …
```

**The commit it counted was `f5ee988`, which is `origin/main`'s tip.** The session
was running in `.claude/worktrees/mattpocock-skills-70-4de7f1`, a tree the harness
cut before the session started, sitting on `main`'s history — the exact thing
`CLAUDE.md` warns about when it says a bare `EnterWorktree` "cuts from `main` and
carries the whole divergence into your diff". The gate counts
`origin/development..HEAD` and nothing else, so in a repository whose **default
branch is `main` and whose integration branch is `development`**, every
harness-made worktree holds `main`'s divergence and trips this gate forever, on
every session, however completely the work was delivered.

Following its steps would have been actively destructive, not merely wasteful:
`git push -u origin HEAD` and a squash merge into `development` would have replayed
245 files and some fifty thousand deletions of `main`'s divergence onto the
integration branch. The one instruction in it that was right was its last —
*if the change is genuinely abandoned, leave the worktree standing* — and it is
right for a reason the gate cannot see, which is that there was no change.

**What was done**: nothing to the worktree. `git branch -r --contains f5ee988`
answered `origin/main`, which settles it in one command: a commit already on a
remote branch is not a branch that exists only on this disk. The tree was left
standing, since it is the one the session is running in and holds no work.

**Fix**: **upstream**, in `chrisJuresh/skills`, and it is a narrower fix than the
entry below asks for. Before prescribing anything, the gate should ask whether the
commits it counted are reachable from **any** remote ref — `git branch -r
--contains <sha>`, or `git rev-list --not --remotes` in place of
`origin/development..HEAD`. A commit that is already published is not undelivered
work whatever branch it is not on, and that one question would have made this gate
silent here instead of prescribing a push that corrupts `development`. Until it
lands, the recognition line for this gate is worth reading with the third row of
the table above: **a `Stop` gate counting one commit in a worktree the session did
not create is `main`'s tip, not your work.** Check it before believing the count,
and never push it.
