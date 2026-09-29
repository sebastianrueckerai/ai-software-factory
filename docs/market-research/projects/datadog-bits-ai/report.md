---
name: Datadog Bits AI (Dev Agent and SRE)
slug: datadog-bits-ai
url: https://www.datadoghq.com/product/bits-ai/
repo: none
category: telemetry-to-fix
license: proprietary
open_source: no
self_hostable: no
hosting_model: SaaS add-on inside the hosted Datadog platform, billed as consumption-based AI Credits on top of existing observability licensing
company: Datadog Inc, NASDAQ DDOG, public company, founded 2010, HQ New York City, IPO September 2019, market cap roughly USD 80-100 billion in September 2026 (sources disagree on the exact figure)
maturity: shown at DASH June 2025 as a preview (Bits AI SRE, Bits AI Dev Agent); Bits Investigation (the SRE agent) reached general availability December 2025; a "deeper reasoning" harness and MCP tool rework shipped March 2026; Bits Code (the renamed Dev Agent) is now GA; release cadence tracks Datadog's own continuous ship cycle, not a separate one
similarity: 2
axes:
  signals_intake: 3
  control_plane: 2
  sandbox_isolation: 3
  verification: 2
  policy_outside_model: 3
  identity_per_task: 1
  cost_control: 1
  ux: 4
  reseedable_selfhost: 0
steal:
  - "'Fix with Bits' as a one-click affordance directly on an Error Tracking issue, a flaky test, or a Cloud Security finding, starting a scoped session with the finding as context already loaded. A concrete shortcut for turning a SigNoz alert into a bounded task without a human writing a TaskBrief by hand."
  - "Per-repo internet-access tiers (No Internet Access, Default Allowlist, Custom + Default, Custom Allowlist), set in product settings rather than by redeploying a network policy. Worth stealing as a per-project knob on top of our Cilium default-deny, so a project can widen its own egress list without a cluster-level change."
  - "Repo-native instruction files read at session start (AGENTS.md, CLAUDE.md, .cursorrules, .claude/skills/, .codex/skills/, .gemini/skills/). A lightweight, harness-agnostic convention for per-project context that costs nothing beyond a docs convention, worth adopting for TaskBrief augmentation."
  - "The CI feedback loop: the agent watches CI logs and PR comments after pushing and keeps revising until checks pass or a human blocks it, driven by an @-mention rather than a new task. Close to what our worker should do on a reproduction-gate failure instead of failing the whole session."
  - "Hard product rule: Bits Code never auto-merges, regardless of confidence. A useful sanity check against our own auto-merge rule for low-risk, reproduced changes; worth re-reading their reasoning even though we deliberately go further."
  - "The hypothesis-tree investigation shape described in Datadog's engineering blog (targeted, hypothesis-scoped queries instead of dumping all telemetry into one summarisation pass, which the post says degrades accuracy as tokens scale linearly) is directly relevant if we ever build the planned analyzer capability class on SigNoz data."
differs:
  - "Identity is one persistent, org-wide GitHub App install, GitLab personal access token, or Azure DevOps service principal shared by every session and every repo, not a credential minted and scoped per task. It is the opposite of our 'identity belongs to the task' principle, and a leaked or over-scoped install compromises every repo it touches, not one task's blast radius."
  - "There is no self-host path at any tier, including the government cloud sites, which the docs explicitly exclude. The whole product is welded into Datadog's own hosted telemetry, billing, and identity systems, which rules it out entirely against our re-seedable, commodity-hardware constraint, not just as a style difference."
  - "Cost control is a shared, consumption-based AI Credits pool metered after usage (Datadog's own telemetry puts the average investigation at about 6.5 credits, roughly USD 6.50 on an annual commit), not a per-call priced hold taken before an action runs. It bounds a month's spend, not a single action."
ux_verdict: From an existing Datadog estate, a user reaches a proposed pull request in minutes with one click on an alert or issue, which is materially ahead of our console's admitted lack of a live stream or diff view, but the whole experience only exists inside an estate already fully instrumented with Datadog.
slop_verdict: Real and shipping revenue for a public company, not a landing page, but every reliability number found (up to 95 percent faster resolution, 70 percent MTTR cut) comes from Datadog's own marketing or hand-picked customer quotes, and no independent benchmark of its root-cause accuracy was found.
---

# Datadog Bits AI (Dev Agent and SRE)

## 1. What it is

Bits AI is Datadog's family of agents bolted onto its existing observability platform: Bits Investigation (formerly "Bits AI SRE") investigates alerts and proposes root causes, Bits Code (formerly "Bits AI Dev Agent") turns a finding into a pull request, and three more (Bits Security Analyst, Bits Chat, Bits Agent Builder) cover security triage, ad hoc querying, and custom agent assembly. It is sold to existing Datadog customers, billed on consumption-based "AI Credits" stacked on top of normal host, APM, and log licensing. There is no separate company: this is a feature line inside Datadog Inc, a public company (NASDAQ: DDOG) since 2019.

Datadog's own claim is that Bits goes from an alert to a merge-ready pull request "in minutes," reducing time to resolution by up to 95 percent. What the docs and engineering blog actually show is narrower: a real hypothesis-driven investigation loop over Datadog's own telemetry (docs.datadoghq.com/bits_ai/bits_ai_sre/, datadoghq.com/blog/building-bits-ai-sre/), and a real code-fix pipeline that opens a PR and revises it against CI feedback (docs.datadoghq.com/bits_ai/bits_code/, docs.datadoghq.com/bits_ai/bits_ai_dev_agent/setup/), but nothing published names the underlying model, states a measured false-positive rate, or shows an independent benchmark. Third-party reviewers (Better Stack, Sifflet, Corelayer, Struct.ai) mostly sell competing products, so their specific criticisms (blind spots outside the Datadog stack, no memory across investigations, human still required for risky fixes) should be read as plausible rather than confirmed.

## 2. Mapping to our five planes

| Plane / principle | What Bits AI does | What we do | Verdict |
|---|---|---|---|
| Signals | Monitor alerts, incidents, and Error Tracking/Code Security/flaky-test findings inside Datadog trigger a session; "Fix with Bits" is a manual click from an issue view | Forgejo issues, PR comments, SigNoz alerts, factoryd intake API | equal in kind, narrower in source: everything must already be Datadog telemetry |
| Control plane | Sessions listed under Bits AI > Bits Code > Sessions, no published scheduler, no approval workflow beyond a human reviewing the PR | Temporal workflow per task, Postgres task registry, budgets, approvals, audit trail | we lead |
| Worker plane | Each repo runs in "its own isolated sandbox" (docs, implementation not disclosed), setup phase has network access, execution defaults to no internet access with allowlist tiers | gVisor pod per task, its own namespace and ServiceAccount, default-deny Cilium egress | equal in spirit, not verified for their sandbox's actual isolation mechanism |
| Verification | Watches the project's own CI and PR comments, revises code until checks pass; Datadog scans agent-generated code before push, admitted "not foolproof"; never auto-merges | Forgejo Actions on untrusted runners, policy gates by risk class, reproduction gate, stronger-model review, some changes auto-merge | we lead: we run our own gate, they lean on the customer's own CI and a human |
| Merge and deploy | Opens a PR or MR, always requires a human merge, no deploy step | `factory-merge` bot merges after approval or an auto-rule, Flux deploys, staged rollout | we lead |
| Policy outside the model | RBAC permission `bits_dev_write`, per-repo SCM roles (GitLab Developer, Azure Contribute), configurable internet-access tiers, all enforced by the platform, not the prompt | Capability policy as YAML in Git, enforced in gateway code and network policy | equal on "outside the model," coarser grain on theirs (org role, not per-task capability) |
| Identity per task | One persistent GitHub App install, GitLab PAT, or Azure service principal shared across every session and repo in the org | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task | we lead |
| Artifacts not chat | A session mixes chat (Slack @-mentions, PR comments) with the PR as the actual output artifact | TaskBrief in, branch, PR, and normalised event stream out | equal-ish: the artifact exists, but chat remains the steering surface |

## 3. Architecture and stack

Nothing about Bits AI's implementation is open. What is documented: a "shared tasks" foundation (Datadog's own description) of reusable primitives, querying data, analysing anomalies, and similar, that Investigation, Code, and Security Analyst all build on. The March 2026 update gave Bits Investigation "a new agent harness" with tighter MCP tool integration, letting it plan, evaluate competing hypotheses, and refine investigations in real time (datadoghq.com/blog/bits-ai-sre-deeper-reasoning/). No LLM vendor or model size is named in the product page, the setup docs, or the engineering blog; Datadog states "zero data retention with third-party AI providers" for Bits Code, Investigation, and Security Analyst, without naming which providers.

Bits Code integrates with GitHub (app install, Contents and Pull requests read/write, optional Checks/Commit-statuses scopes for CI iteration), GitLab (a persistent PAT with `api`, `write_repository`, `read_user`), and Azure DevOps (an Entra service principal with Contribute-class permissions). Each connected repository gets its own sandbox for a configurable setup phase (language versions, secrets exposed only during setup, an optional shell script with network access to fetch dependencies) and a separate execution phase, where internet access defaults to off and can be widened by policy tier. The whole thing runs inside the Datadog web app; there is no CLI, SDK, or on-prem binary at all.

## 4. UX

For an estate already on Datadog, onboarding is short: install the GitHub/GitLab/Azure DevOps app once, grant the `bits_dev_write` role, and the "Fix with Bits" button appears on Error Tracking issues, Code Security findings, and flaky tests. Clicking it opens an investigation session inside Datadog showing the stack trace, related traces, and logs it is reasoning over, then a proposed PR. A user intervenes by commenting on the PR (mentioning @Datadog) to redirect the fix, by turning off auto-push to force a review inside Datadog before anything is pushed, or simply by not merging, since the agent never merges on its own. Bits Investigation delivers its root-cause conclusion to Slack, Teams, Jira, or ServiceNow before a human even opens the incident.

Against our own console: the session view (hypothesis flow diagram, evidence per hypothesis, a sessions list per repo) is exactly the real-time stream and diff-adjacent view our console admits it lacks. What is worse: everything lives inside one vendor's web app, there is no equivalent of a cross-project kanban board, and none of it exists for a team whose telemetry is not already inside Datadog.

## 5. Security, identity, sandbox, policy, cost

Identity is a single, org-wide, long-lived credential per SCM provider (a GitHub App install, a GitLab PAT, an Azure service principal), shared by every repository and every session, not a credential scoped to one task. The docs themselves warn that holders of certain roles "can influence environment setup and agent execution across all repositories in your organization," an acknowledgement of the blast radius. Sandboxing is a per-repo "isolated sandbox" during setup and execution, with internet access off by default and widened only through an explicit allowlist tier; the isolation mechanism itself (container, VM, or otherwise) is not disclosed. Policy is enforced through platform RBAC and per-repo SCM roles, in code, not in a prompt, which matches our principle in kind though not in grain: a role or an app install, once granted, keeps working for as long as it is held, unlike a token that expires with a task. Cost is a shared, consumption-based AI Credits pool (about 6.5 credits, roughly USD 6.50, per investigation on Datadog's own numbers) metered after the work runs, with no equivalent of a pre-flight priced hold or a hard per-action cap.

## 6. What we should take from it

Against SigNoz specifically, Bits AI is what SigNoz alerting does not yet do: turn an alert into a scoped investigation and a candidate fix, not just a page. The narrowest, cheapest thing to copy is the UX affordance, a "fix this" button on an alert or issue that pre-loads the finding as task context, which we could build on top of a SigNoz alert webhook into factoryd without any new infrastructure. The per-repo internet-access tiers are a concrete, low-effort pattern for letting a project widen its own egress without a Cilium redeploy. The repo-native instruction file convention (AGENTS.md and friends, read straight from the repository) is worth adopting verbatim for TaskBrief augmentation, since it costs only a docs convention. The CI-feedback revise loop (watch CI, keep pushing fixes until checks pass or a human blocks it) matches the retry behaviour our worker should have on a reproduction-gate failure, instead of ending the session on the first red build.

Broadly, Bits AI is evidence that "telemetry in, PR out" is a real, sellable slice of what we call the worker plane, once verification and merge are treated as someone else's problem (the customer's own CI, the customer's own human reviewer). That is a smaller scope than our loop, and it is also why it shipped faster: no control plane, no policy engine, no identity model to build, just a feature riding on an already-hosted observability product.

## 7. Where our philosophy differs and what that costs or buys us

The identity gap is the sharpest: a single persistent app install standing in for a per-task credential is exactly the shape our "identity belongs to the task" principle exists to avoid, and it is not a corner they missed, it is the natural consequence of being a SaaS feature with no per-task sandbox lifecycle to hang a credential off. Building our own worker plane the way Bits AI does would mean giving up a compromise boundary we consider a hard requirement, not an optimisation.

The lack of any self-host option, on any tier, including government cloud, is not a gap either, it is the business model: Bits AI only exists because Datadog already holds the telemetry, the SCM integration, and the billing relationship. Copying that shape would mean giving up re-seedability entirely, since there would be nothing to delete and rebuild, only a subscription to cancel.

Where their approach buys something real: verification-as-someone-else's-CI is cheaper to ship than our own gated pipeline, and "never auto-merge, ever" is a simpler trust model to explain to a buyer than our risk-classed auto-merge rule. We pay for our stronger guarantee (a required gate, some changes merging with no human at all) with a materially bigger system: Temporal, policy YAML, a reproduction gate, a stronger-model review. That is deliberate, and Bits AI's simplicity is the price of never getting to auto-merge anything.

## 8. Red flags and slop assessment

Pricing has already changed twice within about a year: an early-2026 model billed roughly USD 25-30 per conclusive investigation, superseded by the current shared AI Credits pool (roughly USD 6.50 per investigation on Datadog's own average), a pattern worth watching if we ever depend on a vendor's usage-based AI pricing holding still. Independent reviewers (Better Stack, Corelayer) note the agent's accuracy depends on how fully a team has instrumented Datadog itself, a lock-in vector: the better it works, the harder the whole stack is to leave. Datadog's own setup docs flag their own GitHub App's optional `workflows:write` scope as carrying "security implications," and admit that pre-push code scanning is "not foolproof," both self-disclosed rather than found by outside auditors. No independent, third-party benchmark of root-cause accuracy or fix quality was found in this session; every specific number (95 percent faster resolution, 70 percent MTTR cut, 6.5 credits per investigation) traces back to Datadog's own marketing, blog, or a hand-picked customer quote. Zero-data-retention claims for the underlying model provider are asserted but the provider is never named, and 2026 coverage of the wider industry (The Register, 2026-08-20) shows ZDR terms across major model vendors now carry carve-outs (retained data for certain "covered" models, flagged-session retention up to two years), so the claim is not verified against a named contract.

## 9. Sources

- https://www.datadoghq.com/product/bits-ai/ (fetched 2026-09-29)
- https://docs.datadoghq.com/bits_ai/ (fetched 2026-09-29)
- https://docs.datadoghq.com/bits_ai/bits_ai_dev_agent/setup/ (fetched 2026-09-29)
- https://www.datadoghq.com/blog/building-bits-ai-sre/ (fetched 2026-09-29)
- https://www.datadoghq.com/blog/bits-ai-sre-deeper-reasoning/ (2026-03, fetched via search 2026-09-29)
- https://www.datadoghq.com/blog/bits-ai-sre/ (fetched via search 2026-09-29)
- https://www.datadoghq.com/blog/bits-ai-dev-agent/ (fetched via search 2026-09-29)
- https://www.helpnetsecurity.com/2025/12/03/datadog-bits-ai-sre-agent/ (2025-12-03)
- https://betterstack.com/community/comparisons/bits-ai-sre-alternatives/ (fetched via search 2026-09-29)
- https://www.siffletdata.com/blog/datadog-review (fetched via search 2026-09-29)
- https://struct.ai/articles/datadog-bits-ai-pricing-2026/ (fetched via search 2026-09-29)
- https://www.nobs.tech/blog/datadog-bits-ai-pricing-ai-credits-governance (fetched via search 2026-09-29)
- https://stackpick.net/tools/datadog-bits-ai/ (fetched via search 2026-09-29)
- https://www.corelayer.com/guides/best-ai-sre-tools-root-cause-analysis-2026 (fetched via search 2026-09-29)
- https://www.theregister.com/ai-and-ml/2026/08/20/openai-chases-anthropics-biz-customers-with-zero-data-retention-pledge/5290609 (2026-08-20)
- WebSearch: "Datadog Bits AI SRE Agent architecture how it works 2026"
- WebSearch: "Datadog Bits AI Dev Agent pull request code fix"
- WebSearch: "Datadog Bits AI review criticism hallucination reliability 2026"
- WebSearch: "Datadog Bits AI pricing AI credits cost per investigation"
- WebSearch: "Datadog Inc founded 2010 IPO 2019 headquarters New York DDOG market cap 2026"
- WebSearch: "'Bits AI' Datadog which LLM model powers Anthropic OpenAI zero data retention"
