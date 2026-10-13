# Theme: Command palette

Read off round 01 `10-command-palette-dark.png`, `10-command-palette-light.png` and the director's notes (no round 02 images). The images are the target; this file is the rule set a builder follows when the image is ambiguous.

## Idea in one line

Raycast for a software project: one large frosted command bar under the pulse is the place to act, the conversation hangs under it as a sheet of fixed height, and the board lies below as dense, quiet tiles.

## Tokens

| Token | Dark | Light | Use |
|---|---|---|---|
| --bg | #141417 graphite | #f1f1f4 pale grey | page |
| --bg-raised | #202024 | #ffffff | cards, the drawer |
| --bg-glass | rgba(30,30,35,.74) + blur 22 px | rgba(255,255,255,.76) + blur 22 px | the command bar and its sheet |
| --bg-sunken | #18181c | #e7e7ec | the board's column wells, inputs |
| --line | rgba(255,255,255,.07) | rgba(24,24,40,.09) | hairlines |
| --text | #ececf0 | #18181c | |
| --text-muted | #a1a1aa | #5b5b66 | meta, figures |
| --text-faint | #8a8a94 | #60606b | done cards (4.5:1 on the well) |
| --accent | #6e56cf fill, #b3a4ff text | #6e56cf fill, #5b43c4 text | links, focus ring, the primary button, the bar's caret |
| --need | the accent: violet ring, violet tint rgba(139,116,255,.075) | 1 px violet rule rgba(110,86,207,.85), violet fill rgba(110,86,207,.085), the column well #e9e5f5 | Needs you items and their column |
| --warn | #e8b14a | #935700 | the prominent pulse, near budget, stale |
| --st-running | #6cb4ff | #1d68c7 | blue |
| --st-waiting | #e8b14a | #935700 | amber: on a human, on dependencies, on the provider |
| --st-review | #4cc4ae | #0a7466 | teal (violet is taken by the accent) |
| --st-done | #63c587 | #1f6e3c | green, the glyph only |
| --st-failed | #f2705f | #b3301f | red |
| --st-closed | #8b8b95 | #66666f | grey |

Dark shadows are inner: a 1 px top highlight `inset 0 1px 0 rgba(255,255,255,.04)` on raised things, `inset 0 1px 2px rgba(0,0,0,.35)` in wells. Light swaps them for soft outer drops `0 1px 2px rgba(16,16,32,.06)` and a deeper drop under the bar. Radii: 8 px cards and buttons' containers, 6 px buttons, 4 px chips and key caps, 12 px the palette and the drawer.

## Type

One family, the system sans (`-apple-system, Segoe UI, Inter, Noto Sans, system-ui`), mono for the activity line and tool blocks. Tabular numerals everywhere. Scale: 11 px labels and key caps, 12 px column headers, meta and figures, 13 px body and card titles (weight 500), 14 px the chat log and the Needs you headlines, 15 px/600 the pulse sentence, 16 px the bar's input, 17 px/600 the drawer title. Mono 11.5 px. No uppercase anywhere; labels are normal case, semibold, muted.

## Layout at 1440 and 1920

- Top bar, 48 px, one row: "Factory console / project ▾" left, the page links centre-right, the theme key, the user, Log out, the scenario select last.
- 900 to 1699 px: one centred column of 820 px holds the pulse strip, the command bar and its sheet; the board spans the full width below, never under the sheet. The sheet is at most 34 percent of the viewport high and scrolls inside, so the first Needs you item and its buttons sit on the first screen at 1440×900; a chevron collapses it to the bar alone.
- 1700 px and wider: the column docks left at 560 px, sticky, the sheet filling the height; the board takes the rest on the right.
- The drawer docks at the right edge below the top bar, 46 percent wide, at most 720 px, over the board. While it is open the centred column slides left into the free space, so it never covers the bar or the sheet.
- Wide view (w): the board becomes two swimlanes, the Human lane (Approvals, Escalations, Human tasks) above the Agent lane (Backlog, Plan, Ready, Review, Done), lane badges and drag handles on.

## The pulse

A strip as wide as the bar, directly above it. The sentence first at 15 px/600, "more" at its end opening the bullets; the status figures under it in a 12 px tabular row. Prominent: an amber tint, a 3 px amber rule on the left, the ⚠ sign. Subdued: no tint, no rule, a state dot instead of the sign. Exceptional figures speak in their hue: "n need you" violet, an overspent cap red, "n on the provider" amber.

## The chat

One frosted panel. The bar: a violet prompt glyph, a 16 px textarea ("Ask or tell the project…") that grows to five lines, the `/` key cap while unfocused, Send with its ↵ cap, the collapse chevron. Focus rings the whole palette in violet. The sheet under it: header "Chat", "project agent · project", New conversation, the old conversations select. The sheet is at most 34 percent of the viewport, fades out at its top edge and opens on the last exchange; an empty conversation shows no log at all. Your message is a raised bubble on the right; the agent reply is plain text on the panel at a 72-character measure; a tool block is one mono line with a disclosure; a proposal is a violet-ringed card, "I will:" and the changes, Do it (violet, primary) and Skip (quiet). Do it turns it into a green "applied" line with undo, and the board shows the change on the cards it names ("Answered: Postgres" on #603, "Moved to ready" on #620); undo restores both. Footer: "This is your own conversation…" left, the key hints right (Enter send, Shift Enter break the line, Esc leave). The queue of waiting messages sits between the bar and the log, each with edit and remove.

## The board and the card

Column wells with a 12 px semibold header and a count in a mono capsule; Needs you's header and filled count in violet. An empty column is a faint hatched slot. Card: #ref (muted, tabular) inline with the 13 px title, two lines at most, the title opens the drawer. State row 12 px: a dot and the state word in its hue, elapsed, then only the exceptional: n/n checks, spend from 80 percent with ⚠ near its budget, the gate and its age, stale words, on the provider. Activity line mono, one line, on working cards; on a verifying card only with a gate or a failing check, a failing one red over two lines. Chips only when exceptional: blocked by n (names on hover), part of plan #n, waiting on #n, the accent. Actions: a row of 22 px quiet buttons, always visible. Done, failed, closed: no tile, two faint lines (title; glyph, state word, elapsed), all in --text-faint, no green, so Done sits behind Working; a failed row's mark and word take a muted red (70 percent --st-failed into --text-faint).

## Needs you

Raised cards with a violet ring and tint, the only coloured surfaces on the board. A small caps kind label with the age, the headline at 14 px/600. Merge approval: "Merge PR #n", chips "high risk" (red) and "migration" (amber), the review line, the security audit's finding in amber (the exceptional fact), the recommendation ending in a Details link (opens the drawer at Reviews and audit), then Approve as you (primary), Deny (opens the reason and the requesting changes / rejecting choice), Split. Escalation: the title as headline, the question, the choice buttons, "Or in your words" as a disclosure, the verdict buttons small at the end. A capped card shows the text box open with "Grant one session with this answer". Plan, resource and human task items follow the same card (no scenario carries one).

## The drawer

Raised panel, 12 px left radius, a deep shadow. Header: #ref (link to the issue), the title 17 px, close with the Esc cap; a facts row (state, elapsed, checks, spend, lane badge, PR). Tabs Overview, Chat, Activity, Files as an underlined segmented row. Overview: the top block as a four-row definition list (Task, Status, Budget muted under 80 percent, Agent muted), the open need in a violet card, then the collapsed sections Objective, The agent's summary, The plan, Reviews and audit, Related cards, Edit, Links. Chat tab: the turns as in the main sheet (the agent with its mark and a name line, the member as a bubble), 8 px between turns with a hairline; the steer box docks at the drawer's foot as a small command bar (frosted, 12 px radius, violet focus ring, Send with ↵).

## The phone

Under 900 px one column: the top bar (home, project, a Menu key that opens the links, theme, user, Log out, scenario), the pulse strip, the bar with its sheet at 55 percent of the viewport, then the board as stacked sections in the order Needs you, Working, Verifying, Queued, Done, Done collapsed. Needs you actions (Approve as you, Deny, Split, the choices, "Or in your words" and its Answer or Grant) one per row, full width, 44 px tall, the label left-aligned at 16 px, on both items; the answer box full width, 88 px. The drawer takes the full screen.

## Motion

120 ms colour fades on hover. Focus: a 2 px violet ring with 2 px offset. The typing indicator: three dots pulsing. The drawer slides 16 px in with a fade, 160 ms; the column slides left with it. Reduced motion: no slide, no pulse, static dots.
