# The Section convention

What a Section folder holds, where its boundaries actually are, and which of them
the build enforces rather than hopes for. **Read this before adding a Section.**

It used to be `stub/NOTES.md`, and the stub was a whole Section that existed only
to make the convention real rather than described — a folder to copy, and
something for `scripts/check-source.mjs` to pass against. It was written to be
deleted by whichever ticket landed the Section that made it redundant, which is
#175: with three Sections on the page there are two real ones a selector could
try to reach out of, and the argument for a fourth that draws nothing was
finished. The convention outlived it and lives here.

A Section is defined in `CONTEXT.md`: *one self-contained part of the Portfolio's
scroll, owning its own markup, styles, Tokens, Content, Timeline and assets. A
Section may read the Kernel and nothing else.*

## The folder, file by file

Every Section holds exactly these, and `check-source.mjs` fails the build if one
is missing.

| file           | what it is                                                          |
| -------------- | ------------------------------------------------------------------- |
| `<Name>.astro` | the component: markup, and the scoped `<style>` that is the Section's own rules |
| `content.ts`   | the words and the list of assets, typed by a schema declared beside them |
| `tokens.css`   | the Section's named numbers and colours, as plain custom properties  |
| `timeline.ts`  | the Section's motion, as one named seekable object                   |
| `variants.css` | complete alternative directions, selected by attribute, shipped never |
| `assets/`      | the Section's own files, and nothing another Section reads           |
| `NOTES.md`     | the reasoning that would otherwise be a comment                      |

The component is named for the Section rather than called `index.astro`, so a
grep for `EaterMap` finds the Section and a stack trace names it. Exactly one
`.astro` file per folder, which the build also checks.

**A Section with no motion still holds a `timeline.ts`**, and the file is not
ceremony: `src/kernel/loader.ts` globs `sections/*/timeline.ts` to discover the
Sections, so the module is what makes the Section a chunk fetched on approach.
The loader's own type says the default export is optional — the Section mounts
and registers no Timeline. `src/sections/eater-map/timeline.ts` is that case
written out.

## Where the boundary actually is

Three separate mechanisms, and it is worth being clear which does what, because
only one of them is the compiler.

**The rules** are in the component's `<style>`, which Astro scopes: every
selector is rewritten with this component's own attribute, so it cannot match an
element in another Section even by accident. This is the mechanism ADR 0002 buys
a build step for.

**The Tokens** are a plain CSS file imported in the frontmatter, which means it
is *not* scoped — Astro's compiler never sees inside a stylesheet. It is safe
because of what it is allowed to contain, and that is enforced rather than
trusted: `check-source.mjs` fails the build unless every declaration in
`tokens.css` is a custom property named `--<section>-…` on this Section's own
root class, and nothing else. A rule that could reach another Section is not a
warning here, it is a build failure.

The reason it is not simply moved into the scoped `<style>` block is ADR 0004:
`tokens.css` is the one file the Editor writes, and it has to stay a plain CSS
file the Editor can parse and rewrite without touching a composition.

A consequence worth stating, because it will come up: **a Token cannot vary by
media query.** `check-source.mjs` reads the file as a flat list of rules and
fails on anything outside one, so an `@media` block fails the build. That is
deliberate rather than a limitation of the checker — the Editor writes a value,
not a breakpoint. A Token that genuinely needs to change with the viewport
belongs in the component's scoped `<style>`, where it is a composition decision
and not something to drag. Both Sections that have two regimes do exactly that.

**The Variants** are the other plain CSS file, and they are held to a different
rule, because a Variant that could only restate Tokens would be a set of Tokens
by another name. `variants.css` may declare **anything** — a layout, a surface, a
palette, a motion distance. What keeps it inside the Section is not what it
declares but where it can land, and that is a grammar:

```css
:root[data-variant='points-right'] .eater-map__points { grid-area: 2 / 10 / 3 / 13 }
└──────────── the gate ────────────┘ └──── owned ────┘
```

`check-source.mjs` fails the build unless every selector in the file is the gate,
then a compound this Section owns — `.<section>`, `.<section>__…` or
`[data-<section>-…]` — and then whatever the direction needs. Only the compound
right after the gate is checked, because everything after it is a descendant of
something this Section owns and can match nothing outside it. Sibling combinators
are refused outright for the same reason read the other way: a sibling of a
Section's root is another Section. Custom properties still have to be named
`--<section>-…`, since one that is not inherits down into everything below it.

**`:root` is load-bearing, not a habit** — and so is one line of
`astro.config.mjs`. Astro narrows every compound of a scoped rule, and with the
default strategy that narrowing is a bare attribute selector worth (0,1,0) *per
compound*, so a scoped rule's weight grows with the length of its selector and a
Variant would win or lose depending on how long the composition's selector
happened to be. A two-compound selector was an exact tie, settled by whichever
stylesheet the bundler emitted second. `scopedStyleStrategy: 'where'` wraps the
same narrowing in `:where()`, which selects identically and weighs nothing, so
`:root[data-variant='…']` in front of the same selector outranks it by (0,2,0),
always.

Both halves are checked, and that is the point rather than a detail:
`check-source.mjs` reads `astro.config.mjs` and fails the build if the strategy is
missing or is anything else. This paragraph used to end "change either half and
Variants start losing silently", which is exactly the wish ADR 0006 says to
replace with an assertion — the failure it warns about is a Variant that renders
as though it had not been selected, which nobody would notice.

**Nothing imports `variants.css`.** That is the whole of "a Variant that is not
selected costs the shipped page nothing" — the file is not part of the build, so
the directions in it are not bytes a reader fetches, not selectors the browser
matches, and not in `dist/` at all. Add the import back and `check-source.mjs`
fails the build. What renders them instead is:

```bash
pnpm variants
```

which reads the sheets off disk, injects them into `/portfolio` before the page's
own scripts run, and assembles `design/sheets/index.html` — every Variant of
every Section, in both themes, captioned with what it declares.
`docs/agents/variants.md` is the authority on that tool and on writing a Variant.

A Variant is judged and then **kept**, whichever way the judgement went. The
losers are the record of what was compared, which is why a Section's sheet grows
rather than being edited down to the winner.

**A Variant may not centre a Section vertically, and the reason is what the sheet
shoots.** The sheet takes the FIRST SCREEN of the Section — what a reader
arriving at it sees — so `align-items: center` on a Section taller than one
screen centres the composition in the whole box and out of the frame, and the
picture comes back as empty paper. That has happened once, and the sheet was
right.

**The imports** are checked too: a Section may import from its own folder and
from `src/kernel/`, and nothing else. That is CONTEXT.md's "a Section may read
the Kernel and nothing else", made mechanical. `gsap` and `astro` are allowed
because they are the runtime, not another Section.

## The Timeline runs from the settled state

`timeline.ts` animates *away* from how the markup reads, never towards it. So the
module never arriving — a dead network, a parse error, scripting off — costs the
motion and nothing else. Nothing in a Section may be the only thing standing
between the reader and the words.

That is also why there is no `opacity: 0` in a Section's styles. The obvious way
to write a reveal is to hide the content in CSS and let the Timeline uncover it,
and it is wrong here for that reason.

Two things a Check has to know about a Timeline are in `src/kernel/NOTES.md`:
**`hold()` before you seek it**, and **one mount point per Section**. Each has
already cost a wrong diagnosis.

## Tokens a Timeline reads

A Token is usually a CSS value, and the one case where it is not is a distance a
Timeline moves through. It still belongs in `tokens.css`, and the Editor draws it
a control like any other (#144).

**Whether dragging it moves the page is the Section's own doing rather than the
Editor's.** A Token read inside a function-based tween value is evaluated when
the tween initialises — so the number is taken once, at mount, and the Editor's
live preview has nothing left to reach; a reload is needed to see it. The Front
Screen reads its own feel Tokens once per GESTURE for exactly this reason, and
they do move under a drag. A Section that wants its motion Tokens draggable reads
them where the motion is computed.
