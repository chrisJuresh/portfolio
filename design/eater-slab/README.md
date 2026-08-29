# design/eater-slab/ — the Eater Map Showcase's Slab

One still of the Eater map over central London, with the rail network drawn on it
and **none of the app's interface on top**, at a phone viewport. That is a
**Slab**: the captured plane an Exploded View is built on (`CONTEXT.md`), and the
Eater Map Section's three **Cards** are raised off it.

```bash
node design/eater-slab/capture-slab.mjs
```

That writes `portfolio/img/eater/slab.png` for the default restaurant. Everything
else is a flag:

```bash
node design/eater-slab/capture-slab.mjs --restaurant "St. John Marylebone"
```

```bash
node design/eater-slab/capture-slab.mjs --centre 51.51340,-0.13125 --zoom 16
```

`--out` writes somewhere else, `--checkout` points at a different Eater tree, and
`--help` prints the lot.

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
| `centre` | an explicit `{ lat, lon }`, instead of that restaurant's own coordinates. `null` derives it |
| `zoom` | the camera's zoom. This is a default rather than something derived — coordinates cannot imply a scale |
| `viewport` | the phone the app is driven at, and the pixel ratio the still is taken at. Anything under Eater's own 820px breakpoint gets its phone layout |
| `capture.container` | the element the still is cut from — Eater's map section |
| `capture.keep` | what is allowed to be visible inside it: the map's own canvases |
| `capture.strip` | the CSS that hides everything else |
| `capture.settleMs`, `stableProbes`, `stableGapMs` | how long the map gets to arrive, and how the run decides it has stopped moving |
| `output` | where the still is written, relative to the repository root |

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

## What is stripped, and what is not

`capture.strip` hides the search bar, the zoom and location controls, the price
filter, the roadmap menu, the lines popup, the detail panel, the attribution and
the install prompt. `capture.keep` names what is left: Eater's MapLibre canvas and
the canvas its restaurant markers are drawn on.

**The markers stay.** They are Eater's data drawn into the map rather than
interface laid over it, and a transit map with no restaurants on it is not the
Eater map. The Section's three Cards are the interface, and they are drawn by the
page rather than captured (#171).

## The two things it refuses on rather than getting wrong

A generator that quietly produces the wrong thing looks exactly like one that
succeeded, so both of the ways this could do that are checked before a file is
written, and both have been made to fire on purpose.

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

## No test, and why

The Agent Contract's rule is that where there is no seam there is no test, and the
spec says so. This has none worth building: its failures are immediate and loud,
and a fixture for a headless browser driving another repository's dev server costs
more than the failures do (#171). The decisions in it are exported — `parseArgs`,
`findRestaurant`, `viewHash`, `parseViewHash`, `cameraMatches`, `resolveCheckout` —
so that stops being true the day this moves under `scripts/`, where `pnpm test`'s
glob would reach it.

## Not a Bake, and what promoting it would cost

A Bake's cost over a script is the Editor plumbing, and the author has said they
do not need to re-capture without an agent (#171). Promoting it later is moving
this folder under `design/bake/` and adding a `recipe.json` — which is why the
parameters are already declared as data rather than written into the script.

## The format

PNG, because that is what a browser screenshot is. Turning it into something a
reader should be sent — a WebP, or a `<picture>` ladder like the corner pictures'
— belongs to the ticket that puts the Slab on the page (#176), not to the capture.
