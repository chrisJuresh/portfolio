# design/eater-slab/ — the Eater Map Showcase's Slab

One still of the Eater map over central London, **dark**, with the rail network
drawn on it in its own line colours, the restaurants reading as red across it, and
**none of the app's interface on top**, at a phone viewport. That is a **Slab**:
the captured plane an Exploded View is built on (`CONTEXT.md`), and the Eater Map
Section's three **Cards** are raised off it.

Eater's own map is light. **The dark one is made here, in flight, and nothing in
the Eater checkout is edited** — see **The re-theme** below.

```bash
node design/eater-slab/capture-slab.mjs
```

That writes `portfolio/img/eater/slab.webp` for the default restaurant. Everything
else is a flag:

```bash
node design/eater-slab/capture-slab.mjs --restaurant "St. John Marylebone"
```

```bash
node design/eater-slab/capture-slab.mjs --centre 51.51340,-0.13125 --zoom 16
```

`--out` writes somewhere else — it has to end `.webp`, see **The format** —
`--checkout` points at a different Eater tree, and `--help` prints the lot.

## The one file

**`slab.json` holds every parameter and every default; `capture-slab.mjs` holds
none.** That is the whole reason this is a script rather than a committed picture:
changing the project's example is changing one field there and running the command
again.

| field | what it is |
| --- | --- |
| `eater.checkout` | where the Eater tree is, when it is not the sibling of this repository. `$EATER_CHECKOUT` beats it and `--checkout` beats both |
| `eater.needs` | the paths that have to exist for this to be drivable, each with what it is and how to get it. The run stops on the first pass over this list and names every one that is missing |
| `eater.readyTimeoutMs` | how long its dev server gets to announce a URL. Generous, because vite re-optimises its dependencies on a cold checkout and that alone takes ~25s |
| `restaurant` | which restaurant the Slab is centred on, by name |
| `centre` | an explicit `{ lat, lon }`, instead of that restaurant's own coordinates. `null` derives it. `--restaurant` still beats it — see below |
| `zoom` | the camera's zoom. This is a default rather than something derived — coordinates cannot imply a scale |
| `zoomRange` | the range Eater will actually hold: its offline floor and its ceiling. Outside it the app clamps silently, so a zoom outside it is refused instead |
| `viewport` | the phone the app is driven at, and the pixel ratio the still is taken at. Anything under Eater's own 820px breakpoint gets its phone layout |
| `capture.container` | the element the still is cut from — Eater's map section |
| `capture.keep` | what is allowed to be visible inside it: the map's own canvases |
| `capture.strip` | the CSS that hides everything else |
| `capture.settleMs`, `stableProbes`, `stableGapMs` | how long the map gets to arrive, and how the run decides it has stopped moving |
| `capture.cameraTolerance` | how far the camera Eater settled on may be from the one it was asked for. The precision the deep link is written at, and nothing finer |
| `retheme` | what makes the map dark, and how each rewrite proves it landed. **The re-theme** below |
| `encode.quality` | the WebP quality the still is re-encoded at, 0..1. **The format** below |
| `output` | where the still is written, relative to the repository root |

## Where the centre came from

Three sources, ordinary precedence — flag over file over derivation — and **the
report names the one it used**, because a Slab of the wrong place looks exactly
like a Slab of the right one:

| what you pass | where it points | what it says |
| --- | --- | --- |
| `--centre 51.5,-0.13` | there | `a centre given on the command line` |
| `--restaurant Kiln` | Kiln's own coordinates, **whatever `centre` is pinned to in `slab.json`** | `Kiln — 58 Brewer St…` |
| neither, `centre` pinned | the pinned point | `a centre pinned in slab.json` |
| neither, `centre` null | the default restaurant's coordinates | `Bar Italia — 22 Frith St…` |

`--centre` and `--restaurant` **together** is a refusal rather than a precedence:
both say where to point, so one of them would be ignored in silence. A pinned
`centre` and a `--restaurant` is not that case — the flag is the later word and
wins.

## Why the app is driven offline

Eater picks its basemap off `navigator.onLine`. Online it fetches vector tiles
from the Protomaps API with a key that is CORS-locked to `*.chrisj.uk`, which from
`127.0.0.1` fetches nothing at all. Its **bundled** basemap is already on disk in
the checkout and needs no token, and the app reaches for it the moment the browser
says it is offline — so the capture says so, in an init script.

That is also the honest Slab. The Section's fourth numbered point is that the app
works on the Tube, and this is the map it draws there.

The one thing being offline costs is Eater's `offline` watermark on the map
container, which shows through tiles the bundled basemap does not cover. It is the
app telling the reader about connectivity, so it is interface, and `capture.strip`
takes it off with the rest.

## The re-theme

The Slab is a **dark** map. Eater's own is light, and it is not going dark to suit
a portfolio, so the three things that make it dark are done to the modules Eater's
dev server serves, **on their way to the browser**, from a declaration in
`slab.json`:

| parameter | what it is | shipped at | matches |
| --- | --- | --- | --- |
| `retheme.flavor` | protomaps' flavour, stated at both of Eater's style call sites | `"dark"` | 2 |
| `retheme.drop` | basemap layer ids filtered out at the seam every layer passes through — the shops, the theatres, the door numbers | `["pois", "address_label"]` | 1 |
| `retheme.markerOpacity` | the flat opacity the restaurant markers composite at. Eater's own `0.42` reads maroon on a dark ground | `0.82` | 1 |

### Why it lives here and not in the Eater checkout

Because the dark map is **this page's** requirement and not Eater's. That checkout
is another repository, its app is light, and it has no reason to grow a theme
nobody there asked for. The three ways of doing it there are all worse: a commit
is a change to somebody else's product to suit a screenshot, an uncommitted edit is
a working tree that quietly stops matching its own origin, and a stash is a thing
somebody loses. A rewrite declared in *this* repository, applied by *this* script,
for the length of *one* capture, leaves the checkout exactly as it found it —
and the declaration is then a thing a reader of this folder can see, which an edit
over there would not be.

It also keeps the pair's promise: **every number is in `slab.json` and none is in
the script.** Making the map dark is editing a field here, as changing the
restaurant already was.

### Reversing it

Set `flavor` back to `"light"`, `drop` to `[]` and `markerOpacity` to `null`, and
the run reproduces the Slab that shipped before #188. That is stronger than the
rewrites happening to be no-ops: a parameter still holding Eater's own value —
each rewrite's `default` — is **not planned at all**, so no route is registered
and Playwright never stands between vite and the page. Turning one off is writing
`null`, not deleting the line; a deleted line is indistinguishable from a
misspelled `parameter`, and one of the two has to be a refusal.

### How each rewrite is declared

Each entry in `retheme.rewrites` says which `parameter` it carries, what it `is`,
which `module` URLs it claims, what to `find` there (always global), what to
`replace` it with — `{value}` is where the parameter goes — and **`expect`, how
many times it must match**. A value is rendered for the JavaScript it is pasted
into: a word as itself, a number as itself, a list as an alternation, so `drop`
arrives as `pois|address_label` inside Eater's own layer filter.

**The whole entry is read before a dev server is started**, and a field that is
missing, mistyped or not a regular expression is a refusal naming the rewrite and
the field — in a second, rather than three minutes in behind a boot and a page
load. One of those checks is not about shape: **a `replace` with no `{value}` in
it is refused**, because it would fire, make its declared number of substitutions
and pass the audit while the parameter reached nothing. That is a light Slab
under a dark declaration with every count agreeing, arriving through the
declaration itself.

`retheme.mjs` holds the decisions — plan, rewrite, audit, and the two sentences
the run says about them — as pure functions, and `retheme.test.mjs` beside it is
what `pnpm test` runs. `capture-slab.mjs` keeps the file, the socket and the
browser, and none of the decisions.

## What is stripped, and what is not

`capture.strip` hides the search bar, the zoom and location controls, the price
filter, the roadmap menu, the lines popup, the detail panel, the attribution and
the install prompt. `capture.keep` names what is left: Eater's MapLibre canvas and
the canvas its restaurant markers are drawn on.

**The markers stay.** They are Eater's data drawn into the map rather than
interface laid over it, and a transit map with no restaurants on it is not the
Eater map. They composite a good deal more opaquely than Eater draws them, because
Eater's `0.42` is tuned against a light ground and reads maroon on this one —
`retheme.markerOpacity` above. The Section's three Cards are the interface, and
they are drawn by the page rather than captured (#171).

**The shops, the theatres and the door numbers go**, and they go through the
basemap rather than through `strip`: they are layers in the map, not elements over
it, so `retheme.drop` takes them out at the seam every basemap layer passes
through. What is left is the thing the project is about — the restaurants and the
rail network.

## The three things it refuses on rather than getting wrong

A generator that quietly produces the wrong thing looks exactly like one that
succeeded, so every way this could do that is checked before a file is written,
and each has been made to fire on purpose.

**The re-theme might not have taken.** Eater renames a function, protomaps moves a
call site, Svelte's compiler stops emitting the constant the way it does today —
and the run then writes a perfectly clean, perfectly aimed, perfectly still
**light** Slab, which is indistinguishable from the right one until somebody opens
it. So each rewrite declares its `expect`, every fetch of a module it claims has
to make exactly that many substitutions, and a rewrite that was **never served a
module at all** is its own refusal rather than a vacuous pass. The count is
per-fetch and not a total: vite re-serves a module on an HMR round trip, and a
total would let one good fetch cover for a bad one.

**The interface might not actually be gone.** `strip` and `keep` have to agree,
and a selector that quietly stops matching — Eater renames a class, Svelte moves a
wrapper — would put a search bar back on the Slab with nothing failing. So the
page is *asked* what is still visible after the CSS is applied, and anything
outside `keep` stops the run. With `strip` emptied it names 24 things.

**The camera might not be where it was asked to be.** It is handed over as Eater's
own deep link, `#zoom/lat/lon`, which the app parses with a strict regex and drops
on the floor when it does not match — and what it falls back to is the whole of
London, which is a perfectly ordinary-looking picture of the wrong place. Eater
writes the camera it settled on back into the URL, so the hash afterwards is the
app's own account of where it is pointing, and it has to be the one that was
asked for. With the hash deliberately malformed it reports the zoom-8 fallback and
refuses.

Beside those: an unknown restaurant, an ambiguous one (`Brat` is three, and a
first-past-the-post would silently pick one), a missing or uninstalled checkout, a
zoom outside the range Eater would clamp to, and an unrecognised flag are all
refusals with a non-zero exit.

## One test, and why only one

The Agent Contract's rule is that where there is no seam there is no test, and the
spec says so. **`retheme.mjs` is a seam and `retheme.test.mjs` is its test**, run
by `pnpm test` like every other pure function here — the glob already reaches
`design/**/*.test.mjs`, which is what `design/eater-cards/compare.test.mjs` is
under too.

It earns one where the rest of this folder does not, and the difference is worth
stating rather than being read as inconsistency. **Every other failure in here is
immediate and loud**: a missing checkout, a dev server that will not start, a
camera the app dropped on the floor, a search bar still on the map. The re-theme's
is neither. It writes a file that opens, is the right size, is of the right place,
and is the wrong colour — and it fails that way not when this repository changes
but when *another one* does, on a run nobody is watching for it. So the decision
about whether a rewrite landed is a pure function with a text fixture, and the
test drives every way it can go wrong on purpose: a rewrite applied, a count that
does not agree, a source with nothing in it to match, a module never served, a
module served twice where only one fetch is bad, and each field a rewrite can
declare wrongly.

The Agent Contract names it as the second of `design/`'s two seams, beside
`design/eater-cards/compare.mjs`, and says what they have in common — both decide
something whose failure would be **silent**, and both fail when a repository that
is not this one moves.

**The capture around it still has no test**, and that is still deliberate: a
fixture for a headless browser driving another repository's dev server costs more
than the failures do (#171). The decisions in it are exported — `parseArgs`,
`findRestaurant`, `viewHash`, `parseViewHash`, `cameraMatches`, `resolveCheckout` —
so a session that wants them covered has somewhere to stand.

## Not a Bake, and what promoting it would cost

A Bake's cost over a script is the Editor plumbing, and the author has said they
do not need to re-capture without an agent (#171). Promoting it later is moving
this folder under `design/bake/` and adding a `recipe.json` — which is why the
parameters are already declared as data rather than written into the script.

## Two runs are not the same bytes

The same command twice writes a file a few kilobytes different. MapLibre places
labels by collision, and which of two competing labels wins depends on the order
the tiles finished decoding — so the map is the same map and the file is not the
same file.

That matters only for git: re-running the capture to check it still works leaves
a megabyte of diff that says nothing. **Look at what changed before committing
it, and `git restore` it when the answer is "the labels moved".**

## The format

**WebP, re-encoded from the PNG the browser handed over.** A browser screenshot is
a PNG and a PNG of a labelled map is about a megabyte; the Slab is on the page now
(#176), so this is a file a reader is sent rather than one an agent opens. The dark
Slab's 754 KB became 198 KB at `encode.quality` 0.9, for a picture nobody can tell
apart at the size it is drawn.

**The encode is a canvas in the same Chromium that took the shot**, rather than
Pillow or sharp. Nothing new has to be installed for a script that already drives
a browser, and the file on disk came out of one encoder rather than two — a
re-capture on a machine with a different libwebp would otherwise be a diff that
says nothing. A browser that cannot encode WebP answers `convertToBlob` with a PNG
and no error, so the blob is asked what it actually is before anything is written.

The stability loop above it still compares **PNG** bytes. It is asking whether the
map has stopped moving, and two encodes of one frame have to be equal for that
question to mean anything.

**The last line of a run is a stamp, and it has to be acted on.**
`/portfolio/img/` is cached by the deployment, so a re-captured Slab that kept its
URL is a Slab nobody is served. Paste it into `VERSION` in
`src/sections/eater-map/slab.ts` — the same arrangement the Projects Panel's
recording has, and for the same reason.

A `<picture>` ladder like the corner pictures' is still not here, and is not
needed while the capture writes one size: the Slab is drawn between 220 and 478
CSS pixels wide across the band, and 786 covers that at two device pixels each.
