---
name: Harbor
slug: harbor
url: https://docs.harborframework.com
repo: https://github.com/harbor-framework/harbor
category: observability-evals
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: self-hosted CLI with local Docker or cloud sandboxes (Daytona, Modal and others), plus an optional hosted Hub SaaS for job launch, secrets and leaderboards
company: Laude Institute (nonprofit research funder, Stanford-affiliated, Andy Konwinski's $100M commitment) builds and maintains the open-source framework. The hosted Hub is run by a separate for-profit, HarborCo Inc., no published pricing found
maturity: ~5.7k GitHub stars, ~1.9k forks, 963 open issues, 28 releases from v0.3.0 (2026-03-27) to v0.23.0 (2026-09-12), repo created 2025-08-04, last commit 2026-09-28, top contributor 641 commits vs second at 153 (of the top 100 contributors sampled), official successor harness to Terminal-Bench
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 4
  verification: 3
  policy_outside_model: 4
  identity_per_task: 2
  cost_control: 1
  ux: 3
  reseedable_selfhost: 3
steal:
  - The per-phase typed NetworkPolicy model (no-network, public, allowlist, with typed hostname, wildcard-hostname, IPv4/IPv6 address and CIDR entries) applied separately to environment setup, agent run and verifier phases, with fail-closed validation that rejects a trial at submission time if the chosen sandbox provider cannot support the requested policy.
  - The capabilities object pattern. BaseAgent and BaseEnvironment each declare a typed capabilities class (AgentCapabilities, EnvironmentCapabilities) the harness checks before scheduling, replacing brittle boolean SUPPORTS_* flags.
  - The dataset-registry-as-pinned-git-commit-manifest pattern (registry.json, 80 datasets, each a task list pointing at a pinned commit in an external repo) to keep a task corpus out of the harness repo and every run reproducible.
  - The viewer's compare waffle grid (task by agent/model, cell colour is pass or fail) as a working template for the per-model-tier pass-rate dashboard our own design currently lacks.
  - The parity CI pattern, a workflow triggered on adapter config changes that reruns a task set and auto-commits a pass-rate-vs-baseline CSV, as the shape for a harness-prompt regression suite.
  - The LLM-judged task-quality rubric (behavior_in_task_description, anti_cheating_measures, hardcoded_solution, tests_or_solution_in_image, and more) run once against a task definition to catch trivial or leaky regression tasks before they are trusted.
differs:
  - Harbor has no signals plane and no durable cross-run control plane. It is a batch evaluation tool that scores a fixed task set once, not a system that ingests live issues or telemetry and carries task state, approvals and audit across time. At most it supplies a verification-plane component, not an architecture to copy wholesale.
  - Harbor Hub's default direct credential mode injects real provider API keys straight into the agent sandbox. Scoped gateway-proxy credentials are opt-in. This is the opposite of identity-per-task with no direct credentials, and would need to be forced off by us if we ever touched the Hub itself.
  - No hard spend cap exists anywhere in the OSS CLI. Cost is computed and reported after the fact via LiteLLM pricing, never gated before or during a run, so our own spend-limit enforcement gets no help from this project beyond the cost-ledger arithmetic.
ux_verdict: The CLI (harbor run, hr/hb aliases) gets a first trial running with no account in one command, but the useful cross-model comparison view only lives in the separate apps/viewer web app, not in CLI output.
slop_verdict: Real and actively maintained, 28 releases in six months, commits as recent as 2026-09-28, official successor harness to Terminal-Bench, backed by the well-funded Laude Institute. The commercial Hub layer sits under a separate for-profit, HarborCo Inc., with no published pricing, worth watching for an open-core split.
---

# Harbor

## 1. What it is
Harbor is an evaluation framework for coding and computer-use agents, built by the Laude Institute, the nonprofit research funder behind Terminal-Bench (Andy Konwinski's $100M commitment funds it, with a Stanford affiliation), and led by Alex Shaw. The README calls it "from the creators of Terminal-Bench" and Terminal-Bench 2.0 itself now runs on Harbor as its harness. Harbor packages an evaluable unit as a task directory: instruction.md, environment/Dockerfile, tests/test.sh, and a task.toml config. It runs any of its agent adapters (Claude Code, Codex CLI, OpenHands, opencode, Gemini CLI, plus RL and computer-use agents) against any of its sandbox providers (local Docker, Daytona, Modal and others, the full list was not independently enumerated from code), scores the result with a task-specific verifier that writes a reward to /logs/verifier/reward.txt or .json, and reports pass rates per agent and model across one of 80 registered datasets, including Terminal-Bench 2.0 (89 tasks) and SWE-bench Verified (500 tasks).

It is Apache-2.0 licensed, installable as a pip/uv Python 3.12+ CLI (harbor, hr, hb), with an optional hosted "Harbor Hub" (hub.harborframework.com) for job launch, secrets and leaderboards, run by a separate for-profit entity named "HarborCo Inc." in the Hub site's own footer copyright, distinct from the nonprofit Laude Institute that authors the open-source framework.

What the makers claim, a general-purpose harness for any agent on any task, from the creators of Terminal-Bench, is verified. The shared Laude Institute authorship and the Terminal-Bench 2.0 to Harbor migration are both confirmed by the repository and its docs. What the code actually shows matches the README's description of the task/agent/environment/verifier shape closely, down to the exact directory layout and config keys documented in the repo's own CLAUDE.md.

## 2. Mapping to our five planes

| Plane / principle | What Harbor does | What we do | Verdict |
|---|---|---|---|
| Signals plane | None. Tasks come from a fixed dataset registry, never from live issues, telemetry or alerts. | Issues, telemetry and alerts feed the control plane. | not comparable |
| Control plane | A Job/Trial bookkeeping model (JobConfig, JobStats, TrialResult) tracks eval-run progress, retries and cost, with no durable cross-run task state, scheduling policy or human approval step. | factoryd holds task state, scheduler, policy, approvals, model choice, cost and audit. | we lead |
| Worker / sandbox plane | BaseAgent plus BaseEnvironment abstraction, 15+ agent adapters, a wide set of sandbox providers, per-phase typed NetworkPolicy with fail-closed validation. | agent-worker in ephemeral sandboxes, constrained network, temporary credentials. | they lead (network policy breadth) |
| Verification plane | BaseVerifier.verify() runs a task-specific test script per trial and returns a graduated reward dict (VerifierResult.rewards, a dict of string to float or int), plus a CI parity pipeline that auto-regenerates a pass-rate-vs-baseline CSV whenever an adapter's parity experiment config changes. | Tests, security, stronger-model review, policy evaluation gate merge. | equal (different purpose, benchmark scoring, not a merge gate) |
| Merge and deploy | None. Harbor scores a trial. It never produces a PR or a deploy. | Verified output merges and deploys through the control plane. | not comparable |
| Policy outside the model | NetworkPolicy is a typed Pydantic model enforced by each environment provider's own code, not a prompt instruction. An unsupported combination is rejected at validation time. | Policy lives outside the LLM, in code. | equal |
| Identity per task | Per-job Hub credentials. The default direct credential mode hands the agent the real provider key for the run, scoped gateway mode proxy credentials are opt-in. | Identity belongs to the task, short-lived credentials, no direct keys in the agent's reach. | we lead |
| Artifacts not chat | Task config, instruction and reward files form the outer contract between harness and agent, each adapter wraps that specific agent's own internal chat/tool loop. | Agents exchange artifacts, not chat. | equal |

## 3. Architecture and stack
Python 3.12+, Pydantic v2 models throughout, a Typer CLI (harbor, hr, hb), uv as the package and workspace manager (pyproject.toml's [tool.uv.workspace] members = ["packages/*"]), and asyncio.TaskGroup preferred over gather per the repo's own CLAUDE.md. Core runtime dependencies include litellm (model calls and cost/pricing data), supabase and pyjwt (Hub authentication), and fastapi (Hub-adjacent API surfaces, not independently explored). pyproject.toml lists a long tail of optional [project.optional-dependencies] extras, one set per cloud sandbox or RL provider.

Source layout: src/harbor/{agents,environments,verifier,models,llms,auth,hub,hosted,cli,analyze}, adapters/ (per-agent-family integration code plus parity experiment data), apps/viewer (a separate React Router 7 plus Vite plus TanStack Query plus Radix UI plus nuqs results dashboard), docs-mintlify/ (the Mintlify source behind docs.harborframework.com), examples/, packages/* (uv workspace members, contents not enumerated), rfcs/, skills/ (bundled Claude Code skills such as create-task), and tests/.

Execution model: BaseAgent.run(instruction, environment, context) runs inside a BaseEnvironment (a Docker container by default, or a cloud provider's own sandbox API), then BaseVerifier.verify() scores the result. Both BaseAgent and BaseEnvironment expose a capabilities ClassVar object (AgentCapabilities, EnvironmentCapabilities) the harness checks before scheduling a trial. src/harbor/agents/base.py still carries a _LEGACY_CAPABILITY_FIELDS migration map for older boolean SUPPORTS_* class variables, showing the project mid-migration to the typed form.

Harbor talks to models exclusively through LiteLLM (src/harbor/llms/utils.py), which also hosts provider-specific workarounds. For example add_anthropic_caching() caps the number of cache_control breakpoints per request at 4, Anthropic's hard limit, by tagging content blocks newest-first until the budget is spent.

Deployment shape: a local pip/uv-installed CLI is the primary form. Sandboxes run locally against Docker or against a cloud provider, the README shows harbor run --env daytona. The optional Hub is a multi-tenant SaaS with GitHub OAuth via PKCE against Supabase GoTrue, implemented with plain httpx rather than the Supabase SDK (src/harbor/auth/oauth.py), and adds organizations, secrets and leaderboards on top of the same CLI-driven job model.

## 4. UX
Zero to first result is a single command once the CLI is installed: harbor run --agent claude-code --task examples/tasks/hello-world runs one trial locally against Docker with no account needed. harbor datasets list surfaces the 80 registered datasets. Scaling up to a full sweep means writing a JobConfig (see examples/configs/features/job.yaml) listing multiple agent/model entries and a dataset, then running harbor job run.

Watching a run happens two ways. The CLI streams per-trial progress and writes structured logs under /logs/verifier/, and the separate apps/viewer app (a standalone frontend, not bundled with the CLI install) renders a web dashboard with job, run, trial and compare routes. The compare route is a waffle grid, tasks on one axis and agent/model combinations on the other, cell colour showing pass or fail. This is the closest thing found anywhere in this research to the per-model-tier pass-rate view our own design is missing.

The Hub layer adds a hosted job-launch UI: pick a dataset, agent and model, set retries and attempts (the UI computes the resulting trial count, for example "4 x (1+3) = 16"), a concurrent-trial limit with Hub-side rate-limit backoff, and a credential mode (direct or gateway) before submitting. This is closer to a managed SaaS console than our CLI-first approach, but it is a separate commercial product layered on the open framework, not part of Harbor itself.

What is worse than our console: there is no approval or intervention step anywhere in Harbor, because it has no notion of a human in the loop during a trial. A trial either finishes or times out, consistent with its purpose as a batch benchmark tool rather than an ongoing-work console.

## 5. Security, identity, sandbox, policy, cost
Sandbox. Each environment provider (local Docker, or a cloud sandbox such as Daytona or Modal) implements BaseEnvironment, giving each trial a fresh container or cloud sandbox torn down after the run. The exact full list of supported providers beyond those named in the docs was not verified directly against code in this pass.

Policy. Network access is enforced in code, not prompts. Every phase, the environment baseline, the agent's run() only, the verifier, and the verifier's own environment, gets its own NetworkPolicy (no-network, public, or allowlist, with typed hostname, wildcard-hostname, IPv4/IPv6 address or CIDR allowlist entries). If a chosen environment provider cannot support the requested mode for a phase, Harbor rejects the trial at validation time per docs-mintlify/core-concepts/tasks/network-policies.mdx, rather than silently running with a weaker policy. This is a genuine fail-closed default and the strongest single mechanism found in the project.

Identity. Local CLI runs read provider API keys from the user's own environment, like any CLI tool. On the Hub, direct credential mode is the default: real provider keys go straight into the sandbox with no gateway accounting. A scoped gateway mode (proxy credentials, sets HOSTED_INFERENCE_URL) exists but must be opted into, and secrets are renamed on the fly to match whatever environment variable name the target agent expects. No per-trial short-lived credential issuance was found. Credentials are scoped to a Hub organization and a job, not minted fresh per trial.

Cost. Every model call's tokens and USD cost are computed through LiteLLM's pricing tables (compute_token_cost_totals() in src/harbor/models/trial/result.py), rolled up per job in JobStats.cost_usd, and shown after the fact in trial and job results and in the viewer. No hard spend cap or pre-run budget enforcement was found anywhere in the OSS CLI. The Hub applies concurrency and rate-limit backoff, which is not a cost cap.

## 6. What we should take from it

Narrow, this month. Copy the per-phase typed NetworkPolicy model (no-network, public, allowlist, typed allowlist entry types) and its rule of rejecting a trial at validation time if the sandbox cannot support it. It is a complete, already-designed answer to our own constrained network egress requirement.

Copy the capabilities-object pattern, a typed AgentCapabilities/EnvironmentCapabilities model each adapter or sandbox provider declares, for our own harness and sandbox-provider abstractions, instead of boolean feature flags. Harbor's own in-flight migration away from SUPPORTS_* flags is a warning of the cost of not doing this early.

Copy the dataset-registry-as-pinned-git-commit-manifest shape (registry.json: name, version, a task list each pointing at a pinned commit in an external repo) for our own closed-issues-as-tasks corpus, keeping the task corpus out of the harness repo and every regression run pinned and reproducible.

Broad, product shape. Build the missing per-model-tier pass-rate dashboard directly modelled on Harbor's compare waffle grid (tasks by model tier, cell showing pass or fail or reward). This is a UI pattern worth copying outright, not a library.

Concretely, here is how we would build a per-project regression suite from our own closed issues as Harbor-style tasks, run it in CI, and use it to tune the model ladder, following Harbor's own parity pattern:

1. Task format. For each closed issue we freeze as a regression case, generate a task directory: instruction.md from the issue's original text plus its accepted acceptance criteria, environment/Dockerfile snapshotting the project repository at the commit immediately before the fix (so the task is genuinely unsolved at trial start), and tests/test.sh running the actual regression test the fix PR added, writing a reward to /logs/verifier/reward.txt. A graduated reward, rather than plain pass or fail, lets us rank how close a weaker model got, mirroring Harbor's VerifierResult.rewards dict.
2. Registry. Keep these task directories in a separate, pinned corpus, our own registry.json equivalent, a manifest of task name to pinned commit in a dedicated regression-tasks repository. This is the same separation Harbor uses to keep its 80 datasets out of the harness repo itself.
3. CI trigger. Mirror update-parity-summary.yml: a workflow that reruns the full regression task set whenever the harness system prompt, tool definitions, or model-ladder config changes, one job per model tier (cheap, mid, frontier), auto-committing a model-tier-pass-rate.csv (task by model tier by pass or fail, plus reward and cost) back into the repo, the same shape as Harbor's parity_summary.csv.
4. Model-ladder tuning. Use the resulting per-tier pass rate exactly as Harbor uses its own parity numbers, as evidence for whether the cheap tier is still good enough after a prompt or tool change, and to set an escalation threshold. For example, route only the issue types the cheap tier fails on up to the next tier, instead of guessing at model choice.
5. Task-quality guard. Run an LLM-judged rubric like Harbor's quality_checker/default-rubric.toml (criteria such as behavior_in_task_description, anti_cheating_measures, hardcoded_solution, tests_or_solution_in_image) once when a regression task is created, so an issue-derived task cannot quietly become trivial (a test that checks nothing) or leaky (the fix commit's diff visible inside the frozen environment).

## 7. Where our philosophy differs and what that costs or buys us
Harbor has no signals plane and no durable cross-run control plane. It is a batch evaluation tool that scores a fixed task set once, not a system that ingests live issues or telemetry and carries task state, approvals and audit across time. Copying its architecture wholesale gives us nothing for three of our five planes. At best it supplies a verification-plane component we bolt onto our own control plane, exactly as the brief's own framing puts it.

Harbor Hub's default direct credential mode, real provider keys injected into the sandbox, is the opposite of our identity-per-task principle and our no-direct-credentials constraint. If we ever used Harbor Hub itself, rather than just borrowing patterns from the open-source CLI, we would have to force gateway mode on for every job and never rely on the default. The price of not doing so is a straightforward key-leak surface.

No hard spend cap exists anywhere in Harbor. Cost is a report, not a control. Our own spend-limit constraint gets no help from this project beyond the cost-ledger arithmetic (compute_token_cost_totals). The enforcement, hard caps and holds, has to be entirely ours.

## 8. Red flags and slop assessment
Real signal: 28 tagged releases between v0.3.0 (2026-03-27) and v0.23.0 (2026-09-12), a commit as recent as 2026-09-28, roughly 5.7k stars and 1.9k forks, and 963 open issues, a healthy backlog for an actively used tool given the commit cadence rather than a sign of neglect. It is the official successor harness to Terminal-Bench, itself a widely cited agent benchmark. Among the top 100 contributors sampled via the GitHub API, the top contributor has 641 commits and the second has 153, both associated with Laude Institute or Stanford.

Flag: the commercial Harbor Hub is run by a distinct for-profit entity, HarborCo Inc., per the Hub site's own footer copyright, separate from the nonprofit Laude Institute that authors the open-source framework, with no pricing page or tier information published anywhere found in this research. Worth tracking for an eventual open-core split where OSS features stagnate while Hub features, leaderboards, hosted jobs, org management, absorb future investment.

Flag: the Hub's default credential handling (direct real-key injection, gateway mode opt-in) is a weaker default than the framework's own network-policy code suggests the team is capable of building, an inconsistency between the open-source core's security posture and the commercial layer's default.

CONTRIBUTING.md's Golden Rule (contributors, even when using agents, must understand what they submit) and its rule that docs, issues and PR descriptions need a human-written first and last draft is a specific, credible governance signal against low-effort or agent-slop contributions, not just a badge.

## 9. Sources
https://github.com/harbor-framework/harbor (README, LICENSE, CLAUDE.md, CONTRIBUTING.md, accessed 2026-09-29)
https://github.com/harbor-framework/harbor/blob/main/pyproject.toml (accessed 2026-09-29)
https://github.com/harbor-framework/harbor/blob/main/registry.json (accessed 2026-09-29)
https://github.com/harbor-framework/harbor/blob/main/adapters/parity_summary.csv (accessed 2026-09-29)
https://github.com/harbor-framework/harbor/blob/main/.github/workflows/update-parity-summary.yml (accessed 2026-09-29)
https://docs.harborframework.com (Mintlify docs site referenced by the README, accessed 2026-09-29, mirrored locally under docs-mintlify/)
hub.harborframework.com (Harbor Hub site, footer copyright for HarborCo Inc., accessed 2026-09-29)
GitHub API repos/harbor-framework/harbor (stars, forks, open issues, created_at, pushed_at, queried 2026-09-29)
GitHub API repos/harbor-framework/harbor/releases (28 releases, v0.3.0 to v0.23.0, queried 2026-09-29)
GitHub API repos/harbor-framework/harbor/contributors?per_page=100&anon=0 (top 100 contributors by commit count, queried 2026-09-29)
Local clone /home/womb/repos/market-research-clones/harbor (git clone --depth 1, 2026-09-29), files read: README.md, CLAUDE.md, LICENSE, CONTRIBUTING.md, pyproject.toml, examples/tasks/hello-world/task.toml, examples/configs/README.md, examples/configs/features/job.yaml, src/harbor/agents/base.py, src/harbor/environments/base.py, src/harbor/verifier/base.py, src/harbor/llms/utils.py, src/harbor/auth/oauth.py, src/harbor/cli/main.py, src/harbor/cli/sweeps.py, src/harbor/cli/quality_checker/default-rubric.toml, src/harbor/models/task/config.py, src/harbor/models/job/config.py, src/harbor/models/job/result.py, src/harbor/models/trial/result.py, skills/create-task/SKILL.md, docs-mintlify/core-concepts/tasks/network-policies.mdx, docs-mintlify/core-concepts/hosted-harbor/web-ui.mdx, docs-mintlify/core-concepts/harbor-hub/hosted-jobs.mdx, apps/viewer/app/routes/compare.tsx, directory listings of src/harbor/hosted/, src/harbor/hub/, src/harbor/auth/, src/harbor/cli/quality_checker/, src/harbor/analyze/, docs-mintlify/core-concepts/, apps/viewer/app/, and the top-level repo layout
