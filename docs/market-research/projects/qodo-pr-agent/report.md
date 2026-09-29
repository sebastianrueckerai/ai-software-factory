---
name: PR-Agent
slug: qodo-pr-agent
url: https://docs.pr-agent.ai
repo: https://github.com/The-PR-Agent/pr-agent
category: code-review
license: MIT
open_source: yes
self_hostable: yes
hosting_model: self-hosted only, as a pip package, CLI, Docker image, AWS Lambda or GitHub Action, BYOK for any LLM provider through LiteLLM. No hosted PR-Agent product exists any more
company: Built by Qodo (formerly CodiumAI, Tel Aviv, founded 2022). In April 2026 Qodo handed the project to a new community org, The-PR-Agent, with an external maintainer and a governance committee, and Qodo's own site no longer mentions it
maturity: 13184 stars, 1908 forks, 378 contributor pages, 44 open issues, created 2023-07-05, last commit 2026-09-29, releases about every one to two weeks (v0.42.0 to v0.46.0 across August and September 2026)
similarity: 1
axes:
  signals_intake: 2
  control_plane: 0
  sandbox_isolation: 0
  verification: 2
  policy_outside_model: 3
  identity_per_task: 0
  cost_control: 1
  ux: 3
  reseedable_selfhost: 3
steal:
  - The host-only versus repo-overridable config split in pr_agent/config_security.py (REPO_OVERRIDABLE_KEYS_BY_HOST_SECTION, REPO_HOST_ONLY_KEYS_BY_SECTION), a concrete, code-enforced list of which settings keys a repository's own config file may touch and which stay host-controlled, closing named threats such as a repo pointing the skills loader at ~/.ssh or a repo widening its own sibling-repo read allowlist.
  - The compression strategy for large diffs in pr_agent/algo/pr_processing.py, prioritising languages and additions over deletions and packing hunks by token budget until a hard stop, a reusable pattern for our own coder harness prompt construction when a diff will not fit.
  - The self-reflection pass, a cheap second model call that scores and re-ranks the first pass's own suggestions and drops the ones scoring zero, a small two-call pattern worth trying inside our reviewer or supervisor step to cut noise before a human sees it.
  - Agent Skills (pr_agent/algo/skills_loader.py), an admin-curated SKILL.md library injected into prompts, with paths host-only and enable and max_skills_tokens the only keys a repo may set, a workable shape for distributing review standards across every project in a factory without checking them into each repository.
  - Persistent inline comment fingerprinting (comment_identity.py, persistent_inline_comments) to avoid reposting the same suggestion across repeated runs on one PR, a small de-duplication mechanism worth copying for our own reviewer output.
differs:
  - PR-Agent has no loop and no state. Every command is one LiteLLM completion call of about thirty seconds, triggered fresh per webhook, with no task registry, no retries across sessions and nothing to resume. It maps to a thin, optional slice of our verification plane and to none of our worker, control or merge and deploy planes, so its architecture cannot be adopted wholesale, only its prompt and config techniques.
  - There is no control plane and effectively no trust boundary. Any comment on an open PR can trigger a run (the only gate is DefaultIdentityProvider.verify_eligibility, which unconditionally returns ELIGIBLE in the open-source build) and credentials are static long-lived API keys and a GitHub token in repository secrets, not per-task identity. Copying this as-is would reintroduce exactly the raw-credential, ungated-trigger problem our identity-per-task and policy-outside-the-model principles exist to avoid.
ux_verdict: Fastest onboarding of anything looked at so far, one workflow file and two repository secrets, or one pip install and one CLI command, but there is nothing to watch or approve because each command is a single short completion, not a run.
slop_verdict: Real and very actively maintained, weekly releases, 378 contributor pages and a commit dated today, but mid governance transplant, Qodo handed it to a new community org in April 2026 and its own marketing site no longer names it, so its next year of maintenance is unproven.
---

# PR-Agent

## 1. What it is

PR-Agent is an open-source command-driven code review bot. A user or a webhook event triggers a slash command such as `/review`, `/improve`, `/describe` or `/ask` on a pull request or issue, and PR-Agent makes one LLM call per command and posts the result as a comment. It supports GitHub, GitLab, Bitbucket, Azure DevOps and Gitea, and any model LiteLLM can reach.

It was built inside Qodo (formerly CodiumAI). The README now states plainly that "this project is not the Qodo free tier": in April 2026 Qodo moved the repository from `qodo-ai/pr-agent` to a new, community-owned GitHub organisation, The-PR-Agent, installed an external maintainer (Naor Peled) and a three-person governance committee, and said in its own blog post that PR-Agent "has not kept pace with the Qodo platform" and that Qodo's resources now go to its commercial enterprise product. Qodo's current pricing page does not mention PR-Agent at all.

What the makers claim: fast, cheap, single-call reviews that scale from a two-line PR to a huge one through a compression strategy, fully open and self-hostable with no vendor lock-in. What the repository shows: that claim holds for the review mechanics, but the project has no task state, no sandbox and no policy engine of its own, only a data trust boundary around its own configuration.

## 2. Mapping to our five planes

| Plane / principle | What PR-Agent does | What we do | Verdict |
|---|---|---|---|
| Signals | Git-forge webhooks only, PR opened or updated, PR and issue comments, across five forges | Forgejo webhooks, SigNoz alerts, factoryd intake, every task a Forgejo issue | they cover one narrower signal type well, we cover more sources |
| Control plane | None, stateless per webhook call, no task registry, no scheduler, no approvals, no audit trail | factoryd, Temporal workflow per task, Postgres, YAML policy applied by Flux | we lead |
| Worker plane | None, a single LiteLLM completion, no sandbox, no code execution, no iteration | gVisor pod per task, read-only root, default-deny egress | not comparable |
| Verification | Produces one review or suggestion comment, optionally a GitHub Check Run, not a merge gate by default | Forgejo Actions, policy gates, reproduction gate, stronger-model review with a strict verdict | we lead |
| Merge and deploy | None by default, enable_auto_approval exists but its calling code is commented out, dead | Bot merge after approval or an auto rule, Flux deploy, staged rollout | we lead |
| Policy outside the model | A code-enforced allowlist of which config keys a repository's own file may set, host-only keys for skills.paths, push_outputs, prompt_fragments, repo_context_sibling_repos | Capability YAML in Git enforced in gateway code and network policy | equal, narrower scope |
| Identity per task | None, static OPENAI_KEY and GITHUB_TOKEN in repository or CI secrets, shared across every run | Projected, audience-scoped ServiceAccount token per task, verified against cluster OIDC | we lead |
| Artifacts not chat | The opposite by design, it exists to turn a diff into chat, a PR comment | TaskBrief in, branch, PR and event stream out | not comparable |

## 3. Architecture and stack

Python 3.12, FastAPI and Uvicorn for the webhook servers (pr_agent/servers/github_app.py, gitlab_webhook.py, bitbucket_app.py, gerrit_server.py, plus Lambda entry points), Gunicorn in the Docker image. No database and no queue: state lives only for the duration of one request. Git providers are one class per forge under pr_agent/git_providers/ behind a shared git_provider.py interface (diff fetch, comment post, label set, a push_code capability gated by restricted_mode). Model access goes through pr_agent/algo/ai_handlers/litellm_ai_handler.py (3300 lines) and a large cloud_auth.py (1900 lines) that layers Azure OIDC, Vertex WIF, Bedrock Mantle signing and IMDS credential handling on top of the litellm dependency, considerably more custom plumbing than a thin LiteLLM wrapper. Prompting is TOML-templated Jinja under pr_agent/settings/*.toml, with token fitting in pr_agent/algo/token_budget.py and pr_processing.py. Deployment shapes: pip/CLI, a Docker image (pragent/pr-agent on Docker Hub since 0.34.2), a GitHub Action (action.yaml), or an AWS Lambda package. tests/unittest runs under pytest with no live credentials; tests/e2e_tests need real provider keys.

## 4. UX

Zero to first result is short: for the GitHub Action, add one workflow YAML file and two repository secrets (OPENAI_KEY, GITHUB_TOKEN is automatic); for local use, pip install pr-agent, export a key, run pr-agent --pr_url <url> review. There is no web console, dashboard or IDE plugin in the open-source project (Qodo's separate commercial product has those). A user watches nothing and intervenes with nothing beyond posting another slash command, because each command is one short completion, not a monitored run. Screenshots in the README (describe_new_short_main.png, review_new_short_main.png, improve_new_short_main.png) show a hierarchical, collapsible comment: a one-line summary per suggestion that expands to a full explanation and a code snippet, aimed at five to ten seconds of reading per item.

## 5. Security, identity, sandbox, policy, cost

Security and policy: the one real enforcement point is pr_agent/config_security.py, a host-only allowlist deciding which settings a repository's own .pr_agent.toml or a PR comment argument may override, written specifically against named threats (a repo redirecting the skills loader at host files, a repo widening which sibling private repository it may read into a public PR). Everything else is left to the deploying operator's GitHub App or Action permissions.

Identity: no per-task identity of any kind. A single long-lived OPENAI_KEY (or provider key) and a GITHUB_TOKEN or GitHub App installation token are shared across every PR and every command the deployment ever runs.

Sandbox: none. PR-Agent never executes repository code; it reads a diff and calls a model. /help_docs was disabled from v0.36.1 after a credential-exposure issue (#2445) and has not been re-enabled.

Cost: only token and context budgeting to keep a prompt inside a model's window (max_model_tokens, token_budget.py); an optional output_run_cost flag can print an estimated LiteLLM cost in the comment, but nothing enforces a cap, a hold or a ledger.

Trigger trust: any account that can comment on an open PR can invoke a command. The only gate is DefaultIdentityProvider.verify_eligibility, which always returns ELIGIBLE in the open-source build; the docs recommend pull_request_target for fork PRs and warn about its risks, but enforcement is left to the operator's own workflow YAML.

## 6. What we should take from it

Narrow, copyable this month: the host-only versus repo-overridable config split in config_security.py as a named-threat checklist for our own per-repo policy file; the diff compression and dynamic-context strategy for large PRs; the self-reflection re-ranking call as a cheap two-pass pattern for the reviewer; persistent inline comment fingerprinting to stop a reviewer repeating itself across runs.

Broad, a priority or shape to consider: the Agent Skills model (a host-curated SKILL.md library, opt-in per repo) is a reusable answer to a problem we do not solve yet, distributing review standards across every project a factory touches without checking them into each one. It would land as a small addition to our review-frontier prompt assembly, not a new plane.

## 7. Where our philosophy differs and what that costs or buys us

Adopting PR-Agent's architecture would break "identity belongs to the task, not the machine": it runs on one shared, long-lived key per deployment, which is exactly the credential model our per-task ServiceAccount token was built to replace. It would also break "human approval is a workflow state, not a meeting" in the other direction, since it has no approval state at all, any PR commenter gets a model to run against the repository's diff, gated only by whatever the operator's CI trigger config happens to enforce. Their approach buys real speed and zero infrastructure for a narrow job; our constraint of per-task identity and enforced approval is the price of not accepting an ungated, shared-credential trigger surface.

## 8. Red flags and slop assessment

Governance risk is the headline: Qodo handed the whole project to a new external organisation in April 2026, stated openly that internal investment is going to its commercial product instead, and Qodo's own site no longer names PR-Agent anywhere checked. That is a maintainer transplant, not a fork, but its outcome over the next year is unproven; one outside comparison already frames it as a possible fragmentation risk.

The repository's own LICENSE file and the GitHub API both say MIT, copyright 2026 The PR Agent, but Qodo's handover blog post says the project is "going back to" Apache 2.0. That is a documented discrepancy between what a primary source claims and what the code shows, exactly the kind of gap worth flagging rather than repeating.

Two more open items found in the code: config.enable_auto_approval exists in configuration.toml but the auto-approve call site is commented out, a dead feature flag; /help_docs has been disabled since v0.36.1 (2026) over a credential-exposure issue and has not shipped a fix. Neither is severe, both are evidence the maintenance transition is real work in progress, not finished.

## 9. Sources

- /home/womb/repos/market-research-clones/qodo-pr-agent (shallow clone of https://github.com/qodo-ai/pr-agent, which redirects to https://github.com/The-PR-Agent/pr-agent), read 2026-09-29
- README.md, LICENSE, pyproject.toml, CHANGELOG.md, action.yaml
- pr_agent/settings/configuration.toml
- pr_agent/config_security.py
- pr_agent/servers/github_app.py, pr_agent/servers/utils.py
- pr_agent/identity_providers/identity_provider.py, default_identity_provider.py
- pr_agent/secret_providers/secret_provider.py
- pr_agent/algo/ai_handlers/litellm_ai_handler.py, cloud_auth.py
- pr_agent/algo/token_budget.py, pr_processing.py
- pr_agent/git_providers/git_provider.py, github_provider.py, gitlab_provider.py, bitbucket_provider.py
- pr_agent/tools/pr_update_changelog.py
- docs/docs/core-abilities/index.md, compression_strategy.md, self_reflection.md, agent_skills.md
- docs/docs/overview/data_privacy.md
- docs/docs/usage-guide/automations_and_usage.md
- docs/docs/installation/github.md
- https://api.github.com/repos/qodo-ai/pr-agent (stars, forks, license, dates, redirect target), fetched 2026-09-29
- https://api.github.com/repos/qodo-ai/pr-agent/contributors and /releases, fetched 2026-09-29
- https://qodo.ai/pricing/, fetched 2026-09-29 (WebFetch)
- https://www.qodo.ai/blog/qodo-is-handing-pr-agent-over-to-the-community/, fetched 2026-09-29 (WebFetch)
- WebSearch "pr-agent qodo the-pr-agent community maintained fork 2026", 2026-09-29, including https://futurumgroup.com/insights/qodo-hands-pr-agent-to-the-community-will-open-governance-accelerate-ai-code-review/ and https://theaiagentindex.com/agents/codiumai-pr-agent
