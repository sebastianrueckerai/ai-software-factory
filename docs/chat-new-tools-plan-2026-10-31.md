# The chat's new tools: one build plan

Written 2026-10-31. Status: plan, awaiting Sebastian's OK. Nothing is
built: two first builds were unwound the same day (the digest steps, then
the date line), and what they taught is folded in below.

## The plan in one view

Five phases, each shippable alone. Phases 1 to 3 run in order, phase 4
whenever, phase 5 last, for it rides 2, 3 and 4:

1. The date line, the cheapest steal: one line and four test pins.
2. The digest purpose and the ask on the big reads, the spend cut.
3. The web door, search and scrape with the digest inside (it needs
   phase 2's Digest wrapper).
4. The repository reads, tree and grep, independent of the rest.
5. The research subagent, one mid-tier loop behind one tool, the
   biggest cut on research-shaped questions.

The full reasoning lives in the two detail plans and the survey; this
plan carries the order, the seams and what the aborted builds taught.

## Phase 1: the date line

One line on the project-now block, built per turn in code, so "today" in
the tools' date parameters is a fact:

- The build site is chat.go's system assembly:
  `t.prompt() + "\n\nThe project now:\nToday is " +
  time.Now().UTC().Format("2006-01-02") + " UTC.\n"` ahead of the status
  text.
- Four test pins hold the system message's shape today, all named by the
  aborted build: TestChatTextReply (the suffix), 
  TestChatContextNamesTheSandboxImages (three pins),
  TestChatStatusOfAProjectFactorydDoesNotWorkOn, and
  TestAcceptanceFreshContextPerTurn, whose `statusEnd` const splits in
  two with today computed at use time, a const holding no runtime value.
- One new pin, TestChatSystemNamesToday: the block contains the date
  line. The tests compute today beside the turn, so a midnight-UTC
  crossing between the two clocks is a microsecond race once a day,
  accepted.

## Phase 2: the digest purpose and the ask reads

The detail plan
([chat-digest-and-web-plan-2026-10-31.md](chat-digest-and-web-plan-2026-10-31.md))
carries the design: the purpose, the wrapper, the ask on `file`, `diff`,
`read_doc` and `session_step`, the steering line, the raw read one call
away. What the aborted build settled on top of it:

- `PurposeDigest` sits beside `PurposeCompact` in policy;
  `FactoryModel` maps a chat task's digest to Small, hard-coded;
  `Purposes` gains the name. No gateway change.
- `OperatorModel.Digest` beside `Compact`, the answer bounded at 2,048
  tokens, the ask and the content as one user message.
- `summarize_attachment` switches onto it: the label, the ask (or
  "Summarise this document.") and the document text as the one message.
  The chatGateway test fake gains a digest branch beside its title,
  compact and vision branches: it checks model small and max_tokens
  2048, records the body, serves a scripted answer as SSE.
- The ask wiring: a `withDigest(label, ask, text)` helper on `*turn`;
  the labels are `path at ref` for `file`, `the diff of task` for
  `diff`, the document's path for `read_doc`, `session N of task` for
  `session_step`. `toolInput` already holds the `ask` field.
- Replay, refined by the build: an `asked(args)` helper reads a row's
  recorded arguments, and the elision check gains `&& !asked(...)`. An
  asked read's answer stays whole in replay, a plain read elides as
  today. No priced flag: these calls cost nothing.
- Tests, named by the build: TestChatFileAskDigests through the reads
  rig (one digest call, its content holding the ask and the text, the
  thread holding only the labelled answer), TestChatReplayKeepsAskedReads
  Whole seeding two rows (the plain read elides, the asked read stays
  whole), and lighter pins for the other three tools' ask wiring.

## Phase 3: the web door

The detail plan carries the settled seams: the gateway's Firecrawl
connector and per-credit holds, the factoryd shared token on the
factory-task header as a sibling of the completions door (the `/mcp`
door admits sandbox JWTs only), the caps in a new `chat.tools` map on
the chat block (a class named `chat` is refused among the capability
classes), `DefaultChat` shipping tools empty because a paid tool listed
in policy must carry the Firecrawl prices, the console's nil-gated Web
interface beside the operator model, `web_search` answering at most ten
addresses raw, `web_scrape` digesting through phase 2's wrapper so the
page never enters the thread, and both names joining `policy.ChatTools`
and the access floor with the reads.

## Phase 4: tree and grep

The detail plan
([chat-repo-reads-plan-2026-10-31.md](chat-repo-reads-plan-2026-10-31.md))
designs both: `tree` as one recursive git-trees call, one line a file,
cut at 500; `grep` as one archive call plus in-memory scanning with
every bound named in the answer. No shell anywhere: the model names a
ref, a path prefix and a pattern, fixed Go does the rest.

## Phase 5: the research subagent

One tool on the premium menu, `research(question)`, and behind it one
bounded loop on the mid tier (Sebastian's example: a GPT-5.3-class
model). The premium thread sees only the report. One tool, not one for
the codebase and one for the web: a real question spans both, the
caller cannot know in advance where the answer lives, and the
researcher's own tool schemas ride its own calls, so the split would
spend a second menu slot and buy nothing.

- The loop runs in the console process. The researcher drives the same
  reads the chat has: `tree`, `grep`, `file` and `read_doc` (phase 4
  and the standing reads), `web_search` and `web_scrape` (phase 3),
  and phase 2's digest wrapper on big reads and pages. No sandbox, no
  new credentials: repository reads ride the member token as `file`
  does, the web rides the chat task's Firecrawl holds, and the agent
  runs no code.
- Routing like digest's: `FactoryModel` maps a chat task's research to
  the class below premium (big today), hard-coded, no policy knob.
- Bounds in code, not the prompt: at most 12 steps and 5 minutes of
  wall time (starting points, tuned from live use), credits under the
  chat.tools holds, the report cut at 2,048 tokens. A bound's refusal
  names the stop and the fitting action: the narrower question, or one
  direct read of the trail's best address.
- The loop's history is the scratchpad. Named scratchpads wait for a
  real question that hits the step cap.
- The report: findings, then sources (path at ref, url), then open
  questions. It enters the thread whole, and replay keeps it whole,
  the asked-read rule's shape. The builder settles the mechanism:
  `research` outside `isRead`, or the keep-whole rule on it.
- The trail is recorded beside the thread, every step, call and
  answer, for the human's audit. Judgement stays premium: the chat
  model judges the report and may check a load-bearing claim with one
  direct read.
- The premium menu keeps the direct tools: one grep is one call, a
  subagent for it is latency. The prompt gains one steering line, and
  `research` joins `policy.ChatTools`, the manual and the access-table
  floor with the reads.
- Seams: the chatGateway fake gains a research branch beside its
  title, compact, vision and digest branches. The chat stream's write
  deadline needs the keepalive against a call that runs minutes.

## No shell for the factory agent

Sebastian, 2026-10-31: no shell for now, "lets see how far we get
without a shell and hence a coding sandbox for the factory agent". The
research sandbox of
[chat-research-design-2026-10-19.md](chat-research-design-2026-10-19.md),
a pod with a shell, was approved that day and never built. It is
deferred without a date. The subagent takes its first rung, the
questions that need reading and searching. The pod stays the second
rung, the questions that need code run (build, measure), and the
decision comes back when a real question asks for it. The `research`
name moves to the subagent; the pod takes another if it lands.

## What the aborted builds taught

- The date line touches four test pins in three files, listed in phase
  1. The acceptance suite pins the system message's exact end, so any
  system-prompt change reaches it.
- The digest work needs a digest branch in the chatGateway fake before
  any chat test can ride it; the reads rig's `reads` helper (one
  tool-call reply, then "Read.") carries the rest.
- The replay rule refined from a priced flag to asked-awareness, as
  phase 2 records.
- Nothing else: neither build touched the gateway or policy code beyond
  the purpose constant, and both were fully unwound.

## Non-goals

The folds of the survey
([chat-tools-survey-2026-10-31.md](chat-tools-survey-2026-10-31.md))
are not in this plan: they reshape old tools, they add none, and they
wait for their own OK. The detail plans' other non-goals stand: no chat
model change, no outline view, and no shell anywhere, in the console or
a pod, per the ruling above.

## Sources

Sebastian 2026-10-31 ("I still only want a PLAN", twice; the two detail
plans' asks; the research ask, "use the mid tier model to research a
question", one general tool agreed in conversation; "No shell for the
agent for now"). The detail plans and the survey, this repository, and
chat-research-design-2026-10-19, whose pod the ruling defers. Roadmap
300 (the digest pattern) and 306 (the repository reads). The aborted
builds of 2026-10-31, unwound the same day, their findings recorded
above.
