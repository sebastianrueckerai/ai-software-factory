# Factory (Droids): Mission Control

Assessed from documentation only (closed commercial platform; per this round's
rules no account was created, no key entered, nothing paid). Everything below
comes from Factory's published documentation (open docs mirror
`Factory-AI/factory` at `485a0c3`, 2026-09-17, still "Already up to date" on
pull; the live docs at docs.factory.com), the factory.com site and pricing
page, the official release-notes changelog, official news posts, published UI
screenshots and current marketing imagery, the public GitHub issue tracker,
and community threads (HN, Reddit via search snippets — Reddit itself is
login-walled). The live app at app.factory.ai/missions loads a shell and
requires sign-in ([app-missions-loginwall.png](shots/factory-mission-control/app-missions-loginwall.png));
it was not entered. Studied on 2026-10-01/02.

## Header

- Product and URL: Factory — Droid agents and Missions; Mission Control is
  the dashboard. factory.com (formerly factory.ai), app at
  https://app.factory.ai/missions, docs at https://docs.factory.com/docs,
  changelog at https://docs.factory.com/docs/changelog/release-notes, docs
  mirror https://github.com/factory-ai/factory. Closed source; CLI binaries
  and Desktop app are downloads, not source.
- License, price model, self-hosted or free tier: proprietary SaaS. Pro
  $20/mo, Plus $100/mo (~5x Pro usage), Max $200/mo (~10x usage, early
  access), Teams $60/mo per team + $40/mo per seat (up to 10 seats,
  centralized billing), Business and Enterprise custom via sales. Usage runs
  on rolling rate limits described as multipliers of Pro; BYOK (bring your
  own model keys) is supported, and Factory Router routes across providers.
  No self-hosted option below Enterprise on-premises. The pricing page does
  not mention Missions, Mission Control, or prepaid credits at all — the
  closest gated item is Droid Computers (Plus and above).
- Alive? Extremely. CLI v0.231.0 / Desktop v0.188.0 shipped 2026-10-01;
  near-daily releases across the whole week studied (v0.227 Sep 25 through
  v0.231 Oct 1). Automations went GA for everyone on Sep 30; Factory joined
  the OpenAI marketplace Sep 29; $200M raised at a $5B valuation Sep 15
  (factory.com/news). The docs repo itself has had no commit since 2026-09-17
  while the deployed docs and product keep moving — the mirror lags the
  product.
- One sentence: Mission Control is the dashboard in Factory's Desktop/Web
  app (and the CLI) where a multi-droid "mission" — one orchestrator
  decomposing a goal into milestones and features, executed by parallel
  worker droids and checked by validator droids — is monitored and steered by
  a human acting as "project manager of agents".

Relationship to the 2026-09-29 market report
(`docs/market-research/projects/factory-ai/report.md`): that report covered
the platform whole (company, CLI, sandboxes, policy, enterprise gating). This
round re-verifies and deepens one surface only — the Mission Control UX — and
adds the delta since its cutoff. **What changed by 2026-10-02:** (1)
Automations GA (Sep 30): trigger-based recurring droid runs (schedule, Slack,
GitHub, webhook), an Automations Marketplace of templates (Ticket to PR,
Security Audit, PR Babysitter, Morning brief), an Events feed, run history
and a 7-day success rate per automation — an always-on sibling to Missions,
marketed on the homepage grid ([automations-news.png](shots/factory-mission-control/automations-news.png)).
(2) Release notes Sep 29–Oct 1: scheduled-loops pill above the chat input
with pause/resume/stop (v0.229); session artifact actions now report PRs and
issues *viewed/updated/closed/merged*, not just created (v0.230); a startup
freeze "with thousands of sessions" fixed (v0.230); transcript history
paging in the terminal (v0.231); private Slack channel names hidden from
non-members (v0.231). (3) Docs moved: docs.factory.ai now 308-redirects to
docs.factory.com, missions pages restructured under `/docs/missions/*` with
webp-converted images and a `/mission` alias — content substantively
unchanged ([docs-missions-running-app.png](shots/factory-mission-control/docs-missions-running-app.png)).
(4) Homepage re-framed enterprise: "BUILD YOUR AUTONOMOUS SOFTWARE FACTORY"
over Control/Governance/Value pillars, with a features grid where Mission
Control is now marketed with a **CLI TUI screenshot** rather than the web
dashboard ([site-mission-control-tui.jpg](shots/factory-mission-control/site-mission-control-tui.jpg),
source: factory.com homepage feature grid). (5) droid-action at `812429d`
(2026-09-28), one commit past the baseline's observation. **What did not
change:** Mission Control itself — no changelog entry touches it since a fix
in v0.173 (July); mission-adjacent items are all August (model settings
v0.199, milestone validation v0.208, resume/session ordering v0.210). The
dashboard is stable while the motion happens around it.

## 1. The board model

- Columns: none. Mission Control is dashboard-centric, not board-centric —
  the scan.md observation holds. The structure comes from the mission plan,
  not from user-made columns: a goal decomposes into **milestones**, each
  milestone into **features**, each feature owned by one worker droid, with
  **validators** gating milestone completion. The column-ish thing is the
  center panel's stack of milestone cards in state order (Completed above,
  In Progress below).
- Card anatomy, at three scales. (a) *Worker rows* in the left "Sessions"
  rail: status icon (blue spinner = running, green check = done), worker
  number + feature title, elapsed time, feature count `5/5`, and a `PAUSED`
  badge when paused; the orchestrator row adds a plain-language state
  subtitle ("Milestone 1 complete, milestone 2 in progress"), a green dot and
  its own elapsed clock. (b) *Milestone cards* in the center: an
  "Orchestrator's Summary" paragraph, a feature checklist with green checks,
  the commit list with hash chips and messages, and the validation verdict —
  "25/25 assertions passed" with a green check and a "Validator 1" tag. (c)
  *The mission header*: back arrow, session title, a live elapsed timer
  (`02:57:04` in the demo), `Factory Standard Credits 35.5M`, and the pause
  button. The full anatomy is visible in the two published screenshots
  ([mission-control-published.png](shots/factory-mission-control/mission-control-published.png),
  desktop; [mission-web-published.png](shots/factory-mission-control/mission-web-published.png),
  web — sources: `raw.githubusercontent.com/Factory-AI/factory/main/docs/images/mission-control.png`
  and `.../mission-web.png`). What hides behind a click: selecting a worker
  shows "its detailed terminal output, thought process, and any sub-tasks it
  completed" (docs). What never appears on the board: per-worker spend
  (credits are mission-aggregate only), raw worker conversations in
  parallel, and any cross-mission overview — one mission fills the screen.
- Where the human's decisions live: three places, none of them approval
  cards. (1) *Plan approval*, before the mission starts: Missions begin as a
  collaborative planning conversation (`/missions`), and the mission enters
  execution only after you approve the plan. (2) *Pause-and-talk*, during the
  run: the pause button in the header plus a plain-language message to the
  orchestrator in the center panel. (3) *Validation milestones* — scrutiny
  and user-testing QA gates that pause the plan's progress and can be
  disabled in mission settings inside Mission Control. Distance from board
  to a decision: pause is one click; the decision itself is typed, not
  clicked. There is no queue of pending decisions anywhere in Mission
  Control — the app-level session sidebar outside Mission Control does the
  attention routing ("bolds sessions that are waiting for you to confirm a
  tool call", changelog v0.227, Sep 25).
- Filters, swimlanes, cross-project views: none documented inside Mission
  Control. The Mission Control tab (`app.factory.ai/missions`) is the list of
  past and current missions, each resumable "exactly where you left off".
  Workers can target **Droid Computers** (persistent remote machines) so
  long missions run in the background untied to the laptop.

## 2. Agent-task specifics

The heart of this report: the densest per-agent telemetry in the field, at
mission scope.

**What each droid shows while it runs.** Every worker row carries the triple
status icon / elapsed time / feature-count. In the published demo, nine agent
rows are readable at once: Orchestrator (1:40:14, "Milestone 1 complete,
milestone 2 in progress"), workers 1–6 ("1. Spec and scaffolding for auth
API" 28 min 5/5 done; "2. Core CRUD endpoints" 1:52:02 8/8 done; "3.
Advanced queries and filtering" 38:00 6/6; "4. Analytics and reporting"
44:00 4/4; "5. Testing and validation" 1:08:00 12/12; "6. Documentation and
cleanup" 42:00 9/12 running-with-PAUSED-badge), Validator 1 (18 min, PASSED)
and Validator 2 (12 min, RUNNING). At mission scope the header pins elapsed
time and credits — total spend is always visible, never per agent. The right
rail keeps a timestamped progress log of every worker and milestone event
("1:52:02 — Core CRUD endpoints worker completed (8/8 features)", "2:14:00 —
Milestone 1 completed"), interleaving all agents into one timeline.

**What changes when a droid finishes, fails, or asks.** Finish: spinner →
green check, count locks at `n/n`, elapsed stops. Milestone finish: a
Completed card with summary prose, checklist, commit hash chips and the
validator's assertion verdict ("25/25 assertions passed"; the web variant's
next milestone reads 47/47). Failure: workers have a feature retry limit —
"Missions stop after several failed attempts to complete a feature" and the
UI surfaces "Feature retry limit reached"; validators can fail a milestone;
the troubleshooting doc's recovery is human: message the orchestrator.
Asking: there is no per-droid question state in Mission Control — questions
route through the orchestrator conversation or the app-level sidebar's
awaiting-confirmation bolding.

**Where the conversation lives.** Behind a click: worker drill-in shows
terminal output, thought process and sub-tasks; the web app shows the
orchestrator's conversation in the center. Default view is summaries, not
streams. The current homepage marketing tells the other story — the CLI TUI
Mission Control ([site-mission-control-tui.jpg](shots/factory-mission-control/site-mission-control-tui.jpg)):
same three-zone layout in a terminal, plus a *preconditions / expected
behavior* spec panel for the active feature, and a bottom strip streaming
the active worker's phase output — read → create → execute → test → commit —
including live test results ("156 passed, 5 skipped, 0 failed", "coverage:
92%") and commit stats ("commit a1f8e9c authored 20s ago, +1,891 −112 across
14 files"). So Factory ships the dense telemetry twice: web dashboard =
aggregate + drill-in; TUI = spec + one live stream. Neither shows all
workers' streams simultaneously.

**Steering mid-run.** The documented model is pause → talk → resume, and it
is deliberately conversational: "Missions are not fire-and-forget. The
orchestrator is an agent, and you can talk to it" (running-cli doc). From
the troubleshooting doc, verbatim example prompts: for a frozen mission —
*"Re-assess and continue"*; for a stuck worker — *"Mark it as complete and
move to the next feature"*; for a scope change — *"Drop the email
notification feature and add Slack integration instead. Re-plan the
remaining milestones."* Pause lives in the header, one click; the redirect
is typed into the center panel; resume is one click. The skill the docs
name is "project management of agents" — "monitoring a team of workers,
unblocking them when they get stuck... and making judgment calls about when
to push through versus when to re-plan."

**Spend, budgets, limits.** Surfaced in three places, none of them per-card:
the header's aggregate `Factory Standard Credits` counter; the per-role
model dropdowns in the right rail (the demo runs Orchestrator on Opus 4.8,
Workers on Opus 4.7, Validator on GPT-5.3-Codex — changeable "on the fly");
and the settings surface (`missionModelSettings`: worker/validator/orchestrator
model and reasoning effort, `skipScrutiny`, `skipUserTesting`), plus
headless flags `--worker-model --worker-reasoning-effort
--validator-model --validator-reasoning-effort` on `droid exec --mission`.
The docs' own cost tip is the split: strong model for planning and
validation, light model for routine workers. Enterprise gets a blunt
instrument instead of a budget: `missionPolicy.restrictedAccess` +
`allowedUserIds` decides who may launch missions at all.

**Parallel droids at a glance.** The left rail is the parallel-readable
surface: nine rows, each icon + title + time + count, one glance. The
progress log interleaves all agents' events into one timeline. What Mission
Control does *not* do is a grid of live outputs.

**Checked against stage10-queue section H.** Pattern 7 (elapsed time, spend
and checks on the card): two of three, done properly — elapsed and
checks-done (feature counts, assertion verdicts) are on every row; spend is
mission-aggregate only, not per card. Pattern 12 (grid of all running
agents' live output as a second view on the same cards): *not implemented*
— live output is per-worker drill-in (web) or one active worker's stream
(TUI). Factory, the product our pattern 7 cites, declines pattern 12.

## 3. Interaction model

- Moving work: no drag and drop anywhere. Select, click, type. The only
  state-changing buttons are pause/resume and "+ New" session; everything
  else is conversation or dropdowns.
- Keyboard and mobile: the Desktop app and web app are mouse-first; the CLI
  TUI is fully keyboard-driven and, since v0.231 (Oct 1), pages a session's
  full saved history with Alt/Option+arrows. app.factory.ai has web/mobile
  surfaces where sessions appear (a public bug, issue #22, is that
  Desktop-created sessions stamped machineId "local" never appear there);
  mission steering on mobile is not documented.
- Refresh model: live push. Docs promise "real-time visibility"; in the
  screenshots the header timer (02:57:04) and credits are live-updating
  elements, the progress log appends without reload, spinners animate. One
  honesty note on the evidence: in both published screenshots the progress
  log's timestamps run past the header timer (entries at 3:07, 3:12 against
  a 02:57:04 clock) — these are marketing mockups, internally inconsistent
  by a quarter hour, so pixel-level readings are demo data, not a captured
  session.
- The click map. Read status of all agents: **0 clicks** (the rail is the
  default view). Read one agent's detail: **1 click** (select the worker →
  terminal, thoughts, sub-tasks). Read milestone evidence (commits,
  assertions): **0–1 clicks** (on the milestone card). Steer: **1 click +
  typing + 1 click** (pause, message, resume). Decide/approve: plan approval
  is **pre-mission** in the planning conversation; there are no mid-run
  approve/deny buttons, so the concept "clicks to approve" does not exist
  during execution. Comment: **0 clicks** — talking is the center panel's
  primary mode.

## 4. Visual system

- Themes: dark is the default and, in every published Mission Control image,
  the only theme shown — near-black ground, off-white primary text, one
  accent green for done/validated, blue reserved for in-progress spinners,
  a pink/magenta tone marking the orchestrator's icon, yellow traffic-light
  chrome in the TUI. Color is entirely **system-set semantics**: green =
  completed/passed, blue = running, pink = orchestrator role, badges like
  PAUSED carry their own label. There is no user-set color anywhere — no
  labels, no tag colors, no card colors; identity comes from position and
  icon, not hue. That is the opposite pole from Trello's user-set color
  system, and it is what lets nine status rows read at a glance.
- Typography and density: compact sans for UI text, prose summary in the
  milestone card at comfortable reading size, monospace for terminal output
  and commit hashes. Density is high but bounded: the demo fits 9 agent rows
  + 3 milestone/summary cards + a 10-entry progress log + 3 model dropdowns
  in one 3-column screen; each rail row is thumbnail-readable (icon, title,
  time, count — nothing else). The TUI variant proves the same grammar
  survives a 140x46 terminal cell.
- The status vocabulary, enumerated: worker **running** (blue spinner),
  worker **done** (green check + `n/n`), worker **paused** (`PAUSED` badge,
  spinner continues on the owning row), orchestrator **active** (green dot +
  milestone subtitle updating), validator **passed** (PASSED + green),
  validator **running** (RUNNING), milestone **completed** (summary card +
  checklist + commits + assertion verdict), milestone **in progress**
  (partial checklist card), mission **paused** (header button state, timer
  frozen), and — app-level, outside Mission Control — session **awaiting
  your confirmation** (bolded sidebar row, changelog v0.227). Every state is
  distinguished by icon+badge+text together, never color alone.
- Execution quality worth stealing: the restraint. One accent per meaning,
  no color floods, badges that name themselves in words, aggregate counters
  pinned where the eye rests (top center), and the noisiest element (the
  progress log) confined to a sidebar column instead of the center.

## 5. What users say

Community evidence is thin for a product this size — Factory "does little
marketing" in users' own words, and much of the talk is about Droid the
agent, not Mission Control the dashboard. The clearest voices:

Complaints:

1. **Token burn outruns output on small tasks.** r/FactoryAi, "Tried Droid
   for a few simple features. Scratched it off the list." — "It produced
   around 605 lines after helping it along with 2-3 'it doesn't work' cycles.
   Overall about a 20-25 minutes"
   (https://www.reddit.com/r/FactoryAi/comments/1rjnpbe/). The credit meter
   exists; per-run cost visibility small enough to act on does not.
2. **A green state that lies.** GitHub issue #2 (open since 2026-08-03):
   "`droid exec --mission` performs no work and reports success (num_turns
   0, zero tokens, exit 0)"
   (https://github.com/Factory-AI/factory/issues/2). For a dashboard whose
   job is state truth, a mission that no-ops and reports success is the
   worst failure class — and it validates Factory's own instinct to put
   assertion counts on completion cards.
3. **Session sprawl and split surfaces.** Issue #1 (open, 2026-07-30):
   "Factory Desktop persists and lists unused zero-token sessions across
   project folders"; issue #22 (open, 2026-08-21): Desktop-created sessions
   "never appear on app.factory.ai web/mobile"
   (https://github.com/Factory-AI/factory/issues/1,
   .../issues/22). The session list — Mission Control's home ground —
   accumulates noise and fragments across app surfaces; users also ask for
   *more* telemetry, not less (issue #21: "Show real-time output token
   counter while Droid is streaming", .../issues/21).

Praise:

1. **Capability density.** r/FactoryAi, "20x Claude Code user here. Just
   tried Factory Droid" — "it feels like cheating"
   (https://www.reddit.com/r/FactoryAi/comments/1ri8p0k/). Heavy CLI users
   convert on the agent, and stay for Missions.
2. **Context handling.** r/vibecoding, "Any one using droid from factory.ai
   for vibe coding?" — "it has infinite context window (it feel like it) it
   doesn't fix bugs by causing more bugs"
   (https://www.reddit.com/r/vibecoding/comments/1pnoi01/). What users
   praise maps directly to the Missions architecture HN summarized: "spins
   up fresh worker sessions per feature, each with a clean context and a
   specific scope" (https://news.ycombinator.com/item?id=47182879).
3. **Leave-it-overnight reliability.** r/FactoryAi comment on mission
   speed: "Missions in Droid CLI are slow because they deliberately use sync
   agents. It works more reliable, you can leave 'mission' for a night" —
   the slowness users complain about elsewhere is the same property they
   trust for unattended runs.

## 6. Verdict for us

- **Steal**:
  - The worker-row telemetry triple: status icon + elapsed + `n/n` checks on
    every agent row. One line for us: every agent card carries elapsed time
    and a done/total count beside the state icon, always.
  - Mission-scope spend pinned in the header. One line: aggregate spend is a
    permanent header element; per-agent cost lives in drill-in.
  - Per-role model dropdowns, changeable mid-run, right where you monitor.
    One line: model/effort selectors per agent role on the monitoring
    surface, not buried in settings.
  - Pause → plain-language redirect → resume, with named re-plan verbs.
    One line: steering is a message to the supervisor agent; offer "re-assess
    / re-plan / mark complete" as one-click sentence starters.
  - Milestone completion cards that carry evidence: summary + checklist +
    commit hashes + assertion verdict. One line: a done card must show its
    proof, never just "done".
  - The app-level attention state: bold whatever is waiting on a human.
    One line: rows needing a decision render bold (v0.227 does exactly
    this outside Mission Control).
- **Skip**:
  - No per-agent spend on the row. Our pattern 7 includes spend; Factory's
    aggregate-only meter is exactly what users complain about when the bill
    surprises them.
  - One mission fills the screen; no fleet view. We need cross-mission,
    cross-agent glanceability — depth-over-glance is their choice, not ours.
  - Trusting green. Issue #2's no-op success is why our completion states
    must be evidence-backed (checks, commits), not exit-code-backed.
  - An ever-growing progress log as the only history. At our noise budget
    it must fold.
- **Decision needed** (the aggregate report must settle):
  - Live output for parallel agents: grid (our pattern 12) vs drill-in
    (Factory's choice in the web app). The field is split; Trello/Linear
    say nothing, Factory says drill-in plus one active stream.
  - Spend granularity: per-card spend (pattern 7) vs header-aggregate only
    (Factory). These are mutually exclusive designs at card density.
  - Mid-run human decisions: explicit approval cards/queues vs Factory's
    pause-and-talk with plan approval up front. Both work; they cannot be
    mixed on one card without clutter.
- **Cloneability**: not cloneable. Closed SaaS; no self-hosted tier below
  Enterprise on-prem; the Desktop/Web Mission Control is proprietary. What
  is open: the docs repo (Factory-AI/factory, where the screenshots in this
  report live), the droid CLI binary (installable, usable with BYOK keys —
  outside this round's zero-spend rules), and the droid-action GitHub
  Action. The *pattern* is cloneable: the telemetry triple, the evidence
  card and the pause-talk-resume grammar are all reproducible on our board
  without any Factory code.

## Scoring axes

| Axis | Score | Reason |
|---|---|---|
| Card scannability (read ten cards in one glance) | 4 | Nine agent rows read in one glance (icon+time+count), but milestone prose cards need reading and there is no cross-mission view at all. |
| State clarity (what is happening, how far, what next) | 5 | Running/done/paused/validated are icon+badge+count distinct, orchestrator row narrates the milestone state in words. |
| Human-decision surface (find and make the next decision) | 3 | No decision queue inside Mission Control; decisions are pre-run plan approval plus typed redirects — nothing tells you which droid needs you now. |
| Agent-activity legibility (is the agent working, waiting, stuck) | 4 | Per-worker elapsed + counts, interleaved progress log, drill-in to terminal and thoughts; but worker streams are never visible in parallel. |
| Noise level (5 means quiet: nothing without meaning) | 4 | Every pixel carries telemetry and states name themselves; the unbounded progress log and nine near-identical rows at scale are the only chatter. |

Sources: docs mirror `Factory-AI/factory@485a0c3` (missions docs, published
screenshots); live docs factory.com/docs/missions/* (2026-10-02); release
notes v0.227–v0.231; factory.com homepage, pricing, /news/automations;
GitHub issues #1, #2, #21, #22; HN item 47182879; Reddit threads as cited.
Shots in [shots/factory-mission-control/](shots/factory-mission-control/):
published UI (mission-control-published.png, mission-web-published.png,
software-factory-dashboard-published.png from the docs repo at
raw.githubusercontent.com/Factory-AI/factory/main/docs/images/), current
homepage TUI marketing image (site-mission-control-tui.jpg from
factory.com's features grid), and headless-Chrome captures of factory.com
(homepage.png, pricing.png, automations-news.png), the live docs page
(docs-missions-running-app.png) and the app login wall
(app-missions-loginwall.png), taken 2026-10-02.
