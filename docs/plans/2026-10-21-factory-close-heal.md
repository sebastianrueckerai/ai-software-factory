# Factory closes that finish: one close function, a confirmed intent, a heal

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An issue the factory decided to close ends closed, even when Forgejo fails between the decision and the close.

**Architecture:** Every factory close of an issue goes through one function, `closeIssueAsFactory`. It writes the existing `factory_closed` intake row first, now carrying the comment, then posts the comment, closes the issue and confirms the row. The heal pass finishes every row left unconfirmed. The cleared-alert pass also judges its alert and ends its card in one transaction, so no half-written close remains on the database side either.

**Tech Stack:** Go 1.25, Postgres (gateway schema migrations), the Forgejo client in `internal/factoryd/forgejo.go`.

**Spec:** this plan. The gap was named in the needs-you round (docs/plans/2026-10-20-needs-you-cards.md, its ledger's ruling on CloseCleared): a Forgejo or database failure after a factory close leaves the card's issue open, and every factory close shares that order.

## The gap today

Ten places close an issue as the factory. Nine write the `factory_closed` intake row (`recordFactoryClose`, internal/factoryd/escalation.go:127) before `CloseIssue`, so the issue-closed webhook knows the close is the factory's own and ends the card. When `CloseIssue` fails, the caller returns the error, and nothing retries it later. The issue stays open, and depending on the site the card stays open too, or is already final.

| site | file:line | card state when the close runs |
|---|---|---|
| CloseNotReproduced | activities.go:1178 | open; the webhook ends it |
| closeTaskIssue | activities.go:2321 | open; the webhook ends it |
| replace a failed card | deps.go:415 | final (failed) |
| stall card close | chainpoll.go:1156 | open; the webhook ends it |
| config rejection healed | policy.go:805 | the card transitions after the close |
| re-run card close | mainfix.go:176 | open; the webhook ends it |
| failed-roll card close | rolltask.go:613 | open; the webhook ends it |
| template update replaced | templateupdate.go:259 | final (failed) |
| template update closed | templateupdate.go:415 | writes no intent row at all |
| cleared alert | signozwebhook.go:582 | final (closed) before the close |

The heal pass already reads every open issue each minute (`ResyncIssues`, intake.go:733), but it does nothing for an issue whose card the factory meant to close.

## Global Constraints

- `go test -race -p 1 ./...` with the PG tests green; `gofmt -l .` empty; `go vet ./...` and gosec clean.
- One way: after this plan no code outside `closeIssueAsFactory` calls `Forgejo.CloseIssue` for a card's issue. `grep -n "CloseIssue(" internal/factoryd/*.go` outside tests shows only the function and the heal.
- A confirmed close is final history: the heal never touches a confirmed row, so an issue a person reopens after the factory's close stays open.
- Existing `factory_closed` rows count as confirmed when the migration runs. History is not replayed.
- Comments only for what code cannot say; no change narration. Tests derive expected values by hand.

## Review Focus

1. A person reopens an issue after the factory's confirmed close: the heal never closes it again (Task 3).
2. The comment posted and the close failed: the heal closes without a second comment (Task 3).
3. The intent written and the comment failed: the heal posts the comment once, then closes (Task 3).
4. A person closed the issue before the heal ran: the heal confirms the row and posts nothing (Task 3).
5. The heal and an in-flight close overlap: rows younger than two minutes wait, and a second `CloseIssue` on a closed issue is harmless (Task 3).

---

### Task 1: The intent row carries its comment and a confirmation

**Files:**
- Create: `internal/schema/migrations/gateway/20261021090000_factory_close_confirmed.sql`
- Modify: `internal/factoryd/store.go` (the intake insert keeps `Body`; a confirm method), `internal/factoryd/store.go`'s `Store` interface
- Test: the PG store tests beside `TestPGStoreIntakeWithdraws` in `internal/factoryd/store_test.go`

**Interfaces:**
- Produces:
  - column `intake_events.confirmed_at timestamptz NULL`. The migration sets `confirmed_at = created_at` for every existing row of kind `factory_closed`.
  - `func (s *PGStore) ConfirmFactoryClose(ctx context.Context, id int64) error`: sets `confirmed_at = now()` where the row is kind `factory_closed` and still unconfirmed. An already confirmed or missing row is a no-op.
  - `func (s *PGStore) UnconfirmedFactoryCloses(ctx context.Context, olderThan time.Duration, limit int) ([]IntakeEvent, error)`: unconfirmed `factory_closed` rows created more than `olderThan` ago, oldest first.

- [ ] **Step 1: Write the failing PG test** `TestFactoryCloseConfirmation`. An inserted `factory_closed` row is listed by `UnconfirmedFactoryCloses(ctx, 0, 10)`. After `ConfirmFactoryClose` it is not, and a second confirm returns nil. A row created now is not listed with `olderThan` 2 minutes.
- [ ] **Step 2: Run** the test against a throwaway Postgres 17 (as the needs-you round did: `docker run -d --rm --name <name> -e POSTGRES_HOST_AUTH_METHOD=trust -p 127.0.0.1::5432 postgres:17`, never another session's container or port). Expected: FAIL.
- [ ] **Step 3: Implement** the migration and the two methods. Check how the gateway migrations are applied and named in `internal/schema` and follow that.
- [ ] **Step 4: Run** the test, then `go test -race -p 1 ./internal/factoryd/ ./internal/schema/...` with the PG tests. Expected: PASS.
- [ ] **Step 5: Commit** `a factory close's intent carries its comment and waits for its confirmation`.

### Task 2: One function closes an issue as the factory

**Files:**
- Modify: `internal/factoryd/escalation.go` (beside `recordFactoryClose`)
- Modify: the ten sites in the table above
- Test: `internal/factoryd/escalation_test.go` (or the file that tests `recordFactoryClose`), and each site's existing close test

**Interfaces:**
- Consumes: `ConfirmFactoryClose` (Task 1).
- Produces: `func closeIssueAsFactory(ctx context.Context, store interface{ InsertIntakeEvent(context.Context, IntakeEvent) (int64, error); ConfirmFactoryClose(context.Context, int64) error }, forgejo *Forgejo, t Task, comment string) error`. In order:
  1. Insert the `factory_closed` row with `CommentID: t.IssueNumber` and `Body: comment`. `ON CONFLICT DO NOTHING` returns id 0 for an existing row. Then post nothing new and only retry the close, so a second call stays idempotent, as `recordFactoryClose`'s `first` is today.
  2. When the row is new and `comment != ""`, post the comment.
  3. Call `CloseIssue`.
  4. Confirm the row.
  An error at any step returns, and the row stays unconfirmed for the heal. `recordFactoryClose` goes, with its callers moved to the new function.
- Each site keeps its own state changes in its own order. Only its comment, record and close collapse into the one call. `deps.go`'s check for an existing bot comment becomes unnecessary, because the function posts only on the first write. `closeTaskIssue`'s close-then-comment order becomes comment-then-close.

- [ ] **Step 1: Write the failing tests.** `TestCloseIssueAsFactory` with a stub Forgejo:
  - (a) A fresh call posts the comment once, closes, and confirms the row.
  - (b) A failing close returns the error and leaves the row unconfirmed. A second call posts no second comment, closes and confirms.
  - (c) An empty comment posts nothing.
  - Then `TestTemplateUpdateCloseRecordsItsIntent`: the template-update close at templateupdate.go:415 now writes the intent row.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the function and move all ten sites. `grep -n "CloseIssue(\|recordFactoryClose(" internal/factoryd/*.go` outside tests finds only the function.
- [ ] **Step 4: Run** `go test -race -p 1 ./...` with the PG tests. Expected: every package ok. Each site's existing close test passes unchanged, except where it asserted the old comment order.
- [ ] **Step 5: Commit** `one function closes an issue as the factory, and confirms the close`.

### Task 3: The heal finishes an unconfirmed close

**Files:**
- Modify: `internal/factoryd/temporal.go` (`HealPass`), `internal/factoryd/intake.go` (the heal step on `Intake`)
- Test: `internal/factoryd/heal_test.go` or the file that tests `HealPass`

**Interfaces:**
- Consumes: `UnconfirmedFactoryCloses` and `ConfirmFactoryClose` (Task 1), the Forgejo client's `IssueClosed` (forgejo.go:1482), `ListIssueComments`, `CreateIssueComment` and `CloseIssue`.
- Produces: `func (in *Intake) HealFactoryCloses(ctx context.Context) error`, called from `HealPass` after `ResyncIssues`. For each row older than 2 minutes, at most 50 a pass:
  1. Read the row's task for its repository. A missing task confirms the row.
  2. If the issue is closed, confirm the row and post nothing.
  3. If the row has a Body and the issue has no comment by `BotUser` with exactly that body, post it.
  4. Close the issue and confirm the row.
  Errors join, and the pass goes on to the next row.

- [ ] **Step 1: Write the failing tests**, one per Review Focus line 1-5:
  - `TestHealLeavesAConfirmedClose`: a reopened issue with a confirmed row gets no Forgejo write.
  - `TestHealClosesWithoutASecondComment`: the bot comment exists, the issue is open. One close, no comment, the row confirmed.
  - `TestHealPostsAMissingCommentOnce`: no bot comment, the issue is open. One comment with the Body, one close, confirmed.
  - `TestHealConfirmsAnIssueAPersonClosed`: the issue is closed. No write, confirmed.
  - `TestHealWaitsForAYoungRow`: a row 30 s old gets no Forgejo call.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** and wire into `HealPass`.
- [ ] **Step 4: Run** `go test -race -p 1 ./...` with the PG tests. Expected: every package ok.
- [ ] **Step 5: Commit** `the heal pass finishes a factory close Forgejo did not take`.

### Task 4: The cleared-alert pass judges and ends in one transaction

**Files:**
- Modify: `internal/factoryd/signozwebhook.go` (`CloseCleared`, around 507-590), `internal/factoryd/alerts.go` (the store method), the `AlertBook` interface
- Test: `internal/factoryd/signozwebhook_test.go`, a PG test beside the alert store tests

**Interfaces:**
- Produces: `func (s *PGStore) CloseClearedCard(ctx context.Context, alertID int64, taskID string) error`. In one transaction it sets the alert's verdict `unjudged`, `resolved_by` "factoryd", `resolved_at` now and detail `{"closed": "cleared"}` where the verdict is still null, and moves the task from `waiting-human` to `closed`. If either update touches no row, it rolls back and returns `ErrNotFound`.
- `CloseCleared` calls it in place of `ResolveAlert` plus `TransitionTask`, treats `ErrNotFound` as a quiet skip, then runs `countOutcome`, `mirrorTaskState` and `taskEnded`, and closes through `closeIssueAsFactory` with its existing comment.

- [ ] **Step 1: Write the failing tests.**
  - PG `TestCloseClearedCardIsOneStep`: a task already `done` leaves the alert unjudged and returns `ErrNotFound`. An alert already judged leaves the task waiting and returns `ErrNotFound`. Both fresh: both change.
  - `TestAClearedAlertWhoseCloseFailsIsHealed`: the Forgejo close fails. The card is closed, the row is judged, the intent row stays unconfirmed. A heal pass two minutes later closes the issue.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `go test -race -p 1 ./...` with the PG tests. Expected: every package ok.
- [ ] **Step 5: Commit** `a cleared alert's verdict and its card's end are one write`.

### Task 5: Land

- [ ] **Step 1:** Full race suite with the PG tests, `gofmt`, `go vet`, gosec, on a merge with the newest `origin/main`. Push `origin` and `github` main.
- [ ] **Step 2:** The roll waits for Sebastian's approval. After it is live, the factoryd log shows the heal step and no errors from it.
- [ ] **Step 3:** One audit, read only: list the final cards whose issue is open and whose `factory_closed` row predates the migration. Report the list to Sebastian; close nothing by hand without his word, since a person may have reopened them on purpose.
- [ ] **Step 4:** Docs: `docs/architecture.md` gains one paragraph beside the human-lane close rules: a factory close records its intent with its comment, closes, confirms, and the heal pass finishes an unconfirmed one; a reopened issue after a confirmed close is left alone. The build ledger gets the round's entry.
