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
Enter. Escape puts it back. The panel at the bottom right has three surfaces:
**Content**, every Content field of every Section, which is how anything the page
speaks without drawing is reached; **Tokens**, a control per Token; and
**Motion**, a scrub per Timeline.

ADR 0004 gives the Editor Content and Tokens, and it now has both. What it still
does not have is an Annotation or an Override — a change it cannot express is
still a sentence written to an agent by hand.

## The shape, and why it is this shape

**A write boundary, with a browser on top** (ADR 0004). There are two of them, and
they are siblings rather than one parser generalised over two formats:
`lib/content.mjs` turns a Section's `content.ts`, a key and a value into the
file's bytes, and `lib/tokens.mjs` does the same for `tokens.css`. What IS shared
is the plumbing around them — `lib/sections.mjs`'s `place()` resolves the path,
reads, calls whichever boundary it was handed and writes, and `put` and `putToken`
are that function with one of the two file names bound. Sharing the plumbing is
free; sharing the parser would mean one function that understood neither format
exactly. Everything above them — the server, the surfaces, the panel — is a way of
calling one of those two boundaries. The tests are on the functions, at the bytes, because these
are the two components in the repository whose bugs corrupt source files instead
of appearing on screen.

**Each replaces a span; neither re-serialises.** A Section's Content is
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
that file — Tokens only, on the Section's own root — holds by construction.

## What it will and will not write

`lib/sections.mjs` is the only thing in the Editor that turns anything off the
wire into a filesystem path, and **it takes a Section NAME rather than a path.**
There are exactly two file names, both constants, and **which of the two a
request gets is decided by the route it arrived on**: `/content` reaches
`content.ts` and `/tokens` reaches `tokens.css`. Neither name is a parameter
anywhere, so there is no argument to any of this that could make the Editor write
a component, a Variant sheet or a script — not a traversal, not an encoding, not a
malformed name — and no way to ask a Content edit to land in a stylesheet. A
Section not on disk is refused before any path handling runs.

`sections.test.mjs` is that assertion, spelled ten ways, against both resolvers.

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

**Nothing lists them.** A Token's control comes from the Section's own
`tokens.css` being parsed, so a Section that promotes a new number gets a control
for free and there is no list anywhere to forget to add it to. That is the same
mechanism as the Section folder glob in `src/kernel/loader.ts`, applied to a file
rather than a folder.

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

**A stale dist is loud about Content and quiet about Tokens.** A field the Editor
cannot find on the page is reported; a Token whose control is right while the page
under it is a build old looks like nothing at all. `pnpm editor` builds first, and
that is the reason.

## Two files on the client, and why the split is here

`client/editor.js` is one `Editor` class doing Content binding, in-place editing,
the field list, publishing and listening. It said of itself that it wanted
splitting and was not split because its seams share one piece of state — the field
index that binds an element is the index the panel renders and the index a write
updates — and that the calculus would change if the Editor grew a second surface.

It has, and it did. `client/tokens.js` is the Tokens surface and the Timeline
scrub, and the split is at a real seam rather than a tidy one: a Token is addressed
by a rule and a property and is bound to no element at all, so it shares none of
that field index. What is shared is the panel, the one report line and Publish, and
those are passed in — which is why "3 edited" and "refused: …" mean the same thing
whichever surface produced them. The cost was one entry in the server's `CLIENT`
map rather than a bundler, because the surface was already a module.

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
| `lib/sections.test.mjs` | that a request cannot name a file, against both resolvers |
| `lib/publish.test.mjs` | which arguments git is handed, and what counts as one of the Editor's paths |
| `scripts/checks/checks/editor.mjs` | one smoke Check: click, type, drag, scrub, and find it in the file |

`pnpm test` runs the first four; `pnpm check` runs them and then the Check.

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
