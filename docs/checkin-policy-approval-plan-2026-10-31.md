# The check-in's policy stop: the approval card it preempts

Written 2026-10-31. Status: plan, awaiting Sebastian's OK. Nothing changed.

## What happened

Card #1347 (pull request #1358, the metrics contracts) finished its work, its
checks passed, and the policy gate classed its commit `e5908fbb` as a
migration: `requires_approval`, only a human may approve the merge. The card
then stopped at 00:40 with the bare question "This card stopped and needs
your decision: how should it go on?" and three buttons: Go on, Leave it
waiting, End the card. No numbers, no migration facts, no recommendation.

The factory already has the right surface for exactly this decision: the
merge approval card. It was used tonight, approval 984 for pull request
#1361 at 01:37: a written brief, the migration named, the risk class, the
review summary, an Approve button. For #1347 that card was never created.
The card was moved on by hand (Go on) so the approval path can reach it.

## The mechanism

Two paths can act on "the policy gate requires a human", and the wrong one
won the race.

1. The check-in agent wakes on a card while it works
   (`internal/factoryd/checkin.go`). Its instructions name "a policy class"
   as a case where only a human can act, so it answered its wake with the
   decision `human`. Its answer carries a free-text `reason_kind`, and the
   model wrote `"policy class"`, not the constant `policy_class` that
   `parseCheckinAnswer` never checks (checkin.go:528 validates the decision
   against a closed set, the reason kind against nothing).

2. The workflow takes any `human` check-in answer straight to a stop:
   `workflow.go:2062`, `awaitHuman("check-in: " + kind + ": " + reason)`.
   That stop renders through the generic question path (question.go), which
   builds the ask, the why, an info line of boilerplate and the three
   buttons. Four parts, no fifth.

3. The path that should have owned the decision runs later in the same
   workflow: verification runs the gates, and on `requires_approval` it
   calls `ActivityRequestApproval` (`workflow_stages.go:1101`, built in
   `gates.go:1449`). That opens the `merge` approval request with the full
   `MergeSpec`: risk class, the migrations by name, the review summary, the
   reproduction result, the agent's own recommendation, the why-human
   lines. `brief.go` writes its brief, the console renders the Approve
   card, and the workflow awaits that press.

So the check-in, a supervising observer, stopped the card one stage before
the card's own flow would have asked the same human the same question with
every fact attached. The check-in did what its instructions said. The
construction is wrong: two surfaces for one decision, and the weaker one is
reachable first.

## Why it is wrong

The question format's own contract
(docs/question-format-concept-2026-10-17.md) says the ask carries the
numbers, what each answer does, and a recommendation with grounds, and that
premade answers deliver structured values. The generic stop carries none of
that for a policy approval. The human cannot decide from it, which is what
happened: the card sat 19 hours because the ask gave nothing to decide
with.

It also breaks the design principle the factory is built on
(docs/goal.md, the roadmap's third idea): reliability comes from how an AI
step is built, and a fix belongs in code, in a tool's shape, in a check.
The check-in is allowed to name a policy class as a human matter, but the
policy gate is the authority on policy outcomes. The check-in should never
be the thing that renders the policy decision.

## The fix

Two changes, both by construction. No prompt rule is added.

1. Close the reason kinds. `parseCheckinAnswer` rejects an answer whose
   `decision` is `human` with a `reason_kind` outside the four constants
   (`goal_conflict`, `spend_above_policy`, `policy_class`,
   `access_factory_lacks`), the same way it rejects an unknown decision
   today. The existing repair loop already handles a rejected answer: the
   check-in is asked again before its calls run out. A machine-readable
   kind is the foundation change 2 stands on.

2. Route the policy stop to the authority. In the `OutcomeCheckinHuman`
   branch of the session loop (`workflow.go`, after the existing
   `checkinSpend` case at ~2070): when the kind is `policy_class` and the
   card has an open pull request, do not `awaitHuman`. Break to
   verification, exactly as the spent check-in with an open pull request
   already does two branches below: the comment there says a bought session
   would stop at the same cap while the head sits waiting on the approval.
   The same holds here, and verification is the authority on what the
   policy outcome is:

   - `requires_approval` lands on `ActivityRequestApproval`: the approval
     card with the brief and the Approve button, the surface that carries
     the numbers.
   - `forbidden` fails the card properly, as the gate decides, with the
     gate's own reason.

   A `policy_class` stop with no open pull request keeps the human stop:
   there is no approval to file, and a human is still the only one who can
   act.

The change is versioned per the repo's convention, change id
`checkin-policy-verification`, max version 1: a run from before the change
keeps the stop its history was written under. The lesson from card #1345's
incident is standing: an unversioned ordering change poisons in-flight
histories.

## Tests

- Workflow: a `policy_class` check-in stop with an open pull request breaks
  to verification and asks no question. RED today: the workflow calls
  awaitHuman.
- Workflow: the same stop at `DefaultVersion` (old run) keeps the human
  stop, forced with `OnGetVersion("checkin-policy-verification", ...)`.
- Workflow: a `policy_class` stop with no pull request still stops for a
  human.
- Check-in: an answer with `decision: human` and an unknown `reason_kind`
  is rejected and repaired; a known kind passes through.

## Alternatives considered

- A prompt rule telling the check-in not to stop on a policy class. Last
  resort by the design principle, and it leaves the free-text kind in
  place, so the workflow could never match on it safely.
- Filing the approval request at the check-in stop itself. It duplicates
  the merge path: the `MergeSpec` wants the review, the reproduction and
  the earlier reviews, all of which verification holds and the check-in
  does not.
- Leaving it and pressing Go on by hand. That is tonight's workaround, one
  extra gate cycle and a blind press each time it happens.

## Out of scope

The generic question's own five-part shape for the stops that remain (the
question-format concept's tail work) and the escalate rename
(escalate-rename-plan-2026-10-31.md) are separate plans.

## Cost and risk

Small diff, two files and tests. The guard only changes where one stop
class lands. If the policy verdict is wrong or missing, verification
recomputes it, so the worst case is one extra gate cycle before the same
human gate, now with the proper card. In-flight runs are untouched by the
version gate.
