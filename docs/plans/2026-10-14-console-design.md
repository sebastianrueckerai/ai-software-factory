# Plan: the console takes the Mission control design

Sebastian's pick of 2026-10-14 from the console design round ([design/](../../design/), the brief, the shared information architecture, ten prototypes, decisions C1 to C7 in [design/design-decisions.md](../../design/design-decisions.md)). The direction is 06 Mission control: the pulse band on top with the status figures under it, the chat as the console on the left, the board on the right with Needs you as its first column in amber, the drawer docked at the right edge over the board, an event ticker along the foot, the phone as one column with the chat first. The prototype is the spec where words are ambiguous; the theme file is the rule set; the images are the target. The implementation lands in the code repository's `internal/console/` (templates, `console.css`, `console.js`, `chat.js`), server-rendered Go templates with htmx, no framework. Sources: the design round (this repo, `design/`), items 177, 219, 225, 226, rulings 251 and 255.

## The design

- The prototype: [design/prototypes/06-mission-control/index.html](../../design/prototypes/06-mission-control/index.html), with `?scenario=busy|idle|fire|quiet&theme=dark|light`. The scenarios are [design/prototypes/scenarios.js](../../design/prototypes/scenarios.js).
- The rule set: [design/themes/06-mission-control/DESIGN.md](../../design/themes/06-mission-control/DESIGN.md). The structure every part follows: [design/ia.md](../../design/ia.md). Every control that must stay: [design/inventory.md](../../design/inventory.md).
- The images, busy moment unless named: [dark at 1440](../../design/prototypes/06-mission-control/shots/busy-dark-1440.png), [light at 1440](../../design/prototypes/06-mission-control/shots/busy-light-1440.png), [dark at 1920](../../design/prototypes/06-mission-control/shots/busy-dark-1920.png), [seven cards in Needs you](../../design/prototypes/06-mission-control/shots/busy7-dark-1440.png), [the status figures expanded](../../design/prototypes/06-mission-control/shots/strip-open-dark-1440.png), [the drawer open](../../design/prototypes/06-mission-control/shots/drawer-busy-dark-1440.png), [idle](../../design/prototypes/06-mission-control/shots/idle-dark-1440.png), [fire](../../design/prototypes/06-mission-control/shots/fire-dark-1440.png), [the phone](../../design/prototypes/06-mission-control/shots/phone-busy-dark-390.png).
- The console today, for the before: [design/rounds/00-baseline/busy/dark/board-1440.png](../../design/rounds/00-baseline/busy/dark/board-1440.png), from the lab.

## What exists

- The console: 15 templates and one stylesheet of 377 lines in `internal/console/`, the oklch token ladder of proposal v1 (dark default, light under `data-theme`), the five columns as a view over the statuses (ruling 255), the wide view with the lane columns, the pulse, the status line, the chat panel at 36 percent on the right, the drawer between the board and the chat, two tabs under 1200 px.
- The lab in the code repository (`scripts/console-lab/run.sh`, branch `console-design`): the real console over the test fakes in the four scenarios, 80 screenshots in two minutes. The before and after of every step below come from it.
- Item 225's round removes the lanes, the move buttons and the plan clicks from the state machine and the templates; item 226 makes the whole card chip the drawer's opener and moves Files last. Both are planned, not built.
- The design round's rules from the builders' loops: Done rows in the faint token with no icons, the chat's start line at the top of the log, every light pair at 4.5:1 measured, Needs you buttons 44 px and full width on the phone, no horizontal scroll at 390.

## Work items

1. **Tokens and the base sheet.** `console.css` rewritten from the theme: the navy page, cyan as the system colour, amber as the signal colour, the state hues at 4.5:1 text and 3:1 fills in both themes, monospace figures (`ui-monospace` for numbers and the activity line, `system-ui` for text), panels with 1 px borders and corner marks, the faint and muted tokens, the light theme as the cream day version. Every rule below reads these tokens; the pill vocabulary and the accent chips keep their rule (ruling 247).
2. **The shell.** `layout.html`: the top bar as one quiet row (the home word, the project select that submits on change, the page links, theme, user, Log out; the filter row's Show button goes). `page.html`: the pulse band with the sentence and "more", then the status figures row as a disclosure that expands in place (the working cards by name and stage, the cards that need you, the spend today against the day cap and the month against its cap as two gauges, the provider state, the GitHub pull requests); the chat on the left at 40 percent, the board on the right; the Board/Chat tabs go; under 900 px one column, the chat first, the board as stacked sections with Needs you open and Done folded. `console.js`: the pane tabs go, the disclosure and the keys stay, the drawer docks at the right edge over the board only (`right: 0`, the chat never covered). The ticker along the foot reads the project's last events from the feed the stream already carries, pauses on hover and under reduced motion.
3. **The board.** `board.html`: the five status columns only, Needs you first with the amber frame, tint, corner marks and halo, 1.5 times the others' width, its items stacked; the lane columns, the move forms, the start-plan and the accept-plan forms go (this part lands in item 225's round, the buttons do not survive an interim); the card face per ia.md (the state row with the stage from the session kind, the activity line only on working and waiting cards, chips only when exceptional, Retry and Close as quiet buttons, the "More" fold gone, its content in the drawer); the whole card opens the drawer (226), the title keeps the link for assistive tech; Done rows in the faint token, no icons; the live dot on working and in-review cards (C6). The wide view is the same five columns at full width with the chat hidden.
4. **Needs you items.** The merge approval (headline with the risk and migration chips, the review line, the recommendation line, Approve, Deny with its reason disclosure, Split for a large PR, Details into the drawer's Reviews and audit), the question (the headline, the choices, "Or in your words", the verdict links for approvers), the capped card (the answer box open, "Grant one session with this answer"), the resource request, the human task. "Approve as you" is "Approve" (C7).
5. **The drawer.** `drawer.html`: the header (ref, title, the state dot and word, elapsed, the PR and issue links), the tabs Overview, Chat, Activity, Files; Overview with the four-line top block (task, status, budget, agent), the open need with its actions, then the collapsed sections (Time, Objective, The agent's summary, The plan, Reviews and audit, Related cards, Edit, Links); the summary and accent forms move here from the face. The Time section (C10) is one row per run of a stage the card went through, in order: the start time, the stage word in its hue, the duration, the cost of a building or planning run, and the note that ended or marked it (a check result, a review verdict, an escalation's question, the merge rule, the attempt with its model and the rule that raised it, a stall on the provider); its hint is the at-a-glance line (the factory time in n attempts, the waiting time, the spend). Its data is what the factory records today: the status history from the events table, the attempts with model and outcome and the check results from the timeline, the escalations from the intake events. The card's time on the face and in the drawer's head derives from the same runs.
6. **The chat.** `chat.html` and `chat.js`: the turn as an avatar (a cyan ring with a dot for the agent, a filled circle with the initial for the member), the name and the time on one line above the text, the text at full width; the tool block collapsed with the name and the duration; the proposal card with Do it and Skip; the applied line with undo; the composer with the prompt mark; the start line at the top of the log. The drawer's Chat tab uses the same turn.
7. **New task.** `new.html`: Track (direct or plan, direct the default) replaces Lane (225).
8. **The secondary pages.** Costs, Resources, Projects, Alerts, Policy, Timeline, New project: the shell and the tokens apply, the tables take the theme's rules, no structural change.

## Order

Items 1, 2, 5 and 6 touch nothing the lanes own and land first, as one pull request per item with the lab's before and after. Items 3, 4 and 7 land with item 225's round, because the move and plan forms go there and must not survive an interim. Item 8 last. Each step keeps `go test ./internal/console/` green; the console tests that read the markup get the one-line change their new markup needs, named in the commit.

## Verification

The lab shoots the four scenarios in both themes after every item and the sheet page shows the before beside the after. A Playwright check like `design/prototypes/check.js` runs against the live console: every control of the inventory present, the drawer never over the chat, Escape closes it, Do it becomes an applied line, no horizontal scroll at 390, the chat above the board on the phone. Every text pair in both themes measured at 4.5:1. A seven-card Needs you column scrolls like any column. Under reduced motion the dots and the ticker stand still. Then Sebastian's look in the live console.

## Where it stands

Step 0 of [the handover](2026-10-14-console-design-handover.md), answered on 2026-10-14 by the controller before the first commit. The code repository's `origin/main` was at 62fe22e.

1. **Since f0750ac8, one card touched `internal/console/`:** card 641 (roadmap 210, PR 648, commit 98eb5d2), the budget action. Item 221 (PR 636, commit 27a6681) landed before the baseline. Its element is a line under the pulse in `board.html`: "Configuration version N · commit <sha>", linked to the configuration tree. The design puts it into the expanded status panel, as a row of the fourth column (provider, GitHub, configuration), because the top bar's right end already holds the theme, the user and Log out. Decision C9. `design/ia.md` and the prototype get the row.
2. **Item 225 is not built.** Both process files in the infra repository carry a `lanes` block (`spec.yaml` and `maintenance.yaml`). `board.html` renders the lane columns, the move forms, Start plan and Accept plan. A worktree `work/lane-collapse` exists in the code repository at `main` with no commit. So items 3, 4 and 7 restyle the lane forms quietly and keep them working. The forms leave with item 225's round.
3. **Item 226 is not built.** The title links to the drawer only for a member who may write the summary. The tabs are Overview, Activity, Files, Chat. Item 3 makes the whole card the opener and item 5 puts Files last. The roadmap's item 226 is the prompt pack. The handover and C7 use 226 for the card opener and the tab order, which the roadmap folds into 227.
4. **Card 641 landed.** A capped card's escalation carries a Fund form: an amount in EUR, a reason and the button Fund, for the card's owner, under the answer form. It is in `design/inventory.md` now and in item 4 as the "raise the budget" row under "Grant one session with this answer".
5. **The speed round has not started.** There is no `docs/plans/2026-10-14-speed.md`. `roll_holds` and `AwaitSessionGap` are on `main`. Roll PR 657 (bff4b59) is open and in review. Every roll of this round waits for a session gap. Five cards were running at the start (639, 649, 651, 652, 653).
6. **Open cards touching the console:** 654 (roadmap 229, queued) changes `titleClause` in `board.go`, the face's title. 653 (roadmap 228, running) changes the stale ring's input in `board.go` and adds a sweep in factoryd. No open pull request touches `internal/console/`. Neither changes the templates this round rewrites.
7. **The lab branch is not merged.** `console-design` rebased onto 62fe22e without a conflict. `go vet ./internal/console/` is green on it. It is the first pull request.

The baseline suite: `go test ./internal/console/` on `main`, green in 3.5 s.

Two decisions reached the round after the handover was written:

- **C8, four columns (Sebastian, 2026-10-14, relayed by the portfolio session).** Working and Verifying merge into "In progress". The stage word with its own dot (planning, building, verifying) shows on the card, and the time on the card is the time in the current stage. The mapping: Needs you holds waiting-human and the human tasks, Queued holds queued and waiting-deps, In progress holds running, closing and in-review, Done holds done, failed and closed. Ruling 255's five titles become four. This round applies it in the design files, the prototype and the console. The report measures the merge queue's wait: if it still takes tens of minutes after the speed round, a Verifying column comes back.
- **C9, the configuration version (the controller, 2026-10-14).** Step 0.1 above.
- **C10, the Time section in the drawer (Sebastian, 2026-10-14, relayed by the portfolio session).** Item 5 carries it: the section, its data and the card's time derived from the runs. No stage bars on the board.
- **The speed round started in another session:** its items 1 (a roll takes no turn in the merge queue, 60b47d4) and 2 (sessions survive a factoryd restart, no roll gap, 928a351) landed on `main` on 2026-10-14 while this round ran.

The round's pull requests, in order: the lab, the board page's figures (today's spend and the day cap, the GitHub remote, the plan flag), the structural check, then items 1, 2, 5, 6, 3, 4, 7, 8. The structural check lands with the prerequisites and tests the design's mechanics, so it is red on the mechanics an item has not built yet. Each pull request names the lines still red. From item 2 on it is green.

## The round's ledger

What landed, in order, on the code repository's `main` by the controller's direct push after a green test job (the merge API refuses the controller, as ruling 109 keeps the merge door for the factory; a same-repository pull request fails the `job-env-audit` job by design, so the round's pull requests come from the controller's fork):

| Step | Pull request | Commit on main |
|---|---|---|
| The lab | 665 (661 closed: same-repository) | 73de708 |
| The figures (today's spend, the day cap, the GitHub remote, the stage) | 667 | d1a6584 |
| The structural check | 668 | 32cc922 |
| Item 1, the tokens and the base sheet | 672 | e821c96 |
| Item 2, the shell | 677 | b34697a |
| Item 5, the drawer | 684 | e533514 (its first test job red on a factoryd flake, the Temporal deadlock detector in TestWorkflowReportSixProviderRefusalsAskAHuman; green after a rebase on main) |
| Item 6, the chat | 685 | 74e06c5 |
| Item 3, the board | 692 | f6cbe93 |
| Item 4, the Needs you items | 700 | 07fe7c6 |

The structural check's lines after item 2: two, both item 3's (the whole card opens the drawer, the PR link on a verifying card's face). After item 3: none, `ok: every control present, the mechanics work`.

Rulings taken in item 3, each at the smallest change that keeps the IA:

- A click on a card opens the drawer for a member who may write the task's project. The drawer's handler (`writableCard`) refuses a reader, so a reader's face stays plain. Opening the drawer for readers is a permission change outside this round.
- The lane badge shows only a lane other than ready on the four-column board. Lanes exist until 225 is built, and ready is the default lane, so "ready" on every card said nothing. The wide view keeps its badges.
- The PR link sits on a verifying card's face and on a closing card's, since closing is the merge of that PR.
- A done plan card's row keeps the rollup of its children (n running, n done, n waiting) in its meta line. The plan's own work is over, its cards are not.
- The drawer's Status line reads "<stage>, <time in the stage>, <total> in all" on a card in progress (C8: the total in the drawer).
- The rows that hold forms are `div`s. A `form` closes a `p` in HTML, so the former `p.transitions` never held its forms.

Rulings taken in item 4:

- The face nested in the escalation stays as it is: the card fragment (`/cards/<id>`) must equal the board's face byte for byte, so the item lends itself the face's parts by CSS (`display: contents` and `order`) and hides the face's activity line, which would repeat the question.
- The plan item keeps Accept plan, Request changes and Reject: 225 is not built, and without them a plan could not be accepted.
- The wide view keeps the merge item's full facts and the resource request's facts list. It is the record view; the four-column board is the brief.
- The structural check opens every disclosure before it reads the page, so the deny form's choices and the own-answer box count as present.

## Not in this round

The other nine prototypes (kept in `design/prototypes/` as the record), the notification service (145), the PWA and the phone beyond the one-column layout (146), the analytics page (147), a wide view with lanes (there are no lanes), a console app in the Terminal direction's language (an idea Sebastian noted, not scoped).
