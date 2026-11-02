# Unpayable sessions: one floor at the opening, and the enforced task money everywhere

Written 2026-11-02. Status: plan, awaiting Sebastian's OK. Nothing changed.
This is fault 3 of docs/needed-fixes.md. Code references are to the code
repository's main at a0e2803e; the incident figures are from the live cluster's
database, read 2026-11-02.

## What happened

On card #1345 (2026-10-31) the task had between €0.03 and €0.44 left. The
factory still granted and opened planner sessions. Each one opened, spent
what was left mid-call, and died on an HTTP 402 from the gateway. Four
openings burned €0.53 and filed nothing. Every grant bought another dead
opening instead of an honest ask for money.

The live event log gives the evening's shape. All 26 sessions of the task ran
premium. At 19:17:53 the attempt floor refused a 66,685-byte planner call
with 0.025227 EUR free and named every axis. At 19:48:06 a comment arrived
through the webhook (actor controller) and was taken as the answer to the
standing session-cap ask; a session opened at 19:49:01. At 19:50:59 Sebastian
granted a session through the chat — that grant ran the console's budget
floor and passed it — and the session opened at 19:51:25, cost €0.12, and
died. The same shape repeated through 20:17. The task ended 20:19:26 and the
settle pass booked its true spend at 22:20: 6.1824 EUR.

The task's budget that evening reads card_funded +0.60 at 00:06 (5.00 to
5.60, the only fund event) and a later event-less +2.00 to 7.60 written by
the size gate's budget writer (SetTaskSizeBudget, store.go:1358, no event).
The sibling defect the handover names is real: money the gateway had taken
(holds and unreconciled provider truth) was not in the task row's figures
while the evening ran, so the numbers the grants and the humans saw were
richer than the money.

## The mechanism

Four gaps, each verified on main:

1. **The plan loop opens sessions with no floor at all.** The one pre-session
   floor, `t.unfunded` (workflow.go:2569, SessionFunded since
   versionSessionLadder), is consulted only in the agent session loop
   (workflow.go:1864). The plan loop (plan.go:1747) dispatches
   ActivityRunPlan (plan.go:1885) into RunPlan (plan.go:2297) and
   reportSession (report.go:135) with no floor anywhere on the path. The
   report session at a task's finish and the holdout audit's session run the
   same unfloored helper. Every opening that is not an agent session is
   unfloored.

2. **The doors that buy sessions are inconsistent — and doors are the wrong
   place.** The chat's grant and the card's answer form run the floor
   (`doGrantSession` actions.go:1133, `doAnswerValue` around actions.go:853);
   the extend form (actions.go:932), a plain comment on the card
   (doHumanAnswer, actions.go:984) and a webhook-delivered answer (the 19:48
   comment above) do not. The console's floor also skips every card with no
   session yet (`t.ModelAlias == ""`, actions.go:1206) on the strength of a
   comment that is false for plan tasks: the workflow's floor does not cover
   them, gap 1.

3. **The money humans and agents see is the settled row, not the enforced
   money.** `tasks.spent_eur` is the ledger sum: the gateway books every
   call's cost through ReleaseHold, row and ledger in one transaction
   (server.go:892 into holds.go:699), and the settle pass repairs the sum
   (spendFromLedger, store.go:2039). While a call flies, its money is a hold
   — counted by the gateway's TakeHold and by the floor's free
   (readTaskFree, holds.go:633, nets holds), invisible to every figure a
   person decisions on: the board's Left (board.go:2027) and NearBudget
   (board.go:1583), the chat's card view (chat_tools.go:739), the
   brief-short line (approvals.go:147), the chat budget message
   (chat_budget.go:94), and the facts line the session itself reads
   (runner.go:642). The provider-truth delta reconciles only at the settle
   pass, which demands a finished task (UnsettledTasks, store.go:1972).

4. **The floor that ran passed anyway.** The 19:50:59 grant ran the console
   floor with the premium alias (all 26 sessions premium, so the row's
   model_alias was never empty) and a need of at least the frontier floor,
   0.60 EUR in the policy of that night. It passed because its free read was
   richer than the enforcer's: fault 6's frozen month cap had the gateway
   enforcing version 971's €544 while the floor read the current version,
   and gap 3's in-flight money kept the row's figures high. The sessions then
   died on the gateway's refusals. Fault 6's fix removes the skew; this plan
   closes the coverage and the figures.

## The fix

One guard where the money is spent, the ask that fires as the money ask, and
the enforced task money on every surface that decides on it.

### A. The floor at every opening

Every session opens through one of two functions: the agent activity
`RunSession` (activities.go:798) and the helper `reportSession`
(report.go:135), whose callers are three activities — the planner's RunPlan
(plan.go:2297), the report's RunReport (report.go:60) and the holdout audit
(holdout.go:535). `runSession` has no other caller, `NewSessionRecorder`
none but it. Both functions gain the same guard at their head, in the
fresh-session path (a reattached session is already open and paid into),
before the Forgejo token mint each makes (activities.go:932 inside the
`live == nil` branch, report.go:170): `r.funded(ctx, t.ID, model, true)`
(activities.go:638) — it resolves the class's session model from the task's
capabilities (activities.go:653), prices the largest recorded opening of
the newest 20 sessions on the alias (ReadOpening, holds.go:414) and the
policy floor of the rung, and checks all axes with holds netted.

A refusal returns through the channel that already exists for a session that
could not start: `startFailure{step, text}` (runner.go:1699) gains a
`stepBudget` beside the image and egress steps (the const block at
runner.go:1662, the switch in `escalation()` at runner.go:1732), and the
escalation's wording for it states the money — the template's sandbox prefix
does not fit a budget refusal — with the action "Fund the card (Fund on the
board) and answer". In `RunSession` the guard sits before `runSession` builds
its outcome, so it returns the `SessionResult` directly in the existing
shape (`sessionResult`, activities.go:1083: OutcomeEscalate, the escalation
as reason, StartFailed). RunPlan already turns `end.start` into an
escalation (plan.go:2364), the plan loop counts it as no attempt
(plan.go:1910, the day-cap first-call pattern; the StartFailed branch at
plan.go:1933 sets the ask) and escalates the refusal text; the agent loop
maps the same outcome to its ask (workflow.go:2236). A day-cap refusal keeps
the automatic day wait: the loops branch on DayCapped, as the agent loop
does at workflow.go:1865. The agent loop's pre-dispatch check
(workflow.go:1864) stays; the new guard is its race catcher. The report and
holdout sessions get the same refusal: a task that cannot pay its report
says so, and the escalation names the Fund action.

Activities are not replayed, so no workflow version gate rides on A.

### B. The ask fires as the money ask

At the plan loop's ask points (the session-cap branch, plan.go:1805, and the
re-ask after a refused session): consult `t.unfunded(model)` first. A
refusal that is not the day cap becomes the ask itself — the budgetRefused
text already says "Raise the budget (Fund on the board) and answer" and
names the outstanding holds and the missing euros. The session-cap card
stays for the funded case. One new workflow version marker (the
versionSessionLadder pattern) so replays do not diverge.

Fault 4's plan shapes what this ask carries (the budget stop's five parts,
question.go:400); this plan decides when it fires. The two compose.

### C. The enforced task money on every surface

The task axis gets what 13d47231 gave the caps' axes: one read of the
enforced left — budget minus spent minus outstanding holds, the TaskFree
shape (holds.go:633) — and every figure a human or an agent decisions on
reads it:

- The board's Left and NearBudget (board.go:2027, 1583): the board's task
  read (boardTaskQuery, console_store.go:95, feeding BoardTasks) gains the
  holds aggregate, one LEFT JOIN and a BoardTask field, no per-card queries
  and no port detour — the console's Tasks port is the store itself
  (cmd/factoryd/main.go:567).
- The chat's card view (chat_tools.go:739), the brief-short line
  (approvals.go:147) and the chat budget message (chat_budget.go:94-175):
  the enforced left through the existing ports, the Costs.Enforced shape
  (ports.go:64).
- The session's own facts line (runner.go:642): SpentEUR becomes the
  enforced spend, one store.Free read beside the task read the activity
  already makes.

`tasks.spent_eur` itself stays the settled ledger sum — the settle
invariant, unchanged. The caps and TakeHold already count enforced money; no
schema change.

### D. The console's alias skip narrows

`unfundedSession` (actions.go:1205) skips when the row carries no model
alias. The model the card's next session would run on is resolvable without
it: `funded` resolves the class's session model from the task's capabilities
(activities.go:653). Export that resolution (a SessionModelOf helper beside
SessionFunded) and skip only when it resolves to nothing — a class with
neither an alias nor a session model. A session-less plan card then gets its
money ask from the console too, instead of a silent pass.

## Tests

Hand-derived, the handover's two first:

1. A grant with headroom under the opening price yields a fund ask and no
   session. Plan-loop test: the card at its cap, the floor's need above the
   free — the posted ask is the budgetRefused text (names Fund and the
   missing euros). A grant answer dispatches RunPlan; the guard refuses at
   stepBudget; no sessions row is inserted, no pod is created, the attempt
   is not consumed, and the card waits on the money ask again.
2. A session that dies mid-call leaves the task row matching the gateway's
   ledger. Store test: a hold taken, the streamed cost released through
   finish's ReleaseHold — spent_eur equals the ledger sum. While the hold
   stands, the enforced left is budget minus spent minus held, the figure
   TakeHold refuses on; the board, chat and facts surfaces render it (feed a
   TaskFree, assert the shown left).
3. The unfloored doors: an extend, a plain comment and a webhook answer on
   an unfunded card land as answers, no session opens (A refuses at the
   opening), and the card's next ask is the money ask.
4. The race: the agent loop's pre-check passes, spend moves before the
   opening — the start failure carries the refusal, no session row.
5. D: a session-less planner card under the floor — `unfundedSession`
   refuses with the money ask, not the empty pass.
6. The floor stays off when no prices are configured (funded's nil-Prices
   path, activities.go:646) — a dev factory opens sessions as before.

## Alternatives considered

- **Floors at every door** (extend, comment, webhook, chat): rejected. The
  doors multiply, new ones arrive, and the incident's floored door passed
  anyway. The opening is one place and every door routes through it.
- **A higher policy floor**: rejected. A constant high enough to be safe
  everywhere blocks cheap cards. The recorded-opening read already prices
  real openings; what was missing was coverage and truthful figures, not a
  bigger number.
- **The gateway booking the row from provider truth continuously**
  (write-side): rejected. ReleaseHold already books row and ledger
  atomically; the provider-truth delta is reconciled at settle by design
  (LiteLLM's log is the provider's own account). The enforced read closes
  what humans and floors see, without a second writer of the row.

## Out of scope

- Fault 6's frozen month cap — its own register entry; its fix removes the
  policy skew that let a passed floor die on a 402.
- The sweep's conservative booking (an expired hold books in full; the
  finish settle trues it down). Conservative direction, by design.
- The event-less budget write: the size gate moved this card's budget 5.60
  to 7.60 with no event, which is why the evening's true headroom had to be
  reconstructed from the ledger. Registered as its own fault (entry 12).

## Cost and risk

- One funded read per session opening — the newest-20 opening scan the
  console floor already makes on every grant — and one holds aggregate on
  the board's task read.
- A recorded monster opening on the alias prices the floor high for every
  card on it (ReadOpening is factory-wide, newest 20 on the alias). The
  refusal names the measure and offers Fund; the alternative is the burned
  opening.
- The ask swap (B) must not fire on the day cap — the DayCapped branch
  keeps the automatic wait — and rides a version marker for replay.
- The enforced left can shock the eye: a card mid-flight shows less left
  than the settled row did. That is the point; the meter and the caps stop
  together, the lesson of the month meter (13d47231).
