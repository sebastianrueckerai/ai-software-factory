# Hold a running card: a human puts a running card back in Queued

**Status:** design, written 2026-11-21. Code main at `f56249721`.

**Code:** `~/repos/ai-software-factory-code`. Paths below are relative to its `internal/`.

## 1. Intent

A human wants to take a running card out of the way so that other cards get its work slot. The card stops, goes back to Queued and waits there. When the human releases it, or when the card the human named is merged or done, it goes on from the work it saved.

Sebastian asked for this on 2026-11-21: "put running cards back into queued to pause them", to give other cards priority and to move the cards that are not essential out of the way.

Today a human cannot do this. "Put on hold" exists on the board and in the chat (`hold_card`), but it takes only a card that has not started: a bound agent card queued and never admitted or resumed, or one in waiting-deps (`factoryd/cardhold.go:37`, `factoryd/store.go:2600`). A running card answers "Card #N took its turn and starts now, not a card that has not started" (`console/actions.go:2825`). The other controls of a running card end it ("End the card"), send it to the planner ("Send back to the planner") or talk to it ("Tell the running session"). None frees its slot and keeps the card.

Issue #2029 asked for a pause on 2026-11-15. Its plan stored a revision, but it refused running cards ("a clean stop of a live agent session is a mechanism of its own"), and its planning session ran out of agent time before it filed a card. Nothing of it was built. This spec covers the case that plan left out.

## 2. Goals, non-goals, anti-goals

**Goals**

- G1. A human puts a running card on hold with one press, on the board or in the chat, with a one-line reason.
- G2. The card's session stops at once, and its work goes to the card's branch by the stop path of the wall-clock stop.
- G3. The card frees its work slot, moves to Queued, and the next queued card takes the slot.
- G4. The card starts no session until a human releases the hold, or until its release card is merged or done.
- G5. A released card goes on from its saved work, ahead of the cards that have not started.
- G6. The stopped session does not use up the card's room. The card gets back its start, and a session's worth of agent time when it lacks one. Its money stays spent.
- G7. One way only: the hold of a running card is the existing hold, with the same control, the same store columns, the same release and the same rules for the rungs.

**Non-goals**

- No press on a card in review, closing or merged. Its checks or its merge end it or send it back to work without a human. A hold stored before the card got there stays (section 5.1).
- No hold of a card that waits on a human, an image or the poster. Such a card holds no slot, and it starts nothing until its wait ends.
- No hold of a plan card's planning run, a roll or any card outside the work bound.
- The project agent takes no hold on its own. A hold stays the human's word, as `humanWord` keeps it today (`console/chat_tools.go:1915`).
- No reorder of the queue and no priority control.
- No new card state, no new board column and no new button.

**Anti-goals**

- A held card loses committed work.
- A held card blocks the cards that have not started from taking a slot.
- A hold and release costs the card one of its sessions, so the card asks for room it did not need.
- A held card keeps its slot while it waits, for example in a provider freeze.

## 3. Decisions

Sebastian asked for the control and gave its purpose. The calls below are the designer's, made from that purpose. Each names the reason, so Sebastian can correct it.

- D1. **The session stops at once.** The purpose is to free the slot for other cards. Waiting for the session to end keeps the slot for up to the card's agent-time window. The stop path already saves committed and uncommitted work (section 5.3).
- D2. **The card waits until a human releases it, or until a card the human names is merged or done.** This is the hold's existing rule. It is a pause, not a move to the back of the queue: a card at the back of the queue would take the next free slot again when no other card waits.
- D3. **The control is the existing "Put on hold" and "Release the hold".** A second control named "Pause" would be a second way to keep a card from starting.
- D4. **A released card goes ahead of the cards that have not started.** It keeps the time of its park as its place among the resumed cards (`resumed_at`), as every card back from a wait does today (`factoryd/surge.go:78`).
- D5. **The stopped session gives its room back.** The workflow's `refund` does this for a park on an image (`factoryd/workflow.go:1360`). Under `versionRoomWindow` it grants one start, and the agent time of one session when the card lacks it (`factoryd/workflow.go:2735-2746`). Money is not refunded, since a provider billed it.
- D6. **A hold follows the card until a human releases it, its release card ends it, or the card ends.** A session can end on its own between the press and the stop, and the card then goes to review or to a human. The hold stays, and the card parks before its next session. This keeps the human's word: a pressed hold is never dropped in silence.

## 4. Approaches

- **A. Widen the existing hold to running cards (picked).** The hold takes a running card or a card that waits queued to resume. The press stops a live session the way a person's replan stops it. The card's loop meets the hold before its next session, in `awaitSlot`, the one point every session start passes. The hold's store columns, release, face line, chat tools and rung rules stay as they are.
- **B. A new parked state with Pause and Resume, as plan #2029 drew it.** This adds a status, new columns, two routes and two chat tools beside the hold. It gives two ways to keep a card from starting, which breaks one way only.
- **C. Hold the card after its session ends.** The press sets the hold and the card stops before its next session, with no stop of the live one. This is the smallest change, but the slot stays taken for the rest of the session, which defeats the purpose.

## 5. Design

### 5.1 Which cards take a hold

A card takes a hold when it is a bound agent card on the coding loop and one of these holds:

- It is queued and has not started, or it is in waiting-deps on a dependency that has not ended. These are today's cases.
- It is running.
- It is queued with `resumed_at` set: it ran and waits for a slot to go on.

`Task.Holdable` (`factoryd/cardhold.go:37`) and `SetCardHold` (`factoryd/store.go:2600`) take the same set.

A stored hold stands on every status that is not final (D6). `Task.Held` (`factoryd/cardhold.go:30`), `EndCardHold` (`factoryd/store.go:2615`) and `HeldOn` (`factoryd/store.go:2625`) read a hold on every status that is not final, not only on queued and waiting-deps. A card's end clears its hold already (`transitionSet`, `factoryd/store.go:2494`). The monitor skips a held card only while it is parked, in queued or waiting-deps (`carddigest_flags.go:89`). A held card that still runs or is in review keeps every monitor flag, since such a card can hang while it holds a slot.

The press is refused on every other card, and the refusal names its state and what fits it (`unholdable`, `console/actions.go:2825`):

| state | refusal |
|---|---|
| in-review, closing, merged | "Card #N is in review: its checks decide it now, and it ends or goes back to work without you. Hold it once it runs again, or end it." The state word changes with the state. |
| waiting-human, waiting-poster, waiting-image | "Card #N waits for an answer and holds no work slot, so a hold frees nothing: answer it, or end it." |
| a plan card, a roll, an unbound card, a human card | today's refusals |

### 5.2 The press

`Runner.HoldCard` (`factoryd/cardhold.go:240`) stores the hold first. Then, for a running card, it asks the live session to stop with a new ask kind `AskHold`, through `EscalateSession` (`factoryd/runner.go:314`). A session takes one hold ask. A second press while the session stops changes the reason and asks nothing more.

- If the session took the ask, the console answers "#N stops its session, keeps its work and waits in Queued until a human releases it." With a release card it ends "…until #M is merged or done, or a human releases it."
- If no session runs (`ErrNoLiveSession`), the card is between sessions. The console answers "#N waits in Queued before its next session until a human releases it." The loop meets the hold at its next `awaitSlot` (section 5.4).
- A card that is queued to resume gets the same answer as a card that has not started.

A session registers for asks only after its start check-in (`runSession`, `factoryd/runner.go:1164`), so a press during the start check-in finds no live session. When the session registers, it reads its card's hold. If a hold stands, it stops at once with `TripHold`. A press therefore never misses a session that starts after it. The same holds while the session's pod waits to start, for up to 10 minutes: the press finds no live session, the card keeps its slot, and the session stops when it registers. A pod that never starts ends the session as not started, and the card parks at its next `awaitSlot`.

The press records `EventCardHeld`, as today, with a detail `stopped: true` when a session took the ask.

### 5.3 The stop of a live session

The supervisor turns `AskHold` into a trip `TripHold`, decided with an action `ActionHold`, as it turns `AskReplan` into `TripReplan` (`factoryd/supervise.go:466`). The session stops through the same `stop(trip)` as every trip (`factoryd/runner.go:1167`):

1. factoryd deletes the pod. The worker gets SIGTERM and 60 s (`workerTerminationGrace`) to commit and push its work.
2. If that end push does not land, `takeStopWork` (`factoryd/wippush.go:128`) asks the pod for a bundle and pushes it under factoryd's credential. A report session gives no bundle.
3. If nothing can be pushed, the outcome says so (`stopUnpushed`), as the wall-clock stop does.

The session ends with a new outcome `OutcomeHeld`, carrying the pushed head in `Commit`, as `OutcomeMissingTool` carries it (`factoryd/activities.go:1647`). The workflow handles `OutcomeHeld` in the session switch beside `OutcomeReplan` (`factoryd/workflow.go:2181`):

1. It calls `refund()`, which gives the session's room back (D5).
2. It takes `res.Commit` as the next start: `OutcomeHeld` joins the outcomes whose pushed head `versionWipStart` hands on (`factoryd/workflow.go:1936`). A held stop with no commit keeps the start it had, and the next session starts from the branch head, as every session does.
3. It goes to the loop's top, where `awaitSlot` parks the card (section 5.4).

No gate, no check-in and no review runs on a held stop. The code behind the new outcome sits behind a new workflow version, as every change to the workflow's commands does.

A held stop is a stop factoryd sends for a decision it holds, so its death record is decided. If the platform kills the pod inside the stop, the session still ends `OutcomeHeld`: the record keeps its platform class and counts toward the human's card on the platform, and the next session's handover carries no line that the end did not count.

### 5.4 The park before the next session

Every session start passes `awaitSlot` (`factoryd/workflow.go:1851`), which calls `AdmitResume` (`factoryd/surge.go:58`). The hold is enforced there and nowhere else. A re-verification runs no session and skips `awaitSlot` (`if t.reverify { continue }`), and it needs no park: a hold keeps a card from its next session.

- `AdmitResume` reads the hold first, for every card, before `resumesIntoSlot` (`factoryd/surge.go:35`) judges it. A held card whose release card ended merged or done loses its hold there (`cardHoldWait`, `factoryd/cardhold.go:218`) and goes on to today's admission.
- While `cardHoldWait` returns a line, `admitResume` (`factoryd/surge.go:78`) grants nothing. It moves the card to queued with `SetResumeWait`, with the hold's line as the queue reason and the time of the park as `resumed_at`. `SetResumeWait` (`factoryd/store.go:2632`) does not take a running card today. Its WHERE clause gets `status = 'running' AND hold_at IS NOT NULL`. Its other statuses already cover a held card that comes back from review or from a human (D6).
- After the move, the runner calls `pullQueued`, so the freed slot goes to the next queued card at once. The issue's label turns to `state/queued`.
- `awaitSlot` then waits for `SignalSlotFree`, as for every card that waits to resume.

### 5.5 A held card does not block other cards

A card queued to resume blocks every card that has not started (`factoryd/bounded.go:135`), and it counts as ahead of the later resumed cards (`factoryd/surge.go:87`). A held card must do neither:

- The count of resumed cards that admission and `admitResume` read leaves held cards out.
- `wakeResumed` (`factoryd/bounded.go:170`) wakes a held card only when its hold no longer stands: its release card ended merged or done. The wake runs `AdmitResume`, which runs `cardHoldWait`, and the hold ends there, as admission ends it for a card that has not started. A held card whose hold stands gets no wake. The heal pass pulls every project with a queued card each minute, and a wake per pass would grow the card's workflow history to Temporal's limit within days. A human's release ends the hold before it pulls the queue, so that wake still reaches the card.
- The board's "N ahead" line (`setSlotWaits`, `factoryd/console_store.go:362`) leaves held cards out.

### 5.6 Waits inside running end at a hold

A running card can wait between sessions while it holds its slot: the provider freeze waits to the reset with the card running (`waitOnLimit`, `factoryd/workflow.go:2508`). That wait takes a new signal `SignalHeld`, which the press sends to a running card with no live session. On the signal, the wait ends and the loop goes to `awaitSlot`, which parks the card. When the hold is released, the next session starts at once, and a provider that still refuses freezes the card again.

The builder lists the other waits a running card can hold its slot in and gives each the same signal.

One wait does not end at a hold: a rung that judges the card's case while the card runs (`awaitAnswer`, up to 35 minutes per rung). Ending it would leave the case without its answer. The hold refuses every rung's resume, continue, handover, successor and close of the card (section 5.10), so the rung settles the case or hands it up to the human. A settled case sends the card to its next `awaitSlot`, which parks it. A case at the human moves the card to waiting-human, which frees its slot. The slot frees after the rung's answer, not at the press.

### 5.7 Runs from before the roll

A run that started before the roll reads the old workflow version and has no case for `OutcomeHeld` or `SignalHeld`. The store cannot tell such a run from a new one, so the session carries the answer:

- `SessionInput` gets a field `HoldStop bool`, set by a run under the new version.
- `EscalateSession` refuses `AskHold` for a session whose input lacks it, with `ErrNoLiveSession`. The console then gives the answer of a card between sessions (section 5.2).
- `AdmitResume` is an activity, so its hold check holds for old runs too. An old run's card parks before its next session. Only the stop of its live session is missing.
- An old run leaves `SignalHeld` unread, and that changes nothing.

### 5.8 The release

- A human presses "Release the hold" or calls `release_hold`. `EndCardHold` ends the hold. `ReleaseCardHold` (`factoryd/cardhold.go:247`) calls `pullQueued`, whose `wakeResumed` wakes the card. `AdmitResume` grants when the live count is under the bound plus the surge and no unheld resumed card is ahead (D4).
- A release card that ends merged or done ends the hold at the card's next wake (section 5.5).
- A human who releases the hold before the session stopped ends it while the card is still running. The card's `awaitSlot` then grants, and the next session starts from the saved work.
- A held card that a human ends or replans loses its hold with it, as today.

### 5.9 The board and the chat

The board shows a held running card in In progress with its hold line until the park, then in Queued with "on hold: reason" or "on hold until #M is merged or done: reason" (`holdView`, `factoryd/cardhold.go:59`). The board's columns, the foot line and the drawer stay as they are.

The face copy (`factoryd/faces_copy.go:190-194`) gets one variant per started card:

| answer | card | effect line |
|---|---|---|
| Put on hold | not started | The card does not start until you release it, or until the card you name is merged or done. (today's) |
| Put on hold | running or waiting to resume | The session stops now and keeps its work. The card waits in Queued until you release it, or until the card you name is merged or done. |
| Release the hold | not started | The card takes its turn to start again. (today's) |
| Release the hold | started | The card goes on from its saved work, ahead of the cards that have not started. |

`MoreOf` (`factoryd/faces.go:571`) offers "Put on hold" on every card `Holdable` names, so the running card's drawer offers it beside "Tell the running session" and "End the card".

The chat's `hold_card` describes itself as "Hold a queued or running card on the human's word: a running one stops and keeps its work." A tool's description holds at most 100 characters. `release_hold` keeps its text. `doReleaseHold`'s refusal names the new set: "`hold_card` puts a queued or running card on hold."

### 5.10 What leaves a held card alone

These already respect a hold and need no change once `Held` covers the new statuses. The builder checks each with a test:

- The rungs below the human take no resume, continue, handover, successor, close or replan of a held card (`holdRefusal`, `factoryd/cardhold.go:168`).
- A plan revision keeps a held card's key (`heldFindings`).
- The monitor's `ownedWait` skips a held card while it is parked (`factoryd/carddigest_flags.go:89`), so a parked held card raises no `queued_over_bound`. A held card that still runs or is in review keeps every monitor flag (section 5.1).
- The heal pass restarts a dead run of a queued card with `resumed_at` set (`factoryd/temporal.go:358-368`). The restarted run reaches `awaitSlot` and parks again.

## 6. Constraints

- One way only. No second pause control, no second store column for a hold, no second release.
- Work is never lost on a held stop: the stop takes the same path as the wall-clock stop.
- Every bound is enforced in Go, outside any model.
- Every text a human reads passes `writingguide.Lint` and calls a human a human.
- Tests come first and derive their expectations by hand from this spec.
- A change to the workflow's commands goes behind a version and passes the replay tests.

## 7. Left to the builder

- The name of the new workflow version and where `OutcomeHeld` sits in the session switch.
- The list of waits inside running that hold a slot (section 5.6), and how each takes `SignalHeld`.
- Whether `ResumeWaiters` takes a flag or the callers filter held cards, as long as `wakeResumed` wakes a held card once its hold no longer stands.
- The exact refusal words, within the meaning of section 5.1 and the writing guide.

## 8. How the build proves itself

- A Postgres test: a project at a bound of 1 with card A running and card B queued. A hold on A stops A's session, parks A queued with `resumed_at` and its hold line, and admits B. A's session count is unchanged.
- A Postgres test: a held card queued to resume and a card that has not started. Admission admits the card that has not started, and the "resumed first" count is 0.
- A workflow test: a session that ends `OutcomeHeld` with a commit runs no gate, refunds its number, and starts its next session from that commit after the release.
- A workflow test: a card in the provider freeze takes `SignalHeld`, ends the wait and parks.
- A release test: the release card of a held, parked card ends done. The next wake ends the hold and grants the slot.
- A hold that follows the card: a session ends with its verdict before the hold's stop. The card goes to review with its hold, review sends it back, and its next `awaitSlot` parks it.
- A run from before the roll: a session without `HoldStop` refuses `AskHold`, and the card parks at its next `awaitSlot`.
- A console test: "Put on hold" on a running card answers the stop line, and on an in-review card answers the in-review refusal.
- A chat test: `hold_card` on a running card on the human's word stops it, and on an agent-originated turn is refused, as today.
- The live check: hold a running card on the live board. Its session stops within the grace, its branch holds the work, the card shows in Queued with its line, the next queued card starts, and after the release the card goes on from its branch.
