# The chat's cheap depth: Small digests and the web

Written 2026-10-31, from the design discussion of the same day. This file
turns the discussion into a plan: the decided parts, and what the builder
settles. Status: plan, approved by Sebastian in conversation (the digest
steps, and "the factory agent should be able to search the web"). Nothing
here is built; a first build of the digest steps was rolled back the same
day in favour of this plan.

## Why

The chat runs on the premium class: gpt-6.1-sol, pay-per-token, $2 per
million input tokens and $10 per million output (cached reads $0.10), its
month capped apart by `budget.premium_month_eur`. The big and small
classes sit on the GLM Coding Plan, where no call is billed money: tokens
and credits only. Every big thing the premium model chews through is
billed; the same chewing on small costs nothing.

Today the chat reads big things raw into its premium thread: `file` (64
KiB), `diff` (20 KiB), `session_step` (whole steps), `read_doc` (whole
files). Replay already elides earlier turns' reads, but the turn that
reads holds every byte, and a thread compacts sooner for it. The one
subagent summariser, `summarize_attachment`, runs on the chat's own
alias: built as "the subagent handoff" before the premium class existed,
it was silently captured by the switch to premium, so every document
summary is a one-shot gpt-6.1-sol call. And the chat cannot reach the web
at all: the gateway's `web_search` and `web_scrape` serve agent tasks
only.

The fix is roadmap 300's pattern at full strength: premium decides and
answers, depth comes from one-shot small calls.

## The jobs this touches

The chat has eight jobs, the jobs survey of 2026-10-31 counts. This plan
touches two of them:

- Explain and analyse. The read set (board, card, costs, ci, diff, pr,
  plan, file, the session reads) is the chat's strongest. The ask
  parameter cuts its cost and changes nothing else about it.
- Research to write good cards, the weakest job today ("writing good
  cards needs research", the design doc's own words), served only by
  exact-path reads. The web door gives it the web's half. The
  repository's half, listing and search over the project's own files, is
  roadmap 306's designed files and research tools, not this plan.

Every other gap the survey found stays as it is: show_doc (280), the
wake's thin payload (331), the phone answer path (145, 146), the
ask-attempt boundary's missing refusal branch, the fund pool's missing
setter, the metrics page without a read tool, container logs nobody
reads. This plan is spend and reach: no gate, no wake, no new refusal
branch.

One spend note beside them: the chat task's monthly cap predates the
wakes that now share it (member turns, wake turns, ask attempts, rearm
chains). Digests cut the heaviest per-turn input; the cap's own number is
a separate decision, from live data, not from here.

## The digest purpose

A new factoryd purpose, `digest`, beside `compact` and `title`:

- `FactoryModel` maps it exactly as theirs: a chat task's digest is
  Small, hard-coded, no policy knob. The gateway admits it through the
  same `FactoryModel` check every named purpose passes; Small calls carry
  credits, never euros, so no budget or cap interacts. No gateway change.
- `OperatorModel` gains a `Digest` wrapper beside `Compact`: one call,
  the ask and the content as one user message, the answer bounded like a
  summary's (compactTokens' size, not OperatorTokens').
- `summarize_attachment` moves onto it. Each summary drops from roughly
  three cents of premium tokens to free. The tool's schema, cut naming
  and priced replay stay as they are.

## The ask parameter on the big reads

`file`, `diff`, `read_doc` and `session_step` gain one optional `ask`:

- Without it, the read behaves as today.
- With it, the content goes to one digest call on Small and only the
  answer enters the thread, the cut named the way `summarize_attachment`
  names it (digest reads bounded at the read's own cap: 64 KiB for
  `file`, and so on).
- Replay keeps an asked read's answer whole, the row's recorded arguments
  carrying the ask. A plain read elides as today. No priced flag: these
  calls cost nothing, so the rule is the ask in the arguments, not a
  spend mark.
- The system prompt's steering line for attachments ("for a long
  document, summarize_attachment first and read_attachment's ranges only
  where its answer points") gains its sibling for these reads.
- The raw read stays one call away: when a digest points somewhere worth
  reading closely, premium reads the slice itself. Self-correction over
  prevention.

## The web door

The chat gains the web the agent tasks already have, through the
gateway's existing paid tools, with the digest inside from birth:

- `web_search` (query) returns addresses, not content: at most ten
  titles, urls and snippets. Small enough to enter the thread raw, the
  shape every search tool already has in the factory.
- `web_scrape` (url, ask) never lets the raw page into the thread: the
  page's text goes to one digest call on Small through the same `Digest`
  wrapper, and the answer returns, the cut named. The ask parameter is
  the read's `ask`, same rule.
- The gateway serves both to agent tasks through the Firecrawl connector
  (Scrape and Search v2), booked per credit under per-task, per-tool
  holds (requests and EUR, `classes.<class>.tools.<tool>` in policy,
  spent under `s.paid` with TakeHold and FitTool), audited like any paid
  tool call. The agent door at `/mcp` admits sandbox service-account
  JWTs only, so the chat needs its own way in: a sibling of the
  completions door's identity check, the factoryd shared token on the
  factory-task header, admitting the same two tool calls on the chat
  task's account. The caps come from a new `chat.tools` map on the chat
  block (policy and project), the same ToolCap shape a class's tools
  carry: a class named `chat` is refused among the capability classes, so
  the chat block is the one home for them.
- DefaultChat ships `tools` empty: web is opt-in, and a policy that lists
  a paid tool must carry the Firecrawl prices, so the default cannot
  name the tools it does not price. The live policy turns the door on
  with numbers.
- The console sees a Web interface beside the operator model, nil meaning
  the two tools are not offered, the way Steer, Mirrors and Routines
  gate. The two names join `policy.ChatTools` and the access-table floor
  with the reads. No new network surface: the console process talks to
  the gateway it already talks to.

## The pad keeps its shape

A digest keeps its answer in the thread. Findings that must outlive
compaction go to the pad, as today. The pad survey (2026-10-31) rules the
shape for this plan: one pad per project stays, fixed sections inside it
("State", "Findings", "Ideas") are the first rung and need no code,
because notes_write's replace form already carries them. Named slots wait
for real collisions (the cap refusal, the 3-try conflict, both visible in
transcripts). A pad per thread never: the transcript and its compaction
summary already are the per-thread memory. This plan adds no memory
surface.

## Non-goals

- A subagent that loops over tools and returns a conclusion: phase 5 of
  [chat-new-tools-plan-2026-10-31.md](chat-new-tools-plan-2026-10-31.md)
  builds it on this plan's wrapper. The one-shot digest stays this
  plan's own rung.
- Any change to the chat's own model, the premium fallback chain
  (ruling 329), or the replay elision of plain reads.
- Web tools for projects without a chat: the doors sit on the chat task.
- Every gap named under "The jobs this touches", and the chat task's
  monthly cap.

## Left to the builder

- The door's exact shape at the gateway: the route, the header check's
  placement beside the completions door's, and the audit rows' purpose
  and ref for web spend on a chat task.
- The live policy's numbers for `chat.tools` (web_search, web_scrape:
  requests and EUR per task).
- The tool schemas' one-line descriptions, and the access-table floor for
  the two tools (they sit with the reads).
- The system prompt line's exact wording.
- Test seams: the chatGateway fake gains a digest branch beside its
  title, compact and vision ones; the reads rig covers the ask on all
  four tools; a replay test pins the asked answer staying whole.

## Sources

Sebastian 2026-10-31 (the cost ask: "let it use lower grade subagents
for things like info summary"; "the factory agent should be able to
search the web"; "the rest sounds good"). The premium class, rulings 328
and 329. Roadmap 300 (documents read by tools, never from context; the
subagent summariser). The 2026-10-19 documents session (the summariser,
priced replay). chat-research-design-2026-10-19 (the context discipline
the ask parameter extends). architecture 5.7 (the operator model). The
jobs survey and the pad survey, two agent research notes of 2026-10-31,
folded into "The jobs this touches" and "The pad keeps its shape".
