# Round 11 notes — the director's view

2026-10-19, one session. The constraint: current style, colours and shape
language stay; only the organisation moves. Round 10's restylings are dead; its
reorganisations carry.

## Recon

- The real markup and geometry, read from the code repository at HEAD:
  - `#screen.with-chat { grid-template-columns: minmax(18rem, var(--chat-share, 4fr)) 10px minmax(30rem, 1fr) }`
    (console.css:723) — the chat's floor is 18 rem = 288 px.
  - `.chat.with-threads { grid-template-columns: 212px minmax(0,1fr) }`
    (console.css:1054) — the threads table takes 212 px of that 288 px, leaving
    the conversation about 60 px plus padding. Sebastian's complaint 2, in
    numbers: the floor is the problem, not the board (30 rem is right).
  - The window controls are word buttons: `Full` in the chat head
    (chat.html), `Grow` beside the composer; both 22 px tall, class `xs`.
  - The divider is a 10 px column, hover turns its rule cyan; no grip, no
    glyph (console.css:724-726).
  - The panel's dependency list is a `dl.sp-dl`, a row per service:
    dot · state · detail · age (board.html, "status" define). Five rows.
  - The drawer is `aside#drawer`, its Chat tab missing at HEAD (lab finding);
    the document view is `aside#doc-view`, overlaid across the screen.
- Round 10's lab-built sheets were already in the real stylesheet and carry:
  the A-D window-control states with the painted tooltip, the dependency lamp
  chips with "up · under a minute ago" on hover, the auto-grown composer, and
  the secondary pages (Settings readout, Costs day-cap gauge, 62 rem measure).

## Directions, built not generated

All six are full pages in the real `console.css` (copied at HEAD), the same
busy content throughout: four columns (Needs you lit with an escalation and an
approval, Queued, In progress with a live card, Done folded), the strip with
its panel open, the threads unfolded, a four-line draft in the composer.

1. `d1-edge` — the control lives on the divider: a hover grip with the expand
   glyph at its middle, drag past 80% snaps full, and when full a "‹ Board"
   tab clings to the screen's left edge. The chat head keeps only Chat, the
   who-line, intake, New.
2. `d2-head` — the glyph toggle sits in the chat head beside the who-line:
   expand glyph, flips to its collapse twin when full, constant accessible
   name, tooltip names both directions, Esc also exits. The divider keeps
   drag with a hover grip.
3. `d3-tabs` — the threads leave the side table and become a CHAT | THREADS
   tab pair in the chat head; the conversation gets the panel's full width.
   This proposes reversing C14's beside-the-conversation table; recorded as
   the reversal question of the round.
4. `d4-floor` — the threads table stays beside, the chat floor rises to
   24 rem and the thread table tightens to 176 px; the conversation keeps
   about 210 px at the floor. Board minimum unchanged at 30 rem.
5. `d5-strip` — d4 plus the panel's three sections become two: Spend keeps
   its gauges, and Provider/GitHub/configuration/Dependencies collapse into
   one row of lamp chips (dot · name, age and detail on hover). The bare
   "provider ok" row goes; the waiting-on-provider warn chip stays.
6. `d6-drawer` — d4 plus the drawer's head carries CARD | CHAT tabs (the lab's
   missing tab, drawn), and the document view pins to the board's side instead
   of covering the chat.

Carried in every direction: the Grow button retires for the auto-growing
composer; tooltips on the intake, the thread unfold glyph, the divider, the
lamps; Esc exits the full chat.

## Costs

No generation. Critics only: 2 breadth + 2 compare = 4 runs, about $0.12.

## Render verification (post-fix)

Deterministic (Playwright geometry, d5): form 13→395 spans chat 12→396;
threads table bottom 709 = composer top 709; textarea 246×110.

- d2-head: clean. Composer spans, 5-line draft whole, threads intact.
- d1-full: two defects found and fixed — edge tab near-invisible (muted on
  raised; now var(--text)) and 90+ char measure in the full state (now the
  console's own 48 rem field measure, threads+conversation centered as a
  group). Re-shot, re-verified: tab readable, ~78-char lines, zero defects.
- d5-strip: clean. Critic claimed the composer does not span and ARCHIVED
  sits beside it — contradicted by geometry above; logged as critic error.
  Chips, gauges, lamp row, painted tooltip all render.
- d6-drawer: clean. Five tabs (Chat selected), #617 header with pills,
  thread-link, drawer composer, overlay correct. Critic's "pill covered by
  a badge" disproven by 4× crop of the cmds row: /plan /status /costs and
  Send cleanly separated; the "badge" was the draft's last fragment at 1×.
  No dimmed backdrop is the real drawer grammar (side panel, not modal).

## Breadth critics

Gemini ranking: d3-tabs, d2-head, d6-drawer, d1-edge, d4-floor, d1-full,
d5-strip. Carry: d3 + d6. Drop: d5 ("chat panel entirely absent").
Overruled with evidence (pixel truth beats montage-scale reading):
- "d5 has no chat, no composer" — geometry proves the chat column
  12→396 with the spanning composer and a 246×110 textarea; the cell
  was misread at contact-sheet scale.
- "d1/d2 composers cramped by the thread list" — the composer spans the
  chat; threads end above it (709 = 709). The 5-line draft is whole.
- "d1-full returns via a '< FACTORY CONSOLE' back link" — no such link;
  the way back is the edge tab plus Esc.
- "d4 has a Threads button on the floor" — the floor is a minimum width,
  not a bar; no button exists.
Kept from gemini: d3's composer-room argument is real (the tab pair
gives the conversation the full 384 px), and the C14 reversal question
stays open for Sebastian, not the critics, to settle.

glm ranking: d3-tabs, d1-edge, d6-drawer, d2-head, d4-floor, d5-strip,
d1-full. Carry: d3 + d1-edge. Drop: d1-full ("a mode, not a layout").
Overruled: glm's d5 ("chat collapses to a strip, hidden until
expanded") and d4 ("dock extends to the viewport floor") are the same
montage-scale misreads as gemini's; d1-full's way back is the edge tab
plus Esc, not a back-chevron. Kept: both critics crown d3, both put d6
third — the drawer chat tab earns its place twice.

## The composer equality (deterministic)

d3-tabs and d5-strip both give the textarea 246×110 at the compact
split. The spanning move equals the tab pair's composer; d3's remaining
advantage is only the wider conversation column (382 vs 206 px), paid
for with the C14 reversal and threads behind a tab.

- d1-edge: clean. Grip reads as a vertical pill at the divider's middle
  (accepted drag affordance; whole column is the target), head controls
  intact, spanning composer whole.
- d4-floor: clean. Critic claimed the composer spans the conversation
  only and the last draft line clips — geometry: form 13→395 spans chat
  12→396, threads end 709 = composer top, textarea 246×110,
  scrollHeight − clientHeight = 0, box inside the viewport. Misread.

All seven directions verified; every "composer cramped/clipped/absent"
critic claim across d1, d2, d4, d5 is disproven by the same geometry.
The shared misread has a cause worth recording: at the spanning
composer, the threads column ends flush at the composer's top-left
corner, and vision critics pattern-match that seam as "something sits
beside the composer". The build should keep a hairline above the
threads table's end so the span reads clean even at a glance.

## Compare loop

A = the bundle (d5 compact rest + d6 drawer), B = d3-tabs single.
Both critics pick A.

- gemini: A. Composer boxes identical (matches the measurement);
  glanceability "a core requirement"; chips "reduce noise, they do not
  create it"; drawer chat "earns its place"; A keeps the operator's
  place. One change: the New button sits above the thread list.
- glm: A. "The thread list is not a navigation menu — it is a secondary
  radar"; drawer chat "a context-preserving depth cue"; A keeps the
  mental place where B keeps only the physical. Overruled: glm judged
  "the strip compression as seen in Candidate B" — the chips are A
  (image 1) and the text rows are B (image 3); the mapping flipped.
  Half-stands from that misread: (1) a DOWN chip carries its age inline
  ("postgres · down 51s"); up chips keep dot · name with age on hover —
  recorded as a build note; (2) "widen the floor or make the splitter
  draggable" — the splitter is already draggable (the divider drag with
  its hover grip); the 24 rem floor is round 10's settlement and stays.

Director: A is the recommendation; d3-tabs stays the recorded
alternative if Sebastian wants the C14 reversal. Build notes carried:
New above the thread list; inline age on down chips.

## Costs, final

4 critic runs × ≈ $0.03 = ≈ $0.12 of the $1 cap. No generation.

## Try pages (after Sebastian's request)

The shot candidates were static; Sebastian could not find or use the
affordances. Built two live prototypes, wired in vanilla JS on the same
markup: cand/try-a-bundle.html (d5 rest + d6 drawer, panes for the five
tabs) and cand/try-b-tabs.html (d3 with the thread table back behind
the tab). Behaviors: divider drag and arrow keys with the 24 rem floor,
glyph toggle to full with the flipped glyph and the edge tab, Esc
(drawer first, then full), tooltips on every quiet control via
data-tip, card and need-card click opens the drawer with its number and
title, drawer tab switching, intake toggle, theme switch, both composers
append the sent message. Playwright-verified: every behavior asserted,
zero page errors (cand/test-try.js). Control circles drawn from
measured rectangles (cand/annotate-try.py) onto three annotated PNGs;
circle placement verified. The static d-pages stay as the round's
record; the try pages are the pick instruments.

## Sebastian's live verdict and the two fixes (2026-10-19)

Sebastian tried both, picked A, and asked for the input itself to be
resizable; he also reported the drawer's X overlapping the title.

The input sizer: a 10 px drag seam on the composer's top edge
(.growbar, a separator role, focusable). Drag sizes the input between
44 px and 60 vh; double-click resets; ArrowUp/ArrowDown step 24 px;
typing past the box grows it to fit, capped at 60 vh. The grip shows on
hover and focus as a small bordered glyph centered on the seam. Wired
in build-try.py for both try pages; verified: drag 110→230 px, reset to
110, key step to 134, auto-grow to 264 on 600 characters, B 110→190;
zero page errors (test-try.js a_grow*, b_grow). The rest shot hovers
the seam so the grip shows; circle 6 marks it.

The X overlap: root cause was my own tooltip anchor,
[data-tip] { position: relative }, which sits after console.css in the
cascade and unseated .drawer-close's absolute placement once the
title-to-data-tip conversion reached it. Same mechanism would have
unseated the absolutely placed edge tab. Fixed in CSS_COMMON: the
[data-tip] rule now comes first in the block, and .drawer-close's
absolute placement is re-asserted after it. Measured: close at
x 1388, position absolute; the title text ends at 1376 against the
36 px right padding console.css already reserves; no intersection
(test-try.js a_drawer.closeClear true). Both annotated PNGs reshot.

## The build (2026-10-19)

The pick, A with the input sizer, is built as 37cece0b on branch
round-11-build in the code repository (15 files, +326/−74). What landed:

- The chat's floor is 24 rem and the composer spans threads and
  conversation as the chat grid's third row, the queue chips under the
  input. The Grow button is gone: the box grows itself, capped at
  60 vh.
- The sizer seam on the composer's top edge (.growbar, a separator
  role, focusable): drag between 44 px and 60 vh, double-click resets,
  ArrowUp and ArrowDown step 24 px.
- The glyph in the chat head takes the screen: aria-pressed flips the
  twin paths, the name stays "Chat and board", the vertical "board"
  edge tab clings to the left edge, Esc exits unless a palette, pop,
  dialog or drawer holds the screen or a field has the caret, and the
  full state holds the 48 rem measure centered. The state persists.
- The panel's services are lamp chips: the age on hover, a down
  service carries its age inline; the spend gauges stay, the
  provider-ok row is gone.
- The drawer's fifth tab is Chat: the card's own conversation, the
  same POST and stream as the main chat (drawer.html had a real bug
  here, a template field that lost its $ scope inside the row loop;
  the new tab test caught it).
- The five secondary pages hold the 62 rem measure, pinned by a test;
  the board alone spans. Quiet controls carry native titles.

Race suite green (21 ok, no failures). The lab: 269 shots in both
themes, the structural check green, with the glyph, the sizer and the
five-tab drawer asserted in the browser, plus three new shots
(chat-full, chat-sizer, costs-1920). Build evidence:
[build/](build/) — the spanning composer on the board, the full chat
with its edge tab, the grown input under the sizer's grip, the lamp
chips behind the strip's click, the drawer's Chat tab, and the costs
page at 1920 on its 62 rem measure.
