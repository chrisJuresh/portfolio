# The Eater Map Section

The Portfolio's third Section and its third resting place: the Showcase for the
Eater restaurant map. Today it is a text composition with a box standing where
the Slab will go — the tracer bullet #175 asked for, so that the turn, the deep
link and the Rail's link are real before the drawing exists. #171 is the whole
Showcase and the tickets under it are what fills this box in.

## What is here and what is not

Here: the Rail, a plain masthead, the two authored subheading lines, the copy,
the four numbered points, and the placeholder. Not here, each with the ticket
that brings it:

| not here yet | ticket |
| --- | --- |
| the Slab under it — captured by #173, placed by #176 | #176 |
| the three Cards laid flat and coplanar with it — **vendored already**, below | #176 |
| the Exploded View and the **Lift**, which is this Section's Timeline | #177 |
| a leader line from each point to the part it names | #178 |
| the collapse below the band, once there is a drawing to collapse | #179 |
| the Variants the drawing turns on — the projection, the subheading's face | #180 |

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

## The Cards are here already, and nothing reads them yet

`assets/cards/` is the Eater app's own search bar, rail-lines popup and restaurant
detail panel, taken off the app rather than redrawn (#174). They are here and not
in `design/` for one mechanical reason: `scripts/check-source.mjs` lets a Section
import from **its own folder and from the Kernel and nowhere else**, so this is
the only address the vendored bytes have.

**The component does not import them.** #174's component rendered the three in a
column, which was the right thing while the Section was on no page — it proved the
bytes were readable from a Section. This ticket puts the Section on the page, and
three raw app surfaces stacked in the middle of a Showcase is not a composition.
Where they go is flat and coplanar with the Slab, under one camera, and that is
#176. The placeholder stands where all of it will be.

It is generated. Do not edit it — `design/eater-cards/README.md` is the authority,
and every file there carries a header saying so.

| file | what it is |
| --- | --- |
| `cards.json` | the manifest: the Eater commit, the restaurant, the export viewport, and each Card's file and measured size |
| `cards.css` | every rule the three surfaces use, re-homed under one host |
| `search.html`, `lines.html`, `details.html` | one Card each, as markup |

Three things about them that are easy to get wrong, and #176 needs all three:

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

**One thing that becomes true the day #176 renders them**, flagged by #174 and
still pending rather than resolved: `unpublishable` reads the built page and every
Section that mounted, so from that ticket onwards it scans **another repository's
words** — a restaurant's name, its address, a guide's write-up of it. Nothing in
the shape list matches any of those, and `denylist.local.txt` is the author's own
and not in the repository, so the failure mode is a local term colliding with a
restaurant. The answer if it ever does is a different restaurant in
`design/eater-cards/config.json` and a regeneration — never an exception in the
Check, which is the author's record and not this Section's to argue with.

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
