# design/ — typography lab

Dev-only. Nothing here is served by the site; `.vercelignore` keeps the whole
folder out of deployments. The site itself stays dependency-free and build-free.

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
Times. `/projects` is still Sitka. Sizes did not move: Vollkorn's x-height is 4%
under Sitka's and Spectral's 6%, and the faces were chosen at these sizes.

Nothing here re-runs that decision — the variants and the shots are the
Sitka-era comparison, kept as it was judged. What follows says where each of them
now stands relative to a base that has moved.

```
design/
  variants.css       every variant, defined ONCE — the source of truth
  type-lab.html      interactive: flip variants on the real pages in a browser
  type-tuner.html    interactive: free-form size/spacing/font sliders + CSS export
  shots/             committed renders + index.html contact sheet
  plate/
    build-plate.py   develops a source into portfolio/img/plate-*.webp — the grade
    plate-tuner.html interactive: the same pipeline on sliders + Python/CSS export
    plate-source.webp  the ungraded frame the tuner grades; written by the script
    plate-source.json  the constants it was last built with — the tuner's "was"
  tools/
    render.mjs       Playwright: serves the repo, walks the matrix, writes shots/
    package.json     dev dependency (playwright) — not the site's
```

The **lab** compares finished candidates; the **tuner** is for arriving at one.
The **plate tuner** does the same job for the photograph in the page's corner.

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
| `sitka` | Sitka Text / Charter, with years and lead in Georgia. Most legible, least portable (Windows-only). **Won the comparison; still what `/projects` ships.** |

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

It loads the real `/projects/`, `/portfolio/` or `/` in an iframe and injects
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

For the photograph standing in `/portfolio`'s bottom-left corner. Serve the repo
root (`run.bat`) and open:

```
http://localhost:8000/design/plate/plate-tuner.html
```

The plate is two things shipped through two different pipes, and this window is
where they are judged together:

- **The grade and the sky matte** are baked into `portfolio/img/plate-*.webp` by
  `build-plate.py` — exposure, saturation, contrast, the highlight shoulder, the
  two colours black and white land on, grain, and (when the script is the one
  cutting) the numbers that decide what counts as sky. Nothing in a browser can
  change that file, so the tuner runs the script's pipeline again in a canvas over
  `plate-source.webp` (which the script writes for the purpose) and prints a block
  of Python to paste back.
  **A change here does not reach the site until `build-plate.py` runs again.**
- **The placement** — `--plate-opacity`, `--plate-w`, `--plate-x`, `--plate-y`,
  `--plate-crop` — is CSS, and is live in the iframe as you drag. That half
  exports as CSS. `--plate-y` may go negative, which hangs the plate past the
  fold into the second screen rather than clipping it there; `--plate-crop`
  then cuts the foot off the picture, as a share of `--plate-w` so the same
  slice goes at every window size.

Notes, mostly the same shape as the type tuner's:

- The defaults are read, never written down. The grade's come from
  `plate-source.json`, which `build-plate.py` writes in the same run as the
  image; the placement's are probed off the live page. So there is no table here
  to drift out of step with either file, and no drift banner needed.
- `--plate-opacity` is declared twice in `styles.css` — the plate needs more of
  itself on black — so it is held, exported and probed **per theme**, and the
  export puts each half in the right block.
- Three views: on the page (the one that decides anything), the plate alone at
  full strength on the page's own paper (where a lifted black is legible at all),
  and the matte, which lights the knocked-out sky up in orange.
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

1. Point `--serif` (projects) and `--serif-label` / `--serif-body` /
   `--serif-num` / `--serif-lead` (portfolio) at the variant's stacks.
2. **If the face is not a system face, host it first.** A variant renders in the
   lab off `/fonts/fonts.css` or off a Google request the tuner makes; neither is
   true of the deployed site, so promoting one without hosting it sets the whole
   page in Times while still looking right in the lab. Subset it into `/fonts`
   following the recipe in [`../fonts/README.md`](../fonts/README.md), declare
   only the cuts the CSS actually asks for, and add the long-cache header for
   `/fonts/` — `vercel.json` already carries it.
3. Copy that variant's per-element rules into `projects/styles.css` and
   `portfolio/styles.css`, dropping the `:root[data-variant="…"]` prefixes.
4. Bump the `?v=` on both `styles.css` links so cached copies don't survive.
5. Update the `(ships)` entries and the four font-row defaults in
   `type-tuner.html` — the tuner's drift banner will tell you if you forget.
6. Re-run the renderer to confirm the live pages now match the chosen shot.

That is the path `sitka` took, which is why the live sizes are its sizes. Step 2
is the one that was learned the hard way: the tuner exported Vollkorn, Spectral
and Source Serif 4 for `/portfolio`, all three of them faces it was borrowing
from Google, and applying that export alone would have set every word on the page
in generic serif.
