# Routines: the factory's recurring work

This file holds the facts and the proposal behind the periodic tasks: work the factory does on its own at a rhythm, such as the weekly bump of the pinned outside inputs or an audit after twenty merges. Sebastian's question of 2026-10-15: a timer that files a card works, but it surprises. Where does a member see what runs on its own, and how does that marry with the one screen? The human's side is the design round [design/rounds/04-routines/](../design/rounds/04-routines/index.html). The [roadmap](roadmap.md) holds the item's status once Sebastian picks.

## What runs on its own today

Two clocks live as Go constants, and nothing in the console shows them.

| Clock | Rhythm | What it files | Where |
|---|---|---|---|
| The weekly upstream card | 7 days after the last filing, none while one is open | A human card, "Weekly bump of the pinned outside inputs", on the code repository, author factoryd | `internal/factoryd/upstream.go`, run by the roller's poll |
| The template pass | 5 minutes after factoryd starts, then hourly and on each new configuration version | A "Template update" pull-request card per project whose render differs | `internal/factoryd/templateupdate.go`, run by the registrar |

Both were decided in the roadmap (165, 187, 203, 242) and both surprised. The template pass filed eight cards at once on 2026-10-13, and every one failed at intake (old item 260). The weekly card's rhythm drifts, since it counts from the last filing and not from a clock time.

More runs on a clock without filing cards: the hourly reconcile, the daily revert pass, the pulse's 60 second fallback, the CNPG backup at 02:00 and the Forgejo dump at 02:30 as CronJobs in the cluster, and main's nightly CI run, which the roller once misread as a push run and answered with fix card #804.

## What the baseline rules

- [layers.md](layers.md): "Everything whole-repository or model-driven is its own card at a checkpoint: scheduled, triggered by a signal, or started by hand. Never per card." And: "Periodic cards: the missing primitive for checkpoints. An audit at a checkpoint is a card that runs a skill, and the clock is process config." Primitives are code, compositions are data.
- Roadmap 225: chat shapes work, the roadmap holds intentions, the board shows commitments. A queue holds work waiting for capacity, never for a decision. Whoever files a card sets its track.
- Roadmap 205: the roadmap is never a scheduler input.
- The autonomy plan, decision 2: the agent never invents tasks. A routine is the factory's, not the agent's.
- Architecture 5.6, "Settings read-only": the Policy page shows the commit in force, and a change is a commit. Roadmap 239: a level change lands as the approver's pull request on the project file.
- Roadmap 239: the inbox is the one thread the factory speaks in uninvited, one poke per state change, with a decider line when the agent acted on its own. Roadmap 145: routine agent activity never notifies, the pulse covers it.
- Ruling 178: one roll is open per repository, and a newer set folds into it. Ruling 296: a human's close of a template update stands until the render changes.
- Ruling 261: every read the console offers is a read tool of the chat.

## The proposal: a routine is data, its run is a card

A routine is a named piece of recurring work with a rhythm. The factory ships the two clocks above as two routines in the configuration tree, and a project adds its own in its process file. The filing stays a factory primitive. The clock, the body and the rules are data.

```yaml
routines:
  - name: weekly-bump
    title: Weekly bump of the pinned outside inputs
    every: week
    at: "Mon 06:00"
    files: human            # human, agent, pull-request or report
    repository: ai-software-factory-code
    brief: routines/weekly-bump.md
    while_open: hold        # hold, fold or file
    tell: inbox             # inbox or quiet
```

The kinds:

- **human**: a card in Needs you, as the weekly bump is today. An agent's sandbox reaches no registry or release page, so a person bumps.
- **agent**: a direct-track card that runs a skill, such as the audit pair of the prompt pack after twenty merges or a monthly dependency update. It queues under the WIP bound and the budget like any card, and the level decides who starts it.
- **pull-request**: a pass that files a card only when something differs, as the template pass does. Most runs end as "no change".
- **report**: a poke or a document, no card. The weekly cost line, the drift view.

The cluster's CronJobs (the backup, the dump) are jobs, not routines. The view lists them read-only with their last outcome, so "what runs on its own" has one answer.

`every` takes hour, day, week or month with `at` as a clock time in the factory's time zone, or `after: {merges: 20}` for a checkpoint counted in merged cards. `while_open` says what a run does while the last card is open: hold skips the run and says so, fold adds to the open card as a roll does, file opens another. `tell` says whether a filing pokes the inbox. A human card pokes in any case, since a card that needs a person is a poke class.

## The rules that remove the surprise

Each rule is construction, not a prompt.

1. **Announced.** Every routine's next run is visible before it files. Where it is visible is the design round's question.
2. **Predictable.** A run is at a clock time, "Mon 06:00", never "7 days after the last filing".
3. **One open instance.** `hold` is the default. The view says "held: #781 still open".
4. **The card explains itself.** Source routine, the routine's name, the run's number, the last run's outcome and a link to the routine, on the face as a chip and in the drawer's provenance. The body comes from the brief file in the tree.
5. **The poke names it.** The decider line reads "routine weekly-bump · every Monday 06:00".
6. **Fan-out is one run.** A routine over many projects is one run with many cards, listed as one row. A run files at most one card per project.
7. **Routine work whispers.** A run that files nothing or files an agent card is pulse material. A human card pokes as any Needs you card does.
8. **A member can act.** Skip once and Run now are acts, events with their via, as a queue pause is today. A change of rhythm or a pause for good is a configuration change: the chat proposes it, and the approver's pull request lands it, as the level change does.
9. **History.** Per routine, its runs: when, which card, outcome, duration, cost. The rows reuse the drawer's Time section (C10).
10. **Identity and money.** A run's card names the routine as its author's reason. An agent routine's cards count against the project's caps and the WIP bound. A routine never bypasses the queue.

## Candidate routines

Which routines the factory would run, so the design shows real ones. Not a commitment.

| Routine | Rhythm | Kind | Project |
|---|---|---|---|
| Weekly bump of the pinned outside inputs | Mon 06:00 | human | code, infra |
| Template pass | hourly and on a configuration version | pull-request | every project with a template |
| Dependency update (go.mod, package.json patch and minor) | Thu 06:00 | agent | per project |
| Audit: bug hunt and architecture review | after 20 merges | agent | per project |
| Screenshot drift after UI changes | after 5 merges that touch the UI | agent | projects with a UI |
| Revert and drift report | Mon 07:00 | report | per project |
| Re-seed rehearsal of a staging environment | first Sunday of the month | agent | infra |
| Backup restore test | first Sunday of the month | agent | infra |
| Model catalogue and price list | Mon 06:30 | pull-request | code |
| Stale cards: a poke for cards waiting over 7 days | daily 09:00 | report | per project |
| Secret rotation | quarterly | human | infra |
| Talos and Kubernetes upgrade | quarterly | human | infra |

## Open questions for Sebastian

1. The word. "Routine" is the working word: short, and the docs already say "routine agent activity never notifies". "Standing order" fits the Mission control idiom better and means an instruction in force until changed. "Schedule" is the plainest and names a time, not the work.
2. Home. Per project on the project's screen, or one factory page for writers, or both.
3. Jobs. Whether the cluster's CronJobs show in the same view.
4. Run now. A member's act, or an approver's.
5. Checkpoints. Counted in merged cards, in time, or both.

## Sources

Sebastian, 2026-10-15. [layers.md](layers.md) sections 2 and 5. [roadmap.md](roadmap.md) items 165, 187, 203, 205, 225, 239 and 242. [architecture.md](architecture.md) sections 5.1, 5.3, 5.6 and 7. The code repository's `internal/factoryd/upstream.go` and `templateupdate.go`. The board research: [Factory's automations](board/reports/factory-mission-control.md), [GitHub Agent HQ's automations pane](board/reports/github-agent-hq.md), [Hermes's scheduled column](board/reports/hermes-kanban.md) and [Trello's Butler](board/reports/trello.md).
