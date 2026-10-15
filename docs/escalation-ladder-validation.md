# Validating the escalation ladder after the redesign

This is the brief for a session that looks at the factory from the outside after the changes of [escalation-ladder-redesign-2026-10-15.md](escalation-ladder-redesign-2026-10-15.md) are live and one real batch has run on them. The plan claims that the ladder heals cards without a human and wastes fewer tokens. This document says how to find out whether that holds, where the check-in agent has too little context or too much, whether it uses its tools, whether the tools have the right grain, and what to refine next.

The session reads. It does not change the factory. It produces one facts file and one ranked list of refinements.

## 1. Rules

- Read only. No steer, no answer, no fund, no approval, no policy change. A card that needs a human is the human's.
- Never print a key, a token or a cookie.
- Every number cites its query or its record. Every judgment is marked as an interpretation.
- Write the facts file as `docs/escalation-ladder-validation-<date>.md` in this repository, in the form of [escalation-ladder-facts-2026-10-15.md](escalation-ladder-facts-2026-10-15.md): terms, the run, where the data lives, the findings, the interpretations.
- Cover at least one real batch of ten cards, with at least five that reached a check-in moment. Fewer cards give notes, not a verdict. Say which.
- Read whole records, not summaries. For every question below, read at least ten check-in records in full, and every record behind a number you report as a rate.

## 2. Where the data lives

| Data | Where | How |
|---|---|---|
| Events per card | Database `gateway` on the CNPG cluster `sf-cluster`, namespace `platform`, table `events` | `kubectl exec -n platform sf-cluster-1 -c postgres -- psql -U postgres -d gateway -c "select at, kind, actor, via, detail from events where task_id = '<task>' order by id"` |
| Spend per call | Table `ledger`: `task_id`, `session`, `ref`, `eur`, `prompt_tokens`, `cached_tokens`, `output_tokens`, `body_bytes`, `want_out`, `held_at`, `created_at` | The `ref` names the purpose and alias, for example `review/review-frontier`. The check-in's calls carry the ref the implementation chose. Find it with `select distinct ref from ledger where created_at > '<date>'`. |
| Gateway decisions | Table `audit`: `ts`, `decision`, `status`, `hold_eur`, `call_cost_eur`, `reason` | Refusals, holds and cancellations |
| Counters per card | Table `tasks`: `attempts`, `extra_attempts`, `budget_eur`, `spent_eur` | |
| The card's timeline | S3 bucket `aisoftwarefactory-sessions`, prefix `sessions/<task>/` | Session records, detector trips, check-in records, handovers, gate results, findings with their verdicts. The console shows it under the card's drawer, tab Activity. |
| Pull requests and issues | Forgejo, repository `sf/<project>` | Review comments, "needs a human" comments, human answers, approvals |
| CI runs | Forgejo Actions of the repository | Checks per head |
| The briefs | The issue bodies, and the worker's brief text in the session record | What the agent read |

The redesign adds records. The implementation chooses their names. Expect, per check-in: the moment, the statement code wrote, the tail's size in bytes, every tool call with its name, arguments, result size and duration, the decision, the evidence, the cost. Per finding: the verdict, confirmed, dropped or remark, with its evidence, and what the re-review and the human did with it. Per handover: the text and the session that read it. Per detector trip: the outcome. A record named here that does not exist is the first finding of the report.

## 3. The baseline

The numbers of 2026-10-15, from the redesign document, section 4. The validation compares against them.

| Measure | 2026-10-15 |
|---|---|
| Code cards in the batch | 5, plus 3 cards and 1 plan card of the documents feature |
| Cards that needed the human beyond the approval | 4 of 5, and #854 twice |
| Sessions that produced nothing | 3.70 EUR across #836, #837, #838, #839 and #851 |
| Share of spend on the check-in roles | 8 % |
| Review findings that were false | #836: 1 of 1, three times. #838: 1 of 2, four times. #854: 7 of 8. |
| Prompt tokens per coding call | 35,000 to 80,000, at the end of #854's session 1 about 138,000 |
| Prompt tokens per supervisor call | 9,000 to 16,000 |
| Prompt tokens per review call | 6,000 to 10,500 |
| Starved sessions | 3: two on #839, one on #854 |
| Refused attempts that counted | 2: one on #839, one on #854 |

## 4. The questions

Each question names how to answer it and what a good and a bad answer look like.

### 4.1 Did the cards heal without a human?

Per card: sessions run, sessions that produced nothing, EUR spent, EUR of sessions that produced nothing, human steps beyond the approval and their source, minutes from filing to merge.

Good: human steps beyond the approval only for spend, goal conflict, policy class or access. Bad: a human step whose answer names a fact a tool held, or a fix the check-in could have named.

For every human step, read the question the card asked and the answer. Classify the answer: a decision only a human could take, a fact a tool held, a fix a check-in should have found, a correction of a check-in's verdict, or a look at the screen of a UI card. The last is expected until the lab gate beside the ladder exists. Count it apart, so the ladder's own record stays readable.

### 4.2 Did the check-in run at the right moments, and what did it decide?

Count check-ins per moment: in session, dead session, gate return. Count decisions per moment: continue, message, end with a handover, confirm, drop, remark, human.

Good: the gate moment runs on every gate return, and a human decision carries a typed reason. Bad: a moment that never ran, a trip without a check-in, or a check-in that ran on a card with nothing wrong.

Sample: ten check-ins per moment, read in full.

### 4.3 Were the verdicts right?

For every dropped finding: does its evidence check out when you repeat it now, file and line at the commit, or command and output? Did the re-review raise it again? Did a human reverse it?

For every confirmed finding: did the next session fix it, dispute it, or leave it open? Was a confirmed finding dropped on a later round, which means the first confirmation was wrong?

For every remark: was it an opinion, or a defect that should have been confirmed?

Good: drops hold when repeated, confirmations get fixed in one session. Bad: a drop reversed by a human, a confirmation that the next session disputed and a later check-in dropped.

### 4.4 Did the check-in have too little context, or too much?

Signs of too little, per check-in record:

- It asked a human for a fact a tool holds.
- It decided `continue`, and the same detector tripped again within ten minutes with no change.
- It confirmed or dropped without opening the file or running the command its evidence names.
- A tool call failed, and the decision went ahead without the result.

Signs of too much:

- The decision cites only the statement, never the tail or a tool result. Measure: for ten records, mark which inputs the reasoning or the evidence refers to.
- The tail is large, but the decision could be taken from the statement and one tool call.
- Tool results were cut at a size limit.

Report: statement size, tail size and tool-result bytes per check-in, as a distribution, and which inputs the decisions used.

### 4.5 Did the check-in use its tools, and do the tools have the right grain?

Per check-in: the sequence of tool calls, with names, arguments and result sizes.

Too fine: the same tool called five times or more with adjacent arguments, for example reading a transcript in small ranges, or grepping one name at a time. Too coarse: results over 32 KiB, results cut, or a call that returned far more than the decision used. Missing: a question the check-in could not answer with any tool, visible as a guess in its reasoning or a human question.

Report the ten most called tool sequences, the tools never called, and the tool calls with the largest results.

### 4.6 Did the next session use the handover?

For every handover: did the next session's first actions follow "what to do first"? Did it repeat anything under "do not repeat"? Did it open the earlier transcript files, and if so, by search or by reading whole files? Did it dispute a finding the handover called confirmed?

Good: the first actions follow the handover, and nothing in "do not repeat" recurs. Bad: the session re-derives what the handover said, or reads the whole transcript file.

### 4.7 Did the coding agent use the facts and the report?

- Did sessions push before a budget refusal? Count sessions that ended on a refusal, against the baseline of three starved and one refused.
- Did the agent change behaviour after a budget warning? Read the record around each warning.
- Did it use the blocking wait tool, or still poll with `sleep`? Count both.
- Did it write the report per finding? For each report: were disputes confirmed or dropped by the check-in? A high share of disputes the check-in confirmed means the agent disputes too freely.
- Did any session try a thing the sandbox cannot do, such as installing a browser?

### 4.8 Did the review improve?

Per review: findings, and for each its verdict by the check-in. The false-finding rate against the baseline. How many absence claims the grep stopped before they counted. How many findings on a diff in parts named code in another part. After a drop record, how often the re-review approved, and how often it raised a dropped finding again.

### 4.9 Are the deterministic counters zero?

| Counter | Should be |
|---|---|
| Starved sessions, a session with no model answer | 0 |
| Refused attempts that counted against the cap | 0 |
| Fund answers that reached no session | 0 |
| Stale questions on a card waiting on a dependency with a live workflow | 0 |
| Plan cards that failed on time with no second session | 0 |
| Sessions that obeyed an older answer over a newer request for changes | 0 |
| Approval cards offering Approve on red checks | 0 |
| `concerns` verdicts without findings that started a session | 0 |
| Session records that say `no_push` after the worker pushed | 0 |

For each counter above zero, name the card and the record.

### 4.10 What did it cost?

Per card: spend by role, coding, check-in, review, audit. Per check-in: cost, prompt tokens, number of calls. The whole batch against the baseline: EUR of sessions that produced nothing, share of spend on check-in roles, prompt tokens per coding call. The five most expensive check-ins and why. The plan's estimate is about 0.1 EUR per check-in.

## 5. Method

1. List the batch's cards from `tasks` and `events` by date.
2. For every card, dump its events and its ledger rows to files. Do not paste them into the conversation. Grep the files.
3. For every card, read the timeline under `sessions/<task>/`. List the check-in records, the handovers, the findings with their verdicts, the detector trips.
4. Answer 4.9 first, from the counters. They are cheap and they show whether the code changes are live.
5. Answer 4.1 and 4.10 from the ledger and the events.
6. Sample for 4.2 to 4.8 as each question says. Read each sampled record whole.
7. Repeat the evidence of every drop you report. A drop whose evidence you cannot repeat is a finding.
8. Write the facts file as you go, not at the end.

A query that starts most of the work, the spend per role per card for a date:

```sql
select task_id,
       case when ref like 'review/%' then 'review'
            when ref like 'audit/%' then 'audit'
            when ref like 'checkin/%' then 'checkin'
            when ref like 'supervisor/%' then 'supervisor'
            else 'coding' end as role,
       count(*) calls, sum(prompt_tokens) prompt, sum(output_tokens) output,
       round(sum(eur)::numeric, 3) eur
from ledger
where created_at::date = '<date>'
group by 1, 2 order by 1, 2;
```

Replace `checkin/%` with the ref the implementation chose.

## 6. Signs and what they point to

| Sign | Likely cause | Refinement to propose |
|---|---|---|
| A check-in decides with no tool call, and the decision was wrong | The statement invites a guess, or the tools are not named in it | Name the tools in the statement, or require one tool call before a verdict |
| The same tool called many times with adjacent arguments | Tool too fine | A wider window, or a search that returns context |
| Tool results cut at a limit | Tool too coarse | Split the tool, or return a summary with a pointer |
| A human question that a tool could have answered | Missing tool, or the typed reasons are too wide | Add the tool, narrow the reason |
| `continue` followed by the same trip within ten minutes | Too little sight, or too weak an action | Add the gate results or the facts to the statement, or allow end with a handover at that trip |
| A drop reversed by the re-review or a human | Evidence rule too loose | Require the evidence to name a commit, and show it on the approval card |
| A confirmation the next session disputed and a later check-in dropped | The check-in anchored on the review | Give the check-in the agent's report before the review's findings, or require a tool call per confirmation |
| "Do not repeat" repeated by the next session | Handover not read first, or too long | Check the brief's order, shorten the handover |
| The next session reads whole transcript files | The handover is too thin, or search is missing | Add what the session looked for to the handover |
| Check-in cost far above 0.1 EUR | Tail too large, or too many tool calls | Cap the tail, cap the calls |
| Disputes the check-in mostly confirms | The agent disputes too freely | Ask for evidence in the report |
| Sessions still ending on a budget refusal | Warning too late or not read | Earlier warning, or the spend-without-push detector sooner |
| Coding calls still above 100,000 prompt tokens | The context detector is not live or its threshold is too high | Lower the threshold, or compaction |

## 7. The report

The facts file holds, in this order:

1. The run: the batch, its cards, the dates, the models by rung.
2. Where the data lives, as in section 2, with the names the implementation chose.
3. The counters of 4.9.
4. The outcomes of 4.1 and the cost of 4.10, each as a table against the baseline.
5. The check-in: 4.2 to 4.6, with the sampled records named.
6. The coding agent and the review: 4.7 and 4.8.
7. Interpretations, marked as such.
8. Refinements, ranked by EUR saved per batch and human steps saved per batch, each with the sign that points to it and the records that show the sign.
9. What was not verified, and why.
