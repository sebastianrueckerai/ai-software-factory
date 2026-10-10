# Proposal v2: the project screen

Stage 15. Everything here is decided by rulings 251 to 256, from Sebastian's
conversation on the human's side of the factory
([the UX conversation](../ai-software-factory-ux-conversation.md)) and his
three answers of 2026-10-10. The architecture behind it is
[architecture.md](../architecture.md) 5.7. The scope stays the console's
server-rendered htmx shape, with SSE for the live parts (ruling 244). This
document is the spec the dummy's iteration 5 implements and the console
follows. It is design, not built: the console today is the board of
architecture 5.6.

[proposal-v1.md](proposal-v1.md) stays as the record the click dummy
implemented in its first four iterations. Where v2 says nothing, v1 still
holds.

## The screen

One screen per project, five parts, each with one job (ruling 251):

```
┌────────────────────────────────────────────────────────────────────────┐
│ notes   ● working   3 working   2 need you   €4.10 / €10   GitHub ✓    │ status
├────────────────────────────────────────────────────────────────────────┤
│ ✦ Tags need your choice of storage and block two cards.      [more]    │ pulse
├───────────────────────────────────┬────────────────────────────────────┤
│ NEEDS YOU  QUEUED  WORKING  VERIFYING  DONE │  chat                    │
│ ┌───────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │  …                       │
│ │Choose │ │#14  │ │#9   │ │#11  │ │#3   │  │  I will:                 │
│ │storage│ │plan │ │run  │ │rev. │ │done │  │  • move #9 back to queued│
│ │○ pg   │ └─────┘ └─────┘ └─────┘ └─────┘  │  • add your note to it   │
│ │○ file │                                   │  [Do it]  [Cancel]       │
│ │[send] │                                   │                          │
│ └───────┘                                   │  Ask or tell the project…│
└───────────────────────────────────┴────────────────────────────────────┘
```

1. **Status line**: what is the state.
2. **Pulse**: what should I understand about it.
3. **Board**: what work exists and where it is.
4. **Chat**: ask or change anything.
5. **Card drawer**: everything about one piece of work.

The chat is per project and never creates or manages projects. Anyone who
steers a project, Sebastian or an invited member, gets the same screen
(rulings 251 and 254). Three principles from the conversation:

- The board state is the truth. The event log is the history. The chat is
  an operator over both.
- Anything a human can do by hand on the screen can be said in the chat.
  The objects stay visible and operable without the chat.
- Normal states whisper. Exceptional states speak.

## What it keeps from v1

- **The design tokens**: both themes, dark default, the oklch single-hue
  ladder, typography and density (v1, "Design tokens").
- **The card anatomy**: the face's lines (title and accent, status pill
  with telemetry, the live activity line, badges, the legal transitions as
  buttons), with every element shown only when it has content, the
  expanded view and the hover peek (v1, "Card anatomy"). The one change is
  the spend figure (below).
- **The status-light vocabulary**: one hue per state, the contrast floors,
  the stale ring (v1, "Design tokens"). The pills now also mark the fine
  state on a column's cards.
- **The human accents**: eight fixed accents as task metadata and a filter,
  never a state's hue (ruling 247).
- **Comments on the card**, through the issue-comment store (v1, "Where
  comments live").
- **The iteration notes** of Sebastian's click tests: the per-card chat as
  a real chat panel with its steering box enabled while the card runs and
  its queued messages editable until they land, the human-editable
  summary, colour as one channel, the structured objective, related cards,
  replay controls and tooltips (v1, "Iteration notes"), and iteration 4's
  chat as the drawer's default tab, checks chip, evidence row, lane-start
  buttons, deny with a redirect box and icon buttons
  ([gap-analysis.md](gap-analysis.md)).
- **Buttons are the state machine** and drag stays for lane starts only
  (ruling 246).

## What it changes

**The split layout** (ruling 251). v1's three bands (the needs-you band,
the agent lane, nothing else) become the status line and the pulse on
top, then the board on the left and the chat on the right half. The
needs-you band becomes the board's first column. On a narrow screen the
chat and the board become two tabs.

**The status line** (ruling 251). Per project, quantitative, always there:
the project's state (working, waiting on you, idle, paused), cards working,
cards that need you, spend against the project's monthly cap, and the
GitHub mirror's state. Each figure opens its page: the costs, the
needs-you list, the mirror panel.

**The pulse** (ruling 251). One sentence under the status line, the single
most useful thing to know now. A click expands it to three or four
bullets. A cheap model writes it from the board snapshot and the last
events. It refreshes on every event (debounced 2 s, at most one call per
10 s) and every 60 s as the fallback, with a typing indicator while it
recomputes. It is subdued when all is well and prominent when something
needs a person. Its spend is the project's.

**Five columns** (ruling 255). The split view has five columns, a view over
the task states the factory already has, not a new state machine:

| Column | States |
|---|---|
| Needs you | waiting on a human (approvals, questions, plan acceptance), and waiting on the author when the viewer is the author |
| Queued | backlog, queued, waiting on dependencies |
| Working | running, closing |
| Verifying | in review (checks, gates, model review, merge queue) |
| Done | done, failed, closed |

The process's lanes do not pick the column. A plan card whose planner runs
is Working, and a plan that waits for acceptance is Needs you. The lane is
a chip on the card, and so is the fine state (waiting on the author,
failed, closed, retrying, stale) in v1's pill vocabulary. The full-width
board keeps v1's columns, lanes first, for a member who wants a process's
lanes as columns, and processes keep composing their lanes in YAML (rulings
245, 246 stand). If a process ever needs another grouping, the grouping
becomes a block in its process file, with these five as the default. On
the card face the spend figure stays muted until 80 percent of its budget,
then turns prominent with the warning sign and the text, never colour
alone.

**Inline answers** (ruling 256). An agent's question carries structured
choices. A needs-you card renders them as buttons plus a text box, so most
human input needs no drawer.

**The chat as a surface** (rulings 251 to 253). The click tests made the
per-card chat the point of opening a running card. v2 gives the project
one too: the right half holds the project agent's conversation. Streaming
replies. Tool calls as collapsed blocks with their arguments and duration.
Proposals as a list of changes with a Do-it button when a tool needs an OK
(the `chat.confirm` setting). "Applied" lines with undo where an undo
exists. A message queue that is editable until a message lands. The
conversation persists per project and per member. The agent acts as the
human through the console's own actions, so a button and a tool call
record the same event, the tool call's with `via: chat`, and the agent
runs no code.

**The drawer's four tabs** (ruling 251). The drawer opens beside the board
at 40 to 50 percent of the width, with the tabs Overview, Activity, Files
and Chat. Chat is the default tab on a running card, as in iteration 4.
Iteration 4's two tabs, chat and card, become four: its card tab becomes
Overview, and Activity and Files are new.

**Live by events** (ruling 244). Every console action records one event
with `via`, the project's events are one feed at one endpoint, and SSE
carries them to the board. The live badge replaces v1's 3-second poll.

## Non-goals

Round 1 (ruling 256) leaves to the [main roadmap](../roadmap.md): messenger
push (item 145), the mobile layout and PWA install (item 146), the project
analytics page (item 147), pull request workflows to GitHub (item 148) and
member roles beyond writer (item 149). v1's other non-goals stand: no
keyboard map beyond the decision key, no swimlanes or group-by, no
per-board field matrix, no saved filters, no recorder tool, no Forgejo
mirror.

## What changes in the console, concretely

1. v1's console changes land first, since the console never got them: the
   token set with both themes, the card face, comments on the card, the
   accent and the editable summary (v1, "What changes in the console,
   concretely").
2. The board becomes the project screen: the status line, the pulse, the
   five columns and the chat side by side, the drawer beside the board.
   The full-width board stays with today's columns, lanes first.
3. `board.go` groups task states into the five columns by the table above,
   with the lane and the fine state as chips.
4. Every console action records one event with `via`. The project's event
   feed is one endpoint, SSE carries it to the board, and the live badge
   replaces the 3-second poll.
5. The status line's figures link to their pages: `/costs`, the needs-you
   list, the mirror panel.
6. The pulse: a call on the low tier under the ledger ref `pulse`, on
   every event (debounced 2 s, at most one call per 10 s) and every 60 s,
   with the typing indicator.
7. The chat panel: the project agent's loop inside factoryd, its tools,
   the `chat` block of the policy and the project's file, the streaming
   panel, proposals with Do it, "applied, undo" lines, the editable queue,
   the `operator` alias and ledger ref.
8. Needs-you cards render the escalation's `choices` as buttons plus a
   text box.
9. The drawer's four tabs, Chat the default on a running card.
10. Login admits any project's writers. A member sees only their projects,
    and the factory-level pages stay with the code repository's writers.
    Approvers come from the project's file.
11. The new-project panel gains "start from an existing GitHub
    repository", and the project's page sets the GitHub export.
12. No framework. htmx and SSE only.
