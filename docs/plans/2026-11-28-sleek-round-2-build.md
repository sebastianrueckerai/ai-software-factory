# Sleek round 2: the build plan

**Status:** draft. It grows as the rounds of [the work list](2026-11-28-skills-and-context-per-agent.md) finish, and nothing is built before it is complete and Sebastian has gone through it.

**Goal:** Every agent's standing context holds its factory knowledge, which may be none, and its job's instructions. Action-specific text sits behind per-agent skills through a `guide` tool. Human-facing writing rules enter only in a turn a human reads. Narration is caveman. Every typed answer climbs one ladder instead of failing. The map tells fixed text from example input and shows whole contexts from real cards. Every tool and skill is confirmed usable on `small`.

**Sources:** the work list's items 2.1 to 2.13, the sweep, the per-agent proposal, the two experiments and the battery's records under the gitignored ledger.

## Order

1. The typed answer ladder (work list 2.12, Part A). First, since every direct step on `small` depends on it.
2. Jev for the label steps (2.15), each use case tested first, with the ladder as the net.
3. The battery's session fixes (2.12, Parts B and C), once the report is in.
4. The session tools' descriptions (2.16), decided.
5. The guide tool and the per-agent skills (2.8, 2.1), with the trigger lines in the tool's description.
6. The coding guide and the caveman narration (2.2, 2.3), the test-writing rules standing.
7. Human-facing text only in a human-facing turn (2.4).
8. The paragraphs per agent (section 1 of the work list), each a pinned text Sebastian reads before it ships.
9. The model line (2.5).
10. The map: fixed against example, whole-request files from real cards (2.6, 2.7).
11. The four faults (2.9) where not fixed before, and the harness skills stay denied (2.10).
12. The whole prompts on realistic examples (2.13), with the battery as the harness.

## Tasks

### Task 1: The typed answer ladder

Sebastian's rule (2026-11-28): the decode checks the schema so a fault shows at once, then every typed answer takes the same ladder: retry with the old result and the error, retry on the bigger model, escalate to the biggest model, and when no quick fix exists, escalate to a human.

**Files:** `internal/factoryd/answer.go` (`answerWith`), `internal/prompts/answer.go` (the limits the `max`, `item` and `enum` tags register), the callers that handle `badAnswerError` (`brief.go`, `brief_case.go`, `gatesupervisor.go`, `namer.go`), the review's round accounting, the human card filing (`CreateHumanCard`).

- **The check.** After the strict JSON decode, every `max`, `item` and `enum` tag and every required field is checked, and an empty string or list where the schema requires one is a fault. One refusal line per fault: `<field>: <n> characters, at most <cap>`, `<field>: <n> items, at most <cap>`, `<field>: <value> is not one of <enum>`, `<field>: empty`, `unknown field "<key>"`, `answered in text, not through the answer tool`, `cut at the output limit`.
- **Rung 0, a repair without a call, only where no judgement is involved.** A string or list at most 10 per cent over its cap passes unchanged. An unknown key within one letter of exactly one missing required key is renamed. A prose answer that holds the tool's JSON, fenced or bare, is taken as the answer.
- **Rung 1, the same model again.** The conversation continues: the model's own answer stays as its assistant message and the refusal lines follow as the next message, so the model corrects instead of thinking again. A reply cut at the output limit retries with thinking off.
- **Rung 2, the class's bigger model**, with the same two messages.
- **Rung 3, the biggest model**, `premium`, with the same two messages.
- **Rung 4, a human**, when no quick fix exists: a human card with the step, the input's card and the last refusal, and the step waits for the answer. The quick fix exists for one fault only, a text over its cap, which is cut at the cap at a word boundary after rung 3, so a plan always gets a name.
- Each rung is one timeline step with its refusal, and the model review counts a shape failure as no round.
- Tests, hand-derived. 98 of 87 is over the 10 per cent slack (95.7), so it goes to rung 1. 93 of 87 passes. A retry that fits ends the ladder. Rungs 1 and 2 missing reach `premium`. Three misses on `left` cut it to 87 characters at a word boundary. Three misses on `verdict` file a human card whose text names the step and the last refusal. `reasones` is renamed to `reasons` without a call, and `reasns` with two candidates goes to rung 1 with `unknown field "reasns"`. A prose answer goes to rung 1 with `answered in text, not through the answer tool`. `finish_reason: length` with no tool call goes to rung 1 with thinking off. An empty `reasons` list on a suspect verdict is `reasons: empty`.

### Task 2: Jev for the label steps

Sebastian's decision (2026-11-28): use Jev, TypeSafe AI's model, where it makes sense, and test each use case first. It answers Boolean, Choice and Score questions with a calibrated probability, fast and almost free, and returns no text and no tool call. The key `TYPESAFE_AI_KEY` exists with 30 EUR of credits.

**Where it makes sense, measured** (2026-11-28, 207 Jev calls for 0.05 USD, records under the gitignored ledger). Jev's label against the production model's on the captured inputs and on real issues, five repeats in the given option order and two reversed:

| step | agreement | p on agreements | flips over repeats | verdict |
|---|---|---|---|---|
| sizing | 21 of 21 | 0.54 to 0.97 | 0 | Jev for the label if nobody reads `reason` and `files`, else a model that fills the text too |
| judgement | 14 of 14 | 0.62 to 0.99 | 0 | Jev for the label if nobody reads `reason`, else a model that fills the text too |
| answer-screener | 7 of 7 | 0.97 | 0 | Jev for the label if nobody reads `reasons`, else a model that fills the text too |
| gate-supervisor | 7 of 7 | 0.72 to 0.92 | 0 | Jev for the label if nobody reads `diagnosis` and `recommendation`, else a model that fills the text too |
| screening | 22 of 35 | 0.50 to 1.00 | 1 | stays a session: both real suspect verdicts rested on reading the repository, which Jev cannot |
| model-review | 8 of 13 | 0.50 to 0.95 | 1 | does not fit: on a real pull request it sat at 0.50 to 0.54 |
| follow-liveness | 7 of 7 | 0.89 | 0 | stays on `small`: it exists to prove that route answers |

Sebastian's rule (2026-11-28): no second model writes a sentence after the fact. A step whose text field nobody reads drops the field and takes Jev for the label. A step whose text someone reads takes a typed model that fills the label and the text in one answer, Needle by Cactus is under evaluation for that, or stays on the chat model with the answer ladder. Who reads each field is being traced in the code.

Facts the build relies on. The question is built from the step's role text and the input, not from the whole system text, which lowered the probabilities and flipped 2 of 5 judgement calls. Identical calls return probabilities up to 0.14 apart, and reversing the options lowered the gate supervisor from 0.87 to 0.72, so the options keep one fixed order and the bound has slack. The medium card scored 0.54 against 0.40 for small, so the sizing bound is 0.9 for a `small` size and 0.7 otherwise. Latency 0.2 s under 4,000 tokens, 0.5 s at 32,000. Limits: 32k tokens per question by default, 64k per request, 0.042 USD per million input tokens, output free. The endpoint is `POST /v1/systemone` with `noul` for yes or no and `choice` for 1 to 255 options, returning a probability or a choice with confidence.

**How Jev enters.** It is no chat model, so it does not go through LiteLLM's map. The gateway gets one client for it, `internal/gateway/label.go`, with `Label(ctx, question, choices, input) (choice string, p float64, err error)`, the key seeded as a cluster secret like the other provider keys (`seed-secrets`, the infra `README` list), and the policy names it by one alias, `label`, in the purposes of the steps that use it. The probability is kept on the timeline step. A probability below the step's bound in the policy, 0.7 by default and 0.9 for sizing's `small`, sends the call to the class's chat model instead, so a doubtful label never stands alone. This is the one exception to "only LiteLLM names a model", written into the architecture document with its reason.

**The tests, before any step moves.** The use-case test under the gitignored ledger replays each step's captured inputs and real issues through Jev: agreement with the production model's label, probability on agreements and disagreements, stability over repeats, latency, the largest input accepted. A step moves only when its agreement with `big` is at least as high as `small`'s and its disagreements carry low probabilities. The battery's Part A then runs on the moved steps.

- Tests, hand-derived: a judgement `unmet` at p 0.91 stands. A label at p 0.55 runs on the chat model instead and the timeline step says `label p 0.55 below 0.70`. Follow-liveness `ok false` at p 0.98 ends the follow with `not live`. The alias list gains `label`. The policy refuses `label` for a purpose whose answer type keeps a text field someone reads.

The four steps move one at a time, each after the battery's Part A ran on it with Jev in place. DeepSeek V4.1 Flash on Model Studio stays the option in the work list for the schema-shaped steps the ladder alone does not settle.

### Task 3: The session tools the small model does not reach

The battery's finding: on `small` a coding session guesses instead of asking (`request_info` 0 of 3), does everything itself instead of delegating (`delegate` 0 of 3), ignores the issue's image (`analyze_image` 0 of 3), reads with grep instead of `digest`, and takes versions from the module proxy instead of `web_search`. The last two are the right calls. The first three need construction, not a prompt rule.

- **Images are described before the session.** When an issue or a message carries an image, factoryd calls the vision alias and puts the description into the brief, as the `telemetry` facts already are. The session's `analyze_image` stays for a screenshot the agent takes itself. Files: the brief renderer in `internal/factoryd` (grep `codingFacts`, `telemetry`), a test with an issue that holds one image and the brief that carries its description.
- **A thin issue is asked about before the session.** The sizer's answer gains `needs_info` with the question, and factoryd asks the author through the existing request flow, so no session starts on an issue it cannot reproduce. The session's `request_info` stays for what the agent finds later. Files: `answers.go` (the sizing answer), the sizing door, the intake flow that today handles `request_info` from a session.
- **Planned follow-up work is filed by the plan, not by the session.** A card's brief that names work as out of scope comes from the planner's cards, and the planner files the follow-up card itself. The session's `delegate` stays for the agent's own finds, with its skill line, and is measured again after the coding guide lands.
- **The planner's model is measured, not assumed.** On `big` each step read 35 to 37 steps for 0.48 EUR without filing, where `small` filed in 4 to 10 steps for cents. Three real plan issues run on each, and Sebastian judges the six plans blind before the policy keeps `big`.
- **The review's reasoning cannot eat its answer.** A reply cut at the output limit with no tool call joins the answer ladder's first retry, with thinking off for that call.
- Tests, hand-derived: a brief with an image carries the description under its heading. A sizing answer with `needs_info` files the question and starts no session. A plan whose card brief names out-of-scope work yields a second card. A reply with `finish_reason: length` and no tool call retries once with thinking off.

### Task 4: The session tools' descriptions

Decided (Sebastian, 2026-11-28): the eleven descriptions of work list item 2.16 replace today's texts in `internal/gateway/tools.go`, and every limit a description carried moves into the tool's refusal, checked before the tool does anything.

- The eleven texts land byte for byte from the work list's table. The descriptions test (`internal/gateway/descriptions_test.go`, the 45-word cap) pins each one.
- The refusals: `digest` over 128 KiB or not UTF-8 ("digest: <path> is <n> KiB, at most 128 KiB: read a part with grep"), `analyze_image` of the wrong type or over 8 MiB, `web_search` and `web_scrape` at the card's cap with the count ("web_scrape: 30 of 30 calls used on this card"), `delegate` without an acceptance list, `escalate` with fewer than 2 or more than 5 choices. Each refusal names the state and the fitting action, and each has a test with the exact text.
- The agent map's pages and the index regenerate with the new texts.
- The battery's Part E result, old against new on `small`, is recorded in the task's commit message as the measure, whatever it shows.

### Tasks 5 to 12

Written when their rounds finish.
