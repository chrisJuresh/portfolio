# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## These labels have to exist before they can be applied

Only `wontfix` is currently on the repo — it is one of GitHub's defaults. The other four have never been created, so `gh issue edit <n> --add-label needs-triage` fails with `not found`, and so does every `--label` filter that names one. A label is created on first use by nothing; `gh` will not make one for you.

Create the missing four, and the `wayfinder:*` labels `docs/agents/issue-tracker.md` uses, in one go:

```bash
gh label create needs-triage    --color d93f0b --description "Maintainer needs to evaluate this issue"  --force
gh label create needs-info      --color fbca04 --description "Waiting on reporter for more information" --force
gh label create ready-for-agent --color 0e8a16 --description "Fully specified, ready for an AFK agent"  --force
gh label create ready-for-human --color 1d76db --description "Requires human implementation"            --force
```

`--force` makes each idempotent, so re-running updates rather than erroring on one already there.

`docs/agents/issue-tracker.md` also names `wayfinder:map` and `wayfinder:<type>` for `/wayfinder`. None of those exist either; create them the same way if that skill is ever used:

```bash
gh label create wayfinder:map       --color 5319e7 --description "Wayfinder map issue"       --force
gh label create wayfinder:research  --color c5def5 --description "Wayfinder research ticket" --force
gh label create wayfinder:prototype --color c5def5 --description "Wayfinder prototype ticket" --force
gh label create wayfinder:grilling  --color c5def5 --description "Wayfinder grilling ticket" --force
gh label create wayfinder:task      --color c5def5 --description "Wayfinder task ticket"     --force
```
