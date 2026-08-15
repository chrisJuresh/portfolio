# Morphing the cut title

Tooling for a scroll-driven animation on `/portfolio` where the cut title — the
word PROJECTS, currently one baked SVG path of Friz Quadrata — turns into a
sans-serif as the page scrolls.

**Nothing here is wired into the site.** It is a study: measurements, a tween
algorithm, and a specimen page to choose a face from. `specimen.html` is the
deliverable — open it in a browser, scroll, and pick.

- [What was measured](#what-was-measured)
- [Two facts about this face](#two-facts-about-this-face)
- [The tween](#the-tween)
- [Files](#files)
- [Running it](#running-it)
- [What is deliberately not here](#what-is-deliberately-not-here)
- [Before any of this ships](#before-any-of-this-ships)

## What was measured

108 faces — 94 from `google/fonts`, 14 already installed on the machine this was
built on — set as PROJECTS and compared to Friz Quadrata. `ranking-108.csv` is
the full result.

The cut title fixes two things (see the cut-title block in
`portfolio/styles.css`): the word fills the measure, and it is cut at 0.62 of a
cap height. So every candidate is scaled to Friz's cap and its tracking *solved*
so the ink spans the same width. What is left is proportion, and that residue is
the distance the animation travels:

| | |
|---|---|
| `dW` | mean error in each letter's ink **width**, in cap units |
| `dC` | mean error in each letter's ink **centre** — how far it slides |
| `score` | `dW + dC` |
| `stem_cap` | stroke weight, from a scanline across `I` at half a cap |
| `track_em` | the tracking that face needs to span the measure |

Variable faces are pinned to the weight whose stem matches Friz's 0.155 cap, so
none is penalised for shipping a default lighter or bolder than the word wants.
`rank.py` does this by probing `getGlyphSet(location=...)` at three weights and
solving, which is far cheaper than building an instance per probe.

Two measurement traps, both hit and both fixed:

- **The stem is not the ink width of `I`.** Verdana's and Tahoma's capital I is
  serifed, so its ink box is the serif — three times the stem — and both faces
  ranked as ultra-bold until the measurement became a scanline.
- **Cap height comes from the drawn top of `H`, not `OS/2`.** The Friz file's
  `sCapHeight` is wrong by a factor of 2.046; `fonts/README.md` records why.

The numbers were checked against the artifact of record before anything was
built on them: re-deriving PROJECTS from the font reproduces the baked path in
`portfolio/app.js` exactly — span 8723.7, every letter box to the decimal.

## Two facts about this face

**Friz Quadrata's caps are classical Roman.** Its O is 1.114 cap wide — wider
than it is tall — against an E/O ratio of 0.630. Most sans faces run E/O at
0.70–0.80, near-uniform cap widths. That single ratio explains the ranking better
than anything else, and it is why so few sans faces sit close.

**Its P and R have no counter.** The bowl tapers to a point and never reaches the
stem, so each is one contour with no hole in it, where every sans closes the bowl
and has two. This is not an artefact of the outlines; it is the typeface. It
decides the whole shape of the animation, which has to *close the bowl* — see
below.

## The tween

`morph.py`. Three things it does that a naive vertex tween does not:

1. **Corners match corners.** Sampling two outlines at equal arc length lands the
   corner of an E's arm against the middle of a curve, so corners round off in
   transit and straight edges wobble. Corners are detected on both outlines,
   matched by cyclic dynamic programming with skips, and points distributed
   *between* matched corners. A stem stays straight because both ends are pinned.
2. **The bay is closed, not slit.** Friz's open bay already *is* the counter — it
   is only unclosed. `open_bay` closes it with a chord across its mouth: the outer
   swallows the bay, the bay becomes a hole bounded by the same chord, the two
   chords coincide, and at rest the shape is Friz's own. Both sides then have
   matching contour counts and the tween's job is to close the mouth.

   Finding that chord needs to be told which bay to look for. A letter has
   several places where its outline nearly touches itself across white, and the
   notch under a P's foot is a *narrower* gap than the mouth of its bowl. The
   closest such pair is the serif every time; the closest pair whose bay contains
   the target counter is the bowl.
3. **Both ends are the typeface.** The real Bézier outlines are emitted alongside
   the tween and shown at rest, so the page is never a polygon of a font when it
   is standing still. Measured agreement at the handover is ~0.2% mean pixel
   difference, so nothing jumps.

Outlines go through `skia-pathops` first. Several faces — Outfit, Inter,
Montserrat, Instrument Sans — ship E as four *overlapping* rectangles and R as a
bowl plus a separate leg, never booleaned, because nonzero fill draws the union
anyway. Interpolation does not.

`raster.py` exists to check the result: it fills with the **nonzero** winding rule,
which PIL's own polygon fill does not, so it draws what a browser will rather
than punching holes through every overlap.

## Files

| File | What it is |
|---|---|
| `lib.py` | sets PROJECTS in a face and measures it, in units of its own cap |
| `morph.py` | correspondence and the tween — the algorithm above |
| `rank.py` | the 108-face sweep → `ranking-108.csv` |
| `build-specimen.py` | the curated 24 → `page2.json` |
| `specimen.tpl.html` | the page, with `__DATA__` / `__DISP__` / `__BODY__` slots |
| `specimen.html` | the built page. Self-contained; just open it |
| `raster.py` | nonzero-winding rasteriser, for checking frames by eye |
| `candidates-google*.txt` | the `google/fonts` slugs the sweep pulled |

## Running it

Needs `fontTools`, `brotli`, `skia-pathops`, `Pillow` — and font files, none of
which are in this repository:

```bash
pip install fonttools brotli skia-pathops Pillow
```

Both scripts expect `friz/FrizQuadrataStd.ttf` plus `gf/` and `fsf/` directories
of candidates beside them. The `google/fonts` ones come from the slug lists; the
Fontshare ones from `api.fontshare.com/v2/fonts/download/<slug>`, taking
`Fonts/TTF/<Name>-Variable.ttf` out of each zip so the weight can be matched.

## What is deliberately not here

**No font binaries.** Not Friz Quadrata, which was removed from this repository
on purpose and supplied locally for this work, and not the ~110 candidates. The
word is geometry, exactly as it already is on the live site.

**No change to `/portfolio`.** `portfolio/app.js` and `portfolio/styles.css` are
untouched. Choosing a face is a separate decision from making it.

## Before any of this ships

- **Licensing splits the shortlist.** The Fontshare faces are free for commercial
  use but are **not** OFL — read the terms. The rest are OFL, the same footing as
  Vollkorn and Spectral in `/fonts`.
- **The J changes meaning.** Friz's J drops 0.349 cap below the baseline and dies
  in the cut, so the word reads PRO|ECTS — `portfolio/styles.css` calls that a
  property of the drawing rather than a number to tune. Every sans here sits the
  J on the baseline, so the morph raises it into view. That is a change to the
  cut title's conceit and should be a decision, not a side effect.
- **Tracking is per face.** `--cue-track`'s 0.02em holds for Friz only; each
  candidate needs its own to span the measure. It is baked into the target
  outlines here, so if the two ends ever become live text instead, it has to be
  animated.
- **Size.** About 25 KB of path data for a chosen face, against the ~6 KB single
  path inline in `app.js` today, and it is inline in the markup the same way.
