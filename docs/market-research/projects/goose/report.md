---
name: Goose (Block)
slug: goose
url: https://goose-docs.ai
repo: https://github.com/aaif-goose/goose
category: coding-harness
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: runs locally only, desktop app or CLI, no hosted SaaS from the project, BYO model API key or local models via Ollama
company: built by Block Inc, open sourced Aug 2024, governance and repo moved to the Agentic AI Foundation (Linux Foundation) in Apr 2026, Block remains an active maintainer
maturity: 54.8k stars, 6.3k forks (GitHub API, 2026-09-29), first commit 2024-08-23, last push 2026-09-29, near-weekly releases (Cargo.toml at 1.52.0, three CVEs patched across 1.37 to 1.49 in the past month)
similarity: 2
axes:
  signals_intake: 1
  control_plane: 1
  sandbox_isolation: 0
  verification: 1
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 1
  ux: 3
  reseedable_selfhost: 2
steal:
  - "GooseMode: a four-value autonomy dial (auto, approve, smart_approve, chat) switchable mid-session with /mode, cheaper than a kanban state for how much rope a task gets."
  - "goose run --output-format stream-json plus an Agent Client Protocol server (goose acp on stdio, goose serve over HTTP/WebSocket) as a structured, non-text-scraped interface a harness wrapper can consume."
  - "Recipes are size-capped and format-validated before they are allowed onto the cron scheduler (MAX_SCHEDULE_RECIPE_BYTES, validate_recipe_for_scheduling), a cheap guard against a hostile TaskBrief-equivalent."
  - "The local permission store hashes tool name plus argument context, supports an optional expiry per remembered decision, and writes atomically (temp file plus rename), a small durable pattern worth copying wherever we cache a human approval."
  - "security/egress_inspector.rs regex-parses shell commands for outbound destinations as an advisory check layered on top of, not instead of, real network policy."
differs:
  - "Their capability check is partly a model call: permission_judge.rs asks the LLM itself whether a batch of tool requests is read-only, and the prompt-injection scanner (adversary_inspector.rs, classification_client.rs) is also LLM-based. Our principle that policy lives outside the model rules this out as a boundary; at most it is a hint layered on top of code-enforced policy, never the enforcement."
  - "Identity is the inviting human's own OS account and their own provider keys in a local keyring, not a task-scoped credential, and the shipped default is Autonomous mode: file writes, deletions and shell commands run with no approval at all unless the user turns a dial down. Our model (task-scoped ServiceAccount, ask-once-then-gated) is the opposite default; copying goose's default would fail our security-without-half-measures constraint outright."
ux_verdict: onboarding to a first result is about five steps for one developer on one machine, better than our console for that single-user case, but there is no multi-task board, no team approval queue, and no audit trail beyond a local session log.
slop_verdict: real and heavily used (54.8k stars, LF governance, near-weekly releases, ~59 provider/auth source files), not a README with a landing page, but three CVEs disclosed in the last month for unsandboxed command execution show the ask-unless-the-mode-says-otherwise model has exploitable gaps, and Block's own pre-launch red team compromised a real employee laptop.
---

# Goose (Block)

## 1. What it is
Goose is a general-purpose, local-first AI agent from Block (the Square/Cash App parent), released open source in August 2024 and, since April 2026, governed by the Agentic AI Foundation (AAIF) under the Linux Foundation rather than by Block alone. It ships as a Rust-based desktop app (macOS, Linux, Windows), a CLI, and an embeddable API, and speaks to 15+ model providers plus local models through Ollama. It is free, Apache-2.0, no paid tier; the only cost is the model calls the user's own key pays for.

The README calls it "your native open source AI agent" for "code, workflows, and everything in between", explicitly not code-only. The repository backs that up: crates/goose-mcp/src/computercontroller, peekaboo (screen capture) and memory extensions, plus a Telegram/chat "gateway" (crates/goose/src/gateway/), show it is built for general automation, with coding as one use case among several, not a factory-orchestrator or a CI-integrated pipeline tool.

## 2. Mapping to our five planes
| Plane / principle | What Goose does | What we do | Verdict |
|---|---|---|---|
| Signals | User prompts, plus local cron-scheduled recipes (tokio_cron_scheduler in crates/goose/src/scheduler/full.rs) and optional chat-platform pairing (Telegram) | Forgejo issues, alert webhooks, factoryd intake API | not comparable |
| Control plane | A local JSON job list plus local session files, no durable workflow, no cross-machine task registry | Temporal workflow per task, Postgres task registry, cost ledger, audit trail | we lead |
| Worker plane | Same process on the user's own OS account, full local file and shell access, MCP extensions (stdio or streamable HTTP) | One gVisor pod per task, read-only root FS, default-deny egress | we lead |
| Verification | Optional goose review (AI code review over git), no required gate | Forgejo Actions, policy gates, stronger-model review before merge | we lead |
| Merge and deploy | None, goose does not merge or deploy anything itself | Bot merge after approval or auto-rule, Flux GitOps rollout | not comparable |
| Policy outside the model | Local permission store plus an LLM classifier (permission_judge.rs) deciding read-only vs write | YAML policy in Git, enforced in gateway code and network policy | we lead |
| Identity per task | The human's own OS account and provider key, from a local keyring | Projected, audience-scoped ServiceAccount token per task, no keys in the sandbox | we lead |
| Artifacts not chat | A chat session and shareable YAML "recipes"; recipes are closer to artifacts than the chat is | TaskBrief in, branch/PR/event stream out | they lead (on recipes as a portable artifact format) |

## 3. Architecture and stack
Rust workspace (Cargo.toml, resolver = "2"), workspace members under crates/*: goose (core agent, providers, security, permission, session, scheduler), goose-cli (the goose binary, crates/goose-cli/src/main.rs), goose-mcp (bundled MCP extension servers: developer/computercontroller/memory/peekaboo/tutorial/autovisualiser), goose-providers and goose-provider-types (provider abstraction, including goose_mode.rs), goose-sdk/goose-sdk-types (published crates, the "GDK"), goose-acp-macros. The desktop app is a separate Electron app (ui/desktop/, TypeScript). ui/text/ is an explicitly deprecated ACP TUI.

Model access goes through crates/goose/src/providers/ (59 source files: dedicated modules for Anthropic, OpenAI, Google, Azure, Azure AI Foundry, Bedrock, Databricks, GitHub Copilot, OpenRouter, Ollama, LiteLLM as a pass-through target, plus ACP bridges to other CLIs, claude_acp.rs, codex_acp.rs, copilot_acp.rs, cursor_agent.rs, gemini_cli.rs, amp_acp.rs, pi_acp.rs, so Goose can itself drive other agent CLIs as a provider). There is no model gateway of its own with budgets; litellm.rs exists only as one more upstream option, not as the enforcement layer.

Sessions and jobs are local files under a config directory (crates/goose/src/session/, permission/permission_store.rs under Paths::config_dir().join("permissions")). The scheduler (crates/goose/src/scheduler/full.rs) is an in-process tokio_cron_scheduler, persisting jobs to a local file, not a distributed workflow engine. Non-interactive execution is goose run (instruction file or stdin, --output-format text|json|stream-json), and goose acp / goose serve expose goose as an Agent Client Protocol server over stdio or HTTP/WebSocket for editor-style integration.

Deployment shape: curl-pipe-bash installer for the CLI (download_cli.sh), packaged desktop builds (DEB/RPM/Flatpak/dmg/exe), and a Dockerfile for containerised runs, but no Helm chart or Kubernetes manifest, it is not designed to run as a service in a cluster.

## 4. UX
Onboarding (from goose-docs.ai/docs/quickstart, fetched 2026-09-29): install (download or one-line curl script), configure a provider (goose configure walks a numbered menu; the desktop welcome screen defaults to a hosted router with $10 free credit), start a session (goose session or the desktop Home screen), get a first result (a prompt like "build a tic-tac-toe game" produces working files directly), then optionally enable an extension through a settings toggle. That is about five steps to a first visible result, with in-app terminal menus for the CLI path; no product screenshots are embedded in the docs.

During a run, the user watches the same chat-style transcript familiar from any coding CLI, and intervenes through the mode dial: Approve and Smart Approve insert a yes/no prompt before tool calls, Auto runs unattended, Chat disables tool use entirely. The mode can be flipped mid-session (/mode auto|approve|smart_approve|chat in the CLI, a toggle in the desktop app). This is simpler than our console's queued/running/waiting/review states for one person driving one agent on one machine, but there is no multi-task board, no per-project cost view, and no team approval queue, Goose has no concept of a second person approving a first person's task.

## 5. Security, identity, sandbox, policy, cost
Sandbox: none by default. SECURITY.md tells the user directly to "use a dedicated virtual machine or container (Docker/Kubernetes) with limited privileged capabilities" themselves; Goose does not provide one. The agent runs as the inviting user's own OS process with that user's filesystem and shell access.

Identity: the human's own local API keys, stored via the keyring crate (OS credential store) or config file, read directly by the same process that executes model-driven tool calls. There is no separate, scoped, short-lived credential per task or per session.

Policy: enforcement is a local, per-user ToolPermissionStore (JSON file, hashed tool-plus-context, optional expiry) gated by GooseMode, whose default is Auto (the docs warn "Autonomous Mode is applied by default"), meaning out of the box there is no approval step at all. Smart Approve and the prompt-injection scanner add a risk classification, but that classification is itself partly an LLM call (permission_judge.rs, security/adversary_inspector.rs), not a code or network boundary.

Cost: none enforced. The CLI/desktop show token usage per session (canonical_cost.rs exists for cost accounting display) but there are no caps, holds or a ledger; spend is whatever the user's own provider key allows, with third-party router promos (e.g. Tetrate's $10 credit) as the only "limit" a new user sees.

## 6. What we should take from it
Narrow: the GooseMode autonomy dial and its mid-session /mode switch is a one-day feature that would let a human on our console dial a running task from "ask me everything" to "just go" without leaving the task view, cheaper than adding new kanban lanes. The atomic, hash-keyed, expiry-aware local permission store (permission_store.rs) is a clean pattern if we ever cache human tool-approval decisions anywhere. goose run --output-format stream-json plus the ACP server is worth a look purely as a second data point on what a structured (not scraped) headless agent interface should expose, useful when we evaluate Codex CLI as opencode's named successor behind our Harness interface.

Broad: recipes (versioned YAML workflows, shareable, with a size cap and schema validation before they can be scheduled) are a lightweight answer to "spec-driven intake", a gap we flag in our own weaknesses list; the recipe format itself, not Goose's execution of it, is worth reading before we design our own TaskBrief templates. The ACP protocol (also used by Zed and others) is becoming a de facto standard for editor-agent wiring and is worth tracking even though it solves a different problem than our Kubernetes-native worker plane.

## 7. Where our philosophy differs and what that costs or buys us
Goose optimises for a single developer's own machine with their own keys and full trust in themselves; our constraint is the opposite, agents get capabilities, never raw credentials, and every sandbox defaults to deny. Copying Goose's default (Auto mode, no sandbox, no scoped identity) would directly break our security-without-half-measures constraint; we keep our default-deny gVisor sandbox and per-task ServiceAccount at the cost of the friction Goose avoids for a lone user.

Goose's LLM-assisted permission judge is a reasonable second opinion for a tool with no other enforcement layer, but it is not a substitute for our "policy lives outside the model" principle. Where we already have gateway-enforced capability checks and network policy, adding an LLM classifier on top could only ever be an extra alert source in the event stream, never a gate; adopting it as a gate would reintroduce exactly the prompt-in-the-loop trust we designed policy-outside-the-model to avoid.

Their durable-state story (local JSON files, no distributed workflow engine) is fine for a single-machine assistant and would be a straightforward regression for us: we need the task registry to survive worker pod restarts, span multiple projects and multiple humans, and be re-seedable end to end, none of which a local cron-and-file scheduler provides.

## 8. Red flags and slop assessment
Maintenance is real: 54.8k stars, 6.3k forks, near-weekly releases, Linux Foundation governance since April 2026, dozens of provider integrations kept current. This is not a marketing-only project.

Security history is the concrete red flag. Block's own pre-launch red team ("Operation Palefire", disclosed on Block's engineering blog in January 2026) used an invisible-Unicode prompt injection in a calendar invite and in a shared "recipe" to compromise a real employee's laptop; the recipe attack got past goose's own security controls before Block's detection team caught the payload. In September 2026, two CVEs were published: CVE-2026-85623 (CVSS 8.8, arbitrary command execution through malicious recipe extensions or retry checks, patch version disputed between sources) and CVE-2026-72718 (code execution through goose review trusting a repository's own .git/config, fixed in 1.44.0). A third, unconfirmed report (GitHub issue #12566) describes the developer shell tool executing model-supplied commands with no sandbox at all, filed within the last day of this research and still awaiting a CVE. None of this means the project is abandoned or dishonest, SECURITY.md is candid that the user must supply their own VM or container isolation, but it does mean "run untrusted recipes" and "run on your own machine with your own keys" carry real, demonstrated risk, exactly the gap our sandboxed, policy-outside-the-model design exists to close.

## 9. Sources
- https://github.com/block/goose (redirects to https://github.com/aaif-goose/goose), read via gh api repos/block/goose, 2026-09-29
- market-research-clones/goose (shallow clone of https://github.com/block/goose, HEAD at aaif-goose/goose main, cloned 2026-09-29)
- market-research-clones/goose/README.md
- market-research-clones/goose/AGENTS.md
- market-research-clones/goose/CONTRIBUTING.md
- market-research-clones/goose/GOVERNANCE.md
- market-research-clones/goose/MAINTAINERS.md
- market-research-clones/goose/SECURITY.md
- market-research-clones/goose/Cargo.toml
- market-research-clones/goose/crates/goose/src/permission/permission_judge.rs
- market-research-clones/goose/crates/goose/src/permission/permission_store.rs
- market-research-clones/goose/crates/goose/src/security/mod.rs
- market-research-clones/goose/crates/goose/src/security/egress_inspector.rs
- market-research-clones/goose/crates/goose/src/scheduler/full.rs
- market-research-clones/goose/crates/goose/src/gateway/mod.rs (chat-platform pairing, not a model gateway)
- market-research-clones/goose/crates/goose/src/recipe/ (directory listing)
- market-research-clones/goose/crates/goose/src/providers/ (directory listing, 59 files)
- market-research-clones/goose/crates/goose-provider-types/src/goose_mode.rs
- market-research-clones/goose/crates/goose-cli/src/cli.rs (Command enum, OutputOptions)
- market-research-clones/goose/documentation/docs/guides/managing-tools/goose-permissions.md
- https://goose-docs.ai/docs/quickstart, fetched 2026-09-29
- https://block.github.io/goose/, fetched 2026-09-29, confirmed dead, redirects to goose-docs.ai
- WebSearch: Goose AI agent Block Agentic AI Foundation Linux Foundation 2026, 2026-09-29
- WebSearch: Goose AI agent Block security vulnerability prompt injection incident, 2026-09-29
- https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation
- https://goose-docs.ai/blog/2026/04/07/goose-moves-to-aaif/
- https://engineering.block.xyz/blog/how-we-red-teamed-our-own-ai-agent- (Operation Palefire)
- https://www.strix.ai/cve/CVE-2026-85623 and https://app.opencve.io/cve/CVE-2026-85623
- https://github.com/aaif-goose/goose/issues/12566
