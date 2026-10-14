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
| --mark | #5a8aa3 | #1d3557 | the 7 px corner marks of every panel (amber on the Needs you column) |
| --text | #dfe7f1 | #0f1d33 | body (15.2:1 / 15.3:1) |
| --text-muted | #93a1b5 | #46536a | meta, labels (6.9:1 / 7.3:1) |
| --text-faint | #75849a | #5b6678 | done rows, the ticker (5.0:1 / 4.9:1) |
| --accent | #4fcbe2 | #0a6a80 | the system colour: links, focus, Do it, Send, the gauge, running |
| --need | #f4b13e | #f0a62a | the signal colour: the Needs you column, Approve, warnings |
| --need-text | #f6bd5a | #8a4f00 | amber text on the page or the Needs you fill |
| --need-tint | amber 6 % | #fff3d6 | the Needs you column's fill |
| --failed-quiet | #c98a8a | #a14b43 | the failed tag in done rows and the ticker (6.8:1 / 5.3:1) |
| --st-running | #4fcbe2 | #0a6a80 | dot and word, the card's left rule |
| --st-waiting | #f4b13e | #8a4f00 | waiting on a human, stale, on the provider |
| --st-review | #9fb0ff | #4152c4 | in review |
| --st-done | #5cc98f | #1e7a4c | done |
| --st-failed | #f26d6d | #b8322a | failed, blocked |
| --st-closed | #93a1b5 | #5b6678 | closed, queued, waiting on dependencies |

Every state shows its word next to its hue; colour is never the only signal. In light every metadata text clears 4.5:1 on every surface it sits on: faint on the card 5.7, on the Needs you fill 5.3, on the page 4.9; amber text on the Needs you fill 6.0, on the high-risk chip 5.0. Fills: dark ink on cyan 9.8:1, dark ink on amber 9.9:1 (dark), white on teal 6.2:1, navy on amber 8.2:1 (light).

## Type

- Text: the system UI stack (`-apple-system, "Segoe UI Variable", "Segoe UI", "Noto Sans", system-ui`). Figures, refs, times, the activity line, chips: the monospace stack (`ui-monospace, "SF Mono", "Cascadia Mono", "JetBrains Mono", "Noto Sans Mono", monospace`) with tabular numerals.
- Scale: 11 (chips, labels in small capitals), 12 (meta, the ticker), 13 (the board, the body of the drawer), 14 (the chat's log), 16 (a Needs you headline, the drawer title), 20 (the pulse sentence). Weights 400 and 600 only.
- Column and section labels in small capitals (`font-variant-caps: all-small-caps`, +0.06 em), never uppercase transforms.

## Layout at 1440 and 1920

```
top bar 44   home · project ▾ · Board New task Projects Resources Costs Policy Alerts      scenario · theme · sebastian · Log out
status panel  ⚠ pulse sentence, 20 px ......................................................... more
              ● waiting on you | 3 working | 2 need you | €61.40 / €120.00 ▬▬▬▬▭▭ 51 % | GitHub: …
main          CHAT 40 %, full height            | Board header: Board · accent ▾ · Wide view · ?
              start line, then the log          | NEEDS YOU (lit) | Queued | Working | Verifying | Done
              > composer ................ Send  | 1.5             | 1.04   | 1.12    | 0.96      | 0.86
ticker 28     20:37 ✓ #616 Chat form: center the Send button · 20:30 ✓ #610 … (scrolls slowly)
```

- The screen is one viewport high on a desktop; the log and the columns scroll inside.
- Chat left at 40 percent, board right at 60 percent, 10 px gutter, 12 px page margin (14 and 18 from 1700 px). The five columns weigh 1.5 : 1.04 : 1.12 : 0.96 : 0.86 (Needs you, Queued, Working, Verifying, Done): at 1440 that is 224, 156, 168, 144, 129 px; at 1920 about 298 px for Needs you. A column that scrolls fades at its foot. At 900 to 1279 px Needs you spans the full board width, the four others go two by two, and the board scrolls as one.
- Needs you is the board's first column, never a tray or band across the top (C4): five columns, Needs you about 1.5 times as wide as the others, its items stacked and growing downward, scrolling like any column. With nothing waiting it goes calm and narrows to 0.9.
- The drawer docks at the right edge of the main area, `min(46 %, 720 px)` wide, from the top of the main area to the ticker: over the board, never over the chat (the chat ends at 40 percent).
- Wide view ("Wide view" / "Five columns", key w): the same five columns across the full width of the main area, the chat hidden; "/" brings the chat back. There are no lane columns, no lane badges and no drag (item 225, C7).

## The pulse

One panel with the instrument strip under it; 12 px above and below the sentence (line height 26 px). Prominent (a card needs a person): a 3 px amber left rule, an amber 6 percent tint and the amber ⚠ before the sentence. Subdued: no rule, no tint, no sign, the sentence in the muted text colour. "more" opens the bullets as a short list under the sentence; it is its own disclosure, independent of the strip's. While it recomputes, three dots after the sentence.

The strip: cells split by vertical hairlines, each a mono numeral and a word ("3 working"). The state word with its dot (amber waiting, cyan working with a slow breathing dot, grey idle). "n need you" in amber when above zero, links to the Needs you column. Spend links to Costs and carries the gauge: 120 px by 4 px, cyan, amber from 80 percent, red and full past the cap, the percent in mono after it.

The strip expands (C7). A chevron cell at its right end is the disclosure button (aria-expanded, Enter or Space); a click anywhere on the strip outside its links does the same, and Escape or a second click folds it. The panel unfolds under the strip, inside the band, as four quiet columns split by hairlines, headers in small capitals in the faint colour, 12.5 px text:

- Working: each working card as "#601 Console: the drawer's Overview top block · building · 23 min", the stage in its hue; a click opens the card's drawer.
- Needs you: each item's headline ("Merge PR #612", "#603 Which store for the session table?"); a click scrolls to the item in the column and focuses it.
- Spend: two small gauges, full column width, 4 px: today against the day cap ("€4.82 of €10.00 day cap") and this month against the month cap; amber from 80 percent, red past the cap with "the month cap is passed" under it.
- Provider and GitHub: "provider ok" or "2 waiting on the provider since 13:22" in amber; the GitHub line as a link to the pull requests, "none" when not exported.

Empty lists say "none". On the phone the four columns stack.

## The chat

The main region: the raised panel, a 2 px cyan rule along its top edge, the largest body type on the page (14 px). Header: "Chat", "project agent · project", New conversation, the old conversations select (shown once one exists). The log is a two-column console: a 90 px gutter with time and who in mono, the text at 14.5 px and at most 72 characters wide. It flows from the top. The start line sits above it, right under the header's hairline: one 12 px line in the faint colour over its own hairline, cut with an ellipsis, the whole text in its tooltip, so it never pushes the conversation down. It scrolls to the newest message and fades at its top edge once scrolled. Your lines start with a cyan "›". Tool blocks are one-line mono strips that open to the arguments and the result. A proposal is a panel with a cyan left rule: "I will:", the changes as a list, "details" as a disclosure, Do it (cyan fill) and Skip (ghost). Applied: a green ✓ line with Undo. The composer is a prompt line: a cyan mono "›" before a three-row box, Send at its right; "This is your own conversation…" under it; the queue of waiting messages under that, each editable and removable.

## The board and the card

Columns are sunken panels with corner marks; the header is the name in small capitals and the count in mono, on one baseline. A card: 1 px hairline border, 2 px left rule in the state hue (none on queued), 8 by 10 px padding. The whole card opens the drawer (item 226): a click anywhere on the face that is not a button, link or field; the title is a button, so Tab reaches the card, the card shows the 2 px cyan focus ring and Enter or Space opens it. The issue link lives in the drawer header, not on the face. Line 1 the ref in mono and the title, two lines at most. Line 2 the state row in mono 11 px: dot and state word in the hue (on a working card its stage: planning or building; in Verifying: verifying; in Queued: queued or waiting on dependencies), elapsed, then only when exceptional: n/n checks, spend with "⚠ near its budget" in amber from 80 percent (with a 2 px amber meter under the card), the gate and its age, the fine states in amber ("on the provider", "stale, nothing for 40 min"). Separators trail their item, so a wrapped row never starts with a dot. The activity line in mono, one line, only on a working or waiting card or a failing check; the provider's wait may take two lines. Chips only when exceptional: "plan" in cyan on a plan-track card, blocked by n (red, the names on hover), from plan #n, the accent as a dot and its name. No lane badge, no Plan, Ready or Start plan buttons (225): the track is chosen at filing. A card's actions are Retry on a failed card and Close on a card waiting on a human (or failed without an issue), with a confirm. A stale card gets a dashed amber ring.

Done, failed and closed cards are two-line rows without a box, all in the faint colour: the ref and title, then the state glyph and word (✓ done, ✕ failed, ⊘ closed) and the elapsed time. Only the failed tag takes a colour, the quiet red. Retry is a small underlined text link, not a button.

## Needs you

The first column of the board, and the loudest thing on the screen: the only place with a glow. A 1 px amber border, the amber tint, amber corner marks and a faint amber halo (dark); in light a pale amber fill (#fff3d6) with a 1 px amber rule, dark-amber corner marks and the header in amber text. The header: "Needs you" in small capitals and the count on an amber pill, on one baseline. The items stack one under the other, 8 px apart, each with a 3 px amber left rule and a 16 px headline; the text wraps as the column needs, and the column scrolls when it overflows, like the others.

- The column is a size container. From 272 px of content (1920, the mid-width layout) the merge actions sit on one row. Narrower (1440: 224 px column) Approve takes its own full row and Deny and Split share the second. Below 440 px the escalation's choices and "Or in your words" go one per row, full width; wider they flow in a row.
- Merge approval: "Merge PR #n", chips high risk and migration, the model review line, the recommendation line, then Approve (amber fill; every action is the member's own, so the label does not say "as you"), Deny, Split; a foot line with the waiting time (◷) and a Details link that opens the drawer on Reviews and audit. Deny opens the reason box ("Reason") and "Deny by requesting changes / rejecting (closes the pull request)" in place. Confirmations read "Approved", "Answered “Postgres” on the issue", "Denied by requesting changes".
- Escalation: ref and title as the headline with the waiting time at its right, the question under it, the choices as amber-outlined buttons with "Or in your words" (dashed) in the same row, opening the answer box, then the state row with "answer on the issue" and Close as a small text link, the verdict buttons small at the end. The same item stands for a plan's open question.
- Capped card: the answer box open, "Grant one session with this answer" as the amber primary.
- A resource approval follows the same item: headline, two fact lines, Approve first. There is no plan approval: no Accept plan, Request changes or Reject (225); a plan with no open question files its children by itself.
- Every action answers with a one-line confirmation in place.
- With nothing waiting the column goes calm: the panel colour, the plain count "0", no amber, no halo.

## The drawer

The raised panel with a cyan left edge and a deep shadow to its left, slides in 160 ms. Header: the ref as the issue link in cyan mono (the card's only issue link), the title at 16 px, ×; the facts row in mono (the stage or state, elapsed, checks, spend, "plan" on a plan-track card, model, PR). Tabs Overview, Chat, Activity, Files, Files last (226), as a mono strip with a cyan underline; Chat is the default on a running card. Overview: the top block as a four-row definition list (Task, Status, Budget, Agent; budget amber with ⚠ from 80 percent, muted under), then the open need with its actions, then the collapsed sections Objective, The agent's summary, The plan, Reviews and audit, Related cards, Edit, Links. Activity: the gates table with a meter against the longest gate, the steps table. Files: added in green, deleted in red, mono.

## The phone

Under 900 px one column, no tabs: the top bar (home, project, theme, Menu with the rest), the status panel with the strip wrapping to two rows, the chat (the log as tall as its content and at most 62 percent of the viewport height, so the busy conversation shows whole from the start line to Do it; the composer under it, Do it and Skip side by side at 44 px), then the board as stacked sections: the lit Needs you column first, in full, never collapsible with every button full width, one per row, 44 px, 8 px between rows (the verdict buttons too), then Working, Verifying, Queued, Done collapsed, its titles wrapping to two lines. The ticker closes the page and clips inside itself: the page is exactly 390 wide in every scenario. The drawer takes the full screen.

## Motion

Hover: 120 ms colour and border changes, never movement. Focus: a 2 px cyan outline, 2 px offset, on everything. The typing indicator: three dots stepping. The drawer slides 16 px in while fading. The ticker is quiet: 12 px mono in the faint colour, no state colours but the failed tag; it scrolls at about 28 px a second and stops on hover or focus. Under `prefers-reduced-motion` nothing moves: the ticker is a still line, the dots stand, the drawer appears, replies arrive whole.

Live dots (Sebastian, 2026-10-14, C6): the state dot of a running card (planning, building) breathes every 2.2 s with a soft expanding ring in its own colour; a verifying card's dot does the same every 3.6 s. Under reduced motion both stand still.

Chat turns (Sebastian, 2026-10-14): a 22 px avatar at the left (the agent a cyan ring with a dot, the member a filled circle with the initial), the name and the time on one small line above the text, the text taking the full width. No gutter column. The drawer's session log uses the same turn.

## Other pages

- New task (a link in the top bar): project, title, description, Track (direct or plan, direct the default) instead of Lane (225), priority, size, File the issue. The page keeps the shell; the pulse band is absent.

The band as one disclosure (Sebastian, 2026-10-14): there is no "more" button. A click anywhere on the pulse band that is not a link or a button opens the pulse's bullets and the status panel together; the chevron at the strip's right end is the keyboard control and carries aria-expanded; Escape or a second click folds both. The whole band shows a faint hover tint. The live dot is stronger: the dot scales to 1.25, dims to 50 percent and sends a 6 px ring every 2.2 s (building, planning) or 3.6 s (verifying); under reduced motion it stands still.
