---
name: OpenAI Frontier
slug: openai-frontier
url: https://openai.com/business/frontier
repo: none
category: enterprise-agent-platform
license: proprietary
open_source: no
self_hostable: no
hosting_model: vendor SaaS, sales-gated, sold with paired OpenAI Forward Deployed Engineers
company: OpenAI Group PBC, San Francisco, founded 2015, restructured to a public benefit corp in 2025, 852 billion USD valuation at its March 2026 funding close
maturity: launched 2026-02-05, still "available to a limited set of customers" per OpenAI's own announcement, no public changelog of its own, no repo, no SDK
similarity: 2
axes:
  signals_intake: 1
  control_plane: 2
  sandbox_isolation: 1
  verification: 1
  policy_outside_model: 2
  identity_per_task: 2
  cost_control: 1
  ux: 2
  reseedable_selfhost: 0
steal:
  - "The layered pitch of business context, agent execution, evaluation, and governance as four named, separate concerns is a clean way to explain a factory's shape to a non-technical stakeholder. Worth reusing the four-word framing in our own portfolio narrative even though our actual mechanisms differ."
  - "Frontier explicitly governs agents from other model vendors (Google, Microsoft, Anthropic) alongside its own, positioned as a control-plane feature rather than a concession. It is a reminder to keep pushing multi-vendor routing through LiteLLM as a selling point, not just a cost hedge."
  - "OpenAI's Responses API added async tool calling and mid-turn steering over WebSockets on 2026-09-03 (developers.openai.com/api/docs/guides/steering): a client can inject a response.steer event referencing the in-progress previous_response_id without losing prior work. If our harness interface ever needs a live-inject path for a supervisor's 'redirect' verdict instead of killing and restarting the session, this is a concrete mechanism to study, though it is a model-API feature, not something we saw Frontier itself expose."
  - "The same Responses API update lets a caller raise or lower reasoning effort mid-conversation with a configuration_update item, instead of restarting on a different model. Our own retry-on-a-stronger-model ladder could take a cheaper first step: bump effort on the same model before promoting to coding-frontier."
  - "Frontier's agent identities live inside the customer's existing enterprise IAM rather than a separate agent-only system. Confirms a default worth keeping: task identity should extend an org's existing identity plane (for us, the cluster OIDC issuer and Forgejo accounts), not invent a parallel one."
differs:
  - "Frontier's governance, evaluation and orchestration all run inside OpenAI's own infrastructure, for agents built by OpenAI, the customer, or third parties alike. Jason Stanley's critique (linked in sources) is the sharp version: the model vendor also runs the control plane that governs competing agents, an asymmetry we avoid by keeping factoryd, the policy file and the gateway entirely ours and model-vendor-agnostic."
  - "Nothing about Frontier is inspectable or self-hostable: no repo, no SDK, no on-prem control plane, sales-gated pricing, deployment via paired Forward Deployed Engineers. Adopting anything at the platform level would violate our re-seedable and commodity-hardware constraints outright, there is no artifact to rebuild from Git."
  - "Every mechanism claim (agent identity, permission scoping, evaluation loops) is asserted in marketing prose, not shown as code, a config schema, or an API payload. Our own principle that policy lives outside the model is falsifiable by reading the gateway and the policy YAML; Frontier's equivalent claim is not independently checkable from anything public."
ux_verdict: sales-gated with no self-serve trial; a user reaches Frontier's agents through interfaces they already have (ChatGPT Enterprise, the Atlas browser, embedded business apps) rather than a dedicated console, so onboarding is a Forward Deployed Engineer engagement, not a quickstart
slop_verdict: real, with named large customers (HP, Intuit, Oracle, State Farm, Thermo Fisher, Uber) and a services arm doing the integration work, but the public surface is entirely marketing copy and third-party guesswork; no docs, no API reference, no pricing and no way to verify a single mechanism claim independently
---

# OpenAI Frontier

## 1. What it is

OpenAI Frontier is OpenAI's enterprise platform for running "AI coworkers" against a company's own systems, launched 2026-02-05 and sold through direct enterprise sales paired with Forward Deployed Engineers from "The OpenAI Deployment Company". It sits above ChatGPT Enterprise, Codex and the Atlas browser, adding a shared context layer, an execution layer, evaluation loops, and identity and governance controls. OpenAI's own launch post names HP, Intuit, Oracle, State Farm, Thermo Fisher and Uber as first adopters, with BBVA, Cisco and T-Mobile in pilots. CFO Sarah Friar has said enterprise revenue is roughly 40 percent of OpenAI's business today, with a stated goal of about 50 percent, which is the commercial reason for Frontier's existence.

What OpenAI claims: agents get "the same skills people need to succeed at work", shared context, onboarding, feedback-driven improvement, and identity with clear boundaries, deployed without forcing a company to replatform. What the public material actually shows: a product page and a launch post with a layered architecture diagram, zero API documentation, zero pricing, zero open source code, and a sales contact form. Every mechanism described (business context, agent execution, evaluation and optimization, IAM) is a paragraph of prose, not a spec.

## 2. Mapping to our five planes

| Plane or principle | What Frontier does | What we do | Verdict |
|---|---|---|---|
| Signals | No documented issue, alert or webhook intake. "Business context" connects CRM, ticketing and data warehouse systems for agents to reference, not to trigger work | Forgejo webhooks, SigNoz alerts, factoryd intake API, every task a Forgejo issue | we lead |
| Control plane | "Agent execution" runs agents in parallel across workflows; no published task registry, scheduler or durable state model | factoryd with a Temporal workflow per task, Postgres, policy in Git | we lead |
| Worker plane | Agents can run "locally, on enterprise cloud infrastructure, or OpenAI-hosted runtimes"; no sandbox, egress or isolation detail published | One gVisor pod per task, default-deny egress to an explicit allowlist | not comparable |
| Verification | "Evaluation and optimization" loops report what is working so agents "improve with experience"; no CI, no merge gate, no described review step | Forgejo Actions, deterministic policy gates, stronger-model review with a strict verdict | we lead |
| Merge and deploy | Not addressed. Frontier lists software engineering as one of many "AI teammate" use cases, with no build-test-merge loop described | Bot merge after human approval or an auto rule, Flux deploy, staged rollout with an alert-free soak | not comparable |
| Policy outside the model | RBAC and scoped agent identities are asserted as platform features, layered on the customer's existing enterprise IAM | Capability rules as a Git-versioned document enforced in gateway code and network policy | not comparable, unverifiable |
| Identity per task | Each agent gets "its own identity" with permission boundaries, extending workforce IAM; no token lifetime, rotation or brokering mechanism published | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified against the cluster OIDC issuer | we lead, on published detail |
| Artifacts not chat | Agents are reachable through ChatGPT, Atlas workflows or embedded business apps, chat and UI surfaces throughout | TaskBrief in, a branch, a PR and a normalised event stream out | we lead |

## 3. Architecture and stack

Nothing about Frontier's internals is public. The launch post's own architecture diagram shows three stacked layers: interfaces on top (ChatGPT Enterprise, Atlas, business applications), an agent layer in the middle (the customer's own agents, OpenAI's agents, third-party agents), and three foundational layers underneath (business context, agent execution, evaluation and optimization). There is no repository, no SDK release, and no API reference distinct from OpenAI's existing Responses API. The only concrete, dated technical artifact adjacent to Frontier is the Responses API's 2026-09-03 changelog entry adding async tool calling, mid-turn steering over WebSockets, and mid-conversation reasoning-effort changes for the GPT-6 Astra model, all pitched at "long-running agent work". Whether Frontier's own agent execution layer actually uses these, versus general availability to every Responses API caller, is not stated anywhere found, and is treated here as inference, not fact. Third-party guides (NxCode, Meta Intelligence) describe a "semantic layer" and multi-agent handoff patterns, but these are analyst reconstructions, not OpenAI documentation, and are marked as such.

## 4. UX

There is no self-serve path. The product page's only call to action is "Contact sales". OpenAI pairs Forward Deployed Engineers with the customer's team to design the deployment, meaning time-to-first-result is a services engagement measured in weeks, not a quickstart measured in minutes. Once running, a Frontier "coworker" is not accessed through a dedicated Frontier console: OpenAI's own copy says agents are "accessible and useful through any interface... whether that is interacting with ChatGPT, through workflows with Atlas, or inside existing business applications". No screenshot of a Frontier-specific dashboard was found in the launch materials; observability is described only as "agent actions are visible and auditable" with "built-in monitoring and detailed logs", with no image or example log shown. Compared with our own console, which is at least a real kanban board a developer can point a browser at, Frontier's public materials show no equivalent artifact to inspect.

## 5. Security, identity, sandbox, policy, cost

Identity and policy are described as an extension of the customer's own enterprise IAM: "Agent identities let you scope access to exactly what each task requires." No detail is published on token format, lifetime, or how a scope is enforced at call time, in contrast to a vault, a JWT or a capability header we could point to in a competitor's code. Compliance claims (SOC 2 Type II, ISO/IEC 27001, 27017, 27018, 27701, CSA STAR) are OpenAI's general enterprise data-handling certifications, published on openai.com/business-data, and are not specific to Frontier's agent execution layer. Sandbox and network egress control for the execution layer is not addressed anywhere found; OpenAI's copy only says agents can run "locally, on enterprise cloud infrastructure, or OpenAI-hosted runtimes" without saying what isolates one customer's or one agent's execution from another. Cost: the general ChatGPT Enterprise and Codex product line has "centralized spend controls" (workspace defaults, group limits, individual overrides), per openai.com/business-data, but nothing Frontier-specific on a per-agent or per-task budget, hold, or ledger was found. Pricing itself is unpublished, set per customer on agent count, data volume, API usage and FDE support, with industry commentary expecting six- to seven-figure annual commitments.

## 6. What we should take from it

Narrow: the Responses API's mid-turn steering and mid-conversation reasoning-effort change (2026-09-03) are worth reading in full for our own supervisor mechanism, a live inject-and-continue path is cheaper than kill-and-restart when a supervisor's verdict is "redirect", and a same-model effort bump is a smaller intervention than promoting to coding-frontier on every retry. Both are OpenAI-model-level features we could use regardless of whether we ever touch Frontier itself.

Broad: keeping agent identity inside the org's existing IAM rather than a parallel system is a default we already follow (cluster OIDC, Forgejo accounts) and Frontier's framing is a useful confirmation, not a new idea. The four-layer pitch (context, execution, evaluation, governance) is a reusable way to narrate our own five planes to a non-technical audience, worth borrowing as language, not as architecture.

## 7. Where our philosophy differs and what that costs or buys us

Frontier concentrates governance, evaluation and execution for agents of any model vendor inside infrastructure OpenAI itself controls and profits from. Our design keeps the gateway, the policy file and the audit trail entirely ours and vendor-agnostic on purpose, so no single model provider ever sits inside our control plane. Frontier's bet is that convenience and a single throat to choke outweighs that concentration risk; our bet is the opposite, and this report found no evidence in the public materials that would change that judgement.

Frontier is closed end to end: no repository, no self-hosted control plane, sales-gated pricing, deployment mediated by paired engineers. Building any part of a factory on it would break both re-seedable and commodity-hardware constraints immediately, there is nothing to delete and rebuild from Git. The cost of not using it is entirely the cost of building our own context layer, execution sandbox and evaluation loop by hand, which is most of what this project already does.

## 8. Red flags and slop assessment

Frontier is a real, sold product with named large enterprise customers and a dedicated services organisation, not a vapourware announcement. Set against that, the public surface is unusually thin for a platform pitched this broadly: no API reference, no pricing, no SDK, no repository, no independent technical teardown found beyond analyst guesswork explicitly labelled as such by its own authors (NxCode, Meta Intelligence). Hacker News reception at launch was mixed to skeptical (news.ycombinator.com/item?id=46899770), with the sharpest thread being vendor lock-in: a commenter argued against tethering a workflow platform to an LLM vendor "when that may just be a component of the platform". Analyst commentary (VentureBeat, quoting Wayfound's CEO) frames this as a live tension with the broader enterprise trend toward multi-vendor AI architectures. Jason Stanley's substack piece is the most substantive independent critique found: since OpenAI is simultaneously the model vendor, the platform operator and a competing agent builder inside its own marketplace, its governance and evaluation layers grade OpenAI's own agents under OpenAI's own eval design. No security incident or licence change applies, since nothing is open source to have a licence.

## 9. Sources

https://openai.com/business/frontier/, scraped via firecrawl 2026-09-29
https://openai.com/index/introducing-openai-frontier/, scraped via firecrawl 2026-09-29
https://openai.com/business-data/, scraped via firecrawl 2026-09-29
https://developers.openai.com/api/docs/guides/steering, via WebSearch summary 2026-09-29
https://developers.openai.com/api/docs/changelog, via WebSearch summary 2026-09-29
https://news.ycombinator.com/item?id=46899770, via WebSearch summary 2026-09-29
https://jasonstanley.substack.com/p/who-governs-the-agents-openai-frontier, via WebSearch summary 2026-09-29
https://venturebeat.com/orchestration/openai-launches-centralized-agent-platform-as-enterprises-push-for-multi, via WebSearch summary 2026-09-29
https://www.cnbc.com/2026/02/05/open-ai-frontier-enterprise-customers.html, via WebSearch summary 2026-09-29
https://futurumgroup.com/insights/openai-frontier-close-the-enterprise-ai-opportunity-gap-or-widen-it/, via WebSearch summary 2026-09-29
https://www.constellationr.com/insights/news/new-tech-same-enterprise-playbook-openai-launches-frontier-alliances-partner-program, via WebSearch summary 2026-09-29
https://www.cnbc.com/2026/03/31/openai-funding-round-ipo.html, via WebSearch summary 2026-09-29
WebSearch: "OpenAI Frontier enterprise program 2026", 2026-09-29
WebSearch: "OpenAI Frontier platform architecture governance agent orchestration technical details", 2026-09-29
WebSearch: "OpenAI Frontier Agent Execution sandbox compute code interpreter self-hosted runtime", 2026-09-29
WebSearch: "OpenAI Responses API September 2026 async tool calling mid-turn steering reasoning effort", 2026-09-29
WebSearch: "OpenAI Frontier Hacker News OR Reddit reception criticism vendor lock-in", 2026-09-29
WebSearch: "OpenAI valuation 2026 funding round employees headquarters", 2026-09-29
No public repository exists for this project, no clone was made
