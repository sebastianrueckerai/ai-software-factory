# Chat Research Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The chat gains `files`, a path listing for both repositories it reads, and `research`, a stateful command sandbox per conversation on the project's image, with caps and context discipline throughout.

**Architecture:** The `files` tool lists paths through the Forgejo trees API with two credential paths (member for the project repo, docs writer token for the doc repo, master only). The research pod reuses the session machinery: per-thread namespace, gVisor, restricted security, no cache mount, the project's pinned image, an agent-worker research mode owning one local port that factoryd posts commands to, a ten-minute idle reap and a per-project cap of two. The console is compiled into factoryd, so the tool calls Runner in process, no HTTP hop.

**Tech Stack:** Go 1.26 (console chat tools, factoryd, agent-worker), the Forgejo API (trees, tokens), the session namespace machinery (quota, limit range, Cilium, gVisor), MintToken.

**Spec:** [docs/chat-research-design-2026-10-19.md](../chat-research-design-2026-10-19.md) (same repository; executors read both)

## Global Constraints

- Caps: files answers at most 50 paths plus the total count; research output cuts at 8 KiB with the cut named; a command runs 300 seconds by default, 900 hard; the pod lives ten minutes past its last command; at most 2 live research pods per project, oldest reaped.
- Keyring: the research pod's git token is read-only and short-lived, scoped to the project's origin and its fork. No write token, no model credentials, no card tools.
- No shared cache mount on the research pod (ruling 291's refusal, the reproPodSpec pattern): it builds cold in its own emptyDir.
- Context rules: two tool schemas with one-line descriptions; search answers carry addresses, not content; no standing preamble or echoed state; the reap is the one named notice.
- Access: the research tool refuses for projects with `agents: none` (the AgentsNone policy field), naming why.
- The plan lands after sandbox-images' image resolution task (its Task 4), which the research pod's image resolution rides; no temporary image source (the sandbox-images migration ruling).
- House test style: `go test -race ./...` green, gofmt, gosec clean; hand-derived expectations.

## Review Focus

The five inputs most likely to bite a person, each with its pinning test:

1. **The member calling `files` on the document repository** would 403 in production, since members hold no rights on chat.doc_repo. Expected: the docs listing rides the docs writer token. Pinned by Task 1's credential-path test.
2. **The fetch token scoped to origin only** makes every fork branch, including a card's in-flight work, uncheckoutable. Expected: the token covers origin and the fork. Pinned by Task 3's token test.
3. **A command dumping 40 KiB into the chat's context.** Expected: the cut at 8 KiB, named, with the narrowing. Pinned by Task 2's cap test.
4. **An idle research pod holding its requests past its useful life.** Expected: the namespace reaped ten minutes after the last command. Pinned by Task 3's reap test.
5. **Two conversations on one project fighting over one workspace.** Expected: a pod per conversation, at most two live per project, the oldest reaped. Pinned by Task 3's cap test.

---

### Task 1: The files tool and the refusal upgrades

**Files:**
- Modify: `internal/console/chat_tools.go` (the tool table entry)
- Modify: `internal/console/chat_reads.go` (`fileText`, beside it `filesText`; the refusal strings)
- Create: `internal/console/chat_files_test.go`

**Interfaces:**
- Consumes: the paged Forgejo trees use at forgejo.go:1338 (read it first); `docFileAt`'s docs writer token path; `fileText`'s member path.
- Produces: the `files` tool, parameters `{target: "project" | "docs", ref, prefix, substring}` (ref empty means the default branch; prefix and substring combine); answers at most 50 paths plus the total count; on `docs` a non-master ref is refused with "the documents serve master"; `fileText`'s 404 and `readDoc`'s missing-path and out-of-roots refusals each gain the line "files lists what is there".

- [ ] **Step 1: Write the failing tests** — `TestFilesListsProjectRepo` (fake API serves a tree, the tool answers the paths), `TestFilesFilters` (a prefix and a substring each filter, both combine), `TestFilesCapsAt50` (200 paths in, 50 out plus "and 150 more"), "TestFilesDocsToken` (the docs call uses the docs token and touches master only), `TestFilesDocsRefRefused` (ref on docs names master-only), `TestFileRefusalNamesFiles` (the file 404 line carries "files lists what is there").

- [ ] **Step 2: Run** `go test ./internal/console/ -run 'TestFiles|TestFileRefusal' -v` — FAIL.

- [ ] **Step 3: Implement** `filesText` and the table entry; thread the two credential paths (member via the existing call shape, docs via `docFileAt`'s token); update the three refusal strings.

- [ ] **Step 4: Run** `go test -race ./internal/console/` — PASS; gofmt, gosec clean.

- [ ] **Step 5: Commit** `files: the chat's path listing for both repositories, refusals name it`.

### Task 2: The worker's research mode

**Files:**
- Modify: `cmd/agent-worker/message.go` (the existing listener's mode switch)
- Create: `cmd/agent-worker/research.go`
- Modify: `internal/harness/types.go` (the command envelope)
- Test: `cmd/agent-worker/research_test.go`

**Interfaces:**
- Consumes: the listener `postWorker` posts to (factoryd/message.go), the MODE switch that repro mode uses.
- Produces: `MODE=research` serves the listener with a command endpoint: `{command, timeout}` runs `sh -c` in the workspace directory, a fresh shell per command, cwd persistent; output cuts at 8 KiB with the named cut; timeout kills the process (300 default, 900 hard); the same bearer authentication the listener already uses.

- [ ] **Step 1: Write the failing tests** — `TestResearchRunsInWorkspace` (a command sees the workspace and writes persist across commands), `TestResearchCapNamesTheCut` (41 KiB of output comes back as 8 KiB plus the cut line), `TestResearchTimeoutKills` (a sleeping command returns at the timeout with a timeout answer), `TestResearchFreshShellPersistentCwd` (cd in command 1 holds for command 2, env vars do not).

- [ ] **Step 2: Run** `go test ./cmd/agent-worker/ -run TestResearch -v` — FAIL.

- [ ] **Step 3: Implement** the mode and endpoint; the command runs under the worker's own non-root identity, no new privileges.

- [ ] **Step 4: Run** `go test -race ./cmd/agent-worker/ ./internal/harness/` — PASS; gofmt, gosec clean.

- `Forgejo` **Step 5: Commit** `agent-worker: the research mode, capped commands in a persistent workspace`.

### Task 3: The factoryd research lifecycle

**Files:**
- Create: `internal/factoryd/research.go`
- Test: `internal/factoryd/research_test.go`

**Interfaces:**
- Consumes: `freshNamespace`, `sandboxPodSpec`'s confinement shape, the fetch-init-container pattern, `MintToken`, `postWorker`, sandbox-images Task 4's digest resolution (`taskImage`).
- Produces:
  - `func (r *Runner) ResearchStart(ctx context.Context, project, thread string) (ResearchInfo, error)` — get-or-create: the namespace `research-<thread>`, quota, limit range, the Cilium policy that lets factoryd reach the research port and nothing else, MintToken scoped to origin and fork, and the pod: the project's pinned default image, gVisor, restricted, read-only rootfs, no cache mount, the fetch init container cloning origin with branches, `MODE=research`.
  - `func (r *Runner) ResearchCommand(ctx context.Context, project, thread, command string) (string, bool, error)` — posts to the pod's research port, returns output and fresh (true when the pod was recreated), resets the slack timer.
  - The reap: ten minutes after the last command the namespace goes; per-project cap 2, oldest reaped.

- [ ] **Step 1: Write the failing tests** — `TestResearchStartIdempotent` (two starts, one namespace), `TestResearchPodSpec` (no cache mount, pinned image digest, read-only rootfs, MODE=research, token scoped origin+fork), `TestResearchCommandRoundTrip` (fake worker server answers, output returns), `TestResearchCapNamesTheCut` is Task 2's; here `TestResearchReap` (idle past the slack, namespace gone), `TestResearchCapTwo` (a third thread reaps the oldest), `TestResearchFreshNamed` (a command after reap returns fresh=true).

- [ ] **Step 2: The fake kube** (the house fakes behind gates.go's scripted-pod runs) gets the namespace, policy and token paths it lacks.

- [ ] **Step 3: Implement** research.go: lifecycle, token, pod spec, command path, reap timer, cap.

- [ ] **Step 4: Run** `go test -race ./internal/factoryd/` — PASS; gofmt, gosec clean.

- [ ] **Step 5: Commit** `factoryd: the research thread lifecycle, capped and reaped`.

### Task 4: The console research tool

**Files:**
- Modify: `internal/console/chat_tools.go` (table entry, `researchText`)
- Modify: `cmd/factoryd/main.go` (the console config gains the Runner)
- Test: `internal/console/chat_research_test.go`

**Interfaces:**
- Consumes: Task 3's Runner methods, in process; the chat turn's write deadline (the keepalive).
- Produces: the `research` tool, parameters `{command, timeout}`; refuses for AgentsNone projects with the reason; answers `{output, fresh}`, fresh renders the named-fresh line; the description stays one line; the keepalive writes during commands longer than the stream deadline.

- [ ] **Step 1: Write the failing tests** — `TestResearchToolRoundTrip` (fake Runner answers, output and fresh render), `TestResearchToolAgentsNoneRefused` (an agents-none project refuses naming why), `TestResearchToolKeepalive` (a command exceeding the stream deadline produces keepalive writes, no client timeout).

- [ ] **Step 2: Run** `go test ./internal/console/ -run TestResearchTool -v` — FAIL.

- [ ] **Step 3: Implement** the tool, the gate, the Runner wiring in main.go, and the keepalive.

- [ ] **Step 4: Run** `go test -race ./internal/console/ ./cmd/factoryd/` — PASS; gofmt, gosec clean.

- [ ] **Step 5: Commit** `chat: the research tool, gated and keepalive-safe`.

### Task 5: Live pass and the roadmap

**Files:**
- Modify: `docs/roadmap.md` (docs repo: the research entry to built, with sources)
- Live systems: the factory (Cilium rule, deploy, the chat)

- [ ] **Step 1: Verify live, in order:** deploy factoryd with the research mode and the worker image rebuilt; from a chat: `files` lists both repositories (the docs one without a ref), `research` clones, checks out a fork branch, greps with line numbers, counts words; the reap lands ten minutes after the last command; a command after reap returns the fresh line; a second conversation runs in its own workspace; the cap evicts the oldest at the third thread.
- [ ] **Step 2:** confirm the trees API call shape against the live Forgejo (the design leaves this verification explicit), amend the call if the shape differs, keep the amendment noted in this plan file.
- [ ] **Step 3: Update the roadmap** entry with the built state and sources, in the house voice.
- [ ] **Step 4: Commit** `roadmap: chat research built` (docs repo).

---

## Notes for the executor

- Order: sandbox-images' Task 4 (the digest resolution, `taskImage`) lands first; research rides it. If sandbox-images is still in flight when research starts, its Tasks 2 to 4 are written against the planned `taskImage` seam and land after.
- The trees API call shape verifies live at Task 1 and again at Task 5; the design's paged-use pointer is forgejo.go:1338.
- The docs listing's token is FORGEJO_DOCS_TOKEN, the same one read_doc uses.
- The Cilium policy, the research port, and the namespace id scheme are builder choices within the design's bounds: one port, factoryd-only ingress, ids on the per-task namespace machinery.
