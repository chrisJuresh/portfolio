# design/ — typography lab

Dev-only. Nothing here is served by the site; `.vercelignore` keeps the whole
folder out of deployments.

> **#141 deleted the page half of this lab drives, and most of it has not been
> repointed.** `/portfolio` was a hand-written tree served straight off the repo
> root, and that is what every instrument here opens: `render.mjs` walks
> `/portfolio/`, and `glass-tuner`, `effects-tuner`, `layout-tuner`,
> `morph-tuner`, `plate-tuner` and `plinth-tuner` iframe it or drive scripts it
> carried. It is an Astro build now, so `run.bat` no longer serves it and those
> pages open on a 404 or an inert frame.
>
> What still works untouched: everything that BAKES rather than looks —
> `build-plate.py`, `build-textures.py`, `build-portoro-maps.py`, `build-slab.py`,
> `add-stone.py`, `build-og.py`, the censor pipeline — because their outputs are
> under `portfolio/img/` and `portfolio/video/`, which the build does not produce
> and the deployment still serves verbatim. `plinth-studio.py`,
> `build-cut-title.py` and the morph lab's `build-site.py` were repointed at the
> Section files they now write. `render-variants.mjs` (`pnpm variants`) is the
> successor to `render.mjs` and drives the built page correctly.
>
> Repointing the tuners is not a rename: each one has to reach a built page
> instead of a served file, and several read Content out of a JavaScript object
> that is now typed TypeScript. That wants its own ticket and its own decisions.

**Two things called variants live here, and they are not the same thing.**
`variants.css` and `tools/render.mjs` are the typographic comparison this folder
was built for: eight variants of one type stack, across the hand-written
`/portfolio`, which was a plain static tree with no Sections in it. They are kept
as the record of how that comparison was judged; the page they drove is gone. `tools/render-variants.mjs` is the general mechanism it became — a
**Variant** is any complete alternative direction for a Section, declared in that
Section's own `variants.css`, and `pnpm variants` renders them all into
`sheets/index.html`. See [`../docs/agents/variants.md`](../docs/agents/variants.md).

**Outcome: `sitka` won**, with two exceptions the lab shows too — the year column,
kept in Georgia because its old-style figures reach 78% of the cap height beside
them where Sitka's lining figures stand to 84%, and the italic lead paragraph,
which kept Georgia after being seen both ways. Computer Modern lost on ink
density, measured in [`../fonts/README.md`](../fonts/README.md), not on taste. So
`sitka` is the variant to compare against; `asis` is history, not the live site.

**`/portfolio` has since moved past it**, using the tuner rather than the lab.
Its reading text is **Vollkorn**, its small lettered labels are **Spectral**, its
year column is **Source Serif 4**, and all three are self-hosted from
[`/fonts`](../fonts/README.md) rather than named and hoped for. The italic lead is
still Georgia. The Sitka chain survives as the tail every one of those stacks
falls back to, so a blocked font request lands on a screen serif instead of on
Times. `/projects` was still Sitka until #71 retired the page altogether; that
half of the comparison now has no live subject. Sizes did not move: Vollkorn's
x-height is 4% under Sitka's and Spectral's 6%, and the faces were chosen at
these sizes.

Nothing here re-runs that decision — the variants and the shots are the
Sitka-era comparison, kept as it was judged. What follows says where each of them
now stands relative to a base that has moved.

```
design/
  variants.css       every TYPE variant, defined ONCE — the source of truth.
                     Not the same thing as a Section's Variants: see the note
                     under this tree
  type-lab.html      interactive: flip variants on the real pages in a browser
  type-tuner.html    interactive: free-form size/spacing/font sliders + CSS export
  layout-tuner.html  interactive: drag and resize every box in the Projects Panel
                     over the real page — no sliders, a measuring instrument. The
                     export says where each box ended up in pixels, in shares of
                     --panel-w, and on the composition's own grid lines
  shots/             committed renders + index.html contact sheet
  sheets/            the Variant sheet — the Portfolio's Sections rendered under every
                     Variant they declare, captioned with what each one changes.
                     Written by tools/render-variants.mjs, wiped on every run and
                     not committed
  tools/
    render-variants.mjs  `pnpm variants`. The general form of render.mjs below:
                     any Section, any number of Variants, layout and palette and
                     motion rather than only type. docs/agents/variants.md
  plate/
    build-plate.py   develops a source into portfolio/img/<stem>-*.webp — the grade
                     lives in design/bake/plate/, not in this file
    plate-source.webp  the ungraded frame the tuner grades; written by the script
    plate-source.json  the constants it was last built with — the tuner's "was"
    car-source.webp    the same pair for the second picture, the one in the
    car-source.json    top-right corner
    eye-source.webp    and for the third, in the bottom-right. One pipeline over
    eye-source.json    all three; a Grade per picture per theme.
  effects/
    build-textures.py    bakes the two Texturelabs plates into portfolio/img/tex/
                         from design/bake/effects/
  bake/
    tuning.py            what the Editor has tuned, as the generator beside it
                         wants it. Five folders below it, one per Bake, each
                         holding a recipe.json (the declaration: the command and
                         every parameter, with its default, its range and what it
                         does) and a params.json (what has MOVED off those
                         defaults — written by the Editor, absent until something
                         is). The GENERATORS read it too, which is the point:
                         there is no block of Python to paste back and nothing to
                         drift. `pnpm editor`, the Bakes surface
    plate/  effects/  plinth/  plinth-studio/  morph/
  legacy/                the five HTML tuners the Editor replaced (#146), kept
                         working. design/legacy/README.md says which is which and
                         what moved where
  plinth/
    build-slab.py        RENDERS the Projects Panel's marble plinth into the
                         same directory — Blender, headless, one WebP per stone
                         with the block's silhouette in the alpha. The camera is
                         solved from the design render and the two lights are
                         fitted to its measured profile; the stone is procedural,
                         so nothing is downloaded and nothing is attributed.
                         Needs Blender, not pip:
                           blender -b -P design/plinth/build-slab.py -- all
    slab.json            what that script says — camera, block, lights and the
                         whole CANDIDATES table. WRITTEN BY IT, never by hand:
                         it is how the tuner below avoids holding a second copy
                         of constants that would drift out from under it.
  tools/
    render.mjs       Playwright: serves the repo, walks the matrix, writes shots/
    package.json     dev dependency (playwright) — not the site's
    check-capture-contract.py
                     replays the GitHub profile README's hourly screenshot of
                     /portfolio against a local tree. It asserts on the deleted
                     page's structure, so it cannot pass and is a gate on
                     nothing until #148. See docs/agents/capture-contract.md
    (the four per-ticket harnesses that used to sit here - check-panel-clip,
     check-panel-nav, check-crossing and check-panel-exit - are gone with the
     page they drove. Each proved one closed ticket's criteria against the
     hand-written /portfolio by serving the repo root and navigating to it, and
     #141 deleted that page. Their successor is the blocking suite: `pnpm
     check`, in scripts/checks/, which is the seam docs/agents/contract.md
     names. git history has them.)
```

> **Five of these are in `design/legacy/` now.** The plate, plinth,
> plinth-studio, morph and effects tuners were absorbed into `pnpm editor` by
> #146 — one editing surface instead of six — and are kept, working, because
> that is a judgement worth being able to reverse. Everything they said about
> WHAT they tune is still true and is left standing below; what is no longer true
> is the block of Python each of them prints, because a generator now reads its
> numbers out of `design/bake/` rather than out of its own source.
> `design/legacy/README.md` is the map.

The **lab** compares finished candidates; the **tuner** is for arriving at one.
The **plate tuner** does the same job for the three photographs in the page's
corners, and the **plinth tuner** for the whole of the Projects Panel — the
stone it stands on, the wording of its subheading, what sits behind its glass,
what that glass is made of, how the whole composition comes apart when it is
left, and where in the turn the page crosses into dark. Every one of the five is the real page driven in
an iframe, so what is being looked at is what would ship — the exit twice over,
because `crossing` puts a second real page on top of the first rather than
drawing a picture of one. THE STONE is where it
is worth knowing which half of the page you are reading: the baked plates are the
real render and comparing them is exact, while the previz beside them is an
approximation of Cycles and says nothing reliable about where an individual vein
lands. It is for the character of a stone — how much gold, how wide, how sharp —
and its numbers want one confirming bake. The page says so twice, in the header
comment and in the export itself.

The **glass tuner** is the other half of the titlebar's story and is not replaced
by any of that. It draws the four passes itself, so it can step through them one
at a time and stand the bar over a checkerboard or a photograph — things the real
page has no way to do. The plinth tuner cannot: it moves the shipping page's
uniforms and asks the shipping page to render. They share the vocabulary and the
export format on purpose, so a `glass-state v2` blob taken over the real
composition pastes into the glass tuner's own import box and back again.

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
page is meant to be Computer Modern. Nothing on that page is Georgia. (That file
and that page are gone since #71 — this row is left as written because the whole
of this section is the record of a comparison that was run against them.)

**`portfolio/styles.css`** — only these, via `--serif-label` / `--serif-body`
(the year column has had `--serif-num` of its own since, and is Source Serif 4
today rather than the Georgia it was when this table was written):

| Element | What it is |
|---|---|
| `.name` | "christian juresh" in the masthead |
| `.tagline` | the location line under it |
| `.projects-link` | the "Projects" link |
| `.item .when` | the year column (`2024–Present`) |
| `.theme-toggle` | the "dark" / "light" label |
| `.intro p + p` | bio paragraphs after the lead — none in the current content |

Everything else on that page used to **hard-code Georgia**: the italic lead, the
section headings, the role lines, the italic subtitles and the contact list. So on
the portfolio page Computer Modern was only ever carrying five small pieces of
furniture, and the file's own opening comment — "Computer Modern for all text" —
never matched the CSS. The `cm-all` variant is what that comment described.

Those Georgia declarations are gone now: promoting `sitka` sent the section
headings, role lines and contact list through `--serif-body`, and gave the two
slots that stayed off Sitka variables of their own — the year column
(`--serif-num`) and the italic lead (`--serif-lead`), both Georgia after being
seen both ways. They shared a stack but stayed separate slots, since each was
tuned on its own, and that has since paid for itself: `--serif-num` is Source
Serif 4 now and `--serif-lead` is still Georgia.

So the portfolio page's four slots today are:

| Variable | Face | What reads it |
|---|---|---|
| `--serif-body` | Vollkorn, self-hosted | section headings, role lines, italic subtitles, contact list, bio paragraphs |
| `--serif-label` | Spectral, self-hosted | `.name`, `.tagline`, `.projects-link`, `.theme-toggle` |
| `--serif-num` | Source Serif 4, self-hosted, `onum` on | `.item .when` — the year column |
| `--serif-lead` | Georgia | `.intro .lead` — the italic lead paragraph |

`--serif-num` exists for one property: old-style figures, so a date does not read
as loud as the organisation name beside it. Source Serif 4 does **not** default to
them — plain, its figures stand to 100.3% of cap, worse than the problem the slot
was created for — so `onum` is load-bearing and the subset in
[`../fonts/README.md`](../fonts/README.md) keeps it explicitly. Georgia stays on
the tail of that stack for the same reason it was chosen: its defaults are
old-style too.

## Variants

| Name | What it does |
|---|---|
| `asis` | The pre-Sitka site: the CM stack forced to generic serif. **The baseline everything was judged against.** |
| `cm` | Real Computer Modern, no other change. What shipping `fonts.css` alone gives you. |
| `cm-swap` | **Every** slot in real CM — including portfolio's hard-coded Georgia — but not one size, leading or margin altered. A pure typeface swap. Identical to `cm` on `/projects`. |
| `cmfix` | Real CM, +11.6% with the 8pt/9pt optical cuts for small text. |
| `cm-all` | Real CM everywhere, including the slots that hard-code Georgia. |
| `hybrid` | CM for titles, names and labels; Georgia for prose. |
| `georgia-all` | Georgia everywhere; Computer Modern abandoned. |
| `sitka` | Sitka Text / Charter, with years and lead in Georgia. Most legible, least portable (Windows-only). **Won the comparison, and shipped on `/projects` until #71 retired that page.** |

Every variant pins all four font variables, including `--serif-num` and
`--serif-lead`. That is not decoration: those two did not exist when most of these
were written, and the values they used to fall through to — Georgia, and Georgia —
were what each variant assumed. On `/portfolio` they no longer are, so without the
pin `asis` would show a self-hosted Source Serif 4 year column inside a page whose
entire claim is that it is Times.

`sitka` is the one to hold against `/portfolio` today, but as a **comparison**
rather than a mirror: it shows the face the page used to be set in, at the sizes
the page still uses.

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

It loads the real `/portfolio/` or `/` in an iframe and injects
`variants.css` — so it works even though the portfolio page builds its entire DOM
from `content.js` at runtime, and it can never drift from the live pages.

- <kbd>←</kbd> / <kbd>→</kbd> flips variants in place — the only reliable way to
  see a type change; side-by-side hides small differences in leading and x-height
- page, width and theme switches; state is in the URL, so any view is linkable
- the readout **measures** which face actually resolved rather than trusting the
  declared `font-family`, since a family that doesn't resolve fails silently

## Type tuner

For tuning `/portfolio` by eye rather than choosing between prepared variants.
Serve the repo root (`run.bat`) and open:

```
http://localhost:8000/design/type-tuner.html
```

Sliders for every size, leading, tracking and gap on the page, plus a stack
picker for each of the four font slots (`--serif-body`, `--serif-label`,
`--serif-num`, `--serif-lead`) and one more for the cut title's `--serif-display`,
which has a list of its own. Changes land in the **real** page in the iframe
as you drag — same trick as the lab, so nothing is cloned and it can't drift.
This is the tool the current stack was chosen with; the four rows start on the
stacks `portfolio/styles.css` declares today, marked `(ships)` in each list.

**Page → shift right** is the one row that moves the CV rather than setting it:
`.col { translate }`, the whole resume block off the page's centre line —
masthead, intro, photo strip, work, education, contact and the toggle together,
negative for left. A `translate` and not a margin, so the layout box stays put
and nothing re-wraps at any offset, and the strip's full-bleed and edge fade
travel with the text instead of being re-derived against a new centre. The cut
title doesn't move (it is `.page`'s child, not `.col`'s) and neither do the corner
pictures, which is both the use of the row — judging the block against the plate,
the car and the eye — and the alignment it costs. There is nothing to shift into on
a phone, where the gutter is 1.35rem.

### The font lists

**Whichever face the pointer is on is the face in the page**, so the way to
survey all twenty-eight stacks is to run the pointer down the list and watch —
no clicking in and back out to see each one. The arrow keys do the same from the
keyboard. Only a click (or <kbd>Enter</kbd>) keeps a face; leaving the list or
pressing <kbd>Esc</kbd> hands the page back to whatever is actually chosen.

A hover is deliberately *not* a change: `state.vals` is untouched, so the export,
the change count, the profile dot and the undo timeline all go on describing what
you have chosen rather than what you are looking at. The trigger says which of
the two you are seeing — a hovered name shows in the amber the panel already uses
for "this has moved" — and the resolved-face note beside the row keeps pace with
the pointer, so a face this machine hasn't got says so (in Comic Sans) as you
pass over it rather than after you commit to it.

These lists are hand-built rather than `<select>`s for exactly this reason: a
native dropdown is drawn by the OS and never reports which option the pointer is
over, so trying a face meant choosing it. They open in the panel's own flow, not
floating over it, because the control column scrolls and a popup would be clipped
by it.

### Edge fade

Two groups, four sliders each, all of them `:root` numbers that `styles.css`
assembles into the carousel's dissolve — so the export is the declaration, with
no gradient stop list to re-derive by hand:

| slider | property | what it moves |
| --- | --- | --- |
| start | `--fade-x` | where the fade begins, in photo-widths from the text edge. `0` is exactly where the column of text ends; negative pulls it left over the photographs, positive pushes it into the gutter |
| distance | `--fade-span` | how far it travels before the paper is solid, in photo-widths |
| intensity | `--fade-max` | how opaque the paper gets at the far end — below `1` the photographs never quite disappear |
| curve | `--fade-ease` | `0` is a straight ramp, `1` eases both ends (a smoothstep), negative inverts it so the fade bites immediately |

**Edge fade — at rest** is that table: the fade with the first photograph still
sitting at the text edge, which is how the page loads. **Edge fade — three in
view** is the same four numbers a photograph later, suffixed `-open`
(`--fade-x-open`, `--fade-span-open`, `--fade-max-open`, `--fade-ease-open`) —
where the dissolve has slid out to the text edge, keeping its width and its
straight ramp, so it no longer covers the leading photograph. `app.js`
reports how far between the two ends the strip has got as `--fade-open`, `0` to
`1`, and `styles.css` mixes them, so the fade eases from one setting to the other
as the strip moves rather than switching. The at-rest group is doing double duty:
the strip closes back down to it over the last photograph's run, so the two sets
of sliders also govern how the strip stands at its right-hand end, mirrored.

Neither group can be judged from the other's position — standing still the
`-open` numbers carry no weight at all, and mid-strip the plain ones don't — so each
group names the strip position it needs and **grabbing a slider takes the frame
there**, gliding rather than jumping, so the travel you tune is the travel a
visitor sees. Reloading the frame (flipping the theme does) returns to whichever
state you were last working in.

All eight rows highlight with an outline and no tint: the fade *is* a wash of
paper colour, so a wash of orange over it would tell you nothing.

Hovering or focusing a control outlines what it governs in the page, and grabbing
one scrolls that element into view if it's off-screen. The `highlight` button
turns it off. For the four font slots the outline follows the text that *reads*
the custom property — the year column for `--serif-num`, and so on — rather than
uselessly circling `:root`.

**Frame size is a real viewport, width and height**, and defaults to your own
window's shape. This matters more than it looks: the page sizes the photo strip
with `clamp(15rem, 40vh, 24rem)` and its padding with `clamp(3rem, 9vh, 6.5rem)`,
so height is not decoration. A 1280×720 laptop shows a 287px strip; anything tall
shows it pinned at its 384px maximum. Presets carry real device heights, both
dimensions are typeable, and `whole page` stretches the frame to the full column
— good for judging spacing across sections, at the cost of that `vh` fidelity,
which is why it isn't the default.

The output is the point:

```css
.name {
  font-size: 0.9rem;                         /* was 0.78rem */
  letter-spacing: 0.09em;                    /* was 0.06em */
}
```

Only what you changed, using the selectors and units `portfolio/styles.css`
already uses, with the previous value alongside. **Copy** it into a message to
Claude and it can be applied without anyone re-deriving what moved. Each export
also carries a `tuner-state` comment, so pasting an old export back into the box
and hitting **import** restores that state.

### Undo and profiles

`↶` / `↷` in the top bar, or <kbd>Ctrl</kbd>+<kbd>Z</kbd> and
<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd>. A
slider **drag is one step, not one per pixel** — it applies live and only records
on release — and a burst of changes to the same control within 700ms folds
together, so typing `0.85` into a box undoes as one move. Resetting and importing
are both undoable. The timeline covers your changes only, not the frame size,
theme or the profiles themselves, which are settings rather than edits.

Five profile slots sit above the controls, for parking settings and flipping
between them:

- **click** an occupied slot to load it, or press its **number key** <kbd>1</kbd>–<kbd>5</kbd>
  — the fastest way to A/B two typographic settings, which is the whole point
- **click an empty slot** to store the current state there
- **⤓** overwrites that slot with the current state (it asks first if occupied)
- **double-click** renames, **alt-click** clears
- the active slot is filled in; once you edit away from it, it goes amber with a
  dot, so "what I'm looking at" and "what the slot holds" never blur together
- loading a profile is itself undoable
- profiles persist across reloads; the undo timeline is per session
- when the export matches the loaded profile exactly, its name appears in the
  header comment

Notes on how it behaves:

- The injected sheet is appended **last with no `!important`**, so the preview
  obeys the same cascade the exported CSS will meet in the real file. A change
  that doesn't take in the tuner wouldn't take in `styles.css` either.
- Defaults are **declared** in the `ROWS` table in the file, not measured, because
  computed style only reports pixels and could never tell you the source said
  `0.78rem`. To stop that table from silently rotting, every default is checked
  against the live page on load and any mismatch is reported in a banner —
  **if that banner fires, update `ROWS`**, otherwise the `was` comments lie. The
  four font rows are checked too, comparing family names and their order rather
  than the exact spelling; they used to be exempt, which is how their defaults
  went on claiming Sitka after the page had moved to Vollkorn and Spectral.
- The preview gets its faces from three places, and the difference matters when
  you paste an export back. Vollkorn, Spectral, Source Serif 4 and the Latin
  Modern cuts come out of `/fonts`, so they render here **and** in production —
  the three serifs arrive with the portfolio page's own stylesheet, which is why
  the tuner does not fetch them from Google even though Google has them. Every
  other webfont in the lists is borrowed from Google Fonts for the preview only,
  and the export header says which ones an export leans on: naming one is a
  decision to go and self-host it, or it is `serif` for every visitor. Everything
  left is a system face, and a stack that falls through to **Comic Sans** is one
  this machine hasn't got.
- Rows `styles.css` doesn't declare at all (the year column's size, which just
  inherits `0.9rem` from `.item .line`) start at the inherited value and only
  enter the export once moved, marked `was not set`.
- Selectors absent from the current `content.js` — `.intro p + p`, since the bio
  is a single paragraph — are shown greyed and italic rather than silently doing
  nothing.
- Two slots are written as shorthands in the source (`.theme-toggle`'s `font:`,
  several `margin:`). The export notes that above the rule so it's applied to the
  right declaration.
- State persists in `localStorage` — changes, profiles, frame size and the
  highlight setting — so a reload doesn't lose a session's work.
- The frame width is **not** padded to hide the iframe's scrollbar. A frame set to
  1280 behaves like a 1280 browser window, where `100vw` counts the scrollbar and
  the content box doesn't; widening it to hide the bar would make the preview lie
  about the one thing it's for.

## Plate tuner

For the three photographs standing in `/portfolio`'s corners — **the plate**, St
Paul's over the rooftops in the bottom-left; **the car**, a cable car hanging off
its pylon in the top-right; and **the eye**, the London Eye seen rim-on so the
wheel reads as a mast of capsules, in the bottom-right. Serve the repo root
(`run.bat`) and open:

```
http://localhost:8000/design/legacy/plate-tuner.html
```

Each is two things shipped through two different pipes, and this window is where
they are judged together:

- **The grade and the sky matte** are baked into `portfolio/img/<stem>-*.webp` by
  `build-plate.py` — exposure, saturation, contrast, the highlight shoulder, the
  two colours black and white land on, grain, and (when the script is the one
  cutting) the numbers that decide what counts as sky. Nothing in a browser can
  change that file, so the tuner runs the script's pipeline again in a canvas over
  `<stem>-source.webp` (which the script writes for the purpose) and prints a block
  of Python to paste back.
  **A change here does not reach the site until `build-plate.py` runs again** —
  once per picture: `python design/plate/build-plate.py <source> car`, and likewise
  `plate` or `eye`.
- **The placement** — `--plate-opacity`, `--plate-fill`, `--plate-x`,
  `--plate-y`, `--plate-crop` for the plate; `--car-opacity`, `--car-fill`,
  `--car-fade`, `--car-x`, `--car-y`, `--car-crop` for the car; `--eye-opacity`,
  `--eye-fill`, `--eye-x`, `--eye-y`, `--eye-crop` for the eye — is CSS, and is
  live in the iframe as you drag. That half exports as CSS. `--plate-y` may go
  negative, which hangs the plate past the fold into the second screen rather
  than clipping it there; the crops cut the foot off the plate and the eye and the
  head off the car, each as a share of that picture's own width so the same slice
  goes at every window size. Only the car has a `fade` — its inner edge is the
  gantry, cut clean across; the other two have empty sky there and want no ramp.

**A grade per frame, per theme.** `build-plate.py` used to hold one block of grade
constants and run it over every picture, on the theory that they should read as one
paper stock. They still should, and what makes them is the pipeline — the same
percentile exposure, the same shoulder, the same desaturation toward the same tint
— which is still one pipeline. What is per picture is only where each frame's black
and white are *pinned*, and those are absolute: one pair of endpoints cannot be
right for a dome that fills its frame, a gondola on a wire and a steel lattice with
sky through it. So there is a `Grade` per picture per theme, and both switches in
the top bar do the same kind of thing — the theme button swaps which grade you are
dragging and which paper it stands on, the picture button swaps which grade you are
dragging and which frame it runs over. The picture you switch to is the one regraded
live; the others stay as the last run of the script left them. They open on
identical numbers, so nothing has diverged until somebody looks at one and says
otherwise.

Notes, mostly the same shape as the type tuner's:

- The defaults are read, never written down. The grade's come from
  `plate-source.json`, which `build-plate.py` writes in the same run as the
  image; the placement's are probed off the live page. So there is no table here
  to drift out of step with either file, and no drift banner needed.
- `--plate-opacity`, `--car-opacity` and `--eye-opacity` are declared twice in
  `styles.css` — every picture needs more of itself on black — so they are held,
  exported and probed **per theme**, and the export puts each half in the right
  block.
- Three views: on the page (the one that decides anything), the picture alone at
  full strength on the page's own paper (where a lifted black is legible at all),
  and the matte, which lights the knocked-out sky up in orange.
- Every placement row has to be something `getComputedStyle` hands back as a
  number, which is why the size control is `--plate-fill` / `--car-fill` /
  `--eye-fill` and not `--plate-w` / `--car-w` / `--eye-w`: those are
  `min(calc(…), 2400px)` and come back as their own text.
- It is a preview, not a proof: eight bits against float32, graded at the
  source's 900px rather than at full width and downsampled, and a different grain
  stream. Decide numbers here; check them by running the script.

### The sky, and why it is a matte and not a crop

No sky is wanted, only the building — the page's own paper is the sky. Cropping
cannot do it: the dome is the tallest thing in the frame and the sky closes over
it on both sides, so the tallest sky-free rectangle starts below the balustrade
and throws away the lantern, the cross and the whole curve of the dome. So the
frame is kept whole and the sky is knocked out to transparent.

**The matte can arrive either way.** `build-plate.py` takes an RW2 and cuts one,
or an RGBA PNG that has already been cut and uses its alpha as given. What ships
now is the second — so the matte panel in the tuner hides itself, since there is
nothing left on it to decide, and `plate-source.json` records `"matte": null` to
say so. The rest of this section is about the first, which is still there and is
the only path that can produce a matte from a frame that has none.

Finding it is a threshold on **brightness**, kept honest by connectivity — full
reasoning in `build-plate.py`. Blueness used to be half the test and is now no
part of it: the sky here is a hazy backlit white, and the dome's stone, lit by
that same sky, is the bluer of the two. Ask for blue and you knock out the
building.

The part worth knowing at this end is the hysteresis: the brightness test only
has to be passed to *start* a patch of sky (`SKY_LUMA_MIN`), and a patch already
begun spreads down to `SKY_LUMA_LOW`. That is what carries the matte into the
corner of the frame, which is over a stop down on the middle and was otherwise
left behind as a ragged wedge of grey in the top-right — sky, painted as though
it were building. Connectivity to the top edge is what stops the same permissive
threshold punching through the tower's sunlit lead roof, which is brighter than
the dim end of the sky.

Either way the sky is then **bled over** before the frame is downsampled: every
pixel short of fully opaque is painted with the nearest kept one, so what mixes
at the roofline is subject-to-page and not subject-to-sky. It matters far more
for a supplied matte than a computed one — a hand-cut edge can be a quarter of
the frame of soft alpha, every pixel of it still wearing the sky, against the
pixel or two a computed matte leaves.

## Effects tuner

For the ten treatments laid over the finished page — the two Texturelabs
textures, the chromatic aberration, the grain, the halftone screen, the vignette,
the halation, the gate weave, the CRT tube and the ASCII pass. Serve the repo
root (`run.bat`) and open:

```
http://localhost:8000/design/legacy/effects-tuner.html
```

The same trick as the type tuner — the real `/portfolio` in an iframe, driven
through the seam `portfolio/effects.js` exposes as `window.portfolioFx`, so
nothing is cloned and it cannot drift from the page. Chips at the top turn
effects on and off, and the four that ship on are marked with a dot so "what a
visitor sees" stays legible after an hour of dragging. Groups for effects that
are off are dimmed rather than hidden, so the panel does not jump every time a
chip is pressed.

Two things separate it from the other two tuners:

- **No defaults table, and so no drift banner.** The type tuner has to declare
  its defaults because computed style only reports pixels and can never say the
  source wrote `0.78rem`. This one gets them free: a custom property comes back
  from `getComputedStyle` as the tokens it was DECLARED with, and every row here
  is declared in `styles.css` as a plain literal — `0.14`, `9px`, `multiply`,
  never a calc or a var. So the defaults are read off the sheet on load. What
  keeps that honest is a check rather than a table: anything that fails to parse
  as a literal is named in a banner, which is what would happen if a row were
  ever rewritten as an expression.
- **Eight rows are held per theme.** The film's and the paper's levels stages —
  strength, blend, lift, contrast, and the film's invert — are declared once in
  `:root` and again in `:root[data-theme="dark"]`, because this page's two papers
  are `#fff` and `#000` and one set cannot serve both. They are marked `*`,
  probed per theme, and the export puts each half in the right block. Everything
  else is shared and exports once. Flipping the theme clears every inline
  override first, or a number set while looking at light would follow you into
  dark and hide what dark actually ships.

**The levels stage is the thing to understand before moving anything.** Both
textures are baked centred on mid-grey, and `overlay` and `soft-light` — what a
texture overlay usually is — are exact no-ops at both `#fff` and `#000`. Blended
that way the textures would have shown up on the photographs and the type and
nowhere else. So the flat field is moved onto the endpoint instead, with
`filter: brightness(B) contrast(C)`, and the blend is chosen to clip the half
that cannot show: `multiply` on white, `screen` on black. `C × (B − 1) = ±1` is
the relation that lands the field exactly on the endpoint, and the shipped
numbers satisfy it on both themes with the same detail gain. Move `lift` and
`contrast` together along it; break it deliberately and the field starts tinting
the page, which is how you get stock that is not quite white. Full reasoning is
in THE LEVELS STAGE in `portfolio/styles.css`.

Changing a texture itself — not how it is blended, but what it contains — means
re-running the bake, which is the same division as the plate tuner's:

```bash
python design/effects/build-textures.py all
```

It needs the two XL JPEGs at the repo root; they are gitignored, and
`portfolio/img/tex/README.md` says where they come from and how they are
attributed. Paste the `TEX_VERSION` it prints over the `?v=` on `--fx-film-src`
and `--fx-paper-src` in the same commit as the re-baked files.

## Layout tuner

The odd one out, and it is worth saying why before the how: every other tuner in
here is a set of sliders over a number that already exists in the sheet. This one
has no sliders and changes nothing. It is a measuring instrument — you drag the
boxes of the Projects Panel around until the drawing is the one you want, and it
tells you where you put them. What is written into `styles.css` afterwards is a
separate, deliberate edit, made by hand, by somebody reading the export.

```
http://localhost:8000/design/layout-tuner.html
```

The real `/portfolio` in an iframe, same as the effects tuner and for the same
reason: every length in the composition is derived — `--panel-w` is a `min()` of
a width branch and a fit branch, the masthead is a share of that, row one is a
stated height in two of those shares — so a mock-up with the numbers typed in
would be a picture of the arithmetic rather than the arithmetic itself.

Click any box to select it, drag it anywhere, drag a handle to resize. Shift
locks a drag to one axis and keeps the proportions on a corner handle; arrows
nudge by 1 and by 10 with shift; alt+arrows resize; delete puts one box back.
`grid` draws the twelve columns and the row seam over the composition, `window`
picks which viewport the whole thing is derived for, and `scope` widens the
instrument from the panel to the whole page.

Three things about it are decisions rather than details:

- **A translate is not a layout, and the export says so itself.** Position is
  applied as the standalone `translate` property, so a moved box paints somewhere
  else and leaves its slot where it was — nothing reflows around it and two boxes
  can be dragged over each other with neither pushing the other. That is right
  for a composition whose parts are placed on a grid, which this one is, and
  would be a lie in a column of text. `translate` and never `transform`, because
  the Rail's names are rotated and the reflection is folded, and a transform
  written over either deletes the thing that makes it what it is.
- **Size is applied only on the axis whose handle you dragged.** The Frame's
  height comes from `aspect-ratio`; a resize that stated both when you asked for
  one would take the ratio out of the picture without mentioning it. Drag the
  east handle and the height follows the ratio, which is what the composition
  does.
- **Nothing is read as a custom property.** `getComputedStyle` hands one back as
  the tokens it was declared with, resolving nothing, and every number this needs
  — `--panel-w`, the gutter, the column, row one's height — is declared as a
  `min()` or a `calc()`. So all four come from used values instead:
  `grid-template-columns`, `grid-template-rows` and `column-gap` off
  `.panel-inner`, which resolve to the pixel track list the browser actually laid
  out. The effects tuner reads properties directly and is right to; every row it
  reads is a plain literal, and none of these are.

The export gives every box in three units at once, because they answer different
questions: pixels are what you dragged and are true only at the viewport named in
the header; the share of `--panel-w` is the unit the `.panel` blocks are actually
written in and so the column that transcribes; and the grid line numbers are for
the boxes that are placed rather than sized — `.panel-stage` reads exactly 3.00
and 13.00 there, which is `grid-area: 2 / 3 / 3 / 13` said back to you. An edge
that comes out on line 3.02 is telling you it wants to be on the line.

It also carries a `state:` comment at the foot of the export, so pasting an
earlier one back into the box and pressing `import` restores the whole
arrangement — the same device the type tuner's `tuner-state` is.

## Plinth studio

The odd one out in a different direction from the layout tuner: every other tool
here is a page served by a static server, and this one **is** the server, because
what it does cannot be done from a page. Making a plinth means resampling a
photograph into four PBR maps and then path-tracing them in Blender, and a
browser can do neither.

```bash
python design/legacy/plinth-studio.py
```

It prints a URL and opens it. Do not serve it with `run.bat` — the page is inert
without its own server behind it, and it needs no other one: it serves the
repository as well, so `/portfolio` in its iframe and the plates in its strip
come off the same origin.

**What it is for** is that the four steps between a photograph and a stone on the
site were four commands in a fixed order — `build-portoro-maps.py`,
`build-slab.py` in Blender, `add-stone.py` over the top of both, and then
`portfolio/styles.css` edited by hand with a digest in it that goes stale
silently. Now: drop an image, move the sliders, bake, apply.

Three things it knows that those commands do not:

- **Maps are per-image, not per-stone.** They are cached under a digest of the
  image bytes and the two flags that change what they contain, so a second bake
  at a different `scale` is fifteen seconds of Cycles rather than another fifty
  megabytes of PNG. Content-addressed and not name-addressed on purpose — a
  directory keyed by a name is a directory the next `photo.jpg` overwrites.
- **The `?v=` is a digest of every plate**, so it moves when any stone is baked,
  including one only being tried. Apply restamps every plinth `url()` in the
  stylesheet, and the page shows a warning whenever they have drifted apart —
  which is exactly the drift that survived two bakes unnoticed before it shipped.
- **It refuses to shadow a built-in.** A stone it writes is
  `design/plinth/stones/<key>.json`, the same door `add-stone.py` uses, and a
  name the tables in `build-slab.py` already define is rejected rather than
  merged.

**The one thing it draws rather than renders** is the window: the block's
footprint laid over your photograph, from the same arithmetic
`build_photo_material()` projects with, so `scale` and `offset` — the two
strongest controls — are answered before a bake is paid for. Everything else that
claims to show a stone is a real Cycles render. There is no GLSL previz of a
photographic material and there is not going to be one; the plinth tuner has one
for the *procedural* stones and says out loud that it cannot draw these.

What is committed and what is not follows `add-stone.py` exactly: the entry and
the plate ship, the maps and your photograph do not. `design/plinth/sources/` is
gitignored, so keep anything you care about somewhere else as well.

## Regenerating the shots

**The committed shots predate the promotion, deliberately.** They are the
comparison as it was actually judged: each variant over the old base stylesheets,
where sizes were tuned for the generic-serif fallback. The base sizes are now
Sitka's, so re-rendering would stack every *other* variant on top of Sitka-tuned
sizes and quietly overwrite the evidence for the decision. Regenerate when you are
running a new comparison, not to refresh these.

The base has since moved again — `/portfolio` is Vollkorn and Spectral now — which
only makes re-rendering less appropriate, not more. These shots answer "which face
should the site be set in", a question that was settled; the current stack was
arrived at in the tuner, which does not produce shots.

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
node render.mjs --viewports desktop,mobile --pages panel,portfolio,portal
node render.mjs --scale 1.5              # ~44% smaller files
node render.mjs --format jpeg --quality 85
```

Defaults: all 8 variants x portfolio x light+dark x desktop = 16 shots
at `deviceScaleFactor: 2`.

**The `projects` key is now `panel`.** Since #71 there is no `/projects` page;
what is worth shooting is the Projects Panel at the foot of `/portfolio`, so the
key points at the fragment and the shot is clipped to that section. It was
renamed rather than repointed because shot filenames are built from the key: a
repointed `projects` would have written over the sixteen committed card-wall
shots — the only surviving picture of the page #71 deletes — silently, one run at
a time. Under `panel` both sets coexist.

It is not a default, either. The Panel is set in Host Grotesk from its own
palette, so no variant and no theme reaches it and a default run would write
sixteen copies of one picture. The axis it *does* move on is the viewport, so ask
for it with the other two pinned:

```bash
node render.mjs --pages panel --variants sitka --themes light \
                --viewports desktop,tablet,mobile
```

`--format auto` (the default) picks the codec per page, which is worth doing:
the portal page and the projects Panel are flat colour and type where PNG wins
(399 KB vs 477 KB, measured on the old card wall), the portfolio page carries
photographs where JPEG wins by more than 3x (345 KB vs 1161 KB).

Shots are deterministic — animations and transitions are disabled, the carousel
fades are pinned, `reducedMotion` is on and lazy images are scrolled in — so
re-running an unchanged variant produces an identical file and adds nothing to
git. Changing a variant does write a new blob, so regenerate deliberately rather
than on every tweak.

## Promoting a variant to the real site

`variants.css` is a lab artifact, not a patch. To adopt one:

1. Point `--serif-label` / `--serif-body` / `--serif-num` / `--serif-lead` at the
   variant's stacks. (There was a `--serif` on `/projects` too; that page went in
   #71, so `portfolio/styles.css` is the only target left.)
2. **If the face is not a system face, host it first.** A variant renders in the
   lab off `/fonts/fonts.css` or off a Google request the tuner makes; neither is
   true of the deployed site, so promoting one without hosting it sets the whole
   page in Times while still looking right in the lab. Subset it into `/fonts`
   following the recipe in [`../fonts/README.md`](../fonts/README.md), declare
   only the cuts the CSS actually asks for, and add the long-cache header for
   `/fonts/` — `vercel.json` already carries it.
3. Copy that variant's per-element rules into `portfolio/styles.css`, dropping
   the `:root[data-variant="…"]` prefixes. Its `.card__*` rules have no subject
   any more and are not copied anywhere.
4. Bump the `?v=` on the `styles.css` link so cached copies don't survive.
5. Update the `(ships)` entries and the four font-row defaults in
   `type-tuner.html` — the tuner's drift banner will tell you if you forget.
6. Re-run the renderer to confirm the live pages now match the chosen shot.

That is the path `sitka` took, which is why the live sizes are its sizes. Step 2
is the one that was learned the hard way: the tuner exported Vollkorn, Spectral
and Source Serif 4 for `/portfolio`, all three of them faces it was borrowing
from Google, and applying that export alone would have set every word on the page
in generic serif.
