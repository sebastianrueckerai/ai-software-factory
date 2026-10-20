# Concept: the factory's metrics page (roadmap 147)

Sebastian, 2026-10-19: the first version answers "how is my project doing over time on metrics" at a glance, in a chart that shows how things are and how they develop. As many DORA analogues as the data carries, plus the metrics only the factory has. Iterate early on ASCII hierarchies, then a few image designs per [the process](../design/process.md). The page will change and other users will want different things, so the seam for that is designed in.

## Decisions already made in conversation

1. **The page is a console page, not a SigNoz dashboard.** The data sits in Postgres as event rows by the hard-data ruling of 2026-10-13; SigNoz reads ClickHouse, and a copy pipeline would be the reinvention. SigNoz keeps the factory's own operations (OTel metrics already flow). Division: the factory's story lives in the console, the factory's health in SigNoz.
2. **No streaming, no real time.** The question is days old when asked. The page renders a window from the URL like Costs does; htmx re-pulls a panel if one ever needs it.
3. **No chart library.** One server-rendered SVG helper inside the console's design system (C24's readout grammar): small-caps section labels, monospaced figures, hairline rows. The dataviz skill governs chart craft when built.
4. **Computation is a named queries module**: one query per figure behind one JSON endpoint per project. That module is the seam; what sits behind it can change without touching the page. A new metric later is a new query plus one template partial.
5. **Postgres stays the store of record.** These rows are operational facts; a columnar projection is a rebuildable batch read model added only on evidence (the metrics queries showing up in ops telemetry, or the audit family past ~100M rows). ClickHouse inside SigNoz is the projected home. Retention rules per row family come with the growth, not before.

## The catalogue

Windows follow DORA's habit: the page defaults to 28 days against the previous 28, switchable to 7 and 90. Buckets are weeks. Ready marks what the data already carries after the 2026-10-19 collection round.

### Delivery (DORA: deployment frequency, lead time)

| Figure | Question | Source | Ready |
|---|---|---|---|
| Deploys / week | how often the project ships | `project_rolls` count per week; the factory's own project reads its `rolls`, one per commit | yes |
| Lead time, push → live | how long a commit takes to reach staging | the merge that put the commit on main (`tasks.merge_commit`, its `pull_request_merged` event) to `project_rolls.ready_at`; the factory's own project: the rolled commit's `ci_runs.pushed_at` (the roll card's `sha`) to its roll's last image live | collects since 2026-10-20 |
| Card cycle time | filed card to done, median per week | `tasks.created_at → finished_at`, done only | yes |
| Throughput | cards done per week | `tasks.finished_at`; a card is a task that is neither chat nor a roll card, here and in every card figure | yes |

### Stability (DORA: change failure rate, time to restore)

| Figure | Question | Source | Ready |
|---|---|---|---|
| Change failure rate | share of merged cards later reverted | `tasks.reverted_at` within the window over done cards | yes |
| Refiled fixes | fixes whose alert came back | the revert pass's refile marks | yes |
| Time to restore, alert → live | how long until a raised alert is fixed and rolled | alert `raised_at` → fixing task's merge commit → its roll's `ready_at` | needs `merge_commit` on tasks; v1 shows alert → fix done |

The factory's failure rate is richer than DORA's: the revert pass finds reverts mechanically (diff reversal and alert refiling), not by human tick.

### Cost and efficiency (factory-native)

| Figure | Question | Source | Ready |
|---|---|---|---|
| Spend / week, by kind | what the factory costs | the ledger, `Costs` already computes it | yes |
| Tools / week, tool mix | what the paid tools cost, and which | the ledger's rows of kind `tool`, by ref | yes |
| Cost per card, median | what a card costs | ledger per task | yes |
| Tokens per card, cached share | how much model work a card is | `audit` token columns per task | yes |
| Model mix | which tiers did the work | `audit` by model alias per week | yes |

### Autonomy (factory-native, the dimension no DORA board has)

| Figure | Question | Source | Ready |
|---|---|---|---|
| Interventions / card | how often a human had to act | events where a human acted on a card, over done cards | yes |
| Escalations | cards that needed you | alerts of kind escalation, and the share of done cards with at least one | yes |
| Human-blocked share | the share of card time spent waiting on a human | gate and needs-you spans from the status history | yes, approximate |
| Review acceptance | first-pass reviews vs changes asked | review outcomes in `audit`/events | yes |

### The factory itself

| Figure | Question | Source | Ready |
|---|---|---|---|
| Self-deploys / week | how often the factory ships itself | the `rolls` table (the self-host loop), one deploy per commit, not per image | yes |
| CI duration, p50 | how long a project's check runs | `ci_runs` once it lands | needs `ci_runs` |
| Diff size, median | how big a card's change is | `tasks.files / insertions / deletions` | yes |
| Chat tool work | how much interactive work the agent did | chat tool calls' `at`/`ms` | yes |

Out on purpose: misreads (uncounted by ruling), questions per card (roadmap 30, not built), the intervention rate as diff share (roadmap 68, not built). Each joins its catalogue row when its collection lands.

## The collection bits the page still needs

1. `ci_runs(repository, commit, pushed_at, duration_ms)`, append-only, unique on (repository, commit), written where CI metrics already polls finished runs (about twenty lines, the plan's own note made real). Carries push time for lead time and CI duration.
2. `tasks.merge_commit`, written by the merge queue when it merges (one column, one write). Carries the card → deploy join for the full time-to-restore chain.

## The pieces to build

1. The `ci_runs` table and write (code repository).
2. `tasks.merge_commit` at merge time (code repository).
3. The queries module: one Go function per figure, SQL only, in the console package beside `Costs`.
4. `GET /projects/{name}/metrics?from=&to=`: the JSON endpoint (the seam other consumers and later panels use).
5. The page: a console template following C24's readout grammar plus the SVG chart helper (bars for weeks, one line per figure where a trend helps; every figure row carries value, previous-window delta and spark). Dark and light from the shared tokens.
6. The lab: a metrics scenario with fake data among the console-lab scenarios, so designs and fixes shoot real renders.

## The design round (per [the process](../design/process.md))

Condensed breadth form, since the shell and grammar are fixed by C23/C24 and the questions are one page's:

1. **Stage 0, ASCII hierarchies in chat, no cost.** Three variants of the info hierarchy (instrument rows, event strip, calm numbers). Sebastian picks or merges; this sets what the designs must show.
2. **Stage 1, image directions.** Six directions in both themes as images (`google/nano-banana-2.1`, the layout round's model), one brief and one content deck so the directions differ in design only. The review unit is the contact sheet.
3. **Critics.** Gemini 2.5 Pro and GLM 5V Turbo judge the sheets; the director checks every claim against the pixels and writes down overrules. At most two loops.
4. **The pick.** Sebastian's pick becomes a C-entry in design-decisions.md, with ia.md and inventory.md updated. The director's provisional pick stands only while he is away (C3's rule).
5. **Build.** The page built in the code repository against the lab, same-region before/after evidence for every visual claim.

Spending cap $15 (round 02/04 sized); expected cost near $0.30, since six directions at image prices plus two critics are cents. No generation before Sebastian has the ASCII pick in front of him: he is the judge, stage 0 is his gate.

## The build plan

Written as the superpowers plan after the design pick lands, so the plan builds the picked design and not a guess. Order: collection bits (TDD), queries module (one test per figure against the real queries), endpoint, page, lab scenario, round's fix loop on the real render.
