# Report template

Every project report is `projects/<slug>/report.md` and follows this shape exactly. The YAML front matter is read by a script, so keep the keys and the value types. Prose sections may be as long as the material deserves. A thin project gets a thin report. Do not pad.

```markdown
---
name: Project Name
slug: project-slug
url: https://example.com
repo: https://github.com/org/repo   # or none
category: factory-orchestrator      # one value from the category list below
license: Apache-2.0                  # SPDX id, "proprietary", or "mixed: <detail>"
open_source: yes                     # yes | partial | no
self_hostable: yes                   # yes | partial | no
hosting_model: self-hosted and cloud # free text, one line
company: Org name, funding, HQ, founded (one line)
maturity: stars, contributors, first commit, last commit, release cadence (one line)
similarity: 3                        # 0-5, overall resemblance to our five-plane factory vision
axes:                                # 0-5 each. 0 = absent, 5 = does this better than our design
  signals_intake: 0                  # issues, alerts, telemetry as work sources
  control_plane: 0                   # durable task state, scheduling, approvals, audit
  sandbox_isolation: 0               # per-task disposable sandbox, egress control
  verification: 0                    # CI, gates, model review before merge
  policy_outside_model: 0            # capability rules enforced in code or network, not prompts
  identity_per_task: 0               # short-lived, task-scoped credentials, no keys in the agent's reach
  cost_control: 0                    # hard caps, holds, ledger
  ux: 0                              # how easy it is to use, onboard, watch, intervene
  reseedable_selfhost: 0             # immutable, re-seedable, runs on commodity hardware
steal:
  - one line each, 3 to 8 items, concrete: a library, a mechanism, a UX pattern, a default
differs:
  - one line each: a design philosophy difference that would force us to do something differently at the core
ux_verdict: one line
slop_verdict: one line. Is it real, maintained, used in anger? Or a README with a landing page?
---

# <Name>

## 1. What it is
Two or three paragraphs. Who makes it, what problem it says it solves, who uses it, how it is sold or licensed. Include one line on what the makers claim and one line on what the repository or docs actually show.

## 2. Mapping to our five planes
A table with one row per plane (signals, control plane, worker plane, verification, merge and deploy) and one row per principle (policy outside the model, identity per task, artifacts not chat). Columns: what they do, what we do, verdict (they lead | equal | we lead | not comparable).

## 3. Architecture and stack
Languages, key libraries, storage, queueing or workflow engine, deployment shape (binary, Helm chart, SaaS), how it runs agents, how it talks to models. Name files and directories you read. For a closed product, say what the docs and blog posts reveal and mark inference as inference.

## 4. UX
How a user starts work, watches it, intervenes, approves. Onboarding path from zero to first result. Interfaces: web, CLI, IDE, chat, API. What is easier than our console and why. What is worse. Describe screenshots you saw.

## 5. Security, identity, sandbox, policy, cost
One short paragraph per topic. What they enforce in code, what they leave to prompts, what they leave to the user. Where credentials live. Whether an agent can reach the internet. What a spend cap looks like, if any.

## 6. What we should take from it
Split into narrow (libraries, code, mechanisms, defaults we can copy this month) and broad (product shape, priorities, UX, a problem they solve that we ignore). Each item one paragraph at most, and each item says how it would land in our design.

## 7. Where our philosophy differs and what that costs or buys us
Where copying them would break one of our four constraints or three principles. Where their approach is better and our constraint is the price. Say which.

## 8. Red flags and slop assessment
Maintenance signals, open-core gating, licence changes, vendor lock-in, marketing that outruns the code, security incidents. Cite what you saw.

## 9. Sources
Every URL fetched and every file or directory read, one per line.
```

## Category list

Use exactly one of these values in `category`.

| Value | Meaning |
|---|---|
| factory-orchestrator | Takes issues or specs and runs coding agents end to end to a PR or deploy, with its own task state |
| coding-harness | The agent that edits code, usable headless (CLI, SDK) |
| multi-agent-ui | Desktop or web UI to run and watch several coding agents in parallel |
| sandbox-runtime | Isolated execution environments for agents |
| model-gateway | Proxy in front of model providers: routing, keys, budgets, audit |
| observability-evals | Tracing, evaluation, prompt management for LLM applications |
| agent-framework | Library to build agents and multi-agent systems |
| enterprise-agent-platform | Vendor-hosted control plane for agents: runtime, identity, policy, memory |
| durable-execution | Workflow engines that could hold the task lifecycle |
| policy-identity | Authorisation, guardrails, credential brokering for agents |
| spec-driven | Methodologies and tools that turn specs into agent work |
| telemetry-to-fix | Alert or error in, root cause and PR out |
| code-review | Automated review of pull requests |
| forge-integrated | Git forge with agents built in |
| app-builder | Prompt to deployed application products |
| ci-build | CI, build and sandbox infrastructure for agent-driven pipelines |
| issue-tracker | Issue trackers with agent-facing APIs |
| kubernetes-agents | Kubernetes-native agent runtimes and operators |
