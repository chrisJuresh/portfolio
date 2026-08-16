#!/usr/bin/env python3
"""Bake the Projects Panel's marble plinth — one plate per candidate.

    python design/plinth/build-marble.py [nero | stone162 | stone161 | stone160 | all]

WHAT A PLATE IS. One WebP, about thirteen times wider than it is tall, holding
the whole of the plinth the browser Frame stands on: a receding TOP FACE across
the top fifth and the FRONT FACE below it, joined at the specular line the
render draws along the block's front edge. `.panel-plinth` in portfolio/styles.css
stretches it over the slab with `background-size: 100% 100%`, and every
proportion below is derived from the numbers in that block, so the plate is baked
at exactly the shape it is drawn at and nothing is stretched off its aspect.

WHY THE POLISH IS COMPOSITED AND NOT SOURCED, which is the whole reason this file
is longer than a crop. None of Texturelabs' marble is SHOT as reflective stone —
every one of them is a slab photographed square-on in flat light, which is a
picture of albedo. A plinth seen at a grazing angle is barely albedo at all: it
is a perspective, a luminance ramp that climbs toward the viewer, and a specular
line where the top face turns over into the front. So the stone supplies the
grain and this file supplies the light:

  1. a PERSPECTIVE WARP on the top face, so the stone's own grain lies down into
     the surface instead of standing up off it;
  2. a LUMINANCE RAMP down each face, measured off the design render;
  3. the SPECULAR LINE, which is the peak of the top face's ramp rather than a
     drawn highlight — the render has no hard line there, it has a broad band
     that brightens toward the front edge and then falls off it;
  4. a CORNER HIGHLIGHT down the plate's left end, which is the one vertical edge
     of the block the render actually shows.

WHAT IS NOT HERE, AND DELIBERATELY. #57 describes the bake as also applying "a
vertically-blurred and opacity-ramped mirror of the subject". It is not baked,
because #68 asks for the reflection to be LIVE and in step with the recording —
a still of the Frame smeared into the stone would be wrong the moment the clip
moves, which is the one thing that ticket says reads as broken immediately. The
mirror is a copy of the real Frame, squashed onto this plate at runtime: see
portfolio/panel-mirror.js and the .panel-mirror block in the stylesheet.

EVERY SOURCE'S OWN COLOUR IS THROWN AWAY AND THE RENDER'S IS PUT BACK, which is
two decisions and they were run together once. The four candidates are wildly
different colours in the source — a slate blue, a warm beige, a near-black — and
carrying that through would make choosing between them a choice of cast rather
than of stone, so each one is reduced to luminance the way the plates in
design/effects/build-textures.py are.

But the plate does not then LEAVE grey, and the first bake's doing so is a large
part of why the plinth did not read as the render's. "Neutral to within four
levels" is true and is the wrong test: four levels on a face that means 31 is a
7% cast, and the block sits on a backdrop that is itself faintly green (8.7,
10.6, 9.7), so the eye is reading the difference between the two and not the
absolute. Measured over the whole block, both faces agree on it —

    top face    R 76.1  G 68.6  B 73.9      cast 1.044, 0.942, 1.014
    front face  R 33.6  G 29.1  B 31.6      cast 1.069, 0.927, 1.005

— a plum-grey, warm against a cool ground. It goes on in save_webp, identically
to all four, so the candidates are still being compared on their stone and only
their stone: one light, one cast, four rocks.

Deterministic: same inputs, byte-identical outputs. The procedural candidate is
seeded, in the way design/plate/build-plate.py's grain is; the three photographic
ones contain no random number at all.

WHY THE SOURCES ARE NOT IN THE REPO
-----------------------------------
The XL JPEGs are 7952x5304 and about 15 MB each, and they are gitignored by the
`/Texturelabs_*.jpg` line that was already there for the film and paper plates —
so this file adds nothing to .gitignore and honours the same licence the same
way. Download them from texturelabs.org, drop them at the repo root under their
original names, and run this; what gets committed is what this writes into
portfolio/img/tex/. The attribution is in portfolio/img/tex/README.md.

`nero` needs no source and is not from Texturelabs at all — it is generated here,
and it is in the set because the render's stone is a fine-veined near-black that
none of the photographed candidates actually is. #57 asks for several candidates
so the author can choose by eye; this is the one that can be baked on a machine
with nothing downloaded.
"""

from __future__ import annotations

import hashlib
import os
import sys

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates, zoom

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(ROOT, "portfolio", "img", "tex")


# ---------------------------------------------------------------------------
# the shape of the plate, and it is the stylesheet's arithmetic restated
# ---------------------------------------------------------------------------
# Every length here is a share of the FRAME'S WIDTH, which is the only datum the
# Panel and this file both have. The stylesheet states the same three numbers in
# the .panel-plinth block; if either moves without the other, the plate is
# stretched off its aspect and the perspective stops agreeing with the shape it
# is drawn in. They are stated twice because there is no third place to put them.
#
#   PLINTH_W   the slab runs from one grid column left of the Frame to the
#              composition's right edge — ten of twelve columns against the
#              Frame's nine — which is 0.831281/0.746923 of the Frame's width.
#   TOP_FACE   31 render px between the Frame's foot (y 1518) and the block's
#              front edge (y 1549), over a Frame measured 1837 px wide.
#   FRONT_FACE the render's own front face is 83 px, 4.52% — but the render is
#              CUT OFF at 1632 and the stone is still at level 28 there, so that
#              figure is a floor and not a height. 7% is what is drawn, and the
#              extra 55% is spent on a ramp that reaches the Panel's own black
#              before the plate ends: a block whose bottom nobody can see should
#              run out of light, not stop on a line.
PLINTH_W = 1.112940
TOP_FACE = 0.016900
FRONT_FACE = 0.070000

PLATE_W = 3000          # device px at a 2x display and a composition ~1800 wide,
                        # which is what a 2560 screen gives it — see the rung
                        # note in portfolio/img/tex/README.md
PLATE_ASPECT = PLINTH_W / (TOP_FACE + FRONT_FACE)
PLATE_H = int(round(PLATE_W / PLATE_ASPECT))
TOP_H = int(round(PLATE_H * TOP_FACE / (TOP_FACE + FRONT_FACE)))

# ---------------------------------------------------------------------------
# the light, and every number in it is read off the design render
# ---------------------------------------------------------------------------
# A vertical profile down IMG_20260815_153956.jpg, MEANED ACROSS x 620-2380 —
# the whole of the block that is under the Frame and clear of both ends, rather
# than the single 100px column this was first read off. One column of a slab with
# veins in it is a reading of whatever vein happens to cross it; the mean over
# 1760 columns is a reading of the light.
#
#   y 1518   36    the contact line: the top face at its far edge
#   y 1543   79    the peak, 81% of the way across the face
#   y 1549   64    the front edge...
#   y 1551   40    ...and it falls off it in two pixels
#   y 1553   38    the front face at its top
#   y 1560   32    ...which is where it settles
#   y 1631   30    ...and where it still is at the bottom of the picture
#
# The render is not this repository's — see the .panel block in styles.css for
# why it is not committed — so these are constants of the composition rather than
# a derivation anybody can re-run. What they are not is chosen.
TOP_BACK = 36.0
TOP_PEAK = 79.0
TOP_PEAK_AT = 0.81      # where the peak sits across the top face, 0 far, 1 near
TOP_EDGE = 64.0

# THE FRONT FACE IS FLAT, and this is the correction that matters most. It was
# read as "28 at the bottom of the picture, still falling" and given a ramp that
# spent the plate's bottom half going to black. It is not falling: meaned across
# the block it is 32.0 at y 1560 and 29.7 at y 1631, which is 2 levels over 71 px
# — a face lit evenly, on a block whose bottom the render never reaches.
#
# So the stone holds. What the plate has that the render does not is an END: the
# composition here is centred with black under it, so the block cannot simply be
# cut off. It is given a base instead — the last tenth turns under into shadow,
# which is what the bottom of a solid block does. The 55% fade this replaces is
# why the plinth read as a smear of light rather than as something to stand on.
FRONT_TOP = 38.0
FRONT_SET = 32.0        # 9% down, where the falloff off the edge settles
FRONT_MID = 30.0        # at 4.52/7.00 — the last of the face the render shows
FRONT_BASE = 26.0       # ...and the drift the render's own 2 levels extrapolate to
FRONT_BOTTOM = 5.0      # the block turns under, in the last tenth of the face

# The block's left corner, which is the one vertical edge of it the render shows:
# a bright line at x 400 peaking at 57 against a front face of 27 and a backdrop
# of 8. Stated as a share of the plate's width so it stays the same fraction of
# the slab at every size, and as levels ABOVE the face it lights.
CORNER_W = 0.0022
CORNER_GAIN = 30.0

# The stone's colour, as a multiplier per channel on the luminance the whole of
# the rest of this file works in. Both faces of the render's block agree on it to
# within 2.5% — see the docstring for the two measurements and why the plate does
# not stay grey. Normalised to a mean of 1, so applying it moves the hue and not
# the exposure, and every number above stays a reading of the same picture.
MARBLE_CAST = (1.0577, 0.9333, 1.0090)

# How hard the top face recedes. The warp below maps the output row to a source
# row through 1/y, so this is the ratio between the far edge's compression and
# the near edge's: at 2.2 the stone at the contact line is 3.2x tighter than the
# stone at the front edge, which is a shallow enough camera to read as a plinth
# and steep enough that the grain visibly lies down. There is nothing in the
# render to measure it against — a generated picture does not hold one camera,
# and its own plinth's vanishing point is off to the left while the Frame
# standing on it is drawn square-on — so this one IS a taste, and it is the
# first number to move if the surface reads as a wall.
TOP_PERSPECTIVE = 2.2

# How much stone shows through the light, and it is stated as the BRIGHT TAIL
# rather than as a standard deviation, which is the difference between a slab
# with veins on it and a slab with noise on it. Detrended row by row against its
# own mean, the render's front face measures
#
#     std 5.5    p99.5 +26.8    p0.5 -7.5
#
# — a distribution that is nearly four times longer on the bright side than the
# dark one, which is what a few thin white veins over a large dark ground looks
# like as a histogram. Normalising the std would spend that whole budget evenly
# and hand back a grey haze; normalising the 99.5th percentile puts the loudest
# marks where the render puts them and lets everything quieter fall where the
# stone puts it.
#
# The top face's tail is smaller — +15.2 against +26.8 — because the specular
# ramp is washing it out, which is a real thing that happens to a surface seen at
# a grazing angle and not a measurement to average away.
MARBLE_PEAK_FRONT = 26.8
MARBLE_PEAK_TOP = 15.2

MARBLE_QUALITY = 82     # lossy. The plate is a smooth ramp with a soft texture
                        # over it and no hard edge anywhere except the two it is
                        # given here, which is the easiest thing a DCT codec ever
                        # sees; lossless measured 4.3x the bytes for a plate that
                        # is drawn under a reflection at a third of its opacity.


# ---------------------------------------------------------------------------
# the candidates
# ---------------------------------------------------------------------------
# `src` is the file to drop at the repo root, or None for the one that is made
# here. `top` and `front` are where on the slab each face is cut from, as a share
# of the source's height — the two faces of a real block are two different cuts
# through the stone and showing the same veins on both is the one thing that
# would give it away. `gain` is this candidate's own multiplier on MARBLE_STD.
CANDIDATES = {
    # Generated, not photographed, and the only one that can be baked with
    # nothing downloaded. Fine white veining on a near-black ground — which is
    # the stone the design render actually draws, and which none of the three
    # below is.
    "nero": {
        "src": None,
        "title": "procedural nero",
        "top": 0.62, "front": 0.18, "gain": 1.0,
    },
    # Texturelabs Stone 162, "Dark contrast marble" — #57's choice, and the only
    # genuinely photographic dark marble across the CC0 and permissive sources it
    # surveyed. Bolder than the render: a black ground with large cream blotches
    # rather than veins, which is why its gain is held down.
    "stone162": {
        "src": "Texturelabs_Stone_162XL.jpg",
        "title": "Texturelabs Stone 162 - Dark contrast marble",
        "top": 0.30, "front": 0.72, "gain": 0.75,
    },
    # Stone 161, "Blue veins marble" — a light ground with fine dark hairlines.
    # Inverted by the ramp into pale veins on dark stone, which is the closest of
    # the three to the render's grain.
    "stone161": {
        "src": "Texturelabs_Stone_161XL.jpg",
        "title": "Texturelabs Stone 161 - Blue veins marble",
        "top": 0.45, "front": 0.20, "gain": 1.15,
    },
    # Stone 160, "Natural distressed marble" — slate with a mottled crust. The
    # quietest of the three and the least like marble; in the set because a
    # plinth is allowed to be plain stone.
    "stone160": {
        "src": "Texturelabs_Stone_160XL.jpg",
        "title": "Texturelabs Stone 160 - Natural distressed marble",
        "top": 0.20, "front": 0.68, "gain": 1.0,
    },
}


# ---------------------------------------------------------------------------
# shared
# ---------------------------------------------------------------------------

def load_luma(name: str) -> np.ndarray:
    """The slab as float32 luminance in 0..255. See the docstring for why the
    colour is thrown away rather than carried."""
    path = os.path.join(ROOT, name)
    if not os.path.exists(path):
        sys.exit(
            "missing source: %s\n"
            "The XL JPEGs are gitignored - see WHY THE SOURCES ARE NOT IN THE REPO\n"
            "in this file's docstring. Download it from texturelabs.org and drop it\n"
            "at the repo root, or bake `nero`, which needs no source." % path)
    return np.asarray(Image.open(path).convert("L"), dtype=np.float32)


def cut(slab: np.ndarray, at: float, aspect: float) -> np.ndarray:
    """A full-width horizontal band of the slab, at `at` down it, whose width is
    `aspect` times its height.

    Full width and not a square, because that is the shape the face is: the front
    face is twenty-four times wider than it is tall, and a band cut at that shape
    catches whatever veining runs ACROSS it. Cutting a square and squashing it
    would put the same veins in at a quarter of their thickness, which is a
    picture of a different stone.
    """
    h, w = slab.shape
    band = int(round(w / aspect))
    band = min(band, h)
    top = int(round((h - band) * at))
    return slab[top:top + band]


def resize(a: np.ndarray, w: int, h: int) -> np.ndarray:
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), mode="L")
    return np.asarray(im.resize((w, h), Image.LANCZOS), dtype=np.float32)


def detail(a: np.ndarray, peak: float) -> np.ndarray:
    """A face's texture, zero-mean and re-stretched until its bright tail lands
    `peak` levels above the ground. See MARBLE_PEAK_FRONT for why the tail and
    not the deviation.

    Zero-mean over the WHOLE face rather than per row: a row-by-row detrend would
    take out the one thing a slab of marble has that a noise field does not,
    which is a vein that runs the length of it. The ramp is added back on top,
    and the ramp is the only large-scale structure the plate is allowed.
    """
    d = a - a.mean()
    hi = float(np.percentile(d, 99.5))
    return d * (peak / hi) if hi > 0 else d


def perspective(a: np.ndarray, w: int, h: int, strength: float) -> np.ndarray:
    """A square-on photograph of a surface -> the same surface receding away.

    The mapping is the one a ground plane has under a pinhole: a point at
    distance `d` lands at screen height proportional to 1/d, so with the output
    row `v` running 0 at the far edge to 1 at the near one,

        y(v)  = 1 + strength * v          screen height above the horizon
        d(v) ~ 1 / y(v)                   ...and the distance it came from
        m(v)  = 1 / y(v)                  the horizontal magnification there

    Two things fall out of that and both are what makes it read. The source rows
    bunch up toward the far edge, so the grain compresses as it goes away; and
    the source COLUMNS are drawn in from the edges by m(v), so the stone spreads
    as it comes toward the viewer. Doing only the first is a vertical squash, and
    a vertical squash of a photograph looks like a squashed photograph.
    """
    src_h, src_w = a.shape
    v = (np.arange(h, dtype=np.float32) + 0.5) / h
    y = 1.0 + strength * v

    # Rows: the far edge samples the top of the band and the near edge the
    # bottom, spaced by 1/y so the compression is the perspective's and not a
    # linear squeeze.
    depth = 1.0 / y
    depth = (depth - depth.min()) / (depth.max() - depth.min())
    rows = (1.0 - depth) * (src_h - 1)

    # Columns: about the centre, scaled by the same 1/y.
    m = (1.0 / y)[:, None]
    m = m / m[0]
    x = (np.arange(w, dtype=np.float32) + 0.5) / w - 0.5
    cols = (x[None, :] * m + 0.5) * (src_w - 1)

    coords = np.stack([np.broadcast_to(rows[:, None], (h, w)), cols])
    return map_coordinates(a, coords, order=1, mode="reflect").astype(np.float32)


def ramp(stops: list[tuple[float, float]], n: int) -> np.ndarray:
    """A luminance ramp down `n` rows through measured (position, level) stops.

    Interpolated with a cosine rather than a straight line between stops, because
    every one of these is a turning point in a smooth falloff and not a corner:
    joining them with segments puts a visible crease across the face at each
    stop, which is exactly the artefact a ramp exists to avoid.
    """
    v = (np.arange(n, dtype=np.float32) + 0.5) / n
    out = np.empty(n, dtype=np.float32)
    for i in range(len(stops) - 1):
        (p0, l0), (p1, l1) = stops[i], stops[i + 1]
        lo = v >= p0 if i else v >= -1.0
        hi = v <= p1 if i < len(stops) - 2 else v <= 2.0
        m = lo & hi
        t = np.clip((v[m] - p0) / (p1 - p0), 0.0, 1.0)
        out[m] = l0 + (l1 - l0) * (0.5 - 0.5 * np.cos(np.pi * t))
    return out


# ---------------------------------------------------------------------------
# the one that is made rather than photographed
# ---------------------------------------------------------------------------

NERO_SIZE = (4096, 2731)        # the XL sources' own 3:2, so it goes through
                                # exactly the same cut, warp and ramp as they do
NERO_SEED = 20260816


def fbm(rng: np.random.Generator, shape: tuple[int, int],
        sigma: tuple[float, float], octaves: int) -> np.ndarray:
    """Fractal noise, as a sum of blurred white-noise fields at halving radii.

    A gaussian blur of white noise is band-limited noise, and summing them at
    halving sigma with halving amplitude is the whole of what fBm is. Built this
    way rather than with a gradient-noise lattice because scipy is already a
    dependency of the texture pipeline and a Perlin implementation would not be.

    `sigma` is a (rows, columns) PAIR and is meant to be used anisotropically:
    a field that is smooth down the slab and busy across it has level sets that
    run down the slab, and the level sets are what become the veins.

    EACH OCTAVE IS DRAWN ON A GRID ITS OWN SIGMA CAN SEE, and then scaled up. A
    gaussian of sigma s has nothing in it above 1/s, so drawing it on a grid many
    times finer than s and then blurring away everything that was drawn is work
    whose whole output is discarded — and gaussian_filter's cost grows with the
    radius, so the widest octave was also the slowest. On this slab, one field at
    (538, 64) went from 40 seconds to under one, which is the difference between
    a bake that can be looked at and re-tuned and a bake that can be run once.
    The field is a low-pass either way; drawing it at the resolution it occupies
    and interpolating back is the same field to well under a level.
    """
    out = np.zeros(shape, dtype=np.float32)
    amp = 1.0
    s = np.asarray(sigma, dtype=np.float64)
    for _ in range(octaves):
        # Six samples per sigma, which is three per standard deviation of the
        # narrowest feature the octave has — comfortably above what interpolating
        # it back up can tell apart, and never coarser than the field itself.
        step = np.maximum(1.0, np.floor(s / 6.0))
        small = tuple(int(max(2, np.ceil(shape[i] / step[i]))) for i in (0, 1))
        n = rng.standard_normal(small).astype(np.float32)
        f = gaussian_filter(n, sigma=tuple(s / step), mode="wrap")
        if small != shape:
            f = zoom(f, (shape[0] / small[0], shape[1] / small[1]),
                     order=1, mode="nearest")[:shape[0], :shape[1]]
            # zoom's output can land a row or column short of the target
            f = np.pad(f, ((0, shape[0] - f.shape[0]), (0, shape[1] - f.shape[1])),
                       mode="edge")
        out += amp * f
        s = s * 0.5
        amp *= 0.5
    return out / out.std()


# WHAT SCALE ANYTHING HERE HAS TO BE AT, and getting this wrong is what made the
# first bake's veins read as smoke. Neither face uses the slab: `cut` takes a band
# whose HEIGHT is the plate's width over the face's aspect, so the front face is
# 4096x256 of these 4096x2731 and the top face is 4096x138. Everything is judged
# through a window about 250 rows tall. A vein whose field has a vertical sigma of
# 430 does not bend inside 250 rows — it comes through as a smooth vertical sweep,
# which is the one shape that does not read as stone. Every sigma below is set
# against the WINDOW and not against the slab.
NERO_WINDOW = 256

# The three vein sets, as (sigma, sharpness, band, amplitude). Read them as one
# picture rather than as twelve numbers:
#
#   sigma      how far apart the veins are, and how much they run down the slab
#              rather than across it — the second figure is what sets the count
#              across 4096 px, the first is what keeps them near-vertical, and it
#              is a fraction of NERO_WINDOW so they visibly wander inside the band
#              that is actually cut
#   band       how wide a slice either side of the field's zero crossing counts
#              as vein at all, in standard deviations
#   sharpness  the power that band is raised to. Read the two together: they are
#              a SUPPORT and a FALLOFF, and it is the ratio between them that says
#              whether a vein is a line or a glow. The first bake had 0.30 and 4,
#              which is a narrow support with a soft profile — a fat blurred
#              streak, and against a black ground a fat blurred streak is a halo.
#              A wide support with a steep falloff (0.85 and 11) puts a thin
#              bright core inside stone that shades away from it, which is what
#              calcite in marble looks like
#   amplitude  how bright, relative to the coarse set
NERO_VEINS = [
    ((2.10, 64), 11.0, 0.85, 1.00),     # the ones that cross the whole block
    ((1.05, 33), 10.0, 0.62, 0.40),     # ...and what branches off them
    ((0.52, 17), 8.0, 0.48, 0.12),      # ...and the hairlines
]

# HOW BRIGHT A VEIN IS ALLOWED TO GET, over a ground of about 15. The first bake
# put 230 levels into a field that peaks near 1.6, so every vein core clipped at
# 255 and came out as a flat white plateau with a soft shoulder either side of it
# — an arc of light rather than a seam in a rock. Held under the ceiling, the core
# keeps its shape and `detail()` below still normalises the tail to the render's.
NERO_VEIN_GAIN = 88.0

# ...and the stone BETWEEN the veins, which the first bake left flat. Detrended,
# the render's front face is +6.9 at its 90th percentile against +26.3 at its
# 99.5th: two thirds of its texture is not vein at all, it is a soft vertically
# streaked drift over the whole face. Baked with a black ground under sparse
# filaments that figure came out at +2.4, and a plinth with nothing happening
# between its veins is a plinth that reads as a painted backdrop.
NERO_STREAK = 7.0       # the streaks, at a sigma tall and narrow enough to survive
NERO_DRIFT = 3.6        # ...and the slow light-and-dark across the whole slab


def synth_nero() -> np.ndarray:
    """A dark slab with fine near-white veining over streaked stone.

    The veins are RIDGES of a domain-warped fBm, which is the standard way to get
    filaments out of a field that has none: `1 - |f|` turns every zero crossing
    of a smooth field into a line, and warping the coordinates first is what stops
    those lines being smooth arcs. Three sets are laid up at halving scale,
    because one set reads as a crack pattern rather than as stone — real veining
    branches, and branching is what the finer sets are.

    THE WARP IS AT TWO SCALES, and the second one is what marble has that smoke
    does not. A slow warp alone bends a vein into a long even curve; the render's
    veins change direction two or three times across the face and meet each other
    at angles. That is a warp at roughly the vein spacing, and it goes on top of
    the slow one rather than instead of it — a fast warp alone would only roughen
    the edges of a line that was still travelling straight.

    ONE OCTAVE PER VEIN SET, still. Every extra octave puts wiggle into the field
    at a finer scale, and a wiggle in the field is a wiggle in its level set: at
    five octaves the veins come back as a mat of filaments with no calm stone
    anywhere between them. The kinks are supposed to come from the warp and the
    branching from the three scales, not from roughening one field.
    """
    rng = np.random.default_rng(NERO_SEED)
    w, h = NERO_SIZE
    shape = (h, w)
    win = float(NERO_WINDOW)

    # The warp, slow and fast. The slow one bends whole veins; the fast one kinks
    # them. Both are anisotropic in the same direction the veins run, so a kink
    # displaces a vein sideways rather than chopping it into segments.
    wx = fbm(rng, shape, (1.20 * win, 110), 3) * 34.0
    wy = fbm(rng, shape, (1.20 * win, 110), 3) * 34.0
    wx += fbm(rng, shape, (0.28 * win, 26), 2) * 11.0
    wy += fbm(rng, shape, (0.28 * win, 26), 2) * 11.0
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    coords = np.stack([np.clip(yy + wy, 0, h - 1), np.clip(xx + wx, 0, w - 1)])

    veins = np.zeros(shape, dtype=np.float32)
    for (sy, sx), sharpness, band, amp in NERO_VEINS:
        f = map_coordinates(fbm(rng, shape, (sy * win, sx), 1), coords,
                            order=1, mode="reflect")
        r = 1.0 - np.abs(f / (np.abs(f).std() * band))
        veins += amp * np.clip(r, 0.0, 1.0) ** sharpness

    # The ground. Not a flat fill: a slow drift across the slab with a much finer
    # vertical streak through it, warped by the same field the veins are so the
    # stone shades along its own grain instead of across it.
    ground = 15.0
    ground = ground + NERO_DRIFT * map_coordinates(
        fbm(rng, shape, (1.4 * win, 260), 3), coords, order=1, mode="reflect")
    ground = ground + NERO_STREAK * map_coordinates(
        fbm(rng, shape, (0.22 * win, 15), 2), coords, order=1, mode="reflect")
    # ...and the crystal, which is what stops the veins looking painted on.
    grain = 2.0 * fbm(rng, shape, (1.1, 1.1), 2)

    return np.clip(ground + NERO_VEIN_GAIN * veins + grain, 0.0, 255.0)


# ---------------------------------------------------------------------------
# the bake
# ---------------------------------------------------------------------------

def build(key: str) -> None:
    spec = CANDIDATES[key]
    print("%s - %s" % (key, spec["title"]))

    slab = synth_nero() if spec["src"] is None else load_luma(spec["src"])
    print("  slab %dx%d  mean %.1f  std %.1f" %
          (slab.shape[1], slab.shape[0], slab.mean(), slab.std()))

    front_h = PLATE_H - TOP_H
    gain = spec["gain"]

    # ---- the top face: cut square-on, laid down, then lit --------------------
    # Cut at the face's own aspect BEFORE the warp and not after. The warp draws
    # the far rows in from both sides, so a band cut at the finished shape would
    # come back with the stone squeezed at the top and reflected padding down
    # both ends; cutting wider than the plate and letting the warp use the slack
    # is what keeps the corners real stone.
    top_src = cut(slab, spec["top"], PLATE_W / float(TOP_H) / TOP_PERSPECTIVE)
    top = perspective(resize(top_src, PLATE_W, TOP_H * 3), PLATE_W, TOP_H,
                      TOP_PERSPECTIVE)
    top = ramp([(0.0, TOP_BACK), (TOP_PEAK_AT, TOP_PEAK), (1.0, TOP_EDGE)],
               TOP_H)[:, None] + detail(top, MARBLE_PEAK_TOP * gain)

    # ---- the front face: square-on, because it is ---------------------------
    front = resize(cut(slab, spec["front"], PLATE_W / float(front_h)),
                   PLATE_W, front_h)
    front = ramp([(0.0, FRONT_TOP), (0.09, FRONT_SET), (0.646, FRONT_MID),
                  (0.90, FRONT_BASE), (1.0, FRONT_BOTTOM)],
                 front_h)[:, None] + detail(front, MARBLE_PEAK_FRONT * gain)

    plate = np.concatenate([top, front], axis=0)

    # ---- the block's left corner -------------------------------------------
    # A share of the plate's width rather than a pixel count, so it stays the
    # same fraction of the slab however the plate is re-baked. Only the LEFT end:
    # the render's right end is outside the picture, and inventing a matching
    # highlight there would be inventing a second light.
    edge = max(1, int(round(PLATE_W * CORNER_W)))
    fall = np.cos(np.linspace(0.0, np.pi / 2.0, edge, dtype=np.float32)) ** 2
    plate[:, :edge] += CORNER_GAIN * fall[None, :]

    plate = np.clip(plate, 0.0, 255.0)
    print("  plate %dx%d (top %d)  mean %.1f  top %.1f  front %.1f" %
          (PLATE_W, PLATE_H, TOP_H, plate.mean(),
           plate[:TOP_H].mean(), plate[TOP_H:].mean()))
    save_webp(plate, "marble-%s.webp" % key)


def save_webp(a: np.ndarray, name: str) -> str:
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, name)
    # The one place the plate stops being a luminance. WebP has no greyscale mode
    # and would have stored three identical channels anyway, so the cast is free.
    rgb = a[:, :, None] * np.asarray(MARBLE_CAST, dtype=np.float32)[None, None, :]
    im = Image.fromarray(np.round(np.clip(rgb, 0, 255)).astype(np.uint8), mode="RGB")
    im.save(path, "WEBP", quality=MARBLE_QUALITY, method=6)
    print("  %-24s %4dx%-4d  %6.1f KB  q%d" %
          (name, im.width, im.height, os.path.getsize(path) / 1024.0,
           MARBLE_QUALITY))
    return path


def digest() -> str:
    """One short hash over the marble plates, for the ?v= they are fetched with.

    OVER `marble-*` ONLY, and design/effects/build-textures.py hashes only its
    own two for the same reason: the two scripts write into one directory and a
    digest over all of it would make each one's version string change whenever
    the other was re-baked, which is a stamp that says nothing about the asset it
    is stamped on.
    """
    hashes = []
    for name in sorted(os.listdir(OUT_DIR)):
        if not name.startswith("marble-") or not name.endswith(".webp"):
            continue
        with open(os.path.join(OUT_DIR, name), "rb") as fh:
            hashes.append(hashlib.sha256(fh.read()).hexdigest())
    return hashlib.sha256("".join(hashes).encode()).hexdigest()[:8]


def main() -> None:
    which = (sys.argv[1] if len(sys.argv) > 1 else "all").lower()
    if which != "all" and which not in CANDIDATES:
        sys.exit(__doc__)
    for key in CANDIDATES if which == "all" else [which]:
        build(key)
    print("\nMARBLE_VERSION = \"%s\"  <- paste over the ?v= on every --panel-marble\n"
          "                          url() in portfolio/styles.css when it differs\n"
          "                          from what is written there" % digest())


if __name__ == "__main__":
    main()
