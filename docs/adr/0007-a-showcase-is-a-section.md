# A Showcase is a Section, and the Rail is a table of contents

Every project the Rail names gets its own Section, with its own composition,
reached by scrolling. The Rail never swaps a composition in place — it links to
Sections, and an entry with no link is a Section that does not exist yet.

This needs writing down because the Rail reads as the opposite. It marks one
entry selected and two as not yet built, which is exactly how a control that will
one day switch a Showcase's contents would look, and a reader arriving at
`src/kernel/rail/content.ts` will reasonably assume that is what it is for. #192
sharpened the confusion rather than settling it: the Rail is now one element
standing on the page, pinned to the window, with the current entry derived from
the Section at rest — which is precisely what a selector would look like. It is
not one. What changes when the highlight moves is which Section the reader is
standing in front of, and the Section is what the composition is.

## Considered Options

**The Rail as a selector**, with one composition and a data set per project, is
the cheaper reading and the one the markup suggests. It was rejected because
`CONTEXT.md` defines a Showcase as a composition built for that project *alone*,
and the two that exist are not interchangeable in any degree: the Projects Panel
is a browser Frame with a glass Lens standing on a rendered marble Plinth, built
around a screen recording; the Eater Map is an Exploded View, a captured Slab with
its Cards raised off it. There is no data that turns one into the other. A
selector would be a promise the compositions cannot keep.

**A document per Showcase** is already refused by ADR 0001, and nothing here
reopens it.

## Consequences

A project is "built" precisely when it has a Section, so the missing `href` is
not a placeholder for a feature — it is the whole of the mechanism, and it stays
that way.

Each Showcase adds a resting place to the page turn. That is affordable because
`page-turn.ts` reads its ports off the cascade and has always generalised to any
number of them, and because ADR 0001 mounts a Section as it approaches rather
than at load, so a page carrying several Showcases still costs one Section's
decode at a time.

It does **not** follow that each new Section joins the landing measure. The Front
Screen and the Projects Panel agree about one width because a Cut Title has to
land in a masthead's slot; `src/kernel/NOTES.md` says a third Section wanting to
join that list is a decision rather than a convenience, and this ADR is not that
decision.

The Rail's own contents become a maintenance obligation rather than a display:
adding a Showcase means giving its entry a link in the same change, and the
`deep-links` Check already fails a build whose Section has no working URL. Since
#192 there is exactly one place to do it — `src/kernel/rail/content.ts` — where
there were one per Section, and the `rail` Check fails a document carrying a
second Rail.
