# Theme: Messenger dock

Read off round 01 `16-messenger-dock-light.png` (the lead), `16-messenger-dock-dark.png` and the round 02 drawer, idle and phone images. The images are the target; this file is the rule set a builder follows when the image is ambiguous.

## Idea in one line

A messaging app with the board above it: five short columns across the full width on top, the chat as a full-width dock in the bottom half, the pulse pinned to the dock's top edge like a pinned message.

## Tokens

| Token | Dark | Light | Use |
|---|---|---|---|
| --bg | #1b1c1f | #f6f5f2 | page |
| --bg-raised | #232428 | #ffffff | the chat dock, the drawer, cards |
| --bg-card | #2a2b30 | #ffffff | a card on a column |
| --bg-sunken | #1f2023 | #eeece8 | the board's columns, your bubble, the composer |
| --line | #34363b | #e3e0da | hairlines |
| --line-strong | #474950 | #cfcbc3 | inputs, quiet buttons |
| --text | #ececee | #1c1c1e | |
| --text-muted | #a3a3aa | #64625c | meta, the state row, done rows |
| --accent | #5cc98d text, #237a4b fill | #1b7a48 text and fill | the agent (avatar dot, header dot), Do it, Send with text, focus ring, links |
| --ink | #ececee on #1b1c1f | #1c1c1e on #fff | the human's decisions: Approve as you, Answer, Grant one session |
| --need | #f4a85e on #2c2319, rule #d9821b | #a4490a on #fdf2e3, rule #e0861d | the Needs you column, the prominent pulse, the "n need you" figure |
| --st-running | #5cc98d | #1b7a48 | dot and word |
| --st-waiting | #f4a85e | #a4490a | waiting on a human, the provider, dependencies |
| --st-review | #b8a6ff | #6447c9 | in review |
| --st-queued | #93b4dc | #46648a | backlog, queued |
| --st-done, --st-closed | #a3a3aa | #64625c | quiet |
| --st-failed | #f58a80 | #b8322a | failed, blocked, high risk, over the cap |

Every text pair passes 4.5:1, every pill fill 3:1. Colour never carries a state alone: the state word or a glyph (✓, ✕, ⚠) sits beside it.

## Type

One family, the system sans (`-apple-system, "Segoe UI", "Noto Sans", system-ui`), mono for activity lines and paths (`ui-monospace, "SF Mono", "Cascadia Mono", "Noto Sans Mono"`). Tabular numerals on every figure, time and count.

- Body and chat bubbles 15/22, 400.
- The pulse 16.5/24, 500.
- Status figures 13/18, 500.
- Card title 14/19, 500; a Needs you headline 15/20, 600.
- State row and chips 12.5/17; activity line 12/16 mono; column headers 13.5, 600, title case with the count in a round badge.

## Layout at 1440 and 1920

- Top bar 56 px: home word, project select, the page links, then scenario, theme, user, Log out.
- Figures row 44 px: the status figures as small pills, left; the board's tools (Accent, Wide view, ?) right.
- Board, 44 vh (300 to 520 px): five columns, Needs you 1.25 parts, the others 1; 12 px gaps, 24 px sides. Each column scrolls inside its own height under a sticky header.
- Chat dock, the rest: a raised panel with 16 px top radii and an upward shadow, full width; the conversation centred at most 1040 px wide.
- Drawer: right edge, from under the top bar to the bottom, min(46 vw, 720 px). It covers the board's right part and the dock's right part; the dock's content narrows by the drawer's width so the log and the composer stay free.
- Wide view: the Human lane (Approvals, Escalations, Human tasks) then the Agent lane (Queued, Working, Verifying, Done), lane badges on the cards, drag handles on backlog cards; the board scrolls sideways inside itself.

## The pulse

A banner pinned to the dock's top edge, centred, straddling the seam between board and dock by half its height, the only floating element with a shadow. Prominent: the warm need tint, the ⚠ in the need colour, a 3 px need rule left. Subdued: the raised surface, a hairline, a muted dot. "more" opens the bullets inside the banner; refs (#612) are links that scroll the board to the card and ring it.

## The chat

- Header: "Chat", the green agent dot, "project agent · project", the old conversations select, New conversation.
- Yours: right, --bg-sunken bubble, 18 px radius with a 6 px tail corner.
- The agent's: left, a 24 px avatar dot (green ring, green core), raised bubble with a hairline.
- Tool block: a small grey line under the bubble, "› name · duration", opens to the arguments and the result's first line.
- Proposal: a card under the agent's bubble, "I will:" and the changes as a list, the detail muted, Do it (green fill) and Skip (quiet). Do it becomes "✓ applied · … · Undo".
- Composer: a 14 px rounded box, the textarea grows to six lines, Send inside on the right, green once the box holds text. The queue sits under it as small pills.

## The board and the card

- Column: --bg-sunken, 12 px radius, header "Queued" with a count badge.
- Card: --bg-card, hairline, 10 px radius, 10/12 padding. Ref muted, title two lines. State row: dot and word in the state hue, elapsed, then only the exceptional (checks, spend from 80 % with ⚠, the gate and its age, the fine state). Activity line in mono only when working or waiting. Chips only when exceptional. Actions as 26 px quiet buttons, always visible.
- Done, failed, closed: no box, a row with a hairline: ref and title, then "done · 29 min in all" faint; one line when the column is wider than 330 px. Failed in the failed hue with ✕.
- Stale: a dashed need ring and "nothing for 40 min" in the need hue.

## Needs you

The column takes the warm tint and its header the need hue. Each item is a white (raised) card with a need border and a 3 px need rule left, a kind line ("Merge approval · 1 h 10 min"), a 15 px headline, chips, two short lines, and full 32 px buttons: the primary in ink, the rest outlined. Deny opens the reason box with "Deny by" in place. Choice buttons wrap and go full width on the phone. A capped escalation opens its text box and offers "Grant one session with this answer". This is the only warm colour on the board, so it is the loudest.

## The drawer

Raised panel, hairline left, a soft left shadow. Header: close, ref and title (17/24, 600), the state row. Tabs Overview, Chat, Activity, Files as a 2 px underline row. Overview: a four-line definition list (Task, Status, Budget, Agent) on --bg-sunken, then Open in the need tint when something needs the member, then the collapsed sections as hairline-separated disclosures.

## The phone

Under 900 px one column, the page scrolls: the top bar (home word, project select, a menu for the rest), the figures, the chat dock (pulse, header, the log at 55 vh, the composer), then the board as stacked sections: Needs you, Working, Verifying, Queued, Done (collapsed). Choice buttons full width. The drawer takes the full screen.

## Motion

120 ms colour and border transitions on hover; focus is a 2 px accent ring with 2 px offset. Typing indicator: three dots pulsing in sequence. The drawer slides 24 px in with a fade, 180 ms. A revealed card rings for 1.2 s. Reduced motion: no slides, no pulsing, replies appear at once.
