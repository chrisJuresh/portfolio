# The external capture

`/portfolio` has one consumer outside this repository. `chrisJuresh/chrisJuresh` —
the author's GitHub profile repo — screenshots `chrisj.uk/portfolio` in light and
dark and rewrites its README to a `<picture>` of the result.

**It runs when somebody asks for it, and on no schedule.** #148 took the job off
its five-minute clock, re-cut its crop against the flipped `/portfolio`, and
moved the one thing it was never able to see into this repository's own Checks.

## Nothing here is constrained by it

That is the point of this page, and it is why the page is short. There is no
pre-merge gate, no geometry to hold still, and no reason to think about the
profile README before changing a Section. `design/tools/check-capture-contract.py`
— which replayed the capture against a local tree and asked whether it still
passed — is deleted. `pnpm check` is the gate.

The half the capture could never cover is covered here instead. It asserted
structure and geometry hard and **colour not at all**: invert the theme and every
assertion it had still passed, and the profile quietly showed a dark slab on
GitHub's white paper until somebody looked. `scripts/checks/checks/ground.mjs` is
what replaced that blind spot — the ground is paper in light theme and dark at the
Turn's far end, in both themes, measured by rasterising the computed colour and
reading the pixel back. A theme regression is now loud, in the repository that
caused it, on the commit that caused it. ADR 0006 is the decision.

`ground` is narrower than the mean luminance of a whole picture, and knowing which
way is the point of saying so. It reads the one element every other colour on the
page is mixed against, which is the failure that turns the profile into a slab. A
photograph that stopped arriving is the `assets` Check's, not this one's. What
neither covers is a colour painted somewhere else entirely — a hardcoded hex on
some descendant — and that is deliberate rather than a gap: it is visible on
screen, and the author is looking at the running site.

A change here that breaks the crop therefore breaks it **over there**, loudly, on
the next capture somebody asks for — and the fix is over there too. The job's
first assertion is that the page is still the page it crops, and its message names
what is missing.

## Asking for a capture

Either of these, from anywhere with an authenticated `gh`:

```bash
gh workflow run refresh-portfolio-preview.yml --repo chrisJuresh/chrisJuresh
```

```bash
gh api repos/chrisJuresh/chrisJuresh/dispatches -f event_type=portfolio-updated
```

The first captures immediately; the second waits 45 seconds first, because it is
the one a deployment fires and the deployment is not finished when it does. Both
read the live site, write both previews and the README that points at them, and
commit. There is nothing to pass — `PORTFOLIO_URL` exists in the capture only so
it can be replayed against a local tree by hand.

Watch it with `gh run watch --repo chrisJuresh/chrisJuresh`.

**The live site is `main`, and features land on `development`.** So a capture asked
for before `development` has been merged photographs the previous `/portfolio`,
whatever is on this branch. That is not a bug in the capture; it is what "live"
means.

## What it cuts, and where from

The crop is the Front Screen's own composition, and every element it names is one
the Section already has:

| it measures | to get |
| --- | --- |
| `.front-screen__col` | the text measure, and the side gutter it is centred in |
| `.front-screen__slide` and `.front-screen__photos`' gap | the photograph's shape and the air between two |
| the **first** `.front-screen__listing`, and its second `.front-screen__entry` | the crop's bottom edge, one gutter below the second role |

The listing is taken by position and not by its heading. Its heading is
**Content** — the author can change it in the Editor and publish it (ADR 0004) —
so a capture that looked for the words `Work Experience` would die on a rename
nobody made wrongly. Position is markup, so a reorder is a composition change and
fails loudly instead; the capture reports which heading it actually cropped
against so a reorder is legible in the run log.

From those it solves a capture width that puts one full photograph, one gap and
three quarters of the second between the column's left edge and the picture's
right edge — `2 * (1.75 * photoWidth + gap) - columnWidth` — and everything below
the second role is hidden so the lower gutter comes out blank.

Two things it does to the page before it shoots, both of which belong to the
picture rather than to the site:

- **The Effect Stack is turned off**, by emptying `data-fx` and reading back that
  all nine layers stopped painting. The preview is resampled to a fraction of its
  captured width and sits on GitHub's paper, where a texture meant to be felt at
  full size reads as compression noise. `?fx=` used to do this; the flip left
  nothing in `src/` reading `searchParams`, so the query is inert and the capture
  does it itself — which is the right side of the boundary for it to be done on
  either way. (`README.md` still offers `?fx=film paper` to a reader, and
  `astro.config.mjs` still preserves the query for it. Both are #141's debt and
  neither is this page's to settle: whether that switch comes back is the
  author's.)
- **GitHub's paper and ink are forced over the theme's** — `--paper`,
  `--paper-ink`, `--paper-ink-soft`, and `--turn` pinned to 0. Those three plus the
  Turn are the whole surface: every other colour the page paints is mixed out of
  `--ground` and `--ink`, which are mixed from them. A fourth colour appearing on
  the page is a change worth noticing rather than one to paper over there.

## The numbers, as a record and not a contract

Measured on `development` at 2026-08-23, at the capture's own 1000px probe height:

| reported | value |
| --- | --- |
| `captureWidth` | 592 |
| all four gutters | 80 (bottom 80.3) |
| `cropHeight` | 842 |

The first three the capture prints itself. Mean luminance it does not print and
nothing asserts — the ground Check covers that half now — so if you want the
number the old contract reported, read it off the two PNGs the capture leaves:

```bash
python -c "from PIL import Image, ImageStat; import glob; print({p: round(ImageStat.Stat(Image.open(p).convert('L')).mean[0], 1) for p in glob.glob('assets/portfolio-preview-*.png')})"
```

It was 187.7 / 46.4 on 2026-08-23, against 188.4 / 46.1 for the hand-written page.

The numbers are here so a drift is legible, not so anything holds them. Only one is
load-bearing and it is load-bearing **in the other repository**: 592 is the
divisor of the capture's `deviceScaleFactor` (`846 * 3 / 592`), so a change to the
text measure or the photograph's shape that moved the solved width would resample
the preview's type. The capture requires its own solution to be **exactly** 592
and fails otherwise: the point of the number is an exact 3:1 source-to-display
ratio, and a tolerance around it would admit the fractional resampling the check
exists to prevent. Recompute both together over there.

That it is still 592, and the gutters still 80, is a fact about the two
compositions sharing their proportions — the hand-written page measured 592, 80
and 852 — and not about anything being held still on purpose.

## Why the runner is Windows

`--face-lead` is Georgia, which is not on a bare Linux runner, and a runner
without it renders the lead paragraph in a generic serif — a preview that looks
fine and is wrong. The capture probes for Georgia and fails rather than trusting
the image.

Sitka was the reason once: the hand-written page was set in it, it ships with
Windows and is not redistributable, and on `ubuntu-latest` the whole stack
resolved to DejaVu Serif. That is over. `/portfolio` serves its own faces as
`woff2` from `/fonts/` and keeps Sitka only as a fallback behind them, so it never
renders and its absence would not show. The capture asserts instead that none of
the faces the page fetched failed and that none ended in `error` — which is the
failure that is actually reachable now.
