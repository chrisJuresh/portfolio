# The Agent Contract

What a seam and a test mean in this repository, which skills fit which work, and
which effort level to run at. Read it before writing a spec and before the first
edit — every answer here is one a session would otherwise invent, worse, and pay
for again next time.

It is not the vocabulary and not the decisions. `CONTEXT.md` is the vocabulary and
is binding on identifiers, ticket titles and prose; `docs/adr/` is the decisions
and is binding on the build. Where a name in the existing code disagrees with the
glossary, the glossary wins.

## What a seam is here

A seam is a place a Check can stand and read a real answer. This repository has
**two**, and the reason to name them is that neither is the one a general habit
reaches for: the deliverable is usually a look, and looks have no unit.

**1. The served Portfolio.** `pnpm check` builds this tree, serves that `dist/`,
drives headless Chromium and asserts what a reader would experience. Everything
about the composition is observable here — the Shell, the Kernel, every Section,
the Turn, lazy mounting, the deep-link rewrites, the Effect Stack.

Motion is observed by asking a **Timeline** for a moment and then asserting
geometry. That is the whole reason ADR 0003 requires one named, seekable Timeline
per Section rather than a bare animation loop. `hold()` the Timeline before
seeking it, and release it afterwards — `src/kernel/NOTES.md` has why, and it is
the trap that has already cost one wrong diagnosis.

The Check runner serves **the tree it was invoked from**. That is not a detail:
the in-app preview serves the main checkout, so verifying a worktree through it
reports on `development` while looking like it reported on the branch, and says
nothing about which.

**2. The Editor's write boundaries.** Given a Section, a key and a value, produce
the file's bytes — `scripts/editor/lib/content.mjs` and `lib/tokens.mjs`, and
`lib/overrides.mjs` for the one file that belongs to no Section — asserted at the
bytes. This is a lower seam than a browser tool would normally get, and
deliberately so: the Editor is the only component in the repository whose bugs
corrupt source files instead of appearing on screen, and driving it through its own
surface would be slow and flaky. Beside them sits `lib/annotations.mjs`, which is
the same kind of seam for a different reason: an **Annotation** is text the author
pastes to an agent, so the sentence *is* the deliverable and is asserted as one.
The browser half gets exactly **one** smoke Check through seam 1 —
`scripts/checks/checks/editor.mjs`: open the Editor, change a word, drag a Token,
scrub a Timeline, measure something and override it, and confirm the page and the
files both moved.

Underneath both sits the ordinary kind: **a pure function with a test beside it**.
`scripts/feature/lib/` and `scripts/editor/lib/` are written that way on purpose
— decision in a pure function, syscall in the thin layer under it — and every bug
those two modules have had was in the glue. `pnpm test` runs them alone; `pnpm
check` runs them first, so they gate a commit too. It reaches `design/` as well,
for the two generators that have a decision worth isolating, and **they are the
two whose failure would be silent** — which is what earns a seam in a folder
where everything else fails immediately and loudly.
`design/eater-cards/compare.mjs` decides whether the vendored Eater Cards are
stale. `design/eater-slab/retheme.mjs` decides whether the Slab's re-theme
landed, and a re-theme that missed writes a file that opens, is the right size,
is of the right place and is the wrong colour. Both fail when **another
repository** moves rather than when this one does, which is the other half of
why looking is not enough.

**Where there is no seam, there is no test, and the spec says so.** A composition
has none — its deliverable is a look. The `feature` script's git plumbing has
none worth building: its failures are immediate and loud, and a fixture for them
costs more than the failures do. Documents and file moves have none; "does the
site still render" already answers for them. Naming the absence is part of the
spec, not an omission from it.

## What a test means here

The word maps to **Check**, and the mapping is narrow on purpose.

A Check is a headless, blocking assertion about the served Portfolio, or about a
tool that writes it, guarding **something a person would not notice failing** — a
face silently falling back, a 404 on a rung nothing draws yet, a console error
nobody has devtools open for, dark theme drifting light, a Timeline that stopped
moving anything. Something a person *would* notice needs no Check: the author is
looking at the running site.

Three rules, and each is load-bearing:

- **Checks block, they do not warn** (ADR 0006). An advisory check inside an
  agent loop gets read and stepped over.
- **The suite stays small.** A false failure costs the author a prompt, which is
  the one cost this whole project exists to reduce.
- **No Check asserts that anything looks good.** Assert that the ground is light
  in light theme, not that it is a particular hex value. Assert that a Timeline
  moves the element it names, not that it moves it eight pixels. Taste is the
  author's, exercised through Variants and the Editor, and a Check measuring a
  number somebody chose will fail the next time somebody chooses it differently.

`scripts/checks/NOTES.md` is the authority — what a Check may assert, what a
passing run does *not* mean, how to add one, and six traps that each cost a wrong
answer, three of which make a Check silently assert nothing while reading as
though it asserts something. **Read it before adding or changing a Check.**

A green `pnpm check` does not mean a Section is right. It means nothing invisible
broke. `astro check` answers for the Portfolio's types and `tsc -p
tsconfig.scripts.json` for the `feature` script's — **and for nothing else under
`scripts/`**, which is a decision stated in that file rather than an oversight
(#183); `pnpm test` answers for the pure functions; the look is answered by the
author, looking.

## Which skills to run, and which to skip

The point of this table is the right-hand column. Running a skill that does not
fit this work is a fixed cost paid for nothing, and composition work is most of
what happens here.

| skill | run it for | skip it for |
| --- | --- | --- |
| `/tdd` | the Editor's write boundary, the Check runner's internals, the `feature` script's pure functions — anywhere the code *is* the product | a Section, a Variant, a Token, a Timeline's look. Red-green on a composition is a rendered comparison, which is what the Checks and the Variant sheet already are |
| `/code-review` | the tooling — Editor, Checks, anything under `scripts/` | a bespoke composition. There is no second opinion to have about a look that is not the author's |
| `/domain-modeling` | when a term or a hard-to-reverse decision actually gets resolved, so it lands in `CONTEXT.md` or an ADR | pre-emptively. `docs/agents/domain.md` — proceed silently when there is nothing to record |
| `/feature-start`, `/feature-land` | every change, start and finish. Manual-only skills over `pnpm feature` | nothing |
| `/worktree-per-change` | the worktree half: one change, one worktree, one branch, nothing written in the main checkout | its pull request, its merge command, `EnterWorktree`, and taking a worktree down by hand. **ADR 0005 replaced all four**, and where the skill and the ADR disagree the ADR wins here |

Two things that look like skills and are not: `pnpm variants` renders every
Variant of every Section into one sheet — read `docs/agents/variants.md` before
writing one — and `pnpm editor` is how Content gets changed, which is not an
agent's job at all.

## How to run the session

Sourced, line by line, in `docs/agents/claude-code-and-opus-5.md`. This is the
short list that belongs in front of every session.

1. **Effort is chosen before the first tool call**, because it is part of the
   cache key: changing it mid-session re-reads the whole conversation. The
   author's standing instruction is **`high` for everything**. Raise to `xhigh`
   for a Showcase built from scratch and for diagnosing a timing or layout
   problem — the two classes where being wrong is expensive and the work is
   genuinely hard. The documentation's fuller ladder is in the sourced file, and
   the author's instruction wins over it.
2. **Do not add verification or re-check instructions, and do not ask a subagent
   to double-check.** Opus 5 already does it; instructing it spends model tokens
   for no gain.
3. **Deliver the ticket's scope.** A second concern is a second worktree and a
   second change.
4. **Delegate only for large, genuinely independent tracks of work** — not to
   verify, not for something finishable in a handful of tool calls. Subagents run
   at `low` effort, on a five-minute cache TTL, and never read the parent's cache.
5. **`ultrathink` in a prompt is free and does not touch the cache. "Think
   carefully" does nothing at all** — it is not a recognised keyword.
6. **`/rewind` when a path goes wrong; `/compact` only at a natural break.**
   Rewinding returns to a prefix that is already cached.
7. **Match the written deliverable to the task.** Opus 5's files run long by
   default, and ADR 0006 exists because the source drowned in prose. A Section's
   files keep one-line pointers; the reasoning goes in that Section's `NOTES.md`.
8. **Record every classifier, permission or hook denial in the friction log.**
   Below.

## The friction log

`docs/friction-log.md`. **Append to it whenever a permission rule, a `PreToolUse`
hook, or the auto-mode classifier refuses something.** Not as bookkeeping: a
denial that cost this turn will cost every future turn until its cause is changed,
and the log is what gets handed to the session that fixes it.

Four things, because a fix needs all four: **what was attempted**, **which gate
refused**, **the exact refusal**, and **the change that would prevent it**.

The gate is the part that gets written wrong. There are four of them, they have
four different fixes, and the two in the middle — this repository's vendored
worktree guard, and Claude Code's own worktree isolation — are the pair that get
confused. Three entries in the log named the wrong one and sent a session to fix a
repository that could not fix it. **Grep the refusal against
`.claude/hooks/worktree-guard.py` before writing "fix it upstream": if the words
are not in that file, the guard did not say them.** The log's own header carries
the four-gate table and the append rules, including the two cases where an entry
is corrected in place rather than added to.

`pnpm feature start` and `pnpm feature land` append to the log themselves, in the
same format, whenever something refuses them — `scripts/feature/NOTES.md` has what
they count as a refusal and what they deliberately do not.

## Traps that are expensive to rediscover

Each of these has already cost at least one wrong diagnosis. One line each; the
authority is in the right-hand column.

| trap | where the detail is |
| --- | --- |
| **The in-app browser pane does not composite.** `requestAnimationFrame`, CSS animations and transitions never advance there, and `IntersectionObserver` never delivers — so a colour or position read off a transitioning element is silently stale, and lazy mounting and motion cannot be verified there even by hand. Use the Check seam. | `scripts/checks/NOTES.md` |
| **An image pasted into a chat cannot be written to disk.** Adding a photograph needs a path or a folder. Pasting is for *judging* photographs, never for adding them. | #129 |
| **The in-app preview serves the main checkout**, so in a worktree it verifies `development` while looking like it verified the branch. Never verify a change with it, and never open the Editor through it — that would write Content against one tree while looking at another. | `scripts/checks/NOTES.md` |
| **`hold()` a Timeline before seeking it**, and release it after. | `src/kernel/NOTES.md` |
| **One mount point per Section.** | `src/kernel/NOTES.md` |
| **A Variant's selector needs `:root`** to outrank the composition it argues with, and **nothing imports `variants.css`** — an unselected Variant must cost the shipped page nothing. Both are silent when wrong. | `docs/agents/variants.md` |
| **The Editor matches an element against the value the SERVED BUILD was made from**, not the current one. That is what makes an edit survive a reload. | `scripts/editor/NOTES.md` |
| **The Editor replaces one string literal's bytes** rather than re-serialising the file, which is what keeps a Content file's comments and formatting. Its **Overrides** boundary is the exception and inverts the rule: that file is generated, so it always re-serialises, and what pays for it is refusing any bytes it did not write. | `scripts/editor/NOTES.md` |
| **An Override's selector may not carry Astro's `astro-…` scoping class.** It is a hash of the component's bytes, so a selector built from one addresses a different element after the next build — an Override that worked all afternoon and stops on a rebuild. | `scripts/editor/NOTES.md` |
| **`pnpm install` does not download a browser.** The `playwright` package carries the driver, not the binaries, and pnpm blocks install scripts. Run `pnpm exec playwright install chromium` once per machine. | `scripts/checks/NOTES.md` |
| **pnpm's settings live in `pnpm-workspace.yaml`, not `.npmrc`.** pnpm 11 ignores `.npmrc` for `saveExact`, and the failure is a caret quietly reappearing in `package.json`. | ADR 0002 |
| **The vendored guard marks a worktree spent on the merge command's name appearing anywhere in a shell command string**, matched by regex rather than by what ran — so a `grep` for the phrase, or a doc that quotes it, denies the next edit in that tree. `gh pr list --head <branch> --state all` returning nothing settles it; then delete the marker the denial names. Report it upstream; do not patch it here. | `CLAUDE.md` |
| **GitHub never auto-closes an issue here.** Auto-close fires only on a merge into the default branch, which is `main`, and nothing reaches `main` from a feature. Close by hand, with the acceptance criteria ticked off against what shipped. | `docs/agents/issue-tracker.md` |

## Landing a change

Two commands, no pull request, no reviewer, no teardown by hand (ADR 0005):

```bash
pnpm feature start <name>
```

```bash
pnpm feature land
```

The Checks failing is the only gate. `CLAUDE.md` has the rule and its one
prohibition — **do not call `EnterWorktree`** — and `scripts/feature/NOTES.md` is
the authority on the commands themselves.
