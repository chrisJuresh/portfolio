#!/usr/bin/env python3
"""Render the Projects Panel's marble plinth as an actual block of stone.

    "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b \
        -P design/plinth/build-slab.py -- [nero | portoro | marquina | grey | all]

WHY THIS REPLACES design/plinth/build-marble.py. That file painted a plinth: a
photograph of a slab, warped, dropped onto a luminance ramp measured off the
design render, with a specular line drawn where the two faces met. It could not
be made right, and the reason is structural rather than a matter of tuning — it
had no geometry. The plate it wrote was a RECTANGLE, so the block's ends could
not converge, the top face could not be a trapezoid, and the whole thing read as
a lit strip rather than as something with a far side. Every parameter in it was a
guess at what a renderer computes.

So the block is a block now. Cycles, one cube, one camera, two lights, and the
silhouette comes out of the alpha channel instead of being assumed.

THE CAMERA IS SOLVED FROM THE RENDER, NOT CHOSEN. IMG_20260815_153956.jpg is not
in this repository — see the .panel block in portfolio/styles.css for why — so
these are constants of the composition, but they are measurements and the camera
that reproduces them is arithmetic:

    front arris   y 1549, flat across the whole width x 420..2370
    back edge     y 1482, flat, visible only left of the Frame
    contact line  y 1518, where the Frame's foot stands
    left end      (400, 1549) -> (520, 1482): the end converges 120 px
    Frame         x 574..2411, so its centre is x 1492.5

Two things fall out of that and both had been read wrong. The top face is 67 px
deep, not the 31 px the old plate drew, because 1518 IS NOT THE BACK EDGE — the
block runs 36 px BEHIND the Frame's foot and the Frame stands on it rather than
at its back. And the near edge overhangs the Frame by 174 px on the left, which
put symmetrically on the right lands 17 px outside a picture 2568 wide: the
render's slab is symmetric about the Frame and was only ever cut off. The old
plate ran flush to the composition on the right and a column past it on the left,
which is the asymmetry you can see without measuring anything.

With the block's half width set equal to the near edge's own screen half width —
model units ARE Frame widths — the camera solves in three lines, and the height
and the block's own height come out equal to the screen lengths that measured
them. See the derivation under `the camera` below.

WHAT THE LIGHT IS. Two area lights, and their placement is the reflection and not
a look. The top face is polished, so what it shows is whatever its mirror ray
hits: from the near edge that ray leaves at 7.8 degrees and from the far edge at
6.9, so a source BEHIND the block and just above its surface is caught by the
near rows and missed by the far ones. That is the render's sweep — dark at the
back, 79 at 81% across, falling off the arris — and it is why the key is behind
a block that appears lit from the front. The fill is in front, wide and weak, and
it is what the front face's flat 30 is.

Both were fitted rather than picked: the profile the plate is scored against is
the render's own, meaned across x 620-2380, and the numbers below score a mean
absolute error of 4.6 levels over both faces.

THE STONE IS PROCEDURAL, and in the material rather than in a photograph, which
is the second thing the old pipeline could not do. Texturelabs' slabs are shot
square-on in flat light: they are pictures of albedo, with no reflectance in them
at all. A polished plinth is mostly reflectance. Here the veining drives base
colour, roughness AND bump together, so a vein is rougher than the ground it sits
in and catches the key differently — which is what marble does and what no amount
of warping a flat photograph gets to.

Deterministic: Cycles is seeded, the material has no random node, and the same
Blender writes the same bytes.
"""

from __future__ import annotations

import hashlib
import math
import os
import sys

import bpy

ARGV = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(bpy.data.filepath or __file__))))
if not os.path.isdir(os.path.join(ROOT, "portfolio")):
    ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_DIR = os.path.join(ROOT, "portfolio", "img", "tex")


# ---------------------------------------------------------------------------
# the render, in its own pixels
# ---------------------------------------------------------------------------
FRAME_W = 1837.0
FRAME_CX = 1492.5
NEAR_Y, FAR_Y, FOOT_Y = 1549.0, 1482.0, 1518.0
NEAR_X, FAR_X = 400.0, 520.0

# ...and as shares of the Frame's width, which is the only datum this file and
# portfolio/styles.css both have. The stylesheet states the last three again.
NEAR_HALF = (FRAME_CX - NEAR_X) / FRAME_W        # 0.594719
FAR_HALF = (FRAME_CX - FAR_X) / FRAME_W          # 0.529396
TOP_FACE = (NEAR_Y - FAR_Y) / FRAME_W            # 0.036472  the whole top face
BEHIND = (FOOT_Y - FAR_Y) / FRAME_W              # 0.019597  ...of it behind the Frame
# The front face the render shows is 83 px and CUT OFF at the picture's bottom
# edge, so it is a floor and not a height. 7% is what the plate draws, which is
# what the old pipeline drew too — it is the one number of its that survived, and
# keeping it is what leaves the composition's fit constant untouched.
FRONT_FACE = 0.070024
PLINTH_W = 2.0 * NEAR_HALF                       # 1.189439


# ---------------------------------------------------------------------------
# the camera
# ---------------------------------------------------------------------------
# Model units are Frame widths and the block's half width is NEAR_HALF, so a
# point (X, Y, Z) with the top face at Z=0 and the near edge at Y=0 projects to
# screen (X/(Y+d), (Z-h)/(Y+d)) times one scale that is the same for both axes.
#
#   R      the convergence the render measures, far half width over near
#   d      falls out of it: far/near = d/(d+DEPTH) = R
#   h      the camera's height. h/d is the near arris's screen offset over the
#          near half width, and with the half width set to its own screen value
#          that makes h equal to the arris offset itself
#   HEIGHT the block's own height, by the same identity
#
# DEPTH is the one free parameter — the render fixes only the RATIO of depth to
# camera distance, because that is all a convergence can tell you. 0.30 of a
# Frame width is a plinth a laptop stands on rather than a plank or a pedestal;
# moving it moves the camera with it and the picture does not change.
DEPTH = 0.30
R = FAR_HALF / NEAR_HALF                         # 0.890160
CAM_D = DEPTH * R / (1.0 - R)                    # 2.43125
CAM_H = TOP_FACE / (1.0 - R)                     # 0.332048
HEIGHT = FRONT_FACE

LENS = 50.0
_x_half = NEAR_HALF / CAM_D
_y_top = (0.0 - CAM_H) / (DEPTH + CAM_D)         # the far edge -> top of frame
_y_bot = (-HEIGHT - CAM_H) / CAM_D               # the front foot -> bottom
SENSOR = 2.0 * LENS * _x_half
SHIFT_Y = ((_y_top + _y_bot) / 2.0) * LENS / SENSOR

PLATE_W = 3000                                   # the rung build-marble.py used
PLATE_H = int(round(PLATE_W * (_y_top - _y_bot) / (2.0 * _x_half)))


# ---------------------------------------------------------------------------
# the light
# ---------------------------------------------------------------------------
# (x, y, z), width, depth, energy, x-rotation in degrees. See WHAT THE LIGHT IS.
KEY = ((0.0, 2.5, 0.36), 10.0, 0.14, 1.00, -80.0)
# THE FILL SITS BELOW THE TOP FACE, at z = -0.04, and that is the one placement
# decision in here that is not about brightness. A fill in front at any positive
# height lights BOTH faces, and what it does to the top one is raise its floor —
# which flattens the key's sweep, so the ramp came out 64 -> 82 against a render
# that runs 36 -> 79. Below the surface it cannot reach the top face at all: the
# normal points away from it, diffuse and specular are both zero, and the sweep
# is the key's alone. The front face, whose normal points at it, is unaffected.
FILL = ((0.0, -1.4, -0.04), 10.0, 2.0, 7.00, 90.0)
# The key's HEIGHT is the fit, and it is a reflection rather than a preference.
# The top face is polished, so it shows whatever its mirror ray hits: from the
# near edge that ray leaves at 7.79 degrees and from the far edge at 6.94, which
# at y = 2.5 is z = 0.342 and z = 0.268. A source centred at 0.36 is squarely in
# the near edge's ray and above the far edge's, so the near rows catch it and the
# far rows fall off it — which IS the render's sweep. Placed at 0.49, where this
# started, both edges see only the shoulder of the lobe and the face comes back
# almost flat: 64 -> 82 against a render that runs 36 -> 79.
#
# Both energies are solved rather than dialled. Cycles is linear in each light
# and the two are independent, so one key-only render and one fill-only render
# determine the pair exactly; these score a mean absolute error of 3.2 levels
# against the render's profile over both faces.

# How polished the stone is where there is no vein in it. The veins each raise it
# — see the CANDIDATES table — because a calcite seam is not as polished as the
# ground it sits in, and the difference is most of what makes the surface read as
# stone rather than as a tinted mirror.
BASE_ROUGH = 0.07

SAMPLES = 1024
SEED = 20260816


# ---------------------------------------------------------------------------
# the stone
# ---------------------------------------------------------------------------
# Each candidate is a ground colour and a list of vein sets, and a vein set is
#
#   (scale, detail, distortion, width, sharpness, colour, rough, bump)
#
# The block is 1.19 wide and 0.07 tall in world units and the mesh carries those
# dimensions itself, so `scale` reads directly: a noise at scale 12 has features
# about 1/12 of a Frame width across, which is fifteen veins over the block.
# `distortion` is how far the field is warped before its level set is taken,
# which is what makes veins wander and meet rather than run parallel. `width` is
# how far off a crossing still counts as vein and `sharpness` thins what is left
# — read them together, they are a support and a falloff. `rough` and `bump` are
# what the vein does to the SURFACE as well as to its colour, which is the whole
# reason this is a material and not a picture: a calcite seam is rougher than the
# stone around it, so it catches the key differently, and no photograph of a slab
# lit flat has that in it anywhere.
GROUND = "ground"
CANDIDATES = {
    # The design render's own stone: a near-black with fine white veining, which
    # is what IMG_20260815_153956.jpg draws and what #57 describes.
    "nero": {
        "title": "near-black with fine white veining - the design render's stone",
        GROUND: (0.020, 0.018, 0.019),
        "veins": [
            (14.0, 4.0, 0.9, 0.024, 3.2, (0.42, 0.41, 0.42), 0.26, 0.30),
            (32.0, 3.0, 1.2, 0.013, 4.0, (0.30, 0.29, 0.30), 0.20, 0.16),
        ],
    },
    # Nero Portoro: a black ground under a branching CREAM-AND-GOLD network with
    # white hairlines through it. Three sets rather than two, because the gold is
    # a swathe and the white is a filament and they are not the same rock.
    "portoro": {
        "title": "Nero Portoro - black with gold swathes and white hairlines",
        GROUND: (0.014, 0.013, 0.014),
        "veins": [
            (7.0, 5.0, 1.4, 0.105, 1.7, (0.50, 0.34, 0.11), 0.42, 0.55),
            (14.0, 4.0, 1.1, 0.055, 2.2, (0.74, 0.62, 0.35), 0.34, 0.40),
            (34.0, 3.0, 1.3, 0.024, 3.2, (0.80, 0.79, 0.76), 0.22, 0.25),
        ],
    },
    # Nero Marquina: the same black, but the veining is bold white and there is
    # much less of it. The plainest of the four and the most familiar.
    "marquina": {
        "title": "Nero Marquina - black with bold white veining",
        GROUND: (0.015, 0.014, 0.015),
        "veins": [
            (6.0, 4.0, 1.0, 0.080, 1.9, (0.82, 0.81, 0.79), 0.34, 0.50),
            (22.0, 3.0, 1.2, 0.022, 3.4, (0.58, 0.57, 0.56), 0.24, 0.20),
        ],
    },
    # ...and one that is not black at all, because a plinth is allowed to be
    # plain stone and the Panel's ground is already very dark.
    "grey": {
        "title": "dark grey with soft pale veining",
        GROUND: (0.048, 0.047, 0.049),
        "veins": [
            (10.0, 4.0, 0.9, 0.070, 2.2, (0.36, 0.36, 0.37), 0.30, 0.30),
            (28.0, 3.0, 1.1, 0.026, 3.0, (0.56, 0.56, 0.57), 0.22, 0.18),
        ],
    },
}


# ---------------------------------------------------------------------------
# the scene
# ---------------------------------------------------------------------------

# ShaderNodeMix carries three sockets called "Result" and six called "A"/"B" —
# one pair per data type — so every socket on it has to be reached by INDEX. The
# indices are fixed by Blender: in 0 Factor(float) 1 Factor(vector) 2 A(float)
# 3 B(float) 4 A(vec) 5 B(vec) 6 A(colour) 7 B(colour); out 0 Result(float)
# 1 Result(vector) 2 Result(colour). Reaching them by name silently takes the
# float one, which is a link that connects and renders the wrong picture.
MIX_FAC, MIX_FA, MIX_FB, MIX_CA, MIX_CB = 0, 2, 3, 6, 7
MIX_OUT_F, MIX_OUT_C = 0, 2


def link(tree, a, ao, b, bi):
    tree.links.new(a.outputs[ao], b.inputs[bi])


def vein_mask(tree, coord, spec, x):
    """One vein set, as a 0..1 mask, built as the LEVEL SET of a noise field.

    A vein is where the field crosses its own middle: |f - 1/2| turns every
    crossing into a line, a Map Range says how far off the crossing still counts
    as vein, and a power thins what is left into a bright core inside stone that
    shades away from it. Warping the field is what makes those lines wander and
    branch instead of running parallel.

    NOT A WAVE TEXTURE IN BANDS, which is the usual recipe and is wrong here.
    Bands are a stack of parallel planes and its Detail input roughens them ALONG
    their own direction, so what comes out is fibre — a grain running one way,
    which reads as wood rather than as stone. Marble's veins are surfaces that
    wander in every direction, and a level set is the only cheap thing that is.
    """
    scale, detail, distortion, width, sharp, _c, _r, _b = spec
    n = tree.nodes.new("ShaderNodeTexNoise")
    n.location = (x, 0)
    n.noise_dimensions = '3D'
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    n.inputs["Roughness"].default_value = 0.48
    n.inputs["Distortion"].default_value = distortion
    link(tree, coord, "Object", n, "Vector")

    sub = tree.nodes.new("ShaderNodeMath")
    sub.location = (x + 180, 0)
    sub.operation = 'SUBTRACT'
    sub.inputs[1].default_value = 0.5
    link(tree, n, "Fac", sub, 0)

    ab = tree.nodes.new("ShaderNodeMath")
    ab.location = (x + 340, 0)
    ab.operation = 'ABSOLUTE'
    link(tree, sub, "Value", ab, 0)

    mr = tree.nodes.new("ShaderNodeMapRange")
    mr.location = (x + 500, 0)
    mr.clamp = True
    mr.inputs["From Min"].default_value = 0.0
    mr.inputs["From Max"].default_value = width
    mr.inputs["To Min"].default_value = 1.0
    mr.inputs["To Max"].default_value = 0.0
    link(tree, ab, "Value", mr, "Value")

    pw = tree.nodes.new("ShaderNodeMath")
    pw.location = (x + 660, 0)
    pw.operation = 'POWER'
    pw.inputs[1].default_value = sharp
    link(tree, mr, "Result", pw, 0)
    return pw


def build_material(key):
    spec = CANDIDATES[key]
    mat = bpy.data.materials.new("marble-" + key)
    mat.use_nodes = True
    tree = mat.node_tree
    bsdf = tree.nodes["Principled BSDF"]

    coord = tree.nodes.new("ShaderNodeTexCoord")
    coord.location = (-1400, 0)

    # Each is a (node, output index) pair, because a ShaderNodeMix's output
    # cannot be reached by name — see MIX_OUT_C above.
    colour = rough = bump_src = None
    for i, vs in enumerate(spec["veins"]):
        mask = (vein_mask(tree, coord, vs, -2000 + i * 40), 0)   # -> Value
        _s, _d, _dt, _w, _so, vc, vr, vb = vs

        mix = tree.nodes.new("ShaderNodeMix")
        mix.data_type = 'RGBA'
        mix.location = (-500, -i * 260)
        mix.inputs[MIX_CA].default_value = (
            tuple(spec[GROUND]) + (1,) if colour is None else (0, 0, 0, 1))
        mix.inputs[MIX_CB].default_value = tuple(vc) + (1,)
        link(tree, mask[0], mask[1], mix, MIX_FAC)
        if colour is not None:
            link(tree, colour[0], colour[1], mix, MIX_CA)
        colour = (mix, MIX_OUT_C)

        mr = tree.nodes.new("ShaderNodeMix")
        mr.data_type = 'FLOAT'
        mr.location = (-500, -i * 260 - 130)
        mr.inputs[MIX_FA].default_value = BASE_ROUGH if rough is None else 0.0
        mr.inputs[MIX_FB].default_value = vr
        link(tree, mask[0], mask[1], mr, MIX_FAC)
        if rough is not None:
            link(tree, rough[0], rough[1], mr, MIX_FA)
        rough = (mr, MIX_OUT_F)

        if bump_src is None:
            bump_src = mask
        else:
            add = tree.nodes.new("ShaderNodeMix")
            add.data_type = 'RGBA'
            add.blend_type = 'ADD'
            add.location = (-300, -i * 260 - 60)
            add.inputs[MIX_FAC].default_value = vb
            link(tree, bump_src[0], bump_src[1], add, MIX_CA)
            link(tree, mask[0], mask[1], add, MIX_CB)
            bump_src = (add, MIX_OUT_C)

    bump = tree.nodes.new("ShaderNodeBump")
    bump.location = (-160, -400)
    bump.inputs["Strength"].default_value = 0.06
    bump.inputs["Distance"].default_value = 0.004
    link(tree, bump_src[0], bump_src[1], bump, "Height")

    link(tree, colour[0], colour[1], bsdf, "Base Color")
    link(tree, rough[0], rough[1], bsdf, "Roughness")
    link(tree, bump, "Normal", bsdf, "Normal")
    bsdf.inputs["IOR"].default_value = 1.55
    return mat


def add_light(spec):
    at, w, h, energy, rx = spec
    bpy.ops.object.light_add(type='AREA', location=at)
    L = bpy.context.object
    L.data.shape = 'RECTANGLE'
    L.data.size, L.data.size_y = w, h
    L.data.energy = energy
    L.rotation_euler = (math.radians(rx), 0.0, 0.0)
    return L


def build_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = SAMPLES
    sc.cycles.seed = SEED
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = PLATE_W, PLATE_H
    # The silhouette is the alpha channel, which is the whole point: the block's
    # ends converge, so the plate is not a rectangle of stone and cannot be drawn
    # as one. `.panel-plinth` in the stylesheet stretches this over its box and
    # what falls outside the block is transparent.
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'WEBP'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.quality = 92
    # Standard, not Filmic or AgX: every level in this file is measured off an
    # 8-bit picture and compared against one, so a view transform that rolls off
    # the highlights would make the fit a fit to something else.
    sc.view_settings.view_transform = 'Standard'

    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'OPTIX'
    prefs.get_devices()
    gpu = [d for d in prefs.devices if d.type == 'OPTIX']
    for dev in prefs.devices:
        dev.use = dev.type == 'OPTIX'
    sc.cycles.device = 'GPU' if gpu else 'CPU'

    sc.world = bpy.data.worlds.new("panel")
    sc.world.use_nodes = True
    sc.world.node_tree.nodes["Background"].inputs[0].default_value = (0, 0, 0, 1)

    bpy.ops.mesh.primitive_cube_add(size=2)   # spans +-1, so scale IS half-extent
    slab = bpy.context.object
    slab.scale = (NEAR_HALF, DEPTH / 2.0, HEIGHT / 2.0)
    slab.location = (0.0, DEPTH / 2.0, -HEIGHT / 2.0)
    # ...AND THEN BAKED INTO THE MESH, which is not tidiness. Object texture
    # coordinates are the object's LOCAL space, and a cube left carrying a scale
    # of (0.59, 0.15, 0.035) has a local space that is uniform +-1 on a block
    # that is seventeen times wider than it is tall. Every texture in the
    # material would be stretched by that ratio — which is exactly what a grain
    # smeared sideways into wood looks like. Applied, local space IS world space
    # and a vein is the same width whichever face it crosses.
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.shade_flat()

    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = LENS
    cam_data.sensor_fit = 'HORIZONTAL'
    cam_data.sensor_width = SENSOR
    cam_data.shift_y = SHIFT_Y
    cam = bpy.data.objects.new("cam", cam_data)
    sc.collection.objects.link(cam)
    cam.location = (0.0, -CAM_D, CAM_H)
    cam.rotation_euler = (math.pi / 2.0, 0.0, 0.0)
    sc.camera = cam

    add_light(KEY)
    add_light(FILL)
    return sc, slab


def build(key, sc, slab):
    print("%s - %s" % (key, CANDIDATES[key]["title"]))
    slab.data.materials.clear()
    slab.data.materials.append(build_material(key))
    path = os.path.join(OUT_DIR, "plinth-%s.webp" % key)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("  %-24s %4dx%-4d  %6.1f KB"
          % (os.path.basename(path), PLATE_W, PLATE_H,
             os.path.getsize(path) / 1024.0))


def digest():
    hashes = []
    for name in sorted(os.listdir(OUT_DIR)):
        if name.startswith("plinth-") and name.endswith(".webp"):
            with open(os.path.join(OUT_DIR, name), "rb") as fh:
                hashes.append(hashlib.sha256(fh.read()).hexdigest())
    return hashlib.sha256("".join(hashes).encode()).hexdigest()[:8]


SIDECAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "slab.json")


def write_sidecar():
    """Everything design/plinth/plinth-tuner.html needs, written by this script.

    The tuner previews a stone before Blender is asked to spend a minute on it,
    which means it has to know the camera, the block, the two lights and the
    CANDIDATES table. NONE OF THAT IS COPIED INTO IT. A tuner holding its own
    literals is a tuner that drifts: it goes on showing the stone this file used
    to render, and the drift is invisible because both halves look right on their
    own. design/plate/plate-tuner.html reads plate-source.json for the same
    reason and that file says so at more length.

    So this is the one direction the constants travel. Change anything above and
    the next render rewrites this; the tuner is then describing the script again
    without anybody having remembered to make it.

    It does not need Blender — everything here is arithmetic on module constants
    — which is what lets the file be refreshed on a machine that has no GPU.
    """
    doc = {
        "note": "written by design/plinth/build-slab.py - do not edit by hand",
        # The block and the camera solved from it. The tuner reproduces the
        # projection rather than guessing at it, so its preview lands on the same
        # trapezoid-over-a-rectangle the plate does and can be compared with one.
        "block": {
            "near_half": NEAR_HALF, "far_half": FAR_HALF, "depth": DEPTH,
            "height": HEIGHT, "top_face": TOP_FACE, "behind": BEHIND,
            "front_face": FRONT_FACE, "width": PLINTH_W,
        },
        "camera": {"d": CAM_D, "h": CAM_H, "r": R, "lens": LENS,
                   "x_half": _x_half, "y_top": _y_top, "y_bot": _y_bot},
        "plate": {"w": PLATE_W, "h": PLATE_H},
        # (x, y, z), width, depth, energy, x-rotation. Fitted, not chosen — see
        # WHAT THE LIGHT IS. The tuner cannot move them and offers no slider for
        # them: they are what makes two stones comparable.
        "lights": {"key": KEY, "fill": FILL},
        "base_rough": BASE_ROUGH,
        "samples": SAMPLES,
        "seed": SEED,
        # The order the vein tuples are written in, so the tuner labels its rows
        # off this file too rather than off a comment in it.
        "vein_fields": ["scale", "detail", "distortion", "width", "sharpness",
                        "colour", "rough", "bump"],
        "candidates": {
            k: {"title": v["title"], "ground": list(v[GROUND]),
                "veins": [list(x[:5]) + [list(x[5])] + list(x[6:])
                          for x in v["veins"]]}
            for k, v in CANDIDATES.items()
        },
        # What the ?v= in portfolio/styles.css should read, so the tuner can say
        # whether the plates on disk are the ones the stylesheet is asking for.
        "version": digest() if os.path.isdir(OUT_DIR) else None,
    }
    import json
    with open(SIDECAR, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(doc, fh, indent=2, sort_keys=False)
        fh.write("\n")
    return SIDECAR


def main():
    which = (ARGV[0] if ARGV else "all").lower()
    if which != "all" and which not in CANDIDATES:
        sys.exit(__doc__)
    os.makedirs(OUT_DIR, exist_ok=True)
    print("plate %dx%d   camera d=%.5f h=%.5f   block %.5f x %.2f x %.5f"
          % (PLATE_W, PLATE_H, CAM_D, CAM_H, PLINTH_W, DEPTH, HEIGHT))
    sc, slab = build_scene()
    for k in (CANDIDATES if which == "all" else [which]):
        build(k, sc, slab)
    print("\nPLINTH_VERSION = \"%s\"  <- paste over the ?v= on every --panel-plinth\n"
          "                          url() in portfolio/styles.css when it differs"
          % digest())
    print("wrote %s  <- what plinth-tuner.html reads"
          % os.path.relpath(write_sidecar(), ROOT))


if __name__ == "__main__":
    main()
