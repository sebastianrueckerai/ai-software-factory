# The field scan

Task 143, searched 2026-10-01/02. Method: web search over the classic list
(Trello, Linear, Plane, Focalboard, Wekan, Kanboard) and the AI-native list
from the old roadmap item 21 (cline/kanban, Vibe Kanban, Automaker, Nimbalyst,
Linear's agent sessions, GitHub Agent HQ, Factory Mission Control, Conductor's
Checks tab, Claude Squad) plus Hermes Agent's board, cross-checked against the
market-research reports of 2026-09-29 where they exist, plus everything the
search itself surfaced. One paragraph per candidate: what it is, license,
alive, board-centric or afterthought.

## The classic boards

- **Trello** (trello.com). Atlassian's card board, closed SaaS, free tier,
  alive and shipping (seven AI features for paid plans in 2026, an AI board
  builder that generates lists, cards and checklists from a prompt, and an
  agent push at TEAM '26). Board-centric: the board is the product. The AI is
  assistant-shaped (busywork: dedupe, merge, board setup), not an agent lane.
- **Linear** (linear.app). Closed SaaS, free tier, alive and fast-moving.
  Board-centric project tracking with a keyboard-first culture. June 2026
  added coding sessions: delegate an issue, Linear Agent runs Claude Code (or
  an open-weight model) in a managed sandbox, billed from prepaid AI credits;
  August added coding environments and browser use, September environment
  secrets. Agents appear as issues moving through the normal board.
- **Plane** (plane.so). AGPL-3.0 open core, self-hostable, alive and very
  active (about 50k stars; regular releases). A Trello/Jira alternative:
  board-centric, no agent story. Interesting to us as the self-host design
  reference: what a modern board looks like when it is only a board.
- **Focalboard** (focalboard.com). Apache-2.0, Mattermost. Dead in practice:
  Mattermost stopped staffing it in 2023, last release June 2024, no
  maintainer since. Cut for that reason.
- **Wekan** (wekan.fi). MIT, self-hosted Meteor app, alive under one
  Finnish maintainer (about 21k stars, 10k active installs, continuous bug
  fixes). Board-centric, classic, spare. The long-lived proof that a
  self-host board can carry on for a decade without a company.
- **Kanboard** (kanboard.org). MIT, self-hosted PHP, officially in
  maintenance mode: bug fixes only, no feature work. Board-centric and
  deliberately minimal. Wekan covers the same class while alive.

## The AI-native boards

- **cline/kanban** (github.com/cline/kanban). Open source (Apache-2.0), alive,
  by the Cline team. A local web app (`npx kanban`) that runs CLI coding
  agents on a kanban board; cards can be made by the human or by an agent,
  and Kanban injects board-management instructions so the agent organises the
  board itself. Board-centric: the board is the agent workbench.
- **Vibe Kanban** (vibekanban.com, BloopAI/vibe-kanban). Apache-2.0 core
  (closed billing crate in the Cloud tier). The company Bloop shut down in
  April 2026 ("Goodbye bloop"); the project continues community-maintained.
  Board-centric planning and review for many agents, the source of the
  `NormalizedEntry` event model our old research already cites. The shutdown
  is itself a data point: a leading AI board with no revenue floor folded
  within a year.
- **Automaker** (automaker.app, AutoMaker-Org/automaker). Open source and
  local-first (an Electron/React/Express app; the site self-describes as
  "local, open-source"). Kanban-first project management for agent work:
  tasks, specs, roadmap, agents execute the cards; the run's configuration
  (model, harness, dependencies) sits on the card and the board is
  keyboard-driven with single-letter views. Maintenance status to verify in
  the deep report (the scan saw signs it may be unmaintained). Board-centric.
- **Nimbalyst** (nimbalyst.com, github.com/nimbalyst/nimbalyst). Open source,
  alive. Sessions on a kanban by phase (backlog, planning, implementing,
  complete), each in its own git worktree; live transcripts, alerts on finish
  or permission prompt, and a native iOS app to check sessions and approve
  changes. Board-centric.
- **Hermes Kanban** (NousResearch/hermes-agent). Open source, alive. A
  durable SQLite-backed task board shared across all Hermes profiles; tasks
  carry an assignee (a named agent or human), agents pull cards and
  coordinate through the board instead of in-process orchestration; browser
  dashboard on top. The purest "board as the agents' shared medium" design in
  the field.
- **GitHub Agent HQ** (github.com, Copilot coding agent). Closed, alive.
  Issues delegate to the agent; Agent HQ is the multi-agent dashboard over
  sessions, checks and cost. Board-adjacent: the board is the issue tracker,
  the agent view is a dashboard beside it. Our 2026-09-29 report covers the
  detail; this round refreshes the UX layer.
- **Factory Mission Control** (factory.ai). Closed, alive. Droids run work;
  Mission Control is the dashboard: running droids, elapsed time, spend,
  checks per droid. Dashboard-centric rather than card-centric, but the
  densest per-card telemetry in the field (our old pattern 7 cites it).
- **Conductor** (conductor.is). Closed macOS app, alive. Parallel Claude Code
  and Codex sessions in worktrees on one screen, with a Checks tab for review
  across sessions. Desktop-centric; the board is one view of several.
- **Claude Squad** (smtg-ai/claude-squad). AGPL-3.0, alive (releases through
  August 2026). A terminal multiplexer for agent sessions, not a board: the
  kanban is an afterthought in a TUI. Watch-item only.
- **Gastown and beads** (kilo.ai/gastown). MIT, self-hostable; gastown in
  maintenance mode since 2026 with new work redirected to Gas City, beads
  still shipping weekly. An orchestrator with an interactive board view of
  agent work. Our 2026-09-29 report covers it; the board is a view on a
  queue, not the interface.
- **Scan surfaces, one line each**: Agent Kanban (agent-kanban.io, agents
  poll a `/tickets/ready` column on a schedule); DanWahlin/ai-agent-board
  (OSS drag-and-drop board delegating cards to local agents); BatonBot
  (local-first OSS board, one agent session and workdir per card); Kagan
  (keyboard-first kanban TUI over 14 agents); Lane Conductor (local-first
  control plane with a live kanban and quality gates); AgentsRoom (comparison
  site and tool for parallel agents); Paperclip (paperclip.ing, agent teams
  as org charts with budgets and governance, our report exists). All early,
  small, or one-purpose: recorded here, not deep-reported.

## The cut: twelve keepers

Kept for deep reports (Tasks 144+), in field order:

1. **Trello** - the table-stakes definition; the public board UI is studyable
   live without an account.
2. **Linear** - the 2026 benchmark for agents riding an existing board
   (coding sessions, spend, delegation); studied from documentation and
   trials, no clone exists.
3. **Plane** - the alive self-host classic; cloneable in a container, the
   design reference for board-only craft (density, filters, themes).
4. **Wekan** - the decade-long self-host survivor; cloneable; shows the
   minimum a board must do before anything agent-shaped.
5. **cline/kanban** - the agent-native OSS board; cloneable; closest to our
   agent-organises-the-board future.
6. **Vibe Kanban** - the planning/review split and the event model we already
   cite; cloneable; the sunset is evidence for the leave-out section.
7. **Nimbalyst** - sessions as cards, live transcripts, approvals from a
   phone; cloneable if the stack runs locally, else documentation.
8. **Automaker** - kanban-first agent PM with the run-config-on-card and
   keyboard views our old patterns cite; open source (corrected from the
   scan's first pass, which called it closed), studied from a clone.
9. **Hermes Kanban** - the board as the agents' shared medium; cloneable.
10. **GitHub Agent HQ** - the forge-integrated shape nearest our issue
    mirroring; documentation, refreshed from the existing report.
11. **Factory Mission Control** - the telemetry-dense agent dashboard;
    documentation, refreshed from the existing report.
12. **Conductor** - the review-first Checks tab across parallel sessions;
    closed macOS app, documentation only.

Cut, with reasons:

- **Focalboard**: dead (no release since June 2024, no maintainer).
- **Kanboard**: maintenance mode; Wekan covers the same minimal self-host
  class while alive.
- **Claude Squad**: a TUI multiplexer; the board is an afterthought.
- **Gastown**: orchestrator whose board is a view on a queue; gastown itself
  in maintenance mode; the 2026-09-29 report already holds the evidence.
- **Devin, Coder Tasks, Open SWE, SWE-AF**: orchestrators with session UIs
  rather than boards (our existing reports cover them); their board-relevant
  patterns are already in the old ranked 17.
- **Paperclip**: org-chart metaphor, not board-centric; existing report.
- **Agent Kanban, ai-agent-board, BatonBot, Kagan, Lane Conductor,
  AgentsRoom**: early or one-purpose; scan level is enough, nothing a deep
  report would teach that the twelve above do not.
- **OpenProject, Taiga and the wider PM field**: not board-first, not
  agent-aware; out of scope by the plan's lists.

Sources: [cline/kanban](https://github.com/cline/kanban),
[Cline CLI](https://cline.bot/cli),
[Automaker](https://automaker.app),
[Vibe Kanban shutdown](https://vibekanban.com/blog/shutdown),
[Nimbalyst kanban](https://nimbalyst.com/blog/claude-code-session-kanban-organize-ai-agents),
[Nimbalyst compare](https://nimbalyst.com/compare/nimbalyst-vs-conductor-vs-vibe-kanban),
[Hermes Kanban docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban),
[Hermes RFC](https://github.com/NousResearch/hermes-agent/issues/16102),
[Linear coding sessions](https://linear.app/docs/coding-sessions),
[Linear changelog](https://linear.app/changelog/2026-09-24-new-controls-for-linear-coding-agent),
[Trello AI boards](https://support.atlassian.com/trello/docs/ai-generated-boards),
[Trello AI features](https://community.atlassian.com/forums/discussion/3269628/let-ai-handle-your-board-busywork-introducing-new-ai-features-in-trello),
[Focalboard status](https://www.reddit.com/r/selfhosted/comments/1dpkugs/is_focalboard_actually_dead_or_is_it),
[Kanboard future](https://kanboard.discourse.group/t/the-future-of-kanboard/3155),
[Wekan status](https://wekan.fi/status),
[Plane 2026](https://plane.so/blog/top-6-open-source-project-management-software-in-2026),
[agent-kanban.io](https://agent-kanban.io),
[ai-agent-board](https://github.com/DanWahlin/ai-agent-board),
[best multi-agent tools](https://agentsroom.dev/blog/best-multi-agent-coding-tools),
[done list](https://tomtunguz.com/coding-kanban).
