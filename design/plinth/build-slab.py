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

So the block is a block now. Cycles, one cube, one camera, two lights, a room for
them to be in, and the silhouette comes out of the alpha channel instead of being
assumed.

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

Deterministic: Cycles is seeded, the material has no random node, and the same
Blender writes the same bytes.

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
    pm.inputs["To Min"].default_value = max(0.004, BASE_ROUGH - pswing)
    pm.inputs["To Max"].default_value = BASE_ROUGH + pswing
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


def build_world():
    """The surround, as an elevation ramp with one soft source off the axis.

    Texture Coordinate's `Generated` on a world IS the outgoing ray's direction,
    so its Z is the sine of the elevation and the ramp is read at (z + 1) / 2 —
    0 straight down, 1/2 the horizon, 1 straight up. The lobe is a dot product
    against a fixed direction, mapped so the stated half-width falls to nothing
    and squared so it has a centre rather than an edge.

    Both are ADDED and neither is a light Cycles samples as one: this is the
    background the mirror sees. See `the room` for what each face of the block
    actually samples out of it, which is what the stops were shaped against.
    """
    w = bpy.data.worlds.new("room")
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
        e.color = (lvl, lvl, lvl, 1.0)
    t.links.new(up.outputs["Result"], ramp.inputs["Fac"])

    at, half, level = ROOM_LOBE
    n = math.sqrt(sum(c * c for c in at))
    dot = t.nodes.new("ShaderNodeVectorMath")
    dot.location = (-820, -180)
    dot.operation = 'DOT_PRODUCT'
    dot.inputs[1].default_value = tuple(c / n for c in at)
    t.links.new(coord.outputs["Generated"], dot.inputs[0])

    fall = t.nodes.new("ShaderNodeMapRange")
    fall.location = (-640, -180)
    fall.clamp = True
    fall.inputs["From Min"].default_value = math.cos(math.radians(half))
    fall.inputs["From Max"].default_value = 1.0
    t.links.new(dot.outputs["Value"], fall.inputs["Value"])

    sq = t.nodes.new("ShaderNodeMath")
    sq.location = (-460, -180)
    sq.operation = 'POWER'
    sq.inputs[1].default_value = 2.0
    t.links.new(fall.outputs["Result"], sq.inputs[0])

    lvl = t.nodes.new("ShaderNodeMath")
    lvl.location = (-300, -180)
    lvl.operation = 'MULTIPLY'
    lvl.inputs[1].default_value = level
    t.links.new(sq.outputs["Value"], lvl.inputs[0])

    total = t.nodes.new("ShaderNodeMix")
    total.data_type = 'RGBA'
    total.blend_type = 'ADD'
    total.location = (-140, 0)
    total.inputs[MIX_FAC].default_value = 1.0
    t.links.new(ramp.outputs["Color"], total.inputs[MIX_CA])
    t.links.new(lvl.outputs["Value"], total.inputs[MIX_CB])
    t.links.new(total.outputs[MIX_OUT_C], bg.inputs[0])
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
    # smeared sideways into wood looks like. Applied, local space IS world space
    # and a vein is the same width whichever face it crosses.
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


def material_version():
    """A digest of everything that decides the SHAPE of the material.

    design/plinth/plinth-tuner.html carries a hand-written GLSL twin of
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
