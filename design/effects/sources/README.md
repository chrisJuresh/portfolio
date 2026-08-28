# design/effects/sources/

The two Texturelabs plates `build-textures.py` bakes the Effect Stack's overlays
from. **Ignored** — 9MB and 12MB, and texturelabs.org's licence asks that the
source files not be redistributed as textures. What ships is
`portfolio/img/tex/`, which is committed, and the attribution is in that
directory's own README.

| constant | file |
| --- | --- |
| `FILM_SRC` | `Texturelabs_Film_185XL.jpg` |
| `PAPER_SRC` | `Texturelabs_Paper_349XL.jpg` |

Both are free-for-commercial-use downloads from
[texturelabs.org](https://texturelabs.org). Drop them here and run:

```bash
python design/effects/build-textures.py all
```

The script fails with that instruction rather than a traceback if either is
missing, and **a worktree does not have them**: git only puts tracked files in
one, so an ignored source sitting in the main checkout is simply absent. Copy it
across, or re-download.

Three marble slabs (`Texturelabs_Stone_16*XL.jpg`) used to sit beside these at
the repo root. Nothing has read them since `build-marble.py` was deleted — the
plinth is a Cycles render off `design/plinth/sources/` now, see
`docs/agents/plinth-marble.md` — so they were not carried over. They are free
downloads from the same place if a use for them comes back.
