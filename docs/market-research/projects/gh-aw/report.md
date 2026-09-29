---
name: GitHub Agentic Workflows (gh-aw)
slug: gh-aw
url: https://github.github.com/gh-aw/
repo: https://github.com/github/gh-aw
category: ci-build
license: MIT
open_source: yes
self_hostable: partial
hosting_model: CLI compiler plus actions that run on GitHub Actions (github.com or GHES), GitHub-hosted or self-hosted runners
company: GitHub (Microsoft), built by GitHub Next with Microsoft Research and Azure Core Upstream, repository created 2025-08
maturity: 5.2k stars, about 38 listed contributors plus many agent authors, created 2025-08-12, last commit 2026-09-29, releases every few days (v0.90.0 on 2026-09-28), public preview
similarity: 2
axes:
  signals_intake: 3
  control_plane: 1
  sandbox_isolation: 3
  verification: 2
  policy_outside_model: 4
  identity_per_task: 3
  cost_control: 3
  ux: 4
  reseedable_selfhost: 1
steal:
  - Typed side-effect requests ("safe outputs") with a per-type max, validated and applied by a separate privileged step after the agent is gone, for every write that is not the PR itself
  - Default protected-files list (package manifests, lockfiles, agent instruction files, CODEOWNERS, .github/, any top-level dot directory) with fallback-to-issue or request-review policies
  - Content sanitiser applied to both agent input and agent output - @mention and closing-keyword neutralisation, URL redaction to the allowed domain list, tag defanging, size caps
  - Integrity filtering in the tool gateway - drop tool results authored by accounts below a trust level (merged, approved, unapproved) instead of only marking them untrusted
  - Budget steering - the model proxy injects warnings as the run nears its credit cap, plus cheap extra guards (max tool denials, max cache misses, model allowlist per alias)
  - Exact-value secret redaction over every artifact and log before upload, run unconditionally
  - Staged mode and replay - produce the full side-effect plan without applying it, then replay the recorded plan later
  - Run-scoped steering issue whose comments from write-access users the agent reads mid-run
differs:
  - No durable control plane - a task is a GitHub Actions run, state lives in run artifacts and issues, and nothing schedules, retries, or supervises across runs
  - Policy is per workflow file in each repository, compiled into Actions YAML, not a central versioned capability document enforced by one gateway
  - GitHub Actions is the only substrate - no Forgejo or GitLab path, microVM isolation needs GitHub-hosted KVM runners
  - Model credentials sit in an api-proxy sidecar on the same runner as the agent, not behind a central gateway keyed to a task identity
  - The final security gate before writes is an LLM threat-detection job that fails open by default (continue-on-error true)
ux_verdict: The best onboarding in this category for GitHub users - one Markdown file, a wizard, a first issue in about ten minutes - but no dashboard, and a 1,400 to 2,600 line generated YAML per workflow that few people will review.
slop_verdict: Real and used in anger. GitHub runs about 300 agentic workflows on the repository itself and merged about 580 PRs in September 2026, much of it agent-written, with high churn and one critical credential-leak advisory in August 2026.
---

# GitHub Agentic Workflows (gh-aw)

## 1. What it is

gh-aw is a `gh` CLI extension and a set of GitHub Actions from GitHub Next and Microsoft Research. A user writes a Markdown file with YAML front matter under `.github/workflows/`. `gh aw compile` turns it into a `.lock.yml` GitHub Actions workflow. That workflow runs a coding agent (Copilot CLI by default, or Claude Code, Codex, Gemini, Pi) in a container behind an egress firewall. The agent gets read-only GitHub access. Its writes go out as structured requests ("safe outputs") that later jobs validate and apply with their own scoped token.

The target use is repository chores that need judgement: issue triage, PR review, CI failure investigation, documentation upkeep, dependency analysis, reports. The README says it "complements existing CI/CD; it does not replace it". It entered technical preview in February 2026 (GitHub changelog, 2026-02-13) and the FAQ still says "Public Preview" (`docs/src/content/docs/reference/faq.md`). It is MIT licensed and free. Model cost flows through the user's Copilot or provider billing.

The makers claim a "defense-in-depth security architecture that protects against prompt injection, rogue MCP servers, and compromised agents". The code does show real layering: separate jobs with separate permissions, a Squid-based firewall, a credential-holding API proxy, per-type caps on writes. It also shows that several gates can be switched off, and that the threat-detection gate warns rather than blocks by default. The README itself says "even then things can still go wrong. Use it with caution, and at your own risk."

## 2. Mapping to our five planes

| Plane or principle | gh-aw | Us | Verdict |
|---|---|---|---|
| Signals | Any GitHub event: issues, PRs, comments, `slash_command`, `label_command`, `schedule` (fuzzy, e.g. "daily on weekdays"), `workflow_run` on CI failure, `deployment_status`, `repository_dispatch` for external alerts. Filters: `on.roles`, `on.bots`, `skip-if-match` search queries, `stop-after` deadline, `cooldown` | Forgejo webhooks, SigNoz alert webhooks, intake API, every task an issue | equal |
| Control plane | None beyond Actions itself. A run is the unit. Concurrency groups, `user-rate-limit`, a daily credit check at activation. No task registry, no retries across runs, no supervisor | factoryd with a Temporal workflow per task, Postgres, approvals, ledger, audit | we lead |
| Worker plane | One Actions job per run. AWF (`github/gh-aw-firewall`) starts the agent in a Docker container whose only egress is a Squid proxy with a domain allowlist. Optional Cloud Hypervisor microVM (preview, GitHub-hosted KVM runners only). MCP servers in their own containers behind an MCP gateway | One gVisor pod per task, own namespace and ServiceAccount, default-deny egress by Cilium | equal |
| Verification | Protected-files check on patches, per-type validation of requested writes, an LLM threat-detection job over the patch and outputs, optional custom scanner steps. Tests and CI are the user's own ordinary workflows | Forgejo Actions on untrusted runners, policy gates, reproduction gate, stronger-model review with strict verdict | we lead |
| Merge and deploy | Opens a PR. `merge-pull-request` safe output exists but is experimental. Deploy is out of scope | Bot merge after whitelisted approval or `auto` rule, Flux deploy, staged rollout | we lead |
| Policy outside the model | Safe-outputs config compiled into separate jobs, per-type `max`, allowed labels, target repos, protected files, tool allowlists passed as `--allow-tool` flags, compile-time strict mode and action SHA pinning | Capability YAML in Git, enforced in gateway code and network policy | equal |
| Identity per task | Per-job `GITHUB_TOKEN` (read in the agent job, write only in `safe_outputs`), model key held by the api-proxy container and excluded from the agent's env, WIF for Anthropic and Google. PATs are still common (`COPILOT_GITHUB_TOKEN`, `GH_AW_CI_TRIGGER_TOKEN`) | Projected ServiceAccount token per task, gateway maps it to the task row, no key material in the sandbox | we lead |
| Artifacts not chat | `agent_output.json` (NDJSON of requested writes), `aw.patch`, `prompt.txt` passed between jobs as Actions artifacts | TaskBrief in, branch, PR and event stream out | equal |

## 3. Architecture and stack

The compiler is Go (`go.mod`, module `github.com/github/gh-aw`, Go 1.26, cobra, bubbletea for the TUI, the official MCP Go SDK). `pkg/workflow` holds about 1,500 files. The runtime logic ships as CommonJS scripts in `actions/setup/js/` that the lock file loads through `actions/github-script`. The firewall (`github/gh-aw-firewall`, TypeScript, 147 stars) and the MCP gateway (`github/gh-aw-mcpg`, Go, 183 stars) are separate repositories. There is no server, no database, no queue. GitHub Actions is the scheduler and the store.

The compiled YAML is large. `firewall.md` (a 30-line test workflow) compiles to 1,391 lines. `ci-coach.md` compiles to about 2,650 lines with these jobs: `activation`, `agent`, `detection`, `evals`, `push_evals_state`, `push_experiments_state`, `conclusion`, `safe_outputs`, `update_cache_memory`. The permission split is visible in the YAML: `agent` has `contents: read`, `issues: read`, `pull-requests: read`, `detection` has `contents: read`, and only `safe_outputs` and `conclusion` get `contents: write`, `issues: write`, `pull-requests: write`. Actions are pinned by SHA through `.github/aw/actions-lock.json`.

The agent step (read in `firewall.lock.yml`, step "Execute GitHub Copilot CLI") writes an `awf-config.json` with the domain allowlist, the api-proxy settings (`maxAiCredits`, `maxRuns: 500`, `maxCacheMisses: 5`, a model alias table), and digest-pinned images for `squid`, `agent`, `api-proxy` and `cli-proxy`. It then runs `awf --config ... --env-all --exclude-env COPILOT_GITHUB_TOKEN --exclude-env GITHUB_MCP_SERVER_TOKEN --exclude-env ACTIONS_ID_TOKEN_REQUEST_TOKEN ...`. So the agent container inherits every other environment variable of the job, minus a named deny list. A "Clean credentials" step removes the checkout's git credentials before the agent starts. Tool allowlists become `--allow-tool shell(grep)`-style flags for the harness. That is enforcement inside the harness, not in the kernel or the network.

Safe outputs work like this. In the agent job a local MCP server (`safe_outputs_mcp_server.cjs`) exposes one tool per configured output type. Calls are appended as NDJSON to a file. The real enforcement happens later. `collect_ndjson_output.cjs` validates each line against the type schema and rejects items past `getMaxAllowedForType` ("Too many items of type ... Maximum allowed"). Then `safe_output_handler_manager.cjs` dispatches to per-type handlers in the `safe_outputs` job. `create_pull_request.cjs` applies the protected-files policy before it pushes. Because the check is downstream, an agent that writes the NDJSON file directly gains nothing.

Engines are pluggable (`docs/src/content/docs/engines/`). Model traffic goes through the AWF api-proxy (`containers/api-proxy/` in the firewall repository). The proxy holds the provider credential, resolves model aliases (`small`, `large`, `coding`, `opus` and so on to provider globs), prices each response, and enforces guards in `proxy-guards.js`.

## 4. UX

Onboarding is short. The quick start (`docs/src/content/docs/setup/quick-start.mdx`) has three steps: `gh extension install github/gh-aw`, `gh aw add-wizard githubnext/agentics/repo-status` (pick an engine, set a secret), then wait two to three minutes for a "Daily Repo Report" issue. Writing a new workflow is a Markdown file plus `gh aw compile` and a commit of both files.

While an agent works, the user sees an ordinary Actions run. There can be an emoji reaction and a status comment on the triggering issue (`reaction:`, `status-comment:`), and a step summary with token use, firewall log and MCP log. `gh aw logs`, `gh aw audit <run-id>` and `gh aw status` pull artifacts to the terminal. There is no web dashboard of runs or tasks.

Intervention is thin. A user can cancel the Actions run, or gate a run on a GitHub environment with `manual-approval:`. The experimental `steer:` option opens a run-scoped issue, and the agent reads its "steer" comments through the GitHub MCP server. `staged: true` runs everything but only previews the writes. Approval of the result is the normal PR review.

Easier than our console: authoring is one file in the repository, everything shows up in GitHub's own UI, and the gallery of ready workflows (`githubnext/agentics`) gives a first result in minutes. Worse: no board, no cost view across workflows except the CLI, no human lane, and the generated YAML is too big to review by hand. An HN commenter called the lock files "1000-line beasts that you'll need an LLM to explain" (HN 46934107, 2026-02-12).

## 5. Security, identity, sandbox, policy, cost

**Sandbox.** AWF puts the agent on an internal Docker network whose only route out is Squid with a domain allowlist (`network.allowed`, with ecosystem bundles such as `defaults`, `node`, `python`). It drops iptables capabilities before launch. The default "chroot mode" mounts host system directories read-only but the host `HOME` and `/tmp` read-write. That is weaker than our read-only root. Cloud Hypervisor microVMs are preview and need GitHub-hosted x86_64 runners with `/dev/kvm`. They removed their gVisor and docker-sbx runtimes in September 2026 to consolidate on Cloud Hypervisor (blog, 2026-09-05). The runner host, Docker daemon, firewall, proxy and MCP gateway are all trusted (`introduction/architecture.mdx`, "Layer 1").

**Credentials.** The model key lives in the api-proxy container, not the agent container. The GitHub MCP token lives in the MCP gateway. The docs warn that the MCP gateway agent ID mounted into the agent container is "leaked by design". Write tokens exist only in the `safe_outputs` job, which runs after the agent job ends. PATs remain the path for many setups. Advisory GHSA-8h78-hpm7-29gg (critical, CVSS 9.1, 2026-08-27) showed the risk. In v0.83.3 to v0.85.3 the safe-outputs job wrote a base64 git authorisation header for `GH_AW_CI_TRIGGER_TOKEN` into a downloadable artifact.

**Policy.** Enforced in code:
- the job permission split
- per-type caps, allowed labels and target repos
- protected files
- a compile-time schema and expression allowlist
- strict mode, which rejects write permissions and wildcard domains
- `on.roles`, defaulting to `[admin, maintainer, write]`
- `min-integrity: approved` by default on public repositories, where the MCP gateway filters out tool results from lower-trust authors

Enforced by the harness only: shell and tool allowlists. Enforced by a prompt: threat detection, which runs the same engine with a security prompt. By default (`continue-on-error: true`, `reference/threat-detection.md`) a positive only becomes a caution notice, not a block.

**Content handling.** Event text passes a sanitiser before the agent sees it, and agent text passes it again before any write. @mentions and "fixes #123" are defanged. Tags become parentheses. URLs outside the allowlist become "(redacted)". Size is capped at 0.5 MB and 65k lines. All files under `/tmp/gh-aw` are scanned for exact secret values and masked before upload, with `if: always()`.

**Cost.** The defaults come from `reference/cost-management.md`:
- 1,000 AI Credits per run (1 credit = 0.01 USD, so 10 USD)
- 5,000 credits per workflow per day
- 400 credits for the detection run
- a 20-minute agent step and a 60-minute agent job
- an optional `max-turns`

The per-run cap lives in memory in the api-proxy (`guards/ai-credits-guard.js`). It books each response's cost after the fact and blocks further requests once the total reaches the cap. There is also an absolute `HARD_CAP_AI_CREDITS = 10_000`. There is no worst-case hold before a call, so one large call can overshoot. The daily cap is computed at activation from earlier runs' usage artifacts, so concurrent runs can race past it. The proxy steers the model with warnings as the cap nears. Any cap can be set to `-1` to disable it.

## 6. What we should take from it

### Narrow

**Typed side-effect requests.** Our agent's only output is a branch. Comments, labels, follow-up issues and escalations should become typed requests in the event stream. Each would get a per-type cap from the capability policy and be applied by factoryd after the worker is dead. This matches our "artifacts not chat" rule and gives the gateway fewer live write tools. Their `safe_outputs_tools.json` and `safe_output_type_validator.cjs` are a ready schema set to copy.

**Protected-files defaults.** Their list covers manifests and lockfiles, `AGENTS.md`/`CLAUDE.md`-style instruction files, `CODEOWNERS`, `.github/` and every top-level dot directory. It comes with two policies, fallback-to-issue and request-review. Both map directly onto our path risk classes. Add the list as the default high-risk class in the policy YAML.

**Sanitiser.** `sanitize_content.cjs` does mention and closing-keyword neutralisation, URL redaction against the allowlist and tag defanging. We mark outside text as untrusted but do not neutralise it. We do not sanitise the agent's PR body and comments at all. A small Go port in factoryd, run on the TaskBrief and on everything written back to Forgejo, closes both gaps.

**Integrity filtering.** Their MCP gateway removes content below `min-integrity` from tool results. Our gateway already proxies MCP calls and knows each author's role in Forgejo. For public projects, dropping text from accounts below a project threshold is a stronger default than only labelling it.

**Budget steering and extra guards.** Our gateway clamps output length to the headroom. Two additions are cheap and feed our supervisor detectors:
- a steering message at 50, 80 and 95 percent of the task budget
- guards for repeated tool denials and cache misses (`guards/max-permission-denied-guard.js`, `guards/max-cache-misses-guard.js`)

**Unconditional secret redaction.** Scan session records and uploaded logs for exact values of every secret the worker process held (the two Forgejo tokens) before they reach S3. Their advisory is the reason.

**Staged mode and replay.** A dry-run flag per task would produce the side-effect plan without applying it. That makes harness prompt changes testable against real issues. It also helps with our missing harness regression suite.

### Broad

**Many small scheduled agents.** GitHub runs about 300 agentic workflows on its own repository: CI coach, docs upkeep, dead-code hunts, weekly reports, linter miners. Our factory only reacts to issues. A "standing task" type would be a spec plus a schedule that produces issues or PRs. It would give the factory a stream of self-generated work and a cheap way to show value.

**Authoring as a file in the repository.** A project's standing tasks and their capabilities could live as Markdown with front matter in the project repository, reviewed like code, then intersected with the central policy. That gives the per-project flexibility they have without giving up central caps.

**Onboarding through a wizard and a gallery.** Their ten-minute path to a first visible result is the thing our console lacks most. A registration wizard that ends with one sample task running would copy the pattern.

## 7. Where our philosophy differs and what that costs or buys us

**GitHub Actions as the whole runtime.** Copying gh-aw would break constraints 2 and 3. It needs GitHub or GHES, and its microVM path needs GitHub-hosted KVM runners. Forgejo Actions reads similar syntax, but the lock files depend on `actions/github-script`, Actions artifacts and GitHub APIs throughout (not verified on Forgejo). Our price is building our own control plane. What it buys is re-seedability on rented servers and a durable task lifecycle they do not have.

**No durable task state.** They have no retries across runs, no supervisor, no approvals as workflow state, no cost ledger beyond artifacts. For short chores this is fine and much simpler. For multi-session work on one issue our Temporal design is the right one. Their approach is better for the "many cheap scheduled chores" case, and we pay complexity for the case they skip.

**Policy per workflow file.** Their policy is whatever each repository's workflow file says, checked by a trusted compiler. Ours is one versioned document enforced by one gateway. Theirs is more flexible per use case. Ours gives one place to audit and one place to cap spend across projects, which our "policy outside the model" principle requires.

**Credentials on the runner.** Their model key and GitHub MCP token sit in sidecar containers on the same host as the agent. Our gateway keeps no secret in or next to the sandbox and verifies a projected token instead. Theirs is simpler and works on any runner. Ours means a host escape does not yield a provider key.

**LLM as the last gate.** Their final pre-write check is an LLM verdict that fails open by default. Our last gates are deterministic policy checks, the reproduction gate and a strict-verdict review before a human or `auto` rule merges. We should keep that order.

## 8. Red flags and slop assessment

It is real. The repository moved from `githubnext/gh-aw` to `github/gh-aw`. It has 5,202 stars, 564 forks and 462 open issues, and merged about 581 PRs in September 2026 alone. Releases land every one to three days. GitHub dogfoods it heavily: 299 `.md` workflows with lock files sit in `.github/workflows/`.

Churn is a risk. Features appear and vanish in weeks: the gVisor and docker-sbx runtimes were removed on 2026-09-05, "effective tokens" were replaced by AI Credits in June 2026, and many options are marked experimental. Much of the code, the docs and even the blog are agent-written (blog author `copilot`). The HN thread (2026-02-12) found a Copilot-authored dependency PR that used a `replace` directive plus unrelated changes, merged by a human anyway.

Security record: one critical advisory (GHSA-8h78-hpm7-29gg, 2026-08-27), with the affected releases retired as a precaution. Several safety defaults can be switched off with `-1` or `continue-on-error`, and the docs push that responsibility to the workflow author. Vendor lock-in to GitHub is total. There is no open-core gating: everything is MIT.

## 9. Sources

- https://github.github.com/gh-aw/ (fetched 2026-09-29)
- https://github.com/github/gh-aw/security/advisories/GHSA-8h78-hpm7-29gg (published 2026-08-27, fetched 2026-09-29)
- https://news.ycombinator.com/item?id=46934107 (thread 2026-02-12, fetched 2026-09-29)
- https://github.blog/changelog/2026-02-13-github-agentic-workflows-are-now-in-technical-preview/ (search result, not fetched)
- https://www.infoq.com/news/2026/05/github-agentic-workflows/ (search result, not fetched)
- https://arxiv.org/html/2605.07135v1 (search result, not fetched, agentic workflow injection study)
- `gh api repos/githubnext/gh-aw`, `repos/github/gh-aw-firewall`, `repos/github/gh-aw-mcpg`, releases and contributors endpoints (2026-09-29)
- Clone `~/repos/market-research-clones/gh-aw` (last commit 2026-09-29 00:00:17 -0700)
- `README.md`, `go.mod`
- `docs/src/content/docs/introduction/architecture.mdx`, `introduction/how-they-work.mdx`
- `docs/src/content/docs/reference/safe-outputs.md`, `safe-outputs-pull-requests.md`, `cost-management.md`, `threat-detection.md`, `integrity.md`, `triggers.md`, `auth.mdx`, `faq.md`
- `docs/src/content/docs/setup/quick-start.mdx`, `patterns/deterministic-ops.md`
- `docs/src/content/docs/blog/2026-09-05-cloud-hypervisor-consolidation.md`
- `.github/workflows/firewall.md`, `firewall.lock.yml`, `ci-coach.lock.yml`
- `pkg/workflow/` (file list: `compiler_safe_outputs*.go`, `awf_*.go`, `firewall*.go`, `role_checks.go`)
- `actions/setup/js/collect_ndjson_output.cjs`, `safe_output_handler_manager.cjs`, `create_pull_request.cjs`, `sanitize_content.cjs` (by grep)
- Firewall clone `~/repos/market-research-clones/gh-aw/_firewall`: `containers/api-proxy/proxy-guards.js`, `guards/ai-credits-guard.js`, `guards/` listing
