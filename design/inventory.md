# Inventory: every control and data point of the console today

Read off the templates in `internal/console/templates/` on 2026-10-13 (code commit 28ecf6f), then cut down on 2026-10-14 for item 225 (the lanes collapse: no lane columns, no move buttons, no plan accept; the track is set at filing) and item 226 (the whole card opens the drawer, Files is the last tab). A design may move any item; none may be dropped. "Where it goes" is filled per theme in `themes/<slug>/DESIGN.md`.

## Page shell

- Home link "Factory console"; nav: Board, New task, Projects, Resources, Costs, Policy, Alerts (the last five for factory writers only).
- Theme toggle (dark default, remembered). User name. Log out.
- Flash line for a refused action. Footer live-stream status ("The live stream ended: reload the page to follow the board").
- Keys overlay (?): w wide view, Escape, ?, / chat, Enter, Shift+Enter.

## Board page

- Filter: Project select, Accent select (eight fixed accents), Show. View toggle: Four columns or Wide view (the same four columns across the full width, the chat hidden). Keys button.
- Status line: project name; state word (working, waiting on you, idle) with a dot; n working; n waiting on the provider (when any); n need you (links to Needs you); spend / month cap (links to Costs); GitHub state (when exported). A click on the line expands it in place: the working cards by name and stage, the cards that need you, the spend today against the day cap and the month against its cap, the provider state, the GitHub pull requests, the configuration version and its infra commit linked to the tree (item 221, C9).
- Pulse: warning sign when prominent; one sentence; typing indicator while recomputing; three or four bullets behind the band's disclosure (no more/less button: the band expands on click).
- Four columns, each a title and a count: Needs you, Queued (waiting for capacity or on dependencies), In progress (running, closing and in review, the stage on the card), Done (C8). No lane columns (225).

### Card face

- Line 1: issue ref or task id; title; accent chip. The whole card opens the drawer (226); the issue link lives in the drawer.
- Line 2: the state, on an In progress card the stage from the session (planning, building, verifying) with its own dot; the time in the current stage (C8; the total age lives in the drawer); n/n checks; spend / budget with "⚠ near its budget" at 80 percent; gate text and its age.
- Activity line, monospace: the newest event in one line, or the escalation's question, with "answer on the issue" link when waiting; stale words ("nothing for 40 min").
- GitHub PR state line, when exported in pull request mode.
- Chips: fine states (retrying, held, on the provider, stale); model alias; blocked by n (names on hover); from plan #n (a child's plan as artifact); waiting on #n. No lane badge, no waiting-on-author state (225).
- Transitions: Retry; Close (with confirm) on a card waiting on a human, or failed without an issue. No Start plan, no lane moves (225).
- More fold: the objective (clamped to four lines); the agent's summary; the plan's cards; PR link; timeline link; summary edit form (Save summary); accent select form (Set accent).
- Stale ring on the card.

### Needs you items

- Merge approval: "Merge PR #n" link; risk class; model review verdict and summary; agent's recommendation; More: migration files, review findings, earlier reviews, security audit (verdict, model, findings with file:line), why a human. Links: task id, issue, timeline. Decision note. Approve (approvers; every action is the member's, so "as you" is not said); Split (large risk class); Deny with reason textarea and "request changes / reject" radio.
- Resource approval: type and volume, purpose, lease, cost per month and this lease, project, beyond the envelope. Approve (with the once-only note); Deny with reason.
- A plan's open question: the same item as an escalation, on the planning card, with its choice buttons and own-answer field. No Accept plan, no Request changes, no Reject: a plan with no open question files its children and closes by itself (225). The plan's summary and its cards table live in the planning card's drawer.
- Escalation: the card face; the reason; choice buttons; own answer textarea; Answer or "Grant one session with this answer" (capped); on a capped card, for its owner, the Fund form (card 641, roadmap 210): an amount in EUR, a reason, Fund; verdict buttons "real problem / false alarm" for approvers.
- Human task: a card face of kind human, with Close.

### Drawer

- Close (Escape). Title with issue link. Facts: status pill, lane badge, fine pills, model chip, spend / budget, PR link.
- Tabs: Overview, Chat, Activity, Files, Files last (226); Chat is the default on a running card.
- Overview: headline; provenance; objective body; the agent's summary; the plan (summary, cards table); reviews and audit of PR #n (merge facts, Split); related cards (why, pill, title, opens its drawer); issue and full timeline links.
- Activity: gates table (gate, attempt, start, duration, outcome, meter against the longest); steps table (time, step, supervisor action and diagnosis, detail).
- Chat: "Session n · model · outcome"; messages (who, time, text); steer form while running.
- Files: the changed files of PR #n (file, change, added, deleted), "no pull request yet".

### Chat panel

- Title; "project agent · project"; New conversation; old conversations select.
- Log: start line; your messages; agent replies (markdown); tool calls as collapsed blocks (name, arguments, result's first line, duration); proposals (title, list of changes, details, Do it, Skip); applied lines with undo; refused lines; expired; error; streaming cursor.
- "This is your own conversation" line. Textarea (Enter sends, Shift+Enter breaks, / focuses). Send. The queue of waiting messages, each editable and removable.
- Narrow screens: Board and Chat tabs, the Chat tab with an open-proposals count.

## Other pages

- Costs: today's spend against the day cap and the policy version; per-day table by kind with totals; per task and line.
- Resources: per project a table (task, resource and purpose, type, IPv4, lease end or standing, EUR/h, cost so far, state, Promote with its note and Release); the envelope block (task block, this month's use, standing block, standing now, the project's file link).
- Projects: intro with the Git link and New project; per project: settings list (repository, objects, agents, merge rule, notify, namespaces, quota, environments, Forgejo state, GitHub export with Remove and Sync latest, tokens); Export to GitHub form (remote, login, token, mode); the envelope; gateway YAML details.
- Alerts: the newest n alerts table (alert, kind, task, source and bound, raised, resolved, verdict or verdict buttons, supervisor action).
- Policy: version, commit, loaded, in force since; the config directory note and edit link; per process a stages table (stage, findings go to, enabled, when); projects table; policy.yaml.
- Timeline: the card face, the gates table, the steps table.
- New task: project, title, description, track (direct or plan, direct the default), priority, size, File the issue (225).
- New project: name, process, template, GitHub source and token (import), merge rule, File the project; then the status panel with steps and Merge.
