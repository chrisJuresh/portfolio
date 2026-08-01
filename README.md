# chrisj.uk

Personal site and photo portfolio — hand-written HTML, CSS and vanilla
JavaScript. No framework, no build step, no dependencies.

**Live:** [chrisj.uk](https://chrisj.uk)

A single phone-width column presents a short CV — bio, work experience,
education, contact — threaded through a full-bleed carousel of 53 of my own
photographs of London. Alongside it, a wall of tinted cards for the projects.
Both are a handful of hand-written source files and a folder of images, served
statically from Vercel.

<!-- screenshot: full-page desktop view, light theme, carousel mid-strip -->

## Highlights

- **Zero dependencies.** Every behaviour — carousel physics, theming, the
  scrollbar — is hand-rolled in ~300 lines of plain JavaScript. Nothing the site
  serves needs installing or building. The one `package.json` in the repo belongs
  to the dev-only typography lab in `design/`, which never ships.
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
├── index.html          # portal at / — links into /portfolio and /projects
├── vercel.json         # clean URLs + cache headers for /portfolio/img/*
├── run.bat             # double-click to preview locally (Windows)
├── portfolio/          # the CV + photo carousel at /portfolio
│   ├── index.html      # page shell: meta tags, pre-paint theme bootstrap
│   ├── content.js      # ALL portfolio content — the only file you edit
│   ├── app.js          # renders content.js and runs the carousel + theme
│   ├── styles.css      # layout, warm light/dark palettes, fades, print CV
│   └── img/            # web-optimised photographs
├── projects/           # the project wall at /projects
│   ├── index.html      # the cards themselves, written by hand
│   ├── app.js          # theme bootstrap only — no rendering
│   ├── styles.css      # card grid, per-card tints, print styles
│   └── og.jpg          # social preview, 1200×630 — generated, see design/og/
├── fonts/              # self-hosted Latin Modern Roman — deployed, unlinked
└── design/             # dev-only: typography lab + OG builder — never deployed
```

`fonts/` and `design/` are both leftovers of settling the typeface, and neither
affects a visitor. `fonts/` holds Latin Modern Roman as woff2 subsets; no page
links it, but it stays deployable so `/fonts/*.woff2` is there if that decision is
ever revisited. `design/` is excluded from deploys entirely — see **Typography**.

One of those leftovers is load-bearing after all. The `/projects` social card was
made before the move to Sitka and is set in Latin Modern, so
`design/og/build-og.py` reads `fonts/lmroman10-regular.woff2` to re-set its type.
Don't delete `fonts/` on the assumption nothing uses it. The card is generated,
not hand-edited — `design/og/README.md` covers how to change its wording.

The content lives in `portfolio/content.js` as one plain-object literal
(name, bio, work, education, contact, and the photo list with alt text).
`app.js` renders it — HTML-escaping every string on the way — so changing
the site never means touching markup or logic. The file is commented so a
non-developer could edit it.

## Running locally

There is nothing to install. On Windows, double-click **`run.bat`** — it serves
the repo root on the first free port from 8000 and opens a browser; close the
window or press Ctrl+C to stop. Anywhere else:

```sh
python -m http.server
# then open http://localhost:8000/
```

Serve the **repo root**, not a page directory, and don't open the HTML off disk.
Both pages set an absolute `<base href>`, so their assets only resolve when
`/portfolio` and `/projects` sit under the server root.

## Editing the site

1. Edit `portfolio/content.js` — add or reorder photos (any file in
   `portfolio/img/` can be used), change the bio, work, education or
   contact entries.
2. Edit the project wall in `projects/index.html` directly. Unlike the
   portfolio, the cards are hand-written markup with no content file; each
   carries its own tint, stack, line drawing and links.
3. If you change a `styles.css`, `app.js` or `content.js`, bump the matching
   `?v=` query string in that page's `index.html` so browsers pick up the new
   version — there is no build step doing cache-busting for you.

Full-resolution photo originals are deliberately untracked (see
`.gitignore`); the repo carries only the optimised web copies in
`portfolio/img/`, which keeps the repository lean and deploys fast. To
optimise new originals: Pillow — `ImageOps.exif_transpose`, resize to
800 px wide, quality 82, progressive JPEG (~110 KB each).

Colours, the column width (`--col`), the carousel image height
(`--slide-h`) and the fonts are CSS variables at the top of `styles.css`.

## Typography

Both pages are set in **Sitka** — Matthew Carter's serif, cut for reading on
screen and bundled with Windows:

```css
"Sitka Text", Charter, "Iowan Old Style", Georgia, serif
```

Two things to know before editing it. `Sitka` on its own resolves nowhere: the
family is addressed by optical size, and `Sitka Text` is the reading cut. And it
can't be self-hosted — it's licensed with Windows, not redistributable — so the
rest of the stack isn't decoration. macOS gets Charter, iOS Iowan Old Style,
Android Georgia. Similar x-heights, so the layout holds, but not everyone sees the
same face. That's the accepted cost of using Sitka at all, and the sizes on both
pages are tuned to its x-height rather than the generic `serif` they used to fall
back to.

Two slots stay off Sitka, both Georgia: the year column (`--serif-num`), because
Sitka's lining figures stand to 84% of the cap height beside them and read as loud
as the organisation names, and the italic lead (`--serif-lead`), kept after being
seen both ways. Its `0.95rem` is a Georgia size, so that slot can't be folded into
`--serif-body` without resizing.

How that was decided lives in `design/` — a dev-only lab that previews the real
pages under any typeface variant, plus a tuner for arriving at one, and committed
Playwright renders of the whole matrix. It holds the repo's only dependency and is
kept out of deploys by `.vercelignore`. `fonts/README.md` records why Computer
Modern lost, measured rather than asserted. Neither folder affects a visitor; see
[`design/README.md`](design/README.md) and [`fonts/README.md`](fonts/README.md).

## Deployment

The site deploys to Vercel as a plain static site — no framework preset,
no build command. `vercel.json` enables clean URLs and sets a
day-long `Cache-Control` (with a week of `stale-while-revalidate`) on the
image directory. `.vercelignore` keeps `design/` out, so the lab and its
renders never reach the deployment.

## Status

A personal site, live and maintained. Small by design: the constraint that
everything visitors touch is hand-written, and that the only dependency is a
browser, is the point. The one dev dependency is Playwright in `design/`, for
screenshots — nothing the site serves.
