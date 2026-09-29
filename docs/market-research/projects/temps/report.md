---
name: Temps
slug: temps
url: https://temps.sh
repo: https://github.com/gotempsh/temps
category: telemetry-to-fix
license: "mixed: MIT OR Apache-2.0 (dual, per LICENSE/LICENSE-MIT/NOTICE); GitHub API reports the single value apache-2.0"
open_source: yes
self_hostable: yes
hosting_model: self-hosted single Rust binary (free forever); optional paid Temps Cloud control plane and a flat-fee Premium self-hosted EE tier
company: no company, funding, HQ or leadership information published; contact is a web form; copyright line reads "Temps Contributors"
maturity: created 2025-10-21, 807 stars, 66 forks, 13 open issues, 17 contributors (one author, dviejokfs, holds 2070 commits against 47 for the next-highest human), 165 tagged releases all v0.1.0-nightly.YYYYMMDD.<sha> with no stable v1.0, last commit and last release both 2026-09-29
similarity: 3
axes:
  signals_intake: 3
  control_plane: 2
  sandbox_isolation: 4
  verification: 1
  policy_outside_model: 3
  identity_per_task: 2
  cost_control: 1
  ux: 3
  reseedable_selfhost: 4
steal:
  - The non-root, capability-free Node.js egress-proxy sidecar embedded as a single Rust string constant (SANDBOX_EGRESS_PROXY_SCRIPT in crates/temps-agents/src/sandbox/docker.rs) that is a sandboxed agent's only route out: blocks private/link-local/cloud-metadata IPs including 169.254.0.0/16, resolves DNS once and connects to the resolved IP to defeat rebinding, and allowlists ports 80/443 only.
  - Phase-gating enforced in the service layer, not the UI: run_fix_inner checks run.phase == "analyzed" and create_pr checks run.phase == "fix_ready", each returning AgentError::Validation otherwise, so an approval cannot be skipped by calling the API out of order.
  - For non-continuable CLI providers (Codex, OpenCode), the prior analysis is re-injected into the fix prompt explicitly marked as untrusted input, a deliberate prompt-injection defence at a phase boundary that Claude's own --continue session carries implicitly.
  - refuse_granted_project_push, a defense-in-depth guard re-checked at every git-push call site even when an earlier check already ran, justified in a code comment as "the failure mode this guard family has hit four times already" -- an incident-driven pattern worth copying literally.
  - Shipping the product's own control surface as 440+ CLI operations mirrored into Claude Code/Codex/OpenCode-compatible "skills" plus an MCP server, so an agent drives the platform through the same interface a human's CLI would, instead of a bespoke tool schema bolted on afterwards.
differs:
  - The credential that drives the coding CLI itself (ANTHROPIC_API_KEY, CLAUDE_CODE_OAUTH_TOKEN) is decrypted and injected as a real, usable plaintext value into the sandbox environment in executor.rs::prepare_sandbox_workspace, and ai_cli/claude.rs copies it straight into the child process with no ANTHROPIC_BASE_URL redirection to the egress proxy's model-relay; the phantom-credential design in ADR-013 is real for a different surface (the customer-facing AI Gateway/sandbox product) but not for the harness's own driving key, unlike our identity-belongs-to-the-task rule.
ux_verdict: "A standard Sentry-style error list is one click from a project dashboard, but the analyse/fix/PR buttons and any live reasoning view live one screen deeper than the screenshots this survey captured, and the flow is undocumented outside the source: it appears in no public doc page and the word autofix appears nowhere in the README or the homepage."
slop_verdict: "Real, huge and committed to daily, not a README with a landing page, but it is an 11-month-old, pre-1.0, effectively one-person project (2070 commits against 47 for the next human) with zero independent reviews found anywhere and one public user report of undocumented rough edges."
---

# Temps

## 1. What it is

Temps is a single self-hosted Rust binary that bundles deploys, web analytics, session replay, error tracking, OpenTelemetry observability, uptime monitoring, managed databases, transactional email and AI code sandboxes into one platform. The README and homepage pitch it as a consolidation play: "Stop paying for 7 SaaS tools," naming Vercel, Sentry, PostHog, Pingdom, Resend and E2B as the products it replaces. It is built by a small, GitHub-first open-source community and sold with no company, funding or leadership page found anywhere; the copyright line reads "Temps Contributors" and contact is a web form.

The feature this task asked about, an error-tracker that opens a PR in an analysis phase and a separately approved fix phase, exists and works largely as hinted, but it is not customer-facing marketing. Neither the README nor the homepage nor the public docs page for error tracking (docs/features/error-tracking/page.mdx) use the word "autofix" or describe the phase split. The only complete description of the mechanism is the source code: crates/temps-agents/src/services/autofixer.rs and crates/temps-agents/src/handlers/autofixer.rs. Per docs/adr/023-ai-debugging-conversations.md, this Autofixer is explicitly open-source and un-gated, distinct from a separate, more autonomous EE "proactive investigator" chat feature (Feature::AiSre).

## 2. Mapping to our five planes

| Plane or principle | What Temps does | What we do | Verdict |
|---|---|---|---|
| Signals | Errors ingested through a Sentry-compatible DSN populate an error-groups list; a human opens a group and clicks to start analysis. Cron-based agent triggers exist for the general workflow engine (cooldowns, concurrency and daily-budget gates in crates/temps-agents/src/plugin.rs), but the autofixer path itself is human-initiated per error, not auto-triggered by severity. | Forgejo issues and SigNoz alerts become tasks via webhook and intake API; a human or an alert rule creates the issue. | Equal. Neither auto-triggers a fix from telemetry alone; both still route through a person opening a work item. |
| Control plane | Run state is a Postgres row (agent_runs) with a phase column (analyzing -> analyzed -> fixing -> fix_ready -> pushing -> completed, or failed/no_fix/cancelled) advanced by in-process tokio tasks spawned per request; there is no durable workflow engine, so a server restart mid-phase has no re-attach path beyond what the phase column and on-disk workdir preserve. | Temporal workflow per task, Postgres task registry, policy in Git, full audit trail. | We lead. A durable workflow engine survives a crash mid-task; a phase column in a database does not resume itself. |
| Worker plane | Docker (default) or Firecracker microVM (crates/temps-agents/src/sandbox/firecracker.rs, ADR-029, confirmed shipped via CHANGELOG.md) sandboxes run the AI CLI (claude_cli, codex_cli or opencode) against a workspace clone, behind an internal-only Docker network with a single egress-proxy sidecar as the only route out. | One gVisor pod per task, read-only root filesystem, default-deny egress, opencode-based harness. | Equal to we-lead. Firecracker is a stronger isolation primitive than gVisor for a shared host, but the coding CLI's own provider key sits in that sandbox's plaintext environment (see axis 5), which we do not allow. |
| Verification | The fix prompt instructs the AI to "write a test that would have caught this bug" and "run existing tests if they exist" (autofixer.rs, phase-2 prompt), but this is a prompt instruction to the model, not an independent gate: no code path re-runs tests or checks a diff before create_pr. Verification is whatever CI the target repository itself runs on the opened PR. | Forgejo Actions on gVisor runners, a reproduction gate requiring the change to fail at base and pass at head, stronger-model review, verdict-gated auto-merge for low-risk cases. | We lead. A prompt instruction to run tests is not evidence that they ran. |
| Merge and deploy | create_pr opens a PR and stops; a human merges through the forge's own review. The call is idempotent and phase-checked to survive a double-click or a race. | Bot merge after approval or an auto rule for reproduced low-risk changes, Flux deploy, staged rollout with an alert-wait window. | Not comparable. Temps never merges or deploys the fix itself. |
| Policy outside the model | permission_guard! macros (ProjectsRead/ProjectsWrite) gate every autofixer endpoint in code, checked before a model call; refuse_granted_project_push blocks pushes from any project that was granted host Docker-socket access, re-checked at every push call site. | Capability rules live as a document in Git, enforced in gateway code and NetworkPolicy. | Equal. Both enforce capability in code; ours is additionally a document a non-engineer can read. |
| Identity per task | TEMPS_API_TOKEN is genuinely per-run: minted by issue_run_token with a lifetime capped to the run's timeout plus a 120-second buffer, tracked per run_id, and explicitly revoked by revoke_run_token on every exit path (success, no_fix, and per the code's own doc comment, "at every exit path"). The AI provider's own driving credential is not scoped this way; see the differs item. | A projected, audience-scoped, per-task ServiceAccount token; short-lived, per-session forge tokens held only around the run. | Mixed. Their control-plane API token matches our principle closely; their model-provider credential does not. |
| Artifacts not chat | Analysis and fix are structured phases (analysis text, a diff, a PR) passed through the run row, but a separate always-on AI chat and MCP interface also exist as first-class surfaces for the broader platform. | A TaskBrief in, a branch, PR and event stream out, no chat surface. | Not comparable. The autofixer path matches our principle; the platform around it deliberately also ships chat. |

## 3. Architecture and stack

Temps is a large Rust workspace (90-plus crates under crates/, the README's own "30+" undercounts what is on disk) on Axum, Sea-ORM, Pingora (Cloudflare's own reverse-proxy engine) and Bollard (the Docker Engine API client), with a React 19 + TypeScript + Tailwind + shadcn/ui frontend and PostgreSQL plus TimescaleDB for storage. It ships as one binary via a curl-piped install script (temps.sh/deploy.sh), with a docker-compose path also present in the repo.

The autofixer's own code lives in crates/temps-agents/src/services/autofixer.rs (1850 lines) and crates/temps-agents/src/handlers/autofixer.rs (1041 lines). run_analysis/run_analysis_inner builds a read-only investigation prompt and runs the configured provider CLI (claude_cli, codex_cli or opencode, catalog in crates/temps-agents/src/ai_cli/{catalog,claude,codex,mod}.rs) inside a sandbox clone of the repository; the result is stored and the run's phase moves to analyzed. run_fix/run_fix_inner requires phase == "analyzed", then re-runs a CLI session with the analysis as context (Claude resumes the same session via --continue; Codex and OpenCode get a fresh prompt with the analysis text marked explicitly untrusted, a prompt-injection defence for providers that cannot verify who wrote a continued transcript) and moves the phase to fix_ready. create_pr requires phase == "fix_ready", pushes the branch and opens the PR via the project's stored git connection.

Every autofixer action is wrapped in AuditOperation implementations (AutofixerStartAudit, AutofixerFixAudit, AutofixerPrAudit) persisted through app_state.audit_service.create_audit_log(), capturing user_id, ip, user_agent and operation-specific fields, plus a TelemetryEvent (temps_core::TelemetryEventKind::AutofixerFixAccepted and similar). No hash-chaining of these logs was found in the OSS crates; the security page states hash-chained audit logs are an Enterprise-only add-on, consistent with a plain OSS log plus a paid tamper-evidence layer rather than a contradiction.

Sandboxing is a SandboxProvider trait with three implementations: DockerSandboxProvider (default), LocalSandboxProvider (dev-only), and FirecrackerSandboxProvider (ADR-029; its header still says "Proposed" but CHANGELOG.md records "sandbox: Firecracker microVM backend alongside Docker (ADR-029)" as shipped, and crates/temps-agents/src/sandbox/firecracker.rs and routing.rs exist on disk -- the ADR status label lags the shipped code, an inference from cross-referencing, not a maintainer statement). Sandbox networking is an internal-only Docker bridge (SANDBOX_NETWORK_PREFIX, versioned to force internal: true on upgrade) with a single non-root, capability-free Node.js egress-proxy sidecar, embedded verbatim as the SANDBOX_EGRESS_PROXY_SCRIPT constant in docker.rs, as the sandbox's only path to the internet. It blocks private, link-local and cloud-metadata addresses (169.254.0.0/16 explicitly named), resolves DNS once and connects to the resolved IP to stop rebinding, allowlists ports 80/443, and forwards model and MCP calls through capability-scoped opaque-token relay paths (a /.temps/model-relay/{token}/... path and a /.temps/mcp/{token} path) that keep the real provider credential server-side for that traffic class. A git-push relay path in the same script is explicitly stubbed to fail closed, with the comment "Fail closed until the control plane issues and the sidecar verifies a credential that is independent of the relay URL and Host header" -- a named, incomplete feature, not a gap I inferred.

That relay pattern, however, is not what drives the coding CLI itself. crates/temps-agents/src/services/executor.rs::prepare_sandbox_workspace decrypts the configured provider credential (provider_cfg.credentials_encrypted) and, for the ApiKey credential format, inserts it directly into the sandbox environment (sandbox_env.insert(env_var.to_string(), key), falling back to ANTHROPIC_API_KEY on an unknown provider/auth_type). crates/temps-agents/src/ai_cli/claude.rs then copies ANTHROPIC_API_KEY straight into the child process (three separate cmd.env("ANTHROPIC_API_KEY", &config.api_key) call sites) with no ANTHROPIC_BASE_URL override found anywhere in that file or elsewhere in crates/temps-agents/src outside the egress-proxy script's own internal routing table. The sandboxed coding-agent process therefore holds a real, directly usable provider secret in its own environment for the duration of the run.

## 4. UX

A user reaches an error group from Projects, then a project, then Error Tracking: a Sentry-shaped list (assets/screenshots/errors-light.png shows event counts, unresolved/resolved tabs, and per-group last-seen timestamps). The screenshots available in this clone (assets/screenshots/, docs/screenshots/) stop at this list view; the per-error detail screen that must host the actual "start analysis," "start fix" and "create PR" controls (per the handler routes in handlers/autofixer.rs) was not captured in any image found, so the exact button labels and any live-reasoning view are not verified from screenshots, only from the API surface. No blog post, changelog entry or doc page was found describing this screen either.

Onboarding to the platform itself is a single curl-to-bash install or a docker-compose file, consistent with the "one binary" pitch; the homepage separately offers a free 30-minute "migration audit" for teams already spending $750+/month on the SaaS tools it replaces. Beyond the dashboard, the product also exposes 440+ CLI operations across 69 groups mirrored as Claude Code/Codex/OpenCode-compatible "skills" (skills/ directory) plus an MCP server (temps-mcp-server crate), so an agent can drive the whole platform, deploys included, without the web UI at all, a distribution choice we do not currently make.

## 5. Security, identity, sandbox, policy, cost

Sandbox isolation is the strongest part of the stack: Docker by default, Firecracker microVMs as a confirmed-shipped stronger option, both behind an internal-only network with a dedicated non-root, capability-free egress-proxy sidecar as the only route to the internet, blocking cloud metadata and private addresses and defeating DNS rebinding by resolving once and connecting to the resolved IP.

Credentials are split across two classes that get different treatment. The platform's own API token for a run (TEMPS_API_TOKEN) is genuinely per-task: minted with a capped lifetime and explicitly revoked on every exit path. The AI provider credential that drives the coding CLI is not: it is decrypted to plaintext and placed directly in the sandbox's environment variables, readable by the same process that is executing arbitrary AI-generated shell commands against a customer's error and code. The egress proxy's model-relay mechanism, which would keep that key server-side, exists in the codebase but was not found wired to the coding CLI's own invocation.

Policy enforcement is in code, not prompts, for authorisation: permission_guard! macros gate every autofixer endpoint by RBAC role, and refuse_granted_project_push is checked at every git-push call site as a named defense against a specific recurring failure mode. Verification of the fix's correctness is left to a prompt instruction ("run existing tests if they exist") and to whatever CI the target repository itself runs on the resulting PR; nothing in the autofixer's own code re-runs or checks tests before create_pr.

Cost control exists structurally but is not wired to real numbers. crates/temps-agents/src/plugin.rs enforces a daily per-project budget gate ("Gate 4: Daily budget check BEFORE creating run", checking whether the accumulated spend already meets or exceeds the project's configured daily_budget_cents) plus a cooldown gate and a concurrent-run limit gate, all checked before a run is created. However estimated_cost_cents is set to zero at every run-creation site in run_service.rs and autofixer.rs and no update call was found anywhere that ever raises it from zero, so the daily-spend sum always comes back zero and the budget gate can never trip in the code as shipped. This looks like a real gap between a designed control and its wiring, not a working spend cap.

## 6. What we should take from it

Narrow, copyable this month: the egress-proxy sidecar's specific defensive checklist, private and link-local and cloud-metadata IP blocking, resolve-once-connect-to-resolved-IP against DNS rebinding, and a strict port allowlist, is a compact, concrete reference implementation for the same job our own default-deny egress policy already does at the network layer; reading their Node.js script is a fast way to audit ours for a missed case, metadata IP handling especially. The phase-gate-in-code pattern, checking the stored phase server-side before allowing the next transition rather than just hiding a UI button, is a one-line-per-transition guard worth confirming we have at every one of our own approval boundaries. The untrusted-analysis re-injection for non-continuable providers is a specific, minority-case prompt-injection defence worth checking against our own multi-phase prompts wherever a phase boundary crosses a session that is not natively continued.

Broad, shapes priorities: Temps demonstrates that bundling a telemetry-to-fix loop inside a much larger self-hosted PaaS, rather than shipping it as a standalone product, is a viable go-to-market for a tiny team; it reaches 807 stars and daily nightly releases without any funding or company structure behind it. Its AI-legible distribution model, 440+ CLI operations mirrored as skills plus an MCP server so an agent is a first-class client of the same interface a human CLI uses, is a broader UX idea worth weighing for our own console: an agent-usable CLI surface, not just a human dashboard, lowers the cost of the next tool we bolt on.

## 7. Where our philosophy differs and what that costs or buys us

Temps places the coding CLI's real provider credential inside the sandbox it runs in, rather than routing model calls through a relay that keeps the key server-side. That trades a small amount of architectural complexity, no relay hop, no latency, works with any CLI's native auth flow unmodified, for exactly the property our identity-belongs-to-the-task principle exists to prevent: a compromised or malicious agent process can exfiltrate a real, live provider key. Their own ADR-013 proposes closing this gap and their egress proxy already supports the relay mechanism for a different traffic class; the coding harness's own credential is the one path left unrelayed, which reads as an oversight or a not-yet-done step rather than a considered trade-off, since the design and half the plumbing for the alternative already exist in their own repository.

Their control plane is a Postgres phase column advanced by in-process tokio tasks rather than a durable workflow engine. That is a smaller, simpler system to operate and is not indefensible for a single self-hosted binary with a bounded, per-run failure blast radius, but it means a crash mid-phase has no re-attach story beyond whatever the on-disk workdir preserves. Our Temporal-backed task registry costs more operational surface in exchange for the guarantee that a crash never silently strands a task; for a factory meant to run largely unattended, that guarantee is one we are not willing to give up the way a smaller product reasonably can.

Their verification gate before a PR is a prompt instruction to the model to run tests, not an independently executed one; ours is a reproduction gate that must fail at base and pass at head before a human ever sees the diff. That buys them a simpler pipeline, one CLI invocation, no separate test-runner integration to build per language and per repo, at the cost of the exact thing our design treats as load-bearing: evidence a fix works, not a model's self-report that it tried.

## 8. Red flags and slop assessment

This is real, large, and actively developed daily (last commit and last release both dated today, 165 tagged nightly releases), not a README with a landing page. But it is an 11-month-old, pre-1.0 project, every release tag is a nightly build with no stable version ever cut, driven almost entirely by one person: the top contributor holds 2070 contributions against 47 for the next-highest human contributor, out of 17 contributors total plus dependabot. WebSearch found no independent reviews anywhere: AlternativeTo, Capterra and StackShare listings all show zero reviews, and no Hacker News or Reddit discussion of the project turned up. The one piece of independent user feedback found, a GitHub issue from a person running Temps as an analytics backend in production, dated 2026-09-16, describes the setup as effectively undocumented, requiring source-code reading to bootstrap SDK identity correctly, consistent with this report's own finding that the autofixer's phase-split fix flow is undocumented outside its source code.

The licence is genuinely permissive and not a bait-and-switch: dual MIT OR Apache-2.0 on the core, with a separate, clearly-labelled Premium tier, a flat monthly fee per organisation with unlimited users and servers, gating SSO and SCIM, a request firewall, hash-chained audit logs and secrets-manager integrations, an open-core split stated up front on the pricing page rather than discovered by a formerly-open repository going dark. The cost-control gate that is silently a no-op, a budget checked against a value that is never updated past zero, is the kind of thing that looks fine in a demo and fails quietly in production; it is the closest thing to a real defect found in this pass, not a marketing claim outrunning the code so much as an unfinished wire between two otherwise-real pieces.

## 9. Sources

- https://github.com/gotempsh/temps, gh api repos/gotempsh/temps, stars/forks/issues/licence/dates, 2026-09-29
- gh api repos/gotempsh/temps/releases --paginate, 165 tags, all nightly builds, 2026-09-29
- gh api repos/gotempsh/temps/contributors --paginate, 17 contributors, 2026-09-29
- https://temps.sh, WebFetch, 2026-09-29
- https://temps.sh/pricing, WebFetch, 2026-09-29
- https://temps.sh/security, WebFetch, 2026-09-29
- https://temps.sh/docs, WebFetch attempted, returned HTTP 520, not retrieved
- WebSearch: temps.sh / gotempsh reviews, Hacker News, Reddit, independent write-ups, query run 2026-09-29
- clone directory ~/repos/market-research-clones/temps, shallow clone, cloned 2026-09-29
- README.md, full
- CONTRIBUTING.md, partial (dev setup section)
- docs/adr/013-sandbox-egress-credential-proxy.md, full
- docs/adr/023-ai-debugging-conversations.md, full
- docs/adr/029-firecracker-sandbox-backend.md, partial (~120 of a longer file)
- docs/features/error-tracking/page.mdx, grepped for AI/analysis/fix mentions
- docs/errors/page.mdx, full (unrelated: API error-response format, not the autofixer)
- CHANGELOG.md, grepped for sandbox/security/Firecracker entries
- crates/temps-agents/src/services/autofixer.rs, ~1050 of 1850 lines
- crates/temps-agents/src/handlers/autofixer.rs, ~220 of 1041 lines
- crates/temps-agents/src/services/executor.rs, targeted reads and greps
- crates/temps-agents/src/sandbox/docker.rs, targeted excerpts including the full egress proxy script
- crates/temps-agents/src/ai_cli/claude.rs, greps for credential env vars and base url overrides
- crates/temps-agents/src/plugin.rs, daily budget, cooldown and concurrency gate logic
- crates/temps-agents/src/services/run_service.rs, daily spend and estimated cost call sites
- LICENSE, LICENSE-MIT, NOTICE, headers checked
- assets/screenshots/errors-light.png, viewed
