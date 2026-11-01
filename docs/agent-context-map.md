# The agent context map

The map lives in [agents/](agents/index.md): one page per agent in the factory, plus an index. Each page shows the agent's first model request exactly as it crossed the wire, with every part pinned to the Go builder that wrote it. The index lists every agent, what the loop's pages share, which blocks several agents carry byte for byte, and the factory in one diagram.

The map answers three questions a prompt file cannot: what does this agent actually receive, who wrote each part of it, and what changed since the last look. Because the pages come from captures rather than hand-maintained prose, they cannot drift from the code quietly. When a builder changes, the next regeneration either shows the new bytes under the builder's name or refuses to ship.

The tool that builds the map is `cmd/agentdoc` in the `ai-software-factory-code` repository. It runs offline, calls no LLM, and is deterministic: the same code SHA, policy tree and pinned harness produce the same pages byte for byte.

## How each page is built

The tool captures, locates, renders.

1. **Capture.** Each registered agent is driven through its real assembly. Direct clients run against an in-process fake gateway. The six loop modes run the pinned opencode binary (`1.18.32`) on a scripted model. The first request that crosses the wire is recorded raw. Nothing is reconstructed from the code's intent: if a part is not in the recorded bytes, it is not on the page.
2. **Locate.** Every Go builder registers the exact bytes it produced. The tool searches for each builder's bytes inside the captured request, longest first, and accepts a match only when it appears exactly once. A part covered by no builder is unlabelled. A registered builder whose bytes are absent, present twice, or overlapping another span is an error.
3. **Render.** The page shows the request top to bottom: each message, each part, its size, and its provenance line. A part's provenance is a permalink to the builder's declaration at the recorded code SHA, or a plain label for the harness's own parts and files the harness read.

The pages carry a fixture task, not a live card. The capture runs the real builders on a fixed task, so the page shows the shape the agent receives with no live data in it. Every page says so under its header.

## How to read a page

Walk through [coding](agents/coding.md), the agent that writes the card's code.

- **Header.** The first line names the agent, its family and its job. Under it sits the one-line blurb and the run location.
- **The pins.** `Code SHA` is the commit every permalink on the page points at. `policy` is the content hash of the factory configuration tree the capture read. The harness line names the pinned opencode version.
- **Where this agent sits.** The factory diagram with this agent's node emphasised.
- **The first request.** The messages in wire order. Each part has a heading with its name and kind, a provenance line, and the verbatim bytes. Long parts are collapsed under a summary line. The system message on the coding page shows the layers: the harness preamble (labelled as the harness's own), the repository's AGENTS.md (labelled as the file the harness read), and the brief builders' parts, each a permalink into the code. Parts nested inside another part are listed under a `Contains:` line.
- **The offered tools.** Every tool the request offers, its provenance (the harness's own, or a permalink to the gateway's tool server), and the full schema JSON collapsed under it.
- **The raw twin.** A link to the literal wire body in JSON, byte for byte. Everything on the page can be checked against it.

[The opencode subagents' page](agents/opencode-subagents.md) is the one exception. No first call of ours exists to capture, because their prompts live inside the pinned binary. The page shows the one thing our side sets: the `agent` block of the session config, verbatim.

## How to read the index

- **The self-check** names the code SHA, the policy hash, the harness version, and that unlabelled spans are zero. It also carries the regeneration command and the fixture task ids.
- **The inventory** is one row per agent: family, job, model alias, purpose, where it runs, how many tools, how many request bytes.
- **The agents in one line each** is the authored summary. The blurbs are embedded data in the tool, picked once, not generated.
- **The one loop** names the parts all six loop pages carry byte for byte: the intersection by content hash, not by name. A slot every mode fills differently, like the mode's guide, is not trunk.
- **The duplication matrix** lists every block two or more agents carry identically, named by content hash and, when one builder wrote it, by its symbol. This is where shared-prompt candidates show up as facts.
- **The factory at a glance** is the authored diagram of the card's journey.

## Regenerate the map

Run the tool from the code repository. It refuses a dirty tree, so commit first: the pages must name a SHA that holds the code they were read from.

1. Commit and push the code repository, then check it out at that SHA.
2. Pin the policy tree from the infra repository's committed main:
   ```sh
   git -C ~/repos/ai-software-factory-infra fetch origin
   rm -rf /tmp/policy-fresh && mkdir -p /tmp/policy-fresh
   git -C ~/repos/ai-software-factory-infra archive origin/main factory | tar -x -C /tmp/policy-fresh
   ```
3. Get the pinned opencode binary (release `1.18.32`). The tool runs `<binary> --version` and refuses anything else.
4. Regenerate:
   ```sh
   cd ~/repos/ai-software-factory-code
   go run ./cmd/agentdoc \
     -out ~/repos/ai-software-factory/docs/agents \
     -policy /tmp/policy-fresh/factory \
     -opencode <path to the pinned binary>
   ```
   The loop modes need the binary. Pass `-opencode` or set `OPENCODE_RECORD_BIN`.
5. Commit `docs/agents/` in this repository and push.

`docs/agents/` is owned by the tool. Pages land on disk only after every page and the index rendered clean, and a sweep removes pages of agents the registry no longer names. Do not hand-edit anything in the directory: the next regeneration overwrites pages and removes stray files.

## What regeneration refuses

The tool exits non-zero and ships nothing. Each message names the rot:

| the tool says | what broke |
|---|---|
| `unlabelled bytes` | a part of the request no registered builder claims |
| `not found in the captured request` | a registered builder's bytes no longer cross the wire |
| `matches twice` | a builder's bytes appear at two places, so the match is not a provenance |
| `claim the same bytes` / `overlap without containment` | two builders' parts collide |
| `resolves nowhere` | a builder symbol has no declaration to link at the SHA |
| `no such message crossed the wire` | a registered part's place (system or user) never arrived |
| `the tree is dirty` / `the opencode binary reports ...` | the pins would lie |

## Add an agent to the map

Work in the code repository, `cmd/agentdoc`.

1. Write the capture driver next to the agent's code: drive the real assembly, return the spans with each part's name, symbol, place and exact bytes.
2. Add the registry entry in `registry.go`: id, package, family, job, run location, and the driver. One driver per entry.
3. Add the blurb line to `blurbs.md` and a node to `master.mmd`. Two tests hold the authored layer to a blurb and a diagram node per registry agent, so a missing one fails the suite.
4. Gate with two runs. `OPENCODE_RECORD_BIN` re-records committed fixtures, so the full suite runs without it and the loop e2e runs filtered with it:
   ```sh
   go test -race ./...
   OPENCODE_RECORD_BIN=<pinned binary> go test -race ./internal/factoryd/ \
     -run 'TestAgentDocLoop|TestAgentDocAgentConfig'
   ```

## What the tool never does

It renders no verdicts: no part is good, bad, too long or too short, and the index judges nothing. It never calls an LLM. It never reconstructs a request from the code instead of the wire. And it never ships a page whose claims it has not checked: a map that exists is a map whose every byte is accounted for.
