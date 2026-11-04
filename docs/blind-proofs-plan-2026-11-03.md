# Blind proofs: one blind try per criterion, then the blindfold comes off

Written 2026-11-03. Status: built. The four phases are on code main e48c3516 and infra main e804fe3. It replaces the runner concept of
[proof-runner-concept-2026-11-03.md](proof-runner-concept-2026-11-03.md), whose
runner contract it keeps, and it takes the blind idea of
[spec-intake-concept-2026-10-16.md](spec-intake-concept-2026-10-16.md) piece 6 as
the rule for every test criterion, without its audit and its hidden rewrites.

Decisions, Sebastian, 2026-11-03:

- The criteria are made early, by the planner, confirmed with the spec, as today.
  Only their tests come later, written by a prover session the builder never
  meets.
- The builder sees every criterion in full. It never sees the test's code until
  the test has run once.
- One blind try. The first run of a proof at the gate is blind. Whatever the
  outcome, the blindfold comes off after it: a green proof settles its
  criterion, any other outcome hands the test to the builder in full view. No
  hidden rewrite, no audit session. The test will sometimes be wrong and the
  implementation will sometimes drift for good reason, and one blind try is
  still worth making.
- A judgement criterion's model reads an artifact a test writes, never the diff.
- Human criteria are settled one row each on the Needs you card, before the
  merge.

## What happened

The two mechanical kinds of criteria, test and invariant, have never been settled
by a program. The criteria gate ran three times since 2026-10-17 and reported 24
verdicts, all "no test", all wrong, because `go test acceptance` reads a path
without `./` as a standard library path. With that fixed, a test that skips for
a missing Postgres URL would count as passed. The plans closed on the review
model's rows, 13 "met" verdicts on test criteria read off a diff, or on a
person's waiver, 16 of them. The acceptance close that ends a card without a push
never fired once, and card #1504 ran five sessions, three asks and €2.05 for work
that was on main before its first session.

The hold-outs, the one blind check the design has, never stored a row in 24
confirmations. [holdout.go:355](../../ai-software-factory-code/internal/factoryd/holdout.go#L355)
decodes the model's answer with `json.Unmarshal` instead of `decodeAnswer`, so a
fenced answer fails, and three of four answers came back empty. Beyond the bug,
the drafting happens at confirmation, before any code exists, so the test may
use the standard library only and cannot import the feature. It can test almost
nothing.

The full account with the commands and their output is section 2 of the runner
concept.

## The mechanism today

| Step | Who | What it reads | What it writes |
|---|---|---|---|
| Criterion drafted | the planner | the spec | `"test": "TestXxx in <package>"`, a sentence in a house format |
| Test written | the builder, in its card | the criterion | a test in its pull request |
| Criterion judged | the review's model, one call per criterion per round | the diff | a `criteria_verdicts` row, source `review` |
| Criterion run | the criteria gate, at the integration card's approval | the sentence through a regular expression, `go test -v` through grep | findings on the approval card, no row |
| Card closed without a push | the acceptance close | the session's shell commands, word for word against the item text | the card's done |
| Human criterion | the approver | the review's evidence text | met on every human criterion at the merge approval |

Three string parses encode Go, and the builder writes the proof of its own work.

## The design

### One contract for every way a criterion is checked

Every criterion has a kind. The table names, for each kind, what the proof is,
who makes it, who settles the criterion, and when.

| Kind | The proof | Who makes it | Who settles it | When |
|---|---|---|---|---|
| test | one test, written blind, stored outside every workspace until it ran once | the prover session | the runner, from the test's report | at the integration card's gate, and at a no-push session end |
| invariant | a test suite the repository already has, for example every test under `./...`; the proof is that it stays green | nobody, the suite is there | the runner, from the suite's report | the same |
| judgement | an artifact a blind test writes, and a pinned prompt | the prover writes the test, the planner the prompt | one model call over the artifact | at the integration card's gate |
| human | an artifact a blind test writes, or the evidence the criterion names | the prover, or the planner's text | the approver, one row on the Needs you card | before the integration card's merge |

The criterion itself is written early, by the planner, and confirmed by the
human with the spec, as today. The fields change. A test criterion carries
`claim`, `inputs` and `expected`, and no test name: the planner says what is
proven and with which numbers, the prover decides how. An invariant carries
`suite`. A judgement carries `claim`, `inputs` (what the artifact must show) and
`prompt`. A human criterion carries `claim` and `evidence`. The plan validation
refuses a missing field of the kind.

The builder sees every criterion in full: claim, inputs and expected numbers.
The card's acceptance items cite the criteria by id with a text for the agent,
as today. The builder writes its own tests as any developer does, and CI runs
them. They are not the proof.

### The runner

The runner is the agent-less sandbox of the runner concept, sections 3.3 and
3.4, unchanged: factoryd hands the worker a JSON list of proofs, the worker
writes each entry's file into the tree, runs `CHECK_REPORT=<file> bash check
test <suite> [<name>]` through `exec`, and returns the JUnit XML report, an
output tail and the files under `CHECK_ARTIFACTS`. factoryd reads four outcomes
from a report: passed, failed, missing, skipped. Skipped is not passed. A run
without a report is "check test wrote no report".

`CHECK_ARTIFACTS` is new: a directory the runner creates and names in the
environment. A test of a judgement or human criterion writes its artifact there,
under the criterion's id. The worker returns the files, capped at 256 KiB each.

### What a proof may touch

Software ripens late. An interface a feature card starts with is not the one it
merges with, and a test written against it early breaks. So the prover's brief
binds a proof to the surfaces that do not move during a plan:

- the HTTP API, through the server constructor the template fixes
  (`internal/server.New` unless the template says otherwise), which exists from
  the first commit,
- the command line of a binary,
- the store through its test harness, seeded and read back,
- files and output a feature writes.

Most criteria are stated at that surface already, "GET /schedules on a seeded
store, expected three entries", and the planner's prompt asks for that: a
criterion states what the feature does for a caller, not how it is built
inside. A proof at the surface needs no foundation card and no stub. It
compiles on the first day, gets a 404 or a zero, and is red.

A proof reaches into an internal contract only when the criterion cannot be
stated at the surface, a rule engine as a pure function, say. That proof is the
one most likely to break when a feature card moves the contract. When it does,
it opens like any red proof, and the builder adapts it in view.

### The life of a blind proof

1. **Planning.** The planner writes the criteria. The human confirms them with
   the spec. The confirmation form's second zone keeps proposing hold-outs:
   extra criteria the spec's list misses, each a claim with inputs and expected
   numbers and no code. An okayed hold-out is a criterion of kind test that stays
   out of the plan JSON, the briefs and the cards until it ran once.
2. **The prover session.** When the plan's foundation card merges, the sweep
   starts one prover session on the plan task. A plan without a foundation card
   starts it at confirmation. The prover is a report-mode session, as the audit
   session is today: the task's sandbox with the repository at main, the read
   token, no push token, `bash check test` runnable. Its brief holds the spec,
   every criterion of kind test, judgement and human, the okayed hold-outs, the
   surface rule, and the foundation's contracts as main holds them. It writes
   one test file per criterion, runs it, and files the set through one gateway
   tool, `file_proofs`, as the planner files its plan: per criterion the file's
   path, the suite, the test's name, the code and the run's outcome on main.
3. **The dry run.** factoryd runs every filed proof on main through the runner.
   A test criterion's proof must be red there: a test that is green before the
   feature exists proves nothing. A green or missing one comes back to the
   prover as a refusal with the report, up to three filings in the session. A
   judgement or human criterion's proof must run and write its artifact. What
   the third filing leaves green or unrunnable is stored anyway, flagged, and
   opens at the gate without a blind try.
4. **Stored.** The proofs live in `plan_proofs`, the `plan_holdouts` table
   widened by `criterion`, `path`, `suite` and `state`, in the database and
   nowhere else. No workspace, brief, comment or card carries the code.
5. **The gate, the blind try.** At the integration card's approval the gate
   runs every stored proof and every invariant suite on the pull request head in
   one pod. A test criterion whose proof is green is met: a `criteria_verdicts`
   row with source `gate` and the word blind. Any other outcome, red, missing,
   skipped, no report, does not compile, opens the proof.
6. **Opened.** The integration card's next session gets the opened proofs as
   findings: the criterion, the test's code in full and its output. The builder
   commits the test into the repository at the proof's path, and fixes what is
   wrong: the implementation, or the test, or, when the criterion itself cannot
   hold, it raises the question on the card as any card does today. From then
   on the test in the repository is the proof. The gate runs it by suite and
   name at every later head: green is met with the word open, red is a finding
   with the failure, missing is a finding that names the path. An opened
   hold-out's criterion becomes public with it.
7. **The close without a push.** When a session of a plan card ends without a
   push, the runner runs the proofs of the criteria the card cites, at main.
   Every one passed: the card closes done, its reason listing the criteria and
   the head. Anything else: the next session's findings name the criteria not
   met and nothing more. This run opens nothing. The blind try is the gate's.

The builder can weaken an opened test, since it owns the file now. Two things
keep that visible. The review of the integration card gets the opened proofs'
original code in its context, so a change to one is a finding unless the
agent's summary says why. The card's drawer shows the original beside the
repository's version.

### What a failure of a mechanical test does

| State at the gate | What happens | Who sees what |
|---|---|---|
| A stored proof is green | the criterion is met, source gate, blind | the row on the card |
| A stored proof is red, missing, skipped, without a report, or does not compile | the proof opens: the next session's findings carry the criterion, the code and the output | the builder sees the test |
| An opened proof is red | a finding on the card with the failure from the report | the builder sees it |
| An opened proof is missing at its path | a finding that names the path | the builder sees it |
| An invariant is red | a finding with the failed tests from the report | the builder sees it |
| The sandbox cannot start | the start escalation, as the reproduction gate's: run again or close | the human decides |

One blind try, then full view. After it the three questions, is the test wrong,
is the implementation wrong, is the criterion wrong, are the builder's, with the
review and the human behind it as for any finding. The session-cap ask and the
check-in stand as they do today when a builder does not get there.

### The human's check

A human criterion reaches one row on the Needs you card of the integration
card's approval, beside the rows of the other kinds, in the criteria card of
design decision C42. The row shows the claim, the evidence, and three presses:
Met, Not met and Waive with a one-line reason. The evidence is the artifact the
criterion's proof wrote, a text in a fenced block or an image, or the text and
links the planner's `evidence` field names when no test can produce it. Met and
waived write an `approver` row. Not met is a finding to the builder, with the
human's words. The merge approval of the integration card opens once every
criterion has a standing verdict. It no longer marks human criteria met.

The card also carries the rows of the other kinds, read only: a test criterion
with its gate verdict, blind or open, and the failure message, a judgement with
the model's reason, an invariant with its suite's count. Waive stays available
on every row, as today.

### The model's check

A judgement criterion is one model call per gate run, not one per review round.
Its input is fixed by construction: the pinned prompt from the criterion and the
artifact the proof wrote. It gets no tool and no diff. It answers met or unmet
with a reason. The row records the model and the prompt's hash, so a re-run on
the same head is comparable. A criterion whose artifact is missing has no
verdict and is a finding that names the proof.

The review's per-criterion calls go. The whole-pull-request review stays and
reads the diff as it does, with the card's objective and the opened proofs'
original code.

## What the lifecycle tool sees

The card digest (`CardDigest`, the chat's `card`, `card_step` and
`board_digest` tools, the drawer's fold, the check-in's `card_facts`) is built
from the task row, the events table, the timeline object, the criteria rows and
the cases. It renders what it knows and skips the rest: a timeline line of a
kind `timelineSteps` does not read is not a step. That is why the criteria
gate's three runs are invisible in a card read today: `GateCriteria` writes
`gate_criteria` to the timeline alone, the digest never reads the kind, and the
events table never gets a row. Every moment below is written where the digest
reads, rendered as a numbered step with a detail, and added in the phase that
creates it, never later.

The rule: a moment that is a fact of the card's life goes through
`recordEvent`, the timeline line and the events row together, with its kind and
detail contract in `events.go` and the kinds test. A moment that is a session's
or a gate's run goes to the timeline with a kind `timelineSteps` reads. A
verdict is a `criteria_verdicts` row, which the digest already turns into a
step per write.

| Moment | Card | Written as | Digest step: kind, actor, outcome | `card_step` detail |
|---|---|---|---|---|
| The prover starts and ends | the plan task | timeline `session_start` and `session_end` with `role: prover` | `session`, "1 prover big", the outcome and the cost | the session's lines and its transcript pointer, as any session |
| A filing of proofs | the plan task | event `proofs_filed`: filing number, per criterion id, path, suite, name, outcome on main, and the refusals with their reasons | `proofs`, "prover", "filing 2: 7 red on main, 2 refused" | every criterion's line and every refusal's reason |
| The proofs are stored | the plan task | event `proofs_stored`: the stored ids, the flagged ids with their flag | `proofs`, "factoryd", "9 stored, 1 flagged green on main" | the list |
| The gate runs | the integration card | timeline `gate_criteria` with the head, per criterion the state (stored or opened), the outcome, the report's message, the artifact's name; and the invariants | `proofs`, "gate", "at 8e3a1b0: blind 6 met 2 opened, open 1 met, invariant ./... green"; Findings carry the ids of the opened and red lines | every criterion's line with its message in full |
| A proof opens | the integration card and the plan task | event `proof_opened`: criterion, head, outcome, message, the hold-out's criterion text when it was one | `opened`, "gate", "size_bound_escape: red at 8e3a1b0: want 3.75, got 3.5" | the test's code and output, as the builder gets them |
| A verdict lands | the integration card | `criteria_verdicts` row, source `gate`, `judgement` or `approver`, the evidence opening with blind or open for a gate row | `criteria`, the source or the human, "size_bound_escape met (blind), group_open_hours unmet" | the rows of that write with their evidence |
| A judgement call | the integration card | timeline `judgement`: criterion, model, prompt hash, verdict, reason, cost | `judgement`, the model alias, "met: the page names every panel's proof" | the artifact's name, the model, the hash, the reason in full |
| A human settles a row | the integration card | event `criterion_decided` with verb met, not_met or waived, as today's grants and waivers | `criteria`, the human, "pages_readable met" | the evidence shown and the human's words |
| The proofs run at main after a no-push session | the card | timeline `proofs_at_main`: head, per criterion the outcome | `proofs`, "runner", "at main 29b0d33: 9 of 9 met" | every criterion's line |
| The card closes on its proofs | the card | the `task_ended` row, as any close | `ended`, "done: proofs met at 29b0d33: ..." | as today |

The board digest's plan line gains the proofs' state, "proofs 9 of 9 stored",
and the integration card's line the blind count, "blind 6 of 9".

New flags, in `digestFlags`, each named for the problem it points at:

| Flag | When | Detail |
|---|---|---|
| `proofs_missing` | the plan's foundation card merged over an hour ago and no `proofs_stored` event exists | the hours |
| `prover_refused_thrice` | a `proofs_stored` event flags a proof | the criterion |
| `opened_proof_red_twice` | an opened proof is red at two heads | the criterion |
| `opened_proof_changed` | the repository's version of an opened proof differs from the original at the approval | the criterion and the path |
| `criterion_unproven` | the integration card is at the approval and a criterion has no row from any source | the criterion |

The numbers the plan is judged by are queries over these records: the share of
met criteria the blind try settled, `gate` rows with blind against all met
rows; opened proofs per plan from `proof_opened`; refusals per prover session
from `proofs_filed`. Each is one query on the events table or the criteria
rows, no timeline read.

## The fix

Four phases. Each phase ends on main, pushed, with its tests green and the
evidence links regenerated.

### Phase 1: the runner

The runner concept's sections 3.3 to 3.5, with `CHECK_ARTIFACTS` added.

- `cmd/agent-worker/repro.go`: a proofs mode beside the repro mode. factoryd
  posts the JSON list, each entry `{id, suite, name, file: {path, content}}`,
  to the worker's message port once the pod runs, so no proof code sits in
  the pod's environment or in a file at rest. The worker writes each entry's
  file for that entry's run alone, runs `bash check test` through `exec` with
  `CHECK_REPORT` and `CHECK_ARTIFACTS` set, and returns per entry exit, tail,
  report bytes and artifacts. `maxReproOutput` keeps its value, its marker
  comment goes.
- `internal/harness/envelope.go`: the `Proofs` report type.
- `internal/factoryd/junit.go`: the JUnit reader, `encoding/xml`, four
  outcomes.
- `internal/factoryd/criteria.go`: `criteriaRuns`, `criteriaScript`,
  `parseCriteriaMarkers`, the two regular expressions and the marker format go.
  `GateCriteria` builds the list, calls the runner, writes `gate` rows through
  `PutCriteriaVerdicts`, and keeps its findings and its comment.
- `internal/factoryd/verdict.go`: `standingRow` ranks `approver` over `gate`
  over `judgement`. `reviewCriteriaStep` and `planCalls` skip test and invariant
  criteria. `RecordHumanCriteria` goes.
- `check` in the code repository: the `test` mode of the runner concept, section
  3.3, through `scripts/pg-test.sh` and gotestsum.
- `internal/factoryd/carddigest_timeline.go` and `carddigest_detail.go`: the
  `gate_criteria` line becomes the `proofs` step with its detail, and the
  `criteria` step's outcome shows the source's word.

### Phase 2: structured criteria and the prover

- `internal/factoryd/plan.go`: `PlanCriterion` loses `Test` and gains `Suite`.
  `judgePlan` checks the fields by kind. The planner's prompt describes the
  kinds by their fields, asks for criteria at the feature's surface, and drops
  "TestXxx in <package>". `criterionNames` and `cardFacts` follow.
- `internal/factoryd/holdout.go`: the proposal at confirmation files claims
  with inputs and expected numbers, no code, decoded through `decodeAnswer`.
  `auditHoldout`, `auditGuide`, `SettleHoldouts`, `rewriteOnBase`, the
  `file_verdict` tool and `HoldoutVerdict` go: no audit, no hidden rewrite.
- `internal/factoryd/prover.go`: the prover session. `proveCriteria` runs
  `reportSession` on the plan task with the prover's guide, reads the filed
  proofs, dry-runs them through the runner, sends a green or unrunnable proof
  back as a refusal, and stores the rows after the third filing. The sweep's
  `CriteriaPass` calls it for a plan whose foundation card is merged and whose
  proofs are not stored, or at confirmation for a plan without one.
- `internal/gateway/tools.go`: the `file_proofs` tool, `ProofsFiler`, one
  filing per call, refused with reasons as `file_plan` is.
- `plan_proofs`: migration from `plan_holdouts`, new columns `criterion`,
  `path`, `suite`, `artifact`, `state` with the values stored and opened, the
  audit columns dropped. The store's hold-out methods take the new name.
- `internal/console`: the confirmation zone shows claims without code. The
  plan's drawer shows "proofs: 7 of 9 stored" and the prover's refusals.
- `internal/factoryd/events.go`, `carddigest.go`, `carddigest_detail.go` and
  `board_digest.go`: the `proofs_filed` and `proofs_stored` events with their
  detail contracts, the prover's `role` on its session lines, the `proofs`
  steps on the plan task, the board digest's plan line, the `proofs_missing`
  and `prover_refused_thrice` flags.

### Phase 3: the gate, the opening, the human and the model

- `internal/factoryd/criteria.go`: the gate runs stored proofs, opened proofs
  by suite and name, and invariants together, writes the rows, and opens a
  stored proof that is not green: state opened, the findings with the code and
  the output.
- `internal/factoryd/brief.go` and `gates.go`: the integration card's session
  brief carries the opened proofs, the review's context their original code.
- `internal/factoryd/judgement.go`: one call per judgement criterion over its
  artifact, the row with model and prompt hash.
- `internal/factoryd/verdict.go` and `internal/console`: the Needs you card's
  human rows with Met, Not met and Waive, the artifact rendered, the merge
  approval held until every criterion stands, and the drawer's original beside
  the repository's version of an opened proof. `DecideCriterion` takes `met` on
  a human criterion with the approver's evidence.
- `internal/factoryd/activities.go` and `workflow.go`: the no-push session end
  runs the card's cited proofs at main and closes the card on a full pass.
  `acceptance.go` loses `runsAcceptance`, `acceptanceHit`, `shellWords`,
  `addsOperator` and `acceptanceModes`.
- The digest: the `proof_opened` event and its `opened` step, the `judgement`
  timeline line and its step, the `proofs_at_main` line and its step, the
  `criterion_decided` verbs met and not_met, the board digest's blind count,
  and the `opened_proof_red_twice`, `opened_proof_changed` and
  `criterion_unproven` flags.

### Phase 4: templates and documents

- The ts-go template's `check` gets the `test` mode with a vitest branch under
  `web/` and a gotestsum branch elsewhere. Its AGENTS.md names the mode and says
  that the criteria's proofs are written elsewhere and arrive after their first
  run.
- `docs/spec-driven.md`: the kinds table, the change end to end, the hold-out
  section. `docs/architecture.md`: the criteria gate, the hold-outs, the
  acceptance close. `docs/evidence.md` and the landing page follow the new
  guarantees.

## Tests

- `junit_test.go`: the four outcomes from hand-written reports, a report with
  nested suites, an empty report, a file with text after the root.
- `repro_test.go` in the worker: a proofs run writes the file, sets both
  environment names, returns the report and the artifacts, caps an artifact.
- `criteria_test.go`: the gate writes `gate` rows, met with the word blind for
  a green stored proof, opens a red, a skipped, a missing and a non-compiling
  stored proof with the code and the output in the findings, runs an opened
  proof from the repository and reports red and missing as findings, no row for
  judgement and human kinds, a skipped test is never met.
- `plan_test.go`: `judgePlan` refuses a test criterion without `expected`, an
  invariant without `suite`, a judgement without `prompt`.
- `prover_test.go`: a proof green on main is refused with the report, the third
  filing stores what is left and flags it, the sweep starts the prover once the
  foundation card is merged and never twice, a plan without a foundation card
  starts it at confirmation, a flagged proof opens at the gate without a blind
  try.
- `judgement_test.go`: the call gets the artifact and the prompt only, the row
  carries the model and the hash, a missing artifact is a finding.
- `verdict_test.go` and the console lab: a human row's Met, Not met and Waive,
  the merge approval held until the last row stands, the artifact rendered, the
  drawer's original beside the repository's version.
- `rounds_test.go`: the no-push end closes a card whose proofs pass at main,
  names only the criteria otherwise, and opens nothing.
- `carddigest_test.go`: every row of the moments table renders as its step
  with its outcome, `card_step` gives its detail, each of the five flags fires
  on a hand-built card and stays quiet on one step short of it, and a card
  with a `gate_criteria` line from before this change still renders.
- `board_digest_test.go`: the plan line's proofs state and the integration
  card's blind count.

## Alternatives considered

- **The audit of piece 6: a session judges a red proof as wrong test, real gap
  or spec question, with hidden rewrites and a bending guard.** It keeps the
  blindfold on through a second try and needs an audit session, a rewrite that
  must be red on the base, and a human ask for every edge. One blind try gives
  most of the value at a fraction of the machinery, and the builder, the review
  and the human answer the three questions in the open.
- **Keep the builder's test as the proof and add a model call that compares it
  with the criterion.** Cheaper, and the model's reading of a test is the weak
  link. A blind test needs no reading.
- **One model call drafts the blind tests at confirmation, as today.** It cannot
  compile against the feature, so it can only test from outside, and its dry
  run has no second attempt that sees the error. The prover session runs the
  test itself.
- **Adapters per test framework inside factoryd.** The factory would know every
  tool and parse every output. The `check test` contract keeps that in the
  project's own script, where CI's knowledge already lives.
- **Hide the criterion's numbers from the builder as well.** Then the card's
  acceptance items cannot name them and the confirmed spec is not what the
  builder reads. The test team model, same spec and separate code, holds.

## Out of scope

- A policy gate that sends every diff touching `check` to a human.
- Images as artifacts for the vision model. Text and HTML first.
- Plans filed before this change. None is open. The closed ones keep their
  JSON.

## Cost and risk

- A prover session per plan, about one planner session's cost, €1 to €3, once.
- One gate pod per integration card head, minutes, as the gate costs today when
  it works.
- The review loses its per-criterion calls: on pull request 1506 that was 13
  calls and about €6 per round.
- The judgement kind costs one call per criterion per gate run.
- The risk is how often the one blind try is worth it. A proof that opens red
  for a wrong test or a moved contract costs the builder a session with the
  test in hand, which is what it would have spent writing the test. The rows
  record blind or open for every met criterion, so the share of criteria the
  blind try settled is one query, and that number says whether the prover earns
  its session.
