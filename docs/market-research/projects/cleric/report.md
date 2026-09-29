---
name: Cleric
slug: cleric
url: https://cleric.ai
repo: none
category: telemetry-to-fix
license: proprietary
open_source: no
self_hostable: no
hosting_model: hosted SaaS only, US or EU region; an in-network "Cleric Connector" reaches private endpoints on Pro tier and above; no on-prem or self-host package found
company: Cleric, San Francisco, founded 2023 by Shahram Anver (CEO) and Willem Pienaar (CTO, creator of the Feast OSS feature store); 9.8M USD total seed funding (Zetta Venture Partners 4.3M March 2024, Vertex Ventures US 5.5M December 2025)
maturity: no public repository; about 17-25 employees per Tracxn (Jan 2026) and StartupIntros; production customer since early 2025 (BlaBlaCar); Gartner Cool Vendor in AI for SRE and Observability 2025; docs, pricing and blog actively updated through September 2026
similarity: 2
axes:
  signals_intake: 4
  control_plane: 1
  sandbox_isolation: 0
  verification: 2
  policy_outside_model: 2
  identity_per_task: 1
  cost_control: 3
  ux: 4
  reseedable_selfhost: 0
steal:
  - "A post-deploy verification window keyed to the merged PR's own stated intent, watching p95 latency, error rate and DB connections for up to 14 days, not our current 15-minute staging soak, catches regressions that only show up days later."
  - "Confidence-scored findings that stay silent below a threshold and only post above it (async by default, faster interactive mode on request), a cheap pattern for our own alert-verdict and supervisor escalation path."
  - "Every line of a fix PR links to the production data behind it, a concrete discipline for our own model-review output and fix PRs so a human approver checks evidence, not just a verdict."
  - "A layered knowledge graph: a deterministic layer built by walking infrastructure with the same CLIs an engineer uses, plus a fuzzy inferred layer of undocumented relationships, refreshed by background jobs and by findings written back from live investigations. A concrete shape for our stated gap of no project memory and no codebase index."
  - "Read-only-by-default integrations with an hourly health check and a visible Connected/Error badge per integration, a simple pattern our console could copy today for surfacing gateway and credential health."
  - "Cost expressed in human-legible units of work (10 credits per investigation, 1 credit per minute of chat) rather than raw token spend, worth carrying into our own cost view."
differs:
  - "Identity is one long-lived credential per integration, supplied once and reused for every investigation, the opposite of our per-task, short-lived, audience-scoped token; a compromised key stays valid for every future investigation, not one task."
  - "Cleric never runs or edits code in a sandbox. It only reads existing systems and proposes a PR, so it sidesteps our whole worker-plane and sandbox-isolation problem instead of solving it; copying its shape would mean permanently limiting agents to diagnosis and suggestion."
  - "Closed-source SaaS with no self-host path. Taking a dependency on it, or copying its exact design as a component, would put part of our telemetry-to-fix story permanently outside the re-seed-from-Git and commodity-hardware constraints."
ux_verdict: Read-only credentials connected in an afternoon, Slack-native alerts with confidence scores and an approve-or-request-changes PR flow are materially ahead of our console's current lack of real-time streams and diff views, but the whole surface is a closed SaaS product tour, not something we can inspect end to end.
slop_verdict: Real and funded (9.8M USD seed, a Gartner Cool Vendor citation, a named production customer since 2025) with technical depth beyond the landing page in two ZenML case studies, but there is no public code, an empty trust.cleric.ai page despite a SOC 2 Type II claim on the homepage, and no independent user discussion found on Reddit or Hacker News.
---

# Cleric

## 1. What it is

Cleric (cleric.ai; cleric.io redirects there) is a proprietary SaaS "AI SRE" agent from a San Francisco startup founded in 2023 by Shahram Anver and Willem Pienaar, the creator of the Feast open-source feature store. It targets platform and SRE teams running production stacks on Kubernetes and the major clouds. The pitch is telemetry-to-fix and on-call automation, not general coding: triage the alert flood, find a root cause in about five minutes, open a fix PR, then keep watching the deployed change for up to 14 days for regressions. It reads existing observability, cloud and git systems through credentials the customer supplies, and it writes only through a pull request a human reviews.

The makers claim "the first autonomous AI site reliability engineer," 92% actionable findings, over 200,000 production investigations, and a Gartner Cool Vendor citation, alongside a customer (BlaBlaCar) running it since early 2025. What the docs and independent write-ups show is narrower: a read-only-by-default credential model that graduates to write access only when the customer opts in, a knowledge graph built from background scans plus live investigation findings, and confidence-scored findings that stay silent below a threshold. Two 2026 competitor comparison posts describe Cleric as recommendation-only with no automated fix generation, which conflicts with the current homepage's fix-PR framing. Either the product gained write capability since those posts, or the two disagree on what counts as a fix; this could not be resolved from outside.

## 2. Mapping to our five planes

| Plane / principle | What Cleric does | What we do | Verdict |
|---|---|---|---|
| Signals | Ingests alerts from Datadog, Grafana, Prometheus, Elasticsearch and PagerDuty, triages at scale (one worked example: 47 alerts in a day, 41 closed as noise, 5 fixed, 1 escalated), and separately watches a merged PR's own stated intent against production metrics for up to 14 days | Forgejo webhooks, SigNoz alerts, factoryd intake API, every task a Forgejo issue | they lead |
| Control plane | A web app with Issues, Changes, Chats, Knowledge, Automation and Performance tabs; no durable task registry, scheduler or approval state machine found | factoryd with a Temporal workflow per task, Postgres task registry, policy as a file in Git | we lead |
| Worker plane | No sandbox. Cleric queries existing tool APIs read-only by default, and never executes or edits code in an isolated environment | One disposable gVisor pod per task, default-deny egress | not comparable |
| Verification | A human approves or requests changes on the fix PR; after deploy Cleric watches metrics for up to 14 days and confirms resolution; no CI, no tests, no automated policy gate before the PR is opened | Forgejo Actions, path and migration risk gates, reproduction gate, stronger-model review before merge | mixed, they lead on a long post-deploy telemetry window, we lead on pre-merge gates |
| Merge and deploy | A human merges the PR through the normal repository process; Cleric does not deploy | Bot merge after a whitelisted approval or an auto rule, Flux GitOps rollout | not comparable |
| Policy outside the model | Enforced through credential scope: a read-only integration cannot be talked into a write by the agent; no declarative policy document or capability classes | Capability rules as a YAML file in Git, enforced in gateway code and network policy | we lead on granularity, equal on keeping the read/write line outside the prompt |
| Identity per task | One long-lived credential per integration, supplied once and reused for every investigation, checked hourly for health, not rotated per task | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task | we lead |
| Artifacts not chat | A PR is the output for a fix, but the normal interaction surface is a running Slack thread and a Chats tab, closer to chat than to an artifact handoff | TaskBrief in, a branch, a PR and a normalised event stream out, no chat channel is the coordination path | we lead |

## 3. Architecture and stack

No source is public, so this section rests on docs.cleric.ai and a ZenML LLMOps case study, marked as such rather than as code read directly. Cleric layers a knowledge graph over the customer's infrastructure: cloud project, network or region, Kubernetes cluster, node, container or pod, process, then code and variables, with cross-links for relationships outside that hierarchy, such as code that references an IP belonging to an external service. A deterministic layer is built by background jobs walking the infrastructure with the same tools an engineer would use (kubectl, gh, aws CLIs, per docs.cleric.ai/integrations/overview); a fuzzy inferred layer of undocumented relationships sits on top; both are refreshed continuously, though the case study says the graph goes stale quickly as IPs roll and pods are renamed. Memory is split three ways: the graph (system state), runbooks and team docs (procedural), and past incidents mined largely from Slack threads (episodic). No model provider is named anywhere found; the case study describes cheaper models for background scanning under a daily budget and stronger reasoning models for investigations, and says vision models on metric time series are unreliable. Deployment is SaaS only: pick a US or EU region, connect integrations by credential, and on the Pro tier and above a Cleric Connector runs inside the customer's network to reach private endpoints. There is no self-hosted or on-prem package; a claim that the agent runs inside the customer's VPC describes read access to existing tools via supplied credentials, not a deployed copy of Cleric's own control plane.

## 4. UX

Onboarding: sign up, connect read-only credentials to the stack (in an afternoon per the site), start on 500 no-time-limit trial credits, and the first investigation runs against real alerts as they occur. A user watches work through the web app's tabs (Issues, Changes, Chats, Knowledge, Automation, Performance) and through Slack threads where Cleric posts anomalies, evidence and resolutions inline; the site claims engineers stop opening Cloudflare and Datadog dashboards once this is wired up, not independently verified. Intervention is mostly asynchronous: below a confidence threshold Cleric stays silent, above it, it posts; a user can also chat with it directly, which switches it to a faster, threshold-relaxed mode. Approval is a button on the fix PR, Approve or Request changes, inside an ordinary PR review, not a separate control surface; the documented example timeline (PR opened 10:22, approved 10:31, deploy verified by Cleric at 10:52) is the entire human-in-the-loop story shown. This is materially ahead of our console's acknowledged gaps (no real-time streams, no diff view): Cleric already ships confidence scores, an evidence trail per PR line, and a persistent chat surface. It is also entirely closed. There is no way to inspect what Automation or Performance actually contain beyond the marketing description.

## 5. Security, identity, sandbox, policy, cost

Identity and credentials: one credential per integration (API key, token or service account), supplied once, reused for every investigation, health-checked hourly with a Connected or Error badge; the MCP server instead issues one per-user API key from a settings page. There is no per-task or per-session credential and no rotation tied to a task's lifetime. Policy: read access by default, write access when you're ready is enforced by the scope of the stored credential itself rather than by a prompt, and docs list per-integration read and write toggles (for example, Jira's separate Create Issues permission), but there is no capability language, no versioned policy document, and no network-level egress control described anywhere. Sandbox: none. Cleric never executes code; it calls the same read APIs, and once trusted, write APIs like opening a PR, that an engineer would, inside the vendor's own SaaS compute, not the customer's. Cost: usage-based credits priced per unit of work, 10 credits for a regression check or an investigation, 1 credit per minute of chat, a per-investigation spend cap reported elsewhere as 10 cents to a dollar, a settable hard cap, and a stated policy of no overage billing without written approval. There is no visible task-level budget hierarchy like ours of per task, per day and per project envelopes.

## 6. What we should take from it

Narrow: adopt a genuinely long post-deploy verification window keyed to what the PR itself claimed to fix, not just our current 15-minute staging soak; watching production evidence for days rather than minutes catches regressions our workflow would currently miss. Borrow the confidence-threshold-then-silence pattern for our own alert and supervisor path, escalating a verdict only once a score clears a bar instead of surfacing every stall or retry. Copy the every-line-links-to-the-production-data-behind-it discipline for our model-review output and fix PRs, so a human approver checks evidence rather than trusting a verdict. Their layered knowledge graph, a deterministic layer from walking infrastructure plus a fuzzy inferred layer, refreshed by background scans and by findings written back from live runs, is a concrete design to steal against our own stated gap of no project memory and no codebase index.

Broad: the read-only-by-default, hourly-health-checked integration model, with a visible per-integration Connected or Error badge, is a simple pattern our console could copy today for surfacing gateway and credential health, cheaper than building a full trace UI first. Cost framed in human-legible units of work, one investigation, one regression check, one minute of chat, rather than raw token spend, is worth carrying into our own cost view, since per-task, per-day, per-project dollar figures are harder to reason about at a glance than ten credits for a check.

## 7. Where our philosophy differs and what that costs or buys us

Cleric's whole identity model is one long-lived, reused credential per integration, the opposite of our identity-per-task principle. Copying it would trade short-lived, audience-scoped tokens for a simpler but permanently standing key that, once compromised, is valid for every future investigation, not one task. Cleric also never builds or runs code in a sandbox: it stays inside read existing systems, propose a PR, which sidesteps our whole worker-plane and sandbox-isolation problem rather than solving it. Adopting that shape would mean permanently limiting agents to diagnosis and suggestion, a much smaller ambition than agents that edit and test code end to end. Finally, it is closed-source SaaS with no self-host path. Taking a dependency on it, or copying its exact design as a component, would put part of our telemetry-to-fix story permanently outside the re-seed-from-Git and commodity-hardware constraints; keeping those constraints means building the equivalent ourselves rather than depending on Cleric.

## 8. Red flags and slop assessment

Real signals: 9.8M USD in seed funding across two rounds (Zetta Venture Partners, 4.3M, March 2024; Vertex Ventures US, 5.5M, December 2025), a Gartner Cool Vendor citation for 2025, a named production customer since early 2025, and technical depth in two ZenML LLMOps case studies that goes past a landing page, staged investigation goals, a layered knowledge graph, confidence scoring described by the company as core IP. Against that: no public repository to check any claim against code, an empty trust.cleric.ai page despite a SOC 2 Type II claim on the homepage, and no independent user discussion found on Reddit or Hacker News; every third-party mention found was a press release, an investor's post, or a competing vendor's comparison page. Two 2026 competitor posts describe the product as recommendation-only, contradicting the current homepage's fix-PR framing, either fast product movement or marketing ahead of what an outside reviewer actually saw, not resolvable from outside. Headcount estimates of 17 per Tracxn and under 25 per StartupIntros suggest a small team for the surface area claimed: 200,000-plus investigations, SOC 2 Type II, penetration testing, EU and US hosting, SSO and SAML.

## 9. Sources

- https://cleric.io, redirects 301 to https://cleric.ai/, fetched 2026-09-29
- https://cleric.ai/, fetched 2026-09-29
- https://docs.cleric.ai/integrations/overview, fetched 2026-09-29
- https://cleric.ai/pricing, fetched 2026-09-29
- https://trust.cleric.ai, fetched 2026-09-29, empty JS shell, no content beyond the heading
- https://www.zenml.io/llmops-database/ai-sre-agents-for-production-system-diagnostics, fetched 2026-09-29
- WebSearch: Cleric AI SRE agent cleric.io funding founded company, 2026-09-29
- WebSearch: Cleric.io AI SRE review reddit hacker news, 2026-09-29
- WebSearch: Cleric.ai security architecture read-only permissions integrations Kubernetes access, 2026-09-29
- WebSearch: cleric.ai OR Cleric AI employees headcount LinkedIn team size 2026, 2026-09-29
- https://pulse2.com/cleric-4-3-million-raised-and-autonomous-ai-site-reliability-engineer-unveiled/, via WebSearch, dated 2024
- https://medium.com/vvus/reinventing-sre-with-ai-our-investment-in-cleric-6c2ced0b3f12, via WebSearch, dated December 2025
- https://secure.businesswire.com/news/home/20251209625361/en/Cleric-Launches-the-First-Self-Learning-AI-SRE, via WebSearch, dated December 2025
- https://tracxn.com/d/companies/cleric, headcount figure via WebSearch
- gh api search for a Cleric GitHub org or repo, rate-limited on retry, no public organisation or repository found for the company
