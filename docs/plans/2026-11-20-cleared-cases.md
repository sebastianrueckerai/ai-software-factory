# Cleared cases: design and implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Line numbers are from the code repository's main at `94e5a9f21` (2026-11-20). Check each line before you edit it.

**Goal:** A case that waits for a human goes away by itself once the thing the human was asked to judge is gone. The human finds a record of it in the inbox thread, and the card says why it closed when it closes.

**Spec:** Sebastian's decision of 2026-11-20: "If the thing I was asked to judge disappears, yes I want it to go away. There should just be a record somewhere, maybe in the notification chat. Also, if I click an old link, for example from the Discord notification, the card should still exist (just in the done/closed column) and tell me why it closed."

**Tech stack:** Go (factoryd, console), PostgreSQL.

## Why this plan exists

On 2026-11-19 the roll card #2255 (task `t-6176de9e2d3d`) stopped at its checks gate: the checks had waited past their cap of 40 minutes. Its `gate_stop` case 7455 climbed rungs 0 to 2 and reached the human at 10:21:33 UTC with "Keep waiting?". The roll's checks turned green at 10:24:35. The case waited for a press until 19:08:34, and the roll went live 8 h 44 min later than it could have.

Rung 0 holds the rule that answers this case: `wait_checks` (`internal/factoryd/ladder.go:114-119`) resumes a checks wait once every check is green. Rung 0 runs only in `OpenTrip` (`ladder.go:308`), while a case climbs. Once a case is `at_human`, `toHuman` clears its `next_wake_at` (`cases.go:468`), the wake pass `WakeCases` (`monitor.go:135-163`) never selects it again, and no pass reads its facts again.

A card that closes often does not say why. Of the 216 cards created in the 14 days before 2026-11-20 that are now `closed`, 90 store no `closing_reason`, and 63 store only "issue closed without merge". The reason exists in 38 of the 90: it is the body of the `factory_closed` intake row that `closeIssueAsFactory` (`escalation.go:255`) writes, and no close path copies it to the card. The board fills a card's end reason only for `failed` cards, from the newest event alone (`console/board.go:1920-1925`), and the card face shows it only for `failed` (`console/faceview.go:428-429`).

What already works and stays:
- A link `#card=<id>` opens the drawer of a card in any status (`console/board.go:3021-3050`, `static/console.js:722-764`). The board's Done column holds `done`, `failed` and `closed` (`console/board.go:149-158`).
- A `question_withdrawn` event writes "<Card> needs you no more: <reason>." to each human's inbox thread (`pokes.go:300-311`), and the sender edits the Discord message to end with "withdrawn · HH:MM" (`sender.go:187-237`, `settle.go:248-263`).
- The monitor already withdraws a `monitor_flag` case at the human once its flag no longer holds (`monitor.go:219-249`).

## Task 1: rung 0 takes a case from the human when a rule fires

**Behaviour.**
- Once a minute, a pass reads every case with status `at_human` whose kind's `Rung0` list holds a row with `Fire` (`cases.go:114-162`, `ladder.go:102-171`). It skips every other case without reading its facts.
- For each such case it reads the facts as `OpenTrip` reads them, then runs the same rung 0 checks as `rungZero` (`ladder.go:1049-1100`): facts read partly take nothing, a stop that came back takes nothing, and `Act` applies its own refusals (for example `WaitedOnHead`, `actions.go:867-868`). It runs only the `Fire` rows. A `Hold` row acts by itself and does not run again.
- If a row fires, `Act` carries it out on rung 0, as it does when the case climbs. The case ends `resolved` by the factory on rung 0. The human's open rung 3 step ends. The card's run resumes as it does when rung 0 takes the case before the face.
- The human gets the same record as a withdrawal. `Act` writes the answer as `question_withdrawn`, not `question_answered`, so:
  - each inbox thread reads "<Card> needs you no more: <reason>.";
  - the Discord message of the ask is edited to end "withdrawn · HH:MM".

  The reason names the rule's finding in words, for example "every check on head 1a2b3c4 is green, so the factory resumed the checks wait". If the line passes the notice's 160 characters, the card keeps its number and drops its title. Only past that does the reason go.
- The issue gets the note "This card withdraws its question above because <reason>. It needs no answer." The note goes exactly where the face posted the question as a comment (`facesByComment`, and the case has a face comment). All three withdrawals at the human post it this one way: rung 0's re-take, the monitor's withdrawal of a flag, and the run's `withdrawQuestion`.
- A pass that takes nothing writes nothing: no step, no event, no log line per case.
- Rungs 1 and 2 still never answer a case at the human.

**Tests (hand-derived).**
- The live example: a `gate_stop` case of a roll card at the human, gate `WaitChecks`, head `1a2b3c4`, checks `pending`. The pass takes nothing and writes nothing. The checks turn `green`. The next pass resolves the case at rung 0 with `wait_checks`, the run's checks wait resumes, and the inbox thread reads the exact sentence above.
- A case at the human whose kind has no `Fire` row (for example `human_card`) is not read.
- A case at the human whose facts are read partly is not taken.
- A `wait_checks` refused by `WaitedOnHead` leaves the case at the human and writes nothing.

**Live check.** After the roll, every `gate_stop` case at the human with checks green on its head leaves the human within 2 minutes:

```sql
select count(*) from cases c
join case_steps f on f.case_id = c.id and f.rung = 3
where c.kind = 'gate_stop' and c.opened_at > :rolled_at
  and c.resolution->>'rung' = '0' and c.resolved_at > f.started_at;
```

It counts the cases rung 0 took from the human. Compare it with the checks' green time of each case's head.

## Task 2: every closed card says why it closed

**Behaviour.**
- Every path that ends a card `closed` stores a reason in `closing_reason`. The paths include `CloseTask` (`store.go:2545`), `CloseClearedCard` (`alerts.go:276-290`), the issue close in intake (`intake.go:874`), `activities.go:3107`, `act.go:336`, `act.go:1388`, `grouprevert.go:598` and `deps.go:444/510`. Find every other path that writes status `closed`.
- A card ends `closed` through `EndClosed` alone, and `TransitionTask` refuses `closed`. A path whose own reason is empty or starts with "issue closed" takes the reason from the card's records, in this order:
  1. The newest close answer: "closed by <who>: <the first sentence of the note>", or "closed by <who>" with no note. Act's Close and the console's Close write it as a `close_answer` intake row before they close the issue or signal the run, so an end the close drives finds it. A close that fails deletes its row.
  2. The first sentence of the factory's newest `factory_closed` body. An older body's lead "factoryd: task <id> closed: " is taken off. A body that only says "It no longer waits on #N." counts as none.
  3. "closed in Forgejo by <login>" for a human's close of the issue.
- A migration fills the reason of cards already closed with an empty reason or one that starts with "issue closed", from the same sources. Old cards have no `close_answer` rows, so the migration reads the `card_closed` and `question_answered` events for source 1. On 2026-11-20 it gave 296 cards a reason, and 83 had no source.
- A closed card's face reads "closed: <reason>", or the reason alone when it starts with "closed " ("closed by sebastian: …"). The board reads the stored `closing_reason`. Failed cards stay as they are, because 5 of the 12 failed in the 14 days store no reason.

**Tests (hand-derived).**
- One table row per close path: the card ends `closed` with the expected reason.
- A held alert card closed by `CloseClearedCard` stores its `factory_closed` body.
- The migration fills a closed card with an empty reason from its `factory_closed` row, and leaves a card with its own reason unchanged.
- The drawer opened by `#card=<id>` for a closed card shows "closed: <reason>".

**Live check.** After the roll, no card closed since the roll lacks a reason:

```sql
select count(*) from tasks where status = 'closed' and coalesce(closing_reason, '') = '' and finished_at > :rolled_at;
```

It reads 0. The backfill's own SELECT, counted, also reads 0 after the migration; it read 296 before.
