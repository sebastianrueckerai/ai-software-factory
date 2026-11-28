# Sleek round 2: the build plan

**Status:** draft. It grows as the rounds of [the work list](2026-11-28-skills-and-context-per-agent.md) finish, and nothing is built before it is complete and Sebastian has gone through it.

**Goal:** Every agent's standing context holds its factory knowledge, which may be none, and its job's instructions. Action-specific text sits behind per-agent skills through a `guide` tool. Human-facing writing rules enter only in a turn a human reads. Narration is caveman. Every typed answer climbs one ladder instead of failing. The map tells fixed text from example input and shows whole contexts from real cards. Every tool and skill is confirmed usable on `small`.

**Sources:** the work list's items 2.1 to 2.13, the sweep, the per-agent proposal, the two experiments and the battery's records under the gitignored ledger.

## Order

1. The typed answer ladder (work list 2.12, Part A). First, since every direct step on `small` depends on it.
2. The battery's session fixes (2.12, Parts B and C), once the report is in.
3. The guide tool and the per-agent skills (2.8, 2.1), with the trigger lines in the tool's description.
4. The coding guide and the caveman narration (2.2, 2.3), the test-writing rules standing.
5. Human-facing text only in a human-facing turn (2.4).
6. The paragraphs per agent (section 1 of the work list), each a pinned text Sebastian reads before it ships.
7. The model line (2.5).
8. The map: fixed against example, whole-request files from real cards (2.6, 2.7).
9. The four faults (2.9) where not fixed before, and the harness skills stay denied (2.10).
10. The whole prompts on realistic examples (2.13), with the battery as the harness.

## Tasks

### Task 1: The typed answer ladder

**Files:** `internal/factoryd/answer.go` (`answerWith`), `internal/prompts/answer.go` (the limits the `max`, `item` and `enum` tags register), the callers that handle `badAnswerError` (`brief.go`, `brief_case.go`, `gatesupervisor.go`, `namer.go`) and the review's round accounting.

- The decode checks every `max`, `item` and `enum` tag after the strict JSON decode, with one refusal line per fault: `<field>: <n> characters, at most <cap>`, `<field>: <n> items, at most <cap>`, `<field>: <value> is not one of <enum>`.
- A string or list inside 10 per cent over its cap passes unchanged.
- Beyond that, or on a missing tool call or an unknown key: one retry on the same model with the refusal lines as the next message. Then one call on the class's stronger model. Then the value is cut at its cap and the answer stands. Each rung is one timeline step.
- The model review counts a shape failure as no round.
- Tests, hand-derived. 98 of 87 is over the 10 per cent slack (95.7), so it retries. 93 of 87 passes. A retry that fits ends the ladder. Two misses reach the stronger model. Three misses cut `left` to 87 characters at a word boundary. `reasones` retries with `unknown field "reasones"`. A prose answer retries with `answered in text, not through the answer tool`.

Open: whether `big`, `small` or `premium` enforce a JSON schema at generation through LiteLLM (structured outputs), to be checked before the task is cut.

### Tasks 2 to 10

Written when their rounds finish.
