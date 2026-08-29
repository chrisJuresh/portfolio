# The Eater Map Section

The Portfolio's third Section and its third resting place: the Showcase for the
Eater restaurant map. Today it is a text composition with the **flat Exploded
View** beside it — the captured Slab, and the Eater app's own three surfaces
lying on it so that what a reader sees is a screenshot of the phone made out of a
picture and real text (#176). #171 is the whole Showcase and the tickets under it
are what raises it off the page.

## What is here and what is not

Here: the Rail, a plain masthead, the two authored subheading lines, the copy,
the four numbered points, and the flat Exploded View. Not here, each with the
ticket that brings it:

| not here yet | ticket |
| --- | --- |
| the **Lift** — the tilt, the depths, and this Section's Timeline | #177 |
| a leader line from each point to the part it names | #178 |
| the collapse below the band, once there is a drawing to collapse | #179 |
| the Variants the drawing turns on — the projection, the subheading's face | #180 |

**The flat state is not a step on the way to #177 — it is the frame #177 begins
from and the frame three readers keep.** The Lift animates from flat *towards*
raised, and the raised state is the one the markup will rest in, so a reduced-
motion reader, a reader whose scripts never arrived and a narrow window all get a
finished composition rather than a half-built one. That is why this ticket had to
be right on its own before any motion existed.

`timeline.ts` is therefore a module with no default export, and that is a state
the Kernel's loader has a name for rather than a gap: *a Section with no motion
still mounts, it just registers no Timeline.* The file is still what makes this
Section a chunk the loader fetches on approach, which is the whole of how it
mounts lazily.

**An EMPTY Timeline would not have done, and the reason it would not is not the
one you would guess.** #174 left one — `gsap.timeline({ paused: true })` with
nothing in it — on the reasoning that *an empty Timeline is still a Timeline a
Check can hold and seek*. **Both halves of that are false**, and it survived only
because the Section was on no page and so registered nothing. Put on the page it
fails `moments` twice, measured rather than argued:

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
An empty Timeline is not a placeholder for a Timeline.

So the choice is a Timeline that moves something or no default export at all, and
until the Lift there is nothing honest to move.

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

**The three Cards' corners are Tokens** — `--eater-map-card-<name>-x` and `-y`,
as shares of the Slab's width and height — so dragging one in the Editor moves it
across the picture rather than across the page, and the arrangement holds at every
size the Slab is drawn at. Their defaults are the app's own layout: the search bar
inset at the top, the lines popup right-aligned under it, the detail panel as a
sheet across the foot. `--eater-map-card-scale` multiplies the derived scale for
an author who wants the interface a little larger than life; 1 is the screenshot.

The plane is **clipped**, because a Card hanging off the edge of the picture is a
Card that is not lying on it. #177 will have to lift that clip along with the
Cards.

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
