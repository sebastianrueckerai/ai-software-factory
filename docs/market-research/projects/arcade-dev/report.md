---
name: Arcade
slug: arcade-dev
url: https://www.arcade.dev
repo: https://github.com/ArcadeAI/arcade-mcp
category: policy-identity
license: MIT
open_source: partial
self_hostable: partial
hosting_model: self-hosted MCP framework (MIT) or Arcade Cloud; enterprise tier claims VPC, on-prem and air-gapped
company: Arcade AI, San Francisco, founded Feb 2024 by Alex Salazar and Sam Partee, 72M USD raised (12M seed 2025, 60M Series A June 2026 led by SYN Ventures)
maturity: about 1040 stars, 115 forks, 20 open issues, repo created 2024-04-26, renamed arcade-ai to arcade-mcp, last commit 2026-09-25, no tagged GitHub releases, ships via PyPI, lead maintainer has 300+ commits
similarity: 2
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 0
  verification: 1
  policy_outside_model: 4
  identity_per_task: 4
  cost_control: 0
  ux: 2
  reseedable_selfhost: 2
steal:
  - "Decorator-declared tool auth: requires_auth=GitHub(scopes=[repo]) on a Python function, the runtime injects a live token into context, the model and MCP client never see it"
  - "23 built-in OAuth provider classes (GitHub, Google, Slack, Notion, Linear, and more) each a thin subclass carrying a provider_id, a reusable shape for a small credential-broker catalogue"
  - "MCP Resource Server pattern: every HTTP request is a Bearer token checked against JWKS from the org's own IdP (RFC 9728 discovery), separate from the tool-level OAuth layer"
  - "arcade evals scores whether a model picked the right tool and the right arguments, a cheap regression check before a new tool goes live"
  - "arcade new scaffolds pyproject.toml, .env.example and a working server.py in one command, first tool call in under five minutes"
differs:
  - "Arcade's model assumes a signed-in human behind every OAuth grant, consenting once per provider; our tasks start from an issue with no human in the loop, so their delegated-user-scope story does not map onto an unattended coder task without inventing a synthetic pre-consented identity"
  - "The parts that actually enforce policy, store secrets and keep the audit trail (Govern, in their language) live in the closed-source Arcade Engine SaaS, not in this MIT repository, so depending on Arcade for identity would put a component outside our re-seed-from-Git boundary"
ux_verdict: CLI-first and fast to a first tool call, but the run-and-watch surface is the cloud-only dashboard, unverified from the repo
slop_verdict: real and actively maintained, well-funded, used by named customers, but the advertised authorization platform is split between this thin open SDK and a closed SaaS control plane
---

# Arcade

## 1. What it is

Arcade (Arcade AI, arcade.dev) sells an "actions runtime" that lets an AI agent call third-party APIs (GitHub, Slack, Notion, and 80-plus others) under a scoped, per-end-user OAuth grant instead of a shared service account. The open-source part, arcade-mcp on GitHub (the repository was renamed from arcade-ai), is a Python framework for building MCP servers and the tools inside them. The company sells the rest: Arcade Cloud/Engine, which brokers the OAuth flow, stores tokens, and adds a "Govern" layer of policy, audit logging and SIEM export.

The README claims the framework "powers the 7,500+ prebuilt tools across 81 MCP servers" on Arcade.dev. The repository itself only contains the SDK (arcade-core, arcade-mcp-server, arcade-tdk, arcade-cli, arcade-evals), examples, and tests, not the prebuilt tool catalogue or the Engine that stores secrets. The marketing site's "Enforce/Execute/Govern/Integrate" framing describes a product; the repository shows only the "Integrate" and part of "Execute" as code.

## 2. Mapping to our five planes

| Plane / principle | What Arcade does | What we do | Verdict |
|---|---|---|---|
| Signals | None. Arcade has no issue, alert or telemetry intake | Forgejo webhooks, SigNoz alerts, factoryd intake API | not comparable |
| Control plane | Arcade Engine (closed source) tracks deployed servers, secrets and org scoping; no task registry or scheduler | factoryd with a Temporal workflow per task, Postgres, policy in Git | not comparable |
| Worker plane | No sandbox concept; an MCP server just runs wherever it is deployed | One gVisor pod per task, default-deny egress | not comparable |
| Verification | arcade evals checks tool-call accuracy against a live model, no CI or merge gate | Forgejo Actions, policy gates, stronger-model review | we lead |
| Merge and deploy | arcade deploy pushes a packaged server to Arcade Engine | Flux GitOps after bot merge | not comparable |
| Policy outside the model | OAuth scopes declared in code (requires_auth=...), enforced by the resource server and Engine, never by a prompt | Capability rules as a YAML file in Git, enforced in gateway code and network policy | equal, narrower scope |
| Identity per task | A token is minted per end user per provider, refreshed by Engine, injected into Context for one call, never seen by the client or the LLM | A projected ServiceAccount token per task, verified by factory-gateway against the cluster OIDC issuer | they lead, for third-party SaaS APIs specifically |
| Artifacts not chat | Not applicable, Arcade tools return structured MCP results, not chat transcripts | TaskBrief in, branch and PR out | equal |

## 3. Architecture and stack

Python 3.10+, five PyPI packages under libs/: arcade-core (tool schema, ToolAuthorization/OAuth2 classes in arcade_core/auth.py, catalog and executor), arcade-mcp-server (the MCP runtime, arcade_mcp_server/resource_server/ for OAuth 2.1 Resource Server validation with JWKS, arcade_mcp_server/middleware/), arcade-tdk (tool development kit), arcade-cli (arcade new, arcade deploy, arcade evals, in libs/arcade-cli/arcade_cli/deploy.py), arcade-evals (tool-call accuracy scoring). No database, no queue and no workflow engine in this repository: state lives in Arcade Engine, which this repo only calls over HTTP (deploy_server_to_engine posts a deployment package and gets back a server URL). examples/mcp_servers/authorization/ ships a Docker Compose example of a self-hosted, resource-server-protected MCP server validating tokens from an external IdP such as WorkOS or Keycloak, with no Arcade Cloud dependency for that half of the story.

## 4. UX

Zero to a first tool call is uv tool install arcade-mcp, arcade new my_server, then uv run server.py, three commands, one working stdio MCP server with an example tool. Adding OAuth to a tool is one decorator. For the cloud path, arcade login then arcade deploy packages and uploads the server; the org then manages it through the "Arcade dashboard" (arcade dashboard opens it in a browser), described in docs but not present as code in this repository, so its screens are not verified here. Interfaces are CLI plus any MCP client (Claude Desktop, Cursor, VS Code); there is no equivalent of our console kanban board, no view of a running agent, and no approval workflow, because Arcade is a library the agent's tools depend on, not an orchestrator watching the agent itself.

## 5. Security, identity, sandbox, policy, cost

Identity: OAuth 2.1 throughout. On the outbound side, a tool declares requires_auth=Provider(scopes=[...]) and Engine handles the browser consent, token storage and refresh; the injected token reaches only the tool's Context for that call. On the inbound side, ResourceServerAuth validates every HTTP request's Bearer token against JWKS from the caller's own identity provider before any MCP message is processed. Policy: scope declarations live in code, enforced by middleware (arcade_mcp_server/resource_server/scope_enforcement.py) and by Engine, not by a prompt; the website's "pre- and post-tool-call hooks" for custom policy were not found anywhere in this repository, so that capability, if real, lives only in Engine. Sandbox: none, an MCP server is a normal process, isolation is whatever the deployer provides. Cost: no budgets or spend caps in the code; the only "usage" module found (arcade_core/usage/) sends anonymous PostHog analytics events, not a cost ledger.

## 6. What we should take from it

Narrow: the decorator-based requires_auth pattern and the token-never-reaches-the-model discipline are worth copying if our design ever lets an agent call a third-party SaaS API (not just Git and the model gateway) under a capability, since it is a smaller, cleaner unit than building our own OAuth broker from scratch. The OAuth 2.1 Resource Server pattern (JWKS validation per request, RFC 9728 discovery) is a reasonable reference if factory-gateway's MCP proxy ever needs to accept externally-issued bearer tokens instead of only our own projected ServiceAccount tokens. arcade evals is a small, concrete idea for regression-testing a new MCP tool before wiring it into a capability class: assert the cheap model picks the right tool and arguments, not just that the tool runs.

Broad: for our policy-identity gap, Arcade's contribution is narrow but real, it is a credential broker for calling other companies' APIs on a named human's behalf, a problem we do not have yet because our only outbound capability today is Git and the model gateway. If a future capability class (say, an integration-tester agent that files tickets in a customer's Jira) needs scoped access to a third-party SaaS product, Arcade's per-provider, per-scope, token-never-to-the-agent pattern is the shape to copy, in our own gateway code, not as a dependency on their Engine.

## 7. Where our philosophy differs and what that costs or buys us

Arcade's trust model is built around a human who logs in once and delegates scoped authority to an agent acting on their behalf; our tasks are triggered by an issue with no human present at call time, so adopting Arcade as-is would require either a synthetic pre-consented identity per project (weakening the "delegated user" premise they sell) or building our own equivalent for machine-to-machine grants, which is most of the engineering effort anyway. The bigger cost is architectural: the parts of Arcade that actually enforce policy, store tokens and keep an audit trail are the closed-source Engine, not this repository. Taking a dependency on Arcade for identity would mean a component of our control plane that cannot be deleted and rebuilt from Git, violating the re-seedable constraint. Building our own scoped-token broker in factory-gateway, following Arcade's pattern rather than its product, keeps us inside that constraint at the cost of writing and maintaining that code ourselves.

## 8. Red flags and slop assessment

The project is real: active commits, 1040-plus stars, 115 forks, a lead maintainer with 300-plus commits, and $72M raised across a 2025 seed and a June 2026 Series A led by SYN Ventures with Morgan Stanley and Wipro as strategic investors (source: Arcade's own Series A post and independent coverage). The open-core split is the main thing to flag: marketing claims (7,500+ tools, "SOC 2 compliant", pre/post-call policy hooks) describe the paid Engine, which is not in this repository and was not independently checked. No GitHub releases are tagged, versioning happens on PyPI, which is a minor maintenance-signal gap rather than a red flag on its own. No security incidents or licence changes found in the time available.

## 9. Sources

- https://github.com/ArcadeAI/arcade-mcp (cloned shallow to /home/womb/repos/market-research-clones/arcade-dev)
- README.md, CONTRIBUTING.md, SECURITY.md
- libs/arcade-core/arcade_core/auth.py
- libs/arcade-core/arcade_core/auth_tokens.py
- libs/arcade-core/arcade_core/context.py
- libs/arcade-core/arcade_core/catalog.py
- libs/arcade-core/arcade_core/usage/constants.py
- libs/arcade-mcp-server/arcade_mcp_server/resource_server/README.md
- libs/arcade-mcp-server/arcade_mcp_server/resource_server/scope_enforcement.py
- libs/arcade-mcp-server/arcade_mcp_server/middleware/
- libs/arcade-cli/arcade_cli/deploy.py
- examples/mcp_servers/authorization/
- gh api repos/ArcadeAI/arcade-mcp (2026-09-29)
- gh api repos/ArcadeAI/arcade-mcp/contributors (2026-09-29)
- https://www.arcade.dev (fetched 2026-09-29)
- https://pulse2.com/arcade-raises-60-million-series-a-to-secure-ai-agents-in-production/ (2026-06-15)
- https://www.arcade.dev/blog/arcade-series-a/ (2026-06-15)
- WebSearch: Arcade.dev ArcadeAI funding Series A HQ founded 2026 (2026-09-29)
