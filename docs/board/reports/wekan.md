# Wekan

## Header

- Product: Wekan — https://wekan.fi, repository https://github.com/wekan/wekan
- License MIT, free in full; self-hosting is the primary mode (Docker, Snap,
  source). No open-core gating: the hosted Wekan Cloud (data in Finland, run by
  the maintainer) is plain paid hosting of the same code, not a feature tier.
- Alive and fast-moving: v12.14 released 2026-10-01; ten releases in the five
  days before that (v12.05-v12.14, roughly one per day). Effectively a
  single-maintainer project (xet7 / Lauri Ojansivu) with a decade of continuous
  releases behind it.
- Studied live on 2026-10-02: `docker run wekanteam/wekan` (image built
  2026-10-01, reports itself as v12.14; Meteor 3.6-beta, Node 26) plus a
  MongoDB container, app on localhost:9147. Throwaway local account created
  directly in the database, board content built through the REST API, UI driven
  in headless Chrome over the DevTools protocol. Everything below is first-hand
  from that instance unless marked as documentation-sourced. No 2026-09-29
  market-research report exists for Wekan, so there is no earlier snapshot to
  diff against (checked `docs/market-research/projects/`).
- One sentence: the decade-old MIT-licensed self-host kanban for people who
  want Trello's board craft on their own hardware with no SaaS strings.

## 1. The board model

**Columns.** User-made lists; a new board starts completely empty (no default
columns, no default labels) with one swimlane named "Default". Wekan's own
vocabulary: lists (columns), swimlanes (rows), cards (work items). A
significant v12 model change I hit first-hand: **each list is bound to one
swimlane** (`list.swimlaneId` in the database). The board renders one row of
columns per swimlane, and a list created through the REST API lands only in the
default swimlane — my API-built columns appeared in a single row until I
cloned them per swimlane. So "the same column across rows" is no longer one
object; whether the add-list UI fans a new column out to every swimlane is
unverified (my synthetic typing in the composer did not register).

**Card anatomy.** The card face (`shots/wekan/minicard-future-due.png`,
`shots/wekan/board-full.png`) reads top to bottom: title (markdown-rendered),
date badges, colored label chips (text on by default), checklist progress
("3 of 4 subtasks done" plus a progress bar on parent cards), member and
assignee avatars, comment badge (unread comments flag the whole card via
`minicard-unread-comments`), card number if enabled. Due dates are the
strongest signal on the face: future due shows "2026-10-04 17:00 (2 days left)"
with the ISO week number in a box, past due flips the same badge to a red
overdue chip (`shots/wekan/minicard-overdue.png`). Behind one click
(`shots/wekan/card-detail.png`, `card-detail-bottom.png`): description, Labels,
Stickers, Location, a four-slot date block (Received / Start / Due / End),
Members, Assignee, Creator, Requested By, Assigned By, Dependencies (add
dependency), Sort, List, Flowtime and Pomodoro timers, Custom Fields,
checklists, and the activity/comment stream. Never on the board at all:
description text, dependency graph, comment text, custom-field values.

The density is a first-class configuration surface: board settings → Card
(`shots/wekan/card-settings.png`) is a matrix of every card field × three
toggles (show on card / show on minicard / draggable), plus "Ask for a reason
when moving cards" and a drag-ordered card field list. The board document
carries roughly ninety `allows*` booleans, each with an `...OnMinicard` twin —
the deepest per-board card-anatomy dial I have seen in this field.

**Where decisions live.** Nowhere built-in: no inbox, no approval concept, no
queue of "cards waiting on you" on the board itself. Decisions are made by
moving a card (drag, or card menu → Move, or the screen-reader move-up/move-down
buttons), by commenting, or by labels. A human-approval workflow is something
you build: a "Waiting on human" column (as I did), a label, and the
notifications bell in the header. Board-to-decision distance is short — the
card is one click away and the move is one drag — but *finding* the decision is
your own discipline. Saved filters (private per user, per board) are the
closest thing to a decision queue.

**Filters, swimlanes, cross-project.** The filter sidebar
(`shots/wekan/filters.png`) filters cards or whole lists by title text, card
text, parent card, label (OR/AND, plus "No label"), member ("No member"), and
dates; filter sets are nameable, savable, and private to you on that board.
Header buttons: Sort Cards, Filter, Search (global search across boards),
Multi-Selection, Swimlanes (view toggle), Notifications. Cross-board "My
Cards" exists at the API level (`/api/user/cards`); I did not verify its UI.
Calendars: no calendar grid view found in the v12.14 UI (the `/calendar` route
renders the plain board), but every board exposes a `calendar.ics` feed.

## 2. Agent-task specifics

Not applicable: Wekan is pure kanban with no concept of a running task, an
agent, or a conversation. The nearest hooks an agent integration would use —
automation rules, outgoing webhooks, the REST API, inbound email — are covered
in section 3, and what that would feel like on the board is judged in the
scores table under agent-activity legibility.

## 3. Interaction model

**Moving work.** Both: drag-and-drop everywhere (cards across lists and
swimlanes, list reorder, swimlane reorder, checklist items, card field order)
and click paths (card actions menu with Move/Copy, per-card move buttons for
screen readers, multi-selection mode then bulk move). The header has a
Mobile/Desktop mode toggle and a desktop-drag-handles toggle. On a drop:
activity is logged, rules fire, webhooks fire. I built a real rule through the
API — trigger "card moved into Verifying", action "add label needs-review" —
and it shows in the rules page (`shots/wekan/rules.png`) with View / Edit
trigger/action / Delete / Import-Export per rule.

**Keyboard and mobile.** Keyboard shortcuts panel in the sidebar; skip-link and
screen-reader move controls are in the DOM. Mobile is the known weak spot: the
store apps are PWABuilder web shells (wekan.fi/app says so plainly — "every
WeKan App is full-screen webbrowser", iOS gets "install Chrome and log in"),
and the long-running mobile issues are in section 5.

**Refresh model.** Live push: Meteor DDP over SockJS websockets. Two sessions
see each other's moves, comments, and label changes without reloads — verified
by watching the websocket frames and by API writes appearing in the open
browser. The board also has a per-board "cards loading mode" setting and lazy
per-swimlane rendering on the radar for big-board performance.

**The agent's API surface.** A complete REST API: login returns a token
(`POST /users/login`), then `Authorization: Bearer` plus `X-User-Id` /
`X-Auth-Token` headers; full CRUD on boards, lists, swimlanes, cards (bulk up
to 500), checklists, comments, labels, members, custom fields, rules,
integrations; CSV/Excel/PDF/Zip export; `calendar.ics`; inbound email address
per board. Two findings that matter for an unattended client: outgoing-webhook
URLs refusing localhost is an SSRF guard ("Localhost is not allowed"), and
Wekan runs an automated security-canary system that blocks accounts whose
access pattern looks wrong (it flagged my API user twice — `InactiveBleed` and
`GuestBleed` — and locked the account until cleared in the database). An agent
that drives Wekan must behave like a well-mannered user or it gets itself
locked out; that is a feature, and a warning label for headless integrations.

**Click map** (from the board): read status — 0 clicks (badges live on the
face); read detail — 1 click; decide/move — 1 drag or 2 clicks (menu → Move);
steer mid-work — not applicable beyond editing the card (1 click + edit);
comment — 1 click to open the card, then type; change automation — 3 clicks
(sidebar → Board Settings → Rules).

## 4. Visual system

**Themes.** No application-wide dark mode. Board colors
(`shots/wekan/settings-colors.png`) come in Flat (belize, nephritis,
pomegranate, pumpkin, wisteria, moderatepink, strongcyan, limegreen, natural),
Clear, **Dark** (midnight, dark, moderndark, exodark, cleandark), and Special
palettes, plus a custom color and a background image — but "Dark" themes the
chrome only. Verified in the CSS: `board-color-midnight` sets accent CSS
variables (`--board-theme-accent: #2c3e50` …), the header strip turns dark
slate (`shots/wekan/board-dark.png`, header crop average rgb(52,69,87) vs
rgb(49,132,187) on the default), and the canvas, lists, and cards stay light.
A true dark UI needs custom CSS.

**Colors.** User-set: per-board labels with a color each (the six I made show
as chips with their text). System-set semantics are few and consistent: due
badge states (neutral countdown, red overdue), checklist progress bar, unread
comment badge, watched/muted board state in the header. Position itself carries
meaning (column = stage, row = track), and everything else is user vocabulary —
honest kanban, no hidden status engine.

**Typography and density.** Default columns are 220px wide; on a 1680×1050
viewport six columns fit side by side and roughly eight to ten card faces stack
per column. A card is readable as a thumbnail: title plus label chips plus due
badge survive at small size, avatars and checklist counts start to blur. The
minicard itself can be collapsed, and the whole field set can be thinned via
the card-settings matrix — density is a dial, not a fate.

**Status vocabulary.** Card-face states observed: plain; overdue (red due
badge); future due (countdown + ISO week); has checklist progress; has unread
comments (badge + card title flag); archived (leaves the board for the archive
sidebar); watched (bell states in header); collapsed minicard. Board states:
normal / muted / watched; swimlane or list collapsed. There is no
running/blocked/failed state — you encode those with labels and columns.

## 5. What users say

Three most common complaints:

1. **Performance on big boards.** "Board with 865 cards got slow" with
   seconds-long click delays
   ([#4061](https://github.com/wekan/wekan/issues/4061)); slowness scaling with
   cards/lists/swimlanes
   ([#5208](https://github.com/wekan/wekan/issues/5208)); "Became slow after a
   week" ([#5140](https://github.com/wekan/wekan/issues/5140)) — the same
   thread records that v7.00's ReactiveCache made this much rarer, which
   matches the current ReactiveCache-based internals I probed.
2. **Mobile.** "Hard (sometimes impossible) to use Wekan on mobile (Android &
   iOS) because of UI/UX issues"
   ([#953](https://github.com/wekan/wekan/issues/953), a decade-old thread
   still referenced); iOS PWA zoom and broken menus
   ([#5881](https://github.com/wekan/wekan/issues/5881)); the fullscreen-PWA
   request trail
   ([#2879](https://github.com/wekan/wekan/issues/2879)). The official app
   page's answer is packaged webviews, and says so
   ([wekan.fi/app](https://wekan.fi/app)).
3. **Upgrades and the database underneath.** Snap builds bundled MongoDB 3.x
   until backups started failing on the obsolete database
   ([#5467](https://github.com/wekan/wekan/issues/5467)); a snap auto-upgrade
   wiping databases
   ([#5935](https://github.com/wekan/wekan/issues/5935)); third-party package
   upgraders hitting mongod errors (YunoHost
   [forum](https://forum.yunohost.org/t/wekan-upgrade-from-7-49-to-7-51-failed-with-mongod-error/30616)).
   The official upgrade guide's first answer is backup-then-upgrade, with
   automatic MongoDB→FerretDB/SQLite migration from Wekan 6+
   ([wekan.fi/upgrade](https://wekan.fi/upgrade)).

Three most praised details:

1. **Trivially easy self-hosting**, Docker in particular — the recurring
   Reddit-sourced recommendation ("easy to self-host with Docker", [ones.com
   roundup](https://ones.com/blog/7-trello-open-source-alternatives-reddit-users-swear-by));
   "WeKan is absolutely great!" on self-hosting
   ([HN](https://news.ycombinator.com/item?id=36050694)). Matches my run: two
   containers, one env var for the API, done.
2. **The API.** "WeKan had the closest REST API compatibility with Trello"
   ([HN Kanboard thread](https://news.ycombinator.com/item?id=36047861)) — the
   exact property that let me build a realistic board programmatically in
   minutes.
3. **Momentum and responsiveness of the maintainer** — near-daily releases
   (v12.05→v12.14 in five days, [releases
   page](https://github.com/wekan/wekan/releases)), with users in the
   performance threads noting the fixes landed (ReactiveCache in v7.00, the
   flow-analytics additions in v12.05 per the
   [changelog](https://github.com/wekan/wekan/blob/main/CHANGELOG.md)).

The sustainability angle in one paragraph: this is the field's canonical
bus-factor-one survivor. One maintainer, daily releases for a decade, funded
by a small hosted cloud, MIT end to end. The complaints above are the shape of
the cost: performance engineering, mobile, and packaging upgrades all queue
behind one person's attention. The canary system that auto-blocks odd API
clients (section 3) is the same single-mindedness turned into a security
feature.

## 6. Verdict for us

**Steal:**

- The **card-settings matrix** (every field × on-card / on-minicard /
  draggable, plus a drag-ordered field list): our board's density dial, so the
  same card can be terse on the face and rich in detail. One-line version: a
  per-field "on face" boolean set in board settings, not a global density
  slider.
- The **due badge grammar**: absolute date, human countdown ("2 days left"),
  and ISO week number in one chip, with a single unambiguous red overdue flip.
  One-line version: countdown + week + red state, nothing else on the badge.
- **Checklist progress on the parent card face** ("3 of 4 subtasks done" plus a
  thin progress bar) — subtask state without opening the card.
- **Saved, named, per-user filter sets** on the board — the cheapest honest
  answer to "where are my decisions" without building an inbox.
- **Rules as visible board objects** (trigger/action pairs, editable,
  importable/exportable per board) rather than hidden automation. One-line
  version: automation the user can read on the board itself.
- The **security-canary pattern** for API clients: block access patterns that
  look wrong, make unblocking a deliberate act. Directly reusable for our
  agent-facing API.
- **Trello-shaped REST parity** — boards/lists/cards/comments as plain CRUD
  with a bearer token — proven agent-friendly by this very study.

**Skip:**

- The **ninety-boolean board config**. The matrix is powerful but the default
  surface is a maze of `allows*` flags; we want a small set of opinionated
  presets instead.
- **Per-swimlane lists** (v12's model). Making "the same column" a different
  object per row breaks the mental model of cross-track stages; global columns
  with per-row membership are clearer for an agent factory board.
- **Meteor/DDP** as the live-push substrate — realtime works, but it is a
  framework commitment; plain websockets/SSE behind our own gateway is the
  same UX without adopting Meteor.
- **Packaging sprawl** (Snap with bundled Mongo, FerretDB migration paths) —
  for us: one OCI image, one obvious backup story.

**Decision needed** for the aggregate report:

- Are columns global across swimlanes, or per-swimlane objects? Wekan v12 just
  switched to per-swimlane; Trello-style tools keep them global. Our agent
  factory has both needs (stage columns global, track rows local).
- Is card-face field visibility a fixed sane set or a user-configurable matrix?
  Wekan bets on the matrix; most of the field bets on fixed.

**Cloneability:** trivial. `docker run wekanteam/wekan` with a Mongo container
and `WITH_API=true` is a working board in minutes (this study). The image
bundles Node 26 and Meteor 3.6-beta; the snap is the alternative. Cost is in
operations over years (upgrades, backups, big-board performance), not in the
first hour.

## Scoring axes

| Axis | Score | Reason |
|---|---|---|
| Card scannability (read ten cards in one glance) | 4 | Dense but ordered faces: title, label chips, due badge, checklist progress all survive at thumbnail size; avatars blur first. |
| State clarity (what is happening, how far, what next) | 3 | Position, labels, and due badges carry real state, but there is no running/blocked/waiting vocabulary — you build your own and remember it. |
| Human-decision surface (find and make the next decision) | 3 | One-click cards and one-drag decisions, but no inbox or waiting-on-me queue; saved filters are the only discovery tool. |
| Agent-activity legibility (is the agent working, waiting, stuck) | 2 | Nothing built in; an agent's run would be modeled as labels/comments via rules and webhooks, indistinguishable from human edits on the face. |
| Noise level (5 means quiet: nothing without meaning) | 4 | Quiet board: only meaningful badges on cards, activities opt-in in the sidebar; the per-list "Add Card" affordances are the main constant chatter. |
