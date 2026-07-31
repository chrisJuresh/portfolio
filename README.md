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
