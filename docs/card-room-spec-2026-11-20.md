# Give a card more room: one control for every ask about a card's resources

**Status:** design, approved approach, written 2026-11-20. Code main at `9754c6afb`, after "Every card readable".

**Code:** `~/repos/ai-software-factory-code`. Paths below are relative to its `internal/`.

## 1. Intent

A human wants to give a card more room, before it stops and when it stops, with one control. Today that takes three actions and up to five numbers typed by hand. The opened card's "Allow more sessions" asks for sessions, minutes of agent time and changed lines. "Add money" opens at 0.00 EUR on a card that still has money. "Raise the spend limit" shows only at the money stop. The defaults read no facts of the card: the opened card fills them from `CardFacts`, which holds no session price, and the press handler rebuilds the list with empty facts (`console/actions.go:1345`).

The human thinks in "a session's worth": the agent time and the money one session of this card takes. The control asks for a count of sessions' worth. The factory works out what each of the card's resources lacks for that room and shows it. The agent uses the room in the session that runs, without a restart. Every ask in "Needs you" about a card's resources uses this one control, opened at what the ask needs. The human, the chat, the check-in, the factory agent and the factory's own code all give a card room through this one action.

## 2. Goals, non-goals, anti-goals

**Goals**

- G1. One control, "Give more room", with a count of sessions' worth that opens at 1 and goes up to 5 per press. A human accepts it without typing.
- G2. The control shows what the count means on this card: the agent time and the money per session, where these figures come from, and for time and money what is left, what the press adds and what the card then has.
- G3. The control works ahead of time on every live agent card, and it is the one answer for every ask about a card's resources: the session-cap, agent-time, money, check-in share and repeated findings stops, and the gate stop after a refused review.
- G4. Money is part of the control, ticked only when the card lacks money, and the human can untick it. A press whose money would pass the spend limit raises the limit first, then adds the money.
- G5. A running session takes a raise at once: its time limit grows, and the agent is told. The count measures time and money and never asks for a restart.
- G6. A human's money draws from the project's month budget, not from the escalation pool.
- G7. One way only: one function turns a count into raises, and every decider calls it.
- G8. Policy code enforces every bound, outside any model.

**Non-goals**

- No change to the escalation ladder's order or to who decides when. The ladder handles a stop first, and the card reaches a human only when no rung settles it.
- No change to the pool's and the card draw's figures in `policy.yaml`.
- No new card state and no new board column.
- The factory's and the project's month caps keep their own asks: a change to the policy file, or the reset of a cap's count from the status panel. Money for a card does not lift them (`capLiftsNot`).
- A server rental (`resourceFace`) stays an approval of one purchase: approve or deny.

**Anti-goals**

- A human types minutes, EUR or lines to keep a card going.
- The readout shows figures that the press does not apply.
- A second formula for "a session's worth" in the browser, the chat or a prompt.
- An agent ends a session and starts another only to use time it was given.
- A human's generous grant leaves the check-in and the factory agent nothing for the rest of the month.

## 3. Decisions by Sebastian

- D1. The unit is a session's worth of time and money, provided the control shows what that means on the card. The control lets a human give more than the minimum for a larger task.
- D2. A human's money draws from the project's month budget. Human grants stop counting against the escalation pool. The readout shows the project's money left this month.
- D3. The raise of the line bound goes completely. A card whose change grows past its bound keeps today's path: the push merges main, then a successor carries the work, then a second overshoot asks a human to cut the work into cards (`factoryd/activities.go:528`).
- D4. The approach of section 4.
- D5. One control for every ask about a card's resources. Money sits inside it, ticked only when the card lacks money. "Add money" and "Raise the spend limit" stop being separate actions. A specific request opens the control at what it asks for and names who asks. The chat's own monthly budget gets the control's money line alone, in the same look.
- D6. A running session uses a raise without a restart.

## 4. Approaches

- **A. One action, changed in place (picked).** `extend` takes a count of sessions' worth and a yes or no for money. One pure function in `factoryd` turns the count into the raises of the session cap, the agent-time cap and the budget, and the raise of the spend limit when the budget would pass it. The face's readout, Act's check, the store's apply, the chat tool, the rungs' answers and the workflow's own grant all call it. `fund` and `raise_ceiling` go as actions.
- **B. Convert in the console form only.** The form turns the count into today's arguments of `extend`, `fund` and `raise_ceiling`. This is the smallest change, but the chat and the rungs keep three actions and five numbers, which breaks one way only.
- **C. A new action beside `extend` and `fund`.** This gives two ways to raise the same caps, which breaks one way only.

## 5. Design

### 5.1 A session's worth on a card

`SessionEstimate(f CaseFacts) (time time.Duration, eur float64, fromSessions int)` gives the agent time and the money of one session's worth on the card:

- **After the card ran sessions:** "its sessions" is `Attempts`, which counts the sessions that got a model answer (`factoryd/workflow.go:1947-1956`). A session that ended without an answer adds its time and spend but no count, so the estimate then runs a little high, which errs towards more room. The workflow holds the same count, so `SessionRoom` needs no new read.
- The agent time is the card's agent time divided by its sessions. The money is its spend (`EnforcedSpent`) divided by its sessions. That spend holds the check-in, the review and the audit beside the sessions, so P is what the card spends per session with its gates, which is the money the room has to cover. `fromSessions` is the count of sessions, and the readout names it.
- **Before the first session:** the agent time is `AnswerSlice` of the card's sized agent-time cap, which is a quarter of the cap and at least 5 minutes. The money is the opening floor of the next session's model (`FloorEUR`). `fromSessions` is 0, and the readout calls these figures the policy's estimate.
- **Floors:** the time is never below 5 minutes (`minSession`). The money is never below the opening floor of the next session's model, so a switch to a stronger model is priced at least at what its opening needs.

This replaces `sessionPrice` (the price of the last session, else the floor), `pricedBySession`, `extendMinutes`, `extendSessions`, `shortfall`, `raiseFund` and `ceilingPass` (`factoryd/faces_copy.go:245-298`). A story that named "priced at its last session" names the estimate's source instead.

### 5.2 Room for n more sessions' worth

The room is the number of sessions' worth the card can still use under its session cap, its agent-time cap and its money. With T the time and P the money of one session's worth:

```
startsLeft = session cap − attempts
timeLeft   = agent-time cap − agent time used
moneyLeft  = what sessions may spend: the budget left less the gate reserve (f.SessionLeft())
now        = min(startsLeft, floor(timeLeft / T), floor(moneyLeft / P)), at least 0
```

`RoomFor(f CaseFacts, n int, money bool) Room` gives the raises that make the room `now + n`:

```
target       = now + n
raiseStarts  = max(0, target − startsLeft)
raiseTime    = max(0, target × T − timeLeft), whole minutes, rounded up
raiseMoney   = fundFor(target × P, moneyLeft) when money, else 0
raiseLimit   = max(0, budget + raiseMoney − spend limit), in cents
```

`fundFor` (`factoryd/casefacts.go:1096`) rounds the gap up to a cent. A count of k is always one call with n = k.

`RoomFor` has a pure part for the workflow, `SessionRoom(startsLeft int, timeLeft, T time.Duration, n int) (starts int, agentTime time.Duration)`, which leaves money out. `RoomFor` adds the money from `CaseFacts`.

If the money is left out while the card cannot pay for a session to open (`CaseFacts.unfunded`, `factoryd/casefacts.go:280`), the press is refused, because time and starts alone would not let the card go on: "this card lacks the money to open a session: give the room with its money". With money left out on a card that can still open a session, the press raises the starts and the time it computes.

**Worked examples (figures derived by hand).** Each card has T = 14 minutes and P = 1.20 EUR, from 42 minutes and 3.60 EUR over its 3 sessions.

| Case | startsLeft | timeLeft min | moneyLeft EUR | now | n | raiseStarts | raiseTime min | raiseMoney EUR |
|---|---|---|---|---|---|---|---|---|
| Ahead of time | 1 | 18 | 2.10 | 1 | 2 | 2 | 24 | 1.50 |
| Session-cap stop | 0 | 18 | 2.10 | 0 | 1 | 1 | 0 | 0.00 |
| Agent-time stop | 1 | 2 | 2.10 | 0 | 1 | 0 | 12 | 0.00 |
| Money stop | 2 | 30 | 0.40 | 0 | 1 | 0 | 0 | 0.80 |

- Ahead of time: `target` = 3, so time rises from 18 to 42 minutes and money from 2.10 to 3.60 EUR. With a budget of 6.00 EUR the budget becomes 7.50 EUR. Under a spend limit of 8.00 EUR, `raiseLimit` is 0. Under a limit of 7.00 EUR, `raiseLimit` is 0.50 EUR.
- The three stops give today's grants: one start at the session cap, one session's worth of minutes at the agent-time cap, and the shortfall of the next session at the money stop.

### 5.3 The action `extend`

- **Arguments:** `sessions`, a whole number from 1 to 5 (`MaxRoomSessions`), and `money`, true or false, true when left out. `agent_time_s`, `lines` and `eur` go, and `MaxExtendMinutes` goes.
- **Deciders:** the factory's code, the check-in, the factory agent and the human. Money takes the check-in, the factory agent or the human, as a fund does today. A raise of the spend limit takes the factory agent or the human, as `raise_ceiling` does today. If the check-in's room would pass the spend limit, the check is refused with what fits: "only the factory agent or a human raises the spend limit: 1 session's worth fits under it".
- **Check** (`factoryd/actions.go:252`): the refusals that name the card's state stay: an ended card, a report, a card at a spending cap of the factory or the project, a question that is not a cap, and a draw that bought nothing. The refusal of more than `MaxExtendMinutes` (`factoryd/actions.go:270`) and the agent-time stop refusal that names minutes for each decider (`:272-281`) go whole. So does "this card waits on money, not a session", because the action now carries the money.
- **The draw** is `RoomFor(f, sessions, money)`. The bounds of `drawWithin` and `newDrawBound` stay. These are the card draw for the factory and the check-in, the pool for the factory, the check-in and the factory agent, and no pool bound for a human. A human's money has its own bound (section 5.5).
- **A refusal** past a bound names the largest count that fits: "the card's draw bound leaves room for 1 more session's worth, about 14 minutes and 1.20 EUR". Code finds it by trying the counts from the one asked down to 1.
- **Apply:** one transaction writes the rows that `drawCase` writes today (`factoryd/cases.go:854`). It raises the spend limit first, then the session cap and the agent-time cap (`raised_sessions`, `raised_time_s`), then the budget. Each part keeps its own row, so the audit trail shows the money apart from the time. The rows record the count, the money flag and the estimate used.
- **A draw beside another action** (`Resolution.Fund` today, for example a handover that buys its session) becomes a count and a money flag through the same `RoomFor`. Agent time and EUR are never asked for directly.
- **Readout and press agree.** The console's form posts the count, the money flag and, as a guard, the raises its readout showed. Act works the raises out again from the facts at the press. If they differ, because the card ran on in between, the press is refused with the new figures, and the readout shows them: "The card ran on since this opened: 2 sessions' worth now add 28 min and 1.80 EUR. Press again to give them." The chat and the rungs send the count and the flag, and their result names the raises applied.

### 5.4 A running session uses the room

- **Money** already reaches a running session: the gateway admits each model call against the card's free money read at that call (`policy/holds.go:628`).
- **Time** does not today. A session's time limit is fixed when it starts: the runner's `deadline`, the supervisor's wall-clock cap (`NewSupervisor(supCfg, deadline.Add(-supCfg.WallClockCap), …)`, `factoryd/runner.go:941`) and the activity's timeouts (`factoryd/workflow.go:3836`, `StartToCloseTimeout: remaining + sessionGrace`). `watchLimits` reads the card's row once per tick (`factoryd/runner.go:3476`) and tells the agent that time "applies from the next session".
- **The pattern to follow** is the check-in's: the workflow adds `checkinExtra` to the session's activity window, the runner moves `deadline` out by what the check-in took, and no deadline moves past `ceiling`, the end of the activity's window (`factoryd/runner.go:636-646`, `:913`).
- **The window:** when the workflow schedules a session, the activity's window holds the card's remaining agent time plus a raise headroom of 5 sessions' worth (`MaxRoomSessions` × T, from the card's usage at scheduling). `ceiling` is the end of that window.
- **The tick:** `watchLimits` reads the row's agent-time cap and budget on each tick. When the cap grew, the session's `deadline`, the supervisor's wall-clock cap and `limitWatch.span` grow by the same time, never past `ceiling`, so a raise never trips the wall clock. When the time or the budget grew past a wrap-up warning already sent, that warning is due again at its share. The agent gets one line: "factoryd: the card got 24 more minutes of agent time and 1.50 EUR. Go on with the work in this session." The old line about the next session goes.
- **Past the window:** raises during one session that add up to more than its headroom lengthen it to `ceiling`. The session then wraps up there, and the next session starts with the time left. This is the one case in which a raise reaches the next session, and only above 5 sessions' worth given during one session.
- **The factory's own grant** at a cap inside the run (`taskRun.grant` and `grantTime`, `factoryd/workflow.go:2718`) calls `SessionRoom` with n = 1 from its `TaskUsage`. It takes no money, as today's factory takes none. Its time per session changes from `AnswerSlice` to the card's own average of section 5.1. It keeps writing its own counters, `ExtraAttempts` and `ExtraTime`, and records its draw as today (`recordGrant` on rung 3 for a person's change request, `recordAgentDraw` on rung 2, `recordAuditDraw` on rung 0), so a person's grant there leaves the pool too. Act keeps writing `RaisedSessions` and `RaisedTime`.
- **Replay:** the new window and the new grant time change the workflow's commands, so both sit behind a `workflow.GetVersion` mark, as the codebase's other version marks do (for example `versionSessionTime`). A run that started before the roll keeps its old window and its old grant.

### 5.5 Where the money comes from

- **A human's money draws from the project's month budget.** The project's money left this month is the figure the gateway admits calls against, read by the gateway's own function `policy.ReadFree` (`policy/holds.go:613`): the smaller of the project's headroom (its `budget.month_eur` less the month's ledger rows and the outstanding holds of its cards, when the project file sets a cap) and the factory's month headroom (`budget.month_eur` in `policy.yaml` less the month's spend and every hold). The console never promises money that the gateway would refuse. It counts no unspent budget of another card: a budget is an allowance, and the gateway caps the real spend. The day cap stays out, because it resets each day.
- **A room whose money is above that figure is refused,** whoever decides it: "the project has 1.20 EUR left this month, which pays for 1 session's worth: give that, or raise budget.month_eur by a commit". The gateway keeps enforcing the caps on real spend, unchanged.
- **The spend limit has no other maximum.** A human's raise of it is bounded by the same month figure, because the limit rises only by what the money passes it. The factory agent's raise counts against the pool, as `raise_ceiling` does today (`Resolution.draw`, `factoryd/actions.go:901`).
- **The pool counts no human grant.** `poolDraws` (`factoryd/store.go:2354`) keys on `detail->>'pool' = 'true'` today. It gains `AND detail->>'rung' IS DISTINCT FROM '3'`, which leaves out the rows of rung 3, the human's rung, and keeps rows with no rung key. Because this happens in the query, it covers the rows already written this month, and no row is rewritten. `CardDrawn` already counts rungs 0 and 1 only. Rows of rung 3 stay audit rows with their amounts.
- **The chat's rung** follows `actor.rung()` (`console/actions.go:1874`): the project agent acting alone is rung 2, so its draw counts against the pool and the pool bounds it. A grant the human confirms in the chat is rung 3 and does not count. "The factory agent" in this document is the rung 2 decider.
- **What this frees.** On 2026-11-20, rows of rung 3 make up 48 sessions, 13.6 hours and 69.30 EUR of the month's pool draws over all projects, and the other rungs 7 sessions, 6.8 hours and 25.00 EUR. These figures come from the live database's `events` rows.
- **Tests** that assert a rung 3 row with `pool: true` counted in `PoolDrawn` (for example `act_test.go:782`, `casefacts_test.go:100`) change to the new rule.

### 5.6 The line raise goes

Delete the line raise end to end: the `lines` argument of `extend` and of the chat's `answer` tool, the form field, `TaskUsage.ExtraLines` and the column `tasks.extra_lines` (dropped by a migration), its copy into a successor (`factoryd/plan.go:4209`, `:4347`) and in `factoryd/activities.go:597`, its part in `EffectiveLineBound`, in `CheckinStopMark` and `RepeatAsk` (`factoryd/workflow.go:2732`) and in `watchLimits`' `/bound` post, and its words in `raisedWords` and the card digest. The bound is the size's bound (`cardLineBound`) plus the lines of the plan's opened proofs (`TaskUsage.ProofLines`), which stay. Because the run sets the proof lines before the pod starts, no raise of the bound reaches a running session any more, and the `/bound` post in `watchLimits` and the worker's `/bound` handler (`cmd/agent-worker/message.go:102`) go too, unless another writer of the bound turns up. Old event rows keep their `lines` key, and no reader shows it.

On 2026-11-20 no live card has a raised line bound: the 17 cards that got one are closed or done, and the last raise was on 2026-11-17. The plan checks this again before the migration runs.

### 5.7 The control on the console

- **The vocabulary row** `ActExtend` (`factoryd/faces_copy.go:117`) becomes "Give more room", with a field `sessions` (a count from 1 to 5) and a field `money` (a tick). The rows of `ActFund` and `ActRaiseCeiling` go. The design round may change the label.
- **The readout** is a fill of the face register, built from the card's facts, the count and the tick:
  1. One session's worth: "About 14 min and 1.20 EUR per session, from its 3 sessions so far", or "About 15 min and 0.80 EUR per session, the policy's estimate before its first session".
  2. Time: "Adds 24 min: 18 min left, then 42 min", or "Enough: 30 min left".
  3. Money, with its tick: "Adds 1.50 EUR: 2.10 EUR left, then 3.60 EUR", or "Enough: 2.10 EUR left". When the spend limit must rise: "The spend limit rises from 7.00 to 7.50 EUR first."
  4. Starts, only when they rise: "It may also start 2 more sessions."
  5. The project's money left this month: "The project has 41.20 EUR left this month."
- **The tick** of the money line is set when `raiseMoney` is above 0, and clear when the money is enough.
- **When the count or the tick changes,** htmx asks the server for the readout again, so no figure is worked out in the browser. Without JavaScript the press still applies the count, and the readout shows the default.
- **Where the control shows:**
  - among the opened card's other actions on every live agent card (`MoreOf`, `factoryd/faces.go:569`), in place of "Allow more sessions" and "Add money";
  - as the answer on every ask about a card's resources: the session-cap and agent-time stops (`limit`), the money stop (`CaseBudgetFloor`), the check-in share stop, the repeated findings stop, the gate stop after a refused review, and a question of the agent's that waits at one of these caps (`atCap`).
- **Its default** is 1. When a rung proposes room for a human to confirm, the control opens at the proposal's count and tick, marked with who proposes it.
- **The chat's monthly budget** (`AnswerFundChat`) keeps its own action, because the chat has no sessions. It renders as the control's money line alone, in the same look, with the project's month readout.
- **Facts:** `CardFacts` lacks the agent-time cap, the floor and the month's money (`factoryd/casefacts.go:423`). A new `Runner.RoomFacts(ctx, t Task) (CaseFacts, error)` adds them by the same readers `tripFacts` uses, plus a new field `CaseFacts.MonthLeftEUR`, and the console reads it through a new port wired in `cmd/factoryd/main.go`. Act's facts carry `MonthLeftEUR` too. The opened card and the press handler build the facts with it. The press handler no longer passes empty facts (`console/actions.go:1345`). It builds the facts before it looks up the pressed key, because that lookup checks the key against `MoreOf`. The figures shown and the figures applied come from the same function.
- **Who may press:** an approver, as today (`console/actions.go:1316`).
- **The rules of "Every card readable" hold:** the label comes from the one vocabulary, there is one effect line, the fields show only after the press, an asking face holds at most 4 answers, every text passes `writingguide.Lint`, and the face never shows the words rung, case or pool.

### 5.8 The chat

- `grant_session` and the card `fund` tool become one tool, `give_room`, with the arguments `task_id`, `sessions` (1 to 5, default 1), `money` (default true) and `text`. On a card at a stop it answers the stop. On a live card without a stop it gives room ahead of time. Its result names the readout's figures.
- The `answer` tool loses `fund_eur`, `sessions`, `agent_time_s`, `lines` and `eur` from its schema (`console/chat_tools.go:1633-1641`), and the actions `extend`, `fund` and `raise_ceiling` leave its list. A call with one of them is refused with the tool to use: "use give_room". This leaves one tool per action.
- The tool descriptions and the system text that name `agent_time_s`, `lines`, `fund` or `raise_ceiling` for a card change with the tools (`console/chat_tools.go:2340`, `capSpent` at `:2417`).
- The chat's own budget keeps its tool.

### 5.9 The ladder

- A rung's answer (`RungAnswer`, `factoryd/rung1.go:531`) carries room as `sessions` and `money`. `agent_time_s` and `eur` go from the schema, the prompts and the parse. `fund` and `raise_ceiling` leave the decisions a rung may name.
- `rung1.go`'s own sizing of a draw at a cap (lines 49 and 87) uses `RoomFor`.
- A rung refusal names sessions' worth, never minutes or EUR alone.

### 5.10 Rows and proposals from before the roll

- Resolved cases and event rows that name `fund`, `raise_ceiling`, `agent_time_s` or `lines` stay as written. A reader of history shows the parts it still knows and skips the rest.
- A rung's proposal that waits for a human's confirmation and names `fund`, `raise_ceiling` or an `extend` with the old arguments cannot be confirmed after the roll. The roll withdraws each such proposal, and the factory agent judges its case again, so the human meets a proposal in the new shape. The plan counts these proposals on the live database before the roll.

## 6. The look: a condensed design round

The control is one control, so it takes the condensed round of `design/process.md`. The round designs the count, the readout with its time and money lines, and the money tick, in three places: among the opened card's other actions, on a stop's face, and the money line alone on the chat's budget ask. Both themes, at 1440 px and 390 px.

- The question is a detail that images cannot draw, so the candidates are built in the console lab (`scripts/console-lab/run.sh`), as in round 03.
- Two critics, Gemini and GLM, judge at most two loops. The page gives a recommendation and a runner-up.
- Spending cap: 3 USD.
- Sebastian's pick becomes a C-entry in `design/design-decisions.md`, with `design/ia.md` and `design/inventory.md` updated.

## 7. Constraints

- Policy code enforces every bound. No model sets a cap or a price.
- The event rows stay the audit trail. No row is rewritten.
- One way only: the old arguments, the line raise, `fund` and `raise_ceiling` as actions, and their tests go. No path keeps the old form.
- Immutable and re-seedable: the migration drops the column, and a fresh database starts without it.
- Every human-facing text follows the writing guide and calls a human a human.

## 8. Left to the builder

- Where `SessionRoom`, `RoomFor` and `SessionEstimate` live inside `factoryd`, so the workflow can call `SessionRoom` deterministically.
- How the runner moves the supervisor's wall-clock cap with a raise, following the check-in's `checkinExtra` (section 5.4).
- The htmx route and the template shape of the readout, after the design round's pick.
- The test cases, derived by hand from section 5.2's rules.

## 9. How the build proves itself

- Unit tests of `SessionEstimate`, `SessionRoom` and `RoomFor`, derived by hand, with the four rows of section 5.2, the money left out, and both spend limits of the worked example.
- Act tests: room by each decider within and past its bounds, a refusal that names the largest count that fits, a raise of the spend limit by a human, by the factory agent and refused for the check-in, and a human's money refused above the project's month.
- A store test: a rung 3 row leaves `PoolDrawn` unchanged, and a rung 2 row raises it.
- A runner test: a raise of the agent-time cap during a session lengthens its deadline and its supervisor's wall-clock cap, makes the time warning due again and sends the agent its line. A raise past the headroom stops at `ceiling`.
- A workflow replay test: a run that started before the version mark keeps its old window and its old grant.
- Console and chat tests: the press applies the figures the readout showed, a press refused after the card ran on, the control on each stop of section 5.7, `give_room` at a stop and ahead of time, and `answer` refusing `extend`.
- Lab shots before and after, both themes, 1440 px and 390 px.
- `go test -race ./...` green in the code repository.
- A live check after the roll: give a running card 2 sessions' worth ahead of time from the opened card, see its session go on past its old time limit, and read the event rows and the pool.
