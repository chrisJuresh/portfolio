# portfolio/img/tex — the two baked textures

Four files, two textures, one script. Nothing here is hand-made and nothing here
should be hand-edited: they are the output of
[`design/effects/build-textures.py`](../../../design/effects/build-textures.py),
which is where every constant that shapes them lives and why each one has the
value it has.

| file | from | how it is used |
| --- | --- | --- |
| `film-1600.webp`, `film-2600.webp` | Texturelabs Film 185XL | one frame over the whole band, `cover`, never tiled |
| `paper-512.webp`, `paper-1024.webp` | Texturelabs Paper 349XL | a square that wraps in both axes, tiled edge to edge |

Two rungs each, picked by `image-set()` on display density rather than by script
— unlike the corner pictures in `../`, which vary in size with the window and so
have to be measured. See THE EFFECT STACK in
[`../../styles.css`](../../styles.css) for what is done with them.

Both leave the script **centred on mid-grey**, which is the property everything
downstream depends on, and both are then put through a levels stage in CSS that
moves that field onto white or onto black depending on the theme. The reasoning
is in the script's docstring and in THE LEVELS STAGE in the stylesheet.

## Rebuilding

The two XL JPEGs are **not in the repo** — they are 9 MB and 12 MB and are
gitignored alongside the camera raws and the cut-out plate source. Download them
from texturelabs.org, drop them at the repo root under their original names, and:

```bash
python design/effects/build-textures.py all
```

It prints a `TEX_VERSION` digest at the end. When it differs from the `?v=` on
`--fx-film-src` and `--fx-paper-src` in `../../styles.css`, paste it over both —
in the same commit as the re-baked files. A rung's filename does not change when
its contents do, and `vercel.json` caches this whole directory for a day with a
week of stale-while-revalidate, so without the bump a re-bake is invisible on the
deployment for up to 24 hours while being correct on localhost. Exactly the same
arrangement as `IMG_VERSION` in `../../index.html`, and it went wrong there once
already.

It also writes `paper-seam-proof.png`, a 2×2 lay-up of the paper tile so its
seams can be looked at rather than taken on trust. That one is gitignored.

## Attribution

Both textures are from **[Texturelabs](https://texturelabs.org)** — `Film_185`
and `Paper_349` — used under the Texturelabs licence, which permits commercial
use and asks for attribution.

What is committed here is a derivative: greyscaled, band-passed or high-passed,
re-levelled, cut down, and in the paper's case cropped to a 2048px square and
made to tile. The licence's restriction is on redistributing the source files
*as textures*, which is the other reason the originals stay out of the repo
rather than merely a size one.
