# The agent context map: one build plan

Written 2026-10-31. Status: plan, awaiting Sebastian's OK. Nothing is
built.

## Why

Sebastian wants to judge every factory agent's starting context himself:
is it clean (no duplication, no filler, no writing guide for an agent
that never talks to a human), does it carry what the role needs and
nothing more, and where does each part come from, so a prompt edit can
be surgical. The tool delivers structure only. Every verdict stays with
him or with an LLM he hands the pages to.

## What the code says today

The code map of 2026-10-31 (18 agents) holds the facts the tool stands
on:

- One agent loop, not six. agent-worker drives a pinned opencode 1.18.32
  over its local API; coding, planner, screening, sizing, hold-out audit
  and the message responder are the same loop with a swapped guide
  string (`internal/factoryd/opencode.go`, `report.go`, `plan.go`,
  `holdout.go`).
- No prompt files exist. Every system prompt, guide and persona is a Go
  constant or builder. The one prompt-like file is the embedded
  `internal/writingguide/writing-guide.md`.
- The coding agent's system prompt is not in our repo: opencode composes
  it from its own preamble plus the repository's `AGENTS.md`. Only the
  first user turn is ours.
- Twelve agents are direct clients: factoryd and the console build
  `chat/completions` bodies in Go (check-in, model review, security
  audit, gate supervisor, verdict criteria and behaviours, delta
  planner, hold-out proposer and redrafter, answer screener, brief
  writer, the project chat, title/compact/vision).
- Nothing logs request bodies in production. The gateway's audit rows
  carry tokens and cost only.
- Offline capture exists: `TestRecordOpencodeFixture` records the real
  opencode's exact first request against a fake OpenAI server
  (`OPENCODE_RECORD_BIN`, `docs/manual/binaries.md`), and the config has
  a golden test. The direct clients' builders are pure Go.
- Two traps sit inside the prompt path: `envFit` can truncate a brief
  env var at 128 KiB, with the loss surfacing only as a `LEFT_OUT` line;
  and untrusted text sits behind random marker tags, so the literal
  request can only be rendered, never fixed as a string.

## The tool

`cmd/agentdoc` in the code repo. One offline command, deterministic, no
LLM, no cluster, no secrets:

    go run ./cmd/agentdoc -out <design repo>/docs/agents -policy <infra policy.yaml>

Per documented agent it does three things:

1. Builds the first API request through the real code. The six loop
   modes run the pinned opencode binary against the in-process fake
   OpenAI server (the record-test machinery), each with one fixed
   fixture task; the literal first POST body is captured. The direct
   clients run their real prompt builders with one fixed fixture input
   each, rendered into the exact body shape the code sends
   (`chatPayload`, the operator streaming body).
2. Labels every part. A registry names, per agent, the builders that
   make up its context (system, guide, sandbox facts, objective wrap,
   tools list, statement, fixture data). The tool runs each builder on
   the same fixture and locates its output inside the captured request;
   the matching span gets the label. A label names the origin kind: a
   Go builder (symbol plus permalink), the harness (opencode 1.18.32
   internal), a per-repo file (`AGENTS.md`), a gateway insertion (the
   `factory-tools` tool schemas), or policy (the model alias). The
   opencode system prompt splits into harness preamble and `AGENTS.md`
   content by the same locating step.
3. Emits the pages.

The tool exits non-zero when a span stays unlabelled or a registered
builder no longer matches. A rotting map reports itself; it cannot ship
silently.

## The output

In the design repo, under `docs/agents/`:

- `index.md`: the inventory table (agent, family, job, model alias under
  the pinned policy, purpose, where it runs, tool count), the master
  mermaid diagram of the factory with every agent as a node, the shared
  trunk of the one loop explained once, the duplication matrix (a block
  that several agents carry, by content hash; `writingguide.Guide` today
  sits in three: screening, sizing, check-in), and the self-check block:
  code SHA, opencode version, policy version, fixture ids, unlabelled
  spans = 0.
- `<agent>.md`, one page per documented agent of the map: the job
  blurb, the facts block, the master diagram with this agent's node
  highlighted, the tool list (name and one-line description; the full
  JSON in a collapsed block), then the first request part by part: each
  part a provenance line (builder symbol, permalink at the recorded
  SHA, bytes) and its verbatim text in a fenced block, long parts
  collapsed. One page is self-contained and can be handed to an LLM
  alone.
- `raw/<agent>.json`: the literal wire body, byte for byte.

Pages say "fixture task, not live data" where fixture content stands in
for a real card. The opencode-internal subagents (general, explore) get
a page at config level: what `buildOpencodeConfig` tells opencode about
them, with their prompt marked opencode-internal, since no first call
of ours exists to capture.

## What the tool never does

It renders no verdict. No clean, no redundant, no too long. The facts
it adds beyond the text itself are sizes, the duplication matrix, the
LEFT_OUT truncation state, unlabelled spans, and sources.

## The hand-maintained parts

`cmd/agentdoc/registry.go` holds the agent list with family, fixture
id, mermaid node id and the part list (builder symbol per part). The
fixtures live in `cmd/agentdoc/testdata/`, reusing the record tests'
fixture helpers. The blurbs and the master diagram are written once, by
an LLM draft Sebastian picks from, stored as data files beside the
registry, and change only when the factory's shape changes.
Regeneration never calls an LLM.

## Build order

Four phases, each shippable alone:

1. Registry and the direct clients. Twelve pages need no opencode
   binary; the pure builders and body shapes come first.
2. The loop modes. The record-test path drives the six modes with the
   pinned binary; the harness preamble versus `AGENTS.md` split lands
   here, as does the LEFT_OUT state per fixture.
3. Index, mermaid, duplication matrix, self-check.
4. The authored layer: blurbs and the master diagram, drafted,
   Sebastian picks, embedded.

## Calls made (veto any)

- Offline fixture capture, not live S3 session records: regenerable at
  will, no secrets, no cluster, and the captured request is the real
  assembly's output on a fixed task.
- Output lands in the design repo's `docs/agents/`, regenerated and
  committed on demand.
- One page per agent, the shared trunk explained once in the index.
- Sizes are bytes and characters per part; no tokenizer dependency.
- Provenance links are GitHub permalinks at the code repo's recorded
  SHA; both repos mirror there.
- Prompt text stays in Go constants; this plan adds no prompt files.
  Moving prompts into files is a separate change and not proposed here.
