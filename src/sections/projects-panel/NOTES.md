# The Projects Panel

The dark Section presenting one project at a time. This folder holds the Rail,
the masthead and its two authored lines, the copy and the engineering points —
the Panel's shell. **The Frame is #139's and the Plinth is #140's**, and both
land in this same folder; the two holes they leave are named below so neither
ticket has to re-derive what the composition already assumes about them.

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
| the width  | what the page has across, less the Rail and its gap. `--projects-panel-across` is 1 − 0.0274, and 0.0274 is the Rail's own width plus the gap as a share of the composition — added up once, because a grid track cannot be sized from its own siblings. It rounds towards asking for LESS, which is safe twice over: the Rail's floor makes it relatively wider on a small window, and `100vw` counts a scrollbar the layout does not get. Over-asking cannot overflow either way, because the track is `minmax(0, …)`. |
| the height | the screen less the page's two margins, divided by `--projects-panel-fit` — the composition's height as a share of its width. |

### Where 0.5651 comes from, and when to re-derive it

The height ratio measures 0.5634:

```
  0.86  × 0.0598      the masthead's line, which is row one's top
+ 1.66  × 0.0380      one subheading line (the rest of row one), plus the 0.66
                      the Frame is dropped by
+ 0.746923 / 1.945    the Frame: nine columns of twelve less a quarter of a
                      gutter, over its aspect ratio
+ 0.0869 × 0.746923   the Plinth the Frame stands on, which hangs below its foot
```

`--projects-panel-fit` is 0.5651, which is that plus a third of a percent of
slack for sub-pixel rounding and for the copy's floor on a small window.

**Two of those four terms are for things this folder does not contain yet**, and
they are kept anyway. The alternative — fitting the drawing to the masthead and
the copy alone — would make the Panel bigger now and smaller again the moment
#139 lands the Frame, which is churn in the one number every other length reads.
So the composition is already the size it will be, and row two is empty until the
Frame arrives to fill it.

**Re-derive it** if you move the masthead or the subheading share, the Frame's
columns or its aspect, or either of the Plinth's two depths. Those seven numbers
*are* this one. It was 0.5 before the Plinth arrived.

### Two of the five sizes get a floor, and it is in px

A share of the composition stops being readable somewhere — a 1280×720 laptop
draws the drawing at half the width a 2560 display does — so a floor is wanted.
But a floor is a break in the self-similarity the fit is solved on, and a block
that stops shrinking eventually outgrows the space the drawing left it.

The points and the Rail can afford one because they sit in slack: the points
column runs to two fifths of its row and the Rail is three words against the
whole screen's height. **The copy cannot**, and it is the one that would most
like to: its height goes as the *square* of its type against its column — a floor
makes the type bigger and the column no wider — and it is measured against row
one, which is a stated height. Floored at 0.7rem it ran 30px past a row of 71 at
an 800px composition. The masthead and the subheading have no floor for the
harder version of the same reason: those two *are* the composition's height.

The floors are in **px and not rem** because inside the live page's one-screen
band the root's font size is solved from the window, so a rem is 11-something px
on exactly the short screens the floors exist for. A floor that shrinks with the
thing it holds up is not a floor. `/next` has no such band yet; the numbers are
carried as they are so that the Front Screen's port does not have to re-choose
them.

## Row one is a stated height, and the second line hangs out of it

The head is bottom-aligned in row one and carries a negative bottom margin of
exactly one subheading line, so its box ends after the **first** line and the
second hangs below it — into row two, whose top edge is therefore the second
line's top edge, at every window width and whatever set row one's height. That
one trick is what will make the Frame's occlusion exact rather than lucky: #139
takes a positive drop from that same edge and lands a fixed fraction of the way
down the letters. Nothing in the arithmetic goes through the head's total height,
the copy's height, or the row's.

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

## The masthead, the Cut Title, and why this is a relationship

The word **PROJECTS** is drawn twice on the live page and appears once: in the
one-screen band the Cut Title — the word cut as a picture at the Front Screen's
foot — stands in this masthead's slot, and the masthead goes `visibility: hidden`
underneath it. The word does not fly down to the Section; **the Section comes up
to the word.**

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

**#136 is where the other half lands.** The Cut Title is the Front Screen's, and
a Section may read the Kernel and nothing else, so the two Sections cannot read
each other's Tokens: whichever ticket lands the word has to decide how this
length crosses — most likely by the Kernel publishing it, which is a decision
rather than a convenience and is not made here on a guess. What #138 owes it is a
named relationship rather than a number, and that is what these two are.

## The palette crosses; it does not switch

The five `-far` Tokens are what the Section **is** once the page has turned, and
they are the same in both themes: the theme toggle chooses what the Panel crosses
*from*, and nothing about where it ends up. The read halves are `color-mix`es
against the Kernel's `--ground`, `--ink` and `--ink-soft`, weighted by `--turn`,
so at the top of the page the Panel is as light as the page above it and it
arrives black. The near end and the far end cannot share a name — a custom
property that reads itself is a cycle and drops to unset — which is why there are
ten declarations rather than five.

`--projects-panel-rule-near` is the one value here that is not the live sheet's.
Its near end there is `--rule-soft`, the CV's own hairline, and the Kernel
publishes no hairline colour; it is stated as a share of `--ink-soft` until the
Front Screen's port brings one.

Two divergences from the live page, both deliberate:

- **The crossing is not gated.** The live sheet only crosses inside its
  one-screen band and paints the flat far end below it. That gate is about the
  band, not about the Panel, and `/next`'s Turn is a Kernel property of the page
  at every width.
- **`data-turn` is not on this Section.** The crossing happens across the scroll
  of the Section *above* this one — that is where the reader is while it happens
  — and the Panel is where it arrives. Today that is the stub; when #136 lands
  the Front Screen the mark moves there. Marking this Section instead would also
  give the Turn a zero-length scroll to run in, because the Panel's own height is
  one screen.

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
the Rail turned across the top, then the masthead, the copy, and the points.

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

## What #139 and #140 take out of this file

Both land here, and both have a hole named for them:

- **Row two's right-hand side is empty.** The stage is `2 / 3 / 3 / 13` on the
  live page — nine columns of twelve for the Frame, with the Plinth a column
  wider on the left — and the row exists at the right height already, because
  `--projects-panel-fit` counts both.
- **The hanging second line is un-occluded.** The head's negative margin already
  puts row two's top edge on that line's top edge; the Frame's drop is measured
  from there.
- **The stacked order changes.** #70 asks for masthead, copy, Frame, points, and
  the points are at `grid-row: 3` here only because there are three blocks. The
  Frame takes row 3 and the points move to row 4.
- **The Panel's own motion is nobody's yet.** The live page's exit treatments —
  the text lifting, the Frame receding, the Plinth sinking, mixable, five numbers
  each — are what the rework session chooses between, and Variants are the shape
  that choice now has.

Two more things the live page does that are **not** ported, and neither is an
omission here: the Effect Stack's `data-fx-no-text` lift, which keeps the print
off the Section's type, has no mechanism in the Kernel yet and would be the
Kernel's to add; and the print stylesheet hides the Panel outright, which belongs
with whichever ticket gives `/next` a print sheet.

## Where this does not match the live page yet, measured

Three differences, all of them consequences of what has not landed rather than
choices made here. The numbers are off `/next` and `/portfolio` served from the
same `dist/`, at 1440×900.

**The drawing is short, and it floats.** The composition measures 370px tall here
against the live page's 720, because rows one and two are the masthead, the copy
and the points and nothing else. `--projects-panel-fit` already counts the Frame
and the Plinth, so the *width* is right and the height fills in when #139 and
#140 arrive; until then `align-self: center` puts the short drawing in the middle
of the screen instead of hanging it off the top.

**This is the base regime, not the landing.** The live page at 1440×900 is inside
its one-screen band, where the Cut Title stands in the masthead's slot — and that
regime re-solves two of the numbers here: the Rail leaves the grid to stand in the
page's own margin (so the width branch loses the 0.972), and the fit constant is
re-derived to 0.5603 for the height the Section gives up to the landing. The
masthead comes out 76.42px there against 74.28px here, 2.9% larger, and the Rail
stands at x 0..81 rather than inside the composition at x 81..96. **Neither is
portable without the Cut Title**, which is #136's, and both are one block of
overrides when it lands. Everything else agrees: the type scale, the two-row
grid, the hanging second line, the copy at four lines, and the Rail's 10px floor.

**Below 1100px the two are the same drawing.** The stack was compared at 390×844
and every size matches to the pixel — masthead 46.8, subheading 29.25, copy 14.82,
Rail 11.31 — and the copy and the figures break on the same words.
