# Chain run links use the forge's run number — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every chain-run number a human reads or clicks on the console is the forge's run number (`index_in_repo`, e.g. 2260), never the API's global run id (e.g. 3356).

**Architecture:** `chain_runs` keeps `run_id` as the API key the poller and the SQL predicates already speak, and gains `run_index`, written by the poller, backfilled once for existing rows, and projected into every console field that labels or links a run. The board's Go-side comparison `ChainGreen >= ChainRun` moves to indexes with its operands.

**Tech Stack:** Go, Postgres, embedded SQL migrations (`internal/schema`), Forgejo 17 actions API.

**Spec:** The investigation of 2026-11-01 (session with Sebastian): card "chain run 3356" links `/sf/ai-software-factory-code/actions/runs/3356`, Forgejo answers `run with index 2 3356: resource does not exist` (repo id 2, sought index 3356). The run exists: API id 3356, `index_in_repo` 2260. `chain_runs.run_id` stores `ActionRun.ID` ([chainpoll.go:900](/home/womb/repos/ai-software-factory-code/internal/factoryd/chainpoll.go#L900), [1031](/home/womb/repos/ai-software-factory-code/internal/factoryd/chainpoll.go#L1031)); the console formats it into the URL slot that takes the index ([board.go:1447](/home/womb/repos/ai-software-factory-code/internal/console/board.go#L1447), five call sites).

## Sweep verdict: where the same fault does and does not live

Checked every URL builder and every run-number consumer in the code repo:

| Place | Space used | Verdict |
|---|---|---|
| console board.go:1447 `runURL` (card link, chain drawer cover/carry/head/rerun) | `run_id` (API id) | **Broken — this plan fixes it** |
| board.go:1846-1856 `deployStage` labels ("chain run N", "run N red/stalled") | `run_id` | Wrong number shown; fixed by the projection switch |
| console_store.go:77,107-112,294-303 (`chainGreen`, `ChainRun`, `ChainFacts`) | `run_id` | Source of both faults above; `ChainGreen >= ChainRun` compares in Go, so both operands must switch together |
| chainpoll.go:1073-1074, 1430-1431 links | `run.Index` | Correct |
| chainpoll.go:1067,1072 findings labels "run N" | `run.ID`, next to a link that says otherwise | One number per run: switch label to `run.Index` |
| mainfix.go:291,367,384 | `run.Index` | Correct |
| rolltask.go:1256 | `run.Index` | Correct |
| activities.go:1997-2011 `jobLogOf` | consumes `target_url` Forgejo itself built | Correct |
| forgejo.go rerun/jobs APIs (641, 662, 677) | db ids | Correct — the API takes ids |
| Issue/pull URLs everywhere (`issues/%d`, `pulls/%d`) | `IssueNumber`/`PRNumber` | Correct |
| chainpoll.go:1377 alert payload `"run": run.ID` | id, lands in `alerts.detail` JSON, no human render of the number | Leave: machine data |
| scripts/console-lab/check.js:450,466 | expects href from the seeded run | Pins the old behavior; Task 5 updates it |
| chainpoll_test.go:1408 fake | `index_in_repo = id` | Camouflaged the bug; Task 2 makes them differ |

## Global Constraints

- `go test -race ./...` green before every commit.
- One way only: no link ever built from `run_id` again; no fallback path that renders the id when the index is missing (index 0 hides the link, as `run.Index > 0` already does in chainpoll).
- Reseed-safe: after a delete-and-reseed the poller writes indexes from its first pass; the backfill finds nothing and no-ops.
- Migration as one embedded SQL file, numbered like `20261030100003_chain_rerun.sql`, applied at boot by `internal/schema`.
- SQL predicates that compare `run_id` to `run_id` (`chainCovers`, `ChainHead`, the `ON CONFLICT ... WHERE run_id <` guards) keep `run_id`; only human-facing projection and labeling switch.
- No new dependency. Comments minimal, matching the file's density.

## Review Focus

1. **A newer run whose `index_in_repo` is 0 must not erase a known index** — the upsert's SET clause keeps the old value when the incoming index is 0. Test: Task 2, step 1.
2. **The Go comparison `bt.ChainGreen >= bt.ChainRun` must compare like with like** — both project `run_index` in one change; a mixed pair would mark cards covered too early (an id always outruns an index). Test: Task 4, step 1.
3. **Old rows between deploy and backfill** render no link, never a wrong link — index 0 hides the link. Test: Task 4, step 1 (a row with `run_index` 0).
4. **The backfill terminates when Forgejo no longer returns runs that old** (retention): stop once a page's oldest id falls below the oldest unmapped id; leftover rows stay 0 and are logged. Test: Task 3, step 1.
5. **Tests must not camouflage the fault again**: the fake Forgejo serves `index_in_repo` different from `id`. Test: Task 2, step 1.

---

### Task 1: Migration adds `chain_runs.run_index`

**Files:**
- Create: `internal/schema/migrations/factoryd/20261101190000_chain_run_index.sql`

**Interfaces:**
- Produces: column `chain_runs.run_index bigint NOT NULL DEFAULT 0`, applied at boot by the existing `schema.Migrate`.

- [ ] **Step 1: Write the migration**

```sql
ALTER TABLE chain_runs ADD COLUMN IF NOT EXISTS run_index bigint NOT NULL DEFAULT 0;
```

- [ ] **Step 2: Run the schema tests**

Run: `go test ./internal/schema/...`
Expected: PASS (naming and split rules hold for the new file).

- [ ] **Step 3: Commit**

`git add internal/schema/migrations/factoryd/20261101190000_chain_run_index.sql && git commit -m "chain_runs learns the forge's run number"`

### Task 2: The poller writes the index

**Files:**
- Modify: `internal/factoryd/chainpoll.go` — `RecordChainRun` (~149), `RecordChainHead` (~161), call sites ~900, ~1031, ~912, labels ~1067, ~1072
- Test: `internal/factoryd/chainpoll_test.go`

**Interfaces:**
- Produces: `RecordChainRun(ctx, repository string, pr int64, sha string, run, index int64, status string) error` and `RecordChainHead(ctx, repository, sha string, run, index int64, status string) error` — index is `ActionRun.Index`, 0 when Forgejo reports none.

- [ ] **Step 1: Write the failing tests**

In `chainpoll_test.go`: the fake at ~1408 sets `m["index_in_repo"] = id`; change it to a number distinct from `id` (e.g. `id - 1096`, so id 3356 carries index 2260). Then:
  - a `RecordChainRun` test asserting the row's `run_index` equals the passed index while `run_id` keeps the id;
  - an upsert test: an existing row with `run_index` 2260 re-recorded by a newer run whose index is 0 keeps 2260 and takes the new `run_id`;
  - same pair for `RecordChainHead`.

- [ ] **Step 2: Run to verify they fail**

Run: `go test ./internal/factoryd/ -run 'TestRecordChain' -v`
Expected: FAIL — unknown column `run_index` / signature mismatch.

- [ ] **Step 3: Implement**

Both upserts take `index` and write it, guarding the update path: `run_index = CASE WHEN $n > 0 THEN $n ELSE chain_runs.run_index END` (the existing `WHERE chain_runs.run_id < $4` / `<= $3` guards already keep older runs from unseating). Call sites pass `run.ID, run.Index`; the head site passes `newest.ID, newest.Index`. Labels at 1067 and 1072 print `run.Index`.

- [ ] **Step 4: Run the poller's tests**

Run: `go test ./internal/factoryd/ -run 'TestChain\|TestRecordChain' -v`
Expected: PASS.

- [ ] **Step 5: Commit**

`git add internal/factoryd/chainpoll.go internal/factoryd/chainpoll_test.go && git commit -m "the poller records each run's forge number beside its id"`

### Task 3: One-time backfill of existing rows

**Files:**
- Modify: `internal/factoryd/chainpoll.go` — start of `Run` (~459), plus new store methods
- Test: `internal/factoryd/chainpoll_test.go`

**Interfaces:**
- Consumes: `Forgejo.ActionRuns(ctx, token, owner, repo, url.Values)` with `event=push` (every stored id is a push-run id; both record sites walk main runs).
- Produces: `UnmappedChainRuns(ctx) (map[string][]int64, error)` — repository to unmapped `run_id`s; `SetChainRunIndex(ctx, repository string, runID, index int64) error`; `(p *ChainPoller) backfillRunIndexes(ctx) error` called once before the poll loop.

- [ ] **Step 1: Write the failing tests**

  - Seed rows with `run_id` only; the fake serves `event=push` pages of `ActionRun`s with distinct ids and indexes; after `backfillRunIndexes`, every row carries its index.
  - A second call makes no `ActionRuns` call and returns nil (count the fake's calls).
  - A seeded id older than anything the fake returns: the call returns, the row stays 0, no hang.

- [ ] **Step 2: Run to verify they fail**

Run: `go test ./internal/factoryd/ -run 'TestBackfill' -v`
Expected: FAIL — methods do not exist.

- [ ] **Step 3: Implement**

`backfillRunIndexes`: for each repository with unmapped ids, page `ActionRuns` (`event=push`, 50 per page) newest first, `SetChainRunIndex` for each match; stop a repository when its unmapped set empties or a page's oldest `id` falls below the set's minimum; log leftovers per repository.

- [ ] **Step 4: Run the tests**

Run: `go test ./internal/factoryd/ -run 'TestBackfill' -v`
Expected: PASS.

- [ ] **Step 5: Commit**

`git add internal/factoryd/chainpoll.go internal/factoryd/chainpoll_test.go && git commit -m "existing chain rows learn their forge numbers once, from the runs API"`

### Task 4: The console projects the index

**Files:**
- Modify: `internal/factoryd/console_store.go` — `chainGreen` const (~77), board query (~107-112), `ChainFacts` (~294-303), `ChainRun` comment (~33)
- Test: `internal/factoryd/console_store` tests or `internal/console/console_test.go`, `internal/console/approval_card_test.go`

**Interfaces:**
- Consumes: Task 1's column, Task 2's written values.
- Produces: `BoardTask.ChainRun` and `ChainGreen`, and `ChainFacts.CarryRun`/`HeadRun`/`GreenRun`, now holding `run_index` (names unchanged — they are "the run" a human sees). SQL predicates comparing `run_id` to `run_id` stay on `run_id`.

- [ ] **Step 1: Write the failing tests**

  - Store test: a row with `run_id` 3356 and `run_index` 2260 projects `ChainRun` 2260; `ChainFacts` returns `CarryRun`/`HeadRun`/`GreenRun` from `run_index`; a green row with `run_index` 2259 against it leaves the done-card comparison (`ChainGreen >= ChainRun`) false, true when green is 2260 — pinning like-with-like.
  - Store test: a row with `run_index` 0 projects 0 (the board already hides the link at `<= 0`).

- [ ] **Step 2: Run to verify they fail**

Run: `go test ./internal/factoryd/ -run 'TestBoard\|TestChainFacts' -v`
Expected: FAIL — projections still read `run_id`.

- [ ] **Step 3: Implement**

Swap the projected columns: `cr.run_index` for `b.ChainRun`, `max(green.run_index)` in `chainGreen`, `c.run_index`/`h.run_index`/`max(g.run_index)` in `ChainFacts`; leave `chainCovers`, the window predicates, and the `greenAt` ORDER BY on `run_id`. Update the `ChainRun` comment to say it is the forge's run number. `board.go` needs no change: `runURL`, `deployStage`, and the drawer read the field they always read.

- [ ] **Step 4: Run the console tests**

Run: `go test ./internal/console/ ./internal/factoryd/ -v`
Expected: PASS — the html expectations in `console_test.go` keep their numbers, which are now fixture indexes.

- [ ] **Step 5: Commit**

`git add internal/factoryd/console_store.go internal/factoryd/*_test.go internal/console/*_test.go && git commit -m "the board's run words and links speak the forge's run numbers"`

### Task 5: Lab check and the full gate

**Files:**
- Modify: `scripts/console-lab/check.js` (~450, ~466), the lab's seeded run (find it via `scripts/console-lab/run.sh`)

**Interfaces:**
- Consumes: the deployed console from Tasks 1-4.

- [ ] **Step 1: Make the lab prove the fix**

Ensure the lab's seeded chain run carries an `index_in_repo` different from its `run_id`; update the three href expectations in `check.js` to the index. If the lab seeds through the Go fake changed in Task 2, this is only the expectation edit.

- [ ] **Step 2: Run the lab**

Run: `scripts/console-lab/run.sh`
Expected: no `fails.push` from the run-word or carry-run checks.

- [ ] **Step 3: Run the full gate**

Run: `go test -race ./...`
Expected: PASS.

- [ ] **Step 4: Commit and land**

Commit, merge to `master`, push to `origin` and `github`; delete the worktree. Verify by hand once on the live console: the card from pool 1426 links `/sf/ai-software-factory-code/actions/runs/2260` and opens the run.
