"""Set PROJECTS in a face and measure it, in units of ITS OWN cap height.

Everything here is normalised to cap height, not to the em, because the cut
title's geometry is: the cap line is where the word is cut (--cue-show, 0.62 of
a cap) and the picture is fitted to the measure by width. Two faces that agree
on cap height and total width can still put their letters in different places,
and that difference -- in cap units -- is exactly the distance a morph travels.
"""
import os
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import RecordingPen

WORD = "PROJECTS"


def bez(p0, pts, t):
    P = [p0] + list(pts)
    while len(P) > 1:
        P = [((1-t)*a[0]+t*b[0], (1-t)*a[1]+t*b[1]) for a, b in zip(P, P[1:])]
    return P[0]


def mid(a, b):
    return ((a[0]+b[0])/2, (a[1]+b[1])/2)


def simplified(gs, name):
    """The glyph's outline resolved to simple, non-overlapping contours.

    Two different messes have to be cleaned up before two faces can be
    interpolated onto each other, and skia resolves both. Friz draws P and R as
    ONE self-intersecting contour, where the bowl's inner edge runs back into the
    stem instead of closing as a counter. And plenty of sans faces -- Outfit,
    Inter, Montserrat, Instrument Sans -- ship E as four OVERLAPPING rectangles
    and R as a bowl plus a separate leg, never booleaned, because nonzero fill
    draws the union anyway. Simplifying gives both sides the same thing: an outer
    contour and its counters, correctly wound, nothing overlapping, so P matches
    P and the counter matches the counter."""
    import pathops
    p = pathops.Path()
    gs[name].draw(p.getPen(glyphSet=gs))
    p.simplify(fix_winding=True, keep_starting_points=False)
    return p


def flatten(gs, name, n=24, simplify=True):
    """The glyph as closed polygons. n chords per curve is ample at this size.

    Handles the all-off-curve TrueType contour -- a circle drawn as four control
    points and no on-curve point at all, which fontTools signals by calling
    qCurveTo with a trailing None and NO preceding moveTo. Julius Sans One draws
    its O that way; without this the pen has no current point and the glyph
    throws rather than measuring."""
    rp = RecordingPen()
    if simplify: simplified(gs, name).draw(rp)
    else: gs[name].draw(rp)
    out, cur = [], None
    for op, args in rp.value:
        if op == "moveTo":
            cur = [args[0]]; out.append(cur)
        elif op == "lineTo":
            cur.append(args[0])
        elif op == "curveTo":
            p0 = cur[-1]
            for i in range(1, n+1):
                cur.append(bez(p0, list(args), i/n))
        elif op == "qCurveTo":
            pts = list(args)
            if pts[-1] is None:                       # contour closes on itself
                pts = pts[:-1]
                if cur is None:                       # ...and has no on-curve point
                    cur = [mid(pts[-1], pts[0])]; out.append(cur)
                pts = pts + [cur[0]]
            segs = [(pts[i], mid(pts[i], pts[i+1])) for i in range(len(pts)-2)]
            segs.append((pts[-2], pts[-1]))
            for ctrl, end in segs:
                p0 = cur[-1]
                for i in range(1, n+1):
                    cur.append(bez(p0, [ctrl, end], i/n))
        elif op in ("closePath", "endPath"):
            cur = None          # or the NEXT all-off-curve contour appends to this one
    return [c for c in out if len(c) > 2]


def scanline(polys, y):
    xs = []
    for c in polys:
        for a, b in zip(c, c[1:] + [c[0]]):
            if (a[1] <= y < b[1]) or (b[1] <= y < a[1]):
                xs.append(a[0] + (b[0]-a[0]) * (y-a[1]) / (b[1]-a[1]))
    xs.sort(); return xs


def instance(f, wght=None):
    if "fvar" not in f: return f
    from fontTools.varLib import instancer
    loc = {}
    for a in f["fvar"].axes:
        if a.axisTag == "wght":
            loc["wght"] = min(max(wght if wght else 400, a.minValue), a.maxValue)
        elif a.axisTag == "wdth":
            loc["wdth"] = min(max(100, a.minValue), a.maxValue)
        else:
            loc[a.axisTag] = a.defaultValue
    return instancer.instantiateVariableFont(f, loc, inplace=False, updateFontNames=False)


def kern_pairs(font, glyphs):
    if "GPOS" not in font: return {}
    gpos = font["GPOS"].table
    wanted = set(zip(glyphs, glyphs[1:])); found = {}
    for lookup in (gpos.LookupList.Lookup if gpos.LookupList else []):
        for sub in lookup.SubTable:
            if getattr(sub, "ExtSubTable", None) is not None:
                if sub.ExtensionLookupType != 2: continue
                sub = sub.ExtSubTable
            elif lookup.LookupType != 2: continue
            fmt = getattr(sub, "Format", None)
            try:
                if fmt == 1 and getattr(sub, "PairSet", None):
                    for first, ps in zip(sub.Coverage.glyphs, sub.PairSet):
                        for rec in ps.PairValueRecord:
                            p = (first, rec.SecondGlyph)
                            if p in wanted and rec.Value1 and rec.Value1.XAdvance:
                                found[p] = rec.Value1.XAdvance
                elif fmt == 2:
                    c1, c2 = sub.ClassDef1.classDefs, sub.ClassDef2.classDefs
                    cov = set(sub.Coverage.glyphs)
                    for a, b in wanted:
                        if a not in cov: continue
                        rec = sub.Class1Record[c1.get(a, 0)].Class2Record[c2.get(b, 0)]
                        if rec.Value1 and rec.Value1.XAdvance:
                            found[(a, b)] = rec.Value1.XAdvance
            except (AttributeError, IndexError):
                continue
    return found


def setword(path, wght=None, track_em=None, total=None, cap_units=1348.0):
    """Lay PROJECTS out, scaled so the cap height is `cap_units`.

    Exactly one of track_em (use this tracking) or total (solve for the tracking
    that makes the ink span this wide) must be given.
    """
    f = instance(TTFont(path, fontNumber=0, lazy=False), wght)
    upem = f["head"].unitsPerEm
    cmap = f.getBestCmap(); gs = f.getGlyphSet(); hmtx = f["hmtx"]
    names = [cmap[ord(c)] for c in WORD]

    polys = {c: flatten(gs, cmap[ord(c)]) for c in WORD}
    hp = flatten(gs, cmap[ord("H")])
    cap = max(p[1] for c in hp for p in c)          # drawn top of H, not OS/2
    k = cap_units / cap

    L = {}
    for c, n in zip(WORD, names):
        bp = BoundsPen(gs); gs[n].draw(bp)
        x0, y0, x1, y1 = bp.bounds
        L[c] = dict(lsb=x0*k, rsb=(hmtx[n][0]-x1)*k, w=(x1-x0)*k, adv=hmtx[n][0]*k,
                    top=y1*k, bot=y0*k)

    kern = {p: v*k for p, v in kern_pairs(f, names).items()}
    base = sum(L[c]["adv"] for c in WORD) + sum(kern.values()) - L["P"]["lsb"] - L["S"]["rsb"]
    if total is not None:
        track = (total - base) / 7.0
    else:
        track = track_em * upem * k
    span = base + 7 * track

    x = -L["P"]["lsb"]; box = {}; origin = {}
    for i, c in enumerate(WORD):
        origin[c] = x
        box[c] = (x + L[c]["lsb"], x + L[c]["lsb"] + L[c]["w"])
        x += L[c]["adv"]
        if i < 7: x += track + kern.get((names[i], names[i+1]), 0)

    # stroke weight: a scanline across I (or H) at half a cap. Not the ink width
    # of I -- Verdana's and Tahoma's capital I is serifed, and its ink box is the
    # serif, which reads as three times the actual stem.
    stem = None
    for c in ("I", "H", "E"):
        g = cmap.get(ord(c))
        if not g: continue
        xs = scanline(flatten(gs, g), cap * 0.5)
        if len(xs) >= 2: stem = (xs[1]-xs[0]) * k; break

    fam = f["name"].getDebugName(16) or f["name"].getDebugName(1) or os.path.basename(path)
    return dict(name=fam, upem=upem, cap_em=cap/upem, k=k, scale=k, span=span,
                track=track, track_em=track/k/upem, stem=stem, kerned=len(kern),
                box=box, origin=origin, polys=polys, L=L, wght=wght,
                cmap={c: cmap[ord(c)] for c in WORD}, path=path,
                ncontour={c: len(polys[c]) for c in WORD})
