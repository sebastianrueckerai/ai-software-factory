# Skills and context per agent: the work list

**Status:** open. Sebastian and Claude go through every item together before anything is built. Each item carries a default so the walk-through is a yes or a no.

**Goal:** Every agent's standing context holds two things only: what it needs to know about the factory, which may be nothing, and the instructions for its one job. Everything that serves a special action sits behind a skill or a tool and enters the context when the agent reaches for it. Writing rules for humans enter only in a turn a human reads. Narration is caveman. The map shows fixed text and example input apart, and shows whole example contexts from real cards.

The map at [docs/agents/index.md](../agents/index.md) is the measure before and after.

## 1. The two choices per agent

For every agent two explicit choices, each of which may be "none":

- **Factory knowledge.** How much the agent must know about the factory and the bigger picture to do its job. The project agent needs much and a way to fetch more. A sizer needs to know it sizes cards, and little else.
- **Work instructions.** The skill its job is. The coding agent gets a streamlined coding guide like Sebastian's own. The planner gets a planning skill. Some jobs need more than one skill: the coding agent may need test writing and debugging beside coding. Most agents are one-skill machines, so their skill can stand in the paragraph. An agent with several skills gets the index lines and fetches a body on call.

The table is filled from the map and the sweep. "today" is the standing text as the map shows it. "proposed" is the default for the walk-through.

Words are from the map. "chunk" is the 55-word factory chunk. A skill named here is fetched on call, not standing.

| agent | factory knowledge today | proposed | work instructions today | proposed | human-facing text today | proposed |
|---|---|---|---|---|---|---|
| coding, coding-card | chunk + 6 sentences of the paragraph | 2 sentences: the sandbox and that the gates judge the pushed tree | paragraph 173, no coding guide | coding guide 190 standing; skills test-writing, debugging, delegate-card, ask-human, request-tool | 5 forms, 1,182 | none standing; the last message's shape is one sentence of the paragraph |
| message-responder | as coding | none of its own | none | none: it is the same session | guide + chat form, 1,176, every turn | guide + chat form only in the turn that answers a human; none for a model's message |
| screening | chunk | none: "you screen issues" | paragraph 105 | paragraph, told what its repository read is for | line form 71 | none; one sentence in the reason field |
| sizing | chunk | none | paragraph 102 | paragraph | line form 71 | none; the reason field says it |
| repo-map | chunk + the issue frame | none; no issue frame: one map serves every card | paragraph 63 | paragraph + the check convention + a stop rule | none | none |
| planner, 6 steps | chunk + paragraph sentences | 1 sentence: the cards run as sessions and the gates judge them | paragraph 106 each | a planning skill in each step's paragraph, from superpowers writing-plans cut to the step | title, why, summary, brief, ask forms, 1,253 | the card fields' descriptions; one rule in the questions field; no forms |
| prover | chunk | none | paragraph 148 | paragraph | none | none |
| checkin | chunk | 1 sentence on rungs and the handover | paragraph 70 + statement | paragraph + how to write guidance for a model and what separates continue from handover | why form 157 | none; one sentence in the reason field for a hand-up |
| case-checkin | chunk | chunk + the manual tool: it judges cases of every kind | paragraph 66 | paragraph that says what each offered action and verdict means, not what is not offered | line form 71 | none; one sentence in the grounds field |
| model-review | none | none | paragraph 73 + review prompt | paragraph; alert-only clauses as notes keyed on their flags | 202 | none: a model and code read it |
| security-audit | none | none | paragraph 38 | paragraph | line form 71 | none; one sentence in the why field |
| gate-supervisor | none | none | paragraph 44 + 123-word prompt | paragraph; the enum carries the allowed actions | line form 71 | none; escalate and cancel reasons: one sentence in the field |
| judgement, delta-planner, holdout-proposer, answer-screener | none | none | paragraphs 39 to 60 | paragraphs; delta-planner gets the repository map; answer-screener gets the question asked | 71 to 748 | none |
| brief-writer, case-brief-writer | none | none | paragraphs 41, 43 | paragraphs | brief + why + ask forms 434; line form 71 | brief-writer keeps a 60-word brief rule; case-brief-writer keeps the line form |
| plan-namer, title | none | none | paragraphs 13, 16 | paragraphs | title form 71 | none: the field caps at 24 characters and says "a name, not a sentence" |
| project-agent | chunk + paragraph + the manual tool | as today: it needs much and fetches more | paragraph 102 | paragraph + a rule to read before stating a fact | guide + 5 forms + chat form, 2,358 | guide + chat form standing; title, why, summary, brief, ask and Tables as skills; answer and attach_analysis behind tool_schema |
| research | none | none | paragraph 54 | paragraph + the ref its tools need | none | none |
| compact | none | none | paragraph 80 | paragraph | line form 71 | none; the human sees the summary as a turn, and the paragraph says what it holds |
| digest, image-look, follow-liveness, attachment-digest, read-digest, vision | none | none | input only | input only | none | none |

## 2. Work items

Each item: what Sebastian said, the default, the veto line.

### 2.1 Action-specific text leaves the standing context

Found on the coding page: the title, why, summary, brief and ask forms, 1,182 of 2,925 words, serve the `delegate` and `escalate` tools only. The sweep of the 29 pages found these passages of the same kind. Words that can leave each agent's standing context:

| agent | words | what leaves and where it goes |
|---|---|---|
| message-responder | 2,416 | the guide and chat form on every turn; the responder answers the writer with one line and the sender may be a model |
| project-agent | 1,759 | title, why, summary, brief and ask forms to skills; the guide's Tables to a skill; the roadmap sentence to new_card's description; answer and attach_analysis behind tool_schema |
| coding | 1,240 | title, why, brief forms to the delegate skill and two lines in its fields; summary form, which delegate's field and the last-message sentence carry; ask form to the escalate skill and the reason field; the not_reproduced sentence to request_info's description; the request_tool clause, which its description says |
| planner | 637 | the ask form to one rule in the questions field; the ask-card sentences and "after a session" that planner cards never reach; 35 words on keys that the fields say |
| brief-writer | 374 | the ask form, whose shape fits neither field; a 60-word rule stays |
| case-checkin | 259 | the "not offered" lines, which the enum already leaves out; the reason_kind enum, which code can set from the case kind |
| repo-map | 211 | the issue frame: one map serves every card at the commit |
| checkin | 186 | the why form, which no field takes; the last-message sentence of a session that has none yet; the handover cap that cutHandover enforces |
| screening, sizing | 171 each | the sandbox facts of a step without bash; the author's standing that none of them acts on; the review's share of the budget; the line form |
| gate-supervisor | 166 | the prompt's repeat of the bundle's keys; the enum offers retry that allowed_actions leaves out |
| model-review | 148 | the cost sentence no rule uses; the checks sentence shown only when the field is present; the alert-only clauses as notes on their flags |
| holdout-proposer, answer-screener, case-brief-writer | 90, 86, 20 | a sentence that repeats the paragraph; the line form |
| security-audit, judgement, plan-namer, title, compact | 71 each | the line or title form, whose one useful sentence goes into the field it governs |
| delta-planner, prover | 61, 52 | the ask-card sentences; the narration's forms sentence where there are no forms |

Three passages are wrong rather than long: delegate refuses a brief that follows the brief form's "Check:" example, since it demands "Acceptance:"; escalate's reason field reads "the reason this work exists", copied from delegate; the guide tells the responder and the project agent that changes need "the user's OK" where no user exists.

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

Default: the gateway's window answer, which the worker already fetches per alias at session start, gains `model` from LiteLLM's `litellm_params.model` in the price book's `/model/info` poll; the worker writes it into the model's `name`; the pinned plugin rewrites the line. Only LiteLLM's configuration names the model, resolved at run time. The two fake gateways in the tests answer the field too. Veto line: leave the alias in the line.

### 2.6 The map tells fixed text from example input

Default: every span is fixed (same bytes in every run under one code SHA, policy and harness: guide, forms, chunks, paragraphs, tool texts, the environment block, the sandbox facts line) or per card (rendered from the card or drawn per run: facts, brief, issue, findings, `AGENTS.md`, transcript). `agentdoc.Span` gains `PerCard bool`, set by the capture from the builder's provenance. On the page a per-card part's heading is wrapped in `<mark>`, which renders yellow on GitHub, in VS Code and on Forgejo (its sanitizer keeps `mark`), with the legend "Yellow headings are example input, rendered from the card; plain parts are fixed text every run carries", and the provenance line names the card. The index gains a section with fixed bytes, example bytes and the example parts per agent. Design settled; the fallback marker is a blockquote if `<mark>` ever fails.

### 2.7 Whole example contexts per agent from real cards

Default: beside each page, whole-request files `docs/agents/<agent>/<moment>.md`, each message in wire order under `### system`, `### user`, `### assistant`, `### tool`, then the tools offered as a name list, with a four-line header naming the card. Three real cards exported from the live store with a new `factoryd export-context <repository> <issue>` (texts kept, tokens scrubbed, an email refuses the export) into `cmd/agentdoc/testdata/cards/`: a coding card whose check-in answered `message`, a plan issue, an outsider issue. Deterministic, no LLM call, the same unlabelled-byte self-check as the pages.

| agent | files | why |
|---|---|---|
| coding | `start`, `after-checkin` | after the check-in the request holds the transcript so far and the guidance |
| message-responder | `turn` | the session after a writer's message |
| planner | `spec` | the page shows the replan step; the spec step reads the real issue and the map |
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

## 3. Public skills to start from

| need | source | words | what to take |
|---|---|---|---|
| coding guide | Sebastian's global coding guide (ponytail) | about 600 | the ladder, root cause, no unrequested abstractions, one way only, what never to cut, hand-derived tests, verify by running |
| test writing | superpowers `test-driven-development`, Sebastian's `test-audit` | 1,475 and 1,145 | red first, one assertion per behaviour, expected values by hand, no assertion bent to pass |
| debugging | superpowers `systematic-debugging` | 1,454 | reproduce first, one hypothesis at a time, read the error, change one thing, prove the fix |
| planning | superpowers `writing-plans`, `brainstorming` | 1,639 and 2,658 | the spec first, each task its test, exact names, what the implementer cannot know |
| narration | caveman `SKILL.md` | 744 | the nine rules, cut to a paragraph |
| finishing | superpowers `verification-before-completion` | 580 | run the check, read the output, then stop |

## 4. Drafts

**The coding guide, about 190 words.**

Coding guide. Read the task and every file the change touches first, and trace the flow end to end before you edit. Then make the smallest change that works, in this order: does it need to exist at all, does this codebase already have it, does the standard library, does an installed dependency, can it be one line, and only then new code. A bug report names a symptom: fix the cause where every caller passes through, not only the path the report names. No abstraction with one use, no scaffolding for later, no setting for a value that never changes. Delete before you add. Boring over clever. Fewest files, shortest diff that is right. One way only: no legacy path and no shim kept beside the new code. Never cut input validation at a trust boundary, error handling that prevents data loss, security checks or accessibility basics. Tests: derive the expected values by hand, and never bend an assertion to make it pass. Comments only for what the code cannot say, none that narrate the change. Verify by running the thing and reading its output: a claim without output is not done.

**The narration, about 70 words.**

Narration: terse, like a smart caveman. Write nothing before a routine call. Otherwise one line: what you found, or what you try next and why. Answer first, no ceremony, short words, articles optional, meaning never. Code, paths, numbers, errors and every not, no, never and only stay exact. Text a human reads keeps its full form: your last message, a reply to a human's message, and what you file through a tool.

## 5. Carried over from the earlier rounds

- A forced tool choice is not verified per provider.
- The tool-text plugin is not verified in a real gVisor pod.
- The chain poller never greens a head after a re-run of the same run; it needed a new commit.
- The sweep's numbers come from the map's fixture captures, not from live cards.

## 6. The walk-through

The order Sebastian and Claude go through: section 1's table agent by agent, then items 2.1 to 2.8, then section 3 for the skills to write.
