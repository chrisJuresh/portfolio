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

Three of the five are on the repo; two are not:

| label | on the repo? |
| --- | --- |
| `needs-triage` | **no** |
| `needs-info` | **no** |
| `ready-for-agent` | yes, `#0e8a16` |
| `ready-for-human` | yes, `#1d76db` |
| `wontfix` | yes — one of GitHub's defaults |

A label that is not there is not created on first use: `gh issue edit <n> --add-label needs-triage` fails with `not found`, and so does every `--label` filter that names one. `gh` will not make one for you.

`gh label list --repo chrisJuresh/portfolio` is the authority, not this table — somebody may have created one since.

Create the two that are missing:

```bash
gh label create needs-triage --color d93f0b --description "Maintainer needs to evaluate this issue"  --force
gh label create needs-info   --color fbca04 --description "Waiting on reporter for more information" --force
```

`--force` makes each idempotent, so re-running updates rather than erroring on one already there. That is what makes it safe to run these against a repo whose state has moved on from the table above.

`docs/agents/issue-tracker.md` also names `wayfinder:map` and `wayfinder:<type>` for `/wayfinder`. **None of those exist**; create them the same way if that skill is ever used:

```bash
gh label create wayfinder:map       --color 5319e7 --description "Wayfinder map issue"       --force
gh label create wayfinder:research  --color c5def5 --description "Wayfinder research ticket" --force
gh label create wayfinder:prototype --color c5def5 --description "Wayfinder prototype ticket" --force
gh label create wayfinder:grilling  --color c5def5 --description "Wayfinder grilling ticket" --force
gh label create wayfinder:task      --color c5def5 --description "Wayfinder task ticket"     --force
```
