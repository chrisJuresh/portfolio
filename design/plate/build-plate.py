#!/usr/bin/env python3
"""Rebuild portfolio/img/plate.webp — the graded facade plate in the page's
bottom-left corner.

    python design/plate/build-plate.py <source.rw2>

Reads a Panasonic RW2 and writes portfolio/img/plate.webp. Deterministic: same
input, byte-identical output (the grain is a seeded PRNG, not os entropy).

It also writes the two files design/plate/plate-tuner.html needs to preview a
grade without this script — plate-source.webp and plate-source.json. See
NEUTRAL SOURCE at the foot of this docstring. Every constant below is a slider
in that tuner; the way to change one is to move it there, read the block it
prints, and paste it back over the block here.

WHY A SCRIPT AND NOT A CSS FILTER
---------------------------------
The whole grade is baked — precomposited — into the asset, and the stylesheet
only places and dials it. Three reasons, in order of how much they cost:

* The source is a 19 MB raw. It cannot be a background-image, so *something* has
  to develop it; once that step exists, doing the grade in the same pass is free.
* `filter: sepia() brightness() contrast()` on a background costs a compositing
  layer on every paint, and the page it would sit under is the one with the
  scroll-snapped doorway and the momentum carousel. Pixels are free; paints are
  not.
* The look depends on operations CSS filters cannot express at all — a per-channel
  range remap onto two named endpoints, a shoulder that pushes highlights without
  clipping them, and grain. Approximating it with the filter primitives that do
  exist would be both slower and worse.

There is no vignette and no soft rectangular edge. An earlier cut dissolved the
top and right edges into the page and it read as a lit corner with a building
fading out of it rather than as a photograph — the door, the columns and the
balustrade are spread right across the frame, so any ramp wide enough to hide an
edge is also on top of the subject. What makes the plate recede is
`--plate-opacity` in the stylesheet, which is also what lets one file serve both
`--bg: #fff` and `--bg: #000`.

The one thing alpha is used for is the sky, and it is a matte rather than a crop.
No sky is wanted, only the building. Cropping it out was tried first and cannot
work: there is a wedge of sky in the notch directly above the door, at 52% across,
so the tallest sky-free rectangle containing the door starts a third of the way
down the frame — it throws away the pediment, the engaged columns and both
rooflines, which is most of the reason to use this photograph. So the frame is
kept whole and the sky is knocked out to transparent, and the page's own paper
becomes the sky. See sky_matte().

THE GRADE
---------
Order matters; this is the pipeline, and every stage is a constant below.

1. Develop linear (`gamma=(1, 1)`, `no_auto_bright=True`). Grading multiplicative
   things — exposure, desaturation — in linear light is the difference between
   stone that goes grey and stone that goes muddy. The whole frame, uncropped.
2. Exposure by percentile, not by eye. EXPOSURE_PCT of the luma histogram is
   driven to EXPOSURE_TARGET, so a different frame off the same camera lands in
   the same place instead of needing the number re-tuned. Measured over the
   building only, with the sky masked off: the sky is a fifth of the frame and
   sits in its own narrow band of the histogram, so leaving it in drags the
   percentile away from the stone the exposure is actually for.
3. Desaturate to SAT_KEEP of the original chroma. The tint in step 6 is applied
   *to* what survives here, so this is the knob that decides whether the result
   reads as a tinted photograph or as a duotone. At 0.26 the sky keeps enough
   blue to be sky and the stone stops competing with the tint.
4. Encode to sRGB gamma. Everything after this is a tone curve, and tone curves
   want perceptual space — the same S-curve applied in linear crushes shadows.
5. Contrast S-curve at CONTRAST strength, then the highlight shoulder
   `1 - (1 - t)**HIGHLIGHT_PUSH`. The shoulder is the "whites slightly brighter"
   half of the brief: it is concentrated near the top of the range and, being a
   power of the *inverse*, cannot take anything past 1.0. A plain gain would have
   clipped the sunlit stone flat, which is the one thing this frame cannot spare.
6. Per-channel range remap onto SHADOW and HIGHLIGHT:

       out_c = SHADOW_c + (HIGHLIGHT_c - SHADOW_c) * t_c

   This is the tint and the black lift in one step, and it is why they are one
   step: the endpoints are colours, so the blacks land exactly on a warm dark
   grey and the whites exactly on a warm near-white, while the *differences*
   between channels — what step 3 left of the real colour — ride through
   untouched. Tinting and then separately lifting would fight; the lift would
   drag the tint toward neutral in the shadows, where it is most visible.
7. Grain, GRAIN_SIGMA, monochrome, weighted `4t(1-t)` so it peaks in the mids and
   dies at both ends. Grain in the lifted blacks would read as sensor noise and
   undo the point of lifting them; grain in the highlights reads as JPEG.
8. Downsample to OUT_WIDTH, attach the sky matte as alpha, encode.

WHY THESE ENDPOINTS
-------------------
SHADOW #33322e and HIGHLIGHT #fffdf7 are the site's own palette pushed one step
apart. The paper is #fcfbf8 and the ink #1a1917 (styles.css `:root`), so the
plate's white sits a hair *above* the paper and its black well short of the ink:
the photograph stays quieter than the type at both ends, which is the only way a
half-page image does not become the thing you look at first.

NEUTRAL SOURCE
--------------
plate-source.webp is step 1 and nothing else: the linear develop, sRGB-encoded so
that eight bits are spent perceptually, scaled down to NEUTRAL_WIDTH, sky and all.
Ungraded and unmatted on purpose — it is the input every stage above starts from,
so a tool holding it can run the whole pipeline itself and show you the answer
while you drag. That is design/plate/plate-tuner.html, and it is why the sky is
still in the file: the matte is one of the things being tuned.

Its companion plate-source.json carries the constants this script was last run
with, so the tuner opens on the plate as it stands rather than on a table of
numbers hand-copied from here that would drift the first time one changed.

The three ways the tuner's answer is an approximation of this script's, none of
which move a judgement you would make at --plate-opacity:
* Eight bits, and lossy WebP, standing in for float32 off the raw.
* It grades at NEUTRAL_WIDTH; this grades at full width and then downsamples, so
  its curve is very slightly the smoother of the two (see the note in main()).
* Grain is sized in output pixels either way, but the two images have a different
  number of them, so the grain is the right strength and the wrong scale there.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import rawpy
from PIL import Image, ImageFilter
from scipy import ndimage

# ---- the grade ------------------------------------------------------------
EXPOSURE_PCT = 99.0        # percentile of linear luma driven to...
EXPOSURE_TARGET = 0.34     # ...this value, before the tone curve
SAT_KEEP = 0.24            # fraction of original chroma kept
CONTRAST = 0.36            # blend toward a smoothstep S-curve
HIGHLIGHT_PUSH = 1.34      # >1 lifts highlights; 1.0 is off
SHADOW = (0x30, 0x2e, 0x2a)    # where black lands — warm dark grey
HIGHLIGHT = (0xff, 0xfa, 0xea)  # where white lands — warm cream
GRAIN_SIGMA = 0.0075       # in output units, 0..1
GRAIN_SEED = 20250825      # the frame's own date; any constant would do

# ---- the sky matte --------------------------------------------------------
# The sky is separable because it is the only thing in the frame that is both
# blue-dominant and bright. Both halves of that test are load-bearing:
#
# * Blueness alone knocks holes in the building. The stone's shadows are lit by
#   skylight and nothing else, so they are blue-dominant too — just 5-30x darker.
#   Sky luma here is ~0.036 linear; the shadowed stone, the doorway and the road
#   all sit under 0.017, which is what SKY_LUMA_MIN cuts between.
# * Brightness alone knocks out the sunlit stone, which is 10x brighter again.
#
# Measured on this frame, in the linear develop, on the normalised channels:
# sky blueness runs 0.41-0.48 and the next-bluest thing in the picture is 0.25.
#
# But the sky is not one brightness. It falls off towards the corners — partly the
# lens, partly the sky's own gradient away from the sun — and in the top-left
# corner of this frame it lands at 0.014-0.021 luma while staying every bit as
# blue (0.32-0.56). A flat SKY_LUMA_MIN therefore left a ragged wedge of sky
# behind in that corner, painted as though it were building, which is the one
# place on the page where the plate reads as a bad cut-out rather than as stock.
#
# Lowering SKY_LUMA_MIN to reach it is not the fix: 0.014 is inside the shadowed
# stone's own range, so the threshold that catches the corner also opens the
# facade. What separates them is that the dark corner is CONTIGUOUS with sky that
# passes the bright test and the shadowed stone is not — so the brightness test
# is applied to the seed only, and the region is then allowed to grow through
# anything equally blue down to SKY_LUMA_LOW. Hysteresis, as in a Canny edge, and
# for the same reason: the confident pixels vouch for the marginal ones they
# touch, and marginal pixels standing on their own are left alone.
#
# The result is insensitive to where SKY_LUMA_LOW is put — the matte is identical
# anywhere from 0.012 down to 0.005, because the growth runs out at the roofline
# rather than at the threshold. 0.010 is the middle of that plateau.
SKY_BLUE_MIN = 0.25       # (b - r) / (r + g + b)
SKY_LUMA_MIN = 0.022      # linear luma a pixel needs to seed the sky
SKY_LUMA_LOW = 0.010      # ...and to stay in it, once something brighter vouches
SKY_EDGE_BLUR = 1.2       # px at output scale, to keep the roofline from aliasing

# ---- the plate ------------------------------------------------------------
OUT_WIDTH = 1100           # 2x the ~544px the stylesheet draws it at
WEBP_QUALITY = 82

# ---- the tuner's copy -----------------------------------------------------
# Narrower than the plate: it is graded per-pixel in a browser on every drag, and
# 900 is both more than the ~544 CSS pixels the plate is drawn at and few enough
# that a full re-grade lands inside a frame. Quality is high because this file is
# an INPUT — its artefacts would be graded along with the picture, and a contrast
# curve is exactly the thing that finds them.
NEUTRAL_WIDTH = 900
NEUTRAL_QUALITY = 95

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
OUT_PATH = REPO / "portfolio" / "img" / "plate.webp"
NEUTRAL_PATH = HERE / "plate-source.webp"
META_PATH = HERE / "plate-source.json"

# Rec.709 luma. The desaturation and the grain weight both need a scalar
# brightness and it must be the same one, or the grain drifts off the mids.
LUMA = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def smoothstep(t: np.ndarray) -> np.ndarray:
    return t * t * (3.0 - 2.0 * t)


def srgb_encode(lin: np.ndarray) -> np.ndarray:
    """Linear light 0..1 -> sRGB 0..1. Step 4, and the neutral source's only stage."""
    lin = np.clip(lin, 0.0, 1.0)
    t = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * lin ** (1 / 2.4) - 0.055)
    return np.clip(t, 0.0, 1.0)


def develop(path: Path) -> np.ndarray:
    """RW2 -> linear-light float32 RGB, 0..1, orientation already applied."""
    with rawpy.imread(str(path)) as raw:
        rgb = raw.postprocess(
            use_camera_wb=True,
            no_auto_bright=True,   # step 2 does exposure, with a number
            gamma=(1, 1),          # linear out; step 4 encodes
            output_bps=16,
        )
    return rgb.astype(np.float32) / 65535.0


def sky_matte(lin: np.ndarray) -> np.ndarray:
    """Linear-light RGB in, boolean sky mask out (True where the sky is).

    Four steps, and everything after the first is what makes it a matte rather
    than a threshold:

    * Threshold on blueness and brightness together — see the constants.
    * Grow that seed through anything as blue but only SKY_LUMA_LOW bright, which
      is what carries the matte into the darkened corners. Written as a labelling
      of the permissive predicate rather than as a fill from the seed, because
      what a component needs to prove is a property of the whole component: that
      it contains a confident pixel, and separately that it reaches the sky.
    * Keep only what touches the top edge. The threshold alone also picks out the
      neighbouring building's glazing, which is reflecting this same sky and is
      every bit as blue and as bright as it; punched through, it would leave the
      facade full of holes. Actual sky reaches the top of the frame and reflections
      do not, so connectivity separates them and nothing else does.
    * Fill anything the sky fully encloses. That is the mast and the crane jib on
      the skyline, which are neither sky nor building: left in, they survive the
      knockout as dark specks floating in the page's white with nothing under
      them. The building is not filled by this, because a region touching the
      array border is not enclosed and the building runs off three edges.
    """
    norm = lin / (lin.sum(axis=2, keepdims=True) + 1e-9)
    blue = (norm[..., 2] - norm[..., 0]) > SKY_BLUE_MIN
    luma = lin @ LUMA
    seed = blue & (luma > SKY_LUMA_MIN)

    labels, _ = ndimage.label(blue & (luma > SKY_LUMA_LOW))
    vouched = np.unique(labels[seed])
    touching_top = np.unique(labels[0])
    keep = np.intersect1d(vouched[vouched > 0], touching_top[touching_top > 0])
    sky = np.isin(labels, keep)

    return ndimage.binary_fill_holes(sky)


def bleed(rgb: np.ndarray, hole: np.ndarray, iterations: int) -> np.ndarray:
    """Grow the kept pixels outward into `hole`, so the matte has no halo.

    The sky's own graded colour must not survive anywhere near the roofline. It is
    a mid tone, the page behind it is white or black, and the partly-transparent
    pixels that downsampling creates along the roofline would mix the two into a
    fringe that reads as a bad cut-out. So the sky is painted over with the
    nearest building pixel first, and the mix at the edge is then building-to-page,
    which is what a clean matte is. Only the pixels the resampling kernel can
    reach need it, which is why this is a fixed handful of iterations rather than
    a full nearest-neighbour fill of a fifth of the frame.
    """
    out = rgb.copy()
    todo = hole.copy()
    for _ in range(iterations):
        if not todo.any():
            break
        grown = np.stack(
            [ndimage.grey_dilation(out[..., c], size=(3, 3)) for c in range(3)],
            axis=2,
        )
        edge = todo & ndimage.binary_dilation(~todo)
        out[edge] = grown[edge]
        todo &= ~edge
    return out


def grade(lin: np.ndarray, keep: np.ndarray) -> np.ndarray:
    """Steps 2-7. Linear-light in, sRGB-encoded 0..1 out.

    `keep` is the non-sky mask, and it is used for the exposure percentile only —
    every later stage is per-pixel and does not care what is sky.
    """
    # 2. exposure, over the building only
    luma = lin @ LUMA
    ref = float(np.percentile(luma[keep], EXPOSURE_PCT))
    lin = lin * (EXPOSURE_TARGET / max(ref, 1e-6))

    # 3. desaturate (in linear — see docstring)
    luma = (lin @ LUMA)[..., None]
    lin = luma + (lin - luma) * SAT_KEEP
    lin = np.clip(lin, 0.0, 1.0)

    # 4. encode
    t = srgb_encode(lin)

    # 5. contrast, then the highlight shoulder
    t = t + (smoothstep(t) - t) * CONTRAST
    t = 1.0 - (1.0 - t) ** HIGHLIGHT_PUSH

    # 6. per-channel remap onto the two endpoints
    shadow = np.array(SHADOW, dtype=np.float32) / 255.0
    highlight = np.array(HIGHLIGHT, dtype=np.float32) / 255.0
    out = shadow + (highlight - shadow) * t

    # 7. grain, peaking in the mids
    grey = out @ LUMA
    weight = np.clip(4.0 * grey * (1.0 - grey), 0.0, 1.0)[..., None]
    rng = np.random.default_rng(GRAIN_SEED)
    out = out + rng.standard_normal(grey.shape).astype(np.float32)[..., None] * (
        GRAIN_SIGMA * weight
    )

    return np.clip(out, 0.0, 1.0)


def write_neutral(lin: np.ndarray) -> None:
    """Step 1 on its own, plus the constants, for design/plate/plate-tuner.html.

    Encoded rather than left linear, and scaled by nothing. Eight bits of linear
    light would put a quarter of its codes above anything in this frame and leave
    the shadows in about five, which is where every one of the tone-curve
    constants does its work; eight bits of sRGB spends them where the eye is. And
    the develop already lands inside 0..1 with room over the sunlit stone — the
    exposure stage is a multiply the tuner can do for itself — so there is no
    scale factor to record and none to get wrong.
    """
    img = Image.fromarray(np.round(srgb_encode(lin) * 255.0).astype(np.uint8), mode="RGB")
    height = round(img.height * NEUTRAL_WIDTH / img.width)
    img = img.resize((NEUTRAL_WIDTH, height), Image.LANCZOS)
    img.save(NEUTRAL_PATH, "WEBP", quality=NEUTRAL_QUALITY, method=6)

    META_PATH.write_text(json.dumps({
        "_": "Written by build-plate.py. The constants plate-tuner.html opens on — "
             "so that what it calls 'was' is what the plate on the page really is.",
        "source": NEUTRAL_PATH.name,
        "width": img.width,
        "height": img.height,
        "outWidth": OUT_WIDTH,
        "grade": {
            "EXPOSURE_PCT": EXPOSURE_PCT,
            "EXPOSURE_TARGET": EXPOSURE_TARGET,
            "SAT_KEEP": SAT_KEEP,
            "CONTRAST": CONTRAST,
            "HIGHLIGHT_PUSH": HIGHLIGHT_PUSH,
            "SHADOW": "#%02x%02x%02x" % SHADOW,
            "HIGHLIGHT": "#%02x%02x%02x" % HIGHLIGHT,
            "GRAIN_SIGMA": GRAIN_SIGMA,
        },
        "matte": {
            "SKY_BLUE_MIN": SKY_BLUE_MIN,
            "SKY_LUMA_MIN": SKY_LUMA_MIN,
            "SKY_LUMA_LOW": SKY_LUMA_LOW,
            "SKY_EDGE_BLUR": SKY_EDGE_BLUR,
        },
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__.strip().splitlines()[2].strip(), file=sys.stderr)
        return 2

    src = Path(sys.argv[1])
    if not src.is_file():
        print(f"no such file: {src}", file=sys.stderr)
        return 1

    lin = develop(src)
    sky = sky_matte(lin)

    graded = grade(lin, ~sky)
    # The resampling kernel reaches about 3 source pixels per output pixel at this
    # ratio; 12 is that with room to spare, and the cost is bounded either way
    # because the fill stops as soon as the sky is covered.
    graded = bleed(graded, sky, iterations=12)

    img = Image.fromarray(np.round(graded * 255.0).astype(np.uint8), mode="RGB")
    alpha = Image.fromarray((~sky).astype(np.uint8) * 255, mode="L")

    # Downsample after grading, not before: the grain is sized in output pixels,
    # and a curve applied at full resolution then resampled is smoother than the
    # reverse — resampling averages, which is exactly what softens the shoulder.
    height = round(img.height * OUT_WIDTH / img.width)
    img = img.resize((OUT_WIDTH, height), Image.LANCZOS)
    alpha = alpha.resize((OUT_WIDTH, height), Image.LANCZOS)
    if SKY_EDGE_BLUR:
        alpha = alpha.filter(ImageFilter.GaussianBlur(SKY_EDGE_BLUR))
    img.putalpha(alpha)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT_PATH, "WEBP", quality=WEBP_QUALITY, method=6)
    print(f"{OUT_PATH.relative_to(REPO)}  {img.width}x{img.height}  "
          f"{OUT_PATH.stat().st_size / 1024:.0f} KB  "
          f"sky {sky.mean() * 100:.1f}% of frame")

    write_neutral(lin)
    print(f"{NEUTRAL_PATH.relative_to(REPO)}  {NEUTRAL_PATH.stat().st_size / 1024:.0f} KB"
          f"  + {META_PATH.name}   (design/plate/plate-tuner.html reads these)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
