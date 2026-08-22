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
| `variants.css`| complete alternative directions, selected by attribute               |
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

**The Tokens and the Variants** are plain CSS files imported in the frontmatter,
which means they are *not* scoped — Astro's compiler never sees inside them.
They are safe because of what they are allowed to contain, and that is enforced
rather than trusted: `check-source.mjs` fails the build unless every declaration
in `tokens.css` and `variants.css` is a custom property named `--stub-…` on a
selector ending in this Section's own root class. A rule that could reach another
Section is not a warning here, it is a build failure.

The reason they are not simply moved into the scoped `<style>` block is ADR 0004:
`tokens.css` is the one file the Editor writes, and it has to stay a plain CSS
file the Editor can parse and rewrite without touching a composition.

A consequence worth stating, because it will come up: **a Token cannot vary by
media query.** `check-source.mjs` reads these two files as a flat list of rules,
so an `@media` block in either fails the build. That is deliberate rather than a
limitation of the checker — the Editor writes a value, not a breakpoint. A Token
that genuinely needs to change with the viewport belongs in the component's scoped
`<style>`, where it is a composition decision and not something to drag.

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
