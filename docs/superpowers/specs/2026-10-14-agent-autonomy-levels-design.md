# Agent autonomy levels for the project agent

Design spec, 2026-10-14. Status: draft for Sebastian's review. Written from the
discussion of 2026-10-14 and a survey of the code on the same day.

## What and why

Sebastian today plays the factory's human: he OKs the cards the factory puts on
the board, in a parallel session. This design gives the project agent the
authority to OK and to file cards itself, under named levels he controls, so the
factory runs with him out of the loop except for direction, money and merges he
chose to keep.

The trust argument: the OK before a start was never the safety mechanism. The
verification gates, the budget holds, the sandbox and the egress rules run no
matter who OKed the start. Removing the human click costs little risk. What must
never be automated is the decision class: direction, budget raises, and the
level itself.

## Rulings from the discussion (Sebastian, 2026-10-14)

1. `merge_rule` stays a separate switch. A state where everything runs on auto
   exists on top of the two switches.
2. The agent never invents tasks. When nothing on the roadmap is ready, it
   stops and asks for input, at every level, including full auto. Inventing
   tasks is allowed only where the roadmap grants it in an explicit line.
3. Backlog cap 8 against WIP 5.

## The switches

Per project, in the project's policy file (infra repo, versioned and activated
as today):

```yaml
autonomy: manual          # manual | assisted | autonomous (new)
merge_rule: human         # human | auto (unchanged, separate switch)
backlog_cap: 8            # new, default 8
work_in_progress: 5       # unchanged, default 5
```

The console shows the level as a selector on the project screen. Changing it
writes a policy change, which lands in the audit like every decision.

### The four console states

- **manual**: today. Everything confirms.
- **assisted**: the agent starts and files ready work by itself.
- **autonomous**: everything assisted does, with the remaining chat confirms off.
- **full auto**: autonomous plus `merge_rule: auto`. The one state where
  nothing waits for a human except direction and money.

The underlying truth stays the two switches; full auto is their combination,
shown as one state so the selector reads plainly.

## What each level changes

The level resolves into the project's `chat.confirm` list, the existing
mechanism where a listed tool renders a proposal with a Do-it button and an
unlisted tool runs at once (all action tools are listed today).

**Always-confirm set, at every level:** merge approve and deny while
`merge_rule` is human, fund (budget raise), the level and cap changes
themselves, invites and anything outside the project.

- **manual**: the list holds every action tool, as today.
- **assisted**: removed from the list: `move_card` into a starting lane,
  `start_plan`, `accept_plan`, `new_card`, `retry`, `grant_session` within
  budget, and self-answering of the mechanical needs-you kinds (a session grant
  within budget, a retry after a fixable failure). Every start and filing still
  passes the ready check below. Direction questions reach the human.
- **autonomous**: the rest of the list goes off. Merges follow `merge_rule`.
  Spend rails, sandboxes and gates unchanged. Direction questions still
  escalate with choices.

A question the agent may not answer itself is never answered by a level. The
needs-you kinds that name a human (missing information, a direction or product
question, a spend beyond budget) wait at every level.

## The ready check

One deterministic function in factoryd, run at the moment of an agent start
(lane move) and at every agent filing (`new_card`, plan acceptance,
`delegate`):

- the card carries acceptance criteria,
- its scope sits inside the size bounds,
- a budget quote prices it without refusing,
- WIP and backlog have room.

A card that fails waits for the human in manual and assisted. In autonomous it
is not started, and when nothing ready remains the escalation below fires.

The check reuses the pieces `ValidatePlan` and the size bound already apply to
plan cards; it applies them at the start gate and at filing.

## Filing and the backlog cap

`backlog_cap` bounds non-terminal cards that hold no admission stamp, the
complement of WIP's admitted count. The check runs at every filing action. At
the cap the filing refuses and the chat says so in one line. Webhook intake
still files issues as cards in v1: a signal from outside is wanted, not agent
initiative. With WIP 5 and backlog 8, a change of direction can strand only a
handful of cards. No staleness sweeper, no card expiry.

## Roadmap exhaustion and task invention

When no remaining roadmap item passes the ready check, the agent files one
escalation that names the state, each remaining item with the reason it fails,
and the roadmap's open questions and spikes. Then it parks. This happens at
every level, including full auto: there is no workaround, and the bar never
lowers to keep the factory busy.

The agent invents tasks only where the roadmap grants it in an explicit line
(for example: "the agent may file its own tasks for X"). The check reads the
roadmap for that grant; no grant, no invention. A drafting or refinement pass
without the grant is out of scope for v1.

## Recording

Every agent OK and every agent filing records its decider in the audit, the
way auto merge records "merge rule auto" today: the level, the project and the
chat task behind the decision. Who decided what stays countable, and the
intervention rate metric can read it later.

## Non-goals

- No roadmap entity in the control plane. The spec and the backlog issues stay
  where they are; the planner reads them as today.
- No new approval object for starts. The lane move plus the policy check is
  the gate.
- No batch approval. The agent presses OK one by one at no cost; batching was
  a human convenience.
- No staleness re-checks of queued cards in v1.
- No drafting or refinement of unclear items in v1, outside a roadmap grant.

## Open points for the implementation plan

- The exact tool-by-tool confirm lists per level, as one table in policy.
- Where the ready check reads acceptance criteria and size bounds, so it and
  `ValidatePlan` share one implementation.
- The escalation's shape, on the existing `choices` field.
- The exact wording of the roadmap grant line the invention check matches.

## Evidence from the code survey, 2026-10-14

- `chat.confirm` list per project, Do-it proposals with undo, all action tools
  listed by default: `internal/policy/policy.go` (`DefaultChat`), the chat
  proposal flow in `internal/console/chat.go` of ai-software-factory-code.
- Start gating is a lane move with `moved_by` permission, no approval object:
  `internal/factoryd/lanes.go`. An issue filed with the `agent` label starts
  with no human OK today; a running agent already files child cards into ready
  through `delegate` (`internal/gateway/tools.go`,
  `internal/factoryd/delegate.go`).
- `merge_rule: auto` merges on review approve plus reproduction and records
  the decider: `internal/factoryd/gates.go`.
- WIP bound at admission, default 5: `internal/factoryd/bounded.go`,
  `internal/policy/project.go`.
- Budget holds priced before every call against task, day, month and project
  caps; refusals escalate: `internal/gateway/server.go`,
  `internal/factoryd/monthcap.go`.
- Planner plans validated in code before filing: `internal/factoryd/plan.go`.
