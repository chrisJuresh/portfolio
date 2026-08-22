# The Editor writes Content and Tokens, and nothing else

The Editor opens the real Portfolio locally and edits it in place, but it is only
ever allowed to write two kinds of file: a Section's Content, and a Section's
Tokens. It never writes markup, styles or scripts.

This is a deliberate limit on reach in exchange for reliability: a tool that
rewrites the two simplest formats in the repository cannot corrupt a composition,
and needs no understanding of one.

## Consequences

**A change the Editor cannot express becomes an Annotation** — a measured
instruction in words and numbers, for an agent to apply — and optionally an
Override, so the page looks right immediately while the composition is corrected
later.

**Dragging and resizing is measurement, not authoring.** These compositions are
held together by relationships, not coordinates; the Frame's left edge is a
fraction of the stage, and a Section masthead's cap-height *is* another element's.
A tool that moved boxes freely would destroy the relationship rather than edit it,
so it reports what the author did and lets an agent decide which constant moved.

**Anything the author will want to adjust must first be promoted to a Token.**
Choosing which numbers those are is part of building each Section, not an
afterthought.

The five separate tuners the repository grew — plate, plinth, plinth-studio,
morph, effects — are absorbed into the Editor and retired to `design/legacy/`.
Those five drive Python generators rather than styles, so the Editor has two
speeds: Tokens update live, a baked parameter re-bakes and swaps the asset.
