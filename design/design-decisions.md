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

Why: the work-in-progress bound counts slots, not columns (`CountAdmitted` counts a project's cards in running, in-review, closing, waiting-deps, waiting-human and waiting-poster plus admitted queued cards), so a card in Verifying already holds a slot and a column of its own changes nothing about the bound. After the speed round, verifying takes two to four minutes, so its column stands empty most of the day. Four columns beside the 40 percent chat gain about a quarter of width per column at 1440, where every prototype was cramped. The columns are a view over the states, so this is a mapping change: the status in-review stays and nothing in the state machine moves. The decision amends the five titles and C7's five columns. One condition: if the merge queue still takes tens of minutes after the speed round, the pile of verifying cards is real information and a separate column comes back. The round's report measures it.

## C9. The configuration version sits in the expanded status panel (2026-10-14, the controller)

Item 221 put the configuration version and its infra commit under the pulse as a line of its own. In the design it is a row of the status panel's fourth column (provider, GitHub, configuration), linked to the configuration tree, because the top bar's right end already holds the theme, the user and Log out, and the figure is read rarely. The face of the page stays quiet.

## C10. A Time section in the drawer tells how the card's life went; no stage bars on the board (2026-10-14, Sebastian)

When a card looks wrong, Sebastian opens it and wants to see at a glance how its life went and what to change so the next cards go better. Proportional bars on the board were tried and dropped: a night waiting on a human skews them, and he does not want figures on every look at the board. The board stays as it is.

The section: a collapsed "Time" disclosure, first in the drawer's Overview list above Objective. Its hint at the right of the summary row is the at-a-glance line, "2 h 14 min factory in 3 attempts · 1 h 46 min waiting · €1.08": factory is building, planning and verifying, attempts the count of building and planning runs, waiting is queued and waiting on you, and a part that is zero is left out. The hint is in the muted text colour and wraps on the phone. Open, one row per run of a stage, in order: the start time in mono, the stage word in its hue in bold, the duration right aligned, the cost on a building or planning row, and the note that ended or marked the run ("checks 2/4, go test ./acceptance failed", "review by factoryd: approve", "asked: …", "merge, rule human", "attempt 3, coding-frontier, stronger after 3", "18 min stalled on the provider, 429"). Where the factory applied a rule, the note names it. A stall is a note inside the building row, not a row, because the card's state did not change. Below 720 px the note takes its own line under the row.

The time on the card and in the drawer's head derives from the runs: an active card shows the time since the last run of its current stage began, a done, failed or closed card the sum of all runs "in all" (C8's rule, now with its source). The data comes from what the factory records today: the status history, the attempts with their model and outcome, the check results, the escalations. A later roadmap item, not part of this decision: per-project medians over the last done cards, beside Costs, built on the same rows.

## C11. One time on a card, its age; the gate line leaves the face (2026-10-14, Sebastian)

A card showed two times: the time in its stage (C8) and its gate's age ("session for 5 min", "approval for 25 min"). On a first attempt both were the same number; after a retry they differed and neither said which was which. Sebastian: at a glance the card's age is enough, and for more he opens the card. The face shows the stage word with its dot and the card's age, nothing else about time. The gate line is gone from the face. The drawer's Status line keeps the time in the stage and the total, and names the card's place in the merge queue; the Time section (C10) holds the attempts and the gates. This amends C8, which had put the time in the stage on the card: the admission is recorded once, so that number was wrong after a retry, while the card's age is exact. A span under a minute says so; a span from a day reads in days and hours. The same day Sebastian dropped the accent filter (an accent is a colour with no meaning of its own, and no card wore one) and asked the ticker to carry the last day's events only.

Amended by C46 (2026-11-16): the state word with its dot and the card's one time, its age, stay on the face, and the face now also carries a why line and the card's place. The drawer's Status line goes with the drawer's old header.

## C12. No ticker along the foot (2026-10-14, Sebastian)

The moving line of the project's newest events at the foot of the page was for style, and the screen has enough going on. It is gone, with its script and its rules. The foot keeps the stream's state line, which shows only when the live stream is down or ended. The events stay where they were: the card's activity line, the drawer's Activity tab, the pulse band.

## C13. The board's find box and the column menus (2026-10-14, Sebastian)

From the board filters study ([design/rounds/02-board-filters/](rounds/02-board-filters/index.html)): the find box for every card and a menu per column, its variants A and C together. Sebastian: "the per menu option plus a search field for all cards". The chips (variant B) are out: a row of red and amber chips on every look at the board repeats what the faces already say in amber. The two critics split, Gemini for the box and GLM for the menus, and the pick takes both.

The find box sits in the board's head right of "Board". A word matches what the face says: the ref, the title, the state and stage words, the activity line, the chips. A `key:value` term matches a fact behind the face: `plan:558`, `stage:verifying`, `status:failed`, `is:failed` (also blocked, stale, provider, near, retrying, held), `by:sebastian`, `model:coding-cheap`, `pr:612`. Every term must match. The box submits on Enter as a GET with `?q=`, × clears it, `f` focuses it, Escape in the box clears it. The menus: a ▾ in the head of Queued, In progress and Done, none on Needs you, opens that column's orders and filters as radios. Queued: next up, oldest first, newest first, and all, blocked only, from plan #n. In progress: by stage, oldest first, by spend, and all, exceptional only. Done: newest first, oldest first, and all, failed only. A column in another order or with a filter says so in a cyan line under its head, with × back to the default.

The state lives in the URL beside the project and the view, so the poll, the card fragments and the event stream follow it and a reload keeps it. Only the column counts follow the filters, as "2 of 5", and an emptied column says "none match". The strip counts the project and the status panel's lists are the project's: the filters are the member's lens on the board, not on the status. A Needs you column with hidden items keeps its amber and its "1 of 2" pill, so a decision never goes silent. The chat agent reads the whole project and ignores the filters. Why: the two needs no column order covers are finding one card by its ref or a word and seeing one plan's cards across the columns, which the box does at the cost of one quiet field, and the menus make each column's orders and filters discoverable without typing.

## C14. The threads as an instrument table, the inbox pinned, the level under Send (2026-10-14, Sebastian)

From the multi-chat round ([design/rounds/02-multi-chat/](rounds/02-multi-chat/index.html), roadmap 239): variant B, instrument, with a level control of Sebastian's own description. Sebastian: "I like B better. Smaller dots look nicer", and on the level: "make it closer to what claude code does and put that under the send button … when that is clicked the selection pops up … each option should have a short explanation like in claude". The critic had picked messenger (C) compared and instrument first over the directions; the director had recommended messenger's rows with instrument's lamps. Rail (A) and messenger (C) are out, and so are the three level placements the images drew: the chat's head, the instrument strip, the top bar.

The switcher is a mono table at the chat's left, 212 px: the columns mark, thread, last. The inbox is the first row, pinned, with a house mark; the other active threads follow by last turn; the archived rows sit last under an "archived" rule, marked "arc", dimmer, each with restore. The open row carries a 2 px cyan rule at its left edge. A thread with a turn in flight carries a breathing cyan dot in the mark column (still under reduced motion). A thread with turns the member has not seen carries an amber count at the row's right, and its title goes bold; the browser tab's title reads "(n) Factory console" with the sum. Opening a thread clears its badge; reading another thread never clears the inbox's. New is a small button in the chat's head; Archive and Delete… are text buttons on the open thread's head, Delete in the failed red, neither on the inbox and neither on an archived thread. The table folds (Sebastian: "the section where I check the other convos should be collapsible, but still have some notification alert in collapsed state"): a ‹ in its head folds it to a 36 px strip of the marks alone, each row still a button with its title as the tooltip, the open row's rule, the working dots and the unread counts in view, the count as a small pill at the mark's corner; › unfolds. On the phone the fold hides the list and leaves one summary row, "Threads 4 · 1 unread · 2 working", which unfolds on tap.

The inbox is the factory's thread: its head says so ("the factory's thread: the agent speaks here uninvited"), its title in amber. A poke is a turn by "the factory" with an amber avatar ring, one per state change, with choices as buttons where a decision fits, and a decider line in faint mono ("assisted level · started by the agent") when the agent acted on its own. An escalation is a poke marked "needs you" with a 3 px amber left rule; its choices sit in an answer row between the log and the text box, once, "Answer: Postgres SQLite Ask the author · or in your words below"; a choice or a reply answers and resolves the card.

Delete is hard. The warning is a modal: "Delete “title”? Its n messages go for good: a hard delete, no archive. One event will name you, the thread and the count. What the chat did stays in the events, the audit and git, so no decision and no merged card goes with it." Delete the thread, Keep it.

The commands are affordances of the text box: "/" at the start opens a palette above the box with `/compact` and `/new` and their words, arrows and Enter choose; the two also sit as chips under the box. A command is a message and nothing more; `/compact` leaves a summary turn and the last two turns.

The level control sits in the composer's foot at the right, under Send, its top flush with the `/compact` and `/new` chips at the left (Sebastian: "put that under the send button", "flush against the same upper border as the /compact and /new fields"): a small mono button with a lit cyan square and the level's word. It opens a menu above the box, 330 px: the head "autonomy · a change confirms", then the four levels, each a row with a lamp, its name in bold and its one-line meaning in the muted colour, the current one tinted with a ✓. Choosing another level turns the menu into the confirm in place: "Set the project's autonomy to autonomous? This writes a policy change and lands in the audit like every decision. From then on: …", Set in amber, Keep. The set lands one poke in the inbox. Escape, an outside click and Keep close it. On the phone the button is 44 px and the menu as wide as the screen allows.

Every text pair the round adds measures 4.7:1 or better in both themes; the lowest are a row's time and the menu's head, faint on the panel. The cost of the round was $2.55 of $15.

## C15. The theme selector: moon and sun, the theme in force outlined (2026-10-15, Sebastian)

From the theme toggle round ([design/rounds/03-theme-toggle/](rounds/03-theme-toggle/index.html)). Sebastian found "Theme: dark" boring and asked for a fitting symbol. He picked E, selector-3, the recommendation. Both critics had picked its earlier version in the compare loop (9 of 10 each). The half disc (Gemini's runner-up), eclipse-2 (GLM's runner-up) and the sun and moon swap are out, and so are the eight other candidates of the round.

The top bar holds moon and sun side by side in a 1 px frame in `--line-strong`, before the user's name. A 1 px outline in `--text-muted` marks the theme in force (7.5:1 dark, 6.6:1 light) and slides to the other half in 280 ms. The glyph in force is drawn in `--text`, the other one in `--text-muted`. The control is two buttons in a group named Theme, each with `aria-pressed`. The moon sets the dark theme, the default, and the sun sets the light theme. A click on the half in force changes nothing. Each half hovers on its own. The outline and the glyph colours follow `data-theme`, so a light page paints right before the script runs. The choice stays in localStorage, as before. On the phone each half is a 44 px target with a 22 px glyph.

Why: it is the only finalist that shows the theme in force and the other one at once, so a click never surprises. It reads as an instrument's mode switch, which suits Mission control. It costs 48 px of the top bar, against 30 px for a single glyph. The version the critics judged marked the theme with a filled key in the panel border colour. That key measured 1.6:1 on the page, below the console's 3:1 for a fill that carries a state, so the key became the outline. Both critics then scored the outline higher on state and on quietness. Not taken: a system position (dark stays the default), a cyan or amber accent (a theme is a normal state), an inner shadow and a snap with overshoot. The round cost $0.24 for 8 critic calls, against a cap of $3.

## C16. Routines: every routine a ghost card at the foot of its lane, its schedule in words on the card, the chat as its editor (2026-10-15, Sebastian)

From the routines round ([design/rounds/04-routines/](rounds/04-routines/index.html), roadmap 267). The round built four homes for the factory's recurring work and recommended the hybrid of the board's ghost card and the status panel's column. Sebastian: "I like the ghost cards", "we need a way to see all cards, so have them all, but at the bottom of each lane, and maybe have a way to hide all or hide all that are a long time away". The main chat must create, change and delete them through tool calls. The schedule is stated inside the card and may be any pattern, a time or "every x merges". Run now stays, and the agent may run them by the autonomy level. Routines are per project, since projects differ in setup and needs. The word is the director's call: the thing is a routine, its rhythm line is its schedule.

The board. Every routine of the project stands as a ghost card at the foot of the lane its card will land in: a human-card routine under Needs you, an agent-card or pull-request routine under Queued. Amended on 2026-10-17 (Sebastian's ruling, built as PR 990): every routine's ghost stands under Queued, for Needs you holds only what needs a human's action now, and a routine's work reaches it only as its filed card, through the normal card flow. A ghost has a 1 px dashed border in `--btn-line`, no fill, and its text in the faint colour: the title with ↻, the schedule in words in mono ("every Monday 06:00", "every 20 merges · 14 of 20", "hourly and on a configuration version"), the next run ("Mon 06:00 · in 20 min"), the last run with its outcome ("last #781 merged in 2 days"), and the acts Skip once and Run now as ghost buttons. Amended by C46 on 2026-11-17: the ghost holds no button, as every small card offers one action at a time, and its acts stand on the routine's opened card. A run under an hour away names its time in the text colour. A held run says "held: #781 is still open" in the amber text colour. A running run carries the breathing cyan dot. The ghosts sort by the next run, merge-counted ones by merges left. A lane's count stays the count of its real cards. A control in the board's head right of the find box, "↻ routines ▾", has three radios: all (the default), within a period (a number and its unit, days or hours, 1 day at first), none. Under within, a merge-counted routine always shows, since it can fire any day. Amended on 2026-10-15 (Sebastian): the period replaces the fixed 7 days, and the find box filters the board as the member types, with Enter no longer needed. A typed find replaces the URL rather than adding a history entry per pause, so Back leaves the board as before the find. Its state lives in the URL beside the filters of C13, so a reload keeps it. A lane with hidden ghosts ends in one faint line, "2 routines hidden", which opens the control. The hybrid's Routines column in the status panel is out: the board holds the one list, and nothing is shown twice. The strip's cell stays: "↻ bump in 20 min" in the muted colour when a run is under an hour away, "↻ bump held" in the amber text colour when held, nothing otherwise.

The drawer. A click on a ghost opens the routine's drawer with the tabs Overview, Runs and Config: the top block (schedule, next, last, while open, tells), the acts, the brief, the runs as rows in the style of the Time section (C10), and the configuration. A card a routine filed carries the chip "↻ routine" after its state row and, in its drawer under the top block, the provenance line "filed by the factory · routine Weekly bump · run 15 · last run #781 merged in 2 days" with the routine's name as a link to the routine's drawer. The Config tab says "ask the project agent to change this". The "propose a change in the chat" button of the round's prototypes goes.

The acts. Run now files the routine's card at once. Whether the agent starts it follows the autonomy level, as for every card. Skip once skips the next run and records it as a run with the outcome "skipped by sebastian". Both are acts with their via, as a queue pause is.

The chat. Three tools: `routines` reads the project's routines with next, last and the runs. `routine_write` creates or changes one: the agent shows the routine it will write, the member confirms, and one commit lands on the project's file in the configuration tree, as the level change does. `routine_delete` confirms, commits and writes one event. "Every Thursday at six, update the dependencies" in the chat ends as a ghost card under Queued.

The schedule. A list of triggers, any mix: a cron expression in the factory's time zone for any time pattern, a merge count, an event (a configuration version, a push to main). The factory words the schedule for the card. A cron it cannot word shows as the expression. The factory side, the persistence and the data are in [docs/routines.md](../docs/routines.md).

The cluster's jobs (the backup, the dump) leave the board. They list on the infra project's Resources page, read-only.

Why: a ghost at the foot of its lane says where and when work arrives, which is the one thing a timer never said. All of them in view answers "what runs on its own" without a second list, and the hide control keeps a long list quiet. The strip says "now", the drawer is the one detail view, and the chat is the one editor, as for every setting (architecture 5.6: settings read-only, a change is a commit). Both critics had asked for the hybrid and ranked it first in the second loop (Gemini 10, GLM 9); Sebastian's amendment moves the list from the panel to the board and keeps the rest. The round cost $2.58 of its $15 cap.

## C17. The documents in the drawer: one document, links in place, a named way back, a save as a commit (2026-10-15, Sebastian)

From the documents round ([design/rounds/05-documents/](rounds/05-documents/index.html), roadmap 277). The round built four shapes for reading and lightly editing the project's Markdown documents inside the screen and recommended the hybrid of the wiki and the split's two panes. Sebastian: "What I don't need for now is two docs next to each other. I want the wiki." And on saving: Ctrl+S saves, the saved state must be clearly shown, unsaved changes carry a mark before the name as VS Code's "*", a newer version from the repository is offered but never loaded over his changes without asking, and a commit's latency must not feel like a slow save.

The slot. A document opens in the drawer's slot at the right edge over the board, `min(46%, 720px)`, the chat never covered, the Needs you column visible at the slot's left. Links in the text open their target in place. The head: the back and forward arrows named by their target ("‹ roadmap", "backlog plan ›", the glyph alone when nothing lies that way), a Recent menu of the last six, the path in mono with the indicator, Read | Edit, Open in Forgejo, Wide, New document, ×. Under the head a pins row, the backlog file pinned by default, "+ pin" for the open document. The browser's back is the same step as the arrow and lands at the old scroll. A link's hover or focus shows a peek with the target's first paragraph after 400 ms, never on touch. Wide covers the board with the same document centred at its 70-character measure. A card takes the slot and the document closes; a Documents button in the board head reopens it where it was. The phone shows the document full screen, one column, 44 px targets, no Wide, no peek. The text at the chat's 14.5 px, headings in the text colour, links in the accent colour with a faint underline at rest.

The indicator. The path line always says the state: clean, with the commit and time muted after the name; `●` in the accent colour before the name from the first keystroke; `· saving…` muted while a commit runs; the reason in the amber text colour after the name when a save did not land. The pins, Recent and the Documents button carry the dot while a draft exists.

The editor and the draft. Edit swaps the text for a plain text area in mono with the browser's spellcheck, the full height, and the row Save as commit, Cancel, Discard, "based on <sha>". Every keystroke writes the draft to the browser's storage, so no commit's latency can lose text. Leaving with a draft shows no dialog; coming back reopens in Edit; a reload restores with "draft from <time> restored · discard"; Discard asks inline. Ctrl+S and Cmd+S save. New document asks a name inline and opens the file with its heading; the first save creates it.

The save. One Save is one commit on master through the chat's write door with the member's own token, so the commit names the member. The save runs in the background, the editor stays live, one commit in flight and one queued with the latest text. A landed save clears the dot and names the commit. A failed save says "not saved: <reason> · retry" and keeps the draft. A save that breaks the roadmap's structure says so and commits nothing. When the file moved on under the member, the door merges three ways and says "saved, merged with <who>'s change"; when the same lines changed, it refuses with "show theirs" and "load theirs", and the text and the dot stay.

Outside changes. A newer version landing while the document is open, from the agent, the close-out or a push from an editor, shows one quiet line under the head: in Read "changed by <who> <time> · reload", in Edit "… · your save will merge · load theirs". The text never changes by itself, and load theirs asks first.

What goes: the second pane, the tab strip, the tree rail, a lock or presence while editing, autosave to git, a commit message box.

## C18. The settled inbox: the quiet log, the two pills (2026-10-17, Sebastian)

From round 06 ([design/rounds/06-settled-inbox/](rounds/06-settled-inbox/index.html), roadmap 292), six candidates over the console's own stylesheet, row 00 the plain styles phase 1 had landed. The director picked 02 quiet-log provisionally under the away rule; Sebastian confirmed it 2026-10-17 ("looks good").

The settled row. A row the settle rule has closed keeps its who line, the name muted and the avatar's dot faint, and folds to one quiet line in mono: the reason word first ("answered by sebastian · 14:02", "seen"), then the first words of the content with an ellipsis. Tap or click expands the full row, text, reason and buttons; tap again folds it. The fold is a 44 px target on the phone. What the settled row loses at rest: the amber rule, the action buttons, the full text. The reference is [cand/c2.css](rounds/06-settled-inbox/cand/c2.css); the build landed as f5203e1 in the code repository, with same-region evidence in [ev/](rounds/06-settled-inbox/ev/).

The badge. The switcher's inbox badge splits into two pills behind one aria-label: the amber pill counts open asks (needs you), the bordered pill counts unseen new rows, and the tab title carries both, "1 needs you · 3 new".

What goes: the runner-up's reason on the right, a bare reason-only line, hiding the who line or the avatar.

## C19. The notifications page as one instrument readout, lamps on every state (2026-10-17, the director under delegation)

From round 07 ([design/rounds/07-notifications/index.html](rounds/07-notifications/index.html), roadmap 145), eight directions in both themes, then a fix loop and a compare pass with both critics. Sebastian delegated the pick ("You pick the design you think best!"); this entry is provisional until he confirms it.

One monospaced readout, no card fills: a Connections table first (venue, state, action) over a hairline rule, then Level per project. Every state carries a small square lamp, both sections in one language: lit cyan for connected and for a level the member set, amber for needs-you, unlit for off and not connected. A derived default states itself in words, "default: needs-you", in dim text; the member's own word stands at full strength. The actions stay phase 1's controls, styled quiet: Connect, Disconnect, a select with off / needs-you / all, Save per row. The phone stacks the rows, the select goes full width, every target 44 px. What goes: the card look, explainer lines, preview strips, the log's one-line rows (the runner-up; its quiet is worth stealing for a read-only surface). The reference is [cand/instrument-fix-dark.png](rounds/07-notifications/cand/instrument-fix-dark.png); the reasons are in [the round's notes](rounds/07-notifications/notes.md).


## C20. The pulse band goes: the strip carries the status line (2026-10-17, Sebastian)

Decided in conversation, 2026-10-17 evening, no image round: the model-written pulse and its folded bullets leave the project screen. What the band carried is covered with actions attached: "does anything need me" is the status strip (working · N working · M need you · spend of envelope · percent, all read from the tables), "what needs me" is the highlighted needs-you column and the inbox rows with their answer buttons, "what is happening" is the board, "what happened while I was away" is the inbox feed. On 2026-10-17 the band was the only surface that lied: it showed a three-hour-old ask as current while board and inbox were right (card #1013, defects a and b). A headline that can contradict the rest of the screen is worse than no headline, and the design principle holds: no rule in a prompt that a table can carry.

The screen after: the strip stays as it is; the SPEND / provider / configuration panel renders always, without an expand control; the band's markup, the Pulser loop and the pulse's model calls are deleted. The chat task stays for the conversation. The model's voice keeps its place in the chat. The build card is "the pulse band leaves the screen: the strip carries the status line" (filed 2026-10-17).

What goes: the pulse sentence, the folded bullets, the prominent state, the pulse's share of the chat budget, the expansion interaction.

## C21. The tab title counts asks as a bare number (2026-10-17, Sebastian)

An amendment to C18's badge line. The browser tab title's marker drops its words: not "(1 needs you · 3 new)" but "(4)", the sum of open asks and unseen rows, falling to nothing once read or answered. Accepted shorthand for one message. The switcher's pills keep their wording and aria labels.

## C22. A timestamp never breaks inside its value (2026-10-17, Sebastian)

From the card drawer's Last activity rows, where a narrow column split a date mid-value ("2026-10-" over "17 19:35"). Every timestamp in the console stays whole on one line; a column that cannot hold it overflows or ellipses, but a date never reads as two values.

## C23. The top bar: sparse words in three groups, the open page's word cyan (2026-10-17, the director under delegation)

From round 08 ([design/rounds/08-top-bar/index.html](rounds/08-top-bar/index.html)), eight directions at both widths and in both themes, three critic runs, a fix loop and a compare pass. Both compare critics picked sparse (gemini 43:39, glm 41:37) and the director's pixel pass agreed. Sebastian delegated the pick ("implement whatever design you liked best", 2026-10-17); this entry is provisional until he confirms it.

The bar. One 44 px bar, hairline rules, quiet small-capitals words: the home link, the project select, then the eight destinations in three groups with generous space between them — the working board (Board, New task), the reference pages (Projects, Resources, Costs), governance (Policy, Alerts, Notifications) — and the theme toggle, the member's name and Log out at the right end. No box holds the links. The open page's word carries the cyan and a short underline; New task is the bar's only bordered word. At 1440 all eight show; under 1200 the tail folds into a More menu. On the phone Board's word stays in the bar itself, New task becomes a bordered "+", and Menu opens a sheet of 44 px rows with the group gap and Log out last. No new colour; every text pair 4.5:1 in both themes.

What goes: the runner-up's fixed panel (it needs collapse logic to survive a long slug or a narrow window, and its divider rule broke in the generator's own hands), lamps before destinations, folder tabs, a second stacked bar. The reference is [cand/fix-sparse-desk-dark.png](rounds/08-top-bar/cand/fix-sparse-desk-dark.png); the reasons are in [the round's notes](rounds/08-top-bar/notes.md). Revisit panel if the destinations grow past eight or the cyan underline proves too subtle in daily use.

The build landed as 5b9ac7d in the code repository (rebased to main, race suite green on the result). One deviation from the mock: on the phone the wordmark is gone — Board targets the same page, and at 390 px the bar needed the width; the theme toggle stays in the bar at the right end, as here. Build evidence, including the magnified before/after crops of the phone overflow the pixel pass caught: [rounds/08-top-bar/ev/](rounds/08-top-bar/ev/).

## C24. The secondary pages follow one readout grammar; the bar carries six words (2026-10-18, the director under delegation)

From round 09 ([design/rounds/09-secondary/index.html](rounds/09-secondary/index.html)), eight directions at desk width in both themes, three critic runs, a pixel pass, a fix loop and a compare pass. The compare critic put it plainly: the fold hides live rows, and between readout and ledger "readout becomes the system" — key:value lives in it naturally, tables land on the page ground without ceremony. The director's pixel pass agreed. Sebastian delegated the pick ("implement the design you think best", 2026-10-17); this entry is provisional until he confirms it.

The scope first, because the round began as an information question, not a visual one. Six rulings govern what sits behind the bar; they amend C23's destination list while its styling stands. Board goes: the home link is the board. New task stays, the bar's one bordered word. Projects becomes Settings, one page per project at `?project=`, carrying the settings rows, the GitHub export and the gateway YAML; the envelope figures move to Resources; "New project" stays as a quiet foot link. Alerts goes: its verdict buttons live on the board's escalation card, `POST /alerts/{id}/verdict` and the chat's alerts tool stay, and the supervisor's action and diagnosis ride the alert text. Costs, Resources and Policy stay as they are. The groups become figures (Costs, Resources) and running (Settings, Policy, Notifications).

The grammar, one for every secondary page including the notification page C19 already spoke: a small-caps section label, one monospaced figures line, then rows on the page ground between hairline rules. C19's lamps mark states, cyan lit for live and enabled. Figures columns align right and set tabular. The standing row answers to a stronger top rule, not a tint. Resources states its tables in aria-labels, not captions; Costs keeps its captions because they carry the date window. Nothing invented: the figures line carries the envelope whole, jobs keep their seven honest columns, and a project with no file says so and still shows its figures.

What goes: card fills, hero numerals, one giant ledger table, nav rails, disclosure folds for the tables. The reference is [cand/01-readout-fix-dark.png](rounds/09-secondary/cand/01-readout-fix-dark.png); the reasons are in [the round's notes](rounds/09-secondary/notes.md). Revisit the ledger if a page ever holds more than three sections.

The build landed as 9f016b7 in the code repository, rebased twice onto the moving main so C23's landed bar stands and this round's six words ride it; the settings page carries its own project select on its heading line, since the bar's select is the board's alone. Race suite green (21 ok); the lab's 241 shots with every page check green — three lab checks fail, byte-identically on pure main, from the notifications round's in-flight expectations. Build evidence: [rounds/09-secondary/build/](rounds/09-secondary/build/).

Sebastian held the live page against the reference on 2026-10-18 and called the gap; four closes followed in the code repository as 2f39c6cf. A closed row, its state outside open, sits on the quiet raised ground with faint text, as the reference drew the released row; the standing top rule stands. A lease's end words short in the cell ("in 2 h", "2 d ago") with the full stamp and the releaser in the cell's title, as the jobs table words its ages. Money carries the €, the board face's own eur2 idiom, not the letters. A project with no rows in the window says "none open or closed in the last 7 days" after its figures instead of dangling. Kept on purpose against the mock: the bar is C23's landed bar, and the page head keeps the console's h2 scale with its meta paragraph.

## C25. The status panel returns behind the strip's click (2026-10-18, Sebastian)

A correction of C20's record, not a change of mind. C20's line "the SPEND / provider / configuration panel renders always, without an expand control" was wrong when written. The standing want is C7's, said many times since: one thin status line, closed, that expands on click. C20's real decision, the pulse band going, stands untouched.

The build: the strip is the summary of a details element whose only other child is the panel. The line stays one thin row of figures until clicked, and the open state survives the board's swap and the poll, which replace only the innerHTML. Keyboard and screen readers follow the native summary. The build card is "console: the status line is one thin strip again, the panel behind its click" (Forgejo pull 1085).

## C26. The agent's chat question carries C14's answer row; a press sends at once (2026-10-19, Sebastian)

The ask tool's question renders in the conversation and the newest unanswered one carries the C14 answer row: the choices as buttons, "or in your words below", free text always open. A press sends the choice at once as the member's own chat message, which starts the model turn — the same record a typed answer makes, per the question-format concept. Any later row settles the ask; the row is gone from the settled one. Escalations keep their own shape: ask is for chat questions, escalate files a needs-you card.

The build is the ask tool and its row (Forgejo f408be79), reviewed in round 12.

## C27. A member's image rides the composer as a chip and lands as a thumbnail; the agent reads it by tool (2026-10-19, Sebastian)

Paste and drop collect pending images as chips in the queue-chip pattern — the picture, the name img1 the member can refer to in the text, an × that removes — and nothing uploads until Send. The sent row shows each image as a 96×96 thumbnail, a link to the full image. The agent never sees the pixels in its context: analyze_image resolves the name newest-first and answers from one priced vision call. A member-sent image is spend they approved — Sebastian's ruling, verbatim: "If I send an image somewhere as the human, we can assume I OK that spend." — so the look carries no confirm gate; the chat's monthly budget stays the hard bound.

The build is the attachments spine end to end (Forgejo cb94df23, 2f80c724, cb7f8888, the vision alias in the infra repo), reviewed in round 12.

## C28. A refused filing names what to fix and feeds a turn; the correction lands as a new proposal (2026-10-19, Sebastian)

When a pressed Do it is refused — the ready check wanting acceptance tests a plan card did not carry — the refusal is not a dead end. The do- row keeps the refused colour and the check's words, and the refusal feeds the model a new turn, exactly as an in-turn tool refusal does. The agent's correction arrives as a new proposal that visibly carries what the refusal asked for, waiting on its own Do it. The record reads as recovery: refusal named, remedy proposed, nothing hidden. The tool's shape teaches the rule up front: new_card takes the acceptance tests as its own parameter, so the filing that knows the rule never meets the refusal.

The build is the acceptance parameter and the refused-apply turn (Forgejo cd15824f), reviewed in round 12.

## C29. The chat keeps its column: a spanning composer with a sizer seam, and a glyph that takes the screen (2026-10-19, Sebastian)

From round 11 ([design/rounds/11-compact-reorg/index.html](rounds/11-compact-reorg/index.html)), six directions built in the real stylesheet rather than generated, two of them wired as live try pages. Sebastian tried both live and picked A, adding one demand: the input itself must be resizable.

A keeps threads and conversation side by side, and the composer spans both as the chat grid's third row. The chat's floor rises from 18 rem to 24 rem. The Grow button goes: the box grows itself, capped at 60 vh. The sizer seam sits on the composer's top edge, a focusable separator: drag between 44 px and 60 vh, double-click resets, ArrowUp and ArrowDown step 24 px. The glyph in the chat head takes the whole screen: the conversation holds its 48 rem reading measure centered, a vertical "board" edge tab clings to the left edge, Esc also exits, and the glyph's twin paths flip with aria-pressed while the name stays "Chat and board". The status panel's services render as lamp chips, the age on hover and inline on a down chip. The spend gauges stay and the provider-ok row goes. The drawer gains a fifth tab, Chat: the card's own conversation, posting and streaming like the main chat. Quiet controls carry native titles.

What goes: B's tab that put the thread table behind the chat, the Grow button, the services row list, the provider-ok row.

The wide window settles in the same round: the five secondary pages hold the 62 rem measure, the board alone spans, and a test pins the measure so it cannot drift.

The build is 37cece0b on branch round-11-build in the code repository. The race suite is green (21 ok), and the lab's 269 shots and its structural check came back green, with the glyph, the sizer and the five-tab drawer asserted in the browser. Build evidence: [rounds/11-compact-reorg/build/](rounds/11-compact-reorg/build/).

## C30. The metrics page: one column of instrument rows, the spark from real weeks (2026-10-19, Sebastian)

From round 13 ([design/rounds/13-metrics/index.html](rounds/13-metrics/index.html)), roadmap 147, six image directions judged by two critics, then four live prototypes at Sebastian's call ("show me the prototypes"). He picked rows live on 2026-10-19: the reference is [cand/try-rows.html](rounds/13-metrics/cand/try-rows.html).

The page. One column at the secondary pages' shared measure (C29's 62 rem; the prototype's own 64 rem was its call before C29 settled the measure), METRICS the open page's word in the figures group (Costs, Metrics, Resources). The head: "Metrics", the muted line "How the project runs its work, over the window and against the one before.", and the window control — 7 · 28 · 90 days, one word active, the window in the URL as Costs carries its dates, 28 days the default. Five sections in weight order — Delivery, Stability, Cost, Autonomy, The factory itself — each a small-caps label over rows on the page ground between hairline rules (C24's grammar). One row per figure: the name in the muted colour, the value in monospaced tabular figures, the move against the previous window as a plain signed figure in the muted colour — no good/bad colour, up is read by knowing the figure; amber stays reserved for a figure crossing an exceptional state, and v1 has none — and the window's weeks as one monochrome spark in a right column every row shares: a hairline trace in the faint colour and an endpoint dot in the text colour, server-rendered SVG from the real weekly buckets, near-constant figures widened in range so flat reads as flat. A figure without a spark (model mix) takes the long value across the row. On the phone the row stacks: name, value with its move inline, spark below.

The build renders the [concept's catalogue](../docs/metrics-visualization-concept-2026-10-19.md) behind it: a named queries module, one SQL query per figure, Postgres the store of record, the JSON endpoint the seam, the hard-data decision of 2026-10-13 honored — no LLM-computed metric anywhere.

Runner-up: twin, the same rows in two columns, if the one column proves too tall in the lab. Kept for later: the strip's weeks view as a toggleable second view, and headline's ghosted previous window as an optional delivery chart. Both die for v1, with the loud hero chart and every card fill.

Sebastian read the section labels as too small on the live page (2026-10-20): the secondary pages' shared label, C24's small-caps grammar, rises from 13px in the muted colour to 15px in the text colour on every secondary page, the grammar itself unchanged.


## C31. A card's press moves the card at once and registers once (2026-10-20, Sebastian)

Sebastian asked for a board that answers a press at once. A pressed card moves from Needs you to In progress before the factory answers, and it jumps back only when the expected change does not happen. One press registers, so a card never takes Approve and Deny both.

The press. The card moves to the column its action leads to and slides there in 200 ms. Under reduced motion it moves without the slide. An answer, a fund or a plan's change request leads to In progress. A close leads to Done, and so does an accepted plan. An approval's decision leads to the column of its task's status. A human card that goes to the factory or closes leaves the board. The moved card shows at 55 percent opacity, without its buttons and forms. A press that moves nothing, such as Park or a hold-out's Okay, dims the card until the answer is in.

The lock. From the press on, the card takes no other press, on the board and in its drawer. Its buttons are disabled, and the console drops a second request for the same card.

The truth. The card keeps its new place until the factory's board shows it out of the column it left. An approval's decision shows in the answer itself. An answer waits for the workflow's next step, seconds later. A refusal or a lost request puts the card back at once, with the reason in the flash. A card the factory has not moved within a minute goes back too. The column counts stay the factory's until its board answers.

The build is b35c662f on main of the code repository. The lab's structural check presses an escalation and asserts the move, the single press, the jump back on a refusal and the hold through a board that still shows the card waiting.

## C32. The level sets on one click, and the lamp's blue follows the level (2026-10-20, Sebastian)

Sebastian: the confirm's Set "takes a few seconds to react, so I can click it more than once and I think the additional clicks cause errors. Get rid of this whole dialogue, let users change the level with one click." And on the light: blue only for full auto, or "full auto is our blue but brighter and manual is a subdued blue, something like that". C14's confirm in place ("Set the project's autonomy to …? Set, Keep") is out.

The pick. A row in the menu sets the level at once: the menu closes, the control reads the new level, and the write goes out as before, the approver's pull request on the project file. The menu's head reads "autonomy · one click sets it".

The wait. The control shows the pick at once and nothing of the write: no greyed state and no lock (Sebastian, 2026-10-21: "When I click I want to see the change"). The writes go one after another, so a second pick during a write waits its turn and the last pick stands. A refused or lost write puts the level the factory holds back, with the reason in the flash. After the merge the console loads the policy at once, so the level is in force when the write answers and not at the loader's next pass, up to 30 seconds later. The member's own change pokes the other members' inboxes and not their own: they know what they set.

The lamp. One blue, the accent, from all but unlit to white-hot (Sebastian, 2026-10-21: "make the gradation between the states bigger … full auto glow really bright, manual even darker; the last stage needs to be clearly distinguishable"). Manual is 15 percent of the accent over the ground and assisted 38, both without a glow. Autonomous is 70 with a small glow. Full auto is the accent mixed toward white in a three-layer halo. In the light theme the unlit manual lamp carries a grey edge, so it does not vanish into the ground, and full auto is a vivid cyan in its own halo. The menu's checked row carries the same lamp.

The build is d414cd1f on main of the code repository. [Before and after](rounds/02-multi-chat/ev/ev-level-montage.png): the menu at assisted, then at full auto after one click; [the lamp at the four levels in both themes, before and after the wider ramp of 0fbfa903](rounds/02-multi-chat/ev/ev-level-lamps.png). The lab's structural check picks full auto and asserts the menu closed, the control set at once and unlocked after the write, and the lamp's colour changed. The first build locked and greyed the control for the write's seconds, and Sebastian read that as the delay; 6e7cd0ab took the lock out, chained the writes, loads the policy after the merge and keeps the actor's own inbox quiet. The lab's check asserts the control is never greyed after a pick.

## C33. Every row of the level menu carries its own lamp (2026-10-22, Sebastian)

Sebastian, on the film's autonomy menu: "It should have lights that get brighter with each automation level!", and "manual is always not initially on". C32 lit only the checked row, so the menu showed one lamp and three empty squares, and manual's 15 percent read as off at any size below the full screen.

Every row now shows its level's lamp at that level's strength, so the menu reads as a ramp from manual to full auto; the ✓ still marks the current level. This revises C32's two lowest values: manual is 28 percent of the accent over the ground and assisted 48, both still without a glow, so manual stays the subdued blue C32 asked for and still reads as lit. Autonomous and full auto keep C32's values, and the control under Send uses the same lamps.

The build is 02b83737 on main of the code repository.


## C34. Only the current level's lamp is lit (2026-10-22, Sebastian)

Sebastian, on round 5 of the film: "Showing the manual to auto setting, multiple lights seem to be on. In the beginning only the manual light should be on, then when switching to auto only the brighter full auto light." C33 lit every row of the level menu at its level's strength, so the menu showed four lit lamps at once.

Each row keeps its lamp, but only the current level's lamp is lit; the other rows show an unlit socket with the strong line colour as its border. This returns to C32's single lit lamp and keeps C33's values: manual at 28 percent of the accent over the ground still reads as lit, and full auto keeps its glow, so the lamp of the current level gets brighter as the level rises.

The build is f838387e on main of the code repository.

## C35. A message sent during a turn joins it and shows when the agent read it; a thinking mark; tool calls fold (2026-10-22, Sebastian)

Sebastian, on the chat: "I want my messages to go into the chat to be read by the AI at the next opportunity", "I want a pulsing *thinking* indicator", "can we collapse the old ones and only show the current one?", and on queued messages, it is "difficult to know when he actually read my latest message". Before this, a message sent while a turn ran waited in a queue under the input with an ×. It went out as its own turn only after the turn ended. A blinking block cursor stood for a turn in flight.

A message sent while the agent's turn runs now goes into the log at once, below the turn, with the line "not read yet: the agent reads it after its current step". The server hands it to the running turn. After the tool call in flight, the turn moves the message after its own rows and reads it at its next model call. The line then turns to "✓ read by the agent" in the done green, and the turn answers in a new message below it. A turn that takes no messages, such as `/compact` or a Do it, leaves the message queued for its own turn, as before. The editable queue under the input is gone.

A message whose turn is in flight ends with a cyan dot and the word "thinking" in mono, which breathes at 1.6 s. Under reduced motion it stands still.

A run of two or more tool calls in a row shows its newest call. The earlier calls fold behind one line, "n earlier calls", which opens on a click. Text, a proposal or an applied line ends a run.

The build is 37ea3535 on main of the code repository.

## C36. A lamp shows only beside the chosen level (2026-10-22, Sebastian)

Sebastian, on round 6: "Before they are always visible next to every setting. Now every light (from dim to bright) is only visible when its setting is chosen. So only one lamp is on at the same time." C34 still drew an unlit socket beside every other row.

The level menu draws a lamp only beside the current level, at that level's strength from C33; the other rows keep the lamp's space, so the names stay aligned, but show nothing. The control under Send already shows only the current level's lamp.

The build is 4d879897 on main of the code repository.

## C37. The landing page's hero: the roadmap line, the film first, a byline, three points, alternating sections (2026-10-26, Sebastian)

The first decision on the landing page, from round 14 (`design/rounds/14-landing-hero/`). The line is "Write the roadmap. Agents build it on your servers." and the sandbox line opens the sentence under it. A filled "Watch the film · 3 min" stands first in the button row and a play ring sits on the console frame, which is the film's poster. A byline, "Designed and built by Sebastian Rücker · Portfolio · GitHub", sits under the buttons and again in the footer. The three bracketed callouts over the frame are gone. Three points under the frame carry the chat and the board, the sandbox and the servers. Every section has 96 px above and 72 px below and every second section sits on the panel colour. Sebastian picked it on 2026-10-26 with the portfolio link kept.

## C38. The chain's steps read on the card and in the drawer's Activity (2026-11-01, Sebastian)

The pick of round 15 (`design/rounds/15-chain-steps/`), the fusion candidate, both critics' choice in the compare loop. A merged card waiting on the chain no longer says a bare stage word: the word carries its run and links the forge, `chain run 3251`, `run 3251 red`, `run 3252 stalled`, `waiting for the chain`; `blocked by roll #n` stands as it was. A done card the chain covered carries the cover clause in the elapsed slot, `live through run 3248, 25 min after merge`, and keeps its one or two lines.

The drawer's Activity tab carries the chain readout after the gates and steps tables: a section in the drawer's own idiom, a small-capitals summary, the live fact as the hint, collapsed while the chain is quiet and open when a run is red or stalled. Its rows follow the related-cards grammar: the carry run with its clock, age and verdict, the required contexts, the head of main, the repair card of a red head, the stall card, the ladder's re-run, the cover run on a done card.

The section stays after the tables and is neither pinned nor dimmed. Activity reads oldest first and the chain is the newest chapter; a pinned block fights the tab's grammar and shouts through the hours-long quiet wait; dimmed type would sink below the 4.5:1 contrast floor the style pins. The build grounds three words of the prototype: the red head's row names the repair card rather than a re-run, the re-run row is the stall ladder's own, and ages read `1 d 2 h`.

The build is 87e2350a on main of the code repository.

## C39. The thinking mark stops the turn; reasoning folds behind it; compaction rides the model's own served window (2026-11-01, Sebastian)

Amends C35. The breathing "thinking" mark is the stop control as well: it carries the name "Stop", and a press ends the thread's turn. A turn in flight ends at its next step boundary — a model call is cut at once, a tool call once the one in flight ran — and a turn still waiting, behind the thread's turn in flight or for one of the project's model slots, ends there and then. The answer so far stays as a row marked cut, a stop row names the member who pressed, and one chat_stopped event names the thread. A press with no turn to stop, or a second press on the same turn, changes nothing; a later press stops the thread's next waiting turn. Card sessions keep their doors: only the chat's own message turns can be stopped.

The reasoning a model streams beside its text (the wire's reasoning_content) folds live behind the thinking mark, under the turn, a chevron opening it. The fold keeps the reasoning's newest 16 K characters, cut at a line boundary. Reasoning is never stored and never replayed, and no thinking parameter crosses the gateway.

Compaction no longer counts rows alone. The gateway serves each model's context window, and the chat compacts when a thread's context passes 80 percent of it; the worker sets each model's session limit at 75 percent of the served window under the 200 K trust cap, on opencode's own compaction. A model that serves no window degrades as before: the chat bounds by rows, the worker keeps the trust cap. The `limits.context_tokens` knob is gone; `/compact` still runs by hand.

The build is 48fcdbc4 on main of the code repository.

## C40. Every card names its plan: a short name beside the number (2026-11-02, Sebastian)

Sebastian asked for every plan to carry a short name that says what it does, fixes or enables, so a glance at the board shows which cards belong to which plan. The layout below is the director's call, shown in the lab shots of [rounds/16-plan-names/](rounds/16-plan-names/index.html). Sebastian confirmed it on 2026-11-02 ("The design looks good, I am fine with it."), the wrap at 1440 px included.

The name. A plan gets its name when its first revision files. The small model proposes one from the issue title, the spec's outcome and the plan's summary. Code checks it: 3 to 24 characters after normalising, one line, no control or format characters, unique among the project's open plans with case ignored. A long answer brings one more ask for a shorter name, and a taken one brings an ask that lists the taken names, three asks at most. When the model fails, the name is a slug of the issue title, with a number suffix only on a clash. Naming never holds up or fails a filing. A plan keeps its first name through later revisions. The plans that were open when this landed get their names at the next start, from their newest revision.

Where it shows. The existing plan chip carries the name, with no new chip, colour or class, so C11's face grammar stands.

- A child card's chip: `from plan #558 · fix prod latency`. The name takes the slot that held the card's plan key, and the key moves to the drawer.
- The plan's own card, live or as its compact row in Done: `#558 · fix prod latency`.
- The plan approval's header: `Plan #558 · fix prod latency, revision 2`.
- The drawer's Overview: one Plan row, `#558 · fix prod latency · key`, the number linked to the issue and the key in monospace. The collapsed "The plan" section no longer repeats it on a child card.
- The find box (C13): a plain word finds the name. `plan:558` narrows to plan 558's cards, the plan's own card included, and never matches a name that only contains 558. `plan:latency` narrows by a part of the name, case ignored. An empty `plan:` matches nothing.

An unnamed plan reads as before, `from plan #558`, with no separator left hanging. In the narrow Queued and In progress columns at 1440 px the child chip wraps to two lines, as it did with the key. On the phone at 390 px it fits on one line.

The build is 993192f8 on main of the code repository.

## C41. The verdict survey leaves the cards, the project agent's judgment stays (2026-11-02, Sebastian)

Amends C24's line "its verdict buttons live on the board's escalation card, `POST /alerts/{id}/verdict` and the chat's alerts tool stay". Sebastian asked to remove the "Was this escalation a real problem?" question with its "real problem" and "noise" buttons from the escalation card and the drawer.

No card, drawer, route or access entry asks a human for an escalation verdict any more. `POST /alerts/{id}/verdict` is gone. The project agent judges an escalation with the chat's `alert_verdict` tool: it decides alone at the autonomous level, and a human confirms its proposal below that. The machine verdicts stay as they were: the supervisor's action, the screening answer and the task's outcome. An escalation nobody judged still ends `unjudged` with its task. The human intervention count, `alert_verdict_click`, counts only a verdict a human confirmed, not one the agent decided alone. Old `alert_verdict` events still render on the activity lines.

The build is 993192f8 on main of the code repository.

## C42. A press answers on the board alone: no confirmation line above the board or in a drawer (2026-11-02, Sebastian)

Sebastian asked to remove the green line above the board, such as "Approved pull request #1479; factoryd merges it.", and every line like it. The board's cards and columns show what an action did. A second report puts the same fact in two places. Where an action's result does not show, the card has to show it, not a line beside the board.

No press shows a confirmation. A button on a card or in the drawer answers with no content, and the board renders again. The card's place and state are the answer, as C31 describes. This covers every button of a card and of the drawer, among them approve, deny, an answer, fund, close, retry, replan, a plan's answers and hold-outs, the summary and the accent, Deploy now and a routine's acts. A steer and a routine act from the drawer answer the drawer's tab again, with no line above it. A steer's own message shows in the Chat tab, a GitHub token in it masked. Filing a task from New task leads to the board without the "Filed issue" line. The card shows once factoryd picks up the issue.

A refusal still shows its sentence in the flash, and a refused or lost press still returns the card to its column. The project agent's tools keep their result sentences, because the agent reads them.

The build is b76459d9 on main of the code repository.

A press that moves nothing keeps its card dimmed and locked until the board its answer asks for lands, not just until the answer (Sebastian, 2026-11-03: "Clicking waive on one criterion should visibly end at least that question in some way, like greying it out. I also dont know if my clicks worked."). That board renders even while a field on the board holds typed text, since hx-preserve keeps the text; the stream's own swaps still wait. A met or waived criterion on a criteria card reads ended: its legend in the muted grey at normal weight, its box dashed, its form gone. A criterion's text wraps inside the card, a long file::test name included. The build is eaff9edc on main of the code repository.

## C43. A token's message carries a dashed avatar and its name, and the Tokens section shows its secret once, on top, with Copy (2026-11-02, the director, provisional)

From round 17 ([design/rounds/17-chat-tokens/](rounds/17-chat-tokens/index.html)), three candidates per part built in the lab, two critics in a first loop and a compare loop. This entry is provisional, awaiting Sebastian's confirmation. The runner-up is A for both parts: the label as words only, and the block with boxes that select whole instead of Copy buttons, the form in one row.

The label. A human's message that a chat token sent keeps the human as its author. Its avatar is a dashed cyan ring around the human's initial, the human at a remove, and its who line reads `sebastian via claude-laptop`, "via" and the token's name in the muted grey. A name too long for the line ends in an ellipsis, and the tooltip "sent by the chat token <name>" holds it whole. A message the browser sent keeps the filled disc and shows nothing new. The agent's replies carry no label, though their rows store the token too. The dashed ring already marks the compaction summary row of C14, a dashed cyan ring around a faint `≡`. Three things tell the two apart: the token's ring holds the human's initial in cyan where the summary's holds `≡` in grey, the who line starts with the human's cyan name and "via" where the summary's reads "summary" in grey, and the token's text stands at full strength where the summary's is muted and smaller. Both rows say "not typed here by the human", so the shared ring fits, but it is a reuse to weigh before confirming. The label is drawn wherever the thread is read. The browser's own streamed rows never come from a token.

The Tokens section. It is the third section of the Notifications page, a table of name, project, created, expires, last used and Revoke. The project reads by its name, as in Level per project, and by its repository only when the human no longer reads it. At the desk a token's name or project longer than 24 characters ends in an ellipsis with the whole in its tooltip, so a 64-character name scrolls no width sideways. On the phone both wrap. A lamp beside the last use is lit for a token in use and unlit for one never used or expired, as C19 sets a lamp beside the state it lights for. The form that makes a token folds behind "Make a chat token" once a token exists and stands open while there is none. The answer to the form shows the block once, above Connections, so it is on the first screen at the desk and on the phone: a raised panel with C14's 2 px cyan rule at its left, the token's name and the mark "shown once", the `claude mcp add` line behind a `$` prompt with a Copy button, and the bearer under "bearer, for a script" with its own Copy button. A press puts the value on the clipboard and the button reads "Copied" for 2 s, said aloud through its live label. Where the browser refuses the clipboard, the press selects the text and the button reads "Selected" for 2 s. A click on a value also selects it whole. On the phone the token rows stack and name their fields (project, created, expires, last used), every target is 44 px, and the fold keeps its disclosure triangle.

Not taken: the token's name as a chip (it read as a co-author and sat off the who line's baseline), the block inside the table under the new row (it broke the table's rhythm and could scroll away), amber for "shown once" (amber is the factory's needs-you, and the block answers the human's own press), a lamp before the token's name (unlit there cannot say unused from expired).

Every text pair the round adds measures 4.5:1 or better in both themes: the muted "via" 7.2:1 dark and 7.0:1 light, the ring's accent 9.9:1 and 5.6:1. The cost was $0.24 of a $3 cap, eight critic calls.

## C44. A Needs-you card opens on an amber band and closes on its carousel, 12 px from the next (2026-11-03, Sebastian)

From round 18 ([design/rounds/18-needs-you-separation/](rounds/18-needs-you-separation/index.html)), three candidates built in the lab over the busy board, two critics in a first loop and a compare loop, after Sebastian's complaint that highlighted cards run together. Sebastian confirmed F on 2026-11-03. The compare loop leaned toward F: two of its four questions asked about F alone, and only F had a sheet of the whole screen. The runner-up is B: the same band with the count and arrows at its right and an 8 px gap, so the human sees the count before reading.

The card's treatment of today stays and reaches the cards: the 3 px amber bar at the left, the 4 percent amber tint in the dark theme (the light card ground is plain `--bg-card`), the border mixed 38 percent toward amber (55 percent in the light theme) and 14 px left padding. Its selector, `.lane.five #needs-you > .card`, has matched no card since the cards moved into the column's `.cards` body on 14 October 2026, so today the column's cards are plain cards. The rule becomes `.lane.five #needs-you .cards > .card`. The block's `h4` rule takes the same fix and becomes `.lane.five #needs-you .cards > .card h4`, which makes today's approval headline 16 px instead of 14 px.

The separation. The band sits behind the card's head row: `.need-top` on today's approval cards, the `h4` on a plan's approval, the face's first line (`.face > .line1`) on an escalation or a human card, and the case's head in phase 5. It is that row's own background, reaching from the 3 px bar to the right border, so its height follows the row. Its floor is 32 px at both widths, with no fixed height, so a title that wraps grows the band and never has the band cut through it. The band is the amber mixed 14 percent into the card ground in the dark theme and 22 percent in the light one, ruled off from the case by a hairline of the amber at 40 percent (60 percent light). In the head row the ref is `--need-text`, bold, and the waiting time `--text-muted`, not the faint grey `.since` has elsewhere. The band marks where a card starts. The gap between two cards grows from 6 px to 12 px and marks where a card ends.

The values a builder needs, as [design/prototypes/needs-you-separation/F.css](prototypes/needs-you-separation/F.css) and its `base.css` set them: the card's `padding-top: 0` and `margin-bottom: 12px`. The head row's `min-height: 32px`, `margin: 0 -8px 6px -11px` and `padding: 6px 8px 6px 11px`, so the band starts 3 px inside the card's left edge and the bar shows, ends at the right border, and leaves 6 px before the title. The carousel row's `margin-top: 6px`, `padding-top: 4px` and its hairline as `border-top`. Every rule in both files is scoped to the five-lane board, `.lane.five`.

The carousel. A card with more than one open case ends on its carousel: the last row, under a hairline of the amber mixed 35 percent into the line colour, at the right, one unit of the previous arrow, the count `1 of 4` in mono and the next arrow. The arrows are 24 px at the desk and 44 px on the phone. The count says where the human is among all the card's open cases, so `1 of 4` is the case in view and three others: section 5.8's "a count of the card's other open cases" in another form. A card with one open case shows neither the count nor the arrows. The carousel comes after the case and its answers, where the human moves on, and keeps the band clear on the phone. The five parts of the card flow redesign's section 5.8 sit between the band and the carousel, in their order.

Not taken: the gap alone at 16 px (A, the start of a card stayed unmarked), the carousel in the band (B, the runner-up, its 44 px arrows crowd the band on the phone and come before the case is read), a frame in the full `--need-line` with the arrows at the two ends of the foot (C, loud beside Send, the split arrows read as two loose controls), and the selector fixed with nothing else (base, its border measures 2.6:1 dark and 1.6:1 light against the column).

The band's text measures 7.8:1 dark and 5.6:1 light for the ref, 5.0:1 and 6.6:1 for the waiting time. The 3 px bar measures 2.0:1 against the card in the light theme, under the 3:1 of a line that carries a state. The column's head carries the state too, so the bar stays as it is. The cost was $0.12 of a $3 cap, four critic calls.

## C45. Each criterion is a row on the merge card of a plan's integration card, and a human settles the human ones (2026-11-03, Sebastian)

Amends C42's criteria card: its rows stand on the merge card of a plan's integration or delta card too. From Sebastian's decision of 2026-11-03, human criteria are settled one row each on the Needs you card, before the merge.

Each row, in plan order, is a `fieldset.question` with the legend `<id> (<kind>): <verdict>`. A gate row's met carries ` (blind)` or ` (open)`, and a judgement row carries the model's reason. A human row shows its claim and the artifact as `pre.artifact`, wrapping, at most 16em high, the first 8 KiB with a line that says so, under `<name> at <head>`, or the line `Evidence: <evidence>`, and the presses Met, Not met and Waive. Every other open row shows Waive. A met or waived row reads ended, as C42 says. Approve is gone until every criterion has a verdict, and a line names the open ones.

The drawer heads an opened proof `<criterion>: <path>, changed|unchanged|not in the pull request`, with the original and, when changed, the repository's version beside it in `pre.proof`, at most 24em high. C44's band and carousel stay.

No design round judged the look, and the rows reuse C42's markup.

The build is 14393e5c on main of the code repository.

## C46. A card reads as one paragraph: the title runs into its why line, one mono foot line holds the state, the place and the number, and the opened card reads like a page (2026-11-16, Sebastian)

From round 19 ([design/rounds/19-card-layers/](rounds/19-card-layers/index.html)), four directions drawn by two image models at 1280 px in the dark theme and at 390 px in the light theme, judged by two critics in a first loop and a compare loop. Sebastian picked C, one paragraph, on 2026-11-16. Both critics ranked A, the stack, first and C second in every loop, and the director recommended A. The pick stands. The frames that follow C best are [C-desk-board-nano.jpg](rounds/19-card-layers/C-desk-board-nano.jpg) and [C-phone-board-nano.jpg](rounds/19-card-layers/C-phone-board-nano.jpg) for the board, and [C-desk-open-gpt.jpg](rounds/19-card-layers/C-desk-open-gpt.jpg) and [C-phone-open-gpt.jpg](rounds/19-card-layers/C-phone-open-gpt.jpg) for the opened card. Where a frame and this entry differ, this entry holds.

This amends C11. C11's state word with its dot and the card's one time, its age, stay on the face. The face now also carries a why line and the card's place. C11's Status line goes with the drawer's old header: the opened card's head holds the state and the time, and "The card's life" holds the time in each stage. C40's naming stands, and the plan chip becomes the place in the foot line. C44's band, gap and carousel stand. C16's ghost stands and takes the paragraph form.

**The paragraph.** A small card has no top row. It opens with one paragraph: the title in 13 px at weight 600 in `--text`, then the why line in the same paragraph in 13 px at weight 400 in `--text-muted`. The face adds a full stop after a title that ends without a full stop, a question mark or an exclamation mark, so the two read as two sentences. No label such as "Why:" or "Plan:" stands before any text. The text wraps and is never cut, and a long word or a URL breaks inside the card. A card without a why line, such as a human's bare issue, shows its title alone and leaves no empty line. The card's border, padding and left rule stay as the theme sets them.

**The foot line.** One line 6 px under the paragraph, with no hairline, in mono 11 px in `--text-faint`. Its items, split by " · ", in this order: the state dot and the state word in the state's hue with the card's one time, the place, the card's number, and then only when they apply: the waits clause, "brief not checked" in `--need-text`, and the card's colour as a dot in its `--acc-*` hue with its name. A separator trails its item, so a wrapped line never starts with a dot. In the Queued column at 1280 px the foot wraps to two lines, as the frames show.

- The place of a card of a plan is the plan's name and the card's position, `criteria gate 1/3`, the name a link that opens the plan's card. A plan's own card reads `plan one face, 5 cards`. A card a routine filed reads `↻` and the routine's name. Any other card has no place item.
- The card's own number is plain text, not a link: a press anywhere on the card opens it (C7).
- Every other `#N` on a face is a link to its card and names the target's title and state after it in brackets, in the colour of the text around it. The frames drew bare numbers.

What the foot line holds per state:

- **Queued.** `● queued 2 h · criteria gate 1/3 · #2100`. A card that waits for another card adds the waits clause: `● queued 2 h · criteria gate 3/3 · #2102 · waits for #2101 (Change two lines in the runner's build files, needs you)`. The frame dropped #2102's own number for the clause. The number stays. A card that waits for capacity reads `waits for its turn to start`, with the count when the factory knows it: `waits for its turn to start, 2 ahead (7 running)` (amended, see the end of this entry).
- **In progress.** `● building 12 min · quiet inbox 2/4 · #2099`, the dot breathing as C6 sets. The state word is the stage, planning, building or verifying (C8), or C38's chain words. While a helper task runs for the card, it reads `sizing`, `screening` or `writing the proofs`. After the time come only the marks of an exceptional state: `3/4 checks` while verifying, "⚠ near its budget" from 80 percent of the budget, and retrying, held, on the provider or stale, these in `--need-text`.
- **Done.** The paragraph holds the title alone, in 13 px at weight 400 in `--text-muted`, with no why line. The foot has no dot: `closed · 1 h 40 min · #2011`, the state word in its quiet hue (closed `--st-closed`, done `--st-done`, failed `--failed-quiet`), the time the total of all runs (C10), the place before the number for a card of a plan. A failed card's state word names the failure in one clause, such as `failed: the checks stayed red`. On a done card the chain covered, C38's cover clause takes the time's place. A Done card has no button: Retry and Close leave the face, and a failed card is tried again by an answer on its opened card.

**A card in Needs you.** C44's chrome stays: the 3 px amber bar, the tint, the band behind the head row, the carousel at the foot and 12 px to the next card. The band holds the number in `--need-text` at weight 600 at the left, the place after it in mono 11 px in `--text-muted` when the card has one, and the waiting time, C11's one time, in `--text-muted` at the right. A card in Needs you has no foot line. Then one paragraph: the ask, which is the card's title, in 16 px at weight 600 in `--text`, the theme's Needs-you headline (the frames drew 15 px), and the why line run on after it in 13 px at weight 400 in `--text-muted`. On a card whose pages are the parts of one ask, a line under the paragraph names the part in view, in 13 px in `--text-muted`: "Promise: every card that asks shows one decision block."

Then the answer row. At its left the suggested answer is a compact button: the amber fill `--need` with its label in `--need-ink` at weight 600, as wide as its label, 32 px high at the desk. At the button's right stand two lines in 12 px. The first names who suggests the answer, in `--text-faint`: "project agent's pick", "planner's pick". The second is "or 1 other ›", with "1 other ›" a link in `--accent`. The count is the number of the other answers on the page in view, 1 to 3, as "or 2 others ›". It does not count "Other actions". The link opens the card with its ask block in view. When the row has no room for the two lines beside the button, they wrap under it. A press on the button sends the answer at once (C31, C42). When the suggested answer needs a field, such as a required note or an amount, the small card holds no button: the answer's label stands in its place in 13 px at weight 600 in `--text`, as a link that opens the card with that answer pressed.

The carousel row `‹ 1 of 5 ›` closes the card under its hairline, at the right as C44 sets. The frames drew it centred. A human's work card in Needs you has the same face: "Change two lines in the runner's build files." with its why line run on, then "I did it", "planner's pick" and "or 2 others ›", and no carousel.

**The routine ghost.** C16's ghost stays under Queued: a 1 px dashed border in `--btn-line`, no fill, every text in `--text-faint`. One paragraph: `↻` and the routine's title at weight 600, then the why line from the routine file at weight 400: "↻ Update the dependencies. So security fixes reach the factory within a week." A mono foot line holds the schedule, the next run and the last run: `every Monday 06:00 · in 20 min · last run #781`, with the reference rule above for #781, a run under an hour away in `--text` and a held run in `--need-text` (C16). The ghost holds no button: its acts stand on the routine's opened card (amended, see the end of this entry).

**The opened card.** The drawer's Overview tab is the opened card. The drawer keeps its slot, `min(46%, 720px)` over the board at the desk and the whole screen on the phone. The tabs stay: Overview, Chat, Activity and Files, the open tab underlined in `--accent`. The opened card reads like a page: no panel and no box, only hairlines in `--line` between its parts. Its parts, in this order, each only when it has content:

1. **The head.** The title in 20 px at weight 600 in `--text`. Under it the why line as a lead paragraph in 16 px at weight 400 in `--text-muted` (the frames drew 15 px). Then one mono line in 12 px in `--text-faint`, in the small card's order: the state dot and word in the state's hue with the one time, the place in words, the number, the waits clause and an open pull request. `● needs you 3 h · plan one face, 5 cards, all ended · #1850`, or `● queued 2 h · plan criteria gate, card 3 of 3 · #2102 · waits for #2101 (Change two lines in the runner's build files, needs you)`. Here the number links the card's issue, the card's one issue link, and an open pull request reads `pull request #612` as its link.
2. **The ask block,** on a card that holds an open ask. A hairline, then the label row: "Your call" in small capitals in `--need-text`, 11 px, and on a card with pages the page's noun and its place, "Your call · promise 1 of 5", with C44's ‹ and › at the right. Then the part the page is about, when it has one, in 16 px at weight 600 in `--text`: "Every card that asks shows one decision block." Then the story in 14 px in `--text-muted`: what was planned, what happened and what is left, each only when it has content. Then the answers, at most four, the suggested answer first. "suggested by the project agent" stands above it in 12 px in `--text-faint`, with the grounds after it in one clause when the register gives them. Each answer is a button with its effect line beside it at the right, in 12 px in `--text-muted`. All answer buttons have one width. The suggested answer is the large amber fill, `--need` with its label in `--need-ink` at weight 600, 40 px high. Every other answer is a quiet button with a 1 px outline in `--btn-line` and its label in `--text`, 36 px high.
3. **The press.** A press on an answer without fields sends it at once (C31, C42). A press on an answer with fields gives its button a 1 px outline in `--need` and opens its fields under it, with their defaults filled in. A required note has no default and shows a hint that says what to write: "Say why this promise can go." One Send, an amber fill as wide as the answer buttons, stands under the open fields and posts the answer, its fields and its note together. A press on another answer closes the open fields, and they post nothing. A human who may not answer sees the part, the story and one line that names who can answer, and no button.
4. **The summary.** A hairline, then the stored summary in 14 px in `--text`.
5. **The folds,** all closed when the card opens. A plain list: each fold is one row with ▸, its label in 13 px in `--text` and a hint right-aligned in 12 px in `--text-faint`, with hairlines between the rows and no box. In this order:
   - "The agent's view": the exact text the card's agent gets (amended, see the end of this entry).
   - "The full brief". For a work card: the full text, the steps, the acceptance items, the criteria they cite and the cards it depends on. For a card that asks: the evidence, such as the findings, the money in figures, the review and the audit. Hint: "5 promises and the evidence".
   - "The plan", on a card of a plan: the plan's outcome, its cards with this card marked, a link to the plan's section in its document and a link that opens the plan's card. Hint: "one face · 5 cards · 4 merged, 1 closed".
   - "The card's life": C10's runs with their notes, the agent's summary of each session, the spend against the budget, the model and the helper tasks as steps. Hint: "3 h waiting · no session".
   - "What each session got": one closed fold per session with the exact text the session got. Hint: "no session yet" while none ran.
   - "Other actions", on every card: the other legal answers of the ask, or for a card without an ask the card's own actions, each a quiet button with its effect line, in the ask block's shape. Hint: the first label and the count of the rest, "End the card, and 1 more".

A card without an ask, a Done card among them, shows the head, the summary and the folds. The small card holds at most 300 characters of prose, the opened card at most 900 above its folds.

**The phone, at 390 px.** The board is one column of sections, Needs you first, then In progress, Queued and Done, with the cards full width. The small cards keep their layout. The compact button is 44 px high, and the count link and the carousel arrows are 44 px targets. The foot line wraps. Nothing scrolls sideways. The opened card takes the screen under a bar with "‹ Board" at the left and × at the right, then the tabs. Each answer button is 44 px high, with its effect line beside it while both fit and under it when they do not. Send and the fields are full width and 44 px high. Each fold row is 44 px high, and a long hint wraps at the right.

**What goes.** The work card's top row, the activity line and the chips (the plan chip, blocked by, waiting on, ↻ routine and the colour) leave the face: their facts move into the foot line and into "The card's life". Retry and Close leave the finished cards. The drawer's header with its facts row, its top block (Task, Status, Budget, Agent) and the standing sections Time, Objective, The agent's summary, The plan, Reviews and audit, Related cards, Edit and Links give way to the opened card's head and folds. The note box and the fund field stand only under the answer that needs them.

Not taken: A, the stack (each layer on its own line under a top row of number and state, a full-width amber button, the critics' first), B, the plan rail (a segmented rail on every work card and a split button "+1", which both critics found unclear), and D, the labelled rows (a faint label before each line, which made every card speak and took width from Queued).

Every text pair uses the theme's tokens. The faintest, `--text-faint` for "project agent's pick" on a Needs-you card, measures 4.7:1 in the dark theme and 5.3:1 in the light theme. The round cost an estimated $8.44 of a $10 cap.

Amended on 2026-11-17, when the cards were built by [the plan](../docs/plans/2026-11-16-every-card-readable.md), in five points:

- A card that waits for capacity read `waits for a free slot`. The plan's face contract keeps the factory's own words off every face, "slot" among them, so the clause reads `waits for its turn to start`, with the count when the factory knows it.
- The routine ghost had two buttons, Skip once and Run now. Sebastian ruled on 2026-11-16 that every small card offers one action at a time, so the ghost follows the one-button rule of every other small card. None of its three acts is a suggested answer, so the ghost holds no button. "Skip the next run", "Give it to me" and "Run it now" stand on the routine's opened card, each with its effect line. This amends C16, which put Skip once and Run now on the ghost.
- "The agent's view" was to hold the project agent's analysis of an ask. It holds the exact text the card's agent gets, built from the same brief as the card, because Sebastian asked to see on the card what the agent that builds it sees. The analysis stands in "The full brief" with the ask's evidence, and a suggestion's grounds stand above the suggested answer.
- The tabs named above read Overview, Chat, Activity and Files. The drawer keeps the five tabs it had: Overview, Session, Activity, Files and Receipt. The Session tab shows the running session and takes no message: a message to a running session is "Tell the running session" under Other actions, and a thread with the project agent opens from "Talk about this card".
- Money read `€61.40 / €120.00` in the status strip and `€1.08` in the Time hint. Every amount the factory prints now goes through one function: two decimals, the unit after the number, `61.40 of 120.00 EUR` and `1.08 EUR`. An amount above zero and below a cent reads `less than 0.01 EUR`. A price per line or per hour keeps four decimals, `0.0200 EUR`. The euro sign and the EUR unit had both stood in the factory's texts, and the plan's contract wants one way.

## C47. A human resets a cap's count from the status panel at any time; the strip always shows the day and the month, and any other limit only once it is hit (2026-11-20, Sebastian)

From round 20 ([design/rounds/20-cap-reset/](rounds/20-cap-reset/index.html)), four candidates built in the console lab, two critics in a first loop and a compare loop. Sebastian picked A2, the press in the panel, on 2026-11-20, with three changes: the press reads "Reset", it stands on every cap's row at any time, and the strip always shows the day and the month. The reference is [reference.png](rounds/20-cap-reset/reference.png). Where it and this entry differ, this entry holds: the reference says "Start today over" and shows the press only on a hit row.

**The press.** "Reset" restarts the count of one cap from the press on: the day cap (`budget.day_eur`), the factory's month cap (`budget.month_eur`) or a project's month cap (`budget.month_eur` in its file). The cap in the policy does not change. The gateway enforces each cap against the spend booked since the newest reset in the cap's UTC period, so a reset is enforced in code, outside any model. The premium cap, the judgment budget and the escalation pool have no Reset.

**Its place.** Under each cap's row in the panel's Spend section stands a button "Reset", 24 px high at the desk and 44 px on the phone. On a calm or amber row it is quiet, a 1 px outline in `--btn-line`. On a hit row its outline and label take `--st-failed`. The strip holds no press: its cells open the panel, as C25 sets.

**The check.** A press on Reset opens the confirm inline under the row and posts nothing. The confirm says what the count becomes, the most that may still run before the period turns, and what stays: "Today's count starts again from 0.00 EUR. Up to 100.00 EUR more may be spent before 00:00 UTC, in 9 h 58 min. The day cap stays 100.00 EUR; the month cap still holds." The confirm button is filled `--accent` and names the money: "Reset: up to 100.00 EUR more". Cancel is quiet. When LiteLLM's backstop leaves less than the cap, the sentence names the backstop's figure and says so: "LiteLLM's backstop leaves 636.41 USD this month."

**Who may press.** The day cap and the factory's month cap: a human who writes the factory's code. A project's month cap: an approver of that project. Nobody else sees the button. No agent can reset: the chat, the MCP door and the ladder's rungs have no tool for it, and the form refuses a session that is not a human's. Agents read the resets.

**The trace.** Until the period turns, the strip's day or month cell shows ↺ before its label, and its title names who reset it, when, and the spend before. Under the row, the panel shows one line in `--text-muted`: "counted since 14:02 UTC, when sebastian reset today · 19.62 EUR before · 19.62 EUR in all today". The costs page lists every reset in its window. A card that waits on a cap says: "Reset today's count in the status panel to resume it sooner, or it resumes at 00:00 UTC."

**The strip.** The day cell and the month cell always show: amber from 80 percent, red once the cap is hit. A cap is hit when the gateway refused a call at it since the period began or since the newest reset, or when its count reaches the cap. Any other limit shows on the strip only once it is hit, as one alert cell in `--st-failed`: the premium cap, the judgment budget, the escalation pool drawn out, and LiteLLM's backstop. The pool's standing words leave the strip for the panel. The strip stays one slim row at the desk and wraps at 390 px as it does today.

**The backstop.** LiteLLM's proxy-wide `max_budget` (1,875 USD a month on 2026-11-20) stays the absolute monthly limit, and no reset passes it. The panel shows it as its own row with its gauge, read from LiteLLM: "LiteLLM backstop 1238.59 of 1875.00 USD". A human raises it by a commit in the infrastructure repository.

**The caps.** The day cap went to 100 EUR on 2026-11-20. The month cap goes to 800 EUR with the build of Reset, so the month's count of November can be reset at once.

Not taken: B, lift the day cap until 00:00 UTC (only the month cap bounds the day), C, allow an amount (a number at the moment the owner wants none), and D2, the press on the strip (it makes the read-only strip a control and crowds it at 390 px).

Amended by C49 (2026-11-24): the premium cap has a Reset, each Reset stands left of its gauge on the gauge's line, and each row's label says when its count resets by itself. The times in this entry's examples read in the human's own zone, as C49 sets: "before 01:00 CET", "counted since 15:02 CET".

## C48. "Give more room" sets its count with five buttons and shows time and money as a table of left, adds and then (2026-11-21, the director, provisional)

From round 21 ([design/rounds/21-card-room/](rounds/21-card-room/index.html)), four candidates built in the console lab, two critics in a first loop and a compare loop. The pick is D2, the round's recommendation. Sebastian named no pick and said "carry on" on 2026-11-21, so the recommendation stands as a provisional pick, and his own pick overrides it. The runner-up is A2: a stepper, and the readout as rows with a short label at their left.

**The count.** Five buttons in one row, 1 to 5, under the label "Sessions' worth". One press sets any count. They are radios named `extend.sessions`, one of them always chosen, so the arrow keys move along them and a blank count cannot be sent. The chosen button takes C46's pressed outline in `--need` with a light amber fill, and a button in focus takes the 2 px ring in `--focus`. The buttons are 32 px high at the desk. At 390 px the row fills the width and each button is 44 px high. One session's worth stands beside them, from the server: "Each is about 14 min and 1.20 EUR, from its 3 sessions so far.", or before the first session "Each is about 15 min and 0.80 EUR, the policy's estimate before its first session."

**The readout.** Agent time and money form a table with the columns left, adds and then. The headers are small capitals in `--text-faint`, 5.2:1 in the dark theme and 5.5:1 in the light theme on the drawer. The figures are mono and right-aligned. What is left reads in `--text-muted`, the add in bold `--text`, and what the card then has in `--text`. A figure of 0 or below reads "none". When the press adds nothing, the adds cell says why in the interface font: "enough", or "left out" for money the human leaves out. "Then" equals what is left in both cases. The server writes every cell, and it writes the readout again on every change of the count or the tick.

**The tick.** The money row's first cell is the tick, labelled "Money", a 44 px target on the phone. It is set when the card lacks money for the count and clear when the money is enough, and it follows the count until the human touches it. Once touched, it keeps the human's state. The server draws it in the readout, so the focus stays on it.

**The spend limit and the starts.** The spend limit is not a row of the table, because its figure is a limit, not what is left. When it rises it is the first line under the table, in `--text`: "The spend limit rises from 8.00 to 8.70 EUR first." The starts follow in `--text-muted`, only when they rise: "It may also start 3 more sessions." The project's money left this month comes last, in `--text-faint`. A press that the card cannot take shows the refusal in place of the table, with the tick under it.

**The chat's budget ask.** "Add money to the chat" opens the same table with one row, Money: what the chat has left, the EUR field in the adds column ("adds, EUR"), and what the chat then has, which the server writes again as the human types. The project's month line stands under it.

**Where it shows.** Among the opened card's "Other actions" on every live agent card, and as the answer on every ask about a card's resources: the session cap, the agent time cap, the money stop, the check-in's share, the repeated findings, the gate stop after a refused review, and a question of the agent's that waits at one of these caps. A proposal opens the control at its count and its tick, marked with who proposes it.

**What stays.** The answer's label, its effect line and the one amber Send. The fields only after the press. The guard of the room the readout showed, the readout's route and the refusal of a press whose readout moved.

Not taken: A2, the stepper (5 takes four presses, and its figures stand inside sentences), B, the readout as sentences (its five buttons went into D2), C, one sentence with the count as a choice inside (its paragraph hides the figures), and D, a number field (B's buttons replaced it), with the spend limit as a table row (its "left" cell held a limit).

## C49. The premium cap has a Reset, each Reset stands left of its gauge, and each Spend row says when its count resets by itself (2026-11-24, Sebastian)

Sebastian asked for these three changes on 2026-11-24, in words, with no round. The entry amends C47's parts "The press", "Its place" and "Who may press". The rest of C47 holds.

**The press.** The premium cap (`budget.premium_month_eur`) has a Reset as the day cap and the month cap have. The gateway counts the premium spend since the newest premium reset in the UTC month. The premium cap stops no card: at the cap a premium call runs on `big`, so a reset brings premium calls back and wakes no card. The judgment budget and the escalation pool still have no Reset.

**Its place.** On each cap's row the button "Reset" stands at the start of the gauge's line, with the gauge right beside it, at the desk and on the phone. It keeps its 24 px height at the desk and 44 px on the phone, and its colours. The confirm opens under the row, above the reset's trace line.

**Who may press.** The premium cap: a human who writes the factory's code, as for the day cap.

**The time.** The labels "today", "this month", "premium this month", "LiteLLM backstop" and a project's month row end in the moment their count resets by itself, to the minute, in `--text-muted`: "today (resets 25 November at 01:00 CET)". The day and the months turn where the gateway turns them. The backstop's time is LiteLLM's own `budget_reset_at`, and the row shows no time when LiteLLM gives none. Where the label, the time and the figure do not fit one line, the time goes under the label.

**The zone.** Every time a console screen shows a human reads in the zone of the human's browser, and in Europe/Berlin (CET, CEST in summer) where the browser's zone is not known. The text names the zone by its short name. The periods still turn at 00:00 UTC, so the day's count resets at 01:00 CET. Text that no browser shows stays in UTC: issue comments, commit statuses, logs and the text that agents read.

Why: the button on the gauge's line saves a line per cap and shows which count it resets. The time answers "how long must I wait" without a press on Reset.

## C50. The hold's acts stand on the opened card under its head, outside the folds (2026-11-24, Sebastian)

Sebastian asked for this on 2026-11-24, in words, with no round: "It does not need to be on the card, but I want to see it on the expanded section without further digging for it." The entry amends C46's opened card. The rest of C46 holds.

**The part.** The opened card gets a part between the ask block and the summary: the hold. It holds the hold's acts the card offers, each a quiet button with its effect line in the ask block's shape: "Put on hold" on a card that takes a hold, and on a held card "Release the hold" first, then "Hold again". A hairline in `--line` stands above it, as above every part. A card that takes no hold and has none shows no hold part.

**The fold.** "Other actions" no longer holds the hold's acts, and its hint no longer counts them. A running card's hint reads "Send back to the planner, and 6 more" where it read "and 7 more".

**The small card** on the board stays as C46 sets it: it offers no hold.

Why: the hold is the act a human reaches for while sorting the board, and C46 closed it inside a fold whose hint named only its first act, so a human who looked for it did not find it.

