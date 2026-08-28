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
| `plinth-studio.html` + `.py` | a plinth cut from a photograph: maps, material, bake, and writing the winner into the Projects Panel's `tokens.css` | the `plinth-studio` Bake |
| `morph-tuner.html` | which of the twenty-four faces the cut title morphs into | the `morph` Bake |

## They still open

```bash
python -m http.server 8000
```

...from the repository root, then `localhost:8000/design/legacy/<page>.html`. On
Windows, `run.bat` in the repository root is that server with a free port found
for it and the browser opened — it exists for exactly this, and **not** for
running the site, which is `pnpm dev`. `pnpm dev` will not do here: it serves the
built routes and the four verbatim paths, and `design/` is not among them.

The studio is the exception, because it is a page and a server together:

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

## Two of them are about a page that no longer exists

#141 landed between these being written and being moved here, and it deleted the
hand-written `/portfolio` — `index.html`, `styles.css` and the scripts beside
them — in favour of the built one. So:

- Each of these pages loads `/portfolio` in an iframe and gets the BUILT page. The
  plate and effects tuners still work against it, because what they drive is
  custom properties on `:root` and the built page has the same ones.
- `morph-tuner.html` drives `window.__cutMorph`, which was `portfolio/cut-morph.js`
  and went with that tree. The morph is not on the site at all today; the Front
  Screen ships the cut title as one baked picture. The tuner is still how the
  twenty-four faces are LOOKED at — it needs `morph/faces.json`, which the `morph`
  Bake writes — and the preview half of it has nothing to drive.
- `plinth-tuner.html` drives markup and attributes the built page does not carry
  in the same shape. Its GLSL previz of the procedural stone still stands on its
  own, and it was already documented as stale against the material.

## What was actually lost, and what was not

Nothing about the baked parameters: all one hundred and nineteen are in the
Bakes, with the ranges these pages spent a session choosing. Nothing about the
styled ones either, with the two exceptions above: the Effect Stack's numbers are
Tokens under `kernel-effects` and the corner pictures' placement under
`kernel-corners`, both live.

Two parameters of the effects tuner are NOT reachable, and both are the same
kind of thing rather than an oversight:

- **Which layers are on.** That was the tuner's row of chips, and it is
  `<html data-fx="…">` — an attribute, written by `src/shell/Shell.astro`, not a
  custom property. The Editor writes Content and Tokens (ADR 0004) and an
  attribute is neither. Turning a layer that is already on DOWN is a Token and
  works today (`--fx-paper-strength: 0`); turning one of the seven that are off ON
  is a one-line change to Shell's default, and the thing that will make it a
  control is #145's Annotation rather than a fourth kind of write. The
  hand-written page's `?fx=` escape hatch went with #141.
- **The effects that were never ported.** The tuner had rows for chromatic
  aberration, ASCII, halation and gate weave. `CONTEXT.md` names nine layers and
  the Effect Stack has nine; those four are not among them, so there is nothing
  for a control to change. If one comes back it brings its Tokens with it and gets
  controls for free, because nothing lists them.

What is lost is the **preview** — the canvas transcription of the grade, the GLSL
twin of the marble, the rectangle showing which part of a photograph lands on the
block. Every one of those had to say, at length, where it parted company with the
real thing; the plinth studio said it best, that what it can honestly show before a
bake is the window and nothing else. The Editor shows the command instead, and
then the asset.

If that trade turns out to be wrong for one of them, this is where to come back
to.
