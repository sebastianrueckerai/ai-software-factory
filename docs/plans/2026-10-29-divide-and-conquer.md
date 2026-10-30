# Plan: divide and conquer

Status: decided by Sebastian on 2026-10-29 in the controller chat, in the build since (roadmap 336). Section 5 lists the decisions.

Evidence: the post-mortem of card #1287 (t-d2254f4deef1), the lane collapse, which failed on 2026-10-28. Facts below were checked against code at origin/main a4bbd6b8, infra e277f57 and the live database on 2026-10-29.

## Goal

The factory runs on GLM-5.3. GLM-5.3 finishes a card reliably when the card is small enough. So the factory cuts work into cards of that size. It cuts at filing, and again when a card turns out bigger than its filer thought. A feature made of several cards goes live only when all of it is there and checked as a whole.

## Non-goals

- A small change pays no procedure. A button, a colour, a typo stays one direct card.
- No web of cards. No plan inside a plan, no dependencies between groups, at most 12 cards filed in one planning round.
- No silent rescoping. Every cut is recorded on the card that was cut.

## 1. Answers to Sebastian's questions

### 1.1 Card sizes

A card has one of three sizes: small, medium or large. The filer sets it: new_card's `size` parameter, a "Size:" line in the issue body, or the planner's row for a plan child. The size sets two numbers:

| Size | Budget EUR | Planned changed lines |
|---|---|---|
| small | 2 | 300 |
| medium | 5 | 600 |
| large | 10 | 1,000 |

The line figures come from the policy's `large_lines: 1000`, the bound above which a pull request is class large and waits for a person to split or accept it. The planner and the split check use them. A card without a size gets `task_default_eur`, today 5 EUR.

Most cards carry no size. Of 478 direct cards in the code repository since 2026-10-01, 442 had none: 236 rolls, 120 issues and API filings from people or the chat, and 86 from other machine sources and plans.

### 1.2 What "size large always goes through the plan track" meant

new_card would refuse a card of size large on the direct track and point the filer to the plan track. It was the narrow version of Sebastian's ruling of 2026-10-28. His wish now is wider: every change that is not obviously small goes through the planner. Piece A does that.

### 1.3 How the factory checks the whole today

The spec-driven process already handles a spec that only the combined cards can meet ([docs/spec-driven.md](../spec-driven.md)).

- The planner turns the spec into criteria. Each criterion has an id, a kind and a named proof.
- Each card cites the criteria it works on and has its own acceptance tests. A green card is evidence, not the verdict.
- The last card of a plan is the integration card. It starts from main with every other card merged. Its criteria gate runs every named test on the assembled feature, and its review answers per criterion: met, partial or unmet.
- The plan closes (event `plan_closed`) when every criterion is met or waived. An unmet criterion whose fix is too large for the integration card becomes a delta card under the same plan.
- A medium change takes the same path as one card that is its own integration card.

Two gaps remain:

- The children merge and go live one by one, before the integration card checks the whole. Piece C closes that gap.
- A direct card that turns out big has no spec and no criteria. Piece B sends it through the planner, which drafts them.

### 1.4 Does a session know its runway?

Yes. The brief's first fact line reads "budget X of Y EUR left; N minutes of agent time left; this is session A of the B the policy allows". The last session is told to push. At 80 percent of budget or time, factoryd tells the agent to wrap up. Session 1 of #1287 knew it had 10 EUR and 120 minutes.

The runway was not the missing fact. The missing fact was how much work the card held. No step compares the work with the runway. Piece E adds that comparison.

### 1.5 Are sessions restarted too quickly?

#1287's three restarts all came from faults fixed in roll #1303: the stuck rule ended a session without the check-in, and the per-card call cap sent every later trip to a person. Under Ruling 327 every trip goes to the check-in, whose default answer is a message into the running session.

A session still ends in three cases:

- Its agent time runs out. The work goes on in the next session.
- Its pod dies. The work goes on in the next session.
- The check-in judges the approach wrong and decides redirect or retry_stronger.

In the first two cases the next session needs the old session's working state. In the third it needs to know what failed. Piece D carries both.

### 1.6 Is a session's work saved?

The code is saved. The worker commits and pushes the working tree at every stop, and the next session starts on that branch. What is lost is the working state that never became code: the todo list and the maps its subagents wrote. #1287's sessions 1 and 2 built maps for 417 tool calls and left nothing. Piece D keeps that state.

### 1.7 Point 7 explained: what one card costs

A card costs a fixed amount, whatever its size, plus an amount per changed line. A straight-line fit over 139 finished direct cards since 2026-10-01 gives:

- fixed: about 0.85 EUR per card. That pays for the reading-in, the check-ins, the CI runs, the review and the merge.
- per line: about 0.004 EUR per changed line.

| Changed lines | Cards | Average EUR | EUR per 100 lines | Average sessions |
|---|---|---|---|---|
| 0 to 49 | 32 | 0.68 | 3.26 | 2.2 |
| 50 to 149 | 35 | 1.02 | 1.10 | 2.6 |
| 150 to 299 | 30 | 1.72 | 0.84 | 3.3 |
| 300 to 599 | 27 | 2.91 | 0.68 | 3.0 |
| 600 to 999 | 5 | 4.61 | 0.55 | 5.0 |
| 1,000 or more | 10 | 5.21 | 0.40 | 5.6 |

Cutting too fine wastes money. A 1,000-line change as one card costs about 0.85 + 3.7 = 4.6 EUR. Cut into ten 100-line cards it costs about 10 × 0.85 + 3.7 = 12.2 EUR, and it adds ten cards that wait on each other.

Cutting too coarse risks the card. Above 600 lines a card needs 5 or more sessions on average, and every session is a chance to fail as #1287 did.

So the planner should aim at cards of about 150 to 600 changed lines: the small and medium sizes. The fit uses finished cards only, and the two largest rows hold 15 cards, so take the figures as rough.

### 1.8 Point 9: what exists and what was proposed

What exists: a card merges only with green checks, so main builds and passes its tests after every merge.

What was proposed: an order rule for the planner. New code goes in beside the old first, the old goes out last, so every merge is also safe to run live on its own.

With piece C a group goes live as one. Then the order rule is not needed inside a group. It stays useful only for projects whose CI does not ask the factory before it deploys. I drop it unless piece C is rejected.

### 1.9 Point 10: only the factory needs it

The lane collapse needed two repositories, in one order:

1. The infra change first: process files with `tracks:` instead of `lanes:`. The old factoryd refused them and kept its old version, so nothing broke.
2. The code roll second. The new factoryd refused the old version and loaded the new process files.

In the other order, the new factoryd would have found only process files it refuses. An infra merge goes live within 30 seconds, because factoryd loads the policy from infra main. A code merge goes live through a roll.

No other project has this problem. Registration gives a project one repository, `<name>/<name>`, and the template keeps its deploy manifests in `deploy/` of that same repository. The problem exists only because the factory's own policy and process files live in a second repository that factoryd reads live. A change of that kind is rare: the lane collapse changed the process schema. So I dropped piece F. Such a change stays the controller's work, as the lane collapse's redo was. If projects with several repositories come, the question returns.

## 2. Pieces

### A. Only small changes take the direct track

- The direct track takes size small only. Medium and large go to the plan track, so they get a spec, criteria and an integration card.
- A medium change usually plans as one card that is its own integration card. The planner may still answer with more cards.
- Machine sources keep their direct entries and skip the sizing step: alerts, CI repairs, rolls, reverts, template updates. A card with no agent session (roll, revert, schema copy, template update, GitHub sync) never meets a size trip or a cut. A machine card with an agent session (an alert, a main-red fix) meets the size trip and the cut like any card.

**The sizing step.** Every card a person or the chat files on the direct track is sized before its first session. That covers issues written by hand in Forgejo, new_card and the manual form.

- It is a read-only session in report mode, like the screening of an outsider's issue, on the cheap rung. It reads the issue and searches the code.
- It answers a size, a one-line reason and the files it expects the change to touch.
- A size the filer gave counts as a floor. The larger of the two wins, so the step can only move a card toward planning.
- Small: the card goes on to its first coding session. Medium or large: the card turns into a plan card before any coding session ran. That is the same change of track as the cut (piece B), only earlier.
- The card shows the size and the reason, so a person sees why it went to the planner.
- The filer's size becomes optional in new_card and the manual form.

It catches what the filer did not check. The project agent sized #1287 without reading any code ("That card's not comparable ... I'll file it as a large"). A step that searches the code for the lane names finds 58 Go files: session 2 of #1287 ran that search in one command.

Cost: one small-model call cost about 0.0025 EUR in #1287 (83 calls, 0.204 EUR), so a sizing step of 10 calls costs about 0.03 EUR. A medium or large card then pays one planner session: plan cards averaged 0.95 EUR (14 done since 2026-10-01). The spec's confirmation question goes to a person or, under full auto, to the project agent.

### B. The cut: a card that turns out too big goes back to the planner

These events start a cut:

- The coder asks for one. A new ask kind, `cut`, beside escalate_to_human, request_info and request_tool. The coder names its proposed parts and the reason.
- The branch's diff passes the card's size bound (piece E). This only asks the check-in. It cuts nothing by itself: if the card is on track and most of its work is done, the check-in lets it finish past its bound.
- The check-in decides `replan`, a new decision beside message, redirect and retry_stronger, on any trip.
- A person uses split_card while the card works.

The coder's ask and the size trip go to the check-in first, which decides `replan` or lets the session go on. A person's split skips the check-in.

**A cut throws no work away.** The work on the branch is pushed at the stop and becomes the start of the first new card. That card finishes what the branch holds, makes it build green and lands it. The planner plans only the rest as further cards. The cut changes how the remaining work is packaged, not what was done.

**The merge gate is too late for a cut.** Today a pull request over 1,000 changed lines is class large and waits for a person. The person may approve it whole or split it (ruling 277). A split at that point does not redo the work. A planner cuts the finished diff into 2 or 3 cards, and each card carries over its files and hunks as a smaller pull request. It still costs a planner session and one session per new card. Its one live use failed: uptime2#48 changed 918 lines, and one test file alone held 458 lines. The split's own check refused that, because a new card's files must stay under its size's lines (400 then). The review could have read the file: one part holds 256 KiB, about 2,300 changed lines. The check was too strict, and it goes with the split.

So the cut happens while the card works, at the size trip (piece E), and the merge gate stops offering a split. The gate stays as a backstop that asks a person to approve or send back. With pieces A, B and E in place it fires only when the check-in let a card run past its bound. Its line figure is the policy's `large_lines`, already a setting (0 switches it off). It stays at 1,000 until fanned-out reviews (piece F) have proved themselves.

The cut runs in these steps:

1. The session stops. The worker pushes the work in progress, as it does at every stop.
2. A planner session runs on the card. It reads the card's text, the coder's proposal, the work on the branch and the handover (piece D).
3. If the card is a direct card, the planner drafts a spec, criteria and cards, as for any plan-track card. The card's acceptance lines seed the criteria. The card turns into the plan card of its group.
4. If the card is a plan's child, the planner drafts an amendment of the parent plan. The child's work goes to 2 or 3 new cards under the same plan, with the same criteria. Plans still do not nest.
5. A new spec gets the confirmation question, under the project's autonomy, as for any plan. An amendment that keeps every criterion asks nothing.
6. The children file with their dependencies. The first card starts from the branch's commit and lands what it holds: factoryd creates the new card's branch on the bot's fork at the old branch's head, and the card starts on it as a resumed session does. The sandbox needs no credential for that.
7. The cut card is now the group's plan card and behaves as every plan card does today: it ends done once its children are filed, has no pull request of its own, and its rollup shows the group until `plan_closed`. It records "cut into #a, #b, #c at session N, X EUR spent". Its branch stays until the group closes. The group's members are the children.

One way only: the split of ruling 277 (a large pull request at its approval gate) goes. Its planner check and its filing become the cut's.

The cut is the replan of piece H, started by size.

### C. A feature goes live whole

A plan and its children form a group, named by the plan card. A direct card outside a plan is a group of one, so nothing changes for it.

The rule: merged is not live. While a group is open on main, the factory holds whatever takes main to production. That is a different step in the factory and in a project:

- **The factory's own code** goes to production only through a roll. While a group is open, the roller opens no roll.
- **A project** deploys through its own CI (Ruling 146). The template ts-go rolls staging on every main run. Its `promote` job waits 15 minutes, asks the factory's alerts endpoint, and rolls prod when the factory answers no alert. The hold gets its own endpoint, not an alert, because the staging step waits on any alert from factoryd and the promote job fails red on any alert: `GET /projects/{name}/release` answers `{"held": true, "reason": "plan #N is open on main"}` or `{"held": false}`. The promote job asks it before its 15-minute wait and skips prod green while held. Staging still gets every merge, so the half-built feature shows there, which is what staging is for. Prod waits.

**Proposed: the group hold.** It runs in these steps:

1. Each child builds, passes its gates and merges into main, as today. main stays green after every merge.
2. From the first child's merge, the group is open on main.
3. While any group is open on main, nothing goes to production. The factory's roller opens no roll. A project's promote job skips prod and ends green. It must end green, because a red main run files a "main is red" repair card today.
4. The integration card starts from main with every child merged. Its criteria gate and review check the whole feature.
5. The plan closes (`plan_closed`): every criterion met or waived. The group closes.
6. If no other group is open, production gets main's head:
   - The factory's roller, at most a minute later, opens one roll for every commit since the last roll. Rolls already fold commits: one roll is open per repository at a time.
   - A project's last main run rolls prod after its 15 minutes on staging. If that run's promote job already skipped, the factory runs it again. It already uses Forgejo's re-run API for stalled runs.
7. The whole feature goes live at once.

A project whose own CI does not ask the factory is not held. That stays its choice under Ruling 146. Projects seeded from an older template get the new promote job through a template-update card, which exists. Until it merges they are not held.

The hold is per project. The infra project has no deploy step to hold: its merges go live within 30 seconds, so a group there is not held and its planner orders its cards. Rolls are pull requests of the code repository, so a code group holds them and nothing in infra.

The hold is worth having beyond #1287:

- Production only ever runs features whose criteria are met. "Live" and "spec met" become one event.
- Today a plan's middle cards go live before the integration card checks them. A new API can go live without its screen, or a button without the backend behind it.
- It covers the common case of feature flags with no flag code to write and remove later.
- One go-live per feature is also a natural point for one approval by a person, in place of one per merge. That is not part of this plan.

**The alternative: a group branch.** Each group gets a branch `group/<id>`. Its children branch from it, and their pull requests target it. When the integration card merges and the criteria pass, one pull request takes the group branch into main, and the normal deploy follows.

The two differ as follows:

| Question | Group hold | Group branch |
|---|---|---|
| What changes in the factory | A group state, the roller rule, one answer on the alerts endpoint, the template's promote job, a timeout ask | A base branch on every card: 39 places in 15 factoryd files read main as the base today. Branch protection and a merge queue per group branch. PR CI already runs for any base |
| Overlapping groups | Hold production until the last one closes, or merge one group at a time | Independent: each group goes live when it is complete |
| Production deploys and hotfixes | Wait while a group is open | Deploy as usual |
| Drift from main | None: the cards merge into main | main moves on: 4 to 102 commits during past plans' lives (#495, #852). Without a sync the group meets them all at the final merge |
| When conflicts show | Early and small, per card, as today | Late and in bulk, unless main is merged into the group branch after every main merge |
| Clashes with work outside the group | Seen at once: the other card builds on the group's merged cards | Seen only at the final merge, and a clash that compiles shows only in the tests |
| Size of the final merge | No final merge | The whole feature: 12,753 lines for #1287. Today the review refuses more than 768 KiB and the merge gate asks a person above 1,000 lines. The final merge needs its own rule: its parts were reviewed, so it gets CI and the criteria gate, no new review |
| Where the criteria are checked | On main, by the integration card | On the group branch. After main is merged in, the criteria gate must run again on the result |
| Abandoning a group | Revert its merged cards | Delete the branch |

I recommend the group hold. It reuses the merge queue, the per-card reviews and the criteria gate as they are. Its cost is the hold on all production deploys of the project. The edge cases below come from that hold.

The reasons, beyond the table:

- **Each card adjusts to main in both shapes.** On main, the merge queue merges main into a card's pull request at its turn and runs the checks again. A conflict goes back to the card's own agent. A card meets only the merges made during its own life, and the agent that wrote the code resolves them. A group branch adds a second level: the group branch must take in main, and its open cards must take in the group branch. Those syncs resolve other cards' code.
- **It is the accepted practice.** Trunk-based development has every change merge into main within a day, through short-lived branches with review. DORA's research ties it to better delivery. The factory's cards already work this way. Unfinished work stays on main but hidden, through feature flags, or new code that nothing calls until the last change wires it in. The group hold hides it by construction: production waits. That needs no judgement from the planner or the review that a card is safe to run alone.
- **Small batches matter more with AI.** DORA 2024 tied a 25 percent rise in AI adoption to a 7.2 percent fall in delivery stability, and named larger changes as the likely cause. DORA 2025 lists working in small batches among the seven capabilities that make AI pay off.

**Edge cases of the group hold:**

- **Overlapping groups chain the hold.** Plan groups so far took 0.7 to 15 hours from the first child's merge to the last (median 3.4). On 2026-10-13 nine plans ran at once in the code repository: their merges spanned 01:28 to 18:56, so the hold would have rolled nothing for 17.5 hours. A setting chooses between two answers (decided 2026-10-29, below the list).
- **A stalled group holds forever.** For example, a child failed and waits for a person. One clock counts how long production has been held, from the first merge that started the hold. At 6 hours (decided 2026-10-29) the factory asks a person. The ask names every open group and what each waits on, and offers: wait, deploy anyway (the half-built feature goes live), replan on top, or take it off main and replan (piece H). Without an answer, production keeps waiting.
- **A fix during a hold.** When a card from an alert or a main-red fix merges while production is held, the ask comes at once, not after 6 hours. An approver may also choose Deploy now at any time from the hold's line on the board. Deploy now sends main as it is, half-built groups included.
- **Direct pushes to main**, such as a controller session's, also wait for the hold.
- **Code that nothing calls yet.** An early card of a group may add code that only a later card wires in. Another card could take it for dead code and remove it. No check does so today: `bash check` runs go vet, gosec and the tests, and none of them flags an unused function. The `deadcode` run is in the controller's own gate only. Three things protect such code:
  - Each plan card names its acceptance tests. A test that calls the new code keeps it in use, and removing the code means removing another card's tests, which the review sees.
  - Each card's brief carries the plan and its directories, so neither the card's agent nor its review mistakes the code for dead.
  - A card works on its own brief, and its review checks the diff against that brief.

  One rule is still needed: a future cleanup routine, or a dead-code check in a gate, skips the files an open group changed.

**Overlapping groups: a setting with two answers.** The process file's `merge` block, which already holds the merge queue (`merge: {queue: project}`), gains `groups`:

- `groups: free`, the default. Cards of every group merge as soon as they are ready. All work finishes as early as possible. Production waits until no group is open on main.
- `groups: one_at_a_time`. The merge queue admits a card of a second group only when no other group is open on main. Each finished feature goes live as early as possible. A waiting group's later cards start only after its first card merges.

Both answers share the group state and the hold. The second one adds one admission rule to the merge queue. Sebastian decided on 2026-10-29: build both, start with `free`.

### D. Working state for the next session

Today the next session gets the commit on the branch and the agent's last message, or the check-in's handover note of at most 2,000 characters. The todo list and the subagents' maps are lost.

Proposed: at every stop, factoryd copies from the session record, with no effort from the agent:

- the session's last todo list
- each subagent's task and the start of its report
- the files the session changed

The next brief shows these under a heading that dates them: "From session N, stopped at 22:59 because <reason>, branch at commit X. Written before your session started. Where they differ from the code on the branch, the code is right." The full subagent reports stay readable through a tool, not in the brief. That keeps the brief small: about 1 KB of todo list and at most 4 KB of report excerpts.

If the check-in stopped the session for a wrong approach, the handover note says what failed, and the todo list is labelled as the dead end's.

The alternative was a notes file that the agent writes on the branch. I recommend against it, for four reasons:

- It costs the agent effort.
- The agent may skip it.
- It sits in the repository and must never reach main.
- It goes stale silently.

A copy taken by code cannot be skipped and carries its own date.

### E. Work against runway

- The brief's fact line also names the card's size and its line bound: "this card is planned at most 600 changed lines".
- A new trip fires when the branch's diff passes the size bound. It asks the check-in: will the rest fit?
- Every check-in statement carries the pace: changed lines so far, EUR and minutes spent, EUR and minutes left.
- The check-in's new decision `replan` starts the cut (piece B).

Changed lines are a rough measure: deleting is cheaper than writing. So the bound starts a check-in question, not a cut.

### F. The review fans out

The factory aims at small cards, but a big change still has to be reviewable. Cutting the work (pieces A and B) and fanning out the review are two answers to two questions, and the factory needs both.

Today the review has three hard limits (reviewdiff.go):

- Forgejo's diff answer is cut at 1 MiB.
- One file's diff over one part (256 KiB) is "not reviewed".
- More than 3 parts is "not reviewed".

A part of 256 KiB is about 66,000 tokens, so the part size comes from the model's context. The cap of 3 parts and the 1 MiB fetch are choices, not physics. "Not reviewed" puts a finding on the card for a person.

The integration card's review reads the whole feature's diff: every child's pull request, then its own (`wholeFeatureDiff`, verdict.go). #1287 as a plan would have reached its integration card with 1,379 KiB, past both the fetch and the 3 parts.

Proposed:

- **Every review fans out.** The parts grow with the diff: no cap of 3. Each part still sees the whole file list and the names the other parts add, as today. The parts run in parallel.
- **The diff is fetched per file**, not as one answer cut at 1 MiB.
- **A file's diff over one part is cut by hunks**, each hunk part named with its file. No size is left that the review cannot read.
- **The integration card's review splits along the plan, not along files.** The plan already maps every criterion to the cards that cite it. One call per criterion gets the criterion, its test results and the diffs of the cards that cite it. One call for the behaviour notes gets the file list and the changed names, and reads any card's diff through a tool.
- **The cost grows in calls**, from the card's budget under the gateway's hold, as every review call does today.

Rework after the review exists and stays as it is:

- A feature card's review with concerns sends its findings back to that card's own agent. The next session fixes them on the same branch.
- On the integration card, an unmet criterion whose fix fits the card's directories goes back to the integration card's own sessions.
- An unmet criterion whose fix is too large for the integration card becomes a delta due. The planner's delta round drafts one small card under the open plan that closes the gap, and files it like any child (`draftDelta`, verdict.go). A merged card is never reopened.
- The review never files cards. It judges, and the planner files.

With the review per criterion, each unmet criterion arrives with the cards that cite it, so the delta round knows where the gap sits. A delta card is a card like any other: piece A sizes it, and pieces B and E cut it if it grows. A cut delta card amends the same plan, so the group stays flat. The group stays open, and production held, until the delta cards merge and the criteria are met.

### G. Rules against a web

- Plans do not nest. That rule exists. A cut of a plan's child amends the same plan.
- A dependency joins two cards of the same group only. Today 3 of 193 dependencies cross groups.
- One planning round files at most 12 cards (`max_cards: 12`, which today bounds the whole plan). A plan's total has no cap: further rounds, delta cards and replans add cards (piece I).
- A group open on main past the time limit asks a person (piece C).

### H. Back to the drawing board: replan on top of what exists

Today a person who stops a card has one button: Close. A close deletes the card's branch, even when it holds unmerged work, which is how #1287 lost 22 edited files. A failed plan card can be retried, which files a fresh card from scratch. Nothing replans on top of what was built.

Proposed: one replan path, used by every trigger.

- A person's **Replan** button on any card or plan, with a comment saying why. It replaces split_card.
- The cut (piece B): the coder's ask, the size trip, the check-in's `replan`.
- The held-production ask (piece C).

The replan runs in these steps:

1. **Stop.** Every open card in scope stops. The worker pushes its work in progress, as at every stop. No branch is deleted while a replan may still need it.
2. **Take it off main, if chosen.** The person chooses this, or the planner's answer drops merged cards. Before anything is reverted, factoryd writes a salvage branch, `salvage/<plan>`: main with the group's changes on top, so one diff shows everything the run built. Then one revert card takes the group's merged cards out of main, newest first. Once it merges, the group is no longer open on main and production goes ahead.
3. **Plan again with the whole record.** A planner session gets:
   - the spec, the criteria and the current plan revision
   - per old card: its state (merged, open, failed, never started), its diff (merged pull request, work branch or salvage), its review findings, its criteria verdicts, the check-in's notes, the working-state copy (piece D) and its spend
   - the person's comment
   - the salvage branch in its clone, and tools to read any of it in depth
4. **Answer a new plan revision.** For each old card it says one of:
   - **keep**: merged and right. If it was taken off main, a card lands it again from salvage.
   - **change**: a new card that starts from the old card's work, carrying its branch or its salvage hunks, with the findings in its brief.
   - **drop**: closed if open, reverted if merged and still on main.

   It may add new cards. Plans still do not nest, and one round still files at most `max_cards`.
5. **Confirm.** A changed spec or criterion gets the confirmation question under the project's autonomy (decided 2026-10-29). A revision that keeps every criterion asks nothing.
6. **Record.** The plan card and every old card stay on the board: "replanned at revision N: kept 3, changed 2, dropped 1, added 2", with the person's reason.

This builds on the amendment rules that exist: a revision is recorded on the plan, children not yet started get the new brief, started and merged work keeps its branch as findings, and a card that started against an older revision cannot merge.

**Is a revert easy when other cards merged in between?** Usually, not always.

- Today factoryd reverts one commit with a plain `git revert`, no agent (mainfix.go). A conflict makes it fail.
- A group revert undoes each of the group's merge commits, newest first. It is clean when no later card changed the same lines.
- It conflicts when a later card changed the same lines. It breaks the build when a later card uses the group's code, for example a function the group added.
- Then the revert card gets an agent session to resolve it, through the gates like any card. main must be green after it.
- **main stands still during the revert.** The revert pauses the project's merge queue, as a red main already does today (`queue_pauses`, mainfix.go), and the revert card is exempt from the pause, as today's revert card is. Other cards keep working on their branches and wait at the merge. So nothing new can build on the group's code while the revert is resolved, and the revert never chases a moving main.
- **The revert is bounded.** factoryd tries the plain `git revert` first: no agent, only a CI run, minutes. Only a conflict or a red build gets an agent: one small card with at most 2 sessions. If that fails, a person decides, with the queue still paused. No second automatic attempt follows, so it cannot loop.
- **One revert at a time per project.** The pause is one row per project already.
- Direct pushes to main by people bypass the queue. They are rare and their author sees the pause.
- The longer a group stays on main, the more other work builds on it, and the harder the revert. The 6-hour ask keeps that window short.

**Close keeps unmerged work.** A close deletes a branch only when its work is merged. An unmerged branch stays, so a later replan can still use it. A sweep may delete it after 30 days.

### I. Big plans run in rounds

Today `max_cards` (12 in spec.yaml, policy range 2 to 20) caps everything a plan may hold. A feature bigger than that has nowhere to go but back to the roadmap. Delta cards and replans add cards later, so a cap on the whole plan would need exceptions anyway.

The cap protects something real, but a different thing: one planner session drafts the cards, their dependencies and their criteria at once, and a GLM session does that well only for a bounded number. So the cap moves from the plan to the round.

- **A plan is planned in rounds.** The confirmed spec and criteria cover the whole feature. The planner also writes an outline of the whole work. It files the cards of the first round only: at most `max_cards`, foundation first.
- **The next round starts when the round's cards are done.** It is the replan of piece H, run without a person: the planner gets the whole record of what the round built and files the next round's cards. Each round plans with what the last one taught.
- **The integration card comes in the last round.** It checks every criterion on the assembled feature, as today. It counts toward that round's 12 cards. It depends on every other card of its round. The earlier rounds are merged before its round starts, so it needs no edge to them.
- **Validation runs per round and over the whole plan.** Each round passes today's checks on its own cards. Every criterion must be cited by some card of some round, and the integration card cites them all.
- **Later rounds are not cards.** They stay as lines of the outline in the plan card's drawer. The board shows only filed cards, so it never fills with work waiting for a decision. That keeps the lane collapse's rule: the board shows commitments.
- **The board shows where the plan stands**: "round 2: 5 cards, 4 done. Still to plan: the console, the scheduler."
- **No dependency crosses a round.** A round's cards start after the earlier rounds merged, so the web stays flat.
- **A plan goes live whole.** Its group stays open through all its rounds. Sebastian decided on 2026-10-29 to batch go-lives, since rolls are slow: since 2026-10-14, 172 rolls took 5 minutes at the median, 53 minutes at the 90th percentile, and every roll holds new sessions until it merges. So "value of its own" is no go-live question: overlapping groups go live together anyway (`groups: free`).
- **Two plans instead of one** stays possible for a smaller replan and a smaller integration check. The planner may propose it at the confirmation question when the criteria fall into two sets whose cards share nothing but a foundation. It is an option, not a rule.

### Dropped

- **More sessions and agent time for large cards.** It is one policy line. It helps a long card but not a wide one: the review limit of 768 KiB and the merge gate at 1,000 lines stay.
- **The planner's order rule** (point 9), unless piece C is rejected.
- **The agent-written notes file** (piece D).
- **Plans across repositories** (point 10). Only the factory itself needs them (1.9).

## 3. Build order

The whole plan is built (Sebastian, 2026-10-29: "execute it"). Each step leaves a safe state when it lands: close keeps unmerged work from the first step on, and the hold lands only together with its asks and Deploy now.

1. Piece A, the filing rule and the sizing step. It stops the next #1287 at the door.
2. Pieces E and D, the size in the brief, the size trip, the pace and the working-state copy. They are cheap and independent.
3. Pieces H and B, the replan path with its Replan button, the salvage branch and the group revert, and the cut as its size trigger. Close keeps unmerged work. It needs the planner to read branches, and it absorbs ruling 277's split.
4. Piece C, the group hold, for the factory's roller and the template's promote job together, with both `groups` answers.
5. Piece I, plans in rounds. It reuses piece H's replan.
6. Piece F, the review fan-out. It is needed before any plan's whole diff grows past 768 KiB or 1 MiB.

## 4. How we know it works

Count these weekly from the database:

- Cards that reach the merge gate above their size bound. Target: none.
- Sessions per merged card, by size.
- Session ends, by cause.
- EUR per merged line, and the fixed EUR per card.
- Cuts, and how many cut groups closed.
- Hours a group stays open on main, and hours production waited.
- Reviews that answered "not reviewed". Target: none.

## 5. Decisions for Sebastian

1. **Group hold or group branch?** Decided 2026-10-29 by Sebastian: trunk-based, so the group hold.
2. **Overlapping groups.** Decided 2026-10-29 by Sebastian: build both answers as the setting `merge: {groups: free | one_at_a_time}`, start with `free`.
3. **A cut direct card gets a new spec.** Decided 2026-10-29 by Sebastian: its confirmation question follows the project's autonomy, as for any plan.
4. **Issues without a size.** Decided 2026-10-29 by Sebastian: the sizing step (piece A) sizes every card a person or the chat files, sized or not.
5. **The time limit.** Decided 2026-10-29 by Sebastian: 6 hours of held production, one clock. What the ask offers is piece H, under discussion.
6. **What goes live when.** Decided 2026-10-29 by Sebastian: a plan goes live whole, through all its rounds, and overlapping groups go live together, to batch the slow rolls.
7. **The budget of a sized card.** Decided 2026-10-30 by Sebastian: a small card gets 4 EUR, and the sizing sets the budget of a card that still holds its filing's budget. Before the decision the size set the budget: small 2, medium 5, large 10 EUR (ruling 266). Unsized cards get `task_default_eur`, 5 EUR today, and 442 of 478 direct cards since 2026-10-01 were unsized. Once every card is sized, a small card gets 2 EUR. Of 99 finished direct cards under 300 lines, 19 spent more than 2 EUR, 11 more than 3, 5 more than 4 and 2 more than 5.
