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
| `faces.css`                 | the five families, six files, and the face Tokens            |
| `ground.css`                | the theme's two papers, and the Turn across them             |
| `corners.css` / `corners.ts`| the plate, the car and the eye — geometry, and which rung    |
| `effect-stack/`             | the nine layers, and the grain tile                          |
| `theme.ts`                  | which paper, where it is stored, and who is told when it changes |
| `turn.ts`                   | the Turn, as one named seekable Timeline                     |
| `loader.ts`                 | mounting a Section as it approaches the viewport             |
| `motion.ts`                 | `hold()` / `release()` — see below                            |
| `handles.ts`                | `window.portfolio`, and nothing else a Check may reach for   |
| `content.ts`                | `defineContent` — how a Section's Content gets typed         |
| `Kernel.astro`              | the part of the Kernel that stands before the Sections       |

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

Nine layers, and the names are CONTEXT.md's. That is one divergence from
`portfolio/styles.css`, deliberately: the sheet gates the grille, the scan, the
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

**`LADDER_BASE` is the one line in `src/` pointing at the old tree.** The files
are still the ones `design/plate/build-plate.py` writes into `portfolio/img/`,
because `/next` is not replacing `/portfolio` yet. The ticket that flips the route
moves the bytes and changes that constant; nothing else knows where they live.

Two things the live page does that are **not** here yet, both because they belong
to the Front Screen's composition rather than to the Kernel: the `plate-wait`
hold, which keeps the type off screen for up to 1.5s while the picture it is
printed on arrives, and `--car-fade`, the one-sided dissolve on the car's inner
edge. `--car-fade` is 0 on the live page today, so nothing is missing from what
ships; the mask is not written at all rather than written and inert.

`--eye-x` diverges: on the live page it is measured inboard from the Front
Screen's photo strip, which does not exist on `/next`, so here it is measured out
from the right edge and parked at 0. It is re-tuned when the Front Screen lands.

## The build fingerprints anything it can see

The fonts and the two Effect Stack textures are referenced from CSS `url()`, so
Vite emits them into `/_astro/` under a content hash and rewrites the references.
That is why there is no `?v=` digest here where `portfolio/styles.css` has one —
the hash does that job by construction, and `vercel.json` caches `/_astro/`
immutably.

The cost is that those bytes ship twice while both trees are deployed, about
1.1 MB. It ends when `/next` replaces `/portfolio`.

The corner pictures are **not** fingerprinted, because their URLs are built in
script rather than written in CSS and the bundler cannot see them. They keep the
`?v=` digest and the day-long cache, which is why `LADDER_VERSION` has to be
bumped in the same commit as a re-bake.
