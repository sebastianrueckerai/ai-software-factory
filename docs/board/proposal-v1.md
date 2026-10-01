# Proposal v1: the first improved board

Task 157. Everything here is decided by the aggregate
([report-final.md](report-final.md)) and rulings 243 to 248; each choice
cites its evidence. The scope: the console's current server-rendered htmx
shape (ruling 244) - no framework, no build step, one artifact. This
document is the spec the click dummy implements and the console follows.

## The board

One screen, three bands, top to bottom:

1. **Needs you** - the derived list (steal 13, Agent HQ's
   dashboard-as-decisions-page): every approval, escalation, answer and
   waiting-on-a-human card across the shown projects, ranked oldest-waiting
   first, each with its reason line (steal 3) and its decision buttons
   inline (steal 8). One key clears the top item (Automaker's keyboard map,
   steal 14). This band replaces the today's Approvals/Escalations/Human
   tasks blocks.
2. **Agent lane** - the columns: the project's process lanes (backlog, plan,
   ready; ruling 245: system lanes only) then the state columns (running,
   waiting on a human, waiting on the author, in review, done, failed,
   closed). Column headers carry counts. Cards move by buttons (ruling
   246); the backlog-to-lane drag stays as a form submit.
3. **Nothing else.** Roll tasks, costs and alerts keep their own pages; the
   board is one artifact (the Trello lesson, report-final section 4).

The 3-second poll stays until SSE lands (roadmap); the live activity line
(steal 1) renders from the last timeline event each poll brings.

## Card anatomy

The face (steals 2, 4, 5, 6; every element appears only when it has
content):

```
[#12] Foundation: store, schema, migrations     [accent]
 running · 23m · 3/4 checks · €0.84 / €2.00
 Reading internal/store/store.go…        <- live activity line
 [ready badge] [model: coding-cheap] [blocked by #3]
 [Approve] [Request changes]
```

- Line 1: issue ref, the card's title (plan key, or the objective's first
  clause - the full objective moves off the face), and the human accent
  label if set (ruling 247).
- Line 2: status pill + elapsed + checks + spend against budget (Factory's
  triple plus the spend their users miss; Linear's status row).
- Line 3: the live activity line, one line, monospace, muted (cline/kanban;
  on a waiting card this becomes the reason line, steal 3).
- Line 4: badges - starting-lane badge, model alias, blocked-by count with
  names on hover, children rollup for plan cards (steal 12: `2 running ·
  1 done · 3 waiting`, never the full child list).
- Line 5: the card's legal transitions as buttons (steal 7) - approve/deny
  with the redirect box (steal 8), retry, start plan, answer. No menu.

Expanded in place (one click): the full objective, the agent's summary, the
dependency list, the approval's payload (review verdict, findings), the
last three conversation messages (ruling 243), and unread human comments.
The conversation and the full timeline replay open one click deeper - the
task page, which stays the existing timeline page upgraded with the
conversation column and per-turn chips (Conductor's shape; ruling 248:
replay is the default view of a card's life).

Hover (ruling 243): a peek popover with the streaming tail of the
conversation, last 100 lines (Nimbalyst's hover-peek).

## Design tokens

Two themes, dark default (standing decision), both defined once as CSS
custom properties on `:root` / `[data-theme=light]`. The ladder follows
Plane's oklch single-hue scheme (one hue ~250, chroma steps of one
material; Plane report, "the oklch single-hue token ladder"):

| Token | Dark (default) | Light | Use |
|---|---|---|---|
| `--bg` | oklch(0.17 0.012 250) | oklch(0.985 0.002 250) | page |
| `--bg-raised` | oklch(0.21 0.014 250) | oklch(1 0 0) | cards |
| `--bg-sunken` | oklch(0.145 0.012 250) | oklch(0.955 0.003 250) | columns |
| `--line-subtle` | oklch(0.28 0.014 250) | oklch(0.9 0.005 250) | hairlines |
| `--line-strong` | oklch(0.38 0.016 250) | oklch(0.82 0.008 250) | borders |
| `--text` | oklch(0.93 0.005 250) | oklch(0.2 0.01 250) | primary text |
| `--text-muted` | oklch(0.68 0.01 250) | oklch(0.45 0.012 250) | metadata |
| `--accent` | oklch(0.72 0.14 250) | oklch(0.55 0.16 250) | links, focus, running |

The status-light vocabulary - system colours only (ruling 247), each state
one hue, checked against both themes for the 4.5:1 contrast floor on text
and 3:1 on the pill fill:

| State | Hue | Reading |
|---|---|---|
| running | accent blue | in a session |
| waiting on a human | amber | a decision or answer waits |
| waiting on the author | amber, hollow pill | the requester owes input |
| in review | violet | model review or checks |
| done | green | merged, evidence kept |
| failed | red | terminal, retryable |
| closed | grey | ended without merge |
| stale (badge) | amber ring | no event for 30 min (Linear's 10 s/30 min clock) |

The human palette (ruling 247): eight fixed accents - red, orange, amber,
green, teal, blue, violet, pink - never any state's hue at the state's
chroma; applied as a small label chip on the face and a 3 px left edge on
the card. Set from the card's expanded view, stored as task metadata,
filterable. Never affects any state rendering.

Typography: system-ui at 15 px/1.45 as today; the live activity line in
ui-monospace 12.5 px. Density: cards at ~44-60 px collapsed, 300-340 px
columns, 5-6 columns visible at 1440 px (Plane's fixed 350 px columns that
show 3.2 at 1440 is the refusal).

## Where comments live

Human comments are card content (steal 17): they live on the card's
expanded view and the task page, attributed, styled distinctly from system
events (Trello's typed activity feed). An unread-comment mark (a small
speech-bubble badge with count) shows on the face. Comments persist with
the task (issue comments in Forgejo remain the store - the answer path
already reads them), so Sebastian finds them again. Agents read them as
input on the next session (the existing `human_comment` intake path).

## The human-colour mechanism

Ruling 247: the eight-accent palette above, chosen from the expanded card,
one accent per card plus optional free-text note; a filter control in the
board header selects accents across projects. The accent is task metadata
(set through the console's own action, one POST), visible to anyone who
sees the board, and invisible to the agent's brief.

## Non-goals

Everything in report-final section 4, plus: no live SSE in v1 (the poll
stays; SSE is the roadmap's first item), no keyboard map beyond the
decision key and `?` in the dummy, no swimlanes or group-by (Plane's seven
ways are not ours yet), no per-board field matrix (Wekan's matrix is a
maybe-later), no saved filters in v1, no mobile layout beyond "usable",
no recorder tool (roadmap), no Forgejo mirror (waits upstream).

## What changes in the console, concretely

1. `console.css` becomes the token set above with both themes and the
   `data-theme` switch (dark default, remembered per user).
2. `board.html` restructures into the needs-you band plus columns; the
   card template shrinks to the face above; the expanded view and hover
   peek are htmx-popover fragments of the existing pages.
3. `board.go`'s card gains Title (plan key or objective first clause),
   ActivityLine (last timeline event), Checks (n/n from the timeline),
   Accent (task metadata), UnreadComments; the objective text moves to the
   detail.
4. Comments: one form on the expanded card, posting through the existing
   answer/comment path.
5. No new dependencies; no framework; htmx only.
