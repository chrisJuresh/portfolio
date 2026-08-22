# The Front Screen

The Section at the top of the Portfolio: masthead, bio, work, education,
contact, the theme toggle, and the Cut Title at its foot, fitted to exactly one
screen. Ported from `portfolio/index.html` and `portfolio/styles.css` at
`d560e8b`, where it had been arrived at by looking at it rather than by
describing it — so the composition is not up for reconsideration here, only its
expression.

Read this before changing anything behavioural. A wording change, a size, a gap
or a colour is a Token or a Content edit and needs none of it.

## The folder

The Section convention is `src/sections/stub/NOTES.md`. Two files here are beyond
it:

| file                     | what it is                                                     |
| ------------------------ | -------------------------------------------------------------- |
| `theme-toggle.ts`        | the switch's behaviour, mounted from the component's `<script>` |
| `assets/cut-title.svg`   | the Cut Title's word, as one baked outline                      |

`theme-toggle.ts` is not `timeline.ts` and the split is deliberate: the Timeline
is motion, and the toggle is a control. It is mounted from the component rather
than by the loader because a control has to answer the first click, and the
loader runs on approach.

The photograph strip is the other way round and that is the same rule read from
the other end: it is a control *and* it is the Section's motion, and both are in
`timeline.ts` because the Timeline is what the gestures move. There is nothing for
a second file to own — no gesture here does anything except set a progress.

## Which numbers are Tokens, and which are not

ADR 0004 asks for anything the author will plausibly adjust to be a Token, and
choosing which is part of the work. The split here is by **who is entitled to
change the number**, and it puts three kinds of value in three places.

**`tokens.css` — the author's.** Measures, the φ ladder, every type size and
tracking, the two mixed colours, the switch's pill, the durations, and
`--front-screen-cut-show`. `--front-screen-cut-show` is in here because the live
sheet argued it out as a judgement — how much of the word survives the cut, as a
fraction of the cap — and it is the one number about the Cut Title that is taste.
Every Token can be set to anything without failing a Check; that is asserted
rather than hoped (see below).

The strip adds three groups to it — the photograph's shape and the air between
two of them, the dissolve's eight numbers and three durations, and the nine
numbers that are how the roll FEELS. That last group is read by `timeline.ts` and
by nothing in CSS, which is the one case where a Token is not a CSS value; the
stub's `NOTES.md` sets that precedent and the reason here is stronger than usual.
#137 says "preserve how it feels; the author judges that", and a judgement made by
spinning the thing needs the numbers to be draggable. They are read per gesture
rather than once at mount for the same reason.

**The component's `<style>` — measurements, not choices.** Four of these, plus
three the strip added (`--front-screen-edge`, `--front-screen-fade-bend`, and the
two stand-ins the Timeline overwrites — see **The photographs** below):

| constant                          | what it measures                                                |
| --------------------------------- | --------------------------------------------------------------- |
| `--front-screen-cut-cap-share`    | cap height per unit of the drawing's width                       |
| `--front-screen-cut-overshoot`    | ink standing above the cap line, same units                      |
| `--front-screen-half-leading`     | the name's half-leading, as a fraction of its own size           |
| `--front-screen-contact-tail`     | how far the switch hangs below the last contact line's baseline  |

The first two are properties of `assets/cut-title.svg` and are printed by
`design/cut-title/build-cut-title.py`. **Re-bake and re-paste them with the
file**, never nudge them: they are what a rasteriser would have been handed. The
second two are measured off the faces. Dragging any of the four does not change a
size, it makes an alignment wrong — which is exactly why they are not in the file
the Editor writes.

The drawing's **proportion** is not in this list, and used to be: the live sheet
restates the viewBox as `--cue-ratio` so the box has a height before the SVG is
parsed, with a note that the two must agree. Here the `<svg>` carries `width` and
`height` attributes taken from its own viewBox, so the intrinsic ratio is in the
markup, the box has its height at first layout for the same reason, and there is
one number rather than two that have to agree.

**`tokens.css`, gated on the theme — a mechanical exception.** One rule,
`:root[data-theme='dark'] .front-screen`, carrying where the switch's thumb
stands and which of its two words is on screen. Neither is a value the Editor
wants. They are in that file because it is the Section's only stylesheet the
compiler does **not** narrow: Astro rewrites every compound of a scoped rule with
this component's own attribute, `<html>` does not carry it, so `:root[…]` in the
`<style>` block matches nothing at all — silently. That is the whole reason, and
the alternative was worse: driving them off the switch's own `aria-checked`
leaves the pill on the wrong side and the wrong word on screen until a script has
run, where the Shell has already written `data-theme` before the first paint.

The Editor does draw a control for each of the three, because it discovers Tokens
rather than being handed a list of them, and a rule it did not expect is not a
reason to hide one. They are grouped under that selector's own name, so what the
author is looking at is which paper the value belongs to.

## Composing to one screen

The band is `min-width: 1100px and min-height: 700px`, the same gate the live
sheet uses. Both halves are real limits. Composing to one screen is a desktop
conceit — a narrow window is a scrolling column, which is what phones get anyway
— and below 700px of height the type alone fills the screen, so the rule switches
off and the page scrolls.

Inside the band the Section is exactly `--fold` tall and **the photographs' slot
is the remainder**: it is a flex item with `flex: 1 1 auto` and a ceiling, and
everything else in the column is `flex: none`. So the arithmetic is done by
layout.

**That is the one real divergence from the live sheet's mechanism, and it is
deliberate.** There, the remainder is computed in CSS from `--cv-static` — a
measured constant standing for "everything on the page that is not the strip",
with a comment asking whoever changes the ladder to re-measure it and a note that
being out of date makes the composition overflow a little or fall a little short.
It is a wish, in ADR 0006's sense. Here nothing measures anything: the column's
foot meets the Cut Title's cap top because the Section's bottom padding *is*
`--front-screen-cut-gap + --front-screen-cut-clip`, and the two agree by
construction at every size. Adding a paragraph to the bio cannot silently break
the budget; it can only make the slot smaller.

**Past the slot's ceiling the leftover is split at both ends**, by
`justify-content: center` on the column. Below the ceiling the slot has taken
every pixel of the free space and there is nothing left to distribute, so the
same declaration is inert — no breakpoint, no second regime. What it buys is the
page's one vertical rhyme: the white above the name and the white below the last
contact line stay the same measure at 1440px of height and at 2160. Handing the
leftover to the gap alone would put 234px under the contact block against 104px
over the name.

**The rhyme is measured to the ink at both ends, not to the boxes.** The name's
line box stands `--front-screen-half-leading` above its own ascenders, and the
switch in the last row hangs `--front-screen-contact-tail` below the ink the eye
reads as the bottom of the column. `--front-screen-cut-gap` is
`rhyme + half-leading − tail` for exactly that reason, and dropping either
correction drifts the two margins about three pixels apart — which is a Check.

## The photographs

The strip, its dissolve and its motion, ported from `portfolio/app.js` and
`portfolio/styles.css`. `timeline.ts`'s own header carries the motion — what the
Timeline's progress means, and the closed form the per-frame friction loop became
— and is the thing to read before changing how the strip moves. What is here is
the composition around it.

### The bleed and the inset agree by construction

The strip runs edge to edge so a photograph can travel off both sides of the page,
and the first and last photographs still stand on the text column's own edges.
That is two lengths that have to be the same, and the live sheet writes them as
two separate expressions in `vw` — a full-bleed margin of `50% - 50vw` and a
padding of `max(--page-side, 50vw - --col / 2)`.

Both overshoot, by half a vertical scrollbar each, because `vw` counts a scrollbar
the layout does not get. Here the margin is the same `calc(50% - 50vw)` and the
inset is `max(side, 50% - measure / 2)` — a percentage of the SAME box the margin
took out to 100vw. So whatever `vw` does to one it does to the other and it
cancels: the first photograph's left edge lands on the column's left edge exactly,
at every window width, scrollbar or no scrollbar. Both ends are a Check.

What the bleed costs is half a scrollbar of horizontal overflow at each end, and
the answer to that is one declaration in the Kernel — `html { overflow-x: clip }`.
It is there and not here for the reason it always is: a Section may not write a
global rule, and "the document never scrolls sideways" is a fact about the
document. `clip` and not `hidden`, so the axis cannot be scrolled by a stray focus.

### The track is out of flow, and that is what gives a photograph a height

A photograph's height is the slot's, so `height: 100%` is the obvious way to say
it — and inside the one-screen band it resolves to nothing. The strip is a flex
item whose height comes from the flex layout, so its own `height` computes to
`auto`, and a percentage height against an `auto` containing block behaves as
`auto` itself. The symptom is not a length that looks wrong, it is a 194px strip
with a 10px picture in it, which reads as a broken image. `position: absolute`
with `inset: 0` gives the track a definite height by construction and the
percentages below it resolve, in both regimes.

### `__track` was already taken

The theme switch's pill is `.front-screen__track`, and the strip's scroller was
called that too for one build. Astro's scoping does not help: both are this
component's, so the switch's own `width` and `height` landed on the scroller and
the scroller's `position` and `overflow` landed on the pill. The scroller is
`.front-screen__photos`. Worth knowing before adding any part named for a generic
mechanism — this Section already has a `__thumb`, a `__meta` and a `__line`.

### The dissolve is a mask, not a veil

It used to be two absolutely positioned divs carrying a gradient of the page
colour, and that is the obvious way to do it right up to the moment anything else
is behind the strip. The Kernel's corner plate is: it stands in the bottom-left
gutter, and the left-hand dissolve reaches into that same gutter, because the
photographs really do scroll out there and really do need covering. Paper painted
over the strip is paper painted over the plate, and no z-order fixes it — the
cover has to be above the photographs and the plate has to be below them, so
whatever sits between gets covered. A mask takes the strip's own pixels away
instead, so the photographs dissolve into whatever is actually behind them.

Eight Tokens describe it, four at each of its two ends, and the component mixes
between them on `--front-screen-fade-open`. Two of the values it reads are NOT
Tokens and are written by the Timeline:

* **`--front-screen-fade-open`** — where the strip is between its two rests, on a
  smoothstep. It is a function of where the strip IS and not of when it moved,
  which is why it runs backwards as smoothly as forwards.
* **`--front-screen-slide-w`** — the photograph's width, measured. This one cannot
  be derived: the dissolve's reach and span are stated in photo-widths, and inside
  the band a photograph's height is the budget's remainder, which is a layout
  result CSS has no way to read back. The component declares what it would be at
  the slot's ceiling so the strip is dressed before any script runs, and the
  Timeline corrects it.

**The two `@property` registrations are the one global thing this Section
writes**, and that is a decision rather than an oversight. A custom property has
to be registered to be transitioned, and registration is document-scoped by
specification — Astro scopes selectors and an at-rule has none, so scoping does
not reach it and `check-source.mjs` does not catch it either. The Kernel is where
a Section's global would normally go, and `ground.css`'s `@property --turn` is the
precedent; these two are here instead because they are this Section's numbers and
the Kernel owning a Section's Tokens is the worse trade. What makes it safe is the
naming rule the Editor's file is already held to: `--front-screen-…`, so nothing
registered here can collide with, or inherit into, anything that is not this
Section's. A Section wanting to register a property it does NOT own wants it in
the Kernel.

`--front-screen-fade-bend` is in the component's `<style>` and not in `tokens.css`
because it is a derivation and not a taste: a colour-stop hint at a quarter of the
ramp's width is the linear case, and 0.25 + 0.1036 is the power-of-two ease that
matches a smoothstep. `--front-screen-fade-ease` slides between the two.

**The reduced-motion answer zeroes the three duration Tokens rather than writing
`transition: none`.** Three rules further down the sheet set `transition-duration`
on its own — the cramped strip and the two ways a reader asks to see the
photographs — and every one of them is later than the media block, so a shorthand
there is overwritten by whichever applies and the ramp comes back at 0.4s for a
reader who is merely hovering. That is a Check.

### The strip's own scrollbar

`.front-screen__bar`, in the text column rather than across the bleed: it says
where the reader is in fifty-three photographs, which is a fact about the column's
worth of them. Its thumb's width and offset are the Timeline's, for the same
reason everything else here is — both are functions of where the strip is.

It is `aria-hidden`, because the track it reports on is already a named region a
reader reaches and operates. It is also a box in the one-screen column, so it
spends two pixels and a gap of the budget; the strip absorbs that, as it absorbs
everything else.

### The resting places, and why neither end is stated

The first photograph rests at progress 0 and every other one rests centred,
clamped to the travel. That clamp is the whole of why the LAST photograph is
right-aligned with the text rather than centred: its centre lies past the end of
the travel, so the clamp stands it on the edge. One mechanism produces both ends,
which is exactly why losing it is easy and invisible — and both ends are asserted.

Centred on the STRIP's own middle and not the window's. The live page uses
`innerWidth / 2`, which on a page with a vertical scrollbar is half a scrollbar to
the right of the strip's centre — the same overshoot the bleed has, read one
mechanism later.

### The wheel arbitration is non-passive, and that is load-bearing

A wheel gesture belongs to whatever it began on and keeps it until the wheel
stops, which is what stops the strip hijacking a page scroll half way through. The
listener that decides this is on the document, in the capture phase, and prevents
nothing — and it has to be `passive: false` anyway.

A passive wheel listener lets Chromium scroll on the compositor and deliver the
event to the main thread afterwards, so the target has been hit-tested against a
page that has already moved. Measured: one notch with the pointer over the
masthead arrived with `window.scrollY` already at 120 and its target already an
`<img>` in the strip — because the strip had slid up under a pointer that was
nowhere near it when the scroll started. So the passive version prevented exactly
the hijack it exists to prevent, on the first notch of every page scroll begun
near the strip. The cost of the fix is that no wheel on this page is fast-pathed,
which is what the live page has always paid for the same arbitration.

### What is not ported

**Touch stays native**, as it does on the live page: the browser scrolls the
track and the Timeline adopts the result, so it goes on being the authority on
where the strip is. Home, End and the page keys arrive the same way.

**The `.veil` divs are gone rather than hidden.** The live page still writes them
and the sheet still hides them; nothing here reads them, so nothing here writes
them.

## The Cut Title

Three boxes, each doing one job: `.front-screen__cut` is the container the
drawing's size is a proportion of, its `<a>` is the cut, and the `<svg>` is the
word. The container has to be a separate element because container query units
resolve against an ancestor, so a box cannot set its own width from its own
width.

**The word is a picture, and that is the whole reason the text beside it exists.**
It is PROJECTS in Friz Quadrata, baked to a single outline by
`design/cut-title/build-cut-title.py` — no `@font-face`, no family named, no cut
of the typeface anywhere in what this site serves. Vector, so it is exact at any
size on any display. What it costs is that the word cannot be read, selected or
indexed, and `.front-screen__cut-text` is what a screen reader announces and a
crawler reads instead. Losing that span makes the link nameless and nothing on
screen changes, so it is a Check.

**The cut is taken from the cap line, not from the drawing's top edge.** The round
letters overshoot: the O tops out above the cap of the P and the R, and the
picture's box is its ink, so its top edge is the O's. The drawing is lifted by
exactly `--front-screen-cut-overshoot` of its own width so the *cap* line lands
on the cut box's top edge. Drop the lift and every letter is cut two and a half
per cent of a capital too high — invisible unless the two are put side by side,
so it is a Check.

The lift is a **relative offset** and not a negative margin, and that is not a
preference. In the band the link runs `overflow: visible` and so is no longer a
block formatting context; a margin would collapse into the link's own and the
correction would vanish.

**Two regimes, and they differ in what the word is fitted to.**

- *In flow*, outside the band, the word is the last line of the column and is
  fitted to the **advance box** a line of type would have carried:
  `--front-screen-cut-ink` is `97.7592cqw` and `--front-screen-cut-lead` is the
  P's left sidebearing. The picture's box is its ink, so it has to be inset by
  exactly the white that box used to carry or the word sits wider than every line
  above it. The link clips: the document ends beneath the word and the rest of the
  letters have nowhere to stand.
- *In the band*, the word leaves the column and stands on the page's own margin
  in the bottom-left corner, fitted to its **ink**: `100cqw`, lead zero. Fitting
  the advance box here would put the ink a bearing's width off the margin it is
  set to. The clip comes off — the bottom of the window does the cutting, and the
  J's hook and the baseline stand on the screen below.

The J is worth restating because it survived the change of medium: in this face
the J descends below the baseline, and the cut box is the cap slab, so no value
of `--front-screen-cut-show` reaches the hook. Cut, the word reads `PRO|ECTS`. It
comes back whole in the band, where the descender has somewhere to hang. That is
a property of the drawing, not a number to tune.

**What is not ported: the word's measure is the column's, not the Panel
masthead's.** On the live page the word's cap height *is*
`--panel-masthead-size`'s cap, so that the same word at the same size is cut by
the fold on the first screen and printed as the Projects Panel's masthead on the
second. There is no Panel on `/next` yet. `--front-screen-cut-fit` is the left
gutter here — the page's margin on both sides of it, which is what the live sheet
did before that relationship existed — and **#138 re-points it at the masthead**,
which is what that ticket means by preserving the relationship as a relationship.
The two snap ports and the landing go with it: they are properties of the page
turn between two Sections rather than of this one, and there is no second Section
to turn to.

## The two links point at a fragment nothing answers yet

The masthead's `Projects` and the Cut Title are one destination and it is Content:
`#projects`, a fragment on this same document, which is what they are on the live
page. The Panel is on the page now, but it carries no such id — its `data-section`
is its handle — so both links are inert: a click leaves the reader where they are.
It is one Content field and one id, so connecting them is a line each, and it
belongs with the landing below rather than on its own.

## The Turn is marked nowhere, and that is the answer rather than an omission

`data-turn` is not on this Section, and the reason is a trap worth stating. The
Kernel spans the crossing from the marked element's `top top` to its `bottom
bottom`; on a Section exactly one screen tall those are **the same scroll
position**. GSAP does not report that as an error — it reports 0 at the top of the
page and 1 one pixel later, so the page still opens on paper and the only symptom
is that the Turn is a flip rather than a crossing. Nobody would notice which. The
Panel is one screen too, so marking either of them is the same mistake.

With nothing marked the Kernel spans the document's whole scroll, and with two
Sections of one screen each **that scroll IS the page turn** — which is exactly
the crossing the live page makes. So the right answer is the Kernel's own default.
It stops being the right answer the moment a third Section lands, and what says so
is a Check: the crossing has to take at least half a screen of scroll, and it
would still take a screen's worth spread over three.

The Cut Title crosses with everything else because it reads `--ink`, and `--ink`
is itself the mix.

## What the landing still needs, and why it is not here

On the live page the word PROJECTS is drawn twice and appears once. In the
one-screen band the Cut Title stands in the Panel masthead's slot and
`.panel-masthead` goes `visibility: hidden` underneath it — the word does not fly
down, the Section comes up to meet it. Outside that band the live page shows both,
which is worth knowing before reading the current state as a bug.

**That landing is not built, and it is blocked on a decision rather than on work.**
The word has to be cut to the Panel masthead's cap, and #138 left that as a named
relationship — `--projects-panel-masthead-cap` — with the observation that a
Section may read the Kernel and nothing else, so the two Sections cannot read each
other's Tokens. How that length crosses is a Kernel question (most likely the
Kernel owning the measure both Sections share, since CONTEXT.md makes the Kernel
the only thing permitted to cross a Section boundary), and #138 declined to guess
at it. Guessing here would be the same mistake one file later.

So until it is decided, this Section does the one thing that keeps the page honest
rather than half-landed: **the cut stays clipped by its own box inside the band as
well as outside it.** One line in the band's block, marked. Letting the tail hang
past the fold is only right when the masthead it lands on has gone invisible; with
that masthead still drawing the same word, a hanging tail would cross it. Clipped,
the two words stand apart — which is the live page's own behaviour at every size
outside the band.

What the landing needs, when it is taken:

- the cross-Section cap length, however the Kernel comes to publish it
- the two snap ports and `scroll-snap-type: y mandatory`, which are global rules
  and therefore the Kernel's or the Shell's, not a Section's
- `.projects-panel__masthead` going `visibility: hidden` in the band, and keeping
  its box: it is row one's stated height, it is what the subheading's second line
  hangs off, and it is the slot the word occupies
- the Panel's two re-solved numbers, which #138 derived and parked: the Rail
  standing in the page's own margin, and the fit constant at 0.5603
- deleting the line in the band's block that keeps the clip on
- `#projects` becoming an id something answers

## Keeping the paper and the halftone off the type

The Shell lights `paper` and `halftone` by default, and both would otherwise
print straight through the glyphs — which does not read as a bug, it reads as the
layers' strengths being too high, and `src/kernel/NOTES.md` records that mistaking
one for the other is a day spent tuning the wrong numbers.

The way out is paint order and not a hole: the type is lifted **above** those two
layers, so the glyphs come out untouched while the paper around them still takes
the texture. A mask would have cut a rectangle across the page. The Effect Stack's
layers carry even z-indexes precisely so excluded content has an odd one to stand
on between any two of them, and `--front-screen-type-z` is 5 — above `paper` (2)
and `halftone` (4), below everything else, so lighting the film still reaches the
type, which is what the live page does too.

The lift is on the four type blocks and not on the column, because the column also
holds the photographs' slot and the two are separately excluded — lifting the
column would carry the strip with it. **The Cut Title takes the number and never
`position`**: it is `absolute` in the band, and a `relative` written by a later
rule would move it out of the corner rather than lift it out of the stack. That
mistake has already been made once on the live page.

The live page computed this number in script, off the layers themselves. This
Section states it, so what keeps the statement honest is a Check that reads the two
layers' own z-indexes back and compares — the Kernel renumbering its stack would
otherwise un-lift the type in silence.

## The reveal

A CSS animation on the Section, with `backwards` fill, and both halves matter.

An animation rather than a class a script toggles, so the worst case is not a
blank page: a parse error, a dead network or scripting off all end with the
keyframes finished and the composition up. Nothing in a Section may be the only
thing standing between the reader and the words.

`backwards` and not `both`, because a forward fill holds the last keyframe for
ever and the last keyframe says `transform: none` — which computes not to the
keyword but to the identity matrix, and any transform makes an element a stacking
context. Permanently a stacking context, this Section would seal the Cut Title's
tail inside itself instead of letting it stand over the Section below.

## The switch

`role="switch"`, one accessible name, and the state in `aria-checked`. This is a
small correction to the live page, which changes the name as well — a switch's
label does not change when it is thrown, and the state is what `aria-checked` is
for. The visible word and the pill's position are the stylesheet's, so both are
right at first paint; `theme-toggle.ts` writes `aria-checked` and nothing else,
following the theme however it changed, including the system preference the Kernel
follows until the reader has chosen.

## What is deliberately not here yet

**The landing** — see the section above. It is the one piece of this Section's
composition that is not here, and it is blocked on a Kernel decision #138
deliberately did not make.

**The page's own type scale is now in the Kernel, and it is not a Section's.**
#137 needed it, for the reason the live sheet gives: the strip is the one-screen
budget's remainder, and at the reader's own 16px the remainder falls to 194px at
1440x900 and 27px at 1440x700 — below which a photograph is not a photograph of
anything. A floor on the remainder is a budget that can overflow, so the floor is
paid for by the type giving way instead. `src/kernel/faces.css` carries it and
says why the Kernel is the only place it could go.

Two things about it are worth knowing from here. `--type-scale` is MEASURED and
not derived, because the derivation the live sheet does needs `--cv-static` —
"everything on the page that is not the strip", the one measured constant this
Section exists to have deleted. And its media query is a second copy of this
Section's band, which has to be kept in step with the one in `FrontScreen.astro`;
what catches them drifting is `carousel` measuring at the band's own short corner.

The floor itself is `--front-screen-strip-min`, and it is applied OUTSIDE the band
— where the strip is a stated height and the page scrolls, so a floor costs
nothing — and not inside it, where the slot is the remainder. Inside the band it
is what the Check holds the type scale to instead.

**The `plate-wait` hold.** The live page holds the reveal for up to 1.5s while the
corner pictures arrive, because the type is printed *on* the plate and type
arriving first is worse than either. `src/kernel/NOTES.md` parks it as belonging
to this Section's composition, and it is still parked: the hold needs the Kernel to
say when the pictures are outstanding, and `mountCorners()` exposes no such
signal. Whichever ticket adds one should add the hold in the same change.

## The Checks

`scripts/checks/checks/front-screen.mjs`. Every assertion in it is either a
relationship between two things that have to stay equal or a fact about the
markup, and none of them is a number anybody chose. Every one was a paragraph in
`portfolio/styles.css` saying "do not break this".

It measures at **two** windows, and the second is not padding: the mechanism that
keeps the two margins equal on a tall screen is inert at every ordinary desktop
height, so a Check that only ever looked at 1440x900 would pass with that
mechanism deleted.

`scripts/checks/checks/carousel.mjs` is the strip's, and it measures at the band's
SHORT corner for the mirror-image reason: that is where the remainder runs out, and
it is the only window in the suite that holds the Kernel's type scale to anything.
The same rule applies to it — every assertion is a relationship, and every one has
been shown to fail when the thing it guards is removed:

| taken away                                            | what it said                                          |
| ----------------------------------------------------- | ----------------------------------------------------- |
| the Timeline's write of `scrollLeft`                   | the position at four moments, and both ends           |
| the track's inset                                      | both ends have come off the column                    |
| the focus ring, as `outline: none`                     | the strip takes focus and draws no ring               |
| the reduced-motion durations                           | the dissolve still ramps over 0.4s                    |
| the dissolve's write of `--front-screen-fade-open`     | it never opens across five moments                    |
| what an arrow key does                                 | the key does not move it, nothing lands centred, and reduced motion cannot operate it |
| the Kernel's type scale                                | the slot at both windows, against the floor Token     |
| a photograph's alt text, and the same as its filename  | which photograph, by src                              |

...and to pass with `--front-screen-fade-span` at 0.2, the settle at 0.05s, the gap
at 2rem and the floor at 10rem.

Every assertion has been shown to fail when the thing it guards is removed, and
to pass when a Token is set to something else — including
`--front-screen-cut-show` at 1 and at 0.4, a wider column, larger body type, a
tighter margin and a shorter photo slot. A blocking Check that fires on a
legitimate change is the one thing this suite may not do.
