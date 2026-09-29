---
name: OneCLI
slug: onecli
url: https://onecli.sh
repo: https://github.com/onecli/onecli
category: policy-identity
license: "mixed: Apache-2.0 core, OneCLI Enterprise License for three ee/ paths"
open_source: partial
self_hostable: yes
hosting_model: self-hosted (Docker Compose, one install script) or hosted cloud (onecli.sh, per-seat billing)
company: ChartDB, Inc., founder Jonathan Fishner (also founder of chartdb.io), site claims Y Combinator backing, funding amount and HQ not disclosed
maturity: 3528 stars, 241 forks, 355 commits, at least 28 contributors (one at 294 commits), repo created 2026-03-08, last push 2026-09-14, 30 releases roughly every 2 to 4 days through Aug and Sep 2026
similarity: 2
axes:
  signals_intake: 1
  control_plane: 3
  sandbox_isolation: 2
  verification: 0
  policy_outside_model: 4
  identity_per_task: 2
  cost_control: 1
  ux: 4
  reseedable_selfhost: 3
steal:
  - "Fail-closed body-condition matching: a truncated request body resolves by rule polarity instead of silently passing or silently blocking (apps/gateway/crates/policy/src/condition_match.rs)"
  - "Declared harness capabilities plus a conformance test suite every adapter must pass, including a fake adapter (packages/agent-protocol/src/harness.ts)"
  - "A steer() verb that injects a message into a running agent turn, with a joined or missed acknowledgement event"
  - "An automated open-core boundary check that counts references from the OSS composition root into a gated crate (packages/api/src/licensing/ee-boundary.ts)"
  - "One generic MITM broker with declarative per-service interception rules, instead of a bespoke MCP server per integration"
  - "A single chat surface for starting, watching and approving a task, closing part of the gap our console has with no real-time event stream"
differs:
  - "TLS interception is the trust boundary, our path never terminates the agent's own TLS session"
  - "Real credentials are long-lived and centrally decrypted, ours are minted short-lived per task"
  - "Cost caps and budgets are an enterprise-only feature there, a non-negotiable core floor for us"
  - "The unit of work is an open-ended chat conversation, ours is a gated pipeline ending in a reviewed PR"
ux_verdict: A one-command self-hosted install and a chat dashboard with inline approval cards beat our functional console, but the design assumes one human driving one agent by chat, not watching many autonomous tasks queue toward a PR.
slop_verdict: Real and actively maintained, 355 commits and 30 releases in about six months with a genuine Show HN launch and at least one independent adopter, the ee split is narrow and disclosed and the core security code stays Apache-2.0.
---

# OneCLI

## 1. What it is

OneCLI gives every employee at a company a personal sandboxed AI agent, reachable over Slack or a web dashboard, brokered through a Rust proxy that swaps a placeholder credential for the real one on every outbound call the agent makes. The README calls it "the agent harness built for teams" and "a pro assistant for companies." ChartDB, Inc. builds and sells it, with the core stack under Apache-2.0 and three enterprise-only directories sold as "OneCLI Enterprise."

The README's own history section says it "started as a credential vault for AI agents, built in Rust," then grew a Next.js dashboard, a sandbox runner and a vendor-neutral harness layer into what it calls "OneCLI v2." The repository backs the pitch with working code: a Rust MITM gateway, a policy-rule engine tested against a shadow implementation, an approval store, and a TypeScript sandbox supervisor wrapping one real coding harness (jcode) plus a fake one used only in tests.

What the makers claim: a general-purpose secured AI teammate for every employee, with SOC 2 Type II "in progress" and named enterprise customers on the marketing site. What the repository actually shows: a credential-broker and policy engine of real depth, one working harness adapter, and no automated verification or merge pipeline of any kind.

## 2. Mapping to our five planes

| Plane or principle | What OneCLI does | What we do | Verdict |
|---|---|---|---|
| Signals | Work starts from a human chat message (Slack or the dashboard) or a schedule. No issue, PR or telemetry alert intake | Forgejo webhooks, SigNoz alerts, factoryd intake API, every task a Forgejo issue | we lead |
| Control plane | Postgres-backed durable conversations, a work queue the runner polls, scheduled wake-ups, an audit row per proxied request | Temporal workflow per task, Postgres task registry, policy as a YAML file applied by Flux, a cost ledger | equal |
| Worker plane | Docker container per agent on self-host, a Kata Containers microVM on the paid cloud edition, one built-in harness (jcode) behind a richer turn-based interface | gVisor pod per task, Go Harness interface with Prepare and Run, opencode today | not comparable |
| Verification | None. No CI, no gates, no model review before an agent's output is used | Forgejo Actions, policy gates, a stronger-model review with a strict verdict | we lead |
| Merge and deploy | None built in. A separate onecli-plugin lets a wrapped Claude Code or Codex push its own PR under injected credentials, but OneCLI itself does not orchestrate merge or deploy | factory-merge bot after a whitelisted human approval, Flux GitOps rollout | we lead |
| Policy outside the model | A Rust gateway rule engine matching host, path, method, identity and body conditions, tested for parity between a legacy and a v2 engine against a shared corpus | A YAML capability document enforced in Go and network policy | they lead |
| Identity per task | Long-lived org secrets, decrypted per request from one static key or a KMS envelope. No per-task minting or expiry | A projected ServiceAccount token per task, a per-task LiteLLM virtual key, a per-session Forgejo token | we lead |
| Artifacts not chat | The product's entire interface and memory is a persistent chat conversation with the agent | A TaskBrief goes in, a branch, a PR and a normalised event stream come out. No live chat with the agent | not comparable |

## 3. Architecture and stack

OneCLI is a pnpm and turborepo monorepo. The web dashboard, API server, runner, sandbox supervisor, channel adapter and SSH terminator are TypeScript. The gateway (apps/gateway) is a separate Rust workspace of about eighteen Apache-2.0 crates (approval, ca, policy, policy-engine, inject, proxy, crypto, telemetry, and others) plus one enterprise crate (crates/ee/ee), built with axum, hyper, rustls and sqlx against Postgres, with an optional Redis client. State lives in Postgres through Prisma (packages/db). There is no dedicated workflow engine: task state is conversation rows plus a work queue the runner polls, not a durable-execution product like Temporal.

Deployment is Docker Compose for self-host, produced by an install script (curl -fsSL https://onecli.sh/install | sh) or pnpm dev for local development, and a separate hosted SaaS for the cloud edition. No Kubernetes manifests or Helm chart exist anywhere in the repository, confirmed by a search for Chart.yaml and for "kind: Deployment" returning nothing. Agents run in the container built from docker/agent.Dockerfile, driven by apps/runner and apps/sandbox-supervisor, which talks to the one built-in harness through apps/sandbox-supervisor/src/harness/jcode.ts, wrapping the @1jehuang/jcode-sdk package.

OneCLI does no model routing of its own. It does not pick between providers or tiers. It forwards each request to whatever endpoint the agent's own CLI is already configured to call, and substitutes the real API key at the TLS layer. Model choice is entirely the wrapped agent's business, not the gateway's.

## 4. UX

A user runs the install script or pnpm dev, which generates secrets, starts Postgres and opens the dashboard. From there a Slack workspace or the web chat is the whole interface: type a request, the agent replies and works inside its sandbox, tool calls stream into the same chat, and an approval card appears inline when a gated call needs a decision. A click approves or denies it. That is the whole path from zero to a first result, four or five steps by the docs' own quickstart.

Interfaces on offer: a web dashboard, Slack, a CLI wrapper (onecli run, and a separate onecli-plugin for Claude Code or Codex), an HTTP API, and SDKs listed in the docs navigation. Screenshots were not directly viewed, this description comes from the fetched docs and product pages and is marked as such.

Chat is easier than our console for a single task: starting, watching and approving all happen in the same window, nothing new to learn. It is worse for many concurrent tasks: a chat transcript does not give the structured queued, running, waiting, in review, done states our kanban board gives across a whole project, and OneCLI has no diff or PR view because it does not itself produce a reviewable code artifact.

## 5. Security, identity, sandbox, policy, cost

Credential handling is the project's core mechanism. Agents receive placeholder strings such as "sk-ant-onecli-gateway-placeholder" or a literal "Bearer placeholder" header in their configuration (apps/gateway/crates/inject/src/default_interceptions.rs). Every outbound HTTPS call is terminated by a locally generated Certificate Authority (apps/gateway/crates/ca/src/lib.rs, using rcgen, a ten-year CA certificate, twenty-four-hour leaf certificates cached per hostname), decrypted, and the real secret is written in just before the request leaves (apps/gateway/crates/inject/src/secret_inject.rs). Every sandboxed agent must therefore trust a CA the gateway controls to reach the internet at all.

Real secrets at rest use AES-256-GCM under one static SECRET_ENCRYPTION_KEY environment variable in self-host (apps/gateway/crates/crypto/src/lib.rs), or a per-tenant KMS envelope in the enterprise and cloud edition (ee/kms_crypto.rs). Neither format shows automatic rotation or per-task minting for third-party credentials. A GitHub token or a Slack bot token, once stored, stays valid and shared across every agent in the org until someone revokes it by hand.

Sandbox isolation differs sharply by edition. Self-host uses a plain Docker container with the network as the only enforced boundary, no docker socket, no host path mounts beyond a home volume (apps/runner/src/backend/docker/docker-backend.ts). That is a softer primitive than our gVisor pod per task. The paid cloud edition instead boots each agent in a Kata Containers microVM, stronger isolation than our current default.

Policy is fully in code, not in a prompt. A PolicyRule, Target and Identity model (apps/gateway/crates/policy-engine/src/types.rs) matches host, path, method, connection and body conditions, evaluated first-match by priority, and fails closed on a truncated body or an unresolved target, a rule the code itself names "FAIL-CLOSED LAW #999" (apps/gateway/crates/policy/src/condition_match.rs). A legacy and a v2 engine are tested for identical decisions against a shared fixture corpus.

Cost control is thin in the free product. A sliding-window rate limiter exists in the open crate (apps/gateway/crates/policy/src/lib.rs), but hard spend caps, a budget and a spend ledger live entirely in the enterprise crate (apps/gateway/crates/ee/ee/src/budget, files pricing.rs, spend.rs, meter.rs, anthropic.rs and binding.rs). A self-hosted deployment has no way to stop an agent from running up an unbounded model bill beyond a raw request-count limiter.

## 6. What we should take from it

Narrow, code we could copy this month:

Fail-closed body-condition matching is a concrete, correct-by-construction answer to a question our own gateway will eventually face: what happens when a payload is too large to fully inspect. Restrictive rules should treat an unknown body as matched, permissive rules should treat it as not matched. Worth adopting the moment we start gating on payload content rather than only on identity and capability.

Declared harness capabilities (resume, thinking, toolEvents, steer, skillsDir, instructionFiles) plus a conformance test suite every adapter must pass, including a deliberately fake one, is a cheap way to keep a second harness honest. As we bring in Codex CLI alongside opencode, a small capability struct and a shared conformance suite would catch drift between adapters earlier than hand-testing would.

A steer() verb, letting a caller inject a message into a live turn with an explicit acknowledgement of whether the harness actually saw it, is worth considering. Our Harness interface today only offers Prepare and Run, no way to redirect a running task short of killing it.

An automated open-core boundary check that counts references from the free composition root into a gated crate (packages/api/src/licensing/ee-boundary.ts) is only relevant if we ever split part of our own code into a paid tier, but it is cheap insurance if we do.

Broad, product shape worth noticing:

A single MITM broker that gates arbitrary REST APIs by host, path and method, instead of a bespoke MCP server per integration, is the project's real idea. It turns "add a new integration" into "write an interception rule" rather than "write and maintain a new tool server." The useful part to borrow is the pattern, one generic broker with declarative per-service rules, not the TLS-interception mechanism itself, which section 7 explains we should not copy wholesale.

Chat as the single surface for starting, watching and approving a task closes a real gap in our own console, which has no live event stream and no diff view. A live feed per task, short of adopting their full conversational model, would narrow this without giving up our kanban structure for many concurrent tasks.

## 7. Where our philosophy differs and what that costs or buys us

TLS interception is OneCLI's trust boundary. Every sandbox must trust a CA the gateway controls, which lets one broker credential-inject literally any REST API without per-tool integration work, more general than our LiteLLM-virtual-key and MCP-proxy path. The price is blast radius. A leaked CA private key lets whoever holds it silently impersonate any HTTPS origin to every agent in the fleet, a risk with no equivalent on our path, since we never terminate a client's own TLS session. Copying this would buy generality and cost us a strictly larger compromise surface, which our "security without half measures" constraint argues against.

Real credentials in OneCLI are long-lived and centrally decrypted on each matching request, not minted per task. That suits many humans sharing a few long-lived org connections such as Slack or a shared GitHub App. Our identity-per-task principle mints a scoped, short-lived credential around each task and stores no long-lived secret for the agent to reach, except the two per-session Forgejo tokens we already treat as the one deliberate exception. Adopting their model for anything beyond that exception would abandon "identity belongs to the task, not the machine."

Cost control sits behind their enterprise paywall. Budgets, a spend ledger and pricing metering are entirely inside the ee crate, so the free, self-hosted product has no floor on what an agent can spend. Our constraint treats a hard spend cap as non-negotiable core infrastructure, not a paid feature, so we could not adopt OneCLI's business boundary here without breaking "security without half measures."

The unit of work in OneCLI is an open-ended chat conversation, with no CI, no test gate and no model review before a reply is treated as done. Our verification plane exists because an ungated agent reply is not evidence of anything. This is not a maturity gap for OneCLI to close, it is a different product: an assistant a human drives turn by turn, not a path to a merged, deployed and reviewed change.

## 8. Red flags and slop assessment

The project is real and actively maintained. 355 commits and 30 releases landed in about six months, repo created 2026-03-08, latest release v2.6.0 on 2026-09-08, roughly one release every two to four days through August and September. A genuine Show HN thread exists (news.ycombinator.com/item?id=49023427), with commenters comparing it to Fly.io's tokenizer proxy, a BuzzFeed-style SSO proxy pattern, and HashiCorp Vault, a measured but not dismissive reception. At least one independent adopter blog post exists (nanoclaw.dev, describing adoption of "OneCLI Agent Vault").

Contribution is concentrated. One contributor, guyb1, holds 294 of 355 commits, a bus-factor risk typical of a founder-led project at this stage, with a long tail of contributors at one to four commits each.

Open-core gating is narrow and disclosed, not creeping. Exactly three directories are non-Apache (apps/web/src/ee/, packages/api/src/ee/, apps/gateway/crates/ee/), covering RBAC-recheck refinements, Redis HA backends, KMS and Cognito integration, and billing, not core security, injection or policy logic. LICENSE-ENTERPRISE states its scope plainly: it "permits development, testing, evaluation and internal non-production use. Production use requires a valid OneCLI Enterprise subscription."

One documented historical security gap is worth flagging. docs/self-hosting.md states that in the pre-2.0 upgrade window, registration was open by default with no lock switch, so an old install's data was handed to the first account that registered against it, a real, self-disclosed footgun for anyone who ran an early self-hosted instance and delayed locking registration.

Marketing claims that were not independently verified: Y Combinator backing, SOC 2 Type II "in progress," and named enterprise customers (Docker, MindsDB, Zoho, Coralogix), all taken from the vendor's own site, not confirmed elsewhere.

## 9. Sources

https://github.com/onecli/onecli, gh api repos/onecli/onecli, 2026-09-29
https://github.com/onecli/onecli/contributors, gh api, 2026-09-29
https://github.com/onecli/onecli/releases, gh api, 2026-09-29
https://github.com/onecli/onecli/commits, gh api, pagination via Link header, 2026-09-29
https://onecli.sh, WebFetch, 2026-09-29
https://onecli.sh/docs, WebFetch, 2026-09-29
https://news.ycombinator.com/item?id=49023427, WebSearch, 2026-09-29
https://nanoclaw.dev, WebSearch result, blog post on adopting OneCLI, 2026-09-29
https://github.com/onecli/onecli-plugin, WebSearch result, 2026-09-29
Clone at market-research-clones/onecli, files read: README.md, package.json, docs/development.md, docs/self-hosting.md, docker/docker-compose.yml
Clone: apps/gateway/Cargo.toml, apps/gateway/crates/ca/src/lib.rs, apps/gateway/crates/policy/src/lib.rs, apps/gateway/crates/policy/src/condition_match.rs
Clone: apps/gateway/crates/policy-engine/src/types.rs, apps/gateway/crates/approval/src/lib.rs
Clone: apps/gateway/crates/inject/src/default_interceptions.rs, apps/gateway/crates/inject/src/secret_inject.rs
Clone: apps/gateway/crates/telemetry/src/lib.rs, apps/gateway/crates/crypto/src/lib.rs
Clone: apps/gateway/crates/ee/LICENSE, apps/gateway/crates/ee/LICENSE-ENTERPRISE
Clone: apps/gateway/crates/ee/ee/src/rbac.rs, apps/gateway/crates/ee/ee/src/ha/approval.rs
Clone: apps/gateway/crates/ee/ee/src/budget/pricing.rs, spend.rs, meter.rs, anthropic.rs, binding.rs
Clone: apps/runner/src/backend/types.ts, apps/runner/src/backend/docker/docker-backend.ts
Clone: packages/agent-protocol/src/harness.ts, apps/sandbox-supervisor/src/harness/jcode.ts, apps/sandbox-supervisor/package.json
Clone: apps/channel-adapter/src/approvals.ts, apps/web/src/lib/api/approvals.ts, packages/api/src/licensing/ee-boundary.ts
