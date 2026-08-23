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
Enter. Escape puts it back. The panel at the bottom right has five surfaces:
**Content**, every Content field of every Section, which is how anything the page
speaks without drawing is reached; **Tokens**, a control per Token, of every
Section AND of every part of the Kernel that has a Tokens file; **Motion**, a
scrub per Timeline; **Bakes**, the five Python generators and every number each is
run with; and **Measure**, which picks anything at all — or its parent — moves it,
resizes it, changes its text size, and hands back an **Annotation** — and, if
asked, writes an **Override**.

ADR 0004 gives the Editor Content and Tokens, and it now has both. #146 gave it
the Bakes as well, which is a THIRD kind of thing and not a loosening of that
rule — a Bake writes no composition, it writes the parameters of a generator that
produces an asset. #145 gave it the last two things that ADR names: the Annotation
and the Override, which are what becomes of every change the other four surfaces
cannot express.

## The shape, and why it is this shape

**A write boundary, with a browser on top** (ADR 0004). There are FOUR of them
now, and they are siblings rather than one parser generalised over four formats:
`lib/content.mjs` turns a Section's `content.ts`, a key and a value into the
file's bytes; `lib/tokens.mjs` does the same for a `tokens.css`; `lib/bakes.mjs`
does it for a Bake's `params.json`; and `lib/overrides.mjs` does it for the one
`src/overrides.css`, which belongs to no holder at all. What IS shared is the
plumbing around them — `lib/sections.mjs` resolves the path, reads, calls whichever
boundary it was handed and writes, and `put`, `putToken`, `putParam` and
`putOverride` are that plumbing with one of the file names bound. Sharing the
plumbing is free; sharing the parser would mean one function that understood none
of the four formats exactly. Everything above them — the server, the surfaces, the
panel — is a way of calling one of those four boundaries. The tests are on the
functions, at the bytes, because these are the components in the repository whose
bugs corrupt source files instead of appearing on screen.

**Two of the four replace a span; the other two re-serialise, and the difference
is the file rather than the discipline.** A Bake's parameters re-serialise because
there is nothing in that file to keep; the Overrides re-serialise because the
Editor wrote every byte of it — and THAT one is paid for by a **round trip**,
because a file with nobody else's judgement in it can still have somebody's hand
in it. `parse` accepts only the bytes `render` would have produced, so an edit made
by hand stops the tool instead of being clobbered by it, and
`scripts/check-source.mjs` asks the same question at build time so the refusal
arrives at a build rather than at the next drag.

A Section's Content is
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
a `tokens.css`, `/bake` reaches a `params.json`, and `/overrides` reaches the one
`overrides.css`. No file name is a parameter
anywhere, so there is no argument to any of this that could make the Editor write
a component, a Variant sheet, a script or a Bake's recipe — not a traversal, not
an encoding, not a malformed name — and no way to ask a Content edit to land in a
stylesheet. A name not on disk is refused before any path handling runs.

**There are four families of name**, and they cannot collide. A Section is its
folder under `src/sections`. A part of the Kernel is `kernel-<stem>`, which
resolves to `src/kernel/tokens/<stem>.css` — and a Section folder beginning
`kernel-` is not discovered as a Section at all, which the build already makes
unreachable and `sections.test.mjs` asserts anyway, because this is the function
that decides which file a write lands in. A Bake is its folder under
`design/bake`, and only one of its two files is writable. The Overrides file has
no name at all: there is one of it, under a root the Editor was started with, and
a request carries a selector and some declarations instead — which makes it the
narrowest of the four rather than the loosest.

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

## Measuring: an Annotation, and optionally an Override

The fourth surface, and the one that exists because the other three cannot express
everything. Content is words and a Token is a named number; where a box stands and
how big it is belongs to the composition, and ADR 0004 says a tool that moved
boxes freely would destroy the relationship rather than edit it. So this one
**measures**: click anything, drag it, drag one of its four corners, scrub a row,
or type its numbers.

### It is an inspector, and #166 is why

The surface measured well and was slow to reach, and the complaint was one
sentence: *click a series of text, or its parents, resize them and change the text
size, in one place, without pressing a bunch of buttons.* Four things came out of
it, and each one is a press or a hunt that is no longer there.

**Being on this surface IS being armed.** `editor.js`'s `show()` arms it as the
surface comes forward and disarms as it leaves. There was a *measure* press for
this, and it was a second gate on a decision the author had already made by
choosing the surface — the thing it protected against, a click picking instead of
editing a word, is what the report line says on arrival. Both halves matter and
the smoke Check asserts them separately: a surface that armed and never disarmed
would leave the whole Editor unable to change text, with nothing to turn off.

**The ancestors are drawn.** A click lands on the DEEPEST element under the
pointer, which is almost never the box the author means — the box is a parent of
the word they clicked. `crumbs()` lists the chain, named the way the read-out is
named, each crumb picking its own element; `↑` and `↓` walk the same chain from the
keyboard, and `↓` goes back to whatever the last `↑` climbed away from rather than
guessing among the children. The keyboard stands down while the focus is inside the
panel, because an arrow key in a number box belongs to the box. `Escape` drops the
selection without leaving the surface.

**A row is scrubbed, and letting go writes the Token.** Its label is the handle.
The scrub previews through the same inline styles a drag on the page uses, and the
release lands it — which is the button that is not there. Typing a number and
committing it is the same deliberate change and lands the same way.

**And the fifth row is the text size**, which is the one thing the author kept
reaching for and could not touch. It is beside the box's four and not among them:
`lib/annotations.mjs` exports `TEXT` for it and keeps it out of `AXES`, because a
text size has no share of a parent, no opposite corner and no sign to get wrong,
so folding it in would put it through arithmetic that means nothing for it.

### A row backed by a Token writes; a row backed by nothing does not

This asymmetry is the whole shape of the surface, and it is ADR 0004 rather than an
unfinished half. **A Token is a named number the author is entitled to move. A
coordinate in a composition is not.** So scrubbing a `width` that is declared
`var(--projects-panel-frame-width)` writes that constant on release; scrubbing one
that is a literal moves the page and writes nothing, and leaves by the Annotation
as it always did.

**What makes that worth having rather than a technicality is the census:
seventeen of the nineteen `font-size` declarations under `src/` are exactly
`var(--…)`.** Scrubbing a text size therefore writes a real Token almost every
time, and the two that do not — the `calc()`-built ones — are what `font-size` was
added to `lib/overrides.mjs`'s properties for. That census is the reason this
surface could be given the text size at all without loosening anything.

The write goes through the Tokens surface's own `writeKey`, so the page, the
control, the preview sheet and the file move together — and then the measurement is
reset by `repick()`, because the page has moved and keeping the inline styles would
show the change twice. **That reset is also why the offer is read off the ROW and
not off a list afterwards**: a Check that looked for the offer after the write
found nothing, correctly, because there was nothing left to offer. The row carries
`data-editor-governed` from the moment the element is picked, which is when the
author is deciding.

### A selection, not an element

`this.selection` is a list, primary first. Shift-click adds; shift-clicking
something already in it takes it out again, so a wrong pick is corrected with the
same gesture rather than started over. The rows show the PRIMARY's numbers, and
every change is made to all of them.

**An absolute size, and the same distance moved.** A width, a height and a text
size are given to every member as the number the row says — a series of text set to
one size is the point of the feature. A left and a top are measured off the primary
and given to the rest as a DISTANCE, because a series moved to one coordinate would
be a stack.

**The corners are the primary's alone.** `lib/corners.mjs` resizes from the corner
opposite the one dragged, and five elements have five opposite corners — so a
handle on each would be five different anchors under one pointer. Resizing a series
is what the rows are for. The other members get a dashed marquee and no handles,
so which one the rows are about is never a guess.

**A selection sharing one Token is one write; a selection that does not is none.**
Five sizes governed by `--projects-panel-copy-size` are one constant, so writing it
five times would be five posts saying the same thing and four of them reporting no
change. Where the members are governed by DIFFERENT Tokens nothing is written and
the report says so: which of several constants moved is a judgement, and this
surface's rule everywhere else is to report a judgement rather than take one.

**An Override, by contrast, is one per element.** The boundary's whole guarantee is
that a record addresses the element the author was looking at, so five elements are
five records with five selectors and five discards. What is shared is the geometry,
which is what the rows already made the same.

**A corner resizes from the corner opposite it, and that is the whole rule.**
`lib/corners.mjs` is the arithmetic, and it is a file rather than four signs in a
`pointermove` because three of the four MOVE the box as well as sizing it: the
anchor has to stay exactly where it is, so a west edge that takes 40px off the
width also translates the box 40px right. Two things fall out of writing it that
way and both are asserted in `corners.test.mjs` — the size is clamped at zero
FIRST and the move derived from it, so a box dragged through itself stops with its
far edge where it always was; and the sizes are resolved once, at pointerdown,
because `wanted.width` is null until something asks for one and reading the
fallback off the last measured box on every frame made a slow drag compound and
outrun the pointer. It is a `translate` and never a `left`, which is what keeps a
resize inside the five properties an Override may write.

**A drag is an inline style, and reaches no file at all.** Moving and resizing
happens in the DOM — `translate`, `width`, `height` and `font-size` on the one
element — so
"anything can be moved and resized without writing to the source" holds by
construction rather than by care. *put back* restores exactly the inline values
the page had, which are usually none.

**Those inline styles are `!important`, and the reason is not tidiness.** An
element that already carries an Override is held by a rule that is itself
`!important`, and a plain inline style loses to it — so the second measurement of
anything already overridden would move nothing, report "unchanged", and look
exactly like a broken drag. A standing Override would quietly make its own element
unmeasurable, and the only way to adjust one would be to discard it first.

**`translate` is written as base plus delta, never the delta alone.** The element
may already carry a `translate` — from its composition, or from an Override
standing on it — so the base is read at pick time and every value written from
there. An Override declares `translate` `!important` and therefore REPLACES the
composition's, which is why the Annotation carries the absolute value rather than
what was dragged: the delta alone would snap the element to zero and then out
again.

**An inline box is promoted to be measured at all.** `width`, `height` and
`translate` do not apply to a non-replaced inline box, so a `<span>` or an `<a>` —
most of the text on this page — drags with no effect whatever. The surface sets
`display: inline-block` to measure one, **says so in the report line and in the
Annotation**, and an Override carries the promotion because otherwise the page
would not look like the measurement. That is the one box-model change this tool
makes, `lib/overrides.mjs` refuses any other value of `display` by name, and
`display` alone is not enough to write an Override — a promotion with nothing
dragged would be an Override for having looked at something.

**The numbers are MEASURED and not computed.** After every change the element's box
is read again, so a flex child whose width is capped reports where it actually
landed rather than where it was dragged to. The `before` box is the one it had when
it was picked, taken relative to its parent — because the composition is written in
shares of a parent, so the share is the number an agent needs and the pixels are
how it was reached. The Annotation carries both.

**The element is named out of `CONTEXT.md`, and nothing here holds a second copy of
the glossary.** The server reads the terms out of that file at startup;
`lib/annotations.mjs`'s `name()` titleises the tail of an element's own
`section__part` class and matches it against them. So `projects-panel__frame` is
"the Projects Panel's Frame", and `projects-panel__address-text` is "the Projects
Panel's address text" **plus a line saying the glossary has no word for it** —
which is the honest answer and a nudge towards adding one. A term landing in
`CONTEXT.md` reaches these sentences for free, which is the same mechanism as the
Section folder glob and the Token discovery: the thing that knows is the file that
declares it.

**Where a change maps onto a Token it says so, and offers it.** For each axis that
moved, `client/measure.js` walks the page's own stylesheets for the property that
could govern it — `left`, `right`, `margin-left`, `width`, `max-width` and the rest
— and where the winning declaration is exactly `var(--something)`, that is the
Token. The offer is a button, and pressing it goes through **the Tokens surface's
own control** (`writeKey`) rather than through a second way to write a Token, so
the page, the control, the preview sheet and the file move together. Three things
stop an offer being made, and each is said rather than swallowed: a value that is a
relationship (`clamp()`, `calc()`); a property set from a Token no Section declares,
which means it is the Kernel's and ADR 0004's surface cannot reach it; and a Token
declared on more than one rule, where which one the page is using is a judgement
rather than a lookup. **The sign matters** — dragging right increases `left` and
decreases `right`, and an offer with the wrong sign would be worse than no offer.

**A bound is only the length while the box is standing on it.** `max-width`,
`min-width`, `max-height`, `min-height` and `flex-basis` govern a size without
being it, so restating one to the measured size offers a number that will not move
the page — and an offer reads as certainty. So the bound's own computed value is
compared with the box before the drag, and the offer is made only when the two
agree. Off the bound it is reported with both numbers instead, which is the useful
half of the answer.

**A relationship and a literal are two different answers, and the difference is
most of the value.** A length built out of Tokens is a relationship, and naming the
constants inside it is the decision an agent has to make. A length with no Token in
it is a literal in the composition, and the change to make is to promote it to one
— which is ADR 0004's "anything the author will want to adjust must first be
promoted to a Token", arrived at from the other end.

**A written Token resets the measurement.** The page has moved through the Tokens
surface's preview by then, so keeping the inline styles would show the change
twice. The surface drops them and picks the element again, so the next drag starts
from where the page now is.

### The Override

The one thing on this surface that reaches a file. It goes to `src/overrides.css`
— outside every Section, imported last by the Shell, and written only by
`lib/overrides.mjs`.

**An Override's page and its file are two different things**, exactly as a Token's
are and for the same reason: the served page is a build, so a rule written now is
in the bundled stylesheet at the *next* build. So the surface keeps a stylesheet of
its own holding every Override the file holds, written the way the file writes
them. That sheet is what makes an Override look right immediately, and it is why
the drag's inline styles are dropped the moment one lands — from then on the page
is being moved by what the file says, which is the only thing worth looking at.

**And then it is checked.** Once the sheet is in, the element's box is read again
and compared with what was asked for. An Override that lost to the composition is
reported as one, instead of being a file with a rule in it and a page that never
moved.

**Every declaration is `!important`**, which is the one place this disagrees with
`lib/tokens.mjs` — that boundary refuses `!important` because a Token's value
belongs to a composition. An Override's job is the reverse: to outrank the rule it
argues with, from outside it, until an agent folds it in. Saying so at the bytes is
also what makes the file greppable as debt.

**`translate` and not `transform`**, plus `width`, `height` and `font-size`, and
nothing else. `translate` is a property of its own that composes with whatever GSAP
writes into `transform`, so an Override can never freeze a Timeline. A resize
writes both sides, because a corner moves both and half a box is not a measurement
anybody took — and it writes `translate` too whenever the corner dragged was not
the bottom right, because holding the anchor still IS a move.

`font-size` joined that list for #166, and it is the LAST resort rather than the
first: the Measure surface offers the Token governing a text size before it
offers this, and seventeen of the nineteen `font-size` declarations under `src/`
have one. It is here for the two that are built out of a `calc()`. Like the other
three it is a measured length and not a relationship, and like them it is debt the
moment it is written.

**A selector is built out of the page and checked against it.** The shortest chain
upwards that matches this element and nothing else, made of tags, ids, authored
classes and `:nth-of-type` — never Astro's `astro-…` scoping class, which is a
build's fingerprint and would name a different element after the next one. It
starts at `:root`, which is what makes it outrank the composition on purpose rather
than by luck of source order, and the boundary refuses anything that is not that
shape. Where there is no unique selector the surface says so: an Annotation can
still be taken, and an Override cannot be named.

**Overrides are listed in three places, because invisible debt is the failure the
ticket names.** The Measure surface lists every one with a *discard* beside it; the
panel's header carries a count that stays visible whichever surface is in front;
and `pnpm check:sections` prints how many are standing on every build.

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
as changed — a Section's `content.ts`, a Tokens file, a Bake's `params.json` and
the one `src/overrides.css` — and nothing else in the repository whatever state it
is in. `git commit -- <paths>` commits those and leaves the rest of the index
alone, so an agent's staged work in another window cannot ride along in a commit
the author thinks is a typo fix or a nudged gap. The paths come from `git status`
filtered to those shapes, never from anything the browser said — the browser cannot
name a file at all.

The Overrides file is matched by its whole path rather than by a shape, because
there is one of it and no name to pattern-match; and it is named in a commit
message by its KIND alone, because the directory above it is `src` and would read
as a Section that does not exist.

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

**A `CSSStyleRule` is a grouping rule now, and its `cssRules` is truthy.** CSS
nesting gave every style rule an (empty) `cssRules` of its own, so a stylesheet
walk that reads a truthy `cssRules` as "this is a group, not a declaration" finds
**nothing, anywhere**, and the only symptom is an Annotation that never mentions a
Token. `authored()` reads a rule AND descends into it, never one or the other. The
smoke Check injects a rule of its own to guard this, because nothing about the page
itself would have shown it.

**A rule inside a `@media` that does not apply must not be read.** The Projects
Panel writes `margin-left: 0px` on its Frame inside a `@media` for narrow windows,
and a walk that takes the last match regardless of condition reports that 0 as
what governs the Frame's position at 1440px — a wrong number in an Annotation,
which is the one thing an Annotation may never carry. `inForce()` evaluates
`@media` with `matchMedia` and `@supports` with `CSS.supports`, and treats anything
it cannot evaluate (`@container`) as not holding: reporting a rule that may not
apply is worse than reporting none.

**The Panel's Plinth holds a live CLONE of the Frame**, classes and all, so no
chain of descendants ever addresses one and not the other — which is why a selector
is tried as a `>` chain before a descendant one, and why the boundary's grammar
allows `>` at all. The composition's own stylesheet writes
`.projects-panel__stage > .projects-panel__frame` for the same reason.

**What governs a length is read once, when the element is picked.** A pointerdown
on what is already picked starts a drag rather than picking it again — right for a
finger, and the reason a Check that changes the stylesheet under the surface has to
disarm and re-arm before measuring again.

**Do not add a property to `PROPERTIES` without asking what animates it.** The
list is `translate`, `width`, `height` because `translate` composes with GSAP's
`transform` rather than fighting it. An Override on `transform` would be
`!important` over a Timeline's own writes, and the symptom is motion that stopped
with no error anywhere.

## Four files on the client, and why the splits are there

`client/editor.js` is one `Editor` class doing Content binding, in-place editing,
the field list, publishing and listening. It said of itself that it wanted
splitting and was not split because its seams share one piece of state — the field
index that binds an element is the index the panel renders and the index a write
updates — and that the calculus would change if the Editor grew a second surface.

It has, three times, and it did. `client/tokens.js` is the Tokens surface and the
Timeline scrub; `client/bakes.js` is the Bakes; `client/measure.js` is Measure —
the Annotations and the Overrides, addressed by a selector built out of the page,
and handed the Tokens surface ITSELF so that a Token a measurement landed on is
written through the control that already owns it. The splits are at real seams
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
| `lib/overrides.test.mjs` | the bytes of the Overrides file, the round trip that lets it re-serialise, and every refusal |
| `lib/annotations.test.mjs` | the Annotation's own text — the glossary read out of the real `CONTEXT.md`, what an element is called, and every number restated |
| `lib/bakes.test.mjs` | the bytes of a Bake's parameters, the argv a Bake is run with, and every refusal |
| `lib/corners.test.mjs` | the corner arithmetic: per corner, that the opposite one does not move — through the clamp as well |
| `lib/runs.test.mjs` | whether a run is in flight, how it ended, and what it says when it did not end well |
| `lib/sections.test.mjs` | that a request cannot name a file, against every resolver and all three families |
| `lib/publish.test.mjs` | which arguments git is handed, and what counts as one of the Editor's paths |
| `scripts/checks/checks/editor.mjs` | one smoke Check: click, type, drag, scrub, measure, resize by every corner, override, discard, and find each in the file |

`pnpm test` runs everything but the last; `pnpm check` runs them and then the
Check. `lib/runs.test.mjs` drives a fake child process rather than a real
generator, for the reason above: every one of the five needs something this
repository does not carry, so a test that ran one would be asserting the machine.

The Check writes to a **temporary copy** of everything the Editor may write and
compares the real files before and after. That matters more than it sounds: it runs
from the pre-commit hook, and a Check that edited the tree it was gating would put
a file it wrote into the commit it was checking.

**It picks a Section's own mount point to measure, and dispatches the pointer
events on it** rather than moving a real mouse. A real click lands on whatever is
deepest under the cursor, so the Check would have to name an element of a
composition to know what it had picked — and would then fail the day that element
was renamed. The listeners are on `document` in the capture phase, so an event
dispatched on a descendant reaches them exactly as the author's own would.

**It injects a rule of its own to assert the Token offer**, and that is the one
place it stages a situation rather than finding one. Whether a length is governed by
a Token depends on the composition, so a Check that looked for one would either name
an element — and fail the day it was renamed — or assert nothing on a day nothing
matched. So it declares a real Token, discovered from `/state` and filtered to a
plain length on exactly one rule, as the width of the element it is about to
measure. Its second rule is a trap: later in the sheet, so it would win on source
order, inside a `@media` that never holds.

Twenty-one mutations have been shown to fail it: the boundary writing nothing, the
handshake requirement removed, the surface binding nothing, empty Content values
allowed — the last of which is caught by `content.test.mjs` before the browser
starts, which is where it belongs — no Tokens discovered, a drag that does not move
the page, a drag that writes the file on every frame, a scrub that does not hold,
and a scrub not wired to the Timeline at all; and, for #145, a measuring drag that
writes to a source file, an Override whose declarations lose their `!important`
(caught by `overrides.test.mjs`, again before the browser), an Override that lands
in the file without reaching the page, an Override that leaves the drag's inline
styles standing on the element, a discard that does not write, a stylesheet walk
that reads a style rule as a group and therefore finds nothing, one that reads a
`@media` whose condition does not hold, a drag written without `!important` so a
standing Override freezes its own element, and an inline box that is not promoted
and therefore cannot be dragged at all; and, for #162, a handle that does not know
which corner it is, a resize that treats every corner as the bottom right, and a
`client/editor.css` that stops parsing before the measuring section.

Five were real bugs rather than invented mutations — four of #145's nine, and the
unclosed CSS rule of #162's three — and none of them showed as anything but a
silence, which is the argument for reading what the tool actually SAYS and not only
whether it is green.

**A dispatched pointer event does not need the element to be drawn, and that is
the blind spot this Check had.** Every assertion above dispatches straight at an
element, so all of them pass on a marquee with no styling at all — and one
unclosed rule in `client/editor.css` (`[data-editor-token] select`, missing its
`}`) made the parser drop EVERY rule after it, which was the whole measuring
section: the marquee, the handles and their cursors. Nothing failed, and the only
symptom was an author who could not grab anything and had to type digits, which is
what #162 was filed about. So the Check now reads the computed `position` of the
marquee and of all four handles before it drags any of them. It is not asserting
that they look good — it is asserting that the stylesheet reached them at all.
