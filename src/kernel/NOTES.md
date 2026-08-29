# The Kernel

The small set of things every Section may rely on, and the only thing permitted
to cross a Section boundary: the faces, the theme and the Turn, the Effect Stack,
the corner pictures, the Section loader, and the page turn between the Sections
along with the landing it arrives at.

It is also the only place in `src/` allowed to write a global selector. A Section
that wants something global wants it in here, and adding it is a decision rather
than a convenience.

## What is in it, and what each file owns

| file                        | owns                                                        |
| --------------------------- | ----------------------------------------------------------- |
| `faces.css` / `tokens/faces.css` | the five families, six files, the face Tokens, and the page's own type size — the zoom, the ceiling and the give-way |
| `ground.css`                | the theme's two papers, the Turn across them, and that the document never scrolls sideways |
| `corners.css` / `corners.ts`| the plate, the car and the eye — geometry, and which rung    |
| `effect-stack/`             | the nine layers, and the grain tile                          |
| `theme.ts`                  | which paper, where it is stored, and who is told when it changes |
| `turn.ts`                   | the Turn, as one named seekable Timeline, how far it runs in each regime, and `onTurn()` for anything drawn against it that CSS cannot draw |
| `landing.css` / `tokens/landing.css` | the landing band, the measure two Sections share across it, and the two resting places |
| `page-turn.ts`              | one wheel notch between those resting places, and a link into a Section going the same way |
| `wheel.ts`                  | who owns a wheel gesture — the page, or a roll inside it     |
| `loader.ts`                 | mounting a Section as it approaches the viewport             |
| `motion.ts`                 | `hold()` / `release()` — see below                            |
| `handles.ts`                | `window.portfolio`, and nothing else a Check may reach for   |
| `content.ts`                | `defineContent` — how a Section's Content gets typed         |
| `Kernel.astro`              | the part of the Kernel that stands before the Sections       |

## The landing, and why the measure is the Kernel's

`src/kernel/landing.css` is the far end of the page turn: inside the band the
Front Screen's Cut Title stands in the Projects Panel masthead's slot, that
masthead goes invisible underneath it, and the word neither travels nor resizes to
get there — **the Section comes up to the word.** Each Section's own half is in
its own component; what is here is the part neither could own.

**Two Sections have to agree about one length.** The word is drawn at the Panel
masthead's cap, and the Panel's composition is solved for the height the Front
Screen gives up — and a Section may read only the Kernel. So the width both are
functions of is solved here, once, and each Section reads the answer:
`--landing-w`, `--landing-cap`, `--landing-mast-top`, `--landing-top`, and
`--landing-side`, which is a term rather than an answer but has to cross the same
boundary — the word is set on it and the composition begins on it.
`tokens/landing.css` holds the terms it is solved from and names the Section each
was taken from. Three of them are restated rather than shared, which is what the
`turn` Check exists for: it compares the Kernel's published cap, drop and stone
against the Panel's own arithmetic, because a drift in any of them draws a page
nobody can see is wrong.

**The landing's two margins are two numbers, and that is the change worth
knowing.** In the band the page has a margin at the top and one on the left and
nowhere else — the Plinth stands on the page's bottom edge and the width branch
puts the marble's far end on its right one. `--landing-side` is the left and
`--landing-inset` is the top. They were one number until they were two, and the
one number was `--front-screen-rhyme`: that clamp is the Front Screen's own
vertical rhyme, and it was cut from 9vh to 2.7vh to pay for `--type-zoom` — the
right trade for a Section composed to exactly one screen with a photograph strip
for a remainder. **The Panel has no such budget and paid the bill anyway.**
What the cut bought down here was type standing on the page's own edge, a word in
the very corner of the screen, and a Rail whose three rotated names were wider
than the margin they are centred in: a 44.6px list in a 35.4px column at
2560x1311, so all three ran off the left of the page and nothing said so. So the
landing has its own two now, and the rhyme is about the Front Screen again.

**The width branch spends the page across on the drawing AND the stone.** The
Panel's Plinth overhangs the Frame's right foot and the Frame is flush with the
composition's right edge, so the widest thing in that Section is the composition
plus that overhang — which is why `--landing-side` appears once in the branch and
the answer is divided by one plus `--landing-plinth-share`. Solve
`side + W + stone × W = 100vw` for `W` and that is the line. What it buys is the
marble's right end landing **on** the page's right edge, and it is the reason a
Kernel file knows a Section's overhang exists at all: the Kernel may not ask the
Panel, so the share is restated here beside the masthead's.

**And the height branch spends the page's top margin once, not twice.** The
Panel's composition now runs from `--landing-inset` to the page's bottom **edge**
— the Plinth stands on it — so the height it has to fit into is the screen less
one margin. Subtracting the second is what used to leave the stone short of the
corner at ordinary window sizes, because the branch that bound was solving for a
bottom margin that no longer exists. `src/sections/projects-panel/NOTES.md` has
the other half, which is the Panel's own.

**Both margins are in `vh`, and the left one being in `vh` is not a slip.** The
height branch binds at nearly every window in the band, so the composition —
every column, every gutter, the word's own size — is a function of the screen's
HEIGHT. A left margin in `vw` would grow on a wide short window while the drawing
beside it shrank.

**AIR AT THE TOP IS PAID FOR IN WIDTH, AND THE WHOLE COMPOSITION COMES DOWN WITH
IT.** This is the thing to have ready before promising anybody that one part of
the Panel will move and the rest will stay, because the answer is that it cannot.
The composition is self-similar — `--landing-fit` is its one height for its width
— and on the height branch it fills the screen exactly: `--landing-inset` at the
top, the Plinth on the page's bottom edge, and `--projects-panel-fall` solved so
those two meet. So a top margin `d` deeper is a composition `d / --landing-fit`
narrower, which is about `1.7 d`, and everything in it comes down by `d` and in by
its share of that. Measured at 2560x1311: 22px of extra air at the top took 37px
off the width, moved the word and the subheading's first line down 22, and moved
the hanging second line and the points down 15 — where the drawing they were being
matched to wanted them left alone.

**There is nowhere else for it to come from, and each of the alternatives fails in
its own way.** Growing row one's track and shrinking row two's puts the composition
`d` past the page's foot, because `1fr` here resolves to its content and the fall
is what makes that content reach the edge — and the fall is 4px at this window, so
there is nothing in it to give. Letting the drawing keep its width and hang off the
bottom gives up the Plinth's corner, which is the whole of what the width branch
and the fall are for. And taking `d` out of the air between the two rows —
`--projects-panel-points-air` is right there and is a Token — is reading a
coordinate as a spec: it hits an absolute pixel by spending a length nobody asked
to change. The honest move is to pick the top margin, let the rest follow, and say
which targets it could not reach.

**The page across is `--page-across`, which `ground.css` owns, and not `100vw`.**
`vw` counts a classic scrollbar's gutter and the boxes the page is laid out in do
not — half a gutter at each end for anything centred, which nothing notices, and
the whole ballgame for anything solved to LAND on an edge. It is a registered
`<length>` fed by `100cqw` off the root, declared on the **body**, and every one of
those three words is load-bearing: that file says why. A Section that needs to
reach the page's own edge reads it; one that only needs to bleed past it can go on
using `vw`.

**Where the height branch wins, the Kernel cannot finish the job and says so.** The
composition is then capped short and the Panel's stage carries the window and its
stone out to the edge — the reach, in the Panel's landing block, written as this
solve's residue so it is exactly 0 on the other branch. That is the one place the
landing measure and a Section share a responsibility rather than a number, and it
is why the equation above is worth reading before touching either.

**This is the "short list of names shared where two Sections must agree" that
CONTEXT.md allows**, and it should stay short. A third Section wanting to join it
is a decision, not a convenience.

**One cycle to not write.** `--landing-w` must never come to depend on anything
the Cut Title computes. That is why the landing's fit constant substitutes the
masthead's own drop out of the equation rather than referring to the word.

### The third Section does not join it: the Eater Map Section has no Cut Title

Decided by measuring rather than by arguing, #172. **A second Cut Title — cut off
the Projects Panel's foot into an Eater Map masthead's slot, the way PROJECTS is
cut off the Front Screen's — costs about 9% of the Panel's composition at every
window a browser actually has, and the whole of the marble's corner at every
window in the band.** The Eater Map Section takes a plain masthead reading "Eater
Map", the landing measure stays two Sections', and the Panel is bound at one end
only and stays free to be reworked.

**What a second solve would take is `d`, and `d` is a number the Front Screen
already pays.** The device costs the Section carrying the cut word exactly one
thing at its foot: the air above the word's cap plus the part of the cap that
shows — `--front-screen-cut-gap + --front-screen-cut-clip`, which is
`--front-screen-cut-show` (0.62) of the NEXT Section's cap, plus that air. So the
bill for a second landing was not invented: it was measured at the foot of the
first, on the live page, with `window.portfolio.snapping(false)` lifted before the
page was placed anywhere between the two ports. All lengths in px.

| window | `d` | width branch | height branch | binds | `--landing-w` | with `d` | cost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1100x700   |  54.7 |  984.8 | 1116.5 | width  |  984.8 |  984.8 |   0.0 (0.00%) |
| 1536x760   |  64.9 | 1388.4 | 1212.2 | height | 1212.1 | 1103.4 | 108.7 (8.97%) |
| 1920x980   |  83.7 | 1733.7 | 1563.0 | height | 1563.0 | 1422.9 | 140.2 (8.97%) |
| 2560x1311  | 112.3 | 2311.3 | 2091.7 | height | 2091.7 | 1903.5 | 188.1 (8.99%) |

**The cost is `d / --landing-fit`, which is the coefficient this file already
carried, confirmed against the live page to a tenth of a pixel.** And it is free
only where the width branch bound by more than that: 131.6px of slack at the
band's short corner against the 91.7 `d` asks for there, which is why that row
costs nothing. At the three windows a browser actually has, the height branch is
already binding by 170 to 220px, so there is no slack at all and the whole of `d`
comes out of the drawing. **The 9% is not a coincidence of these four windows
either** — `d` is 0.62 of a cap that is itself `0.7 x --landing-mast-share` of the
composition, so `d` is about `0.038 W` plus a rhyme, and `d / --landing-fit` is
about 6.4% of `W` plus that rhyme's share, everywhere in the band.

**What moves, at 1920x980, the ordinary window:**

| | before | after |
| --- | --- | --- |
| Frame | 1167.5 | 1062.8 (−104.7) |
| Plinth | 1388.6 | 1264.1 (−124.5) |
| masthead size / its cap | 138.3 / 96.8 | 125.9 / 88.1 |
| `--projects-panel-reach` | 182.7 | 332.8 (+150.1) |
| the points | 559.0 | 675.3 (+116.3) |
| the copy | 1067.2 | 1138.0 (+70.8) |
| the Rail's column | 63.7 | 63.7 |

The two type blocks GROW because they grow by the reach, and the gutter the points
stand behind tracks its own Token exactly through the change — 19.23 to 17.50
against a Token of 19.23 to 17.50 — so the window does not walk into the list and
that assertion of `projects-panel` holds. The Rail's column is
`--landing-side`, which is the page's own margin in `vh` and is not a function of
the composition, so it does not move at all.

**The first landing pays for the second, and that is the part that is easy to
miss.** The Cut Title on the Front Screen is fitted to `--landing-cap`, and
`--landing-cap` is a share of `--landing-w` — so shrinking the Panel to make room
for a second cut word shrinks the FIRST one. PROJECTS loses 7 to 9% of its cap
wherever the height branch binds: 96.8px to 88.1 at 1920x980, 129.6 to 117.9 at
2560x1311. A device paid for in the size of the word the device exists to show.

**And one target is lost outright, which is the reason this is a "no" rather than
a price.** The Plinth's foot leaves the page's by the whole of `d` — 54.7, 64.9,
83.7, 112.3px — at every window in the band, INCLUDING the one where the
composition costs nothing. There is no vertical analogue of the reach and there
cannot be one: the reach carries the stage out into page the drawing was too
narrow to fill, and the space at the Panel's foot in this scenario is not empty,
it is exactly where the cut word has to be. `projects-panel`'s corner assertion
fails by that much, down, and that Check exists because every way the corner
breaks is quiet.

**What would have to change for this to be worth revisiting.** One thing, really,
and the other two only change the size of the bill:

1. **The Panel stops being solved to fill the screen's height.** The cost is
   `d / --landing-fit` only because the composition is self-similar and pinned
   from `--landing-inset` to the page's own foot; and the corner is lost only
   because the Plinth stands on that foot. A reworked Panel that does neither pays
   `d` out of somewhere that is not its width and gives up no corner, and none of
   the arithmetic above applies to it. This is the one that could actually flip
   the answer.
2. **The height branch stops binding at the author's windows.** `d` is free only
   where the width branch wins by more than `d / --landing-fit`. It does that in
   the corner of the band and nowhere near the rest of it, and closing a 170px gap
   would need `--landing-fit` to fall a long way — a much flatter composition than
   this one.
3. **The third Section's masthead is much smaller than the Panel's.** `d` is 0.62
   of the NEXT Section's cap, and this assumed the Eater Map Section would share
   `--landing-mast-share`. A masthead a third the size asks about a third of the
   cap back — still 50-odd px against no slack at 1920x980, so it makes the bill
   smaller and does not make it zero, and it does not touch the corner at all.

**Re-measure before acting on these numbers rather than trusting them.** Every one
is a share of a width the Panel's own rework is expected to move, and they are the
composition as it stood when #172 was answered.

## Out of the band the crossing is still one crossing, over the first Section

There is no fold out here, so the temptation is to give the two Sections
different treatments and the answer is that they must not have any. **The whole
page starts on paper and arrives at dark on one number, at one rate, and the
Projects Panel is on that number with everything else.** A Section that pins
itself past the page, or a near end written against `--ground` rather than
against the theme's paper, puts a step across the page at that Section's top edge
that travels up with the scroll — which is what the banding readers reported was,
both times. `src/sections/projects-panel/NOTES.md` has the arithmetic; the short
version is that `--ground` is itself a crossing on `--turn`, so mixing into it
composes two.

**What is different out here is the LENGTH of it, and `turn.ts` states it rather
than inheriting it.** In the band the document IS the turn — two ports, one
notch, nothing in between — so the crossing is the document's whole scroll. Out
here the document is as tall as its content, and spread over that the page is
still a quarter short of black by the time the Panel owns the screen: a grey
Section, at rest, on a page that has finished turning everywhere except in its
own colours. So the span is the FIRST SECTION's own height — the same fold the
band snaps across, going past — and the page is dark at exactly the moment the
Panel's top edge reaches the top of the window. Measured rather than assumed: out
here the first Section is as tall as its content and only floored at `--fold`, so
a phone crosses over more than a screen.

**And the word is cut by that fold at every window — by the FOLD, and not by a
box.** The reader meets PROJECTS part-cut on the first screen whether or not the
page snaps, and that is the first screen's last gesture; a whole word up there
takes it away. But the word is also this Section's own head, and out here the
Panel's masthead is hidden, so it is the only title that Section has: it has to
be a WHOLE word by the time the reader is standing in front of it. Both, at once.

**What buys both is an overhang, and the arithmetic is worth carrying.** Out of
the band `.front-screen__cut > a` is given the cap slab's full height and handed
the difference straight back as a negative bottom margin, so its contribution to
the flow is exactly `--front-screen-cut-show` of the slab — the same as the
clipped box's, to the pixel. Nothing below it moves: the Front Screen's height,
the document's scroll, the Panel's top edge and this crossing's whole span are
the numbers they already were. The letters simply hang past the Section's foot
instead of being cut off at it, and they paint over the Section below by the
ordinary order, needing no z-index of their own.

Then the FOLD does the cutting, because the Front Screen is floored at `--fold`
and that box is flush with its bottom edge: where the floor binds, the box's foot
lands on the fold and the rest of the cap hangs below it; where the content is
taller, the word is under the fold altogether and the reader meets none of it.

**Growing the box instead is the mistake, and it has shipped.** The column is
`flex: 1 1 auto` inside a Section floored at the fold, so a taller box is
absorbed by the column and its foot stays exactly where it was — which puts the
WHOLE word above the fold on any window short enough for the floor to bind. The
`crossing` Check asserts both halves: at most nine tenths of the cap on the first
screen, and a box the full height of the slab.

**And it is still the only PROJECTS, which is also the base rule and not a
regime.** `.projects-panel__masthead` is `visibility: hidden` unconditionally, so
the cut word the reader scrolls past is the Panel's title out here exactly as it
is in the band — the difference is only that in the band it is standing in that
masthead's own slot, and out here it is simply the last thing on the screen above
the index. The hiding used to be gated on the band, because out here a drawn
line was hiding the masthead by another route; when that device was deleted the
gate stayed and the page said the word twice, in two faces, a few lines apart.
That is the shape of this mistake to watch for: a rule left gated on the regime
of the thing that used to do its job elsewhere. The `crossing` Check asserts it
now.

**A continuous crossing has one unreadable moment in it, and that is arithmetic
rather than a bug.** The ground runs light to dark while the ink runs dark to
light on the same number, so the two must have the same luminance somewhere in
the middle. Spanning the crossing over one screen is what keeps that to a moment.
Anything that removes it — a hard flip, an eased `--turn`, a drawn edge — is a
change to the design and belongs to the author.

## The page turn, and who owns a notch

Inside the band the document is **two ports and nothing between** — a zero-height
box at the top and every Section after the first — so a mandatory snap means the
scroller must come to rest on one of them.

`page-turn.ts` is why the turn is a script and not the browser's own snap fling:
that fling owns the scroller for as long as it flies, and a notch the other way
taken while it is in the air is filtered out, so the turn back cannot be taken
until it has landed. Here one notch picks the port its direction is heading for
and eases the window onto it, and a notch the other way retargets the ease
mid-flight. Three things in that file are easy to get wrong and are written out in
it: the ports are read off `scroll-snap-align` and never off `scroll-snap-type`,
which the ease itself switches off; the snapping has to come off for the length of
the ease, or every intermediate frame is pulled back onto the port it left; and
the curve carries the speed AND the acceleration already on the page, which is
what makes a reversal continuous.

**A Check or the Editor that wants the page placed between two ports has to ask
for the snapping to be lifted** — `window.portfolio.snapping(false)`, and `true`
to put it back. Without it a scroll sweep reads a document that jumps rather than
one that crosses, and the `front-screen` Check's crossing sweep found the Turn at
0 in forty of its forty-one samples.

`wheel.ts` settles which of two claimants a gesture belongs to, because there are
two: the Front Screen's photograph strip and the page turn. A gesture belongs to
whatever it began on and keeps it until the wheel stops. It listens in the capture
phase and it is deliberately **not passive** even though it never prevents
anything — a passive wheel listener lets Chromium scroll on the compositor and
deliver the event afterwards, so the target is hit-tested against a page that has
already moved, and the strip took the first notch of every page scroll begun near
it.

## The page's own type size

`faces.css` sets the root `font-size` — a zoom the author owns times a ceiling,
and inside the Front Screen's one-screen band a give-way under that ceiling — and
the give-way is the one thing in the Kernel whose reason lives in a Section.

Composing a Section to exactly one screen turns "does it fit" from a yes-or-no
question into one with a SIZE for an answer: everything in a Section's ladder is
in rem, so one number moves all of it at once, and whatever the composition cannot
spend goes to whichever box is the remainder. The Front Screen's photograph strip
is that box, and without this it collapses on a short screen — 27px of photograph
at 1440x700 against 194px at 1440x900. A photograph that small is not a photograph
of anything, which is the author's judgement and is recorded on the live page as a
15rem floor under the strip. A floor on a remainder is a budget that can overflow,
so the floor is paid for by the type giving way instead.

**It is here because `:root` is here, and for no other reason.** A Section may not
write a global rule and the root's font-size is the most global rule there is, so
this is the decision this file's opening paragraph says adding one has to be.

**`--type-scale` is measured, not derived.** The live sheet solves its own budget
symbolically, which it can do because it holds `--cv-static` — one measured
constant standing for "everything on the page that is not the strip", with a
comment asking whoever changes the ladder to re-measure it. This tree deliberately
has no such constant, because layout does that arithmetic here, so there is
nothing here to solve for. This number came from measuring the composition at the
band's corners, and what keeps it honest is `carousel` asserting the strip clears
the Section's own floor Token at both ends of the band. It lands within about 1% of
the live page's own `0.782019 / 48.32`, which is a sanity signal rather than where
it came from — the two compositions differ in what the cut word is fitted to. The
1% is deliberate slack: a value landing exactly on the floor leaves the Check a
pixel of margin, and slack is free here, because asking for a smaller rem than the
budget allows only makes the remainder larger. Only a rem that is too BIG costs
anything.

**It is measured at one width.** The cut word is fitted to the gutter here, so
the budget carries a width term and a 2560x700 window asks for a smaller rem
than this. That costs a smaller photograph and never an overflowing page — the
strip is the remainder, so it absorbs the difference — and it is the same extreme
the live sheet names and composes for rather than optimises for.

**One thing it is NOT, and it is worth stating rather than discovering.** Its media
query is a second copy of the band in
`src/sections/front-screen/FrontScreen.astro`; the two are one idea and the same
Check is what catches them drifting apart.

### The zoom, and why the ceiling had to become a Token to get one

`--type-scale` used to live in `faces.css` beside the rule that spends it, with a
paragraph here saying it was a number the author would plausibly want to drag
while it could not be a **Token**, because CONTEXT.md makes a Token a *Section's*
named number. #146 settled that by giving the Kernel `tokens/`, where a file's
numbers answer to `kernel-<stem>`, so the three numbers are now
`tokens/faces.css` and the Editor reaches all three.

**A give-way is not a size, which is why moving it was not enough.** Everything
here only ever made type SMALLER — the ceiling is the reader's own default and the
share of the viewport gives way under it — so an author who wanted the drawing
bigger had nothing to drag. Not per element either: the Front Screen's column is
`width: 100%` inside `max-width: var(--front-screen-measure)`, so a width dragged
onto it is clamped by the measure and a height is a flex fill of a Section pinned
to the fold. Both silently do nothing, which is exactly the report that produced
this.

`--type-zoom` is the size, and it is one number because every ladder on the page
is in rem: both measures, every gap down them, every glyph. It multiplies whichever
of the ceiling and the give-way the screen chose, rather than standing among them —
inside the `min()` it would be a third ceiling and could only make type smaller
again. So the proportions hold and only the size changes, and on a short screen the
give-way still gives way by the same fraction of a now-larger number.

**What it costs, so it is not a surprise.** It is the one number on the page
allowed to ask for type larger than the reader's default, which is what "scale the
composition up" means and is the author's call to make. The bill is paid by the
one-screen budget's remainder — the photograph strip — because a larger rem spends
more of the fold on everything above it, and **how much there is to spend is the
screen's own height rather than anything about this Token.** Measured at 1.5: a
2560x1311 window takes the Front Screen's column from 432px to 648px and still
leaves a 254px strip, and 1440x900 takes it from 389px to 583px and leaves 18px.
Dragged further than the screen can afford, the column overflows the fold rather
than the strip going negative. So it is a Token to drag while LOOKING at the page,
which is what the Editor is; `carousel` is what refuses a committed value the
band's short corner cannot pay for, rather than letting the strip collapse
quietly.

**And it is dragged from the PAGE and not only from the panel.** The Measure
surface's `scale everything` toggle turns a corner drag into a drag of this number
— pick anything, drag its corner diagonally, and the whole composition scales by
the percentage the report line names. `scripts/editor/NOTES.md` is that gesture and
why a box could never have answered it: an element's width is a width, and
"everything at one percentage" is the root font-size or it is nothing.

**THE ZOOM AND THE GIVE-WAY ARE ONE PAIR, and lifting the first without lowering
the second is what makes a zoom unaffordable.** The zoom multiplies whichever of
the two the screen chose, so raising it raises the give-way's own slope by the
same factor — and the give-way is the term that binds on exactly the screens with
no budget to give. `1.428` at the `0.016` the give-way was measured at fails
`carousel` by 214–278px at every window in the band bar the tallest; it takes a
1920x1080 photograph from 312px to 96px and a 1600x900 one to 31px, which is the
whole failure, not a corner case.

**Paired, it is free, and the pairing is one line of arithmetic: the PRODUCT is
the give-way, and the ZOOM alone is the ceiling.** `1.192 x 0.01342` is `0.016` —
exactly the slope the give-way was measured at — so every window under about
1192px of height gets the size it always got, to the pixel, and the ceiling above
that is `1.192rem` instead of `1rem`. Nothing was taken from a short screen to
pay for a tall one. Re-solve it that way whenever the zoom moves: pick the zoom,
divide `0.016` by it, and the give-way is unchanged by construction.

**What paid for the ceiling is the page's margin** — `--front-screen-rhyme` and
its two restatements went from 9% of the screen at each end to 2.7%, a fifth of a
short screen handed back — and the two are one change. `carousel`'s
slot-against-floor line at 1440x700 is where the room shows: 90px, against the
6px the composition used to ship with.

**What it should NOT have paid for is the landing, and the landing has since
stopped paying.** The rhyme is a one-screen budget's term and the Panel is not on
that budget; the two came down together only because they were spelled the same.
The landing's own two margins are in `tokens/landing.css` now — see the landing
section above — so a rhyme dragged for the photographs' sake no longer moves the
word, the Rail's column or the Panel's composition with it.

**A zoom is a REDISTRIBUTION inside the band, which is the sentence to have ready
when somebody asks why the photographs got smaller.** The strip is the remainder,
so it cannot grow with the rest — it funds the rest. Measured at 2560x1311, ×1.3
takes the column from 432px to 562px and every glyph with it, and takes a
photograph from 288px wide to 250px, because at 100% the strip was already standing
on its own `--front-screen-strip-max` ceiling and the fold had nothing left to give. Making the
photographs BIGGER is therefore not a zoom at all: it is the type giving up some of
the budget, which is a change to the Section's ladder rather than to this number.

## Two things a Check has to know

**Ask a Timeline for a moment, but `hold()` first.** A scrubbed Timeline is
recomputed from the scroll position on the next tick, so a bare `seek()` survives
about one frame and a Check that reads geometry after it is a coin toss. This cost
a wrong diagnosis once already — the readings came back identical at every
progress and looked like a broken Timeline. `window.portfolio.hold()`, seek as
many moments as you like, `release()`.

**One mount point per Section.** The loader registers a Section's Timeline under
the Section's own name, so a second element carrying the same `data-section`
replaces the first one's Timeline in the register — silently, and the symptom
turns up later as a Timeline that will not seek. A Check that wants a mount point
of its own should give it a name of its own; `observeSection` is exposed for
exactly that.

## The Effect Stack covers the document, and leaves with the Turn

**The stack is over the whole page, not over the first screen.** It used to be a
band one screen tall at the top of the document, which is the same thing while the
page is at rest and a seam the moment it moves: the treatment stopped dead at the
fold and the Section below it was untreated. So `.fx` says `bottom: 0`, and what
makes that mean the foot of the DOCUMENT rather than the foot of the first screen
is one line in `ground.css` — `body { position: relative }`, which is where the
reasoning for it is.

**What ends the stack is the veil, not a length.** `--fx-veil` runs 1 to 0 across
the Turn, so the treatment belongs to the paper and goes out with it: full
strength on the Front Screen, nothing at all on the Projects Panel at rest, and no
edge anywhere between. `--fx-veil-from` and `--fx-veil-to` are the two Turn values
it runs between and are the Tokens; the veil itself is derived in
`effect-stack.css`, because it is a function of `--turn` and not a number the
author sets.

**It is a mask and not an `opacity`,** and that is the invariant below rather than
a preference: `opacity` on `.fx` would isolate the stack outright. It rides in the
mask each layer already carries for `--fx-fade`, which is applied before the blend
and is harmless.

**Two lengths that used to be the same and are not any more.** `--fx-band` is one
screen and is now only what the textures are scaled and travelled against — the
film's cover arithmetic and the roll's sweep. The stack's own box is the document.
Nothing shipped reads the difference, because `paper` and `halftone` are the two
layers the Shell lights and both are uniform tiles; the two that would, `vignette`
and `tube`, now frame the document rather than the screen. Fixing that would need
them fixed to the VIEWPORT, and `position: fixed` is a stacking context, so it
cannot be had without breaking the invariant below. Whichever ticket wants a
per-screen vignette is choosing between the two.

## The Effect Stack's one invariant

`.fx` must not declare `z-index`, `isolation`, `mask` or anything else that makes
it a stacking context. An isolated group hands every blending child a transparent
backdrop instead of the page, so the layers stop blending and start painting — and
the symptom is a flat grey wash that reads as "the strengths are too high", which
is a day spent tuning the wrong numbers. `scripts/check-source.mjs` fails the
build on it; `effect-stack.css` carries the measurement.

Nine layers, and the names are CONTEXT.md's. That is one divergence from the
hand-written page's stylesheet, deliberately: it gated the grille, the scan, the
roll and the tube on one token called `crt`, and here each is named separately
because the glossary lists four layers rather than one. Turning all four on is
`data-fx="… grille scan roll tube"`.

The grain tile is drawn once, at boot, and only if `grain` is on the stack at that
moment. Switching the layer on later — which is what the Editor will do — leaves
it with no tile, so whichever ticket builds that surface has to re-draw as well as
re-write the attribute.

Four effects that sheet has are **not** ported: `weave`, `chroma`,
`chroma-pictures` and `ascii`. None is in CONTEXT.md's list, two of them are
theme-specific in a way the attribute cannot express, and `ascii` needs a canvas
redraw loop. They come back with whichever Section wants them, or not at all.

## The corner pictures

Three baked photographs, each at four widths and — where the grade needed a
second answer on black — again per theme. So `corners.ts` picks one file out of a
grid rather than off a list, and picks again when the theme or the display changes
under it. A miss on a dark file is the ordinary untuned state and not an error:
the generator writes no dark ladder while dark's grade matches light's, so there
is one retry against the light rung of the same width.

A picture whose whole ladder is missing is retried on every resize and every
theme flip, because `shown` never advances past 0 and `upgrade()` only compares
against that. Cheap, and the honest alternative — remembering the failure — would
also remember a network blip. Worth knowing before reading a resize storm in a
network panel as a bug.

**`LADDER_BASE` is the one line in `src/` that knows where the ladder is.** The
files are the ones `design/plate/build-plate.py` writes into `portfolio/img/`,
which the build does not produce and `scripts/assemble-dist.mjs` lays into
`dist/portfolio/` beside the document. Nothing else here knows where they live.

Two things the live page does that are **not** here yet, both because they belong
to the Front Screen's composition rather than to the Kernel: the `plate-wait`
hold, which keeps the type off screen for up to 1.5s while the picture it is
printed on arrives, and `--car-fade`, the one-sided dissolve on the car's inner
edge. `--car-fade` is 0 on the live page today, so nothing is missing from what
ships; the mask is not written at all rather than written and inert.

**`--eye-x` is a GAP and not a distance from an edge**, and the eye is the one
corner picture that is not measured off the page at all: it stands beside the
Front Screen's photograph strip, so what has to hold still is the distance from
the last photograph to the wheel. The strip is pinned to a CENTRED column and a
corner offset is pinned to the window, so measured off the edge the two part
company at half a pixel per pixel of width — right on the one display it was
placed on, wrong on every other.

It was lost once for exactly one reason, and the reason is worth keeping: the
strip did not exist here when the Kernel was ported, so #133 parked `--eye-x` at
0 against the page's right edge, wrote this paragraph saying so, and nothing on
the page or in the suite disagreed. The picture is at 0.13 opacity, so it drifted
250px without anybody's eye catching it.

The Kernel may not read a Section (CONTEXT.md), so `corners.css` **restates**
`--front-screen-measure` and `--front-screen-side` to find the column's edge, the
way `tokens/landing.css` restates the Panel's constants — but as the drawing's
own measurement rather than as a Token, because a second draggable copy of a
number that has to agree with a Section's is a disagreement waiting to happen.
The `carousel` Check is what holds it: it measures the gap on the page against
`--eye-x` itself, so either restated number drifting fails the build, and so does
re-anchoring the picture to an edge.

**It uses `--page-across` and never a percentage.** A percentage in
`background-position` is a share of the positioning area LESS the image, not of
the box, so `50% - 13.5rem` would move every time `--eye-w` did — and `--eye-w`
is a share of the fold, so it would have moved with the window's HEIGHT.

The Check's strength, shown rather than asserted — three mutations run against
`pnpm check -- --only carousel`:

| mutation                                             | wanted | got                                       |
| ---------------------------------------------------- | ------ | ----------------------------------------- |
| the picture re-anchored to `right var(--eye-x)`      | fail   | fail, on the unit: `calc(100% - 292.94px)` |
| `--eye-measure` drifted from 27rem to 30rem          | fail   | fail: a 271.36px gap against a 292.94px Token |
| `--eye-x` dragged to -150px, through zero            | pass   | pass, and the note reads `-150px`         |

The phone is where this placement runs out, and it did on the live page too: the
column's edge is floored at the page's own margin, so below about 475px the gap
carries the picture clean off the right of the page and the eye is simply not
part of the composition there. That is the shipped behaviour restored and not a
new hole — at 0.13 opacity what the page-edge anchor showed on a phone was a
sliver of cable behind the type.

## The build fingerprints anything it can see

The fonts and the two Effect Stack textures are referenced from CSS `url()`, so
Vite emits them into `/_astro/` under a content hash and rewrites the references.
That is why there is no `?v=` digest here where the hand-written page's
stylesheet carried one by hand — the hash does that job by construction, and
`vercel.json` caches `/_astro/` immutably.

Those bytes used to ship twice, about 1.1 MB, while both trees were deployed.
#141 deleted the other one.

The corner pictures are **not** fingerprinted, because their URLs are built in
script rather than written in CSS and the bundler cannot see them. They keep the
`?v=` digest and the day-long cache, which is why `LADDER_VERSION` has to be
bumped in the same commit as a re-bake.
