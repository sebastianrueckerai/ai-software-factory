# Software factory: target architecture

Status: living design document. The build plan's Stages 0 to 6 are built: the
loop from an issue to a merged pull request runs on the cluster. Sections that
describe built behaviour say so; the rest is still design. We amend this file
as the design moves, so it always holds the current design plus the
explanations behind it. Rulings live in the build ledger and are cited here by
number.

Decided so far:

- Approach A: custom Go control plane, opencode as the first worker harness
  behind the adapter contract (6.2), Codex CLI as the named successor.
- Talos Linux as the node operating system on three Hetzner Cloud machines.
- Go for all custom services.
- Forgejo plus Forgejo Actions for version control, issue tracking and CI.
- Sequenced dogfooding: hand-build a minimal factory, add a demo app as first
  customer, then let the factory work on its own repositories.

How to read: every section states the design first, then a Background part
explains the concepts behind it for a developer who is new to the operations
side.

## 1. What we are building

A largely autonomous software factory: agents turn specs, issues and telemetry
into tested, reviewed, deployed changes, with human escalation as a tool call
used as seldom as possible. Five planes in a loop:

```
signals (issues, telemetry, alerts)
   -> control plane (tasks, policy, budgets, audit)
      -> agent workers in sandboxes (opencode, per-task identity)
         -> verification (tests, security, model review, policy)
            -> merge and deploy (PRs, GitOps)
               -> telemetry -> signals
```

The fixed principles from the design conversation (see
`docs/software_factory_conversation_export.md`):

- Kubernetes is the substrate, not the orchestrator. Durable execution is
  Temporal.
- The harness is replaceable, behind adapters, talking to a model gateway.
- Policy lives outside the LLM, enforced by code and network rules.
- Identity belongs to the task, not the machine. Short-lived credentials only.
- Agents exchange artifacts, not chat. Git is the coordination mechanism.
- Human approval is a workflow state. No process waits three days for a person.
- Everything is immutable and re-seedable from Git plus object storage.

## 2. Three ways to build it

| | Approach | Verdict |
|---|---|---|
| A | Custom Go control plane on Temporal, opencode workers | Chosen. Full control over identity, policy, budgets. Most learning and portfolio value |
| B | OpenHands self-hosted as the agent platform, glue code around it | Fastest to a demo, but you learn OpenHands rather than the platform, and its roadmap becomes your architecture |
| C | Kubernetes-native: Argo Workflows instead of Temporal, no custom scheduler | Least custom code, weakest durable-execution story |

### 2.1 Approach B explained: what OpenHands is

OpenHands (formerly OpenDevin) is a self-hostable, open source agent platform.
It bundles four things into one product:

- An agent loop. A Python program that alternates between model calls and tool
  calls: run a command, edit a file, browse a page. The loop keeps going until
  the model declares the task done. OpenHands ships several agent
  implementations, the main one being CodeAct, which works from a scratchpad
  and tool feedback rather than a fixed plan.
- A runtime. An abstraction over the place the agent works: a Docker container
  by default, Kubernetes possible, remote runtimes too. Commands and file
  edits execute inside it. The runtime is disposable, the conversation lives on
  the server.
- A server and web UI. Session management, conversation history, a chat
  interface where you watch the agent work and steer it.
- A resolver mode. A headless mode that takes a GitHub issue or failing PR,
  produces a fix, and opens a pull request. This is their autonomous loop.

What OpenHands does not give us, and the reason we build Approach A:

- No task-level identity. The runtime is a container, not a cryptographically
  attested workload with a capability set.
- No policy, budget or approval enforcement. Nothing in OpenHands answers
  "may this agent call Firecrawl, and for how many euros".
- No durable multi-day orchestration. The resolver runs one issue to one PR.
  Waiting days for an approval, retrying with a stronger model, resuming with
  kept artifacts: not its model.
- The agent loop itself is theirs. Swapping the brain means swapping the
  product.

How we build the same shape with Go, reusing what OpenHands had to write:

| OpenHands part | Our equivalent | Written by us? |
|---|---|---|
| Agent loop (CodeAct) | opencode, driven headless over its JSON event stream (6.1) | No, reused. The harness is the replaceable part |
| Runtime sandbox abstraction | sandbox-manager in `factoryd`: per-task namespace, ServiceAccount, gVisor pod, network policy | Yes, Go |
| Server, sessions, history | `factoryd` task and session registry, session records in Postgres and S3 | Yes, Go |
| Web chat UI | Ops and approval console first. Interactive attach over ACP later if wanted | Yes, Go server-rendered |
| Resolver (issue to PR) | The Temporal task workflow: intake, sandbox, verification, PR, approval, merge | Yes, Go |
| Microagents (repo knowledge) | Repository context files plus MCP tools, same idea, no new component | Reused pattern |
| LLM configuration | LiteLLM behind `factory-gateway`, per-task virtual keys | Partly, gateway is ours |

The short version: OpenHands is a product that bundles the agent brain with a
small server. We keep our brains pluggable (opencode first), and spend our Go
code only on what an enterprise actually lacks: identity, policy, budgets,
audit, and durable orchestration.

### 2.2 Approach C explained: Kubernetes-native with Argo

Background first, since this whole approach rests on one Kubernetes feature.

A Kubernetes cluster runs containers in pods. Beyond that, it lets you teach it
new object types: a custom resource definition (CRD) adds a new kind of object
to the cluster API, and a controller watches those objects and acts on them.
The pattern "CRD plus controller" is called an operator. When people say a tool
is "Kubernetes-native", they mean: it is an operator, its state lives in the
cluster's own database (etcd), and you operate it by writing Kubernetes
objects.

Argo is a family of four such tools:

- Argo Workflows: pipelines as Kubernetes objects. A workflow is a YAML
  directed graph. Every node of the graph becomes a pod. The controller starts
  pods in dependency order and records results. There is a UI.
- Argo Events: turns webhooks, schedules and messages into workflow triggers.
- Argo CD: GitOps deployment. Takes a Git repository and makes the cluster match
  it. (We use Flux, the other big GitOps tool. Both are CNCF graduated.
  Argo CD leads with its UI, Flux is lighter and purely automation-driven,
  which fits agents committing to Git better. Swappable either way.)
- Argo Rollouts: progressive delivery, canary and blue-green deploys.

Approach C would encode the factory as Argo Workflows: a workflow per task,
steps for sandbox, agent run, verification, PR. No Temporal, no external
workflow database, everything inside Kubernetes.

Why it loses for us:

| Need | Argo Workflows | Temporal |
|---|---|---|
| Wait three days for a human approval | Either keeps pods alive (wastes a node) or you split the workflow and keep state somewhere else anyway | A signal. The workflow sleeps in the database, costless |
| Retry attempt 4 with a stronger model, keep artifacts from attempt 3 | Rebuild the workflow object, move state by hand | A code branch. Update, retry and continue are API calls |
| Chatty agent loop, millions of history events | Every event is etcd traffic. etcd is a coordination database, not a log store | History is its own database, built for exactly this |
| Change workflow logic while tasks are running | Painful, versioned templates, running instances do not follow | Patching and versioning are core features |
| What the workflow is | YAML plus containers | Real code (Go for us), testable like code |

The pattern we do take from Approach C: Kubernetes-native is the right shape for
stateless platform plumbing. Flux deploys everything, the Forgejo runner runs
CI jobs as containers in its dind sidecar, the sandbox is a pod. The moment
a process needs to remember,
wait or resume across hours or days, it belongs in Temporal.

## 3. Chunk 1: cluster substrate

Three Hetzner Cloud cpx42 servers (x86, eight shared vCPU, 16 GB, 320 GB
disk, 69.49 EUR per month each, fsn1): the cheapest orderable line at the
16 GB floor. The cheaper ARM cax31 was unorderable everywhere on 2026-09-24
despite the API listing it as available, and the API availability lists
proved unreliable generally: the reliable orderability test is creating and
deleting one server of the type. Three etcd votes and three Postgres
members. Talos
Linux 1.14 on all three, officially supported on Hetzner Cloud: the machine
config reaches each node as server user-data and the node boots straight into
Talos. Nodes boot from a project snapshot of the factory-built Talos image,
and the Kubernetes API endpoint is a reserved public IPv4 that survives node
replacement. Node-to-node traffic rides a private Hetzner network that costs
nothing. Cilium as the network layer: network policies with default deny, and
Gateway API for ingress. OpenTofu, the MPL fork of Terraform, creates the
servers with the official hetznercloud/hcloud provider. Flux deploys
everything that runs on the cluster from Git.

The servers bill hourly and can be deleted at any moment, so teardown and
the re-seed drill are the same command and the meter stops the moment it
runs. One platform limit shapes the sandbox design: cloud servers expose no
/dev/kvm, so gVisor runs on its systrap platform instead of the faster KVM
platform.

```
namespaces:
  platform        cnpg, temporal, openbao, litellm, cert-manager, signoz
  forgejo         forgejo, runner, container registry
  factory         factoryd, factory-gateway
  factory-agents  one namespace per task session and one per untrusted CI
                  job (factory-agents-ci-*), gVisor pods
  apps            demo app staging and prod, deployed by Flux
```

The re-seed drill, run once before Phase 1 ends:

1. `tofu destroy` the three nodes.
2. `tofu apply`: new nodes, same Talos configs from Git.
3. Flux reinstalls every workload from Git.
4. Restore Postgres from the S3 backups, restore Forgejo from its repository
   dump in S3, restore OpenBao from its S3 snapshot using the unseal key
   from the seed bundle (3.3), and point services at the object storage
   buckets.
5. Re-create the imperative state the restore does not carry: the gateway
   database role (SQL in the infra repository's README), the Forgejo
   personal access tokens, and the imperative namespace secrets. Nothing is
   duplicated into this file.

No node holds state that Git, S3 and the seed bundle do not describe; step 5
re-creates by hand the small remainder that no store carries.

Measured on 2026-09-25: the full drill took about five hours wall-clock from
the first `tofu apply` to all Stage 2 exit tests green. The substrate rebuild
(new servers from the snapshot, bootstrap, Cilium) took about 45 minutes, the
Postgres recovery from the S3 catalog about 9 minutes, and the remainder went
to Forgejo, the repositories, Flux and the data restores. The barman plugin
refuses to restore into a non-empty WAL archive, so each rebuild reads one
generation and archives to a fresh sibling. Two committed lines carry the
policy: the recovery source (`serverName` on the Cluster's `externalClusters`)
always names the newest generation that holds a completed base backup, and the
Cluster's own archive moves to the next sibling. Before any teardown that
should preserve Postgres state, a completed base backup of the live generation
must exist in S3. A rebuild is green only after the restored repositories'
HEADs match the last pushed commits: a stale-source restore fails the gate
instead of passing silently.

The second rebuild (2026-09-26, for the worker plane) added five rules. The
node image is a project snapshot built from a Talos Image Factory schematic
that bakes in the gVisor system extension; an in-place `talosctl upgrade`
does not add extensions, so a changed schematic means a new snapshot and a
server replacement. The snapshot build downloads the factory image on the
seed machine, verifies it with `xz -t`, and streams it over ssh to a fresh
rescue system; downloading inside the rescue system corrupted the image
twice. The recipe is committed in the infra repo as `talos/build-snapshot.sh`
beside `talos/schematic.yaml`, and the snapshot carries a `schematic` label
that the OpenTofu image selector requires, so a snapshot without the
extension can never be picked. Forgejo's `SECRET_KEY` is recorded in the
seed bundle and applied as an imperative secret, because the restored
database holds Actions secrets encrypted under it, and a fresh key breaks
every CI run (Ruling 85: the key once lived only in the cluster and died with
it). After any key change the Actions secrets are stored again. Every push made while Forgejo is down goes to GitHub only, so right
after the Forgejo restore every repository is fast-forward pushed to Forgejo
before Flux's first sync; otherwise Flux converges to the dump's stale tree.
Nodes installed from the schematic image register with the control-plane
taint, so the drill removes it after registration.

The third rebuild (2026-09-26 to 27, before the loop was closed) took about
21 minutes from the first `tofu apply` to every Stage 2 exit test green and a
task run end to end, against about five hours in the first drill. Nothing
got faster by itself: every trap the first two drills hit was pre-solved in
the recipe. The step-by-step recipe lives in the infra repository's README
and seed-bundle document; what the restores do not carry (the Forgejo
webhook secret, the fresh CI registrar token, the Actions secrets) is listed
there as re-seed items.

Bootstrap breaks one circular dependency: Flux deploys everything from Git,
but the Git server, Forgejo, is itself deployed by Flux. Step zero, run once
from the seed machine: apply the bootstrap slice, CNPG plus Forgejo, by hand,
restore Forgejo's repositories from the S3 dump, then let Flux take over
everything else.

Management access: two firewall layers, both declarative and both driven
from the same tfvars values. The outer layer is the Hetzner Cloud firewall
on each server's public interface: the Kubernetes and Talos API ports accept
the home address only, ports 80 and 443 accept the world, everything else
drops, and private-network traffic passes unfiltered. The inner layer is
Talos's own nftables ingress firewall, configured as `NetworkRuleConfig`
documents in the machine configs, with the same allowlist plus the
node-to-node ports for the private network. The outer layer stays editable
from the Hetzner console even when a node is unreachable, which makes a
mistyped home address a console fix rather than a rescue boot. A self-hosted
VPN (headscale) is the named upgrade if you need roaming access later.

Operating note, standing reminder: the cluster costs about 210 EUR per month
plus storage and model spend. Cloud servers bill hourly and deletion stops
the meter, and the re-seed drill is the off-switch: teardown is
`tofu destroy`, comeback is the seed bundle plus Git plus S3. At a stopping
point, take a completed base backup of the live Postgres generation first.

### 3.1 Storage strategy

These are three alternatives for the same job. Pick one, they are not stages.

**Option 1, my pick: local disks, Postgres replicates itself, artifacts on S3.**

Background. A pod's files vanish when the pod dies or moves. A persistent
volume (PV) is the cluster's disk object: a pod claims one (a PVC, persistent
volume claim) and gets a disk that outlives the pod. A "local" PV is a disk
physically inside one node. It is fast (no network hop) but bound to that node:
if the node dies, that disk is unreachable until the node returns.

The services on this cluster whose loss of data matters are the Postgres
databases (tasks, sessions, keys, audit) and Forgejo's git repositories, which
are plain files on a local PV. Postgres is covered by CNPG's S3 backups,
Forgejo by a nightly dump of its repositories to S3, and OpenBao by its
snapshots: one backup path per data service, no cluster-wide backup tool.
Everything else is either stateless and rebuilt from Git, or blob-shaped and
already on S3-class storage. SigNoz's local history is the one accepted loss.

CloudNativePG is an operator for Postgres. You write a Kubernetes object that
says "Postgres, three replicas, this much disk, backups to this S3 bucket". The
operator then runs one primary and two replicas and handles the hard parts:
failover when the primary dies, backups, upgrades.

Streaming replication is how those replicas stay current: Postgres writes every
change to its write-ahead log (WAL) before it touches the data files. Replicas
receive that log continuously and replay it. The effect: every committed write
exists on two or three nodes' local disks within moments, without any shared
storage. If a node dies, the operator promotes a replica on a surviving node.

So option 1 means: no shared storage layer at all. Each Postgres member gets a
fast local disk, durability comes from Postgres itself, disaster recovery comes
from the S3 backups. Least to operate, and the replication lives in the one
place that already understands the data.

**Option 2: Longhorn.** A distributed block storage layer. It takes the disks of
all nodes and offers every pod a network disk that is transparently replicated
to two or three nodes, with snapshots. The right tool when you run stateful
software that cannot replicate itself and needs plain disks. Costs: an extra
layer to operate, every write crosses the network to the replica nodes, and if
the application (Postgres) also replicates, you store everything twice.

**Option 3: Rook-Ceph.** Ceph is the big open source storage cluster: it serves
block volumes, a shared filesystem and S3-compatible object storage from the
same pool of disks, self-healing across node failures. Rook operates Ceph on
Kubernetes. This is the enterprise answer and the fussiest thing on exactly
three nodes: it wants headroom for its monitors and OSD daemons, and a full disk
anywhere triggers rebalancing that you get to watch nervously.

Decision (confirmed 2026-09-24): option 1, revisited only if stateful services
appear that cannot replicate themselves.

### 3.2 Image registry

Forgejo ships a container registry, S3-backed. We use it for our own images
(factoryd, gateway, sandbox image, demo app). Escape hatch: Harbor, the
enterprise registry with vulnerability scanning, is a later drop-in if needed.

### 3.3 The seed bundle

Re-seeding restores from three sources. Git holds all configuration. S3 holds
the data: database backups, artifacts, and OpenBao's encrypted snapshots. The
third source is a small offline bundle holding what Git and S3 cannot hold:

- the Hetzner API token,
- the S3 access keys,
- the Namecheap account access, registrar and DNS for
  `aisoftwarefactory.world`,
- the model provider API keys,
- the OpenBao unseal key.

The bundle lives in an offline password manager plus a printed copy. Bootstrap
after a full wipe: Terraform creates the nodes from the seed's Hetzner token,
Flux applies every workload, OpenBao restores from its S3 snapshot with the
seed's unseal key, and any credential newer than the last snapshot re-enters
OpenBao from the seed by hand. No secret the seed holds ever enters Git.

## 4. Chunk 2: platform services

| Concern | Component | Note |
|---|---|---|
| Postgres | CloudNativePG | One cluster, one database per service, S3 backups |
| Durable execution | Temporal, official Helm chart | MIT licence, chart 1.0 since April 2026 |
| Secrets and dynamic credentials | OpenBao | Fork below |
| Model routing | LiteLLM OSS proxy | Budgets, virtual keys and the key API are OSS. JWT auth is not, see 5.2 |
| Object storage | Hetzner Object Storage | Fork below |
| Observability | SigNoz | Fork history below, decided |
| Telemetry pipeline | OpenTelemetry Collector | Agents and services emit OTel; the collector routes |
| TLS certificates | cert-manager with Let's Encrypt | One per public endpoint, HTTP-01 via Gateway API, see 3.4 |

### 3.4 Public DNS and TLS

The domain is `aisoftwarefactory.world`, registered at Namecheap, and DNS
stays on Namecheap. No second DNS provider, no extra account, no API token to
manage.

The design that makes this work: certificates come from the HTTP-01 challenge,
not DNS-01. cert-manager, the in-cluster equivalent of certbot, proves control
of a hostname by serving a token on port 80 through the cluster's own
Gateway. Its Gateway API solver is a core feature, and no DNS API is involved
anywhere. One certificate per public hostname instead of one wildcard for the
zone, which costs nothing here: the endpoint list is short and known, and
renewal is automatic either way.

What we give up, knowingly. No wildcard certificate, so each hostname needs
its Gateway listener before its cert exists: true for a handful of names. No
record automation: Namecheap's API is whitelisted-IP only, and its Terraform
provider is community-maintained with unclear 2026 health, so records are
made by hand in the dashboard. They change once per re-seed, when new nodes
get new IPs. A few minutes of clicking per rebuild, acceptable for a handful
of A records.

The named upgrade, if record churn ever appears: move DNS hosting to
Cloudflare's free tier. The registrar stays Namecheap, the switch is a
nameserver change, and it buys the API every ACME and Terraform tool speaks,
wildcard certificates via DNS-01, and external-dns support. Not needed at
this scale.

The firewall rule stands: ports 80 and 443 open to the world for the Gateway
endpoints, port 80 serving only the ACME challenge and a redirect to 443,
while the Talos and Kubernetes API ports stay allowlisted to the home IP.

### 4.1 Object storage: Hetzner Object Storage versus running S3 ourselves

Background. Object storage is the simplest storage API there is: HTTP calls
that put and get immutable blobs ("objects") in named buckets. S3 is Amazon's
name for it. The S3 API is the de facto standard: every backup tool, every
registry, every analytics tool speaks it. "S3-compatible" therefore means:
works with the entire ecosystem, swappable by changing an endpoint and
credentials. This is where session records, log archives, backups, container
images and build artifacts live.

Hetzner Object Storage is Hetzner's S3-compatible service. They run the
servers, the replication and the durability. We pay per gigabyte stored. Risks:
an outage of their storage blinds the factory's access to artifacts (the
cluster itself keeps running), and the data sits outside our boxes.

Running S3 ourselves means an S3-compatible server on our nodes. Zero external
dependency, but we become the durability layer: replication across nodes,
capacity management, backups, all ours.

Why not the obvious self-host answer, MinIO: in May 2025 MinIO removed the web
management console from its free community edition and moved it to the paid
AIStor product. Maintainers confirmed the removals are permanent
([GitHub issue #21326](https://github.com/minio/minio/issues/21326)), and 2026
coverage reports the open source repository itself was archived, with the
project pivoting to the commercial product. That is exactly the gating pattern
this project exists to avoid. If we ever move object storage onto our own
nodes, the candidates are SeaweedFS (permissively licensed, closest drop-in)
or Garage (lightweight, small-cluster focus), not MinIO.

Decision: Hetzner Object Storage. It is the reference hardware from goal.md,
and the S3 API is the escape hatch to any other provider or to SeaweedFS.

What switching later actually costs, so the promise stays honest: every tool
that reads S3 (CNPG backups, the registry, the artifact store, SigNoz retention)
only needs a new endpoint and credentials. The API is the standard. The data
itself does not move by itself: a switch includes one bucket-sync copy of what
we choose to keep, and we stick to the core S3 operations (put, get, list,
delete) plus basic lifecycle rules, because providers differ in the fringes of
the API, not the centre.

### 4.2 Observability: the Grafana stack versus the unified challengers

Background. We need four observability signals: metrics (numbers over time:
CPU, request rates, cost per task), logs (text events), traces (one request's
path through services), and dashboards plus alerting on top.

The Grafana stack ("LGTM": Loki for logs, Grafana for dashboards, Tempo for
traces, Mimir or Prometheus for metrics) is the composed default: four
independent components, each best-of-breed, glued by open standards. Every
integration on earth supports it. Its cost is operational: four systems to run,
and the consensus in 2026 comparisons is that it has the steepest learning
curve of the options.

What you heard about is the unified wave: products that store all signals in
one database and give you one UI.

- SigNoz: the one you had heard of, and the most adopted challenger,
  positioned as the open source Datadog. One ClickHouse database for traces,
  logs and metrics, OpenTelemetry-native, alerting built in. AGPL licence,
  which costs us nothing as a self-hosted internal deployment: AGPL only bites
  distributors of modified versions.
- OpenObserve: single Rust binary, all three signals, SQL queries, S3-native
  storage, focused on low cost. The lighter challenger.
- VictoriaMetrics: often named in the same breath, but it replaces only the
  metrics database (a Prometheus successor), not the whole stack.

Decision (confirmed 2026-09-24): SigNoz. One database, one UI, one alert
engine, and OpenTelemetry as the native ingest. The k8s-infra chart ships an
OTel collector that scrapes Kubernetes and application metrics and forwards
them, so exporters keep working. Retention beyond local disk goes to S3 via
ClickHouse tiered storage.

The accepted trade: Grafana is the name an enterprise reviewer recognises
without explanation, SigNoz is not. We take the simpler operation on small
nodes over that recognition, and the OTel ingest format keeps the exit open:
moving to the Grafana stack later re-points collectors, it does not re-instrument
services. SigNoz alert webhooks feed the signals intake exactly as Prometheus
alerts would have.

### 4.3 Secrets: OpenBao versus Vault

OpenBao is the Linux Foundation fork of HashiCorp Vault, started when Vault
changed its licence to BSL. Same API, MPL licence, community-governed. Vault
itself remains the more battle-tested product with the bigger ecosystem.

Decision (confirmed 2026-09-24): OpenBao, because licence risk on the secrets backbone is the one
place this project should not carry it. The API being identical means the swap
to Vault is a configuration change if OpenBao ever disappoints.

One operational cost, named: auto-unseal needs a KMS we do not run, so
unsealing after a full restart is manual, with the seed bundle's single key
(OpenBao 2.6.3 rejects a threshold-one multi-share split). Node
reboots are rare on Talos, and a few minutes of human time is the accepted
price.

### 4.4 Model and tool providers

The seed bundle holds keys for DeepSeek, Alibaba (Qwen via DashScope), z.ai
(GLM), Replicate, Firecrawl and fal.ai. These split into two groups at the
gateway.

Chat models reach LiteLLM as upstreams: deepseek, qwen, glm. The first alias
table: `coding-cheap` maps to the DeepSeek and Qwen tier, `coding-frontier` to
the GLM frontier tier, `review-frontier` to the strongest of the three,
measured in Phase 2. Anthropic and OpenAI stay out at the start, deliberately:
the factory should run on the providers its owner actually uses daily.

Replicate, Firecrawl and fal.ai are not chat models for our loop: they are paid
capabilities. They enter as connectors on the capability gateway with per-task
request and euro caps, the exact spend-limited SaaS case from the baseline
conversation.

## 5. Chunk 3: the control plane

One Go module, two binaries.

### 5.1 The two services

`factory-gateway` is the enforcement point. Every call an agent makes, to a
model or to a tool, passes through it:

```
agent pod, holds only a projected ServiceAccount JWT
   |
   v
factory-gateway
   1. verify the JWT against the cluster's OIDC issuer
   2. map service account task-<id> to the task row in Postgres
   3. check capability, budget and approval state
   4a. model call: forward to LiteLLM under a per-task virtual key
       the gateway minted itself. No key material enters the sandbox
   4b. tool call: proxy to the MCP server, or mint a short credential
       from OpenBao for the narrow case where the agent must connect
       itself
   5. audit every decision to OTel and Postgres
```

`factoryd` is everything else:

- intake: webhooks from Forgejo, an authenticated API, later SigNoz alerts
  and escalation events
- the task registry: priority, required capabilities, risk class, cost ledger
- the Temporal worker running the task lifecycle workflows, and the heal
  pass that keeps rows, workflows and Forgejo in step
- the CI spawner for the untrusted runner (7.1)
- the API and the UI (server-rendered Go, htmx; a SPA is the fork if the
  console outgrows it)
- human login via Forgejo OAuth2. Keycloak later if an enterprise SSO story
  needs it, not before.

Built in Stage 6: intake, the issue record, the workflow and the heal pass.
The console is Stage 7.

**Intake.** Two doors, one record. Forgejo posts webhooks to
`/webhooks/forgejo`; factoryd checks the HMAC-SHA256 signature in
`X-Forgejo-Signature` against the shared secret before it parses a byte of
the body, answers 401 on a mismatch, and claims the delivery id so a
redelivery is a no-op. An issue labelled `agent` becomes an agent task, one
labelled `human` a human-lane task; bot-authored and unlabelled issues are
ignored. Priority is the higher of the `priority/p0..p3` and
`severity/critical..low` labels. The second door is `POST /tasks` with a
bearer token, for callers that are not Forgejo: it clamps the budget, files
the issue itself (the body says it was filed by factoryd intake), then stores
the row. Either way every task is an issue, so the discussion, the state and
the audit trail share one record.

**Labels.** factoryd creates the label set at boot and keeps exactly one
`state/*` label on each task's issue: `state/queued`, `state/running`,
`state/waiting-human`, `state/in-review`, `state/done`, `state/failed`.
Forgejo's own issue list therefore shows the board's picture until the
console exists.

**The human lane.** A `human` issue gets a task row in `waiting-human` and no
workflow. Closing the issue finishes it `done`. Agent escalations land in
the same state (6.6).

**The workflow.** factoryd runs the Temporal worker itself, on task queue
`factory-tasks`, one workflow `task-<id>` per agent task. It links the issue,
runs up to three sessions, opens the pull request, waits for the checks
(45 minutes at most) and then waits for a person: a merge finishes the task
`done`, a pull request closed without merge or a closed issue finishes it
`failed`, a trusted change request runs another session with the request as
findings. Attempts start on `coding-cheap`; red checks or a repetition trip
move the next attempt to `coding-frontier` (Ruling 86). The wall-clock cap
counts the agent's working time across attempts, not time since intake,
because a PR image build alone takes longer than a session (Ruling 93);
human waits have no timer, since a Temporal wait costs nothing. Terminal
signals cancel a running session or check wait at once instead of after it.
Each step appends a line to the task's timeline, `sessions/<id>/timeline.jsonl`
in S3, served by `GET /tasks/{id}/timeline`: intake, sessions with their
parents and findings, supervisor decisions, the pull request, every signal,
the final state. `Finish` revokes the credentials, sets the final label,
comments the reason, closes a failed task's pull request and deletes the
fork branch; it retries without limit, because a task stuck half finished
is worse than a slow one.

**Heal pass and Reconcile.** Forgejo never retries a failed webhook
delivery, so a signal that arrives while factoryd is down is lost unless
someone asks again. The heal pass runs at boot and every minute: it starts
a workflow for every unfinished agent task that has none (Temporal refuses
duplicates), re-reads Forgejo for every task in review or waiting on a
human (pull request merged or closed, issue closed, trusted comments newer
than the last one seen) and signals what it finds exactly as the webhook
path would, and prunes delivery ids older than 30 days. Every workflow run
begins with a `Reconcile` activity that reads where the task really stands,
so a restarted workflow adopts an open pull request instead of starting a
new session, and finishes a task whose pull request was merged while no run
existed.

### 5.2 Why the gateway holds the LiteLLM keys

Verified 2026-09-24: LiteLLM's OSS proxy has budgets, spend tracking, virtual
keys and the key generation API. JWT authentication, including mapping
Kubernetes identities to keys, is Enterprise-only, priced in the hundreds of
dollars per month.

So the gateway terminates the identity instead. The agent presents its
ServiceAccount JWT, the gateway validates it against the cluster issuer, and
forwards the call to LiteLLM using a per-task virtual key it created through
the OSS key API. The sandbox never holds any LiteLLM credential. One service
now answers "what may this agent do" for models, tools and databases alike.

### 5.3 Policy

Capability policy is data: rows in Postgres, edited through the UI or API,
versioned in Git. Enforcement is code in the gateway. The hierarchy, from the
baseline conversation:

```
task requires capability X in environment E
   -> task row: granted / requires approval / forbidden
   -> gateway enforces on every call, audit row for every decision
   -> network policy makes bypass unreachable (the sandbox can only
      route to the gateway and Forgejo git, plus named registries)
```

An OPA sidecar is the named upgrade when rules multiply beyond what Go code
reads well. Policy never lives in a prompt.

The first capability class is deliberately one: `coder`, holding repository
read, branch write, model aliases and allowlisted tools, nothing else. The
classes from the baseline conversation (analyzer, integration-tester,
release-agent, prod-operator) arrive one per phase as the loops that need them
come online.

### 5.4 Cost ledger

LiteLLM tracks model spend per virtual key. The gateway tracks tool spend per
call. `factoryd` aggregates both per task and per day, with hard caps that the
gateway enforces by refusing the next call.

The gateway books each model call's own cost atomically into the task row:
the `x-litellm-response-cost` header for plain calls, and the `usage.cost`
field of the final chunk for streams, which the gateway forces on. LiteLLM's
`x-litellm-key-spend` header cannot serve: it is the cached spend before the
call, zero on every stream. After a task finishes, factoryd settles its spend
upward to the total LiteLLM recorded on the task's keys, which covers
abandoned streams. LiteLLM writes that total 60 to 80 seconds late, so a
settlement loop, apart from the runner's claim loop, re-settles every task
finished within the last hour once a minute. Each pass lists LiteLLM's keys
once, and the raise never lowers spend. The per-key `max_budget` stays the
hard backstop.

### 5.5 Cloud-resource commissioning

Agents may need a database, a VM or a bucket for a task. They get it through
gateway tools, never through a provider key.

- **A separate provider project.** Agent resources live in their own Hetzner
  project. Only the gateway holds its API token. Hetzner tokens cannot be
  scoped below a project, so the gateway calls the API itself instead of
  handing out credentials. The cluster's own project stays out of agent
  reach, and the garbage collector never touches it.
- **An envelope per project.** When a project starts, a human sets its
  resource envelope from a standard default: a monthly euro cap, the
  allowed resource types and sizes, a maximum count, and a maximum lease.
  Each task draws from the envelope under its own cap.
- **More needs a human.** A request beyond the envelope becomes an approval
  card with the resource, the reason and the cost per month. Approval
  widens the grant for that task or for the project.
- **Registry first.** Before each create, the gateway writes a registry row:
  task, project, session, resource type, price per hour and lease expiry.
  The provider resource carries the task and project as labels. The console
  lists every resource by project and task with its cost so far.
- **Leases end orphans.** Every resource has a lease, by default the task's
  wall-clock cap plus a margin. Task completion deletes the task's
  resources. If the agent or factoryd dies, the lease still expires and the
  garbage collector deletes the resource. A human can promote a resource to
  project-owned, for example a staging database, and it then counts against
  the project's monthly cap without a lease.
- **The collector trusts the registry.** Every few minutes it deletes
  expired leases, deletes anything in the agent project the registry does
  not know, and marks registry rows whose resource vanished. The worst-case
  orphan cost is one lease length times the resource's hourly price.
- **Reachability.** While a lease lives, the task's egress policy admits the
  resource's address, so the sandbox can use it.
- **Cost comes from the provider's price list.** Each connector reads its
  provider's price catalogue through the API. Hetzner's is one call,
  `GET /v1/pricing`, and it prices every resource type they sell: server
  types per location, primary and floating IPs, volumes and snapshots per
  GB and month, load balancers, backups and traffic (verified 2026-09-27; a
  cpx42 in fsn1 is 0.1114 EUR per hour). Before a create, the gateway prices
  the request: hourly price times the lease, plus the provider's minimum.
  That reserved amount counts against the task cap and the project envelope
  at once, and the registry accrues the real cost per hour while the
  resource lives. Resources priced by time (servers, IPs, volumes, load
  balancers, buckets by size) are known in full up front. Resources priced
  by usage (functions, traffic, requests) are not: they get an estimate cap
  in the envelope, and the connector reconciles the estimate against the
  provider's billing or usage API afterwards. DigitalOcean, AWS and GCP all
  publish price lists through their APIs (sizes, the Price List API, the
  Cloud Billing Catalog), so the same connector shape fits them later.
  Hetzner comes first. The standard envelope covers what tasks need most:
  servers, a fixed IP, block storage and a bucket.

### 5.6 The console board

The console shows a kanban board. Forgejo has kanban boards in its web
interface, but a card's column is its own record, not a view of the issue's
state: closing or labelling an issue leaves the card where it is (open
requests forgejo#773 and #4462), and the REST API has no endpoint that adds
an issue to a board or moves a card (checked against the swagger of a
16.0 instance on 2026-09-27: no project paths, no project field on issue
create or edit). Only a person dragging in the browser moves a card.
Forgejo has no plugin system either. Its only customisation is template
overrides, which the project documents as unsupported and likely to break
on any update, or a source patch, which means our own fork and build on
every security release. The upstream projects API is under way: its
groundwork merged on 2026-09-19 (forgejo#13700), the endpoints follow in
later pull requests with no date. So the console, a web application we
build anyway, draws the board itself from factoryd's task table. When the
Forgejo API lands, factoryd mirrors columns onto a Forgejo project the same
way it mirrors state onto labels today, and both boards show the same
picture:

- **Agent lane.** One card per task, in columns derived from factoryd task
  states: queued, running, waiting on a human, in review, done, failed.
  Cards move by themselves.
- **Human lane.** Approvals, escalations, and tasks a human files for
  themself. Closing a card or pressing approve signals the waiting workflow.
- **New task.** The button files a Forgejo issue labelled `agent` or
  `human`. Every task is an issue, including those raised by SigNoz alerts
  and escalations, so there is one record with its discussion. factoryd
  mirrors task state onto issue labels through the issues API, so Forgejo's
  own issue list shows the same picture.

Built so far: the issue record, the `state/*` labels and the human lane
(5.1). The board and the new-task button come with the console in Stage 7.

## 6. Chunk 4: the worker plane

One task, one namespace, one ServiceAccount `task-<id>`, one pod.

### 6.1 Choosing the harness

Decision (surveyed 2026-09-24): opencode is the first harness, Codex CLI the
named successor. The reasoning is written down so the next re-evaluation
argues with evidence, not memory.

The survey scored the live field against the four requirements in 6.2:

| Candidate | Verdict | Why |
|---|---|---|
| opencode | Pick | The only candidate passing all four with a first-class programmatic surface: `run --format json` for one-shot jobs, `serve` with a REST API and SSE event bus for long-lived runs, whole config injectable via the `OPENCODE_CONFIG_CONTENT` env var. MIT, official image, largest community, so DeepSeek, Qwen and GLM quirks get fixed fastest here |
| Codex CLI | Successor | Passes all four: `exec --json` JSONL plus an app-server JSON-RPC mode for long-lived driving. Apache-2.0. Risk: it is deprecating the chat wire API in favour of the Responses API, which our proxy would have to speak |
| goose | Fallback | Apache-2.0 and the best governance in the field, a Linux Foundation project. No machine-readable event stream yet, only a structured final result |
| pi | Out | The author rejects MCP by design. Requirement 3 fails |
| Hermes | Out | A self-improving assistant shaped for chat platforms: heavy, no clean one-shot mode. Wrong tool, not a bad one |
| OpenClaw | Out | A persistent personal-agent gateway for messaging channels, not a disposable coding worker |
| Gemini CLI | Out | Requirement 2 fails: it speaks Google's own protocol, not OpenAI-compatible endpoints |
| aider | Out | No MCP, and development stalled since May 2026 |
| OpenHands | Out | Passes the requirements but is Docker-centric and drifting towards being a platform, the exact failure mode Approach A exists to avoid |

The weak spot is unchanged from before the survey: one company governs
opencode, it moved the repository once already (SST to Anomaly) and it is
layering paid services on top. MIT licence, per-provider BYO keys and the
adapter contract keep the exit real: the day any gating starts, the Codex
adapter lands and nothing else changes.

DeepSeek's own harness (dsh) sits on the watchlist: MIT, plugin architecture,
any OpenAI-compatible endpoint, but a weeks-old developer preview. Re-evaluate
when it documents a headless mode.

Whatever runs gets its repository pinned and its version pinned in the
sandbox image. Single-company governance anywhere in the chain is a reason
the adapter seam stays sharp.

### 6.2 The adapter contract

`factoryd` knows nothing about harnesses. It knows this Go interface:

```go
type Harness interface {
        Prepare(ctx context.Context, env SandboxEnv, brief TaskBrief) error
        Run(ctx context.Context, brief TaskBrief, emit func(Event)) Result
}
```

`TaskBrief` is the whole task as data: objective, repository and SHA, issue
context, findings from parent sessions and artifact paths. Capability hints
stay out of the brief: capabilities are policy, enforced by the gateway, not
something the harness is told.
`Event` is the normalized stream: model calls with alias and cost, tool calls
with status, file changes, commands with exit codes, checkpoints, and the
final result. Each adapter maps its harness's native output onto this set.
Lossy mapping is acceptable: the git diff and the artifact store are the ground
truth, the event stream is for observability and the audit trail.

A harness is adaptable at all if it meets four requirements:

1. Headless execution: it runs without a human at a terminal.
2. A configurable model endpoint, OpenAI or Anthropic compatible, so its
   traffic routes through the identity proxy.
3. Configurable tools, ideally MCP servers, so tools route through the proxy
   too.
4. Programmatically readable session output.

Requirement 2 is the filter that bites: a harness that only talks to its own
cloud cannot run inside our identity model. Swapping harnesses means a new
adapter file plus a container image. Workflows, gateway, policy and audit do
not change.

### 6.3 The identity proxy

The adapter doubles as the identity proxy, and this closes the one wiring gap
the design review found. A harness makes its own model and tool calls, but it
cannot present the pod's projected ServiceAccount JWT: that JWT is a file the
kubelet rotates, and harnesses have no mechanism to attach it to requests. So
the adapter listens on localhost. The harness's provider configuration points
at the adapter, and its tool servers route through it too. On each request the
adapter re-reads the current token file, attaches the fresh JWT, and forwards
to `factory-gateway`. Model and tool calls stay entirely on that identity
path.

Git is the one path outside the gateway, and the agent never holds its
credential. For every session factoryd mints two Forgejo tokens for the
`factory-agent` account and revokes both when the session ends: one reads
the upstream repository, the other writes only to the account's fork of it,
`factory-agent/ai-software-factory-code`, which factoryd ensures at boot
(private, Actions off). The worker, running as pid 1 in the pod, clones from
upstream with the read token before the harness starts, then runs the
harness in its own process group without either token in its environment or
in `.git/config`. When the harness finishes, the worker kills and reaps every
other process in the pod, fetches the agent's commits into a fresh repository
it owns with hooks and repository config disabled, and pushes
`factory/<id>` to the fork from there. factoryd then opens the pull request
`sf:main ← factory-agent:factory/<id>`. A token in the agent's repository
leaks through git hooks, `core.fsmonitor` and lingering processes that read
`/proc/<pid>/environ`, hence the clean repository.

The fork exists because of the CI job token. On a pull request from a branch
of the same repository, Forgejo hands the Actions job a token that can
write to that repository; a probe job pushed a branch with it. On a pull
request from a fork, Forgejo gives the job a read-only token and no secrets
by design, which is exactly what the untrusted runner must hold (Ruling 97).
Branch protection on every branch was the rejected alternative: it stops git
pushes, not API writes with the same token.

A pull request's workflows come from its head, so an agent that edits a
workflow file would choose what the runner executes. The worker therefore
refuses to push when `.forgejo`, `.gitea` or `.github` differs between the
base and the head, comparing the directories' tree entries
(`git rev-parse <commit>:<dir>`) in its own repository rather than parsing
file names, which non-ASCII names and renames defeat; factoryd re-checks
the same three directories through the compare API before it opens the pull
request, and fails the task (Rulings 90, 100). The worker's check is the one
that matters for a follow-up push to an open pull request, which triggers
the head's workflows before factoryd sees it. Forgejo offers no server-side
rule that blocks workflow edits yet permits branch creation: its protected
file patterns treat a new branch as changing every file. Everything stays
attributable: model and tool calls by the task identity, git pushes by the
task tokens.

### 6.4 Sandbox hardening

Sandbox hardening:

- gVisor RuntimeClass: the container runs under a userspace kernel, not
  the host kernel. The runtime comes from the gVisor system extension baked
  into the node image by the Image Factory schematic, on the systrap
  platform because cloud servers have no /dev/kvm. The machine config only
  adds the `user.max_user_namespaces` sysctl.
- Non-root, dropped capabilities, read-only root filesystem.
- Cilium network policy: default deny egress. Allowed: `factory-gateway` on
  its port, Forgejo git, and the Go module proxy and checksum database
  (`proxy.golang.org`, `sum.golang.org`) on 443. DNS answers only those names
  (`matchName`, not a wildcard, which would open a DNS exfiltration channel).
  Nothing else, no cloud metadata endpoint.
- The sandbox image carries the Go 1.25 toolchain, checksum-pinned and the
  same version as the runner image, with `GOPROXY` pinned to the proxy and no
  `direct` fallback. A registry joins the list by name only with the
  toolchain that needs it, and Go qualified: without it an agent cannot run
  the tests its pull request checks will run, and the exit-test agent spent
  an attempt trying to install it (Ruling 99). The caveat, accepted: the
  module proxy fetches any public module path on request, so an agent could
  leak data by requesting a path that encodes it. The budget, the session
  record and the absence of any secret in the sandbox bound what there is to
  leak.
- Per-task namespace with a ResourceQuota and LimitRange, container limits,
  and size-capped emptyDir volumes.
- factoryd creates task namespaces through a narrow ClusterRole, and a
  ValidatingAdmissionPolicy confines it to `factory-agents-*` namespaces with
  the restricted Pod Security label, gVisor pods without an automounted API
  token, ClusterIP Services only, and a RoleBinding only to itself. Two
  exceptions serve the untrusted runner (7.1): a `factory-agents-ci-*`
  namespace may carry the baseline label instead, and in such a namespace
  root is admitted only for the pod labelled as the BuildKit build pod.
  Every other container, init container and ephemeral container of every
  pod factoryd creates must run as non-root, judged per container, not just
  at pod level. Shape checks apply to every pod regardless of labels: no
  privileged container, no host network, PID or IPC namespace, no added
  capabilities, no hostPath volume. The policy fails closed.
- factoryd itself runs under default-deny egress, because it holds the
  LiteLLM master key, the bot account and the S3 keys: only the API server
  (by its injected address, not a DNS name), Postgres, Temporal, LiteLLM,
  Forgejo and S3 answer.
- Upgrade path for stronger isolation: microVMs on bare-metal KVM nodes,
  one kernel per pod, for agent sandboxes and CI jobs alike (7.2).

### 6.5 Session records

Session records stream out while the sandbox lives: prompts, tool calls,
output, files touched, commits, cost. Full history to S3, compact restart state
to Postgres. A dead session resumes as a new pod with its findings and its
parent session ID, not as a resurrected process.

### 6.6 Supervision

Two layers. Cheap detectors in factoryd read the event stream and decide
when to call the supervisor. The supervisor, a model, decides what to do.

An agent that circles rarely repeats itself word for word. It tries the same
idea in new words, so no deterministic check catches every circle. What a
deterministic check can catch cheaply is the trace a circle leaves in the
event stream. The detectors, each a few lines over the events factoryd
already stores:

- **Stall.** No harness events for a set interval.
- **Reading without writing.** A set number of tool calls with no file
  change. An agent that only reads, greps or reruns a test is stuck too.
- **The same failure again.** The same command fails with the same error
  signature (output with timestamps, addresses and durations stripped) a
  set number of times in a row. This is the most common circle: edit, test,
  same failure, edit, test, same failure.
- **The same call again.** The same tool with the same arguments, repeated.
- **Flip-flop.** A file returns to a content it had before, after other
  content in between.
- **Churn without progress.** Many file changes while the diff against the
  base commit stops growing and no new test passes.
- **Half way.** The task passed half its wall-clock cap or half its budget.

A trip calls the supervisor: the strongest model configured, under its own
`supervisor` alias. It gets the brief, the session record and a progress
digest: the commands run with their outcomes over time, the files touched
with edit counts, the last error signatures and the diff so far. That digest
is what a human reviewer would read to see a circle that the detectors
cannot name. The supervisor picks one action: continue, redirect (a new pod
resumes with the supervisor's guidance as findings), retry on a stronger
model, or stop and escalate to a human. It never raises a cap or a budget.
Only a human does that. Most tasks never trip a detector, so the supervisor
costs little.

As built (Stage 6), with the defaults that tuning starts from:

- **The same failure** keys on the command plus its normalised output: the
  last 20 lines with timestamps, clock times, line numbers, temp paths, hex
  addresses, durations and pids stripped, hashed together with the command.
  Three in a row, each after a file change, trip it; a pass of that command
  or a new signature resets the count, and a rerun with nothing changed is
  no evidence. Agents like to run `cmd; echo $?`, which exits 0 whatever
  `cmd` did, so a command that can mask its exit status (`;`, `|`, `&`, a
  second line, `$?`) is judged by its output, not its exit code. The first
  live loop tripped nothing until this was in.
- **The same call** is the same tool with the same arguments, compared by a
  hash of their canonical JSON, four times in a session.
- **Flip-flop** compares each file's content hash with the hashes it had
  before.
- **Churn** is 15 file changes since the diff against the base last grew,
  with no failing command turning green in between. The worker measures the
  diff every 15 seconds from a repository of its own, never running git in
  the agent's repository, so an agent's git config cannot run code there.
- **Reading without writing** is 24 tool calls and commands without a file
  change. **Stall** is five minutes without an event.
- **Half way** fires once per task, not once per session: the flag lives on
  the task row, so a restart or a new session cannot fire it again.
- The **wall-clock cap** (20 minutes of agent time by default) ends the
  session without a call, because the supervisor could only ask to continue,
  which would raise the cap.

The supervisor runs inside the session activity, because `continue` needs the
live session (Ruling 87). It must answer strict JSON with one of the four
actions, a redirect carrying guidance and an escalation carrying a reason; an
unreadable answer escalates. A session gets at most three supervisor calls,
and the next trip escalates without one. Each call runs under a per-task
`supervisor` virtual key whose `max_budget` is the task's remaining budget,
counting spend LiteLLM has recorded but not yet settled, so the supervisor
spends from the task's money and cannot overrun it; with nothing left, the
task escalates without a call. `supervisor` maps to GLM-5.3, the strongest
configured model. Every decision goes to the session record, the timeline
and an issue comment.

Stopping is graceful: the worker gets SIGTERM, pushes the work in progress to
the fork and reports what it did, so a redirect resumes from the pushed head
with the dead session's findings. An escalation moves the task to
`waiting-human`, comments the reason on the issue and waits without a timer.
The answer is a comment from a trusted human (owner, admin or write on the
repository), newer than the escalation comment. It becomes findings for one
more session and may grant a bounded slice of agent time, ten minutes by
default and never more than the full cap per answer. A human may raise a
cap this way; the supervisor never can.

## 7. Chunk 5: verification and delivery

Evidence in order of strength. Cheap deterministic gates first, the expensive
model last:

1. Forgejo Actions runs PR checks on the untrusted runner (7.1): one
   ephemeral gVisor pod per job, no privilege, no credential beyond a
   read-only job token: tests, vet and format, static security scanning, an
   audit of the job's own environment, and the image builds. The
   privileged dind runner is node root, so it only builds protected `main`
   and publishes images (Ruling 76).
2. The Temporal workflow runs gate activities for what CI cannot decide: the
   failure reproduction now passes, the schema migration is reviewed, the
   policy evaluation returns allow.
3. Model review runs last, on diffs that survived: a stronger model reads the
   diff and writes a review verdict. The verdict is evidence for the merge
   decision, never authority to skip the gates above.

Merge is a PR merge. Flux picks up the commit and deploys to the staging
namespace, then to prod on the promotion rule. Human approval, where policy
demands it, is a Temporal signal. The waiting costs nothing.

Built through Stage 6: step 1 and the human merge. `main` on both
repositories is protected with one required approval, push and merge
whitelisted to the human, and `apply_to_admins` on, so no repository admin,
human or service account, bypasses it. The merge webhook finishes the task.
Steps 2 and 3 arrive in Stage 7.

### 7.1 The untrusted runner

Forgejo's runner has no Kubernetes backend and no autoscaler, and a runner
Deployment reuses its pod across jobs, so factoryd runs the fresh-pod-per-job
loop itself (Ruling 89). The CI spawner polls the code repository's waiting
jobs every ten seconds. For each job labelled `pr-untrusted` it registers a
repository-scoped, ephemeral runner, creates a namespace
`factory-agents-ci-<job>` through the same sandbox machinery and admission
policy as agent sessions, and starts one runner pod under gVisor: non-root,
restricted, no service-account token, the host executor inside the pod, and
the architecture 5.3 egress allowlist (Forgejo, the Go module proxy and
checksum database, the image registries the builds pull from, nothing else,
no metadata endpoint). The runner takes its one job and exits; the spawner
deletes the namespace and deregisters the runner. At most eight CI
namespaces run at once, the rest queue.

The registrations come from a dedicated Forgejo account, `factory-ci`
(Rulings 101, 101a). Forgejo's repository runner API answers only the
repository's owner, which for an organisation repository means an
organisation owner; a repository admin is refused. So `factory-ci` sits in
the organisation's Owners team, while its token is scoped to the code
repository alone and it is on no whitelist for `main`. With
`apply_to_admins` on, a push to `main` with that token is refused, which was
proven. A leaked token could administer the code repository's settings,
runners and collaborators, but not change `main`; a narrower grant needs a
Forgejo change (a runner API for repository admins). The same token reads
collaborator permissions for the trust checks in 8.

A pull request comes from the `factory-agent` fork (6.3), so its jobs get a
read-only job token and no Actions secrets. The check `job-env-audit` proves
it on every run: it asserts that the job token cannot push. Workflow files
come from the head, which is why the worker and factoryd refuse any change
to the workflow directories.

Image builds need root somewhere. Every rootless BuildKit path fails under
gVisor: writing a wide uid map through `newuidmap` is refused, with any
seccomp profile. So a job labelled `pr-untrusted-build` gets a second pod,
the build pod: BuildKit running as root inside its gVisor sandbox, with the
native snapshotter, reached by `buildctl` over TCP through a ClusterIP
Service (Ruling 91). Root inside gVisor is root of an emulated kernel, not
of the node, so the boundary Ruling 78 guards, no node root for untrusted
code, holds. The job pod that runs agent code and holds the job token stays
non-root and restricted; the build pod holds no token, no credential and no
service-account token, only the build context, and reaches only the package
and registry hosts the Dockerfiles need. Its namespace is labelled Pod
Security baseline, and the admission policy admits root only for that pod
shape in a CI namespace (6.4). Nothing a PR build produces is pushed:
publishing stays with the trusted runner on `main`.

The trusted runner's dind storage is a size-limited `emptyDir` (40 GiB).
The `docker:dind` image declares `/var/lib/docker` a volume, and without a
mount containerd backs it with an anonymous volume the kubelet neither
bounds nor counts: it grew past 50 GiB, put a node under disk pressure, and
the kubelet evicted an innocent untrusted build instead.

**PR build speed.** A PR's image builds take about 25 to 30 minutes. Four
causes add up.
gVisor offers no overlay filesystem to BuildKit, so the native snapshotter
copies every layer in full instead of stacking it. Every job starts in a
fresh pod with an empty cache. File I/O through gVisor's userspace kernel
costs extra on every layer. And the three images build one after the other,
the sandbox image including a warm step that waits on a timeout. The
remedies, planned as Stage 7's first step: build only the Dockerfiles a pull
request changes; give PR builds a read-only cache that holds no credential,
exported to an in-cluster cache registry by trusted `main` builds only and
reachable by network policy only from CI namespaces; drop the warm step;
build in parallel; and move builds to throwaway build VMs (7.2). The
prison itself stays: shared-kernel containers are weak prisons for code an
agent wrote, so the fix for the cost is fewer and cached builds, not a
weaker sandbox.

### 7.2 Stronger isolation at scale: microVMs

The clean large-scale route gives every job its own real kernel. Kata
Containers, or Firecracker microVMs under a Kubernetes runtime class, run
each pod in a small virtual machine on a KVM host. The guest kernel is
ordinary Linux, so overlay filesystems, Docker and BuildKit work as on any
machine, at near-native speed, and a kernel exploit inside the job owns only
its throwaway VM. The same prison serves both workloads: CI jobs and agent
sandboxes become the same pod shape under a different runtime class, and
the agent could even run Docker itself.

The catch is hardware. MicroVMs need `/dev/kvm`, and Hetzner Cloud servers
expose none (3). This route needs bare-metal nodes, for example Hetzner
dedicated servers joined to the cluster as a microVM pool, or a cloud that
offers nested virtualisation. It pays off when the build volume is high
enough that the cost per build on gVisor (compute time, a node held for half
an hour per PR) exceeds a dedicated node's fixed monthly price, and when
someone is ready to operate that node: firmware, disks and a Talos
installation outside the cloud's API, where a replacement is a ticket, not a
`tofu apply`. At today's volume, a handful of PRs a day, gVisor on cloud VMs
is cheaper and simpler.

The interim step, planned next: a throwaway Hetzner Cloud VM per build job.
factoryd creates the VM for one build, the job's builds run there on an
ordinary kernel with overlay filesystems and full speed, and factoryd
deletes the VM afterwards. Cloud servers bill by the hour, so a build costs
cents. The VM lives in the separate agent project from 5.5, never in the
cluster's own project, so this step lays the first brick of cloud-resource
commissioning: the agent project's token, the registry row before the
create, the lease and the collector that deletes a VM whose build died with
it. The VM is the job's prison, so it holds no credential beyond what the
job itself holds.

## 8. Chunk 6: signals

Forgejo webhooks on issues, PR comments and reviews. SigNoz alert rules on the
demo app's telemetry. Both feed `factoryd` intake, which creates or updates
task rows. Priority comes from labels and severity. The agent's
human-escalation tool call is one more intake event: it raises an approval
task and pings the console.

Built in Stage 6: the Forgejo half (5.1). A signal changes a running task
only if a trusted person sent it. Comments, reviews and change requests act
only when their author holds owner, admin or write permission on the
repository, looked up through the collaborator permission API and cached
for ten minutes; bot-authored events and edited or deleted comments never
act. Everything is still recorded as an intake event. A pull request event
counts only for the pull request the workflow itself opened, matched by
number and fork head. Because Forgejo never retries a failed delivery, the
heal pass re-reads the same state every minute and applies the same trust
checks, so a merge or an answer made while factoryd was down still reaches
the workflow. SigNoz alerts join in Stage 8.

## 9. What the 2026-09-24 verification pass established

Checked by web verification on 2026-09-24. Sources named inline.

- LiteLLM: JWT auth and JWT-to-key mapping are Enterprise-only. Budgets,
  virtual keys, key generation API and the MCP gateway are OSS. Design change:
  the gateway terminates identity (5.2).
- Temporal: server is MIT, never relicensed (the BSL result in searches is
  Terraform). Official Helm chart 1.0 since April 2026, operators optional.
- Talos: 1.14.1 current. On Hetzner Cloud: a snapshot written from the
  Image Factory image, apply machine config. gVisor is a system extension
  in the Image Factory schematic, not a machine-config stanza (learned in
  Stage 5: an in-place upgrade does not add extensions).
- Forgejo: GPL, non-profit governed, hard fork from Gitea since 2024. Actions
  runner has no Kubernetes backend: host, docker and lxc executors only
  (runner source, verified 2026-09-25). The trusted runner is one chart
  instance with a privileged dind sidecar, no KEDA; the untrusted runner is
  factoryd's spawner (7.1).
  Gitea stays MIT but under a company with a copyright-assignment CLA.
- OpenCode: MIT, moved to `anomalyco/opencode`, ACP and non-interactive mode
  confirmed.
- Cilium: 1.20, network policy and Gateway API remain in the OSS distribution.
- SPIFFE/SPIRE: still the workload identity standard in 2026. Deferred: the
  projected ServiceAccount JWTs cover us until multi-cluster or off-cluster
  identity appears.
- Harvester: dropped. Current release warns against upgrading, and its floor
  (16 cores, 64 GB per node) does not fit cheap commodity boxes.
- MinIO: console removed from the free edition May 2025, removals confirmed
  permanent, repository reportedly archived in 2026. Self-host S3 fallback
  changed to SeaweedFS or Garage (4.1).
- Harness survey: opencode passes all four requirements, with `run --format
  json`, a `serve` REST+SSE mode and `OPENCODE_CONFIG_CONTENT` config
  injection. Codex CLI passes but is deprecating the chat wire API. pi
  rejects MCP by design, Gemini CLI is bound to Google's protocol, aider
  stalled May 2026, Hermes and OpenClaw have the wrong shape. Decision in 6.1.
  Caveat: survey-agent web sources, spot-check before the adapter is written.
- Hetzner Robot has no managed firewall for dedicated servers (managed
  firewalls belong to the managed-server product). The node firewall is
  Talos's own: nftables rules declared as `NetworkRuleConfig` and
  `NetworkDefaultActionConfig` machine config documents.
- OpenTofu over Terraform for the same reason as OpenBao over Vault: the
  original changed to BSL, the fork kept the MPL licence, the language is
  identical.

- Hetzner Cloud (checked 2026-09-24, API and docs): Talos 1.14 is officially
  supported on the platform and the machine config rides server user-data.
  The /v1/datacenters availability lists proved unreliable: every ARM cax
  type was listed available yet failed creation with "unsupported location
  for server type" in fsn1, nbg1 and hel1, so orderability is probed by
  creating and deleting one server. cpx42, 69.49 EUR per month, was the
  cheapest orderable type at the 16 GB floor. Cloud servers expose no
  /dev/kvm, so gVisor uses the systrap platform. No hard per-project spend
  cap exists; per-server monthly price caps are automatic and cost alerts
  are email-only.

Not verified: which agent leads overall benchmarks. Both runners have served
real jobs since 2026-09-25, the untrusted one on every agent pull request
since Stage 6, but neither has run under load.

## 10. Open forks

| Fork | Recommendation | Status |
|---|---|---|
| Storage strategy | Local disks, CNPG replication, S3 artifacts | Decided |
| Secrets backend | OpenBao | Decided |
| Image registry | Forgejo registry, Harbor as upgrade | Decided |
| Object storage | Hetzner Object Storage, SeaweedFS/Garage as self-host fallback | Decided |
| Observability | SigNoz, Grafana stack as OTel-compatible fallback | Decided |
| UI style | Server-rendered Go with htmx | Decided |
| Policy engine | Go code now, OPA sidecar when rules multiply | Decided |
| Human identity | Forgejo OAuth2 now, Keycloak only if SSO story demands | Decided |
| Sandbox runtime | gVisor on cloud VMs now; microVMs (Kata or Firecracker) on bare-metal KVM nodes when build volume pays for them, for CI jobs and agent sandboxes alike (7.2) | Decided |
| Worker harness | opencode first, Codex CLI successor, goose fallback, behind the adapter contract | Decided |
| Node hardware | 3x Hetzner Cloud cpx42 (8 vCPU x86, 16 GB, 320 GB disk), about 69 EUR per month each | Decided |
| Management access | Talos nftables firewall allowlisting your home IP, headscale VPN later | Decided |
| Repository layout | `ai-software-factory-infra` and `ai-software-factory-code` now, `demo-app` in Phase 3 | Decided |
| Public DNS | Namecheap DNS stays, HTTP-01 certificates, Cloudflare as the named upgrade | Decided |
| Untrusted CI runner | factoryd's CI spawner: one ephemeral gVisor pod per job, repository-scoped ephemeral registration, read-only job token, no secrets; the privileged dind runner serves protected `main` only | Decided (Rulings 78, 89) |
| PR image builds | BuildKit as sandbox root in a separate gVisor build pod without credentials, because gVisor has no working rootless path | Decided (Ruling 91) |
| PR build speed | Changed Dockerfiles only, a credential-free read-only cache fed by `main`, no warm step, parallel builds, then throwaway Hetzner Cloud build VMs per job | Planned, Stage 7 first step |
| Agent pull requests | From a `factory-agent` fork, so PR jobs get a read-only token; two session tokens, read upstream and write the fork; workflow-directory guard in the worker and factoryd | Decided (Rulings 97, 100) |
| CI registrar | Dedicated `factory-ci` account, organisation owner because the runner API demands it, token scoped to the code repository, `main` protected with `apply_to_admins` | Decided (Rulings 101, 101a) |
| Missed webhooks | The heal pass re-reads Forgejo every minute and signals what webhooks missed; `Reconcile` at the start of every workflow run | Decided |
| Supervision | Cheap trace detectors over the event stream, the strongest model as supervisor under its own alias, inside the session activity, at most three calls per session, paid from the task's remaining budget | Decided (Rulings 82, 86, 87) |
| Cloud-resource commissioning | A separate Hetzner agent project with a gateway-only token, envelopes, leases and a garbage collector, prices from the provider's price list | Decided (Rulings 80, 83) |
| Task board | The console draws it from the task table; every task is a Forgejo issue; a Forgejo project mirror once its API lands | Decided (Rulings 81, 84) |
| Demo app | Small real product with real telemetry | Open, chosen in Phase 3 |

## 11. Build order

Three repositories carry the work. `ai-software-factory-infra` (infra
below) holds what the cluster is: the
OpenTofu for Hetzner servers and firewall, the Talos machine configs, the
Flux bootstrap and the kustomizations that point at the other repositories. It
changes rarely and stays human-only. `ai-software-factory-code` (factory
below) holds the Go module with both
binaries and the harness adapters, its tests, and its deploy manifests; its
Forgejo Actions pipeline builds images into the registry. It changes often and
is the first repository agents will work on. `demo-app` arrives in Phase 3.
The split keeps different blast radii separate and makes per-repository
capability grants natural later: `infra` can require a human while the factory
works `factory` and `demo-app`.

1. Ranch: Chunks 1 and 2. Talos cluster via Terraform and Flux, Postgres,
   Temporal, OpenBao, LiteLLM, SigNoz, Forgejo. Re-seed drill included.
2. First loop: intake to merged PR. One opencode worker, gateway v0 with JWT
   auth and virtual keys, sandbox hardening, session records.
3. Teeth: capability policy, budgets, approvals, verification gates, cost
   ledger.
4. Customer: demo app live, Flux deploys, telemetry feeding signals.
5. Self: the factory takes over its own repositories. SPIRE, OPA, model
   review escalation, self-improvement analytics.

## 12. Glossary

| Term | Meaning |
|---|---|
| PV / PVC | Persistent volume (a disk the cluster offers) / claim (a pod's request for one) |
| Operator | A controller plus custom object types that runs a piece of software for you on Kubernetes |
| CRD | Custom resource definition: the cluster API extension that adds a new object type |
| CNI | Container network interface: the cluster's network layer, Cilium for us |
| WAL | Write-ahead log: the database change log Postgres replicates from |
| ServiceAccount | A Kubernetes identity for a pod, not a person |
| Projected SA JWT | A short-lived token Kubernetes hands the pod, auto-rotated, audience-scoped |
| OIDC | The identity protocol Kubernetes uses to issue and verify those tokens |
| SPIFFE / SPIRE | A standard and its implementation for workload identity beyond one cluster |
| GitOps | The cluster converges to what Git says, Flux for us |
| MCP | Model Context Protocol: how agents call tools and data sources |
| ACP | Agent Client Protocol: how a client drives a coding agent over stdin/stdout |
| OTel | OpenTelemetry: traces, metrics and logs in one vendor-neutral format |
| Gateway API | The Kubernetes-standard way to describe inbound HTTP routing |
| gVisor | An userspace kernel that intercepts container syscalls, stronger isolation than plain containers |
| Kata | MicroVM containers: a real lightweight VM per pod, strongest isolation tier |
| MicroVM | A small virtual machine with its own kernel, started per pod or job on a KVM host (Kata, Firecracker); needs `/dev/kvm`, so bare metal or nested virtualisation |
| Supervisor | The strongest configured model, called inside the session when a detector trips or a task passes half its cap, choosing continue, redirect, retry on a stronger model or escalate; never raises a cap |
| Fork PR | A pull request from `factory-agent`'s fork into `sf`; Forgejo gives its CI jobs a read-only token and no secrets |
| Job token | The token Forgejo Actions hands each CI job; writable on a same-repository PR, read-only on a fork PR |
| factory-ci | The Forgejo account that registers ephemeral untrusted runners and reads collaborator permissions |
| Build pod | The gVisor pod that runs BuildKit as sandbox root for a PR's image builds, holding no credential |
| Heal pass | factoryd's pass at boot and every minute that starts missing workflows and re-reads Forgejo for signals a webhook missed |
| Timeline | A task's step-by-step record in S3 (`sessions/<id>/timeline.jsonl`), from intake to its final state |
| Envelope | The resource and euro allowance a human sets per project for commissioned cloud resources |
| Lease | The expiry every commissioned resource carries; the garbage collector deletes what outlives it |
