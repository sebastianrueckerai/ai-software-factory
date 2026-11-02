# The plan confirmation becomes a decision, and the file tool names its state

It was fault 2 of docs/needed-fixes.md, which left the list with it.
Written 2026-11-02. Status: built on code
main the same day, as 42812078 (the decision field, the card, the chat, the
file tool) and dc2b4fd0 (the final review's fixes), landed in ed3d5f40,
then 2531bae7 (a batch answer never overwrites one that landed after its
check, and open hold-outs refuse a confirmation by name). The fix list
below states the design as built: the review changed items 1, 2, 4, 5
and 7.

## What happened

On 2026-10-31, on card #1345, Sebastian confirmed a plan revision. His answer
began "okay — confirmed. Revision 15 is ...". The filing rule demands the bare
choice word and nothing else, so the factory read his answer as not confirmed
and filed nothing. The answer sat recorded, no question was open, no revision
was written: the only way out the factory offered was another planner session.
Six sessions in a row then ended believing they had filed, because their file
tool answered "filing succeeded" while it filed nothing. About €2 burned for
nothing.

## The mechanism

The confirmation is the question factoryd appends to a plan revision that
carries a spec and criteria (`askConfirmation`, plan.go:2900, the spec-intake
concept's piece 5): "answer okay to confirm them, or answer with what changes;
the criteria are fixed only when this is answered". The offered choice list
holds one word, "okay". An okay files the revision's cards with no further
session. Any other answer sends the revision back to a planner session with
the words as findings.

Three constructions make the fault:

1. The decision rides on a string. `confirmedByAnswers` (plan.go:2061)
   accepts a confirmation only when the trimmed answer exactly equals one of
   the offered choice words. Prose around the word reads as changes.
2. Any non-empty answer counts as "the confirmation was answered"
   (`PlanConfirmationAnswered`, plan.go:1444, `answer IS NOT NULL`). So a
   prose answer closes the question without confirming anything: the revision
   sits answered, unfiled, with nothing open. That is the limbo of that night.
3. Every writer writes the same free-text field. The plan face renders each
   question the same way, choice buttons plus an own-answer text form
   (templates/board.html, the "plan" define), and the chat's answer tool
   posts free text through the same handlers (chat_tools.go:723). Two doors
   into one decision column, and the rule parses only one door's shape.

The file tool's lie is the fourth. `Runner.FilePlan` (plan.go:2445) checks the
plan, stores the revision and returns the revision number. No cards file on
that path: cards file later in the runner's plan loop (`RequestPlan`,
plan.go:2740) after the confirmation. The gateway's `file_plan` tool answers
"filed as revision %d; it is this session's answer. You may end the session."
(tools.go:1179) the moment the plan JSON is accepted. "Filed" names a state
the call never reached, so six sessions ended done having changed nothing.

## The decision

Sebastian, 2026-11-02: the confirmation is a boolean, the card needs a button.

So the confirmation becomes a decision field with closed values, written only
by structured presses and structured tool calls, held by a database check. The
word "okay" stops being a contract. No Go code anywhere parses prose for a
decision. Prose stays what it is: findings for the next planner round.

Where a human's words must become the decision, the chat, the model does the
reading and sets the field. Language interpretation is the model's job. The
state stays a bool. That is the factory's own design principle applied: the
fix is the tool's shape and the store's constraint, not a smarter parser.

## The fix

1. The store holds the decision. `plan_questions` gains a `decision` column
   (text, null), by a migration in `internal/schema/migrations/factoryd/` in
   the style of `20261017120000_plan_question_kinds.sql`. The `answer`
   column keeps carrying findings text. The migration first carries history
   under the old rule: answered confirmations whose trimmed answer was
   `okay` become `confirm`, every other answered confirmation becomes
   `revise`. Then three checks hold the field: a non-confirmation question
   never holds a decision, a confirmation's decision is `confirm` or
   `revise`, and a confirmation that holds words holds its decision.
   `PlanQuestion` gains the field.
2. The gate reads the field. `confirmedByAnswers` (plan.go:2061) requires
   `decision = 'confirm'` on the confirmation row. The string compare and the
   choice list go. Only a confirm fixes the spec and the criteria: the
   store's read of the confirmed revision becomes `PlanConfirmed` and reads
   `decision = 'confirm'`, so a revision after a revise that keeps the spec
   asks the confirmation again. The hold-out guard reads its own round's
   confirmation, which any decision settles. The limbo state cannot be
   built any more: the third check refuses a confirmation that holds words
   without a decision.
3. The ask stops teaching a word. `askConfirmation` (plan.go:2900) sets no
   choices. `confirmationQuestion` (plan.go:2953) rewords: "Confirm fixes the
   spec and the criteria. Request changes sends your words to the next
   planner round."
4. The card renders the decision. For kind `confirmation` the plan face
   renders two controls in place of the choice buttons and the own-answer
   form: a Confirm button that posts `decision=confirm`, and a Request
   changes form whose words are required and post `decision=revise` with the
   text as findings. Every other question keeps its shape. While the
   confirmation is open, its Request changes is the card's only one: the
   card-level change form returns once the confirmation is decided.
5. The writers carry the decision. `doAnswerPlanQuestion` and
   `doAnswerPlanQuestions` (actions.go:593, 631) take the decision and refuse
   a confirmation answered with bare text by name: the words belong to
   Request changes. The refusal names the state and the fitting action, so an
   old-format call repairs itself. The plumbing runs through console.go:215
   and the runner's answer path into the store. One rule and one wording
   serve every writer and reader: `PlanQuestion.Answered` (a confirmation
   is answered by its decision) and `PlanQuestion.Reply` (the decision, then
   the words). The console's issue comment and intake's echo check build
   the comment the same way, so a decided confirmation's comment is no
   change request. A Confirm beside real questions says the answers go to
   the next planner round, since its cards file only from a later revision.
6. The chat sets the field. The answer tool's input (chat_tools.go, the
   `answer` tool and its schema in `def()`) gains a `decision` value,
   required when the target question is a confirmation, `revise` requires
   words in the text. The tool's description tells the model what it owns:
   read the human's words, set confirm or revise, carry the reasons as text.
   That night's answer arrives as `decision=confirm` with the prose as
   findings. A batch item needs no words for a confirm, and a decision with
   no open question is refused.
7. The file tool names its state. `PlanResult` and `PlanFiled` gain what the
   call reached. After storing, `FilePlan` computes the revision's gate with
   the `confirms` logic (plan.go:2918): no criteria, or a spec unchanged
   under an existing confirmation, means nothing waits; otherwise the human's
   confirmation waits. The gateway copy branches on it. Nothing waits:
   "stored as revision %d; it is this session's answer. Its cards file with
   no further gate. You may end the session." Confirmation waits: "stored as
   revision %d; it is this session's answer. Its cards file only after the
   human confirms the spec and the criteria. You may end the session; a later
   session carries the human's changes, if any." The word "filed" leaves the
   copy, because this call files no cards, and the audit action becomes
   `plan_stored` unless cards filed. factoryd's file handler sends the gate
   to the gateway, and the tool's description says a stored plan is the
   session's answer.

No change id is needed. The rows written before the roll are carried by the
migration, new rows come only from the new writers, and a refused old-format
answer names its repair.

## Tests

Hand-derived, all RED on main a0e2803e:

- The board: a Confirm press files the revision with no planner session.
  Request changes with words sends the words to a planner session as
  findings. Request changes without words is refused by name.
- The chat: `decision=confirm` on a confirmation files. `decision=revise`
  with text carries the words. A confirmation answered with text and no
  decision is refused by name. The night's answer, confirm with the prose as
  findings, files.
- The store: a decision outside the two values is refused by the constraint.
  A decision on a non-confirmation question is refused.
- The gate: a confirmation row with `confirm` files, one with `revise` goes
  back with findings. No test feeds it strings.
- The file tool: a revision that waits names the wait and never says filed,
  and its audit row is `plan_stored`. A revision with no gate says so.
- The limbo: an answered confirmation without a decision cannot be written.

## Alternatives considered

- The wider word match, the register's first idea: the choice word leading
  or standing as its own word, with a "not" guard before it. Rejected: the
  decision stays a string and Go stays in the parsing business. Every new
  phrasing is a new case, and the "not" guard is the tell: negation is the
  model's home ground, not a matcher's.
- Hiding the free-text form for confirmations and keeping the choice word.
  Smaller, but the invariant then lives in every writer's good behavior. A
  new writer reopens the fault: the chat gained its answer tool this month.
  The check constraint holds it for good.

## Out of scope

The plan face's layout, its bounding and its one-question-at-a-time shape,
stays with the Needs-you round: this plan changes only the confirmation's
controls. The unpayable-session loop (fault 3) is its own fault: this plan
stops the confirmation from feeding it, not the grants.

## Cost and risk

A small diff: one migration, the store, the gate's one read, the plan face's
one block, two console handlers, one chat tool input, one result struct and
its copy. A confirmation that waits today renders the new face after the roll
and its press sets the decision. The worst case of a wrong gate computation
is the copy naming a wait that does not happen: the human confirms, the cards
file, no session is misled into more work.
