# What other harnesses hand their agents: a survey for the factory chat

Written 2026-10-31, on Sebastian's ask: survey the standard tools of other
chats and harnesses, find what the factory chat can steal for its eight
jobs, and find folds so the tool menu stops polluting the context. Status:
survey and recommendations, nothing built.

## What the survey found

Steal three things, one already planned: the repository's own shape (a
tree and a text search, roadmap 306's designed reads, their standard form
confirmed by every coding harness in the field), today's date on the
project-now line, and the web door (chat-digest-and-web-plan-2026-10-31).
Nothing else: the chat's 70 tools already cover its eight jobs further
than the field goes. It offers per-tool confirm proposals, watches with
wake chains and a five-part escalate, shapes other harnesses have only in
part.

Fold six families and the menu falls from 70 tools to 54, with every
console action still a tool call. The registry block is 584 lines
(chat_tools.go, line 1129 on), and every offered schema rides every model
call of a turn, roughly 4,000 tokens a call (the block holds 35 KB of
schema text). Both vendors' tool-use guidance says the same thing: fewer
tools with precise descriptions beat many thin ones.

## The field

Four groups cover everything the corpus and field knowledge show.

Coding CLIs and IDE agents (Claude Code, Cursor, Cline, Aider, goose,
opencode, the OpenAI Agents SDK) converge on one core: list the codebase,
read a file, search text, edit a file, run a command, fetch the web, ask
the human a structured question, keep a task list. Cline's report lists
the read-only core exactly (read_file, list_files, search_files,
list_code_definition_names). opencode adds a structured `question`. The
OpenAI Agents SDK ships only ShellTool and ApplyPatchTool built in and
leaves the rest to the builder.

Autonomous agents (Devin, Manus, OpenHands, SWE-agent) add a browser and
a planner over the same core. SWE-agent's bundles are edit, search and a
web browser. The most interesting find is OpenAI Symphony: its tracker
tools (linear_graphql, github_api) run host-side, the model only names
the call and the secret never enters the sandbox. That is the factory's
gateway tool door, already the shape of the planned web door.

Memory harnesses (the agent-memory report) carry Letta's editable memory
blocks and claude-mem's three-layer recall: a cheap search, then a
timeline, then full detail on demand. The chat already has that ladder:
chat_search over threads, session_search over sessions, session, then
session_step.

Catalogue harnesses (composio) put thousands of tools behind meta-tools:
search the catalogue, authorize, execute. The anti-pollution extreme. The
factory's manual (the system tool) is the same idea in text, and after
the folds it stays small enough not to need a catalogue tool.

## The standard core, and where the chat stands

The table answers one question: which of the standard tools does the chat
have?

| Standard tool | Shape in the field | The chat's standing |
| --- | --- | --- |
| List the codebase | tree or map (Cline list_files, Aider's repo map, claude-mem's outline) | missing, roadmap 306 |
| Read a file | every harness | `file`, exact path and ref |
| Search text | grep, every coding harness | missing, roadmap 306 |
| Edit a file | every coding harness | `write_doc` inside the four roots, by ruling the chat changes no code file |
| Run code | shell, every coding harness | ruled out in the console, the sandbox owns it |
| Web | fetch and search, near universal | planned, the web door |
| Plan or task list | Claude Code, Codex, Manus, OpenHands | the board and card plans are the plan surface, the pad's State section holds a turn chain |
| Ask the human, structured | AskUserQuestion, opencode question, Cline ask_followup_question | `ask` and `escalate`, richer: five parts and choices |
| Memory notes | Letta blocks, Gemini save_memory | the pad, one per project, its shape ruled by the pad survey |
| Recall its own past | claude-mem's three layers, Letta's conversation search | `chat_search` over threads, `session_search` over sessions |
| Look at an image | several | `analyze_image` |
| Browser | Devin, Manus, OpenHands, goose peekaboo | none by design, the reads are the console |
| Today's date | passed in context by most harnesses | missing, the steal below |

## Steals

The repository's own shape, two reads:

- `tree` (ref, path prefix): one line a file, path and size. Aider's repo
  map and Cline's list_files are the standard forms. The jobs survey's
  live failure is on record: a session agent spent four calls guessing at
  a plan path that sat outside every root. A tree ends the guessing.
- `grep` (pattern, ref): search the repository's text. Every coding
  harness has it. Claude-mem's outline and Cline's
  list_code_definition_names suggest a third view later (functions per
  file), one kind on the tree tool rather than its own tool.

Both belong to roadmap 306's files build. This survey endorses the
shapes, it does not design them.

Today's date: one line on the project-now block ("Today is 2026-10-31
UTC"), built per turn in code. The chat's model reads timestamps in
results but never learns today, so "default today" on the history dates
and the "min ago" lines rest on inference.

The web door: already planned in
[chat-digest-and-web-plan-2026-10-31.md](chat-digest-and-web-plan-2026-10-31.md).

What not to steal, though the field has it: browser and screen tools (the
reads are the console), auto-extracted memory (nothing reads the pad by
ruling), a composio-style catalogue (70 known tools need none),
symphony's host-side tracker tools (the gateway door is the factory's own
shape already).

## Folds

The menu's weight is the reason to fold: 70 offered schemas ride every
model call, and the vendors' guidance favours a small, precise menu. Each
fold below stays inside one
noun, keeps every console action a tool call (the parity ruling) and
keeps each kind's refusal and confirm behaviour.

- The nine project pages into one `page(kind)` read: board, history,
  costs, ci, alerts, resources, settings, policy, project_images. Each
  kind keeps its filters (costs' by, ci's ref and sha, alerts' state,
  history's n). Nine schemas become one, and the digest plan's ask
  parameter lands here too.
- The four session reads into one `session(task_id, view)` read:
  outcome, steps list, one step, search. Claude-mem's three-layer recall
  is the same ladder in one surface.
- `set_summary` and `set_accent` into `edit`, which already sets title
  and body: edit gains summary and accent, each keeping its own inverse.
- `board_view_reset` into `board_view` (a reset flag).
- `unwatch_card` into `watch_card` (an off flag).
- The resource pair into one `resource` tool (a release flag).

Six folds take the menu from 70 to 54. Two borderlines follow if the
builder likes them: `github_sync` into the export's family as a
direction, and the four routine tools into one `routine(action, ...)`
keyed on name, for 50. `ask` and `escalate` stay separate: escalate's
five-part shape is a UX conversation decision, not an accident.

One wrinkle must be built, not prompted: confirm is by tool name today
(chat.confirm in policy), and set_summary and set_accent run unconfirmed
while edit is confirmed. Folded, the confirm check must read the changed
fields from the call's arguments, which the proposal already carries.
The parity test's mapping stays one-to-one, a console route to a kind.
The manual and the prompt's steering lines name the folds.

The anti-fold: one `read` for all twenty reads and one `act` for all
forty writes would take the menu to two and give back what the per-noun
tools carry. Each name is the instruction (the factory's own principle:
the tool carries the rule), confirm and refusal stay per action, and the
one schema becomes a union of twenty shapes the model reads anyway. The
noun families are the right grain.

## Left to the builder

- The folded names and kinds, the confirm-on-fields check, the parity
  test's new mapping, and the manual's wording.
- The two 306 reads' exact schemas: they belong to roadmap 306's build.
- The date line's wording and place on the project-now block.

## Sources

The market-research corpus: market-research/projects/cline,
swe-agent, goose, opencode, composio, openai-agents-sdk and
openai-symphony (report.md each), and market-research/projects/
agent-memory (claude-mem and letta inventories). Field knowledge for
Claude Code, Cursor, Aider, ChatGPT's agent tools, Gemini CLI, Devin,
Manus and OpenHands, whose reports carry no tool lists. The jobs survey
and the pad survey, two agent notes of 2026-10-31, folded into the
digest plan. The tool registry: internal/console/chat_tools.go, the
tools block from line 1129, 70 tools.
