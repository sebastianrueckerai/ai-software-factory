# Spec-driven intake: a concept

Written 2026-10-16. This file turns the design discussion of that day into a concept: the needs, the challenge, what other tools do, the current state, and the pieces that close the loop. Status: concept. Nothing here is built or a roadmap item.

## 1. Needs

The factory builds from issues. Five needs drive this concept:

1. Intake must produce an agreed outcome. A roadmap item says what and why ([roadmap.md](roadmap.md), "How to read an item"). Nothing today turns it into a stated outcome with acceptance criteria before work starts. The market research names the gap: "Spec-driven intake does not exist yet: tasks come from issues, not from specifications with acceptance criteria" ([00-our-vision.md:54](market-research/00-our-vision.md#L54)).
2. The cheapest human moment is the spec. A wrong outcome caught as spec text costs a rewritten page. The same error caught at review costs a discarded branch. Escalation stays scarce, and its best value per minute is at the spec.
3. Green cards must mean a met spec. A plan splits into cards. Every card passing must imply the spec is reached, or the gap must surface as visible work, never as a discovery in production.
4. No spec tax. Bug fixes, dependency bumps, renames and config changes pay nothing. The change itself is the spec: a bug fix's spec is the report plus the reproduction gate, a bump's spec is the check suite. Ceremony before work scales with the change. The verification floor after work never scales down ([layers.md](layers.md), the stage floor).
5. Construction over prompts. Every guarantee comes from process shape, checks and gates. Prompts draft, they never enforce. This is the project's own design rule: reliability comes from how a step is built, not from its prompt.

## 2. The challenge

- A spec that no gate reads is abandoned the first time it conflicts with the code. Every piece of this concept must be read by a check, a gate or a tool, or it is cut.
- Criteria and cards cross. One criterion can need work in several components, one card can serve several criteria. A one-to-one mapping of criterion to card leaves the seams between cards unowned. The relation is many-to-many, so coverage needs traceability, not shape.
- A claim of coverage must be checkable by machine. If the binding from criterion to test is prose, only a model can judge it, and the guarantee is only as strong as that model. The binding must be data.
- The cost rule forbids a per-card whole-repo pass: after every card only what is local, deterministic and reads the diff ([layers.md](layers.md), section 2). The whole-spec check must therefore ride one card at the end, not every card on the way.
- Policy stays outside the model. Routing and completeness are checks and configuration, never prompt rules.
- The floor holds everywhere: checks, policy, approval and merge on every path, screening first, merge last. A project may only tighten ([layers.md](layers.md)).
- Existing machinery should carry the weight. The planning session, the plan schema, ValidatePlan, the question machinery, CreateChildren, task dependencies and the review stage already exist. The concept adds rules to them, not a parallel system.

## 3. What the competition does

Six spec-driven tools are catalogued in the market research. The question put to each: how does it make sure the whole spec is met when the work is split into tasks? Where a whole-spec check exists at all, it is a closing pass: a model re-reads the spec against the aggregate diff (Spec Kit, BMAD, Superpowers), the agent re-runs tests it linked itself (Tessl), or nothing enforces it (OpenSpec, Kiro past its tags and optional tier).

| Tool | Whole-spec check | Who judges | What we take |
|---|---|---|---|
| Kiro | Requirement tags on tasks, checkpoint tasks, optional property tests from criteria | The model. Tests only in the optional tier | The EARS phrasing for criteria, the requirement tag, the property idea |
| Spec Kit | `converge` diffs code against spec and appends the gap as new tasks | The same agent grades itself | Delta findings become new cards, not a re-plan |
| BMAD | `bmad-retrospective` re-runs review lenses over the whole epic's diff | Model review lenses | A named closing check, separate from per-change review |
| Tessl | Each requirement carries an inline `[@test]` link, the closing pass re-runs all linked tests | The agent reports the runs. A script checks only that the links resolve | The machine-checkable link from criterion to test |
| Superpowers | Task reviewer plus whole-branch reviewer | Model reviewers, human at the end | The whole-branch shape of the closing review |
| OpenSpec | An optional `/opsx:verify` agent read, nothing enforced, drift admitted | Humans at propose and archive | The cautionary example |

No tool verifies the whole spec deterministically. Tessl comes nearest, and its script checks only that every criterion's test link resolves on disk. Resolution is not coverage, nothing runs the linked tests against the assembled whole and requires green, and in the other five the binding from criterion to test is prose. The factory's house format already binds them: an acceptance item is a test by name with its inputs and expected numbers ([architecture.md](architecture.md), the planner). Make the criterion carry its test name as data and a gate can resolve it, run it and require it green, with no model in the loop. What stays model-judged, here as everywhere, is fidelity: whether the named test actually tests the criterion. The split is the design: binding and passing deterministic, fidelity reviewed.

## 4. Current state

Two processes ship: `maintenance`, the fix-and-improve flow, and `spec`, which builds an application from a written spec ([target-architecture.md](target-architecture.md), section 6). On `spec` today:

- A card in the plan lane starts a planner, a report session on the stronger rung. It reads the repository and the spec, writes nothing, and answers one JSON plan of 2 to 12 cards, twelve the shipped bound: key, role (`foundation`, `feature`, `integration`), brief, guidance directories, dependencies, acceptance items, size. Each acceptance item is a test by name with its inputs and expected numbers ([architecture.md](architecture.md), the planner and the plan card).
- ValidatePlan refuses a plan that breaks the shape. factoryd, not the model, adds the edges that put the foundation first and the integration last.
- Plan questions go to writers, with choices. A writer's comment sends the planner round again. A stale-revision check exists. "Plans do not nest".
- An approver's "Accept plan" runs CreateChildren: one issue and one task row per card, in topological order, with dependencies. A child's brief carries the spec, the plan's summary and the featureGuide, which asks for a test per acceptance item. A card that waited on others starts from main with their merged work.
- The human's spec today is the card body. Whoever files the card writes the spec text themselves, or the item is not a spec at all.

Ruling 225 ([the lane-collapse plan](plans/2026-10-14-lane-collapse.md), decided 2026-10-14) reshapes this machinery: the lanes block goes, a track field on the task (plan or direct) is set by the filer, the plan bounds move to the track's config, the accept and Start-plan clicks go, a plan-track card files its children when no question is open, and children are ordinary direct-track cards. This concept is written against that settled shape.

What is missing, against the needs:

1. Nothing at intake writes the spec. The gap named in section 1.
2. The criteria are prose attached to a revision. No list of criteria exists as data, so nothing can check coverage.
3. No completeness check. ValidatePlan checks shape, not whether every criterion has a card.
4. The integration card's acceptance items are whatever the planner chose. Nothing requires them to be the spec's own criteria run against the assembled whole.
5. Nothing deterministic binds a criterion to a test that exists and passes. A card can close green with a named test never written.
6. The review reads the brief, the diff and the gate results. No verdict dimension asks whether the spec is met.
7. No hold-out. The planner sees every criterion it will be graded on.
8. The planner must answer at least two cards. A medium technical item cannot take the spec path as one card.
9. Architecture section 10 already reserves the landing zone for hold-out scenarios, "kept outside that step's read access", and defers them.

## 5. The concept

Ten pieces. Each names its layer first, the test every new idea must pass ([layers.md](layers.md), section 1).

| Piece | Layer | What changes |
|---|---|---|
| 1. Criteria block | Factory, plan schema | The plan carries the criteria as data: id, kind, test name, inputs, expected numbers |
| 2. Ids on acceptance items | Factory, plan schema | Every acceptance item cites the criterion it serves |
| 3. Completeness and coverage | Factory, ValidatePlan | Every criterion cited by a card. Every non-foundation card serves |
| 4. The criteria gate | Factory, a gate activity | On the integration card: every criterion's test exists and passes at head |
| 5. Spec drafting | Factory session mode, prompts for content | The planning session drafts the spec from the card body before planning |
| 6. Hold-outs | Factory, the question machinery | Criteria added at confirmation, unseen by the planner |
| 7. Spec verdict in review | Factory guides and schema | Per criterion: met, partial or unmet, as data |
| 8. Plan close | Factory | The plan closes with every criterion met or waived by an approver |
| 9. One-card plans | Factory, track config | The plan minimum is one card, its own integration |
| 10. Staleness | Factory | Criterion ids immutable. A card started at revision N cannot merge past the record |

The pieces in order:

1. **Criteria block.** The plan JSON gains a criteria array. Each criterion has an id, a kind (`test` or `invariant`), and for kind `test` a test name with its inputs and expected numbers, the house format. An invariant criterion names a suite and carries no inputs: "every existing test in `./...` passes". A criterion that states a quantity or a bound is written as a property-style test with generated inputs, ordinary repository code the checks run. One runnability rule governs all of it: a criterion's test must run under the project's own `check` in the sandbox, so criteria are written against in-process fakes and the store's test harness. No browser, no external database, no device: those criteria wait for the before-and-after screenshots stage kind, the process-layer primitive [layers.md](layers.md) names as a candidate. This rule exists today for cards, "no card asks for a check `bash check` does not run". The criteria inherit it.
2. **Ids on acceptance items.** Every acceptance item in every card cites the criterion it serves, many-to-many. A card's served set is the union of its items' citations, so there is no separate `serves` list to keep honest. This is Kiro's tag and Tessl's link in one, made data. The `foundation` role is exempt from the requirement to serve: its contracts need no criterion, though it may cite one.
3. **Completeness and coverage.** ValidatePlan gains three rules. Completeness: every criterion is cited by at least one card. No orphans: every non-foundation card cites at least one criterion. Coverage: the last integration card cites every criterion, and its own acceptance items are the criteria's tests, verbatim by id, run against the assembled whole. Hold-outs, appended at filing, cite the integration card, so completeness holds for them by construction. A plan that forgets a criterion fails at the cheapest moment, before any work starts. A claim in the plan that a card serves a criterion it does not touch is not caught here. The integration card's criteria are the backstop, and a mismatch surfaces there as a review finding.
4. **The criteria gate.** On the integration card only, a deterministic gate activity in the slot the reproduction gate fills for bug cards: every criterion of kind `test` resolves to a test that exists in the repository and passes at head under `check`. Every invariant criterion's suite is green. It reads the repository and runs tests, it never calls a model, and it runs once, on one card, at the end: the cost rule holds. A criterion whose test does not exist, or fails, is a finding like any gate finding. Silence never passes: the house rule that a stage which ran and gave no verdict lands on the human's card covers this gate too.
5. **Spec drafting.** In the plan-track card's planning session, the planner drafts the spec before the plan: the outcome in a few sentences, a glossary that names each component once, then the criteria in the house format. The planner's guide carries a fixed self-attack section, Kiro's Analyze Requirements made one round in the same session: attack the own criteria for contradictions, ambiguity and missing edge cases, and turn the findings into the card's questions. The confirmation question carries the spec: writers answer it in Needs you, amend it, or send it round with a comment. Criteria are pinned at the answered revision, not at the draft, so a question answered after drafting cannot leave stale numbers behind. Kiro's separate second pass over the requirement set stays a later option. Measure the guide version first. Templates ship a spec skeleton with standing criteria, the invariants every project already wants, and the planner drafts into it.
6. **Hold-outs.** The confirmation form has two zones. The answer zone goes to the planner and re-runs it, the existing machinery. The hold-out zone holds criteria the planner never saw, in the house format, enforced at the form: name, inputs, expected numbers. A routing rule in the form keeps the hold-out zone out of the planner's brief, so the blind property survives the re-run. factoryd reads the zone and appends its criteria to the integration card's acceptance items at filing time. The candidates list shows the project's past revert reasons and failed integration findings, one click each. Honesty about the name: this is a planner-blind hold-out. Architecture section 10's hold-out is blind to the executing step too, and that stronger form waits on the anti-cheat rule (roadmap 64), because today the integration card's agent writes the test from the given numbers, and the fidelity of that test to the criterion is judged by the review, not by a gate.
7. **Spec verdict in review.** The integration card's brief already carries the spec today. The new wire is the pinned criteria with ids, so the review answers per criterion against data, not prose. Its review stage, already reading the brief and the whole feature's diff, answers per criterion: met, partial or unmet, with the test name and numbers as evidence, plus one note per behaviour the code shows that the spec does not state. The verdict is data on the task, so analytics can say which criteria fail at integration and whether hold-outs catch real gaps. Unmet findings loop back to the card's sessions as today. The too-large line: a fix that changes files outside the card's directories, or reopens a merged card's acceptance items, goes to the human door as follow-up work, and the fix's attribution stays with the integration card, which the diff and the audit trail show. Discovered-behaviour notes land as comments on the issue. A note becomes work only when a human files it.
8. **Plan close.** The plan artifact closes with every criterion met or waived. A waiver is an approver's recorded decision naming the criterion and the reason. When the integration card exhausts its sessions with a criterion unmet, the plan shows it, and the same two doors apply: an approver grants one bounded extra session, or waives. Green cards with a silent gap underneath cannot happen: the gap is a criterion row, visible and owned. Outside this concept: a factoryd action that files an unmet finding as a new card under the plan, Spec Kit's converge. Until then the human files it by hand.
9. **One-card plans.** The plan minimum drops from two cards to one. A medium technical item, a storage migration say, then takes the spec path without fragmentation: its invariants become the criteria, one card cites all of them, and that card is its own integration. Completeness and coverage hold: the card cites every criterion, and coverage's integration citation is the card itself.
10. **Staleness.** Criterion ids are immutable after pinning. An amendment adds a criterion, modifies one under a new id, or removes one, and a removal fails completeness until the serving card goes too. A card that starts against revision N cannot merge while the spec of record is past N: the existing stale-revision check, extended from the plan round to the merge path. Under ruling 225 a child whose work shows the plan wrong raises a question like any card, and the plan is a document, not a contract. The answer re-runs the planner. This concept adds the re-acceptance rules: the new revision re-runs the checks, replaces the briefs of children not yet started, leaves started ones their branch as findings, and never reopens a merged one.

What does not change: the stage floor on every path, the label routing and the intake rule fixed in code, the cost rule (the only new model reads are the same review, once, with a bigger diff), the merge authority, the planner's 30 minutes with no check-in (drafting and the self-attack round ride inside it, and the bound moves only on measured misses), the reproduction gate as the bug fix's spec.

Cost: the planner drafts inside its existing session, one comment round deeper than today. The criteria gate is deterministic and runs once. The integration card's review reads a larger diff than a feature card's. Hold-outs add tests to one card. No new per-card model spend anywhere.

Rollout, each step shippable alone, in ruling 225's track world:

1. Criteria block, item ids, completeness and coverage. Works with a human-written criteria list in the card body until drafting lands.
2. One-card minimum.
3. The criteria gate.
4. Spec drafting, the confirmation question, the spec skeleton in templates.
5. Hold-outs.
6. The spec verdict as data and the plan-close rule.
7. The staleness extension.

Later, not v1: delta cards (converge), the discovered-requirements ledger (unclaimed behaviours collected on the plan feed the next item's drafting), checkpoint cards mid-plan for large plans, file-glob targets on criteria, Kiro's separate Analyze pass, the executor-blind hold-out behind roadmap 64, full property-test machinery with shrinking. Wild, recorded for honesty: factoryd mutates criteria inputs to synthesise hold-out candidates for the approver to pick. And shadow drafts, where the planner drafts even when a human wrote the spec and the disagreement diff grades both.

### The three guiding ideas

The roadmap's three ideas govern every item ([roadmap.md](roadmap.md), the guiding ideas). This concept against each:

- **Primitives, not a process.** The concept adds no stage and no dependency or merge key. Its pieces are plan-schema data, factory checks and gate activities, shared by every process that uses the plan machinery. The one knob a project sees is a track-config value, `min_cards`, a plan bound. The completeness check stands in the same class as `factoryd config check` refusing a cycle: the machine refuses a composition that cannot work, here a plan that misses a criterion.
- **Fewer manual steps than the competition, with enough security.** Ruling 225 removes the accept and Start clicks. This concept adds one human moment, the confirmation question, and that question replaces the heavier work it names: the filer writes the spec by hand today. The floor stays untouched, every path keeps checks, policy, approval and merge, and the criteria gate is a gate, not a trust decision.
- **Limited scope, full context, simple prompts.** The planner drafts inside its session with the repository in reach. The integration card gets the pinned spec in its brief, the full context for its goal. The criteria gate is deterministic and calls no model. The self-attack round is self-correction over prevention. The only prompt content is drafting guidance, and every enforcement lives in a schema, a check or a gate. A step that arrives too large, a hold-out fix outside the card's directories, is routed out by rule, not by asking the agent to be careful.

Each rollout step above lands as its own roadmap item and primitive, composable per the first idea.

## 6. The process file gains one value

The process is configuration, four blocks, fixed keys ([target-architecture.md](target-architecture.md), Processes as configuration). This concept adds no stage, no dependency key and no merge key. Its one process-file change is a plan bound: ruling 225 moves the plan bounds into the track's config in the process file, and piece 9 sets `min_cards: 1` beside `max_cards` there. Every other piece lives in the plan schema, ValidatePlan, the question machinery, the gate activities and the review guide, which are the factory's. The shipped file, the authority on shape:

```yaml
# factory/processes/spec.yaml, as shipped
lanes:
  - {name: backlog}
  - name: plan
    class: planner
    moved_by: writers
    plan: {max_cards: 12, foundation: true, integration: true}
  - {name: ready, class: coder, moved_by: writers}
dependencies: {wait_until: done, on_failed: human}
stages:
  - {name: screening, on_findings: human, enabled: true, when: outsider}
  - {name: policy, on_findings: fail, enabled: true}
  - {name: migration, on_findings: human, enabled: true}
  - {name: reproduction, on_findings: agent, enabled: true}
  - {name: checks, on_findings: agent, enabled: true}
  - {name: review, on_findings: agent, enabled: true}
  - {name: audit, on_findings: human, enabled: true}
  - {name: approval, on_findings: human, enabled: true}
  - {name: merge, on_findings: human, enabled: true}
merge: {queue: project}
```

Under ruling 225 the lanes block goes and the plan bounds move to the track's config. The floor below the stages never moves: checks, policy, approval, merge always present, screening first, merge last.

## 7. A feature through the process, step by step

A made-up project, not part of the factory: **greenhouse**, a watering scheduler for a school greenhouse, from the `ts-go` template. The roadmap item: "Water the greenhouse from a schedule. Teachers edit schedules on a web page. A wet soil sensor pauses watering."

1. A member promotes the item as a plan-track card, body as above. Item 205's promotion rule applies: the item is promotable without asking, its Priority filled and a concept doc backing it.
2. The planning session starts. It reads the template and the card body, drafts the spec, attacks it once as the guide requires, and answers the card's questions plus its own: zones, two or four?
3. The confirmation question surfaces in Needs you with the spec attached. The outcome: the greenhouse waters each zone from its schedules, teachers manage schedules on a web page, a wet sensor pauses that zone. The criteria, each runnable in-process under `check`:
   - `schedule_test`, criterion 1, kind test: three schedules across two zones, one day, expected four watering events. The rule engine runs as a pure function.
   - `edit_test`, criterion 2, kind test: rename a schedule through the page's model, expected the list shows the new name.
   - `sensor_pause_test`, criterion 3, kind test: a reading posted wet through the API in-process, expected zero watering events in that zone while wet.
   - `api_test`, criterion 4, kind test: GET /schedules on a seeded in-memory store, expected three entries.
4. The member answers on one form with two zones. The answer zone says two zones, amends one wording, and re-runs the planner. The hold-out zone adds `overlap_test`: two overlapping schedules in one zone, expected one watering event, the second delayed, never doubled. The hold-out zone never enters the planner's brief. Criteria are pinned at this answered revision.
5. The re-run planner, its brief carrying the answer and not the hold-out, files the plan: five cards. F1 foundation, the store, the schema and the HTTP API, naming the contracts, its items citing criterion 4, with the exemption meaning its other contracts need no criterion. F2 the rule engine, items citing criteria 1 and 3. F3 the web page's model and screens, citing criterion 2. F4 the sensor input, citing criterion 3. I1 integration, citing all four criteria. ValidatePlan checks shape, completeness (1, 2, 3, 4 each cited), no orphans, coverage (I1 cites every criterion). factoryd adds the edges, F1 first, I1 last.
6. No question is open, so the planning card files its children as direct-track cards with their dependencies and closes done, per ruling 225. The hold-out is appended to I1's acceptance items at filing, after the planner's session ended.
7. F1 runs first: sessions, screening n/a (a member filed it), policy, migration to a human, for it creates the store's schema, checks, review, audit, approval, merge. F2, F3 and F4 run as slots free, each starting from main with F1 merged, migration n/a for them. The planner's guide keeps cards that share directories dependent, so the three do not collide on one router file.
8. I1 starts last, from main with everything merged. Its agent writes the five cited tests as end-to-end tests against the running app in-process. `overlap_test` fails: the rule engine doubles the overlapping window. The finding loops back to I1's next session, which fixes the merge logic in the same branch. The fix touches F2's merged code, inside the directories I1's plan slice names, so it stays I1's finding, attributed to I1's task, and F2's card stays closed with its own green history. Had the fix reached outside, it would have gone to the human door as follow-up work.
9. The criteria gate runs on I1's head: all five tests exist, all pass under `check`. Deterministic, no model.
10. I1's review reads the brief with the pinned spec and the whole feature's diff. Verdict: criteria 1 to 4 and the hold-out met, each with its test name and numbers. One discovered-behaviour note: the page polls every 10 seconds, the spec said nothing, the note lands as a comment on the issue. The approver approves, the bot merges.
11. The plan artifact closes: every criterion met, nothing waived. Spec reached.

## 8. A one-card technical change

The demo project, the link shortener: "count clicks in Postgres, not in memory." The criteria are invariants and one test: an invariant criterion, every existing test in `./...` passes unchanged, and `persist_test`, kind test: seed 412 clicks, restart the store through its harness, read the counter, expect 412. One card cites both, is its own integration, and the completeness and coverage rules pass trivially. The schema change still routes through the migration stage to a human, as the shipped process runs it. The card merges with the migration approved, and the spec was two lines of invariants the planner drafted in the same session.

## 9. Open questions

- The executor-blind hold-out, section 10's full form: it needs the anti-cheat rule (roadmap 64) so a gate can judge the graded party's own test. Until then the planner-blind form carries the value.
- Delta cards versus the hand-filed card: how often does an unmet finding at the integration card arrive too large for one more session? The plan-close waiver record will say, once piece 8 ships.
- Kiro's separate Analyze Requirements pass versus the guide's self-attack round: measure the guide version's catch rate first, then decide whether a second session pays.
- Whether a criterion may ever bind to a test that needs infrastructure, once the UI-capture stage kind or a tool door exists, and what the criteria format gains then.

## Sources

The design discussion of 2026-10-16. [architecture.md](architecture.md) sections 5.1, 5.6, 5.7 and 10. [target-architecture.md](target-architecture.md) sections 6 and 8. [layers.md](layers.md). [roadmap.md](roadmap.md). [The lane-collapse plan](plans/2026-10-14-lane-collapse.md). The shipped process file `factory/processes/spec.yaml` and the stage vocabulary in `internal/policy/process.go`, both in the sibling code repositories. The market research: [kiro](market-research/projects/kiro/report.md), [spec-kit](market-research/projects/spec-kit/report.md), [bmad-method](market-research/projects/bmad-method/report.md), [tessl](market-research/projects/tessl/report.md), [superpowers](market-research/projects/superpowers/report.md), [openspec](market-research/projects/openspec/report.md). Reviewed after drafting by an adversarial pass, a curious pass, a brainstorming pass and a claim-by-claim verification pass. The adversarial pass caught a false headline claim, a misquoted process file and a stage list that broke the floor, all fixed above.
