#!/usr/bin/env python3
"""Bake the two Texturelabs plates into the assets portfolio/styles.css overlays.

    python design/effects/build-textures.py [film | paper | all]

Two textures, two entirely different jobs, and the difference is worth stating
before any of the constants below make sense:

* **film** — Texturelabs_Film_185XL.jpg, an emulsion frame: scratches, dust,
  halation blooms and a plate edge, on a field that is nearly black (mean 38 of
  255). It is used ONCE, stretched over the whole band with `cover`. It is not
  tiled and must not be: the marks on it are singular events — this scratch, that
  bloom — and repeating them turns a photographed accident into wallpaper.
* **paper** — Texturelabs_Paper_349XL.jpg, a flat sheet of fine paper grain whose
  field is already mid-grey (mean 129). It carries no singular marks at all, only
  fibre, so it is used the opposite way: cut small, tiled edge to edge, and asked
  only to put a tooth on the page. Which means it has to WRAP, and most of this
  file is about making it do so invisibly.

Both leave here **centred on mid-grey**, and that is the one decision the rest of
the pipeline hangs off. `overlay` and `soft-light` are no-ops at exactly 128:
a pixel of the texture that carries no information leaves the page underneath it
completely unchanged. So the flat field costs nothing and only the marks land,
which is what lets one asset serve the light theme and the dark one without being
inverted between them — a dark theme wants the same scratches, not their negative.
It is also why the strength control in the stylesheet can be a plain opacity: it
mixes toward 128, which is toward "no effect", rather than toward grey paint.

Getting there is a **high-pass**, on both, for the same reason and at wildly
different radii:

* The film's own gross shape — its overall blackness, its corner falloff — is
  low-frequency, and if it survives, the texture stops being a texture and starts
  being a vignette painted over the CV. Removed at a radius of a tenth of the
  frame, which is far larger than any mark on it, so every scratch, speck and
  bloom comes through untouched.
* The paper's mottle is low-frequency too, and there it is worse than ugly: a
  tile that carries a slow light-to-dark drift cannot be made to wrap, because
  the drift itself is the seam. Removing it at a small radius is what makes the
  seamless step below possible at all, rather than merely tidier.

Deterministic: same inputs, byte-identical outputs. There is no random number in
this file — unlike design/plate/build-plate.py, nothing here is grained, because
both of these ARE grain.

WHY THE SOURCES ARE NOT IN THE REPO
-----------------------------------
The two XL JPEGs are 9 MB and 12 MB and are gitignored, exactly as photos/, the
RW2s and the cut-out plate PNG are — see .gitignore, which now carries a
/Texturelabs_*.jpg line for them. Drop them at the repo root and run this; what
gets committed is what this writes into portfolio/img/tex/.

They are free-for-commercial-use downloads from texturelabs.org under its own
licence, which asks for attribution and forbids redistributing the source files
as textures. Baked, cut down and blended into a page they are a derivative work
and fine; committing the 12 MB original would be redistribution of the asset, so
the gitignore line is the licence being honoured as well as the repo being kept
lean. The attribution is in portfolio/img/tex/README.md.
"""

from __future__ import annotations

import hashlib
import os
import sys

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(ROOT, "portfolio", "img", "tex")

# design/bake/ is a sibling of this folder and is not a package, so it is put on
# the path rather than imported through a name that does not exist. The constants
# marked TUNING below are DECLARED in design/bake/effects/recipe.json, with their
# ranges and the paragraph saying what each does, and read here - one value in one
# place, reachable from the Editor and from this script alike. See
# design/bake/tuning.py.
sys.path.insert(0, os.path.join(ROOT, "design", "bake"))
import tuning  # noqa: E402

TUNING = tuning.bake("effects")


# ---------------------------------------------------------------------------
# shared
# ---------------------------------------------------------------------------

def load_luma(path: str) -> np.ndarray:
    """The frame as float32 luminance in 0..255.

    Colour is thrown away deliberately and not merely for size. Both plates are
    already neutral — every channel mean of both files agrees to a tenth of a
    level — so the colour carries nothing, while KEEPING it would tint whatever
    is under the overlay. The page has a palette; a texture is not the place to
    argue with it. The one effect here that does want colour, the chromatic
    aberration, makes its own rather than borrowing the film's.
    """
    if not os.path.exists(path):
        sys.exit(
            "missing source: %s\n"
            "The XL JPEGs are gitignored — see WHY THE SOURCES ARE NOT IN THE REPO\n"
            "in this file's docstring. Download them from texturelabs.org and drop\n"
            "them at the repo root." % path
        )
    im = Image.open(path)
    return np.asarray(im.convert("L"), dtype=np.float32)


def highpass(a: np.ndarray, sigma: float) -> np.ndarray:
    """Everything finer than `sigma`, zero-mean.

    A plain subtract-the-blur, which is the whole of what a high-pass is; the
    name is borrowed from the retouching filter because that is what it is being
    used for here, not because anything clever is happening.
    """
    return a - gaussian_filter(a, sigma=sigma, mode="reflect")


def levels(detail: np.ndarray, gain: float, gamma: float) -> np.ndarray:
    """Zero-mean detail → 0..255 centred on 128, with a curve on the way.

    `gain` is a multiplier on the detail before it is offset, so it is exactly
    the "how strong" control and it is the one to move first. `gamma` then bends
    the two halves symmetrically about the centre: below 1 pushes the small
    deviations up and brings faint fibre and faint scratches out of nothing;
    above 1 pulls them down and leaves only the marks that were already loud.
    Symmetric on purpose — a curve that treated the light half differently from
    the dark one would stop the field being neutral at 128, which is the one
    property everything downstream is built on.

    The clip at the ends is real clipping and is accepted: the film's scratches
    are 6-sigma events and any gain that renders the grain at all will blow them
    out. They are scratches. They are supposed to be blown out.
    """
    x = detail * gain / 128.0                      # → roughly -1..1
    if gamma != 1.0:
        x = np.sign(x) * np.power(np.abs(x).clip(0.0, 1.0), gamma)
    return np.clip(x * 128.0 + 128.0, 0.0, 255.0)


def match_energy(a: np.ndarray, target_std: float) -> np.ndarray:
    """Re-stretch a downscaled rung about mid-grey until it carries as much
    contrast as the rung it was cut from.

    Downscaling averages, and averaging independent noise divides its standard
    deviation by the scale factor. So the 512 paper tile came out of the 1024 one
    at a standard deviation of 23 against 36 — the same texture, two thirds of the
    tooth — and since the two rungs are chosen by DISPLAY DENSITY rather than by
    anything the page decides, that is one site that looks meaningfully different
    on a 1x screen from a 2x one at identical settings. Tuning the strength on
    either would then be wrong on the other.

    Matching the energy is the standard answer and is the honest one here: at 1x
    the finest half of the grain is below what the display can resolve, so what
    is wanted is not the same numbers but the same APPEARANCE, and appearance is
    carried by the contrast that survives. The small rung comes out slightly
    coarser and just as strong, which is what the same paper looks like through a
    coarser screen.

    It applies to the film too and does almost nothing there — 28.82 against
    28.89 — which is worth keeping as a check rather than skipping: the film is
    band-passed, so it has no energy near its own Nyquist to lose, and this
    reporting nothing is that band-pass being confirmed at the other end of the
    pipeline.
    """
    have = float(a.std())
    if have <= 0:
        return a
    return np.clip((a - 128.0) * (target_std / have) + 128.0, 0.0, 255.0)


def save_webp(a: np.ndarray, name: str, lossless: bool, quality: int) -> str:
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, name)
    im = Image.fromarray(np.round(a).astype(np.uint8), mode="L")
    # WebP has no greyscale mode of its own; it stores L as RGB and pays about
    # nothing for it, since three identical channels is the easiest thing its
    # predictor will ever be handed.
    im.convert("RGB").save(path, "WEBP", lossless=lossless, quality=quality, method=6)
    kb = os.path.getsize(path) / 1024.0
    print("  %-22s %4dx%-4d  %7.1f KB  %s" %
          (name, im.width, im.height, kb, "lossless" if lossless else "q%d" % quality))
    return path


# ---------------------------------------------------------------------------
# film — one frame, stretched over the band, never repeated
# ---------------------------------------------------------------------------

FILM_SRC = os.path.join(ROOT, "Texturelabs_Film_185XL.jpg")

# The plate edge. The scan runs right to the border of the emulsion and the
# outermost band of it is the holder, not the film — a hard dark rim that would
# read as a frame drawn round the CV once it is stretched to `cover`. Trimmed as
# a share of each side rather than in pixels, so re-shooting the plate at another
# size does not silently change what is cut.
FILM_INSET = TUNING.num("FILM_INSET")

# Two rungs, handed to CSS image-set() by resolution rather than picked in
# script. The film is drawn with `cover` over a box that is always the viewport,
# so density is the whole of what decides how many real pixels it lands in —
# unlike the corner pictures, whose SIZE varies with the window and which
# therefore need the measuring that index.html does. 1x/2x is the entire
# question here, and CSS can answer it without JavaScript.
#
# Both are cut from the LARGER one rather than each from the source, so the two
# are the same picture at two densities and not two slightly different grades of
# it. Everything below is therefore measured in pixels of the top rung.
FILM_RUNGS = [1600, 2600]

# The coarse end of the band. It was a tenth of the short side — the largest
# radius that flattens the frame's corner falloff without eating into the widest
# bloom, which is about a fortieth of the frame — and that turned out to be the
# wrong thing to optimise. A tenth of the short side is 190px of a 2600px frame,
# and the emulsion base's slow mottle lives in the 60-190px band that leaves in.
# Under the levels stage that band is amplified 3x along with everything else,
# and a soft grey cloud with no edge in it, amplified, is exactly what a picture
# that has been scaled up from something small looks like. It read as a low-res
# asset rather than as film.
#
# A fortieth is 65px, so this is still above every mark the plate carries, and
# the falloff it no longer flattens was never visible at these opacities anyway.
FILM_SIGMA_FRAC = TUNING.num("FILM_SIGMA_FRAC")

# ...and the OTHER end of the pass, which is the constant that costs the most
# bytes and is the one to move if this asset ever has to get smaller. A plain
# high-pass leaves the emulsion's per-pixel grain in, and per-pixel grain is, by
# construction, the single least compressible thing an image can contain: the
# first cut of this asset came out at 590 KB and 1.74 MB for the two rungs.
#
# It was 2.0, on the argument that fine tooth is the paper tile's job and the
# paper tile can do it in 56 KB because it is 512px square and repeats. The
# argument is sound and the number was still too high. The film is drawn with
# `cover` over a box that is always the viewport, so a radius stated in pixels of
# the 2600px frame lands on screen scaled by (viewport / 2600): at 1440 a sigma
# of 2.0 arrives as 1.1 device pixels, which is a blur across the whole frame
# rather than a band nobody can resolve. Every scratch on the plate came out
# without an edge, and the page under it looked soft.
#
# 1.2 lands at about 0.66 device pixels at the same width — under what the
# display resolves, which is what this constant was always meant to be — and the
# scratches come back with their edges on. It is not free: the two rungs go from
# 171/283 KB to 276/477 KB, of which a visitor fetches exactly one. Paid
# knowingly, because the softness was the thing being complained about.
#
# The division of labour still holds and is why this is 1.2 rather than 0.8: the
# per-pixel band under it is the paper's, it costs 1.2 MB across the two rungs to
# carry it here, and it would then be on the page twice.
FILM_FINE = TUNING.num("FILM_FINE")

FILM_GAIN = TUNING.num("FILM_GAIN")   # the band's own std is ~7 levels once the grain is out
                        # of it; x4.6 puts it near 32, a legible tooth at the
                        # opacities the stylesheet actually uses (0.05-0.14)
FILM_GAMMA = TUNING.num("FILM_GAMMA")  # open, and more open than the paper's: what is left in
                        # this band after FILM_FINE is mostly faint — the loud
                        # marks are a few dozen scratches — so the curve is doing
                        # real work here rather than trimming
FILM_QUALITY = TUNING.integer("FILM_QUALITY")  # lossy: a full-frame wash at <=18% opacity,
                        # lossless costs about 3x the bytes for a difference
                        # nothing at that opacity could show. Measured against a
                        # re-bake with no webp step at all and the two are hard
                        # to tell apart under the levels stage, so the quality
                        # was lowered rather than raised when FILM_FINE came
                        # down: it is buying back some of what the finer band
                        # cost, and the artefact it trades for — webp's 4px
                        # transform grid, which the 3x detail gain does amplify —
                        # is the smaller of the two by a long way.


def build_film() -> None:
    print("film - Texturelabs_Film_185XL.jpg")
    a = load_luma(FILM_SRC)
    h, w = a.shape
    dy, dx = int(h * FILM_INSET), int(w * FILM_INSET)
    a = a[dy:h - dy, dx:w - dx]

    # Down to the top rung BEFORE the band-pass, not after. Two reasons, and the
    # first is only speed: a gaussian at sigma 500 over a 6995x5205 frame is a
    # 4000-tap kernel and takes minutes, where the same radius as a share of a
    # 2600px frame is 190 and takes a second. The second is correctness — every
    # radius here is meant as a share of the picture, and doing the arithmetic at
    # one size means FILM_FINE can be stated in pixels of the asset that ships
    # rather than in pixels of a source that could be re-scanned tomorrow.
    top = max(FILM_RUNGS)
    a = np.asarray(
        Image.fromarray(np.round(a).astype(np.uint8), mode="L")
             .resize((top, round(top * a.shape[0] / a.shape[1])), Image.LANCZOS),
        dtype=np.float32)

    detail = (gaussian_filter(a, sigma=FILM_FINE, mode="reflect")
              - gaussian_filter(a, sigma=min(a.shape) * FILM_SIGMA_FRAC, mode="reflect"))
    print("  band std %.1f  ->  gain %.2f  ->  %.1f" %
          (detail.std(), FILM_GAIN, detail.std() * FILM_GAIN))
    out = levels(detail, gain=FILM_GAIN, gamma=FILM_GAMMA)

    im = Image.fromarray(np.round(out).astype(np.uint8), mode="L")
    for rung in FILM_RUNGS:
        r = np.asarray(im, dtype=np.float32) if rung == top else match_energy(
            np.asarray(im.resize((rung, round(rung * im.height / im.width)),
                                 Image.LANCZOS), dtype=np.float32), out.std())
        save_webp(r, "film-%d.webp" % rung, lossless=False, quality=FILM_QUALITY)


# ---------------------------------------------------------------------------
# paper — one small square, tiled, and it has to wrap
# ---------------------------------------------------------------------------

PAPER_SRC = os.path.join(ROOT, "Texturelabs_Paper_349XL.jpg")

# Where on the sheet the tile is cut from, as (left, top) shares of the frame.
# Off-centre on purpose: the middle of this scan carries the sheet's brightest
# mottle and a scatter of the dark specks, and while the high-pass removes the
# first, the second survives and a speck in a tile is a speck every 300px across
# the whole page. This corner is the quietest square on the plate.
PAPER_CROP = TUNING.words("PAPER_CROP", 2)

# The source square, and the tile it becomes. 2048 → 512 is the scaling the
# texture needs on its own terms, not a size convenience: at 1:1 this paper's
# fibre is about 4px across, which against 15px type reads as a rough wall
# rather than as a sheet. A quarter of that puts the fibre just under a pixel of
# CSS, which is the size at which paper stops being visible as texture and
# starts being visible as tooth.
PAPER_SRC_SIZE = TUNING.integer("PAPER_SRC_SIZE")
PAPER_TILE = TUNING.integer("PAPER_TILE")  # the tile's size in CSS pixels
PAPER_RUNGS = [512, 1024]       # ...and in device pixels, via image-set()

# 1.6px at the 1024 rung. Tight, because the only thing this has to remove is
# whatever drift is left across half a metre of paper — everything the tile is
# FOR is finer than two pixels.
PAPER_SIGMA = TUNING.num("PAPER_SIGMA")

PAPER_GAIN = TUNING.num("PAPER_GAIN")
PAPER_GAMMA = TUNING.num("PAPER_GAMMA")

PAPER_QUALITY = 0       # unused: the tile is lossless — see build_paper


def make_seamless(a: np.ndarray) -> np.ndarray:
    """A square of zero-mean detail → the same square, wrapping in both axes.

    The construction, in one axis at a time:

        T(x) = ( S(x)·w(x)  +  S(x + N/2 mod N)·(1 - w(x)) ) / sqrt(w² + (1-w)²)

    with `w(x) = ½(1 - cos 2πx/N)`, a cosine that is 0 at the tile's own edge and
    1 at its middle.

    Two seams exist and each weight kills one of them. `S` is not periodic, so its
    discontinuity sits at x=0 — where `w` is 0, so S contributes nothing there.
    The half-rolled copy carries that same discontinuity to x=N/2 — where `w` is
    1, so the copy contributes nothing there. Everywhere in between the two are
    cross-faded, and since `w` is itself periodic the result is periodic by
    construction rather than by inspection: T(0) and T(N) are the same expression,
    not two values that happen to agree.

    The divisor is the part that is easy to leave out and impossible to unsee
    afterwards. A plain cross-fade of two independent noise fields halves the
    variance where the weights meet, so a tile blended without it comes out with
    a soft cross of DEAD GRAIN through it — flat bands a quarter and three
    quarters of the way across, which then repeat every tile and are far more
    visible than the seam the blend was cutting out. Dividing by sqrt(w² + (1-w)²)
    is the variance of that sum for independent signals, so the grain energy comes
    out flat: 1 at the ends where one copy is doing all the work, 0.707 in the
    middle where they share it equally, which is exactly the loss being undone.

    It costs a ghost — every speck appears twice, each at part strength, once at
    its own place and once half a tile away. On fibre that is invisible, which is
    why PAPER_CROP goes looking for the square with the fewest specks on it.
    """
    n = a.shape[0]
    assert a.shape == (n, n), "the tile must be square"
    x = np.arange(n, dtype=np.float32)
    w1 = 0.5 * (1.0 - np.cos(2.0 * np.pi * x / n))
    norm = np.sqrt(w1 ** 2 + (1.0 - w1) ** 2)

    out = a
    for axis in (0, 1):
        w = w1.reshape((-1, 1) if axis == 0 else (1, -1))
        d = norm.reshape((-1, 1) if axis == 0 else (1, -1))
        out = (out * w + np.roll(out, n // 2, axis=axis) * (1.0 - w)) / d
    return out


def seam_error(a: np.ndarray) -> float:
    """How much the tile's opposite edges disagree, against how much neighbouring
    columns inside it disagree. 1.0 means the seam is indistinguishable from any
    other pair of adjacent pixels — which is the actual definition of seamless,
    and a far more useful number than the raw difference, since a noisy texture
    has a large difference everywhere."""
    inner = np.mean(np.abs(np.diff(a, axis=1)))
    wrap = np.mean(np.abs(a[:, 0] - a[:, -1]))
    return float(wrap / inner) if inner else float("inf")


def build_paper() -> None:
    print("paper - Texturelabs_Paper_349XL.jpg")
    a = load_luma(PAPER_SRC)
    h, w = a.shape
    left = int((w - PAPER_SRC_SIZE) * PAPER_CROP[0])
    top = int((h - PAPER_SRC_SIZE) * PAPER_CROP[1])
    crop = a[top:top + PAPER_SRC_SIZE, left:left + PAPER_SRC_SIZE]

    big = max(PAPER_RUNGS)
    scaled = np.asarray(
        Image.fromarray(np.round(crop).astype(np.uint8), mode="L")
             .resize((big, big), Image.LANCZOS),
        dtype=np.float32)

    detail = highpass(scaled, sigma=PAPER_SIGMA)
    print("  detail std %.2f  ->  gain %.2f  ->  %.2f" %
          (detail.std(), PAPER_GAIN, detail.std() * PAPER_GAIN))
    print("  seam before %.2fx neighbouring-pixel difference" % seam_error(detail))
    detail = make_seamless(detail)
    print("  seam after  %.2fx" % seam_error(detail))

    out = levels(detail, gain=PAPER_GAIN, gamma=PAPER_GAMMA)
    im = Image.fromarray(np.round(out).astype(np.uint8), mode="L")

    for rung in PAPER_RUNGS:
        # Downscaling a wrapping tile keeps it wrapping — a box filter over
        # periodic data is periodic — so the small rung is derived rather than
        # rebuilt, and the two rungs are guaranteed to be the same texture.
        # ...and then re-stretched to carry the same contrast, which on this
        # asset is the difference between 23 and 36. See match_energy().
        r = np.asarray(im, dtype=np.float32) if rung == big else match_energy(
            np.asarray(im.resize((rung, rung), Image.LANCZOS), dtype=np.float32),
            out.std())
        # Lossless, and this is the one place in the repo where that is not
        # extravagance. Every lossy codec is a low-pass with a block structure,
        # and this asset is nothing BUT the frequencies it would remove; worse,
        # whatever ringing it leaves at the tile's own edge is repeated at every
        # tile boundary on the page, which reconstructs by hand the exact seam
        # make_seamless() exists to remove.
        save_webp(r, "paper-%d.webp" % rung, lossless=True, quality=100)

    # A 2x2 lay-up, so "are there seams" is a thing to look at rather than a
    # number to trust. Written to the scratch of the caller's choosing; not
    # committed, and not served.
    proof = Image.new("L", (PAPER_TILE * 2, PAPER_TILE * 2))
    small = im.resize((PAPER_TILE, PAPER_TILE), Image.LANCZOS)
    for py in (0, PAPER_TILE):
        for px in (0, PAPER_TILE):
            proof.paste(small, (px, py))
    proof_path = os.path.join(OUT_DIR, "paper-seam-proof.png")
    proof.save(proof_path)
    print("  seam proof -> %s (not committed; delete after looking)" % proof_path)


# ---------------------------------------------------------------------------

def digest() -> str:
    """One short hash over THIS script's own plates in portfolio/img/tex/, for the
    ?v= these assets are fetched with. Same job and same reasoning as IMG_VERSION
    in portfolio/index.html — a rung's filename does not change when its contents
    do, and vercel.json caches this directory for a day.

    IT USED TO HASH EVERY .webp IN THE DIRECTORY, and stopped when
    design/plinth/build-slab.py started writing its plinth renders into the same
    one. Two scripts, one directory: a digest over all of it would make this
    file's version string change whenever the plinth was re-rendered, and the
    plinth's change whenever the film was — a stamp that says nothing about the
    asset it is stamped on, and a diff that looks like a texture changed when
    none did. Each hashes its own.
    """
    hashes = []
    for name in sorted(os.listdir(OUT_DIR)):
        if not name.endswith(".webp"):
            continue
        if not (name.startswith("film-") or name.startswith("paper-")):
            continue
        with open(os.path.join(OUT_DIR, name), "rb") as fh:
            hashes.append(hashlib.sha256(fh.read()).hexdigest())
    return hashlib.sha256("".join(hashes).encode()).hexdigest()[:8]


def main() -> None:
    which = (sys.argv[1] if len(sys.argv) > 1 else "all").lower()
    if which not in ("film", "paper", "all"):
        sys.exit(__doc__)
    if which in ("film", "all"):
        build_film()
    if which in ("paper", "all"):
        build_paper()
    print("\nTEX_VERSION = \"%s\"  <- paste over the ?v= on --fx-film-src and\n"
          "                        --fx-paper-src in portfolio/styles.css when\n"
          "                        it differs from what is written there" % digest())


if __name__ == "__main__":
    main()
