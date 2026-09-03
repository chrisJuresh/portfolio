# The Checks

The seam every later Section is verified through. One command builds this tree,
serves it, drives headless Chromium, and asserts what a reader would experience.

```bash
pnpm check
```

```bash
pnpm check -- --no-build --only ground,moments
```

```bash
pnpm check -- --stage webgl
```

Exit 0 is a pass, 1 is a broken Check or a broken tree, 2 is a runner that could
not start. `--no-build` runs against the `dist/` that is already there, which is
for iterating and nothing else — a Check reporting on a stale build is the one
failure this suite cannot catch about itself.

`--stage` opens every page with one of the Eater Map Section's two stages
selected (#181), and it is a property of the RUN rather than of any Check: it is
handed to `lib/page.mjs` through the environment, and no Check mentions it.
`dom` is the shipped stage and the default. The reason it exists is that #181's
last acceptance criterion is "every Check passes with either stage selected",
and threading a parameter through fourteen modules to say so would put the name
of a temporary alternative in every one of them. **When #182 chooses, the loser
and this flag go out together.**

**It is read WHEN A PAGE IS OPENED and never at module scope**, and the first
version got that wrong in a way this whole file is about. `run.mjs` sets the
variable in its body — and imports all fourteen Checks at the top, every one of
which imports `lib/page.mjs`, so ESM evaluates that module before `run.mjs`'s
first statement runs. A `const` there is always `undefined`: the suite opened
every page with the shipped stage, printed that it had opened them with the
other one, and passed. Two green runs said nothing at all.

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

## The seventeen Checks

| Check            | fails when                                                                  |
| ---------------- | --------------------------------------------------------------------------- |
| `across`         | anything reaches past the page across in any of the three compositions — a box sized from a viewport unit counts a scrollbar's gutter, and the root's clip then hides what it cost |
| `assets`         | anything the page fetches 404s or never answers, in either theme, with every Effect Stack layer lit |
| `carousel`       | the photograph strip's Timeline is not where the strip is, either end of it comes off the text column, the corner eye stops being measured off that same edge, the arrow keys or the focus ring go, the dissolve stops following the Timeline, or the one-screen budget stops affording a photograph |
| `console`        | anything logs an error or throws, including across a theme flip — warnings deliberately not, because on this page they are nearly always Chromium's own |
| `faces`          | a declared `@font-face` will not load, or no face Token names a declared family |
| `front-screen`   | the Front Screen's rhyme, its one-screen budget, the Cut Title's cut or its accessible name, the crossing's span, the switch's ARIA, or the type's place in the Effect Stack breaks |
| `projects-panel` | a control in the Frame leaves the centre its own Token names, the window and its titlebar are cut to two radii, the recording's box stops being inset on three sides, the occlusion of the subheading's second line moves or stops being painted, the titlebar reports a rung it is not made of, the chrome grows a control, the small-Frame reduction starts asking about the window instead of the Frame, the Plinth's depths stop being shares of the Frame, its slab stops being symmetric about it, its bottom-right corner comes off the page's on either branch of the fit, or the Frame moves towards the engineering points instead of away from them, the reflection stops being a life-size fold of the window, the marble stops being drawn without script, a reader who asked for reduced motion is charged for the recording, a reader who runs no script at all loses the copy that arrives with the page turn, the titlebar grows past the clearance the clip on disk was cut with, or that clip stops opening on that many rows of flat, light ground |
| `eater-map`      | PROJECTS stops standing where the Gallery's own masthead stands or stops being the same word, the serif title's cap height or its drop below the masthead's baseline stops matching the two ratios the Section declares — which a font size proportional to the masthead does, by 4% — the copy leaves the foot of the column PROJECTS heads or the Points leave the right of the drawing, the three Cards on the Slab stop being drawn at the Slab's own scale at the Lift's flat end, one of them stops moving between the Lift's two ends, one of the Section's own boxes is invisible at either end, a reader who leaves part way up is left with a Lift that ran on without them, a leader line comes off the corner it names part way up the Lift or stops ending in a lit dot on it, a point and a part stop being one to one, the picture of the app puts a focusable control or a heading into the page, an extruded edge stops having a direction or stops taking it from the one page-fixed light, a corner of the Slab shows the page behind it, `--eater-map-slab-edge` stops being live inside the gradient, the rebuild that makes a dragged light visible starts running for a reader with no Editor on the page, or below the band the drawing stops collapsing — a perspective left standing on a column, a Slab that misses the window's edges, a Lift still running where there is no page turn, the four features no longer a list under the picture, or one of the three readers down there handed a composition of their own |
| `rail`           | the page carries more than one Rail or none, at any of four windows; the Rail moves when the page turns; it stops standing in the page's own left margin, or stops sharing the composition's left edge below the band; the current entry stops naming the Section at rest, in either direction; an entry stops being reachable at a resting place because a Section is hit-tested over it; the Rail stays reachable on the first screen, where it is drawn transparent; the entry with no Section of its own stops saying so to a screen reader; or a reader who runs no script gets no Rail or no current entry |
| `ground`         | paper is not light, or the Turn does not arrive dark, in either theme         |
| `effect-stack`   | the Effect Stack stops covering the window anywhere its veil is still open — the seam — or reaches further than the deepest pixel that veil is ever seen at, which on a phone is a `mix-blend-mode` layer with a `filter` on it too tall for the compositor to hand out in one piece, and content that vanishes leaving its own gap behind |
| `turn`           | the Kernel's published landing measure — cap, drop or the stone the width branch leaves room for — disagrees with the Panel's own arithmetic, the Panel's masthead is visible or has lost its box, the Cut Title is not standing in that masthead's slot, the word moves or resizes across the crossing, either end of the morph is not the outline the Bake wrote, a wheel notch does not turn the page or bring it back, a trackpad flick moves the page by any number of ports other than the number of pushes it carried — chaining through every port on one flick, or refusing a second flick delivered into the first one's momentum — a notch begun on the photographs turns it, or the paragraph that arrives with the crossing is painted at the top of the document, is still arriving at the landing, moves to get there, or is left on its own compositing layer once it has |
| `crossing`       | outside the landing band the Panel's ground parts company with the document's anywhere across the crossing, the page has not finished turning by the time the Panel owns the screen, the crossing is a flip or never finishes, the reader meets the whole of the Cut Title on the first screen, the Cut Title is cut by a box rather than by the fold — so it is still cut in the Section it heads — or stops being one drawing, or the Panel's masthead draws a second PROJECTS under it — or loses the `display` the Section's accessible name comes from |
| `moments`        | a Timeline cannot be seeked, does not survive a scroll, moves nothing, or will not release |
| `deep-links`     | a Section on the page carries no id, or its `/portfolio/<id>` does not answer, or answers with something that is not the document, or opens it somewhere other than where that Section asks to be put |
| `unpublishable`  | a Section's words or its spoken attributes match the denylist                 |
| `editor`         | the Editor cannot change a word or drag a Token on the real page, or the change does not reach the file, or a refusal does, or a drag writes on every frame, or a Token the drawing is GENERATED from rather than one a stylesheet reads stops moving the page — the Eater Map's extruded edge, out and back, per surface and with the same elements it started with — or a Timeline cannot be scrubbed and held, or measuring writes to a source file, or an Override does not reach the file or does not reach the page, or one cannot be discarded, or a corner does not resize from the corner opposite it, or a box the composition caps with `max-width: var(--a-token)` cannot be dragged wider at all or does not report the Token behind the cap, or a corner drag with `scale everything` on does not move the page's zoom or does not write it, or a measured border box is written back as a content box, or an anchor the layout would not let go of is not reported — or is reported on every drag — or the marquee and its handles are not drawn at all, or Ctrl-Z takes a committed row off the page and leaves the Token it wrote in the file, or Ctrl-Shift-Z does not put it back, or the Editor is in the built tree |

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

The next one turned up, and it is the same shape at a different scale: the Frame's
titlebar sits OVER the recording, so it covers the first rows of the page that was
filmed, and the clip in `portfolio/video/` is cut with exactly that many rows of
clear ground at the top so the vault's own toolbar is not sliced in half by the
glass. Neither half is visible: the clip is a video, so what the strip covers is a
picture, and a titlebar that has grown past the clearance looks like a titlebar.
So the Check imports the number from `design/censor/capture-frame.mjs` and asserts
BOTH directions — the strip fits inside it, and the poster (frame 0 by
construction, and the still a reduced-motion reader gets) opens on that many rows
of one flat light value. **Where a Check reads a number out of the repo, it has to
assert both ends of the agreement.** Asserting only that the page fits the number
passes a Lens trimmed to fit a recording nobody re-cut; asserting only the file
passes a recording with room for a strip that has since grown. It is also a
CEILING rather than an equality in both halves, because a shorter strip is free —
it shows a little more of a margin that is white either way.

It is also the first Check to measure at a window chosen for a REGIME rather than
for a size. The Frame's chrome sheds its small glyphs below a Frame of 520px and
the gate is a container query, so the window that tells a container query from a
media one is a short wide one — 1440x450, where the fit solves the Frame to 468
while the viewport is nowhere near 520. Measured at DESK alone that whole
mechanism could be a media query and nothing would say so.

`eater-map` is the third, and it is still the smallest of the three, because the
Section is a composition and a composition's deliverable is a look. What it guards
is what about that composition is NOT a look: the Cards are drawn at the Slab's own
scale, derived rather than chosen; the word PROJECTS stands where the Gallery's own
masthead stands, which is an equality between two elements rather than a number
anybody typed; the serif title's cap height and its drop are the two ratios the
Section declares, which a stylesheet cannot spend because a cap ratio is not a
font-size ratio between two faces; and a picture of an app puts neither a control
in the tab order nor a restaurant in the outline, which is not visible at all.
**It reads two windows and that is not padding**: the derivation carries an
`@supports` constant behind it, and at DESK the constant is within a third of a per
cent of the right answer, so at DESK alone this Check passes with the derivation
deleted — and the title's ratios were 1.4% out at the band's short corner while the
ink was being read at the size it is drawn at, which is a third of the difference
they exist to see. `src/sections/eater-map/NOTES.md` carries the measurements and
every mutation that was made to break it.

**Its twelfth group is where this Check comes closest to the line, and the opinion
is declared rather than smuggled** (#197). Every extruded edge on the page is a
`conic-gradient` lit by one page-fixed light, and asserting that an edge has a
DIRECTION at all is a relationship — the four sides differ, the brightness runs
round each ROUND corner rather than stepping, no corner of the Slab shows the page
behind it. Asserting **which** side is bright is not: it is a fact about two Token
values the author signed off, and it is stated as such where it is asserted. It is
there because it is the only thing that fails when a page-fixed light is pointed the
wrong way, and a light nobody can point wrongly is not page-fixed. The same
discipline as the rise: an opinion about a Token is allowed if it is named where it
is held.

**Its thirteenth is one half of an agreement, and `editor` holds the other** (#196):
this one requires that a page with no Editor redraws nothing, that one that a page
with the Editor over it follows a drag. **Either half alone is satisfied by a
mechanism that never runs at all** — the same shape as reading a number out of the
repo, where a Check asserting one end of an agreement needs something asserting the
other. **And the mutation is the Editor's GESTURE rather than the Token**: an inline
Token on the Section's root is not what the observer watches, so that version passes
whether the gate is there or not. `src/sections/eater-map/NOTES.md` carries the rest.

**It is also the only group in that Check that REPORTS**, and both reasons are the
ones this file already gives. Every tolerance in it was chosen off a measurement, so
a passing run prints all five surfaces' four sides and their largest step, and a
reader can tell a comfortable pass from one sitting on a threshold. And it is the
one group that SKIPS — under `--stage webgl` the Slab's edge is a canvas with no
slices to read — so the skip is printed rather than silent, and a stage that never
mounted at all is a failure instead of looking like the same thing.

**And it reads a THIRD window, below the band, because down there the composition
is a different one** (#179): the Slab flat and full-bleed with the four features
as a list under it. The first thing asked there is whether it has actually
collapsed, and that one BAILS rather than merely failing — every assertion under
it describes the collapsed drawing and would pass against the wide one while
reading as though it had checked something.

**The assertion that ticket is really about is an EQUALITY and not a
description.** The collapse serves three readers at once — the narrow window, the
reader who asked for no motion, the reader whose scripts never arrived — and the
way to keep that true is not to describe what each should get, which is three
things to maintain, but to open the other two windows and require every box in the
Section to land where the ordinary reader's did. **The playhead travels with the
boxes**, and that was not the first draft: collapsed, the geometry is pinned by
`transform: none` whatever `--eater-map-lift` holds, so a reader left at the raised
end gets an identically shaped drawing whose Cards' glass is filled to the plate —
a real second composition that a comparison of rects alone reports as one.

**The two other readers are compared in the SECTION's own coordinates**, and that
is load-bearing rather than tidy: a scriptless page has no Front Screen reveal and
a Panel that answers `@media (scripting: none)`, so the Sections ABOVE this one are
not the same height in all three. In document coordinates every box in this Section
reads as moved by the same number, which says nothing at all about this Section.

**And it reads a moment BETWEEN the two ends, which is #178's doing.** The four
leader lines join each numbered point to the part of the Exploded View it names,
and each one's far end is a Card's own corner while that Card is turned in three
dimensions. The two ways of getting that wrong — computing from the Card's
untransformed box, and computing once and never again — are both RIGHT at the flat
frame, which is the frame a still is most likely to be taken at, so a Check that
read only the two ends would have caught neither at flat and one of them at
raised. Half way up catches both, every time. What it is compared against is the
anchor's own projected position, read off the page: the anchors are zero-sized
boxes inside the camera, and a zero-sized box projects to a POINT, which is the
one thing a `getBoundingClientRect()` can say about a rotated element that is not
an axis-aligned approximation of it. An anchor moved OUT of the camera passes all
of that, and is caught by the anchors themselves having to move between the Lift's
two ends.

**It is also the first Check to read a Section's geometry AT A MOMENT rather than
wherever the page left it**, and #177 is why: the Lift runs from flat to raised
when the turn settles, so what is on screen after a `settle()` is whatever the
scroll last drove it to — and the scale claim is about the FLAT frame, where a
Card's drawn width is a fact about the map rather than about the camera. Both ends
are read inside one `hold()` and the page is put back, which is `moments`' seam
used by a Section's own Check for the first time.

Two of its four assertions came with the Lift and are worth knowing apart. **The
Cards' boxes differ between the Timeline's two ends, and no distance is asserted**
— how far a Card climbs is the author's and lives in a Token, but a Card that does
not move at all is the device switched off, and that IS a Token this Check has an
opinion about. It is stronger than `moments`, which asks whether a Timeline moves
*anything*: this asks about all three, and a Card left lying on the map while the
other two came off it is what it catches. And **nothing of the Section's own is
invisible at either end**, which is the mechanical form of "no element is hidden in
CSS and uncovered by the Timeline" — checked at BOTH ends because the raised end
is what a reader whose scripts never arrived is looking at.

**Its fifth is the suite's first assertion about a Section LEAVING a state**, and
it is worth copying the shape. The Lift reverses if the reader turns back before it
finishes, and the bug it caught was a `>=` where ScrollTrigger's own `isActive` is
strict — so the answer was wrong at exactly one scroll position and right
everywhere else. **A `scrollTo` past a boundary does not cross it**: the first
version put the page on the port and jumped back to the Panel's, and passed the
mutation three times in a row. It walks the reader out a pixel a frame now, which
crosses whatever position the Lift is armed at, and the mutation fails every time.
Neither wait is a sleep — both are `waitForFunction`, one for the Lift to be
genuinely part way up and one for it to arrive back down — so there is no sampling
window to miss and no clock in the Check at all.

`rail` is the first Check about a piece of the KERNEL that a reader can see, and
the shape worth copying from it is that **its central assertion is an
identity across time rather than a measurement**. #192's whole claim is
"turning from the Gallery to the Eater Map moves the highlight and nothing else",
and the way to assert that is not to describe where the Rail should be — it is to
read the same box at both resting places, in VIEWPORT coordinates, and require the
two readings to be the same reading. A Rail drawn inside a Section fails it by a
whole screen; one moved to the Kernel and left in the document flow fails it by
the same amount; and neither failure is visible in a still of either end.

**It reads four windows and a fifth reader.** The Rail has two regimes — pinned
to the window inside the band, in flow outside it — so both have to be opened; the
band's SHORT corner is read as well, because the column is a `vh` clamp and the
type in it is a share of a composition, and the two only part company where the
window is short. The fourth is **wide and short**, and it is there because a Spec
review pointed out that it is the ONE regime #192 moved — the two Sections split
the Rail on the width alone, so above 1100px and under 700 it was a vertical grid
column inside each of them — and the Check opened no window on it. The fifth is
scripting off, and it is asserting something the other four cannot: nothing will
ever run `rail.ts` for that reader, so the entry the page opens on has to be in
the document Astro rendered.

**THE ASSERTION THAT MATTERS MOST IS THE ONE ADDED LAST, and it is a lesson about
what a rect cannot see.** The first version of this Check compared boxes and read
`aria-current`, and it passed a page whose Rail was **completely unclickable at
the Gallery's resting place**. The Rail is out of flow and BEFORE the Gallery in
the document; `.projects-panel` is positioned and follows it, so it is hit-tested
above the Rail across the whole of the page's left margin. Painting was correct —
that Section paints no ground in the band — so every screenshot was perfect, and
the failure was asymmetric, because the Eater Map is unpositioned and the links
worked there. It asks `document.elementFromPoint` at each entry's centre now, at
each of the three stops, and requires the answer to be inside the Rail. **Where a
Check asserts that something is in the right place, ask separately whether a
reader can reach it** — those are two questions and only one of them is geometry.

**And the same question inverted, one screen up.** In the band the Rail is
revealed on `--turn`, so at the top of the document it is transparent — and
`opacity: 0` leaves a box hit-testable and focusable, which put three invisible
links and three invisible tab stops over the Front Screen's own margin. So the
Check also requires that NONE of the entries is reachable where `--turn` is 0.
The two assertions are the same mechanism read in both directions, and each is
satisfiable by breaking the other.

**Two of its assertions exist to hold a RESTATEMENT**, which is the same job the
`turn` Check does for the landing. The Kernel may not read a Section, so
`--rail-side` is a second spelling of `--projects-panel-stack-side` and
`--rail-inset` of a length that Section used to carry — and a restatement nothing
compares is a number waiting to drift. In the band the Rail's width is compared
against `--landing-side`; below it the Rail's own left edge is compared against
the composition's, on the page.

**And the margin is measured with a probe rather than read as a property**, which
is the trap this Check hit first. `--landing-side` is unregistered, so its computed
value is the token sequence it was written as — `clamp(2.25rem, 6.5vh, 5rem)` —
and `parseFloat` of that is `NaN`. A comparison against `NaN` is never greater than
a tolerance, so the first version of the column assertion would have passed
anything. It appends a zero-height `width: var(--landing-side)` probe to the body
and reads its rect, which is `crossing`'s own idiom for `--front-screen-cut-slab`:
**when an assertion needs a length the page states as a `calc()` or a `clamp()`,
ask the page for it.**

**The same `NaN` costs the same silence a second time in the same Check**, on a
different axis, and that is why the `Number.isFinite` guards are not ceremony. The
two left edges below the band are read as `rect.x + parseFloat(paddingLeft)` —
which resolves, because a computed style resolves a shorthand a stylesheet walk
cannot — but a padding that ever stopped resolving would hand the comparison a
`NaN` and make it PASS. `Math.abs(NaN − x) > tolerance` is `false`. Any Check
subtracting two measured numbers has to say what it does when one of them is not a
number, and "nothing" is the wrong answer.

Eight mutations, all caught:

| mutation                                                         | wanted | got |
| ------------------------------------------------------------------ | ------ | --- |
| a second `<Rail />` in the document                                 | fail   | fail at all readers: 2 elements carry `[data-rail]` |
| the band's `position: fixed` weakened to `absolute`                 | fail   | fail: 900px apart at DESK, 700 at the corner |
| `mountRail()` never called                                          | fail   | fail: at the Eater Map the current entry still names `projects` |
| the highlight allowed to advance only                               | fail   | fail twice: at the Gallery, and at the Gallery again — "which a one-way walk would pass" |
| the unbuilt entry's clipped span deleted                            | fail   | fail: `"Record Engine"` and no clipped span |
| `--rail-side`'s vw slope drifted from the Panel's                   | fail   | fail below the band: names at x=32.2, composition at x=37.1 |
| the Rail's `z-index` removed — the shipped bug                      | fail   | fail: "3 of 3 entries are covered — projects is under section.projects-panel", at the Gallery and at the Gallery again, at both band windows |
| `data-rail-away` never written, so the invisible Rail stays live     | fail   | fail: "2 of its 3 entries are still hit-testable (`visibility: visible`)" |

**The fourth is the one to keep, and the seventh is the one that was real.** A
Check that walked from the Gallery to the Eater Map and stopped would pass a
highlight that never comes back — exactly half of "follows the page turn in both
directions", and the half a reader meets on the way up; the third stop is the
Gallery again and its failure says so in as many words. The seventh is not a
mutation at all in the usual sense: it is the tree as it was actually committed
once, and the assertion was written because a review found the bug rather than
the other way round.

`crossing` is `turn`'s counterpart below the band, and it is the clearest case in
the suite of the definition at the top of this file: **every failure it catches is
one a still of either resting place looks perfect in.** The page is right on the
first screen and right on the last, and wrong on every frame between them — a
Section a quarter darker than the page it is on, a page still turning after it has
arrived, a crossing that is really a flip, a headline printed twice. Nobody
scrolling looks for those; they look wrong without being locatable, which is what
"banding" has meant every time it has been reported here.

Five mutations, all caught, and the two that were not the first time are the ones
worth keeping:

| mutation                                                        | wanted | got |
| --------------------------------------------------------------- | ------ | --- |
| the Panel's ground mixed against `--ground` again                | fail   | fail: 65 apart on a channel at the middle of the crossing |
| the Turn spanning the document's scroll out of the band          | fail   | fail: `--turn` is 0.806 when the Panel owns the screen |
| the Cut Title's clip lifted — the whole word                     | fail   | fail, on the `overflow` |
| the clip kept and given the cap's FULL height                    | fail   | fail: 77.8px of a 77.8px cap, 0.000 taken off |
| a second copy of the drawing in the Cut Title                    | fail   | fail: 2 drawings, wanted 1 |

**The fourth one passed first.** The box was being compared against the DRAWING,
which is taller than the cap by the J's tail and the overshoot — so a box handed
the cap's full height was still shorter than the drawing, and a cut that had
stopped cutting read as a cut. What it is compared against now is the cap slab
itself, measured by putting an absolutely-positioned probe of
`height: var(--front-screen-cut-slab)` inside the Cut Title's own container: the
Section's container units resolve against the container the Section declared, and
the Check learns nothing about the drawing's cap share. **When an assertion needs
a length a Section states in container units, ask the page for it rather than
recomputing it.**

**And the second one passed first for a sampling bug worth naming**, because it is
the shape that makes a Check assert nothing. The walk looking for where `--turn`
first reaches 1 stepped a tenth of a screen at a time and stopped before the foot
of the scroll — and a crossing spanning the document's whole scroll arrives on the
last pixel, so the walk reported a page that never turns at all rather than one
that turns too slowly. The foot is always sampled now. **A walk that does not
include its own end point fails on its sampling before it fails on the page.**

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

`across` is the only Check that is not about a Section, and that is the whole
reason it exists as a file rather than as three lines inside one. It asks the
DOCUMENT whether anything reaches past the page across, and what it catches is a
full-bleed box sized from a viewport unit — which Section that box lives in is
exactly the thing nobody can predict. **A Section's Check may not answer for
another Section's box.** `eater-map` carried this assertion for one run while #179
was being written, caught the Front Screen's photograph strip with it, and took it
out again for that reason; #186 fixed the strip and gave the assertion a home.

**Its assertion is `scrollWidth` and its walk is only the diagnosis**, and the
split is load-bearing. `html` carries `overflow-x: clip`, so there is no honest
per-element rule available: an overhang inside a Section that clips its own is
deliberate — the Plinth's slab still runs off the edge outside the landing band —
and only reaching the ROOT's clip is never legitimate, because that is the page
being asked to hide something. So the number is the claim, and the walk exists so
the failure names the element instead of the number, skipping anything with a
clipping ancestor and reporting the outermost of a nest. Measured with the strip
put back to `100vw`: 383px of document on a 375px page at 390x844, 993 on 985 at
1000x800, and 1432 on 1425 at DESK — **every window, including the one every other
Check reads**, which is how the whole suite passed for as long as it did.

**Its three windows are three COMPOSITIONS and not three sizes.** The landing
band, the stacked page below it and the collapse a phone gets are three different
drawings; a full-bleed box added to any one of them is a different rule in a
different block, and the two below the band are the ones no other Check opens by
default. Its tolerance is 1px and that is a rounding — `scrollWidth` is an integer
over a subpixel layout — chosen against the lesson in the traps below: the failure
it exists for is the width of a scrollbar, so anything looser would be the bug's
own hiding place.

Three mutations, and the third is the one that matters, because a Check with no
opinion about which box may overhang could just as easily have no opinion about
any of them:

| mutation                                                          | wanted | got |
| ------------------------------------------------------------------ | ------ | --- |
| the strip's bleed back to `calc(50% - 50vw)`                        | fail   | fail at all three windows: 1432 on 1425, 993 on 985, 383 on 375, naming the strip |
| the strip shifted 40px left, same width — the document still fits    | fail   | fail at all three: the second branch, `x=-40` with nothing but the root's clip on it |
| nothing — the tree as it stands, at 1000x800                         | pass   | pass, and the Plinth is at `x=-44.5` to `x=1029.5` on a 985px page, held by `section.projects-panel`'s own `overflow-x: clip` |

**The third is not "it passes".** The Plinth really does hang 44.5px off both
edges down there, deliberately, and a walk without the ancestor test would fail on
it every run. Measured rather than assumed, because "the Check would not have
fired anyway" is the shape that costs a wrong answer.

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
Annotation's own text and the corner and box-model arithmetic, all tested there for
the opposite reason: a sentence and a sum are the deliverable and need no page. What a boundary
cannot see is whether the surface is WIRED to it, and that is all this Check is for. It writes to a temporary `src/`
holding every Section's Content and Tokens and a copy of the Overrides file, and
compares the real files before and after: it runs from the pre-commit hook, and a
Check that edited the tree it was gating would put a file it wrote into the commit
it was checking. `scripts/editor/NOTES.md` is the authority, and it is where this
Check's mutation record lives — thirty of them, four for Content, five for the
Tokens and Timeline halves #144 added, nine for the measuring half of #145, three
for the corner handles of #162, three for the undo stack, three for a press
inside what is already picked, and three for the redraw a Token the drawing is
GENERATED from needs (#196).

One thing it asserts in two halves rather than one, because they are two claims: a
Token's value is baked into the served build's stylesheet, so a drag has to move
the PAGE without writing the FILE, and a release has to write the file. A surface
that wrote on every frame of a drag, and one that wrote the file and left the page
alone, fail one half each.

**`unpublishable` reads Sections and the Rail, not the whole document.** Text
outside those two is not scanned, which is deliberate: the Shell holds no
composition, and every other place Content reaches the page is inside a Section. A
leak in the Shell's own head is a different thing and has no Check. The Rail is
there because #192 took it out of both Sections and made it the Kernel's, so a
scan of `[data-section]` alone silently stopped reading the one list on the page
that names things by name — and the Check fails if no `[data-rail]` is on the page
at all, rather than quietly reading one fewer haystack.

## Adding one

A Check is a module in `checks/` exporting `{ name, title, run(ctx) }`. `run`
gets `{ browser, origin, repoRoot, dist }` and returns either an array of failure
strings or `{ failures, notes }`. Register it in the `CHECKS` array in `run.mjs`.

`editor` opens the Editor's own origin rather than the suite's — `open()` takes an
origin, so that needs no exception — and the page it clicks is the one page in this
suite that is not settled.
That reason is worth knowing before copying it: `settle()` exists because a Section's TIMELINE mounts on
approach, but the markup and every word in it are prerendered and present at load,
and the Editor binds to words. Anything asserting about a Section's motion, its
mount state or its geometry still has to settle — so the group that drags a Token
the Exploded View is GENERATED from opens a second page and settles that one (#196).
**Two pages rather than a compromise**, because the two requirements are opposite:
one assertion needs the words where the markup left them and the other needs a
Section that has actually mounted.

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

## Twelve traps, each of which cost a wrong answer here

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

**And nothing asked the real window whether the page FITTED in it** until #186,
when the same trap turned up a second time — the Front Screen's photograph strip,
bled to `100vw`, hanging 7.5px past both edges at every window in this suite and
caught by none of them, DESK included. `across` is that question, and undoing the
flag is what makes it worth asking.

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

**`transform` is not the only way an element is rotated, and reading the wrong
one is not a wrong answer — it is no answer.** The halftone is turned with the
independent `rotate` property, so its computed `transform` is `none`;
`new DOMMatrixReadOnly('none')` is the identity, and `effect-stack`'s
corner-coverage assertion therefore compared an axis-aligned box against itself.
Every corner landed exactly on the edge, the tolerance swallowed it, and stripping
the layer's oversize to `100%` — which uncovers a corner by 150 to 174px —
walked straight through a Check whose failure message was already written. It
composes `rotate` with `transform` now, and **names the value it cannot parse as
its own failure** rather than falling back to zero: an assertion that quietly
becomes trivial when its input changes shape is the same bug one layer up.

**Chromium refuses to fetch from certain ports.** An ephemeral port can land on
one, and the whole suite then fails as `net::ERR_UNSAFE_PORT` — about one run in a
few hundred, with nothing to do with the tree. `lib/serve.mjs` asks for another
port; the list is in it.

**A transparent ground rasterises to black.** A page whose stylesheet never
arrived computes `backgroundColor` to `rgba(0,0,0,0)`, and a 1x1 canvas reads that
back as `#000000` — so "the ground is dark" was satisfied, three times over, by a
ground that was not painted at all. `ground` reads the alpha as well, and an
unpainted ground is its own named failure.

**Never ask the system under test how it grouped its own input.** The `turn`
Check's flick has to know whether the stream it delivered was one gesture or two,
because two gestures turning two pages is correct and one gesture turning two is
the bug. The first version asked the Kernel — a handle published for the purpose —
and asserted "no more turns than gestures". A Kernel that has stopped grouping
events reports **ninety** gestures for one flick, the invariant goes slack, and
the mutation walks through a Check whose failure message was already written. The
grouping was the thing under test, and the Check handed the bug its own alibi. It
times the gap between its own dispatches now, against `GESTURE_GAP` lifted out of
`src/kernel/wheel.ts` the way `page.mjs` lifts `THEME_KEY` — so a stream with no
gap over that boundary is one gesture whatever the page thinks — and the handle
that was added for it was taken back out. **A precondition has to be established
from outside the thing it is a precondition for**, and it generalises past this
Check: a Check reading a state machine's own idea of its state can only ever
assert that it is self-consistent.

**And a Check has to model the DEVICE, not a convenient stream.** The same flick
delivered sixty identical notches, which is not a trackpad — it is a finger held
down at one speed forever, and a page turn is entitled to read it as push after
push. That version would have failed correct code and passed the fault it was
written for, once the Kernel learned to tell a rise from a decay. It is a real
flick's shape now: a rise under the fingers, then a tail losing seven per cent a
notch.

The last lesson is about which way a fallback can be weak. A stall splits the
stream and adds a push nobody made, so it can only raise the CEILING on how many
ports should have moved — the FLOOR is the reader's own pushes and holds however
badly the machine behaved. Stating the rule as **ports moved equals pushes
delivered** rather than as two separate claims is what makes the stalled run still
assert the direction that matters most: the page refusing to move at all.

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
