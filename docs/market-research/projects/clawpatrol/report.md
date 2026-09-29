---
name: Deno Claw Patrol
slug: clawpatrol
url: https://clawpatrol.dev
repo: https://github.com/denoland/clawpatrol
category: policy-identity
license: MIT
open_source: yes
self_hostable: yes
hosting_model: self-hosted only, single Go binary run as gateway and device, no vendor cloud offering
company: Deno Land Inc (maker of the Deno runtime), San Francisco, project started within Deno, no separate funding disclosed
maturity: 1063 stars, 61 forks, 62 open issues, created 2026-04-28, last commit 2026-09-25, 31 releases in about 4.5 months (roughly weekly), contributors include Ryan Dahl and Bert Belder
similarity: 2
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 2
  verification: 0
  policy_outside_model: 4
  identity_per_task: 3
  cost_control: 0
  ux: 3
  reseedable_selfhost: 3
steal:
  - "Placeholder credentials: agents get shape-valid fake tokens (ghp_clawpatrol_placeholder_do_not_use) via env pushdown, the gateway swaps in the real secret only at MITM time, so a compromised task process never holds a usable key."
  - "CEL as the rule-condition language (google/cel-go) with per-protocol typed facets (http.*, sql.*, k8s.*, ssh.*), and the explicit design choice that unevaluable conditions fail closed instead of silently skipping the rule."
  - "Trust-on-first-use plugin sandboxing: default-deny OS sandbox (Linux namespaces plus Landlock, macOS seatbelt) with network grants recorded in a committed clawpatrol.lock.hcl, plus Sigstore build-provenance attestation for plugins pulled from GitHub."
  - "Protocol-aware endpoint plugins that decode Postgres, ClickHouse and Kubernetes API traffic well enough to expose typed facets (sql.verb, k8s.resource) to the rule engine, not just host and path."
differs:
  - "Default-allow when no rule matches, not default-deny: Claw Patrol only gates what an operator explicitly wrote a rule for, which is the opposite of our default-deny-egress, capability-must-be-granted posture."
ux_verdict: A working local dashboard and a five-command CLI path from install to a wrapped agent, but approval and audit both live behind one UI with no exportable log by default.
slop_verdict: Real and actively developed, not a landing page. Alpha by the maker's own admission, with an open default-allow gap and an unresolved approval-retry UX still in review.
---

# Deno Claw Patrol

## 1. What it is
Claw Patrol is an agent firewall built by the Deno team (Ryan Dahl and Bert Belder are named contributors). It sits between an AI coding agent and the outside world as a WireGuard or Tailscale gateway, decodes HTTP, Postgres, ClickHouse, Kubernetes API and SSH traffic, holds the real credentials on the gateway side, and decides per request whether to allow, deny, or route the decision to an HCL rule, an LLM judge or a human approver. It ships as one Go binary that runs as both the gateway and the joining device.

The makers pitch it as the missing control layer for "give the agent a shell and see what happens" workloads: an agent never touches a real API key, and every write can be gated by policy instead of by prompt instructions. The repository and docs back most of this up with a large, well-tested Go codebase (internal/config/plugins/{endpoints,credentials,approvers}, each with matching _test.go files) and a working React dashboard. Deno's own blog post announcing it calls it "currently alpha software", and SECURITY.md is explicit that clawpatrol run is "not a sandbox" for the agent process itself, only a network intermediary.

## 2. Mapping to our five planes

| Plane / principle | What Claw Patrol does | What we do | Verdict |
|---|---|---|---|
| Signals | None. It has no issue or telemetry intake, it only gates traffic an already-running agent generates. | Forgejo webhooks, SigNoz alerts, factoryd intake API feed a task registry. | not comparable |
| Control plane | A single SQLite file (clawpatrol.db) per gateway holds config-derived state, sessions, and the audit table. No task registry, no workflow engine, no budgets. | factoryd with a Temporal workflow per task, Postgres, policy in Git, cost ledger. | we lead |
| Worker plane | Does not run or sandbox the agent process. clawpatrol run wraps a command's network path only; the process itself is unconfined. | Disposable gVisor pod per task, read-only root FS, non-root, default-deny egress. | we lead |
| Verification | None. No CI trigger, no test gate, no model review of an agent's output. | Forgejo Actions, policy gates, stronger-model review before merge. | not comparable |
| Merge and deploy | None, out of scope for the product. | Bot-merged PR after approval or auto-merge rule, Flux deploy, staged rollout. | not comparable |
| Policy outside the model | Yes, and this is the product's centre of gravity: HCL rules with CEL conditions evaluate in gateway code, independent of any model, with a fail-closed design for unevaluable conditions. | Capability policy as a YAML file in Git, enforced in factory-gateway code and network policy. | equal |
| Identity per task | Partial. A device joins with a one-time code and gets an IP-pinned join credential; credentials are placeholder-substituted per agent process, but identity is bound to the device/profile, not to a single task run, and there is no automatic rotation per task. | Projected, audience-scoped, kubelet-rotated ServiceAccount token minted per task, verified against the cluster OIDC issuer. | we lead |
| Artifacts not chat | Not applicable, Claw Patrol has no multi-agent coordination model, it is a single-agent-to-upstream proxy. | Git-mediated TaskBrief in, PR and event stream out. | not comparable |

## 3. Architecture and stack
Backend: Go 1.26.6, module github.com/denoland/clawpatrol. Key dependencies read from go.mod: google/cel-go (rule conditions), hashicorp/hcl/v2 (config language), hashicorp/go-plugin (the three plugin families), pgplex/pgparser and AfterShip/clickhouse-sql-parser (protocol decoding), sigstore/sigstore-go (plugin provenance), a vendored third_party/tailscale (embedded tsnet), and an OpenTelemetry SDK. Frontend: dashboard/package.json shows React 18, Vite, TailwindCSS 4, TypeScript, @observablehq/plot for charts, prismjs and react-simple-code-editor for an in-browser HCL editor, formatted with Deno-ecosystem oxfmt and oxlint wrapping ordinary npm-style tooling.

Architecture (site/doc/architecture.md): five actors, Agent, Device, Transport (WireGuard or Tailscale), Gateway, Upstream. Three plugin families: endpoint plugins per protocol (https, kubernetes, postgres, clickhouse_native, clickhouse_https, ssh), credential plugins per secret shape, approver plugins (dashboard, human_approver, llm_approver). Connection dispatch is genuinely per-protocol: TLS SNI peek with on-the-fly leaf certificate minting for port 443, a ConnRouter/ConnIndex pair that claims Postgres connections by resolved destination IP, a DNS-VIP allocator for hostname-only protocols with no SNI (SSH, ClickHouse native), and a transparent TCP relay fallback for anything the gateway does not understand. UDP/443 (QUIC) is always refused with an ICMP port-unreachable, since it cannot be inspected, an honest limit stated in the docs rather than silently ignored.

Deployment is a single binary, no Helm chart, no Kubernetes manifest in the repository. Gateway and device run the same binary; there is no container image published in the docs read. This is a bare-metal or VM tool today, not a Kubernetes-native one, which matters for how it would fit next to our own Cilium-based cluster.

Rule engine (site/doc/rules.md, about 910 lines): CEL conditions with per-protocol typed facets (http.method, http.path, sql.verb, sql.tables, k8s.verb, k8s.resource, ssh.command, and more). Matching is priority-ordered, first-match-wins, ties broken by declaration order. There is no global default-deny: if no rule matches, the request passes. A documented "unevaluable conditions fail closed" design makes CEL unknowns propagate virally through boolean operators (&& and || are the only absorption points), so a condition that cannot evaluate denies rather than silently passing, and a rule whose CEL fails to parse or errors at runtime also synthesizes a deny attributed to that rule. This is a careful design for the failure case, layered on top of a default-allow posture for the unmatched case, and the two should not be confused.

LLM judge invocation, verified directly in internal/config/plugins/approvers/llm.go: the llm_approver reuses the agent's own HTTPCredentialRuntime.InjectHTTP to authenticate its call to the judge model, and dispatches to the Anthropic Messages API or the OpenAI Responses API by model name prefix. The system prompt tells the model to reply "allow" or "deny" on the first line and a one-line reason on the second, with an instruction to be conservative under ambiguity. defaults.llm_fail_mode ("closed" by default) governs what happens when the judge is unreachable, but a persistent misconfiguration (bad model name, bad credential, any other 4xx) always denies regardless of that setting, a nuance the prose docs state and the code matches.

What the judge actually sees is narrower than what the rule engine can match on. buildJudgePrompt (same file) builds the prompt from method, host, path, an optional user-agent, and a body sample truncated to 4000 characters, none of the typed CEL facets by name. Tracing the field back to runtime.ApproveRequest in internal/config/runtime/runtime.go and its construction sites in cmd/clawpatrol/main.go confirms this is systemic, not a gap in one function: for HTTP, Method/Path/UA/BodySample come straight off the http.Request, but for Postgres and the generic ConnEndpointRuntime path used by Kubernetes, ClickHouse and SSH, the approve context is built with only Method: req.Verb, Path: req.Summary, two short strings the endpoint plugin itself synthesizes. No UA, no BodySample field is populated on that path. In practice this means an LLM judge gating a Kubernetes delete or a SQL statement sees a one-line verb and summary chosen by the plugin author, not the raw manifest or query, while a human-facing Slack card built from the same struct is equally thin unless the plugin author put the interesting detail into Summary. This is a real "code does less than the marketing implies" finding: the docs describe rich per-protocol facets for rule matching, but do not say the LLM and human approval paths see a reduced, protocol-plugin-chosen summary rather than the structured facets themselves.

## 4. UX
Zero to first result (site/doc/getting-started.md): install a single binary via curl script, drop the example gateway.example.hcl into a data directory, open UDP 51820, start clawpatrol gateway, reach the dashboard over an SSH tunnel to set the root password, click each credential card to connect it (OAuth bounce for GitHub, Anthropic, OpenAI, Notion, a paste modal for bearer tokens), run clawpatrol join <gateway-url> on the agent machine with a one-time code approved in the dashboard, then wrap the agent with clawpatrol run -- <cmd>. That is roughly seven steps, no code changes to the agent itself.

Interfaces: a CLI (clawpatrol gateway, join, run, env, test) and a web dashboard, no chat interface, no IDE plugin. The dashboard, seen directly in three screenshots (site/doc/screenshots/issue-221-option-2/01-decisions-overview.png, site/doc/screenshots/issue-221-option-3/rules-overview.png, site/doc/screenshots/pr-231-settings-page/01-all-cards-unconnected.png), shows a real "1649 decisions" analytics view broken down by rule, outcome and decision type, a rules table with priority and 7-day hit counts, and a settings page with per-credential connect cards plus a live syntax-highlighted HCL config editor with a save button. This is a materially better single-pane operator view than our own console, which we already flag as "functional, not designed" with no real-time stream of an agent's work.

Approval channel: Slack, Discord, Telegram or the dashboard itself, with an optional interactive = true in-channel approve/deny button set, a classifier field that runs an llm_approver purely to summarize the request for the human, and require_approvers for N-of-N quorum. This is close to our own "approval as a workflow state, not a meeting" principle, implemented with off-the-shelf chat tooling instead of a bespoke console lane.

What is worse than our console: there is no task or session concept at all, the dashboard shows decisions and rule hits, not a running agent's progress, diff, or trace. There is also no exportable audit log by default (see section 5), so an operator watching from outside the dashboard has nothing to tail.

## 5. Security, identity, sandbox, policy, cost
Credentials live in the gateway's secret store, resolved in this order: dashboard-pasted values, OAuth registry (for token-refresh-backed providers), then CLAWPATROL_SECRET_<NAME> environment variables on the gateway host as a last resort (site/doc/credentials.md). The agent process only ever sees a shape-valid placeholder string, swapped for the real secret at MITM time inside the gateway. Precedence is per-credential, not per-slot, a documented footgun for mTLS: pasting only the certificate through the dashboard silently stops the key's env-var fallback from being consulted.

Identity is per-device, not per-task. A device joins with a one-time code, gets an IP-pinned join credential (site/doc/security-model.md), and every process on that device that runs through clawpatrol run shares the device's resolved credential set unless the operator sets up placeholder dispatch for two credentials of the same family at one endpoint. There is no automatic credential rotation tied to a single agent run the way our projected ServiceAccount tokens rotate per task.

Sandboxing is two things that must not be confused. The gateway process itself sandboxes its own plugins by default (Linux namespaces plus Landlock, macOS seatbelt, trust-on-first-use network grants recorded in a committed clawpatrol.lock.hcl, Sigstore provenance for GitHub-distributed plugins). The agent process is explicitly not sandboxed by Claw Patrol: SECURITY.md states clawpatrol run is not a sandbox, and the security model document calls remote deployment (agent host network-isolated behind its own join credential) strictly stronger than local deployment (same-host, UNIX-user isolated only).

Policy lives outside the model, in HCL plus CEL, evaluated in gateway code, which matches our own principle directly. The gap against our own default-deny posture is that Claw Patrol has no global default-deny: traffic to a host with no matching rule and no declared endpoint at all is either relayed transparently or refused per protocol, but traffic that does hit a declared endpoint with no matching rule is allowed by default. This was raised as a concern in the project's own Hacker News launch thread and is not disputed by the maintainers there.

Cost control does not exist. There is no budget, spend cap, or ledger anywhere in the docs or code read. Claw Patrol gates what an agent can do, not what it costs to do it.

Audit is a table inside the same SQLite state file (clawpatrol.db), surfaced only through the dashboard's action-details page. config-reference.md is explicit that the configured log_path is not the audit log. Each action's body sample is capped by body_storage (default 4 KiB) with a "truncated" badge past that limit, a separate, larger body_buffer (default 1 MiB) is used only for live rule matching. There is no separate exportable audit log format by default; introduction.md claims decisions are "exportable as fixtures for regression tests" through clawpatrol test, which was not opened and is marked not verified.

## 6. What we should take from it
Narrow, copyable this month: the placeholder-credential substitution model is a clean, small mechanism (env-var shape-valid fake token, real secret injected only at MITM time) that would harden our own factory-gateway's handling of any credential an agent's SDK insists on reading from an environment variable, rather than only from a header we control. The CEL fail-closed design for unevaluable conditions (unknowns propagate through boolean operators, parse or eval errors synthesize a deny attributed to the rule) is a good pattern to borrow verbatim if we ever let policy authors write conditional capability rules ourselves, since it removes a whole class of "rule silently didn't apply" bugs. The trust-on-first-use plugin sandbox with a committed lockfile and Sigstore provenance is a reasonable template for any plugin or extension point we add to factory-gateway later.

Broad, a problem they solve that we ignore: protocol-aware policy. We gate network egress at the Cilium layer (host and port) and capability at the factory-gateway layer (which MCP tool, which LiteLLM virtual key), but neither layer looks inside a Postgres or kubectl session to say "no DELETE, no drop of a namespace, only these tables." Claw Patrol's endpoint plugins for Postgres, ClickHouse and Kubernetes show that this is buildable with off-the-shelf SQL and protocol parsers (pgplex/pgparser, AfterShip/clickhouse-sql-parser) without much code.

What Claw Patrol would add next to factory-gateway and Cilium specifically: Cilium already gives us host and port-level default-deny egress, and factory-gateway already gives us per-task identity and MCP tool-level capability checks. Neither currently parses the body of an allowed connection. If a commissioned-server task's agent gets a database credential or a kubeconfig at all today, our policy is binary, allowed or not allowed to reach that endpoint, with no way to say "read-only" or "no cluster-admin verbs" short of provisioning a separate least-privilege database role or RBAC role per task, which is more setup than a rule. A Claw-Patrol-style endpoint plugin sitting in front of the commissioned server's Postgres or Kubernetes API, decoding the verb and gating writes behind either a rule or a human approval, would let us keep one shared credential per project instead of minting one least-privilege role per task, at the cost of running another proxy in the path.

## 7. Where our philosophy differs and what that costs or buys us
Default-allow versus default-deny is the core philosophical difference and it is not a detail. Our constraint is "agents get capabilities, never raw credentials, everything runs sandboxed with default-deny network." Claw Patrol's rule engine defaults to allow once a request reaches a declared endpoint with no matching rule; only what an operator explicitly wrote a rule for is gated. Adopting Claw Patrol's rule engine as-is inside our gateway would mean adding an explicit top-priority catch-all deny rule to every generated policy, or forking the dispatcher, either way we would not inherit its default-allow behaviour, we would work around it.

Per-device rather than per-task identity is the second difference. Our principle is identity belongs to the task, a short-lived, audience-scoped token minted and rotated per task by the cluster's own OIDC issuer. Claw Patrol's join credential is scoped to a device for as long as it stays joined; a task boundary inside that device is not a security boundary in their model. Copying their credential-placeholder mechanism is fine and worth doing, copying their identity model would be a regression against our own constraint. Their approach buys them something real though: a much shorter path from "an agent's SDK wants an env var" to "the agent has a working credential", because they never have to solve the harder problem of minting a fresh, audience-scoped token per invocation the way our OIDC-token-per-task machinery does. That is the price of their simplicity, and it is a price we already decided not to pay.

Protocol-aware gating does matter for our commissioned-server tools, but adopting it does not require adopting Claw Patrol wholesale, or its default-allow posture, or its device-level identity. It is a targeted addition, a protocol-decoding rule layer sitting behind our existing per-task identity and default-deny network policy, gating writes at the SQL or kubectl verb level the way Cilium already gates at host and port level.

## 8. Red flags and slop assessment
Real project, not a landing page. 150-plus files under cmd/clawpatrol/ and internal/config/plugins/ have matching _test.go files, the CI workflow runs gofmt -l ., deno task format:check, make lint, make test, and a docs generator (CONTRIBUTING.md), and the release cadence is roughly weekly (31 releases from v0.1.21 on 2026-05-13 to v0.5.10 on 2026-09-11). Contributors include Ryan Dahl and Bert Belder, the creators of Node.js and co-founders of Deno, which is a strong maintenance signal for a four-and-a-half-month-old repository.

Against that: the maker's own blog post calls it "currently alpha software". The default-allow rule dispatch was raised as a concern on the project's Hacker News launch thread and is not resolved. An approval-retry UX gap was still open as PR #666 at the time of research. There is no shipped default rule set, an operator starts from an example config and writes their own policy from scratch. Licence is MIT, and the product site states this is a deliberate choice because the proxy handles secrets and sees all agent traffic, "has to be auditable", a reasonable justification with no sign of an open-core bait-and-switch. Aggregate closed-issue and merged-PR counts were not verified, a gh api search/issues query 404'd and was not retried; treat the 62 open issues figure as the only verified issue-tracker number.

## 9. Sources
https://github.com/denoland/clawpatrol (gh api, 2026-09-29)
https://clawpatrol.dev (repository homepage field, 2026-09-29)
/home/womb/repos/market-research-clones/clawpatrol/README.md
/home/womb/repos/market-research-clones/clawpatrol/SECURITY.md
/home/womb/repos/market-research-clones/clawpatrol/CONTRIBUTING.md
/home/womb/repos/market-research-clones/clawpatrol/go.mod
/home/womb/repos/market-research-clones/clawpatrol/dashboard/package.json
/home/womb/repos/market-research-clones/clawpatrol/site/doc/architecture.md
/home/womb/repos/market-research-clones/clawpatrol/site/doc/security-model.md
/home/womb/repos/market-research-clones/clawpatrol/site/doc/rules.md
/home/womb/repos/market-research-clones/clawpatrol/site/doc/credentials.md
/home/womb/repos/market-research-clones/clawpatrol/site/doc/getting-started.md
/home/womb/repos/market-research-clones/clawpatrol/site/doc/glossary.md
/home/womb/repos/market-research-clones/clawpatrol/site/doc/introduction.md
/home/womb/repos/market-research-clones/clawpatrol/site/doc/configure-gateway.md (partial)
/home/womb/repos/market-research-clones/clawpatrol/site/doc/config-reference.md (partial)
/home/womb/repos/market-research-clones/clawpatrol/site/doc/cli.md (partial)
/home/womb/repos/market-research-clones/clawpatrol/site/doc/toc.json
/home/womb/repos/market-research-clones/clawpatrol/internal/config/plugins/approvers/llm.go
/home/womb/repos/market-research-clones/clawpatrol/internal/config/runtime/runtime.go
/home/womb/repos/market-research-clones/clawpatrol/cmd/clawpatrol/main.go
/home/womb/repos/market-research-clones/clawpatrol/site/doc/screenshots/issue-221-option-2/01-decisions-overview.png
/home/womb/repos/market-research-clones/clawpatrol/site/doc/screenshots/issue-221-option-3/rules-overview.png
/home/womb/repos/market-research-clones/clawpatrol/site/doc/screenshots/pr-231-settings-page/01-all-cards-unconnected.png
git log in clone, last commit 2026-09-25
Hacker News launch thread for Deno Claw Patrol, consulted 2026-09-29, not verified beyond the default-allow criticism noted
