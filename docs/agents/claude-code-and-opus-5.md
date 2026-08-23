# Running Claude Code and Opus 5 on this repository

What the official documentation actually says about running Claude Code well on
Opus 5, what this repository's setup gets right, what it gets wrong, and what was
changed. Researched from primary sources on 2026-08-22 against Claude Code
**2.1.222**.

**A note on the word "token".** `CONTEXT.md` reserves *Token* for a Section's
named CSS custom property, and that reservation wins. This file therefore says
**model tokens** or **context tokens** whenever it means the billing unit, and
never a bare "token".

**A note on the money.** Opus 5 is $5/MTok input, $0.50/MTok on a cache hit, and
$25/MTok output. Every figure below is computed at those list rates, because they
are the only published numbers and they make relative costs comparable. On a
Claude subscription they are *not* what gets paid: usage draws against the plan's
allowance instead, and `/usage` says so outright — "Claude Max and Pro
subscribers have usage included in their subscription, so the session cost figure
isn't relevant for billing purposes." Read the dollar figures as a measure of how
much of the allowance a habit consumes, not as an invoice.

**And a note on the tokenizer.** Opus 5 is a 4.7-generation model, and "Claude
4.7 and later models ... use a newer tokenizer that contributes to their improved
performance ... This tokenizer produces approximately 30% more tokens for the
same text." Every byte-count intuition carried over from Sonnet 4.6 is about 30%
low. The hand-written page #129 replaced — `portfolio/styles.css` and
`portfolio/index.html` — was 382 KB together, which is roughly 125k model tokens
on this tokenizer, not the ~96k a four-bytes-per-token estimate gives — about $0.62 of uncached input to read once. #129's premise
is, if anything, understated.

## How to use this file

It is a reference, not a protocol — nothing here needs reading before an ordinary
change. Read it when you are about to change `.claude/`, when you are choosing an
effort level for a piece of work, or when a session is costing more than it
should. The short list that genuinely belongs in front of *every* session no
longer lives here: [the Agent Contract](contract.md) lifted it, and the tail of
this file says what went.

Every claim below has a source. Where the documentation is silent, this file says
so rather than filling the gap.

## Sources

Primary, all fetched 2026-08-22:

| What | URL |
| --- | --- |
| Effort parameter, incl. per-model recommendations | `platform.claude.com/docs/en/build-with-claude/effort` |
| Prompting Claude Opus 5 | `platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5` |
| Prompt caching (API mechanism) | `platform.claude.com/docs/en/build-with-claude/prompt-caching` |
| How Claude Code uses prompt caching | `code.claude.com/docs/en/prompt-caching` |
| Model configuration | `code.claude.com/docs/en/model-config` |
| Claude Code settings | `code.claude.com/docs/en/settings` |
| Permissions | `code.claude.com/docs/en/permissions` |
| Permission modes | `code.claude.com/docs/en/permission-modes` |
| Hooks | `code.claude.com/docs/en/hooks` |
| Subagents | `code.claude.com/docs/en/sub-agents` |
| Manage costs effectively | `code.claude.com/docs/en/costs` |
| Pricing | `platform.claude.com/docs/en/about-claude/pricing` |

Two things worth knowing about the sources themselves, because both cost a turn
to discover:

- **The bundled `claude-api` skill is stale on one point that matters here.** It
  states that `xhigh` "is the default in Claude Code". That is true of Opus 4.7
  and of nothing else: `code.claude.com/docs/en/model-config` says "The default
  effort is `high` on every model that supports effort, except Opus 4.7, which
  defaults to `xhigh`." Believe the docs page.
- **The `claude-code-guide` subagent is not a citable source.** Asked the
  questions this file answers, it returned an answer that was confidently wrong
  on the Opus/Sonnet price ratio (it said 5–10×; it is 1.67×), invented two blog
  URLs, denied that `PreCompact` and `SubagentStop` are documented hook events
  when both are, called `args` an undocumented hook field when it is documented,
  and folded a line out of this repository's own `CLAUDE.md` into its list of
  cache invalidators. It was right about `.claude/commands/` having given way to
  skills, which is the one thing this file would otherwise have got wrong. Use it
  to find *pages*; read the pages yourself.

## Effort

`high` is the default, on the API and in Claude Code, for every model that
supports effort except Opus 4.7. Effort is not a token budget — the docs call it
"a behavioral signal, not a strict token budget" — and it affects **all** output:
"Text responses and explanations", "Tool calls and function arguments", and
"Thinking (when active)". Lower effort means literally fewer tool calls, which is
why it is the primary cost control rather than a quality dial.

The documentation's recommendation for Opus 5 specifically:

> Start with `high`, the default, and adjust based on your evals: step up to
> `xhigh` for demanding coding and agentic work, or to `max` when a task
> justifies unconstrained token spending, and use `low` and `medium` liberally as
> your primary control for token cost and response time wherever your evals show
> quality holds.

And, pointedly for a repository that has been running one level for everything:

> If you carried effort settings over from an earlier model, run a fresh effort
> sweep on your evals rather than reusing them.

`xhigh` is described as being for "Long-running agentic and coding tasks (over 30
minutes) with token budgets in the millions". `max` "may show diminishing returns
and is prone to overthinking. Test before adopting broadly."

### Which level suits which class of work here

The classes are this repository's, the justification is the docs'. Nothing in
here is a rule an agent must obey — effort is the author's dial, and this is what
the dial's positions mean.

| Class of work | Level | Why |
| --- | --- | --- |
| Building a Section from scratch — a Showcase, its Timeline, its Variants; building the Editor | `xhigh` | The one case the docs name outright: "demanding coding and agentic work", "long-running agentic and coding tasks (over 30 minutes)". These tickets are hours of repeated tool calling against a moving visual target. |
| Diagnosing a timing or layout problem | `xhigh` | Same clause. Diagnosis here is exploratory tool calling — serve, drive, seek a Timeline, measure, repeat — which is the shape `xhigh` is described for. |
| Porting a composition faithfully; a multi-file refactor; standing up the Shell and Kernel | `high` | The default, and "Complex reasoning, difficult coding problems, agentic tasks". The target already exists, so the work is careful rather than exploratory. |
| A Check, a generator, the Editor's write boundary — code whose correctness a test can state | `high` | Same. Drop to `medium` once the Checks exist and can catch a regression the model misses. |
| Reviewing a diff | `low` or `medium` | Explicitly supported: on Opus 5 code-review "accuracy holds at lower effort settings, which supports a fast pass at review time and a more thorough pass later". |
| Writing and triaging tickets, closing issues, fixing labels, editing a doc, running a Check and reading its output | `low` or `medium` | "use `low` and `medium` liberally as your primary control for token cost and response time". `low`'s documented use case is "Simpler tasks that need the best speed and lowest costs, such as subagents". By count this is most of what happens in this repository. |
| Anything a subagent does | `low` | The docs name subagents as `low`'s example case. Set it in the subagent's frontmatter, not on the session. |
| A change where being wrong is expensive and hard to see — a confidentiality Check, the capture contract | `max` | "when a task justifies unconstrained token spending". Reserve it; the docs warn about overthinking and diminishing returns. |

**Two mechanics that decide how this is actually used.**

First, effort is part of the prompt cache key, so it cannot be varied freely
within a session: "Changing the effort value between requests invalidates prompt
caching, so vary effort across workloads rather than within a conversation that
relies on cache hits." Pick the level when the session starts. In practice that
means the level follows the *ticket*, not the moment.

Second, the documented way to vary effort *by kind of work* without touching the
session is frontmatter: `effort` is a supported field on both
[skills](https://code.claude.com/docs/en/skills#frontmatter-reference) and
[subagents](https://code.claude.com/docs/en/sub-agents#supported-frontmatter-fields),
taking `low`|`medium`|`high`|`xhigh`|`max`, and "Frontmatter effort applies when
that skill or subagent is active, overriding the session level but not the
environment variable." That is the lever for the cheap classes above, and it is
unavailable in this repository today — see finding 1.

### How effort is set, in precedence order

1. `CLAUDE_CODE_EFFORT_LEVEL` environment variable — "takes precedence over all
   other methods".
2. Skill or subagent frontmatter `effort:`, while that skill or subagent is
   active.
3. `/effort <level>`, or the slider in `/model`. Persists across sessions for
   `low`/`medium`/`high`/`xhigh`; `max` is session-only unless set through the
   environment variable.
4. `--effort <level>` at launch, for one session.
5. `effortLevel` in a settings file — accepts `low`, `medium`, `high`, `xhigh`.
   **`max` is not accepted here.** Read once at session start, so editing it
   mid-session does nothing; use `/effort`. Before putting it in the *committed*
   `.claude/settings.json`, check its Scope column in the
   [all-settings index](https://code.claude.com/docs/en/settings-reference#all-settings):
   some keys "never apply from the shared file", and a key that silently does
   nothing is worse than no key.
6. The model default (`high` on Opus 5).

Opus 5 has no model-default hold: "a level you previously set carries over",
unlike Fable 5 / Opus 4.8 / Opus 4.7, which re-assert their own default on first
run. So whatever level was last chosen on this machine is the level Opus 5 keeps
using, silently, until it is changed.

To read the level a session is actually running at without opening `/model`: it
is in the session header next to the model name, and `${CLAUDE_EFFORT}` is a
documented substitution inside a skill — "The current effort level: `low`,
`medium`, `high`, `xhigh`, or `max`. Ultracode is not a distinct level and reports
as `xhigh`." Do not confuse it with the setter, which is
`CLAUDE_CODE_EFFORT_LEVEL`. This machine currently reports `high`.

**`effortLevel` was deliberately not written into `.claude/settings.json`.** It
would be a no-op dressed as a decision: `high` is already the Opus 5 default, so
the key would change nothing, while pinning one session-wide level in the
repository would fight the mechanism that actually makes the table above usable —
per-skill and per-subagent frontmatter. The table is the record of the decision;
the dial stays the author's.

`ultracode` is on the `/effort` menu but is not an effort level — it is a Claude
Code setting that "sends `xhigh` to the model and additionally has Claude
orchestrate dynamic workflows for substantive tasks". It has its own `ultracode`
settings key and is exempt from the concurrent-subagent cap. For this repository
it is the wrong tool for almost everything: a workflow fan-out is many agents
against a codebase where the expensive resource is the author's money, not
wall-clock.

`ultrathink` is real and cheap: "Include `ultrathink` anywhere in your prompt to
request deeper reasoning on that turn without changing your session effort
setting... The effort level sent to the API is unchanged." So it does **not**
invalidate the cache. The docs also say plainly that "think", "think hard" and
"think more" are *not* recognised and pass through as ordinary prompt text —
worth knowing, because prompts full of "think carefully" are doing nothing.

## Prompt caching, and why this repository pays full price every time

Claude Code sends the whole conversation on every turn and relies on prefix
matching to make that cheap. The request is ordered in three layers, stable
first: system prompt (core instructions, tool definitions, output style), project
context (`CLAUDE.md`, auto memory, unscoped rules), conversation. "The match is
exact, so a change anywhere in the prefix recomputes everything after it. There
is no per-file or per-segment caching."

On a Claude subscription the TTL is one hour, requested automatically. It drops to
five minutes once the account is drawing on usage credits, unless
`ENABLE_PROMPT_CACHING_1H=1` is set. Cache reads bill at roughly 10% of the
input rate; five-minute writes at 1.25×, one-hour writes at 2×. Opus 5's minimum
cacheable prefix is 512 model tokens — the lowest of any model, and far below
`CLAUDE.md`, which is around 3k on this tokenizer. Nothing here is at risk of
silently falling under the cacheable floor.

**And then there is the finding that this repository's whole protocol runs into:**

> In Claude Code, the cache is effectively scoped to one machine and directory.
> The system prompt embeds the working directory, platform, shell, OS version,
> and auto memory paths, so two sessions in different directories build different
> prefixes and miss each other's cache. **That includes worktrees of the same
> repository, since each worktree has its own working directory.**

> Sequential sessions share the prefix only when the git status snapshot at
> startup matches, since the system prompt also captures branch and recent
> commits.

One worktree per change means one fresh directory and one fresh branch per
change, so **no two changes in this repository ever share a prompt cache, and the
first request of every change is fully uncached.** That is not an argument
against worktrees — ADR 0005 keeps them because they are what makes parallel
tickets safe, and the cold start is a few thousand model tokens, not a few
hundred thousand. But it has three consequences worth acting on:

- The cold-start cost is proportional to the system prompt plus `CLAUDE.md`, and
  those are the only parts of it anyone here controls. It is the strongest
  argument for #147 trimming `CLAUDE.md` rather than growing it.
- Entering a worktree *mid-session* changes the working directory, and the
  working directory is in the system prompt. Launching the session inside the
  worktree pays the cold start once; creating the worktree and then entering it
  pays it twice. #135's `feature start` should `cd` into the new worktree and
  launch there.
- **A subagent never reads the parent's cache**, and "Subagents use the
  five-minute TTL even on a subscription, since the automatic one-hour TTL
  applies to the main conversation." A long subagent goes cold quickly. A
  *fork* is the exception: it "inherits the parent's system prompt, tools, and
  conversation history exactly, so its first request reads the parent's cache."

### What invalidates the cache, and what does not

Documented invalidators: switching models; changing effort level; turning on fast
mode; connecting or disconnecting an MCP server *whose tools are loaded into the
prefix*; enabling or disabling a plugin *that provides such an MCP server*;
denying an entire tool; `/compact`; upgrading Claude Code. Resuming a session
after an upgrade "reprocesses the entire conversation history with no cache hits
... so the first turn back into a long session can be the most expensive request
you send."

Documented non-invalidators, several of them counterintuitive: editing files in
the repository; editing `CLAUDE.md` mid-session (and note — the edit also *does
not apply* until `/clear`, `/compact` or restart); changing output style
(likewise inert until restart); changing permission mode; invoking a skill or a
command, which "inject their instructions as user messages"; `/recap`;
`/rewind`; spawning a subagent. Plan mode is cache-safe too, because its
instructions are appended as conversation.

Three of those matter directly here:

- **MCP churn is cheap on this setup.** Deferred tool loading is the default on
  supported models, and with tools deferred "a server connecting, disconnecting,
  or changing its tool list only appends new content and doesn't disturb anything
  already cached." The same goes for a plugin's skills, commands, agents, hooks,
  monitors and themes: "Claude Code never invalidates the cache" for those. The
  `mattpocock-skills` and `gitkraken-hooks` plugins are free at the prefix.
- **A scoped deny rule is cache-safe; a bare tool name is not.** "Adding a bare
  tool name like `Bash` or `WebFetch` as a deny rule removes that tool from
  Claude's context entirely ... adding or removing one of these rules
  mid-session invalidates the cache", whereas "Scoped deny rules like
  `Bash(rm *)`, and all allow and ask rules, don't change which tools Claude
  sees." So `deny: ["Read(./.env)"]` is free and `deny: ["WebFetch"]` is not.
- **`/rewind` beats `/compact`.** Rewinding "truncates back to a prefix that is
  already cached, rather than building a new one as compaction does." When a
  session has gone down a wrong path, rewind.

### Auto-compaction is effectively off on this setup

"If you don't set an auto-compact window, Claude Code compacts when the
conversation reaches the model's context limit" — and on a Max/Team/Enterprise
plan against the Anthropic API, Opus runs with the 1M window automatically. So a
long session here can grow towards 1M context tokens before anything compacts,
and every turn re-reads that whole prefix at the cached rate. At 1M context
tokens and $5/MTok input, a cache *hit* is about $0.50 of input per turn; fifty
turns is about $25 in re-reads alone.

`autoCompactWindow` (or `/autocompact 250k`, or
`CLAUDE_CODE_AUTO_COMPACT_WINDOW`) accepts 100K–1M. Lowering it trades fidelity
for cost, which is the author's call and not an agent's, so it has been
**recommended and not applied** — see finding 5.

## Prompting Opus 5

The Opus 5 prompting guide is short and most of it is about *removing* things
that older prompts contain. The four that apply to this repository:

- **Do not add verification instructions.** "Claude Opus 5 verifies its own work
  without being told to. If your prompt contains explicit verification
  instructions ('include a final verification step for any non-trivial task',
  'use a subagent to verify'), remove them: instructions like these cause
  over-verification on Claude Opus 5, and removing them reduces wasted tokens
  with no loss in quality." The same for self-correction: "Avoid instructing
  re-checks it already performs."
- **Scope, not enthusiasm.** "Claude Opus 5 can also expand the scope of a task,
  adding steps that weren't requested or applying its own judgment about what the
  task should be." The guide gives a scope-constraint paragraph for narrow tasks.
  In a repository whose rule is one worktree, one branch, one PR, one change,
  scope creep is not a style problem — it is a second PR.
- **Delegation is readier and costlier.** "Claude Opus 5 delegates to subagents
  more readily than prior models. Delegation pays off on genuinely independent,
  sizeable tracks of work, but it multiplies cost and time when applied to small
  tasks." The guide's remedy is either explicit prompt guidance or "deterministic
  caps" — which is finding 2.
- **Verbosity is a prompt problem, not an effort problem.** "Effort controls
  thinking volume, not visible response length: on Claude Opus 5, changing effort
  does not reliably shorten responses, so prompt for length instead." Files Opus
  5 writes to disk "are often longer than on prior models" — which is worth
  saying out loud in a repository whose ADR 0006 exists because the source
  drowned in prose.

Checked and clean: nothing in `CLAUDE.md`, `CONTEXT.md`, `README.md` or
`docs/` contains a "double-check", "re-verify", "think carefully", "be
conservative" or "use a subagent to verify" instruction. The repository is not
carrying the cruft the guide warns about.

## What the current configuration gets wrong

### 1. Project-scoped Claude Code config cannot exist in a worktree — applied

`.gitignore` ignored `.claude/*` with four exceptions. Since a worktree only
contains what git puts there, and all work here happens in a worktree, the
documented locations for project skills (`.claude/skills/<name>/SKILL.md`) and
subagents (`.claude/agents/*.md`) were unreachable — anything placed there would
be invisible in every tree where work actually happens.

This was already biting. `~/.claude/settings.json` carries an allow rule for
`Bash(python .claude/scripts/land.py:*)`, a path that cannot exist in a worktree.
#135 wants two project commands. And frontmatter `effort` — the documented lever
for running the cheap classes of work cheaply — lives in exactly those files.

**Changed:** `.gitignore` now un-ignores `.claude/skills/`, `.claude/agents/`,
`.claude/commands/` and `.claude/scripts/`. No files were added; the directories
are simply no longer unreachable.

A note on which of those to use for #135, because the docs moved: "**Custom
commands have been merged into skills.** A file at `.claude/commands/deploy.md`
and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy` and work the
same way. Your existing `.claude/commands/` files keep working." So
`.claude/commands/` still works and stays un-ignored for that reason, but a skill
is the current form and the better one here: it takes a directory of supporting
files, and `disable-model-invocation: true` makes it manual-only, at which point
even its *description* stays out of context until invoked — "Description not in
context, full skill loads when you invoke". `feature start` and `feature land`
should be manual-only project skills.

### 2. Opus 5's readier delegation had no cap — applied

The prompting guide names the two deterministic caps for a Claude Code harness:
`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` and
`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, both requiring v2.1.217 or later (this
machine is on 2.1.222). Neither was set, so both were at their documented
defaults: **depth 3** and **20 concurrent subagents**. Twenty concurrent Opus 5
subagents is a defensible ceiling for a team and an absurd one for a
single-author static site.

**Changed:** `.claude/settings.json` now sets an `env` block with
`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH: "1"` and
`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "4"`.

Depth `1` is the documented value that "turn[s] off nesting entirely": the main
conversation may still delegate, but "At the depth limit, Claude Code withholds
the `Agent` tool from subagents (except forks), forcing them to do their own work
and return a summary." That removes the runaway tree without removing delegation.
Concurrency `4` is a judgement, not a documented figure — it is the point past
which a single author cannot read what came back. Neither cap constrains running
several *tickets* at once: those are separate sessions, each with its own cap.

`env` values from a project settings file need the folder trusted, and trust "is
keyed on the git repository root ... In a worktree, it uses the main checkout's
root", so this applies in every worktree without a fresh dialog.

### 3. Nothing protected `.env` from being read — applied

The repository gitignores `.env` and `.env.*` and the machine default is
`bypassPermissions`, which "disables permission prompts and safety checks so tool
calls execute immediately". There was no `deny` rule.

**Changed:** `.claude/settings.json` now denies `Read(./.env)` and
`Read(./.env.*)`. Three documented properties make this the right shape: `deny`
and `ask` rules "apply right away" without waiting for workspace trust; "if a
tool is denied at any level, no other level can allow it"; and a path-scoped
`Read` deny does not change the tool set, so it does not invalidate the cache.

Two honest limits. Read/Edit deny rules "apply to Claude's built-in file tools
and to file commands Claude Code recognizes in Bash, such as `cat`, `head`,
`tail`, and `sed`. They don't apply to arbitrary subprocesses that read or write
files indirectly, like a Python or Node script that opens files itself." And the
docs **do not state** whether `deny` survives `bypassPermissions` — they state it
for auto mode, for sandboxed Bash, and for the critical-path circuit breaker, but
the `bypassPermissions` section itself lists only the actions no mode
auto-approves and two cross-session-messaging safeguards. Treat the rule as a
guard rail, not a guarantee; the documented hard guarantee is
[sandboxing](https://code.claude.com/docs/en/sandboxing), which gives "OS-level
enforcement that blocks all processes from accessing a path".

### 4. `bypassPermissions` was specified as a ticket that is already done

#129 lists "Making `bypassPermissions` the machine default" as out of scope,
"[s]pecified as a ticket with the exact edit; performed by the author, since it
is their own user-level security posture". It is already set, at the user level,
in `~/.claude/settings.json`. `.claude/settings.local.json` sets it again, where
it is redundant: local project settings outrank user settings, so the duplicate
changes nothing.

No change made — `settings.local.json` is gitignored, so editing it would not
reach a commit, and the duplication is harmless. Worth deleting by hand, and
worth striking that item from #129's out-of-scope list.

One thing to say plainly rather than bury: the docs are blunt that this mode
"offers no protection against prompt injection or unintended actions" and should
be used "in isolated environments like containers, VMs, or dev containers without
internet access". This repository runs AFK agents on the author's own machine with
network access. That is the author's decision and it is a reasonable one for a
static site with no live infrastructure, but it is a decision, not a default, and
`auto` mode is the documented middle ground if it ever stops being reasonable.

### 5. Auto-compaction never fires until 1M — recommended, not applied

Covered above. The change is one key:

```json
{ "autoCompactWindow": "250k" }
```

It is not applied because it trades context fidelity for cost, and that trade is
the author's. The number to weigh it against: at 1M context tokens a cached turn
costs about $0.50 of input; at 250K, about $0.12.

### 6. `CLAUDE.md` is exactly at the documented ceiling — for #147

`docs/en/costs` says "Aim to keep CLAUDE.md under 200 lines by including only
essentials", and the reason it gives is the one that applies here: "If it
contains detailed instructions for specific workflows ... those tokens are
present even when you're doing unrelated work. Skills load on-demand only when
invoked." The skills page names this repository's situation almost exactly:
"Create a skill when you keep pasting the same instructions, checklist, or
multi-step procedure into chat, or when **a section of CLAUDE.md has grown into a
procedure rather than a fact**."

`CLAUDE.md` was exactly 200 lines before this change, and about 5.5 KB of its
9.5 KB is the worktree protocol — which also exists in full in the
`/worktree-per-change` skill (37 KB, loaded only when invoked) and is *also*
injected into every session by the guard's `SessionStart` hook. Three copies of
one rule, one of which the file itself admits "drifted once already".

The right fix is #147's, not this ticket's: keep the pointer and the
repo-specific traps in `CLAUDE.md`, let the skill carry the protocol, and let the
hook carry the state. This ticket added a four-line pointer to this file, which
puts `CLAUDE.md` marginally over 200 lines — reclaiming that is part of #147.

Two documented things #147 should pick up while it is in there:

- **Compaction instructions belong in `CLAUDE.md`.** A `# Compact instructions`
  heading is a documented way to tell compaction what to preserve. For this
  repository that is measured geometry, the numbers a tuner converged on, and
  what the current Check run said.
- **`AGENTS.md` is not read.** If it ever appears, it needs importing from
  `CLAUDE.md` rather than standing on its own.

And one plain error to correct while it is in there: the *Domain docs* section
tells every session that `CONTEXT.md` and `docs/adr/` do not exist yet. Both
landed in `d560e8b`. A false fact in the always-loaded layer is the most
expensive kind.

### 7. Standing approvals given inside a worktree are thrown away — for #135

`.claude/settings.local.json` is normally kept at the repository root even when
the session started in a worktree — **except on Windows**, where "the file stays
in the starting directory". Today sessions start in the main checkout and enter a
worktree afterwards, so the file lands in the main checkout and survives. The
moment #135's `feature start` launches Claude Code *inside* the worktree, every
"Yes, and don't ask again" will be written into a gitignored directory that gets
deleted when the change lands, and the same prompts will come back forever.

The fix, when that happens: durable allow rules go in the committed
`.claude/settings.json`, or in `~/.claude/settings.json`. Note that project
`allow` rules wait for workspace trust while `deny` and `ask` do not — but trust
is keyed on the main checkout, so it is granted once.

### 8. The setup is right about more than it is wrong about

Recorded so no future session re-litigates it:

- **The vendored guard's hook shape is correct.** `args` alongside `command` is
  documented — "When present, `command` is resolved as an executable and spawned
  directly with `args` as the argument vector, with no shell involved" — which is
  the safer of the two documented forms. `timeout` and `statusMessage` are
  documented too. The guard's sha256 matches the commit recorded in
  `.claude/worktree-per-change.json`; the copy is current.
- **Adding keys to `.claude/settings.json` is safe against a guard resync.** The
  installer unions its own entries into `permissions.allow` and removes only
  those; a `deny` list and an `env` block survive. Its own comment says a resync
  "must not be the moment a decision disappears."
- **Preferring `gh` to an MCP server is documented advice, not just a habit.**
  "Tools like `gh`, `aws`, `gcloud` ... are still more context-efficient than MCP
  servers because they don't add any per-tool listing."
- **`git`-driven CLI work over MCP, `docs/agents/*.md` over prose in source, and
  Checks over invariants-in-comments** are all the same documented principle:
  keep the always-loaded layer small and let the rest load on demand.

## Two documented tools this repository is not using

- **`/insights`** analyses recent sessions on this machine and writes an HTML
  report to `~/.claude/usage-data/report.html` covering "what you work on,
  friction points such as misunderstood requests or buggy code, and suggestions
  for using Claude Code more effectively". That is most of what #129's friction
  log is for, already built, and it costs one command. It analyses up to 200
  unseen sessions per run and its own tokens count against usage.
- **`/usage`'s plan breakdown** attributes recent usage "to skills, subagents,
  plugins, and individual MCP servers, each shown as a percentage of the total"
  and flags "behaviors such as long context or cache misses ... when one accounts
  for 10% or more of recent usage". It answers "where did the money go" directly.
  A [statusline script](https://code.claude.com/docs/en/statusline) reading
  `current_usage.cache_read_input_tokens` and
  `current_usage.cache_creation_input_tokens` shows the same thing live: "A high
  read-to-creation ratio means caching is working well. If creation stays high
  turn after turn, something is changing in your prefix."

## What moved to the Agent Contract

**The short list that belongs in front of every session** — effort, not
instructing a re-check, delivering the ticket's scope, when to delegate,
`ultrathink`, `/rewind` and `/compact`, matching the written deliverable to the
task, and recording denials — is now in
[the Agent Contract](contract.md#how-to-run-the-session). #147 lifted it, and this
was a move rather than a copy: every line is still sourced above, and none of it
is restated here.

**The denial this section carried as a seed** is now in `docs/friction-log.md`,
where the gate it named was corrected. It read as the vendored worktree guard
refusing a read-only `echo` as "too complex to verify that it stays inside the
worktree". That string has never existed in `.claude/hooks/worktree-guard.py` or
anywhere in `chrisJuresh/skills`; it belongs to Claude Code's own worktree
isolation, so the "fix it upstream" the entry recommended would have changed
nothing. The log has the corrected entry, and `CLAUDE.md` has the rule that avoids
the gate entirely.

**One trap from this research that is not a denial** but cost a turn the same way:
`WebFetch` of `code.claude.com/docs/en/env-vars.md` returned a truncated page and
reported four documented variables as "not listed". Fetch the page that *owns* a
variable — `sub-agents.md` for the subagent caps — not the index that references
it.
