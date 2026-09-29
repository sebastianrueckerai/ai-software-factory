---
name: Claude Code
slug: claude-code
url: https://code.claude.com/docs
repo: https://github.com/anthropics/claude-code
category: coding-harness
license: "mixed: CLI proprietary (all rights reserved, Commercial Terms); GitHub Action and Agent SDKs MIT; sandbox-runtime Apache-2.0"
open_source: partial
self_hostable: partial
hosting_model: local CLI, self-hosted CI (GitHub Actions), or Anthropic-run cloud sandboxes for web sessions
company: Anthropic, PBC. San Francisco. Founded 2021. Reuters reported a $30bn company-wide annual run-rate in April 2026; Claude Code alone past a $2.5bn run rate (up from about $500m in September 2025)
maturity: 148,551 GitHub stars on the docs and plugins repo, 13,630 open issues, first commit 2025-02-22, every one of four related repos pushed within hours of 2026-09-29 (checked live), frequent point releases through the v2.1.2xx range in the docs
similarity: 3
axes:
  signals_intake: 1
  control_plane: 2
  sandbox_isolation: 4
  verification: 3
  policy_outside_model: 4
  identity_per_task: 2
  cost_control: 3
  ux: 4
  reseedable_selfhost: 1
steal:
  - "The gateway compatibility contract (code.claude.com/docs/en/llm-gateway-protocol): forward anthropic-version and anthropic-beta as open, unfiltered lists rather than a pinned allowlist, since the client adds new beta strings across releases. factory-gateway should take the same posture for any header it does not actively need to inspect."
  - "The settings-precedence exceptions table: nine specific keys (disableClaudeAiConnectors, isolatePeerMachines, maxEffortLevel, and others) are hardcoded so the stricter value wins regardless of which scope nominally has precedence. This is a named, auditable safety ratchet, not a convention. Our policy YAML could mark a subset of keys the same way, so a project cannot loosen a cluster-wide cap even by accident."
  - "sandbox-runtime's resolved-address check: before dialling an allowed hostname, the egress proxy resolves it once and rejects the connection if the resolved address is loopback, link-local, or one of a hardcoded list of cloud metadata endpoints, independent of the domain allowlist. Our gateway's egress path allows Git, the module proxy, and the collector by hostname; this closes the DNS-rebinding and metadata-SSRF gap a hostname allowlist alone leaves open."
  - "Per-call cost and attribution headers (x-claude-code-session-id, agent-id, parent-agent-id) as first-class, forwardable metadata for a gateway to bucket spend by sub-agent, not just by task. Our gateway prices and holds per task; splitting cost by agent-id inside a task would sharpen the ledger once we run multi-agent tasks."
  - "The tiered hook and plugin architecture (prepend, user, append) with one privileged primitive (next.to) that the host runtime refuses outside a managed tier: loading the equivalent of sec-default through a side channel produces an inert plugin. Worth the pattern, not the code: a policy hook that only a control-plane-issued context can invoke, so a compromised or careless worker-side plugin cannot pass itself off as policy."
  - "The candid Security Limitations and Known Limitations sections in the sandbox-runtime README (domain fronting defeats content-blind egress filtering, allowAppleEvents removes isolation rather than weakening it, Linux proxy enforcement is env-var based and fails closed only for programs that honour it). Publishing what a sandbox does not cover is cheap and raises trust; our own sandbox docs should carry the same kind of section instead of implying default-deny egress is airtight."
differs:
  - "Claude Code's policy machinery (settings precedence, the hook and plugin tier system, sandbox filesystem and network rules) protects one developer's machine or one organisation's fleet of individually authenticated seats. Our policy question is different: a task, not a person, holds identity, and enforcement sits in a gateway in front of a disposable Kubernetes sandbox with no persistent settings.json at all. We cannot borrow the settings-precedence stack as infrastructure, only its ratchet idea, re-implemented against our own per-task ServiceAccount and policy-in-Git model."
ux_verdict: The best-documented developer-facing agent product surveyed. Every mechanism in this report has an exact, versioned, dated public doc page; our own console has nothing comparable.
slop_verdict: "Real and heavily used, not slop. Live commit activity across all four repos on the day of writing, a $2.5bn run-rate business, and enterprise data show over 1,000 customers spending $1m or more a year on it. One asterisk: the flagship repo (148k stars) ships no CLI source at all, only docs, plugins and examples under an all-rights-reserved licence, so \"open source\" claims about Claude Code from the star count alone are wrong."
---

# Claude Code

## 1. What it is

Claude Code is Anthropic's coding agent: a terminal CLI, a headless mode for scripting and CI, a Python and TypeScript "Agent SDK" that embeds the same agent loop as a library, a GitHub Action, a hosted "Claude Code on the web" cloud-sandbox mode, and a plugin and skill marketplace, all sharing one closed-source binary and one settings and permission model. Anthropic sells it as a subscription seat (Pro, Max, Team, Enterprise) or metered API usage, and increasingly as an embeddable harness other vendors' agent products wrap around (the SDK's own docs list this as an intended use, with a branding policy for it).

Anthropic's own claim is that the SDK offers "the same tools, agent loop, and context management that power Claude Code," as a library (code.claude.com/docs/en/agent-sdk/overview). The repository evidence only partly backs an "open" framing. github.com/anthropics/claude-code has 148,551 stars, but its LICENSE file reads "Anthropic PBC. All rights reserved," and it holds no CLI source, only documentation, the plugin marketplace (plugins/), internal example plugins (mods/), and integration examples. The CLI binary is closed. What is genuinely open, under MIT, are two thin wrappers: claude-code-action (9,233 stars) and claude-agent-sdk-python (8,188 stars), plus sandbox-runtime under Apache-2.0. Independent survey data (Pragmatic Engineer, JetBrains, Menlo Ventures, cited in Section 9) shows fast, real growth: 46 percent of developers surveyed name it their most loved coding tool, Anthropic holds an estimated 54 percent share of the enterprise coding-model market, and Claude Code is estimated to have authored about 4 percent of all public GitHub commits as of February 2026.

## 2. Mapping to our five planes

| Plane / principle | What Claude Code does | What we do | Verdict |
|---|---|---|---|
| Signals | None as a first-class concept. Work arrives as an interactive prompt, a `-p` headless invocation, an `@claude` GitHub mention, or a cron-triggered Action. No issue tracker, alert or telemetry intake of its own | Forgejo webhooks, SigNoz alerts, and factoryd's intake API all normalise into one Task row | We lead |
| Control plane | A session, not a durable task. State lives in a local transcript file or a GitHub Actions run. No cross-session task registry, no approval workflow beyond the interactive permission prompt or the `canUseTool` callback | `factoryd` holds a Temporal workflow per task with policy, budget, approval and audit state in Postgres | We lead |
| Worker plane (sandbox) | OS-level sandbox (Seatbelt, bubblewrap, or WFP) around one process on the same machine, or an Anthropic-operated cloud sandbox for the web product. No Kubernetes-native, per-task disposable pod model | gVisor pod, its own namespace and ServiceAccount, per task | Different substrate, comparable isolation intent |
| Verification | The security-guidance plugin (pattern rules, LLM diff review, agentic commit review) and the GitHub Action's PR and review flow. No CI gate, no reproduce-at-base-and-head, no strict-improvement bar | Forgejo Actions, policy gates, then a stronger-model review with a strict verdict, before bot merge | We lead |
| Merge and deploy | The Action pushes commits or opens PRs under the Claude GitHub App's token; a human merges. No GitOps deploy step is part of the product | `factory-merge` bot merges after approval or an `auto` rule, Flux deploys, staged rollout | We lead |
| Policy outside the model | Strong: settings.json allow and deny rules, the settings-precedence exceptions ratchet, and the sec-default plugin's host-enforced `next.to` privilege gate are all code level and unbypassable from a lower scope | Capability policy is a YAML file in Git, enforced in gateway code and Kubernetes NetworkPolicy | Roughly equal; they lead on settings, we lead on network |
| Identity per task | Weak by our definition: a developer's own OAuth token or API key authenticates a whole session; the sandbox masks credential env vars and files but does not mint per-task identity. The GitHub Action supports OIDC federation for cloud providers, the closest analogue | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified against the cluster OIDC issuer | We lead |
| Artifacts not chat | Partial: hooks pass structured JSON and subagents return summaries, but the primary interface is still a chat-like prompt and response stream | `TaskBrief` in, branch, PR and event stream out | We lead on intent, they lead on hook-payload structure |

## 3. Architecture and stack

The CLI itself is a closed, Node-based binary (inferred from npm-style install docs and the SDK's typed surface, not independently confirmed); no server source is public. What is public and readable:

- `claude-code-action` (TypeScript, Bun: `bunfig.toml`, `bun.lock`) is a GitHub Action wrapper with `src/`, `base-action/`, and `agent-approval-check/`. It shells out to the Claude Code binary inside the Actions runner.
- `claude-agent-sdk-python` (`pyproject.toml`, `src/`) is a thin Python wrapper (`ClaudeSDKClient`, `query()`) that also launches the same binary as a subprocess and speaks a JSON message protocol over stdio; a TypeScript sibling package exists too.
- `sandbox-runtime` (`@anthropic-ai/sandbox-runtime` on npm) is a standalone, non-container sandboxing library. macOS uses Seatbelt profiles (`sandbox-exec`). Linux uses bubblewrap with the network namespace removed entirely and all traffic proxied through a Unix-domain-socket HTTP or SOCKS5 proxy. Windows, alpha quality, uses a dedicated `srt-sandbox` local account fenced by a Windows Filtering Platform egress rule keyed to that account's SID.
- The `claude-code` docs repo also carries the plugin marketplace source: `mods/sec-default`, `mods/telemetry`, `mods/diff`, `mods/agents-md` (internal function-hook example plugins, each with its own README), and `plugins/security-guidance`, the shipped three-layer review plugin.

Model access defaults to Anthropic's own API or a claude.ai subscription login. Three explicit alternate backends exist, chosen by environment variable: Amazon Bedrock (`CLAUDE_CODE_USE_BEDROCK=1` with `ANTHROPIC_BEDROCK_BASE_URL`), Google Vertex (`CLAUDE_CODE_USE_VERTEX=1` with `ANTHROPIC_VERTEX_BASE_URL`), and any Anthropic-Messages-compatible gateway through plain `ANTHROPIC_BASE_URL`. Anthropic explicitly does not support routing to non-Claude models through any of these paths (code.claude.com/docs/en/llm-gateway), a hard constraint for us: our own gateway could front Claude Code sessions, but Claude Code itself will only ever address Claude models through whichever base URL is set.

## 4. UX

Zero-to-first-result is short: install the CLI, run `claude` in a repo, type a prompt. Headless scripting is one flag away: `claude -p "prompt" --output-format stream-json` for machine-readable streaming output, `--permission-mode` to fix a policy for the whole run, `--allowedTools` or `--disallowedTools` to fix a tool surface. `/install-github-app` automates GitHub Action onboarding end to end: it installs the GitHub App, creates the auth secret, and opens a ready-to-merge PR with the workflow file, with no hand-written YAML on the default path.

Watching and intervening is well supported. The interactive terminal shows tool calls and diffs live; `/status`, `/usage`, `/cost`, `/hooks`, and `/context` expose state without leaving the session; Escape and `/rewind` give a cheap undo; plan mode (Shift+Tab) forces a proposal-before-edit step for anything non-trivial. The GitHub Action surfaces progress as a live-updating PR or issue comment. Claude Code on the web runs sessions on Anthropic-operated cloud sandboxes from a fresh clone, and deliberately does not read the developer's local settings, `.claude/settings.local.json`, or any managed-settings file baked outside the runner image, so a cloud session's policy surface is narrower and more auditable than a local one by construction.

This is a materially better watch-and-intervene experience than our console, which today has no live diff view, no streaming session view, and no per-task cost breakdown (see `00-our-vision.md`, "Where we know we are weak").

## 5. Security, identity, sandbox, policy, cost

**Sandbox.** Two independent, well-documented layers. First, a built-in bash sandbox with two modes: auto-allow, where sandboxable commands run without a prompt and non-sandboxable ones fall back to the normal permission flow, and regular permissions, where every Bash call is always prompted. An escape hatch, `dangerouslyDisableSandbox`, lets Claude retry a blocked command through the ordinary permission flow; the hatch itself can be switched off entirely with `"allowUnsandboxedCommands": false`. Second, the standalone `sandbox-runtime` engine underneath: OS-native primitives (Seatbelt, bubblewrap, WFP), a resolved-address check that blocks connections to loopback, link-local addresses, and a hardcoded list of cloud metadata endpoints even when the hostname itself was allow-listed, and a published list of ways the sandbox can be deliberately weakened (`enableWeakerNestedSandbox`, `enableWeakerNetworkIsolation`, `allowAppleEvents`) or can leak (domain fronting defeats content-blind egress filtering; a broad filesystem write into a `$PATH` directory is a privilege-escalation route). This is enforced by the OS, not the model, and holds regardless of what the running agent's prompt says.

**Policy in code versus in prompts: both exist, and the split is clean.** Code level: the settings-precedence stack (managed, then `--settings`, then project-local, then shared project, then user) plus a named exceptions table where nine specific keys always let the stricter value win no matter which scope set it; the internal plugin architecture's prepend, user, and append hook tiers, where the one privileged call (`next.to`) is refused by the host runtime to anything outside a managed tier, so a user-installed plugin cannot impersonate org policy even if it tries; deny rules in `settings.json`, which win over `bypassPermissions` and over hooks. Prompt or LLM level: the shipped security-guidance plugin's Stop-hook diff review and agentic commit reviewer are explicitly disclaimed as "best-effort... not a guarantee... no warranty," so Anthropic itself does not treat an LLM-based check as a policy boundary. The permission evaluation order documented for the Agent SDK (hooks, then deny rules, then ask rules, then permission mode, then allow rules, then `canUseTool`) makes the same split explicit in code: a hook returning allow still cannot override a deny rule, and `bypassPermissions` cannot approve `rm` or `rmdir` on a critical path.

**Identity.** A developer's own OAuth token or API key authenticates an entire local session; there is no per-task minting. The sandbox does mask credential env vars and files from the process the agent drives, and the GitHub Action supports OIDC federation for Bedrock, Vertex, and Foundry so no long-lived cloud credential sits in a repo secret. This is real, but weaker than task-scoped identity: the credential still covers everything the developer or the Action's service account can do, not one task's declared scope.

**Cost.** `/usage` reports per-session token counts and a locally computed dollar estimate, at list price unless an admin sets `modelPricing` for contracted rates; `/cost` and the JSON `total_cost_usd` field on headless runs give the same number to a script. Team and Enterprise plans get seat allowances plus optional usage credits with admin-settable spend limits; API and Console customers get workspace spend limits; Bedrock, Vertex, and Foundry customers get nothing from Anthropic and are pointed at OpenTelemetry export, a self-hosted "Claude apps gateway," or a third-party LLM gateway such as LiteLLM for per-user attribution. There is no hard, gateway-enforced hold-then-book mechanism comparable to ours; the closest is a documented planning figure of around thirteen dollars per developer per active day, useful for budgeting, not as a cap.

## 6. What we should take from it

**Narrow, copy this month.** The settings-precedence exceptions pattern: pick the handful of policy.yaml keys where "the stricter value always wins" should be a hard invariant (spend cap floor, egress default-deny, sandbox class) and enforce that in factoryd's policy-merge code rather than leaving it to review discipline. The resolved-address anti-SSRF check from sandbox-runtime: our gateway's egress allowlist is hostname-based; adding a one-time resolved-IP check against a cloud-metadata denylist closes a gap a hostname allowlist alone cannot. The gateway compatibility protocol's header-forwarding stance, forward `anthropic-*` as an open list rather than a pinned allowlist, is directly reusable if `factory-gateway` should ever be a drop-in `ANTHROPIC_BASE_URL` target for a Claude-based harness, alongside opencode.

**Broad, shape not code.** The documentation discipline itself: every mechanism in this report has one canonical, dated, versioned doc page, cross-linked, with an explicit changelog note for every behaviour change. Our own console and policy docs are nowhere near this, and it is the single biggest reason Claude Code's UX axis scores a 4 here. The habit of publishing your own limitations, as in sandbox-runtime's Security and Known Limitations sections, is cheap to copy and raises trust more than a marketing claim would.

## 7. Where our philosophy differs and what that costs or buys us

Claude Code's whole policy and identity stack assumes a long-lived, individually authenticated actor: a developer's machine, or a CI job authenticated as a service account, holding one credential for a whole session. Our identity principle assumes the opposite: no persistent actor at all, a fresh ServiceAccount token minted per task and thrown away. We cannot adopt Claude Code's settings-precedence machinery as infrastructure, only its ratchet idea, because there is no settings.json file sitting on a machine in our model, only a policy row in Postgres and a Git-tracked YAML file the gateway reads per call. Where their approach is genuinely better, and our constraint is the price: a human developer gets a rich, low-latency, local interactive loop (plan mode, `/rewind`, live diffs) that our task-scoped, gateway-mediated, no-persistent-workspace model cannot offer as cheaply, because every one of our checks crosses a network hop to the control plane instead of running in-process.

## 8. Red flags and slop assessment

No incidents or licence changes found. The one real caveat: the 148,551-star `anthropics/claude-code` repository is not the product's source, it is documentation, plugins, and examples under an all-rights-reserved licence, while the SDK and Action wrappers around the closed binary are MIT. A reader citing "Claude Code is open source" from the star count alone would be wrong; this report sets `open_source: partial` and a mixed licence line accordingly. Adoption and revenue figures in Section 1 come mostly from Anthropic's own funding disclosures relayed by Reuters and from named third-party developer surveys (JetBrains, Pragmatic Engineer, Menlo Ventures) rather than audited filings; they are directionally consistent across independent sources but not independently verified here. sandbox-runtime's own README names its unresolved weaknesses (domain fronting, `allowAppleEvents` removing isolation entirely) rather than hiding them, which reads as a maturity signal, not a red flag.

## 9. Sources

https://code.claude.com/docs/en/llm-gateway-protocol (fetched 2026-09-29)
https://code.claude.com/docs/en/llm-gateway (fetched 2026-09-29)
https://code.claude.com/docs/en/sandboxing (fetched 2026-09-29)
https://code.claude.com/docs/en/settings (fetched 2026-09-29)
https://code.claude.com/docs/en/hooks (fetched 2026-09-29)
https://code.claude.com/docs/en/github-actions (fetched 2026-09-29)
https://code.claude.com/docs/en/agent-sdk/overview (fetched 2026-09-29)
https://code.claude.com/docs/en/agent-sdk/hooks (fetched 2026-09-29)
https://code.claude.com/docs/en/agent-sdk/permissions (fetched 2026-09-29)
https://code.claude.com/docs/en/sub-agents (fetched 2026-09-29)
https://code.claude.com/docs/en/skills (fetched 2026-09-29, partial read)
https://code.claude.com/docs/en/costs (fetched 2026-09-29)
https://github.com/anthropics/claude-code (gh api metadata, fetched 2026-09-29)
https://github.com/anthropics/claude-code-action (gh api metadata, fetched 2026-09-29)
https://github.com/anthropics/claude-agent-sdk-python (gh api metadata, fetched 2026-09-29)
https://github.com/anthropics/claude-agent-sdk-typescript (gh api metadata, fetched 2026-09-29)
~/repos/market-research-clones/claude-code/claude-code/ (LICENSE, plugins/security-guidance/README.md, mods/sec-default/README.md, mods/telemetry/README.md, mods/diff/README.md, mods/agents-md/README.md)
~/repos/market-research-clones/claude-code/claude-code-action/LICENSE
~/repos/market-research-clones/claude-code/claude-agent-sdk-python/LICENSE
~/repos/market-research-clones/claude-code/sandbox-runtime/README.md, LICENSE
WebSearch: Claude Code enterprise adoption and market share, 2026-09-29, citing Reuters (February and April 2026), Menlo Ventures (December 2025), JetBrains (January 2026 developer survey), Pragmatic Engineer developer survey, SemiAnalysis GitHub commit-share estimate
