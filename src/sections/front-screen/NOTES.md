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

**The component's `<style>` — measurements, not choices.** Four of these:

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
page. Nothing on `/next` carries that id until #138 lands the Panel, so both are
inert — a click leaves the reader where they are, which is the honest state for a
link to a Section that does not exist. It is one Content field, so that ticket
changes one line. Nothing fetches a fragment, so no Check sees it.

## The Turn crosses at this Section's foot, and is not marked here

`data-turn` is not on the Front Screen, and this is the trap. The Kernel spans the
crossing from the marked element's `top top` to its `bottom bottom`; on a Section
that is exactly one screen tall those are **the same scroll position**. GSAP does
not report that as an error — it reports 0 at the top of the page and 1 one pixel
later, so the page still opens on paper and the only symptom is that the Turn is a
flip rather than a crossing. Nobody would notice which.

So the crossing spans the Section *after* this one, which begins at this one's
foot, and the Cut Title crosses with everything else because it reads `--ink` and
`--ink` is itself the mix. When the Panel lands, `data-turn` goes on it. The Check
asserts the crossing takes at least half a screen of scroll, which is what
actually breaks.

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

**The photo carousel — #137.** Its slot is held open and is what the one-screen
budget spends its remainder on, so that ticket is a drop-in rather than a
re-layout.

**The page's own type scale, and this is the visible consequence.** The live sheet
scales the root `font-size` inside the band, and it does so for exactly one
reason: the photo strip has a floor of 15rem, below which a photograph is not a
photograph of anything, so on a short screen the type has to give instead. There
are no photographs here, the slot's floor is zero, and the composition fits every
height in the band with the type at the reader's own size. So the scale is absent
because the thing that needed it is absent. At 1440x900 that makes the type about
10% larger than the live page's. **#137 brings the floor back and the scale with
it**, and it cannot be ported here even if it were wanted: a Section may not write
a global rule, and the root's font-size is the most global rule there is.

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

Every assertion has been shown to fail when the thing it guards is removed, and
to pass when a Token is set to something else — including
`--front-screen-cut-show` at 1 and at 0.4, a wider column, larger body type, a
tighter margin and a shorter photo slot. A blocking Check that fires on a
legitimate change is the one thing this suite may not do.
