---
name: Promptfoo
slug: promptfoo
url: https://promptfoo.dev
repo: https://github.com/promptfoo/promptfoo
category: observability-evals
license: MIT
open_source: yes
self_hostable: yes
hosting_model: "self-hosted CLI and viewer (npm, Docker, Helm) or Promptfoo Cloud and Enterprise SaaS or On-Prem"
company: "Promptfoo Inc, founded 2024 by Ian Webster and Michael D'Angelo, about 11 staff, raised roughly 23M USD including an 18.4M USD Series A led by Insight Partners with Andreessen Horowitz, valued at 86M USD in July 2025 (PitchBook), agreed to be acquired by OpenAI, announced 9 March 2026, close not confirmed"
maturity: "25.6k GitHub stars, 2.4k forks, 355 contributors, 426 releases since the first tag in mid-2023, repository created 28 April 2023, last commit 29 September 2026, weekly or faster release cadence"
similarity: 2
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 1
  verification: 5
  policy_outside_model: 2
  identity_per_task: 0
  cost_control: 2
  ux: 4
  reseedable_selfhost: 2
steal:
  - "The promptfoo-action GitHub Action pattern: on a PR touching prompt files, run eval on base and head, post one PR comment with a pass-rate and score diff table plus a link to the full interactive result. This is the literal shape of the before-and-after gate we do not have for the harness, supervisor or review prompt."
  - "The assertion type vocabulary as a ready-made schema for a prompt regression file: equals, contains, regex, is-json, is-valid-function-call, tool-call-f1 and the trajectory:tool-used, trajectory:tool-sequence, trajectory:step-count family for grading tool-calling agents. Cheaper than inventing our own expectation DSL."
  - "The indirectInjectionVar mechanism from the indirect-prompt-injection plugin: one config field names the templated variable holding untrusted text, and adversarial payloads are generated against it. Copyable shape for our own trust-boundary tests: name the issue-body or PR-comment variable in the harness, supervisor and review prompt templates and fail CI on instruction-following."
  - "The coding-agent plugin catalogue (repo-prompt-injection, terminal-output-injection, secret-env-read, sandbox-read-escape, sandbox-write-escape, verifier-sabotage, network-egress-bypass, procfs-credential-read, delayed-ci-exfil, generated-vulnerability, automation-poisoning, steganographic-exfil) as a threat checklist. Usable as a list of fixture attacks even without running promptfoo's engine."
  - "The adaptive rate-limit scheduler design (src/scheduler: AIMD concurrency, provider header parsing for OpenAI and Anthropic, exponential backoff, 256 tests) as a reference if LiteLLM's own throttling is ever too coarse for one provider."
differs:
  - "Promptfoo is a point tool that assumes an external CI system calls it per change. It does no task intake, scheduling, sandboxing or merging of its own, so adopting it changes nothing about our five-plane loop, it only adds one more check inside the verification plane."
  - "Its default trust model phones home to api.promptfoo.app for test generation and grading unless the user supplies their own model credentials and sets PROMPTFOO_DISABLE_REMOTE_GENERATION, and a fixed list of red-team plugins and multi-turn strategies are hard-coded remote-only and cannot run air-gapped at all outside Enterprise On-Prem. That is the opposite of our default-deny egress principle, and it means the red-team half would have to run from a narrow-allowlisted CI runner, never inside an agent sandbox."
  - "The company is now under agreement to be acquired by OpenAI. Sending adversarial-generation traffic, and potentially fragments of our own prompts, to a lab that also sells a competing model tier we deliberately exclude early is a real tension for the remote-only red-team path specifically. It does not apply to the plain eval and regression-gate path run with our own configured provider."
  - "Their self-hosted server is explicitly not recommended for production, has no HA, no shared database across replicas, and the Helm chart is experimental with replicaCount fixed at 1. It does not meet our re-seedable, immutable bar as a running service, but we do not need it as a service, the CLI writing JSON in a CI job is enough for a gate."
ux_verdict: "npx promptfoo@latest init, eval, view is three commands to a working diff-capable result, and the web viewer's per-cell pass-fail matrix is the diff view our console lacks, but it is a single-purpose eval viewer with no kanban, no cost-per-task view and no approval lane."
slop_verdict: "Real and used in anger: 25.6k stars, 355 contributors, 426 releases, daily commits, a genuine internal layered-architecture ratchet and a 256-test scheduler subsystem, not a README with a landing page. The open question is roadmap independence once the pending OpenAI acquisition closes."
---

# Promptfoo

## 1. What it is

Promptfoo is an open-source command-line tool and library for testing and red-teaming LLM prompts, agents and applications, used as a quality and security gate in CI. It is made by Promptfoo Inc, a small startup founded in 2024, now under agreement to be acquired by OpenAI. Teams write a `promptfooconfig.yaml` describing prompts, providers (models or endpoints under test) and test cases with assertions, run `promptfoo eval` to score every prompt against every test case, and run `promptfoo redteam run` to fire adversarial payloads at the same target. Both commands exit non-zero on failure, which is what makes them usable as a CI gate. The company claims over 350,000 developers have used it and 25% of the Fortune 500 rely on it. The repository backs this up: 355 contributors, 426 releases and a commit dated the same day as this research (29 September 2026).

The README claims LLM evals "run 100% locally, your prompts never leave your machine." The docs' own data-handling page contradicts this for the default configuration: without a configured model API key, both test generation and grading for red-team runs are sent to `api.promptfoo.app`, and a fixed list of plugins and multi-turn strategies are hard-coded to require that remote service regardless of configuration. The plain `eval` command's target evaluation is local. The privacy claim is accurate for the quality-eval path with your own provider, not for red-teaming by default.

## 2. Mapping to our five planes

| Plane / principle | What promptfoo does | What we do | Verdict |
|---|---|---|---|
| Signals | None. Triggered by a CI event (a PR touching prompt files) or a manual command, not by issues, alerts or telemetry | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API, every task a Forgejo issue | not comparable |
| Control plane | None. Stateless CLI run per invocation, results kept in a local SQLite file or JSON, no task registry, scheduler or approval workflow | factoryd with a Temporal workflow per task, Postgres registry, policy as YAML in Git, budgets, approvals | we lead |
| Worker plane | No sandbox of its own. Calls whatever "provider" you configure (HTTP endpoint, model API, or an agent SDK adapter); the coding-agent red-team guide tells the user to supply a disposable checkout per test row | One gVisor pod per task, ServiceAccount, read-only root filesystem, default-deny egress | we lead |
| Verification | This is the whole product: eval and red-team as a literal CI gate, JUnit XML output, before-and-after PR comments via the official GitHub Action, a 12-plugin coding-agent threat catalogue | Forgejo Actions on untrusted gVisor runners, policy gates, stronger-model review, but no regression suite for the harness, supervisor or review prompt | they lead |
| Merge and deploy | None. The Action posts a comment, it never merges or deploys | Bot merge after human or auto-rule approval, Flux GitOps deploy, staged rollout with alert watch | not comparable |
| Policy outside the model | Assertion thresholds in YAML enforced by the eval engine's exit code, genuinely outside the model for deterministic assertions, but model-graded assertions put a model back in the judgment path | Capability rules as a Git-versioned document enforced in gateway code and network policy | equal, same spirit, different domain |
| Identity per task | None. One set of API keys or tokens for the whole run or CI job | Projected, audience-scoped ServiceAccount token per task, mapped to a per-task virtual model key | we lead |
| Artifacts not chat | promptfooconfig.yaml in, JSON/HTML/JUnit result and a diff view out | TaskBrief in, a branch, a PR and a normalised event stream out | equal |

## 3. Architecture and stack

TypeScript throughout, published as the npm package `promptfoo` (bin aliases `promptfoo` and `pf`), currently at version 0.123.1. Key dependencies read from `package.json`: `@anthropic-ai/sdk`, `openai` and the Vercel `ai` SDK for model calls, `@opentelemetry/*` for trace ingestion, `drizzle-orm` with `@libsql/client` for the local SQLite store (`promptfoo.db`), `express` and `socket.io` for the self-hosted viewer server and live progress streaming, `python-shell` for Python assertions and providers, `zod` for config validation, and `nunjucks` for `{{variable}}` templating in prompts.

The team runs its own internal architecture ratchet: `docs/architecture/packages.md` documents a layered-dependency model (facade, contracts, core, node, providers, redteam, view-server, cli, app) enforced by `npm run architecture:check` against `architecture/layers.json` and `architecture/edge-baseline.json`, ahead of a planned split into several npm packages. `docs/scheduler-architecture.md` documents an adaptive rate-limit scheduler (`src/scheduler/rateLimitRegistry.ts`, `adaptiveConcurrency.ts`, `headerParser.ts`, `retryPolicy.ts`) using an AIMD algorithm that reads OpenAI and Anthropic rate-limit response headers, with 256 tests and a default concurrency of 4.

Deployment shapes: an npm CLI run with `npx`, a multi-stage Docker image (`node:24.21.0-alpine`, non-root user, `npm ci --ignore-scripts` plus a selective esbuild rebuild for supply-chain safety), Docker Compose, and an explicitly experimental Helm chart pinned to `replicaCount: 1`.

Promptfoo runs an agent by wrapping it as a "provider": an HTTP endpoint, a direct model API call, a custom Python or JavaScript function, or a dedicated adapter such as `openai:agents-api` (OpenAI's hosted Agents API), `openai-agents` (the JS Agents SDK), `claude-agent-sdk`, `bedrock-agents`, or `mcp` (calling Model Context Protocol tools directly). It does not manage the agent's execution environment itself, the target is assumed to be already reachable. The same provider abstraction is reused for the red-team attacker and grader model, which defaults to promptfoo's own hosted inference unless the user configures a provider.

Files read: README.md, CONTRIBUTING.md, package.json, Dockerfile, docs/architecture/packages.md, docs/scheduler-architecture.md, docs/red-team/coding-agents.md, docs/red-team/llm-agents.md, docs/red-team/plugins/indirect-prompt-injection.md, docs/red-team/strategies/multi-turn.md, site/docs/integrations/ci-cd.md, site/docs/integrations/github-action.md, site/docs/usage/self-hosting.md, site/docs/red-team/architecture.md, site/docs/configuration/test-cases.md, site/docs/enterprise/index.md, site/docs/red-team/troubleshooting/remote-generation.md, site/docs/red-team/troubleshooting/data-handling.md, site/docs/configuration/expected-outputs/index.md, site/docs/providers/openai-agents-api.md, site/docs/providers/mcp.md, plus the top-level layout via find.

## 4. UX

Zero to a first result is three commands: `npx promptfoo@latest init --example <name>`, `cd <name>`, `promptfoo eval`, then `promptfoo view` opens the web viewer. Red-teaming is similarly short: `promptfoo redteam init` runs a setup wizard, `promptfoo redteam run` executes the scan, `promptfoo redteam report` opens the findings.

While a run executes, the CLI streams a pass/fail table to the terminal, and the self-hosted view server streams the same progress to a browser. The finished result is an interactive matrix of prompts against test cases, each cell showing pass or fail, the model output, cost and latency, with a diff between two eval runs. A red-team run produces a findings report grouped by plugin and severity, with the transcript for each successful attack.

Intervention is asynchronous, not in-band: there is no button inside promptfoo to steer a running eval or agent. The GitHub Action posts a PR comment automatically with a before-and-after score comparison and a link into the full viewer, and a human approves or blocks the merge through the normal PR review, not through promptfoo. For multi-turn red-team runs with the optional "unblocking" feature enabled, promptfoo itself answers the target's clarifying questions with a scripted persona, with no human in that particular loop.

Against our console: promptfoo's viewer gives us the one thing our console explicitly lacks, a diff view per change, and the PR-comment pattern is a UX default we have nowhere in our merge flow. It has no kanban of tasks, no cost-per-task view and no human-approval lane, it is a single-purpose eval viewer, not a factory console.

## 5. Security, identity, sandbox, policy, cost

Credentials are static: an API key in an environment variable or in the YAML config, or none at all when relying on promptfoo's own hosted inference by default. The data-handling docs warn explicitly against pasting real secrets into target setup forms or cloud sync, because those flows do transmit whatever is entered. There is no short-lived or task-scoped credential concept anywhere in the product.

Promptfoo provides no sandbox of its own. It is a grey-box tester that calls whatever target is configured. For coding-agent red-teaming, the docs place the burden of a disposable checkout per test row entirely on the user.

By default it reaches api.promptfoo.app, api.promptfoo.dev and a.promptfoo.app for generation, grading and telemetry. PROMPTFOO_DISABLE_REMOTE_GENERATION and PROMPTFOO_DISABLE_TELEMETRY narrow this, but a fixed set of plugins (all harmful:*, bias, domain-specific plugins, ssrf, bola, bfla, indirect-prompt-injection, ascii-smuggling, competitors, hijacking) and strategies (audio, citation, gcg, goat, jailbreak:hydra, jailbreak:goblin, jailbreak:meta, jailbreak:likert) cannot run without that remote service at all. Only Enterprise On-Prem claims a fully air-gapped mode.

Policy is YAML assertion thresholds checked by the eval engine's exit code for deterministic assertions, which is genuinely outside the model. Model-graded assertions (llm-rubric, g-eval, factuality, moderation) put a model back into the judgment path, which weakens that guarantee for anything scored by them.

Cost visibility exists (a cost assertion type, per-cell token and dollar reporting, the adaptive scheduler to avoid 429 storms) but there is no hard spend cap, no budget ledger and no kill switch. A high numTests combined with a branching multi-turn strategy such as jailbreak:hydra can multiply run cost with no ceiling besides the model provider's own limits.

## 6. What we should take from it

Narrow, copyable this month:

The promptfoo-action pattern (run eval on base and head of a PR touching prompt files, post one comment with a score diff and a link to the full result) is the exact shape of the before-and-after gate our design is missing for the harness, supervisor and review prompt. Forgejo Actions is GitHub-Actions-compatible YAML, so a small script running two eval passes and diffing the JSON output slots into our existing policy-gate step without adopting promptfoo's server.

The assertion type vocabulary (equals, contains, regex, is-json, is-valid-function-call, tool-call-f1, trajectory:tool-used, trajectory:tool-sequence) is a usable schema for a prompt regression file, cheaper than inventing our own expectation format for grading tool-calling behaviour.

The indirectInjectionVar mechanism, one config field naming which templated variable holds untrusted text, with payloads generated against it, is directly portable to our own harness, supervisor and review prompts: name the issue-body or PR-comment-text variable and fail CI when the model follows an instruction embedded in it.

The coding-agent plugin catalogue (repo-prompt-injection, terminal-output-injection, secret-env-read, sandbox-read-escape, sandbox-write-escape, verifier-sabotage, network-egress-bypass, procfs-credential-read, delayed-ci-exfil, generated-vulnerability, automation-poisoning, steganographic-exfil) is a ready-made threat checklist. Even without running promptfoo's engine, hand-porting these scenarios into fixed adversarial issue-text fixtures gives us most of the value.

Broad, product-shape level:

Treat a prompt regression suite as a first-class CI artifact with its own diff view, not a bolt-on to the generic verification gate. Worth a small dedicated job type in factoryd rather than folding it into the existing policy-gate step.

The trace-based grading model (OpenTelemetry spans normalised into a trajectory, graded with trajectory assertions) points at a way to use our own SigNoz traces, which the design already collects but does not surface per task, as evidence for both red-team findings and ordinary prompt regressions, closing two listed gaps with one mechanism.

The open-core boundary itself is instructive: keep the entire gate (CLI, assertion engine, self-hosted single-instance viewer) free, and put paid tiers only in hosted convenience (SSO, RBAC, dashboards), never in what a customer's CI is allowed to enforce.

## 7. Where our philosophy differs and what that costs or buys us

Promptfoo assumes an external CI system calls it per change and does no task intake, scheduling or sandboxing of its own. Adopting it does not touch our five-plane loop, it only adds one more check inside the verification plane, at the cost of writing a promptfoo "provider" adapter for our harness, supervisor and review prompts ourselves.

Its default trust model phones home to Promptfoo's cloud for red-team generation and grading, and a fixed list of plugins and multi-turn strategies cannot run without that service at all. This is the opposite of our default-deny egress principle. Running the red-team half would have to happen from a narrow-allowlisted CI runner, never inside an agent's sandbox network policy, which our separate untrusted gVisor CI runners already make possible without weakening the worker plane.

The company is under agreement to be acquired by OpenAI, announced 9 March 2026, close not confirmed. Our model tiers deliberately exclude Anthropic and OpenAI at the start. Sending adversarial-generation traffic, and fragments of our own prompts, to a lab that sells a competing model tier is a real tension for the remote-only red-team path specifically. It does not apply to the plain eval and regression-gate path run with our own configured provider, which is the path this report recommends.

Their self-hosted server is explicitly not recommended for production, has no HA and no shared database across replicas, and the Helm chart is experimental with replicaCount fixed at 1. It does not meet our re-seedable, immutable bar as a running service. We do not need it as one: the CLI writing JSON inside a CI job, archived to S3 like any other build artifact, is enough for a gate.

## 8. Red flags and slop assessment

Not slop: 25,556 stars, 2,397 forks, 355 contributors, 426 releases since the repository was created on 28 April 2023, a commit dated the same day as this research, and internal engineering signals (a layered-architecture ratchet, a 256-test scheduler subsystem) that a landing-page project does not have.

Maintenance risk: the OpenAI acquisition, announced 9 March 2026, of an 11-person startup that had raised about 23M USD and was valued at 86M USD three months before. OpenAI states the intent is to fold the technology into "OpenAI Frontier" and keep the project open source under its current licence. A founder-led small team being absorbed into a large lab is a real risk to roadmap independence, in particular to continued investment in non-OpenAI provider adapters, but this is a forward-looking risk, not an observed regression in the repository. Not verified: whether the acquisition has legally closed as of this research.

Open-core gating is conventional and clearly documented in site/docs/enterprise/index.md's comparison table: RBAC, team management, SSO, audit logging, org-wide red-team scheduling, remediation reports and SIEM or issue-tracker integrations are Enterprise-only. Community red-teaming and sharing are marked "limited," not absent. The core eval and red-team engine, the CLI, the assertion library and the self-hosted single-instance viewer stay MIT and fully functional with no licence key.

The README's privacy claim ("100% locally, your prompts never leave your machine") is contradicted by the project's own site/docs/red-team/troubleshooting/data-handling.md: without a configured model API key, red-team test generation and grading are sent to api.promptfoo.app, and a fixed list of plugins and strategies are hard-coded remote-only regardless of configuration. This is disclosed plainly in the docs, so it is an inconsistency in marketing copy rather than a hidden practice, but it does contradict the top-line claim for the security-testing half of the product.

No security incidents or licence changes turned up in web search. MIT licence unchanged since the project's inception per package.json and README.md.

## 9. Sources

- https://github.com/promptfoo/promptfoo (cloned 2026-09-29, git clone --depth 1)
- README.md
- CONTRIBUTING.md
- package.json
- Dockerfile
- docs/architecture/packages.md
- docs/scheduler-architecture.md
- docs/red-team/coding-agents.md
- docs/red-team/llm-agents.md
- docs/red-team/plugins/indirect-prompt-injection.md
- docs/red-team/strategies/multi-turn.md
- site/docs/integrations/ci-cd.md
- site/docs/integrations/github-action.md
- site/docs/usage/self-hosting.md
- site/docs/red-team/architecture.md
- site/docs/configuration/test-cases.md
- site/docs/enterprise/index.md
- site/docs/red-team/troubleshooting/remote-generation.md
- site/docs/red-team/troubleshooting/data-handling.md
- site/docs/configuration/expected-outputs/index.md
- site/docs/providers/openai-agents-api.md
- site/docs/providers/mcp.md
- gh api repos/promptfoo/promptfoo, fetched 2026-09-29 (stars, forks, licence, creation date, open issues)
- gh api repos/promptfoo/promptfoo/releases --paginate, fetched 2026-09-29 (426 releases)
- gh api repos/promptfoo/promptfoo/contributors --paginate, fetched 2026-09-29 (355 contributors)
- git log -1 --format=%ci on the clone, fetched 2026-09-29
- https://www.promptfoo.dev/blog/promptfoo-joining-openai/ (via WebSearch summary, 2026-09-29)
- https://openai.com/index/openai-to-acquire-promptfoo/ (via WebSearch summary, 2026-09-29)
- https://techcrunch.com/2026/03/09/openai-acquires-promptfoo-to-secure-its-ai-agents/ (via WebSearch summary, 2026-09-29)
- https://www.cnbc.com/2026/03/09/open-ai-cybersecurity-promptfoo-ai-agents.html (via WebSearch summary, 2026-09-29)
- https://futurumgroup.com/insights/openai-acquires-promptfoo-gaining-25-foothold-in-fortune-500-enterprises/ (via WebSearch summary, 2026-09-29)
- https://www.braintrust.dev/articles/braintrust-vs-promptfoo (via WebSearch summary, 2026-09-29)
- https://www.beri.net/article/braintrust-vs-langfuse-vs-promptfoo-llm-eval-regression-gate-2026 (via WebSearch summary, 2026-09-29)
