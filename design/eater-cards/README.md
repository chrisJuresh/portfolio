# The Eater Cards

The three **Cards** of the Eater Map Showcase — the app's own search bar, its
rail-lines popup and its restaurant detail panel — taken out of the Eater app and
committed into this repository as markup and a stylesheet.

```bash
node design/eater-cards/vendor.mjs            # regenerate, and report what moved
node design/eater-cards/vendor.mjs --write    # …and take it
node design/eater-cards/vendor.mjs --check    # is the copy stale? (no browser)
```

Output: `src/sections/eater-map/assets/cards/`. Read that Section's `NOTES.md`
for what the files are and how the Section reads them.

## The two halves

**The export route lives in the other repository.** `/export` in
[`chrisJuresh/eater-map-site`](https://github.com/chrisJuresh/eater-map-site)
renders the three surfaces standalone — no map behind them, no app chrome around
them — for a restaurant named in the URL, and emits their markup with the styles
they actually use. It is dev-only three times over: `+page.js` turns prerendering
off so no `/export` is built, the page is behind `import.meta.env.DEV`, and the
collector is behind a dynamic import inside that gate. `src/routes/export/` there
carries the reasoning, and `collect.js` is where the work is.

**`vendor.mjs` is this half.** It finds that checkout, starts its dev server,
drives the route headless, and writes the result here with the Eater commit
stamped into every file.

## Why the output is committed

`pnpm build` is this repository's gate, and a gate that only closes when a sibling
checkout happens to be on disk is not one. Everything else in this tree that came
from somewhere else is committed bytes for the same reason.

## Why it is stamped, and what "stale" means

`cards.json` carries the Eater commit the Cards were generated from. When the
app's interface moves, the copy says so instead of the Portfolio quietly showing a
version of Eater that no longer exists — the same job the recording's content
digest does in the Projects Panel.

Two ways to be told:

- **`--check`** asks whether the app has moved anywhere a Card could be made of.
  No browser, so it is cheap enough to run out of habit — which is why it does
  **not** simply compare the two commits: that would fail on a change to that
  repository's README, and the mode most likely to be run habitually is the worst
  one to have crying wolf. It compares the stamp against `HEAD` and, when they
  differ, asks git what changed under the paths `config.json` names as surfaces.
  Nothing there and the Cards cannot have moved, so it passes and says the stamp
  is merely behind. Something there and it names the files and exits non-zero.
  A stamp naming a commit that checkout has not got — unfetched, or rewritten —
  is reported as **cannot tell** rather than guessed at either way.
- **A plain run** regenerates, compares the bytes, and **reports the difference
  rather than taking it** — the commit that moved, the subject either side of it,
  and which files changed by how much. Nothing is written without `--write`. A
  change to somebody else's repository cannot land here by being run past.

It also separates *the app moved* from *the app's interface moved*. Every commit
over there moves the stamp whether it reached a surface or not, so a run that
could not tell the two apart would cry wolf on every unrelated commit — and a
tool that cries wolf is one whose report gets skimmed, which is the failure this
whole mechanism exists to prevent. When only the stamp differs it says so.

That comparison is `compare.mjs`, on its own with a test beside it, and it is the
only part of this that is tested. Everything else here fails loudly and
immediately — a missing checkout, a dev server that will not come up, a route
that never finished — and the Agent Contract's rule is that those are not worth a
fixture. A wrong "unchanged" is the opposite: silent, and the whole guarantee.

Neither `--check` nor a plain run is a Check, and that is deliberate: `pnpm
check` may only assert things about the served Portfolio, and "is a sibling
checkout newer than this" is a question about a machine rather than about the
page (`scripts/checks/NOTES.md`).

## Finding the Eater checkout

`EATER_REPO`, if set. Otherwise the sibling directory — tried both beside this
tree and beside the **main checkout**, because `.claude/worktrees/<name>/../eater`
is not anything and most of the work here happens in a worktree. When neither
answers it names both paths and stops; a generator that quietly produces nothing
looks exactly like one that succeeded.

It also refuses a checkout that is the wrong repository, has no installed
dependencies, or has no restaurant dataset — the Cards are rendered for a real
restaurant, so the app needs its data on disk.

## Everything that can be chosen is in `config.json`

The restaurant, the search text, the offline state, the export viewport, the
sibling directory's name, the port, and the output path. `--restaurant` and
`--query` override for one run.

The `/export` route has defaults of its own and they are **not** the authority:
they are there so the page shows something when it is opened by hand. `vendor.mjs`
passes every parameter explicitly, so the two cannot drift into disagreeing about
what was vendored.

## Things that cost a wrong answer once

**The dev server is started as `node …/vite.js`, not through a package manager.**
A spawned `pnpm` on Windows is a shell wrapper around the process that actually
holds the port, so killing the child leaves the server running and the next run
fails on `--strictPort` with nothing to point at.

**The wait for that server watches the child, and asks for a path only this app
serves.** `--strictPort` makes vite *exit* when something else already holds the
port, and a wait that only polls would then spend a silent minute on a failure
that was known in the first second — or, worse, find that the stranger answers
200 and export whatever it happens to be serving.

**A pseudo-element in a selector is why the first export was wrong.**
`Element.matches('.a::before')` throws rather than returning false, and a thrown
selector looks exactly like one that matched nothing — so two real rules were
dropped from 646 lines with nothing anywhere saying so. Fixed upstream in
`collect.js`; worth knowing because the whole collector is built on `matches()`
and anything else it refuses will fail the same silent way.

**The export is taken with the app's own dev server, not `pnpm preview`.** The
built app registers a service worker, and a worker answering from a stale cache is
a Card exported from a build nobody made.

**Uncommitted work in the Eater checkout is warned about and not refused.** A
stamp names a commit, so Cards taken off a dirty tree are stamped with a lie —
but generating against uncommitted work is exactly what happens while the export
route itself is being written, so it says so loudly and carries on.
