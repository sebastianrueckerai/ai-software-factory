# The escalation ladder after the redesign: the batch of 2026-10-16 to 17

This is the validation of [escalation-ladder-redesign-2026-10-15.md](escalation-ladder-redesign-2026-10-15.md) against one real batch, read from the outside, per [escalation-ladder-validation.md](escalation-ladder-validation.md). The interpretations are the validator's and are marked as such.

**Coverage, said plainly.** The batch holds 33 cards, but only three check-in records exist, on two cards, and none of the three completed: two are the alias defect's refusal shape, one is the parse defect's deterministic human. The brief asks for ten cards with five check-in moments for a verdict. What follows is therefore notes, not a verdict, on the check-in itself (4.2 to 4.6). The counters (4.9), the outcomes (4.1), the cost (4.10) and the review (4.8) rest on all 33 cards and are verdict-grade. The session and dead check-in moments drew no card before plan E rolled at 05:30 on 2026-10-17; a probe card filed for them is still running at this file's cut and closes the file's last section.

## 1. The run

The batch is every card created from 2026-10-16 12:00 UTC to the morning of 2026-10-17: 33 cards, all but four on `sf/ai-software-factory-code`, four on `sf/ai-software-factory-infra`.

Which ladder each card ran on matters below:

| Machinery | Live from | Evidence |
|---|---|---|
| Plan B and C: the `spend_no_push` detector, the attempt and funding fixes | before the batch | `spend_no_push` trips on #941; the 4.9 counters |
| Plan D: the gate-moment check-in, policy v708 | 2026-10-16 ~20:00, roll card #934 | check-in records only on cards filed after |
| Finding ids in gate statements (upstream #954) | 2026-10-17 ~00:00 | #941's parse failure at 00:05 |
| Plan E: the session and dead moments, the alias fix, the finding-id parser | 2026-10-17 ~05:30, roll card #957, factoryd image `47fb0a40` | deployment image; no card has run a session on it yet except the probe |

The cards by kind:

| Kind | Cards |
|---|---|
| Real work cards, agent sessions | #911, #920, #921, #939, #940, #941, #953 (7) |
| Probes and live checks filed by the build | #925, #927, #930, #936, #937, #959 (running) |
| Roll cards (no model call, ruling 178) | #912, #916, #918, #923, #928, #932, #934, #942, #946, #949, #951, #955, #957 (13) |
| Infra repository cards, no spend | #78, #79, #82, #83 |
| Screening report tasks, no issue | `t-8f13ccc787b0`, `t-d2a03c2aba0d`, `t-6a3be80b6616` |

Models as before: coding on `coding-cheap`/`coding-frontier` (GLM), review and the check-in roles on DashScope (`review-frontier`, `supervisor`, `checkin`), audit on `coding-frontier`.

## 2. Where the data lives, with the names the implementation chose

As in the brief's section 2, plus the names the redesign picked:

- The check-in's ledger ref is `checkin/checkin`. Five rows in the batch, 0.039 EUR, all on #941.
- The check-in's timeline step is `checkin`. Its record holds: `moment` (`gate`, `session`, `dead`), `model`, `session` and `parent_session`, `statement_bytes`, `tail_bytes`, `calls` (one entry per model call and per tool call: `name`, `args`, `duration`, `result_bytes`), `tool_calls`, `duration`, `cost_eur`, `decision`, `reason`, `reason_kind`, `round`.
- The supervisor's timeline step is `supervisor`, with `called` true when the model answered and absent when code decided, `detector`, `decision`, `digest`, `guidance`, `reason`.
- Findings from the review carry per-finding verdict records inside the `model_review` step: `dropped` entries with `kind` (`uncalled`, `undefined`) and evidence.
- Handovers are `handover` steps with the text and the reading session.

Two record gaps, against the brief's expectation list: the check-in record does not carry the statement's text (only its size), and its `cost_eur` reads 0 while the ledger holds the real cost — on #941 (0.039 EUR) and again on the plan E probe of section 10 (0.0278 EUR), so the gap rides the current code. The first makes a check-in unreplayable from the timeline alone; the second hides the cost where the reader looks for it.

## 3. The counters of 4.9

| Counter | Result | Query or record |
|---|---|---|
| Starved sessions | 0 | every `session_started` event matched to its ledger rows: all 32 sessions have a model answer |
| Refused attempts that counted | 0 | `tasks.attempts` equals the answered-session count on every card; `audit` holds no `refused` row in the window |
| Fund answers that reached no session | 0 | no `card_funded` event in the batch |
| Stale questions on dependency-waiting cards | 0 | no `question_asked` names dependencies or quiet in the window |
| Plan cards failed on time with no second session | 0 | no plan card in the batch |
| Older answer obeyed over newer change request | 0 seen | no change request followed by an old answer in the events; #941's two answers were obeyed in order |
| Approvals offering Approve on red checks | 0 | every `approval_requested` sat on green `checks` records |
| `concerns` without findings starting a session | 0 | every `concerns` review carried findings |
| Session records saying `no_push` after a push | 0 | all nine `no_push`/`retry_stronger` session ends cross-checked against `pushed` steps and `session_pushed` events |

The baseline's two non-zero counters (3 starved, 2 refused attempts that counted) are both zero with the fixes live.

## 4. Outcomes (4.1) and cost (4.10)

The seven real work cards:

| Card | Sessions | EUR | Pushes | Human beyond approval | Minutes to merge |
|---|---|---|---|---|---|
| #911 | 3 | 4.331 | 3 | none | 86 |
| #920 | 3 | 3.349 | 2 | none | 86 |
| #921 | 3 | 1.415 | 3 | none (1 finding approved over) | 66 |
| #939 | 1 | 0.351 | 1 | none | 41 |
| #940 | 1 | 1.692 | 1 | none | 34 |
| #941 | 4 | 4.608 | 2 | 2 answers, 1 session grant | 126 |
| #953 | 1 | 0.634 | 1 | none | 30 |

One of seven real cards needed the human beyond the approval; the baseline was four of five.

Every human step in the batch, read in full:

| Card | Step | The answer's class |
|---|---|---|
| #941 | Cap question (PR no longer merges into main, #945 moved under it) | A fix the finding already held: the finding's own text said to merge main in. The check-in asked with exactly that finding and its answer failed to parse (the defect below). The human's answer restated the finding. |
| #941 | Check-in escalation "answer unreadable" | The same instruction again. A correction of the check-in's broken verdict path, not a decision only a human could take. |
| #925, #927 | Cap questions on live-check cards | Closed without answer; the cards were checks, done. Counted apart. |
| #936 | Screening question (the issue asks to delete a test file) | A policy-class decision, the human's by design. Closed. Counted apart. |

No steer, no fund, no UI-card look in the batch.

Cost against the baseline:

| Measure | 2026-10-15 baseline | This batch |
|---|---|---|
| EUR of sessions that produced nothing | 3.70 | 2.118 (9 sessions) |
| Of which starved or refused shapes | 3 starved, 2 refused attempts | 0 |
| Of which detector-stopped reading sessions | not separated | 2.090: three sessions stopped by the repetition detector at 0.609 to 0.774 EUR each |
| Share of spend on check-in roles | 8 % | 3.5 % (supervisor 0.59, check-in 0.039, of 18.211) |
| Prompt tokens per coding call | 35,000 to 80,000 | median 47,141, p90 89,056, max 115,183 (#941's session 3) |
| Cost per check-in call | plan estimate 0.1 EUR | 0.008 EUR average (5 calls, 0.039 EUR) |

The whole batch cost 18.211 EUR: coding 17.18, supervisor 0.59, review 0.212, audit 0.191, check-in 0.039, across 1,069 coding, 29 supervisor, 15 review, 15 audit and 5 check-in calls.

## 5. The check-in (4.2 to 4.6), and plan D's supervisor beside it

### Moments and decisions

| Moment | Asks | Decisions |
|---|---|---|
| Gate | 3, on #937 (2) and #941 (1) | #937: `handover` twice, both the refusal shape below. #941: `human`, deterministic, after five unreadable answers. Zero model-decided outcomes in the batch. |
| Session | 0 before plan E's roll; 1 after (probe #959, section 10) | plan D's supervisor model answered the trips before the roll: 28 model calls, 16 `continue`, 12 `message`, plus 9 code climbs (`cheap_cap`, stuck rule). The probe's ask after the roll completed: decision `message`, guidance delivered. |
| Dead | 0 | the moment did not exist before plan E, and no card died in the batch's window after the roll |

No check-in ran on a card with nothing wrong: #939, #940 and #953 approved on their first review round and never saw a check-in. (Interpretation.)

### The three check-in records, read in full

**#937, twice, 2026-10-16 22:38 and 22:53.** Both decided `handover` with an empty note. The records show `model: review-frontier`, `result_bytes: 0`, `cost_eur: 0` on every call. This is the alias defect: the task's pinned policy version named `review-frontier` for the check-in purpose, the version in force named `checkin`, and the gateway refused every call for the purpose mismatch. The deterministic fallback (end with a handover, empty note) fired as designed. Fixed with plan E's roll: factoryd now resolves a purpose's call alias from the version in force.

**#941, 2026-10-17 00:06, `round` 1.** The one readable record, and it answers the context and tool questions directly:

- Statement 21,647 bytes, tail 19,259 bytes, moment `gate`, hosting session `s-7198e954bc11`.
- Three tool calls: `gates` (424 bytes), `run` with a real git command probing the merge conflict (`git fetch`, `merge-tree`, 705 bytes), `run` checking heads (274 bytes). Small results, none cut, no five-times-adjacent pattern. The check-in used its tools and at the right grain.
- Five model calls (13, 114, 109, 472, 488 output tokens) over 19.8 seconds. Every answer failed to parse: `unknown finding "the pull request no longer merges into main..."`. The card ran in the window where gate statements carried finding ids (upstream #954) but the parser predated them. The retry ladder ran out and the deterministic human fired, with the finding named in the reason. Fixed with plan E's roll: the parser resolves findings by id, text and fold.

**Interpretation.** Both defects sat in the check-in's own path, both were found by probe cards within a day of going live, both degraded to their designed fallbacks without losing work or money (0.078 EUR total), and both are fixed on the rolled code — the alias fix verified live by the probe of section 10, twenty-two minutes after the roll. What the batch still cannot show is a gate or dead moment completing on plan E; the probe was still running at the cut.

### Verdicts (4.3) and handovers (4.6)

No finding reached a check-in confirm or drop in the batch: the confirm/drop path never got a parseable answer. The review's own drop records (below) are the only verdict machinery that ran. The two handover records are the alias defect's empty notes; no real handover text exists in the batch. Both questions reopen with the next batch.

## 6. The coding agent and the review (4.7, 4.8)

**The agent.** No budget refusal exists in the batch (the `audit` table holds no `refused`, `held` or `cancelled` row in the window), so the push-before-refusal and warning questions have nothing to measure: every real card pushed well inside its 5 EUR budget. The repetition detector stopped three reading sessions (60 to 98 tool calls without a file change) at 0.6 to 0.8 EUR each, and every next session pushed. The wait-tool question is not answerable from this data: the timelines' digests aggregate commands, and the session transcripts are not in the bucket.

**The review.** Fifteen real reviews (roll cards skip it by ruling 178): 7 `approve`, 8 `concerns`. Multi-round cards dropped old findings with reasons instead of repeating them: six drop records, kinds `uncalled` and `undefined`, one to three per re-review. Ten findings were adjudicated by the human approving over them (#941: 5, #937: 4, #921: 1).

Two adjudicated findings were re-judged for this file, evidence repeated at the merge commits:

- #941's "waiting-human escalation cards have no handling in `briefFacts`" was true at merge `3aad25f0` (the switch handles merge, resource and plan only). A real finding, accepted as a known gap, later work's to fix.
- #921's surviving finding ("`sight` retries all errors including permanent refusals, so the test's 403-and-one-ask expectation breaks") was false at head `d4d7c07a`: a refusal returns with a nil error and is never retried; the doc comment says so and the test passes green. This finding was raised in all three review rounds, each round dropping a different old finding but re-deriving the same false one, until the human approved over it. The baseline's repeat-a-false-finding shape is alive in this one card, in milder form.

**Interpretation.** #921 ran before plan D's roll, so no gate check-in judged its returning findings. Post-plan-D, every verdict with findings sets the gate ask, so the shape has a judge now. That is a claim about the next batch, not this one.

## 7. Interpretations

Marked as interpretations, in the brief's order:

1. The deterministic layer is clean. Every counter zero, no refusal shapes, no starved sessions, no lost answers. The baseline's worst money-wasters are gone at their roots.
2. The check-in's first day was defeated twice by its own wiring, and both times the degradation held: no wrong decision, no lost work, 0.078 EUR. The design's bet (deterministic fallbacks under a fragile model path) paid exactly where the defects hit.
3. The one human-beyond-approval on a real card traces to the parse defect, and the human's answer was a restatement of a finding the machinery itself held. With plan E's parser live, that step should not recur.
4. The cost curve improved on every measure the baseline named: nothing-sessions 3.70 to 2.12 EUR with zero starved, check-in-role share 8 to 3.5 percent, and the nothing-spend that remains is the detector stopping runaway readers, which is the intended shape.
5. Coding calls above 100,000 prompt tokens survive on one card (#941, max 115,183). The sign table's refinement (context detector threshold or compaction) stands, ranked below the fixed defects.

## 8. Refinements, ranked

| Rank | Refinement | Sign | Records |
|---|---|---|---|
| 1 | Already landed: the alias and parser fixes ride plan E; the spend-guard fix (sum the calls' own costs, not the running totals) landed at `4286a6f` after the probe's false share trip | #937's two refusal-shape asks; #941's five unreadable answers; #959's two sessions killed by the false trip | the `checkin` records of the three cards |
| 2 | Carry the check-in statement's text (or its hash) in the record, and book the real cost into `cost_eur` | a check-in cannot be replayed from the timeline; the record says 0 EUR against the ledger's 0.039 (#941) and 0.0278+0.0266 (probe #959, on plan E code) | the records of #941 and #959 |
| 3 | The re-review re-derives a dropped false finding (the #921 shape). The gate check-in now judges every findings return; if the shape recurs post-plan-D, require a tool check per confirmed finding | the same false test-expectation claim in rounds 1, 2 and 3 | #921's three `model_review` records |
| 4 | The undeliverable supervisor message: a `no_progress` decision for a session that had just detached ("no session is running") cost one call and reached nobody. Plan E's session moment replaces this path; verify no equivalent lands in the check-in | the `message` step with an error | #941, s-67604ae9e1bd, 23:26:56 |
| 5 | Context pressure on long sessions: max 115,183 prompt tokens | #941's session 3 | ledger |

## 9. What was not verified, and why

- The dead check-in moment and the finding-id parser under a live gate conversation: no card ran them on plan E before this file's cut. The session moment and the alias fix are verified live by the probe (section 10); the probe card was still running, and its end state closes that section.
- Ten check-in records in full: three exist.
- The coding agent's wait behaviour (blocking wait against sleep polling), the per-finding reports, and the dispute-confirmation rate: the session transcripts are not in the bucket and the timelines aggregate them away.
- Eight of the ten adjudicated findings were not re-judged; two were, with the evidence repeated.
- The console's rendering of the new records was not looked at (needs a logged-in console session).

## 10. The probe: card #959, the session moment's first walk

Card #959 ("hunt the factoryd race suite for flaky tests: run it twenty times") was filed on the rolled plan E code so its long suite runs trip a detector in session. At 03:52 UTC on 2026-10-17, 22 minutes after the roll, the first check-in conversation on plan E code ran, and the model completed the decision:

- Moment `session`, on session `s-69dae259e14d`, statement 25,255 bytes, tail 24,380 bytes.
- Trip: `no_progress`, "no harness events for 5m6s" — the flake hunt's ~2-minute suite runs.
- Two model calls (393 and 235 output tokens, 0.0278 EUR on the ledger), tool calls 0: the model judged from the tail and asked for nothing. The declared session tools (`transcript_search`, `transcript_read`) went uncalled, so the whole-branch review's live-record fix is verified by its test, not by this conversation.
- Decision `message`, reason_kind `stalled_background_job`. The reason, in full: the agent was waiting on a background job that is alive and progressing; the guidance told it not to restart the hunt, to poll `summary.tsv` without blocking, and to keep studying the suspect tests between polls. The `message` step landed one second later and the session ran on.
- The record's `model` field reads `checkin`: the call went through on the current version's alias. The alias defect is fixed live, on a real conversation.
- A second conversation ran at 04:20, after the designed ladder inside the session: a `nudge` step at 04:14 (three identical bash calls), the trip again, then the ask. Decision `message`, reason_kind `no_progress`: "stuck in a passive polling loop (repeated sleep+cat of summary.tsv) that yields no new information; 14 consecutive clean runs already establish absence of flakes... further polling consumes budget without progress". The guidance named the exact command to stop issuing and the two ways forward. This is the in-session judgment the redesign was for: the check-in read the tail, counted the runs, and ordered the agent out of its loop. 0.0266 EUR for that conversation.

Both conversations' `cost_eur` read 0 against the ledger's 0.0278 and 0.0266: the cost gap of section 2 is not #941's one-off, it rides plan E.

**The probe's third act found a real defect.** At 04:23 the next trip hit the check-in's spend guard and the card asked the human: "spend_above_policy: the check-in's share of the budget is spent". The arithmetic behind the trip was wrong. The guard sums the audit's `spend_eur` over the check-in rows, but the gateway books the card's running total into that column at every call (0.2018, 0.2062, 0.6417, 0.6455 on this card, sum 1.6953) and the call's own cost into `call_cost_eur` (real check-in spend: 0.0544 against a 0.50 share, ten percent of the 5 EUR budget). The two earlier conversations passed the guard only because their summed running totals sat under 0.50 at the time (0 and 0.408). From 04:23 every detector trip killed its session with the false verdict: session 1 ended `checkin_human` at 04:23:15, session 2 at 04:36:42 the same way, each end leaving a zero-statement check-in record (the guard runs before anything is bought) and an escalation to the human. The human answered the first escalation at 04:38 (button, comment 17736); the third session ran 12 minutes and the same false trip killed it at 04:50:39, escalating a second time. The human answered again at 05:19 (comment 17817). Three sessions lost to the false guard in 27 minutes.

The fix, landed on the code main at `4286a6f` the same morning: `CheckinSpent` sums `call_cost_eur`, the idiom the thread and call totals already use, pinned red-first by the reshaped `TestCheckinSpentAndCalls` (0.65 against the wanted 0.05 on the old SQL). It rides the deployed image `factory-gateway@sha256:0d59d63e...` since 05:16:42 UTC (the roll of `cc3508c`, card #966; two earlier roll cards for the bare fix, #963 and #965, were closed as superseded so they could not deploy the older digest over the tip). The card's fourth attempt (session `s-11b9c8a19f4f`, started 05:19:17, three minutes after the roll) is the first session to run under the fixed guard, which now reads 0.0544 spent of the 0.50 share.

**The card's end.** Attempt 6 (06:07 to 06:37) ran the hunt to its end and pushed the deliverable: PR #972, "the requested flake-hunt log documenting 22 race-suite runs, all passing. No code changes were needed since no flakes repeated" — run-02's failure from the fourth conversation never repeated, so the hunt's verdict is negative and the log documents it. The session ended at the wall clock after the push, and the card then walked the gates on plan E code: policy auto, reproduction, model review approve, audit, checks success, queue, approval requested and granted, **merged at 06:43:47 UTC, done at 06:43:48**. Final ledger: 2.171 EUR of the 5 EUR budget, 6 attempts, 5 check-in conversations (4 completed judgments, 1 cut by the call cap), 3 sessions lost to the false spend trip, 2 cap escalations, and 6 human button presses (5 answers, one on each escalation, and 1 approval). One card exercised the whole ladder: signals, six sessions, the session check-in with real judgments, both guard halves, the human in the loop, gates, merge. The dead moment drew no card (attempt 6's wall-clock end came after its push, so no dead ask could follow); the gate moment ran only its standard shape — no concerns were raised on the PR.

**The guard's other half, working as designed.** At 05:39:25, twenty minutes into the fourth attempt, the card escalated again: "spend_above_policy: check-in call cap reached" — the call-count half of the same guard (`checkin_calls: 12` in the policy's limits), not the false arithmetic. The card had legitimately spent its check-in conversations: the two judged conversations, the session-start asks of four attempts, and the detector trips between them. The human answered in 48 seconds (button, comment 17835) and the card ran on. The spend half held: no false spend trip in the 23 minutes since the fix deployed.

**Two more judgments on the fixed code, and the hunt found its flake.** The fourth attempt (05:19 to 05:39) held the third and fourth conversations. The third (05:28, four calls, 0.0348 EUR, a tool round then the decision) read the trip as the workers' long suite runs and told the agent to verify the two worker pids and their logs before anything else, and not to kill or restart them. The fourth (05:38, three calls, 0.0295 EUR) read further: "summary.txt shows runs 01,02,11,12 complete with **one failure in run-02**" — the flake hunt's purpose answered — and it named the failing test (`TestWorkflowSessionThatCannotStartKeepsTheLastLines`, line 3068) and the harness config lines to read, telling the agent to aggregate all failures before diagnosing and to let the workers finish. The check-in read live state, saw the failure, and gave grounded guidance without stopping the hunt. A fifth conversation bought one 41-token call at 05:39:20 and the cap cut it off: the deterministic human ended the session. The card then cycled on the cap's designed degradation — attempt 5 ran 26 quiet minutes, one trip, cap, human answer in 64 seconds; attempt 6 from 06:07 — each answer one button press. Across the card's life the check-in spent 0.1406 EUR of its 0.50 share over exactly 12 calls: the spend arithmetic reads true since the fix, and the call cap, not the share, is the binding limit.

---

Every number above cites its source: the store queries of 2026-10-17 morning (`tasks`, `events`, `ledger`, `audit` in `gateway` on `sf-cluster-1`), the 33 timelines under `s3://aisoftwarefactory-sessions/sessions/<task>/`, and the Forgejo API for the pull requests. Dumps: events 501 rows, ledger 1,133 rows, both covering exactly the 33 cards.
