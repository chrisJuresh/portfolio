#!/usr/bin/env python3
"""Rebuild projects/og.jpg — the social preview card for /projects.

    python design/og/build-og.py

Reads design/og/og-source.png (never deployed; .vercelignore excludes design/)
and writes projects/og.jpg. Deterministic: same inputs, byte-identical output.

WHY A SCRIPT AND NOT A DESIGN FILE
----------------------------------
The card was originally hand-made and only ever existed as a flattened raster,
so changing a word meant redrawing it. og-source.png is that original plate,
kept at full 1731x909. This script erases the two text bands it does not want
and re-sets the bottom line, then encodes. Editing text is now a config change.

TYPEFACE
--------
Latin Modern Roman 10 — fonts/lmroman10-regular.woff2, converted to TTF in a
temp dir at run time because Pillow cannot load woff2.

This was identified from the plate, not assumed. Matching on glyph widths alone
is not enough (it wrongly favours Constantia); ink coverage is the discriminator.
Rendering "systems" at the plate's own 144x36 ink box:

    Latin Modern Roman 10   0.98x the plate's ink coverage
    Constantia              1.33x
    Georgia                 1.39x
    Cambria                 1.32x
    Times                   1.31x
    Sitka (all opsz)        1.27x - 1.41x

Everything but Latin Modern is far too heavy. The ball terminal on the 'y'
descender confirms it — Constantia and Sitka both use a straight cut. The site
itself moved to Sitka later (see README "Typography"); this card predates that,
which is why fonts/ still carries Latin Modern.

CALIBRATION
-----------
GLYPH_BLUR reproduces the plate's antialiasing, which is softer than a clean
box-downsample. At sigma 0.5 the re-set word "systems" matches the plate's:

                        plate    re-set
    ink mass           139843    140069
    pixels < 230         1416      1397
    mean ink luminance  152.2     152.3
    darkest pixel          84        87

verify() re-runs that comparison on every build and prints both rows. If you
change SIZE_PT, INK or GLYPH_BLUR, watch those two rows stay close — that is
what keeps re-set type from looking heavier or lighter than the plate.

DEPENDENCIES
------------
    pip install pillow fonttools brotli numpy
"""
from __future__ import annotations

import os
import sys
import tempfile

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from fontTools.ttLib import TTFont

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SOURCE = os.path.join(REPO, "design", "og", "og-source.png")
WOFF2 = os.path.join(REPO, "fonts", "lmroman10-regular.woff2")
OUTPUT = os.path.join(REPO, "projects", "og.jpg")

# ---------------------------------------------------------------- config ----
# The supporting line under "Projects". Words only — separators are inserted
# between them automatically and are lifted from the plate, not typeset (DOT_SRC).
#
# Currently empty: the card is the name, the rule and "Projects", nothing else.
# The discipline list it used to carry ("product · platform · systems · data",
# later "backend · frontend · systems · data") said the same thing as
# og:description, which renders directly beside the image in a social card, and
# named the least distinguishing things about the work. Set this to a list of
# words to bring a line back — everything below still works.
LINE_WORDS = []

SIZE_PT = 44          # matches the plate's word widths to within 4px
LINE_LEFT = 110       # left margin shared with the name, rule and "Projects"
LINE_TOP = 683        # ink-box top. See the layout note below.
WORD_GAP = 30         # visual gap between ink boxes, as measured on the plate
INK = (95, 85, 72)    # warm near-black; the plate's darkest line pixel is 84 lum
GLYPH_BLUR = 0.5      # see CALIBRATION above

# Bands wiped from the plate, as (x0, x1, y0, y1). The first is the retired
# italic tagline, the second the old "product / platform / systems / data".
# Both stop at x930: the arc and grid decoration begin at x991 and must survive.
# The top band starts at y582 because "Projects" has a 'j' descender ending y566.
ERASE_BANDS = [
    (100, 930, 582, 676),
    (100, 930, 716, 780),
]

# Where the sage interpunct is lifted from, as (x, y, w, h). It is a green
# accent matching the rule under the name — NOT the text colour — so it is
# copied as an alpha matte instead of typeset from the font.
DOT_SRC = (289, 743, 9, 9)
DOT_BASELINE_OFFSET = 16   # dots sat 16px below the line's ink top on the plate

# Ship size and encoding. 1200x630 is the conventional OG ratio; the plate's
# 1731x909 is 1.904:1 against 1.910:1, so nothing is cropped. 4:4:4 rather than
# the usual 4:2:0 because the card is hard-edged serif type and pale hairlines
# on flat cream, exactly what chroma subsampling smears — it costs ~8KB.
OUT_SIZE = (1200, 630)
JPEG_QUALITY = 85

# The name, the rule and "Projects", as (x0, x1, y0, y1), plus how far down to
# move them. Removing the supporting line left the block ending at y566 with
# 343px of empty paper under it against 169px above — visibly top-heavy.
#
# 86 does two things at once. It centres the block (255px above, 257px below),
# and it drops the cap-top of "Projects" from y345 to y431, onto the horizontal
# rule that runs through the crosshair at y430-431. The title now sits on the
# decoration's own axis rather than floating against it.
#
# Set BLOCK_SHIFT to 0 to leave the block where the plate has it. If you restore
# a supporting line via LINE_WORDS, revisit this — the block gets taller and
# needs less shift, and LINE_TOP is measured in unshifted plate coordinates.
#
# x1 is 925 because the decoration reaches as far left as x932 near the top edge.
BLOCK = (100, 925, 155, 580)
BLOCK_SHIFT = 86

# Clean strip the paper grain is sampled from, to refill erased areas.
GRAIN_SRC = (105, 925, 788, 888)   # x0, x1, y0, y1

# Leftmost column of the arc-and-grid decoration. Text must stay left of this;
# draw_line() warns if a longer LINE_WORDS would run into it.
DECORATION_X = 991

SUPERSAMPLE = 4


# ------------------------------------------------------------------ font ----
def load_render_font(tmpdir: str) -> ImageFont.FreeTypeFont:
    """Latin Modern Roman 10 at SIZE_PT, pre-scaled for supersampling.

    Returned at SIZE_PT * SUPERSAMPLE because word_mask() draws large and then
    box-downsamples; handing it a SIZE_PT font renders the type SUPERSAMPLE
    times too small. That is why this takes no size argument.
    """
    ttf = os.path.join(tmpdir, "lmroman10-regular.ttf")
    if not os.path.exists(ttf):
        f = TTFont(WOFF2)   # Pillow cannot read woff2, so unpack to TTF first
        f.flavor = None
        f.save(ttf)
    return ImageFont.truetype(ttf, SIZE_PT * SUPERSAMPLE)


# ----------------------------------------------------------------- erase ----
def build_grain(plate: np.ndarray) -> np.ndarray:
    """High-frequency paper texture, lifted from a clean strip of the plate."""
    x0, x1, y0, y1 = GRAIN_SRC
    patch = plate[y0:y1, x0:x1]
    low = np.asarray(
        Image.fromarray(patch.astype(np.uint8)).filter(ImageFilter.GaussianBlur(9))
    ).astype(np.float32)
    return patch - low


def erase(canvas: np.ndarray, grain: np.ndarray, x0: int, x1: int, y0: int, y1: int) -> None:
    """Wipe a rectangle back to paper: local tone ramp plus real grain.

    A flat fill would read as a patch — the background carries both a faint
    tonal drift and visible texture. The tone is interpolated per column from
    clean strips above and below, so the fill tracks its surroundings; the
    grain is tiled from GRAIN_SRC so the texture continues unbroken.
    """
    h, w = y1 - y0, x1 - x0

    def smooth(v: np.ndarray, k: int = 101) -> np.ndarray:
        # Wide box blur along x, so any residual ink just above or below the
        # band cannot imprint a dark column into the fill.
        pad = np.pad(v, ((k // 2, k // 2), (0, 0)), mode="edge")
        ker = np.ones(k) / k
        return np.stack([np.convolve(pad[:, c], ker, mode="valid") for c in range(3)], axis=1)

    top = smooth(canvas[y0 - 16:y0 - 6, x0:x1].mean(axis=0))
    bot = smooth(canvas[y1 + 6:y1 + 16, x0:x1].mean(axis=0))
    t = np.linspace(0, 1, h)[:, None, None]
    base = top[None] * (1 - t) + bot[None] * t

    tile = np.zeros((h, w, 3), np.float32)
    gh, gw = grain.shape[:2]
    for yy in range(0, h, gh):
        for xx in range(0, w, gw):
            hh, ww = min(gh, h - yy), min(gw, w - xx)
            tile[yy:yy + hh, xx:xx + ww] = grain[:hh, :ww]

    canvas[y0:y1, x0:x1] = np.clip(base + tile, 0, 255)


def shift_block(canvas: np.ndarray, grain: np.ndarray, dy: int) -> None:
    """Move the name/rule/"Projects" block down by dy, wiping where it was.

    The block is moved as pixels rather than re-set as type: only the small
    supporting line's typeface was ever identified, and "Projects" is display
    type whose size and tracking were never calibrated. Moving the raster is
    exact where re-typesetting would be a guess.

    Both source and destination sit on the same flat paper, so the joins carry
    no tonal step; the edges are feathered anyway to keep the grain continuous.
    """
    if dy == 0:
        return
    x0, x1, y0, y1 = BLOCK
    block = canvas[y0:y1, x0:x1].copy()
    erase(canvas, grain, x0, x1, y0, y1)

    h, w = block.shape[:2]
    feather = np.ones((h, w), np.float32)
    for i in range(4):
        f = i / 4.0
        feather[i, :] = np.minimum(feather[i, :], f)
        feather[h - 1 - i, :] = np.minimum(feather[h - 1 - i, :], f)
        feather[:, i] = np.minimum(feather[:, i], f)
        feather[:, w - 1 - i] = np.minimum(feather[:, w - 1 - i], f)

    dst = canvas[y0 + dy:y1 + dy, x0:x1]
    a = feather[..., None]
    canvas[y0 + dy:y1 + dy, x0:x1] = dst * (1 - a) + block * a
    print(f"  moved the title block down {dy}px "
          f"(top margin {y0 + dy + 14}, bottom margin {909 - (566 + dy)})")


# ------------------------------------------------------------------ type ----
def word_mask(word: str, font: ImageFont.FreeTypeFont) -> np.ndarray:
    """Coverage mask for one word: supersampled, box-downsampled, then softened."""
    ss = SUPERSAMPLE
    probe = Image.new("L", (4000, 900), 0)
    ImageDraw.Draw(probe).text((200, 200), word, font=font, fill=255)
    m = np.asarray(probe) > 20
    ys, xs = np.where(m)
    x0, y0 = xs.min(), ys.min()
    w = int(np.ceil((xs.max() - x0 + 1) / ss)) + 2
    h = int(np.ceil((ys.max() - y0 + 1) / ss)) + 2

    big = Image.new("L", (w * ss, h * ss), 0)
    ImageDraw.Draw(big).text((200 - x0, 200 - y0), word, font=font, fill=255)
    small = big.resize((w, h), Image.BOX).filter(ImageFilter.GaussianBlur(GLYPH_BLUR))
    return np.asarray(small).astype(np.float32) / 255.0


def ink_bounds(mask: np.ndarray) -> tuple[int, int, int]:
    """(first ink column, last ink column, first ink row) of a coverage mask."""
    cols = np.where(mask.sum(axis=0) > 0)[0]
    rows = np.where(mask.sum(axis=1) > 0)[0]
    return cols.min(), cols.max(), rows.min()


def dot_matte(plate: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """The plate's own interpunct, as (alpha, colour)."""
    x, y, w, h = DOT_SRC
    patch = plate[y:y + h, x:x + w]
    bg = np.median(plate[735:760, 300:320].reshape(-1, 3), axis=0)
    core = patch.reshape(-1, 3)[patch.mean(axis=2).ravel().argsort()[:8]].mean(axis=0)
    alpha = np.clip(((bg - patch) / np.maximum(bg - core, 1e-3)).mean(axis=2), 0, 1)
    return alpha, core


def compose(canvas: np.ndarray, mask: np.ndarray, colour, x: int, y: int) -> None:
    """Alpha-composite a coverage mask onto the canvas at (x, y)."""
    h, w = mask.shape
    region = canvas[y:y + h, x:x + w]
    a = mask[..., None]
    canvas[y:y + h, x:x + w] = region * (1 - a) + np.asarray(colour, float)[None, None, :] * a


def draw_line(canvas: np.ndarray, plate: np.ndarray, font: ImageFont.FreeTypeFont) -> None:
    """Set LINE_WORDS with lifted separators, left-aligned at LINE_LEFT.

    An empty LINE_WORDS is the current state and not an error: the card is just
    the name, the rule and "Projects". The erase still runs, so both retired
    text bands go back to paper.
    """
    if not LINE_WORDS:
        print("  no supporting line (LINE_WORDS is empty)")
        return

    masks = {w: word_mask(w, font) for w in LINE_WORDS}
    bounds = {w: ink_bounds(masks[w]) for w in LINE_WORDS}
    dot_a, dot_c = dot_matte(plate)
    dw = DOT_SRC[2]

    # Words share a baseline, so offset each by how far its tallest glyph sits
    # below the line's overall ink top (e.g. "systems" has no ascender).
    base_top = min(bounds[w][2] for w in LINE_WORDS)

    x = LINE_LEFT
    for i, word in enumerate(LINE_WORDS):
        c0, c1, top = bounds[word]
        compose(canvas, masks[word][:, c0:c1 + 1], INK, x, LINE_TOP + (top - base_top))
        x += (c1 - c0 + 1) + WORD_GAP
        if i < len(LINE_WORDS) - 1:
            compose(canvas, dot_a, dot_c, x, LINE_TOP + DOT_BASELINE_OFFSET)
            x += dw + WORD_GAP

    right = x - WORD_GAP - 1
    print(f"  line spans x{LINE_LEFT}..{right} "
          f"(width {right - LINE_LEFT + 1}); the retired line was 738 wide")
    if right >= DECORATION_X:
        print(f"  WARNING: the line reaches x{right}, but the arc and grid start at "
              f"x{DECORATION_X}. It will run into the decoration.\n"
              f"           Shorten LINE_WORDS, or reduce WORD_GAP / SIZE_PT.",
              file=sys.stderr)
    elif right > ERASE_BANDS[-1][1]:
        print(f"  note: the line reaches x{right}, past the erased band edge "
              f"(x{ERASE_BANDS[-1][1]}). Still clear of the decoration at "
              f"x{DECORATION_X}, so this is fine — it just sits on untouched paper.")


# ---------------------------------------------------------------- verify ----
def luma(rgb: np.ndarray) -> np.ndarray:
    """ITU-R 601 luminance — the same conversion the calibration figures use."""
    return rgb @ np.array([0.299, 0.587, 0.114])


def verify(canvas: np.ndarray, plate: np.ndarray, font: ImageFont.FreeTypeFont) -> None:
    """Compare a word present in both the plate and the re-set line.

    Guards the calibration: if SIZE_PT, INK or GLYPH_BLUR drift, the re-set type
    stops matching the plate's weight and this is where it shows up. Expect the
    two rows to agree closely — see CALIBRATION in the module docstring.
    """
    if "systems" not in LINE_WORDS:
        print("  (no word shared with the plate — type weight check not applicable)")
        return
    bg = 248.0
    ref = luma(plate[720:776, 557:702])

    # Locate the re-set "systems" with the same arithmetic draw_line() uses.
    bounds = {w: ink_bounds(word_mask(w, font)) for w in LINE_WORDS}
    x = LINE_LEFT
    for word in LINE_WORDS:
        if word == "systems":
            break
        c0, c1, _ = bounds[word]
        x += (c1 - c0 + 1) + WORD_GAP + DOT_SRC[2] + WORD_GAP
    new = luma(canvas[LINE_TOP - 7:LINE_TOP + 49, x:x + 145])

    for label, s in (("plate ", ref), ("re-set", new)):
        m = s < 230
        print(f"  {label} systems: mass {np.clip(bg - s, 0, None).sum():>8.0f}  "
              f"px<230 {m.sum():>5d}  mean-ink {s[m].mean():6.1f}  min {s.min():.0f}")


# ------------------------------------------------------------------ main ----
def main() -> int:
    for path, what in ((SOURCE, "source plate"), (WOFF2, "Latin Modern woff2")):
        if not os.path.exists(path):
            print(f"error: missing {what}: {path}", file=sys.stderr)
            return 1

    if LINE_WORDS and BLOCK_SHIFT:
        print(f"error: LINE_WORDS is set and BLOCK_SHIFT is {BLOCK_SHIFT}.\n"
              f"       LINE_TOP ({LINE_TOP}) is in unshifted plate coordinates, so the\n"
              f"       line would be placed relative to where the title used to be.\n"
              f"       Either set BLOCK_SHIFT = 0, or add {BLOCK_SHIFT} to LINE_TOP and\n"
              f"       re-check the spacing under \"Projects\".", file=sys.stderr)
        return 1

    plate = np.asarray(Image.open(SOURCE).convert("RGB")).astype(np.float32)
    print(f"plate {plate.shape[1]}x{plate.shape[0]} from {os.path.relpath(SOURCE, REPO)}")

    canvas = plate.copy()
    grain = build_grain(plate)
    for x0, x1, y0, y1 in ERASE_BANDS:
        erase(canvas, grain, x0, x1, y0, y1)
    print(f"  erased {len(ERASE_BANDS)} band(s)")
    shift_block(canvas, grain, BLOCK_SHIFT)

    with tempfile.TemporaryDirectory() as td:
        font = load_render_font(td)
        draw_line(canvas, plate, font)
        verify(canvas, plate, font)

    out = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8)).resize(OUT_SIZE, Image.LANCZOS)
    out.save(OUTPUT, "JPEG", quality=JPEG_QUALITY, progressive=True,
             optimize=True, subsampling=0)
    print(f"wrote {os.path.relpath(OUTPUT, REPO)}  "
          f"{OUT_SIZE[0]}x{OUT_SIZE[1]}  {os.path.getsize(OUTPUT) / 1024:.1f} KB  "
          f"progressive JPEG q{JPEG_QUALITY} 4:4:4")
    print("\nIf the text changed, update og:image:alt in projects/index.html to match.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
