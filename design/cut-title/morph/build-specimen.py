"""Build the specimen data for the curated set: metrics, tween ends, true ends.

The first pass ranked 108 faces by how little the morph had to move. This one is
chosen the other way round -- these are faces worth setting a title in -- and the
measurements come along so the choice is informed rather than blind.
"""
import base64, json, subprocess, sys, time, warnings
warnings.filterwarnings("ignore")
import lib, morph

CAP = 1348.0
N = 128

CURATED = [
    # slug, where it comes from, one line on why it is here
    ("fsf/satoshi",            "Fontshare", "grotesk", "The default of the current portfolio look — neutral, tight, slightly warm."),
    ("fsf/switzer",            "Fontshare", "grotesk", "Helvetica's proportions with the coldness taken out. Enormously used."),
    ("fsf/generalsans",        "Fontshare", "grotesk", "Geometric skeleton, humanist details. Reads well very large."),
    ("fsf/cabinetgrotesk",     "Fontshare", "display", "Studio-grotesk with cut terminals — built to be set as a headline."),
    ("fsf/clashdisplay",       "Fontshare", "display", "The display face of this whole aesthetic. Tight, confident, a little brutal."),
    ("fsf/supreme",            "Fontshare", "grotesk", "Quirky neo-grotesk; the R and S have real personality at size."),
    ("fsf/ranade",             "Fontshare", "display", "High contrast for a sans. Closest here to a serif's modulation."),
    ("fsf/nippo",              "Fontshare", "display", "Geometric, wide, low-contrast. Very architectural."),
    ("fsf/chillax",            "Fontshare", "soft",    "Rounded geometric. Softens the cut edge rather than sharpening it."),
    ("fsf/technor",            "Fontshare", "display", "Squarish and technical — the most opinionated thing in this list."),
    ("fsf/bespokesans",        "Fontshare", "grotesk", "Compact grotesk with flat-sided bowls."),
    ("fsf/pally",              "Fontshare", "soft",    "Humanist with a calligraphic memory; the closest here in spirit to Friz."),
    ("gf/geist",               "OFL",       "grotesk", "Vercel's face. Precise, contemporary, engineered rather than drawn."),
    ("gf/instrumentsans",      "OFL",       "grotesk", "Everywhere in 2024–25 design work, and deservedly."),
    ("gf/hostgrotesk",         "OFL",       "grotesk", "Newer Google release; a clean editorial grotesk."),
    ("gf/funneldisplay",       "OFL",       "display", "Subtly flared stems — the only face here that nods at Friz's wedges."),
    ("gf/bricolagegrotesque",  "OFL",       "display", "Deliberately irregular. The most art-directed option that is still readable."),
    ("gf/spacegrotesk",        "OFL",       "display", "The awwwards workhorse. Mono-derived, quirky g and R."),
    ("gf/syne",                "OFL",       "display", "Art-institution face; the widths fight each other on purpose."),
    ("gf/gabarito",            "OFL",       "display", "Friendly geometric with a strong single-storey feel at scale."),
    ("gf/anybody",             "OFL",       "display", "Width axis built in — the most flexible thing here if the measure changes."),
    ("gf/unbounded",           "OFL",       "display", "Very wide, very geometric. Closest to Friz's wide O of anything here."),
    ("gf/sora",                "OFL",       "grotesk", "Low-contrast geometric with generous round caps."),
    ("gf/outfit",              "OFL",       "geometric","Pure geometric — circles and lines, nothing else."),
]


def fit_weight(path, target_stem):
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


friz = lib.setword("friz/FrizQuadrataStd.ttf", track_em=0.02)
TOP = max(p[1] for ch in lib.WORD for c in friz["polys"][ch] for p in c)
BOT = min(p[1] for ch in lib.WORD for c in friz["polys"][ch] for p in c)
FSTEM = friz["stem"]/CAP
FW = {c: (friz["box"][c][1]-friz["box"][c][0])/CAP for c in lib.WORD}
FC = {c: (friz["box"][c][1]+friz["box"][c][0])/2/CAP for c in lib.WORD}
friz_true = morph.true_path(friz, TOP)

faces = []
for path, src, kind, blurb in CURATED:
    t0 = time.time()
    f = path + ".ttf"
    try:
        w = fit_weight(f, FSTEM)
        m = lib.setword(f, wght=w, total=friz["span"])
        letters = morph.build(friz, m, TOP, n=N)
        true = morph.true_path(m, TOP)
    except Exception as e:
        print("FAIL", path, type(e).__name__, e, file=sys.stderr); continue
    W = {c: (m["box"][c][1]-m["box"][c][0])/CAP for c in lib.WORD}
    C = {c: (m["box"][c][1]+m["box"][c][0])/2/CAP for c in lib.WORD}
    dw = {c: W[c]-FW[c] for c in lib.WORD}
    dC = sum(abs(C[c]-FC[c]) for c in lib.WORD)/8
    dW = sum(abs(v) for v in dw.values())/8
    faces.append(dict(
        slug=path.split("/")[1], name=m["name"], src=src, kind=kind, blurb=blurb,
        wght=w, stem=m["stem"]/CAP, track_em=m["track_em"], kerned=m["kerned"],
        Ocap=W["O"], EO=W["E"]/W["O"], dW=dW, dC=dC, score=dW+dC, dw=dw,
        letters=[dict(ch=l["ch"], a=l["a"], b=l["b"], t=true[l["ch"]]) for l in letters],
    ))
    print(f"{m['name'][:26]:26} {src:9} wght {str(w):>4}  score {dW+dC:.3f}  "
          f"{round(sum(len(l['a'])+len(l['b']) for l in letters)/1024)}KB  {time.time()-t0:.1f}s")

TEXT = ("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        "\u2019\u2014\u2013 .,:;!?()[]/%+-\u00d7\u00b7\u2192\u2192*#&'\"@_=<>|\u0394")


def subset(src, out_name):
    subprocess.run([sys.executable, "-m", "fontTools.subset", src, f"--text={TEXT}",
                    "--flavor=woff2", "--no-hinting",
                    "--layout-features=kern,liga,clig,tnum",
                    f"--output-file={out_name}"], check=True)
    return base64.b64encode(open(out_name, "rb").read()).decode()


page = dict(
    viewBox=f"0 0 {friz['span']:g} {TOP-BOT:g}",
    friz={ch: friz_true[ch] for ch in lib.WORD},
    faces=faces,
    frizmeta=dict(stem=FSTEM, O=FW["O"], EO=FW["E"]/FW["O"], span=friz["span"]),
    fonts=dict(
        display=subset("C:/Users/Chris/Desktop/portfolio/fonts/spectral-regular.woff2", "_d.woff2"),
        body=subset("gf/instrumentsans.ttf", "_b.woff2")),
)
json.dump(page, open("page2.json", "w"), separators=(",", ":"))
print("\npage2.json", round(len(json.dumps(page, separators=(',', ':')))/1024), "KB",
      "|", len(faces), "faces")
