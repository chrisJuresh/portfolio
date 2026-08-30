# The Eater Map Section

The Portfolio's third Section and its third resting place: the Showcase for the
Eater restaurant map. It is a text composition with an **Exploded View** beside
it — the captured Slab tilted under one camera, and the Eater app's own three
surfaces standing off its face, so that what a reader sees is the app taken to
pieces and made out of a picture and real text (#176, #177). #171 is the whole
Showcase and two tickets under it are still open.

## What is here and what is not

Here: the Rail, a plain masthead, the two authored subheading lines, the copy,
the four numbered points, the Exploded View and the **Lift** that assembles it.
Not here, each with the ticket that brings it:

| not here yet | ticket |
| --- | --- |
| a leader line from each point to the part it names | #178 |
| the collapse below the band, once there is a drawing to collapse | #179 |
| the Variants the drawing turns on — the projection, the subheading's face | #180 |

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

**The last of those passed three times in a row before the Check was written the
right way**, and it is the shape `scripts/checks/NOTES.md` warns about twice: *a
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

## The words

All of them are Content, including the two the Rail speaks and never prints and
the one word in the placeholder.

The copy is the Career Record's `projects/eater-map-site.md`, "Page intro" — its
first two sentences and its last. **Cut, and cut rather than re-written**: every
word is the record's own, in the record's own order. What went is the middle,
which is a list of the same three engineering claims the four points carry with
their figures attached, and saying them twice would cost the paragraph lines it
does not have. Same cut, for the same reason, as the Panel's.

The four points are the ticket's own four, one per part of the Exploded View that
#178 will draw a leader line to. The fourth names the Slab itself.
