# Plan: model context stated once, bounded everywhere

The context audit of 2026-10-13 read every input a model sees: the worker brief, the supervisor, the gates and the chat turn. Two faults run through all of them. A fact stated twice, as a tool list beside the tool schemas or a digest beside the raw record or a rendered board beside the board read. A list with no bound, as a brief's findings across sessions or a digest's changed paths or a board's approval requests. Every finding below names its place in the code and its fix. Roadmap 201 carries the summary. Code references are to `~/repos/ai-software-factory-code` unless named otherwise.

## The worker brief

1. **The tool list restated.** The brief's toolsLine enumerates every factory tool and ends "No other factory tool is", while the MCP server's tool list already delivers each tool with its schema and the middleware deletes the disallowed ones (`internal/factoryd/opencode.go:634-639`, `internal/gateway/tools.go:217-262`). Fix: one sentence naming the MCP server, no enumeration.
2. **Guide prose restating tool descriptions.** The work guide's request_info and escalate sentences restate the descriptions at `internal/gateway/tools.go:236-242` (`internal/factoryd/opencode.go:648-657`). Ruling 263 forbids exactly this. Fix: the rule lives in the tool description only.
3. **One sentence copied across sibling guides.** The bash-check and finish sentence sits in the work guide and the feature guide (`internal/factoryd/opencode.go:661-662` and `688-689`). Fix: one shared constant.
4. **AGENTS.md ordered and injected.** The feature guide says "Follow the repository's AGENTS.md." while the pinned harness injects AGENTS.md itself (`internal/factoryd/opencode.go:678`, its injection documented at `699-712`). Fix: drop the line.
5. **The untrusted-poster rule twice.** The standing line and the PosterInfo section both state it (`internal/factoryd/opencode.go:585-593`, `603-610`). Fix: once, in the PosterInfo section.
6. **Carried lists with no total cap.** Findings, answers and poster info accumulate across a card's sessions with no bound (`internal/harness/types.go:19-26`, appended at `internal/factoryd/workflow.go:807`, `918`, `938`, `948`; the only cap is 20 per session at `internal/factoryd/supervise.go:393`). Fix: cap the carried total.
7. **Hand-written context duplicating the generated.** A lane brief's Objective carries intake metadata (Size, Directories) and a hand-written file list that the generated repository map beside it already holds (the Stage 17 probe brief, `stage17-scratch/cards/43-probe-lane.md`). Fix: intake fields render outside the Objective, and the file list is not written by hand.

## The supervisor

8. **Digest beside raw record.** The input holds the bounded digest (40 commands, 5 errors, `internal/factoryd/supervise.go:128-129`) beside a 24 KiB record tail (`internal/factoryd/runner.go:770`, `supervisor.go:241`, `session.go:47`) whose command events each repeat the last 4 KiB of output (`internal/harness/types.go:59`). The same digest one-liner is also stored three times per decision, as a timeline step, an issue comment and the record's JSONL (Stage 7, `task-44-report.md:323-355`), and the record copy is what the tail feeds back. Fix: drop the digest from the model input or strip the command outputs from the tail.
9. **Guidance twice.** The messages the runner passes (`internal/factoryd/runner.go:437-441`, `646`, `774`) repeat guidance the tail's supervisor events already hold (`runner.go:780-787`). Fix: pass only the messages not yet in the record, or strip supervisor events from the tail.
10. **The whole brief on every call.** Each supervisor call restates the full brief, stale findings included (`internal/factoryd/runner.go:766-767`). Fix: the brief once per session, the objective plus a delta on later calls.
11. **Changed paths with no cap.** The digest's Files map counts every changed path (`internal/factoryd/supervise.go:157-158`). Fix: cap distinct paths like commands.

## The gates

12. **Last step beside the tail.** For model_review and gate_audit the bundle holds the timeline's last step beside the tail that already contains it (`internal/factoryd/gatesupervisor.go:218-229` against `172`). Fix: one of the two.
13. **Rules twice in one prompt.** The review prompt states the untrusted-input rule twice within itself and restates the structured AuthorStanding field (`internal/factoryd/gates.go:600-601`). Fix: trust the field, state the rule once.
14. **One sentence in two prompts.** The concurrency summary is copied verbatim into the review prompt and the audit prompt (`internal/factoryd/gates.go:600`, `internal/factoryd/audit.go:51`). Fix: one constant, or fold it into the Concurrency field's header.
15. **The shared block resent per diff part.** Each 48 KiB diff part of one review resends the brief, the gates, the concurrency block and the earlier reviews (`internal/factoryd/gates.go:603-613`, `745-748`). Fix: the shared block once, a stub per part.
16. **Earlier reviews grow per round.** Every review round adds to them (`internal/factoryd/gates.go:612`). Fix: keep the last round's verdicts.
17. **The pattern to copy.** The audit input carries no brief, structured fields only (`internal/factoryd/audit.go:60-67`).

## The chat turn

18. **The turn's opening context restates two reads.** The system message embeds the board text verbatim, the same text the board read returns (`internal/console/chat.go:572-585`, `internal/console/chat_tools.go:504-510`), and 30 event lines that duplicate the history read, the same ProjectEvents call and the same rendering (`chat.go:553-568` against `chat_tools.go:515-521`). Fix: the status line and the pulse stay, the board and the events go, the tools give them on demand.
19. **Board lists with no cap.** The board text's approval requests and problems are unbounded while its columns cap at 25 cards (`internal/console/chat_tools.go:440-452` against `399-400`, `417-419`). Fix: cap them like cards.

The chat's tool catalogue triple-send is item 5 of [the facts plan](2026-10-13-agent-facts-tools.md), roadmap 200.

## Order

The audit's ranking of the worst five: the catalogue triple-send, the turn's board and events (18), the supervisor's double carry (8, 9, 10), the brief's restated tools and rules (1 to 5), the unbounded lists (6, 11, 16, 19). Fix in that order or per occasion.

## Verification

Per item: the model input measured before and after in tokens per call from [the hard-metrics plan](2026-10-13-hard-metrics.md)'s audit-row columns, one live session of the touched kind shown, `go test -race ./...`.
