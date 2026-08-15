"""Rank every candidate by how far a morph from Friz would have to travel.

Each face is set to Friz's cap height and to Friz's total ink width -- the two
things the cut title fixes -- by solving for its tracking. What is left is
proportion: how wrong each letter's ink WIDTH is, and how far its ink CENTRE
sits from where Friz put it. Both in cap units, both directly the distance the
animation moves.

Variable faces are first pinned to the weight whose stem matches Friz's 0.155
cap, so a face is never penalised for shipping its default at 400 when 500 is
the cut that matches. Static faces are measured as they are.
"""
import glob, json, os, sys, warnings
import lib

warnings.filterwarnings("ignore")
CAP = 1348.0
FRIZ = lib.setword("friz/FrizQuadrataStd.ttf", track_em=0.02)
FW = {c: (FRIZ["box"][c][1]-FRIZ["box"][c][0])/CAP for c in lib.WORD}
FC = {c: (FRIZ["box"][c][1]+FRIZ["box"][c][0])/2/CAP for c in lib.WORD}
FSTEM = FRIZ["stem"]/CAP
TOTAL = FRIZ["span"]


def fit_weight(path):
    """The wght whose stem matches Friz's, for a face that has the axis.

    Probed through getGlyphSet(location=...), which applies the gvar deltas for
    one location without building a whole instance -- three probes this way cost
    less than one instancer run, and stem width is near enough linear in wght to
    solve from them."""
    from fontTools.ttLib import TTFont
    f = TTFont(path, fontNumber=0, lazy=True)
    ax = {a.axisTag: a for a in f["fvar"].axes} if "fvar" in f else {}
    if "wght" not in ax: return None
    lo, hi = ax["wght"].minValue, ax["wght"].maxValue
    cmap = f.getBestCmap()

    def probe(w):
        base = {a.axisTag: a.defaultValue for a in f["fvar"].axes}
        base["wght"] = w
        if "wdth" in ax: base["wdth"] = min(max(100, ax["wdth"].minValue), ax["wdth"].maxValue)
        gs = f.getGlyphSet(location=base)
        cap = max(p[1] for c in lib.flatten(gs, cmap[ord("H")]) for p in c)
        for ch in ("I", "H", "E"):
            g = cmap.get(ord(ch))
            if not g: continue
            xs = lib.scanline(lib.flatten(gs, g), cap * 0.5)
            if len(xs) >= 2: return (xs[1]-xs[0]) / cap
        return None

    pts = [(w, probe(w)) for w in (lo, (lo+hi)/2, hi)]
    pts = [(w, s) for w, s in pts if s]
    if len(pts) < 2: return None
    # piecewise-linear solve for the weight whose stem is Friz's
    for (w0, s0), (w1, s1) in zip(pts, pts[1:]):
        if (s0 - FSTEM) * (s1 - FSTEM) <= 0 and s1 != s0:
            return round(w0 + (w1 - w0) * (FSTEM - s0) / (s1 - s0))
    return round(lo if abs(pts[0][1]-FSTEM) < abs(pts[-1][1]-FSTEM) else hi)


rows = []
files = sorted(glob.glob("gf/*.ttf"))
LOCAL = ["Candara","Corbel","segoeui","segoeuisl","trebuc","framd","verdana",
         "tahoma","arial","calibri","l_10646","gadugi","bahnschrift","micross"]
files += [f"C:/Windows/Fonts/{n}.ttf" for n in LOCAL]

for p in files:
    try:
        w = fit_weight(p)
        m = lib.setword(p, wght=w, total=TOTAL)
    except Exception as e:
        print("skip", os.path.basename(p), type(e).__name__, e, file=sys.stderr); continue
    W = {c: (m["box"][c][1]-m["box"][c][0])/CAP for c in lib.WORD}
    C = {c: (m["box"][c][1]+m["box"][c][0])/2/CAP for c in lib.WORD}
    dw = {c: W[c]-FW[c] for c in lib.WORD}
    dc = {c: C[c]-FC[c] for c in lib.WORD}
    rows.append(dict(
        name=m["name"], file=p, local=p.startswith("C:/Windows"), wght=w,
        stem=m["stem"]/CAP, track_em=m["track_em"], kerned=m["kerned"],
        cap_em=m["cap_em"], ncontour=m["ncontour"],
        W=W, C=C, dw=dw, dc=dc,
        dW=sum(abs(v) for v in dw.values())/8, dWmax=max(abs(v) for v in dw.values()),
        dC=sum(abs(v) for v in dc.values())/8, dCmax=max(abs(v) for v in dc.values()),
        Ocap=W["O"], EO=W["E"]/W["O"],
        dstem=abs(m["stem"]/CAP - FSTEM),
    ))

for r in rows: r["score"] = r["dW"] + r["dC"]
rows.sort(key=lambda r: r["score"])
json.dump(dict(friz=dict(W=FW, C=FC, stem=FSTEM, span=TOTAL, cap_em=FRIZ["cap_em"]),
               rows=rows), open("ranked.json", "w"), indent=1)

print(f"{'#':>3} {'face':30} {'score':>6} {'dW':>6} {'dWmx':>6} {'dC':>6} {'dCmx':>6} "
      f"{'wght':>4} {'stem':>5} {'trk/em':>7} {'O/cap':>6} {'E/O':>5} {'krn':>3}")
for i, r in enumerate(rows, 1):
    print(f"{i:3} {'*' if r['local'] else ' '}{r['name'][:29]:29} {r['score']:6.3f} "
          f"{r['dW']:6.3f} {r['dWmax']:6.3f} {r['dC']:6.3f} {r['dCmax']:6.3f} "
          f"{(r['wght'] or 0):4d} {r['stem']:5.3f} {r['track_em']:+7.4f} "
          f"{r['Ocap']:6.3f} {r['EO']:5.3f} {r['kerned']:3d}")
print(f"\n    {'FRIZ QUADRATA STD':29} {'--':>6} {'--':>6} {'--':>6} {'--':>6} {'--':>6} "
      f"{'--':>4} {FSTEM:5.3f} {0.02:+7.4f} {FW['O']:6.3f} {FW['E']/FW['O']:5.3f}   0")
