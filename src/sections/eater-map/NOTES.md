# The Eater Map Section

The Portfolio's third Section and its third resting place: the Showcase for the
Eater restaurant map. It is a text composition with an **Exploded View** beside
it — the captured Slab standing almost isometric in a parallel projection, with
real thickness, and the Eater app's own surfaces — five of them across three
Cards since #194 — rising off its face
together, with a thin rule joining each numbered point to the part it names, so
that what a reader sees is the app taken to pieces and made out of a picture and
real text (#176, #177, #178, #189) — and, below the band, the same drawing lying
flat and full-bleed with the four features as a list under it (#179). #187 is the
rebuild to the reference and several tickets under it are still open.

**#191 RECOMPOSED IT, AND THE SHAPE OF THE SCREEN IS ITS SHAPE NOW.** Three
standing blocks rather than a band of writing over a picture: the word PROJECTS at
the head of the left column with a serif project title under it and the copy at its
foot, the drawing down the middle, and the four numbered Points down the right edge
in a warm accent, each joined to its part by a rule that ends in a lit dot. The
masthead is the Gallery's own — the same word, in the same box, at the same place
on the screen — so turning onto this Section does not move it. It is still this
Section's element; **#193 is what makes the page's PROJECTS one persistent thing**,
and this slot is what that ticket takes over.

**THE SLAB DOES NOT MOVE, AND THAT IS THE INVARIANT TO KNOW FIRST (#189).** Its
attitude, its projection and its thickness are constants: the same solid, at the
same size, with the same projected corners at both ends of the Lift and at both
ends of the band. Only the Cards move. What that inverts is stated where the Lift
is, below — the flat screenshot #176 built is no longer a state this drawing
passes through, and half of what #177 spent the playhead on is spent by nothing
now.

## What is here and what is not

Here: the masthead PROJECTS, the four authored lines of the serif
project title under it, the copy at the foot of that column, the four numbered
points down the right edge with a number and an icon each, the Exploded View, the
four leader lines that join the one to the other and the two dots on each, the
**Lift** that assembles it, the **glass** every Card's surfaces are made of
(#190), and the collapse that puts all of it away below the
band.

Not here: which of the two stages draws the Slab. #181 built the alternative —
the same Exploded View in WebGL, with a Slab that has thickness — and **#182 is
the judgement**, which takes the loser and its dependency out together. That the
stage is one boundary with two implementations behind it is what makes that
judgement cost a stage and not a Section.

**The markup rests in the RAISED state, and that inverts the obvious build.** The
Lift animates from down *towards* raised, so the finished Exploded View is what a
reader whose scripts never arrived and a reader who asked for reduced motion each
get for nothing, and almost nothing in this Section is contingent on a script.

**WHAT `--eater-map-lift: 0` IS NOW, AND WHAT IT STOPPED BEING.** It used to be
exactly the screenshot #176 built — the same Slab at the same size with the Cards
at the same scale, to the pixel — because every angle and every depth in the
composition was a term of the playhead. #189 took the plane out of it. So the
Lift's near end is the three Cards lying on a map that is ALREADY turned, and the
flat screenshot is not a frame the drawing has any more. The `eater-map` Check
reads the scale with the projection lifted off the plane for one read instead,
which is the only honest way to ask a rotated Card how wide it is drawn.

**WHAT A SCRIPT IS STILL NEEDED FOR IS EVERY SOLID ON THE PLANE, AND THE CARDS'
GLASS**, and it is named here rather than buried in the stage. A thickness is
twenty-four elements a stylesheet cannot conjure — for the Slab, and since #190 for
every glass surface on every Card — and the Cards' backdrops are a measurement of
another repository's stylesheet that no selector can stand in for. So a reader
whose scripts never arrived gets the Exploded View at its full attitude with the
Cards raised, no depth on anything, and the app's own translucency where the
smeared map would be. That is the same trade the leader lines make (#178) and it is
affordable for the same reason: what is lost is a drawing convention rather than a
claim.

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
it. Its **height** is what the composition's one row has left, times
`--eater-map-slab-fill`; its **width** follows from the capture's own proportion.
So the phone is as big as the screen allows at every window in the band and nothing
has to be told a size.

**AND IT IS CAPPED BY WHAT THE STAGE IS WIDE ENOUGH TO CARRY, which is a different
question and was not asked before #191.** The drawing used to be a row's remainder
with the four points beside the writing above it; it stands in a COLUMN between two
things now — the writing on the left and the four Points on the right — and a Slab
sized only by the height runs its projected corners under both of them at the
band's short corner. Measured: 599px of outline in 528px of room at 1100x700, which
is the rail overlay's paragraph with a phone drawn over it.

**What is capped is the PROJECTED width and not the Slab's.** A `w x h` rectangle
turned by the swing spans `w·cos(s) + h·sin(s)` across the screen — the tilt takes
nothing off it, because `rotateX` moves the y axis and leaves x alone — so with
`h = tall·w` the outline is `w·(cos s + tall·sin s)`, and the height that fits a
stage `W` wide is `tall·W` over that. Both terms are the composition's own: the
swing is the Token the plane is turned by, and `tall` is the capture's proportion,
written on the element beside the ratio it comes from. It is a `max-height` and not
a `height`, so the aspect ratio survives it — the width is `auto` and derived from
the ratio, so clamping the definite axis re-derives the other one. Below the band
it is taken off entirely: nothing is projected down there, and full-bleed is a
picture with no ceiling by definition (#179).

The box is `container-type: inline-size`, which is the Frame's arrangement in the
Projects Panel, and it carries the Frame's trap with it: **an element is not its
own container**, so a `cqw` written on the Slab's own rule silently resolves
against the nearest container ABOVE it. Every one inside the plane is on a
descendant — and the cap above is the one place the trap is used DELIBERATELY:
`.eater-map__stage` is `container-type: inline-size` too, so `100cqw` on the Slab's
own rule is the stage's width, which is the only way for the Slab to say "a share
of the box I stand in" while being a container for everything on the plane.

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
0.72.

**AND IT IS THE REASON THAT CHECK LIFTS THE PROJECTION FOR ONE READ (#189).** A
Card's `getBoundingClientRect` is the axis-aligned bounding box of a quad
projected under the plane's rotation, which is not the Card's drawn width and
never was — the two agreed only while the Lift's near end was an untilted
screenshot. The Slab stands at its attitude at every moment now, so there is no
frame where the rect answers the question. The Check takes the plane's
`transform` off, and its `transform-style` with it, for the length of one read
and puts both straight back; what is left is the Card's own `scale()`, and its
rect over its declared width IS the scale the composition applied. The
alternative — reading `--eater-map-app-scale` off the element — is asking the
composition to confirm its own arithmetic.

Every mutation below has been made on purpose and every one was caught.

| mutation | what failed |
| --- | --- |
| the derived scale replaced by the constant | all three Cards, at 1100x700 **only** |
| `tabindex="-1"` dropped from `cards.ts` | 13 focusable elements, at both windows |
| `role="presentation"` dropped from `cards.ts` | 1 heading, at both windows |
| the rise and the three slides all set to 0 | all three Cards in the same place at both ends of the Lift, at both windows |
| the plane's attitude set to 0 | all three Cards rising 0px off the plane, and the stack with no order, at both windows — a depth under a parallel projection reaches the screen only through the attitude |
| the three Card depths set equal | the search Card and the lines Card both rising 66.75px, so the stack has lost its order, at both windows |
| the three depths spread back to 1 / 0.62 / 0.26 | the three rises 74% apart against 20% allowed — 17.36 / 41.39 / 66.75px at 1440x900 |
| `perspective()` put back on the plane | two identical 40px probes drawn 41.79x20.87 at the Slab's head and 89.84x79.62 at its foot, 73.8% apart, at both windows — **and the stack's order gone too**, because a converging camera makes a rise a function of where the Card is as well as of how deep it is |
| the attitude multiplied by `--eater-map-lift` again | the Slab drawn 282.36x612.16 at one end of the Lift and 570.21x410.76 at the other, 287.85px apart, at both windows |
| `opacity: 0` on `.eater-map__still` | one of the Section's own boxes invisible, at both ends and at both windows |
| `arrived()`'s first comparison back to `>=` | the reader left part way up and the Lift went on to 1, 3 runs out of 3 |
| `transform: none` and the two `transform-style: flat` dropped from the collapse | the plane still projecting, at 390x844 |
| the stage's negative margin written as `width: 100vw` | the Slab 390px wide at x=27.64 in a 375px document |
| `--eater-map-lift: 0` dropped from the collapse | BOTH other readers given a playhead of 1 and all three Cards drifted, at 390x844 |
| `collapsed()` dropped out of `arrived()` | coming to rest on the Section ran the Lift to 0.0563 |
| the points put back before the stage in the markup | the features above the picture, and the document's order disagreeing with the screen's |
| the leader lines drawn once instead of on every tick of the Lift | all four rules off their corners half way up and raised, at both windows — and NOT at flat |
| the rules drawn to the Card's own rect instead of to the anchor | the details rule 263px out at flat, and all four out at the other two moments |
| an anchor moved out of the plane and onto the Slab | that anchor not inside `.eater-map__plane`, at both windows. **This used to be geometry and had to stop being** — it was caught by the anchor standing in one place at both ends of the Lift, and the Slab's own anchor stands still legitimately now, because the Slab does. The movement half is kept for the three Cards, which are what the Lift carries |
| `display: none` dropped from the overlay's collapse rule | the rules still drawn at 390x844 |
| a second point given `part: 'search'` | the BUILD, on both refinements at once — no point names the slab, and two name the search |
| the plate mix put back on the three glass colours | the offline button opaque at the raised end, at both windows — and NOT at the flat end, which is the frame it was always honest at |
| one backdrop round the search Card's pair | the search Card drawing 1 glass surface where the app gives it 2, at both windows |
| one corner radius typed here instead of read off `cards.css` | the offline button drawn `0.43/24/24/24` against the `24/24/24/24` the export states |
| #197's rebuild — the clear per box and the host per Card | `search .search` with no edge while `search .offline-button` has one, which is exactly the silent half of it |
| the backdrop's `/ boost` dropped | with every Card boosted to 1.1, the map behind the details sheet drawn 310.6px against the Slab's 282.36px, 10% apart — and nothing at all at boost 1 |
| `--label` dropped from the dark block | the search pill painted lighter than the text on it, at both windows |
| a vendored variable overridden that `cards.css` does not publish | the Section naming `--glass-super`, which a re-vendoring could not carry |
| the Section taken back off the landing measure — the band's own `--eater-map-mast`, its zero column gap and its top padding reverted | PROJECTS 190.92px from where the Gallery's masthead stands at 1440x900 and 139.50px at 1100x700 |
| `content.masthead` back to `Eater Map` | the two mastheads reading different words, and 202.50px of box between them, at both windows |
| `title.ts`'s size write deleted, so the stylesheet's proportional fallback stands | **both** ratios, at both windows — the cap 4.4% low and the drop 2.0% out. This is the "a typed font size must fail it" mutation |
| the copy given `align-self: start` in the right-hand columns, and the Points put back on the left | four failures at each window: the copy in another column, off the foot, printed over the head, and the Points left of the drawing |
| the lit dot written at the shoulder instead of at the terminus | all four dots, at all three moments and both windows — 322.5px to 625.2px from the rule's own last point |
| `--eater-map-leader-tip` dragged to 0 | all four lit dots in the document painting nothing, at all three moments and both windows |
| the lateral normal dropped out of the edge's gradient | ALL FIVE extruded surfaces at once — the Slab's four sides all at luminance 0.0488 and every glass surface's all at 0.0772, 0% apart against 5% required, at both windows. This is exactly what the code did before #197, and asking it per surface is what makes a build that lit the Slab and left the Cards flat fail too |
| `--eater-map-light-azimuth` rotated 180deg | the Slab's foot at luminance 0.1174 against its right flank's 0.2690, at both windows — the two flanks that face the reader, lit the wrong way round |
| the plane's rotation left out of `edgeShade`, so the LOCAL normal is dotted | the foot and the right flank both at luminance 0.0488, at both windows — an object-fixed light, which is the thing #197 removed |
| the corner sweeps taken out of the perimeter (`ARC = 1`) | the largest step between two stops 100% of the gradient's whole spread against 50% allowed, at both windows |
| every slice's `border-radius` multiplied by 4, so its outline pulls off the corner | three of the Slab's four corners finding no slice under them, at both windows — the notch four hinged walls leave. The fourth is legitimately covered by the deeper slices the projection displaces over it |
| the edge's colour resolved in JavaScript instead of `color-mix(… var(…) …)` | every slice naming no Token, AND the mutated Token not moving the resolved gradient — two failures, because a string that names it and a `var()` that resolves are two claims |
| the slice outline measured off `getBoundingClientRect` and rounded to whole pixels | every gradient different at 1100x700 from 1440x900. **Only the SECOND MOUNT catches this** — resizing one page and comparing the strings passes, because nothing recomputes on a resize, and that version of the assertion read as checking something and checked nothing |
| the mounted stage reporting itself as something neither stage answers to | the Section reporting its stage as `chrome`, at 1440x900 — the twelfth group SKIPS under `--stage webgl` and had to be able to tell a skip from an Exploded View that never came up |
| the details sheet's foot reverted to the export's `28px 28px 0 0` | the details `.details-panel` drawn `28/28/0/0`, at both windows |
| the foot's override written as `--r-sheet: 28px` instead of as the rule | the same failure, at both windows — which is the point: the VARIABLE is already a single value, so the broken toggle that made the first comparison read "indistinguishable" now fails rather than passing quietly |
| `cards-shape.css`'s selector anchored on `.eater-map__card` | the sheet rounded and its backdrop and its edge still cut `28/28/0/0`, at both windows — the ruler is `.eater-cards` and a clone of `.eater-map__surface`, and a rule that cannot reach it is measured as though it were not there |
| the `radii` handed to `extrude` squared while the backdrop keeps its own | all four glass surfaces' edges drawn to `0/0/0/0` against `24/24/24/24`, `14/14/14/14` and `28/28/28/28`, at both windows — and **nothing else failed**, which is the point: the edge is asserted at its own corner rather than inferred from the backdrop beside it |
| the row cap's restatement dropped off `.eater-map__hang` | the results panel drawn 224px tall inside its own 112px box, showing 4 of its 81 rows against the 2 the capture capped it to, and overlapping the rail popup on the plane at both ends of the Lift — eight failures, at both windows |
| `--eater-map-card-lines-y` back to 0.306 | the rail popup and the results dropdown overlapping on the plane at both ends of the Lift, at both windows |

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

The Exploded View is one projection, one rotation, and three depths off the plane
it rotates. `--eater-map-lift` runs 0 with the Cards down on the map to 1 at the
finished drawing, and **what it multiplies is the Cards and nothing else** — each
Card's depth and each Card's slide along the plane. The plane's own attitude is a
constant it does not touch (#189), so progress 0 is three Cards lying on a Slab
that is already standing where it will stand. **The glass left the playhead in
#190** — it used to fill towards a plate as a Card climbed, and it is now a copy of
the map the Card carries, the same at every moment — so what the Lift does to it is
move it, which is the parallax rather than a state.

**WHAT #189 TOOK OUT OF THE PLAYHEAD, and why each thing left rather than being
set to a constant.** The tilt and the swing stopped being terms of it because the
Slab must not change under the reader; the CAMERA and the DOLLY left the Section
altogether, because the projection is now PARALLEL and a parallel projection has
neither. `--eater-map-camera` was an eye distance and there is no eye;
`--eater-map-dolly` existed to pay for pieces growing as they climbed towards the
lens, and under a parallel projection nothing grows, so there is nothing to pay
for. Both are gone from `tokens.css` rather than pinned at a value that does
nothing — a Token the Editor draws a control for and the page ignores is worse
than an absent one. The `projection-perspective` Variant states its own camera,
which is what a Variant arguing for a projection the composition does not have
should do.

**FOUR NESTED BOXES, and the fourth is forced rather than chosen.** #176 needed
three; the reason for the extra one is two CSS rules that pull against each other
and are both silent when broken.

```
.eater-map__stage      the grid area, centring what is in it
  .eater-map__slab     the SIZE, and the container every length on the plane is a share of
    .eater-map__plane  the PROJECTION and the one rotation — rotateX, rotateZ, and no perspective()
      .eater-map__slice x24  the Slab's thickness, built by the stage through edge.ts
      .eater-map__still    the picture
      .eater-map__cards    the app's stylesheet host
        .eater-map__card   one depth off the plane's surface
          .eater-map__slice x24 per glass surface  that surface's own thickness
          .eater-map__face      FLAT, so z-index decides inside it
            .eater-map__glass x1 per glass surface  the blurred copy of the map
            .eater-map__surface   display: contents, and the app's own markup
            .eater-map__hang      a BOX, and a second vendored root under the first
          .eater-map__anchor    where a leader line ends
```

`.eater-map__hang` is the search Card's alone and is the one box in that list
that is not `display: contents`: the gap it carries has to be a length, and the
collector writes `margin: 0 !important` on every vendored root. The fourth
surface, above, has the rest of it.

**NOTHING IN THAT TREE IS `preserve-3d` ANY MORE, WHICH IS #207, and the section
below on the Lift has the whole of it.** Every depth on the plane is written as
the place it PROJECTS to, which under a parallel projection is exact rather than
an approximation, so the drawing is one 2D affine composition. The rules that
follow are still true of anything that asks for a 3D rendering context — the two
Variants arguing about a converging camera do — and they are the reason the tree
has four boxes rather than three, which has not changed.

**Rule one: a GROUPING element cannot preserve 3D.** `transform-style: preserve-3d`
is forced back to `flat` on any element with `overflow` other than `visible`,
`opacity` below 1, a `filter`, a `mask`, or `contain` — and `container-type:
inline-size` **is** `contain: layout style inline-size`. So the Slab, which has to
be the container for the scale arithmetic and used to carry the clip, can never be
the element that holds the 3D space. There is no error and no warning: the Cards
simply lie flat on the map for ever, at the right scale, looking like a screenshot.

**Rule two: an element is not its own container.** The Frame's trap from the
Projects Panel: a `cqw` on the Slab's own rule resolves against the viewport, so
every length that is a share of the Slab has to be written a box further in. That
is what made the fourth box necessary while there was a camera to write, and it is
still what puts every `cqw` in the component on a descendant.

**THE FOURTH BOX SURVIVED THE CAMERA LEAVING (#189), and rule one is why.** The
camera used to be the reason for it: the `perspective` PROPERTY projects an
element's CHILDREN, so it would have had to sit on the Slab — which is
`container-type`, which is `contain: layout`, which is grouping, which would have
forced the plane's `preserve-3d` back to `flat`. There is no `perspective()` any
more, and the rotation alone still cannot go on the Slab for exactly the same
reason: the element that holds the 3D space cannot be the container. So four boxes
and not three, on rule one now rather than on the camera.

**THE THICKNESS IS A PARALLEL PROJECTION'S ONLY REAL DEPTH CUE, and #189 turned it
on for that reason as much as for the object.** Nothing converges, so nothing
about the drawing says "this edge is nearer" except the edge itself: the Slab is
3% of its own width deep, with a 2% fillet, and at 52 degrees of tilt the bottom
wall projects to `0.03 x sin 52` of the Slab's width — 6.7px at 1440x900 and
11.3px at 2560x1440. That is a real band rather than the 2.9px the shallow
converging camera left, which is what made every earlier attempt at an edge read
as fake. The stage builds it; `tokens.css` carries both shares.

**Each Card's depth is a share of the rise, and its slide is two Tokens of its
own.** `--eater-map-rise` is how far the topmost Card comes off the Slab, as a
share of the Slab's width; `--eater-map-card-<name>-depth` is each Card's place in
that stack, in the app's own order — the detail panel is a sheet over the map, the
lines popup floats above it, and the search bar is always on top.

**THE THREE DEPTHS ARE 1 / 0.94 / 0.88 AND THAT IS THE COMPOSITION'S MEANING.**
They were 1 / 0.62 / 0.26, which is a quarter of the rise against the whole of it,
and #187's complaint about it was that the Cards "read as three separate objects
at three different heights rather than one stack coming apart". Under a parallel
projection a Card's screen-space rise is exactly proportional to its depth, so the
three now agree within 12% and the `eater-map` Check holds them to 20% — and holds
them to their ORDER as well, because three equal depths satisfy a tolerance
perfectly and draw one raised plate.

**`--eater-map-card-gap` IS GONE AND EACH CARD HAS `slide-x` AND `slide-y`
INSTEAD.** The gap drew the stack apart along the plane by `(0.5 - depth)`, which
was a real device while the depths were far apart: it separated pieces that would
otherwise have climbed on one line of sight. With the depths within 12% of each
other it slides all three the same way by the same amount, which is a translation
of the drawing rather than a gap in it. Two numbers per Card say where that Card
goes, which is what the reference shows, and none of the six is larger than 0.11.

**AND BOTH OF A CARD'S PAIRS ARE IN THE SAME UNIT NOW, WHICH THEY WERE NOT.** A
percentage `left` resolves against the containing block's WIDTH and a percentage
`top` against its HEIGHT, so `--eater-map-card-<name>-y` was a share of a box 2.17
times as tall as it is wide while the slide beside it was a share of the width.
Two Tokens that read as a pair, in two units, moving a Card 2.17 times as far one
way as the other for the same drag — which is the Editor's problem as much as the
stylesheet's, since the control cannot say so. The `top` is `100cqw` now and the
three `y` values were converted with it, which is why `details-y` is 1.236: 57% of
the way down a phone is 1.24 phone-widths.

The Card's transform is `translate3d(slide-x, slide-y, depth) scale(app-scale)`,
and **the order is the arithmetic**: a transform list applies right to left, so the
scale is the Card's own and the translate is in the PLANE's units. Written the other way
round the app's own scale would multiply the depth and each Card would rise by a
different amount for the same Token.

## Glass cannot be carried off a surface, so the map is carried instead

A `backdrop-filter` samples what is painted behind an element **in its own plane**,
and there was no such thing once the plane was turned under a camera: Chromium
handed the filter an empty backdrop and it became a no-op. **At the first degree of
tilt**, not at the first pixel of depth — measured, with the rise, the gap and the
dolly all set to 0 and only the tilt standing, the app's frosted detail panel was
already a sheet of clear glass with a sharp map behind its text. And measured the
other way too, because it was the obvious suspect: `transform-style: preserve-3d`
alone, with every angle at 0, is pixel-identical to `flat`. It was the rotation.

**THE PAST TENSE IS #207's, AND #211 IS WHAT IT COST.** "In its own plane" means
its own 3D RENDERING CONTEXT, and #207 took the rendering context away — so the
filters woke up, silently, and started frosting a surface that already carried a
frost of its own. Verified by putting a `hue-rotate(140deg)` in one and watching
the panel go purple. They are turned off by name in `EaterMap.astro` now; the
reasoning below is why the copy exists at all, and it is unchanged.

**WHAT THIS SECTION DID ABOUT IT UNTIL #190 WAS THE OPPOSITE OF THE REFERENCE.**
The composition gave each Card the plate its glass was standing in for, in step
with that Card's own climb — `--glass`, `--glass-sheet` and `--glass-sheet-float`
mixed towards `--eater-map-plate` by `--eater-map-card-lift` — so a raised Card was
opaque WHITE. Legible, and the reverse of glass. The plate, the mix and the capture
of the app's three colours are all gone.

**What stands in its place is `glass.ts`: each glass SURFACE carries a blurred copy
of the Slab**, offset by that surface's own place on it, brightened — because a
dark map behind a dark surface reads as a hole rather than as glass — and cut to
that surface's own outline. Three Tokens make the copy (`--eater-map-glass-blur`,
`-brighten`, `-saturate`) and three more are what the surfaces are painted
(`--eater-map-glass`, `-sheet`, `-float`).

**The offset does not follow the climb, and that is the parallax.** The copy is a
child of the Card, so it travels with it: a raised Card shows the piece of map it
was *lying on* rather than the piece it is now over, which is what a sheet of glass
lifted off a table does. Below the band, where the playhead is 0 and nothing has
drifted, every copy lines up exactly with the map beneath it — so the collapsed
drawing is an honestly frosted screenshot by the same mechanism, with no rule of
its own. That is also the second reason `--eater-map-lift: 0` is declared in the
collapse.

**A CARD IS ITS GLASS SURFACES AND NOT ITS BOUNDING BOX.** The vendored search Card
is a `.topbar` holding **two** separate pills — `.search` and `.offline-button`,
with an 8px gap — and one backdrop and one extrusion round the pair weld them into
a single long component with two buttons stuck on the end, which is not an
interface the app has. `cards.ts` names the surfaces per Card; the rail popup and
the details sheet are one each, and theirs is the vendored root itself. **The
search Card has THREE since #194**, and the third is below.

### The fourth surface, and why it is not a fourth part

**The search results dropdown is a surface of the search Card and not a Card of
its own (#194).** The Showcase shows the app searching, so it shows what searching
produces: `design/eater-cards/` takes the app's own `SearchResults` component off
the running app with the app's own collector, and the Section draws it as the
search Card's third glass surface — same backdrop, same edge, same radius read off
the export, no special case.

**A SURFACE AND NOT A FIFTH PART, which the BUILD enforces.** The Content schema's
two refinements are *no part without a number and no number without a part*, and
there are four numbered Points; a fourth drawn thing that declared itself a part
would need a fifth. It does not need one — the dropdown is what Point 01 is
already about. So the drawing is **four parts across five surfaces**, the search
Card keeps one anchor and one leader line, and the `eater-map` Check counts both.

**A SECOND VENDORED ROOT INSIDE ONE CARD, AND THAT IS WHAT MAKES THE SCALE FREE.**
A dropdown narrower or wider than the bar it hangs from reads as a different
component, and #187 states that whatever scale the two carry they must carry the
same one. Inside one Card there is one `scale()` and nothing to keep in step.
`.eater-map__hang` is the box it arrives in — a real box rather than
`display: contents` like `.eater-map__surface`, because the gap between the two
has to be a length and the collector writes `margin: 0 !important` on every
vendored root, so the margin has to go on an element that rule cannot reach.

**THE CLEARANCE IS DERIVED FROM THE THICKNESS AND THE TILT, AND THAT IS THE POINT
OF IT.** A surface sitting below another on the plane has to clear that one's
**edge** and not its face: a wall of thickness `t` sinks into the plane, so it
projects DOWN-SCREEN by `t x sin(tilt)`, while a gap `g` along the plane projects
down by only `g x cos(tilt)`. So the dropdown clears when `g > t x tan(tilt)` —
about five plane-px at today's thickness and tilt, and rendered at exactly that
minimum the two are still a hairline apart, because a minimum behaves like one.
`EaterMap.astro` spends twice it. **Written against the two Tokens and never as a third number**,
or a later change to either walks the edge back into the bar above it while the
number here goes on reading as correct. It is **not** multiplied by
`--eater-map-solid`: below the band no wall projects anywhere, but a dropdown
lying against the bar it hangs from is not an interface the app has, and what is
left down there is within a couple of pixels of the app's own gap.

**No Check asserts the clearance itself**, and that is deliberate rather than
missing: whether a wall reads as cleared is a look, and a Check that recomputed
`t x tan(tilt)` would be asking the composition to confirm its own arithmetic —
the same objection this file makes to reading `--eater-map-app-scale` off the
element. What IS asserted is that no two glass surfaces overlap **on the plane**,
at both ends of the Lift, which is the claim a rect can answer.

**AND IT IS THE ONE LENGTH IN A CARD THAT IS NOT FROZEN TO THE EXPORT'S
VIEWPORT.** Everything else `glass.ts` measures is the same number at every window
— that is what "measured once" means below — but this one moves when either Token
is dragged in the Editor. So the ruler is handed a clearance of **zero** and a
hung surface's top comes back as `<measured>px + var(…)`: the number written down
stays the constant it claims to be, and the offset stays live. Measured instead,
the dropdown would slide out from under its own glass the first time somebody
dragged the thickness.

**THE ROW CAP IS RESTATED AS THE APP'S VARIABLE, NEVER AS A HEIGHT.** The panel's
height is `calc(var(--mobile-search-visible-results, 4) * 56px)` set **inline** on
its shell by the app — and a root's inline style is exactly what the collector
strips, because that is where the app writes a surface's placement. So the card
arrives with the variable gone, falls back to the FOUR in its own `var()` default,
and draws four rows out of the bottom of a host box the collector sized for two;
the overflow is invisible unless somebody counts. The Section restates it inline
on `.eater-map__hang`, with the number read back out of `cards.json` — the
capture's own, not a second opinion — and the Check counts the rows.

**THE RAIL POPUP MOVED DOWN THE SLAB TO MAKE ROOM.** At the search bar's own place
the dropdown lands exactly where the popup stood, so
`--eater-map-card-lines-y` went from 0.306 to 0.61 and the head of the Slab reads
down as one stack: the bar, what searching it produces, then the rail lines. It is
a Token and the Check holds it only to *not overlapping* — which is asserted at
both ends of the Lift, because the two Cards drift by different amounts as they
climb and the flat arrangement is the tighter of the two as well as being what a
reader below the band is looking at.

**THE DROPDOWN IS A SCROLL CONTAINER, AND THAT IS A THIRD INPUT ROUTE.** 81
matching rows sit behind the panel's own `overflow: auto`, which is what the app
has, and the app also sets `overscroll-behavior: contain` on it — so a reader
dragging the page with a finger over the panel scrolls restaurants instead of the
page and gets no chaining when the panel ends. `cards.ts` refuses the pointer on
every element a Card names as a glass surface, inline, because `cards.css` gives
the panel `pointer-events: auto` explicitly and nothing in a stylesheet this
Section could write outweighs that without `!important`.

**AND EVERY NUMBER IS MEASURED RATHER THAN TYPED.** The markup is rendered into an
offscreen ruler at its natural size and each surface's offset and its four computed
corner radii are read there. Two things make that the only way:
`getBoundingClientRect` on a turned element is the axis-aligned bounding box of the
projected quad, so a measurement taken on the plane comes back projected; and a
radius stated in this repository is a second opinion about a number the vendored
export already holds — the mockup typed `24 / 18 / 22` against the stylesheet's own
`--r-full`, `--r-menu: 14px` and `--r-sheet: 28px 28px 0 0`, so two of the three
edges were drawn to the wrong outline and the third agreed by accident. `999px` is
what a pill *states*; `fitRadii` in `edge.ts` is the clamp a browser applies to get
the 24 it draws, and there is no property that hands it over.

**THE RULER IS `.eater-cards` AND A CLONE OF `.eater-map__surface`, AND THAT IS THE
ONE THING A SHAPE RULE MAY SELECT THROUGH (#195).** Those two elements are every
ancestor the measurement has. A rule in `cards-shape.css` anchored on
`.eater-map__card` or `.eater-map__face` therefore applies to the page and **not**
to the ruler, so the surface is drawn to one outline while its backdrop and its
edge are cut to another — the sheet rounds and the drawn edge stays square, which
is a build that looks almost right. It was written that way once and the Check
caught it at both windows. Deepening the ruler is not the fix: `.eater-map__card`
carries the plane's scale, so a clone measured inside one comes back scaled and
every offset with it.

**Measured ONCE, and that is a fact about what is measured rather than an
optimisation.** The Cards are frozen to the viewport they were exported at, so a
surface's offset and radii are the same numbers at every window. Everything that
does change — where the Card sits, how thick its edge is, how far the map is
smeared — is a CSS expression `glass.ts` writes, so a Token dragged in the Editor
and a window carried across the breakpoint both move the drawing with nothing
re-mounted and no observer.

**`preserve-3d` ON A CARD Z-FIGHTS ITS OWN CHILDREN**, which is the mechanism that
cost a render. It is not a live hazard since #207 — no Card is `preserve-3d` — but
it is what `.eater-map__face` is FOR, so it is what has to be understood before
that box is taken out. The copy and the Card's own content are both at `z: 0` under it, so
`z-index` stops deciding between them and the two interleave — in the prototype
that made the details Card read as two smeared panels. `.eater-map__face` is a
`flat` box holding both, and the Card's edge slices are that face's **siblings**,
because a depth inside a flat face is nothing at all.

**AND THE SLICES HAVE TO LAND SOMEWHERE THEIR DEPTH IS REAL, WHICH IS THE HALF
#190 LEFT OUT (#203).** Moving them out of the flat face is only worth doing if
what they land in can carry a depth, and for three tickets it could not:
`.eater-map__card` declared no `transform-style` at all, so it was `flat`, and
every slice's `translateZ` was discarded. Measured on the shipped page: all
twenty-four of the details Card's slices sat at `translateZ(-3.6px)` with a screen
rect **identical to the face's**, painting underneath it. The Cards read as decals
lying on the map.

**#203 ANSWERED THAT WITH `preserve-3d` AND #207 ANSWERED IT WITH ARITHMETIC.**
The slices carry no `translateZ` now — they are translated to the place their
depth projects to, in the Card's own units — so there is nothing left for a flat
parent to discard, and the Card is flat. Both answers put the edge on screen at
the same 1.247px off the face; the difference is what the Card costs to draw, and
that is the section below.

**This is why "the Cards have no 3D effect" survived a diagnosis that blamed the
thickness.** `--eater-map-card-thickness` moves nothing but that `translateZ`, so
four times the depth was four times nothing — a ladder at 0.01 / 0.02 / 0.04 came
back as three identical pictures. The Token was never wrong; 0.01 is #187's own 1%
against the Slab's 3% and it reads correctly now that there is a depth for it to be
a depth in. The Slab never had the fault, because ITS slices were children of
`.eater-map__plane`, which was `preserve-3d` — which is exactly why the Slab had a
visible edge throughout and the Cards did not.

## The drawing is flat, and a parallel projection is why it can be (#207)

**THE COMPLAINT WAS THAT THE CARDS WERE NOT AS SHARP AS THE REST OF THE PAGE, and
the cause was `preserve-3d` rather than anything about the type.** An element in a
3D rendering context is given its own render surface: the browser rasterises it
SQUARE, in its own plane, and the GPU then resamples that texture onto the tilted
one. So every glyph of the vendored Eater app arrived through a bilinear filter,
while the Points beside it — ordinary text in the page's own plane — were drawn by
Skia at full resolution. Two kinds of rendering on one screen, which is exactly
what "not as sharp as the rest of the text" describes.

**AND A PARALLEL PROJECTION DOES NOT NEED THE THIRD DIMENSION AT ALL.** With
`transform: rotateX(t) rotateZ(s)` and no `perspective()`, a point a distance `d`
BEHIND the plane projects to exactly the same screen point as one lying ON the
plane, `d · tan(t)` further along it — `sin(s)` of that across and `cos(s)` of it
down, in the plane's own axes. Solve `M · (a, b, 0) = M · (0, 0, −d)`:

```
a = −d · tan(t) · sin(s)
b = −d · tan(t) · cos(s)
```

There is no third term. Nothing converges, so nothing about the answer depends on
where the point is — which is what makes this an identity rather than an
approximation, and it is the same fact #189 relied on when it took the camera out.
`--eater-map-depth-x` and `--eater-map-depth-y` on `.eater-map__plane` are that
pair per unit of depth, and every depth in the Section is spent through them: a
Card's rise in `EaterMap.astro`, every slice of every solid in `edge.ts`.

**IT IS THE WHOLE CHAIN OR IT IS NOTHING, and that cost a wrong fix on the way.**
Flattening `.eater-map__cards` and `.eater-map__card` while one `translateZ`
remained on the Slab's slices changed the measured sharpness by **less than 1%**:
the plane was still a 3D scene, and a 3D scene composites all of its children, so
the Cards went straight back into their own surfaces. The Slab has no text on it
and does not care how it is rasterised — it flattens because the Cards ride the
plane it hangs under. Measured at 1600x900 at DPR 2, on the built page, over a
crop of the details Card's paragraph, as mean |Laplacian| over the crop's own
standard deviation:

| | before | after |
| --- | --- | --- |
| cards flat, plane 3D | 0.869 | 0.862 |
| whole chain flat | 0.869 | **1.043** |

**AND THE DRAWING DID NOT MOVE.** Every Card's screen rect is identical to three
decimal places before and after — `details` at `516.254, 341.340, 484.665,
294.390` either way — and so is every wall stack's separation, 1.247px on each of
the five Card surfaces and 5.988px on the Slab. That is the identity above doing
what it says.

**WHAT A FLAT PARENT TAKES AWAY IS THE DEPTH SORT**, and `edge.ts` puts it back by
hand. A `preserve-3d` parent paints its children nearest-last whatever the document
says; a flat one paints them in document order. The slices are BUILT shallowest
first — the fillet rolls back from the face, then the wall goes on behind it — so
`extrude` inserts each one BEFORE the last, and the stack comes out deepest-first,
which is the order a sort would have painted it in. The Slab's edge is
pixel-identical with the two orders; the reversal is what keeps it that way.

**THE TWO PROJECTION VARIANTS PUT `preserve-3d` BACK, and they have to.** A place
on the plane stands in for a depth only where nothing converges:
`projection-perspective` restores a camera and `projection-collage` rotates every
Card on its own, and neither claim survives being flattened. Both restate the
chain and the rise in `variants.css`. What no Variant can restore is a slice's
depth — `edge.ts` writes those as inline styles and no stylesheet outranks one — so
each Card's edge is drawn at its parallel place on those sheets, which is a 1.2px
hairline under an argument about where the Cards are.

**The Check did not catch it, and could not have.** It reads each surface's
gradient STRINGS and measures the four sides against each other, so an edge that is
built correctly and then painted flat underneath its own face passes every
assertion in the group. `scripts/checks/NOTES.md`'s warning about a Check that
reads as asserting something while asserting nothing is this, from the other end:
the Check asserted what it said it did, and what it said it did was not "the edge
is on screen". The assertion that a Card's edge stands off its face is what closes
that, and it is why the pair cannot come apart again silently.

**A BOOSTED CARD'S BACKDROP IS COUNTER-SCALED, AND IT IS NOT OPTIONAL.** A Card is
drawn at `app-scale × --eater-map-card-scale`, and scaling the Card scales the copy
inside it — so a boosted Card would show a map through itself larger than the map
it is lying on. One capture pixel is therefore `1 / boost` of that Card's own
units, and the copy's size, both its offsets and the blur all divide by it. That is
the whole mechanical cost of the 1.10 #187 adopts for the rail popup, and the
`eater-map` Check puts a boost on for the length of one read so that a missing
division fails rather than waiting for somebody to spend one.

**AND `scale()` IS `scale3d(s, s, 1)`**, which is the same division for a second
reason and the one that is easy to miss. A Card's face is scaled and its DEPTH is
not, so a Card's edge is handed two expressions for one distance: across the face
in the Card's own units, and along Z in the plane's. `Solid.filletBack` in `edge.ts`
is where that is written down. The Slab needs no such thing — `.eater-map__plane`
carries no scale — which is exactly why it was invisible until a Card had an edge.

### The dark Cards are variable overrides, not a fork

The vendored `cards.css` already routes every surface through `--glass`,
`--glass-sheet`, `--glass-sheet-float`, `--label`, `--separator` and their
neighbours. `EaterMap.astro` sets **those names and nothing else**, so no rule
inside the export is edited, nothing here selects into another repository's markup,
and a re-vendoring — which rewrites that file and not this one — leaves the theme
standing. The `eater-map` Check asserts the boundary rather than the colours: every
vendored variable the Section sets on a Card has to be a name the export actually
publishes.

**On `.eater-map__card` and never on `.eater-map__cards`**, which is the vendored
host itself. A declaration on the host would be `.eater-cards` against
`.eater-cards` — the same weight, settled by whichever stylesheet the bundler
emitted second — and `cards.css` is an ordinary import while the Section's block is
Astro's own. One element in it is not a contest, and the values inherit down to
every surface, which is how the plate mix reached them too.

**`--glass-sheet-float` is the details sheet's own background** at the export's
viewport, and it drops to near-nothing. That is #190's "the floating actions bar no
longer veils the paragraph under it": the `.actions` row is `background:
transparent` down there, so the only thing that could fog the paragraph is the
sheet, and the paragraph now sits on the blurred map instead.

**The app's own `backdrop-filter`s are turned off, and #211 is the correction.**
This used to read "left alone", on the grounds that in the band they sampled an
empty backdrop and were no-ops so overriding them would buy nothing. That was true
of a `preserve-3d` plane and stopped being true with #207. What they do now is a
SECOND frost over the copy — and, more expensively, a render surface per glass
surface, which is #207's own mechanism one level further in: the surface's text is
rasterised into a texture and composited rather than drawn through the matrix.
Measured on the built page at 1600x900 at DPR 1, over the details Card's paragraph,
they cost more sharpness than #207 bought.

Off EVERYWHERE and not only in the band, which is the smaller rule: below the band
every copy already lines up exactly with the map beneath it, so the copies are the
whole frost there too, and the app's filters add a faint bloom and nothing else —
compared side by side at 820x1180, the two are the same picture. One frost, under
the three Tokens that name it.

**A reader with no scripts gets the app's own translucency over the map** and no
copy behind it, which is the same trade the Slab's edge and the leader lines make.
It is affordable HERE only because the Cards are dark: a light translucent surface
over a light map was the illegible case that made the plate necessary, and dark ink
on a dark map is not.

### A shape is the one thing a variable cannot carry

The paragraph above says the Section names vendored variables and never selects
into the app's markup. **That held until #195 and holds for the palette still**: a
custom property inherits, so setting one on `.eater-map__card` reaches every surface
under it without a selector at all. A `border-radius` does not inherit, and there is
nowhere in `EaterMap.astro`'s scoped block to write a selector for one — Astro
narrows every compound of a scoped rule with the component's scoping class, and the
Cards arrive through `set:html` carrying none, so a rule written there matches
nothing. `:global()` is the escape hatch and `check-source.mjs` fails the build on
it.

So `cards-shape.css` is a plain, unscoped stylesheet — the same kind of file
`cards.css` is — and it holds everything this Section says about the SHAPE of a
vendored surface. Today that is one declaration. Three rules keep it as narrow as
the palette:

* **Never inside `assets/cards/`.** A re-vendoring rewrites that folder and not
  this file, so no rule in the export is edited and the override survives.
* **Never name the export's build fingerprint.** `cards.css` states its own rules
  at `.eater-cards .details-panel.svelte-1ccclju`, which is (0,3,0) with a hash as
  its third class. Matching that weight leaves the winner to whichever stylesheet
  the bundler emitted second, and naming the hash builds a selector out of a number
  this repository does not own. (0,4,0) out of real handles wins outright.
* **Select only through the boxes the RULER gives the clone** — `.eater-cards`,
  `.eater-map__face`, `.eater-map__surface`, and `.eater-map__hang` for a hung
  surface (#194) — for the reason the ruler paragraph above gives. This is the one
  that is silent in the source — the page looks right and the drawing does not —
  and it is a Check rather than a wish: anchored deeper, the `eater-map` Check
  fails at both windows on the backdrop and on the edge. Two of those four are new
  since the rule was written, and the shorter list is still the safer one: a rule
  written through `.eater-cards` and the surface it names cannot be wrong whatever
  the ruler grows next.

The first two are not Checks and do not need to be. Writing in `assets/cards/` is
denied by the vendoring's own README and undone by the next regeneration, and a
selector naming the `svelte-…` hash announces itself at the next re-vendoring by
ceasing to match — at which point the third rule's Check catches it too.

**The details sheet's foot is the first of them.** In the app it is a bottom sheet
resting on the screen's edge, where a rounded foot would show a sliver of map
beneath it; off the map it is a floating object with four visible corners, and one
of them turned a right angle while the Slab's, the pills' and its own head all
curved. **The trap is that the squareness is in the RULE.** `--r-sheet` is already a
single `28px`; the two zeroes are in `border-radius: var(--r-sheet) var(--r-sheet) 0
0`. So overriding the variable sets 28px to 28px, and that is a no-op — it is what
was done the first time the corner was compared, which is why the before and the
after were the same picture and why the comparison was written up as "the two are
indistinguishable". They are not; the toggle was broken.

**The value is `var(--r-sheet)` and never `28px`**, by the same rule the rest of
this Section holds: the radius is the export's number and the override only says
which corners get it. Nothing then follows by hand — `glass.ts` reads each
surface's four COMPUTED corners off the served stylesheet, so the backdrop and all
twenty-four slices turn with that one line.

**The Check asks EVERY glass surface for four non-zero corners**, and that is
broader than the ticket asked for on purpose: every corner turning the same way is
the composition's rule rather than this sheet's detail. The cost is stated rather
than hidden — a re-vendoring that ships a legitimately square-cornered surface fails
the build, and the answer to that is a decision about the drawing, which is what a
Check is for.

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
nowhere on the Card at all. Measured while the Lift's near end was still an
untilted screenshot, with the rules drawn to the box's bottom-left instead of to
the anchor: right at that frame for three of the four, 263px out for the fourth,
and out by 3 to 71px for every one of them at the other two moments. Since #189
there is no untilted frame, so the near end is wrong for all four as well — but
the Check still reads three moments and not two, because a rule computed ONCE is
right wherever it was computed and wrong everywhere else, and one moment cannot
tell the two apart. **That same fact is why the `eater-map` Check has to lift the
projection to read a Card's SCALE**; the scale section above has it.

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
of it the part is on, so **#191 moving the Points from the near side to the far
side cost `leaders.ts` nothing**: the shoulder turned round on its own, and the one
declaration it needed — which edge of the ROW the hook stands on — is a composition
decision and is in the stylesheet. The `points-left` Variant, which argues the
direction back, needs the same one declaration and no arithmetic.

### And each rule ends in two dots

A **lit** one on the part, and a smaller one at the shoulder where the rule turns
(#191). The reference's own lines begin in empty space and one of them ends
nowhere; the dot is what says *this, here, is the thing the number is about*.

**They are VERTICES OF THE RULE and not a second opinion about where it goes.** The
lit dot is written from the polyline's own last point and the shoulder dot from its
middle one, so "the rule ends in a dot ON the part" is true by construction rather
than by two calculations agreeing — which is what the `eater-map` Check asserts, at
all three moments of the Lift, beside the rule itself.

**Each radius is a Token spent by the stylesheet and GATED ON THE CENTRE the script
writes.** An SVG circle with no `cx` sits at the overlay's own origin, so a radius
written unconditionally would paint four dots stacked in the composition's top-left
corner for a reader whose scripts never arrived. `r`'s initial value is 0 and a
circle of radius 0 renders nothing, so `[cx]` in the selector is the same promise
the polylines already make — they carry no `points` until a script comes, and paint
nothing until then.

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
projection, on the distance the pieces draw apart along the plane, and on a stage
that is a composition row's remainder — and below 1100px a column has none of the
three to give. So the drawing puts itself away: **the Slab lies flat and runs to
both edges of the window, and the four features are an ordinary list under it**
(#179).

**It cost almost nothing to build, and that is #177's inversion paying out.** The
markup already rests in the finished composition, so the collapse is rules on the
resting state and not a second arrangement a script assembles: `--eater-map-lift`
back to 0, `--eater-map-solid` to 0, `transform: none` on the plane, a negative
margin on the stage, and a Slab given the whole of it.

**`--eater-map-solid` IS THE FLAG #189 ADDED, AND IT IS THERE FOR THE SAME REASON
`--eater-map-collapsed` IS.** The Slab's depth stopped being a term of the
playhead, so `--eater-map-lift: 0` no longer takes it away — and an edge is
something an Exploded View has, not something a full-bleed picture at the top of a
column has. The stage multiplies its depth and its radius by this, so the whole
solid closes up to the flat picture down here and opens again on a resize back
into the band without anything being re-mounted. It is declared in the component's
`<style>` and never in `tokens.css`, because it is a regime and not a number the
author chooses.

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

**`transform: none` WAS BELT AND BRACES AND IS NOW THE ONLY THING SAYING SO.**
While every angle was a term of `--eater-map-lift`, the 0 above already flattened
the plane and this said it outright for the things that READ the drawing rather
than look at it: `perspective()` with nothing to project still computes to a
matrix3d, and the Cards stood in a `preserve-3d` rendering context, so the
leader lines, a Variant and a Check would each have been interrogating a
projection that happened to be flat. The rendering context is gone since #207 and
the point is not: a rotation of 0 is still a rotation, and `none` is what makes
the drawing say so. Since #189 the attitude is a constant the
playhead does not touch, so **without these two declarations a column below the
band would carry a Slab tilted 52 degrees**. The playhead is still set to 0 beside
them, because it is spent on the Cards' glass as well as on their geometry.

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

**THE EDGE IS THE SHIPPED PAGE'S NOW (#189).** `chosenEdge` defaulted to `flat`
while the thickness was a comparison nothing shipped, so the Portfolio drew a
picture with no depth at all and three Tokens the Editor offered the author moved
nothing. It defaults to `thick`, and `flat` is what the collapse reaches through
`--eater-map-solid` rather than through this name. **#182 IS NOT ANSWERED BY THAT
AND WAS NOT MEANT TO BE**: what changed is that the page asks for an edge, not
which renderer draws it. `--eater-map-slab-thickness` is 0.03 — it was 0.1, which
is a tenth of a phone's width and a paving slab — chosen by looking on the sheet.

### The plan corner and the fillet are two Tokens (#200)

They were one, `--eater-map-slab-edge-radius`, clamped to the thickness by both
stages — and the clamp was on the wrong number. An edge cannot be rounder than it
is *deep*, which is true of the **fillet** and says nothing at all about the plan
corner: a phone has a 17px corner on an 11px shell. Held together at 0.02 the
outline could never be rounder than 0.03, and the object read as a bar of soap.

**The squareness was the smaller half of it.** Every slice is cut to
`plan corner − its own inset` and the fillet's insets run out to the fillet, so
with the two EQUAL the innermost ring's corner came out at `0.02 − 0.02 = 0`. The
roll went square exactly *at the corners*, the normal turned through ninety
degrees in one step there, and the hard light/dark break that produced ran round
the object like a strap. That is what "strongly wrapped around" named, and it is
why raising the one Token could not fix it — at any value the innermost ring is
still square, because the two are still the same number.

So: `--eater-map-slab-edge-radius` is the **plan corner**, 0.045, which is the
mockup's own `.045`; `--eater-map-slab-fillet` is the **roll**, 0.006, and it is
what the thickness now clamps. Both stages carry both — `min()` in `stage-dom.ts`,
`Math.min` in `stage-webgl.ts`'s `Slab.write`, whose sweep generalises from
`plan sin φ` to `plan − roll(1 − sin φ)` and is the old arithmetic at `roll = plan`.

**The fillet is a third of the mockup's, and that is not a disagreement with the
reference.** The mockup's face carries the full plan corner with NO inset, so its
picture runs to the outline and hides all but the last sliver of its own 6.3px
roll. This stage gives that band up honestly — `stage-dom.ts` clips the picture
back by exactly the fillet, and rounds the clip to `plan − fillet` so the map does
not hang square corners off a rounded solid — so the whole roll is on screen and
the number that *looks* like the reference is a third of the one that made it.
Rendered at four values against the reference before choosing. Copying the
mockup's clip instead would draw map pixels outside the solid's own cross-section
at z = 0, which is the overhang #200 said to reproduce honestly rather than copy.

### The map wraps the edge, and DOM reaches it (#206)

The author's correction to #200: what was wanted was **the map wrapping slightly
round the edge, not the edge wrapping round the map** — a phone with a curved
screen, all the way round. That is `wrapped`, which `stage.ts` has named since
#181, and it is the shipped default now.

**The only difference between `thick` and `wrapped` is what the FILLET is painted
from**, which is exactly what `stage-webgl.ts`'s `faces()` has always said: the
geometry is identical and the WALL is edge colour either way. A screen curls over
its own shoulder; the side of the phone is still aluminium.

**Running the picture onto a ring is two percentages and `center`.** A slice's box
is the face's box inset by `a` on all four sides, and the picture covers the face —
so the two rectangles are **concentric**, the mapping is a pure scale about their
shared centre, and the offset a `background-position` would otherwise have to carry
works out to exactly 50%. Only the size is left, and a `background-size` percentage
resolves against the slice's own box, so both factors are pure numbers:
`1 / (1 - 2u/W)` across and `1 / (1 - 2u/H)` down. `edge.ts`'s `wrapped()` is the
whole of it. `u` is the same texture inset the WebGL stage walks —
`roll(1 - 2phi/pi)`, the band spread evenly along the arc — so the two stages read
the same pixels onto the same ring.

**So the sheet has no empty cell any more, and #182 is the narrow question it was
always meant to be.** `REACHES` says `dom: ['flat', 'thick', 'wrapped']`. What is
left is whether a faceted 24-slice fillet is distinguishable from a swept one — and
this now has a measured answer rather than a guess: **it depends on the roll, and
the crossover is about 0.015.** The rings carry the picture at a rigid scale each
while the geometry steps by `sin` and the pixels are spread evenly along the arc,
so consecutive rings do not quite meet. At 0.012 that is invisible at actual size;
at 0.020 it reads as a comb across anything with a hard edge in it — a restaurant
pin at the Slab's foot is where it shows first — while WebGL's swept fillet stays
clean. Laddered at 0.006 / 0.009 / 0.012 / 0.020, both stages, at actual size and
not only zoomed.

**`pnpm check -- --edge thick` is the second axis**, added with this and mirroring
`--stage` exactly, because both stages reaching all three edges is what made "every
Check passes whatever the Slab is made of" a claim the suite can be asked to make.
All six combinations pass. `--edge flat` SKIPS the edge group with a printed note
rather than failing it: a picture with no thickness has no slices by design, and
only a stage that mounted writes the attribute that says so — which is what keeps
that skip from swallowing "nothing came up".

**And the Check asks it both ways round.** Under `wrapped` every one of the Slab's
fillet rings must carry the picture; under `thick` none of them may; and a Card's
glass is never wrapped whatever the Slab is. Both directions verified by mutation —
a `wrapped` edge silently drawn as `thick` fails, and a `thick` edge silently
wrapping fails under `--edge thick`.

**And a Check keeps the split split.** `CORNER_SURVIVES` reads the widest and the
narrowest corner anywhere in the Slab's slice stack — the plan corner off a wall
slice, and what is left of it on the fillet's innermost ring — and requires the
second to be at least a quarter of the first. It measures 67% drawn and 10% with
the two Tokens set equal, which is the state this Section shipped in, so dragging
either onto the other in the Editor fails the build rather than quietly putting
the strap back. It reads the SLICES and not the Tokens, which is the opposite
source from the corner probe and for the opposite reason: that one asks where the
composition says its corner is, this one asks what the stack actually drew.

**The `eater-map` Check's corner probe reads the plan corner and no longer
clamps it.** The share is unchanged and so is the point it names — half a radius
out from the corner's arc centre. Measured while it moved: every corner finds a
slice at 0.3 through 1.0, and 1.6 puts the probe outside the outline and reads
three of the four as open, which is what says the assertion can still fail.

**"Stage" means two things in this Section, and both are the tickets' own word.**
`.eater-map__stage` is the grid area the drawing stands in — the middle six of
twelve columns since #191, and row two's remainder before it — and `stage.ts` is
the renderer boundary #177 asked for and #181 put a
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

**AND THAT IS WHY THE SLICE STACK IS `edge.ts` AND NOT `stage-dom.ts`'s (#190).**
The Cards are given thickness by exactly the same arithmetic as the Slab, and they
are given it under BOTH stages — because they are always DOM. Left in the DOM stage
it would have been either a second copy of the geometry or an import out of one of
two implementations, and a second copy is one boundary answering a Token two ways,
which is the confound the sheet exists to remove. So `stage-dom.ts` is a thin
caller: it says which Tokens the Slab's solid is made of and that the picture is
clipped back to the flat face, and `edge.ts` builds the slices for it and for
`glass.ts` alike. **#197 is what made that pay.** The shading is one
`conic-gradient` function and one light, so the Slab and all four glass surfaces
are lit alike for the price of one line — and two copies of it would have been two
lightings on one drawing.
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

### The camera is the same camera, arithmetically, and it is orthographic

`EaterMap.astro` writes `rotateX(T) rotateZ(S)` and nothing else — no
`perspective()`, so nothing converges (#189). Matching that in three.js is three
facts and no eyeballing:

- **Both angles cross negated.** CSS's axes are x right, y **down**, z toward the
  reader; three's are x right, y **up**, z toward the reader.
- **The order needs no thought.** A CSS transform list applies right to left, so
  the swing happens first; three's default Euler order composes `Rx·Ry·Rz`, which
  is the same thing said the other way round.
- **The projection is an `OrthographicCamera` whose frustum is the canvas in CSS
  pixels**, which is one CSS pixel to one CSS pixel with nothing to correct
  afterwards. It was a `PerspectiveCamera` with `fov = 2·atan(canvas height / 2P)`
  matched to the CSS camera's own distance, and **a very long lens is not this** —
  that is the same fact the `projection-isometric` Variant exists to show, and it
  is why the field-of-view match had to be replaced rather than stretched.

Measured rather than asserted: the two stages draw the map, the outline and the
edge band in the same place, within a pixel of antialiasing at each edge. The
Cards, which are still on the CSS plane, land on the drawn map because the drawn
map is where the CSS plane says it is.

**The canvas is outside the rotation and bigger than the Slab.** A `<canvas>`
inside `.eater-map__plane` would be turned by the CSS rotation and then again by
its own, so it is a sibling — and a tilted Slab with a thickness reaches outside
the box the flat picture fitted, so the canvas is grown to the extent the
projection actually needs. That extent is **computed and not guessed**: the eight
corners are projected and the box is taken from them. It used to be the union over
five moments of the Lift, because the extent was not monotonic in the progress
while the plane turned and the camera pulled back; one attitude and no camera is
one box.

### What the comparison found

```bash
pnpm stages
```

renders it into `design/stages/index.html` — two stages crossed with what each can
make the Slab's edge out of, in both themes, at both ends of the band, shot at the
raised end of the Lift in the real page. `--progress 0` renders the Lift's near
end, which since #189 is the same Slab with the Cards down: the two stages should
agree exactly at both, and do.

|         | flat                 | thick                       | wrapped |
| ------- | -------------------- | --------------------------- | ------- |
| `dom`   | a picture with no depth | 24 sliced layers, each lit round its own perimeter — **the shipped page** | — |
| `webgl` | one textured quad    | an extrusion, edge in paint | the captured pixels running over the fillet |

**The empty cell is a result and it is NOT #182's answer**, which is the one thing
about this table that has been got wrong. DOM has no extrusion, so a thickness in
it is the solid **sliced**: each slice one flat element standing where that section
of the solid stands, inset and rounded by exactly as much as the fillet is at that
depth. Where it stops is that a slice cannot carry the **picture**: the captured
pixels end at the flat face and the edge is paint.

**"A slice is one element with one background, so it cannot be brighter on the side
facing the light" WAS THE SECOND HALF OF THAT, AND #197 DELETED IT.** It was false.
An element has one background and a `conic-gradient` VARIES a background around a
box, which is the one variation an edge needs — so every slice carries one stop per
point of its own perimeter, each mixed by the shade of the direction the edge faces
there. The fillet is faceted in DEPTH and smooth in PLAN, and only the picture is
out of DOM's reach now.

**WHAT DOES NOT FOLLOW FROM THAT IS THE RENDERER.** #189 was specified on the
grounds that DOM cannot run captured pixels round a fillet, so the WebGL stage was
decided — and the second half never followed from the first. A slice is a FULL
PERIMETER, so its corners are the same element as its sides: the silhouette and
the rounded outline are right, and the corner is closed. What is left to judge is
narrower and is a thing to look at rather than argue about — **whether a faceted
24-slice fillet is distinguishable from a swept one at the size the Slab is
actually drawn**. That is judged on the sheet, on its own merits, and #182 is open.

**FOUR HINGED WALLS IS THE BUILD TO AVOID, and it was #189's own prescription
before it was corrected.** A wall hinged along one edge of a rounded rectangle has
to be inset by the corner radius at BOTH ends, so four of them leave four empty
notches — 17.1 x 11.4px on a 380px Slab, which is the author's "the corners are
missing". The slice stack has nothing to leave out.

**The finding underneath the finding, and #189 moved it.** It used to read: at this
Section's own camera the side WALL is nearly edge-on, so a thickness shows up
almost entirely as the FILLET — at 2560x1440 the Slab was 478 wide, the tilt 26°
and the eye at 2.3 Slab-widths, the bottom edge subtended 23°, and the back of the
Slab landed **2.9px** below the front. **That is why every earlier attempt at an
edge looked fake, and it is no longer the arithmetic.** The projection is parallel
and the tilt is 52°, so the bottom wall projects to `thickness x sin 52` of the
Slab's width — 11.3px at 2560x1440 and 6.7px at 1440x900, with no dependence on
where the edge stands in the frame. There is a real wall to draw now as well as a
fillet, and #197 shaded both. The first DOM fake written here had no
fillet at all — a stack of full-size layers behind the picture — and changed 754
pixels out of 1.8 million against the flat frame, which read as a broken stage and
was an honest rendering of a straw man.

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

### The edge has a direction, and one page-fixed light gives it (#197)

`edge.ts` runs the light round a perimeter and `stage.ts` is where the light stands.
Between them they are what makes an extrusion read as an object rather than as a
grey band, and six things about them are expensive to rediscover.

**A straight side is FLAT and that is correct.** Both endpoints of a side carry the
same outward normal, so the gradient does not vary across it — a flat side's normal
really is constant. The ramp happens only across a corner's angular range, which is
why the shading is EXACT for the four sides and an approximation only round the
fillet. Measured on the Slab: each corner sweep subtends about 1.3° of the conic
angle, because the plan radius is 7.9 phone-pixels against a box 393 wide.

**A SQUARE corner is one hard stop, and that is correct too.** Two coincident points
carrying two different normals, which is a hard transition in a conic gradient
because there is no arc to run a ramp along. Not hypothetical: the details sheet's
plan corner is `28px 28px 0 0` in `cards.css`'s own words, so two of its four
corners take that branch. **This is also the one thing the Check got wrong first** —
it measured the largest step between consecutive stops and that surface read 100%
of its spread while looking perfect. A step between two stops at the SAME ANGLE is
skipped now, which is what tells a hard CORNER from a shading that steps.

**The gradient is EXACTLY scale-invariant, which is what lets it be computed once
at mount.** Every stop's angle is `atan2(x, −y)` of a point whose coordinates all
scale together, so multiplying a width, a height and the radii by one factor leaves
every angle identical. Verified at the three widths the Slab is drawn at — 220, 380
and 478 — which produce **one** gradient string and not three, and asserted by
comparing two mounts at the two ends of the band: all 120 gradients come out byte
for byte. So there is no measurement, no `ResizeObserver` and nothing to redo when
the window changes size. Rounded to whole pixels the aspect drifts and the worst
stop moves 0.0627°, which is why an outline is stated as proportions and never read
off the drawn box — and why a Card's plan is **not** divided by its boost while
every length beside it is.

**The light stands on the PAGE and not on the object, and that is the correction.**
It was two constants in the Slab's own axes, which means turning the object dragged
its light round with it. The local normal is carried into screen space by
`Rx(tilt)·Rz(swing)` — CSS's own order, CSS's own axes, y DOWN — before it is
dotted. `extrude` reads both off its own HOST rather than taking them as a
parameter, because every caller is inside `.eater-map` and custom properties
inherit: there is then no way for two callers to be handed two lights.
`--eater-map-light-azimuth`, `-elevation` and `-ambient` are Tokens; `stage.ts`
carries fallbacks so that a Token nobody can read cannot make one `NaN%` invalidate
a whole `background` declaration and leave a transparent edge, and **nothing keeps
those fallbacks equal to `tokens.css`** — they are a floor under a degenerate page,
not a second home for the value.

**ONLY TWO OF THE FOUR SIDES CAN BE LIT AT ONCE.** Opposite sides of a rectangle
carry exactly opposite normals, so their dots against the light are exact negatives
and one of each pair is always clamped to the ambient. At 52°/33° with the light at
315°/38° the Slab's four sides come out at shade 0.42 / 0.42 / 0.665 / 0.646 — head
and right flank at the ambient, foot and left flank lit. **That is not a bug and it
is not a gap in the shading**: it is also which two flanks the reader can SEE. A
wall is visible when its screen normal points at the reader, which is the right
flank (`sz = +0.43`) and the foot (`sz = +0.66`). So "every side a different
brightness" reads as the sides DIFFERING, and what the drawing shows is a lit foot
against a darker right flank.

**The Check reads those as WCAG luminance and never as a channel mean**, because
`scripts/checks/lib/colour.mjs` owns the one number three bytes become and says why
in a sentence. Off `#9a948a` the Slab's four sides measure 0.0488 / 0.0488 / 0.1243
/ 0.1170 — 60.7% apart, largest step 22.3% of the spread — and off the Cards' own
edge colour all four glass surfaces measure 0.0772 / 0.0772 / 0.2116 / 0.1981, 63.5%
apart. All of it is printed as notes on a passing run, so a reader of the log can
tell a comfortable pass from one sitting on a threshold.

**Where the gradient is expensive.** Twenty-eight perimeter points and a closing
stop is about 2 KB of inline style per slice — so 47 KB for the Slab and about
400 KB across the page's 144 slices. That is runtime DOM rather than shipped bytes
and costs the page nothing to load.

**It was not only priced against a rebuild, and that is what this paragraph used to
say.** Every stop named the Token, and a declaration containing a `var()` anywhere
in it is a *pending-substitution value*: the browser holds it as unresolved tokens
and re-substitutes and re-parses the whole declaration on every style recalc of the
element. So the price was not paid by whatever rebuilt an edge — it was paid by
anything that recalculated the document, and the Kernel writes `--turn` on the root
on every frame of a page turn, which recalculates all of it. Four thousand
`color-mix()`es per frame, on a Section that is not even on screen while the reader
crosses from the Front Screen to the Gallery.

**The Token reaches the drawing through `currentColor` now**, which is not a
variable: the slice carries `color: var(--eater-map-slab-edge)` — one short
declaration to substitute — and every stop mixes towards black from there. The
drawing is identical (a screenshot either side of the change differs by at most one
level in one channel, on no pixel above that), the Token is still live in CSS, and
the `eater-map` Check still asserts both — it reads the Token off the slice's own
`color` rather than out of the gradient. Measured at 1536x760 on a real GPU, four
runs each interleaved, worst style recalc of a turn and p90 frame time with it:

| turn | before | after |
| --- | --- | --- |
| into the Gallery | 36ms / 36.6ms | 29ms / 30.5ms |
| into the Eater Map | 28ms / 24.4ms | 19ms / 18.3ms |
| back off it | 32ms / 36.6ms | 20ms / 24.4ms |
| back to the Front Screen | 36ms / 30.5ms | 27ms / 24.4ms |

`border-radius` is written once rather than four times where the four corners are
one value, for the same reason and a smaller share of it.

**What is left of it is the lengths**, which are still expressions naming Tokens
(#196 is why) and are therefore still substituted per recalc — six declarations a
slice now that #207 has given the depth one too. Resolving those to numbers as well
is the other half of the win and it is a big half: 26ms → 16ms into the Gallery,
20ms → 10ms coming back off this Section, measured the same way. **What it costs is
a redraw on every resize**, which is the thing `stage-dom.ts` says these expressions
exist to avoid — so it is a decision and not a tidy-up, and #182 may moot it by
taking this stage out entirely. Not done, and stated here with its price so the next
reader is choosing rather than discovering.

### The shading follows a dragged Token, under the Editor and nowhere else (#196)

`redraw.ts`, and it is forty lines because almost nothing was missing. **Every Token
a STYLESHEET consumes has been draggable since #144**: the Editor previews by
putting one declaration into a sheet of its own, and every `calc()` naming that
Token is re-evaluated by the browser — which is why `edge.ts` states every length as
an expression rather than as a number, and why the thickness, the radii, the colour
and the whole collapse below the band already moved under a drag.

**The shading is the one exception and it is the only one.** A slice's
`conic-gradient` is arithmetic on the light, on the plane's attitude and on the
outline, and arithmetic done at mount does not move — so `--eater-map-light-azimuth`
was a real Token that wrote its file and left the drawing alone until a reload,
which reads exactly like a broken Token and is not one.

**The seam is the Editor's own preview sheet, so nothing was added to the Editor.**
It is how a drag reaches the page at all; a `MutationObserver` on it needs no
cooperation and opens no route by which anything can be written (ADR 0004). A
release still writes the Token to its file the way every other Token's does.

**What the two Checks compare is not one set but two, and the split is the
criterion.** The SLICES have to change when the light moves, asked per surface,
because the Cards are not a stage's and a redraw wired to one side leaves the other
lit by the light the page loaded with while every whole-page count agrees with
itself. EVERY GENERATED ELEMENT has to be unchanged after a drag out and back — the
slices and the blurred copies of the map both, because `mountGlass` clears the two
on consecutive lines and a comparison counting only slices would let a regression in
the second clear double the copies per drag with nothing to fail. A copy of the map
is not lit by the light, so requiring it to MOVE would fail a correct drawing:
that is why it is in the second set and not the first.

**The thickness needs no assertion of its own, and that is a judgement.** It reaches
the drawing two ways, and neither is specific to it: every slice's depth is a CSS
expression naming it, which the browser re-evaluates with nothing observed at all,
and the gradient's outline goes through the same signature and the same redraw the
light's assertion already covers. What is left that is only the thickness's is the
`min(radius, thickness)` clamp — and a Slab dragged THICKER leaves that clamp
exactly where it was, so an assertion built on it would have to drag the row to zero
and would then fail the day the author chose a square-edged Slab, which is a
legitimate value. A blocking Check that fires on a Token nobody set wrongly is the
one thing the suite may not do.

**The gate is what makes it free, and it is asserted from both sides.** A page with
no Editor attached installs no observer, reads no Token and never calls the rebuild
— `[data-editor]` is the Editor's own footprint, and the `editor` Check already
fails a built tree that carries it. The `eater-map` Check performs the Editor's own
preview gesture on a page with no Editor and requires that not one gradient moves;
the `editor` Check drags the real control on a real page and requires that every
extruded surface follows it, out and back, with the same number of elements and the
same strings the mount wrote. **Either half alone passes for a mechanism that never
runs at all**, which is why there are two.

**The signature is every `--eater-map-` declaration the Editor is previewing, and
deliberately not the eight the drawing is generated from.** Those eight are spread
over four files — `stage.ts` reads the light, `edge.ts` the attitude, `stage-dom.ts`
the Slab's thickness and radius, `glass.ts` the Cards' — so a list in `redraw.ts`
would be a fifth copy of them, and a list gone stale fails as a Token that drags and
moves nothing, which is the exact bug this removes. What the broader signature costs
is a wasted rebuild when a Token the geometry does not read is dragged, and a wasted
rebuild is only a rebuild: both callers clear before they build.

**One frame, and never one per mutation**, which is how the quarter of a megabyte
above is priced. The Editor rewrites its sheet on every move of a slider; the
rebuild is coalesced onto the next frame and skipped when the declarations have not
actually moved. **And what is observed is the Editor's sheets and nothing else**, so
the rebuild's own mutations — a hundred and twenty slices, and `glass.ts`'s offscreen
ruler going onto the body and off it again — are not records this ever acts on. That
is what makes the loop impossible by construction rather than broken by the
signature.

**`clearEdge` is per HOST and that is #197's inherited bug, now spelled once.** A
Card with two glass surfaces has two stacks under one host, so a clear written
per box deletes the first surface's slices as the second is built and the survivor
looks perfect. The Slab is rebuilt too now, so there were two callers and two
spellings of a clear is how one of them ends up per box again.

**Five mutations, all caught**, and the last two are the ones worth knowing, because
each fails as something other than itself:

| mutation                                        | wanted | got |
| ----------------------------------------------- | ------ | --- |
| the gate lifted — the observer for every reader | fail   | fail: 120 of 120 slices repainted on a page with no Editor, and the marker on the Section |
| `redraw.ts` never mounting                      | fail   | fail: `data-eater-map-redraw="(not wired)"` under the Editor |
| `clearEdge` taken out of the Slab's draw        | fail   | fail: the slab edge 24 → 48 slices on one drag, and 172 generated elements out and back against 124 |
| the DOM stage returning no `redraw`             | fail   | fail: all 24 slab slices painted as they were, and the four Card surfaces still following |
| the GLASS clear disabled, the slices' left in   | fail   | fail: 132 generated elements out and back against 124 |

The fourth is why the Check asks **per surface**: the Cards are not a stage's, so a
redraw wired to the stage alone — or to the Cards alone — leaves half the drawing lit
by the light the page loaded with, and every whole-page count agrees with itself.

**The fifth passed until the comparison was widened, and it is the shape worth
remembering.** `mountGlass` clears the slices and the blurred copies on consecutive
lines; the Check compared only slices, so a regression in the second clear doubled
the copies of the map per drag and read as a clean redraw. The criterion is the same
number of ELEMENTS, and one line of the clear was outside what was being counted.

### Three things about the WebGL stage that are decisions

**The topology is fixed and the positions are rewritten in place.** The thickness
is a Token, so a drag in the Editor moves it every frame of the drag; only the
index buffer says how the surface is joined up, and that is a function of two
counts and of nothing the composition can change. So the buffers are allocated
once and refilled.

**A frame loop, not a subscription.** The drawing turns on four Tokens, on
`--eater-map-solid`, on the Slab's box and on the page's theme — and a custom
property is the one thing on that list nothing will tell you about. There is no
event and no observer. So the frame reads them, and a signature of every input is
what stops a page that is not moving from drawing at all. It also means a Token
dragged in the Editor moves this drawing on the next frame exactly as it moves the
DOM stage's. **`--eater-map-lift` is not on that list any more (#189)**: the Slab
does not move, and the Cards were never this stage's.

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
| `cards.json` | the manifest: the Eater commit, the restaurant, the export viewport, each Card's file and measured size, and the results panel's row cap |
| `cards.css` | every rule the three `/export` surfaces use, re-homed under one host |
| `search.html`, `lines.html`, `details.html` | one Card each, as markup |
| `results.html`, `results.css` | the fourth surface and its own stylesheet, off a second run of the same collector against the running app (#194) |

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

## The masthead is PROJECTS, in the Gallery's own box

**The same word, at the same size, at the same place on the screen** (#191). The
Panel's masthead and this one are read at their own Section's resting place and
compared by the `eater-map` Check — position, line height and the word's own ink —
so nothing about the agreement is typed and the day the landing measure moves both
move together.

**How the box is hit, and it is two declarations.** Inside the band the size is
`--landing-mast-size`, which is what the Panel's own masthead is a function of; and
the Section's top padding is `--landing-top` less `--landing-mast-top`, which is
where the masthead's BOX goes given that `--landing-top` is where the word's CAP
TOP comes to rest. That is exactly what the Panel spends `--projects-panel-lift` on
— its port sits that far above its Section's top edge and its masthead's box sits
on that edge — and this Section's port IS its top edge, so the same distance is its
padding. The other half of it is across: the composition starts at `--landing-side`,
where the Panel's inner starts and where the word stands on both screens. That was
a grid column of that width with nothing after it while this Section drew a Rail
of its own, and it is the Section's own `padding-inline` since #192 made the Rail
the Kernel's — same left edge, one fewer box, and anything at all between the two
would push the word right of the word it is meant not to have moved from.

**Three numbers are still Tokens and agree by VALUE**: the leading, the weight and
the tracking. A Section may read the Kernel and nothing else, and the Kernel
carries the landing's size, cap and drop but not those three — so they are the
Panel's own values written a second time, and the box comparison is what fails a
drag out of agreement. #193 makes the page's PROJECTS one element and takes the
restatement out with it.

**It is a second DRAWING and not a second Cut Title, and that distinction is #172's
answer still standing.** #172 asked what a second Cut Title would cost — PROJECTS
is cut off the Front Screen's foot into the Projects Panel masthead's slot, and a
second one would be cut off the Panel's foot into this Section's — and the answer
was about 9% of the Panel's composition at every window a browser actually has, and
the whole of the marble's corner at every window in the band. `src/kernel/NOTES.md`
carries the four windows it was measured at. Nothing is cut into this slot; the
word is simply drawn here as well, and the Panel's own masthead is still
`visibility: hidden` because the CUT word is already that Section's head.

## The serif title, and why two ratios need a script

Under PROJECTS stands the project title: four authored lines, near-white, in
`--face-year` — Source Serif 4, which is the reference's own register and which the
`sub-source-serif` Variant was arguing for before #191 adopted it.

**Its two numbers are RATIOS AGAINST THE MASTHEAD'S INK and not lengths.** The cap
height is `--eater-map-title-cap` of PROJECTS' cap; the first cap top sits
`--eater-map-title-drop` PROJECTS cap-heights below the masthead's BASELINE. Both
are the reference's, measured off it, and both are Tokens.

**A stylesheet cannot spend either of them, and the reason is the whole of why
`title.ts` exists.** A ratio between two CAP HEIGHTS is not a ratio between two
font sizes: the masthead's grotesque draws 0.7006 of its em as cap and this serif
0.6702, so `font-size: calc(0.566 * <the masthead>)` lands the cap ratio at 0.5414
— 4.3% low — and drifts further the day either face is replaced. And the drop is
measured from a BASELINE, which is not an edge of any box on the page. So both are
measured at runtime: the cap off a canvas set to the element's own computed font,
the baseline off a zero-sized inline-block, which is the one thing on a line box
whose bottom edge IS the baseline.

**The ink is read at a REFERENCE SIZE and scaled, and that was not the first
attempt.** `actualBoundingBoxAscent` is quantised to the rasteriser's grid, so read
at the size it is drawn at the serif's cap came back 1.4% out at the band's short
corner — a third of the whole difference the assertion exists to see, and enough
that a Check tight enough to fail a typed size would have been failing the measured
one. Cap height is linear in font size for a static face, so one reading at 1000px
divided by 1000 is the face's ratio to five figures and every size follows exactly.
Measured at four windows across the band afterwards, both ratios come back exact to
three figures.

**What a reader with no script gets is a whole title about four per cent small.**
The stylesheet's fallbacks apply the cap ratio to the masthead's SIZE and put the
first LINE BOX where the first CAP TOP belongs — honest, complete, and far enough
from the measured answer that the Check tells them apart.

**And below the band the script writes NOTHING**, which is not an omission. The
collapse is one composition for three readers, one of whom runs no script (#179),
and both of these lengths move the title's box — which in a one-column page moves
every block under it. So down there the fallbacks are the answer for everybody, in
a regime where there is no Gallery box for a share of a cap to be a share OF. The
module removes both properties rather than leaving them standing, because a window
dragged across the boundary would otherwise carry the band's two lengths into the
collapse and hand the scriptless reader a different column from everybody else.

## Which of the Kernel's lengths this Section reads

**This Section JOINED the landing measure in #191, and that is a change of
decision rather than a drift.** It used to read two of the Kernel's lengths and no
more — `--landing-inset` for the page's top margin and `--landing-side` for its
left one, so the third screen's white agreed with the second's and the two Rails
the page then had stood in one column — and this heading used to say, at length,
that reading those two was
deliberately NOT joining the measure: the measure is `--landing-w`, `--landing-cap`
and `--landing-mast-top`, the width two Sections have to agree about *because a cut
word has to land in a masthead's slot*, and this Section had no cut word.

It has the Gallery's WORD now, in the Gallery's own box, so it is a function of all
three: `--landing-mast-size` is the masthead's size in the band, and `--landing-top`
less `--landing-mast-top` is its top padding. `src/kernel/NOTES.md` calls a third
Section joining that list a decision rather than a convenience, and #191 is that
decision — taken because the word standing still between two screens is the thing
#187 asked for and #193 finishes.

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

## The Variants, and the two groups #189 and #191 moved the ground under

Eight, in three groups, and `variants.css` carries the argument for each. Two are
the text composition's own — where the four points stand, and how loud the ladder
is. The other six are the two questions #180 asked to be judged by eye rather than
described: the **projection**, and the **project title's face**.

**TWO OF THE THREE GROUPS TURNED ROUND IN #191, and a Variant group holds the
LOSERS.** The points ship on the far side now, so the direction kept as a Variant is
`points-left` where it was `points-right`; and the title ships in Source Serif 4 —
which is what `sub-source-serif` was arguing for — so the face group is
`title-host-grotesk`, `title-vollkorn` and `title-spectral`. Renaming them to argue
the other way is what keeps the record of the comparison readable rather than a
list of things nobody would now propose.

**The projection group used to be invisible at the sheet's default moment and is
not any more.** `pnpm variants` shoots at `--progress 0`, and progress 0 was the
flat screenshot — the plane lying flat, every Card's depth at 0, every projection
agreeing about what that looks like — so the whole group came back marked
*identical* and the strip said nothing. Since #189 the attitude is not a term of
the Lift, so the Slab stands at it at every moment and the default shot compares
the projections properly. The raised moment is still worth asking for, because it
is where the Cards are off the map:

```bash
pnpm build
pnpm variants -- --sections eater-map --progress 1
```

**NO ANGLE IN THE GROUP IS SPENT BY THE LIFT ANY MORE, and that inverted too.** It
used to be a rule that every Variant multiplied its angles by `--eater-map-lift`,
exactly as the composition did, so a Variant changed where the Lift ARRIVED rather
than where it started. The composition's own attitude is a constant now, so a
Variant that kept the multiplier would be arguing about the projection AND about
whether the Slab moves.

**WHAT THE GROUP COMPARES NOW, WHICH IS NOT WHAT IT COMPARED BEFORE.**
`unselected` was a converging camera at this Section's own tilt and swing; it is a
parallel projection at 52° / 33°, which is #189's own answer to the question the
group was asking. So the strip re-cuts rather than retires: `projection-isometric`
is the same absence of convergence at the CANONICAL angles — 54.736° / -45°, which
is what makes the three axes foreshorten equally — so it and `unselected` differ in
the attitude and in nothing else. `projection-perspective` is those canonical
angles with a CONVERGING camera, so it and the isometric differ in the projection
and in nothing else, and "converging or parallel" stays a thing to see. That
Variant states its own camera share, because the composition no longer has one to
read; the dolly is not restored with it, since restoring it would make one Variant
argue about two things.

**A parallel projection is a `transform` written without `perspective()`, not a
camera pushed far away** — a large camera only flattens *towards* it and never
reaches it. That was the reason `projection-isometric` had to restate the plane's
whole transform when the composition converged, and it is why it is two Tokens
now: the projection it wanted is the one the composition has. With no convergence
a Card's depth reads as an offset along the plane's normal — which is how an
exploded view is drawn on paper, and since #207 is how the composition draws one:
the offset is written out and there is no third dimension left to carry.

**`projection-collage` restates the Card's whole transform because a rotation has
to go INSIDE the list**, between the translate and the scale, for the same
right-to-left reason the composition's own order is arithmetic rather than style.
It reads the two distances back off the custom properties the composition set on
that element.

**The face group is one declaration each, on purpose.** The reference sets the
project title in a Didone and this Portfolio has none: it has Vollkorn, Spectral,
Source Serif 4 and Host Grotesk, and one of them has to take it. Source Serif 4 is
what the Section ships since #191, so it is `unselected`; the other two serifs and
the sans it replaced are the Variants. The leading, the weight and the uppercase
are held still, and each Variant names the **Kernel's role** — `--face-panel`,
`--face-body`, `--face-label` — rather than a family, because that is the level
those four exist at.

**And the SIZE follows the face without a declaration, which is what made the
comparison fair.** `title.ts` solves the font size for a CAP HEIGHT rather than
setting one, so a face with a smaller cap is drawn larger and every row on the
strip has the same cap standing under the same masthead. It used to be confounded
by whichever of the four happened to have the taller cap at the one size all of
them were given.

**Every one of the eight is kept whichever way the judgement goes.** The losers are
the record of what was compared, which is the whole point of the mechanism.

## The words

All of them are Content, including the one word in the placeholder. The two the
Rail speaks and never prints are no longer among them: there is one Rail on the
page, it is the Kernel's, and this Section held the second copy of its words until
#192 — along with a second copy of its four Tokens, at a size that did not even
agree with the Panel's.

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

**Two things a point draws are NOT Content (#191).** Its number is the ORDINAL,
derived from the list's own order: an `<ol>` whose numbers are typed is two orders
to keep in step, and the Editor would be offering a figure that means "which one
this is". And its ICON follows from the `part` it names — `icons.ts` is keyed by
the part, so the correspondence the schema already holds to one point per part
picks the mark for nothing. Both are `aria-hidden`: the list is ordered, so a
reader listening is already told which of four this is, and the mark says what the
title beside it says.

**The project title is four lines and used to be two.** At 0.566 of PROJECTS' cap
the two authored lines do not fit the column, and four is the reference's own
block.
