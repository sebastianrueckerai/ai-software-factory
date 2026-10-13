# Theme: Mission control

Read off round 01 `06-mission-control-dark.png`, `06-mission-control-light.png` and the round 02 images (`06-mission-control-drawer.png`, `-idle.png`, `-phone.png`, `h-06-07-busy.png`), with the director's notes of the build round. The images are the target; this file is the rule set a builder follows when the image is ambiguous.

## Idea in one line

The control room of a factory: a near-black blue room of thin-bordered instrument panels, cyan for the system, amber for the one signal that needs a person, numbers in monospace, everything exact and calm.

## Tokens

| Token | Dark | Light | Use |
|---|---|---|---|
| --bg | #070b12 | #f1ece0 | page, the top bar, the ticker |
| --bg-panel | #0b111a | #f7f3ea | the status panel, the board's columns |
| --bg-raised | #0f1723 | #fbf8f2 | the chat panel, the drawer |
| --bg-card | #111b28 | #fffdf8 | a card face |
| --bg-hover | #15212f | #f3eee2 | hover on cards, rows, quiet buttons |
| --line | #1a2636 | #d9d4c6 | hairlines inside a panel |
| --line-strong | #263649 | #b4b9c2 | panel borders |
| --mark | #5a8aa3 | #1d3557 | the 7 px corner marks of every panel (amber on the tray) |
| --text | #dfe7f1 | #0f1d33 | body (15.2:1 / 15.3:1) |
| --text-muted | #93a1b5 | #46536a | meta, labels (6.9:1 / 7.3:1) |
| --text-faint | #75849a | #5b6678 | done rows, the ticker (5.0:1 / 4.9:1) |
| --accent | #4fcbe2 | #0a6a80 | the system colour: links, focus, Do it, Send, the gauge, running |
| --need | #f4b13e | #f0a62a | the signal colour: the tray, Approve as you, warnings |
| --need-text | #f6bd5a | #8a4f00 | amber text on the page or the tray tint |
| --need-tint | amber 6 % | #fff3d6 | the tray body |
| --failed-quiet | #c98a8a | #a14b43 | the failed tag in done rows and the ticker (6.8:1 / 5.3:1) |
| --st-running | #4fcbe2 | #0a6a80 | dot and word, the card's left rule |
| --st-waiting | #f4b13e | #8a4f00 | waiting on a human, stale, on the provider |
| --st-review | #9fb0ff | #4152c4 | in review |
| --st-done | #5cc98f | #1e7a4c | done |
| --st-failed | #f26d6d | #b8322a | failed, blocked |
| --st-closed | #93a1b5 | #5b6678 | closed, backlog, queued |

Every state shows its word next to its hue; colour is never the only signal. In light every metadata text clears 4.5:1 on every surface it sits on: faint on the card 5.7, on the tray 5.3, on the page 4.9; amber text on the tray 6.0, on the high-risk chip 5.0. Fills: dark ink on cyan 9.8:1, dark ink on amber 9.9:1 (dark), white on teal 6.2:1, navy on amber 8.2:1 (light).

## Type

- Text: the system UI stack (`-apple-system, "Segoe UI Variable", "Segoe UI", "Noto Sans", system-ui`). Figures, refs, times, the activity line, chips: the monospace stack (`ui-monospace, "SF Mono", "Cascadia Mono", "JetBrains Mono", "Noto Sans Mono", monospace`) with tabular numerals.
- Scale: 11 (chips, labels in small capitals), 12 (meta, the ticker), 13 (the board, the body of the drawer), 14 (the chat's log), 16 (a tray headline, the drawer title), 20 (the pulse sentence). Weights 400 and 600 only.
- Column and section labels in small capitals (`font-variant-caps: all-small-caps`, +0.06 em), never uppercase transforms.

## Layout at 1440 and 1920

```
top bar 44   home · project ▾ · Board New task Projects Resources Costs Policy Alerts      scenario · theme · sebastian · Log out
status panel  ⚠ pulse sentence, 20 px ......................................................... more
              ● waiting on you | 3 working | 2 need you | €61.40 / €120.00 ▬▬▬▬▭▭ 51 % | GitHub: …
main          CHAT 40 %, full height            | Board header: Board · accent ▾ · Wide view · ?
              log anchored to the prompt        | NEEDS YOU tray, amber, the items side by side
              > composer ................ Send  | Queued | Working | Verifying | Done
ticker 28     20:37 ✓ #616 Chat form: center the Send button · 20:30 ✓ #610 … (scrolls slowly)
```

- The screen is one viewport high on a desktop; the log and the columns scroll inside.
- Chat left at 40 percent, board right at 60 percent, 10 px gutter, 12 px page margin (14 and 18 from 1700 px). The four columns weigh 1.1 : 1.2 : 1 : 0.88 (Queued, Working, Verifying, Done), so the busiest state row fits one line. A column that scrolls fades at its foot. At 900 to 1279 px the four columns go two by two and the board scrolls as one.
- The Needs you tray is the board's first column turned on its side: full width of the board, above the four columns. Nothing is shown twice.
- The drawer docks at the right edge of the main area, `min(46 %, 720 px)` wide, from the top of the main area to the ticker: over the board, never over the chat (the chat ends at 40 percent).
- Wide view ("Wide view" / "Five columns", key w): the tray becomes the Human lane (Approvals, Escalations, Human tasks), the four columns become the Agent lane, one column per process lane (Backlog, Plan, Ready, Running, Waiting on a human, Waiting on the author, In review, Done, Failed, Closed), scrolling sideways inside the board. Lane badges show on cards; backlog cards drag onto Plan and Ready.

## The pulse

One panel with the instrument strip under it. Prominent (a card needs a person): a 3 px amber left rule, an amber 6 percent tint and the amber ⚠ before the sentence. Subdued: no rule, no tint, no sign, the sentence in the muted text colour. "more" opens the bullets as a short list under the sentence. While it recomputes, three dots after the sentence.

The strip: cells split by vertical hairlines, each a mono numeral and a word ("3 working"). The state word with its dot (amber waiting, cyan working with a slow breathing dot, grey idle). "n need you" in amber when above zero, links to the tray. Spend links to Costs and carries the gauge: 120 px by 4 px, cyan, amber from 80 percent, red and full past the cap, the percent in mono after it.

## The chat

The main region: the raised panel, a 2 px cyan rule along its top edge, the largest body type on the page (14 px). Header: "Chat", "project agent · project", New conversation, the old conversations select (shown once one exists). The log is a two-column console: a 90 px gutter with time and who in mono, the text at 14.5 px and at most 72 characters wide. It flows from the top: the start line first, as a quiet intro at most 60 characters wide over a hairline, then the messages. It scrolls to the newest message and fades at its top edge once scrolled. Your lines start with a cyan "›". Tool blocks are one-line mono strips that open to the arguments and the result. A proposal is a panel with a cyan left rule: "I will:", the changes as a list, "details" as a disclosure, Do it (cyan fill) and Skip (ghost). Applied: a green ✓ line with Undo. The composer is a prompt line: a cyan mono "›" before a three-row box, Send at its right; "This is your own conversation…" under it; the queue of waiting messages under that, each editable and removable.

## The board and the card

Columns are sunken panels with corner marks; the header is the name in small capitals and the count in mono. A card: 1 px hairline border, 2 px left rule in the state hue (none on backlog and queued), 8 by 10 px padding. Line 1 the ref in mono and the title, two lines at most, the whole line opens the drawer. Line 2 the state row in mono 11 px: dot and state word in the hue, elapsed, then only when exceptional: n/n checks, spend with "⚠ near its budget" in amber from 80 percent (with a 2 px amber meter under the card), the gate and its age, the fine states in amber ("on the provider", "stale, nothing for 40 min"). Separators trail their item, so a wrapped row never starts with a dot. The activity line in mono, one line, only on a working or waiting card or a failing check; the provider's wait may take two lines. Chips only when exceptional: blocked by n (red, the names on hover), part of plan #n, the accent as a dot and its name, the lane in the wide view. Actions as quiet 22 px buttons. A stale card gets a dashed amber ring.

Done, failed and closed cards are two-line rows without a box, all in the faint colour: the ref and title, then the state glyph and word (✓ done, ✕ failed, ⊘ closed) and the elapsed time. Only the failed tag takes a colour, the quiet red. Retry is a small underlined text link, not a button.

## Needs you

The loudest thing on the screen and the only place with a glow: a 1 px amber border, the amber tint, amber corner marks and a faint amber halo (dark); in light a pale amber body (#fff3d6) with a 1 px amber rule, dark-amber corner marks and the header in amber text, no solid band. The header: "Needs you" in small capitals and the count on an amber pill. The items side by side, each with a 3 px amber left rule and a 16 px headline.

- The items share the tray's width by weight: a merge item from 280 px, an escalation from 400 px, so the decision with the most to read gets the room.
- Merge approval: "Merge PR #n", chips high risk and migration, the model review line, the recommendation line, then Approve as you (amber fill), Deny, Split; a foot line with the waiting time (◷) and a Details link that opens the drawer on Reviews and audit. Deny opens the reason box and "requesting changes / rejecting (closes the pull request)" in place.
- Escalation: ref and title as the headline with the waiting time at its right, the question under it, the choices as amber-outlined buttons with "Or in your words" (dashed) in the same row, opening the answer box, then the state row with "answer on the issue", the verdict buttons small at the end.
- Capped card: the answer box open, "Grant one session with this answer" as the amber primary.
- Plan and resource approvals follow the same item: headline, two fact lines, the primary first.
- Every action answers with a one-line confirmation in place.
- With nothing waiting the tray goes dark: one quiet line, "Needs you 0".

## The drawer

The raised panel with a cyan left edge and a deep shadow to its left, slides in 160 ms. Header: the ref as the issue link in cyan mono, the title at 16 px, ×; the facts row in mono (state, elapsed, checks, spend, lane, PR). Tabs Overview, Chat, Activity, Files as a mono strip with a cyan underline; Chat is the default on a running card. Overview: the top block as a four-row definition list (Task, Status, Budget, Agent; budget amber with ⚠ from 80 percent, muted under), then the open need with its actions, then the collapsed sections Objective, The agent's summary, The plan, Reviews and audit, Related cards, Edit, Links. Activity: the gates table with a meter against the longest gate, the steps table. Files: added in green, deleted in red, mono.

## The phone

Under 900 px one column, no tabs: the top bar (home, project, theme, Menu with the rest), the status panel with the strip wrapping to two rows, the chat (the log as tall as its content and at most 62 percent of the viewport height, so the busy conversation shows whole from the start line to Do it; the composer under it, Do it and Skip side by side at 44 px), then the board as stacked sections: Needs you in full with every button full width, one per row, 44 px, then Working, Verifying, Queued, Done collapsed, its titles wrapping to two lines. The ticker closes the page and clips inside itself: the page is exactly 390 wide in every scenario. The drawer takes the full screen.

## Motion

Hover: 120 ms colour and border changes, never movement. Focus: a 2 px cyan outline, 2 px offset, on everything. The typing indicator: three dots stepping. The drawer slides 16 px in while fading. The ticker is quiet: 12 px mono in the faint colour, no state colours but the failed tag; it scrolls at about 28 px a second and stops on hover or focus. Under `prefers-reduced-motion` nothing moves: the ticker is a still line, the dots stand, the drawer appears, replies arrive whole.
