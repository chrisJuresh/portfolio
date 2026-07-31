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

### The cause: ink density, not hairlines and not hinting

Two intuitive explanations are both **wrong**, and were measured to be wrong.

*Not stroke contrast.* Latin Modern's thinnest horizontal stroke — the arms of E,
the apex of W — is 41.2/1000 em. Times New Roman's is **40.0**, marginally
thinner, at a higher stem-to-hairline ratio (2.4x vs 2.2x). CM's hairlines are not
the thin ones.

*Not hinting.* Stripping Times' TrueType instructions entirely leaves it just as
sharp (ratio 1.11 hinted, 1.23 stripped), so Chromium is not executing TrueType
hinting in this path at all. Hinting cannot explain the difference in either
direction.

What is left is the proportions of the design. At the same `font-size`, against
Times, Latin Modern has a 4% shorter x-height (0.431 vs 0.447 em), 7% thinner
stems (89 vs 95/1000 em) and 4% wider advances. Compounded, it lays down about
**27% less ink over a slightly larger area** — mean coverage 0.49 against 0.62.
Fewer pixels cross the threshold into solid, so proportionally more of the glyph
is partial-coverage grey. That is what reads as blur, and no build setting or CSS
property changes it, because it is the typeface.

**Display density fixes most of it.** The same measurement at 2x:

| Specimen | 1x | 2x | change |
|---|---|---|---|
| Times New Roman 13.6px | 1.07 | 1.60 | +50% |
| Latin Modern 10 @ 13.6px | 0.56 | 1.25 | **+123%** |
| Latin Modern 9 @ 15.2px | 0.61 | 1.48 | +141% |

More device pixels per em means the sub-pixel-thin parts of the glyph finally
cover whole pixels. On any Retina display, modern phone or 4K monitor the gap
nearly closes. On a 1080p monitor it does not.

### Five things that do *not* help — all measured, none retried

| Attempt | Result |
|---|---|
| Keep the CFF hinting `--no-hinting` strips (`BlueValues`, `StdVW`) | No better: 0.50 vs 0.56. +5.4 KB/face for nothing. |
| Convert to TrueType outlines and autohint with `ttfautohint` | **Worse: 0.23 vs 0.52.** Autohinting rounded the thin strokes down. |
| Install the font locally instead of serving it | No difference. Times measures 1.13 both as a system font and as the identical file served as a webfont. |
| `-webkit-font-smoothing: antialiased` / `subpixel-antialiased` / unset | No difference at all — it is a macOS-only property. Subpixel AA is already active (96% of pixels carry a colour cast). |
| Assume it is stroke contrast and pick a lower-contrast CM cut | There is no such thing; the hairlines already match Times'. |

### Things that do help

- **A high-DPI display**, by far the largest factor (+123%).
- Larger sizes, modestly: 0.56 to 0.61 from 13.6px to 15.2px on the 9pt cut.
- The 8pt/9pt optical cuts, whose stems are thicker (225 vs 215 units).
- **Darker ink.** Since CM deposits ~27% less ink, drawing it at reduced opacity
  compounds the problem. `projects/styles.css` sets card descriptions in
  `--card-soft`, which is 78% opacity; at full `--card-ink` they would hold up
  noticeably better. Untested as of writing, but it is the cheapest lever left.
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
