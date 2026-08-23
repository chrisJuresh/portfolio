# The five tuners the Editor replaced

Each of these was one HTML page over the real site, driving one Python generator
by printing a block of Python for you to paste back into it. `pnpm editor`'s
**Bakes** surface is all five in one place (#146), and these are kept — working —
because "the Editor is better than the six" is a judgement the author gets to
reverse.

| file | what it tuned | where that is now |
| --- | --- | --- |
| `plate-tuner.html` | the three corner photographs: the grade per picture per theme, the sky matte, and the placement | the `plate` Bake; the placement is Tokens under `kernel-corners` |
| `effects-tuner.html` | the Effect Stack — a hundred custom properties — and the two Texturelabs plates under it | Tokens under `kernel-effects`; the plates are the `effects` Bake |
| `plinth-tuner.html` | the procedural marble: a ground, three vein sets and a fracture, previewed in GLSL | the `plinth` Bake |
| `plinth-studio.html` + `.py` | a plinth cut from a photograph: maps, material, bake, and writing it into the stylesheet | the `plinth-studio` Bake |
| `morph-tuner.html` | which of the twenty-four faces the cut title morphs into | the `morph` Bake |

## They still open

```bash
python -m http.server 8000
```

...from the repository root, then `localhost:8000/design/legacy/<page>.html`. The
studio is the exception, because it is a page and a server together:

```bash
python design/legacy/plinth-studio.py
```

**The generators did not move.** They are where they always were —
`design/plate/build-plate.py`, `design/effects/build-textures.py`,
`design/plinth/build-slab.py`, `design/plinth/add-stone.py`,
`design/cut-title/morph/build-site.py` — and every one of them still runs from a
shell with the flags it always had. What changed is where their numbers live:
`design/bake/<name>/recipe.json`, read by `design/bake/tuning.py`, so the Editor
and a shell run are given the same values and there is no block to paste back.

That is also the one way these pages now LIE. Each still prints the Python it
always printed, and pasting it into a generator would put a literal where a lookup
now stands. Read them for what they show you, and change a number in the Editor.

The only other edit any of them carries is a path: what used to be relative to the
generator beside it now names that folder.

## What was actually lost, and what was not

Nothing about the parameters: all one hundred and nineteen are in the Bakes, with
the ranges these pages spent a session choosing.

What is lost is the **preview** — the canvas transcription of the grade, the GLSL
twin of the marble, the rectangle showing which part of a photograph lands on the
block. Every one of those had to say, at length, where it parted company with the
real thing; the plinth studio said it best, that what it can honestly show before a
bake is the window and nothing else. The Editor shows the command instead, and
then the asset.

If that trade turns out to be wrong for one of them, this is where to come back
to.
