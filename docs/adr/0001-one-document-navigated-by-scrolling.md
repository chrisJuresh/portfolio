# One document, navigated by scrolling

The Portfolio is a single document whose Sections are reached by scrolling, never
by clicking, because the reading experience is meant to be continuous. Each
Section is mounted as it approaches the viewport rather than at load, so a page
carrying several heavy Showcases still costs one Section's decode work at a time.

## Considered Options

A document per Showcase, stitched together with cross-document View Transitions,
was the alternative. It keeps payload naturally small and each Section trivially
isolated, but it makes continuity contingent on a browser feature not everywhere
yet, and it makes navigation a click.

## Consequences

Deep links are Vercel rewrites onto the same document — `/portfolio/<section>`
serves the Portfolio anchored at that Section — so a link can still be shared
without the site becoming several pages.

**One document does not mean one file.** Every Section's markup, styles and
Content live in that Section's own folder; the Shell holds only mount points.
This is what keeps a Section inside a single context window, which is the
constraint every ticket here is sized against.
