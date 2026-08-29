# CLAUDE.md

Agent-facing notes for this repo. Human-facing docs are in [README.md](README.md).

## Read these first

**[`docs/agents/contract.md`](docs/agents/contract.md) — the Agent Contract.** What
a seam and a test mean here, which skills to run for which work and which to skip,
which effort level to run at, where the friction log is, and the traps that are
expensive to rediscover. Read it before writing a spec and before the first edit.

Then, as the work needs them: [`CONTEXT.md`](CONTEXT.md) for the vocabulary —
**Shell**, **Kernel**, **Section**, **Turn**, **Timeline**, **Token**,
**Content**, **Variant**, **Bake**, **Check** — which is binding on identifiers,
ticket titles and prose; and [`docs/adr/`](docs/adr/) for the seven decisions that
are binding on the build. Where a name in the existing code disagrees with the
glossary, the glossary wins.

## Branching and landing

**Every change is made in its own git worktree, on its own branch. Nothing is ever
written in the main checkout** — not a one-line fix, not a typo, not "just this
once". A committed `PreToolUse` hook denies it.

Two commands, and no pull request (ADR 0005):

```bash
pnpm feature start <name>
```

```bash
pnpm feature land
```

`start` cuts the worktree from the **fetched** `origin/development`, installs it,
and serves it on a port nothing else holds. `land` runs the Checks, lands the work
on `development`, and takes the worktree, the local branch and the remote branch
down — asking git whether each is actually gone rather than reading an exit code.
**The Checks failing is the only gate**, and `.githooks/pre-commit` runs them on
every commit too.

`pnpm feature list` says what is in flight and on which port. If a lock survives
the teardown, `land` says so and `pnpm feature clean <name>` finishes it — the
work is already landed by then, and `clean` refuses unless it is.
`/feature-start` and `/feature-land` are the same two commands as skills.
**[`scripts/feature/NOTES.md`](scripts/feature/NOTES.md) is the authority**, and
`docs/friction-log.md` is where a refusal goes.

### Do not call `EnterWorktree`

`start` prints the `cd`, and that is the whole instruction: work in the tree by
path, from a session that was never isolated into it. Better still, start the
session inside the tree — the working directory is in the system prompt, so
entering it mid-session pays the cold start twice.

`EnterWorktree` turns on Claude Code's own worktree isolation, which is a *second*
gate on top of the vendored guard and buys nothing here: the guard already judges
the path a write targets, so a session in the main checkout cannot write there
whether it is isolated or not. What the isolation does buy is refusals. It rejects
every compound shell command it cannot statically verify — a heredoc, a pipe, a
`for` loop over two `curl` calls — and every `cd` to the main checkout, including
the legitimate one that removes a sibling worktree. Three entries in
`docs/friction-log.md` are that gate, five refusals between them, and every one is
avoided by not entering the tree in the first place.

**The guard used to say the opposite, and no longer does.** Its `SessionStart`
briefing and its `Stop` block both read their steps out of the `delivery` block in
`.claude/worktree-per-change.json` now, and this repository declares
`enterWorktree: false` — so they print the `cd` rule and `pnpm feature land`, and
`ExitWorktree` and the pull request are gone from them rather than renumbered
around. A message that still names either is coming from a guard older than
`c8574fd`; resync. Where anything else disagrees, ADR 0005 and the two commands
win. `/worktree-per-change` is still the authority on the *worktree* half, and on
nothing past it.

### While you are in the worktree

**Git is the one thing "by path" does not work for.** Write and Edit are judged on
the path they target, so a session in the main checkout can edit a worktree's
files. `git` is judged on the *directory the command runs in*, and the guard works
that out by reading the command's tokens — so a `cd` or a `-C` whose argument is a
shell **variable** is unreadable, the hook falls back to the Bash tool's cwd, and
`git add` is denied as though it were in the main checkout. `git -C "$W" switch` is
the guard's own worked example of this, at `worktree-guard.py:513`. So: **`cd` into
the worktree once, in a call of its own, with the path written out in full** — not
through a variable, and not joined to the git command with `&&`. The Bash tool's
cwd persists across calls, so every later `git` in that session resolves inside
the tree.

Stage paths by name. **Never `git add -A`**, and **never `git stash`**:
`refs/stash` is one stack for the whole repository, so a push in one worktree
renumbers every other worktree's entries.

One worktree, one branch, one change. A second, unrelated fix means a second
worktree — the guard denies further edits in a worktree that has already landed.

**Then close the ticket by hand.** GitHub auto-closes only on a merge into the
*default* branch, which is `main`, and nothing reaches `main` from a feature. The
closing comment is where the acceptance criteria get ticked off against what
shipped, which is the part worth writing.
[`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) has the recipe.

The main checkout is for reading and pulling. `git pull --ff-only origin
development` is how it is brought up to date; `reset`, `merge` and `checkout` are
denied there, and **a session cannot turn the guard off to get around that** —
`CLAUDE_WORKTREE_GATE` is read from the hook's own environment, so a per-command
prefix is set after the hook has already run. If a denial is wrong, say so in your
reply, log it, and stop.

## The guard is vendored, not written here

`.claude/hooks/worktree-guard.py` is a copy taken from
[chrisJuresh/skills](https://github.com/chrisJuresh/skills). **Do not edit it in
this repo** — a fix made here is lost at the next resync and leaves the copy
undatable. Fix it upstream and resync.

**The guard's messages are this repository's now, and that is a declaration in a
file rather than a fork.** `.claude/worktree-per-change.json` carries a `delivery`
block — `pnpm feature land`, `pnpm feature clean <name>`, `enterWorktree: false` —
and the guard prints those instead of `git push`, `gh pr create`, `gh pr merge` and
`ExitWorktree`. The invariant is still the guard's; only the steps are ours. So a
`Stop` block or a `SessionStart` briefing that names a pull request is one printed
by a guard older than `c8574fd`, and the answer to it is a resync rather than a
judgement about which document wins.

Four false positives this file used to warn about are gone with that resync, and
`docs/friction-log.md` marks each **Resolved** with what landed. The one worth
knowing by name, because a session that meets an old marker still has to clear it:
the spent-worktree mark used to be written whenever the phrase that merges a pull
request appeared **anywhere in a shell command string**, so a `grep` for it — or a
document quoting it — spent the worktree it ran in. It is a token parse now, with
heredoc bodies dropped before the lexer sees them. If a denial like that ever
appears again, `gh pr list --head <branch> --state all` returning nothing settles
it: there is no pull request to have merged, and this repository stopped opening
them. Delete the marker it names, log it, and report it upstream — do not patch it
here.

`.claude/worktree-per-change.json` records which upstream commit the copy came
from and the sha256 of its LF-normalised bytes, so "is this current" is a question
this repo can answer on its own. Both are written by the installer; to resync,
**`cd` into a worktree in a call of its own, with the path written out** — a
compound `cd <path> && python …` does not persist the working directory, and the
installer is a Python process opening files, so the guard cannot see where it is
writing and will not stop it landing the whole install in the main checkout. That
happened once; the restore is `git show HEAD:<path> > <path>` per tracked file,
since `git checkout` is denied there, and it is in the friction log.

From that worktree:

```bash
python ~/.claude/skills/worktree-per-change/scripts/install.py --repo . --branch development --dry-run
```

Then without `--dry-run`. That path is the skill link the installer makes itself,
so it works wherever the skill is installed; `${CLAUDE_SKILL_DIR}` is only set
while a skill is running and is unset in a plain shell. `--status` alone reports
what is installed and what each worktree is still holding — and it reads the
**main checkout**, so a declaration made in a worktree does not show up there until
it has landed.

**Three things the install leaves that this repository does not take**, so a resync
is four steps and not one. It rewrites `.claude/settings.json` — revert it if the
only change is line endings — and leaves a `settings.json.*.bak` to delete. It
writes the installer's own line endings, which are CRLF here; normalise the files
it touched to LF. And it installs `.claude/scripts/land.py` with a `land` record
beside the `guard` one and a `Bash(python .claude/scripts/land.py:*)` grant —
**delete all three every time**. `land.py` pushes, opens a pull request and merges
it, which is exactly what ADR 0005 removed, and an allowlisted copy of it sitting
in the tree is a pre-approved way to land without the Checks. `pnpm feature land`
is the only route, and the Checks failing is the only gate.

`.gitignore` ignores `.claude/` except what every worktree needs: `settings.json`,
`hooks/worktree-guard.py`, `worktree-per-change.json`, the `launch.json` the
preview starts the static server from, and the four directories Claude Code reads
project skills, subagents, commands and scripts from. A worktree only gets a file
if git puts it there, so anything ignored is missing from every tree the work is
actually done in — which is why those directories are listed even while they are
empty.

## The friction log

`docs/friction-log.md`. **Append to it whenever a permission rule, a `PreToolUse`
hook, or the auto-mode classifier refuses something** — what was attempted, which
gate refused, the refusal verbatim, and the change that would prevent it. The
file's own header carries the four gates, their four different fixes, and the two
cases where an entry is corrected in place rather than added to. `pnpm feature
start` and `pnpm feature land` append to it themselves.

Naming the wrong gate is worse than writing nothing, because it sends the next
session to fix a repository that cannot fix it — three entries did exactly that.
**Grep the refusal against `.claude/hooks/worktree-guard.py` before writing "fix
it upstream": if the words are not in that file, the guard did not say them.**

## The build

`/portfolio` is the Portfolio, and it is an Astro and TypeScript tree under
`src/`. There is no second site: #141 deleted the hand-written page that used to
answer here and took `/next`, the temporary route the port was built at, down
with it.

Four paths are still served verbatim rather than built — the portal at `/`, the
pictures and recordings under `/portfolio/`, `/projects/` and the faces under
`/fonts/`. `scripts/static-tree.mjs` names them once, the dev server serves them
alongside Astro's routes, and `scripts/assemble-dist.mjs` lays them into `dist/`
after a build. `dist/portfolio/` is therefore both the document Astro rendered
and the pictures it reaches for, which is why that step judges a collision per
file rather than per directory.

```bash
pnpm install --frozen-lockfile
```

```bash
pnpm build
```

`pnpm dev` runs Astro's dev server with those four paths and the deep-link
rewrites answered beside it, so one origin behaves as the deployment does.
`pnpm build` runs the source checks, typechecks, builds, and assembles `dist/`.
`pnpm preview` serves that `dist/`, **of the tree it is run from**, which is why
it exists rather than the in-app preview: that serves the main checkout and would
report on `development` while looking like it reported on your branch.

**`/portfolio/<section>` is the same document, rewritten onto that path and
opened at the Section the last segment names** (ADR 0001). The rewrites are
declared in `vercel.json` and NOWHERE ELSE: `static-tree.mjs` reads that file, so
`pnpm preview`, the Check runner and the Editor all answer a deep link the way
production does. A Section is deep-linkable by carrying an `id`, and the
`deep-links` Check asks the served document which Sections it is made of and
requires a working link for each — so a Section added without its rewrite fails
the build rather than shipping a URL that 404s.

**Above 1100x700 the document is a PAGE TURN and not a scroll.** Two Sections,
two resting places and nothing between them: one wheel notch carries the reader
from one to the other, and the Front Screen's cut PROJECTS stands in the Projects
Panel masthead's slot and morphs out of Friz Quadrata into the sans as the page
crosses — the word never moves and never resizes, the document moves past it.
`src/kernel/landing.css` is the device and the one measure the two Sections share;
`src/kernel/page-turn.ts` is the notch and `src/kernel/wheel.ts` is who owns it.
Read `src/kernel/NOTES.md` before touching any of the three. **A Check or a script
that needs the page placed between the two resting places has to lift the snapping
first** — `window.portfolio.snapping(false)` — or every `scrollTo` in between is
pulled straight back onto the port it left, silently.

**Below that band the same crossing is a LINE, and `src/kernel/landing-edge.ts`
is it.** There is no fold out there for the Turn to happen at, so drawn as the
mix it ships as, it was a grey page with a grey word on it for the length of a
scroll. Instead a plate climbs the screen clocked on the word's own travel, the
word is drawn twice and masked at the line so it reads dark above it and light
below, and `--turn` is re-anchored to that same climb — one number, with the
letterforms, the veil and the dark on it together. Two things there are not
guesses and are expensive to rediscover: **`ground.css` pins `--ground`, `--ink`
and `--ink-soft` to the paper end** under `[data-turn-edge]`, and unpinning them
brings the grey straight back; and **hiding the Panel's duplicate masthead takes
`visibility: hidden` as well as the 1px box**, or the word overflows that box and
paints anyway. `src/kernel/NOTES.md` has the rest, and the `landing-edge` Check
holds all of it at two windows that fail the band for two different reasons.

Every dependency version is pinned exactly and nothing is updated on a schedule
(ADR 0002). pnpm's settings live in `pnpm-workspace.yaml`, not `.npmrc` — pnpm 11
ignores `.npmrc` for `saveExact`, and the failure mode is a caret quietly
reappearing in `package.json`.

**Read [`src/kernel/NOTES.md`](src/kernel/NOTES.md) before touching the Kernel,
and [`src/sections/stub/NOTES.md`](src/sections/stub/NOTES.md) before adding a
Section.** Between them they carry the folder convention, what the build actually
enforces about it, and the two things that have already cost a wrong diagnosis:
`hold()` before you seek a Timeline, and one mount point per Section.
`scripts/check-source.mjs` is what turns those rules into build failures rather
than hopes — it runs first in `pnpm build`, and on its own as `pnpm
check:sections`.

A Section's alternative directions are its **Variants**, and choosing between them
is looking rather than describing:

```bash
pnpm variants
```

That renders every Variant of every Section into `design/sheets/index.html`,
captioned with what each one declares. Two things about them are easy to get wrong
and silent when you do — `:root` in a Variant's selector is what makes it outrank
the composition it argues with, and nothing imports `variants.css`, because an
unselected Variant has to cost the shipped page nothing.
[`docs/agents/variants.md`](docs/agents/variants.md) is the authority; read it
before writing one.

A Section's words are its **Content**, its named numbers are its **Tokens**, and
the generators that produce its assets are its **Bakes**. Changing any of them is
not an agent's job:

```bash
pnpm editor
```

That opens the real page locally with the Editor over it — click any text, type,
Enter; drag a Token and watch the page move; press Re-bake and watch the asset
change — and Publish commits and pushes. Where a change is neither a word nor a
Token, the **Measure** surface is the inspector: click anything, shift-click a
series, climb to a parent with the breadcrumb or `↑`, then drag it, drag a corner,
or scrub any of the five rows — the box's four and the **text size**. A row backed
by a Token writes that Token on release, which is most of them — **including one
behind a bound**: a box written as `width: 100%` inside
`max-width: var(--a-token)` is governed by the Token and not by the `100%`, and a
drag lifts the cap so the box actually moves rather than writing a style the cap
swallows. **And including one behind no size at all**: a box that is its parent's
REMAINDER — the Front Screen's column is `flex: 1 1 auto` inside a Section pinned
to the fold — has no height to drag, so a corner on it closes the parent's padding
on the edge under the pointer and writes the Token that padding is declared as.
That is why "I cannot make the column any taller" was true for as long as it was:
the drag wrote a height, the flex algorithm discarded it, and the surface reported
nothing. One Token is often BOTH of a parent's paddings — closing the Front
Screen's top closes its bottom, through `--front-screen-cut-gap` — so the box grows
at both ends and the report says so. A row backed by
nothing stays a measurement and hands back an **Annotation** to paste to an agent,
or writes an **Override** into `src/overrides.css` so the page looks right while
the composition is corrected later. That asymmetry is ADR 0004 and not an
unfinished half: a Token is a named number the author may move, a coordinate in a
composition is not.

**Four toggles on that surface and a sixth surface make it a session's tool
rather than one element's**, and an agent is most likely to meet the first two:
**scale everything** makes a corner drag scale the WHOLE COMPOSITION by a
percentage — it does not touch the box, it drags `--type-zoom`, and it WRITES on
release because a zoom is a Token and not a coordinate. Above 1100x700 that is a
REDISTRIBUTION rather than a magnification: every stated size grows and the
photograph strip, being the one-screen budget's remainder, shrinks to pay for it.
**resize by one ratio** makes a corner drag SCALE the box instead — both axes by
one ratio, whichever of the two the pointer travelled further along, with `Shift`
inverting it for one drag — so a drawing keeps its shape and only its size
changes; **scale text** carries the text size through a resize by the ratio the
box changed by, so letting the row go writes BOTH Tokens — and the size it
carries is the TEXT's own and not the box's, so resizing a list scales the type
its ITEMS declare rather than writing a `font-size` on the list that nothing would
read; **keep**
leaves a change standing on the page when the selection moves off it, and picking
that element again *resumes* its record rather than measuring afresh from where it
got to; and the
**Recording** is every measurement of the session as one document, one block per
element, which is what the author will paste. **undo, redo and Ctrl-Z** go back
one gesture rather than all the way home, and they reverse the FILE too — an undo
of a scrubbed row writes its Token back to what it held. Read that document's own headings
before acting on it — **ALREADY WRITTEN** means the Token holds that value now and
applying it again is arithmetic on a number that has already moved, and **they
COMPOSE** means a block measured inside an earlier one was measured with that
earlier change standing.

It writes Content, Tokens, a Bake's parameters and that one
stylesheet, and nothing else (ADR 0004), and
[`scripts/editor/NOTES.md`](scripts/editor/NOTES.md) is the authority: read it
before touching `scripts/editor/`. Seven things there are easy to get wrong and
expensive to rediscover — **the Content and Tokens boundaries replace one span's
bytes rather than re-serialising the file**, which is what keeps a Content file's
comments and a Tokens file's paragraphs, while a Bake's parameters and the
Overrides DO re-serialise — the first because there is nothing in that file to
keep, the second because the Editor wrote every byte of it, and that one is paid
for by a **round trip** so a hand edit stops the tool instead of being clobbered
by it; **an element is matched against the value the SERVED BUILD was made
from**, which is what makes a Content edit survive a reload; **a Token’s page
and its file are two different things**, because its value is baked into the
built stylesheet, so a drag previews through a stylesheet of the Editor's own and
a release writes the file — **and an Override's are two things for the same
reason**; **a Timeline is held before it is scrubbed**, or the moment survives
one frame; **a re-bake rebuilds the tree and recaptures both baselines**, which
is the only thing that makes the page show the new asset; **the plinth Bake
renders one stone and never a built-in**, because `-- all` would overwrite the
plates the marble comparison was judged from; **an Override's selector must
never carry Astro’s `astro-…` scoping class**, which is a build’s fingerprint,
so one built from it addresses something else after the next build; and **a
shorthand carrying a `var()` has longhands CSSOM will not give you** — asking a
rule for the `padding-top` set by `padding: var(--a-token) …` answers the EMPTY
STRING, so the property the fill gesture is entirely about is the one property a
stylesheet walk cannot see, and it has to be split out of the shorthand instead.

**Tokens are not only a Section's.** The Effect Stack's hundred numbers, the three
corner pictures’ placement, the landing's four terms and the page's own type size
live in `src/kernel/tokens/`, one file per part of the Kernel, and answer to
`kernel-<stem>`. **`kernel-faces`’s `--type-zoom` is how the whole drawing is
scaled up**: every ladder on the page is in rem, so it is the one number that
makes a composition bigger without changing its proportions — and there is no
per-element width to drag instead, because a Section's boxes are measures and
flex fills rather than sizes. A Bake is a folder under
`design/bake/`: a `recipe.json` declaring the command and every parameter, and a
`params.json` holding what has moved off those defaults — which the GENERATOR
reads too, through `design/bake/tuning.py`, so a shell run and a re-bake are given
the same numbers and there is nothing to paste back.

The five HTML tuners this replaced are in
[`design/legacy/`](design/legacy/README.md), still working, with their own map of
what moved where.

`IntersectionObserver` never delivers in the in-app browser pane, for the same
reason `requestAnimationFrame` never ticks there: the pane does not run the
rendering steps. Lazy mounting and motion have to be verified in a real headless
browser, never in the preview. **Never open the Editor through the in-app preview
either**: it serves the main checkout, so in a worktree it would let a Content
edit be made against one tree while looking at another.

## Verifying a change

```bash
pnpm check
```

Builds this tree, serves that `dist/`, drives headless Chromium and runs every
Check. Exit 0 passes, 1 is a broken Check or a broken tree, 2 is a runner that
could not start. It is the gate a ticket's "every Check passes" means, and it
serves the tree it is invoked from.

`pnpm install` does **not** download a browser — the `playwright` package carries
the driver and not the binaries, and pnpm blocks install scripts. Once per
machine:

```bash
pnpm exec playwright install chromium
```

**Read [`scripts/checks/NOTES.md`](scripts/checks/NOTES.md) before adding or
changing a Check.** It carries what a Check may assert and what it may never
(nothing aesthetic, ever), what a passing run does *not* mean, how to add one, and
six traps that each cost a wrong answer while it was being built — three of which
make a Check silently assert nothing while reading as though it asserts something.

`pnpm check -- --no-build --only ground,moments` while iterating. `pnpm test` runs
the runner's own unit tests on their own; `pnpm check` runs them first anyway.

## The external capture runs on request

`/portfolio` has one consumer outside this repository: the author's GitHub profile
README is a picture of it, taken by `chrisJuresh/chrisJuresh`. #148 took that job
off its five-minute schedule and re-cut its crop against the flipped
`/portfolio`, so it now runs only when somebody asks.

**Nothing in this repository is constrained by it.** There is no pre-merge gate
and no geometry to hold still — `design/tools/check-capture-contract.py` is
deleted — and `pnpm check` is the gate. The half that capture could never see is
covered here instead: it asserted geometry hard and colour not at all, so a theme
regression broke it silently, and the `ground` Check is what replaced that blind
spot (ADR 0006). A change here that breaks the crop breaks it over there, loudly,
on the next capture somebody asks for, and the fix is over there too.

[`docs/agents/external-capture.md`](docs/agents/external-capture.md) has the two
commands that ask for one, what it cuts and from which elements, and why the
runner is still Windows.

## Domain docs

Everything agent-facing that is not in this file lives in `docs/agents/`:

| file | what it is |
| --- | --- |
| `contract.md` | the Agent Contract — seams, tests, skills, effort, traps |
| `claude-code-and-opus-5.md` | what the official docs say about running this repo well, with sources. Read before changing `.claude/` |
| `issue-tracker.md` | issues are GitHub issues in `chrisJuresh/portfolio`, driven by `gh`; includes the closing comment |
| `triage-labels.md` | the five canonical roles, which of the labels are actually on the repo, and the command that creates the two that are not |
| `variants.md` | Variants and the sheet |
| `external-capture.md` | the profile README's picture of `/portfolio` — how to ask for one, and why nothing here answers to it |
| `plinth-marble.md` | the Projects Panel's plinth — two generators, two rooms, and a bake-off. Read before touching `design/plinth/`. It carries the rule that cost three wrong diagnoses: **a light reads as a highlight or as a veil depending on its ANGULAR size against the ±14° arc the front face sweeps**, so anything wider than about a third of a model unit is a wall however dim it is made |
| `domain.md` | how `CONTEXT.md` and `docs/adr/` are maintained — lazily, by `/domain-modeling`, when a term or a decision actually gets resolved |
