# Plan: token and cost truth per task

Sebastian's ruling of 2026-10-13: with the GLM Coding Plan the per-call money truth is gone, only tokens are measured. The factory tracks tokens per task along with cost before any subscription carries factory traffic. Tokens become the stored fact; every EUR figure is a modeled pay-as-you-go equivalent, not money billed.

## What exists

The gateway writes one audit row per model call and its usage scanner already parses prompt, cached and output tokens and the per-call cost of every call. The ledger books the tokens per call day and task, immutable. The card and session reads already carry a cost line (item 160). The hard-metrics plan (roadmap 198) item 1 specs persisting the call row; this plan builds on it and does not restate it.

## Work items

1. **The call row.** Roadmap 198's item 1 as written: `audit` gains `prompt_tokens`, `cached_tokens`, `output_tokens`, `call_cost_eur`, `duration_ms`, `status`.
2. **Per-task totals on the card face.** The task's row sums its call rows: tokens (prompt, cached, output) and modeled cost to date, beside the existing spend line. The session and plan reads carry the same line. One query, no new table.
3. **Credits derived, never stored.** Under the coding plan, credits = (input × input_mult + cached × cached_mult + output × output_mult) / 10,000, with GLM-5.3 multipliers 6.9 / 1.7 / 24 and GLM-5.3-Flash 2.3 / 0.56 / 8 (z.ai's formula, 2026-10-13). Computed at read time when a page asks for it; tokens stay the stored fact.

## Not in this round

No stored aggregates (roadmap 198's rule: none until a page needs one), no LLM-computed metric, no credits column.

## Verification

`go test -race ./...`, one card face shown with per-task token totals and modeled cost, one call row with tokens and per-call cost.
