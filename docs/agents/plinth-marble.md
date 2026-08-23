# The Projects Panel plinth's marble

What the stone is made of, what was wrong with it, and what is still open. Read
this before touching `design/plinth/`.

The short version: **there were two independent faults, and only one of them was
the marble.** The generator could not make the right shape, and the room was too
bright for a black stone. Each was invisible while the other was in place.

---

## The two faults

### 1. The veining was the wrong SHAPE (fixed by using a photograph)

`build_material()` in `design/plinth/build-slab.py` grows veins as level sets of
smooth noise and hairlines as Voronoi cell boundaries. A level set of a smooth
field is a closed rounded loop; a cell boundary is a honeycomb. Real Nero
Portoro is neither — it is a *connected branching network* whose trunks open
into patches several percent of the slab across and close to a filament within a
hand's width.

That shape is not reachable from those generators at any setting. Every
parameter in `CANDIDATES` is a knob on the wrong machine, which is why tuning
got closer every time and stayed wrong.

The fix is `design/plinth/build-portoro-maps.py`: take a photograph of real
Portoro apart into the four things a PBR surface wants, and let Cycles light it.

### 2. The room was too bright for a black stone (fixed by `ROOMS["noir"]`)

Measured on the front face of the rendered plate, against the source photograph
it is cut from:

| | p5 | p25 | p50 | mean | p95 |
|---|---|---|---|---|---|
| source photograph, its ground | 5.9 | 8.0 | 11.0 | 29.0 | — |
| `gemini`, fitted room | **24.0** | **24.0** | **24.0** | 28.9 | 54.9 |
| `gemini-noir`, dark room | 1.0 | 2.0 | 2.5 | 19.9 | 110.0 |

Read the *shape* of the middle row, not its size. p5, p25 and p50 are the same
number: the ground was pinned at a flat 24 whatever the texture underneath said.
A floor that does not vary with the albedo is not albedo — it is light added on
top, and no grade can turn it down. `deep` and `gold` both crush the ground to
almost nothing and both still measured 24.

**It took three wrong diagnoses to find it, and each one is worth not
repeating:**

1. *"Dim the whole room."* Scaling every ramp stop by a third moved the black
   from 24 to 21. Turning a surround down turns its highlights down with it —
   the picture gets darker and stays just as flat.
2. *"It's the elevation ramp."* Crushing the stop the front face mirrors by 16×
   moved it another 3 levels. Right kind of culprit, wrong object.
3. **It was `FILL`.** 3.4 × 2.0 units, 1.4 in front of a block 1.19 wide — about
   100° × 70° seen from the front face. Not a light in front of the stone, a
   *wall* of light in front of it. The file's own header had already caught two
   ten-unit emitters being "a pair of skies" and narrowed them; the narrowing
   stopped one size too early.

**The rule that falls out, and the one thing to remember:** what a smooth face
shows of a light is the light's own *angular* size. Whether a source reads as a
highlight or as a veil is decided by comparing that against the arc the face
sweeps — and the front face sweeps only **±14° of azimuth** across the whole
block. At `FILL`'s distance that is 0.35 units.

| width | subtends | result |
|---|---|---|
| 3.40 | ~100° | covers the face 3.5× over → veil |
| 1.15 | ~45° | still covers all of it → still a veil |
| 0.30 | ~12° | lands on ~40% of the width → **a highlight** |

Anything wider than about a third of a unit is a wall however dim you make it.

### The coupling, and how it was broken

Sizing `FILL` down to a highlight blacked the ground out properly and **took the
veining with it** — p50 1, p95 52, a black slab with nothing on it. The light
that was veiling the mirror was also the light that lit the calcite. Broad
enough to light the veins *is* broad enough to veil, at any brightness. There is
no single source that satisfies both.

So the room now uses two, and takes the coupling out at the renderer:

- **`wash`** — broad, dim, `visible_glossy = False`. Cycles computes it for
  diffuse and skips it for specular, so it lights the stone and is not *in* the
  stone. This is why the veins are bright while the ground is black.
- **`fill` / `key` / four narrow lobes** — small and bright, the localised hits
  a mirror is supposed to show.

Not a physical object, and not pretending to be: it is the diffuse half of a
room whose specular half is separate, split so each can be set for what it does.

**Diffuse light cannot lift a black ground** — the ground's albedo is 0.003, so
multiply it by as much light as you like and it stays near zero, while calcite
at 0.86 lights up in proportion. That is why a real slab photographs black
against a bright grey wall, and it is free contrast.

---

## Was the procedural stone just badly lit?

Asked directly, and worth having asked. Render `relit` and look:
`nero-noir`, `portoro-noir`, `marquina-noir`, `grey-noir` are the four
procedural stones, same material, only the room moved.

**Both diagnoses were true and independent.** The dark room helps them a lot —
`nero-noir` has real range where `nero` was flat grey smoke. But better light
makes the *shape* problem more obvious, not less: the closed blobby loops and
the honeycomb of the fracture network are now plainly visible, and
`portoro-noir`'s gold reads as parallel streaks rather than a branching network.

So the earlier conclusion ("this isn't working, try photographs") was drawn
through a real second fault — but fixing that fault does not rescue the
generator. No amount of dimming changes the shape of a level set.

---

## How it is built

Two steps. The first needs no GPU and no Blender.

```bash
python design/plinth/build-portoro-maps.py
```

Reads the source photograph and writes `design/plinth/maps/`:

| map | what it carries |
|---|---|
| `basecolor-{asis,deep,gold}.png` | the rock under flat white light, per grade |
| `roughness.png` | ground 0.055, calcite 0.135, gold 0.230, + a slow drift |
| `height.png` | 16-bit, **high-passed** — see below |
| `calcite.png` | where the translucent mineral is, for Subsurface Weight |

Then:

```bash
"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b -P design/plinth/build-slab.py -- photo
```

`proc` | `photo` | `relit` | `all` | a single stone name. ~5 s each.

### Putting a different photograph on the plinth, without a terminal

`python design/legacy/plinth-studio.py`, then open what it prints. It is the
whole pipeline behind one page: drop an image, move every slider a stone has,
bake, look at it standing under the real Frame, write it into the Panel's
Tokens. Its
own docstring is the reference; what matters from outside it is:

- **It serves the tree it is started in**, like `render.mjs` and unlike
  `preview_start` — so a stone tried out in a worktree is tried out against that
  worktree's `/portfolio`.
- **Maps are cached per photograph**, keyed by a digest of the image bytes and
  the two options that change what the maps are (`size`, `square`). So a second
  bake of one photograph at a different `scale` is fifteen seconds of Cycles and
  not another fifty megabytes of PNG — which is the one thing `add-stone.py`
  cannot do, because it is a one-shot and rebuilds them every run.
- **It writes `--projects-panel-plinth-src` in
  `src/sections/projects-panel/tokens.css`** when Apply is pressed, and nothing
  else outside `design/plinth/` and `portfolio/img/tex/`. One declaration's bytes
  and no re-serialising, the same rule the Editor obeys on that file, which is
  what keeps its paragraphs. It does not commit; run `pnpm check` before landing
  a stone.
- **There is no `?v=` on it any more, and that is the fix rather than an
  omission.** The hand-written page had no build, so its stylesheet carried the
  plates' digest by hand and it drifted unnoticed for two bakes in #106–#114.
  Astro fingerprints a `url()` it can see, so the plate ships as
  `/_astro/plinth-….<hash>.webp` and a re-bake is a different filename by
  construction. #141 deleted the second declaration, so there is one place the
  stone is named and nothing to keep in step.
- **The only thing it draws rather than renders is the window**: the **front
  face's** footprint laid on the photograph, from `build_photo_material()`'s own
  arithmetic. That answers `scale` and `offset` before paying for a bake, and it
  is honest about answering nothing else. It drew a top-face band above the arris
  until the render was measured against it — see "What the box projection
  actually does"; the top face is read a quarter turn round and cannot be shown
  in the same picture, so it is not shown at all. There is deliberately no GLSL
  previz of a photographic material — see "Still open" for why the tuner does not
  have one either.

### Putting a different photograph on the plinth, from the command line

`design/plinth/add-stone.py`, and **not** by running `build-portoro-maps.py` by
hand — that writes `maps/`, which every `gemini-*` stone reads, so it silently
repoints all fourteen of them at your photograph.

```bash
python design/plinth/add-stone.py --src <photo> --name <name>
```

Builds `maps/<name>/`, writes four entries into `design/plinth/stones/`, and
bakes their plates in one Blender run — `<name>-noir`, `<name>-noir-fine`,
`<name>-screen`, `<name>-screen-fine`, which are the `gemini-*` recipes worth
having crossed with the two questions a new photograph raises: which room lights
it better, and whether its figure wants to be laid one slab across the block or
two. Reload the tuner and they are in the strip. `--styles noir` for just the one;
every field in the table has a flag as well.

**The entries are committed and their maps are not**, which is the split the
`gemini-*` stones already live under. So a fresh checkout lists an added stone and
shows its plate, and can only re-bake it from a tree that still has the
photograph. `build-slab.py` says so by name when the maps are missing.

**What the source has to be** is in the script's header at length; the two that
are not guessable are that it is cropped **square** by default, because a BOX
projection with a uniform mapping scale lays one tile over a square of model
space whatever the image's aspect is (the Gemini source is 1.83:1 and is squashed
to half its height on the block — every number fitted to it assumes that), and
that the mineral split is a luma threshold, so a **light** stone classifies as
almost all calcite and wants `--grade asis` rather than `deep`.

### Three things in the maps worth not undoing

- **Grade each mineral separately, then recombine through the masks.** A curve
  over the whole picture cannot pull the ground down without taking the veins
  with it — that is exactly how the earlier attempt ended up with mid-grey lines
  on dark-grey rock. Per-mineral grading keeps all the photographic
  micro-structure while letting black go black and white go white.
- **`degloss`.** The source is a photograph of a *polished* slab, so a veiling
  of the photographer's own light sits in every pixel including the black ones.
  Left in, Cycles adds it a second time.
- **The height map is a HIGH-PASS, and must stay one.** Feeding luma straight to
  a bump node makes a gold swathe a third of the slab across into a *hill* a
  third of the slab across; the normal tilts across the whole thing and the
  polished top face bends the room into a funhouse mirror. A polished slab is
  flat — that is what polishing is. What survives it is microns of differential
  hardness at mineral boundaries, which are edges, not fields.

### Three things in the material worth not undoing

- **`BOX` projection, not `FLAT`** — for the seamless front face and the free
  chamfer, and **not** for continuity over the arris, which it does not give.
  See "What the box projection actually does" below: the front face reads
  (x, z) as expected, the top face is read 90° round, and the two cannot line up
  at the edge at any offset.
- **The two V offsets are DIFFERENT numbers, and have to be.** `Object` texture
  coordinates are the block's *local* space, and `build_scene()` applies the
  cube's scale but not its location — so local space is centred on the block and
  the arris sits at `(y = -DEPTH/2, z = +HEIGHT/2)`, not at the origin.
  `ARRIS_Y` and `ARRIS_Z` are subtracted per axis to put the arris at
  `V = offset`. Written as `offset` on both, as it was until this was measured,
  the front face lands half a block-height up the photograph from where the
  studio's window guide draws it.
- **The mapping `Scale` is NOT uniform, and must not be** — see "The stretch"
  below. Y and Z carry `scale × aspect` where X carries `scale`. That is right
  for the front face, which is the face the fit was measured on; on the top face
  the roles swap and the correction does not apply.
- **Subsurface Weight through the calcite mask.** Calcite is translucent, and
  that is most of why real marble looks deep and wet while a flat albedo looks
  like painted card. One socket, never connected in any earlier version.
- **Bump `Distance` is tiny (0.0002–0.0005) and has to be.** The top face is
  seen at 7.8°, where Fresnel is ~0.5 and the face is essentially a mirror —
  `gemini-plain`, with no relief at all, shows *no* veining up there, just a
  sweep, because the albedo is swamped by the room. So bump is not adding
  texture to the top face, it is adding **distortion to a reflection**, and the
  amplification at grazing incidence is severe. At 0.0016 the plinth reads
  honed rather than polished.

---

## What the box projection actually does

Two things this file asserted for four issues, both wrong, and both found by the
same complaint: **the studio's window guide did not agree with the page.** The
guide is drawn from `build_photo_material()`'s own arithmetic, so a disagreement
between it and the render is the material lying to the file it is documented in.

Everything below is measured rather than reasoned: an unlit orthographic render
of each face on its own — emission straight off the base colour map, no room, no
Fresnel — correlated against the window each hypothesis predicts.

### 1. The block's texture space is CENTRED, not anchored at the arris

`build_scene()` runs `transform_apply(location=False, ..., scale=True)`. That is
right — the scale has to be baked in or every texture is stretched seventeen to
one — but it leaves the *location* on the object, and `Texture Coordinate →
Object` is local space:

| | y | z |
|---|---|---|
| local (what the shader reads) | −0.150 … +0.150 | −0.035 … +0.035 |
| world (what every comment assumed) | 0 … 0.300 | −0.070 … 0 |

So the arris was half a block away from where the mapping put `offset`. Measured
on the shipped `gemini-noir` plate, correlating its front face against
`basecolor-deep.png` over a scan of V:

| V at the arris | correlation |
|---|---|
| 0.452 — where the plate actually sat | **0.66** |
| 0.400 — where `offset` said it was | 0.00 |

`ARRIS_Y` / `ARRIS_Z` are subtracted per axis now. The same scan on the re-baked
plate peaks at 0.398, and the unlit front face correlates **0.89** against the
window the studio draws.

### 2. The top face is read 90° round, so the arris never ran continuously

The claim was that BOX gives the top face (x, y) and the front face (x, z), so
the pattern crosses the edge. Half of it is true. Correlating the unlit top face
against each of the eight ways BOX could orient it:

| top face reads | correlation |
|---|---|
| U from −y, V from x | **0.88** |
| U from x, V from y — the assumption | 0.04 |
| the other six | ≤ 0.02 |

So the top face samples the photograph's **height across the plinth's width**,
turned a quarter turn against the front face. The two faces cannot line up at
the arris at any `offset`, the aspect correction does not apply up there, and the
top face's V spans `PLINTH_W × scale` rather than `DEPTH × scale × aspect`.

**None of it is visible, which is why it survived.** At 7.8° the top face is
essentially a mirror: correlating a *baked* plate's top face against the
photograph finds nothing at any offset (peak 0.02, i.e. noise), exactly as the
bump note below predicts, and on the page the Frame's CSS reflection covers most
of it. Fixing it properly means hand-rolling the box — two samples per map, mixed
on the geometry normal — for a face that shows no albedo. Not done, deliberately.
The studio no longer draws a top-face band rather than drawing a wrong one.

---

## The stretch, and why it was also the blur

For a while the stone was **stretched vertically by exactly 1.832×**, and the
front face was soft. Those were one fault, not two.

A box projection lays the image's [0, 1] over one tile of *model* space per axis
and knows nothing about the image's own aspect. The mapping scale was uniform —
`(s, s, s)` — so the 2814×1536 source was squeezed into a square footprint: 2814
px across `1/s` units of width against 1536 px across `1/s` units of height, or
**2365 px per unit one way and 1291 the other**. The ratio is the source's
aspect, to four figures.

The blur followed from it. The front face is 0.070024 units tall over 177 rows of
plate, and the vertical squeeze is what starved it of source rows:

| | source px per plate px | magnification |
|---|---|---|
| across, before and after | 2814 → 3000 | 1.07× |
| down, **uniform scale** | 90 → 177 | **1.96×** |
| down, **aspect-corrected** | 165 → 177 | 1.07× |

So it was anisotropic 1.07/1.96, and correcting it makes it isotropic 1.07 —
near enough native, with no other change and nothing resampled.

**The fix is one line, in `build_photo_material()`:** multiply the two V axes by
`map_aspect(spec)`, which reads W/H off the base colour map. `H × s×(W/H) == W ×
s` for any aspect, portrait or landscape.

Three consequences worth knowing:

- **`offset` did not need re-picking.** It is in tiles and applied *after* the
  scale, so the arris sits at exactly that fraction down the image whatever the
  scale is. Every stone stayed anchored where it was; its window just got 1.83×
  taller.
- **Source WIDTH is now the only thing that sets sharpness.** Both axes end up at
  `W × scale` texels per model unit, so the height only decides how much slab
  there is before the pattern repeats. `add-stone.py` warns on width alone.
- **It broke the V-seam argument at fine scales.** `build-portoro-maps.py`
  cross-fades U and not V, which was sound while under one tile of V was ever
  visible. `build-slab.py` prints a per-stone warning when it is not. The test
  used to be `(DEPTH + HEIGHT) × scale × aspect > 1`, on the reading that the two
  faces stack in V; they do not, so it now measures the top face's own span,
  `PLINTH_W × scale`, which is the larger for every stone here. It fires on
  `gemini-fine` and `gemini-noir-fine` at 2.08 tiles and on `gemini-gold-1` at
  1.12, all on the top face — which is a mirror at 7.8° and carries no
  measurable albedo, so the seam has nothing to show through. Left alone
  deliberately: cross-fading V costs a smeared band across every map to fix
  something nothing can currently see.

### What it obsoleted

`add-stone.py` shipped in #112 with the bug already diagnosed, and worked around
it at the input: it centre-cropped every new source to a square, giving the
projection the aspect it had wrongly assumed. That is now unnecessary and was
costing the sides of every wide photograph, so **the crop is off by default** and
`--keep-aspect` is gone. `--square` opts into it as a compositional choice.

The gemini maps were never cropped — the note in `build_maps()` explained that
turning `square` on would silently change all six gemini-* stones, which was
true, and is why the original stone kept the stretch longest.

## The candidates

`gemini-plain` is the deliberately crippled control — photo in Base Color only,
flat roughness, no relief, no SSS. It is there to be beaten, and the difference
between it and the rest is what the extra maps buy.

Fitted room (the black is veiled — kept only for comparison):
`gemini`, `gemini-asis`, `gemini-gold`, `gemini-wide`, `gemini-fine`,
`gemini-crack`, `gemini-gallery`.

Dark room (**use these**): `gemini-noir`, `gemini-noir-gold`,
`gemini-noir-wide`, `gemini-noir-fine`, `gemini-screen`, `gemini-screen-gold`.

`scale` is the strongest control in the table and is not a quality setting — it
is how big the rock is. 0.84 lays one slab across the plinth, 0.42 crops into
half a slab and the figure doubles, 1.75 lays two down and the veining goes fine
and jewel-like.

Two honest negatives:

- **`gemini-crack` is the weakest.** The procedural hairlines laid over the
  photograph read as drawn-on scratches — too uniform, too long, too straight
  against veining that is none of those.
- **`gemini-gallery` is nearly invisible in page context.** Its whole difference
  is on the top face, and on the page the top face is mostly covered by the
  Frame's own CSS reflection. Bare-plate improvements up there buy less than
  they look like they will.

---

## The Frame as a light (`gemini-screen`)

The Panel's reflection is drawn in CSS, by flipping the live Frame element under
the plinth. That has to stay live — what is *inside* the Frame is a video that
changes. But the Frame is also a metre of lit white screen standing on a
polished black slab, and none of that ever reached the plate: the block is baked
alone, in a room the Frame is not in, and the reflection is pasted under it
afterwards. **The stone has never been lit by the brightest object in the
composition.**

The two halves come apart cleanly and only one needs to be live:

- **moves** — the pixels inside the Frame, hence the mirror image of them. Stays
  in CSS.
- **does not** — the Frame's position, size, and the fact that a light-mode
  browser window is a large soft near-white emitter a third of a unit above the
  stone. Fixed geometry, fixed brightness; no reason to compute it at 60fps in a
  browser rather than once in Cycles.

`SCREEN` bakes the illumination and leaves the reflection alone. It is an area
light, so Cycles shows it in specular too, and it is tinted very slightly warm
and off-full because a light-mode window is paper, not white.

---

## Verifying

**`preview_start` serves the MAIN CHECKOUT, not your worktree** — it will
silently verify `development` while looking like it verified your branch. Use
`render.mjs` from inside the worktree; it serves the tree it is invoked from.
`design/tools/node_modules` is gitignored, so a fresh worktree has no
playwright:

```bash
cmd //c mklink //J node_modules "C:\Users\Chris\Desktop\portfolio\design\tools\node_modules"
```

`render.mjs` takes `--stones`, which overrides `--panel-plinth-src` per shot and
puts the stone in the filename:

```bash
node render.mjs --pages panel --variants sitka --themes dark --stones nero,gemini-noir
```

**Shoot the page, not just the plate.** The plate is 3000×269 of bare stone with
no Frame standing on it, no reflection, no contact shadow and none of the page's
colour near it, and all four of those change what the marble looks like.

`design/shots/plinth-stones.jpg` is the committed contact sheet. **It predates the
aspect fix**, so every photo-backed stone in it is the stretched, softer version —
do not pick a stone off it. Nothing generates it; it was assembled by hand, and
re-shooting it is its own job.
`design/shots/*__stone-*.png` are gitignored — 1.4 MB each and regenerable.

The capture contract was the gate for a change that pointed the old stylesheet at
a new stone. #141 deleted the page it measured and #148 deleted the contract;
`pnpm check` is the gate now, and it says nothing about which stone is right —
that is still made by eye, here.

---

## Still open

- ~~**Nothing ships yet.**~~ **`gemini-noir` ships.** It is named once, by
  `--projects-panel-plinth-src` in `src/sections/projects-panel/tokens.css` —
  the user's pick, made in the tuner. It was `--panel-plinth-src` in
  `portfolio/styles.css` at the time, with a `?v=` that had drifted while nothing
  shipped:
  the stylesheet still carried `de287c12` from #106 while two further bakes (#108
  and #114) had moved `slab.json`'s `version` to `912aa827`, so every plate URL
  on the deployment was a day-stale name for a file that had changed twice. All
  five are now stamped with the digest `slab.json` actually holds. The capture
  contract passes at the new stone; `nero` is kept as a `data-marble` candidate
  because every proportion in the `.panel` block was measured against it.
  **Every photo plate was re-baked at the arris fix**, so each one is a different
  crop of its photograph than the one it was picked as — same stone, same scale,
  the window moved half a block-height. Worth a second look at any stone chosen
  before it, `gemini-noir` included.
- **`plinth-tuner.html`'s PREVIZ is stale; the rest of the page is not.** The
  page is now the Panel's variant tuner and covers all four of the things #57
  left to be chosen by eye — the stone, the subheading's wording, what sits
  behind the titlebar's glass, and the glass itself — plus #74's exit
  treatments, which are the fifth. All of those are
  driven over the real `/portfolio` in the iframe and are exact: the stone is a
  `data-marble` attribute, the wording is the two text nodes `.panel-sub` already
  carries, the glass is `portfolio/frame-glass.js`'s own uniforms moved
  through the seam at the foot of that file, and the exit is three attributes and
  one signed custom property on the section — `--exit`, which is 0 on the
  shipping page and only a crossing between Panels moves. What is stale is only the GLSL
  material previz, which still draws the pre-bedding level sets and cannot
  preview a photo-backed stone at all — `slab.json` carries `photo_candidates`
  so the tuner can list them and say it cannot draw them. **The studio does not
  replace it and does not try to**: the tuner previews a PROCEDURAL stone without
  rendering it, which is the thing it is for, and the studio bakes a
  PHOTOGRAPHIC one and shows the render. Neither can do the other's job — a
  photograph cannot be previewed in GLSL without the photograph, and a
  procedural stone has no photograph to drop on the studio.
- **The three behind-the-glass treatments are in the shipping file, and `dark`
  ships.** `paintScene()` in `frame-glass.js` branches three ways and the default
  is what #66 settled, so the page still renders once and nothing a reader does
  can move it. Measured off the glass's own canvas at `--dark 1`: `dark`
  (44,38,49), which is the design render's chrome body to the integer, `marble`
  (27,19,28), `clip` (65,65,85). **The first two are the SAME colour at the top
  of the page** — both tokens are a `color-mix` against the page's own ground, so
  they only separate as `--dark` crosses. Choosing between them on what can be
  seen is choosing nothing; `clip` is the only one that is visibly not the render,
  and the only one that costs a redraw per frame forever.
- **The top face is still the weak face.** In the dark room it is dark, which is
  correct for polished black stone in a dark room, but it leans entirely on the
  CSS reflection for interest.
- **`ROOMS["noir"]` moves the fitted luminance profile,** on purpose. The old
  numbers (top 34→80, front 27→30) were fitted against the design render, whose
  stone is the much lighter `nero`. They are no longer the target.

### Methods not tried, now unblocked

The user has approved installing software and using external services.

- **HDRI environment** (Poly Haven, CC0). A real photographic room in place of
  the procedural ramp. This is the honest version of what `ROOMS` approximates
  by hand, and would give the top face something worth reflecting. Biggest
  remaining realism win.
- **CC0 PBR marble scans** (ambientCG, Poly Haven) — albedo/roughness/normal/
  displacement already separated by someone with a scanner, no de-lighting
  guesswork. Worth comparing against the maps derived here.
- **Substance 3D Sampler "Image to Material"** — feed it the same JPEG and let
  Adobe's de-lighting model do the separation `build-portoro-maps.py` does by
  hand. Direct comparison of two solutions to the identical problem.
- **Materialize** (free, open source, local) — the same idea without a licence.
- **Displacement + adaptive subdivision** instead of a bump node, so the arris
  actually breaks against the veining rather than being a clean straight cut.

---

## Sources

`Gemini_Generated_Image_13pkuz13pkuz13pk.jpg`, AI-generated by the author,
2814×1536. **Not committed** — it follows the `/Texturelabs_*.jpg` and `/*.png`
rules in `.gitignore`: sources stay out, bakes ship. Drop it at the repo root and
run the maps script.

**A worktree does not have it.** Git only puts tracked files in one, so an
ignored source sitting in the main checkout is simply absent — copy it across
first. `build-portoro-maps.py` fails with that instruction rather than a
traceback.

There is no upstream URL to re-fetch this from, unlike the Texturelabs plates.
If it is lost, the maps cannot be rebuilt and only the baked `.webp` plates
survive. Worth keeping a copy somewhere durable, or committing it if the size is
acceptable — that is a call for the author, not a default.
