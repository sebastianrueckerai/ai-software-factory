# Theme: Inbox first

Read off round 01 `09-inbox-first-dark.png`, `09-inbox-first-light.png` and the round 02 images (`09-inbox-first-drawer`, `-idle`, `-phone`). The images are the target; this file is the rule set a builder follows when the image is ambiguous.

## Idea in one line

An email client: Needs you is the inbox on the left, the chat is the reading pane, the board is a progress strip across the top that unfolds into the five columns.

## Tokens

| Token | Dark | Light | Use |
|---|---|---|---|
| --bg | #0d0e10 | #f3f3f1 | page |
| --bg-raised | #15161a | #ffffff | the strip, the inbox, the chat panel, the drawer |
| --bg-sunken | #101114 | #f7f7f5 | the composer, inputs, the expanded columns |
| --card | #1a1b1f | #ffffff | a card in an expanded column, the proposal |
| --hover | #1f2126 | #efefec | row and button hover |
| --line | #25272d | #e4e3df | hairlines |
| --line-strong | #353840 | #d0cfca | button borders, the composer |
| --text | #e8e9eb | #16171a | |
| --text-muted | #a3a6ad | #575a61 | previews, figures, meta |
| --text-faint | #868991 | #66696f | done cards, timestamps (still 4.5:1) |
| --accent | #2f6fec fill, #8db4ff text | #2459d6 fill, #1f53cc text | the primary button, links, focus. The only blue. |
| --need | #f0b357, fill #f0b357 on #1d1405 | #955700, fill #b45f06 on #fff | the Needs you treatment, the pulse when prominent, near-budget warnings (text only) |
| --st-running | #52c48f | #157a47 | |
| --st-waiting | #f0b357 | #955700 | waiting on a human (= need) |
| --st-review | #ad9ff7 | #6a4bd6 | in review |
| --st-done, --st-closed | #8e9199 | #66696f | grey; the word and the glyph tell them apart |
| --st-failed | #f47e73 | #c0362a | failed on a working face, the risk chip in dark |
| --failed-muted | #c08079 | #9c5048 | the failed mark and word in Done: muted, still 4.5:1 |
| chips | high risk #f47e73, migration #f0b357 on their tints | high risk #9f2a20 on #fbe9e6, migration #7a4500 on #fbecd2 | above 6:1 in light |
| queued, backlog, waiting on dependencies | --text-muted | --text-muted | neutral: nothing exceptional |

Dark is layered greys and hairlines, no shadows. Light is white panels on warm paper with a 1 px ring and a soft 1–2 px shadow. Same layout, same hues, two moods.

## Type

One family, the system UI face: SF Pro, Segoe UI, Noto Sans on Linux (`-apple-system, "Segoe UI", "Noto Sans", system-ui`). Mono for activity lines and file paths: `ui-monospace, "SF Mono", Menlo, Consolas, "Noto Sans Mono"`. Tabular numerals everywhere.

Scale, px (line height): 11 (16) chips, counts, overlines · 12 (16) strip items, card state rows, activity, meta · 13 (18) figures, card titles, previews, buttons · 14 (20) the body, chat messages, inbox subjects · 15 (22) the pulse sentence · 16 (22) the drawer title. Weights 400, 500, 600. No size outside this scale.

## Layout at 1440 and 1920

An app shell, one viewport tall. Top bar 48 px. Under it, 20 px side margins: the pulse banner, the board (a slim header row and the strip), then the workspace: the inbox on the left (30 percent of the workspace, 300–420 px) and the chat as the reading pane taking the rest. Gaps 12 px. The chat's log and composer sit in a centred column of at most 720 px, so the pane reads like a mail body at 1920.

The drawer docks at the right edge under the top bar, 46 percent wide, at most 720 px, full height. When it opens the page beside it shrinks by its width: the chat narrows, nothing is covered.

Empty inbox (idle, quiet): the Needs you column of the board says so in one quiet line, "Nothing needs you", the inbox pane goes, the chat takes the width with its log and composer in a centred 960 px column, and the strip unfolds by itself (with no decision waiting, the board is what there is to scan). A click on the strip is remembered and overrides that default.

The workspace never gets shorter than 380 px: when the unfolded board needs more, the page scrolls instead of squeezing the chat.

Wide view: the board unfolds and cards show their lane badge.

## The pulse

A thin banner: the sentence at 15 px medium with "more" at its end, the status figures in one 13 px tabular row under it. Prominent (a card needs a person): need tint, a need hairline, a 3 px need rule on the left, the ⚠ sign. Subdued: no tint, no sign, a plain hairline box. A month cap passed shows the spend figure in the failed hue with ⚠ even when the pulse is subdued.

## The chat

The main region: a raised panel, header "Chat", "project agent · project", New conversation, the old-conversations select once there is an older one. Messages are rows, not bubbles: a 24 px avatar, "who · time" at 12 px muted, the text at 14 px. Tool blocks are a collapsed 12 px mono line with a small gear and the duration; open shows arguments and result. A proposal is a card with a 1 px strong border: "I will:", the list, the detail line muted, Do it (blue) and Skip (quiet). Applied: a green "✓ applied" line with Undo. The composer is a three-row box with Send inside its bottom right; Send turns blue when the box has text. The queue sits under it as small editable pills with ×.

## The board and the card

Folded (default): five equal segments in one bordered strip, hairlines between. Each segment: the column name at 13 px semibold, the count as a pill, then up to three items at 12 px: ref and title on one line, ellipsis, an exceptional mark on the right (⚠ spend, stale, on the provider). Done shows failed cards as lines with a muted red ✕ and the rest as a row of refs in the faint colour; no bright icon anywhere in Done. Every item opens the drawer; its hover title and its accessible name carry the whole face. More than three items: "+n" in the segment's header, its hover title lists the rest. A click on a segment name or on "Board" unfolds the strip: each segment grows its column of full faces below its header, the columns scroll inside at most 40 percent of the viewport (420 px); a second click folds it back.

The card face (unfolded): ref and title (13 px, two lines, the title opens the drawer); the state row (12 px: dot and state word in its hue, elapsed, then only the exceptional: n/n checks, spend with ⚠ near its budget, the gate and its age, PR link); the activity line (12 px mono, one line) on a working or waiting card; chips only when exceptional; actions as small quiet buttons. A stale card has a need-coloured 1 px ring. Done, failed and closed cards are one line without a box: glyph, ref, title, state word, elapsed; they whisper in muted and faint text with a grey glyph; failed keeps its word and ✕ in muted red and a Retry. The Done column shows four and "+n" for the rest.

## Needs you

The inbox panel holds every Needs you item as a mail row: a 3 px need rule on the left, the subject at 14 px semibold with its chips, the age on the right (12 px tabular), the preview lines at 13 px, then the actions inline. Merge: "Merge PR #n", chips "high risk" (failed tint) and "migration" (need tint), the model review and the recommendation as two preview lines, Approve as you (blue), Deny (opens the reason box with the request-changes or reject choice), Split, Details (opens the drawer at Reviews and audit). Escalation: the question once as the subject ("#n title"), one muted context line (the rest of the question), the choices as outlined buttons with "Or in your words" opening the box, then one small muted line: the state, elapsed, "answer on the issue" and the verdict links "real problem · noise" (the question "Was this escalation a real problem?" is their group label and hover title). Capped: the box is open and the button reads "Grant one session with this answer". Every secondary button is outlined (transparent fill, strong hairline), so Approve as you is the one filled button in the row. What makes them loudest: the only need rule, the only filled count, the only blue buttons outside the chat, and the top-left place.

## The drawer

Header: close ✕, ref and title at 16 px, the facts row (state, elapsed, checks, spend, lane, PR). Tabs Overview, Chat, Activity, Files with a 2 px underline; Chat is the default on a running card. Overview: the four-line top block as a definition list (Task, Status, Budget muted under 80 percent, Agent muted), Open (the one need, with its actions), then collapsed sections with hairlines: Objective, The agent's summary, The plan, Reviews and audit, Related cards, Edit, Links.

## The phone

Under 900 px one column: the top bar (home word, project select, a menu for the rest), the pulse, the chat with its log at 55 percent of the viewport height and the composer, then the board as stacked sections: Needs you first (the inbox moves in as that section, choice buttons full width and 44 px tall), Working, Verifying, Queued, Done, Done folded. No line clamps and no ellipsis: titles and activity lines wrap at word boundaries. The drawer is full screen.

## Motion

Hover: background to --hover in 120 ms. Focus: a 2 px blue ring with 2 px offset, never removed. The running dot breathes (2 s). Typing: three dots. The drawer slides 16 px in 180 ms. Reduced motion: no animation, no transition.
