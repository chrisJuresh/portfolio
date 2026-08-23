#!/usr/bin/env python3
"""Bake the cut title — the word PROJECTS at the foot of /portfolio — to outlines.

WHY THIS EXISTS. The word used to be text, set in Friz Quadrata and served as a
webfont from /fonts. It is now a picture of that text: one SVG path, no font,
nothing about the face left on the wire. Everything the page needs in order to
place it — where its cap line falls, how far its round letters overshoot, how
deep its J hangs — is a property of the outlines and is DERIVED here rather than
measured by eye. The script prints those constants at the end of a run; they are
the block of `--cut-*` numbers at the head of the cut-title section in
the Front Screen's own scoped block, and the two are only correct together.

A picture rather than a font is not a downgrade in quality. The output is vector
— the same Bezier outlines the rasteriser would have been handed — so it is
exact at every size and on every display, a 4K panel included. What is lost is
hinting, which does nothing at this size (the word is 60-90px of cap height,
where no face is hinted), and selectability, which is what was being traded away
on purpose.

RUNNING IT. Needs fontTools and the source face:

    python design/cut-title/build-cut-title.py

It writes src/sections/front-screen/assets/cut-title.svg, which the Section
imports with `?raw` and compiles into its own markup — so the picture is on
screen at first paint with no second request and no pop-in, and it is the ONLY
copy, so there is nothing for a re-bake to leave stale. `--out` puts it
somewhere else to look at first.

The face is NOT in this repository — it was removed along with everything else
that served it. Point --font at a local copy to re-bake; without one the file
already in the Section's assets/ is the artifact of record and this script is
the account of how it was made.

WHAT IT REPRODUCES. The old CSS set the word with `letter-spacing` and clipped it
to a box measured in `cap`. Both are baked in here:
  * tracking is applied as 7 gaps BETWEEN the 8 letters. CSS letter-spacing also
    adds an 8th step after the final S, which was white at the end of the line
    and is simply not drawn.
  * the viewBox is the word's INK — first ink to last ink, top of the tallest
    overshoot to the bottom of the J's hook. Not the em box and not the advance
    box, so the picture has no white edge of its own and CSS can put its edges
    exactly where it wants them.
  * kerning is checked, not assumed. The face has GPOS; if any of this word's
    seven pairs is in it the script says so and applies it.
"""

import argparse
import pathlib
import sys

from fontTools.pens.boundsPen import ControlBoundsPen, BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.misc.transform import Transform

WORD = "PROJECTS"
TRACK_EM = 0.02          # --cue-track, the tracking the word was set at
DECIMALS = 1             # 0.1 font unit at 2048/em = 0.005% of the em. Invisible.

REPO = pathlib.Path(__file__).resolve().parents[2]
DEFAULT_FONT = REPO / "fonts" / "frizquadrata-regular-fixedmetrics.woff2"
OUT_SVG = REPO / "src" / "sections" / "front-screen" / "assets" / "cut-title.svg"


def kern_pairs(font, glyphs):
    """Every pair of `glyphs` that the face's GPOS actually kerns, in units.

    Only the flat PairPos lookups reachable from `kern`, which is all this face
    has and all a run of capitals could use. Returns {} for a face with no
    kerning rather than pretending there is none."""
    if "GPOS" not in font:
        return {}
    gpos = font["GPOS"].table
    wanted = set(zip(glyphs, glyphs[1:]))
    found = {}

    lookups = gpos.LookupList.Lookup if gpos.LookupList else []
    for lookup in lookups:
        for sub in lookup.SubTable:
            fmt = getattr(sub, "Format", None)
            if getattr(sub, "LookupType", lookup.LookupType) != 2 and lookup.LookupType != 2:
                continue
            if fmt == 1 and getattr(sub, "PairSet", None):
                coverage = sub.Coverage.glyphs
                for first, pairset in zip(coverage, sub.PairSet):
                    for rec in pairset.PairValueRecord:
                        pair = (first, rec.SecondGlyph)
                        if pair in wanted and rec.Value1 and rec.Value1.XAdvance:
                            found[pair] = rec.Value1.XAdvance
            elif fmt == 2:
                c1 = sub.ClassDef1.classDefs
                c2 = sub.ClassDef2.classDefs
                covered = set(sub.Coverage.glyphs)
                for first, second in wanted:
                    if first not in covered:
                        continue
                    rec = sub.Class1Record[c1.get(first, 0)].Class2Record[c2.get(second, 0)]
                    if rec.Value1 and rec.Value1.XAdvance:
                        found[(first, second)] = rec.Value1.XAdvance
    return found


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--font", type=pathlib.Path, default=DEFAULT_FONT,
                    help="the source face (default: the one this was baked from)")
    ap.add_argument("--out", type=pathlib.Path, default=OUT_SVG,
                    help="where the picture is written (default: the Section's assets/)")
    args = ap.parse_args()

    if not args.font.exists():
        sys.exit(f"no such font: {args.font}\n"
                 "The face is not kept in this repository. Pass --font a local copy.")

    font = TTFont(args.font)
    upem = font["head"].unitsPerEm
    cap = font["OS/2"].sCapHeight
    cmap = font.getBestCmap()
    glyphset = font.getGlyphSet()
    hmtx = font["hmtx"]

    glyphs = [cmap[ord(ch)] for ch in WORD]
    track = TRACK_EM * upem
    kerns = kern_pairs(font, glyphs)

    # ---- lay the word out, in font units -----------------------------------
    pen_x = 0.0
    placed = []                      # (glyph name, its origin x)
    for i, name in enumerate(glyphs):
        placed.append((name, pen_x))
        pen_x += hmtx[name][0]
        if i < len(glyphs) - 1:      # 7 gaps, not 8 — see the docstring
            pen_x += track + kerns.get((name, glyphs[i + 1]), 0)

    # ---- its ink box, which is the picture's box ---------------------------
    ink = [None] * 4                 # xMin, yMin, xMax, yMax
    for name, x in placed:
        bp = BoundsPen(glyphset)
        glyphset[name].draw(bp)
        if bp.bounds is None:
            continue
        x0, y0, x1, y1 = bp.bounds
        box = (x0 + x, y0, x1 + x, y1)
        ink = box if ink[0] is None else (min(ink[0], box[0]), min(ink[1], box[1]),
                                          max(ink[2], box[2]), max(ink[3], box[3]))
    ink_x0, ink_y0, ink_x1, ink_y1 = ink
    width = ink_x1 - ink_x0
    height = ink_y1 - ink_y0

    # ---- draw it, baking the flip and the origin into the coordinates ------
    # y-down, ink-left at x=0, ink-top at y=0. Baked rather than left to a
    # transform attribute so the file says what it means with nothing to apply.
    paths = []
    for name, x in placed:
        pen = SVGPathPen(glyphset, ntos=lambda v: f"{round(v, DECIMALS):g}")
        glyphset[name].draw(TransformPen(pen, Transform(1, 0, 0, -1, x - ink_x0, ink_y1)))
        d = pen.getCommands()
        if d:
            paths.append(d)
    d = "".join(paths)

    def r(v):
        return f"{round(v, DECIMALS):g}"

    # `currentColor` is the whole of the theming: the picture takes the ink
    # colour off the link it sits in, so light and dark need one file, not two,
    # and the hover state costs nothing. aria-hidden because the link already
    # carries the word as real text beside it — see FrontScreen.astro.
    svg = (
        f'<svg class="cut-title__word" xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {r(width)} {r(height)}" fill="currentColor" aria-hidden="true">'
        f'<path d="{d}"/></svg>'
    )

    # ---- write the picture -------------------------------------------------
    # The Section parses the viewBox out of this file and states it as the
    # picture's own width and height, so the ratio is one number here and
    # nothing restates it. See FrontScreen.astro.
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(svg + "\n", encoding="utf-8", newline="\n")

    # ---- the constants the Front Screen's own block has to agree with ------
    # All as fractions of the picture's WIDTH, because width is the one dimension
    # CSS sets: the word is fitted to a measure and everything else follows.
    cap_top = ink_y1 - cap                       # distance from ink top to the cap line
    print(f"wrote {args.out.relative_to(REPO)}"
          f"  ({len(svg.encode()):,} bytes of markup)")
    print()
    print(f"  face          {font['name'].getDebugName(4)}  ({upem}/em, cap {cap})")
    print(f"  kerned pairs  {kerns if kerns else 'none — no pair of this word is in GPOS'}")
    print(f"  advances      {sum(hmtx[g][0] for g in glyphs) / upem:.4f}em"
          f"  + 7 x {TRACK_EM}em tracking")
    print(f"  ink           {width / upem:.4f}em wide, {height / upem:.4f}em tall")
    print()
    box = sum(hmtx[g][0] for g in glyphs) + 8 * track   # CSS adds a trailing step
    print("  paste into the .front-screen block in FrontScreen.astro:")
    print(f"    --front-screen-cut-cap-share: {cap / width:.6f};")
    print(f"    --front-screen-cut-overshoot: {cap_top / width:.6f};")
    print(f"    --front-screen-cut-ink:       {100 * width / box:.4f}cqw;")
    print(f"    --front-screen-cut-lead:      {100 * ink_x0 / box:.4f}cqw;")
    print()
    print(f"  and, for the record, the picture itself:")
    print(f"    ratio            {r(width)} / {r(height)}   (the viewBox, which the Section reads)")
    print(f"    ink below the baseline, per unit of width   {-ink_y0 / width:.6f}")


if __name__ == "__main__":
    main()
