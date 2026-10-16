# The escalation ladder: implementation notes

The notes of the implementation of [the redesign](../escalation-ladder-redesign-2026-10-15.md). A fresh session resumes from this file. The plans hold the tasks and their checkboxes; this file holds the phases, the decisions and the state.

## The phases, from the design's order of work

1. **The code changes that need no model**, in three plans that each stand on their own:
   - A, attempts, budget and answers: [2026-10-15-escalation-ladder-a-attempts-budget-answers.md](2026-10-15-escalation-ladder-a-attempts-budget-answers.md). The session cap counts sessions, `SessionFunded` with a floor per rung, one path for every human wait and Fund as the answer, the budget from rung and size, dated answers below the findings, a dead session's stop report instead of its command lines, no Approve on red checks at the cap, a `concerns` without findings as a remark.
   - B, facts, detectors and the planner: [2026-10-15-escalation-ladder-b-facts-detectors-planner.md](2026-10-15-escalation-ladder-b-facts-detectors-planner.md). Budget, time and attempt in the brief with a warning near a limit, the spend-without-push detector, the context-size detector or compaction, the blocking wait tool, the planner's warning and second session, the sandbox's capabilities in the brief, the session record's `pushed`.
   - C, the review and the records: [2026-10-15-escalation-ladder-c-review-records.md](2026-10-15-escalation-ladder-c-review-records.md). Absence claims grepped before they count, one review call for the whole diff, the anti-cheat check, the stale sweep on Temporal's liveness, a cancelled call settled from the provider's spend.
2. **The check-in agent at the gate moment**, with the evidence rule, the three verdicts and the records, and the replay scenarios of the eight problems as the test. Plan D, not yet written.
3. **The in-session and dead-session moments**, the handover, the check-in's own alias. Plan E, not yet written.

Beside the ladder, not in these plans: the screen of a UI card (a browser in the sandbox image and a lab gate), roadmap 281's research on how a session gets its tools.

## Decisions

- Each plan is written by a fresh context that reads the design, the facts and the code, and returns a summary. Sebastian reviews the plans and picks the execution method before any code changes.
- Code changes go on a worktree branch of the code repository, land on main after the repository's gates (gofmt, vet, gosec, `go test -race ./...`, the Postgres tests), and reach the cluster through a roll card. Temporal workflow changes that alter control flow for runs in flight carry a version gate.
- Policy values live in the infra repository's `factory/policy.yaml`; a code change that needs a new key ships with its default and the infra change follows.

## Findings of the plan writers that change the design's letter

- **The context-size detector is configuration.** opencode v1.18.32 auto-compacts at `limit.input - compaction.reserved`. The factory declares a 200,000-token context, so compaction started near 175,000 tokens and #854's 138,000 never reached it. Plan B sets `limit.input` to the policy value `context_tokens` and `compaction: {auto: true, reserved: 0}`, so the threshold is exact and no detector, no supervisor call and no session end is needed. Not verified live; plan B has a check for the first card after the roll.
- **The wrap-up warning is a message from the runner, not a line in a gateway response.** The gateway knows only the budget, and a streamed line would land in the history as the model's words. The runner's tick sends it once per limit through the existing message path.
- **The wait tool is a worker subcommand**, `agent-worker wait <pid> [seconds]`, since the gateway cannot see sandbox processes and the opencode plugin holds only the pinned dependency.
- **The budget branch does not discard comment answers.** It drops the change requests drained during the wait. Plan A fixes both through one closure that every wait of the loop uses, and Fund posts its note as a comment answer.
- **`session_started` is written at pod start today.** Plan A moves it to the activity that sees the first model answer, and counts from the activity's result, since event rows are best-effort.
- **The anti-cheat findings cannot go through the policy gate**, whose `on_findings` is floored at `fail`. Plan C routes them through the checks stage's rule, as the queue's findings go.
- **The review's absence claims become a structured `claims` field** (finding index, kind, symbol), checked by `git grep` on a depth-1 clone, since Forgejo has no code search. A drop never counts as approve: the verdict stays `concerns` with no finding and no session.
- **A cancelled call's spend** depends on LiteLLM's version. Plan C probes `/spend/logs/v2` first and handles three outcomes: a row, no row after 45 s, or an unreadable log.
- **The infra policy keys land after the roll**, since a running factoryd rejects an unknown key. Every plan ends with that order.

## Defaults the plans propose, to be struck by Sebastian if wrong

| Value | Default | Source |
|---|---|---|
| Session floor, cheap rung | 0.30 EUR | #839's starved sessions had 0.15 EUR |
| Session floor, strong rung | 0.60 EUR | #854's starved session had 0.07 EUR |
| Wrap-up warning | at 80 % of the budget | #854 |
| Planner's warning | at 67 % of its time | the design's two thirds |
| Spend-without-push trip | at 60 % of the budget | #854 spent 98 % before its first push |
| Context line | 100,000 tokens | #854's calls grew to 138,000 |
| Planner's second session | half the cap, 15 minutes | the first session's reading is carried as a finding |
| Review single-call limit | 256 KiB, about 66,000 tokens | plan C reads the model's real `max_input_tokens` first |

## State

- 2026-10-15: the design is approved. The three plans of phase 1 are written, 28 tasks and 146 steps in all.
- 2026-10-15: Sebastian chose subagent-driven execution. Plan A runs on branch `ladder-a` in the worktree `~/repos/worktrees/asf-code-ladder-a`, ledger at `.superpowers/sdd/2026-10-15-escalation-ladder-a-attempts-budget-answers/progress.md` inside it. Tests run against a throwaway Postgres 17 container through `/tmp/claude-1000/ladder/pg-docker.sh`, since this machine has no local Postgres. Tasks 1 to 10 and a batch of sixteen review minors are complete and reviewed, 17 commits on `ladder-a`. The final whole-branch review and its fix waves are done; plan A's code is complete at `8930f3f`.
- 2026-10-16 00:3x UTC: landing is blocked. Forgejo is in a crash loop because Hetzner's object storage in fsn1 is degraded (Hetzner's status page), and Forgejo cannot start without its attachment storage. A rebase probe of plan A onto main is clean. Plan B started meanwhile on branch `ladder-b`, stacked on `ladder-a`, worktree `~/repos/worktrees/asf-code-ladder-b`, ledger inside it.
- 2026-10-16: Forgejo's git endpoint answers again. Plan A landed on main at `d9b3bd5` (pushed to Forgejo and GitHub) after main moved twice under the gates and the branch rebased twice; vet, gofmt, gosec and the full race suite ran green on the final tree. The worktree is removed; plan A's ledger of record is `.superpowers/sdd/2026-10-15-escalation-ladder-a-attempts-budget-answers/progress.md` in this repository. The roller files its own roll card once main CI builds green images; the infra policy keys (the two session floors), the regenerated schema and the architecture paragraph follow the roll.
- 2026-10-16: Sebastian's Claude subscription ran out and the session runs on zai. Subagents inherit the session's model; the haiku/sonnet/opus tiering is suspended until the subscription returns (weekly cap reset 19 Oct, 2am Berlin). Plan B continues on `ladder-b`, task 7 fix round 3 under way; the branch rebases onto `d9b3bd5` before task 8 is dispatched.
- 2026-10-16: the roll of `d9b3bd5` settled (card #891). The policy floors 0.30 and 0.60 EUR and the regenerated schema are in the infra repository (`4bc59d2`, pushed to both remotes), and the architecture document carries plan A's paragraph. Plan A is complete.
- 2026-10-16: plan B is complete and landed. Tasks 1 to 9, the minors batch and the final whole-branch review (Approved, no findings) finished on `ladder-b`; a final gosec gate fix later, the branch landed on the code repository's main at `4940998` (pushed to Forgejo and GitHub) and the worktree is gone. The architecture document carries plan B's paragraph (docs `f5e72bc`). Plan B's ledger of record: `.superpowers/sdd/2026-10-15-escalation-ladder-b-facts-detectors-planner/progress.md` in this repository. The infra `limits` values (`warn_at` 80, `plan_warn_at` 67, `no_push_spend` 60, `context_tokens` 100000) follow the roll of `4940998` settling. Plan C starts on its own worktree from main.
- 2026-10-16: the roll of `4940998` settled (card #900) and the infra `limits` values landed (`9b21004`, pushed to both remotes; schema regenerated from the pulled code checkout, config check and policy tests green). Plan B is complete, code and infra.
- 2026-10-16: plan C under way on `ladder-c` in the worktree `~/repos/worktrees/asf-code-ladder-c`, base `4940998`, ledger `.superpowers/sdd/2026-10-15-escalation-ladder-c-review-records/progress.md` inside it. Tasks 1 to 3 are implemented, committed and reviewed Approved (`aa1778e` review-diff cap, `2a5adc3` claims and grep-backed drops, `84825db` anti-cheat shapes routing back to the agent). Five review minors are batched for one fix dispatch before the plan's last task. Task 4 (the stale sweep in temporal.go) is dispatched.
- 2026-10-16: plan C's tasks are all implemented and reviewed. Task 5 (cancelled calls priced from LiteLLM's spend log, d764255) followed a live controller probe of the cluster's LiteLLM: all three cancelled calls wrote spend rows, including one cancelled before any chunk; the deployed `/spend/logs/v2` needs both `start_date` and `end_date`. The minors batch (9b12876: four test hardenings, the nil-Spend guard hoist, the readSpend comment) is ruled covered by the whole-branch review per plan B's precedent; three claims.go observations are ruled accepted-as-is (plan wording, fail-safe). Task 6's five architecture passages landed on docs master (252d65d, both remotes). The whole-branch review of 4940998..ladder-c is running; gates and landing follow.
- 2026-10-16: plan C is landed. The whole-branch review passed (Approved, no findings); a gosec G104 gate fix later (the claims temp-dir cleanup named best-effort), the branch rebased onto main's 11 commits and landed on the code repository's main at `078d004` (pushed to Forgejo and GitHub) with build, vet, gofmt and the full race suite green on the final tree (factoryd, policy, gateway, the three cmd packages, acceptance). The worktree is gone; plan C's ledger of record is `.superpowers/sdd/2026-10-15-escalation-ladder-c-review-records/progress.md` in this repository. The infra `review_diff_kib` follows the roll of `078d004` settling, after reading the review model's real window from the live LiteLLM. All three plans of phase 1 are now landed; only the post-roll infra key and the closing report remain.
