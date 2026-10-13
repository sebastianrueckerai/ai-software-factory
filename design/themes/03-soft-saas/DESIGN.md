# Theme: Soft SaaS

Read off round 01 `03-soft-saas-light.png` (the lead), `03-soft-saas-dark.png` and round 02 `03-soft-saas-drawer.png`, `-idle.png`, `-phone.png`. The images are the target; this file is the rule set a builder follows when the image is ambiguous.

## Idea in one line

Notion or Stripe's dashboard for someone who is not technical: warm paper, white rounded cards that float on soft shadows, pastel pills, one ink colour for every action, and a coral tint that only appears where a person is needed.

## Tokens

| Token | Dark | Light | Use |
|---|---|---|---|
| --bg | #1B1A18 | #F6F3EE | page, warm, chroma under 0.01 |
| --bg-raised | #252321 | #FFFFFF | the chat panel, cards, the drawer, the pulse when subdued |
| --bg-sunken | #151413 | #F0ECE6 | tool blocks, your bubble, the composer's well, table heads |
| --line | #34312E | #E8E2DA | hairlines, card borders in dark |
| --text | #EDEAE5 | #27231F | 14.5:1 / 15.6:1 |
| --text-muted | #A39C93 | #6B635A | meta, done cards; 5.8:1 / 5.9:1 on raised |
| --accent (ink) | #EDEAE5 | #2B2622 | primary buttons, links, the active tab, the focus ring; ink, not a hue |
| --need | text #F6AE95, tint coral at 10 % | text #B23E1E, tint #FCEAE2, edge #F0BFAE | the Needs you column, its cards, the prominent pulse, "n need you" |
| --st-running | #A9C1FF on blue 16 % | #2350B8 on #E6EEFD | |
| --st-waiting | #F2C27A on amber 16 % | #8A5300 on #FCEFD8 | waiting on a human, dependencies, the provider; near budget |
| --st-review | #C8B2FF on violet 16 % | #6338B5 on #EFE9FC | in review |
| --st-done | #8FD3A8 on green 15 % | #2A6D45 on #E2F2E7 | |
| --st-failed | #F7A1A1 on red 16 % | #AE2A30 on #FCE4E2 | failed, over the cap |
| --st-closed, backlog, queued | #BDB5AC on warm 7 % | #5C554D on #EEEAE4 | |

On the coral Needs you card the risk and migration chips take darker light-theme text (#8E1F26 on #FBE1DF, 7.1:1; #4E2A94 on #EDE6FB, 8.3:1). Pill text is 4.5:1 on its fill; the pill's dot is 3:1 on the fill, so a pill reads without its tint. Every state also has its word or its glyph (check, cross, slash), never the hue alone.

Radii: cards 12 px, panels (chat, pulse, drawer) 16 px, buttons and inputs 10 px, the composer 16 px, pills round. Shadows light: cards `0 1px 2px rgb(40 30 20 / 6%)`, panels add `0 10px 30px -12px rgb(40 30 20 / 18%)`, Needs you cards a coral-tinted shadow. Dark replaces shadows with a 1 px `--line` border and a deep drop shadow only on the drawer.

## Type

One humanist sans: `-apple-system, "Segoe UI Variable Text", "Segoe UI", Lato, system-ui`. Mono only for the activity line, tool arguments and file paths: `ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", "Fira Code", "FiraCode Nerd Font", Menlo, Consolas`.

| Role | Size / weight |
|---|---|
| body, chat text, Needs you text | 15 px / 400, line 1.5 |
| pulse sentence | 18 px / 600 |
| status figures | 13.5 px / 500, tabular |
| Chat heading, drawer title | 17 px / 650, 20 px / 650 |
| card title | 14 px / 500, two lines at most |
| Needs you headline | 15.5 px / 650 |
| state row, chips, column counts | 13 px, 12 px |
| activity line | 12.5 px mono |

Numerals are tabular everywhere a figure sits: counts, spend, elapsed, times, tables.

## Layout at 1440 and 1920

- Top bar, 56 px, on the page colour with a hairline: the home word, the project select as a pill, the page links as soft pills (the current one filled), then the scenario switch, the sun-moon toggle, the user with an initial, Log out.
- The pulse band, full content width, 16 px radius.
- At 1440 the chat is the centre column, at most 960 px, a white panel of fixed height (`clamp(400px, 100vh - 470px, 560px)`) so the board never jumps; while something needs a person the log is capped at `min(36vh, 100vh - 640px)` (floor 150 px) and scrolls inside (its top edge fades); if the first Needs you item's action row (Approve as you, the choices, or Grant one session) still crosses the fold, the log yields the difference, so that row is always on the first screen; the board is a flat shelf of five columns across the full width under it. Columns `1.5fr 1fr 1fr 1fr 1fr`, Needs you widest.
- At 1700 and wider the shelf sits beside the chat: the chat 680 px on the left, sticky, at the height of the view, the log anchored to the composer; the board fills the rest with Needs you at 1.75fr.
- The drawer docks at the right edge, 8 px from the edge, from under the top bar to the bottom, 46 % wide, at most 720 px. While it is open the chat and the pulse re-centre in the space left of it; the board stays where it is and the drawer covers its right part.
- Wide view: the board turns into two lanes, Human lane (Approvals, Escalations, Human tasks) and Agent lane (Backlog, Plan, Ready, Done); backlog cards carry a drag handle and drop into Plan or Ready.

## The pulse

Prominent (a card needs a person): the band takes the coral tint and edge, a coral warning glyph in a round badge leads the sentence. Subdued: a white panel, no glyph, the sentence in ink. Under the sentence, one row of figures separated by thin dots: the state with its dot, n working, n waiting on the provider, "n need you" as a coral pill when above zero, spend / cap (a red pill when over the cap), GitHub. "more" opens the bullets in the band. Three dots replace the sentence while it recomputes.

## The chat

A white panel with a header row (Chat, "project agent · project", the old conversations select once there is one, New conversation). Your message is a right-aligned sunken bubble with its time. An agent reply is plain text on the panel beside the agent mark (a sparkle in a 9 px-radius tile), its time under the mark, the reply, its tool blocks and the proposal left-aligned beside the mark and up to 72 characters wide. A tool block is a sunken rounded row, collapsed: wrench, name, duration, the result's first line, muted; open shows arguments and result in mono. A proposal is a white card with a hairline and a soft shadow: "I will:", the changes as a list, the detail muted, Do it (ink) and Skip (quiet) on the right. Applied is one line with a green check and Undo. The composer is a big 16 px-radius field with Send inside it, one row that grows to six; the queue sits under it as removable chips; the own-conversation line under that, small. Empty: the agent mark and the start line centred.

## The board and the card

Column headers are sentence case 14 px semibold with a round count; Needs you's header and count are coral. A card is white, 12 px radius, 12 px 14 px padding: ref muted plus title (opens the drawer), the state pill then muted meta joined by middle dots (elapsed, checks, gate and age, PR), then an amber line only when something is exceptional (spend from 80 % with the warning sign, the stale words), the activity line in mono only while working or waiting, chips only when exceptional, actions as small quiet buttons. A stale card gets a dashed amber edge. Done, failed and closed are not cards: one row each on the page colour, a small glyph (12 px green check at 75 %, 11 px muted red cross #C0716C / #B9817D at 60 %, a grey slash), ref, title and elapsed time in the muted token; failed says "failed" in muted red at regular weight. Empty columns show a quiet dashed slot with no words ("empty" for screen readers).

## Needs you

The column sits in a coral-tinted 18 px well, and only while something waits; empty, it is a plain column with a dashed placeholder like the others. Each item is a card with a coral edge and a coral-tinted shadow, 16 px padding, 15 px text, full-size 36 px buttons: white in light; in dark the card takes a coral tint at 10 % over the card colour, a 3 px coral rule on its left edge, and the well a coral hairline, so it stays the loudest thing on the dark board. Merge: headline, risk and migration pills, Model review and Recommendation as labelled lines, Approve as you (ink), Deny, Split; Deny opens the reason box with the requesting-changes or rejecting choice. Escalation: ref and title as the headline, the question, the choices as outlined buttons, "Or in your words" opening the answer box, the verdict buttons small at the end. Capped: no choices, the answer box open, "Grant one session with this answer". Plan and resource approvals follow the same card. Loudest because it is the only tinted column, the only coral edges and the largest buttons on the board.

## The drawer

A floating white panel with a 16 px radius and a deep soft shadow. Header: ref and title at 20 px, the facts as pills and meta, the close button; tabs Overview, Chat, Activity, Files as an underlined row. Overview: the four-line top block as a two-column definition list on a sunken card, the open need with its actions, then the seven sections as rounded disclosure rows. Chat: the session line, messages, the steer box as a small composer.

## The phone

Under 900 px one column: the top bar keeps the home word and the project, the rest moves into a menu sheet; the pulse band; the chat with its log at 55 % of the view; then the board as stacked sections in the order Needs you, Working, Verifying, Queued, Done, each with a chevron; Done starts closed. Needs you's choices and actions go full width, one per row, 44 px tall, 15 px text, 12 px 16 px padding, 8 px apart. The drawer takes the full screen.

## Motion

Hover lifts a card by its shadow, never by moving it. Buttons darken by one step in 120 ms. Focus is a 2 px ink ring with a 2 px gap. The drawer slides 16 px in with a fade in 200 ms; the chat re-centres in the same time. The typing indicator is three dots that pulse. `prefers-reduced-motion` turns every transition and animation off.

## Where every control of the inventory goes

- Page shell: the top bar; the flash line under it; the live-stream line in the page footer; the keys overlay from the board header's "?".
- Filter: project in the top bar (changes on select), accent and wide view in the board header; Show is gone (the selects apply on change).
- Status line: the figures row of the pulse band; the project name is the top bar's select.
- Card face: as above. Model alias, accent forms, objective, agent's summary, the plan's cards, PR and timeline links move into the drawer (Overview top block and sections). Retry moves into the drawer's open block of a failed card.
- Needs you: merge facts, earlier reviews, the audit and why a human sit in the drawer's Reviews and audit.
- Old conversations: the select appears in the chat header once a second conversation exists.
