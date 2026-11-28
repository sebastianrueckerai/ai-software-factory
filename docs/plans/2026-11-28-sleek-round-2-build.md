# Sleek round 2: the build plan

**Status:** draft. It grows as the rounds of [the work list](2026-11-28-skills-and-context-per-agent.md) finish, and nothing is built before it is complete and Sebastian has gone through it.

**Goal:** Every agent's standing context holds its factory knowledge, which may be none, and its job's instructions. Action-specific text sits behind per-agent skills through a `guide` tool. Human-facing writing rules enter only in a turn a human reads. Narration is caveman. Every typed answer climbs one ladder instead of failing. The map tells fixed text from example input and shows whole contexts from real cards. Every tool and skill is confirmed usable on `small`.

**Sources:** the work list's items 2.1 to 2.13, the sweep, the per-agent proposal, the two experiments and the battery's records under the gitignored ledger.

## Order

1. The typed answer ladder (work list 2.12, Part A). First, since every direct step on `small` depends on it.
2. The `typed` model class (2.15), with the ladder as its net.
3. The battery's session fixes (2.12, Parts B and C), once the report is in.
4. The guide tool and the per-agent skills (2.8, 2.1), with the trigger lines in the tool's description.
5. The coding guide and the caveman narration (2.2, 2.3), the test-writing rules standing.
6. Human-facing text only in a human-facing turn (2.4).
7. The paragraphs per agent (section 1 of the work list), each a pinned text Sebastian reads before it ships.
8. The model line (2.5).
9. The map: fixed against example, whole-request files from real cards (2.6, 2.7).
10. The four faults (2.9) where not fixed before, and the harness skills stay denied (2.10).
11. The whole prompts on realistic examples (2.13), with the battery as the harness.

## Tasks

### Task 1: The typed answer ladder

**Files:** `internal/factoryd/answer.go` (`answerWith`), `internal/prompts/answer.go` (the limits the `max`, `item` and `enum` tags register), the callers that handle `badAnswerError` (`brief.go`, `brief_case.go`, `gatesupervisor.go`, `namer.go`) and the review's round accounting.

- The decode checks every `max`, `item` and `enum` tag after the strict JSON decode, with one refusal line per fault: `<field>: <n> characters, at most <cap>`, `<field>: <n> items, at most <cap>`, `<field>: <value> is not one of <enum>`.
- Rung 0, repair without a call, where the fault is unambiguous. A string or list at most 10 per cent over its cap passes unchanged. An unknown key within one letter of exactly one missing required key is renamed. A prose answer that holds the tool's JSON, fenced or bare, is taken as the answer.
- Rung 1: one retry on the same model. The conversation continues: the model's answer stays as its assistant message and the refusal lines follow as the next message, so the model corrects its own answer instead of thinking again.
- Rung 2: one call on the class's stronger model, with the same two messages.
- Rung 3: the value is cut at its cap at a word boundary and the answer stands. Each rung is one timeline step.
- The model review counts a shape failure as no round.
- Tests, hand-derived. 98 of 87 is over the 10 per cent slack (95.7), so it retries. 93 of 87 passes. A retry that fits ends the ladder. Two misses reach the stronger model. Three misses cut `left` to 87 characters at a word boundary. `reasones` is renamed to `reasons` without a call, and `reasns` with two candidates retries with `unknown field "reasns"`. A prose answer retries with `answered in text, not through the answer tool`.

Open: whether `big`, `small` or `premium` enforce a JSON schema at generation through LiteLLM (structured outputs), to be checked before the task is cut.

### Task 2: The `typed` model class

**Files:** infra `k8s/platform/litellm/helmrelease.yaml` (the model map), infra `factory/policy.yaml` (the purposes of the ten steps), the code's alias list where a new class name must be known (`internal/policy`, grep `small`, `big`, `premium`, `vision`), the agent map's registry job line for the gate supervisor.

- One map entry `typed` behind `dashscope/deepseek-v4.1-flash-1017` on Alibaba Model Studio, thinking off, strict `json_schema` on. The Singapore caveat is checked first with one call through LiteLLM.
- The ten fitting steps run on `typed`: checkin, screening, sizing, security-audit, gate-supervisor, judgement, answer-screener, plan-namer, title. Follow-liveness stays on `small`.
- The five borderline steps stay until their replay: case-checkin and model-review need a read of the code, not of the transcript, in 3 of 3 runs on `typed` before they move.
- The battery's Part A runs on `typed` for the ten steps before the policy changes, 3 runs each, and every answer must come through the tool and decode.
- The gate supervisor's job line in the map says what it decides: wait, retry, cancel or escalate for an activity past its bound.
- Tests, hand-derived: the policy test that lists the known aliases gains `typed`. The map's registry test pins the new job line.

Open: whether Sebastian's provider is Jev. If so, the label steps screening, sizing, judgement and answer-screener may take it later as a second step. Nothing else fits it.

### Task 3: The session tools the small model does not reach

The battery's finding: on `small` a coding session guesses instead of asking (`request_info` 0 of 3), does everything itself instead of delegating (`delegate` 0 of 3), ignores the issue's image (`analyze_image` 0 of 3), reads with grep instead of `digest`, and takes versions from the module proxy instead of `web_search`. The last two are the right calls. The first three need construction, not a prompt rule.

- **Images are described before the session.** When an issue or a message carries an image, factoryd calls the vision alias and puts the description into the brief, as the `telemetry` facts already are. The session's `analyze_image` stays for a screenshot the agent takes itself. Files: the brief renderer in `internal/factoryd` (grep `codingFacts`, `telemetry`), a test with an issue that holds one image and the brief that carries its description.
- **A thin issue is asked about before the session.** The sizer's answer gains `needs_info` with the question, and factoryd asks the author through the existing request flow, so no session starts on an issue it cannot reproduce. The session's `request_info` stays for what the agent finds later. Files: `answers.go` (the sizing answer), the sizing door, the intake flow that today handles `request_info` from a session.
- **Planned follow-up work is filed by the plan, not by the session.** A card's brief that names work as out of scope comes from the planner's cards, and the planner files the follow-up card itself. The session's `delegate` stays for the agent's own finds, with its skill line, and is measured again after the coding guide lands.
- **The planner's model is measured, not assumed.** On `big` each step read 35 to 37 steps for 0.48 EUR without filing, where `small` filed in 4 to 10 steps for cents. Three real plan issues run on each, and Sebastian judges the six plans blind before the policy keeps `big`.
- **The review's reasoning cannot eat its answer.** A reply cut at the output limit with no tool call joins the answer ladder's first retry, with thinking off for that call.
- Tests, hand-derived: a brief with an image carries the description under its heading. A sizing answer with `needs_info` files the question and starts no session. A plan whose card brief names out-of-scope work yields a second card. A reply with `finish_reason: length` and no tool call retries once with thinking off.

### Tasks 4 to 11

Written when their rounds finish.
