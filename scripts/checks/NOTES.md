# The Checks

The seam every later Section is verified through. One command builds this tree,
serves it, drives headless Chromium, and asserts what a reader would experience.

```bash
pnpm check
```

```bash
pnpm check -- --no-build --only ground,moments
```

Exit 0 is a pass, 1 is a broken Check or a broken tree, 2 is a runner that could
not start. `--no-build` runs against the `dist/` that is already there, which is
for iterating and nothing else — a Check reporting on a stale build is the one
failure this suite cannot catch about itself.

**On a fresh clone, download the browser once.** `pnpm install` does not: the
`playwright` package carries the driver and not the binaries, and pnpm blocks
install scripts anyway.

```bash
pnpm exec playwright install chromium
```

The runner says so itself rather than throwing about a missing executable, but
that is one wasted run.

## What a Check is, and what it may never be

**A headless assertion about a Section that a person would not notice failing.**
That is CONTEXT.md's definition, and both halves are load-bearing. Something a
person would notice — the page not rendering, a Section missing — needs no Check,
because the author is looking at the running site. What a person does not notice
is a face silently falling back, a 404 on a rung nothing draws yet, a console
error nobody has devtools open for, dark theme drifting light, a Timeline that
stopped moving anything.

**Checks block, they do not warn** (ADR 0006). An advisory check inside an agent
loop is one that gets read and stepped over. The price of blocking is that a false
positive costs the author a prompt — the one cost this whole project exists to
reduce — so the suite stays small and asserts only what a legitimate change cannot
trip.

**No Check asserts that anything looks good.** Taste is the author's, exercised
through Variants and the Editor. A Check measuring a gap, a size, a weight or a
colour against a number somebody chose would fail the next time that number was
chosen differently, which is the activity this repository exists to make cheap. So:

| assert                                       | do not assert                          |
| -------------------------------------------- | -------------------------------------- |
| the ground is light in light theme            | the ground is `#ffffff`                |
| a Timeline moves the element it names         | it moves it 8px                        |
| every declared face loads                     | the masthead is set in Spectral        |
| a Section's words contain no ticket key       | a Section's words read well            |

The bands in `checks/ground.mjs` are wide for this reason, and the measured
numbers are printed on a passing run so a deliberate drift is still visible.

## It serves the tree it was invoked from

`preview_start` serves the main checkout. In a worktree it therefore reports on
`development` while looking like it reported on the branch, and it says nothing
about which — so it is never how a Check is run. `lib/serve.mjs` serves this
directory's `dist/`, on an ephemeral port so two features in flight never collide.

`IntersectionObserver` and `requestAnimationFrame` do not run in the in-app browser
pane at all, which is the other half of the same rule: lazy mounting and motion
cannot be verified there even by hand.

## The six Checks

| Check           | fails when                                                                  |
| --------------- | --------------------------------------------------------------------------- |
| `assets`        | anything the page fetches 404s or never answers, in either theme, with every Effect Stack layer lit |
| `console`       | anything logs an error or a warning, or throws, including across a theme flip |
| `faces`         | a declared `@font-face` will not load, or no face Token names a declared family |
| `ground`        | paper is not light, or the Turn does not arrive dark, in either theme         |
| `moments`       | a Timeline cannot be seeked, does not survive a scroll, moves nothing, or will not release |
| `unpublishable` | a Section's words or its spoken attributes match the denylist                 |

## What a pass does not mean

Three boundaries, stated because a green run is otherwise read as more than it is.
None is a gap to be closed casually — each would cost more machinery than the
failure it would catch.

**`assets` covers what the page fetched, not every file it names.** A rung of a
corner picture that exists in the tree and is not asked for at this viewport and
this pixel ratio is not checked. Widening it means walking the CSS for `url()`s or
rendering the whole rung grid; a missing rung surfaces the moment a display asks
for it, and `assets` catches it then.

**`moments` reads the first element behind each mark.** A Section that marks six
elements and wires up only the first still satisfies "something moves". What this
catches is a Timeline wired to nothing at all — the failure the author would not
see. Partial wiring is one they would.

**`unpublishable` reads Sections, not the whole document.** Text outside every
`[data-section]` is not scanned, which is deliberate: the Shell holds no
composition and the words that come from Content are inside a Section. A leak in
the Shell's own head is a different thing and has no Check.

## Adding one

A Check is a module in `checks/` exporting `{ name, title, run(ctx) }`. `run`
gets `{ browser, origin, repoRoot, dist }` and returns either an array of failure
strings or `{ failures, notes }`. Register it in the `CHECKS` array in `run.mjs`.

Open the page through `lib/page.mjs` — it records every response, console message
and uncaught throw for you, and `settle()` scrolls the document so every Section
has actually mounted. **A Check that reads the page without settling it reads a
document with no Sections in it**, and every Section-shaped assertion then passes
vacuously.

Every failure string names the thing that broke: the URL, the family, the
selector, the measured number and the wanted one. "something is wrong" costs a
diagnosis session; "404 for /_astro/vollkorn-regular.Dnyk-4Dy.woff2" costs nothing.

## Six traps, each of which cost a wrong answer here

**`hold()` before you seek, and it is not enough to seek twice.** A scrubbed
Timeline is recomputed from the scroll position, so a bare seek survives about a
frame. But ScrollTrigger recomputes on a **scroll**, not on a frame — so reading
the same moment twice in a row agrees with itself even with `hold()` stubbed out
to do nothing, and the first version of `moments` asserted exactly nothing. The
scroll has to actually move between the two reads.

**Assert the Timeline's progress, not the geometry, when what is being tested is
the hold.** A staggered tween saturates: with six elements at `stagger: 0.05` the
first finishes its own tween at progress 0.8, so a recompute from 1 to 0.857 moves
the Timeline and moves that element not at all. A geometry-only assertion passed a
completely stubbed `hold()`.

**`textContent` glues elements together.** A heading ending in a name and a
paragraph beginning with a capital arrive as one word — `HoldingsA Section` — so a
denylist term sitting at an element boundary is invisible to a whole-word match,
and words that were never on the page are manufactured. `unpublishable` walks the
text nodes and joins them with newlines instead.

**Chromium refuses to fetch from certain ports.** An ephemeral port can land on
one, and the whole suite then fails as `net::ERR_UNSAFE_PORT` — about one run in a
few hundred, with nothing to do with the tree. `lib/serve.mjs` asks for another
port; the list is in it.

**A transparent ground rasterises to black.** A page whose stylesheet never
arrived computes `backgroundColor` to `rgba(0,0,0,0)`, and a 1x1 canvas reads that
back as `#000000` — so "the ground is dark" was satisfied, three times over, by a
ground that was not painted at all. `ground` reads the alpha as well, and an
unpainted ground is its own named failure.

Two more names that are taken and should not be reused: `Check`, which CONTEXT.md
defines and every module in `checks/` exports, and `Record`, which is TypeScript's
own — a local `@typedef Record` shadows `Record<K, V>` for every annotation in the
file that declares it, silently.

## The denylist is shapes, and the names are not committed

`lib/denylist.mjs` holds the patterns a Section's words may not match: a ticket
key, an internal hostname, a private address, a credential, a field name from the
private Career Record, a confidentiality marker. **Shapes and not names, because a
denylist of the actual names would put every one of them in a public repository**,
which is the leak it exists to prevent.

The names — clients, colleagues, hostnames, anything a pattern cannot describe —
go one per line in `lib/denylist.local.txt`, which `.gitignore` keeps out of the
repository. Absent is the ordinary state on a fresh clone and not a failure.

**There is deliberately no pattern for an email address.** A contact address is
legitimate content on a personal portfolio and the Front Screen has a contact
line, so a pattern for one would fire on a change nobody made wrongly. A
colleague's address is caught by the local file, along with their name.

The ticket-key pattern needs two or more digits, so `UTF-8` and `HTTP-2` are not
keys by construction, and carries an allowlist of standards prefixes for the ones
with three — `ISO-8859`, `RFC-2119`, `ADR-0003`. **Add to that allowlist rather
than loosening the pattern**: a blocking Check that fires on ordinary prose is the
one thing this suite may not do.

## The runner's own unit tests

`lib/colour.test.mjs` and `lib/denylist.test.mjs`, run by `pnpm test` and by
`pnpm check` before the browser starts. They are not Checks — nothing in them is
an assertion about a Section — but they run from the same command on purpose,
because the luminance bands and the denylist matching are what several Checks
decide with, and a runner reporting on the page while its own matching is broken
is worse than no runner.
