# The shared information architecture

One markup for every skin. A skin changes tokens and layout through CSS and never the markup, so every version keeps every control of [inventory.md](inventory.md). The decisions behind each part are the C-entries of [design-decisions.md](design-decisions.md), named in brackets.

## The principle

Two regions in order of weight: the chat is where a human acts, and the board is where the state of each card is scanned. The status strip above them says whether anything needs a human (C20, C25). Normal states whisper, exceptional states speak. There is one detail view, the opened card in the drawer. Nothing is shown twice.

## The screen at 1200 px and wider

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Factory console  [ai-software-factory-code ▾]  New task  Costs Metrics …     │ top bar, quiet
├──────────────────────────────────────────────────────────────────────────────┤
│ ● waiting on you │ 2 working │ 2 need you │ €61.40 / €120.00 │ GitHub 1 open │ status strip
├─────────────────────────────────┬────────────────────────────────────────────┤
│ CHAT  project agent · New       │ BOARD  find…  Documents  ↻ routines ▾  ?   │
│                                 │ NEEDS YOU 2  QUEUED 3  IN PROGRESS 1  DONE │
│  agent: …                       │ ┌──────────┐ ┌────────┐ ┌────────┐ ┌─────┐ │
│  you: …                         │ │#1850  3 h│ │Narrow …│ │Fold …  │ │Route│ │
│  proposal  [Do it] [Skip]       │ │Plan "one…│ │So a …  │ │So the …│ │the …│ │
│                                 │ │[Run …]  ›│ │● queued│ │● build…│ │done │ │
│                                 │ └──────────┘ └────────┘ └────────┘ └─────┘ │
│ ┌─────────────────────────────┐ │              ┌──── drawer ─────────────┐   │
│ │ Ask or tell the project…    │ │              │ the opened card, docked │   │
│ └──────────────────────── Send┘ │              │ over the board          │   │
└─────────────────────────────────┴──────────────┴─────────────────────────┴───┘
```

- **Top bar.** One quiet row (C23's styling, C24's destinations). The home word opens the board, so Board is not a destination. Then the project switch as a select, which reloads the page on change, New task bordered, the figures group (Costs, Metrics, Resources), the running group (Settings, Policy, Notifications), the theme selector (moon and sun, C15), the user and Log out. The find box and the keys button are board controls and sit in the board's own header.
- **Status strip.** One thin row of cells split by hairlines (C20): the state word with its dot, n working, n waiting on the provider when any, n need you in amber as a link to Needs you, the month's spend against its cap with its gauge as a link to Costs, a routine's run when it is under an hour away or held (C16), and GitHub. A click opens the status panel under the strip (C25): the working cards, the cards that need a human, the spend today and this month as two gauges, the provider state, the GitHub pull requests and the configuration version with its infra commit (C9). Escape or a second click closes it.
- **Chat, the main region.** Left, 44 percent of the width, a raised panel. Header: "Chat", "project agent · project", New. The threads (C14) are a table at the chat's left: the inbox first, the active threads by last turn, the archived ones last with restore. The open thread is marked, a thread with a turn in flight carries a working mark, and a thread with turns not yet seen carries an unread count, with the sum in the tab title. The table folds to its marks and keeps the counts and the dots in view. On the phone the fold leaves one summary row with the counts. The open thread's head holds its title, its time, Archive and Delete…, neither on the inbox nor on an archived thread. The log has a reading width of at most 72 characters. The newest unanswered ask of the agent carries an answer row (C26): a press sends the choice at once as the human's message, and any later row settles the ask. A human's row can carry image thumbnails, each a link to the full image (C27). A row that a chat token sent keeps the human as its author: the avatar is a dashed ring around the initial, and the who line reads "sebastian via claude-laptop", the token's name in the muted grey and cut by an ellipsis when too long (C43). The composer at the foot holds a three-row box and Send. Paste and drop collect pending images as chips above the box, each with the picture, the name img1 and × to remove it, and nothing uploads until Send. The "/" palette with `/compact` and `/new` opens above the box, the two also stand as chips under it, and the level control sits under Send at the right. Tool calls fold (C35). A proposal is a card with Do it as the primary button and Skip as the quiet one. The inbox is the one thread the agent speaks in uninvited: pokes are its turns, with choices as buttons and a decider line when the agent acted alone.
- **Board, the quiet region.** Right, the rest of the width. Its header row: "Board", the find box (C13), Documents (C17), "↻ routines ▾" (C16) and the keys button. In the find box a word matches what the face says, and a `key:value` term matches a fact behind it, such as `plan:558`, `stage:verifying`, `is:failed` or `by:sebastian`. Enter submits it as `?q=`, × clears it and `f` focuses it. Four columns (C8): Needs you, Queued, In progress and Done. They are the one board, and there is no wide view. Each head shows the column's name in small capitals and its count, which reads "2 of 5" when a find or a show narrows the column. A ▾ at the head's right of Queued, In progress and Done opens the column's orders and shows (C13). A column in another order or with a show says so in a line under its head, with × back. Every column holds its cards newest first, except Needs you, which holds the longest wait first. The find and the menus live in the URL beside the project, so the poll, the card fragments and the stream follow them. The strip and the status panel stay the project's. Needs you is the first column, with its own fill, rule and header, so it is the loudest thing on the board, and it stays a column, never a tray or a band across the top (C4). Helper tasks (screening, sizing, the proofs) have no card of their own: each is a step of its parent card, in its state word and in its life.
- **Drawer.** Docks at the right edge, 46 percent of the width and at most 720 px, over the board and never over the chat. It holds the opened card or one document (C17). Escape closes it.
- **Secondary pages** keep the shell and hold the 62 rem measure (C29).

## The small card (C46)

Every card answers three questions: what it is, why it exists and where it stands. The small card answers them in short, and the opened card holds the rest. A press anywhere on the card opens it (C7), for every human. A button on the face acts without opening it. Sizes, weights and colours are in C46.

A work card, in Queued or In progress, has no top row:

1. **One paragraph.** The title, the work in plain words and never cut, then the why line, one sentence on why the work exists. A human's bare issue may have no why line, and then the title stands alone.
2. **One foot line.** The state word with its dot and the card's one time (C11), the place, the card's number. The place is the plan's name and the card's position (`criteria gate 1/3`), a plan's own size (`plan one face, 5 cards`) or `↻` and the name of the routine that filed the card. Then only what applies: what the card waits for (`waits for #2101 (Change two lines in the runner's build files, needs you)`, or `waits for its turn to start, 2 ahead (7 running)`), "brief not checked", and the card's colour. In In progress the state word is the stage (planning, building, verifying, C8), C38's chain words, or sizing, screening or writing the proofs while a helper task runs. After the time come only the marks of an exceptional state: checks while verifying, near its budget, retrying, held, on the provider, stale.

A card in Needs you holds an open ask and stands in C44's chrome:

1. **The band.** The number, the place and the waiting time.
2. **One paragraph.** The ask as the title, then the why line: why the question came up and what waiting costs.
3. **The part in view,** on a card whose pages are the parts of one ask: "Promise: every card that asks shows one decision block."
4. **The answer row.** The suggested answer as one compact button. Beside it, who suggests it ("project agent's pick") and the count of the other answers as a link ("or 2 others ›") that opens the card at its ask. When the suggested answer needs a field, its label is a link that opens the card with that answer pressed, and no button stands.
5. **The carousel** at the foot, when the card has more than one page (C44).

Every item in Needs you is such a card: a merge, a plan's question, a promise of a plan, a card out of sessions or money, a human's work card, a flag. Each kind's ask, why line, story and answers come from one register in the code, one entry per kind, and each answer's label comes from one vocabulary. No kind has a layout of its own. An ask shows one question and 2 to 4 answers, so a human can always refuse or defer.

A Done card (done, failed or closed) holds its title alone, then a foot line without a dot: the state word in its quiet hue, the total time of all runs (C10), the place and the number. A failed card's state word names the failure in one clause. On a done card the chain covered, C38's cover clause takes the time's place. A Done card has no why line and no button.

The routine ghost (C16) stands at the foot of Queued: one paragraph with `↻`, the title and the why line from the routine file, and a foot line with the schedule, the next run and the last run. It holds no button. "Skip the next run", "Give it to me" and "Run it now" stand on the routine's opened card (C46).

Every small card holds at most 300 characters of prose, no field and at most one button. Every `#N` on it, other than the card's own number, is a link that names its target's title and state.

## The opened card (C46)

The drawer's tabs are Overview, Session, Activity, Files and Receipt. Session is the default on a running card, Overview otherwise. On the phone a bar with "‹ Board" and × stands above the tabs.

Overview is the opened card. It reads like a page, its parts split by hairlines, each part only when it has content:

1. **The head.** The title, then the why line as a lead paragraph, then one mono line: the state word with its dot and the one time, the place in words (`plan criteria gate, card 3 of 3`), the number as the card's one issue link, what it waits for and an open pull request as its link.
2. **The ask block,** on a card with an open ask. "Your call" with the page's place and the carousel's arrows ("Your call · promise 1 of 5"), the question, its why line and the part in view. Then the story: what was planned, what happened, what is left, and a writer's view that names its writer. Then each answer as a button with its effect line beside it, the suggested answer first and large, with who suggests it and the grounds above it. An answer without fields sends at once (C31, C42). An answer with fields opens them under it with their defaults filled in, and one Send posts the answer, its fields and its note together. A press on another answer closes the open fields, and they post nothing. A human who may not answer sees the question, the story and one line that names who can answer.
3. **The summary.** What gets built, what it changes for whom, how it is checked.
4. **The folds,** all closed, each one row with its hint at the right:
   - **A writer's own words,** when the words of an ask's writer are too long for the story: the whole text in a fold named for its writer, such as "The agent's own words", or "The promise in the plan's words" for an old plan's long promise. Above the folds the ask keeps its short question and one line that says the words are below.
   - **The agent's view.** The exact text the card's agent gets, built from the same brief as the card.
   - **The full brief.** For a work card the full text, the steps, the acceptance items, the criteria they cite and the cards it depends on. For a card that asks, the evidence: what the factory knows with the project agent's analysis, the open findings, why the suggestion's writer suggests it, the money in figures, the review and the audit.
   - **The plan,** on a card of a plan: the plan's outcome, its cards with this one marked, a link to the plan's section and a link that opens the plan's card.
   - **The card's life.** How the card's life went (C10): one row per run of a stage with its start, its duration, its cost and the note that ended it, the agent's summary of each session, the spend against the budget, the model and the helper tasks as steps.
   - **What each session got.** One closed fold per session with the exact text the session got.
   - **Other actions,** on every card: the other answers that hold for the ask, or for a card without an ask its own actions (send back to the planner, allow more sessions, tell the running session, edit the brief, colour, talk about this card), each with its effect line.
   - **What these words mean,** when a face uses a word of the factory, such as session or hold-out: one plain sentence per word. The face marks the word at its first use.

A card without an ask, a Done card among them, shows the head, the summary and the folds. At most 900 characters of prose stand above the folds. No form stands open before a press: the note box and the money field open under the answer that needs them.

Session shows the newest session's agent text and the messages a human sent it. It has no message box: a human writes to a running session through "Tell the running session" under Other actions, the console's one way to steer it. Activity holds the gates and steps tables, then the chain readout (C38): a section in the drawer's own idiom with a small-capitals summary and the live fact as its hint, closed while the chain is quiet and open when it is red or stalled. Its rows are the carry run with its clock, age and verdict, the required contexts, the head of main, the repair card of a red head, the stall card, the ladder's re-run and the cover run on a done card. Files stays as it is. Receipt shows a merged card's stored receipt.

The document mode (C17). The same slot holds one document of the project's document repository instead of a card: the head with the named history arrows, Recent, the path with the saved-state indicator, Read | Edit, Open in Forgejo, Wide, New document and ×, then the pins row, then the rendered text at a 70-character measure. Links open in place, and the browser's back is the arrow's step. Edit swaps the text for a plain text area with Save as commit, Cancel and Discard. The draft lives in the browser, and the save is one commit as the human. A newer version shows one quiet changed line and never replaces the text by itself. A card takes the slot back, and a Documents button in the board head reopens the document.

## The phone, under 900 px

One column, no tabs: the top bar (home word, project select, a menu for the rest), the status strip, the chat with its thread table as one vertical list above the log, the log at 55 percent of the viewport height and the composer under it. Then the board as stacked sections: Needs you in full, then In progress, Queued and Done, each with its count, Done closed by default. The small cards keep their layout at 390 px: the compact answer button, the count link and the carousel's arrows are 44 px targets, the foot lines wrap, and nothing scrolls sideways. The opened card takes the full screen. Its answer buttons, Send, the fields and the fold rows are 44 px high, and an answer's effect line moves under its button when the two do not fit side by side.

## Tokens and skins

The oklch ladder and the state hues of proposal v1 stay as the base tokens (`base.css`). Each skin is one file `skins/<slug>.css` that overrides tokens and the layout rules (which region is where, the panel treatment, type, radii, density). `data-skin` on `<html>` selects it the way `data-theme` selects the theme: `?skin=<slug>` sets it and localStorage remembers it. At the merge the picked skin becomes the console's stylesheet and the mechanism goes.

## Markup changes

| Template | Change |
|---|---|
| layout.html | the header becomes the top bar: home, project select (form, auto-submit), the page links, theme, user, logout |
| page.html | the filter form becomes the board header. The order is the status strip, the chat, the board. The Board and Chat tabs go. The drawer stays last |
| board.html | the small card and the Needs-you card as above, the whole card the drawer's opener. Four column headers (C8). The lane columns, the wide view and the move and plan forms go (225) |
| drawer.html | the tab order, and the Overview tab as the opened card |
| chat.html | the turns with an avatar and the name and time above the text |
| new.html | Track (direct or plan) replaces Lane (225) |
| console.js | the pane tabs go. The drawer no longer offsets for the chat |
| console.css | split into `base.css` (tokens, mechanics, layout) and `skins/*.css` |

Every existing test keeps passing or gets the one-line change its new markup needs, with the reason in the commit.

## The notifications page (C19)

A secondary page under the shell, one `h2`, three sections in one monospaced readout (the third, Chat tokens, from C43): no card fills, hairline rules carry the layout (the instrument direction of round 07). Connections first: a table of venue, state, action. Every state carries a small square lamp, one language for both sections: lit cyan for connected and for a level the human set, amber for needs-you, unlit for off and not connected. A derived default states itself in words, "default: needs-you", dim. The human's own word stands at full strength. The actions are phase 1's controls styled quiet: Connect, Disconnect, a select of off / needs-you / all, Save per row. On the phone the rows stack, the select goes full width, every target 44 px.

Chat tokens (C43) are the page's third section, after Level per project. The answer to the form that makes one shows a block once, above Connections: a raised panel with a 2 px cyan rule at its left and the mark "shown once", the `claude mcp add` line behind a `$` prompt with a Copy button, and the bearer under "bearer, for a script" with its own Copy button. A press copies and the button reads "Copied" for 2 s through its live label. Where the clipboard refuses, the press selects the text and reads "Selected". The section is a table of name, project (its name, as in Level per project), created, expires, last used with a C19 lamp (lit for a token in use, unlit for one never used or expired) and Revoke. A token's name or project over 24 characters ends in an ellipsis at the desk and wraps on the phone. The form (project, name, lifetime, Forgejo token, Make chat token) folds behind "Make a chat token" once a token exists, its disclosure triangle kept on the phone. On the phone the token rows stack and name their fields, and every target is 44 px.

## The secondary pages (C24)

Costs, Resources, Settings and Policy follow one readout grammar: a small-caps section label, one monospaced figures line, then rows on the page ground between hairline rules. C19 lamps mark states, figure columns are right-aligned and tabular, and a stronger top rule holds the standing row. Resources carries every project's envelope figures plus the cluster's jobs. Settings is per project (`?project=`), holding the settings rows, the GitHub export and the gateway YAML, with New project as a quiet foot link. Alerts is not a page: an alert reaches the board as a card, and the chat's alerts tool answers questions about alerts (C41).

## The metrics page (C30)

A secondary page per project under the figures group of the bar (Costs, Metrics, Resources). One 64 rem column: the head with the window control (7 · 28 · 90 days, the window in the URL, 28 the default), then five sections in weight order (Delivery, Stability, Cost, Autonomy, The factory itself), each a small-caps label over one row per figure: the name, the value in monospaced tabular figures, the signed move against the previous window, and the last 7 weeks as a monochrome server-rendered SVG spark in a right column every row shares. The figures are the [concept's catalogue](../docs/metrics-visualization-concept-2026-10-19.md), one SQL query each behind the JSON endpoint. Nothing on the page is model-computed. On the phone the row stacks: name, value with its move, spark below.

## The routines (C16)

Every routine of the project stands as a ghost card at the foot of Queued, sorted by its next run, with the face described under the small card. Queued's count stays the count of its real cards. The board's head holds "↻ routines ▾" right of the find box with three radios: all, within a period (a number and days or hours, 1 day at first) and none, kept in the URL beside the filters. A column with hidden ghosts ends in one faint line that opens the control. The status strip gets one cell only when a run is under an hour away or held. A ghost opens the routine's drawer (Overview, Runs, Config). A card a routine filed names the routine in its foot line's place, and its drawer carries the provenance line. The chat creates, changes and deletes routines through tools. On the phone the ghosts sit at the foot of Queued's section and the control is a row in the board's head.
