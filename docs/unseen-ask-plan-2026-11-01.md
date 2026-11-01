# The unseen ask: the general case behind card #1427, 2026-11-01

The evening of 2026-11-01, card #1427 (task `t-20ba4a171267`, plan #1344
gate-bound-coverage, pull #1450) sat in waiting-human behind a green "5/5
checks" badge. Nothing could move it and nobody was told. Four faults
stacked. Three have fixes already written in two specs, one is new and this
file carries it. Nothing here is built until the word, the register's rule.

## What happened, minute by minute

All times UTC, 2026-11-01.

- 12:03:31. The task starts. The build it runs on is `1661fcc`, rolled
  10-31 18:14.
- 18:24 to 18:56. Attempt 1 does the work: commit `ea6cf25f`, two files,
  +229/−17 (`internal/factoryd/metrics.go`, `metrics_divide_test.go`).
  Pull #1450 opens. CI green, model review approve on `ea6cf25f` at 18:58.
  The checks verdict is recorded for `ea6cf25f`.
- 19:00:59 to 19:14:35. The check-in session hits a real test fixture
  clash, because main had moved under the branch. It pushes `59b29abc` as
  the repair, then stops on the check-in share: €0.58 spent of €0.50.
  `59b29abc` is a flat copy of an older main plus the work: 76 files,
  +3835/−423.
- 19:14:37. The ask (issue comment 27247): "The card has spent €0.58 of
  its €0.50 check-in share. May it go on?"
- 19:16:05. The chat, in full auto, answers "Go on" (comment 27250). A
  pull request is open, so the answer takes the resume-verify route, which
  grants nothing by design. The verify compares the pull head `59b29abc`
  with the verdict sha `ea6cf25f` and errors head-moved, retryable false.
  The error reaches no ask, no finding, no human.
- 19:19:33. The loop buys a plain session anyway. It dies in 14 seconds on
  the same share stop. `extra_checkin_share` stays 0 in the database.
- 19:19:50. The identical ask again (comment 27258). The chat wake loop
  never delivers it. The card waits from here.
- 20:36. Found by hand. `spent_eur` 2.66 of 5.00. The board showed the
  card's age, "7 h 30 min", not the wait, which was 17 minutes old. The
  checks badge described `ea6cf25f`, not the current head.

## Background: how a card runs

A card is an issue. The factory turns it into a task, and a Temporal
workflow drives the task through sessions and gates to a merge. A session
is one agent attempt in a sandbox; it spends from the card's budget, here
€5. Gates (checks, reproduction, model review, audit, policy) judge the
session's pushed head, then the merge lands.

The check-in share is a slice of the budget, here 10% or €0.50, reserved
for checking on the card. When a session's spend passes the share, the
check-in stops the session and the card asks the human: go on, leave it
waiting, end the card.

What an answer buys depends on the stop and the card's state
(`internal/factoryd/workflow.go`, the answer path):

- No pull request open, share stop: the answer grants one more share
  (`TaskUsage.ExtraCheckinShare` widens the share) plus an attempt, so the
  next session runs where this one stopped.
- Call cap stop: the answer buys a session.
- A pull request open and a spend stop: the answer resumes verification of
  the head. No session, no grant, because a bought session would stop at
  the same share before any model call
  (`internal/factoryd/workflow_stages.go:115`). This is the route #1427's
  answer took.

Each gate verdict names the sha it judged. When the pull's head differs
from the sha a verdict was recorded for, the gate errors head-moved. The
normal gate path adopts the moved head and waits for fresh checks. Until
`ee585427`, the resume path did not: it errored and the error went nowhere.

The chat is the project's agent, in full auto. When a card asks a human,
the wake loop (`internal/factoryd/wakes.go`) wakes the chat, which reads
the card and answers what its autonomy allows. The wake is deduplicated by
a key: "ask:" plus the task id plus the sha256 of the ask sentence. The
key marks the ask as handled, so a reprocessed event batch does not wake
twice.

Temporal runs each workflow on the code it started with. A fix deployed
mid-run never reaches a running workflow; new tasks pick up the new build.
So a fix can be on main, rolled to the cluster, and still absent from
every task that started before the roll. That is #1427's exact position:
the head-adoption fix landed 15:22 and rolled at 18:24, and the task that
started 12:03 cannot see it.

The agent works on a branch, here `factory/t-20ba4a171267` on the
`factory-agent` fork. A policy line bound, here 1000 lines, caps the
branch's own diff against its merge base with main. A branch that brings
main's newer state in as one flat commit, with no merge parent, makes git
count main's work as the branch's: the diff explodes, migrations clash,
the pull reads unmergeable.

## The four faults

### 1. The resume path died on a moved head. Fixed and live.

Status: fixed on main (`ee585427`, 2026-11-01 15:22), rolled to the
cluster with `06377a0` at 18:24. A resumed card now adopts a moved head
and waits for its checks; it never dies on it.

Residual: every task that started before the roll keeps the old path. No
deployment reaches a running workflow. Nothing to build. Old stuck runs
take the manual salvage route below. New cards are covered.

### 2. The branch swallowed main as a flat copy. Fault 18, landed.

Status: the fix landed on code main 2026-11-01 (576b8afb), built as fix 1
of [stuck-card-faults-spec-2026-11-01.md](stuck-card-faults-spec-2026-11-01.md).

Tonight's evidence is the sharpest yet for it. Merged as-is, `59b29abc`
would have deleted about 1572 lines of main's recent work (+302/−1572
against `b36ba3cb`, 29 files) while CI stood green, because CI tests the
branch tree, not the merge result. The card wore "5/5 checks" through all
of it. The same fault cut #1440 at 19:18 the same evening: its 1000-line
bound was spent by 1146 lines of main's movement counted as the branch's
own.

The fix as the spec writes it: before every push, the branch's diff
against its merge base must fit the card's line bound, the check shared by
worker and gate; the sync lands as a merge, so main's work stays main's;
a merge that truly exceeds the card closes the card into a successor that
starts from main's tip and carries the patch. Tonight changes nothing in
that design. It adds the evidence that the gate-side check is what must
catch it, because the branch-side CI cannot.

### 3. The answer that changed nothing started an attempt. Grant-loop fix 1, landed.

Status: the fix landed on code main 2026-11-01 (`576b8afb`), built as
fix 2 of [stuck-card-faults-spec-2026-11-01.md](stuck-card-faults-spec-2026-11-01.md):
an answer that finds the head and the card's limits unchanged gets the
deadlock question, which names the exits instead of repeating the stop.

Tonight: the answer's verify failed on the moved head, the loop bought a
session anyway, the session died in 14 seconds on the same share stop, and
the card asked the same question again. Between the two asks the head
stood still at `59b29abc` and no limit moved. The guard as specced covers
it exactly: when an answer arrives and neither the head nor the limits
changed since the last stop, the card does not repeat that stop. It asks a
different question or states plainly that no reply can change this and
names the exits.

### 4. A new ask read as an answered one. New, this file.

Status: fixed on code main (`59f8490b`, 2026-11-01; register fault 20 in
[needed-fixes.md](needed-fixes.md)). Found 2026-11-01 on
#1427.

The wake loop deduplicates asks by the sha256 of the ask sentence, per
task (`internal/factoryd/wakes.go`, key "ask:" + task id + hash). The
first ask (comment 27247, 19:14:37) woke the chat at 19:14:38 and marked
the key handled. The second ask (comment 27258, 19:19:50) is a new,
unanswered question, but its sentence is identical, so its key was already
marked and the wake never fired. The cursor passed it at 19:19:53 and the
chat never learned of it.

The dedup's purpose is delivery idempotence: one wake per ask when an
event batch is reprocessed. Reading it as "one answer per sentence" is the
fault. Any two asks with the same wording collide, answered or not, a day
apart or a minute apart. Fix 3 above reduces how often a card repeats an
identical ask; this fix makes sure that when any new ask exists, the chat
sees it. The layers stand alone.

## The wake fix in detail

Site: `internal/factoryd/wakes.go`, the key build in the
EventQuestionAsked branch. The store needs no change; WakeMarkAt takes the
key as it is.

The key becomes "ask:" plus the task id plus the ask's own identity: the
issue comment id from `e.Detail["comment"]`, which every ask that files an
issue comment carries. Tonight's two asks carry 27247 and 27258. When an
ask carries no comment id, the key falls back to the sentence hash, so
asks that predate the field or land without an issue comment still dedup
by wording.

What stays: one wake per ask; a reprocessed batch wakes once, because the
same ask keeps its comment id; the month-cap skip; the wake cooldown and
the rest of the loop.

What changes: a new ask that repeats a sentence wakes the chat, because
its comment id differs.

Tests: two question_asked events with the same sentence and different
comment ids wake twice. The same event processed twice wakes once. An ask
without a comment id still dedupes by sentence.

Cost: one branch, one file plus its test.

## What parallel work already fixed

Checked 2026-11-01 about 20:50 UTC:

- The head-adoption fix `ee585427` is on main and rolled (fault 1 above).
- The wake key fix landed on code main as `59f8490b` (fault 4 below; not
  yet rolled to the cluster). No merge-base line check exists in the push
  path. No repetition guard
  exists in the answer path. Both specs' status blocks stand.
- The board holds no card that builds any of this. Running: #1399 (pool
  control) and the two chat tasks. Queued: #1414, #1428, #1441 to #1444.
  #1440 closed cut at 19:18, a victim of fault 2, not a fix.
- Register faults 3 and 4 and the check-in policy approval plan touch
  nearby paths (sessions the budget cannot pay for, five-part stops) and
  are unchanged by tonight.

## Order

1. The wake key (new, smallest, ends the silent sit).
2. The repetition guard, grant-loop spec fix 1.
3. The flat-copy guard, stuck-card spec fix 1: the pre-push check, the
   merge-shaped sync, the successor card.
4. The rest of both specs as written: no merge request on red checks,
   grants carry instruction, decision forms on stops, and the face
   faults, the checks badge tied to the head it judged and the gate clock
   that shows attempts, not restarts.

## The card itself: the manual route

The run predates `ee585427` and cannot be saved. No answer makes it
proceed, and "Go on" repeats the failed verify and the 14-second stop.

The work is good: `ea6cf25f`, green, reviewed. The salvage lands it by
hand: rebuild the branch from `ea6cf25f` onto current main, resolve the
fixture clash properly, run the checks, push to the pull, then approve as
factory-gate and merge as factory-merge. The merged status retires the
pending ask, the route #1426 proved the same afternoon (16:04 to 17:49).

This manual route is by design the answer for every run that predates a
fix. It is also why the wake fix comes first in the order: until the
card-side guards exist, the silent sit is the worst outcome, and the wake
fix makes every future sit loud.
