# design/censor — which photographs get obscured, and who decided

Dev-only. Nothing here is served: `.vercelignore` excludes `design/` entirely.

The Projects Panel plays a recording of the photo vault's grid ([#57]). The grid
holds a real personal library, and the clip passes over 73 photographs of it,
some of which contain identifiable members of the public. This folder is the
record of which of those are obscured before a single frame is captured, and of
who signed that decision.

```
design/censor/
  roll.json          every photograph the clip passes over — mechanical
  review.html        the review surface — one photograph at a time, at 1536px
  review.mjs         serves it, proxies the vault, writes the confirmed list
  censored.json      the confirmed list — written by review.mjs, signed
../tools/
  collect-roll.mjs   writes roll.json; lives there because Playwright does
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

Then open the URL it prints. One photograph at a time at 1536px: `1` contains an
identifiable person, `2` unsure, `0` does not. There is no skip — the list cannot
be confirmed until all 73 have been classified — and `2` censors, so an
ambiguous photograph is obscured with its ambiguity on the record rather than
rounded to a clean answer. `reveal original` opens the file in Explorer for the
ones 1536px cannot settle.

Sign it, press **Confirm the list**, and `censored.json` is written.

**3. Commit `roll.json` and `censored.json` together.** They are one artefact:
`censored.json` carries the `roll_digest` it was signed against, and a decision
list without the roll it decided about says nothing.

## Why the decision is a person's

Automated detection is rejected on measured grounds, not on principle. Intel's
model card for `face-detection-adas-0001` reports average precision falling from
94.1% at head heights over 100px to **37.4%** over 10px, against a stated
operating floor of 90×90 on 1080p. The tiles here are 162×216 and a face inside
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

## What the page targets

The vault addresses thumbnails by content: a tile's image is `/t/<sha256>.webp`.
So a photograph is targetable by the hash of its own bytes, which survives
re-sorting, tile recycling and paging — none of which an index or an `nth-child`
survives. Each entry in `censored.json` carries its selector ready to use:

```
img[src$="0d66290e….webp"]
```

`selector_list` is all the censored ones joined, which is the selector the
capture-time stylesheet in [#65] hangs its mosaic on. That stylesheet is [#65]'s
to write; this folder decides only which tiles it applies to.

The selectors were checked against the live grid rather than assumed: across the
clip's scroll range they match all 73 tiles in the roll, no tile in the band goes
unmatched, and nothing outside the roll is hit.

### Two things [#65] will hit applying them

Both were found while checking the above, and both are cheap to design around
and expensive to discover during a capture.

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

[#57]: https://github.com/chrisJuresh/portfolio/issues/57
[#65]: https://github.com/chrisJuresh/portfolio/issues/65
