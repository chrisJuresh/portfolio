# design/frame-glass — choosing the Frame's material

Dev-only, and **temporary**. It exists so the titlebar's material can be chosen by
eye, over the real recording, in motion — and it is deleted by the ticket that
writes the chosen answer into `src/sections/projects-panel/`. A tuner that
outlives its decision is the second material this repository already refuses
elsewhere: it agrees with the shipped one only while somebody keeps checking.

## Why this and not `pnpm variants`

Variants are the repository's mechanism for alternative directions, and they are
the wrong one here on two counts. A Variant is **a flat list of CSS rules with no
at-rules** (`docs/agents/variants.md`), and this material is an SVG
`feDisplacementMap` built per pane in script plus a conic gradient whose stops are
a function of the pane's own proportions — neither is expressible as a rule. And
the sheet shoots **stills**; the brief asks to judge it as video, which is the
same argument the photos repository makes for `/tune` existing at all: a rim that
reads beautifully over one backdrop is invisible over another, and scrolling is
the only way to find that out.

So this is the `/tune` shape: the real clip, the real Tokens, one composed Frame
to judge and one row per axis to triage.

## Running it

One static server over the worktree root, because the page wants three things
from three places on one origin — the studio, the Section's `tokens.css`, and
`/portfolio/video/`:

```bash
python -m http.server 8123 --bind 127.0.0.1
```

Then <http://127.0.0.1:8123/design/frame-glass/index.html>.

**Not through the in-app preview.** It serves the main checkout, so in a worktree
it would show you `development`'s material while looking like it showed you
yours — and `requestAnimationFrame` never ticks in that pane, so the clip would
not move even if it were the right tree.

## What is real here and what is not

**Real:** the material (`glass.js` is the photos method, function for function),
every share of the window (`index.html` links the Section's own `tokens.css`, so
`--projects-panel-frame-*` are the shipped Tokens and not copies), the recording,
and the fallback — the `url()` declaration is set, the computed value is read
back, and the badge in the panel says which rung the pane actually landed on
rather than which one it was expected to.

**Not real:** the Frame's *layout* rules. They live inside an Astro component and
cannot be reached from a plain page, so `studio.css` restates them. Where the two
disagree the component wins. And the subheading behind the glass is drawn at the
share of the Frame's width the render measures it at rather than composed the way
the Section composes it — close enough to judge a material through, not close
enough to measure anything off.

`body` carries `class="projects-panel"` because `tokens.css` declares the Tokens
on that class and not on `:root`. Without it every length in here is its
fallback, and the window comes out the wrong shape rather than failing.

## The axes

| axis | what it settles |
| --- | --- |
| A | what is behind the glass — the flat fill, the recording, the subheading, the marble |
| B | the tint, thirteen ways, including the magenta that ships today |
| C | the rim: bar only, one glass object, the whole window, or nothing |
| D | the optics — upstream's, the photos site's, and four departures including the frosted fallback |
| E | the band round the recording: the dark grey-blue border, at four widths |
| F | the recording's OWN margin, which is inside the video file |
| G | the glyphs |
| H | the lights |

The composer at the top mixes any combination of all eight; the rows below vary
one axis at a time off whatever the composer is set to, so a row is always read
against the rest of the current answer rather than against a fixed base.

## Two facts the brief got the wrong way round

**The dark grey-blue border is not `record`'s.** `design/record/projects/photos-censored/project.toml`
sets `mockup = "none"` and says why: record composites no chrome of its own, and
the capture is bare content. The band is
`--projects-panel-frame-inset` — 0.816% of the Frame, about 8.4px at a window
1033 wide — showing `--projects-panel-frame-fill-far`, `#131518`, which is a dark
grey that leans blue. It is inset on three sides and flush at the top, which is
the "it even reaches around the top but a decision was made to cut it out" in the
brief: `src/sections/projects-panel/NOTES.md` records that notch as being in the
render rather than an artefact. Axis E is that band.

**There IS a second border, it is in the video, and it is WHITE.** ~~near-black~~
— the first version of this paragraph said the clip carried about 14px of
near-black down its sides, off a frame pulled with `ffmpeg -ss` *before* `-i`.
That is keyframe seeking, not accurate seeking, and on a 2.85s clip with two
keyframes it returned a frame that is not in the file at that time at all. It is
recorded here rather than quietly corrected because the wrong number is the more
plausible one — a dark app in a dark Panel — and the next reader will guess it
too.

What the file actually holds, agreed on by ffmpeg's accurate decode, by
Chromium's own decoder read back off a canvas, and by the shipped page's pixels:
the clip is the **light** theme, and `--page-inset` shows as **pure white**,
`rgb(255,255,255)`, to every edge and at every time. Measured in from the
window's edge on the real page at a Frame 1056 wide: 1px of rim at
`rgb(90,91,93)`, 8px of `#131518`, then **10px of pure white**, then photographs.
A white line between a dark grey band and a pure-black Panel is a far louder
border than the band it sits inside, and it is most of what the brief is
describing.

That the clip is light is **deliberate and recent** — `4ca13a2`, "Re-cut the
photos clip on white, and make the capture hold it there". `capture-origin.mjs`
seeds `photos.theme = "light"` before first paint and
`check-capture-origin.mjs` **refuses the capture** if it reads back anything
else. So this is a decision to revisit, not a defect to fix.

Two different costs, and they are not the same:

- **The theme is free.** That commit measured it: "the walk run under each theme
  returns the same 84 tiles at the same boxes and the same `roll_digest`, so the
  theme repaints the ground and moves nothing." A dark re-cut needs no censor
  re-review — one seeded value, and the check's expectation moved with it.
- **The page inset is not.** `--page-inset` changes the width the justified rows
  are packed into, so zeroing it reflows them,
  `design/tools/collect-roll.mjs --check` reports DRIFTED, and the signed list
  stops covering the photographs the clip passes over. That is a photograph
  review to redo, not a number to change.

Which is why removing the margin belongs in **`record`, as a trim on the
capture** rather than in the app: trimming the encoded frame leaves the layout
untouched, so the camera sees strictly *less* than the list was signed against —
the same argument `NOTES.md` already makes for cropping the recording from the
top edge only. Axis F simulates that trim by scale, so it can be judged before
the code exists.
