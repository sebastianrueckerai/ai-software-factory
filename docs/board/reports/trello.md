# Trello

## Header

- Product and URL: Trello, https://trello.com, built by Fog Creek (2011), owned by
  Atlassian since 2017 (425 million USD).
- License and price: proprietary, closed SaaS, no self-hosting at any price. Free
  tier exists: 10 collaborators per Workspace, up to 10 boards per Workspace,
  unlimited cards, unlimited Power-Ups per board, 250 automation runs a month,
  unlimited activity log. Standard 5 USD per user a month billed annually (6 USD
  monthly): adds the AI features, unlimited boards, card mirroring, 1,000
  automation runs. Premium 10 USD annually (12.50 USD monthly): adds the
  Calendar, Timeline, Table, Dashboard and Map views, observers, data export.
  Enterprise 17.50 USD per user a month billed annually. Sources: the pricing
  page (shot [pricing.png](shots/trello/pricing.png)) and the automation quota
  doc.
- Alive? Yes, and shipping. 30 July 2026: seven AI features for every paid plan.
  2026 also added the Trello MCP server, the Inbox (capture from email, Slack,
  Teams) and Planner (calendar focus blocks). The pace is steady, far below
  Linear's, and the paid tier gates the new work.
- Studied how: studied live, logged out, on 2026-10-01 and 02. Public boards,
  standalone card pages, the tour, the template gallery, pricing and the MCP
  page all render without an account. The AI features and dark mode are
  documentation-sourced from Atlassian's blog and support docs, marked as such
  below. No account was created.
- One sentence: Trello is the original web kanban board for small teams, a plain
  board of lists and cards where every capability beyond the card face arrived
  later, as a plugin, a paywall or an AI sprinkle.
- Prior coverage: no 2026-09-29 market-research report exists for Trello under
  docs/market-research/projects/, so there is nothing to compare against. The
  phase 1 scan (docs/board/scan.md) is the baseline this report deepens.

## 1. The board model

### Columns

Lists are free-form and user-made. There is no fixed set, no default board, and
no meaning attached to a column beyond what the team reads into its position.
Trello's own public development board
(https://trello.com/b/nC8QJJoZ/trello-development-roadmap, shot
[board.png](shots/trello/board.png)) uses six: "New Features!", "Enhancements",
"Programming", "Design & UX", "Infrastructure", "Bugs". Those words carry all
the semantics. The product itself knows a list only as a sortable container:
WIP limits, card limits and column policies do not exist in the core and arrive
through Power-Ups or Butler rules.

### Card anatomy

The card face is one cover, one title and one row of badges. The annotated
specimen (shot [card-annotated.png](shots/trello/card-annotated.png), magnified
2x from the live board) shows the full order:

1. Cover image, full card width, optional, set per card or auto from an
   attachment.
2. Title, one or two lines, then clipped.
3. Label chip, a fixed palette colour with a board-defined name; the board
   setting toggles between showing names and showing colour-only stubs.
4. Description icon, a small glyph that appears only when the card has
   description text. No preview, ever.
5. Due badge, the date and time, colour-coded by the system (see section 4).
6. Member avatars, bottom right, with overflow stacking.

The same badge grammar covers counts: comments with a speech-bubble icon and a
number, checklist progress as "3/8", attachments with a paperclip and a number.
Every badge appears only when it has content, so an empty card face shows title
alone. Density: on a 1280-pixel screen about six columns show, a card with a
cover is roughly 220 pixels tall, without a cover about 90, so eight to ten
cards per column fit the viewport. Cards stay readable as thumbnails because
nothing but the cover competes with the title.

Behind a click (the "card back", shot
[card-detail.png](shots/trello/card-detail.png)) sits everything else: the
description body, checklists with their items, attachments, the comment and
activity feed, custom fields, dates detail, the cover picker, move, copy,
archive, watch, and every Power-Up panel the board has installed. The card back
is one long scroll with a fixed action rail on the right ("Add to card":
Members, Labels, Checklist, Dates, Attachment, Cover; then Automation, Actions,
Power-Up analytics).

Never on the board at all: description text, comment content, checklist items,
custom field values (only their icon or count on the face), archived cards
(they vanish to an archive), and any notion of work in progress.

### Where the human's decisions live

There is no decision surface. Trello has no approval, no accept/reject, no
inbox of pending questions. A card never waits on a human in any way the
product can express. The closest constructs:

- Assignment: a member avatar on the face, set from the board (hover plus a
  key, or the card back).
- Due date: a badge with a system colour as the deadline approaches.
- The 2026 Inbox gathers captured items from email, Slack and Teams into a
  personal triage list, capture only, no approve/deny either.
- Notifications: a bell drawer over the board; every card action by another
  member lands there.

Clicks from board to a decision: not applicable as a construct. The nearest
real action, marking a due date complete or ticking a checklist item, is one
click to open the card back plus one click on the control.

### Filters, swimlanes, cross-project views

- Filter bar on the board (opened with F): filter by label, member, due window
  and keyword. Matching cards stay, the rest grey out.
- Premium adds the other views: Calendar, Timeline, Table, Dashboard, Map,
  reached from a view switcher on the board.
- Cross-board: card mirroring (Standard) shows one card on several boards with
  synced state. Workspace-level table views (Premium) span boards.
- Swimlanes: none native. Timeline and Calendar views can group cards by list,
  member or label, which is the closest horizontal grouping. True swimlanes
  come from third-party Power-Ups such as Planyway.

## 2. Agent-task specifics

Not applicable as designed: Trello has no agent lane, no running-task states,
no logs, no cost, no stop button, nothing. No card ever shows that software is
working on it. Per the task brief, this section covers the 2026 AI features and
the MCP server instead, all documentation-sourced except where noted.

### The AI assistant features (paid, Standard and up)

Announced 30 July 2026 on the Atlassian blog "The Board Should Work For You"
(https://www.atlassian.com/blog/trello/the-board-should-work-for-you, shot
[ai-features-doc.png](shots/trello/ai-features-doc.png) holds the support doc).
Seven features, every paid user:

1. "Create a board with AI": a short prompt generates a full board, lists,
   cards, checklists, due dates, labels, covers and a matching background.
   Private by default. Web and desktop only. Support doc:
   https://support.atlassian.com/trello/docs/ai-generated-boards/
2. "Merge multiple cards into one": drag one card onto another and AI blends
   titles and descriptions, carries over links, attachments, fields and labels,
   archives the originals, and can be undone.
3. "AI-generated checklists": one click reads the card's title and description
   and suggests a checklist, editable and regenerable.
4. "AI-recommended focus time": with a connected calendar it suggests focus
   blocks, optionally scheduling cards due in the next five days. "Suggest,
   never change it without your say-so."
5. "AI-generated images" for board backgrounds and card covers.
6. "Set a due date from the card title": relative dates, specific dates and
   weekday references parsed while typing ("Submit report by Friday").
7. AI-generated widget cards (Trello Labs): "/widget" plus a prompt builds a
   richly formatted card.

The framing is an assistant for busywork, stated in the blog's own words:
"Keep the boards, lists, and cards you love. Outsource the rest to AI." Every
feature either sets the board up or tidies it. None of them reports on work in
flight, because no such concept exists.

### The Trello MCP server (free, all users)

Live page https://trello.com/mcp (shot [mcp.png](shots/trello/mcp.png)), server
endpoint https://sitemap.trello.com/mcp. Any MCP client (the page names Claude,
ChatGPT, Cursor) connects to the user's Trello account and can:

- Manage boards, lists and cards.
- Add, update and delete cards.
- Add comments.
- Manage checklists and checklist items.

Free of charge. This is the real agent story: an agent is an external actor
mutating the board through a tool API. The board shows no agent presence, no
live status, no run, no log. The only trace an agent leaves is ordinary card
mutations under its account name in the activity feed, indistinguishable from a
human's edits on the face.

Against this report's five questions: live status, agent conversation, mid-run
steering, approvals and budgets, multi-agent views: all absent, by design.

## 3. Interaction model

### Moving work

Drag and drop is the primary gesture, card to list, list to list, and card to
rank position. A move menu on the card back offers the same change by keyboard.
A drop changes list membership and sort order, nothing else. There is no state
machine behind the board: position is the only truth, and any consequence of a
move arrives through a Butler rule the team wrote (for example "when a card
moves to Done, archive it"), within the plan's quota.

### Keyboard and mobile

Keyboard support is broad and documented on Trello's own guide page
(https://trello.com/guide, verified live): "?" opens the shortcut overlay, "Q"
shows your cards on a board, the spacebar assigns you to a hovered card, "M"
adds members, "D" sets a due date, "L" opens labels, "F" opens the filter bar,
Shift-Enter saves a card and jumps to the card back. Mobile: native iOS and
Android apps, listed in the free plan, with drag and drop adapted to touch.

### Refresh model

The board is a single-page app. Updates from other members arrive without a
reload (documented product behaviour, not measurable from logged-out static
shots). Card movement, badge counts and new comments update in place. No manual
refresh exists in normal use.

### The click map

| Action | Clicks from the board |
|---|---|
| Read status (badges, due colour, position) | 0 |
| Read full detail (card back) | 1 |
| Decide (nearest: tick a checklist item, complete a due date) | 2 |
| Steer (nearest: write a comment on the card back) | 1 plus typing |
| Comment | 1 plus typing |

There is no read-receipt, no unread marker on the card face, no per-card "new
activity" state; the notification drawer carries that.

## 4. Visual system

### Themes and the colour split

Light is the default. Dark mode shipped 1 June 2023 after a beta in May 2023
(https://www.atlassian.com/blog/trello/introducing-trello-dark-mode, shot
[darkmode-blog.png](shots/trello/darkmode-blog.png) holds the published dark
board screenshot): available on the web app, the desktop apps for Windows and
macOS, and the iOS and Android apps, enabled from the profile menu. Board
backgrounds and cards adapt to it. Before mid-2023 the answer was "no dark
mode", for over a decade, while browser extensions filled the gap.

The colour split is the interesting rule:

- User-set colour: labels (a fixed palette of ten colours, each with a name the
  board defines, so "yellow" can mean "backend" on one board and "urgent" on
  another), board backgrounds, card covers, stickers, custom field colours.
- System-set colour: the due badge (yellow for due soon, red for overdue, green
  for complete, grey for a date further out, with a strikethrough and a ticked
  checkbox when complete; documented in the support docs, not re-verified
  on-screen), the notification dot, the complete-checklist strikethrough.

No column ever gets a system colour and no system state is expressed through
the label palette. The two channels never borrow from each other, so a reader
can learn the rule once and trust it on every board.

### Typography and density

One sans-serif family throughout, card titles about 14 pixels, bold, clipped at
two lines. List headers, badges and meta text run smaller and lighter in a
strict hierarchy. A screen at 1280 by 2200 holds about six columns and eight to
ten cards per column (shot [board.png](shots/trello/board.png)); the thumbnail
question is answered by omission: with a cover the image dominates, without one
the title is the largest element and every badge is 12-pixel scale or smaller.

### The status vocabulary

Every state a card can be in, and how it is told apart:

| State | How it shows |
|---|---|
| Plain open card | Title and badges in a list, no marker |
| Due soon | Due badge turns yellow (documented) |
| Overdue | Due badge turns red (documented) |
| Complete (due date) | Ticked checkbox, strikethrough, green tone (documented) |
| Archived | Gone from the board, held in the archive screen |
| Watching (subscribed) | An eye icon on the card back, nothing on the face |
| Has description | A glyph, no text, only when present |
| Has comments | A count badge, only when non-zero |
| Checklist progress | "x/y" badge, only when a checklist exists |
| Has attachments | A count badge, only when present |
| Assigned | Member avatars, bottom right |

Absent by design: any running, waiting, failed, blocked or needs-you state. A
Trello card has no lifecycle. The vocabulary is counts and deadlines, not
process.

## 5. What users say

The three most common complaints:

1. Performance and slowness, a recurring theme on r/trello across years:
   "Did they just launch a really performance-hoggy update?"
   (https://www.reddit.com/r/trello/comments/1fpnatj/), "Trello is very slow"
   with the Mac desktop app called out
   (https://www.reddit.com/r/trello/comments/q82eir/), and "Anyone else notice
   Trello is a bit slower than normal"
   (https://www.reddit.com/r/trello/comments/oue62j/). Power-Ups are a named
   suspect in these threads: each installed integration adds cost to a board
   that is already a heavy single-page app.
2. Interface churn that breaks learned workflows: "Congratulations, Trello is
   now hot garbage" (https://www.reddit.com/r/trello/comments/1m1wmjd/),
   written against a redesign whose side comment pane "eats up space".
3. Free-plan tightening over time: 2021 capped free workspaces at 10 boards
   while lifting the one-Power-Up-per-board limit, then May 2024 capped free
   workspaces at 10 collaborators and made boards beyond the limits view-only
   (https://www.reddit.com/r/trello/comments/1b8mqz2/ and the Atlassian
   community thread
   https://community.atlassian.com/forums/Trello-questions/Board-limit-of-10-what-happens-after-AND-quick-advice-on-how-to/qaq-p/1597037).

The three most praised details:

1. Ease of use, the standing top pro on G2: an interface new users understand
   in minutes, no training (https://www.g2.com/products/trello/reviews).
2. Butler automation, quoted saving real time with rules, buttons and
   scheduled commands, no code ("Butler Automation also saves us more time
   than I..."):
   https://www.g2.com/products/trello/reviews?qs=pros-and-cons
3. The visual board itself: drag and drop plus "status at a glance", the reason
   teams chose it and the reason they stay
   (https://www.gartner.com/reviews/product/trello).

## 6. Verdict for us

### Steal

- The badge grammar: icons and counts that appear only when they have content.
  Our card face: status pill plus counts that never render empty, so ten cards
  scan with zero filler.
- Two colour channels that never mix: system states own their colours, users
  own labels. Our board: status colours come from task state and never from
  user decoration, so colour keeps one meaning.
- The card face and card back split: everything behind exactly one click, the
  face capped at one cover, one title, one badge row. Our live task page is the
  card back, already item 22 of the ranked patterns.
- Standalone card URLs that render for any logged-out reader: shareable task
  links, item 11, proven at scale by Trello's public boards and card pages.
- The MCP tool surface: board CRUD plus comments on one documented page. Our
  gateway already plays this role for agents; Trello shows the surface stays
  small when the board is the agent's medium.
- Merge cards as the dedupe primitive for signal intake: one action that blends
  two cards and archives the originals, our repeat-alert rule (item 56) wants
  the same shape.

### Skip

- The Power-Up sprawl, and this is the Trello-got-big lesson. The plugin
  platform (2016) turned every missing feature into an install: a marketplace
  inside the board, per-board installs, features that exist on the web app and
  not on mobile, and a performance bill users blame the board for. The 2021
  pricing swap (unlimited Power-Ups, capped boards) monetised the sprawl
  rather than curbing it. What the board stopped doing well: staying one
  artifact. A card's capability now depends on which panels the board
  installed. We build one coherent surface; a feature is either in the card or
  it does not ship.
- Lists without semantics: position as the only truth works for humans who
  share a mental model, and hides all state from anyone who does not. We
  derive state from events (item 20), not from where a card was dropped.
- AI as seven setup conveniences behind a paywall: board generation, checklists,
  covers, focus time. None of it shows what work is doing. If our board shows
  AI at all, it summarizes run state, and it goes on the card face.
- A decade without dark mode while it was the top request, and upsell banners
  inside the working surface. Cheap, loud asks get answered fast, and the
  working surface stays free of pricing noise.
- A cookie wall and a login banner over content a logged-out reader was
  explicitly invited to read.

### Decision needed

- The label model: Trello's fixed ten-colour palette with per-board names
  versus free-form tags versus structured fields. Ours must be system-derivable
  (policy class, project, risk) with an optional user overlay, which none of
  the studied products does. The aggregate report should fix the palette size
  and who may mint a label.
- Card face density without covers: our cards are machine-made and have no
  images, so the cover slot is free real estate. Diff stat, cost, elapsed time
  and last event all compete for it. The aggregate report should decide what
  takes the cover's place, or whether our face starts with the badge row alone.

### Cloneability

Not cloneable: closed SaaS, no self-host option has ever existed, no export of
the engine. The data model (boards, lists, cards, badges, activity) is simple
enough that our own board already reproduces it, and the live public boards
plus card pages make the reference studyable forever. Trello's value for us is
the card-face grammar and the colour-channel rule, both fully specified above.

## Scoring axes

| Axis | Score | Reason |
|---|---|---|
| Card scannability (read ten cards in one glance) | 5 | Title plus only-when-present badges, tested at scale for 15 years; the face never overflows |
| State clarity (what is happening, how far, what next) | 2 | No states exist: position and due colours only, nothing says what is happening or what comes next |
| Human-decision surface (find and make the next decision) | 2 | No decision construct at all; assignment and due dates are the nearest, the 2026 Inbox captures but decides nothing |
| Agent-activity legibility (is the agent working, waiting, stuck) | 1 | Nothing: agents exist only as MCP callers whose edits are indistinguishable from human edits on the face |
| Noise level (5 means quiet: nothing without meaning) | 4 | Badges appear only with content and colour channels stay separate; upsells, stickers and Power-Up panels can clutter |

Sources: live pages cited in the text (public board, card page, tour, templates,
pricing, MCP, guide; trello.com/inspiration now redirects to trello.com/templates,
byte-identical when screenshot), the Atlassian blog posts on AI features
(30 July 2026) and dark mode (1 June 2023), the support docs on AI-generated
boards and automation quotas, and the community threads linked in section 5.
Shots taken 2026-10-01 and 02 with headless Chrome 152, logged out throughout.
