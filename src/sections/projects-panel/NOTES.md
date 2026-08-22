# The Projects Panel

The dark Section presenting one project at a time. This folder holds the Rail,
the masthead and its two authored lines, the copy and the engineering points, and
the **Frame** — the browser window with the glass titlebar that the recording
stands inside. **The Plinth is #140's**, and it lands in this same folder; the
holes it leaves are named below so it does not have to re-derive what the
composition already assumes about it.

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

## What #140 takes out of this file

- **The stage's left column is empty.** The stage is `2 / 3 / 3 / 13` — ten
  columns of twelve, against the Frame's nine — and the Frame is indented one
  column and one gutter inside it. That column is the Plinth's overhang, and it
  is the whole reason the stage is a box at all rather than the Frame sitting in
  the grid directly: the slab has to hang off the Frame's **foot**, which is a
  length the grid knows and no sibling of the Frame could ask for.
- **The Plinth's three depths are shares of the FRAME's width**, not of the
  composition's, and nothing here states that length any more. It was stated for
  one line and one line only — the window's corner radius — and that turned out
  to be better expressed as a percentage of the Frame's own box (below), so
  re-deriving it from the composition went with it. #140 wants
  `calc((9 * var(--projects-panel-column) + 8 * var(--projects-panel-gutter-share)) *
  var(--projects-panel-w))`, which is nine columns and the eight gutters inside
  them, and should know that it over-states the laid-out Frame by whatever the
  Rail's floor costs the composition — 3px at 1440x900. That is why the corner
  does not use it.
- **`--projects-panel-fit` already counts the Plinth** and is untouched by this
  ticket. Three of its four terms are now on the page; the fourth is the slab.
- **The reflection is a second Frame**, and `glass.ts` is already arranged for it:
  the material is rendered once and blitted onto every other `.projects-panel__bar`
  the page turns out to hold, which today is none. A clone brings its own canvas
  with it — the canvas is in the markup here rather than created in script — so
  #140 does not have to insert one.
- **The Panel's own motion is nobody's yet.** The live page's exit treatments —
  the text lifting, the Frame receding, the Plinth sinking, mixable, five numbers
  each — are what the rework session chooses between, and Variants are the shape
  that choice now has.

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
| content inset    | —        | 0.816% |
| lights           | 2.04% (first), 1.52% pitch | 0.95% |
| sidebar toggle   | 8.00%    | 1.41% |
| back / forward   | 10.66% / 12.95% | 0.54% |
| address field    | 50.19%   | 39.45% wide, 2.07% tall |
| reload           | 69.15%   | 0.87% |
| share            | 92.22%   | 1.20% |
| new tab          | 94.91%   | 1.03% |
| tabs             | 97.52%   | 1.36% |

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

- **The rim is an inset ring, not a `border`.** A border takes a pixel off the
  inside of every child's box and puts the window's own edge *inside* the
  titlebar, a pixel in from where the glass draws its own — two rims a pixel apart
  down each end. A ring paints over the fill and costs the layout nothing.
- **The titlebar draws no rim of its own, and that is why its fill is
  translucent.** The Frame's ring already runs round the whole window and shows
  through at this alpha, so the outline stays continuous across the strip. A second
  ring there puts two on the same pixel and measures 150 of 255 along the top edge
  against the render's 66.
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

And the content box: **inset on three sides and flush at the top**. The render is
explicit about it — down the left side the outer rim is followed by the Frame's
own fill before the picture starts, and the right edge measures the same, while
the picture begins exactly where the titlebar ends. So the box is not concentric
with the window, and its two top corners are rounded against a straight titlebar
above them. That notch is in the render and is not an artefact.

The chrome is **inert, and it is said twice**: `pointer-events: none` on the row,
and not one element in it is a button, a link or anything with a `tabindex`. The
Frame is not a link because the photos site binds to loopback and there is nowhere
to send anyone — and making any of it live later is a change of element and of
nothing else, because every length is measured from a glyph's centre and no rule
depends on what kind of element carries it.

### The material, and the three rungs

`glass.ts` is the port of the live page's `frame-glass.js`: four WebGL2 passes
rendered once into a canvas the size of the titlebar. The shaders and #66's
settled parameters come across unchanged, including the one line of the fragment
shader that is **not** upstream's — the rim gain, divided by the canvas height it
was settled at, without which a strip 32px tall gets sixteen times the rim it
should and the corners go out of gamut and black.

The ladder is the cascade and not a chain of `if`s: a flat translucent fill, a
blurred one with two rims behind `@supports`, and the canvas on top of both when
the shader has actually drawn. `data-glass` is written from what the page
resolved rather than from what the browser claims, and it is what shows the
canvas as well as what turns the two rungs below off — one answer deciding both.

All three were driven and read back at 1440x900, with the upper rungs suppressed
in the harness rather than predicted:

| rung  | canvas | fill | backdrop-filter | rims |
| ----- | ------ | ---- | --------------- | ---- |
| webgl | shown  | none | none            | none |
| blur  | hidden | #fab2ff at 0.108 | blur(4.63px) | 0.106 / 0.133 / 0.133 |
| flat  | hidden | #fab2ff at 0.108 | none         | 0.106 / 0.133 / 0.133 |

and the shader's own picture reads back identical to the live page's, to the
integer, at all four places #66 measured: body (44,38,49), top rim (68,62,72),
both ends (93,86,102).

Two of those numbers are relationships here where the live sheet has constants.
**The flat rung's fill is #66's tint** — `#fab2ff` at its own 0.135 times the 0.8
the shader multiplies it by — so the tint is declared once, as a Token, and the
shader reads it back off the Frame instead of carrying a second copy. And **the
blurred rung's two rims composite**, so the second one's alpha is solved out of
the pair: the render's side rims measure 0.222 in total and its top rim 0.104, and
`(0.222 − 0.104) / (1 − 0.104)` is what the ends have to be painted at. Giving
them the measured total instead is the mistake of reading a measured sum as one
layer's share of it, and it puts the ends half again too bright.

**The bake carries what it was baked against.** The Panel's colours are all mixes
against `--turn`, so a canvas drawn at load and never revisited holds a near-white
titlebar under near-white chrome ink for the whole of the crossing. The bake is
keyed on the Turn quantised to sixteen steps plus the two colour Tokens the scene
is painted from, so a crossing costs at most sixteen renders of a thin strip and a
page at rest costs none. `data-theme` is watched alongside the root's `style`,
which the live page does not do: the Frame's *near* end is the page's own paper,
so a theme flip before the crossing has finished moves the backdrop without
touching `style`. Past the crossing both themes arrive at the same far end, which
is why the omission has never shown.

**What is not ported, and none of it is an omission.** The live page's `marble`
and `clip` treatments of the backdrop and the `window.panelGlass` seam that
reaches them are for a tuner in `design/`, and #146 is the ticket that turns the
tuners into the Editor — a seam with no consumer is a second material that agrees
with the shipped one only while somebody keeps checking. The chrome's ink does not
cross with the Turn either, which is the live page's own arrangement: before the
crossing the Frame is a pane of the page's own paper and the glyphs on it are
nearly invisible. The reader is never there — the Panel is where the Turn arrives
— and re-deriving those five alphas against a moving ground is a change to the
Frame rather than a port of it.

### The canvas is in the markup, which the live page's is not

One forced divergence. Astro scopes a component's rules by narrowing every
compound in them, so a rule can only match an element the compiler saw — and a
canvas created at run time is not one. `frame-glass.js` inserts its canvas and an
unscoped `.frame-glass` rule styles it; here the canvas is written in the markup
and `glass.ts` fills it.

It is not a worse arrangement. The geometry stays in the stylesheet where the rest
of the Frame's is, `data-glass` hides the canvas until there is a picture in it —
which is also what takes it back down after a lost context — and #140's clone
arrives with a canvas of its own instead of needing one built by hand. What it
costs is one always-present element that is `display: none` on two of the three
rungs.

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
what a Check is worth. Twelve mutations, each applied on its own, rebuilt, and
reverted:

| broken | caught by |
| ------ | --------- |
| the sidebar's gap written back as `1.79cqw` | its centre, and both chevrons' with it |
| the window's corner in `cqw` | the window's and the titlebar's radii disagreeing |
| the content box inset on four sides | the recording no longer flush with the chrome |
| `@container` changed to `@media` | every glyph still drawn at 1440x450 |
| `z-index: 0` on the stage | the stage having become a stacking context |
| the head's negative bottom margin dropped | the drop into the second line |
| `aria-hidden` off the stage | the chrome back in the accessibility tree |
| a button added to the chrome | a focusable thing inside an aria-hidden subtree |
| the canvas hidden while the shader had drawn | the tier and the canvas disagreeing |
| the address field's height halved | its measured share |
| the reload placed at its own absolute centre | its clearance inside the field |
| the address field moved off the Frame's middle | its centre |

and three Token moves that must NOT fail, and do not: the sidebar's centre to
0.09, the drop to 0.4, the corner to 0.03.

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

**The Plinth, and nothing else.** The composition is 617.9px tall here against the
live page's 720.1. Adding the Plinth's own 0.0869 of the Frame's width brings it
to 698.3, and the live page's 720.1 scaled to this composition's width is 698.1 —
the same drawing to two tenths of a pixel. The width divergence behind that
scaling is the one #138 already records: the live page at this window is inside
its one-screen band, where the Rail leaves the grid and the fit constant is
re-derived, and neither is portable without the Cut Title.

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
with whichever ticket gives `/next` a print sheet.

## Where this does not match the live page yet, measured

Three differences, all of them consequences of what has not landed rather than
choices made here. The numbers are off `/next` and `/portfolio` served from the
same `dist/`, at 1440×900.

**The drawing is short by exactly the Plinth, and it floats.** The composition
measures 617.9px tall here against the live page's 720.1 — see the Frame's own
section above, which measures what the missing slab accounts for.
`--projects-panel-fit` already counts it, so the *width* is right and the height
fills in when #140 arrives; until then `align-self: center` puts the short drawing
in the middle of the screen instead of hanging it off the top.

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
