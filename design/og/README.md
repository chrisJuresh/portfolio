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

## What the card says now

The name, the rule, and "Projects". Nothing else.

It used to carry a supporting line — "product · platform · systems · data",
briefly "backend · frontend · systems · data". That went for two reasons. It
repeated `og:description`, which renders right beside the image in a social
card, so the same four words appeared twice in one view. And it named the least
distinguishing things about the work, on a page that otherwise earns attention
through specifics.

`og:description` still carries the disciplines in prose. With the image no
longer listing them there is nothing duplicated, so the two now complement
rather than echo.

## Editing

Everything tunable is in the config block at the top of `build-og.py`.

**To bring a supporting line back**, set `LINE_WORDS` to a list of words.
Separators are inserted automatically — don't put them in the list. The build
prints the line's extent and warns if it would run into the arc and grid at
x991; if it does, shorten the line or reduce `WORD_GAP`.

You will also need to deal with `BLOCK_SHIFT` (see below) — the build refuses
to run with both set, and tells you what to change. Then **update
`og:image:alt` in `projects/index.html`** so the alt text still describes the
picture.

**`BLOCK_SHIFT` moves the name, rule and "Projects" down** by 86px from where
the plate has them. Without a supporting line the block ended at y566 with
343px of empty paper below it against 169px above, which read as top-heavy.
86 centres it (255 above, 257 below) and drops the cap-top of "Projects" onto
the horizontal rule through the crosshair at y430-431, so the title sits on the
decoration's own axis. Set it to 0 to leave the block where the plate has it.

The block is moved as pixels, not re-set as type. Only the small supporting
line's face was ever calibrated; "Projects" is display type whose size and
tracking were never measured, so moving the raster is exact where
re-typesetting would be a guess.

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

`verify()` compares the ink profile of a word that appears both on the plate and
in a re-set line. It only has something to compare when `LINE_WORDS` contains
"systems", so with the line dropped it says so and skips. When it does run it
prints two rows that should stay close — this is what it looked like with the
discipline line in place:

```
plate  systems: mass   139843  px<230  1416  mean-ink  152.2  min 84
re-set systems: mass   140069  px<230  1397  mean-ink  152.3  min 87
```

That is what keeps re-set type from reading heavier or lighter than the plate.
`GLYPH_BLUR` exists solely to match the plate's antialiasing, which is softer
than a clean downsample. If you restore a line and change `SIZE_PT`, `INK` or
`GLYPH_BLUR`, watch those rows.

Worth knowing if you re-set type from scratch: matching glyph *widths* is not
enough to identify a face, and ink coverage is what separated Latin Modern from
the rest. The finding is recorded above precisely so nobody has to redo it.
