#!/usr/bin/env python3
"""Rebuild the graded corner pictures — one file per rung of OUT_WIDTHS and per
theme in the picture's own `grades`, for whichever of PICTURES is named.

    python design/plate/build-plate.py <source.rw2 | source.png> [plate | car | eye]

Three pictures, one pipeline — see PICTURES. `plate` is St Paul's over the
rooftops in the page's bottom-left corner and is the default; `car` is a cable
car hanging off its pylon in the top-right; `eye` is the London Eye seen rim-on,
a mast of capsules, in the bottom-right. They share every stage of the pipeline
and none of its numbers: each carries its own Grade per theme, so the blocks
under THE GRADE are one answer per picture per theme. Each is built on its own
run, because each has its own source frame and only one of them is usually
moving.

Writes the ladder from either of two sources. Deterministic: same input,
byte-identical output (the grain is a seeded PRNG, not os entropy).

* A Panasonic RW2, developed here and cut here — sky_matte() finds the sky.
* An RGBA PNG whose sky has already been cut, by hand or by whatever tool. Its
  alpha is the matte, taken as given; only the grade below is applied.

The grade is the same either way, and so is the mirror. What ships now is the
second kind; the first is kept because it is the only path that can produce a
matte from a frame that has none, and because the reasoning in sky_matte() is
worth more than the twenty lines it occupies.

It also writes the two files design/plate/plate-tuner.html needs to preview a
grade without this script — <name>-source.webp and <name>-source.json. See
NEUTRAL SOURCE at the foot of this docstring. Every constant below is a slider
in that tuner; the way to change one is to move it there, read the block it
prints, and paste it back over the block here.

WHY A SCRIPT AND NOT A CSS FILTER
---------------------------------
The whole grade is baked — precomposited — into the asset, and the stylesheet
only places and dials it. Three reasons, in order of how much they cost:

* The source is a 19 MB raw. It cannot be a background-image, so *something* has
  to develop it; once that step exists, doing the grade in the same pass is free.
* `filter: sepia() brightness() contrast()` on a background costs a compositing
  layer on every paint, and the page it would sit under is the one with the
  scroll-snapped doorway and the momentum carousel. Pixels are free; paints are
  not.
* The look depends on operations CSS filters cannot express at all — a per-channel
  range remap onto two named endpoints, a shoulder that pushes highlights without
  clipping them, and grain. Approximating it with the filter primitives that do
  exist would be both slower and worse.

The plate's frame is mirrored, left for right — see load(), and `mirror` in
PICTURES. The plate stands in the page's BOTTOM-LEFT corner, and as shot the
tower is on the right and the dome falls away to the left, so the picture's
weight sat at the open end and its empty sky in the corner it is anchored to.
Flipped, the tower carries the corner and the dome leans back into the page.
Nothing downstream knows: the flip is the second line of the develop, so the
matte, the grade and the tuner all see one frame.

The car is not mirrored, and for the same reason rather than a different one:
as shot, the pylon already stands up the right-hand edge and the gondola already
hangs down and to the left of it, which is what the top-right corner asks for.
It is one line either way; what matters is that each frame is stood in its corner
here, once, and every measurement downstream then describes the picture that
ships.

The eye is not mirrored. It is the frame as shot, and the frame as shot is what
was asked for — which is worth writing down here because this is the one property
on Picture that is a decision, and the argument the plate makes is available for
this one too and was declined. That argument would run: the mast of capsules
stands left of centre and the boarding platform, the A-frame leg and its cable
stays run down and away to the LEFT of it, so the right two-fifths of the frame is
empty sky and the corner the picture is anchored to holds none of the subject.
What answers that is --eye-x in styles.css rather than a flip here: the dead
margin is pushed off the right-hand edge of the page, which puts the stays in the
corner while leaving the photograph the way round it was taken. The mast then
stands near the page's edge with the leg leaning in, which is the car's
arrangement rather than the plate's, arrived at without touching the negative.

There is no vignette and no soft rectangular edge. An earlier cut dissolved the
top and right edges into the page and it read as a lit corner with a building
fading out of it rather than as a photograph — the dome, the drum and the
colonnade are spread right across the frame, so any ramp wide enough to hide an
edge is also on top of the subject. What makes the plate recede is
`--plate-opacity` in the stylesheet.

A GRADE PER PICTURE, A LADDER PER THEME
---------------------------------------
`--plate-opacity` was for a long time the whole of the difference between the
plate on white and the plate on black, and one baked file served both. Opacity
alone can only ever do one thing, though: mix the picture further into the page.
It cannot move where the blacks and whites LAND, and on this grade that is the
difference that matters — the endpoints are a ramp from black to a mid grey, so
on paper the plate is a grey building on white and on black it is the same grey
building with nothing under it, and the two want different endpoints rather than
different amounts of one set.

So a Picture holds a Grade per theme and main() bakes a ladder for each. What the
stylesheet still owns is placement and opacity; what the file owns is the grade,
per theme, which is the same division as before with the theme axis added.

The grade is per PICTURE as well, and that half arrived second. One set of
numbers ran over both frames for a while, deliberately: the pictures are meant to
read as one paper stock the column is printed on, and the fear was that a grade
tuned on one and eyeballed onto the next is how that comes apart. What actually
happened is that they are separate photographs. The plate is a hazy backlit dome
that fills its frame; the car is a gondola on a wire with a gantry cut across the
top of it, shot in different light on a different day; the eye is a thin steel
lattice against blown-out sky with almost no midtone in it at all. SHADOW and
HIGHLIGHT are absolute — they say where black and white LAND, in output units —
so one pair cannot be right for every frame, and there was no knob that could say
so: --car-opacity mixes the car further into the page and moves neither endpoint,
which is the same thing --plate-opacity could not do across the themes.

Sharing them was also never what made the pictures read as one stock. The pipeline
is what does that — percentile exposure, the same shoulder, the same desaturation
toward the same tint — and that is still shared, stage for stage. What is per
picture is only where each frame's ends are pinned.

So the grade axes are picture × theme, two Grades per picture, and the tuner has
both switches: the theme button swaps which grade you are dragging AND which
paper it stands on, the picture button swaps which grade you are dragging AND
which frame it runs over. A run bakes one ladder per theme for the one stem it was
given. The two ladders are named `<stem>-<width>.webp` and
`<stem>-dark-<width>.webp`, matching how styles.css already declares
`--plate-opacity` — once in `:root` and again in `:root[data-theme="dark"]`.
Light is the unsuffixed one because it is the page's default and because that is
the name the plate has always had.

When a picture's dark Grade is identical to its own light one, its dark ladder is
not written at all and portfolio/index.html falls back to the light file. That is
a designed state and not a missing one: two byte-identical ladders on disk would
be pure cost, so a picture's dark files exist exactly when its dark has been
tuned to something of its own. The comparison is within one picture — the plate
having tuned its dark says nothing about whether the car needs to.

The one thing alpha is used for is the sky, and it is a matte rather than a crop.
No sky is wanted, only the building. Cropping it out was tried first and cannot
work: the dome is the tallest thing in the frame and the sky closes over it on
both sides, so the tallest sky-free rectangle starts below the balustrade — it
throws away the lantern, the cross and the whole curve of the dome, which is the
entire reason to use this photograph. So the frame is kept whole and the sky is
knocked out to transparent, and the page's own paper becomes the sky. See
sky_matte().

THE GRADE
---------
Order matters; this is the pipeline, and every stage is a field of Grade below —
so every stage is also a thing the two themes, and the three pictures, can
disagree about. The pipeline itself is shared by all six; only its numbers are not.

1. Develop linear (`gamma=(1, 1)`, `no_auto_bright=True`). Grading multiplicative
   things — exposure, desaturation — in linear light is the difference between
   stone that goes grey and stone that goes muddy. The whole frame, uncropped.
2. Exposure by percentile, not by eye. EXPOSURE_PCT of the luma histogram is
   driven to EXPOSURE_TARGET, so a different frame off the same camera lands in
   the same place instead of needing the number re-tuned. Measured over the
   building only, with the sky masked off. That matters more on this frame than
   on any it could have been: the sky is nearly HALF of it, and being backlit it
   is also the brightest half, so it owns everything above the 55th percentile.
   Left in, EXPOSURE_PCT would be measuring haze, and the building would go
   wherever that happened to put it.
3. Desaturate to SAT_KEEP of the original chroma. The tint in step 6 is applied
   *to* what survives here, so this is the knob that decides whether the result
   reads as a tinted photograph or as a duotone. At 1.00 it is off — the frames
   keep their own colour, and it is step 6 that keeps them quiet rather than this.
   It ran at 0.24 for a long time on the reasoning that full chroma would compete
   with the tint, and the measurement says it cannot: the endpoints below compress
   every channel into the SHADOW..HIGHLIGHT span, so the ~10 codes of chroma these
   hazy London frames carry arrive as about 4, and --plate-opacity then divides
   that again. Composited, the whole page moves by at most 3 codes of any channel
   between 0.24 and 1.00, at a mean page luma identical to two decimal places.
   Which is also the honest reading of this stage: it costs nothing either way,
   and the colour is in the file for whatever the endpoints are later asked to do
   with it. The desaturation is a lerp toward linear luma, so it is exactly
   luma-preserving — moving it moves no pixel's brightness, and the drift the
   measurement does see (under one code, per pixel) is step 5's curve acting on
   channels that are now further apart.
   The sky is not a consideration: it is matted out before this is seen.
4. Encode to sRGB gamma. Everything after this is a tone curve, and tone curves
   want perceptual space — the same S-curve applied in linear crushes shadows.
5. Contrast S-curve at CONTRAST strength, then the highlight shoulder
   `1 - (1 - t)**HIGHLIGHT_PUSH`. The shoulder is the "whites slightly brighter"
   half of the brief: it is concentrated near the top of the range and, being a
   power of the *inverse*, cannot take anything past 1.0. A plain gain would have
   clipped the sunlit stone flat, which is the one thing this frame cannot spare.
6. Per-channel range remap onto SHADOW and HIGHLIGHT:

       out_c = SHADOW_c + (HIGHLIGHT_c - SHADOW_c) * t_c

   This is the tint and the black lift in one step, and it is why they are one
   step: the endpoints are colours, so the blacks land exactly on a warm dark
   grey and the whites exactly on a warm near-white, while the *differences*
   between channels — what step 3 left of the real colour — ride through
   untouched. Tinting and then separately lifting would fight; the lift would
   drag the tint toward neutral in the shadows, where it is most visible.
7. Grain, GRAIN_SIGMA, monochrome, weighted `4t(1-t)` so it peaks in the mids and
   dies at both ends. Grain in the lifted blacks would read as sensor noise and
   undo the point of lifting them; grain in the highlights reads as JPEG.
8. Downsample to each rung of OUT_WIDTHS, attach the matte as alpha, encode.

WHY THESE ENDPOINTS
-------------------
SHADOW and HIGHLIGHT are step 6, and between them they decide the whole of how
loud the plate is: everything before them shapes a 0..1 ramp, and they say what
0 and 1 mean in ink. They are the first place to reach for, and the reason the
tuner has an "overall level" slider that drives both at once.

They are also the pair whose answer depends most obviously on both axes, which is
what A GRADE PER PICTURE, A LADDER PER THEME above is about. Either picture has to
stay quieter than the type at both ends — a half-page image that is louder than
the words becomes the thing you look at first — and "quieter than the type" is
measured against the paper and ink of the theme it is standing in (styles.css
`:root` and `:root[data-theme="dark"]`), which are inverted between the two. It is
measured against the frame as well: the plate spreads a dome across half the page,
the car hangs a gondola in a corner and the eye is a thin lattice with sky through
it, so the same HIGHLIGHT that reads as recessive stone on one can be the
brightest thing on the screen on the next.

WHAT THE ENDPOINTS CANNOT FIX: THE OPACITY EATS THEM
----------------------------------------------------
They are the first place to reach for and they are also, on their own, the weakest
lever on this page, because nothing here is ever seen at full strength. The
stylesheet composites every picture at --plate-/--car-/--eye-opacity, so what a
display is asked to show is

    paper * (1 - opacity) + ink * opacity

and a move of N units between two endpoints arrives as N * opacity. At the eye's
0.12 on white, the whole ladder from SHADOW to HIGHLIGHT — 92 units of ink —
becomes ELEVEN 8-bit codes on screen, 224 to 235. The entire picture is eleven
greys. Moving both endpoints five units, which is a visible change in the tuner
at full strength, moves the composite by 0.6 of one code: below the quantiser,
and below any display's ability to show it either way.

So an endpoint pair is the knob for WHERE the picture sits and a poor one for
whether it can be seen at all. The measurements, in CIE L* because eight bits are
not a perceptual unit:

    light, 0.12 on #fff    picture spans dL* 2.95, sits dL* 3.0..0.0 off the paper
    dark,  0.17 on #000    picture spans dL* 4.55, sits dL* 0..4.6 off the paper

The light row is the CURRENT light endpoints and the dark row is the ones the next
section replaces, which is why they are not a matched pair — each is the state its
own section argues about. Before the light endpoints moved, that first row read

    light, 0.12 on #fff    picture spans dL* 3.88, sits dL* 10.7..6.8 off the paper

and the paragraph above, along with the whole of the section after next, was
written against it. See WHAT THE LIGHT PAPER NOW COSTS.

THE ARITHMETIC OF THE DARK PAPER
--------------------------------
Two things fall out of that table, and both are about the second row. The dark
picture's SHADOW end is not near the page, it IS the page — 0x00 * 0.17 = 0, the
same code as the paper — so a fifth or so of the frame is not being dimmed, it is
being deleted, and what is left runs from code 0 to code 16. That band is exactly
where an OLED panel's own black handling lives: near-black codes are where
per-pixel dimming, and any black crush on top of it, do their worst. It is also
where a laptop at half brightness in a bright room has nothing left to give. A
calibrated desktop display in a dim room will resolve all sixteen of those codes,
which is why this reads as a display problem and is really a headroom problem.

DARK_SHADOW and the three *_DARK_HIGHLIGHT below are the answer to that paragraph,
and the ceiling moved because the floor did. Lifting SHADOW alone would have raised
the floor by narrowing the picture — the ceiling was not moving — so the dark end
would arrive at the cost of everything between the two. Both move, on the plate:

    SHADOW    0x00 -> 0x2c    composite  0.0 -> 7.5    dL* 0.00 -> 2.05
    HIGHLIGHT 0x5c -> 0x8a    composite 15.6 -> 23.5   dL* 4.55 -> 7.97

which takes the picture off the paper at both ends and widens what it spans from
dL* 4.55 to 5.92. The type it must stay under is #eaeaea on #000, dL* 92.7, so
this is still an order of magnitude quieter than the words and the reason to stop
here is not the type — there is room — it is that a floor much above this stops
reading as ink on black paper and starts reading as a grey card laid on it.

This changed no light grade at the time, and the reason is the sentence the next
section is named after: the two papers fail at OPPOSITE ends. On black it is SHADOW
that lands on the page; on white it is HIGHLIGHT. That asymmetry is the whole
argument for a Grade per theme, and it was arrived at from the arithmetic rather
than by eye.

WHAT THE LIGHT PAPER NOW COSTS
------------------------------
The light endpoints have since moved, and they moved the other way: SHADOW up to
0xb8 (0xc7 on the eye) and HIGHLIGHT to 0xff. On white that is the dark paper's
pathology chosen deliberately — 0xff composites onto a #fff page at exactly the
page's own value, so the light picture's HIGHLIGHT end is now not dim, it is gone,
and what is left runs from code 246 to code 255:

    plate  SHADOW 0x00 -> 0xb8   composite 224.4 -> 246.5   dL* 10.68 -> 2.95
           HIGHLIGHT 0x5c -> 0xff   composite 235.4 -> 255.0   dL*  6.80 -> 0.00

which narrows what the picture spans from dL* 3.88 to 2.95 and brings its whole
band to within 3 dL* of the paper. Composited and averaged over each picture's own
subject — the mean, not the endpoints, and taken over alpha > 0.99 so the feathered
roofline is not counted — the three land at

    plate dL* 2.43    car dL* 1.79    eye dL* 2.03      (were 10.01, 10.02, 10.60)

so all three are about a quarter as far off the page as they were. That is a
watermark rather than a picture, and it is a judgement about how loud this page
wants to be rather than anything the arithmetic asked for: everything above says
the light side had dL* 10.7 of room and was using it.

Two things follow that are worth having written down before the next person moves
these. The band is now EIGHT to nine 8-bit codes wide on white, so the quantiser
argument in WHAT THE ENDPOINTS CANNOT FIX now bites on the light theme too and did
not before — the levers that widen a band, --*-opacity and --*-fill, are the only
ones left with anything to give here. And the three pictures are no more equal to
each other than they were: they spread 0.64 dL* either way, which was 6% of the
old level and is 31% of this one. Equalising them is still --*-opacity's job, for
the reason the next section gives, and it is now a larger job than it was.

WHICH KNOB EACH PAPER ANSWERS TO
---------------------------------
The three pictures have to be equally loud as each other, and that is a different
question from how loud they all are — a ratio rather than a level, so unlike the
paragraph above it has the same answer on every display. What it does NOT have is
the same answer on both papers, and the reason is a ceiling on one side and a floor
on the other.

On BLACK, the knob is these endpoints. Opacity cannot be it: --*-opacity multiplies
the ink, so turning a picture down drags its SHADOW back toward the page and undoes
the lift this whole section is about. The ceiling is free to move, so it moves.

On WHITE, the knob is --*-opacity in styles.css, and the endpoints cannot be it.
At 0.12 the furthest any ink can get from white paper is dL* 10.68, and the three
pictures sat at 9.89, 9.08 and 8.80 — inside the last dL* of the range. Solving for
a HIGHLIGHT that equalises them there asks for 0x17 and 0x14, which is not a grade,
it is crushing two of the pictures to a silhouette to buy a difference the paper has
no room for. Raising a picture's opacity instead moves its whole band away from the
paper and costs nothing, because on white nothing is being clipped into the page at
the bottom.

Those three figures are the endpoints this page had before WHAT THE LIGHT PAPER NOW
COSTS, and they are left standing because the argument is about the RATIO and the
ratio is what survived the move: at dL* 2.43, 1.79 and 2.03 the pictures are no
closer together, and every reason below for reaching for opacity instead of a
ceiling holds at the new level exactly as it did at the old one. What has changed is
only that there is now less of the range in use, not that some other knob has become
the right one.

So: a picture's share of the light is set on black here, and on white in styles.css,
and each is the only place its own paper leaves room for.

The three levers, in the order of how much they actually move:

* --*-opacity, which multiplies both the distance from the paper AND the number of
  distinct codes the picture is drawn in. It is the only one that widens the band.
* the picture's SIZE (--*-fill), which changes no code at all but changes how many
  pixels each surviving code is spread over — the one lever that helps a picture
  that is already at the quantiser floor.
* the endpoints here, which slide the band without widening it, and which are
  worth tuning only once the band is wide enough to see.

Lift SHADOW off the paper before anything else on the dark side: on black, SHADOW
is the end that is being thrown away, and on white it is HIGHLIGHT.

NEUTRAL SOURCE
--------------
<name>-source.webp is step 1 and nothing else: the linear develop, sRGB-encoded so
that eight bits are spent perceptually, scaled down to NEUTRAL_WIDTH, sky and all.
Ungraded and unmatted on purpose — it is the input every stage above starts from,
so a tool holding it can run the whole pipeline itself and show you the answer
while you drag. That is design/plate/plate-tuner.html, and it is why the sky is
still in the file: the matte is one of the things being tuned.

Its companion <name>-source.json carries the constants this script was last run
with, so the tuner opens on the picture as it stands rather than on a table of
numbers hand-copied from here that would drift the first time one changed. One
pair per picture, and the grade in each is that picture's own grade — the tuner
reads whichever it is pointed at and offers the others as frames to check it
against.

The three ways the tuner's answer is an approximation of this script's, none of
which move a judgement you would make at --plate-opacity:
* Eight bits, and lossy WebP, standing in for float32 off the raw.
* It grades at NEUTRAL_WIDTH; this grades at full width and then downsamples, so
  its curve is very slightly the smoother of the two (see the note in main()).
* Grain is sized in output pixels either way, but the two images have a different
  number of them, so the grain is the right strength and the wrong scale there.
"""

from __future__ import annotations

import hashlib
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import NamedTuple

import cv2
import numpy as np
import rawpy
from PIL import Image, ImageFilter
from scipy import ndimage

# ---- the grade ------------------------------------------------------------
class Grade(NamedTuple):
    """One picture's worth of the pipeline in THE GRADE above, in one theme,
    stage by stage.

    The fields are SHOUTED because they are the constants — these are the names
    design/plate/plate-tuner.html prints in the block you paste back, and they
    read as the same eight things they have always been rather than as the
    attributes of a record that happens to hold them.
    """
    EXPOSURE_PCT: float                 # percentile of linear luma driven to...
    EXPOSURE_TARGET: float              # ...this value, before the tone curve
    SAT_KEEP: float                     # fraction of original chroma kept
    CONTRAST: float                     # blend toward a smoothstep S-curve
    HIGHLIGHT_PUSH: float               # >1 lifts highlights; 1.0 is off
    SHADOW: tuple[int, int, int]        # where black lands
    HIGHLIGHT: tuple[int, int, int]     # where white lands
    GRAIN_SIGMA: float                  # in output units, 0..1


# Two Grades per picture, named <STEM>_<THEME> — which is the name
# design/plate/plate-tuner.html prints over each block it asks you to paste, so the
# block and the call it replaces are found by the same word. Each is spelled out in
# full, and none is written as another's name, on purpose: the whole point of
# splitting them is that a number moved on one frame reaches nothing else, and
# `CAR_LIGHT = PLATE_LIGHT` would quietly re-bake the car out of a session spent
# looking at the plate.
#
# They open on identical numbers, because that is what shipped while there was one
# grade for everything, so splitting them changed no pixel of any picture. What it
# changed is that moving one of them now moves one of them. The eye arrived after
# the split and opens on the same numbers for the same reason from the other end:
# a third picture off this pipeline is a third print of one paper stock until
# somebody looks at it and says otherwise.
#
# The three lights then moved together, and a long way: SHADOW from the bottom of
# the range to near the top of it, HIGHLIGHT onto the paper itself. That is a
# judgement about how loud these pictures are on white — a watermark rather than a
# grey picture — and not a correction of anything. It is also the one set of
# endpoints in this file chosen AGAINST the arithmetic the docstring gives for
# them: see WHAT THE LIGHT PAPER NOW COSTS.
#
# HIGHLIGHT is shared here and SHADOW is not, which is THE ARITHMETIC OF THE DARK
# PAPER's rule with the papers swapped rather than a second rule. The end that
# lands on the page is a property of the PAPER — 0xff composites to 255 on #fff for
# the eye exactly as it does for the plate — so it is one value; the end that has
# to carry the picture is a property of the FRAME, so it is three.
LIGHT_HIGHLIGHT = (0xff, 0xff, 0xff)   # the paper itself: composites to 255 on #fff
PLATE_LIGHT = Grade(
    EXPOSURE_PCT=99.0,
    EXPOSURE_TARGET=0.34,
    SAT_KEEP=1.00,
    CONTRAST=0.36,
    HIGHLIGHT_PUSH=1.34,
    SHADOW=(0xb8, 0xb8, 0xb8),      # composites to code 246.5 on white at 0.12
    HIGHLIGHT=LIGHT_HIGHLIGHT,
    GRAIN_SIGMA=0.0075,
)

# A picture's dark opened as its OWN light for as long as the question on black was
# "is this too loud", which is the question the light grade is already an answer to.
# It is the wrong question. On black the picture is not too loud, it is not there:
# see THE ARITHMETIC OF THE DARK PAPER in the docstring for the measurement, but
# the short of it is that SHADOW=0x00 composites onto a #000 page at exactly the
# page's own value, so the dark end of every one of these pictures is not dim, it
# is deleted.
#
# So all three darks are spelled out below, and all three move the same two
# endpoints in the same direction: SHADOW up off the paper, HIGHLIGHT up with it so
# that lifting the floor flattens nothing. They are still one paper stock — the
# pipeline above is shared stage for stage, and this is the endpoints only.
DARK_SHADOW = (0x2c, 0x2c, 0x2c)     # composites to code 7.5 on black at 0.17
# SHADOW is shared and HIGHLIGHT is not, and the split is the one the section above
# argues for rather than a compromise between them. The floor is a property of the
# PAPER: 0x00 lands on #000 for the plate exactly as it does for the eye, and the
# value that clears the page is arithmetic. The ceiling is a property of the FRAME,
# because what a picture's HIGHLIGHT does depends on how much of that picture is
# near the top of its own range — and that is where sharing one pair went wrong.
#
# It went wrong measurably. Composited onto the page and measured over each
# picture's own subject, one shared 0x8a put them at a mean of
#
#     plate dL* 2.91    car dL* 3.80    eye dL* 2.86
#
# so the car was putting about a third more light on the page than the other two.
# Not because its endpoints differed — they did not — but because the gondola and
# the gantry sit high in the frame's range where the dome and the lattice do not.
# The percentile exposure in step 2 pins the TOP of each frame to the same place;
# it says nothing about where the mass underneath it sits, and the mass is what a
# picture's loudness is.
#
# So the three ceilings below are solved rather than judged: each is the HIGHLIGHT
# that brings that picture's mean to the plate's 2.91, the plate being the one of
# the three that was already right. See THE ARITHMETIC OF THE DARK PAPER.
PLATE_DARK_HIGHLIGHT = (0x8a, 0x8a, 0x8a)   # the reference — dL* 2.91
CAR_DARK_HIGHLIGHT = (0x61, 0x61, 0x61)     # was 0x8a, at dL* 3.80
EYE_DARK_HIGHLIGHT = (0x90, 0x90, 0x90)     # was 0x8a, at dL* 2.86
PLATE_DARK = Grade(
    EXPOSURE_PCT=99.0,
    EXPOSURE_TARGET=0.34,
    SAT_KEEP=1.00,
    CONTRAST=0.36,
    HIGHLIGHT_PUSH=1.34,
    SHADOW=DARK_SHADOW,
    HIGHLIGHT=PLATE_DARK_HIGHLIGHT,
    GRAIN_SIGMA=0.0075,
)

CAR_LIGHT = Grade(
    EXPOSURE_PCT=99.0,
    EXPOSURE_TARGET=0.34,
    SAT_KEEP=1.00,
    CONTRAST=0.36,
    HIGHLIGHT_PUSH=1.34,
    SHADOW=(0xb8, 0xb8, 0xb8),      # composites to code 245.4 on white at 0.135
    HIGHLIGHT=LIGHT_HIGHLIGHT,
    GRAIN_SIGMA=0.0075,
)

CAR_DARK = Grade(
    EXPOSURE_PCT=99.0,
    EXPOSURE_TARGET=0.34,
    SAT_KEEP=1.00,
    CONTRAST=0.36,
    HIGHLIGHT_PUSH=1.34,
    SHADOW=DARK_SHADOW,
    HIGHLIGHT=CAR_DARK_HIGHLIGHT,
    GRAIN_SIGMA=0.0075,
)

EYE_LIGHT = Grade(
    EXPOSURE_PCT=99.0,
    EXPOSURE_TARGET=0.34,
    SAT_KEEP=1.00,
    CONTRAST=0.36,
    HIGHLIGHT_PUSH=1.34,
    SHADOW=(0xc7, 0xc7, 0xc7),      # composites to code 247.7 on white at 0.131
    HIGHLIGHT=LIGHT_HIGHLIGHT,
    GRAIN_SIGMA=0.0075,
)

# The eye was the first of the six to be spelled out, and for a reason that was not
# a dark-theme judgement at all: light moved and dark stayed, so this block held the
# numbers both themes had shared. It now holds the same pair as the other two.
EYE_DARK = Grade(
    EXPOSURE_PCT=99.0,
    EXPOSURE_TARGET=0.34,
    SAT_KEEP=1.00,
    CONTRAST=0.36,
    HIGHLIGHT_PUSH=1.34,
    SHADOW=DARK_SHADOW,
    HIGHLIGHT=EYE_DARK_HIGHLIGHT,
    GRAIN_SIGMA=0.0075,
)

# Light first in each: it is the page's default, and out_path() spells it
# unsuffixed. Hung off the Picture below rather than held in a second dict keyed
# by stem, so there is no pair of tables to drift apart.
PLATE_GRADES = {"light": PLATE_LIGHT, "dark": PLATE_DARK}
CAR_GRADES = {"light": CAR_LIGHT, "dark": CAR_DARK}
EYE_GRADES = {"light": EYE_LIGHT, "dark": EYE_DARK}

GRAIN_SEED = 20250615      # the frame's own date; any constant would do
# One seed for every grade, and not a field of Grade: the grain is the frame's
# own, so a picture's two ladders wear the SAME grain at whatever strength each
# asks for. Two streams would make flipping the theme move every grain in the
# picture, on top of the change you meant. Sharing it across every one of PICTURES
# costs nothing either way — they are different frames, so the same stream lands
# on different pixels — and it keeps the seed what it is, a constant rather than a
# decision.

# ---- the sky matte --------------------------------------------------------
# Brightness alone separates this frame, and it has to: the sky is a hazy backlit
# white, not a blue one. An earlier version of this script tested blueness AND
# brightness together, because the frame it was written for was a facade against
# a deep blue sky. That test is not merely unnecessary here, it is INVERTED —
# measured on the normalised channels of the linear develop, the sky's blueness
# runs +0.01 (the cloud) to +0.07, and the dome's own stone, lit by that same
# white sky, reads +0.11 to +0.15. The bluest thing in the picture is the
# building. Ask for blue and you knock out the dome and keep the sky.
#
# What is true instead is that nothing built comes anywhere near the sky's
# brightness. In linear luma the sky and its cloud sit at 0.10-0.18; the stone of
# the dome, the brick of the tower and the rooftops along the bottom sit at
# 0.008-0.031. The gap between them is empty: over the whole frame, moving a flat
# threshold from 0.050 to 0.095 changes what it selects by 2.5% of the pixels,
# and nearly all of that is the sky's own falloff. There is no cut to get wrong.
#
# Except in one corner, and it is the same failure the blue version had. The sky
# is not one brightness — it falls off toward the corners, partly the lens and
# partly the sky's own gradient away from the sun — and in the top-right corner
# (top-LEFT as shot; the frame is mirrored) it lands at 0.083-0.101. A flat
# SKY_LUMA_MIN left a ragged wedge of sky behind there, painted as though it were
# building, which is the one place on the page where the plate reads as a bad
# cut-out rather than as stock.
#
# Lowering SKY_LUMA_MIN to reach it is not the fix, and here the reason is sharp:
# the sunlit lead ribs of the tower's dome peak at 0.149, ABOVE the dim end of the
# sky. No flat threshold can hold both. What separates them is that the dark
# corner is CONTIGUOUS with sky that passes the bright test and the lead ribs are
# not — so the bright test is applied to the seed only, and the region is then
# allowed to grow down to SKY_LUMA_LOW. Hysteresis, as in a Canny edge, and for
# the same reason: the confident pixels vouch for the marginal ones they touch,
# and marginal pixels standing on their own are left alone.
#
# The result is insensitive to where SKY_LUMA_LOW is put — the corner is fully
# covered anywhere from 0.085 down, and the matte grows by 0.2% of the frame over
# the whole span from there to 0.065, none of it on the building. 0.075 is the
# middle of that plateau.
SKY_LUMA_MIN = 0.130      # linear luma a pixel needs to seed the sky
SKY_LUMA_LOW = 0.075      # ...and to stay in it, once something brighter vouches
SKY_EDGE_BLUR = 1.2       # px at output scale, to keep the roofline from aliasing

# ---- the ladder -----------------------------------------------------------
# One file per rung per picture, and the page picks the smallest that covers it.
# Both are scaled to the HEIGHT of the first screen — --plate-fill and --car-fill
# in styles.css, shares of --fold — so what a display actually needs is
#
#     viewport CSS height * fill * devicePixelRatio
#
# which for the plate is 2185 on a 844px phone at 3x, 1450 on a 840px laptop at
# 2x, 932 on a 1080px desktop at 1x, and 2484 on a 1440px 5K at 2x, and roughly
# seven tenths of each of those for the car and the eye. The rungs bracket that
# range. They
# are duplicated in portfolio/index.html, which does the picking — see RUNGS
# there, and keep the two lists the same.
#
# It cannot be one file. The top rung is 600 KB and the bottom is 50 KB, and
# sending the first to a phone to decorate it at 12% opacity would cost more than
# everything else on the page put together.
OUT_WIDTHS = (800, 1300, 2000, 2800)
# 78 rather than 82: the picture composites at 0.12, so a WebP artefact
# arrives at an eighth of its strength, and nothing survives that. Measured over
# the ladder, 78 is ~7% smaller than 82 with no difference visible on the page.
WEBP_QUALITY = 78

# ---- the tuner's copy -----------------------------------------------------
# Narrower than the plate: it is graded per-pixel in a browser on every drag, and
# 900 is both more than the ~544 CSS pixels the plate is drawn at and few enough
# that a full re-grade lands inside a frame. Quality is high because this file is
# an INPUT — its artefacts would be graded along with the picture, and a contrast
# curve is exactly the thing that finds them.
NEUTRAL_WIDTH = 900
NEUTRAL_QUALITY = 95

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
OUT_DIR = REPO / "portfolio" / "img"


# ---- the three pictures ----------------------------------------------------
# Everything above this line is shared, and everything in here is a property of
# one frame rather than of the grade. `mirror` is the only one that is a decision
# — see the mirror paragraph in the docstring — and `stem` is what every file
# either picture owns is named after, on both ends: portfolio/img/<stem>-*.webp
# for the ladder, <stem>-source.webp and .json beside this script for the tuner,
# and --<stem>-* for the custom properties in styles.css that place it.
#
# The grade IS in here, one Grade per theme, because it is a property of the frame
# like everything else on this class — see A GRADE PER PICTURE, A LADDER PER THEME.
# The theme axis is the one thing that stays outside it: `grades` is keyed by theme
# and out_path() spells the theme into the filename, and those two are the whole of
# it.
@dataclass(frozen=True)
class Picture:
    stem: str
    corner: str
    mirror: bool
    grades: dict[str, Grade]

    @property
    def neutral_path(self) -> Path:
        return HERE / f"{self.stem}-source.webp"

    @property
    def meta_path(self) -> Path:
        return HERE / f"{self.stem}-source.json"

    def out_path(self, width: int, theme: str) -> Path:
        """Light is unsuffixed — see A GRADE PER PICTURE, A LADDER PER THEME.
        portfolio/index.html builds these same two names; keep the two spellings
        together."""
        return OUT_DIR / (f"{self.stem}-{width}.webp" if theme == "light"
                          else f"{self.stem}-{theme}-{width}.webp")


PICTURES = {
    "plate": Picture(stem="plate", corner="bottom-left",  mirror=True,
                     grades=PLATE_GRADES),
    "car":   Picture(stem="car",   corner="top-right",    mirror=False,
                     grades=CAR_GRADES),
    "eye":   Picture(stem="eye",   corner="bottom-right", mirror=False,
                     grades=EYE_GRADES),
}
DEFAULT_PICTURE = "plate"

# Rec.709 luma. The desaturation and the grain weight both need a scalar
# brightness and it must be the same one, or the grain drifts off the mids.
LUMA = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def smoothstep(t: np.ndarray) -> np.ndarray:
    return t * t * (3.0 - 2.0 * t)


def srgb_encode(lin: np.ndarray) -> np.ndarray:
    """Linear light 0..1 -> sRGB 0..1. Step 4, and the neutral source's only stage."""
    lin = np.clip(lin, 0.0, 1.0)
    t = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * lin ** (1 / 2.4) - 0.055)
    return np.clip(t, 0.0, 1.0)


def srgb_decode(t: np.ndarray) -> np.ndarray:
    """sRGB 0..1 -> linear light. The exact inverse of srgb_encode.

    Only the cut-out front end needs this. A raw arrives as sensor data and is
    developed straight to linear; a PNG arrives display-referred and has to be
    taken back, or the grade's multiplies — exposure and desaturation, both of
    which assume linear light — land on gamma-encoded numbers and go muddy.
    """
    t = np.clip(t, 0.0, 1.0)
    lin = np.where(t <= 0.04045, t / 12.92, ((t + 0.055) / 1.055) ** 2.4)
    return lin.astype(np.float32)


def develop(path: Path) -> np.ndarray:
    """RW2 -> linear-light float32 RGB, 0..1, orientation applied."""
    with rawpy.imread(str(path)) as raw:
        rgb = raw.postprocess(
            use_camera_wb=True,
            no_auto_bright=True,   # step 2 does exposure, with a number
            gamma=(1, 1),          # linear out; step 4 encodes
            output_bps=16,
        )
    return rgb.astype(np.float32) / 65535.0


def read_cut(path: Path) -> tuple[np.ndarray, np.ndarray]:
    """A pre-cut RGBA image -> linear-light RGB, and its own alpha as the matte.

    The second front end. When the sky has already been knocked out by hand there
    is nothing for sky_matte() to decide, and second-guessing a matte someone cut
    on purpose is the one thing this script should not do — so the file's alpha
    is taken as given, soft edges and all, and only the grade below is applied.

    The RGB *under* a straight-alpha cut-out is still the original sky, which is
    why bleed() matters more here than it ever did for the raw: the feathered
    band is a couple of pixels wide on a computed matte and can be a fifth of the
    frame on a hand-cut one.

    Read with OpenCV and not Pillow, which is the whole reason cv2 is imported.
    Pillow decodes a 16-bit RGBA PNG by silently truncating it to 8 — no error,
    no warning, mode still reports "RGBA" — and 8 bits is not enough for this
    picture. It is low-key: half of it sits under luma 25/255, where eight bits
    leave about 45 distinct codes for the shadows, and the grade below then
    stretches exactly that range. Sixteen bits give ~4900 codes over the same
    span, which is the difference between a smooth dome and a banded one.
    """
    a = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if a is None:
        raise SystemExit(f"could not decode {path.name}")
    if a.ndim != 3 or a.shape[2] != 4:
        raise SystemExit(
            f"{path.name} has no alpha channel — a cut-out source has to carry "
            f"its matte in one. Pass the raw instead to have a matte cut."
        )
    full = 65535.0 if a.dtype == np.uint16 else 255.0
    a = a.astype(np.float32) / full
    bgra = a[..., :3]
    return srgb_decode(bgra[..., ::-1]), a[..., 3]     # cv2 hands back BGR


def load(path: Path, pic: Picture) -> tuple[np.ndarray, np.ndarray, bool]:
    """Source -> (linear-light RGB, alpha 0..1, whether the matte was computed).

    Two front ends, one grade behind them, and the mirror belongs to neither —
    it is here, applied to both, at the head of the pipeline rather than at the
    end where flipping the finished image would also have worked. Everything
    after this — the matte's own "which corner is dark", the exposure percentile,
    the neutral source the tuner grades, the coordinates in the comments — then
    describes one frame, the one that ships. Flipping the plate at the end would
    leave every measurement in this file mirror-image to the picture it is about.

    Which is also why `mirror` is a property of the picture and not a flag on the
    call: it decides which frame every one of those measurements is about.
    """
    if path.suffix.lower() == ".rw2":
        lin = develop(path)
        alpha = (~sky_matte(lin)).astype(np.float32)
        computed = True
    else:
        lin, alpha = read_cut(path)
        computed = False
    if pic.mirror:
        lin, alpha = lin[:, ::-1, :], alpha[:, ::-1]
    return lin, alpha, computed


def sky_matte(lin: np.ndarray) -> np.ndarray:
    """Linear-light RGB in, boolean sky mask out (True where the sky is).

    Four steps, and everything after the first is what makes it a matte rather
    than a threshold:

    * Threshold on brightness — see the constants for why that is the whole test
      on this frame, and why blueness would be worse than useless on it.
    * Grow that seed through anything down to SKY_LUMA_LOW, which is what carries
      the matte into the darkened corner. Written as a labelling of the permissive
      predicate rather than as a fill from the seed, because what a component
      needs to prove is a property of the whole component: that it contains a
      confident pixel, and separately that it reaches the sky.
    * Keep only what touches the top edge. This is what saves the sunlit lead of
      the tower's dome, which is brighter than the dim end of the sky and would
      otherwise be punched straight through, leaving the roof in stripes. Actual
      sky reaches the top of the frame and a lit roof does not, so connectivity
      separates them and nothing else does. It is also what keeps the daylight in
      the tower's arched opening, which is genuinely sky but reads as the shaded
      inside of the tower and is wanted there.
    * Fill anything the sky fully encloses — small dark specks on the skyline that
      are neither sky nor building: left in, they survive the knockout floating in
      the page's white with nothing under them. The building is not filled by
      this, because a region touching the array border is not enclosed and the
      building runs off the bottom and both sides. Nor is the weathervane or the
      cross on the lantern: both are attached to what holds them up.
    """
    luma = lin @ LUMA
    seed = luma > SKY_LUMA_MIN

    labels, _ = ndimage.label(luma > SKY_LUMA_LOW)
    vouched = np.unique(labels[seed])
    touching_top = np.unique(labels[0])
    keep = np.intersect1d(vouched[vouched > 0], touching_top[touching_top > 0])
    sky = np.isin(labels, keep)

    return ndimage.binary_fill_holes(sky)


def bleed(rgb: np.ndarray, hole: np.ndarray) -> np.ndarray:
    """Paint the nearest kept pixel over every pixel of `hole`, so there is no halo.

    The sky's own graded colour must not survive anywhere near the roofline. It is
    a mid tone, the page behind it is white or black, and the partly-transparent
    pixels along the roofline would mix the two into a fringe that reads as a bad
    cut-out. So the sky is painted over with the nearest kept pixel first, and the
    mix at the edge is then subject-to-page, which is what a clean matte is.

    Exactly the nearest kept pixel, by Euclidean distance, and not — as this did
    until the photograph changed — a few rounds of grey dilation. Dilation takes
    the MAXIMUM of each neighbourhood, so it only carries the subject into the
    hole while the subject is the brighter of the two. That held for a sunlit
    facade against a deep blue sky and is false for a building against a bright
    one: the dilation then re-copied the sky over itself and did nothing, and the
    fringe it exists to prevent was baked into the plate. The distance transform
    has no such polarity, costs one pass instead of a loop, and is what the
    tuner's own bleed already did — which is how the two came to disagree.
    """
    idx = ndimage.distance_transform_edt(hole, return_distances=False, return_indices=True)
    return rgb[tuple(idx)]


def grade(lin: np.ndarray, keep: np.ndarray, g: Grade) -> np.ndarray:
    """Steps 2-7. Linear-light in, sRGB-encoded 0..1 out.

    `keep` is the non-sky mask, and it is used for the exposure percentile only —
    every later stage is per-pixel and does not care what is sky.

    `g` is the theme's Grade. Called once per theme, off the same `lin`, which is
    why the develop and the matte are outside this function and not in it: those
    two are the photograph and are the same in both, and re-deriving them per
    theme would be both slower and a chance for the two ladders to disagree about
    the shape of the building.
    """
    # 2. exposure, over the building only
    luma = lin @ LUMA
    ref = float(np.percentile(luma[keep], g.EXPOSURE_PCT))
    lin = lin * (g.EXPOSURE_TARGET / max(ref, 1e-6))

    # 3. desaturate (in linear — see docstring)
    luma = (lin @ LUMA)[..., None]
    lin = luma + (lin - luma) * g.SAT_KEEP
    lin = np.clip(lin, 0.0, 1.0)

    # 4. encode
    t = srgb_encode(lin)

    # 5. contrast, then the highlight shoulder
    t = t + (smoothstep(t) - t) * g.CONTRAST
    t = 1.0 - (1.0 - t) ** g.HIGHLIGHT_PUSH

    # 6. per-channel remap onto the two endpoints
    shadow = np.array(g.SHADOW, dtype=np.float32) / 255.0
    highlight = np.array(g.HIGHLIGHT, dtype=np.float32) / 255.0
    out = shadow + (highlight - shadow) * t

    # 7. grain, peaking in the mids
    grey = out @ LUMA
    weight = np.clip(4.0 * grey * (1.0 - grey), 0.0, 1.0)[..., None]
    # Seeded here rather than once at module scope, so each theme draws the same
    # numbers off the same seed and the two ladders share one grain pattern.
    rng = np.random.default_rng(GRAIN_SEED)
    out = out + rng.standard_normal(grey.shape).astype(np.float32)[..., None] * (
        g.GRAIN_SIGMA * weight
    )

    return np.clip(out, 0.0, 1.0)


def grade_json(g: Grade) -> dict:
    """One Grade as the tuner wants to read it: the colours as hex, everything
    else as it stands. Field order is the pipeline's order, which _asdict keeps."""
    return {
        k: "#%02x%02x%02x" % v if isinstance(v, tuple) else v
        for k, v in g._asdict().items()
    }


def write_neutral(pic: Picture, lin: np.ndarray, alpha_f: np.ndarray, computed: bool) -> None:
    """Step 1 on its own, plus the constants, for design/plate/plate-tuner.html.

    Encoded rather than left linear, and scaled by nothing. Eight bits of linear
    light would put a quarter of its codes above anything in this frame and leave
    the shadows in about five, which is where every one of the tone-curve
    constants does its work; eight bits of sRGB spends them where the eye is. And
    the develop already lands inside 0..1 with room over the sunlit stone — the
    exposure stage is a multiply the tuner can do for itself — so there is no
    scale factor to record and none to get wrong.

    A cut-out source also sends its alpha along, and `matte` in the JSON goes
    null. The two say the same thing to the tuner: the matte is an input here, not
    a decision, so there is nothing on that panel to drag and it hides itself. The
    sky's own pixels stay in the RGB either way — ungraded and unbled, because the
    tuner does its own bleeding and needs something to bleed over.
    """
    srgb = np.round(srgb_encode(lin) * 255.0).astype(np.uint8)
    img = Image.fromarray(srgb, mode="RGB")
    height = round(img.height * NEUTRAL_WIDTH / img.width)
    img = img.resize((NEUTRAL_WIDTH, height), Image.LANCZOS)
    if not computed:
        a = Image.fromarray(np.round(alpha_f * 255.0).astype(np.uint8), mode="L")
        img.putalpha(a.resize((NEUTRAL_WIDTH, height), Image.LANCZOS))
    img.save(pic.neutral_path, "WEBP", quality=NEUTRAL_QUALITY, method=6)

    pic.meta_path.write_text(json.dumps({
        "_": "Written by build-plate.py. The constants plate-tuner.html opens on — "
             "so that what it calls 'was' is what the picture on the page really is.",
        "stem": pic.stem,
        "corner": pic.corner,
        "source": pic.neutral_path.name,
        "width": img.width,
        "height": img.height,
        "outWidths": list(OUT_WIDTHS),
        # Keyed by theme, because the grade is. The picture axis needs no key: this
        # file IS one picture's, so <stem>-source.json holding its own two themes is
        # the whole of per-picture on this end. The tuner files each theme's numbers
        # under its own key and shows you the one you are looking at.
        "grade": {theme: grade_json(g) for theme, g in pic.grades.items()},
        "matte": {
            "SKY_LUMA_MIN": SKY_LUMA_MIN,
            "SKY_LUMA_LOW": SKY_LUMA_LOW,
            "SKY_EDGE_BLUR": SKY_EDGE_BLUR,
        } if computed else None,
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def ladder_stamp() -> str:
    """A short digest of EVERY picture's ladder, for portfolio/index.html's
    IMG_VERSION.

    Over all of them and not just the one this run built, because it is one token
    on the page covering every rung of every picture — so a run that touches only
    the eye still has to report a value that accounts for the plate and the car,
    or pasting it would silently revert their share of the URL.

    Names as well as bytes, so that a rung appearing or disappearing moves the
    stamp even in the impossible case where the remaining bytes are unchanged.
    Sorted, because glob order is not promised and a stamp that depends on it
    would differ between machines for one picture.
    """
    h = hashlib.sha256()
    for p in sorted(OUT_DIR.glob("*.webp")):
        h.update(p.name.encode("utf-8"))
        h.update(p.read_bytes())
    return h.hexdigest()[:8]


def usage() -> str:
    """The invocation line out of the docstring, found rather than indexed.

    It was indexed, and the index was wrong: the title above it has been one line
    and is now two, so the constant pointed at the blank between them and the
    error message printed nothing at all. Nobody notices a usage line that only
    appears when you have already got the call wrong.
    """
    return next(ln.strip() for ln in __doc__.splitlines()
                if ln.lstrip().startswith("python "))


def main() -> int:
    if not 2 <= len(sys.argv) <= 3:
        print(usage(), file=sys.stderr)
        return 2

    src = Path(sys.argv[1])
    if not src.is_file():
        print(f"no such file: {src}", file=sys.stderr)
        return 1

    name = sys.argv[2] if len(sys.argv) == 3 else DEFAULT_PICTURE
    pic = PICTURES.get(name)
    if pic is None:
        print(f"no such picture: {name} (one of {', '.join(PICTURES)})", file=sys.stderr)
        return 2

    lin, alpha_f, computed = load(src, pic)
    keep = alpha_f > 0.5

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"{pic.stem} ({pic.corner})  sky {(1.0 - keep.mean()) * 100:.1f}% of frame  "
          f"({'cut here' if computed else 'matte supplied'})")

    written = set()
    for theme, g in pic.grades.items():
        # A theme that has not been tuned away from THIS PICTURE's light writes
        # nothing: the page falls back to the light file, so a second identical
        # ladder would be a megabyte of duplicate on disk and in the repo, bought
        # with nothing. See A GRADE PER PICTURE, A LADDER PER THEME.
        if theme != "light" and g == pic.grades["light"]:
            print(f"{theme}: same grade as light — no ladder "
                  f"(src/kernel/corners.ts falls back to the light file)")
            continue

        graded = grade(lin, keep, g)
        # Everything short of fully opaque, not just the clear sky: a feathered
        # pixel carries the sky's colour in proportion to how transparent it is,
        # and that is exactly the mix that becomes a fringe.
        graded = bleed(graded, alpha_f < 1.0)

        full = Image.fromarray(np.round(graded * 255.0).astype(np.uint8), mode="RGB")
        full.putalpha(Image.fromarray(np.round(alpha_f * 255.0).astype(np.uint8), mode="L"))

        print(f"{theme}:")
        # Downsample after grading, not before: the grain is sized in output
        # pixels, and a curve applied at full resolution then resampled is
        # smoother than the reverse — resampling averages, which is exactly what
        # softens the shoulder. Every rung comes off the SAME graded
        # full-resolution frame for that reason, rather than each off the one
        # above it.
        for width in OUT_WIDTHS:
            height = round(full.height * width / full.width)
            img = full.resize((width, height), Image.LANCZOS)
            # Only a matte this script cut needs feathering — it comes out of
            # sky_matte() hard-edged, one bit per pixel. A supplied one arrives
            # anti-aliased already, and blurring it again walks the roofline twice.
            if computed and SKY_EDGE_BLUR:
                a = img.getchannel("A").filter(ImageFilter.GaussianBlur(SKY_EDGE_BLUR))
                img.putalpha(a)
            path = pic.out_path(width, theme)
            img.save(path, "WEBP", quality=WEBP_QUALITY, method=6)
            written.add(path)
            print(f"  {path.relative_to(REPO)}  {img.width}x{img.height}  "
                  f"{path.stat().st_size / 1024:.0f} KB")

    # Anything under THIS picture's stem that this run did not write. Against the
    # set of paths rather than by parsing a width back out of the filename, which
    # is what this did while there was one ladder and one shape of name: a rung
    # dropped from OUT_WIDTHS and a whole theme falling back to light both leave
    # files behind, and neither is a filename you can recognise by pattern.
    #
    # Scoped to the stem, so a run for one picture never reaches the other's
    # ladder — which it would otherwise do on every single run, each picture
    # being built on its own.
    for stale in sorted(OUT_DIR.glob(f"{pic.stem}-*.webp")):
        if stale not in written:
            stale.unlink()
            print(f"  removed {stale.relative_to(REPO)} (not written this run)")

    write_neutral(pic, lin, alpha_f, computed)
    print(f"{pic.neutral_path.relative_to(REPO)}  "
          f"{pic.neutral_path.stat().st_size / 1024:.0f} KB"
          f"  + {pic.meta_path.name}   (design/plate/plate-tuner.html reads these)")

    # Last line of the run, because it is the one thing left to do by hand. A
    # re-bake that is not followed by this paste is invisible on the deployment
    # for a day whatever else it got right — the ladder's URLs are assembled in
    # script, so the build cannot fingerprint them the way it does a url() in a
    # stylesheet. See rung() in src/kernel/corners.ts.
    print(f"\nconst LADDER_VERSION = '{ladder_stamp()}';"
          f"   <- src/kernel/corners.ts, if it differs from what is there")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
