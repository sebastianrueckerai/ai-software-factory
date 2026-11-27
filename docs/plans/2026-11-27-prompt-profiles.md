# Prompt profiles: one place that decides what enters an agent's context

**Status:** open. It waits for Sebastian's go.

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to build this plan task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Every text that enters an agent's context comes from one closed builder, driven by one profile file per step. The harness switches for each session are generated from the same profile. A text change needs Sebastian.

**Architecture:** A new package `internal/prompts` holds the profile files, the reusable chunks, the step paragraphs and `Build`. `Build` returns a `Prompt`, a type only `Build` can make. Every transport takes a `Prompt`. `SessionConfig` turns a profile into opencode's `prompt`, `permission` and environment. A sums file pins every text, a budget test pins every size, and a new merge class `prompts` sends every change under the two text directories to a human card that only Sebastian approves.

**Tech Stack:** Go as the code repository pins it, `gopkg.in/yaml.v3` (strict decode, as `internal/policy/tree.go:383`), `embed`, `testing/fstest`, and the policy YAML of the infra repository.

**Spec:** [2026-11-27-prompts-carried-by-construction.md](2026-11-27-prompts-carried-by-construction.md), section "How it stays this way", and the decisions in this plan. Plan B ([2026-11-27-tools-per-agent.md](2026-11-27-tools-per-agent.md)) sets the tool lists. Plan C ([2026-11-27-each-agent-gets-its-job.md](2026-11-27-each-agent-gets-its-job.md)) sets each step's content. This plan builds neither.

All code paths and lines are in `ai-software-factory-code` at main `9e84a5260`, unless named. Infra lines are at `e22ba606`.

## What this plan builds and what it leaves

It builds the configuration model and the machinery. It moves no rule out of any prompt and sets no tool list. Each of the 31 steps gets a profile that reproduces today's behaviour: its forms leave the prompt string and enter the profile, its tool lists copy the map page of its agent, and its text stays in its facts renderer. Plan C moves that text into paragraphs, chunks and answer tools, and sets each budget lower. Plan B edits the tool lists.

Three things change at once, because the owner decided them: the harness preamble is replaced, the skill tool and list go, and the title call goes.

## Decisions, with the reason

1. **Profiles are YAML files in the code repository**, `internal/prompts/profiles/<step>.yaml`, one per step. A step is one agent in one job: the check-in's three moments are three steps, and the model review's two prompts are two. Files are strictly decoded and an unknown key is refused. They are not in the live policy tree. A project does not choose them, they must be pinned to the code that reads them, and the merge class guards the directory.
2. **A profile holds only choices.** What is the same for every step is Go: the preamble is always replaced, the skill tool and list are always off, the title call is always off, and the question and plan switches are always denied (`runDenies`, `internal/factoryd/opencode.go:274`).
3. **One closed builder.** `Prompt` has an unexported field. Go converts a literal to a named string type, so a string type would not close the door. Only `Build` makes a `Prompt`, and the transports take `Prompt`.
4. **Hash pins.** The guide file, each form, each chunk and each paragraph has its sha256 in a committed sums file. A text change needs the new sum in the same commit, so review sees it.
5. **Sizes are tests.** A budget per step, a cap of 250 words and one paragraph per step paragraph.
6. **The merge class** `prompts` carries a new key `approvers`, because `controller` is an approver of every project and can press the merge button today. With `approvers: [sebastian]` on the class, only he can.
7. **The agent map** prints the profile and the words by part for each agent, so growth shows in every regeneration's diff.
8. **The guide file is his skill file's body, byte for byte.** The code copy's additions go, except two reference bullets of its cold-reader section. They join the chat form. His veto line: "they stay out".

## Facts about opencode 1.19.6 this plan relies on

Verified against the pinned binary with a local server that captured each first request. No sandbox session ran.

| setting | result |
|---|---|
| `agent.<name>.prompt` | replaces the 1,450-word preamble. The system prompt fell from 1,531 to 139 words. The 49-word environment block stays. |
| `permission.<tool>: deny` | removes the tool. `edit: deny` removes `edit` and `write`. A pattern deny keeps the tool. |
| `permission."factory-tools_<name>": deny` | removes one gateway tool from the list of that process. Wildcards work. |
| `permission.skill: deny` | removes the tool and the 85-word skill list. |
| `permission.task: deny` | removes delegation. `agent.general.disable` leaves a useless 422-word `task` tool. |
| `agent.title.disable: true` | no title request. The title call carried the whole brief, about 4,000 input tokens per session. |
| `OPENCODE_DISABLE_PROJECT_CONFIG=1` | stops loading the repository's `AGENTS.md`, `opencode.json`, `.opencode/` and plugins for that process. |
| v2 config keys | do not work on 1.19.6. `permissions` stops the start. Use v1 keys only. |
| nested `AGENTS.md` | still injected after a `read`. No switch stops it. |
| plugin hooks | `experimental.chat.system.transform` and `tool.definition` exist. Plan B decides on them. |

The factory writes one `OPENCODE_CONFIG_CONTENT` per session process (`internal/factoryd/opencode.go:214`), so a per-process setting is a per-session setting. The built-in tools cost 2,844 words per session. The AGENTS.md of the repository costs 45 words in the fixture and 920 in the ts-go template.

## Interfaces

Plans B and C consume this block. A change to it is a change to those plans.

### The profile

```go
package prompts

// Profile is one step's choices: what enters its context and what it may call.
type Profile struct {
	Step        string   `yaml:"step"`         // the step's id, equal to the file name
	Purpose     string   `yaml:"purpose"`      // a policy.Purposes entry, or PurposeSession
	Reader      string   `yaml:"reader"`       // ReaderHuman, ReaderModel or ReaderCode
	Guide       bool     `yaml:"guide"`        // Sebastian's whole guide
	Forms       []string `yaml:"forms"`        // writingguide form names, in output order
	Chunks      []string `yaml:"chunks"`       // names of chunks/<name>.md, in output order
	Paragraph   string   `yaml:"paragraph"`    // name of steps/<name>.md, "" for none
	Facts       string   `yaml:"facts"`        // the registered renderer
	Answer      string   `yaml:"answer"`       // the registered answer type, "" for none
	Tools       Tools    `yaml:"tools"`
	AgentsMD    bool     `yaml:"agents_md"`    // the harness loads the repository's AGENTS.md
	BudgetWords int      `yaml:"budget_words"` // the most words the step's fixture prompt holds
}

// Tools are the tools a step may use. Every list is complete: a tool not
// named is not offered.
type Tools struct {
	Builtin []string `yaml:"builtin"` // a subset of BuiltinTools. Non-empty marks a harness session.
	Gateway []string `yaml:"gateway"` // a subset of policy.PaidTools and policy.FreeTools
	Chat    []string `yaml:"chat"`    // console chat tool names, for the project agent and research
}

const (
	ReaderHuman = "human" // a human reads the output: guide or forms are required
	ReaderModel = "model" // another model reads it: no guide, no forms
	ReaderCode  = "code"  // code parses it: no guide, no forms
	PurposeSession = "session" // the purpose of a step the harness runs
)

// BuiltinTools are opencode's built-in tools a profile can keep. `edit`
// stands for edit and write, which one permission switches. skill is
// always off and is not listed.
var BuiltinTools = []string{"bash", "edit", "glob", "grep", "read", "task", "todowrite", "webfetch"}
```

Rules `load` enforces, each with a test:

- `step` equals the file name. `purpose`, `reader`, `facts` and `budget_words` are set.
- A `human` reader has `guide` or at least one form. A `model` or `code` reader has neither.
- Every form, chunk and paragraph name resolves to a file. No list repeats a name.
- Every `builtin` name is in `BuiltinTools`. Every `gateway` name is a policy tool.
- `gateway` and `agents_md: true` need a non-empty `builtin`. `chat` needs an empty `builtin`.

A profile has no key for a value that never changes. The answer type and the tool lists may grow in Plan B and Plan C. Each says so in its own plan.

### One example

`internal/prompts/profiles/sizing.yaml`, as this plan ships it. Plan C trims it.

```yaml
step: sizing
purpose: session
reader: human
guide: false
forms: [line]
chunks: [factory]
paragraph: ""
facts: sizing
answer: ""
tools:
  builtin: [bash, edit, glob, grep, read, task, todowrite, webfetch]
  gateway: [analyze_image, digest, escalate, manual, request_info, web_scrape, web_search]
  chat: []
agents_md: true
budget_words: 0   # Task 4 writes the fixture's measured words here
```

### The builder

```go
// Prompt is every text a step puts into a context. Only Build makes one.
type Prompt struct {
	step, purpose   string
	standing, facts string
	parts           Parts
}

// Parts are the words of each part, whitespace-separated.
type Parts struct{ Guide, Forms, Chunks, Paragraph, Facts int }

func (p Parts) Total() int

// Build joins, in this order, each part separated by one blank line: the
// guide if set, the forms, the chunks, the paragraph, the rendered facts.
// A nil facts renders nothing. A facts value of the wrong type is an error.
func Build(step string, facts any) (Prompt, error)

func (p Prompt) Step() string
func (p Prompt) Purpose() string
func (p Prompt) Standing() string // guide, forms, chunks and paragraph: what a session carries as its system prompt
func (p Prompt) Facts() string    // the rendered facts: what a session carries as its first turn
func (p Prompt) Text() string     // Standing, then Facts: what a direct call sends as its system text
func (p Prompt) Parts() Parts

// RegisterFacts names a typed renderer. A renderer prints values and
// conditions. It is called at init and panics on a duplicate name.
func RegisterFacts[T any](name string, render func(T) (string, error))

// RegisterStep names a step's model-call sites, as the walk names them,
// and its fixture: the example facts the agent map and the budget test build with.
func RegisterStep(step string, calls []string, fixture any)

// Profiles returns every profile, sorted by step.
func Profiles() []Profile
func Registered() []Registration // step, calls, fixture
```

### The session settings

```go
// SessionConfig is the opencode config fragment for harness step: agent.build.prompt
// (the step's Standing) and permission, with a deny for every BuiltinTools entry
// the profile lacks and for every factory-tools_<tool> over policy.PaidTools and
// policy.FreeTools the profile lacks.
func SessionConfig(step string) (map[string]any, error)

// SessionEnv is the process environment: OPENCODE_DISABLE_PROJECT_CONFIG=1
// when the profile has agents_md false.
func SessionEnv(step string) ([]string, error)
```

The owner asked for `SessionConfig(step string) map[string]any`. A map cannot carry the process environment and `Build` can fail, so the environment has its own function and both return an error.

## Global Constraints

- No backward compatibility. Each task deletes the code it replaces. No second path stays.
- Comments only for what code cannot say. No change narration.
- Tests hand-derive their expectations. No assertion is tweaked to pass.
- No text of an existing step changes in this plan, except where a task says so. A move of the forms from the end of a prompt to the front is the only reorder.
- Every text file under `internal/prompts/chunks`, `internal/prompts/steps`, `internal/writingguide/forms` and the guide has its sum in `internal/prompts/texts.sha256`.
- Run `go test -race ./...` in the code repository before each commit. Commit to `master` and push, as the project's workflow says.

## Review Focus

- `Prompt` really is closed: no exported field, no constructor but `Build`, and no transport left that takes a `string` of our text.
- The 31 steps keep today's tool sets and today's text. Only the preamble, the skill list and the title call go.
- `approvers` on a risk class is read on both merge paths, not one.
- The sums file lists every text file, and a missing, extra or changed file fails.

## Task 1: The guide is his body, and the chat form takes two bullets

**Files:**
- Modify: `internal/writingguide/writing-guide.md`
- Modify: `internal/writingguide/forms/chat.md`
- Modify: `internal/writingguide/forms_test.go:30`
- Modify (design repository): `docs/writing-guide.md`

**Interfaces:** none new.

- [ ] **Step 1: Write the failing test.** In `internal/writingguide/forms_test.go` replace the assertion at line 30 (`HasPrefix(For(JobChat), "# The writing guide\n")`) with `TestChatFormCarriesTheReferenceBullets`: `For(JobChat)` contains `Explain each reference at its first use and link it.` and `Never name a thing that no reader can open`. Add `TestGuideHasNoAdditions`: `Guide` does not contain `writingguide.For`, `A human is a human`, `Readers, references and titles` or `the owner's OK`, and starts with `**Changes to this guide need the user's OK.**`.
- [ ] **Step 2: Run it.** `go test ./internal/writingguide/ -run 'TestChatForm|TestGuideHas'`. Expect FAIL on both.
- [ ] **Step 3: Implement.** Replace `writing-guide.md` with the body of `~/.claude/skills/ste-writing/SKILL.md` after its front matter, byte for byte (`awk 'f{print} /^---$/{n++; if(n==2)f=1}'`, then drop the one blank line the awk leaves). Check with `diff <(sed '1,/^---$/d' ...)`. Append to `forms/chat.md` the second and third bullets of the code copy's section "Readers, references and titles" (the bullets "Explain each reference at its first use and link it." and "Never name a thing that no reader can open"), as 91 words, word for word. In the design repository replace `docs/writing-guide.md` with one paragraph that says the guide is the body of Sebastian's skill file, lives at `internal/writingguide/writing-guide.md` in the code repository, and has eight forms beside it. It names no rule.
- [ ] **Step 4: Run.** `go test ./internal/writingguide/`. Expect PASS.
- [ ] **Step 5: Commit** in both repositories: "writing guide: the code copy is Sebastian's body, and the chat form carries two reference bullets".

Veto line: the two bullets stay out. Then drop the first test of Step 1 and the bullets of Step 3.

## Task 2: The profile loader, the builder and the registries

**Files:**
- Create: `internal/prompts/profile.go`, `internal/prompts/build.go`, `internal/prompts/register.go`
- Create: `internal/prompts/profile_test.go`, `internal/prompts/build_test.go`
- Create: `internal/prompts/chunks/factory.md`
- Modify: `internal/writingguide/forms.go` (add `Form`)

**Interfaces:** the block above. Add to `writingguide`:

```go
// Form is the form file named name, trimmed, and whether it exists.
func Form(name string) (string, bool)
// FormNames are the eight form names.
var FormNames = []string{"chat", "line", "title", "why", "summary", "brief", "ask", "finding"}
```

`internal/prompts` has an unexported seam for tests: `load(fsys fs.FS, w writing) (*catalog, error)`, where `writing` is `struct{ Guide string; Form func(string) (string, bool) }`. The package's own catalog is `load(embedded, writing{writingguide.Guide, writingguide.Form})`, built once.

- [ ] **Step 1: Write the failing tests** in `profile_test.go` with `fstest.MapFS`.
  - `TestProfilesDecodeStrictly`: a profile with the key `tool_policy: x` fails with `field tool_policy not found`.
  - `TestProfileRules`: one table row per rule of the list above. Each row names the fault in its error: for example a `model` reader with `forms: [line]` fails with `step x: reader model carries forms`.
  - `TestStepNameIsTheFileName`: `profiles/a.yaml` holding `step: b` fails.
  - In `build_test.go`, `TestBuildJoinsInFixedOrder`: a catalog with guide `G`, form `line` = `L`, chunk `c` = `C`, paragraph `p` = `P` and a registered renderer returning `F`. `Text()` equals `"G\n\nL\n\nC\n\nP\n\nF"`, `Standing()` equals `"G\n\nL\n\nC\n\nP"`, `Facts()` equals `"F"` and `Parts()` equals `Parts{1,1,1,1,1}`.
  - `TestBuildNilFactsRendersNothing`: `Build(step, nil).Facts() == ""` and no renderer is called.
  - `TestBuildRefusesWrongFactsType`: facts `5` for a renderer of `string` returns an error that names the step, the type got and the type wanted.
  - `TestPromptIsClosed`: with `go/parser`, parse every `.go` file of the repository's `internal` and `cmd` trees and fail on a composite literal `prompts.Prompt{`. The unexported field already stops it at compile time. The test names the rule for a reader.
- [ ] **Step 2: Run.** `go test ./internal/prompts/`. Expect FAIL (package missing).
- [ ] **Step 3: Implement** the types, `load`, `Build`, `RegisterFacts` and `RegisterStep` as in Interfaces. Decode each profile with `yaml.NewDecoder` and `KnownFields(true)`. `Build` reads a renderer by the profile's `facts` name. `chunks/factory.md` holds one paragraph, 28 words: "You are an agent session of the AI software factory. The factory builds software from cards and checks every change with gates. The manual tool describes the rest." Plan C replaces it per step.
- [ ] **Step 4: Run.** `go test -race ./internal/prompts/ ./internal/writingguide/`. Expect PASS.
- [ ] **Step 5: Commit:** "prompts: the profile loader, the closed builder and the registries".

## Task 3: Hash pins and the paragraph cap

**Files:**
- Create: `internal/prompts/texts.sha256`
- Create: `internal/prompts/pins_test.go`

**Interfaces:** none new. The sums file has one line per text file in `sha256sum` format: `<hex>  <path from internal/>`, sorted. It covers `writingguide/writing-guide.md`, `writingguide/forms/*.md`, `prompts/chunks/*.md` and `prompts/steps/*.md`.

- [ ] **Step 1: Write the failing tests.**
  - `TestTextsArePinned`: read the sums file, hash every file of the four sets, and compare both ways. A changed file fails with `internal/writingguide/forms/line.md changed: write 3f2a…  writingguide/forms/line.md in internal/prompts/texts.sha256, and ask Sebastian`. A file with no line and a line with no file fail the same way. The test never writes the file.
  - `TestParagraphIsOneShortParagraph`: every file under `steps/` has at most 250 words and no blank line inside its trimmed text. Hand-check it with `steps/` empty at this task: the loop runs zero times. The test also runs the same rule over a `MapFS` with a 251-word file and a two-paragraph file and expects two failures.
- [ ] **Step 2: Run.** `go test ./internal/prompts/ -run 'Pinned|Paragraph'`. Expect FAIL (no sums file).
- [ ] **Step 3: Implement.** Generate the file once: `(cd internal && sha256sum writingguide/writing-guide.md writingguide/forms/*.md prompts/chunks/*.md | sort -k2) > prompts/texts.sha256`.
- [ ] **Step 4: Run.** Expect PASS. Then change one byte of `forms/line.md` and expect `TestTextsArePinned` to fail with the line to write. Restore the byte.
- [ ] **Step 5: Commit:** "prompts: every text has its sum, and a paragraph is one short paragraph".

## Task 4: Every direct step goes through a profile

This task covers the 17 factoryd steps and the 4 console steps that call a model with a system text. It is the largest. Build it step by step, each step its own commit.

The step ids:

- factoryd direct: `checkin-gate`, `checkin-session`, `checkin-dead`, `case-checkin`, `case-brief-writer`, `brief-writer`, `model-review`, `model-review-part`, `review-behaviours`, `security-audit`, `security-audit-part`, `gate-supervisor`, `delta-planner`, `holdout-proposer`, `judgement`, `answer-screener`, `plan-namer`.
- console: `project-agent`, `title`, `compact`, `research`.

**Files:**
- Create: `internal/prompts/profiles/<step>.yaml` for each id above
- Modify: `internal/factoryd/supervisor.go:367`, `internal/factoryd/operator.go:126-262`, and each call site of `Writers`
- Modify: `internal/console/chat.go:2221`, `compact.go:178`, `research.go:78`
- Delete: `internal/factoryd/writers.go`'s `Prompt` funcs (Task 5 deletes the rest)

**Interfaces:**

```go
// SupervisorModel.Chat reads purpose from the prompt.
func (m *SupervisorModel) Chat(ctx context.Context, taskID, alias string, timeout time.Duration, p prompts.Prompt, input any) (content, deployment string, err error)

// SystemMessage is the one way a chat call gets a system message.
func SystemMessage(p prompts.Prompt) OperatorMessage
```

`OperatorMessage` stays a struct with a `Content string`, because user and tool turns are model-written text.

- [ ] **Step 1: Write the failing tests.**
  - `TestChatTakesAPrompt` in `internal/factoryd/supervisor_test.go`: the fake gateway records the request. For step `plan-namer`, `Chat` sends a system message equal to `p.Text()` and purpose `title` (the profile's), with no purpose argument. Hand-derive: purpose `title` is `policy.PurposeTitle`.
  - `TestNoLiteralSystemMessage` in `internal/factoryd/operator_test.go`: parse `internal` with `go/parser` and fail on any composite literal of `OperatorMessage` with `Role: "system"` outside `SystemMessage`.
  - `TestProfileForEveryDirectStep` in `internal/console/prompts_test.go` (it imports `factoryd` and `console`, so both register): every id above has a profile, a registered renderer and a fixture, and `Build(step, fixture)` succeeds.
- [ ] **Step 2: Run.** Expect FAIL.
- [ ] **Step 3: Move the steps, in this order**, running `go test ./...` and committing after each:
  1. The forms. For each step, take the `Jobs` of its `Writers` entry (`internal/factoryd/writers.go:21-116`) into `forms:`, set `guide: true` and `forms: [chat, title, why, summary, brief, ask]` for `project-agent` (its five card forms stay in this plan, see Task 9's note), and `reader: human`. Set `reader: model` for `research`. Delete each `writingguide.For(...)` suffix from its prompt builder (`audit.go:82,86`, `namer.go:47`, `holdout.go:270`, `verdict.go:1299,1416`, `gates.go:1570`, `gatesupervisor.go:138`, `rung1.go:372`, `checkin.go:285`, `judgement.go:42`, `brief.go:350`, `brief_case.go:144`, `operator.go:230,240,250`).
  2. The renderers. Each step's remaining builder becomes `prompts.RegisterFacts[T]` with a named type `T` for its inputs. The text is unchanged. The three check-in moments share the renderer `checkin`, the two audit prompts share `audit`, and so on. `RegisterStep` carries the step's `Calls` from `Writers` and its fixture from `Writers.Prompt`.
  3. The transports. `SupervisorModel.Chat` takes the `Prompt` and drops `purpose`. `OperatorModel.Compact`, `Title` and `Research` build their system message with `SystemMessage`. `console/chat.go:2221` builds the project agent's.
  4. The budgets. Add `TestBudgets` (Step 4) with every `budget_words` at 1. Read each step's word count from its failure message and write that number into the profile.
- [ ] **Step 4: Add `TestBudgets`** to `internal/console/prompts_test.go`. For every `prompts.Registered()` entry, `Build(step, fixture)`, and fail with the step, its words and its budget when `Parts().Total() > BudgetWords`. Add `TestBudgetsAreTight`: fail when the total is under 90 percent of the budget, so a budget cannot hide room. Run: expect PASS after the budgets are set.
- [ ] **Step 5: Run** `go test -race ./...`. Expect PASS. Capture the project agent's first request in the agent map's fixture and compare its guide-and-forms block with today's: it differs only in order (guide first, then forms, then the paragraph, then the facts).
- [ ] **Step 6: Commit** each sub-step: "prompts: the forms of <steps> come from their profiles".

## Task 5: One list of steps replaces `Writers`

**Files:**
- Modify: `internal/factoryd/writers.go` (delete), `internal/factoryd/writers_test.go`, `internal/console/prompts_test.go`
- Modify: `internal/writingguide/forms.go` (delete `Job`, the `Job*` constants, `jobs` and `For`)
- Modify: `internal/writingguide/forms_test.go`

**Interfaces:** `agentOnlyCalls` (`internal/factoryd/writers_test.go:28`) becomes `noPromptCalls`, the calls that send no text of ours. It keeps today's entries without the ones that now have a step: `research`, the supervisor's guidance, the nudge, the limit note and the prover's `RunReport`.

- [ ] **Step 1: Write the failing tests** in `internal/console/prompts_test.go`.
  - `TestStepsHoldEveryModelCall`: the body of `TestWritersHoldsEveryModelCall` (`internal/factoryd/writers_test.go:60`) over `agentdoc.ModelCalls("../..")`, with `prompts.Registered()`'s calls and `noPromptCalls` as the held set. A walked call in neither fails with the message the old test had, naming `RegisterStep` and `noPromptCalls`.
  - `TestEveryStepCarriesItsForms` (the old `TestEveryWriterCarriesItsForms`, `writers_test.go:14`): for each profile with `reader: human`, `Build(step, fixture).Text()` contains `writingguide.Guide` when `guide` is set and each listed form. For each other profile it contains none of the eight forms.
  - `TestEveryProfileHasAStep`: every profile is registered and every registration has a profile.
- [ ] **Step 2: Run.** Expect FAIL.
- [ ] **Step 3: Implement.** Delete `Writers`, `Writer` and the three old tests. Delete `Job`, `For` and the constants from `writingguide`, and rewrite `TestFormsStayShort` (`forms_test.go:46`) to range over `FormNames`. Keep `TitleLine`, `WhyLine`, `SummaryLine` and `BriefLines`: doors use them.
- [ ] **Step 4: Run.** `go test -race ./...`. Expect PASS.
- [ ] **Step 5: Commit:** "prompts: one registry of steps replaces the writers list".

## Task 6: The session steps and the text pushed into sessions

This task covers the 10 steps the harness carries: `coding`, `coding-card` (a plan's card), `planner`, `prover`, `screening`, `sizing`, and the four texts pushed into a running session, `message-responder`, `supervisor-guidance`, `nudge` and `limit-note`.

**Files:**
- Create: the ten profile files, and `internal/prompts/session.go`, `internal/prompts/session_test.go`
- Modify: `internal/harness/types.go:16` (`TaskBrief` gets `Step string \`json:"step"\``), `:205`, `:210`
- Modify: `internal/factoryd/opencode.go:143,381,686,716,1067-1099`, `internal/factoryd/message.go:54,167,209,222,240`, `internal/factoryd/runner.go:3663`, `internal/factoryd/agentdocloop.go:687`
- Modify: `cmd/agent-worker/main.go:292`

**Interfaces:**

```go
// harness.Harness
Run(ctx context.Context, p prompts.Prompt, emit func(Event)) Result
Message(ctx context.Context, p prompts.Prompt) error

// the session brief builder, now closed
func objectiveText(brief harness.TaskBrief) (prompts.Prompt, error)

func buildOpencodeConfig(step, proxyURL, provider, modelID string, outputLimit, steps int, windows map[string]int, subagent string, more ...string) ([]byte, error)
```

`Run` sends `p.Facts()` as the session's first turn. `buildOpencodeConfig` merges `prompts.SessionConfig(step)` into its map and sets, for every step, `agent.title.disable = true` and `permission.skill = "deny"`. The worker reads `step` from `brief.json` and starts `opencode serve` with `prompts.SessionEnv(step)` appended to `cmd.Env` (`opencode.go:214`).

The text pushed into a session is a facts-only step with `facts: text`, a renderer registered in `prompts` for a plain `string`. `messageWorker` (`message.go:54`) takes a `Prompt`.

- [ ] **Step 1: Write the failing tests.**
  - `TestSessionConfigDeniesWhatTheProfileDrops` in `session_test.go`: a catalog with `builtin: [bash, read]`, `gateway: [digest]`, `agents_md: false`, standing text `S`. `SessionConfig` returns `agent.build.prompt == "S"`. Its `permission` holds 27 keys: `BuiltinTools` has 8 names and 2 stay, so 6 denies (`edit`, `glob`, `grep`, `task`, `todowrite`, `webfetch`). The gateway has 22 tools (4 paid, 18 free, `policy.go:1154,1254`) and 1 stays, so 21 denies of the form `factory-tools_<tool>`. 6 + 21 = 27. `SessionEnv` returns `["OPENCODE_DISABLE_PROJECT_CONFIG=1"]`. With `agents_md: true` it returns none.
  - `TestBuildOpencodeConfigHasTheConstants` in `internal/factoryd/opencode_test.go`: for step `sizing`, the JSON has `agent.title.disable` true, `permission.skill` `"deny"`, `permission.question` `"deny"`, `agent.build.prompt` equal to `Build("sizing", nil).Standing()` and no `agent.build.prompt` of any other step.
  - `TestSessionStepsKeepTheirToolSets` in `internal/console/prompts_test.go`: for each of the six session steps, `tools.gateway` equals the sorted tool names on the step's map page at this commit (sizing and screening 7, planner 8, prover 2, coding 18), and `tools.builtin` equals all of `BuiltinTools`. This pins "nothing changes" until Plan B edits it.
  - `TestSessionStepsTakeNoTextOfOurs` in `internal/factoryd/message_test.go`: `messageWorker` has a `prompts.Prompt` parameter (a `go/types` check or a compile-time assignment in the test). The three pushed-text steps have `reader: model` and no guide.
- [ ] **Step 2: Run.** Expect FAIL.
- [ ] **Step 3: Implement.** Write the ten profiles: `chunks: [factory]`, `agents_md: true`, `forms` as the old `Writers` entries had (`line` for `screening` and `sizing`, five for `coding` and `coding-card`, `chat` with `guide: true` for `message-responder`, none for `planner`'s today beyond its six, none for `prover`). Move each session guide's forms out of `guideEnd` (`opencode.go:900`), `planForms` (`plan.go:1539`), `reportGuide` and `sizingGuide` (`report.go:526,579`) and `sessionMessage` (`message.go:232`). The remaining text of each guide becomes the facts renderer of its step. `sessionMessage`'s "basics" paragraph goes, because the `factory` chunk carries its place in the system prompt. `runDenies` keeps `question`, `plan_enter` and `plan_exit`. The step reaches the worker as `TaskBrief.Step`, set where the runner builds the brief for each mode.
- [ ] **Step 4: Run** `go test -race ./...`.
- [ ] **Step 5: Evidence.** Regenerate the agent map for `sizing` with the pinned binary (the recipe in Task 9). In the new capture the system block must hold the 49-word environment block, the 28-word chunk, the `line` form and nothing of the 1,450-word preamble or the skill list, and the request must show no `skill` tool and no `webfetch` rows beyond the profile. Read both from `docs/agents/raw/sizing.json`. If any line of the preamble is in it, stop.
- [ ] **Step 6: Commit:** "prompts: the session steps take their prompt, permissions and environment from their profiles".

This task changes how six agents behave. The quality of a card without opencode's preamble has never been measured. Plan C sets the real paragraphs. Ship this task together with the first of Plan C's paragraphs, or watch the first cards of each kind before more land.

## Task 7: The merge class

**Files (code repository):**
- Modify: `internal/policy/risk.go:34-46` (add the field), `risk.go` `validate` (line 91)
- Modify: `internal/policy/risk_test.go:138` (`infraRisk`), `:170`
- Modify: `internal/console/console.go:1113`, `internal/console/actions.go:1789,3283`
- Modify (infra repository): `factory/policy.yaml:360-372`

**Interfaces:**

```go
// RiskClass
Approvers []string `yaml:"approvers,omitempty" json:"approvers"`

// Risk
func (r Risk) ApproversOf(class string) []string

// Console: the merge's approver, read beside isApprover.
func (c *Console) mergeApprover(ctx context.Context, user, repository, class string) bool
```

`isApprover` (`console.go:1113`) keeps its signature, because six other callers have no class. `mergeApprover` is true when `isApprover` is true and the class has no approvers or lists `user`.

The policy edit, in `factory/policy.yaml`, above `high` (line 361):

```yaml
    - {name: prompts, outcome: requires_approval, human: true, approvers: [sebastian]}
```

and in `risk.rules` after the `policy` rule (line 372):

```yaml
    - {class: prompts, paths: ["internal/prompts/**", "internal/writingguide/**"]}
```

The class sits above `high` and below `policy`, so a change to `factory/**` stays a `policy` change. `human: true` keeps rung 2 from approving (`internal/factoryd/actions.go:897`).

- [ ] **Step 1: Write the failing tests.**
  - `TestRiskClassApprovers` in `internal/policy/risk_test.go`: a class with `approvers: [sebastian]` and `human: false` is refused with `has approvers with human: false`. A class with `approvers: [a, a]` is refused as not distinct. A class with `approvers: ["not a login!"]` is refused. `ApproversOf("prompts")` returns `["sebastian"]` and `ApproversOf("high")` returns nil.
  - `TestClassifyPromptsPaths` (same file): with the block of `infraRisk` as updated, `Classify([]string{"internal/prompts/steps/x.md"}, 5)` is class `prompts`, and `Classify([]string{"internal/writingguide/forms/line.md", "factory/policy.yaml"}, 5)` is class `policy`, because `policy` ranks higher.
  - `TestMergeApproverReadsTheClass` in `internal/console/actions_test.go`: two users are approvers of the project. The merge spec has `RiskClass: "prompts"`. `sebastian` may approve, `controller` is refused with a message that names the class and lists its approvers. A spec with class `normal` lets both approve. Run it through both paths: `approveMerge` and the "Merge it" branch at `actions.go:1789`.
- [ ] **Step 2: Run.** Expect FAIL.
- [ ] **Step 3: Implement.** Add the field and its validation, which mirrors `project.go:735`: each name `policy.ForgejoLogin`, distinct, and `Human` set. Add `ApproversOf`. In `approveMerge` (`actions.go:3283`), after the spec is read (line 3296), refuse a user for whom `mergeApprover` is false. At the "Merge it" branch (line 1789) read `q.Spec` the same way and refuse the same way. Update `infraRisk` and the infra `factory/policy.yaml`. The copy test `TestInfraRiskIsTheCopy` (`risk_test.go:170`) runs with `INFRA_FACTORY_DIR` set to the infra repository's `factory/` and must pass.
- [ ] **Step 4: Run.** `INFRA_FACTORY_DIR=<infra>/factory go test -race ./internal/policy/ ./internal/console/`. Expect PASS.
- [ ] **Step 5: Commit** in both repositories: "policy: a risk class can name its approvers, and a change to the prompts needs Sebastian".

## Task 8: Words by part in the agent map

**Files:**
- Modify: `cmd/agentdoc/registry.go:23` (add `Steps []string` to `Agent`), `cmd/agentdoc/index.go:19-35,101-117`
- Modify: `cmd/agentdoc/index_test.go`

**Interfaces:**

```go
// Agent
Steps []string // the profile names the agent's request is built from

// indexRow
parts     prompts.Parts // the profile's words, from Build(step, fixture)
harness   int           // words of the captured request that no profile made
toolWords int           // words of the gateway and chat tools on the wire
```

The index inventory table gains the columns `profile`, `harness words`, `guide words`, `forms words`, `chunks words`, `paragraph words`, `facts words` and `tool words`. An agent with no step shows `none`. For a harness agent, `harness` is the captured system and tool words minus `Standing`'s words and minus the tools named `factory-tools_*`. For a direct agent it is zero. Tool words count a tool's description and its parameter descriptions.

- [ ] **Step 1: Write the failing test** `TestIndexPrintsWordsByPart` in `index_test.go`: a row for a fake agent with steps `["x"]` and parts `{Guide: 10, Forms: 20, Chunks: 3, Paragraph: 40, Facts: 7}` prints those five numbers in the columns beside `harness 100` and `tool words 50`. Add `TestEveryAgentNamesItsSteps`: every registry agent has a non-empty `Steps` or a `Config` or `NoPrompt` flag, and every named step is registered.
- [ ] **Step 2: Run.** Expect FAIL.
- [ ] **Step 3: Implement.** Fill `Steps` for the 31 registry agents from the step ids of Tasks 4 and 6. Compute `parts` from `prompts.Build` with the registered fixture. Compute `harness` and `toolWords` from the parsed wire body (`agentdoc.ParseBody`).
- [ ] **Step 4: Run.** `go test ./cmd/agentdoc/`. Expect PASS.
- [ ] **Step 5: Commit:** "agent map: the index prints each agent's profile and its words by part".

## Task 9: The documents, the regenerated map and the closing check

**Files (design repository):**
- Modify: `docs/agents/*.md`, `docs/agents/index.md`, `docs/agents/raw/*.json` (regenerated)
- Modify: `docs/writing-guide.md` (done in Task 1)

- [ ] **Step 1: Regenerate.** From the code repository, with infra's tree and the pinned binary: `go run ./cmd/agentdoc -out <design>/docs/agents -policy <infra>/factory -opencode <pinned binary>`. It must exit zero with no rot finding.
- [ ] **Step 2: Check the numbers.** In `docs/agents/index.md` the harness words of `sizing` fall from 4,379 to the tool words alone plus the 49-word environment block, and the six session agents' rows show a profile each. Read the `sizing` row and write down the figure. If the preamble words remain, Task 6 did not land.
- [ ] **Step 3: Check the guards.** Edit one byte of `internal/prompts/steps/` in a scratch branch and push it: the CI test `TestTextsArePinned` fails. Open a pull request that touches `internal/prompts/profiles/sizing.yaml` against a scratch project of the factory and read its class on the card: `prompts`, with `human: true`. Then press approve as `controller` through the console and expect the refusal of Task 7. Delete the scratch branch.
- [ ] **Step 4: Commit** the regenerated map: "agents: regenerated with each agent's profile and words by part on code main <sha>".

The project agent keeps its five card forms in this plan. Plan C moves them into the card tools' field descriptions, as decided in the suggestion, and drops them from the profile in the same step.

## Not verified

- No sandbox session ran any switch. The captures used a local server and the pinned binary. The first real session of each of the six agents without the preamble is the test of its quality.
- Whether a `permission` deny for `factory-tools_*` combined with a per-tool allow works was not run. This plan denies each unlisted tool by name, which was run.
- The harness reads `OPENCODE_DISABLE_PROJECT_CONFIG=1` as stopping the repository's `opencode.json` and plugins too. The pod's baked plugin directory sits in `$HOME`, which the switch does not touch. A plugin load in the pod was not run.
- `followModelAnswers` (`internal/factoryd/writers_test.go:28`) stays in `noPromptCalls`. I did not read whether its liveness question carries text of ours.
- The console hides a merge button from a user who is not an approver (`internal/console/faceview.go:248`, set at `board.go:2113`). Whether that flag must also read the class was not traced. Task 7 refuses at the action, which is the guard.
- Forgejo's own approvals whitelist on `main` is a second merge authority. This plan changes the console only.
