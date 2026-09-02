# The Eater Map Section

The Portfolio's third Section and its third resting place: the Showcase for the
Eater restaurant map. It is a text composition with an **Exploded View** beside
it — the captured Slab standing almost isometric in a parallel projection, with
real thickness, and the Eater app's own three surfaces rising off its face
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

Here: the Rail, the masthead PROJECTS, the four authored lines of the serif
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
      .eater-map__cards    the app's stylesheet host, preserve-3d
        .eater-map__card   one depth off the plane's surface, preserve-3d
          .eater-map__slice x24 per glass surface  that surface's own thickness
          .eater-map__face      FLAT, so z-index decides inside it
            .eater-map__glass x1 per glass surface  the blurred copy of the map
            .eater-map__surface   display: contents, and the app's own markup
          .eater-map__anchor    where a leader line ends
```

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
and there is no such thing once the plane is turned under a camera: Chromium hands
the filter an empty backdrop and it becomes a no-op. **At the first degree of
tilt**, not at the first pixel of depth — measured, with the rise, the gap and the
dolly all set to 0 and only the tilt standing, the app's frosted detail panel is
already a sheet of clear glass with a sharp map behind its text. And measured the
other way too, because it was the obvious suspect: `transform-style: preserve-3d`
alone, with every angle at 0, is pixel-identical to `flat`. It is the rotation.

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
the details sheet are one each, and theirs is the vendored root itself.

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

**Measured ONCE, and that is a fact about what is measured rather than an
optimisation.** The Cards are frozen to the viewport they were exported at, so a
surface's offset and radii are the same numbers at every window. Everything that
does change — where the Card sits, how thick its edge is, how far the map is
smeared — is a CSS expression `glass.ts` writes, so a Token dragged in the Editor
and a window carried across the breakpoint both move the drawing with nothing
re-mounted and no observer.

**`preserve-3d` ON A CARD Z-FIGHTS ITS OWN CHILDREN**, which is the mechanism that
cost a render. The copy and the Card's own content are both at `z: 0` under it, so
`z-index` stops deciding between them and the two interleave — in the prototype
that made the details Card read as two smeared panels. `.eater-map__face` is a
`flat` box holding both, and the Card's edge slices are that face's **siblings**,
because a depth inside a flat face is nothing at all.

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

**The app's own `backdrop-filter`s are left alone.** In the band they sample an
empty backdrop and are no-ops, so overriding them would buy nothing; below the band
the plane is flat and they are exactly the frost a screenshot has.

**A reader with no scripts gets the app's own translucency over the map** and no
copy behind it, which is the same trade the Slab's edge and the leader lines make.
It is affordable HERE only because the Cards are dark: a light translucent surface
over a light map was the illegible case that made the plate necessary, and dark ink
on a dark map is not.

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
matrix3d, and the Cards still stand in a `preserve-3d` rendering context, so the
leader lines, a Variant and a Check would each have been interrogating a
projection that happened to be flat. Since #189 the attitude is a constant the
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
is a tenth of a phone's width and a paving slab — and the radius is 0.02, both
chosen by looking on the sheet.

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
`glass.ts` alike. Giving each slice a DIRECTION is #197, and is one line inside
`edge.ts` rather than two lines in two files.
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
| `dom`   | a picture with no depth | 24 sliced layers — **the shipped page** | — |
| `webgl` | one textured quad    | an extrusion, edge in paint | the captured pixels running over the fillet |

**The empty cell is a result and it is NOT #182's answer**, which is the one thing
about this table that has been got wrong. DOM has no extrusion, so a thickness in
it is the solid **sliced**: each slice one flat element standing where that section
of the solid stands, inset and rounded by exactly as much as the fillet is at that
depth. Where it stops is that **a slice is one element and an element has one
background**: the fillet cannot be brighter on the side facing the light, and it
cannot carry the picture. Six faces would not help and neither would six hundred
slices.

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
fillet, which is what #197 has to shade. The first DOM fake written here had no
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
padding. The Rail's column gap goes to nothing for the other half of it: the
composition beside the Rail starts at `--landing-side`, where the Panel's inner
starts and where the word stands on both screens.

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
left one, so the third screen's white agreed with the second's and both Rails stood
in one column — and this heading used to say, at length, that reading those two was
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
now: the projection it wanted is the one the composition has. `preserve-3d` still
carries each Card's depth, which with no convergence reads as an offset along the
plane's normal — which is how an exploded view is drawn on paper.

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
