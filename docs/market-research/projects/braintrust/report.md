---
name: Braintrust
slug: braintrust
url: https://www.braintrust.dev
repo: https://github.com/braintrustdata/braintrust-sdk-javascript
category: observability-evals
license: "mixed: SDKs and eval-action Apache-2.0/MIT, autoevals MIT, platform proprietary"
open_source: partial
self_hostable: partial
hosting_model: SaaS by default. Enterprise-only hybrid self-host splits a customer-run data plane from a Braintrust-hosted control plane
company: Braintrust Data Inc, San Francisco. Founded 2023 by Ankur Goyal (ex-Impira, acquired by Figma). Seed 5M USD Dec 2023, Series A 36M USD Oct 2024, Series B 80M USD Feb 2026 at a reported 800M USD valuation (Iconiq, a16z, Greylock)
maturity: braintrust-sdk-javascript created 2023-07-17, last commit 2026-09-29 (renamed from braintrust-sdk after the Python SDK split out). autoevals (the OSS scorer library) has 1041 stars, created 2023-07-11. braintrust-proxy has 412 stars. Dozens of active satellite repos (SDKs in six languages, Terraform and Helm for self-hosting, IDE and CI plugins), most pushed within days of 2026-09-29
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 0
  verification: 2
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 1
  ux: 4
  reseedable_selfhost: 1
steal:
  - "eval-action (GitHub Action): runs evals on push/PR and posts a scored PR comment, with terminate_on_failure to block merge. Same shape as our reproduction gate, but for LLM-output quality drift instead of test pass/fail."
  - "autoevals (MIT, 1041 stars, Python and JS): a ready library of scorers (Levenshtein, factuality, JSON diff, moderation, closed-QA). Use it directly in our stronger-model review gate instead of hand-rolling scorers."
  - "Trace to dataset in one click turns a production trace into a versioned regression case. Directly answers our own stated gap of no regression suite for the harness prompt."
  - "The Temporal tracing plugin attaches spans to workflow and activity boundaries. Since factoryd runs one Temporal workflow per task, this is a concrete pattern for what to instrument in our own SigNoz traces: workflow start, each activity, each retry."
  - "MCP server exposing logs, evals and prompts to an IDE agent. Confirms that giving a coding agent read access to its own prior run history via a capability-scoped tool call is worth adding once we have project memory."
differs:
  - "Braintrust's self-hosted Enterprise plan only moves the data plane (API, Postgres, Redis, object storage, the Brainstore trace engine). Auth, org settings and the web UI always stay in Braintrust's own SaaS control plane, linked by a service token. That is the opposite of re-seedable: no self-hosted deploy can be rebuilt from Git and S3 alone."
  - "Brainstore's stated Kubernetes footprint (one dedicated node per pod, NVMe with at least 150000 IOPS) is priced for an enterprise fleet, not three cpx42 boxes."
ux_verdict: Strong for what it does, live trace search, prompt and model comparison, one-click trace-to-dataset, natural-language search over logs, all absent from our console. But it is a viewer for calls a user's own code already made, not a place to watch or steer a running agent task.
slop_verdict: Real and used in anger, 121M USD raised, named customers, autoevals at 1000-plus stars, near daily commits across 30-plus repos. The slop is in the word self-hosted, only half the stack actually moves to the customer.
---

# Braintrust

## 1. What it is

Braintrust is a commercial platform for tracing, evaluating and grading LLM application output, sold as active observability for AI products. It targets teams already shipping an LLM app or agent who need to see what a model returned in production, turn bad cases into a regression dataset, and block a prompt or model change that regresses quality before it merges. Named customers include Notion, Vercel, Cloudflare, Replit and Airtable. The company claims teams use it to catch prompt regressions in CI. What the code and docs actually show is a well built SDK plus GitHub Action for exactly that workflow, sitting in front of a proprietary hosted web application.

The open part is real but narrow. SDKs in six languages, the autoevals scorer library, eval-action, braintrust-proxy, and Terraform and Helm modules for the self-hostable half of the platform are all on permissive licences. The web UI, the auth and org layer, and the trace storage engine (Brainstore) that the SDKs talk to are closed source.

## 2. Mapping to our five planes

| Plane or principle | What Braintrust does | What we do | Verdict |
|---|---|---|---|
| Signals | None. It receives calls an application already makes, it does not originate work from issues or alerts | Forgejo webhooks, SigNoz alerts, factoryd intake, every task a Forgejo issue | we lead |
| Control plane | A hosted metadata and auth layer plus a customer-run data plane for logs. No task lifecycle or approval state | factoryd with a Temporal workflow per task, Postgres, Git-versioned policy | not comparable |
| Worker plane | None. Braintrust does not run or sandbox agents, only records what one did | One gVisor pod per task, default-deny egress | not comparable |
| Verification | eval-action blocks a PR on a scored eval regression; Loop and Patterns surface recurring failure patterns across traces | Forgejo Actions, policy gates, reproduction gate, stronger-model review | not comparable, narrower but real |
| Merge and deploy | None | Bot merge after human approval or an auto rule, Flux deploy, staged rollout | we lead |
| Policy outside the model | None found. RBAC is a plan-tier feature, not a capability rule engine | Capability rules in Git, enforced in gateway code and network policy | we lead |
| Identity per task | Long-lived API keys and org or project-level provider secrets, no per-task credential | Projected, audience-scoped ServiceAccount token per task | we lead |
| Artifacts not chat | Traces and datasets are artifacts, but there is no branch, PR or event-stream handoff between agent sessions | TaskBrief in, PR and event stream out | not comparable |

## 3. Architecture and stack

The client side is a pnpm and Turborepo monorepo (braintrust-sdk-javascript) with a core braintrust package under js/src (tracing, the Eval() framework in framework.ts, a bt CLI), plus separate integration packages for LangChain, OpenAI Agents, OpenTelemetry, Temporal and the browser. The Python SDK lives in a sibling repo (braintrust-sdk-python), and Go, Ruby, Java, C#, Rust and Kotlin clients exist as further satellite repos, thin wrappers generated from a shared OpenAPI spec.

The server side is not open. Docs describe it as split into a data plane (Braintrust API, Postgres for metadata pointers, Redis for caching, session and rate-limiting, object storage, and Brainstore, a Rust query engine with separate reader, fast-reader and writer node roles for full-text log search) and a control plane (web UI, Clerk-backed auth, lower-sensitivity metadata) that Braintrust always runs itself. Self-hosting the data plane ships as Terraform on ECS for AWS and Terraform plus Helm on Kubernetes for GCP and Azure, in repos named for each cloud plus a shared helm repo.

Model access goes through the customer's own provider keys, optionally proxied via braintrust-proxy (MIT, 412 stars, TypeScript), which adds caching and a unified endpoint across providers, comparable in shape to LiteLLM but scoped to caching and eval speed rather than budgets or policy.

## 4. UX

Zero to first result is installing the braintrust and autoevals packages, writing an Eval() block in a .eval.ts file, then running the eval CLI with an API key: three steps, one command. The web app then shows a per-experiment score table, a live trace view of prompts, tool calls and responses, side-by-side prompt and model comparison, and a natural-language search over logs. eval-action extends the same loop into CI, posting a scored comment on the pull request. There is no view of a running agent task and no place to approve or stop one, because Braintrust does not run the agent, it only records what already ran elsewhere. Against our console, its trace and eval UI is more polished than anything we have, but it answers a narrower question: did this call regress, not what is this task doing right now.

## 5. Security, identity, sandbox, policy, cost

Credentials are long-lived provider API keys held as project or org-level secrets, not task-scoped tokens. In self-hosted mode secrets live in the customer's data plane, in SaaS mode in Braintrust's control plane. There is no sandbox, Braintrust never executes agent or model code, it only ingests what a client SDK reports. Policy is plan-gated, RBAC and SAML SSO are Enterprise-only, Pro has basic roles only, rather than a capability rule engine, and there is no network egress control since nothing runs inside Braintrust. Cost is tracked, per-trace latency, cost and quality metrics, metered billing by data processed and scores computed, but not capped: no spend hold, no budget envelope comparable to our gateway's price then hold then book pattern. SOC 2 Type II and GDPR are on all plans, HIPAA needs a BAA on Enterprise only.

## 6. What we should take from it

Narrow: adopt autoevals outright for our stronger-model review gate's scorers instead of writing our own. Add an eval-action-shaped step to Forgejo Actions that scores harness output against a fixed dataset and fails the gate on regression. Our closest current equivalent is the reproduction gate, but it checks pass or fail, not graded quality drift. Add a trace-to-dataset action so an escalated or failed task becomes a permanent regression fixture, filling a gap our own vision doc already names.

Broad: exposing an agent's own log and eval history back to it through an MCP tool, rather than context-stuffing, is worth planning for once we build project memory. The data-plane and control-plane split is a useful reference shape for what must never leave the customer's infrastructure, even though we cannot adopt Braintrust's own SaaS control plane, per section 7.

## 7. Where our philosophy differs and what that costs or buys us

Braintrust's self-hosted tier only relocates the data plane. Auth, org settings and the UI stay in Braintrust's SaaS permanently, linked by a service token per their own docs. That directly breaks our re-seedable constraint: nothing about Braintrust as a dependency can be rebuilt from Git and an offline seed bundle, because half of it is not ours to rebuild. Using Braintrust for our own LLM observability would leave a factory reseed dependent on an external vendor being up and our contract with them being current.

Their credential model is long-lived API keys at org or project scope, not identity per task. Feeding Braintrust from our worker plane would mean either giving every task's sandbox a shared logging key, a capability rather than per-task identity, or proxying all trace writes through factory-gateway ourselves, the same brokering work we already do for LiteLLM. Their control-plane hardware assumptions, dedicated Kubernetes nodes and NVMe storage rated at 150000 or more IOPS for Brainstore, also do not fit our three cpx42 commodity-hardware budget, so even the self-hostable half is sized for a bigger buyer than us.

## 8. Red flags and slop assessment

Real and actively maintained: 121M USD raised over three rounds, an 800M USD reported Series B valuation in February 2026, named production customers, and commits across more than 30 repos within days of this report. autoevals, at 1041 stars, and braintrust-proxy, at 412 stars, are genuinely used outside the company, not internal plumbing with a public mirror.

The main red flag is the self-hosted label itself. The product name and marketing imply a fully self-run deployment, the docs concede only the data plane moves, and forking or swapping components is called non-standard and asks for prior review with Braintrust. Second-hand comparison articles, including Arize's own FAQ, claim Braintrust supports far fewer agent-tracing instrumentation paths than competitors. Braintrust's own docs push back with multi-agent tracing guides, so treat that specific claim as contested, not verified either way.

## 9. Sources

https://www.braintrust.dev, fetched 2026-09-29
https://www.braintrust.dev/docs/guides/self-hosting, fetched 2026-09-29
https://www.braintrust.dev/pricing, fetched 2026-09-29
https://www.braintrust.dev/security, attempted 2026-09-29, returned HTTP 404
WebSearch, 2026-09-29, Braintrust AI funding Series valuation 2025 2026
WebSearch, 2026-09-29, Braintrust vs Langfuse vs Arize Phoenix comparison
gh api repos/braintrustdata/braintrust-sdk, redirects to braintrust-sdk-javascript, 2026-09-29
gh api orgs/braintrustdata/repos, 2026-09-29
gh api repos/braintrustdata/braintrust-proxy, 2026-09-29
gh api repos/braintrustdata/eval-action, 2026-09-29
gh api repos/braintrustdata/braintrust-sdk-python, 2026-09-29
gh api repos/braintrustdata/autoevals, 2026-09-29
Local shallow clone of braintrustdata/braintrust-sdk-javascript at market-research-clones/braintrust, last commit 2026-09-29 14:38:08 +0200
market-research-clones/braintrust/README.md
market-research-clones/braintrust/AGENTS.md
market-research-clones/braintrust/LICENSE
market-research-clones/braintrust/js/src/framework.ts
market-research-clones/braintrust/package.json
