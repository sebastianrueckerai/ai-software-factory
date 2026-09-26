# Software factory: target architecture

Status: living design document. Nothing is built. We amend this file as the design
talk continues, so it always holds the current design plus the explanations behind
it. No versioning, no decision records, until code exists.

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
  factory-agents  one namespace per task, gVisor pods
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
extension can never be picked. Forgejo's `SECRET_KEY` is pinned as an imperative secret, because the
restored database holds Actions secrets encrypted under it, and a fresh key
breaks every CI run. After any key change the Actions secrets are stored
again. Every push made while Forgejo is down goes to GitHub only, so right
after the Forgejo restore every repository is fast-forward pushed to Forgejo
before Flux's first sync; otherwise Flux converges to the dump's stale tree.
Nodes installed from the schematic image register with the control-plane
taint, so the drill removes it after registration.

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

- intake: webhooks from Forgejo, alerts from Prometheus, escalation events
- the task registry: priority, required capabilities, risk class, cost ledger
- the Temporal worker running the task lifecycle workflows
- the API and the UI (server-rendered Go, htmx; a SPA is the fork if the
  console outgrows it)
- human login via Forgejo OAuth2. Keycloak later if an enterprise SSO story
  needs it, not before.

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
credential. factoryd mints a per-task Forgejo token at task start, scoped to
branch write on the task's repository, and revokes it at task end. The
worker, running as pid 1 in the pod, clones with that token before the
harness starts, then runs the harness in its own process group without the
token in its environment or in `.git/config`. When the harness finishes, the
worker kills and reaps every other process in the pod, fetches the agent's
commits into a fresh repository it owns with hooks and repository config
disabled, and pushes from there. Built in Stage 5 because a token in the
agent's repository leaks through git hooks, `core.fsmonitor` and lingering
processes that read `/proc/<pid>/environ`. Everything stays attributable:
model and tool calls by the task identity, git pushes by the task token.

### 6.4 Sandbox hardening

Sandbox hardening:

- gVisor RuntimeClass (verified supported in Talos machine configs): the
  container runs under an userspace kernel, not the host kernel.
- Non-root, dropped capabilities, read-only root filesystem.
- Cilium network policy: default deny egress. Allowed: `factory-gateway` on
  its port and Forgejo git. DNS answers only those names (`matchName`, not a
  wildcard, which would open a DNS exfiltration channel). A package registry
  joins the list by name when the sandbox image carries the toolchain that
  needs it. Nothing else, no cloud metadata endpoint.
- Per-task namespace with a ResourceQuota and LimitRange, container limits,
  and size-capped emptyDir volumes.
- factoryd creates task namespaces through a narrow ClusterRole, and a
  ValidatingAdmissionPolicy confines it to `factory-agents-*` namespaces with
  the restricted Pod Security label, gVisor pods without an automounted API
  token, and a RoleBinding only to itself.
- Upgrade path for stronger isolation: Kata microVMs, a node pool change.

### 6.5 Session records

Session records stream out while the sandbox lives: prompts, tool calls,
output, files touched, commits, cost. Full history to S3, compact restart state
to Postgres. A dead session resumes as a new pod with its findings and its
parent session ID, not as a resurrected process.

## 7. Chunk 5: verification and delivery

Evidence in order of strength. Cheap deterministic gates first, the expensive
model last:

1. Forgejo Actions runs PR checks on the untrusted runner, whose job
   containers get no privilege and no credentials: build, tests, lint, static
   security scanning. The privileged dind runner is node root, so it only
   builds protected `main` and publishes images (Ruling 76).
2. The Temporal workflow runs gate activities for what CI cannot decide: the
   failure reproduction now passes, the schema migration is reviewed, the
   policy evaluation returns allow.
3. Model review runs last, on diffs that survived: a stronger model reads the
   diff and writes a review verdict. The verdict is evidence for the merge
   decision, never authority to skip the gates above.

Merge is a PR merge. Flux picks up the commit and deploys to the staging
namespace, then to prod on the promotion rule. Human approval, where policy
demands it, is a Temporal signal. The waiting costs nothing.

## 8. Chunk 6: signals

Forgejo webhooks on issues, PR comments and reviews. SigNoz alert rules on the
demo app's telemetry. Both feed `factoryd` intake, which creates or updates
task rows. Priority comes from labels and severity. The agent's
human-escalation tool call is one more intake event: it raises an approval
task and pings the console.

## 9. What the 2026-09-24 verification pass established

Checked by web verification on 2026-09-24. Sources named inline.

- LiteLLM: JWT auth and JWT-to-key mapping are Enterprise-only. Budgets,
  virtual keys, key generation API and the MCP gateway are OSS. Design change:
  the gateway terminates identity (5.2).
- Temporal: server is MIT, never relicensed (the BSL result in searches is
  Terraform). Official Helm chart 1.0 since April 2026, operators optional.
- Talos: 1.14.1 current. On Hetzner bare metal: boot ISO, apply machine
  config. gVisor runs as a runtime handler from the machine config.
- Forgejo: GPL, non-profit governed, hard fork from Gitea since 2024. Actions
  runner has no Kubernetes backend: host, docker and lxc executors only
  (runner source, verified 2026-09-25). It runs here as one chart instance
  with a privileged dind sidecar, no KEDA.
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

Not verified: which agent leads overall benchmarks. The runner is proven on
one real CI job (2026-09-25, run 1 on sf/ai-software-factory-code), not
under load.

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
| Sandbox runtime | gVisor now, Kata microVMs later | Decided |
| Worker harness | opencode first, Codex CLI successor, goose fallback, behind the adapter contract | Decided |
| Node hardware | 3x Hetzner Cloud cpx42 (8 vCPU x86, 16 GB, 320 GB disk), about 69 EUR per month each | Decided |
| Management access | Talos nftables firewall allowlisting your home IP, headscale VPN later | Decided |
| Repository layout | `ai-software-factory-infra` and `ai-software-factory-code` now, `demo-app` in Phase 3 | Decided |
| Public DNS | Namecheap DNS stays, HTTP-01 certificates, Cloudflare as the named upgrade | Decided |
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
