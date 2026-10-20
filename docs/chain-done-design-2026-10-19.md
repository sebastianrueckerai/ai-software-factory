# Chain-done: a task is done when its change is live

Design, 2026-10-19. Sebastian's rule, stated repeatedly and finally: for the
factory, a task is only done when its change is live and usable. The CI chain
tracks that, and the card reflects it as its state. Not live == undone — not
as a hack where the board keeps a card in a column longer, but as the state.
The factory's own repository is the first case; every future repository gets
the same treatment, as generically as possible. The roll is that one
repository's deploy step, a special case of the general chain.

## Intent and why

Today a task reaches `done` at merge (workflow.go finish points, e.g.
"pull request merged"). The board then compensates: a done card whose chain
has not confirmed live stays in In progress wearing a chain word
(board.go `column()` and `deployStage`), and the Done column shows live cards
only. Everywhere else the word done means merged: the chat's "is done" poke
fires at merge (pokes.go on EventTaskEnded), the drawer's pill and status
line say done (drawer.html reads the status), completion settling and the
costs read the status. The card's truth is split across surfaces.

The chain itself exists only for the factory's own repository: the Roller and
RollWatcher are wired to one repo (cmd/factoryd/main.go:365-372), so
chain_runs is empty for every other project and its cards go done at merge
with no chain at all. Roadmap 297 aimed at the generic shape; the wiring
stayed single-repo. Two silences remain: a red or stalled chain pokes nobody
and matches no alert rule, and CI's rollout job keeps a permanent bootstrap
escape that passes an unjudged chain green. A timed-out roll stops at a log
line (the RollWatcher deadline path) and posts no failure verdict.

## Goals

- A task's final states are reached only through the chain: `done` means the
  change runs live; a merged change whose chain failed or stalled ends
  visibly, never silently done.
- The chain is generic: per project it can be nothing (merge is the last
  step), a CI run whose tail jobs prove the deploy (the standard case), or an
  external deploy that posts commit statuses. One model covers all.
- The card, the chat, the drawer, the pulse, completion and the costs all
  read the same truth: done == live.
- No silence anywhere: every merged card's chain concludes, fails, or stalls
  into a visible ending, with alerts for the red and stalled cases.

## Non-goals

- No per-project deploy code in factoryd. Projects bring their own deploy as
  CI jobs or commit statuses; factoryd only reads facts.
- The roll stays the factory's own deploy engine. Other projects get no roll
  machinery.
- The roll task itself still shows on no board ("a roll is no card",
  2026-10-18): a card tracks its own deploy leg, and the roll's pull
  requests stay linked to the cards they carried.
- No redesign of lanes, the merge queue or the wide view beyond adding the
  new state where states are listed.

## Anti-goals (what would make this a failure)

- A display-only fix: the board holding cards longer while the stored state,
  the pokes and the drawer say done. The state itself must carry the wait.
- A bespoke endpoint per deploy style. The chain's facts come from Forgejo
  (runs, jobs, commit statuses) and nothing else.
- Silence: any path where a merged card waits forever with nobody told.

## Constraints

- Immutable and re-seedable: migration must be a no-op for existing rows
  (tasks finished before this state exists stay done; the deployLive SQL's
  third clause already grandfathers them).
- Cheap commodity hardware; Postgres and Forgejo are the only stores of
  record. No new infrastructure.
- Reliability by construction, not prompt rules: every wait has a bound,
  every bound has a verdict, every verdict reaches the workflow as a signal.
- The factory restarts freely: a workflow waiting on the chain re-reads the
  recorded facts on replay and re-waits; the poller re-signals unsettled
  chains after a crash (the same claim-and-signal pattern intake uses).

## The model

### 1. The chain is per-project and configured, with a sound default

The policy's project file gains a chain section:

```yaml
chain:
  mode: run        # run | none
  requires:        # optional commit-status contexts the head must carry, all green
    - factory/roll
  stall: 30m       # a run or a required context pending longer than this is stalled
```

- `none`: merge is live. The card finishes done at merge, exactly as projects
  without a deploy want. Default for a repository with no workflows.
- `run`: the main push runs that carry the pull request are the chain. Live =
  every push run on the merge commit concluded success AND every `requires`
  context on the head is success. The AND across runs is deliberate: a fast
  lint workflow may conclude green while the build workflow is still red, and
  newest-run-wins would call that live. A repository with one push workflow
  behaves exactly as the factory's does today.
- A repository with no push-triggered workflow at all degrades to `none` for
  itself (the poller reads the repo's workflow list once and caches it, with
  a one-time ledger note): PR-only CI and mode `run` cannot produce a chain,
  and silence is the alternative. A repository whose push runs are
  paths-filtered away on some commits feels the stall watchdog instead, which
  names the missing run.
- "An even more complex deploy": the project's own CD posts commit statuses;
  `requires` names them. The tail is whatever posts the last context. No
  bespoke code per project.
- The stall clock starts at the first recorded run's creation on the merge
  commit, or at merge when no run has appeared.
- The factory's own repository sets `requires: [factory/roll]`. Its runs
  already end with the rollout job, which polls the roll's verdict, so run
  success and the roll's verdict coincide; the required status makes the
  roll's outcome explicit and lets a roll fail after a green run still hold
  the card.

### 2. The chain is recorded for every repository

The Roller's poll loop generalizes into a chain poller that serves every
project whose mode is `run`: read the repo's newest main push runs, map the
pull requests each run carried (the existing compare-based carry logic in
recordChain is already repo-generic), and record chain_runs — one row per
pull request, the run's status the row's. The RollTask and RollWatcher stay
exactly as they are, behind the factory's own repository: the roll is that
one project's deploy engine, and its verdict is one required context.

The factory's roller keeps posting its verdict as the factory/roll commit
status (success = live, failure = will not run live, pending = carrying).
Other projects post none; the run itself and the stall watchdog carry their
chains.

### 3. `merged` becomes a state; done happens at live; red chains get repair

The task state graph gains `merged` between in-review and done:

- At merge, the workflow no longer finishes. It moves the task to `merged`
  (reason "pull request merged") and waits, cost-free and slot-free — the
  agent's session and slot ended at merge; the wait is signal-only, plus a
  deadline: the workflow arms its own stall timer at merge + the project's
  `stall` bound and decides stalled itself if nothing arrived, so a down or
  crash-looping poller cannot silence a card. Whichever verdict arrives
  first wins; the poller's stall record is bookkeeping.
- The move to `merged` happens at one choke point keyed on the merge act:
  every workflow finish whose pull request merged moves to `merged` — the
  approval verdicts, the auto merge, the healed head — with no side doors.
  Finishes that merged nothing keep today's behavior: a card that ends
  without a pull request has no chain, and nothing to deploy is live at its
  end state.
- **A card is live when a green chain covers it.** The chain is a fact about
  main's head, not about the card's own merge run: the card is live when the
  newest green run on main carries the card's change — its merge commit is
  an ancestor of that run's commit. A red run on the card's own head does
  not condemn it: a later fix merges, a later run goes green, and the card
  goes done, because the deployed digest now contains the change. The store
  answers this from the runs' own order (a green run covers every merge
  before it); no new API facts are needed.
- **A red or stalled chain is not a verdict; it is work.** The card stays
  `merged` — undone, in In progress, wearing the chain's state and a link to
  the repair — until a green chain covers it. There is no failed-after-merge
  and nothing to re-open: failed stays what it is today, the task's own work
  failing before merge. The repair runs the escalation ladder as its own
  work item, agent-first: for the factory's repository that is the existing
  machinery (mainfix for a red push run; the roll task's retry for a red
  roll, escalating to a needs-you question after its attempts run out). For
  every other project the poller files a repair card in the project's own
  pipeline, an agent card like any other: the chain's failure is its
  starting findings, the project's caps, stronger rungs and session limits
  bound it, and its end is the human's needs-you question when the attempts
  run out. One repair stream per repository — the affected cards link to it
  and never spawn repair sessions of their own, so N merged cards on one red
  run produce one repair, not N agents fighting over main.
- Nothing rides on the repair card's own fate: the affected cards watch the
  chain, not the repair. When the chain greens — by the repair, by a human's
  hand, or by time — they go done.
- The chain wait first reads the recorded facts (a chain that concluded while
  factoryd was down decides on entry), then waits for signals the chain
  poller sends when a carried run concludes:
  - live → the workflow finishes `done`, reason "live on <project>". The
    done poke, the drawer's word, completion settling and the costs all read
    done only now.
  - failed (the run failed, or a required context is failure) → the workflow
    finishes `failed`, reason "merged but not live: <the failing step, with
    its link>". The work is merged, so Retry stays hidden on such a card;
    the failure is the chain's, the poke tells the project, and the
    factory's own repo self-heals through the mainfix loop.
  - stalled (pending past the project's `stall` bound) → the poller records
    the stall and signals it; the workflow finishes `failed`, reason
    "merged but not live: the chain stalled <duration> at <step>". Every
    merged card's chain thus concludes, fails, or stalls into a visible
    ending. Never silence.
- `Final("merged")` is false. Completion, settling, the ledger and the costs
  hold until a final state, so they inherit the rule with no new code.
- The board needs no compensating hack: fiveColumn maps `merged` into In
  progress, the stage word names the chain position (the existing
  "waiting for the chain / chain running / chain red" words, plus "stalled"),
  and `done` finally means live. The wide view's state columns list Merged.
- Old rows: tasks already done stay done (the grandfather clause). Tasks in
  the old done-but-not-live limbo at deploy time migrate to `merged` on the
  first poll that sees them (their chain facts are the same rows).
- Word on the card: the face pill and the drawer pill read the same status,
  so they stop disagreeing. The poke words follow the states: merged informs
  ("#603 merged; the chain is running", and on red: "the chain failed; repair
  #1139 is on it"), done states the fact ("#603 is done and live"). A merged
  card pokes once, at merge; the repair item carries the escalation
  ladder's pokes, and the affected cards stay quiet while the repair runs —
  their state on the board is the truth, not another notification.
- Workflow-less merged cards — the done-but-not-live limbo this design
  migrates, and any card whose workflow is gone — are handled by the poller
  directly in the store, the same transition the MoveTask guard serves:
  limbo cards whose chain covers them stay done; the rest move to `merged`
  and live by the same chain facts from then on. No merged card is left
  waiting with no workflow to wake, and none needs one: its state follows
  the chain's facts, which the poller owns.

### 4. Every silence becomes a verdict

- The RollWatcher's deadline path stops logging and giving up: it posts the
  factory/roll failure verdict ("not live within <timeout>; the deployments
  did not take the digest") and records the roll request failed, so the roll
  task's trail carries the failure. The watcher also posts the success
  verdict when its measurement records the deployments live. The roller
  keeps posting one verdict itself, at judge time: a skipped roll ("nothing
  to roll outside k8s/") never restarts a deployment, so the watcher would
  never measure it — the roller's success there is the only verdict that
  path will ever get. The writer split is by roll kind: measured rolls by
  the watcher, skips by the roller.
- The chain poller's stall watchdog ends every stalled chain (stalled
  verdict where the project expects contexts, workflow signal always).
- alerts.go gains two rules, surfaced like every alert: chain red and chain
  stalled, per project.
- CI's rollout job loses the bootstrap escape: the five-minute
  commit-and-parent check deletes. Past the job's deadline, silence fails
  the run and names what was missing. Safe because the poller now watches
  every `run`-mode repository, so every green run posts its facts and the
  job's poll finds them.

### 5. The drawer shows the steps

The drawer's chain section lists the steps from Forgejo: the run (link,
conclusion) and its jobs with their states, then each required context and
its state, the tail last. The face keeps the one word. The layout goes
through a design round first (the card's look is Sebastian's pick), so this
piece ships after the round with the round's filing.

## What is left to the builder

- The state graph edits: policy's process states and from-sets, the MoveTask
  guard, Final, the wide view's state columns, and the acceptance tests that
  pin transitions.
- The signal plumbing: the poller's per-task signal (tasks by pr_number in
  status merged), its claim-and-resignal pass for unsettled chains, and the
  workflow's read-on-entry chain wait.
- The chain poller's per-repo loop and its configuration source (the
  policy's project chain sections), replacing the single-repo wiring.
- The poke and drawer word changes, and the tests that pin the poke timing
  (a merged card pokes once, at merge, as an inform; done pokes at live).
- Migration of the done-but-not-live limbo at deploy time.

## Decisions (Sebastian, 2026-10-19)

1. A merged card whose chain failed or stalled is undone work, not a
   verdict: it stays in working, and the failure triggers the escalation
   ladder — an agent attempts the fix first, and at the ladder's end the
   human looks (needs-you). No failed-after-merge.
2. No terminal chain verdicts. A card stays in working until every chain
   failure is fixed; live goes done, and a card whose chain went red but
   whose change reached the deployed digest by a later fix goes done too
   (the green chain covers it). Failed stays reserved for work that failed
   before merge.
3. The state's name: `merged`. (Sebastian's call to make, delegated.)
4. The default chain mode for a repository with workflows: `run`, tracked
   unless told otherwise. (Delegated.)
