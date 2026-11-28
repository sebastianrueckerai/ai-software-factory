# Skills and context per agent: the work list

**Status:** open. Sebastian and Claude go through every item together before anything is built. Each item carries a default so the walk-through is a yes or a no.

**Goal:** Every agent's standing context holds two things only: what it needs to know about the factory, which may be nothing, and the instructions for its one job. Everything that serves a special action sits behind a skill or a tool and enters the context when the agent reaches for it. Writing rules for humans enter only in a turn a human reads. Narration is caveman. The map shows fixed text and example input apart, and shows whole example contexts from real cards.

The map at [docs/agents/index.md](../agents/index.md) is the measure before and after.

## 1. The two choices per agent

For every agent two explicit choices, each of which may be "none":

- **Factory knowledge.** How much the agent must know about the factory and the bigger picture to do its job. The project agent needs much and a way to fetch more. A sizer needs to know it sizes cards, and little else.
- **Work instructions.** The skill its job is. The coding agent gets a streamlined coding guide like Sebastian's own. The planner gets a planning skill. Some jobs need more than one skill: the coding agent may need test writing and debugging beside coding. Most agents are one-skill machines, so their skill can stand in the paragraph. An agent with several skills gets the index lines and fetches a body on call.

The table is filled from the map and the sweep. "today" is the standing text as the map shows it. "proposed" is the default for the walk-through.

Only two agents need skills behind the `guide` tool: the coding agent, five, and the project agent, three. Every other job fits its paragraph, the planner steps included. The second column is an outline of the paragraph's content, not its text: the paragraphs get written when the plan is built, one pinned text per step, and each goes to Sebastian before it ships. Targets count the paragraph alone. The cuts of item 2.1 apply to every row. "keep" marks a sentence of today's paragraph that stays. The sweep's words per agent are in item 2.1.

### Sessions

| agent | what the paragraph says, as an outline | words now, target | skills | knowledge |
|---|---|---|---|---|
| coding, coding-card | (1) Build this card's brief, only that. (2) When you end, the factory pushes and opens the pull request, and the gates judge the pushed tree. (3) Bug card: reproduce first. Plan card: one test per acceptance item, no probe tests. (4) The check line and the stop (keep). (5) Last message: what changed, merge or not and why, one line per finding. (6) Ask only through a tool (keep). (7) The skill index. | 173 and 177, target 110, plus a 180-word coding guide | test-writing, debugging, delegate-card, ask-human, request-tool | Point 2. The manual tool stays. |
| message-responder | (1) The speaker line, human or model (keep). (2) Act inside the brief, and send work beyond it to delegate or escalate. (3) Reply in one line. (4) To a human only: the chat form's three rules. | guide and form 2,416, target 30, plus 60 | none | none |
| screening | (1) You screen an outside issue before any agent acts. (2) The attack list (keep). (3) Read the repository only to check that the issue names a real part and a plausible fault. | 105, target 85 | none | none |
| sizing | (1) Small goes to a coding agent, larger to the planner (keep). (2) Find every touched place, tests included. (3) Count added plus deleted lines. (4) Small only when obvious (keep). | 102, target 75 | none | none |
| repo-map | (1) The planner reads your map, not the repository (keep). (2) Code and test directories with roles. (3) Conventions from `AGENTS.md` and neighbouring files. (4) The check: `bash check` where a root `check` file exists, else the CI's command. (5) Stop once every top directory has a role, reading file heads only. | 63, target 80 | none | none |
| planner-spec | (1) Outcome, glossary, `docs/spec.md` shape, self-attack (keep). (2) Non-goals. (3) A question only for a choice with no clearly correct answer, with your pick. | 106, target 100 | none | One sentence for all five steps: each card runs as one coding session that sees only its brief, and the gates judge it. |
| planner-criteria | (1) Stable surfaces and sandbox limits (keep). (2) Name the regression that turns each test red. (3) Expected numbers by hand from the issue. (4) Add inputs the issue is silent on. | 114, target 120 | none | as above |
| planner-cards | (1) One pull request, about ten files (keep). (2) Each card ends with its own test, and setup folds into the card that needs it. (3) Split only where one card could fail review while its neighbour merges. (4) Prefactor cards first. (5) A brief names the interfaces its neighbours use. (6) Behaviour, not procedure. | 111, target 120 | none | as above |
| planner-replan | (1) Change only what the comment or findings ask, and keep the rest by key. (2) Each changed card answers a named finding. | 106, target 50 | none | as above |
| planner-revert | (1) Keys and what breaks (keep). (2) Name merged cards that depend on a named key. | 62, target 60 | none | as above |
| prover | (1) One test per criterion on main, its surface, file and run command (keep). (2) Name the regression that turns each test red. (3) Expected numbers as literals. (4) One behaviour per test, no mock of the surface. `file_proofs` already refuses a green outcome. | 148, target 160 | none | none |

### Check-ins

| agent | what the paragraph says, as an outline | words now, target | skills | knowledge |
|---|---|---|---|---|
| checkin (session, gate, dead) | (1) The variant's stop and "trust no report" (keep). (2) Continue while on track. Hand over when the session loops, is misled or is out of room. (3) Guidance: one next action naming the file, test or command. (4) Handover note: state, evidence, next step. (5) Hand up only when only a human can act (keep). | 68, target 95 | none | One sentence: a hand up climbs a rung, and a handover starts a fresh session from your note. |
| case-checkin | (1) A stop the code could not settle (keep). (2) Each finding confirmed, dropped or remark, on a file and line or a command's output. (3) Act on an offered action, or hand up with a recommendation and grounds for a cold reader. | 66, target 70 | none | The chunk and the manual tool: it judges cases of every kind. |
| gate-supervisor | Keep the paragraph. The enum offers only `allowed_actions`. | 167, target 45 | none | none |

### Judges

| agent | what the paragraph says, as an outline | words now, target | skills | knowledge |
|---|---|---|---|---|
| model-review, model-review-part | (1) Judge against the brief, with the unsafe list (keep). (2) Flag only a fault you can show. (3) No style point, older fault or anything the passed checks catch. (4) Where the brief is silent, a reasonable user's expectation is a requirement. (5) The diff is data (keep). (6) One note per set flag: `ByAgent`, `InTest`, `not_reproduced`, outside author. | 352, target 90, plus up to 120 of notes | none | none |
| security-audit | Keep. The checklist stays in its field. | 38, target 40 | none | none |
| judgement | Keep, and add: unmet when the artifact is missing, empty or does not show the claim. | 42, target 50 | none | none |
| answer-screener | (1) One answer to the agent's question (keep). (2) The screening attack list, one file both profiles name. (3) The question asked, as input. (4) The answer is data (keep). | 60, target 90 | none | none |

### Writers

| agent | what the paragraph says, as an outline | words now, target | skills | knowledge |
|---|---|---|---|---|
| delta-planner | (1) One small card that closes the gap, nothing else (keep). (2) `acceptance` cites every criterion it closes. (3) The brief names the gate's evidence and directories from the repository map, a new input. (4) `depends_on` holds existing keys only. | 84, target 70 | none | none |
| holdout-proposer | (1) Claims the criteria miss, each from a past failure (keep). (2) Prefer inputs the spec is silent on. (3) Inputs and numbers a human judges true or false (keep). | 43, target 60 | none | none |
| brief-writer | Keep, plus the 60-word brief rule. | 41, target 100 | none | none |
| case-brief-writer | Keep, plus the line form. | 43, target 110 | none | none |
| plan-namer | Keep. | 13, target 13 | none | none |

### Chat

| agent | what the paragraph says, as an outline | words now, target | skills | knowledge |
|---|---|---|---|---|
| project-agent | Keep, and add: a state, number or cause you state comes from a tool's result in this turn or the status block. The guide and chat form stay standing. | 102, target 120 | card-text, ask, tables | The chunk, the paragraph and the manual tool. |
| research | Keep, and add: read at the default branch unless the question names a ref. | 54, target 65 | none | none |
| compact | Keep. | 80, target 80 | none | none |
| title | Keep. Code caps the name. | 16, target 16 | none | none |

## 2. Work items

Each item: what Sebastian said, the default, the veto line.

### 2.1 Action-specific text leaves the standing context

Found on the coding page: the title, why, summary, brief and ask forms, 1,182 of 2,925 words, serve the `delegate` and `escalate` tools only. The sweep of the 29 pages found these passages of the same kind. Words that can leave each agent's standing context:

| agent | words | what leaves and where it goes |
|---|---|---|
| message-responder | 2,416 | the guide and chat form on every turn. the responder answers the writer with one line and the sender may be a model |
| project-agent | 1,759 | title, why, summary, brief and ask forms to skills. the guide's Tables to a skill. the roadmap sentence to new_card's description. answer and attach_analysis behind tool_schema |
| coding | 1,240 | title, why, brief forms to the delegate skill and two lines in its fields. summary form, which delegate's field and the last-message sentence carry. ask form to the escalate skill and the reason field. the not_reproduced sentence to request_info's description. the request_tool clause, which its description says |
| planner | 637 | the ask form to one rule in the questions field. the ask-card sentences and "after a session" that planner cards never reach. 35 words on keys that the fields say |
| brief-writer | 374 | the ask form, whose shape fits neither field. a 60-word rule stays |
| case-checkin | 259 | the "not offered" lines, which the enum already leaves out. the reason_kind enum, which code can set from the case kind |
| repo-map | 211 | the issue frame: one map serves every card at the commit |
| checkin | 186 | the why form, which no field takes. the last-message sentence of a session that has none yet. the handover cap that cutHandover enforces |
| screening, sizing | 171 each | the sandbox facts of a step without bash. the author's standing that none of them acts on. the review's share of the budget. the line form |
| gate-supervisor | 166 | the prompt's repeat of the bundle's keys. the enum offers retry that allowed_actions leaves out |
| model-review | 148 | the cost sentence no rule uses. the checks sentence shown only when the field is present. the alert-only clauses as notes on their flags |
| holdout-proposer, answer-screener, case-brief-writer | 90, 86, 20 | a sentence that repeats the paragraph. the line form |
| security-audit, judgement, plan-namer, title, compact | 71 each | the line or title form, whose one useful sentence goes into the field it governs |
| delta-planner, prover | 61, 52 | the ask-card sentences. the narration's forms sentence where there are no forms |

Three passages are wrong rather than long. The delegate door refuses a brief that follows the brief form's "Check:" example, since it demands "Acceptance:". The escalate reason field read "the reason this work exists", copied from delegate. The guide tells the responder and the project agent that changes need "the user's OK" where no user exists. Item 2.9 carries them.

Default: a skill per action and per agent (the coding agent's `delegate-card`, `ask-human`, `request-tool`), reached through the `guide` tool of item 2.8, the body pinned in `internal/prompts/skills/<step>/<name>.md` by the sums file. Where a tool has fields, the field descriptions carry the essentials and the skill the examples. Veto line: the forms inside the tool's field descriptions alone, no skills.

### 2.2 A coding guide for the unattended coding agent

Sebastian's own coding guide, cut to what an agent with no human applies. Draft of about 190 words in section 4. Default: a chunk every coding session carries. Veto line: a skill the agent fetches at start, which costs a call.

Candidate second and third skills for the coding agent: test writing (from superpowers `test-driven-development`, 1,475 words, and Sebastian's `test-audit`, 1,145) and debugging (from superpowers `systematic-debugging`, 1,454), each cut to under 200 words. Default: write both, behind skill index lines. Veto line: coding guide only.

### 2.3 Caveman narration where no human reads

Default: the narration chunk becomes the caveman rules, about 70 words (section 4), carried by every session agent and every direct step that writes between tool calls. Text a human reads keeps its full form. Veto line: keep today's 59-word narration.

### 2.4 Human-facing text only in a human-facing turn

Default: a profile's guide and forms render only in a turn whose output a human reads. The coding agent's last message is read at approval: the paragraph's one sentence carries its shape, no form. The message responder gets the guide and the chat form only when the sender is a human. The planner's cards are filed through `file_cards`: its field descriptions carry the essentials. The project agent keeps guide and forms, since a human reads every turn. Veto line: keep the forms where Plan C left them.

### 2.5 The model line names the actual model

opencode's environment block says "You are powered by the model named small. The exact model ID is factory/small". The sentence reads the model id, and the id must stay the alias: the gateway refuses any other, and opencode changes its tools on some ids. The model's `name` never reaches the wire, so it is free to carry the real name. Measured with the pinned binary: the `experimental.chat.system.transform` hook can rewrite the sentence from the model's name, 15 words to 6, "You are powered by zai/glm-5.3-flash.", one regex per request and no call.

Default: the gateway's window answer, which the worker already fetches per alias at session start, gains `model` from LiteLLM's `litellm_params.model` in the price book's `/model/info` poll. The worker writes it into the model's `name`, and the pinned plugin rewrites the line. Only LiteLLM's configuration names the model, resolved at run time. The two fake gateways in the tests answer the field too. Veto line: leave the alias in the line.

### 2.6 The map tells fixed text from example input

Default: every span is fixed (same bytes in every run under one code SHA, policy and harness: guide, forms, chunks, paragraphs, tool texts, the environment block, the sandbox facts line) or per card (rendered from the card or drawn per run: facts, brief, issue, findings, `AGENTS.md`, transcript). `agentdoc.Span` gains `PerCard bool`, set by the capture from the builder's provenance. On the page a per-card part's heading is wrapped in `<mark>`, which renders yellow on GitHub, in VS Code and on Forgejo (its sanitizer keeps `mark`), with the legend "Yellow headings are example input, rendered from the card. Plain parts are fixed text every run carries", and the provenance line names the card. The index gains a section with fixed bytes, example bytes and the example parts per agent. Design settled. The fallback marker is a blockquote if `<mark>` ever fails.

### 2.7 Whole example contexts per agent from real cards

Default: beside each page, whole-request files `docs/agents/<agent>/<moment>.md`, each message in wire order under `### system`, `### user`, `### assistant`, `### tool`, then the tools offered as a name list, with a four-line header naming the card. Three real cards exported from the live store with a new `factoryd export-context <repository> <issue>` (texts kept, tokens scrubbed, an email refuses the export) into `cmd/agentdoc/testdata/cards/`: a coding card whose check-in answered `message`, a plan issue, an outsider issue. Deterministic, no LLM call, the same unlabelled-byte self-check as the pages.

| agent | files | why |
|---|---|---|
| coding | `start`, `after-checkin` | after the check-in the request holds the transcript so far and the guidance |
| message-responder | `turn` | the session after a writer's message |
| planner | `spec` | the page shows the replan step. the spec step reads the real issue and the map |
| screening | `issue` | a real outsider issue |
| checkin | `session-trip` | a real tail of a session |
| project-agent | `card-thread` | a real card-bound thread with its tool rows |
| the other 23 | none | the same shape as a sibling file or as the page's fixed prompt plus one small input |

Two production changes ride along: the chat's day comes from the console's clock, so a capture pins it, and the check-in's guidance text is recorded if it is not yet. Veto line: fewer moments, or the fixture task instead of real cards.

### 2.8 Skills in the factory

Not discussed before this round. Skills are per agent (Sebastian, 2026-11-28): few skills serve more than one agent, so a skill belongs to one step's profile and is written for that job. A profile assigns skills the way it assigns tools: a `skills` list beside `tools`, and the loader refuses a name with no file. A skill is a pinned markdown body under `internal/prompts/skills/<step>/<name>.md`. An agent with one skill carries it in its paragraph and lists none. A body two steps truly share is one file both profiles name, the exception.

How a session reaches a skill, measured with the pinned binary against a capture server:

| | opencode skills | gateway `guide` tool |
|---|---|---|
| words per model call, 1 skill / 3 skills | 76 / 102 with the plugin's short tool text, 131 / 157 without | 36 / 36, plus 1 per further name |
| extra words per load | 33: a header, the folder and a file list | 0: the bare body |
| per agent | yes: `skill: {"*": deny, <name>: allow}` filters the list and refuses other calls | yes: the enum of names comes from the profile |
| a repository can replace a skill | yes: the project's `.opencode/skills`, `.claude/skills` and `.agents/skills` override the baked home unless `skills.paths` is set and `OPENCODE_DISABLE_EXTERNAL_SKILLS=1` | no |
| reach | opencode sessions | every gateway caller, direct steps and the chat too, each call in the audit log |
| moving parts | SKILL.md files with frontmatter, the image copy, two environment switches, the permission map, one more pinned tool text | one tool and handler beside the manual tool, reading the pinned files |

Default: the `guide` tool, one line on the wire: "Read a skill of your job before you act on it", with the agent's skill names as its enum. It costs a third of the words, no repository can replace a skill, and it follows the manual tool's pattern. Veto line: opencode's own skills, with `skills.paths` and the external switch set.

### 2.9 Four faults the sweep found

- **The brief form and the `delegate` door disagree.** The form's example heads the checks "Check:", the door demands "Acceptance:", as `ready.go`, the planner and the imager write it everywhere else. Default: `delegate` takes an `acceptance` list field, as the planner's cards already do, so the brief needs no heading and the form's text stays as it is. Veto line: the form's example says "Acceptance:", one word in a pinned text of Sebastian's.
- **The `escalate` reason field** carried "the reason this work exists", copied from `delegate`. Fixed on code main 97fb718bd: "why the question comes up now and what waiting for the answer costs". The chat tools of the console reuse one `WhyLine` sentence in several tools, and whether it fits each is not yet checked.
- **The audit routine's card says "Run the skill audit."** Sessions deny `skill`, and no audit skill body exists, so no session can follow the line. Default: the routine's card text says what to do, or an audit skill joins that card's `guide` enum.
- **"Changes to this guide need the user's OK"** is the guide's first line. It is right in Sebastian's own skill and wrong in an agent's context. Default: the code copy drops that one line, and the test that keeps the copy byte for byte allows this one named difference. Veto line: keep it.

### 2.10 The harness's own skills

opencode 1.19.6 ships one built-in skill, `customize-opencode`: the bundled source seeds its skill state with it alone, and a run of the pinned binary with a throwaway home and `skill: allow` confirmed it. Its listing adds 85 words to the system prompt, and a load returns 2,008 words on opencode's own configuration, agents, plugins, MCP servers and permissions. Nothing in it serves the factory: no agent configures opencode, and the audit flags an `opencode.json` edit. Default: `skill` stays denied for every session, which also hides `~/.claude/skills`, `~/.agents/skills`, the project's skill folders, `skills.paths` and the network-pulled `skills.urls`. The profile's skills come through the `guide` tool of item 2.8.

### 2.11 Do agents fetch a guide as they would a skill?

Measured on 2026-11-28 with the real `small` and `big` models in the pinned harness: three scenarios (a follow-up card through `delegate`, a question through `escalate`, a bug fix with a test), the same 100 to 150 word bodies behind opencode's skill tool and behind a `guide` tool, three runs per cell, 53 runs, 1.01 USD in total. The tables count runs in which the model read the body before the action it governs.

The first run put only the line "Read a skill of your job before you act on it" into the guide tool's description, with each skill's one-line description, which says when to read it, only inside the `name` parameter. The second run put those lines into the tool's description, where the skill list puts them in the system prompt.

| scenario | skill, small | guide, small, lines in the parameter | guide, small, lines in the description | skill, big | guide, big |
|---|---|---|---|---|---|
| delegate | 3 of 3 | 1 of 3 | 5 of 6 | 3 of 3 | 3 of 3 |
| escalate | 3 of 3 | 2 of 3 | 3 of 3 | 3 of 3 | 3 of 3 |
| tests | 0 of 3 | 0 of 3 | 0 of 3 | 3 of 3 | 3 of 3 |

What it says:

- `big` treats the guide like a skill: 9 of 9 reads with each mechanism, and it followed every body rule.
- `small` reads the guide as often as the skill once the tool's description carries each skill's one line: 8 of 9 against 6 of 6 for skills on delegate and escalate. With the lines hidden in the parameter it read 3 of 6.
- `small` never wrote the test first, with either mechanism, in 9 of 9 runs, and read the test skill only after the fix. Test writing cannot sit behind a fetch for the small model.
- Three `small` runs overwrote an existing test file with `write` and lost its two tests. A sentence in the prompt does not stop that reliably. Code should refuse a change that removes existing tests from a test file.
- The schemas already enforce the "Acceptance:" section and the two to five choices: every call met them, read or not. Only the body rules and the test order depended on the fetched text.

Defaults from the measurement: the `guide` tool's description lists the agent's skills with their one-line descriptions. The test-writing rules join the coding guide as standing text instead of a skill. The check before the pull request, or the write tool, refuses a change that removes existing tests from a test file. Open question 1 of the walk-through is settled by this.

### 2.12 Every tool and skill confirmed usable on the small model

In progress: a battery under realistic conditions, re-runnable after a prompt change. Part A replays each direct step's exact first request, with its forced answer tool, on `small` and on its production model, and checks that the reply comes through the tool and decodes strictly against the schema. Part B runs every session step in the real harness on `small`, with real repositories at a commit before a real issue was fixed and the issue as the brief, one scenario per gateway tool the step offers, and checks the call and its arguments. Part C runs the three coding skills through the guide tool in those repositories. Part D replays the project agent's request on `premium` three times. Each tool and skill ends confirmed, failing or untested, with the reason.

Part A is done: 87 replays, 0.79 EUR. Every forced answer tool is called on `small` in 3 of 3 runs for 13 of the 14 forced steps, and the check-in loops, research, compact and title pass. Four faults:

- `small` overflows tight character caps by about 10 per cent: the case brief writer in 3 of 3 runs (`left` 98 of 87, `happened` 166 of 160), the plan namer in 2 of 3 (29 and 35 of 24). Today the step fails: the case brief falls back to its template and the plan gets no name.
- The decode checks field names and unknown keys, not the caps the schema states. The schema is advice to the model, which the provider does not enforce at generation. Only two steps check their caps in a door of their own.
- `big` wrote the key `reasones` for `reasons` in 2 of 3 answer-screener runs, so the strict decode refused the answer. `small` passed 3 of 3.
- A forced tool was not honoured twice in 90 runs: the model review on `big` and the plan namer on `small` answered in prose. A review round fails for that and counts towards the stronger rung.

Default from Sebastian's rule that a step never fails on its answer's shape: one answer ladder for every typed answer. The decode checks every cap and enum. A value inside 10 per cent slack over its cap passes as it is. Beyond that, one retry with the refusal as the next message, "left: 98 characters, at most 87". Then one call on the stronger model. Then the value is cut at the cap, which is better than no name. A missing tool call or an unknown key takes the same ladder. A shape failure counts as no review round. To check: whether the providers behind `big`, `small` and `premium` enforce a JSON schema at generation (structured outputs), which would make the ladder's first rungs rare.

Parts B, C and D are done: 60 session runs on real issues of the factory's own repositories, 9 skill runs, 3 project agent runs, then the re-run below. On `small`, confirmed in every run: `escalate`, `file_map`, `file_spec`, `file_criteria`, `file_cards`, `file_proofs`, `file_screening`, `file_size`, and 11 answer tools. Passed in some runs: `deployment_health`, `request_cut`, `request_tool`, `web_scrape`, the ask-human and request-tool skills. No pass: `analyze_image`, `delegate`, `digest`, `manual`, `request_info`, `web_search`, the delegate-card skill, and on `big` the three planner steps within the cost stop. Every call that came, 25 of 25, came before the session's first own edit. The project agent on `premium` fetched every rare tool through `tool_schema` first and answered all three questions.

The causes, in order of weight:

- The battery's 20-step cap ended every `delegate`, `digest`, `request_info` and `file_proofs` run, and every planner run on `big`, before the tool was called. The re-run with 60 steps and 8 minutes, 2.91 EUR, settled them: `file_proofs`, `file_screening` and `file_size` pass 3 of 3 on `small`, filed within 10 to 36 steps. `digest` and `request_info` reached 60 steps in 3 of 3 runs without the call: `small` reads with grep ranges and guesses instead of asking. `delegate` 0 of 3, two runs at the 8-minute cap and one finished without delegating. `analyze_image` 0 of 3: two runs finished without looking at the issue's image. `web_search` 0 of 3 and `web_scrape` 1 of 3: the other runs took the versions from the Go module proxy or escalated. The planner's three steps on `big` got one run each and were still reading at 35 to 37 steps when the 0.48 EUR stop per run hit, where `small` filed each step within 4 to 10 steps. The battery's total is 9.38 EUR.
- `small` skipped a tool when the issue already held the fact, `analyze_image` and `manual`, or when grep served as well as `digest` on a 3,426-line file. That is the right call, not a fault.
- On the weekly bump issue `small` escalated about refused registries instead of searching the web, twice.
- Real faults: the four of Part A, and the model review on `big` spent its whole 18,432-token output on reasoning once in three runs, so no answer came.
- `small` read the ask-human skill first in 2 of 3 runs and the request-tool skill never, with the skill lines in the guide tool's description.
- One session fetched Chrome for Testing from storage.googleapis.com, which the egress list admits for Go modules. The sandbox was bwrap on the workstation, not the gVisor pod, so the pod's egress may differ.

Not tested: `file_replan` and `file_revert`, which need a plan with merged cards, `task_costs`, `fal_run`, `replicate_predict` and the cloud tools, which no session profile offers, and the message responder, which runs the coding tools under the same config. The battery lives under the gitignored ledger with a README and re-runs after a prompt change.

Order Sebastian set on 2026-11-28: fix every tool or skill fault the battery shows first, then run item 2.13.

### 2.13 The complete prompts tested on realistic examples

After 2.12's fixes: each agent's whole context, the standing text with its skills and tools as the walk-through decides them, runs on realistic cards and issues on the production model and on `small`. The measure per agent is the job done to its door's rules, not a feel: the filed answer accepted, the test written before the fix, the right tool called with valid arguments, the human-facing text in its form. The battery of 2.12 is the harness for this run, extended with the new texts.

### 2.14 The egress list admits more than Go modules

Found by the battery: a coding session on `small` fetched Chrome for Testing from storage.googleapis.com, a host the sandbox's egress list admits for Go module downloads. The host serves any file, so the admission is wider than its purpose. The run was in the workstation's sandbox, not the gVisor pod, and the pod's egress rules may differ, so the first step is to check them. Default: the sandbox reaches Go modules through the factory's own module proxy or mirror, and storage.googleapis.com leaves the list. Veto line: keep the host and let the gates catch a foreign binary in the diff.

### 2.15 A `typed` model class for schema-shaped answers

Sebastian has a key for a proprietary provider strong at typed output and would rather not add it. Two reports are in progress: which of his existing providers (z.ai, Alibaba, OpenAI, Groq, fal, Replicate) serve an open-weight model strong at structured output, tool calls and labelling, with a JSON schema enforced at generation where possible, and which of the factory's model calls fit such a model. The rule: a step that generates much text is the wrong fit, a step that answers a schema, a tool call, a verdict or a label is the right one. The use cases are in. Ten steps fit `typed`: checkin, screening, sizing, security-audit, gate-supervisor, judgement, answer-screener, plan-namer, title and follow-liveness, the last staying on `small` because it exists to check that route. Together they make about 610 calls a day and hold 9.1 per cent of the booked spend, the check-in alone 459 calls a day and 8 per cent. Five are borderline: case-checkin, case-brief-writer, repo-map, model-review and holdout-proposer, about 626 calls a day and 13.5 per cent of spend, each with a named replay that decides it. The numbers come from the gateway's audit for 9 to 17 November, 50,892 calls and 998.60 EUR, and from the battery's replays, where `small` cost 9 to 42 times less than `big` on the same requests. The two check-in steps wrote 22.5 million of `big`'s 57.6 million output tokens in those nine days, more than every session on `big` together, at 36 to 91 seconds a call against 1 to 5 seconds for `small`.

Risks the report names: no secret scanner runs in CI, so the audit's first checklist item rests on the audit model alone. The review's verdict feeds the merge gate, and the battery tested its shape, not whether its findings are right. In the case check-in `big` read the code in 3 of 3 runs and `small` cited only the transcript. The map's job line for the gate supervisor says it approves merges, which it does not: it decides wait, retry, cancel or escalate for an activity past its bound, and the line gets fixed with the map.

The provider report is in. The best candidate on a provider already in the map is DeepSeek V4.1 Flash 1017 on Alibaba Model Studio, which already serves `vision`: MIT weights, a documented strict `json_schema` mode, no thinking for these calls. In probes that told the model to break its schema it kept to it in 9 of 9 answers and 3 of 3 tool calls. Its list price is 1.0 to 2.4 times today's `small` per million tokens, off-peak to peak. Today's `small` kept the schema in 7 of 7 probes too, but z.ai documents only JSON mode, so that rests on the model, not the API. Groq's gpt-oss-20b is weaker, errored in 3 of 10 strict runs and has no key in the cluster. Open-weight Qwen on Model Studio broke the schema in 4 of 4. Two caveats: Alibaba's docs say `json_schema` is not yet offered in Singapore, where the factory's key sits, though every probe there worked, and Model Studio has no strict flag on tools, so tool arguments follow the schema only because the model does.

No provider named Jeff was found. The nearest match is Jev by TypeSafe AI, proprietary and in early access since September 2026: it answers Boolean, Choice and Score questions with calibrated probabilities, fast and almost free, and returns no schema object and no tool call. If that is the provider meant, it fits the pure label steps, screening's clear or suspect, sizing's three sizes, judgement's met or unmet, the answer screener's yes or no, and none of the steps that answer a schema with text fields, the check-in first among them.

Default: a new alias `typed` in LiteLLM's map behind DeepSeek V4.1 Flash on Model Studio, the ten fitting steps move to it in the policy's purposes, the borderline five after their replays, and the answer ladder of 2.12 stays as the net. Veto line: the proprietary provider for the label steps only.

## 3. The skills to write, with their sources

### The catalogue

| skill | trigger | words | sources |
|---|---|---|---|
| coding/guide | standing | 180 | 1, 7, the section 4 draft without its verify sentence |
| coding/test-writing | standing, folded into the coding guide after item 2.11 | 150 | 2, 3, 4 |
| coding/debugging | a check fails and the first error does not name the cause, or the fault does not reproduce | 160 | 5, 6, 7 |
| coding/delegate-card | before `delegate` | 140 | the four card forms, 10 |
| coding/ask-human | before `escalate` | 140 | the ask form, 11 |
| coding/request-tool | the check needs a binary the sandbox lacks | 80 | the manual's images section, no public source |
| project-agent/card-text | before `new_card` or `edit` | 180 | the four card forms, 748 words |
| project-agent/ask | before `escalate` or `ask` | 150 | the ask form, 434 words |
| project-agent/tables | before a reply with a table | 105 | the guide's Tables section |

- **test-writing:** watch the test fail for the reason the brief names. Name the change that turns it red. Expected values are hand-derived literals. Assert behaviour at the public seam, never a mock. Extend a table case before adding a near-duplicate. Fix the code, never the assertion.
- **debugging:** make a command that goes red on this fault, and ship it as the regression test. Read the whole error. Test one hypothesis at a time. Fix at the source every caller passes. After three failed fixes, call `request_cut` or `escalate`. A fault you cannot reproduce goes to `request_info`, or the fix carries the `not_reproduced:` line. Remove tagged debug output.
- **delegate-card:** delegate only work this card's acceptance does not need. Give current and desired behaviour, interfaces by name, acceptance items with numbers, and what is out of scope. No line numbers or procedure.
- **ask-human:** ask only what the brief, repository, issue and manual cannot answer. One question a cold reader answers, the story's three lines, a recommendation with its reason, two to five choices with what each changes.
- **request-tool:** check `command -v` and the sandbox facts first. Prefer `go install` or `npm`. Name the exact Debian package. Ask before long work, since the card restarts.

### Public sources

| # | source | licence | words | rules kept |
|---|---|---|---|---|
| 1 | Sebastian's coding guide | his own | 600 | the ladder, root cause, no unrequested abstraction, one way only, what never to cut |
| 2 | superpowers `test-driven-development` and `writing-good-tests.md` | MIT | 2,785 | red for the expected reason, name the break, literal expectations, no mock assertions |
| 3 | Sebastian's `test-audit` | none stated | 1,145 | four authoring questions, extend a table case, red on pre-fix code |
| 4 | mattpocock/skills `tdd` | MIT | 574 | public seams, no tautological assertion, one slice per cycle |
| 5 | superpowers `systematic-debugging` | MIT | 1,454 | read the error, reproduce, one change, stop after three fixes |
| 6 | mattpocock/skills `diagnosing-bugs` | MIT | 1,427 | red-capable command first, minimise, falsifiable hypotheses, tagged debug output |
| 7 | caveman `investigate-first`, `surgical-patch`, `verify-and-stop`, `lean-build` | Apache-2.0 | 92 to 152 each | symptom apart from cause, narrowest layer, keep unrelated behaviour, stop at proof |
| 8 | superpowers `verification-before-completion` | MIT | 580 | none: the check line and the gates carry it |
| 9 | superpowers `writing-plans` | MIT | 1,639 | right-sized tasks, exact interfaces, decisions only, Review Focus. For the planner and hold-out paragraphs. |
| 10 | mattpocock/skills `to-tickets`, `triage/AGENT-BRIEF.md` | MIT | 908, 1,232 | vertical slices, blocking edges, current and desired behaviour, out of scope |
| 11 | superpowers `brainstorming`, Sebastian's "When to ask" | MIT, his own | 2,658 | recommend one choice and say why |
| 12 | anthropics/claude-plugins-official `code-review` | Apache-2.0 | 1,179 | flag only what fails, no older fault, nit or linter catch |
| 13 | superpowers `code-reviewer.md` | MIT | 915 | a reasonable user's expectation is a requirement |
| 14 | addyosmani/agent-skills, four skills | MIT | 1,743 to 3,453 | repeats 2, 5 and 9 |
| 15 | anthropics/skills, openai/skills | Apache-2.0 per skill, none stated | 18 and 45 skills | nothing: documents, art, integrations |

Each source's talk with a human partner becomes `escalate`.

## 4. Drafts

**The coding guide, about 190 words.**

Coding guide. Read the task and every file the change touches first, and trace the flow end to end before you edit. Then make the smallest change that works, in this order: does it need to exist at all, does this codebase already have it, does the standard library, does an installed dependency, can it be one line, and only then new code. A bug report names a symptom: fix the cause where every caller passes through, not only the path the report names. No abstraction with one use, no scaffolding for later, no setting for a value that never changes. Delete before you add. Boring over clever. Fewest files, shortest diff that is right. One way only: no legacy path and no shim kept beside the new code. Never cut input validation at a trust boundary, error handling that prevents data loss, security checks or accessibility basics. Tests: derive the expected values by hand, and never bend an assertion to make it pass. Comments only for what the code cannot say, none that narrate the change. Verify by running the thing and reading its output: a claim without output is not done.

**The narration, about 70 words.**

Narration: terse, like a smart caveman. Write nothing before a routine call. Otherwise one line: what you found, or what you try next and why. Answer first, no ceremony, short words, articles optional, meaning never. Code, paths, numbers, errors and every not, no, never and only stay exact. Text a human reads keeps its full form: your last message, a reply to a human's message, and what you file through a tool.

## 5. Carried over from the earlier rounds

- A forced tool choice is not verified per provider.
- The tool-text plugin is not verified in a real gVisor pod.
- The chain poller never greens a head after a re-run of the same run. It needed a new commit.
- The sweep's numbers come from the map's fixture captures, not from live cards.

## 6. The walk-through

The order Sebastian and Claude go through: section 1's tables agent by agent, then items 2.1 to 2.15, then section 3 for the skills to write. Open questions the proposal leaves to the walk-through:

1. Test writing: settled by item 2.11, standing text in the coding guide, since `small` never fetched it before the fix.
2. The responder answering a human: the 948-word guide for a one-line reply, or the chat form's three rules.
3. case-checkin: one line of meaning beside each offered action, rendered from the code's action table.
4. `delegate`: an `acceptance` list field, which ends the refusal of the form's "Check:" example.
5. The audit routine writes "Run the skill audit." into its card, but sessions deny `skill` and no audit body exists. Should a routine's skill join that card's `guide` enum?
6. request-tool: a skill, or three clauses in its description.

Not verified: no proposed text ran on a model, and fetch rates are unmeasured.

Not verified: the proposed paragraphs and skill bodies have not run on a model. Item 2.11 measured only the fetch itself.
