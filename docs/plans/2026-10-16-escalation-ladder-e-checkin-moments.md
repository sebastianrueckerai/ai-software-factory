# Escalation ladder, plan E: the check-in's in-session and dead-session moments

> [!IMPORTANT]
> REQUIRED SUB-SKILL: Before executing this plan, read and follow
> `.claude/skills/test-driven-development/SKILL.md` exactly.

**Goal:** The check-in takes its other two moments on the machinery plan D landed. In session, a second conversation inside the running agent's own pod replaces the session supervisor's model call on every detector trip the code does not already decide: it reads the live workspace and the session's own record, then continues the session, messages the agent, stops it with a handover note, or asks for a human. Dead, a check-in before the next session writes the handover for the session whose predecessor ended without a result. The deterministic first responses stay in code: the wall clock stops, the cheap cap climbs, the stuck rule climbs, the agent's own asks are decided already. The supervisor's call leaves the session path; its shared pieces (the gate supervisor, the review, the audit) keep the model and the policy vocabulary.

**Architecture:** Both moments are a different `Moment` and statement in the same conversation runner (`runCheckin`), the same alias, the same tools, the same records — no second implementation. The in-session check-in stands where `askSupervisor` stood in the trip path of `RunSession`: the call keeps its deadline bound, its cut on `workerStop` and on the agent's own escalation, and the decision switch after it (continue resumes, a message is delivered and arms the stuck rule, anything else stops the pod). Its outcome rides the landed types: a human ask is `OutcomeCheckinHuman`, a handover falls through the no-push path with `CheckIn` set, so the workflow records the `checkin` and `handover` steps unchanged. The dead moment is a `CheckInAsk` the workflow builds for the session after a ran-and-ended-without-a-push session; it runs through `checkinBlock` in that session's pod, before the coding conversation, exactly as the gate moment does. The records stay one writer each: the runner writes the `checkin` timeline step for a mid-session check-in whose session continues; the workflow writes it when the outcome rides `SessionResult.CheckIn`. No new pod shape, no new endpoints, no worker change, no new policy key.

**Tech Stack:** Go 1.2x, Temporal SDK (`go.temporal.io/sdk` v1.44.0), Postgres-backed tests through `/tmp/claude-1000/ladder/pg-docker.sh`, the gateway's `/v1/chat/completions` with OpenAI tool calls, `git` CLI, LiteLLM proxy (the `checkin` alias plan D landed).

**Spec:** [escalation-ladder-redesign-2026-10-15.md](../escalation-ladder-redesign-2026-10-15.md) — the roles table's check-in and coding-agent rows, "Where it runs" (in session: a second conversation inside the agent's own pod, read-only tools on the live workspace; the other two moments: the next session's pod before the coding conversation), "Limits in code" (calls per card and a budget share; the cheap cap and the wall clock decide without a call), "The handover note" (from the agent's report per finding and the gathered evidence; at most 2,000 characters; the top of the next session's brief), the three-moments statement in section 5, and section 7's decisions (tools in the check-in, one fresh session, in the agent's own pod). Records: [escalation-ladder-validation.md](../escalation-ladder-validation.md) section 2 — a record per check-in (moment, statement, tail size, every tool call, decision, evidence, cost), per handover (text and session that read it), per detector trip (outcome). Plans A, B, C and D are landed on main; plan D's `checkin.go` vocabulary, `runCheckin`, `checkinBlock`, the worker's three endpoints, the five `checkin_*` limits and the `checkin` alias are the ground this plan builds on.

## Design decisions this plan makes (the ones the task left open)

1. **Which trips reach the conversation.** The trip path already separates what code decides from what a call decides: a trip with `decided` set never calls (`TripCheapCap` climbs in place, the agent's escalation and info request redirect or escalate, the loop's nudge redirects, the stuck rule climbs). That separation is the design's "deterministic first response", and this plan does not move it. `TripWallClock` keeps its stop at the top of `onTrip`. Every other trip — `no_progress`, `repetition`, `no_write`, `same_failure`, `same_call`, `flip_flop`, `churn`, `spend_no_push`, `loop` when undecided, `shutdown`, and the scheduled `check_in` — goes to the in-session check-in. The scheduled `check_in` keeps "always asked"; "never counted" is obsolete with the per-session count it referred to: a scheduled check-in consumes the card's check-in budget as any check-in call does, and the budget is the check-in's own guardrail.
2. **What the in-session check-in may tell the running agent.** Four answers: `continue` (the session runs on, `sup.Resume`), `message` (the guidance is delivered through `r.message`, `sup.Messaged` arms the stuck rule, the text joins `messages` so the next check-in sees it), `handover` (the session stops gracefully and the note becomes the next session's brief), and `human`. It cannot switch models: the cheap cap climbs in code, and a check-in that wants a stronger model asks the human or hands over. `dropped_all` is refused at this moment and at the dead one — there are no findings to drop; the evidence rule's verdict machinery stays gate-only.
3. **Exhaustion and absence mid-session.** The per-card pre-check is the same arithmetic `checkinBlock` runs (`CheckinCalls`, `CheckinSpent` against `CheckinShareOf`): at the call cap or with the share spent, the outcome is the deterministic no-conversation `CheckHuman` record and the session stops on `OutcomeCheckinHuman` — the destination the supervisor's cap reached by its own road (escalate → human answer buys the next attempt). A provider that refuses every call mid-session continues the session (`called` false, the reason on the timeline): the design's own line for a check-in that cannot run — the round runs as if no check-in existed — and the next trip tries again. No model under the `checkin` purpose mid-session: continue, a log line, no record — the same shape the start path gives a missing alias.
4. **When the dead moment fires.** A session that ran and ended without a push: outcomes `no_push`, `redirect`, `retry_stronger`, `wall_clock`, and `day_cap` when allowed. Excluded: `not_started`, a refused day cap and a provider refusal (no agent ran, nothing to hand over — plan A's funding floor already refuses unfunded starts); `escalate` and `needs_info` (a human is already acting); any outcome whose result carries a `CheckIn` (a check-in already covered that session, and its note went where it decided); a hard activity error (no session id, and the heartbeat's dead-session finding already names the state). The flag is exclusive with the gate one by construction: when both hold, the gate ask wins and the dead session is the gate ask's parent record — the gate check-in reads the same transcript the dead one would have.
5. **What the dead check-in is asked.** No findings — verdicts on stop lines are meaningless. The ask carries the stop reason and the dead session's id; the check-in reads the dead session's record (its partial history is durable in S3, re-PUT per event) and the workspace in the fresh pod, then writes the handover or asks for a human. Its note is delivered through the landed start-of-session path (`/brief`, the `<<<HANDOVER>>>` section first), so the next conversation starts from it.
6. **Where the per-finding agent report lands.** In the session's own words, which already cross sessions: the brief's findings section gains one line telling the agent to end every session with a report per finding — `fixed`, `disputed` with a reason, or `open` — and the runner already carries the session's last message to the next input (`handoverLines`, fenced as the agent's own words, information, not instructions). No structured field, no extraction pass, no second model call: the check-in at both moments reads the report where it lies (the record's last message; the transcript tools), verifies it against the workspace, and never takes it on trust. The review is unchanged: what reaches it is the check-in's verdicts (plan D), not the agent's claims. Cost named: nothing renders the report on the card; a renderer that wants it can parse the record later.
7. **How a mid-session handover reaches the next pod.** `SessionInput` gains `Handover`. The workflow sets it from a session-moment `CheckHandover` outcome and `RunSession` pushes it through `/brief` in the no-ask branch, so the note is the brief's first section as the design says — not a finding line. When a gate or dead ask rides the same next session, the ask's check-in wins the brief and the note stays on the timeline (its `handover` step): a stale note must not sit above a fresh one. The dead and gate moments' own handovers are untouched — `checkinBlock` delivers those itself, to the pod that reads them.

## Conflicts between the design's letter and the code, resolved here

- **The statement and the persona are gate-worded regardless of moment.** `checkinStatement` opens "a round came back with findings, and you judge each one" for every moment, and `checkinSystem` fixes the answer's shape to `handover|human|dropped_all`. This plan makes both moment-aware: the gate text stays byte-identical (pinned by test), the session and dead moments get their own opening, rules and JSON shape. Cost: three persona constants and a branch in the statement builder, where the design's letter assumed one text.
- **The design's read-only in-session tools vs the `/tool` allow-list.** The worker's endpoint admits `run`, and the check-in's declared tool list includes it. In session, `run` is not read-only: the design says read-only tools on the live workspace. The session moment's declared list omits `run` and `runnerTools` refuses it when the pod is live; the worker endpoint is unchanged (the gate and dead moments keep `run`, where the pod holds no live conversation).
- **The design's dead-moment trigger list vs the landed outcome set.** The design names "crash, stop, refused". The landed workflow sees outcomes, not causes: a crash inside the activity is retried there and arrives as a heartbeat finding, not as an outcome; a refusal that starts no session has no record to hand over. The decided set is the five ran-and-ended-without-a-push outcomes above; the exclusions are named, not silent.
- **"Replaces the session supervisor's call" vs the shared machinery.** `SupervisorModel` is the client for the gate supervisor, the model review, the plan review and the audit; `Decision` and the action constants are the trip switch's vocabulary; `PurposeSupervisor`, the class's supervisor fallback and `Limits.SupervisorCalls` are load-time vocabulary a pinned policy must keep parsing for Temporal replay. This plan deletes only the session path's call — `askSupervisor`, `SupervisorInput`, `supervisorPrompt`, `parseDecision`, `sessionSupervision`, `SupervisorModel.Decide` and `SupervisorConfig.MaxCalls` — and what the compiler proves dead with them. The session supervisor as a role is gone; its name survives only where a pinned policy needs it to load.
- **The agent's report per finding has no landed carrier** (plan D's conflict, carried here by its ruling). Resolved as decision 6: a brief line and the last message, no struct. The design's carrier ("ends every session with a report") is kept in the weakest form that the check-in can actually read; the structured extraction is skipped until a reader needs it structured.
- **The note at "the top of the next session's brief" vs the landed delivery for mid-session handovers.** Landed, a check-in handover reaches the next session as `handoverLines` finding lines; only a start-moment note rides `/brief`. This plan adds `SessionInput.Handover` so the mid-session note takes the brief's first section as the design says, with the collision rule of decision 7. Cost: one field and one push, where leaving the landed shape would have made the mid-session note the only handover not at the top of a brief.

## Policy keys

None. The spend-without-push line is `no_push_spend` (landed in plan B); the check-in's five limits and the `checkin_model` class alias are landed in plan D and serve all three moments — the per-card call cap and budget share are shared across moments by design ("calls per card"). The infra repo gets nothing in this plan. A pinned policy that names `supervisor` or `supervisor_calls` keeps loading: the vocabulary stays in `policy` even where no code reads it.

## Global Constraints

- Code repo: `/home/womb/repos/ai-software-factory-code` (branch `main`). Infra repo: `/home/womb/repos/ai-software-factory-infra`. Docs repo: `/home/womb/repos/ai-software-factory`.
- Work in a git worktree of each repo, never the main working tree. Other sessions push to `main` while you work: `git pull --rebase origin main` before every push, and re-read a function before you edit it if the pull touched its file.
- Tasks commit to the plan's branch `ladder-e` only; the push to `main` is Landing's. Commit only your own files. End each commit message with `Co-Authored-By: Claude Code <noreply@anthropic.com>`.
- Before each commit run `gofmt -l .` (empty), `go vet ./...`, and the task's tests with `-race`. Before Landing run `bash check` (vet, gofmt, gosec v2.29.0, `make test`) — `make test` fails locally on the missing Postgres, known and by design.
- Postgres-backed tests: `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./internal/factoryd/ ...`. Plain `go test -race ./...` skips them.
- House style: minimal comments, no change narration, no legacy path or second implementation. Hand-derive expectations. Never edit an assertion to force a pass.
- Workflow code must stay replay-safe, on plan D's precedent: activities replay by recorded result, Temporal matches replayed commands by type and id, not by input, and an input struct's new fields decode as zero in old histories. Every workflow change below is additive state (`t.deadFrom`), a differently-built activity input (`CheckInAsk`, `Handover`, `LastGates`) or a branch on returned data (`SessionResult.CheckIn`); no new `workflow.GetVersion` gate. State it in review if you add one.
- One writer per record: a mid-session check-in whose session continues writes its `checkin` step runner-side; one whose outcome rides `SessionResult.CheckIn` is written by the workflow's `recordCheckin`, for every moment. No double steps.
- `SupervisorTail` keeps filtering the supervisor event kind, so a mid-session check-in's own record never lands in the next check-in's tail. The event kind keeps its historical name; this plan adds no harness event kind.
- A pinned policy version without the plan D keys reads their defaults; factoryd loaded on today's policy must keep loading it.

## Review Focus

Failure modes the spec implies and no single task's happy path covers. Each has a test in the task named.

1. A trip whose check-in conversation outlives the session's deadline must not resume a dead session: the deadline and the raced push supersede the check-in's answer before it acts (Task 3, `TestRunSessionCheckinAnswerSupersededByCap`).
2. The agent escalating during the check-in conversation must win over the conversation's answer, exactly as it did over the supervisor's (Task 3, extends `TestRunSessionWorkerStopCutsAnInFlightSupervisorCall`'s family).
3. A mid-session handover must never surface as an escalation, and a raced push must beat both the human ask and the handover (Task 3, `TestRunSessionCheckinHandoverStopsGracefully`; Task 4, `TestSessionResultPushBeatsCheckin`).
4. The stuck rule must stay deterministic: a check-in message arms it, and the trip after it climbs without a second conversation (Task 3, `TestRunSessionCheckinMessageArmsStuckRule`).
5. A dead check-in that refuses its calls must leave the next session startable and briefed-empty, never asked twice and never stuck waiting (Task 4, `TestWorkflowDeadCheckinRefusedRunsOn`).
6. A mid-session handover ahead of a gate or dead ask must be timeline-only, and the ask's pod must get the ask's own note, never both (Task 4, `TestWorkflowMidSessionHandoverBeforeAnAskIsTimelineOnly`).
7. The in-session check-in must not be able to edit: no `run` in its declared tools, and a live pod refuses the name even if the model insists (Task 2, `TestRunnerToolsLiveRefuseRun`).
8. Replay: a history recorded before this plan must replay unchanged — no ask where none was recorded, no step where none was written (Task 5, the live-history replay test stays green).

## Verified facts (commit `aa49ec0`, main)

| Fact | Where |
|---|---|
| `CheckInGate = "gate"` is the only moment constant, with the comment that plan E adds the other two on the same machinery | factoryd/checkin.go |
| `CheckInAsk` is `{Moment, ParentSession string; Findings []CheckFinding; Review *Review; Gates *GateResults}`; `CheckInOutcome` is `{Decision, ReasonKind, Reason, Handover string; Verdicts map[string]CheckVerdict; Remarks []string; Record *CheckInRecord}` | factoryd/checkin.go |
| `checkinStatement(ask, tail, callsLeft, eurLeft, handoverCap)` opens "You are the factory's check-in at the %s moment: a round came back with findings, and you judge each one before the next session is bought", interpolates `ask.Moment` into a gate sentence, and writes the verdict rules, the priors, the review and gates blocks, and the `<<<SESSION-TAIL>>>` markers | factoryd/checkin.go |
| `checkinSystem` is one constant carrying the gate persona and the answer's JSON shape with `"decision":"handover\|human\|dropped_all"`; `checkinTools` is the eight-tool list including `run`; `runCheckin` sends both on every call | factoryd/checkin.go |
| `parseCheckinAnswer(text, ask)` demands one verdict per finding the ask named, none for a finding it did not, and admits only the three decisions | factoryd/checkin.go |
| `runCheckin`'s refusal path returns `Decision: CheckHandover` with reason "check-in calls refused: …", a record, and no verdicts; its unreadable-answer path repairs once, then `CheckHuman` | factoryd/checkin.go |
| `checkinOutcome` cuts the note at `handoverCap`, upgrades a drop without evidence, and turns a `dropped_all` with a finding left standing into a handover | factoryd/checkin.go |
| `checkinBlock` reads `r.store.CheckinCalls` and `CheckinSpent` per card, computes `eurLeft = limits.CheckinShareOf(t.BudgetEUR) - spent`, returns a no-conversation `CheckHuman` with a record at the cap, fetches the parent record from `sessions/<task>/<parent>.jsonl`, pushes it through `/records`, and runs `runCheckin` on `cutTail(parent, limits.CheckinTailBytes())`; `CheckHandover` pushes the note through `/brief` and lets the session run, `CheckHuman`/`CheckDroppedAll` stop it | factoryd/runner.go |
| `runnerTools` answers `transcript_search`, `transcript_read`, `card_facts` and `gates` factoryd-side from the parent bytes and the ask; every other declared name posts to the worker's `/tool`; the `Tool` method's default branch is the post | factoryd/runner.go |
| The trip path: `onTrip` stops on `TripWallClock` first; a trip with `decided` set skips the call; otherwise `supervision.onTrip` runs inside a deadline-bounded `callCtx`, selected against the agent's escalations and `workerStop` | factoryd/runner.go |
| `sessionSupervision{max: sup.cfg.MaxCalls, decide: …}` counts per session and answers `ActionEscalate` at the max; its `decide` closure is `r.askSupervisor(...)` with `slices.Clone(messages)` | factoryd/runner.go |
| `askSupervisor` builds `SupervisorInput{Brief, Trip, Digest, Record: recorder.SupervisorTail(maxRecordTail), Model, Calls, MaxCall, Messages}` and calls `r.supervisor.Decide` under `policy.PurposeSupervisor`; it never fails (a refusal is an escalation) | factoryd/runner.go, factoryd/supervisor.go |
| After the call: `recordDecision` writes the `EventSupervisor` event, a `supervisor` timeline step through `r.record`, and `AlertSupervisorTrip` (skipped for the agent-ask trip kinds and `TripCheckIn`); the switch resumes on `ActionContinue`, climbs in place on `ActionRetryStronger` when `r.canClimb`, delivers and records `ActionMessage` then `sup.Messaged` and appends the guidance to `messages`, and stops the pod on anything else; the deadline passing during the call and a finished-and-pushed session during the call supersede the decision with a note | factoryd/runner.go |
| `SupervisorModel.Chat` serves the gate supervisor (`PurposeGateSupervisor`), the model review and the plan review (`PurposeReview`), and the audit (`PurposeAudit`); `Decision` and its action constants are used across the trip switch and `sessionResult` | factoryd/supervisor.go, gatesupervisor.go, gates.go, report.go, audit.go |
| `TripReport` is the digest's trip line type; `SupervisorInput`, `supervisorPrompt`, `parseDecision`, `maxRecordTail` and `sessionSupervision` have no user outside the session supervisor's call | factoryd/supervisor.go, runner.go |
| `SupervisorConfig.MaxCalls` is fed from `Limits.SupervisorCalls`; `SupervisorConfig.CheckIn` (the scheduled interval), the detectors, `sup.Resume`, `sup.Messaged`, `sup.Climbed`, `sup.Spent` and the stuck rule are detector machinery this plan keeps | factoryd/supervise.go |
| `watchLimits` returns `sup.Spent(spent, budget)` — `TripSpendNoPush` at `NoPushShare` with nothing pushed — into the same `onTrip` | factoryd/runner.go, supervise.go |
| `SessionRecorder` keeps the whole history in `history bytes.Buffer`, re-PUTs the object per event, exposes only `SupervisorTail(n)`, and is recorded from the session loop's own goroutine — the goroutine that runs the trip path | factoryd/session.go, runner.go |
| `sessionResult` returns `OutcomeCheckinHuman`/`OutcomeCheckinDropped` from `out.checkIn` before the pushed-commit checks; a `CheckHandover` falls through, so the outcome rides the ordinary no-push path with `CheckIn` set; the trip's stop report lands in `res.Findings` when `out.trip` is set | factoryd/activities.go |
| The workflow builds `in.CheckInAsk` when `checkinComing := t.gateFindings && t.cfg.Task.CheckIn > 0`, clears `t.gateFindings` after the call, and after the result runs `t.recordCheckin(res)` (the `checkin` step, and the `handover` step with the text and `res.SessionID` on a handover) and appends the verdicts to the priors | factoryd/workflow.go |
| `own = res.Findings`, plus `t.handoverLines(res)` only when no check-in was coming — "the check-in's handover replaces these"; `handoverLines` carries the branch line and `lastMessageLine + res.LastMessage`; `briefText` fences the last message as the agent's own words, information, not instructions | factoryd/workflow.go, opencode.go |
| `t.lastGates GateResults` is set by `onFindings` when a round gates; `SessionInput` has no gates or handover field today | factoryd/workflow_stages.go, workflow.go |
| The `OutcomeCheckinHuman` case asks the human with `"check-in: "+cmp.Or(res.CheckIn.ReasonKind, "gate")+": "+res.Reason` — the fallback names the gate moment | factoryd/workflow.go |
| The worker's `/tool` allow-list is exactly `read_file`, `grep`, `git_log`, `run`; `/brief` keeps the first note and drops late pushes; `/records` writes `.factory/sessions/<session>.jsonl` | cmd/agent-worker/checkin.go |
| `briefText` writes the `<<<HANDOVER>>>` section first when `brief.Handover` is set, before `LeftOut` and the findings | factoryd/opencode.go |
| `maxHandoverMessage` is 2,000 and cuts `res.LastMessage`; the handover cap for the note is `limits.CheckinHandoverCap()` (default 2,000) | store.go, policy |
| The plan D test rigs: `checkinRig` builds a runner with a scripted chat and fake kube/worker/object store; `scriptedChat` in checkin_test.go scripts the conversation's calls; the workflow tests script `RunSession` results through the harness's session closure | factoryd/runner_test.go, checkin_test.go, workflow_test.go |

## File structure

| File | New or touched for |
|---|---|
| `internal/factoryd/checkin.go`, `checkin_test.go` | Task 1 (the moments in the vocabulary) |
| `internal/factoryd/opencode.go`, `opencode_test.go` | Task 1 (the report line in the brief) |
| `internal/factoryd/session.go`, `session_test.go` | Task 2 (the transcript accessor) |
| `internal/factoryd/workflow.go`, `activities.go` | Tasks 2, 4 (`SessionInput.LastGates`, `SessionInput.Handover`, the dead moment) |
| `internal/factoryd/runner.go`, `runner_test.go`, `supervisor.go`, `supervisor_test.go` | Tasks 2, 3 |
| `internal/factoryd/ladder_replay_test.go` | Task 5 |
| `docs/architecture.md`, `docs/plans/2026-10-15-escalation-ladder-implementation.md` (docs repo) | Task 6 |

Order: Task 1 first (Task 3's statements name its constants). Task 2 is independent. Task 3 needs 1 and 2. Task 4 needs 3. Task 5 needs 4. Task 6 last.

---

## Task 1: The two moments in the check-in's vocabulary

What happens today. The check-in's persona, statement, answer shape and tool list are gate-worded for every `Moment`; `parseCheckinAnswer` admits only the three gate decisions.

**Files:**
- Modify: `internal/factoryd/checkin.go`
- Modify: `internal/factoryd/opencode.go` (`briefText`, the findings section)
- Test: `internal/factoryd/checkin_test.go`, `internal/factoryd/opencode_test.go`

**Interfaces:**
- Produces: `CheckInSession = "session"`, `CheckInDead = "dead"` beside `CheckInGate`; `CheckInAsk` gains `Trip *TripReport`, `Messages []string`, `Stop string` (all `omitempty`, so old inputs decode as zero); `CheckInOutcome` gains `Guidance string` (`omitempty`) — the message answer's instruction; `checkinSystemFor(moment string) string`; `checkinToolsFor(moment string) []CheckinTool`; `checkinStatement` branches on `ask.Moment`; `parseCheckinAnswer` validates per moment.

- [ ] **Step 1: Write the failing tests**

`checkin_test.go`:

`TestCheckinStatementMoments`: the gate statement keeps its exact opening line ("You are the factory's check-in at the gate moment: a round came back with findings, and you judge each one before the next session is bought") — pin the string, byte for byte. A session ask (`Trip` set to a `TripReport` for `churn` with its detail, `Messages` carrying one delivered guidance, `ParentSession` the live session) opens with the in-session sentence, names the trip kind and detail, lists the delivered guidance, and states the handover cap. A dead ask (`Stop` carrying a stop reason) opens with the dead sentence, names the stop, and states the handover cap with the note's required contents (what the earlier session did, the state of the branch, each finding with its verdict, what to do first, what not to repeat). None of the three contains another's opening line. All three end in the shared tail markers with the limits lines.

`TestCheckinSystemPerMoment`: the gate persona is byte-identical to today's `checkinSystem` (pin the string before touching it). The session persona's JSON shape names `continue|message|handover|human`, requires guidance for `message`, and says handover stops the session. The dead persona's shape names `handover|human`. Neither new persona mentions verdicts or `dropped_all`.

`TestParseCheckinAnswerMoments`: a session ask — `continue` with a reason parses; `message` without guidance fails; `message` with guidance parses and carries it; `handover` parses with an empty findings list; `dropped_all` fails; one finding with a verdict fails (unknown finding). A dead ask — `handover` parses; `human` parses; `dropped_all` fails; any finding fails. The gate ask rejects `continue` (unknown decision) — today's behavior, pinned so the moments stay separate.

`TestCheckinToolsForMoments`: the gate and dead lists are the eight names including `run`; the session list is the seven without it, each name's parameters unchanged.

`opencode_test.go` — `TestBriefAsksForTheReportPerFinding`: a brief with findings renders the line telling the agent to end the session with one line per finding — `fixed`, `disputed` with a reason, or `open`; a brief without findings does not render it.

- [ ] **Step 2: Run to verify they fail**

Run: `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./internal/factoryd/ -run 'CheckinStatement|CheckinSystem|ParseCheckinAnswer|CheckinTools|BriefAsksForTheReport' 2>&1 | tail -20`
Expected: compile FAIL (`undefined: CheckInSession`, `undefined: checkinSystemFor`).

- [ ] **Step 3: Implement**

1. `checkin.go`: the two moment constants beside `CheckInGate`, each with a one-line comment saying when it runs. The three `CheckInAsk`/`CheckInOutcome` fields.
2. `checkinSystemFor`: the gate branch returns today's constant unchanged. The session persona: `You are the factory's check-in inside a running session: its detectors tripped and you decide what happens next, on evidence you gather yourself from the live workspace and the session's record. You never edit anything. Your final answer is one JSON object and nothing else: {"decision":"continue|message|handover|human","guidance":"...","reason_kind":"...","reason":"...","handover":"..."}. "message" needs guidance: the exact instruction the agent should take next. "handover" stops the session: write the note the next session starts from. When only a human can act, name the reason kind and why, in one sentence, with the state of the work.` The dead persona: `You are the factory's check-in before a fresh session: the session before you ended without a result, and you write the handover it starts from. Read its record and the workspace as they are; you never edit anything. Your final answer is one JSON object and nothing else: {"decision":"handover|human","reason_kind":"...","reason":"...","handover":"..."}. When only a human can act, name the reason kind and why, in one sentence, with the state of the work.` Keep `checkinSystem` as the gate string; `runCheckin` sends `checkinSystemFor(ask.Moment)`.
3. `checkinStatement`: keep the shared section (the limits lines, the tail markers). Branch the opening and the rules:
   - gate: today's text, untouched.
   - session: `You are the factory's check-in inside session <ParentSession> of task <task>: the detector <Trip.Detector> tripped (<Trip.Detail>), and you decide what happens before the session continues. You never edit anything; you gather evidence and answer.` Then the rules list — continue, message (guidance carries the exact instruction), handover (the note to the next session is at most N characters), human (the four reason kinds as today). Then, when `ask.Messages` is non-empty: `Guidance delivered to the agent this session:` with one dash per message. Then one line: `The agent's report per finding is the last message in its record: what it fixed, disputed or left open. Verify it; never take it on trust.`
   - dead: `You are the factory's check-in before a fresh session of task <task>: the session <ParentSession> ended without a result: <Stop>. You never edit anything; you gather evidence and answer.` Then: `Your handover note to the next session is at most N characters. It names: what the earlier session did, the state of the branch, each finding with its verdict and the reason, what to do first, and what not to repeat. The agent's report per finding is the last message in its record; verify it, never take it on trust.`
   The findings, review and gates blocks stay gate-only (an empty findings list renders nothing — verify, and only touch what the tests force).
4. `checkinToolsFor`: gate and dead return today's list; session returns the seven without `run`. `runCheckin` sends `checkinToolsFor(ask.Moment)`.
5. `parseCheckinAnswer`: switch on `ask.Moment`. Gate: today's path. Session: decisions `continue`, `message`, `handover`, `human`; `message` requires non-empty `Guidance`; any finding (named or verdict-carrying) is an error; `dropped_all` is an error. Dead: decisions `handover`, `human`; findings and `dropped_all` are errors. `checkinAnswer` gains `Guidance string`.
6. `opencode.go`, the findings section of `briefText`: after the findings list, when `len(brief.Findings) > 0`, one line: `End the session with one line per finding you were given: fixed, disputed with the reason, or open.`

- [ ] **Step 4: Run the tests**

Run: `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./internal/factoryd/ 2>&1 | tail -5`
Expected: PASS — and `TestCheckinStatement`, `TestCheckinRunnerFinalAnswerShape` and the plan D tests stay green unchanged, which is the byte-identity proof for the gate text.

- [ ] **Step 5: Commit**

```bash
gofmt -l . && go vet ./... && git add internal/factoryd
git commit -m "checkin: the session and dead moments in the vocabulary - their persona, statement, answer shape and read-only tool list" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Task 2: The runner's inputs for a live check-in

What happens today. `SessionInput` carries the ask but neither the last round's gates nor a handover; `SessionRecorder` exposes only `SupervisorTail`; `runnerTools` posts every undeclared tool name to the pod, `run` included; the card-budget arithmetic lives inside `checkinBlock` only.

**Files:**
- Modify: `internal/factoryd/session.go`
- Modify: `internal/factoryd/workflow.go` (`SessionInput`, the in-build), `activities.go` (the `sessionSpec` build)
- Modify: `internal/factoryd/runner.go` (`sessionSpec` fields, `runnerTools`, `checkinBlock`'s budget lines out)
- Test: `internal/factoryd/session_test.go`, `runner_test.go`, `workflow_test.go`

**Interfaces:**
- Produces: `func (r *SessionRecorder) Transcript() []byte` (a copy of the history so far); `SessionInput.LastGates *GateResults` and `SessionInput.Handover string`; `sessionSpec.lastGates *GateResults`, `sessionSpec.handover string`, `sessionSpec.live bool`; `runnerTools.live bool` (a live pod refuses `run`); `func (r *Runner) checkinBudget(ctx context.Context, t Task, limits policy.Limits) (calls int, eurLeft float64, err error)` — the `CheckinCalls`/`CheckinSpent`/`CheckinShareOf` arithmetic `checkinBlock` and the in-session block share. The no-ask branch pushes `s.handover` instead of the empty brief.

- [ ] **Step 1: Write the failing tests**

`session_test.go` — `TestTranscript`: a recorder fed events returns the same JSONL bytes back; a second recorder started empty returns nothing; the returned slice is a copy (mutating it does not corrupt the history).

`runner_test.go` — `TestRunnerToolsLiveRefuseRun`: a `runnerTools` with `live` set answers `run` with an error naming the refusal, before any post leaves factoryd (the fake worker endpoint asserts no `/tool` call); `read_file` still posts. With `live` unset, `run` posts as today (the existing tool tests stay green).

`workflow_test.go` — `TestSessionInputCarriesLastGatesAndHandover`: a workflow whose last round gated passes `LastGates` pointing at the gates' results with the next `RunSession` input, and `Handover` empty; a workflow with no review yet passes nil; the no-ask branch's brief push carries the input's `Handover` (extend the harness's brief capture from plan D's empty-brief test).

- [ ] **Step 2: Run to verify they fail**

Run: `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./internal/factoryd/ -run 'Transcript|LiveRefuseRun|CarriesLastGates' 2>&1 | tail -20`
Expected: compile FAIL (`no field LastGates`, `unknown field live`, `no method Transcript`).

- [ ] **Step 3: Implement**

1. `session.go`: `Transcript()` returns a copy of `history.Bytes()`; comment: the live session's record for the in-session check-in.
2. `runner.go`: the `sessionSpec` gains `lastGates`, `handover`, `live` (set where the spec is built in `RunSession`: `live` is true from the moment the pod runs — the in-session check-in only ever runs against a live pod, so set it where the ask branch knows the pod is up; the honest form is a constant true at the single in-session call site, carried for the guard's readability — if that reads as ceremony, guard in `runnerTools.Tool` on the method's own construction instead and drop the field). `runnerTools.Tool`'s default branch refuses `run` when the pod is live: `run is not available to the check-in inside a live session; read instead`.
3. `checkinBlock`'s six budget lines become `calls, eurLeft, err := r.checkinBudget(ctx, t, limits)`; the helper holds the two store reads, the share arithmetic and the error logs, nothing else. `checkinBlock`'s behavior is unchanged (its tests stay green).
4. `workflow.go`: `SessionInput` gains `LastGates *GateResults` and `Handover string`. In the attempt loop's in-build: `if len(t.reviews) > 0 { g := t.lastGates; in.LastGates = &g }`; `in.Handover` is set in Task 4 — add the field now, leave it empty.
5. `activities.go`: the `sessionSpec` build carries `lastGates` and `handover` from the input; the `live == nil` branch's else pushes `s.handover` instead of `""`.

- [ ] **Step 4: Run the tests**

Run: `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./internal/factoryd/ 2>&1 | tail -5`
Expected: PASS — every plan D check-in test unchanged.

- [ ] **Step 5: Commit**

```bash
gofmt -l . && go vet ./... && git add internal/factoryd
git commit -m "checkin: the live session's transcript, the card-budget helper, and the session input's gates and handover" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Task 3: The in-session check-in replaces the supervisor's call

What happens today. Every undecided non-wall-clock trip calls `askSupervisor` through `sessionSupervision`; the answer's action drives the switch; `recordDecision` writes a `supervisor` step.

**Files:**
- Modify: `internal/factoryd/runner.go` (the trip path, `checkinLive`, `recordDecision`, the deletions)
- Modify: `internal/factoryd/supervisor.go` (delete the session supervisor's call machinery)
- Modify: `internal/factoryd/activities.go` (`sessionResult`'s check-in order, the mid-session handover branch)
- Test: `internal/factoryd/runner_test.go`, `checkin_test.go`, `activities_test.go`, `supervisor_test.go`

**Interfaces:**
- Produces: `func (r *Runner) checkinLive(ctx context.Context, t Task, s sessionSpec, ns, pod string, rec *SessionRecorder, trip *Trip, messages []string, workerStop <-chan struct{}, deadline time.Time) (d Decision, ck *CheckInOutcome, ride bool)` — the mid-session check-in. `d` is the action for the switch; `ck` is the conversation's outcome with its record (nil only when no alias); `ride` says the outcome stops the session and rides `SessionResult.CheckIn`. `Trip` carries the trip; the ask is `CheckInAsk{Moment: CheckInSession, ParentSession: s.id, Trip: &TripReport{Detector: string(trip.Kind), Detail: trip.Detail}, Messages: messages, Gates: s.lastGates}`. The statement's tail is `cutTail(rec.Transcript(), limits.CheckinTailBytes())`. Deleted: `askSupervisor`, `SupervisorInput`, `supervisorPrompt`, `parseDecision`, `maxRecordTail`, `sessionSupervision`, `SupervisorModel.Decide`, `SupervisorConfig.MaxCalls` — and whatever the compiler proves dead with them (`decodeAnswer` if nothing else calls it). Kept: `SupervisorModel`, `Chat`, `chatPayload`, `Decision`, the action constants, `TripReport`, the digest builder, and the policy vocabulary (`PurposeSupervisor`, `Limits.SupervisorCalls`, the class's supervisor fallback) that pinned policies load through.

- [ ] **Step 1: Write the failing tests**

Rewrite the supervisor-call tests to script the check-in instead — same trips, same expected actions, the rig's `scriptedChat` answering the session shape (the plan D rig `checkinRig` builds the runner; the supervisor-era rigs get the same treatment). The renamed set and what each pins:

`TestRunSessionTripRunsCheckinAndContinues`: a `repetition` trip, the check-in answers `continue` with a reason. Assert: one conversation on the `checkin` alias with the session moment in its statement and the trip named; the session runs on (`sup.Resume` seen); the `checkin` timeline step carries the decision, the record's moment `session` and the parent session = the session's own id; the `EventSupervisor` detail carries the record; the digest line lands as today.

`TestRunSessionCheckinMessageArmsStuckRule`: the check-in answers `message` with guidance. Assert: the worker received `/message` with the text; the guidance is in the timeline step's record and in the next trip's ask `Messages`; a second trip with no write since climbs (`RetryStronger`) without a second conversation — the stuck rule decided in code.

`TestRunSessionCheckinHandoverStopsGracefully`: the check-in answers `handover` with a note. Assert: the pod got its graceful stop (the worker pushed its work in progress — the rig's stop contract); the outcome is `no_push` (never `escalate`), `res.CheckIn.Decision` is `handover`, the note is the capped text, `res.Trip` names the trip; no runner-side `checkin` step (the workflow writes it); the `handover` record is in the outcome.

`TestRunSessionCheckinHumanEndsTheSession`: the check-in answers `human` with a reason kind. Assert the outcome is `checkin_human`, the record rides, no conversation-time human text is invented.

`TestRunSessionCheckinCapExhaustedIsDeterministic`: the card's check-in calls pre-spent past the cap. Assert: no call leaves factoryd, the outcome is `checkin_human` with reason kind `spend_above_policy`'s kind and a no-conversation record carrying the reason, the trip is named.

`TestRunSessionCheckinRefusedContinues`: the scripted chat errors every call. Assert: the session continues, `called` false, the timeline step's reason starts "check-in calls refused", the record shows zero model answers; and the NEXT trip retries the conversation (the rig's second scripted chat succeeds).

`TestRunSessionCheckinNoAliasContinues`: no model under the `checkin` purpose. Assert: continue, a log line, no `checkin` step, no record — and the trip itself still ends the session when its own semantics say so (an undecided trip with no check-in and no decision does not exist — pin that the trip is recorded with its deterministic continue reason).

`TestRunSessionCheckinAnswerSupersededByCap`: the scripted chat sleeps past the deadline. Assert: the wall-clock trip supersedes, the outcome is `wall_clock`, the check-in's record still landed (the conversation is recorded even when its answer is not acted on), the note is the superseded comment.

`TestRunSessionAgentEscalationBeatsCheckin`: an escalation arrives during the conversation. Assert: the agent's ask wins, exactly as the supervisor-era test pinned, and the check-in's answer is unread.

`TestRunSessionLiveToolsRefuseRunInConversation`: the check-in's scripted answer calls `run`; the conversation shows the refusal as the tool error and no `/tool` post leaves factoryd.

`TestRunSessionSpendWithoutPushRunsCheckin`: the plan B spend trip now reaches the conversation (rename of `TestRunSessionSpendWithoutPushAsksTheSupervisor`, same trip, new answer set).

`TestCheckinLiveStatementCarriesMessages`: the ask built for the second trip carries the first message's guidance (through the rig's recorded asks).

`supervisor_test.go`: delete the three `TestSupervisorModel*` tests with `Decide`.

- [ ] **Step 2: Run to verify they fail**

Run: `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./internal/factoryd/ -run 'TripRunsCheckin|CheckinMessage|CheckinHandoverStops|CheckinHumanEnds|CheckinCapExhausted|CheckinRefused|CheckinNoAlias|AnswerSuperseded|EscalationBeatsCheckin|SpendWithoutPush' 2>&1 | tail -20`
Expected: FAIL — the renamed tests fail against the supervisor call (wrong alias, wrong statement), before the code changes.

- [ ] **Step 3: Implement**

1. `runner.go`, the `decide` closure in `RunSession`: replace `sessionSupervision` with the direct call — `d, ck, ride := r.checkinLive(callCtx, t, s, ns, podName, recorder, trip, messages, workerStop, deadline)` (the closure keeps `called` from `ck != nil` plus the refused case; read the switch's uses of `called` first and carry them). The per-session count is gone; the card's budget is the cap.
2. `checkinLive`: the pre-check (`checkinBudget`, the alias lookup) mirrors `checkinBlock`: at the cap or with the share spent, return the no-conversation `CheckHuman` outcome with its record and `ride`; no alias, return `Decision{Action: ActionContinue, Reason: "no model under the check-in's purpose"}`, nil, false. Build the ask, push nothing to the pod (the transcript rides factoryd-side; the coding agent needs no record of itself), run `runCheckin` on `cutTail(rec.Transcript(), limits.CheckinTailBytes())`, then map: `continue` → `ActionContinue` with the reason; `message` → `ActionMessage` with `Guidance`; `handover` → the outcome with `ride`; `human` → the outcome with `ride`; refused (the refusal shape: `CheckHandover`, empty note, no verdicts) → `ActionContinue` with the refusal reason, `ride` false.
3. The trip switch in `onTrip`: keep the wall-clock stop and the `trip.decided` shortcut. After the call, before the action switch, evaluate the two supersede conditions first — the deadline passing, and the session having finished and pushed during the conversation — and in both cases clear the outcome (`ck = nil`), stop as today, and keep the record (the conversation is recorded even when its answer is not acted on). Then the new case: when `ride` is set, stop the pod gracefully and return — the outcome rides. Then today's cases unchanged: continue resumes, the climb climbs, the message delivers and arms, the default stops. The `note` strings that said "during the supervisor call" say "during the check-in".
4. `recordDecision`: the event detail carries the outcome's record when there is one (the decision, the reason, the record — moment, calls, cost), else today's decision detail. The timeline step is `checkin`, not `supervisor`, and is written here only when the session continues (`ride` false and an outcome or a deterministic reason exists) — the workflow writes the step when the outcome rides. The alert rule is unchanged (skip the agent-ask kinds and `TripCheckIn`; `ResolvedBy` names `checkin` where the mid-session path resolves one).
5. `sessionResult` in `activities.go`: move the two pushed-commit checks above the `out.checkIn` switch (behavior-neutral at the start moment, where no conversation has run and nothing is pushed; decisive in session, where a raced push must beat the check-in's answer). Add, after them: a mid-session handover branch — `out.checkIn` a `CheckHandover` with `out.trip` set yields today's no-push shape with the summary "check-in: handover after <trip kind>", before the trip-and-decision branch could read it as an escalation. The `"supervisor: %s after %s"` summary prefix becomes `"check-in: %s after %s"`.
6. Deletions in `supervisor.go` and `runner.go` per the interfaces line. `supervisorConfig` stops setting `MaxCalls`. Nothing in `policy` changes.
7. The existing supervisor-era tests not renamed (`TestRunSessionSupervisorSanitisesAnOutsidersBrief`, `TestRunSessionDropsWorkerSupervisorEvents`, `TestRunSessionCapCutsOffASlowSupervisor`'s non-call parts) keep their subjects: the brief sanitisation is the gateway's, the worker-event drop is the recorder's, the cap cut is the call contract's — re-point them at the check-in conversation where they scripted the supervisor.

- [ ] **Step 4: Run the tests**

Run: `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./internal/factoryd/ 2>&1 | tail -5`
Expected: PASS. `go build ./...` shows no dead reference to the deleted symbols.

- [ ] **Step 5: Commit**

```bash
gofmt -l . && go vet ./... && git add internal/factoryd
git commit -m "checkin: the in-session moment replaces the supervisor's call - continue, message, handover or human, with the deterministic first responses kept in code" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Task 4: The dead moment and the mid-session handover's delivery

What happens today. A session that ran and ended without a push hands its stop lines and last message to the next input; no check-in runs for it; a mid-session handover's note cannot reach the next pod.

**Files:**
- Modify: `internal/factoryd/workflow.go` (`taskRun.deadFrom`, the attempt loop, `deadAsk`, the ask fallback)
- Test: `internal/factoryd/workflow_test.go`

**Interfaces:**
- Produces: `taskRun.deadFrom string` (the dead session's id, workflow-local); `func (t *taskRun) deadAsk(stop string, gates *GateResults) *CheckInAsk` — `Moment: CheckInDead`, `ParentSession: t.deadFrom`, `Stop: stop`, the gates when a review exists; the loop's `checkinPending := (t.gateFindings || t.deadFrom != "") && t.cfg.Task.CheckIn > 0` governs the ask, the `own` skip and the handover delivery. The `OutcomeCheckinHuman` case's ask names `res.CheckIn.Record.Moment` in its fallback instead of the literal `"gate"`.

- [ ] **Step 1: Write the failing tests**

`workflow_test.go`, on the harness (scripted sessions, captured inputs, the check-in outcomes plan D's harness extensions already carry):

`TestWorkflowDeadSessionGetsCheckin`: a first session ends `no_push` (a trip, a last message, no check-in). Assert the second `SessionInput`'s `CheckInAsk` is a dead ask: moment `dead`, `ParentSession` the first session's id, `Stop` the first session's summary, `Findings` empty; the second session's scripted result is a dead-moment check-in ending `handover` — assert the third `SessionInput` has no ask and the workflow recorded the `checkin` step and the `handover` step carrying the note and the second session's id (the session that read it).

`TestWorkflowDeadCheckinHumanStopsBeforeTheConversation`: the dead check-in answers `human`. Assert the escalation's reason names the dead moment (not `gate`) and the reason kind; no third session.

`TestWorkflowDeadCheckinRefusedRunsOn`: the dead check-in's conversation is refused. Assert the second session still starts (the empty brief), its input carries the first session's stop lines (the `own` lines survive a refused dead check-in), and no ask rides the third input from a stale flag.

`TestWorkflowGateAskWinsOverDead`: the first session ends `no_push` and red checks arrive in the same round. Assert the second input's ask is the gate ask (moment `gate`) whose parent is the first session's id, not a dead ask.

`TestWorkflowMidSessionHandoverRidesTheBrief`: a first session's scripted result carries `CheckIn` (a session-moment handover with a note and a record) and a trip. Assert the second `SessionInput`'s `Handover` is the note; its findings hold the stop lines but no `the agent's last message:` line and no `the branch holds` line; the `handover` step is recorded.

`TestWorkflowMidSessionHandoverBeforeAnAskIsTimelineOnly`: the same first session, but the second round has gate findings pending. Assert the second input's `CheckInAsk` is the gate ask, `Handover` is empty, and the `handover` step still exists (the note is on the timeline).

`TestWorkflowConfirmedTwicePathUnchanged`, and every plan D workflow test: green unchanged — the gate moment's shape is not touched.

`activities_test.go` — `TestSessionResultPushBeatsCheckin`: a `sessionOutcome` with a check-in that said `human` and a result that finished and pushed. Assert the outcome is `pushed` with the commit, the check-in riding; the same with a handover check-in. And the mid-session handover branch: a check-in handover with a trip and no push yields `no_push` with the check-in riding and the handover summary.

- [ ] **Step 2: Run to verify they fail**

Run: `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./internal/factoryd/ -run 'WorkflowDead|GateAskWins|MidSessionHandover|PushBeatsCheckin' 2>&1 | tail -20`
Expected: FAIL (`deadFrom` unset, `Handover` never delivered, the pushed result loses to the check-in switch).

- [ ] **Step 3: Implement**

1. `workflow.go`: `deadFrom` beside `gateFindings`. In the attempt loop:
   - the in-build: `checkinPending := (t.gateFindings || t.deadFrom != "") && t.cfg.Task.CheckIn > 0`; the ask is `t.checkinAsk(...)` when `t.gateFindings`, else `t.deadAsk(reason, gates)` when `t.deadFrom` — the gate ask wins, and the dead session is already the gate ask's parent because `parent` tracks the last session. `if !checkinPending { in.Handover = handoverNote }`; `in.LastGates` as Task 2 built it.
   - after the `RunSession` call, beside `t.gateFindings = false`: `t.deadFrom = ""`.
   - after the result, beside the `own` line: when `!res.StartFailed && res.CheckIn == nil` and the outcome is `no_push`, `redirect`, `retry_stronger`, `wall_clock` or the allowed `day_cap`, set `t.deadFrom = res.SessionID`; the `own` skip reads `if !checkinComing && !midNote { own = slices.Concat(own, t.handoverLines(res)) }` where `midNote` is `res.CheckIn` a session-moment handover; and `handoverNote` (a loop variable beside `own`, guarded by the same `!res.StartFailed`) takes that note for the next in-build.
   - the `OutcomeCheckinHuman` case: the fallback in the ask becomes `cmp.Or(res.CheckIn.ReasonKind, cmp.Or(res.CheckIn.Record.Moment, "gate"))` with a nil-record guard.
2. `deadAsk` beside `checkinAsk`; comment: the dead moment — no findings, the stop reason, the handover is the ask.
3. `activities.go`: the two pushed checks above the check-in switch and the mid-session handover branch — Task 3 owns the code, this task's tests pin the workflow-visible shapes; if Task 3 landed them, this step is reading and the tests are the deliverable.

- [ ] **Step 4: Run the tests**

Run: `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./internal/factoryd/ 2>&1 | tail -5`
Expected: PASS — and `TestWorkflowReplaysLiveHistories` stays green: no ask or step appears in a history recorded before this plan.

- [ ] **Step 5: Commit**

```bash
gofmt -l . && go vet ./... && git add internal/factoryd
git commit -m "checkin: the dead moment writes the next session's handover, and a mid-session handover rides the brief" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Task 5: The replay scenarios of the new moments

What happens today. `ladder_replay_test.go` replays the eight problems' cards with the gate check-in. The new moments have no scenarios.

**Files:**
- Modify: `internal/factoryd/ladder_replay_test.go`

**Interfaces:**
- Produces: three scenarios beside the eight, each with its fixtures hand-derived and its steps asserted from the timeline, in the file's recorded-answer ledger style.

- [ ] **Step 1: Write the scenarios**

`churn round, in-session`: a session circles writes (`flip_flop`, then `churn` after a message); the first check-in answers `message` with a correction, the second trip after the delivered message with no write climbs (the stuck rule, no second conversation); the retried session pushes and the round verifies. Assert: two conversations at most, the guidance in the second ask, the climb in the timeline, the card merged.

`spend without push`: the card passes `no_push_spend` with nothing pushed; the check-in reads the workspace, finds the work uncommittable, answers `handover`; the next session starts from the note, commits, and the round verifies. Assert: the trip's outcome line, the `checkin` and `handover` steps, the note at the top of the next brief's capture, the merge.

`dead session`: a session runs to its wall clock with work in progress and no push; the time cap grants no extra time; the next session's dead check-in reads the dead record and writes the handover; the following session finishes from it. Assert: the dead ask's parent and stop, the `handover` step naming the reading session, the finish.

Each scenario records its asks, answers, steps and session counts in the ledger comment, as the eight do; where a fixture cannot produce the design's literal line through landed code, reshape the fixture and say why in the comment — no assertion bends.

- [ ] **Step 2: Run**

Run: `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./internal/factoryd/ -run 'TestLadderReplay' 2>&1 | tail -10`
Expected: PASS — the eleven scenarios together.

- [ ] **Step 3: Commit**

```bash
gofmt -l . && go vet ./... && git add internal/factoryd
git commit -m "checkin: replay scenarios for the in-session and dead moments" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Task 6: Architecture notes (docs repo)

**Files:** Modify `/home/womb/repos/ai-software-factory/docs/architecture.md` (the supervision paragraphs only), `/home/womb/repos/ai-software-factory/docs/plans/2026-10-15-escalation-ladder-implementation.md` (its State section and the defaults table's note).

- [ ] **Step 1:** `architecture.md`: wherever the session supervisor is described as the trip path's caller, say the in-session check-in: a second conversation in the agent's own pod on the `checkin` alias, read-only on the live workspace, deciding continue, message, handover or human; the wall clock, the cheap cap, the stuck rule and the agent's own asks decide in code; the per-card budget caps all moments together. Where the handover is described, name the dead moment and the mid-session note's path to the brief. Name what was deleted (`askSupervisor` and its per-session count) and what stayed (`SupervisorModel` for the gate supervisor, the review and the audit; the policy vocabulary a pinned policy loads).
- [ ] **Step 2:** the notes file's State section: plan E landed, what it added, the accepted degradations (a restart between a no-push outcome and the next session loses the dead ask, as `gateFindings` degrades; a mid-session handover ahead of a gate or dead ask is timeline-only; a refused dead check-in starts the session on the stop lines alone). The defaults table: no new keys — a line saying plan E shares plan D's five and plan B's `no_push_spend` across all three moments.
- [ ] **Step 3:** commit to the docs branch and push `origin` and `forgejo` (the docs repo's remotes; there is no `github` remote here).

## Landing

1. `git pull --rebase origin main` in the worktree; resolve; re-run the full factoryd suite.
2. `bash check` — vet, gofmt, gosec, `make test` (fails locally on the missing Postgres: known, by design; the race suite below is the Postgres proof).
3. Full race suite: `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./... 2>&1 | tail -30`, and `go test -race ./cmd/agent-worker/` separately (no Postgres, but re-verified on the final tree).
4. Fast-forward `main` to the branch, push to `origin` and `github` (the code repo's two remotes).
5. Roll the factoryd image per the infra repo's process; watch the roll to Ready. No infra keys exist for this plan — the `checkin` alias and the five limits are live since plan D; nothing lands in `policy.yaml` or the schema. The watch's lesson from plan D applies: judge the roll by the workload's state, not by a probe that cannot see the thing, and re-arm the watch if it expires before the roll settles rather than reading silence as success.
6. After the roll, one live probe on a scratch card: a session whose detector trips (the cheapest honest way is a card whose first round circles), and read the timeline for the `checkin` step with moment `session`. A not-verified item stays until that probe runs.
7. Not verified by this plan, named: a live in-session check-in on real traffic (the probe above is the minimum); the gateway's behavior with two conversations on one card's account at once (the coding conversation holds while the check-in reads — the alias's rate limits are untested in that shape); the console's rendering of a `checkin` timeline step written runner-side (the step shape matches the workflow's; no template names it); `SessionRecorder.Transcript`'s cost on a multi-megabyte record (a copy per check-in, a handful per session).

## Final verification (after Task 6)

- `/tmp/claude-1000/ladder/pg-docker.sh go test -race ./...` — every package `ok`.
- `bash check` — vet, gofmt, gosec silent; `make test` failing only on the local Postgres.
- `git log --oneline main ^origin/main` empty after the push; the worktree deleted.
- The replay suite's eleven scenarios pass on one tree.
- A pinned policy from before plan D still loads (the factoryd image starts against today's `policy.yaml` — the roll proves it).

## Self-review

**Spec coverage:** the three moments — the gate one landed (plan D), the in-session and dead ones here, each on the landed machinery with a different `Moment` and statement, no second implementation (decision 1's rule is the trip path's own separation; Tasks 1, 3, 4). Read-only tools in session (Task 1's list, Task 2's refusal, Review Focus 7). The deterministic first responses in code: wall clock, cheap cap, stuck rule, agent asks (Task 3 keeps the switch's order). Limits: calls per card and a budget share, shared across moments (no new keys — stated). The handover note: from the agent's report and the evidence, at most 2,000 characters, the top of the next brief (Tasks 1, 3, 4; decision 6 and 7). The records the validation doc names: per check-in (moment, statement, tail size, calls, decision, evidence, cost — the record rides every outcome), per handover (text and the session that read it), per detector trip (the outcome on the timeline). The human asked only when only a human can act: the four reason kinds, the deterministic `CheckHuman` at exhaustion. Every AI step limited in scope with its own evidence rule where it judges: the session moment judges the trip's next step, not the round; the dead moment writes one note; the evidence rule's verdicts stay gate-only.

**Placeholders:** none — every interface above is a named symbol with a home; the two "read first, only touch what the tests force" lines are reading instructions, not stubs.

**Type names:** `CheckInSession`, `CheckInDead`, `CheckInAsk.Trip/Messages/Stop`, `CheckInOutcome.Guidance`, `checkinSystemFor`, `checkinToolsFor`, `SessionRecorder.Transcript`, `SessionInput.LastGates`, `SessionInput.Handover`, `sessionSpec.lastGates/handover/live`, `runnerTools.live`, `checkinBudget`, `checkinLive`, `taskRun.deadFrom`, `deadAsk`, `checkinPending` — each used in exactly the task that defines it and the tasks that follow.
