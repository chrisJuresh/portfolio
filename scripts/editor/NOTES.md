# The Editor

The tool that takes text changes and tuning out of the token budget. Opened
locally, it shows the real Portfolio; clicking a piece of text changes it,
dragging a control changes a number, and Publish commits and pushes.

```bash
pnpm editor
```

```bash
pnpm editor -- --no-build --port 8790
```

It builds this tree, serves that `dist/`, and prints a URL. Click any text, type,
Enter. Escape puts it back. The panel at the bottom right has four surfaces:
**Content**, every Content field of every Section, which is how anything the page
speaks without drawing is reached; **Tokens**, a control per Token, of every
Section AND of every part of the Kernel that has a Tokens file; **Motion**, a
scrub per Timeline; and **Bakes**, the five Python generators and every number
each is run with.

ADR 0004 gives the Editor Content and Tokens, and it now has both. #146 gave it
the Bakes as well, which is a THIRD kind of thing and not a loosening of that
rule — a Bake writes no composition, it writes the parameters of a generator that
produces an asset. What the Editor still does not have is an Annotation or an
Override — a change it cannot express is still a sentence written to an agent by
hand.

## The shape, and why it is this shape

**A write boundary, with a browser on top** (ADR 0004). There are THREE of them
now, and they are siblings rather than one parser generalised over three formats:
`lib/content.mjs` turns a Section's `content.ts`, a key and a value into the
file's bytes; `lib/tokens.mjs` does the same for a `tokens.css`; and
`lib/bakes.mjs` does it for a Bake's `params.json`. What IS shared is the plumbing
around them — `lib/sections.mjs` resolves the path, reads, calls whichever
boundary it was handed and writes, and `put`, `putToken` and `putParam` are that
plumbing with one of the file names bound. Sharing the plumbing is free; sharing
the parser would mean one function that understood none of the three formats
exactly. Everything above them — the server, the surfaces, the panel — is a way of
calling one of those three boundaries. The tests are on the functions, at the
bytes, because these are the components in the repository whose bugs corrupt
source files instead of appearing on screen.

**Two of the three replace a span; the third re-serialises, and the difference is
the file rather than the discipline.** A Section's Content is
TypeScript carrying comments, a schema, authored line breaks and long strings
written as a sum of literals; a Section's Tokens are mostly the paragraphs that
say what each number does and where it was measured. Reading either into an
object and writing it back would produce a file that parses and has lost all of
that. So the only edit made is: find the bytes of one string literal or one
declaration's value, put different bytes there. Both `write`s prove that about
their own output before returning it — they re-read the bytes and require the same
fields or declarations in the same order with one value changed — so a parser bug
is a refusal rather than a damaged file.

**One value written over a sum comes back as one literal.** `'a long ' + 'string'`
becomes `'a long string'` on one line. That is the one formatting change either
boundary makes, it is why `write` returns the source untouched when the value has
not changed, and it is the reason there is no test asserting a Content file is
byte-identical after any write. A Token file is: replacing a value's bytes is the
whole of what happens to it.

**Content is only strings.** An object or an array is a Section's structure rather
than its words, and editing one would mean re-serialising. Both are refused by
name, so "an array, not a string" is what the author reads rather than "no such
key".

**A Token is only a value.** A `;` would start a second declaration, a `}` would
end the rule and put everything after it outside one, a comment marker could take
the rest of the file with it, and `!important` is a value that outranks the
composition rather than one belonging to it. All refusals, none escaped — escaping
would mean deciding what the author meant. The boundary never writes a property
name, a selector or a rule either, so `scripts/check-source.mjs`'s grammar for
that file — Tokens only, on the holder's own root — holds by construction.

**A Bake's parameters re-serialise, because there is nothing in that file to
keep.** `params.json` holds a flat object of strings and nothing else: no comment,
no ordering, no formatting. Everything a `tokens.css` is protected FOR — the label,
the range, the paragraph saying what a number does — is in the Bake's
`recipe.json`, which is authored, committed and never written by anything here.
So the writable file is written back sorted, two-space, one trailing newline, and
two sessions that tuned the same two numbers produce the same bytes. The self-check
is still there: the output is read back and required to hold exactly the pairs
that were meant to be in it.

## What it will and will not write

`lib/sections.mjs` is the only thing in the Editor that turns anything off the
wire into a filesystem path, and **it takes a NAME rather than a path.** Every
file name is a constant of that module, and **which kind a request gets is decided
by the route it arrived on**: `/content` reaches a `content.ts`, `/tokens` reaches
a `tokens.css`, `/bake` reaches a `params.json`. No file name is a parameter
anywhere, so there is no argument to any of this that could make the Editor write
a component, a Variant sheet, a script or a Bake's recipe — not a traversal, not
an encoding, not a malformed name — and no way to ask a Content edit to land in a
stylesheet. A name not on disk is refused before any path handling runs.

**There are three families of name**, and they cannot collide. A Section is its
folder under `src/sections`. A part of the Kernel is `kernel-<stem>`, which
resolves to `src/kernel/tokens/<stem>.css` — and a Section folder beginning
`kernel-` is not discovered as a Section at all, which the build already makes
unreachable and `sections.test.mjs` asserts anyway, because this is the function
that decides which file a write lands in. A Bake is its folder under
`design/bake`, and only one of its two files is writable.

`sections.test.mjs` is that assertion, spelled seventeen ways, against every
resolver.

## How a click finds a Content key

Nothing in a Section's markup says which Content field it draws, and nothing
should: an attribute per string would be markup written for a tool, shipped to
every reader, in the repository whose whole point is that a Section holds only
itself. So the binding is made by **matching**. The server hands over every
Content value; an element whose own text is exactly one of them is that field.
Content is the words on the page, so the words on the page are how it is found.

Three consequences, and each one has a visible answer in the panel rather than a
silent failure:

**The value matched against is the one the SERVED BUILD was made from**, not the
current one. The server captures every Content value at startup — that is the
`built` half of each field — and reads the current half off disk per request. The
surface finds an element by `built` and displays `value`. This is what makes an
edit survive a reload: the built page still says what the build put there, and the
surface puts the current value over it. A field whose `built` value is not on the
page is reported as not found, which is also how a stale `--no-build` dist
announces itself.

**Two fields holding the same string are left unbound.** `Projects` is the Front
Screen's link, its Cut Title, the Panel's masthead and the Rail's spoken name;
picking one of those for the author would edit a field they were not looking at.

**The click surface reaches text an element wholly owns.** A Rail item is
`Eater Map` followed by a `<span>` holding a different field, so its text is two
fields' worth — making it editable would let one edit rewrite both, and the safe
alternative, editing the text node under a `contenteditable` parent, cannot stop
the author deleting the sibling. Those go through the field list. As does
` — no page yet`, for a different reason worth knowing: markup adds whitespace, so
matching is done trimmed, and the click path puts the original value's leading and
trailing space back on the way out. The panel's input carries the raw value
instead, spaces included, because there the author is looking at the string
itself.

A bound element carries three attributes, and three rather than one composite is
the point: `data-editor-key` is `section.field` and reads well in devtools, while
`data-editor-section` and `data-editor-field` are what anything downstream
actually consumes. A field key holds dots of its own —
`work.entries.0.org` — so anything handed only the composite has to guess where the
Section name ends. Nothing on the page needs any of them.

## How a Token finds its control

**Nothing lists them.** A Token's control comes from a `tokens.css` being parsed,
so a holder that promotes a new number gets a control for free and there is no
list anywhere to forget to add it to. That is the same mechanism as the Section
folder glob in `src/kernel/loader.ts`, applied to a file rather than a folder.

**And the Kernel has them too.** The Effect Stack's hundred numbers and the three
corner pictures' placement are Tokens by every part of `CONTEXT.md`'s definition
except the word *Section*, and #146 is the ticket that had to reach them: they are
what two of the five tuners it absorbed were for. So the Kernel keeps its Tokens
in `src/kernel/tokens/`, one file per part, `@import`ed first by the stylesheet
that draws from them — first, because the one narrow-window correction the Effect
Stack carries is a `@media` and has to stand after the value it corrects. They
answer to `kernel-<stem>` and are discovered exactly as a Section is.
`scripts/check-source.mjs` runs the Editor's own parser over each of them, so a
declaration slipped into one is a build failure rather than a surface that takes
every control in the file down.

**A key names the rule as well as the property**, as `<rule index>:<property>`.
`--front-screen-thumb-at` is declared twice — once on the Section's root and once
under `:root[data-theme='dark']`, because where the switch's thumb stands depends
on the paper — and those are two Tokens the author wants two controls for. `write`
requires the property at that index to be the one the key names, so a key built
against an older file is a refusal rather than a write to whatever now stands in
that position.

**What kind of control a value asks for is read off the value.** A number with or
without a unit is dragged; a hex or an `rgba()` gets a colour and an alpha; and
everything else is a text box. That last is ADR 0004 rather than a limit of the
parser: a `clamp()`, a `calc()`, a `color-mix()` and a `var()` are
RELATIONSHIPS, and dragging one end of one destroys it rather than editing it. The
front-screen Tokens say so of their own clamp in as many words.

**A slider's range is derived from the value in the file** — four times what the
author chose, on the side of nothing they chose it on — because nothing declares
one. So the slider is a nudge around the composition's own value and the number
box beside it is the value, which is also what lets a Token leave the range it was
given. The range comes from the value the SESSION STARTED WITH and not the current
one, or it would move under the finger dragging it.

**Controls are grouped by the comments in the file.** A comment above a
declaration heads the group the declarations under it belong to, and the whole of
it is shown under the heading — those paragraphs are what say what each Token
does, so a control needs no label written for it. The file says where a group
starts and never where it ends, so a Token with no comment of its own lands in the
last group named; a new rule starts a new run whatever heading was last named,
because the dark paper's declarations are not a continuation of the light paper's
last group.

### A drag previews; a release writes

This is the one thing here worth reading twice, and the smoke Check asserts both
halves separately.

A Token lives in a stylesheet the served build **baked**, so writing the file does
not move the page — unlike Content, where the words are in the DOM and can be
replaced. So the Tokens surface keeps a stylesheet of its own in the document,
holding one declaration per Token that has moved, written with the **same selector
the declaration came from**. Same selector means same specificity, and that sheet
is later in the document, so it wins that tie — and only that tie. A Token
declared under `:root[data-theme='dark']` still outranks the one on the Section's
own root, which is right: those are two Tokens with two controls, and dragging the
light one must not move the dark paper.

That sheet is also what "live" means, and **it stays after the write lands**: the
bundled stylesheet still holds the old value until the next build. A Token put back
to what it was before the session loses its declaration rather than getting one
that repeats the build, so the sheet reads in devtools as a list of exactly what
this session changed.

**A Token read by script rather than by CSS updates live only if the Section reads
it late**, and that is the Section's doing rather than this tool's.
`front-screen/timeline.ts` reads its feel Tokens off `getComputedStyle` once per
GESTURE, so a drag on the friction moves the next flick. `stub/timeline.ts` reads
`--stub-rise` inside a function-based tween value, which GSAP evaluates when the
tween initialises, so that one takes a reload. Nothing here can tell the two apart,
and nothing here should: the preview writes the custom property, and where a
Section reads it from is the Section's decision.

## Scrubbing a Timeline

The Motion surface is the other thing ADR 0003's named seekable Timeline was for,
and it is in the same file as the Tokens surface because a duration and an easing
are Tokens: tuning motion is dragging a control and then scrubbing to the moment
the change shows.

**It holds before it seeks, always.** A scrubbed Timeline is recomputed from the
scroll position on the next tick, so a bare seek survives about one frame —
`src/kernel/NOTES.md` records the wrong diagnosis that cost. Holding is also the
pause the ticket asks for: the playhead stays where it was put until the author
gives the scroll back. Moving a scrub holds if nothing is held yet, so it is not
something to remember to do first.

**The list cannot be complete at load, and is not.** A Section registers its
Timeline when it MOUNTS, which happens as the reader approaches it, so the list is
built from `window.portfolio.timelines` and rebuilt on the `section:mounted` event
the Kernel's loader already dispatches. Only the Turn is there at boot. While
nothing is held, each readout follows the scroll, because that is where the
playhead actually comes from.

## The Bakes, which are the second speed

`pnpm editor`'s fourth surface, and #146's whole reason for existing: one editing
surface instead of six. The plate, plinth, plinth-studio, morph and effects tuners
each drove a Python generator rather than a stylesheet, which is why they were
separate — and absorbing them needed a second speed rather than a fourth panel.

**A Token moves the page in the frame it is dragged in. A baked parameter moves
nothing until a generator has run.** A Token is a custom property, so a stylesheet
of this tool's own can hold it; a baked parameter is in a photograph's grade or a
marble's veining, and the only thing that can apply it is fifteen seconds of
Cycles or two minutes of Pillow. So the Bakes surface writes on release exactly as
the Tokens surface does, and then does nothing at all until Re-bake is pressed.

**A Bake is a folder under `design/bake/` holding two files, and only one of them
is ever written.** `recipe.json` is the declaration — what the Bake is, what it
needs that this repository does not carry, the command, and every parameter with
its default, its label, its range and the paragraph saying what it does. It is
authored and committed, and nothing here writes it, which is what lets it hold the
prose. `params.json` is what has MOVED off those defaults, and nothing else.

**The generator reads that file too, and that is the point.** Every one of the five
tuners ended by printing a block of Python to paste back by hand, and a paste that
was not made is a shipped asset nothing in the tree describes — the plate tuner
says so of itself, and so does the plinth studio about its `?v=` digest. A
generator that reads `design/bake/<name>/recipe.json` through `design/bake/tuning.py`
is run the same way from the Editor and from a shell. There is nothing to paste
and nothing to drift, which is also the whole of how "every generator still runs
standalone" survived being absorbed.

**A parameter reaches the generator one of two ways, and the recipe says which.**
A `{key}` in the command is substituted; a parameter declaring `arg` becomes that
flag; everything else reaches `params.json` and is read there. The split is not a
preference — it is what each generator already had a door for. `add-stone.py` takes
every one of its parameters as a flag and always has, and putting those in a file
as well would be a second way to say the same thing that a shell run would not
agree with.

**Nothing is previewed, and not previewing is the honest answer.** Every one of
the five tuners drew something before the bake — a canvas transcription of the
grade, a GLSL twin of the marble, a rectangle showing which part of a photograph
lands on the block — and every one then had to say at length where its picture
parted company with the real one. The plinth studio put it best: what it can show
you before a bake is the WINDOW, which answers two parameters and is honest about
answering nothing else. A second transcription of each pipeline is a second thing
to keep in step with the first. What this surface shows instead is the exact
argument list Re-bake will run, so it can be read before it is pressed and typed
into a shell instead.

**A run is polled.** `/bake/run` answers as soon as the generator has started and
the surface asks `/bakes` how it is going until it stops — holding a request open
for two minutes is a request that times out somewhere and a page that says
nothing. One run at a time PER BAKE and not overall: two generators writing two
different sets of files is fine, and two runs of one generator race for the same
output paths.

**A failure keeps the tail of what the generator printed**, because that is where
the reason is. A Python traceback ends with the exception, Blender ends with what
it could not open, and Pillow ends with the file it wanted; the first kilobyte of
any of them is a banner. `outcome()` names the one case a status code cannot:
`python` not being on PATH reads as a broken Editor if it is reported as an exit
code and as a machine without Python if it is reported as itself.

**Every one of the five needs something this repository deliberately does not
carry** — a raw frame, two 12 MB JPEGs, Blender, a font. So a failure is not an
error case here, it is the ordinary answer on a fresh checkout, and the recipe's
`needs` is printed above the button rather than after it.

### A success rebuilds, and the recapture is the part that is not optional

The server runs `pnpm build` after a bake and only then reports the run done.

**The whole build and not a copy**, because a baked asset reaches the page two
different ways and only one of them survives copying the static tree in: the
corner pictures are fetched at run time by `corners.ts`, while the two Texturelabs
plates are named in a `url()` and are fingerprinted into the bundle. Assembling
alone would show the new plate for one of those and the old one for the other,
which is the quietest possible wrong answer.

**And then both baselines are recaptured.** The Content baseline is *what the
served build says*, and the whole binding of an element to a Content key is made
against it — so a rebuild that left the old baseline standing would report every
field edited this session as not found on the page. Rebuilding and recapturing are
one operation for that reason.

The page is then reloaded rather than an element swapped, because a baked asset is
not in the DOM to swap.

### The recorded marble comparison is not re-run

`blender -b -P design/plinth/build-slab.py -- all` re-renders every plate,
including the four gemini ones and the four procedural ones the marble bake-off
was judged from. So the plinth Bake renders ONE STONE and never a built-in: its
parameters ARE a stone, `build-slab.py`'s `tuned_stone()` reads them into an
ordinary `CANDIDATES` entry, and a name the file already defines is refused rather
than shadowed — the same rule, and the same wording, as `load_added_stones()`
beside it. `BUILT_IN_PROC` is what keeps the `proc` group meaning the four
built-ins after that merge; a group that quietly grew to include whatever the
Editor last tuned would make the command that reproduces the comparison mean
something different every time it was run.

### Where the five went

`design/legacy/`, working. "The Editor is better than the six" is a judgement the
author gets to reverse, so every one of them still opens: the paths that were
relative to the generator beside them now name that folder, and `plinth-studio.py`
moved with its own page because the page is nothing without its server.

The generators did not move, and none of them lost a flag.

## Publish

Two things about the commit are load-bearing.

**It is pathspec-limited** to the files the Editor writes that git itself reports
as changed — a Section's `content.ts` and a Section's `tokens.css`, and nothing
else in the repository whatever state it is in. `git commit -- <paths>` commits
those and leaves the rest of the index alone, so an agent's staged work in another
window cannot ride along in a commit the author thinks is a typo fix or a nudged
gap. The paths come from `git status` filtered to those two names, never from
anything the browser said — the browser cannot name a file at all.

**It does not pass `--no-verify`.** `.githooks/pre-commit` runs the Checks on every
commit (ADR 0006), so a Publish takes about a minute and a broken tree refuses to
publish. That is the gate working, and the refusal quotes the hook rather than
reporting "git failed". The panel says so before it starts.

A push that fails is a **report and not a refusal**: the commit has landed by
then, and calling the whole thing a failure would send the author looking for work
that is already committed. Publish also reports what it left alone, so a dirty
tree is visible rather than silent.

## The handshake header, which is not decoration

This server writes source files and answers on localhost, so any page in any
browser tab can reach it. A simple `POST` is not subject to a preflight, so a
drive-by page could otherwise post to it. Every route that changes something
requires an `x-editor: 1` header, which a cross-origin request cannot set without
a preflight, and nothing here answers a preflight. The smoke Check asserts a
write with no handshake is refused, and that assertion has been shown to fail when
the requirement is removed.

## Nothing about it ships

The injection happens in the Editor's own response, on the Editor's own origin.
`dist/` is Astro's output plus the four static roots `scripts/assemble-dist.mjs`
copies in, and `scripts/` is not among them — so there is nothing to exclude and
nothing to remember. The smoke Check asserts it anyway, against the build the rest
of the suite is served from.

## It serves the tree it was invoked from

Same rule as `pnpm preview` and the Checks, and here it has teeth: the in-app
preview serves the main checkout, so in a worktree it would let the author edit one
tree's Content while looking at another's. **Never open the Editor through
`preview_start`.**

## The traps

**The Section-name pattern lives in `sections.mjs` and is exported.** Publish has
to recognise the Editor's own paths in `git status` output, and the first version
of it hand-wrote `[a-z][a-z0-9-]*` — looser than the real pattern, so `a--b/…` and
`trailing-/…` would both have been committed as Sections. Two files disagreeing
about what a Section is called is the kind of thing that decides what gets
committed, so there is one pattern, and `writtenAmong` builds its shape out of it
and out of both file-name constants.

**`getSelection().selectAllChildren` and then `Control+A`.** The surface selects
the element's text when it becomes editable, but a driver still has to press
select-all before typing — Playwright's `type` appends otherwise, and the
resulting value looks like a boundary that concatenated instead of replacing.

**A refusal logs a console error.** The `400` is correct and the surface reports
it in words, but it means the Editor's own page is not console-clean after a
refusal. The `console` Check is unaffected — it runs against `dist/` without the
Editor — and the smoke Check does not assert console cleanliness for that reason.

**The rebuild is SPAWNED and not `spawnSync`.** A build is ten to twenty seconds,
and running it synchronously blocks this server's whole event loop for that long
— so the surface's poll goes unanswered, the keep-alive it is on times out the
moment the loop is given back, and the page sees `ECONNRESET` rather than
"baking". It also just freezes the Editor while the author watches it. This one
was written the wrong way first and found by driving a bake end to end, which is
the only way it shows: every unit test of the runner passes either way.

**A re-bake takes a build with it, so it is a minute even when the generator is
seconds.** That is the rebuild above rather than a slow generator, and it is why
the run's report separates "the generator finished" from what happened next: a
bake that worked and a build that did not is one sentence saying both.

**A stale dist is loud about Content and quiet about Tokens.** A field the Editor
cannot find on the page is reported; a Token whose control is right while the page
under it is a build old looks like nothing at all. `pnpm editor` builds first, and
that is the reason.

## Three files on the client, and why the splits are there

`client/editor.js` is one `Editor` class doing Content binding, in-place editing,
the field list, publishing and listening. It said of itself that it wanted
splitting and was not split because its seams share one piece of state — the field
index that binds an element is the index the panel renders and the index a write
updates — and that the calculus would change if the Editor grew a second surface.

It has, twice, and it did. `client/tokens.js` is the Tokens surface and the
Timeline scrub; `client/bakes.js` is the Bakes. Both splits are at real seams
rather than tidy ones: a Token is addressed by a rule and a property and is bound
to no element at all, and a Bake's parameter is not on the page in any form until
a generator has run — so neither shares that field index. What is shared is the
panel, the one report line and Publish, and those are passed in, which is why "3
edited" and "refused: …" mean the same thing whichever surface produced them. The
cost was one entry in the server's `CLIENT` map each rather than a bundler,
because both surfaces were already modules.

The Bakes surface reads itself from the server rather than out of `state`, and
that is not a third pattern: it POLLS while a generator runs, and `/state`
re-reads every Content and Tokens file in the tree.

**The surface imports the boundary.** `lib/tokens.mjs` has no node imports — only
`Refused` out of `lib/content.mjs`, which has none either — so it is served to the
browser, and the surface decides what control a value asks for with the same
`control()` the tests are written against, and writes a number back with the same
`amount()`. Two spellings of "three steps of 0.1 is 0.3rem", one in node and one in
the browser, is exactly the kind of disagreement this repository pays for
elsewhere.

## The tests

| file | asserts |
| ---- | ------- |
| `lib/content.test.mjs` | the bytes of a Content file: what moved, what did not, and every refusal |
| `lib/tokens.test.mjs` | the bytes of a Tokens file, what control a value asks for, and every refusal |
| `lib/bakes.test.mjs` | the bytes of a Bake's parameters, the argv a Bake is run with, and every refusal |
| `lib/runs.test.mjs` | whether a run is in flight, how it ended, and what it says when it did not end well |
| `lib/sections.test.mjs` | that a request cannot name a file, against every resolver and all three families |
| `lib/publish.test.mjs` | which arguments git is handed, and what counts as one of the Editor's paths |
| `scripts/checks/checks/editor.mjs` | one smoke Check: click, type, drag, scrub, and find it in the file |

`pnpm test` runs everything but the last; `pnpm check` runs them and then the
Check. `lib/runs.test.mjs` drives a fake child process rather than a real
generator, for the reason above: every one of the five needs something this
repository does not carry, so a test that ran one would be asserting the machine.

The Check writes to a **temporary copy** of every Section's Content and Tokens and
compares the real files before and after. That matters more than it sounds: it runs
from the pre-commit hook, and a Check that edited the tree it was gating would put
a file it wrote into the commit it was checking.

Nine mutations have been shown to fail it: the boundary writing nothing, the
handshake requirement removed, the surface binding nothing, empty Content values
allowed — the last of which is caught by `content.test.mjs` before the browser
starts, which is where it belongs — and, for this ticket, no Tokens discovered, a
drag that does not move the page, a drag that writes the file on every frame, a
scrub that does not hold, and a scrub not wired to the Timeline at all.
