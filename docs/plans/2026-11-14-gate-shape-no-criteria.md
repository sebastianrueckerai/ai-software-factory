# The gate's shape: no criteria where no card can run them

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A plan on a process shape without an integration card can hold criteria no card ever runs, ending in the unsettleable criteria gap card plan #1878 closed for the mainline. Filing refuses criteria on such a shape.

**Architecture:** `criteriaFindings` already receives the plan shape and already conditions its rules on `shape.Integration`; the gate (`GateCriteria` via `CriteriaCard`) runs only on a plan's integration card or a delta card. The refusal belongs beside the existing criteria-count rule. One finding, one test file. No legacy break: stored revisions decode and are never re-judged, per #1889's confirmed rule.

**Tech Stack:** Go factoryd, existing fixture plans in plan_test.go.

**Spec:** issue #1878's class closure; internal/factoryd/plan.go criteriaFindings; internal/factoryd/criteria.go CriteriaCard.

## Global Constraints

- One finding, named by construction: the refusal says why (no card of this shape can run the criteria gate), not merely what.
- Stored revisions of integration-less plans that already hold criteria stay legal to decode and are never re-judged (the #1889 legacy rule).
- No change to the shipped shape (integration: true): every existing plan and test stays clean.

### Task 1: The filing refuses criteria no gate can run

**Files:**
- Modify: internal/factoryd/plan.go (criteriaFindings, beside the criteria-count rule at its top)
- Test: internal/factoryd/plan_test.go

- [ ] **Step 1: Write the failing test** `TestFilingRefusesCriteriaOnAnIntegrationLessShape`: a plan with one kind test criterion (suite and name set, carried by a card whose directories hold the suite) filed on a shape with `Integration: false` yields exactly one finding — `plan: criteria want an integration card: no card of this plan runs the criteria gate` — and the same plan with no criteria stays clean.
- [ ] **Step 2: Verify it fails** — today the plan passes with 0 findings.
- [ ] **Step 3: Add the rule** in criteriaFindings: `if !shape.Integration && len(p.Criteria) > 0 { out = append(out, "plan: criteria want an integration card: no card of this plan runs the criteria gate") }`.
- [ ] **Step 4: Run** `go test ./internal/factoryd` and `bash check`; every existing carry, citation and shape test stays green.
- [ ] **Step 5: Commit** "A shape without an integration card refuses criteria: no card of it can run the gate".

### Task 2: The legacy decode path stays open

**Files:**
- Test: internal/factoryd/plan_test.go

- [ ] **Step 1: Write the test** `TestStoredIntegrationLessCriteriaDecode`: a stored revision holding criteria on an integration-less shape decodes without findings (the never-re-judged rule), and only a newly filed plan is refused.
- [ ] **Step 2: Verify it passes** with Task 1's rule in place; if it fails, Task 1's rule sits on the wrong side of the decode/file boundary — move it, never the assertion.
- [ ] **Step 3: Commit** "Stored revisions of integration-less plans stay legal to decode".

## Not this plan's work

- R1 (legacy suiteless in-flight plans) and R2 (judgement/human/hold-out prover path): owner-ruled in plan #1878's answers; not re-argued here.
- The already-ended plans #1837/#1807: covered by cards #1872/#1877.
