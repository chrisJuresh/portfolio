# design/censor — which photographs get obscured, and who decided

Dev-only. Nothing here is served: `.vercelignore` excludes `design/` entirely.

The Projects Panel plays a recording of the photo vault's grid ([#57]). The grid
holds a real personal library, and the clip passes over 84 photographs of it,
some of which contain identifiable members of the public. This folder is the
record of which of those are obscured before a single frame is captured, and of
who signed that decision.

```
design/censor/
  roll.json                every photograph the clip passes over — mechanical
  review.html              the review surface — the whole roll, click to obscure
  review.mjs               serves it, proxies the vault, writes the confirmed list
  censored.json            the confirmed list — written by review.mjs, signed
  mosaic.py                bakes the confirmed ones down to a handful of blocks
  mosaic/                  where it puts them — gitignored, a derivative
  capture-origin.mjs       the origin the clip is recorded against
../record/
  projects/photos-censored the settings the clip is made with — a record workspace
../tools/
  collect-roll.mjs         writes roll.json; lives there because Playwright does
  check-capture-origin.mjs  and so does the check that the origin is the signed one
```

## The procedure

The grid must be answering on `127.0.0.1:8770` — normally it already is.

**1. Collect the roll.**

```bash
node design/tools/collect-roll.mjs
```

Drives the real grid at the geometry the recording uses and writes `roll.json`:
every photograph whose tile touches the band the camera ever sees. It reads
boxes and thumbnail URLs and nothing else — it does not look at any photograph.

**2. Review it.**

```bash
node design/censor/review.mjs
```

Then open the URL it prints. The whole roll is laid out in the clip's own rows,
at the size and in the order the recording shows it. **Click a tile to obscure
it.** Nothing is obscured until you do, and an empty list is a valid answer.

Hovering or arrowing onto a tile shows it at **1536px** in the preview — eight
times the 153px it gets in the clip, which is the size the judgement actually
needs. Looking is not a step you have to take; it happens as the pointer moves.
`1:1` shows the preview at its own pixels, and `reveal original` opens the file
in Explorer for the ones 1536px cannot settle. Space toggles, arrows walk.

A chosen tile is obscured in place, so the sheet is a preview of the clip rather
than a list of ticks. It is a **blur**, and the capture applies a mosaic — the
sheet stands in for the result rather than reproducing it, and it stands in on
the conservative side: the mosaic that ships is the coarser of the two by a wide
margin, so nothing the reviewer judged obscured enough comes out less obscured
than they saw it. Blur is what CSS has, which is exactly the limitation that put
the real mosaic in `mosaic.py`.

Sign it, press **Confirm the list**, and `censored.json` is written.

**3. Commit `roll.json` and `censored.json` together.** They are one artefact:
`censored.json` carries the `roll_digest` it was signed against, and a decision
list without the roll it decided about says nothing.

**4. Bake the mosaics.**

```bash
python design/censor/mosaic.py
```

Fetches each confirmed photograph's renditions from the vault and writes an
obscured copy of each into `mosaic/`, reduced to **four blocks across the shorter
side** and blown back up — so a 153px grid tile is four blocks by five, each
about 38px. That is the coarseness the shipped clip was signed off at, arrived at
by looking: the first cut was baked at six and re-baked coarser after the contact
sheet. Gitignored, because it is a derivative of the photographs the list is
about and what ships is the finished clip. `--check` says whether what is on disk
still covers the list as signed.

`--blocks` moves it, and **only downwards without an argument**: `mosaic.py`
refuses to bake finer than eight and `capture-origin.mjs` refuses to serve a bake
that came in above it. That ceiling is there because coarseness is the one
property nothing downstream can check — every other guard here compares a digest,
and a digest agrees with whatever it was taken over however fine. Coarser is
always allowed; there is no floor, and an empty rectangle would satisfy every
automated check in this folder.

**5. Serve the capture origin, and check it.**

```bash
node design/censor/capture-origin.mjs
node design/tools/collect-roll.mjs --check      # has the library moved?
node design/tools/check-capture-origin.mjs      # is this the signed origin?
```

The origin stands in front of the vault and serves the baked mosaic wherever the
vault would serve a confirmed photograph, so nothing downstream of it — the
browser included — is ever sent an unobscured one. It also seeds stacking, which
is the other half of what it exists for; see below. It refuses to start against
an unsigned list, a list signed against a different roll, a stale bake, or one
baked finer than the ceiling above.

The two checks are both needed and neither implies the other. `collect-roll
--check` asks whether the roll still describes the live grid; `check-capture-origin`
asks whether the origin serves what was signed and whether the grid mounts
stacked, by driving the origin the way the clip does and reading the bytes off
the network.

**6. Record.**

```bash
RECORD_WORKSPACE=$PWD/design/record \
  pnpm --dir <record checkout> record run photos-censored scroll-peek
```

`photos-censored` is a Project of this repository, handed to `record` through
`$RECORD_WORKSPACE` rather than added to record's own checkout — the geometry the
roll was assembled at belongs beside the roll. It points at the capture origin,
sets `mockup = "none"` so record composites no chrome of its own, and has no
`start_command`: the origin is started by hand, and a Run against a dead one
fails at the health check rather than starting a vault the origin is meant to
stand in front of.

**7. Look at the clip before it is committed**, at the size it will play at, and
then ship it:

```bash
ffmpeg -i <run>/scroll-peek.webm \
  -vf "select='not(mod(n\,11))',scale=480:300,tile=4x4" -frames:v 1 sheet.png
```

The WebM, the MP4 and a poster extracted from the first frame go to
`portfolio/video/`, committed raw. **Re-cutting the clip means changing the
`?v=` stamp**, which lives in exactly one place now — `VERSION` in
`src/sections/projects-panel/clip.ts`, which the poster and both sources are
built from. `grep` the old one to be sure. `vercel.json` caches that directory as immutable, so a re-cut
clip under an unchanged URL is served from cache for a year.

```bash
python -c "import hashlib;h=hashlib.sha256();[h.update(open(f,'rb').read()) for f in ['portfolio/video/photos-grid.webm','portfolio/video/photos-grid.mp4','portfolio/video/photos-grid.webp']];print(h.hexdigest()[:8])"
```

```bash
node design/tools/check-panel-clip.mjs        # does it behave the way #65 asks?
python design/tools/check-capture-contract.py # is the profile README still safe?
```

## Why the decision is a person's

Automated detection is rejected on measured grounds, not on principle. Intel's
model card for `face-detection-adas-0001` reports average precision falling from
94.1% at head heights over 100px to **37.4%** over 10px, against a stated
operating floor of 90×90 on 1080p. The tiles here are 153×216 and a face inside
one is a fraction of that, so a detector would be run squarely in the band where
its own vendor reports it failing roughly two times in three.

The same reasoning sets the review surface. A judgement made from the grid
thumbnail would be a judgement made at the size the detector fails at, which is
why `review.html` shows the vault's 1536px substrate — eight times the tile in
each dimension — and offers the original file behind it.

It is also why nothing downstream of this folder gets to soften the result.
Published work on the reversibility of anonymisation shows light blur and fine
pixelation are partially recoverable by super-resolution, so the mosaic [#65]
applies has to be coarse enough that a tile resolves to a handful of blocks. If
the mosaic is weakened, this list stops being a defence.

## Why the roll can go stale, and how you find out

`roll.json` is the grid's default view at one viewport, over one scroll range:

| | | from |
|---|---|---|
| viewport | 1440×900 | `record/projects/photos/project.toml` |
| scroll | 0 → 1200 | `record/projects/photos/actions/scroll-peek.overrides.toml` |
| band | document y ∈ [0, 2100] | scroll range plus one viewport |
| stacking | **on** | the view the Panel is meant to show off |

The vault sorts newest-first, so importing a single photograph shifts the whole
roll and the confirmed list silently stops covering the clip. Same if record's
viewport or distance moves. Before recording:

```bash
node design/tools/collect-roll.mjs --check
```

It exits non-zero and says `DRIFTED` when the roll it finds is not the roll on
disk, or when the geometry asked for is not the geometry the roll was assembled
at. A drifted roll means collect and review again — there is no partial re-review,
because the photographs a shifted roll brings in are exactly the ones nobody has
looked at.

Two habits are guarded against rather than documented away, because both end in a
signed review quietly not covering the clip:

- The collector **refuses to overwrite** a roll that `censored.json` is signed
  against, if re-collecting would not reproduce it. Delete both and start over —
  that is the only honest response, and it should be a decision rather than a
  side effect of running a command twice.
- An **unrecognised flag is fatal**. `--check` takes no value, so `--check=true`
  is not the check; without this it would parse as an unknown key, fall through
  to the collecting path, and replace the roll while looking like it verified it.

## What the page targets

The vault addresses thumbnails by content: a tile's image is `/t/<sha256>.webp`.
So a photograph is targetable by the hash of its own bytes, which survives
re-sorting, tile recycling and paging — none of which an index or an `nth-child`
survives. Each entry in `censored.json` carries its selector ready to use:

```
img[src$="0d66290e….webp"]
```

`selector_list` is all the censored ones joined. The selectors were checked
against the live grid rather than assumed: across the clip's scroll range they
match every tile in the roll, no tile in the band goes unmatched, and nothing
outside the roll is hit.

**They are not what the capture uses**, and that is [#65]'s finding rather than a
change of mind here. [#57] describes a capture-time stylesheet hung on this
selector list, and four separate things stop a stylesheet doing the job — the two
below, plus "CSS has no mosaic" and "the Timeline is too late", both in
`capture-origin.mjs`'s own header. What obscures a tile is the bytes it is served
as, keyed by the same content hash these selectors are built from. The list is
unchanged and so is what it decides; only the mechanism that applies it moved,
one layer earlier.

### The clip must be stacked, and nothing makes that happen by itself

The recording shows the grid **stacked** — frames verified to be the same
photograph drawn as one tile, each carrying the count it stands for. That is the
view the Panel exists to show off, and the roll is collected against it.

It is not the default and there is no URL for it. The vault keeps the setting in
**localStorage** under `photos.stack`, read once at mount, defaulting to
`{on: false}` (photos `ui/src/lib/stack.js`). It has to be seeded into the
browser profile before the page's script runs; `collect-roll.mjs` does that with
Playwright's `addInitScript` and then **checks the DOM that it worked**, refusing
to write a roll if no tile drew a card.

**record cannot do this on its own.** Its only page hook is the timeline's
`evaluate`, which runs after navigation — by then the grid has mounted
unstacked. Navigating a fresh browser at the URL gets the unstacked grid no
matter how the operator's own browser is set, because the setting lives in a
profile and not in the server. Left alone, [#65] would produce a clip that looks
entirely correct and shows the wrong view — and a roll reviewed against the
stacked grid does not cover it.

This is what `capture-origin.mjs` answers, by putting the seed somewhere earlier
than any hook a recorder could offer: the document itself. It serves the vault's
own HTML with one classic `<script src>` added at the top of `<head>` — classic,
so it runs before the deferred module the app mounts from, and same-origin, so it
passes `script-src 'self'` without the page's CSP being weakened to allow it.
`check-capture-origin.mjs` then asks the DOM whether a tile actually drew a card,
and deliberately seeds nothing itself: a check that seeded the setting would pass
against an origin that had stopped doing so.

The two are genuinely different rolls, not the same photographs regrouped:

| | stacked | unstacked |
|---|---|---|
| photographs in the band | **84** | 73 |
| tile | 153×216 | 162×216 |
| drawn as a stack | 35 (42%) | — |

So `stacking` is written into `roll.json` and `--check` compares it like
geometry. `--stack off` collects the other view for comparison; it is not a
toss-up between them.

### Two more things [#65] hit, and why neither is worked around any more

Both were found while checking the selectors. They are kept here because they are
the first two of the four reasons the censoring is applied to the bytes rather
than to the page — and because both are still live for anyone who reaches for a
stylesheet against this vault for some other purpose.

**A `<style>` element is refused.** The vault serves
`default-src 'none'; …; style-src 'self'`, so a stylesheet built the usual way —
`createElement("style")`, set `textContent`, append — is blocked and its `sheet`
comes back null. No exception is thrown; the page simply does not censor. #57
describes injecting the censoring CSS through record's `.evaluate()` hatch, which
is the right hatch, but not with that shape. Two routes do work, measured on the
live page:

```js
// refused: sheet is null, nothing applies
document.head.appendChild(Object.assign(document.createElement("style"), { textContent: css }))

// works: a constructed stylesheet is not inline content
const sheet = new CSSStyleSheet();
sheet.replaceSync(css);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
```

The same CSP already no-ops record's own `stopSmoothScrolling`, which builds a
`<style>` element the refused way. That is record's to fix, not this repo's, but
it means smooth scrolling is not actually being suppressed on this Project.

**Do not set the blur per element.** The obvious fallback — walk the matches and
set `img.style.filter` — passes CSP and is wrong here. The grid's sheet is
virtualised: it recycles a tile element by pointing it at a different
photograph's URL. An inline filter stays on the element through that swap, so a
censored tile scrolling away hands its blur to an uncensored photograph
scrolling in, and takes the blur off the one that needed it. A stylesheet rule
re-matches on the new `src` and cannot desynchronise. The roll's `index` and box
are reporting for the same reason: they describe where a photograph was when it
was collected, and only the content hash is safe to target.

Serving obscured bytes sidesteps this entirely rather than solving it: a
substitution keyed by content hash cannot be handed to the wrong photograph by a
recycled element, because it is not attached to an element at all.

[#57]: https://github.com/chrisJuresh/portfolio/issues/57
[#65]: https://github.com/chrisJuresh/portfolio/issues/65
