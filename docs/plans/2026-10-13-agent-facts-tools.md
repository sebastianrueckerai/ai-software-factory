# Plan: deterministic facts by tool, not by question

Sebastian's ruling of 2026-10-13: an agent is never asked for a fact that a tool or an injected input can carry. Asking is slow and dear, and a model guesses. Checking an agent's spent and budget is a tool call. The main chat reads everything, other agents get a narrow tool set, and the tool surface stays parsimonious: few tools, one-line descriptions, empty schemas, no reams.

## What exists

The chat already models the whole shape: 19 read tools run at once, actions wait on the Confirm list behind a Do it, and one access table scopes every route and tool by role and project. The chat reads costs, cards, sessions, CI and alerts. The gateway runs an MCP server (factory-tools) whose tool list is filtered per capability class at list time and call time; its free tools today are all actions. Supervisor, review, gate and audit are single JSON calls with no tools. No sandbox agent can read spend, budget or card state today. Worker briefs carry tool names only.

## Work items

1. **One free read-only MCP tool: `task_costs`.** No parameters, a one-line description. Budget, spent, remaining, call count and tokens of the calling task. Read-only tools form their own free list: no confirmation path, no extra prompt text.
2. **Supervised reads.** An optional `task_id` parameter, allowed for the classes that supervise (the planner). The gateway refuses a named task outside the caller's project, the same repository check the chat's card read makes. This is how a higher agent checks a lower one without asking it anything.
3. **Facts injected into the single-shot purposes.** The supervisor, review and gate inputs gain a deterministic block: budget, spent, remaining, tokens, task state, gate age, assembled by factoryd from the same reads. A tool is the wrong shape for a call with no loop.
4. **The policy carries it.** The tool is allow-listed per class through the existing `Class.Tools` map. Purposes stay model-gated only.
5. **The chat's tool catalogue stated once.** Today it reaches the model three times: all 44 schemas with manual-length descriptions on every model call (the card read's alone is about 700 characters), again as the OK list in the standing prompt, and again in the system read, which lists every tool with its needs-OK and fits and then repeats the OK list as a summary line. The cost sits in the schemas, not in the manual's short lines. The fix by construction: one sentence per tool in the schema, the depth stays in the system read, the OK mark a suffix on that sentence, and the offered list filtered by the member's role (the access table already knows), so no schema is sent for a tool the runtime would refuse. The prompt's OK list and the manual's Tools section go.
6. **The principle recorded.** One line in architecture.md's principles: no agent is asked for a fact that a tool or an injected input can carry. It extends Stage 16's every-console-read-is-a-tool.

## Not in this round

No wide facts tool set (a `card_state` read follows if the planner proves it needs one), no per-purpose tool permissions, no change to the chat's read set beyond tokens in the costs read.

## Verification

A scoping test (a cross-project `task_id` refused), a worker session calling `task_costs` live, a supervisor digest showing the cost block, the chat's schema block measured before and after item 5 in tokens per model call from the audit row's new columns (the hard-metrics plan's item 1), `go test -race ./...`.
