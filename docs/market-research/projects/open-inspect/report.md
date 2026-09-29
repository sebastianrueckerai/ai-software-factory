---
name: Open-Inspect
slug: open-inspect
url: https://backgroundagents.dev
repo: https://github.com/ColeMurray/background-agents
category: factory-orchestrator
license: MIT
open_source: yes
self_hostable: yes
hosting_model: self-hosted control plane (Cloudflare Workers, primary) or Docker Compose/AWS container, web client on Vercel, agent sandboxes always run on a third-party vendor API (Modal, Daytona, E2B, Vercel Sandbox or OpenComputer)
company: No company. Solo open-source project by Cole Murray, unfunded, first commit 2026-01-25. The homepage's "Managed Deployment" section is a contact-form services pitch, not a hosted SaaS product
maturity: 3,296 stars, 474 forks, 133 open issues, 51 contributors (Cole Murray holds 1,316 of roughly 1,600 tracked commits, next human contributor has 26), first commit 2026-01-25, last push 2026-09-29, no tagged releases, continuous main-branch shipping documented in a dated changelog with several entries most days and PR numbers past #2100 in eight months
similarity: 3
axes:
  signals_intake: 4
  control_plane: 2
  sandbox_isolation: 2
  verification: 1
  policy_outside_model: 0
  identity_per_task: 2
  cost_control: 2
  ux: 4
  reseedable_selfhost: 2
steal:
  - A ttyd-based live terminal proxy (packages/sandbox-runtime/src/sandbox_runtime/ttyd_proxy) plus a diff library in the Next.js client (@pierre/diffs) close exactly the two gaps our own baseline names as missing, no real-time work stream and no diff view.
  - Filesystem-snapshot resume on most sandbox backends (Modal, Vercel Sandbox and OpenComputer support prebuilt images plus snapshot restore, Daytona and E2B use persistent pause and resume) cuts a follow-up prompt's cold start close to zero, worth adapting for our gVisor pods.
  - The per-session cost cap (packages/control-plane/src/session/budget-service.ts) derives the spend delta from the harness's own cumulative cost report in an idempotent way, a resend adds nothing and a dropped event is repaired by the next, a clean pattern for a live per-task cost readout in our console.
  - Git credentials are brokered per session through an on-demand credential helper (packages/control-plane/src/source-control/github-credential-authority.ts) that mints a short-lived GitHub App installation token, never a static token at rest in the sandbox, validating our own two-per-session Forgejo token pattern.
  - Pull requests are opened with the acting human's own GitHub OAuth token rather than a bot token, specifically so a bot-authored PR can never be self-approved (README security model, docs/AUTH.md). A different mechanism from our branch-protection whitelist for the same goal, worth comparing.
  - The Slack repo classifier (a fast, non-reasoning model fed the message, thread context, channel name and repository descriptions, with an explicit "unknown" fallback that asks the user) is a reusable pattern for the day we take chat-originated tasks.
  - Their Environments concept (a named, ordered set of up to 10 repositories with their own secret scope and optional prebuilt image, snapshotted at session creation so later edits never change an in-flight session) is a clean model for one task that must touch several repositories coherently, which our single-repo TaskBrief does not have.
differs:
  - Every sandbox backend (Modal, Daytona, E2B, Vercel Sandbox, OpenComputer) is a paid third-party vendor API. There is no self-hosted Docker or Kubernetes sandbox option anywhere in the codebase, against our "commodity hardware, no vendor-specific service" constraint. Copying their worker plane means giving up our own Kubernetes and gVisor entirely.
  - The control plane's primary target is Cloudflare Workers, Durable Objects and D1, a vendor-specific serverless platform. The documented AWS fallback (packages/control-plane, docs/CONTROL_PLANE_CONTAINER.md) still leans on SeaweedFS and Litestream to re-implement the same primitives, against our choice to run our own durable execution engine on commodity boxes we fully control.
  - Model-provider credentials are injected directly into the sandbox process environment. packages/sandbox-runtime/src/sandbox_runtime/harness/claude_env.py documents that the bridge inherits the supervisor's full environment, including the platform-delivered ANTHROPIC_API_KEY. The agent's own process holds real key material, the opposite of our principle that the sandbox holds no key material and every model call proxies through a gateway.
  - No capability policy document and no sandbox network egress control were found anywhere in the docs or code. Whatever the agent's sandbox can reach on the open internet is left to the vendor's default network, against our default-deny egress and policy-outside-the-model principles.
  - Merge safety rests entirely on ordinary human GitHub review. The optional "auto-review" (packages/github-bot) posts a comment and is not a required check, and "autofix" (packages/control-plane/src/autofix) only reacts after a human has already commented, so there is no CI gate, policy gate or reproduction check wired into the merge path the way our verification plane wires all three before a human is even asked to approve.
ux_verdict: A fast, multiplayer web app with a live terminal, a diff view and Slack, Chrome-extension and in-sandbox VS Code front doors beats our console's complete absence of real-time streams or diffs today, at the cost of nine required setup steps (fork, cloud credentials, GitHub App, secrets, Terraform deploy, web deploy, verification, owner bootstrap) before the first prompt, against our "open a URL" onboarding.
slop_verdict: Real and actively used, not a landing-page repo. Continuous shipping with a dated changelog, over 2,100 merged PRs in eight months and 3,296 stars, but almost entirely the work of one maintainer (Cole Murray, 1,316 of roughly 1,600 commits) with an explicit "single-tenant only, trusted organisation" security disclaimer, so treat it as one person's production system rather than a hardened multi-tenant product.
---

# Open-Inspect

## 1. What it is

Open-Inspect is an open-source clone of Ramp's internal background coding agent "Inspect", built and maintained almost single-handedly by Cole Murray since January 2026. It is not a company product. The repository is MIT licensed, the homepage (backgroundagents.dev) is a marketing landing page with no pricing and a "Managed Deployment" contact form rather than a self-serve SaaS, and the only commercial angle visible is that services pitch.

The README states its purpose directly: an open-source background agents coding system inspired by Ramp's Inspect. It reproduces the shape Ramp described in its blog post almost feature for feature: a web, Slack, GitHub and Linear front door, a coding agent (opencode or the Claude Agent SDK) running in a disposable cloud sandbox with a full dev environment, filesystem snapshots for fast restart, multiplayer sessions with per-author commit attribution, and a PR opened with the human's own token so a bot can never approve its own work.

What the README claims and what the code shows mostly agree, with one exception worth flagging: the project's own docs/ramp-inspect-agent.md is a verbatim copy of Ramp's blog post, which lists Temporal only as one item in the example dev stack each sandbox provisions (Vite, Postgres, Temporal, the works), not as Ramp's own orchestration engine. Neither Ramp's post nor any file in this repository names Temporal, or any durable-execution engine, as the thing that runs the task lifecycle. Open-Inspect's control plane runs on Cloudflare Durable Objects and D1 instead (see section 3).

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | Six intake paths into one session model: web picker, Slack mentions and DMs (packages/slack-bot), GitHub webhooks for mentions and PR review (packages/github-bot), Linear issue activity (packages/linear-bot), a Sentry alert automation trigger (packages/control-plane/src/webhooks/sentry.ts), a generic authenticated inbound webhook, and cron schedules (docs/AUTOMATIONS.md). | Forgejo webhooks, SigNoz alert webhooks, factoryd intake API. One forge. | They lead on breadth of sources. |
| Control plane | One Durable Object per session holds its own SQLite database (messages, events, artifacts, cost), a shared D1 database holds the session index, repo metadata and encrypted secrets. Scheduling uses Durable Object alarms, not a workflow engine. No capability policy document. | factoryd (Go) with a Temporal workflow per task, Postgres, YAML policy in Git applied by Flux, approvals as a workflow state. | We lead. Their state is durable per session but there is no replayable workflow, no versioned policy and no approval-as-workflow-state gate. |
| Worker plane | Five pluggable vendor sandbox backends (Modal, Daytona, E2B, Vercel Sandbox, OpenComputer) behind a common interface (packages/control-plane/src/sandbox), each a full Debian dev environment with Node, Python, git and a headless browser. Filesystem snapshots or vendor pause/resume restore state on follow-up prompts. | One gVisor pod per task in our own Kubernetes namespace, default-deny egress, read-only root filesystem. | Not comparable in substrate. They lead on multi-vendor engineering and snapshot speed, we lead on owning the isolation boundary and the network policy. |
| Verification | An opt-in "auto-review" session (packages/github-bot) posts a structured PR comment. "Autofix" (packages/control-plane/src/autofix) starts a follow-up session only after a human has already left review feedback. No required CI gate, policy gate or reproduction check blocks a merge. | Forgejo Actions on gVisor runners, policy gates, a reproduction gate, a stronger-model review with a strict verdict, all before a human is asked to approve. | We lead clearly. |
| Merge and deploy | The agent pushes a branch, the control plane opens the PR using the acting human's own GitHub OAuth token, so GitHub's own collaborator permissions gate who can merge. No GitOps deploy loop. | Bot merge only after a whitelisted human approves (or an auto rule for reproduced, strictly-improving changes), Flux deploys, a staged soak with alert watch. | We lead on the deploy half, not really comparable on merge, both solve "no self-approval" but by different mechanisms. |
| Policy outside the model | Not found. A four-role RBAC table (Owner, Administrator, Member, Viewer, docs/AUTH.md) gates which UI features a person can use, but nothing enforces which tools or models an agent process may call once a session starts. | Capability rules are a Git document enforced in factory-gateway code and Cilium network policy. | We lead. |
| Identity per task | Git identity is brokered per session, a credential helper calls back to the control plane for a short-lived GitHub App installation token (github-credential-authority.ts). Sandbox-to-control-plane auth is a static bearer "Sandbox Auth Token" per session. Model-provider API keys and OAuth tokens are injected directly into the sandbox's process environment. | A projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified against the cluster OIDC issuer, no model key ever enters the sandbox. | We lead. Their git-credential brokering is sound, their model-credential handling is the opposite of our principle. |
| Artifacts not chat | The core interaction is an explicitly chat-shaped, multiplayer "session": messages, live token streams, participants, all first-class. | TaskBrief in, a branch, a PR and a normalised event stream out, no chat surface. | Differs in philosophy, not simply better or worse. |

## 3. Architecture and stack

Open-Inspect is a TypeScript and Python monorepo (npm workspaces, packages/*) with no Temporal, no Kubernetes and no durable-execution engine anywhere in the tree, confirmed by grepping the whole repository for "temporal", which matches only the copied Ramp blog post in docs/ramp-inspect-agent.md.

Control plane (packages/control-plane): Cloudflare Workers written against Hono, with better-auth for sessions, zod for validation, and the Cloudflare Workers Durable Object and D1 bindings as the only state store. Directories worth naming: src/session (session lifecycle, budget-service.ts, usage-repository.ts, alarm/), src/sandbox (provider-agnostic lifecycle plus src/sandbox/providers/{modal,daytona,e2b}-*.ts), src/source-control (a SourceControlProvider abstraction, GitHub only in production per docs/adr/0001-single-provider-scm-boundaries.md, Bitbucket stubbed to fail fast), src/webhooks (github.ts, slack.ts, sentry.ts, automation-webhook.ts), src/autofix, src/model-provider-accounts (OAuth device-flow accounts for a connected Claude, ChatGPT or Grok subscription, alongside plain API keys), and src/db for the D1 schema. The same application code also runs as one Node process on a container (docs/CONTROL_PLANE_CONTAINER.md): SQLite files on a volume replace Durable Objects and D1, SeaweedFS (an S3-compatible store) replaces R2, and Litestream replicates the SQLite files to a backup bucket every second. docker-compose.yml, docker-compose.aws.yml and docker-compose.smoke.yml drive this path, and it is how the project's own AWS deployment (docs/AWS_BRING_UP.md) runs.

Sandbox runtime (packages/sandbox-runtime, Python 3.12): a supervisor process that owns the harness and a bridge that streams events to the control plane, matching the diagram in docs/HOW_IT_WORKS.md. Two harnesses exist: OpencodeHarness (harness/opencode.py) drives opencode serve over HTTP and SSE, exactly the headless server pattern our own target-architecture.md names for its opencode adapter, and a Claude Agent SDK path (harness/claude.py, claude_tools.py, claude_env.py) for a connected Claude subscription. claude_env.py is worth reading directly: it generates a wrapper binary that strips whichever credential family (API key or OAuth token) does not belong to the active auth mode before every invocation, because the bridge inherits the supervisor's full environment, including the platform-delivered ANTHROPIC_API_KEY. Tools available to the agent (sandbox_runtime/tools/) include spawn-child.js and get-child-status.js for sub-sessions, and slack-notify.js. A ttyd_proxy directory gives the web client a live terminal.

Web client (packages/web): Next.js 16, React 19, Radix UI primitives, TanStack virtual, recharts for the analytics dashboard, and @pierre/diffs for the pull-request-style diff view. Deployed on Vercel, not part of the container stack.

Intake bots: packages/slack-bot, packages/github-bot and packages/linear-bot are each stateless Cloudflare Workers that translate a webhook into a control-plane session-create call, then get out of the way, per packages/github-bot/README.md: the agent in the sandbox handles all GitHub interaction directly using the gh CLI. packages/modal-infra, daytona-infra, e2b-infra, opencomputer-infra and vercel-infra hold the Terraform and image-build tooling for each sandbox vendor. terraform/ (with a d1/ and environments/ subtree) drives the primary Cloudflare deployment described across the nine required steps of docs/GETTING_STARTED.md.

## 4. UX

Onboarding to a self-hosted instance is nine required steps (docs/GETTING_STARTED.md): fork the repository, create cloud provider credentials, create a GitHub App, generate three encryption keys, configure and apply Terraform, deploy the web app to Vercel, verify the deployment, then bootstrap the workspace owner. Slack, Linear, GitHub-bot, a custom domain and CI/CD are separate optional sections after that. This is a maintainer's setup, not a sign-up-and-go product, and it needs a Cloudflare or AWS account plus at least one paid sandbox vendor account before a single session can run.

Once running, the web UI (docs/images/ui-overview.png) opens on a prompt box (What do you want to build?) with an inline repository and branch picker, a model and reasoning-level selector, and a skills selector. The left sidebar groups sessions under Needs attention and Recent, each tagged with its repository and elapsed time, alongside top-level Automations and Analytics links. A user watches a session through real-time WebSocket streaming (the Cloudflare Agents SDK over WebSocket Hibernation), a diff view, and a live terminal via ttyd. Intervention is multiplayer: anyone with session access can send a prompt, attributed to them individually in the eventual commit, or stop execution mid-run (execution-stop-coordinator.ts). A per-session cost cap pauses or stops a session automatically when exceeded, broadcasting a budget_status event the UI can show live. There is no approval step inside Open-Inspect itself, review and merge happen as an ordinary GitHub pull request, outside the product entirely.

Compared with our console: their diff view, live terminal and real-time event stream are things our baseline explicitly lists as missing, and Open-Inspect has all three shipped, plus a Slack bot, a Chrome extension and an in-sandbox VS Code (code_server.py) as additional front doors. What is worse than our design: there is no approval-as-workflow-state concept, nothing waits for a human inside their system, and getting a working instance at all requires a GitHub App, a Cloudflare or AWS account, and a paid sandbox vendor account before the first prompt.

## 5. Security, identity, sandbox, policy, cost

Identity. Git operations are brokered: a shared GitHub App installation token is minted server-side and handed to the sandbox's git credential helper on demand (github-credential-authority.ts), and PRs are opened with the acting human's own GitHub OAuth token specifically so a bot-authored PR cannot be self-approved. Sandbox-to-control-plane calls use a single bearer Sandbox Auth Token per session, a simpler mechanism than an OIDC-verified, kubelet-rotated token. Model-provider credentials, by contrast, are not brokered at all: docs/SECRETS.md documents ANTHROPIC_API_KEY, DEEPSEEK_API_KEY, ZHIPU_API_KEY and OPENCODE_API_KEY as secrets injected as plain environment variables into the sandbox, and claude_env.py confirms the agent's own process inherits them.

Sandbox. Isolation is delegated entirely to whichever vendor backend is configured (Modal, Daytona, E2B, Vercel Sandbox, OpenComputer). We found no mention of network egress control, an allowlist, or default-deny policy for a sandbox's outbound traffic anywhere in the docs or code, only unrelated references to AWS NAT gateway cost for the control plane's own container deployment (docs/AWS_BRING_UP.md). A sandbox that can reach the internet and holds a live model API key is a materially wider exposure than a sandbox that can reach only a gateway.

Policy. No capability document exists. The four workspace roles (Owner, Administrator, Member, Viewer, docs/AUTH.md) gate UI-level actions such as who may create a session or manage secrets, not what tools or models a running agent process may call. There is no equivalent of our gateway that rejects a model or tool a task's class does not allow.

Cost. A real, working mechanism exists: max_cost_usd on a session, enforced by SessionBudgetService (session/budget-service.ts), which accumulates cost from the harness's own self-reported cumulative figure per turn and stops or pauses execution once the cap is hit, broadcasting a warning first. This is genuine but trusts the harness process's own arithmetic rather than metering spend at a boundary the agent cannot influence, and it is scoped per session only, we found no per-project or per-day envelope, and no pre-call price hold. A 2026-09-28 changelog entry notes ChatGPT-subscription sessions now show an API-price equivalent cost estimate in this same display, not a real invoice figure.

## 6. What we should take from it

Narrow. The ttyd live-terminal proxy and the @pierre/diffs component in the web client are concrete, small pieces that would close our console's named gaps (no real-time stream, no diff view) without redesigning anything else. The idempotent cost-accounting pattern in budget-service.ts, take the maximum of what has already been recorded rather than summing raw deltas, is a robust way to make a live per-task cost readout resilient to duplicate or dropped events, and would slot into our console's cost view regardless of where the actual spend hold lives. The reserved-secret-key list and per-scope byte-budget check in docs/SECRETS.md is a small, clean piece of input validation worth copying wholesale into any secrets UI we build.

Broad. The environments concept, a named, ordered set of up to 10 repositories with their own secret scope, snapshotted at session creation, is a genuine gap in our own single-repository TaskBrief model, worth considering the day a task needs to touch a frontend and its API together. The pattern of opening a PR with the acting human's actual token, rather than a bot token, so the forge's own permission model prevents self-approval, is a materially simpler mechanism than our branch-protection whitelist for the same guarantee, and worth a design discussion even if we keep our own approach. The Slack repo-classifier (a small, fast, non-reasoning model with an explicit I don't know fallback) is the shape any chat-originated intake we build should copy.

## 7. Where our philosophy differs and what that costs or buys us

Their entire worker plane is built on paid vendor sandbox APIs, and their control plane's primary target is a vendor-specific serverless platform. This buys them genuinely fast, well-engineered snapshot and pause/resume mechanics across five backends with very little of their own infrastructure code, at the direct cost of our commodity-hardware, no-vendor-specific-service constraint. We could not adopt their worker or control plane without abandoning that constraint entirely, this is not a narrow difference, it is a different bet about who owns the substrate.

Injecting model-provider credentials straight into the sandbox process is simpler to build and debug than our gateway-proxied model calls, and it is the reason their harness code needs a credential-stripping wrapper (claude_env.py) instead of never holding the credential at all. Our principle costs more upfront (an identity proxy, a gateway, per-task virtual keys) and buys a sandbox that leaks nothing if compromised, since it never had a real key.

The absence of any documented sandbox egress control is the sharpest gap. If accurate, a compromised or careless tool call inside an Open-Inspect sandbox can reach the open internet carrying a live Anthropic, OpenAI or xAI key, something our default-deny Cilium policy makes structurally impossible regardless of what runs inside the pod. This is not a resourcing difference we could close with a quick patch to their codebase, it is a consequence of choosing hosted vendor sandboxes that do not expose a network-policy primitive to the application.

## 8. Red flags and slop assessment

The project is real and actively shipping: a dated changelog with several entries on most days, PR numbers past 2,100 within eight months, 3,296 stars and 474 forks. It is not a marketing shell.

It is also almost entirely the work of one person. Of roughly 1,600 tracked commits, Cole Murray holds 1,316, the next human contributor has 26. That concentration is a bus-factor risk for anyone depending on it, independent of code quality.

The README's own security model section is an unusually direct disclosure for an open-source project: this system is designed for single-tenant deployment only, a shared GitHub App installation means any admitted user can reach any repository the app can reach, and there is no per-user repository access validation. This is honest framing rather than a red flag by itself, but it means the project is not safe to deploy across untrusted tenants without the multi-tenant work the README itself says is missing.

We found no licence changes, no open-core split, and no gating of features behind a paid tier, the whole tree is MIT. The homepage's Managed Deployment contact form is the only visible monetisation, a services pitch rather than a SaaS or enterprise edition, so there is no vendor lock-in risk from Open-Inspect itself, only from the sandbox and cloud vendors a deployment necessarily depends on.

## 9. Sources

https://builders.ramp.com/post/why-we-built-our-background-agent (fetched 2026-09-29)
https://backgroundagents.dev (fetched 2026-09-29)
https://github.com/ColeMurray/background-agents (gh api, fetched 2026-09-29)
~/repos/market-research-clones/open-inspect/README.md
~/repos/market-research-clones/open-inspect/CONTRIBUTING.md
~/repos/market-research-clones/open-inspect/LICENSE
~/repos/market-research-clones/open-inspect/CHANGELOG.md
~/repos/market-research-clones/open-inspect/docs/HOW_IT_WORKS.md
~/repos/market-research-clones/open-inspect/docs/GETTING_STARTED.md
~/repos/market-research-clones/open-inspect/docs/AUTH.md
~/repos/market-research-clones/open-inspect/docs/SECRETS.md
~/repos/market-research-clones/open-inspect/docs/AUTOMATIONS.md
~/repos/market-research-clones/open-inspect/docs/CONTROL_PLANE_CONTAINER.md
~/repos/market-research-clones/open-inspect/docs/AWS_BRING_UP.md
~/repos/market-research-clones/open-inspect/docs/ramp-inspect-agent.md
~/repos/market-research-clones/open-inspect/docs/adr/0001-single-provider-scm-boundaries.md
~/repos/market-research-clones/open-inspect/docs/images/ui-overview.png
~/repos/market-research-clones/open-inspect/packages/control-plane/src/session/budget-service.ts
~/repos/market-research-clones/open-inspect/packages/control-plane/src/session/http/handlers/session-budget.handler.ts
~/repos/market-research-clones/open-inspect/packages/control-plane/src/source-control/github-credential-authority.ts
~/repos/market-research-clones/open-inspect/packages/control-plane/src/webhooks/sentry.ts
~/repos/market-research-clones/open-inspect/packages/control-plane/src/autofix/service.ts
~/repos/market-research-clones/open-inspect/packages/control-plane/src/model-provider-accounts/service.ts
~/repos/market-research-clones/open-inspect/packages/control-plane/package.json
~/repos/market-research-clones/open-inspect/packages/web/package.json
~/repos/market-research-clones/open-inspect/packages/github-bot/README.md
~/repos/market-research-clones/open-inspect/packages/sandbox-runtime/src/sandbox_runtime/harness/opencode.py
~/repos/market-research-clones/open-inspect/packages/sandbox-runtime/src/sandbox_runtime/harness/claude_env.py
~/repos/market-research-clones/open-inspect/packages/sandbox-runtime/src/sandbox_runtime/tools/ (directory listing)
~/repos/market-research-clones/open-inspect/packages/linear-bot/ (directory listing)
~/repos/market-research-clones/open-inspect top-level layout (find -maxdepth 2)
git log -1 --format='%ci' on the clone
