# design/ — typography lab

Dev-only. Nothing here is served by the site; `.vercelignore` keeps the whole
folder out of deployments. The site itself stays dependency-free and build-free.

```
design/
  variants.css       every variant, defined ONCE — the source of truth
  type-lab.html      interactive: flip variants on the real pages in a browser
  shots/             committed renders + index.html contact sheet
  tools/
    render.mjs       Playwright: serves the repo, walks the matrix, writes shots/
    package.json     dev dependency (playwright) — not the site's
```

## Why it exists

Every stylesheet asked for a typeface the site never shipped:

```css
font-family: "Computer Modern", "CMU Serif", "Latin Modern Roman", serif;
```

None of those three was installed or served, so every visitor fell through to
generic `serif` — Times New Roman on Windows and macOS, Noto Serif on Android,
usually DejaVu on Linux. The lab exists to compare real candidates on the real
pages instead of guessing, and to keep a durable visual record of the options.

## Which text was *supposed* to be Computer Modern

Worth knowing before judging any variant, because the answer is "less than you'd
think" — which is why shipping the fonts changes the portfolio page so little.

**`projects/styles.css`** — `--serif` is set on `body`, so **every** word on the
page is meant to be Computer Modern. Nothing on that page is Georgia.

**`portfolio/styles.css`** — only these, via `--serif-label` / `--serif-body`:

| Element | What it is |
|---|---|
| `.name` | "christian juresh" in the masthead |
| `.tagline` | the location line under it |
| `.projects-link` | the "Projects" link |
| `.item .when` | the year column (`2024–Present`) |
| `.theme-toggle` | the "dark" / "light" label |
| `.intro p + p` | bio paragraphs after the lead — none in the current content |

Everything else on that page **deliberately hard-codes Georgia**: the italic
lead, the section headings, the role lines, the italic subtitles and the contact
list. So on the portfolio page Computer Modern was only ever carrying five small
pieces of furniture, and the file's own opening comment — "Computer Modern for
all text" — has never matched the CSS. The `cm-all` variant is what that comment
actually describes.

## Variants

| Name | What it does |
|---|---|
| `asis` | Today's live reality: the CM stack forced to generic serif. **The baseline.** |
| `cm` | Real Computer Modern, no other change. What shipping `fonts.css` alone gives you. |
| `cm-swap` | **Every** slot in real CM — including portfolio's hard-coded Georgia — but not one size, leading or margin altered. A pure typeface swap. Identical to `cm` on `/projects`. |
| `cmfix` | Real CM, +11.6% with the 8pt/9pt optical cuts for small text. |
| `cm-all` | Real CM everywhere, including the slots that hard-code Georgia. |
| `hybrid` | CM for titles, names and labels; Georgia for prose. |
| `georgia-all` | Georgia everywhere; Computer Modern abandoned. |
| `sitka` | Sitka Text / Charter. Most legible, least portable (Windows-only). |

Why `cmfix` compensates: Latin Modern's measured x-height is **0.431em**, *below*
the Times fallback's 0.447em and well below Georgia's 0.481em. Switching to real
CM at the existing sizes makes text read tighter, not looser — so sizes need
roughly +11.6% to match Georgia's apparent size. Full metrics in
[`../fonts/README.md`](../fonts/README.md).

## Interactive lab

Serve the **repo root** (`run.bat`), then open:

```
http://localhost:8000/design/type-lab.html
```

It loads the real `/projects/`, `/portfolio/` or `/` in an iframe and injects
`variants.css` — so it works even though the portfolio page builds its entire DOM
from `content.js` at runtime, and it can never drift from the live pages.

- <kbd>←</kbd> / <kbd>→</kbd> flips variants in place — the only reliable way to
  see a type change; side-by-side hides small differences in leading and x-height
- page, width and theme switches; state is in the URL, so any view is linkable
- the readout **measures** which face actually resolved rather than trusting the
  declared `font-family`, since a family that doesn't resolve fails silently

## Regenerating the shots

```bash
cd design/tools
npm install          # playwright; browsers land in the shared user cache
npm run render
```

Needs nothing else running — the script serves the repo root itself on an
ephemeral port. Every shot is verified after capture by measuring the resolved
face, and that measurement is printed and written into the contact sheet, so a
variant that silently failed to apply is visible rather than hidden.

Useful flags:

```bash
node render.mjs --variants cm,cmfix --themes dark
node render.mjs --viewports desktop,mobile --pages projects,portfolio,portal
node render.mjs --scale 1.5              # ~44% smaller files
node render.mjs --format jpeg --quality 85
```

Defaults: all 8 variants x projects+portfolio x light+dark x desktop = 32 shots
at `deviceScaleFactor: 2`, about 11 MB.

`--format auto` (the default) picks the codec per page, which is worth doing:
the projects page is flat colour and line art where PNG wins (399 KB vs 477 KB),
the portfolio page carries photographs where JPEG wins by more than 3x (345 KB
vs 1161 KB).

Shots are deterministic — animations and transitions are disabled, the carousel
fades are pinned, `reducedMotion` is on and lazy images are scrolled in — so
re-running an unchanged variant produces an identical file and adds nothing to
git. Changing a variant does write a new blob, so regenerate deliberately rather
than on every tweak.

## Promoting a variant to the real site

`variants.css` is a lab artifact, not a patch. To adopt one:

1. Link `/fonts/fonts.css` from the pages that need it. Note this alone activates
   Latin Modern, because the existing stacks already name it third.
2. Copy that variant's per-element rules into `projects/styles.css` and
   `portfolio/styles.css`, dropping the `:root[data-variant="…"]` prefixes.
3. Add the long-cache header for `/fonts/` suggested in `../fonts/README.md`.
4. Re-run the renderer to confirm the live pages now match the chosen shot.
