# The shared information architecture

One markup for every skin. A skin changes tokens and layout through CSS and never the markup, so every version keeps every control of [inventory.md](inventory.md). This is stage 1 of [the session plan](sessions/01-design-round.md): Sebastian's steer of 2026-10-14 (pulse, chat, board, in that order of weight, the drawer docked right, the phone as chat first) and roadmap item 177 (the face whispers, the drawer gets a top block).

## The principle

Three elements in order of weight: the pulse says what to know now, the chat is where a member acts, the board is where the granular task state is scanned. Normal states whisper, exceptional states speak. There is one detail view, the drawer. Nothing is shown twice.

## The screen at 1200 px and wider

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Factory console   [ai-software-factory-code ▾]        Board New task Projects │ top bar, quiet
│                                                       … Theme sebastian Out   │
├──────────────────────────────────────────────────────────────────────────────┤
│ ⚠ Two cards need your decision; #612's merge carries a migration.   more     │ pulse band
│ ● waiting on you · 3 working · 2 need you · €61.40 / €120 · GitHub 1 open PR │ figures, small
├─────────────────────────────────┬────────────────────────────────────────────┤
│ CHAT  project agent · New …     │ BOARD  find…      wide  ?                  │
│                                 │ NEEDS YOU 2  QUEUED 4  IN PROGRESS 5  DONE 8      │
│  agent: …                       │ ┌────────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌─────┐ │
│  you: …                         │ │Merge   │ │#455  │ │#601  │ │#598  │ │#490 │ │
│  proposal  [Do it] [Skip]       │ │PR #612 │ │…     │ │…     │ │…     │ │#616 │ │
│                                 │ │[Approve│ └──────┘ └──────┘ └──────┘ │#610 │ │
│                                 │ └────────┘                            └─────┘ │
│ ┌─────────────────────────────┐ │                        ┌──────── drawer ────┐ │
│ │ Ask or tell the project…    │ │                        │ docks at the right │ │
│ └─────────────────────── Send │ │                        │ edge, over the     │ │
│                                 │                        │ board only         │ │
└─────────────────────────────────┴────────────────────────┴────────────────────┘
```

- **Top bar.** One quiet row: the home word, the project switch as a select (the page reloads on change, no Show button), the factory pages as small text links, then theme, the user and Log out. The find box, the view toggle and the keys button leave the page shell: they are board controls and sit in the board's own header.
- **Pulse band.** The sentence first, large, with the warning sign when prominent; no "more" button. Under it the status figures in one small tabular row: the state word with its dot, n working, n waiting on the provider when any, n need you (links to Needs you), spend / cap (links to Costs), GitHub. The band has the prominent treatment (tint and left rule) only when a card needs a person. A click anywhere on the band expands it in place (one disclosure for the bullets and the figures, a chevron as the keyboard control, Escape or a second click folds it): the working cards by name and stage, the cards that need you, the spend today against the day cap and the month against its cap as two small gauges, the provider state, the GitHub pull requests as links, the configuration version with its infra commit linked to the tree (item 221, C9).
- **Chat, the main region.** Left, 44 percent of the width, a raised panel. Header: "Chat", "project agent · project", New. The threads (C14, roadmap 239) as a table at the chat's left: the inbox first, the active threads by last turn, the archived last with restore; the open one marked, a working mark on a thread with a turn in flight, an unread count on a thread with turns not yet seen, the sum in the tab title. The open thread's head with its title, its time, Archive and Delete… (neither on the inbox, neither when archived). The log at a reading width of at most 72 characters. An escalation's choices in an answer row above the composer. The composer at the bottom with a three-row box and Send, the "/" palette with `/compact` and `/new` above it, the two as chips under it, the level control under Send at the right; the queue under it. Tool blocks collapsed, proposals as cards with Do it as the primary button and Skip as the quiet one. The inbox is the one thread the agent speaks in uninvited: pokes as its turns with choices as buttons and a decider line when the agent acted alone.
- **Board, the quiet region.** Right, the rest of the width. Its header row: "Board", the find box (C13: a word matches what the face says, a `key:value` term a fact behind it, such as `plan:558`, `stage:verifying`, `is:failed`, `by:sebastian`; Enter submits it as `?q=`, × clears it, `f` focuses it), the wide-view link, the keys button. Four columns (ruling 255 as C8 amends it: Needs you, Queued, In progress, Done), headers as small capitals with the count, which reads "2 of 5" when a find or a show narrows the column, and a ▾ at the head's right of Queued, In progress and Done that opens the column's orders and shows (C13); a column in another order or with a show says so in a line under its head with × back. Every column holds its cards by arrival, the newest on top, but Needs you, which is oldest waiting first. The find and the menus live in the URL beside the project and the view, so the poll, the card fragments and the stream follow them; the strip and the status panel stay the project's. Needs you is the first column, with its own fill, rule and header so it is the loudest thing on the board, and it stays a column: no tray or band across the top (C4), so seven waiting cards grow downward like any column. Cards are compact (below).
- **Drawer.** Docks at the right edge, 46 percent of the width, at most 720 px, over the board and never over the chat. Escape closes.
- **Secondary pages** keep the shell and the pulse band is absent. Content width at most 80 rem.

## The card face

The face shows what matters for the card's state and no more. Elements in order, each only when it has content:

1. Issue ref and title, the title at most two lines. The whole card opens the drawer (item 226), for every member; the buttons on the face act without opening it.
2. State row: a dot and the state word in the state's hue, on an In progress card the stage from the session (planning, building, verifying; item 225, C8) with its own dot, then the card's age (C11: one time on the card, the time in the stage and the gates in the drawer), then only when exceptional: `n/n checks` while verifying, spend from 80 percent of budget with the warning sign, the fine state (retrying, held, on the provider, stale). No gate line on the face (C11).
3. Activity line, monospace, one line, only on a working card or a card that waits: the newest event or the question. "answer on the issue" link stays.
4. Chips only when exceptional: blocked by n, waiting on #n, from plan #n. No lane badge: there are no lanes (225). The model alias leaves the face and goes into the drawer's top block.
5. Actions as a quiet row of small buttons: Retry, Close. No Start plan, no lane moves (225). They stay visible (no hover-only controls).

A done, failed or closed card is one or two lines: ref, title, the state word, the elapsed time. No spend, no activity, no chips. The "More" fold is gone: its content (the objective, the agent's summary, the plan's cards, the PR and timeline links, the summary and accent forms) lives in the drawer.

## Needs you items

Each is a decision with the primary action first:

- **Merge approval.** Headline "Merge PR #n" with the risk class and "migration" as chips. One line: the model review's verdict and summary. One line: the agent's recommendation. Actions: Approve (primary; every action is the member's own, so the label does not say "as you"), Deny (opens the reason box and the request-changes or reject choice under the button), Split for a large PR. The migration files, the findings, earlier reviews, the audit and "why a human" live in the task's drawer, Overview, "Reviews and audit", and a "Details" link on the item opens it there.
- **Resource approval.** Headline "Resource request", the type and the purpose on one line, the lease and the cost on the next, "beyond the envelope" as the exceptional line. Approve (primary), Deny (opens the reason box).
- **A plan's question.** The planning card's open question, the same item as an escalation: the question as the headline, the choices, "Or in your words". No Accept plan, no Request changes, no Reject (225): a plan with no open question files its children and closes by itself. The plan's summary and its cards table live in the planning card's drawer.
- **Escalation.** The question is the headline, the choice buttons under it, "Or in your words" as a disclosure that opens the text box (the text box is open when there are no choices). Answer, or "Grant one session with this answer" when capped. The verdict buttons for approvers stay, small, at the end.
- **Human task.** The compact face with Close.

## The drawer

Header: ref and title, the state dot and word, elapsed, the PR link, the issue link. Tabs: Overview, Chat, Activity, Files, Files last (226). Chat is the default on a running card, Overview otherwise.

Overview, top to bottom:

1. The top block, four lines: Task (the objective's first sentence), Status (the state and the time in it), Budget (spend of budget and the percent, muted under 80 percent), Agent (the model alias, muted).
2. Open: the one thing that needs the member, if any (the question with its choices, the review's open findings, a failing check, a refusal), with its actions.
3. Collapsed sections, in this order: Time (how the card's life went: one row per run of a stage with its start, duration, cost and the note that ended it, the at-a-glance line as the section's hint; C10), Objective (the full text with provenance), The agent's summary, The plan (summary and the cards table), Reviews and audit (the merge facts and Split), Related cards, Edit (the summary and accent forms, writers only), Links (issue, PR, timeline).

Activity and Files stay as they are. Chat stays as it is, with the steer box.

## The phone, under 900 px

One column, no tabs: the top bar (home word, project select, a menu for the rest), the pulse band, the chat with its thread table as one vertical list above the log, the log at 55 percent of the viewport height and the composer under it, then the board as stacked sections: Needs you in full, then In progress, Queued, Done, each a section with its count, Done collapsed by default. The drawer takes the full screen. Needs-you actions are one-handed: the choice buttons full width.

## Tokens and skins

The oklch ladder and the state hues of proposal v1 stay as the base tokens (`base.css`). Each skin is one file `skins/<slug>.css` that overrides tokens and the layout rules (which region is where, the panel treatment, type, radii, density). `data-skin` on `<html>` selects it the way `data-theme` selects the theme: `?skin=<slug>` sets it and localStorage remembers it. At the merge the picked skin becomes the console's stylesheet and the mechanism goes.

## Markup changes

| Template | Change |
|---|---|
| layout.html | the header becomes the top bar: home, project select (form, auto-submit), the page links, theme, user, logout |
| page.html | the filter form becomes the board header; the order is pulse, chat, board; the Board/Chat tabs go; the drawer stays last; the status figures row is a disclosure with the expanded panel |
| board.html | the pulse band takes the status figures; the card face as above with the whole card as the drawer's opener; the needs-you items as above; four column headers (C8); the wide view's lane columns and the move and plan forms go (225) |
| drawer.html | the header, the tab order, the Overview top block and collapsed sections |
| chat.html | the turns with an avatar and the name and time above the text |
| new.html | Track (direct or plan) replaces Lane (225) |
| console.js | the pane tabs go; the drawer no longer offsets for the chat |
| console.css | split into `base.css` (tokens, mechanics, layout) and `skins/*.css` |

Every existing test keeps passing or gets the one-line change its new markup needs, with the reason in the commit.
