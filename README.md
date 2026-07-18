# chrisj.uk

Personal site and photo portfolio — hand-written HTML, CSS and vanilla
JavaScript. No framework, no build step, no dependencies.

**Live:** [chrisj.uk](https://chrisj.uk)

A single phone-width column presents a short CV — bio, work experience,
education, contact — threaded through a full-bleed carousel of 53 of my own
photographs of London. The whole site is three source files and a folder of
images, served statically from Vercel.

<!-- screenshot: full-page desktop view, light theme, carousel mid-strip -->

## Highlights

- **Zero dependencies.** Every behaviour — carousel physics, theming, the
  scrollbar — is hand-rolled in ~300 lines of plain JavaScript. There is no
  `package.json` and nothing to install or build.
- **Momentum carousel.** Wheel flicks and drag-releases feed a velocity that
  decays with friction each animation frame; when motion settles, the photo
  nearest the centre eases into place with a cancellable ease-out tween. The
  first photo stays left-aligned with the text column. Mouse and pen drag
  with a fling on release; touch stays native; arrow keys step one photo at
  a time.
- **Edge fades that dissolve into the page.** The strip fades into the paper
  colour at both edges using nine-stop gradients that approximate a
  smoothstep curve (no visible linear banding). The fades lift on hover or
  keyboard focus, and switch off entirely on narrow viewports where they
  would obscure the photos.
- **Flash-free dark mode.** An inline script applies the saved or OS theme
  before first paint. The site follows OS theme changes until you make an
  explicit choice with the toggle, which is then remembered in
  `localStorage`. The `theme-color` meta updates so mobile browser chrome
  matches.
- **Accessible.** ARIA carousel semantics, a `role="switch"` theme toggle,
  keyboard-operable photo strip, visible focus outlines, alt text on every
  photograph, and `prefers-reduced-motion` support in both the CSS and the
  JS physics (reduced motion gets instant jumps instead of tweens).
- **Fast.** 53 images total 5.7 MB (web-optimised copies of ~250 MB of
  originals, which stay out of the repo). Everything past the first two
  images lazy-loads; Vercel serves images with
  `stale-while-revalidate` cache headers.
- **Prints as a CV.** A print stylesheet hides the carousel and toggle and
  reflows the page as a clean text CV.

## Project structure

```
.
├── index.html          # landing page at / — a single link into /portfolio
├── vercel.json         # clean URLs + cache headers for /portfolio/img/*
└── portfolio/
    ├── index.html      # page shell: meta tags, pre-paint theme bootstrap
    ├── content.js      # ALL site content — the only file you edit
    ├── app.js          # renders content.js and runs the carousel + theme
    ├── styles.css      # layout, warm light/dark palettes, fades, print CV
    └── img/            # web-optimised photographs
```

The content lives in `portfolio/content.js` as one plain-object literal
(name, bio, work, education, contact, and the photo list with alt text).
`app.js` renders it — HTML-escaping every string on the way — so changing
the site never means touching markup or logic. The file is commented so a
non-developer could edit it.

## Running locally

There is nothing to install. Paths are root-relative (the portfolio page
sets `<base href="/portfolio/">`), so serve the repo root with any static
file server rather than opening the files directly:

```sh
python -m http.server
# then open http://localhost:8000/
```

## Editing the site

1. Edit `portfolio/content.js` — add or reorder photos (any file in
   `portfolio/img/` can be used), change the bio, work, education or
   contact entries.
2. If you change `styles.css`, `app.js` or `content.js`, bump the matching
   `?v=` query string in `portfolio/index.html` so browsers pick up the new
   version — there is no build step doing cache-busting for you.

Full-resolution photo originals are deliberately untracked (see
`.gitignore`); the repo carries only the optimised web copies in
`portfolio/img/`, which keeps the repository lean and deploys fast. To
optimise new originals: Pillow — `ImageOps.exif_transpose`, resize to
800 px wide, quality 82, progressive JPEG (~110 KB each).

Colours, the column width (`--col`), the carousel image height
(`--slide-h`) and the fonts are CSS variables at the top of `styles.css`.

## Deployment

The site deploys to Vercel as a plain static site — no framework preset,
no build command. `vercel.json` enables clean URLs and sets a
day-long `Cache-Control` (with a week of `stale-while-revalidate`) on the
image directory.

## Status

A personal site, live and maintained. Small by design: the constraint that
everything fits in three hand-written files — and that the only dependency
is a browser — is the point.
