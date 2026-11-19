# Every card readable: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every card, every ask, every button and every inbox message of the factory tells a reader who dropped in cold what it is, why it exists and where it stands, in layers, from one brief that the agent and the human both read.

**Architecture:** Each card stores one brief in fields (title, why line, summary, full text). Every writer files it through one checked door, and the agent's session and the console both read it through one function. One register in `factoryd` holds the face of every case kind, approval kind, card source and action: the ask, the story, the answers with their labels, effects and defaults. One set of console templates renders every register entry, and the older per-kind templates go. Kind lists that a test checks against the code's constants make a missing face a build failure.

**Tech Stack:** Go (`factoryd`, the console's `html/template` with htmx, `agent-worker`), Postgres, the console lab (`scripts/console-lab`), Playwright shots for the gallery.

**Spec:** [board-cards-problem-2026-11-16.md](../board-cards-problem-2026-11-16.md). Goals G1 to G13, the card model in its section 6 and the decisions in its section 8 bind every task. The census of kinds and actions is in its appendices A to C.

**Where the work runs:** locally, in a worktree of `~/repos/ai-software-factory-code`, not through the factory. Paths below are relative to that repository's `internal/` unless they start with `cmd/`, `scripts/` or `docs/`. Line numbers are from commit `d39984009`. `docs/` and `design/` paths are in this repository. Verify with `go test -race ./...`, and for a face with `scripts/console-lab/run.sh`.

## Global Constraints

- Scope has no exception list. A task that finds a card kind, case kind, approval kind, button, form field or inbox message kind that this plan does not name adds it to the register and brings it under the contract in the same task. "Not in the plan" is not a reason to leave a face as it is.
- No assertion of a contract test is weakened to pass. A failure is a face to fix or a missing register entry.
- One way only. A converted face deletes its older template, its older handler branch and their tests in the same task. No kind keeps a second render path.
- Title: 1 to 70 runes, one line, the work with the verb first. On a card that asks, the title is the ask: 1 to 110 runes, one line, no colon, one question or one instruction with at most one statement before it. Never cut by code.
- Why line: one sentence, 1 to 160 runes. Summary: 1 to 600 runes. Small card: at most 300 characters of prose. Opened card above the folds: at most 900 characters of prose. Inbox message: at most 280 characters before its fold.
- An asking face shows one question and at most 4 answers. Each answer has its label from the one vocabulary (appendix 1) and one effect line. The suggested answer is first and names who suggests it. A recommendation is always one of the face's answers.
- A form field renders only after the press of the answer that needs it, with a default filled in. A required note has no default: it shows one line that says what to write.
- Every card in Needs you holds a case, and every page of a card's carousel has answers. A case that can no longer be answered is withdrawn by code.
- An answer on a face can happen: its predicate holds on the case's facts, and its effect line is true for this kind.
- Every `#N` renders as a link with the target's title and state. No face shows a task id (`t-…`), a case number, a finding hash, a branch name or the words rung, case, offer, premade, slot.
- Every text a human reads passes `writingguide.Lint`. Every model writer carries the guide form of its job.
- A human is called a human in every string.
- No new column and no new card state. C4, C7, C8, C10, C16, C20, C25, C31, C40, C41, C42, C44 and C45 of [design/design-decisions.md](../../design/design-decisions.md) stand. Task 9's round amends C11 and [design/ia.md](../../design/ia.md).
- Comments stay minimal. Tests derive their expectations by hand.

## Review Focus

1. **A kind added after this plan ships with no face.** Expected: the build fails. Pinned by Task 1's constant-walk tests and Task 10's `TestEveryKindHasAFace`.
2. **A writer that cannot meet the title rule loops on refusals.** Expected: after 3 refusals the door files the card with the writer's last text, marks it `brief_unchecked`, and the board shows the mark. Pinned in Task 3.
3. **A long word or a URL in a title or why line breaks the column.** Expected: the line wraps inside the card. Pinned by Task 11's width test at 390 px.
4. **A press on an answer whose fields open, then a second answer pressed.** Expected: the first answer's fields close and post nothing. Pinned in Task 12.
5. **A card with no plan, no why and no summary (a human's bare issue).** Expected: the face shows the title and the state and no empty line or label. Pinned in Task 11.

---

## Phase 0: see the whole surface

### Task 1: The kind lists

**Files:**
- Create: `factoryd/kinds.go`, `factoryd/kinds_test.go`
- Modify: `factoryd/cases.go:60-94` (add `checkin_failed` to `caseKindWords`), `factoryd/intake.go` and `cmd/factoryd/main.go:972` (the sources `webhook` and `api` become constants), `factoryd/pokes.go:251` and every other chat-row write (the write refuses a kind that `BirthKinds()` lacks)

**Interfaces:**
- Produces: `func CaseKinds() []CaseKind`, `func CardSources() []string` (every source a card can have, the one in `policy` among them, and no case source), `func HumanActions() []string` (the actions of `Actions` a human may pick), `func ApprovalKinds() []string`, `func MonitorFlags() []string`, `func BirthKinds() []string` (every kind of chat row the factory writes), and the existing `Actions`.

- [ ] **Step 1: Write the failing tests.** `TestKindListsHoldEveryConstant` parses the package with `go/ast` and asserts that each list holds every constant of its group: every `Case*` constant of `cases.go:23-57`, every `Source*` constant, every `Approval*` constant of `store.go:963-981`, every flag name that `carddigest_flags.go` raises. `TestChatRowWriteRefusesAnUnlistedKind`: a chat row with a kind outside `BirthKinds()` is refused, so a kind that a poke forwards from an event cannot arrive unlisted. `TestEveryCaseKindHasWords` ranges over `CaseKinds()` and asserts a `caseKindWords` entry.
- [ ] **Step 2: Run them.** `go test -run 'TestKindLists|TestEveryCaseKindHasWords' ./internal/factoryd/` fails.
- [ ] **Step 3: Write the list functions** and add the missing words. The kind `agent_request_info` gets its opener in Task 15.
- [ ] **Step 4: Run the package tests.** All pass.
- [ ] **Step 5: Commit** "Kind lists that a test holds against the constants".

### Task 2: The gallery of today's faces

The gallery is the proof surface of the whole plan. It is built first, so it shows the faults before any fix.

**Files:**
- Create: `facefixtures/fixtures.go` (a package of its own, so `factoryd` tests and `console` tests both import it), `console/gallery.go`, `console/templates/gallery.html`, `console/gallery_test.go`, `scripts/console-lab/gallery.js`
- Modify: `console/lab_test.go:398` (`labScenes`), `console/board_actions_test.go:128` (`seatAsk`, reused as the fixture seat)

**Interfaces:**
- Consumes: Task 1's lists.
- Produces: `func facefixtures.All() []Fixture` with `Fixture{Group, Kind string; Task factoryd.Task; Case *factoryd.Case; Facts factoryd.Facts}`, where `Facts` names the facts type that the action predicates of `factoryd/actions.go` take. `func galleryEntries() []galleryEntry` with `galleryEntry{Group, Kind string; Seat func(*rig) string}`: one entry per card source in each column it can stand in, per case kind, per approval kind, per monitor flag, plus a card with three open cases, a human card and an author-wait card, the routine card and each status-strip action. Route `GET /lab/gallery` (lab builds only) renders each entry's small card and its opened card side by side with the entry's name. `scripts/console-lab/gallery.js` writes one PNG per entry at 1280 px and 390 px into `shots/gallery/<date>/`.

- [ ] **Step 1: Write the failing test** `TestGalleryHoldsEveryKind`: for each element of the five lists of Task 1 and each of the 36 card kinds of the spec's appendix A, `galleryEntries()` holds an entry, and its `Seat` renders without error.
- [ ] **Step 2: Run it.** It fails with the missing entries.
- [ ] **Step 3: Write the entries.** Seat each kind with realistic facts. Take the text of the cards #2004, #2100, #2101, #1850 and #2091 from the spec's section 2 for five of the entries, so the named faults show.
- [ ] **Step 4: Run the test, then the shots.** `node scripts/console-lab/gallery.js` writes the baseline set.
- [ ] **Step 5: Commit** "The gallery shows every kind's face". Keep the baseline shots outside the repository for the before and after comparison of Task 24.

---

## Phase 1: one brief for the agent and the human

### Task 3: The stored brief and its door

**Files:**
- Create: `factoryd/cardbrief.go`, `factoryd/cardbrief_test.go`, `writingguide/lint.go`, `writingguide/lint_test.go`
- Delete: `planSlug` and the namer's fallback to it (`factoryd/namer.go:48`): a plan without a name shows its title
- Modify: `factoryd/store.go:29-170` (Task fields), the migrations directory (columns `why text`, `summary text`, `brief_unchecked bool`; drop `human_summary`), `factoryd/title.go` (delete the cut and `TitleCap`; `CardTitle` returns the title for every card, never the plan key)

**Interfaces:**
- Produces:
  - `type BriefText struct{ Title, Why, Summary, Body string }`
  - `type BriefJob int` with `BriefWork`, `BriefAsk`, `BriefHumanIssue`
  - `func CheckBrief(b BriefText, job BriefJob, refs RefResolver) []string`: each string is one refusal that names the fault and the fitting action
  - `type RefResolver interface{ Issue(n int) (title, state string, ok bool); Heading(path, id string) bool }`
  - `func writingguide.Lint(text string) []string`
  - `Task.Why`, `Task.Summary`, `Task.BriefUnchecked`. The board shows "brief not checked" on such a card. The title stays the opening paragraph of `Task.Objective`.

`CheckBrief` rules, each with its refusal text:

| Rule | Applies to | Refusal |
|---|---|---|
| Title has 1 to 70 runes and one line, an ask 1 to 110 | all jobs | "The title has N characters. Keep it under 70.", for an ask "The ask has N characters. Keep it under 110." |
| Title holds no `#N`, no branch name, no hex id of 7 or more characters, no backtick, no camelCase or snake_case word, no colon | Work, Ask | "The title names X. A title uses plain words. Move X to the text." |
| Title does not start with "The ", "A " or "An " | Work | "A work title starts with its verb, for example 'Narrow the close refusal to plans that hold criteria'." |
| Ask title is one question, or one instruction that starts with its verb, with at most one statement before it | Ask | "An ask is one question or one instruction." |
| Why is one sentence of 1 to 160 runes and does not start with the title | Work, Ask | "The why line gives the reason in one sentence: who needs this, or which problem it removes." |
| Summary has 1 to 600 runes | Work | "The summary says what gets built, what it changes and how it is checked, under 600 characters." |
| Every `#N` in any field resolves | all jobs | "#N is no card or pull request of this project." |
| No bare section label: `fault N`, `Phase X`, `requirement N`, `step N`, `task N` outside a markdown link | all jobs | "'Phase B' names a part of a document. Link it as [words](path#heading), or say what it is." |
| No branch name in any field | all jobs | "The text names the branch X. The factory adds the start line itself. Remove the branch." |
| `Lint` passes on title, why and summary | all jobs | Lint's own lines |

`Lint` refuses: an em dash, an en dash as punctuation, a semicolon, a contraction, a word of the guide's banned lists, and the words rung, case NNN, premade, offer, slot.

`BriefHumanIssue` checks length and references only: a human's own title stays.

- [ ] **Step 1: Write the failing tests.** `TestCheckBriefRefuses` is a table with one row per rule above. Input for the title rules: the three live titles of the spec's section 2. Each must be refused with the rule's text. `TestCheckBriefAccepts`: `BriefText{Title: "Narrow the close refusal to plans that hold criteria", Why: "So a plan with no criteria closes without a waiver.", Summary: "The console refuses to close a plan while criteria are open. This card limits the refusal to plans that hold criteria. A test closes a plan with none and one with two."}` returns no refusal. `TestLint` has one row per refusal class.
- [ ] **Step 2: Run them.** They fail: the functions do not exist.
- [ ] **Step 3: Write `Lint`, `CheckBrief`, the migration and the Task fields.** Delete `HumanSummary`, `doSetSummary` (`console/actions.go:2743`), the chat tool `set_summary` and the drawer's "Save summary" form. The chat's `edit` tool and a new drawer form "Edit the brief" write title, why and summary through `CheckBrief`.
- [ ] **Step 4: Write the unchecked path.** `func FileBrief(b BriefText, job BriefJob, refs RefResolver, tries int) (ok bool, refusals []string)`: on the third refused try it accepts and the caller sets `BriefUnchecked`. Test `TestThirdRefusalFilesUnchecked`.
- [ ] **Step 5: Run `go test -race ./...`.** Fix every caller of the deleted cut and summary.
- [ ] **Step 6: Commit** "A card stores its why line and summary behind one checked door".

### Task 4: Every writer files through the door

**Files:**
- Modify: `factoryd/plan.go` (`PlanCard` at 249: add `Why`, `Summary`, `Section`; `planGuide` at 1322 and 1366; `cardFindings` at 865; `cardBody` at 1251; `fileChildren` at 3804; `UpdatePlanCardBrief` at 3224), `factoryd/verdict.go:970` (delta schema), `factoryd/delegate.go:59-131` and `gateway/tools.go:54`, `console/chat_tools.go:1486` (`new_card`), `console/board_actions.go:130` (`file_card`), `console/answer.go:354` (`escalate`), `gateway/tools.go:373` (the coding agent's `escalate`), `policy/routine.go:114`, `console/board.go:3111` (the New task form), `factoryd/activities.go:537` (successor), `factoryd/deps.go:517` (retry replacement), `factoryd/deps.go:600-670` (a human card handed to the factory), the refile of `restart_plan`, `factoryd/intake.go:363` and `cmd/factoryd/main.go:972` (the webhook and the API, as `BriefHumanIssue`), `factoryd/chat_escalation.go:57` and `factoryd/question.go:814` (delete the 200-byte cuts: the ask passes the door at its writer), and the filers of the template-titled cards: `rolltask.go:1370`, `mainfix.go:424` and `:725`, `grouprevert.go:351`, `chainpoll.go:1692`, `signozwebhook.go:1069`, `toolpark.go:530`, `templateupdate.go:171`, `schemasync.go:210`, `github.go:543`, `imager.go:470`, `report.go:45`
- Create: `factoryd/source_briefs.go`
- Test: `factoryd/brief_doors_test.go`, `console/brief_doors_test.go`

**Interfaces:**
- Consumes: `CheckBrief`, `FileBrief`.
- Produces: `var SourceBriefs = map[string]func(Facts) BriefText`: the title, why line and summary of each card that Go code files, written at filing and stored. Appendix 3 holds the copy. `PlanCard.Why`, `PlanCard.Summary`, `PlanCard.Section` (a path in the document repository with a `#heading`, optional). The schema text of every door's fields is the same three lines: "title: the work, verb first, plain words, under 70 characters", "why: one sentence, the reason this work exists", "summary: what gets built, what it changes, how it is checked, under 600 characters".

- [ ] **Step 1: Write the failing tests.** `TestEveryFilingDoorChecksTheBrief` is a table over the doors: planner card, delta card, delegate, `new_card`, `file_card`, chat `escalate`, agent `escalate`, routine file, New task form. Each row files the live title "The doClose refusal narrowed to plans that hold criteria: the review finding answered on branch card/2084" and asserts the door's refusal carries `CheckBrief`'s text. A second row files the accepted brief of Task 3 and asserts the stored `Why` and `Summary`. `TestSectionMustResolve`: a `Section` whose path or heading is not in the document repository is refused with "The document X has no heading Y." `TestEveryCodeFiledSourceHasABrief`: for each element of `CardSources()` that no model and no human writes, `SourceBriefs` has an entry whose result passes `CheckBrief` with the fixture's facts. `TestHumanIssueWhyIsItsOpeningSentence`: an issue from the webhook stores its title unchanged and, as its why line, the opening sentence of its body when that sentence has at most 160 runes, else no why line. `TestSuccessorCarriesTheBrief`: a successor, a retry replacement, a human card handed to the factory and a restarted plan store the old card's why and summary, and their body's opening line says "Continues #N" as a link.
- [ ] **Step 2: Run them.** They fail.
- [ ] **Step 3: Wire each door.** Replace the planner's sentence at `plan.go:1366` with the three field lines. Remove every other title instruction. A refusal returns to the writer in the door's normal refusal channel, so the writer corrects itself.
- [ ] **Step 4: Write the issue mirror.** `cardBody` opens with the why line and the summary, then the full text. The Forgejo issue shows the same order.
- [ ] **Step 5: Run `go test -race ./...`. Commit** "Every filing door checks the brief".

### Task 5: The writing guide in forms

Changes to the guide's text need Sebastian's OK. Step 1 produces the text for him to read. Do not merge the task before he approves it.

**Files:**
- Create: `writingguide/forms/title.md`, `why.md`, `ask.md`, `brief.md`, `finding.md`, `summary.md`, `chat.md`, `writingguide/forms.go`, `factoryd/writers.go`, `factoryd/writers_test.go`
- Modify: `writingguide/writing-guide.md` and `docs/writing-guide.md` (add the two missing rules of Sebastian's guide: no announcer fragments, no "honest note". Add the board rules: write for a reader who dropped in cold, explain each reference at first use, a title names the work). Every prompt in the table below. Delete the assertions that require the guide to be absent: `cmd/agent-worker/main_test.go:2072`, `factoryd/checkin_test.go:941`.

**Interfaces:**
- Produces: `type Job string` with `JobTitle`, `JobWhy`, `JobAsk`, `JobBrief`, `JobFinding`, `JobSummary`, `JobChat`; `func writingguide.For(jobs ...Job) string`; `var Writers = []Writer{{Name, Prompt func() string, Jobs []Job}}` listing every model call whose text a human reads.

| Writer | Jobs |
|---|---|
| Planner, replanner, delta planner | title, why, brief, ask (its questions) |
| Coding agent | summary, ask (its `escalate` and its `request_info`), title and why (its `delegate`) |
| The responder that answers messages on an issue | chat |
| Project agent, and the factory agent on a case | chat (the whole guide, in the standing prompt, `console/chat.go:2471`, not behind the `system` tool), title, why, ask, and its analysis on an ask (`factoryd/chat.go:1257`) |
| The check-in, all three moments, and its work on a case (`rung1.go:314`) | finding, why |
| Case story writer, approval brief writer (`brief_case.go:163`, `brief.go:492`) | ask |
| Model review, audit, gate supervisor | finding |
| Hold-out proposer, judgement, answer screener | finding |
| Plan namer, chat thread title | title |
| Chat compaction, screening, sizing | summary |

Each form holds the rules of [the writing guide](../writing-guide.md) that its job can break, plus the job's own rules. `title.md` is under 600 bytes. `chat.md` is the whole guide plus: "Lead with what the human must do, or say that nothing is needed. Under 600 characters unless the human asked for a report."

- [ ] **Step 1: Write the seven forms and the guide's additions.** Show them to Sebastian.
- [ ] **Step 2: Write the failing test** `TestEveryWriterCarriesItsForms`: for each `Writers` entry, `Prompt()` contains `writingguide.For(Jobs...)`. `TestWritersHoldsEveryModelCall`: an `go/ast` walk over the gateway call sites asserts each one is in `Writers` or in an explicit list `agentOnlyCalls` of calls whose text only agents read.
- [ ] **Step 3: Run them, wire each prompt, run again.**
- [ ] **Step 4: Commit** "Every writer carries the guide form of its job".

### Task 6: One function builds the brief for both readers

**Files:**
- Create: `factoryd/cardbrief_read.go`, `factoryd/cardbrief_read_test.go`
- Modify: `factoryd/opencode.go:708` (`briefText`), `factoryd/plan.go:4102-4134` (delete `planOf` and `filedPlan`; `planOfStore` at `verdict.go:244` is the one reader, and the callers at `criteria.go:540`, `proofsatmain.go:52`, `prover.go:608` and `activities.go:1001` move to it), `factoryd/gates.go:1953` (the model review's input), `cmd/agent-worker/main.go:288` and `factoryd/opencode.go:229` (the worker reads the card's part of the brief from the gateway and builds the session text around it), the gateway's worker routes

**Interfaces:**
- Produces:
  - `type CardBrief struct{ Text BriefText; Acceptance []PlanItem; Criteria []PlanCriterion; Plan *BriefPlan; DependsOn []CardRef; Delivered []DeliveredCard }`
  - `type BriefPlan struct{ Task string; Issue int; Name, Key, Role string; Index, Of int; Outcome string; Glossary []string; Summary string; Section string; Cards []CardRef; Answers []AnsweredQuestion }`
  - `type CardRef struct{ Issue int; Title, State string }`, `type DeliveredCard struct{ Card CardRef; Summary string }`, `type AnsweredQuestion struct{ Question, Answer string }`
  - `CardBrief(ctx context.Context, taskID string) (CardBrief, error)` on the `Store` interface (`store.go:329`)
  - the gateway route `GET /worker/brief`, which returns `AgentText()` for the session's task
  - `func (b CardBrief) AgentText() string`

- [ ] **Step 1: Write the failing tests.** `TestCardBriefOfAPlanChild`: a seeded plan of 3 cards. For card 2: `Plan.Index == 2`, `Plan.Of == 3`, `Plan.Cards` holds the 3 titles with states, `Plan.Outcome` and `Plan.Glossary` are the plan's, `Plan.Answers` holds the one answered question, `Delivered` holds card 1's agent summary. `TestSuccessorKeepsThePlan`: the successor of a plan child returns the same `Plan`. `TestAgentTextHoldsTheBrief`: `AgentText()` contains the title, the why line, the summary, the full text, the acceptance items, the plan's outcome, the answered question and card 1's summary, in that order. `TestReviewReadsTheWhy`: the model review's prompt contains the why line and the plan's outcome.
- [ ] **Step 2: Run them.** They fail.
- [ ] **Step 3: Write `CardBrief`** over the store. Resolve the plan through the parent chain, not through `Source == plan`. Build `briefText` from `AgentText()` plus the session's own parts (facts line, sandbox facts, repository map, guide).
- [ ] **Step 4: Run `go test -race ./...`. Regenerate `docs/agents/coding.md`** and [agent-context-map.md](../agent-context-map.md) from the new brief. Commit "One function builds the brief the agent and the card read".

### Task 7: The text each session got

**Files:**
- Create: migration for `session_briefs(task_id text, session int, brief text, created_at timestamptz, primary key (task_id, session))`
- Modify: `cmd/agent-worker/main.go:288` (the worker posts the session text it built to the gateway before its first model call), the gateway's worker routes (`POST /worker/session-brief` stores the row), `factoryd/console_store.go`
- Test: `factoryd/session_brief_test.go`

**Interfaces:**
- Produces: `SessionBriefs(ctx context.Context, taskID string) ([]SessionBrief, error)` on the `Store` interface with `SessionBrief{Session int; Brief string; At time.Time}`.

- [ ] **Step 1: Write the failing test** `TestRunSessionStoresItsBrief`: after the worker rig starts a session, `SessionBriefs` returns one row whose `Brief` equals the text the worker gave its first model call, the repository map and the sandbox facts among it.
- [ ] **Step 2: Run, write, run, commit** "Each session's brief is stored".

### Task 8: References and terms resolve

**Files:**
- Create: `console/refs.go`, `console/refs_test.go`, `factoryd/terms.go`, `factoryd/terms_test.go`
- Modify: `factoryd/replan.go:1448` (the replan record stops naming `card/<issue>` branches; it names the card)

**Interfaces:**
- Produces: `func (c *Console) linkRefs(ctx context.Context, text string) template.HTML`: each `#N` becomes a link that opens the card's drawer or the pull request, followed by the target's title and state in words, for example `#2084 (Build the criteria gate, closed)`. Each markdown link to a document path opens the document in the drawer at its heading. `var Terms = map[string]string` gives one plain sentence for each factory word a face may use: session, criterion, hold-out, check-in, spend limit, successor card, replan, proof, plan round, merge approval. `func explainTerms(text string) template.HTML` marks the first use of each term on a face with its sentence.

- [ ] **Step 1: Write the failing tests.** `TestLinkRefsNamesTheTarget`: "Depends on #12" renders a link to card 12's drawer and the words "(Add the login page, done)". A closed pull request reads "closed without a merge". `TestExplainTermsMarksFirstUseOnly`. `TestEveryTermIsOneSentence`: each `Terms` value passes `Lint` and has at most 140 runes.
- [ ] **Step 2: Run, write, run, commit** "Every reference is a link that names its target".

---

## Phase 2: one face for every kind

### Task 9: The design round for the small card and the opened card

This is a condensed round by [design/process.md](../../design/process.md). Read it and [design/models.md](../../design/models.md) before any generation. Stay inside the round's spending cap.

**Files:**
- Create: `design/rounds/NN-card-layers/` with its `index.html`, prompts, sidecar JSON files and critic reports
- Modify: `design/design-decisions.md` (the new C-entry), `design/ia.md` (the face and drawer sections, rewritten. Remove the pulse and the wide view)

**The brief of the round.** Design four states of the small card and the opened card, with the copy of the spec's section 6 and the plain facts of #1850:

1. A work card in Queued: number, wait time, title, why line, place line (plan name, card 2 of 5, what it waits for).
2. A card in Needs you: title is the ask, why line, the suggested answer as one button with who suggests it, a count of the other answers. The amber band and the carousel of C44 stay.
3. A Done card: title, state word, time. One or two lines.
4. A routine card under Queued.
5. The opened card in this order: head (title, why line, place and state), the ask block (each answer with its effect line, fields that open on a press, one send), the summary, then closed folds: "The full brief", "The plan" (the breakdown with this card marked, the plan's outcome, links to the plan section and the whole plan), "The card's life", "What each session got", "Other actions". The tabs Activity and Files stay.

- [ ] **Step 1: Run the round.** Image models go wide on the five frames at 1280 px and 390 px. An independent critic of `design/models.md` judges against G3, G8 and the whisper rule ("Normal states whisper. Exceptional states speak.").
- [ ] **Step 2: Sebastian picks.** Record the pick as a C-entry that amends C11. Rewrite `design/ia.md`.
- [ ] **Step 3: Commit** in this repository: "The card's layers: round NN and its C-entry".

### Task 10: The face register

**Files:**
- Create: `factoryd/faces.go`, `factoryd/faces_copy.go`, `factoryd/faces_test.go`
- Modify: `factoryd/actionform.go` (delete `ActionLabel` at 70-73; `ActionEffects` and `ActionArgs` move into the vocabulary), `factoryd/question.go` (the question templates and `doneChoices` move into the register and the file goes), `factoryd/caseface.go` (reads the register; delete the "Last answer processed" suffix at 45-47), `factoryd/ladder.go:1058-1166` (the findings lead and the rung's mark leave the ask), `factoryd/ladder.go:1480-1530` (the stored ask row holds the register's answers)

**Interfaces:**
- Produces:
  - `type Answer struct{ Action, Variant string; Label, Effect string; Fields []Field }` and `type Field struct{ Name, Label, Hint string; Kind FieldKind; Required bool; Default func(Facts) string; Options []Option }`, with `FieldKind` one of `FieldText`, `FieldNumber`, `FieldChoice` and `Option{Value, Label string}`
  - `var Vocabulary []Answer`: one row per action a human may pick, plus the named variants of appendix 1. No label exists outside it.
  - `type FaceSpec struct{ Ask func(Facts) string; Why func(Facts) string; Story func(Facts) Story; Answers func(Facts) []string; Suggest func(Facts) (action, by, grounds string) }`
  - `type Story struct{ Planned, Happened, Left string }`: what was planned or promised, what happened, what is left. Each at most 240 runes.
  - `var CaseFaces = map[CaseKind]FaceSpec`, `var ApprovalFaces = map[string]FaceSpec`, `var FlagFaces = map[string]FaceSpec`
  - `func FaceOf(c Case, f Facts) AskFace` with `AskFace{Ask, Why string; Story Story; Answers []Answer; Suggested, SuggestedBy, Grounds string; More []Answer}`. `Answers` has at most 4 entries. `More` holds every other action of the table whose predicate holds on `f`.
  - `func MoreOf(t Task, f Facts) []Answer`: the other actions of a card that holds no case (replan, allow more sessions, tell the running session, edit the brief, colour, talk about this card).

**Rules of the register:**
- `Answers` names the answers to this kind's question, not every legal action. Appendix 2 gives them per kind.
- When a rung or a writer recommends an action that is not in `Answers`, `FaceOf` puts it first and drops the last answer over four.
- A card with several open cases shows one at a time on C44's carousel: the newest ask first, then the others, oldest first. Each page has its answers. When a newer case replaces an older one on the same matter, code withdraws the older one. The plan approval renders only through its cases, never a second time under them.
- The project agent's analysis on an ask shows on the opened card in the fold "The full brief", with the ask's evidence. The closed fold "The agent's view" holds the exact text the card's agent gets, `CardBrief.AgentText()`.
- An answer whose predicate fails on `f` leaves the face. A face with one answer left adds "Not now" and "End the card", so no card has one button.
- The ask is one sentence in the story's terms. For a card with findings and no money it names both: "Add 2.00 EUR to fix the 8 open review findings, or end the card?". The amount on a live face comes from the facts. Money is formatted with two decimals.
- The story comes from facts by template. The case story writer (`brief_case.go:163`) fills `Happened` and `Left` only for the kinds appendix 2 marks "writer", bounded at 240 runes each, with the ask form of the guide. Its prompt forbids naming buttons.

- [ ] **Step 1: Write the failing tests.** `TestEveryKindHasAFace` ranges over `CaseKinds()`, `ApprovalKinds()` and `MonitorFlags()` and asserts a register entry. `TestEveryActionHasOneLabel` ranges over `HumanActions()` and asserts one `Vocabulary` row without a variant, with a label, an effect line, and for each field a default or, for a required note, a hint. `TestAppendixAnswersApply`: for each kind's fixture, every answer that the register names has a predicate that holds on the fixture's facts, and a press on it is not refused. Where the test fails, change the predicate or the answer set, and record which. `TestFaceContract` builds `FaceOf` for each fixture of `facefixtures.All()` and asserts: the ask passes `CheckBrief` as `BriefAsk`, the why line has at most 160 runes, 2 to 4 answers, the suggested action is among them, no label appears twice, every text passes `Lint`. `TestBudgetFloorWithFindingsAsksOnce`: facts with 8 findings, 4.00 EUR spent of 4.00 and a shortfall of 2.00 give the ask quoted above, and no finding text is in `Ask`, `Why` or `Story`.
- [ ] **Step 2: Run them.** They fail.
- [ ] **Step 3: Write the vocabulary** from appendix 1, then the faces from appendix 2. Write each kind's ask, why line and story templates by the rules above.
- [ ] **Step 4: Delete `question.go`'s templates, `ActionLabel`, the findings lead and the rung's mark.** `ActNote` accepts an empty note (`actions.go:367-371`): the press itself is the record. Fix the callers. Run `go test -race ./...`.
- [ ] **Step 5: Commit** "One register holds every kind's ask, story and answers".

### Task 11: One renderer for the small card

**Files:**
- Create: `console/faceview.go`, `console/faceview_test.go`, `console/templates/face.html`
- Modify: `console/board.go` (`card` at 482, `boardCard` at 1921, `boardOf` at 2256), `console/templates/board.html` (delete the templates `card`, `case`, `escalation`, `transitions`, `planclose`), `console/cases.go`, `console/decide.go`, `console/approvals.go`, `console/static/console.css`. The drawer still renders `escalation-actions`, `extend-form`, `approval`, `plan`, `criteria`, `face-parts` and `case-decide`, so Task 12 deletes them with the drawer's forms.

**Interfaces:**
- Consumes: `Store.CardBrief`, `FaceOf`, `linkRefs`, `explainTerms`, the C-entry of Task 9.
- Produces: `type faceView struct{ Ref, Title, Why, Place, State string; Waits string; Ask *askView; Final, Unchecked bool }` and `type askView struct{ Suggested answerView; By string; Others int; Position, Of int }`; `func (c *Console) faceOf(ctx context.Context, bt factoryd.BoardTask, v *view) faceView`: the one builder for every board item. The template `face` renders it for every column.

Rules: `Title` is the card's title, or the ask when the card stands in Needs you. `Why` is the stored why line, or the ask's why. `Place` reads "plan: <name> · card 2 of 5". `State` is the pill word and the clock of C11. `Waits` gives the reason a Queued card does not start, in words, with links: "waits for #2100 (Narrow the close refusal, queued)". A card in review behind another in the merge queue gets its `Waits` from `MergeQueuePlaces` ([2026-11-16-merge-queue-turn.md](2026-11-16-merge-queue-turn.md), Task 3): "waits to merge behind #1949 (Settle every acceptance claim, verifying)". A Done, failed or closed card renders title and state only. A failed card's state names the failure in one clause. Buttons on the small card: the suggested answer when it needs no field, else none. Close and Retry on finished cards go: a failed plan child's retry is an answer on its opened card.

- [ ] **Step 1: Write the failing test** `TestEverySmallCardMeetsTheContract`: ranges over `galleryEntries()`, renders the small card and asserts: the title has at most 70 runes and is not cut; a why line is present unless the card is final or a human's bare issue; a card of a plan shows its place; a Queued card shows why it waits; prose is at most 300 characters; at most one button; no `pre`, `textarea`, `input` or `select`; every `#N` is a link; `Lint` passes on the text; none of the forbidden words; at 390 px no element is wider than the card.
- [ ] **Step 2: Run it.** It fails for most kinds.
- [ ] **Step 3: Write `faceOf` and the `face` template.** Delete the listed templates and the view-model fields nothing reads.
- [ ] **Step 4: Run the console package.** Rewrite each older test that pinned a deleted template against the new face. Do not delete a behaviour test without its replacement.
- [ ] **Step 5: Shoot the gallery. Commit** "Every small card renders through one face".

### Task 12: The opened card

**Files:**
- Create: `console/templates/opened.html`, `console/opened.go`, `console/opened_test.go`
- Modify: `console/templates/drawer.html` (the Overview tab becomes the opened card; delete the sections Objective, The agent's summary, Replan, Extend, Edit as standing forms. The tabs Session, Activity, Files and Receipt stay), `console/templates/board.html` (delete the templates `escalation-actions`, `extend-form`, `approval`, `plan`, `criteria`, `face-parts` and `case-decide`, which Task 11 left for the drawer), `console/board.go:3809-3944`, `console/board.go:3162-3250` (`resolve`: one send posts the answer, its fields and the note together), `console/static/console.js:578-590`

**Interfaces:**
- Consumes: `faceView`, `AskFace`, `CardBrief`, `SessionBriefs`.
- Produces: `type openedView struct{ Face faceView; Ask *askBlock; Summary template.HTML; Brief briefFold; Plan *planFold; Sessions []sessionFold; More []answerView }`; `askBlock{Question, Why string; Story factoryd.Story; Answers []answerView; Position, Of int}`; `answerView{Action, Label, Effect string; Suggested bool; By, Grounds string; Fields []fieldView}`; `planFold{Name string; Outcome string; Cards []planRow; Section, Whole string}` with `planRow{Issue int; Title, State string; This bool}`.

Rules: the ask block shows the question, the three story lines, then the answers, each as one button with its effect line under it. A press on an answer with fields opens them under that answer with defaults filled in, and one "Send" appears. A press on a second answer closes the first answer's fields. An answer without fields sends at once (C31, C42). The note box is a field of the answers that take a note. The fund field is a field of "Add money". "Other actions" is a closed fold on every card, with the `More` answers of its case or, for a card without a case, `MoreOf`, in the same shape. Replan keeps its field "take the plan's merged cards off main first", unchecked by default. "The plan" fold shows the plan's outcome, the cards with this one marked, a link to the plan section when one is stored and a link that opens the plan card. "What each session got" has one closed fold per session with the stored text.

- [ ] **Step 1: Write the failing test** `TestEveryOpenedCardMeetsTheContract`: ranges over `galleryEntries()` and asserts: the order head, ask block, summary, folds; prose above the folds at most 900 characters; 2 to 4 answer buttons in the ask block, each with an effect line (a viewer who may not answer sees the question, the story and one line that names who can); no visible `input`, `select` or `textarea` before a press; every fold is closed; a card of a plan has "The plan" with its own row marked; a card that ran has "What each session got"; `Lint` and the forbidden words as in Task 11. `TestSecondAnswerClosesTheFirst` (Review Focus 4) drives the lab page: press "Add money", then "End the card", and assert the post holds no amount. `TestOneSendPostsAnswerFieldsAndNote`.
- [ ] **Step 2: Run, write, run.** Delete the older forms and their handlers `/tasks/{id}/fund`, `/tasks/{id}/extend`, `/tasks/{id}/summary` when `resolve` covers them.
- [ ] **Step 3: Shoot the gallery. Commit** "The opened card shows the ask, the summary and the brief in layers".

### Task 13: Asks on work cards tell their story

Covers the 23 case kinds of the full face, `other` among them.

**Files:**
- Modify: `factoryd/faces_copy.go`, `factoryd/brief_case.go` (the writer's output becomes `Story.Happened` and `Story.Left`), `factoryd/cases_events.go:192-221`
- Test: `factoryd/faces_story_test.go`

- [ ] **Step 1: Write the failing test** `TestWorkAsksTellTheirStory`: for each of the 23 kinds with its fixture's facts, `Story.Planned` names the card's work from its title, `Story.Happened` names the stop in words with its numbers (sessions used and allowed, money spent and budget, findings open, checks failed), and `Story.Left` says what remains. No story holds a raw stop reason: the strings "check-in:", "goal_conflict", "The gate supervisor", "wait_over_bound" appear in no face. For #2004's facts the three lines read: "This card builds <its title>." / "It spent 4.00 of 4.00 EUR in 3 sessions. The last session fixed 2 of 10 review findings." / "8 findings are open. One more session costs about 2.00 EUR."
- [ ] **Step 2: Run, write the templates, run, shoot. Commit** "Every stop says what was planned, what happened and what is left".

### Task 14: The asks of the spec-driven process

Covers plan question, plan confirmation, hold-outs, criteria gap, criteria never judged, merge approval with criteria and the done plan's close.

**Files:**
- Modify: `factoryd/plan.go:165` (`PlanCriterion` gains `Promise string`: the claim in plain words, at most 80 runes, checked at the plan's door), `factoryd/criteria.go`, `factoryd/verdict.go:1466` (record why the tests did not run on the request: `Spec.NotRun`), `factoryd/actions.go` and `factoryd/proofsatmain.go:46` (new action `run_criteria`: `ProofsAtMain` already runs the proofs on main's head, and the action runs it and writes one verdict row per promise; delete `deny_criteria`), `factoryd/plan.go` (the planner's door refuses a question with more than 3 choices: "Answer in my words" is the fourth), `console/approvals.go`, `factoryd/faces_copy.go`
- Test: `factoryd/criteria_face_test.go`, `console/criteria_face_test.go`

**Faces:**

| Ask | Question | Story | Answers |
|---|---|---|---|
| Plan question | The planner's question | Planned: the plan's outcome in one line. Each choice's effect line says what it changes, from a line per choice the planner's question tool carries | The planner's choices, the recommended first |
| Plan confirmation | "Confirm plan <name> with N cards and N promises?" | The outcome, the cards as titles, the promises as `Promise` lines | "Confirm the plan", "Ask for changes" |
| Hold-out | "Keep this extra promise for plan <name>?" | One sentence on what a hold-out is. The promise in plain words. What keeping it costs | "Keep it", "Drop it" |
| Criteria gap | "Plan <name> finished, but N of M promises are not met. Settle each one." | Per promise: "The plan promised: <Promise>." / "Its test ran and failed: <one line>." | "Build the missing part" (shows the card's price), "Drop this promise", "It is met" (human promises only) |
| Criteria never judged | "Plan <name> finished, but no test checked its N promises. Settle each one." | Head: `NotRun` in words, for example "The last card, #2011, closed without a merge, so the factory never ran the plan's tests." Per promise: "The plan promised: <Promise>." / "No test checked it." | "Run the tests now", "Drop this promise" |
| Plan question, own words | The same question | The same | The planner's choices, at most 3, and "Answer in my words" |
| Plan confirmation that reverts cards | "Confirm plan <name> with N cards and N promises, and take #A and #B off main?" | As plan confirmation, plus why each card leaves main | "Confirm the plan" (its effect names the reverts), "Ask for changes" |
| Merge | "Merge <card title>?" | What the card built, the review's verdict in one line, the checks | "Merge it", "Send it back", "Reject and close it" |
| Merge with red checks | "The checks of <card title> are red. Send it back to its agent?" | Which checks failed | "Send it back", "Reject and close it". The workflow re-runs the checks of factoryd's own pull requests only |
| Merge of a factory pull request with red checks | "The checks of <card title> are red. Run them again, or close it?" | Which checks failed | "Run the failed checks again", "Reject and close it" |
| Merge of a factory pull request | "Merge <what it updates>?" | What changes | "Merge it", "Reject and close it" |
| Merge with promises for a human | One page per promise, then the merge page | "The plan promised: <Promise>." and what to look at | Per promise: "It is met", "It is not met", "Drop this promise". Then the merge answers |
| Done plan, close | "Close plan <name> and drop its N open promises?" | The N promises | "Drop them and close", "Keep the plan open" |

Rules: the head's why line says what stays blocked until the ask is settled, from facts: "Until all 5 are settled, the plan stays open and holds production deploys." An answer that the request's kind refuses does not render and no text names it. Each promise is one page of C44's carousel.

- [ ] **Step 1: Write the failing tests.** `TestEveryMergeStateHasItsFace`: green checks, red checks, a factory pull request, open human promises and a viewer who may not approve each render through the register with the answers of the table. `TestPlanApprovalRendersOnce`: a plan with three open questions renders no second copy of its approval. `TestCriteriaNeverJudgedTellsWhy`: a plan whose last card closed without a merge gives the head and the why line quoted above, 5 pages, and on each page exactly the answers "Run the tests now" and "Drop this promise". `TestNoFaceNamesAnAnswerItLacks`: for every approval kind, no rendered text contains the label of a vocabulary entry that is not among the face's answers. `TestRunCriteriaRunsTheGate`: the action runs the hidden tests on main's head and records one verdict per promise. `TestDroppingTheLastPromiseClosesThePlan`. `TestPromiseIsChecked`: a criterion without `Promise`, or with one over 80 runes, is refused at the plan's door.
- [ ] **Step 2: Run, write, run, shoot. Commit** "The spec-driven asks say what was promised and what happened".

### Task 15: Work cards for a human

Covers the 18 human kinds of the spec's appendix A, human cards without a question, and cards that wait for their author.

**Files:**
- Modify: `factoryd/faces_copy.go` (the human-card faces; `doneChoices` is gone with Task 10), `factoryd/intake.go:455-482` and `plan.go:3930` (a human work card stores its steps as the brief), `console/actions.go:1366-1395` (`answerAction`), `factoryd/actions.go` (new action `hand_back`: return a human work card to the planner with the human's note), `factoryd/intake.go` (every human card opens a `human_card` case at filing), the handler of the coding agent's `request_info` (it opens an `agent_request_info` case, so the card that waits for its author has a face), `console/decide.go:82-84`
- Test: `factoryd/human_face_test.go`

**Faces:** a human work card's title is the instruction ("Change two lines in the runner's build files"). Its why line says why a human must do it and which plan waits for it. Its opened card lists the steps. Answers: "I did it" (effect: names the check the factory runs, or says "The factory does not check this. The card closes."), "Have the factory do it" (only when agents may), "I cannot do this" (`hand_back`), "Not now" (the card stays, and the effect names what waits). The template kinds (alert, chain stall, roll failed, month cap, production held and the others) keep their own answers from appendix 2 with vocabulary labels. Each states in `Story.Happened` what the factory saw, with its numbers.

- [ ] **Step 1: Write the failing tests.** `TestEveryNeedsYouCardHoldsACase`: a human card filed without a question, a card after `request_info`, and each of the 18 kinds stand in Needs you with an open case. `TestAuthorWaitAsksTheAuthor`: the face's ask is the agent's question, and its answers are "Answer in my words", "Not now" and "End the card". `TestHumanCardsAskOneThing`: for each of the 18 kinds, the face has 2 to 4 answers with vocabulary labels and effect lines, and a card that waits for another card says so in its why line. For #2101's facts: the title quoted above, the answers "I did it", "I cannot do this", "Not now".
- [ ] **Step 2: Run, write, run, shoot. Commit** "A human's work card says what to do and offers a way out".

### Task 16: Flags, informing cards and routine cards

**Files:**
- Modify: `factoryd/faces_copy.go` (`FlagFaces` for the 18 monitor flags; faces for cards that inform), `factoryd/monitor.go:180-250`, `console/templates/face.html` (the routine card renders through `faceView`), `console/routine_drawer.go`
- Test: `factoryd/flag_face_test.go`, `console/routine_face_test.go`

**Rules:** a monitor flag's ask is a sentence about the card, not the flag's name: `wait_over_bound` reads "This card waits for an answer for 6 h. Go on without it?". Each flag has the answers of appendix 4 on its face. The line "Answer it in the project chat" goes. A card that informs and does not ask (the planned freeze card, an alert that cleared) has the title of what happened, a why line, and the answers "Noted" and "Not now", and at most one more. A routine card shows its title, its why line from the routine file, its next run in words, and its three buttons with vocabulary labels and effect lines on the opened card.

- [ ] **Step 1: Write the failing test** `TestEveryFlagAsksInWords`: for each element of `MonitorFlags()`, the ask holds no flag name, no parenthesis and no underscore, and the face has at least 2 answers. `TestRoutineCardMeetsTheContract`.
- [ ] **Step 2: Run, write, run, shoot. Commit** "Flags and informing cards ask in words".

### Task 17: The wide view goes, helper tasks leave the board

**Files:**
- Modify: `console/board.go:477-480`, `:2305-2318`, `:2409-2418`, `:2696` (delete the wide view and `?view=wide`), `console/templates/board.html:11-32`, `factoryd/console_store.go:195-210` and `:306` (`BoardTasks` and `FinishedTasks` leave out the sources screening, sizing and prover), `factoryd/carddigest.go` (a helper task is a step of its parent's life), `console/faceview.go` (the parent's state reads "sizing", "screening" or "writing the proofs" while a helper runs)
- Test: `console/screen_test.go`, `console/helper_tasks_test.go`

- [ ] **Step 1: Write the failing tests.** `TestHelperTasksShowOnTheirParent`: a plan with a running prover task has no card for the task, the plan card's state reads "writing the proofs", the plan's life lists the task with its result, and a finished helper task is not in Done. `TestNoWideView`: `GET /?view=wide` renders the four columns.
- [ ] **Step 2: Run, delete, run. Commit** "One board, and helper tasks are steps of their parent".

---

## Phase 3: the inbox

### Task 18: The inbox shows what the board does not

**Files:**
- Modify: `factoryd/pokes.go` (every template), `factoryd/wakes.go:343-344` and `:509`, `console/static/chat.js:283`, `console/chat.go:2471`, `factoryd/chat.go:1257` (the agent's analysis attaches to the card's ask, not to the message)
- Create: `console/inbox_kinds.go`, `console/inbox_test.go`

**Interfaces:**
- Consumes: `BirthKinds()`, `FaceOf`, `writingguide.For(JobChat)`.
- Produces: `var inboxKinds = map[string]inboxKind` with `inboxKind{ForHuman bool; Render func(row) inboxView}` for every element of `BirthKinds()`.

**Rules:**
- A row whose kind is not for the human (every wake note, `case_climbed` among them) and the agent's reply to it render as one quiet line together: "The agent looked at #2084 (Build the criteria gate): nothing for you." The line opens the full text on a click (C18).
- The agent reaches the human through its ask tools, which file a card. A reply to a wake note never renders in full.
- A message about a card is built from the card's face: the title, the why line, the suggested answer's label and a link that opens the card. At most 280 characters. No analysis is attached: the card holds it.
- A notice (ended, merged, plan done, routine report) is one line of at most 160 characters with a link.
- The agent's own messages carry the chat form of the guide in the standing prompt. A message over 600 characters renders its first 280 and a "more" fold, unless the human's last message asked for a report.

- [ ] **Step 1: Write the failing tests.** `TestEveryBirthKindHasAnInboxRule` ranges over `BirthKinds()`. `TestWakeNotesFoldToOneLine`: a `case_climbed` note of 11,000 characters and the agent's reply of 500 characters render as one line of at most 160 characters. `TestCardMessageComesFromTheFace`: the message for a session-cap stop says "session cap" and not "budget", and equals title, why line, suggested label and link. `TestEveryPokePassesLint` renders each template of `factoryd/pokes.go` with the gallery's facts.
- [ ] **Step 2: Run, write, run.** Add the inbox to the gallery as one entry per kind. Shoot.
- [ ] **Step 3: Commit** "The inbox is short and repeats no card".

---

## Phase 4: cards that tell the truth

### Task 19: Faces that contradict the record

**Files:**
- Modify: `console/faceview.go`, `console/board.go:1964-1984` (the plan's rollup), `console/board.go:611-614` (Close on finished cards), `console/templates/drawer.html` (the section "Reviews and audit"), `factoryd/brief_case.go`
- Test: `console/truth_test.go`

- [ ] **Step 1: Write the failing tests**, one per fault of the spec's section 2:
  - `TestAPlanWithOpenCardsIsNotDone`: a plan with 5 of 8 cards queued shows "3 of 8 cards done", never "done".
  - `TestFinishedCardsOfferNothing`: a done, failed or closed card has no button on its small card.
  - `TestReviewsSectionShowsTheFindingsTheAskCites`: when the ask counts 8 findings, the opened card's fold lists 8.
  - `TestRefsShowLiveState`: a card text that names a pull request renders it as "closed without a merge" when it closed unmerged.
  - `TestStoryNamesNoButton`: the story writer's output is refused when it holds a vocabulary label, and the story then comes from the template.
  - `TestHumanCardSaysWhatItWaitsFor`: a human work card with an open dependency shows it in the why line, and "I did it" does not render until the dependency ends.
- [ ] **Step 2: Run, fix each at its source, run. Commit** "A card does not contradict the record".

### Task 20: Go strings pass the guide

**Files:**
- Modify: `console/actions.go` (the `refuse` texts), `factoryd/carddigest_render.go`, `factoryd/carddigest*.go`, every template under `console/templates/`
- Test: `console/strings_lint_test.go`

- [ ] **Step 1: Write the failing test** `TestRenderedTextPassesLint`: renders every gallery entry's small card, opened card, life fold and each refusal a press on it can return (drive each answer once with an invalid input), and runs `Lint` over the visible text. It prints each failing string with its file.
- [ ] **Step 2: Fix every string it reports.** Money prints with two decimals everywhere through one function `eur(float64) string`.
- [ ] **Step 3: Run `go test -race ./...`. Commit** "Every string a human reads passes the guide".

---

## Phase 5: the live board and the proof

### Task 21: New briefs for the open cards

A one-time pass. Its code does not stay in the repository after it ran.

**Files:**
- Create: `scripts/rebrief/main.go` (deleted in step 4)

- [ ] **Step 1: Write the pass.** For each card in Needs you, Queued and In progress whose title a human did not write: a small model reads the card's stored text and `CardBrief`'s plan part and writes title, why line and summary with the forms title, why and summary. `FileBrief` checks them with 3 tries. For each plan whose chip shows a slug, the plan namer writes a name. For each criterion of an open plan, the model writes its `Promise` from the claim. Each waiting card without a case gets one, so the older asking paths have no card left. The pass prints a table: card, old title, new title, why line, unchecked or not. It writes nothing with `-dry`.
- [ ] **Step 2: Run it with `-dry` against the read replica.** Give Sebastian the table. He strikes or corrects rows.
- [ ] **Step 3: Run it for real** after his OK and after the release that holds Tasks 3 to 8 is live. Update each Forgejo issue's title and body to match.
- [ ] **Step 4: Delete `scripts/rebrief/`. Commit** "Open cards carry checked briefs".

### Task 22: The live audit

**Files:**
- Create: `cmd/factoryd/boardaudit.go` (subcommand `factoryd audit-board`), `factoryd/boardaudit.go`, `factoryd/boardaudit_test.go`

**Interfaces:**
- Produces: `func AuditBoard(ctx context.Context, s Store, refs RefResolver) []BoardFinding` with `BoardFinding{Issue int; Field, Refusal string}`: `CheckBrief` over every open card, plus "a card of a plan without a why line", plus "an ask without 2 to 4 answers".

- [ ] **Step 1: Write the failing test** `TestAuditBoardFindsTheNamedFaults`: a store seeded with the three live titles of the spec's section 2 returns their refusals, and a store with the accepted brief returns none.
- [ ] **Step 2: Run, write, run. Commit** "factoryd audit-board counts the cards that break the contract".
- [ ] **Step 3: Run it against the live replica after Task 21.** The count for open cards is 0, or each remaining card is a human's own issue marked as such. Record the output for Task 24.

### Task 23: The documents follow

**Files (this repository):**
- Modify: [docs/spec-driven.md](../spec-driven.md) (the asks of the process, in the words of Task 14), [docs/architecture.md](../architecture.md) (the brief, the register, the kind lists), [docs/agent-context-map.md](../agent-context-map.md) and `docs/agents/` (from Task 6), [docs/writing-guide.md](../writing-guide.md) (from Task 5), [docs/question-format-concept-2026-10-17.md](../question-format-concept-2026-10-17.md) and [docs/card-flow-redesign-2026-11-02.md](../card-flow-redesign-2026-11-02.md) (a line at the head of each that names this plan as the current rule for faces), [docs/plans/2026-11-14-provider-limit-freeze.md](2026-11-14-provider-limit-freeze.md) (its freeze card files through the register as an informing card), [docs/needed-fixes.md](../needed-fixes.md)

- [ ] **Step 1: Edit each document.** State the rule, not its history.
- [ ] **Step 2: Commit** "The documents describe the brief and the face register".

### Task 24: Sebastian reads the gallery

- [ ] **Step 1: Shoot the gallery** after every task above merged. Build one page that shows, for each entry, the baseline shot of Task 2 next to the new shot, small card and opened card, at 1280 px and 390 px.
- [ ] **Step 2: An independent critic model reads every new shot** against G3 to G11 of the spec and lists each entry that fails a goal, with the goal's number. Fix each one at its register entry or template. The model that wrote a face's copy does not judge it.
- [ ] **Step 3: Sebastian reads the page and the live board.** Each card he does not understand at the depth he reads it is a failed entry. Fix it and shoot again. The work is done when he finds none.
- [ ] **Step 4: Record** the audit's count, the test counts and the gallery's date in [docs/needed-fixes.md](../needed-fixes.md)'s entry for the board.

---

## Outcome

The work landed on main of `ai-software-factory-code` with merge ddcab0b3f on 2026-11-19. Tasks 1 to 20, 23 and the first two steps of Task 24 are built. Each task, each merge of main and each fix round passed its review.

What the code does now:

- Each card holds one brief: title, why line, summary and full text. Every writer files it through one door, and the agent's session and the console read it through one function.
- One register in `factoryd` writes the face of every case kind, request kind, card source and monitor flag: its question, its answers with their effect lines, and its story. The console builds every opened card from it, with no second render path.
- An answer of a card's ask always shows in the ask block of the opened card. A fold holds only the card's actions that are no answer of the ask. The small card shows one answer to press and counts the others.
- A refusal names the state and the answers that fit it. A text a human reads names a card by its title and never by a task id, a key, a hash or a branch. An agent's door adds the task id after the title.
- A money card's question names its problem, not adding money. No answer leads the list a rung gets.

Changed after the build, by the owner's rulings:

- The factory checks no wording. `writingguide.Lint`, Task 20's test of every rendered string against it, and the brief door's three wording rules (a colon in a title, a work title that opens with an article, a why line that opens with the title) are gone. The writing guide stays a guide. The checks of what a reader cannot open stay: a `#N` that resolves to nothing, a branch name, a hex id, a backtick or code identifier in a title, a bare section label, the lengths, one question or one instruction per ask.
- Task 21 (the pass that rewrote the open cards' briefs) and Task 22 (`factoryd audit-board`) are dropped, and their code is deleted. The live board was cleared instead on 2026-11-19: 26 failed cards ended with a note, an empty pull request closed, and a schema-copy pull request merged. Every new card passes the brief's door.

Main moved by 53 commits while the work ran, among them rung 0, the one door to the human and the freeze card's single transaction. The branch took them in five merge steps, each reviewed. Main's behaviour runs, and every face it added goes through the register.

Found on the live factory on 2026-11-19 and fixed:

- A CI runner pod that could not pull its image held its 22 GiB of node storage until its 60-minute deadline, so no other runner pod fit and a roll's gate stopped. The spawner now tears such a pod down after 3 minutes of failed pulls, tries a job 3 times, then once every 15 minutes.
- The seed script wrote the registry read token's copies long after it minted the token, so a run that stopped between them left every pull secret with a revoked token. It now writes them right after the mint.

What stays open:

- Task 24's third step: Sebastian reads the board as new cards come, and each card he does not understand is fixed at its register entry.
- The chat tools for a merge, a plan and a criteria request still name the request. They answer through the case's Act, so they open no second door.

---

## Appendix 1: the vocabulary

One label per action, on every face, in the chat's answer tool and in the inbox. A row with a variant in brackets is a named variant of its action for one card class. No other label exists. The effect line states what happens next. A field's default may depend on the case's kind.

| Action | Label | Effect line | Fields and defaults |
|---|---|---|---|
| resume | Run one more session | Starts the next session on the card's model. | none |
| continue | Go on with my note | Starts a session that reads your note first. | note, required |
| handover | Switch the model | Starts the next session on the model you pick. | model: stronger (default), same, cheaper |
| reverify | Check the work again | Runs the review and the checks again on the same code. | none |
| rerun_checks | Run the failed checks again | Runs the red checks again on the same code. | none |
| wait_checks | Wait for the checks | Waits once more for the checks. No session runs. | none |
| extend | Allow more sessions | Raises what the card may use. | sessions: 1 and minutes: 0, or at an agent time cap sessions: 0 and minutes: one session's length. lines: 0 |
| fund | Add money | Adds the amount to the card's budget and goes on. | EUR: the shortfall of the next session |
| raise_ceiling | Raise the spend limit | Raises the most this card may ever spend. | EUR: the amount the fund passes the limit by |
| successor | Start a fresh card on this work | Ends this card. A new card goes on from its branch with a full budget. | none |
| retry | Try the failed card again | Files the failed card again as a new card. | none |
| replan | Send back to the planner | The planner cuts this work into cards again. | note, optional |
| close | End the card | Ends the card and closes its issue. Nothing more runs. On a human card that other cards wait for, it ends the card as closed, not done, and adds: "The cards that wait for it ask you first." | note, optional |
| approve_merge | Merge it | Merges the pull request. On a factory pull request's human card: "Merges <short head> as you. The card ends." The merge takes only the head the human saw, and a human must press it at every autonomy level. | none |
| deny_merge (request_changes) | Send it back | Returns the pull request to its agent with your note. | note, required |
| deny_merge (reject) | Reject and close it | Closes the pull request. The card ends. | note, required |
| set_dependency | Make it wait for a card | The card starts after the card you name ends. | card, with the hint "a card number" |
| remove_dependency | Stop waiting for a card | The card no longer waits for the card you name. | card: the one open dependency |
| file_card | File the cause as its own card | Files a new card for the cause. This card waits for it. | title and why with hints, size: small |
| restart_plan | Start the plan over | Ends the plan and files it again with your note. | note, required |
| answer_criteria (met) | It is met | Records the promise as met. | none |
| answer_criteria (not_met) | It is not met | Records the promise as not met. The plan stays open. | note, required |
| answer_criteria (waive) | Drop this promise | Takes the promise off the plan. | note, required |
| grant_criteria | Build the missing part | Files one more card for the open promises. | none |
| confirm_criteria | The work is enough | Records every open promise as met by the delivered cards. | none |
| run_criteria | Run the tests now | Runs the plan's tests on main and records each result. | none |
| deploy_now | Deploy now | Releases the held production deploy. | none |
| settle | It is fine, go on | Ends this notice. The card goes on. | none |
| salvage | Rescue the work into a new card | Ends the stuck run and starts a new card from its branch. | none |
| note | Not now | The card stays as it is. The effect names what waits for it and, at a cap, when the cap resets. | note, optional |
| wait_checks (keep_checking) | Wait for the checks | As above. | none |
| hand_back | I cannot do this | Only on a plan's human card: "This card ends, and the planner plans the whole plan again with your note. Its started cards stop." | note, required |
| done on a human work card | I did it | Names the check that runs, or says that none runs. It ends the card as done, and the cards that wait for it start. It is refused while the card waits for another card. | none |
| go | Have the factory do it | Files the work as a card for an agent. | none |
| plan confirm | Confirm the plan | The plan's cards start. | none |
| plan revise | Ask for changes | The planner revises the plan with your note. | note, required |
| hold-out okay | Keep it | The promise joins the plan. | none |
| hold-out drop | Drop it | The promise leaves the plan. | none |
| rerun_again | Run the chain again | Runs the stalled deploy chain again. | none |
| check_again | Look again | Reads the chain's state again. | none |
| retry (roll) | Try the roll again | Starts the image roll again. | none |
| close (a card that informs) | Noted | Ends this notice. | none |
| close (a card of a plan wait) | End <the card's title> | Ends the named card. The plan goes on without it. | none |
| reverify (overrule) | Overrule the review | Drops the review's findings and checks the work again. | reason, required |
| plan answer (own words) | Answer in my words | Sends your words to the planner as the answer. | answer, required |
| resource approve | Approve it | Names the resource and its price. | none |
| resource deny | Refuse it | The card goes on without the resource. | note, required |
| done plan close | Drop them and close | Drops the open promises and closes the plan. | note, required |
| chat fund | Add money to the chat | Raises the chat's budget for this month. | EUR: the last month's spend |
| routine skip | Skip the next run | The routine misses its next run. "Undo the skip" reverses it. | none |
| routine needs-me | Give it to me | The routine files its card for you. "Let it run alone" and "Follow the file" are its other two states. | none |
| routine run | Run it now | Files the routine's card now. | none |
| steer | Tell the running session | The running session reads your message at its next step. | message, required |
| edit brief | Edit the brief | Changes the title, why line and summary for the agent and the board. | the stored texts |
| accent | Colour | Marks the card with a colour. | the current colour |
| thread | Talk about this card | Opens a chat thread on this card. | none |

The older prepared answer values map to the rows above and then go: grant to `extend` or `resume`, park, keep_waiting and hold_wait to `note`, keep_checking to `wait_checks`, and the two production answers to `replan` with their plan named in the effect line. The chain stall's "dismiss" becomes `close`. An agent's own answer words (`say:`) render under the agent's words as the label and the effect line "Starts a session with this answer."

## Appendix 2: the answers of each ask

"Writer" marks the kinds whose `Happened` and `Left` lines a model writes. All others come from facts.

| Kind | Answers, the usual suggestion first | Story |
|---|---|---|
| session_cap, agent_time_cap | Allow more sessions, Start a fresh card on this work, End the card, Not now | facts |
| budget_floor | Add money, Start a fresh card on this work, End the card, Not now | facts |
| day_cap, month_cap, project_cap | Not now (the effect names when the cap resets), End the card. The why line links the file that sets the cap. No answer adds money: it lifts no cap | facts |
| checkin_human, policy_class | Go on with my note, Send back to the planner, End the card, Not now | writer |
| checkin_share | Allow more sessions, End the card, Not now | facts |
| checkin_failed | Run one more session, End the card, Not now | facts |
| gate_stop on waiting checks | Wait for the checks, Run the failed checks again, End the card | facts |
| gate_stop for any other reason | Check the work again, Go on with my note, Send back to the planner, End the card | writer |
| gate_stop on review concerns, findings_repeated | Allow more sessions, Overrule the review, Start a fresh card on this work, End the card | writer |
| dependency_failed | Try the failed card again, Stop waiting for a card, Send back to the planner, End the card | facts |
| dependency_closed | Stop waiting for a card, Send back to the planner, End the card | facts |
| dependency_failed as a plan's wait | Try the failed card again, End <the card's title> | facts |
| wait_expired | Not now, Run one more session, End the card | facts |
| pod_never_started, provider_refused, no_answer, content_filter | Run one more session, Switch the model, End the card, Not now | facts |
| image_wait | Not now, End the card | facts |
| screening_suspect | Go on with my note, End the card | writer |
| agent_escalate | The agent's own answers, Not now, End the card | the agent's question |
| other | Run one more session, Send back to the planner, End the card, Not now | writer |
| plan_question, plan_confirmation, plan_criteria, merge_approval | Task 14 | Task 14 |
| resource approval | Approve it (the effect names the resource and its price), Refuse it | facts |
| human_card on a human's issue, a reproduction-rule card, a workflow-files card, a moved card, a routine for a human | I did it, Have the factory do it (when agents may), I cannot do this, Not now | facts |
| human_card on a factory pull request | Merge it, Reject and close it | facts |
| human_card on a chat escalation | The agent's own answers, Not now | the agent's question |
| human_card on an alert | Noted, Not now (while the alert still fires) | facts |
| human_card on a chain stall | Run the chain again, Look again, End the card | facts |
| human_card on a chain repair, a refused roll, a lost runner | I did it, Not now | facts |
| human_card on a failed roll | Try the roll again, Not now, End the card | facts |
| agent_request_info | Answer in my words, Not now, End the card | the agent's question |
| judgment_budget, month_cap on a human card | Add money to the chat (judgment budget only), Not now, Noted | facts |
| red_main | I did it, Not now | facts |
| roll_held | Not now, Deploy now, Send back to the planner (one answer per named plan, at most two) | facts |
| config_refused | I did it, Not now | facts |
| monitor_flag, per flag | Appendix 4 | facts |

## Appendix 3: the briefs of cards that Go code files

Each row is the title form. The why line names what the factory saw and what the card prevents. Words in angle brackets come from facts and are plain names, not ids.

| Source | Title |
|---|---|
| tool_request | Add <tool> to the image <image name> |
| roll | Roll out the new images: <image names> |
| mainfix | Fix the red main branch: <the failing check> |
| revert | Revert <the card's title> from main |
| group-revert | Revert plan <plan name> from main |
| chain-repair | Repair the deploy chain of <service> |
| alert | Look into the alert <alert name> on <service> |
| template-update | Update the project from its template <template> |
| schema-copy | Copy the changed schemas to <build> |
| github-sync | Bring in the change from GitHub: <the change's title> |
| image_removal | Remove the unused image <image> |
| routine | The routine file's title, checked at the file's door |
| successor, retry, hand-over, restart | The old card's title, with "Continues #N" in the text |

## Appendix 4: the answers of each monitor flag

A flag that asks offers its fitting action, "It is fine, go on" and "Not now". A flag that is a notice states the fact, offers "Noted" and "Not now", and leaves the card's other actions under Other actions. Task 10's `TestAppendixAnswersApply` holds each against its predicate. The flag `money_ask_hides_findings` is no longer raised, because the money ask names the open findings itself.

| Flag | Ask or notice, in words | Answers |
|---|---|---|
| answer_changed_nothing | Notice: your last answer on this card changed nothing. | Noted, Not now |
| budget_moved_no_event | This card's budget reads <budget>, but its records add up to <sum>. Is that fine? | It is fine, go on, Not now |
| checkin_cut, checkin_refused | Notice: this card's last session went unjudged because its check ended early, or was refused. | Noted, Not now |
| criterion_unproven | A promise of the plan has no test result yet. Run the plan's tests now? Not raised for a promise a human judges. | Run the tests now, It is fine, go on, Not now |
| dependency_failed | A card this one waits for failed. Is that fine? | It is fine, go on, Not now |
| finding_confirmed_twice | The review found the same fault twice on this card. Rescue the work into a new card? | Rescue the work into a new card, It is fine, go on, Not now |
| grant_bought_nothing | Notice: this card's last session, which you allowed, changed nothing. | Noted, Not now |
| issue_open_after_end | This card ended, and its issue is still open. Close the issue? The card stands in Needs you with this ask. | Close the issue, It is fine, go on, Not now |
| opened_proof_changed, opened_proof_red_twice | A test of the plan changed after the plan was confirmed, or failed on two versions of the work. Send the plan back to the planner? | Send back to the planner, It is fine, go on, Not now |
| proofs_missing, prover_refused_thrice | The plan's promises have no tests yet, or no test could be written for one. Send the plan back to the planner? | Send back to the planner, It is fine, go on, Not now |
| queued_over_bound | This card has waited more than <time> for a free place to run. Is that fine? | It is fine, go on, Not now |
| review_refused_not_run | Notice: this card cannot merge yet because the review did not run on its newest work. | Noted, Not now |
| session_no_push | Notice: this card's last sessions changed no code. | Noted, Not now |
| wait_over_bound | This card's run has not moved or answered for more than <time>. Rescue the work into a new card? | Rescue the work into a new card, It is fine, go on, Not now |
