#!/usr/bin/env python3
"""Build specimen.html — the page you choose a face from.

The shortlist itself lives in curated.py, which build-site.py reads too, so the
page and the site cannot end up disagreeing about which faces exist or what
weight each is fitted at.

    python build-specimen.py

Needs the fonts, which are not in this repository. See README.md.
"""
import base64, json, pathlib, subprocess, sys, warnings
warnings.filterwarnings("ignore")
import lib, curated, morph

HERE = pathlib.Path(__file__).resolve().parent
TEXT = ("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        "’—– .,:;!?()[]/%+-×·→*#&'\"@_=<>|Δ")


def subset(src, out_name):
    subprocess.run([sys.executable, "-m", "fontTools.subset", src, f"--text={TEXT}",
                    "--flavor=woff2", "--no-hinting",
                    "--layout-features=kern,liga,clig,tnum",
                    f"--output-file={out_name}"], check=True)
    return base64.b64encode(pathlib.Path(out_name).read_bytes()).decode()


def main():
    friz, top, bot = curated.reference()
    faces = curated.build_all(friz, top)
    if not faces: sys.exit("nothing built")

    data = dict(
        viewBox=f"0 0 {friz['span']:g} {top-bot:g}",
        friz=morph.true_path(friz, top),
        faces=faces,
        frizmeta=dict(stem=friz["stem"]/curated.CAP,
                      O=(friz["box"]["O"][1]-friz["box"]["O"][0])/curated.CAP,
                      EO=((friz["box"]["E"][1]-friz["box"]["E"][0]) /
                          (friz["box"]["O"][1]-friz["box"]["O"][0])),
                      span=friz["span"]),
    )

    tpl = (HERE / "specimen.tpl.html").read_text(encoding="utf-8")
    html = (tpl.replace("__DISP__", subset("../../../fonts/spectral-regular.woff2", "_d.woff2"))
               .replace("__BODY__", subset("gf/instrumentsans.ttf", "_b.woff2"))
               .replace("__VB__", data["viewBox"])
               .replace("__DATA__", json.dumps(data, separators=(",", ":"))))
    for marker in ("__DISP__", "__BODY__", "__VB__", "__DATA__"):
        assert marker not in html, marker
    out = HERE / "specimen.html"
    out.write_text(html, encoding="utf-8")
    print(f"\nwrote {out.name}  ({len(out.read_bytes())/1024:.0f} KB, {len(faces)} faces)")


if __name__ == "__main__":
    main()
