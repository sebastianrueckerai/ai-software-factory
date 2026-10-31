# #1381's two hands: the runbook (written 2026-10-31)

The code rename is done and green (PR #1385, checks 5/5, grep clean). Two things sit outside every agent credential, both yours, both quick with this page open. Then one press finishes the card.

## Hand 1 — the infra commit (sf/ai-software-factory-infra)

One commit on master, four edits:

1. `factory/policy.yaml`, the three class stanzas (around lines 170, 213, 237 — coder, analyzer, planner): replace `escalate_to_human: {}` with `escalate: {}`. Three swaps, nothing else in the stanzas.
2. `factory/policy.yaml` line 144, the comment naming the tool: `escalate_to_human` → `escalate`.
3. `factory/schema/policy.schema.json`, the tool-name enum: the entry `escalate_to_human` becomes `escalate`.
4. `README.md` lines 76–78: the three mentions of the tool name swap likewise.

Commit message: `The ask tool's rename: escalate_to_human becomes escalate (code in ai-software-factory-code PR #1385)`.

Verify before push: `grep -rn escalate_to_human .` returns nothing.

Push, and Flux reconciles it with the next sync — that is the plan's reconciliation window.

## Hand 2 — the ledger entry

Append one line to the build-plan ledger:

`(2026-10-31) The ask tool names the request; policy names the route. escalate_to_human becomes escalate.`

Commit and push as usual for the ledger.

## The press

Escalation **#1387** in Needs you, first choice: *"Infra + ruling landed; fund €1.50 too."* The €1.50 clears the card's check-in wall (€2.40 of €4.00, the check-in's share spent) so its final session verifies your infra commit and closes cleanly. Or say it in the chat: "infra and ruling landed, fund it."

## What I do the moment you say so

Fund-press recorded → the final session runs → I verify the card's report against the pushed infra HEAD as far as the sandbox can see, press the merge on PR #1385 as you, and the rename is done: one factory roll, both repos, the tool live as `escalate`.

## Why the order matters (the plan's risk clause)

Code without the policy change refuses every `escalate` call — no class lists the name, the safety valve goes dark. Land the infra commit first (or in the same window); the code merge follows within minutes. Never the reverse.