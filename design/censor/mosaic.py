#!/usr/bin/env python3
"""Bake the confirmed tiles down to a handful of blocks each.

    python design/censor/mosaic.py
    python design/censor/mosaic.py --blocks 8
    python design/censor/mosaic.py --check

Reads design/censor/censored.json, fetches each confirmed photograph's
renditions from the vault, and writes an obscured copy of each into
design/censor/mosaic/ — which is gitignored, because it is a derivative of the
photographs #63 decided about and only the finished clip ships.

design/censor/capture-origin.mjs serves these in place of the vault's own bytes
while the clip is recorded, so the browser that takes the picture is never sent
an unobscured pixel of any of them.

WHY THE MOSAIC IS MADE HERE AND NOT IN THE PAGE
-----------------------------------------------
#57 and #65 both describe a censoring stylesheet injected through record's
`.evaluate()` hatch. That is the right instinct — obscure before capture, never
after — but a stylesheet cannot carry it out, for three reasons found by
measurement rather than argument:

1. CSS has no mosaic. `filter: blur()` is the only obscuring primitive a
   stylesheet has, and design/censor/README.md rejects blur on the record:
   published work on the reversibility of anonymisation shows light blur and
   fine pixelation are partially recoverable by super-resolution. An acceptance
   criterion asking for "a handful of blocks" is asking for a resample, and
   there is no resample in CSS.

2. A stylesheet applies late. record's capture photographs a settled page
   before the Timeline's first Frame — see `captureFrames` in record's
   packages/core/src/capture.ts, which calls `next()` once after the settling
   Frames so that a Frame the compositor reports undamaged has an image to be a
   repeat of. A rule injected by the Timeline is not in the page yet when that
   picture is taken.

3. Nothing in the page can be stronger than the bytes it was given. So long as
   the browser holds the photograph, the obscuring is a presentation of it.

Serving obscured bytes answers all three. Each block is the mean of its region
and nothing else survives the downsample, the substitution is keyed by the
content hash the vault addresses thumbnails with — so tile recycling cannot
desynchronise it, which README.md's second warning is about — and the vault's
own copy is never touched.

WHAT COARSE MEANS HERE
----------------------
BLOCKS is how many blocks the shorter side of a rendition is reduced to before
it is blown back up. At the default the grid tile is 153 CSS pixels wide, so a
block is roughly 34 of them and a face inside a tile is one block or less.

The downsample is Image.BOX — each block is the exact mean of the pixels under
it, which is what a mosaic block is — and the encode is lossless WebP, so the
ringing a lossy encode would put around a flat block cannot carry anything out
of it either.

DEPENDENCIES
------------
    pip install pillow
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import sys
import urllib.error
import urllib.request

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
CONFIRMED = os.path.join(HERE, "censored.json")
ROLL = os.path.join(HERE, "roll.json")
OUT = os.path.join(HERE, "mosaic")
MANIFEST = os.path.join(OUT, "manifest.json")

DEFAULT_VAULT = "http://127.0.0.1:8770"

# How many blocks the shorter side is reduced to. Four puts a 153px grid tile at
# roughly 38px blocks, four across and five down, which is the coarseness the
# author signed the clip off at.
DEFAULT_BLOCKS = 4

# And the finest this is allowed to be asked for. #65's acceptance criterion is
# that "the mosaic is coarse enough that a tile resolves to a handful of blocks",
# and it is the one property of this pipeline that nothing else can check: a
# manifest agrees with the files it names however fine they are, and
# capture-origin.mjs proves the bytes are the baked ones and not that the bake
# was coarse. So the coarseness is enforced here, at the only place that decides
# it, and capture-origin.mjs refuses to serve a bake that came in above it.
#
# Eight, because at eight blocks across a 153px tile a block is 19 pixels and
# every face in the roll is smaller than one. Coarser than this is always
# allowed — there is no floor, and an empty rectangle would satisfy every
# criterion here. Finer is the direction design/censor/README.md gives measured
# reasons not to go.
MAX_BLOCKS = 8

# Both renditions the vault addresses by content hash. The clip only ever asks
# for /t/, but /d/ is one fetch each and a censored photograph that is obscured
# in the grid and not in the substrate is a trap left for whoever next points a
# browser at the capture origin.
RENDITIONS = ("t", "d")


def fetch(vault: str, rendition: str, sha: str) -> bytes | None:
    """The vault's own bytes for one rendition, or None where it has none."""
    url = f"{vault}/{rendition}/{sha}.webp"
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None
        raise


def mosaic(original: bytes, blocks: int) -> tuple[bytes, tuple[int, int], tuple[int, int]]:
    """One rendition, reduced to blocks and blown back up. Returns the bytes,
    the size it came in at, and the block grid it went through."""
    image = Image.open(io.BytesIO(original)).convert("RGB")
    width, height = image.size

    # The shorter side decides, so a wide tile and a tall one get blocks of the
    # same size rather than the same count.
    short = min(width, height)
    across = max(1, round(width / short * blocks))
    down = max(1, round(height / short * blocks))

    small = image.resize((across, down), Image.BOX)
    back = small.resize((width, height), Image.NEAREST)

    buffer = io.BytesIO()
    back.save(buffer, "WEBP", lossless=True, quality=100, method=6)
    return buffer.getvalue(), (width, height), (across, down)


def confirmed_list() -> tuple[dict, list[dict]]:
    """The signed list, and the tiles on it, refusing anything that does not
    hang together. Every check here is a way the clip could come out looking
    correct while covering photographs nobody agreed to publish."""
    with open(CONFIRMED, encoding="utf-8") as handle:
        signed = json.load(handle)
    with open(ROLL, encoding="utf-8") as handle:
        roll = json.load(handle)

    if signed["roll_digest"] != roll["roll_digest"]:
        raise SystemExit(
            "the confirmed list was signed against a different roll than the one on disk.\n"
            "       re-collect and re-review — see design/censor/README.md"
        )
    if not signed.get("confirmed_by", "").strip():
        raise SystemExit("the confirmed list is unsigned; nothing to bake")

    tiles = [tile for tile in signed["tiles"] if tile["censor"]]
    in_roll = {tile["sha"] for tile in roll["tiles"]}
    strays = [tile["sha"] for tile in tiles if tile["sha"] not in in_roll]
    if strays:
        raise SystemExit(f"{len(strays)} confirmed tile(s) are not in the roll")

    return signed, tiles


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vault", default=DEFAULT_VAULT, help="where the grid is answering")
    parser.add_argument("--blocks", type=int, default=DEFAULT_BLOCKS,
                        help=f"blocks across the shorter side of a rendition (at most {MAX_BLOCKS})")
    parser.add_argument("--check", action="store_true",
                        help="report whether the baked mosaics still cover the confirmed list")
    options = parser.parse_args()

    if options.blocks < 1:
        raise SystemExit("--blocks is a count of blocks, so it is at least 1")
    if options.blocks > MAX_BLOCKS:
        raise SystemExit(
            f"--blocks {options.blocks} is finer than the {MAX_BLOCKS} this is allowed to bake.\n"
            "       #65 asks for a tile that resolves to a handful of blocks, and finer\n"
            "       pixelation is partially recoverable - see design/censor/README.md.\n"
            "       Coarser is always allowed; if this ceiling is genuinely wrong, move\n"
            "       MAX_BLOCKS and say why, so the decision is on the record."
        )

    signed, tiles = confirmed_list()
    print(f"confirmed list  {len(tiles)} of {signed['reviewed']} obscured, "
          f"signed by {signed['confirmed_by']} against roll {signed['roll_digest'][:8]}")

    if options.check:
        return check(signed, tiles)

    os.makedirs(OUT, exist_ok=True)
    baked: dict[str, dict] = {}

    for tile in tiles:
        sha = tile["sha"]
        entry: dict[str, dict] = {}
        for rendition in RENDITIONS:
            original = fetch(options.vault, rendition, sha)
            if original is None:
                continue
            obscured, size, grid = mosaic(original, options.blocks)
            directory = os.path.join(OUT, rendition)
            os.makedirs(directory, exist_ok=True)
            with open(os.path.join(directory, f"{sha}.webp"), "wb") as handle:
                handle.write(obscured)
            entry[rendition] = {
                "width": size[0],
                "height": size[1],
                "blocks": list(grid),
                "digest": hashlib.sha256(obscured).hexdigest(),
                "bytes": len(obscured),
            }
        if not entry:
            raise SystemExit(f"the vault has no rendition of {sha[:8]} at all — is it the right vault?")
        baked[sha] = entry
        thumb = entry.get("t") or next(iter(entry.values()))
        print(f"  {sha[:8]}  {thumb['width']}x{thumb['height']}  "
              f"-> {thumb['blocks'][0]}x{thumb['blocks'][1]} blocks  "
              f"{', '.join(sorted(entry))}")

    with open(MANIFEST, "w", encoding="utf-8") as handle:
        json.dump(
            {
                "note": "Baked by mosaic.py from the confirmed list. Not committed — a "
                        "derivative of the photographs #63 decided about. "
                        "capture-origin.mjs refuses to serve against a stale one.",
                "roll_digest": signed["roll_digest"],
                "confirmed_at": signed["confirmed_at"],
                "blocks": options.blocks,
                "tiles": baked,
            },
            handle,
            indent=2,
        )
        handle.write("\n")

    print(f"wrote {len(baked)} obscured tile(s) to {os.path.relpath(OUT, REPO)} "
          f"at {options.blocks} blocks on the shorter side")
    print("design/censor/capture-origin.mjs serves these in place of the vault's own.")
    return 0


def check(signed: dict, tiles: list[dict]) -> int:
    """Whether what is on disk still covers the list as signed. This is the
    question capture-origin.mjs asks before it serves, said out loud."""
    try:
        with open(MANIFEST, encoding="utf-8") as handle:
            manifest = json.load(handle)
    except FileNotFoundError:
        print("STALE — nothing baked yet. Run without --check.", file=sys.stderr)
        return 1

    problems: list[str] = []
    if manifest["roll_digest"] != signed["roll_digest"]:
        problems.append("baked against a different roll")
    if manifest["confirmed_at"] != signed["confirmed_at"]:
        problems.append("baked against an earlier signature")

    for tile in tiles:
        entry = manifest["tiles"].get(tile["sha"])
        if entry is None:
            problems.append(f"{tile['sha'][:8]} is on the list and was never baked")
            continue
        for rendition, facts in entry.items():
            path = os.path.join(OUT, rendition, f"{tile['sha']}.webp")
            try:
                with open(path, "rb") as handle:
                    on_disk = hashlib.sha256(handle.read()).hexdigest()
            except FileNotFoundError:
                problems.append(f"{tile['sha'][:8]} /{rendition}/ is missing")
                continue
            if on_disk != facts["digest"]:
                problems.append(f"{tile['sha'][:8]} /{rendition}/ is not the file that was baked")

    if problems:
        print("STALE", file=sys.stderr)
        for problem in problems:
            print(f"  {problem}", file=sys.stderr)
        return 1

    print(f"baked mosaics cover the confirmed list  "
          f"{manifest['blocks']} blocks on the shorter side")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
