# The Kernel

The small set of things every Section may rely on, and the only thing permitted
to cross a Section boundary: the faces, the theme and the Turn, the Effect Stack,
the corner pictures, and the Section loader.

It is also the only place in `src/` allowed to write a global selector. A Section
that wants something global wants it in here, and adding it is a decision rather
than a convenience.

## What is in it, and what each file owns

| file                        | owns                                                        |
| --------------------------- | ----------------------------------------------------------- |
| `faces.css`                 | the five families, six files, the face Tokens, and the page's own type size |
| `ground.css`                | the theme's two papers, the Turn across them, and that the document never scrolls sideways |
| `corners.css` / `corners.ts`| the plate, the car and the eye — geometry, and which rung    |
| `effect-stack/`             | the nine layers, and the grain tile                          |
| `theme.ts`                  | which paper, where it is stored, and who is told when it changes |
| `turn.ts`                   | the Turn, as one named seekable Timeline                     |
| `loader.ts`                 | mounting a Section as it approaches the viewport             |
| `motion.ts`                 | `hold()` / `release()` — see below                            |
| `handles.ts`                | `window.portfolio`, and nothing else a Check may reach for   |
| `content.ts`                | `defineContent` — how a Section's Content gets typed         |
| `Kernel.astro`              | the part of the Kernel that stands before the Sections       |

## The page's own type size

`faces.css` sets the root `font-size` inside the Front Screen's one-screen band,
and it is the one thing in the Kernel whose reason lives in a Section.

Composing a Section to exactly one screen turns "does it fit" from a yes-or-no
question into one with a SIZE for an answer: everything in a Section's ladder is
in rem, so one number moves all of it at once, and whatever the composition cannot
spend goes to whichever box is the remainder. The Front Screen's photograph strip
is that box, and without this it collapses on a short screen — 27px of photograph
at 1440x700 against 194px at 1440x900. A photograph that small is not a photograph
of anything, which is the author's judgement and is recorded on the live page as a
15rem floor under the strip. A floor on a remainder is a budget that can overflow,
so the floor is paid for by the type giving way instead.

**It is here because `:root` is here, and for no other reason.** A Section may not
write a global rule and the root's font-size is the most global rule there is, so
this is the decision this file's opening paragraph says adding one has to be.

**`--type-scale` is measured, not derived.** The live sheet solves its own budget
symbolically, which it can do because it holds `--cv-static` — one measured
constant standing for "everything on the page that is not the strip", with a
comment asking whoever changes the ladder to re-measure it. This tree deliberately
has no such constant, because layout does that arithmetic here, so there is
nothing here to solve for. This number came from measuring the composition at the
band's corners, and what keeps it honest is `carousel` asserting the strip clears
the Section's own floor Token at both ends of the band. It lands within about 1% of
the live page's own `0.782019 / 48.32`, which is a sanity signal rather than where
it came from — the two compositions differ in what the cut word is fitted to. The
1% is deliberate slack: a value landing exactly on the floor leaves the Check a
pixel of margin, and slack is free here, because asking for a smaller rem than the
budget allows only makes the remainder larger. Only a rem that is too BIG costs
anything.

**It is measured at one width.** The cut word is fitted to the gutter here, so
the budget carries a width term and a 2560x700 window asks for a smaller rem
than this. That costs a smaller photograph and never an overflowing page — the
strip is the remainder, so it absorbs the difference — and it is the same extreme
the live sheet names and composes for rather than optimises for.

**Two things it is NOT, and both are worth stating rather than discovering.** Its
media query is a second copy of the band in
`src/sections/front-screen/FrontScreen.astro`; the two are one idea and the same
Check is what catches them drifting apart. And it is a number the author will
plausibly want to drag while it is not a **Token** and cannot be one: CONTEXT.md
makes a Token a *Section's* named number and this is the Kernel's, so ADR 0004's
surface cannot reach it. Whichever ticket gives the Kernel a Token story should
take this with it.

## Two things a Check has to know

**Ask a Timeline for a moment, but `hold()` first.** A scrubbed Timeline is
recomputed from the scroll position on the next tick, so a bare `seek()` survives
about one frame and a Check that reads geometry after it is a coin toss. This cost
a wrong diagnosis once already — the readings came back identical at every
progress and looked like a broken Timeline. `window.portfolio.hold()`, seek as
many moments as you like, `release()`.

**One mount point per Section.** The loader registers a Section's Timeline under
the Section's own name, so a second element carrying the same `data-section`
replaces the first one's Timeline in the register — silently, and the symptom
turns up later as a Timeline that will not seek. A Check that wants a mount point
of its own should give it a name of its own; `observeSection` is exposed for
exactly that.

## The Effect Stack's one invariant

`.fx` must not declare `z-index`, `isolation`, `mask` or anything else that makes
it a stacking context. An isolated group hands every blending child a transparent
backdrop instead of the page, so the layers stop blending and start painting — and
the symptom is a flat grey wash that reads as "the strengths are too high", which
is a day spent tuning the wrong numbers. `scripts/check-source.mjs` fails the
build on it; `effect-stack.css` carries the measurement.

Nine layers, and the names are CONTEXT.md's. That is one divergence from the
hand-written page's stylesheet, deliberately: it gated the grille, the scan, the
roll and the tube on one token called `crt`, and here each is named separately
because the glossary lists four layers rather than one. Turning all four on is
`data-fx="… grille scan roll tube"`.

The grain tile is drawn once, at boot, and only if `grain` is on the stack at that
moment. Switching the layer on later — which is what the Editor will do — leaves
it with no tile, so whichever ticket builds that surface has to re-draw as well as
re-write the attribute.

Four effects that sheet has are **not** ported: `weave`, `chroma`,
`chroma-pictures` and `ascii`. None is in CONTEXT.md's list, two of them are
theme-specific in a way the attribute cannot express, and `ascii` needs a canvas
redraw loop. They come back with whichever Section wants them, or not at all.

## The corner pictures

Three baked photographs, each at four widths and — where the grade needed a
second answer on black — again per theme. So `corners.ts` picks one file out of a
grid rather than off a list, and picks again when the theme or the display changes
under it. A miss on a dark file is the ordinary untuned state and not an error:
the generator writes no dark ladder while dark's grade matches light's, so there
is one retry against the light rung of the same width.

A picture whose whole ladder is missing is retried on every resize and every
theme flip, because `shown` never advances past 0 and `upgrade()` only compares
against that. Cheap, and the honest alternative — remembering the failure — would
also remember a network blip. Worth knowing before reading a resize storm in a
network panel as a bug.

**`LADDER_BASE` is the one line in `src/` that knows where the ladder is.** The
files are the ones `design/plate/build-plate.py` writes into `portfolio/img/`,
which the build does not produce and `scripts/assemble-dist.mjs` lays into
`dist/portfolio/` beside the document. Nothing else here knows where they live.

Two things the live page does that are **not** here yet, both because they belong
to the Front Screen's composition rather than to the Kernel: the `plate-wait`
hold, which keeps the type off screen for up to 1.5s while the picture it is
printed on arrives, and `--car-fade`, the one-sided dissolve on the car's inner
edge. `--car-fade` is 0 on the live page today, so nothing is missing from what
ships; the mask is not written at all rather than written and inert.

`--eye-x` diverges: on the live page it is measured inboard from the Front
Screen's photo strip, which did not exist here when this was written, so
here it is measured out from the right edge and parked at 0. The strip landed with
#137, so the thing it was waiting for is there — and it is still parked, because
where the eye stands against the photographs is a judgement made by looking and
not a length anything here can derive.

## The build fingerprints anything it can see

The fonts and the two Effect Stack textures are referenced from CSS `url()`, so
Vite emits them into `/_astro/` under a content hash and rewrites the references.
That is why there is no `?v=` digest here where the hand-written page's
stylesheet carried one by hand — the hash does that job by construction, and
`vercel.json` caches `/_astro/` immutably.

Those bytes used to ship twice, about 1.1 MB, while both trees were deployed.
#141 deleted the other one.

The corner pictures are **not** fingerprinted, because their URLs are built in
script rather than written in CSS and the bundler cannot see them. They keep the
`?v=` digest and the day-long cache, which is why `LADDER_VERSION` has to be
bumped in the same commit as a re-bake.
