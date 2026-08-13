# Fonts

Three things live here: the three families `/portfolio` is actually set in, the
Latin Modern Roman files that record a decision made and reversed, and Friz
Quadrata, which is declared but unused.

- [In use — Vollkorn, Spectral, Source Serif 4](#in-use--vollkorn-spectral-source-serif-4)
- [Not in use — Latin Modern Roman](#not-in-use--latin-modern-roman)
- [Not in use — Friz Quadrata Std](#not-in-use--friz-quadrata-std)

## In use — Vollkorn, Spectral, Source Serif 4

`/portfolio` is set in these. They replaced the Sitka stack, which named system
faces and shipped no files; the `@font-face` blocks are at the top of
`portfolio/styles.css` rather than in a stylesheet of their own, because every
word on the page needs one of these faces and a second `<link>` would block the
first paint.

`/projects` is untouched and still runs its own stack.

| File | Size | Slot | Used for |
|---|---|---|---|
| `vollkorn-regular.woff2` | 24 KB | `--serif-body` | body, role lines, contact |
| `vollkorn-bold.woff2` | 25 KB | `--serif-body` | `.listing > h2` |
| `vollkorn-italic.woff2` | 25 KB | `--serif-body` | `.item .sub` |
| `spectral-regular.woff2` | 15 KB | `--serif-label` | name, tagline, projects link, theme toggle |
| `sourceserif4-regular.woff2` | 21 KB | `--serif-num` | the year column |

~112 KB in total, on a page that previously shipped no webfonts at all. Only the
faces the CSS asks for are here; adding a weight to the CSS without adding a face
gets a synthesised one — smeared fake bold, or a slanted roman for an italic.

**Sources.** All three from the `google/fonts` repository, `main` branch, which is
upstream for Vollkorn and Spectral and a mirror of Adobe's releases for Source
Serif 4:

- `ofl/vollkorn/Vollkorn[wght].ttf` and `Vollkorn-Italic[wght].ttf` — variable, wght 400–900
- `ofl/spectral/Spectral-Regular.ttf` — static
- `ofl/sourceserif4/SourceSerif4[opsz,wght].ttf` — variable, wght 200–900, opsz 8–60

**Licence.** All three are SIL Open Font License 1.1 — `OFL-Vollkorn.txt`,
`OFL-Spectral.txt`, `OFL-SourceSerif4.txt`, copied from the same directories. As
with Latin Modern, the copyright and licence records travel inside each `.woff2`
name table (IDs 0 and 13 are retained by the subset), so the notice cannot be
separated from the file.

### Building them

Same recipe as Latin Modern below — Latin-1 + Latin Extended-A + General
Punctuation + arrows + f-ligatures, `--no-hinting`, woff2 — with two changes.

**`onum` is added to the kept features, and it is load-bearing.** The year column
sets `font-variant-numeric: oldstyle-nums`, and that is the entire reason
`--serif-num` is a separate slot. Source Serif 4's default figures are *lining*,
standing to 100.3% of the cap height beside them; its old-style forms exist only
behind the `onum` feature, at 85.0% of cap. Subset without `onum` and the column
silently goes back to loud lining figures, with nothing in the CSS to explain it.
`lnum` is kept alongside it so the lining forms stay reachable.

**The two variable fonts are instanced, not shipped variable.** Static faces came
out smaller here: 110 KB across five static files against 134 KB for the
fewest-files variable arrangement, because a wght axis spanning 400–900 costs more
than the two cuts actually used.

```bash
python - <<'PY'
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
# Vollkorn: the two weights the CSS asks for, from the variable source
for wght, out in ((400, "_vk400.ttf"), (700, "_vk700.ttf")):
    instancer.instantiateVariableFont(
        TTFont("Vollkorn[wght].ttf"), {"wght": wght},
        inplace=False, updateFontNames=True).save(out)
instancer.instantiateVariableFont(
    TTFont("Vollkorn-Italic[wght].ttf"), {"wght": 400},
    inplace=False, updateFontNames=True).save("_vki400.ttf")
# Source Serif 4: wght 400, opsz pinned — see the note below on 14.4.
# updateFontNames=False because STAT has no named value for opsz 14.4.
instancer.instantiateVariableFont(
    TTFont("SourceSerif4[opsz,wght].ttf"), {"wght": 400, "opsz": 14.4},
    inplace=False, updateFontNames=False).save("_ss4.ttf")
PY

python -m fontTools.subset _vk400.ttf \
  --unicodes="U+0000-00FF,U+0100-017F,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2190-2193,U+2212,U+FB00-FB04" \
  --layout-features='kern,liga,clig,frac,dnom,numr,onum,lnum' \
  --flavor=woff2 --no-hinting \
  --name-IDs='0,1,2,3,4,5,6,13,14' \
  --output-file=vollkorn-regular.woff2
```

The subset is deliberately the same wide one Latin Modern got, rather than the
handful of glyphs the current text needs. `portfolio/content.js` is written to be
hand-edited — its own header says so — and the year strings are prose
(`"2024–Present"`), not digits. A subset cut to today's characters would fail on
the next content edit, and fail as a missing glyph rather than as an error.

### The opsz pin on Source Serif 4

Source Serif 4 carries an optical-size axis. Browsers set it automatically from
the used font size in px, so keeping it live would be the typographically correct
thing — but it costs 28 KB (50 KB against 21 KB) for one short column of dates, so
it is pinned instead.

It is pinned at **14.4**, which is the px size the year column actually renders
at: `.item .when` inherits `.item .line`'s `0.9rem`, and 0.9 x 16 = 14.4. That is
the value a browser's own `font-optical-sizing: auto` would have chosen, so the
pin is invisible in the normal case.

This couples the binary to a number in the CSS. **If `.item .line`'s `font-size`
changes, re-instance the face** at the new px size, or the column quietly renders
at an optical size cut for the old one.

### Metrics, measured from the files

x-height and cap-height as fractions of the em, from `OS/2`:

| Face | x-height | cap-height | x/cap |
|---|---|---|---|
| Sitka Text *(outgoing)* | 0.478 | 0.637 | 0.750 |
| Georgia *(fallback ref)* | 0.481 | 0.693 | 0.695 |
| Vollkorn | 0.458 | 0.676 | 0.678 |
| Spectral | 0.450 | 0.660 | 0.682 |
| Source Serif 4 | 0.475 | 0.670 | 0.709 |

Both reading faces are slightly *smaller* than Sitka at the same `font-size` —
Vollkorn by 4%, Spectral by 6%. That is a fraction of the 11.6% Latin Modern would
have needed (below), so the sizes in `portfolio/styles.css` were left alone.

### One thing to re-measure on merge

The vertical metrics of these faces are much larger than Sitka's, and there is a
constant elsewhere in this repo derived from Sitka's:

| Face | (typoAscender − typoDescender) / em | half-leading at `line-height: 1.55` |
|---|---|---|
| Sitka Text | 1.000 | 0.275 |
| Georgia | 0.973 | 0.288 |
| Vollkorn | 1.393 | 0.079 |
| Source Serif 4 | 1.371 | 0.090 |
| **Spectral** | **1.522** | **0.014** |

Spectral's ascender and descender nearly fill its line box, so at `1.55` it has
almost no half-leading left — 0.014 against Sitka's 0.275.

This does not matter on this branch: `development` has no constant of that kind.
It matters the moment this meets the cut-title work, which carries
`--name-half-leading: calc(0.294 * 0.78rem)` — 0.294 being Sitka Text's
half-leading, and `.name` being set in `--serif-label`, now Spectral. With
Spectral loaded that constant is wrong by about 3.5px (3.67px assumed against
0.17px actual), and it feeds `--cue-gap`, which positions the cut title. Whoever
merges the two should re-derive it from Spectral, or decide the title's gap is a
design number rather than a measured one and say so in the comment.

## Not in use — Latin Modern Roman

Self-hosted webfonts for the Computer Modern look the site's CSS used to ask for
but never actually shipped.

> **Not in use.** No page links `fonts.css`. Everything below is kept because it
> is the record of *why* Computer Modern was rejected — the measurements in "Why
> it renders softer than the Times fallback" are the reason — and because it is
> still the fastest way back if that decision is ever revisited.

### Why these exist

Every stylesheet declared:

```css
font-family: "Computer Modern", "CMU Serif", "Latin Modern Roman", serif;
```

None of those three families was ever installed or served, so every visitor fell
through to generic `serif` — Times New Roman on Windows and macOS, Noto Serif on
Android, usually DejaVu Serif on Linux. The intended typeface had never rendered
for anyone, and the fallback wasn't even consistent between visitors.

### What this is

**Latin Modern Roman** is the maintained OpenType successor to Knuth's original
Computer Modern, produced by GUST (the Polish TeX Users Group). It is the
standard choice for CM on the web — the original METAFONT sources are not
directly usable as web fonts.

- **Source:** [CTAN](https://ctan.org/pkg/lm), package `lm`, version 2.004,
  from `fonts/opentype/public/lm/`
- **Licence:** GUST Font License — see `GUST-FONT-LICENSE.txt`. Permissive and
  redistributable. The copyright and licence notice is also embedded in each
  `.woff2` name table, so the notice travels with the file.

### Files

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

### Optical sizes matter here

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

### The metric that drives everything

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

### Why it renders softer than the Times fallback

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

#### The cause: ink density, not hairlines and not hinting

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

#### Five things that do *not* help — all measured, none retried

| Attempt | Result |
|---|---|
| Keep the CFF hinting `--no-hinting` strips (`BlueValues`, `StdVW`) | No better: 0.50 vs 0.56. +5.4 KB/face for nothing. |
| Convert to TrueType outlines and autohint with `ttfautohint` | **Worse: 0.23 vs 0.52.** Autohinting rounded the thin strokes down. |
| Install the font locally instead of serving it | No difference. Times measures 1.13 both as a system font and as the identical file served as a webfont. |
| `-webkit-font-smoothing: antialiased` / `subpixel-antialiased` / unset | No difference at all — it is a macOS-only property. Subpixel AA is already active (96% of pixels carry a colour cast). |
| Assume it is stroke contrast and pick a lower-contrast CM cut | There is no such thing; the hairlines already match Times'. |

#### Things that do help

- **A high-DPI display**, by far the largest factor (+123%).
- Larger sizes, modestly: 0.56 to 0.61 from 13.6px to 15.2px on the 9pt cut.
- The 8pt/9pt optical cuts, whose stems are thicker (225 vs 215 units).
- **Darker ink.** Since CM deposits ~27% less ink, drawing it at reduced opacity
  compounds the problem. `projects/styles.css` sets card descriptions in
  `--card-soft`, which is 78% opacity; at full `--card-ink` they would hold up
  noticeably better. Untested as of writing, but it is the cheapest lever left.
- Not using CM for the smallest text at all — what the `hybrid` variant does.

### Regenerating

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

### Deploying

Already handled, and it now covers this whole folder rather than just Latin
Modern: `vercel.json` sets a year-long `immutable` cache on `/fonts/(.*)`, which
is safe because the filenames are stable and the contents never change. Anything
rebuilt here therefore needs a new filename, not a new file under the old name.

### Note

Linking `fonts.css` no longer activates anything on its own. It used to: the old
stacks named `"Latin Modern Roman"` third, so the link alone was the whole switch.
Adopting Latin Modern now would mean editing `--serif` (projects) and
`--serif-label` / `--serif-body` (portfolio) as well — the latter two now lead with
Spectral and Vollkorn — and re-applying the size compensation above, which the
current sizes still do not carry (they were set for Sitka's larger x-height, and
Vollkorn's is only 4% below it, not the 11.6% Latin Modern needs).

## Not in use — Friz Quadrata Std

Ernst Friz's 1973 face, in Adobe's Std cut. Declared in `fonts.css` at weights
500 and 700, linked by nothing.

| File | Size | Weight | Slot |
|---|---|---|---|
| `frizquadrata-regular.woff2` | 17 KB | 500 | — |
| `frizquadrata-bold.woff2` | 17 KB | 700 | — |

Nothing links these files today, so nothing is being served. That stops being
true the moment a page links `fonts.css` or a `@font-face` moves into
`portfolio/styles.css`.

### Where these came from

Supplied as a pre-built webfont kit — `.eot`, `.ttf`, `.woff`, `.woff2` per face,
plus a generated `stylesheet.css` and demo page. That shape is the signature of a
webfont-generator run over a desktop release, and the files bear it out: the
version string is Adobe's own `hotconv` / `makeotf` PostScript toolchain, but the
outlines arrive as TrueType `glyf` rather than the CFF the Std release ships.
Something converted them in between.

The two `.woff2` faces are committed **exactly as they arrived**. They are not
re-subset with the recipe the rest of this folder uses, deliberately — this is a
third-party binary and rebuilding it would blur whose work is whose. The other
four formats and the generated CSS were dropped; `.eot` serves IE 8-11 and
`.ttf`/`.woff` serve browsers that predate 2014, none of which this site
supports.

### Its declared x-height is wrong

Measured from the files, the OS/2 metric fields disagree with the outlines they
describe — in both faces, by the same factor:

| Field | Declared | Drawn | Ratio |
|---|---|---|---|
| x-height | 460 units = **0.225 em** | 942 units = **0.460 em** | 2.048x |
| cap-height | 659 units = **0.322 em** | 1348 units = **0.658 em** | 2.046x |

`unitsPerEm` is 2048. Those declared values are correct for an em of **1000** —
which is what the CFF original had. The conversion scaled the outlines to 2048
and left `sxHeight` and `sCapHeight` behind at their old scale.

What it breaks: `font-size-adjust` reads `sxHeight`, and so do the CSS `ex` and
`cap` units and the metric-matching browsers do when sizing a fallback. All of
them will size this face against an x-height less than half its real one.

Confirmed in Chromium rather than inferred from the tables — with the face set at
`100px`:

| Unit | Resolves to | Should be | |
|---|---|---|---|
| `1ex` | **22.45px** | 46.0px | tracks the stale field |
| `1cap` | **32.17px** | 65.8px | same |

None of those are used in this repo today, which is the only reason this is a
note rather than a bug.

It is left uncorrected on purpose, for the same reason the faces are unsubset —
see above. Correcting it is two integer writes with `fontTools` if it ever
matters, and it would need a new filename, because `vercel.json` puts a
year-long `immutable` cache on `/fonts/(.*)`.

### If it is ever adopted

- **The roman is a 500, and is declared as one.** `usWeightClass` is 500 and
  `fonts.css` matches it. This does *not* put it out of reach of a normal body
  stack: when `font-weight: 400` is asked for and no 400 is declared, CSS font
  matching checks 500 before anything else, so 400 and `normal` both land on
  this face with no synthesis. Measured — 400 and 500 render identically.
- **Check the coverage.** 253 codepoints, 263 glyphs — Latin-1 plus a little
  Latin Extended-A. The other faces here carry 358-glyph subsets covering
  General Punctuation, arrows and f-ligatures. This one has no f-ligatures, and
  its punctuation is thinner. `portfolio/content.js` is hand-edited prose, so a
  gap shows up as a missing glyph on the next content edit.
- Kerning is present, in GPOS, along with `liga`, `frac`, `sups` and `ordn`.
- Its x/cap ratio is 0.698 — close to Georgia's 0.695 and above Vollkorn's 0.678,
  so at a given `font-size` it reads slightly larger than the current body face.
  Its `typoAscender − typoDescender` is exactly 1.000 em, the same as Sitka's, so
  the half-leading arithmetic in the table above would need redoing for it.
