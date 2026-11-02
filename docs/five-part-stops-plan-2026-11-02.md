# The five-part stops: every generic stop carries its numbers and a grounded recommendation

Written 2026-11-02. Status: plan, awaiting Sebastian's OK. Nothing changed.
This is fault 4 of docs/needed-fixes.md.

## What happened

On card #1347 (night of 2026-10-31) a stop reached the human as "This card
stopped and needs your decision: how should it go on?", three buttons, no
numbers, no recommendation. The card sat 19 hours because the human had
nothing to decide from. Fault 1's plan routes that worst case to the real
approval card. Every other stop that renders through the generic path still
carries the same empty shape.

The question format concept (docs/question-format-concept-2026-10-17.md)
promises five parts: the ask with the numbers, the why, what each answer
does, a recommendation with named grounds, and buttons that deliver
structured values. Three of the five parts reached the check-in stops on
main: the work state rides the ask (b58d8e86), a repeated stop names its
exits (c1716385), a stop that names a decision offers it (5dc22e59). The
fifth part never came: no template in question.go builds a recommendation.

## The classes today

Every stop renders through ShapedQuestion (question.go:134). The table
names what each class carries today. The counts are the concept's board
count of about 170 questions ever asked.

| Stop class | Asks | Ask today | Missing |
|---|---|---|---|
| check-in call cap (question.go:262) | 13 | the call count | the card's money, what Go on buys, the recommendation |
| check-in share spent (question.go:275) | tail | euros of the share | the card's money, the grant's size, the recommendation |
| session cap (question.go:320) | 87 | no number at all | the cap and the grants, the work state (the stop site packs a last line and findings, the template drops them), the card's money |
| budget cannot fund a call (question.go:400) | 3 | euros left and euros needed | the recommendation |
| month cap, project cap (question.go:431) | 8 | no number of the month | the month's spend against its cap |
| deadlock repeat (question.go:307) | tail | the card's limits, the exits | nothing: shaped by c1716385 and 5dc22e59 |
| WaitChecks past its bound, quiet sweep | 39 | attempt and bound | nothing: the supervisor's and the sweep's recommendations ride the reason |
| agent asks, gate supervisor, tool park, roll task | tail | the source's own words | nothing: their Recommendation lines ride the reason |
| check-in stops of the other kinds (goal conflict, access the factory lacks, unreadable answer) | tail | the check-in's sentence | any number at all |

The two check-in spend templates take the reason's body as the why and build
no Recommendation. questionFacts (question.go:732) reads numbers only for
the spend templates and the exits, so the session cap and the month cap
render with none. The check-in's other kinds fall to plainQuestion
(question.go:177), which carries words and no number.

## The fix

Templates and facts, class by class. No new mechanism, no model call, no
change to a reason string.

### The recommendation rule

One helper in question.go builds the fifth part. It fires only where facts
at hand ground an action, it names its source "the factory's", and its
grounds are two facts the stop already holds:

- The check-in spend stops: Go on, when the stop's work state names
  "review: approve" (the review line rides the body since b58d8e86). The
  grounds name the review's approval and the money: the grant against the
  card's spend so far. Without that review line the question keeps four
  parts.
- The budget stop: Fund the computed raise (FundRaise), when the task holds
  an open pull request. The grounds name the pull request and the raise.
  Without one, four parts.

The source is never "the check-in's" here. At both check-in spend stops the
check-in could not finish judging: its calls or its share ran out first. A
line that names a judgment which never happened borrows trust it did not
earn, which the concept forbids. The rule is code reading the review's
verdict and the factory's numbers, and it says so.

### The classes

- **Check-in call cap.** The ask keeps the call count. The why gains the
  card's money: euros spent of the budget, and of it the check-in's share.
  The info names what Go on buys: one more session with the comment as
  guidance, and the budget must cover the session floor of its rung in
  euros (versionCheckinRaise's answer buys the session alone).
- **Check-in share spent.** The ask keeps the euros of the share. The why
  gains the card's money. The info names the grant: one more check-in share
  in euros beside the session the answer buys (versionCheckinGrant). The
  recommendation follows the shared rule.
- **Session cap.** The ask carries the cap and the grants: "reached its
  session cap of 6 sessions, 2 granted by your answers". The why becomes
  the work state the stop site already packs (sessionCapCard,
  workflow_stages.go:478: a "last:" line and the findings). The info gains
  the budget line. No recommendation: the first stop of this class has no
  trend to read, and a repeat already renders as the deadlock ask, which
  carries the exits. Four parts with numbers.
- **Budget stop.** The ask and the buttons keep their numbers. The
  recommendation follows the shared rule. This composes with fault 3's
  plan: fault 3 decides when the ask fires, this plan shapes what it
  carries.
- **Month cap and project cap.** The ask and why gain the month's own
  numbers from the MonthSpend read (monthcap.go:114), the same facts the
  board's cap card carries (monthCapCardQuestion, question.go:678): euros
  spent of the cap, and the month. The gateway's refusal detail keeps
  riding the why. No recommendation: the month's money is the owner's
  call, and no factory fact ranks raising it over parking.
- **Check-in stops of the other kinds.** The ask keeps the check-in's own
  sentence. The why gains one pace line built from the facts: euros spent
  of the budget, attempts against the session cap.
- **Deadlock repeat, WaitChecks, quiet sweep, agent asks, gate supervisor,
  tool park, roll task.** No change: each already carries its parts.

### Where the edits land

- question.go: the five templates above, the pace line in plainQuestion for
  the "check-in: " prefix, the recommendation helper.
- questionFacts: fill the budget and attempt numbers for the check-in and
  session-cap prefixes (the same fill the deadlock branch makes today), the
  session floor for the spend prefix, the task's pull-request number for
  the budget prefix, and the MonthSpend read for the month-cap prefixes.
  QuestionFacts gains the fields those need.
- Nothing else changes. The reason strings, the routing, the store schema
  and the buttons' values stay as they are. The shaped question is display
  text stored at ask time (activities.go:1359), waiting rows keep the shape
  they were asked in, and no answer routing reads the new lines, so no
  workflow version gate: fault 1's plan needs one because it moves a
  stop's landing, this plan only changes what a new stop's card shows.

## Tests

- TestShapedQuestionFamilies: every changed row gains assertions on its
  numbers (the calls, the euros of the share and the budget, the cap and
  its grants, the month totals), and the check-in and budget rows assert
  the recommendation and its source.
- The recommendation stays empty without grounds: a call-cap reason whose
  body carries no review line, a budget stop with no pull request.
- The session-cap why carries the packed work state: the "last:" line and a
  finding.
- questionFacts fills the new numbers per prefix, with the store fake of
  TestQuestionFactsReportTheCapAndTheGrantedShare as the pattern, the
  MonthSpend read included.
- The plain check-in stop gains the pace line, and
  TestShapedQuestionShapesTheUntemplatedTail keeps passing: a reason
  without grounds still gets no recommendation.

## Alternatives considered

- A model-written brief per stop, the approval card's writer (brief.go)
  applied to stops. The concept says no model writes the deterministic
  families. A model call at stop time spends the card's own budget, adds
  the refusal surface that faults 3, 5 and 6 all circle, and can fail where
  a template cannot.
- A recommendation field in the check-in's answer form. The two big
  check-in stops happen exactly when the check-in could not finish, so no
  judgment exists to carry. Fault 1's plan already reworks
  parseCheckinAnswer, and two plans on one parser collide. A field for the
  rare non-spend stops can ride fault 1's change later.
- A "Recommendation:" line written into the reason at the stop sites, the
  way the supervisor and the sweep do it. The reason strings feed routing:
  prefix matches and the repeat guard's marks. A rendering concern does not
  belong in them.

## Out of scope

- Fault 1's routing: a policy_class stop with an open pull request goes to
  the approval card, not a question.
- The board's needs-you cards (stall, repair, alert, rerun, config,
  routine, issue): each carries its own facts and buttons, none renders
  through the generic stop path.
- Fault 3 (when the budget ask fires), fault 6 (the gateway re-reading the
  month line), and the check-in answer form's recommendation field.

## Cost and risk

One template file, the facts reader and tests. Display text only, written
at ask time. A stop shaped wrong cannot misroute an answer, because the
buttons keep their values. The worst case is a wrong number in a sentence,
and the per-class tests pin each number.
