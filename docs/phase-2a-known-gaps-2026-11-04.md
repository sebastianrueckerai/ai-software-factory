# Phase 2a: the eight known gaps, explained

Written 2026-11-04 for Sebastian, after phase 2a (the ladder, the actions and the pool) went live on code main `ecce4ee2`. Each gap below says what happens, when it can happen, what it costs, what the fix would be, and what I recommend. The decision on each is yours.

## Three words the gaps use

**The gate.** A card runs as one Temporal workflow. Temporal replays a workflow's history on every restart, so the code must make the same decisions it made before. New behaviour therefore sits behind a version gate: a run that started before the deploy keeps the old branch of the code until it ends, and a run that started after takes the new branch. "A run from before the gate" means a card whose workflow started before 08:03 UTC today. Those runs age out as their cards end. Nothing can change their behaviour, by design.

**The pool.** The escalation pool is the month's allowance for what the factory grants on its own: sessions, agent time and money. Every grant is meant to be recorded against it, so the pool can show "12 of 30 sessions drawn this month". A grant that is not recorded makes the pool read lower than the truth. A grant recorded twice makes it read higher. The pool is a book, not a wallet: a wrong entry misstates the count and spends nothing. A card's own budget is the hard money cap and is not touched by any gap here.

**A case.** Every stop a card makes (a cap, a question, a failed dependency) opens a case, the record the human and the factory answer through. A case carries facts, steps and its answer.

## 1. A review retried across the deploy writes two rows

**What happens.** Every model review and every audit writes one fact row, keyed so that a retry of the same review writes nothing twice. Phase 2a changed the key: it now includes the card's id, so two cards on the same commit no longer share one row. A review that was in flight at 08:03 and was then retried after the deploy wrote one row under the old key and one under the new key.

**When.** Only a review activity that started before the deploy and retried after it. At 08:03 no agent card was running, only the two project chats. So this very likely affected nothing.

**What it costs.** One review counted twice in the review metrics, for at most a handful of cards. No behaviour depends on the count.

**The fix.** One SQL statement that rewrites the old keys into the new shape, since every row carries its task id. About five lines, plus a migration file.

**Recommendation.** Nothing. If a metrics page shows a doubled review for a card from today, run the rewrite then.

## 2. A pre-gate run's share stop answered by Grant draws a session the run does not use

**What happens.** At a check-in share stop the agent asks for one more check-in share, a tenth of the card's budget. Before phase 2a the Grant button answered with a comment, and the run granted the share itself. Now the Grant button goes through the one door, `Act`, which records a draw of one session against the pool and posts the comment. A run from before the gate wakes on that comment, grants itself the share as it always did, and never uses the session.

**When.** Only on cards whose workflow started before 08:03 today, at a check-in share stop, answered by Grant. No such card is live now.

**What it costs.** The pool reads one session higher per such press. The card itself behaves as before.

**The fix.** None needed. The gap closes on its own when the last pre-gate run ends.

**Recommendation.** Nothing.

## 3. A case opened before the deploy grants one session at a share stop

**What happens.** Since the last fix round a case records which check-in stop it stands at: the share stop, the call cap or the time cap. The Grant button reads that fact to buy the right thing: one more share, one more session or more agent time. A case opened by the old code carries no such fact, so Grant on it buys one session.

**When.** Only cases opened before 08:03 today, of the check-in kind, not yet answered. There are none: the five open cases are all human cards.

**What it costs.** Nothing today. Had such a case existed, one press would have bought a session instead of a share, and the card would have asked again.

**The fix.** A heal rule that fills the fact on old cases from the card's newest escalation. About twenty lines, for cases that do not exist.

**Recommendation.** Nothing.

## 4. A beside question answered during another wait loses its typed answer

**What happens.** While the checks run, the model review runs beside them and can ask a question, which opens a case. If a card stands at two open cases at once, say that question and a session cap, and the human answers the beside question through the console while the run waits on the cap, the run drops the typed answer (reverify, handover, and so on) because it only listens for the case it waits on. The human's comment still reaches the run as a plain reply, so the question is answered, with words instead of a typed action.

**When.** Two open cases on one card, with the beside question answered first. Rare, and never seen live.

**What it costs.** The answer lands as plain words. A typed `reverify` becomes "the human replied", and the run re-asks or carries on as it would on any reply. No loss of money or work.

**The fix.** The run keeps a small queue of resolutions per case and takes each when its wait comes round. Thirty to fifty lines in the workflow, under a new version gate, with replay tests.

**Recommendation.** Leave it for phase 3, which gives rung 1 the whole card and reworks how a run waits on several cases. Fixing it now means a workflow change for a case nobody has met.

## 5. The retry's steps after the commit are not serialised per card

**What happens.** When a failed card is retried, `RetryCard` writes the replacement card in one database transaction, then creates its issue on Forgejo and starts its workflow. The transaction refuses a second retry once the first is committed. But a second press that lands between the commit and the issue creation reads the replacement as present without an issue and can file a second issue for it.

**When.** Two retry presses on the same failed card within the same second, from two different doors (the console and the chat, or two dependents). Phase 2a's lock on `Act` serialises presses on one case, so the remaining window is two cases of two dependent cards retrying the same failed card at the same moment. This predates phase 2a.

**What it costs.** A duplicate issue for one replacement card, which a human closes by hand. Rare.

**The fix.** Make the issue creation idempotent: before filing, look up an issue carrying the replacement's task id, and reuse it. About fifteen lines in `RetryCard`, no workflow change.

**Recommendation.** Fix it in phase 2b's fix wave or the next quiet round. Low urgency, cheap, no design question.

## 6. An audit that fails for good writes no "did not run" row

**What happens.** Phase 2a made every audit attempt write a fact row that says whether the audit ran, so the monitor can flag a card whose review or audit was refused. The row is written by the activity itself. If the activity fails for good (the gateway down for the whole retry window), no attempt completes, and no row says "did not run". The review has the same gap today.

**When.** A gateway or model outage longer than the activity's retry window, which is hours.

**What it costs.** Phase 2b's `review_refused_not_run` flag cannot see this failure from the rows. The card does not hang: the workflow's own error path opens a stop and asks a human. Phase 2b also flags any gate wait over six hours, which catches the same outage by time.

**The fix.** Write the row from the workflow's failure path through one small activity when a gate activity fails for good. About twenty lines, for both the review and the audit.

**Recommendation.** Add it in phase 2b's Task 5 or its fix wave, where the monitor's row readers are built. It is cheap there and completes the record.

## 7. The audit's own gap at the cap buys a session outside the pool

**What happens.** When a writer requests changes on the pull request while the card stands at its session cap, the run grants one more session so the agent can act on the request. Phase 2a records that session as the writer's draw against the pool. The audit can produce the same kind of request, a "gap" verdict naming something missing. That request names no writer, so the run grants the session and records no draw.

**When.** An audit gap verdict on a card at its session cap.

**What it costs.** The pool reads one session low per such grant. The card's budget still pays for the session, so no money is spent beyond the card's cap.

**The fix.** Record the grant as the factory's own draw, rung 0. That has a consequence you should decide on: a rung 0 draw is refused once the pool is empty, so an audit gap at the cap on an empty pool would not get its session, and the card would ask a human instead. That is what the design says every factory grant should do. Today the session runs regardless.

**Recommendation.** Record it as the factory's draw, so the pool is a true book and an empty pool stops the factory's own grants, as designed. Ten lines in `apply`. Do it in phase 2b's fix wave, when the rung 0 draw rows are in front of a reviewer anyway. If you would rather the audit's gap always ran its session, say so and the gap stays as it is, with the pool reading low.

## 8. A restarted run on an old cap case keeps the old face's promise

**What happens.** The face is the comment on the card's issue that tells the human what to do. The old face said "Reply on this issue to start a new attempt". Under the gate a reply at a cap starts nothing: it asks again, and the human extends through the board or the chat. When a run that started after the deploy restarts and finds a cap case the old code opened, it keeps that case and its old face. A human who follows the old words gets asked again.

**When.** A cap case opened before 08:03 today, on a card whose workflow started after. There is no such case.

**What it costs.** One confused reply, answered by a re-ask that names the right control.

**The fix.** A heal rule that rewrites the footer of pre-gate cap faces. Fifteen lines for cases that do not exist.

**Recommendation.** Nothing.

## What needs you now

- **Pull request #242 on the infra repository.** The factory regenerated its schema copies for the rolled code and filed them as a pull request. Its card waits for your merge.
- **Four alert cards on the infra project.** Issues #235, #239, #240 and #241, three of them "Job failed" alerts from the minutes OpenBao was sealed after the restart. The jobs converged. The cards sit on a project with no agents, so they cost nothing, and they leave the board when you close the issues with a note.
- **The first real card.** Nothing has run through the new ladder yet. The first card that stops at a cap or a question is the live proof of phase 2a. Its case shows on the board, and the pool line on the board should show three parts.
