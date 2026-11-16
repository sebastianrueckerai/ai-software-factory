# The board's cards: the problem and the goals

Date: 2026-11-16. Status: goals set by Sebastian, plan in [plans/2026-11-16-every-card-readable.md](plans/2026-11-16-every-card-readable.md).

This document states what is wrong with the cards on the factory's board, why four earlier attempts did not fix it, and what the next attempt must reach. It holds every fact the plan builds on, so a reader who starts here needs no earlier conversation.

## 1. The problem

The board must give a clear picture of the work: what is built, why, what comes next and how each plan was cut into cards. It does not. A human who reads a card today cannot tell what work the card carries or why the work exists. An agent that builds the card gets the same weak text, so it builds without the reason.

Sebastian's words, 2026-11-16:

- "If I do not understand what a card is and why it is done, then likely the agent will do a poor job."
- "Every card on the board needs good design and, even more important, good information hierarchy."
- "I want to see on the card the info an agent implementing it would see."
- "If it is on the board, if a human has actions on it, that means it falls under the redesign with helpful titles, progressive disclosure and one action at a time."
- "We cannot expect a user to be familiar with things like 'task #2004' or 'as per plan's requirement 1b' or 'Phase A'."
- On the criteria card #1850: "I never ever answered one of these manually successfully. I was always stressed and overwhelmed and missed the context of what this means. It needs to tell me in simple terms each time and give the necessary context, but no more than that. Walls of text are just as bad."
- On the chat inbox: "It now has walls of text messages with every info, which still somehow make me feel stressed but do not tell me anything I understand."

The problem has two halves. The information hierarchy is wrong: the card holds the wrong text in the wrong order. The presentation is wrong: long faces, many buttons, raw form fields. The hierarchy is the more important half.

## 2. What the live board shows

Read from the running factory on 2026-11-16 between 08:52 and 09:05 UTC: the board page, the drawer of 81 cards, and the database. The board held 4 cards in Needs you, 22 in Queued, 5 in In progress and 381 in Done. The 81 cards read are all open cards plus the newest 50 Done cards.

The table shows how many of the 81 cards have each fault.

| Fault | Cards |
|---|---|
| The small card gives no reason for the work | 78 |
| The stored card text is longer than 3,000 characters | 55 |
| The title states an outcome or a target behaviour, not the work | 44 |
| A card of a plan shows no plan on its face | 40 |
| The title is cut at 80 characters | 29 |
| The title holds a reference nobody explains | 25 |
| The title holds a code identifier | 20 |
| The plan chip shows a slug, not a name | 14 |
| A finished card offers Close or Retry | 13 |
| The title is junk, an instruction or another card's text | 5 |
| The face is longer than 1,000 characters (Needs you only) | 3 of 4 |
| The form labels are raw argument names (Needs you only) | 3 of 4 |
| The face has more than 5 actions (Needs you only) | 2 of 4 |

At least 9 cards also carry text that contradicts the record.

### The three cards Sebastian named

**#2101, a work card for a human.** Title: "The two reproducible manifests name the proofs trees: the red goes green and the merge records the six verdicts". The real work is two one-line edits, one in `Dockerfile.runner` and one in `ci.yml`, which agents may not push because the files sit under a workflow directory. The card does not say so in its opening lines. Its face is 7,439 characters. Its reason reads "The case is the human card.", a template that fills in when no writer wrote a reason. Its one button is "Done", which checks nothing. The card does not say that it waits for card #2100. Its text names a branch `card/2084` that exists in no repository and a pull request that closed unmerged 26 minutes before the card was filed.

**#2004, a card that ran out of money with review findings open.** Title: "The three faults end to end: priced, asked, funded". The face is 6,396 characters with 12 buttons. The drawer has 21 buttons. The ask says "Fund it, or park it?" and the recommendation says "Successor". The face lists eight findings before the money. The card's own text says that four of its buttons "unblock nothing". One button is "Confirm audit" with a field labelled "the findings to confirm, one per line, empty for all". The drawer's section "Reviews and audit" is empty while the ask cites eight audit findings.

**#2100, a queued work card.** Title: "The doClose refusal narrowed to plans that hold criteria: the review finding answered on branch card/2084". The real work: the console refuses to close a plan while criteria are open, and the card narrows that refusal to plans that hold criteria. The title is an outcome sentence, holds a code identifier and names a branch that neither a human nor the build agent can open. The plan chip reads "empty commit fires gate", an approach that the card's own text forbids.

### #1850, a criteria card that already has the carousel

This card got the one-decision layout of the last plan, and it still fails. The layout was not the missing part. The missing part is the story.

What happened, from the record: plan #1850 fixed five promises ("criteria") when Sebastian confirmed it. A separate session wrote one hidden test per promise. The factory runs those tests once, when the plan's last card ends done or merged. The last card, #2011, pushed nothing in three sessions, because its work was already on main through another card. The project agent closed #2011 to save money. A closed card skips the tests, so no test ever ran. The factory then filed the request "criteria never judged".

What the card says: a heading "Criteria never judged #1850, revision 0", a fixed paragraph, and five pages with one criterion each. It does not say why no test ran. It does not say what settling the promises leads to. Its text, the chat message and the issue comment all offer "Confirm the delivered cards", a button that cannot appear on this card. The buttons that do appear are Waive, once per criterion, and Deny. Waive on all five closes the plan and ends its hold on production deploys. Deny changes nothing, and the question never comes back. A model wrote a brief of 3,299 characters for the case, and no surface shows it. No action exists that runs the hidden tests now, which is the one thing a human would want.

A face that follows Sebastian's sketch, with facts the record holds:

```text
Plan "one face" finished, but no test checked its 5 promises. Settle each one.
The last card, #2011, closed without a merge, so the factory never ran the
plan's tests. Until all 5 are settled, the plan stays open and holds
production deploys.

Promise 1 of 5: every card that asks shows one decision block.
The work is on main. No test checked it.
[ Drop this promise ]  When all 5 are settled, the plan closes.
```

The same gap holds for every ask of the spec-driven process. The table shows what each face lacks.

| Ask | What the face lacks |
|---|---|
| Plan question | The plan's goal in one line, and what each choice changes |
| Plan confirmation | The promises in plain words. Today it is 2,000 to 4,600 characters of fixed text and bare ids |
| Hold-out, Okay or Drop | What a hold-out is, and what each choice costs |
| Criteria gap | Which test failed, and what the extra card costs. "Approve" means "grant one more card" |
| Criteria never judged | Why no test ran, and the true set of answers |
| Merge approval with criteria | That "Not met" sends the pull request back, and why Approve is hidden |
| Done plan, "Close with note" | That it drops every open promise. Only a hidden label says so |

### The chat inbox

The last 40 messages of the project chat, 07:05 to 09:12 UTC on 2026-11-16:

| Measure | Messages |
|---|---|
| Repeat what a board card already says | 28 |
| Longer than 600 characters | 14 |
| Longer than 1,500 characters | 11 |
| Ask the human something | 8 |
| Still need an action | 3 |

The causes:

1. **Notes for the agent show to the human in full.** When a case moves up a rung, the factory writes a note that wakes the project agent. The panel folds only notes whose kind starts with `wake` (`internal/console/static/chat.js:283`). Since 2026-11-11 these notes have the kind `case_climbed`, so each one renders in full, under the human's own name. On 2026-11-16 until 09:12 that was 46 notes with 544,017 characters, 81 percent of the inbox.
2. **The agent's reply to each note shows in full.** The replies have 300 to 730 characters, use private words ("rung", "work-bound", "standing serialisation ruling") and mostly say that nothing needs the human.
3. **An ask repeats its Needs-you card and grows.** The ask for #2101 reached 2,168 characters with the agent's analysis attached.
4. **Template text is wrong or written for the agent.** The ask for #2084 says "stopped by its budget" when the session cap stopped it. Its why line holds instructions for the agent.
5. **No rule bounds a message's length.** The Go templates in `internal/console/pokes.go` have no bound, and the writing guide sets none.

## 3. Why the earlier attempts fell short

Four plans worked on the cards between 2026-10-17 and 2026-11-13. Each one limited its scope, and the limit is where it failed.

| Plan | What it covered | What it left out |
|---|---|---|
| [Question format](question-format-concept-2026-10-17.md), 2026-10-17 | The five parts of a question, in the chat inbox | Every board card |
| [Needs-you cards](plans/2026-10-20-needs-you-cards.md), 2026-10-20 | Cards filed for a human | Agent cards, and the reason and recommendation stayed in the drawer |
| [Five-part stops](five-part-stops-plan-2026-11-02.md) and [card-flow redesign](card-flow-redesign-2026-11-02.md), 2026-11-02 | Cards that stop and ask | Stall, repair, alert, rerun, config, routine and issue cards. Each phase said "not the face" |
| [One face for every card](plans/2026-11-13-one-face-every-card.md), 2026-11-13 | By its title, every card | It "invents nothing". Work cards, finished cards, routine cards and the drawer passed "as built", judged by reading. Its test has fixtures for 8 kinds, and the board has 36 card kinds, 34 case kinds and 5 approval kinds |

No plan has ever covered these:

- the title of any card except a human card's ask and a plan's short name
- a layered face for a work card
- how a Queued card shows why it waits
- failed cards
- cards that inform and do not ask
- face text that sends the human to the issue or the chat to act
- one set of button labels
- the drawer's order and depth
- what the agent reads next to what the human reads

The pattern: a plan named the kinds it would fix, and every kind outside the list kept its old shape. The next plan must not name kinds to fix. It must name the contract, and the code must refuse a kind that does not meet it.

## 4. Root causes

Each cause is a fact of the code in `ai-software-factory-code`, read at commit `d39984009`.

1. **No card stores its reason.** The planner's card has the fields `key`, `role`, `title`, `brief`, `directories`, `depends_on`, `acceptance`, `size`, `rung`, `image`, `from` (`internal/factoryd/plan.go:249`). No field holds why the card exists or which part of the plan it serves.
2. **One sentence governs every plan card's title and text.** The planner's prompt says "title and brief: markdown, what to build and how it is checked." (`plan.go:1366`). The only check refuses an empty title (`plan.go:876`). Six other writers file titles with no rule beyond "one line": the delta planner, the chat agent, the coding agent's `delegate`, the successor copy, the retry copy and the helper tasks.
3. **The agent's brief and the human's card are built apart.** The agent's brief is assembled at session start in `briefText` (`internal/factoryd/opencode.go:708`) and is stored nowhere. The card is assembled in `internal/console/board.go`. They share only the stored card text and the card's life. The plan's text and summary reach the agent and never reach the card's drawer. The human can also set a summary that replaces the title on the board only, so the two readers see different titles.
4. **The agent's reason is thin too.** A plan card's agent gets the plan issue's text and the plan's summary. It does not get the plan's outcome and glossary, the answers humans gave to the plan's questions, or what the cards it depends on delivered. The model review reads the card text only, never the plan. A successor of a plan card loses the plan text.
5. **No card links to a part of its plan.** A card stores its plan task, its key and the revision. No field names a section of a plan document. The console can already open a document at a heading (`GET /projects/{name}/docs/{path}`), but nothing stores such a link.
6. **References have no target.** `#N` prints as plain text with no link. `branch card/NNNN` exists only in the planner's clone. "fault N" points at a list that renumbers. "Phase B" and "requirement 1b" are section labels copied without a link.
7. **Every kind renders by its own path.** The board has five card templates and the drawer is a sixth surface. 23 case kinds get the five-part face. Sixteen other paths fall through to older shapes (appendix C).
8. **Button labels are action ids.** Every button from the action table is labelled by its id with the underscore removed: "Rerun checks", "Raise ceiling", "Handover", "Reverify" (`internal/factoryd/actionform.go:70`). Argument specs render as form fields on the face. One meaning has up to seven labels: closing a card reads "End the card", "Close", "Handled, close", "Fixed, close", "Decided, close", "Re-ran it, close" and "Done".
9. **A face offers every legal action, not the answers to its question.** An action shows when its predicate on the case's facts holds. A stopped card can show 11 offer buttons, plus the question's own answers, plus a fund field and a note box on every asking face.
10. **One case mixes several matters.** A money ask gets the findings sentence put before it, the rung's mark after it and "Last answer processed" under it. #2004's wall of text is one such case.
11. **No test walks every kind.** No test ranges over every case kind, approval kind or card source. Console tests name 19 of the 34 case kinds. One case kind has no words at all (`checkin_failed`), and one has no opener (`agent_request_info`).
12. **A face offers answers that cannot happen and lacks the answer a human wants.** The criteria face names a Confirm button that its own rules hide. "Deny" changes nothing. No action runs a plan's tests on request. Card #2101's "Done" checks nothing.
13. **An ask does not tell its story.** No face says, in the terms of the process, what was promised, what happened and what each answer leads to. The fixed texts explain the mechanism in general and not this case.
14. **The inbox shows the agent's own notes and repeats the board.** See section 2.
15. **Not every writer gets the writing guide.** [The writing guide](writing-guide.md) says it "rides in the context of every step that writes such text". Section 7 lists which writers get it and which do not.

## 5. Goals

G1 to G13 are the contract. A card kind, a case kind or an action that does not meet them fails the build.

**G1. Every card, every action, no exception.** Whatever the board, the drawer or the chat inbox renders is in scope: every card source in every column, every case kind, every approval kind, every button and every form field. The title is in scope. A plan for this work has no "not this plan's work" list for anything a human can see on the board.

**G2. One brief for the agent and the human.** Each card stores one brief. The agent's session reads it and the card shows it. The human sees, before a session starts, the title, the reason, the summary, the full text, the acceptance items and the plan text that the agent will get. The agent may fetch more with tools. The card also shows the exact text each past session got.

**G3. Disclosure in layers.** A reader who knows the topic stops at the title. A reader who is out of the loop reads on and understands. Each layer adds facts and repeats none. Section 6 names the layers. The number of layers is not the point. The point is that each stop gives a full picture at its depth.

**G4. The title names the work.** A work card's title says which work the card carries, in plain words, without a reference and without a code identifier. A card that asks has the ask as its title. The title is never cut: its writer keeps it short.

**G5. The reason is on the card.** Each card states why it exists: which goal of the plan it serves or which problem it removes. The user-story form shows the rule: as a role, I want a feature, to reach a goal. A builder who lacks the goal builds with the wrong emphasis.

**G6. The plan is one click away.** A card of a plan names its plan by a name a human can read and shows its place: card 2 of 5, what comes before it and what comes after. The opened card shows the part of the plan that concerns this card, with a link to the whole plan. The board answers three questions without a click into Forgejo: what is being built, what is next, and how the work was cut.

**G7. Every reference explains itself.** A card number, a plan, a pull request, a criterion, a term of the factory: each one is a link, and the text gives a few words on what it is at its first use. A reference that no reader can open is refused where it is written.

**G8. One decision at a time, with prepared answers.** A card that needs a human shows one question. It offers a few prepared answers, at most four. Each answer has a plain label and one line on what it does. The suggested answer comes first and says who suggests it and on what grounds. Every field has a sensible default. A field appears only when the chosen answer needs it. Other legal actions sit one click deeper. A card with one button and no way to refuse or defer does not exist.

**G9. An ask tells its story each time.** A card that asks says what was planned or promised, what happened, and what each answer leads to. It uses the facts of this case and no general text about the mechanism. It explains each step of the process it touches in a few words, every time, because the reader forgot the process. It holds what the decision needs and no more. A wall of text fails this goal as much as a missing reason does. Every answer on the face can happen, and every answer changes something.

**G10. The inbox is short and holds only what the board does not.** A message to the human has one topic and a bound on its length. A message about a card gives the card's title, one line and a link, and the card holds the rest. Notes between the factory and its agents do not show to the human. A message that needs nothing from the human says so in its opening words or is not sent.

**G11. Simple speech everywhere.** Every text a human reads follows [the writing guide](writing-guide.md): titles, reasons, summaries, asks, button labels, effect lines, refusals. A writer with a narrow job gets a short form of the guide cut to that job.

**G12. A card does not contradict the record.** A card does not name a branch that does not exist, a pull request that closed, or an action its own text calls useless. A plan does not read "done" while its cards wait.

**G13. Coverage is proven, not claimed.** One register in the code lists every card source, case kind, approval kind and action. A test fails when a kind exists that the register lacks, and renders every entry against the contract. One gallery page shows every kind at every layer, and Sebastian reads it before the work counts as done. A check over the live board counts the violations of the title and reference rules, and the count must reach zero for open cards.

## 6. The card model

### One record, three questions

Every card, of every kind, answers three questions at every depth:

1. **What is it?** The work the card carries, or the question it asks.
2. **Why does it exist?** The goal it serves, or why the question came up.
3. **Where does it stand?** Waiting and for what, running and at which step, finished and how. For a card in Needs you: what the human must decide.

### The layers

The table shows which text answers the questions at each depth, and where a reader sees it.

| Layer | Work card | Card that asks | Where |
|---|---|---|---|
| 1. Title | The work, in plain words | The ask, in one sentence | Small card |
| 2. Why line | One sentence: the reason for the work | One sentence: why the question came up and what it costs to wait | Small card (not on Done cards) |
| 3. Place and state | Plan name, card 2 of 5, state word, the reason it waits | The suggested answer as a button, a count of the other answers | Small card |
| 4. Summary | A short paragraph: what gets built, what it changes for whom, how it is checked | The answers, each with its effect line. Then what the call needs: what was done, what is left, the numbers | Opened card, top |
| 5. Full brief | The steps, the acceptance items, the criteria they cite, what it depends on | The evidence: findings, the money arithmetic, the card's life | Opened card, folded |
| 6. The plan | The part of the plan for this card, the breakdown into cards with this one marked, a link to the whole plan | The work card's layers 1 to 5: what this card does in the larger picture | Opened card, folded |
| 7. The session's text | The exact brief each session got | The same | Opened card, folded |

Layers 1, 2, 4 and 5 of a work card are the stored brief. The agent's session reads the same four texts. Layer 6 is the same plan text the agent gets. This is G2.

### The same card, before and after

Card #2100 today, on the board:

```text
#2100 - The doClose refusal narrowed to plans that hold criteria: the review finding…
from plan #1947 · empty commit fires gate
```

Card #2100 under this model. The wording is an example, not final copy:

```text
#2100                                queued 2 h
Narrow the close refusal to plans that hold criteria
So a plan with no criteria closes without a waiver.
plan: criteria gate · card 1 of 3 · waits for no card
```

Card #2101 today has a 7,439-character face and one button, "Done". Under this model:

```text
#2101                                needs you 8 min
Change two lines in the runner's build files
Agents may not push to workflow folders, so this part of plan
"criteria gate" needs a human. Wait for #2100 to merge first.
[ I made the change ]   2 other answers
```

Opened, it shows the two lines to change with their files, then the answers: "I made the change" (the factory checks that the lines are on main, then closes the card), "I cannot do this" (the card returns to the planner with your note), "Not now" (the card stays, and the plan waits).

Card #2004 today leads with eight findings and has 12 buttons. Under this model:

```text
#2004                                needs you 3 h
The card is out of money with 8 review findings open: fund 2 EUR more, or end it?
It spent 4.00 of 4.00 EUR in 3 sessions. The last session fixed 2 of 10 findings.
[ Start a successor card ]  suggested by the factory agent   2 other answers
```

Opened, it shows each answer with its effect, then what was done and what is left, then the eight findings behind a fold, then the work card's own brief: what the card builds and for which plan.

## 7. Simple speech: which writers get the guide

Sebastian, 2026-11-16: "I prefer simple speech on everything." The factory's [writing guide](writing-guide.md) is a copy of his own guide with one added rule (a human is a human). He expects that every agent that writes text for a human gets it, and that a writer with a narrow job, such as titles only, gets a short form.

The code does not do that. Two writers get the guide in full. About 17 model writers get none of it, and these are the writers that fill the board. The guide's text is compiled into the binaries from `internal/writingguide/writing-guide.md`.

| Writer | Text a human reads | Gets the guide |
|---|---|---|
| Screening | Reasons for a suspect issue | Yes |
| Sizing | The reason for a size | Yes |
| Check-in | The reason it hands a card up, verdicts on findings | In two of its three moments |
| Project agent, and the factory agent on a case | Chat messages, new cards, answers on issues, text on case faces | Only when it calls a tool for it. Its standing prompt says "Answer briefly." |
| Planner and replanner | Card titles, card text, plan summary, plan questions | No |
| Delta planner | Card title and text | No |
| Coding agent | Its summary, its question to a human with choices and recommendation, delegated cards | No. A test requires the guide to be absent |
| The check-in's rung on a case | Grounds and the why text | No |
| Case brief writer, approval brief writer | What the call needs, the recommendation | No. The prompt says "plain words" only |
| Model review, audit, gate supervisor | Findings and diagnosis | No |
| Hold-out proposer, judgement, answer screener | Claims and reasons | No |
| Plan namer, chat thread title, chat compaction | Plan name, thread name, chat summary | No |

More facts:

- No check enforces wording anywhere. The checks that exist are length caps and "title empty".
- The factory's copy of the guide lacks two rules of Sebastian's guide: no announcer fragments, and no "honest note". It holds none of the board's own rules: write for a reader who dropped in cold, explain every reference, the title names the work.
- Text that Go code writes breaks the guide too: an em dash in `question.go:582`, semicolons in `caseface.go:90` and `actionform.go:29`, and "€0.600000" from `question.go:571`. About 5,400 prose strings sit in the code, and roughly half reach a human. They concentrate in the console's refusals, `question.go`, `caseface.go`, the effect lines of `actionform.go` and the templates.
- Live text shows the result. 26 of 30 coding-agent summaries hold an em dash or a semicolon. The case brief on #2004 is one paragraph of 2,700 characters with "rung 0" and "case 5631" unexplained. A recommendation on #2091 grades another step's work: "The rung-1's read is right".

The guide splits into seven jobs, and each writer gets the form for its job: title, why line, ask with answers, brief, finding, summary, chat. Only the chat agent needs the whole guide, and it belongs in its standing prompt.

## 8. Decisions

Sebastian decided these on 2026-11-16:

1. **The small card shows the title and a why line.** A Done card stays at the title and its state.
2. **The wide view goes.** The four-column board is the one board.
3. **Helper tasks leave the board.** Screening, sizing and prover tasks show as a step of their parent card, in its state line and its life.
4. **The work is built locally**, not through the factory.

These are the plan's calls. Sebastian can overrule each one.

5. **The writer of a card writes its title, why line and summary as separate fields.** The planner knows why a card exists, so it writes the reason. A second writer that guesses the reason from the text would lose it. The filing door checks the fields and refuses with the fitting action, so the writer corrects itself.
6. **The summary override goes.** Today a human can set a summary that replaces the title on the board only. An edit of a card's title or reason changes the stored brief, so the agent reads the edit too.
7. **Open cards get new briefs once.** A one-time pass writes the title, why line and summary of every card in Needs you, Queued and In progress from its stored text and its plan. Done cards keep their text and get the new layout.
8. **A human's own issue title stays.** The why line of a human's issue is the opening sentence of its body.
9. **"Last answer processed" leaves the face.** Two earlier documents disagree on it. The line is state, and the card's life holds it.
10. **The note box and the fund field leave the standing face.** They appear when the chosen answer needs them.
11. **The inbox takes its text from the card.** A message about a card is the card's title, its why line and a link. Notes that wake the agent fold to one line.
12. **A criterion gets a plain name.** The planner writes each criterion's promise in plain words, at most 80 characters, and the faces use it.
13. **The look runs as a condensed design round.** The small card and the opened card change, so [design/process.md](../design/process.md) applies. Sebastian's pick becomes a C-entry and amends C11 and [design/ia.md](../design/ia.md).

## 9. Approaches considered

**A. Fix the listed bad kinds one by one.** This is what the four earlier plans did. It is the smallest change per kind. It fails again because the list is the scope, and a kind outside the list keeps its old shape. Rejected.

**B. A second model rewrites each card for the human.** A writer step reads the card's text and writes a readable face. It needs no change to the planner. It breaks G2: the human would read a rewrite, and the agent the original, so the human could not judge how the agent is prepared. The rewrite can also drift from the record. Rejected as the main path. A one-time form of it writes the briefs of the cards that are open today (decision 7).

**C. One stored brief, one register, one renderer.** The card stores its brief in fields. Every writer fills the same fields through one checked door. The agent's session and the console read the same record. One register lists every kind with its texts and its answers, and one set of templates renders every entry. A kind that is missing from the register fails a test. Chosen. It costs a change to the planner's schema, to each filing door, to the agent's brief and to the console's templates. It is the only approach where a new card kind cannot arrive without a face.

## 10. What stands and what changes

These decisions of [design/design-decisions.md](../design/design-decisions.md) stand: four columns with Needs you first (C4, C8), the whole card opens the drawer (C7), no stage bars (C10), routine cards under Queued (C16), the status strip (C20, C25), press behaviour (C31, C42), plan names (C40), no verdict buttons (C41), the amber band and the carousel (C44), the criterion row (C45).

These change, each through the design round's C-entry:

- C11 lets the face show one time and no reason. The why line and the place line join the face.
- [design/ia.md](../design/ia.md) describes the face without a summary line and still describes the pulse and the wide view. It is rewritten to the new face.
- The five-part face keeps its five parts. Its order on the board changes: the ask, the why line and the suggested answer on the small card, the rest on the opened card.

## 11. Not goals

- No new column and no new card state. The board stays a view over the task states.
- No change to what an existing action does. Labels, order, defaults and offers change. Three actions change in number: "run the plan's tests now" and "I cannot do this" are new, because their faces lack the answer a human needs, and "Deny" on a criteria request goes, because it changes nothing.
- No change to the notifications page or the launch surfaces. The chat panel changes only in what it shows of the inbox (G10).
- No rewrite of Done cards' text.

## 12. Sources

Design documents:

- [ai-software-factory-ux-conversation.md](ai-software-factory-ux-conversation.md), lines 68 to 186 and 360 to 530: the card hierarchy and progressive disclosure
- [card-flow-redesign-2026-11-02.md](card-flow-redesign-2026-11-02.md), sections 5.7 and 5.8: the five parts, one decision at a time
- [plans/2026-11-13-one-face-every-card.md](plans/2026-11-13-one-face-every-card.md): the last attempt and its census
- [plans/2026-10-20-needs-you-cards.md](plans/2026-10-20-needs-you-cards.md): the ask is the title
- [question-format-concept-2026-10-17.md](question-format-concept-2026-10-17.md): the five-part question
- [needs-you-register-2026-11-09.md](needs-you-register-2026-11-09.md): the register of Needs-you faults
- [board/proposal-v2.md](board/proposal-v2.md) and [board/report-final.md](board/report-final.md): the board's rules and open deviations
- [plans/2026-11-14-provider-limit-freeze.md](plans/2026-11-14-provider-limit-freeze.md): a planned card that informs and does not ask
- [agent-context-map.md](agent-context-map.md) and [agents/coding.md](agents/coding.md): what each agent gets
- [writing-guide.md](writing-guide.md): simple speech
- [design/design-decisions.md](../design/design-decisions.md), [design/ia.md](../design/ia.md), [design/process.md](../design/process.md): the confirmed look and the round process

Code, in `ai-software-factory-code/internal`:

- `factoryd/plan.go`: the planner's card schema (249), the title rule (1366), the card body (1251), filing (3804), the plan text for the agent (4117)
- `factoryd/opencode.go`: the agent's brief (708)
- `factoryd/cases.go`: the case kinds (23). `factoryd/caseface.go`: the five parts. `factoryd/question.go`: the question templates
- `factoryd/actions.go`: the action table (88). `factoryd/actionform.go`: labels, effect lines, arguments
- `factoryd/title.go`: the title cut
- `console/board.go`: the card (482), the board (2256), the drawer (3809)
- `console/cases.go`, `console/decide.go`, `console/approvals.go`: the asking faces
- `console/templates/board.html`, `console/templates/drawer.html`: every card template

## Appendix A: every card kind

A card's kind is not one field. It follows from its source, its track and its parent. The census found 36 kinds.

**Agent cards (18).** The title today is the opening paragraph of the card text, cut at 80 characters.

| Kind | Who writes the title today |
|---|---|
| Direct work card | A human's issue, or the chat agent |
| Plan card | The issue title. A model writes the short plan name |
| Plan child: foundation, feature, integration | The planner |
| Delta card | The delta planner |
| Retry replacement | A copy of the failed card's title |
| Successor | A copy of the old card's title |
| Delegated card | The coding agent |
| Helper task: screening, sizing, prover | A copy of the parent's title |
| Tool request | Template: "Add X to image Y" |
| Roll | Template: "roll sha: images" |
| Main fix | Template: "main is red at sha: …" |
| Revert, group revert | Templates |
| Chain repair | Template |
| Alert | Template: "alert: name on service in namespace" |
| Routine | The routine's file |
| Template update, schema copy, GitHub sync, image removal | Templates |

**Human cards (18).** The title is the ask, at most 200 bytes.

| Kind | Who writes the ask | Answers today |
|---|---|---|
| Human issue | The issue title | "Have the factory do it", "Done" |
| Reproduction-rule card | The issue title | "Done" |
| Workflow-files card | The issue title or the planner | "Done" |
| Card moved to a human | Unchanged title | The issue's choices |
| Factory pull request on a project without agents | Template | "Handled, close" |
| Chat escalation | The chat agent | The agent's own words |
| Alert | Template | "Wait for it to clear", "Handled, close" |
| Chain stall | Template | "Re-run again", "Check again", "Dismiss" |
| Chain repair | Template | "Handled, close" |
| Roll refused | Template | "Fixed, close" |
| Roll failed | Template | "Retry the roll", "Park", "Close" |
| Rerun | Template | "Re-ran it, close" |
| Still red | Template | "Fixed, close" |
| Config rejected | Template | "Fixed, close" |
| Month cap | Template | "Let it stand", "Decided, close" |
| Judgment budget | Template | "Decided, close" |
| Production held | Template | "Wait", "Deploy anyway", two replan answers |
| Routine for a human | The routine's file | "Have the factory do it", "Done" |

**Approval kinds (5).** None shows the card's title: plan, merge, criteria, criteria never judged, resource.

**Case kinds (34).** A case is one problem on a card. session_cap, agent_time_cap, budget_floor, day_cap, month_cap, project_cap, checkin_human, checkin_share, checkin_failed, policy_class, gate_stop, findings_repeated, dependency_closed, dependency_failed, wait_expired, pod_never_started, provider_refused, no_answer, content_filter, image_wait, screening_suspect, agent_escalate, agent_request_info, other, plan_question, plan_confirmation, merge_approval, plan_criteria, human_card, judgment_budget, red_main, roll_held, config_refused, monitor_flag. The monitor flag has 18 sub-kinds, each with its own headline.

For 13 of these kinds the headline is the raw stop reason, for example "check-in: goal_conflict: …" or "Monitor flag: wait_over_bound(…)".

**Other board items.** Routine cards under Queued with three buttons. The status strip with "Fund the chat" and "Deploy now". Planned and not built: the freeze card of the provider-limit plan.

## Appendix B: every action

The action table holds 29 actions, and a human may pick 27 of them: resume, continue, handover, reverify, rerun_checks, wait_checks, extend, fund, raise_ceiling, successor, retry, replan, close, approve_merge, deny_merge, set_dependency, remove_dependency, file_card, restart_plan, answer_criteria, grant_criteria, confirm_criteria, deny_criteria, deploy_now, settle, salvage, note. Two belong to the factory alone: route_approval and withdraw.

Next to the table:

- about 20 prepared answer values with their labels (grant, park, keep_waiting, fund, close, go, extend, overrule, successor, retry, dismiss and others)
- 15 buttons of the approval, plan and criteria faces (Approve, Deny, Close, Send, Re-run the checks, Met, Not met, Waive, Confirm the delivered cards, Confirm, Request changes, Okay, Drop)
- 4 buttons of the small card (Retry, Close, Close with note, a plan's Close with note that waives every open criterion)
- 5 older escalation controls (a form per choice, a free answer box with three send buttons, a fund form of three fields, an extend form of five fields)
- 12 buttons of the drawer, the routine card and the status strip (Replan, Extend the card, Save summary, Accent, Send to the session, Talk about this card, Retry, Skip once, Needs me, Run now, Fund the chat, Deploy now)

They post to 24 endpoints.

## Appendix C: every path that falls outside the five-part face

1. Human-card cases (human_card, judgment_budget, red_main, roll_held, config_refused, month_cap on a human card): one older form per choice
2. Human cards with no case at the human
3. Agent asks with no prepared question: a free answer box, the fund form and the extend form
4. The extend form on every older asking face
5. Monitor-flag cases: no buttons, and the face sends the human to the chat
6. Older cases in a card's carousel: text and no buttons
7. Criteria and criteria-never-judged approvals: a raw artifact block and fixed text
8. Merge approvals on red checks, with open criteria, or for a viewer who may not approve
9. Plan approvals: hold-outs, a text box, and a second copy under each plan case
10. Plain cards in Needs you: waiting on the author, or a human card with no question
11. Done plans: "Close with note", which waives open criteria
12. Failed cards: Retry and Close
13. Routine cards
14. Helper tasks
15. The wide view
16. The drawer's forms
17. A case kind with no opener (agent_request_info) and one with no words (checkin_failed)
