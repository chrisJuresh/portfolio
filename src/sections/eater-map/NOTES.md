# The Eater Map Section

The third Section: the Eater restaurant map presented as an **Exploded View** —
one captured **Slab** with three **Cards** raised off it by the **Lift** (#171,
CONTEXT.md, ADR 0007).

**Almost none of that is here yet.** What is here is the Cards, and the folder
they had to land in.

## Why this folder exists before the Section does

The Cards are the Eater app's own search bar, rail-lines popup and restaurant
detail panel, taken from the app rather than redrawn (#174). They had to be
committed somewhere a Section is allowed to read from, and
`scripts/check-source.mjs` enforces that a Section may import from **its own
folder and from the Kernel and nowhere else** — so `design/` was not an option
and this folder is not a guess about where the Section will live, it is the only
address the vendored bytes have.

A Section folder is a fixed shape and the build fails if a file is missing, so
the rest of the convention is here too, empty and saying why. Nothing mounts it:
`src/pages/portfolio.astro` names the Sections it renders, and this is not one of
them. It costs the page nothing until #175 puts it on it.

What each of the empty files is waiting for is written at the top of that file.

## The Cards

`assets/cards/` is generated. Do not edit it — `design/eater-cards/README.md` is
the authority, and every file there carries a header saying the same thing.

| file | what it is |
| --- | --- |
| `cards.json` | the manifest: the Eater commit, the restaurant, the export viewport, and each Card's file and measured size |
| `cards.css` | every rule the three surfaces use, re-homed under one host |
| `search.html`, `lines.html`, `details.html` | one Card each, as markup |

Three things about them that are easy to get wrong:

**The host is `.eater-cards`, and it is the containment.** Every selector in
`cards.css` begins with it, including the ones that were `:root`, `html`, `body`
and `*` in the app. The stylesheet is a plain CSS file, so Astro does not scope it
— the host is what stops it reaching the rest of the page, and what stops the rest
of the page reaching in. `cards.json` records the name.

**The Cards are frozen to the viewport they were exported at.** Media queries,
viewport units and `env(safe-area-inset-…)` are all resolved at export time
against the 390×844 window in `design/eater-cards/config.json`. A Card is a
picture of the app at a stated size; without this the restaurant's name would
resize with the Portfolio's window, and the detail panel would turn back into a
desktop sidebar on a wide one.

**Each Card's size is on the host as a custom property**, not written into the
markup: `--eater-card-search-width` and the five like it. That is what the ticket
that places them (#176) composes with, and it is why nothing about placement is a
magic number in a fragment.

One thing that only becomes true when #175 mounts this Section: the `unpublishable`
Check reads the built page and every Section that mounted, so from that ticket
onwards it is scanning **another repository's words** — a restaurant's name, its
address, its phone number and a guide's write-up of it. Nothing in the shape list
matches any of those today, and `denylist.local.txt` is the author's own and not
in the repository, so the failure mode is a local term colliding with a
restaurant. If it ever does, the answer is a different restaurant in
`design/eater-cards/config.json` and a regeneration — never an exception in the
Check, which is the author's record and not this Section's to argue with.

## Where the boundary between Content and the Cards is

The Cards' words are the app's — a restaurant's name, its address, the lines that
serve the stations near it — and they are **not Content**. The Editor writes
Content (ADR 0004), and it must not offer the author a way to rewrite another
repository's interface from this page: the whole point of exporting rather than
redrawing is that the Showcase cannot drift into showing an interface the app does
not have.

Changing which restaurant the Cards show is therefore a regeneration and not an
edit:

```bash
node design/eater-cards/vendor.mjs --restaurant "St. JOHN Bread and Wine" --write
```

`content.ts` holds the Section's own words, which today is its name.

## What is still owed

| ticket | what it adds |
| --- | --- |
| #172 | whether this Section carries a Cut Title — take the answer as given |
| #175 | the Section itself: masthead, subheadings, copy, the four numbered points, the Rail's link, the deep link, and mounting it |
| #173, #176 | the Slab, and the Cards placed flat and coplanar on it |
| #177 | the Exploded View and the Lift, as one named seekable Timeline |

Until #175 lands, this Section is off the page and `timeline.ts`, `tokens.css` and
`variants.css` are empty on purpose.
