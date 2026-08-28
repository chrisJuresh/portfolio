# design/plate/sources/

The cut-out RGBA PNGs `build-plate.py` develops the three corner pictures from.
**Ignored** — 20MB each, and derivatives of the personal library `photos/` is
ignored for. What ships is the ladder in `portfolio/img/`, which is committed.

```bash
python design/plate/build-plate.py design/plate/sources/<file> [plate|car|eye]
```

## Which hash is which picture

The filenames are content hashes and say nothing. This table is the only record:

| picture | file |
| --- | --- |
| **plate** | `17d93536535dd283c015567c8fd1d380662f3a498d43729ea6867c2c8a6748a8.png` |
| **car** | `11604121096eaa5f829dc0d4376a58b4fd41e1c58e3b6c8a6ba75d8149ea0837-Recovered.png` |
| **eye** | `656e3a512472101f0a96994af48c6276caa0a66ae1493fcad2dcc6b56478cbb9.png` |

All three are 3448×4592 RGBA. The car's is the `-Recovered` one; the same hash
**without** that suffix is a different, worse cut of the same frame, kept only
because it is a hand cut-out and not re-derivable. Do not hand it to the script.

## How to check a guess without trusting this table

Run the build for that picture and read `git status`. The pipeline is
deterministic, so the right source rebuilds `design/plate/<stem>-source.webp` and
that picture's light ladder **byte-identically** — they come back unmodified. A
wrong source changes them.

That is a better test than comparing pixels: `<stem>-source.webp` is lossy WebP
with alpha and the encoder discards RGB under transparent pixels, so a naive
whole-frame diff scores badly even for the correct file. Compare only where
alpha > 200 if you must diff.
