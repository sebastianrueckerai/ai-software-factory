# Our design in one page (the comparison baseline)

Every project report in this folder compares the project against this page. The full target design is [target-architecture.md](../target-architecture.md). Read that file when you need more depth. The requirements are in [goal.md](../goal.md).

## What we build

A largely autonomous software factory. Agents turn specifications, issues and telemetry into tested, reviewed and deployed software changes. Human involvement is a tool call the agents raise as seldom as possible. An approval is a workflow state, not a meeting. The project also exists as a portfolio piece: it must show that a lone developer can run an enterprise-grade agentic setup.

## Four constraints

1. **Re-seedable.** Delete everything, rebuild from Git, S3 and one small offline seed bundle. The last rebuild took about 21 minutes.
2. **Commodity hardware.** Three rented cloud servers (Hetzner cpx42, about 210 EUR per month in total) plus S3-compatible object storage. No vendor-specific service anywhere.
3. **Best-of-breed open source.** Known tools over obscure ones, each with an escape hatch if its maintainers gate needed features behind an enterprise tier.
4. **Security without half measures.** Agents get capabilities, never raw credentials. Spending has hard caps. Everything runs in sandboxes with default-deny network.

## Five planes in a loop

| Plane | What it does | What we run |
|---|---|---|
| Signals | Work comes in: issues, PR comments, alerts on telemetry, agent escalations | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API. Every task is a Forgejo issue |
| Control plane | Task registry, capability policy, budgets, approvals, model tier choice, cost ledger, audit trail | `factoryd` (Go) with a Temporal workflow per task, Postgres (CloudNativePG), policy as a YAML file in Git applied by Flux |
| Worker plane | One disposable agent per task in one sandbox | One Kubernetes namespace, ServiceAccount and gVisor pod per task. Harness today: opencode headless, behind a Go `Harness` interface (Codex CLI is the named successor). Read-only root FS, non-root, default-deny egress (gateway, git, Go module proxy, telemetry collector only) |
| Verification | Evidence ranked by strength, cheap and deterministic first | Forgejo Actions on one-job untrusted gVisor runners, then policy gates in the workflow (path risk classes, migration flag, reproduction gate at base and head), then a stronger-model review with a strict verdict |
| Merge and deploy | Ordinary PR merge, GitOps deploy, telemetry back into signals | Merge by bot `factory-merge` only after a whitelisted human approved (or `auto` rule for normal-risk, reproduced, strictly-improving changes). Flux deploys. Project workflow rolls staging, waits 15 minutes without alert, rolls prod |

## Three principles

- **Policy lives outside the model.** Capability rules are a document in Git, versioned in the database, enforced in gateway code and network policy. A prompt cannot grant a capability.
- **Identity belongs to the task, not the machine.** A projected, audience-scoped, kubelet-rotated ServiceAccount token per task. The `factory-gateway` verifies it against the cluster OIDC issuer, maps it to the task row, checks capability, budget and approval state, then forwards to LiteLLM under a per-task virtual key or proxies the MCP tool call. The sandbox holds no key material. Git is the one exception: two per-session Forgejo tokens (read upstream, write to the agent's fork) that only the worker process uses before the agent starts and after it is killed.
- **Agents exchange artifacts, not chat.** Git is the coordination mechanism. `TaskBrief` (objective, repo, commit, issue context, findings from earlier sessions) goes in, a branch, a PR and a normalised event stream come out.

## Control mechanisms worth comparing against

- **Budgets.** The gateway prices each call's worst case, clamps output length to the free headroom, takes a hold under a database lock, books the real cost afterwards. Per task, per day, per project envelope. Agents may commission cloud servers through gateway tools within a per-project envelope, with leases and a garbage collector.
- **Supervision.** Cheap detectors in the event stream (stall, repeated failing command, file flip-flop, edits without diff growth, half of time or budget used) call a stronger `supervisor` model, which answers continue, redirect, retry on a stronger model, or escalate. At most three calls per session. A human can grant more time, the supervisor never can.
- **Gate supervision.** Every workflow step has a time bound in the policy. A step past its bound raises an alert. A supervisor reads the step's state and answers wait, retry, cancel or escalate.
- **Alerts with verdicts.** Every alert the factory raises about itself gets a verdict, real or noise, so bounds can be tuned from data.
- **Model tiers.** `coding-cheap` (DeepSeek, Qwen) first, `coding-frontier` (GLM) on retry, `review-frontier` for the model review, `supervisor` for the strongest. Anthropic and OpenAI are absent on purpose at the start.
- **Trust boundaries.** Anyone may file a bug. Only people with write access steer a running task. An outside account's text reaches the agent and the reviewer marked as untrusted information. Bot events and edited comments never count.
- **Console.** Server-rendered Go with htmx. A kanban board of agent tasks (queued, running, waiting on a human, in review, done, failed), a human lane (approvals, escalations, own tasks), a cost view per project and task, a projects view, an alerts view. Login through Forgejo OAuth2. Actions go to Forgejo under the human's own token, so Forgejo records the human as the author.
- **Projects.** A project is a repository the factory works on. The factory's own repositories are projects too. Registration creates a Forgejo organisation, CI user, tokens, webhook, branch protection, deploy key, per-environment namespaces with quota and default-deny, Flux Kustomizations under a namespaced account.
- **CI.** No Kubernetes mode in the Forgejo runner, so factoryd starts one gVisor runner pod per job. Image builds run on a throwaway Hetzner build VM (about 0.01 EUR per build, 38 seconds to ready) because no rootless BuildKit works under gVisor.

## Stack in one line

Hetzner Cloud, Talos Linux, Cilium (kube-proxy-free, Gateway API, network policy), OpenTofu, Flux, CloudNativePG, Temporal, OpenBao, LiteLLM, SigNoz, cert-manager, Forgejo (git, issues, Actions, registry), gVisor, opencode. Own code: one Go module, two binaries (`factoryd`, `factory-gateway`), an agent worker image, a htmx console.

## Where we know we are weak or unfinished

Use this list to look for what others do better.

- The console is functional, not designed. No onboarding, no real-time streams of the agent's work, no diff view, no mobile view.
- Only one capability class (`coder`). Analyzer, integration tester and release agent classes are planned.
- Spec-driven intake does not exist yet: tasks come from issues, not from specifications with acceptance criteria.
- Session records exist but there is no replay or trace UI. SigNoz holds traces, the console does not show them per task.
- Model choice is a fixed ladder, not learned from outcomes.
- Memory across tasks is limited to findings passed to the next session of the same task. No project memory, no codebase index.
- gVisor on systrap is slow for builds. MicroVMs need bare metal.
- One forge only (Forgejo). No GitHub or GitLab intake.
- Evaluation: no benchmark of agent success rate per model tier, no regression suite for the harness prompt.
