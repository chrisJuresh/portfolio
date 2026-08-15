"""Check the word's spacing against HarfBuzz, the reference shaper.

The layout in lib.py reads GPOS PairPos lookups directly and adds the values it
finds. That is not the same thing as shaping: it does not know which feature a
lookup belongs to, so a PairPos lookup that is NOT in `kern` -- capital spacing,
distances, a lookup only reachable under another script -- would be applied
anyway; and it cannot see kerning done contextually. HarfBuzz knows both. If the
two agree on every pair of every face, the plates carry each face's own kerning.
"""
import io, json, warnings
warnings.filterwarnings("ignore")
import uharfbuzz as hb
from fontTools.ttLib import TTFont
import lib

WORD = "PROJECTS"


def shaped_advances(path, wght):
    """Per-glyph advances as HarfBuzz lays the word out, in font units."""
    f = lib.instance(TTFont(path, fontNumber=0, lazy=False), wght)
    buf = io.BytesIO(); f.save(buf)
    face = hb.Face(buf.getvalue()); font = hb.Font(face)
    font.scale = (face.upem, face.upem)
    b = hb.Buffer(); b.add_str(WORD); b.guess_segment_properties()
    hb.shape(font, b, {"kern": True})
    return [p.x_advance for p in b.glyph_positions], face.upem, f


def mine(path, wght):
    """The same, as lib.py computes it: advance plus whatever kern it found."""
    m = lib.setword(path, wght=wght, track_em=0.0, cap_units=None or 1348.0)
    return m


faces = json.load(open("page2.json"))["faces"]
print(f"{'face':24} {'pairs':>5} {'HB kern (units/1000em)':>34}   verdict")
bad = []
for fc in faces:
    p = ("fsf/" if fc["src"] == "Fontshare" else "gf/") + fc["slug"] + ".ttf"
    adv, upem, inst = shaped_advances(p, fc["wght"])
    cmap = inst.getBestCmap(); hmtx = inst["hmtx"]
    names = [cmap[ord(c)] for c in WORD]
    plain = [hmtx[n][0] for n in names]
    hbk = [round((a - b) / upem * 1000) for a, b in zip(adv, plain)]

    # what lib.py extracts, in the same units
    mk = lib.kern_pairs(inst, names)
    mine_k = [round(mk.get((names[i], names[i+1]), 0) / upem * 1000) for i in range(7)] + [0]

    ok = hbk == mine_k
    if not ok: bad.append((fc["name"], hbk, mine_k))
    print(f"{fc['name'][:23]:24} {fc['kerned']:5} {str(hbk):>34}   {'match' if ok else 'MISMATCH'}")

print()
if bad:
    print("disagreements (pairs are PR RO OJ JE EC CT TS, last slot is after S):")
    for n, h, m in bad:
        print(f"  {n}\n     harfbuzz {h}\n     lib.py   {m}")
else:
    print("every face agrees with HarfBuzz on every pair.")
