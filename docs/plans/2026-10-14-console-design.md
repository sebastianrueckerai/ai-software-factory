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
| Item 4, the Needs you items | 700 | 9c69c61 (rebased on a roll that landed first; CI green on 07fe7c6, the same change) |
| Items 7 and 8, the New task page and the secondary pages | 701 | e9c6378 |
| The review's fix pass | 711 | a6b70e4 |

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

Contrast, measured from the stylesheet's tokens at the end of the round: every text pair items 3 and 4 introduced (the risk and migration chips, the need lines, the waiting time, the done row's faint text and its hover, the failed row's word, the Retry and PR text links, the Deny button) reads at 5.1:1 or better in both themes; the lowest is the waiting time in the light Needs you column at 5.1:1.

The round's state at the end of 2026-10-14: every item of the handover's order is on main (1, 2, 5, 6, 3, 4, 8; 7 as a ruling), the structural check reads `ok: every control present, the mechanics work` on the final main, the shots of every item are in `design/rounds/01-mission-control/` with the sheet page `index.html`. Open: 225 (lanes), which item 7's Track and the plan item's Accept plan wait for; 177's hover peek and model rule; no roll asked for the controller's approval during the round (the factory merged its rolls itself after the speed round).

## The final review

A fresh reviewer (a subagent on the strongest model, with the IA, the theme, this plan's rulings and C8 to C10) read the round's whole diff. No Critical finding. Fixed in the fix pass (pull request 711), each with a hand-derived test where one applies:

- The four-column grid kept a fifth, empty track from the five-column days; from 1280 px it took a fifth of the board. Visible in items 3 and 4's shots; `repeat(3, …)` on both grid lines.
- The time in the stage counted from the card's first admission (`AdmittedAt` is set once), so a card run again after review showed the wrong number. It now counts from the card's newest status row when that row is the newest event. Limit: when a later event (a question, a merge row) is newer than the status row, the face falls back to the admission or the gate's start; a `status_since` column in factoryd would settle it.
- The status panel's In progress list read the column titled "In progress", so the wide view showed "none" while the strip counted n; its Needs you links sent a human task and a waiting-poster card to `#need-<id>`, an article the card template has not. The list reads the stage now, and the links send such cards to their drawer.
- The ticker listed oldest first against its own doc comment and its live events went in front; the keep-one-copy step sliced nothing, so a live event duplicated the set. Newest first now, with the item count kept on the track, the filler copies hidden from assistive tech, and the ticker focusable so a keyboard user can pause it.
- The disclosure handler matched the status chevron, so one click toggled it twice (the structural check hid it by clicking every closed disclosure). The handler acts on the Deny and "Or in your words" buttons only, and the check opens those only.
- A reader's click on a card asked for a drawer the reader may not open (a 404 flash). The click needs the title's link.
- An escalation's title link had no visible focus ring (the face is `display: contents` inside the item). The ring is on the item.
- The phone's Done fold refolded on every board swap and its title was not focusable. The fold's state lives outside the swapped DOM; on the phone the title is a button for the keyboard. The phone's order is Needs you, In progress, Queued, Done.
- The counters' swap replaced the status line under the keyboard's focus; it waits while the focus is inside. An open Deny or own-answer box counts as busy, so a swap keeps it. A malformed card hash closes the drawer instead of leaving it open and empty.
- "The month cap is passed" showed when the cap was 0 (policy unread); the gauges overflowed past 100 percent. The note needs a cap; the gauges clamp.
- The drawer's empty sections were `summary` elements outside `details`; they are paragraphs. The drawer's need showed the question twice.
- A lab-only branch built the GitHub URL from a full remote; the mirror validates `owner/name`, so the lab and the figures test seed that and the branch is gone.
- The lab seeded its objects map while a stream read it, and the fake ledger recorded its window under a read lock. Both are under locks.
- A test had been loosened to accept any number of pings or counters before the board event; it asserts the exact sequence again. The wide view's done rows assert no lane badge, with the ruling: a done row carries no badge in either view.

Declined, with the reason:

- The status panel's lists follow the accent filter while the strip's counts do not. The lists are the filtered board's; the strip is the project's. Both are right for their reader; a note in the IA would settle it.
- A waiting-deps card in Queued speaks (its activity line shows). The IA's "a card that waits" covers it; the line tells what it waits on.
- The drawer's need checks `approver(r)` where the board checks `Factory && approver(r)`. Approvers are factory writers in every policy the console serves.
- The project switch has no submit button without JavaScript, as the IA chose.
- The escalation's Tab order follows the DOM (title, Close, then the choices) while the eye reads the choices first. Moving the face's transitions out of the DOM would split the face from its fragment; the order stays, and a note here records it.

The merge queue wait, measured on 2026-10-14 for C8's condition (a Verifying column comes back if the queue still takes tens of minutes), from a roll's pull request filing to its merge on the code repository: before the speed round's items landed, #638 15 min, #647 26 min, #657 54 min, #683 34 min; after them, #695 3 min, #697 3 min. The four columns stand; no Verifying column comes back.

Rulings taken in items 7 and 8:

- Item 7: the New task page keeps its Lane field. Track (direct or plan) replaces Lane with item 225, which is not built; a relabel without the model would mislead. The page wears the shell from item 2.
- Item 8: the secondary pages already wear the shell and the tokens from items 1 and 2 (the layout is shared). The item fixes what the shots showed: table cells that split task ids and dates, and the policy page's bare facts list.

## Not in this round

The other nine prototypes (kept in `design/prototypes/` as the record), the notification service (145), the PWA and the phone beyond the one-column layout (146), the analytics page (147), a wide view with lanes (there are no lanes), a console app in the Terminal direction's language (an idea Sebastian noted, not scoped).
