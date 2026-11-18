# Inventory: every control and data point of the console today

Read off the templates in `internal/console/templates/` on 2026-10-13 (code commit 6a89f50), then cut down on 2026-10-14 for item 225 (the lanes collapse: no lane columns, no move buttons, no plan accept; the track is set at filing) and item 226 (the whole card opens the drawer, Files is the last tab), and brought to C46 on 2026-11-18 (the small card as one paragraph and a foot line, the opened card in layers, one board with no wide view). A design may move any item; none may be dropped. "Where it goes" is filled per theme in `themes/<slug>/DESIGN.md`.

## Page shell

- Home link "Factory console"; nav: Board, New task, Projects, Resources, Costs, Policy, Alerts (the last five for factory writers only).
- Theme selector (C15): moon and sun, each a button, the theme in force outlined (dark default, remembered). User name. Log out.
- Flash line for a refused action. Footer live-stream status ("The live stream ended: reload the page to follow the board").
- Keys overlay (?): Escape, ?, f find, / chat, Enter, Shift+Enter.

## Board page

- Filter: Project select. The find box (C13): words and `key:value` terms (`plan:`, `stage:`, `status:`, `is:`, `by:`, `model:`, `pr:`), typing filters the board after a short pause and Enter still submits, × clears, `f` focuses, Escape in the box clears. Keys button. One board: no wide view.
- Status line: project name; state word (working, waiting on you, idle) with a dot; n working; n waiting on the provider (when any); n need you (links to Needs you); spend / month cap (links to Costs); GitHub state (when exported). A click on the line expands it in place: the working cards by name and stage, the cards that need you, the spend today against the day cap and the month against its cap, the provider state, the GitHub pull requests, the configuration version and its infra commit linked to the tree (item 221, C9).
- Pulse: warning sign when prominent; one sentence; typing indicator while recomputing; three or four bullets behind the band's disclosure (no more/less button: the band expands on click).
- Four columns, each a title and a count ("n of m" when narrowed): Needs you, Queued (waiting for capacity or on dependencies), In progress (running, closing and in review, the stage on the card), Done (C8). No lane columns (225). The column menus (C13), a ▾ in the head of Queued, In progress and Done: the orders (newest first, oldest first; Queued next up; In progress by stage, by spend) and the shows (Queued blocked only, from plan #n; In progress exceptional only; Done failed only) as radios with Apply; the state line under the head with ×.

### Card face (C46)

- Every card: one paragraph, the title and then the why line, the text wrapped and never cut. A human's bare issue may have no why line. The whole card opens the drawer (226), and the issue link lives in the drawer.
- Foot line, mono: the state dot and word with the card's one time (in In progress the stage, C8: planning, building, verifying, the chain's words, or sizing, screening or writing the proofs while a helper task runs), the place (the plan's name and the card's position as a link to the plan's card, a plan's own size, or ↻ and the routine's name), the card's number, then only when they apply: the waits clause ("waits for #2101 (Change two lines in the runner's build files, needs you)", "waits for its turn to start, 2 ahead (7 running)"), "brief not checked", the colour as a dot and its name. After the time, only the marks of an exceptional state: n/n checks while verifying, "⚠ near its budget" from 80 percent, retrying, held, on the provider, stale.
- Every `#N` on a face, other than the card's own number, is a link that names its target's title and state.
- A Done card (done, failed, closed): the title alone, then a foot line without a dot: the state word in its quiet hue, the total time of all runs, the place, the number. A failed card's state word names the failure in one clause. No why line and no button.
- At most 300 characters of prose, no field and at most one button on any small card.
- Stale ring on a card that owes work, none on a card that waits for a human.

### Needs you items

- Every item is a card with an open ask, whatever its kind: a merge, a plan's question or confirmation, an extra promise, a promise of a plan, a card out of sessions or money, a resource approval, a human's work card, a monitor flag. Each kind's ask, why line, story and answers come from one register, and each label from one vocabulary.
- The band (C44): the number, the place and the waiting time, 32 px at the least.
- One paragraph: the ask as the title, then the why line.
- The part in view, on a card whose pages are the parts of one ask ("Promise: …").
- The answer row: the suggested answer as one compact button, or as a link to the opened card when it needs a field. Beside it, who suggests it ("project agent's pick") and "or N others ›", which opens the card at its ask.
- With more than one open ask or page, the carousel at the foot: previous, the count "n of m", next.

### Drawer

- Close (Escape). On the phone a bar with "‹ Board" and ×.
- Tabs: Overview, Session, Activity, Files, Receipt (226). Session is the default on a running card.
- Overview, the opened card (C46). The head: title, why line, the mono line with the state, the time, the place, the number as the issue link, the waits clause and an open pull request. The ask block: "Your call" with the page's place and the carousel's arrows, the question, its why line, the story, each answer as a button with its effect line, the suggestion with who suggests it and the grounds, the fields under a pressed answer with their defaults, one Send, the line that names who can answer for a viewer who may not. The summary. The closed folds: a writer's own words ("The agent's own words"), The agent's view, The full brief, The plan, The card's life (C10's runs, the session summaries, spend, model, helper tasks), What each session got (one fold per session), Other actions (each answer with its effect line), What these words mean.
- Session: "Session n · model · outcome", the newest session's agent text and the messages a human sent it. No message box: "Tell the running session" under Other actions writes to it.
- Activity: gates table (gate, attempt, start, duration, outcome, meter against the longest); steps table (time, step, supervisor action and diagnosis, detail); chain readout (C38), a collapsed section after the tables, the live fact as its hint, open when red or stalled: the carry run with clock, age and verdict, the required contexts, the head of main, the repair or stall card, the ladder's re-run, the cover run.
- Files: the changed files of PR #n (file, change, added, deleted), "no pull request yet".
- Receipt: a merged card's stored receipt.
- Document mode (C17): back and forward named by their target; Recent (last six); the path with the indicator (clean with commit and time, ● unsaved, saving…, not saved with its reason); Read | Edit; Open in Forgejo; Wide and Narrow; New document (name, Create); Close (Escape); pins row with + pin; the rendered text with its links and the hover peek; the editor (text area, Save as commit, Cancel, Discard, "based on <sha>"); the changed line (reload, or your save will merge · load theirs); the refusal (show theirs, load theirs); the restored-draft line (discard); the Documents button in the board head.

### Chat panel

- Title; "project agent · project"; New conversation; old conversations select.
- Log: start line; your messages (image attachments as thumbnails, each a link to the full image, and a message a chat token sent with a dashed avatar ring and "via" and the token's name in the who line, C43); agent replies (markdown); asks, the newest unanswered one with an answer row of choices that sends at once (C26); tool calls as collapsed blocks (name, arguments, result's first line, duration); proposals (title, list of changes, details, Do it, Skip); applied lines with undo; refused lines, a refused apply followed by the agent's corrected proposal (C28); expired; error; streaming cursor.
- "This is your own conversation" line. Pending images from paste and drop as chips above the box (picture, name img1, × removes, nothing uploads until Send; C27). Textarea (Enter sends, Shift+Enter breaks, / focuses). Send. The queue of waiting messages, each editable and removable.
- Narrow screens: Board and Chat tabs, the Chat tab with an open-proposals count.

## Other pages

The four secondary pages follow the readout grammar of C24: a small-caps section label, one monospaced figures line, rows on the page ground between hairline rules, C19 lamps on states, figure columns right-aligned.

- Costs: today's spend against the day cap and the policy version; per-day table by kind with totals; per task and line.
- Resources: per project the envelope figures line (task block, this month's use, standing block, standing now, the project's file link or the envelope_default note) and a table (task, resource and purpose, type, IPv4, lease end or standing, EUR/h, cost so far, state, Promote with its note and Release); at the foot the cluster's jobs table (name, kind, namespace, schedule, last run, last ok, suspended).
- Settings, per project (`?project=`): settings list (repository, objects, agents, merge rule, notify, namespaces, quota, environments, Forgejo state, GitHub export with Remove and Sync latest, tokens); Export to GitHub form (remote, login, token, mode); gateway YAML details; New project as a quiet foot link.
- Policy: the version figures line (version, commit, loaded, in force since); the config directory note and edit link; per process a stages table (stage, findings go to, enabled, when); projects table; policy.yaml.
- Alerts is not a page: the escalation card asks no verdict, the project agent judges an escalation with the chat's alerts tool, and the supervisor's action and diagnosis ride the alert text (C41).
- Metrics, per project (`/projects/{name}/metrics`): the window control 7 · 28 · 90 days in the URL (28 the default), five sections (Delivery, Stability, Cost, Autonomy, The factory itself), one row per figure: name · value · signed move against the previous window · the last 7 weeks as a monochrome server-rendered SVG spark (trace faint, endpoint dot in text ink); model mix as a long value row without a spark (C30).
- Timeline: the card face, the gates table, the steps table.
- New task: project, title, description, track (direct or plan, direct the default), priority, size, File the issue (225).
- New project: name, process, template, GitHub source and token (import), merge rule, File the project; then the status panel with steps and Merge.

## The notifications page (C19)

- Connect Telegram: a button that becomes the deep link "Open Telegram and tap Start to connect" (t.me/<bot>?start=<one-time code>, a fresh code per press).
- Connect Discord: a link to the OAuth start, when Discord is configured.
- Connections list: one row per live link (venue, address), Disconnect per row.
- Level per project: a table (project, Now, Set). Now shows the member's own word or "default: <word>". Set is a select of off / needs-you / all with Save, one per row.
- Chat tokens (C43): a table (name, project, created, expires, last used with its lamp, Revoke per row), "No chat token." when there is none. The form folds behind "Make a chat token" once a token exists: project, name, lifetime of 7, 30 or 90 days, Forgejo token, Make chat token.
- The shown-once block after a token is made, above Connections: the token's name, "shown once", the `claude mcp add` line with Copy, the bearer with Copy.

## The routines (C16)

- Board head: the control "↻ routines ▾" with the radios all, within a period (a number and days or hours, 1 day at first), none. State in the URL.
- Ghost card at the foot of Queued: ↻, the title and the why line from the routine file, the schedule in words, next run, last run and outcome, held line, no button (C46). A click opens the routine's drawer.
- Lane foot when ghosts are hidden: "n routines hidden", opens the control.
- Instrument strip: the cell "↻ bump in 20 min" or "↻ bump held", only when a run is under an hour away or held.
- Card face: ↻ and the routine's name as the place in the foot line of a card a routine filed.
- Drawer of such a card: the provenance line under the top block, the routine's name as a link.
- The routine's drawer: title with ↻, the mono subtitle, tabs Overview (top block: schedule, next, last, while open, tells; the acts "Skip the next run", "Give it to me" and "Run it now", each with its effect line; the brief; the runs; the configuration), Runs (the rows as in the Time section), Config (the yaml, "ask the project agent to change this").
- Chat tools: `routines`, `routine_write` with a confirm, `routine_delete` with a confirm.
- Resources page of the infra project: the cluster's jobs, read-only.
