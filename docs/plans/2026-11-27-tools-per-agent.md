# Tools per agent: each job gets only the tools it uses, in few words

**Status:** built. Merged on code main 8843575df on 2026-11-27.

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to build this plan task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Every session step is offered the built-in and gateway tools its job uses and no others. The project agent's 69 tool schemas shrink to a core set plus a one-line index of the rare tools, with a tool that fetches one full schema on request. Every tool text is short and capped by a test. A forced answer tool, built from a Go struct, replaces the answer shapes that direct prompts spell in prose.

**Architecture:** Plan A's profile decides what a step is offered, and `SessionConfig` turns the lists into permission denies. The policy classes stay the ceiling a call is admitted under. `prompts.Offered` joins the two. An opencode plugin replaces built-in tool texts. The console builds the chat's tool list per turn from the profile and the thread's fetches. `prompts.AnswerTool` turns a tagged struct into a forced answer tool and `factoryd.Answer` returns the parsed struct.

**Tech Stack:** Go as the code repository pins it, `reflect`, `encoding/json`, `github.com/google/jsonschema-go` where the gateway already uses it, opencode 1.19.6 and its plugin package `@opencode-ai/plugin` 1.19.6 (already baked into the sandbox image), Node 22 for the plugin.

**Spec:** [2026-11-27-prompts-carried-by-construction.md](2026-11-27-prompts-carried-by-construction.md) and the decisions here. Plan A ([2026-11-27-prompt-profiles.md](2026-11-27-prompt-profiles.md)) builds `internal/prompts` and the profile, and this plan fills and extends its tool lists. Plan C ([2026-11-27-each-agent-gets-its-job.md](2026-11-27-each-agent-gets-its-job.md)) writes each step's content and applies the answer generator. This plan writes no per-step prose.

All code paths and lines are in `ai-software-factory-code` at main `9e84a5260`, unless named. Infra lines are at `e22ba606`. Word counts are whitespace words. A tool's words are those of its wire JSON (name, description and parameters), as captured in the agent map.

## Decisions, with the reason

1. **`task` goes everywhere.** It costs 597 words per request, its `general` subagent runs the 1,579-word default preamble with every gateway tool, and the gates cannot see its work. `digest` (a cheap model reads one file) and `delegate` (a cheap card after this one) cover it. The whole subagent path goes. To give the planner `task` back: one profile line and an `agent.general.prompt`.
2. **`webfetch` goes everywhere.** The sandbox resolves only the gateway, the Git server and two package registries (`internal/factoryd/sandbox.go:74`), so a fetch elsewhere fails. `web_scrape` and `web_search` are the capped, audited door. `webfetch` costs 180 words.
3. **`task`, `webfetch` and `skill` are constants, not profile choices.** `BuiltinTools` shrinks to the six tools a job may choose: `bash`, `edit`, `glob`, `grep`, `read`, `todowrite`. `SessionConfig` always denies the three constants. Plan A's `BuiltinTools` and the counts in its `TestSessionConfigDeniesWhatTheProfileDrops` change (Task 2).
4. **The policy class stays the ceiling and the profile is the offer.** The gateway serves the list its class names, with caps (`internal/gateway/tools.go:575,681`, `internal/policy/policy.go:1564`). A project's policy sets those caps, so they stay there. The profile narrows what a step is told. `prompts.Offered` joins the two and every consumer reads the join. A test fails a profile tool that no shipped class lists.
5. **The chat's `steer` is deleted** and `card_history` merges into `history`. `tell_card` routes a text to `steer` by the card's state and says the agent has no wrong choice to make (`internal/console/tell_card.go:14`). Offering both is a wrong choice. `history` takes an optional `task_id`.
6. **Rare chat tools sit behind `tool_schema`.** The thread's tool set is derived from its stored rows, so no new store exists and no state can drift from the history.
7. **A description cap is a test.** 45 words for a gateway tool, 20 for a chat tool.
8. **The eight tools the coding agent never calls stay in the gateway and are offered by no step.** They are `cloud_prices`, `commission_server`, `list_resources`, `release_resource`, `resource_request_status`, `ssh_certificate`, `replicate_predict` and `fal_run`. `task_costs` is the same: no class lists it and nothing calls it. This plan stops offering them and keeps the stack, because the resource request flow they serve is part of the design and a step that needs them lists them in its profile. Default. Veto line: delete the nine tools and the resource request flow with them.

## The built-in set per job

Every set follows the job. Screening reads attacker-written text, so it gets no shell. Sizing counts changed lines from what `grep`, `glob` and `read` show, and runs no check. The planner keeps `bash` for `git log` and `git blame`, which no other tool reads, and because its guide plans against what `bash check` runs. The prover runs its own tests. The responder is a text pushed into the coding session, so it has no tool block and uses the coding session's.

| step | bash | edit (and write) | glob | grep | read | todowrite | built-ins offered |
|---|---|---|---|---|---|---|---|
| coding, coding-card | yes | yes | yes | yes | yes | yes | 6 |
| prover | yes | yes | yes | yes | yes | no | 5 |
| planner | yes | no | yes | yes | yes | no | 4 |
| sizing | no | no | yes | yes | yes | no | 3 |
| screening | no | no | yes | yes | yes | no | 3 |

`task`, `webfetch` and `skill` are off in every row. The coding steps keep `todowrite` because `workingState` reads the last todo list into the next session's handover (`internal/factoryd/carry.go:90`). Read-only now holds by construction: today only prose says "do not change code" (`internal/factoryd/report.go:526,579`).

## The gateway set per job

| step | gateway tools offered | count |
|---|---|---|
| coding, coding-card | analyze_image, delegate, deployment_health, digest, escalate, manual, request_cut, request_info, request_tool, web_scrape, web_search | 11 |
| planner | analyze_image, digest, file_plan, manual, web_scrape, web_search | 6 |
| prover | file_proofs, manual | 2 |
| sizing, screening | analyze_image, manual | 2 |

Reasons by tool:

- `escalate` leaves the planner: its plan has a `questions` field and code ends a stuck planner (`internal/factoryd/plan.go:2442`).
- `escalate`, `request_info`, `web_scrape`, `web_search` and `digest` leave screening and sizing. A suspect verdict is screening's way to a human, a sizer unsure answers medium, a URL in an outsider's issue is a lure, and neither reads a file big enough to need `digest`.
- The eight tools of decision 8 leave coding. A bug-fix card never rents a server.
- `escalate` and `request_info` both stay in coding because they ask different people: the project agent or a human, and the issue's author.
- `analyze_image` stays everywhere: the session models are text-only and the `vision` alias is the one way to see an image.

Tool words per request, from the agent map captures (wire JSON, before any text is rewritten):

| step | tools today | words today | tools after | words after |
|---|---|---|---|---|
| sizing, screening | 17 | 3,625 | 5 | 745 |
| planner | 17 | 3,598 | 10 | 1,801 |
| prover | 12 | 3,222 | 8 | 1,994 |
| coding | 28 | 4,541 | 18 | 3,145 |

The fixture project lists no namespace, so the coding row lacks `deployment_health`, which adds about 100 words. Tasks 5 and 6 cut further.

## Facts about opencode this plan relies on

Verified on the pinned 1.19.6 binary with a local capture server. No sandbox session ran.

- `permission.<tool>: deny` removes a built-in tool. `edit: deny` removes `edit` and `write`. `permission."factory-tools_<name>": deny` removes one gateway tool.
- The plugin hook `tool.definition` receives `input.toolID` and an `output` with an assignable `description`. A test plugin cut `bash` from 734 to 4 words. It does not change MCP tool text.
- The `grep` and `glob` texts say "use the Task tool instead", and `grep` says to use `rg` in `bash`. With those tools denied they name tools the step lacks. `write`'s text says "NEVER write new files unless explicitly required", which is wrong for the prover and the coder.
- The sandbox image bakes `@opencode-ai/plugin` 1.19.6 under `/opt/opencode-home/.config/opencode` (`Dockerfile.sandbox:94-100,180`) and the worker copies it into the pod's home (`cmd/agent-worker/main.go:546-555`). A plugin there loaded on the host. The pod is unverified.

## Interfaces

### The profile gains tool tiers and a tool budget

Plan A's `Tools` struct gains two fields and `Profile` gains one:

```go
// Tools are the tools a step may use. Every list is complete: a tool not named is not offered.
type Tools struct {
	Builtin  []string `yaml:"builtin"`  // a subset of BuiltinTools (bash edit glob grep read todowrite)
	Gateway  []string `yaml:"gateway"`  // a subset of policy.PaidTools and policy.FreeTools
	Chat     []string `yaml:"chat"`     // core chat tools: full schema on every turn
	Rare     []string `yaml:"rare"`     // chat tools behind tool_schema: one index line until fetched
	Attached []string `yaml:"attached"` // chat tools offered only while the thread holds an attachment
}

// Profile gains, beside BudgetWords:
BudgetToolWords int `yaml:"budget_tool_words"` // the most tool words the step's offered tools hold. 0 for a step with no tools.
```

Rules `load` adds, each with a test: `rare` and `attached` need a non-empty `chat` and an empty `builtin`. No name is in two of the three chat lists. Every name is a known chat tool. Plan A's `BuiltinTools` becomes `[]string{"bash", "edit", "glob", "grep", "read", "todowrite"}`, and its `SessionConfig` always adds the denies of `alwaysDenied = []string{"skill", "task", "webfetch"}`.

### The offered list

```go
// Offered is the gateway tools a session of step may call: the tools the
// task's classes allow (Document.Tools), in the order given, that the step's
// profile names. The brief, SandboxFacts and the harness read this one list.
func Offered(step string, allowed []string) []string

// ToolWords is the words of a tool's wire JSON: name, description, parameters.
func ToolWords(t Tool) int
```

### The answer tool

```go
// Tool is a function tool in the OpenAI form.
type Tool struct {
	Name, Description string
	Parameters        map[string]any
}

const AnswerToolName = "answer"

// AnswerTool derives the forced answer tool of struct type t. It panics on a
// pointer, map, interface or untagged exported field. Fields are required unless omitempty.
//   json:"name,omitempty"  the property name, and optional
//   desc:"..."             the property's description
//   enum:"a,b"             a closed string set
//   max:"limit"            string: maxLength, slice: maxItems, the registered limit's value
//   item:"limit"           slice of string: maxLength of each element
func AnswerTool(t reflect.Type) Tool

// WithEnum returns a copy with the closed set of field replaced, for a set that
// depends on the call (the check-in's decisions).
func (t Tool) WithEnum(field string, values []string) Tool

// RegisterLimit names a bound the parser also uses, so a schema and its
// parser share one constant. It panics on a duplicate name.
func RegisterLimit(name string, n int)

// RegisterAnswer names a struct type as a step's answer, as a profile's answer field does.
func RegisterAnswer[T any](name string)

// Prompt gains: the answer tool of its step, if the profile names one.
func (p Prompt) Answer() (Tool, bool)
```

```go
// factoryd: the direct transport's typed call. SupervisorModel.Chat sends the
// forced answer tool when p has one and returns its arguments as content.
func Answer[T any](ctx context.Context, m *SupervisorModel, taskID, alias string, timeout time.Duration, p prompts.Prompt, input any) (out T, deployment string, err error)
```

### The chat's tool list

```go
// ToolSchemaName is the one tool that fetches a rare tool's schema.
const ToolSchemaName = "tool_schema"

// threadTools are the rare tools the thread has fetched: the names of its
// rows' successful tool_schema calls, in policy.ChatTools order.
func threadTools(rows []factoryd.ChatMessage) []string
```

## Global Constraints

- No backward compatibility. Each task deletes the code it replaces.
- A text in `internal/prompts/tools/` has its sum in `texts.sha256`, and the `prompts` merge class sends a change to Sebastian.
- Comments only for what code cannot say. Tests hand-derive expectations.
- Run `go test -race ./...` before each commit. Commit to `master` and push.
- A tool description never mentions an interactive session, a commit protocol or a tool the step lacks.

## Review Focus

- `Offered` is the only list any consumer reads, and a profile tool outside the shipped classes fails a test.
- `grep -rni subagent internal cmd` finds nothing.
- A rare chat tool called before its schema is fetched is refused with the fitting action.
- The plugin is optional. If Task 1 fails, Task 6 is dropped and nothing else changes.

## Task 1: Verify the plugin hook in the sandbox image

This task runs first. It decides whether Task 6 exists.

**Files:**
- Create: `opencode-plugin/plugins/tool-text.js`
- Modify: `internal/factoryd/agentdocloop.go:512` (`agentDocLoopEnv` seeds the throwaway home as `useHarness` does)
- Modify: `internal/factoryd/agentdocloop_test.go`

**Interfaces:**

```js
// opencode-plugin/plugins/tool-text.js
import { readFileSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "tool-text")

export default async () => ({
  "tool.definition": async (input, output) => {
    const file = join(dir, input.toolID + ".md")
    if (existsSync(file)) output.description = readFileSync(file, "utf8").trim()
  },
})
```

```go
// agentDocLoopEnv seeds HOME's .config/opencode from bake (a directory like
// /opt/opencode-home/.config/opencode), the way the worker's useHarness does.
func agentDocLoopEnv(bake string) (func(), error)
```

- [ ] **Step 1: Write the failing test** `TestPluginReplacesABuiltinText` in `agentdocloop_test.go`, skipped without `-opencode`. It writes `tool-text/bash.md` holding `Run one shell command.`, captures the `coding` loop with the pinned binary, and asserts the request's `bash` description equals that text and `edit` keeps opencode's own.
- [ ] **Step 2: Run it.** `go test ./internal/factoryd/ -run TestPluginReplaces -opencode <pinned binary>`. Expect FAIL (no plugin seeded).
- [ ] **Step 3: Implement** the plugin file and the seeding. Build the bake with `npm ci --offline` as `Dockerfile.sandbox:94-100` does.
- [ ] **Step 4: Run it three ways and record the result in the commit message.** On the host: expect PASS. On the host with `OPENCODE_DISABLE_PROJECT_CONFIG=1`, the setting `agents_md: false` produces: expect PASS, and if the hook stops loading the plugin does not reach the report steps. In the sandbox image: build `Dockerfile.sandbox`, copy the bake as `useHarness` does into an empty home in `docker run`, and run the built `agentdoc` against the image's `opencode`: expect PASS.
- [ ] **Step 5: Decide.** All three pass: go on to Task 6. Any fails: delete `opencode-plugin/plugins/`, drop Task 6, and the built-in text stays opencode's. The tool sets of Tasks 2 and 3 do not depend on the plugin.
- [ ] **Step 6: Commit:** "agent map capture: a plugin in the baked home replaces a built-in tool text".

Not verifiable here: whether gVisor's `runsc` runtime changes the load. Only a pod on the cluster shows it. Task 9's closing check reads the first request of a real session for the replaced text.

## Task 2: `task`, `webfetch` and `skill` are off and the built-in sets follow the job

**Files:**
- Modify: `internal/prompts/profile.go`, `internal/prompts/session.go` (Plan A): `BuiltinTools`, `alwaysDenied`
- Modify: `internal/prompts/profiles/{coding,coding-card,planner,prover,screening,sizing}.yaml`
- Modify: `internal/factoryd/opencode.go:172,431,861,887,1067,1317,1366`, `internal/factoryd/plan.go:1451`, `internal/factoryd/carry.go:19,102,150-176,197`, `internal/factoryd/supervisor.go:203,287`, `internal/factoryd/replan.go`, `internal/harness/types.go:93-111`, `cmd/agent-worker/main.go`, `cmd/agentdoc/registry.go`
- Delete: the `opencode-subagents` page and its registry entry (`internal/factoryd/agentdocloop.go:682`, `AgentDocAgentConfig`)
- Modify: tests of each

**Interfaces:** the profile block above. `buildOpencodeConfig` loses its `subagent string` parameter and the `general` and `explore` agent entries.

- [ ] **Step 1: Write the failing tests.**
  - `TestSessionToolSets` (`internal/console/prompts_test.go`, replaces Plan A's `TestSessionStepsKeepTheirToolSets`): each of the six steps' `tools.builtin` equals its row of the table, sorted. `sizing` equals `[glob grep read]`.
  - `TestSessionConfigAlwaysDeniesTheConstants` (`internal/prompts/session_test.go`): every profile with a `builtin` list has `skill`, `task` and `webfetch` as `"deny"`.
  - `TestSessionConfigDeniesWhatTheProfileDrops` (Plan A's, amended): `builtin: [bash, read]` and `gateway: [digest]` deny four built-ins (`edit`, `glob`, `grep`, `todowrite`), three constants and 21 gateway tools. 4 + 3 + 21 = 28 keys.
  - `TestReadOnlyStepsCannotWrite`: `screening`, `sizing` and `planner` lack `edit`, and the first two lack `bash`.
  - `TestBuildOpencodeConfigHasNoSubagents`: the config JSON has no `general` or `explore` key.
- [ ] **Step 2: Run.** `go test ./internal/prompts/ ./internal/console/ ./internal/factoryd/ -run 'SessionToolSets|AlwaysDenies|ReadOnlySteps|NoSubagents|DeniesWhat'`. Expect FAIL.
- [ ] **Step 3: Implement.** Set `BuiltinTools` and `alwaysDenied`, and write the six profiles from the table. Delete the subagent path: the `subagent` parameter and agent entries of `buildOpencodeConfig` (`opencode.go:1067`) and its variable (`:165-172`), `downARung` (`:875,887`), the `task` result capture and `maxTaskResult` (`:1317,1366`), the subagent session map and mark (`:431,466-500,1167-1263`), the carry's `task` case, `reportText` and report files (`carry.go:19,102,150-176,197`), `harness.ReportFile` and the worker's writer of it, `SubagentToolCalls` (`supervisor.go:111,203,287`), the `explore` clause of `mapFirst` (`plan.go:1451`) and the `opencode-subagents` page. The guides keep "for work after this card, call delegate."
- [ ] **Step 4: Run** `go build ./... && go vet ./... && go test -race ./...`. Then `grep -rniE 'subagent|ReportFile|carryTask|reportText' internal cmd --include=*.go`. Expect build and tests PASS and the grep to print nothing.
- [ ] **Step 5: Commit:** "tools: task, webfetch and skill are off everywhere, and each job gets only the built-ins it uses".

## Task 3: The gateway set per job and one offered list

**Files:**
- Modify: `internal/prompts/profiles/{coding,coding-card,planner,prover,screening,sizing}.yaml` (`gateway`)
- Create: `internal/prompts/offered.go`, `internal/prompts/offered_test.go`
- Modify: `internal/factoryd/runner.go:2982`, `internal/factoryd/plan.go:2953`, `internal/factoryd/agentdocloop.go:109` (read `prompts.Offered`)
- Modify: `internal/factoryd/sandbox.go:74` (callers pass the offered list, the function is unchanged)

**Interfaces:** `Offered` and `ToolWords` above.

- [ ] **Step 1: Write the failing tests.**
  - `TestOfferedIsTheProfileInsideTheClass`: a profile `gateway: [digest, manual]` with `allowed = [escalate, manual, digest]` gives `[manual, digest]`. With `allowed = [escalate]` it gives an empty slice.
  - `TestOfferedMatchesTheHarness` (`internal/console/prompts_test.go`): for each session step, the gateway tools `SessionConfig(step)` does not deny, within the shipped class, equal `Offered(step, policy.Tools(classes, false))`.
  - `TestProfileToolsAreListedByAClass`: every `gateway` tool of a session step is in `policy.Tools` of its class (`agentDocLoopClass`, `internal/factoryd/agentdocloop.go:71`) in the shipped policy.
  - `TestSessionGatewaySets` pins the gateway table. `TestCodingDropsTheEightTools`: `coding.yaml` lists none of them.
- [ ] **Step 2: Run.** Expect FAIL.
- [ ] **Step 3: Implement.** Write the `gateway` lists. `Offered` is a filter. The three call sites pass its result where they passed `Document.Tools`, so the brief's tool line and `SandboxFacts` read it. `SandboxFacts`' `commission_server` sentence (`sandbox.go:79`) then drops out for coding by itself, since the tool is no longer offered. The gateway code and the shipped policy classes do not change.
- [ ] **Step 4: Run.** `go test -race ./...`. Expect PASS.
- [ ] **Step 5: Commit:** "tools: each session step is offered the gateway tools its job uses, and the brief reads that one list".

## Task 4: Chat tools that duplicate another go

**Files:**
- Modify: `internal/console/chat_tools.go:274,1601,1607,1919`, `internal/console/access.go:175`, `internal/policy/policy.go:195,199,214`
- Modify: `internal/console/actions.go:1272` (it routes by `c.cfg.Steer`, which `tell_card` still uses: keep `doSteer` and `cfg.Steer`, delete only the tool)
- Modify: tests that name `steer` or `card_history`

**Interfaces:** `history` gets an optional `task_id`: `params: {"task_id": taskParam, "n": nParam}`, no `required`. Without `task_id` it reads the project's events, with it one card's.

- [ ] **Step 1: Write the failing tests.** `TestSteerIsNoChatTool`: `policy.ChatTools` and the `tools` table hold no `steer` and no `card_history`. `TestHistoryTakesAnOptionalCard`: `history` with a `task_id` returns the rows `card_history` returned, with `{}` the project's. `TestTellCardStillRoutesARunningCard`: the existing running-card test passes without the tool.
- [ ] **Step 2: Run.** `go test ./internal/console/ ./internal/policy/ -run 'SteerIsNo|HistoryTakes|TellCardStill'`. Expect FAIL.
- [ ] **Step 3: Implement.** Delete the `steer` and `card_history` entries, their access rows, their `ChatTools` and `Confirm` names, and the `steer` filter in `chatTools` (`chat_tools.go:276`). Fold the card branch into `history`.
- [ ] **Step 4: Run.** `go test -race ./...`. Expect PASS.
- [ ] **Step 5: Commit:** "chat tools: steer is tell_card's, and history reads one card or the project".

## Task 5: Descriptions are capped, and the long ones are cut

**Files:**
- Create: `internal/gateway/descriptions_test.go`, `internal/console/descriptions_test.go`
- Modify: `internal/gateway/tools.go` (nine descriptions), `internal/gateway/cloud.go:197`, `internal/console/chat_tools.go` (any `about` over 20 words)

**Interfaces:** `const maxGatewayDescription = 45` in `internal/gateway`, `const maxChatDescription = 20` in `internal/console`.

- [ ] **Step 1: Write the failing tests.** `TestGatewayDescriptionsAreCapped`: list the tools of `toolServer` for a caller that allows all and fail each description over 45 words, naming tool and count. Today nine fail: `analyze_image` (74), `delegate` (64), `deployment_health` (70), `digest` (78), `file_proofs` (71), `request_cut` (67), `request_info` (48), `request_tool` (77), `commission_server` (48). `TestChatDescriptionsAreCapped`: every `chatTool.about` has at most 20 words. The capture's longest is 20, so the test names any tool outside the 69 that is over.
- [ ] **Step 2: Run.** Expect FAIL with the nine names.
- [ ] **Step 3: Implement.** Set these texts, each counted at 45 words or fewer:
  - `analyze_image`: "Have a vision model describe one image: a workspace file or an image of the card's issue. Name exactly one of path and card_image. ask says what to look for. PNG, JPEG, WebP or GIF, at most 8 MiB. Books as a model call."
  - `delegate`: "File a follow-up card for routine work this card need not do. It runs on the cheap rung after this card lands and builds on its merge. Give a title, why, summary and a brief a weaker model acts on alone. Free."
  - `deployment_health`: "Read a Deployment of this card's project as the cluster reports it now: replicas, pods with each container's restarts, state and last termination, and the last hour's events. No logs, no Secrets. Omit namespace to search the project's namespaces."
  - `digest`: "Have a small model read one UTF-8 text file of your workspace, at most 128 KiB, and answer your ask. Only the answer enters your context. Use it on a big file with a pointed ask. Books as a cheap-model call."
  - `file_proofs`: "File one test per criterion and hold-out, each with path, suite, name, whole code and what your run of bash check test on main showed. A refusal names every finding: fix it and file again, three filings at most. The last passing one stands."
  - `request_cut`: "Ask to cut this card when its work is bigger than one card should be: give why and 2 to 5 parts. The check-in judges it. If it cuts, this session stops, your work is pushed and the planner plans the rest. Free."
  - `request_info`: "Ask the issue's author for information instead of guessing, when you could not reproduce the problem: what you tried and what you need. This session ends. The task resumes with the answer or closes after 14 days. Free."
  - `request_tool`: "Ask for a tool the sandbox lacks, such as chromium, ffmpeg or python3, instead of installing it. Your work is pushed, a card adds the tool to a project image, and this card restarts on it. Name the Debian package or binary and why."
  - `commission_server`: "Commission a throwaway Debian 12 server for lease_minutes, reachable by SSH certificate from this sandbox only. Its cost is reserved on the task budget. Release it when done. Beyond the envelope it becomes a human approval request."
- [ ] **Step 4: Run.** `go test -race ./internal/gateway/ ./internal/console/`. Expect PASS. Run `go test ./cmd/agentdoc/` and regenerate in Task 9.
- [ ] **Step 5: Commit:** "tools: every gateway description is at most 45 words and every chat description at most 20, by test".

## Task 6: The plugin replaces the built-in tool texts

Run only if Task 1 passed.

**Files:**
- Create: `internal/prompts/tools/{bash,edit,write,read,glob,grep,todowrite}.md`
- Modify: `internal/prompts/texts.sha256`, `internal/prompts/pins_test.go` (Plan A: add `prompts/tools/*.md` to the pinned sets)
- Modify: `Dockerfile.sandbox:180` (copy the texts beside the plugin), `Makefile`
- Create: `internal/prompts/tooltext_test.go`

**Interfaces:** the plugin reads `tool-text/<toolID>.md` beside itself (Task 1). The image build copies `internal/prompts/tools/*.md` to `/opt/opencode-home/.config/opencode/tool-text/`, so the texts and the Go code come from one commit.

What each text keeps, because the model's calls depend on it. None carries advice on other tools, emoji rules, git or PR rules, or examples.

- `bash`: one persistent shell, `workdir` instead of `cd`, `timeout` in milliseconds with its default, the output cut at 2,000 lines or 51,200 bytes with the full text in a file, `/tmp/opencode` for scratch.
- `edit`: exact match of `oldString`, an error if it is absent or found more than once, `replaceAll`, the indentation after the `N: ` line prefix and never the prefix itself, read the file first.
- `write`: it overwrites, read an existing file first.
- `read`: absolute path, `offset` and `limit`, the 2,000-line default, the `N: ` prefix, directories list one entry per line, images and PDFs return as attachments.
- `glob`: the pattern and the `path` default. `grep`: regex, `include`, the result shape.
- `todowrite`: the three fields of an item, the four statuses, one `in_progress`.

The worked example, `internal/prompts/tools/bash.md`, 86 words against 734 today:

```
Run one shell command in a persistent shell. It runs in the working directory. Set `workdir` to run elsewhere and never use `cd`. `timeout` is in milliseconds and defaults to 120000. Output past 2000 lines or 51200 bytes is cut, and the full output goes to a file: read it with `read` or `grep`. Use `/tmp/opencode` for scratch files. Use `read`, `grep` and `glob` for files, and the shell for commands such as the project's checks.
```

- [ ] **Step 1: Write the failing tests** in `tooltext_test.go`.
  - `TestToolTextsAreCapped`: every file under `tools/` has at most 90 words. Over a `MapFS` with a 91-word file it fails.
  - `TestToolTextsNameNoMissingTool`: no file contains `Task`, `webfetch`, `commit`, `the user` or `rg`, and `grep.md` and `glob.md` do not name `bash`.
  - `TestToolTextsKeepTheirSemantics`: `edit.md` contains `oldString`, `replaceAll` and `more than once`. `bash.md` contains `workdir`, `timeout` and `120000`. `read.md` contains `offset` and `limit`. `todowrite.md` contains `in_progress`.
  - Plan A's `TestTextsArePinned` covers `tools/*.md`. `TestToolTextsHaveATool`: every file name is in `BuiltinTools` or is `write`.
- [ ] **Step 2: Run.** `go test ./internal/prompts/ -run 'ToolTexts'`. Expect FAIL (no files).
- [ ] **Step 3: Implement.** Write the seven texts to the table, each at most 90 words. Add their sums. Add the `COPY` line to `Dockerfile.sandbox` after line 180 and a `make` target the image build uses. Task 1's capture now runs with the real texts.
- [ ] **Step 4: Run.** `go test -race ./...`. Capture `coding` with the pinned binary and read the `bash` entry: its description equals `bash.md`. Expect PASS.
- [ ] **Step 5: Commit:** "tools: a plugin gives each built-in tool our short text, pinned like the forms".

If the hook fails in the pod after this task, delete the plugin, the texts and the `COPY`. The permission denies keep every tool set intact.

## Task 7: The project agent's two-tier tool list

**Files:**
- Modify: `internal/prompts/profiles/project-agent.yaml`, `internal/prompts/profile.go` (the new fields and rules)
- Create: `internal/console/toolschema.go`, `internal/console/toolschema_test.go`
- Modify: `internal/console/chat_tools.go:291` (`offered`), `internal/console/chat.go:1289,1554` (the loop and `call`)

**Interfaces:** `ToolSchemaName` and `threadTools` above. Add to `*turn`:

```go
fetched []string // the rare tools the thread's schemas are fetched for, in ChatTools order

// offered builds the request's tool list: the profile's core tools, the
// attached tools when a row of the thread carries an attachment, the fetched
// rare tools, and tool_schema when any rare tool is not fetched.
func (t *turn) offered() []factoryd.OperatorTool
```

The core set is the profile's `chat` list. The sets partition `policy.ChatTools` after Task 4's two deletions (81 names, 79 left).

**Core, 46 tools, full schema on every turn:** system, find_cards, card, history, card_step, board_digest, costs, diff, plan, pr, file, tree, grep, web_search, web_scrape, research, session, session_steps, session_step, session_search, new_card, answer, comment, tell_card, retry, request_changes, approve_merge, deny_merge, answer_criteria, close, edit, give_room, hold_card, release_hold, read_doc, notes_read, notes_write, escalate, attach_analysis, active_threads, chat_search, inbox, watch_card, unwatch_card, set_timer, ask.

**Rare, 30 tools, one index line each:** board, ci, alerts, deployment_health, cluster_facts, resources, settings, policy, project_images, release_resource, request_image, rerun_checks, set_accent, set_dependency, write_doc, show_doc, routines, routine_run, routine_skip, board_view, board_view_reset, promote_resource, invite, github_export, github_sync, set_pool, set_autonomy, routine_write, routine_delete, replan.

**Attached, 3 tools:** analyze_image, read_attachment, summarize_attachment. They are core while a row of the thread carries an attachment (`attachRows`, `internal/console/chat.go:583`) and appear nowhere otherwise, not even in the index, because they cannot work without one.

The rare set is the audit's 22 rare or overlapping tools minus `steer`, plus nine tools the capture's fixture did not offer and no turn needs by default: promote_resource, invite, github_export, github_sync, set_pool, set_autonomy, routine_write, routine_delete and replan. In the 69-tool capture the 21 rare tools hold 950 words and 7,895 bytes, the attachment tools 176 words and 1,394 bytes, and `steer` with `card_history` 77 words and 669 bytes. The index of the 24 costs 334 words and 2,084 bytes, and `tool_schema` about 45 words. The default request's tools fall from 4,093 words and 33,165 bytes to about 3,270 words and 25,700 bytes. The larger cut is in the core tools' parameter text (`answer` alone is 361 words, `new_card` 240), which `budget_tool_words` pins.

How `tool_schema` works:

- Its description is "Fetch the full schema of one tool below, then call it." and one `name: about` line per rare tool, in `ChatTools` order.
- A call `tool_schema {"name": "board"}` returns the tool's function JSON as `def` builds it (a `(needs OK)` mark included) and appends the name to `t.fetched`. The loop at `chat.go:1289` rebuilds `defs = t.offered()` after each batch of calls, so the next model call of the same turn holds the schema.
- A name outside the rare set returns `There is no rare tool X. The rare tools are: <names>.` A name already core returns `X is already in your tool list.`
- A call of a rare tool whose schema is not fetched is refused in `(*turn).call` (`chat.go:1554`), before the arguments are read: `Refused: board is a rare tool and its schema is not in this thread. Call tool_schema with name "board", then call board.` The refusal names the state and the fitting action.
- State is derived. `threadTools(rows)` reads each row's `ToolCalls` for `tool_schema` calls with a non-error result. The set lasts as long as the rows do. A fetch older than the last compaction leaves the live rows, so the agent fetches that schema again at the cost of one call. The tool order is fixed, so the provider's prefix cache holds between fetches.

- [ ] **Step 1: Write the failing tests** in `toolschema_test.go`.
  - `TestTiersPartitionTheChatTools`: `chat`, `rare` and `attached` are disjoint and their union equals `policy.ChatTools`. Lengths 46, 30 and 3: 46 + 30 + 3 = 79 = 81 - 2.
  - `TestOfferedHoldsTheCoreAndToolSchema`: a thread with no attachment and no fetch offers the 46 core tools plus `tool_schema`, 47 in all, and no rare tool.
  - `TestToolSchemaDescriptionIndexesEveryRareTool`: 30 lines, one per rare tool, each `name: about`.
  - `TestToolSchemaFetchesAndRemembers`: after `tool_schema {"name":"board"}`, `offered()` holds `board` with its parameters, and a later turn built from the saved rows holds it too. The index lists the other 29.
  - `TestRareCallBeforeFetchIsRefused`: calling `board` unfetched returns the refusal text above and runs nothing.
  - `TestAttachedToolsFollowTheAttachment`: with an attachment row the offer holds the three tools, without one none, and none is in the index.
  - `TestToolSchemaOfACoreOrUnknownName`: the two error texts, verbatim.
  - `TestToolBudget`: `ToolWords` of a fresh thread's offer is at most `budget_tool_words` and at least 90 percent of it.
- [ ] **Step 2: Run.** `go test ./internal/console/ -run 'Tiers|OfferedHolds|ToolSchema|RareCall|AttachedTools|ToolBudget'`. Expect FAIL.
- [ ] **Step 3: Implement.** Add the profile fields and rules. Write the three lists into `project-agent.yaml`. Build `tool_schema` in `offered`, not in `tools`, so it has no access-table row, no `Confirm` entry and no `ChatTools` name. Add the refusal case after `!ok` in `call`. Move `research`'s six names (`researchTools`, `internal/console/research.go:41`) into `research.yaml`'s `chat` list and read them from there.
- [ ] **Step 4: Run.** `go test -race ./...`. Then capture the `project-agent` page and read its first request: 47 tools. Expect PASS.
- [ ] **Step 5: Commit:** "chat tools: a core set with full schemas, the rare tools behind tool_schema".

## Task 8: The answer tool generator and the typed direct call

**Files:**
- Create: `internal/prompts/answer.go`, `internal/prompts/answer_test.go`
- Modify: `internal/factoryd/supervisor.go:325-343,367,378,419,456` (`chatPayload`, `Chat`, `chat`, `completion`)
- Modify: `internal/factoryd/checkin.go:612-656` (`momentAnswerSchema` builds from the generator)
- Create: `internal/factoryd/answer.go`, `internal/factoryd/answer_test.go`

**Interfaces:** `Tool`, `AnswerTool`, `WithEnum`, `RegisterLimit`, `RegisterAnswer`, `Prompt.Answer` and `factoryd.Answer`, above.

The transport. `chatPayload` (`supervisor.go:329`) sends `response_format: json_object` today and the user message opens with `ChatInputLead` (`:325`), which only OpenAI's JSON mode requires. With an answer tool the payload sends `tools: [<answer>]` and `tool_choice: ForcedToolChoice("answer")` (`checkin.go:614`), no `response_format`, and the input as the user message with no lead. The check-in forces a tool this way in production (`checkin.go:1069,1248`). `completion` reads the first tool call's `arguments` as the content when one exists. A cut answer takes today's low-depth retry. `Answer[T]` checks `reflect.TypeFor[T]()` equals the registered type of the prompt's answer, then decodes the arguments with `DisallowUnknownFields`. A call that returns text and no tool call is an error that names the step. A decode error names the step and the field.

The json_object branch stays until Plan C's last step names an answer type, and Plan C deletes it with `TestNoJSONMode` (`chatPayload` has no `response_format`).

The worked example, the screening verdict (Plan C writes the descriptions):

```go
type ScreeningAnswer struct {
	Verdict string   `json:"verdict" enum:"clear,suspect" desc:"suspect when an agent must not act on the issue"`
	Reasons []string `json:"reasons" max:"screenReasons" item:"screenReason" desc:"one line each"`
}
// init: prompts.RegisterLimit("screenReasons", maxScreenReasons); prompts.RegisterAnswer[ScreeningAnswer]("screening")
```

- [ ] **Step 1: Write the failing tests.**
  - `TestAnswerToolSchema`: for `T{Verdict string; Reasons []string; Note string \`json:"note,omitempty"\`}` with the tags above, `required` equals `["verdict","reasons"]`, `additionalProperties` is false, `verdict.enum` equals `["clear","suspect"]`, `reasons.maxItems` equals the registered limit and each item's `maxLength` the item limit.
  - `TestAnswerToolRefusesWhatItCannotExpress`: a pointer field, a map field and an untagged exported field each panic naming the field. `TestWithEnumReplacesOneSet`: the copy changes, the original does not. `TestRegisterLimitDuplicatePanics`.
  - `TestAnswerSendsAForcedTool` (`factoryd`): a fake gateway records the request. `tools[0].function.name == "answer"`, `tool_choice` equals `ForcedToolChoice("answer")`, no `response_format`, and the user message is the input JSON with no `The input, as JSON:` lead.
  - `TestAnswerReturnsTheParsedStruct`: arguments `{"verdict":"suspect","reasons":["links a lure"]}` give `{suspect [links a lure]}` and the gateway's deployment. `TestAnswerRefusesAnUnknownField`: `"extra":1` errors naming the step and `extra`. `TestAnswerWithoutAToolCallIsAnError`: plain text errors naming the step.
  - `TestAnswerCutAnswerRetriesAtLowDepth`: a first answer with `finish_reason: length` then a parsing one returns the struct, and the second request carries `reasoning_effort: low`.
  - `TestMomentAnswerSchemaFromTheGenerator`: for the four asks the check-in tests use, `decision.enum` equals `askDecisions(ask)`, `required` equals `["decision"]`, and the gate moments hold `findings` while the session and dead moments do not. Existing tests that read `momentAnswerSchema(...)["properties"]` pass unchanged.
- [ ] **Step 2: Run.** `go test ./internal/prompts/ ./internal/factoryd/ -run 'AnswerTool|WithEnum|RegisterLimit|AnswerSends|AnswerReturns|AnswerRefuses|AnswerWithout|AnswerCut|MomentAnswer'`. Expect FAIL.
- [ ] **Step 3: Implement.** Write `AnswerTool` with `reflect`: string, bool, int kinds, float64, slices, nested structs and slices of structs. Required unless `omitempty`. `desc`, `enum`, `max` and `item` as above. Move the check-in's static fields onto tagged types (`sessionAnswer` for the session and dead moments, `gateAnswer` embedding it with `findings`), add the dynamic `decision` and `repeats` sets by `WithEnum`, and make `momentAnswerSchema` return the tool's `Parameters`. Change `chatPayload` to take `*prompts.Tool`. Add `Answer[T]`.
- [ ] **Step 4: Run.** `go test -race ./...`. Expect PASS.
- [ ] **Step 5: Commit:** "prompts: an answer tool derived from a tagged struct, and a typed direct call that forces it".

Not verified: that every alias (`small`, `big`, `supervisor`) honours a forced `tool_choice`. The check-in proves it for `big`. Plan C's first step per alias is one recorded call through the gateway.

Screening and sizing run in opencode, which cannot force a tool choice. Their JSON stays parsed from the last message (`parseSizing`, `report.go:550`). A gateway tool that files the verdict, as `file_plan` does, would carry them. That is Plan C's call and it uses this generator.

## Task 9: The map shows each tool's tier and provenance, and the closing check

**Files:**
- Modify: `internal/agentdoc` (`Span` gains `Tier string`), `cmd/agentdoc/page.go:248,271`, `cmd/agentdoc/index.go`, `cmd/agentdoc/page_test.go`
- Modify (design repository): `docs/agents/*.md` regenerated, `docs/architecture.md` (the tools paragraph), `docs/agents/index.md`

**Interfaces:** `Span.Tier string` is `"core"`, `"rare"`, `"attached"` or `""` for a span that is no chat tool. Each wire tool's provenance line reads `<server> · <origin> · <bytes>`, the origin being `the harness's own text`, `text from internal/prompts/tools/<name>.md` (a plugin-replaced built-in), `the gateway's description`, or the chat tier. A page with rare tools adds a section "Behind tool_schema" with one line per rare tool. Plan A's index gains the columns `tools on the wire` and `tools behind tool_schema`.

- [ ] **Step 1: Write the failing tests.** `TestPageProvenanceNamesThePluginText`: a built-in span captured with a plugin text prints `text from internal/prompts/tools/bash.md`, one without prints `the harness's own text`. `TestPageListsRareToolsBehindToolSchema`: the project-agent page has the heading `Behind tool_schema` and 30 lines. `TestIndexPrintsToolTiers`: its row prints 47 on the wire and 30 behind. `TestEveryWireToolHasAProvenance`: no tool is unlabelled (the failure at `page.go:279`) and every chat tool has a tier.
- [ ] **Step 2: Run.** `go test ./cmd/agentdoc/`. Expect FAIL.
- [ ] **Step 3: Implement and regenerate.** `go run ./cmd/agentdoc -out <design repository>/docs/agents -policy <factory tree> -opencode <pinned binary>`. Update `docs/architecture.md` and the count lines of `docs/agents/index.md`.
- [ ] **Step 4: The closing check.** `go test -race ./...` passes. Two runs of `agentdoc` give identical bytes. The pages' tool counts equal the tables: sizing and screening 5, planner 10, prover 8, coding 17 (18 with `deployment_health`), `edit` and `write` counted as two. One real card's first request in the gateway audit has no `task`, `webfetch` or `skill`, and its `bash` text equals `bash.md`. If the text is opencode's own, the plugin does not load in the pod: apply Task 6's fallback.
- [ ] **Step 5: Commit** in both repositories: "agent map: each tool shows its tier and its text's origin, regenerated on code main <sha>".

## Not verified

- That a plugin loads in the sandbox pod under gVisor, and with `OPENCODE_DISABLE_PROJECT_CONFIG=1`. Task 1 checks host and image, Task 9 the pod.
- That screening or sizing judges as well without `bash`. An evaluation of 20 stored issues would show it.
- Which chat tools a real turn calls. The rare set is judgement from the audit. Count `tool_schema` calls per tool after a week and move any tool fetched in over one thread in ten to the core.
- That a forced `tool_choice` works on `small`.
- Token savings: words and bytes come from the captures, no tokenizer ran.
