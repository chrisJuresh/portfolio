#!/usr/bin/env python3
"""Take a photograph of Nero Portoro apart into the maps a PBR surface wants.

    python design/plinth/build-portoro-maps.py [--src PATH] [--size N]
                                               [--out DIR] [--square]

To put a DIFFERENT photograph on the plinth, do not run this by hand - run
design/plinth/add-stone.py, which calls build_maps() below into a maps directory
of its own, writes the stone's entry and bakes its plate. Running this one points
every gemini-* stone at your photograph, because they all read `maps/`.

WHY THIS EXISTS AT ALL. design/plinth/build-slab.py grows its stone out of noise
nodes, and the note at the top of it is honest about what that buys and what it
cannot buy. What it cannot buy is STRUCTURE. A vein there is a level set of a
smooth field, and a level set of a smooth field is a closed rounded loop; the
hairlines are a Voronoi cell boundary, and a cell boundary is a honeycomb. Real
Portoro is neither. It is a connected branching network whose trunks open into
patches several percent of the slab across and close to a filament in the space
of a hand's width, and no amount of tuning a threshold on a smooth field makes
that shape, because that shape is not in the field to begin with.

A photograph has it, because a photograph is of a rock that actually broke.

WHY A PHOTOGRAPH WAS TRIED BEFORE AND ABANDONED, and why that is not a reason
not to try it now. design/plinth/build-marble.py (deleted; in history) warped a
slab photo onto a flat RECTANGLE, painted a luminance ramp down it by hand and
drew a specular line where the two faces were supposed to meet. It failed, and
the header it left behind blamed the photograph:

    "Texturelabs' slabs are shot square-on in flat light: they are pictures of
     albedo, with no reflectance in them at all. A polished plinth is mostly
     reflectance."

The second sentence is true and the inference from it is backwards. A flat-lit
albedo photograph is EXACTLY what a base-colour slot is specified to receive.
Reflectance is not supposed to be in it — reflectance comes from the roughness
you pair it with, the IOR, the coat, and a renderer that traces the room. What
that pipeline actually lacked was geometry: no block, no camera, no room, so
nothing for a reflectance to be computed against. All three exist now.

So the photograph is not competing with the renderer here. It supplies the one
thing the renderer cannot invent — where the veins go — and the renderer supplies
the one thing the photograph cannot carry, which is what happens when light
arrives from somewhere other than where the photographer's softbox was.

WHAT COMES OUT. Four maps, from one picture:

    basecolor-<grade>.png   what the rock would be under flat white light
    roughness.png           how polished each part of it is
    height.png              the relief that survives polishing
    calcite.png             where the translucent mineral is

The last two are the ones a photograph is normally thrown away before reaching,
and they are most of why this looks like stone rather than like a picture of
stone. See `THE THREE MINERALS` and `WHY HEIGHT IS A HIGH-PASS` below.

NOTHING HERE NEEDS BLENDER and nothing here needs a GPU. It is numpy on a JPEG,
about four seconds, and it writes PNGs that build-slab.py loads as image
textures. That split is deliberate: a grade is a thing you want to iterate on
twenty times, and iterating on it should not cost a Cycles render each time.

THE SOURCE IS NOT IN THE REPOSITORY, the same way the Texturelabs plates are not
— see the design/effects/sources/ and design/plate/sources/ lines in .gitignore,
and the same reasoning in design/effects/build-textures.py. What ships is the
bake. Drop the image in **design/plinth/sources/** and run this; that directory
is where plinth-studio.py already keeps the photographs dropped on it, so a
grade's source and a stone's source sit in one place.
"""

from __future__ import annotations

import argparse
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "maps")
SRC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources")
DEFAULT_SRC = os.path.join(SRC_DIR, "Gemini_Generated_Image_13pkuz13pkuz13pk.jpg")


# ---------------------------------------------------------------------------
# colour
# ---------------------------------------------------------------------------
# Every grade below happens in LINEAR light and every threshold happens in sRGB,
# and the split is not fussiness. Multiplying two colours together, or lifting
# one toward another, is only physically meaningful on linear values — do it on
# sRGB and a "half as bright" ground comes out at 73% rather than 50%. But a
# THRESHOLD wants to sit where the eye puts it, and the eye is the sRGB curve:
# "the dark 80% of this picture" is a statement about perceived lightness, and
# picking it on linear values puts the knife in the wrong place by a mile.

def srgb_to_linear(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(c):
    c = np.clip(c, 0.0, 1.0)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1.0 / 2.4) - 0.055)


def smoothstep(x, lo, hi):
    t = np.clip((x - lo) / max(hi - lo, 1e-9), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def box_blur(a, radius):
    """A separable box blur by summed-area table. Two passes, so near-Gaussian.

    scipy would do this in one call and scipy is installed, but a summed-area
    table is four lines and this file then depends on numpy and Pillow only,
    which is what every other build script here depends on.
    """
    if radius < 1:
        return a
    for _ in range(2):
        pad = np.pad(a, radius, mode="reflect")
        cs = np.cumsum(np.cumsum(pad, axis=0), axis=1)
        cs = np.pad(cs, ((1, 0), (1, 0)))
        k = 2 * radius + 1
        h, w = a.shape
        a = (cs[k:k + h, k:k + w] - cs[0:h, k:k + w]
             - cs[k:k + h, 0:w] + cs[0:h, 0:w]) / float(k * k)
    return a


# ---------------------------------------------------------------------------
# THE THREE MINERALS
# ---------------------------------------------------------------------------
# Portoro is three things and they are three different SURFACES, not three
# colours on one surface. That distinction is the entire reason this script
# exists rather than the photograph being wired straight into Base Color:
#
#   the ground   bituminous limestone. Near black, dense, takes the finest
#                polish of the three, and is what most of the slab is.
#   the gold     ochre dolomitic alteration along the seams. Softer, slightly
#                porous, so it polishes to a duller sheen and sits a hair proud
#                of nothing - it dishes very slightly under the wheel.
#   the calcite  white crystalline fill in the fractures. Hardest of the three,
#                stands PROUD after polishing by a few microns, and - the thing
#                that actually matters - is TRANSLUCENT. Light goes in, bounces
#                around in the crystal and comes back out somewhere else.
#
# That last property is most of why real marble looks wet and deep and a flat
# albedo map looks like painted card. It is one number in a Principled BSDF and
# it is free, and it needs a mask saying where the calcite is, which is what
# `calcite.png` is for. Nothing in the procedural material has ever had it.
#
# The partition is soft and it is a partition: ground + gold + calcite == 1 at
# every pixel. Hard thresholds put a visible contour line through a slab at the
# exact luma the knife was set to, which is a thing no rock has.
GROUND_HI = (0.10, 0.45)      # luma over which a pixel stops being ground
WARM_BAND = (0.015, 0.100)    # r-b over which "not ground" becomes gold not white


def classify(srgb):
    r, g, b = srgb[..., 0], srgb[..., 1], srgb[..., 2]
    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    hi = smoothstep(luma, *GROUND_HI)
    goldness = smoothstep(r - b, *WARM_BAND)
    gold = hi * goldness
    calcite = hi * (1.0 - goldness)
    ground = 1.0 - hi
    return luma, ground, gold, calcite


# ---------------------------------------------------------------------------
# the grades
# ---------------------------------------------------------------------------
# A grade is three (multiply, lift, saturate) triples, one per mineral, applied
# to the photograph's own linear values and then recombined through the masks.
# Grading each mineral SEPARATELY and putting them back is what keeps all of the
# photographic micro-structure - the mottling inside a gold swathe, the grain in
# the black - while still letting the black go black and the white go white.
# A curve applied to the whole picture cannot do that: pulling the ground down
# takes the veins with it, and that is precisely how the last attempt ended up
# with mid-grey lines on dark-grey rock.
#
#   mul   scales the mineral's linear radiance
#   lift  blends it toward a target colour (0 = untouched, 1 = flat target)
#   sat   scales chroma about the pixel's own luma
#
# DEGLOSS is subtracted from everything first. The source is a photograph of a
# POLISHED slab, so a thin veiling of the photographer's own light is reflected
# off the whole surface and is sitting in every pixel including the black ones.
# Left in, it is added a second time by Cycles when the block is lit, and the
# ground comes out milky. It is small - about a thousandth of full scale - and
# taking it out is the difference between a black that reads as stone and a
# black that reads as slate grey.
GRADES = {
    # What the photograph already is, with only the veiling taken off. The
    # honest control: if this is the one that wins, everything below is
    # elaboration and should be deleted.
    "asis": {
        "title": "the photograph, de-glossed and otherwise untouched",
        "degloss": 0.0012,
        "ground": (1.00, (0.00, None), 1.00),
        "gold": (1.00, (0.00, None), 1.00),
        "calcite": (1.00, (0.00, None), 1.00),
    },
    # The same rock in a darker room. The ground goes properly black and the
    # calcite goes properly white, which is what a reference slab does and what
    # build-slab.py's own header worked out the hard way ("THE GROUNDS ARE
    # BLACKER AND THE VEINS ARE BRIGHTER... the stone is almost all contrast").
    # The gold is left roughly where it is so the range opens around it.
    "deep": {
        "title": "blacks crushed and calcite lifted - all contrast, like the slab",
        "degloss": 0.0022,
        "ground": (0.62, (0.35, (0.0030, 0.0029, 0.0032)), 0.85),
        "gold": (1.06, (0.00, None), 1.18),
        "calcite": (1.30, (0.28, (0.86, 0.855, 0.85)), 0.70),
    },
    # Portoro sold as Portoro d'Oro: the gold pushed until it is the point of
    # the stone rather than an incident in it. Showier, and further from the
    # photograph - included because "most gorgeous" and "most faithful" are not
    # the same request and only one of them was made.
    "gold": {
        "title": "the gold pushed to Portoro d'Oro - showy rather than faithful",
        "degloss": 0.0022,
        "ground": (0.55, (0.42, (0.0026, 0.0025, 0.0029)), 0.85),
        "gold": (1.65, (0.30, (0.72, 0.46, 0.11)), 1.55),
        "calcite": (1.45, (0.35, (0.92, 0.91, 0.89)), 0.60),
    },
}


def grade(lin, masks, spec):
    """Apply a grade's per-mineral triples and recombine through the masks."""
    lin = np.maximum(lin - spec["degloss"], 0.0)
    out = np.zeros_like(lin)
    for name, m in masks.items():
        mul, (lift, target), sat = spec[name]
        c = lin * mul
        if sat != 1.0:
            y = (0.2126 * c[..., 0] + 0.7152 * c[..., 1]
                 + 0.0722 * c[..., 2])[..., None]
            c = np.maximum(y + (c - y) * sat, 0.0)
        if lift > 0.0 and target is not None:
            c = c * (1.0 - lift) + np.asarray(target, np.float32) * lift
        out += c * m[..., None]
    return out


# ---------------------------------------------------------------------------
# roughness
# ---------------------------------------------------------------------------
# One number per mineral, plus a slow drift over the whole slab. The drift is
# the thing that is easy to leave out and is half of what sells a polish: a
# real polished face is not uniformly polished, it is a shade duller where the
# wheel lingered, and those patches are tens of centimetres across. Without it
# the top face is a perfect mirror everywhere and reads as glass.
#
# The ordering is the physical one and it is the whole reason roughness is a MAP
# rather than a constant: the black takes the finest polish, the calcite is hard
# and crystalline and scatters a little, the gold is soft and porous and scatters
# most. So a vein catches the key differently from the rock around it, which is
# what a photograph in a base-colour slot on its own can never show.
ROUGH = {"ground": 0.055, "gold": 0.230, "calcite": 0.135}
ROUGH_DRIFT = (0.030, 90)     # +- this much, over a blur radius of this many px


# ---------------------------------------------------------------------------
# WHY HEIGHT IS A HIGH-PASS
# ---------------------------------------------------------------------------
# The obvious move is to feed luma straight into a bump node, and it is wrong in
# a way that is obvious once rendered and not before: luma's big term is WHERE
# THE GOLD IS, so a gold swathe a third of the slab across becomes a hill a
# third of the slab across, the surface normal tilts across the whole thing, and
# the polished top face bends the reflected room into a funhouse mirror. The
# slab domes.
#
# A polished slab is FLAT. That is what polishing is. What survives it is a few
# microns of differential hardness at the mineral boundaries - the calcite
# standing proud, the gold dished - and those are edges, not fields. So the
# height map is luma minus a blur of luma, which keeps every edge and discards
# every hill, plus an explicit term for the calcite standing up.
HEIGHT_BLUR = 24
HEIGHT_GAIN = 2.2
CALCITE_PROUD = 0.16


def build_maps(src, out_dir=OUT_DIR, size=0, square=False):
    """One photograph -> the four maps, in `out_dir`. Returns the mineral split.

    Split out of main() so design/plinth/add-stone.py can build a stone of its
    own without shelling out, and - the part that actually matters - without one
    stone's maps landing on top of another's. `out_dir` is maps/ for the stone
    this file was written for and maps/<name>/ for every stone added since.

    `square` IS A COMPOSITIONAL CROP AND NOTHING ELSE NOW. It used to be the
    workaround for build-slab.py projecting these with a BOX projection and a
    UNIFORM mapping scale, which laid one tile of the image over a square of
    model space whatever the image's own aspect was and squeezed a 2:1 photograph
    to half its height on the block. Cropping the input square hid that by giving
    the projection the aspect it had assumed. build_photo_material() now scales
    its two V axes by the source's own aspect instead, so the stretch is gone at
    the projection and every aspect arrives on the stone undistorted. Leave this
    off unless you want the centre of the picture and not the whole of it.
    """
    if not os.path.isfile(src):
        raise SystemExit(
            "missing %s\n\nThe source photograph is not in the repository - see\n"
            "the note at the top of this file. Drop it in design/plinth/sources/,\n"
            "or pass --src." % src)

    im = Image.open(src).convert("RGB")
    if square and im.width != im.height:
        e = min(im.size)
        l, t = (im.width - e) // 2, (im.height - e) // 2
        im = im.crop((l, t, l + e, t + e))
        print("square  centre %dx%d cut from the source" % (e, e))
    if size and max(im.size) != size:
        s = size / float(max(im.size))
        im = im.resize((round(im.width * s), round(im.height * s)),
                       Image.LANCZOS)
    srgb = np.asarray(im, np.float32) / 255.0
    h, w = srgb.shape[:2]
    print("source  %s  %dx%d" % (os.path.basename(src), w, h))

    # ---- seamless across U, and only across U -----------------------------
    # The block is 1.19 units wide and at every scale worth using that is more
    # than one tile ACROSS, so a vertical seam would land somewhere on the front
    # face. Down, the block shows only 0.37 units - 0.07 of front face and 0.30
    # of top - so the wrap was reachable by offsetting the sampled window
    # instead, which costs nothing and blends nothing. Hence one axis, not two.
    #
    # THAT IS NO LONGER UNCONDITIONAL. build_photo_material() scales the V axes
    # by the source's aspect now, so V advances aspect times faster than it used
    # to and a wide source at a fine scale can cross a whole tile: 0.37 * scale *
    # aspect > 1, which for this 1.83:1 stone means any scale over about 1.48.
    # build-slab.py says so per stone when it happens. On the two gemini-*-fine
    # stones it does, and the wrap lands around row 23 of 269 - the far strip of
    # the top face, seen at about 3 degrees, where the albedo is swamped by the
    # reflection - so it does not measure above the row-to-row noise. If a source
    # whose top and bottom edges disagree ever makes it visible, the fix is to
    # cross-fade V here as well, and to pay the smeared band for it.
    band = int(w * 0.10)
    ramp = smoothstep(np.linspace(0.0, 1.0, band, dtype=np.float32), 0.0, 1.0)
    blend = srgb.copy()
    left, right = srgb[:, :band], srgb[:, w - band:]
    blend[:, :band] = left * ramp[None, :, None] + right * (1.0 - ramp)[None, :, None]
    srgb = blend
    print("seam    cross-faded %d px across U" % band)

    lin = srgb_to_linear(srgb)
    luma, ground, gold, calcite = classify(srgb)
    masks = {"ground": ground, "gold": gold, "calcite": calcite}
    print("split   ground %.1f%%  gold %.1f%%  calcite %.1f%%"
          % (ground.mean() * 100, gold.mean() * 100, calcite.mean() * 100))

    os.makedirs(out_dir, exist_ok=True)

    def write(name, a, bits=8):
        path = os.path.join(out_dir, name)
        if a.ndim == 2:
            a = a[..., None]
        if bits == 16:
            Image.fromarray(
                np.clip(a[..., 0] * 65535.0, 0, 65535).astype(np.uint16),
                mode="I;16").save(path)
        else:
            arr = np.clip(a * 255.0, 0, 255).astype(np.uint8)
            Image.fromarray(arr[..., 0] if arr.shape[2] == 1 else arr).save(path)
        print("  %-26s %8.1f KB" % (name, os.path.getsize(path) / 1024.0))

    # ---- base colour, one per grade ---------------------------------------
    for key, spec in GRADES.items():
        out = grade(lin, masks, spec)
        write("basecolor-%s.png" % key, linear_to_srgb(out))

    # ---- roughness ---------------------------------------------------------
    r = sum(ROUGH[k] * m for k, m in masks.items())
    amt, rad = ROUGH_DRIFT
    drift = box_blur(luma, rad)
    drift = (drift - drift.mean()) / max(drift.std(), 1e-6)
    r = np.clip(r + np.clip(drift, -2.5, 2.5) / 2.5 * amt, 0.004, 1.0)
    write("roughness.png", r)

    # ---- height, high-passed ----------------------------------------------
    hp = luma - box_blur(luma, HEIGHT_BLUR)
    hp = hp * HEIGHT_GAIN + calcite * CALCITE_PROUD
    hp = (hp - hp.min()) / max(float(np.ptp(hp)), 1e-6)
    write("height.png", hp, bits=16)

    # ---- and the mask that makes the stone translucent ---------------------
    write("calcite.png", calcite)

    print("\nwrote %s" % os.path.relpath(out_dir, ROOT))
    return {"w": w, "h": h, "ground": float(ground.mean()),
            "gold": float(gold.mean()), "calcite": float(calcite.mean())}


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--src", default=DEFAULT_SRC)
    ap.add_argument("--size", type=int, default=0,
                    help="longest edge; 0 keeps the source resolution")
    ap.add_argument("--out", default=OUT_DIR,
                    help="where to write the maps; defaults to design/plinth/maps")
    ap.add_argument("--square", action="store_true",
                    help="centre-crop to a square first - see build_maps()")
    args = ap.parse_args()
    build_maps(args.src, args.out, args.size, args.square)
    print("now:  blender -b -P design/plinth/build-slab.py -- gemini")


if __name__ == "__main__":
    main()
