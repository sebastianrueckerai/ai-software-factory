# Linear

Studied from documentation only (closed SaaS; no clone exists, no account was
created and none of the product was signed up for or paid into). Everything
below comes from linear.app docs, developer docs, the 2026 changelog, published
product screenshots, and third-party discussion; the live app itself was not
touched. Studied on 2026-10-01/02.

## Header

- Product and URL: Linear, https://linear.app (docs: https://linear.app/docs,
  changelog: https://linear.app/changelog, developer docs:
  https://linear.app/developers/agents). Closed source, no repository.
- License, price model, self-hosted or free tier: proprietary SaaS, no
  self-hosted option of any kind. Free tier exists ($0, 250 issues, 2 teams,
  and it includes the agent platform and Linear Agent); Basic $10/user/month,
  Business $16, Enterprise custom (yearly billing). Coding sessions are on all
  paid plans and bill against a prepaid workspace AI-credit balance bought in
  dollars: minimum top-up $10, minimum auto-reload $50, launch grant of "$20
  multiplied by the number of unsuspended users". Session cost is model tokens
  "at the provider's published rates, with no markup" plus sandbox runtime
  "Charged at $0.25 per 20-minute block".
- Alive? Extremely. Coding sessions launched June 11, 2026; coding sessions on
  mobile July 30; environments, browser testing and transparent pricing August
  20; adaptive model routing, environment secrets and GLM open-weight sessions
  September 24; Priority inbox September 3. Near-weekly changelog cadence
  throughout. Agent adoption claim: agents installed in 95% of paid workspaces,
  half of issue volume agent-created (Linear via SaaStr, Sep 2026).
- One sentence: the opinionated, keyboard-first issue tracker for software
  teams, which in 2026 made its own coding agent a first-class teammate that
  takes issues, writes code in a managed sandbox, and returns a diff and PR to
  the same issue thread.

Relationship to the 2026-09-29 market report
(`docs/market-research/projects/linear-for-agents/report.md`): that report
studied the third-party Agent API contract (sessions, activities, delegate).
Nothing newer than its Sep 24 cutoff has shipped. This round adds what it did
not cover: the board model, what the session card actually looks like (from
published screenshots), the June-August UX arc (launch, mobile steering,
environments, browser testing, the pricing rework), and the credits/spend-limit
surface. Its API findings (six states, typed activities, 10s/30min clock,
delegate-not-assignee) were re-verified against the developer docs and stand.

## 1. The board model

- Columns: user-made, not fixed. A team's "workflow" is "a group of ordered
  issue statuses defined per-team" (docs/conceptual-model); the default set and
  order is "Backlog > Todo > In Progress > Done > Canceled". Statuses belong to
  five fixed categories that themselves cannot be reordered — backlog,
  unstarted, started, completed, canceled — plus a reserved Duplicate and an
  optional Triage category that "acts as an Inbox for your team". Each status
  has an admin-editable name, color and description, so columns are
  team vocabulary, not product vocabulary. "Board views default to grouping by
  Status" and status-grouped boards are "always ordered with statuses from
  first to last"; grouping is switchable to project, priority, cycle, label,
  label group, SLA status, assignee, team and more (docs/board-layout,
  docs/display-options).
- Card anatomy: one line of title plus small property marks, high density —
  "Descriptions are not shown on cards". Every displayed property is an
  explicit toggle: ID, status, assignee, priority, SLA, project, due date,
  milestone, cycle, release, estimate, labels, links, customers, revenue,
  "time in status", created/updated date, "pull requests and commits", and
  Sentry issues. The board with its cards and swimlanes is visible in
  [docs-board-layout.png](shots/linear/docs-board-layout.png); the closest
  published card anatomy (an issue mid-session, dark theme) is
  [published-agent-working-alongside-diff.png](shots/linear/published-agent-working-alongside-diff.png).
  What hides behind a click: `Space` on a hovered card opens a
  peek with more detail; opening the issue shows everything. What never
  appears on the board at all: the description, the comment thread, the agent
  session content — including, by default, the live session state (see
  section 2). Group headers show "the total number of issues in the group or
  the total estimate", click to toggle.
- Where the human's decisions live: three surfaces beside the board. (1) The
  Inbox — notifications, with a separate Priority tab since Sep 3; an agent
  that needs input notifies you ("you'll be notified when your input is
  needed"). (2) Triage — the team's intake column, where Triage Intelligence
  and triage automations can send an issue straight to an agent. (3) The
  Reviews tab — every PR the agent opens lands there, where you "inspect the
  resulting diffs and follow review discussions" and can "merge your PR
  directly from Linear". Clicks from board to a decision: board card → Enter
  (1) opens the issue with the session card and pinned diff in view → merge or
  reply inline (2). The shortest decision path is actually off-board: Inbox →
  issue → merge, or Reviews → merge, both two clicks.
- Filters, swimlanes, cross-project views: custom views of issues, projects or
  initiatives, saved per user, "Set as default" pushes a configuration to the
  whole workspace. Sub-grouping renders as rows — swimlanes, collapsible with
  `T`, meant for "a high-level overview of the company's progress or resource
  allocation". Delegated work has its own place in "My Issues → Assigned"
  (a "Delegated" section on mobile), and any view can filter by **Delegate**.

## 2. Agent-task specifics

This is the heart of the report: how agent work stays ordinary-issue-shaped.

**How a session is attached to an issue.** "Start a coding session by
assigning an issue to Linear, or ask it to make a change in a chat, comment, or
Slack thread" (changelog Jun 11). The assignment is a *delegation*, not an
assignment: "Assigning an issue to your app now sets it as the `delegate`, not
the `assignee`" and "the human teammate remains the primary assignee and
owner... The human assignee remains responsible for the issue, even after
delegation to an agent" (developers/agents, docs/agents-in-linear). The agent
is an "app user" that "behaves similar to other users in a workspace" —
mentionable, delegatable, commenting — and "agents installed in your workspace
do not count as billable users". That is the whole trick: there is no agent
dashboard species; the agent is a teammate-shaped thing riding the same issue,
board and activity feed, with a cube avatar instead of a face.

**What the issue shows while the session runs.** A session card appears in the
issue's ordinary activity feed. It carries a "status row" (Linear's own term,
from a June 11 changelog fix: "Vertically centered the label and preview text
in the agent session card's status row") with the session state. The six
states are platform-derived, never hand-set: `pending`, `active`, `error`,
`awaitingInput`, `complete`, `stale` — "Linear tracks session lifecycle
automatically based on the last emitted activity". The clocks behind them:
the first activity or external URL must arrive "within 10 seconds" of session
creation or the agent "will be shown as unresponsive"; follow-up activity can
still land "for up to 30 minutes before the session is considered stale", and
stale "is recoverable by sending another agent activity"
(developers/agent-best-practices). From the launch screenshots, the completed
session card shows: session title ("Investigate and fix a bug"), a green-check
"Completed" state, elapsed working time ("Working for 3m 51s"), a
files-changed row, the PR chip ("Opened pull request · ENG-1748 #362"), a strip
of screenshot artifacts, and a "Summary" block with bullets of what was done —
see [published-issue-activity-feed-completed-session.png](shots/linear/published-issue-activity-feed-completed-session.png)
and [published-agent-working-alongside-diff.png](shots/linear/published-agent-working-alongside-diff.png).
So: status badge yes, elapsed time yes, PR link yes; branch name only via the
PR; no progress percentage; no cost on the card (cost lives in the usage
dashboard, below).

**How live progress is rendered without noise.** The activity vocabulary is
typed: `thought` ("a thought or internal note"), `action` ("describes a tool
invocation", with an optional pending/completed result), `elicitation`
("requests clarification or confirmation from the user"), `response` ("work has
been completed"), `error`; `prompt` is user-only. The noise control: "Only
`thought` or `action` type activities can be marked ephemeral... displayed
temporarily, and will be replaced when the next activity arrives" — so the
agent's churning stream occupies one line that replaces itself, while
response/elicitation/error "automatically create a comment" and persist. The
board never shows any of this; the issue feed shows the curated version; the
raw conversation is behind the session click.

**The session view: logs, diff, steering.** "Click on the session to steer or
follow up with the agent, or let it run autonomously" (docs/coding-sessions).
The session is "shared with the team... Anyone can follow the work, contribute
context, redirect the approach, request changes, or take over. The session
belongs to the organisation rather than to the person who started it"
(linear.app/now/coding-sessions-for-linear-agent). What you steer from: the
session thread in the issue, the chat (each open chat is a tab with "a short
label and... unread updates or when the agent is currently working in that
thread"), and — since July 30 — mobile, where you "open any diff and switch to
the Changes tab... tap the relevant line to add it to your message to steer the
coding session in the direction you want": diff-line-to-message quoting, on a
phone. There is no documented stop or pause; the Sep 24 "new controls" control
is post-hoc — "restart the session on the default model while keeping the
original pull request for reference". Live intervention beyond messaging is
the thin spot the 2026-09-29 report already flagged, and it is still thin.

**What changes when the agent finishes or asks.** Finish: a `response`
activity plus an automatic comment, "Linear drafts a PR and adds a diff to the
issue", the diff is pinned in the refreshed issue sidebar (changelog Jul 23),
and the PR lands in the Reviews tab; the delegator is notified (a June 11 fix
ensures "agent completion notifications... delivered to the user who delegated
the work"). Ask: an `elicitation` activity flips the session to
`awaitingInput` and notifies. Fail: an `error` activity, its own state. The
agent is also expected to keep the issue's workflow honest — best practice
tells agent builders to "move the issue to the first status in `started`" when
beginning — so the card changes column exactly as a human's card would.

**Approvals, spend limits, budgets.** Approval of the *change* is PR-shaped,
not a board checkpoint: you review the diff (Guided Reviews "break diffs into
focused sections with explainers on what changed and why"), then merge from
Linear. Spend is a first-class admin surface, not a card surface: a prepaid
workspace balance (launch grant $20/user, top-ups from $10, funds expire 12
months after purchase), three independent limit levels — workspace, per-user
(default plus overrides), per-loop — each with daily/weekly/monthly cadence and
a customizable reset time. "When a limit is reached, additional AI credit
usage is paused until the limit resets or an admin increases it"; blocked
sessions resume through an explicit "Retry", not automatically. Checks run "on
every new human input", enforcement "can lag up to two minutes", parallel runs
may overshoot. The usage dashboard shows balance, usage by feature and user,
transactions, and — the detail worth stealing — "hovering over a cost shows
token cost by model, compute cost, and total cost" per session
(docs/ai-credits).

**Multi-agent and parallel work.** Several app users can be installed side by
side (the docs' own assignee-menu screenshot shows agents "Charlie" and
"ChatPRD" beside humans), each running its own sessions on its own issues;
GitHub Copilot's cloud agent is assignable from Linear too ("you pick
model/agent settings and base/working branches, then steer via comments").
When several run at once, each issue carries its own session card and the
Delegated section lists each session's status — but there is no grid-of-live-
agents view; Linear deliberately has no Mission-Control-style surface.
Adaptive routing ("Auto mode") sends "a simple button-copy typo to the faster
Luna model and a downtime investigation to the more capable Astra model", with
the model choice visible on the session, and admins can enable GLM open-weight
sessions.

**Browser testing as evidence.** August 20: the agent "opens the app, navigates
through a flow, and verifies its implementation... captures before-and-after
screenshots, making visual changes easier to review alongside the code" and can
"make a fix, rerun the test, and return the work with that validation
complete". Verification artifacts (screenshots, recordings) ride the session
card next to the diff — evidence attached to the work, not asserted in prose.

## 3. Interaction model

- Moving work: both. Drag a card between columns and it "adopt[s] the
  properties of that grouping" (drop into Done = status Done); `Option/Alt
  Shift Up/Down` moves a selected card within a column; `+` creates an issue
  in that column; keyboard moves place at the top of the new column, mouse
  moves where dropped. Manual ordering is the board default and is shared
  workspace-wide.
- Keyboard: the product's spine. `?` opens a searchable shortcuts overlay;
  `Cmd/Ctrl+K` the command menu ("most actions can be taken using keyboard
  shortcuts or the command menu" — linear.app/learn); `Cmd/Ctrl+J` the agent
  chat; `Cmd/Ctrl+B` toggles list/board; `Shift+V` display options; `Space`
  card peek; `T` collapses swimlanes; `G`-prefixed jumps (Inbox, My Issues);
  `Shift+scroll` pans the board horizontally. Mobile: full iOS/Android apps,
  and since July 30 they carry the agent loop — review the diff, comment on
  lines, steer the session.
- Refresh model: live. Session state "is updated automatically based on the
  agent's emitted activities"; chat tabs show unread/working indicators; the
  changelog markets realtime sync. No manual refresh anywhere in the docs. The
  card animates only in the sense that the ephemeral activity line replaces
  itself and the state chip flips.
- The click map (from a board):
  - read status: 0 clicks — status is on the card face; live session state is
    not (it is one click away).
  - read detail: 1 (Enter) or 0.5 (`Space` peek).
  - decide (approve/merge a finished session): ~2 — Enter into the issue, act
    on the pinned diff/PR; or Inbox/Reviews → merge, also 2.
  - steer: 2 — Enter, then the session; typing steers. On mobile: open diff,
    tap line, send.
  - comment: 1 — Enter, comment box.

## 4. Visual system

- Themes: dark and light; both appear in the published shots (the June launch
  screenshots pair a dark agent chat with a light issue view). Colors split
  cleanly: system-set semantics are the status colors (admin-chosen per
  status, within the five fixed categories), the priority icon set and the
  session-state chips; user-set color is labels and custom status colors.
  Agent identity is carried by the app's own avatar everywhere it appears.
- Typography and density: small sans, tight leading, one-line cards; dozens of
  cards per screen without crowding. A card reads as a thumbnail — title plus
  icons — precisely because nothing prose-like is allowed on the face.
- The status vocabulary a card can carry:
  - workflow status: colored pill, five categories, position-in-column doubles
    as state (the column *is* the status on a status-grouped board);
  - priority: icon shapes (urgent through no-priority), toggleable;
  - SLA status, project health, cycle: all toggleable properties;
  - agent session state (on the session card, in the feed): pending / active /
    error / awaitingInput / complete / stale, distinguished by chip icon
    (working spinner, green check for complete) and accompanied by the
    elapsed-time clock, PR chip and artifact counts;
  - delegated: a separate visual fact from assigned (the agent's avatar sits
    in a delegate role, the human keeps the assignee slot).

## 5. What users say

Three most common complaints:

1. GitHub-Linear sync friction predates and surrounds the agent loop: "the
   'handshake' between GitHub (devs) and Linear (PMs) often lags or breaks"
   ([r/ProductManagement honest-experiences thread](https://www.reddit.com/r/ProductManagement/comments/1pwtbd9/looking_for_honest_experiences_about_linear_app)).
   Coding sessions depend on exactly that connection, and access bugs show up
   here too: "Linear Coding Session no access... I can only see reviews/PRs I
   made myself" ([r/Linear](https://www.reddit.com/r/Linear/comments/1uflt7v/linear_coding_session_no_access)).
2. AI pushed into the tracker annoys a loud minority: "Linear AI chats are
   breaking my workflow" ([r/VibeCodersNest](https://www.reddit.com/r/VibeCodersNest/comments/1qa5j4q/linear_ai_chats_are_breaking_my_workflow_anyone));
   on HN, "It's still my favourite tool for the job" but "I want to keep AI
   far away from my issue tracker" (steve_adams_86), "You're the best of a
   shitty bunch... this direction will enshittify your product" (sevenseacat)
   ([Issue Tracking Is Dead thread](https://news.ycombinator.com/item?id=47507253)).
3. Learning curve and opinionated rigidity outside engineering: "The learning
   curve is the biggest issue" ([G2 reviews](https://www.g2.com/products/linear/reviews));
   "fast and minimalist for software teams, but rigid outside engineering"
   ([Siit 2026 review](https://www.siit.io/tools/trending/linear-app-review)).

Three most praised details:

1. Speed and keyboard-first craft: "clean, intuitive, modern UI/UX (so good
   that other companies copy it)" is the standing G2 theme; the interface
   latency is the product's signature.
2. Diffs and agent work living inside the issue: even a skeptic in the HN
   thread — "I really want to see diffs right in the issue" and issue tracking
   as "a more structured way to handle your agents" (solarkraft,
   [same thread](https://news.ycombinator.com/item?id=47507253)); "I just know
   my previous job will eat this up" (ramon156). A practitioner thread: "I use
   Linear as the durable memory for my AI agents"
   ([r/Linear](https://www.reddit.com/r/Linear/comments/1uf7y54/i_use_linear_as_the_durable_memory_for_my_ai)).
3. The multiplayer session model — team-owned, followable, redirectable —
   which HN criticism itself confirms is the differentiator ("multi-player by
   design... integrated into the workflow where the planning actually
   happens", Linear's cristinacordova in the same thread; even detractors
   argue about whether it's differentiated, not whether it exists).

## 6. Verdict for us

**Steal** (each with the one-line version for our board):

- Delegate ≠ assignee: the agent's involvement is a distinct, filterable field
  while the human keeps ownership. One line: a `delegate` mark beside the
  assignee on our Forgejo cards, never a takeover of the assignee slot.
- Platform-derived session states: pending/active/error/awaitingInput/
  complete/stale computed from the last harness event, with the 10-second ack
  and 30-minute stale clock. One line: our card badge derives from gateway
  events only, and the 10s/30min pair becomes our supervisor stall defaults.
- Ephemeral typed activities: thoughts and actions replace themselves in one
  line; response/elicitation/error persist as comments. One line: progress
  without scroll — the card shows the latest step, the ledger keeps the frozen
  stream (queue item 21 cites exactly this).
- The status row: state + "Working for 3m 51s" + PR chip + files changed +
  artifact strip on one compact session card. One line: elapsed time and PR
  link on the card face (queue items 7 and 20's badge), artifacts as counts.
- Cost on hover: "token cost by model, compute cost, and total cost" per
  session. One line: our card shows the running euro figure from the audit
  ledger, expanding into per-model/compute on hover.
- Limits that check on every human input, and a paused session that resumes
  only through an explicit Retry. One line: caps re-evaluated at each
  interaction, and a "resume" the human clicks — never silent auto-resume.
- Diff-line-to-message steering, on mobile too: tap a line, it quotes into the
  steering box. One line: queue item 23's `file:line | quote | comment`
  format, shipped with the mobile view.
- Evidence artifacts beside the diff: browser-test screenshots and recordings
  attached to the session card. One line: our reproduction gate's artifacts
  ride the card, so verification is shown, not claimed.
- Restart-on-stronger-model keeping the old PR for reference. One line: a
  "redo with tier-high" action that never deletes the first attempt's record.
- Agent work rendered as ordinary activity cards — Linear even fixed the
  session card's "header padding to match other activity cards". One line:
  agent events render in the same feed and card system as human events, one
  visual species.

**Skip**:

- Prepaid wallet with 12-month expiry and promotional credits: a billing
  mechanism masquerading as a control; our budgets are enforced task/day/
  project euro caps (queue items 41-43), not a balance the agent drains.
- "Limits are approximate... can lag up to two minutes... may overshoot":
  our caps must be hard at call time, not advisory after the fact.
- Approval only as PR review, post-hoc: no in-session checkpoint, no
  approval bound to the head commit (queue item 13 wants better than this).
- No stop/pause: restart-on-model is not intervention. Our stop button closes
  the issue and stops the workflow (queue item 24a).
- Guidance-as-markdown with zero enforcement, and environment secrets
  "visible to anyone who can run a session": both violate our
  policy-outside-the-model and no-credentials-in-the-pod rules outright.
- Workspace-wide manual board ordering: one person's tidying reorders
  everyone's board.

**Decision needed** (mutually exclusive field positions):

- Where the human approves: Linear decides in the PR/diff surface after the
  agent finishes; Conductor/Factory put checks and approvals on the live card
  mid-run. Our board-vs-PR approval boundary must be settled once, and
  whether an approval binds to a head commit (Open SWE) or to the session.
- How much of the stream the human sees by default: Linear curates (ephemeral
  one-liner + summary + artifacts; raw stream behind a click), Vibe Kanban
  and cline/kanban stream everything. We must pick the default view for the
  live task page (queue item 22 leans stream-first; Linear is evidence the
  curated default scales to "95% of workspaces").
- Whether a live-agents grid view exists at all: Linear refuses one (no
  multi-agent Mission Control); Factory Mission Control is only that. Queue
  item 12 currently wants the grid as a second view — confirm that against
  Linear's bet that the issue feed is enough.

Cloneability: none. Closed SaaS, no self-host, no clone, nothing to run; even
the Free tier requires an account, so this report is documentation-only by
necessity. What is imitable is the contract, not the code: the six-state
lifecycle, the typed activity vocabulary and the delegate field are all
described publicly and could be implemented over Forgejo issues plus our
event bus (the 2026-09-29 report lists exactly what Forgejo would need).

## Scoring axes

| Axis | Score | Reason |
|---|---|---|
| Card scannability (read ten cards in one glance) | 5 | One-line cards, nothing prose on the face, every extra property an explicit toggle, count/estimate on group headers. |
| State clarity (what is happening, how far, what next) | 4 | Six named session states plus workflow status, elapsed time and PR chip; minus one for no progress-percentage and branch only visible via the PR. |
| Human-decision surface (find and make the next decision) | 4 | Inbox/Priority, Reviews tab, awaitingInput notifications, merge-in-Linear; minus one because approve/deny is PR-shaped and post-hoc, not a decision on the card. |
| Agent-activity legibility (is the agent working, waiting, stuck) | 4 | Derived states, typed activities, artifacts and steering make runs legible; minus one for no stop/pause and stuck-detection stopping at 30-minute stale. |
| Noise level (5 means quiet: nothing without meaning) | 5 | Ephemeral thought/action lines replace themselves; durable events are typed; agent cards styled as ordinary activity; nothing without meaning renders. |

## Screenshots

Docs and changelog pages (headless Chrome, taken 2026-10-01):

- [docs-coding-sessions.png](shots/linear/docs-coding-sessions.png) —
  https://linear.app/docs/coding-sessions
- [changelog-2026-06-11-coding-sessions.png](shots/linear/changelog-2026-06-11-coding-sessions.png) —
  https://linear.app/changelog/2026-06-11-coding-sessions
- [changelog-2026-07-30-coding-sessions-mobile.png](shots/linear/changelog-2026-07-30-coding-sessions-mobile.png) —
  https://linear.app/changelog/2026-07-30-coding-sessions-on-mobile
- [changelog-2026-08-20-coding-environments.png](shots/linear/changelog-2026-08-20-coding-environments.png) —
  https://linear.app/changelog/2026-08-20-coding-environments
- [changelog-2026-09-24-new-controls.png](shots/linear/changelog-2026-09-24-new-controls.png) —
  https://linear.app/changelog/2026-09-24-new-controls-for-linear-coding-agent
- [docs-board-layout.png](shots/linear/docs-board-layout.png) —
  https://linear.app/docs/board-layout
- [docs-agents-in-linear.png](shots/linear/docs-agents-in-linear.png) —
  https://linear.app/docs/agents-in-linear
- [developers-agent-interaction.png](shots/linear/developers-agent-interaction.png) —
  https://linear.app/developers/agent-interaction
- [docs-ai-credits.png](shots/linear/docs-ai-credits.png) —
  https://linear.app/docs/ai-credits
- [method.png](shots/linear/method.png) — https://linear.app/method
- [pricing.png](shots/linear/pricing.png) — https://linear.app/pricing

Published product screenshots (downloaded from Linear's changelog, source URLs
named; descriptions verified by reading the images):

- [published-agent-working-alongside-diff.png](shots/linear/published-agent-working-alongside-diff.png) —
  from https://linear.app/changelog/2026-06-11-coding-sessions, alt text
  "Linear agent working alongside a diff": dark-theme agent chat on the left
  with the session card (Completed, Working for 12m 30s, action list, PR chip),
  the issue with embedded diff on the right.
- [published-issue-activity-feed-completed-session.png](shots/linear/published-issue-activity-feed-completed-session.png) —
  same source, alt "issue activity feed, showing a completed coding session":
  light-theme issue (In Progress, labels Bug + auto) with Delegated card,
  session card showing Completed / Working for 3m 51s / files changed /
  Opened pull request / six-screenshot strip / Summary block.
- [published-mobile-delegated-issues.png](shots/linear/published-mobile-delegated-issues.png) —
  from https://linear.app/changelog/2026-07-30-coding-sessions-on-mobile, alt
  "My Issues → Assigned showing delegated issues on iOS mobile app": the
  Delegated list, an issue with the agent session, and the mobile diff with
  tap-a-line steering.
- [published-guided-review.png](shots/linear/published-guided-review.png) —
  same source, alt "Guided Review for Diff on Refactor notification model and
  capture parse failures": the PR view with Guided Review sections and
  explainers above the diff hunks.
- [published-browser-testing.png](shots/linear/published-browser-testing.png) —
  from https://linear.app/changelog/2026-08-20-coding-environments, alt
  "Screenshot of Linear UI": the browser-use session with captured app
  screenshots as evidence.
- [published-auto-mode-routing.png](shots/linear/published-auto-mode-routing.png) —
  from https://linear.app/changelog/2026-09-24-new-controls-for-linear-coding-agent:
  the Auto mode diagram routing a typo fix to Luna and a downtime
  investigation to Astra, PRs created for each.

## Sources

- https://linear.app/docs/coding-sessions, /docs/linear-agent,
  /docs/agents-in-linear, /docs/ai-credits, /docs/board-layout,
  /docs/display-options, /docs/conceptual-model, /docs/configuring-workflows
  (fetched 2026-10-01)
- https://linear.app/developers/agents, /developers/agent-interaction,
  /developers/agent-best-practices (fetched 2026-10-01)
- Changelog: 2026-06-11-coding-sessions, 2026-07-30-coding-sessions-on-mobile,
  2026-08-20-coding-environments,
  2026-09-24-new-controls-for-linear-coding-agent, plus the changelog index
  (fetched 2026-10-01)
- https://linear.app/now/coding-sessions-for-linear-agent,
  https://linear.app/method, https://linear.app/pricing (fetched 2026-10-01)
- Voices: HN thread 47507253; Reddit threads linked in section 5; G2 and Siit
  reviews (searched 2026-10-01; Reddit pages themselves block fetching, quotes
  come from indexed thread content)
- Prior report re-checked:
  docs/market-research/projects/linear-for-agents/report.md (2026-09-29)
