# chrisj.uk

Personal site and photo portfolio — hand-written HTML, CSS and vanilla
JavaScript. No framework, no build step, no dependencies.

**Live:** [chrisj.uk](https://chrisj.uk)

A single phone-width column presents a short CV — bio, work experience,
education, contact — threaded through a full-bleed carousel of 53 of my own
photographs of London. Scroll past the cut title at its foot and the page turns
dark for the Projects Panel, where one project is shown as a composition rather
than described. All of it is a handful of hand-written source files and a folder
of images, served statically from Vercel.

<!-- screenshot: full-page desktop view, light theme, carousel mid-strip -->

## Highlights

- **Zero dependencies.** Every behaviour — carousel physics, theming, the
  scrollbar — is hand-rolled in ~300 lines of plain JavaScript. Nothing the site
  serves needs installing or building. The one `package.json` in the repo belongs
  to the dev-only typography lab in `design/`, which never ships.
- **Momentum carousel.** Wheel flicks and drag-releases feed a velocity that
  decays with friction each animation frame; when motion settles, the photo
  nearest the centre eases into place with a cancellable ease-out tween. The
  first and last photos stay aligned with their end of the text column rather
  than reaching the middle, so the strip is bounded the same way at both ends.
  Mouse and pen drag with a fling on release; touch stays native; arrow keys
  step one photo at a time.
- **Edge fades that dissolve into the page.** The strip fades into the paper
  colour at both edges. Three colour stops and two interpolation hints, so
  the browser bends the ramp on a power law instead of walking a chain of
  straight segments — there is no piecewise-linear kink anywhere to band.
  Where it starts, how far it reaches, how far it goes and how hard it eases
  are four numbers on `:root` — twice over, because the fade is two settings
  the page eases between. At rest the paper reaches half a photograph in past
  the text edge so the first picture stands alone; pull the strip along and the
  dissolve draws back to the text edge and tightens, arriving by the time the
  second photograph reaches the centre of the screen. The last photograph gets
  the same standing: over its own run in, the fade closes back down, so the
  strip comes to rest against the right-hand edge wearing what it wore against
  the left. It is scroll position, not a timed animation, so it runs backwards
  just as smoothly on the way home.
  Both sets have sliders in `design/type-tuner.html`, which takes the strip to
  whichever state you're tuning.
  The fades lift on hover or keyboard focus, and switch off entirely on
  narrow viewports where they would obscure the photos.
- **An effect stack, on a switch.** Ten optical treatments over the finished
  page — two baked textures, chromatic aberration, moving grain, a halftone
  screen, vignette, halation, gate weave, a CRT tube, and an ASCII pass that
  redraws the three corner photographs as a field of characters. Each is a token
  in `<html data-fx="…">` and each is off unless its token is there; three ship
  on. Add `?fx=film paper` to the URL to see any combination, or `?fx=` for the
  page underneath — which is also how my GitHub profile README screenshots this
  page, since a texture meant to be felt at full size only reads as noise once
  it has been resampled into a README. Almost all of it is CSS — the layers are
  composited quads, and the only things that animate are off by default. The
  textures are baked by
  `design/effects/build-textures.py` and tuned in `design/effects/effects-tuner.html`.
  The trick that makes one asset serve both themes is in **THE LEVELS STAGE** in
  `portfolio/styles.css`.
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
├── index.html          # portal at / — links into /portfolio and its projects section
├── vercel.json         # clean URLs + the /projects redirect + cache headers
├── run.bat             # double-click to preview locally (Windows)
├── portfolio/          # the CV + photo carousel at /portfolio
│   ├── index.html      # page shell: meta tags, pre-paint theme bootstrap
│   ├── content.js      # ALL portfolio content — the only file you edit
│   ├── app.js          # renders content.js and runs the carousel + theme
│   ├── effects.js      # the effect stack's runtime half — optional, loaded last
│   ├── cut-morph.js    # the cut title turning into a sans — optional, loaded last
│   ├── panel-clip.js   # gives the Panel's <video> its sources — optional, loaded last
│   ├── styles.css      # layout, warm light/dark palettes, fades, print CV
│   ├── img/            # web-optimised photographs
│   │   └── tex/        # the two baked textures — see its README
│   └── video/          # the Projects Panel's recording — see design/censor/README.md
├── projects/           # no page here any more — /projects 308s to /portfolio#projects
│   ├── entries.json    # the eleven cards the retired wall carried, kept as data
│   └── og.jpg          # the retired page's social card — generated, see design/og/
├── fonts/              # the self-hosted faces — see its README
└── design/             # dev-only: typography lab + OG builder — never deployed
```

`fonts/` holds every face the site is actually set in, as woff2 subsets — plus
Latin Modern Roman, which no page links and which is kept as the record of a
decision made and reversed. Its own README says which is which. `design/` is the
dev-only lab those decisions were made in and is excluded from deploys entirely —
see **Typography**.

One of those leftovers is load-bearing after all. The `/projects` social card was
made before the move to Sitka and is set in Latin Modern, so
`design/og/build-og.py` reads `fonts/lmroman10-regular.woff2` to re-set its type.
Don't delete `fonts/` on the assumption nothing uses it. The card is generated,
not hand-edited — `design/og/README.md` covers how to change its wording.

`projects/` used to be a page: a wall of eleven tinted cards at `/projects`. It
was retired for the Projects Panel, which shows one project as a composition
instead of eleven as summaries. `/projects` now redirects to
`/portfolio#projects` — the redirect is in `vercel.json`, so every link ever made
to the old URL still lands somewhere real. The eleven entries are kept verbatim
in `projects/entries.json`; nothing renders that file yet, and it is there so
that the eight projects with no Panel of their own can be brought back without
digging them out of git history. `og.jpg` is the retired page's social card and
is now unreferenced — a crawler following `/projects` reads `/portfolio`'s tags
instead — but it is what `design/og/` builds, so it stays until that pipeline is
either repointed or removed.

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
`/portfolio` sets an absolute `<base href>`, so its assets only resolve when it
sits under the server root. Note that a plain file server does not read
`vercel.json`: locally `/projects/` gets you a directory listing of the two files
still in that folder rather than the redirect. The section it redirects to is
reached at `/portfolio/#projects` either way.

## Editing the site

1. Edit `portfolio/content.js` — add or reorder photos (any file in
   `portfolio/img/` can be used), change the bio, work, education or
   contact entries.
2. Edit the Projects Panel in `portfolio/index.html` directly. Unlike the CV
   above it, the Panel is one composition with no repetition in it, so it is
   static markup with no content file — its copy, its four engineering points
   and its Rail labels are all written where they are read.
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

One page, four self-hosted families: three book serifs for the CV and a grotesk
for the Projects Panel at its foot. The Sitka stack described further down is
what the whole site used to be set in, and is now only the fallback tail.

**`/portfolio`, the CV** — **Vollkorn** for anything meant to be read (`--serif-body`:
body text, role lines, headings, contact), **Spectral** for the small lettered
labels (`--serif-label`: name, tagline, projects link, theme toggle), and
**Source Serif 4** for the year column (`--serif-num`). All three are OFL,
subset and served from `/fonts`, declared at the top of `portfolio/styles.css`,
~112 KB across five faces. The italic lead (`--serif-lead`) stays in Georgia.

The year column is the slot with a reason rather than a preference behind it: it
exists to keep a date from reading as loud as the organisation name beside it,
which means old-style figures. Source Serif 4's *default* figures are lining and
stand to 100.3% of the cap height — worse than what this slot was created to
avoid — so the CSS asks for `font-variant-numeric: oldstyle-nums` and the subset
keeps the `onum` feature that serves it. Rebuild the face without `onum` and the
column silently goes loud. `fonts/README.md` has the measurements.

Each stack still ends in the old Sitka chain. That tail is unreachable unless a
font request fails, and it is kept for exactly that case: every word on the page
now depends on a webfont, and the failure should land on a screen serif rather
than on Times New Roman.

**...and one grotesk, at the foot.** Past the cut title and the blank screen it
opens onto, `/portfolio` ends in the Projects Panel — a dark composition showing
one project rather than describing it — and that is set in **Host Grotesk**
(`--sans-panel`), OFL, two cuts, 32 KB. It is not a sixth reading face: the cut
title *morphs into* Host Grotesk as the page scrolls, so the section is set in
what the animation above it turns into, and its masthead uses the exact weight
that morph solved for. `fonts/README.md` has the whole of that, including why
one of the two cuts is at a weight nobody names.

**The fallback tail** — **Sitka**, Matthew Carter's serif, cut for reading on
screen and bundled with Windows. It was what `/projects` shipped in until #71
retired that page, and it is what every stack above still ends in:

```css
"Sitka Text", Charter, "Iowan Old Style", Georgia, serif
```

Two things to know before editing that. `Sitka` on its own resolves nowhere: the
family is addressed by optical size, and `Sitka Text` is the reading cut. And it
can't be self-hosted — it's licensed with Windows, not redistributable — so the
rest of the stack isn't decoration. macOS gets Charter, iOS Iowan Old Style,
Android Georgia. Similar x-heights, so the layout holds, but not everyone sees the
same face. `/portfolio`'s sizes are still Sitka's, and were left that way
deliberately: Vollkorn's x-height is 4% below Sitka's and Spectral's 6%, small
enough that the faces were chosen at the existing sizes.

How that was decided lives in `design/` — a dev-only lab that previews the real
pages under any typeface variant, plus a tuner for arriving at one, and committed
Playwright renders of the whole matrix. It holds the repo's only dependency and is
kept out of deploys by `.vercelignore`. `fonts/README.md` records why Computer
Modern lost, measured rather than asserted. Neither folder affects a visitor; see
[`design/README.md`](design/README.md) and [`fonts/README.md`](fonts/README.md).

## Deployment

The site deploys to Vercel as a plain static site — no framework preset,
no build command. `vercel.json` enables clean URLs, 308s `/projects` to
`/portfolio#projects`, and sets a
day-long `Cache-Control` (with a week of `stale-while-revalidate`) on the
image directory, plus a year-long `immutable` one on `/fonts` and another on
`/portfolio/video` — so a rebuilt face needs a new filename, never a new file
under an old one.

The Projects Panel's recording is the one thing under an immutable rule that
does **not** get a new filename, and it is a deliberate exception rather than an
oversight: it is named by the page in two places and referred to by a third
repository's documentation, so it carries a content stamp in its query string
instead — `video/photos-grid.webm?v=<stamp>`, the same device `styles.css`
already uses for the baked textures. A re-cut clip changes the stamp. It is
written down in `design/censor/README.md` beside the command that produces the
clip, because that is where somebody about to make the mistake will be standing.

`.vercelignore` keeps `design/` out, so the lab and its
renders never reach the deployment.

## Status

A personal site, live and maintained. Small by design: the constraint that
everything visitors touch is hand-written, and that the only dependency is a
browser, is the point. The one dev dependency is Playwright in `design/`, for
screenshots — nothing the site serves.
