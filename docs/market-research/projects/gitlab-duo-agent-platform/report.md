---
name: GitLab Duo Agent Platform
slug: gitlab-duo-agent-platform
url: https://about.gitlab.com/gitlab-duo/agent-platform/
repo: https://gitlab.com/gitlab-org/gitlab
category: forge-integrated
license: "mixed: GitLab EE License for the Agent Platform code, MIT only for parts distributed as GitLab CE or served client-side"
open_source: no
self_hostable: partial
hosting_model: GitLab.com SaaS by default. Self-managed customers on Premium or Ultimate can run a self-hosted AI Gateway plus self-hosted models (Docker image, own JWT keys), with an online licence still phoning home to cloud.gitlab.com for usage billing unless an offline licence and the Duo Agent Platform Self-Hosted add-on are bought.
company: GitLab Inc., NASDAQ GTLB, public since IPO on 2021-10-14 (about $11bn valuation). All-remote, nominal HQ San Francisco. Founded 2011-2014 depending on source (open-source project 2011, company built from 2012, renamed GitLab Inc. 2015). FY2025 revenue $759.2m, about 2,375 employees.
maturity: gitlab-org/gitlab repo 6147 stars, 12463 forks, created 2015-05-20, last activity 2026-09-29. Duo Agent Platform itself started as a feature flag in GitLab 17.1 (2024), reached general availability as "Duo Agent Platform" in GitLab 18.8 (January 2026). AI Gateway and Duo Workflow Service live in gitlab-org/modelops/applied-ml/code-suggestions/ai-assist, 61 stars, 116 forks, created 2022-10-03. Release cadence is GitLab's usual monthly minor release, currently 19.4 (2026-09-17).
similarity: 4
axes:
  signals_intake: 4
  control_plane: 4
  sandbox_isolation: 2
  verification: 3
  policy_outside_model: 4
  identity_per_task: 4
  cost_control: 3
  ux: 3
  reseedable_selfhost: 1
steal:
  - Composite identity: a dual-identity OAuth token that binds a service account (the agent) to the human who triggered it through a "dynamic scope", enforcing the intersection of both identities' permissions and stamping every action with both an author_id and a human_author_id for compliance attribution.
  - The layered reader/writer flow pattern to break the "lethal trifecta" (access to sensitive systems, exposure to untrusted content, autonomous action) split a generalist agent into a read-only agent that sees untrusted content and a write-only agent that never does, documented with full YAML flow-config examples in security_threats.md.
  - Tool governance matrix: every tool classified Read/Write/Delete, every rule set to Always Allow/Always Ask/Always Deny across three access types (Cloud/Local/Background), rules cascade group to project but a project can only match or tighten its group's rule, and the whole thing fails closed if the governance service errors.
  - Tool-response security layer in duo_workflow_service/security: strips hidden HTML, Markdown and Mermaid comments from tool output, HTML-encodes dangerous tags such as <system> and <goal> before they re-enter the model's context, and can route responses through a third-party prompt-injection scanner (HiddenLayer) in log-only or interrupt mode.
  - Glob-based exclusion-rule files (mr-review-automated-rules.yaml) that keep whole files or diffs out of an agent's context by pattern, with group-level templates that cascade to projects, used to keep the Code Review Flow off generated files and vendored code.
  - AI Gateway's AIGW_LITELLM__MODEL_METADATA_FILE mechanism registers capability metadata (context window, pricing, tool-calling support) for a self-hosted or custom model at startup so LiteLLM does not silently strip parameters it does not recognise. Directly applicable since we also run LiteLLM.
differs:
  - "Sandboxing is execution-path-dependent, not universal. Only flows that run as a CI/CD job get the SRT-based (Anthropic Sandbox Runtime) network and filesystem restriction. The same agents running in the IDE, on a developer's machine, or in Duo Chat run with the user's own ambient filesystem and credentials, and GitLab's own docs warn the Software Development Flow can read untracked, gitignored files such as .env. Their control at that point is human review, not a sandbox. Copying this would break our security-without-half-measures constraint, which applies regardless of where an agent runs."
  - "Nothing here is open source by any normal definition. The Agent Platform's server-side code sits under GitLab's own EE licence (source-visible, but production use requires a paid Premium or Ultimate subscription, and copying, merging or redistributing it is explicitly forbidden), gated further behind GitLab Credits usage billing. Our best-of-breed-open-source-with-an-escape-hatch constraint rules out depending on any of this code; only the documented patterns and the LiteLLM/self-hosted-model conventions are transferable."
  - "Identity is a long-lived bearer-token chain, not a projected short-lived cluster credential. A request passes through a Cloud Connector JWT, a CustomersDot token, an OAuth access token, a Duo Workflow Service internal JWT and a GLGO exchange JWT, with TTLs from about one hour to roughly three days, held by the executor process. Composite identity is a strong audit and attribution model but the tokens themselves live longer and travel further than the kubelet-rotated, OIDC-verified, per-task ServiceAccount token our design uses, so it buys traceability at the cost of a wider blast radius per credential."
ux_verdict: A real, embedded UX with flow sessions, checkpoints and Approve/Reject/Modify cards inside the issue or merge request that started them, but the feature surface is fragmented across dozens of separately flagged doc pages and add-ons, the marketing site shows no real product screenshots, and Reddit users comparing it to Claude Code still call its raw interaction quality worse even while praising the integration.
slop_verdict: Real and used in anger. It reached general availability in GitLab 18.8, drove a company-wide pricing change (GitLab Credits), and GitLab shipped and documented a response to an actual remote prompt-injection exploit reported by Legit Security in 2025. It is not README-slop, but several flagship governance features (the AI Governance Dashboard, some trigger types, webhook callbacks) are still beta or explicitly "not ready for production use", and the open-core gating is aggressive.
---

# GitLab Duo Agent Platform

## 1. What it is

GitLab Duo Agent Platform (DAP) is GitLab's own agentic layer on top of its DevSecOps forge: a catalogue of AI agents and "flows" (agents chained into multi-step automations) that read and write issues, merge requests, pipelines and code inside GitLab itself. It is built and sold by GitLab Inc., a public company (NASDAQ: GTLB), as part of the paid Premium and Ultimate tiers, billed through a new usage-based currency called GitLab Credits rather than per-seat pricing. GitLab's own marketing describes it as "AI orchestration across the entire software lifecycle" and frames it around what GitLab calls the "AI paradox": writing code is a small share of a developer's time, so faster code authoring alone does not move the needle, and the platform exists to also automate review, security triage and pipeline maintenance.

What the docs and code actually show is narrower and more conditional than the marketing page. DAP is a genuinely large engineering effort: a dedicated executor binary, a standalone LangGraph-based orchestration service, a dedicated model gateway, a tool-governance system, and a documented threat model with named attack sequences. But most of that is gated behind GitLab's own EE licence and the Premium/Ultimate tiers, several of the most interesting governance features (the AI Governance Dashboard, some trigger types, outbound webhook callbacks) are still beta or "not ready for production", and independent commentary (InfoQ, Reddit via InfoQ, a 2025 Legit Security disclosure) confirms it is a live, contested product rather than a demo.

## 2. Mapping to our five planes

| Plane / principle | What GitLab does | What we do | Verdict |
|---|---|---|---|
| Signals | Flows trigger on GitLab-native events: issue mention, assignment, reviewer assignment, pipeline events, merge request events (created, ready, approved, conflict), work item created/status changed, or a scheduled/API trigger. Because GitLab is the forge, no inbound webhook is needed; an outbound webhook-callback mechanism (experiment, GitLab 19.4) exists only to notify external systems of flow lifecycle events. | Forgejo webhooks, SigNoz alert webhooks and a factoryd intake API feed a single work item type: a Forgejo issue. | They lead. Their trigger catalogue is richer and native to the forge; we only intake issues and alerts. |
| Control plane | The Duo Workflow Service (DWS) is a standalone Python/LangGraph service. Task state is a LangGraph checkpoint persisted back into GitLab's own Postgres via GraphQL (duo_workflow_service/checkpointer/gitlab_workflow.py), or an in-memory MemorySaver for local dev that explicitly disables human-in-the-loop and status updates. Sessions are visible in the UI with 30-day retention. | factoryd (Go) runs one Temporal workflow per task against its own Postgres (CloudNativePG), with policy as YAML in Git applied by Flux. | Roughly equal. Both are durable, checkpointed, human-in-the-loop task engines; GitLab's is embedded in a much larger monolith, ours is a dedicated service. |
| Worker plane | The executor is a precompiled "GitLab Duo CLI" binary that connects to DWS over WebSocket and runs either inside a CI/CD job or, unsandboxed, in the IDE or on a developer's machine. Only the CI/CD path gets the Anthropic Sandbox Runtime (SRT) sandbox (network allowlist, filesystem restriction). | One gVisor pod per task, in its own namespace and ServiceAccount, read-only root filesystem, non-root, default-deny egress to everything but the gateway, git and the module proxy, applied uniformly regardless of who or what started the task. | We lead. Our sandbox is a structural default; theirs is conditional on the execution surface, and their own docs list the unsandboxed paths as a named risk. |
| Verification | Code Review Flow runs a pre-scan plus review with hard context caps (about 1 MiB pre-scan, truncated to about 800 KiB; files over 10,000 lines get diff-only). Ordinary GitLab MR approval rules and CI pipelines still gate merges; there is no separate stronger-model judge step described as such. | Forgejo Actions on untrusted gVisor runners, then policy gates (path risk class, migration flag, reproduction at base and head), then a stronger-model review with a strict verdict. | Roughly equal, different shape. Theirs is an agent-produced diff entering the normal human/CI gate; ours adds an explicit reproduction and model-review gate before that point. |
| Merge and deploy | Flows produce a "ready-to-merge change or an inline comment"; merging is ordinary GitLab MR merge under normal permissions. No factory-specific bot-merge or auto-promotion mechanism is documented. | Merge only by bot factory-merge after a whitelisted human approval or an auto rule for reproduced, strictly-improving, normal-risk changes; Flux deploys, staged rollout with an alert-free bake window. | We lead. GitLab stops at the PR; we have a documented, conditional auto-merge and staged-rollout path. |
| Policy outside the model | Tool governance (Read/Write/Delete x Always Allow/Ask/Deny x Cloud/Local/Background) is enforced by a governance service outside the LLM, fails closed on error, and cascades group to project with a can-only-tighten rule. | Capability rules are a document in Git, enforced in gateway code and network policy; a prompt cannot grant a capability. | They lead. Their rule model has more dimensions (per-tool, per-access-type, per-scope) than our current single policy document, and it is visibly load-bearing (MCP tools auto-classified from annotations, fail-closed default). |
| Identity per task | Composite identity: a dynamic-scope OAuth token binds a service account to the initiating human, enforcing intersectional access and attributing every action to both. A five-token chain (Cloud Connector JWT to CustomersDot to OAuth to DWS internal JWT to GLGO) carries this, with TTLs from about one hour to about three days. | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified against the cluster OIDC issuer, mapped to the task row; the sandbox holds no key material except two per-session Forgejo tokens used only by the worker process, not the agent. | Not directly comparable. Theirs is stronger on audit attribution (SOC2/SOX-style dual-identity trail); ours is stronger on credential lifetime and blast radius (minutes, cluster-verified, sandbox-inaccessible). |
| Artifacts not chat | Flows exchange structured checkpoints and GitLab-native objects (issues, MRs, pipeline jobs); GitLab Duo Chat is a separate, explicitly less-sandboxed surface layered on top. | TaskBrief in, a branch, a PR and a normalised event stream out; Git is the sole coordination mechanism. | Roughly equal. Both treat the forge's own objects as the interchange format for flows; chat is the looser edge case in both designs. |

## 3. Architecture and stack

DAP is two Python services sitting in front of, and orchestrated from, the main GitLab Rails monolith. The AI Gateway (ai_gateway/, service name gitlab-ai-gateway) and the Duo Workflow Service (duo_workflow_service/) live together in one repository, gitlab-org/modelops/applied-ml/code-suggestions/ai-assist, which is the successor of a now-migrated gitlab-org/duo-workflow/duo-workflow-service. Both are FastAPI/Python 3.12, Poetry-managed (pyproject.toml), with dependency-injector, uvicorn, structlog, python-jose and Google Cloud Vertex AI client libraries as core dependencies.

The Duo Workflow Service uses LangGraph for orchestration, with a stated three-layer architecture (LangGraph APIs, then Components, then Workflows) whose boundaries are statically enforced in CI (docs/module_boundaries.md). Task state is a LangGraph BaseCheckpointSaver implementation (duo_workflow_service/checkpointer/gitlab_workflow.py) that writes checkpoints back to GitLab over GraphQL rather than to a database DWS owns itself; a MemorySaver fallback exists for local development only and is documented as disabling human-in-the-loop behaviour when used. Content-scoping is handled by a small, readable FileExclusionPolicy/DiffExclusionPolicy pair (duo_workflow_service/policies/file_exclusion_policy.py) built on the gitmatch gitignore-style matcher; this is the code behind the mr-review-automated-rules.yaml exclusion feature. Prompt-injection and tool-output defence live in duo_workflow_service/security/: prompt_security.py strips hidden HTML/Markdown/Mermaid comments and HTML-encodes tags like <system>/<goal> before they can re-enter the model's context, and hidden_layer_scanner.py wraps a third-party scanner.

Model routing lives in ai_gateway/model_selection/models.yml, a flat YAML list of models (name, provider, gitlab_identifier, max_context_tokens, model_class_provider: litellm, per-model sampling params) that is consumed through LiteLLM (docs/litellm_model_metadata.md documents an AIGW_LITELLM__MODEL_METADATA_FILE escape hatch for registering self-hosted or custom models LiteLLM does not know about). Four ADRs under docs/model_routing/ describe an in-process routing layer with keyword-signal-driven model selection. Authentication in ai_gateway/auth/ is a small gcp.py (Google Application Default Credentials for GCP-side calls) plus glgo.py (a GlgoAuthority class implementing the GLGO exchange-JWT step of the auth chain) wired through a dependency_injector container.

The executor is a precompiled "GitLab Duo CLI" binary (replaced an npm package in GitLab 19.4) that connects to DWS over WebSocket, either from a GitLab-runner CI job or from an IDE/local machine. CI-job execution is sandboxed with the Anthropic Sandbox Runtime (@anthropic-ai/sandbox-runtime, open source), configured with a large recommended domain allowlist; IDE and local execution is not sandboxed at all. Internally GitLab runs the two services on its own "Runway" platform (Google Cloud Run, seen in .runway/ config directories and runway.gitlab.net endpoints), which is not part of the product a self-managed customer receives. Self-managed deployment is a single Docker image (about 340 MB compressed, 512 MB RAM minimum, no GPU needed) with operator-generated RSA-2048 JWT signing/validation key pairs for each of the two services, documented in doc/install/install_ai_gateway.md.

## 4. UX

A user starts a flow the way they already work in GitLab: mention @GitLabDuo in an issue or MR comment, use a quick action, assign the bot as a reviewer, or hit the Flows REST API. There is no separate onboarding flow beyond turning the feature on for the instance/group/project and choosing a model; the "first result" path is roughly two to three steps (enable Agent Platform, enable the specific flow, mention or trigger it) for someone already living inside GitLab.

While a flow runs, its session shows up in the UI with a status, links to the CI/CD job logs it produced, and, for flows that pause on a HumanInputComponent checkpoint, an Approve/Reject/Modify card. Sessions are retained for 30 days. Tool-governance "Always Ask" rules surface as approval prompts at the point a tool is about to run. This is a real, forge-embedded equivalent of our own "human lane" concept, not a mock-up: GitLab's docs describe it in enough operational detail (retention window, checkpoint semantics, cascading rule resolution) that it reads as built, not planned.

The marketing page (about.gitlab.com/gitlab-duo/agent-platform, fetched 2026-09-29) shows no real product screenshots: it uses abstract illustrations, a demo video thumbnail and a link to an interactive Navattic walkthrough rather than static UI images. Independent sentiment (via InfoQ's coverage of Reddit discussion, accessed 2026-09-29) is mixed: one user called the GitLab integration "legit" but said "the UI of Claude Code is better", another found agentic mode "getting much more reliable and faster" but worried about organisation-wide cost at scale. Interfaces on offer are the GitLab web UI, VS Code and JetBrains extensions, a CLI, and a REST/GraphQL API; there is no dedicated desktop app.

## 5. Security, identity, sandbox, policy, cost

Security. GitLab's own security_threats.md names the "lethal trifecta" (citing Simon Willison) and documents two full attack sequences with diagrams: SSH-key exfiltration through an IDE session, and CI-token exfiltration through a pipeline. Their stated mitigation is the layered reader/writer flow split plus HiddenLayer prompt-injection scanning (No checks / Log only / Interrupt). This is backed by real code, not just docs: duo_workflow_service/security/prompt_security.py and tool_output_security.py sanitise tool output before it reaches the model. Confirming this is not just theory, Legit Security publicly disclosed a remote prompt-injection vulnerability in GitLab Duo in 2025 that led to source-code exfiltration; GitLab patched it, though Hacker News commenters called the initial fix incomplete (not independently re-verified here).

Identity. Enforced in code through composite identity: a dynamic-scope OAuth token binding a service account to the initiating human, intersecting both identities' permissions and stamping actions with author_id and human_author_id for audit. The underlying token chain (Cloud Connector JWT, CustomersDot token, OAuth access token, DWS internal JWT, GLGO exchange JWT) has TTLs from about one hour to about three days depending on the token.

Sandbox. Enforced in code, but only for CI/CD-job execution, via the Anthropic Sandbox Runtime with a curated allowlist of over 100 package-registry domains. IDE, local and Chat execution run with the user's own ambient access; GitLab's own software_development.md warns this flow can read untracked, gitignored files such as .env, and that a leaked or over-scoped OAuth token is a real risk the user must manage.

Policy. Enforced in code outside the model: the tool-governance matrix (Read/Write/Delete x Always Allow/Ask/Deny x Cloud/Local/Background) fails closed if the governance service is unreachable, and MCP tools are auto-classified from their own capability annotations rather than trusted blindly.

Cost. GitLab Credits: a pooled, monthly-refreshing virtual currency, $1 per credit beyond the included allowance (Premium 12 credits/user/month, Ultimate 24, both explicitly labelled promotional and subject to change), with some actions flat-rate (agentic code review $0.25, roughly 50 code completions per credit). Per-user caps exist and per-user reporting became generally available in GitLab 19.4. This is a metered billing ledger, not a hard pre-call spend cap with a database-locked hold the way ours works; nothing in the docs describes a request being refused mid-flow purely for exceeding a budget rather than running out of purchased credits.

## 6. What we should take from it

Narrow, code-level items we could copy this month: the gitmatch-based file/diff exclusion policy is a two-file, dependency-light pattern for keeping generated or vendored files out of an agent's context, directly portable to our own review/context-building step. The AIGW_LITELLM__MODEL_METADATA_FILE idea (a JSON file registering capability metadata for models LiteLLM does not know) is worth adding verbatim since we already run LiteLLM and will hit the same problem the moment we add a model outside LiteLLM's built-in registry. The tool-output sanitisation pass (strip hidden HTML/Markdown/Mermaid comments, HTML-encode <system>/<goal>-style tags before they re-enter context) is a small, concrete addition we do not currently do anywhere in our pipeline, and it defends against a real, disclosed exploit class.

Broader, product-shape items worth adopting deliberately rather than copying wholesale: the tool-governance matrix's extra dimensions (per-tool Read/Write/Delete, per-access-type Cloud/Local/Background, cascading-but-only-tightening group-to-project rules, fail-closed default) are a genuinely richer policy model than our current single Git-tracked capability document, and would let us express "ask before deleting, but allow reading, in this project only" without new code. The composite-identity attribution pattern (stamp every action with both the acting principal and the human who triggered it) is worth adding to our own audit trail even without adopting their token-chain mechanics, since it answers "who is accountable for this change" more directly than our current per-task ServiceAccount identity does. The layered reader/writer flow pattern is a genuine architectural idea, not just documentation: for any flow that must both read untrusted external content (an issue body, a fetched web page) and take a write action, splitting it into two agents that never share that context is a cheap way to structurally break prompt injection rather than relying on scanning it away.

## 7. Where our philosophy differs and what that costs or buys us

Their sandbox is conditional on execution surface; ours is universal. GitLab only puts the SRT sandbox around flows that run as a CI/CD job, and says so plainly: IDE, local and Chat execution get no sandbox, only human review and, in Chat's case, prompt scanning. This is a real, documented trade they accept in exchange for supporting more surfaces (an agent that can act on your actual laptop is more useful than one that can only act inside a container) at the cost of the exact risk their own threat model names. Copying this would break our "security without half measures" constraint; we accept a smaller surface (agents only act from inside the sandbox) to avoid ever shipping an unsandboxed path.

Their licensing rules out direct reuse. The Agent Platform's server-side code is EE-licensed: source-visible, but production use requires a paid subscription, and copying, merging, publishing or redistributing it is explicitly forbidden by the licence text. Our "best-of-breed open source with an escape hatch" constraint means none of this code is available to us at any price we would call "open source"; everything we take from this report is a pattern to re-implement, not a dependency to add. Where their approach is genuinely better (the governance matrix, composite identity, the reader/writer split) our constraint is exactly the price: we pay in engineering time to rebuild the idea rather than importing the code.

Their identity model optimises for attribution over credential lifetime; ours optimises the other way. Composite identity produces a strong, dual-signed audit trail useful for SOC2/SOX/FedRAMP-style compliance, but the tokens carrying it live for up to about three days and are held by a long-running executor process, not minted per task and verified against a cluster issuer the way our ServiceAccount tokens are. If we ever need GitLab-style dual-identity attribution for compliance reasons, we would have to add it as a stamped audit field on top of our existing short-lived tokens rather than replacing our token model with theirs, since shortening their approach's token lifetime is not something their architecture as documented supports.

## 8. Red flags and slop assessment

Maintenance: the product is under heavy, visible active development. GitLab ships monthly minor releases (currently 19.4, 2026-09-17) and DAP itself moved from a 2024 feature flag to general availability in GitLab 18.8 (January 2026) in about 18 months, with new trigger types, models and governance features landing most releases per the changelog entries embedded in the docs themselves.

Open-core gating: aggressive. DAP requires Premium or Ultimate (no Free-tier path beyond a small GitLab-Credits allowance for the AI Catalog and custom agents), self-hosted models require a further "Agent Platform Self-Hosted" add-on for offline licences, and GitLab openly told sales prospects that Duo Pro/Enterprise per-seat plans are being phased out in favour of the new Credits model, which one industry analysis (a competitor's site, so read with that bias noted) called "a meter... the allowance everyone quotes is a promotion GitLab reserves the right to withdraw."

Licence: not open source by any normal test, despite GitLab CE itself being source-available. The EE licence text (LICENSE in the ai-assist repository) forbids copying, merging, publishing, distributing, sublicensing or selling the software outside a paid subscription; only parts shipped as GitLab CE or served client-side (images, CSS, compiled-in JS) are MIT.

Security incident: Legit Security disclosed a remote prompt-injection vulnerability in GitLab Duo in 2025 leading to source-code exfiltration; GitLab patched it, but Hacker News discussion (as reported by a secondary source, not independently verified here) characterised the initial fix as incomplete. This is consistent with, not contradicted by, the extensive threat-model documentation GitLab has since published.

Marketing versus product: the public marketing page makes broad claims ("AI orchestration across the entire software lifecycle") without showing a single real product screenshot, relying on an interactive third-party demo (Navattic) instead. Several named governance features are explicitly beta or "not ready for production use" (AI Governance Dashboard, webhook callbacks, some trigger types), which is a normal amount of in-progress surface for an actively developed platform but should not be read as more finished than GitLab itself says it is.

## 9. Sources

https://about.gitlab.com/gitlab-duo/agent-platform/ (fetched 2026-09-29)
https://docs.gitlab.com/user/duo_agent_platform/ (mirrors the cloned doc/user/duo_agent_platform tree, cross-checked 2026-09-29)
WebSearch: "GitLab Duo Agent Platform pricing credits review 2026" (2026-09-29)
WebSearch: "GitLab Duo Agent Platform" review OR criticism OR reddit OR hacker news (2026-09-29)
WebSearch: GitLab Inc company founded headquarters IPO NASDAQ GTLB (2026-09-29)
https://gitlab.com/api/v4/projects/gitlab-org%2Fgitlab (GitLab API, fetched 2026-09-29)
https://gitlab.com/api/v4/projects/gitlab-org%2Fmodelops%2Fapplied-ml%2Fcode-suggestions%2Fai-assist (GitLab API, fetched 2026-09-29)
Clone: ~/repos/market-research-clones/gitlab-duo-agent-platform (gitlab-org/gitlab, sparse checkout, depth 1, blobless)
  doc/user/duo_agent_platform/_index.md
  doc/user/duo_agent_platform/triggers/_index.md
  doc/user/duo_agent_platform/sessions/_index.md
  doc/user/duo_agent_platform/environment_sandbox.md
  doc/user/duo_agent_platform/composite_identity.md
  doc/user/duo_agent_platform/authentication.md
  doc/user/duo_agent_platform/security_threats.md
  doc/user/duo_agent_platform/model_selection.md
  doc/user/duo_agent_platform/ai_catalog.md
  doc/user/duo_agent_platform/agents/tools.md
  doc/user/duo_agent_platform/agents/custom.md
  doc/user/duo_agent_platform/agents/external.md
  doc/user/duo_agent_platform/flows/_index.md
  doc/user/duo_agent_platform/flows/custom.md
  doc/user/duo_agent_platform/flows/webhook_callbacks.md
  doc/user/duo_agent_platform/flows/execution/_index.md
  doc/user/duo_agent_platform/flows/execution/security-considerations.md
  doc/user/duo_agent_platform/flows/foundational_flows/software_development.md
  doc/user/duo_agent_platform/flows/foundational_flows/code_review/_index.md
  doc/user/ai-governance/tool-governance.md
  doc/user/ai-governance/ai-audit-events.md
  doc/user/ai-governance/governance-dashboard.md
  doc/administration/gitlab_duo_self_hosted/_index.md
  doc/administration/gitlab_duo/gateway.md
  doc/install/install_ai_gateway.md
Clone: ~/repos/market-research-clones/ai-gateway-clone (gitlab-org/modelops/applied-ml/code-suggestions/ai-assist, full clone)
  LICENSE
  README.md
  pyproject.toml
  duo_workflow_service/README.md
  docs/litellm_model_metadata.md
  ai_gateway/auth/gcp.py, glgo.py, container.py
  ai_gateway/model_selection/models.yml
  duo_workflow_service/security/prompt_security.py
  duo_workflow_service/policies/file_exclusion_policy.py, diff_exclusion_policy.py
  duo_workflow_service/checkpointer/gitlab_workflow.py
