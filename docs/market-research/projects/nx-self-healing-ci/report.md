---
name: Nx Cloud Self-Healing CI
slug: nx-self-healing-ci
url: https://nx.dev/ci
repo: https://github.com/nrwl/nx
category: ci-build
license: "mixed: MIT (Nx CLI and build system in this repo); proprietary SaaS (Nx Cloud backend, the nx-mcp package, and the self-healing fix engine)"
open_source: partial
self_hostable: partial
hosting_model: "Nx CLI runs anywhere, self-hosted. Nx Cloud (remote cache, Nx Agents, self-healing) is SaaS by default; Enterprise offers a pre-paid single-tenant or on-prem install"
company: "Narwhal Technologies Inc (Nrwl), founded December 2016 by ex-Google Angular engineers Victor Savkin and Jeff Cross. Bootstrapped via Angular consulting until $8.6M seed (Nov 2022, a16z, Nexus Venture Partners) and $16M Series A (Sep 2023), $24.6M total. Legal domicile Gilbert, Arizona; ~157 employees (Tracxn)"
maturity: "29,400+ GitHub stars, ~1,300 contributors, repo created 2017-08-11, last commit 2026-09-29 (multiple commits most days), near-daily patch releases on npm"
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 2
  verification: 3
  policy_outside_model: 1
  identity_per_task: 1
  cost_control: 2
  ux: 4
  reseedable_selfhost: 1
steal:
  - "The always-run repair step: `nx fix-ci` is added once with `if: always()` (or `after_script` on GitLab/Bitbucket) and becomes a no-op automatically when the pipeline is green. Cheap way to bolt a repair phase onto an existing Forgejo Actions pipeline without restructuring it."
  - "Auto-apply is gated by three ANDed conditions: the failing task matches a configured glob, the model states high confidence, and an independent re-run explicitly verifies the fix against the failing task. That triple gate (declared scope, confidence, reproduction) is close to our own reproduction-gate idea and is concrete enough to copy for any future auto-merge path."
  - "PR-native approval: the fix lands as a PR comment with a reasoning summary, a diff and Apply/Reject buttons, so a human approves without leaving the code review tool. Worth doing literally for our console: post the same summary to the Forgejo PR, not only to the kanban board."
  - "A deterministic preset short-circuits known-mechanical failures (`nx format:check`, `sync:check`, `conformance:check`) by running the writable counterpart directly, skipping the model entirely. Same 'cheap and deterministic first' ordering we already use for verification; worth applying inside supervision too."
  - "Artifacts are tied to the identity of the token that produced them, and revoking that token invalidates every artifact it produced. A cheap idea for shrinking the blast radius after a leaked credential in our own gateway or cache path."
differs:
  - "Nx Cloud sells shared multi-tenant compute plus a credit-metered SaaS AI fix, with no documented default-deny egress and no capability policy scoped to the agent itself. Its launch templates (read `.nx/workflows/agents.yaml` in this repo: `apt-get install`, `pnpm install --frozen-lockfile` against public mirrors) assume open outbound access. Copying this would mean giving up policy-outside-the-model and identity-per-task, because their business model needs an agent that can freely reach package registries inside a shared cluster, the opposite of our default-deny sandbox."
  - "The actual self-healing intelligence is closed source. The OSS repo ships only thin plumbing: `nx-cloud apply-locally`, the `nx fix-ci` CLI stub, and an `nx mcp` command that just runs `npx nx-mcp@latest` (packages/nx/src/command-line/mcp/mcp.ts), a separate proprietary package. There is no self-host escape hatch beyond bringing your own Claude API key to their closed orchestration loop, which conflicts with our 'open source with an escape hatch' constraint."
  - "Two real supply-chain compromises in 13 months are directly relevant to our threat model: s1ngularity (Aug 2025, a poisoned pull_request_target workflow leaked the npm publish token, malicious nx/@nx/* versions harvested credentials from 1,079 developer machines and ran locally installed Claude Code and Gemini CLI with --yolo/--trust-all-tools to hunt for secrets) and the Nx Console v18.95.0 VS Code extension compromise (May 2026, traced to a stolen contributor gh token from an unrelated TanStack npm compromise, which cascaded into a GitHub employee device compromise and roughly 3,800 exposed internal GitHub repos, CVE-2026-48027). Both confirm why our sandbox holds no key material and identity is projected per task instead of living on a developer or CI machine."
ux_verdict: "The fastest approval loop in this survey for a single fix: reasoning, diff and Apply/Reject land directly on the PR or in the IDE, ahead of anything our console offers today, but it covers exactly one workflow (repair a broken CI task), not a board of tasks across a project."
slop_verdict: "Real and used in anger: 29.4k stars, near-daily commits, $24.6M raised, named enterprise customers, and a public incident record. But the self-healing feature itself is unverifiable from outside: no independent reviews found, only Nx's own blog, webinar and staff social posts claiming '50% faster time to green', and the pricing page even contradicts itself on the Team tier's starting price."
---

# Nx Cloud Self-Healing CI

## 1. What it is

Nx is an open source, Rust-cored monorepo build system (task caching, affected-only runs, project graph, code generators) for TypeScript and polyglot codebases, made by Nrwl (Narwhal Technologies Inc). Nx Cloud is the paid layer on top: remote caching, distributed task execution across "Nx Agents", and, since June 2025, "Self-Healing CI": when a CI task fails, an AI agent analyses the failure, proposes a fix as a PR comment, and can auto-apply it once verified. It is sold as a free OSS CLI plus a metered Nx Cloud SaaS (Hobby free, Team from a disputed $0/$29, Enterprise custom), founded in December 2016 by ex-Google Angular engineers Victor Savkin and Jeff Cross, VC-backed since 2022.

The makers claim self-healing "detects failures, analyzes root cause, proposes a fix, and verifies it automatically" and "cuts time to green by 50%" (nx.dev/ci, an Nx webinar title). What the repository actually shows is narrower: the OSS CLI contains only thin plumbing around the feature. `nx fix-ci`, `nx-cloud apply-locally` and the `nx mcp` command (packages/nx/src/command-line/mcp/mcp.ts) all shell out to Nx Cloud's proprietary backend or to a separate closed-source npm package (`nx-mcp@latest`). The root-cause analysis, fix generation and verification never appear in this repository.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | React only to a CI run already triggered by a push or PR; no issue, alert or telemetry intake creates a task | Forgejo webhooks, SigNoz alerts, factoryd intake API, every task a Forgejo issue | not comparable |
| Control plane | A per-CI-run state machine ("CIPE") with `cipeStatus`, `selfHealingStatus`, `verificationStatus`, `userAction`, exposed to agents via the `ci_information` MCP tool; no cross-run task registry, no budgets, no multi-step approval workflow | `factoryd` Temporal workflow per task, policy, budgets, approvals, cost ledger, audit trail | we lead |
| Worker plane | "Nx Agents": one Docker/VM launch template per job (read `.nx/workflows/agents.yaml`: `resource-class: docker_linux_amd64/large`, `image: ubuntu22.04-node20.19-v1`), shared multi-tenant cluster, no documented egress restriction | One gVisor pod, ServiceAccount and namespace per task, read-only rootfs, default-deny egress | we lead |
| Verification | An explicit verification phase re-runs the failing task against the proposed fix before auto-apply is allowed; a deterministic preset runs formatters/linters directly instead of the model | Forgejo Actions, policy gates by risk class, reproduction gate, stronger-model review | equal on the single reproduction step, we lead on breadth |
| Merge and deploy | The fix is committed to the same PR branch or pulled locally for editing; an ordinary human merges afterward; no deploy layer | Bot merge after approval or auto-rule, Flux GitOps, staged rollout with an alert-free bake | we lead |
| Policy outside the model | Glob include/exclude patterns and hardcoded protected-branch exclusions (`.nx/ci-config.yaml`) decide which failures may be auto-fixed, enforced in Nx Cloud's backend | Capability policy as a YAML file in Git, enforced in gateway code and network policy | we lead in breadth, same mechanism in spirit |
| Identity per task | Org-level CI access tokens (read-write vs read-only), artifacts traced to and invalidated with the producing token; AI provider credentials are org-scoped, not per task | Per-task projected, audience-scoped, kubelet-rotated ServiceAccount token | we lead |
| Artifacts not chat | The fix is a diff plus a reasoning summary posted to the PR, not a chat transcript | `TaskBrief` in, branch, PR and event stream out | equal in spirit, narrower in scope |

## 3. Architecture and stack

The repo (nrwl/nx, 222 MB shallow clone) is a pnpm workspace: `packages/nx` is the CLI core with a Rust native layer (`Cargo.toml`, `Cargo.lock`, native daemon and cache code referenced by `NX_NATIVE_LOGGING=nx::native::db` in `.nx/workflows/agents.yaml`), `packages/{react,angular,jest,gradle,maven,dotnet,...}` are per-tool plugins, `graph/` is the project-graph web UI, and both `nx-dev/` (older Next.js docs/marketing site) and `astro-docs/` (a newer Astro/Starlight docs site) exist side by side, evidence of a documentation-platform migration in progress. There is no server component for Nx Cloud in this repository; it is entirely closed source.

Nx Agents are defined by "launch templates" in `.nx/workflows/*.yaml`; the project's own `agents.yaml` shows two templates (`linux-large`, `linux-extra-large`) built on an `ubuntu22.04-node20.19-v1` image, with init steps that `apt-get install` and `pnpm install --frozen-lockfile` against public mirrors. Self-healing fix generation runs on the Claude Agent SDK against the Anthropic Messages API by default. Enterprise customers can bring their own key through Bedrock, Azure AI Foundry or Vertex AI, but the docs state plainly that only Claude models work through any of those providers ("Gemini, GPT, and Nova do not work, even when your provider serves them"), so the apparently flexible routing is single-vendor underneath. The `nx mcp` command (`packages/nx/src/command-line/mcp/mcp.ts`) does not implement an MCP server itself; it `spawnSync`s `npx nx-mcp@latest`, a separate closed-source package, which is what actually exposes the `ci_information`, `ci_task_output` and `update_self_healing_fix` tools documented at nx.dev/docs/reference/nx-mcp.

## 4. UX

Zero to first result is short: connect the workspace (`npx nx@latest connect`), turn on Self-Healing CI in workspace settings, add one `nx fix-ci` step with `if: always()` to an existing CI YAML file. No new pipeline is required; it works with the customer's existing GitHub Actions, GitLab, Azure DevOps or Bitbucket setup. A user watches progress in the Nx Cloud web console (the CIPE page shows live task and self-healing status) or in the Nx Console IDE extension (VS Code, Cursor, WebStorm), which raises a notification when a fix is ready. Not verified: no screenshots or a live demo were opened in this session, this is based on the written docs and quickstart steps only.

Approval happens where the developer already is: a PR or MR comment carries a reasoning summary, a diff and Apply/Reject buttons. `nx apply-locally <fix-id>` pulls the fix to a local branch for hand-editing before committing it. A "public link access" mode lets anyone with the link apply or reject a fix; the docs themselves call this "not recommended unless absolutely necessary". This PR-native approval surface is ahead of our console, which has no in-PR fix review today and requires opening a separate kanban board. It is, however, a single-purpose flow (repair one broken CI task), not a board of queued, running, waiting-on-human and done tasks across a whole project.

## 5. Security, identity, sandbox, policy, cost

Credentials: CI access tokens are read-write (protected branches only) or read-only (everywhere else); every cached artifact is traced to the token that produced it, and revoking a token invalidates its artifacts. AI provider credentials for self-healing are configured per organisation (stored in Nx Cloud, or supplied as CI environment secrets on the Enterprise "bring your own key" add-on), never per task or per run.

Sandbox: Nx's own term "Task Sandboxing" is a cache-correctness auditor, warning or failing when a task touches files outside its declared inputs/outputs; it is not a network or process isolation boundary. Nx Agents run each CI job in a shared, multi-tenant Docker/VM launch template with no documented egress restriction; the sample launch template reads apt and pnpm from public mirrors with no allow-list.

Policy: glob include/exclude patterns plus hardcoded exclusions for protected and default branches decide which failing tasks are eligible for an auto-applied fix, enforced server-side rather than in the prompt. The scope is narrow: it governs whether a diff may be written to a PR, not what tools, network hosts or repositories an agent may touch.

Cost: the Hobby tier hard-cuts at 50,000 credits a month (features turn off until the next reset); the Team tier has no cap and instead bills metered overage ($5.50 per 10,000 credits, $19 per contributor, $2.25 per concurrent CI connection). A real hard limit exists only on the free tier; everything else is pay-as-you-consume, not a per-task or per-project budget envelope with a pre-spend hold.

## 6. What we should take from it

Narrow, copyable this month: the always-run `if: always()` repair step; the triple-AND auto-apply gate (scope match, stated confidence, independent re-verification); posting the fix's reasoning and diff with Apply/Reject buttons directly on the PR instead of only in a separate console; running a deterministic preset before ever invoking a model for mechanical failures (format, lint, conformance); and tying artifact validity to the producing credential so a revoked token cannot poison what it already wrote.

Broad: the product proves that a narrow, single-purpose "fix my one broken CI task" agent sells well bolted onto a team's existing pipeline, without asking anyone to adopt a new control plane. That is a cheap addition our own design could consider between the supervisor's "retry on a stronger model" verdict and opening a full new task: a scoped auto-repair path for common, low-risk CI failures. The broader UX lesson is to put approval surfaces where a human already works (the PR) rather than only in a dedicated console.

## 7. Where our philosophy differs and what that costs or buys us

Nx Cloud's whole model assumes an agent that can freely reach package registries inside a shared multi-tenant cluster; nothing in its docs evaluates what an agent may do once it has a runner beyond the narrow auto-apply glob. Copying that would mean giving up default-deny egress and policy-outside-the-model, the opposite of our stance, and their business model needs it that way to work across arbitrary customer pipelines with zero setup.

The self-healing intelligence itself is closed source: the OSS repo ships only CLI stubs that call out to Nx Cloud's backend or to the separate `nx-mcp` package. There is no self-host escape hatch beyond bringing a Claude API key to their orchestration loop, which still runs on Nx's servers. This conflicts with our "open source with an escape hatch" constraint; adopting any part of self-healing CI as-is would mean adding a vendor dependency we cannot fully audit or re-seed ourselves.

Two public supply-chain compromises in the past thirteen months are a direct, sobering data point rather than a philosophical difference: the s1ngularity attack (August 2025) used a poisoned `pull_request_target` workflow to steal the npm publish token, then shipped malicious `nx`/`@nx/*` versions that ran locally installed Claude Code and Gemini CLI with `--yolo`/`--trust-all-tools` to hunt developer machines for secrets, harvesting credentials from 1,079 developers. The Nx Console v18.95.0 compromise (May 2026) started from an unrelated TanStack npm compromise that stole a contributor's `gh` token, and cascaded into a malicious VS Code extension release and a GitHub employee device compromise exposing roughly 3,800 internal GitHub repositories (CVE-2026-48027). Both confirm the reasoning behind our own no-keys-in-the-sandbox design: identity belongs to the task, is short-lived, and never sits on a developer or CI machine where a single compromised dependency can reach it.

## 8. Red flags and slop assessment

The project is real and actively used: 29,400+ GitHub stars, roughly 1,300 contributors, commits most days including today, $24.6M raised across two rounds, about 157 employees, and named enterprise customers. This is not a landing page over a thin product.

Two documented supply-chain incidents (s1ngularity, August 2025; Nx Console v18.95.0, May 2026) are the most serious red flags found in this whole survey, both with public postmortems from Nx and independent coverage (CISA, TheHackerNews, GitGuardian, OX Security). I found no independent review of self-healing CI itself, positive or negative, anywhere: every claim of "50% faster time to green" or fixes that "save 23m per PR" traces back to Nx staff blog posts, a webinar title, or a co-founder's own social media post. The pricing page contradicts itself, its meta description says the Team tier starts "at $0" while the plan card lists $29, a small but real sign that even the sales-facing page is not proofread. BYO-model support for self-healing is Claude-only regardless of which cloud provider carries it, an unadvertised lock-in behind an apparently flexible settings screen.

## 9. Sources

- https://github.com/nrwl/nx (cloned --depth 1 --filter=blob:none to ~/repos/market-research-clones/nx-self-healing-ci)
- Files read: README.md, AGENTS.md, .github/agents/ci-watcher.agent.md, packages/nx/src/migrations/update-22-2-0/add-self-healing-to-gitignore.md, packages/nx/src/command-line/nx-cloud/apply-locally/command-object.ts, packages/nx/src/command-line/nx-cloud/utils.ts, packages/nx/src/command-line/mcp/mcp.ts, .nx/workflows/agents.yaml, .nx/nx-mcp-config.json, top-level directory layout
- https://api.github.com/repos/nrwl/nx (stars, license, created/pushed dates, open issues, forks), https://api.github.com/repos/nrwl/nx/commits (last commit date), https://api.github.com/repos/nrwl/nx/contributors (contributor count), fetched 2026-09-29
- https://nx.dev/ci, fetched 2026-09-29
- https://nx.dev/ci/features/self-healing-ci, fetched 2026-09-29
- https://nx.dev/pricing, fetched 2026-09-29
- https://nx.dev/enterprise/security, fetched 2026-09-29
- https://nx.dev/docs/kb/bring-your-own-ai-api-key, fetched 2026-09-29
- https://nx.dev/docs/features/ci-features/sandboxing, https://nx.dev/docs/reference/nx-cloud/launch-templates, https://nx.dev/docs/kb/fix-sandbox-violations, https://nx.dev/ci/recipes/security/access-tokens, fetched 2026-09-29
- https://nx.dev/docs/reference/nx-mcp, fetched 2026-09-29
- https://techcrunch.com/2022/11/17/with-8-6m-in-seed-funding-nx-wants-to-take-monorepos-mainstream/, https://techcrunch.com/2023/09/25/nx-lands-16m-to-build-monorepo-tools-for-software-devs/, referenced 2026-09-29
- https://thehackernews.com/2025/08/malicious-nx-packages-in-s1ngularity.html, https://blog.gitguardian.com/the-nx-s1ngularity-attack-inside-the-credential-leak/, referenced 2026-09-29
- https://nx.dev/blog/nx-console-v18-95-0-postmortem, https://www.cisa.gov/news-events/alerts/2026/05/28/supply-chain-compromises-impact-nx-console-and-github-repositories, https://github.com/nrwl/nx-console/security/advisories/GHSA-c9j4-9m59-847w, referenced 2026-09-29
- WebSearch: "Nx Cloud self-healing CI review OR criticism", "nx.dev self-healing CI bring your own AI model API key", "Nrwl Nx company funding round headquarters founded", 2026-09-29
