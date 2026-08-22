# Astro, and therefore a build step

The Portfolio is built with Astro and TypeScript. This reverses the repository's
previous and loudly stated position that it has no build step and no
dependencies — `design/tools/package.json` and `design/record/.../scroll-peek.ts`
both argue for that position in their own comments, so a reader will rightly
wonder what changed.

What changed is that the site is going from two Sections to seven or eight, and
two mechanisms are worth a build step at that size: **scoped styles**, which turn
"no selector may reach outside its Section" from a rule an author can break into
one the compiler enforces, and **typed Content**, which turns a renamed field
from a blank space on the page into an error before the page is ever served.

## Considered Options

Vite with plain CSS modules gets scoped styles and a dev server without a
component model, but not typed Content or a Section's markup and styles in one
file. Staying dependency-free keeps the property that nothing can break
invisibly, and gives up all three.

## Consequences

Dependencies rot, and this site is edited occasionally over years. So: **every
version is pinned exactly, and nothing is updated on a schedule** — only when
something is actually broken. No CI, no automated dependency updates. A major
version bump is a decision, not a maintenance chore.

`pnpm` is used so the `node_modules` each worktree needs is a hardlink farm
rather than a real install.
