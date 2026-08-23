# The Checks

The seam every later Section is verified through. One command builds this tree,
serves it, drives headless Chromium, and asserts what a reader would experience.

```bash
pnpm check
```

```bash
pnpm check -- --no-build --only ground,moments
```

Exit 0 is a pass, 1 is a broken Check or a broken tree, 2 is a runner that could
not start. `--no-build` runs against the `dist/` that is already there, which is
for iterating and nothing else — a Check reporting on a stale build is the one
failure this suite cannot catch about itself.

**On a fresh clone, download the browser once.** `pnpm install` does not: the
`playwright` package carries the driver and not the binaries, and pnpm blocks
install scripts anyway.

```bash
pnpm exec playwright install chromium
```

The runner says so itself rather than throwing about a missing executable, but
that is one wasted run.

## What a Check is, and what it may never be

**A headless assertion about a Section that a person would not notice failing.**
That is CONTEXT.md's definition, and both halves are load-bearing. Something a
person would notice — the page not rendering, a Section missing — needs no Check,
because the author is looking at the running site. What a person does not notice
is a face silently falling back, a 404 on a rung nothing draws yet, a console
error nobody has devtools open for, dark theme drifting light, a Timeline that
stopped moving anything.

**Checks block, they do not warn** (ADR 0006). An advisory check inside an agent
loop is one that gets read and stepped over. The price of blocking is that a false
positive costs the author a prompt — the one cost this whole project exists to
reduce — so the suite stays small and asserts only what a legitimate change cannot
trip.

**No Check asserts that anything looks good.** Taste is the author's, exercised
through Variants and the Editor. A Check measuring a gap, a size, a weight or a
colour against a number somebody chose would fail the next time that number was
chosen differently, which is the activity this repository exists to make cheap. So:

| assert                                       | do not assert                          |
| -------------------------------------------- | -------------------------------------- |
| the ground is light in light theme            | the ground is `#ffffff`                |
| a Timeline moves the element it names         | it moves it 8px                        |
| every declared face loads                     | the masthead is set in Spectral        |
| a Section's words contain no ticket key       | a Section's words read well            |

The bands in `checks/ground.mjs` are wide for this reason, and the measured
numbers are printed on a passing run so a deliberate drift is still visible.

## It serves the tree it was invoked from

`preview_start` serves the main checkout. In a worktree it therefore reports on
`development` while looking like it reported on the branch, and it says nothing
about which — so it is never how a Check is run. `lib/serve.mjs` serves this
directory's `dist/`, on an ephemeral port so two features in flight never collide.

`IntersectionObserver` and `requestAnimationFrame` do not run in the in-app browser
pane at all, which is the other half of the same rule: lazy mounting and motion
cannot be verified there even by hand.

## The twelve Checks

| Check            | fails when                                                                  |
| ---------------- | --------------------------------------------------------------------------- |
| `assets`         | anything the page fetches 404s or never answers, in either theme, with every Effect Stack layer lit |
| `carousel`       | the photograph strip's Timeline is not where the strip is, either end of it comes off the text column, the arrow keys or the focus ring go, the dissolve stops following the Timeline, or the one-screen budget stops affording a photograph |
| `console`        | anything logs an error or throws, including across a theme flip — warnings deliberately not, because on this page they are nearly always Chromium's own |
| `faces`          | a declared `@font-face` will not load, or no face Token names a declared family |
| `front-screen`   | the Front Screen's rhyme, its one-screen budget, the Cut Title's cut or its accessible name, the crossing's span, the switch's ARIA, or the type's place in the Effect Stack breaks |
| `projects-panel` | a control in the Frame leaves the centre its own Token names, the window and its titlebar are cut to two radii, the recording's box stops being inset on three sides, the occlusion of the subheading's second line moves or stops being painted, the titlebar reports a rung it is not made of, the chrome grows a control, the small-Frame reduction starts asking about the window instead of the Frame, the Plinth's depths stop being shares of the Frame, its slab stops being symmetric about it, its bottom-right corner comes off the page's on either branch of the fit, or the Frame moves towards the engineering points instead of away from them, the reflection stops being a life-size fold of the window, the marble stops being drawn without script, a reader who asked for reduced motion is charged for the recording, or a reader who runs no script at all loses the copy that arrives with the page turn |
| `ground`         | paper is not light, or the Turn does not arrive dark, in either theme         |
| `turn`           | the Kernel's published landing measure — cap, drop or the stone the width branch leaves room for — disagrees with the Panel's own arithmetic, the Panel's masthead is visible or has lost its box, the Cut Title is not standing in that masthead's slot, the word moves or resizes across the crossing, either end of the morph is not the outline the Bake wrote, a wheel notch does not turn the page or bring it back, a notch begun on the photographs turns it, or the paragraph that arrives with the crossing is painted at the top of the document, is still arriving at the landing, moves to get there, or is left on its own compositing layer once it has |
| `moments`        | a Timeline cannot be seeked, does not survive a scroll, moves nothing, or will not release |
| `deep-links`     | a Section on the page carries no id, or its `/portfolio/<id>` does not answer, or answers with something that is not the document, or opens it somewhere other than where that Section asks to be put |
| `unpublishable`  | a Section's words or its spoken attributes match the denylist                 |
| `editor`         | the Editor cannot change a word or drag a Token on the real page, or the change does not reach the file, or a refusal does, or a drag writes on every frame, or a Timeline cannot be scrubbed and held, or measuring writes to a source file, or an Override does not reach the file or does not reach the page, or one cannot be discarded, or a corner does not resize from the corner opposite it, or the marquee and its handles are not drawn at all, or the Editor is in the built tree |

`front-screen` is the first Section-specific Check, and the pattern it sets is
worth copying: it asserts only relationships between two things that have to stay
equal, and the Section's own `NOTES.md` records that every assertion has been
shown to fail when the thing it guards is removed and to pass when a Token is set
to something else. A Check nobody has tried to break is a Check nobody knows the
strength of.

`projects-panel` follows it, and it is where that record is worth reading before
touching either file: `src/sections/projects-panel/NOTES.md` lists the twelve
mutations it catches, the three Token moves it must not, and why its tolerance is
three ten-thousandths of the Frame's width rather than something comfortable — at
anything looser the one mutation it most exists for walked straight through it. It
also names what it deliberately does not assert: the glass's own output, which is
a picture and not a relationship.

It is also the first Check to open the page in a reader state the page behaves
DIFFERENTLY in, rather than merely more quietly, and every one of its three is a
promise that is invisible on screen. With **scripting off** the Plinth has to be
drawn at its full depth with nothing lying in it — which is the trade the
reflection's clone buys, and is also how the Check knows the copy is genuinely
derived rather than a second window written out in the markup — and the Panel's
paragraph has to be simply THERE, because it arrives with the page turn and
nothing under this reader drives the Turn it is drawn against. Those two pull
opposite ways on purpose: one says what a scriptless reader is not given, the
other what they may not be deprived of. With **reduced motion** not one byte of
the recording may be requested: no stylesheet can decline a fetch, so the element
ships with no source at all, and a `src` that crept back into the markup would
look identical on screen while costing the reader the clip. `open()` takes
`javaScriptEnabled` and `reducedMotion` for exactly these two, and **neither pass
can `settle()`** — nothing scrubs under the first and nothing mounts at all under
the second, so anything about a Timeline has to stay in the ordinary pass.

It used to be the only Check to read a file out of the repo rather than only the
served page, and the case is worth knowing because the shape recurs: the Plinth's
plate was declared in the Section's Tokens **and** in the hand-written page's
stylesheet, and the tool that picks a stone rewrote only the second. Nothing
about either page rendered wrongly when they diverged — both kept passing
everything else — so the only place the disagreement existed was between two
files, and that is where it had to be read. #141 deleted the second declaration
and the assertion went with it; `run(ctx)` still hands over `repoRoot` for the
next one of these. **A Check may read the repository, and should, when the thing
that can break is an agreement between two files rather than anything on screen.**

It is also the first Check to measure at a window chosen for a REGIME rather than
for a size. The Frame's chrome sheds its small glyphs below a Frame of 520px and
the gate is a container query, so the window that tells a container query from a
media one is a short wide one — 1440x450, where the fit solves the Frame to 468
while the viewport is nowhere near 520. Measured at DESK alone that whole
mechanism could be a media query and nothing would say so.

`deep-links` is the one Check that derives its own subject from the page. Every
other Check knows what it is asserting about before it opens anything; this one
asks the served document which Sections it is made of and then requires a working
`/portfolio/<id>` for each. The direction matters and is worth copying when it
fits: reading vercel.json and asserting those paths work would pass a deployment
that had a rewrite for every Section it USED to have. It also does not assert a
bare zero for where an arrival lands — a Section may declare a
`scroll-margin-top`, and the Projects Panel does, so what is compared is the
Section's top edge against the inset the Section itself asked for.

`carousel` is the first Check to assert a Section's CHOREOGRAPHY
rather than the mechanism under it: `moments` says a Timeline can be seeked and
that something moves, and this says the strip is where the Timeline's own progress
puts it. Its own record of what it has been broken with is in
`src/sections/front-screen/NOTES.md`. Two of the eleven mutations tried against it
initially passed, and both are worth knowing about because both are the shape this
file warns of:

* **A focus ring cannot be asserted by asking whether one is drawn.** Every
  focusable element gets the browser's own, so `outline-style` is never `none` for
  a thing with a `tabindex` — the assertion passed with the Section's ring rule
  deleted. What it does catch, and what is worth catching, is a ring that has been
  SUPPRESSED: `outline: none` written to tidy up a focused box, which is the way
  the ring actually gets lost.
* **A mutation has to be placed where it wins.** The first attempt at that one put
  `outline: none` earlier in the sheet than the rule it was meant to defeat, and
  read as the Check being weak when it was the mutation being wrong. Check the
  cascade before believing a Check is asleep.

## What a pass does not mean

Three boundaries, stated because a green run is otherwise read as more than it is.
None is a gap to be closed casually — each would cost more machinery than the
failure it would catch.

**`assets` covers what the page fetched, not every file it names.** A rung of a
corner picture that exists in the tree and is not asked for at this viewport and
this pixel ratio is not checked. Widening it means walking the CSS for `url()`s or
rendering the whole rung grid; a missing rung surfaces the moment a display asks
for it, and `assets` catches it then.

**`moments` reads the first element behind each mark.** A Section that marks six
elements and wires up only the first still satisfies "something moves". What this
catches is a Timeline wired to nothing at all — the failure the author would not
see. Partial wiring is one they would.

**`editor` is one smoke Check and is not where the Editor is tested.** The Editor's
tests are at its four write boundaries, on the bytes — `scripts/editor/lib/*.test.mjs`,
run by `pnpm test` — because that is where a bug corrupts a source file, plus the
Annotation's own text and the corner arithmetic, both tested there for the opposite
reason: a sentence and a sum are the deliverable and need no page. What a boundary
cannot see is whether the surface is WIRED to it, and that is all this Check is for. It writes to a temporary `src/`
holding every Section's Content and Tokens and a copy of the Overrides file, and
compares the real files before and after: it runs from the pre-commit hook, and a
Check that edited the tree it was gating would put a file it wrote into the commit
it was checking. `scripts/editor/NOTES.md` is the authority, and it is where this
Check's mutation record lives — twenty-one of them, four for Content, five for the
Tokens and Timeline halves #144 added, nine for the measuring half of #145, and
three for the corner handles of #162.

One thing it asserts in two halves rather than one, because they are two claims: a
Token's value is baked into the served build's stylesheet, so a drag has to move
the PAGE without writing the FILE, and a release has to write the file. A surface
that wrote on every frame of a drag, and one that wrote the file and left the page
alone, fail one half each.

**`unpublishable` reads Sections, not the whole document.** Text outside every
`[data-section]` is not scanned, which is deliberate: the Shell holds no
composition and the words that come from Content are inside a Section. A leak in
the Shell's own head is a different thing and has no Check.

## Adding one

A Check is a module in `checks/` exporting `{ name, title, run(ctx) }`. `run`
gets `{ browser, origin, repoRoot, dist }` and returns either an array of failure
strings or `{ failures, notes }`. Register it in the `CHECKS` array in `run.mjs`.

`editor` opens the Editor's own origin rather than the suite's — `open()` takes an
origin, so that needs no exception — and it is the one Check that does not settle.
That reason is worth knowing before copying it: `settle()` exists because a Section's TIMELINE mounts on
approach, but the markup and every word in it are prerendered and present at load,
and the Editor binds to words. Anything asserting about a Section's motion, its
mount state or its geometry still has to settle.

Open the page through `lib/page.mjs` — it records every response, console message
and uncaught throw for you, and `settle()` scrolls the document so every Section
has actually mounted. `open()` takes a `viewport`, defaulting to DESK; a Check
that names another one had better say why, because the same window for every
Check is what makes two failures comparable. **A Check that reads the page without settling it reads a
document with no Sections in it**, and every Section-shaped assertion then passes
vacuously.

Every failure string names the thing that broke: the URL, the family, the
selector, the measured number and the wanted one. "something is wrong" costs a
diagnosis session; "404 for /_astro/vollkorn-regular.Dnyk-4Dy.woff2" costs nothing.

## Ten traps, each of which cost a wrong answer here

**`hold()` before you seek, and it is not enough to seek twice.** A scrubbed
Timeline is recomputed from the scroll position, so a bare seek survives about a
frame. But ScrollTrigger recomputes on a **scroll**, not on a frame — so reading
the same moment twice in a row agrees with itself even with `hold()` stubbed out
to do nothing, and the first version of `moments` asserted exactly nothing. The
scroll has to actually move between the two reads.

**Assert the Timeline's progress, not the geometry, when what is being tested is
the hold.** A staggered tween saturates: with six elements at `stagger: 0.05` the
first finishes its own tween at progress 0.8, so a recompute from 1 to 0.857 moves
the Timeline and moves that element not at all. A geometry-only assertion passed a
completely stubbed `hold()`.

**`textContent` glues elements together.** A heading ending in a name and a
paragraph beginning with a capital arrive as one word — `HoldingsA Section` — so a
denylist term sitting at an element boundary is invisible to a whole-word match,
and words that were never on the page are manufactured. `unpublishable` walks the
text nodes and joins them with newlines instead.

**A composition fitted to one screen has regimes one window cannot reach.** The
Front Screen hands its leftover height to the photographs' slot until that slot
hits its ceiling, and only then splits it between the two margins — so the
mechanism holding the margins equal is *inert* at every ordinary desktop height.
Measured at DESK alone, `front-screen` passed with that mechanism deleted. It
measures at two heights now. Any Check on a composition with a ceiling in it
should ask which side of that ceiling its window is on.

**A VIEWPORT AS TALL AS A SCREEN IS NOT A WINDOW.** The same trap again, and it
shipped a bug, so it gets its own paragraph. The Panel's composition is fitted to
the smaller of what the page has across and what its height will carry, and which
of the two binds is a property of the window — at 1440×900 it is the width. So
every window whose *height* bound was unmeasured, and the mechanism that answers
for those was never exercised. That is not an exotic band: **a maximised browser
gives up about 100px of its screen to its own chrome**, so 1920×980 is the ordinary
case and 1920×1080 is nobody's. The Plinth is solved to stand in the page's
bottom-right corner; at 1920×980 it stopped 119px short while twelve Checks called
the corner exact. `projects-panel` measures at `MAXIMISED` now. **Pick viewport
heights a browser actually has, and if a Check reports which branch of a fit bound,
read it — the same branch at every window means one route is untested.**

**AND IT HAS A SCROLLBAR.** Playwright passes `--hide-scrollbars` in headless by
default, so `100vw` and the client width were equal in every Check this suite has
ever run, and every full-bleed box landed exactly where its arithmetic said. Real
browsers reserve the gutter. The same Plinth was read off `100vw` and ended 15px
**past** the page's right edge on every window with a scrollbar — clipped by the
Section, so invisible in a screenshot and invisible here. `run.mjs` undoes the flag
now, which moves every horizontal measurement in the suite by the gutter; that is
the point, because those are the numbers the reader gets. Nothing else in the suite
depended on the gutter being absent, which is worth knowing before anyone puts it
back.

Two smaller lessons came out of the same bug, and both generalise. **A tolerance
written to accommodate a known-wrong case is that case's hiding place**: the
corner's overrun allowance was 20px *because* of the scrollbar, so it would have
let the regression through even had the suite been able to see it. When the cause
is fixed, tighten the tolerance in the same commit. And **a self-correcting system
can absorb the regression you are trying to catch**: reverting the width branch to
`100vw` left the corner exact, because the stage's reach silently shifted the
window 15px the other way — into the gutter the engineering points sit behind. The
assertion that caught it was not about the corner at all but about that gutter. When
a fix makes something land, ask what it moved to get there, and assert *that*.

**A degenerate ScrollTrigger is not an error, it is a flip.** `data-turn` on a
Section exactly one screen tall leaves `top top` and `bottom bottom` at the same
scroll position. GSAP reports 0 at the top of the page and 1 one pixel later, so
the page still opens on paper and every "does it arrive dark" assertion passes —
the crossing has simply stopped being a crossing. The first version of
`front-screen` asserted `--turn` is 0 at the top and greater than 0 further down,
and that mutation walked straight through it. What catches it is the SPAN: sample
the document and assert the crossing takes at least half a screen of scroll.

**A mandatory snap makes a scroll sweep read as a document that jumps.** Inside
the landing band the page is two ports and nothing between, so every `scrollTo` in
between is pulled straight back onto the port it left — and `front-screen`'s
crossing sweep found `--turn` at 0 in forty of its forty-one samples and reported
the crossing as a flip, which is the exact failure that sweep exists to catch. A
Check that places the page anywhere a reader could not rest asks the Kernel to
lift the snapping first: `window.portfolio.snapping(false)`, and `true` after.
It is a different handle from `hold()` and both may be needed — `hold()` stops the
scroll driving the Timelines, and this stops the browser moving the scroll.

**"Is it a polygon" cannot be asked of a shape.** The Cut Title's morph tweens
between two real outlines through polygons, so the obvious assertion at either end
is "this letter carries a curve" — and a sans E is straight lines either way, so
two of the eight letters failed a Check that was measuring the wrong thing. `turn`
reads `assets/cut-morph.json` off disk and compares the drawn `d` against exactly
what the Bake wrote instead.

**Chromium refuses to fetch from certain ports.** An ephemeral port can land on
one, and the whole suite then fails as `net::ERR_UNSAFE_PORT` — about one run in a
few hundred, with nothing to do with the tree. `lib/serve.mjs` asks for another
port; the list is in it.

**A transparent ground rasterises to black.** A page whose stylesheet never
arrived computes `backgroundColor` to `rgba(0,0,0,0)`, and a 1x1 canvas reads that
back as `#000000` — so "the ground is dark" was satisfied, three times over, by a
ground that was not painted at all. `ground` reads the alpha as well, and an
unpainted ground is its own named failure.

Two more names that are taken and should not be reused: `Check`, which CONTEXT.md
defines and every module in `checks/` exports, and `Record`, which is TypeScript's
own — a local `@typedef Record` shadows `Record<K, V>` for every annotation in the
file that declares it, silently.

## The denylist is shapes, and the names are not committed

`lib/denylist.mjs` holds the patterns a Section's words may not match: a ticket
key, an internal hostname, a private address, a credential, a field name from the
private Career Record, a confidentiality marker. **Shapes and not names, because a
denylist of the actual names would put every one of them in a public repository**,
which is the leak it exists to prevent.

The names — clients, colleagues, hostnames, anything a pattern cannot describe —
go one per line in `lib/denylist.local.txt`, which `.gitignore` keeps out of the
repository. Absent is the ordinary state on a fresh clone and not a failure.

**There is deliberately no pattern for an email address.** A contact address is
legitimate content on a personal portfolio and the Front Screen has a contact
line, so a pattern for one would fire on a change nobody made wrongly. A
colleague's address is caught by the local file, along with their name.

The ticket-key pattern needs two or more digits, so `UTF-8` and `HTTP-2` are not
keys by construction, and carries an allowlist of standards prefixes for the ones
with three — `ISO-8859`, `RFC-2119`, `ADR-0003`. **Add to that allowlist rather
than loosening the pattern**: a blocking Check that fires on ordinary prose is the
one thing this suite may not do.

## The runner's own unit tests

`lib/colour.test.mjs`, `lib/denylist.test.mjs` and everything under
`scripts/editor/lib/` and `scripts/feature/lib/`, run by `pnpm test` and by
`pnpm check` before the browser starts. They are not Checks — nothing in them is
an assertion about a Section — but they run from the same command on purpose,
because the luminance bands and the denylist matching are what several Checks
decide with, and a runner reporting on the page while its own matching is broken
is worse than no runner.
