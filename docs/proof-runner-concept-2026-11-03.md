# Proofs without parsing: the criteria runner

A concept, not built. Sebastian's question of 2026-11-03: a mechanical criterion must be proven without a model, for any project and any test tool, and without parsing strings. Section 2 describes what runs today and what the production data shows. Section 3 is the concept. Section 4 holds the decisions.

## 1. The four kinds of criteria

The spec-intake concept gives every criterion a kind that names who settles it. The table shows who settles each kind on paper and who settles it in production today.

| Kind | On paper | In production today |
|---|---|---|
| test | The criteria gate, a program | The review's model, reading the diff, or a person's waiver |
| invariant | The criteria gate, a program | A person's waiver |
| judgement | The review's model | The review's model, or a person's waiver |
| human | The approver | The approver |

The two mechanical kinds have never been settled by the program. The rest of this document is about those two.

## 2. How a test criterion runs today

### 2.1 The path from the planner to the plan's close

1. The planner writes the criterion as a sentence in a house format, for example `"test": "TestDivideConquerSizeBounds in acceptance"`. The prompt teaches the format in [plan.go:1186](../../ai-software-factory-code/internal/factoryd/plan.go#L1186). The planner also writes `inputs` and `expected` as prose.
2. Each card cites the criteria it works on by id. The card's acceptance item is a second sentence for the agent, for example "TestDivideConquerSizeBounds in acceptance drives authenticated real-console HTML/JSON with frozen 301/300 ...".
3. The agent builds the card, runs `bash check changed` and pushes. CI runs `bash check` on the pull request.
4. The review's model judges every criterion of every kind from the diff, one model call per criterion. Its prompt is [verdict.go:431](../../ai-software-factory-code/internal/factoryd/verdict.go#L431). It writes one row per criterion into `criteria_verdicts` with source `review`.
5. At the approval of the plan's integration card the criteria gate runs, [criteria.go](../../ai-software-factory-code/internal/factoryd/criteria.go). It reads the sentence with a regular expression, writes a shell script with one `go test -v -run '^TestXxx$' <package>` per criterion, counts `=== RUN` and `--- FAIL` lines with grep, prints one marker line per criterion, and reads the markers back from the last 8 KiB of the pod's output. Every criterion not passed becomes a finding on the approval card. The gate writes no verdict row.
6. The plan closes when every criterion has a row that says met or waived. Only the review and the approver write rows.
7. When a session ends without a push, the acceptance close in [acceptance.go](../../ai-software-factory-code/internal/factoryd/acceptance.go) compares every shell command the session ran with the card's acceptance items, word for word. A match that exited 0 closes the card as done.

### 2.2 What the production data shows

The gate ran three times since it was built on 2026-10-17: on pull request 1314 and twice on pull request 1506. It reported 24 criterion verdicts. All 24 say "no test". All 24 are wrong. The tests existed at both heads:

```
$ git grep -c "func TestDivideConquerSizeBounds" bdbd0345 -- acceptance
bdbd0345:acceptance/divide_size_sessions_test.go:1
$ git grep -c "func TestCardFaceTitle" 178a3d50 -- internal/console
178a3d50:internal/console/face_test.go:1
```

The cause is the package path. The planner writes `acceptance`, and the gate runs `go test acceptance`. Go reads a path without `./` as an import path of the standard library:

```
$ go test -v -run '^TestDivideConquerSizeBounds$' acceptance
package acceptance is not in std (.../go1.26.10.linux-amd64/src/acceptance)
FAIL	acceptance [setup failed]
```

The gate counts zero `=== RUN` lines and reports "no test". The verdict order in `criteriaReport` reads the count before the exit code, so the wrong exit never shows.

With the path fixed, the next hole opens. The acceptance tests need Postgres. Without `FACTORYD_TEST_DATABASE_URL` they skip, and a skipped test exits 0 with a `=== RUN` line and no `--- FAIL` line. The gate would count it as passed:

```
$ go test -v -run '^TestDivideConquerSizeBounds$' ./acceptance
=== RUN   TestDivideConquerSizeBounds
    divide_size_sessions_test.go:31: FACTORYD_TEST_DATABASE_URL not set
--- SKIP: TestDivideConquerSizeBounds (0.01s)
PASS
exit=0
```

The approval cards of both pull requests carried the "no test" findings. All four approvals were pressed over them. The plans closed on the review's rows. The table `criteria_verdicts` holds 13 rows that say met on a test criterion, all written by the review's model from a diff, 16 waived test criteria by a person, and no row from the gate.

The acceptance close has never fired. The events table holds no `acceptance_passed` row. The planner's items are sentences, and no shell command equals a sentence. Card #1504 shows the cost: its work was on main before its first session, five sessions found a clean tree, two session-cap asks and one check-in ask went to Sebastian, €2.05 were spent, and a person closed it by hand.

The review's per-criterion calls are the expensive part of a review. On pull request 1506 the review did not run: "its 13 calls would cost about 6.07 EUR, and the card has 2.14 EUR free". On pull request 1522, 16 calls for about €1.90. Ten of a plan's criteria are ten model calls per review round, and they judge whether a test passes by reading its source.

Hold-outs ride the same gate script. The table `plan_holdouts` holds no row, so that path has never run.

### 2.3 The three string parses

1. A regular expression over the planner's sentence, `^(Test[A-Za-z0-9_]*) in ([A-Za-z0-9_./-]+)$`.
2. Grep counters over the text `go test -v` prints, read back from an 8 KiB output tail through marker lines.
3. A word-for-word comparison of a session's shell commands with the acceptance items.

Every one of them encodes Go. A project that tests with vitest, pytest or Playwright gets no mechanical proof at all.

## 3. The concept

### 3.1 The principle

A proof is data the factory hands to the project's own test runner, and a report the factory reads back. The factory never parses test output and never knows a test framework. The project's `check` script knows its tools, as it does today for CI and for the agents.

### 3.2 A test criterion is structured

The planner fills two fields instead of one sentence:

```json
{"id": "size_bound_escape", "kind": "test", "suite": "./acceptance", "name": "TestDivideConquerSizeBounds",
 "inputs": "...", "expected": "..."}
{"id": "every_test", "kind": "invariant", "suite": "./..."}
```

`suite` is the test's home as the project's runner addresses it: a Go package path, a pytest file, a vitest file. `name` is the test's name as the framework reports it. An invariant has a suite and no name. The plan validation refuses an empty suite, and an empty name on a test criterion. `inputs` and `expected` stay prose, for the agent that writes the test and for the hold-out drafter.

A card's acceptance item keeps its two fields, the criterion id and a text. The text is for the agent and is never parsed.

### 3.3 The runner contract: one mode of the check script

```
CHECK_REPORT=<path> bash check test <suite> [<name>]
```

The mode runs the whole suite, or the one named test when a name is given, and writes a JUnit XML report to the path in `CHECK_REPORT`. The factory reads the report, not the exit code and not the output.

JUnit XML is the contract because every test tool writes it, and the factory needs one reader for all of them. The table lists how the common tools write the report.

| Tool | How it writes JUnit XML |
|---|---|
| go test | `gotestsum --junitfile`, run with `go run gotest.tools/gotestsum@<version>`, as `check` runs gosec today |
| vitest | `--reporter=junit --outputFile` |
| jest | the `jest-junit` reporter |
| pytest | `--junitxml` |
| Playwright | `--reporter=junit` |
| cargo | `cargo nextest` with a junit profile |
| dotnet | `--logger junit` |
| a shell check | the script writes one `testcase` element itself |

The last row is the escape hatch: a proof that is not a unit test, such as `tofu validate` or a smoke request against a started app, becomes one named case the script reports.

The factory reads four outcomes from a report:

| Outcome | What the report shows |
|---|---|
| passed | one or more `testcase` elements, none with `failure`, `error` or `skipped` |
| failed | a `failure` or `error` element; its message is the evidence |
| missing | no `testcase` element |
| skipped | a `skipped` element; its message is the evidence, for example "FACTORYD_TEST_DATABASE_URL not set" |

A run that writes no report is "check test wrote no report", and counts as not met. A skipped test is not met: the proof did not run. The reader takes `testcase`, `failure`, `error` and `skipped` only, the core every emitter shares.

The mode for this repository, in `check`:

```bash
if [ "${1:-}" = test ]; then
  suite=$2
  run=(go run gotest.tools/gotestsum@v1.13.0 --junitfile "$CHECK_REPORT" -- -count=1)
  [ -n "${3:-}" ] && run+=(-run "^$3\$")
  exec scripts/pg-test.sh "${run[@]}" "$suite"
fi
```

The ts-go template gets the same mode with two branches: a suite under `web/` runs vitest, every other suite runs gotestsum. The template's AGENTS.md names the mode beside `bash check` and `bash check changed`.

### 3.4 The worker runs a list, not a script

factoryd hands the worker's repro mode a JSON list of proofs instead of a shell script:

```json
[{"id": "size_bound_escape", "suite": "./acceptance", "name": "TestDivideConquerSizeBounds"},
 {"id": "every_test", "suite": "./..."},
 {"id": "holdout-3", "suite": "./holdout3", "name": "TestNoDoubleWatering", "file": {"path": "holdout3/holdout_test.go", "content": "..."}}]
```

The worker writes the file of a hold-out entry, then runs `bash check test` per entry through `exec`, with no shell in between, `CHECK_REPORT` set to a file of its own, a timeout per entry, and returns per entry the exit code, an output tail and the report's bytes. factoryd decodes the XML with the standard library.

With that, `criteriaScript`, `holdoutScript`, the marker lines, the 8 KiB tail rule and the "no shell metacharacter" character classes are gone. A test name reaches the runner as an argument, never as part of a command string.

### 3.5 The gate writes the verdict rows

The gate writes one `criteria_verdicts` row per test and invariant criterion with source `gate`: met on passed, unmet on failed, missing or skipped, with the evidence from the report. For those two kinds the gate's row is the standing verdict. An approver's waiver outranks it, as today.

The review stops judging test and invariant criteria. Its per-criterion calls run for judgement criteria only, and the human kind keeps its evidence call. On a plan with ten test criteria that removes ten model calls from every review round. The whole-pull-request review still reads the diff and can report a weak test as a finding. That is a finding on the card, not a verdict on a criterion.

The plan's close is unchanged: every criterion met or waived.

### 3.6 One runner, three triggers

1. **At the approval of the integration card**, on the pull request head. Today's place. The rows and the findings come from the runner.
2. **When a plan card's session ends without a push.** The runner runs the card's cited test and invariant criteria at the card's base, main. Every one passed: the card closes done, and the reason lists the proofs and the head. Any other outcome: the lines go to the next session as findings, for example "no test TestPoolTopUp in ./acceptance", instead of "no changes to push". This replaces the acceptance close of `acceptance.go`.
3. **Hold-outs**, with their file written first, at the dry run on main and at the integration card's head.

The reproduction gate for bug cards is a free command the agent wrote, judged by its exit code. It stays as it is.

### 3.7 Card #1504 under this concept

Session 1 finds a clean tree and pushes nothing at 09:03. The runner runs the nine named tests on main in one pod and reports nine passed. The card closes done at about 09:10 with one session, no ask and about €0.40 spent. The four further sessions, the two session-cap asks, the check-in ask and the close by hand do not happen.

### 3.8 What goes and what comes

Deleted: `runsAcceptance`, `acceptanceHit`, `shellWords`, `addsOperator`, `acceptanceModes` and the acceptance scan in `activities.go`; `criterionTestField`, `criterionInvariantField`, `criteriaScript`, `parseCriteriaMarkers`, `holdoutScript`, `parseHoldoutMarkers`; the "TestXxx in <package>" sentences of the planner's prompt and the delta prompt; the review's per-criterion call for test and invariant kinds.

Added: the `suite` and `name` fields of `PlanCriterion` and their validation; the worker's proof list and report return; one JUnit reader; the gate's verdict rows with source `gate`; the no-push trigger; the `test` mode of `check` in this repository and in the ts-go template; the sentence in the templates' AGENTS.md.

Changed docs: the criteria table of [spec-driven.md](spec-driven.md), the criteria gate and the acceptance close in [architecture.md](architecture.md).

### 3.9 Caveats

- The `check` script belongs to the agents. A card that edits `check` can change what a proof means. That is the case today too. The policy gate could send every diff that touches `check` to a human. That is not part of this concept.
- A passing test proves the named test, not the spec. The hold-outs and the whole-pull-request review cover a test that checks the wrong thing.
- No plan is open today, so no filed plan needs the old sentence format read. The closed plans keep their stored JSON as it is.

## 4. Decisions

1. **The contract.** `bash check test <suite> [<name>]` with a JUnit XML report at `CHECK_REPORT`. The alternative is one adapter per framework inside factoryd, which makes the factory know every test tool and keeps the parsing, in Go instead of shell.
2. **Who settles a test criterion.** The gate alone, and the review's per-criterion calls for test and invariant kinds go. The alternative keeps those calls and turns their verdict into a finding that cannot close or open a criterion.
3. **The no-push trigger.** Run the card's criteria on main when a session pushes nothing, and close the card on a full pass. The alternative keeps today's behaviour: another session, then the session-cap ask.
4. **Build order.** The contract, the worker's list, the reader and the gate's rows first, which makes the gate right. The no-push trigger second. The template second too.
