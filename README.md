# Portfolio — Christian Juresh

A minimal, single-column personal site. On desktop it shows the same narrow
column as on mobile, centered on the page. The whole page fades in gently on
load; the photographs are a horizontal carousel that fades into the paper until
you hover it.

## Layout

This repo is one Vercel project serving two things on `chrisj.uk`:

- `index.html` (repo root) — a tiny **portal** at `chrisj.uk/` (the word
  "portfolio", centered, linking to the site). Add more links here over time.
- `portfolio/` — the portfolio site itself, served at `chrisj.uk/portfolio`.
  It sets `<base href="/portfolio/">` so its assets resolve under that path.
- `projects/` — the recruiter-facing project wall at `chrisj.uk/projects`: one
  tinted card per project, each with its stack, a line drawing and its links.
- `fonts/` — self-hosted Latin Modern Roman (Computer Modern). Not linked by any
  page; kept as the record of a rejected option. See **Fonts** below.
- `design/` — dev-only typography lab. Excluded from deploys by `.vercelignore`.

## Editing the content

**You only ever need to edit `portfolio/content.js`.** It's plain text — your
name, bio, work history, education, contact links and the list of photos, each
with a short note explaining it. No HTML, no build step. Save and refresh.

## Files (inside `portfolio/`)

- `content.js` — **the file you edit.** All the words and the photo list.
- `index.html` — a tiny shell; loads the styles and scripts.
- `app.js` — renders the page from `content.js` and runs the carousel.
- `styles.css` — all styling. Colours, the column width (`--col`), the carousel
  image height (`--slide-h`) and fonts are CSS variables at the top.
- `img/` — web-optimised photos (EXIF rotation baked in, ~800px wide, ~110 KB
  each), generated from the originals in `photos/`.
- `photos/` — untouched full-resolution originals (source of truth). Not committed
  to git (~250MB); kept local. Regenerate `img/` from these with the Pillow step below.

## Run locally

Double-click **`run.bat`** (Windows). It serves the repo root on the first free
port from 8000 and opens the page in your browser; close the window or press
Ctrl+C to stop. Any other platform, or by hand:

```
python -m http.server 8000
```

Then open <http://localhost:8000>. Serve from the **repo root**, not from inside
`portfolio/` or `projects/` — both pages set an absolute `<base href>`, so their
assets only resolve when `/portfolio` and `/projects` sit under the server root.
For the same reason, opening the HTML files straight off disk won't work.

## The carousel

- Scroll it with the scrollbar, the mouse wheel, a trackpad, by dragging, by
  swiping on touch, or by focusing it and using the arrow keys.
- By default it fades into the page on the right (and on the left once you've
  scrolled); hovering (or keyboard-focusing) it reveals every photo.
- To add/remove/reorder photos, edit the `photos` list in `content.js`. Any file
  in `img/` can be used. To re-optimise new originals: Pillow
  `ImageOps.exif_transpose`, resize to 800px wide, quality 82, progressive JPEG.

## Notes

- Motion (page fade-in, carousel fades) is automatically disabled for visitors
  who have "reduce motion" turned on.
- Built as plain HTML/CSS/JS on purpose — for a single page this is lighter and
  simpler to maintain than a framework like SvelteKit, with no build step.
- Before deploying: set `og:image` / add `og:url` + `<link rel="canonical">` in
  `index.html`'s `<head>` to **absolute** URLs on your domain, for link previews.
- The subtitle (`London, UK`) and bio prose are placeholder copy — replace with
  your own words. The CV phone number is intentionally omitted from this public page.

_Please proofread the content before publishing._

## Fonts

The site is set in **Sitka** — Matthew Carter's serif, cut for reading on screen
and bundled with Windows. Every page uses one stack, with two deliberate
exceptions noted below:

```css
"Sitka Text", Charter, "Iowan Old Style", Georgia, serif
```

Two things worth knowing before editing it:

- **`Sitka` on its own resolves nowhere.** The family is addressed by optical
  size — `Sitka Small`, `Sitka Text`, `Sitka Subheading`, `Sitka Heading`,
  `Sitka Display`, `Sitka Banner`. `Sitka Text` is the cut meant for reading.
- **It can't be self-hosted.** Sitka is licensed with Windows, not redistributable,
  so it isn't a webfont. Visitors off Windows get the next entry in the stack:
  Charter on macOS, Iowan Old Style on iOS, Georgia on Android. They're all
  screen serifs of a similar x-height, so the layout holds, but not everyone sees
  the same face. That's the accepted cost of using Sitka at all.

Sizes on both pages are set for Sitka's x-height, which runs larger than the
generic `serif` the pages used to fall back to — so the type sits slightly smaller
and the leading slightly looser than the numbers in git history.

**The year column is Georgia,** not Sitka (`--serif-num`). Sitka's figures are
lining — 0.595em a digit, standing to 84% of the cap height beside them — so next
to an organisation name they read as loud as the name itself. Georgia's defaults
are old-style: 0.574em and 78% of cap. A modest change, but the right direction,
and old-style is the property that matters rather than the specific face, so every
fallback in the stack has it too and the rule asks for it explicitly with
`font-variant-numeric: oldstyle-nums`.

Constantia is the stronger form of that argument and was measured — 0.506em a
digit at 66% of cap, the shortest and narrowest of the three — but Georgia was
kept, so `--serif-num` and `--serif-lead` currently hold the same stack. They stay
separate slots because each was tuned on its own. Figures measured in Chromium
from the rendered advance width of `2024` and `actualBoundingBoxAscent` for `2`
against `H`.

**The italic lead paragraph stays in Georgia** (`--serif-lead`), which is what it
was before Sitka — kept after seeing it both ways. Its `0.95rem` is a Georgia size,
so if that slot is ever folded into `--serif-body` it needs resizing too.

`fonts/` holds self-hosted Latin Modern Roman (Computer Modern) from an earlier
round of this decision. **No page links it** — see `fonts/README.md` for why it
lost and `design/README.md` for the comparison it lost in.

## Design lab

`design/type-lab.html` previews the real pages with any typography variant
applied, and `design/tools/render.mjs` renders the whole matrix to
`design/shots/` with Playwright. Variants are defined once in
`design/variants.css`. Full instructions in `design/README.md`.

`design/type-tuner.html` is the other half: sliders over every size, leading,
tracking, gap and font slot on `/portfolio`, applied live to the real page, with
a copyable CSS export of only what changed — selectors, units and previous values
matching `portfolio/styles.css`. Hovering a control outlines what it governs, and
the frame is a real viewport defaulting to your own window's shape, because the
photo strip and page padding are sized in `vh`. Use the tuner to find a setting,
the lab to judge finished ones.

The lab is the only part of this repo with a dependency (`playwright`, dev-only,
in `design/tools/`). The site itself remains dependency-free with no build step.

## Projects page

A grid of tinted cards, one per project. The page is fully static — `projects/app.js`
only manages the light/dark theme shared with the portfolio page.

To add a project, copy an existing `<li class="card">` in `projects/index.html`
and give it a new tint class. Tints live at the top of `projects/styles.css` as
one light and one dark value per project (`.card--eater { --tint: … }`); text
colour comes from `--card-ink`, so a card only ever needs its background.

The first three cards use `card--feature` (tall, wide artwork); the rest use
`card--compact` (small artwork beside the text), and `card--wide` spans two
columns. The line drawings are `<g>` symbols in the sprite `<svg>` at the top of
the document, drawn in `currentColor` and pulled in with `<use href="#art-…">`.
Replacing one with a screenshot is just swapping that `.card__art` for an `<img>`
with real alt text.
