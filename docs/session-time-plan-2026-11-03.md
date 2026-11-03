# Where a session's time goes: long commands, false stalls and the check share

Written 2026-11-03. Status: plan, awaiting Sebastian's OK. Nothing is
built. A builder's read of the first draft found the pull-request CI
already selecting packages, the sandbox's flags as the real lever, and
an acceptance hole, all folded in below. The plan holds for the factory
and every project it runs, not for the code repository alone: each
mechanism works on the harness contract and on one per-project
declaration, never on a Go detail.

## The problem in one view

Four faults, one cause: the factory does not know what a session is doing
while a command runs.

1. **A running command looks like a stall.** The opencode adapter turns a
   tool call into a harness event only when the call has ended
   (`internal/factoryd/opencode.go:480` and `:486` forward `completed`
   and `error`, and drop `pending` and `running`). The supervisor's
   no-progress detector trips after 5 minutes without an event
   (`SUPERVISE_NO_PROGRESS_AFTER`, default `5*time.Minute` in
   `cmd/factoryd/main.go:180`, checked at `supervise.go:336`). The
   sandbox's full check, `bash check`, runs `go test -race -p 1 ./...`
   beside a throwaway Postgres, one package at a time, and passes 5
   minutes in every session (measured below). So every full check trips
   the detector, and every trip starts a check-in conversation.
2. **The factory's own guide trips its own detector.** The coding guide
   (`guideEnd`, `opencode.go:865`) tells the agent to start a long job in
   the background and block on `agent-worker wait <pid>`, up to 590 s.
   `wait` defaults to 540 s and sends no event while it waits
   (`cmd/agent-worker/wait.go:16-20`). 540 s is above the 300 s stall
   threshold. `wait` also cannot report the job's exit status, and the
   acceptance scan never counts a backgrounded check as a hit
   (`acceptance.go:165-183`). Card #1476's session started `bash check`
   in the background four times in three minutes, each launch past its
   tool timeout. The sandbox passed its 4 GiB and the OOM kill took 580
   unpushed lines. Commit e266359d of 2026-11-03 locks the check to one
   run per checkout, which stops the OOM but not the trips.
3. **The sandbox runs a heavier check than CI, chosen by a sentence in a
   prompt.** The pull-request CI job already selects the packages a diff
   reaches (`.forgejo/workflows/pr.yml`, "select the packages the diff
   reaches": `go list -test` over `./...`, test imports included, the
   full suite when any non-Go file changed), runs them in parallel and
   without `-race`. Main's run (`ci.yml`) and the nightly run the whole
   suite with `-race`. The sandbox knows none of this: `guideEnd` says
   "run bash check", the wrap-up line says "run bash check if it is
   quick" (`limits.go:17`), and `bash check` is the heaviest form of all,
   `-race` and `-p 1`. The tests isolate per database name
   (`schematest.DSN` makes `factory_test_<name>`), so `-p 1` guards
   nothing but the sandbox's memory.
4. **Nobody measures where the time goes.** Per-command durations and
   command texts exist only in the S3 session objects
   (`sessions/<task>/<session>.jsonl`). Postgres holds no per-command
   row. The worker's telemetry sends one span per tool call to SigNoz,
   without the command text and without a project attribute, and no
   dashboard charts it. The metrics page runs SQL over Postgres only
   (`internal/factoryd/metrics.go:19-23`).

What it costs, measured on the code repository over the seven days to
2026-11-03:

- 82 sessions on 32 cards, 31.8 h of session wall time, 23 min on average,
  79 min at most. Inside those windows the agents' own model calls took
  10.8 h, a third of the wall time, and the check-in conversations 14.3 h
  beside them.
- Trips by kind: `no_progress` 33, `size` 19, `wall_clock` 10,
  `check_in` 9. The false stall is the most common trip.
- Check-in conversations: 2,114 gateway calls and 41.90 EUR, against the
  agents' own 10,075 calls and 187.84 EUR. Every fifth euro of agent
  spend went into check-ins, and every no-progress trip starts one.
- Card #1475: no-progress trips at 22:53, 23:09 and 23:44, three asks to
  a human when the check-in's own time cap ended it (23:24, 00:06,
  01:02), seven sessions for one card.

## What the S3 objects say

Measured on 2026-11-03 from `sessions/<task>/<session>.jsonl` of the
code repository's sessions of the last seven days. A check is a command
that runs `bash check`, `./check`, `make test`, `go test` or
`pg-test.sh`. `agent-worker wait` is its own class, because it waits for
a backgrounded check almost every time.

| share of session wall time | hours | % |
|---|---|---|
| wall time of the 62 sessions with an object | 29.7 | 100 |
| commands of any kind | 14.2 | 47.9 |
| checks | 9.1 | 30.6 |
| `agent-worker wait` on a backgrounded job | 3.0 | 10.0 |
| other commands | 2.1 | 7.2 |
| non-bash tools (read, grep, edit) | 0.0 | 0.1 |

So four of every ten session minutes are the check or the wait for it.
The agents' model calls are a third. The remaining fifth is the harness
and the pod.

- 298 check runs in 56 of the 62 sessions, five per session. 43 ran past
  5 minutes, the stall threshold.
- 26 check runs ended at the 10-minute tool cap, killed with no result.
  Two ran 13.9 and 12.1 minutes: opencode caps a bash call at 600 s, so
  the kill after the cap can take minutes.
- 20 of the 82 sessions have no object. The one-off command of phase 2
  names them when it runs.

The 298 runs say that a cheaper check, run less often, is the larger
saving, and the 26 killed runs say that the sandbox's full check does not
fit its 10-minute cap today. Phase 1 stops the false stalls, phase 3
cuts the runs' size, and phase 2 shows whether both held.

## The design principle this plan follows

A rule a tool or a deterministic step can carry does not live in a
prompt. So:

- The supervisor learns that a call is open from the harness, not from a
  prompt that asks the agent to stay busy.
- The metric reads the events every harness must send, not a log format
  of one harness.
- Which checks a card runs is one rule in the repository, shared by the
  pull-request CI job and the sandbox's check script, and the factory
  passes the script the one fact it has: the card's base. One prompt line
  names the mode.
- What counts as "a check" for the metric is one declaration per project
  in its policy file, with a default that needs no declaration at all.
- The threshold that asks for a faster suite is a comparison in code, not
  a weekly conversation.

## The plan in one view

Four phases, each shippable alone, in this order:

1. **An open call counts as activity, up to a bound.** Stops the false
   stalls and the check-ins they start. One new event kind on the harness
   contract, one open-call table in the supervisor, one bound.
2. **The session-time fact and its panel.** At session end the runner
   sums the session's commands and tools by class and writes one fact row.
   The metrics page shows the check share and the command share per
   project and per week. Classes come from one per-project declaration.
3. **`bash check changed`: the pull-request job's selection and flags in
   the sandbox.** The check script gains a mode that runs what the
   pull-request CI job would run, from one shared selection script. The
   guide names the mode and drops the background dance. Main's CI stays
   the full `-race` gate, and acceptance stops taking the changed run for
   the full one.
4. **The check-time card.** A daily pass compares each project's check
   share and its full check's median with the project's thresholds and
   files one human card while they are crossed. Revamping the tests
   becomes regular work the factory asks for by number.

Phase 3 can run beside phase 2. Phase 4 needs phase 2.

## Phase 1: an open call counts as activity, up to a bound

### What changes

- **The contract.** `internal/harness/types.go` gains
  `EventToolRunning EventKind = "tool_running"`, documented beside the
  other kinds at `types.go:111-133`: sent once when a tool call starts,
  with detail `call_id`, `tool` and `started` (the harness's start time,
  Unix milliseconds). The three finished kinds (`command`, `tool_call`,
  `file_change`) gain `call_id` in their detail, so the supervisor can
  close what it opened. An adapter that cannot see a call start sends no
  `tool_running`, and the supervisor behaves as today for it.
- **The adapter.** `opencode.go`'s serve mapper forwards a tool part's
  first `running` update as `tool_running`. opencode sends `running` with
  `state.time.start` and re-sends it as output streams
  (`testdata/opencode-serve.sse`, lines 135 and 137), so the mapper keeps
  the call ids it has announced and forwards each once. Both structs the
  adapter decodes (`opencode.go:463` and `:1135`) gain `id` and `callID`.
  `toolUse` writes `call_id` on every finished event.
- **The supervisor.** `Supervisor` keeps `open map[string]time.Time`,
  call id to start. `Event` adds on `tool_running` and deletes on a
  finished event with the same `call_id`. `tool_running` moves `lastSeen`
  and nothing else: it is no agent event for `no_write`, no finding, no
  call key for the same-call streak. `Tick`'s stall test becomes: silence
  since `lastSeen` at or past `NoProgressAfter` trips when no call is
  open, or when the oldest open call is older than `OpenCallBound`. An
  open call younger than the bound holds the trip. The bound only
  stretches the silence clock, so a session whose events keep flowing,
  such as a parent waiting on a subagent's `task` call, never trips on
  the call's age alone, and a call whose end the adapter lost (an event
  line over 1 MiB becomes a `note`, `opencode.go:591`) stops holding the
  clock once it is older than the bound.
- **The trip.** It stays `no_progress`, its detail naming the silence and
  the open call ("no harness events for 6m2s, a bash call open for
  15m10s"), so the stuck rule treats it as today: silence is no evidence,
  the check-in decides. `Resume` resets `lastSeen` as today, so a
  "continue" buys another `NoProgressAfter` of silence before the next
  trip, not an immediate repeat.
- **The bound.** `OpenCallBound` is a detector in the policy's
  `supervisor:` map, key `open_call`, default 900 s: opencode caps a bash
  call at 600 s, the measured calls past the cap ended at 13.9 min, and a
  call still open after 15 minutes is a hung tool or a lost end.
  `no_progress` joins the same map with its default of 300 s, and the env
  `SUPERVISE_NO_PROGRESS_AFTER` goes: one place for the detectors.
  `DefaultDetectors` (`policy.go:759`) gains both keys, the schema follows
  from it, and `Runner.supervisorConfig` (`runner.go:1465-1474`) copies
  them as it copies `no_write` today. `supervisionTick`
  (`runner.go:2018-2030`) derives its period from `NoProgressAfter`, so
  it takes the session's policy value, not the removed env.
- **The worker's telemetry** ignores the new kind, as `observe` already
  ignores every kind it does not name (`telemetry.go:116-123`).
- **The guide** keeps "Give a command that may run over two minutes a
  timeout of up to 600000 ms". The background instruction goes in phase
  3.

### Tests

- `supervise_test.go`: an open call holds the stall clock past
  `NoProgressAfter`. Silence with an open call older than `OpenCallBound`
  trips, the detail naming both. A finished event with the call's id
  closes it, and silence then counts from that event. Two open calls are
  judged by the older one. A session without any `tool_running` trips as
  today. `tool_running` moves no other detector: no_write, repetition and
  same-call ignore it. After `Resume`, a still-open old call needs a full
  `NoProgressAfter` of silence before it trips again.
- `opencode_test.go`, from the SSE fixture: the two `running` updates of
  one call give one `tool_running` with the call id and start, and the
  `completed` event carries the same `call_id`. A subagent's call is
  marked as today.
- `policy`: `open_call` and `no_progress` parse, validate and show in the
  schema, and an unknown detector name is still refused by name.
- `runner_test.go`: the supervision tick follows the policy's
  `no_progress`.
- `cmd/factoryd/config_test.go`: the fixture tree with both keys passes.

### What it does not do

It does not shorten any check and does not change what the agent runs.
A hung command still ends at the tool's own cap and then at the bound.

## Phase 2: the session-time fact and its panel

### The fact row

At session end, where `SessionEndFact` writes its row today
(`activities.go:1097-1100`, `Timeline.RecordFactRow`), the runner reads
the session's S3 object as `sessionAcceptance` does at `:1085`, sums it,
and writes one more fact row, kind `session_time`, identity per session
and attempt, detail:

- `wall_ms`: ended minus started, the same two times `session_end` holds.
- `commands_ms`: every `command` event's `duration_ms`, and every
  `tool_call` with tool `bash`, which is how a failed bash call arrives.
  Subagent events (`subagent: true`) are left out, because their time sits
  inside the parent's `task` call.
- `classes`: per class of the project's declaration (below), `ms`, the
  run count, and `runs`, the runs' durations in milliseconds, newest
  last, so a median over a window is a query. `other` takes the rest.
- `tools`: `duration_ms` summed per tool name for the non-bash tools.
- `longest`: the longest command's class, duration and its first 120
  characters.

Model-call time needs no new row: the gateway audit holds `duration_ms`
per call, and a join on task and session window gives it. The fact row
holds the sandbox's side, which no other table has.

The row reads only the contract keys of `types.go:111-133`: `command`,
`tool`, `duration_ms`, `subagent`. A second harness that keeps the
contract feeds the same row.

### The per-project declaration

`projects/<name>.yaml` gains one block:

```yaml
commands:
  classes:
    check: ["^bash check$", "^make test"]
    check_changed: ["^bash check changed"]
```

A map from class to regular expressions over the command text, matched
in the order written, the first match wins. The default, with no block at
all: `check_changed` matches `bash check changed` and `./check changed`,
and `check` matches any other run of the repository's check script at its
root. A project with another runner lists its own. The schema lists the
block, the console's policy page shows it, and `factoryd config check`
refuses a pattern that does not compile. The classes are the project's
own signal: a project that wants `build` or `migrate` measured adds the
class and the panel's breakdown shows it. Nothing else in the factory
reads the classes, so a project cannot break a gate with one.

### The panel

The metrics page gains "Session time" beside "Chat tool work":

- **Check share**: a ratio figure, the `ms` of `check` and
  `check_changed` over `wall_ms`, by week, the `metricRatioFigure` shape
  of "change failure" (`metrics.go:956-963`).
- **Command share**: `commands_ms` over `wall_ms` the same way.
- Under the two figures, the breakdown: per class and per tool, hours and
  share, the median and the longest run of the full check, and the longest
  command of the window.

The page is per project already, so the figures are per project.

### A one-off measurement

A `factoryd metrics session-time <days>` command reads the S3 objects of
the window and prints the same sums for the sessions before the fact row
existed, and names the sessions without an object. It is the measurement
above, made repeatable. No backfill of rows: the panel starts at the
roll.

### Tests

- `session_test.go`: the sums from a transcript with a command, a failed
  bash call, a subagent command, two non-bash tools, a full check and a
  changed check, each in its default class.
- `metrics_test.go`: `TestMetricsFigures` seeds `session_time` rows and
  pins both figures and the median, the empty-project case lists them.
- `console/metrics_test.go`: `metricsBodyKeys`, the title count and the
  formatter table gain the two keys.
- `policy`: the `commands` block parses, a pattern that does not compile
  is refused with its project and class named, the default classes hold
  without a block, and the first match wins.

## Phase 3: `bash check changed`, the pull-request job's run in the sandbox

### One selection, two callers

The rule that picks the packages a diff reaches moves out of `pr.yml`
into `scripts/affected-packages.sh <base>`, unchanged: the changed files
against the base, the full suite when a non-Go file changed or a changed
directory holds no Go file, else the packages that import a changed one,
test imports included, from one `go list -test -deps` pass. `pr.yml`
calls the script, and `bash check changed` calls it. One rule, two
callers.

A pull request can edit the script, as it can edit any test. Main's run
(`ci.yml`) and the nightly run the whole suite with `-race` whatever the
script says, and a red main pauses the queue and files the fix card. That
is the guard, and it stands today.

### The mode

- `bash check changed` runs the static checks, then
  `scripts/pg-test.sh go test <packages>` on the script's selection:
  no `-race`, packages in parallel, the pull-request job's own flags.
  The sandbox has 4 GiB, so the mode runs with `-p 2` until phase 2's
  panel says the memory allows more.
- `bash check` stays the full run with `-race`, for the session that
  changed `go.mod` or wants the whole proof, and for the acceptance items
  that name it.
- The `ts-go` template's `check` gains the same mode with its own
  selection: `npm test` when `web/` changed, the Go packages as above.
  The template's `pr.yml` keeps running the full `bash check`.

### The base

The worker exports `FACTORY_BASE`, the card's merge base with main, the
same commit the checkpoint's `card_diff` compares with. A session's start
commit is the task branch's head after the first session and after a
merge of main (`activities.go:1124-1135`), so it is not the base.

### Acceptance

`runsAcceptance` (`acceptance.go:165-183`) accepts "bash check" with
arguments added, so a green `bash check changed` would satisfy an
acceptance item that names the full check, and a session that pushed
nothing would close its card as done on it (`workflow.go:2181-2187`).
The scan stops taking `changed` as an argument of the full check: an item
"bash check" needs a run without the mode, an item "bash check changed"
takes the mode. One table in `acceptance.go` names the modes that are
not arguments.

### The guide

One sentence replaces the check paragraph of `guideEnd`: "Before you end,
run `bash check changed`, the checks of what you changed, in the
foreground with a timeout of 600000 ms. CI runs the full `bash check`
with the race detector on your pull request's main." The wrap-up line
(`limits.go:17`) names the same mode. The background-and-wait paragraph
goes, with its 590-second wait. Phase 1 makes a long foreground call
safe. `agent-worker wait` stays for the rare job that needs it,
undocumented in the guide.

### What stays a prompt

The one line above. The rule "which packages" is in the shared script,
the rule "what is busy" in the supervisor, the rule "what is a check" in
the project file. The sentence only names the command.

### What it does not promise

A card that touches `internal/factoryd` selects most of the suite: 610
of the 872 non-merge commits since 2026-10-20 touch it, and its selection
holds about 90 % of the test lines. For those cards the saving is the
flags, not the selection. Whether the changed run then fits the
10-minute cap is phase 2's measurement, and phase 4's card asks for the
suite's own cuts when it does not.

### Tests

- `scripts/affected-packages_test.sh` or a Go test under `scripts/`: a
  change to one package selects it and its importers, test-only
  importers included, an unrelated package not, a change to a non-Go
  file selects everything, and `pr.yml`'s step is the one call.
- `check` itself: `bash check changed` on a throwaway change runs the
  selection without `-race`, `bash check` runs everything with it.
- The worker: `FACTORY_BASE` is in the session's environment and equals
  the card's merge base (`main_test.go` beside the push tests).
- `acceptance_test.go`: "bash check changed" is no hit for "bash check",
  and a hit for itself.
- `opencode_test.go`: the guide's golden text.

## Phase 4: the check-time card

A daily pass in factoryd, beside the passes that file the factory's own
cards, reads each project's `session_time` rows of the last four weeks
and compares two figures with the project's thresholds:

```yaml
commands:
  budget: {check_share: 0.2, check_median_s: 300}
```

Defaults when absent: a check share of 20 % and a median full check of
5 minutes. While a figure is above its threshold, the pass files one
human card, "Cut the check time of <project>", with the four weeks'
figures, the median and the three longest check runs, and the `go test
-json` timings the card's session measures first. One card per project at
a time: an open card of the same title holds the pass, and the card's
close ends it. A project with a slow but necessary suite raises its own
line.

The comparison is deterministic, so it runs in code, as the design
principle asks. No routine kind and no agent conversation decides it.

### Tests

- `checktime_test.go`: rows above the share file one card, rows above the
  median file one card, an open card holds a second, rows under both file
  none, the thresholds come from the project file and default without it.
- `policy`: the `budget` block parses and refuses a share outside (0, 1].

## Order and the roll

Phase 1 goes first and alone: it is the bleeding. Its roll changes the
supervisor, the adapter and the policy schema, so the infra repository's
`supervisor:` block and the schema copies follow in the same hour. Phase
3's script and template changes land without a roll, and its worker,
acceptance and guide changes ride one. Phase 2 and 4 follow at their own
pace.

## Decisions that are Sebastian's

1. **Where the command classes and the thresholds live.** This plan puts
   them in the policy tree's project file, because the policy is
   schema-checked, shown in the console and read live. The alternative is
   a file in the project repository, read by a pass like the Imager's.
   The project file is my call unless he wants the declaration to travel
   with the code.
2. **One selection script shared with `pr.yml`, or a copy.** Shared is my
   call: one rule, and main's full `-race` run guards it. A copy keeps the
   pull-request job's rule out of a pull request's reach, at the price of
   two rules that drift.
3. **Phase 3's shape.** This plan keeps one prompt line and a script mode.
   The stronger form has the worker run `bash check changed` itself after
   the agent ends and send a failure back into the session. That needs
   the harness to accept a message after the agent's last turn, which the
   `Harness` interface does not promise today. Later, if agents skip the
   line.
4. **The bound.** 900 s for `open_call`. A higher bound costs minutes on a
   hung tool, a lower one trips a check the tool cap is still killing.
5. **The thresholds of phase 4.** 20 % check share and a 5-minute median.
