# portfolio/img/tex — the baked textures

Nothing here is hand-made and nothing here should be hand-edited. Every file is
the output of a script, and the script is where every constant that shapes it
lives and why it has the value it has.

| file | from | built by | how it is used |
| --- | --- | --- | --- |
| `film-1600.webp`, `film-2600.webp` | Texturelabs Film 185XL | [`build-textures.py`](../../../design/effects/build-textures.py) | one frame over the whole band, `cover`, never tiled |
| `paper-512.webp`, `paper-1024.webp` | Texturelabs Paper 349XL | [`build-textures.py`](../../../design/effects/build-textures.py) | a square that wraps in both axes, tiled edge to edge |
| `marble-nero.webp` | generated — no source | [`build-marble.py`](../../../design/plinth/build-marble.py) | the Projects Panel's plinth, stretched over the slab |
| `marble-stone162.webp` | Texturelabs Stone 162XL | [`build-marble.py`](../../../design/plinth/build-marble.py) | ...one candidate for the same plinth |
| `marble-stone161.webp` | Texturelabs Stone 161XL | [`build-marble.py`](../../../design/plinth/build-marble.py) | ...and another |
| `marble-stone160.webp` | Texturelabs Stone 160XL | [`build-marble.py`](../../../design/plinth/build-marble.py) | ...and the third |

## The two effect plates

Two rungs each, picked by `image-set()` on display density rather than by script
— unlike the corner pictures in `../`, which vary in size with the window and so
have to be measured. See THE EFFECT STACK in
[`../../styles.css`](../../styles.css) for what is done with them.

Both leave the script **centred on mid-grey**, which is the property everything
downstream depends on, and both are then put through a levels stage in CSS that
moves that field onto white or onto black depending on the theme. The reasoning
is in the script's docstring and in THE LEVELS STAGE in the stylesheet.

## The four marble plates

One rung each, and **one plate is the whole plinth** — the receding top face
across the top fifth and the front face below it, joined at the specular line
that runs along the block's front edge. `.panel-plinth` in
[`../../styles.css`](../../styles.css) stretches it with
`background-size: 100% 100%`, which is exact rather than approximate: the plate
is baked at the aspect ratio that block's own numbers give, and `cover` would
crop off either the top face or the ramp that takes the front face into black.

They are **not centred on mid-grey** and are not overlays. A plinth is a surface
in the composition rather than a treatment of one, so each plate carries the
light the design render measures — the top face ramping 30 → 78 → 53 and the
front face 38 → 28 → out — and the stone only modulates it. What the marble is
allowed to contribute is a bright tail of about 27 levels, which is what the
render's own veining measures.

3000 px wide is one rung and not the first of a ladder: the slab is ~1800 CSS px
on a 2560 display, so this is 1:1 at a 2× device ratio and 2:1 at 1×, and the
plate has no detail finer than its veining to lose either way. What it is drawn
under is a reflection at a third opacity.

**Which one is drawn** is `data-marble` on the `.panel` section — `nero` is the
default and the other three are named in the stylesheet beside it. #69's tuner is
the place they get chosen between by eye; only one is ever fetched.

## Rebuilding

The Texturelabs XL JPEGs are **not in the repo** — they are 9–15 MB each and are
gitignored alongside the camera raws and the cut-out plate source. Download them
from texturelabs.org, drop them at the repo root under their original names, and:

```bash
python design/effects/build-textures.py all
```

```bash
python design/plinth/build-marble.py all
```

`marble-nero.webp` is the exception and needs nothing downloaded: it is
generated, from a seed, by the same script — `build-marble.py nero`.

Each script prints a digest at the end, over **its own** files only:
`TEX_VERSION` for the two effect plates and `MARBLE_VERSION` for the four marble
ones. When one differs from the `?v=` on the URLs it stamps — `--fx-film-src` and
`--fx-paper-src`, or every `--panel-marble` — paste it over them, in the same
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

The five photographic sources are from **[Texturelabs](https://texturelabs.org)**
— `Film_185`, `Paper_349`, `Stone_162` ("Dark contrast marble"), `Stone_161`
("Blue veins marble") and `Stone_160` ("Natural distressed marble") — used under
the Texturelabs licence, which permits commercial use and asks for attribution.

What is committed here is a derivative of each: greyscaled, and then either
band-passed, high-passed, re-levelled and cut down (the two effect plates, one of
them cropped to a square and made to tile), or cut into two faces, perspective-
warped, re-lit onto a measured ramp and given a specular edge (the marble). The
licence's restriction is on redistributing the source files *as textures*, which
is the other reason the originals stay out of the repo rather than merely a size
one.

`marble-nero.webp` is nobody's photograph. It is generated by
`design/plinth/build-marble.py` from a seeded noise field, and it is in the set
because the design render's stone is a fine-veined near-black that none of the
three photographed candidates actually is.
