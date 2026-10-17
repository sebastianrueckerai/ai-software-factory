# Level review: what each level guards once the wakes run

Proposal of 2026-10-18, held by Sebastian's decision of 2026-10-17 to
review the autonomy levels after the wake build
([main-agent-concept-2026-10-17.md](main-agent-concept-2026-10-17.md)).
Nothing here changes code. Sebastian decides.

The four states the level control offers are manual, assisted, autonomous
and full auto. Full auto is not a fifth level: it is autonomous with the
merge rule on auto, a display state. A wake turn has exactly the powers
of a turn the member started, at the same level, through the same confirm
resolution (`ConfirmFor`, internal/policy/policy.go). Nothing in the wake
path loosens a confirm.

## What each level produces today

The confirm list each level produces over the default policy's `chat`
block (the lists name only the tools that confirm; everything else
applies at once):

| Level | Confirms |
|---|---|
| manual | the files' whole confirm list plus the always-confirm set: every filing, move, answer, tell, steer, plan decision, close, edit, dependency, split, routine skip, and below the always set |
| assisted | the manual list minus the starts and filings, which come off: `new_card`, `move_card`, `start_plan`, `accept_plan`, `retry`, `grant_session`, `routine_run` run free |
| autonomous | the always-confirm set only: `approve_merge`, `deny_merge`, `invite`, `alert_verdict`, `promote_resource`, `release_resource`, `github_export`, `github_sync`, `write_doc`, `set_autonomy`, `routine_write`, `routine_delete` |
| full auto | the autonomous list minus `approve_merge` and `deny_merge`, since the merge rule is auto |

No level loosens the doors outside the confirm list: the approvers list
on merges, resources and envelopes, the ready check on starts and
filings, Forgejo's whitelist as the merge authority, the sandbox and the
gates on work, the month cap and the per-task budgets at the gateway,
and the sanitiser on the way in.

## What the wakes change

| Level | Wakes that run | What changes for the member |
|---|---|---|
| manual | none: the gates hold every class | nothing. The agent exists only inside a turn the member starts. The heartbeat, watches, timers and ask attempts are all off |
| assisted | watched cards, timers, the heartbeat | the project now runs turns no member started: one an hour while work sits open. The level already let the agent file and start free, but only ever inside a member's turn; the heartbeat gives that permission its own trigger. Proposals from a wake stand in the inbox thread |
| autonomous | the assisted set, plus the ask attempt | every ask that would reach a human now gets one model turn first. At this level `answer` applies without confirm, so the attempt can settle an ask outright. The boundary table's No families, money, direction and policy class, are guidance to the model, not code |
| full auto | the same as autonomous | nothing waits for a person but direction and money, and the attempt now stands between every ask and the person. The rare needs-you card should hold only No-family asks |

## What the review should decide

1. Asks stay at autonomous and above, the decision of 2026-10-17, or
   assisted gains attempts whose settlements confirm. The build
   recommends keeping the decision: below autonomous the attempt could
   only propose, and a proposed answer to an ask the human would have
   read anyway adds a step.
2. Manual stays asleep, or the heartbeat wakes it. The build recommends
   asleep: a level where every agent act confirms is a level where the
   member wants to start every turn.
3. At assisted, a wake turn files and starts without confirm, the
   level's own rule. The wake changed the trigger, not the permission.
   The build recommends keeping it and watching the first live weeks:
   the heartbeat's hourly cadence bounds the rate, one turn an hour.
4. The boundary table is guidance, not code. At autonomous the attempt
   could settle a money ask with `answer`, which runs free there. The
   build recommends pinning the No families in code: an answer from an
   attempt on a spend, direction or policy ask refuses and attaches the
   analysis instead. One refusal branch per family.
5. The heartbeat skips a board that waits on a human. At full auto that
   skip may hide the one ask that matters, since a needs-you card there
   should be rare and always a No family. The build recommends keeping
   the skip: the needs-you card is the loudest signal the screen has.
6. The numbers: one wake turn per 10 seconds, one wake per watched card
   per minute, a failed wake holds a minute, 16 watches and timers per
   project, the heartbeat hourly on open work and daily on idle. The
   build recommends they stand until live data says otherwise.
