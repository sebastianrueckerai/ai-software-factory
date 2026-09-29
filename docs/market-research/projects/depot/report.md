---
name: Depot
slug: depot
url: https://depot.dev
repo: https://github.com/depot/cli
category: ci-build
license: "mixed: MIT (depot/cli, depot/docs), proprietary (the hosted build, CI and sandbox service)"
open_source: partial
self_hostable: partial
hosting_model: SaaS on AWS (US or EU region), Business tier can deploy the data plane into the customer's own AWS account ("Depot Managed"), control plane always stays with Depot
company: Depot (Depot Technologies Inc), founded Jan 2022 by Kyle Galbraith and Jacob Gillespie, Y Combinator W23, about 14.6 to 16M USD raised (4.1M seed Aug 2024, 10M Series A Mar 2026 led by Felicis), remote team, headcount estimates range 20 to 60 depending on source
maturity: core build/CI/sandbox service is closed source; depot/cli (MIT) has 207 stars, 21 forks, 1747 commits on main, last commit 2026-09-28; public launch Jul 2022, near-daily changelog entries through Sep 2026
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 3
  verification: 1
  policy_outside_model: 1
  identity_per_task: 2
  cost_control: 2
  ux: 3
  reseedable_selfhost: 1
steal:
  - "Ephemeral builder, persistent cache split: the builder VM is thrown away after every build, but the project's layer cache lives on its own volume (formerly EBS, then Ceph, now NVMe-oF from dedicated storage hosts on Depot Metal) and is reattached to whichever fresh builder picks up the next job. Our build VM currently starts cold every time; the pattern of a stateless throwaway compute layer over a stateful cache layer is directly reusable even though our trust model forces the cache to stay read-only for agent branches (see differs)."
  - "Per-build mTLS: the CLI gets a certificate scoped to one build, issued when a builder machine is assigned, expired when the build ends, and the control plane never hands out a longer-lived credential for build traffic. A clean small pattern for factoryd's build-VM channel, which already does no better than this."
  - "OIDC token exchange for CI identity: GitHub Actions, CircleCI and Buildkite jobs exchange their platform's own OIDC token for a short-lived, project-scoped Depot token instead of holding a standing API key. Worth comparing against how factory-ci's Forgejo account token is scoped, since Depot's version needs no stored secret in the CI system at all."
  - "Session resume, fork and share for agent sandboxes: exiting a Claude Code session persists the filesystem and the full conversation; --resume continues it, --resume --fork-session branches a new session off an old one, and the dashboard lets a teammate open and resume someone else's session. Our own vision document already names session replay and a trace UI as unfinished; this is a concrete shape for that feature, not just an idea."
  - "Depot Metal's stated reason for going to bare metal: running the hypervisor directly on the host lets Depot move its own monitoring and orchestration agents outside the job's microVM, shrinking what runs inside the isolation boundary and improving security incidentally. If we ever justify bare-metal nodes for microVMs (our own doc already names Kata or Firecracker as the road once build volume justifies it), this is the argument to make for going straight to a thin hypervisor rather than nesting under a cloud provider's own one."
differs:
  - "Depot draws its trust line at fork PR versus same-repository PR: same-project builds share a writable cache and full builder access, and only fork PRs get an isolated, cache-less builder. Every one of our builds is agent-authored code from an untrusted branch by definition, so we could never adopt Depot's default; we would always be in their fork-PR case. This does not change our design, it confirms why our own build cache is already read-only for everything except trusted main."
  - "Depot's coding-agent sandbox hands each session a standing org-level secret (CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY, plus GIT_CREDENTIALS for non-GitHub remotes) that sits inside the sandbox for the life of the session and is reused across sessions. That is the exact standing-credential shape our identity belongs to the task, not the machine principle exists to remove; adopting Depot's sandbox for our own agent execution would put a long-lived model key and a long-lived git credential inside every worker."
  - "Depot's control plane (billing, scheduling metadata, secret storage, session state) is closed source and stays with Depot even on the Business self-host tier, which only relocates compute into the customer's AWS account. Taking a dependency on Depot for build or sandbox infrastructure would put a piece of our loop permanently outside the re-seed-from-Git-and-S3 boundary, unlike our own OpenTofu-provisioned, throwaway build VM."
ux_verdict: depot claude to a running sandbox with a shareable, resumable session is fewer steps and a better persistence story than our console offers today, but sessions are async-only with no live interactive control and no diff or approval view, so it is a better session log than an agent cockpit.
slop_verdict: the company and its CI/build product are real and funded (YC W23, a 2026 Series A, named customers running real volume such as PostHog and Astral), but the headline "Claude Code sandbox" feature is young (launched Aug 2025), the docs never name the isolation technology, and competitor write-ups (Northflank, Blaxel, so read with that bias in mind) describe the original release as plain containers, not microVMs, a gap Depot's own July 2026 Depot Metal post appears to close without saying so explicitly.
---

# Depot

## 1. What it is

Depot (depot.dev) is a Y Combinator-backed infrastructure company, founded January 2022 by Kyle Galbraith and Jacob Gillespie, selling a hosted "software delivery" stack: faster container image builds, a CI engine, GitHub Actions runners, a container registry, Git hosting (Depot Code, private beta), and, most relevant here, remote sandboxes for coding agents with a dedicated Claude Code quickstart. The pitch on the homepage is speed (container builds "40x faster", CI "10x faster") through dedicated, cached, native-architecture compute instead of shared, cold GitHub-hosted runners.

The company's own claim is that this is one platform ("Software delivery built for machine scale") covering builds, CI, registry, source control and agent sandboxes. What the docs actually show is narrower: six largely independent products behind one CLI and one dashboard, billed on one usage-based plan. The flagship claims (40x builds, 10x CI) are customer testimonials and marketing copy, not benchmarked in the docs; the docs page for agent sandboxes never names an isolation technology at all, which is unusual for a company that leads its marketing with security badges (SOC 2 Type II, audit logging, SSO).

## 2. Mapping to our five planes

| Plane / principle | What Depot does | What we do | Verdict |
|---|---|---|---|
| Signals | None. Depot reacts to a CLI invocation, a GitHub Actions webhook, or a dashboard click, not to issues, alerts or telemetry | Forgejo webhooks, SigNoz alerts, factoryd intake API, every task a Forgejo issue | not comparable |
| Control plane | A dashboard tracks builds, CI runs and sandbox sessions per project; org/project scoping and plan quotas, no task registry, no approvals, no audit trail beyond build and session logs | factoryd, Temporal workflow per task, Postgres, policy in Git, approvals, cost ledger | we lead |
| Worker plane | An agent sandbox is an isolated container (moving to a bare-metal microVM on "Depot Metal"), 2 vCPU / 4 GB default, filesystem and conversation persisted across sessions, no documented egress control | One gVisor pod per task, read-only rootfs, default-deny egress, projected ServiceAccount token | we lead on documented isolation and network policy; not comparable on persistence, which we do not offer |
| Verification | Depot CI runs your own test suite faster on dedicated compute; it is infrastructure other tools' checks run on, not a gate or a reviewer itself | Forgejo Actions, policy gates, stronger-model review before merge | we lead |
| Merge and deploy | None. Push and pull-request creation happen through a GitHub App or a stored credential, nothing decides whether to merge | Bot merge after approval, Flux GitOps, staged rollout | we lead |
| Policy outside the model | Dashboard RBAC for humans, org secrets scoped to org or repository; nothing evaluates what an agent may call or reach | Capability YAML in Git, enforced in gateway code and network policy | we lead |
| Identity per task | Per-build mTLS certificate, OIDC-exchanged short-lived tokens for CI identity; agent sandbox sessions instead reuse a standing org secret (model key, git credential) for the session's life | Per-task projected, audience-scoped ServiceAccount token, no key material in the sandbox | they lead on the build path, we lead on the agent-sandbox path |
| Artifacts not chat | A session's git branch and the conversation transcript are the artifacts; the transcript itself is treated as a resumable, shareable object | TaskBrief in, branch and PR out | equal at the plumbing level |

## 3. Architecture and stack

The open parts are two MIT repositories: depot/cli (Go, 1747 commits, "Official CLI for Depot", builds Docker images against Depot's remote builder infrastructure, also does bake, compose, cache and registry management) and depot/docs (the documentation site itself, contributions welcome). Everything that actually does the work is closed: a control plane API, an open-source-named but not published cloud-agent that launches builder machines, and a machine-agent that runs inside each builder VM to start BuildKit. The container-build path is: CLI asks the API for a machine of a given org, project and architecture; cloud-agent launches an ephemeral EC2 instance (moving to bare-metal "Depot Metal" hosts); machine-agent inside it registers and starts an optimised BuildKit; the CLI connects directly to that builder over mTLS. Layer cache is a separate, persistent volume per project (originally EBS, then Ceph, now NVMe-oF from dedicated storage servers), reattached to whichever new builder picks up the next build, so compute is stateless and cache is not.

Agent sandboxes (depot claude) are a separate, much less documented system: a control plane provisions "an isolated container" per session, clones the given repository and branch, runs Claude Code non-interactively against a supplied prompt, and persists the filesystem and conversation on exit. A July 2026 blog post ("Announcing Depot Metal") states that Depot CI and Depot Sandboxes already run on bare-metal AWS EC2 hosts with a hypervisor Depot controls directly, giving "microVMs" and sub-second startup; it does not name Firecracker, Kata or any other specific technology. Two competitor blog posts (Northflank, Blaxel, both selling rival sandbox products, so read with that conflict of interest in mind) describe the original August 2025 release as plain isolated containers rather than hardware-backed VMs, which matches the original launch post's own wording ("its own isolated container") and suggests the microVM move is a 2026 change the docs have not caught up to describing.

## 4. UX

Zero to a running agent: install the CLI (brew or a shell script), add one Anthropic credential as a Depot org secret (CLAUDE_CODE_OAUTH_TOKEN from claude setup-token, or an API key), optionally connect the Depot Code GitHub App or add a GIT_CREDENTIALS secret for push access, then run depot claude --repository <url> --branch main "<prompt>". That is four steps to a first session, comparable to our own console-plus-Forgejo-issue path. The CLI returns immediately with a session ID and a dashboard URL; there is no synchronous output in the terminal, sessions are async by the product's own description and not suited to interactive back-and-forth. The dashboard lists sessions, shows conversation and execution history, and lets a user resume a session by typing a new prompt, share a session's URL with a teammate, or start a fresh sandbox from a repo and a prompt. There is no diff view, no explicit approve or reject action, and no documented way to watch commands execute live rather than after the fact; watching an agent means refreshing a transcript, not seeing a terminal or a diff stream.

## 5. Security, identity, sandbox, policy, cost

Identity: build traffic uses a per-build mTLS certificate that expires with the build, and CI systems (GitHub Actions, CircleCI, Buildkite) can exchange their own OIDC token for a short-lived, project-scoped Depot token instead of holding a static key. Agent sandbox sessions instead run on standing org secrets: a Claude Code OAuth token or Anthropic API key, and a git credential, both injected once and reused by every session in the org until rotated by a human.

Sandbox: builder VMs are ephemeral and never shared across organisations or projects; fork pull requests in open-source repos additionally get a cache-less, isolated builder, which is the one place Depot documents a deliberate trust boundary. Agent sandboxes are "isolated containers", moving to bare-metal microVMs per the Depot Metal post, but the docs give no egress policy, no resource limit beyond the 2 vCPU / 4 GB default, and no statement of what a compromised sandbox could reach on the network.

Policy: dashboard RBAC for humans (who can create secrets, who can see a project) and repository-scoped secret access. Nothing evaluates what an agent may call or where a build may send data; Depot's own security docs say plainly that build access "effectively equates to access to the builder VM" and that customers are responsible for trusting whoever they grant it to.

Cost: pure usage-based metering, not a spend cap. Agent sandboxes bill at 0.01 USD per minute, tracked by the second, with plan quotas (Developer 20 USD/month, Startup 200 USD/month, Business custom) and per-unit overage rates for builds, CI vCPU-seconds, Actions minutes and storage. Nothing in the docs describes a per-session time bound or an automatic kill switch beyond the agent exiting on its own; a stuck session appears to keep billing until stopped.

## 6. What we should take from it

Narrow: the ephemeral-builder-over-persistent-cache split (stateless compute, stateful cache volume reattached on demand) is a pattern worth comparing against our own build VM, which currently starts cold every time; even though our trust model keeps agent-branch builds cache-read-only, the mechanics of a fast-reattaching cache volume are reusable for the trusted main-branch build path. The per-build mTLS certificate and the CI-side OIDC-token-exchange pattern are both small, concrete answers to "how does a short-lived job get a credential without us storing one", worth checking factory-ci's own token handling against.

Broad: the session resume, fork and share model for agent sandboxes is a direct, working answer to a gap our own vision document names as unfinished, session replay and a trace UI, and worth looking at closely when the console gets real design time, specifically the fork-a-new-session-from-an-old-one idea, which nothing in our current design offers. The Depot Metal reasoning (bare metal lets you run the hypervisor directly and move host-side orchestration and observability entirely outside the job's isolation boundary) is a specific, usable argument for how to design the microVM step our own docs already name as the eventual answer once build volume justifies bare-metal nodes.

## 7. Where our philosophy differs and what that costs or buys us

Depot's cache-sharing trust boundary is fork PR versus same-repository PR; same-project builds default to a shared, writable cache and full builder access, and only external forks are isolated. Every build we run is agent-authored code from an untrusted branch, so we are always in Depot's fork-PR case by definition. Copying Depot's default (a writable, shared cache for trusted-looking builds) would be wrong for us; our existing choice, a cache only trusted main writes and pull request or agent builds only read, is the correct generalisation of Depot's own narrower rule, and this comparison is a confirmation rather than a change.

Depot's agent-sandbox credential model, one standing org secret per model account and one per git remote, reused across sessions, is the opposite of identity belongs to the task, not the machine. If we ever used Depot-style sandboxes to run our own agents, we would be putting a long-lived Anthropic key and a long-lived git credential inside every worker, which is exactly the blast radius our gateway-mediated, per-task, audience-scoped ServiceAccount token exists to avoid. The cost of not doing this Depot's way is engineering effort we already carry (factory-gateway, the two per-session Forgejo tokens); the benefit is that a single compromised sandbox cannot reach every other session's credentials, which Depot's model does not protect against.

Depot's control plane, the part that actually schedules builds, stores secrets and holds session state, is closed source and stays with Depot even on the "deploy in your AWS account" Business tier, which only moves compute. Any dependency on Depot for build or sandbox infrastructure would sit outside our re-seed-from-Git-and-S3 boundary permanently; our own build VM, provisioned by OpenTofu and rebuilt from the same repository as everything else, pays for this constraint in engineering time but keeps the whole loop deletable and rebuildable, which a vendor-hosted control plane cannot offer regardless of where its compute runs.

## 8. Red flags and slop assessment

The company is real: YC W23, a named 10M USD Series A in March 2026 led by Felicis with Y Combinator and Pioneer Fund participating, angel investors including Docker's founder Solomon Hykes, and named customers (PostHog, Astral, Semgrep, Wistia, PlanetScale, Poolside) that plausibly run real build and CI volume. depot/cli is genuinely active, 1747 commits, a commit as recent as 2026-09-28. Two things temper this. First, the flagship comparison point for this report, the Claude Code sandbox, is young (launched August 2025) and its own docs are thin: no isolation technology is named anywhere, which is a notable omission for a vendor that leads its security page with SOC 2 Type II and audit-log badges. Second, the only independent commentary found on the sandbox product comes from two competitors (Northflank, Blaxel) with an obvious interest in describing Depot as security-thin (plain containers, async-only, no hardware isolation); their factual claims (async-only sessions, container rather than microVM at launch) match Depot's own original announcement wording, but their framing should be read as competitive marketing, not a neutral audit. No licence changes or security incidents surfaced in the time available; the 2024 SOC 2 Type I announcement names Vanta as the compliance vendor and states the Type II badge on the current homepage without a linked report.

## 9. Sources

- https://depot.dev (fetched 2026-09-29)
- https://depot.dev/docs (fetched 2026-09-29)
- https://depot.dev/docs/container-builds/overview (fetched 2026-09-29)
- https://depot.dev/docs/agents/overview (fetched 2026-09-29)
- https://depot.dev/docs/agents/claude-code/quickstart (fetched 2026-09-29)
- https://depot.dev/docs/security (fetched 2026-09-29)
- https://depot.dev/pricing (fetched 2026-09-29)
- https://depot.dev/blog/announcing-depot-metal (fetched 2026-09-29)
- https://depot.dev/blog/now-available-remote-agent-sandboxes (fetched 2026-09-29)
- https://depot.dev/blog/depot-magic-explained (referenced via search, 2024-01)
- https://depot.dev/blog/depot-soc-2 (referenced via search, 2024-03-12)
- https://depot.dev/about (referenced via search)
- https://github.com/depot/cli (fetched 2026-09-29, README, LICENSE, commit history)
- https://github.com/depot/cli/commits/main (fetched 2026-09-29)
- https://github.com/depot/depot (does not exist, 404, despite being the repo URL in the seed list)
- https://northflank.com/blog/depot-remote-agent-sandboxes-alternatives (competitor viewpoint, via search)
- https://blaxel.ai/blog/depot-remote-sandbox-alternatives (competitor viewpoint, via search)
- https://www.ycombinator.com/companies/depot (via search)
- WebSearch: Depot funding/HQ/founders, Depot blog architecture, Depot Claude Code sandbox reviews, Depot SOC 2 (all 2026-09-29)
- /home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/target-architecture.md, sections on the build VM and build cache (for comparison)
