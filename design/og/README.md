# Social preview card

`projects/og.jpg` — the Open Graph / Twitter image for `/projects`. Not
hand-edited: it is built from the files here.

```bash
python design/og/build-og.py
```

Rebuilds `projects/og.jpg` from `og-source.png`. Deterministic — same inputs
give a byte-identical file, so a no-op rebuild leaves the working tree clean.

Needs `pillow`, `fonttools`, `brotli` and `numpy`. `brotli` is what lets
fontTools unpack the woff2.

## Why this exists

The card was hand-made and only ever existed as a flattened raster, so changing
a single word meant redrawing the whole thing. `og-source.png` is that original
plate at full 1731×909. The script wipes the text bands it doesn't want and
re-sets the bottom line, so edits are now a config change.

Nothing in `design/` is deployed — `.vercelignore` excludes the whole directory,
so the 1.9 MB plate costs nothing at the edge. It also costs nothing in the repo:
it is the same blob as the pre-JPEG `projects/og.png`, already in history at
`9e149ea`, so git stores one copy.

## Editing

Everything tunable is in the config block at the top of `build-og.py`.

To change the discipline line, edit `LINE_WORDS`. Separators are inserted
between words automatically — don't put them in the list. After changing text,
**update `og:image:alt` in `projects/index.html`** so the alt text still
describes the picture.

The build prints the line's extent and warns if it would collide with the arc
and grid decoration at x991. If it does, shorten the line or reduce `WORD_GAP`.

To move the line vertically, change `LINE_TOP`. It currently sits at 683, which
puts a 117px gap below "Projects" against a 184px bottom margin — the line reads
as part of the title block. Placing it lower leaves a gap wider than the bottom
margin, which reads as a hole.

## What was determined empirically

Two things were measured off the plate rather than assumed, and both are easy to
get wrong if you re-set the type from scratch.

**The typeface is Latin Modern Roman 10**, the face in
`fonts/lmroman10-regular.woff2`. The card predates the site's move to Sitka (see
the main README's *Typography* section), which is why `fonts/` still carries it.

Matching on glyph *widths* alone is not sufficient — it points at Constantia,
which is wrong. Ink *coverage* separates them cleanly. Rendering "systems" at the
plate's own 144×36 ink box:

| candidate | coverage vs plate |
| --- | --- |
| **Latin Modern Roman 10** | **0.98×** |
| Constantia | 1.33× |
| Georgia | 1.39× |
| Cambria | 1.32× |
| Times | 1.31× |
| Sitka, every optical size | 1.27× – 1.41× |

Everything else is far too heavy. The ball terminal on the `y` descender
confirms it; Constantia and Sitka both use a straight cut.

**The separator is not a typeset character.** It is a sage-green dot matching
the rule under the name, not the text colour, so it is lifted from the plate as
an alpha matte (`DOT_SRC`) and composited. No font's `·` reproduces it.

## How the erase works

A flat fill would show as a patch: the paper carries both a faint tonal drift
and visible grain. `erase()` interpolates tone per column from clean strips
above and below the band, then tiles real grain sampled from `GRAIN_SRC`, so the
texture continues unbroken.

Bands stop at x930 because the decoration starts at x991 and must survive. The
upper band starts at y582 because "Projects" has a `j` descender reaching y566.

## Checking your work

`verify()` runs on every build and prints the ink profile of a word that appears
both on the plate and in the re-set line, currently "systems":

```
plate  systems: mass   139843  px<230  1416  mean-ink  152.2  min 84
re-set systems: mass   140069  px<230  1397  mean-ink  152.3  min 87
```

Those two rows should stay close. They are what keeps re-set type from reading
heavier or lighter than the original — `GLYPH_BLUR` exists solely to match the
plate's antialiasing, which is softer than a clean downsample. If you change
`SIZE_PT`, `INK` or `GLYPH_BLUR`, watch them. If you drop "systems" from
`LINE_WORDS` the check can't run and says so; the plate's own line is still
there to compare against by eye.
