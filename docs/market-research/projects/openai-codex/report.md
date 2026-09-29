---
name: OpenAI Codex
slug: openai-codex
url: https://openai.com/codex
repo: https://github.com/openai/codex
category: coding-harness
license: Apache-2.0
open_source: yes
self_hostable: partial
hosting_model: CLI runs anywhere and talks to any OpenAI-compatible provider; Codex cloud, the app UI backend, and ChatGPT auth are OpenAI-hosted SaaS only
company: OpenAI, private company backed by Microsoft, HQ San Francisco, founded 2015
maturity: 127k stars, 19.9k forks, 19.5k open issues, created 2025-04-13, last push 2026-09-29, several tagged releases per day (alpha and stable)
similarity: 2
axes:
  signals_intake: 3
  control_plane: 1
  sandbox_isolation: 4
  verification: 3
  policy_outside_model: 4
  identity_per_task: 1
  cost_control: 1
  ux: 4
  reseedable_selfhost: 2
steal:
  - "execpolicy: a small Starlark-like DSL (codex-rs/execpolicy) with prefix_rule(pattern, decision, match, not_match) that classifies a shell command as allow, forbidden or prompt purely from argv, outside the model. Worth copying the shape for our own command-level policy layered on top of network policy."
  - "AGENTS.md resolution algorithm: walk from repo root down to cwd, prefer an AGENTS.override.md over AGENTS.md per directory, concatenate root-to-leaf so nearer files win by position, cap the total at project_doc_max_bytes (32 KiB default). A clean, small precedence rule we can lift as-is."
  - "The codex exec --json event schema (thread.started, turn.started, turn.completed with token usage, item.started/updated/completed, error) is a compact, well-typed shape for a harness event stream, close to what our normalised event stream needs from any Harness implementation."
  - "features.network_proxy: allowlist-first egress with deny-beats-allow, local/private destinations blocked unless explicit, and DNS-rebinding checks on top of the allowlist. Directly reusable as a checklist for our own default-deny egress gateway."
  - "The GitHub Action's two-job pattern: the job that runs codex exec never gets pull-requests: write and the job that posts the comment never sees the API key. That is our identity-belongs-to-the-task principle already applied to a CI trigger, worth copying verbatim for our own Forgejo Actions gates that call out to an agent."
  - "codex review's convention of a Code Review Rules section placed in the AGENTS.md nearest the changed code, with GitHub-side output capped to P0/P1 only. A cheap way to keep an automated review's noise bounded that we could apply to our own stronger-model review verdict."
  - "LiteLLM (our model gateway) already exposes a native /v1/responses endpoint, the only wire format Codex CLI still speaks. That removes the main technical risk of adopting Codex as our named successor harness: no bespoke translation shim needed between factory-gateway/LiteLLM and Codex's model_providers config."
differs:
  - "Codex CLI accepts only wire_api = \"responses\" now; codex-rs/model-provider-info/src/lib.rs turns wire_api = \"chat\" into a hard deserialization error. Any self-hosted model behind our gateway must be reachable through a Responses-API shape, not the more common Chat Completions shape most open-source inference servers speak natively. LiteLLM bridges this, but it is one more translation layer we would not need with a Chat-Completions-only harness."
  - "There is no task-scoped credential concept in the harness itself. Codex assumes one long-lived identity for the whole process: a ChatGPT OAuth session, a single env-var API key, or a command-backed token refreshed on a timer. Our identity-belongs-to-the-task principle would have to be entirely enforced at the gateway boundary; Codex itself contributes nothing toward scoping it further, unlike a harness built around short-lived per-invocation credentials."
  - "OpenAI does not accept external code contributions: CONTRIBUTING.md states plainly it does not accept external code contributions or pull requests. Apache-2.0 lets us fork and patch, but we can never upstream a fix into the fast-moving mainline; any adapter-side workaround for a Codex bug has to live as a permanent local patch, not a merge."
  - "The actual control-plane analogue (task/environment registry, approvals, internet-access policy per environment, cost) lives entirely in Codex cloud, which is closed OpenAI SaaS with no self-host option. There is no artifact to study or copy for our own durable control plane; everything usable from this project stops at the harness/worker-plane boundary."
ux_verdict: The CLI is a one-line curl install to a TUI with ChatGPT sign-in, and the same JSONL event stream feeds VS Code, JetBrains, a web app and Slack/Linear triggers; our console is behind on live streams, diffs and mobile, but none of Codex's surfaces are ours to operate or brand.
slop_verdict: "Real and heavily used, not a landing page. 154 Cargo crates, multiple tagged releases a day, a 22 KB AGENTS.md the team uses to run itself. The same pace is the risk: wire_api chat and codex mcp-server were both removed within the observation window, so pinning a version and re-testing on every bump is mandatory."
---

# OpenAI Codex

## 1. What it is

OpenAI Codex is OpenAI's own coding-agent product line: Codex CLI (open source, Rust, Apache-2.0), Codex cloud (a hosted sandboxed task runner reachable from chatgpt.com, GitHub, GitLab, Slack and Linear), a TypeScript and Python SDK that wraps the CLI, a GitHub Action, IDE extensions for VS Code and JetBrains, and a ChatGPT desktop/web app surface. It ships inside every ChatGPT plan from Free upward; there is no separate Codex-only subscription. OpenAI's own framing (openai.com/codex, learn.chatgpt.com/docs) is "start with a goal, idea, or task; ChatGPT can gather context, take action, and produce something useful," positioned as a general agentic layer of ChatGPT rather than a standalone dev tool.

The repository backs that framing: `openai/codex` is a single monorepo of 154 Cargo workspace members (`codex-rs/Cargo.toml`), not a small CLI. It contains the harness core (`codex-rs/core`), the sandbox and execpolicy engine, the terminal UI, the JSON-RPC app-server that also drives the IDE extensions, a `cloud-tasks` TUI client for the closed cloud backend, an `agent-identity`/`agent-graph-store`/`agent-message-board-client` stack for multi-agent ("subagent") coordination tied to a ChatGPT account, realtime/voice/WebRTC crates, and Bazel plus Cargo build files. `docs/` in the repo is mostly one-line stubs that redirect to `learn.chatgpt.com/docs`; the real documentation lives on the website, not in the repo.

What the makers claim: "a coding agent that runs in your terminal" (GitHub description), positioned as free with a ChatGPT plan and open source. What the repository actually shows: a fast-moving, OpenAI-controlled monorepo whose docs, cloud backend and multi-agent identity system are closed even though the CLI/SDK/app-server code is openly licensed, and whose CONTRIBUTING.md explicitly refuses outside code contributions.

## 2. Mapping to our five planes

| Plane / principle | What Codex does | What we do | Verdict |
|---|---|---|---|
| Signals | Codex cloud takes tasks from the chatgpt.com UI, GitHub issues/PRs, GitLab (beta) merge requests/issues, Linear issues/comments, and Slack channels/threads. No telemetry-alert intake. | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API; one forge only. | they lead (forge/chat breadth), not comparable (no telemetry path) |
| Control plane | Task/environment state lives in Codex cloud, a closed SaaS with no exposed workflow engine, audit trail or capability policy beyond a per-environment internet-access allowlist. Locally, the CLI persists resumable session "rollouts," which is session memory, not a task registry. | `factoryd` with a Temporal workflow per task, Postgres task registry, policy as YAML in Git, budgets, approvals, cost ledger, audit trail. | we lead |
| Worker plane | One sandboxed process per session (Seatbelt on macOS, bwrap+seccomp on Linux, a native or WSL2 sandbox on Windows), or one isolated OpenAI-managed container per Codex cloud task, offline by default in the agent phase. | One Kubernetes namespace, ServiceAccount and gVisor pod per task, default-deny egress to a short allowlist. | equal (different substrate, comparable rigor for what each is designed to run) |
| Verification | `codex review` / `@codex review` on GitHub PRs, an optional Security Review, an `approvals_reviewer = "auto_review"` mode that routes risky actions through a reviewer agent and fails closed on critical risk; a GitHub Action for CI-triggered runs. | Forgejo Actions gVisor runners, policy gates (risk class, migration flag, reproduction at base and head), then a stronger-model review with a strict verdict. | equal |
| Merge and deploy | `codex review` posts PR comments; Codex cloud lets a human open a PR from a finished task. No GitOps deploy step, no auto-merge rule described. | Bot merge after human approval or an `auto` rule for reproduced, strictly-improving changes; Flux deploy, staged rollout with an alert-free wait. | we lead |
| Policy outside the model | execpolicy (argv-level allow/forbid/prompt rules, code-evaluated, not prompted), OS sandbox primitives, an allowlist-first network proxy with deny-beats-allow and DNS-rebinding checks. | Capability policy as a document in Git, enforced in gateway code and Cilium network policy; a prompt cannot grant a capability. | equal |
| Identity per task | One identity per process: a ChatGPT OAuth session, a single env-var API key, or a command-backed refreshed token. `agent-identity` issues ed25519/JWT identities for cross-agent messaging, scoped to a ChatGPT account, not to a task. | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified by `factory-gateway` against the cluster OIDC issuer. | we lead |
| Artifacts not chat | Threads/turns/items over JSON-RPC (app-server) or JSONL (`codex exec --json`); GitHub Action example workflows deliberately pass only the final message between jobs, not full chat history. | `TaskBrief` in, branch/PR/normalised event stream out; Git is the coordination mechanism. | equal |

## 3. Architecture and stack

Language: Rust for the CLI, sandboxing, execpolicy, app-server and core agent loop (`codex-rs/core/src`, ~150 files including `codex_delegate.rs`, `exec_policy.rs`, `guardian_review.rs`, `thread_manager.rs`, `mcp.rs`). TypeScript and Python SDKs (`sdk/typescript`, `sdk/python`) are thin wrappers: the TypeScript SDK's README states plainly it "spawns the CLI and exchanges JSONL events over stdin/stdout." The npm package (`codex-cli/`) is a distribution wrapper around the native binary.

Sandboxing lives in `codex-rs/sandboxing` and `codex-rs/linux-sandbox`: `bwrap` plus `seccomp` on Linux (the CLI's `codex sandbox landlock` subcommand is a naming leftover, not the active Linux mechanism per the current docs), Seatbelt (`sandbox-exec` plus a bundled `.sbpl` profile, see `codex-rs/sandboxing/src/seatbelt_base_policy.sbpl`) on macOS, and a native or WSL2-hosted sandbox on Windows (`codex-rs/windows-sandbox-rs`, `windows-sandbox-service`). `codex-rs/execpolicy` is a standalone crate with its own DSL (`policy.rs`, `rule.rs`, `decision.rs`) evaluated in Rust, not by the model.

Model routing is entirely config-driven through `codex-rs/model-provider-info`: `model_providers.<id>` tables carry `base_url`, `env_key` (or a command-backed `auth` block), and `wire_api`. As of this snapshot `WireApi` has exactly one variant, `Responses`; the deserializer for `wire_api = "chat"` returns a hard error pointing at GitHub discussion #7782. This means a custom provider, including a self-hosted gateway, must speak the OpenAI Responses API shape at `/v1/responses`, not Chat Completions.

MCP support is client-side only now: `codex mcp` manages configured MCP servers (stdio or HTTP, with OAuth), and `mcp_servers.<id>.required = true` makes `codex exec` fail hard if that server does not start. The older `codex mcp-server` (exposing Codex itself as an MCP server) is deprecated in favour of `codex app-server`, a stateful JSON-RPC 2.0 daemon (`codex-rs/app-server`) that also backs the VS Code and JetBrains extensions; it supports thread/turn/item streaming, bidirectional approval requests, and an experimental WebSocket transport with its own health endpoints and auth.

Cloud task orchestration itself is not in this repository: `codex-rs/cloud-tasks` and `codex-rs/cloud-tasks-client` are a client-side TUI and HTTP client against a closed backend; there is no server-side scheduler, container image build or task-state code to read. `codex-rs/agent-identity` issues ed25519 keys and short-lived JWTs against `auth.openai.com`, but this is for Codex's own multi-agent ("subagent") message-board coordination inside one ChatGPT account, not a general task-identity broker.

Deployment shape: a single static-ish binary (npm, Homebrew, or a direct download from `releases.openai.com` with GitHub Releases as fallback), no Helm chart, no container image published for self-hosting the harness itself (only for Codex cloud's own closed environments).

## 4. UX

Onboarding: `curl -fsSL https://chatgpt.com/codex/install.sh | sh`, then `codex`, then "Sign in with ChatGPT" (or set an API key). That is two commands and one login screen to a first interactive session; `codex exec "<prompt>"` gets a first non-interactive result in the same two commands with no login screen if `CODEX_API_KEY` is already set.

A user watches an interactive session in the TUI (stdout for the agent's messages, an approval prompt inline when the sandbox or approval policy requires one) or watches a scripted run via `codex exec --json`, which streams `item.started`/`item.completed` events for command execution, file edits, MCP tool calls, web search and plan updates, finishing with `turn.completed` carrying token usage. Intervention in interactive mode is answering an inline approval prompt (allow, allow-with-escalation, deny); in `codex exec`, autonomy is bounded up front by `--sandbox` and `--ask-for-approval` (or the `granular` policy) rather than by a mid-run pause, since headless mode has no one to ask.

Beyond the CLI, the same agent loop is reachable from VS Code and JetBrains extensions (via `codex app-server`), a ChatGPT desktop/web app, and Codex cloud's own web UI, described in its docs as a prompt box with an environment picker, tabs for Chats/Code reviews/Security reviews/Archive, and per-task rows showing branch name, line-change counts and status (Merged, Closed, Cancelled). Finished cloud tasks show a summary and diff before a human requests a follow-up or opens a PR. Slack and Linear both trigger tasks directly from a channel/thread or an issue/comment.

Compared with our console: Codex's breadth (CLI, two IDEs, web, Slack, Linear, a phone-friendly ChatGPT app) is clearly ahead of our single server-rendered htmx console, which we already flag as having no real-time stream, no diff view and no mobile view. What is worse: none of those surfaces are self-hostable or brandable, the cloud UI is OpenAI's product, not infrastructure we could stand up ourselves, and a recurring 2026 community complaint (multiple blog roundups, consistent with a "loose focus discipline" phrasing) is that Codex edits more files than asked, producing larger diffs to review than expected.

## 5. Security, identity, sandbox, policy, cost

**Security enforcement.** Two independent layers: a sandbox mode (`read-only`, `workspace-write`, `danger-full-access`) that is a hard OS-level boundary, and an approval policy (`on-request`, `never`, or `granular`) that decides when to pause. `--dangerously-bypass-approvals-and-sandbox` (`--yolo`) exists and is flagged in the docs as not recommended. This is enforced in code (Seatbelt/bwrap+seccomp/Windows sandbox, execpolicy), not left to the model.

**Identity.** Credentials live in the user's environment or OS keyring: a ChatGPT OAuth session, a single `env_key`-named variable, or a command-backed token refresh. There is no per-task scoping in the harness; the GitHub Action's own security guidance is to remove `sudo` (`safety-strategy: drop-sudo`) so a compromised step at least cannot escalate, which is a mitigation for one shared key sitting in the job, not a credential-scoping architecture.

**Sandbox.** Default is `read-only`, `workspace-write` for anything inside a Git repo, no network unless `sandbox_workspace_write.network_access = true`. Codex cloud runs each task in an OpenAI-managed container, network-enabled only for the setup phase and off by default for the agent phase; enabling it means choosing None, "common dependencies," or "all," plus an optional GET/HEAD/OPTIONS-only restriction.

**Policy.** execpolicy rules and the network proxy's allowlist (deny beats allow, local/private destinations blocked unless explicit, DNS-rebinding checked) are both evaluated outside the model. `approvals_reviewer = "auto_review"` adds a second, coarser layer: a reviewer agent that can deny critical-risk actions and fails closed on error.

**Cost.** There is no spend cap, hold, or ledger anywhere in the protocol: `TokenUsage`/`TokenUsageInfo` in `codex-rs/protocol/src/protocol.rs` carry only token counts (input, output, cached, total), no dollar figure. Cost to the user is a ChatGPT plan's rolling 5-hour/weekly message limits (`/status`, `/usage` in the CLI) or straight API-key billing with no included buffer; hitting a limit surfaces as a "model at capacity" error, not a budget-aware pause.

## 6. What we should take from it

**Narrow (copyable this month).** The execpolicy DSL's shape (argv prefix match to allow/forbid/prompt, evaluated in code) is a small, well-scoped pattern for a command-level policy layer that sits above our network policy and below full capability policy. The AGENTS.md root-to-leaf, override-beats-default, byte-capped merge algorithm is simple enough to copy exactly for our own project-doc handling. The `codex exec --json` event vocabulary (thread/turn/item lifecycle, token usage on `turn.completed`) is close enough to what a `Harness` needs to emit that we could adopt its field names rather than invent our own. The GitHub Action's two-job split (agent job never gets PR-write, comment job never sees the key) is directly usable in our own Forgejo Actions gates.

**Broad (product shape, priorities).** Codex's multi-surface intake (GitHub, GitLab, Slack, Linear, plus a web chat) shows the value of meeting a task where it already lives; our single-forge limitation is a real gap by comparison, though closing it is a scope decision, not a code borrow. The network-proxy allowlist-first design (with a documented GET/HEAD/OPTIONS-only mode as an anti-exfiltration control) is a broader idea worth adopting for our own default-deny egress: restrict HTTP methods, not just domains, when an agent's network access is turned on at all.

## 7. Where our philosophy differs and what that costs or buys us

Adopting Codex as our named successor harness means accepting `wire_api = "responses"` as the only supported shape; our gateway already sits on LiteLLM, which exposes a native `/v1/responses` endpoint, so this is a solvable integration cost, not a blocker, but it is one more translation hop that a Chat-Completions-only harness would not require.

Our "identity belongs to the task" principle gets no help from Codex itself: the harness has no notion of a scoped, short-lived credential, so all of that enforcement stays at the `factory-gateway` boundary exactly as it does today for opencode. This is not a regression, just confirmation that swapping the harness does not reduce the identity work we already do elsewhere.

Codex's closed control plane (Codex cloud) and closed contribution model (no external PRs, per CONTRIBUTING.md) mean we can only ever treat this project as a pinned, vendored dependency for the worker-plane component, never as something we co-develop or patch upstream. Given the release pace (several tags a day, breaking changes like the chat-wire-API removal shipping without a deprecation window we could find), pinning a specific version and re-validating on every planned bump is not optional.

## 8. Red flags and slop assessment

Maintenance is not in question: 154 Cargo crates, multiple GitHub releases per day (`rust-v0.159.0` and three alpha tags in the 36 hours before this report), 127k stars, 19.5k open issues, and a 22 KB `AGENTS.md` the team visibly uses to run its own review process (Code Review Rules, TUI style conventions, a stated 800-line change-size guideline).

Two things worth flagging as risk rather than slop: first, the pace itself. `wire_api = "chat"` and `codex mcp-server` were both removed within recent history (the deserializer error points to a still-open GitHub discussion, #7782), and `--full-auto` is deprecated in favour of explicit sandbox/approval flags. A wrapper we build today can break on any given day's release. Second, open-core-adjacent structure: the CLI, SDK and app-server are genuinely Apache-2.0 and readable, but the cloud backend, the multi-agent identity system, and all documentation now live outside the repository on OpenAI's own site and servers; "open source" here means the harness, not the product. No licence change, no known security incident specific to this project was found in the time available; the security disclosure process runs through Bugcrowd, which is normal practice, not a flag.

## 9. Sources

Repository clone, `~/repos/market-research-clones/openai-codex`, HEAD `c248f6d48b97eb4a2aa56147a0b11b7d763278b9`, 2026-09-29: README.md, LICENSE, SECURITY.md, CHANGELOG.md, CONTRIBUTING.md (docs/contributing.md), AGENTS.md (headers), docs/open-source-fund.md, docs/sandbox.md, docs/exec.md, docs/execpolicy.md, docs/config.md, docs/agents_md.md, docs/authentication.md, docs/skills.md, docs/getting-started.md, `.codex/environments/environment.toml`, `codex-rs/Cargo.toml`, `codex-rs/protocol/src/protocol.rs`, `codex-rs/model-provider-info/src/lib.rs`, `codex-rs/execpolicy/src/policy.rs`, `codex-rs/execpolicy/examples/example.codexpolicy`, `codex-rs/core/src/guardian_review.rs`, `codex-rs/core/src/mcp.rs`, `codex-rs/agent-identity/src/lib.rs`, `codex-rs/cli/src/main.rs`, `codex-rs/cloud-tasks/src/*`, `codex-rs/cloud-tasks-client/src/*`, `sdk/typescript/README.md`.

`gh api repos/openai/codex`, 2026-09-29: 127k stars, 19.9k forks, 19.5k open issues, Apache-2.0 licence, created 2025-04-13, last push 2026-09-29.

`gh api repos/openai/codex/releases`, 2026-09-29: several tagged releases (stable and alpha) within the 36 hours before this report, used for the release-cadence claim.

developers.openai.com, WebFetch, 2026-09-29: `/codex/security`, `/codex/noninteractive`, `/codex/exec-policy`, `/codex/config-reference`, `/codex/agent-configuration/agents-md` (referenced from stub docs, content cross-checked against source where the stub pointed to it), `/codex` (index), `/codex/cloud`, `/codex/cloud/internet-access`, `/codex/github-action`.

`https://openai.com/codex/` returned HTTP 403 to WebFetch on 2026-09-29 and was not read directly; positioning taken from developers.openai.com and the README instead.

WebSearch, 2026-09-29: "OpenAI Codex CLI wire_api chat removed", surfaced GitHub discussion openai/codex#7782 confirming the Chat Completions removal; "LiteLLM Responses API support", confirmed native `/v1/responses` passthrough; "Codex CLI vs Claude Code", general sentiment only, not quoted directly in this report.

Not verified: actual runtime behaviour of the sandbox, execpolicy, approval flows, app-server protocol and cloud environment, since running the cloned code or signing in was out of scope. All claims about these come from reading source and documentation, not from execution.
