---
name: AI Software Factory (coleam00)
slug: coleam00-ai-software-factory
url: none
repo: https://github.com/coleam00/ai-software-factory
category: factory-orchestrator
license: none
open_source: partial
self_hostable: yes
hosting_model: self-hosted only, single machine, no SaaS or hosted tier offered
company: Cole Medin, solo creator, operating the course community Dynamous AI Mastery. No external funding found. Not verified legal entity or HQ.
maturity: 338 stars, 58 forks, created 2026-09-01, one merged contributor (the author), two open external PRs, 0 tags, 0 releases, default branch last committed 2026-09-16
similarity: 3
axes:
  signals_intake: 1
  control_plane: 1
  sandbox_isolation: 0
  verification: 3
  policy_outside_model: 1
  identity_per_task: 1
  cost_control: 0
  ux: 2
  reseedable_selfhost: 2
steal:
  - Mutation-testing calibration harness (harness/mutations/defects.json plus run.py) that seeds known bugs and measures what fraction of the gate pipeline actually catches them, instead of trusting a single pass or fail run
  - A machine-checked capability contract (pack.json's capabilities map of expected CLI flags per action, read by a doctor self-check) to catch drift between a wrapper and the engine it drives before it fails live
  - The evidence-scrubbing rule from Archon's SDLC pack, stripping credentials from any string before it reaches a command line or a log, written as a tested invariant rather than a hope
  - Airflow-style trigger_rule join semantics (none_failed_min_one_success, all_done) for fan-in after parallel review branches, named and reused rather than reinvented per workflow
  - Per-node output_format JSON-schema contracts paired with an outcome_field used for conditional branching, so every model step returns a typed result the next step consumes
  - The holdout idea, hidden acceptance scenarios the coding agent never sees and that only verification checks, worth adopting even though their own version enforces it by convention only
differs:
  - They run real repository work in a bare git worktree on the operator's own host, under the operator's own long-lived gh session, with full environment passthrough. No sandbox, no per-task credential. Copying this would break our security constraint outright.
  - Nearly every control-plane script the consumer repository ships (dispatch, merge, gate, guard, tripwire, watchdog, state, ledger) is a stub that defers to an externally pinned, unvendored workflow engine, buying almost no first-party code to maintain at the cost of the version drift we found between the two of them
  - No cost or spend ceiling exists anywhere, workable for a single hobbyist repository on the owner's own keys, disqualifying for our hard-capped, multi-tenant budget requirement
ux_verdict: Zero-GUI, agent-mediated setup that is unusually coherent for a text-only flow, but nothing in this repository shows a live view of a run, only terminal output and the eventual pull request.
slop_verdict: Real and actively worked for a one-month-old repository, but thin. Most of what makes it function is an external pinned dependency, not code in this repository, and the two places that name the pinned revision already disagree with each other.
---

# AI Software Factory (coleam00)

## 1. What it is

Cole Medin's `ai-software-factory` is a small Python installer and CLI wrapper. It has no coding-agent logic of its own. It clones a pinned revision of a separate project, Archon, into a target repository and drives Archon's shared "SDLC pack" of YAML workflows through a thin `factory` command. The pitch, in the README, is "a repository that ships without anyone reading the diff: GitHub issues in, merged pull requests out, with the gates that make that defensible." Medin calls this a dark factory, after lights-out manufacturing, and built it after a public proof of concept (`dark-factory-experiment`, building an app called DynaChat) where he says he never wrote or read a line of the application's code.

Archon is the actual engine. It is a TypeScript, Bun-based workflow runner: YAML files describe a DAG of nodes (planning, implementation, review, merge), each node is a shell command, a deterministic script, or an actual model call, with retries, conditional branches and structured output contracts. Archon used to be a completely different product: a Python task-management-and-RAG tool. GitHub issue coleam00/Archon#957 documents a full rewrite around April 2026, with the old codebase preserved on branch `archive/v1-task-management-rag`. The current README confirms this under a "Previous Version" heading.

The README says the setup is "agent-driven": a user pastes a prompt into their own coding assistant, which reads the README, runs the installer, and interviews the user to write `MISSION.md`, `END-TO-END.md` and `HOLDOUT.md`. The repository itself shows this is accurate. What the README does not make as clear is how little of the actual control logic lives in this repository. Reading the code shows that dispatch, merge, gate, guard, tripwire, watchdog, state and ledger are all retired one-line stubs (`return refuse('...')`) that point at Archon's own workflow engine. The factory repository is closer to an installer and a policy-document holder than a control plane.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | A user runs `factory run archon-ship --input target=<issue-url>`, or a cron-style `tick` reads `.factory/schedule.json` and submits one scheduled run. GitHub issues only. No webhook listener, no alert or telemetry intake. | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API. Every task a Forgejo issue. | We lead |
| Control plane | `consumer.py` shells out to a pinned Archon CLI (`bun packages/cli/src/cli.ts`) with `timeout=None` and no retry. State, scheduling and approvals live entirely inside Archon's own SQLite database, a single-node store. The factory repository's own state.py and ledger.py are stubs. | `factoryd` (Go), one Temporal workflow per task, Postgres via CloudNativePG, policy in Git applied by Flux. | We lead |
| Worker plane | A git worktree on the same machine that runs the CLI. The subprocess inherits the full parent environment, including the operator's own `gh` session. No container, no VM, no non-root user, no network policy. | One gVisor pod per task, read-only root filesystem, non-root, default-deny egress. | We lead |
| Verification | A local harness (`agentcheck.py`, `appproc.py`, `ci.py`, `runtime_host.py`) drives the built app over loopback HTTP, plus a mutation-testing suite (`harness/mutations/defects.json`, `run.py`) that seeds known bugs to calibrate the gate. Archon's own `archon-review` workflow runs six parallel specialist review nodes with retries, and deterministic checks (`assert-changed`, a read-back after publish) sit alongside them. | Forgejo Actions on gVisor runners, then policy gates, then a stronger-model review with a strict verdict. | Not comparable, roughly equal ambition |
| Merge and deploy | `merge.py` is a stub. Real merge authority is an external, unvendored `archon-merge-queue` workflow, pinned by commit SHA, that "assesses and merges an authorised batch with gh" per `pack.json`. Deploy is named the same way and was not found in a shallow clone of Archon's current default branch. | Bot `factory-merge` merges after a whitelisted human approval or an `auto` rule for normal-risk, reproduced, strictly-improving changes. Flux stages the rollout and waits fifteen minutes alert-free. | We lead |
| Policy outside the model | `FACTORY_RULES.md` and `WORKFLOW_POLICY.md` are prose files a coding agent reads through `AGENTS.md`. No script parses or enforces them in this repository. Archon's own pack does have code-enforced gates (`assert-changed.ts`, the publish read-back, credential scrubbing before anything becomes evidence). | Capability rules as a YAML file in Git, enforced in gateway code and network policy. A prompt cannot grant a capability. | We lead |
| Identity per task | The operator's own long-lived `gh auth login -s workflow` session, inherited through unfiltered environment passthrough (`execute()` in consumer.py defaults to `env=None`). Archon-core has a separate GitHub App credential broker (`github-auth-bootstrap.ts`) capable of per-repository scoped tokens, but nothing in this repository's own setup path configures or uses it. | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified against cluster OIDC, forwarded as a per-task LiteLLM virtual key. | We lead |
| Artifacts not chat | Archon's nodes exchange structured JSON (`output_format` schemas, an `outcome_field` used for branching), and delivery is a pull request. This part genuinely matches the principle. | `TaskBrief` in, branch plus PR plus event stream out. | Equal |

## 3. Architecture and stack

The factory repository is Python only: `bin/*.py` for install, audit and self-test, `template/factory/*.py` copied into the target repo, and `template/harness/*.py` for local app verification. It has no server, no database migration, no Helm chart and no Dockerfile of its own. Everything that looks like infrastructure is either a systemd timer example (`template/factory/factory-timer.service.example`) or a bash bootstrap script for a bare Ubuntu box (`bin/bootstrap-ubuntu.sh`).

Archon, the engine it depends on, is TypeScript on Bun, organised as a monorepo of packages (`cli`, `core`, `server`, `web`, `isolation`, `forge`, `providers`, `workflows`, among others). State lives in SQLite (`packages/core/src/db`, with a tracked `generate:sqlite-vintages` script), a single-node embedded database, not a distributed store. Isolation for a real GitHub repository ("repo-kind" in Archon's own terms) is always a plain git worktree: `packages/isolation/src/backend-router.ts` is explicitly scoped to folder-kind projects only and throws if called for a repo-kind codebase, meaning the container backend is architecturally unreachable for the one project kind this factory product uses.

Workflows are YAML DAGs under `.archon/workflows/sdlc/`. Reading `ship/archon-ship.yaml`, `implement/archon-implement.yaml` and the first part of `review/archon-review.yaml` shows five node kinds: `include` (compose a sub-workflow), `bash` (inline shell), `script` (deterministic TypeScript run under Bun), `command` (an actual model call with a named role and prompt) and `loop` (repeat a `command` until a named output field is true, capped by `max_iterations`). Nodes declare `depends_on` edges, `when: "$node.output.field == value"` conditions on structured upstream output, an Airflow-style `trigger_rule` (`none_failed_min_one_success`, `all_done`) for join nodes, and `retry: {max_attempts, delay_ms}` per node (two attempts, twenty seconds, on the review-lens nodes). A workflow declares `model: large` or `model: medium`, a tier, not a literal model name. The `archon-review` workflow's own comments name three supported providers: "Claude Code, Codex, and Pi." The product site (archon.diy) confirms Pi is a route to local models, alongside the Claude Code SDK and the Codex SDK. Which literal model sits behind `large` or `medium` by default is not verified from the code read here.

Deployment for both projects is single-machine. `ai-software-factory` is installed by cloning it into the target repository and running `bin/install.py`, which copies a template tree and pins an Archon commit. Archon itself installs with `curl -fsSL https://archon.diy/install | bash` or `bun install` from source. Neither clone contains a Kubernetes manifest, Helm chart or multi-node deployment story in the files read. Scheduling beyond a manual `factory run` is a systemd timer plus a `.factory/schedule.json` tick, not a webhook receiver.

A real and unresolved inconsistency: the README states the pinned Archon revision is `a02b9ab6bc59f4aff6cae8bfca4723b3eadadb28`, while `template/factory/pack.json` actually pins `24796870605b0fd576734b79a8d5c781f2b1c1e1`. An open pull request from the author, #11, titled "README: name the pinned Archon revision (24796870)", exists to fix exactly this at the time of writing. A second, deeper version-drift shows in the workflow names themselves: `pack.json`'s `entries` map names thirteen workflows, including `archon-backlog`, `archon-merge-queue`, `archon-deploy`, `archon-lifecycle`, `archon-discoveries`, `archon-regress`, `archon-verify-runtime` and `archon-verify-runtime-suite`. A shallow clone of Archon's current default branch has only ten directories under `.archon/workflows/sdlc/`, none named to match any of those eight, and three directories (`implement`, `pr`, `upkeep`) that `pack.json` does not reference at all. The consumer repository is tightly coupled, by a single commit SHA, to an upstream that has already reorganised its own workflow layout since that commit.

## 4. UX

There is no dashboard shipped or documented by this repository. Setup and operation are entirely text-mediated: a user pastes a prompt into their own coding assistant inside the target repository, telling it to read the README's "Instructions for the agent" section. That assistant runs `bin/install.py`, which copies the template tree and pins the Archon revision, then interviews the user to write `MISSION.md`, `END-TO-END.md` and `HOLDOUT.md`. The user separately authenticates `gh` with the `workflow` scope. First real work is `factory run archon-ship --input target=<issue-url>`. Counting from a clean repository to a first pull request: paste the setup prompt, let the installer run, answer the wizard's questions, authenticate `gh`, then run the factory command, about five steps, none of them visual.

While a run is in progress, the only visibility documented in this repository is whatever the Archon CLI prints to the terminal (`workflow status`, `workflow get`) and the eventual GitHub pull request. There is no live diff view, no stream of agent reasoning, and no equivalent of our kanban board in anything this repository ships. Approval, when a workflow calls for it, is one of Archon's own CLI verbs (`approve`, `reject`, `respond`), which `consumer.py` passes straight through without any local logic.

Archon's own marketing (archon.diy) claims a broader surface: "Run from CLI, Web UI, Slack, Telegram, GitHub, or Discord." This is a real feature of the engine, and if true it is a genuinely wider trigger surface than our Forgejo-only console. It is not verified whether the factory product's own documented setup path ever exercises the Web UI, Slack or Telegram surfaces. No screenshot of the Web UI was found on the product site's landing or docs pages fetched for this report.

## 5. Security, identity, sandbox, policy, cost

Security and sandboxing. For the one project kind this factory product uses, real GitHub repositories, isolation is a plain git worktree on the same machine that runs the CLI. There is no container, VM or gVisor-equivalent boundary in this path at all. A container backend exists in Archon but only for a different, unrelated "folder-kind" project type, and `backend-router.ts` throws if it is invoked for a repo-kind codebase, so it is structurally unreachable here. Its own `packages/isolation/docker/SECURITY.md` states plainly that on a standard rootful Docker daemon, the fallback overlay mode grants `CAP_SYS_ADMIN`, letting an in-container process remount the read-only project bind read-write and escape the overlay entirely, and that this mode is "NOT a sandbox against a malicious or prompt-injected agent." This document does not apply to the factory product's actual use case, which never reaches a container at all, but it is telling that even the one isolation mode Archon offers elsewhere in the same codebase is documented as insufficient against the exact threat a factory pipeline should assume: an untrusted or misbehaving coding agent.

Identity. The operator's own long-lived `gh` OAuth session, created with `gh auth login -s workflow` and wired into git with `gh auth setup-git`, is the only credential path this repository documents. `consumer.py`'s `execute()` helper defaults to `env=None`, so the Archon subprocess inherits the full parent environment unfiltered, including that session. There is no per-task, short-lived or scoped credential anywhere in this repository. Archon-core separately has a GitHub App bootstrap (`github-auth-bootstrap.ts`) that refuses to start if both an App and a personal access token are configured at once, and that can issue a token scoped to a single `owner/repo` through an internal `/internal/git-credential` endpoint (parsed with a strict `owner/repo` regex that rejects path traversal and null bytes). Whether the factory product itself ever configures or exercises the App path is not verified. Its own README documents only the personal-token path.

Policy. `FACTORY_RULES.md` and `WORKFLOW_POLICY.md` are prose documents a coding agent reads as context through the project's `AGENTS.md`. No script in this repository parses or enforces them. Some genuine code-level gates exist one layer down, inside Archon's SDLC pack: a deterministic `assert-changed` check that a workflow run actually changed files, and a read-back check after a public write (a PR publish) to confirm it landed. These are real, but they belong to the engine, not to anything the factory repository itself owns or can change without also changing its pinned upstream commit.

Cost. No budget, spend ceiling, cost ledger, or rate limit exists anywhere in the files read. A grep across every factory script for "budget", "cost", "spend" and "rate limit" returns nothing. The README's cost section is one paragraph of advice: instrument token use, prefer a medium-tier model for routine work and a large-tier model where reasoning demands it. There is no enforcement mechanism behind that advice.

## 6. What we should take from it

Narrow. The mutation-testing calibration harness (`harness/mutations/defects.json` plus `run.py`) seeds known, exact-match bugs and measures what fraction of the verification pipeline actually catches them, a documented number rather than an assumed one. We have no equivalent: our own weak-spot list names "no benchmark of agent success rate per model tier" but nothing that measures our gates' actual catch rate. A small seeded-defect suite against our reproduction gate and model review, run periodically, would give us the same kind of honest number. The `pack.json` capabilities map, a declared table of expected CLI flags per action checked by a `doctor()` self-test, is a cheap pattern for catching drift between our own `factoryd` and the harness interface it drives, worth a similar self-check at worker startup. The credential-scrubbing rule in Archon's SDLC README, stripping tokens from any string before it becomes a logged artefact, and the `output_format` plus `outcome_field` pattern for typed, branchable model output, are both small, concrete implementation details worth copying into our own Temporal activities regardless of anything else in this project.

Broad. The idea of a workflow engine as a separate, versioned, pinned dependency that many consumer repositories can share, rather than baked into one product, matches our own "harness is replaceable" principle, and the pinning mechanism (a `pack.json` naming an exact upstream commit) is a reasonable way to let a shared engine evolve without breaking every consumer on every commit, in principle. Our own finding that the pin and the engine have already drifted apart is a caution about doing this without a compatibility contract, not an argument against the idea. Multi-channel dispatch (chat, GitHub comment, web) as a first-class product feature, if Archon's own claim holds, is worth a real design conversation: our own console is Forgejo-only today, and a chat-based trigger would reach contributors and stakeholders who never open a kanban board. The holdout concept, hidden acceptance tests the coding agent never sees, is worth adopting on its own merits for our verification plane, even though this project's own implementation only keeps it hidden by filename convention, not by any access control.

## 7. Where our philosophy differs and what that costs or buys us

The biggest difference is the sandbox. This project accepts a bare git worktree on the operator's own machine, with the operator's own long-lived credential inherited unfiltered, as the price of a setup that needs nothing beyond `git`, `gh`, `bun` and `uv` on one box. Matching that would break our "security without half measures" constraint directly. Keeping gVisor pods, a build VM for images, and per-task credentials costs us real operational weight, slower builds and more moving parts, but it buys a story we can actually defend against a malicious or prompt-injected agent, which this project's own security document admits it cannot make even for the one isolation mode it offers elsewhere in the codebase.

The second difference is where the control plane lives. This project reduces its own control-plane code (dispatch, merge, gate, state, ledger) to stubs and puts all real logic, retries and state behind a single pinned external dependency invoked as an opaque subprocess with no timeout. That buys an extremely small amount of first-party code to maintain: nearly every bug is someone else's. It costs opacity and fragility, which we found direct evidence of, a documentation-pinned commit that disagrees with the configuration-pinned commit, and a pinned workflow-name list that no longer matches the upstream engine's current layout. Our choice to own `factoryd` and `factory-gateway` as first-party Go code is more to build, but it keeps task state, budgets and audit under our own versioning, not a third party's unannounced refactor.

The third difference is cost control. This project has none, appropriate for a single person running the factory against their own model keys on their own machine. It would be disqualifying for us: we run a shared, multi-tenant, portfolio-grade system with a hard-cap requirement, so there is nothing here to borrow on this axis.

## 8. Red flags and slop assessment

No licence file exists in this repository. The GitHub API reports `license: null`, and no `LICENSE` file appears in a full clone. Practically, that means no rights beyond viewing the public source are granted by default, a real obstacle for anyone wanting to fork or redistribute it, despite it being openly cloneable. Archon itself is MIT-licensed, confirmed by its own `LICENSE` file.

The pinned-revision inconsistency described in section 3 is a currently open, self-acknowledged issue (PR #11 from the author). The deeper version-drift, thirteen workflow names expected by `pack.json` against ten present and differently named directories in Archon's current default branch, was not opened as an issue by anyone as of this research and is a genuine, presently observable coupling break.

The repository is one month old at the time of writing (created 2026-09-01), with 338 stars, 58 forks, 7 open issues, no tagged releases, and a single merged contributor, the author, alongside two currently open external pull requests. The name overlap and the star count the task brief pointed at belong almost entirely to a different product under the same name. Archon had a complete rewrite around April 2026 (GitHub issue coleam00/Archon#957), from a Python task-management-and-RAG tool to the current TypeScript workflow engine. The overwhelming majority of Archon's roughly 23,600 stars were accumulated by the earlier, different product and carried forward through the name, not earned by the workflow engine or by this factory product. Only 338 stars belong to the actual "issues in, merged pull requests out" product this brief asked about.

One disclosed reliability gap reads as a genuine engineering artefact rather than demoware: the mutation-testing harness's own history records two of ten seeded defects caught only by the unit test suite despite a reported ten-out-of-ten headline score across four verification stages. Publishing that kind of number against yourself is unusual for a promotional README and is a point in the project's favour.

No independent critical commentary was found. Searches for Hacker News or Reddit discussion, and for terms like "grift" or "overhyped" against Cole Medin's name, returned nothing on point. The closest to scepticism found in third-party coverage (agentconn.com, andrew.ooo, both undated blog reviews of Archon found 2026-09-29) is that Archon's "deterministic" claim is aspirational: the same workflow runs the same sequence of steps, but the same prompt will not reliably produce byte-identical code, and that "harness engineering" as a named category is still an open question rather than settled practice. Absence of criticism here most likely reflects the repository's age and low current visibility, not an absence of problems.

## 9. Sources

Repository, read in full (README.md), 2026-09-29: https://github.com/coleam00/ai-software-factory
Repository, README.md first 150 lines, 2026-09-29: https://github.com/coleam00/Archon
Local clone, depth 1, target coleam00-ai-software-factory, path /home/womb/repos/market-research-clones/coleam00-ai-software-factory
Local clone, depth 1, target coleam00-Archon, path /home/womb/repos/market-research-clones/coleam00-Archon
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/README.md
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/factory/pack.json
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/factory/consumer.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/factory/dispatch.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/factory/merge.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/factory/gate.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/factory/fixed_gate.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/factory/guard.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/factory/tripwire.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/factory/watchdog.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/factory/state.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/factory/ledger.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/factory/trigger.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/factory/regress-trigger.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/factory/runtime_host.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/factory/runtime_process.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/factory/runtime.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/factory/runtime_resource.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/harness/agentcheck.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/harness/appproc.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/harness/ci.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/harness/runtime_data.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/harness/mutations/defects.json
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/harness/mutations/run.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/harness/END-TO-END.md
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/.factory/holdout/HOLDOUT.md
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/.factory/locks/floor.json
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/.factory/loop.sh
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/.factory/monitor.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/FACTORY.md
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/FACTORY_RULES.md
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/WORKFLOW_POLICY.md
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/MISSION.md
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/template/factory/MIGRATION.md
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/docs/derivation.md
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/docs/first-hour.md
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/docs/incidents.md
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/docs/migration.md
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/docs/server-cheat-sheet.md
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/.factory/ledger.jsonl
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/bin/install.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/bin/audit.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/bin/bootstrap-ubuntu.sh
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/bin/factory.py
/home/womb/repos/market-research-clones/coleam00-ai-software-factory/bin/selfcheck-mutations.py
Full top-level listing of /home/womb/repos/market-research-clones/coleam00-ai-software-factory, confirming no LICENSE file is present
/home/womb/repos/market-research-clones/coleam00-Archon/README.md
/home/womb/repos/market-research-clones/coleam00-Archon/LICENSE
/home/womb/repos/market-research-clones/coleam00-Archon/.archon/workflows/sdlc/README.md
/home/womb/repos/market-research-clones/coleam00-Archon/.archon/workflows/sdlc/ship/archon-ship.yaml
/home/womb/repos/market-research-clones/coleam00-Archon/.archon/workflows/sdlc/implement/archon-implement.yaml
/home/womb/repos/market-research-clones/coleam00-Archon/.archon/workflows/sdlc/review/archon-review.yaml
Directory listing of /home/womb/repos/market-research-clones/coleam00-Archon/.archon/workflows/sdlc, ten entries versus pack.json's thirteen expected names
/home/womb/repos/market-research-clones/coleam00-Archon/packages/isolation/src/backend-router.ts
/home/womb/repos/market-research-clones/coleam00-Archon/packages/isolation/docker/SECURITY.md
/home/womb/repos/market-research-clones/coleam00-Archon/packages/server/src/github-auth-bootstrap.ts
Top-level package listing of /home/womb/repos/market-research-clones/coleam00-Archon/packages
Local commit timestamp check on both clones' default branch heads, 2026-09-29
GitHub API, repos/coleam00/ai-software-factory (stars, forks, issues, license, created_at, pushed_at), 2026-09-29
GitHub API, repos/coleam00/Archon (stars, forks, license), 2026-09-29
GitHub API, repos/coleam00/ai-software-factory/branches, 2026-09-29
GitHub API, repos/coleam00/ai-software-factory/pulls with state=all, 2026-09-29
GitHub API, repos/coleam00/ai-software-factory/commits, 2026-09-29
GitHub API, repos/coleam00/ai-software-factory/contributors, 2026-09-29
GitHub API, repos/coleam00/ai-software-factory/releases, 2026-09-29
GitHub API, repos/coleam00/ai-software-factory/tags, 2026-09-29
Product site, fetched 2026-09-29: https://archon.diy
Product site docs, fetched 2026-09-29: https://archon.diy/docs/
Web search, 2026-09-29: Cole Medin Archon workflow engine rewrite pivot RAG knowledge base
Web search, 2026-09-29: Cole Medin ai-software-factory coleam00 dark factory
Web search, 2026-09-29: Cole Medin coleam00 criticism reddit hacker news content marketing OR grift OR overhyped
Web search, 2026-09-29: Archon coleam00 Dynamous community reception review
Web search, 2026-09-29: Cole Medin YouTube AI software factory dark factory video
Surfaced via web search, not directly fetched, 2026-09-29: https://github.com/coleam00/Archon/issues/957
Surfaced via web search, not directly fetched, 2026-09-29: https://agentconn.com/blog/archon-open-source-harness-builder-ai-coding-deterministic-review/
Surfaced via web search, not directly fetched, 2026-09-29: https://andrew.ooo/posts/archon-open-source-ai-coding-harness-builder-review/
