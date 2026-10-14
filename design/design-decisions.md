# Design decisions: the console

One entry per decision, newest last. Never reverse one silently. Propose a change as a new entry that names the one it amends. The factory's rulings (architecture.md) stand above these; a decision here that touches a ruling says so.

## C1. The hierarchy: pulse, chat, board (2026-10-14, Sebastian)

Three elements in order of weight: the pulse on top, the chat as the main affordance, the board for the granular task state. Today everything looks equally important and full of writing. The drawer docks to the right edge and leaves the chat free. On a phone the screen is the chat first with the board below, not two tabs.

## C2. Prototypes by any means, the console implements the pick (2026-10-14, Sebastian)

The round may prototype in plain HTML or React; the aim is a better design and UX by whichever way. The console's Go templates and CSS take the picked design afterwards.

## C3. The spending cap of the design round is $100 (2026-10-14, Sebastian)

For fal and other services. Tokens are not capped. The run goes overnight; the director picks provisionally between rounds and Sebastian's picks in the morning are the decisions.

## C4. Needs you is the first column, prominent, never a tray (2026-10-14, Sebastian)

The Needs you column looks different from the other four and louder: its own fill, rule and header. It stays a regular column of the board, so seven waiting cards read like any column that grows downward. A tray or band across the top of the board is out: with seven cards it wraps into rows, scrolls inside itself and squeezes the board (seen on the Mission control prototype at 1440 and 1920). Done stays quiet.

## C5. Mission control is the direction (2026-10-14, Sebastian)

Of the ten prototypes, 06 Mission control goes on: the amber Needs you column, the instrument strip, the chat as the console on the left, the event ticker. Taken into it from the others: the chat turns of 09 Inbox first (an avatar, the name and the time above the text). Sebastian's reservations noted for the implementation: the screen is busier than the calm directions, so every loop asks what can go quieter.

## C6. Live dots (2026-10-14, Sebastian)

The state dot of a working card breathes, an in-review card's dot slower. Under reduced motion they stand still.

## C7. The board after the lanes collapse, and the status line expands (2026-10-14, Sebastian)

Items 225 and 226 of the roadmap applied to the design: no lane columns, no Plan, Ready, Start plan or Accept plan buttons; the track is chosen at filing (New task gets Track instead of Lane); Queued holds cards waiting for capacity or dependencies; a working card names its stage (planning, building, verifying); Needs you holds merge decisions, questions (a plan's open questions among them) and capped cards; "Approve as you" is "Approve", since every action is the member's own; the whole card opens the drawer and Files is the last tab. The status figures row expands on click into the working cards, the cards that need you, the spend today and this month as gauges, the provider state and the GitHub pull requests.

## C8. Four columns: Working and Verifying merge into In progress (2026-10-14, Sebastian)

The board has four columns: Needs you, Queued, In progress, Done. Needs you holds waiting on a human (approvals, questions, capped cards) and the human tasks. Queued holds queued and waiting on dependencies. In progress holds running, closing and in review. Done holds done, failed and closed. A card in In progress shows its stage word with its own dot: planning (a plan-class task's session), building (a coder session), verifying (in review: checks, gates, model review, the merge queue). The live dot runs on all three, verifying slower (C6). The time on the card is the time in the current stage, never the total age, which stays in the drawer's Status line. A red check that sends a card back to the agent shows as the stage word changing from verifying to building, with the activity line naming the failed check.

Why: the work-in-progress bound counts slots, not columns (`CountAdmitted` counts a project's cards in running, in-review, closing, waiting-deps, waiting-human and waiting-poster plus admitted queued cards), so a card in Verifying already holds a slot and a column of its own changes nothing about the bound. After the speed round, verifying takes two to four minutes, so its column stands empty most of the day. Four columns beside the 40 percent chat gain about a quarter of width per column at 1440, where every prototype was cramped. Ruling 255 makes the columns a view over the states, so this is a mapping change: the status in-review stays and nothing in the state machine moves. The decision amends ruling 255's five titles and C7's five columns. One condition: if the merge queue still takes tens of minutes after the speed round, the pile of verifying cards is real information and a separate column comes back. The round's report measures it.

## C9. The configuration version sits in the expanded status panel (2026-10-14, the controller)

Item 221 put the configuration version and its infra commit under the pulse as a line of its own. In the design it is a row of the status panel's fourth column (provider, GitHub, configuration), linked to the configuration tree, because the top bar's right end already holds the theme, the user and Log out, and the figure is read rarely. The face of the page stays quiet.

## C10. A Time section in the drawer tells how the card's life went; no stage bars on the board (2026-10-14, Sebastian)

When a card looks wrong, Sebastian opens it and wants to see at a glance how its life went and what to change so the next cards go better. Proportional bars on the board were tried and dropped: a night waiting on a human skews them, and he does not want figures on every look at the board. The board stays as it is.

The section: a collapsed "Time" disclosure, first in the drawer's Overview list above Objective. Its hint at the right of the summary row is the at-a-glance line, "2 h 14 min factory in 3 attempts · 1 h 46 min waiting · €1.08": factory is building, planning and verifying, attempts the count of building and planning runs, waiting is queued and waiting on you, and a part that is zero is left out. The hint is in the muted text colour and wraps on the phone. Open, one row per run of a stage, in order: the start time in mono, the stage word in its hue in bold, the duration right aligned, the cost on a building or planning row, and the note that ended or marked the run ("checks 2/4, go test ./acceptance failed", "review by factoryd: approve", "asked: …", "merge, rule human", "attempt 3, coding-frontier, stronger after 3", "18 min stalled on the provider, 429"). Where the factory applied a rule, the note names it. A stall is a note inside the building row, not a row, because the card's state did not change. Below 720 px the note takes its own line under the row.

The time on the card and in the drawer's head derives from the runs: an active card shows the time since the last run of its current stage began, a done, failed or closed card the sum of all runs "in all" (C8's rule, now with its source). The data comes from what the factory records today: the status history, the attempts with their model and outcome, the check results, the escalations. A later roadmap item, not part of this decision: per-project medians over the last done cards, beside Costs, built on the same rows.

## C11. One time on a card, its age; the gate line leaves the face (2026-10-14, Sebastian)

A card showed two times: the time in its stage (C8) and its gate's age ("session for 5 min", "approval for 25 min"). On a first attempt both were the same number; after a retry they differed and neither said which was which. Sebastian: at a glance the card's age is enough, and for more he opens the card. The face shows the stage word with its dot and the card's age, nothing else about time. The gate line is gone from the face. The drawer's Status line keeps the time in the stage and the total, and names the card's place in the merge queue; the Time section (C10) holds the attempts and the gates. This amends C8, which had put the time in the stage on the card: the admission is recorded once, so that number was wrong after a retry, while the card's age is exact. A span under a minute says so; a span from a day reads in days and hours. The same day Sebastian dropped the accent filter (an accent is a colour with no meaning of its own, and no card wore one) and asked the ticker to carry the last day's events only.

## C12. No ticker along the foot (2026-10-14, Sebastian)

The moving line of the project's newest events at the foot of the page was for style, and the screen has enough going on. It is gone, with its script and its rules. The foot keeps the stream's state line, which shows only when the live stream is down or ended. The events stay where they were: the card's activity line, the drawer's Activity tab, the pulse band.

## C13. The board's find box and the column menus (2026-10-14, Sebastian)

From the board filters study ([design/rounds/02-board-filters/](rounds/02-board-filters/index.html)): the find box for every card and a menu per column, its variants A and C together. Sebastian: "the per menu option plus a search field for all cards". The chips (variant B) are out: a row of red and amber chips on every look at the board repeats what the faces already say in amber. The two critics split, Gemini for the box and GLM for the menus, and the pick takes both.

The find box sits in the board's head right of "Board". A word matches what the face says: the ref, the title, the state and stage words, the activity line, the chips. A `key:value` term matches a fact behind the face: `plan:558`, `stage:verifying`, `status:failed`, `is:failed` (also blocked, stale, provider, near, retrying, held), `by:sebastian`, `model:coding-cheap`, `pr:612`. Every term must match. The box submits on Enter as a GET with `?q=`, × clears it, `f` focuses it, Escape in the box clears it. The menus: a ▾ in the head of Queued, In progress and Done, none on Needs you, opens that column's orders and filters as radios. Queued: next up, oldest first, newest first, and all, blocked only, from plan #n. In progress: by stage, oldest first, by spend, and all, exceptional only. Done: newest first, oldest first, and all, failed only. A column in another order or with a filter says so in a cyan line under its head, with × back to the default.

The state lives in the URL beside the project and the view, so the poll, the card fragments and the event stream follow it and a reload keeps it. Only the column counts follow the filters, as "2 of 5", and an emptied column says "none match". The strip counts the project and the status panel's lists are the project's: the filters are the member's lens on the board, not on the status. A Needs you column with hidden items keeps its amber and its "1 of 2" pill, so a decision never goes silent. The chat agent reads the whole project and ignores the filters. Why: the two needs no column order covers are finding one card by its ref or a word and seeing one plan's cards across the columns, which the box does at the cost of one quiet field, and the menus make each column's orders and filters discoverable without typing.
