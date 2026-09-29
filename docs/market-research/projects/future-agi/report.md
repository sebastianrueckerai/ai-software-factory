---
name: Future AGI
slug: future-agi
url: https://futureagi.com
repo: https://github.com/future-agi/future-agi
category: observability-evals
license: "mixed: Apache-2.0 core, proprietary Future AGI Enterprise License 1.0 for ee/ directories"
open_source: partial
self_hostable: yes
hosting_model: self-hosted (Docker Compose, ~13 default services, 31 with optional add-ons) or managed cloud with SOC 2 and HIPAA claims
company: Future AGI, Inc., founded 2024, Mountain View/SF. Raised $1.6M pre-seed Feb 2025 (Powerhouse Ventures, Snow Leopard Ventures). Roughly 15-20 named contributors visible in commit history.
maturity: 2094 GitHub stars, 656 forks, 66 contributors, first public commit 2026-04-23 ("Initial Commit", 1.5M lines), 6610 commits since, last commit 2026-09-28, near-daily releases
similarity: 1
axes:
  signals_intake: 1
  control_plane: 1
  sandbox_isolation: 2
  verification: 2
  policy_outside_model: 2
  identity_per_task: 1
  cost_control: 2
  ux: 3
  reseedable_selfhost: 2
steal:
  - "Virtual API keys as a first-class object (agentcc-gateway/internal/auth/keystore.go): each key carries its own model/provider/IP/tool allow-lists, RPM/TPM limits and a microdollar credit balance, so a caller gets a scoped, revocable identity instead of a raw provider key. This is close to what identity-per-task should look like at the gateway edge."
  - "CONTRIBUTION_POLICY.md forces an explicit AI-disclosure line on every PR ('AI use: none / assisted / generated') and states unattended-agent-authored PRs are closed on sight unless disclosed and reviewed by a human. A cheap, enforceable norm for a project that itself uses agents to build itself."
  - "Committed .claude/skills/ and .agents/skills/ directories (writing-e2e-flows, reviewing-prs) ship the project's own working conventions as files agents read, not tribal knowledge. Same idea we use, worth comparing our skill set against theirs for gaps."
  - "nsjail-based short-lived code sandbox (futureagi/code-executor/server.py) is a much lighter mechanism than a full per-task pod for narrow, bounded jobs (one Python/JS function, one evaluation): rlimit_as, rlimit_cpu, rlimit_fsize, time_limit, read-only root bind, tmpfs /tmp. Worth having as a cheap option for short evaluator-style tasks that do not need a whole gVisor pod."
  - "A public roadmap plus GitHub Discussions roadmap category gives outside users a visible backlog and a low-cost way to signal demand, which doubles as portfolio evidence of an active project."
  - "SECURITY.md pins a HackerOne bounty, a PGP key and a response-time table by severity, and explicitly lists agentcc-gateway/ as in scope. A short, concrete template for our own security policy page."
differs:
  - "Default-allow egress: the nsjail sandbox passes -N (network allowed) for both Python and JS evaluator code, and falls back to a plain, unsandboxed subprocess.run when nsjail is missing (futureagi/code-executor/server.py, lines 361-364). Our default-deny-egress, gVisor-pod-per-task model exists specifically to rule this out; adopting their shortcut would reopen the exfiltration path our design closes."
  - "Cost control is check-then-deduct, not hold-then-book: agentcc-gateway/internal/plugins/credits/credits.go blocks a request only if balance is already <= 0 before the call, then deducts the real cost afterwards. The ForceDeductMicros post-request path has a comment admitting the balance can go negative between the pre-check and the deduction ('spend must be recorded even if balance dropped to zero between pre-check and now'). Our hold-then-book model reserves the spend before the call precisely to avoid this race; theirs is simpler and admits the trade-off in its own code."
  - "Open-core gating sits inside self-hosted deployments, not just around the cloud offering: LICENSE-EE covers the ee/ directory (voice-agent simulation, agenthub specialized evaluator agents, some scanners), and code there needs a paid Enterprise subscription for production use even when self-hosted. Our one-licence, no-holdback stance means every self-hosted capability is actually available, at the cost of not having an enterprise-tier revenue lever."
  - "Their five-stage PR review pipeline, including a second-model check, governs contributions to their own product, not an end-user-facing 'agent opens PRs against your repo' capability. It is a development-process pattern we could borrow the shape of, but it is not the verification plane our factory needs: it never touches a customer's codebase."
ux_verdict: "Fast to a first trace (SDK install plus a few lines of instrumentation code) with a real, screenshot-documented dashboard, but the product is an observability console you watch after the fact, not a console for approving or steering an agent while it works."
slop_verdict: "Not slop. A real, large, actively developed product (2,939 frontend files, 1,187 backend test files, 52 e2e specs, a live security bounty) built by a small named team since an April 2026 open-sourcing of an already 2024-founded, funded platform, but its marketing outruns its code in specific, checkable places: two of six routing strategies are broken or unwired, a benchmark directory the README links to twice does not exist in the repo, and these gaps are already the subject of open GitHub issues filed by an outside user on the same day as this review."
---

# Future AGI

## 1. What it is
Future AGI is an LLM observability, evaluation and optimisation platform: tracing, automated evals, guardrails, prompt management and agent-simulation testing, sold as a managed cloud product with a self-hostable Apache-2.0 core. The company (Future AGI, Inc., founded 2024, Mountain View/SF, $1.6M pre-seed February 2025) open-sourced the whole monorepo on 2026-04-23 with a single 1.5-million-line "Initial Commit," then kept committing at a near-daily pace (6,610 commits from roughly 15-20 named contributors by 2026-09-28). It positions itself against Langfuse, Phoenix, Braintrust and Helicone in its own README comparison table, claiming parity or an edge on breadth of eval metrics, an LLM gateway, and voice-agent simulation.

The README claims a full "trace, evaluate, protect, optimise" loop with 50+ built-in evaluation metrics, guardrails, prompt optimisation and multi-turn agent simulation, all usable self-hosted. The repository backs most of this: real Django/Celery/ClickHouse services, a separate Go gateway (agentcc-gateway) with genuine virtual-key and guardrail machinery, and thousands of tests. But specific marketing claims do not match the code: two of its advertised routing strategies do nothing useful, and a benchmark-reproduction directory the README links to does not exist (see section 8).

## 2. Mapping to our five planes

| Plane / principle | What Future AGI does | What we do | Verdict |
|---|---|---|---|
| Signals | None. It has no issue/alert/telemetry intake that turns external signals into agent work; it is the thing that produces telemetry for others to act on. | Issues, telemetry and alerts feed a durable control plane that spawns work. | not comparable |
| Control plane | Django app tracks projects, datasets, eval runs and prompt experiments as durable rows; async jobs run evals and syncs. No concept of an autonomous coding task, approval queue or scheduler for agent work. | Durable task state, scheduler, policy, approvals, model choice, cost and audit for agent-driven work. | not comparable |
| Worker plane | agentcc-gateway routes and meters LLM calls; futureagi/code-executor runs short evaluator scripts in nsjail with network allowed. No disposable per-task workspace or coding agent. | Ephemeral per-task sandboxes (gVisor pods), constrained default-deny network, temporary credentials. | we lead |
| Verification | CI runs their own test suite and a "second model" review on their own PRs (CONTRIBUTION_POLICY.md); this verifies contributions to Future AGI itself, not a customer's agent output. Evals/guardrails can score a customer's LLM outputs after the fact. | Tests, security, stronger-model review and policy evaluation gate merge/deploy of agent-produced changes. | not comparable |
| Merge and deploy | N/A: the product does not merge or deploy anything on a user's behalf. | Verified artifacts are merged and deployed automatically. | not comparable |
| Policy outside the model | agentcc-gateway/internal/guardrails/ implements PII, secrets, injection, topic, blocklist and MCP tool-permission checks in Go, outside any LLM prompt. Real and enforced in code. | Capability rules enforced in code/network, not prompts. | equal |
| Identity per task | Virtual API keys (internal/auth/keystore.go) scope a caller to specific models/providers/IPs/tools with rate limits and a credit balance. Good identity model for a gateway call, but there is no "task" concept to bind identity to; a key is a client, not a unit of agent work. | Short-lived, task-scoped credentials; identity belongs to the task, not the machine. | not comparable |
| Artifacts not chat | Traces and eval results are structured artifacts (spans, scores, datasets); the product's job is to consume artifacts other systems produce, not exchange them between agents. | Agents exchange artifacts, not chat, as the unit of work. | not comparable |

## 3. Architecture and stack
Top-level layout (from `find . -maxdepth 2 -type d` in the clone): `futureagi/` (the Django monolith, ~28 subdirectories including `ee/`), `agentcc-gateway/` (Go LLM gateway), `frontend/` (React 18.2 + Vite SPA, 2,939 `.jsx`/`.tsx` files), `fi-collector/`, `api_contracts/`, `docs/`, `e2e/` (Playwright-style specs, 52 files across gateway/auth/evals/alerts/observe/settings/prompts/dashboards/datasets/annotations), `.agents/skills/` and `.claude/skills/` (mirrored, `writing-e2e-flows` and `reviewing-prs`), `deploy/`, `scripts/`, `bin/`.

Backend: Django 5.1.8 (`futureagi/requirements.txt`, `uv export`-generated) with Django Channels, ClickHouse for trace/eval storage, RabbitMQ and Redis for async work, MinIO for object storage, PeerDB for CDC replication. `docker-compose.yml` defines roughly 13 default services and up to 31 with optional add-ons (self-hosting docs figure, corroborated by a raw grep count of 52 top-level service-shaped keys in the compose file, which includes profile-gated extras).

Gateway: `agentcc-gateway`, a standalone Go 1.25.0 binary (`go.mod`: gorilla/websocket, oklog/ulid, redis/go-redis, OTel proto, protobuf, yaml.v3). It fronts model calls with routing strategies (`internal/routing/`), a plugin pipeline (auth, cost, credits, guardrails) and a large `internal/guardrails/` package (pii, secrets, injection, topic, blocklist, mcpsec, toolperm, webhook, hallucination, leakage, contentmod, language, sysprompt, expression, external).

Sandboxing for evaluator code: `futureagi/code-executor/server.py`, a Falcon HTTP service. When nsjail is available it runs Python/JS in nsjail with `--rlimit_as 1024` (1GB), `--rlimit_cpu`/`--time_limit` set to the caller's timeout, `--rlimit_fsize 1` (1MB writes), `--rlimit_nofile 64`, `-N` (network allowed), `-R /` (read-only root bind) and a 16MB writable tmpfs at `/tmp`. When nsjail is absent it falls through to a bare `subprocess.run` with no sandboxing at all (lines 361-364).

Enterprise-gated code lives under `futureagi/ee/`: `agenthub` (2.9M, ~20 specialised evaluator/optimiser agents such as `rag_eval_agent`, `prompt_optimizer_agent`, `cluster_rca`, `scenario_graph`), `voice` (1.2M, `vapi_service.py`, `retell_service.py`, `livekit/`, `bland_service.py`, voice-agent simulation), `usage` (852K), `falcon_ai` (808K), `evals` (508K, additional LLM/ranking/localizer evaluators), `licensing` (148K, the activation client), `protect` (12K). `futureagi/ee/licensing/activation_client.py` (~150 lines) implements a self-hosted "managed AI" activation flow that calls `https://api.futureagi.com/v1/self-hosted/activations` on startup but is written to degrade gracefully and "never block startup" if that call fails.

This is inference from the README plus source for the module list: the docs architecture page names `model_hub`, `tracer` and `accounts` as further backend modules; I did not read their source directly and mark that as not verified beyond the directory names.

## 4. UX
Cloud path to a first result: sign up, `pip install ai-evaluation` (or the equivalent JS/TS SDK), add an `instrument()`/tracer-registration call plus normal LLM calls, and a trace appears in the dashboard. The README and docs quickstart put this at roughly 3-4 steps and a few minutes, backed by copy-pasteable code blocks rather than a wizard.

Self-hosted path: `git clone`, run the provided install script, `docker compose up`, open `localhost:3000`. Three commands to a running stack, but the stack itself is roughly 13-31 containers, so "zero to first result" is fast to type and slow to actually converge (image pulls, service startup, migrations).

Interfaces: a web dashboard (traces, datasets, eval runs, prompt playground, guardrail config), REST/SDK API, and the agentcc-gateway's own OpenAI-compatible HTTP endpoint. There is no CLI-first or chat-first workflow; everything funnels through the web console or the SDK. Screenshots on the marketing site show a trace waterfall view, an eval-score table per dataset row, and a prompt-comparison side-by-side, consistent with an "observe after the fact" tool rather than a live agent-steering console: a user watches traces and scores accumulate, and intervenes by editing prompts, adjusting guardrail rules or changing gateway routing config, not by approving or pausing an in-flight agent task.

## 5. Security, identity, sandbox, policy, cost
Security: a HackerOne-run bounty program with a PGP key and a documented severity/response-time table (`SECURITY.md`); `agentcc-gateway/` is explicitly in scope. This is a real, externally-facing program, not a placeholder.

Identity: the gateway's virtual API keys (`internal/auth/keystore.go`, `APIKey` struct, lines ~23-53) are the closest thing to task-scoped identity in the product: each key can be pinned to specific providers/models, IP ranges and tools, with its own rate limits and balance. There is no broader concept of identity belonging to a unit of agent work, because the product has no such unit.

Sandbox: nsjail wraps short evaluator scripts with real resource limits (see section 3), but allows outbound network by default (`-N`) and silently degrades to no sandbox at all when nsjail is not installed on the host. Blast radius is small (one function, one evaluation call) but the network-allow default and the unguarded fallback are real weaknesses if this ever runs less-trusted code than "a user's own eval function."

Policy: real guardrail enforcement in Go, outside the model, covering PII, secrets, prompt injection, topic and content moderation, MCP tool permissions and webhook validation (`agentcc-gateway/internal/guardrails/`). This is enforced as request-pipeline plugins, not left to prompt instructions.

Cost: the credits plugin (`internal/plugins/credits/credits.go`) blocks a request pre-call if balance is already zero or negative, then deducts the real cost post-call, with a Redis-backed path for cross-replica consistency. Its own comment on `ForceDeductMicros` acknowledges the balance can be driven negative in the gap between the pre-check and the deduction. This is a check-then-deduct model, not a hold-then-book one: a burst of concurrent requests against a low balance can overspend before the check catches up.

## 6. What we should take from it
Narrow: the virtual-API-key shape in `keystore.go` (provider/model/IP/tool allow-lists plus RPM/TPM plus a credit balance on one object) is a clean, small pattern for a gateway-level credential if we ever want a lighter-weight alternative to full per-task minted credentials for outbound LLM calls specifically. The nsjail sandbox config (the exact rlimit/time_limit/tmpfs flags in `code-executor/server.py`) is a usable reference for isolating short, narrow jobs (a single scoring function) more cheaply than a full pod, provided we flip `-N` to deny network by default.

Broad: their AI-disclosure PR policy (`CONTRIBUTION_POLICY.md`) is a cheap governance pattern worth adopting verbatim for our own contribution rules, since we are also a project that uses agents to build itself. Their public roadmap and Discussions-based backlog is a low-cost way to make an autonomous project look alive to outside observers, which matters for a portfolio project. Their committed `.claude/skills/`/`.agents/skills/` convention validates that shipping project-specific agent instructions as files in the repo, rather than only in an external wiki, is a pattern worth comparing our own skill set against for gaps.

## 7. Where our philosophy differs and what that costs or buys us
Default-allow network in their sandbox (`-N`) directly contradicts our default-deny-egress constraint; we would not adopt this even though it is simpler, because it reopens the exfiltration path our sandbox design exists to close. Their check-then-deduct cost control is simpler to implement than our hold-then-book model and is "good enough" for a product whose blast radius per request is one LLM call costing cents, but our factory holds real compute and merge authority per task, where a TOCTOU overspend or overrun is a materially worse failure; we pay the extra complexity of a two-phase commit deliberately. Their open-core split (Apache core, paid `ee/` for voice simulation and agenthub evaluators even in self-hosted production) buys them a monetisation lever we deliberately forgo under our one-licence, no-holdback stance; the cost to us is no enterprise-tier revenue path, the benefit is that nothing we ship is fenced off from someone who self-hosts it.

## 8. Red flags and slop assessment
Not slop by any structural measure: a single large "Initial Commit" (1.5M lines) is consistent with open-sourcing an already-built, privately-developed 2024-founded product, not with bulk-generated filler, and it is followed by 6,610 further commits from roughly 15-20 consistently-named contributors over five months, 2,939 frontend files, 1,187 backend test files (1,076 outside `ee/`, 111 inside), 52 end-to-end specs, and a live HackerOne bounty program. Star count (2,094) and contributor count (66) show no evidence of a purchased or botted spike; the one internal inconsistency found was the homepage itself quoting two different star counts (2,094 in one place, 986 in another), which reflects sloppy marketing-page upkeep rather than a fake repository.

Marketing does outrun the code in specific, verifiable places. `agentcc-gateway/internal/routing/costopt.go`'s "cost-optimized" strategy sorts only by a static `Priority` field on each `RoutingTarget` and never looks at actual price or latency (lines 18-38). `internal/routing/strategy.go`'s `NewStrategy` factory returns `NewRoundRobin()` for both `"adaptive"` and `"fastest"` (lines 29-36), with a comment claiming "the actual adaptive strategy is injected by the server during init" that does not happen anywhere else in the codebase (confirmed by grep); a real `AdaptiveStrategy` implementation exists in `adaptive.go` but is never wired into the request path. The README's "Reproduce the benchmarks" section references a `bench/` directory (`Dockerfile.bench`, `mock-upstream.go`, `run.sh`, config YAMLs) that does not exist anywhere in the repository. All three gaps are corroborated by open GitHub issues filed by an external user (`wankhede04`) on 2026-09-29, the same day as this review, meaning the discrepancy between README and code is not a stale artefact but a currently-live complaint from a real user trying to use the advertised features.

The self-hosting docs do not disclose the `ee/` licence carve-out; a self-hoster following the docs would not learn that the voice-simulation and agenthub evaluator features they see in the code require a paid Enterprise subscription for production use until they read `LICENSE-EE` directly or hit a licence check at runtime. No independent, neutral third-party review exists: the only outside coverage found is one security-focused trade article (Help Net Security) and a small G2 page (12 reviews, 4.8/5); every "Future AGI vs Langfuse/Braintrust/Helicone" comparison found online is vendor-authored, by Future AGI or a competitor.

## 9. Sources
https://github.com/future-agi/future-agi (clone: /home/womb/repos/market-research-clones/future-agi, git log -1 --format='%ci' = 2026-09-28 22:17:58 +0530)
gh api repos/future-agi/future-agi
gh api --method GET repos/future-agi/future-agi/issues?state=open&per_page=20
gh api repos/future-agi/future-agi/contributors?per_page=100&page=1
gh api repos/future-agi/future-agi/contributors?per_page=100&page=2
README.md (root, full)
LICENSE (Apache-2.0)
LICENSE-EE (Future AGI Enterprise License 1.0, full)
NOTICE
CONTRIBUTING.md (partial)
CONTRIBUTION_POLICY.md (full)
SECURITY.md (full)
docker-compose.yml
futureagi/requirements.txt
frontend/package.json
agentcc-gateway/README.md
agentcc-gateway/go.mod
agentcc-gateway/internal/routing/costopt.go (full)
agentcc-gateway/internal/routing/adaptive.go (full)
agentcc-gateway/internal/routing/strategy.go (full)
agentcc-gateway/internal/auth/keystore.go
agentcc-gateway/internal/plugins/credits/credits.go (full)
agentcc-gateway/internal/guardrails/ (directory listing)
futureagi/ee/licensing/activation_client.py (full)
futureagi/ee/licensing/ (directory listing)
futureagi/code-executor/server.py (full)
futureagi/ee/ subdirectory sizes and listing (agenthub, voice, usage, falcon_ai, evals, tests, agent_opt, licensing, experiments, prompts, requirements.txt, turing, protect)
futureagi/agentic_eval/ (directory listing)
.agents/skills/writing-e2e-flows/, .agents/skills/reviewing-prs/ and references/ subfiles (listing)
.claude/skills/writing-e2e-flows, .claude/skills/reviewing-prs (listing)
e2e/flows/ and e2e/ spec counts by area
WebFetch/WebSearch: futureagi.com homepage, futureagi.com/docs (architecture, self-hosting, security, pricing, enterprise pages), changelog/blog pages, star-history.com (aggregate only, weekly curve not obtained), G2 review page for Future AGI, Help Net Security article, Crunchbase/Tracxn/PitchBook funding summaries, "Future AGI vs Langfuse/Braintrust/Helicone" vendor comparison pages
