# The dummy against our own research: gaps and the next moves

Task 159. The measure: [report-final.md](report-final.md) - its seventeen
steals, its table stakes, its refusals - against the dummy as it stands
after three click-test rounds. Three verdicts per item: **done** (the
dummy shows it), **gap** (worth building into the dummy next, listed in
the plan below), and **console** (rightly not a dummy matter; it belongs
to the console build and is already in [roadmap.md](roadmap.md)).

## The seventeen steals

| # | Steal | Verdict | What is missing |
|---|---|---|---|
| 1 | Two state axes: column + live badge | done | the activity line is the badge; SSE is console |
| 2 | Badge grammar: nothing renders empty | done | - |
| 3 | Reason on every waiting card | done | - |
| 4 | Face: title + one-line summary, rest one click | done | - |
| 5 | Telemetry triple: elapsed, checks n/n, spend | **gap** | no checks state on the face; elapsed missing on cards that wait in a lane |
| 6 | Card as run-config projection | done | tier and model chips carry it |
| 7 | Buttons are the state machine | **gap** | backlog cards offer no lane-start buttons (the real console has them); failed cards would need Retry (no failed card in the data) |
| 8 | Approvals first-class; deny asks for a redirect | **gap** | deny only talks; no inline redirect box with send/cancel |
| 9 | One event schema | console | the dummy reads the timeline directly; NormalizedEntry is the console's `Event` |
| 10 | Done is an archive with evidence | **gap** | a merged card shows no evidence row (PR, commit, checks verdict) |
| 11 | Hover-peek transcript | done | not headless-verified; his click test is the proof |
| 12 | Parents summarize children | done | - |
| 13 | Derived needs-you surface | done | - |
| 14 | Keyboard-first, single-letter views | done | d/x clear, 1-9/0 run, p pause; overlay exists |
| 15 | Columns as a machine contract | done | drag into machine-owned states refuses with the reason |
| 16 | Security canary on the agent API | console | - |
| 17 | Human comments first-class | done | edit and remove landed in round three |

## Table stakes after Trello and Linear

| Expectation | Verdict | Note |
|---|---|---|
| Both themes, dark default, remembered | done | |
| A face that scans | done | title, about, pill, telemetry, badges - nothing empty |
| Detail one click deep, typed activity | done | and now the chat panel |
| Live updates on the board | console | the dummy's clock is the stand-in; SSE is roadmap item one |
| An inbox-like needs-you surface | done | ranked oldest-first, one-key clear |
| Keyboard operation + `?` | done | |
| Shareable card links | done | `#card=`, `#t=`, `#project=` |
| Undo-shaped feedback | done | every action answers with a line |
| Saved filters | console | accent filter is the only one; saved sets are roadmap |
| Swimlanes / group-by | console | refused for v1 by the proposal |
| Mobile, session search, matrix view | console | roadmap |

## What his click tests found beyond the research

- The chat must be **the** surface, not a section: the full scrollable
  conversation with the steering box is the point of opening a running
  card. A capped box among five sections undersells it.
- Edit affordances need icons (✎, ✕), not words.
- The summary must be human-editable, colour must be one channel, the
  objective needs its headline - all now in the proposal's iteration
  notes.

## The plan

Build into the dummy now (this round, Task 159):

1. **Chat as the drawer's main stage**: the drawer splits into two tabs,
   *chat* (default, fills the whole height, conversation scroll, steering
   pinned at the bottom) and *card* (facts, related, folds, accent,
   comments). Opening a running card opens on the conversation.
2. **Checks on the face**: derive the checks state from the timeline
   (green when the last checks passed, red on findings, queued in the
   merge queue) and show it in the telemetry line; done cards carry the
   evidence row (PR, commit, verdict) instead.
3. **Lane-start buttons on backlog cards** (Plan / Ready, exactly the
   console's move forms) so the button-state-machine reads on the first
   column too.
4. **Deny with a redirect box**: the decision grows an inline text field
   - empty cancels, text becomes the request (Automaker's rule).
5. **Icons**: ✎ and ✕ for comments and queued messages, title keeps the
   word.

Console build (already ruled, no new decisions): SSE live badge and task
page (roadmap 1), the editable summary as a real field the planner writes
and the human may override, comments through the issue store, the
NormalizedEntry event type, the security canary, saved filters.
