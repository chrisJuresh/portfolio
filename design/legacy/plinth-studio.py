#!/usr/bin/env python3
"""The plinth, end to end, in a browser: photograph in, stone on the site out.

    python design/legacy/plinth-studio.py

...then open what it prints. It serves the repository, so the studio page, the
plates and the real /portfolio all come off one origin and the preview is the
actual page rather than a mock of it.

WHAT IT IS FOR. Everything under design/plinth/ already exists as a command:
build-portoro-maps.py takes a photograph apart, build-slab.py lights the result
in Cycles, add-stone.py runs the two together for four fixed presets, and
portfolio/styles.css is hand-edited afterwards to point at the winner. That is
four steps, three of which have to be got right in the correct order, and the
last of which has a digest in it that goes stale silently. This is those four
steps behind one page: drop an image, move every slider the stone has, bake,
look at it standing under the real Frame, and write it into the stylesheet.

WHAT IT IS NOT. It is not a preview of an unbaked stone. A photo-backed stone
is a path-traced render of four maps and there is no honest way to draw one
without Cycles - see plinth-tuner.html, which reimplements the PROCEDURAL
material in GLSL and says out loud that it cannot draw the photographic ones.
What this page gives you before a bake is the WINDOW: which rectangle of your
photograph lands on the block, drawn from the same numbers build_photo_material()
projects with. That answers `scale` and `offset`, which are the two strongest
controls, and it is honest about answering nothing else.

THE THREE THINGS IT KNOWS THAT THE COMMANDS DO NOT:

  MAPS ARE PER-IMAGE, NOT PER-STONE, so a second bake of the same photograph at
  a different `scale` is fifteen seconds of Cycles and not fifty megabytes of
  PNG. add-stone.py rebuilds the maps every run because it is a one-shot; this
  keeps them, keyed by the CONTENT of the image and the two options that change
  what the maps are (`size`, `square`). Content-addressed and not name-addressed
  on purpose: a directory keyed by a name is a directory a second photograph
  called photo.jpg silently overwrites, which is the exact failure
  docs/agents/plinth-marble.md warns about for maps/ itself.

  THE ?v= IS THE DIGEST OF EVERY PLATE, so it moves whenever ANY stone is baked
  - including one you are only trying out. portfolio/styles.css then asks for a
  filename that no longer describes what is on disk, and vercel.json caches
  /portfolio/img/ for a day, so the deployment serves the stale plate for up to
  24 hours while localhost looks right. "Apply" restamps every plinth url() in
  the stylesheet, and the page shows a warning whenever they have drifted apart.

  A STONE THIS WRITES IS A FILE, NOT A TABLE ENTRY. design/plinth/stones/<key>.json,
  which build-slab.py's load_added_stones() merges into PHOTO_CANDIDATES - the
  same door add-stone.py uses. Built-in names are refused rather than shadowed.

WHAT IS COMMITTED AND WHAT IS NOT, unchanged from add-stone.py: the entry and
the plate ship, the maps and your photograph do not. So a stone survives a fresh
checkout and can be looked at there, and can only be RE-BAKED from a tree that
still has the image. design/plinth/sources/ is where this keeps them and it is
gitignored - keep anything you care about somewhere else as well.

IT WRITES TO portfolio/styles.css when you press Apply, and to nothing else
outside design/plinth/ and portfolio/img/tex/. It binds to 127.0.0.1 only.
"""

from __future__ import annotations

import argparse
import hashlib
import http.server
import importlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import urllib.parse
import webbrowser

# MOVED. This page and its server lived in design/plinth/ until #146 absorbed the
# five tuners into the Editor; they are kept, working, because "the Editor is
# better" is a judgement the author gets to reverse. The generators did NOT move,
# so HERE is design/legacy/ and PLINTH is where everything it drives still is.
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
PLINTH = os.path.join(ROOT, "design", "plinth")
sys.path.insert(0, PLINTH)

# Both are hyphenated, so neither is reachable by `import` - see the same note
# in add-stone.py, which is where the two helpers taken from it are documented.
maps_mod = importlib.import_module("build-portoro-maps")
add_stone = importlib.import_module("add-stone")

SOURCES = os.path.join(PLINTH, "sources")
MAPS_DIR = os.path.join(PLINTH, "maps")
STONES_DIR = os.path.join(PLINTH, "stones")
SIDECAR = os.path.join(PLINTH, "slab.json")
BUILD_SLAB = os.path.join(PLINTH, "build-slab.py")
PLATES = os.path.join(ROOT, "portfolio", "img", "tex")
STYLESHEET = os.path.join(ROOT, "portfolio", "styles.css")
CONTRACT = os.path.join(ROOT, "design", "tools", "check-capture-contract.py")
STUDIO_PAGE = "/design/legacy/plinth-studio.html"

# The surrounds build-slab.py's ROOMS defines. Stated here because ROOMS lives
# behind `import bpy` and cannot be read without Blender; a name that is not one
# of these reaches set_lights() as a KeyError inside a headless render, so it is
# refused at the form instead.
ROOMS = ("noir", "screen", "flat", "gallery")

# What build_maps() writes, all of it, for one photograph. Used to decide
# whether a maps directory is complete rather than merely present - a bake
# interrupted halfway leaves a directory that exists and is missing a map, and
# build-slab.py would then stop with MISSING_ADDED_MAPS forty seconds in.
MAP_FILES = tuple(["basecolor-%s.png" % g for g in sorted(maps_mod.GRADES)]
                  + ["roughness.png", "height.png", "calcite.png"])

# What may be dropped on the page. Checked by extension AND by asking Pillow to
# open it, because the extension is the uploader's claim and the decode is the
# only thing that makes it true.
IMAGE_EXT = (".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".bmp")
MAX_UPLOAD = 96 * 1024 * 1024

NAME_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
SLUG_RE = re.compile(r"[^a-z0-9]+")

# The default declaration in the .panel block, which is the stone the site
# draws. Anchored at the start of a line with nothing but indent before it, so
# it cannot match the `.panel[data-marble="…"] { --panel-plinth-src: … }`
# candidate rules further down - those carry a selector on the same line.
SITE_SRC_RE = re.compile(
    r'^(?P<lead>[ \t]*--panel-plinth-src:[ \t]*url\(")'
    r'img/tex/plinth-(?P<key>[a-z0-9-]+)\.webp(?:\?v=(?P<ver>[0-9a-f]+))?'
    r'(?P<tail>"\);)', re.M)
# ...and every plinth plate url() in the file, candidates included, for the
# restamp. One digest covers all of them: digest() hashes the whole directory.
ANY_SRC_RE = re.compile(
    r'(?P<head>url\("img/tex/plinth-[a-z0-9-]+\.webp)(?:\?v=[0-9a-f]+)?(?P<tail>"\))')


def slug(text):
    return SLUG_RE.sub("-", text.lower()).strip("-") or "image"


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def maps_stem(src_path, size, square):
    """Which maps directory a (photograph, size, square) triple belongs in.

    The digest covers all three because all three change what the maps ARE, and
    a directory shared by two different sets of maps is a stone that silently
    re-renders as another stone's rock the next time anything is baked. The slug
    is only there so the directory is recognisable in a file listing.
    """
    h = hashlib.sha256()
    h.update(sha256_file(src_path).encode())
    h.update(b"|%d|%d" % (int(size), 1 if square else 0))
    return "%s-%s" % (slug(os.path.splitext(os.path.basename(src_path))[0]),
                      h.hexdigest()[:8])


def maps_complete(stem):
    d = os.path.join(MAPS_DIR, stem)
    return all(os.path.isfile(os.path.join(d, f)) for f in MAP_FILES)


def sidecar():
    if not os.path.isfile(SIDECAR):
        return {}
    with open(SIDECAR, encoding="utf-8") as fh:
        return json.load(fh)


def added_keys():
    """The stones that are files - design/plinth/stones/*.json - as against the
    ones that are the tables in build-slab.py. Only these can be rewritten."""
    names = os.listdir(STONES_DIR) if os.path.isdir(STONES_DIR) else []
    return {n[:-5] for n in names if n.endswith(".json")}


def taken_names(doc):
    """Every stone name build-slab.py would recognise, so a new one can be
    refused before a minute of Cycles is spent discovering the clash. Read out
    of the sidecar for the same reason add-stone.py reads it: knowing the
    built-in tables means importing build-slab.py, which means importing bpy."""
    names = set()
    for field in ("candidates", "photo_candidates", "relit_candidates"):
        names |= set(doc.get(field) or {})
    return names | added_keys()


def probe(path):
    from PIL import Image
    with Image.open(path) as im:
        w, h = im.size
        fmt = im.format
    return {"w": w, "h": h, "aspect": (w / float(h)) if h else 1.0,
            "format": fmt, "bytes": os.path.getsize(path)}


def list_sources():
    out = []
    for name in sorted(os.listdir(SOURCES) if os.path.isdir(SOURCES) else []):
        path = os.path.join(SOURCES, name)
        if not os.path.isfile(path) or not name.lower().endswith(IMAGE_EXT):
            continue
        try:
            info = probe(path)
        except Exception as exc:                      # a file that is not one
            info = {"error": str(exc)}
        info["name"] = name
        info["url"] = "/design/plinth/sources/" + urllib.parse.quote(name)
        out.append(info)
    return out


def read_site():
    """Which stone portfolio/styles.css draws, and at which digest."""
    with open(STYLESHEET, encoding="utf-8") as fh:
        css = fh.read()
    hits = SITE_SRC_RE.findall(css)
    m = SITE_SRC_RE.search(css)
    return {"stone": m.group("key") if m else None,
            "version": m.group("ver") if m else None,
            "declarations": len(hits),
            "stamped": len(ANY_SRC_RE.findall(css))}


def plate_path(key):
    return os.path.join(PLATES, "plinth-%s.webp" % key)


def stones_state(doc):
    """Every stone the picker offers: what it is, whether its plate is on disk,
    and whether this studio can rewrite or delete it."""
    added = doc.get("added_stones") or {}
    out = []
    for key, spec in (doc.get("photo_candidates") or {}).items():
        p = plate_path(key)
        entry = dict(spec)
        entry["key"] = key
        entry["photo"] = True
        entry["mine"] = key in added
        entry["src"] = (added.get(key) or {}).get("src")
        entry["stem"] = (added.get(key) or {}).get("stem")
        entry["plate"] = os.path.isfile(p)
        entry["plate_bytes"] = os.path.getsize(p) if entry["plate"] else 0
        out.append(entry)
    # The procedural stones and their re-lit twins. Listed because they have
    # plates and a picker that hides a plate on disk reads as a bake that
    # failed; not editable here, because their material is a table in
    # build-slab.py and there is no file to write.
    for field in ("candidates", "relit_candidates"):
        for key, spec in (doc.get(field) or {}).items():
            p = plate_path(key)
            out.append({"key": key, "title": spec.get("title", key),
                        "photo": False, "mine": False, "procedural": True,
                        "plate": os.path.isfile(p),
                        "plate_bytes": os.path.getsize(p) if os.path.isfile(p) else 0})
    out.sort(key=lambda s: (not s.get("mine"), not s.get("photo"), s["key"]))
    return out


def map_dirs():
    """Every maps/<stem>/ on disk with its size, and which stones point at it.
    maps/ itself is not listed: it is the gemini-* set, which is not this
    studio's to sweep."""
    used = {}
    for key in sorted(added_keys()):
        with open(os.path.join(STONES_DIR, key + ".json"), encoding="utf-8") as fh:
            used.setdefault(json.load(fh).get("maps") or key, []).append(key)
    out = []
    for name in sorted(os.listdir(MAPS_DIR) if os.path.isdir(MAPS_DIR) else []):
        d = os.path.join(MAPS_DIR, name)
        if not os.path.isdir(d):
            continue
        total = sum(os.path.getsize(os.path.join(d, f))
                    for f in os.listdir(d) if os.path.isfile(os.path.join(d, f)))
        out.append({"stem": name, "bytes": total, "used_by": used.get(name, []),
                    "complete": maps_complete(name)})
    return out


# ---------------------------------------------------------------------------
# jobs
# ---------------------------------------------------------------------------
# One at a time, and that is a correctness rule rather than politeness: two
# bakes are two Blenders writing the same slab.json and the same digest, and two
# map builds of one stem are two processes writing the same PNGs. The page
# greys its buttons while one is running and the server refuses anyway.

class Job:
    def __init__(self, kind, label):
        self.id = "%d" % (time.time_ns() // 1000)
        self.kind = kind
        self.label = label
        self.lines = []
        self.done = False
        self.ok = False
        self.result = {}
        self.lock = threading.Lock()

    def log(self, text):
        with self.lock:
            for line in str(text).rstrip("\n").split("\n"):
                self.lines.append(line)

    def view(self, start):
        with self.lock:
            return {"id": self.id, "kind": self.kind, "label": self.label,
                    "from": start, "lines": self.lines[start:],
                    "total": len(self.lines), "done": self.done,
                    "ok": self.ok, "result": self.result}


class Runner:
    def __init__(self):
        self.job = None
        self.lock = threading.Lock()
        self.history = {}

    def busy(self):
        j = self.job
        return j if (j is not None and not j.done) else None

    def start(self, kind, label, fn):
        with self.lock:
            if self.busy():
                return None
            job = Job(kind, label)
            self.job = job
            self.history[job.id] = job
        def wrap():
            try:
                job.result = fn(job) or {}
                job.ok = True
            except Exception as exc:
                job.log("")
                job.log("! %s: %s" % (type(exc).__name__, exc))
            finally:
                job.done = True
        threading.Thread(target=wrap, daemon=True).start()
        return job

    def get(self, jid):
        return self.history.get(jid)


RUN = Runner()


class Tee(io.TextIOBase):
    """build_maps() reports what it is doing by printing, and it is worth
    watching - the mineral split it prints is what decides between the `deep`
    and `asis` grades. Redirecting the process-wide stdout is safe only because
    exactly one job runs at a time and the request threads log to stderr."""

    def __init__(self, job, also):
        self.job, self.also, self.buf = job, also, ""

    def write(self, text):
        self.also.write(text)
        self.buf += text
        while "\n" in self.buf:
            line, self.buf = self.buf.split("\n", 1)
            self.job.log(line)
        return len(text)

    def flush(self):
        self.also.flush()


def stream(job, cmd, cwd=ROOT):
    job.log("$ " + " ".join(('"%s"' % c if " " in c else c) for c in cmd))
    p = subprocess.Popen(cmd, cwd=cwd, stdout=subprocess.PIPE,
                         stderr=subprocess.STDOUT, text=True,
                         encoding="utf-8", errors="replace", bufsize=1)
    for line in p.stdout:
        job.log(line)
    return p.wait()


def find_blender(explicit=None):
    return add_stone.find_blender(explicit)


# ---------------------------------------------------------------------------
# the three things a job can be
# ---------------------------------------------------------------------------

def ensure_maps(job, src_name, size, square):
    """The maps for one photograph, built if this triple has never been built.

    Returns the stem. Never rebuilds a complete directory: the stem is a digest
    of everything that decides what is in it, so a directory that exists and is
    complete is by construction the right one.
    """
    src = os.path.join(SOURCES, os.path.basename(src_name))
    if not os.path.isfile(src):
        raise SystemExit("no such source: %s" % src_name)
    # build_maps() resamples to whatever it is handed, UP as well as down, and a
    # map upscaled past its source is cost with nothing in it. Clamped here the
    # way add-stone.py clamps it, and against the edge that SURVIVES the crop, so
    # a square cut out of a long photograph is measured as what it will be. The
    # clamped number is what the stem is taken from, so asking for 3000 of a
    # 2400px source lands in the same directory as asking for 2400.
    info = probe(src)
    edge = min(info["w"], info["h"]) if square else max(info["w"], info["h"])
    size = min(int(size), edge) if size else 0
    stem = maps_stem(src, size, square)
    out = os.path.join(MAPS_DIR, stem)
    if maps_complete(stem):
        job.log("maps: reusing design/plinth/maps/%s" % stem)
        return stem
    job.log("== maps: design/plinth/maps/%s ==" % stem)
    saved, sys.stdout = sys.stdout, Tee(job, sys.__stdout__)
    try:
        st = maps_mod.build_maps(src, out, size, square)
    finally:
        sys.stdout = saved
    if st and st.get("w", 0) < add_stone.SOFT_PX:
        job.log("! %dpx of width, and the plinth wants about %d - the fine "
                "structure will be soft, and resampling cannot put it back."
                % (st["w"], add_stone.SOFT_PX))
    if st and st.get("ground", 1.0) < add_stone.THIN_GROUND:
        job.log("! ground %.0f%% - a light stone classifies as almost all "
                "calcite and the `deep` grade has little to crush. Try `asis`."
                % (st["ground"] * 100))
    return stem


def bake_job(req):
    def run(job):
        key = req["key"]
        stem = ensure_maps(job, req["src"], int(req["size"]), bool(req["square"]))
        spec = {
            "title": req["title"],
            "grade": req["grade"],
            "scale": float(req["scale"]),
            "offset": float(req["offset"]),
            "bump": [float(req["bump"][0]), float(req["bump"][1])],
            "sss": float(req["sss"]),
            "coat": [float(req["coat"][0]), float(req["coat"][1])],
            "rough": float(req["rough"]),
            "crack": bool(req["crack"]),
            "room": req["room"],
            "maps": stem,
            "src": os.path.basename(req["src"]),
        }
        os.makedirs(STONES_DIR, exist_ok=True)
        path = os.path.join(STONES_DIR, key + ".json")
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            json.dump(spec, fh, indent=2)
            fh.write("\n")
        job.log("wrote design/plinth/stones/%s.json" % key)
        blender = find_blender(req.get("blender") or None)
        if not blender:
            raise SystemExit(
                "no Blender found. Set the BLENDER environment variable, put "
                "blender on PATH, or start this with --blender <path>. The maps "
                "and the entry are written, so re-baking is the only step left.")
        job.log("")
        rc = stream(job, [blender, "-b", "-P",
                          os.path.relpath(BUILD_SLAB, ROOT), "--", key])
        if rc != 0:
            raise SystemExit("blender exited %d - nothing was written to the "
                             "stylesheet." % rc)
        plate = plate_path(key)
        if not os.path.isfile(plate):
            raise SystemExit("blender reported success and there is no plate at "
                             "portfolio/img/tex/plinth-%s.webp" % key)
        job.log("")
        job.log("plate  %.1f KB" % (os.path.getsize(plate) / 1024.0))
        return {"key": key, "stem": stem, "version": sidecar().get("version")}
    return run


def refresh_job(job):
    """Rewrite slab.json without rendering anything.

    `none` is build-slab.py's empty group. It still starts Blender - the file
    imports bpy at the top - but it renders no stone, so this is the three
    seconds that make a deletion visible to the picker rather than a minute.
    """
    blender = find_blender()
    if not blender:
        raise SystemExit("no Blender found, so design/plinth/slab.json cannot "
                         "be rewritten and the picker will keep listing what "
                         "was just deleted until it is.")
    rc = stream(job, [blender, "-b", "-P", os.path.relpath(BUILD_SLAB, ROOT),
                      "--", "none"])
    if rc != 0:
        raise SystemExit("blender exited %d" % rc)
    return {"version": sidecar().get("version")}


def contract_job(job):
    rc = stream(job, [sys.executable, os.path.relpath(CONTRACT, ROOT)])
    job.log("")
    job.log({0: "contract holds.",
             1: "! the contract is BROKEN - see above.",
             }.get(rc, "! could not run (exit %d)." % rc))
    if rc != 0:
        raise SystemExit("check-capture-contract.py exited %d" % rc)
    return {"exit": rc}


# ---------------------------------------------------------------------------
# writing the stylesheet
# ---------------------------------------------------------------------------

def apply_stone(key):
    """Point portfolio/styles.css at `key` and restamp every plinth ?v=.

    Two edits and they are independent: WHICH plate the .panel block asks for,
    and the digest on every plinth url() in the file including the candidate
    rules. The second happens on its own whenever any stone has been baked,
    which is why it is done even when the stone has not changed.
    """
    if not os.path.isfile(plate_path(key)):
        raise SystemExit("no plate at portfolio/img/tex/plinth-%s.webp - bake "
                         "it before pointing the site at it." % key)
    version = sidecar().get("version")
    if not version:
        raise SystemExit("design/plinth/slab.json has no version. Bake "
                         "something, or refresh the sidecar.")
    with open(STYLESHEET, encoding="utf-8") as fh:
        css = fh.read()
    hits = SITE_SRC_RE.findall(css)
    if len(hits) != 1:
        raise SystemExit(
            "found %d default --panel-plinth-src declarations in "
            "portfolio/styles.css and expected exactly one. The stylesheet has "
            "moved under this tool; fix it by hand and say so in "
            "docs/agents/plinth-marble.md." % len(hits))
    was = SITE_SRC_RE.search(css)
    before = (was.group("key"), was.group("ver"))
    css = SITE_SRC_RE.sub(
        lambda m: "%simg/tex/plinth-%s.webp?v=%s%s"
                  % (m.group("lead"), key, version, m.group("tail")), css, count=1)
    css, stamped = ANY_SRC_RE.subn(
        lambda m: "%s?v=%s%s" % (m.group("head"), version, m.group("tail")), css)
    with open(STYLESHEET, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(css)
    return {"stone": key, "version": version, "stamped": stamped,
            "was_stone": before[0], "was_version": before[1]}


def forget_stone(key):
    """Delete a stone this studio (or add-stone.py) wrote: the entry and the
    plate. Never a built-in - those are the table in build-slab.py and there is
    no file here to delete. The maps are left; they are shared between stones
    and `sweep` is what collects them."""
    entry = os.path.join(STONES_DIR, key + ".json")
    if not os.path.isfile(entry):
        raise SystemExit("`%s` has no design/plinth/stones/ entry, so it is a "
                         "built-in and this cannot delete it." % key)
    site = read_site()
    if site["stone"] == key:
        raise SystemExit("portfolio/styles.css draws `%s`. Apply another stone "
                         "first." % key)
    os.remove(entry)
    gone = ["design/plinth/stones/%s.json" % key]
    p = plate_path(key)
    if os.path.isfile(p):
        os.remove(p)
        gone.append("portfolio/img/tex/plinth-%s.webp" % key)
    return {"removed": gone}


def sweep_maps():
    """Every maps/<stem>/ no stone points at. Fifty megabytes each, and a bake
    at a new `size` makes a new one, so they accumulate fast."""
    removed = []
    for d in map_dirs():
        if d["used_by"]:
            continue
        shutil.rmtree(os.path.join(MAPS_DIR, d["stem"]))
        removed.append({"stem": d["stem"], "bytes": d["bytes"]})
    return {"removed": removed,
            "bytes": sum(r["bytes"] for r in removed)}


# ---------------------------------------------------------------------------
# the server
# ---------------------------------------------------------------------------

def state():
    doc = sidecar()
    site = read_site()
    version = doc.get("version")
    return {
        "root": ROOT,
        "blender": find_blender(),
        "sources": list_sources(),
        "stones": stones_state(doc),
        "maps": map_dirs(),
        "presets": add_stone.STYLES,
        "grades": {g: v.get("title", g) for g, v in sorted(maps_mod.GRADES.items())},
        "rooms": list(ROOMS),
        "taken": sorted(taken_names(doc)),
        "block": doc.get("block"),
        "plate": doc.get("plate"),
        "version": version,
        "site": site,
        "stale": bool(version and site["version"] and version != site["version"]),
        "soft_px": add_stone.SOFT_PX,
        "cap_px": add_stone.CAP_PX,
        "busy": (RUN.busy().id if RUN.busy() else None),
    }


def validate_bake(req):
    doc = sidecar()
    key = str(req.get("key", "")).strip().lower()
    if not NAME_RE.match(key):
        return "`%s` is not a stone name - lowercase letters, digits and " \
               "dashes, starting with a letter or digit. It becomes a " \
               "filename, a JSON key and a URL." % key
    if key in taken_names(doc) and key not in added_keys():
        return "`%s` is a stone build-slab.py already defines. A file that " \
               "shadowed one would render as something other than what that " \
               "file documents, so it is refused rather than merged." % key
    if req.get("grade") not in maps_mod.GRADES:
        return "unknown grade `%s`" % req.get("grade")
    if req.get("room") not in ROOMS:
        return "unknown room `%s`" % req.get("room")
    if not str(req.get("src", "")):
        return "pick a source photograph first."
    req["key"] = key
    return None


class Handler(http.server.SimpleHTTPRequestHandler):
    server_version = "plinth-studio"

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    # Everything here is a working file being rewritten while the page is open -
    # a plate re-baked under the same name, slab.json rewritten under it. A
    # conditional GET that answered 304 would be the studio showing the render
    # before last.
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    # The page polls /api/job three times a second while a bake runs, and a
    # console scrolling that away is a console the Blender output cannot be read
    # in. str() and not args[0] directly: log_error passes an int status first.
    def log_message(self, fmt, *args):
        if "/api/job" not in (str(args[0]) if args else ""):
            super().log_message(fmt, *args)

    def send_json(self, obj, code=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def fail(self, message, code=400):
        # Close rather than keep alive. A POST refused before its body has been
        # read leaves that body in the socket, and on a keep-alive connection the
        # next request is then parsed out of the middle of a JPEG.
        self.close_connection = True
        self.send_json({"error": str(message)}, code)

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(n) if n else b""

    def do_GET(self):
        parts = urllib.parse.urlparse(self.path)
        if parts.path == "/":
            self.send_response(302)
            self.send_header("Location", STUDIO_PAGE)
            self.end_headers()
            return
        if parts.path == "/api/state":
            return self.send_json(state())
        if parts.path == "/api/job":
            q = urllib.parse.parse_qs(parts.query)
            job = RUN.get((q.get("id") or [""])[0])
            if not job:
                return self.fail("no such job", 404)
            return self.send_json(job.view(int((q.get("from") or ["0"])[0])))
        if parts.path.startswith("/api/"):
            return self.fail("no such endpoint", 404)
        return super().do_GET()

    def do_POST(self):
        parts = urllib.parse.urlparse(self.path)
        try:
            if parts.path == "/api/upload":
                return self.upload()
            if parts.path == "/api/bake":
                req = json.loads(self.body() or b"{}")
                bad = validate_bake(req)
                if bad:
                    return self.fail(bad)
                return self.spawn("bake", "bake " + req["key"], bake_job(req))
            if parts.path == "/api/refresh":
                return self.spawn("refresh", "refresh slab.json", refresh_job)
            if parts.path == "/api/contract":
                return self.spawn("contract", "capture contract", contract_job)
            if parts.path == "/api/apply":
                req = json.loads(self.body() or b"{}")
                return self.send_json(apply_stone(str(req.get("key", ""))))
            if parts.path == "/api/forget":
                req = json.loads(self.body() or b"{}")
                return self.send_json(forget_stone(str(req.get("key", ""))))
            if parts.path == "/api/sweep":
                return self.send_json(sweep_maps())
        except SystemExit as exc:
            return self.fail(exc)
        except Exception as exc:
            return self.fail("%s: %s" % (type(exc).__name__, exc), 500)
        return self.fail("no such endpoint", 404)

    def spawn(self, kind, label, fn):
        job = RUN.start(kind, label, fn)
        if job is None:
            return self.fail("`%s` is still running - one at a time, because "
                             "two of them write the same files."
                             % RUN.busy().label, 409)
        return self.send_json({"job": job.id})

    def upload(self):
        name = self.headers.get("X-Filename") or "image"
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0:
            return self.fail("empty upload")
        if n > MAX_UPLOAD:
            return self.fail("%.0f MB is over the %d MB cap. The maps are "
                             "capped at %d px anyway - downscale first."
                             % (n / 1e6, MAX_UPLOAD // (1024 * 1024),
                                add_stone.CAP_PX))
        stem, ext = os.path.splitext(os.path.basename(name))
        ext = ext.lower()
        if ext not in IMAGE_EXT:
            return self.fail("`%s` is not one of %s" % (ext, ", ".join(IMAGE_EXT)))
        # The name is the uploader's and lands on disk, so it is rebuilt rather
        # than cleaned: a slug of the stem plus an extension from the allow-list
        # above cannot carry a separator, a drive letter or a leading dot.
        safe = slug(stem)[:60] + ext
        os.makedirs(SOURCES, exist_ok=True)
        path = os.path.join(SOURCES, safe)
        i = 2
        while os.path.isfile(path) and i < 999:
            path = os.path.join(SOURCES, "%s-%d%s" % (slug(stem)[:60], i, ext))
            i += 1
        with open(path, "wb") as fh:
            fh.write(self.body())
        try:
            info = probe(path)
        except Exception as exc:
            os.remove(path)
            return self.fail("that did not decode as an image (%s)" % exc)
        info["name"] = os.path.basename(path)
        info["url"] = "/design/plinth/sources/" + urllib.parse.quote(info["name"])
        return self.send_json(info)


class Server(http.server.ThreadingHTTPServer):
    # SO_REUSEADDR IS OFF, AND THAT IS THE POINT. http.server turns it on, and
    # on Windows that does not mean "reuse a socket in TIME_WAIT" - it means a
    # second process may bind a port another process is still LISTENING on, at
    # which point the two split the incoming connections between them with no
    # error on either side. A studio left running in another window then answers
    # half of this one's requests, from a different worktree, and the symptom is
    # a page that intermittently shows the wrong stone and a curl that gets an
    # empty reply. Off, the second one refuses to start and says the port is
    # taken, which is the true statement.
    allow_reuse_address = False
    daemon_threads = True


def main():
    ap = argparse.ArgumentParser(
        description=__doc__.splitlines()[0],
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Serves the repository at 127.0.0.1 only. It writes to "
               "design/plinth/{sources,maps,stones}/, portfolio/img/tex/, and "
               "- when you press Apply - portfolio/styles.css.")
    ap.add_argument("--port", type=int, default=4180)
    ap.add_argument("--blender", default=None,
                    help="path to blender.exe, if it is not on PATH, in "
                         "$BLENDER, or where Windows put it")
    ap.add_argument("--no-open", action="store_true",
                    help="do not open a browser")
    args = ap.parse_args()

    if args.blender:
        os.environ["BLENDER"] = args.blender
    os.makedirs(SOURCES, exist_ok=True)

    url = "http://127.0.0.1:%d%s" % (args.port, STUDIO_PAGE)
    blender = find_blender()
    print("plinth studio   %s" % url)
    print("repository      %s" % ROOT)
    print("blender         %s" % (blender or
                                  "NOT FOUND - baking will fail. --blender, "
                                  "$BLENDER, or PATH."))
    site = read_site()
    print("the site draws  %s  (?v=%s)" % (site["stone"], site["version"]))
    print("\nctrl-c to stop.\n")
    if not args.no_open:
        threading.Timer(0.4, webbrowser.open, (url,)).start()
    try:
        srv = Server(("127.0.0.1", args.port), Handler)
    except OSError as exc:
        sys.exit("cannot listen on 127.0.0.1:%d (%s).\n\nAnother studio is "
                 "probably already running - use it, or start this one with "
                 "--port." % (args.port, exc))
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("")


if __name__ == "__main__":
    main()
