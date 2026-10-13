# Theme: Geist contrast

Read off round 01 `02-geist-contrast-dark.png`, `02-geist-contrast-light.png`, the round 02 images (drawer, idle, phone) and the director's notes. The images are the target; this file is the rule set a builder follows when the image is ambiguous.

## Idea in one line

Vercel's Geist: pure black or pure white, greys for everything normal, one warm amber that means "a person is needed", exact type and 1 px rules instead of boxes.

## Tokens

| Token | Dark | Light | Use |
|---|---|---|---|
| --bg | #000000 | #ffffff | page, the chat |
| --bg-board | #000000 | #fafafa | the board region: the same black at night, a grey tray by day |
| --bg-raised | #0a0a0a | #ffffff | the drawer, the composer, the proposal, the keys overlay |
| --bg-sub | #1a1a1a | #f2f2f2 | your chat bubble, chips, the tool block's body |
| --line | #1c1c1c | #ebebeb | rules between board rows |
| --line-region | #292929 | #e3e3e3 | hairlines between regions and columns |
| --line-strong | #3a3a3a | #d1d1d1 | borders of controls, the proposal, the composer |
| --text | #ededed (17.9:1) | #171717 (17.9:1) | titles, body |
| --text-muted | #a1a1a1 (7.9:1) | #5c5c5c (6.7:1) | meta, state rows, the figures |
| --text-faint | #808080 (5.3:1) | #707070 (4.7:1 on #fafafa) | done rows, times, the activity line |
| --accent | = --text | = --text | links, focus ring (2 px, offset 2), the primary button (#ededed on black, #171717 on white) |
| --need | #ffb224 (11.6:1) | #a35200 (5.6:1) | Needs you headings, the pulse's warning sign, "waiting on you", "n need you" |
| --need-fill | #ffb224, text #0a0a0a | #ffb224, text #171717 (9.9:1), border #d18a0a | Approve as you, Grant one session, Accept plan |
| --need-tint / --need-line | amber 7 % / amber 38 % | #fff6e5 / #f0c987 | the Needs you item's ground and edge |
| --need-muted | #b0b0b0 | #4a4a4a (8.3:1 on #fff6e5) | replaces --text-muted and --text-faint inside Needs you items and the drawer's open need |
| state hues | greyscale | greyscale | running: filled dot in --text, pulsing; in review: filled dot in --text-muted; queued, backlog, waiting on dependencies: hollow ring; waiting on a human: amber dot; done: check; failed: cross in --text; closed: slashed circle. The word always follows the glyph, so colour is never the only signal |

Elevation: dark uses hairlines only; light adds soft shadows (drawer `-12px 0 40px rgb(0 0 0 / .08)`, composer and proposal `0 1px 2px rgb(0 0 0 / .04)`). That and the grey board tray make light a day mood, not an inversion.

## Type

- Sans: Geist, then Inter, SF Pro, Segoe UI, Helvetica Neue, Nimbus Sans, Arimo, Arial. Mono: Geist Mono, then SF Mono, JetBrains Mono, Menlo, Consolas, Liberation Mono.
- Tabular numerals everywhere (`font-variant-numeric: tabular-nums`).
- Pulse sentence 20 px (24 px at 1920), weight 600 when prominent, 500 subdued, tracking -0.02em. Status figures 13 px.
- Chat body 15/24. Composer 15/22.
- Board: card title 13/18 weight 500, state row 12/16, activity line mono 11.5/16 (two lines at most in the narrow columns), chips 11 px, column heads 12 px small capitals with tracking 0.04em.
- Drawer title 20 px 600, tracking -0.02em; body 14/20.
- Spacing on a 4 px grid: 4, 8, 12, 16, 20, 24, 32. Radii: 6 px controls, 8 px Needs you items and the proposal, 12 px the composer.

## Layout at 1440 and 1920

- Top bar 48 px: "Factory console" / project select (the slash is Vercel's scope separator), the page links with the current one underlined 2 px at the bar's foot, then the scenario switch, theme, "sebastian", Log out.
- Pulse band full width under it, 24 px side padding: the sentence line, then the figures row.
- Below: the chat LEFT at 52 percent, the board RIGHT at 48 percent, one hairline between. The mockup had the board left and the chat right; the chat moves left so the drawer, docked at the right screen edge, covers the board only.
- The chat's log and composer sit in a centred column of at most 680 px (720 px at 1920), as in v0.
- The board: header row (Board, accent select, Wide view, ?), Needs you as a band across the board's top with its items side by side, then four columns Queued, Working, Verifying, Done separated by hairlines. Five columns side by side would be 120 px each at 1440; the band keeps the five groups of ruling 255 and gives the decisions room.
- Drawer: absolute in the split region, right edge, `min(46vw, 720px)`, below the pulse band, so it never covers the chat (52 percent) or the pulse.
- Wide view: the board takes the full width of the split, Needs you becomes the first of five columns and the lane chips show.

## The pulse

Prominent (a card needs a person): the amber warning sign before the sentence, weight 600. Subdued: no sign, weight 500. Figures: state dot and word, n working, n waiting on the provider (only when any), n need you (amber link when above 0), spend / cap (link; over the cap: the warning sign in --text, weight 600), GitHub. "more" opens the bullets under the sentence, "less" closes them. While recomputing (on a scenario switch) three dots replace the sentence for half a second.

## The chat

- No panel box: the chat is the page's own black or white; it reads as the main region by width, the 15 px type and the large composer.
- Header: "Chat", "project agent · project", old conversations select, New conversation (secondary button).
- The start line tops every log, centred, 14 px muted, a 1 px rule under it: "Ask or tell the project agent. It reads, explains, moves, answers, steers and approves as you, through the console's own actions; it runs no code." The messages sit at the bottom of the log, by the composer, so the start line fills the space above a short history.
- Yours: right-aligned bubble on --bg-sub, radius 14/14/4/14, time under it in --text-faint.
- Agent: label "project agent · 14:21" in 12 px muted, text plain at full measure (72 ch).
- Tool block: one quiet row, chevron, mono name, "· 0.4 s"; opens to arguments and result.
- Proposal: --bg-raised, 1 px --line-strong, radius 8: "I will:" 600, the changes as a list, the detail in muted 13 px, Do it (primary) and Skip (ghost). Applied: one muted line with a check, the changes, "undo".
- Composer: --bg-raised box, radius 12, three rows, Send primary at the bottom right, the own-conversation line at the bottom left in 12 px faint. Focus: border --text-muted plus a 3 px soft ring. The queue lists under the box, each line an editable field and a remove button.

## The board and the card

- Column heads: small capitals, --text-muted, the count in --text-faint; a 1 px rule under each.
- Card: no box. Rows divided by 1 px --line, 10 px vertical padding. Line 1 a button: ref in --text-muted, title in --text, two lines at most. State row: glyph, state word, elapsed, then only the exceptional: n/n checks, gate and its age, PR, spend with the warning sign from 80 percent, in --text. Activity line in mono 11.5 px --text-muted on working and waiting cards only.
- Chips: 11 px on --bg-sub, radius 4. Exceptional chips (stale, on the provider, at its cap) are outlined in --text instead. The accent chip is the accent's name only: no hue, the board stays monochrome.
- Stale card: an inset 1 px ring in --text-faint and "nothing for 40 min" in --text.
- Done shows at most 12 rows, then one faint line "and n earlier" linking to the full list.
- Done, closed: one line, glyph, ref, title, ellipsis, all --text-faint; the state word is in the glyph's label, the time in the row's title. Failed: two lines, the cross and title in --text, "failed · elapsed" under it.
- Actions: 24 px ghost buttons, 1 px --line-strong, radius 6, visible always.
- Hover: the row takes --hover; the title underlines. The open card keeps --hover-strong.

## Needs you

- The only boxes on the board: --need-tint ground, 1 px --need-line, radius 8, padding 14/16. Heading in --text 14 px 600; the band head "Needs you" in --need.
- Merge: "Merge PR #n" (opens the drawer at Reviews and audit), the risk and migration as amber-outlined chips, the waiting time right; the task title; "Model review: verdict. summary"; "Recommendation: …"; Approve as you (amber fill), Deny (opens the reason box and the "Deny by" choice), Split. Deny and Split are outlined in --need-line-strong, the same 32 px box as the primary.
- Escalation: the ref and title as heading, the question, the choices as amber-outlined buttons, "Or in your words" (opens the box) and the small verdict buttons at the end. Capped: the box is open and its button reads "Grant one session with this answer" in amber fill.
- Plan and resource approvals follow the merge's pattern (heading, two fact lines, amber primary first); no scenario carries one.
- What makes them loudest: the only amber on the board, the only boxes, the only filled buttons.
- An empty Needs you shows its head with 0 in --text-faint: no amber when nothing waits.

## The drawer

- --bg-raised, 1 px --line-region on the left; light adds the shadow. Slides in 16 px with a fade, 180 ms.
- Header: ref (the issue link), lane and model chips, close; the title; the state row as on the face plus the PR link.
- Tabs Overview, Chat, Activity, Files: 14 px, --text-muted, current in --text with a 2 px underline on the tab rule.
- Overview: the top block as a two-column list (Task, Status, Budget, Agent; Budget muted under 80 percent), then "Open" when something needs the member, then collapsed sections with a chevron and 1 px rules: Objective, The agent's summary, The plan, Reviews and audit, Related cards, Edit, Links (each only when it has content; Edit and Links always).

## The phone

Under 900 px one column: top bar (the home word over the project select, a menu button for the links, the switch, theme, user and Log out), the pulse, the chat with its log at 55 percent of the viewport height and the composer, then the board: Needs you in full, every button in it full width, one per row, 44 px tall, then Working, Verifying, Queued, Done, each a section whose head toggles it; Done starts collapsed. The drawer takes the full screen.

## Motion

Hover: background and colour, 120 ms. Focus: a 2 px ring in --text, offset 2. Running dots pulse in opacity every 2 s. The typing indicator: three dots stepping in opacity. The agent's reply streams in with a block cursor. The drawer slides 16 px and fades in 180 ms. `prefers-reduced-motion: reduce` stops every animation and streams the reply at once.
