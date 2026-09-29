---
name: Restate
slug: restate
url: https://restate.dev
repo: https://github.com/restatedev/restate
category: durable-execution
license: BUSL-1.1
open_source: partial
self_hostable: yes
hosting_model: self-hosted binary, Docker image or Helm chart (BSL, free for own production use); Restate Cloud or BYOC managed option, pricing not published
company: Restate GmbH / Restate Software Inc, Berlin, founded 2022 by ex-Apache Flink and Ververica team (Stephan Ewen, Igal Shilman, Till Rohrmann); 7M USD seed June 2024 led by Redpoint Ventures
maturity: 4485 stars, 210 forks, 30+ listed contributors, created 2023-01-04, last commit 2026-09-29, release-notes/unreleased pipeline shows frequent releases
similarity: 1
axes:
  signals_intake: 0
  control_plane: 2
  sandbox_isolation: 0
  verification: 0
  policy_outside_model: 0
  identity_per_task: 0
  cost_control: 0
  ux: 3
  reseedable_selfhost: 3
steal:
  - "durable promises and awakeables as the shape for a human-approval gate: an external actor resolves a specific promise ID with one HTTP call, no polling needed on either side"
  - "an embedded, per-invocation journal inspector plus automatic OpenTelemetry tracing, shipped as part of the server itself, is exactly the 'no replay or trace UI' gap our own weak-points list names"
  - "the documented guarantee that an x.y to x.(y+1) upgrade needs no manual data migration is a concrete bar for how we should describe our own Temporal and Postgres upgrade path"
  - "keyed single-writer state ('virtual objects') as a clean primitive name if we ever need per-entity serialised state outside the per-task workflow, instead of inventing our own locking convention"
differs:
  - "the programming model is inverted from ours: Restate calls into HTTP-registered handlers and replays their journal server-side, where our factoryd workflow is in-process Go code that Temporal's SDK replays locally; adopting Restate would mean restructuring the control plane around inbound HTTP handlers, not swapping one library for another"
  - "BUSL-1.1 is not OSI open source; self-hosting our own production use is explicitly permitted by the Additional Use Grant, so it would still clear our open-source-with-escape-hatch bar, but Temporal's plain MIT licence is the strictly better fit for the same constraint, so there is no licence reason to prefer it"
  - "Restate only ever covers the durable-execution slice of one plane; it has no signals, sandbox, verification, policy or identity concept at all, so it could replace only the state and replay half of what factoryd plus Temporal already does, never factory-gateway, gVisor or the policy engine"
ux_verdict: "brew, npx or docker to a running server and a first traced invocation in about two minutes per the Quickstart, with a built-in web UI and CLI to inspect, pause, cancel and restart individual invocations, which is a stronger single-task trace view than our console has today, but the developer still writes and deploys handler code, there is no board or human-approval surface out of the box"
slop_verdict: "real and actively developed, not a README project: a large multi-crate Rust workspace with its own raft-based metadata store and replicated log, a paying customer list (Replit, Capital One, Maersk) on the homepage, and a commit landing on the day of this report, but still a single seed-funded company (one 7M USD round from June 2024, about 20 staff per Tracxn) with the BSL clock running on every release"
---

# Restate

## 1. What it is

Restate is a durable execution runtime: a server that sits in front of ordinary service code and makes each handler's execution resilient to crashes, retries and long waits, without the developer hand-writing checkpoint or retry logic. It is built by Restate GmbH, a Berlin company founded in 2022 by three people who previously built Apache Flink and its commercial arm Ververica (Stephan Ewen, Igal Shilman, Till Rohrmann), and raised a 7M USD seed round in June 2024 led by Redpoint Ventures. It is sold as a free, self-hosted, BSL-licensed binary, a managed Restate Cloud, or a "bring your own cloud" managed deployment inside the customer's own AWS or GCP account.

The makers claim it needs "no external database or message broker" and runs as one Rust binary. The repository shows this is true only in the sense that it ships its own storage and consensus rather than depending on Postgres or Kafka: `crates/metadata-server` runs a Raft (`raft-proto`) based metadata store, `crates/bifrost` is Restate's own replicated log, and `crates/partition-store` persists journals and keyed state in RocksDB. The claim of "no dependency" is really "the dependency is bundled."

## 2. Mapping to our five planes

| Plane / principle | What Restate does | What we do | Verdict |
|---|---|---|---|
| Signals | None. Work arrives as a direct HTTP or SDK call to a registered handler | Forgejo webhooks, SigNoz alerts, factoryd intake API, every task a Forgejo issue | not comparable |
| Control plane | Durable per-invocation state and journal, retries, timers, admin REST API for status and cancellation; no task registry, capability policy, budgets or approvals | factoryd, a Temporal workflow per task, Postgres task registry, Git-versioned policy, cost ledger, approvals | we lead on scope, they lead on invocation-level replay tooling |
| Worker plane | None. Handlers run as the developer's own service, anywhere | gVisor pod per task, read-only root FS, default-deny egress | not comparable |
| Verification | None | Forgejo Actions, policy gates, stronger-model review | not comparable |
| Merge and deploy | None | Bot merge after approval, Flux GitOps deploy | not comparable |
| Policy outside the model | No capability or LLM-facing policy concept at all | Git YAML policy, enforced in gateway code and Cilium network policy | not comparable |
| Identity per task | No auth layer found in the OSS ingress or admin crates; a deployment registers by URL, no per-call identity | Per-task OIDC-verified projected ServiceAccount token, verified by factory-gateway | we lead |
| Artifacts not chat | Not applicable, it coordinates one call graph, not agents | Git: TaskBrief in, branch and PR out | not comparable |

## 3. Architecture and stack

A Rust Cargo workspace of about 50 crates. `crates/worker` holds the partition processor and `crates/invoker-impl` the component that pushes invocations to a registered service over HTTP2 (`service-protocol` / `service-protocol-v4`) and manages retry timers. `crates/log-server` and `crates/bifrost` implement Restate's own replicated log, the durability layer under every journal entry. `crates/admin` exposes the REST API (`rest_api/`) and serves an embedded web UI (`web_ui.rs` reads bundled assets from `restate_web_ui::ASSETS`, redirecting `/` to `/ui`). `crates/ingress-http` is the public HTTP entry point for invoking a service. SDKs (TypeScript, Java/Kotlin, Python, Go, Rust, Ruby) live in separate `sdk-*` repositories, not in this one.

Deployment: prebuilt binaries via Homebrew or npm (`npm/restate-server`, `npm/restatectl`), a Docker image, and a Helm chart (`charts/restate-helm`, `values.yaml`: single `replicaCount`, a `storage` block with `storageClassName` for a PersistentVolumeClaim). No separate operator crate in this repository. Restate does not itself call a model; recent blog posts and the docs site describe wiring it under Pydantic AI or as a durable substrate for agent loops, with the agent code being the registered handler.

## 4. UX

`brew install restatedev/tap/restate-server` or `docker run ... restate:latest`, then the Quickstart to a first traced invocation, is about two minutes end to end. Interfaces: an embedded web UI at `/ui` for browsing services, invocations and their journals, and inspecting, cancelling or restarting a stuck one; a CLI (`restate`, `restatectl`) for the same; an admin REST API. Every invocation gets an OpenTelemetry trace automatically, without the developer instrumenting anything.

Against our console: Restate's per-invocation journal view is closer to the "diff view, real-time stream, replay UI" our own weak-points list says we lack, even though it is watching one call graph, not a multi-step agent task. There is no kanban board, no human-approval lane and no cost view, because Restate has no concept of an approval or a spend cap; a developer would build those on top of durable promises.

## 5. Security, identity, sandbox, policy, cost

Sandbox: not applicable, Restate is not an isolation tool.

Identity: grepping `crates/ingress-http/src` and `crates/admin/src` for authentication or bearer-token handling found nothing beyond one deployment-registration file. The open-source server appears to trust whatever reaches its ports; self-hosters are expected to front it with a reverse proxy or network policy. Restate Cloud and BYOC likely add authentication at the perimeter, but the relevant docs page returned a 404 at the time of writing, so this is not verified.

Policy: none. There is no capability rule engine or egress control; that is out of scope for the product.

Cost: none in the OSS server beyond per-key concurrency limits mentioned on the marketing site (not verified in code). No budget, spend cap or cost ledger.

## 6. What we should take from it

Narrow: the durable-promise and awakeable pattern, resolving one named promise with a single plain HTTP call, is a cleaner shape for a human-approval gate than a bespoke polling mechanism, and worth comparing against how we expose "approve this task" through Temporal signals today. The embedded per-invocation journal inspector and automatic per-call OpenTelemetry trace is a concrete UX bar for the trace and replay UI we say we are missing. Their documented no-manual-migration guarantee between consecutive minor versions is a bar worth holding our own Temporal and Postgres upgrade story to, even without adopting the tool.

Broad: nothing at the product-shape level. Restate solves one narrow problem, durable retryable execution of a call graph, that we already solve with Temporal, and it brings no answer to signals, sandboxing, verification or policy, which are the parts of our loop that actually differentiate the factory.

## 7. Where our philosophy differs and what that costs or buys us

Restate's programming model inverts ours: the server calls into HTTP-registered handlers and replays their journal on the server side, where factoryd's per-task workflow is Go code that Temporal's SDK replays locally, in-process. Moving our task workflow onto Restate would mean restructuring factoryd around inbound HTTP handlers rather than swapping a library, for no plane capability we currently lack. Not worth it.

BUSL-1.1 is not an OSI open-source licence. Its Additional Use Grant explicitly permits any production deployment "invoking services or workflows written by the Licensee," which covers our own use, so it would still satisfy our "open source with an escape hatch" constraint in practice, converting to Apache-2.0 four years after each release. Temporal, which we already run, is plain MIT: a strictly better fit for the same constraint, so licence gives us no reason to switch.

Restate's single-binary, embedded-storage model (its own Raft metadata store and replicated log instead of an external database) is a real simplification of Temporal's need for a separate Postgres or Cassandra. It buys nothing for us specifically, because we already run CloudNativePG for other platform services; Temporal reusing that shared Postgres is the cheaper choice under our commodity-hardware constraint, not the more complex one.

## 8. Red flags and slop assessment

GitHub reports the licence as NOASSERTION because BSL is not a recognised SPDX licence for classification purposes; the LICENSE file confirms Business Source License 1.1 with a four-year change date to Apache-2.0. The company has raised one seed round (7M USD, June 2024) and no further round found as of 2026-09-29, with roughly 20 staff per Tracxn, so it is small relative to the workloads its customer list (Capital One, Maersk, KPMG) implies. Development itself looks healthy: a commit landed on the day of this report, and the in-repo release-notes/unreleased convention shows a working release process. No auth layer found in the ingress or admin crates is a real gap for anyone self-hosting without a fronting proxy, not a hypothetical one.

## 9. Sources

https://github.com/restatedev/restate (README.md, LICENSE, CLAUDE.md, Cargo.toml, docs/dev/local-development.md)
crates/bifrost, crates/log-server, crates/metadata-server/src/lib.rs, crates/partition-store, crates/worker/src, crates/invoker-impl/src/lib.rs, crates/admin/src/web_ui.rs, crates/admin/src/rest_api, crates/ingress-http/src
charts/restate-helm/values.yaml, charts/restate-helm/Chart.yaml
repository default branch head at fetch time (2026-09-29): commit a1975009e3ef98d2876dca4b21e8ef0d821fcbec
gh api repos/restatedev/restate (fetched 2026-09-29): 4485 stars, 210 forks, 431 open issues, created 2023-01-04
gh api repos/restatedev/restate/contributors (fetched 2026-09-29)
https://restate.dev (fetched 2026-09-29)
https://docs.restate.dev/concepts/durable_execution (fetched 2026-09-29)
https://docs.restate.dev/deploy/self-hosted/kubernetes (fetched 2026-09-29, returned 404)
WebSearch: "Restate durable execution funding Series A restate.dev company" (2026-09-29)
/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/00-our-vision.md
/home/womb/repos/ai-software-factory/.claude/worktrees/market-research/docs/market-research/01-report-template.md
