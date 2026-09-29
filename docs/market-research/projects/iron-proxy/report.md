---
name: iron-proxy
slug: iron-proxy
url: https://iron.sh
repo: https://github.com/paradigmxyz/iron-proxy
category: policy-identity
license: Apache-2.0
open_source: yes
self_hostable: yes
hosting_model: "self-hosted binary, Docker image or Helm chart (free); optional paid or self-hosted 'iron.sh' fleet control plane on top"
company: "Paradigm, a San Francisco investment and engineering firm (same organisation as Centaur), repo created 2026-04-01"
maturity: "695 stars, 48 forks, 11 contributors (1 dominant: mslipper 151 of 191 commits, dependabot 31), 67 releases from v0.4.1 to v0.52.0, created 2026-04-01, last commit 2026-09-28"
similarity: 1
axes:
  signals_intake: 0
  control_plane: 1
  sandbox_isolation: 2
  verification: 0
  policy_outside_model: 4
  identity_per_task: 3
  cost_control: 0
  ux: 2
  reseedable_selfhost: 4
steal:
  - "dnsguard's dial-time IP-CIDR recheck (net.Dialer.Control after DNS resolution) closes the SSRF and DNS-rebinding gap on any allowlisted hostname, defaults deny cloud metadata IPs and loopback"
  - "resolver TTL plus a separate failure_ttl for cached secrets, so a transient secret-backend outage falls back fast instead of being pinned behind a long positive cache"
  - "the judge transform's shape for ever letting a model touch a capability decision: deny-only, fail-closed on error or timeout, circuit breaker on consecutive failures, semaphore-capped concurrency, one audited verdict per call"
  - "MCP tool policy at argument level, not just tool level: dotted-path equals/in/matches conditions on tools/call arguments, plus tools/list and per-SSE-event filtering so a denied tool never even appears"
  - "a checked-in egress-rules.yaml enforced against their own CI runner by a GitHub Action, with a build-time summary of blocked and allowed calls, applied to the tool's own pipeline, not just downstream users"
differs:
  - "default routing is DNS-interception, which their own docs call easy to bypass from inside the workload; our Cilium default-deny is enforced below the workload at the CNI and cannot be opted out of from inside the sandbox, so iron-proxy would have to sit behind that perimeter, never replace it"
  - "identity is per-proxy-instance or per-fleet-principal, not per-task: nothing issues, verifies or scopes a credential to one task the way our OIDC-verified projected ServiceAccount token does"
  - "the part that would matter at our scale, central policy push and aggregated audit across many proxies, lives behind the separate 'iron.sh' product, sold or self-hosted as 'source available' with no licence stated, so we would only ever take the Apache-2.0 binary, never that layer"
ux_verdict: "three commands from clone to a first allow/deny/secret-swap result in the checked-in docker-compose example, but the OSS product has no dashboard, replay or approval surface at all, only a JSON log stream"
slop_verdict: "real and actively maintained (191 commits, 67 releases in under six months, integration tests against live AWS, Vault, 1Password and GCP backends, signed release checksums), but effectively a single-maintainer project under six months old, with the valuable fleet layer pushed into a separate, unconfirmed-licence commercial product"
---

# iron-proxy

## 1. What it is

iron-proxy is a single Go binary that sits between an agent's sandbox and the internet, denies every outbound request by default, terminates TLS with its own certificate authority, and swaps placeholder tokens for real secrets only at the moment a request leaves the machine. It is written and maintained mostly by one engineer (Matthew Slipper) under Paradigm, the same San Francisco investment and engineering firm behind Centaur, and released under Apache-2.0. The repository lives at `github.com/paradigmxyz/iron-proxy`; the URL given in the task, `github.com/ironsh/iron-proxy`, redirects there, and `ironsh` is the name used for the commercial arm (`iron.sh`).

The README frames the problem as CI jobs, AI coding agents and sandboxed containers making arbitrary outbound calls with real, long-lived credentials sitting in their environment, and cites recent supply-chain compromises (Trivy, KICS, LiteLLM, Axios) as the motivating pattern. The pitch is "iron-proxy is how you start, iron.sh is how you scale": the OSS binary is fully usable standalone, and a separate hosted-or-self-hosted control plane adds fleet-wide policy push, secret rotation and aggregated audit search across many proxy instances, sold sales-led with no published pricing.

What the README claims is backed by real code, not by name only. `internal/transform` has 61 Go files covering the claimed allowlist, secrets, judge, MCP, body-capture, header-allowlist, annotate, grpc, hmac-sign, oauth, awsauth, gcpauth and gcpidtoken transforms, and the claimed Postgres role-mutation blocking is a genuine recursive SQL and PL/pgSQL AST walk (`internal/postgres/sql.go`) using `pganalyze/pg_query_go`, not a regex.

## 2. Mapping to our five planes

| Plane / principle | What they do | What we do | Verdict |
|---|---|---|---|
| Signals | None. No concept of an inbound issue, alert or task | Forgejo webhooks, SigNoz alerts, `factoryd` intake API, every task a Forgejo issue | not comparable |
| Control plane | Optional "iron.sh" service pushes YAML rules and secret references to a fleet of proxies over a poll/hash-sync protocol (`internal/controlplane/poller.go`); no task registry, scheduler, budgets or approvals | `factoryd` with a Temporal workflow per task, Postgres task registry, policy as a Git YAML file, cost ledger, approvals | not comparable (narrower scope) |
| Worker plane | None. iron-proxy assumes a sandbox exists and documents how to route its traffic through the proxy, it does not create the sandbox | gVisor pod per task, read-only root FS, non-root, Cilium default-deny egress | not comparable |
| Verification | None | Forgejo Actions, policy gates, stronger-model review before merge | not comparable |
| Merge and deploy | None | Bot merge after approval, Flux GitOps deploy | not comparable |
| Policy outside the model | Host, CIDR, method and path rules compiled from YAML and matched in Go code (`internal/hostmatch/rule.go`); the one LLM-backed transform, `judge`, can only deny, never grant beyond the static allowlist, and fails closed on any error, timeout or open circuit breaker | Capability rules are a Git-versioned YAML document enforced in gateway code and Cilium network policy | they lead, on their narrower scope: the "can only subtract, never grant" invariant is an explicit, tested version of the same principle, and it reaches HTTP method, path and MCP tool argument level, which our gateway does not yet do |
| Identity per task | Identity is per-proxy-instance (an enrolled "principal", `internal/controlplane/poller.go`'s `Status.PrincipalID`), not per-task. But no real secret value ever leaves the proxy process, for any host the pipeline mediates, not only a narrow case | Per-task projected OIDC ServiceAccount token verified by `factory-gateway`; OpenBao mints a short-lived real credential only for the narrow case where the agent must connect itself directly | equal: weaker on task-scoped identity issuance, stronger on the one case where our own design still hands the agent a real, if short-lived, secret |
| Artifacts not chat | Not applicable, it coordinates nothing between agents | Git: `TaskBrief` in, branch, PR and event stream out | not comparable |

## 3. Architecture and stack

One Go module (`github.com/ironsh/iron-proxy`, Go 1.26), one binary (`cmd/iron-proxy`, with a `generate-ca` subcommand), roughly 41,000 lines of Go across 166 files, no vendored generated code beyond a small protobuf transform schema. It has no database of its own: standalone mode holds state as one YAML file plus in-memory LRU caches, managed mode makes the proxy a stateless client of whatever the closed-source iron.sh control plane stores.

Key packages read: `cagen` generates a one-shot CA (RSA-4096 or Ed25519) with exclusive-write file semantics. `certcache` keeps an LRU (`hashicorp/golang-lru/v2` expirable cache) of per-domain ECDSA P-256 leaf certificates signed by that CA, generated on first use, safe for concurrent access, and it includes the CA in the served chain so intermediate-CA setups work. `proxy` (`internal/proxy/proxy.go`) is the actual listener: `serveHTTPSMITM` and `serveHTTPSSNI` (SNI passthrough, no decryption, via `snipeek.go`'s `peekSNI`), plus HTTP, WebSocket, SSE streaming and CONNECT/SOCKS5 tunnelling, all funnelled through the same transform pipeline. `dnsguard` rechecks the resolved IP against a CIDR deny-list inside `net.Dialer.Control`, defaulting to deny cloud metadata addresses (169.254.169.254 and the AWS/GCP IPv6 metadata equivalents) and loopback; RFC1918 is deliberately not blocked by default because "many legitimate iron-proxy deployments target private corporate networks" (comment in the source). `hostmatch` is the shared host/CIDR/method/path rule matcher every transform's `rules:` block compiles through (`RuleConfig` to `Rule`, `CompileRules`, `MatchAnyRule`). `postgres` is a second protocol entirely, a Postgres wire-protocol MITM that authenticates clients against proxy-managed credentials, injects `SET ROLE`, and rejects client-issued role mutation via a real SQL/PL-pgSQL AST walk. `mcp` and `mcpgateway` intercept JSON-RPC over MCP's Streamable HTTP transport for tool-level and argument-level policy, and route client-facing MCP hostnames to real upstream MCP servers with their own credential injection. `controlplane` is the client for the optional iron.sh service: hash-based config sync with jittered polling, `Poke()` for out-of-band refresh, and single-use `IRON_ENROLLMENT_TOKEN` enrolment (per docs.iron.sh, not verifiable in this OSS repo since the server side is closed).

Deployment shape: a static, stripped binary for linux/darwin amd64/arm64 (`.goreleaser.yml`, `CGO_ENABLED=0`), a Docker image (`ironsh/iron-proxy` on Docker Hub, Alpine base, `Dockerfile.release`), and a Helm chart (`charts/iron-proxy`) with `mode: standalone` (config from a rendered ConfigMap) or `mode: managed` (a control-plane token only, no config file). The chart defaults to non-root UID 65532, read-only root filesystem, all Linux capabilities dropped except `NET_BIND_SERVICE`, and `automountServiceAccountToken: false`. Release binaries and checksums are PGP-signed (`SECURITY.md`, `public-key.asc`). The project only talks to a model inside the `judge` transform, calling either the Anthropic Messages API or the OpenAI Chat Completions API, model and API key configurable per rule.

## 4. UX

There is no web UI in the open-source product. A user starts, watches and stops iron-proxy entirely through YAML config, the CLI and a JSON log stream, or an OpenTelemetry export if configured. From a clean clone, `cd examples/docker-compose && docker compose up` then `docker compose logs proxy` is the whole path to a first result: three commands, no account, no sign-in, and the log immediately shows one allowed request, one denied request and a secret-swap in structured JSON. The README links a hosted screen recording and a checked-in `images/intro.gif` titled "Blocked exfiltration + secret rewriting in action." Production setup is four explicit steps in the README: generate a CA, create a Docker network, start the proxy with real secrets as container environment variables, and point the client's DNS or explicit proxy settings at it.

There is no dashboard, kanban board, diff or replay view, and no runtime approval step: the allowlist is static YAML, reloaded live only via a loopback-only `POST /v1/reload` on an opt-in management API. A human intervenes by editing the YAML and reloading, not by clicking anything. The paid iron.sh layer is described as adding a searchable audit dashboard (docs.iron.sh/control-plane/overview), but that page has no screenshots and is gated behind a sales demo. Against our console: onboarding is faster here and needs no infrastructure (no OIDC login, no Postgres), but there is nothing resembling our kanban board, human lane or per-task cost view, because there is no task for it to show.

## 5. Security, identity, sandbox, policy, cost

Identity: none at the task or agent level in the OSS binary. In managed mode a proxy instance itself enrols with a short-lived, single-use `IRON_ENROLLMENT_TOKEN` (per docs.iron.sh, not verified in code since the enrolment server is closed-source). There is no OIDC verification and no per-request caller identity.

Sandbox: iron-proxy does not create a sandbox, it assumes one already exists and documents four ways to force its egress through the proxy: standalone host, dedicated network-proxy box, sidecar sharing a network namespace, or an embedded root process using iptables to block non-root egress (docs.iron.sh/deploy/overview). Their own docs rate the default, DNS-based routing as weak and "easy to bypass" by a workload that hardcodes an IP or brings its own resolver, and recommend layering nftables or TPROXY for real enforcement; both ship only as examples (`examples/nftables/`), neither is the default.

Policy: entirely YAML compiled once at load or reload into Go structures (host globs, CIDRs, HTTP methods, path globs). The one LLM-backed gate, `judge`, is structurally unable to grant access beyond the static allowlist and fails closed on any LLM error; `AGENTS.md`'s "Security invariants" section states this as a property reviewers must block a PR on if weakened.

Cost: none. No budget, spend cap or cost ledger anywhere in the product. The `judge` transform's `max_concurrent` semaphore and circuit breaker bound the blast radius of a misbehaving LLM call, not spend.

Credentials: real secret values are resolved from env, an atomically rotatable file, AWS Secrets Manager or SSM, Vault KV, or 1Password or 1Password Connect (`internal/transform/secrets/resolver.go`, `op_resolver.go`, `op_connect_resolver.go`, `vault_kv_resolver.go`), cached with independent success and failure TTLs, and substituted into the outbound request only inside the proxy process, immediately before it leaves the machine. `AGENTS.md` explicitly forbids a real secret value from ever appearing in a log, error string, panic message or response.

## 6. What we should take from it

Narrow, copyable this month:

`dnsguard`'s post-resolution CIDR recheck inside `net.Dialer.Control`, defaulting to deny cloud metadata and loopback, closes the SSRF and DNS-rebinding gap for any hostname we allowlist by name. Cilium already blocks the metadata address today, but the pattern generalises to any egress point that resolves a hostname it does not fully control.

The resolver's `ttl` plus independent `failure_ttl` is a two-field pattern worth copying into any OpenBao lookup we cache: a long positive cache and a short negative one, so a transient secret-backend outage is not pinned behind a stale long TTL.

The `judge` transform is a ready template for anywhere we would let a model influence a capability decision without breaking "policy lives outside the model": deny-only, fail-closed, circuit-breaker-protected, concurrency-capped, one audited verdict per call.

MCP policy at argument level (dotted-path `equals`/`in`/`matches` against `tools/call` arguments, with `tools/list` and per-SSE-event filtering so a denied tool never appears) is finer-grained than our current MCP proxying, which gates at the capability level, not the argument level.

Their own CI dogfoods the product: a GitHub Action (`ironsh/iron-proxy-action`) enforces a checked-in `egress-rules.yaml` against the job itself and posts a summary of blocked calls. Worth mirroring on our Forgejo Actions runners: a declarative, checked-in egress allowlist with a build-time report, not only a runtime Cilium policy nobody reads.

Broad, product-shape level:

The core idea, that the agent never holds a real secret for any HTTP call the proxy mediates, not only model calls, is broader than what `factory-gateway` does today. Our stated "narrow case where the agent must connect itself" still hands the agent a short-lived but real OpenBao credential. If we ever give agents direct access to a third-party API that is not behind an MCP server (a cloud provider API, a SaaS webhook), iron-proxy's transform set (`oauth`, `awsauth`, `gcpauth`, `hmacsign`, generic `secrets`) is a ready-made way to keep that promise instead of building bespoke per-API proxying into `factory-gateway`.

Their deployment-pattern writeup (standalone host, network proxy, sidecar, embedded-in-sandbox, each with a named circumvention-resistance tradeoff) is a clearer way to talk about egress enforcement strength than we currently document, and useful language for placing Cilium in that spectrum: closer to their "network proxy" pattern, but enforced below the workload rather than beside it.

## 7. Where our philosophy differs and what that costs or buys us

Their default trust boundary is DNS interception, which their own docs call easy to bypass from a compromised or merely careless workload. Our default-deny is enforced by Cilium at the CNI, outside the pod's network namespace, so nothing running inside the sandbox can opt out of it. Adopting iron-proxy's routing model as a replacement for Cilium would be a downgrade; using it only as an additional application-layer hop behind Cilium, which matches their own "sidecar plus NetworkPolicy" recommendation, avoids the regression. This is where their approach is real but our constraint (network forbids by default, below the workload) is the higher bar, and we should keep paying for it.

Their identity model is per-proxy-instance or per-fleet-principal, not per-task. Nothing in the OSS binary issues, verifies or scopes a credential to one task the way our OIDC-verified projected ServiceAccount token does. Using iron-proxy as one shared gateway for many concurrent tasks would mean falling back to one shared policy and secret set behind one gate, unless we ran one instance per task sandbox, which the project supports but does not itself orchestrate.

The half of the product that would matter at our scale, central policy push, secret rotation and aggregated audit across many proxy instances, sits behind the separate `iron.sh` product, offered hosted or self-hosted as "source available" with no licence stated on its own docs. We have committed to open-source tools with an escape hatch; the pure Apache-2.0 binary satisfies that, the fleet control plane as offered today does not, so we would only ever take the binary, never that layer.

## 8. Red flags and slop assessment

Real and actively maintained: 191 commits, 67 releases in under six months (about one every 2.6 days), an integration-test suite that exercises live AWS, Vault, 1Password and GCP backends via containers, an `AGENTS.md` that encodes specific security invariants for AI-assisted review, and PGP-signed release checksums. This is not a README-only project.

Bus factor: of 191 commits, 151 are from one author (Matthew Slipper, also the named `iron.sh` contact) and 31 are dependabot; the other nine contributors have one commit each. Corporate backing from Paradigm offsets some of this, but in practice it is a single-maintainer effort.

Open-core direction: the OSS binary is fully functional standalone, but the part that would matter most at fleet scale, central policy and aggregated audit, is a separate sales-led product with no public pricing, whose self-hosted option is described only as "source available," not confirmed under an open licence.

Young: created 2026-04-01, under six months old at the time of writing. "Maturity" here means release velocity, not a long track record.

Adoption found: one real integration in the wild, a pull request wiring iron-proxy in as an egress sidecar for "Hermes Agent Operator" (`github.com/hermeum/hermes-agent-operator`, PR #89), and one third-party comparison page from a competitor ("Pipelock vs iron-proxy," PipeLab, explicitly not affiliated). No Hacker News or Reddit discussion found. No independent performance benchmark and no published third-party security audit found, both not verified. The Hermes PR also surfaces one packaging rough edge: Docker Hub tags carry no leading `v` while some example configs reference a `v`-prefixed tag that does not resolve.

## 9. Sources

https://github.com/paradigmxyz/iron-proxy (README.md, AGENTS.md, SECURITY.md, LICENSE, go.mod, go.sum, egress-rules.yaml, install.sh, Dockerfile.release, .goreleaser.yml, .github/workflows/ci.yml)
https://github.com/ironsh/iron-proxy (confirmed redirect to paradigmxyz/iron-proxy)
internal/cagen/*.go
internal/certcache/*.go
internal/controlplane/client.go, poller.go, errors.go
internal/proxy/proxy.go, sni_passthrough.go, snipeek.go, tunnel.go
internal/dnsguard/*.go
internal/hostmatch/rule.go
internal/transform/ (registry.go, pipeline.go, secrets/*.go, judge/transform.go, judge/resilience.go, judge/prompt.go, judge/system_prompt.md)
internal/postgres/policy.go, sql.go, server.go, session.go, manager.go, auth.go
internal/mcp/ and internal/mcpgateway/ (directory listing and grepped signatures)
charts/iron-proxy/Chart.yaml, values.yaml
examples/docker-compose/*, examples/nftables/
cmd/iron-proxy/main.go, generate_ca.go
gh api repos/paradigmxyz/iron-proxy (fetched 2026-09-29)
gh api repos/paradigmxyz/iron-proxy/contributors (fetched 2026-09-29)
gh api repos/paradigmxyz/iron-proxy/releases and /commits, Link header pagination (fetched 2026-09-29)
https://iron.sh (fetched 2026-09-29)
https://docs.iron.sh/deploy/overview (fetched 2026-09-29)
https://docs.iron.sh/control-plane/overview (fetched 2026-09-29)
WebSearch: "iron-proxy" ironsh egress proxy review, benchmark, "vs" comparisons (2026-09-29), found https://pipelab.org/compare/pipelock-vs-iron-proxy/ and https://github.com/hermeum/hermes-agent-operator/pull/89
WebSearch: iron-proxy Hacker News / Reddit discussion (2026-09-29), no results found
/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/projects/centaur/report.md (cross-check on Paradigm/Tempo company line)
/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/target-architecture.md (terminology cross-check)
