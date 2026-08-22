# Features land on development without a pull request

Work is still done in a worktree on its own branch — that is what makes several
tickets safe to run at once — but it lands on `development` directly, with no
pull request. `CLAUDE.md` described the opposite when this was decided, and this
supersedes it; #147 rewrote that file to match.

There is no reviewer. Nobody reads the code before it lands, and nobody will: the
author validates by pulling `development` and looking at the running site. A pull
request in that arrangement is a round trip that produces nothing, and here it
produced worse than nothing — `gh pr merge` is documented in this repository as
ending in a fatal error on every single change, leaving the branch it was asked
to delete, and requiring the forge to be asked separately whether the merge it
just reported actually happened.

## Consequences

The lifecycle collapses to two commands: one that cuts a worktree from the
fetched `origin/development` and starts a local server on its own port, and one
that runs the Checks, lands the work, and takes down the worktree, the branch and
the remote branch together.

Landing is refused if the Checks fail. That is the only gate.

Because Sections own their own folders, two tickets touching different Sections
have almost no surface to conflict on — which is what makes landing without
review tolerable rather than reckless.
