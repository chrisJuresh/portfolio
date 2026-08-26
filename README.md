# chrisj.uk

Personal site and photo portfolio.

`/portfolio` is built with Astro and TypeScript — every version pinned exactly,
nothing updated on a schedule — and prerendered to static files. It was hand
-written HTML, CSS and vanilla JavaScript until the rebuild landed; the portal at
`/` still is. See [The build](#the-build).

**Live:** [chrisj.uk](https://chrisj.uk)

A single phone-width column presents a short CV — bio, work experience,
education, contact — threaded through a full-bleed carousel of 53 of my own
photographs of London. Scroll past the cut title at its foot and the page turns
dark for the Projects Panel, where one project is shown as a composition rather
than described. It is one document, served statically from Vercel.

<!-- screenshot: full-page desktop view, light theme, carousel mid-strip -->

## Highlights

- **One document, several URLs.** The Sections are reached by scrolling and
  never by clicking, and each one is still linkable: `/portfolio/projects` is
  this same page, opened at the Projects Panel. A Section mounts as it approaches
  the viewport, so a page carrying several heavy compositions costs one
  Section's decode work at a time.
- **Almost no dependencies.** GSAP moves the Timelines; everything else — the
  carousel, the theme, the effect stack, the Frame's glass — is the project's own
  TypeScript, and the page ships no framework runtime at all.
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
  The fades lift on hover or keyboard focus, and switch off entirely on
  narrow viewports where they would obscure the photos.
- **An effect stack, on a switch.** Optical treatments over the finished page —
  two baked textures, a halftone screen, moving grain, vignette, a CRT tube and
  the rest. Each is a token in `<html data-fx="…">` and each is off unless its
  token is there; two ship on. Add `?fx=film paper` to the URL to see any
  combination, or `?fx=` for the page underneath. Almost all of it is CSS — the
  layers are composited quads, and the only things that animate are off by
  default. The textures are baked by `design/effects/build-textures.py` and tuned
  in `design/legacy/effects-tuner.html`; `src/kernel/effect-stack/` is what
  paints them, and carries the one rule that cannot be written as a comment.
- **Flash-free dark mode.** An inline script applies the saved or OS theme
  before first paint — the one blocking script on the page, and the reason it is
  blocking. The site follows OS theme changes until you make an explicit choice
  with the toggle, which is then remembered in `localStorage`.
- **Accessible.** ARIA carousel semantics, a `role="switch"` theme toggle,
  keyboard-operable photo strip, visible focus outlines, alt text on every
  photograph, and `prefers-reduced-motion` honoured — including the Panel's
  recording, whose bytes are never requested by a reader who asked for less
  motion.
- **Fast.** 53 images total 5.7 MB (web-optimised copies of ~250 MB of
  originals, which stay out of the repo). Everything past the first two
  images lazy-loads; Vercel serves images with
  `stale-while-revalidate` cache headers.

## Project structure

```
.
├── index.html          # portal at / — hand-written, served verbatim
├── vercel.json         # clean URLs, the /projects redirect, the deep links, cache headers
├── astro.config.mjs    # the build, and the dev server's stand-in for the deployment
├── site.bat            # double-click to see the site — builds, then serves the build
├── editor.bat          # double-click to edit the site — the same build, with the Editor on it
├── run.bat             # double-click to serve the repo root for design/ — NOT the site
├── src/
│   ├── pages/
│   │   └── portfolio.astro     # the document
│   ├── shell/          # the head, the mount points, the deep link's jump
│   ├── kernel/         # faces, ground, theme, the Turn, corner pictures, effect stack
│   └── sections/       # one folder per Section — see stub/NOTES.md
├── scripts/            # the build's own steps, the Checks, the Editor, `pnpm feature`
├── portfolio/          # served verbatim, not built
│   ├── img/            # web-optimised photographs
│   │   └── tex/        # the baked textures — see its README
│   └── video/          # the Projects Panel's recording — see design/censor/README.md
├── projects/           # no page here any more — /projects 308s to /portfolio#projects
│   ├── entries.json    # the eleven cards the retired wall carried, kept as data
│   └── og.jpg          # the retired page's social card — generated, see design/og/
├── fonts/              # the self-hosted faces — see its README
└── design/             # dev-only: the labs and the generators — never deployed
    ├── bake/           # what each generator is run with — read by the Editor AND by it
    └── legacy/         # the five HTML tuners the Editor replaced, kept working
```

A **Section** owns its markup, styles, Tokens, Content, Timeline and assets in one
folder and may read the **Kernel** and nothing else; the **Shell** carries the
head, the Kernel and the Sections' mount points and no composition of its own.
`CONTEXT.md` is the whole vocabulary.

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

A Section's words are its **Content**, held as typed data in that Section's own
`content.ts` apart from the markup that presents them.

## Running locally

```sh
pnpm install --frozen-lockfile
pnpm dev         # Astro's dev server, standing in for the deployment
```

`pnpm dev` answers everything the deployment does off one origin: the built
routes, the four paths served verbatim, and the deep-link rewrites. `pnpm build`
then `pnpm preview` serves the real `dist/` instead, which is what the Checks
drive.

### Or double-click one of the three `.bat` files

No terminal, and none of the three is interchangeable with another:

| file | what it serves | for |
| --- | --- | --- |
| `site.bat` | builds the tree, then serves that `dist/` | seeing the site |
| `editor.bat` | the same build, with the Editor over it | changing what it says |
| `run.bat` | the repository root as plain files | the instruments under `design/` |

`site.bat` is `pnpm build` and `pnpm preview` with a free port found and the
browser opened, so it shows the article that deploys and takes about fifteen
seconds to get there. It builds rather than running `pnpm dev` because `astro
dev` daemonises — a double-clicked window cannot own that process, so closing
the window would leave it running. `pnpm dev` is still the one to *work* in.

`editor.bat` is `pnpm editor` the same way: the same build, on a free port, with
the Editor over it — so it is **Editing the site** below without a terminal.
Because the build runs in front of the server it waits for the port to answer
rather than for a guessed number of seconds, and if the build fails no browser
opens and the window says so.

`run.bat` is **not** the site, though it used to be. Since `/portfolio` became a
build, serving the root as plain files answers that path with a directory listing
of the pictures — which is why it opens at `/design/` and says so on the console.
What it is for is the one thing `pnpm dev` will not serve: the dev-only
instruments under `design/`, which are plain HTML reaching for
`../portfolio/img/` by relative path.

## Editing the site

```sh
pnpm editor
```

That opens the real page locally with the Editor over it: click any piece of
text, type, press Enter, and the change is in the source file — or drag a Token
and watch the page move. Publish commits and pushes, and the live site follows.
It writes Content and Tokens and nothing else, a limit that is a mechanism rather
than a promise: the only files it can name are a Section's `content.ts` and
`tokens.css`, and the only thing it can do to one is replace a single value's
bytes. `scripts/editor/NOTES.md` is the rest of it.

On Windows, double-clicking **`editor.bat`** is that command with a free port
found and the browser opened for you.

### Rearranging a whole screenful, and handing it over

The **Measure** surface picks anything on the page and moves it, resizes it or
changes its text size. Two toggles at the top of it are what make that work over a
session rather than over one element:

- **scale text with the box** — a resize carries the text size with it, by the
  ratio the box changed by, so "make this bigger" is one gesture instead of two.
  Scrubbing the text size row still sets it outright.
- **keep changes when picking something else** — the change you just made stays on
  the page while you pick the next thing, so several can be arranged and looked at
  together. Picking something you already moved carries on from where you started
  rather than starting again.

**undo** and **redo** sit under the two toggles, and **Ctrl+Z** is the same press
without moving the pointer (**Ctrl+Shift+Z** puts it back). One gesture at a time
— a drag, a corner, a row, a *put back* — rather than all the way home, which is
what *put back* already was. Where the gesture wrote something, undo writes it
back: a row backed by a Token writes that Token to what it held before, and an
Override is discarded or restored. So trying a drag costs nothing, which is the
whole point of it.

Everything you do lands on the **Recording**, the sixth surface: one block per
element, with the numbers, what governs each of them and which values the Editor
has already written for you. Press **copy** and paste it to an agent — that
document is written to be acted on, and it says explicitly which changes are
already in the source so they do not get applied twice. **put the page back** takes
every kept change off the page again, and **clear the Recording** empties the
document without touching the page.

Everything else — layout, palette, motion — is a Section's own folder, and
`src/sections/stub/NOTES.md` is the convention every one of them follows.

Full-resolution photo originals are deliberately untracked (see
`.gitignore`); the repo carries only the optimised web copies in
`portfolio/img/`, which keeps the repository lean and deploys fast. To
optimise new originals: Pillow — `ImageOps.exif_transpose`, resize to
800 px wide, quality 82, progressive JPEG (~110 KB each).

## Typography

One page, four self-hosted families: three book serifs for the CV and a grotesk
for the Projects Panel at its foot. The Sitka stack described further down is
what the whole site used to be set in, and is now only the fallback tail.

**`/portfolio`, the CV** — **Vollkorn** for anything meant to be read (body
text, role lines, headings, contact), **Spectral** for the small lettered labels
(name, tagline, projects link, theme toggle), and **Source Serif 4** for the year
column. All three are OFL, subset and served from `/fonts`, declared in
`src/kernel/faces.css`, ~112 KB across five faces. The italic lead stays in
Georgia.

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
one project rather than describing it — and that is set in **Host Grotesk**, OFL,
two cuts, 32 KB. It was chosen as what the cut title *morphed into* as the page
scrolled, and its masthead uses the exact weight that morph solved for. The morph
itself did not survive the rebuild; the face and the weight did.
`fonts/README.md` has the whole of that, including why one of the two cuts is at
a weight nobody names.

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

Anything the page is a picture OF — the three corner photographs, the two paper
textures, the Projects Panel's marble — is baked by a Python generator under
`design/`, and every number those generators are run with is a **Bake**:
`design/bake/<name>/`, reachable from the Editor and read by the generator itself,
so a run from a shell and a re-bake from the Editor are given the same values.
`design/legacy/README.md` is where the five separate tuners this replaced went.

How that was decided lives in `design/` — a dev-only lab that previews the real
page under any typeface variant, plus a tuner for arriving at one, and committed
Playwright renders of the whole matrix. It is kept out of deploys by
`.vercelignore`. `fonts/README.md` records why Computer Modern lost, measured
rather than asserted. Neither folder affects a visitor; see
[`design/README.md`](design/README.md) and [`fonts/README.md`](fonts/README.md).

## The build

```bash
pnpm install --frozen-lockfile
pnpm build       # checks, typechecks, builds, assembles dist/
pnpm preview     # serves that dist/ — of the tree it is run from
pnpm dev         # Astro's dev server, standing in for the deployment
pnpm check       # builds, serves, drives headless Chromium, runs every Check
pnpm variants    # renders every Variant of every Section into one sheet
pnpm editor      # opens the real page locally, editable
```

`/portfolio` is one document made of Sections. Two of the boundaries between them
are the build's rather than a convention: a Section's styles are scoped by the
compiler, and its Content is typed, so renaming a field stops the build instead
of blanking the page. `pnpm check:sections` is the rest of it.

**Deep links.** `/portfolio/<section>` is this same document, rewritten onto that
path by the deployment and opened at the Section the last segment names, so a
link to one part can be shared without the site becoming several pages. The
rewrites are declared in `vercel.json` and read from there by every local server,
and a Check requires a working one for each Section the document is made of.

A Section can also carry **Variants**: several complete alternative directions,
all present in the source at once and selected by an attribute, so that choosing
between them is looking rather than describing. `pnpm variants` renders the whole
matrix — every Variant of every Section, both themes — into one sheet at
`design/sheets/index.html`, each picture captioned with what that Variant
declares. The rejected ones stay in the source as the record of what was
compared, and cost a reader nothing: nothing imports them, so they are not in the
build at all. This is the general form of the typographic comparison in `design/`
described above.

Reading order for the detail: `CONTEXT.md` for the vocabulary, `docs/adr/` for the
decisions, then `src/kernel/NOTES.md` and `src/sections/stub/NOTES.md`.
`docs/agents/variants.md` is the Variants and the sheet.

## Deployment

The site deploys to Vercel as static files. `pnpm build` writes Astro's output to
`dist/` and copies `index.html`, `portfolio/`, `projects/` and `fonts/` in beside
it, byte for byte, and `dist/` is what gets served. `dist/portfolio/` holds both
halves — the document Astro rendered and the pictures it reaches for — so the
copy refuses on a FILE both sides own rather than merging over it.

`vercel.json` enables clean URLs, 308s `/projects` to
`/portfolio#projects`, and sets a
day-long `Cache-Control` (with a week of `stale-while-revalidate`) on the
image directory, plus a year-long `immutable` one on `/fonts` and another on
`/portfolio/video` — so a rebuilt face needs a new filename, never a new file
under an old one.

The Projects Panel's recording is the one thing under an immutable rule that
does **not** get a new filename, and it is a deliberate exception rather than an
oversight: it is named by the page in two places and referred to by a third
repository's documentation, so it carries a content stamp in its query string
instead — `video/photos-grid.webm?v=<stamp>`, written by hand because the URL is
assembled in script where the build cannot fingerprint it. A re-cut clip changes
the stamp. It is
written down in `design/censor/README.md` beside the command that produces the
clip, because that is where somebody about to make the mistake will be standing.

`.vercelignore` keeps `design/` out, so the lab and its
renders never reach the deployment.

## Status

A personal site, live and maintained. Small by design, and still small after the
rebuild: what a visitor is served is prerendered HTML, one stylesheet per
Section, GSAP, and the project's own TypeScript. Every version is pinned exactly
and nothing is updated on a schedule.
