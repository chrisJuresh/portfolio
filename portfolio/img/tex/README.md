# portfolio/img/tex — the baked textures

Nothing here is hand-made and nothing here should be hand-edited. Every file is
the output of a script, and the script is where every constant that shapes it
lives and why it has the value it has.

| file | from | built by | how it is used |
| --- | --- | --- | --- |
| `film-1600.webp`, `film-2600.webp` | Texturelabs Film 185XL | [`build-textures.py`](../../../design/effects/build-textures.py) | one frame over the whole band, `cover`, never tiled |
| `paper-512.webp`, `paper-1024.webp` | Texturelabs Paper 349XL | [`build-textures.py`](../../../design/effects/build-textures.py) | a square that wraps in both axes, tiled edge to edge |
| `plinth-gemini-noir.webp` | a photograph, cut by [`add-stone.py`](../../../design/plinth/add-stone.py) | [`build-slab.py`](../../../design/plinth/build-slab.py) | the Projects Panel's plinth, with its silhouette in the alpha |
| `plinth-nero.webp` | rendered — no source | [`build-slab.py`](../../../design/plinth/build-slab.py) | ...the stone drawn before it, kept as a candidate |
| `plinth-portoro.webp` | rendered — no source | [`build-slab.py`](../../../design/plinth/build-slab.py) | ...one candidate for the same plinth |
| `plinth-marquina.webp` | rendered — no source | [`build-slab.py`](../../../design/plinth/build-slab.py) | ...and another |
| `plinth-grey.webp` | rendered — no source | [`build-slab.py`](../../../design/plinth/build-slab.py) | ...and the third |
| `plinth-gemini*.webp`, `plinth-*-noir.webp` | as above | [`build-slab.py`](../../../design/plinth/build-slab.py) | the rest of the bake — reachable from the tuner, not named in the stylesheet |

## The two effect plates

Two rungs each, picked by `image-set()` on display density rather than by script
— unlike the corner pictures in `../`, which vary in size with the window and so
have to be measured. See THE EFFECT STACK in
[`../../styles.css`](../../styles.css) for what is done with them.

Both leave the script **centred on mid-grey**, which is the property everything
downstream depends on, and both are then put through a levels stage in CSS that
moves that field onto white or onto black depending on the theme. The reasoning
is in the script's docstring and in THE LEVELS STAGE in the stylesheet.

## The four plinth renders

**These are renders, not textures**, and that is the difference that matters when
reading them. `design/plinth/build-slab.py` puts a cube in front of a camera
solved from the design render and lets Cycles work out the rest; what lands here
is one WebP per stone with **an alpha channel**, and the alpha is load-bearing.
The block's ends converge, so its silhouette is a trapezoid over a trapezoid and
not the box it is drawn in — which is why the plate that came before this one, a
photograph warped onto a measured ramp, could never be made to look like a solid
thing. It had no geometry to have a far side with.

`.panel-plinth` in [`../../styles.css`](../../styles.css) stretches one over its
box with `background-size: 100% 100%`, which is exact rather than approximate:
build-slab.py frames its camera on the same four numbers the `.panel` block
states, so stretching it to the box is an identity.

All four are the same block under the same camera and the same two lights, and
differ only in the material. The light is fitted, not chosen — the render's own
profile, meaned across the width of its block, is what the two energies are
solved against, and they land within about three levels of it over both faces.
The stones are procedural in the shader rather than photographs, because a
polished plinth is mostly reflectance and a flat-lit photograph of a slab has
none in it: here the veining drives base colour, roughness and bump together, so
a seam is rougher than the ground it sits in and catches the light differently.

3000 px wide is one rung and not the first of a ladder: the slab is ~1800 CSS px
on a 2560 display, so this is 1:1 at a 2× device ratio and 2:1 at 1×.

**Which one is drawn** is `data-marble` on the `.panel` section — `gemini-noir` is
the default and four others are named in the stylesheet beside it. #69's tuner is
the place they get chosen between by eye, and it reaches the rest of the bake by
writing `--panel-plinth-src` straight at a plate rather than through a rule here;
only one is ever fetched.

## Rebuilding

The Texturelabs XL JPEGs are **not in the repo** — they are 9–15 MB each and are
gitignored alongside the camera raws and the cut-out plate source. Download them
from texturelabs.org, drop them at the repo root under their original names, and:

```bash
python design/effects/build-textures.py all
```

The plinth renders need nothing downloaded at all — the stone is procedural —
but they do need Blender, which is not a Python package:

```bash
"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b     -P design/plinth/build-slab.py -- all
```

Each script prints a digest at the end, over **its own** files only:
`TEX_VERSION` for the two effect plates and `PLINTH_VERSION` for the four plinth
renders. When one differs from the `?v=` on the URLs it stamps — `--fx-film-src`
and `--fx-paper-src`, or every `--panel-plinth-src` — paste it over them, in the same
commit as the re-baked files. A rung's filename does not change when its contents
do, and `vercel.json` caches this whole directory for a day with a week of
stale-while-revalidate, so without the bump a re-bake is invisible on the
deployment for up to 24 hours while being correct on localhost. Exactly the same
arrangement as `IMG_VERSION` in `../../index.html`, and it went wrong there once
already.

`build-textures.py` also writes `paper-seam-proof.png`, a 2×2 lay-up of the paper
tile so its seams can be looked at rather than taken on trust. That one is
gitignored.

## Attribution

The two photographic sources are from **[Texturelabs](https://texturelabs.org)**
— `Film_185` and `Paper_349` — used under the Texturelabs licence, which permits
commercial use and asks for attribution.

What is committed here is a derivative of each: greyscaled, band-passed,
high-passed, re-levelled and cut down, one of them cropped to a square and made
to tile. The licence's restriction is on redistributing the source files *as
textures*, which is the other reason the originals stay out of the repo rather
than merely a size one.

**None of the four plinth renders is anybody's photograph.** They were, until
#100 — three of them were Texturelabs' marble slabs (`Stone_160`, `Stone_161`,
`Stone_162`), cut, warped and re-lit. They are now geometry and a procedural
material, so there is nothing left to attribute and nothing to download.
