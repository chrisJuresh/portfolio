# The Eater Map Section

The Portfolio's third Section and its third resting place: the Showcase for the
Eater restaurant map. It is a text composition with an **Exploded View** beside
it — the captured Slab tilted under one camera, and the Eater app's own three
surfaces standing off its face, with a thin rule joining each numbered point to
the part it names, so that what a reader sees is the app taken to pieces and made
out of a picture and real text (#176, #177, #178) — and, below the band, the same
drawing lying flat and full-bleed with the four features as a list under it
(#179). #171 is the whole Showcase and two tickets under it are still open.

## What is here and what is not

Here: the Rail, a plain masthead, the two authored subheading lines, the copy,
the four numbered points, the Exploded View, the four leader lines that join the
one to the other, the **Lift** that assembles it, and the collapse that puts all
of it away below the band.

Not here: which of the two stages draws the Slab. #181 built the alternative —
the same Exploded View in WebGL, with a Slab that has thickness — and **#182 is
the judgement**, which takes the loser and its dependency out together. That the
stage is one boundary with two implementations behind it is what makes that
judgement cost a stage and not a Section.

**The markup rests in the RAISED state, and that inverts the obvious build.** The
Lift animates from flat *towards* raised, so the finished Exploded View is what a
reader whose scripts never arrived and a reader who asked for reduced motion each
get for nothing, and nothing in this Section is contingent on a script. The flat
state is not a step on the way here and not a fallback: it is `--eater-map-lift: 0`,
the frame the motion begins from, and it is still exactly the screenshot #176
built — the same Slab at the same size with the Cards at the same scale, to the
pixel, which is what the `eater-map` Check reads.

`timeline.ts` therefore exports the Lift, and the file used to say why it exported
nothing. Two things it recorded are worth keeping, because both are still true of
this repository:

**An EMPTY Timeline is not a placeholder for a Timeline.** #174 left one —
`gsap.timeline({ paused: true })` with nothing in it — on the reasoning that *an
empty Timeline is still a Timeline a Check can hold and seek*. **Both halves of
that are false**, and it survived only because the Section was on no page and so
registered nothing. Put on the page it failed `moments` twice, measured rather
than argued:

```
✗ eater-map: a moment does not survive a scroll — seeked to 0.25, and the page
  moving took it to 0.0000.
✗ eater-map: nothing moves between progress 0 and 1 — asked about
  [data-section="eater-map"].
```

The second is the expected one: a Timeline registered and wired to nothing scrubs
perfectly, animates no element, and nothing else on the page says so. **The first
is the one worth carrying**: a Timeline with no duration cannot be seeked to a
fraction at all — `progress(0.25)` reads back `0`, so it is not seekable in the
sense the seam means, and the failure reads as a broken `hold()`, which it is not.

And the choice is still *a Timeline that moves something or no default export at
all* — which is why `mountLift` returns nothing when the plane or the Cards are
not on the page, rather than registering one that would scrub over an empty stage.

## The plane, and the one piece of arithmetic it turns on

The stage is one box — `.eater-map__slab` — and everything in it is a share of
it. Its **height** is what row two of the composition has left, times
`--eater-map-slab-fill`; its **width** follows from the capture's own
proportion. So the phone is as big as the screen allows at every window in the
band and nothing has to be told a size: 220x476 at 1100x700, 283x612 at
1440x900, 478x1037 at 2560x1440.

The box is `container-type: inline-size`, which is the Frame's arrangement in the
Projects Panel, and it carries the Frame's trap with it: **an element is not its
own container**, so a `cqw` written on the Slab's own rule silently resolves
against the viewport. Every one in the component is on a descendant.

**The one piece of arithmetic:** the scale everything on the plane is drawn at is

```
the Slab's drawn width  /  the phone Eater was captured at
```

and getting it from anywhere else is the failure this whole Section is built
against. The Cards carry the app's own **frozen pixel sizes** — 366x48, 260x176,
390x366 at a 390px window (#174) — so a Card at any other scale is a Card
floating over a map of the wrong size, which is three stickers on a photograph
rather than one screenshot. It is a `transform` and never a width, because a
width would reflow another repository's interface.

**CSS cannot divide one length by another**, and that is the specification rather
than an engine's gap: `calc()` requires the right-hand side of a `/` to resolve
to a number. `tan(atan2(a, b))` **is** `a / b`, and it is the only way to get a
unitless ratio of two lengths in a stylesheet. The component uses it, and
`@supports` leaves a constant behind for an engine that has neither function.

**That constant is the reason the `eater-map` Check reads two windows.** At
1440x900 the fallback is 0.72 and the derived answer is 0.7185 — a third of a per
cent apart, so a Check run only at DESK passes with the derivation deleted.
Measured: at 1100x700 the derived answer is 0.5588 and the constant is still
0.72. Both mutations below have been made on purpose and both were caught.

| mutation | what failed |
| --- | --- |
| the derived scale replaced by the constant | all three Cards, at 1100x700 **only** |
| `tabindex="-1"` dropped from `cards.ts` | 13 focusable elements, at both windows |
| `role="presentation"` dropped from `cards.ts` | 1 heading, at both windows |
| the tilt, the swing, the dolly, the rise and the card gap all set to 0 | all three Cards in the same place at both ends of the Lift, at both windows |
| `opacity: 0` on `.eater-map__still` | one of the Section's own boxes invisible, at both ends and at both windows |
| `arrived()`'s first comparison back to `>=` | the reader left part way up and the Lift went on to 1, 3 runs out of 3 |
| `transform: none` and the two `transform-style: flat` dropped from the collapse | the plane still projecting, at 390x844 |
| the stage's negative margin written as `width: 100vw` | the Slab 390px wide at x=27.64 in a 375px document |
| `--eater-map-lift: 0` dropped from the collapse | BOTH other readers given a playhead of 1 and all three Cards drifted, at 390x844 |
| `collapsed()` dropped out of `arrived()` | coming to rest on the Section ran the Lift to 0.0563 |
| the points put back before the stage in the markup | the features above the picture, and the document's order disagreeing with the screen's |
| the leader lines drawn once instead of on every tick of the Lift | all four rules off their corners half way up and raised, at both windows — and NOT at flat |
| the rules drawn to the Card's own rect instead of to the anchor | the details rule 263px out at flat, and all four out at the other two moments |
| the Slab's anchor moved out of the plane and onto the Slab | the slab's anchor in the same place at both ends of the Lift, at both windows |
| `display: none` dropped from the overlay's collapse rule | the rules still drawn at 390x844 |
| a second point given `part: 'search'` | the BUILD, on both refinements at once — no point names the slab, and two name the search |

**The `arrived()` mutation passed three times in a row before the Check was
written the right way**, and it is the shape `scripts/checks/NOTES.md` warns about twice: *a
mutation has to be placed where it wins*. The first version of that assertion put
the page on the port and then jumped the scroll back to the Panel's — and a jump
lands hundreds of pixels below the trigger's start, so the boundary the bug lives
at is never crossed and the Check read as asleep when it was the gesture being
wrong. It walks the reader out a pixel a frame now, and the mutation fails every
time.

**The three Cards' corners are Tokens** — `--eater-map-card-<name>-x` and `-y`,
as shares of the Slab's width and height — so dragging one in the Editor moves it
across the picture rather than across the page, and the arrangement holds at every
size the Slab is drawn at. Their defaults are the app's own layout: the search bar
inset at the top, the lines popup right-aligned under it, the detail panel as a
sheet across the foot. `--eater-map-card-scale` multiplies the derived scale for
an author who wants the interface a little larger than life; 1 is the screenshot.

The plane **used to be clipped**, because a Card hanging off the edge of the
picture was a Card not lying on it. #177 lifted the clip, and it had no choice
twice over: a Card standing off the surface is what the drawing is now of, and
`overflow` other than `visible` would have flattened the whole Exploded View
anyway — see the grouping rule below.

## The Lift, and the four boxes it needs

The Exploded View is one camera, one rotation, and three depths off the plane it
rotates. `--eater-map-lift` runs 0 at the flat screenshot to 1 at the finished
drawing, and every angle and every depth in the composition is that number times a
Token, so progress 0 is `translateZ(0) rotate(0) rotate(0)` and every Card's depth
is 0 — the screenshot, unchanged.

**FOUR NESTED BOXES, and the fourth is forced rather than chosen.** #176 needed
three; the reason for the extra one is two CSS rules that pull against each other
and are both silent when broken.

```
.eater-map__stage      the grid area, centring what is in it
  .eater-map__slab     the SIZE, and the container every length on the plane is a share of
    .eater-map__plane  the CAMERA and the one rotation — perspective(), translateZ, rotateX, rotateZ
      .eater-map__still    the picture
      .eater-map__cards    the app's stylesheet host, preserve-3d
        .eater-map__card   one depth off the plane's surface
```

**Rule one: a GROUPING element cannot preserve 3D.** `transform-style: preserve-3d`
is forced back to `flat` on any element with `overflow` other than `visible`,
`opacity` below 1, a `filter`, a `mask`, or `contain` — and `container-type:
inline-size` **is** `contain: layout style inline-size`. So the Slab, which has to
be the container for the scale arithmetic and used to carry the clip, can never be
the element that holds the 3D space. There is no error and no warning: the Cards
simply lie flat on the map for ever, at the right scale, looking like a screenshot.

**Rule two: an element is not its own container.** The Frame's trap from the
Projects Panel, and it is what stops the camera being written on the Slab: a `cqw`
on the Slab's own rule resolves against the viewport, so the perspective would be
a different camera at every window and at none of them the one that was chosen.

Between them those two say the camera cannot be the `perspective` PROPERTY on the
Slab and cannot be a plain length either. The answer is the `perspective()`
**transform function** on the plane, which projects that element's own rotation and
its children's depths together, and which may be written in `cqw` because the plane
is a descendant of the container rather than the container itself. That is the
whole of why there are four boxes and not three.

**THE DOLLY IS PART OF THE CAMERA AND NOT A SIZE.** The Cards climb towards the
lens, so they grow, and a drawing whose pieces all grow outruns the box the
screenshot fitted — the detail panel is the biggest surface and the first to run
off the foot of the stage. `--eater-map-dolly` pushes the whole plane away from
the lens as the Lift runs: the map recedes, the topmost Card stays about life size,
and **the flat frame keeps the size #176 gave it**, which shrinking the Slab would
not have done. It is written BEFORE the two rotations in the transform list, so it
travels along the view's own axis rather than along the tilted plane's normal.

**Each Card's depth is a share of the rise, and its drift a share of the gap.**
`--eater-map-rise` is how far the topmost Card comes off the Slab, as a share of
the Slab's width; `--eater-map-card-<name>-depth` is each Card's place in that
stack, in the app's own order — the detail panel is a sheet over the map, the lines
popup floats above it, and the search bar is always on top. `--eater-map-card-gap`
draws the stack apart ALONG the plane as it climbs, half up and half down about the
middle of the stack, so the pieces do not all rise on one line of sight. **It is
named for the Cards because `--eater-map-gap` was already taken** — it is the seam
between the Rail's column and the composition, and the collision was silent: the
grid's `column-gap` took a unitless number, went invalid, and the Rail lost its
gutter while the Exploded View looked right.

The Card's transform is `translate3d(0, drift, depth) scale(app-scale)`, and **the
order is the arithmetic**: a transform list applies right to left, so the scale is
the Card's own and the translate is in the PLANE's units. Written the other way
round the app's own scale would multiply the depth and each Card would rise by a
different amount for the same Token.

## Glass cannot be carried off a surface

The one thing the Lift costs that no Token puts back, and the reason a Token had
to be spent putting something else in its place.

A `backdrop-filter` samples what is painted behind an element **in its own plane**,
and there is no such thing once the plane is turned under a camera: Chromium hands
the filter an empty backdrop and it becomes a no-op. **At the first degree of
tilt**, not at the first pixel of depth — measured, with the rise, the gap and the
dolly all set to 0 and only the tilt standing, the app's frosted detail panel is
already a sheet of clear glass with a sharp map behind its text. And measured the
other way too, because it was the obvious suspect: `transform-style: preserve-3d`
alone, with every angle at 0, is pixel-identical to `flat`. It is the rotation.

So the composition gives each Card the plate its glass was standing in for, in step
with that Card's own climb. `.eater-map__cards` captures the app's three glass
colours off its own host — `--glass`, `--glass-sheet`, `--glass-sheet-float` — and
`.eater-map__card` mixes each of them towards `--eater-map-plate` by
`--eater-map-card-lift`. On the Slab the app's own translucency is what a
screenshot has; off it the same surfaces are filled.

**The capture and the mix are on two different elements and that is not tidiness.**
A custom property whose value refers to its own name is a cycle and computes to
nothing, so `--glass: color-mix(…, var(--glass), …)` on one element is not a
darker glass, it is no glass at all.

**This Section never says what colour Eater's glass is** — only which way it fills
as it leaves the map. The app's own values are the other end of every mix, which is
the same rule the rest of the vendoring follows: the Showcase may not drift into
showing an interface the app does not have.

## What drives the Lift, and the two pixels that decide whether it ever fires

The Timeline is **paused, always**. Nothing plays it: a transport tween moves its
playhead, which is the Front Screen's arrangement and the Turn's — the Timeline is
the authority on where the drawing is, and the feel lives in what moves the
playhead. Every ease inside the Timeline is `none` and the ease is on the transport,
so the geometry is linear in the progress and a seek gives the frame the composition
designed rather than a point on a curve.

**A Timeline that plays itself cannot be held.** `hold()` disables every
ScrollTrigger, which stops a scrub dead — and does not touch a `play()` already in
the air. So a Check that seeked this to 0.25 would watch a `play()` walk it back out
from under the read, and the failure would read as a broken `hold()`. The transport
reads the playhead back on every tick and yields the moment it finds a progress it
did not write.

**No Check catches that guard being removed, and it was measured rather than
assumed.** `settle()` scrolls the document and then waits for fonts and for the
network to go quiet, which outlasts a whole Lift — so by the time `moments` reads,
the transport has finished either way. The guard is there for the **Editor**, where
the author can reach the Timeline's scrub within a second of arriving at the
Section and the transport would still be in the air.

**THE TRIGGER STARTS TWO PIXELS ABOVE THE PORT, and that is not a fudge.**
ScrollTrigger's `isActive` is `progress > 0 && progress < 1`, so a trigger whose
`start` is exactly the resting place is at progress **0** when the reader is
standing on it — not active, and it never fires. The page turn eases onto the port
and stops there to the pixel, so that is precisely the case. `top top+=2` arms the
Lift two pixels before the turn settles, which is two pixels of an 800ms ease.

Nothing here asks `self.isActive` either: `arrived()` compares the LIVE scroll
against the trigger's own `start` and `end`, because `onRefresh` is called at
points in ScrollTrigger's cycle where `isActive` has not been recomputed — and
`onRefresh` is load-bearing, since it is what `release()` runs and therefore what
puts the drawing back where the scroll says it should be after a Check or the
Editor has held it.

**BOTH OF `arrived()`'S COMPARISONS ARE STRICT, and the first one cost a
diagnosis.** It has to be the same question ScrollTrigger asks itself —
`progress > 0 && progress < 1` — and `>=` differs from it at exactly one scroll
position: `scroll === start`, where ScrollTrigger says NO and `>=` says yes. The
LEAVING toggle is delivered at exactly that position about half the time, so a
turn back reversed the Lift on some runs and drove it on to the raised end on
others. It read as a flaky reversal and it was an off-by-one in a comparison:

```
run 1: toggle scroll=1703 start=1706 active=false arrived=false   → reversed
run 2: toggle scroll=1706 start=1706 active=false arrived=true    → ran on to 1
```

Six turns back in a row reverse now, measured on the built tree rather than in the
dev server.

**What a reader actually gets, driven rather than reasoned about.** Four states,
each measured against `pnpm preview` at 1440x900, because three of them are states
no Check can settle a Timeline in:

| the reader | what was measured |
| --- | --- |
| turns the page in | the Lift stays at 0 through the whole 800ms turn and begins the frame the scroll lands on the port: `1708/0 1708/0.239 1708/0.449 … 1708/1` |
| turns back part way up | caught at 0.772 and back to 0 while the page returns to the Panel: `0.772 0.769 0.555 0.379 0.249 … 0` |
| runs no script | `--eater-map-lift` computes to `1`, and the Cards are raised, opaque and readable |
| asks for reduced motion | at rest at 1 before anything is scrolled, and still 1 through two wheel notches |

**A reader who asked for reduced motion gets the finished Exploded View and nothing
at all moves** — not even the jump a Lift driven straight to its end would make. The
Timeline is built, put at 1, registered so the Editor can still scrub it, and no
trigger is created. **The turn back is a retarget and not a rewind**: the transport
is re-aimed from wherever the drawing has got to, and it spends the time the
DISTANCE LEFT is worth rather than the whole Lift's, so a turn taken a third of the
way up undoes a third of a Lift.

## The leader lines, and why a stylesheet cannot draw one

Four thin rules, each running from one numbered point to the part of the Exploded
View it names — three to Cards and the fourth to the Slab itself, because the
offline basemap is the artefact the reader is already looking at (#178). They are
structure and not decoration: they are how a reader knows which claim belongs to
which piece, and they are the exploded-view convention the device is named for.

**The correspondence is exact, and it is exact mechanically.** Every point
carries a `part`, typed against the four parts of the drawing, and two
refinements on the Content's own schema fail the BUILD if a part goes unnamed or
is named twice — *no part without a number and no number without a part*. That is
a build failure rather than a Check because a point naming nothing draws no line
at all, which is a hole in the drawing rather than something that looks wrong.
The design reference breaks the rule twice over, and that is what the ticket
existed to fix: its lines begin in empty space and one of them ends nowhere.

**A STYLESHEET CANNOT DRAW ONE, and that is a fact about CSS rather than a
preference.** A rule's far end is a Card's own corner while that Card is turned
in three dimensions under the plane's camera; its near end is a row of text that
is not turned at all. The two ends are in different coordinate systems, and there
is no way to ask CSS where a projected corner LANDED — the arithmetic exists only
in the compositor. So the geometry is read back off the page, which is the one
thing in this Section that a script has to do.

**What a scriptless reader gets is the Exploded View with no rules over it**, and
that is the one thing the Lift's inversion cannot buy. It is affordable for the
same reason the rules are `aria-hidden`: they carry nothing that is not already
in the four points' own words. A reader listening is given the correspondence by
reading the points in order, and a reader whose scripts never arrived loses a
drawing convention rather than a claim.

### The anchor is an element, and it is zero-sized on purpose

Each part carries a `.eater-map__anchor` **inside** the transformed subtree, at
the corner two Tokens name. **A zero-sized box projects to a POINT**, so its
`getBoundingClientRect()` IS that corner's position on screen.

The obvious alternative is to read the Card's own rect, and it is wrong in a way
that looks right: `getBoundingClientRect()` on a rotated element gives the
AXIS-ALIGNED BOUNDING BOX of the projected quad, and that box's corners are
nowhere on the Card at all. Measured, with the rules drawn to the box's
bottom-left instead of to the anchor: right at the flat frame for three of the
four, 263px out for the fourth, and out by 3 to 71px for every one of them at the
other two moments. **The flat frame is the one a still is most likely to be taken
at**, which is why the Check reads three moments and not two.

The three Cards' anchors sit inside their own `.eater-map__card`, which meant the
Card's markup needed a wrapper to arrive in — `set:html` replaces an element's
children, and the anchor beside it would be one. That wrapper is
`display: contents`, so it generates no box and the Card is laid out exactly as it
was; `cards.css` has no child combinator in it, checked, so the vendored
stylesheet does not notice either.

### The shoulder is a box, because a Token is not a number to a script

Each rule leaves its point horizontally for `--eater-map-leader-reach` before
turning towards the part, and that length is the `.eater-map__hook`'s own WIDTH.
So the module reads the shoulder's two ends off one rect and never parses a
Token — **a custom property's computed value is its token stream**, and
`getPropertyValue` hands back `0.9rem` rather than pixels, so a length Token a
script needs in pixels has to be spent by the stylesheet on a real property
first. Which of the hook's two edges the rule starts at is decided by which side
of it the part is on, so the `points-right` Variant needs one declaration from
this and no arithmetic.

Three Tokens and no more, which are the three the composition can have an opinion
about: `--eater-map-leader-weight`, `--eater-map-leader-veil` and that reach. The
reach at 0 is a straight rule from the point to the corner. Where a rule leaves
its row VERTICALLY is derived rather than a Token — half a line of the title down
from the row's top — because it is a coordinate in a composition and not a number
the author chooses (ADR 0004). The eight `--eater-map-anchor-<part>-x/-y` are
Tokens for the opposite reason: which corner of a Card a rule comes off is a
choice, and as a share of the part it is a corner at every window and at every
size the Slab is drawn at.

### When it redraws, and where it does not draw at all

The redraw hangs on the **Timeline's own `onUpdate`**, which is the whole of "the
rules stay attached throughout the Lift": a reader turning the page, a Check
seeking a moment and the Editor scrubbing one all move the playhead, so all three
move the rules by one line. Beside it, a `ResizeObserver` on the Section, the
points' column and the Slab — the last two change size without the Section's own
box moving — and `document.fonts.ready`, because a face landing moves the text a
rule leaves from and no resize need follow it. Measured attached to a hundredth
of a pixel at 1440x900, at 1600x1000, and back again across the breakpoint.

Nothing hangs on a frame ticker. The rules are read out of the layout, so a redraw
forces one, and one per tick of a Lift that runs for a second is the whole cost.

**Below the band there are no rules and they are absent rather than redrawn.** The
composition is one column with the four points BENEATH the picture (#179), so a
rule between them would run back up the page and join a paragraph to a corner off
the top of the screen. The stylesheet takes the overlay away and `leaders.ts` asks
the overlay's own `display` rather than repeating the breakpoint — and that
`display: none` is load-bearing rather than tidy, because a rule drawn before a
resize would otherwise still be lying across the stack afterwards.

**It asks the overlay and not `--eater-map-collapsed`**, which is the flag
`timeline.ts` reads, and the difference is which question is being asked: the Lift
wants to know which REGIME the composition is in, and these rules want to know
whether they are drawn.

## The collapse below the band

An Exploded View is a drawing fitted to a wide window. It spends width on a
camera, on the distance the pieces draw apart along the plane, and on a stage that
is a composition row's remainder — and below 1100px a column has none of the
three to give. So the drawing puts itself away: **the Slab lies flat and runs to
both edges of the window, and the four features are an ordinary list under it**
(#179).

**It cost almost nothing to build, and that is #177's inversion paying out.** The
markup already rests in the finished composition, so the collapse is rules on the
resting state and not a second arrangement a script assembles: `--eater-map-lift`
back to 0, `transform: none` on the plane, a negative margin on the stage, and a
Slab given the whole of it.

**ONE COMPOSITION AND NOT THREE, AND THAT IS THE ASSERTION RATHER THAN THE
DESCRIPTION.** Three readers meet it — the narrow window, the reader who asked for
no motion, the reader whose scripts never arrived — and describing what each should
get is three things to keep true. So the Check opens the other two windows and
requires every box in the Section to land where the ordinary reader's did.
**The playhead is compared alongside the boxes**, and that was not the first draft:
collapsed, the geometry is pinned by `transform: none` whatever `--eater-map-lift`
holds, so a reader left at the raised end gets an identically shaped drawing whose
Cards' glass is filled to the plate. A comparison of rects alone reports that as
one composition, and it is a Card that has left a map it is still lying on.

### Four things about it that were decided rather than fallen into

**THE FEATURES MOVED IN THE MARKUP AND NOT IN THE LAYOUT.** They read as a list
*beneath* the picture down here, and the two ways to get that are an `order` or a
`grid-row` in the collapse block, or moving the `<ol>` after the stage in the
template. The second is free: both boxes are placed by an explicit `grid-area` in
the band, so the drawing is left of the points whichever order they are written
in — and it is the only one of the two that does not hand a reader looking at the
page and a reader hearing it two different sequences. The Check asserts both
halves, because the visual half alone is satisfied by the wrong fix.

**FULL-BLEED IS A NEGATIVE MARGIN AND NEVER `100vw`.** The Section carries the
page's margin on both edges out here and a picture that runs to the window's edges
has to spend both of them back. `100vw` counts a classic scrollbar's gutter and
this box does not — the trap `projects-panel` paid for, and worse here, because
this box is CENTRED in what it overflows and hangs half the error out of each
edge. Measured with the mutation in: 390px wide at x=27.64 in a 375px document.

**`transform: none` IS SAID OUTRIGHT AND NOT LEFT TO THE PLAYHEAD.** At
`--eater-map-lift: 0` every term of the camera is zero, and that is not the same
as no camera: `perspective()` with nothing to project still computes to a
matrix3d, and the Cards still stand in a `preserve-3d` rendering context. It
matters for what else reads the drawing rather than for what is on screen — the
leader lines, a Variant, a Check — all of which would otherwise be interrogating
a projection that happens to be flat. And the playhead is still set to 0 beside it,
because it is spent on the glass as well as on the geometry.

**THE LIFT IS TOLD BY THE STYLESHEET, THROUGH `--eater-map-collapsed`.** The
module has to know there is nothing to lift, and the obvious way is a
`matchMedia('(min-width: 1100px)')` in `timeline.ts` — which is the breakpoint
written a second time, in a second language, in a file the first copy cannot see.
The stylesheet has already decided; the flag is that decision readable from
script, declared in the component's `<style>` beside `--eater-map-lift` for the
same reason that one is: it is not a number the author chooses, and a Token could
not carry it at all, since `check-source.mjs` refuses an `@media` block in
`tokens.css`.

`arrived()` asks it LIVE rather than at mount, so a window carried across the
boundary either way lands on the composition it is now in: a resize refreshes every
ScrollTrigger, `onRefresh` re-asks, and the drawing is driven to the end its regime
wants. **The trigger is therefore still built below the band**, which looks
redundant and is what makes the resize work. The reduced-motion branch, which
builds no trigger at all, gets the same behaviour from a `resize` listener that
re-places the playhead and moves nothing on its own.

### The one thing this trades away, stated because it is visible

**BELOW THE BAND MEANS NARROWER THAN 1100px AND NOT "OUTSIDE THE ONE-SCREEN
BAND".** The collapse is in `@media not all and (min-width: 1100px)`, which is
where the Projects Panel stacks and where this Section's own column regime already
lived. A short wide window — 1440x600 — is outside the band and inside the
collapse's `min-width`, so it keeps the Exploded View and its Lift, and that is
deliberate: the Lift's gate and the collapse are the SAME question, *is the
Exploded View drawn here*, and a stacked column carrying a 1440px-wide phone is a
worse answer than a wide drawing on a short screen.

**AND FULL-BLEED HAS NO CEILING, WHICH IS WHAT THE WORD MEANS.** The capture's
proportion carries the height, so the picture is as tall as the window is wide
times 2.17 — 845px on a 390px phone, which is about one screen and is the case the
collapse exists for, and 2220px on a 1024px tablet, which is three. The interim
this replaced capped the width at `--eater-map-slab-cap: 20rem` for exactly that
reason and #179 removed the cap by name. If the tall end ever reads as wrong, the
fix is a second breakpoint inside the collapse rather than a cap on the bleed:
a ceiling on a full-bleed picture is a picture that is not full-bleed at the only
windows where the ceiling does anything.

## The stage, and the two renderers behind it

The part of the Exploded View that reads the Tokens and draws the **Slab** sits
behind one boundary, `stage.ts`, with two implementations behind it: `stage-dom.ts`,
which is the shipped composition, and `stage-webgl.ts`, which is the alternative
#181 built so that the renderer is chosen by **looking** rather than by argument.
#182 is the choosing, and **the loser goes out with its dependency** — a rejected
direction is kept as prose here, never as six hundred kilobytes in the lockfile.

**"Stage" means two things in this Section, and both are the tickets' own word.**
`.eater-map__stage` is the grid area the drawing stands in — row two's remainder,
#176's — and `stage.ts` is the renderer boundary #177 asked for and #181 put a
second implementation behind. Nothing in `CONTEXT.md` claims the word, and nothing
should until #182 has chosen: if the alternative loses, the boundary goes with it
and the collision goes with the boundary. Read as: the lower-case one in a
selector is a box, the one in a filename is a renderer.

**The boundary is round the Slab and NOT round the Cards**, which is not the
obvious split and is the one that matters. The Cards are the Eater app's own
markup and have to stay selectable, screen-readable text (#171, #176), so they
ride the same CSS plane under either stage and are placed by the same three rules
in `EaterMap.astro`. A stage that drew them would be drawing a *picture* of them,
and the Section would have traded the whole point of the vendoring for a renderer.
So the WebGL stage replaces exactly one element — the `<img>` — with exactly one
`<canvas>`, and everything else about the composition is untouched. That is also
why every Check passes either way: there is nothing in a Check's reach that
changed.

**Neither stage animates.** `--eater-map-lift` is the one thing that moves, and
`timeline.ts` is the only thing that writes it; a stage reflects it. That is what
makes reduced motion free for both — the Timeline rests the playhead at 1 and
builds no trigger, and each stage simply draws 1. Measured at 1440x900 with
`prefers-reduced-motion: reduce`, in both stages and both edges: the playhead
reads `1` at rest, stays `1` across forty frames, and stays `1` through a scroll
away from the Section and back.

**Selected at runtime and never at build time**, which is what lets one `dist/`
render the comparison. `?stage=webgl` on the URL, or `data-eater-map-stage` on the
document's root element for a tool that drives the page rather than links to it —
the attribute wins, so a tool can shoot a deep link without rewriting the URL it
is checking. An unrecognised spelling falls back to the shipped stage, because a
query string is something a reader can be handed. `pnpm check -- --stage webgl`
runs the whole suite that way and passes.

**That flag was written wrong first, and it passed.** `lib/page.mjs` read
`PORTFOLIO_STAGE` at MODULE SCOPE while `run.mjs` set it in its body — and
`run.mjs` imports all fourteen Checks at the top, every one of which imports
`page.mjs`, so ESM evaluated the whole graph first and the variable was always
undefined. The suite opened every page with the shipped stage while printing that
it had opened them with the other one, and passed, twice. It is read per page now.
The lesson is `scripts/checks/NOTES.md`'s own and this is the third time it has
been paid: **a green run is only evidence if something would have gone red.** What
settles it here is a probe that reproduces the ordering — import `page.mjs`, then
set the variable, then open a page and read the attribute back off `<html>` —
which now reports `webgl` where it reported nothing before.

**The WebGL stage costs the shipped page nothing.** It is behind a dynamic
`import()`, so Vite splits it: 508 KB of `three` in a chunk nothing fetches until
somebody asks for it, against 4 KB for the DOM one. `check-source.mjs`'s import
allowlist gained `three` beside `gsap` and `astro`, with the same note attached —
it is the runtime of an alternative that is being judged, and it comes out when
the judgement lands.

### The camera is the same camera, arithmetically

`EaterMap.astro` writes `perspective(P) translateZ(-D) rotateX(T) rotateZ(S)`,
which is a camera standing P in front of the plane's own centre. Matching it in
three.js is three facts and no eyeballing:

- **Both angles cross negated.** CSS's axes are x right, y **down**, z toward the
  reader; three's are x right, y **up**, z toward the reader.
- **The order needs no thought.** A CSS transform list applies right to left, so
  the swing happens first; three's default Euler order composes `Rx·Ry·Rz`, which
  is the same thing said the other way round.
- **The projection is matched by the field of view**, never by scaling afterwards:
  `fov = 2·atan(canvas height / 2P)` puts the plane at z = 0 on the canvas one CSS
  pixel to one CSS pixel.

Measured rather than asserted: at 1440x900, progress 0, the drawn composition is
282px wide under the DOM stage and 284px under the WebGL one — one pixel of
antialiasing at each edge, and nothing else. The Cards, which are still on the CSS
plane, land on the drawn map because the drawn map is where the CSS plane says it
is.

**The canvas is outside the rotation and bigger than the Slab.** A `<canvas>`
inside `.eater-map__plane` would be turned by the CSS rotation and then again by
its own, so it is a sibling — and a tilted Slab with a thickness reaches outside
the box the flat picture fitted, so the canvas is grown to the extent the
projection actually needs. That extent is **computed and not guessed**: the eight
corners are projected at five moments of the Lift and the union is taken, because
the extent is not monotonic in the progress — the plane turns while the camera
pulls back.

### What the comparison found

```bash
pnpm stages
```

renders it into `design/stages/index.html` — two stages crossed with what each can
make the Slab's edge out of, in both themes, at both ends of the band, shot at the
raised end of the Lift in the real page. `--progress 0` renders the flat frame,
where the two stages should agree exactly, and does.

|         | flat                 | thick                       | wrapped |
| ------- | -------------------- | --------------------------- | ------- |
| `dom`   | the shipped picture  | 24 sliced layers            | —       |
| `webgl` | one textured quad    | an extrusion, edge in paint | the captured pixels running over the fillet |

**The empty cell is the result.** DOM has no extrusion, so a thickness in it is
the solid **sliced**: each slice one flat element standing where that section of
the solid stands, inset and rounded by exactly as much as the fillet is at that
depth. That is DOM's best and it is genuinely good — it gets the silhouette, the
rounded outline and a shaded fillet, and the sheet is worth nothing if the loser
is not trying. Where it stops is that **a slice is one element and an element has
one background**: the fillet cannot be brighter on the side facing the light, and
it cannot carry the picture. Six faces would not help and neither would six
hundred slices.

**The finding underneath the finding, which was measured and is easy to get
backwards: at this Section's own camera the side WALL is nearly edge-on, so a
thickness shows up almost entirely as the FILLET.** At 2560x1440 the Slab is 478
wide, the tilt is 26° and the eye stands at 2.3 Slab-widths; the bottom edge is
466px below centre, which subtends 23° — three degrees off the tilt. Projected,
the back of the Slab lands **2.9px** below the front. So the visible depth is not
the wall, it is the band of front face the fillet takes over, and the whole
comparison is a comparison of what can be drawn on that band. The first DOM fake
written here had no fillet at all — a stack of full-size layers behind the picture
— and changed 754 pixels out of 1.8 million against the flat frame, which read as
a broken stage and was an honest rendering of a straw man.

**How the pixels wrap, since that is the cell nothing else can fill.** The
fillet's *shape* puts the ring at plan distance `r·sin φ` and depth `−r(1 − cos φ)`;
its *texture* reads the picture at plan distance `r·(2φ/π)` — the same band of
pixels spread evenly along the arc. Both ends meet the rest of the drawing
exactly: at φ = 0 the ring is the flat face's own edge and reads the pixels it
reads, and at φ = π/2 the ring is the silhouette and reads the picture's last row.
So the captured pixels run off the front, round the corner, and stop precisely
where the object does. `thick` and `wrapped` are the **same geometry** and differ
only in which triangles belong to which material, which is what makes the pair an
argument about one thing.

### Three things about the WebGL stage that are decisions

**The topology is fixed and the positions are rewritten in place.** The thickness
is spent by the Lift, so it moves every frame; only the index buffer says how the
surface is joined up, and that is a function of two counts and of nothing the
composition can change. So the buffers are allocated once and refilled.

**A frame loop, not a subscription.** The drawing turns on `--eater-map-lift`, on
eight Tokens, on the Slab's box and on the page's theme — and a custom property is
the one thing on that list nothing will tell you about. There is no event and no
observer. So the frame reads them, and a signature of every input is what stops a
page that is not moving from drawing at all. It also means a Token dragged in the
Editor moves this drawing on the next frame exactly as it moves the DOM stage's.

**`Color.setStyle` is never called.** It warns to the console on a syntax it does
not know, and the `console` Check fails a page that logs — so a Variant setting
`--eater-map-slab-edge` to a `color-mix()` would turn a colour nobody chose into a
failing build. The stage parses `rgb()`/`rgba()` itself and refuses anything else
in silence, which is why that Token is documented as a plain sRGB colour.

**And one thing it does not do.** #180's `projection-isometric` Variant restates
`.eater-map__plane`'s whole `transform`, so it is a change this stage cannot see —
this stage reads the *Tokens*, not the stylesheet. `projection-perspective`, which
moves only `--eater-map-tilt` and `--eater-map-swing`, it follows. That is a real
limit of putting a second renderer behind a boundary that is Tokens rather than
CSS, and it is worth having in front of #182: the DOM stage is the only one a
Variant can argue with in full.

## The Cards are the app's own markup, and their controls are neutered

`assets/cards/` is the Eater app's own search bar, rail-lines popup and restaurant
detail panel, taken off the app rather than redrawn (#174). They are here and not
in `design/` for one mechanical reason: `scripts/check-source.mjs` lets a Section
import from **its own folder and from the Kernel and nowhere else**, so this is
the only address the vendored bytes have.

**The Cards are a picture of an app, and the app is not here.** Left alone they
put thirteen tab stops in the middle of the Portfolio — a text field to type in,
buttons that share and close nothing, and links that leave for eater.com — and a
restaurant's name marked up as the page's top-level heading. Every one of those is
invisible to a reader looking at the page and a surprise to one navigating it by
keyboard or by heading. `cards.ts` refuses each route on its own: `tabindex="-1"`
for the keyboard, `pointer-events: none` for the pointer, and
`role="presentation"` on every heading rank — which takes the semantics off and
leaves the TEXT exposed, so the Card's words are still read and are simply not an
entry in the outline. The four numbered points beside it are the outline.

**`inert` is the obvious answer and is wrong twice over.** It takes the Cards out
of the accessibility tree, which is the one thing #171 asks for them to be in, and
it makes their text unselectable, which is an acceptance criterion of #176. What
is here leaves the text selectable, in the document, and read to a screen reader
as the Card's own words.

**Both refusals are written into the markup and neither is a stylesheet rule**,
which looks like a mistake until the reason is given: Astro scopes a component's
`<style>` by stamping an attribute on every element **its own template** renders,
and these arrive through `set:html`, so they carry no such attribute and no scoped
selector can reach them. `:global()` is the escape hatch and `check-source.mjs`
fails the build on it. An inline style is the one thing that lands on an element
without a selector. The attributes go in **first**, immediately after the tag
name, because the HTML parser keeps the first of two attributes with the same
name.

The vendored bytes themselves are generated. Do not edit it — `design/eater-cards/README.md` is the authority,
and every file there carries a header saying so.

| file | what it is |
| --- | --- |
| `cards.json` | the manifest: the Eater commit, the restaurant, the export viewport, and each Card's file and measured size |
| `cards.css` | every rule the three surfaces use, re-homed under one host |
| `search.html`, `lines.html`, `details.html` | one Card each, as markup |

Three things about them that are easy to get wrong, and the plane above turns
on all three:

**The host is `.eater-cards`, and it is the containment.** Every selector in
`cards.css` begins with it, including the ones that were `:root`, `html`, `body`
and `*` in the app. The stylesheet is a plain CSS file, so Astro does not scope it
— the host is what stops it reaching the rest of the page, and what stops the rest
of the page reaching in. `cards.json` records the name.

**The Cards are frozen to the viewport they were exported at.** Media queries,
viewport units and `env(safe-area-inset-…)` are all resolved at export time
against the window in `design/eater-cards/config.json`. A Card is a picture of the
app at a stated size; without this the restaurant's name would resize with the
Portfolio's window and the detail panel would turn back into a desktop sidebar on
a wide one.

**Each Card's size is on the host as a custom property** — `--eater-card-search-width`
and the five like it — rather than written into the markup, so nothing about
placement has to be a magic number.

**Their words are the app's and are NOT Content.** The Editor writes Content
(ADR 0004), and it must not offer the author a way to rewrite another
repository's interface from this page: the whole point of exporting rather than
redrawing is that the Showcase cannot drift into showing an interface the app does
not have. Changing which restaurant they show is a regeneration, not an edit:

```bash
node design/eater-cards/vendor.mjs --restaurant "St. JOHN Bread and Wine" --write
```

**And it is true now, rather than pending**: `unpublishable` reads the built page
and every Section that mounted, so from #176 onwards it scans **another
repository's words** — a restaurant's name, its address, a guide's write-up of it. Nothing in
the shape list matches any of those, and `denylist.local.txt` is the author's own
and not in the repository, so the failure mode is a local term colliding with a
restaurant. The answer if it ever does is a different restaurant in
`design/eater-cards/config.json` and a regeneration — never an exception in the
Check, which is the author's record and not this Section's to argue with.

## The Slab's own file

One WebP under `/portfolio/img/eater/`, written by
`design/eater-slab/capture-slab.mjs` (#173) and named by `slab.ts`.

**It is a WebP and the capture takes a PNG**, which #173's README left to this
ticket: a browser screenshot is a PNG and a PNG of a labelled map is a megabyte,
and this is a file a reader is sent rather than one an agent opens. The re-encode
happens in the same Chromium that took the shot, through a canvas, so nothing new
has to be installed for a script that already drives a browser and two runs on two
machines came out of one encoder. 1054 KB became 251 KB.

**It carries a stamp** — `?v=` in `slab.ts` — for the same reason the recording
does in the Projects Panel: the deployment caches `/portfolio/img/` for a day, so
a re-captured Slab that kept its URL is a Slab nobody is served. The capture
prints the value to paste, as its last line.

**`loading="lazy"` is what the markup asks for, and Chromium fetches it before
`load` anyway.** Measured, so that nobody reads more into the attribute than is
there: at 1440x900 the Section's top is 900px below the fold and at 1100x700 it is
700px, and Chromium's lazy-image distance threshold is about 1250px — so at every
window in the band the Slab is inside it. That is arguably the right answer, since
the reader is one wheel notch away, and it is the browser's call rather than the
page's either way.

**Serving the `src` from script would defer it and is refused.** #171's rule is
that the Section's content is never contingent on a script arriving, and a chunk
that does not turn up would then leave the Showcase as a bare map — the Panel's
recording can be script-served because its poster is what a scriptless reader
gets, and there is no poster behind the Slab. The `assets` Check covers the half
that is this page's business: that what is fetched arrives.

## The masthead is a plain word, and that was measured

#172 asked what a second **Cut Title** would cost — PROJECTS is cut off the Front
Screen's foot into the Projects Panel masthead's slot, and a second one would be
cut off the Panel's foot into this Section's. The answer was about 9% of the
Panel's composition at every window a browser actually has, and the whole of the
marble's corner at every window in the band, including the one where the width
costs nothing. `src/kernel/NOTES.md` carries the four windows it was measured at
and the three things that would have to change for it to be worth revisiting.

So this masthead paints. The Panel's does not — it is `visibility: hidden`
because the cut word is already that Section's head — and the difference between
the two rules is the whole of that decision showing up in the source.

## Which of the Kernel's lengths this Section reads

Two, and only in the band: `--landing-inset` for the page's top margin and
`--landing-side` for its left one. That is so the third screen's white agrees
with the second's and both Rails stand in one column — a reader turning the page
should not see the margins move.

**That is not joining the landing measure.** The measure is `--landing-w`,
`--landing-cap` and `--landing-mast-top`: the width two Sections have to agree
about *because a cut word has to land in a masthead's slot*, and the cap it is
cut to. This Section has no cut word, so it is a function of none of them, and
`--landing-w` gains no new reader. `src/kernel/NOTES.md` calls a third Section
joining that list a decision rather than a convenience; this is deliberately not
it.

Everywhere else the Section has its own two margins, because the band's are flat
vertical measures and a margin used across at a width they were never chosen for
is not a margin. Same reason the Panel's stack has its own.

## The ladder is in rem, and the seams are one step

Everything sized here is in rem, so the Kernel's `--type-zoom` scales the whole
composition without touching a length in `tokens.css`. Unlike the Front Screen
this Section has no one-screen budget with a remainder in it — nothing here funds
anything else — so a zoom costs it size and nothing.

The seams are the Projects Panel's stacked ladder at this Section's own step:
`--eater-map-step` and three powers of φ off it. One number moves the whole
rhythm, which is what makes it draggable in the Editor and legible as a ladder in
the source.

## The ground is the page's, and this Section paints none

`html { background: var(--ground) }` is the Kernel's, `--ground` is itself a
crossing on `--turn`, and a Section that paints its own composes two crossings —
which puts a step across the page at that Section's top edge that travels with
the scroll. That is what "banding" has meant both times it was reported. So the
ink here is `--ink` and `--ink-soft` straight, and every softer tone is a
`color-mix` towards transparent rather than towards a colour.

By the time the reader is here the crossing has finished: it runs from the top of
the document to the SECOND resting place, which is the Panel's. So this Section
is at the far end of the Turn in both themes, and the `ground` Check is what says
so.

## Two things this Section cost the Kernel

**The Turn's span in the band stopped being "the document's whole scroll".** It
is the second resting place now — the same number to the pixel while there were
two Sections, and the right one with three. `src/kernel/turn.ts` says it in full.

**Nothing else.** The Section is a port because `src/kernel/landing.css` declares
every Section after the first one, as a relationship rather than a list; the
page turn reads its ports off the cascade and has always generalised. Neither
file learned this Section's name.

## The Variants, and the one that cannot be seen at the sheet's default moment

Eight, in three groups, and `variants.css` carries the argument for each. Two are
the text composition's own — where the four points stand, and how loud the ladder
is. The other six are the two questions #180 asked to be judged by eye rather than
described: the **projection**, and the **subheading's face**.

**The projection group is a comparison of the RAISED drawing, and the sheet shoots
progress 0 by default.** Progress 0 is the flat screenshot — the plane lies flat,
every Card's depth is 0 — and every projection agrees about what that looks like,
so at the default moment the whole group comes back *identical* to `unselected` or
a hair off it and says nothing. It has to be asked for:

```bash
pnpm build
pnpm variants -- --sections eater-map --progress 1
```

That is deliberate rather than a limitation: every angle a Variant sets is still
spent by `--eater-map-lift`, exactly as the composition's are, so a Variant changes
where the Lift **arrives** and never where it starts. One that broke that would be
arguing about two things at once.

**`projection-perspective` is not the shipped composition restated**, and that is
the one decision in the group worth writing down. `unselected` already stands at
the head of every strip, so a Variant that came back byte-for-byte the same as it
would be a card that says nothing *and* a warning that means nothing — the sheet
counts identical renders, and that count is the cue that a Variant only exists in
motion. So the two cameras are compared at ONE pair of angles instead: the
canonical isometric 54.736° / -45°, once as a parallel projection and once with
the composition's camera and dolly back. They differ in the projection and in
nothing else, which is what makes "converging or parallel" a thing to see. The
shipped composition — the same converging camera at the tilt and swing this Section
chose for itself — is `unselected`, and that is the third picture in the strip.

**A parallel projection is a `transform` written without `perspective()`, not a
camera pushed far away.** `--eater-map-camera` only flattens *towards* parallel and
never reaches it, so `projection-isometric` restates the plane's whole transform
instead. The dolly goes with the camera: nothing converges, so nothing grows as it
climbs, and there is nothing for a camera pulling back to pay for. `preserve-3d`
still carries each Card's depth, which with no convergence reads as an offset along
the plane's normal — which is how an exploded view is drawn on paper.

**`projection-collage` restates the Card's whole transform because a rotation has
to go INSIDE the list**, between the translate and the scale, for the same
right-to-left reason the composition's own order is arithmetic rather than style.
It reads the two distances back off the custom properties the composition set on
that element.

**The face group is one declaration each, on purpose.** The reference sets the two
authored lines in a Didone and this Portfolio has none: it has Vollkorn, Spectral,
Source Serif 4 and Host Grotesk, and one of them has to take it. Host Grotesk is
what the Section ships, so it is `unselected`; the three serifs are Variants. The
size, the leading, the weight and the uppercase are held still, so the strip
compares faces rather than four typesettings — a serif that reads small at this
size is telling the author something about the pairing, not about the number. Each
Variant names the **Kernel's role** — `--face-body`, `--face-label`, `--face-year`
— rather than a family, because that is the level those four exist at.

**Every one of the eight is kept whichever way the judgement goes.** The losers are
the record of what was compared, which is the whole point of the mechanism.

## The words

All of them are Content, including the two the Rail speaks and never prints and
the one word in the placeholder.

The copy is the Career Record's `projects/eater-map-site.md`, "Page intro" — its
first two sentences and its last. **Cut, and cut rather than re-written**: every
word is the record's own, in the record's own order. What went is the middle,
which is a list of the same three engineering claims the four points carry with
their figures attached, and saying them twice would cost the paragraph lines it
does not have. Same cut, for the same reason, as the Panel's.

The four points are the ticket's own four, one per part of the Exploded View, and
each carries the `part` its leader line is drawn to. The fourth names the Slab
itself. That field is Content and the words are Content, and the Editor offers
the words and never the field — it matches an element against the text it DRAWS,
and a part is drawn nowhere.
