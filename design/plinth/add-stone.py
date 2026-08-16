#!/usr/bin/env python3
"""Put a photograph of your own on the plinth, and in the tuner's picker.

    python design/plinth/add-stone.py --src <photo> --name <name> [options]

Three steps, and the only one that needs Blender is the last:

    1. design/plinth/maps/<name>/   the photograph taken apart into the four maps
                                    a PBR surface wants, by build-portoro-maps.py
    2. design/plinth/stones/<name>-<style>.json   one entry per style, which
                                    build-slab.py merges into PHOTO_CANDIDATES
    3. portfolio/img/tex/plinth-<name>-<style>.webp   the Cycles plates, plus a
                                    rewritten design/plinth/slab.json, which is
                                    what design/plinth/plinth-tuner.html reads

After it, reload the tuner and the stones are in the strip with their plates
under them. They are listed as `photograph, plate only` like every other
photo-backed stone: the
previz is a GLSL twin of the PROCEDURAL material and there is no honest way for
it to draw a photograph it does not have, so what you see there is the real
render rather than an approximation of one.

WHAT MAKES A GOOD SOURCE, in the order the mistakes actually happen:

  ANY SHAPE. build-slab.py used to project the maps with a BOX projection and a
  uniform mapping scale, which laid one tile of the image over a square of model
  space whatever the image's own aspect was and squashed a 3:2 photograph to two
  thirds of its height on the stone; this script cropped the centre square out to
  hide it. It scales its two V axes by the source's aspect now, so the whole
  picture lands on the plinth undistorted and no crop is wanted. `--square` still
  cuts the centre out if you want the composition rather than the correction.

  WIDE. Once the aspect is honoured the texel density on both faces is the
  source's WIDTH times the stone's `scale`, and the height only decides how much
  slab there is before the pattern repeats. At the scale these stones use, 3000px
  of width lands one tile on 3000px of plate; under ~2000 the hairlines go soft.

  FLAT-LIT AND SQUARE-ON. What this pipeline knows how to remove is a constant
  veiling (`degloss`) - not a gradient, not a vignette, and not the shape of a
  softbox. Any of those is baked into the base colour and then lit a second time
  by Cycles, which is how a slab ends up with a bright patch that does not move
  when the light does. Same for perspective: a slab shot at an angle arrives with
  a foreshortening the block then foreshortens again.

  ALL STONE. No edges, no hands, no background, no watermark. The maps are made
  seamless across U by cross-fading the left tenth into the right tenth, so those
  two strips should look like each other.

  DARK GROUND, LIGHT VEINS. The mineral split is a threshold on luma and on r-b:
  dark is the ground, light is calcite, light and warm is the gold. Feed it a
  white Carrara and nearly every pixel classifies as calcite, at which point the
  `deep` grade - which crushes the ground and lifts the calcite - has almost
  nothing to crush. This says so when it sees it, and `--grade asis` is the
  honest setting for a light stone.

WHAT IT WRITES IS FOUR STONES, NOT ONE, and they are the four gemini-* recipes
worth having: `<name>-noir`, `<name>-noir-fine`, `<name>-screen` and
`<name>-screen-fine`. Deep grade, every map wired, no coat, dark room - the shape
docs/agents/plinth-marble.md says to use - crossed with the two questions a new
photograph actually raises:

    the room    `noir` is the dark room. `screen` is the same room with the
                Frame standing in it as a real emitter, which is the brightest
                object in the composition and had never been allowed to light
                the stone. Which one wins is not predictable from the photograph.
    the figure  plain lays one slab across the block, `-fine` lays two, so the
                veining halves in size and reads finer and more jewel-like.
                `scale` is the strongest control there is and it is not a quality
                setting - it is how big the rock is, and a photograph with big
                figure in it and one with small figure in it want opposite
                answers.

Four stones is four bakes in one Blender run, about a minute. `--styles noir` if
you only want the one. Every field has a flag as well, and they override whatever
the style said - all of them are documented in PHOTO_CANDIDATES in build-slab.py.

WHAT IS COMMITTED AND WHAT IS NOT. The entry and the plate are; the maps and your
photograph are not, the same way the gemini-* stones' are not (see .gitignore).
So the stone survives in a fresh checkout and can be looked at there, and can
only be RE-BAKED from a tree that still has the photograph. Keep it somewhere.
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import importlib

# The maps builder is `build-portoro-maps`, which is not an identifier, so it
# cannot be reached by `import`. Nothing is wrong with the name - every build
# script in this repository is hyphenated because they are run rather than
# imported - and this is the one place that has to say so out loud.
maps_mod = importlib.import_module("build-portoro-maps")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
MAPS_DIR = os.path.join(HERE, "maps")
STONES_DIR = os.path.join(HERE, "stones")
SIDECAR = os.path.join(HERE, "slab.json")
PLATES = os.path.join(ROOT, "portfolio", "img", "tex")
BUILD_SLAB = os.path.join(HERE, "build-slab.py")

NAME_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")

# ---------------------------------------------------------------------------
# the styles
# ---------------------------------------------------------------------------
# Each is an existing PHOTO_CANDIDATES entry with the gemini taken out of it, so
# a stone added here is comparable with one already in the strip rather than
# being a fifth thing tuned differently. `screen-fine` is the one cross that
# build-slab.py does not carry - there is no `gemini-screen-fine` - and it is
# here because the two questions are independent: which room is better lit and
# which figure size suits the photograph have nothing to say to each other.
#
# The suffix is the key, and `<name>-noir` rather than a bare `<name>` for the
# same reason the built-ins are named that way: the room is not the default state
# of the stone, it is a choice, and a name that does not say which room it was
# rendered in is a name that stops meaning anything the moment a second room
# exists.
STYLES = {
    "noir": {
        "note": "one slab across the block, dark room",
        "scale": 0.84, "offset": 0.40, "bump": (0.22, 0.00035), "sss": 0.65,
        "coat": (0.0, 0.0), "rough": 1.0, "room": "noir",
    },
    "noir-fine": {
        "note": "two slabs across - fine figure, dark room",
        "scale": 1.75, "offset": 0.30, "bump": (0.22, 0.00022), "sss": 0.60,
        "coat": (0.0, 0.0), "rough": 1.0, "room": "noir",
    },
    "screen": {
        "note": "one slab across, dark room with the Frame lighting it",
        "scale": 0.84, "offset": 0.40, "bump": (0.22, 0.00035), "sss": 0.65,
        "coat": (0.0, 0.0), "rough": 1.0, "room": "screen",
    },
    "screen-fine": {
        "note": "fine figure, dark room with the Frame lighting it",
        "scale": 1.75, "offset": 0.30, "bump": (0.22, 0.00022), "sss": 0.60,
        "coat": (0.0, 0.0), "rough": 1.0, "room": "screen",
    },
}

# Under this much source WIDTH the front face is interpolating rather than
# resolving - see WHAT MAKES A GOOD SOURCE, and note that it is the width alone,
# because the aspect correction makes both axes carry width-times-scale texels
# per model unit. A warning and not an error: a soft stone is a look, and it is
# not this script's business to refuse one.
SOFT_PX = 2000
# ...and over this there is nothing left to resolve, so the pixels are only cost:
# one tile of the source lands on 3000px of plate at the scale these stones use,
# and the maps are written uncompressed. A 5300px square photograph writes 168MB
# of PNG for a plate that cannot show any of it. Downscale only - `--size 0`
# keeps whatever the source is, and nothing here ever upscales.
CAP_PX = 3000
# The mineral split this pipeline is built around is mostly ground. Far off that
# and the grades are being asked to do something they were not fitted for.
THIN_GROUND = 0.55


def find_blender(explicit):
    """The Blender to bake with: --blender, then $BLENDER, then PATH, then the
    newest one Windows installed. Returns None rather than guessing wrong, and
    the caller then prints the command instead of running it."""
    for c in (explicit, os.environ.get("BLENDER"), shutil.which("blender")):
        if c and os.path.isfile(c):
            return os.path.normpath(c)
    found = glob.glob("C:/Program Files/Blender Foundation/Blender */blender.exe")
    return os.path.normpath(sorted(found)[-1]) if found else None


def pick_val(override, styled):
    """The override if one was given, the style's own value otherwise. `is None`
    and not truthiness: --rough 0 and --sss 0 are meaningful settings, and 0 or
    styled would silently discard both."""
    return styled if override is None else override


def taken_names():
    """Every stone name already in use, from slab.json - which build-slab.py
    wrote and so knows about all three families - plus anything in stones/ that a
    bake has not caught up with yet. Read rather than imported because importing
    build-slab.py means importing bpy, and this script deliberately runs without
    Blender until the last step."""
    names = set()
    if os.path.isfile(SIDECAR):
        doc = json.load(open(SIDECAR, encoding="utf-8"))
        for f in ("candidates", "photo_candidates", "relit_candidates"):
            names |= set(doc.get(f) or {})
    names |= {os.path.basename(p)[:-5]
              for p in glob.glob(os.path.join(STONES_DIR, "*.json"))}
    return names


def main():
    ap = argparse.ArgumentParser(
        description=__doc__.splitlines()[0],
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="The overrides default to whatever the style says. See\n"
               "PHOTO_CANDIDATES in design/plinth/build-slab.py for what each one\n"
               "does and which of them are worth moving.")
    ap.add_argument("--src", required=True, help="the photograph")
    ap.add_argument("--name", required=True,
                    help="the stem the styles are named off: lowercase, digits "
                         "and dashes")
    ap.add_argument("--styles", default=",".join(STYLES),
                    help="which of %s to write (default: all four)"
                         % ", ".join(STYLES))
    ap.add_argument("--title", default=None,
                    help="the one-line description the tuner shows; the style's "
                         "own note is appended to it")
    ap.add_argument("--grade", default="deep", choices=sorted(maps_mod.GRADES),
                    help="which basecolor-*.png (default: deep)")
    ap.add_argument("--scale", type=float, default=None,
                    help="tiles per model unit; 0.84 lays one slab across the "
                         "plinth, 0.42 doubles the figure, 1.75 halves it")
    ap.add_argument("--offset", type=float, default=None,
                    help="where in the slab the block was cut from")
    ap.add_argument("--bump", type=float, nargs=2, default=None,
                    metavar=("STRENGTH", "DISTANCE"),
                    help="the height map's strength and distance; the distance "
                         "is tiny and has to be")
    ap.add_argument("--sss", type=float, default=None,
                    help="Subsurface Weight through the calcite mask")
    ap.add_argument("--coat", type=float, nargs=2, default=None,
                    metavar=("WEIGHT", "ROUGHNESS"),
                    help="a second specular lobe; off in the dark rooms, where "
                         "it lifts the black")
    ap.add_argument("--rough", type=float, default=None,
                    help="multiplies the roughness map; 0 pins it flat")
    ap.add_argument("--crack", action="store_true",
                    help="lay the procedural hairline network over the photo too")
    ap.add_argument("--room", default=None,
                    choices=("noir", "screen", "flat", "gallery"),
                    help="override the style's surround")
    ap.add_argument("--size", type=int, default=CAP_PX,
                    help="cap the longest edge at this (default: %d); 0 keeps "
                         "the source. Never upscales." % CAP_PX)
    ap.add_argument("--square", action="store_true",
                    help="centre-crop to a square first - a composition choice "
                         "now, not a correction; see the header")
    ap.add_argument("--replace", action="store_true",
                    help="rebuild a stone this script added before")
    ap.add_argument("--no-bake", action="store_true",
                    help="stop after the maps and the entry, and print the "
                         "Blender command instead of running it")
    ap.add_argument("--blender", default=None, help="path to blender.exe")
    args = ap.parse_args()

    name = args.name
    if not NAME_RE.match(name):
        sys.exit("`%s` is not a stone name - lowercase letters, digits and "
                 "dashes, starting with a letter or digit. It becomes a "
                 "filename, a JSON key and a URL." % name)
    styles = [s.strip() for s in args.styles.split(",") if s.strip()]
    unknown = [s for s in styles if s not in STYLES]
    if not styles or unknown:
        sys.exit("--styles takes any of %s%s"
                 % (", ".join(STYLES),
                    (" - not %s" % ", ".join(unknown)) if unknown else ""))
    keys = [name + "-" + s for s in styles]
    taken = taken_names()
    clash = [k for k in keys
             if k in taken and not (args.replace
                                    and os.path.isfile(os.path.join(STONES_DIR,
                                                                    k + ".json")))]
    if clash:
        sys.exit("already a stone: %s\n\nPick another --name, or pass --replace "
                 "to rebuild ones this script added before. Built-in stones "
                 "cannot be replaced this way: they are the table in "
                 "build-slab.py, and a JSON file that shadowed one would render "
                 "as something other than what that file documents."
                 % ", ".join(clash))
    if not os.path.isfile(args.src):
        sys.exit("missing %s" % args.src)

    # ---- 1. the maps -------------------------------------------------------
    # build_maps() resamples to whatever `size` it is handed, up or down; the cap
    # is applied here, against the edge that SURVIVES the crop, so that a square
    # cut out of a long photograph is measured as what it will be rather than as
    # what it was.
    from PIL import Image
    with Image.open(args.src) as probe:
        edge = min(probe.size) if args.square else max(probe.size)
    size = min(args.size, edge) if args.size else 0
    out = os.path.join(MAPS_DIR, name)
    print("== maps ==")
    st = maps_mod.build_maps(args.src, out, size, args.square)

    if st["w"] < SOFT_PX:
        print("\n! %dpx of width, and the plinth wants about %d - the fine "
              "structure\n  will be soft. Not fatal, and not fixable by "
              "resampling: it is not in the file." % (st["w"], SOFT_PX))
    if st["ground"] < THIN_GROUND:
        print("\n! ground %.0f%% / calcite %.0f%% / gold %.0f%%. This pipeline "
              "splits minerals by\n  luma, so a light stone classifies as almost "
              "all calcite and `deep` - which\n  crushes the ground to lift the "
              "veins - has little left to crush. Try\n  --grade asis."
              % (st["ground"] * 100, st["calcite"] * 100, st["gold"] * 100))

    # ---- 2. the entries ----------------------------------------------------
    # One JSON file per style, all four pointing at the one maps directory: the
    # maps are the photograph and the style is what is done with it, so building
    # them four times would be four identical copies of 50MB.
    #
    # `src` is the basename only. The absolute path is this machine's and would
    # be committed; the basename is what MISSING_ADDED_MAPS needs to be able to
    # name the photograph in a checkout that does not have it.
    base = args.title or os.path.splitext(os.path.basename(args.src))[0]
    os.makedirs(STONES_DIR, exist_ok=True)
    print("\n== entries ==")
    for style, key in zip(styles, keys):
        st_spec = STYLES[style]
        spec = {
            "title": "%s - %s" % (base, st_spec["note"]),
            "grade": args.grade,
            "scale": pick_val(args.scale, st_spec["scale"]),
            "offset": pick_val(args.offset, st_spec["offset"]),
            "bump": list(args.bump or st_spec["bump"]),
            "sss": pick_val(args.sss, st_spec["sss"]),
            "coat": list(args.coat or st_spec["coat"]),
            "rough": pick_val(args.rough, st_spec["rough"]),
            "crack": bool(args.crack),
            "room": args.room or st_spec["room"],
            # The maps are shared, so this is the stem and not the key.
            "maps": name,
            "src": os.path.basename(args.src),
        }
        path = os.path.join(STONES_DIR, key + ".json")
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            json.dump(spec, fh, indent=2)
            fh.write("\n")
        print("wrote %s" % os.path.relpath(path, ROOT))

    # ---- 3. the plates -----------------------------------------------------
    blender = find_blender(args.blender)
    cmd = [blender or "blender", "-b", "-P",
           os.path.relpath(BUILD_SLAB, ROOT), "--"] + keys
    shown = " ".join(('"%s"' % c if " " in c else c) for c in cmd)
    if args.no_bake or blender is None:
        if blender is None and not args.no_bake:
            print("\n! no blender found - pass --blender, or set $BLENDER.")
        print("\nbake them with:\n\n    %s\n" % shown)
        return
    print("\n== plates ==")
    r = subprocess.run(cmd, cwd=ROOT)
    if r.returncode != 0:
        sys.exit("blender exited %d - the maps and the entries are written, so "
                 "re-run this once it is fixed:\n\n    %s" % (r.returncode, shown))

    print("")
    for key in keys:
        plate = os.path.join(PLATES, "plinth-%s.webp" % key)
        if os.path.isfile(plate):
            print("%s  %.1f KB" % (os.path.relpath(plate, ROOT),
                                   os.path.getsize(plate) / 1024.0))
        else:
            print("! blender reported success and there is no plate at %s" % plate)
    print("\nreload the tuner - %s are in the strip, with their plates under them."
          % ", ".join("`%s`" % k for k in keys))


if __name__ == "__main__":
    main()
