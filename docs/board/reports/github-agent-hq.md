# GitHub Copilot cloud agent + Agent HQ (agents panel)

## Header

- Product and URL: GitHub Copilot cloud agent and its agents panel ("Agent HQ" in
  marketing), https://github.com/features/copilot; docs under
  https://docs.github.com/en/copilot; panel at github.com/copilot/agents.
- License and price: proprietary SaaS, no self-hosting, no free agent tier
  (agent needs a paid Copilot plan; Pro $10, Pro+ $21, Business $19/user,
  Enterprise $39/user per month). Sessions consume Actions minutes plus AI
  credits by model and token count.
- Alive? Very. github/docs pushed 2026-10-01; changelog entries dated
  2026-10-01 (new dashboard default, dynamic workflows, computer use); model
  additions in the preceding week (Claude Sonnet 5.5 on 2026-09-28, GPT-6.1 Sol
  on 2026-09-29, HydraFusion on 2026-09-30).
- Studied how: assessed from documentation only (closed product; no signup per
  brief), on 2026-10-02. Sources: github/docs sparse clone at 0b8c768
  (2026-10-01), GitHub changelog and blog, published docs screenshots. This
  refreshes the UX layer of the 2026-09-29 market-research report
  (docs/market-research/projects/github-agent-hq/report.md, baseline clone
  f4e8afc, 2026-09-28).
- One sentence: the forge-integrated shape nearest ours — issues are delegated
  by assigning them like a person, the agent works in a sandboxed Actions run,
  and progress, steering and approval all surface inside the forge (issues, PR,
  agents panel, dashboard) rather than in a separate console.

### What changed since the 2026-09-29 baseline

- **The new dashboard became the default (2026-10-01).** The logged-in home
  page now shows active agent sessions, issues, and pull requests in one view,
  each section capped at 12 items with per-section "Customize" filters; the
  activity feed moved to its own tab; quick actions include "Task" (start a
  Copilot agent session) and assigning an issue to the coding agent. Opt-out via
  the "Preview" dropdown. (github.blog/changelog/2026-10-01-new-dashboard-experience-now-the-default;
  docs.github.com/en/account-and-profile/reference/personal-dashboard)
- **Docs IA restructure, no behaviour change in the core flow.**
  manage-and-track-agents.md and about-cloud-agent.md are content-identical to
  the baseline snapshot (path churn only); "Copilot coding agent" is now
  consistently "Copilot cloud agent"; how-tos regrouped into copilot-on-github/
  and copilot-in-your-ide/ trees. Third-party agents are still only Claude and
  Codex, both public preview (concepts/agents/about-third-party-coding-agents.md
  unchanged since f4e8afc).
- **New surfaces documented (all IDE/CLI-side, not the forge flow):** dynamic
  workflows (public preview, code-defined orchestration with parallel subagents
  and pause/resume checkpoints; changelog 2026-10-01), computer use (changelog
  2026-10-01), agent mode / plan mode / subagents pages.
- **VS Code September 2026 release (changelog 2026-10-01):** the Agents window
  gains agent merge (preview) handling review feedback, failed checks, merge
  conflicts and workflow reruns; "Mark as Done"; an application badge for new
  results, input requests and pull request checks; PR creation from Copilot,
  Claude and Codex sessions; Automations scheduling.
- **JetBrains "assisted approvals" (public preview, 2026-09-22):** low-risk tool
  calls auto-approved, high-risk ones still prompt — a first move away from
  prompt-everything in the IDE surfaces.
- **Slack/Teams updates (2026-09-25):** longer-running tasks and clearer
  implementation-plan status in chat.
- **A baseline gap, not a change:** the "mission control" task view shipped
  2025-10-28 (changelog "A mission control to assign, steer, and track Copilot
  coding agent tasks"; community discussion 177791): session logs sit as tabs
  next to Overview and Files changed on the PR, and steering is applied after
  the current tool call. The baseline report described the agents panel but
  missed the PR-embedded session view; this report includes it.
- **Unchanged and still true:** the marketing name "Agent HQ" never appears in
  the technical docs (everything says "agents panel", "Agents tab", or
  github.com/copilot/agents); steering is not available for third-party agents;
  each steering message consumes AI credits; one repo/branch/PR per task; a hard
  59-minute session cap; your own approval of a Copilot PR does not count toward
  required approvals; Actions workflows do not auto-run on Copilot pushes by
  default.

## 1. The board model

There is no kanban board. GitHub's answer to a board is three fixed list
surfaces, in ascending detail: the dashboard sections, the agents panel, and the
pull request.

**Columns.** None are user-made. The new default dashboard (2026-10-01) has
three fixed sections in GitHub's own words — "Agent sessions: your running and
recent agent sessions", "Issues: open issues assigned to you", "Pull requests:
pull requests authored by you or awaiting your review" — each showing up to 12
items, each with a "Customize" filter control. The agents panel is one list
(mine / all sessions) plus natural-language search. Nothing is draggable;
position is recency, not workflow stage.

**Card anatomy.** The unit is a session row (title/prompt, repository, state)
or a PR entry (title, repo, open/merged/closed state). On the face: nothing
more. One click in: the session log plus a session overview showing "the
agent's progress, token usage, and session length" — the per-agent telemetry
trio. What never appears on any list: cost in currency, elapsed-time columns,
queue position, or a progress percentage. The dashboard docs state the issues
section shows open issues assigned to you and does not include issues that
already have an agent session running — delegation hides the issue from your
list and replaces it with the session in the section above.

**Where the human's decisions live.** Three places, all notification-linked.
(1) The dashboard: the three sections are literally "what needs me", and the
quick actions start work. (2) The pull request: when a session finishes, the
agent adds you as a reviewer and the notification lands; the merge box holds
the two real decisions — review/approve (with the rule that your own approval
of a Copilot PR does not count, another human must approve) and the "Approve
and run workflows" button, because Actions workflows never auto-run on Copilot
pushes by default. (3) Mid-run input requests, which surface as session state
plus (in VS Code) an application badge for "new results, input requests, and
pull request checks". From dashboard to an approve/deny: about three clicks
(dashboard → PR → merge box → button); from the notification: two.

**Filters and cross-project views.** Per-section "Customize" filters on the
dashboard; natural-language session search in the panel ("What agent tasks did
I run last week?", "Show me sessions where the agent struggled or I had to
correct it multiple times"); mobile Agent Tasks list with an Open/Merged/Closed
status dropdown; private saved views for repo issues went GA on 2026-09-25.
The agents panel at github.com/copilot/agents is the one cross-repo view; the
repo Agents tab is per-repo and also hosts the Automations pane.

## 2. Agent-task specifics

This is the heart of the study: the forge-integrated flow our issue-mirrored
cards would imitate.

**How a delegated issue shows progress.** Assignment is the trigger: open the
issue, click Assignees, pick Copilot, get the assign dialog (target repository,
starting branch, custom agent, optional prompt — [assign-to-copilot-dialog.png](shots/github-agent-hq/assign-to-copilot-dialog.png)).
Assigning "always creates a pull request" (kick-off-a-task.md); the agent sees
the issue title, description and comments that exist at assignment time, and
nothing added afterwards — follow-ups must go on the PR. While it runs: the
issue's assignee shows Copilot, the PR appears as a draft with a spinner on the
agent label ([agent-working-spinner.png](shots/github-agent-hq/agent-working-spinner.png)),
the PR carries a "Copilot" agent label and "ready for review" gating
([agent-pr-labeled.png](shots/github-agent-hq/agent-pr-labeled.png)), and the
session updates in real time (overview.md: "Both sessions update in real time").
Since the 2025-10 mission-control view, the session log is a tab next to
Overview and Files changed on the PR itself, so the reasoning behind each
commit is readable in context, live. Every commit is authored by Copilot,
signed ("Verified"), and its commit message links back into the session log.
When it finishes: the PR leaves draft, the agent requests your review, you get
the notification. When it fails or is stopped: "Stop session ... ends the
Actions run and preserves any commits already pushed"; a task exceeding 59
minutes times out and stops. Nothing shows a percentage — progress is the live
log plus the three overview numbers (progress, token usage, session length).

**Where the conversation lives.** On the session page (agents panel), embedded
as tabs on the PR (mission control), and mirrored in the PR timeline as compact
events: the eyes (👀) reaction on your comment plus a "Copilot started work"
timeline entry ([pr-timeline-eyes-started-work.png](shots/github-agent-hq/pr-timeline-eyes-started-work.png)).
By default you see the timeline summary; the full log is one tab away.

**Steering mid-run.** Yes, first-class for the GitHub agent: "In the prompt box
below the session log, type your follow-up ... Press Enter. Copilot implements
your input after it finishes its current tool call" (manage-and-track-agents.md).
Each steering message consumes AI credits, and steering is not available for
third-party agents (Claude, Codex) — a real asymmetry inside one panel. Beyond
the box: @copilot comments on any PR; delegated review comments in Files
changed (Fix with Copilot on one comment, Add to batch → Manage batch with
model picker → Fix and commit or Fix and open pull request); Fix with Copilot
buttons on failing Actions runs and on merge conflicts in the merge box. The
agent remembers context across sessions on the same PR, so follow-ups get
faster. Stop and Archive cover the kill switches; stopping preserves commits.

**Approvals, spend limits, budgets.** There are no in-flow permission prompts
for the cloud agent — policy (firewall, MCP allowlists, secrets) is configured
beforehand by admins, and the JetBrains "assisted approvals" experiment
(low-risk auto-approve, high-risk prompt) is the IDE-side counterpart. The two
surfaced approvals are both in the PR merge box: human review (your own
approval does not count; enforced by branch protection, not by the agent's
restraint) and "Approve and run workflows"
([approve-and-run-workflows.png](shots/github-agent-hq/approve-and-run-workflows.png)).
Spend: the session overview shows token usage, org admins get usage metrics
APIs (PRs created/merged, median time to merge) and a spending view
([track-spending.png](shots/github-agent-hq/track-spending.png)), but there is
still no per-task cost cap or pre-run estimate — the June 2026 backlash
(community discussion 198015: "no way to know how much a task will cost before
running it") remains the canonical complaint, and steering now adds priced
messages on top.

**Multi-agent.** The panel runs Copilot, Claude and Codex sessions side by side
in one list; the dashboard's Agent sessions section caps at 12; parallel
sessions on one repo are the documented norm (overview.md starts two at once).
Automations (scheduled or event-triggered agent runs) live in their own pane in
the repo Agents tab, private to their creator.

## 3. Interaction model

- Moving work: no drag and drop anywhere. Work starts by assignment (issue →
  Assignees → Copilot), by prompt (panel, dashboard Task button, /task in
  chat, mobile New Session), by @copilot mention, or by Automation trigger. A
  "drop" does not exist; the closest is pressing Enter on a steering message,
  which lands after the current tool call.
- Keyboard and mobile: prompt boxes submit on Enter/Return; /task is a chat
  command; the Agents window in VS Code adds badge-driven entry. GitHub Mobile
  has a full second surface: start sessions, and track them via Agent Tasks
  with an Open/Merged status filter
  ([mobile-agent-tasks-status.png](shots/github-agent-hq/mobile-agent-tasks-status.png)).
- Refresh model: live push — sessions "update in real time", the spinner
  animates while the agent works, PR timeline events append without reload.
  No manual refresh documented anywhere in the flow.
- The click map, from the dashboard/panel:
  - read status: 0 clicks (session state is on the row / dashboard section)
  - read detail: 1 click (session log + overview, or PR)
  - decide (approve/merge): 3 clicks from dashboard, 2 from notification
    (PR → merge box → button)
  - steer: 1 click + typing (prompt box below the session log)
  - comment: 1-2 clicks (session box, or PR comment/@copilot)

## 4. Visual system

- Themes: dark and light across github.com and the docs; colors are
  system-set semantics only (open green, merged purple, closed red, state
  icons). Users set labels and colors on issues/PRs, but agent surfaces use no
  user-settable color at all. Agent identity is a labelled avatar ("Copilot",
  Claude, Codex) — neutral and readable.
- Typography and density: standard GitHub UI density. The dashboard's three
  12-item sections fit one screen; a session row is readable as a row, not as
  a thumbnail card — this is a list UI, not a board, and it does not try to be
  one.
- The status vocabulary, as documented: session running (animated spinner,
  live log appending), finished/awaiting review (draft cleared, review
  requested, notification), stopped (commits preserved, session archived via
  kebab menu), timed out (59-minute hard cap), merged/closed (PR states),
  Open/Merged/Closed (mobile filter). Each state is distinguished by icon plus
  label plus list position — never color alone, which is the accessible
  pattern. The quietest, most-copied bit: the eyes reaction plus "Copilot
  started work" line — acknowledgment as a timeline event, not a modal.

## 5. What users say

Three most common complaints:

1. **Unpredictable credit drain with no pre-run cost visibility.** Community
   discussion 198015 (June 2026) reports fast, unpredictable premium-request
   consumption with "no way to know how much a task will cost before running
   it"; steering messages now each consume AI credits too.
   https://github.com/orgs/community/discussions/198015
2. **Cold starts and stalled sessions.** 90-plus-second cold starts (G2
   reviews, January 2026 report, cited in the baseline) and sessions that stop
   mid-PR: "It happened again. PR with copilot and it just stopped."
   https://www.reddit.com/r/GithubCopilot/comments/1mchmjc/it_happened_again_pr_with_copilot_and_it_just
3. **Quality degrades as scope grows.** Multi-file changes degrade quality
   (Netguru's 30-plus-codebase evaluation, baseline); "Why Copilot is so awful
   as an AI coding agent" (context handling);
   https://www.reddit.com/r/GithubCopilot/comments/1srr1b2/why_copilot_is_so_awful_as_an_ai_coding_agent
   and thin PR reviews
   https://www.reddit.com/r/ExperiencedDevs/comments/1ly13n0/why_does_github_copilot_pull_request_reviews_give

Three most praised details:

1. **Session logs beside the task.** "Session logs sit right next to the
   Overview and Files changed tabs. See Copilot's reasoning behind commits —
   live, in context, as they happen."
   https://github.com/orgs/community/discussions/177791
2. **Code review catches real problems.** "I'm impressed by this Copilot Code
   Review comment, preventing data leak in logs."
   https://bsky.app/profile/did:plc:usshby5g7basoxzvlwjgpcqp
3. **Production-grade output from delegation.** "I have been building
   production code with it for a while now, and I am impressed."
   https://www.linkedin.com/posts/mehd-io_if-you-ask-me-github-yes-the-web-app-is-activity-7425183353449902080-I1TG

## 6. Verdict for us

**Steal:**

- **Dashboard as decisions page**: agent sessions / my issues / my PRs as
  capped, filterable sections plus quick actions — our board's home screen in
  one sentence: "what is running, what needs me, what changed".
- **The session-overview trio** — progress, token usage, session length — as
  the standard telemetry line on every agent card.
- **The follow-up contract stated at delegation**: the assign dialog's fact
  that the agent sees issue content at assignment time only, so follow-ups go
  on the PR. Whatever channel our cards use, the card must say where follow-ups
  land — GitHub's unstated version of this is its most confusing trade.
- **Steering at the tool-call boundary, priced and labeled**: one box under the
  log, applied after the current tool call, each message visibly consuming
  budget. Copy the box, the boundary, and the price label.
- **Eyes reaction + "started work" timeline event**: acknowledgment as a quiet
  timeline artifact instead of a notification storm.
- **Batch review delegation** (Add to batch → Manage batch → fix in place or
  via new PR): a complete pattern for handing human review comments back to an
  agent in bulk.
- **"Approve and run workflows" as a default-on gate** for agent-pushed code —
  the CI trust boundary made a single explicit button.
- **Natural-language session search** over history ("sessions where the agent
  struggled") — cheap on top of a session log store, high value.

**Skip:**

- **Assignment as the whole task store**: a session is an Actions run plus a
  PR; there is no durable task state, queue or scheduler. That is the opposite
  of our control plane, and the dashboard's 12-item caps are the symptom.
- **Dead-letter follow-ups on the source**: comments added to an issue after
  assignment are silently invisible to the agent. Our mirrored cards must
  accept mid-run messages natively, not redirect to another surface.
- **Cost only at the subscription layer**: no per-task cap, no pre-run
  estimate, no per-task ledger. The 198015 backlash is what importing this
  looks like.
- **Steering gated by agent vendor** (works for Copilot, not for Claude/Codex):
  an asymmetry users cannot see until they try.

**Decision needed (for the aggregate report):**

- Where the agent conversation lives: PR-embedded tabs (GitHub), central panel,
  or card drawer — the field splits three ways.
- Is steering priced per message (GitHub) or inside the task's budget hold?
- Who may approve agent output: any second human (GitHub's own-approval rule)
  versus our stronger approval/escalation plane — and does the UI name who?

**Cloneability:** none. Proprietary SaaS, no self-host path, nothing to run
locally. The docs (github/docs, CC-BY-4.0) describe the UX precisely enough to
copy patterns, and the screenshots in this report are docs assets under that
license; the product itself cannot be cloned, only learned from.

## Scoring axes

| Axis | Score | Reason |
|---|---|---|
| Card scannability (read ten cards in one glance) | 3 | No board cards at all: capped list sections and session rows are readable but glance-value stops at 12 items and recency order. |
| State clarity (what is happening, how far, what next) | 4 | Running/finished/stopped/timeout states are unambiguous via icon+label and live log; no progress percentage or queue position anywhere. |
| Human-decision surface (find and make the next decision) | 4 | Dashboard sections plus review-request notifications put the next decision two or three clicks away; the second-human approval rule is invisible until merge is blocked. |
| Agent-activity legibility (is the agent working, waiting, stuck) | 5 | Live session log beside the PR, spinner, token usage, session length, commit-by-commit reasoning links — the best-documented activity surface in the field. |
| Noise level (5 means quiet: nothing without meaning) | 4 | Timeline events are compact and meaningful, feed split out of the dashboard; agent review comments and per-steering credit accounting can still chatter. |

## Sources

- github/docs sparse clone at 0b8c768 (2026-10-01), baseline f4e8afc (2026-09-28):
  content/copilot/how-tos/copilot-on-github/use-copilot-agents/{manage-and-track-agents,kick-off-a-task,research-plan-iterate,review-copilot-output,overview}.md;
  content/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-on-github.md;
  use-cloud-agent-on-mobile.md;
  content/copilot/concepts/agents/cloud-agent/about-cloud-agent.md;
  content/copilot/concepts/agents/about-third-party-coding-agents.md;
  data/reusables/copilot/{cloud-agent-workflow-run-approval-default,open-agents-panel-or-page}.md
  (rendered: https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/manage-and-track-agents,
  https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-on-github)
- https://docs.github.com/en/account-and-profile/reference/personal-dashboard (new dashboard sections)
- https://github.blog/changelog/2026-10-01-new-dashboard-experience-now-the-default/
- https://github.blog/changelog/2026-10-01-github-copilot-in-vs-code-september-2026-releases/
- https://github.blog/changelog/2026-10-01-dynamic-workflows-in-copilot-cli-and-the-copilot-app/
- https://github.blog/changelog/2026-10-01-github-copilot-can-now-interact-with-desktop-apps
- https://github.blog/changelog/2026-09-22-new-features-and-improvements-in-copilot-for-jetbrains/ (assisted approvals)
- https://github.blog/changelog/2026-09-25-updates-to-github-copilot-for-slack-and-microsoft-teams/
- https://github.blog/changelog/2025-10-28-a-mission-control-to-assign-steer-and-track-copilot-coding-agent-tasks/
- https://github.com/orgs/community/discussions/177791 (mission control feedback)
- https://github.com/orgs/community/discussions/198015 (credit drain, June 2026)
- Baseline report: docs/market-research/projects/github-agent-hq/report.md (2026-09-29)
- Screenshots: docs/board/reports/shots/github-agent-hq/ — assign-to-copilot.png,
  assign-to-copilot-dialog.png, pr-timeline-eyes-started-work.png,
  agent-working-spinner.png, agent-pr-labeled.png,
  approve-and-run-workflows.png, mobile-agent-tasks-status.png,
  track-spending.png (github/docs assets, CC-BY-4.0, via
  https://docs.github.com/en/copilot how-tos); docs-manage-and-track-agents.png,
  docs-use-cloud-agent-on-github.png, docs-personal-dashboard.png,
  changelog-new-dashboard-default.png (headless captures of the pages above).

Not verified: every logged-in surface — the live agents-panel grid at
github.com/copilot/agents, the rendered dashboard, actual notifications. No
published screenshot of the full grid exists; per-session grid fields rest on
docs text alone. "Agent HQ" as a name still appears only in marketing.
