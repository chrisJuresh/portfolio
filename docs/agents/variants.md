# Variants, and the sheet

**Variant** — one of several complete alternative directions for a Section, all
present in the source at once, selected by attribute so they can be rendered side
by side and chosen by eye. The losers stay as the record of what was judged.
(`CONTEXT.md`.)

This is the authority on writing one and on the tool that renders them. It is
short because the two mechanisms are small; what is long is the reasoning for the
three things in them that are decisions.

## Writing one

A Section's Variants live in its own `variants.css`, one file per Section, any
number of Variants in it. Every selector reads:

```css
:root[data-variant='quiet'] .eater-map__points li { row-gap: 0 }
└──────── the gate ────────┘ └───── owned ─────┘ └ descendants ┘
```

- **the gate** — `:root[data-variant='<name>']`, exactly. Lower case, digits and
  dashes in the name.
- **owned** — the compound straight after the gate must be the Section's:
  `.<section>`, `.<section>__…`, or `[data-<section>-…]`.
- **after that** — anything. `li`, `:first-child`, `> .eater-map__slab`. It is all
  a descendant of something the Section owns, so it can match nothing outside it.
- **no sibling combinator** anywhere. A sibling of a Section's root is another
  Section.
- **declare anything** — layout, palette, surface, a motion distance. Custom
  properties are the one exception: they inherit, so they have to be named
  `--<section>-…`.
- **no at-rules.** The file is a flat list of rules. A Variant is a direction, not
  something that arrives at a width; a direction that only holds on one viewport
  is two Variants.

`scripts/check-source.mjs` is all of that as a build failure, and `pnpm
check:sections` is it on its own. It and the render tool read the file through one
parser, `scripts/variant-sheet.mjs` — they have to agree about what is in it, and
once did not: a Variant reached only by the second half of a selector *list*
passed every Check and was never rendered.

## Rendering them

```bash
pnpm build          # once — the sheet is rendered against dist/
pnpm variants       # every Variant of every Section, both themes, one sheet
```

Then open `design/sheets/index.html`. Under each picture is what that Variant
declares and nothing else, so the choice is made there rather than in the files.
`unselected` is what `tokens.css` says on its own, and it is in every strip because
it is the thing each Variant is an argument against. A card marked *identical* came
back byte-for-byte the same as it — the honest answer for a Variant that only
exists in motion, and the cue to pass `--progress`.

```bash
pnpm variants -- --sections eater-map --variants points-right,quiet
pnpm variants -- --progress 0,0.5,1     # a Variant that is only visible in motion
pnpm variants -- --turn 1               # past the Kernel's crossing into dark
pnpm variants -- --viewports desktop,tablet,mobile --format jpeg
pnpm variants -- --full                 # the whole Section, not its first screen
```

`--format jpeg` is a fifth of the bytes and worth it past about a dozen shots:
the Effect Stack's grain and halftone are noise by construction, so a screen of
near-blank paper is over a megabyte of PNG. It smears the grain, which is the one
thing on the page nobody chooses a Variant on.

## The three things that are decisions

**`:root` is what makes a Variant win.** Astro narrows every compound of a scoped
rule, and its default strategy narrows with a bare attribute selector worth
(0,1,0) *per compound* — so a scoped rule's weight grows with the length of its
selector, and a Variant, which is one fixed gate in front of the same selector,
wins or loses depending on how many compounds the composition happened to write.
A two-compound selector was an exact tie, settled by whichever stylesheet the
bundler emitted second. So `astro.config.mjs` sets `scopedStyleStrategy: 'where'`, which
selects identically and weighs nothing, and the gate then outranks the
composition by (0,2,0) in every case.

Both halves are load-bearing, so both are checked — `check-source.mjs` reads
`astro.config.mjs` and fails the build if the strategy is missing or changed. It
has to be a Check rather than a note: the regression is a Variant that renders as
though it had not been selected, and nothing else about the page looks wrong.

**Nothing imports `variants.css`.** That is the whole of an unselected Variant
costing the shipped page nothing: the file is not in the build, so rejected
directions are not bytes a reader fetches, not selectors a browser matches, and
not in `dist/`. The render tool reads the file off disk and injects it as a
`<style>` written before any of the page's own scripts run — a `<link>` would
still be in flight when a Section's Timeline reads its Tokens with
`getComputedStyle`, which would hand it the shipped value under a Variant's name.
`check-source.mjs` fails the build if an import is ever added back.

**The sheet shoots the first screen of a Section, held at a moment.** A Section
can be taller than a screen — one whose Timeline is scrubbed by its own scroll has
to be — so the shot is the Section's top at the top of the window, which is what a
reader arriving at it sees. Two consequences:

- A Variant that centres anything *vertically* centres it in that whole box and
  out of the frame. The picture comes back as empty paper, and it is right: the
  Variant put the composition off screen. `--full` shoots the element instead.
- The moment is reached by `hold()` and then seeking the Section's Timeline, per
  `src/kernel/NOTES.md`. A bare seek survives about one frame, and that cost a
  wrong diagnosis once already.

## Traps

**`IntersectionObserver` never delivers in the in-app browser pane**, which is
also where `requestAnimationFrame` never ticks: the pane does not run the
rendering steps. A Section mounts on approach, so nothing mounts there and no
Timeline is ever registered. This tool drives real headless Chromium; do not
try to verify a Variant in the preview.

**It serves the `dist/` of the tree it is run from**, which is why it exists
rather than `preview_start` — the in-app preview serves the main checkout, so in
a worktree it reports on `development` while looking like it reports on your
branch. Run `pnpm build` in the same tree first; the tool says so if `dist/` is
missing.

**`design/sheets/` is wiped on every run** and is not committed. It is a picture
of the source it was run against, so a kept copy could only ever be a picture of
a Variant that has since been rewritten, captioned with the declarations it used
to have.

**Playwright resolves from `design/tools/node_modules`**, like every other tool
in that directory, and it is not what `pnpm install` at the root installs:

```bash
cd design/tools && npm ci
```

**From that directory, and `ci` rather than `install`.** `npm --prefix
design/tools install`, run from the repo root, installs the package in the *cwd*
into the prefix — so it adds `"portfolio": "file:../.."` to
`design/tools/package.json` and rewrites the lockfile, two tracked files, as a
side effect of installing Playwright. `npm ci` also refuses to touch either one.

A worktree does not get the directory at all — it is gitignored, so git never puts
it there — and `pnpm variants` says so rather than failing with a bare
`ERR_MODULE_NOT_FOUND`.

**Install it, do not link it.** A junction from a worktree to the main checkout's
copy works and then takes the main checkout down with it: `git worktree remove`
walks the link and deletes the contents of the *target*, leaving the main
checkout's `design/tools/node_modules` an empty directory and every tool in that
folder broken. It has happened. The install is two seconds.

## Not to be confused with

`design/variants.css` and `design/tools/render.mjs` are the *typographic*
comparison this generalises: eight variants of one type stack across the
hand-written `/portfolio`, which was a plain static tree with no Sections in it.
They are kept as the record of how that comparison was judged, and the page they
drove is gone. A Section's Variants are the mechanism that replaced them — the
same idea, no longer only about type, and per Section rather than per site.
