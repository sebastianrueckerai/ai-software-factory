---
name: Daytona
slug: daytona
url: https://daytona.io
repo: https://github.com/daytonaio/daytona
category: sandbox-runtime
license: "mixed: AGPL-3.0 (server: api, runner, daemon/toolbox), Apache-2.0 (client SDKs); frozen at v0.190.0, no further releases"
open_source: partial
self_hostable: partial
hosting_model: SaaS (pay-as-you-go plus enterprise BYOC); the pre-freeze code only ever let you self-host the runner, never the control plane
company: Daytona Platforms Inc, founded 2023 by Ivan Burazin, Vedran Jukic and Goran Draganic, New York, about $31M raised (pre-seed $2M 2023, seed $5M 2024, Series A $24M Feb 2026 led by FirstMark Capital)
maturity: 71.7k stars, 457 open issues, about 230 contributors, first commit Feb 2024, last commit to main 2026-06-25 (the freeze announcement), previously frequent releases (30+ tags), now none
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 2
  verification: 0
  policy_outside_model: 1
  identity_per_task: 1
  cost_control: 2
  ux: 3
  reseedable_selfhost: 1
steal:
  - "The Toolbox daemon (apps/daemon/pkg/toolbox) bundles files, git, process exec, PTY, LSP, computer-use and session recording behind one small in-sandbox Go binary. Close to the scope our own sandbox-side adapter would need if it ever grows past model/tool proxying."
  - "Three mutually exclusive, live-editable network modes per sandbox: networkAllowList (CIDRs), domainAllowList (hostnames, wildcards allowed), networkBlockAll. A cleaner shape than one static NetworkPolicy if we ever expose per-project egress control to project owners."
  - "Hostname-based preview routing, {port}-{sandboxId}.{proxy-domain}, is a one-line pattern for handing a human a live URL into a running task's sandbox. Worth remembering when the console grows real-time views."
  - "Per-second metered pricing split into vCPU, memory, storage and GPU line items is a reasonable reference shape for costing our own commissioned-server tool prices."
  - "Sub-90ms claimed cold start on plain containers is a latency bar worth keeping in mind for our own gVisor/microVM roadmap, even though it trades away kernel-level isolation to get there."
differs:
  - "Isolation shares a kernel across sandboxes: Linux namespaces plus a hardened container runtime (Daytona's own CVE-2026-31431 advisory names Sysbox), driven straight through Docker/containerd (apps/runner go.mod, pkg/docker). No gVisor, Kata or Firecracker anywhere in the source or docs. We pay the gVisor systrap tax, and plan microVMs, specifically to avoid the shared-kernel failure mode that CVE stressed."
  - "'Self-hosted' means bring-your-own-runner while Daytona's control plane still coordinates everything; the org, billing, auth and scheduling layer was never something you could run yourself, even before the freeze. Our 'delete everything and re-seed from Git, S3 and one offline bundle' constraint has no equivalent here."
  - "Daytona went closed source specifically to deny attackers a copy of its isolation code, betting secrecy beats review for a security boundary. Our whole design bets the opposite: policy and mechanism live in Git, in the open, enforced in code. Worth naming as a live test of the opposing bet, not something to copy."
ux_verdict: One of the shortest quickstarts checked (account, API key, four lines of SDK code), plus SSH, VNC and a web terminal straight into a live sandbox; but there is no task, no approval lane, no idea an agent is running, only a compute resource a human can poke at.
slop_verdict: Real and heavily used (71.7k stars, about 230 contributors, three priced funding rounds, a promptly patched CVE), not a landing-page shell, but its open-source and self-hostable claims that are still all over the internet stopped being true in June 2026.
---

# Daytona

## 1. What it is

Daytona Platforms Inc sells on-demand compute sandboxes for running AI-agent-generated code: isolated containers reachable through SDKs for Python, TypeScript, Ruby, Go and Java, a CLI, a web dashboard, an MCP server and SSH. It started in 2024 as an open-source, self-hosted "dev environment manager" (a Codespaces/Coder alternative), then pivoted in 2025 to the current agent-sandbox product, sold as usage-based SaaS with an enterprise bring-your-own-cloud tier. It is used by other agent products as infrastructure, not as an orchestrator of its own.

The README claims sandboxes are "full composable computers with complete isolation, a dedicated kernel." What the code and Daytona's own security advisory actually show is narrower: isolation is Linux namespaces plus a hardened container runtime (Daytona's CVE-2026-31431 write-up names Sysbox) managed by a Go runner that drives the Docker and containerd APIs directly (apps/runner/go.mod pulls github.com/docker/docker, containerd/*, moby/buildkit). No separate kernel per sandbox exists anywhere in the source or the architecture docs.

The bigger fact for this report: on 2026-06-11 Daytona announced it was moving "production codebase to closed source," for a stated reason of security (public source as an attack map for AI-assisted exploit search). The daytonaio/daytona GitHub repository now contains only a README announcing this, frozen at tag v0.190.0 (2026-06-23) under AGPL-3.0, "no further updates, fixes, or releases." Independent forks (Nightona, and a fork published as "sandbox-platform" by Northrays) continue that exact snapshot on their own.

## 2. Mapping to our five planes

| Plane / principle | What Daytona does | What we do | Verdict |
|---|---|---|---|
| Signals | None. An SDK or API call creates a sandbox on demand; no issue, alert or telemetry intake | Forgejo webhooks, SigNoz alerts, factoryd intake API | not comparable |
| Control plane | apps/api (NestJS/TypeScript, Postgres via TypeORM, Redis, Auth0/OIDC) tracks sandbox lifecycle, orgs, snapshots and billing. No task or workflow concept, no approvals | factoryd with a Temporal workflow per task, Postgres, YAML policy in Git, approvals, budgets | not comparable (different job); we lead on durable multi-step task state |
| Worker plane | This is effectively the whole product: one container per sandbox, hardened runtime, per-container iptables egress chains (apps/runner/pkg/netrules), claimed sub-90ms cold start | gVisor pod per task, read-only root FS, default-deny egress, microVM roadmap | they lead on cold-start speed and a shipped tiered network API; we lead on isolation depth |
| Verification | None | Forgejo Actions, policy gates, stronger-model review | not comparable |
| Merge and deploy | None | Bot merge after approval, Flux staged rollout | not comparable |
| Policy outside the model | Network allow-lists enforced in runner code (real), org API-key permission strings like WRITE_SANDBOXES; no versioned capability document | Capability policy as a YAML document in Git, enforced in factory-gateway and network policy | we lead |
| Identity per task | One org or personal API key, not minted per request; injected proxy credentials sit as plain environment variables inside the sandbox | Projected, audience-scoped, kubelet-rotated ServiceAccount token per task, verified against the cluster OIDC issuer | we lead |
| Artifacts not chat | Not applicable; Daytona runs no agents itself, other harnesses point at it as a substrate | TaskBrief in, branch, PR and event stream out | not comparable |

## 3. Architecture and stack

Daytona's own docs describe three planes: interface (SDKs, CLI, dashboard, MCP server, SSH), control (the API and its satellite services) and compute (runners and sandboxes). The layout at v0.190.0 matches: apps/api (NestJS, TypeORM/Postgres, Redis, Auth0, PostHog; modules under apps/api/src for organization, api-key, sandbox, region, usage, audit, docker-registry, object-storage, clickhouse), apps/proxy (routes by hostname, {port}-{sandboxId}.{proxy-domain}), and a snapshot builder and sandbox scheduler that both run inside the API process rather than as separate services.

The compute side is apps/runner (Go; cmd/runner, pkg/docker, pkg/netrules, pkg/sshgateway, pkg/storage), which polls the API for jobs and drives Docker/containerd directly, using a hardened runtime for the actual sandbox and per-container iptables DOCKER-USER chains for egress (pkg/netrules/assign.go, delete.go) plus a mangle-table chain for bandwidth limiting (limiter.go). apps/daemon runs inside each sandbox and exposes the Toolbox API: files, git, process execution, PTY/terminal, LSP, computer-use and session recording (apps/daemon/pkg/toolbox, git, terminal, recording). Object storage is S3-compatible, backing snapshots and volumes.

Deployment shape: the AGPL server code was a real, working monorepo (Yarn workspaces, a devcontainer, docker/dex, docker/otel, docker/pgadmin4 for local development), but even before the freeze there was no documented, supported path to run the whole control plane yourself, no docker-compose file for it, and charts/ holds only a daytona-preview Helm chart, nothing for the API or database. Only the runner/compute layer was ever customer-deployable, confirmed by Daytona's own architecture docs and by Northflank's independent write-up.

## 4. UX

Onboarding: create an account at app.daytona.io, generate an API key, pip install daytona, then four lines of Python create a sandbox and run code. That is three steps to a first result, one of the shortest quickstarts seen in this survey. The dashboard adds SSH access, VNC, a web terminal and a preview URL per exposed port straight into a live sandbox, so a human can watch and directly step into a running box mid-task, something our own console cannot do today (no real-time stream of an agent's work is on our own weak-spot list). There is no approval workflow, no queued/waiting-human/review lane: Daytona has no concept of a task or an agent it supervises, only a compute resource a caller created and can poke at.

## 5. Security, identity, sandbox, policy, cost

Sandbox: Linux namespaces plus a hardened container runtime (Sysbox, per Daytona's own advisory) behind Docker/containerd, not a separate kernel per sandbox. Network: tier-dependent, not uniformly default-deny. Lower tiers are default-deny with a curated allowlist of essential services; higher tiers default-allow full internet unless the caller opts into networkAllowList, domainAllowList or networkBlockAll, one of which can be set at creation or live on a running sandbox. Identity: one org or personal API key carrying string permissions such as WRITE_SANDBOXES; no per-task, short-lived, audience-scoped credential, and an injected proxy URL's own credentials sit in the sandbox's environment variables in plaintext, reachable by code running there. Policy: the network allowlist is enforced in runner code, which is real, but there is no versioned capability document, no risk classing of actions, and no approval gate anywhere in the product. Cost: real per-second metered billing (vCPU, memory, storage and GPU line items, first 5 GiB storage free, $200 free credit for new signups), but nothing behaves like a hard spend cap, a pre-call cost hold or a ledger the platform enforces mid-session. It is a billing meter, not a budget brake.

## 6. What we should take from it

Narrow: the Toolbox daemon's scope (files, git, process exec, PTY, LSP, computer-use, session recording behind one small binary) is close to what our own sandbox-side adapter would need if it ever grows past proxying models and tools, worth reading apps/daemon/pkg/toolbox/server.go if that day comes. The three-mode network restriction API, changeable live without a restart, is a cleaner shape than a single static NetworkPolicy for the day we let project owners tune egress themselves rather than only inheriting our policy file. The hostname-based preview pattern is a one-line idea for a future live-view feature in the console.

Broad: a sub-90ms claimed cold start on plain containers is a concrete latency bar for our own gVisor and microVM plans to be measured against, even knowing it is bought by giving up kernel-level isolation. Their interface/control/compute vocabulary is also a reasonable way to describe our own worker plane to outsiders, independent of anything else in this report.

## 7. Where our philosophy differs and what that costs or buys us

Daytona's isolation shares a kernel across sandboxes; ours does not, and pays for it with gVisor's systrap overhead today and a planned move to microVMs. CVE-2026-31431 ("Copy Fail," April 2026) is the concrete argument for our choice: a universal Linux privilege-escalation bug reachable from inside any container, patched by Daytona within 12 hours, but exactly the class of failure that only a separate kernel forecloses. We are not tempted to match their model; "security without half measures" is the reason we do not.

"Self-hosted" at Daytona has only ever meant bringing your own compute while their control plane keeps coordinating it, never a fully reproducible stack. Our "delete everything and re-seed from Git, S3 and one offline bundle" requirement has no equivalent there, even at the last open tag. Copying their shape would mean giving up re-seedability entirely, which is not a trade we would make for anything a sandbox vendor offers.

Most interesting is the June 2026 move itself: Daytona went closed source specifically to stop attackers reading the isolation code that protects their tenants, arguing that AI-assisted exploit search made an open security boundary a liability rather than an asset. Our design bets the opposite way, that policy and mechanism belong in Git where they can be reviewed. Both are live bets in the same market right now; we note it rather than treat either as obviously settled.

## 8. Red flags and slop assessment

Genuinely real and used: 71.7k GitHub stars, about 230 contributors, three priced funding rounds totalling roughly $31M (FirstMark Capital, Upfront Ventures, 500 Global, plus angel investors from Postman, Honeycomb, Netlify and Supabase), stated customers including LangChain, Turing, Writer and SambaNova (company claim, not independently verified here), and a real, promptly handled CVE response: CVE-2026-31431 patched across affected runners within 12 hours of public disclosure, per Daytona's own advisory, with no evidence in their telemetry of exploitation against their platform.

The licence history is a case study in a ratchet tightening twice. Launched Apache-2.0 in 2024 as a dev-environment manager. Relicensed to AGPL-3.0 during the 2025 pivot to sandboxes; CEO Ivan Burazin said on the Latent Space podcast that AGPL was chosen so that "you essentially can't make a competitor without open sourcing your stuff." Then in June 2026 the AGPL server code itself was frozen and core development moved to a fully private codebase, citing AI-assisted exploit discovery as the reason. The client SDKs subsequently moved back to Apache-2.0 in a new, separate repository.

The practical cost for anyone who adopted the pre-freeze code as open-source self-hosted infrastructure: the frozen v0.190.0 tree gets no further security patches, including for the exact isolation layer the vendor cited as too risky to keep exposed. Multiple third-party posts, published by competitors (Northflank, and a sandbox-market analysis on bex.co) so read with that bias in mind, already point new adopters at e2b, microsandbox and kubernetes-sigs/agent-sandbox as the remaining openly self-hostable options. A large amount of pre-June marketing copy and third-party reviews describing Daytona as freely self-hostable is now out of date.

## 9. Sources

- https://github.com/daytonaio/daytona (cloned depth 1, then fetched and checked out tag v0.190.0, 2026-09-29)
- /home/womb/repos/market-research-clones/daytona/README.md (post-freeze, main branch)
- /home/womb/repos/market-research-clones/daytona/LICENSE (AGPL-3.0, at v0.190.0)
- /home/womb/repos/market-research-clones/daytona/CONTRIBUTING.md
- /home/womb/repos/market-research-clones/daytona/apps/api/package.json, apps/api/src/main.ts
- /home/womb/repos/market-research-clones/daytona/apps/runner/go.mod, apps/runner/pkg/docker/container_configs.go, apps/runner/pkg/netrules/*.go
- /home/womb/repos/market-research-clones/daytona/apps/daemon/pkg/toolbox
- /home/womb/repos/market-research-clones/daytona/charts/daytona-preview
- top-level layout via find . -maxdepth 2 -type d at v0.190.0
- gh api repos/daytonaio/daytona (2026-09-29)
- gh api repos/daytonaio/daytona/tags, /contributors, /commits/v0.190.0 (2026-09-29)
- https://www.daytona.io/docs/architecture/ (fetched 2026-09-29)
- https://www.daytona.io/pricing (fetched 2026-09-29)
- https://www.daytona.io/docs/network-limits/ (fetched 2026-09-29)
- https://www.daytona.io/dotfiles/updates/daytona-is-going-closed-source (fetched 2026-09-29)
- WebSearch "Daytona private codebase 2026 open source sandbox no longer maintained" (2026-09-29), incl. https://bex.co/blog/2026/09/12/daytona-closed-source-agent-sandbox-oss-risk, https://github.com/nightona-co/nightona, https://github.com/sajid-the-backend-engineer/sandbox-platform
- WebSearch "Daytona sandbox self-hosting AGPL license enterprise on-premise" (2026-09-29), incl. https://northflank.com/blog/self-hostable-alternatives-to-daytona
- WebSearch "CVE-2026-31431 Daytona sandbox escape" (2026-09-29), incl. https://www.daytona.io/dotfiles/updates/security-update-cve-2026-31431-copy-fail, https://kudelskisecurity.com/research/linux-cve-2026-31431-copy-fail-lpe-enables-stealthy-root-access-container-escape, https://www.bugcrowd.com/blog/what-we-know-about-copy-fail-cve-2026-31431/
- WebSearch "Daytona relicense Apache to AGPL history open source license change" (2026-09-29), incl. Latent Space podcast interview with Ivan Burazin, https://www.daytona.io/changelog
- WebSearch "Daytona Platforms Inc funding round HQ founded Ivan Burazin" (2026-09-29), incl. https://www.prnewswire.com/news-releases/daytona-raises-24m-series-a-to-give-every-agent-a-computer-302680740.html, https://alleywatch.com/2026/02/daytona-ai-agent-infrastructure-sandbox-computing-developer-tools-ivan-burazin/
