# Needed fixes: faults found in the live factory

A standing register. Each entry names the fault, the evidence from the live
run, the fix direction and its status. Nothing here is implemented until
Sebastian says go. Updated as faults are found and as fixes land. A fault
whose fix lands on a code or infra main leaves the list, the remaining
faults are renumbered to stay contiguous, and the plan or spec that built
it keeps the record. Renumbered on 2026-11-02 to close the gaps the
departures left: 12 became 7, 14 became 8, 15 became 9, 16 became 10,
17 became 11. Renumbered again the same day when fault 4 left: 5 to 15
became 4 to 14, when fault 2 left: 3 to 14 became 2 to 13, and twice when
fault 3 left: 4 to 13 became 3 to 12, then 4 to 12 became 3 to 11, and
when faults 6, 9, 10 and 11 left: 7 and 8 became 6 and 7, and on
2026-11-03 when faults 2 and 4 left: 3 became 2, 5 to 10 became 3 to 8,
and later that day when fault 7 left: 8 to 10 became 7 to 9. Older
documents cite the numbering of their day, and the old
numbers 7 to 11, 13 and 18 to 20 in them name faults that have left. Gone
on 2026-11-01: the criteria-card family (the criteria card's brief, its
chat answer and
its draft state, attach_analysis, the file read's ranges, all on code main),
the compaction fold with thinking off (code 34b778bd, infra c53d5bb, the
served-window follow 91ec3b8a), the board's month meter (13d47231) and
the resumed card that died on a moved head (code ee585427, the
fix salvaged from #1408's branch by hand: the branch's flat copy of main
made its pull unmergeable, so 7b59efeb was rebased onto main directly).
The note press outlet that broke the screen grid: the outlet sat
as a fourth child of the screen's three-column grid, took the board's
column and pushed the board under the chat; it now shares the board's cell
(code b36ba3cb). The chain-run links that spoke the run's global id where
the forge's pages address the per-repo run number, so every /actions/runs
link read "resource does not exist" (card #1439, run 3356 against the
page of 2260): the run's number is now recorded beside the id with a
guard a numberless rerun cannot erase, old rows are backfilled, and the
board, the drawer and the facts link number with number (code a0e2803e,
docs/plan-run-link-index-2026-11-01.md). The card branch that
swallowed main as a flat copy left with its fix (code 576b8afb: the sync
lands as a merge, a diff over the card's line bound is refused by name,
the gate enforces the same bound), and the spec's other two fixes landed
the same day: a reply that cannot change anything stops asking (c1716385),
and a stop that names a decision offers that decision while a grant
carries its instruction (5dc22e59). The ask that repeated a
sentence and woke nobody left with its fix (code 59f8490b: the wake key
takes the ask's issue comment id, the sentence hash only as the
fallback). Gone on 2026-11-02: the generic stops that carried no numbers
and no recommendation (code 21ee41a2,
docs/five-part-stops-plan-2026-11-02.md). The check-in spend stops show
the card's spend against its budget and its check-in share, say what Go on
buys, and recommend going on when the last review approved the head. The
session cap names its cap and the grants and keeps the stop's work state,
the month cap names the month's spend and cap, the budget stop recommends
the raise when the card holds a pull request, and the plain check-in stop
shows the card's spend against its session cap. The flavoured confirmation
that never filed left the same day with the file tool that said filed (code
ed3d5f40 and 2531bae7, docs/confirmation-decision-plan-2026-11-02.md): the confirmation is
a decision field, confirm or revise, set by the card's Confirm and Request
changes and by the chat's answer tool and held by database checks. Only a
confirm fixes the spec and the criteria. The file tool says a stored plan is
the session's answer and whether the human's confirmation still waits on its
cards. The review refused for money that vanished, and the plan that could
not close, left the same day (code a62ef21d to 0310f028,
docs/refused-review-plan-2026-11-02.md). The merge ask names a review that
did not run, with what lifts its refusal. The merge of a plan's integration
card holds while a criterion has no verdict row, and the press runs the
review again first. The plan close files a criteria-never-judged ask apart
from the gap ask for criteria unmet. That ask offers waive, confirm and deny
but no review: the gateway takes no hold of a finished card, so who pays for
that review is a later plan's. The raised month cap that did not end a card's
month-cap wait left the same day (code 0bbfe484,
docs/plans/2026-11-02-cap-waits-resume.md). A stop at the month cap or a
project's month cap now waits as a day-cap stop does. It resumes once the cap
no longer binds or the UTC month turns, or sooner on an answer. A policy load
wakes every cap wait, and a refusal that the version in force already lifted
asks nothing. The month alarm files a cap card at each cap it reaches and
closes the card a raise lifted, and the stop's question says that the card
resumes on its own and when. The missing scripted door into the chat left
the same day with the chat door build, live with the roll of 321baaa at
19:38 UTC (docs/chat-door-design-2026-11-02.md,
docs/plans/2026-11-02-chat-door.md). A human makes a chat token for one
project on their own page in the console, for 7, 30 or 90 days, and revokes
it there. The token acts as that human in the project's chat, approvals
included, through the console's /mcp endpoint and its five tools:
chat_send, chat_read, chat_confirm, chat_threads and chat_fund. The human's own
Forgejo token stands behind it, sealed, so a merge approval stays a review
under the approver's own Forgejo name, and every event and chat row the
token causes names it. Since 8ff57da9, chat_send waits 50 seconds, inside
Claude Code's 60-second tool timeout, and chat_read gets the rest. Three
faults that waited on a roll left when roll
c78869b went live on 2026-11-02 at 02:19Z. A queue sweep no longer starts
a half-filed card, and a failed card with a live card waiting on it goes
back to its plan's planner once (code c78869b2,
docs/half-filed-card-impasse-2026-11-02.md). A wake turn no longer keeps a
human's messages unread (code 120a12d9). A listening turn takes a message
from any place in the line, and a message or wake note that another turn
read starts no turn. A failed turn puts the rows it read back for one quiet
retry, and each wake turn runs on its own goroutine, one per project at a
time. Six faults found on card #1472 left the same day on code main
(2623b2ec and 2b9841c6) and ride the next factoryd roll. The chat agent's
analysis reaches an ask whose row carries its why: since that row gained
the why on 21 October the tool had refused 33 analyses. A deploy keeps a
session whose pod finished while factoryd was away: the next factoryd
reads its result instead of starting the session over, as it did for
#1472 and #1452 at 10:54. A check-in conversation ends after
limits.checkin_time (5 minutes by default) as at its call cap, the card
asking a human. The agent-time stop says the agent time is used up, no
longer the session cap, and names the minutes a grant buys. The console's
Extend takes any live card, and its raise stands: it lives in columns the
workflow's usage record never writes, which the workflow reads before each
cap check. A card's agent time follows its size, half for a small card and
one and a half for a large one. Four faults found on cards #1473 and #1474
left the same day on code main. The fixes up to code 321baaa7 are live
since its roll at 19:37 UTC, and the later ones ride the next roll. The
check-in share
stop told the human that Go on grants one more share and starts the
session again. With the card's pull request open, the answer re-verifies
the head and buys nothing, and the question now says so (code fdf4d793).
That fix held only in its test: the question's facts carried the pull
request at a budget stop alone, and #1414 asked the old text with pull
request 1485 open. The facts now carry it at every stop (code 8b4b5525).
A main CI run that Forgejo left blocked held main's CI lane unseen.
Forgejo's zombie sweep failed a job whose runner had died and never freed
the jobs that need it, and the roller read only the newest run, which
waited. Main's run 2317 held the lane for 2 h 22 min, and the merged #1453
and #1473 waited behind it until a person re-ran it. A main run blocked
with a red job for five minutes now pauses the queue, its failed jobs
re-run once, and a second stall files the human re-run card (code
321baaa7). A merged card waited for green main runs it never saw. A main
run no pull request rides is in no carry row, and the head row holds only
the newest run, which waited behind it. Main's runs 2323 to 2327, five
direct pushes, went green from 18:23 to 19:37 UTC. #1473 stayed merged and
#1474 queued behind it until the roll's run 2332 went green at 19:44, 1 h
21 min after the first of them. The chain now keeps a green row with the
newest run whose verdict is green (code e4431843). A plan stamped every
card with main's head at filing, and a card that waited on its
dependencies started at that stamp hours later. #1474 started at
70725856, 71 commits behind main and without #1473. Its agent moved the
checkout to main, the size check counted main's 12,219 changed lines as
the card's diff, and the check-in that followed ran out its 5 minutes
with no decision. A plan now files its cards with no stamp, so a card's
first session starts at main's head as it is then (code 687c032f). The
cards #1474, #1475 and #1476 lost their stale stamps in the database, and
#1474 went on at e4431843. A check-in share stop with its pull request
open never granted the share its own question promised. Its answer
verified the head again instead, dropped the session's own push for the
stale head, and spent one of the card's three head holds each time, so
card #1441 asked again after every answer and could only close into a
successor. The answer now grants the share, the card goes on from the
head its session pushed, and the repeat guard compares the share and the
raised sessions (code 6bd8bf0f, change ids checkin-answer, verified-head,
conflict-fact and stopped-parent). A merge conflict now reaches the next
session as a fact, and a stopped session that pushed becomes the next
one's parent. A check-in gets 90 seconds for each call it may make, at
most 30 minutes, and a start check-in ends by its session's deadline.
Until that roll, the policy holds checkin_time at 10 minutes (infra
12c7c9c). Gone on 2026-11-03, on code main at 3b904433 and riding the
next factoryd roll (docs/plans/2026-11-02-card-flow-companion.md): the
sessions that opened on a budget that could not pay for them, and the
chat's answer tool that failed twice. Every session opening now runs the
budget floor, so a card short of an opening's cost gets a money ask and no
dead session, the console's floor covers a card with no alias yet, and
every money figure a human or an agent decides on nets the gateway's
holds, so the ask, the face and the floor agree and the first raise funds
the session. The ask that fires as the money ask before an attempt stays
with the card flow redesign's phase 2. The answer tool's two failures were
the refusal "The answers could not be recorded; see the factoryd log",
which hid its error; it and four siblings name the error and the next
step. The check-in that ran out of its time with no decision left the same
day (code 684702eb and 711da383, live with the roll at 05:38 UTC): its
answer call keeps twice the longest call so far, at least 90 seconds and
at most half the cap, no evidence call starts that cannot end before the
answer is due, the check-in reads when its answer is due, and read_file,
grep and transcript_search no longer waste calls on a miss. Its first run
on the roll, on #1476, decided in six and a half minutes.

## 1. The check-in's policy stop preempts the approval card

Status: plan written, awaiting Sebastian's OK
(checkin-policy-approval-plan-2026-10-31.md). Found 2026-10-31 on card
#1347. Verified unbuilt on main 2026-11-01, and again on code main
0bbfe484 on 2026-11-02: no change id checkin-policy-verification anywhere.

A supervising agent stops a card with a bare "how should it go on?"
question one step before the card's own flow would show the proper approval
card with the brief, the numbers and the Approve button. The card sat 19
hours with nothing to decide from. The fix: close the agent's reason words
to a fixed set, and when the reason is a policy class and a pull request is
open, go to the checks that end in the approval card instead of stopping.

## 2. The planner dies on a big spec's read set

Status: code landed (448048b0, 2026-11-02) and is live since roll c78869b
(2026-11-02 02:19Z). The tree hand waits on Sebastian. The card flow
redesign's card digest (its section 5.3) shares the word: in code the names
are CardDigest, card_step and board_digest, never `digest` alone, and
the redesign's section 5.3 carries that sentence. The
`digest` tool, the planGuide read discipline and the reads finding are on
code main. No session sees the tool until the policy tree's coder,
analyzer and planner stanzas list `digest: {}`, a commit on the infra
side (digest-tree-hand-runbook-2026-11-02.md). Infra main 2b59f75 does not
carry it yet. The fault leaves the list when
the tree lands and a session sees the tool. The compaction-model probe
found no model key in opencode 1.18.32's compaction block, so
compaction stays on the session's own model. Plan:
planner-read-cut-plan-2026-11-02.md. The cap relief landed 2026-11-01
on infra main (18e7418: limits.context_tokens goes, premium's window
pinned at its real 128000), and the judgment the fault now rests on: the
window is a ceiling, not a cure — the deaths were flow deaths, reads
feeding compactions feeding the wall clock, and the chat's digest of
798ea748 never reaches a session. Found 2026-10-31 on card #1383: three
planner sessions in a row ended without filing a plan, each after
reading 20+ files against the 98K context max, twice on "opencode
serve: context canceled". Six sessions ran under a grant of three, then
the session cap closed the card, €3.54 of €5.00 sunk.

Fix direction: the session-side cut — a `digest(path, ask)` tool on the
factory-tools menu (one Small call through the chat's Digest wrapper,
the answer bounded, the file's bytes never enter the premium context;
its listing in the policy tree's three class stanzas is a human hand on
the infra side, code rolled first), the planGuide read discipline that
maps before reading and digests the big files, and the readsFinding
pointing the retry at digests instead of re-reads. Until it lands, a
big card needs a trimmed read set, the cheap rung, or the spec-on-card
shape that saved #1383.

## 3. An ended card's issue stays open, and both red-main remedies can land

Status: the fix landed on code main 2026-11-02 (fcec3a73 to 1d89308a,
docs/red-main-revert-plan-2026-11-02.md) and rides the next factoryd roll,
which waits on Deploy now while plans #1344 and #1399 are open on main. At
that roll a migration hands the 27 issues that stand open to the heal pass.
The entry leaves once they read closed. Found 2026-10-31 on card #1333
("Revert 6b368fd: main red since 2026-10-30T03:30:07Z, no fix landed"),
filed as "a red-main revert card does not jump the queue". The check on
2026-11-02 shows that the queue did its job: the revert merged on its own
at 2026-10-30 05:34 UTC, 4 minutes after its filing, and all 47 push runs
of main after it to 2026-11-01 03:00 ended green. The card looked stuck
because its issue never closed.

Two faults stand. The issue of an ended card stays open on three paths:
a card that factoryd filed around its own pull request and that ends done
(#1157, #1333), a card that ends closed while its issue has open
dependencies, which Forgejo refuses to close with 412 (10 plan-dropped
cards), and a closed plan (all 15 in the code repository). Both remedies
of a red main can land: on 2026-10-20 the fix-forward card #1154 and the
revert #1157 merged 2 seconds apart, and the revert put three stray log
files back on main.

The fix: a red main gets one automatic remedy at a time. The revert's
filing ends the fix-forward card, and the merge gate holds a revert while
the fix merges or once no pause names it. A red that outlives the remedy's
merge goes to a human, and main's green ends every remedy that did not
merge. Every done card but a plan, and every closed plan, closes its
issue, its dependencies on open issues dropped first.

## 4. A rename that changes the policy tree cannot land before its roll

Status: candidate only. The loader still rejects an unknown tool name
outright (policy.go:279 on code main 0bbfe484). Found 2026-10-31: the ask
tool's rename merged into the code main (5a07d16c) and the infra tree (82ab246) while the
running factoryd knew only escalate_to_human, so the tree's tip sat
unloadable and the roller held the rename's roll on the open plans
#1344/#1345, whose cards needed the spend the month cap had stopped. A
three-way deadlock. Only the manual name revert (infra bed2930) broke it.

Fix direction: the config loader accepts the union of the old and the new
name across a rename, or the roll that carries a rename commits the tree's
rename with it, so the tree never names a tool no factoryd knows.

## 5. The size gate moves a card's budget with no event

Status: candidate only. Found 2026-11-02 while digging the unpayable sessions (gone 2026-11-03) on card
#1345: the task's budget read 5.60 EUR after its only fund event (+0.60 at
00:06) and 7.60 by the evening's end, the +2.00 written by the size gate's
budget writer (SetTaskSizeBudget, store.go:1430 on code main 0bbfe484)
with no card_funded or other event, so the evening's true headroom had to be reconstructed from
the ledger. A budget that moves silently leaves no line a person or a dig
can read.

Fix direction: the size gate's budget move records an event, as the fund
and raise paths do.

## 6. The runner's docker volume passes its 50Gi limit

Status: measured; the bound is the infra hand in
docs/runner-volume-measurement-2026-11.md: the prune sidecar runs `docker
volume prune -af` last, only when the volume is still over maxGiB after
its other prunes, because main's test job keeps its Go caches in the named
volumes ci-go-build and ci-go-mod that nothing trimmed. The infra commit
is Sebastian's. Found 2026-11-02 on card #1473. At 14:43:34 the kubelet
evicted the trusted runner's pod, up since 2026-10-28: "Usage of EmptyDir
volume "docker-data" exceeds the limit "50Gi"". Main's run 2316 (2b9841c6)
had run its test and its three image jobs from 14:20 to 14:38, and run
2317's test job (b76459d9) started at 14:39 and died with the pod. The
docker-prune sidecar prunes from 30 GiB (dind.prune.maxGiB), and the chart
counts at most 13.3 GiB per run, so the volume should stay under 44 GiB.
The new pod held 11.8 GiB at 17:20 during a test job. What filled the old
volume past 50 GiB was not measured then. Each eviction kills the job it
runs, and before code 321baaa7 rolls, such a job's run stalls main's CI
lane until a person re-runs it.

Fix direction: the bound, by the infra hand in
docs/runner-volume-measurement-2026-11.md. The prune sidecar runs `docker
volume prune -af` last, only when the volume is still over maxGiB after
its other prunes. The fault leaves the list when a runner pod lives past
five days with no eviction and a low point under 30 GiB.

## 7. SigNoz's ClickHouse sits at its memory limit

Status: candidate only. Found 2026-11-02 while measuring fault 6. SigNoz's
ClickHouse (chi-signoz-clickhouse-cluster-0-0-0 in namespace platform) has
a 3Gi memory limit and held 2.68 to 2.82 GiB of it from 21:30 UTC
(`kubectl -n platform exec chi-signoz-clickhouse-cluster-0-0-0 -c
clickhouse -- clickhouse-client -q "SELECT metric, value FROM
system.asynchronous_metrics WHERE metric IN ('CGroupMemoryTotal',
'CGroupMemoryUsed')"`). The server stops queries at 2.70 GiB, so most of
them fail: "(total) memory limit exceeded: would use 1.79 GiB (attempt to
allocate chunk of 8.25 MiB), current RSS: 2.88 GiB, maximum: 2.70 GiB.
OvercommitTracker decision: Query was selected to stop by
OvercommitTracker ... (MEMORY_LIMIT_EXCEEDED)". Even a count over
system.processes failed so. A query over five days of one series went
through on its 86th try. At 21:40:02 the kubelet killed the server for
missing its liveness probe (/ping, a 1 second timeout, ten misses in a
row), while those retried queries ran (`kubectl -n platform get events
--field-selector
involvedObject.name=chi-signoz-clickhouse-cluster-0-0-0`). That was its
fifth restart in eight days, and sf-0's kernel log
(`TALOSCONFIG=~/repos/ai-software-factory-infra/talos/talosconfig talosctl
-e <API endpoint> -n 10.0.1.10 dmesg`) holds a memory cgroup kill of
clickhouse-serv on 2026-10-30 at
2.97 GB resident. SigNoz's own pages and alerts query the same server:
whether they fail too is not checked.

Fix direction: measure first what holds the memory (the caches, the
merges, the buffer tables), then raise the limit or bound the query memory
settings, so that a query fails before the server misses its probe.

## 8. The gate check-in can read the agent's push token

Status: candidate only. Found 2026-11-03 in the check-in records of
#1474 (session s-ccd83748614e) and #1475 (session s-c787e5a4277c). The
gate check-in's run tool read $TOKEN_FILE and called Forgejo with it.
The check-in is a judge, and only its prompt says it never edits.

Fix direction: run the check-in's commands without the token in their
environment or on their file system, so no tool of a judge can write.

## 9. The agent context map's loop pages are not byte-stable across runs

Status: candidate only. Found 2026-11-03 while regenerating `docs/agents`
after the card digest landed (code main 17376fb1). The map's own page,
agent-context-map.md, says the same code SHA, policy tree and pinned
harness produce the same pages byte for byte. They do not: every loop-mode
page records the random working directory opencode was given
(`/tmp/agentdoc-loop-<n>`, internal/factoryd/agentdocloop.go:477 on code
main) and the day's date, which opencode writes into its own prompt from
its clock. Two regenerations of one commit differ in those bytes, so a
diff of the pages cannot tell a code change from a rerun.

Fix direction: a fixed working directory under the output path, and a
fixed clock handed to the recorded run (an environment variable or a flag
the harness honours; if opencode reads only the system clock, the capture
masks the date line as it masks the directory). The claim in
agent-context-map.md stands only once both are fixed.
