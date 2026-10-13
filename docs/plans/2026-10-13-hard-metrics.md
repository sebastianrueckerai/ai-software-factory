# Plan: the hard data of a project over time

Sebastian's ruling of 2026-10-13: the first round of metrics stands on hard data only. No metric depends on an LLM interpreting anything, and no LLM stage is added to invent metrics or find errors. Token counts are included. Every needed fact is recorded in a good format. A project watched over time comes first ("I want to know how my project is going"), projects against each other later. Misreads stay uncounted: no mechanistic census of them exists, and the fix for the class is by construction (roadmap 180, fresh reads and current state in each turn's context).

## What exists

The gateway writes one audit row per model call (ts, task, decision, reason, model alias, spend, policy version, kind and deployment), and its usage scanner already parses prompt, cached and output tokens and the per-call cost of every call: the data is collected and dropped at the write. The ledger books the tokens per call day and task, immutable. Tasks carry created, finished, gate, gate_since, reverted_at, pull request and sha. Events hold every state change with actor and via. Rolls hold the factory's own image deploys end to end. Chat rows hold every tool call with its arguments and result. RevertPass fetches each merged diff daily and discards the sizes. The CI rollout check observes a project's digest running and rolled out, and persists nothing. The checkpointer computes a diff stat every 15 seconds into the S3 session log only. OTel counters cover tasks, outcomes, reviews, interventions, CI, rolls, gates and alerts.

## Work items

1. **The call row complete.** `audit` gains `prompt_tokens`, `cached_tokens`, `output_tokens` (int), `call_cost_eur` (numeric), `duration_ms` (int) and `status` (text). The usage is in hand at the write. `spend_eur` stays what it is, the task's cumulative spend after the call books; per-call analysis reads `call_cost_eur`. The ledger stays the hold accounting and is not changed.
2. **Project deploys persisted.** A `project_rolls(repository, namespace, digest, commit, ready_at)` row, unique on (repository, digest), written where the rollout check already sees the digest running and the rollout complete. The CI template passes its deploy commit. Push time joins from the CI job record factoryd already keeps, so lead time needs no new collection. Chosen over a project RollWatcher: one write in an existing path, no new component. Caveat: a rollout is recorded as far as CI polls it.
3. **Diff size on the task.** `tasks` gains `files`, `insertions`, `deletions`, written by RevertPass, which holds each diff in hand.
4. **Chat tool call timing.** `ChatToolCall` gains `at` and `ms`, filled in the turn loop. The column is jsonb, so no migration.
5. **Project attribute on the gateway counters.** `gateway.calls` and `gateway.spend.eur` carry the project, which is in scope at emit time.

## Format rules

`timestamptz` everywhere. The project key is the repository string every table already uses. Tokens are integers, money is numeric EUR, durations are integer ms. One row per event, append only, aggregates are queries. No stored daily summary until a page needs it (roadmap 147).

## Not in this round

No LLM-computed metric, no error-finding stage, no misread tag (a human mark may follow later as a calibration sample, never a stage), no cross-project normalisation, no analytics page.

## Verification

`go test -race ./...`, plus one row shown per item: a call row with tokens, a project roll, a task with diff sizes, a chat row with tool timings.
