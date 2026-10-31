# The ask tool's rename: `escalate_to_human` becomes `escalate`

Written 2026-10-31. Status: all landed but the merge of code PR #1385 (branch factory/t-6eadec8912ab), which the project agent presses after the fund press on #1387 — infra 82ab246 on both remotes, the living docs and this status line, ruling 331 in the ledger. See "What still waits" below.

## What still waits (added 2026-10-31, landed the same day)

- Landed: the infra repo commit 82ab246 (factory/policy.yaml classes, the schema enum, the README mention), on both remotes inside the reconciliation window; the living docs (architecture, roadmap, target-architecture) and this status line; ruling 331 in .superpowers/sdd/2026-09-24-build-plan/progress.md — the plan's "ruling 326" was a stale number, 326 was taken 2026-10-23 and the ledger is outside every clone.
- The one-line quote fix in docs/manual/policy.md (returned to the branch session).

## The decision

The worker's ask tool names the request, not the recipient, like its three
siblings (`request_info`, `request_tool`, `request_cut`). Who answers first is
policy, and policy already overrides the name: at autonomous and full auto the
project agent reads the ask before any human. The chat side already calls its
same-shaped tool `escalate`. The stored vocabulary (`escalation`,
`question_asked`) already avoids the route. The rename aligns all of them and
becomes ruling 326.

## What the new copy says

The name change reaches the worker through model-facing text. Ruling 263 keeps
tool names out of the briefs, so descriptions, the manual and refusal texts are
the whole surface. Exact new wording:

- Tool description, `internal/gateway/tools.go` beside `policy.ToolEscalate`:
  "Escalate when the task cannot be completed without a decision, access or
  information you lack. Who answers first is policy, the project agent or a
  human; an ask nothing settles always reaches a human. This session ends; the
  task resumes with the answer. Free."
- Tool result, `tools.go` `escalate`'s hand-over string: "escalated; this
  session will end. Policy decides who answers; an ask nothing settles always
  reaches a human, and the task resumes with the answer. Stop working now."
- Manual, `internal/manual/manual.go:43`: "Ask for a decision with escalate;
  ask the issue's author with request_info." (the rest of the line stands)
- `internal/factoryd/runner.go:230` `ErrNoCut`: "this card cannot be cut:
  finish it as it is, or escalate"
- `internal/factoryd/toolpark.go:150,160`: name swap only, "ask a human with
  escalate" stays, since a human is who frees a name.
- `internal/factoryd/supervise.go:395` event detail: "the agent called
  escalate".

## The sweep

One source in code: `internal/policy/policy.go:1016`,
`ToolEscalate = "escalate"`. Everything else already routes through the
constant. The string appears spelled out in 18 non-test Go lines (comments,
the `tools.go:866` log line, the copies above) and in 9 test files
(`policy_test`, `tree_test`, `manual_test`, `cloud_test`, `opencode_test`,
`toolpark_test`, `tools_test`, `plan_test`, `escalation_test`), all in
`ai-software-factory-code`.

Infra, `ai-software-factory-infra`, deploys with the code in one Flux sync:

- `factory/policy.yaml:170,213,237`: `escalate: {}` in the coder, analyzer and
  planner classes, and the comment at line 144.
- `factory/schema/policy.schema.json`: the tool-name enum entry.
- The `TOOLS` env flows from the class list (`runner.go:2072`), nothing to
  touch.

Living docs: `architecture.md` (6 places), `roadmap.md`, `target-architecture.md`,
the infra `README.md` (lines 76 to 78).

History stays as it was, because it records what was true then:
`escalation-ladder-facts-2026-10-15.md`, both escalation validation docs,
`market-research/`, `plans/2026-09-24-build-plan.md`,
`plans/2026-10-29-divide-and-conquer.md`.

## What does not change

- The chat's `escalate` and `ask`: the chat tool table is not class-gated, no
  collision, and both already name the act.
- `request_info`, `request_tool`, `request_cut`: different protocols, not
  routings of one ask.
- Stored data: the kind `escalation`, the event `question_asked`, history
  rows. No migration.
- The ask's five parts, the caps, the hand-over, and the wake routing, which
  reads events, not tool names.

## The one risk and its hold

Code without the policy change refuses every `escalate` call, because no class
lists the name, and the safety valve goes dark. The two commits therefore land
and push together, one Flux reconciliation apart at worst. Inside that sync a
call can be refused with the class reason; the refusal is a tool error the
agent reads and retries. No both-names shim.

## Order of work

1. Code repo, one commit: the constant, the model-facing copy, the comment and
   log sweep, the test sweep. One new pin in `tools_test`: the description
   holds "an ask nothing settles always reaches a human". `go test -race ./...`
   green.
2. Infra repo, one commit: `policy.yaml`, the schema enum, the README lines.
3. Docs repo, one commit: the living docs, this plan's status line.
4. Ruling 326 in the ledger
   (`.superpowers/sdd/2026-09-24-build-plan/progress.md`): the ask tool names
   the request, policy names the route, with the date.
5. Verification: `grep -rn escalate_to_human` returns nothing in the code and
   infra repos and in the living docs; the history docs keep theirs.

Work in a worktree per the standing git workflow, commit to master, push both
remotes of each repo, delete the worktree.