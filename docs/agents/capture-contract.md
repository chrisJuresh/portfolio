# Capture Contract

`/portfolio` has a consumer outside this repository. `chrisJuresh/chrisJuresh` —
the author's GitHub profile repo — screenshots `chrisj.uk/portfolio` roughly
hourly and rewrites its README to a light/dark `<picture>` of the result.
Nothing in this repo hints at that, so a change made here can break a page over
there without anything failing here.

Before merging anything that touches `/portfolio`'s markup, layout, spacing or
colour, run:

```bash
python design/tools/check-capture-contract.py
```

Exit `0` is a pass, `1` is a broken contract, `2` means the check could not run.

## What it does

It starts an `http.server` on the tree it was invoked from, fetches
`chrisJuresh/chrisJuresh`'s `scripts/capture-portfolio.mjs` at run time, points
it at that server with `PORTFOLIO_URL`, and reports what the real job would have
computed. Full rationale, and the reasoning behind every choice below, is in the
module docstring of the script itself.

## The two failure modes

The capture asserts hard on **structure and geometry** — selectors `.page`,
`.col`, `.slide`, `.track`, `.item`, `.item .sub`; a `.listing` whose `h2` is
exactly `Work Experience` carrying at least two `.item`s, the second with a
`.sub`; balanced gutters; a capture width inside a range. Break any of it and
the job throws, the profile keeps its previous preview, and the script here
exits `2` carrying the upstream error.

It asserts **nothing at all about colour**. A theme regression passes every
assertion it has and quietly puts a dark slab on GitHub's white paper for an
hour. That is why this script measures mean luminance: it is the only thing
covering the silent half.

Note which colour regressions are actually reachable. The capture overrides
`--ink --ink-soft --muted --bg --bg-rgb --bg-0 --rule-soft --link-line` and
`html, body { background }` with `!important`, and its `<style>` is appended
last, so it wins those outright. What it cannot reach is anything painting a
colour somewhere else — a background on `.page`, a hardcoded hex on a
descendant, or one of those custom properties being renamed out from under it.

## The numbers

| Reported            | On `development` | Contract                                  |
| ------------------- | ---------------- | ----------------------------------------- |
| `captureWidth`      | 592              | Hard. Fails the run.                       |
| four gutters        | 80 (bottom 80.4) | Hard. Fails the run.                       |
| `cropHeight`        | 852              | Soft. Warns.                               |
| `meanLuminance`     | 188.4 / 46.1     | Hard, loose bounds. Fails the run.         |

**592 is load-bearing twice.** It is checked against a range, and it is the
hardcoded divisor in the capture's `deviceScaleFactor` (`846 * 3 / 592`). Moving
`--col`, `--slide-h` or the track gap either fails the range check or silently
resamples the type in the preview. Recompute it as
`2 * (1.75 * photoWidth + trackGap) - columnWidth`.

**`cropHeight` legitimately moves.** It is the bottom of the second role plus one
gutter, so any change to the column's vertical spacing shifts it — it has been
897, 893, 854 and now 852. An *unexplained* change is the tell that font
resolution moved on the runner, which is why it warns rather than fails. When a
change is meant to move it, run with `--expect-crop-height <new>` and update the
constant in the script and the table above.

## Comparing against a baseline

```bash
python design/tools/check-capture-contract.py --ref origin/development
python design/tools/check-capture-contract.py
```

`--ref` lays the ref out with `git archive` and serves that, so a baseline can be
measured from inside any worktree without a second checkout. Each run stages into
`design/tools/.capture-contract/runs/<label>/`, labelled by branch or ref, so the
two sets of PNGs coexist. **Two runs sharing a label overwrite each other's
images** — pass `--label` if you are running the same ref twice and want to keep
both.

The extracted tree is deleted once the server is down, so what a run leaves
behind is `runs/<label>/out/`: three files, the PNGs and the report. It used to
leave the tree as well, which meant a complete second copy of the repository
inside the repository — invisible to `rg`, which reads `.gitignore`, and walked
by `grep -r`, which does not, so a search came back with two hits for
everything. `runs/` is still worth emptying by hand when it gets large; nothing
reads an old run.

## Traps this script exists to avoid

- **`preview_start` serves the main checkout**, never the worktree the edit is
  in, so verifying with it measures `development` while you believe you are
  measuring your branch. This script serves its own tree, and with
  `--directory`, so the server's cwd is never inside a worktree you are about to
  `git worktree remove`.
- **The capture script is fetched, never vendored.** A committed copy drifts
  silently against a repo we do not own — the same failure mode `CLAUDE.md`
  documents for the worktree guard. The blob sha of what ran is in the report.
- **ESM resolves `playwright` from the running script's own directory**, not the
  cwd, and a worktree has no `node_modules` because it is ignored. The fetched
  script is therefore staged under the `design/tools/` that has the install —
  found via `--git-common-dir` — so resolution walks up into it. Never
  `npm install --prefix` into a staging directory; run `npm install` in
  `design/tools` of the main checkout if playwright is missing.
- **The capture writes `assets/*.png` and `README.md` into its cwd**, which is
  why it is run in staging and never in a checkout.

## Requirements

`node`, an authenticated `gh`, Pillow, and `playwright` installed under
`design/tools/` in the main checkout.
