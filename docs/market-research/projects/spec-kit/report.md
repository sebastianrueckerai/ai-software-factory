---
name: GitHub Spec Kit
slug: spec-kit
url: https://github.com/github/spec-kit
repo: https://github.com/github/spec-kit
category: spec-driven
license: MIT
open_source: yes
self_hostable: yes
hosting_model: local CLI plus markdown templates, runs inside the user's own coding agent and repository, no hosted service
company: GitHub (Microsoft), open source project not a separate company. Announced 2025-09-02 by Den Delimarsky (GitHub)
maturity: about 139k stars, 12.5k forks, first tagged release 0.0.1 on 2025-08-22, latest release 1.0.13 on 2026-09-29, releases every few days
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 0
  verification: 2
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 0
  ux: 2
  reseedable_selfhost: 3
steal:
  - the converge command diffs the codebase against spec, plan and tasks and appends only the delta as new tasks, instead of re-planning from zero
  - a three-way bug verdict (verified, partial, failed) recorded as an artifact, separate from the fix step itself
  - a constitution.md every planning and implementation prompt is required to re-read before acting
  - the download hardening in _download_security.py (byte caps, zip entry caps, path traversal and internal-IP checks) is a template for any artifact fetch path
  - 30-plus coding-agent integrations behind one small adapter interface shows a thin per-harness adapter beats baking one harness's syntax into shared templates
differs:
  - no sandbox, no policy outside the model, no per-task identity, because it assumes a human approves every command; that premise cannot survive an unattended factory
  - fully synchronous, one-command-at-a-time UX by design, the opposite of human attention as an escalation
ux_verdict: five to six manual chat turns from init to a built feature, each gated on a human reading the previous artifact, no dashboard, no parallel view.
slop_verdict: real and heavily used, but GitHub calls it an experiment not a product, the documents are convention not enforcement, and the CLI has broken past tutorials with flag removals.
---

# GitHub Spec Kit

## 1. What it is

Spec Kit is an open source toolkit from GitHub that gives an existing AI coding agent
(Claude Code, Copilot, Codex, Gemini, Cursor and about 30 others) a structured sequence of
prompts and markdown templates for turning a plain-language request into a specification,
a plan, a task list and code. It ships as a Python CLI, specify-cli, that scaffolds a
.specify/ directory and /speckit-* slash commands into a project. GitHub calls it "an
experiment designed to test how well the methodologies behind Spec-Driven Development
actually work" (github.blog, 2025-09-02), not a finished product. The repository shows
more than that framing suggests: beyond specify/plan/tasks/implement it now bundles a
bug-fixing flow (assess/fix/test), an idea-assessment flow (intake/research/define/shape/
decide), a YAML workflow engine with resumable state and approval gates, and about 30
agent integrations, each a thin adapter deciding only file layout and invocation syntax.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None. A human types a spec or bug description into chat; no issue, alert or telemetry intake | Forgejo webhooks, SigNoz alerts, factoryd intake API, every task a Forgejo issue | we lead |
| Control plane | A local YAML workflow chains commands with approve/reject gates, resumable from a state file; no scheduler, no task registry, no budgets | factoryd with a Temporal workflow per task, Postgres registry, policy, approvals, cost ledger | we lead |
| Worker plane | No sandbox. The "worker" is whatever coding agent the user already has open, with that agent's full local permissions | One gVisor pod per task, disposable, default-deny egress | we lead |
| Verification | Self-review (clarify, analyze, checklist) and a converge step that diffs code against spec/plan/tasks; bug fixing ends in a verified/partial/failed verdict. No independent CI or second model | Forgejo Actions, policy gates, reproduction gate, stronger-model review, before merge | we lead |
| Merge and deploy | Nothing built in. An opt-in command can push tasks to a forge via MCP; committing and opening a PR is the user's own agent's job | Bot merge after approval or an auto-rule, Flux deploy, staged rollout with an alert-free wait | we lead |
| Policy outside the model | An extensions.yml hook can be marked mandatory, but "wait for it" is an instruction the model is asked to follow, not a code-level check | Capability rules in Git, enforced by gateway code and network policy | we lead |
| Identity per task | One long-lived personal token per forge, configured once by the user, never scoped or rotated | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task | we lead |
| Artifacts not chat | spec.md, plan.md, tasks.md, checklist.md and constitution.md are the durable interface between steps, read back by later commands | TaskBrief, branch, PR and event stream are the interface between agents | equal |

## 3. Architecture and stack

Python 3.11+, Typer/Click CLI (src/specify_cli/), packaged with hatchling, published as
specify-cli on PyPI. No server, database or queue: state is markdown files under
.specify/ and specs/<NNN>-slug/ in the target repository, plus small JSON files tracking
workflow resumption and integration status. pyproject.toml's force-include block bundles
templates, scripts (bash, PowerShell and Python triplicates), extensions, workflows and
presets into the wheel so init works offline. Agent support is one directory per agent
under src/specify_cli/integrations/, each a thin adapter on a shared base.py (claude,
copilot, codex, gemini, cursor_agent, cline, goose, opencode, devin and more); spec-kit
never calls a model, it only writes command files in the format each agent expects.
src/specify_cli/authentication/ supports GitHub, Azure DevOps and Bitbucket tokens, used
only by opt-in extensions; taskstoissues calls the MCP tool
github/github-mcp-server/issue_write rather than hitting the API directly.
_download_security.py caps archive downloads at 50 MB, caps zip entries and path length,
and blocks path traversal and internal-IP targets. Tests are layered into unit,
integration, contract and workflow suites under pytest.

## 4. UX

Install the CLI, run init with an integration flag, open the coding agent, then invoke
the constitution, specify, plan, tasks, implement and converge skills one at a time in
chat, reviewing each generated file before the next step. That is about three CLI steps
and five to six chat turns to a first feature. Progress is visible only as chat output
plus the markdown files written to the repo; a user intervenes by editing those files or
answering clarifying questions, not through a dashboard. The optional YAML workflow engine
adds named gate steps with approve or reject and can resume a chain from disk, the closest
thing to a run history. Bug fixing and idea assessment are separate command chains with
their own artifact folders. No web UI, no view of more than one feature at a time, no
async execution: everything blocks on the human's next command.

## 5. Security, identity, sandbox, policy, cost

Sandbox: none, code runs with whatever local permissions the user's coding agent already
has. Identity: one long-lived personal token per forge, never scoped or rotated per task.
Policy: the only enforcement is an extension hook block inside a prompt, asking the model
to run a hook and wait; nothing outside the model checks that it did. Cost: no budget or
spend cap; outside reviews estimate 20 to 40 percent higher token spend than unstructured
coding because every command re-reads spec, plan and tasks. Network: spec-kit itself only
fetches its own template and extension archives, with the download hardening noted above;
everything else uses the host agent's own credentials and network access.

## 6. What we should take from it

Narrow: the converge command's pattern, diff the codebase against spec/plan/tasks and
append only the missing delta, is a cheap idea for a post-CI pass checking a PR against
its TaskBrief's acceptance criteria before opening it. The three-way bug verdict
(verified, partial, failed) as a file artifact is a useful vocabulary upgrade for our
verification plane, which today talks mostly in pass or fail. A constitution file every
command must re-read is a lightweight version of policy-in-Git that could tighten a
TaskBrief without new infrastructure. The bounded download and archive-extraction
hardening is worth mirroring anywhere factory-gateway or the agent worker fetches an
artifact from outside the cluster.

Broad: 30-plus agent integrations behind one narrow adapter interface argues for keeping
our own Harness interface thin as we add Codex CLI, per-harness quirks in one small
adapter, not in shared prompt templates. Treating spec, plan, tasks and checklist as the
artifact passed between steps, never chat, even inside one human-driven session, is our
own principle at a smaller radius; it suggests TaskBrief could gain a plan or checklist
split for larger tasks.

## 7. Where our philosophy differs and what that costs or buys us

Spec Kit has no sandbox, no policy outside the model and no per-task identity because its
design assumes a human approves each of five or six chat turns. That premise is exactly
what our first constraint, security without half measures, rules out for an unattended
factory: we can adopt the shape of its artifacts, not its control mechanism. The cost is
that we do not get its tight small-loop human supervision for free; we still have to build
the equivalent ourselves, the same gap our own design already lists as unfinished,
spec-driven intake. Its fully synchronous UX is the opposite of human involvement as an
escalation rather than a checkpoint; copying that UX would mean giving up the autonomy the
whole factory is built for.

## 8. Red flags and slop assessment

Real and actively used: about 139k stars, 12.5k forks, releases roughly every few days
through 1.0.13 on 2026-09-29, the day of this report. CONTRIBUTING.md documents the team
dogfooding it for its own feature work through an automated assessment workflow. Against
that, GitHub itself calls it an experiment to test the methodology, not a committed
product, and reviewers report breaking CLI changes, an early flag family removed, breaking
scripts and tutorials from before mid-2026 (per web search, not verified against the
changelog here). Independent critique from Scott Logic (2025-11-26, "reinvented
waterfall") and several practitioner posts say the process is too heavy for small tasks
and that the documents are convention, not enforcement, matching what the code shows: a
mandatory hook is still just an instruction the model is asked to follow. No security
incidents found. The shallow clone's log shows one commit and one author, an artifact of
the depth-1 clone, not a real contributor count; not verified beyond that.

## 9. Sources

- Repository clone: README.md, CHANGELOG.md, CONTRIBUTING.md, LICENSE, pyproject.toml, spec-driven.md
- src/specify_cli/ (agents.py, _download_security.py, authentication/, integrations/, workflows/, events/)
- templates/commands/ (specify.md, plan.md, tasks.md, converge.md, taskstoissues.md, clarify.md, analyze.md, checklist.md, constitution.md, implement.md)
- templates/constitution-template.md, templates/spec-template.md, .specify/memory/constitution.md, workflows/speckit/workflow.yml
- local clone log (last commit 2026-09-29, shallow clone, single squash commit)
- https://github.com/github/spec-kit (fetched 2026-09-29): stars, forks, open issues, license
- https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/ (2025-09-02)
- https://codemyspec.com/blog/github-spec-kit-guide, https://wavect.io/blog/github-spec-kit-production-guide/, https://utsabpant.com/blog/spec-driven-development-without-the-hype (accessed via search 2026-09-29)
- Scott Logic, "Putting Spec Kit Through Its Paces: Radical Idea or Reinvented Waterfall?", 2025-11-26 (cited via search, not fetched directly)
