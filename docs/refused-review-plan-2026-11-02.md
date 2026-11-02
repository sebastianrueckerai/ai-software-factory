# The refused review and the plan that cannot close

Written 2026-11-02. Status: plan, awaiting Sebastian's OK. Nothing changed.

Fault 5 of docs/needed-fixes.md.

## What happened

On the night of 2026-11-01 the October month cap was spent. Card #1380, the
integration card of plan #1345, reached its final model review, and the
gateway refused the call (refused_month_cap). The review activity turned the
refusal into a review with a note and no verdict, the approval ask opened
with "risk class normal: a human decides the merge" and nothing about the
review, Sebastian approved, and the pull request merged with no model review
at all.

The hidden half: that review is the only writer of the plan's criteria
verdict rows. None were written, so the plan can never close, and the close
check files a gap ask that reads "criteria not met" when the truth is
"criteria never judged".

## The mechanism

The gateway returns a money refusal as a policy Refusal with a decision and
a reason (`internal/policy/holds.go`: refused_budget, refused_day_cap,
refused_month_cap, refused_project_cap, refused_premium_cap). The review
turns it into a note: `callNote` builds
`Review{Note: "model review refused by the gateway (refused_month_cap): ..."}`
(gates.go:1308), the same shape a pre-flight skip produces. A review with a
note has no verdict, so the criteria half never runs (gates.go:1513) and no
verdict row is written. A refused call also opens no session, so the
register's "no session row" is by design, not a defect.

Part of the trace exists at HEAD: the tail of ModelReview records a pull
request comment, a model_review event and the attempt fact even on the note
path (gates.go:1546). The night's roll predated that recording, which is why
the register found nothing. Three gaps remain on main:

1. The human surface never learns. The note rides the MergeSpec, because
   RequestApproval sets `VerdictSummary: cmp.Or(review.Summary, review.Note)`
   (gates.go:1644), but the ask's Reason stays "risk class normal: a human
   decides the merge" (gates.go:1654) and no why-human line names the review.
   The brief model may weave the summary into its text, or may not. On the
   night it did not.

2. Nothing holds the merge. awaitApproval goes from the approved signal
   straight to ActivityMerge (workflow.go:2984). r.merge refuses a stale
   revision, a moved base, a red head and a missing token
   (gates.go:1806), never the criteria. An integration card whose review
   never ran merges on one press, and the auto-merge path would merge it
   with no press at all (gates.go:1834).

3. The close cannot tell the two truths apart. reviewCriteriaStep
   (verdict.go:581) is the only writer of rows with source "review".
   With no rows, effectiveVerdict (verdict.go:371) reads every criterion as
   open, the same reading an unmet row gets, and planCloseCheck
   (verdict.go:858) sends everything open to openGap (verdict.go:951) with
   the reason "criteria not met with the plan's cards done"
   (verdict.go:958). A judgement that never happened and a judgement that
   failed render identically.

## Why it is wrong

A money refusal is a state with a known unblock, the cap is raised or the
month turns, not the absence of a review. Two surfaces lie about it. The
approval ask hides the one fact that changes the decision, and the close
check reports a judgement that never happened as a judgement that failed.
Both break the factory's own rule that every result names the real state and
the fitting action.

The merge itself: the approver settles the human criteria "on the evidence
the review gathered" (docs/spec-driven.md). With no review there is no
evidence to settle on. The night's press was an approval asked under a
false summary.

## The fix

Five changes, all by construction. No prompt rule is added.

1. The ask names the not-run review. In RequestApproval (gates.go:1615):
   when the review carries a note, the Reason gains
   ". The model review did not run: <note>" and a fixed why-human line names
   the refusal and its unblock. The month cap reuses the sentence the
   month-cap question already carries (question.go:439): "The gateway
   refuses every further call (refused_month_cap) until the cap is raised or
   the month ends." The other decisions get the same shape with their own
   unblock, and a class without one gets the plain naming line. Fixed lines
   in the spec, not brief-model discretion: the fact is deterministic, so
   the surface is.

2. The merge holds, and the hold asks. In r.merge (gates.go:1796), after the
   stale-revision refusal (~1810): load the criteria context with the same
   loader the review uses (verdict.go:1097). If the card is the plan's
   integration card and any criterion of the current revision has no verdict
   row from any source, refuseMerge with
   "the merge is held: <n> criteria were never judged, the model review did
   not run (<note>)", and open the merge approval ask from runner code with
   the refused review and change 1's lines, the same pattern openGap uses to
   file an ask (verdict.go:951). Opening the ask in the guard is what keeps
   every refused path on a human surface: the workflow answers a plain
   refusal by resetting the approval wait (workflow.go:3030), and without
   the ask that reset is a silent stall. The guard covers every merge path:
   the approval press, the retry timer, the auto-approvers. It is
   runner-side, so replay is safe: a replayed run returns its recorded
   result, only new executions take the guard. Judged means a row exists,
   not that it is met. An unmet row is a real verdict with its own designed
   path, findings at the gate and the gap ask at the close.

3. The press re-runs the review. In awaitApproval, after the approval
   adjudicates (workflow.go:2962) and before ActivityMerge (workflow.go:2984),
   under a new change id review-holds-merge, max version 1: a query activity
   returns the plan's unjudged criterion ids for the card, one store read.
   Empty: merge as approved, no extra cost for the cards that have their
   rows. Not empty: run the same ActivityModelReview the gate ran, with the
   stage's inputs. Three outcomes:

   - Verdict approve. The rows are written, the re-query comes back empty,
     the merge runs with the recorded approver. One press, the good path.
   - Verdict concerns with findings. Return the findings verdict. The card
     goes back to its sessions, the same path a concerns review takes at
     the gate (workflow.go:2922). The press was premature and the card
     earned its return.
   - A note again, the money is still short. No merge. The ask of change 2
     is already open and names the note, the wait resumes. No timer retries
     the review on its own: the press is the signal that money is back.

   The branch is new code at a new site, so every run that reaches it after
   the roll takes it. The change id follows the convention and pins the
   site for future changes.

4. The close tells never-judged from unmet. In planCloseCheck
   (verdict.go:858), inside the existing all-final and at-rest conditions:
   split the criteria of the current revision into those without any row
   and those whose standing row is unmet. Unmet rows only: today's gap ask,
   unchanged. Any criterion without a row: a new ask kind criteria_rerun on
   the plan, reason "criteria never judged: the review of card #<issue> did
   not run (<note>)", the note from the integration card's latest
   model_review event, or "the review never ran" when no event exists. The
   dedup counts a pending ask of either kind, criteria or criteria_rerun,
   so the two never stack. A criterion of the human kind, which the review
   does not judge, stays named in the ask beside the existing
   confirm-delivered and waive actions.

5. The rerun ask acts. The console's Approve on criteria_rerun resolves the
   ask and calls a runner method CriteriaRerun that judges the missing
   criteria against the integration card's merged pull request. The
   unfunded pre-check runs first (reviewfan.go:119): a short wallet names
   the shortfall and re-opens the ask with the note. Then the review's own
   primitives: the criteria context, the planned calls, the verdict rows
   with source "review", the criteria_verdicts event, a comment on the plan
   issue with the outcome. The next CriteriaPass closes the plan when every
   row stands met, or files the gap ask for what the rows now honestly say
   unmet. A waiver stays the other exit: it writes an approver row, which
   also counts as judged. The new kind gets its brief case (brief.go), its
   poke case (pokes.go) and its answer action beside GrantCriteria
   (actions.go:1986), the same wiring the four existing kinds have
   (store.go:739).

## Tests

Hand-derived expectations, written before the code:

- Merge guard: an integration card whose revision holds a criterion with no
  row is refused with the named reason, and a merge approval ask is open.
  The same card with a row for every criterion merges as today. RED.
- Ask naming: RequestApproval with a refused Review names the not-run review
  in the Reason and the why-human lines, the month-cap decision with its
  unblock sentence. Without a note the text is today's. RED.
- Workflow: an approval with unjudged criteria runs ActivityModelReview
  before ActivityMerge, and a clean verdict merges with the recorded
  approver, one press. RED.
- Workflow: the re-run returns the note again, no ActivityMerge runs, the
  ask stays open with the note. RED.
- Workflow: the re-run returns concerns, the wait returns a findings
  verdict and the card goes back, no merge. RED.
- Close split: all cards final, an empty verdict table files criteria_rerun
  with "never judged", never the gap ask. Unmet rows only file today's gap
  ask with today's reason. Mixed files one rerun ask naming both. RED.
- Rerun action: approve on criteria_rerun stores rows with source "review",
  records the event, resolves the ask, and the next CriteriaPass closes the
  plan when all rows stand met. A gateway refusal stores nothing and
  re-opens the ask with the note. RED.
- Pin at HEAD: a refused review records the pull request comment, the
  model_review event and the attempt fact, and writes no verdict rows.

## Alternatives considered

- A timer that retries the review until money returns. No house precedent:
  every money refusal today ends in a human ask, and a retry loop would
  spend the moment the cap moves without a human weighing the card. The
  press is the signal that money is back.
- Holding the merge by not opening the approval ask, a stop before the ask.
  Two surfaces for one decision, the exact shape of fault 1. The approval
  card with the named note is the surface.
- A "merge anyway" overrule on the ask. The spec bars it: the approver
  settles the human criteria on the evidence the review gathered. An
  unreviewed merge also leaves the plan unclosable, the symptom this plan
  removes.
- The close check re-running the review from its own sweep, the draftDelta
  precedent. A sweep call spends money no human granted for a card whose
  work is finished. The ask keeps the money rule.
- CriteriaRerun reusing ModelReview wholesale. It would re-run the diff
  review on a merged pull request, findings with no actor, billed to a
  final card. The primitives without the diff half are the honest size.

## Out of scope

Fault 6, the raised cap that reaches the enforcing gateway only on a roll:
this plan names the refusal wherever it appears, but the cap itself stays
frozen until fault 6 lands. Fault 3's unpayable sessions and fault 4's
five-part tail are separate plans. Plan #1345's pending gap ask stays
answerable on its own terms: waive per criterion, or confirm-delivered.

## Cost and risk

Fixes 1 and 2 live in gates.go, fix 3 in workflow.go, fixes 4 and 5 in
verdict.go, store.go, brief.go, pokes.go and actions.go, tests beside each.
One roll carries all five: between the guard and the press branch a press
cannot heal itself, so the two ship together.

The guard cannot spin: a plain refusal resets the approval wait and arms no
retry timer (workflow.go:3030), and the ask it opens is deduped. A replan
that adds a criterion while the card waits makes the new criterion unjudged,
the merge holds, the press judges it. That is the designed behaviour, not a
regression. The remaining corner is an in-flight run whose press is followed
by a merge activity error and then a vanished row, a path with no actor in
practice: the close check names the plan at rest.
