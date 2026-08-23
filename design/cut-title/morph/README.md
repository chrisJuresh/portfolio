# Morphing the cut title

The scroll-driven morph on `/portfolio`, where the cut title — the word PROJECTS,
a baked SVG path of Friz Quadrata — turns into a sans-serif as the page scrolls.
This directory is where the outlines and the correspondence between them are
worked out; `portfolio/cut-morph.js` is the runtime that moves them.

**This is on the site, and the face it turns into is Host Grotesk.**
`design/legacy/morph-tuner.html` previews all twenty-four faces against the
real page so a choice can be made by eye, and `build-site.py --face <slug>` makes
one of them permanent. Host Grotesk is OFL, the same footing as Vollkorn and
Spectral in `/fonts`; the twelve Fontshare faces in the shortlist are free for
commercial use but are **not** OFL, so choosing one of those reopens a licensing
question this one does not.

- [How it is wired in](#how-it-is-wired-in)
- [What was measured](#what-was-measured)
- [Two facts about this face](#two-facts-about-this-face)
- [The tween](#the-tween)
- [Files](#files)
- [Running it](#running-it)
- [What is deliberately not here](#what-is-deliberately-not-here)
- [Before any of this ships](#before-any-of-this-ships)

## How it is wired in

Three pieces, and the split between them is about weight on the wire:

| | |
|---|---|
| `portfolio/cut-morph.js` | the runtime, plus **one** face's outlines — ~40 KB |
| `faces.json` | **all** of them — ~700 KB, fetched by the tuner and nothing else |
| `morph-tuner.html` | iframes the real page and drives it through `window.__cutMorph` |

`build-site.py --face <slug> --repo <worktree>` writes both of the first two from
the same run, so they cannot disagree about geometry.

The runtime takes effects.js's stance: **nothing on the page depends on it.** It
is loaded last, and all it does is swap the single inline Friz path for the same
outlines split into eight and then move them. A browser that never runs it — a
parse error, a blocked script, `prefers-reduced-motion` — gets the cut title
exactly as it was. Verified rather than assumed: at rest the eight paths measure
0.007/255 mean pixel difference against the single baked path that ships today.

**The morph is driven by scroll fraction, not by where the word is on screen.**
That looks like the wrong choice and isn't. The cut title is held against the
*end* of the document — that is the entire device — so it never travels up the
viewport the way a section does, and on a composition that does not fit one
screen it sits a few pixels above the fold at full scroll and no
viewport-relative measure ever leaves zero. Scroll fraction has no such regime to
get wrong: in the doorway, where the document is deliberately two screens, it is
the second screen that turns the word.

Nothing about the geometry moves during the morph. Every face is scaled to Friz's
cap height and its tracking solved so the ink spans the same width, so `--cue-ratio`,
`--cue-ink`, `--cue-overshoot` and the viewBox are all still Friz's, and the cap
line the cut is taken from stays exactly where it is.

## What was measured

117 faces — 103 from `google/fonts`, 14 already installed on the machine this was
built on — set as PROJECTS and compared to Friz Quadrata. `ranking.csv` is the
full result.

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

**Spacing comes from HarfBuzz, not from reading GPOS.** Kerning was originally
pulled out of GPOS by hand, and that was wrong for six faces in three different
ways — each one a thing a shaper knows and a reader does not:

- **Subtable precedence.** Switzer's `kern` lookup carries a Format 1 list of
  specific pairs *and* a Format 2 class table. In OpenType the first matching
  subtable wins; reading them all and keeping the last let a class default of
  −1 clobber the real −10, −19 and −9 on OJ, CT and TS.
- **Which feature a lookup belongs to.** Scanning every PairPos lookup in the
  font applies kerning that the `kern` feature never asked for. Geologica came
  out with 7 kerned pairs where it has 2.
- **The legacy `kern` table.** Franklin Gothic Medium and Tahoma do their
  kerning in the old TrueType `kern` table and have none in GPOS, so a
  GPOS-only reader found nothing and spaced both of them wrong.

`kerncheck.py` is the check: it shapes the word with HarfBuzz and diffs every
pair against what the layout produces. `lib.kern_pairs` survives only as a
fallback for when `uharfbuzz` is not installed, with exactly the limits above.

Two more measurement traps, both hit and both fixed:

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
| `curated.py` | the shortlist, its blurbs, and the weight-fit. Both builds read it |
| `build-site.py` | → `portfolio/cut-morph.js` (one face) and `faces.json` (all) |
| `build-specimen.py` | → `specimen.html` |
| `faces.json` | all 24, for the tuner. Generated; not hand-edited |
| `rank.py` | the whole-pool sweep → `ranking.csv` |
| `kerncheck.py` | diffs the layout against HarfBuzz, pair by pair |
| `specimen.tpl.html` | the page, with `__DATA__` / `__DISP__` / `__BODY__` slots |
| `specimen.html` | the built page. Self-contained; just open it |
| `raster.py` | nonzero-winding rasteriser, for checking frames by eye |
| `candidates-google*.txt` | the `google/fonts` slugs the sweep pulled |

`../morph-tuner.html` sits one level up, beside the other tuners.

## Running it

Needs `fontTools`, `brotli`, `skia-pathops`, `uharfbuzz`, `Pillow` — and font files, none of
which are in this repository:

```bash
pip install fonttools brotli skia-pathops uharfbuzz Pillow
```

Both scripts expect `friz/FrizQuadrataStd.ttf` plus `gf/` and `fsf/` directories
of candidates beside them. The `google/fonts` ones come from the slug lists; the
Fontshare ones from `api.fontshare.com/v2/fonts/download/<slug>`, taking
`Fonts/TTF/<Name>-Variable.ttf` out of each zip so the weight can be matched.

## What is deliberately not here

**No font binaries.** Not Friz Quadrata, which was removed from this repository
on purpose and supplied locally for this work, and not the ~130 candidates. The
word is geometry on the wire, exactly as it already was — the morph adds outlines
and no `@font-face`, and nothing in `/fonts` changed.

**No change to the cut title's geometry.** `portfolio/styles.css` is untouched
and so is the block in `portfolio/app.js` that puts the word inline; the morph is
additive, and removing `cut-morph.js` restores the previous behaviour exactly.

## Before any of this ships

- **Licensing.** Settled for what ships: Host Grotesk is OFL. It stays settled
  only while the baked face is one of the OFL ones — the Fontshare faces are free
  for commercial use but are **not** OFL, so read the terms before baking one in.
  Either way no font binary reaches the wire; the word is geometry, and the
  licence question is about redistributing the outlines it was traced from.
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
