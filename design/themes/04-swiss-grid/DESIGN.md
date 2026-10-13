# Theme: Swiss grid

Read off round 01 `04-swiss-grid-dark.png`, `04-swiss-grid-light.png`, the round 02 images and the director's notes of 2026-10-14. The images are the target; this file is the rule set a builder follows when the image is ambiguous. Where the notes and the image disagree, the notes win (modest numerals, chat and board side by side). Fix list 1 of the coordinator is folded in.

## Idea in one line

A Müller-Brockmann poster that works: one strict 12-column grid that every edge sits on, one grotesk, black and white, one red for what needs a person, rules instead of boxes.

## Tokens

| Token | Dark | Light | Use |
|---|---|---|---|
| --bg | #000000 | #ffffff | page, the drawer (paper, no panels) |
| --bg-raised | #000000 | #ffffff | none: nothing is raised; the drawer is set off by a rule |
| --bg-sunken | #141414 | #f4f4f4 | an open tool block, code in tables |
| --line | #2b2b2b | #dcdcdc | hairlines between cards, rows, table lines |
| --rule | #e8e8e8, 1 px | #111111, 2 px | region rules; dark takes the thinner rule because white on black spreads |
| --edge | #6e6e6e | #595959 | quiet card-button borders; header controls and outlined decisions take the full ink |
| --text | #ededed | #0d0d0d | |
| --text-muted | #a3a3a3 | #5f5f5f | labels, meta, the state row |
| --text-faint | #7d7d7d | #767676 | done cards (still 4.5:1) |
| --accent | --ink | --ink (#000) | links are ink with an underline; focus is a 2 px ink outline, offset 2 px |
| --need | #eb0f0f | #eb0f0f | the one red: the warning sign, the Needs you header and its 4 px rule, the primary button. 4.61:1 on black, 4.56:1 on white, 4.56:1 under white text |
| --st-* | all ink | all ink | no state hues. The state word carries the state, a mark gives the shape: ● running, ◐ in review, ○ queued or backlog, ◇ waiting on a human, ✓ done, × failed, – closed |

## Type

- One family: "Helvetica Neue", Helvetica, Nimbus Sans, TeX Gyre Heros, Arial. Regular 400 and bold 700 only. Mono for the activity line and file paths: SF Mono, Menlo, Consolas, DejaVu Sans Mono.
- Tabular numerals everywhere.
- Scale on a 4 px baseline, every line height a multiple of 4: 11/16 chips; 12/16 meta, state rows, small buttons; 13/16 card titles, nav; 16/24 chat body, region and column heads; 26/32 the pulse, bold when prominent, regular otherwise; 28/32 the status numerals, regular.
- No letter-spaced capitals. Hierarchy comes from size and weight only.

## Layout at 1440 and 1920

- Margins 24 px and gutters 16 px at 1440 (32 and 20 from 1680). Twelve columns; every region, figure and board column starts on a column line.
- Top bar 48 px: home word at col 1, project select at col 3, the page links from col 7, the scenario switch, theme, user and Log out flush right.
- Pulse band across all 12 columns: the sentence, then the figures row in fixed slots, in ia order, each on a board edge where one exists: state 1–2, working 3, provider 4–5, need you 6–7 (over the Needs you column), spend 8–10 (over Queued), GitHub 11–12 (over Done).
- Chat cols 1–5, board cols 6–12, a hairline in the gutter between them. The chat stays the main region through its 16 px type and its place on the left. Each region opens with the region rule and a 48 px header row on a shared baseline.
- Board columns on the same grid: Needs you 2 columns, Queued, Working, Verifying 1 each, Done 2. Column heads stick while the board scrolls.
- 1320 px down to 900 px: chat cols 1–6, board 7–12 as stacked sections (Needs you, Working, Verifying, Queued, Done).
- The page itself never scrolls on a desktop; the chat log and the board scroll inside their halves.
- Wide view: the board shows the Human lane (Approvals 3 columns, Escalations 2, Human tasks 2) over the Agent lane (backlog 2, plan 2, ready 3), lane badges and drag handles on.

## The pulse

- Prominent (a card needs a person): the red warning sign, the sentence bold 26 px.
- Subdued: no sign, the sentence regular 26 px. Nothing else changes: no tint, no box.
- "more" at the end of the sentence opens the bullets as a row of 3 or 4 cells on the grid, each under a hairline. A blinking cursor after "more" while the pulse recomputes.
- Figures: numeral 28 px regular, label 12 px muted on the same baseline. Spend over the cap gets the red sign. "need you" links to Needs you, spend to Costs.

## The chat

- No panel. A message is a row on the grid: speaker and time in column 1 (12 px muted), text from column 2, 16/24, at most 70 characters. Your message bold 16 px, the agent's reply regular 16 px.
- Tool block: a disclosure line in mono 12 px, "▸ name · duration"; open shows the arguments and the result on the sunken tone.
- Proposal: a 2 px rule above, "I will:" bold 12 px, the changes as a numbered list, the detail 12 px muted, Do it (red) and Skip (text button).
- Applied: "✓ applied" with the changes and an undo text button. Skipped: the same in muted.
- Composer: region rule above, a three-row textarea with no border and no label beside it, aligned with the message text, Send as an ink button. The queue under it (edit, remove), then the own-conversation line.

## The board and the card

- Column head: 16 px bold title, count regular muted, a 1 px rule above. Needs you: red title and a red 4 px rule, only while something waits; "Needs you 0" is ink like the rest.
- Card: no box. Ref and title 13/16 as one button (three lines in the narrow columns, two when stacked), then the state row in 12 px as middot-separated items that wrap as units ("running · 23 min · 3/4 checks"), then the spend line on its own only from 80 percent, with the red sign, the activity line in mono 11 px on working and waiting cards, chips (1 px edge, 11 px) only when exceptional, quiet 24 px buttons. A hairline under each card.
- Done card: two lines. The ref and title in muted 12 px, one line; then the state word and the time in faint 11 px. Failed and closed rows set the title in ink, hang × or – in the gutter and add Retry when failed.
- Stale card: a 2 px ink bar in the gutter left of the card and the red sign before "nothing for 40 min".

## Needs you

- Each item under a 1 px ink rule. Merge: the headline 16/20 bold, one muted 12 px line (ref, title, wait), the chips, Model review and Recommendation at 13/16, the actions, Details. Escalation: the headline, one muted context line (the question without its first sentence), the choices, Or in your words, one muted line with the ref, the wait and the verdict links. The full question and "answer on the issue" live in the drawer's Open block. Approve as you and Grant one session with this answer are the red primary; Deny and Split are ink outlines; choices are full-width ink outlines.
- Deny opens the reason box with the request-changes or reject radios under the buttons. Or in your words opens the text box with Answer. The capped card shows the text box open.
- Loudest by three means at once: the red head, the double-width column, bold headlines where every other card is regular.

## The drawer

- Docks at the right edge, from the top of the work area to the bottom. Its left edge snaps to the first board-column edge that keeps it at most 720 px wide, so it never splits a column: Queued at 1440 (595 px, Needs you stays in view), Working at 1920 (637 px). Paper ground, the region rule on its left edge. Never over the chat.
- Header: ref, close, the title 20/24 bold, the facts in a 12 px row. Tabs as text with a 2 px ink underline on the current one.
- Overview: the top block as a two-column list (label in 12 px muted, value 16 px): Task, Status, Budget (muted under 80 percent, red sign above), Agent (muted). Then Open with its actions, then the collapsed sections as rows with a hairline and a +/− mark.
- Activity and Files: tables in 12 px, numbers right-aligned, the gate meter as a 4 px ink bar.

## The phone

- Under 900 px one column: the top bar (home word, project select, Menu for the rest), the pulse (22/28), the state word, then the figures as a 2×2 grid with the numeral at 22 px and its label under it, the chat with its log at 55 percent of the viewport and the composer, then the board sections: Needs you open, Working, Verifying, Queued, Done collapsed.
- Choices and the primary actions full width, 40 px tall. The drawer takes the full screen.

## Motion

- Hover: links underline; quiet buttons fill with ink; the red primary turns ink. 120 ms colour transitions.
- Focus: a 2 px ink outline, offset 2 px, on everything.
- The drawer slides 16 px in from the right with a fade, 160 ms. The typing indicator is a blinking block cursor.
- Reduced motion: no slide, no blink, no transitions.

## Where the inventory goes

- Page shell: as the top bar above. The flash line sits under the top bar, the live-stream line in a footer row; both appear only when they have a message. Keys overlay on "?".
- Card face: issue link, PR link, timeline link, objective, summary, plan cards, summary and accent forms and the model alias live in the drawer. Accent chip, blocked by, part of plan, fine states, lane badge (wide view) stay on the face.
- Needs you: migration files, findings, earlier reviews, the audit and why a human live in the drawer's Reviews and audit; "Details" on the item opens it. The verdict buttons stay small at the item's end.
- Chat: the start line opens every log; the old-conversations select sits in the chat header.
