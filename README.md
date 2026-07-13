# Portfolio — Christian Juresh

A minimal, single-column personal site — a monochrome reworking of
[jenslind.com](https://jenslind.com). On desktop it shows the same narrow
column as on mobile, centered on the page. The whole page fades in gently on
load; the photographs are a horizontal carousel that fades into the paper until
you hover it.

## Editing the content

**You only ever need to edit `content.js`.** It's plain text — your name, bio,
work history, education, contact links and the list of photos, each with a short
note explaining it. No HTML, no build step. Save the file and refresh.

## Files

- `content.js` — **the file you edit.** All the words and the photo list.
- `index.html` — a tiny shell; loads the styles and scripts.
- `app.js` — renders the page from `content.js` and runs the carousel. You
  shouldn't need to touch this.
- `styles.css` — all styling. Colours, the column width (`--col`), the carousel
  image height (`--slide-h`) and fonts are CSS variables at the top.
- `img/` — web-optimised photos (EXIF rotation baked in, ~800px wide, ~110 KB
  each), generated from the originals in `photos/`.
- `photos/` — untouched full-resolution originals (source of truth). Not committed
  to git (~250MB); kept local. Regenerate `img/` from these with the Pillow step below.

## Run locally

```
python -m http.server 8000
```

Then open <http://localhost:8000>. (Opening `index.html` directly also works —
`content.js`/`app.js` load as normal `<script>` files, so no server is needed.)

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
