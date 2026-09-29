---
name: SWE-agent and mini-swe-agent
slug: swe-agent
url: https://swe-agent.com
repo: https://github.com/SWE-agent/SWE-agent
category: coding-harness
license: MIT
open_source: yes
self_hostable: yes
hosting_model: local pip package or Codespaces, drives disposable sandboxes (Docker by default, also Modal and AWS Fargate via the separate SWE-ReX package); no SaaS product, no login
company: none, academic project (Princeton and Stanford researchers, NeurIPS 2024 paper), no funding or employees
maturity: 20.4k stars, 2.2k forks, ~97 contributors, 126 open issues, first commit Apr 2024, last code commit 16 Jul 2026, last tagged release v1.1.0 (22 May 2025); site says the project is now maintenance-only, effort moved to sibling mini-swe-agent (8.1k stars, created Jun 2025, commits as recent as 28 Sep 2026)
similarity: 2
axes:
  signals_intake: 1
  control_plane: 0
  sandbox_isolation: 2
  verification: 2
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 2
  ux: 2
  reseedable_selfhost: 2
steal:
  - litellm is already the model layer (sweagent/agent/models.py imports litellm directly), so pointing SWE-agent or mini-swe-agent at factory-gateway is a base_url and virtual-key change, not an integration project. Confirms LiteLLM as the common substrate across this whole market, not just our choice.
  - The reviewer/best-of-n retry loop (sweagent/agent/reviewer.py, sweagent/agent/action_sampler.py) runs several attempts and can score them with a separate, optionally stronger, reviewer model. A smaller, concrete version of our supervisor "retry on a stronger model" idea, worth reading before building ours.
  - mini-swe-agent's execution model, every action is an independent subprocess.run call instead of a persistent shell session, makes the sandbox trivially swappable (docker exec, singularity, bubblewrap, local) per its README. That is a cleaner shape for a Harness implementation than a long-lived shell, and closer to how a gVisor pod exec would want to be driven.
  - The open_pr hook (sweagent/run/hooks/open_pr.py) has the agent create its own branch, commit and PR against the source issue with commands run inside the sandbox. A small, self-contained example of "artifacts not chat" done entirely with plain version-control primitives.
  - Per-instance and total cost limits (agent.model.per_instance_cost_limit, total_cost_limit in sweagent/agent/models.py) are computed from litellm's own per-call cost accounting, giving a ready-made table of per-model prices to crib from instead of maintaining our own.
differs:
  - No sandbox network policy anywhere in the code we read: the default Docker deployment gets whatever network the container runtime gives it, there is no egress allowlist, and a web_browser tool ships in tools/. Adopting this harness as-is would mean building all of our default-deny egress at the factoryd/pod layer, which we already do, so the harness contributes nothing here.
  - Identity is a shared, static API key or GitHub token read from environment variables for the whole run (sweagent/agent/models.py, sweagent/run/hooks/open_pr.py), not a credential scoped to one task. Using either project's harness changes nothing about our per-task ServiceAccount and per-task LiteLLM virtual key design; the harness would simply never see a raw key, same as opencode today.
  - Policy is entirely a prompt-level and CLI-flag concern (blocked commands, budgets, review instructions all sit in the YAML agent config, not enforced by any separate reference monitor). This matches, not contradicts, our "policy outside the model" principle: it confirms the enforcement has to live in factoryd/factory-gateway regardless of which harness we run inside the sandbox.
ux_verdict: CLI-only, config is a hierarchical YAML plus flags, a Textual/HTML trajectory inspector for after-the-fact review; fine for a single ad hoc fix, no fleet view, no live approval flow, nothing our console needs to match.
slop_verdict: Real, peer-reviewed (NeurIPS 2024) and widely used historically (20k stars), but the maintainers themselves call SWE-agent maintenance-only and point everyone to mini-swe-agent; treat this report as a design sample of a 2024 approach, not a maintained target, and read mini-swe-agent as the live one.
---

# SWE-agent and mini-swe-agent

## 1. What it is
SWE-agent is an open source "agent-computer interface" (ACI) that lets a language model of its user's choice read, edit and run code inside a sandbox to resolve a GitHub issue, first published as a NeurIPS 2024 paper by researchers from Princeton and Stanford. It has no company, no pricing and no hosted product: pip install sweagent, point it at an issue URL and a repository, and it opens a Docker container, runs the model in a loop, and produces a patch. mini-swe-agent, from the same team, is the actively developed successor: a roughly 100-line agent loop that drops SWE-agent's custom tool set in favour of bash-only actions, and scores over 74% on SWE-bench verified.

The README and the docs site both say the same thing in their own words: "most of our current development effort is on mini-swe-agent, which has superseded SWE-agent." The last real code commit to SWE-agent was 16 Jul 2026, the last tagged release was v1.1.0 in May 2025, and swe-agent.com's own text calls the project maintenance-only. What the repository actually shows is a mature, fully documented tool that stopped evolving in favour of a simpler sibling, not a project quietly dying: mini-swe-agent had commits as recent as 28 Sep 2026 and lists production users (Meta, NVIDIA, IBM, Essential AI, Nebius, Anyscale per its own docs, not independently verified).

## 2. Mapping to our five planes

| Plane / principle | What SWE-agent does | What we do | Verdict |
|---|---|---|---|
| Signals | One GitHub issue URL, a local file, raw text, or a batch/dataset of issues passed on the CLI (sweagent run / run-batch); no listener, no webhook | Forgejo webhooks, SigNoz alerts, factoryd intake API | we lead |
| Control plane | None. A CLI process per run; run-batch resumes by skipping instances whose trajectory file already exists on disk (sweagent/run/run_batch.py should_skip), no scheduler, no approvals | factoryd with a Temporal workflow per task, Postgres | we lead |
| Worker plane | One SWE-ReX deployment per task (Docker by default, also Modal, AWS Fargate, local); tools installed into the container from tools/ bundles | gVisor pod per task, default-deny egress | equal on disposability, we lead on egress control |
| Verification | An optional retry loop (agent/reviewer.py, agent/action_sampler.py) runs several attempts and picks the best with a scoring model; no independent CI, no policy gates | Forgejo Actions, policy gates, stronger-model review before merge | we lead |
| Merge and deploy | Optional open_pr hook commits and opens a PR against the source issue from inside the sandbox, using a token from the user's environment; a human reviews it on GitHub as normal | Bot merge after approval or an auto rule, Flux deploy | we lead |
| Policy outside the model | None found: no capability file, no directory allow/deny list, all constraints live in the YAML prompt/config | Policy as a file in Git, enforced in gateway code and network policy | we lead |
| Identity per task | One shared API key and one shared GitHub token per run, from environment variables | Projected, audience-scoped, per-task ServiceAccount token and per-task LiteLLM virtual key | we lead |
| Artifacts not chat | The trajectory JSON file is the full session record (thoughts, actions, observations); open_pr turns it into a branch and PR | TaskBrief in, branch/PR/event stream out | equal |

## 3. Architecture and stack
Python 3.11, packaged as sweagent (pyproject.toml, sweagent = "sweagent.run.run:main"). Model access goes through litellm (sweagent/agent/models.py), with per-instance and total cost limits computed from litellm's own cost accounting and enforced by raising InstanceCostLimitExceededError/TotalCostLimitExceededError after a call completes. Sandboxing is delegated entirely to the sibling package SWE-ReX (swe-rex dependency, swerex.deployment.config.DockerDeploymentConfig etc.), which the docs say also supports Modal, AWS Fargate and unsandboxed local execution. sweagent/environment/swe_env.py wraps a SWE-ReX deployment plus a Repo/RepoConfig (git clone or GitHub URL) and runs post_startup_commands before the agent starts. Tools are shell scripts and Python files under tools/* (tools/registry, tools/edit_anthropic, tools/review_on_submit_m, tools/search, tools/web_browser and others), installed into the sandbox by an install.sh per bundle and listed in the agent's YAML config (config/default.yaml). sweagent/agent/agents.py (55.8 KB) is the main loop; sweagent/agent/history_processors.py handles context compaction (e.g. cache_control for Anthropic prompt caching). Problem statements come from sweagent/utils/github.py (issue fetch via ghapi) or plain text/file. sweagent/inspector/ and sweagent/run/inspector_cli.py provide a static HTML/JS viewer and a Textual TUI for trajectory files.

## 4. UX
From zero: pip install sweagent (or Codespaces), export a model API key, run sweagent run with agent.model.name, env.repo.github_url and problem_statement.github_url set. That is one command once keys are set, roughly on par with opencode headless for a single fix, and simpler than most factory-orchestrator products because there is no account and no web UI to open first. While it runs, the CLI prints deployment setup, tool install, the system/instance prompt, then a scrolling loop of thought/action/observation until submit. The only way to intervene mid-run is to kill the process; there is no pause, approve or redirect affordance. Afterwards, sweagent inspector serves a trajectory browser (HTML/JS plus a Textual CLI viewer) to replay the session step by step, which is a genuinely nice per-task debugging tool, closer to a trace viewer than our console has today. There is no multi-task view, no cost dashboard, and run-batch (for SWE-bench-style batches) reports progress as a Rich progress bar, not a queue a human can steer.

## 5. Security, identity, sandbox, policy, cost
Identity: a single API key (ANTHROPIC_API_KEY, OPENAI_API_KEY, etc., read via .env or the shell environment) and, for open_pr, a single GitHub token, both shared across every task the process runs. Nothing is scoped per task or short-lived. Sandbox: real, via SWE-ReX's Docker/Modal/Fargate deployments, one container per environment, but we found no network egress control, no non-root enforcement and no read-only root filesystem in the code paths we read; the default image is plain python:3.11. Policy: none outside the prompt and YAML config; there is no equivalent of a capability file or a directory denylist enforced by code (contrast with Sweep's sweep.yaml blocked_dirs, which SWE-agent does not have). Cost: per_instance_cost_limit and total_cost_limit are checked after each model call using litellm's cost accounting (sweagent/agent/models.py lines around 370-382 and 628-656); this is a real, working cap, but it is a soft, in-process check with no pre-call hold, so a single expensive call can still exceed the limit before the exception fires.

We independently confirmed a live vulnerability while reading this code: sweagent/inspector/server.py's serve_file_content builds a file path as Path(self.traj_dir) / file_path from the raw URL suffix after /trajectory/ with no ".." rejection (lines 240-252), the server binds all interfaces via socketserver.TCPServer(("", port), ...) (line 322), and every response sets Access-Control-Allow-Origin: * (line 291). This matches the publicly disclosed CVE-2026-75482 (VulnCheck, published 17 Aug 2026, CVSS 3.1 7.5 High): an unauthenticated path traversal in the trajectory inspector that can read arbitrary files shaped like trajectory JSON, including files that can carry API keys, from any network reachable to the process or from a malicious web page via the wildcard CORS. The code in our clone (last commit 16 Jul 2026) still contains the unpatched pattern, and third-party trackers reported the fix still unmerged as of mid-September 2026.

## 6. What we should take from it
Narrow, this month: read sweagent/agent/reviewer.py and action_sampler.py before building our own supervisor retry-on-stronger-model path, they are a working, smaller-scale version of the same idea (multiple attempts, a scoring model picks the winner). Read sweagent/agent/models.py's cost-limit code as a reference for litellm's own cost fields rather than re-deriving per-model prices. The open_pr hook is a compact, few-command example of "agent creates a branch, commits, opens a PR" worth comparing against our own git-native worker code.

Broad: mini-swe-agent's design, one bash tool, no persistent shell, every action an independent subprocess, is a better shape to evaluate against our Harness interface than SWE-agent itself. It is model-agnostic through litellm (so factory-gateway needs no adapter work), it does not assume tool-calling support, and its subprocess-per-action model maps cleanly onto "exec into a gVisor pod, run one command, read the result" rather than requiring a long-lived shell session inside the sandbox. Whether to actually adopt it instead of opencode is a real design question, not answered here, because we did not clone or evaluate mini-swe-agent's code in this pass (out of scope for a tier 2 report on the SWE-agent slug); the honest next step is a dedicated look at mini-swe-agent if the Harness choice is revisited before Codex CLI lands.

## 7. Where our philosophy differs and what that costs or buys us
SWE-agent/mini-swe-agent's entire trust model is "give the LM a good interface and get out of the way": no capability policy, no per-task identity, no network egress control, static shared keys. That is fine as a research artefact and cheap to run, but it is the opposite of our "policy outside the model" principle; using either as our Harness would change nothing about how much of our own security work is needed, since we would still have to supply all of sandbox network policy, identity brokering and budget holds at the factoryd/factory-gateway layer regardless. The one place their approach is concretely worse than ours today is the trajectory inspector's unauthenticated path traversal (CVE-2026-75482): running that debugging server on any shared network would breach our "no half measures" security constraint outright, so if either harness is adopted, the inspector must either stay off by default or sit behind our own auth and network policy, never exposed as shipped.

## 8. Red flags and slop assessment
The clearest flag is the project's own: the maintainers call SWE-agent maintenance-only and steer users to mini-swe-agent, so treat everything here as a frozen 2024-2025 design, confirmed by a last tagged release of v1.1.0 (22 May 2025) against 126 still-open issues. The second is the live, unpatched CVE-2026-75482 in sweagent/inspector/server.py, verified directly in the source of our clone (path join without ".." rejection, bind-all-interfaces, wildcard CORS), disclosed 17 Aug 2026 and still unmerged per third-party trackers as of mid-September 2026. No licence gating, no open-core tier and no vendor lock-in: the whole thing is MIT, matching the licence badge and LICENSE file. No evidence of paid support or funding pressure that could force a licence change, because there is no company behind it.

## 9. Sources
- Clone: ~/repos/market-research-clones/swe-agent, shallow, 2026-09-29
- Read: README.md, SECURITY.md, CONTRIBUTING.md, LICENSE, pyproject.toml, config/default.yaml, config/human/human.yaml
- Read: sweagent/environment/swe_env.py, sweagent/environment/repo.py, sweagent/agent/models.py, sweagent/agent/reviewer.py, sweagent/agent/action_sampler.py, sweagent/agent/problem_statement.py, sweagent/run/run_batch.py, sweagent/run/run.py, sweagent/run/hooks/open_pr.py, sweagent/inspector/server.py, sweagent/utils/github.py
- Read: docs/usage/hello_world.md, docs/installation/index.md, tools/registry (config.yaml, install.sh)
- Ran git log -1 on the clone to get last commit date, 2026-09-29
- gh api repos/SWE-agent/SWE-agent for stars, license, dates, open issues, 2026-09-29
- gh api repos/SWE-agent/SWE-agent commits, releases, contributors endpoints, 2026-09-29
- gh api repos/SWE-agent/mini-swe-agent for stars and dates, 2026-09-29
- WebFetch https://swe-agent.com/latest/, 2026-09-29
- WebFetch https://raw.githubusercontent.com/SWE-agent/mini-swe-agent/main/README.md, 2026-09-29
- WebSearch "SWE-agent vs mini-swe-agent review 2026 production use", 2026-09-29
- WebSearch "SWE-agent security incident OR vulnerability OR arbitrary code execution", 2026-09-29
- WebSearch "CVE-2026-75482 SWE-agent inspector path traversal", 2026-09-29
