# Plans carry a short telling name; the verdict survey leaves the cards

Written 2026-11-02. Status: built on code main the same day as 993192f8, merging 27836969 (the column and its reads), 0601b648 (the namer), 6aec3d43 (filing and the startup sweep), 4a8d944a (the chip, the approval header, the drawer row and the find box), 85fd3ac0 (the verdict survey's exit), 798c5947 (the lab), 51bb02f8 and bce2feec (naming off the filing's path, the slug's 3-rune floor, the sweep's dead context, the plan's own repository in its link, the migration stamp). The build departs from the text below in seven points. The model answers JSON `{"name": ...}`, because the supervisor's chat forces a JSON response. Naming runs in a goroutine with its own 2-minute bound, because the file_plan tool waits only 30 s. The sweep names only plans with a stored revision. The plan's compact Done row carries the chip too. The drawer's Overview row replaces the collapsed plan section on a child card. `plan:` digits also match the plan's own card. The human intervention count leaves out the agent's own verdicts. The design entries are C40 and C41. Roll #1469 put it live at 09:23 UTC. The live check found the gateway refusing every naming call, because the policy gave the `title` purpose the small model on a chat task only, so every name came out as the title slug. 70725856 gives `title` the small model on every task, and the Namer reads its model from the same function as the gateway. The seven plans named at the roll keep their slugs: their tasks had ended, and the gateway reserves budget only for a running task or one in review.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every plan gets a short, telling name, unique among the project's open plans, shown wherever a card already names its plan, so the board reads at a glance which cards belong together; and the "Was this escalation a real problem?" survey disappears from every human surface while the project agent's judgment path stays.

**Architecture:** The name is a column on the plan's task row, written once when the planner files the plan's first revision. A `Namer`, built on the BriefWriter's exact seam (one small-class model call through the gateway, purpose `title`), proposes; code normalizes, validates, shrinks, checks uniqueness against the project's open plans and falls back to a deterministic slug, so naming can never fail, block or retry a filing. A startup sweep names the open plans this build inherits. The console carries the name in the surfaces that already speak the plan: the child card's plan chip, the plan approval header, the parent card's face, the drawer's Overview, the find box. The verdict survey (the layout's form pair, the board face's ask, the drawer's ask, the POST route and its guard) goes entirely; the agent chat tool `alerts` verdict action, the store seam, the event, the telemetry and the machine verdict paths stay untouched.

**Tech Stack:** Go 1.25, Postgres migrations, Go templates, the existing fakes in `internal/factoryd` and `internal/console` tests.

**Spec:** Sebastian's directives of 2026-11-02: plans get "telling unique short names in addition to numbers… on a bullet on their card", made by "a small tool model", shrunk when long, checked against other still-active plans, a number suffix only as an escape hatch that "can never fail"; and the "is this a real issue" field on needs-you cards goes "entirely". The plan model is [docs/spec-driven.md](../spec-driven.md); the chip and find grammar is C13, the verdict placement being amended is C24 ([design/design-decisions.md](../../design/design-decisions.md)); the alert verdict model is [docs/target-architecture.md](../target-architecture.md) section on alerts.

## Global Constraints

- `go test -race ./...` green, `gofmt -l` empty, `go vet ./...` and `gosec` clean before every commit. The PG tests run where the suite runs them today.
- The name, after normalization: 3 to 24 runes, one line, no control characters, no leading or trailing space. Unique case-insensitively among the project's open plans (plan-track tasks with no `plan_closed` event). A number suffix is code's last resort, never asked of the model.
- Naming never blocks or fails a filing: every model error, refusal or bad answer ends in the deterministic slug. No marks, no retry loop, no event on failure — a name is cosmetic.
- One way for verdicts: no human surface asks or accepts an escalation verdict (card face, drawer, route, access entry). The project agent's chat tool stays the one judgment path; machine verdict paths (screening, supervisor, task outcome) are untouched.
- Old `alert_verdict` event rows still render on activity lines; no migration touches them.
- Comments: only what code cannot say. Tests derive their expected values by hand.
- Each task is one commit on the worktree branch, one line in the repository's voice. No ledger paths or ruling numbers in tracked files or commit messages (the pre-commit hook refuses them).
- Line numbers are main of the code repository at 2026-11-02; re-grep before editing, they drift.

## Review Focus

1. The gateway is down when the planner files: the plan files anyway, named by the slug (Task 3's test drives FilePlan against a failing model fake).
2. The model keeps proposing taken or over-long names: three bounded attempts, then the slug with a suffix — the loop always ends (Task 2).
3. A card whose plan has no name (a plan closed before this build, or the slug yet to run): the chip reads `from plan #558` with no dangling separator, and the PlanKey-only branch still renders (Task 4).
4. `plan:` find with digits: a numeric value matches the issue number exactly, a word matches the name's substring; a name that contains digits never widens a numeric query (Task 4).
5. The route is gone but the history is not: `POST /alerts/{id}/verdict` answers 404 with its guard entry removed, and an old `alert_verdict` event still renders on the activity line (Task 5).

---

### Task 1: The plan-name column and its store seams

**Files:**
- Create: `internal/schema/migrations/factoryd/20261102100000_plan_name.sql` (next free timestamp; check for collisions)
- Modify: `internal/factoryd/store.go` (the `Task` struct near `PlanKey` at ~107; every task column list and scan that names `plan_key` — grep them all)
- Test: `internal/factoryd/store_test.go`

**Interfaces:**
- Produces: `Task.PlanName string`; `PGStore.SetPlanName(ctx context.Context, id, name string) error`; `PGStore.OpenPlanNames(ctx context.Context, projectID, excludeID string) ([]string, error)` — the non-empty names of the project's plan-track tasks without a `plan_closed` event, minus `excludeID`; `PGStore.UnnamedOpenPlans(ctx context.Context) ([]Task, error)` — every plan-track task without a `plan_closed` event whose `plan_name` is empty, oldest first. Reuse the `plan_closed` read the groups use (`PGStore.PlanClosed`, `internal/factoryd/groups.go:39-43`).

- [ ] **Step 1: Write the failing tests** in `store_test.go`: `TestSetPlanNameRoundTrip` (set, read back through `Task`); `TestOpenPlanNamesExcludesClosedOtherProjectsAndSelf` (a named open plan of the project is listed; one with a `plan_closed` event is not; another project's is not; the excluded id is not); `TestUnnamedOpenPlansListsOnlyNamelessOpenPlans` (a nameless open plan is listed, a named one and a closed one are not).
- [ ] **Step 2: Run** `go test ./internal/factoryd/ -run 'TestSetPlanName|TestOpenPlanNames|TestUnnamedOpenPlans' -v` → FAIL (no column, no methods).
- [ ] **Step 3: Implement** the migration (`ALTER TABLE tasks ADD COLUMN plan_name TEXT;`), the struct field, the column lists and scans, and the three methods. `OpenPlanNames` and `UnnamedOpenPlans` select plan-track tasks (`track = 'plan'`) of the scope, then filter by the `plan_closed` event read — no new SQL inference of plan closure.
- [ ] **Step 4: Run** the same command → PASS. Then `go test -race ./internal/factoryd/` → PASS.
- [ ] **Step 5: Commit** `plans gain a name column, read for the project's open plans`.

### Task 2: The namer

**Files:**
- Create: `internal/factoryd/namer.go`
- Test: `internal/factoryd/namer_test.go`

**Interfaces:**
- Consumes: Task 1's store methods.
- Produces: `type Namer struct { Store NameStore; Model *SupervisorModel; Current func() policy.Version }` with `NameStore` declaring `OpenPlanNames` and `SetPlanName`; `func (n *Namer) Name(ctx context.Context, t Task, title, outcome, summary string) string` — proposes, validates, persists, returns the name (the slug on every failure); `func normalizePlanName(s string) (string, bool)`; `func planSlug(title string, taken []string) string`.

- [ ] **Step 1: Write the failing tests** in `namer_test.go`, driving the model through the existing gateway fake's construction (grep `fakeLiteLLM` for the pattern):
  - `TestNamePlanTakesTheFirstValidAnswer`: one call answers `"fix prod latency"`, the stored name is exactly that.
  - `TestNamePlanShrinksALongAnswer`: call 1 answers 40 characters; the second request's body contains `Shorter`; call 2 answers `"fix prod latency"`.
  - `TestNamePlanRetriesATakenName`: an open plan holds `"quota guard"`; call 1 proposes it; the second request's body lists it as taken; call 2 proposes `"quota lift"`, stored.
  - `TestNamePlanFallsBackToTheSlug`: three answers of `"way too long to be a plan name at all"` — the stored name is the slug of the title (`"fix-the-check"` for title `Fix the check!`, say).
  - `TestNamePlanSlugEscapesCollisions`: the slug collides with an open name; the stored name ends `-2`.
  - `TestNamePlanSurvivesAGatewayError`: the fake answers 500 thrice — the slug is stored, no error escapes.
  - `TestNormalizePlanName`: `"  fix   prod latency "` normalizes to `"fix prod latency"` (true); 25 runes false; a name with `\n` false; 2 runes false; exactly 24 runes true.
- [ ] **Step 2: Run** `go test ./internal/factoryd/ -run 'TestNamePlan|TestNormalizePlanName' -v` → FAIL (no namer).
- [ ] **Step 3: Implement `namer.go`** on the BriefWriter's exact pattern (`internal/factoryd/brief.go:104-154`): alias from `Current().Document.FactoryModel(t.RequiredCapabilities, policy.PurposeTitle)`, timeout `Current().Document.Limits.SupervisorTimeout`, one `Model.Chat` per attempt, at most 3 attempts. The system prompt, fixed copy: `You name build plans. Answer with the plan's name only: short plain words that say what the plan does, fixes or enables, at most 24 characters, one line, no quotes, no trailing period.` The user message carries the issue title, the spec outcome and the summary, each truncated at 600 bytes (`textutil.Truncate`); from attempt 2 it adds `Shorter: at most 24 characters.`; when open names exist it adds `Already taken by other open plans: ` joined with `, `. `planSlug` lowercases, turns runs of non-alphanumerics into one `-`, trims `-`, cuts at a word boundary within 24 runes, and while the result case-insensitively equals a taken name appends `-2`, `-3`, … bounded by `len(taken)+2` iterations; an empty result is `"plan"`.
- [ ] **Step 4: Run** the same command → PASS; `go test -race ./internal/factoryd/` → PASS.
- [ ] **Step 5: Commit** `the namer: a small model proposes, code shrinks, checks and falls back to the slug`.

### Task 3: Filing names the plan; the sweep names the open ones

**Files:**
- Modify: `internal/factoryd/plan.go` (`FilePlan` at ~2445-2530, after the `AddPlanRevision` call at ~2519)
- Modify: `internal/factoryd/runner.go` (the `Runner` struct: a `Namer *Namer` field)
- Modify: `cmd/factoryd/main.go` (construct the `Namer` beside the `BriefWriter` wiring at ~694, hand it to the `Runner`, and call the sweep once at startup beside the existing heal)
- Test: `internal/factoryd/plan_test.go` (extend the `FilePlan` test), `internal/factoryd/namer_test.go`

**Interfaces:**
- Consumes: Tasks 1 and 2.
- Produces: `func (n *Namer) NameOpenPlans(ctx context.Context) int` — names every task of `UnnamedOpenPlans` via `Name`, logs the count, returns it; a store error logs and stops the sweep (the next start retries).

- [ ] **Step 1: Write the failing tests**: in `plan_test.go`, extend the first-revision `FilePlan` test to assert the task's `PlanName` is set from the model fake's answer, and that filing a second revision on the same plan keeps the first name. In `namer_test.go`: `TestNameOpenPlansNamesSkipsAndIsIdempotent` (an open nameless plan is named; a named open plan and a closed plan are untouched; a second pass names nothing).
- [ ] **Step 2: Run** `go test ./internal/factoryd/ -run 'FilePlan|TestNameOpenPlans' -v` → FAIL.
- [ ] **Step 3: Implement**: in `FilePlan`, when the task's `PlanName` is empty and `r.Namer` is not nil, call `r.Namer.Name(ctx, t, title, p.Spec.Outcome, p.Summary)` after the revision is stored — before the cards file, so children render named from birth. In `main.go`, wire the `Namer` and run `NameOpenPlans` once under a 60-second context after the store is ready.
- [ ] **Step 4: Run** `go test -race ./internal/factoryd/ ./cmd/factoryd/` → PASS.
- [ ] **Step 5: Commit** `a plan is named when its first revision files, and the open ones at startup`.

### Task 4: The console carries the name

**Files:**
- Modify: `internal/factoryd/console_store.go` (the board's plan read — the seam behind `planIssue`, `internal/console/board.go:865-866` — carries the plan task's `plan_name`)
- Modify: `internal/console/ports.go` (the seam's interface, beside the plan reads)
- Modify: `internal/console/board.go` (the `card` struct at ~534-535; the fill at ~1972-1975; the find words at ~375-385; the `plan:` term at ~261 and ~430)
- Modify: `internal/console/templates/board.html` (the chip at 298; the approval header at 245)
- Modify: `internal/console/approvals.go` (the plan approval composition at ~249 carries the name)
- Modify: `internal/console/templates/drawer.html` (the Overview gains a `Plan` row for a plan's child card: `Plan #558 · fix prod latency`, the issue linked, in the neighbouring rows' grammar)
- Test: `internal/console/face_test.go`, `internal/console/plan_board_test.go`, `internal/console/screen_test.go`

**Interfaces:**
- Consumes: Tasks 1–3 (plans carry names; the fakes and lab data must set them).
- Produces: `card.PlanName string`; the chip `from plan #558 · fix prod latency` on a child; the parent plan card's chip `#558 · fix prod latency`; the approval header `Plan #558 · fix prod latency, revision 2`.

- [ ] **Step 1: Write the failing tests**: `face_test.go` — extend `TestPlanChildChipCarriesTheKey` (~214): a named plan renders `from plan #558 · fix prod latency` and no longer shows the `PlanKey` on the face; an unnamed plan renders `from plan #558` with no dangling `·`. `plan_board_test.go` — the approval header test asserts `Plan #558 · fix prod latency, revision 2`; the parent plan card's face carries the name chip. `screen_test.go` — `TestFindNarrowsTheColumns` gains a case: `plan:latency` narrows to the plan's cards, `plan:558` matches the number exactly and never a name that merely contains `558`.
- [ ] **Step 2: Run** `go test ./internal/console/ -run 'TestPlanChildChip|TestFindNarrows|Plan' -v` → FAIL.
- [ ] **Step 3: Implement**: carry `plan_name` through the board's plan read into `card.PlanName`; the chip template shows the name in the `PlanKey` slot (`{{with .PlanName}} · {{.}}{{end}}`); the parent plan card gains the name chip when it is the plan (`InPlan`, `internal/factoryd/groups.go:19-23`); the approval input carries the name into the header; the find words append the name (plain-word find already matches the face once the chip carries it); the `plan:` term matches the issue number exactly when the value is all digits, else a case-insensitive substring of the name.
- [ ] **Step 4: Run** `go test -race ./internal/console/` → PASS.
- [ ] **Step 5: Commit** `the plan chip, the approval header and the find box speak the plan's name`.

### Task 5: The human verdict survey leaves the cards

**Files:**
- Modify: `internal/console/templates/layout.html:35-36` (delete the `verdict` form pair)
- Modify: `internal/console/templates/board.html:155-156` (delete the ask and its template call)
- Modify: `internal/console/templates/drawer.html:19` (delete the ask and its template call)
- Modify: `internal/console/board.go` (the `verdictForm` template func at 108 and struct at 135-140; the `Approver` flag at 1042-1051 and 2338-2341 — grep its uses, remove it if the verdict was its only reader)
- Modify: `internal/console/console.go:535` (the route) and `internal/console/alerts.go:14-32` (the handler; the file goes if nothing else lives in it)
- Modify: `internal/console/access.go:134` (the route guard) and `:169` (the `alert_verdict` action label, if only the route used it)
- Keep untouched: `internal/console/chat_page_tools.go:412-445` (the agent tool's action), `internal/console/chat_tools.go:586-598, 1359-1367` (the tool and its confirm hook), `internal/console/ports.go:93-102`, `internal/factoryd/alerts.go:268-276`, `internal/factoryd/analytics.go:24`, `internal/factoryd/event_store.go:36`, the event formatter at `board.go:2043-2055`, `internal/factoryd/meters.go`, `EscalationsHandled`, and every `internal/policy/policy.go` list entry (they govern the agent's tool).
- Modify: `docs/manual/console.md:126-132` (the paragraph still describes an `/alerts` page that no route serves; write the reality: alerts surface as cards, escalation verdicts are the project agent's judgment), `docs/manual/operations.md:287-298, 330` (the verdict gauge's human reader goes; the agent path feeds it)
- Test: `internal/console/screen_test.go`, `internal/console/events_test.go`, `internal/console/members_test.go`, `internal/console/chat_pages_parity_test.go`, `internal/console/chat_test.go:1647`, `internal/console/console_test.go:928`, `internal/factoryd/console_store_test.go:601-607`, `internal/factoryd/store_test.go:2674`, `acceptance/costs_date_window_test.go:505`

- [ ] **Step 1: Write the failing test** `TestEscalatedCardAsksNoVerdict` in `screen_test.go`: an escalated needs-you card for an approver renders neither `Was this escalation a real problem` nor any form posting to `/alerts/`, on the face and in the drawer. Extend `TestOldVerdictEventsStillRender`: an `alert_verdict` event row still produces its activity line.
- [ ] **Step 2: Run** `go test ./internal/console/ -run 'TestEscalatedCardAsksNoVerdict|TestOldVerdictEventsStillRender' -v` → the first FAILs.
- [ ] **Step 3: Delete** the surfaces and the route as listed; adjust the listed tests to the removal (the verdict rig at `events_test.go:249-253` goes; the chat tool test keeps, against the agent path). `grep -rn "alerts/.*verdict\|Was this escalation" internal/` → only the agent tool's strings remain, none on a human surface.
- [ ] **Step 4: Run** `go test -race ./...` → PASS.
- [ ] **Step 5: Commit** `the verdict survey leaves the cards; the agent's judgment stays the one path`.

### Task 6: The lab, the pages' words, the entries

**Files:**
- Modify: `scripts/console-lab/` in the code repository (the scenario data's plan tasks carry `plan_name`; `check.js` asserts the named chip on a plan child and the parent, and drops any verdict-form assertion — check the needs-you selectors at `check.js:1134, 1256, 1451-1463`)
- Modify: `design/design-decisions.md` in the docs repository (two entries, below)
- Modify: `docs/target-architecture.md:288` and the alert-verdict row at `:435` (the escalation verdict's writers: the supervisor's action, the project agent's judgment, the task's outcome — the approver's click goes)
- Test: the lab's structural check

- [ ] **Step 1: Give the lab's plans names** in the scenario data, at least one plan with several cards across columns, one unnamed (closed) plan, and one approval card.
- [ ] **Step 2: Run** `scripts/console-lab/run.sh` → every page check green, shots taken at 1440 and 390 in both themes; the named chip and the header read in the shots (magnified crops of the chip region for the evidence).
- [ ] **Step 3: Write the entries**: C40 — every card names its plan: the child's chip `from plan #n · name`, the parent's `#n · name`, the approval header and the find box follow; the name is 3–24 runes, unique among open plans, model-proposed, code-enforced, slug-backed; provisional until Sebastian's pick against the lab shots. C41 — the verdict survey leaves the cards, amending C24's line that put the verdict buttons on the board's escalation card; the project agent's judgment stays.
- [ ] **Step 4: Commit** the code repository (`the lab's plans carry names`), then the docs repository (`design: C40 and C41, the plan's name and the verdict survey's exit`).
- [ ] **Step 5: Run** `go test -race ./...` once more on the branch head → PASS, and `grep -rn "verdictForm\|Was this escalation" internal/` → empty.
