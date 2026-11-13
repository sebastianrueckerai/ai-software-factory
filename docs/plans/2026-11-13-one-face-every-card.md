# One face for every card: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every kind of card that can appear on the board renders one decision at a time in the five-part shape, with depth folded behind it, terms explained, and nothing on the face the decision does not need.

**Architecture:** The case face (CaseFace: Ask, Money, Why, Info, Recommendation, Source; premade buttons; the one fund control; the note; the carousel) already exists and already renders case cards. This plan extracts its decision block into one shared template partial and converts every other asking face to it, sweeps the non-asking faces for the whisper rule, and pins the whole surface with one conformance test. No new design is invented; the confirmed decisions C42, C44 and C45 stand.

**Tech Stack:** Go console (html/template), existing rig tests in internal/console.

**Spec:** the card-flow redesign's sections 5.7 and 5.8 and its decisions of 2026-11-02 ([card-flow-redesign-2026-11-02.md](../card-flow-redesign-2026-11-02.md)); the UX baseline ([ai-software-factory-ux-conversation.md](../ai-software-factory-ux-conversation.md): progressive disclosure, "Normal states whisper. Exceptional states speak.", the Needs-you inbox explains its ask); the board spec ([board/proposal-v2.md](../board/proposal-v2.md) and its open-deviation list, [board/report-final.md](../board/report-final.md)); the needs-you analysis ([needs-you-analysis-2026-11-01.md](../../needs-you-analysis-2026-11-01.md), complaints 1, 3, 5, 6, 7); the ask-press rule ([ask-press-plan-2026-10-31.md](../ask-press-plan-2026-10-31.md)); the confirmed chrome ([design/design-decisions.md](../../design/design-decisions.md) C42, C44, C45). Issue #1837's view rebuild lands first; task 5 builds on what it lands.

## Global Constraints

- One decision at a time per card: the face renders one ask, its premade answers one button each with its effect in one line, the recommended first, plus exactly one fund control and one note box, and one send applies decision, draw and note together (redesign 5.8 part 5; incidents I3: the label is the call).
- No sixth part. The five parts are: the ask with numbers, the why, what the call needs, the recommendation with its source, premade answers.
- The reader dropped in cold: every part names its terms at first use; no factory jargon without its one-line explanation (redesign 5.8).
- Money never replaces the problem. The problem line leads; the money fact renders under it (redesign 5.7; analysis complaint 3).
- No press shows a confirmation line; the card's place and state are the answer (C42).
- Every Needs-you card opens on C44's amber band and closes on its carousel; criterion rows stay exactly as C45 built them.
- The face never deletes information: what leaves the face moves behind exactly one click (the drawer, a details fold, or the card's life).
- A form control on a face exists only when a decision needs it. No face holds a free-text field an answer button does not need.
- Colour and word together, never colour alone; spend stays muted until 80 percent of budget; normal states whisper, exceptional states speak (proposal-v2).
- A human is called a human in every string a template renders (project CLAUDE.md).
- Brief bounds: 600 characters for the brief, 4000 for the detail; a question's text is bounded at its writer (redesign 5.8).
- No new columns, no new states: the board stays a view over the task states (proposal-v2).

## Review Focus

1. **A refusal naming decisions the face does not show** (yesterday's fault, generalized): every refusal's named actions must be reachable on the face that refused. Pinned by Task 7's conformance test rendering each kind with its refusal text.
2. **Two forms posting two halves of one answer**: the one-send contract breaks if decision, draw and note post separately. Pinned by Task 1's control-count test and Task 7's per-kind form assertions.
3. **Long content blowing the column**: findings, proofs and plan text over 2000 bytes on a face. Pinned by Task 1's fold test and Task 7's pre-count assertion.
4. **A typed message silently resolving a bound ask** (the ask-press fault). Pinned by Task 6.
5. **Colour-only state** on pills and meters. Pinned by Task 5's word-plus-class assertions.

---

### Task 1: The merge card asks one decision, one send

The merge approval card (template `approval` board.html:225-238, the merge branch) shows Approve, Re-run, a deny box with radios and a textarea, and the opened proofs as `pre` on the face. Convert it to the five-part shape.

**Files:**
- Modify: `internal/console/templates/board.html` (extract `{{define "decide"}}` from today's `case-decide` block board.html:139-155; merge branch 225-238)
- Modify: `internal/console/approvals.go` (approvalCard merge branch)
- Test: `internal/console/merge_face_test.go`

**Interfaces:**
- Produces: `decideView` (struct in cases.go, next to caseRow): `Post string; Premades []premadeView; Fund, Note bool` where `premadeView{Label, Effect string; Recommended bool; Args []offerArg}` reuses today's premade row shape. The `decide` template partial renders it with the card's CSRF, Filter and IDSuffix. Tasks 2 and 3 consume the same define.

- [ ] **Step 1: Write the failing test** `TestMergeCardHoldsOneSendDecision`: a merge approval rig renders the face; assert the brief's ask line leads, exactly one Approve premade and one Deny premade render (the recommended first), the deny's press opens C42's redirect box whose empty submit cancels, one fund control, one note box, and no `pre` on the face (opened proofs behind a `details` fold whose summary names the count).
- [ ] **Step 2: Run it to verify it fails** — `go test -run TestMergeCardHoldsOneSendDecision ./internal/console/` fails with the old markup.
- [ ] **Step 3: Extract the `decide` partial** and convert the merge branch to a `decideView`: the review's summary maps to the why, the brief to what the call needs, the review's verdict to the recommendation with its source named.
- [ ] **Step 4: Run the merge and approval tests** — the new test passes; `TestAPlansCaseHoldsItsApprovalOnce` and the criteria tests still pass.
- [ ] **Step 5: Commit** "The merge card asks one decision, one send".

### Task 2: The resource card asks one decision

The resource approval card (board.html:238-243) shows Promote and Release beside each other.

**Files:**
- Modify: `internal/console/templates/board.html` (resource branch), `internal/console/approvals.go`
- Test: `internal/console/resource_face_test.go`

**Interfaces:**
- Consumes: `decideView` and the `decide` partial from Task 1.

- [ ] **Step 1: Write the failing test** `TestResourceCardHoldsOneSendDecision`: one premade per legal transition with its effect line, the fund control (a resource ask is often money: the problem line names what the money buys), the note, no other form control.
- [ ] **Step 2: Verify it fails**, convert the branch, verify it passes, commit "The resource card asks one decision".

### Task 3: The escalation card asks one decision

The escalation face (`escalation-actions` board.html:157-205) renders one form per choice, some with an instruction input, an own-words textarea, a fund form of two numbers and a text, and the five-field extend form. The HumanQuestion is an ask: convert the whole block to one `decideView`.

**Files:**
- Modify: `internal/console/templates/board.html` (escalation-actions), `internal/console/board.go` (escalationCard)
- Test: `internal/console/escalation_face_test.go`

**Interfaces:**
- Consumes: `decideView` from Task 1.
- Produces: the extend form folded behind a `details` whose summary reads "Extend the card"; its fields unchanged (a drawer-depth control, not a decision).

- [ ] **Step 1: Write the failing test** `TestEscalationCardAsksOneDecision`: the choices render as premade buttons with one-line effects (an instruction-taking choice opens its input on its press, one at a time), one fund, one note, the extend form behind the fold, no `pre` on the face ("the raw text, for copying" board.html:178 moves behind the fold).
- [ ] **Step 2: Verify it fails**, convert the block, verify the new test and the existing escalation tests pass, commit "The escalation card asks one decision".

### Task 4: The whisper sweep on plain cards

Proposal-v2's open deviation: "face shows normal states at full weight". The plain task card (template `card` board.html:375-386) and the status line render normal states loudly.

**Files:**
- Modify: `internal/console/templates/board.html` (card template, status template), `internal/console/board.go` (`Pill` board.go:1442, `fineStates` board.go:646, near-budget line)
- Test: `internal/console/whisper_test.go`

- [ ] **Step 1: Write the failing test** `TestTheFaceWhispers`: a running card under 80 percent budget renders its spend in the muted class with the word beside it; the pill carries its word; fine chips render only when a fine state holds; a card at 80 percent renders the warning sign, the text and the prominent class (never colour alone).
- [ ] **Step 2: Verify it fails**, apply the classes and conditions, verify, commit "The face whispers until it must speak".

### Task 5: The plan card audited against what #1837 lands

Issue #1837's view-rebuild card (t-b37303f8df4c) re-lands the hold-out zone and the layered confirmation view. This task runs after it merges: audit the landed plan card against this plan's Global Constraints and close what remains.

**Files:**
- Modify: `internal/console/templates/board.html` (plan template), `internal/console/approvals.go`
- Test: `internal/console/plan_face_audit_test.go`

**Interfaces:**
- Consumes: `decideView` from Task 1; the landed #1837 view.
- Produces: none.

- [ ] **Step 1: Write the audit test** `TestPlanCardFollowsTheFace`: the confirming face holds the decision first (Confirm, Request changes as premades), the hold-outs each with Okay and Drop and the term explained, questions one at a time (the carousel's slots), no raw revision text on the face, the revision's summary and full text behind the drawer's folds.
- [ ] **Step 2: Run it against the landed view.** Every failing assertion is a gap this task closes in the plan template. No assertion is weakened to pass.
- [ ] **Step 3: Close the gaps, verify, commit** "The plan card follows the face".

### Task 6: A bound ask answers by its button alone

The ask-press rule (ask-press plan, 2026-10-31, unbuilt): a question that gates an action answers by a button; a typed message resolves nothing while a bound ask stands open.

**Files:**
- Modify: `internal/console/chat_tools.go` (`askMember` answer.go:256-289), `internal/console/answer.go`
- Test: `internal/console/answer_bound_test.go`

- [ ] **Step 1: Write the failing test** `TestABoundAskAnswersByButtonAlone`: an ask with choices renders its buttons (chat.js already does); a typed message posted while the ask stands open stores as the turn's note and the ask stays open; the press alone resolves it.
- [ ] **Step 2: Verify it fails**, enforce the bound state in the answer path, verify, commit "A bound ask answers by its button alone".

### Task 6b: The criteria card asks one criterion at a time

C45 settled the criterion row (claim, artifact, Met, Not met, Waive, the ended grey), and that row stands. What C45 did not settle is the all-at-once layout: a plan with six open criteria renders six rows with three buttons each on one long face — six decisions at once, the very thing the carousel exists to end. Sebastian, 2026-11-13, on the criteria gap card of plan #1837: "lots of actions on one long card."

**Files:**
- Modify: `internal/console/templates/board.html` (criteria template 308-317, criteria-rows 292-306), `internal/console/approvals.go`
- Test: `internal/console/criteria_face_test.go`

**Interfaces:**
- Consumes: C44's carousel row (the count `1 of N`, the arrows) and C45's row markup unchanged.

- [ ] **Step 1: Write the failing test** `TestCriteriaCardShowsOneCriterionAtATime`: a plan with three open human criteria renders the face holding ONE criterion's row (C45's row exactly), the carousel `1 of 3`, and the arrows; a press of next renders the second row alone; a settled criterion reads ended where it sits in the count but its buttons are gone (C42's ended rule); the gate rows (blind/open) stay on the face as one line each, for they ask nothing.
- [ ] **Step 2: Verify it fails**, move the rows under the carousel (the slot machinery the plan questions already use), verify the new test and C45's existing tests pass, commit "The criteria card asks one criterion at a time".

### Task 7: The conformance test over every card kind

One test renders every card kind from fixtures and asserts the face contract, so a new kind cannot drift.

**Files:**
- Create: `internal/console/face_conformance_test.go`
- Test: itself.

**Interfaces:**
- Consumes: the existing rigs (newRig, holdoutsRig, slotsRig, planRig) and one fixture per kind: task card (agent, human, roll, roll-refused, routine ghost), escalation, case row (one rung-3 case per kind group), approval (plan, merge, criteria, resource), the drawer copies.

- [ ] **Step 1: Write `TestEveryCardFollowsTheFace`**: for each kind's rendered face assert: no `pre` outside C45's artifact rows; every form control belongs to a decision (premades, the fund control, the note) or is folded; every waiting card carries its reason line (the gate, question, approval or failure, and how long it waited); every refusal's named actions appear on the face that refused.
- [ ] **Step 2: Run the whole console package.** A failure is either a drift this task fixes in the template or a missing kind in the fixture list; both get fixed, never the assertion.
- [ ] **Step 3: Commit** "Every card follows the face".

### Task 8: The census fixes

The exhaustive census of every card face (the appendix below) found five violations the tasks above do not cover. Same shape each: a fold, a line, or a path guarantee, one test per fix.

**Files:**
- Modify: `internal/factoryd/caseface.go:46`, `internal/console/templates/board.html:296` and the extend block, `internal/console/approvals.go:347`, `internal/console/cases.go` and `board.go:2404-2417`
- Test: `internal/console/census_fixes_test.go`

- [ ] **Step 1: Delete the "Last answer processed" suffix** CaseFace appends to Info (caseface.go:46). It is a confirmation line; the case's state carries it. Test: a case answered and re-tripped renders no processed-at text.
- [ ] **Step 2: Fold the gate artifact.** The merge and criteria faces print the first 8 KiB of the gate artifact as an inline `pre` (board.html:296, approvals.go:347). Behind a closed `details` whose summary names the artifact and its size. Test: the face holds no `pre`, the fold's summary does.
- [ ] **Step 3: End the slotless plan face.** A plan case without revision and index facts renders every open question at once (board.go:2465-2470, Asks=true). Guarantee revision and index on every plan case so the one-question slot path is the only face; the slotless branch renders one question with the carousel. Test: a plan approval whose case lacks the facts still renders one question per face.
- [ ] **Step 4: Move Extend off the asking face.** The extend form's four inputs ride the escalation and offerless faces (board.html:209-220). The drawer alone holds it, or a closed fold names it. Test: an asking face holds no extend inputs; the drawer does.
- [ ] **Step 5: Fix the wide lane.** Ghosts render only in the five columns (a wide user sees no routines: board.html:37 vs 41), and a human task that asks renders twice (board.go:2404-2417). Ghosts render in the wide lane's queue group; the asking task renders once, with its actions. Test: the wide lane holds each card once, ghosts included.
- [ ] **Step 6: Commit** "The census fixes: five faces brought under the contract".

## Appendix: the census

Every face a human can see, judged letter by letter (A one decision, B no dumps, C decision first, D whisper, E terms, F no confirmation lines, G refusals named). Built from origin/main at 1b615cb9f, 2026-11-13.

**Passes as built:** the case face with the decide table (all cap, check-in, gate, dependency, provider, monitor and wait kinds), the plan-slot question and confirmation faces (one at a time on the carousel), the resource approval face, plain agent and human cards, final cards (one transition each), routine ghost cards, the status strip, the drawer (all kinds: the sanctioned depth layer), the routine drawer, the chat panel, the timeline page, load-more chrome.

**Fails or partial, with the owning task:** the merge approval face (task 1: the deny box; task 8: the artifact fold), the criteria faces (task 6b: the carousel; task 8: the artifact fold), the slotless plan face (task 8), the extend form on asking faces (task 8), the wide lane's ghosts and double render (task 8), the "Last answer processed" line (task 8). The escalation face's choice buttons conform; task 1's decide partial covers its fund shape.

## Not this plan's work

- The chat inbox backlog that delayed #1837 (a chat-triage fault, its own issue).
- The pulse line and the status line's detail panel (proposal-v2 scope, already tracked).
- The criteria card's ROW (C45 confirmed it); task 6b carries the row into the carousel without changing it.
