# The Catalogue

The Portfolio's fourth Section and its last: the other projects, one **Entry**
each, down one centred column. An Entry is a **Still** beside a few words — a
serif title, a small tracked line for the year and the stack, one paragraph, and
where the project lives — and the two alternate sides from one Entry to the next,
with a hairline **spine** down the middle of the column and each Entry's number
standing on that spine above its row. Where a Showcase presents one project in
depth with a composition built for it alone, the Catalogue presents many briefly
with one composition for all of them (`CONTEXT.md`, ADR 0008).

**Everything on it is a placeholder except the first Entry's name.** The Rail
used to promise a Record Engine Showcase as its third entry — "no page yet" — and
this Section is what took that slot, so the Record Engine is Entry 01, described
in the glossary's own words, and the other seven are placeholders whose text says
so. Their titles and notes are different lengths on purpose: a title that wraps,
a note of one sentence and one of four, an Entry with no link. That is what a
placeholder is for — exercising the layout — and every word is Content, changed
in the Editor rather than here.

Read this before changing anything behavioural. A word, a size, a gap or a colour
is a Content or a Token edit and needs none of it.

## The folder

The Section convention is `src/sections/NOTES.md`, and this folder keeps to it
with one thing beyond it: `assets/stills/`, where the Stills go. `Catalogue.astro`
resolves an Entry's `still.file` against that folder at **build** through
`import.meta.glob`, so a name that matches nothing fails `pnpm build` rather than
shipping a 404, and an Entry naming no file is drawn as the placeholder. Nothing
else in the repository knows the folder exists.

## What it is called, and why

**Catalogue** — as in an exhibition's: the printed list of the works, each with a
plate and a caption, numbered. The page's two Showcases are the exhibition — a
Frame on a Plinth, an Exploded View — and this is the book at the back of it. The
metaphor is the page's own and the word is in `CONTEXT.md`.

**Entry**, **Still** — an Entry is one work's record; a Still is one still of a
project's own screen, which is the word the glossary already uses for the picture
a Slab is built on. Not *plate*, which the glossary's Slab entry refuses and which
`src/kernel/corners.css` already spends on a corner picture; not *screenshot*,
*thumbnail* or *card*, each of which the glossary avoids somewhere.

## The composition

**One column, centred on the page.** `--catalogue-measure` caps it and
`margin-inline: auto` centres it. Inside the landing band the Section's padding
is `--landing-side` on both sides — the Rail's column on the left and the same
length again on the right — so the column is centred on the *page* and clears
the Rail without being pushed off centre by it. Outside the band it is the Eater
Map's own two clamps, `--catalogue-side` and `--catalogue-inset`, restated.

**Twelve columns per Entry, and a strict mirror.** The Still takes five columns
and the words the other five, with two columns of air either side of the spine
between them; the next Entry swaps them. Equal widths are what make the
alternation read as a mirror rather than as a picture and its caption changing
places, and the words are capped at `--catalogue-note-measure` inside their five
so a long note stays a paragraph. Which side is which is the row's own
`data-catalogue-side`, written by the component from the list's order, so the
stylesheet, the Timeline and a Variant read one fact instead of each counting.

**The spine is the list's `::before`**, one hairline the height of the list on
its centre line — which is the middle of the twelve columns' sixth gutter, so a
five-column Still on either side stops two columns short of it. It ends in a lit
dot, the `::after`, which is the Eater Map's leaders' full stop borrowed once.
`spineless` in `variants.css` is the composition without it.

**The number stands ON the spine, ABOVE the row, and that is the one piece of
arithmetic here worth keeping.** The obvious place for an Entry's number is beside
its words at the row's top, on the spine — and a station of two figures at
`--catalogue-number-size` is about 1.3rem wide, so its half-width is roughly the
half-gutter a six-column Still would stop short of the spine by. With the Still
on six columns the number's box touched the Still's frame at every window;
insetting the Still by a gutter on its spine side, or shrinking it to five
columns while leaving the words on five, both moved the picture to make room for
a figure. So the row is two grid rows: the station centred across all twelve on
the first, the Still and the words on the second, `--catalogue-close` apart. The
number labels the row from above, the way a numbered plate is labelled, and
nothing in the row has to make room for it. The station paints `var(--ground)`
behind itself with `--catalogue-station-pad` either side, which is what opens the
gap in the spine; it is `position: relative` so it paints in the positioned layer
above the spine's pseudo-element, which precedes it in the tree, and the list
itself is `relative` with no `z-index` so it is not a stacking context and that
order holds.

**The faces are the page's, crossed over.** The head and the titles are set in
`--face-body` — Vollkorn, the paper half's face — on the dark half of the page,
which is what makes the Catalogue read as printed matter rather than as a third
Showcase; the notes and every small tracked line are in `--face-panel`, the dark
half's sans, and the numbers, on the spine and drawn large across a placeholder,
are in `--face-year`, the face the page sets figures in. `--catalogue-accent` is
the Eater Map's warm accent restated by value: the Kernel publishes no accent, and
a second one on the dark half of the page would be a second page. A drift between
the two is something a person would see, so no Check holds it.

**The head is centred, and nothing else on the page is.** The two Showcases stand
PROJECTS at the top left; this is a spine composition, and its opener stands over
the spine. `head-left` in `variants.css` is the other answer, kept for the reason
every loser is.

**Every grey is `--ink` veiled.** `--catalogue-muted-veil`, `-quiet-veil`,
`-rule-veil`, `-frame-veil`, `-fill-veil` and `-ghost-veil` are transparencies on
the page's own ink, so each crosses with the page for nothing — the Eater Map's
idiom, and the rule the Projects Panel's fourteen grounds keep. The Section paints
no ground of its own, for the reason the Eater Map gives: the Turn finished two
Sections above this one and the page's ground is the Kernel's.

## The placeholder, and how a real Still arrives

A placeholder is the Still's box — `aspect-ratio: var(--catalogue-still-ratio)`,
a hairline frame, a fill a few per cent lighter than the ground — with the
Entry's number drawn large and faint across it in `--face-year` and the words
`content.placeholder` says in its corner. It carries `role="img"` and the Entry's
`alt` as its name, so a reader who cannot see it is told the same thing the
picture will say. A real Still is an `<img>` in the same box, `object-fit: cover`,
cropped to the same ratio so every Entry stands the same height beside its words,
and the box's `overflow: clip` — not `hidden`, which is a scroll container — is
what does the cropping.

To add one: cut the picture to `--catalogue-still-ratio` (1.6, or whatever the
Token holds), put it under `assets/stills/`, and name it in the Entry's
`still.file`. The build resolves it and hashes it into `/_astro/`; the placeholder
goes away for that Entry and nothing else changes.

## The two regimes

**At and above 1100px wide, the alternation and the spine.** Gated on the width
alone, as the other Sections' compositions are, so a wide short window — a
maximised browser on a laptop, outside the band — gets the same drawing with the
Section's own margins.

**Below it, one column.** No spine and no alternation: the number left-aligned,
then the Still the width of the column, then the words, in the order the document
already reads — `grid-row: auto` on all three, which is what lets source order
place them. The head and the foot go left too, which is where every other
Section's collapse stands. The Timeline still runs down here; a Still the width
of the column sliding six per cent of itself is a small movement and the Section
clips it.

**Inside the band the Section is the page turn's last resting place, and it is
taller than a screen on purpose.** `src/kernel/landing.css` makes every Section
after the first a port, so the Catalogue's top edge is where the last notch lands;
past it, `src/kernel/page-turn.ts` hands the wheel back to the browser — "there is
a composition to read down there and the turn has already done its job" — and a
mandatory snap relaxes inside a snap area taller than the snapport rather than
pulling the reader back up. The Kernel wrote all of that before this Section
existed, for exactly this shape, and nothing here had to be added to it. What the
Section owes the regime is `min-height: var(--fold)`, so a deep link can bring its
top to the top of the window even on a page with one Entry, and no
`scroll-margin-top`, because there is no masthead here to land on the word's line:
the port is the top edge and the padding above the head is `--landing-inset`, the
page's own top margin in the band.

**A Section added after this one takes that role over.** Its top becomes the last
port, the Catalogue's foot gets a resting place to turn to from inside it, and
nothing here changes — `src/pages/portfolio.astro` says so beside the order.

## PROJECTS does not stand here, and that is a decision

The two Showcases print the Gallery's own masthead in the Gallery's own box so the
word stands still across the turn between them (#191), and #193 is the ticket that
makes it one persistent thing. The Catalogue does not carry it. It is not a
Showcase, its head is centred over a spine rather than standing at the top left,
and a PROJECTS over a Section that is not a project would be a label on the wrong
box. The word therefore goes off the screen on the turn from the Eater Map onto
this Section, and the Rail's highlight moving to the third entry is what says
where the reader is. If #193 pins a persistent PROJECTS to the window as a Kernel
element the way the Rail is pinned, this Section's top-left is empty and the head
is centred, so the two would not collide; whether the word should be *hidden* over
the Catalogue is that ticket's call, and this file is where it will find that the
Section did not want it.

**#193 read that and took the answer.** This Section does not mark itself
`data-landing-word`, which is how the Kernel is told where the hold ends: the
word is held from the Gallery's resting place to the Eater Map's, and past that it
travels up at the document's own rate, so it leaves with the Section it is the
head of and is off the screen before this one comes to rest. Nothing hides it and
nothing has to — it is simply gone, and the Rail's highlight moving to the third
entry is what says where the reader is, exactly as this file asked. A Section that
DID want the word would say so with that attribute and nothing in the Kernel
would learn its name; `src/kernel/hold.ts` is the authority.

## The Timeline

`timeline.ts` is the arrival: as each Entry comes up the screen, its Still slides
in from its own side — a left Still from the left — by `--catalogue-arrive` of its
own width, and its words come up from `--catalogue-arrive-dim` to full ink. One
paused Timeline, scrubbed by one ScrollTrigger spanning the Section from its top
meeting the window's foot to its foot meeting the same edge, so `hold()` freezes it
and a moment can be asked for (ADR 0003). The stylesheet rests every Entry in
place, so a reader with no script, or one who asked for less motion, gets the
finished Catalogue; under `prefers-reduced-motion` nothing is mounted and no
Timeline is registered, because one that scrubbed nothing is the failure the
`moments` Check exists to catch.

**Where each Entry arrives along the playhead is laid out, not chosen.** Progress
is the share of the Section's height that has come up past the foot of the window,
so an Entry whose top stands `t` into a Section `h` tall begins arriving at `t / h`
and has arrived at `(t + 0.25 × screen) / h` — a quarter of a screen of rise. That
constant is what puts every Entry standing above the bottom quarter of the window
at rest by the time the page turn lands on this Section's port, and leaves only
what is still below the fold mid-arrival, which a scrubbed arrival cannot avoid
and a reader cannot see. A ruler tween the whole length of the Timeline keeps its
duration at exactly 1, so progress stays the share of the scroll whatever the last
Entry's arrival ends at. The `immediateRender: false` on each tween is what stops
every Still jumping to its displaced state the moment the Timeline is built; the
trigger's own progress is written to the playhead right after, so the frame the
reader is on is the one drawn.

**Read once at mount, and that is the trade.** The Entries' positions and the two
Tokens the motion spends are read when the Section mounts, so a resize that moves
an Entry, or a drag of either Token in the Editor, shows on the next reload. The
Stills are boxes of a stated shape rather than pictures that arrive late, so the
layout does not move after mount and the positions stay right; re-laying them out
on `refresh` is a small ticket if a window that resizes across the band ever
matters.

## What the Checks hold, and what is deliberately not asserted

Nothing here has a Check of its own, and the Contract says why: a composition's
deliverable is a look, and every failure this Section can have that a person would
not notice is already somebody else's Check. `deep-links` requires
`/portfolio/catalogue` to open the document at this Section's top; `rail` requires
the Rail's third entry to name it and follow the turn onto it; `moments` requires
the Timeline to seek, to hold through a scroll and to move something; `assets`,
`console`, `across`, `unpublishable` and `effect-stack` read this Section along
with the rest of the page. What a Check does not assert — that the Stills
alternate, that the numbers stand on the spine, that the head is centred — is
what the author sees at a glance, and a Check on any of it would fail the next
time it was chosen differently.

**Two Checks changed to let this Section exist, and each is the same shape.**
`eater-map` stood the page on "the last port" in three places, which was the
Eater Map's port for exactly as long as it was the last Section; it finds the
Eater Map's own port now, by that Section's snap position. And `rail` failed a
Rail whose every entry was a link — a guard against its unbuilt-entry assertion
going vacuous — which is exactly the legitimate state this Section puts the page
in; the vacuous case is a note now, and the assertion stands whenever an unbuilt
entry is back. `scripts/checks/NOTES.md` records both.

## Restatements, so they are not mistaken for choices

| here | restates | held by |
| --- | --- | --- |
| `--catalogue-side`, `--catalogue-inset` | the Eater Map's out-of-band margins | nothing — a drift shows as two Sections with different margins, which a person sees |
| `--catalogue-step` and its φ ladder | the two Showcases' spacing ladder | nothing, for the same reason |
| `--catalogue-accent` | `--eater-map-accent` | nothing, for the same reason |
| `--catalogue-label-tracking` | `--rail-tracking`, `--eater-map-point-tracking` | nothing |

The landing's own terms — `--landing-side`, `--landing-inset` — are **read**, not
restated, which is what the Kernel is for; reading two of them is not joining the
landing measure, for the reason the Eater Map's NOTES.md gives.
