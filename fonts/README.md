# Fonts

Two things live here: the families `/portfolio` is actually set in, and the Latin
Modern Roman files that record a decision made and reversed.

- [In use — Vollkorn, Spectral, Source Serif 4](#in-use--vollkorn-spectral-source-serif-4)
- [In use — Host Grotesk](#in-use--host-grotesk)
- [Not in use — Latin Modern Roman](#not-in-use--latin-modern-roman)
- [Removed — Friz Quadrata Std](#removed--friz-quadrata-std)

The page is set in two kinds of face and the split is by section, not by taste:
the CV at the top is set in book serifs, and the Projects Panel at the foot is
set in a grotesk. See [In use — Host Grotesk](#in-use--host-grotesk) for why that
is not an inconsistency.

## In use — Vollkorn, Spectral, Source Serif 4

`/portfolio` is set in these. They replaced the Sitka stack, which named system
faces and shipped no files; the `@font-face` blocks are in `src/kernel/faces.css`
rather than in a stylesheet of their own, because every word on the page needs
one of these faces and a second `<link>` would block the first paint. They were
at the top of `portfolio/styles.css` while the page was hand-written.

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
handful of glyphs the current text needs. A Section's `content.ts` is written to
be edited — `pnpm editor` is how — and the year strings are prose
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

## In use — Host Grotesk

The Projects Panel at the foot of `/portfolio` is set in this, and nothing above
it is. Its `@font-face` pair sits with the other five in `src/kernel/faces.css`.

**It is not a sixth reading face and it is not an inconsistency.** The page is two
compositions: a CV set as a printed page, and — past the cut title and the
doorway — one project shown as an interface. The cut title is the hinge between
them, and it *morphed into Host Grotesk* as the page scrolled
(`design/cut-title/morph`, and the runtime that did it went with the hand-written
page). Setting the Panel in anything else would mean the word arrives in one face
and the section it titles is set in another.

| File | Size | wght | Used for |
|---|---|---|---|
| `hostgrotesk-regular.woff2` | 16 KB | 400 | body copy, subheading, the points' figures, the Rail |
| `hostgrotesk-medium.woff2` | 16 KB | **514** | the `PROJECTS` masthead, the points' titles |

32 KB for the pair. Neither is on the critical path in the way the serifs are —
nothing in the first screen names this family — but both are fetched on load,
because the Panel's text is in the document from first paint.

**Source.** `google/fonts`, `main` branch: `ofl/hostgrotesk/HostGrotesk[wght].ttf`
— variable, wght 300–800, default 300. Upstream is
[Element-Type/HostGrotesk](https://github.com/Element-Type/HostGrotesk).

**Licence.** SIL Open Font License 1.1 — `OFL-HostGrotesk.txt`, copied from the
same directory. As with the others, name IDs 0 and 13 are retained by the subset,
so the copyright and licence records travel inside each `.woff2`. Being OFL is
why this face is on the site at all: the cut-title morph shortlisted twelve
Fontshare faces that are free for commercial use but are *not* OFL, and choosing
one of those would have reopened the licensing question that removing Friz
Quadrata closed.

### Why the second cut is at wght 514

Because that is the instance the cut title turns into, and it was solved for
rather than chosen: `design/cut-title/morph` scales every candidate to Friz
Quadrata's cap height and searches its weight axis for the stem that matches
Friz's, so the word does not change colour as it morphs. For Host Grotesk that
landed on **514** — recorded in `faces.json`, and the weight `cut-morph.js`
carries inline. The Panel's masthead is the same word again, so it is set in the
same instance; at the foot of the scroll the morphed title and the masthead below
it are one drawing at two sizes.

Two consequences, both deliberate:

- **It is declared `font-weight: 500` in the CSS**, because CSS needs a rung and
  514 is not one. The `@font-face` descriptor is what font selection reads, so the
  file's own `usWeightClass` — left at 514, truthfully — never enters into it.
- **`updateFontNames` is off for that cut.** 514 is not a named instance, so STAT
  cannot name it and the file would otherwise inherit the variable default's
  "Light". The build sets name IDs 1/2/4/6 to `Host Grotesk Medium` by hand
  instead. Same situation as the `opsz` pin on Source Serif 4 above.

If the morph is ever re-solved against a different face or a different cap
reference, **re-instance this cut at whatever weight it lands on** — or the
masthead and the word above it quietly stop being the same drawing.

### Building them

Same recipe as the serifs — Latin-1 + Latin Extended-A + General Punctuation +
arrows + f-ligatures, `--no-hinting`, woff2, name IDs `0,1,2,3,4,5,6,13,14` — with
one change to the kept features. `onum`/`lnum` are dropped (Host Grotesk has no
old-style figures and nothing here asks for them) and **`case` is added**, which
the uppercase blocks turn on with `font-feature-settings: "case" 1`. The masthead,
the subheading, the Rail and the points are all set in capitals by CSS, and
`case` is what lifts the punctuation among them to suit — the hyphen in
`SELF-STACKING`, the comma and the em dash in the figures. Drop it from the subset
and those sit at lowercase height under 100px capitals, with nothing in the CSS to
explain why.

```bash
python - <<'PY'
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
# 400 has a named instance, so STAT can name it.
instancer.instantiateVariableFont(
    TTFont("HostGrotesk[wght].ttf"), {"wght": 400},
    inplace=False, updateFontNames=True).save("_hg400.ttf")
# 514 does not — see above. Name it by hand instead.
f = instancer.instantiateVariableFont(
    TTFont("HostGrotesk[wght].ttf"), {"wght": 514},
    inplace=False, updateFontNames=False)
for nid, value in ((1, "Host Grotesk Medium"), (2, "Regular"),
                   (4, "Host Grotesk Medium"), (6, "HostGrotesk-Medium")):
    f["name"].setName(value, nid, 3, 1, 0x409)
    f["name"].setName(value, nid, 1, 0, 0)
f.save("_hg514.ttf")
PY

python -m fontTools.subset _hg400.ttf \
  --unicodes="U+0000-00FF,U+0100-017F,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2190-2193,U+2212,U+FB00-FB04" \
  --layout-features='kern,liga,clig,calt,ccmp,locl,case,frac' \
  --flavor=woff2 --no-hinting \
  --name-IDs='0,1,2,3,4,5,6,13,14' \
  --output-file=hostgrotesk-regular.woff2
```

`_hg514.ttf` takes the same subset call, out to `hostgrotesk-medium.woff2`. Both
land at 380 glyphs and 16 KB.

### Metrics, measured from the files

| Face | x-height | cap-height | x/cap | stem (1/1000 em) |
|---|---|---|---|---|
| Host Grotesk 400 | 0.496 | 0.700 | 0.709 | 90 |
| Host Grotesk 514 | 0.496 | 0.700 | 0.709 | 112 |
| Vollkorn *(the CV's body)* | 0.458 | 0.676 | 0.678 | — |

Its x-height is the largest of any face here — 8% over Vollkorn's — so it sets
noticeably larger at the same `font-size`. That is why the Panel's own sizes are
derived from the design render as a share of the viewport rather than borrowed
from the column above.

Ascender minus descender is **1.330 em** (1015 / −315 at 1000 upem), and that
number is load-bearing in the Projects Panel: `--projects-panel-frame-drop-share`
derives
the Frame's overlap of the subheading's second line from the half-leading it
implies at `line-height: 1`. **Re-derive it if this face is ever replaced** — the
comment on that property has the whole arithmetic.

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
| `lmroman10-bold.woff2` | 20 KB | `font-weight: 700` |
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
  compounds the problem. The worked example was `projects/styles.css`, which set
  card descriptions in `--card-soft` at 78% opacity where full `--card-ink` would
  have held up noticeably better. That page went in #71, but the lever is general
  and is still the cheapest one left wherever CM is drawn soft.
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

`vercel.json` sets a year-long `immutable` cache on `/fonts/(.*).woff2`, which is
safe because the filenames are stable and the contents never change. Anything
rebuilt here therefore needs a new filename, not a new file under the old name.

**`fonts.css` is deliberately outside that rule**, on `max-age=0,
must-revalidate`. It used to be inside it, back when the pattern was `/fonts/(.*)`
and the reasoning was "the contents never change" — true of the binaries, and
false of the stylesheet, which gains a block every time a face is added here. The
effect was that adding a face did nothing for anyone who had ever loaded the old
sheet: the browser held it for a year and never asked again, so the `@font-face`
simply did not exist for them. Friz Quadrata is how this was found — the face was
on disk and served, and the type tuner still reported it missing, because the
tuner was reading a cached sheet that predated it. The stylesheet is ~5 KB and
revalidates with a 304; the binaries it points at are what the immutable year is
actually for.

### Note

Linking `fonts.css` no longer activates anything on its own. It used to: the old
stacks named `"Latin Modern Roman"` third, so the link alone was the whole switch.
Adopting Latin Modern now would mean editing `--serif` (projects) and
`--serif-label` / `--serif-body` (portfolio) as well — the latter two now lead with
Spectral and Vollkorn — and re-applying the size compensation above, which the
current sizes still do not carry (they were set for Sitka's larger x-height, and
Vollkorn's is only 4% below it, not the 11.6% Latin Modern needs).

## Removed — Friz Quadrata Std

Ernst Friz's 1973 face, in Adobe's Std cut. It set exactly one word — the cut
title at the foot of `/portfolio` — and **it is no longer here.** Four files were
deleted (`frizquadrata-{regular,bold}.woff2` and the `-fixedmetrics` pair built
from them), along with the `@font-face` blocks that served it and the
`--serif-display` family name. Nothing on this site names,
serves or falls back to the face.

### Why, and what took its place

Serving it meant redistributing a commercial Adobe/ITC cut from `chrisj.uk`, and
a file sitting in `/fonts` is served whether or not a page links it. So the word
stopped being type and became a picture of type: `design/cut-title/build-cut-title.py`
sets PROJECTS once, at the tracking it was always set at, and bakes the eight
glyphs to a single SVG path, `src/sections/front-screen/assets/cut-title.svg`,
which the Section compiles inline into its own markup. The result is
vector, so it is exact at any size and any pixel density — and it was checked
rather than assumed, by rasterising the baked path and the live font side by side
and comparing them: the outlines coincide at scale 1.000 with the residual
confined to antialiasing along the letters' edges.

Everything the page needed the font's metrics for is now derived from the
outlines and printed by the build script. See the `--front-screen-cut-*` block in
`FrontScreen.astro`.

### To re-bake it

The face is not in this repository and cannot be recovered from it. Point the
build script at a local copy:

```bash
python design/cut-title/build-cut-title.py --font /path/to/frizquadrata-regular.woff2
```

One thing to know before you do, because it cost a day the first time. **The
supplied file's declared metrics were wrong**: `unitsPerEm` is 2048, but
`sxHeight` (460) and `sCapHeight` (659) were left at the 1000-unit scale of the
CFF original after the outlines were scaled up — so `1cap` resolved to 0.322 em
against 0.658 em of drawn capital, and every CSS `cap`/`ex` measurement came out
at less than half. The fix was two integer writes into a copy:

```python
f["OS/2"].sxHeight   = 942    # drawn top of 'x'
f["OS/2"].sCapHeight = 1348   # drawn top of 'H'
```

The build script reads `sCapHeight` for `--cue-cap-share`, so a re-bake from an
**unrepaired** copy will produce a correct-looking picture with a cap ratio that
is wrong by 2.046x, and the cut will slice through the middles of the letters
rather than the top 0.62 of them. Repair the copy first, or take the cap height
from the drawn top of `H` instead of the field.
