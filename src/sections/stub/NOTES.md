# The stub Section

Not a part of the Portfolio. It exists so the Section folder convention is real
rather than described — an agent building the first actual Section copies this
folder and replaces its contents, and the guard in `scripts/check-source.mjs`
already has something to pass against.

It is deleted by whichever ticket lands the second real Section, not before: with
one real Section on the page there is nothing to prove that a selector cannot
reach out of one, and this is the thing it cannot reach.

## The folder, file by file

Every Section holds exactly these, and `check-source.mjs` fails the build if one
is missing.

| file          | what it is                                                          |
| ------------- | ------------------------------------------------------------------- |
| `Stub.astro`  | the component: markup, and the scoped `<style>` that is the Section's own rules |
| `content.ts`  | the words and the list of assets, typed by a schema declared beside them |
| `tokens.css`  | the Section's named numbers and colours, as plain custom properties  |
| `timeline.ts` | the Section's motion, as one named seekable object                   |
| `variants.css`| complete alternative directions, selected by attribute, shipped never |
| `assets/`     | the Section's own files, and nothing another Section reads           |
| `NOTES.md`    | this — the reasoning that used to be a comment                       |

The component is named for the Section rather than called `index.astro`, so a
grep for `Stub` finds the Section and a stack trace names it.

## Where the boundary actually is

Three separate mechanisms, and it is worth being clear which does what, because
only two of them are the compiler.

**The rules** are in the component's `<style>`, which Astro scopes: every
selector is rewritten with this component's own attribute, so it cannot match an
element in another Section even by accident. This is the mechanism ADR 0002 buys
a build step for.

**The Tokens** are a plain CSS file imported in the frontmatter, which means it
is *not* scoped — Astro's compiler never sees inside a stylesheet. It is safe
because of what it is allowed to contain, and that is enforced rather than
trusted: `check-source.mjs` fails the build unless every declaration in
`tokens.css` is a custom property named `--stub-…` on this Section's own root
class, `.stub` and nothing else. A rule that could reach another Section is not a
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
and not something to drag.

**The Variants** are the other plain CSS file, and they are held to a different
rule, because a Variant that could only restate Tokens would be a set of Tokens
by another name. `variants.css` may declare **anything** — a layout, a surface, a
palette, a motion distance. What keeps it inside the Section is not what it
declares but where it can land, and that is a grammar:

```css
:root[data-variant='split'] .stub__points li { flex: 1 1 0 }
└──────── the gate ────────┘ └── owned ──┘ └ its descendants ┘
```

`check-source.mjs` fails the build unless every selector in the file is the gate,
then a compound this Section owns — `.stub`, `.stub__…` or `[data-stub-…]` — and
then whatever the direction needs. Only the compound right after the gate is
checked, because everything after it is a descendant of something this Section
owns and can match nothing outside it. Sibling combinators are refused outright
for the same reason read the other way: a sibling of a Section's root is another
Section. Custom properties still have to be named `--stub-…`, since one that is
not inherits down into everything below it.

**`:root` is load-bearing, not a habit.** Astro narrows every compound of a
scoped rule, and with the default strategy that narrowing is a bare attribute
selector worth (0,1,0) *per compound* — so a scoped rule's weight grows with the
length of its selector and a Variant would win or lose depending on how long the
composition's selector happened to be. `.stub__points li` was an exact tie,
settled by whichever stylesheet the bundler emitted second. `astro.config.mjs`
therefore sets `scopedStyleStrategy: 'where'`, which selects identically and
weighs nothing; `:root[data-variant='…']` in front of the same selector then
outranks it by (0,2,0), always. Change either half and Variants start losing
silently.

**Nothing imports `variants.css`.** That is the whole of "a Variant that is not
selected costs the shipped page nothing" — the file is not part of the build, so
the five directions below this one are not bytes a reader fetches, they are not a
selector the browser matches, and they are not in `dist/` at all. Add the import
back and `check-source.mjs` fails the build. What renders them instead is:

```bash
pnpm variants
```

which reads the sheet off disk, injects it into `/next` before the page's own
scripts run, and assembles `design/sheets/index.html` — every Variant of every
Section, in both themes, captioned with what it declares.
`docs/agents/variants.md` is the authority on that tool and on writing a Variant.

A Variant is judged and then **kept**, whichever way the judgement went. The
losers are the record of what was compared, which is why there are five in
`variants.css` and one direction in `tokens.css`.

**The imports** are checked too: a Section may import from its own folder and
from `src/kernel/`, and nothing else. That is CONTEXT.md's "a Section may read
the Kernel and nothing else", made mechanical.

## The Timeline runs from the settled state

`timeline.ts` animates *away* from how the markup reads, never towards it. So the
module never arriving — a dead network, a parse error, scripting off — costs the
motion and nothing else. Nothing in a Section may be the only thing standing
between the reader and the words.

That is also why there is no `opacity: 0` anywhere in the component's styles. The
obvious way to write a reveal is to hide the content in CSS and let the Timeline
uncover it, and it is wrong here for the same reason.

## Tokens that are not used yet

`--stub-rise` is read by `timeline.ts` rather than by the stylesheet, which is
the one case where a Token is not a CSS value: it is the distance the motion
covers, and the Editor is meant to be able to drag it. A Token read only by a
Timeline still belongs in `tokens.css`.
