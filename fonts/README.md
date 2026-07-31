# Fonts — Latin Modern Roman

Self-hosted webfonts for the Computer Modern look the site's CSS has always
asked for but never actually shipped.

## Why these exist

Every stylesheet declared:

```css
font-family: "Computer Modern", "CMU Serif", "Latin Modern Roman", serif;
```

None of those three families was ever installed or served, so every visitor fell
through to generic `serif` — Times New Roman on Windows and macOS, Noto Serif on
Android, usually DejaVu Serif on Linux. The intended typeface had never rendered
for anyone, and the fallback wasn't even consistent between visitors.

## What this is

**Latin Modern Roman** is the maintained OpenType successor to Knuth's original
Computer Modern, produced by GUST (the Polish TeX Users Group). It is the
standard choice for CM on the web — the original METAFONT sources are not
directly usable as web fonts.

- **Source:** [CTAN](https://ctan.org/pkg/lm), package `lm`, version 2.004,
  from `fonts/opentype/public/lm/`
- **Licence:** GUST Font License — see `GUST-FONT-LICENSE.txt`. Permissive and
  redistributable. The copyright and licence notice is also embedded in each
  `.woff2` name table, so the notice travels with the file.

## Files

| File | Size | Used for |
|---|---|---|
| `lmroman10-regular.woff2` | 21 KB | body and titles |
| `lmroman10-italic.woff2` | 25 KB | italics |
| `lmroman10-bold.woff2` | 20 KB | `font-weight: 700` (portfolio/styles.css) |
| `lmroman9-regular.woff2` | 21 KB | small text, optional |
| `lmroman8-regular.woff2` | 21 KB | smallest text, optional |
| `lmroman12-regular.woff2` | 21 KB | large headings, optional |

The three `lmroman10-*` faces are the minimum for the site (~67 KB total). The
other three are optical-size cuts, kept for the type lab.

## Optical sizes matter here

Latin Modern ships a separate design per size. Measured from the outlines, they
share x-height and cap-height and differ in **stroke weight**:

| Cut | stem width (1/1000 em) |
|---|---|
| `lmroman8` | 225 |
| `lmroman9` | 225 |
| `lmroman10` | 222 |
| `lmroman12` | 215 |

So the 8pt and 9pt cuts are *sturdier*, not smaller — which is what you want for
small text on screen. Using `lmroman12` for 13px body text is how CM ends up
looking spindly.

## The metric that drives everything

Measured x-height, from the `x` glyph outlines:

| Face | x-height / em | x-height / cap-height |
|---|---|---|
| Latin Modern Roman | 0.431 | 0.631 |
| Times New Roman | 0.447 | 0.676 |
| Constantia | 0.454 | 0.663 |
| Cambria | 0.467 | — |
| Georgia | 0.481 | 0.695 |

Latin Modern's lowercase is **smaller than the Times fallback it replaces**. CM
was cut for high-resolution print at 10–12pt, where that works. On screen at
13–14px it reads tight, so switching to real CM at the current `font-size`
values makes the cards *more* cramped, not less. Compensating needs roughly
**+11.6%** on every size to match Georgia's apparent size, plus extra leading
for CM's tall ascenders and deep descenders.

## Why it renders softer than the Times fallback

Latin Modern looks blurrier than Times New Roman at 13–15px on a standard-density
display. That is intrinsic to the typeface, not a build mistake. Measured by
rasterising the same sentence at 1x and classifying every inked pixel by coverage
(>75% = a pixel that defines the letterform, <=50% = anti-aliasing smear):

| Specimen | solid px | smear px | solid/smear |
|---|---|---|---|
| Times New Roman 13.6px | 40.9% | 38.4% | **1.07** |
| Latin Modern 10 @ 13.6px | 28.5% | 50.7% | 0.56 |
| Latin Modern 9 @ 15.2px | 29.5% | 48.0% | 0.61 |

Latin Modern also renders about 17% lighter overall (mean ink coverage 0.51 vs
Times' 0.61), so it reads fainter as well as softer.

The cause is stroke contrast. Computer Modern is a high-contrast face cut for
high-resolution print: its hairlines and serifs are far thinner than Times'. At
13.6px those hairlines fall well below one physical pixel, so they rasterise as
partial-coverage grey instead of a solid pixel. Times is a low-contrast face with
aggressive TrueType hinting that snaps stems to whole pixels, so more of it lands
solid.

**Display density fixes most of it.** The same measurement at 2x:

| Specimen | 1x | 2x | change |
|---|---|---|---|
| Times New Roman 13.6px | 1.07 | 1.60 | +50% |
| Latin Modern 10 @ 13.6px | 0.56 | 1.25 | **+123%** |
| Latin Modern 9 @ 15.2px | 0.61 | 1.48 | +141% |

Computer Modern gains roughly 2.5x more from a high-DPI screen than Times does,
because hairlines are exactly what was failing at 1x. On any Retina display, a
modern phone, or a 4K monitor the gap nearly closes. On a 1080p Windows monitor
it does not.

### Things that do *not* help

`--no-hinting` in the build below strips the CFF `BlueValues` and `StdVW` from the
Private dict, which are what a rasteriser would use to snap x-height and stems to
the pixel grid. Rebuilding with hinting retained costs +5.4 KB per face and
measures **no better** — 0.50 against 0.56, marginally worse and within noise.
Chromium's DirectWrite path for downloadable CFF fonts does almost no grid
fitting, so the hints go unused. Verified visually at 3x nearest-neighbour
magnification and numerically; `--no-hinting` stays.

### Things that do help

- Larger sizes, modestly: 0.56 to 0.61 going from 13.6px to 15.2px on the 9pt cut.
- The 8pt/9pt optical cuts, whose stems are thicker (225 vs 215 units).
- Not using CM for the smallest text at all — what the `hybrid` variant does.

## Regenerating

Requires `fonttools` and `brotli` (`pip install fonttools brotli`).

```bash
curl -O https://mirrors.ctan.org/fonts/lm/fonts/opentype/public/lm/lmroman10-regular.otf
python -m fontTools.subset lmroman10-regular.otf \
  --unicodes="U+0000-00FF,U+0100-017F,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2190-2193,U+2212,U+FB00-FB04" \
  --layout-features='kern,liga,clig,frac,dnom,numr' \
  --flavor=woff2 --no-hinting \
  --name-IDs='0,1,2,3,4,5,6,13,14' \
  --output-file=lmroman10-regular.woff2
```

The subset is Latin-1 + Latin Extended-A + General Punctuation + arrows +
f-ligatures (358 glyphs), with kerning and ligatures kept. `--name-IDs` retains
ID 0 and 13, the copyright and licence records, which the GUST licence requires.

## Deploying

If these go live, consider a long cache header in `vercel.json`, since the
filenames are stable and the contents never change:

```json
{ "source": "/fonts/(.*)", "headers": [
  { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" } ] }
```

## Note

Linking `fonts.css` is on its own enough to activate the fonts — the existing
stacks already name `"Latin Modern Roman"` third, so no `font-family` edit is
needed. That also means linking it changes both pages immediately. Sizes were
tuned for the Times fallback, so see the size compensation above.
