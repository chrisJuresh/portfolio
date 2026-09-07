# A project without a Showcase is a Catalogue Entry

The Rail's third entry used to promise a Record Engine Showcase — "no page yet" —
and the fourth Section was going to be it. It is not. The fourth Section is the
Catalogue: one composition presenting many projects briefly, an Entry each, and a
project that does not get a Showcase of its own gets an Entry in it. The Record
Engine is the first.

This needed deciding rather than doing because ADR 0007 reads the other way. It
says every project the Rail names gets its own Section, and that an unlinked entry
is a Section that does not exist yet. That is still true of a Showcase, and it is
not how most projects will reach the page: there are two Showcases and there will
not be twenty, and there are a dozen projects worth a picture and a paragraph.

## Considered Options

**A Showcase per project**, ADR 0007 read literally. Rejected because a Showcase
is a composition built for one project alone — a Frame on a Plinth, an Exploded
View — and costs a Section-sized build each; the Rail would carry a column of "no
page yet" for years, and most of the projects it named would never earn one.

**A selector inside the Catalogue**, one Entry shown at a time and chosen from a
list. The reading ADR 0007 already rejected for the Rail, rejected here for the
same reason: it makes navigation a click, which ADR 0001 refuses.

**The Catalogue as the Rail's own foot**, the unbuilt entries growing into a list
of small projects in the margin. That puts a composition inside the Kernel's
furniture, which holds none, and a Still has nowhere to stand in a margin one
rotated line wide.

## Consequences

The Rail names each Showcase and the Catalogue, so its third entry is a link and
nothing on it is unbuilt today. The mechanism for an unbuilt entry stays exactly as
it was: a Showcase promised and not yet built is a name with no `href`, and the
`rail` Check reads its clipped span whenever one exists — and notes, rather than
fails, when none does.

The Catalogue is the last Section and taller than a screen, which the Kernel
already provides for and nothing here had to add: its top is the page turn's last
resting place, the rest of it is a scroll the browser owns, and a Section added
after it takes that role over. A Check that took "the last port" to be a particular
Section's was wrong the day this landed, and `eater-map` was that Check; it finds
its own Section's port now.

A project moves from the Catalogue to a Showcase by getting a Section and a Rail
entry, and its Entry comes out of the Catalogue in the same change. The Record
Engine is the obvious first candidate, and its Entry is where it waits.
