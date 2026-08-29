# The Projects Panel

The dark Section presenting one project at a time. This folder holds the Rail,
the masthead and its two authored lines, the copy and the engineering points, the
**Frame** — the browser window with the glass titlebar the recording stands
inside — and the **Plinth** the Frame stands on, with the Frame's live reflection
lying in it.

It is a **port**. Every share, every colour and every word here is
`portfolio/styles.css`'s and `portfolio/index.html`'s, carried over unchanged.
The Panel's text, its sizes, its positioning and its motion are all due a rework,
and that rework is deliberately a later session — once the Editor exists, so the
alternatives can be judged by eye instead of described. Rebuilding it twice is
what that ordering avoids, and it is why `variants.css` is empty.

## What it is called

The folder is `projects-panel`, so the root class is `.projects-panel`, the
Tokens are `--projects-panel-…` and the loader's handle is
`data-section="projects-panel"` — `check-source.mjs` enforces all three off the
folder name. The live sheet calls it `.panel` and `--panel-…`; CONTEXT.md calls
it the **Projects Panel**, and where the two disagree the glossary wins. The
fragment stays `#projects`, because that is a URL other people may already hold.

## One length, and everything is a share of it

`--projects-panel-w` is the composition's own width — not the window's. Every
length in the Section is a fraction of it, so the Panel is one drawing at one set
of proportions and the only thing that changes between windows is how big it is.
That is what makes "the composition fits the screen" a solvable sentence: a
self-similar drawing has one height-to-width ratio, so you can solve for the
width whose height lands exactly on the screen.

Two things can bind it, and the smaller wins:

| branch     | what it is                                                                 |
| ---------- | -------------------------------------------------------------------------- |
| the width  | what the page has across, less the Rail and its gap. `--projects-panel-across` is 1 − 0.0403, and 0.0403 is the Rail's own width plus the gap as a share of the composition — added up once, because a grid track cannot be sized from its own siblings. It rounds towards asking for LESS, which is safe twice over: the Rail's floor makes it relatively wider on a small window, and `100vw` counts a scrollbar the layout does not get. Over-asking cannot overflow either way, because the track is `minmax(0, …)`. |
| the height | the screen less the page's two margins, divided by `--projects-panel-fit` — the composition's height as a share of its width. |

### Where 0.6042 comes from, and when to re-derive it

The height ratio measures 0.6024:

```
  0.86  × 0.0885      the masthead's line, which is row one's top
+ 1.66  × 0.0466      one subheading line (the rest of row one), plus the 0.66
                      the Frame is dropped by
+ 0.746923 / 1.945    the Frame: nine columns of twelve less a quarter of a
                      gutter, over its aspect ratio
+ 0.0869 × 0.746923   the Plinth the Frame stands on, which hangs below its foot
```

`--projects-panel-fit` is 0.6042, which is that plus a third of a percent of
slack for sub-pixel rounding and for the copy's floor on a small window.

**THE TWO SHARES AT THE TOP ARE WHY THE DRAWING GOT SMALLER WHEN THE TYPE GOT
BIGGER**, and that is the constant answering rather than fighting. The composition
is self-similar and solved to a screen's height, so the masthead and the
subheading are not free: every point the two of them gain comes out of the Frame
and the stone below it. Raising them from 0.0598 and 0.0380 cost the drawing 6.2%
of its width at 2560×1311 — the type went up by a third against the window it
stands beside, which is the change that was asked for, and the window came down
by that 6.2% to pay for it. Anything measured off the running page in pixels is
therefore about six per cent larger than what the same ratios produce once they
are shares; the ratios are the thing to keep.

**One of those four terms is for something this folder does not contain yet** —
the Plinth, which is #140's — and it is counted anyway. The alternative, fitting
the drawing to what is on the page today, would make the Panel bigger now and
smaller again the moment the slab arrives, which is churn in the one number every
other length reads. So the composition is already the size it will be. It was two
of the four before the Frame landed, and the constant did not move.

**Re-derive it** if you move the masthead or the subheading share, the Frame's
columns or its aspect, or either of the Plinth's two depths. Those seven numbers
*are* this one. It was 0.5 before the Plinth arrived.

### Three of the six sizes get a floor, and it is in px

A share of the composition stops being readable somewhere — a 1280×720 laptop
draws the drawing at half the width a 2560 display does — so a floor is wanted.
But a floor is a break in the self-similarity the fit is solved on, and a block
that stops shrinking eventually outgrows the space the drawing left it.

The points and the Rail can afford one because they sit in slack: the points
column runs to two fifths of its row and the Rail is three words against the
whole screen's height. Both of the points' two sizes get their own, and they are
not one number times a ratio — a floor is about what is still readable, and the
title being 2.17× the figure at the size the drawing wants it does not mean it
has to be 2.17× the smallest the figure may be. Neither of the two binds inside
the landing band, where the composition never gets below about 930px wide; they
are there for the short windows outside it. **The copy cannot**, and it is the one that would most
like to: its height goes as the *square* of its type against its column — a floor
makes the type bigger and the column no wider — and it is measured against row
one, which is a stated height. Floored at 0.7rem it ran 30px past a row of 71 at
an 800px composition. The masthead and the subheading have no floor for the
harder version of the same reason: those two *are* the composition's height.

The floors are in **px and not rem** because inside the live page's one-screen
band the root's font size is solved from the window, so a rem is 11-something px
on exactly the short screens the floors exist for. A floor that shrinks with the
thing it holds up is not a floor. This page has no such band yet; the numbers are
carried as they are so that the Front Screen's port does not have to re-choose
them.

## Row one is a stated height, and the second line hangs out of it

The head is bottom-aligned in row one and carries a negative bottom margin of
exactly one subheading line, so its box ends after the **first** line and the
second hangs below it — into row two, whose top edge is therefore the second
line's top edge, at every window width and whatever set row one's height. That
one trick is what makes the Frame's occlusion exact rather than lucky: the Frame
takes a positive drop from that same edge and lands a fixed fraction of the way
down the letters. Nothing in the arithmetic goes through the head's total height,
the copy's height, or the row's — and the Check asserts the drop against that
edge and against nothing else.

Inside the landing band the second line takes the **fall** as a top margin and
the negative bottom margin grows by the same length, so the margin box the row
still places is where it was — which is what keeps the masthead in the slot the
Cut Title stands in, and nothing may move that. The drop between the line and the
Frame is untouched, because both moved by the same length. See *And its foot is on
the page's bottom edge* under the Plinth.

Row one is `--projects-panel-mast-line` plus one subheading line and **not the
taller of its two occupants**. It used to be `auto` on the live page, and the
copy was allowed to set it: the Career Record's page intro ran to 145 words
against the design render's 55, so on anything narrower than a 2K display the
paragraph was the taller block, row one grew, and the bottom-aligned head sank a
third of the way down the screen. That is not available at all once row one's
height is a term in the fit constant.

There is **no row gap**, and that is load-bearing rather than tidy: the seam
between the two rows *is* the second line's top edge, so a gap would open under
the first line and push the subheading apart. Everything that wants air below the
head asks for it by margin — which is what `--projects-panel-points-air-share`
is, on top of the one hanging line the points have to clear.

## The points spread themselves down the column

The list is `align-self: stretch` in row two and `align-content: space-between`
inside itself, so it takes the whole of the column and shares whatever is left
between the four items. Today that is four titles and four figures with a great
deal of air between them, which is what the drawing asks for; **when each point
grows a paragraph the air is what gets spent**, down to
`--projects-panel-points-gap` and no further. So that Token is a floor rather than
the gap, and there is one rule drawing both states instead of a number somebody
has to keep re-choosing as the words arrive.

`stretch` costs row two nothing, which is the part worth checking rather than
assuming: what an item contributes to a row's size is its max-content height
either way, so this changes what the box does with the height it is given and not
how much it is given. Row two is still the stage's, until the day the points
outgrow it — at which point row two grows, and inside the band the composition is
no longer one screen. That is the one thing to watch as the paragraphs land, and
it is a content decision rather than a bug.

**Its foot is the window's foot and not the page's.** Row two runs to the
composition's foot, and the composition's foot is the page's — the Plinth stands
on it, and there is no margin under a thing standing on the floor — so a list
spread down the whole of that lands its last figure on the bottom edge of the
screen. Worse than that: the slab overhangs the Frame to the LEFT by 0.0585 of the
composition more than this column's own clearance from the window, so the bottom
of the column is over stone. The bottom margin is one Plinth depth, which puts the
last line on the line the window's own foot stands on and leaves the depth below
it to the marble.

One Plinth depth and **not the slab's whole box**, which was tried and reverted.
The box begins `--projects-panel-plinth-back` higher — the strip of stone behind
the window — and clearing that as well costs 30px at the narrow end of the band,
where this list is what sizes row two and every pixel of margin is a pixel the
composition grows by. It also buys nothing: the plate is a rendered block in
perspective, so the stone at its left end is drawn well below the top of the box
that holds it, and the line above the window's foot is over the picture's own
empty corner. Checked at 1280×900 and 2560×1311 by looking, which is the only way
that question can be answered — it is a fact about the plate, not about the boxes.

### The one window this does not come out exact at

Swept over 120 window shapes in the band — twelve widths from 1100 to 3440, ten
heights from 700 to 1440 — the marble lands in the page's bottom-right corner to
within half a pixel, the copy's right edge is the window's to within nothing at
all, and the composition is exactly one screen. **Three shapes are not: 1100 wide
at 1200, 1311 and 1440 tall, where the composition comes out 16px too tall and the
marble stops that far above the screen's foot.**

It is this list that does it, and the cause is worth stating because it is the one
that will come back. At 1100 the composition is at its narrowest — the width
branch binds — so the points' column is 224px, three of the four titles wrap, and
the list's content plus its two margins finally exceeds what the stage asks of row
two. Row two is the larger of the two, so the composition grows.

It was left rather than tuned away, and the two obvious tunings are why. Shrinking
the title until the longest one fits 224px on one line means a share of 0.0148
against 0.0186 — a fifth off the type at *every* window, to square one. Shrinking
the minimum gap by 5px each does it too, and makes the state this list is actually
being built for — four paragraphs rather than four figures — tighter everywhere,
for the same one window. Both are the author's Tokens and both are one drag away
if that window ever matters.

## The masthead, the Cut Title, and why this is a relationship

The word **PROJECTS** is drawn twice and appears once, **at every window**: the
Cut Title — the word cut as a picture at the Front Screen's foot — is this
Section's head, and this masthead goes `visibility: hidden` underneath it. In the
one-screen band the Cut Title literally stands in this masthead's slot; the word
does not fly down to the Section, **the Section comes up to the word.** Out of the
band there is no slot to stand in, and the relationship is the reader's rather
than the layout's: they scroll past a cut PROJECTS and arrive at the index it is
the title of, with nothing between the two.

**The hiding is unconditional and the box is not**, which is the one distinction
worth carrying out of this section. `visibility: hidden` is in the base block, so
there is no regime it does not cover. What is per-regime is whether the BOX stays:
in the band it is load-bearing three times over — row one's stated height, the
line the subheading hangs off, the slot the word occupies — and out of the band it
is holding a slot for nothing and is taken out of flow. Neither is ever
`display: none`: this Section's `aria-labelledby` names this element, and a
directly-referenced hidden element still supplies an accessible name where a
display:none one supplies nothing.

**That gate has been wrong once, and it is the failure to know about.** The hiding
used to live inside the band's own media query, because out of the band a
different device — a drawn line climbing the page, with the word printed twice and
masked at it — was hiding the masthead by another route. `fcba8d6` deleted that
device, correctly and for three reasons of its own, and the band gate stayed
behind: the masthead came back at every window below 1100x700 and every window
shorter than 700, and the page said PROJECTS twice in two faces a few lines apart.
The `crossing` Check asserts the masthead is hidden out here now, in the same
words `turn` asserts it in the band, so the two halves of one rule have a Check
each.

Two measured quantities are what make that true at every window size rather than
at the one it was tuned on, and both are declared in the component:

| property                        | what it is                                                                |
| ------------------------------- | ------------------------------------------------------------------------- |
| `--projects-panel-masthead-cap` | the masthead's cap height — 0.700 em of Host Grotesk. The Cut Title is cut to exactly this, which is what holds the render's own masthead-cap-to-subheading-cap proportion of 1.59 at every size. Before it was expressed this way the two agreed to within 2% at 1440×1000 and the word ran 29% larger than the masthead at 1920×1080. |
| `--projects-panel-mast-top`     | where that cap top sits inside its own line box: Host Grotesk spans 1.330 em ascent-to-descent, against a line-height of 0.86, so the half-leading is (0.86 − 1.330)/2 = −0.235, the baseline lands at −0.235 + 1.015 = 0.780, and the cap top is 0.700 above that — 0.080 em of the masthead's size. |

Neither is a Token, because neither is a choice: they are metrics of the face,
and an Editor slider on one would be a slider that makes the composition wrong.

`--projects-panel-mast-top` is in use here rather than parked: the Section's
`scroll-margin-top` is the page's own inset **less** the mast top, so following
the Rail's link comes to rest with the masthead's cap on the line the page's
margin names — not with the Section's box edge on it. That is the same
relationship the live page's landing writes, one term shorter because the term it
drops belongs to the Front Screen's name.

**The Kernel is how the length crosses.** The Cut Title is the Front Screen's, and
a Section may read the Kernel and nothing else, so the two Sections cannot read
each other's Tokens. `src/kernel/landing.css` solves the composition's width for
the landing and publishes `--landing-cap` and `--landing-mast-top` from it; this
Section takes its own width from `--landing-w` inside the band, so the two above
follow from the Kernel's answer through the shares in `tokens.css` and agree with
it by construction. The `turn` Check asserts that they do — the Kernel restates
four of the Panel's terms to solve the width, and a restated number that drifts
draws the word at a size nobody can see is wrong, because the masthead it stands
in for is invisible.

## The copy arrives with the page turn

Inside the band this Section's box begins above the fold — by the cut the word is
shown at plus `--landing-mast-top`, 39px at 1440x900 — and that is the device
rather than an overshoot: the strip is exactly where the Cut Title stands. What
that costs is that **anything drawn in row one is drawn on the screen above.** The
masthead there is invisible and the subheading hangs below it, so the paragraph
beside them was the one thing left, and it showed as two lines of small type in
the white beside the word, answering a question the reader had not been asked yet.

**Which column it starts in is the band's decision and not the base rule's.**
Inside the band the copy is columns six to twelve: the head's row is the
subheading and nothing else, so the sixth column is free and the paragraph starts
one gutter to the right of where the word ends rather than a whole column further
over. The base rule leaves it at the seventh.

**The reason the base rule gives has expired, and the rule has not.** It used to
be that outside the band the masthead was on the page and a paragraph starting at
the sixth would be printed over its last two letters. The masthead is hidden at
every window now, so nothing is there to collide with and the seventh column is a
composition's choice rather than a collision's — a choice, therefore, that is the
author's to keep or spend, not an agent's to quietly reclaim.

**And its rule stands one gutter INTO that column rather than on its line.** The
sixth is shared — the head is placed across one to six and the paragraph across
six to twelve — so a hairline set on the column's own line is a mark drawn inside
the box the subheading is set in with none of the composition's clearance between
the two. The gutter is that clearance and is what every other pair of neighbours
in this grid gets, the list and the Frame included. A whole column would be about
three and a half times too much: it would carry the rule clear of the subheading's
box altogether and leave the paragraph a measure the Frame's right edge cannot
pay for, because that edge is where this box ends. It is a `margin-left` and not a
padding, so the rule moves with it — the padding this box already carries is the
white between the rule and the words, which is a different length doing a
different job.

So it arrives instead. Three Tokens say when — `--projects-panel-copy-arrive-from`
and `-to` are the two points of the crossing it runs between, and
`--projects-panel-copy-rule-lead` is the share of that arrival the hairline in its
margin has to itself, so the page is ruled before it is written. They are
fractions of the crossing and not times, because what drives the arrival is
`--turn`.

**The lead is honestly a detail rather than a gesture, and that is the palette's
number and not this rule's to change.** `--projects-panel-rule-far` is a sixth of
an alpha, so the hairline finishes arriving over a ground that is still mid-grey
and only becomes legible as the page reaches black — on a filmstrip at 1440x900 it
is visible from about 0.85 of the crossing, which is after it has finished being
ruled. It is kept because it is one Token and four lines, because it is the right
relationship if the rule is ever brightened, and because the alternative is the two
arriving together for no reason. What the reader actually watches is the paragraph:
at the numbers above it inks in over roughly the last quarter of the crossing —
230ms of the turn's 800, landing 170ms before the page comes to rest — and
`-arrive-from` is the dial for that.

**Drawn against the Turn, which is what makes it a function and not an
animation.** `--turn` is the Kernel's number for this exact crossing and already
what every colour on the page is mixed out of, so the arrival is a function of the
scroll position: it inherits the page turn's quintic ease for nothing, it is exact
at both resting places and at a deep link, and a reader who asked for less motion
gets it as a state rather than as a movement, because their turn is a jump rather
than a travel. It is also still seekable through the seam ADR 0003 asks for —
`timelines.get('turn').seek(…)` moves it, which is what the Check reads and what
the Editor scrubs. **It does not give this Section a Timeline**; how the rest of
the composition arrives is still the later ticket `timeline.ts` describes.

**It is the ink that arrives and not the box, and that is measured rather than
preferred.** The obvious two ways to write it both cost the page something at the
far end:

| written as | what it costs at the landing |
| ---------- | ---------------------------- |
| `opacity` ramping to 1 | nothing, as long as it lands exactly on 1 — which is why the Check permits it |
| `mask-image` sweeping down the block | the paragraph stays on its own compositing layer forever, and composited text is rasterised without subpixel antialiasing: **up to 136 levels on a channel** against the same type painted directly, over 17% of the block |
| a `transform` that settles | the same layer, plus the one thing this device may not do |

The mask was the first version and the wipe was the nicer picture — one front
travelling down the block in reading order, with the border-left carried along by
it. It was measured against the unmasked paragraph at the landing and dropped for
that number. Mixing the two colours towards `transparent` instead composites
nothing: the arrived paragraph is byte-identical to the paragraph with the rule
deleted, which was checked the same way and came back at 0 across 660x105 px at
1440x900 — against a control of two screenshots with nothing changed between them,
which is also 0. The 136 was measured over 620x80.

**And nothing travels, for the same reason the word does not.** This Section is
the far end of a page turn whose whole claim is that the type stands still and the
document moves. A paragraph that slid into place would be arguing with the thing
it arrived on.

**A browser that runs nothing gets the paragraph.** Nothing would ever drive
`--turn` for it, so an arrival left at its start would be a paragraph deleted
rather than one waiting. The component answers `@media (scripting: none)`, and it
has to be the query rather than a flag a script sets: a flag is set by a deferred
module, a frame or two after the first paint, so every reader would watch the
paragraph appear and then be taken away. This is the same reader the Plinth is
drawn at full depth for, and `projects-panel` asserts both in its scripting-off
pass.

### What the Check holds, and what it was shown to catch

The `turn` Check, because the arrival belongs to the landing rather than to the
composition. It reads how much the paragraph actually PAINTS — the alpha of its
ink times its own opacity, rasterised into a 1x1 rather than compared as a string
— and asserts four things: nothing is painted at the top of the document; at the
landing both the ink and the hairline are the palette's own two colours and not a
fraction of them; the box is the same at every moment of the crossing, which is
the assertion the word already carries; and nothing is left standing between the
type and the page once it has arrived.

**Six mutations, each applied on its own, rebuilt, and reverted.** Four fail and
two pass, and which is which is the point:

| broken | caught by |
| ------ | --------- |
| the ink's mix replaced by the palette's own colour | 1.00 painted at the top of the document |
| the `@media (scripting: none)` block deleted | 0.00 painted with no script, in `projects-panel` |
| a `filter: blur()` that resolves to `blur(0px)` | 1.00 at the top, AND `blur(0px)` left at the landing |
| a `transform` that settles to the identity | the box moving at 0.4 of the crossing, AND `matrix(1, 0, 0, 1, 0, 0)` at the landing |
| the arrival written as `opacity` instead | **nothing — and correctly.** An opacity that lands on exactly 1 costs the resting page nothing, so a Check that failed it would be mandating a mechanism rather than asserting an invariant |
| all three Tokens moved (0.08, 0.61, 0.8) | **nothing.** They are the author's, and the Editor's |

`blur(0px)` and `inset(0)` are the two worth knowing about: both read as though
they were nothing and both keep the layer, which is why the assertion compares
against `none` rather than against a length.

## The palette crosses; it does not switch

The five `-far` Tokens are what the Section **is** once the page has turned, and
they are the same in both themes: the theme toggle chooses what the Panel crosses
*from*, and nothing about where it ends up. The read halves are `color-mix`es
weighted by `--turn`, so at the top of the page the Panel is as light as the page
above it and it arrives black. The near end and the far end cannot share a name —
a custom property that reads itself is a cycle and drops to unset — which is why
there are ten declarations rather than five.

**THE NEAR END IS THE THEME'S PAPER AND NEVER `--ground`, AND THAT IS THE WHOLE
OF WHY THE PAGE HAS NO SEAM IN IT.** These used to mix against the Kernel's
`--ground`, `--ink` and `--ink-soft`, which sounds like the same thing and is
not: those three are themselves crossings on this same `--turn`, so mixing into
one composes two of them. At `t` the document's ground is
`paper·(1−t) + dark·t` and this Section's was `paper·(1−t)² + dark·(1−(1−t)²)` —
a quarter of the way apart at the middle of the crossing, and in the same
direction on every frame between the two ends. Both are white at 0 and black at
1, so a still of either resting place looked right and only the crossing was
wrong: a hard step across the page at this Section's top edge, travelling up with
the scroll. **That is the banding that was reported.** Against `--paper`,
`--paper-ink` and `--paper-ink-soft` it is one crossing, `--projects-panel-bg-far`
is `--dark`, and the two grounds are the same colour by construction rather than
by luck.

`--projects-panel-rule-near` is the one value here that is not the live sheet's.
Its near end there is `--rule-soft`, the CV's own hairline, and the Kernel
publishes no hairline colour; it is stated as a share of `--paper-ink-soft` — the
paper end for the same reason as the five above — until the Front Screen's port
brings one.

**What a continuous crossing costs, so nobody rediscovers it as a bug.** The
ground goes light to dark and the ink goes dark to light on one number, so
somewhere in the middle they have the same luminance and the type is briefly
unreadable. That is not a mistake in the mix; two monotone curves running
opposite ways must cross. In the band it is a fifth of a second of an ease
nothing can stop on. Out of the band it is a stretch of scroll, which is why
`src/kernel/turn.ts` spans the crossing over the FIRST SECTION rather than over
the document — a page that turns over one screen has one grey moment in it, and
one that turns over four screens is grey for two of them.

Two divergences from the live page, both deliberate:

- **The crossing is not gated.** The live sheet only crosses inside its
  one-screen band and paints the flat far end below it. That gate is about the
  band, not about the Panel, and the Turn is a Kernel property of the page
  at every width.
- **`data-turn` is not on this Section.** The crossing happens across the scroll
  of the Section *above* this one — that is where the reader is while it happens
  — and the Panel is where it arrives. Out of the band `src/kernel/turn.ts` says
  so in as many words: the Turn's span is the first Section's own height, so the
  page has finished turning at exactly the moment this Section's top edge reaches
  the top of the window. Marking this Section instead would give the Turn a
  zero-length scroll to run in, because the Panel's own height is one screen.

## The Rail

Three project names down the left edge, reading bottom to top, spread over the
full height of the composition. `writing-mode` plus a half turn **on each item
and not on the list**: rotating the list would rotate the order with it and put
Record Engine at the top. Each item then measures as a tall narrow box in an
ordinary column, so `space-between` still means what it says.

**An entry is a route if it holds a link**, and that is the whole of the
machinery — there is no attribute saying which Section an entry names, because
the link's own fragment already does. So the other two projects become two more
entries with an `href` on the day their Sections arrive, and nothing else
changes. `selected` is derived the same way: the entry whose fragment names *this*
Section is the one that is current.

That is also what earns the `<nav>` and `aria-current` — a landmark announcing a
set of links to nowhere would be worse than no landmark, and one of the three
leads somewhere. `aria-current` goes on the `<a>`, where it is announced, rather
than on the `<li>`, where screen readers are not obliged to say anything about
it. The two that lead nowhere carry the visually-hidden qualifier instead: grey
says "not selected" to anything looking, and the qualifier says "no page yet" to
anything listening.

`role="list"` on a list that already is one, because the items carry
`list-style: none` and VoiceOver drops list semantics from a list with no
markers.

### In the band it runs the SCREEN's height, and it arrives with the page

An index in a margin runs the height of the **page**, and inside the landing band
the page is the screen — which the Section's own box is not. The Section begins
`--projects-panel-lift` above the screen's top edge so the word can be cut off the
screen above, and it ends on the screen's bottom edge because the Plinth stands
there. So the Rail subtracts the lift back off its top and drops the bottom inset
the base rule carries, leaving `--projects-panel-side` at each end: the three
names are spread `space-between`, so those two lengths are exactly where the first
and the last of them stand.

`--projects-panel-lift` is `--landing-top` less the masthead's drop, and it was
already written out once as the Section's `scroll-margin-top` — the port the turn
rests on is the same length measured from the other end. Naming it is what stops
the two drifting.

**Across, the Rail's width IS the page's left margin, and that margin has a floor
under it that nothing used to check.** The box is `width: var(--landing-side)` —
the same length the Section is padded by and the word is set on — and the names
are centred across it. So a side margin narrower than one rotated line of
`--projects-panel-rail-size` at its leading is three names running off the left of
the page. That is not hypothetical: while the margin restated
`--front-screen-rhyme` and the rhyme had been cut to 2.7vh, the list was 44.6px
wide in a 35.4px column at 2560×1311 and all three were clipped. One line is about
2.1% of the composition — `0.01397 × 1.5` — and `--landing-side` clears it at
every window in the band with room to spare, which is one of the two floors that
Token is chosen against.

**And that puts the Rail in the strip the copy's arrival exists for.** The top of
the box is on the Front Screen, and the only thing that strip is for is the cut
word; a name standing there is half a name, because the box runs off the top of
the screen mid-letter. So the Rail is drawn against `--turn`, the same device and
for the same reason — the `turn` Check states that rule for the paragraph, in the
failure it raises.

Two differences from the paragraph's, both deliberate. It takes **no window of its
own**: the copy waits until a third of the way across because it answers a
question the reader has not been asked yet, and three words in a margin answer
nothing. And it is written as **`opacity` rather than a mix**: what the mix buys
the paragraph is its subpixel antialiasing, and every name in here is drawn
through a rotation, which has already cost it — so opacity is one declaration for
the two inks, the hover and the focus ring, and it costs the resting page nothing
because `--turn` is exactly 1 where the turn comes to rest. A browser that runs no
script gets the Rail outright, the same escape and the same reader as the
paragraph's.

## The words

All of them are Content, including the two the Rail speaks and never prints.

The copy is the Career Record's `projects/photos.md`, "Page intro" — its first
sentence, the head of its second, and its last. **Cut, and cut rather than
re-written**: every word is the record's own, in the record's own order, with the
tail of the second sentence and the whole of the third lifted out. What went is
what the four engineering points already carry — the 220 ms triage, the resumable
build, the stacking rule and the threshold behind it are each a point with its
figure attached, and saying them twice cost the paragraph three lines it does not
have. The design render's own copy is generated filler and appears nowhere in the
record.

The points are the four the record ranks strongest, in its order, each carrying
the figure that makes it checkable rather than atmospheric. An `<ol>`, because
the order *is* the ranking; the markers are off, because the figures are the
numbers the column is about.

The subheading is **two authored lines, not one string left to wrap**. The second
is the one the Frame will pass in front of, so where it breaks is part of the
composition rather than a consequence of the column's width. `display: block` on
the spans rather than a `<br>`, so the break is not a character a screen reader
has to read around.

`text-transform` and `font-feature-settings: 'case' 1` are listed against five
selectors rather than hoisted onto the Section, and the list is the point: both
properties inherit, so hoisting would be shorter and would also apply `case` to
the body copy, which is lowercase running text. `case` is for punctuation
standing among capitals — the hyphen in SELF-STACKING, the em dash in the
figures. On the paragraph it would quietly raise every hyphen in
"content-addressed" off its own baseline.

## One column, outside the band

Below 1100px the composition becomes a single column as tall as it needs to be:
the Rail turned across the top, then the head, the copy, and the points. The head
is the subheading alone out here — the masthead is hidden at every window and its
box is out of flow at every window outside the band, so the names close up under
the Cut Title one screen above and that word is the title they are an index of.

The gate is a **width** and only a width, which was measured rather than assumed.
Taking the whole one-screen band negated is the tidier sentence and it is wrong:
a short window makes a small drawing at any width, and 2560×650, 1920×650,
1600×620 and 1280×660 all keep the composition. The height branch only pulls the
drawing under the width the failures start at when the window is shorter than
about 500px.

What actually fails below it is measured too, and both failures come from the
same place — the copy has no floor while the points and the Rail do, so the
drawing stops being self-similar and the floored parts outgrow their space. The
copy goes past reading (6.2px at 820×1000), and the Plinth lands on the
engineering points (41px of slab over TRIAGE RULE ENGINE at 900px wide). The
drawing stops eating itself at about 925px; 1100 is 175px above that, and it is
where the paragraph is still worth reading rather than where the hard failure
ends.

`not all and (min-width: 1100px)` rather than a `max-width`, so it is that gate's
exact complement at fractional widths too.

Three things about the stack:

- **The side margin is the page's horizontal one**, not `--projects-panel-inset`.
  The inset is 9vh — a vertical measure, and one that reads as an error the
  moment it is used across: on a 390×844 phone it is 76px a side. Top and bottom
  keep it, where it is measuring what it was written for.
- **The Rail wraps.** RECORD ENGINE at 0.22em of tracking is a long word, and 360
  and 320 are real screens; without `wrap` the third project is simply not named,
  which is not a Rail. The size and the gap are solved together against the three
  names: at the floors they measure 299 and the row comes to 328, one line from
  374px of window up.
- **The points' internal gap becomes a multiple of their own size**, and the
  number it has to beat is the 0.35em already inside each point: anything at or
  under that spaces four points exactly as far apart as the two lines of one, and
  the list reads as eight lines rather than four pairs.

## What is still nobody's

- **The Panel's own motion.** The live page's exit treatments — the text lifting,
  the Frame receding, the Plinth sinking, mixable, five numbers each — are what
  the rework session chooses between, and Variants are the shape that choice now
  has. `timeline.ts` exports nothing, which is how the loader is told there is
  nothing to register.
- ~~**Which stone is drawn is settled in two places now.**~~ **Settled here, and
  only here.** It was declared in this Section's `tokens.css` AND in the
  hand-written page's stylesheet, and `design/legacy/plinth-studio.py` rewrote
  only the second — so a bake-off run changed one of the two sites and said
  nothing. #141 deleted that stylesheet and pointed the studio at this file. The
  `?v=` went with it: the build fingerprints a `url()` it can see.

## The Frame

The browser window at the foot of the composition: a body, a glass titlebar, ten
controls, an address field, and an empty box where #140's recording goes. It was
the largest single piece of bespoke drawing in the repository and the one where
almost every number was protected by a paragraph rather than by anything that
could fail.

### The render's table, and why it is centres and widths

The design render gives up two numbers per control — where its centre is, and how
wide its ink is — both as shares of the Frame's width:

| | centre | width |
| ---------------- | -------- | ------ |
| titlebar         | —        | 3.4583% tall |
| corner           | —        | 1.6333% |
| content inset    | —        | 0.816% — **now 0, see below** |
| lights           | 2.04% (first), 1.52% pitch | 0.95% |
| ~~sidebar toggle~~ | ~~8.00%~~ | ~~1.41%~~ — **dropped** |
| back / forward   | 10.66% / 12.95% | 0.54% |
| address field    | 50.19%   | 39.45% wide, 2.07% tall |
| reload           | ~~69.15%~~ | 0.87%, on a **declared 0.8% clearance** |
| share            | 92.22%   | 1.20% |
| ~~new tab~~      | ~~94.91%~~ | ~~1.03%~~ — **dropped** |
| ~~tabs~~         | ~~97.52%~~ | ~~1.36%~~ — **dropped** |

**Three of the ten are gone, and they were struck through rather than deleted so
the render can still be read against this.** The sidebar toggle because the grid
the recording shows **has no sidebar at all** — the photos site's own docs say so
— and at 1.41% of the Frame it read as a battery rather than a pane. The new-tab
plus and the tab pile because there is nothing a page bound to `127.0.0.1:8770`
could do with either. Share stays: it is the one of the three with a future, a
link to the repository. The reload's centre went with them, for a different
reason — see the clearance below.

**Every one of those is a Token, and every gap in the stylesheet is computed from
the pair either side of it** — the distance between two centres, less the two
half-widths between them. That is the whole of what "expressed as relationships"
means here, and it is not a tidier way of writing the same sheet. The live page
writes the gaps: `margin-left: 1.79cqw` for the sidebar, and so on down the row.
Two things follow from that, and the second is why this was worth doing.

A gap is **two** controls' business, so moving one glyph is a re-derivation of its
neighbour's number as well — nine of them if the lights move, because everything
to the right of a flattened gap is stated relative to it.

And a flattened gap can disagree with the table it came from **without saying so**.
The live page's sidebar gap is derived from a measured "dot 3's right edge" of
5.505%, and the table's own pitch puts that edge at 5.555% — half a per cent
apart, one of the two measurements rounded. The sheet then uses the table's pitch
to space the lights and the other figure to place the sidebar, and nothing
anywhere says which of the two numbers the drawing is honouring.

**And the error does not stop at the sidebar**, which is the second half of what a
flattened gap costs: the two chevrons are stated against the sidebar's right edge,
so they inherit its shift exactly. The live page draws all three at 8.05%, 10.71%
and 13.00% against the table's 8.00, 10.66 and 12.95 — one measurement rounded by
half a per cent, and three glyphs 0.46px out at 1440x900 because each is placed
relative to the last. Here the table's own quantities are what everything reads,
the three land on their measured centres, and the 5.505% figure is simply gone.
**Those three glyphs are the only place this Frame is not pixel-identical to the
live page's**, and it is a correction rather than a drift.

Two more relationships that were coordinates:

- **The window's corner is a percentage of its own box**, `1.6333%` across and the
  same length re-stated against the height. It cannot be a `cqw` — an element is
  not its own container, so a container unit here resolves against the *viewport*,
  which is a curve half again too big on the window's outer corners against the
  one its titlebar draws on the same two. The live page's answer is to re-derive
  the Frame's width from the composition's, and that is *nearly* right: the
  composition's width over-asks by whatever the Rail's 10px floor costs it, so the
  window's corner and its titlebar's came out 0.04px apart. A percentage resolves
  against the element's own border box, so the two are the same length by
  construction and the Check can assert equality rather than a tolerance.
  The second half of the pair is that same length in the other axis' units —
  a lone percentage takes the horizontal radius from the width and the vertical
  from the height, which on a box of this aspect is an ellipse.
- **The content box's corner is the window's corner less the band it is inset by.**
  The live page writes it as the band, because 1.6333 − 0.816 = 0.817 and the band
  is 0.816 — a coincidence to a thousandth, written as though it were an identity.

The address in the field is **Content**, not a Token, and so it is the Editor's to
change (#143 landed while this was being built and binds it). That is the right
side of that line: the field says which origin the recording was served from, and
if the recording is ever re-made against another one the field has to follow it —
which is a word changing, not a length. The render's own field is empty, because it
was captured with no chrome, so there was never anything here to measure.

### How the window is put together

Six decisions that were paragraphs in `portfolio/styles.css` and are one-liners in
the component now.

- ~~**The rim is an inset ring, not a `border`.**~~ **The rim is an ELEMENT.** A
  border was never the alternative — it takes a pixel off the inside of every
  child's box and puts the window's edge *inside* the titlebar. But an inset
  `box-shadow` paints on the element's own background and therefore **under every
  child**, and once the band went to zero the recording covered the ring
  completely: the window had no outer edge at all, and `bar only` and `no ring`
  rendered identically. `.projects-panel__rim` is an absolutely-placed child at
  z-index 2 instead — above the recording, whose z-index is auto, and above the
  strip's 1.
- ~~**The titlebar draws no rim of its own, and that is why its fill is
  translucent.**~~ **The titlebar draws no rim of its own, and the window's runs
  in FRONT of it.** The old reason was that the Frame's ring "shows through at
  this alpha", which was true of 0.135 and is not true of 0.75: a tint that heavy
  is a wall, and a ring behind it outlines the window on three sides with a gap
  along the top. The conclusion is unchanged — one ring, not two on the same pixel
  — and the reason it works is now the z-index rather than the alpha.
- **The Frame is `container-type: inline-size`**, which is what lets every length
  in the chrome be a share of the window rather than of the page — and what makes
  #140's clone answer the question about itself rather than being told what the
  Frame above it measured. `inline-size` and not `size`: the height comes from
  `aspect-ratio`, and size containment would take it away.
- **The stage is `position: relative` with no z-index**, and that is load-bearing
  rather than tidy. The Plinth has to paint under the Frame and the Frame over the
  subheading, and both only work while the stage is not a stacking context — a
  z-index, an opacity, a filter or a transform on it traps the Frame's own z-index
  inside it and the window stops painting over the type it occludes. The Check
  asserts all five.
- **The titlebar stands above the recording** on a z-index rather than on source
  order, because the glass is a lens and a lens is in front of what it bends: the
  canvas is a child of the bar and the recording is a sibling of it.
- **The canvas is clipped to a circle and the shader's corner is not.** That is a
  half-pixel given up deliberately: `border-radius` cannot describe a
  superellipse, so what the clip cuts is the ~3% the exponent 2.2 bulges past a
  circular arc at 45° — 0.48px at a Frame 1200 wide. The context is opaque, so
  without a clip it paints the page's own backdrop over whatever is behind the
  window's top corners. Invisible against today's flat Panel; not invisible the
  moment #140's marble is there, which should extend the backdrop rather than
  reach for this.

And the content box: ~~**inset on three sides and flush at the top**~~ **flush on
all four**. The render is explicit about the band — down the left side the outer
rim is followed by the Frame's own fill before the picture starts, and the right
edge measures the same — and drawing it produced **two** borders rather than one,
because the recording carries about 10px of the grid's own `--page-inset` inside
the file, and the capture is seeded light so that margin is **pure white**. The
band is the one of the two this repository can move, so it is zero
(`--projects-panel-frame-inset`), and the rim is what says where the window ends.

The top edge moved for a different reason: the recording now runs **under** the
strip. A displacement map over the flat fill the box used to start below returns
the same flat fill — the Lens had nothing to bend. So `border-radius: inherit`
rather than the old `corner − inset` subtraction: the box is coincident with the
window, its corner is the window's, and the window's is the two-value form that
keeps the curve from being an ellipse on a box of this aspect. Restating it here
in one value draws a circle. **And `corner-shape: inherit` beside it**, or the
crop cuts the recording on an arc under a titlebar drawn as a squircle — the
Lens's bullets below say what that looked like.

**The white margin is still there, and it is `record`'s to remove.** Trimming the
encoded frame leaves the app's layout untouched, so the camera sees strictly
*less* than the censored list was signed against — the same argument this file
already makes for cropping the recording from the top edge only. Zeroing
`--page-inset` at the capture instead reflows the justified rows and drifts that
list, which is a photograph review to redo.

The chrome is **inert, and it is said twice**: `pointer-events: none` on the row,
and not one element in it is a button, a link or anything with a `tabindex`. The
Frame is not a link because the photos site binds to loopback and there is nowhere
to send anyone — and making any of it live later is a change of element and of
nothing else, because every length is measured from a glyph's centre and no rule
depends on what kind of element carries it.

### The Lens, and its two rungs

`lens.ts` is the material, `CONTEXT.md` is where the word is defined, and
**`design/frame-glass/` is where every number in it was chosen by looking** — a
studio that plays the real clip in a real Frame with each decision on its own
axis. It is deleted by the ticket that reads this paragraph and finds it stale.

It is a port of `chrisJuresh/photos` `ui/src/lib/glass.js`, which is itself
**iyinchao/liquid-glass-studio reduced to what a backdrop filter can carry**. The
optics are upstream's term for term, under upstream's own names, because its
shader is where the meaning of each setting lives and a rename would make the two
unreadable against each other. What is *not* upstream's is where the numbers come
from: every one is a Token on the Frame, read back in `lens.ts`, so the material
is the Editor's to move.

| part | mechanism |
| --- | --- |
| refraction | an SVG `feDisplacementMap` inside `backdrop-filter` |
| dispersion | that pass three times at three scales, screened back together |
| Fresnel | `::before`, a flat wash on a masked ring |
| glare | `::after`, a conic gradient on a masked ring |
| blur, saturation, tint | ordinary CSS, driven by custom properties |

**What it replaced, and why that is a simplification rather than a swap.** The
titlebar was four WebGL2 passes rendered into a canvas the size of the strip, and
because the Panel's colours are all mixes against the Turn that canvas had to be
re-rendered as the page crossed — keyed on the Turn quantised to sixteen steps,
plus a `data-theme` watcher, because the Frame's near end was the page's own
paper. **None of that survives.** A custom property interpolates through the
crossing for free, and the map depends on the pane's SIZE and on the optical
Tokens and on nothing else — so it is rebuilt on a resize, never on a scroll,
there is no bake to invalidate and no theme to watch. The canvas is gone with it,
and so is the divergence that canvas forced: `frame-glass.js` inserted its own at
run time and an unscoped rule styled it, because Astro cannot scope a rule to an
element the compiler never saw.

**Two rungs, and the cascade is still what picks.** The `.projects-panel__bar`
rule is the frosted rung and is everything an engine gets that cannot refract:
the tint, the blur, the saturation and the two rings. The refraction is spliced
into that same backdrop filter through one of two slots, `--lens-pre` and
`--lens-post` — which is what is left of upstream's `blurEdge` once there is one
filter chain rather than a shader that can choose per pixel. Exactly one slot is
ever filled, because CSS cannot reorder a list from a variable.

**THE FALLBACK ASKS THE ENGINE WHAT IT KEPT.** Chromium is the only engine that
runs `url()` in a backdrop filter today, and one that does not drops the **whole**
declaration — which would cost the blur and the saturation as well. So the
declaration is set, the computed value is read back, and if the `url()` did not
survive the slot is emptied again. `data-lens` is written from that readback and
is `refracting` or `frosted`. The Check drives **both**, the frosted one by
declaring the strip's backdrop filter without the slots and resizing to make
`lens.ts` look again — the same stance the old ladder took, whose three rungs were
"driven and read back at 1440x900, with the upper rungs suppressed in the harness
rather than predicted".

**Four things about it are easy to get wrong and silent when you do.**

- **The glare is a function of the surface NORMAL, not of the direction from the
  centre**, and those are the same thing only on a square. The strip is 36px tall
  in a window 1033 wide, so its top edge is 177° of the sweep round the centre and
  each end cap is under 2° of it: a conic gradient read straight off the position
  angle puts a lobe halfway along a long edge, leaves every corner unlit, and
  squeezes the brightest part of the rim into three pixels of end cap. So the
  stops are walked along the outline itself. **The symptom to expect if this is
  ever simplified back is that the reflection's copy looks nearly right and the
  strip looks wrong**, because the copy is closer to square.
- **`corner-shape: superellipse()` takes the LOGARITHM of the exponent.** The
  Token is the exponent — 2 is `border-radius`'s own arc, 4 is a squircle — and
  `lens.ts` writes CSS `log₂` of it. Handed over raw, the shipped 4 paints an
  exponent of 16, a corner with almost no curve left, while the map goes on
  refracting the arc it was asked for. The stylesheet's own default is 1, so an
  engine with no `corner-shape` and a page whose script never ran agree.
- **The shape is declared on the FRAME, and every box cut to it says `inherit`.**
  The window's corner is the window's: the titlebar restates the RADIUS, because
  its two bottom corners are square and the window's are not, but the shape is
  one declaration in one place. It was on the strip alone, and `--lens-shape` was
  written there too, so the rim and the crop over the recording — both of which
  reach for the window's corner with `inherit` — got `round` while the strip got
  the squircle. Same radius, two curves, **two corners painted on the same pixel
  at the top left and the top right**, the arc reading as a slightly tighter
  corner laid over the squircle. It is exactly as visible as it sounds and it
  survived a commit, because the strip on its own looks right and nothing about
  a corner is asserted anywhere.
- **The map's radius is the PAINTED radius, read off the pane.** Upstream owns its
  own blob and lets one setting decide both; here the corner is
  `--projects-panel-frame-corner`, a share of the window, and the window and its
  titlebar are cut to it by construction. A separate radius refracts an arc the
  paint never drew — the same class of fault as the logarithm and just as
  invisible. It was exactly this fault in the studio that made all three corner
  options look identical.

**The reflection gets the frosted rung**, and `reflection.ts` says why from the
other end: the Plinth's top face is `--projects-panel-plinth-top` of the Frame's
width, so the reflected titlebar is about **1.2 pixels tall**. A displacement map
for that is a canvas encode and a second filter subtree for something with no
room to exist in.

### The small-Frame reduction, and why the gate is the Frame

Below **520px of Frame** the sidebar, both chevrons, the reload, the address text
and the right-hand cluster are dropped rather than drawn small: at the 347px Frame
a 390px phone gives this Section, the back chevron is 1.9px of box carrying a
0.28px stroke. The lights and the field stay, and between them the strip is still
unmistakably a browser window.

**A container query and not a media query**, and that distinction is the reason
the Check measures at a second window. The composition is fitted to the smaller of
the page's width and what its height will carry, so a short wide window draws a
small Frame: at 1440x450 the Frame is 468px and the reduction fires while the
window is 1440 across. A viewport gate at the same number would leave every glyph
on screen there.

### What the Check holds, and what it was shown to catch

`scripts/checks/checks/projects-panel.mjs`. Every paragraph above that says "do
not break this" has an assertion behind it now, and every assertion reads the
Token it is about back off the page — so moving a measured share moves the glyph
AND what is expected of it, and nothing fails. What cannot change without failing
is the relationship.

**Each one was broken on purpose and seen to fail**, which is the only way to know
what a Check is worth. Nineteen mutations, each applied on its own, rebuilt, and
reverted:

| broken | caught by |
| ------ | --------- |
| the sidebar's gap written back as `1.79cqw` | its centre, and both chevrons' with it |
| the window's corner in `cqw` | the window's and the titlebar's radii disagreeing |
| the content box inset on four sides | the recording no longer flush with the chrome |
| `@container` changed to `@media` | every glyph still drawn at 1440x450 |
| `z-index: 0` on the stage | the stage having become a stacking context |
| the head's negative bottom margin dropped | the drop into the second line |
| the fall added to the stage and not to the second line | the drop into the second line |
| the restated stone drifting from the drawn overhang | the Kernel and the Panel disagreeing in px, and the slab's corner |
| a padding back on the Section's right or foot | the slab's corner, across and down |
| the reach dropped, so a height-capped drawing leaves the stone short | the slab's corner at 1920x980, and nothing at 1440x900 |
| the width branch back on `100vw`, so the reach goes negative | the gutter the engineering points sit behind, closing to 0.59px |
| `aria-hidden` off the stage | the chrome back in the accessibility tree |
| a button added to the chrome | a focusable thing inside an aria-hidden subtree |
| the canvas hidden while the shader had drawn | the tier and the canvas disagreeing |
| the address field's height halved | its measured share |
| the reload placed at its own absolute centre | its clearance inside the field |
| the address field moved off the Frame's middle | its centre |
| the titlebar's share raised to 0.04 | the strip covering 57.60 of the clip's 50 clear rows, at both wide windows |
| the previous clip's poster served in place of this one | its first 49 rows spreading 241 levels instead of lying flat |

and four Token moves that must NOT fail, and do not: the sidebar's centre to
0.09, the drop to 0.4, the corner to 0.03, and the titlebar's share DOWN to 0.03
— which is the point of the clearance being a ceiling rather than an equality: a
shorter strip shows a little more of a margin that is white either way, so it
passes with the measurement printed and nothing said.

**The centre tolerance is 0.0003 of the Frame's width, and it is tight on
purpose.** At the three quarters of a pixel it started at, the first mutation in
that table passed — a Check permitting exactly the flattening it exists to
prevent. 0.0003 is 0.28px at 1440x900, fifteen times the largest disagreement the
chrome actually shows and three times the worst case of Chromium's own 1/64px
layout units accumulating down a row of five margins.

**What it does not assert.** Nothing about the material: the glass is four passes
of a shader and its output is a picture, so what a Check can honestly say about it
is that the tier reported is one of the three and that the strip is made of
something. The four sampled colours above were compared with the live page by
hand, once, and are not asserted — a colour a Check measures against a number
somebody chose is the failure mode `scripts/checks/NOTES.md` is written against.
Nothing about the SVG glyphs' own drawing either, only the box each is drawn in.

### Where this does not match the live page, measured

Both at 1440x900, `/next` and `/portfolio` served from the same `dist/`.

**The drawing is now the same drawing, to half a pixel.** The composition
measures 1238.97 × 698.63 here against the live page's 1278 × 720.06, and the
live page's height scaled to this width is 698.07 — 0.08% apart. It read 617.9
tall before the Plinth landed, which is exactly the slab: the fit constant had
been counting it the whole time. The proportions the slab is drawn at agree to
five decimal places — the plinth is 1.18944 Frame widths wide here and 1.18942
there — and the width divergence behind the scaling is the one #138 already
records: the live page at this window is inside its one-screen band, where the
Rail leaves the grid and the fit constant is re-derived, and neither is portable
without the Cut Title.

**The sidebar toggle and both chevrons are 0.46px to the left of the live
page's**, which is the flattened-gap correction above — the chevrons are chained
off the sidebar's right edge on the live page, so all three carry the same
half-per-cent rounding. The three lights, the address field, the reload and the
right-hand cluster of three are on the same share of the Frame in both, to five
decimal places.

Two more things the live page does that are **not** ported, and neither is an
omission here: the Effect Stack's `data-fx-no-text` lift, which keeps the print
off the Section's type, has no mechanism in the Kernel yet and would be the
Kernel's to add; and the print stylesheet hides the Panel outright, which belongs
with whichever ticket gives the Portfolio a print sheet.

## The Plinth

The marble slab the Frame stands on, the Frame's live reflection lying in it, the
contact shadow where the two meet, and the recording inside the window. It is the
last quarter of the composition's height and the reason the fit constant is
0.6042 rather than 0.5.

### Every length is a share of the FRAME's width

Not of the composition's, which is what everything else in this Section is
measured in. The Plinth is a thing the Frame stands **on**: the render gives all
three depths as distances from the window's own edges, the reflection has to be
exactly as deep as the top face, and the plate is baked at an aspect ratio
computed from the same numbers. Stated against the composition, all four would
have to be converted back into Frame widths in four places to be checked in any
of them.

So the component states the Frame's width once, as `9c + 8g` times the
composition's — nine columns of twelve and the eight gutters inside them — and
the three depths are shares of that. **It over-states the laid-out Frame by
whatever the Rail's floor costs the composition**, 2.4px at 1440×900, because
`--projects-panel-w` is what the fit *asked* for and the grid caps the column at
what is actually free. Every depth therefore reads 0.26% high, which is 0.05px on
the top face. That is why the window's corner is a percentage of its own box
instead of reading this length, and it is why the Plinth's tolerance in the Check
is 0.002 of the Frame rather than the chrome's 0.0003.

**Everything HORIZONTAL is exact, and is a percentage of the stage.** The slab's
left edge, its width, the reflection's two edges and the contact shadow's are all
`something / (10c + 9g) × 100%`, which resolves against the box the grid actually
laid out rather than against the one the fit asked for. That is a change to
#139's rule as well as an addition: **the Frame's own `margin-left` is now the
same percentage**, where it was that share times the composition's width. The two
differ by 0.36px, and while the Frame was alone in the stage nothing could tell.
It is not alone now — the reflection is placed off the *slab* and the window off
its own margin, so the two would have disagreed about where the window's edge is
at every width, and the reflection would have lain half a pixel off the thing it
reflects. Both read one box now.

### The four numbers, and what each is

Restated in `design/plinth/build-slab.py` as `NEAR_HALF`, `TOP_FACE`, `BEHIND`
and `FRONT_FACE`, because the block has to be **rendered** at the shape it is
drawn at and there is no third place to put them. There they also frame the
camera, so a change made in one place and not the other does not stretch the
picture: it moves the block.

| | share | what it is |
| ------- | -------- | ------------------------------------------------ |
| behind  | 0.019597 | the marble between the slab's back edge and the Frame's foot |
| top     | 0.016876 | the visible marble in front of the Frame — the whole of what the reflection lies in |
| front   | 0.070024 | the front face, and the block turning under at its base |
| overhang| 0.094719 | how far the slab hangs off the window at **each** end |

**`behind` is the one that has already been got wrong.** The Frame stands *on*
the top face rather than at the back of it, so the slab runs behind the window
and is hidden under it in the middle and visible at both ends. Reading it as zero
made the whole top face 31 render pixels instead of 67, and the block read as a
lit strip rather than as a slab with a window standing on it.

**`front` is a floor and not a height.** The render's own front face measures 83
render pixels, 4.52% — but the picture is cut off there with the stone still at
level 30, so 7% is what is drawn and the extra is the rest of a block.

The four are unitless on purpose, and `top` is why: it is the depth of the top
face **and** the share of the window that face is tall enough to show. Keeping it
a bare number is what lets those be one constant rather than two kept equal by
hand.

### In flow, and pulled back up

The slab is `position: relative` in the flow directly under the Frame, and not
absolutely placed at `top: 100%` — which draws the same picture and is wrong. The
fit constant that scales the whole drawing onto one screen counts the Plinth's
depth, and an out-of-flow slab leaves the stage exactly as tall as the Frame while
the constant says otherwise, so the composition comes out short by the Plinth at
every window size. In flow, the stage measures what the arithmetic assumes.

It also starts *above* the Frame's foot, by `behind`, and a negative top margin of
the same length pulls it back. That is what keeps the arithmetic honest: the box
is `depth + behind` tall and costs the flow only `depth`, which is the same
0.0869 of a Frame width `--projects-panel-fit` has always counted. Nothing above
the rule moves.

`background-size: 100% 100%` and **not** `cover` is the one declaration in the
block that would be a bug if it were the usual thing. The plate is rendered at
exactly this box's aspect ratio, so stretching it to the box is an identity;
`cover` would crop off either the far edge or the block's base.

### The slab ends on the page's right edge, and the Frame does not move

The Frame is flush with the composition's right edge, so a slab that overhangs it
symmetrically needs room on that side the composition does not have. **Pulling the
window left to make room was tried and is wrong**: it puts the Frame over the
engineering points, 42px of live text behind it at 1600×1000. A relative nudge on
the stage alone does the same thing more quietly — it eats the gutter between the
list and the window at every width and crosses it above about 1550. The Frame is
allowed to occlude the subheading, which is set to be occluded; it is not allowed
to eat the list.

What found the room instead was **spending the page's width on the drawing and
the stone together**, one line in `src/kernel/landing.css`:

```
  inset + W + stone × W = 100vw      →     W = (100vw − inset) / (1 + stone)
```

The composition comes out a little under a per cent narrower and the marble's
right end lands exactly on the window's edge. It costs the gutter nothing, because
the gutter is a share of `W` and narrows with it — which is the whole difference
between this and nudging the stage. `stone` is `--landing-plinth-share`, the
overhang restated in the Kernel because the Kernel may not ask a Section, and the
`turn` Check holds it to the Panel's own answer in px.

**The page across is `--page-across` and not `100vw`.** `100vw` includes a classic
scrollbar's gutter and the boxes the drawing is laid out in do not, so read off
`100vw` the stone landed **15px past** the edge on every real browser — clipped by
the Section, so what the reader saw was the block's end cut off flat rather than
its corner meeting the page's. `src/kernel/ground.css` owns that length and says
why it cannot be a viewport unit and why it has to be a registered property.

`overflow-x: clip` on the Section stays and still matters: outside the landing band
nothing solves for the stone, so there the slab runs off the edge as it always did
— which is what the render itself does with its own slab.

### And where the drawing cannot be wide enough: the reach

The width branch can only put the stone on the page's edge when the **width** is
what bound. Where the composition's height caps it, the drawing is narrower than
the page has room for and the stone ends with it. So the stage carries the Frame
and the slab out to the edge together:

```
  left = --page-across − inset − (1 + stone) × W
```

which is that branch's own equation rearranged, and therefore **exactly 0 whenever
the width branch was the one that bound**. It cannot go negative either: `W` is the
smaller of the two branches, so `(1 + stone) × W` can only be less than the page
across. It is a degradation path, not a second thing to keep in step.

**Right is the safe direction and left is the forbidden one**, and that is the
whole reason this is allowed where the nudge above is not. Moving right opens the
gutter the engineering points sit behind — 20px to 139px at 1920×980 — where left
closes it. That failure is no longer a matter of judgement: the `projects-panel`
Check measures the gutter against the composition's own and fails if the window has
moved *towards* the list. It fires at 0.59px of gutter if the width branch and the
reach are ever given different ideas of how wide the page is.

What it used to cost is that the Frame stopped being flush with the composition's
right edge on a height-capped window: at 1920×980 the window ended 119px past the
right edge of the copy paragraph above it. That was chosen over letting the slab
go asymmetric, and over leaving the stone short — and it is no longer the choice,
because the two type blocks beside the window come with it now.

#### The reach is named, and three boxes spend it

`--projects-panel-reach` is the length, declared once at the top of the landing
block. The stage **moves** by it; the copy and the points **grow** by it, through
a negative right margin, so each of them still stretches to the grid area it was
placed in and there is no second copy of the column arithmetic to keep in step.

What that buys is two edges that hold at every window in the band rather than at
the ones the width branch happens to bind on:

| block | its right edge | why |
| --- | --- | --- |
| the copy | the Frame's right edge | the paragraph and the window it stands over are one block of the page, and a window 119px wider than the text above it reads as two |
| the points | one gutter short of the Frame's **left** edge | the list is set beside the window, and a list left on the grid opens a widening band of nothing between itself and the thing it is beside |

Both degenerate correctly, which is what makes them safe rather than a third thing
to keep in step: at reach 0 the Frame is flush with the composition and both boxes
are back on the columns they were placed by. The points' clearance is the same one
the leftward nudge is forbidden for spending, held from the other side — growing
by the same length the window moved holds it at exactly one gutter.

**The points' width is what decides whether a title is one line.** The longest of
the four wants about 0.304×W at the share the title is set at, and three columns
is 0.241×W — so on a window with little reach the longest two wrap. That is the
intended degradation and not a size to solve backwards from: `text-wrap: balance`
makes the two lines halves of a title, and the list spreads down its column
anyway.

### The heights this was got wrong at

The first version of this called the height-capped case an ultrawide's problem and
asserted the corner only on the width branch. It is not an ultrawide's problem. **A
viewport 900, 1080 or 1440 tall is a screen, not a window** — a maximised browser
gives up about 100px of it to its own chrome — and at the heights a browser
actually has, the height branch binds nearly everywhere:

| viewport | branch | stone was short by |
| --- | --- | --- |
| 1920×980 | height | 119px |
| 1920×955 | height | 165px |
| 1536×760 | height | 136px |
| 2560×1300 | height | 162px |
| 1440×790 | width | −14px (overshoot: the scrollbar) |

Twelve Checks passed while the marble was clipped on the author's own screen, for
two compounding reasons: the suite measured at 1440×900 only, where the width
branch binds, and it ran with `--hide-scrollbars`, where `100vw` and the client
width are equal. Both are closed — `MAXIMISED` is a Check viewport now and
`run.mjs` keeps the gutter — and the lesson is the one worth carrying: **measure
the band at heights a browser actually has, with the scrollbar a reader actually
gets.**

### And its foot is on the page's bottom edge: the fall

The drawing is self-similar, so it has one height for its width, and the width is
the smaller of the two branches. **Where the width branch binds, the drawing is
shorter than the screen**, and that difference used to be black sitting under the
marble — 102px of it at 1440×900, which read as deliberate. It is spent inside the
composition instead, by `--projects-panel-fall`, and everything in row two comes
down by it: the stage, so the Plinth's foot is the page's foot; the subheading's
**second line**, so the Frame still bites a measured fraction into it; and the
points, because otherwise the line that moved lands on top of the list.

The fall is **measured, not restated** — the Section's own box less the lengths
the two rows are built out of, every one of them a variable the Section already
has. The fit constant's ratio is deliberately not among them: writing 0.5586 there
would be a fourth copy of a number three files already disagree about by a third
of a per cent, and the fall is exactly the size of that disagreement plus a page
margin. Stated as the same arithmetic the browser lays the box out with, the two
agree to a hundredth of a pixel at fifteen windows across the band.

Three paddings go with it. **The page's margin is on the left in the landing band
and nowhere else**: the top's is spent by the landing, and the foot's and the
right's are the stone's. And the one that survives is `--landing-side` rather than
this Section's own inset — the word is set on that margin and the Rail is set
across it, so in the band it is a length two Sections have to agree about and it
comes from the Kernel. The right one is not cosmetic — the width branch asks for a
column wider than `100vw − 2 × side` on every window where the side margin has hit
its `5rem` cap, above about 1467px of height, and a right padding caps the grid
track there without saying so. Then `--projects-panel-w` over-states the box that was
actually laid out, the fall subtracts a Frame height that is not the Frame's, and
the marble stops short of **both** edges at once: 41px across and 15px down at
1100×1440, which is the window that found it.

The height branch had to move for the same reason the fall exists. The drawing now
runs from the page's top margin to the page's bottom **edge**, so its budget is
the screen less **one** margin. Subtracting the second one was what left the stone
115px short at 1600×900 — the branch that bound was solving for a bottom margin
that no longer exists.

The `projects-panel` Check asks for the corner on **both** axes and **both**
branches, at 1440×900 where the width binds and at 1920×980 where the height does,
and reports which branch each window took — a run that named the same branch twice
would mean one of the two routes to the corner had stopped being exercised.

### The reflection is a clone, and it is life-size

`reflection.ts` copies the Frame into the marble and the stylesheet does everything
after that. Two hand-kept copies of a hundred lines of measured drawing is one
copy that gets edited and one that does not, and the one that does not is the
reflection, where nobody would notice for months.

**The clone runs before the other two scripts**, and that ordering is the design.
`clip.ts` hands sources to every recording on the page and `lens.ts` gives every
titlebar its material, so making the copy first is what lets both treat it as one
more Frame instead of a special case. Both were written for it and said so before
there was one to find. The copy's ONE asymmetry is `lens.ts`'s: it gets the
frosted rung, because a titlebar 1.2px tall has no room for a bevel.

**A mirror image is the same size as the thing it reflects, and getting that
wrong is the mistake this is most likely to be re-made into.** A planar mirror
puts the image as far behind the surface as the object is in front of it, so
object and image subtend the same angle at the eye and project to the same
height. The strip is short because the **slab** is short, not because the image
is. `top × ratio` is 3.28%, and 3.28% is the share of the window the box is tall
enough to show — read as a *scale* and applied as one, the whole 476-pixel window
is squashed into the sixteen pixels that are actually its bottom 3.28% seen
life-size, and thirty rows of chrome, tabs and clip averaged into every row of
stone is a grey band that changes when the clip changes. The transform is a plain
fold; the clipping is the box's own `overflow`.

Three more decisions inside it, each of which has an obvious wrong answer:

- **No `filter: blur()`.** Roughness 0.07 at 82° of incidence spreads a reflection
  by about a pixel over a strip sixteen deep, which is not worth a full-size
  gaussian over a moving picture every frame. What the eye reads as softness is
  the contact shadow above and the stone's own veining showing through.
- **Plain alpha and not `screen`.** A reflection adds light, so `screen` is what a
  reflection does — but the plate already carries the light: its top face ramps
  from 31 to 80 because that is what the render measures, and that ramp *is* the
  room reflected in the stone. Alpha also gets the dark half right for free: a
  black tab bar reflected in polished stone makes the stone darker than the marble
  beside it, which `screen` cannot do.
- **The strength does not go out with distance.** Fresnel against the render's IOR
  1.55 gives 0.526 at the contact line and 0.507 at the front arris — half the
  light and all but flat. A reflection faded to nothing before the arris leaves a
  band of stone at the very front reflecting nothing, which is the one place a
  grazing eye sees the most, so the mask bottoms out at 0.62 rather than at
  transparent.

**A browser that never runs the script gets the marble and no reflection**, which
is deliberate rather than broken and is the trade every script in this Section
makes. Polished stone with nothing in it is a plinth, and nothing on the page says
one was promised. The Check asserts that outcome in its own pass rather than
leaving it to be believed — which is also how it asserts the copy is genuinely
derived, because a second window written out in the markup would still be standing
in the stone there.

### The contact shadow

The cue the eye uses to decide whether two objects are **touching** at all, and
its absence was the loudest thing in the composition — the Frame ended, the marble
began, and nothing happened at the join, which is what a sticker on a photograph
looks like.

It cannot come out of the plate: `build-slab.py` renders a bare block, and the
thing standing on it is a live element whose foot lands wherever the composition
scaled it to, so an occlusion baked in at one width is in the wrong place at every
other. Drawn from the same two edges the reflection is, it follows the Frame for
free.

**It sits on the top face and stops there.** Not a soft shadow spilling down the
front, which is the reflex: the front face is a vertical plane over a Frame width
away in the depth direction and the light that fills it is in *front* of the
block, so the window occludes none of it. **The ends fade** because the shadow
belongs to the window and has to end where the window does, and a hard vertical
edge at the Frame's corner reads as a drawn rectangle. **It is above the
reflection**, which is a decision rather than an accident of order: an occlusion
strictly darkens the diffuse term and leaves the specular alone, so a purist would
paint it under — but what is occluded here is also most of the room the stone had
to reflect, and a reflection at full strength right up to the foot of the thing
casting it looks lit from underneath.

### The recording, and the two elements showing it

The photo vault's grid, scrolling, recorded against `design/censor/`'s capture
origin — which serves each censored photograph as a mosaic of a handful of blocks,
so no unobscured frame of one exists anywhere in the pipeline.

**The element ships with a poster and no source at all, and that is the whole
design.** `clip.ts` names the files, and only when the reader has not asked for
reduced motion, so under that setting the poster is the whole of it and nothing is
fetched — not a range request, not a metadata probe. A CSS rule cannot decline a
fetch and neither can `preload="none"`, which still fetches the moment it plays.
`<source media="…">` is written on each element too: two independent refusals,
because a browser that ignores the attribute would fetch with nothing in the page
able to find out that it did.

`muted` is not decoration either — it is what lets `autoplay` run at all, and the
Portfolio never makes a sound.

**The clip and the box are not the same shape, and this is where that is settled
rather than hidden.** The recording is 1440×900, which is not free to move:
change it and the clip passes over photographs nobody reviewed. The render's Frame
is 1430 by 735 including its titlebar, and 1430 of a 1.6 recording is 894 tall
before a titlebar is added, so the picture alone is taller than the whole window.
Something is cropped, and cropping the recording is a smaller lie than reshaping
the window the whole design is drawn around. It is `cover` **from the top edge**,
so the whole cut comes off the bottom — which keeps the vault's own toolbar hard
against the top of the box, and is the only direction the censored list is safe
in: removing what the clip shows can only ever remove, and re-centring the crop
shows rows nobody reviewed.

**Near the top of the box, then — not hard against it, and the difference is in
the file rather than in this stylesheet.** The titlebar is over the recording and
not above it, which is what puts a photograph behind the Lens instead of a flat
fill, and what it costs is the first rows of the page that was filmed: 0.034583 ×
1440 = **49.79 rows**, at every window, because the clip is scaled to the Frame's
width and the strip is a share of that same width. Measured as well as derived —
a 1271.5px Frame draws a 43.97px strip, which is 49.79 recording rows. That was
cutting the vault's toolbar through the middle, and what showed under the glass
was the bottom two pixels of a pill.

So the page is FILMED with 50 rows of its own white ground above that toolbar.
Nothing in this Section arranges it and nothing here could: at rest the strip has
the page's ground behind it, and the moment the clip scrolls, photographs travel
up into that band and pass under the Lens — which is a property of the recording,
decided when it was cut. `design/censor/capture-frame.mjs` is where the number
lives and `design/censor/README.md` is the procedure that applies it; the travel
moved by the same 50 so that the clip passes over the same 84 photographs and the
signed review still covers it.

**The clearance is a ceiling, and the Check holds both ends of it.** The strip may
be made shorter for free — it shows a little more of a margin that is white either
way — and may not grow past the 50 rows the clip on disk was cut with. Neither end
is visible: the clip is a video, so what the strip covers is a picture, and a
titlebar that has outgrown its room looks like a titlebar. So the Check asserts
that the strip fits inside the number, AND that the poster still opens on that
many rows of one flat light value. Either half alone is worthless — one passes a
Lens trimmed to fit a recording nobody re-cut, the other passes a recording with
room for a strip that has since grown.

**The reflection's copy is served late, and that is why `clip.ts` is not a loop.**
Both elements name one URL, and two media elements asking for it at the same
instant are not reliably coalesced — the spec does not require it and engines
differ. Waiting for the lead's first frame puts the response in the HTTP cache
before the copy asks, which turns the second fetch into a cache hit everywhere.
What it costs is that the marble is a still until the clip starts, and then
catches up, which is the right way round.

**A second element rather than a canvas fed from the first**, because painting
frames out of one video into a canvas is one decode instead of two *and* a
`requestAnimationFrame` loop for as long as the page is open — the per-frame cost
this Section is built without. The compositor draws the reflection for free
because it is drawing the copy anyway.

### Which stone, and the one line that will go stale

The plate is rendered, not procedural, and `docs/agents/plinth-marble.md` is the
authority on which one is drawn — read it before touching `design/plinth/`. The
standing constraint is that whatever is named is lit in the **dark** room: a
surround fitted to a light stone pins a black ground at a flat 24 whatever the
texture under it says, and that fault took three wrong diagnoses to find.

**It is a Token and CONTEXT.md says a Token is a number or a colour**, so this is
worth arguing rather than leaving to be noticed. A plate is an asset, and assets
are Content — except that the whole of what makes the CSS home right is that **the
build fingerprints anything it can see in a `url()`**. Move the plate into
`content.ts` and it becomes a runtime string the build cannot see, and the
hand-kept digest comes back; the Kernel's Effect Stack made exactly this call for
its two textures and says so where it declares them. Both homes are the Editor's
to write, so the part of the glossary's definition that carries weight — that a
Token is what the Editor may change directly — is satisfied either way. If that
trade is ever re-decided, this line and the Kernel's two move together.

**No `?v=` digest here, unlike the copy of the URL in `portfolio/styles.css`.**
The build fingerprints anything it can see in a `url()`, so what ships is
`/_astro/plinth-….<hash>.webp` and a re-rendered plate is a different filename by
construction. The digest that sheet carries is doing this job by hand because
nothing builds it. The recording's URLs go the other way and *do* carry one: they
are assembled in script, where the build cannot see them.

**What is not ported, and it is not an omission.** The live sheet carries four
`.panel[data-marble="nero"|"portoro"|"marquina"|"grey"]` rules beside the default
declaration. They are #69's tuner's seam — a `dataset.marble =` and nothing else —
and this Section has no tuner: choosing a stone here is the Editor setting the
Token, which reaches every plate in `design/plinth/slab.json` rather than the four
somebody once wrote a rule for. It is the same call #139 made about the glass's
`marble` and `clip` backdrops and the `window.panelGlass` seam, for the same
reason: a seam with no consumer is a second surface that agrees with the shipped
one only while somebody keeps checking.

And `plinth-studio.py` does not rewrite the line in `tokens.css` — see *What is
still nobody's* above. **That one IS asserted**, which is the difference between
the two: the Check reads the live sheet's own declaration and fails if the two
trees have stopped standing on the same stone. Documenting a drift and then
leaving it unguarded is how the acceptance criterion most exposed to it ends up
being the only one with nothing behind it.

### What the Plinth's Check holds, and what it was shown to catch

The same file as the Frame's, and the same rule: every assertion reads the Token
it is about back off the page, so moving a measured share moves the slab **and**
what is expected of it. What cannot change without failing is the relationship.

It also runs two passes the Frame's half does not, and each asserts a promise that
is invisible on screen: one with **scripting off**, where the marble has to be
drawn at its full depth with nothing lying in it, and one with **reduced motion**,
where not one byte of the recording may be requested.

It used to reach outside the served page exactly once, to the hand-written page's
stylesheet, for the one thing no reading of this page alone could tell: whether
the two trees still drew the same stone. #141 deleted that sheet, so there is one
declaration and nothing to disagree with, and the assertion went with the file it
read. The shape is worth remembering — a Check may read the repository when what
can break is an agreement between two files rather than anything on screen.

**Sixteen mutations, each applied on its own, rebuilt, and reverted.** Fifteen
were caught by the Check and one by the typecheck:

| broken | caught by |
| ------ | --------- |
| `reflection.ts`'s `appendChild` commented out | no Frame in the marble |
| the fold written as a `scaleY(top × ratio)` | the copy 460px shorter than the window |
| the depths taken as shares of the composition | all three depths, and the stage's foot |
| `top` and `behind` swapped | both depths, and the reflection's own depth |
| the plate at `background-size: cover` | the plate no longer stretched to its own box |
| the slab moved to `position: absolute; top: 100%` | the stage ending at the Frame's foot |
| the contact shadow's `content` removed | the Plinth drawing no shadow |
| a `src=` written onto the recording in the markup | the markup source, in both elements |
| the crop re-centred to `50% 50%` | the object-position, in both elements |
| the reduced-motion refusal disabled | two sources served to a reader who asked for stillness |
| the reflection box set to `overflow: visible` | the box no longer clipping |
| the slab given one overhang instead of two | the right overhang, and the two ends disagreeing |
| a second Frame written into the marble in the markup | the copy's element count, and the no-script pass |
| `tokens.css` pointed at a different stone from the live sheet | the two trees no longer standing on one plate |
| the shared top face given the slab's ends instead of the Frame's | both edges, on the reflection and the shadow |
| the shared top face made the whole slab deep | the contact line, the depth, and the shadow with them |
| the `poster` attribute deleted | `astro check` — the import goes unused |

**The depth tolerance is 0.002 of the Frame and the horizontal one is 0.1px**, and
the split is the point: the depths inherit the Frame width's 0.26% over-statement
and the horizontal lengths are exact percentages of a box that was actually laid
out. 0.002 is eight times the largest inherited error and still nine times smaller
than reading `top` as `behind`.

**What it does not assert.** Nothing about the marble — which stone, how it is
veined, how bright the room was — because that is the bake-off's, recorded in
`docs/agents/plinth-marble.md` and judged by eye. Nothing about the reflection's
opacity or the shadow's four stops either: both are Tokens the author may set to
anything, and a Check measuring one against a number somebody chose is the failure
mode `scripts/checks/NOTES.md` is written against.

## Where this does not match the live page yet, measured

Two differences, both of them consequences of what has not landed rather than
choices made here. The numbers are off `/next` and `/portfolio` served from the
same `dist/`, at 1440×900.

**The landing has landed, and the base regime is what is left below the band.**
Inside the band the two numbers that used to be parked here are in the landing
block at the foot of the component: the Rail leaves the grid to stand in the
page's own margin (so the width branch loses the 0.9597), and the fit constant is
re-derived to 0.5971 for the height the Section gives up above the fold. Both come
from `--landing-w`, so neither is written here. The masthead comes out 76.42px in
the band against 74.28px outside it, 2.9% larger, and the Rail stands at x 0..81
rather than inside the composition at x 81..96 — which is the live page's own
pair of figures. Everything else is the same drawing in both: the type scale, the
two-row grid, the hanging second line, the copy at four lines, and the Rail's 10px
floor.

The band is also where the Plinth sits square in the page's bottom-right corner:
the width branch above spends the page across on the drawing **and** the stone, and
`--projects-panel-fall` brings row two down onto the page's foot. The two sections
under the Plinth are the whole of it, and the paddings they turn off are why the
page's margin is on the left here and nowhere else.

Three more things the landing block does, each for a reason that is not obvious:
the composition stands at the Section's own top edge rather than centred in what
is left, because the landing measures the masthead's drop from that edge and a
centred composition sits ten pixels lower than the arithmetic says; the masthead
goes invisible and **keeps its box**, which is row one's stated height, the line
the subheading hangs off and the slot the word occupies; and the Section paints no
ground of its own, because the document has one, because an opaque ground here
would paint over the corner pictures' last strip, and because two mixes of two
different far ends came out a shade apart mid-Turn and put a seam straight across
the word.

**Below 1100px the two are the same drawing.** The stack was compared at 390×844
and every size matches to the pixel — masthead 46.8, subheading 29.25, copy 14.82,
Rail 11.31 — and the copy and the figures break on the same words. The Plinth
matches there too, and at 1024×800: the same Frame, the same slab at 1.18941 of
its width, the same 32.84px of overhang at each end, and the reflection on the
window's own two edges to a hundredth of a pixel in both trees.
