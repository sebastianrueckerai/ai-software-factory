# The red-main revert card: why it looked stuck, and the fix

Written 2026-11-02. Status: planned, awaiting Sebastian's OK. It is fault 6
of docs/needed-fixes.md on 2026-11-02, "An ended card's issue stays open,
and both red-main remedies can land". The handover of 2026-11-01 calls it
fault 9, its number before the renumbering. Code references are to code
main 70725856.

## Verdict

The red-main queue did its job. On 2026-10-30 card #1333's revert merged on
its own 4 minutes after factoryd filed it, and main stayed green after it.
The card looked stuck because its Forgejo issue never closed. The
handover's question (block merges onto a red main, or mark them) needs no
ruling: since 2026-10-14 (roadmap 222, item 4) a red main pauses the merge
queue, so no card merges onto a red main.

The check found two real faults:

1. The issue of an ended card stays open on three paths. 27 issues stand
   open today with a final state label.
2. Both remedies of a red main can land. On 2026-10-20 the fix-forward card
   and the revert merged 2 seconds apart, and the revert put three stray log
   files back on main. A pending revert also stays live when another commit
   turns main green.

## What happened on 2026-10-30

factoryd's events, Forgejo and SigNoz give this timeline (UTC):

| Time | Event |
|---|---|
| 03:22:37 | The roll 6b368fd (pull #1330) merges. It changes two image tags in k8s/. |
| 03:30:04 | Main's push run 3176 (number 2103) fails in `image-runner` after 10 s: "error writing layer blob ... build-cache.forgejo.svc.cluster.local:5000". The build cache was unreachable. |
| 03:30:07 | factoryd pauses the queue and files the fix-forward card #1331. |
| 05:30:15 | The 2-hour bound passes. factoryd files the revert card #1333 and pull #1332. |
| 05:34:24 | factory-merge merges pull #1332. The pause exempts the revert, and the merge gate ignores class and review for a mechanical source. |
| 05:34:25 | Run 3178 (number 2105) starts at 5cc479da. It ends green, and the pause ends. |
| 05:42:25 | endPauseCard comments that run 2105 is green and closes the fix-forward card #1331. |
| 05:42:31 | The revert card ends done: "live: covered by run 3178". |
| 2026-11-02 | Issue #1333 stands open with the label state/done. |

All 47 push runs of main from 05:34 on 2026-10-30 to 03:00 on 2026-11-01
ended green. The ten-plus merges in the dogfood log rode a green main.

The dogfood log's line "- pull 1332 closed merged" at 2026-11-01 02:42 is a
minus line of the watcher's diff: the pull left the watcher's window then.
Nobody merged it by hand.

The red itself was a flake. Today the same flake files nothing: since
3e548b85 (2026-10-30 06:47 UTC) factoryd re-runs the failed jobs of a red
run once before it files a card, and mainfix.go names run 3176 as the
reason.

## Fault 1: the issue of an ended card stays open

Three paths leave the issue open. The table shows which path holds which of
the 27 open issues. The other projects' repositories are gone, so all 27
are in the code repository.

| Path | Open issues | Cause |
|---|---|---|
| A card that factoryd filed around its own pull request ends done | #1157, #1333 | FileFactoryPRTask (intake.go:1222) opens the pull request before the issue, so the pull request's body carries no "Closes #N". Finish closes the issue only on a closed end (activities.go:2532). |
| A card ends closed while its issue has open dependencies | #1355, #1356, #1403, #1404, #1405, #1406, #1417, #1442, #1443, #1444 | Forgejo answers 412 "cannot close this issue because it still has open dependencies". Finish logs the refusal and goes on. The heal pass settles it (SigNoz, 2026-11-01 09:06 and 20:18). |
| A plan closes | #495, #504 to #513, #558, #852, #1293, #1345 | closePlan (verdict.go:988) comments "the plan is closed" and records plan_closed. It never closes the issue. All 15 closed plans of the code repository stand open. |

The first path covers every agent-lane card of FileFactoryPRTask: the
revert, the plan's group revert, the GitHub sync, the schema copy and the
template update. On a project without agents, endPRCard closes the issue
itself.

The dependency path also waits for two queued cards. #1414 and #1441 depend
on the open plan issue #1399, because moveDependents (replan.go:511) hands a
dropped card's dependents to the plan's issue. Forgejo's merge leaves an
issue with open dependencies open, so their "Closes #N" will not close
them. This part comes from Forgejo's merge code. Nobody saw it happen yet.

Failed cards keep their issue open by design: a person's close ends them
closed.

## Fault 2: both remedies of a red main can land

On 2026-10-20 Sebastian approved the fix-forward card #1154 and the revert
card #1157 at 07:07. The fix merged at 07:07:04 (0544182f). The revert of
af57dc1 merged at 07:07:06 (57534668) and put `.check-t1.log`,
`.suite-t1.log` and `.suite-t2.log` back on main. Sebastian removed them by
hand at 07:15:46 (0491c043).

Two gaps in the code allow this:

- EnterQueue (queue.go:143) gives both cards of the pause, FixTask and
  RevertTask, zero cards ahead. Both can merge.
- endPauseCard (mainfix.go:362) ends only the fix-forward card when main
  turns green. A pending revert card stays live. Once the pause is gone, it
  merges as an ordinary card and reverts a commit on a green main. No
  incident shows this since 2026-10-20, because each later revert merged
  first.

## The fix

### A1. One remedy at a time

A red main gets one automatic remedy at a time: the fix-forward card until
the 2-hour bound, the revert after it. If the remedy merges and main stays
red, a human decides. The fix-forward card's body already states the
handover: "A fix that does not land by <deadline> has factoryd file the
revert".

- revert() (mainfix.go:493) files no revert while the pause's fix-forward
  card merges or merged. A fix-forward card merges while its gate is merge.
- When revert() files the revert, it ends the fix-forward card while that
  card is stoppable (replan.go:504), the way endPauseCard ends it: through
  closeIssueAsFactory, with the comment "factoryd: no fix landed by
  <deadline>: the revert #N replaces this card. Closing this issue."
- Merge (gates.go:1756) refuses a revert card whose pause's fix-forward
  card merged. This closes the one race left: the fix-forward card enters
  its merge in the same second that revert() files the revert. The refused
  revert waits for a new approval on the existing refusal path, and A2 or
  A3 settles it.

The 2026-10-20 incident cannot happen under A1: the revert's filing at
01:01 would have closed the fix-forward card #1154.

### A2. A remedy that merged while main stays red goes to a human

When a remedy of the pause merged and main's newest push run is red at a
commit other than the pause's own, mainState files the human card of the
pause: "main is still red at <sha> after <remedy> merged". The pause takes
it as its card, as it takes the re-run card, so endPauseCard closes it at
green and revert() files nothing on it. A red run still at the pause's own
commit changes nothing: the merge's run has not started yet.

### A3. A green main ends every remedy that did not merge

endPauseCard also ends the pause's revert card while the revert is
stoppable, with the comment "factoryd: main's push run N at SHA is green
(link): main is green without this revert. Closing this issue." A revert
that merged made main green itself and stays as it is.

The card ends by its lane's path:

- An agent-lane revert ends through closeIssueAsFactory, as the fix-forward
  card does today.
- A revert on a project without agents is a human card. For a bot close of
  its issue, issueClosed does nothing (intake.go, the case "endPRCard closed
  the issue and ends the card itself"). factoryd closes its pull request as
  the bot instead. The webhook or the heal pass then ends the card through
  WithdrawPRCard (intake.go:1426 to 1440).

mainState (mainfix.go:168) calls endPauseCard before signalQueueHeads, so
no woken card takes its turn before the cards of the pause end.

### B1. Finish closes the issue of a card whose pull request merged

In finish (activities.go:2532) the condition becomes
`final == "closed" || final == "done" && merged`. The comment of a done
end: "factoryd: pull request #N merged; this card ends with it."

- For an agent card, the merge's "Closes #N" closed the issue already.
  closeTaskIssue reads it closed and writes nothing.
- For a card that waits for its chain in merged, issueClosed leaves the
  card as it is.
- A done card without a pull request, a plan among them, keeps its issue
  open.

### B2. closeIssueAsFactory drops the open dependencies before the close

An ending card waits on nothing. closeIssueAsFactory (escalation.go:176)
removes the issue's dependencies on open issues, then closes the issue.
Dependencies on closed issues stay as history. Every factory close passes
through this function: Finish, endPauseCard, the heal pass and 11 more call
sites. The store's edges stay the source of truth for the order of cards.
The issue dependencies only mirror them (replan.go:507).

### B3. closePlan closes the plan's issue

- If the plan's issue is open, closePlan (verdict.go:988) closes it through
  closeIssueAsFactory with its comment.
- If the issue is closed already, closePlan keeps its commentOnce.
- A plan with issue number 0 closes nothing.
- closePlan records plan_closed only after the close succeeded or its
  record stands. plan_closed ends the minute pass's retries.

closePlan runs only for a plan card that ended closed or a plan without an
outline (verdict.go:896 to 918). BetweenRounds is false for both, so the
factory's close cannot turn a done plan closed.

### B4. A migration closes the 27 open issues once

A migration in internal/schema/migrations/factoryd does the backfill.
factoryd runs its migrations at start (store.go:855), and its deployment
uses the Recreate strategy, so no old factoryd runs the heal pass with the
old code afterwards. On a fresh seed the migration matches no row.

1. Set confirmed_at to NULL on the factory_closed rows of every card that
   ended closed: 94 rows today, among them the 10 dropped cards.
2. Insert a factory_closed row with a comment for every agent-lane card of
   FileFactoryPRTask that ended done or merged, and for every plan with
   plan_closed, where none stands. The unique index on task_id, kind and
   comment_id makes the insert idempotent.
3. The heal pass (HealFactoryCloses, 50 records a pass) reads each issue.
   It confirms a closed one without a write and closes an open one through
   closeIssueAsFactory.
4. After the roll, read the 27 issues from Forgejo. Each must be closed.

### C. The register

The register's entry states the verified cause from today. The fault
leaves the register when A1 to A3 and B1 to B3 land on code main and B4
has run.

## Tests

Each expected value comes from the case, not from a run.

| Test file | Case | Expected |
|---|---|---|
| mainfix | The bound passes, the fix-forward card stoppable | The revert is filed. The fix-forward card's issue gets "the revert #N replaces this card" and closes. |
| mainfix | The bound passes, the fix-forward card in its merge gate | No revert is filed. |
| mainfix | The bound passes, the fix-forward card merged | No revert is filed. |
| gates | Merge of a revert whose fix-forward card merged | No call to MergePullRequest. A refusal names the fix-forward card. |
| mainfix | A red newest run at another commit, the revert merged | The human card of the pause is filed and becomes the pause's card. |
| mainfix | A red newest run still at the pause's own commit, the revert merged | Nothing is filed. |
| mainfix | A green run with a stoppable agent-lane revert | The revert's issue gets the comment and closes. |
| mainfix | A green run with a stoppable human-lane revert | The revert's pull request closes as the bot. |
| mainfix | A green run after the revert merged | The revert card stays as it is. |
| mainfix | A green run with both cards live | endPauseCard's writes come before the signals to the queue heads. |
| finish | A done end after the merge of a revert card, its issue open | The issue gets "pull request #N merged; this card ends with it." and closes. |
| finish | A done end of an agent card whose issue the merge closed | No write to the issue. |
| finish | A done plan without a pull request | The issue stays open. |
| escalation | An issue with dependencies on open #A and closed #B | A DELETE of #A, no DELETE of #B, then the PATCH to closed. |
| verdict | closePlan with the plan's issue open | The issue closes with the comment, then plan_closed is recorded. |
| verdict | closePlan with the plan's issue closed | One comment, no close, then plan_closed. |
| verdict | closePlan whose close fails before its record | No plan_closed. The next pass tries again. |
| schema | The migration on a database with the cases of B4 | The rows of steps 1 and 2 stand unconfirmed. A second run changes nothing. |

## Left as it is

- moveDependents still links a dropped card's dependents to the plan's
  issue. B1 and B2 close such cards at their end, so the link no longer
  keeps an issue open.
- A newest run of main that ends cancelled changes nothing, as today. If
  no later run comes, the pause waits.
