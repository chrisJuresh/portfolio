# CLAUDE.md

Agent-facing notes for this repo. Human-facing docs are in [README.md](README.md).

## Branching and merging

Every change goes on its own branch and reaches `development` as a pull request.
Never commit to `main` or `development` directly.

1. Branch from `development` before the first edit:
   `git switch development && git pull && git switch -c <short-topic-name>`
2. Commit on that branch only. If you notice you are on `main` or `development`
   with uncommitted work, create the branch and move the work onto it before
   committing.
3. Open a PR into `development` when the change is complete — never into `main`.
   `development` is the integration branch; it reaches `main` separately.
4. One branch per change. A second, unrelated fix means a second branch and a
   second PR, not another commit on the current one.
5. Push and open the PR only when the user asks. Pushing and PR creation are
   outward-facing, so confirm first.
