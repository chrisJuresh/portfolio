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
:root[data-variant='split'] .stub__points li { flex: 1 1 0 }
└──────── the gate ────────┘ └── owned ──┘ └ its descendants ┘
```

- **the gate** — `:root[data-variant='<name>']`, exactly. Lower case, digits and
  dashes in the name.
- **owned** — the compound straight after the gate must be the Section's:
  `.stub`, `.stub__…`, or `[data-stub-…]`.
- **after that** — anything. `li`, `:first-child`, `> .stub__measure`. It is all a
  descendant of something the Section owns, so it can match nothing outside it.
- **no sibling combinator** anywhere. A sibling of a Section's root is another
  Section.
- **declare anything** — layout, palette, surface, a motion distance. Custom
  properties are the one exception: they inherit, so they have to be named
  `--stub-…`.
- **no at-rules.** The file is a flat list of rules. A Variant is a direction, not
  something that arrives at a width; a direction that only holds on one viewport
  is two Variants.

`scripts/check-source.mjs` is all of that as a build failure, and `pnpm
check:sections` is it on its own.

## Rendering them

```bash
pnpm build          # once — the sheet is rendered against dist/
pnpm variants       # every Variant of every Section, both themes, one sheet
```

Then open `design/sheets/index.html`. Under each picture is what that Variant
declares and nothing else, so the choice is made there rather than in the files.
`base` is the direction that ships — `tokens.css`, with no Variant selected — and
it is in every strip, because it is the thing each Variant is an argument against.

```bash
pnpm variants -- --sections stub --variants split,plate
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
`.stub__points li` was an exact tie, settled by whichever stylesheet the bundler
emitted second. So `astro.config.mjs` sets `scopedStyleStrategy: 'where'`, which
selects identically and weighs nothing, and the gate then outranks the
composition by (0,2,0) in every case. **Both halves are load-bearing.** Change
either and Variants start losing silently, which reads as a Variant that "did not
apply".

**Nothing imports `variants.css`.** That is the whole of an unselected Variant
costing the shipped page nothing: the file is not in the build, so rejected
directions are not bytes a reader fetches, not selectors a browser matches, and
not in `dist/`. The render tool reads the file off disk and injects it as a
`<style>` written before any of the page's own scripts run — a `<link>` would
still be in flight when a Section's Timeline reads its Tokens with
`getComputedStyle`, which would hand it the shipped value under a Variant's name.
`check-source.mjs` fails the build if an import is ever added back.

**The sheet shoots the first screen of a Section, held at a moment.** A Section is
taller than a screen — the stub is 240svh, because its Timeline is scrubbed by its
own scroll — so the shot is the Section's top at the top of the window, which is
what a reader arriving at it sees. Two consequences:

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
npm --prefix design/tools install
```

A worktree does not get it at all — the directory is gitignored — so a fresh one
needs either that install or a junction to the main checkout's copy.

## Not to be confused with

`design/variants.css` and `design/tools/render.mjs` are the *typographic*
comparison this generalises, and they are still there and still work: eight
variants of one type stack across `/portfolio`, which is a plain static tree with
no Sections in it. They are kept as the comparison was judged. A Section's
Variants are the mechanism that replaces them once `/next` replaces
`/portfolio` — the same idea, no longer only about type, and per Section rather
than per site.
