# Routines: the factory's recurring work

This file holds the facts and the design behind the periodic tasks: work the factory does on its own at a rhythm, such as the weekly bump of the pinned outside inputs or an audit after twenty merges. Sebastian's question of 2026-10-15: a timer that files a card works, but it surprises. Where does a member see what runs on its own, and how does that marry with the one screen? The human's side is the design round [design/rounds/04-routines/](../design/rounds/04-routines/index.html) and Sebastian's pick, C16 in [design-decisions.md](../design/design-decisions.md). This file holds the factory's side. The [roadmap](roadmap.md) item 267 holds the status.

## What ran on its own before the routines

Two clocks lived as Go constants, and nothing in the console showed them. Both are routines since 2026-10-15 (roadmap 267).

| Clock | Rhythm | What it files | Where |
|---|---|---|---|
| The weekly upstream card | 7 days after the last filing, none while one is open | A human card, "Weekly bump of the pinned outside inputs", on the code repository, author factoryd | `internal/factoryd/upstream.go`, run by the roller's poll |
| The template pass | 5 minutes after factoryd starts, then hourly and on each new configuration version | A "Template update" pull-request card per project whose render differs | `internal/factoryd/templateupdate.go`, run by the registrar |

Both were decided in the roadmap (165, 187, 203, 242) and both surprised. The template pass filed eight cards at once on 2026-10-13, and every one failed at intake (old item 260). The weekly card's rhythm drifts, since it counts from the last filing and not from a clock time. Both clocks were timers in a goroutine's memory: a restart moved them, and no record said when the next run was.

More runs on a clock without filing cards: the hourly reconcile, the daily revert pass, the pulse's 60 second fallback, the CNPG backup at 02:00 as a ScheduledBackup and the Forgejo dump at 02:30 as a CronJob in the cluster, and main's nightly CI run, which the roller once misread as a push run and answered with fix card #804.

## What the baseline rules

- [layers.md](layers.md): "Everything whole-repository or model-driven is its own card at a checkpoint: scheduled, triggered by a signal, or started by hand. Never per card." And: "Periodic cards: the missing primitive for checkpoints. An audit at a checkpoint is a card that runs a skill, and the clock is process config." Primitives are code, compositions are data.
- Roadmap 225: chat shapes work, the roadmap holds intentions, the board shows commitments. A queue holds work waiting for capacity, never for a decision. Whoever files a card sets its track.
- Roadmap 205: the roadmap is never a scheduler input.
- The autonomy plan, decision 2: the agent never invents tasks. A routine is the factory's, not the agent's. A member writes it through the chat.
- Architecture 5.6, "Settings read-only": the Policy page shows the commit in force, and a change is a commit. Roadmap 239: a level change lands as the approver's pull request on the project file.
- Roadmap 239: the inbox is the one thread the factory speaks in uninvited, one poke per state change, with a decider line when the agent acted on its own. Roadmap 145: routine agent activity never notifies, the pulse covers it.
- Ruling 178: one roll is open per repository, and a newer set folds into it. Ruling 296: a human's close of a template update stands until the render changes.
- Ruling 261: every read the console offers is a read tool of the chat.
- [goal.md](goal.md): immutable and re-seedable end to end, and modern development practice without half measures.

## The design: a routine is data per project, its run is a card, its ghost stands on the board

A routine is a named piece of recurring work with a schedule. It lives in the project's file in the configuration tree, since projects differ in setup and needs (Sebastian, 2026-10-15). The factory's own two clocks become the first routines: the weekly bump in the code project's file, and the template pass once in `policy.yaml` for every project with a template, shown on each such project's board. The filing stays a factory primitive. The schedule, the body and the rules are data.

```yaml
routines:
  - name: weekly-bump
    title: Weekly bump of the pinned outside inputs
    schedule:
      - cron: "0 6 * * 1"          # Monday 06:00 in the factory's time zone
    files: human                   # human, agent, pull-request or report
    brief: routines/weekly-bump.md
    while_open: hold               # hold, fold or file
    missed: file-once              # file-once or skip
    tell: inbox                    # inbox or quiet
  - name: audit
    title: "Audit: bug hunt and architecture review"
    schedule:
      - merges: 20
    files: agent
    skill: audit
    while_open: hold
    tell: inbox
```

The schedule is a list of triggers, any mix of three kinds:

- `cron`: five fields in the factory's time zone, for any time pattern. A day of the month and a weekday set together must both match, as Temporal reads them, so `0 3 1-7 * 0` is the first Sunday of the month, and a pattern that never fires is refused. The factory words it for the card ("every Monday 06:00", "first Sunday of the month 03:00"), and a pattern it cannot word shows as the expression.
- `merges`: a count of merged cards in the project since the last run ("every 20 merges · 14 of 20").
- `on`: an event, `configuration-version` or `push-main`.

The kinds of work a routine files:

- **human**: a card in Needs you, as the weekly bump is today. An agent's sandbox reaches no registry or release page, so a person bumps.
- **agent**: a direct-track card that runs a skill, such as the audit pair of the prompt pack after twenty merges or a weekly dependency update. It queues under the WIP bound and the budget like any card, and the autonomy level decides who starts it.
- **pull-request**: a pass that files a card only when something differs, as the template pass does. Most runs end as "no change".
- **report**: a poke or a document, no card. The weekly cost line, the drift view.

`while_open` says what a run does while the last card is open: hold skips the run and says so, fold adds to the open card as a roll does and is a pull-request routine's choice only, file opens another. `missed` says what a run does when its time passed while the factory was down: file once when it is back, or skip. `tell` says whether a filing pokes the inbox, and a report that tells nobody is refused. A human card pokes in any case, since a card that needs a person is a poke class.

The cluster's jobs (the dump as a CronJob, the backup as CNPG's ScheduledBackup) are jobs, not routines. They list on the infra project's Resources page, read-only, with their last outcome.

## The clock: durable, declared in git, reconciled

The question Sebastian put: how do recurring tasks live in this architecture so that a DevOps engineer reading the implementation is proud, or at least does not scream. The answer is the pattern the factory already uses for everything else: the desired state is data in git, a reconcile pass makes the runtime match it, and the runtime is durable execution, not a timer in memory.

**Temporal Schedules carry the time triggers.** The control plane runs on Temporal, and factoryd is a Temporal worker. A Temporal Schedule is a server-side object with a calendar or cron spec, a time zone, an overlap policy, a catch-up window, pause with a note, trigger (run now) and backfill, persisted in Temporal's database, which here is CNPG's Postgres. The Go SDK in `go.mod` (`go.temporal.io/sdk` v1.44.0) has the schedule client, and nothing uses it yet. The reconcile pass that already reads the configuration tree every 30 seconds owns the schedules: for every time trigger of every routine it creates, updates or deletes the schedule with the ID `<project>/<routine>/<n>`, so a routine removed from the file loses its clock, and a re-seed from git recreates every clock. The schedule's action starts the routine-run workflow with the routine, the project and the due time as its input.

**The store carries the merge and event triggers.** A count of merges is not a clock. On each merged card and each configuration version the factory's event path, which already writes the card's events, increments the routine's counter row in the store and starts the same routine-run workflow when the count reaches the schedule's number. The counter is a row, so a restart loses nothing.

**One run workflow, idempotent.** The routine-run workflow is a Temporal workflow with the ID `<project>/<routine>/<due time>`, so a replay, a retry or a double trigger never files twice. It reads the routine from the configuration version in force, applies `while_open`, `missed` and a pending Skip once, files the card through the same intake as every other machine source (`SourceRoutine`, author factoryd, the brief file as the body, the chip and the provenance from the routine's name and run number), writes the run's row (routine, run number, due time, card, outcome, duration, cost) and the events, and pokes the inbox by `tell`. A run that files nothing writes its row too ("no change", "held", "skipped by sebastian").

**The acts are store rows and schedule calls.** Skip once sets a mark on the routine that the next run consumes. Run now triggers the schedule, or starts the run workflow for a merge-counted routine, with the due time "now". Both are events with their via, as a queue pause is. Pause for good and a change of schedule are configuration commits.

**Why not the alternatives.**

| Option | Verdict |
|---|---|
| A goroutine with `time.After`, as today's two clocks | A timer in memory moves on every restart, keeps no record of the next run, cannot catch up and cannot be listed. Out. |
| Kubernetes CronJobs calling factoryd | Right for cluster chores that stay cluster jobs (the dump, the backup). Wrong for routines: a CronJob cannot count merges, needs a secret to call factoryd, splits the runs' history across two systems and keeps the factory's identity, budget and audit out of the loop. |
| A scheduler table in Postgres polled by factoryd | Works, and is a second scheduler beside Temporal with its own leader election, catch-up and retry to write and test. Temporal already has all four. |
| Temporal Schedules plus store counters, reconciled from git | One durable engine for every run, the desired state in git, no hidden clock, idempotent runs, a visible list in the Temporal UI beside the console's. Chosen. |

What this gives the reader from operations: declarative configuration in git, a reconciler, durable execution with explicit catch-up and overlap policies, idempotent runs keyed on their due time, an explicit time zone, every run recorded with its cost, no secret and no second scheduler. Deleting everything and re-seeding recreates every clock from the tree.

## The rules that remove the surprise

Each rule is construction, not a prompt.

1. **Announced.** Every routine of the project stands as a ghost card at the foot of the lane its card will land in, with its schedule in words, its next run and its last. A control hides the far ones or all.
2. **Predictable.** A run is at a clock time or a count, "Mon 06:00", "every 20 merges", never "7 days after the last filing".
3. **One open instance.** `hold` is the default. The ghost says "held: #781 is still open".
4. **The card explains itself.** Source routine, the routine's name, the run's number, the last run's outcome and a link to the routine, on the face as a chip and in the drawer's provenance. The body comes from the brief file in the tree.
5. **The poke names it.** The decider line reads "routine weekly-bump · every Monday 06:00".
6. **Fan-out is one run.** A routine over many projects is one run with many cards, listed as one row. A run files at most one card per project.
7. **Routine work whispers.** A run that files nothing or files an agent card is pulse material: every run of a project routine records one `routine_ran` event, and only a run that tells the inbox turns it into a poke, through the same queue as every other poke. A human card pokes as any Needs you card does.
8. **A member can act.** Skip once and Run now are acts. Run now files the card at once, and the autonomy level decides who starts it. A change of schedule, a new routine and a deletion go through the chat's three tools, each one commit on the project's file after a confirm.
9. **History.** Per routine, its runs: when, which card, outcome, duration, cost. The rows reuse the drawer's Time section (C10).
10. **Identity and money.** A run's card names the routine as its author's reason. An agent routine's cards count against the project's caps and the WIP bound. A routine never bypasses the queue.

## Candidate routines

Which routines the factory would run, so the design shows real ones. Not a commitment.

| Routine | Schedule | Kind | Project |
|---|---|---|---|
| Weekly bump of the pinned outside inputs | Mon 06:00 | human | code, infra |
| Template pass | hourly and on a configuration version | pull-request | every project with a template |
| Dependency update (go.mod, package.json patch and minor) | Thu 06:00 | agent | per project |
| Audit: bug hunt and architecture review | every 20 merges | agent | per project |
| Screenshot drift after UI changes | every 5 merges that touch the UI | agent | projects with a UI |
| Revert and drift report | Mon 07:00 | report | per project |
| Re-seed rehearsal of a staging environment | first Sunday of the month | agent | infra |
| Backup restore test | first Sunday of the month | agent | infra |
| Model catalogue and price list | Mon 06:30 | pull-request | code |
| Stale cards: a poke for cards waiting over 7 days | daily 09:00 | report | per project |
| Secret rotation | quarterly | human | infra |
| Talos and Kubernetes upgrade | quarterly | human | infra |

## Decided on 2026-10-15

1. The word: the thing is a routine, its rhythm line is its schedule (the director, on Sebastian's "you decide").
2. Per project, in the project's file. No factory page (Sebastian).
3. The cluster's jobs list on the infra project's Resources page, not on a board (the director).
4. Run now files the card at once, and the autonomy level decides the start (Sebastian).
5. Every routine stands as a ghost card at the foot of its lane, with a control to hide the far ones or all (Sebastian). The panel's column is out.
6. The main chat creates, changes and deletes routines through tool calls (Sebastian).
7. The clock is Temporal Schedules and store counters, reconciled from the configuration tree (the director, on Sebastian's "find out").

## Sources

Sebastian, 2026-10-15. [layers.md](layers.md) sections 2 and 5. [roadmap.md](roadmap.md) items 165, 187, 203, 205, 225, 239, 242 and 267. [architecture.md](architecture.md) sections 5.1, 5.3, 5.6 and 7. [design/design-decisions.md](../design/design-decisions.md) C16. The code repository's `internal/factoryd/upstream.go`, `templateupdate.go` and `go.mod`. The infra repository's `k8s/platform/temporal/helmrelease.yaml` and `k8s/platform/cnpg/databases.yaml`. The board research: [Factory's automations](board/reports/factory-mission-control.md), [GitHub Agent HQ's automations pane](board/reports/github-agent-hq.md), [Hermes's scheduled column](board/reports/hermes-kanban.md) and [Trello's Butler](board/reports/trello.md).
