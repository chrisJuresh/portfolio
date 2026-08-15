"""The shortlist, and the one place a face's blurb or weight-fit lives.

Both build scripts read this: build-specimen.py, which makes the page you choose
from, and build-site.py, which writes the chosen one into portfolio/cut-morph.js.
"""
import time, sys, warnings
warnings.filterwarnings("ignore")
import lib, morph

CAP = 1348.0
N = 128

CURATED = [
    ("fsf/satoshi",           "Fontshare", "grotesk",  "The default of the current portfolio look — neutral, tight, slightly warm."),
    ("fsf/switzer",           "Fontshare", "grotesk",  "Helvetica's proportions with the coldness taken out. Enormously used."),
    ("fsf/generalsans",       "Fontshare", "grotesk",  "Geometric skeleton, humanist details. Reads well very large."),
    ("fsf/cabinetgrotesk",    "Fontshare", "display",  "Studio-grotesk with cut terminals — built to be set as a headline."),
    ("fsf/clashdisplay",      "Fontshare", "display",  "The display face of this whole aesthetic. Tight, confident, a little brutal."),
    ("fsf/supreme",           "Fontshare", "grotesk",  "Quirky neo-grotesk; the R and S have real personality at size."),
    ("fsf/ranade",            "Fontshare", "display",  "High contrast for a sans. Closest here to a serif's modulation."),
    ("fsf/nippo",             "Fontshare", "display",  "Geometric, wide, low-contrast. Very architectural."),
    ("fsf/chillax",           "Fontshare", "soft",     "Rounded geometric, and by some way the closest of all of them to Friz."),
    ("fsf/technor",           "Fontshare", "display",  "Squarish and technical — the most opinionated thing in this list."),
    ("fsf/bespokesans",       "Fontshare", "grotesk",  "Compact grotesk with flat-sided bowls."),
    ("fsf/pally",             "Fontshare", "soft",     "Humanist with a calligraphic memory; the closest here in spirit to Friz."),
    ("gf/geist",              "OFL",       "grotesk",  "Vercel's face. Precise, contemporary, engineered rather than drawn."),
    ("gf/instrumentsans",     "OFL",       "grotesk",  "Everywhere in 2024–25 design work, and deservedly."),
    ("gf/hostgrotesk",        "OFL",       "grotesk",  "Newer Google release; a clean editorial grotesk."),
    ("gf/funneldisplay",      "OFL",       "display",  "Subtly flared stems — the only face here that nods at Friz's wedges."),
    ("gf/bricolagegrotesque", "OFL",       "display",  "Deliberately irregular. The most art-directed option that is still readable."),
    ("gf/spacegrotesk",       "OFL",       "display",  "The awwwards workhorse. Mono-derived, quirky R."),
    ("gf/syne",               "OFL",       "display",  "Art-institution face; the widths fight each other on purpose."),
    ("gf/gabarito",           "OFL",       "display",  "Friendly geometric with a strong single-storey feel at scale."),
    ("gf/anybody",            "OFL",       "display",  "Width axis built in — the most flexible here if the measure changes."),
    ("gf/unbounded",          "OFL",       "display",  "Very wide, very geometric. Closest to Friz's wide O of anything here."),
    ("gf/sora",               "OFL",       "grotesk",  "Low-contrast geometric with generous round caps."),
    ("gf/outfit",             "OFL",       "geometric","Pure geometric — circles and lines, nothing else."),
]


def fit_weight(path, target_stem):
    """The weight whose stem matches Friz's, probed without building instances."""
    from fontTools.ttLib import TTFont
    f = TTFont(path, fontNumber=0, lazy=True)
    ax = {a.axisTag: a for a in f["fvar"].axes} if "fvar" in f else {}
    if "wght" not in ax: return None
    lo, hi = ax["wght"].minValue, ax["wght"].maxValue
    cmap = f.getBestCmap()

    def probe(w):
        loc = {a.axisTag: a.defaultValue for a in f["fvar"].axes}
        loc["wght"] = w
        if "wdth" in ax: loc["wdth"] = min(max(100, ax["wdth"].minValue), ax["wdth"].maxValue)
        gs = f.getGlyphSet(location=loc)
        cap = max(p[1] for c in lib.flatten(gs, cmap[ord("H")], simplify=False) for p in c)
        for ch in ("I", "H", "E"):
            g = cmap.get(ord(ch))
            if not g: continue
            xs = lib.scanline(lib.flatten(gs, g, simplify=False), cap*0.5)
            if len(xs) >= 2: return (xs[1]-xs[0]) / cap
        return None

    pts = [(w, probe(w)) for w in (lo, (lo+hi)/2, hi)]
    pts = [(w, s) for w, s in pts if s]
    if len(pts) < 2: return None
    for (w0, s0), (w1, s1) in zip(pts, pts[1:]):
        if (s0-target_stem)*(s1-target_stem) <= 0 and s1 != s0:
            return round(w0 + (w1-w0)*(target_stem-s0)/(s1-s0))
    return round(lo if abs(pts[0][1]-target_stem) < abs(pts[-1][1]-target_stem) else hi)


def reference():
    """Friz, and the frame every face is fitted into."""
    friz = lib.setword("friz/FrizQuadrataStd.ttf", track_em=0.02)
    top = max(p[1] for ch in lib.WORD for c in friz["polys"][ch] for p in c)
    bot = min(p[1] for ch in lib.WORD for c in friz["polys"][ch] for p in c)
    return friz, top, bot


def build_all(friz, top, n=N, verbose=True):
    FW = {c: (friz["box"][c][1]-friz["box"][c][0])/CAP for c in lib.WORD}
    FC = {c: (friz["box"][c][1]+friz["box"][c][0])/2/CAP for c in lib.WORD}
    fstem = friz["stem"]/CAP
    out = []
    for path, src, kind, blurb in CURATED:
        t0 = time.time()
        f = path + ".ttf"
        try:
            w = fit_weight(f, fstem)
            m = lib.setword(f, wght=w, total=friz["span"])
            letters = morph.build(friz, m, top, n=n)
            true = morph.true_path(m, top)
        except Exception as e:
            print("FAIL", path, type(e).__name__, e, file=sys.stderr); continue
        W = {c: (m["box"][c][1]-m["box"][c][0])/CAP for c in lib.WORD}
        C = {c: (m["box"][c][1]+m["box"][c][0])/2/CAP for c in lib.WORD}
        dw = {c: W[c]-FW[c] for c in lib.WORD}
        dW = sum(abs(v) for v in dw.values())/8
        dC = sum(abs(C[c]-FC[c]) for c in lib.WORD)/8
        out.append(dict(
            slug=path.split("/")[1], name=m["name"].replace(" Variable", ""),
            src=src, kind=kind, blurb=blurb, wght=w, stem=m["stem"]/CAP,
            track_em=m["track_em"], kerned=m["kerned"], shaper=m["shaper"],
            Ocap=W["O"], EO=W["E"]/W["O"], dW=dW, dC=dC, score=dW+dC, dw=dw,
            letters=[dict(ch=l["ch"], a=l["a"], b=l["b"], t=true[l["ch"]]) for l in letters],
        ))
        if verbose:
            print(f"{out[-1]['name'][:26]:26} {src:9} wght {str(w):>4}  "
                  f"score {dW+dC:.3f}  {time.time()-t0:.1f}s")
    return out
