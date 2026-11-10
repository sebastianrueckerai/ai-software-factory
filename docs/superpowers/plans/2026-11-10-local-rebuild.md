# Local rebuild: card flow and every known fault, with the factory stopped

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This file is the persistent TODO list: tick a box only when its verification passed.

**Goal:** Finish the card-flow redesign and fix every known factory fault by hand, with no agent sessions running, fix the rest of this session's bug log, then roll, restart the factory with 4 sessions and a surge of 2, and see how the new card flow works.

**Architecture:** The factory stops taking work (Phase 0). Every live card's work is assessed and either reused or discarded with a reason. Every task then lands as a controller pull request on the code repository, built from the card brief or design section named in the task, with CI green and an independent review before merge. The factory restarts only after all phases are done.

**Tech Stack:** Go (factoryd, factory-gateway, agent-worker), Temporal workflows with version gates, Forgejo and Forgejo Actions, PostgreSQL, htmx console, OpenTofu and Flux in the infra repository.

**Spec:** the card briefs on Forgejo (`sf/ai-software-factory-code`, issue bodies), [docs/card-flow-redesign-2026-11-02.md](../../card-flow-redesign-2026-11-02.md) for the card flow, and [docs/needs-you-register-2026-11-09.md](../../needs-you-register-2026-11-09.md) for the faults. Each task names its exact source.

## Global Constraints

- Code: `~/repos/ai-software-factory-code`. Infra: `~/repos/ai-software-factory-infra`. Each repository pushes to Forgejo (`origin`) and GitHub (`github`).
- New work goes in a git worktree. A pull request comes from the controller fork (`fork`, `controller/ai-software-factory-code`), opened with the controller login.
- Before a merge: CI is green (`pr / test`, `vet-and-format`, `security`, `job-env-audit`, `changes`, and `image-build` when it runs), and an independent review on the most capable model has read the diff and found no blocker.
- Every workflow change sits behind a `workflow.GetVersion` change id, named as `names_test.go` enforces. A replay test pins a run recorded before the change.
- Local runs: `bash check changed` and the touched packages' tests with `-race`. `gofmt` comes from `GOTOOLCHAIN=go1.26.10`.
- Expectations in tests are derived by hand. An assertion is never changed to make a test pass.
- Every text built from an error goes through `redact.Scrubber` before a person or a model reads it.
- Wording: a human is a human, never a member or an operator, in docs and copy.
- No rule goes into a prompt that a tool, a structured field or a deterministic step can carry.
- No ruling number and no ledger path appears in a tracked file or a commit message.
- Progress, harvest results and decisions are recorded in this plan's untracked progress ledger, beside the plan's ticked boxes.

## Review Focus

1. **A partial step reaches production.** Each merged task must leave main deployable and every running card's behaviour unchanged until the step that switches it on. Each task's tests include "main as of this task, nothing wired yet, behaves as before".
2. **Temporal replay.** A workflow change without a version gate breaks the cards that run across the roll. Each workflow-touching task carries a replay test of a history recorded before it.
3. **Secrets in new texts.** Rung 1, rung 2, the face and the brief writer all build texts from errors and facts. A test per new text path feeds an error with URL userinfo and a bearer value and finds both masked.
4. **A spent budget silences a rung.** The judgment budget pays rungs 1 and 2. A test at a spent budget shows the case reaching the human marked unjudged, with its facts.
5. **Work lost at a bound.** A size trip or a time cap must not lose a session's finished work. Phase 2's tests include a session over its line bound whose work stays on a branch.

---

## Phase 0: Stop, harvest, close

Nothing is discarded before it is assessed. The harvest table goes into the ledger.

### Task 0.1: Stop new work

- [ ] Set the project's autonomy level to manual on the console. Rung 2 then confirms every action and wakes on nothing.
- [ ] Set `work_in_progress: 1` in the infra project file (`factory/projects/ai-software-factory-code.yaml`). A value of 0 means the default of 5.
- [ ] Press "Skip once" on the weekly bump routine (Monday 06:00).
- [ ] Verify: at most one new session starts before Task 0.3 closes the queue (`kubectl get pods -A | grep worker-`); record it in the harvest.

### Task 0.2: Harvest every live card

For each card that is running, in review, waiting or queued, record in the ledger: the card, its branch on `agentfork` with its head SHA, the diff against main (`git diff --shortstat $(git merge-base origin/main <ref>) <ref>`), its checks, its open pull request, what its brief still asks, and one verdict: **reuse in task N**, **redo from the brief in task N**, or **discard** with the reason.

- [ ] Let the running sessions end on their own, then record their final heads. Known branches with reusable work:

| Branch | Card | Diff at 14:30 |
|---|---|---|
| factory/t-10466a2ab8e5 | #1642, PR #1655 | +702/-127, 37 files |
| factory/t-e2efcfaa95ce | #1641, PR #1644 | +306/-53, 17 files |
| factory/t-fe2a4750a551 | #1659, PR #1686 | +303/-91 (checkin.go) |
| factory/t-eea3710a4cc4 | PR #1625 (#1665's start) | +85/-28, 10 files |
| factory/t-5845df1311a1 | #1587, the receipt wiring | +157/-8, 12 files |
| factory/t-eb25b36553a7 | #1634 | to fetch |
| factory/t-b63cb8d5f53c | #1601, an older try of #1642 | +541/-71 (superseded) |

- [ ] Fetch every live card's branch (`git fetch agentfork +refs/heads/factory/t-<id>:refs/remotes/agentfork/factory/t-<id>`) and fill the table for all of them.

### Task 0.3: Close the cards and the plans, with the harvest as the note

- [ ] Close every live card through the console's Close, with the note "moved to the local rebuild plan, task N" (or "discarded: <reason>"). Close the open pull requests #1644, #1655 and #1686 with the same note; their branches stay on `agentfork`.
- [ ] Close plans #1549, #1541 and #1654. Factoryd answers "its merged cards stay on main". Keep plan #1580 open until Task 1.1 has merged: its interim push holds two security holes, and the production hold keeps them off production until then.
- [ ] Close the old cards the triage of 14:30 found fixed, superseded or obsolete, each with its evidence as the note: #186, #194, #196, #199, #203, #287, #479, #607, #639, #642, #643, #649, #651, #652, #653, #654, #660, #806, #851, #869, #981, #1103, #1149, #1250, #1251, #1441, #1590, #1624, #1640, and the 24 roll cards from #182 to #1259.
- [ ] Close rung 2's asks #1687 and #1688 with a pointer to this plan.
- [ ] Verify: the board shows no live card except plan #1580, and Needs you is empty.

---

## Phase 1: Finish the work in flight

Each task reuses the branch named in it: fetch it, rebase it on main in a worktree, read its diff against the brief, finish what the brief still asks, push to the controller fork, and open a pull request. From the merge of Task 1.1 on, no plan is open on main, and the roller rolls every green main: each task must be deployable on its own (Review Focus 1).

### Task 1.1: The interim push, made safe, and its session half (#1634)

**Spec:** #1634's brief (its first part: the four fixes from the review of PR #1674). **Reuse:** #1634's branch if the harvest finds work. Main holds #1633 (wippush.go) and #1679 (the worker's /wip and forced end push).
**Files:** `internal/factoryd/wippush.go`, `runner.go`, `supervise.go`, `activities.go`, `wippush_test.go`, `supervise_test.go`.
- [ ] Tests first, from the brief's acceptance: a commit that does not descend from the start is refused, the pushed commit carries `wipIdentity` and `wipMessage`, a body that is not a bundle is refused, `transfer.fsckObjects` rejects a malformed object, an end push after an interim push lands, `checkin_fires_interim_push`, and `wip_push_grants_no_push_credit`.
- [ ] Implement, `bash check changed`, pull request, review, merge.
- [ ] Then close plan #1580 (its #1609 and #1610 move to Task 1.6).

### Task 1.2: The gate reserve (#1641)

**Spec:** #1641's brief. **Reuse:** factory/t-e2efcfaa95ce (the reserve code is right; tests lag).
- [ ] Read the head's red tests; fix TestSessionFundedAgreesWithTheGateway and anything else red, with figures derived by hand from "a session's headroom is budget minus spent minus the reserve".
- [ ] The five criteria tests of the brief pass (`sessions_stop_gates_run`, `money_stop_names_reserve`, `grant_leaves_reserve_whole`, `replay_pre_reserve_version`, `reserve_key_in_manual`).
- [ ] Pull request, review, merge.

### Task 1.3: The console refusals' remainder (#1642)

**Spec:** #1642's brief and the return of 14:2x on PR #1655 (the five masking fixes). **Reuse:** factory/t-10466a2ab8e5.
- [ ] Tests first: an error carrying URL userinfo and a bearer value reaches the refusal masked on each path the return names (errText, forgejoCause, errSentence, projects.go:760, the five `%v` refusals, board.go:3156); the proof test catches "factoryd log".
- [ ] Implement with `redact.Scrubber`; internal hostnames may stay in a refusal.
- [ ] Pull request, review, merge.

### Task 1.4: The checks wait takes CI's own bound (#1665)

**Spec:** #1665's brief. **Reuse:** factory/t-eea3710a4cc4 (the policy half: `waits.checks`, its 50m default, PartsBound).
- [ ] The five missing items of the brief, one commit each, with their tests.
- [ ] Pull request, review, merge. Then remove `bounds: WaitChecks: 2400` from the infra policy (one infra pull request).

### Task 1.5: The upstream copy (#1654, #1685)

**Spec:** #1654's cut brief (copy logic) and #1685 (wiring); plan #1654 revision 1's four cards are the split. **Reuse:** none (the first try's 776 lines were lost).
- [ ] The line diff and its findings, the store-first read and the manifest pull with the bearer dance, the blobs and the two tags, then the activity, its two call sites behind change id `upstream-copy`, and main.go's wiring, with the briefs' acceptance tests.

### Task 1.6: The pushed branch is the next start (#1609, #1610)

**Spec:** #1609's and #1610's briefs (plan #1580). Depends on Task 1.1.
- [ ] #1609: `startRef`, the heal's branch head, the pre-check. #1610: the acceptance of a session that dies after its check-in pushed. Review, merge.

### Task 1.7: The review's cost block (#1671, #1672)

**Spec:** #1671's and #1672's briefs (plan #1549 round 2). The principle line is in docs/architecture.md since 13:00.
- [ ] Build both briefs, review, merge.

### Task 1.8: CI memory and killed checks (#1682, #1683, #1684)

**Spec:** the three briefs (plan #1657): `GOMAXPROCS=2` in ci.go's runner env, the measurement in the pull request, a check killed by a signal re-runs once.
- [ ] Build them in order, review, merge.

---

## Phase 2: The factory's faults

The spec is the card brief, or the register entry where no card exists. Each register-only task first writes its failing test from the entry's "What full auto should do" sentence.

| Task | Fault | Spec | Card |
|---|---|---|---|
| 2.1 | A plan revision cannot take off main what it relies on; the confirm names the revert | brief | #1663 |
| 2.2 | A planner's time stop gets an extend with agent time; the bought-nothing guard weighs a planner's revision, not a push | brief and its addendum | #1664 |
| 2.3 | One plan's delta round cannot starve the criteria pass; a one-card plan takes a delta card | brief | #1666 |
| 2.4 | A refused issue says why on the issue; a closed card frees its roadmap item for a refile | brief and its addendum | #1669 |
| 2.5 | A plan whose integration card ended off main closes on a met invariant | brief | #1673 |
| 2.6 | A done plan's criteria gate runs on the gate reserve (after 1.2) | brief | #1676 |
| 2.7 | Keep waiting on a checks-wait stop re-runs the wait, also at an agent-time cap | brief | #1677 |
| 2.8 | Rung 2 cannot approve a merge whose review or audit did not run | brief | #1680 |
| 2.9 | Surge protection: the bound counts every resumption, resumed cards queue first, CI pods count | brief | #1675 |
| 2.10 | spend_no_push weighs the session's own spend | register 66 | new |
| 2.11 | A size trip on finished work pushes it in parts, and the progress line counts the files written | register 47, 18 | new |
| 2.12 | The merge call names the red job's failing tests from its log, apart from the prover's timeout | register 62 | new |
| 2.13 | The gateway serves an alias from its twin when it is slower than a bound for an hour | register 56 | new |
| 2.14 | A spent chat budget opens a human issue the same day | register 52 | new |
| 2.15 | The agent time cap after OOMKilled sessions, and the check-in's own 10-minute cap on a slow model | register 5, 6 | new |
| 2.16 | The press "Have the factory do it" acts, or says why not | register 14 | new |
| 2.17 | The RSA key case in the scrubber's tests | #241 | #241 |
| 2.18 | The write tools' stream suite | #603 | #603 |

- [ ] For each row: test first, implement, `bash check changed`, pull request, review, merge, tick the row in the ledger.
- [ ] Register entries 7, 13, 23 and 29 are answered by Phase 3 (rung 1 and rung 2 on every case, the share guard's removal). Verify each against its entry when Phase 3 is done.

---

## Phase 3: The card-flow redesign (plan #1541's phases 3 to 5)

**Spec:** [docs/card-flow-redesign-2026-11-02.md](../../card-flow-redesign-2026-11-02.md), the sections named per step, and plan #1541 revision 4's card briefs (#1659, #1591, #1561, #1563).

Settle the decisions below before the step that needs them.

| Step | What | Design | Depends on |
|---|---|---|---|
| 3.1 | Land the moments wiring (#1659): ToolChoice, enumCheck, momentAnswerTool, forcedToolChoice | §5.2 l.120, rev 4 card 1 | reuse factory/t-fe2a4750a551 (PR #1686) |
| 3.2 | The forced-call proof suite (#1591) | rev 4 card 2, agentdoc.go:126 | 3.1 |
| 3.3 | Rung 1's statement: siblings in CaseFacts, the human-only list, `escalation.judgment` | §5.2, §5.10, §5.12 l.298 | 3.1 |
| 3.4 | Rung 1's conversation, Act at rung 1, the hand-up (#1561) | §5.2, §5.10 | 3.2, 3.3 |
| 3.5 | The share guard goes under change id `checkin-judgment`; the calls book on the chat task; a replay pin (#1563a) | §5.6 row 3, §5.7 l.254 | 3.4 |
| 3.6 | `judgment_budget`, the per-card count, the new default (#1563b) | §5.7 | 3.5, decision D4 |
| 3.7 | Comments that name no case id | §7 l.318, act.go:701 | none |
| 3.8 | PlanQuestion gains its recommended answer; the planner contract | §5.9 l.272, plan.go:154, :1196 | none |
| 3.9 | The tool alias table | §5.11 l.284 | none |
| 3.10 | One month cap, in code and infra | §5.11 | decision D6 |
| 3.11 | Rung 2 wakes on every case at every level; the face waits for it | §5.2 l.122, §5.9 l.270 | 3.4, decision D2 |
| 3.12 | Act or propose by autonomy level; analysis on human-only kinds; a closed dependency goes to rung 2 | §5.2, §5.6, §5.9 | 3.11, 2.8 |
| 3.13 | The roll-held case | §5.11, releasekeeper.go | 3.12, decision D5 |
| 3.14 | The face reads cases: the five parts and the carousel (C44) | §5.8 l.256-266, design-decisions.md C44 | 3.12 |
| 3.15 | Buttons from `Offered(f, 3)`; fund and note in one send; a typed merge approval | §5.5, §5.8 | 3.14, decision D1 |
| 3.16 | Plan questions one per carousel slot | §5.8, §5.9 | 3.8, 3.14 |
| 3.17 | The brief writer on cases | §5.8 | 3.14, decision D8 |
| 3.18 | The metrics page's four figures from the cases | §7 l.318 | 3.12 |
| 3.19 | The export command and the fixture format | §7 l.316, §10 | none |
| 3.20 | The replay harness and the first five fixtures; the other fifteen in batches | §7, §10 | 3.15, 3.19 |

The design names more than the outline. Fold each into the step that owns its code, or add a step:
- [ ] The session reads the digest (§5.10 l.278) into 3.4.
- [ ] Raises carry over on a replan (§5.10 l.282) into 3.12.
- [ ] The checks log reaches rung 1 and the next note (§5.5 rule 3) into 3.4.
- [ ] A refused check-in or planner call opens a case (§5.7 l.252) into 3.4.
- [ ] Act actions for dependency edges, filing a card, a plan restart and merge approval (§5.5) into 3.15.
- [ ] The plan card shows nothing raw (§5.8) into 3.14.
- [ ] Salvage (§5.11 l.292) and dropping the old records (§5.12 l.302) as a step after 3.20.
- [ ] The 39 stuck points as fixtures (§7) into 3.20.
- [ ] Regenerate the agent map (§10) last.
- [ ] Add the missing case kinds policy_class, red_main, roll_held and config_refused (cases.go:23-49) into 3.12.

### Decisions to settle (Sebastian)

| | Question | Recommendation |
|---|---|---|
| D1 | Merge approval, criteria, Deploy now and dependency edges join the one action list of §5.5, or stay outside it as today | Join it, so the face and rung 2 use one list |
| D2 | Rung 2 runs on premium at every level (§5.2), or on big as today | Big while premium has 85 percent of its month spent; premium after |
| D3 | The 10 contradictions between design and code listed in the ledger (design §5 vs main): the design says code wins where they differ | Confirm per item when its step starts |
| D4 | The judgment budget is the chat budget: its size (policy 30 EUR, revision 4's code default 10, the 50 EUR spent by the 10th) | One budget key, sized from today's spend: about 5 EUR a day of rung 2 |
| D5 | Rung 2 may press Deploy now (§5.11), which `chatDeploysAnyway` refuses today | Yes, within the roll-held case only |
| D6 | One month cap in one place, against the LiteLLM backstop (`max_budget: 750`) | Keep the backstop as a named outer guard; one cap in policy for everything else |
| D7 | Rung 1 sees the repository (§5.2), while #1561's brief drops `run` | Read-only repository tools for rung 1, no `run` |
| D8 | The brief writer briefs every Needs-you card (§5.8) and bills the card | Bill the judgment budget, not the card |

---

## Phase 4: The rest of this session's bug log

After Phases 1 to 3, fix every fault of this session's bug log that no earlier task fixed. The log is in two files:

- [docs/needs-you-register-2026-11-09.md](../../needs-you-register-2026-11-09.md): the register, 67 entries on 2026-11-10, each with who decided, what full auto should do, and a verdict.
- `session-notes-2026-11-09-board-loop.md` in the design repository's root (untracked): the board loop's notes, with the doors, the rules learned and the state of each card by the hour.

- [ ] Read every register entry whose verdict says **bug** or **not built**. For each one, find the task that fixed it, or check it against main. Write the result under the entry as one line: "Fixed by <pull request>" or "Still open".
- [ ] Fix every entry still open, test first, and add its "Fixed by" line.
- [ ] Read the notes file for faults the register lacks, and add each to the register before fixing it.

## Phase 5: Roll

- [ ] Main is green on every job, the image jobs included.
- [ ] Roll through factoryd's roller (no plan is open on main after Phase 0), or press Deploy now. Verify on the cluster that factoryd, the gateway, the worker and the ci-runner run main's digests.
- [ ] Check production for an hour: factoryd's log holds no new error class, the criteria pass runs within its bound, and the console's pages load.

## Phase 6: Restart and observe

- [ ] Settle the model question first: z.ai's glm-5.3 at its speed of that day, or the Alibaba twin (register decision 11).
- [ ] Set `work_in_progress: 4` and `surge: 2` in the infra project file, and the autonomy level back to full auto.
- [ ] File three canary cards of different shapes: a small fix, a plan of two cards (the receipt plan #1668 is the candidate), and one that must stop for a human. Watch each stop pass rung 0, rung 1 and rung 2 before it reaches the face.
- [ ] Write the observations for Sebastian: per stop, which rung answered, how long it took, what it cost, and how the face read.
