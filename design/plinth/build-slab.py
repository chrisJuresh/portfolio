#!/usr/bin/env python3
"""Render the Projects Panel's marble plinth as an actual block of stone.

    "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b \
        -P design/plinth/build-slab.py -- [<stone> | proc | photo | added | all]...

Several may be named at once, and are rendered in the order given. `none`
renders nothing and rewrites design/plinth/slab.json alone, which is what a
deleted stone needs — see the group table in main().

There are two families of stone here and they are generated in completely
different ways. `proc` is nero/portoro/marquina/grey, grown out of noise nodes.
`photo` is the gemini-* set, read off a photograph by
design/plinth/build-portoro-maps.py — run that first, it needs no GPU. See `the
stone, photographed` for why both exist and what each one cannot do.

TO ADD A STONE OF YOUR OWN, do not edit the table here — run

    python design/plinth/add-stone.py --src <photo> --name <name>

which builds that photograph's maps into a directory of its own, writes
design/plinth/stones/<name>.json and calls this script to bake the plate. `added`
is the group of stones that arrived that way.

WHY THIS REPLACES design/plinth/build-marble.py. That file painted a plinth: a
photograph of a slab, warped, dropped onto a luminance ramp measured off the
design render, with a specular line drawn where the two faces met. It could not
be made right, and the reason is structural rather than a matter of tuning — it
had no geometry. The plate it wrote was a RECTANGLE, so the block's ends could
not converge, the top face could not be a trapezoid, and the whole thing read as
a lit strip rather than as something with a far side. Every parameter in it was a
guess at what a renderer computes.

So the block is a block now. Cycles, one cube, one camera, two lights, a room for
them to be in, and the silhouette comes out of the alpha channel instead of being
assumed.

THE CAMERA IS SOLVED FROM THE RENDER, NOT CHOSEN. IMG_20260815_153956.jpg is not
in this repository — see the Projects Panel's NOTES.md for why — so
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

WHAT THE LIGHT IS. Two area lights in a room, and their placement is the
reflection and not a look. The top face is polished, so what it shows is whatever
its mirror ray hits: from the near edge that ray leaves at 7.8 degrees and from
the far edge at 6.9, so a source BEHIND the block and just above its surface is
caught by the near rows and missed by the far ones. That is the render's sweep —
dark at the back, 79 at 81% across, falling off the arris — and it is why the key
is behind a block that appears lit from the front. The fill is in front and weak,
and it is most of what the front face is.

Both energies were fitted rather than picked: the profile the plate is scored
against is the render's own, meaned across x 620-2380, and the plate this writes
lands within a couple of levels of it at both ends of both faces — 34 to 80 on the
top face against a render that runs 36 to 79, and 27 to 30 on the front against a
flat 30.

WHAT IS NOT FITTED TO THAT PROFILE, deliberately, is anything ACROSS the block.
The reference profile is a mean over x, so it says nothing about the horizontal,
and what filled that silence was two ten-unit emitters against a block 1.19 wide —
which is not a pair of lights but a pair of skies. Every column saw the same solid
angle of them and the plate came out varying by less than a level from one end of
the front face to the other. Nothing real is that even. Both lights are now
narrower than the thing they light, and the room does the rest.

THE STONE IS PROCEDURAL, and in the material rather than in a photograph, which
is the second thing the old pipeline could not do. Texturelabs' slabs are shot
square-on in flat light: they are pictures of albedo, with no reflectance in them
at all. A polished plinth is mostly reflectance. Here the veining drives base
colour, roughness AND bump together, so a vein is rougher than the ground it sits
in and catches the key differently — which is what marble does and what no amount
of warping a flat photograph gets to.

AND THE ROCK HAS A GRAIN, WHICH IS THE THING IT TOOK LONGEST TO NOTICE. Every
field in the first material was isotropic, so the veins were closed blobby loops
wandering equally in all directions and the hairlines were smooth curves. Marble
is a squeezed sediment and a real slab is unmistakably directional; its fine white
network is not veining at all but BRITTLE FRACTURE, which is straight between
junctions and closes into cells. Those two — a bedding shear on every field, and a
Voronoi cell boundary instead of a level set for the hairlines — are what moved
this from a plausible dark texture to something that reads as quarried. See
BEDDING and FRACTURE, which say what each replaced and why the replacement is the
shape it is.

NOT DETERMINISTIC, whatever this file used to say. Cycles is seeded and the
material has no random node, so the PICTURE is reproducible — but the bytes are
not: rendering `nero` twice in a row on the same machine, same Blender, same
everything, gives two different sha256s. The OptiX denoiser is the suspect
(`use_denoising` on a GPU device), and it is not worth turning off to buy a
property nothing here needs.

What it costs is that digest() moves on EVERY bake, so a changed digest is not
evidence that anything changed. If you want to know whether a stone actually
moved, compare the plates. Nothing has to be re-pasted after a render any more:
the plate is named by a url() the build can see, so it is fingerprinted by
content — plinth-studio.py writes the filename and no digest.
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

# WHERE THE ARRIS IS IN THE BLOCK'S OWN TEXTURE SPACE, which is not the origin
# and is the thing every photo-backed stone is windowed against. build_scene()
# applies the cube's SCALE and leaves its LOCATION on the object, so `Object`
# texture coordinates run ±DEPTH/2 and ±HEIGHT/2 about the block's centre while
# WORLD coordinates run 0..DEPTH and -HEIGHT..0 about the arris. The two are a
# half-block apart on each axis, and build_photo_material() subtracts exactly
# that. See the note there for what it looked like when it did not.
ARRIS_Y = -DEPTH / 2.0                           # local y of the front-top edge
ARRIS_Z = HEIGHT / 2.0                           # ...and its local z

LENS = 50.0
_x_half = NEAR_HALF / CAM_D
_y_top = (0.0 - CAM_H) / (DEPTH + CAM_D)         # the far edge -> top of frame
_y_bot = (-HEIGHT - CAM_H) / CAM_D               # the front foot -> bottom
SENSOR = 2.0 * LENS * _x_half
SHIFT_Y = ((_y_top + _y_bot) / 2.0) * LENS / SENSOR

PLATE_W = 3000                                   # the rung build-marble.py used
PLATE_H = int(round(PLATE_W * (_y_top - _y_bot) / (2.0 * _x_half)))


# ---------------------------------------------------------------------------
# the room
# ---------------------------------------------------------------------------
# THE WORLD WAS BLACK AND THAT IS MOST OF WHY THE STONE READ AS PAINT. At
# BASE_ROUGH the top face is very nearly a mirror, and Fresnel at this camera
# makes it a strong one: the eye is 7.8 degrees above the surface, so the angle
# of incidence is 82 degrees and Schlick against IOR 1.55 gives 0.51. Half of
# what the top face shows is not its own colour at all — it is whatever is in
# front of the mirror. Against a black world that is nothing, so the face fell
# back on its diffuse term, which for a ground of 0.019 is almost nothing too,
# and the two area lights were the only things in the picture. A near-black
# diffuse surface with two specular lobes on it is a photograph of charcoal.
#
# So there is a room now. Not an HDRI — the site carries no binary it does not
# render — but the two things a room actually is at these angles:
#
#   the ramp   how bright the surround is at each elevation, from the floor
#              below the block through the horizon to the ceiling. Stops are
#              (elevation, level) with elevation 0 straight down, 0.5 the
#              horizon and 1 straight up, in LINEAR light.
#   the lobe   one soft source off the axis, because a room lit evenly from
#              every direction is a lightbox and reads as one. Direction, angular
#              half-width in degrees, and level at its centre.
#
# WHAT EACH FACE ACTUALLY SEES, which is what these were shaped against and the
# reason neither is a guess at "a nice environment":
#
#   the top face grazes. Its mirror ray leaves at 6.9 degrees at the far edge and
#     7.8 at the near, so across the whole visible strip it samples elevation
#     0.512 to 0.568 of this ramp and nothing else. The stops there are what set
#     the face's floor; the SWEEP along it is still the key's, because an area
#     light two units away varies across a block and a distant surround cannot.
#   the front face looks back at the camera, so its mirror ray is the view ray
#     with the sign of y flipped: elevation 0.418 to 0.432, again a sliver. What
#     varies across that face is AZIMUTH — the reflected ray swings a quarter
#     turn either side of centre over the block's width — which is why the lobe
#     is off-axis and why it, and not the ramp, is what stopped the front face
#     from being one flat number at every one of its 3000 columns.
#
#   the chamfer looks STRAIGHT UP. Its normal is halfway between the two faces,
#     so the ray it mirrors leaves at 82 degrees — it is the one surface on the
#     block that sees the ceiling, and with the ceiling at 0.003 it came out at
#     level 9 between two faces at 78 and 21. A black wire where the arris should
#     be is worse than the hard step it replaced. The ceiling is lit because a
#     ceiling is: that stop, and only that stop, is what makes the chamfer read
#     as a cut edge catching the light.
WORLD = [
    (0.00, 0.0026),   # straight down: the floor the block stands on, unlit
    (0.36, 0.0040),
    (0.47, 0.0125),   # just under the horizon, where the front face looks
    (0.52, 0.0034),
    (0.58, 0.0030),   # the band the top face grazes - the key does the rest
    (0.72, 0.0120),
    (1.00, 0.0180),   # the ceiling, which is what the chamfer has to catch
]
# direction (need not be unit), half-width in degrees, level at the centre.
# Up, forward and to the left, which is where the fill already was and where the
# design render's own soft side light has to have been.
ROOM_LOBE = ((-0.62, -0.74, 0.26), 46.0, 0.030)

# ---- and what the top face has never had anything of ----------------------
# Read the ramp again at the band the top face grazes: 0.52 is 0.0034 and 0.58
# is 0.0030. Flat. So the mirror that is half of that face is pointed at a
# featureless grey wall, and every bit of variation up there comes from the key
# light instead. That is why the top face reads as a swept gradient rather than
# as a polished surface in a room, in EVERY stone in this file, procedural or
# photographic — it is a property of the surround, not of the marble, and no
# amount of work on the stone was ever going to fix it.
#
# What is missing is AZIMUTHAL structure. The ramp cannot supply any: it is a
# function of elevation alone, so raising the stops the top face reads just
# makes the whole face brighter by the same amount everywhere. But the mirror
# ray off the top face swings about 14 degrees either side of straight ahead
# across the block's width, so anything placed in THAT arc is reflected at a
# particular position along the plinth — which is what makes a polished slab
# look like polished stone in a room rather than like a lit gradient.
#
# `flat` is the fitted room exactly as it was, and is the default, because the
# stones have to be compared against each other on terms that did not move.
# `gallery` adds three sources in that arc — two narrow and one broad and high —
# and changes nothing else. It is offered as a variant rather than switched on,
# because the levels in WORLD were fitted against a measured profile and this is
# the one change here that moves what that profile would read.
#
# AND THE BLACK IS NOT BLACK, which is the other thing only the surround can
# fix and the one that was actually wrong. Measured on the front face of the
# rendered plate against the source photograph it is cut from:
#
#     source photograph, its ground     p5   5.9   p25   8.0   p50  11.0
#     rendered `gemini`, front face     p5  24.0   p25  24.0   p50  24.0
#
# Three times too light — but read the SHAPE of it rather than the size. Those
# three numbers are the same number. The ground is pinned at a flat 24 whatever
# the texture underneath it says, and a floor that does not vary with the albedo
# is not albedo: it is light being added on top of it. The front face's mirror
# ray leaves at elevation 0.418 to 0.432, which lands between the 0.36 and 0.47
# stops of WORLD, and 0.47 is 0.0125 — the brightest stop in the lower half of
# the ramp. The front face is reflecting that, and reflecting it evenly at all
# 3000 columns, which is exactly a flat floor.
#
# So no grade can fix it. `deep` and `gold` already crush the ground to almost
# nothing and both still measure 24, because they are turning down a term that
# is not the one doing the damage — which is the same shape of mistake as tuning
# a vein generator that cannot make the vein.
#
# The levels themselves were not wrong when they were set. They were fitted
# against the design render, whose stone is the much lighter `nero`, and a
# surround that flatters a mid-grey marble drowns a black one. A black stone
# needs a darker room; that is a fact about black stone.
ROOMS = {
    # The fitted room, untouched, and the default. Every procedural stone goes
    # on using it so the four of them stay comparable with what shipped.
    "flat": {"mul": (1.0,) * 7, "lobe": 1.0, "extra": ()},
    # Same levels, plus three sources in the arc the top face sweeps.
    "gallery": {"mul": (1.0,) * 7, "lobe": 1.0, "extra": (
        ((0.22, 0.95, 0.13), 9.0, 0.022),    # a narrow source, right of centre
        ((-0.30, 0.93, 0.11), 13.0, 0.013),  # a softer, wider one to the left
        ((0.02, 0.99, 0.30), 26.0, 0.008),   # and the wash off a high ceiling
    )},
    # A DARK ROOM WITH BRIGHT THINGS IN IT, which is not the same as a dim room
    # and the difference is the whole point.
    #
    # The first attempt at this scaled every stop by about a third and moved the
    # black from 24 to 21. Almost nothing, because turning the whole surround
    # down turns the highlights down with it: the picture gets darker and stays
    # just as flat. A reference slab is not uniformly dim. It is BLACK, with a
    # few small hard bright hits in particular places — a ceiling spot, the edge
    # of a window — and everywhere between them it is black.
    #
    # THE TWO TERMS COME APART CLEANLY once you notice they act through
    # different channels:
    #
    #   DIFFUSE does not lift a black ground and cannot. The ground's albedo is
    #     0.003, so multiply it by as much light as you like and it stays near
    #     zero — while the calcite at 0.86 and the gold light up in proportion.
    #     Diffuse light is therefore FREE contrast: it is what makes the veins
    #     visible without touching the black at all. That is why a real slab
    #     photographs black against a bright grey wall.
    #   SPECULAR is what pinned the floor at 24, and a smooth surface mirroring
    #     a BROAD EVEN emitter returns the same radiance at every pixel, which
    #     is a veil by construction. The elevation ramp is exactly such an
    #     emitter — it is smooth in elevation and constant in azimuth, so there
    #     is nothing in it that could ever land in one place rather than another.
    #
    # So: crush the ramp, because it is the mirrored term and only the mirrored
    # term. Leave KEY and FILL alone, because they are small — their specular is
    # a local highlight rather than a wash, and their diffuse is what lights the
    # veining. Then put back, deliberately, the handful of narrow bright sources
    # that a mirror is supposed to show, at the angles each face actually looks.
    #
    # ...AND THAT WAS STILL NOT IT. Crushing the 0.47 stop by sixteen times moved
    # the black from 24 to 21. Three levels. So the ramp was not what was pinning
    # it either, and the reasoning above — correct as far as it goes — was
    # pointed at the wrong broad even emitter. There is a second one.
    #
    # FILL is 3.4 by 2.0 units, 1.4 in front of a block 1.19 wide. From the front
    # face that subtends roughly 100 degrees by 70: it fills the entire specular
    # lobe and then some, so what the face mirrors is FILL, at every column, at
    # the same radiance. It is not a light in front of the stone, it is a wall of
    # light in front of the stone. The header three hundred lines up already
    # worked out that two ten-unit emitters were "not a pair of lights but a pair
    # of skies" and narrowed them — and 3.4 x 2.0 against a block 1.19 wide is
    # still a sky. The narrowing stopped one size too early.
    #
    # THE ENERGY DOES NOT CHANGE, only the size, and that is the whole trick.
    # A Cycles area light's energy is total watts, so shrinking it at fixed
    # energy holds the DIFFUSE illumination roughly constant — from a distance a
    # small bright source and a large dim one of the same wattage light a surface
    # identically — while collapsing the SPECULAR from a veil across the whole
    # face into a highlight in one place. Which is the asymmetry this whole room
    # is built to buy, and it turns out the lights needed it more than the ramp.
    "noir": {
        "mul": (0.15, 0.15, 0.06, 0.18, 0.20, 0.25, 0.70), "lobe": 0.05,
        # (at, w, h, energy, rx). THE SIZE IS SET BY AN ANGLE, not by taste, and
        # this took three goes to see. What a smooth face shows of a light is
        # the light's own ANGULAR size, so whether a source reads as a highlight
        # or as a veil is decided by comparing that against the arc the face
        # sweeps — and the front face sweeps +-14 degrees of azimuth across the
        # whole block. At FILL's 1.4 units away, 14 degrees is 0.35 units. So:
        #
        #   3.40 wide  subtends ~100 deg.  covers the face 3.5x over -> a veil
        #   1.15 wide  subtends ~45 deg.   still covers all of it -> still a veil
        #   0.30 wide  subtends ~12 deg.   lands on ~40% of the width -> a hit
        #
        # Anything wider than about a third of a unit is a wall, however dim it
        # is made, and dimming a wall was the first attempt. The energy comes
        # down too, but for the other reason: at 0.30 wide the area is 100x
        # smaller than it started, so the original wattage clips the highlight
        # to flat white, and a clipped highlight only moves when it shrinks.
        "key": ((0.0, 2.5, 0.39), 0.55, 0.10, 0.105, -80.0),
        "fill": ((-0.30, -1.4, -0.04), 0.30, 0.20, 1.10, 90.0),
        # AND THE THING THAT MAKES THE WHOLE SPLIT POSSIBLE. Sizing FILL down
        # to a highlight blacked the ground out properly and took the veining
        # with it — p50 1, p95 52, a black slab with nothing on it — because the
        # light that was veiling the mirror was also the light that lit the
        # calcite. Every setting of one source trades one against the other:
        # broad enough to light the veins IS broad enough to veil, at any
        # brightness. There is no size that satisfies both.
        #
        # So use two sources and take the coupling out at the renderer. A light
        # with `visible_glossy` off is computed for diffuse and skipped for
        # specular — it lights the stone and is not IN the stone. That is not a
        # physical object, and it is not pretending to be: it is the diffuse
        # half of a room whose specular half is the four narrow lobes above,
        # split apart so each can be set for what it actually does. Broad, dim,
        # in front and slightly above, which is where a room's light comes from.
        "wash": ((-0.10, -1.30, 0.55), 3.20, 2.20, 17.0, 72.0),
        # Narrow and BRIGHT — level of order 1 against a ramp of order 0.001,
        # and a few degrees wide against the old lobe's 46. A source this small
        # contributes essentially nothing diffusely (it subtends almost no solid
        # angle) and everything specularly, which is precisely the asymmetry
        # being bought.
        #
        # The directions are the two faces' mirror rays, worked out rather than
        # placed by eye. Reflecting the view ray about each face's normal:
        #   front face  r = (x, -2.43, z - 0.332), so it points BACK past the
        #     camera and slightly down — about -8 degrees elevation — and swings
        #     +-14 degrees in azimuth across the block's width.
        #   top face    r = (x, +2.43, +0.332): forward, about +8 degrees up,
        #     the same +-14 either side.
        # An azimuth inside those arcs lands somewhere along the plinth; one
        # outside is reflected into the void and does nothing at all.
        "extra": (
            ((-0.30, -0.94, -0.13), 5.0, 0.55),   # front face, left of centre
            ((0.19, -0.97, -0.13), 4.0, 0.40),    # front face, right of centre
            ((0.10, 0.98, 0.13), 4.0, 0.22),      # top face, a ceiling spot
            ((-0.24, 0.96, 0.12), 6.0, 0.12),     # top face, a softer one
        ),
    },
}
# ...and the same room with the Frame standing in it as an actual light.
#
# WHY THIS IS NOT ALREADY THE CASE, and it is a fair question: the Panel's
# reflection is drawn in CSS, by flipping the live Frame element under the
# plinth. That has to stay live, because what is INSIDE the Frame is a video
# that changes. But the Frame is also a metre of lit white screen standing on a
# polished black slab, and NONE of that has ever reached the plate — the block
# is baked alone, in a room the Frame is not in, and then a reflection is pasted
# under it afterwards. The stone has never been lit by the brightest object in
# the composition.
#
# The two halves come apart cleanly, and only one of them needs to be live:
#
#   what MOVES   the pixels inside the Frame, hence the mirror image of them.
#                Stays in CSS, unchanged.
#   what DOES NOT   the Frame's position, its size, and the fact that a
#                light-mode browser window is a large soft near-white emitter
#                a third of a unit above the stone. Fixed geometry, fixed
#                brightness, no reason on earth for it to be computed at 60fps
#                in a browser rather than once in Cycles.
#
# So this bakes the illumination and leaves the reflection alone. The Frame is
# one unit wide by definition — model units ARE Frame widths — it stands on the
# contact line, and it faces the camera, so what it mostly does is wash the top
# face from the contact line forward and skim the arris. That glow is the cue
# that the two objects are in the same room, and the contact SHADOW in
# `.panel-plinth::after` has been carrying that job alone and unaided.
SCREEN = ((0.0, 0.145, 0.30), 1.0, 0.60, 2.6, 90.0)
ROOMS["screen"] = dict(ROOMS["noir"], screen=SCREEN)


# ---------------------------------------------------------------------------
# the light
# ---------------------------------------------------------------------------
# (x, y, z), width, depth, energy, x-rotation in degrees. See WHAT THE LIGHT IS.
#
# THE KEY IS 2.6 WIDE AND NOT 10, and that is the second thing the flatness was.
# A 10-unit emitter over a 1.19-unit block is not a light, it is a sky: every
# column of the block sees the same solid angle of it, so the plate came out
# 21.2 at x=0 and 21.9 at x=3000 — seven tenths of a level of variation across
# the whole face, which no real object has anywhere on it. At 2.6 the block's
# ends are past the emitter's own ends and fall off, which is what a lit thing
# does.
#
# AND THE ENERGIES MOVED WITH THE SIZES, which is not a re-fit but arithmetic.
# A Cycles area light's energy is TOTAL WATTS over the whole emitter, not
# radiance, so narrowing one at a fixed energy makes it brighter in proportion:
# the key lost 3.85x of its area and would have come back 3.85x as bright per
# unit of it. Both are scaled by their own area ratio first — 1.00 x 0.364/1.4
# and 7.00 x 6.8/20 — and only then trimmed for the room, which now carries some
# of what the two lights used to carry alone.
KEY = ((0.0, 2.5, 0.39), 2.6, 0.14, 0.300, -80.0)
# THE FILL SITS BELOW THE TOP FACE, at z = -0.04, and that is the one placement
# decision in here that is not about brightness. A fill in front at any positive
# height lights BOTH faces, and what it does to the top one is raise its floor —
# which flattens the key's sweep, so the ramp came out 64 -> 82 against a render
# that runs 36 -> 79. Below the surface it cannot reach the top face at all: the
# normal points away from it, diffuse and specular are both zero, and the sweep
# is the key's alone. The front face, whose normal points at it, is unaffected.
FILL = ((-0.30, -1.4, -0.04), 3.4, 2.0, 3.30, 90.0)
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

# THE ARRIS IS CUT, NOT INFINITELY SHARP. The old plate stepped 86 -> 45 -> 20 in
# two pixels where the two faces met, which is a shape no cut stone has: a
# polished block's edge carries a chamfer a fraction of a millimetre across, and
# what that does here is give the step somewhere to happen. In model units the
# front face is 0.0700 tall over 173 plate rows, so a unit of height is about
# 2470 px and this is a little over one of them. Two segments, and on every edge
# of the block, because a sawn slab is chamfered everywhere and not only where
# it is convenient.
#
# IT IS NOT A HIGHLIGHT AND CANNOT BE MADE ONE, which is worth writing down
# because the obvious next move is to go looking for the bright hairline a
# chamfer has in a photograph and to keep raising things until it appears. This
# chamfer's normal is halfway between the two faces, so it mirrors a ray leaving
# at 82 degrees — straight up, at the ceiling — while its own angle of incidence
# is 37, where Schlick against IOR 1.55 gives 0.047. It reflects four percent of
# whatever is overhead. The ceiling stop in WORLD was raised sixfold chasing this
# and moved the chamfer nine levels to eleven; the key cannot help either, being
# behind a facet that faces forward. A chamfer that reads DARKER than both faces
# is what a polished front arris does in a room lit from behind, and it is right.
# So this is sized to soften the step over a row or two and not to draw a line:
# at 0.0011 it was three rows deep and read as a black seam.
BEVEL = (0.00055, 2)

# ---- what keeps the ground from being one number --------------------------
# (scale, detail, swing). The ground colour was a CONSTANT, so every square
# millimetre of rock between the veins was the same rock. Marble is a sediment:
# it clouds. `swing` is the fraction either side of the stated ground colour that
# the cloud carries it, so 0.55 means the darkest ground is 0.45 of the nominal
# and the lightest 1.55 of it — a lot, and it has to be, because the veins are
# the only other thing in the picture and a clean ground is what made them read
# as wire on a plate rather than as seams in a rock.
GROUND_MOTTLE = (2.6, 3.0, 0.22)

# ---- the rock has a GRAIN, and nothing above this line knew it ------------
# THE DEEPEST THING WRONG WITH THE STONE, and no amount of tuning the veins was
# ever going to reach it. Marble is a metamorphosed sediment: it was laid down in
# beds and then squeezed, so every seam in a slab runs in very nearly the same
# direction, and what a cut face shows is a set of roughly parallel swathes at
# one angle with cross-fractures between them. Look at any Portoro slab — the
# gold and the white both run corner to corner and the eye reads that direction
# before it reads anything else.
#
# Every field in this material was ISOTROPIC. A level set of an isotropic noise
# has no preferred direction by construction, so what it draws is closed blobby
# loops that wander equally in every direction — and a rock with no grain does
# not exist, which is why the result read as a pattern rather than as stone no
# matter how the veins themselves were shaped.
#
# So the whole material is evaluated in a sheared frame: (tilt in degrees about
# the depth axis, compression across the bedding). The tilt is the angle the
# seams make on the FRONT face, which is the face with area; on the top face the
# same bedding runs along the block, which is what a polished edge shows anyway
# under a 30:1 foreshortening. The compression is what makes a feature long: at
# 3.8 the field varies nearly four times faster across the bedding than along it,
# so a level set of it comes out as a swathe rather than as a loop. Past about
# four it stops reading as bedding and starts reading as COMBED — every seam
# exactly parallel to every other, which is a texture and not a rock.
BEDDING = (26.0, 3.0)
# ...and the same for the POLISH, which is not even either. A slab is lapped, not
# optically flat, and the residual is a long-wavelength variation in how well it
# takes the light. (scale, detail, swing in absolute roughness.) At BASE_ROUGH
# 0.07 this runs the surface between 0.035 and 0.105, which is the difference
# between a hard reflection and a slightly milky one — across the same stone.
POLISH = (7.5, 2.0, 0.035)
# The grain under everything, on the BUMP only: a fine tooth so the ground is not
# a geometric plane between veins. (scale, detail, weight.)
TOOTH = (240.0, 2.0, 0.16)

# ---- what makes a vein a vein and not a contour ---------------------------
# A LEVEL SET AT A FIXED WIDTH IS A CONTOUR LINE, and that is what the last plate
# drew: |f - 1/2| < width is a band whose thickness is set by how fast f crosses
# its middle, and f's gradient is very nearly constant everywhere, so every vein
# in the rock came out the same width as every other. That is the single thing
# most responsible for the stone reading as scratches on a dark surface — real
# veining swells into swathes and thins to filaments along its own length, and it
# is the VARIATION that says "mineral" rather than "pen".
#
# So the width is itself a field. (scale divisor, detail, swing): the modulating
# noise runs at the vein set's own scale divided by the first number, so its
# features are three-odd vein spacings across and a vein therefore swells over
# one stretch and thins over the next rather than beading. Swing is the fraction
# either side of the stated width, so 0.62 runs each vein between 0.38x and 1.62x
# of it — a better than fourfold range between its thinnest and its thickest.
WIDTH_SWING = (3.4, 2.0, 0.62)
# ...and a vein does not end at its own edge. Calcite bleeds into the rock it
# grew in, so there is a soft aureole around every seam that carries some of its
# colour and some of its roughness and no sharp boundary at all. The old material
# had none: the vein colour stopped dead at the mask's edge, which is the other
# half of the wire. (span in core widths, falloff, how much colour it carries,
# how much roughness.)
HALO = (3.6, 2.1, 0.145, 0.34)
# ...and a vein set does not reach the whole slab. THIS IS THE DEEPEST OF THE
# PROCEDURAL TELLS and the last one left: a level set of a noise field has the
# same vein density in every cubic centimetre of the block, because the field
# has the same statistics everywhere. Nothing quarried is like that. A slab has
# clean stretches and shattered ones, and the eye reads uniform density as
# "generated" long before it can say why — it was reading it here as a screen of
# wire laid over the whole face at one spacing.
#
# So each set is gated by a field of its own at a few vein spacings across.
# (scale divisor, detail, gate lo, gate hi): below `lo` the set is not in this
# part of the rock at all, above `hi` it is fully there, and the stretch between
# is where a seam peters out — which is how they end, rather than by stopping.
VEIN_DENSITY = (6.5, 3.0, 0.38, 0.64)

# ---- the hairlines are CRACKS, and a level set cannot draw one ------------
# The other half of what the reference slab has and this material did not. A
# marble's fine white network is not a vein at all: it is BRITTLE FRACTURE, the
# rock broken and the breaks refilled with calcite. Fractures are straight
# between junctions, they meet each other at angles, and they close into
# polygonal cells — which is the one shape a noise level set can never make,
# because a level set of a smooth field is a smooth curve and its junctions are
# rounded. Every hairline in here was a smooth wandering loop, and a screen of
# smooth wandering loops is what "drawn rather than quarried" looks like.
#
# A Voronoi distance-to-edge IS that network, exactly and for the same reason
# fracture is: it is the set of points equidistant from two nuclei, so it is
# straight between junctions and meets in threes. Warped a little so it is not
# obviously a lattice, sheared by BEDDING with everything else, and thresholded
# to a width. (scale, randomness, width, sharpness, warp scale, warp amount).
FRACTURE = (13.0, 0.86, 0.013, 1.7, 3.0, 0.30, 2.4, 0.40, 0.70)

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
# ...and a `fracture`, which is the white hairline network and is NOT one of the
# vein sets: it is a Voronoi cell boundary rather than a level set, for the
# reason FRACTURE gives, and it is shaped once for every stone because a rock
# breaks the same way whatever colour it is. Only what fills the breaks changes:
#
#   (colour, roughness, bump, strength)
#
# THE GROUNDS ARE BLACKER AND THE VEINS ARE BRIGHTER than they were, and the two
# go together. A reference slab of Portoro is very nearly black between its
# seams and its calcite is very nearly white — the stone is almost all contrast,
# and it was being drawn here as mid-grey lines on dark-grey rock, which is the
# same picture with its dynamic range thrown away. What made that worse rather
# than better was reaching for the ground mottle and the vein halo to add
# "interest": both raise the floor, and a lifted floor under lowered veins is
# exactly how stone comes out looking like dusty concrete.
GROUND = "ground"
CANDIDATES = {
    # The design render's own stone: a near-black with fine white veining, which
    # is what IMG_20260815_153956.jpg draws and what #57 describes.
    "nero": {
        "title": "near-black with fine white veining - the design render's stone",
        GROUND: (0.0075, 0.0070, 0.0074),
        "veins": [
            (8.0, 5.0, 1.1, 0.030, 2.4, (0.52, 0.515, 0.52), 0.30, 0.42),
            (17.0, 4.0, 1.2, 0.013, 2.9, (0.74, 0.735, 0.74), 0.24, 0.26),
        ],
        "fracture": ((0.80, 0.795, 0.79), 0.20, 0.22, 0.85),
    },
    # Nero Portoro: a black ground under a branching CREAM-AND-GOLD network with
    # white hairlines through it. Three sets rather than two, because the gold is
    # a swathe and the white is a filament and they are not the same rock — and
    # the hairlines are the fracture below rather than a set at all.
    "portoro": {
        "title": "Nero Portoro - black with gold swathes and white hairlines",
        GROUND: (0.0052, 0.0048, 0.0052),
        "veins": [
            (5.0, 5.0, 1.5, 0.052, 2.3, (0.62, 0.40, 0.10), 0.46, 0.62),
            (9.5, 4.0, 1.3, 0.026, 2.7, (0.86, 0.68, 0.30), 0.36, 0.46),
            (19.0, 4.0, 1.2, 0.013, 3.0, (0.92, 0.90, 0.86), 0.26, 0.30),
        ],
        "fracture": ((0.90, 0.89, 0.87), 0.22, 0.24, 1.00),
    },
    # Nero Marquina: the same black, but the veining is bold white and there is
    # much less of it. The plainest of the four and the most familiar.
    "marquina": {
        "title": "Nero Marquina - black with bold white veining",
        GROUND: (0.0058, 0.0054, 0.0058),
        "veins": [
            (4.5, 4.0, 1.2, 0.048, 2.2, (0.90, 0.89, 0.87), 0.36, 0.58),
            (13.0, 4.0, 1.2, 0.015, 2.9, (0.70, 0.695, 0.69), 0.26, 0.24),
        ],
        "fracture": ((0.82, 0.815, 0.80), 0.20, 0.20, 0.70),
    },
    # ...and one that is not black at all, because a plinth is allowed to be
    # plain stone and the Panel's ground is already very dark.
    "grey": {
        "title": "dark grey with soft pale veining",
        GROUND: (0.030, 0.0295, 0.031),
        "veins": [
            (7.0, 4.0, 1.0, 0.044, 2.4, (0.44, 0.44, 0.45), 0.32, 0.34),
            (16.0, 4.0, 1.1, 0.017, 2.8, (0.62, 0.62, 0.63), 0.24, 0.22),
        ],
        "fracture": ((0.66, 0.66, 0.67), 0.20, 0.18, 0.60),
    },
}


# ---------------------------------------------------------------------------
# the stone, photographed
# ---------------------------------------------------------------------------
# Everything above grows a stone out of noise. Everything below reads one off a
# photograph, and the reason for having both is that they fail in opposite
# directions and the comparison is the point.
#
# WHAT THE PROCEDURAL ONE CANNOT DO, and it is structural rather than a matter
# of tuning: a vein up there is a level set of a smooth field, and a level set
# of a smooth field is a closed rounded loop. The hairlines are a Voronoi cell
# boundary, and a cell boundary is a honeycomb. Portoro is neither — it is a
# connected branching network whose trunks open into patches several percent of
# the slab across and close to a filament within a hand's width. That shape is
# not reachable from those generators at any setting, which is why an evening of
# moving CANDIDATES around got closer every time and was still wrong.
#
# WHAT THE PHOTOGRAPH CANNOT DO is respond to light. It was taken under one
# fixed lamp, and every highlight in it is where THAT lamp was, not where the
# key is here.
#
# So neither one is wired in whole. design/plinth/build-portoro-maps.py takes
# the photograph apart into what it genuinely knows — where the veins go, which
# mineral each pixel is, and the relief that survives polishing — and throws
# away what it only appears to know, which is the lighting. What comes back is
# four maps, and Cycles lights them here. See that file's header for the split.
#
# NOTHING BELOW USES bedded(). The BEDDING shear exists to give a procedural
# field the grain that a real rock has; a photograph of a real rock arrived with
# its grain already in it, and shearing it a second time would be squeezing an
# already-squeezed sediment.
MAPS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "maps")

MISSING_MAPS = """\
missing %s

The photo-backed stones need the maps that design/plinth/build-portoro-maps.py
writes, and neither those nor the photograph they come from are committed - see
the .gitignore note about /Texturelabs_*.jpg, which these follow. Run:

    python design/plinth/build-portoro-maps.py

...from a tree that has the source photograph at its root. NOTE THAT A WORKTREE
DOES NOT: git only puts tracked files in one, so an ignored source sitting in
the main checkout is simply absent here. Copy it across first."""

MISSING_ADDED_MAPS = """\
missing %s

`%s` was added from a photograph by design/plinth/add-stone.py, and the maps it
built are not in the repository - design/plinth/maps/ is gitignored, so they
exist only in the tree they were built in and a fresh checkout or a fresh
worktree has none of them. What ships is the plate and the entry. Rebuild them
from the same photograph%s:

    python design/plinth/add-stone.py --src <photo> --name %s --replace"""

# A photo stone is a grade, a scale, a window and a surface model.
#
#   grade    which basecolor-*.png, so which of build-portoro-maps.py's GRADES
#   scale    tiles ACROSS per model unit, and a model unit IS a Frame width, so
#            the block is 1.19 of them. scale 0.84 lays exactly one slab across
#            the plinth; 0.42 crops into half a slab and the figure doubles in
#            size; 1.75 lays two down and the veining goes fine and jewel-like.
#            This is the single strongest control in the table and it is not a
#            quality setting - it is how big the rock is. Across only: the two
#            V axes get this times the source's aspect, so the rock stays the
#            same shape it is in the photograph - see build_photo_material().
#   offset   where in the slab the block was cut from. Only a sliver is ever
#            seen (the front face is 0.07 units tall and the top face 0.30 deep,
#            foreshortened about eight to one), so this decides which veins land
#            on the plinth at all, and it matters roughly as much as the grade.
#            It is in TILES and it is applied AFTER the scale, so the arris sits
#            at exactly this fraction down the image whatever the scale is: the
#            aspect correction left every value here anchored where it was and
#            only made the window it opens 1.83x taller.
#   bump     (strength, distance) for the height map, AND IT IS THE MOST
#            DELICATE NUMBER IN THE TABLE, for a reason that is not obvious
#            until it is rendered. The top face is seen at 7.8 degrees. At that
#            angle Fresnel is about 0.5 and the face is essentially a MIRROR —
#            `gemini-plain`, which has no relief at all, shows no veining on it
#            whatsoever, just a smooth sweep, because the albedo is swamped by
#            the room. So every bit of visible structure up there is the room
#            being bent by the surface normal, which means bump is not adding
#            texture to the top face, it is adding DISTORTION to a reflection,
#            and the amplification at grazing incidence is severe. At 0.0016 the
#            plinth comes out honed; the relief that actually survives polishing
#            is sub-micron, and the number has to say so.
#   sss      Subsurface Weight through the calcite mask. THIS IS THE ONE THAT
#            MATTERS MOST PER UNIT OF EFFORT. Calcite is translucent: light goes
#            into the crystal, scatters and comes back out somewhere else, and
#            that is most of why real marble looks deep and wet while a flat
#            albedo looks like painted card. It is one socket and it has never
#            been connected on this plinth in any version of it.
#   coat     (weight, roughness). A polished slab is not one surface, it is a
#            very smooth one over a slightly less smooth one, and Coat is
#            exactly that second lobe. Cheap, and it is what "polished" looks
#            like as opposed to "shiny".
#   rough    multiplies the roughness map. 0 pins it flat at BASE_ROUGH instead,
#            which is the deliberately crippled control - see `gemini-plain`.
#   crack    lay the procedural FRACTURE network over the photograph as well
#   room     which ROOM_EXTRA surround to render in. Absent means "flat", which
#            is the fitted one every other stone in the file uses.
PHOTO_FIELDS = ("grade", "scale", "offset", "bump", "sss", "coat", "rough",
                "crack", "room")
PHOTO_CANDIDATES = {
    # The proposition. Deep grade, one slab across the plinth, every map wired.
    "gemini": {
        "title": "Gemini Portoro - deep grade, life size, full surface model",
        "grade": "deep", "scale": 0.84, "offset": 0.40,
        "bump": (0.22, 0.00035), "sss": 0.65, "coat": (0.35, 0.020),
        "rough": 1.0, "crack": False,
    },
    # THE CONTROL, and it is here to be beaten rather than to be chosen. This is
    # the whole of what "just use the photograph" means: colour in, nothing
    # else, one flat roughness over the lot. If the maps are worth their
    # complexity the difference between this and `gemini` is where it shows.
    "gemini-plain": {
        "title": "control - photo in Base Color only, flat polish, no relief",
        "grade": "asis", "scale": 0.84, "offset": 0.40,
        "bump": (0.0, 0.0), "sss": 0.0, "coat": (0.0, 0.0),
        "rough": 0.0, "crack": False,
    },
    # The photograph as it was taken, but lit properly and with the relief and
    # the translucency it always implied. Between this and `gemini` is the grade
    # on its own, with everything else held still.
    "gemini-asis": {
        "title": "faithful grade, full surface model - the photo, lit",
        "grade": "asis", "scale": 0.84, "offset": 0.40,
        "bump": (0.22, 0.00035), "sss": 0.65, "coat": (0.35, 0.020),
        "rough": 1.0, "crack": False,
    },
    # Portoro d'Oro. Further from the photograph and closer to what the stone is
    # sold as; "most gorgeous" and "most faithful" were not the same request.
    "gemini-gold": {
        "title": "Portoro d'Oro - the gold pushed, showy rather than faithful",
        "grade": "gold", "scale": 0.84, "offset": 0.40,
        "bump": (0.24, 0.00035), "sss": 0.70, "coat": (0.40, 0.018),
        "rough": 1.0, "crack": False,
    },
    # Half a slab across the plinth, so the figure doubles and one gold swathe
    # runs the length of it. A big-figure book-matched look.
    "gemini-wide": {
        "title": "big figure - half a slab across the block, swathes dominate",
        "grade": "deep", "scale": 0.42, "offset": 0.52,
        "bump": (0.20, 0.00045), "sss": 0.65, "coat": (0.35, 0.020),
        "rough": 1.0, "crack": False,
    },
    # Two slabs across, so the network goes fine and dense. Reads as a smaller,
    # more precious object - which a plinth under a browser window arguably is.
    "gemini-fine": {
        "title": "fine figure - two slabs across, dense jewel-like network",
        "grade": "deep", "scale": 1.75, "offset": 0.30,
        "bump": (0.22, 0.00022), "sss": 0.60, "coat": (0.35, 0.020),
        "rough": 1.0, "crack": False,
    },
    # The hybrid, and the one honest use left for the procedural generator: the
    # photograph brings the branching network no noise field can make, and
    # FRACTURE lays a crisp hairline crack over the top of it that is sharper
    # than a JPEG can hold at this magnification. Cracks post-date everything,
    # so laying them last is also the right geology - see the note above
    # `fracture_mask` in build_material().
    "gemini-crack": {
        "title": "hybrid - photo structure under a procedural hairline network",
        "grade": "deep", "scale": 0.84, "offset": 0.40,
        "bump": (0.22, 0.00035), "sss": 0.65, "coat": (0.35, 0.020),
        "rough": 1.0, "crack": True,
    },
    # THE ONLY ONE HERE THAT IS NOT ABOUT THE STONE. Same material as `gemini`
    # to the last decimal; the difference is entirely the surround. This is the
    # lighting answer rather than a marble answer — see ROOM_EXTRA for why the
    # top face could never be fixed from the material side, and note that it is
    # the one variant whose luminance profile is expected to move.
    "gemini-gallery": {
        "title": "gemini, in a room with something in it - lighting, not stone",
        "grade": "deep", "scale": 0.84, "offset": 0.40,
        "bump": (0.22, 0.00035), "sss": 0.65, "coat": (0.35, 0.020),
        "rough": 1.0, "crack": False, "room": "gallery",
    },
    # ---- and the same stones with the black actually black -----------------
    # `noir` is the fix for the flat 24 that ROOMS explains, and the coat comes
    # off with it: a coat is a second specular layer, so on a black ground it is
    # a second thing lifting the floor, worth about three levels of the twenty
    # four. What is left is the marble's own contrast, which is what the source
    # photograph has and every render above had thrown away.
    "gemini-noir": {
        "title": "gemini in a dark room - the black finally black",
        "grade": "deep", "scale": 0.84, "offset": 0.40,
        "bump": (0.22, 0.00035), "sss": 0.65, "coat": (0.0, 0.0),
        "rough": 1.0, "crack": False, "room": "noir",
    },
    "gemini-noir-gold": {
        "title": "Portoro d'Oro in a dark room - gold against a real black",
        "grade": "gold", "scale": 0.84, "offset": 0.40,
        "bump": (0.24, 0.00035), "sss": 0.70, "coat": (0.0, 0.0),
        "rough": 1.0, "crack": False, "room": "noir",
    },
    "gemini-noir-wide": {
        "title": "big figure in a dark room",
        "grade": "deep", "scale": 0.42, "offset": 0.52,
        "bump": (0.20, 0.00045), "sss": 0.65, "coat": (0.0, 0.0),
        "rough": 1.0, "crack": False, "room": "noir",
    },
    "gemini-noir-fine": {
        "title": "fine figure in a dark room",
        "grade": "deep", "scale": 1.75, "offset": 0.30,
        "bump": (0.22, 0.00022), "sss": 0.60, "coat": (0.0, 0.0),
        "rough": 1.0, "crack": False, "room": "noir",
    },
    "gemini-screen": {
        "title": "dark room, and the Frame standing in it as a real emitter",
        "grade": "deep", "scale": 0.84, "offset": 0.40,
        "bump": (0.22, 0.00035), "sss": 0.65, "coat": (0.0, 0.0),
        "rough": 1.0, "crack": False, "room": "screen",
    },
    "gemini-screen-gold": {
        "title": "the same, with the gold pushed",
        "grade": "gold", "scale": 0.84, "offset": 0.40,
        "bump": (0.24, 0.00035), "sss": 0.70, "coat": (0.0, 0.0),
        "rough": 1.0, "crack": False, "room": "screen",
    },
}

# ---------------------------------------------------------------------------
# ...AND THE STONES ADDED FROM A PHOTOGRAPH OF YOUR OWN
# ---------------------------------------------------------------------------
# design/plinth/add-stone.py takes a photograph, builds a set of maps for it in
# maps/<name>/, and writes design/plinth/stones/<name>.json. Everything above
# reads `maps/`; a stone here reads its own directory, which is the whole of what
# `maps` adds to the table and the reason a second photograph does not overwrite
# the first one's maps.
#
# ONE FILE PER STONE rather than one table, and the reason is what a table costs
# in a repository whose rule is one change per branch: two stones added in two
# worktrees are two new files that merge, where two entries in one JSON object
# are a conflict every time. It also makes deleting a stone `rm` on two paths.
#
# THEY ARE COMMITTED AND THEIR MAPS ARE NOT, which looks lopsided and is the same
# split the gemini-* stones already live under — design/plinth/maps/ is gitignored
# and so is the photograph, and what ships is the plate. So a fresh checkout can
# LIST an added stone and show its plate, and can only RE-BAKE it from the tree
# that has the photograph. See MISSING_ADDED_MAPS.
STONES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "stones")

_REQUIRED = ("title", "grade", "scale", "offset", "bump", "sss", "coat",
             "rough", "crack")


def load_added_stones():
    """Every design/plinth/stones/*.json, merged into PHOTO_CANDIDATES.

    A built-in name is never shadowed. Overwriting `gemini` from a JSON file
    would be a stone that renders as one thing and is documented as another,
    found only by noticing the plate had changed, so the clash is reported and
    the file ignored.
    """
    import json
    added = {}
    for name in sorted(os.listdir(STONES_DIR) if os.path.isdir(STONES_DIR) else []):
        if not name.endswith(".json"):
            continue
        key = name[:-5]
        path = os.path.join(STONES_DIR, name)
        if key in PHOTO_CANDIDATES or key in CANDIDATES or key in PROC_ROOMS:
            print("! %s names a stone this file already defines - ignored"
                  % os.path.relpath(path, ROOT))
            continue
        with open(path, encoding="utf-8") as fh:
            spec = json.load(fh)
        missing = [f for f in _REQUIRED if f not in spec]
        if missing:
            sys.exit("%s is missing %s\n\nRebuild it with design/plinth/add-stone.py."
                     % (os.path.relpath(path, ROOT), ", ".join(missing)))
        # JSON has no tuples and the material unpacks these as pairs; lists work
        # for that, but write_sidecar() decides what to list() by isinstance, so
        # keeping the shape identical to a built-in entry keeps the sidecar - and
        # the tuner's copy-out, which renders Python - identical too.
        for f in ("bump", "coat"):
            spec[f] = tuple(spec[f])
        spec.setdefault("maps", key)
        added[key] = spec
    return added


# ---------------------------------------------------------------------------
# ...AND THE PROCEDURAL STONES, RE-LIT
# ---------------------------------------------------------------------------
# If a surround fitted to a light stone is what flattened the black, then the
# procedural generator was being judged through the same fault the whole time —
# and every conclusion drawn about it, including "this isn't working, try
# photographs", was drawn from pictures taken in the wrong room. That is worth
# actually testing rather than reasoning about, so each of the four gets a twin
# rendered in `noir`, same material, only the room moved.
#
# It is a real possibility that some of these come back looking fine. It does
# not un-fix what the photograph fixes — a level set still cannot make a
# branching vein, and no amount of dimming the room changes the SHAPE of the
# veining — but "the procedural stone was drowned" and "the procedural stone was
# wrong" are different diagnoses with different consequences, and only one of
# them has been demonstrated.
PROC_ROOMS = {k + "-noir": k for k in CANDIDATES}

# What `proc` means, snapshotted before anything is merged in below: THE FOUR
# BUILT-INS AND NOTHING ELSE. The bake-off those four and the four gemini plates
# recorded is the reason this file exists, and `proc` is how it is reproduced -
# a group that quietly grew to include whatever the Editor last tuned would make
# that command mean something different every time it was run.
BUILT_IN_PROC = list(CANDIDATES)


# ---------------------------------------------------------------------------
# ...AND THE ONE THE EDITOR TUNES
# ---------------------------------------------------------------------------
# design/bake/plinth/ is one procedural stone: a name, a ground, three vein sets
# and a fracture, declared in its recipe.json with every range and paragraph the
# tuner this replaces used to carry, and tuned through design/bake/plinth/params.json.
# It arrives here as an ordinary CANDIDATES entry, so nothing downstream knows the
# difference - build_material() reads it the way it reads `portoro`.
#
# ONE STONE AND NEVER A BUILT-IN, which is the acceptance criterion this door was
# built to keep. Re-rendering `nero`, `portoro`, `marquina`, `arabescato` or any
# gemini plate would overwrite the pictures the marble comparison was judged from,
# so a name this file already defines is REFUSED rather than shadowed - the same
# rule, and the same wording, as load_added_stones() below.
#
# It is also why nothing gives it a `-noir` twin: PROC_ROOMS is built above this,
# out of the built-ins alone. The room is a parameter of the stone instead.
def tuned_stone():
    sys.path.insert(0, os.path.join(ROOT, "design", "bake"))
    try:
        import tuning
        held = tuning.bake("plinth")
    except (ImportError, FileNotFoundError) as why:
        # A tree without design/bake/ still renders every built-in. This door is
        # the Editor's, and a missing one is a Bake nobody can run rather than a
        # generator nobody can run - which is the difference between losing a
        # feature and losing the eight plates the comparison was judged from.
        print("! no design/bake/plinth (%s) - built-ins only" % why)
        return {}
    key = held.text("stone").strip()
    if key in CANDIDATES or key in PHOTO_CANDIDATES or key in PROC_ROOMS:
        print("! design/bake/plinth names %s, which this file already defines - "
              "ignored, and nothing of that name is re-rendered" % key)
        return {}
    veins = []
    for at in range(3):
        vein = "vein%d." % at
        veins.append((
            held.num(vein + "scale"), held.num(vein + "detail"),
            held.num(vein + "distortion"), held.num(vein + "width"),
            held.num(vein + "sharpness"), held.linear(vein + "colour"),
            held.num(vein + "rough"), held.num(vein + "bump"),
        ))
    return {key: {
        "title": held.text("title"),
        GROUND: held.linear("ground"),
        "veins": veins,
        "fracture": (held.linear("fracture.colour"), held.num("fracture.rough"),
                     held.num("fracture.bump"), held.num("fracture.strength")),
        "base_rough": held.num("base_rough"),
        "samples": held.integer("samples"),
        "seed": held.integer("seed"),
        "room": held.text("room"),
    }}


TUNED = tuned_stone()
CANDIDATES.update(TUNED)

# Last, so that load_added_stones() can see every built-in name it must not take,
# and the Editor's one as well.
ADDED = load_added_stones()
PHOTO_CANDIDATES.update(ADDED)


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


def bedded(tree, coord):
    """The block's own coordinates, sheared into the rock's bedding frame.

    TWO Mapping nodes and not one, which is forced rather than fussy: a Mapping
    node applies its scale FIRST and its rotation second, and what this needs is
    the other order — turn the frame so the bedding lies along X, then squash
    across it. R(S p) elongates features along a fixed axis and then turns the
    whole picture, which is not the same thing and is visibly not: the squash
    ends up across the block rather than across the seams. See BEDDING.
    """
    tilt, squash = BEDDING
    rot = tree.nodes.new("ShaderNodeMapping")
    rot.location = (-1800, 0)
    rot.inputs["Rotation"].default_value = (0.0, math.radians(-tilt), 0.0)
    link(tree, coord, "Object", rot, "Vector")

    sq = tree.nodes.new("ShaderNodeMapping")
    sq.location = (-1620, 0)
    sq.inputs["Scale"].default_value = (1.0, 1.0, squash)
    link(tree, rot, "Vector", sq, "Vector")
    return (sq, "Vector")


def noise(tree, co, scale, detail, x, y, distortion=0.0, rough=0.48):
    """One 3D noise on the bedded coordinates. Every field in here is one."""
    n = tree.nodes.new("ShaderNodeTexNoise")
    n.location = (x, y)
    n.noise_dimensions = '3D'
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    n.inputs["Roughness"].default_value = rough
    n.inputs["Distortion"].default_value = distortion
    link(tree, co[0], co[1], n, "Vector")
    return n


def fracture_mask(tree, co, x, y):
    """The white hairline network, as a Voronoi cell boundary. See FRACTURE.

    `Distance to Edge` is literally the distance to the nearest wall of the cell
    the point is in, so thresholding it draws the walls — straight between
    junctions, meeting in threes, closing into cells. That is what a fracture
    network is, and it is the shape a level set of a smooth field cannot make at
    any setting, because a smooth field has smooth level sets and rounded
    junctions. The warp is a small noise offset on the input so the cells are not
    a recognisable lattice; it is deliberately much weaker than a vein set's
    distortion, because a crack IS mostly straight and warping it until it
    wanders is throwing away the one property that made it worth using.
    """
    scale, rand, width, sharp, wscale, wamt, gs, glo, ghi = FRACTURE

    wn = tree.nodes.new("ShaderNodeTexNoise")
    wn.location = (x, y + 200)
    wn.noise_dimensions = '3D'
    wn.inputs["Scale"].default_value = wscale
    wn.inputs["Detail"].default_value = 2.0
    link(tree, co[0], co[1], wn, "Vector")

    off = tree.nodes.new("ShaderNodeVectorMath")
    off.location = (x + 180, y + 200)
    off.operation = 'SCALE'
    off.inputs["Scale"].default_value = wamt
    link(tree, wn, "Color", off, 0)

    add = tree.nodes.new("ShaderNodeVectorMath")
    add.location = (x + 360, y + 100)
    add.operation = 'ADD'
    link(tree, co[0], co[1], add, 0)
    link(tree, off, "Vector", add, 1)

    v = tree.nodes.new("ShaderNodeTexVoronoi")
    v.location = (x + 540, y)
    v.voronoi_dimensions = '3D'
    v.feature = 'DISTANCE_TO_EDGE'
    v.inputs["Scale"].default_value = scale
    v.inputs["Randomness"].default_value = rand
    link(tree, add, "Vector", v, "Vector")

    m = band(tree, v, "Distance", 0.0, width, sharp, x + 720, y)

    # ...and gated like a vein set is, for the same reason: rock does not break
    # evenly either. Ungated this covered the slab at one spacing and read as
    # chicken wire, which is a lattice rather than a fracture.
    gn = noise(tree, co, gs, 3.0, x + 720, y - 260)
    gate = tree.nodes.new("ShaderNodeMapRange")
    gate.location = (x + 900, y - 260)
    gate.clamp = True
    gate.inputs["From Min"].default_value = glo
    gate.inputs["From Max"].default_value = ghi
    link(tree, gn, "Fac", gate, "Value")
    g = tree.nodes.new("ShaderNodeMath")
    g.location = (x + 1080, y)
    g.operation = 'MULTIPLY'
    link(tree, m[0], m[1], g, 0)
    link(tree, gate, "Result", g, 1)
    return (g, 0)


def band(tree, src, so, lo, hi, sharp, x, y, from_max=None):
    """|src| inside a width -> a 1-at-the-centre mask, thinned by a power.

    `from_max` is a (node, output) whose value REPLACES the constant `hi`, which
    is how the width stops being a constant — see WIDTH_SWING.
    """
    mr = tree.nodes.new("ShaderNodeMapRange")
    mr.location = (x, y)
    mr.clamp = True
    mr.inputs["From Min"].default_value = lo
    mr.inputs["From Max"].default_value = hi
    mr.inputs["To Min"].default_value = 1.0
    mr.inputs["To Max"].default_value = 0.0
    link(tree, src, so, mr, "Value")
    if from_max is not None:
        link(tree, from_max[0], from_max[1], mr, "From Max")
    pw = tree.nodes.new("ShaderNodeMath")
    pw.location = (x + 170, y)
    pw.operation = 'POWER'
    pw.inputs[1].default_value = sharp
    link(tree, mr, "Result", pw, 0)
    return (pw, 0)


def vein_masks(tree, co, spec, x):
    """One vein set, as a CORE and a HALO, off the level set of a noise field.

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

    THE TWO THINGS THAT MAKE IT A SEAM AND NOT A CONTOUR LINE are both here and
    both were missing. The width is a FIELD and not a number, so the same vein is
    a swathe in one place and a filament a centimetre later; and the same
    crossing is banded a second time far wider and far softer, which is the
    aureole the mineral bled into the rock around it. Neither is a look — a level
    set at a fixed width is a contour plot, and it read as one.
    """
    scale, detail, distortion, width, sharp, _c, _r, _b = spec

    f = noise(tree, co, scale, detail, x, 0, distortion=distortion)
    sub = tree.nodes.new("ShaderNodeMath")
    sub.location = (x + 180, 0)
    sub.operation = 'SUBTRACT'
    sub.inputs[1].default_value = 0.5
    link(tree, f, "Fac", sub, 0)
    ab = tree.nodes.new("ShaderNodeMath")
    ab.location = (x + 340, 0)
    ab.operation = 'ABSOLUTE'
    link(tree, sub, "Value", ab, 0)

    # The width, as a field of its own at a few vein spacings across.
    div, wdet, swing = WIDTH_SWING
    wn = noise(tree, co, scale / div, wdet, x, 320)
    wm = tree.nodes.new("ShaderNodeMapRange")
    wm.location = (x + 180, 320)
    wm.clamp = True
    wm.inputs["From Min"].default_value = 0.0
    wm.inputs["From Max"].default_value = 1.0
    wm.inputs["To Min"].default_value = width * (1.0 - swing)
    wm.inputs["To Max"].default_value = width * (1.0 + swing)
    link(tree, wn, "Fac", wm, "Value")

    span, hsharp, _ht, _hr = HALO
    hm = tree.nodes.new("ShaderNodeMapRange")
    hm.location = (x + 180, 480)
    hm.clamp = True
    hm.inputs["From Min"].default_value = 0.0
    hm.inputs["From Max"].default_value = 1.0
    hm.inputs["To Min"].default_value = width * (1.0 - swing) * span
    hm.inputs["To Max"].default_value = width * (1.0 + swing) * span
    link(tree, wn, "Fac", hm, "Value")

    core = band(tree, ab, "Value", 0.0, width, sharp, x + 500, 0,
                from_max=(wm, "Result"))
    halo = band(tree, ab, "Value", 0.0, width * span, hsharp, x + 500, 160,
                from_max=(hm, "Result"))

    # ...and where in the block this set is present at all. See VEIN_DENSITY.
    ddiv, ddet, dlo, dhi = VEIN_DENSITY
    dn = noise(tree, co, scale / ddiv, ddet, x, 640)
    gate = tree.nodes.new("ShaderNodeMapRange")
    gate.location = (x + 180, 640)
    gate.clamp = True
    gate.inputs["From Min"].default_value = dlo
    gate.inputs["From Max"].default_value = dhi
    gate.inputs["To Min"].default_value = 0.0
    gate.inputs["To Max"].default_value = 1.0
    link(tree, dn, "Fac", gate, "Value")

    out = []
    for j, m in enumerate((core, halo)):
        g = tree.nodes.new("ShaderNodeMath")
        g.location = (x + 860, j * 160)
        g.operation = 'MULTIPLY'
        link(tree, m[0], m[1], g, 0)
        link(tree, gate, "Result", g, 1)
        out.append((g, 0))
    return out[0], out[1]


def build_material(key):
    spec = CANDIDATES[key]
    mat = bpy.data.materials.new("marble-" + key)
    mat.use_nodes = True
    tree = mat.node_tree
    bsdf = tree.nodes["Principled BSDF"]

    coord = tree.nodes.new("ShaderNodeTexCoord")
    coord.location = (-2000, 0)
    # Everything below reads THIS and not `coord`: one rock, one grain.
    co = bedded(tree, coord)

    # ---- the ground, which is a cloud and not a number ---------------------
    g = tuple(spec[GROUND])
    gs, gdet, gswing = GROUND_MOTTLE
    gn = noise(tree, co, gs, gdet, -1200, 700)
    gm = tree.nodes.new("ShaderNodeMix")
    gm.data_type = 'RGBA'
    gm.location = (-1000, 700)
    gm.inputs[MIX_CA].default_value = tuple(c * (1.0 - gswing) for c in g) + (1,)
    gm.inputs[MIX_CB].default_value = tuple(c * (1.0 + gswing) for c in g) + (1,)
    link(tree, gn, "Fac", gm, MIX_FAC)
    colour = (gm, MIX_OUT_C)

    # ---- ...and the polish, which is not even either -----------------------
    ps, pdet, pswing = POLISH
    pn = noise(tree, co, ps, pdet, -1200, 460)
    pm = tree.nodes.new("ShaderNodeMapRange")
    pm.location = (-1000, 460)
    pm.clamp = True
    pm.inputs["From Min"].default_value = 0.0
    pm.inputs["From Max"].default_value = 1.0
    # Per stone, falling back to the module's own: the Editor's stone carries its
    # own polish and the four built-ins share this one.
    base = spec.get("base_rough", BASE_ROUGH)
    pm.inputs["To Min"].default_value = max(0.004, base - pswing)
    pm.inputs["To Max"].default_value = base + pswing
    link(tree, pn, "Fac", pm, "Value")
    rough = (pm, "Result")

    # ---- the tooth, which is the only thing under the veins on the bump ----
    ts, tdet, tw = TOOTH
    tn = noise(tree, co, ts, tdet, -1200, 240)
    tm = tree.nodes.new("ShaderNodeMix")
    tm.data_type = 'FLOAT'
    tm.location = (-1000, 240)
    tm.inputs[MIX_FAC].default_value = tw
    tm.inputs[MIX_FA].default_value = 0.0
    link(tree, tn, "Fac", tm, MIX_FB)
    bump_src = (tm, MIX_OUT_F)

    # ---- and then every vein set over the top of all three -----------------
    _hspan, _hsharp, halo_tint, halo_rough = HALO
    for i, vs in enumerate(spec["veins"]):
        core, halo = vein_masks(tree, co, vs, -2400 + i * 40)
        _s, _d, _dt, _w, _so, vc, vr, vb = vs

        # The aureole first and the seam over it, which is the order the rock is
        # in: the bleed is under the vein and reaches much further than it, so a
        # core laid down first would be washed back out by its own halo.
        hw = tree.nodes.new("ShaderNodeMath")
        hw.location = (-700, -i * 320 + 60)
        hw.operation = 'MULTIPLY'
        hw.inputs[1].default_value = halo_tint
        link(tree, halo[0], halo[1], hw, 0)

        hmix = tree.nodes.new("ShaderNodeMix")
        hmix.data_type = 'RGBA'
        hmix.location = (-520, -i * 320 + 60)
        hmix.inputs[MIX_CB].default_value = tuple(vc) + (1,)
        link(tree, hw, "Value", hmix, MIX_FAC)
        link(tree, colour[0], colour[1], hmix, MIX_CA)
        colour = (hmix, MIX_OUT_C)

        mix = tree.nodes.new("ShaderNodeMix")
        mix.data_type = 'RGBA'
        mix.location = (-340, -i * 320)
        mix.inputs[MIX_CB].default_value = tuple(vc) + (1,)
        link(tree, core[0], core[1], mix, MIX_FAC)
        link(tree, colour[0], colour[1], mix, MIX_CA)
        colour = (mix, MIX_OUT_C)

        # Roughness takes the halo the same way: the rock a seam bled into is
        # part of the way to being that seam, and a step in polish exactly at the
        # colour's edge is the thing that made a vein read as printed ON the
        # stone rather than as part of it.
        hr = tree.nodes.new("ShaderNodeMath")
        hr.location = (-700, -i * 320 - 130)
        hr.operation = 'MULTIPLY'
        hr.inputs[1].default_value = halo_rough
        link(tree, halo[0], halo[1], hr, 0)

        hrm = tree.nodes.new("ShaderNodeMix")
        hrm.data_type = 'FLOAT'
        hrm.location = (-520, -i * 320 - 130)
        hrm.inputs[MIX_FB].default_value = vr
        link(tree, hr, "Value", hrm, MIX_FAC)
        link(tree, rough[0], rough[1], hrm, MIX_FA)
        rough = (hrm, MIX_OUT_F)

        mr = tree.nodes.new("ShaderNodeMix")
        mr.data_type = 'FLOAT'
        mr.location = (-340, -i * 320 - 130)
        mr.inputs[MIX_FB].default_value = vr
        link(tree, core[0], core[1], mr, MIX_FAC)
        link(tree, rough[0], rough[1], mr, MIX_FA)
        rough = (mr, MIX_OUT_F)

        add = tree.nodes.new("ShaderNodeMix")
        add.data_type = 'FLOAT'
        add.blend_type = 'ADD'
        add.location = (-340, -i * 320 - 260)
        add.inputs[MIX_FAC].default_value = vb
        link(tree, bump_src[0], bump_src[1], add, MIX_FA)
        link(tree, core[0], core[1], add, MIX_FB)
        bump_src = (add, MIX_OUT_F)

    # ---- and the crack network last, because it cuts everything ------------
    # LAST IS THE POINT, not an ordering convenience. Fracture post-dates the
    # rock: the beds were laid down, the swathes grew, and THEN the whole thing
    # broke and the breaks filled. So a hairline runs straight across a gold
    # swathe without caring that it is there, which is exactly what the reference
    # slab shows and what a crack laid down first and then painted over would
    # not. It also has no halo — a fracture is a clean break, not a seam the
    # surrounding rock was altered by.
    fc, fr, fb, fs = spec["fracture"]
    frac = fracture_mask(tree, co, -2400, -1400)

    fw = tree.nodes.new("ShaderNodeMath")
    fw.location = (-700, -1400)
    fw.operation = 'MULTIPLY'
    fw.inputs[1].default_value = fs
    link(tree, frac[0], frac[1], fw, 0)

    fmix = tree.nodes.new("ShaderNodeMix")
    fmix.data_type = 'RGBA'
    fmix.location = (-340, -1400)
    fmix.inputs[MIX_CB].default_value = tuple(fc) + (1,)
    link(tree, fw, "Value", fmix, MIX_FAC)
    link(tree, colour[0], colour[1], fmix, MIX_CA)
    colour = (fmix, MIX_OUT_C)

    frm = tree.nodes.new("ShaderNodeMix")
    frm.data_type = 'FLOAT'
    frm.location = (-340, -1530)
    frm.inputs[MIX_FB].default_value = fr
    link(tree, fw, "Value", frm, MIX_FAC)
    link(tree, rough[0], rough[1], frm, MIX_FA)
    rough = (frm, MIX_OUT_F)

    fadd = tree.nodes.new("ShaderNodeMix")
    fadd.data_type = 'FLOAT'
    fadd.blend_type = 'ADD'
    fadd.location = (-340, -1660)
    fadd.inputs[MIX_FAC].default_value = fb
    link(tree, bump_src[0], bump_src[1], fadd, MIX_FA)
    link(tree, fw, "Value", fadd, MIX_FB)
    bump_src = (fadd, MIX_OUT_F)

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


def map_path(spec, name):
    """Where one of a stone's maps lives, or the instruction to go make it.

    maps/ for the stones this file was written for, maps/<name>/ for one added
    from a photograph of your own - see load_added_stones().
    """
    sub = spec.get("maps")
    path = os.path.join(MAPS_DIR, sub, name) if sub else os.path.join(MAPS_DIR, name)
    if not os.path.isfile(path):
        if sub:
            src = spec.get("src")
            sys.exit(MISSING_ADDED_MAPS
                     % (path, sub, (" (%s)" % src) if src else "", sub))
        sys.exit(MISSING_MAPS % path)
    return path


def map_aspect(spec):
    """The source photograph's width over its height, read off the base colour.

    All four of a stone's maps come out of one image, so one of them answers for
    all four, and photo_map() reloads it with `check_existing` rather than
    opening a second copy.
    """
    img = bpy.data.images.load(
        map_path(spec, "basecolor-%s.png" % spec["grade"]), check_existing=True)
    w, h = img.size
    return (w / float(h)) if h else 1.0


def photo_map(tree, co, name, colorspace, x, y, spec):
    """One of build-portoro-maps.py's maps, box-projected onto the block.

    BOX AND NOT FLAT, and this is the whole trick rather than a default worth
    leaving alone. A flat projection needs a UV unwrap and would put a seam
    along the arris, which is the single most looked-at line in the picture. Box
    projection reads the top face from (x, y) and the front face from (x, z),
    and the mapping in build_photo_material() lands BOTH of those on V = off at
    the arris — the top face's y is ARRIS_Y there and the front face's z is
    ARRIS_Z, and each has its own subtracted — so the vein pattern RUNS OVER THE
    EDGE and continues down the face. Which is what a block cut from one slab
    does, and is a thing the procedural material gets for free and every
    photograph pipeline before this one got wrong.

    `Non-Color` on everything except base colour, for the usual reason and the
    usual consequence of forgetting: a roughness map read as sRGB is silently
    de-gamma'd, so 0.055 arrives as 0.004 and the stone becomes a mirror.
    """
    img = bpy.data.images.load(map_path(spec, name), check_existing=True)
    img.colorspace_settings.name = colorspace
    n = tree.nodes.new("ShaderNodeTexImage")
    n.location = (x, y)
    n.image = img
    n.projection = 'BOX'
    # A small blend and not zero: the chamfer is a real face of its own, 0.00055
    # wide, and a hard switch across it draws a bright line along the arris.
    n.projection_blend = 0.15
    n.extension = 'REPEAT'
    # Cubic. With the mapping's V axes corrected for the source's aspect the
    # front face sits at about 1.07x — 165 source rows over 177 rows of plate —
    # so this is no longer covering for a 2x magnification, and the hairlines are
    # sharp rather than interpolated. It is kept because the scale in a stone's
    # entry is free to magnify past native and Linear stair-steps as soon as it
    # does.
    n.interpolation = 'Cubic'
    link(tree, co[0], co[1], n, "Vector")
    return n


def build_photo_material(key):
    """A stone read off a photograph rather than grown out of noise.

    Four maps, a Principled BSDF and no vein nodes at all. Compare the length of
    this with build_material() above: the structure that costs three hundred
    lines of noise, warp, threshold and halo up there is simply IN the picture,
    and what is left to do is say what each mineral is made of.
    """
    spec = PHOTO_CANDIDATES[key]
    mat = bpy.data.materials.new("marble-" + key)
    mat.use_nodes = True
    tree = mat.node_tree
    bsdf = tree.nodes["Principled BSDF"]

    coord = tree.nodes.new("ShaderNodeTexCoord")
    coord.location = (-1800, 0)

    # Scale and window. The offset lands the ARRIS at V = off on both faces,
    # which is what keeps them agreeing there — see photo_map().
    #
    # THE TWO V OFFSETS ARE DIFFERENT NUMBERS, AND HAVE TO BE. Object texture
    # coordinates are the block's LOCAL space, and build_scene() applies the
    # cube's scale but NOT its location, so local space is centred on the block:
    # y runs ±DEPTH/2 and z runs ±HEIGHT/2, and the arris — the front-top edge —
    # sits at (y = -DEPTH/2, z = +HEIGHT/2) rather than at (0, 0). Subtracting
    # each of those puts the arris at V = off on both faces, which is the whole
    # point of the box projection.
    #
    # Written as `off` on both axes it looked symmetric and was not: the front
    # face came out half a block-height up the photograph from where the studio's
    # window guide draws it, the top face 0.23 tiles down from it, and the two
    # met at the arris 0.29 tiles apart — a cut, not a continuous run over the
    # edge. Measured by correlating the shipped gemini-noir plate's front face
    # against basecolor-deep.png: peak at V = 0.452 against the 0.4539 the
    # centred geometry predicts, and nothing at the intended 0.400.
    #
    # THE SCALE IS NOT UNIFORM, AND MUST NOT BE. A box projection lays the image's
    # [0,1] over one tile of MODEL space per axis and knows nothing about the
    # image's own aspect, so a uniform scale squeezes a 1.83:1 photograph into a
    # square footprint: 2814 px across 1/s units of width against 1536 px across
    # 1/s units of height, which is 2365 px per unit one way and 1291 the other.
    # The stone comes out stretched vertically by exactly the source's aspect.
    #
    # Multiplying the V axes by that aspect equalises the two densities — H * s*A
    # == W * s for A = W/H, whichever way round the picture is — and it is the
    # SHARPNESS fix as much as the shape one, because the stretch is what starved
    # the front face of source rows. 0.070024 units over 177 rows of plate reads
    # 90 source rows uniform and 165 corrected, against a 1.07x magnification
    # across. Anisotropic 1.07/1.96 becomes isotropic 1.07 — near enough native.
    #
    # It stays on Y AND Z together, so the arris rule is untouched: continuity
    # wants the two V axes to agree with each other, not with U.
    s, off = spec["scale"], spec["offset"]
    v = s * map_aspect(spec)
    m = tree.nodes.new("ShaderNodeMapping")
    m.location = (-1600, 0)
    m.inputs["Scale"].default_value = (s, v, v)
    m.inputs["Location"].default_value = (0.5,
                                          off - v * ARRIS_Y,
                                          off - v * ARRIS_Z)
    # The vertical wrap is never blended (build-portoro-maps.py cross-fades U and
    # only U), which is sound only while under one tile of V is ever visible.
    #
    # WHICH FACE SPANS THE MOST V IS NOT THE ONE THIS USED TO ASK ABOUT. It
    # tested (DEPTH + HEIGHT) * v, on the reading that the two faces stack in V.
    # They do not: measured against an unlit ortho render of each face, BOX gives
    # the front face (x, z) — V over HEIGHT * v — and the top face (-y, x), read
    # 90° round, so ITS V runs across the block's whole width at the U scale.
    # That is 2 * NEAR_HALF * s, about 1.0 tiles at the shipping scale and over
    # two at gemini-fine's, and it is always the larger of the two.
    v_tiles = max(HEIGHT * v, PLINTH_W * s)
    if v_tiles > 1.0:
        print("  ! %s: %.2f tiles of V visible (top face), unblended seam will show"
              % (key, v_tiles))
    link(tree, coord, "Object", m, "Vector")
    co = (m, "Vector")

    base = photo_map(tree, co, "basecolor-%s.png" % spec["grade"], "sRGB",
                     -1300, 400, spec)
    colour = (base, "Color")

    # ---- the crack overlay, only on the hybrid -----------------------------
    if spec["crack"]:
        fc, fr, fb, fs = CANDIDATES["portoro"]["fracture"]
        frac = fracture_mask(tree, bedded(tree, coord), -1300, -1900)
        fw = tree.nodes.new("ShaderNodeMath")
        fw.location = (-900, -1900)
        fw.operation = 'MULTIPLY'
        fw.inputs[1].default_value = fs * 0.55   # under a photo, not over a void
        link(tree, frac[0], frac[1], fw, 0)
        fmix = tree.nodes.new("ShaderNodeMix")
        fmix.data_type = 'RGBA'
        fmix.location = (-700, -1900)
        fmix.inputs[MIX_CB].default_value = tuple(fc) + (1,)
        link(tree, fw, "Value", fmix, MIX_FAC)
        link(tree, colour[0], colour[1], fmix, MIX_CA)
        colour = (fmix, MIX_OUT_C)

    # ---- roughness ---------------------------------------------------------
    if spec["rough"] > 0.0:
        rmap = photo_map(tree, co, "roughness.png", "Non-Color", -1300, 100, spec)
        rm = tree.nodes.new("ShaderNodeMath")
        rm.location = (-900, 100)
        rm.operation = 'MULTIPLY'
        rm.inputs[1].default_value = spec["rough"]
        link(tree, rmap, "Color", rm, 0)
        link(tree, rm, "Value", bsdf, "Roughness")
    else:
        bsdf.inputs["Roughness"].default_value = spec.get("base_rough", BASE_ROUGH)

    # ---- relief ------------------------------------------------------------
    bstr, bdist = spec["bump"]
    if bstr > 0.0:
        hmap = photo_map(tree, co, "height.png", "Non-Color", -1300, -200, spec)
        bump = tree.nodes.new("ShaderNodeBump")
        bump.location = (-700, -200)
        bump.inputs["Strength"].default_value = bstr
        # A polished face is FLAT. What is left after the wheel is microns of
        # differential hardness at the mineral boundaries, so the distance here
        # is deliberately tiny — the map is already high-passed to contain
        # nothing but those boundaries, and a large distance would put a dome
        # back that build-portoro-maps.py went to some trouble to remove. See
        # the note on `bump` in the table for why it has to be tinier still
        # than that argument alone suggests.
        bump.inputs["Distance"].default_value = bdist
        link(tree, hmap, "Color", bump, "Height")
        link(tree, bump, "Normal", bsdf, "Normal")

    # ---- and the reason marble does not look like painted card -------------
    if spec["sss"] > 0.0:
        cmap = photo_map(tree, co, "calcite.png", "Non-Color", -1300, -500, spec)
        sw = tree.nodes.new("ShaderNodeMath")
        sw.location = (-900, -500)
        sw.operation = 'MULTIPLY'
        sw.inputs[1].default_value = spec["sss"]
        link(tree, cmap, "Color", sw, 0)
        link(tree, sw, "Value", bsdf, "Subsurface Weight")
        # One model unit is one Frame width, so call it a metre: a couple of
        # millimetres of scatter, longest in red the way every mineral is.
        bsdf.inputs["Subsurface Radius"].default_value = (1.0, 0.82, 0.68)
        bsdf.inputs["Subsurface Scale"].default_value = 0.0022

    cw, cr = spec["coat"]
    if cw > 0.0:
        bsdf.inputs["Coat Weight"].default_value = cw
        bsdf.inputs["Coat Roughness"].default_value = cr

    link(tree, colour[0], colour[1], bsdf, "Base Color")
    bsdf.inputs["IOR"].default_value = 1.55
    return mat


def build_world(room="flat"):
    """The surround, as an elevation ramp with soft sources off the axis.

    Texture Coordinate's `Generated` on a world IS the outgoing ray's direction,
    so its Z is the sine of the elevation and the ramp is read at (z + 1) / 2 —
    0 straight down, 1/2 the horizon, 1 straight up. The lobe is a dot product
    against a fixed direction, mapped so the stated half-width falls to nothing
    and squared so it has a centre rather than an edge.

    Both are ADDED and neither is a light Cycles samples as one: this is the
    background the mirror sees. See `the room` for what each face of the block
    actually samples out of it, which is what the stops were shaped against.
    """
    w = bpy.data.worlds.new("room-" + room)
    w.use_nodes = True
    t = w.node_tree
    bg = t.nodes["Background"]

    coord = t.nodes.new("ShaderNodeTexCoord")
    coord.location = (-1000, 0)
    sep = t.nodes.new("ShaderNodeSeparateXYZ")
    sep.location = (-820, 120)
    t.links.new(coord.outputs["Generated"], sep.inputs["Vector"])

    up = t.nodes.new("ShaderNodeMapRange")
    up.location = (-640, 120)
    up.clamp = True
    up.inputs["From Min"].default_value = -1.0
    up.inputs["From Max"].default_value = 1.0
    t.links.new(sep.outputs["Z"], up.inputs["Value"])

    ramp = t.nodes.new("ShaderNodeValToRGB")
    ramp.location = (-460, 120)
    # LINEAR, not B_SPLINE, and that is a tuning property rather than a look: a
    # B-spline does not pass through its own control points, and each face of the
    # block reads a band of this ramp only a few hundredths wide — so a stop
    # written at 0.0041 arrived as something else, and moving it moved two other
    # bands with it. Straight segments make each stop mean what it says.
    ramp.color_ramp.interpolation = 'LINEAR'
    els = ramp.color_ramp.elements
    while len(els) > 1:
        els.remove(els[-1])
    for i, (pos, lvl) in enumerate(WORLD):
        e = els[0] if i == 0 else els.new(pos)
        e.position = pos
        lvl *= ROOMS[room]["mul"][i]
        e.color = (lvl, lvl, lvl, 1.0)
    t.links.new(up.outputs["Result"], ramp.inputs["Fac"])

    def lobe(spec, y):
        at, half, level = spec
        n = math.sqrt(sum(c * c for c in at))
        dot = t.nodes.new("ShaderNodeVectorMath")
        dot.location = (-820, y)
        dot.operation = 'DOT_PRODUCT'
        dot.inputs[1].default_value = tuple(c / n for c in at)
        t.links.new(coord.outputs["Generated"], dot.inputs[0])

        fall = t.nodes.new("ShaderNodeMapRange")
        fall.location = (-640, y)
        fall.clamp = True
        fall.inputs["From Min"].default_value = math.cos(math.radians(half))
        fall.inputs["From Max"].default_value = 1.0
        t.links.new(dot.outputs["Value"], fall.inputs["Value"])

        sq = t.nodes.new("ShaderNodeMath")
        sq.location = (-460, y)
        sq.operation = 'POWER'
        sq.inputs[1].default_value = 2.0
        t.links.new(fall.outputs["Result"], sq.inputs[0])

        lvl = t.nodes.new("ShaderNodeMath")
        lvl.location = (-300, y)
        lvl.operation = 'MULTIPLY'
        lvl.inputs[1].default_value = level
        t.links.new(sq.outputs["Value"], lvl.inputs[0])
        return lvl

    at, half, level = ROOM_LOBE
    primary = (at, half, level * ROOMS[room]["lobe"])
    acc = ramp.outputs["Color"]
    for i, spec in enumerate((primary,) + tuple(ROOMS[room]["extra"])):
        add = t.nodes.new("ShaderNodeMix")
        add.data_type = 'RGBA'
        add.blend_type = 'ADD'
        add.location = (-140, -i * 90)
        add.inputs[MIX_FAC].default_value = 1.0
        t.links.new(acc, add.inputs[MIX_CA])
        t.links.new(lobe(spec, -180 - i * 260).outputs["Value"],
                    add.inputs[MIX_CB])
        acc = add.outputs[MIX_OUT_C]
    t.links.new(acc, bg.inputs[0])
    return w


def add_light(spec):
    at, w, h, energy, rx = spec
    bpy.ops.object.light_add(type='AREA', location=at)
    L = bpy.context.object
    L.data.shape = 'RECTANGLE'
    L.data.size, L.data.size_y = w, h
    L.data.energy = energy
    L.rotation_euler = (math.radians(rx), 0.0, 0.0)
    return L


def set_lights(room):
    """Clear the lights and lay out the ones this room asks for.

    KEY and FILL are the fitted pair unless a room overrides them; `screen` is
    the Frame, and only rooms that say so get one. Rebuilt per stone rather than
    once per run because a room is allowed to move them — see ROOMS["noir"],
    where moving them IS the change.
    """
    for ob in [o for o in bpy.data.objects if o.type == 'LIGHT']:
        bpy.data.objects.remove(ob, do_unlink=True)
    spec = ROOMS[room]
    add_light(spec.get("key", KEY))
    add_light(spec.get("fill", FILL))
    if spec.get("wash"):
        L = add_light(spec["wash"])
        # The one line this whole room is built around — see `wash` in ROOMS.
        L.visible_glossy = False
    if spec.get("screen"):
        L = add_light(spec["screen"])
        # A light-mode browser window is not white, it is paper — very slightly
        # warm and very slightly down off full. Baking it dead white puts a
        # colour cast on the top face that no screen actually makes.
        L.data.color = (1.0, 0.985, 0.96)


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

    sc.world = build_world()

    bpy.ops.mesh.primitive_cube_add(size=2)   # spans +-1, so scale IS half-extent
    slab = bpy.context.object
    slab.scale = (NEAR_HALF, DEPTH / 2.0, HEIGHT / 2.0)
    slab.location = (0.0, DEPTH / 2.0, -HEIGHT / 2.0)
    # ...AND THEN BAKED INTO THE MESH, which is not tidiness. Object texture
    # coordinates are the object's LOCAL space, and a cube left carrying a scale
    # of (0.59, 0.15, 0.035) has a local space that is uniform +-1 on a block
    # that is seventeen times wider than it is tall. Every texture in the
    # material would be stretched by that ratio — which is exactly what a grain
    # smeared sideways into wood looks like. Applied, one local unit IS one world
    # unit and a vein is the same width whichever face it crosses.
    #
    # THE LOCATION IS NOT APPLIED, so local space stays CENTRED on the block
    # while world space is anchored at the arris — the two are a half-block apart
    # on Y and on Z. Deliberate, and the box projection is happier for it, but it
    # means a window measured in world terms is not a window in this space until
    # ARRIS_Y / ARRIS_Z are taken off it. build_photo_material() does that; the
    # note there says what it looked like when it did not.
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    # THE CHAMFER, and it goes on AFTER the scale is applied — a bevel modifier
    # measures its width in the object's own space, so on a cube still carrying
    # a scale of (0.59, 0.15, 0.035) the same 0.0011 would come out seventeen
    # times wider along the block than up its face. Applied first, the width is
    # a world length and the chamfer is the same cut on every edge, which is what
    # a chamfer is. See BEVEL for why there is one at all.
    bev = slab.modifiers.new("arris", 'BEVEL')
    bev.width, bev.segments = BEVEL
    bev.limit_method = 'ANGLE'
    bev.harden_normals = False
    bpy.ops.object.modifier_apply(modifier=bev.name)
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

    set_lights("flat")
    return sc, slab


def build(key, sc, slab):
    photo = key in PHOTO_CANDIDATES
    if key in PROC_ROOMS:                    # a procedural stone, re-lit
        spec = dict(CANDIDATES[PROC_ROOMS[key]], room="noir")
        mat_key = PROC_ROOMS[key]
    else:
        spec = PHOTO_CANDIDATES[key] if photo else CANDIDATES[key]
        mat_key = key
    print("%s - %s" % (key, spec["title"]))
    # The world is rebuilt only when a stone asks for a different one, so the
    # whole procedural family and every `flat` photo stone go on sharing the one
    # that was fitted — see ROOM_EXTRA.
    room = spec.get("room", "flat")
    # startswith, because bpy.data.worlds.new() uniquifies: a second "room-flat"
    # comes back named "room-flat.001" and an equality test would rebuild the
    # world for every stone in the run.
    if sc.world is None or not sc.world.name.startswith("room-" + room):
        sc.world = build_world(room)
        set_lights(room)
    # Set per stone rather than once in build_scene(), so a stone that asks for
    # fewer samples costs less and every other stone in the run is unaffected.
    sc.cycles.samples = spec.get("samples", SAMPLES)
    sc.cycles.seed = spec.get("seed", SEED)
    slab.data.materials.clear()
    slab.data.materials.append(
        build_photo_material(mat_key) if photo else build_material(mat_key))
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


def material_version():
    """A digest of everything that decides the SHAPE of the material.

    design/legacy/plinth-tuner.html carries a hand-written GLSL twin of
    build_material(), and its numbers come out of the sidecar so the two cannot
    disagree about those. What they can disagree about is the shape — a field the
    material grows and the shader never hears of — and that drift is invisible,
    because a previz missing a whole layer still looks like a plausible stone.

    So the shader states which version of the material it was written against and
    the tuner compares it with this. Anything that changes what the node graph
    DOES belongs in the list; the candidate table does not, because a new stone is
    the one kind of change the shader already handles.
    """
    parts = [BEDDING, GROUND_MOTTLE, POLISH, TOOTH, WIDTH_SWING, HALO,
             VEIN_DENSITY, FRACTURE, BEVEL, (BASE_ROUGH,)]
    return hashlib.sha256(repr(parts).encode()).hexdigest()[:8]


def write_sidecar():
    """Everything design/legacy/plinth-tuner.html needs, written by this script.

    The tuner previews a stone before Blender is asked to spend a minute on it,
    which means it has to know the camera, the block, the two lights and the
    CANDIDATES table. NONE OF THAT IS COPIED INTO IT. A tuner holding its own
    literals is a tuner that drifts: it goes on showing the stone this file used
    to render, and the drift is invisible because both halves look right on their
    own. design/legacy/plate-tuner.html reads plate-source.json for the same
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
        # The surround, which the tuner cannot ray-trace and does not try to:
        # `ramp` is (elevation, level) and `lobe` is (direction, half-width,
        # level), and what the previz does with them is sample the ramp at the
        # one elevation each face grazes and add it as a flat term. That is a
        # stand-in and is marked as one where it is used — but it is a stand-in
        # driven by THESE numbers, so raising the room here raises it there, and
        # the two stop being able to disagree about how bright the stone is.
        "world": {"ramp": [list(x) for x in WORLD],
                  "lobe": [list(ROOM_LOBE[0]), ROOM_LOBE[1], ROOM_LOBE[2]]},
        # Which SHAPE of material the tuner's shader has to match. See
        # material_version() and the twin note in plinth-tuner.html.
        "material_version": material_version(),
        "base_rough": BASE_ROUGH,
        # Everything that is true of the stone regardless of WHICH stone, which
        # is most of what makes it read as rock. The tuner ports each of these
        # into its shader and reads the numbers from here — see the note on
        # `world` above for why none of them is copied.
        "stone": {
            "bevel": list(BEVEL),
            "ground_mottle": list(GROUND_MOTTLE),
            "polish": list(POLISH),
            "tooth": list(TOOTH),
            "width_swing": list(WIDTH_SWING),
            "halo": list(HALO),
            "vein_density": list(VEIN_DENSITY),
            "bedding": list(BEDDING),
            "fracture": list(FRACTURE),
        },
        "samples": SAMPLES,
        "seed": SEED,
        # The order the vein tuples are written in, so the tuner labels its rows
        # off this file too rather than off a comment in it.
        "vein_fields": ["scale", "detail", "distortion", "width", "sharpness",
                        "colour", "rough", "bump"],
        "candidates": {
            k: {"title": v["title"], "ground": list(v[GROUND]),
                "veins": [list(x[:5]) + [list(x[5])] + list(x[6:])
                          for x in v["veins"]],
                "fracture": [list(v["fracture"][0])] + list(v["fracture"][1:])}
            for k, v in CANDIDATES.items()
        },
        # The photo-backed stones, listed but NOT described in shader terms —
        # the tuner previews CANDIDATES by reimplementing the node graph in
        # GLSL, and there is no honest way to reimplement "sample this 2814px
        # photograph" in a previz that does not have the photograph. So these
        # are named and parameterised for the picker, and the tuner is expected
        # to say it cannot draw them rather than to draw something else and let
        # the difference pass for a preview. See plinth-tuner.html.
        "photo_fields": list(PHOTO_FIELDS),
        # The procedural stones re-lit, which have plates and so belong in the
        # picker for exactly the reason the photo ones do: a plate on disk that
        # the tuner does not list reads as a bake that failed. Their MATERIAL is
        # a CANDIDATES entry the previz can already draw — what it cannot draw
        # is the room, and the room is the whole point of them, so they are
        # listed as plate-only rather than previewed in the wrong light.
        "relit_candidates": {
            k: {"title": CANDIDATES[src]["title"], "of": src, "room": "noir"}
            for k, src in PROC_ROOMS.items()
        },
        "photo_candidates": {
            k: {"title": v["title"],
                **{f: (list(v[f]) if isinstance(v.get(f), tuple)
                       else v.get(f, "flat" if f == "room" else None))
                   for f in PHOTO_FIELDS}}
            for k, v in PHOTO_CANDIDATES.items()
        },
        # Which of those came from design/plinth/stones/*.json rather than from
        # the table in this file, so the tuner can name the file to edit. Getting
        # that wrong sends you to change a value in build-slab.py that build-slab.py
        # does not hold, and the re-bake then looks like it did nothing. `src` is
        # the photograph's basename, which is all the tuner needs to write the
        # add-stone.py line for a variant of it, and `stem` is the name the
        # styles were built off - the maps are shared between them and are named
        # for it, so it is the one part of the key that is not the style.
        "added_stones": {k: {"src": v.get("src"), "stem": v.get("maps")}
                         for k, v in ADDED.items()},
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
    # Several arguments, each a stone or a group, because the scene is built once
    # and a stone is fifteen seconds - so four stones in one invocation is four
    # renders, and four invocations is four renders plus four Blender starts.
    # design/plinth/add-stone.py writes a set of stones from one photograph and
    # asks for all of them at once.
    which = [a.lower() for a in ARGV] or ["all"]
    # `all` is both families, `proc` and `photo` are one each — because during a
    # bake-off you re-render one family at a time and the other four plates are
    # forty seconds you do not need to spend.
    groups = {"all": list(CANDIDATES) + list(PHOTO_CANDIDATES) + list(PROC_ROOMS),
              # The four built-ins, and never whatever the Editor last tuned:
              # see BUILT_IN_PROC, and the comparison it is protecting.
              "proc": BUILT_IN_PROC,
              # ...which is reached by name, or by this.
              "tuned": list(TUNED),
              "photo": list(PHOTO_CANDIDATES),
              "relit": list(PROC_ROOMS),
              # ...and the ones added from a photograph of your own, which is the
              # group you want after re-running add-stone.py on a tree that had
              # to rebuild their maps.
              "added": list(ADDED),
              # NOTHING, which is not a no-op: main() writes slab.json whatever
              # it rendered, so this is "rewrite the sidecar" on its own. What
              # needs it is a stone being DELETED — the tables are read at import
              # and the picker in design/legacy/plinth-studio.html reads the
              # sidecar, so until this runs it goes on listing an entry whose
              # file is gone. Three seconds of starting Blender against a minute
              # of re-rendering something to make it notice.
              "none": []}
    keys = []
    for a in which:
        if a in groups:
            keys += groups[a]
        elif a in CANDIDATES or a in PHOTO_CANDIDATES or a in PROC_ROOMS:
            keys.append(a)
        else:
            sys.exit(__doc__)
    # Order preserved, duplicates dropped: `photo gemini` is a plausible thing to
    # type and rendering gemini twice is fifteen seconds of rendering it twice.
    keys = list(dict.fromkeys(keys))
    os.makedirs(OUT_DIR, exist_ok=True)
    print("plate %dx%d   camera d=%.5f h=%.5f   block %.5f x %.2f x %.5f"
          % (PLATE_W, PLATE_H, CAM_D, CAM_H, PLINTH_W, DEPTH, HEIGHT))
    sc, slab = build_scene()
    for k in keys:
        build(k, sc, slab)
    print("\nPLINTH_VERSION = \"%s\"  <- paste over the ?v= on every --panel-plinth\n"
          "                          url() in portfolio/styles.css when it differs"
          % digest())
    print("wrote %s  <- what plinth-tuner.html reads"
          % os.path.relpath(write_sidecar(), ROOT))


if __name__ == "__main__":
    main()
