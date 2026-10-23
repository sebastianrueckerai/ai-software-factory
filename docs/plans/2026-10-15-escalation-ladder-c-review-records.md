# Escalation ladder, group C: review claims, whole-diff review, anti-cheat, stale sweep, cancelled calls

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five changes that need no model: a grep check on "absent name" review findings, one review call over the whole diff, a deterministic anti-cheat check, a stale sweep that escalates only a dead workflow, and a cancelled gateway call priced from LiteLLM's spend log.

**Architecture:** The review's JSON answer gains a `claims` field (finding index, kind, symbol). `ModelReview` checks each claim with `git grep` at the PR head and at main, and moves a contradicted finding to `Review.Dropped` with file and line. The review diff limit becomes `limits.review_diff_kib` in policy. The anti-cheat check runs inside `GatePolicy` on the diff and its findings go through the `checks` stage's `on_findings` rule, as the queue's findings already do. The stale sweep asks Temporal whether the workflow runs. The gateway tags each upstream call with its hold id and reads the spend row back after a cancel.

**Tech Stack:** Go 1.2x, Temporal SDK (`go.temporal.io/sdk` v1.44.0), Postgres-backed tests through `scripts/pg-test.sh`, LiteLLM proxy admin API, `git` CLI.

**Spec:** [escalation-ladder-redesign-2026-10-15.md](../escalation-ladder-redesign-2026-10-15.md) section 5, "Changes that need no model", rows "A review finding that claims a name is absent", "One review call reads the whole diff", "A deterministic anti-cheat check", "The stale sweep reads from Temporal", "A cancelled call is settled from the provider's spend log". Facts: [escalation-ladder-facts-2026-10-15.md](../escalation-ladder-facts-2026-10-15.md). Line references below were verified against code commit `461f4d8` (main), not the facts document's `83c7073`.

## Global Constraints

- Code repo: `/home/womb/repos/ai-software-factory-code` (branch `main`). Infra repo: `/home/womb/repos/ai-software-factory-infra`. Docs repo: `/home/womb/repos/ai-software-factory`.
- Work in a git worktree of each repo, never the main working tree. Other sessions push to `main` while you work: `git pull --rebase origin main` before every push, and re-read a function before you edit it if the pull touched its file.
- Commit to `main` and push to `origin` and `github`. Delete the worktree afterwards. Commit only your own files. End each commit message with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Before each commit run `gofmt -l .` (empty), `go vet ./...`, and the task's tests with `-race`. Before the last push of the code repo run `bash check` (vet, gofmt, gosec v2.29.0, `make test`).
- Postgres-backed tests: `scripts/pg-test.sh go test -race ./internal/factoryd/ ...` and `scripts/pg-test.sh go test -race ./internal/gateway/...`. Plain `go test -race ./...` skips them.
- House style: minimal comments, no change narration, no legacy path or second implementation. Hand-derive expectations. Never edit an assertion to force a pass.
- Workflow code must stay replay-safe. Every workflow change below fires only on data an activity returns (`PolicyGate.Cheats`, `Review.Dropped`), so histories recorded before the change replay unchanged and need no `workflow.GetVersion`.
- A pinned policy version that lacks `review_diff_kib` reads as the default of 48 KiB, today's part size.
- Rolling out: the infra `policy.yaml` key in Task 1 lands only after the factoryd image that knows the key runs, or the policy version is rejected.

## Review Focus

Failure modes the spec implies and no single task's happy path covers. Each has a test in the task named.

1. A review answer whose claim names a finding index that does not exist, or a symbol that is not a bare identifier (`"x; rm -rf"`), must be ignored, never grepped (Task 2, `TestParseReviewClaims`).
2. `git clone` or `git grep` fails (Forgejo down, head moved): the finding must still reach the agent, not vanish (Task 2, `TestApplyClaimsKeepsAFindingWhenTheGrepFails`).
3. A finding that makes two claims is dropped only when both are contradicted (Task 2, `TestApplyClaimsDropsOnlyWhenEveryClaimIsContradicted`).
4. A pull request that deletes the symbol on purpose: main still defines it, the head does not, and the claim "X is undefined" is true. The main hit must not refute it (Task 2, `TestContradictionIgnoresMainWhenTheDiffRemovesTheSymbol`).
5. A diff of exactly the single-call limit reads in one call, one byte more reads in parts (Task 1, `TestDiffPartsBoundary`).
6. A conditional `t.Skip` (a Postgres test that skips without a database) is not a cheat (Task 3, `TestCheatsIgnoresAConditionalSkip`).
7. A test function moved to another file in the same diff is not a removal (Task 3, `TestCheatsAMovedTestIsNotRemoved`).
8. `waiting-deps` quiet for hours with a running workflow raises no question and clears the nudge memory (Task 4, `TestStaleSweepLeavesALiveWorkflowAlone`).
9. Temporal unreachable during the sweep escalates nobody (Task 4, same test, error case).
10. A cancelled call whose spend row appears late (LiteLLM batches spend writes) is still found within the wait (Task 5, `TestCanceledCallIsPricedFromTheSpendLog`).
11. A spend-log read that fails books the full hold as before, not zero (Task 5, `TestCanceledCallWithAnUnreadableSpendLogBooksTheHold`).

## Verified facts the plan rests on

| Fact | Where (commit `461f4d8`) |
|---|---|
| The review prompt, part prompt and answer format | `internal/factoryd/gates.go:747-756` |
| `ModelReview`, the diff in parts, one `supervisor.Chat` per part | `internal/factoryd/gates.go:965-1060` |
| `parseReview` rejects unknown fields (`DisallowUnknownFields`), so a new answer field needs a struct field | `internal/factoryd/gates.go:876-915` |
| `diffParts` packs into at most `reviewChunks` (3) parts of `reviewDiffMax` (48 KiB); the audit calls it too | `internal/factoryd/reviewdiff.go:95-118`, `internal/factoryd/audit.go:157`, constants `gates.go:742-745` |
| `fileDiff`, `splitDiff`, `redact.Added` give files and added lines with new line numbers | `internal/factoryd/reviewdiff.go:19-90`, `internal/redact/scan.go:99` |
| `policy` stage must have `on_findings: fail` (a floor) so cheat findings cannot ride its rule | `internal/policy/process.go:329-331` |
| Precedent for findings through the `checks` stage's rule | `internal/factoryd/workflow_stages.go:124-127` and `:865-871` |
| `runStages` loop, `onFindings`, review branch of `runStage` | `workflow_stages.go:101`, `:272`, `:481-520` |
| `StaleSweep`, `escalateStale`, `GateWatch.RunningActivity` (its only caller is the sweep) | `internal/factoryd/temporal.go:234`, `:332`, `internal/factoryd/gatewatch.go:245` |
| Gateway books the full hold on a nil cost | `internal/gateway/server.go:683-704` (`"cost not reported, booked the hold"` at `:688`) |
| Cancel paths: transport error `:728-731`, stream broken off `:773-797` | `internal/gateway/server.go` |
| `git` helper (2 min timeout, bot basic auth) and the clone precedent | `internal/factoryd/github.go:127`, `internal/factoryd/mainfix.go:309` |
| Live review alias is `review-frontier` mapped to LiteLLM `tier-high` = `dashscope/qwen3.8-max` | `ai-software-factory-infra/factory/policy.yaml:105`, `k8s/platform/litellm/helmrelease.yaml:60,114` |

## File structure

| File | Change |
|---|---|
| `internal/factoryd/claims.go` (new) | `Claim`, `Dropped`, `applyClaims`, `contradiction`, `gitGrep`, `checkoutHeadAndMain`, `Runner.dropContradicted` |
| `internal/factoryd/claims_test.go` (new) | tests for the above |
| `internal/factoryd/gates.go` | `Review.Claims`, `Review.Dropped`, `parseReview`, `combineReviews`, `lastReview`, prompts, `ModelReview`, `reviewComment`, `PolicyGate.Cheats`, `GatePolicy` |
| `internal/factoryd/reviewdiff.go` | `diffParts(diff, reader, max)`, `diffNames`, `namesAdded`, `othersOf` |
| `internal/factoryd/audit.go` | pass `auditDiffMax` |
| `internal/factoryd/cheat.go` (new) | `cheats(files)` |
| `internal/factoryd/cheat_test.go` (new) | tests |
| `internal/factoryd/workflow_stages.go` | `runStages` cheat call, review branch with `Dropped` |
| `internal/factoryd/temporal.go`, `gatewatch.go` | `TemporalWorkflows.Alive`, `StaleSweep` signature, delete `RunningActivity` |
| `cmd/factoryd/main.go` | pass `inner.Alive` |
| `internal/policy/policy.go` | `Limits.ReviewDiffKiB` and friends |
| `internal/gateway/server.go`, `litellm.go` | tag, settle, `SpendLog` |
| `cmd/factory-gateway/main.go` | wire `Spend` |
| infra `factory/policy.yaml`, `factory/schema/policy.schema.json` | `review_diff_kib` |
| docs `docs/architecture.md` | four short edits (Task 6) |

Order: Tasks 1 to 5 are independent. Tasks 1 and 2 both edit `ModelReview` and `gates.go`: do Task 1 first. The task numbers differ from the spec's row order: Task 1 is row 2, Task 2 is row 1, Task 3 row 3, Task 4 row 4, Task 5 row 5. Task 6 last.

---
## Task 1: One review call reads the whole diff (spec row 2)

Design decision: one policy value, `limits.review_diff_kib`, is both the most diff one call reads and the size of a part when the diff is bigger. `packFiles` already puts a diff whose files total at most the limit into one part, so the single-call rule needs no new branch: it needs the limit to come from policy instead of the constant 48 KiB. A diff beyond the limit reads in at most `reviewChunks` (3) parts of that size, and each part's call gets `names_in_other_parts`. The audit keeps parts of 48 KiB (`reviewDiffMax`): its model is `coding-frontier`, and the spec names the review only.

The live value is a judgment call (see "Open questions"): three parts of 48 KiB are about 37,000 tokens, so 1 KiB is about 257 tokens. The plan proposes 256 KiB (about 66,000 tokens), well inside any context window the review model plausibly has, and Step 9 reads the real window from LiteLLM before the value is committed.

**Files:**
- Modify: `internal/policy/policy.go` (Limits, around lines 266-420)
- Modify: `internal/policy/policy_test.go`, `internal/policy/tree_test.go:247-256`
- Modify: `internal/factoryd/reviewdiff.go:95-118`, `internal/factoryd/gates.go:740-800,965-1060`, `internal/factoryd/audit.go:157`
- Test: `internal/factoryd/reviewdiff_test.go`, `internal/factoryd/gates_test.go`
- Modify (after the image rolls): `/home/womb/repos/ai-software-factory-infra/factory/policy.yaml`, `factory/schema/policy.schema.json`

**Interfaces:**
- Produces: `policy.DefaultReviewDiffKiB = 48`, `policy.MaxReviewDiffKiB = 1024`, `Limits.ReviewDiffKiB int`, `Limits.ReviewDiffBytes() int`, `diffParts(diff, reader string, max int)`, `othersOf(parts [][]fileDiff, i int) string`, input field `names_in_other_parts`.

- [ ] **Step 1: Write the failing policy tests**

In `internal/policy/policy_test.go`, extend the limits table at line 966 (add three rows) and add a method test:

```go
		"review_diff_kib 0":    {func() Limits { l := base; l.ReviewDiffKiB = 0; return l }(), true},
		"review_diff_kib 47":   {func() Limits { l := base; l.ReviewDiffKiB = 47; return l }(), false},
		"review_diff_kib 1025": {func() Limits { l := base; l.ReviewDiffKiB = 1025; return l }(), false},
```

and after that test function:

```go
func TestReviewDiffBytes(t *testing.T) {
	if got := (Limits{}).ReviewDiffBytes(); got != 48<<10 {
		t.Fatalf("absent = %d, want 49152", got)
	}
	if got := (Limits{ReviewDiffKiB: 256}).ReviewDiffBytes(); got != 256<<10 {
		t.Fatalf("256 KiB = %d, want 262144", got)
	}
}
```

In `internal/policy/tree_test.go` `TestLimitsJSON` (line 247) set `ReviewDiffKiB: 256` in `l`, and change the wanted JSON to end `..."same_call":5,"review_diff_kib":256}`.

- [ ] **Step 2: Run to verify they fail**

Run: `cd /home/womb/repos/ai-software-factory-code && go test ./internal/policy/ -run 'TestReviewDiffBytes|TestLimitsJSON|Limits' -v 2>&1 | tail -20`
Expected: FAIL, `unknown field ReviewDiffKiB` (compile error).

- [ ] **Step 3: Implement the policy value**

In `internal/policy/policy.go`, add to `Limits` after `SameCall`:

```go
	// ReviewDiffKiB is the most diff, in KiB, one model review call reads,
	// and the size of a part when a bigger diff reads in parts (at most
	// ReviewParts). Size it to the review model's context window: about 257
	// tokens a KiB. Absent: DefaultReviewDiffKiB.
	ReviewDiffKiB int `yaml:"review_diff_kib,omitempty" json:"review_diff_kib"`
```

Add after `DefaultSameCall`'s block:

```go
// The review diff limit of a policy without limits.review_diff_kib, and of
// a version pinned before the key existed, and the most a policy may set
// (Forgejo's diff answer is cut at 1 MiB).
const (
	DefaultReviewDiffKiB = 48
	MaxReviewDiffKiB     = 1024
)

// ReviewDiffBytes is ReviewDiffKiB in bytes, DefaultReviewDiffKiB where unset.
func (l Limits) ReviewDiffBytes() int { return cmp.Or(l.ReviewDiffKiB, DefaultReviewDiffKiB) << 10 }
```

Add the field to `limitsJSON` (last), to the positional literal in `MarshalJSON` (`..., l.SameCall, l.ReviewDiffKiB`), and to `UnmarshalJSON`'s `out := Limits{... SameCall: j.SameCall, ReviewDiffKiB: j.ReviewDiffKiB}`. In `validate()` add before the closing brace of the switch:

```go
	case l.ReviewDiffKiB != 0 && (l.ReviewDiffKiB < DefaultReviewDiffKiB || l.ReviewDiffKiB > MaxReviewDiffKiB):
		return fmt.Errorf("policy: limits.review_diff_kib must be 0 or lie between %d and %d, is %d", DefaultReviewDiffKiB, MaxReviewDiffKiB, l.ReviewDiffKiB)
```

- [ ] **Step 4: Run to verify the policy tests pass**

Run: `go test -race ./internal/policy/ 2>&1 | tail -5`
Expected: `ok`. If another test pins the exact Limits JSON (`grep -rn '"same_call"' internal --include=*_test.go`), update its expected string by the same appended field, hand-derived.

- [ ] **Step 5: Write the failing boundary and names tests**

Append to `internal/factoryd/reviewdiff_test.go`:

```go
func TestDiffPartsBoundary(t *testing.T) {
	for name, tc := range map[string]struct {
		max, second, parts int
	}{
		"exactly the limit":    {48 << 10, 18 << 10, 1},
		"one byte past":        {48 << 10, 18<<10 + 1, 2},
		"a larger limit holds": {256 << 10, 18<<10 + 1, 1},
	} {
		t.Run(name, func(t *testing.T) {
			_, parts, why := diffParts(diffFile("a.go", 30<<10)+diffFile("b.go", tc.second), "review", tc.max)
			if why != "" || len(parts) != tc.parts {
				t.Fatalf("parts = %d, why = %q, want %d parts", len(parts), why, tc.parts)
			}
		})
	}
	_, parts, why := diffParts(diffFile("a.go", 300<<10), "review", 256<<10)
	if parts != nil || !strings.Contains(why, "the review reads at most 3 parts of 256 KiB (a.go alone is 300 KiB)") {
		t.Fatalf("parts = %v, why = %q", parts, why)
	}
}

func TestOthersOfNamesWhatTheOtherPartsAdd(t *testing.T) {
	a := splitDiff("diff --git a/store.go b/store.go\n--- a/store.go\n+++ b/store.go\n@@ -1,2 +1,5 @@\n context\n-func Old() {}\n+func (s *Store) TasksByPR(ctx int) {}\n+type Server struct {\n+\tmux.HandleFunc(\"GET /api/tasks\", h)\n")
	b := splitDiff("diff --git a/ui.css b/ui.css\n--- a/ui.css\n+++ b/ui.css\n@@ -1,1 +1,3 @@\n+.card-title {\n+  color: red;\n")
	c := splitDiff("diff --git a/c.go b/c.go\n--- /dev/null\n+++ b/c.go\n@@ -0,0 +1,2 @@\n+func Own() {}\n+go func() {\n")
	parts := [][]fileDiff{a, b, c}
	if got, want := othersOf(parts, 1), "functions: Own, TasksByPR\ntypes: Server\nroutes: /api/tasks"; got != want {
		t.Fatalf("others of part 2 = %q, want %q", got, want)
	}
	if got, want := othersOf(parts, 0), "functions: Own\nselectors: .card-title"; got != want {
		t.Fatalf("others of part 1 = %q, want %q", got, want)
	}
	if got := othersOf([][]fileDiff{a}, 0); got != "" {
		t.Fatalf("one part has no others, got %q", got)
	}
}

In `internal/factoryd/gates_test.go` add:

```go
// A diff that fits the pinned review_diff_kib reads in one call, with no
// part label, however many files it holds; beyond it, parts of that size.
func TestModelReviewReadsAFittingDiffWhole(t *testing.T) {
	diff := diffFile("a.go", 30<<10) + diffFile("b.go", 30<<10) + diffFile("c.go", 30<<10)
	for name, tc := range map[string]struct {
		kib   int
		calls int
	}{"default 48": {0, 3}, "256": {256, 1}} {
		t.Run(name, func(t *testing.T) {
			fj := &gateForgejo{diff: diff}
			r, _, _ := newGateRunner(t, gateTask, fj)
			ll := &fakeLiteLLM{content: `{"verdict":"approve","summary":"ok"}`}
			r.supervisor = testSupervisorModel(ll.srv(t).URL)
			pinned := testPolicyVersion()
			pinned.Document.Limits.ReviewDiffKiB = tc.kib
			r.cfg.PolicyVersion = func(_ context.Context, id int64) (policy.Version, bool, error) { return pinned, id == 7, nil }
			val, err := execActivity(t, r, ActivityModelReview, "t1", PullRequest{Number: 9}, "c1", GateResults{Pin: 7, Policy: PolicyGate{Class: "normal"}})
			if rv := getInto[Review](t, val, err); rv.Verdict != "approve" || len(ll.chats) != tc.calls {
				t.Fatalf("review = %+v after %d calls, want %d", rv, len(ll.chats), tc.calls)
			}
			if tc.calls == 1 && (strings.Contains(userMessage(ll.chats[0]), `"part"`) || strings.Contains(userMessage(ll.chats[0]), "names_in_other_parts")) {
				t.Fatalf("a whole-diff call carries no part or names: %s", userMessage(ll.chats[0])[:200])
			}
		})
	}
}

// A later part's call reads the names every other part adds.
func TestModelReviewPartsReadTheOtherPartsNames(t *testing.T) {
	diff := diffFile("a.go", 30<<10, "func (s *Store) TasksByPR(ctx int) {}") + diffFile("b.go", 30<<10, "func useIt() {")
	fj := &gateForgejo{diff: diff}
	r, _, _ := newGateRunner(t, gateTask, fj)
	ll := &fakeLiteLLM{content: `{"verdict":"approve","summary":"ok"}`}
	r.supervisor = testSupervisorModel(ll.srv(t).URL)
	if _, err := execActivity(t, r, ActivityModelReview, "t1", PullRequest{Number: 9}, "c1", GateResults{Policy: PolicyGate{Class: "normal"}}); err != nil {
		t.Fatal(err)
	}
	if len(ll.chats) != 2 {
		t.Fatalf("calls = %d, want 2", len(ll.chats))
	}
	if first := userMessage(ll.chats[0]); !strings.Contains(first, `"names_in_other_parts":"functions: useIt"`) {
		t.Fatalf("part 1 lacks part 2's names: %s", first[:min(len(first), 600)])
	}
	if second := userMessage(ll.chats[1]); !strings.Contains(second, `"names_in_other_parts":"functions: TasksByPR"`) {
		t.Fatalf("part 2 lacks part 1's names: %s", second[:min(len(second), 600)])
	}
}
```

- [ ] **Step 6: Run to verify they fail**

Run: `go test ./internal/factoryd/ -run 'TestDiffPartsBoundary|TestOthersOf|TestModelReviewReadsAFittingDiffWhole|TestModelReviewPartsRead' 2>&1 | tail -15`
Expected: compile FAIL (`too many arguments in call to diffParts`, `undefined: othersOf`).

- [ ] **Step 7: Implement**

`internal/factoryd/reviewdiff.go`: change `diffParts`:

```go
// diffParts packs diff's files into parts of at most max bytes, at most
// reviewChunks of them, one model call each, at least one part: a diff
// within max is one part. why says why the model cannot read the whole
// diff so ("" when it can); reader names the gate in it.
func diffParts(diff, reader string, max int) (files []fileDiff, parts [][]fileDiff, why string) {
	files = splitDiff(diff)
	parts, tooBig := packFiles(files, max)
```

and in its last line use `max>>10` for `reviewDiffMax>>10`. Add (imports `slices` exists; add nothing else):

```go
var nameShapes = []struct {
	kind string
	re   *regexp.Regexp
}{
	{"functions", regexp.MustCompile(`^\s*(?:export\s+|async\s+|pub\s+)*(?:function\s+|func(?:\s+|\s*\([^)]*\)\s*)|def\s+|fn\s+)([\p{L}_][\p{L}\p{N}_]*)`)},
	{"types", regexp.MustCompile(`^\s*(?:export\s+|pub\s+)*(?:type\s+|class\s+|interface\s+|struct\s+|enum\s+|trait\s+)([\p{L}_][\p{L}\p{N}_]*)`)},
	{"routes", regexp.MustCompile(`\b(?:Handle|HandleFunc|Get|Post|Put|Patch|Delete|Route)\(\s*"(?:[A-Z]+ )?(/[^"\s]*)"`)},
	{"selectors", regexp.MustCompile(`^\s*([.#][\w-]+)[^{]*\{\s*$`)},
}

const maxListedNames = 300

// othersOf lists the functions, types, routes and selectors the added
// lines of every part but part i define, one line a kind, so the call on
// part i knows a name it does not see is defined elsewhere in the diff.
func othersOf(parts [][]fileDiff, i int) string {
	byKind := map[string][]string{}
	seen := map[string]bool{}
	for k, part := range parts {
		if k == i {
			continue
		}
		for _, f := range part {
			redact.Added(f.Text, func(_ string, _ int, text string) {
				for _, s := range nameShapes {
					if m := s.re.FindStringSubmatch(text); m != nil && !seen[s.kind+m[1]] {
						seen[s.kind+m[1]] = true
						byKind[s.kind] = append(byKind[s.kind], m[1])
					}
				}
			})
		}
	}
	var lines []string
	for _, s := range nameShapes {
		list := byKind[s.kind]
		if len(list) == 0 {
			continue
		}
		slices.Sort(list)
		more := ""
		if len(list) > maxListedNames {
			more, list = fmt.Sprintf(", ... and %d more", len(list)-maxListedNames), list[:maxListedNames]
		}
		lines = append(lines, s.kind+": "+strings.Join(list, ", ")+more)
	}
	return strings.Join(lines, "\n")
}
```

`internal/factoryd/gates.go`: replace the constants block at 740-745:

```go
// The model review reads a diff in at most reviewChunks parts of
// limits.review_diff_kib, one call each (a diff within the limit is one
// call); the audit in parts of reviewDiffMax.
const (
	reviewDiffMax = policy.DefaultReviewDiffKiB << 10
	reviewChunks  = policy.ReviewParts
)
```

Add `Names string \`json:"names_in_other_parts,omitempty"\`` to `reviewInput` (after `Files`) and `reviewPartInput` (after `Files`). In `reviewPrompt`, after "...files lists every file of the whole diff with its added and removed lines and its part." insert: ` names_in_other_parts lists the functions, types, routes and selectors the other parts add: a name listed there exists, so a part that does not define or use it is no finding.` In `reviewPartPrompt`, after "...and its part." (first sentence) insert the same sentence. In `ModelReview` change the call and the two builders:

```go
	files, parts, why := diffParts(diff, "review", pinned.Limits.ReviewDiffBytes())
```
```go
		if len(parts) > 1 {
			first.Part, first.Files, first.Names = partLabel(parts, 0, len(files)), fileList(parts), othersOf(parts, 0)
		}
```
```go
				prompt, in = reviewPartPrompt, reviewPartInput{Objective: first.Brief.Objective, Diff: joinFiles(part),
					Part: partLabel(parts, i, len(files)), Files: first.Files, Names: othersOf(parts, i), LastFindings: lastFindings[i]}
```
Update the `ModelReview` doc comment: "read whole, in one call when it fits limits.review_diff_kib, else in up to reviewChunks parts of whole files of that size, one call each". Add the `redact` import to reviewdiff.go if absent (it is imported already at line 11). In `internal/factoryd/audit.go:157` change to `diffParts(diff, "audit", reviewDiffMax)`.

- [ ] **Step 8: Run the factoryd tests**

Run: `scripts/pg-test.sh go test -race ./internal/factoryd/ -run 'DiffParts|OthersOf|ModelReview|Audit|TestFileList|TestPartOf' 2>&1 | tail -15`
Expected: PASS. The existing `TestModelReviewReadsTheDiffInParts` still holds: its files add no declarations, so `names_in_other_parts` is omitted and its exact key lists stay. `TestModelReviewBeyondItsReachIsNotReviewed` still holds at the default of 48 KiB.

- [ ] **Step 9: Read the review model's context window, then commit the code**

With cluster access, port-forward the LiteLLM service (namespace and service name are in `k8s/platform/litellm/helmrelease.yaml`) and call `GET /model/info` with the master key from the `litellm-master-key` secret: `jq '.data[] | select(.model_name=="tier-high") | .model_info | {max_input_tokens, max_output_tokens}'`.
Record the number in the commit message. If `max_input_tokens` is below 100000, lower the live value in Step 10 to `floor((max_input_tokens - 18432 - 8000) / 257)`.

```bash
git add internal/policy internal/factoryd/reviewdiff.go internal/factoryd/reviewdiff_test.go internal/factoryd/gates.go internal/factoryd/gates_test.go internal/factoryd/audit.go
git commit -m "Model review: one call reads the whole diff up to limits.review_diff_kib; later parts read the other parts' names"
git pull --rebase origin main && git push origin main && git push github main
```

- [ ] **Step 10: Set the live value, after the image with the key has rolled**

In `/home/womb/repos/ai-software-factory-infra/factory/policy.yaml` add to the `limits:` block, and to the comment above it (after the `same_call` sentence) one sentence `review_diff_kib: the most diff, in KiB, one review call reads, and the size of a part beyond it (at most 3 parts); about 257 tokens a KiB; absent: 48.`:

```yaml
  review_diff_kib: 256
```

Update the `bounds:` comment at line 297-300 to `(up to three calls, plus two minutes: 20 m at 6 m)` unchanged in value; no edit needed there. Regenerate the schema copy with a throwaway test in the code repo:

```bash
cd /home/womb/repos/ai-software-factory-code
cat > internal/policy/zz_schema_test.go <<'GO'
package policy

import ("os"; "testing")

func TestZZWriteSchema(t *testing.T) {
	m, err := Schemas()
	if err != nil { t.Fatal(err) }
	if err := os.WriteFile(os.Getenv("OUT"), m["policy.schema.json"], 0o644); err != nil { t.Fatal(err) }
}
GO
OUT=/home/womb/repos/ai-software-factory-infra/factory/schema/policy.schema.json go test ./internal/policy/ -run TestZZWriteSchema
rm internal/policy/zz_schema_test.go
cd /home/womb/repos/ai-software-factory-infra && git diff --stat factory/schema
```
Expected: the diff adds only the `review_diff_kib` property. Then run the infra repo's config check (`.forgejo/workflows/config-check.yml` names the command) and:

```bash
git add factory/policy.yaml factory/schema/policy.schema.json
git commit -m "policy: review_diff_kib 256, one review call reads the whole diff"
git pull --rebase origin main && git push origin main && git push github main
```

---
## Task 2: Review findings that claim an absent name are grepped (spec row 1)

Design decision: **the structured field**. `parseReview` already refuses unknown fields, so the review's JSON answer gains one optional field, `claims`, a list of `{finding, kind, symbol}` that points at an entry of `findings`. Cost: one sentence in `reviewFormat` and one struct field. A pattern over the finding's text would match "does not exist" in prose about anything and needs a symbol extractor that guesses; the structured field has the model name the symbol. Weakness, stated: a model that omits `claims` for a false "absent" finding is not checked. The validation brief (`escalation-ladder-validation.md`) should count findings of that shape without a claim.

Two claim kinds: `undefined` (the symbol is defined nowhere) and `uncalled` (defined, nothing calls it; covers "never called" and "not implemented" where the model means "not wired"). A finding is dropped only when every claim it carries is contradicted. A claim is contradicted when `git grep -w -F` finds a declaration (`undefined`) or a non-declaration, non-comment use (`uncalled`) at the head, or at main when the diff removes no line that mentions the symbol (a pull request that deletes the symbol on purpose leaves main's copy true but gone at the head). A grep that fails (clone, fetch, head moved) contradicts nothing: the finding goes to the session as today.

The dropped finding is recorded in three places: `Review.Dropped` with `Evidence` = `file:line at head|main: <line>` (reaches the approval card through `ApprovalInput.Review`), the `model_review` timeline step (`dropped`), and the pull request comment. When every finding is dropped the verdict stays `concerns`, so a drop never counts as the review's approve (the spec's guardrail 3) and `AutoMerge` still sends the pull request to a human.

**Files:**
- Create: `internal/factoryd/claims.go`, `internal/factoryd/claims_test.go`
- Modify: `internal/factoryd/gates.go` (Review at 123, `lastReview` 851, `parseReview` 876, `combineReviews` 931, `reviewFormat` 756, `ModelReview` 965, `reviewComment` 1062)
- Modify: `internal/factoryd/workflow_stages.go` (review branch of `runStage`, around 513)
- Test: `internal/factoryd/gates_test.go` (`TestParseReview` row), `internal/factoryd/workflow_gates_test.go`

**Interfaces:**
- Produces: `type Claim struct{Finding int; Kind, Symbol string}`, `ClaimUndefined = "undefined"`, `ClaimUncalled = "uncalled"`, `type Dropped struct{Finding, Kind, Symbol, Evidence string}`, `Review.Claims []Claim`, `Review.Dropped []Dropped`, `type grepHit struct{Ref, Path string; Line int; Text string}`, `applyClaims(rv Review, diff string, grep func(symbol string) ([]grepHit, error)) Review`, `var checkoutRefs`, `(*Runner).dropContradicted`.

- [ ] **Step 1: Write the failing tests**

Create `internal/factoryd/claims_test.go`:

```go
package factoryd

import (
	"context"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
)

func TestParseReviewClaims(t *testing.T) {
	in := `{"verdict":"concerns","summary":"s","findings":["a.go: TasksByPR has no SQL implementation"," ","b.go: helper is dead"],
	"claims":[{"finding":0,"kind":"undefined","symbol":"TasksByPR"},{"finding":1,"kind":"undefined","symbol":"Blank"},
	{"finding":2,"kind":"uncalled","symbol":"helper"},{"finding":9,"kind":"undefined","symbol":"Gone"},
	{"finding":0,"kind":"undefined","symbol":"x; rm -rf"},{"finding":0,"kind":"bogus","symbol":"Y"}]}`
	rv := parseReview(in)
	want := []Claim{{0, ClaimUndefined, "TasksByPR"}, {1, ClaimUncalled, "helper"}}
	if !slices.Equal(rv.Claims, want) || len(rv.Findings) != 2 {
		t.Fatalf("claims = %+v over %d findings, want %+v over 2", rv.Claims, len(rv.Findings), want)
	}
	if got := parseReview(`{"verdict":"approve","summary":"s","dropped":[{"finding":"x"}]}`); got.Verdict != "" || !strings.Contains(got.Note, "dropped is not an answer field") {
		t.Fatalf("a smuggled drop = %+v", got)
	}
}

func TestCombineReviewsOffsetsClaims(t *testing.T) {
	got := combineReviews([]Review{
		{Verdict: "concerns", Summary: "a", Findings: []string{"f0"}, Claims: []Claim{{0, ClaimUndefined, "A"}}},
		{Verdict: "concerns", Summary: "b", Findings: []string{"f1", "f2"}, Claims: []Claim{{1, ClaimUncalled, "C"}}},
	})
	if want := []Claim{{0, ClaimUndefined, "A"}, {2, ClaimUncalled, "C"}}; !slices.Equal(got.Claims, want) {
		t.Fatalf("claims = %+v, want %+v", got.Claims, want)
	}
}

func TestLastReviewCarriesNoClaimsOrDrops(t *testing.T) {
	last, _ := lastReview([]Review{{Verdict: "concerns", Summary: "s", Findings: []string{"a.go: x"}, Claims: []Claim{{0, ClaimUndefined, "X"}},
		Dropped: []Dropped{{Finding: "y"}}}}, [][]fileDiff{nil})
	if last.Claims != nil || last.Dropped != nil {
		t.Fatalf("last review = %+v", last)
	}
}

func TestContradiction(t *testing.T) {
	hit := func(ref, text string) grepHit { return grepHit{Ref: ref, Path: "internal/s.go", Line: 12, Text: text} }
	undefined, uncalled := Claim{0, ClaimUndefined, "TasksByPR"}, Claim{0, ClaimUncalled, "docRootOK"}
	for name, tc := range map[string]struct {
		claim   Claim
		hits    []grepHit
		removed bool
		want    string
	}{
		"method declared at head":           {undefined, []grepHit{hit("head", "func (s *PG) TasksByPR(ctx context.Context) {")}, false, "internal/s.go:12 at head: func (s *PG) TasksByPR"},
		"declared on main only":             {undefined, []grepHit{hit("main", "func TasksByPR() {")}, false, "internal/s.go:12 at main: func TasksByPR"},
		"main only and the diff removes it": {undefined, []grepHit{hit("main", "func TasksByPR() {")}, true, ""},
		"a call is no definition":           {undefined, []grepHit{hit("head", "\tx := s.TasksByPR(ctx)")}, false, ""},
		"no hit":                            {undefined, nil, false, ""},
		"a call at head":                    {uncalled, []grepHit{hit("head", "\tif !docRootOK(p) {")}, false, "internal/s.go:12 at head: \tif !docRootOK"},
		"only the declaration":              {uncalled, []grepHit{hit("head", "func docRootOK(p string) bool {")}, false, ""},
		"only a comment":                    {uncalled, []grepHit{hit("head", "// docRootOK checks the root")}, false, ""},
	} {
		t.Run(name, func(t *testing.T) {
			got, ok := contradiction(tc.claim, tc.hits, tc.removed)
			if ok != (tc.want != "") || !strings.HasPrefix(got, tc.want) {
				t.Fatalf("contradiction = %q, %v, want prefix %q", got, ok, tc.want)
			}
		})
	}
}

func TestRemovesSymbol(t *testing.T) {
	diff := "diff --git a/TasksByPR.go b/TasksByPR.go\n--- a/TasksByPR.go\n+++ b/TasksByPR.go\n@@ -1,2 +1,1 @@\n-func TasksByPR() {}\n context\n"
	if !removesSymbol(diff, "TasksByPR") || removesSymbol(diff, "Other") {
		t.Fatal("removesSymbol must see the removed line and nothing else")
	}
	if removesSymbol("--- a/TasksByPR.go\n+++ b/TasksByPR.go\n@@ -1 +1 @@\n+TasksByPR()\n", "TasksByPR") {
		t.Fatal("a file header and an added line remove nothing")
	}
}

func mainHit(path string, line int, text string) []grepHit {
	return []grepHit{{Ref: "main", Path: path, Line: line, Text: text}}
}

func TestApplyClaimsDropsAContradictedFinding(t *testing.T) {
	rv := Review{Verdict: "concerns", Summary: "s", Findings: []string{"keep", "gone"}, Claims: []Claim{{1, ClaimUndefined, "TasksByPR"}}}
	got := applyClaims(rv, "", func(string) ([]grepHit, error) {
		return mainHit("internal/s.go", 7, "func (s *PG) TasksByPR() {"), nil
	})
	if !slices.Equal(got.Findings, []string{"keep"}) || got.Claims != nil || got.Verdict != "concerns" {
		t.Fatalf("review = %+v", got)
	}
	want := Dropped{Finding: "gone", Kind: ClaimUndefined, Symbol: "TasksByPR", Evidence: "internal/s.go:7 at main: func (s *PG) TasksByPR() {"}
	if len(got.Dropped) != 1 || got.Dropped[0] != want {
		t.Fatalf("dropped = %+v, want %+v", got.Dropped, want)
	}
}

func TestApplyClaimsKeepsAFindingWhenTheGrepFails(t *testing.T) {
	rv := Review{Verdict: "concerns", Findings: []string{"f"}, Claims: []Claim{{0, ClaimUndefined, "X"}}}
	got := applyClaims(rv, "", func(string) ([]grepHit, error) { return nil, os.ErrDeadlineExceeded })
	if !slices.Equal(got.Findings, []string{"f"}) || got.Dropped != nil {
		t.Fatalf("review = %+v, want the finding kept", got)
	}
}

func TestApplyClaimsDropsOnlyWhenEveryClaimIsContradicted(t *testing.T) {
	rv := Review{Verdict: "concerns", Findings: []string{"A and B are undefined"}, Claims: []Claim{{0, ClaimUndefined, "A"}, {0, ClaimUndefined, "B"}}}
	got := applyClaims(rv, "", func(sym string) ([]grepHit, error) {
		if sym == "A" {
			return mainHit("a.go", 1, "func A() {"), nil
		}
		return nil, nil
	})
	if len(got.Findings) != 1 || got.Dropped != nil {
		t.Fatalf("review = %+v, want the finding kept: B has no definition", got)
	}
}

func TestContradictionIgnoresMainWhenTheDiffRemovesTheSymbol(t *testing.T) {
	diff := "diff --git a/s.go b/s.go\n--- a/s.go\n+++ b/s.go\n@@ -1,2 +1,1 @@\n-func TasksByPR() {}\n context\n"
	rv := Review{Verdict: "concerns", Findings: []string{"TasksByPR is gone"}, Claims: []Claim{{0, ClaimUndefined, "TasksByPR"}}}
	got := applyClaims(rv, diff, func(string) ([]grepHit, error) { return mainHit("s.go", 1, "func TasksByPR() {}"), nil })
	if len(got.Findings) != 1 || got.Dropped != nil {
		t.Fatalf("review = %+v, want the true finding kept", got)
	}
}

// gitFixture is a repository whose main defines Sym at a.go:3 and whose
// branch head adds a call at b.go:2.
func gitFixture(t *testing.T) string {
	t.Helper()
	ctx := context.Background()
	dir := t.TempDir()
	run := func(args ...string) {
		t.Helper()
		if _, err := git(ctx, dir, "", append([]string{"-c", "user.name=t", "-c", "user.email=t@t"}, args...)...); err != nil {
			t.Fatal(err)
		}
	}
	write := func(name, body string) {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(body), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	run("init", "-q", "-b", "main")
	write("a.go", "package a\n\nfunc Sym() {}\n")
	run("add", ".")
	run("commit", "-q", "-m", "main")
	run("checkout", "-q", "-b", "head")
	write("b.go", "package a\nvar _ = Sym\n")
	run("add", ".")
	run("commit", "-q", "-m", "head")
	return dir
}

func TestGitGrepFindsTheSymbolAtEachRef(t *testing.T) {
	dir := gitFixture(t)
	got, err := gitGrep(context.Background(), dir, []namedRef{{"head", "head"}, {"main", "main"}}, "Sym")
	if err != nil {
		t.Fatal(err)
	}
	want := []grepHit{{"head", "a.go", 3, "func Sym() {}"}, {"head", "b.go", 2, "var _ = Sym"}, {"main", "a.go", 3, "func Sym() {}"}}
	if !slices.Equal(got, want) {
		t.Fatalf("hits = %+v, want %+v", got, want)
	}
	if none, err := gitGrep(context.Background(), dir, []namedRef{{"head", "head"}}, "Absent"); err != nil || len(none) != 0 {
		t.Fatalf("no match = %+v, %v, want no hits and no error", none, err)
	}
}

func TestModelReviewDropsAFindingTheGrepContradicts(t *testing.T) {
	dir := gitFixture(t)
	old := checkoutRefs
	checkoutRefs = func(context.Context, *Forgejo, Repo, int64, string) (string, []namedRef, func(), error) {
		return dir, []namedRef{{"head", "head"}, {"main", "main"}}, func() {}, nil
	}
	t.Cleanup(func() { checkoutRefs = old })
	fj := &gateForgejo{diff: "diff --git a/b.go b/b.go\n--- /dev/null\n+++ b/b.go\n@@ -0,0 +1,2 @@\n+package a\n+var _ = Sym\n"}
	r, _, objects := newGateRunner(t, gateTask, fj)
	ll := &fakeLiteLLM{content: `{"verdict":"concerns","summary":"Sym is missing","findings":["b.go: Sym is never defined"],"claims":[{"finding":0,"kind":"undefined","symbol":"Sym"}]}`}
	r.supervisor = testSupervisorModel(ll.srv(t).URL)
	val, err := execActivity(t, r, ActivityModelReview, "t1", PullRequest{Number: 9}, "c1", GateResults{Policy: PolicyGate{Class: "normal"}})
	rv := getInto[Review](t, val, err)
	if rv.Verdict != "concerns" || len(rv.Findings) != 0 || len(rv.Dropped) != 1 || rv.Dropped[0].Evidence != "a.go:3 at head: func Sym() {}" {
		t.Fatalf("review = %+v, want the finding dropped with a.go:3 at head", rv)
	}
	if !strings.Contains(timeline(t, objects), `"dropped":[{"finding":"b.go: Sym is never defined"`) {
		t.Fatalf("the model_review step lacks the drop: %s", timeline(t, objects))
	}
	if len(fj.comments) != 1 || !strings.Contains(fj.comments[0], "Dropped by code") || !strings.Contains(fj.comments[0], "a.go:3 at head") {
		t.Fatalf("comments = %q", fj.comments)
	}
}
```

Add to the same file, after the last test, the checkout failure (add `errors` to its imports):

```go
func TestModelReviewKeepsAClaimedFindingWhenTheCheckoutFails(t *testing.T) {
	old := checkoutRefs
	checkoutRefs = func(context.Context, *Forgejo, Repo, int64, string) (string, []namedRef, func(), error) {
		return "", nil, nil, errors.New("forgejo down")
	}
	t.Cleanup(func() { checkoutRefs = old })
	r, _, _ := newGateRunner(t, gateTask, &gateForgejo{diff: "diff --git a/b.go b/b.go\n--- /dev/null\n+++ b/b.go\n@@ -0,0 +1 @@\n+package a\n"})
	ll := &fakeLiteLLM{content: `{"verdict":"concerns","summary":"s","findings":["b.go: Sym is never defined"],"claims":[{"finding":0,"kind":"undefined","symbol":"Sym"}]}`}
	r.supervisor = testSupervisorModel(ll.srv(t).URL)
	val, err := execActivity(t, r, ActivityModelReview, "t1", PullRequest{Number: 9}, "c1", GateResults{Policy: PolicyGate{Class: "normal"}})
	rv := getInto[Review](t, val, err)
	if len(rv.Findings) != 1 || rv.Dropped != nil || rv.Claims != nil {
		t.Fatalf("review = %+v, want the finding kept and the claims spent", rv)
	}
}
```

The head hits order in `TestGitGrepFindsTheSymbolAtEachRef` is git's: refs in the order given, files by path. Hand check: head tree holds a.go (`func Sym() {}` at line 3) and b.go (`var _ = Sym` at line 2); main holds a.go only.

Append to `internal/factoryd/workflow_gates_test.go` a harness field `gates []PolicyGate` and the workflow test (the harness change is Step 2 below; the test is):

```go
// A review whose every finding the grep dropped starts no session: the
// pull request goes to the approval card with the drops, and the verdict
// stays concerns, so the merge rule auto does not merge it.
func TestWorkflowDroppedFindingsStartNoSession(t *testing.T) {
	g := newGateHarness(t, func(g *gateHarness) {
		g.review = Review{Verdict: "concerns", Summary: "Sym is missing",
			Dropped: []Dropped{{Finding: "b.go: Sym is never defined", Kind: ClaimUndefined, Symbol: "Sym", Evidence: "a.go:3 at head: func Sym() {}"}}}
	})
	g.onSessions(pushed("s1", "c1"))
	g.onChecks(ChecksResult{State: ChecksSuccess})
	g.signalAfter(time.Hour, SignalApproved, TaskSignal{Author: "sebastian", PR: 9})
	if final := g.run(t); final != "done" {
		t.Fatalf("final = %q", final)
	}
	if len(g.sessions) != 1 || len(g.approvals) != 1 || len(g.approvals[0].Review.Dropped) != 1 || g.approvals[0].Review.Verdict != "concerns" {
		t.Fatalf("sessions %d, approvals %+v", len(g.sessions), g.approvals)
	}
}
```

- [ ] **Step 2: Run to verify they fail**

Run: `go test ./internal/factoryd/ -run 'Claim|Contradiction|RemovesSymbol|GitGrep|Dropped|LastReviewCarries' 2>&1 | tail -20`
Expected: compile FAIL, `undefined: Claim` and the others.

- [ ] **Step 3: Implement the types and the answer parsing**

In `internal/factoryd/gates.go` add to `Review` (after `Adjudicated`), and extend its doc comment with "Claims name, by finding index, the absent names a finding asserts; Dropped holds the findings a grep of the repository contradicted, with the evidence (never answer fields)":

```go
	Claims            []Claim                 `json:"claims,omitempty"`
	Dropped           []Dropped               `json:"dropped,omitempty"`
```

In `parseReview`, after the `adjudicated` refusal add:

```go
	if rv.Dropped != nil {
		return invalid("dropped is not an answer field")
	}
```

Replace the findings loop at the end of `parseReview`:

```go
	var findings []string
	at := map[int]int{}
	for i, f := range rv.Findings {
		if f = strings.TrimSpace(f); f != "" && len(findings) < maxReviewFindings {
			at[i] = len(findings)
			findings = append(findings, textutil.Truncate(f, maxReviewFinding))
		}
	}
	var claims []Claim
	for _, c := range rv.Claims {
		if k, ok := at[c.Finding]; ok && validClaim(c) {
			claims = append(claims, Claim{k, c.Kind, c.Symbol})
		}
	}
	rv.Findings, rv.Claims = findings, claims
	return rv
```

In `combineReviews`, inside the loop before `rv.Findings = append(...)`:

```go
		for _, c := range p.Claims {
			c.Finding += len(rv.Findings)
			rv.Claims = append(rv.Claims, c)
		}
```

In `lastReview`, change the line `last.Summary, last.Adjudicated = ...` to also clear: `last.Summary, last.Adjudicated, last.Claims, last.Dropped = textutil.Truncate(last.Summary, maxReviewSummary), nil, nil, nil`.

Append to `reviewFormat` (inside the backticks, after the `strict_improvement` sentence):

```
 Add "claims" for every finding that says a name is absent, undefined, never called or not implemented: [{"finding": <index of the finding in findings, from 0>, "kind": "undefined|uncalled", "symbol": "<the bare identifier>"}]. undefined: the symbol is defined nowhere in the repository. uncalled: it is defined and nothing calls it. The factory searches the repository at the head and at main for the symbol and drops a finding the search contradicts. Give no claim for any other finding.
```

Create `internal/factoryd/claims.go`:

```go
package factoryd

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

// A Claim is a review finding's machine-readable assertion that a name is
// absent: Finding indexes the review's findings, Symbol is a bare
// identifier.
type Claim struct {
	Finding int    `json:"finding"`
	Kind    string `json:"kind"`
	Symbol  string `json:"symbol"`
}

const (
	ClaimUndefined = "undefined"
	ClaimUncalled  = "uncalled"
)

var symbolName = regexp.MustCompile(`^[\p{L}_][\p{L}\p{N}_]{0,127}$`)

func validClaim(c Claim) bool {
	return (c.Kind == ClaimUndefined || c.Kind == ClaimUncalled) && symbolName.MatchString(c.Symbol)
}

// Dropped is a review finding the repository contradicts: dropped by code,
// never given to a session. Evidence is "file:line at head|main: line".
type Dropped struct {
	Finding  string `json:"finding"`
	Kind     string `json:"kind"`
	Symbol   string `json:"symbol"`
	Evidence string `json:"evidence"`
}

type grepHit struct {
	Ref, Path string
	Line      int
	Text      string
}

type namedRef struct{ Name, Rev string }

var declaration = func(symbol string) *regexp.Regexp {
	return regexp.MustCompile(`^\s*(?:export\s+|pub\s+|async\s+|static\s+)*(?:func(?:\s+|\s*\([^)]*\)\s*)|type\s+|var\s+|const\s+|def\s+|class\s+|function\s+|fn\s+|interface\s+|enum\s+|struct\s+|trait\s+|let\s+)` + regexp.QuoteMeta(symbol) + `\b`)
}

func comment(text string) bool {
	t := strings.TrimSpace(text)
	return strings.HasPrefix(t, "//") || strings.HasPrefix(t, "#") || strings.HasPrefix(t, "*") || strings.HasPrefix(t, "/*")
}

// removesSymbol: the diff removes a line that names symbol.
func removesSymbol(diff, symbol string) bool {
	return regexp.MustCompile(`(?m)^-[^-\n].*\b` + regexp.QuoteMeta(symbol) + `\b`).MatchString(diff)
}

// contradiction is the first hit that refutes claim: a declaration of the
// symbol (undefined) or a use that is neither declaration nor comment
// (uncalled), at the head, or at main unless the diff removes the symbol
// (removed): the head then lacks it on purpose.
func contradiction(c Claim, hits []grepHit, removed bool) (evidence string, ok bool) {
	decl := declaration(c.Symbol)
	for _, h := range hits {
		if h.Ref == "main" && removed {
			continue
		}
		isDecl := decl.MatchString(h.Text)
		if c.Kind == ClaimUndefined && isDecl || c.Kind == ClaimUncalled && !isDecl && !comment(h.Text) {
			return fmt.Sprintf("%s:%d at %s: %s", h.Path, h.Line, h.Ref, h.Text), true
		}
	}
	return "", false
}

// applyClaims moves every finding that all its claims contradict from
// rv.Findings to rv.Dropped, grep naming the symbol's hits. A failed grep
// contradicts nothing. The claims are spent either way.
func applyClaims(rv Review, diff string, grep func(symbol string) ([]grepHit, error)) Review {
	total, refuted := map[int]int{}, map[int]Dropped{}
	counted := map[int]int{}
	for _, c := range rv.Claims {
		total[c.Finding]++
		hits, err := grep(c.Symbol)
		if err != nil {
			log.Printf("review claim %s: %v", c.Symbol, err)
			continue
		}
		if ev, ok := contradiction(c, hits, removesSymbol(diff, c.Symbol)); ok {
			counted[c.Finding]++
			refuted[c.Finding] = Dropped{Finding: rv.Findings[c.Finding], Kind: c.Kind, Symbol: c.Symbol, Evidence: ev}
		}
	}
	var kept []string
	for i, f := range rv.Findings {
		if total[i] > 0 && counted[i] == total[i] {
			rv.Dropped = append(rv.Dropped, refuted[i])
			continue
		}
		kept = append(kept, f)
	}
	rv.Findings, rv.Claims = kept, nil
	return rv
}

// gitGrep lists the whole-word uses of symbol in each ref's tree, at most
// maxHits a ref; a ref without a match has none.
func gitGrep(ctx context.Context, dir string, refs []namedRef, symbol string) ([]grepHit, error) {
	const maxHits = 200
	var hits []grepHit
	for _, ref := range refs {
		out, err := git(ctx, dir, "", "grep", "-n", "-w", "-F", "-I", "--no-color", "-e", symbol, ref.Rev, "--")
		if err != nil {
			if out == "" && strings.Contains(err.Error(), "exit status 1") {
				continue
			}
			return nil, err
		}
		for i, l := range strings.Split(out, "\n") {
			if i == maxHits {
				break
			}
			path, rest, _ := strings.Cut(strings.TrimPrefix(l, ref.Rev+":"), ":")
			num, text, _ := strings.Cut(rest, ":")
			n, err := strconv.Atoi(num)
			if err != nil {
				continue
			}
			hits = append(hits, grepHit{ref.Name, path, n, text})
		}
	}
	return hits, nil
}

// checkoutRefs fetches main and the pull request's head, both at depth
// 1 without a working tree, into a temporary directory and names the two
// refs to search; a test substitutes it, git being no fake's. The head
// must still be commit.
var checkoutRefs = func(ctx context.Context, f *Forgejo, repo Repo, pr int64, commit string) (dir string, refs []namedRef, cleanup func(), err error) {
	tmp, err := os.MkdirTemp("", "claims-")
	if err != nil {
		return "", nil, nil, err
	}
	cleanup = func() { os.RemoveAll(tmp) }
	login, src := basicLogin(f.BotUser, f.BotPassword), filepath.Join(tmp, "src")
	if _, err = git(ctx, tmp, login, "clone", "-q", "--depth=1", "--no-checkout", "--branch", prBase, f.BaseURL+"/"+repo.String()+".git", src); err == nil {
		_, err = git(ctx, src, login, "fetch", "-q", "--depth=1", "origin", fmt.Sprintf("refs/pull/%d/head:refs/factory/head", pr))
	}
	var head string
	if err == nil {
		head, err = git(ctx, src, "", "rev-parse", "refs/factory/head")
	}
	if err == nil && head != commit {
		err = fmt.Errorf("pull request %d head is %s, not %s", pr, head, commit)
	}
	if err != nil {
		cleanup()
		return "", nil, nil, err
	}
	return src, []namedRef{{"head", "refs/factory/head"}, {"main", prBase}}, cleanup, nil
}

// dropContradicted checks rv's claims against the repository at the head
// and at main and drops the findings it contradicts. No claim, no
// checkout: a checkout that fails drops nothing.
func (r *Runner) dropContradicted(ctx context.Context, repo Repo, pr int64, commit string, rv Review, diff string) Review {
	if len(rv.Claims) == 0 {
		return rv
	}
	dir, refs, cleanup, err := checkoutRefs(ctx, r.forgejo, repo, pr, commit)
	if err != nil {
		log.Printf("review claims of pull request %d: %v", pr, err)
		rv.Claims = nil
		return rv
	}
	defer cleanup()
	return applyClaims(rv, diff, func(symbol string) ([]grepHit, error) { return gitGrep(ctx, dir, refs, symbol) })
}
```

Wire it in `ModelReview`. Replace

```go
		if rv.Note == "" {
			rv = combineReviews(answers)
```
with
```go
		if rv.Note == "" {
			rv = r.dropContradicted(ctx, repo, pr.Number, commit, combineReviews(answers), diff)
```
Replace the final `r.record(... "model_review" ...)` call with:

```go
	detail := reviewEnd(map[string]any{"pr": pr.Number, "commit": commit, "model": model,
		"verdict": rv.Verdict, "summary": rv.Summary, "findings": rv.Findings, "note": rv.Note, "round": round})
	if len(rv.Dropped) > 0 {
		detail["dropped"] = rv.Dropped
	}
	r.record(ctx, t.ID, "model_review", detail)
```
In `reviewComment`, after the `for _, f := range rv.Findings` loop:

```go
	for _, d := range rv.Dropped {
		fmt.Fprintf(&b, "\n- Dropped by code, the repository contradicts it (%s): %s", d.Evidence, d.Finding)
	}
```

In `workflow_stages.go` change the review branch:

```go
		if review.Verdict == "concerns" {
			if len(review.Findings) == 0 {
				if len(review.Dropped) > 0 {
					return nil, verdict{}, false
				}
				return []string{"model review: " + review.Summary}, verdict{}, false
			}
			return review.Findings, verdict{}, false
		}
```

Harness: no change needed for the workflow test (it uses `g.review`).

- [ ] **Step 4: Run the tests**

Run: `scripts/pg-test.sh go test -race ./internal/factoryd/ -run 'Claim|Contradiction|RemovesSymbol|GitGrep|Dropped|LastReview|ParseReview|CombineReviews|ModelReview|Workflow' 2>&1 | tail -20`
Expected: PASS. Fix any gofmt report with `gofmt -w`.

- [ ] **Step 5: Commit**

```bash
gofmt -l internal && go vet ./internal/factoryd/ && git add internal/factoryd/claims.go internal/factoryd/claims_test.go internal/factoryd/gates.go internal/factoryd/gates_test.go internal/factoryd/workflow_stages.go internal/factoryd/workflow_gates_test.go
git commit -m "Model review: a finding that claims an absent name is grepped at head and main, a contradicted one is dropped by code with its evidence"
git pull --rebase origin main && git push origin main && git push github main
```

---
## Task 3: Anti-cheat check on the diff (spec row 3, roadmap 64)

Design decision: the check is **a part of the policy gate's activity**, not a new stage. `GatePolicy` already runs for every task before the checks and already reads the pull request; it also reads the diff and returns `PolicyGate.Cheats`. The policy stage's `on_findings` is `fail` by a floor (`process.go:329-331`, a forbidden path fails the task), so the cheats must not ride that rule. `runStages` sends them through the `checks` stage's rule (`agent`, or `fail`), the way the queue's findings already go (`workflow_stages.go:124-127`, `:865-871`). A new stage would need a new name in `policy.StageNames`, a regenerated process schema, edits to every process file and a `workflow.GetVersion`; this needs none, because the new branch runs only when an activity result carries `Cheats`, which no recorded history does.

**It catches named shapes only**, in Go test files:
1. an unconditional skip added to a test: a line `<recv>.Skip(`, `.Skipf(` or `.SkipNow(` indented by exactly one tab (directly in the function body). A skip nested in an `if` has two tabs and passes: Postgres-backed tests skip without a database by design;
2. a `Test`, `Benchmark` or `Fuzz` function removed and not added under the same name anywhere in the diff (a move to another file is no removal);
3. a `//go:build` or `// +build` line added to a test file that already existed;
4. a `_test.go` file renamed to a name that is not a test file.

It does not see: a skip inside a `t.Run` closure, `testing.Short()` guards that always trip, an assertion weakened inside a test (card #839), a test emptied of its body, or any non-Go language. Those stay with the review and, later, the check-in.

**Files:**
- Create: `internal/factoryd/cheat.go`, `internal/factoryd/cheat_test.go`
- Modify: `internal/factoryd/gates.go` (`PolicyGate` at 33, `GatePolicy` at 321)
- Modify: `internal/factoryd/workflow_stages.go` (`runStages` at 101)
- Test: `internal/factoryd/gates_test.go`, `internal/factoryd/workflow_gates_test.go`

**Interfaces:**
- Produces: `cheats(files []fileDiff) []string`, `PolicyGate.Cheats []string`, `(*taskRun).cheatFindings(g GateResults, capped, card *[]string) (verdict, bool)`, harness field `gateSeq []PolicyGate`.

- [ ] **Step 1: Write the failing tests**

Create `internal/factoryd/cheat_test.go`:

```go
package factoryd

import (
	"strings"
	"testing"
)

const skipDiff = "diff --git a/x_test.go b/x_test.go\n--- a/x_test.go\n+++ b/x_test.go\n@@ -10,3 +10,4 @@ func TestA(t *testing.T) {\n\ta := 1\n+\tt.Skip(\"flaky\")\n \t_ = a\n }\n"

func TestCheats(t *testing.T) {
	for name, tc := range map[string]struct {
		diff string
		want string // prefix of the one finding; "" none
	}{
		"an unconditional skip": {skipDiff, "anti-cheat: x_test.go:11 adds a skip to a test: t.Skip(\"flaky\")"},
		"skipf":                 {strings.Replace(skipDiff, "t.Skip(\"flaky\")", "t.Skipf(\"%s\", why)", 1), "anti-cheat: x_test.go:11 adds a skip to a test: t.Skipf"},
		"a conditional skip":    {strings.Replace(skipDiff, "\n+\tt.Skip(", "\n+\t\tt.Skip(", 1), ""},
		"a skip outside a test file": {strings.ReplaceAll(skipDiff, "x_test.go", "x.go"), ""},
		"a removed test":        {"diff --git a/x_test.go b/x_test.go\n--- a/x_test.go\n+++ b/x_test.go\n@@ -5,3 +5,0 @@\n-func TestGone(t *testing.T) {\n-\tt.Fatal(\"x\")\n-}\n", "anti-cheat: x_test.go:5 (base) removes TestGone"},
		"a moved test": {"diff --git a/a_test.go b/a_test.go\n--- a/a_test.go\n+++ b/a_test.go\n@@ -3,1 +3,0 @@\n-func TestMoved(t *testing.T) {\n" +
			"diff --git a/b_test.go b/b_test.go\n--- a/b_test.go\n+++ b/b_test.go\n@@ -1,0 +2,1 @@\n+func TestMoved(t *testing.T) {\n", ""},
		"a build tag on an old test file": {"diff --git a/x_test.go b/x_test.go\n--- a/x_test.go\n+++ b/x_test.go\n@@ -1,1 +1,2 @@\n+//go:build integration\n package a\n", "anti-cheat: x_test.go:1 adds a build constraint to a test file"},
		"a build tag on a new test file":  {"diff --git a/x_test.go b/x_test.go\n--- /dev/null\n+++ b/x_test.go\n@@ -0,0 +1,2 @@\n+//go:build linux\n+package a\n", ""},
		"a test file renamed away":        {"diff --git a/x_test.go b/x.go.bak\nsimilarity index 100%\nrename from x_test.go\nrename to x.go.bak\n", "anti-cheat: x_test.go is renamed to x.go.bak"},
	} {
		t.Run(name, func(t *testing.T) {
			got := cheats(splitDiff(tc.diff))
			switch {
			case tc.want == "" && len(got) != 0:
				t.Fatalf("cheats = %q, want none", got)
			case tc.want != "" && (len(got) != 1 || !strings.HasPrefix(got[0], tc.want)):
				t.Fatalf("cheats = %q, want one starting %q", got, tc.want)
			}
		})
	}
}

func TestCheatsIgnoresAConditionalSkip(t *testing.T) {
	d := "diff --git a/db_test.go b/db_test.go\n--- /dev/null\n+++ b/db_test.go\n@@ -0,0 +1,6 @@\n+func TestDB(t *testing.T) {\n+\turl := os.Getenv(\"URL\")\n+\tif url == \"\" {\n+\t\tt.Skip(\"no database\")\n+\t}\n+}\n"
	if got := cheats(splitDiff(d)); len(got) != 0 {
		t.Fatalf("cheats = %q, want none", got)
	}
}

func TestCheatsAMovedTestIsNotRemoved(t *testing.T) {
	d := "diff --git a/a_test.go b/a_test.go\n--- a/a_test.go\n+++ b/a_test.go\n@@ -3,1 +3,0 @@\n-func TestMoved(t *testing.T) {\n" +
		"diff --git a/b_test.go b/b_test.go\n--- a/b_test.go\n+++ b/b_test.go\n@@ -1,0 +2,1 @@\n+func TestMoved(t *testing.T) {\n" +
		"diff --git a/c_test.go b/c_test.go\n--- a/c_test.go\n+++ b/c_test.go\n@@ -1,1 +1,0 @@\n-func TestReallyGone(t *testing.T) {\n"
	got := cheats(splitDiff(d))
	if len(got) != 1 || !strings.Contains(got[0], "removes TestReallyGone") {
		t.Fatalf("cheats = %q, want TestReallyGone alone", got)
	}
}

func TestCheatsAreCapped(t *testing.T) {
	var b strings.Builder
	b.WriteString("diff --git a/x_test.go b/x_test.go\n--- a/x_test.go\n+++ b/x_test.go\n@@ -1,0 +1,12 @@\n")
	for range 12 {
		b.WriteString("+\tt.Skip()\n")
	}
	if got := cheats(splitDiff(b.String())); len(got) != maxCheats {
		t.Fatalf("cheats = %d, want %d", len(got), maxCheats)
	}
}
```

Hand check of line numbers: in `skipDiff` the hunk starts at new line 10 with context `\ta := 1` (line 10), then the added skip is line 11. In "a removed test" the hunk is `-5,3 +5,0`, the first removed line is old line 5. In the build-tag case the added line is new line 1. `gofmt -w` will realign the map literal.

In `internal/factoryd/gates_test.go` add:

```go
// The policy gate reads the diff: a skipped or removed test is a cheat the
// workflow sends to the agent, and the gate records it.
func TestGatePolicyFlagsCheats(t *testing.T) {
	fj := &gateForgejo{files: []string{`{"filename":"x_test.go"}`}, diff: skipDiff}
	r, _, objects := newGateRunner(t, gateTask, fj)
	val, err := execActivity(t, r, ActivityGatePolicy, "t1", int64(9), "c1")
	g := getInto[PolicyGate](t, val, err)
	if len(g.Cheats) != 1 || !strings.HasPrefix(g.Cheats[0], "anti-cheat: x_test.go:11") {
		t.Fatalf("cheats = %q", g.Cheats)
	}
	if !strings.Contains(timeline(t, objects), `"cheats":["anti-cheat: x_test.go:11`) {
		t.Fatalf("the gate_policy step lacks the cheats: %s", timeline(t, objects))
	}
}
```

In `internal/factoryd/workflow_gates_test.go` add the harness field `gateSeq []PolicyGate // in order, the last repeating; empty: gate` and `policyCalls int`, replace the policy mock's `return g.gate, nil` by:

```go
			g.policyCalls++
			if len(g.gateSeq) > 0 {
				return g.gateSeq[min(g.policyCalls, len(g.gateSeq))-1], nil
			}
			return g.gate, nil
```

and add the test:

```go
// A cheat found by the policy gate goes back to the agent through the
// checks stage's rule, before the checks wait and the review start; the
// next session's findings name it.
func TestWorkflowCheatsGoBackToTheAgent(t *testing.T) {
	g := newGateHarness(t)
	g.gateSeq = []PolicyGate{
		{Class: "normal", Outcome: policy.OutcomeRequiresApproval, PolicyVersion: 7, Cheats: []string{"anti-cheat: x_test.go:11 adds a skip to a test: t.Skip(\"flaky\")"}},
		{Class: "normal", Outcome: policy.OutcomeRequiresApproval, PolicyVersion: 7},
	}
	g.onSessions(pushed("s1", "c1"), pushed("s2", "c2"))
	g.onChecks(ChecksResult{State: ChecksSuccess})
	g.signalAfter(time.Hour, SignalApproved, TaskSignal{Author: "sebastian", PR: 9})
	if final := g.run(t); final != "done" {
		t.Fatalf("final = %q", final)
	}
	if len(g.sessions) != 2 || len(g.sessions[1].Findings) != 1 || !strings.Contains(g.sessions[1].Findings[0], "adds a skip to a test") {
		t.Fatalf("sessions = %+v, want a second session holding the cheat", g.sessions)
	}
	if want := []string{"policy", "policy", "repro c2", "review c2", "approval c2", "merge"}; !slices.Equal(g.steps, want) {
		t.Fatalf("steps = %v, want %v", g.steps, want)
	}
}
```

- [ ] **Step 2: Run to verify they fail**

Run: `go test ./internal/factoryd/ -run 'Cheat' 2>&1 | tail -10`
Expected: compile FAIL, `undefined: cheats`, `unknown field Cheats`.

- [ ] **Step 3: Implement**

Create `internal/factoryd/cheat.go`:

```go
package factoryd

import (
	"cmp"
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

const maxCheats = 10

var (
	unconditionalSkip = regexp.MustCompile(`^\t\w+\.Skip(?:f|Now)?\(`)
	testFunc          = regexp.MustCompile(`^func\s+((?:Test|Benchmark|Fuzz)[\p{L}\p{N}_]*)\(`)
	buildConstraint   = regexp.MustCompile(`^//(?:go:build|\s*\+build)\s`)
	hunkHead          = regexp.MustCompile(`^@@ -(\d+)(?:,\d+)? \+(\d+)`)
)

// walkHunks calls fn with every added ('+', new line number) and removed
// ('-', old line number) line of a file's diff.
func walkHunks(text string, fn func(kind byte, line int, s string)) {
	oldLine, newLine, in := 0, 0, false
	for _, l := range strings.Split(text, "\n") {
		if m := hunkHead.FindStringSubmatch(l); m != nil {
			in = true
			oldLine, _ = strconv.Atoi(m[1])
			newLine, _ = strconv.Atoi(m[2])
			continue
		}
		if !in || l == "" {
			continue
		}
		switch l[0] {
		case '+':
			fn('+', newLine, l[1:])
			newLine++
		case '-':
			fn('-', oldLine, l[1:])
			oldLine++
		case ' ':
			oldLine++
			newLine++
		}
	}
}

// cheats are the named shapes of a diff that skips, removes or excludes a
// Go test, at most maxCheats, each a finding for the agent.
func cheats(files []fileDiff) []string {
	var out []string
	added := map[string]bool{}
	type removal struct {
		file, name string
		line       int
	}
	var removed []removal
	for _, f := range files {
		test := strings.HasSuffix(f.Path, "_test.go")
		oldTest := strings.HasSuffix(cmp.Or(f.OldPath, f.Path), "_test.go")
		isNew := strings.Contains(f.Text, "\n--- /dev/null")
		if f.OldPath != "" && oldTest && !test {
			out = append(out, fmt.Sprintf("anti-cheat: %s is renamed to %s and leaves the test suite. Keep the test file's name.", f.OldPath, f.Path))
		}
		walkHunks(f.Text, func(kind byte, line int, s string) {
			m := testFunc.FindStringSubmatch(s)
			switch {
			case kind == '+' && test && unconditionalSkip.MatchString(s):
				out = append(out, fmt.Sprintf("anti-cheat: %s:%d adds a skip to a test: %s. Make the test pass; do not skip it.", f.Path, line, strings.TrimSpace(s)))
			case kind == '+' && test && !isNew && buildConstraint.MatchString(s):
				out = append(out, fmt.Sprintf("anti-cheat: %s:%d adds a build constraint to a test file that ran on every build: %s. Keep the test in the build.", f.Path, line, strings.TrimSpace(s)))
			case kind == '+' && m != nil:
				added[m[1]] = true
			case kind == '-' && m != nil && oldTest:
				removed = append(removed, removal{f.Path, m[1], line})
			}
		})
	}
	for _, r := range removed {
		if !added[r.name] {
			out = append(out, fmt.Sprintf("anti-cheat: %s:%d (base) removes %s and the diff adds no test of that name. Restore the test or say in the code why it goes.", r.file, r.line, r.name))
		}
	}
	return out[:min(len(out), maxCheats)]
}
```

In `internal/factoryd/gates.go` add to `PolicyGate`: `Cheats []string \`json:",omitempty"\`` (doc: "the diff's anti-cheat findings (cheats): for the agent, through the checks stage's rule"). In `GatePolicy`, after the `PolicyGate` literal `g := ...` and the factory-source `if`, before the `ProjectByRepository` lookup add:

```go
	diff, err := r.forgejo.PullRequestDiff(ctx, repo.Owner, repo.Name, pr, maxForgejoAnswer)
	if err != nil {
		return PolicyGate{}, err
	}
	g.Cheats = cheats(splitDiff(diff))
```
and add `"cheats": g.Cheats` to the `gate_policy` record map.

In `internal/factoryd/workflow_stages.go` `runStages`, replace

```go
		if len(findings) == 0 {
			continue
		}
```
(the first one, right after the `noVerdict` block) with

```go
		if len(findings) == 0 {
			if s.Name == policy.StagePolicy {
				if v, stop := t.cheatFindings(g, &capped, &card); stop {
					return v
				}
			}
			continue
		}
```
and add after `onFindings`:

```go
// cheatFindings sends the policy gate's anti-cheat findings where the
// checks stage's on_findings sends its own: the policy stage's rule is fail
// by a floor and would fail the task for a skipped test.
func (t *taskRun) cheatFindings(g GateResults, capped, card *[]string) (verdict, bool) {
	if len(g.Policy.Cheats) == 0 {
		return verdict{}, false
	}
	i := slices.IndexFunc(t.cfg.Stages, func(s policy.Stage) bool { return s.Name == policy.StageChecks })
	return t.onFindings(t.cfg.Stages[i], g.Policy.Cheats, capped, card)
}
```

- [ ] **Step 4: Run the tests**

Run: `scripts/pg-test.sh go test -race ./internal/factoryd/ -run 'Cheat|GatePolicy|Workflow' 2>&1 | tail -15`
Expected: PASS. The expected steps in `TestWorkflowCheatsGoBackToTheAgent`: the first policy run returns the cheat, `onFindings` returns `stop`, no repro or review runs, a second session starts; the second pass runs `policy`, `repro c2`, `review c2`, `approval c2`, `merge`. If `repro` is absent from the harness steps for a task without a reproduction command, match the sibling test `TestWorkflowBeforeStagesFailedReproductionIsFindings` (`workflow_gates_test.go`), which lists `repro c2`.

- [ ] **Step 5: Commit**

```bash
gofmt -l internal && go vet ./internal/factoryd/ && git add internal/factoryd/cheat.go internal/factoryd/cheat_test.go internal/factoryd/gates.go internal/factoryd/gates_test.go internal/factoryd/workflow_stages.go internal/factoryd/workflow_gates_test.go
git commit -m "Policy gate: a diff that skips, removes or excludes a Go test is a finding for the agent (roadmap 64)"
git pull --rebase origin main && git push origin main && git push github main
```

---

## Task 4: The stale sweep escalates only a dead workflow (spec row 4)

Today the sweep nudges a card quiet for `StaleWindow` (30 min) and, a window after the nudge, escalates it unless `GateWatch` shows an activity of its workflow running in this process (`temporal.go:282`). `GateWatch` sees only activities this process runs and only gate activities; a workflow that waits on a dependency, a human or a timer runs no activity, so it counts as dead. On 2026-10-15 that asked a human three times for cards in `waiting-deps` (#854 to #856).

Decision: **Temporal is the liveness source.** `TemporalWorkflows.Alive` describes the workflow and answers true when its status is Running. The sweep asks once per card past the window. A running workflow clears the card's nudge memory and is left alone, in any state. A closed or missing workflow keeps today's ladder (nudge, which `SignalWithStart` turns into a restart for a failed run; escalate a window later if it is still dead). A Temporal error skips the card for this pass. `GateWatch.RunningActivity` has no other caller and goes. The sweep takes `alive func(ctx, taskID) (bool, error)` in place of `gates *GateWatch`, so tests need no Temporal.

**Files:**
- Modify: `internal/factoryd/temporal.go` (add `Alive` near `LastFailure` at 96; `StaleSweep` at 234)
- Modify: `internal/factoryd/gatewatch.go:241-258` (delete `RunningActivity`)
- Modify: `cmd/factoryd/main.go:338`
- Test: `internal/factoryd/stale_test.go`, `internal/factoryd/temporal_test.go`

**Interfaces:**
- Produces: `func (w TemporalWorkflows) Alive(ctx context.Context, taskID string) (bool, error)`; `StaleSweep(ctx, store StaleCards, wf Workflows, in *Intake, alive func(context.Context, string) (bool, error), nudged map[string]time.Time)`.

- [ ] **Step 1: Write the failing tests**

In `internal/factoryd/temporal_test.go` (imports `enumspb "go.temporal.io/api/enums/v1"` and `"go.temporal.io/api/serviceerror"` are already used by temporal.go; add to the test's imports if absent) add:

```go
func TestTemporalAliveIsARunningWorkflow(t *testing.T) {
	for name, tc := range map[string]struct {
		res  *workflowservice.DescribeWorkflowExecutionResponse
		err  error
		want bool
	}{
		"running":   {&workflowservice.DescribeWorkflowExecutionResponse{WorkflowExecutionInfo: &workflowpb.WorkflowExecutionInfo{Status: enumspb.WORKFLOW_EXECUTION_STATUS_RUNNING}}, nil, true},
		"completed": {&workflowservice.DescribeWorkflowExecutionResponse{WorkflowExecutionInfo: &workflowpb.WorkflowExecutionInfo{Status: enumspb.WORKFLOW_EXECUTION_STATUS_COMPLETED}}, nil, false},
		"failed":    {&workflowservice.DescribeWorkflowExecutionResponse{WorkflowExecutionInfo: &workflowpb.WorkflowExecutionInfo{Status: enumspb.WORKFLOW_EXECUTION_STATUS_FAILED}}, nil, false},
		"not found": {nil, serviceerror.NewNotFound("no such workflow"), false},
	} {
		t.Run(name, func(t *testing.T) {
			c := &mocks.Client{}
			c.On("DescribeWorkflowExecution", mock.Anything, "task-t1", "").Return(tc.res, tc.err)
			got, err := TemporalWorkflows{Client: c}.Alive(context.Background(), "t1")
			if err != nil || got != tc.want {
				t.Fatalf("Alive = %v, %v; want %v", got, err, tc.want)
			}
		})
	}
	c := &mocks.Client{}
	c.On("DescribeWorkflowExecution", mock.Anything, "task-t1", "").Return(nil, errors.New("frontier down"))
	if _, err := (TemporalWorkflows{Client: c}).Alive(context.Background(), "t1"); err == nil {
		t.Fatal("a Temporal outage must be an error, not a dead workflow")
	}
}
```

In `internal/factoryd/stale_test.go`: add `"t-deps": "waiting-deps"` to the status map in `newStaleRig`; add helpers and replace the last test:

```go
// workflowsRunning is the sweep's Temporal read with only ids running.
func workflowsRunning(ids ...string) func(context.Context, string) (bool, error) {
	return func(_ context.Context, id string) (bool, error) { return slices.Contains(ids, id), nil }
}

// A card whose workflow runs is left alone in any state, however quiet:
// a wait on a dependency, a human or a timer is by design. Its nudge
// memory clears. A Temporal error escalates nobody.
func TestStaleSweepLeavesALiveWorkflowAlone(t *testing.T) {
	rig := newStaleRig(t, map[string]time.Duration{"t-run": 70 * time.Minute, "t-deps": 5 * time.Hour, "t-wait": 70 * time.Minute})
	old := time.Now().Add(-StaleWindow - time.Minute)
	nudged := map[string]time.Time{"t-run": old, "t-deps": old}
	StaleSweep(context.Background(), rig.store, rig.wf, rig.in, workflowsRunning("t-run", "t-deps", "t-wait"), nudged)
	for _, id := range []string{"t-run", "t-deps"} {
		if task, _, _ := rig.store.Task(context.Background(), id); task.Status == "waiting-human" {
			t.Fatalf("%s was escalated while its workflow runs", id)
		}
		if _, ok := nudged[id]; ok {
			t.Fatalf("%s still in nudged: a running workflow clears the memory", id)
		}
	}
	if len(rig.store.intakeEvents) != 0 || len(rig.store.alerts) != 0 || len(*rig.comments) != 0 || len(rig.wf.signals) != 0 {
		t.Fatalf("the sweep acted on live workflows: %+v %v %q", rig.store.intakeEvents, *rig.comments, rig.wf.signals)
	}

	down := func(context.Context, string) (bool, error) { return false, errors.New("temporal down") }
	nudged = map[string]time.Time{"t-wait": old}
	StaleSweep(context.Background(), rig.store, rig.wf, rig.in, down, nudged)
	if task, _, _ := rig.store.Task(context.Background(), "t-wait"); task.Status != "waiting-poster" || len(rig.wf.signals) != 0 {
		t.Fatalf("t-wait = %s after %q: an unreadable Temporal must skip the card", task.Status, rig.wf.signals)
	}
}

// A dead workflow keeps the ladder: a waiting-deps card is nudged once,
// and escalated when it is still dead a window later.
func TestStaleSweepEscalatesADeadWaitingDepsCard(t *testing.T) {
	rig := newStaleRig(t, map[string]time.Duration{"t-deps": 5 * time.Hour})
	nudged := map[string]time.Time{}
	StaleSweep(context.Background(), rig.store, rig.wf, rig.in, workflowsRunning(), nudged)
	if len(rig.wf.signals) != 1 || !strings.Contains(rig.wf.signals[0], "while waiting on its dependencies") {
		t.Fatalf("signals = %q, want one nudge", rig.wf.signals)
	}
	nudged["t-deps"] = time.Now().Add(-StaleWindow - time.Minute)
	StaleSweep(context.Background(), rig.store, rig.wf, rig.in, workflowsRunning(), nudged)
	if task, _, _ := rig.store.Task(context.Background(), "t-deps"); task.Status != "waiting-human" {
		t.Fatalf("t-deps = %s, want waiting-human", task.Status)
	}
}
```

Replace every existing `StaleSweep(..., rig.in, nil, nudged)` call (lines 89, 96, 112, 191) with `StaleSweep(..., rig.in, workflowsRunning(), nudged)`, delete the old `TestStaleSweepLeavesALiveSessionAlone` (the `GateWatch` one), and add `"errors"` to the test imports. Update the comment above `TestStaleSweepEscalatesAStillQuietCard`: "with no activity of its workflow running in this process" becomes "whose workflow is dead".

- [ ] **Step 2: Run to verify they fail**

Run: `go test ./internal/factoryd/ -run 'Stale|TemporalAlive' 2>&1 | tail -10`
Expected: compile FAIL, `undefined: Alive` and wrong argument type in `StaleSweep`.

- [ ] **Step 3: Implement**

In `internal/factoryd/temporal.go` add after `LastFailure`:

```go
// Alive: the task's workflow is running now. A workflow that is missing,
// completed, failed or terminated is not; a Temporal error is an error.
func (w TemporalWorkflows) Alive(ctx context.Context, taskID string) (bool, error) {
	res, err := w.Client.DescribeWorkflowExecution(ctx, WorkflowID(taskID), "")
	var missing *serviceerror.NotFound
	if errors.As(err, &missing) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return res.GetWorkflowExecutionInfo().GetStatus() == enumspb.WORKFLOW_EXECUTION_STATUS_RUNNING, nil
}
```

Change `StaleSweep`'s doc and signature. Doc: replace "and one still quiet a window after its nudge, with no activity of its workflow running here (GateWatch, the gates' own liveness), is escalated" with "and one still quiet a window after its nudge is escalated; a card whose workflow Temporal reports running (alive) is never nudged or escalated, in any state, since a quiet wait is by design" and the signature `alive func(ctx context.Context, taskID string) (bool, error)` in place of `gates *GateWatch`. In the per-card loop replace the block from `nudge, ok := nudged[t.ID]` through the end of the `switch` with:

```go
			quiet := time.Since(at)
			if quiet >= StaleWindow {
				up, err := alive(ctx, t.ID)
				if err != nil {
					log.Printf("stale sweep: is the workflow of task %s alive: %v", t.ID, err)
					continue
				}
				if up {
					delete(nudged, t.ID)
					continue
				}
			}
			nudge, ok := nudged[t.ID]
			switch {
			case quiet < StaleWindow:
				// it reported: the ring comes off and the rungs start over
				delete(nudged, t.ID)
			case !ok:
				state, _ := staleNames(t.Status)
				sig := TaskSignal{Author: FactoryDecider, Body: fmt.Sprintf("quiet for %s while %s", staleDuration(quiet), state)}
				if err := wf.Signal(ctx, t.ID, SignalStaleNudge, sig); err != nil {
					log.Printf("stale sweep: nudge task %s: %v", t.ID, err)
					continue
				}
				nudged[t.ID] = time.Now()
			case time.Since(nudge) < StaleWindow:
				// the nudge's grace: the workflow has a window to answer
			default:
				if err := escalateStale(ctx, store, in, t, quiet); err != nil {
					log.Printf("stale sweep: escalate task %s: %v", t.ID, err)
					continue
				}
				delete(nudged, t.ID)
			}
```

Delete `GateWatch.RunningActivity` (`gatewatch.go:241-258`, its comment included). In `cmd/factoryd/main.go:338` call `factoryd.StaleSweep(ctx, store, workflows, webhookIntake, inner.Alive, nudged)`; if `gates` is then unused in `main` the compiler says so: it is used by the interceptor at line 141, so it stays.

- [ ] **Step 4: Run the tests**

Run: `scripts/pg-test.sh go test -race ./internal/factoryd/ ./cmd/factoryd/ 2>&1 | tail -15`
Expected: PASS. `go vet ./...` must report no unused import in `gatewatch.go` (`strings` is still used there, check).

- [ ] **Step 5: Commit**

```bash
gofmt -l . && go vet ./... && git add internal/factoryd/temporal.go internal/factoryd/temporal_test.go internal/factoryd/stale_test.go internal/factoryd/gatewatch.go cmd/factoryd/main.go
git commit -m "Stale sweep: Temporal says whether the workflow runs, and a running one is never nudged or escalated, in any state"
git pull --rebase origin main && git push origin main && git push github main
```

---
## Task 5: A cancelled call is priced from LiteLLM's spend log (spec row 5)

What happens today. When the caller leaves, the gateway either gets a transport error from `s.http.Do` (cancel before the answer's headers, `server.go:728-731`) or a stream that breaks off (`server.go:773-797`: "a stream the client broke off never shows [its cost], and books the hold"). Both call `finish(c, nil, ...)`, which books the full hold (`server.go:683-704`). On card #854 the hold was 0.0716 EUR, the whole headroom, for a call that never got an answer.

What the provider side offers. The factory's key is a LiteLLM virtual key and LiteLLM writes one `LiteLLM_SpendLogs` row per call with `spend`, readable through its admin API (`GET /spend/logs/v2`, filters `api_key` as the hashed token and `start_date`; the docs show `metadata.spend_logs_metadata` in the row). A header `x-litellm-spend-logs-metadata: {"hold_id": N}` on the upstream request lands in that field, so the gateway can find its own call. Whether LiteLLM writes a row at all for a request whose client left depends on the version: partial-stream billing on disconnect landed upstream for chat completions (BerriAI/litellm PR 33736, issue 14457), and other paths still lose the row (issues 35958, 44742). **The plan does not assume a row exists.** The decision per outcome:

| Spend log read | Booked | Audit row (`client_canceled`) |
|---|---|---|
| row(s) found for the hold id | their summed `spend` | `caller left; priced from LiteLLM's spend log: <cost> EUR` |
| readable, no row after the wait | 0, hold released | `caller left; no spend record for the call: booked 0 EUR` |
| not readable (LiteLLM down, error, no client configured) | the full hold, as today | `caller left; spend log unreadable (<error>): cost not reported, booked the hold <hold> EUR` |

LiteLLM writes spend rows in batches, so the gateway polls: `SettleWait` 45 s at `SettleEvery` 5 s by default. The handler for the gone caller waits; the hold stays open meanwhile, and a restart of the gateway in that window leaves it to `SweepHolds`, which books it in full after `HoldTTL`. A call that never reached a provider (cancel while minting the key) stays as it is: zero, released.

Step 1 is a probe against the live LiteLLM, because the row's shape and whether it exists for a cancel are facts about the deployed version that this plan could not run. **The probe was not run when this plan was written.**

**Files:**
- Modify: `internal/gateway/server.go` (`ServerOptions` at 70, `modelCall` at 647, `finish` at 683, `proxy` at 706)
- Modify: `internal/gateway/litellm.go` (add `SpendLog`, `CallSpend`)
- Modify: `cmd/factory-gateway/main.go:80-90`
- Test: `internal/gateway/server_test.go` (rewrite `TestChatClientCanceledDuringUpstreamAnswers499` at 2009), `internal/gateway/litellm_test.go`

**Interfaces:**
- Produces: `type SpendLog interface{ CallSpend(ctx context.Context, key string, holdID int64, since time.Time) (cost float64, found bool, err error) }`, `(*LiteLLM).CallSpend`, `ServerOptions.Spend SpendLog`, `ServerOptions.SettleWait, SettleEvery time.Duration`, `(*Server).settleCanceled(c *modelCall)`, `modelCall.note string`.

- [ ] **Step 1: Probe the deployed LiteLLM**

With cluster access, port-forward LiteLLM and use a task-shaped key (mint one with `/key/generate` and `models: ["tier-low"]`). Send a streaming call tagged with a hold id and kill it after the first chunk, and a second one cancelled before any chunk:

```bash
KEY=sk-...   # the minted key
curl -sN localhost:4000/v1/chat/completions -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
  -H 'x-litellm-spend-logs-metadata: {"hold_id": 990001}' \
  -d '{"model":"tier-low","stream":true,"stream_options":{"include_usage":true},"messages":[{"role":"user","content":"count to 200 slowly"}]}' | head -c 400
sleep 40
HASH=$(printf %s "$KEY" | sha256sum | cut -d' ' -f1)
curl -s -H "Authorization: Bearer $MASTER" "localhost:4000/spend/logs/v2?api_key=$HASH&start_date=$(date -u -d '-10 min' '+%Y-%m-%d %H:%M:%S')&page_size=20" | jq .
```
Record: (a) whether a row with `metadata.spend_logs_metadata.hold_id == 990001` appears and its `spend`, (b) the JSON keys of a row. If the keys differ from `data[].spend` and `data[].metadata.spend_logs_metadata.hold_id`, change the `spendLogs` struct in Step 4 and the fixture in `litellm_test.go` to match. If the query parameters differ, change them in `CallSpend` only. If no row ever appears for a cancelled call, the code still ships: the second row of the table above is then the path every cancel takes, and the plan's claim that the book is zero rests on that observation. Put the observation in the commit message.

- [ ] **Step 2: Write the failing tests**

In `internal/gateway/litellm_test.go` add:

```go
func TestLiteLLMCallSpendSumsTheRowsOfAHold(t *testing.T) {
	var gotQuery, gotAuth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotQuery, gotAuth = r.URL.RawQuery, r.Header.Get("Authorization")
		io.WriteString(w, `{"data":[
			{"spend":0.01,"metadata":{"spend_logs_metadata":{"hold_id":7}}},
			{"spend":0.02,"metadata":{"spend_logs_metadata":{"hold_id":7}}},
			{"spend":0.5,"metadata":{"spend_logs_metadata":{"hold_id":8}}},
			{"spend":0.7,"metadata":{}}]}`)
	}))
	defer srv.Close()
	l := &LiteLLM{BaseURL: srv.URL, MasterKey: "master"}
	since := time.Date(2026, 10, 15, 10, 0, 30, 0, time.UTC)
	cost, found, err := l.CallSpend(context.Background(), "sk-task", 7, since)
	if err != nil || !found || cost != 0.03 {
		t.Fatalf("CallSpend = %v, %v, %v; want 0.03, true", cost, found, err)
	}
	sum := sha256.Sum256([]byte("sk-task"))
	want := "api_key=" + hex.EncodeToString(sum[:]) + "&page_size=100&start_date=2026-10-15+09%3A59%3A30"
	if gotQuery != want || gotAuth != "Bearer master" {
		t.Fatalf("query = %q, auth = %q; want %q", gotQuery, gotAuth, want)
	}
	if _, found, err := l.CallSpend(context.Background(), "sk-task", 99, since); err != nil || found {
		t.Fatalf("an unknown hold = %v, %v; want not found", found, err)
	}
}

func TestLiteLLMCallSpendErrors(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusBadGateway) }))
	defer srv.Close()
	if _, _, err := (&LiteLLM{BaseURL: srv.URL}).CallSpend(context.Background(), "k", 1, time.Now()); err == nil {
		t.Fatal("a 502 must be an error")
	}
}
```
(Hand check of `start_date`: `since` 10:00:30 UTC minus one minute is `09:59:30`; `url.Values.Encode` sorts keys, `+` for the space, `%3A` for the colons.) Add the imports `crypto/sha256`, `encoding/hex`, `io`, `net/http`, `net/http/httptest`, `time` as the file needs.

In `internal/gateway/server_test.go` add the fake and a helper, and replace the body of `TestChatClientCanceledDuringUpstreamAnswers499`:

```go
type fakeSpend struct {
	mu      sync.Mutex
	cost    float64
	foundAt int // the Nth read finds the row; 0: never
	err     error
	holds   []int64
}

func (f *fakeSpend) CallSpend(_ context.Context, _ string, holdID int64, _ time.Time) (float64, bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.holds = append(f.holds, holdID)
	if f.err != nil {
		return 0, false, f.err
	}
	return f.cost, f.foundAt > 0 && len(f.holds) >= f.foundAt, nil
}

// canceledCall sends a call whose caller leaves while the provider works
// on it, settled through spend; stream sends it as a stream whose first
// chunk arrived. It returns the store, the answer and the metadata header
// the upstream saw.
func canceledCall(t *testing.T, spend *fakeSpend, stream bool) (*memStore, *httptest.ResponseRecorder, string) {
	t.Helper()
	started := make(chan struct{})
	var tag atomic.Value
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		io.ReadAll(r.Body) // #nosec G104 -- a real upstream reads the body too
		tag.Store(r.Header.Get("X-Litellm-Spend-Logs-Metadata"))
		if stream {
			w.Header().Set("Content-Type", "text/event-stream")
			io.WriteString(w, "data: {\"choices\":[{\"delta\":{\"content\":\"a\"}}]}\n\n")
			w.(http.Flusher).Flush()
		}
		close(started)
		<-r.Context().Done()
	}))
	t.Cleanup(up.Close)
	store := newMemStore(Task{Classes: coder, ModelAlias: "coding-cheap", ID: "42", BudgetEUR: 10, SpentEUR: 2, Status: "running"})
	s := NewServer(ServerOptions{
		Auth:       fakeAuth{id: Identity{Subject: "system:serviceaccount:factory:task-42", Namespace: "factory", TaskID: "42", SAUID: "sa-uid-1"}},
		Store:      store,
		Minter:     &fakeMinter{},
		LiteLLMURL: up.URL,
		Prices:     testPrices,
		Spend:      spend,
		SettleWait: 200 * time.Millisecond, SettleEvery: time.Millisecond,
	})
	body := chatBody("coding-cheap")
	if stream {
		body = strings.Replace(body, `"model"`, `"stream":true,"model"`, 1)
	}
	ctx, cancel := context.WithCancel(context.Background())
	r := httptest.NewRequest("POST", "/v1/chat/completions", strings.NewReader(body)).WithContext(ctx)
	r.Header.Set("Content-Type", "application/json")
	r.Header.Set("Authorization", "Bearer forged-but-fakeAuth-ignores")
	rr := httptest.NewRecorder()
	done := make(chan struct{})
	go func() {
		s.Routes("test").ServeHTTP(rr, r)
		close(done)
	}()
	select {
	case <-started:
	case <-time.After(5 * time.Second):
		t.Fatal("the fake litellm never received the call")
	}
	cancel()
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("the handler never returned after the client cancelled")
	}
	got, _ := tag.Load().(string)
	return store, rr, got
}
```

Keep the old test's name and assertions on 499, the `client_canceled` header and last audit row, and no open hold, but build it on `canceledCall` and replace its spend assertion:

```go
func TestChatClientCanceledDuringUpstreamAnswers499(t *testing.T) {
	store, rr, _ := canceledCall(t, &fakeSpend{}, false)
	if rr.Code != 499 || rr.Header().Get(HeaderDecision) != "client_canceled" {
		t.Fatalf("status %d, decision %q, want 499 client_canceled", rr.Code, rr.Header().Get(HeaderDecision))
	}
	audits := store.auditRows()
	if last := audits[len(audits)-1]; last.Decision != "client_canceled" {
		t.Fatalf("audit decision = %q, want client_canceled (all rows %+v)", last.Decision, audits)
	}
	if n := store.openHolds(); n != 0 {
		t.Fatalf("%d holds left open, want every hold released", n)
	}
}

// LiteLLM wrote a row for the cancelled call, a little late: the call is
// booked at that spend, not at its hold, and the upstream saw the hold id.
func TestCanceledCallIsPricedFromTheSpendLog(t *testing.T) {
	for name, stream := range map[string]bool{"before any answer": false, "mid-stream": true} {
		t.Run(name, func(t *testing.T) {
			spend := &fakeSpend{cost: 0.05, foundAt: 3}
			store, rr, tag := canceledCall(t, spend, stream)
			if rr.Code != 499 && !stream {
				t.Fatalf("status = %d, want 499", rr.Code)
			}
			if got, ok := store.spentOf("42"); !ok || got != 2.05 {
				t.Fatalf("spent = (%v, %v), want (2.05, true)", got, ok)
			}
			if len(spend.holds) != 3 || tag != fmt.Sprintf(`{"hold_id":%d}`, spend.holds[0]) {
				t.Fatalf("reads %v, upstream tag %q; want 3 reads of the tagged hold", spend.holds, tag)
			}
			audits := store.auditRows()
			last := audits[len(audits)-1]
			if last.Decision != "client_canceled" || last.Reason != "caller left; priced from LiteLLM's spend log: 0.050000 EUR" {
				t.Fatalf("audit = %+v", last)
			}
			if n := store.openHolds(); n != 0 {
				t.Fatalf("%d holds left open", n)
			}
		})
	}
}

// No spend row after the wait: nothing was billed, so nothing is booked,
// and the audit row says so.
func TestCanceledCallWithNoSpendRecordBooksNothing(t *testing.T) {
	store, _, _ := canceledCall(t, &fakeSpend{}, false)
	if _, ok := store.spentOf("42"); ok {
		t.Fatal("spent updated, want untouched")
	}
	audits := store.auditRows()
	if last := audits[len(audits)-1]; last.Decision != "client_canceled" || last.Reason != "caller left; no spend record for the call: booked 0 EUR" {
		t.Fatalf("audit = %+v", last)
	}
	if n := store.openHolds(); n != 0 {
		t.Fatalf("%d holds left open, want the hold released", n)
	}
}

// An unreadable spend log is no proof of no spend: the hold is booked in
// full, as before.
func TestCanceledCallWithAnUnreadableSpendLogBooksTheHold(t *testing.T) {
	store, _, _ := canceledCall(t, &fakeSpend{err: errors.New("litellm down")}, false)
	if got, ok := store.spentOf("42"); !ok || got != 2.131204 {
		t.Fatalf("spent = (%v, %v), want (2.131204, true): the hold of 132 input tokens at 1e-6 and 32768 output tokens at 4e-6", got, ok)
	}
	audits := store.auditRows()
	want := "caller left; spend log unreadable (litellm down): cost not reported, booked the hold 0.131204 EUR"
	if last := audits[len(audits)-1]; last.Reason != want {
		t.Fatalf("reason = %q, want %q", last.Reason, want)
	}
}
```
Add `sync/atomic` and `errors` to the imports if absent. The 2.131204 and 0.131204 figures are the existing test's own (`server_test.go:2072-2075`).

- [ ] **Step 3: Run to verify they fail**

Run: `scripts/pg-test.sh go test ./internal/gateway/ -run 'Canceled|CallSpend' 2>&1 | tail -10`
Expected: compile FAIL, `unknown field Spend in struct literal` and `undefined: SpendLog`.

- [ ] **Step 4: Implement**

`internal/gateway/litellm.go` (add imports `crypto/sha256`, `encoding/hex`, `net/url`, `strconv` as needed):

```go
// SpendLog reads what LiteLLM booked for one call of a virtual key.
type SpendLog interface {
	// CallSpend sums the spend rows of key's calls tagged with holdID
	// since since; found: at least one row exists.
	CallSpend(ctx context.Context, key string, holdID int64, since time.Time) (cost float64, found bool, err error)
}

type spendLogs struct {
	Data []struct {
		Spend    float64 `json:"spend"`
		Metadata struct {
			Tag struct {
				HoldID int64 `json:"hold_id"`
			} `json:"spend_logs_metadata"`
		} `json:"metadata"`
	} `json:"data"`
}

// CallSpend reads /spend/logs/v2 for the key (LiteLLM keys its rows by the
// token's SHA-256) from a minute before since. The gateway tags every
// upstream call with {"hold_id": N} in x-litellm-spend-logs-metadata.
func (l *LiteLLM) CallSpend(ctx context.Context, key string, holdID int64, since time.Time) (float64, bool, error) {
	sum := sha256.Sum256([]byte(key))
	q := url.Values{"api_key": {hex.EncodeToString(sum[:])}, "page_size": {"100"},
		"start_date": {since.UTC().Add(-time.Minute).Format("2006-01-02 15:04:05")}}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, l.BaseURL+"/spend/logs/v2?"+q.Encode(), nil)
	if err != nil {
		return 0, false, err
	}
	req.Header.Set("Authorization", "Bearer "+l.MasterKey)
	res, err := l.client().Do(req)
	if err != nil {
		return 0, false, fmt.Errorf("spend logs: %w", err)
	}
	defer res.Body.Close()
	body, err := io.ReadAll(io.LimitReader(res.Body, 4<<20))
	if err != nil {
		return 0, false, fmt.Errorf("spend logs: %w", err)
	}
	if res.StatusCode != http.StatusOK {
		return 0, false, fmt.Errorf("spend logs: status %d: %s", res.StatusCode, textutil.Truncate(string(body), 200))
	}
	var rows spendLogs
	if err := json.Unmarshal(body, &rows); err != nil {
		return 0, false, fmt.Errorf("spend logs: %w", err)
	}
	var cost float64
	found := false
	for _, r := range rows.Data {
		if r.Metadata.Tag.HoldID == holdID {
			cost, found = cost+r.Spend, true
		}
	}
	return cost, found, nil
}
```
(If the gateway package does not import `internal/textutil` yet, cut the body with `string(body[:min(len(body), 200)])` instead.) The test sums `0.01 + 0.02` as a float: it equals `0.03` exactly in float64 (`0.01+0.02 = 0.03` holds); if the compiler's constant arithmetic differs, compare with a `1e-12` tolerance.

`internal/gateway/server.go`:

1. `ServerOptions`, after `FactorydToken`:
```go
	// Spend prices a call whose caller left from LiteLLM's spend log; the
	// read waits SettleWait (45s) at SettleEvery (5s) for a row.
	Spend       SpendLog
	SettleWait  time.Duration
	SettleEvery time.Duration
```
2. `modelCall`: add `note string // why finish booked what it did, on the audit row`.
3. `finish`:
```go
	reason := c.note
	if cost == nil {
		reason = fmt.Sprintf("cost not reported, booked the hold %.6f EUR", c.hold.EUR)
		if c.note != "" {
			reason = c.note + ": " + reason
		}
	}
```
4. New code after `finish`:
```go
const (
	defaultSettleWait  = 45 * time.Second
	defaultSettleEvery = 5 * time.Second
)

// settleCanceled books a call whose caller left, from LiteLLM's spend log:
// the rows' sum when they appear within the wait, zero when the log is
// readable and holds none, the full hold when it cannot be read. It audits
// the call as client_canceled.
func (s *Server) settleCanceled(c *modelCall) {
	wait, every := cmp.Or(s.opts.SettleWait, defaultSettleWait), cmp.Or(s.opts.SettleEvery, defaultSettleEvery)
	deadline := time.Now().Add(wait)
	var cost *float64
	var readErr error
	for {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		v, found, err := s.readSpend(ctx, c)
		cancel()
		readErr = err
		if found {
			cost, c.note = &v, fmt.Sprintf("caller left; priced from LiteLLM's spend log: %.6f EUR", v)
			break
		}
		if time.Now().After(deadline) {
			break
		}
		time.Sleep(every)
	}
	switch {
	case cost != nil:
	case readErr != nil:
		c.note = fmt.Sprintf("caller left; spend log unreadable (%v)", readErr)
	default:
		cost, c.note = zeroCost, "caller left; no spend record for the call: booked 0 EUR"
	}
	s.finish(c, cost, "client_canceled")
}

func (s *Server) readSpend(ctx context.Context, c *modelCall) (float64, bool, error) {
	if s.opts.Spend == nil {
		return 0, false, errors.New("no spend log configured")
	}
	return s.opts.Spend.CallSpend(ctx, c.key.key, c.hold.ID, c.started)
}
```
Add `cmp` to the imports. A nil `Spend` is the unreadable row: the hold is booked, never zero.

5. In `proxy`, after `upReq.Header.Set("Authorization", ...)`:
```go
		upReq.Header.Set("X-LiteLLM-Spend-Logs-Metadata", fmt.Sprintf(`{"hold_id":%d}`, c.hold.ID))
```
and replace the transport-error block:
```go
		res, err := s.http.Do(upReq)
		if err != nil {
			if r.Context().Err() != nil {
				s.settleCanceled(c)
				w.Header().Set(HeaderDecision, "client_canceled")
				writeError(w, statusClientCanceled, "client_canceled", err.Error())
				return
			}
			// the provider may have run part of the call: book the hold
			s.finish(c, nil, "")
			s.refuse(w, c.pid, c.task.ID, c.kind, "error_upstream", err.Error(), c.alias, http.StatusBadGateway, "upstream_error")
			return
		}
```
and the end of the success path, before `s.finish(c, cost, "allowed")`:
```go
		if cost == nil && r.Context().Err() != nil {
			s.settleCanceled(c)
			return
		}
```
Update the comment above the stream branch: "a stream the client broke off never shows it: the spend log prices it (settleCanceled)".

6. `cmd/factory-gateway/main.go`: add `Spend: lite,` beside `Minter: lite,` (line 85).

- [ ] **Step 5: Run the gateway tests**

Run: `scripts/pg-test.sh go test -race ./internal/gateway/... 2>&1 | tail -15`
Expected: PASS. Other tests that cancel (`TestKeyMintClientCanceledAnswers499`, the rekey one at `server_test.go:2200`) stay green: they never reach a provider, or they book a priced first call, and they do not go through `settleCanceled`. If the rekey test's final cancel now routes through the new path (it cancels during the mint of the retry, `finish(c, zeroCost, "")`), it does not: that branch is unchanged.

- [ ] **Step 6: Commit**

```bash
gofmt -l . && go vet ./... && git add internal/gateway cmd/factory-gateway/main.go
git commit -m "Gateway: a call whose caller left is priced from LiteLLM's spend log; no record books zero, an unreadable log books the hold"
git pull --rebase origin main && git push origin main && git push github main
```

---

## Task 6: Architecture notes (docs repo)

**Files:** Modify `/home/womb/repos/ai-software-factory/docs/architecture.md`.

- [ ] **Step 1: Edit the four passages**

1. Line 2681-2684 ("The review per part"): replace "The model review and the audit read a diff per file in up to three parts" with "The model review reads a diff in one call when it fits `limits.review_diff_kib`, else per file in up to three parts of that size, and each part's call reads the names the other parts add; the audit reads parts of 48 KiB".
2. Line 3871-3874 (Model review, Stage 16): replace "packs at most three parts of 48 KiB, makes one call per part and combines the verdicts. Each part sees the whole file list." with "packs the files into one call up to `limits.review_diff_kib` (48 KiB when absent), else at most three parts of that size, one call each, and combines the verdicts. Each part sees the whole file list and the functions, types, routes and selectors the other parts add." Add after the "(Ruling 263)" sentence: "A finding that claims a name is undefined or uncalled carries a claim (kind, symbol); `git grep` at the head and at main checks it, and a finding the grep contradicts is dropped by code and recorded with file and line on the review, the timeline and the pull request. A drop never turns `concerns` into `approve`."
3. Line 3532 table row for ModelReview: no change (the bound still follows the parts).
4. Line 1681-1687 (the gateway's `client_canceled`): replace "and keeps the hold's booking, since the provider may have run part of the call" with "and prices the call from LiteLLM's spend log, which the gateway finds by the hold id it sends in `x-litellm-spend-logs-metadata`: the rows' spend when they appear within 45 s, zero with an audit row that says no record exists, the full hold when the log cannot be read".
5. Find the stale sweep passage with `grep -n -i 'quiet\|nudge' docs/architecture.md` and state that the sweep reads the workflow's liveness from Temporal and escalates a dead run only. Add a sentence on the anti-cheat shapes where the policy gate is described (`grep -n 'policy gate' docs/architecture.md`): "The policy gate also reads the diff for four Go shapes (an unconditional `t.Skip` added, a removed `Test` function, a build constraint added to an old test file, a test file renamed away) and returns them as findings for the agent; it catches these shapes only."

- [ ] **Step 2: Commit**

```bash
cd /home/womb/repos/ai-software-factory && git add docs/architecture.md
git commit -m "architecture: whole-diff review, claim grep, anti-cheat shapes, Temporal liveness in the stale sweep, spend-log pricing of cancelled calls"
git pull --rebase origin master && git push origin master && git push github master
```

---

## Final verification (after Task 6)

- [ ] In the code repo: `bash check`. Expected exit 0 (vet, gofmt, gosec, `make test`).
- [ ] `scripts/pg-test.sh go test -race ./internal/factoryd/ ./internal/gateway/... ./internal/policy/...` Expected `ok` for all three.
- [ ] Remove the worktrees and prune: `git worktree remove <path>; git worktree prune` in each repo.
- [ ] State in the report what was not verified: the live LiteLLM probe (Task 5 Step 1), the live `max_input_tokens` (Task 1 Step 9), and the rollout order of the infra key.

## Self-review

- Spec coverage: row 1 Task 2; row 2 Task 1; row 3 Task 3; row 4 Task 4; row 5 Task 5. The "decide structured field or pattern" decision is in Task 2's lead; the "no record means release and zero with an audit row" is in Task 5's table; "catches named shapes only" is in Task 3's lead.
- Placeholders: none. Two steps depend on a live system the author could not reach (Task 1 Step 9, Task 5 Step 1); each says what to record and what to change if the observation differs.
- Type names: `Claim`, `Dropped`, `grepHit`, `namedRef`, `applyClaims`, `contradiction`, `removesSymbol`, `gitGrep`, `checkoutRefs` (returns `dir, refs, cleanup, err`), `cheats`, `PolicyGate.Cheats`, `ReviewDiffBytes`, `othersOf`, `Alive`, `SpendLog.CallSpend`, `settleCanceled` are used with one signature across tasks. `TestModelReviewDropsAFindingTheGrepContradicts` replaces `checkoutRefs` with the four-value signature.
