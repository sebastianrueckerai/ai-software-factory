# Software factory: target architecture

Status: living design document. The build plan's Stages 0 to 7 are built: the
loop from an issue to a merged pull request runs on the cluster under policy,
hard caps and human approval. Stage 8, the first customer, closed 2026-09-28:
a planted regression in the demo app went from alert to fixed in prod in 31
minutes without a human. Stage 9, the factory working on itself, closed
2026-09-29: the factory's own agents fixed five of its open defects, each
merged through the card and rolled by a roll task, and the fix of a sixth,
the blocked gateway key, reached `main` through the controller from the
lane's own pull request (Ruling 195). Stage 10, hardening, closed
2026-09-30: the recovery of the Stage 9 close brought back every table, a
security audit stage sends its findings to a human, a review without a
verdict is a finding, the harness runs as a server that takes a message
mid-session and the first message is the loop nudge, untrusted text is
sanitised in and out, one model provider and a month cap bound the spend,
and the factory's own lane merged 25 fixes through the card. Stage 11,
building from a spec, closed 2026-09-30: a spec card on an empty board
became a deployed link shortener through a planner, ten planned cards,
four agents at once and a merge queue, with processes composed from YAML
blocks and a check that refuses what cannot work, and with 17 cards the
human had to refile. Stage 12's first bugfix round closed 2026-10-01: the
same spec on a fresh project built clean in 1 h 43 min, with no refile, no
failed card and only the plan's and the merges' clicks, after agent time
became hours, the supervisor began to message the running session instead
of ending it, finished work survived every cap, and the sandbox gained what
CI runs. Stage 15, the project screen and the project agent (5.7), is
design and not built. Sections that describe built behaviour
say so. The rest is still design. We amend this file as the design moves, so it always holds the
current design plus the explanations behind it. Rulings live in the build
ledger and are cited here by number.

Decided so far:

- Approach A: custom Go control plane, opencode as the first worker harness
  behind the adapter contract (6.2), which lets several harnesses run side
  by side. pi and goose are the next to try, and the choice is per task
  class and by measurement.
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
- Agents exchange artifacts. Git is the coordination mechanism. Humans and
  the project agent may message a running agent, and the gates judge the
  result (Ruling 253, which amended "agents exchange artifacts, not chat").
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
  k8s-infra       the node and cluster telemetry collectors (4.2)
  forgejo         forgejo, runner, container registry, build cache
  factory         factoryd, factory-gateway
  factory-agents  one namespace per task session and one per untrusted CI
                  job (factory-agents-ci-*), gVisor pods
  <environment>   one namespace per environment of each registered project,
                  labelled factory/project=<name> (5.1): demo-staging and
                  demo-prod for the demo app, deployed by Flux
```

Since Stage 9 the factory's own namespaces carry the project label too
(Ruling 180, Task 76): `factory` routes to `ai-software-factory-code`,
`platform` and `forgejo` to `ai-software-factory-infra` (8). All three also
carry `factory/objects: seed`, which keeps factoryd's admission policy from
treating them as project namespaces (6.4).

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
Forgejo push-mirrors both repositories to GitHub on every commit and every
8 hours, so a merge by the `factory-merge` bot (7) reaches the off-site copy
without a human push (Ruling 126). The mirror's GitHub token is stored
encrypted in Forgejo's database and comes back with the database restore, as
long as it is still valid. Humans still push to both remotes.
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

The fourth rebuild (2026-09-28, the start of Stage 8) had the platform whole
18 minutes after the first `tofu apply`. It turned three of the recipe's hand
steps into Flux-managed CronJobs (Ruling 143). Each runs every 10 minutes
with `concurrencyPolicy: Forbid`, `backoffLimit: 0` and a 300-second
deadline, from a digest-pinned image. Each converges: a run with nothing to
do logs `no change`, and every run writes one log line.

- `openbao-config` writes the SSH certificate authority's role, the
  gateway's Kubernetes auth role and their policies. It logs in through its
  own Kubernetes auth role, `openbao-config`, whose policy pins every
  parameter the job writes, so the job cannot make itself admin. It creates
  a certificate authority only when OpenBao answers "no default issuer
  currently configured". The review found that the first draft created a new
  authority on any failed read, and a second authority would have locked
  every commissioned server out. The root token never enters the cluster:
  `scripts/openbao-config-bootstrap.sh` runs once from the seed machine with
  the root token on stdin and writes the job's role and policy, and a raft
  snapshot after it carries both into the next restore. Proven live: a
  restored OpenBao accepts the new cluster's ServiceAccount tokens, so a
  restore needs no root token, and an audience cleared by hand on the
  gateway's role was back 9 seconds later. The unseal stays a hand step.
- `push-mirrors` deletes and recreates a mirror whose `last_error` is not
  empty. The mirrors use a fine-grained GitHub token limited to the two
  repositories, contents read and write (Ruling 144), from the secret
  `github-mirror`. While that secret is missing, the job idles with one log
  line.
- `console-oauth` regenerates the console's OAuth application only when its
  secret is missing or the secret's `client_id` differs from the
  application's, and then restarts factoryd, which reads the keys only at
  boot. Proven live: a secret deleted at 17:34:51Z was regenerated 5 seconds
  later, and a login through the new application worked.

The same rebuild found two traps. Let's Encrypt's rate limit had run out for
the Forgejo hostname (3.4). And Flux reverts a `kubectl rollout restart` of a
Deployment it owns, so the recipe deletes the pod instead. GitHub refused
every push from the seed machine from 2026-09-28 on with GH007, its e-mail
privacy block. The block was lifted on 2026-09-29 and new commits carry a
noreply address. Whether both mirrors caught up is checked at the next
step-zero gate. Since Task 79 the `push-mirrors` job recreates a mirror only
on a credential failure and logs a GH007 rejection without failing.

The fifth rebuild (2026-09-29, the start of Stage 9) had the platform whole
29 minutes after the start and passed the step-zero gate at 47 minutes, with
the task's spend equal to LiteLLM's to the last digit. The edge TLS secrets
came back from the shutdown backup before cert-manager started (3.4). It
found four traps, all in the README now: a TLS secret restored with
`kubectl apply` keeps its private key in the last-applied annotation, so the
restore uses `kubectl create`; a fresh Forgejo volume lacks
`/data/git/gitea-repositories`; the seeded SigNoz viewer password must meet
SigNoz's password rule; and factoryd crash-loops without the
`forgejo-projects` token, which the recipe did not name. During the stage
the home address changed, and both firewall layers admit the Kubernetes and
Talos APIs from the home address only. The recovery: `home_cidr` in the
tfvars and `tofu apply` for the Hetzner firewall, then a throwaway jump host
in the cluster's private network that patched the Talos rule
`api-from-home` on the three nodes without a reboot, since node-to-node
traffic from 10.0.1.0/24 passes. Git and the edge were never affected.

The Stage 9 close went wrong, and the sixth rebuild (2026-09-29, the start
of Stage 10) was the test of its recovery. At the close a `tofu apply` for
a second home-address change replaced the three nodes: `hcloud_server.node`
takes its `user_data` from the Talos configs, which the morning's recovery
had edited, and the plan's replacement lines went unread. The fresh nodes
had empty disks, so the close's backups were never taken: no base backup,
no Forgejo dump, no OpenBao snapshot. What survived was CNPG generation v8
in S3, with the morning's base backup and WAL segments every five minutes to
17:52Z, and every repository on the seed machine and on GitHub. The rebuild
recovered v8 into v9 in 2.8 minutes, replaying every WAL, and every table
of the Stage 9 exit test came back, Forgejo's issues, pull requests and
comments included, since Forgejo's database is one of the four. Forgejo's
git storage was gone while its rows stood, and Forgejo has no tool that
recreates a bare repository for an existing row. The recipe without a dump:
an empty bare repository per row inside the Forgejo container, `forgejo
doctor` for the server hooks, a push of every repository from the seed
machine before Flux starts, the refs `refs/pull/<n>/head` of the merged pull
requests restored from their merge commits' second parents (the revert pass
reads their diffs), and the push mirrors created again, since the doctor's
fix deleted the mirror rows whose remote the new repositories lacked. A
project's protected `deploy` branch cannot be pushed back, because only its
deploy key may push there; the project's own CI starts it again on its next
`main` run, with a new history. OpenBao, with no snapshot newer than the
seed's tokens, was initialised fresh and re-seeded. The gate passed 47
minutes after the start, with the task's spend equal to LiteLLM's to the
last digit and GitHub's `main` equal to Forgejo's for both repositories. It
found a trap and a defect. `flux bootstrap` echoes the credential it was
given when it fails, and the seed machine's git credential store held the
Forgejo admin's password, so the README now names the Flux token's source.
factoryd's project reconcile stopped at the missing `deploy` branch before
it set the new SSH host key, which the bug lane fixed (backlog 69). The
README also names the replacement trap: never apply a plan that replaces a
node.

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
already on S3-class storage. SigNoz's history is the one accepted loss: its
last 7 days sit on a local volume, and older data moves to the bucket
`signoz-cold` (4.2), but ClickHouse keeps that disk's metadata on the local
volume, so a rebuild orphans the cold objects. The bucket's lifecycle rule
expires them after 31 days.

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
| Model routing | LiteLLM OSS proxy | Budgets, virtual keys and the key API are OSS. JWT auth is not, see 5.2. Three model tiers since Stage 9, one provider since Stage 10 (4.4) |
| Object storage | Hetzner Object Storage | Fork below |
| Observability | SigNoz | Fork history below, decided |
| Telemetry pipeline | OpenTelemetry Collector | factoryd, the gateway, the worker and project apps emit OTel to SigNoz's collector. The k8s-infra chart's collectors scrape the nodes and the cluster (4.2) |
| TLS certificates | cert-manager with Let's Encrypt | One per public endpoint, HTTP-01 via Gateway API, see 3.4 |

Memory limits (Task 79, 2026-09-29). The three CNPG instances, Forgejo,
cert-manager and the trusted runner's dind had no memory limit, so a
runaway could take a node. Each limit is now 1.25 times the container's
measured lifetime cgroup peak, rounded up to a 512 Mi step: Forgejo 2560Mi,
dind 8Gi, the runner 1536Mi, the barman sidecars 512Mi, cert-manager 128Mi
each as a floor. Postgres is sized from its settings instead, 1536Mi,
because an OOM kill restarts every backend on the primary. Each container
has an explicit request. No container was killed for memory in the half
hour after the change, and dind peaked at 6110 Mi over 14 CI tasks. Under
pressure the runner is evicted first.

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

Let's Encrypt issues at most 5 certificates per exact set of names in 7
days. The rebuild drills used them up for `git.aisoftwarefactory.world`, and
the fourth rebuild served an interim certificate for a new name set (git
plus console) until the limit lapsed. The durable fix is built: the
shutdown backups take the edge TLS secrets, and the restore puts them back
before cert-manager starts. At the Stage 9 rebuild the console and SigNoz
certificates read Ready at once against the restored secrets. The git
secret still held the interim certificate for git plus console, which did
not match the tree's Certificate, so cert-manager ordered anew, met the
limit until 08:18Z and got its certificate at 08:37Z while the interim one
served. The next backup carries the matching certificate.

A project's public hostnames are an infra commit (Ruling 155): a Gateway
listener and a Certificate per name on the shared edge gateway, plus the DNS
records. Registration (5.1) prints the YAML, and the controller or a human
commits it. factoryd does not patch the Gateway, because Flux owns it and
would revert the patch, and a wildcard certificate needs the DNS-01 provider
we do not have. The commit is also the human's OK for each project. The demo
app's names, `demo-staging` and `demo`, wait for hand-made A records:
Namecheap's dynamic DNS API updates existing records only, and until the
records exist the certificates and listeners stay not ready.

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

As built in Stage 8 (Task 69):

- **Node and cluster telemetry.** The k8s-infra chart 0.17.1 runs in its own
  namespace `k8s-infra`, labelled privileged, because its node agent reads
  host paths, which Talos's default `baseline` profile forbids, and a
  privileged `platform` would loosen ClickHouse and OpenBao with it. The
  node agent, a DaemonSet, collects host metrics, kubelet stats and pod
  logs. It mounts `/var/log` and the container log directory but not the
  host root, since kubelet stats already report node network and disk, and
  its ClusterRole reads pods, nodes, volumes and jobs plus `nodes/stats`
  and `nodes/pods`, nothing more. It has no OTLP receiver and no host port,
  so a sandbox cannot inject into it. A cluster collector adds the cluster
  metrics and the Kubernetes events. Proven live: CPU and memory of all
  three nodes, a factoryd log line searchable, and no 403 in the agents'
  logs over 30 minutes.
- **What stays out.** Logs of the `factory-agents-*` namespaces never
  reach SigNoz: a probe wrote 30 marker lines in such a namespace and 0
  arrived, while the same probe in `platform` delivered 30 of 30. Their
  Kubernetes events still arrive, and those carry pod and image names, no
  output. The Forgejo runner's logs, which carry CI job output, and
  SigNoz's own pods are excluded too.
- **The failure alert.** Rule "Job failed" fires on a Job's failure event,
  `BackoffLimitExceeded` or `DeadlineExceeded`, within the last 15 minutes,
  grouped by namespace and Job, and clears by itself (Ruling 160). The
  first design watched the metric `k8s.job.failed_pods`, but a CronJob keeps
  its last failed Job, so that alert would never clear after one failure.
  Live: a failing Job fired the rule 3 minutes 18 seconds after the failure,
  and it cleared 15 minutes later while the failed Job still existed. Its
  first live catch was the `push-mirrors` job failing at its deadline every
  10 minutes for a missing secret, which led to the job's idle state (3).
  SigNoz refuses a rule that routes by channel without a channel, so the
  rule routes by notification policy. The cost, named: the events receiver
  skips events older than its own start, so a Job that fails while the
  cluster collector restarts raises no alert.
- **Objects as code.** The CronJob `signoz-objects` applies the dashboards,
  the alert rules and the retention settings every 10 minutes and logs `no
  change` when SigNoz already matches the files. The files hold each object
  exactly as SigNoz's GET returns it, with every Go zero value spelled out,
  or every run would log an update. A project's own alert rules are project
  code (Ruling 159): a ConfigMap in its deploy directory labelled
  `factory/signoz-rules`, which the same job applies. Built in Task 70 and
  proven by the Stage 8 exit test.
- **Tiered retention.** Traces and metrics are deleted at 720 hours and move
  to the S3 volume at 168 hours. Logs keep 30 days and move at 7. ClickHouse
  reads the Hetzner key pair through `include_from` with
  `hide_in_preprocessed`, so the keys never appear in its preprocessed
  config (0 occurrences, checked live), and the chart's plain-text cold
  storage option is not used. A move factor of 0.1 sends the oldest parts to
  S3 once the local volume is 90 % full. Live: 1000 rows moved to
  `signoz-cold` and read back.
- **Requests.** Set from 8 minutes of kubelet stats on an idle cluster,
  since the cluster runs no metrics-server: ClickHouse requests 250m and
  1 GiB with limits of 2 CPU and 3 GiB, and ZooKeeper's heap drops to
  256 MB. The whole telemetry stack requests about 10 % of the three nodes'
  CPU and 13 % of their memory.

Added in Stage 9 (Ruling 180, Task 76):

- **Rules on the factory itself.** The code repository's `k8s/alerts`
  holds the rules for factoryd and the gateway: a 5xx rate above 5 % per
  service, three restarts in 10 minutes, a roll not live 10 minutes after
  its merge, and a CI queue p95 above 5 minutes. The infra repository holds
  the platform's: ClickHouse disk above 80 %, a CNPG instance not ready for
  5 minutes, Forgejo 5xx above 5 %, and "Job failed" per namespace. Each set
  is a `factory/signoz-rules` ConfigMap in the namespace it watches, so the
  `signoz-objects` job applies it like a project's, and an alert routes by
  the namespace label (8). Forgejo runs in `forgejo`, not `platform`, so
  that namespace holds its own ConfigMap.
- **Two defects made rules match nothing**, both found in review against
  live SigNoz: SigNoz resolves an unqualified `k8s.namespace.name` to the
  resource, while Kubernetes events carry the namespace as an attribute,
  and factoryd and the gateway exported no namespace until
  `OTEL_RESOURCE_ATTRIBUTES` set it on both Deployments. A histogram is
  stored as a `.bucket` series, so a rule or panel that names the bare
  metric shows nothing; at the Stage 10 rebuild every histogram panel of
  the pipeline dashboard named the bare metric, and all of them query the
  `.bucket` series since (backlog 57).
- **Live.** Two plantings of three factoryd pod deletions each fired the
  restarts rule, at 14:20Z and 16:02Z on 2026-09-29. The roll rule fired falsely once, three minutes
  after a roll was live, while factoryd's pod was being deleted (backlog 67).
  Since the bug lane's fix (#234) both roll rules need a full 10-minute
  window of points (`requireMinPoints`), and no false roll alert fired
  across the next six rolls.

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
price. The unseal is the one OpenBao step left by hand: its configuration
converges from the `openbao-config` CronJob, which a bootstrap with the
root token enables (3). The CronJob's identity may write only the paths
the bootstrap pinned, and only the root token enables a mount, so a new
engine, policy or role in its script needs the bootstrap once more, then
the seed, before the factoryd that reads it rolls. Stage 12 was the first
such change (Task 109): a kv-v2 mount `factory` holding the Forgejo
admin's login, which the seed writes from the seed bundle and the raft
snapshot carries across a rebuild, a policy that reads only that path,
and a role `factoryd` bound to factoryd's service account, so factoryd
registers projects without a human typing the password (5.1). OpenBao now
holds the SSH CA, the gateway's role and that one credential.

### 4.4 Model and tool providers

The seed bundle holds keys for DeepSeek, Alibaba (Qwen via DashScope), z.ai
(GLM), Replicate, Firecrawl and fal.ai. These split into two groups at the
gateway.

Chat models reach LiteLLM as upstreams: deepseek, qwen, glm. The first alias
table: `coding-cheap` maps to the DeepSeek and Qwen tier, `coding-frontier` to
the GLM frontier tier, `review-frontier` to the strongest of the three,
measured in Phase 2. Anthropic and OpenAI stay out at the start, deliberately:
the factory should run on the providers its owner actually uses daily.

Since Stage 9 (Rulings 181, 189, 192, Task 77) LiteLLM holds three tiers,
each with deployments from several providers, and the four role aliases map
onto tiers. Tier membership is a quality bar, and latency orders only
inside a tier. tier-high holds each provider's strongest general coding
model, `zai/glm-5.3`, `dashscope/qwen3.8-max` and
`deepseek/deepseek-v4-pro`, at equal weight, and serves `supervisor`,
`review-frontier` and `coding-frontier`, so the stronger-model retry and
the review stay a real step up from `coding-cheap`. tier-low serves
`coding-cheap` with deepseek-flash, qwen3.8-flash and glm-5.3-flash,
weighted by measured latency and cost. tier-mid is configured, measured
and priced, and no alias uses it. A tier fails over among its own
deployments with a 60-second cooldown and never falls to another tier: a
review that can merge on `auto` must not move to a weaker model without a
trace (Ruling 189). A tier with none left fails the call, which the task's
existing paths handle.

The ranking came from a fixed coding and review sample, 117 calls for 0.25
USD. All 13 candidates passed all 9 samples, so the samples could not rank
quality: membership is a judgement, and the weights shift only when the
analytics (8) give a reason. Groq's models ranked fastest, but Groq refuses
the `reasoning_content` field that opencode sends back from the second turn
on, so one live session saw 24 rejections and Groq answered 4 of 59 calls
against 40 % of the weight. It left both lower tiers, its key stays seeded,
and the measurement's samples must include a multi-turn exchange. The
gateway's audit row records the deployment that answered, from LiteLLM's
`x-litellm-model-name` header. The price book prices an alias at the
dearest deployment of its tier, so a hold covers whichever answers, and a
deployment with a price field the book does not know makes its alias
unpriced, which the gateway refuses. A provider switch is one infra file.

Since Stage 10 (Ruling 204, Task 91) one provider, Alibaba, serves all
three tiers, one deployment each: tier-high `dashscope/qwen3.8-max`,
tier-mid `qwen3.7-plus`, tier-low `qwen3.8-flash`, with thinking off.
Sebastian wanted one account to top up; the tiers and the aliases stay,
so a second provider is again one infra file. With one deployment per
tier a cooldown would lock the whole tier, so the router retries twice
with backoff and runs no cooldown. The measurement gave 9 of 9 on each
tier (p50 4.2, 5.2 and 4.3 s). DeepSeek, z.ai and Groq left the release,
and their key secrets left the cluster. Until the switch at 00:56Z on
2026-09-30, the Stage 10 run spent on all three providers. LiteLLM also
holds a proxy-wide budget of 55 USD a month (`litellm_settings.max_budget`,
reset on the 1st at 00:00 UTC), the backstop behind the factory's month cap
(5.4); its refusal names no entity, and the gateway reads it as the month
cap.

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

- intake: webhooks from Forgejo, an authenticated API, SigNoz alerts and
  escalation events
- the task registry: priority, required capabilities, risk class, cost ledger
- the project registry: every project's settings from its file in the
  infra repository (5.3), registration, and the reconcile of every
  project's Forgejo and cluster objects
- the roller, which opens a roll task for every green `main` commit of the
  code repository that changes an image (7)
- the Temporal worker running the task lifecycle workflows, and the heal
  pass that keeps rows, workflows and Forgejo in step
- the CI spawner for the untrusted runner (7.1)
- the API and the UI (server-rendered Go, htmx; a SPA is the fork if the
  console outgrows it)
- human login via Forgejo OAuth2. Keycloak later if an enterprise SSO story
  needs it, not before.

Built in Stage 6: intake, the issue record, the workflow and the heal pass.
Built in Stage 7: capability policy (5.3), the cost ledger with hard caps
(5.4), commissioning (5.5), the console (5.6), and the gates, the model review
and the bot merge (7). Built in Stage 8: projects and their registration,
the two resource kinds (5.5), telemetry from all three binaries (below), the
gate supervisor (6.6) and the alerts table (8). Built in Stage 8 on branches
and rolled 2026-09-28: the intake lanes and the `auto` outcome (Task
66), every factoryd model call through the gateway (Task 71), and SigNoz
alerts into intake (Task 70). The Stage 8 exit test passed on 2026-09-28:
a planted regression in the demo app fired the 5xx alert, the alert filed
issue #5, the agent's fix merged on `auto` 9 minutes 47 seconds after the
issue, and prod ran the fix 31 minutes 23 seconds after the alert.
Built in Stage 9: configuration as files (5.3), the factory as a normal
project (below), the workflow as stages with the review loop, the screening
stage and the roll task (7), the `analyzer` class with its report sessions
and the improvement presort (below, 6.3), alerts on the factory itself and
the task analytics (8), and model tiers (4.4). The Stage 9 exit test passed
on 2026-09-29 with two deviations (Ruling 195, backlog 66): the factory's
agents fixed five of the factory's own open defects, each merged by
`factory-merge` after the card and rolled by a roll task.
Built in Stage 10: one model provider and the month cap (4.4, 5.4), the
security audit stage and the rule that a review
without a verdict is a finding (7), message-in through the harness's serve
mode with the loop nudge as its first user (6.2, 6.6), the hardened
harness configuration and the sanitiser (6.4, 7), hidden tools, stricter
wins and protected files (5.3, 7), credentials kept out of workflow
history (below), and from the bug lane the checks re-run (7), project
egress hosts and the hourly reconcile (below). The Stage 10 exit test
passed on 2026-09-30 with two named fallbacks: a review without a verdict
was not produced live by a plant and rests on tests plus the same rule
live on the audit stage, and the trip after a nudge happened live through
`no_write`, not `same_call`.
Built in Stage 11 (rulings 205 to 211): processes composed from blocks,
the lanes and the planner (below, 5.3, 7), dependencies between cards and
the merge queue (7), templates and the seed commit for a new project
(below), the console's lane board, plan card and new-project button (5.6),
and migration and change-id names that parallel branches cannot share (7).
The Stage 11 exit test passed on 2026-09-30 (ruling 210): a spec card on
the empty project `linkshort` became a plan of ten cards, four sessions ran
at once, fifteen pull requests merged through the queue one at a time, and
the app ran on staging with its nine acceptance tests green. It took 17
refiled, split or fix cards from the human (ruling 211), since 12 of 28
tasks failed, 11 at the wall-clock cap.
Built in Stage 12's first bugfix round (rulings 213 to 226, Tasks 107 to
122): agent time and check-ins per class, process and project (below,
5.3), the supervisor's message into the running session and the one stuck
rule (6.6), finished work kept at every cap and one cap card (below), the
per-project cache volume, gcc in the sandbox image and evictions recorded
(6.4), the failing job's log lines in the checks finding and a template
that works out of the box with its `check` (7, below), registration
without a human password (below), the sanitiser for outsiders' text only
(7), the gateway's 499 for a caller's cancel (5.3) and the board's 3-second
refresh (5.6). A tool for the agent to run CI on its pushed work,
`run_checks`, was designed and not built (ruling 221): the sandbox runs the same
`bash check` CI runs. The round's exit test passed clean on 2026-10-01
(Task 121): the Stage 11 spec on the fresh project `linkshort2` became
seven planned cards, merged in 1 h 43 min from the button and serving on
staging at 1 h 52 min, with 12 sessions, 0 refiles, 0 failed tasks, 0 cap
cards and 12 human clicks, the button, the project's merge, the spec card,
the plan's accept and start, and seven merge approvals, on the cheap tier
throughout for 1.69 EUR.

**Intake.** Two doors, one record. Forgejo posts webhooks to
`/webhooks/forgejo`. factoryd checks the HMAC-SHA256 signature in
`X-Forgejo-Signature` against the shared secret before it parses a byte of
the body, answers 401 on a mismatch, and claims the delivery id so a
redelivery is a no-op. Bot-authored issues are ignored. Priority is the
higher of the `priority/p0..p3` and `severity/critical..low` labels. The
second door is `POST /tasks` with a bearer token, for callers that are not
Forgejo: it clamps the budget, files the issue itself (the body says it was
filed by factoryd intake), then stores the row. Either way every task is an
issue, so the discussion, the state and the audit trail share one record.

Every bug gets fixed, whether it comes from telemetry or from any account
(Ruling 148). Bug reporting is how a user without write access steers the
software. Every factory-managed repository carries two issue templates,
`bug` and `improvement`, each of which applies its label on creation. The
lanes, built in Task 66 and rolled 2026-09-28:

- `human` wins: a human-lane task.
- `agent` or `bug` starts an agent task at once, whoever filed it. So does
  every issue an alert files (8).
- `improvement` alone becomes a task row in state `suggested`, with no base
  commit, no gate and no workflow. It starts only when a writer labels it
  `agent` or `bug`. Since Stage 9 the row opens a presort (Ruling 185, Task
  74): an `analyzer` task in report mode (6.3) writes up how the change may
  work as a comment on the issue, and once a writer starts the suggestion,
  the coder's first session gets that write-up as a finding. Proven live on
  issue #178.
- On a project with `agents: none`, the infra repository's, every issue goes
  to the human lane (Ruling 179).
- An issue with none of these labels counts as a bug, and the
  reproduce-first flow (7) sorts out what is not one.

Forgejo 15 keeps any label an account posts through the web form, a
smuggled `agent` on the improvement form included, while its API drops a
non-writer's labels. So intake takes `agent`, `human`, `priority/*` and
`severity/*` off an outside account's new issue, and only a writer's label
event starts a suggestion. Each task stores its author and whether the
author could write when the issue arrived. That standing goes into the
brief and the model review (7). The bounds on abuse are the admin-created
Forgejo accounts (Ruling 144) and the policy's day cap. Since Stage 9 a
screening stage reads an outside account's bug report before the coder
starts (7, Rulings 182, 191).

**Lanes come from the project's process** (Rulings 206, 208, Tasks 94, 97).
Since Stage 11 the lanes above are configuration: each project names a
process file (5.3), and the process lists two or three lanes, `backlog`,
`ready` and optionally `plan`. A card in `backlog` does not start, a card
entering `ready` starts a task of the lane's `class`, and a card entering
`plan` starts a planner (below). The label underneath is `backlog`, `agent`
or `plan`, and the intake rule is fixed in code for every process:
`human` wins, then `agent` or `bug` asks for ready, `plan` asks for plan
where the process has that lane, `backlog` or `improvement` is backlog, and
no label asks for ready. A starting lane's `moved_by`, `writers` or
`approvers`, judges every entry, at creation, by a label added later or by
a label removed: a refused entry lands in backlog, the bot restores the
label and comments once. The default entry keeps Ruling 148 on both shipped
processes: under `writers` a bug from anyone enters ready. Tasks filed
through the API and by alerts enter ready the same way, and rolls and
human-lane tasks carry no lane. The task row gains `lane`, `process` and
`plan_key`, and the status `suggested` became `backlog` (migration
`20260930095046_lanes`). The shipped `maintenance` process is the flow
above, with the presort as the backlog's `write_up`. The `spec` process
adds the plan lane.

**The planner and the plan card** (Rulings 205, 208, Task 101). A card in
lane `plan` starts a task of class `planner`, whose session mode is `plan`:
a report session on the stronger rung that reads the repository and the
spec, writes nothing, and ends with one JSON block of 2 to `max_cards`
cards, each with a key, a role (`foundation`, `feature`, `integration`),
a brief of at most 1500 characters, guidance directories, dependencies,
acceptance items and a size of `small` or `medium`. `ValidatePlan` refuses
a plan that breaks the shape, and the findings go back to the planner.
factoryd, not the model, adds the edges that put the foundation first and
the integration last. Each valid answer is a row in `plan_revisions`,
posted on the issue and filed as an approval request of kind `plan`. A
writer's comment sends the planner round again, Reject fails the task, and
"Accept plan" (approvers) runs `CreateChildren`: one task row and one bot
issue per card in topological order, labelled `backlog`, with the Forgejo
dependencies and rows in `task_deps`, idempotent by a marker in the body.
A child's brief carries the spec and the plan's summary and the
`featureGuide`, which asks for a test per acceptance item. "Start plan"
(approvers) labels every child still in the backlog `agent` as the human,
so each move passes `moved_by`. Live, the planner answered 9 cards in 58
seconds, took one change request and answered 10, and the acceptance filed
them with 25 dependency rows. It sized the foundation, a Go API plus a Vite
scaffold, `medium`, and the card failed at the wall-clock cap: the size
rule has no ceiling the planner can measure. Since Stage 12 (Task 120) the
guide sizes a card by what it produces, not by time: one package, one page
or one set of endpoints with its tests, about ten files at most. Each
acceptance item is a test by name with its inputs and the numbers it
expects, the foundation's brief names the contracts every card builds on
(how a handler gets the logged-in user, the store's interface, the server
constructor tests import), and no card asks for a check `bash check` does
not run. The planner's own class runs 30 minutes with no check-in. On the
round's exit test the planner answered seven cards in about a minute, the
human accepted the first revision, and the foundation finished in one
session of 19 minutes.

**Labels.** factoryd creates the label set at boot on every project's
repository, the seed projects' included (5.1), the `priority/*`, `severity/*`
and, since Stage 9, `noise` labels among them (8), and keeps exactly one
`state/*` label on each task's issue: `state/queued`, `state/running`,
`state/waiting-human`, `state/in-review`, `state/done`, `state/failed`,
and since Stage 11 `state/backlog` (renamed in place from
`state/suggested`) and `state/waiting-deps`, with the lane labels of the
project's process. Forgejo's own issue list therefore shows the board's picture until the
console exists.

**The human lane.** A `human` issue gets a task row in `waiting-human` and no
workflow. Closing the issue finishes it `done`. Agent escalations land in
the same state (6.6).

**The workflow.** factoryd runs the Temporal worker itself, on task queue
`factory-tasks`, one workflow `task-<id>` per agent task. It links the issue,
runs up to `limits.sessions` sessions (3 by default, 5.3), opens the pull request, waits for the checks
(45 minutes at most), runs the gates and the model review, files an approval
request (7) and then waits for a person: a merge finishes the task
`done`, a pull request closed without merge or a closed issue finishes it
`failed`, a trusted change request runs another session with the request as
findings. Attempts start on `coding-cheap`; red checks or a repetition trip
move the next attempt to `coding-frontier` (Ruling 86), and since Stage 12
so does the stuck rule (6.6). The wall-clock cap
counts the agent's working time across attempts, not time since intake,
because a PR image build alone takes longer than a session (Ruling 93);
human waits have no timer, since a Temporal wait costs nothing. Terminal
signals cancel a running session or check wait at once instead of after it.
Since Stage 9 the session cap is the round cap for every exhaustion (Ruling
193, Task 81, change id `session-cap`): when the attempts run out, whatever
ended the last session, a supervisor redirect, `no_push`,
`retry_stronger`, a session error or a human's change request on the last
round, the task goes to the card with the cap line, the last reason and
every finding so far. A human's answer buys one more session, and a merge
or a close decides the task. The gap showed on the bug lane's first task,
#186: a roll restarted factoryd during its fourth session, the resumed
session fired the half-way check-in at once, the supervisor answered
`retry_stronger`, and the task failed "4 attempts exhausted" with no pull
request.
Since Stage 12 finished work survives every cap (Task 112, change id
`keep-work`). The agent time is the task's own, hours by default (5.3),
and a session starts only with at least five minutes of it left, since
the pod's start and a first build take one or two. At any cap, the agent
time, the session cap or under five minutes left, the short activity
`BranchHead` reads the fork branch, and a head past the base that no
verification has judged goes to verification, the pull request, checks,
review, approval and merge, instead of failing. Only a verification that
returns findings with no time or session left reaches the human, and then
on one cap card with those findings, whose answer grants one more session.
A branch with no commit past the base fails as before. A writer's change
request at the last regular attempt or at a cap is the human's answer
itself: it grants the one extra session with the request as its finding,
and no cap card follows (Ruling 225), where Stage 11's exit test paid two
clicks for one decision. `Finish` deletes the fork branch only of a task
that ends `done` or `closed`, so a failed task's work stays for a refile,
and nothing prunes those branches yet. A task's first session starts from
the base branch's head as it is when the session starts and records it as
the task's base, not from the commit its card held when it entered the
lane, so a plan card that waited on its dependencies starts on their
merged work. On the round's exit test no card reached a cap.
Since Stage 10 no workflow or activity input or result carries a
credential (Task 89): every activity takes the task id and plain values,
and mints or reads its tokens inside itself, so Temporal's history, which
outlives the task, never holds one. A test runs a whole task on the real
activities with a recording data converter and scans all 54 payloads for
tokens, with a canary to prove the scan bites; a live task's 145 history
payloads held none. No workflow change was needed.
Each step appends a line to the task's timeline, `sessions/<id>/timeline.jsonl`
in S3, served by `GET /tasks/{id}/timeline`: intake, sessions with their
parents and findings, supervisor decisions, the pull request, every signal,
the final state. `Finish` revokes the credentials, sets the final label,
comments the reason, closes a failed task's pull request and deletes the
fork branch of a task that ended `done` or `closed`; it retries without limit, because a task stuck half finished
is worse than a slow one.

**Heal pass and Reconcile.** Forgejo never retries a failed webhook
delivery, so a signal that arrives while factoryd is down is lost unless
someone asks again. The heal pass runs at boot and every minute: it starts
a workflow for every unfinished agent task that has none (Temporal refuses
duplicates), re-reads Forgejo for every task in review or waiting on a
human (pull request merged or closed, issue closed, trusted comments newer
than the last one seen) and signals what it finds exactly as the webhook
path would, and prunes delivery ids older than 30 days. It also files a task
for every open `agent` or `human` issue that has none, so an issue opened
while factoryd was down still becomes a task. Every workflow run
begins with a `Reconcile` activity that reads where the task really stands,
so a restarted workflow adopts an open pull request instead of starting a
new session, and finishes a task whose pull request was merged while no run
existed. With Task 66 the heal pass reads every open issue of the code
repository and of every managed project, labelled or not, and it closes a
suggestion a writer closed, but it never starts one.

**Projects.** A project is what the factory builds software for. The
factory makes software and does not own how a project runs: the project's
CI/CD, its environments and its promotion are the project's own code in its
own repository, developed through the same gates (Ruling 146). The
factory's interest is identity and hardware. Built in Task 65, and the demo
app registered live after roll 7914efb:

- **Its own Forgejo organisation** (Ruling 164). Registration creates the
  organisation `<name>` with the repository `<name>/<name>`, its packages
  and its teams. A user `ci-<name>` in the organisation's team `ci` holds
  package write in that organisation only, and its token is the project's
  registry login. The review found the Critical that forced this: on `auto`,
  agent code would have run in main CI on sf's privileged runner, as node
  root, with a PAT that writes every sf package. Forgejo 15 scopes package
  write per organisation, not per package, so the bound is the
  organisation. The user `factory-projects` owns every project organisation
  and holds nothing in `sf`, so its one `write:repository` token never
  reaches the factory's own repositories.
- **Its CI on the factory's ephemeral runners.** The spawner (7.1) serves a
  project's pull request and `main` jobs with the projects token, never sf's
  organisation runner, which cannot see another organisation's jobs.
- **Its credentials.** Registration mints `pull` and `registry` for
  `ci-<name>`, `git-<name>` (Flux's read token, limited to the repository)
  for `factory-projects`, and `project-<name>` for `factory-merge`, whose
  merge and trust checks on the project use that token. A write deploy key
  pushes the project's rolls, and its private half lives only in the
  Actions secret `DEPLOY_KEY`. The Actions secrets are `DEPLOY_KEY`,
  `FACTORY_READ_TOKEN`, `FACTORY_SSH_HOST_KEY`, `REGISTRY_USER` and
  `REGISTRY_PASSWORD`. `FACTORY_SSH_HOST_KEY` is Forgejo's SSH host key as
  factoryd's own in-cluster handshake finds it, rewritten when it changes
  (Ruling 165), because Forgejo keeps its host keys on a volume the rebuild
  does not restore, so a key pinned in Git would break every project at
  each rebuild. Forgejo refuses Actions secret names that start with
  `FORGEJO_`, which the first live registration found. The pull, git and
  merge tokens are plain text in Postgres and its backups, each reaching
  one project, which is accepted.
- **The deploy branch holds the rolled state** (Ruling 166). `main` keeps
  the push whitelist (`factory-merge` and the approvers, never the deploy
  key) and 0 or 1 required approvals by merge rule. Branch `deploy` is
  created from `main` at its first commit and protected with the pattern
  `.forgejo/**;.gitea/**;.github/**`, with only the deploy key allowed to
  push. Flux tracks `deploy`. The first design put that pattern on `main`,
  and it refused the demo app's first push, since every first push carries
  `.forgejo/`, the admin's included. On `deploy` it blocks exactly a
  workflow change pushed with the deploy key. Forgejo refuses to create a
  branch its pattern covers, so the repository starts empty and `deploy`
  is protected only after it exists. As built, a roll copies `deploy/` of
  the built commit into `deploy`, which holds nothing else.
- **Flux tenancy** (Rulings 157, 164). A project never owns Flux objects.
  Registration creates the GitRepository `<name>` in `flux-system`, which
  the admission policy pins to `https://git.aisoftwarefactory.world/<name>/<name>`
  and the secret `<name>-git`, and one Kustomization per environment, path
  `deploy/<env>`, in the environment's namespace, with the ServiceAccount
  `flux` and that namespace as target. Flux takes the account from the
  Kustomization's own namespace. `flux` is bound to the ClusterRole
  `factory-project-deployer`: workloads, Services, HTTPRoutes and CNPG
  objects, no RBAC, no Flux kind, no network policy, nothing
  cluster-scoped. So a merged change to `deploy/` reaches only the project's
  own namespaces, and cannot take over the cluster, which a root
  Kustomization with the controller's rights would allow. The controller
  itself refuses remote bases and defaults a Kustomization without an
  account to its namespace's `default` account.
- **Namespaces, network and quota.** Each environment namespace carries
  `factory/project=<name>` and the restricted Pod Security label. The label
  routes an alert from that namespace to the project's repository (8) and
  feeds the collector interlock (Ruling 123). The CiliumNetworkPolicy
  `project` denies by default: in from the namespace, the edge Envoy and
  CNPG, out to the namespace, DNS, the API server, the SigNoz collector on
  4318 and, since Stage 10, the outside hosts the project's file lists under
  `egress` and nothing else (backlog 20, Ruling 203). The first design ended
  with the world on 443, which let a compromised app send its secrets to any
  host; a project without the list reaches nothing outside the cluster.
  Proven live: after the roll demo-staging's policy held DNS, the API
  server and the collector only, and the app kept running. The ResourceQuota `project` is the project's
  in-cluster quota, 2 CPU, 4 GiB and 10 GiB by default.
- **Registration is one factoryd action, reconciled from Postgres** (Ruling
  156). Forgejo mints another user's tokens only under the admin's basic
  auth, so registration needs the admin's password. Until Stage 12
  `factoryd register-project` took it on stdin and the console's panel had
  a field for it. Since Stage 12 (Rulings 212, 219, Task 109) no human
  types it: the seed writes the admin's login into OpenBao's kv mount
  `factory` at `factory/forgejo-admin`, a policy lets only factoryd's
  service account read that one path through Kubernetes auth, and factoryd
  reads it at each registration into memory, uses it, drops it and never
  logs it. The reconcile registers: a factory project whose row lacks its
  tokens is registered on the next reconcile, which runs within a minute
  of the project file's load, and a registered project reads no
  credential. `register-project` takes only the name and `--rotate`, and
  reads OpenBao too. factoryd reconciles every project at
  boot, on a console change and when the policy version changes, and a
  push to a project's `main` without a `deploy` branch runs the reconcile
  too. Since Stage 10 it also reconciles every project hourly, so a hand
  edit in Forgejo is set back within the hour (backlog 25); it removes a
  factory project's collaborators it does not keep, so an approver taken
  off the policy leaves the repository (backlog 24); and a protected
  `deploy` branch that does not exist no longer stops the reconcile before
  the deploy key and the host key (backlog 69). Git is not the store for these objects: the Postgres restore
  re-seeds them. A second run logs only `no change`, `ready` or `ensured`.
  The hostnames are the one exception, an infra commit (3.4, Ruling 155).
  Since Stage 9 the settings come from the project's file and the row keeps
  the name and the minted tokens, so `register-project` takes the name
  only (Task 73).
- **A new project from the console and a seeded repository** (Ruling 205,
  Tasks 99, 104). The console's "New project" form writes the project file,
  judges it with the loader's own check over infra's head, and opens a pull
  request on infra as the human (Ruling 183 kept). Infra's `main` needs 0
  approvals since Ruling 209, because Forgejo refuses an author's own
  approval and one human could never merge such a pull request. Sebastian
  stays its only pusher and merger. A status panel shows four steps with
  tooltips and polls every 3 seconds until the last: the pull request, its
  merge and load, "Repository created", read from the reconcile's state
  and showing the last reconcile error while the project is not ready, and
  "Board ready", set from `projects.ready_at` by the first clean reconcile.
  Since Stage 12 the human's acts are the button and Merge: no password
  and no register click (Ruling 219). Live on `scratch12`, the button
  filed infra #11, and after the merge the reconcile created the row,
  registered the project from OpenBao's credential and seeded it within 30
  seconds. A project file may name
  a `template`, a directory under infra's `factory/templates/`. The seed
  step renders it (delimiters `[[ ]]`) and commits it as `main`'s first
  commit through the contents API as `factory-projects`, before `main` is
  protected, since agents may not write `.forgejo/`. The template `ts-go`
  (a Go API and a Vite single-page app in one image) seeds the three-job
  checks, the main CI with staging and promote, `roll.sh`, an empty
  `deploy/base`, the staging kustomization and `AGENTS.md` with the layout
  the CI relies on. Every job skips on an empty repository, so the seed
  commit's run is green. Live on `linkshort`: the button to "Board ready"
  took 87 seconds. The exit test showed what the template lacks (backlog
  89): project namespaces enforce Pod Security `restricted` and pull from a
  private registry, and nothing told the planner or the agents, so staging
  first ran no pod, while the CI `staging` job read green because it only
  writes the digest. A seeded Deployment skeleton with the restricted
  security context and `imagePullSecrets`, and a staging job that waits for
  the rollout, close it. The template's deletion rule also compares a
  branch with `main`'s head, not the merge base, so a branch behind `main`
  read as deleting a file (backlog 83).
  Since Stage 12 `ts-go` works out of the box (Ruling 222, Tasks 118, 119).
  It seeds a minimal working app: a Go server with `/healthz`, a 404 JSON
  under `/api/` and the embedded single-page app under `/app/`, built by
  `internal/server.New`, which tests import, and a Vite page with one test
  each, a `renderAt` helper over a memory router and a `mockFetch`. A
  `check` file at the root is the repository's one check, run as `bash
  check`: `npm ci --ignore-scripts`, type check, tests and build in `web/`,
  then `go vet`, gofmt over every Go file, gosec through `go run` at the
  runner image's pin, and `go test -race`. The agents own and extend it,
  and must not weaken it: the pull request's checks job fails when `check`
  no longer names gosec and `go test -race`. CI's checks job runs `bash
  check` and nothing else of its own. The Dockerfile pins its bases by
  digest and runs as uid 65532, and `deploy/base` holds a Deployment that
  meets Pod Security `restricted` and names the pull secret, a data claim
  and a Service. Every deletion rule compares with the merge base. The
  staging job, after the roll commit, polls the read endpoint below with
  the run's digest every 10 seconds for up to 10 minutes and goes red with
  factoryd's summaries while the rollout is not done, and a run that main
  has moved past leaves the wait to the newer run. `AGENTS.md` no longer
  asks for digests the sandbox cannot look up. So registration's first CI
  run proves the whole path: on `scratch12` the seed's run took 4 min 11 s
  of checks, 39 s of image and 39 s of staging, and the Deployment ran on
  the run's digest under Pod Security `restricted`. On the exit test every
  feature card conflicted once with `main` on the one route list in
  `internal/server/server.go` and spent a short session merging `main`:
  the template has one registration point where each feature needs its
  own (roadmap).

Per-project settings are a file since Stage 9, `factory/projects/<name>.yaml`
in the infra repository (Rulings 146, 179, 183, Task 73): the repository,
the merge rule `auto` or `human` (7), the `notify` list for information
requests (8), the namespaces and environments, the in-cluster quota, the
envelope with its task and standing blocks (5.5), and two settings that
replace every special case of the factory's own repositories. `objects:
factory | seed` says who creates and reconciles the repository objects:
registration, or the infra repository and the seed, with factoryd only
reading and reporting. `agents: coder | none` says whether agents work
there: `none` sends every issue to the human lane, and `POST /tasks`
answers 422. The code repository is `seed` and `coder` on `human`, the
infra repository `seed` and `none` on `human`, and the demo app `factory`
and `coder` on `auto`. A seed project's file names which of factoryd's
seeded tokens reach it, and the enumeration leaves out the
`factory-projects` token, so Ruling 164's bound holds: that token never
reaches `sf`. No repository name is left in code: the labels at boot, the
console's new-task form, the heal pass, the trust gate and the CI spawner
all take the project path. The migration dropped the settings columns and
the `envelopes` table, and factoryd refuses to boot without a project whose
file lists its own namespace. A seed project's webhook reads "not
checkable" at boot, because Forgejo refuses a hooks read to
repository-limited tokens. A bot's close of an issue counts only when
factoryd recorded that close itself, so a leaked bot password cannot end a
human-lane task. Proven live: the infra repository's `POST /tasks` answered
422, and its issue #4 ran as a human-lane task whose close moved the label
to `state/done`. There is no run-model file.
A project's promotion is its own code, and one factory read endpoint serves
it: `GET /projects/{name}/alerts?namespace=<ns>` with the project's
`FACTORY_READ_TOKEN` answers the firing SigNoz alerts of that namespace plus
a `rollout_not_ready` entry for an unfinished rollout, cached 30 seconds,
and fails closed. factoryd reads SigNoz as a viewer-role user. Since Stage
12 (Task 118) a `digest` query asks about one build: the namespace without
a Deployment, a Deployment whose images do not end in `@<digest>`, and one
that runs the digest but is not rolled out, its pod starting or crash
looping, each answer `rollout_not_ready`, and the digest is part of the
cache key. The template's staging job waits on it.

**Members, approvers per project and GitHub** (Stage 15, Rulings 254 and
256, design, not built, 5.7). A member will be a write collaborator on the
project's Forgejo repository, admitted to the console for the projects they
write and to no other, while the factory-level pages stay with the writers
of the factory's own code repository. Approvers move from the policy into
the project's file as `approvers:`, with the policy's list as the default
and as the factory's own, and the operator invites a member in Forgejo or
on the project's page, never through the chat. The new-project panel gains
a start from an existing GitHub repository, cloned into the new Forgejo
repository in place of the template before the normal registration, with a
private source's token stored in the mirror row and never given to an
agent. Export is a push mirror to a GitHub repository the member names,
kept by the push-mirrors job (Ruling 126), and the chat never creates or
manages a project.

The demo app, the first project, is a Go link shortener with Postgres
(Rulings 145, 153), repository `demo-app/demo-app`. `POST /links` needs a
bearer token from the secret `demo-write-token`, which keeps an open
shortener from serving phishing links. Each environment runs its own
single-instance CNPG cluster inside its namespace, under the project's
quota. A load generator CronJob creates one link every minute, follows it
five times and requests one malformed slug, which must answer 404. A
recover middleware answers a handler panic with a 500 and records it on the
metric and the span, so a panic raises a 5xx signal. Its `ci.yml` builds
the image on a build VM, pushes it with `crane`, rolls staging on `deploy`,
waits 15 minutes, asks the alerts endpoint about `demo-staging` and rolls
prod only on an empty answer. Its first live run held prod back: 8 "Job
failed" alerts fired in `demo-staging` while staging still ran the
placeholder digest, and the gate did its job.

**Telemetry.** factoryd, factory-gateway and the worker emit OpenTelemetry
traces, metrics and logs over OTLP/HTTP to SigNoz's collector on 4318, each
binary naming its own `service.name` (Tasks 60, 68). Without an endpoint the
providers are no-ops, and the exporters never retry.

- factoryd spans every Temporal activity with `task.id`, and its metrics
  cover the pipeline: CI job and run durations, the CI queue, build VM
  lifetime, ready time and cost (7.1), roll-to-live (7), one gate duration
  histogram, the age of the oldest open activity per kind
  (`factory.activity.open_age`) and `factory.alert.count{kind,verdict}` (8).
  One dashboard, `factory pipeline`, is JSON applied by the `signoz-objects`
  job, and the per-day roll-up lives in SigNoz only.
- The gateway gives each request a server span, with a child span `model
  <alias>` or `tool <tool>` carrying task, project, upstream status, hold
  and cost, and counts `gateway.calls`, `gateway.call.duration`,
  `gateway.spend.eur{project}` and `gateway.refusals{reason}`. Every audit
  row the store accepted also becomes one log record, body `audit
  <decision>`, the columns as `audit.*` attributes. Postgres stays the
  authoritative record: a sandbox may send OTLP to the collector (6.4), so
  it could forge a copy in SigNoz. On SIGTERM the gateway drains and
  flushes its telemetry before it exits.
- The worker's trace has a root span `session` with the children `brief`,
  `run` and `push` and a span per tool call, and it counts session
  duration, tool calls and tokens. It ends and flushes the session span
  before it prints its result, because the pod's deletion would lose it.
- Traces join by `task.id`, not by parent links: the gateway ignores trace
  headers from the sandbox.
- Since Stage 9 (Tasks 76, 78) factoryd's API and console listeners have
  HTTP server spans named by route pattern, both Deployments set
  `OTEL_RESOURCE_ATTRIBUTES` with their namespace, and four task metrics
  feed the analytics (8). Those four go out as deltas from a second meter
  provider, because SigNoz's increase over a cumulative counter dropped a
  series' first count and every count before a restart.

One package, `internal/redact`, scrubs every text that leaves for
telemetry or a model: bearer and basic credentials, URL userinfo, JWTs,
provider key shapes, PEM blocks, provider response bodies, configured
secrets, and any run of 32 or more token characters. The gateway's audit
records, the worker's git errors and the gate supervisor's bundle (6.6) all
use it. The 32-character rule masked commit ids, digests and long paths as
well, until the bug lane fixed it (backlog 32, #197, merged as daf16c8):
commit ids, sha256 digests and lowercase repository paths now pass. Proven live on task t-c4e5c525334f: 31 spans under its id (10
from factoryd, 14 from the gateway, 7 from the worker), 5 audit records equal
to its 5 audit rows, and none of 37 gateway records holding `sk-`, `Bearer`,
`BEGIN` or a fragment of the gateway's own keys. The live data found one
false positive, "missing bearer token" arriving as "missing bearer
[redacted]", now fixed.

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

Capability policy is data, and since Stage 9 so is the rest of the
factory's configuration (Ruling 183, Task 72). factoryd reads the tree
`factory/` straight from the infra repository's `main` every 30 seconds,
with a read-only token of its own Forgejo user `factory-config`:
`policy.yaml` with the sections below, `projects/<name>.yaml` per project
(5.1), and since Stage 11 `processes/<name>.yaml` per process (below) and
`templates/<name>/` per repository template (5.1). `workflow.yaml` went
into the process files. No ConfigMap and
no custom resource carries it. The first design, the ConfigMap
`factory-policy` applied by Flux (Ruling 107), is gone, and Kubernetes stays
the substrate only, with none of its vocabulary in the factory's own files
(Ruling 184). The plan said "rows in Postgres, edited through the UI or
API". Git is the editing surface instead, so a human authors every change
in a commit and Git holds the history.

The version is the commit. factoryd stores each new tree as an immutable
`policy_versions` row with its commit, the gateway enforces the current
version from Postgres, and every audit row names that version. Every task
pins the version it started under: its session cap, agent time and
`stronger_after`, and in every session, gate supervisor call and review the
agent time, the supervisor calls, the supervisor timeout, the `no_write`
threshold and the gate bounds. The risk rules, the factoryd aliases, the
gateway's enforcement, the budget at intake, the approvers, the envelope
and the project defaults are read live. A JSON Schema generated from the Go
types (`factoryd schema`) sits in `factory/schema/`, and each file names it
in its first line, so an editor completes and checks the enumerated
options. A CI job on the infra repository runs `factoryd config check` on
every push to `main`, with the loader's own judgement, so a tree factoryd
would refuse turns the check red; a schema change needs the regenerated
`factory/schema/` and the check's `FACTORYD_IMAGE` in the same infra
commit. A refused commit logs `CONFIG REJECTED`, keeps the old version
current and raises an alert of kind `config_rejected`, which files an issue
in the infra repository's human lane. The next valid commit closes that
issue, ends its task and judges the alert real. Ten failed reads in a row
raise one alert and no issue. factoryd refuses to boot only when no valid
version exists. The console shows the current commit, the workflow and the
projects read-only, each linked to its file at that commit. Runtime
decisions (approvals, leases, promotions) stay Postgres rows, and each one
is audited. Proven live on 2026-09-29: a push with `on_findings: maybe` was
refused with version 155 kept current, filed infra issue #1 and turned the
check red, and its revert loaded as version 156 and closed the issue.
Enforcement is code in the gateway. The hierarchy, from the baseline conversation:

```
task requires capability X in environment E
   -> task row: granted / requires approval / forbidden
   -> gateway enforces on every call, audit row for every decision
   -> network policy makes bypass unreachable (the sandbox can only
      route to the gateway and Forgejo git, plus named registries)
```

Besides its `version`, `policy.yaml` holds eleven sections:

- `budget`: the task default, the task maximum, the day cap and, since
  Stage 10, the month cap `month_eur` (5.4), in euros.
- `classes`: per capability class, the allowed model aliases and tools, each
  tool with `max_requests` and `max_eur`, and the `review_model` and
  `supervisor_model` factoryd may call for a task of that class (Task 71),
  and since Stage 10 the `audit_model` for the security audit (7, Ruling
  200).
- `prices`: the tool prices no provider API returns (Firecrawl credits,
  Replicate rates per hardware SKU with a model to SKU map, fal's
  `max_megapixels`).
- `risk`: the risk classes of changed paths for the policy gate (7), each
  with its outcome.
- `envelope_default`: the standard resource envelope (5.5).
- `project_default`: a new project's quota and standing block (5.1, 5.5).
  Every project file names its own merge rule since Stage 9.
- `approvers`: the Forgejo users who may authorise spend in the console (5.6).
- `link_hosts`, since Stage 10: the hosts a link in agent-written text may
  name when factoryd posts it to Forgejo; the sanitiser defangs any other
  (7).
- `bounds`: seconds per Temporal activity before its gate counts as stuck
  (6.6), plus a `default`.
- `supervisor`: the thresholds of the session supervisor's progress
  detector (6.6).
- `limits`, since Stage 9: the session cap (3), the agent time per task,
  the supervisor calls per session, the supervisor timeout (6 minutes,
  Ruling 186, at most 15) and `stronger_after`, the returns from one stage
  before the stronger rung (1). They replace factoryd's environment
  variables `MAX_SESSIONS`, `WALL_CLOCK_CAP` and `SUPERVISOR_MAX_CALLS`.
  Stage 10 added `steps`, the harness's step cap per session (6.4), and the
  loop nudge's three (6.6): `nudge_after` (3 identical calls in a row),
  `nudges` (1 per repeated call) and `same_call` (4, the trip), with
  `nudge_after` below `same_call` or the loader refuses the tree. Stage 12
  (Rulings 216 to 218, Task 110) made the agent time hours and added
  `check_in`, the interval of the supervisor's scheduled check-in (6.6, 0
  for none): agent time 2 hours (it was 20 minutes), check-in 45 minutes,
  steps 1500 (it was 200, which ran out in 17 to 50 minutes; at 5 seconds a
  turn 1500 steps outlast 2 hours, so the agent time stays the bound) and
  supervisor calls 6 (it was 3), check-ins not counted. The per-task spend
  cap of 2 EUR stays the cost guard. The two time values form
  `policy.Time`, which a class in `policy.yaml`, a process file and a
  project file may set too, each field on its own: the most specific set
  value wins, project over process over class over limits, so a project
  that needs a day for a card says so in its own file. The agent time runs
  from 1 minute to 72 hours, the check-in is 0 or 10 minutes up to the
  agent time, and a resolved check-in not below the resolved agent time
  becomes 0. The class `planner` sets 30 minutes and no check-in. Every
  session kind, plan and report sessions included, takes its time from
  the task's class, process and project.

Stage 15 adds a twelfth section, `chat` (Ruling 252, design, not built,
5.7), which a project's file may set as well: the project agent's model
alias, its monthly euros and the tools that need a human's OK. The
defaults:

```
chat:
  model: operator          # LiteLLM alias, tier-high
  monthly_eur: 5           # the project agent's own line
  confirm: [new_card, move_card, start_plan, retry, accept_plan,
            request_changes, reject_plan, approve_merge, deny_merge,
            github_export, github_sync]
```

A tool in `confirm` renders a proposal with a Do-it button, a tool outside
it applies at once, and an empty list lets the agent do everything it is
told. `monthly_eur` caps the agent's and the pulse's calls together (5.4).
`confirm` is a preference, not a cap, so stricter wins (below) does not
bind it: a project file's list replaces the policy's, shorter or longer,
and the policy's list is the default for a file that sets none. The
project's `monthly_eur` stays bounded by the policy's, as every spend
figure is.

Stricter wins (Task 89): a project file may only tighten what
`policy.yaml` sets. Its quota, envelope (monthly euros, server types,
count, lease hours, volume size) and standing block are bounded by
`envelope_default` and `project_default`, compared in base units, and the
loader and `factoryd config check` refuse a looser file; the schema's
descriptions name the bound. Proven: a demo-app file with 3 CPU, 50 EUR a
month and a cx53 was refused with one line per field. A deny beats an
allow at every level, which a denied tool shows (below).

The decoder is strict: an unknown key or a second YAML document rejects the
file. So a new section lands in infra before the factoryd that reads it. The
running factoryd rejects the new key and keeps its current version until the
roll.

**Processes composed from blocks** (Rulings 206, 208, Tasks 94, 95, 98).
The factory ships no fixed development process. A process file holds four
blocks with fixed keys and enumerated values: `lanes` (5.1),
`dependencies` (only with a plan lane), `stages` (7) and `merge` (`queue:
none | project`, 7). A project with `agents: coder` names one by
`process:`, and another developer adds a process by adding a file that
passes the check. Two ship: `maintenance`, today's flow, on the code repository and
the demo app, and `spec`, plan then build. A class is defined in
`policy.yaml` only and named by a process, so a process cannot widen what an
agent may call. Each class carries a `session` mode, `code`, `report` or
`plan`, which picks the workflow's program. The workflow reads its process,
lane, class, stages, queue and dependencies from the task's pinned version
(`TaskConfig`, change id `processes`), and no code path names a process: a
test greps for the two file names. The check is mechanical, with no model:
schema and names, needs met in order (a lane's class of the right session
mode, naming the review, audit and supervisor models the stages call, and
`dependencies` for a plan lane), a graph in which every entry reaches done
or a human card and every cycle is capped, and floor rules no process may
lower (F1 to F11: checks always run, with findings to the agent or fail,
policy fails on forbidden, approval stands right before merge, and merge
comes last). Every
refusal is one line, `<file>: <block>: <reason>`, and `factoryd config
check` and the loader share the judgement, 66 fixtures agreeing. One rule
only the running factoryd can apply: a head that removes a lane still
holding open cards is refused with their issue numbers. `factoryd config
explain <process> <card kind>` prints the path a card takes, generated from
the same graph, so the text and the check cannot drift. What no process may
express, such as conditions, lanes beyond the three, triggers, a merge
without checks or a per-project override, is listed in the design and left
to later blocks (roadmap 27a). The switch from `workflow.yaml` was one
infra commit: the old factoryd refused it (`CONFIG REJECTED`, infra #9),
and the roll of the new one dropped the stored version, loaded the head as
version 275 and closed the issue.

The gateway checks each model call in this order: the JWT, the task status, a
capability class that allows the model (else 403 `refused_capability`), the
task headroom (else 402 `refused_budget`) and the day headroom (else 402
`refused_day_cap`). It refuses routing overrides in the request body, such as
LiteLLM's client-side `fallbacks`, which would reach any model under an
allowed alias. It admits function tools and text parts only. Each minted key
carries the class's model list, so LiteLLM refuses other models as well.
Since Stage 10 one admission check serves the tool list and the call (Task
89): `tools/list` shows a session only the tools its classes may call, the
brief names the same tools, and a hidden tool called anyway is refused
with `refused_capability` and audited. Live, a coder session's list held
its class's 12 tools; the hiding itself is proven by test only, since no
narrower class ran a session.
A model call whose caller has gone is the caller's act, not a fault
upstream. Since Stage 12 (Task 122) the gateway answers 499 with the audit
decision `client_canceled` when the request's own context is cancelled,
during the upstream call or while it mints or renews the session's key,
and keeps the hold's booking, since the provider may have run part of the
call. A transport failure while the caller is still connected stays 502.
The case came from the supervisor: each session it ended cut the agent's
pending call, the gateway answered 502 `error_upstream` to a client that
was gone, and five such answers in a quiet hour fired the 5xx alert on the
gateway, which filed code #348 and cost an agent three sessions of reading
a fault that was not there.

An OPA sidecar is the named upgrade when rules multiply beyond what Go code
reads well. Policy never lives in a prompt.

The first capability class is deliberately one: `coder`, holding repository
read, branch write, model aliases and allowlisted tools, nothing else. The
classes from the baseline conversation (analyzer, integration-tester,
release-agent, prod-operator) arrive one per phase as the loops that need them
come online. Stage 9 added the second, `analyzer` (Rulings 182, 185, Task
74): the coder's models and the supervisor, the tools `web_search` and
`web_scrape` with caps, `request_info` and `escalate_to_human`, no
commissioning tools, and a session in report mode (6.3). It serves the
improvement presort (5.1) and the screening stage (7). No Stage 9 loop
needed another class: the release is the roll task, code with no class (7).
Stage 11 added the third, `planner` (session `plan`, 5.1): the coder's
models, starting on the stronger rung since one plan steers every card it
files, web search and scraping with caps, `escalate_to_human`, and no
`request_info`, since the spec's author answers on the plan card. Nor did a need for SPIRE or OPA appear: one cluster, projected
ServiceAccount tokens, and ten policy sections that Go code reads. `review-frontier` and `supervisor` stay out of the class's
`models`, so no agent can call them. Every factoryd model call goes through
the gateway like an agent's (Task 71, rolled 2026-09-28 in ba2d80a).
The Task 71 brief assumed the gate supervisor already did. It did not:
factoryd called LiteLLM directly for the session supervisor, the gate
supervisor and the model review, held and booked the cost itself, and the
gateway wrote no audit row and applied no policy. Task 68's live proof
showed the gap: a task's `spent_eur` of 0.009077 EUR held 0.000895 EUR of
gateway calls, 0.00629 EUR of gate supervisor and 0.00190 EUR of review that
no gateway metric or span could see. In the new path factoryd sends its
existing `gateway-factoryd` token with `X-Factory-Task` and
`X-Factory-Purpose` (`review`, `supervisor` or `gate-supervisor`). The
gateway admits exactly the class's `review_model` or `supervisor_model` for
that purpose, on a task that is running or in review, and holds, clamps,
books and audits the call like an agent's. The hold and ledger ref is
`<purpose>/<alias>`, the audit row's `kind` names the purpose, and the
LiteLLM key sits in the task's own factoryd slot, so it neither retires nor
shares the session's key. That slot carried the defect "Key is blocked":
factoryd blocked every LiteLLM key with the task's id at each session's
reconcile, the factoryd slot's key included, and the gateway kept the dead
key in its cache, so the second supervisor call and the review after a
session answered 401 on every task of the Stage 9 bug lane until the fix
rolled on 2026-09-29 at 16:02Z (c6f374a, Ruling 195). The gateway now marks
the slot in the key's metadata, the reconcile leaves that key live, and a
key LiteLLM answers "blocked" for is dropped from the cache, minted again
and the call retried once. A sandbox's JWT never reads those headers, so an
agent's purpose is always `agent`. factoryd's own model path is deleted.

### 5.4 Cost ledger

LiteLLM tracks model spend per virtual key. The gateway tracks tool spend per
call. `factoryd` aggregates both per task and per day, with hard caps that the
gateway enforces on every call.

The gateway books each model call's own cost atomically into the task row:
the `x-litellm-response-cost` header for plain calls, and the `usage.cost`
field of the final chunk for streams, which the gateway forces on. LiteLLM's
`x-litellm-key-spend` header cannot serve: it is the cached spend before the
call, zero on every stream. After a task finishes, factoryd settles its model
spend to the total LiteLLM recorded on the task's keys, which covers
abandoned streams. LiteLLM writes that total 60 to 80 seconds late, so a
settlement loop, apart from the runner's claim loop, re-settles once a minute
every task finished within the last two hours (the hold lifetime plus an hour)
whose model holds have closed. Inside that window a pass only raises. Past
it, once, the final pass sets the task's model spend to LiteLLM's figure,
down as well as up, with a settlement row that may be negative, dated the
task's own finished day, and marks the task settled (Ruling 196, migration
0034, "settle down", live since the Stage 10 gate's roll). Each pass lists
LiteLLM's keys once, and a difference below 1e-9 EUR is float noise and
books nothing. The first final pass found a defect: it added its delta to
`spent_eur`, and 41 tasks settled before the ledger existed had their whole
LiteLLM figure booked a second time (+4.84 EUR, the ledger itself right).
Since the bug lane's fix `spent_eur` is set from the task's ledger sum
(backlog 73), so the ledger is the one record and `spent_eur` only
mirrors it, and the one-time migration gateway/0009 repaired the 41 rows
and gave 14 old tasks their missing finish time. After it no settled task's
`spent_eur` differs from its ledger. On the Stage 10 run every task past
the window showed `spent_eur` equal to its ledger and its model rows equal
to LiteLLM's figure.

**The month cap** (Ruling 204, Task 92). `budget.month_eur`, 50 EUR, caps
all variable spend of every project and the factory in the UTC calendar
month: the ledger's rows since the 1st, standing lines left out, plus
every outstanding hold, read under the same advisory lock as the task and
day headroom. Model calls, paid tools and commissioned servers take the
smallest of the three headrooms, and a call that finds the month spent is
refused with `refused_month_cap`. The task then parks: its session ends as
an escalation, and the card says the cap is reached and that only a human
raises it, by a commit. factoryd raises a `month_cap` alert once a month at
50, 80 and 100 percent, and at 100 percent files an issue in the infra
repository's human lane that links the cap's line in `policy.yaml`. The
key is required: a version without it reads 0, which stops all spend, so a
missing value fails closed. Proven live with a window at 18 EUR against
September's 18.26: a planted task parked at spend 0 with the card, and the
infra issue was filed. The 50 and 80 percent alerts were not seen, since
the window jumped past them.

Caps hold on the call itself (Ruling 113). LiteLLM checks a key's
`max_budget` only before a call, so one call can run past it: in a proof, a
supervisor call on a key capped at 0.0007 EUR cost 0.028 EUR. So the gateway
prices each call's worst case from LiteLLM's `/model/info`, with every
per-token rate, tier and cache rate. It clamps the output-token limit so that
the worst case fits the free headroom of the task and the day. It takes a
`holds` row for that amount under a Postgres advisory lock before it calls,
which closes the race between concurrent calls. After the call it books the
real cost, or the whole hold when the cost is unknown. Five concurrent calls
on a task with room for one gave one 200 and four 402s. The supervisor, the
model review, tool calls and commissioned resources take holds in the same
table. LiteLLM's `fail_closed_budget_enforcement` and the per-key
`max_budget` stay the backstop.

A real cost above its hold is booked in full and flagged `allowed_over_hold`
in the audit (Ruling 117). The cap then holds by refusing the next call. A
call cut mid-flight, because the issue closed or the session stopped, books
its whole hold and is never reconciled downward (Ruling 115). LiteLLM's figure
for a cut stream is no upper bound of the provider's charge: a GLM call logged
0 completion tokens after it had reasoned. So a stopped task's total errs high
by at most one hold per cut call. The Stage 9 exit test measured what that
costs: a review cut by its gate bound booked its hold of 0.1447 EUR twice on
one task, and a redirect's cut session booked its hold on another, so those
two tasks' ledgers stood at 0.4767 EUR against LiteLLM's 0.2751 and 0.2058
against 0.1404, while five other tasks matched LiteLLM to the digit.
Sebastian ruled the settlement lowers a cut call to LiteLLM's figure after
the settle window (Ruling 196, above), so the hold is the charge only while
the window runs. A hold that no call ever closed, because a restart cut
the caller, is booked by the hold sweep; since Stage 10 the sweep writes the
call's audit row too (backlog 74), after the security audit's call on one
task died with a roll's gateway restart and left LiteLLM's log one row
longer than the audit.

Every booking is a row in the append-only `ledger` table, of kind `model`,
`tool`, `resource`, `settlement` or `standing`, with its UTC day. A standing
resource's hours (5.5) book under `standing:<repository>`, add no task
spend and take nothing from the day's headroom. factoryd serves the sums
per task and per day at `GET /costs`, and the console shows them. With Task
71, each task's total also lists its lines by kind and ref, so the review
reads as `model review/review-frontier`.

Stage 15 adds two refs outside any task (Ruling 252, design, not built,
5.7): the project agent's calls book under `operator` and the pulse's under
`pulse`, both on the project, capped together by the project file's
`chat.monthly_eur`, and the status line's spend figure includes them.

Tool calls reach the gateway's `/mcp` endpoint, an MCP server over stateless
streamable HTTP. It offers `web_scrape` and `web_search` (Firecrawl),
`replicate_predict`, `fal_run`, `escalate_to_human` (6.6) and the
commissioning tools (5.5). A paid call takes a hold for its worst case, calls
the provider without the agent's cancel, so a disconnect cannot cut a billed
call, and books the real cost: Firecrawl's `creditsUsed` times the credit
price, Replicate's `predict_time` times the hardware rate, and fal's price per
request or per megapixel from its pricing API. A call whose cost the gateway
cannot bound is refused before it runs: a Replicate model without a hardware
mapping, or a fal unit other than requests and megapixels. For megapixel fal
endpoints the input keys are an allowlist, and any other key is refused
before the hold (Ruling 117). Every admitted tool call writes a ledger row,
at 0 EUR too, because those rows count the requests against `max_requests`.

### 5.5 Cloud-resource commissioning

Agents may need a server, with a database or a service on it, for a task.
They get it through gateway tools, never through a provider key. As built in
Stage 7, the tools are `cloud_prices`, `commission_server`, `list_resources`,
`release_resource`, `ssh_certificate` and `resource_request_status`, and
Hetzner is the first provider. A sandbox commissioned a cx23 and logged in to
it over SSH in the live proof.

- **A separate provider project.** Agent resources live in their own Hetzner
  project. Only the gateway holds its API token, and factoryd never gets it.
  Hetzner tokens cannot be scoped below a project, so the gateway calls the
  API itself instead of handing out credentials. The cluster's own project
  and the CI project (7.1) stay out of agent reach.
- **Servers and volumes, no buckets.** The standard envelope covers servers
  with their IPv4 and volumes (Ruling 121). Hetzner's Cloud API has no bucket
  endpoint, and an Object Storage key reaches every bucket of its project, so
  a per-task bucket would put a shared key in the agent's reach. Buckets join
  when Hetzner offers bucket-scoped credentials, or behind a gateway S3 proxy.
  Until then a task that needs a bucket asks a human.
- **An envelope per project.** The policy's `envelope_default` holds a
  monthly euro cap, the allowed server types, a maximum count, a maximum lease
  and a maximum volume size. Today it is 10 EUR a month, cx23 and cx33, two
  servers, four hours and 20 GB. Since Stage 9 a project's envelope is a
  block of its file (5.1), `envelope_default` when the file names none, and
  a change is a commit; the `envelopes` table and its console form are
  gone (Task 73). Each task draws from the envelope under its own cap. The
  provider's own quota can still refuse a type the envelope lists: the agent
  project refused a cx43 on its shared-core limit.
- **Two resource kinds, one envelope, one process** (Ruling 147, built in
  Task 65). A `task` resource is what the rest of this section describes:
  leased, requested by an agent through the gateway, booked to the task and
  the project's monthly pool. A `standing` resource is a project's
  environment: no lease, requested by the project's registration or a human
  in the console, never by an agent session, and shown as a fixed monthly
  line. Each kind has its own monthly euros, server types and maximum count
  in the envelope, a human changes them at any time, and a request beyond
  them is an approval card. The column `lifetime` on `cloud_resources` holds
  `lease` or `standing`. The collector skips standing rows unless a human
  released them, `release_resource` refuses a standing server, and agents
  get no SSH and no egress to standing servers by default: they read
  telemetry and logs. The same split holds inside the cluster: sandbox
  limits for task work, the project's namespace quota for standing
  environments. The standing path through registration is not built, since
  no project needs one yet, and the demo app runs in the cluster.
- **More needs a human.** A request beyond the envelope writes an
  `approval_requests` row of kind `resource` (Ruling 116) and answers the
  agent "pending human approval", which it polls with
  `resource_request_status`. The console card shows the server type, the
  purpose, the lease, the cost per month, the reservation and what the
  request exceeds. Approval for the task admits one commission of that spec
  or a smaller one. Through Stage 8 an approval for the project widened the
  envelope just enough; since Stage 9 that is a commit to the project's
  file. An approval covers only the limits it was granted for, so a count exceeded
  later needs a new request. A task has at most three pending requests.
- **Registry first.** Before any create, the gateway writes the hold and a
  registry row for the firewall, the server and any volume in one
  transaction: task, project, session, type, size, purpose and lease expiry.
  The provider resources carry the labels `factory=agent`, `task`, `project`
  and `resource=<row id>`. The gateway creates the firewall, then the server
  (Debian 12, IPv4 only), then the volume. A failed create releases what it
  made, and a create whose answer was lost is found by its label. The console
  lists every resource by project and task with its cost so far.
- **Leases end orphans.** The agent picks the lease in minutes, within the
  envelope's maximum. Task completion deletes the task's resources. If the
  agent or factoryd dies, the lease still ends and the collector deletes the
  resource. It deletes at the last tick before the lease ends, so a lease of
  N started hours never bills hour N+1 (Ruling 124). A lease therefore ends
  up to 2.5 minutes early. A human can make a resource standing, for
  example a staging database, within the envelope's standing block, and it
  then counts against the project's standing line without a lease. A human
  can also release it early.
- **The collector trusts the registry.** It runs in the gateway every 2
  minutes. It deletes expired leases and the resources of finished tasks,
  deletes every server, firewall and volume the registry does not know,
  deletes primary IPs no server holds, and marks a row vanished only after a
  direct 404. The worst-case orphan cost is one lease length times the
  resource's hourly price. An interlock guards the wipe (Ruling 123): a pass
  deletes nothing and logs loudly when a listed server has a cluster node's
  public IPv4, or when anything listed carries another project's `factory`
  label. Either means the token opens the wrong project. A hand-made,
  unlabelled server is still deleted. The CI project's collector (7.1) runs
  the same code.
- **Reachability and access.** factoryd reads the live leases every 10
  seconds and adds each server's address on port 22 to the task's egress
  policy. It drops the address at the same cutoff the collector uses. The
  server's firewall admits SSH only from the cluster nodes, whose public IPv4s
  come from the infra-owned ConfigMap `cluster-facts` (Ruling 112). Its
  outbound is tcp 53, 80 and 443 and udp 53 to anywhere (Ruling 122). The
  server is the task's own machine, holds no factory credential, and is
  bounded by its lease, the envelope and the task's euro cap. So an agent can
  move data out through its server for the length of the lease, which is
  accepted. A name-allowlisting egress proxy is the named upgrade.
- **Certificates, not keys.** Servers trust the SSH certificate authority in
  OpenBao, `ssh-client-signer`. cloud-init sets no authorised keys and no
  password, and removes the expired root password Hetzner emails. The gateway
  signs the agent's public key through Kubernetes auth with a sign-only
  policy. A certificate lasts 30 minutes at most and ends at the lease cutoff, 210 s
  before the lease end (Ruling 130), when the egress rule goes too.
  Its principal is `resource-<row id>`, and cloud-init writes exactly that
  principal into the root user's `AuthorizedPrincipalsFile`, so a certificate
  opens one server only (Ruling 125). OpenBao 2.6.3 cannot restrict
  principals by prefix, so the role admits any principal, with the default
  `unassigned`, which no server lists. The binding is each server's
  principals file plus the gateway, which signs only for the task's own
  servers. Proven live on 2026-09-28 from a task's own sandbox: the other
  server's certificate got "Certificate does not contain an authorized
  principal", and a server with a volume had both provider deletes issued
  103 s and 88 s before the lease end.
- **Cost comes from the provider's price list.** Each connector reads its
  provider's price catalogue through the API. Hetzner's is one call,
  `GET /v1/pricing`, cached for an hour, and it prices every resource type
  they sell: server types per location, primary and floating IPs, volumes and
  snapshots per GB and month, load balancers, backups and traffic (verified
  2026-09-27). Before a create, the gateway reserves the started hours of the
  lease times the hourly price of the server with its IPv4 plus the volume. A
  cx23 costs 0.0088 EUR per hour and its IPv4 0.0008, so a one-hour cx23
  reserves 0.0096 EUR. The reservation is one `resource` hold, taken under the
  headroom lock with the task, day and month checks. The collector books each
  started hour as a `resource` ledger row and takes it off the hold. An
  overrun is booked in full and flagged, as in 5.4. When the commission
  closes, the rest of the hold is dropped. Resources priced by usage
  (functions, traffic, requests) are not known up front: a later connector
  gives them an estimate cap in the envelope and reconciles it against the
  provider's billing or usage API afterwards. DigitalOcean, AWS and GCP all
  publish price lists through their APIs (sizes, the Price List API, the
  Cloud Billing Catalog), so the same connector shape fits them later.

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
  A merge approval first submits an APPROVED review as the human, then
  signals (7).
- **New task.** The button files a Forgejo issue labelled `agent` or
  `human`. Every task is an issue, including those raised by SigNoz alerts
  and escalations, so there is one record with its discussion. factoryd
  mirrors task state onto issue labels through the issues API, so Forgejo's
  own issue list shows the same picture.

Built in Stage 7, at `console.aisoftwarefactory.world`. factoryd serves the
console on its own port, 8090, behind the Gateway, with `html/template` and
htmx 2.0.11, vendored and pinned by its sha256. The pages are the board with
both lanes and the approval cards, `/resources` with the commissioned
resources and the envelopes, `/costs` and `/policy`. The board polls every 3
seconds since Stage 12, so a human can watch a run live (Ruling 215, Task
107, the round's first lane task); it polled every 10 before. It shows at most 300 tasks, open ones first, and reads only
Postgres, never the timelines in S3.

Added in Stage 8 (Tasks 61, 65, 67):

- **Where a task stands.** The task row carries its current `gate` and
  `gate_since`, set by the `GateWatch` worker interceptor at each gate
  activity's start from Temporal's first scheduled time, so a retry keeps
  it. A card reads, for example, "2 h 5 min in all" and "checks for 25
  min". The timeline page opens with a gates table: gate, attempt, start,
  duration, outcome and a meter bar, with a row per CI job from the checks
  step, and the open gate shows "open for N min". Every step that ends a
  gate carries `started`, the approval wait included, whichever way it
  ends: an approval, a change request, a merge in Forgejo, or a close.
- **`/alerts`.** The newest 200 alerts (8), with the supervisor's action,
  diagnosis and recommendation for machine alerts. An open escalation has
  two buttons, "real problem" and "noise", on this page and on the board's
  escalation card, and only approvers may press them.
- **`/projects`.** Every project with its merge rule, notify list,
  namespaces, quota, both envelope blocks and its standing monthly line.
  Through Stage 8 approvers registered a project and edited its merge
  rule, notify list and quota here. Since Stage 9 the page is read-only
  (below).
- **The card's recommendation** (Task 66, rolled 2026-09-28). The approval card
  shows the review's verdict, the agent's recommendation and a "Why a
  human" line with every unmet `auto` condition (7).

Changed in Stage 9 (Tasks 72 to 75, 81):

- **Settings read-only.** `/policy` shows the commit in force, the
  workflow's stages and the projects, and `/projects` and `/resources` show
  the settings, each linked to its file at that commit (Ruling 183). The
  settings forms, registration and the project-wide envelope approval are
  gone: a change is a commit. The new-task form picks among the projects
  with `agents: coder`, and login admits the writers of the project whose
  file lists factoryd's namespace.
- **The card** lists every earlier review with its verdict, summary and
  findings beside the current one (7). A card opened at the session cap
  reads the cap line, the last reason and one line per finding so far
  (Ruling 193).
- **Roll cards.** A roll task stands in the human lane until its card
  opens (7). The approve button is the only door to a merge: a review
  submitted in Forgejo is recorded as evidence and signals nothing (Ruling
  109), which the first roll found when an approval made through the API
  merged nothing.

Changed in Stage 10 (Tasks 85, 86): the card has a "Security audit"
section beside the reviews, with the verdict, the model and the deployment
that answered and one line per finding (item, file and line, why), and
its "why a human" list names an audit finding and a review without a
verdict; the card no longer says a pull request "passed its gates" when a
finding put it there.

Changed in Stage 11 (Tasks 103, 104): the board's columns are the lanes of
the shown projects' processes in the fixed order backlog, plan, ready, then
Running, Waiting on a human, Waiting on the author, In review, Done, Failed
and Closed, with a filter per project and a lane badge on every card. A
backlog card has one button per starting lane the viewer may use, and drag
and drop submits the same form, so the board works by keyboard as by mouse.
The move adds the lane label with the human's token, and intake judges it
(5.1). The new-task form has a lane select. The plan card shows the plan's
table with "Accept plan" (approvers, and a stale revision answers 409),
"Request changes" and "Reject", then stays in Done with its children and
"Start plan (n in backlog)". A child reads `part of plan #n` and `waiting on
#3, #5`. `/projects/new` and the status panel are in 5.1. Three acts of the
exit test still went outside the console: two closes, since the card has no
close button, and one comment into a running session.

Changed in Stage 12 (Tasks 109, 112): the new-project panel has no
password field and no register button, since the reconcile registers
(5.1); a writer's "Request changes" on a card at the last attempt or a cap
is the answer that grants the extra session, and the one cap card is the
only other card a cap opens (5.1). The card still has no close button: in
the round the human closed #348, an alert answered as noise, through
Forgejo's API.

- **Login.** Forgejo OAuth2, the authorisation code flow with PKCE (S256), a
  confidential client and an explicit scope list: `read:user`,
  `write:repository`, `write:issue`. Forgejo enforces requested scopes, and an
  unscoped token reaches everything, admin included, so the list is always
  explicit. The login state and the PKCE verifier travel in a `__Host-`
  cookie signed with HMAC-SHA256, so an anonymous `/login` keeps no state on
  the server. The human's tokens stay in factoryd and never reach the
  browser.
- **Who gets in.** Only users with write access or more on the repository,
  checked at login and again on every request. factoryd caches
  the writer list for a minute and shares one fetch between requests. When
  Forgejo fails, the last list serves for up to 5 minutes, then the console
  answers 503.
- **Who authorises spend.** Resource approval, envelope edits, promotion and
  the merge approve button need a user on the policy's `approvers` list
  (Ruling 128). Other writers see the cards without those buttons, and a POST
  gets 403. Deny, request changes, reject and release stay open to every
  writer. The ruling first named Forgejo's approvals whitelist on `main` as
  the list, but only a repository admin can read branch protections, and
  factoryd holds no admin token. So the list lives in policy, versioned in
  Git with the rest, and Forgejo's whitelist stays the merge authority. When
  the two disagree, Forgejo refuses the merge and the card shows why.
- **Actions run as the human.** A new task, an escalation answer, a review
  and a rejection go to Forgejo through the human's own token, so Forgejo
  records the human as their author.
- **Hardening.** A CSRF token on every POST, a Content Security Policy,
  `Strict-Transport-Security`, server timeouts, and fixed error sentences
  that log the detail instead of showing it. Forgejo has no token revocation
  API, so a refused login's tokens lapse within their hour.

Stage 15's project screen (5.7, design, not built) supersedes this board's
layout: the five columns beside the chat take the main view, and today's
columns stay as the full-width board.
[board/proposal-v2.md](board/proposal-v2.md) is the board's spec from then
on, and [board/proposal-v1.md](board/proposal-v1.md) stays as the record
the click dummy implemented.

### 5.7 The project screen and the project agent

Designed on 2026-10-10 for Stage 15 (Rulings 251 to 256), not built. The
console today is the board of 5.6. The design baseline is Sebastian's
conversation on the human's side of the factory,
[ai-software-factory-ux-conversation.md](ai-software-factory-ux-conversation.md),
with his three answers of the same day, and the screen's visual spec is
[board/proposal-v2.md](board/proposal-v2.md).

The human's tool is one screen per project (Ruling 251). It never creates
or manages projects, and anyone who steers a project, Sebastian or an
invited member, gets the same screen. Three principles from the
conversation hold across it. The board state is the truth, the event log is
the history, and the chat is an operator over both. Anything a human can do
by hand on the screen can be said in the chat, and the objects stay visible
and operable without the chat. Normal states whisper, exceptional states
speak. A fourth holds for the agent behind the chat: it operates the
factory and never does the work. It reads, explains, files cards, moves,
answers, steers and approves. It runs no code, and work that needs a
sandbox becomes a card.

**Five parts, one job each.**

- **Status line**: what is the state. Per project, quantitative and always
  there: the project's state (working, waiting on you, idle, paused), the
  cards working, the cards that need you, spend against the project's
  monthly cap, and the GitHub mirror's state. Each figure opens its page:
  the costs, the needs-you list, the mirror panel.
- **Pulse**: what to understand about it. One sentence under the status
  line, the single most useful thing to know now, which a click expands to
  three or four bullets. A cheap model writes it from the board snapshot
  and the last events, on every event (debounced 2 s, at most one call per
  10 s) and every 60 s as the fallback, with a typing indicator while it
  recomputes. It is subdued when all is well and prominent when something
  needs a person. Its spend is the project's.
- **Board**: what work exists and where it is. Five columns in the split
  view (below), with proposal-v1's card face. The spend figure on a card
  stays muted until 80 percent of its budget, then turns prominent with the
  warning sign and the text, never colour alone.
- **Chat**: ask or change anything. The right half of the screen holds the
  project agent's conversation: streaming replies, tool calls as collapsed
  blocks with their arguments and duration, proposals as a list of changes
  with a Do-it button when a tool needs an OK, "applied" lines with undo
  where an undo exists, and a message queue that stays editable until a
  message lands. The conversation persists per project and per member. On a
  narrow screen the chat and the board become two tabs.
- **Card drawer**: everything about one piece of work. It opens beside the
  board at 40 to 50 percent of the width, with the tabs Overview, Activity,
  Files and Chat. Chat is the default tab on a running card, as in the
  dummy's fourth iteration, and the per-card chat and its steering box stay
  as proposal-v1 designed them.

**One event per act.** Every console action records one event, with the
field `via` saying whether a button or the chat made it. The project's
events are one feed at one endpoint, and SSE carries them to the board
(Ruling 244), so the live badge replaces the 3-second poll and the pulse
refreshes on events.

**The columns are a view** (Ruling 255). Each column is a fixed group of
the task states the factory already has, not a new state machine:

| Column | States |
|---|---|
| Needs you | waiting on a human (approvals, questions, plan acceptance), and waiting on the author when the viewer is the author |
| Queued | backlog, queued, waiting on dependencies |
| Working | running, closing |
| Verifying | in review (checks, gates, model review, merge queue) |
| Done | done, failed, closed |

The process's lanes (backlog, plan, ready, or whatever a process file
composes) do not pick the column. A plan card whose planner runs is
Working, and a plan that waits for acceptance is Needs you. The lane is a
chip on the card, and so is the fine state (waiting on the author, failed,
closed, retrying, stale) in proposal-v1's pill vocabulary. Processes stay
configurable where they were: a process composes its lanes in YAML (Ruling
245), the state machine stays the factory's (Ruling 246), and the
full-width board keeps today's columns, lanes first, for a member who wants
a process's lanes as columns. If a process ever needs another grouping, the
grouping becomes a block in its process file, with these five as the
default. Buttons stay the state machine, and drag stays for lane starts
only.

**Inline answers.** An agent's question carries structured choices, and a
needs-you card renders them as buttons beside a text box, so most human
input needs no drawer. The escalation gains a `choices` field, and the
agent's tool schema gains it too.

**Where the project agent runs** (Ruling 252). Two shapes were weighed:

| | Shape | Cost | Fit |
|---|---|---|---|
| A | A loop inside factoryd. The console starts one agent turn per human message: the gateway's model call with a tool list, the tools run in-process against the console's own actions, the reply streamed to the browser over SSE. No pod, no sandbox, no task identity | One more code path in factoryd | Every tool is a console action |
| B | A worker session with an MCP tool server for the board. The chat becomes a task whose harness (opencode in a gVisor pod) gets the board as tools. It reuses the harness, the chat panel and the events, and could run code one day | A pod per conversation, a task identity and budget per chat, the human's identity proxied, more latency | Only when the agent should execute code, which the principle above rules out |

A is chosen (Sebastian, 2026-10-10). The agent runs no code, so it needs no
sandbox. B stays the escape hatch if it ever needs one.

**Identity and audit.** The agent acts as the human who is chatting. Its
tool calls run the same console actions as the buttons, with that human's
Forgejo token, so Forgejo and the audit trail name the human, as the
buttons do today (5.6). Every action records the same event whether a
button or a tool call made it, with one extra field, `via: chat`. There is
no agent credential and no new trust boundary. An action's own checks, the
approvers list among them, hold whichever door it came through.

**Tools.** One typed tool per console action, plus reads. Some actions
arrive with the round itself: the comment, the steer, the summary and the
accent, and the GitHub mirror.

| Tool | Does | Default OK |
|---|---|---|
| `board`, `card`, `history`, `card_history`, `costs`, `diff` | read | none |
| `new_card`, `move_card`, `start_plan` | file and move | confirm |
| `answer` (a needs-you question), `comment` | answer | none |
| `steer` (message a running agent) | message | none |
| `retry`, `accept_plan`, `request_changes`, `reject_plan` | decide | confirm |
| `approve_merge`, `deny_merge` | merge decisions | confirm |
| `set_summary`, `set_accent` | metadata | none |
| `github_export`, `github_sync` | mirror | confirm |

Whether a tool needs a human's OK is a setting, not a rule baked into the
agent: the OK column is the `chat` block of the policy or of the project's
file (5.3). A tool in `chat.confirm` renders a proposal with a Do-it
button. A tool not in the list applies at once and answers with an
"applied, undo" line where an undo exists (a move, a comment, metadata). An
empty list means the agent does everything it is told. Ruling 109, the
approve button as the one door to a merge, becomes: the approve action is
the one door, reachable by the button or by a confirmed tool call.
Forgejo's whitelist stays the merge authority. A steer reaches the running
session as a human message on the existing path (6.2, 6.6).

**Context.** Each turn gets a compact project snapshot (the status line's
figures, the columns with card titles and states), the last 30 events, the
human's conversation so far and the tool list. Details come through the
read tools. Agent output that a tool returns (summaries, messages,
comments) passes the existing inbound sanitiser before it enters the
context, as briefs do today.

**Threat model** (Ruling 253). The new surface is the agent's context: an
agent's or an outsider's text reaches the project agent through the read
tools and could tell it to act. The mitigations are all existing shapes:
the sanitiser on the way in, the confirm list on every consequential tool
by default, the human's token on every write with no new credential, and
the sandbox and the gates on whatever a steered agent produces. By
Sebastian's answer, chat-to-agent text gets no further containment. The
sandbox and the verification plane are the containment for every agent
alike, and a conspiring pair of models could write bad code without the
chat, so the chat changes nothing about the threat. The baseline sentence
"agents exchange artifacts, not chat" (1) becomes: agents exchange
artifacts. Humans and the project agent may message a running agent. The
gates judge the result.

**Spend.** The agent's calls go through the gateway under the project's
identity with the ledger ref `operator`, on the LiteLLM alias `operator` on
the high tier, and the pulse's under the ref `pulse` on the low tier (5.4).
The project file's `chat.monthly_eur` caps both, and the status line's
spend figure includes them. factoryd's own model calls name a task today
(5.3), so these two are its first calls booked to a project rather than to
a task.

**Members, approvers and GitHub** (Ruling 254). A member is a write
collaborator on the project's Forgejo repository. The console admits any
project's writers, and a member sees only the projects they write. The
factory-level pages (policy, alerts and costs across projects, the
new-project panel) stay with the writers of the factory's own code
repository, as the login rule is today (5.6). Approvers move into the
project's file as `approvers:`, with the policy's list as the default and
as the factory's own. Identity stays Forgejo OAuth2, and Keycloak stays
deferred (roadmap 51). Inviting a member is the operator's act in Forgejo
or on the project's page, never the chat's.

Project creation stays where it is: the operator's new-project panel,
registered by the reconcile (Ruling 219, 5.1). The chat does not create
projects. The panel gains "start from an existing GitHub repository": the
factory clones it into the new Forgejo repository in place of the template,
then the normal registration runs. A private source needs a token that the
operator pastes once and that is stored in the mirror row, as the factory's
own mirrors' token is, and that is never given to an agent. Export is a
push mirror from the project's Forgejo repository to a GitHub repository
the member names, set from the project's page or through the
`github_export` tool and kept by the existing push-mirrors mechanism
(Ruling 126). The status line shows its state. Pull request workflows to
GitHub, the conversation's preference once the system matures, are a
roadmap item.

**Round 1** (Ruling 256) builds the status line, the pulse, the chat, the
board beside the chat with fewer columns, inline answers on needs-you
cards, and GitHub import and export. Its build sequence adds the event
spine and members with approvers per project, and it ends with an exit test
that builds an app through the chat (the plan's Stage 15). Messenger push
and the mobile layout are roadmap items, and so is the project analytics
page.

## 6. Chunk 4: the worker plane

One task, one namespace, one ServiceAccount `task-<id>`, one pod.

### 6.1 Choosing the harness

Decision (surveyed 2026-09-24): opencode is the first harness. The goal is
not a successor to it: the adapter contract lets several harnesses run side
by side, chosen per task class and ranked by measurement like model tiers.
pi and goose are the next to try. The re-survey of 2026-09-29 found that pi
now passes (built-in MCP), goose passes (stream-json output), and Codex CLI
fails requirement 2 since 2026-02 (Responses API only). The table below is
the survey of 2026-09-24. The reasoning is written down so the next
re-evaluation argues with evidence, not memory.

The survey scored the live field against the four requirements in 6.2:

| Candidate | Verdict | Why |
|---|---|---|
| opencode | Pick | The only candidate passing all four with a first-class programmatic surface: `run --format json` for one-shot jobs, `serve` with a REST API and SSE event bus for long-lived runs, whole config injectable via the `OPENCODE_CONFIG_CONTENT` env var. MIT, official image, largest community, so DeepSeek, Qwen and GLM quirks get fixed fastest here |
| Codex CLI | Candidate | Passed all four: `exec --json` JSONL plus an app-server JSON-RPC mode for long-lived driving. Apache-2.0. Risk: it is deprecating the chat wire API in favour of the Responses API, which our proxy would have to speak |
| goose | Candidate, to try | Apache-2.0 and the best governance in the field, a Linux Foundation project. Re-surveyed 2026-09-29: it now streams events (`--output-format stream-json`) and runs unattended by default (`GOOSE_MODE=auto`, `GOOSE_MAX_TURNS`), so it passes |
| pi | Candidate, to try next | Re-surveyed 2026-09-29: MCP is built in since about 0.8x (stdio and streamable HTTP), so requirement 3 passes; `--mode rpc` over stdio takes prompts and steering messages into a running session |
| Hermes | Out | A self-improving assistant shaped for chat platforms: heavy, no clean one-shot mode. Wrong tool, not a bad one |
| OpenClaw | Out | A persistent personal-agent gateway for messaging channels, not a disposable coding worker |
| Gemini CLI | Out | Requirement 2 fails: it speaks Google's own protocol, not OpenAI-compatible endpoints |
| aider | Out | No MCP, and development stalled since May 2026 |
| OpenHands | Out | Passes the requirements but is Docker-centric and drifting towards being a platform, the exact failure mode Approach A exists to avoid |

The weak spot is unchanged from before the survey: one company governs
opencode, it moved the repository once already (SST to Anomaly) and it is
layering paid services on top. MIT licence, per-provider BYO keys and the
adapter contract keep the exit real: the day any gating starts, another
harness's adapter takes the load and nothing else changes.

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
        Message(ctx context.Context, text string) error
}
```

`TaskBrief` is the whole task as data: objective, repository and SHA, issue
context, findings from parent sessions and artifact paths. Capabilities are
policy, enforced by the gateway, not something the harness is told. Since
Stage 10 the brief names the factory tools the task's classes may call, so
the model is not tempted by tools it would be refused (5.3); the gateway
still decides every call.

`Message` (Ruling 188, Task 88) puts text into the running session as the
next user turn. A harness without such a mode answers `ErrNotSupported`,
and factoryd then redirects to a fresh session with the text as its
finding, the restart it used before; `ErrNotRunning` means no session
runs. opencode supports it by running as a server: the worker starts
`opencode serve` on 127.0.0.1 inside the pod, subscribes to its event
stream, creates the session with the same denials `opencode run` sets,
prompts the brief with `prompt_async` and answers each permission request
"once", as `--auto` did. `opencode run --format json` is itself a client
of the same in-process server in the pinned v1.18.32, so the event mapping
and the recorded fixtures stayed unchanged. A message sent mid-turn
reaches the next model call, after the pending tool results: opencode's
loop re-reads the session's messages on every turn. The worker exposes one
port, 8091, with `POST /message`; the bearer is drawn per session and
lives only in factoryd's memory, and the pod holds its SHA-256, which the
worker unsets before the harness starts. The task namespace's policy
admits factoryd alone on that port, and factoryd's egress admits the port
on worker pods. The bearer crosses the pod network in plain HTTP, like
factoryd's other in-cluster calls. The agent can reach opencode's own
loopback server, which gives it nothing its shell does not. The first
user is the loop nudge (6.6), and since Stage 12 the supervisor's
guidance at every trip and check-in (6.6): on the round's exit test four
messages reached running sessions and none was restarted. Review findings
still arrive after a session has handed in, so they stay a new session's
findings; inline review comments and questions answered by other agents
are the later users.
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
credential — since round 2 of Stage 12, not even the pod's worker
container does while the agent lives. The session's clone runs in an init
container that holds the one read token (read:repository on the upstream
repository and the bot's fork), mounts the workspace only, and exits; the
worker container's environment carries no Forgejo token at all, and
`task-git` holds the read token alone. The worker records main's head at
clone time, so the final push needs no fetch: it takes main's commit from
the agent's own objects. When the harness finishes, the worker kills and
reaps every other process in the pod and then — and only then — asks for
the push token: it writes the push envelope on stdout and waits on its
message port while factoryd mints the write:repository token for the bot's
fork (`factory-agent/ai-software-factory-code`, ensured at boot, private,
Actions off) and posts it; the worker pushes `factory/<id>` from a fresh
repository it owns with hooks and repository config disabled, git by its
absolute path (an agent-planted `git` on the PATH-writable cache cannot
take the call), and the deferred revocation still removes the token.
factoryd then opens the pull request `sf:main ← factory-agent:factory/<id>`.
Every stop path — the supervisor's stop, the wall clock, factoryd's own
graceful shutdown — funnels through the same hand-over inside the pod's
termination grace, proven live by round 2's drills with
`scripts/agent-sees-no-token.sh` finding zero credentials in the running
session. The accepted costs (rulings 231, 240): a factoryd that dies
without its graceful shutdown, and a session cancelled outright, lose that
session's unpushed work.

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

**The sandbox contract** (Task 82, code 689cba1, 2026-09-29). The agent
never pushes and never opens a pull request: at the session's end the
worker commits the working tree and pushes it, and factoryd opens the pull
request. A supervisor stop pushes the work in progress, and the next
session starts from it. A session that resumes on a branch already holding
its work and adds nothing counts as a pushed result (f870bdb); before that
fix the workflow read it as `no_push` and ran to the cap. The Stage 9 bug
lane showed why the work guide must say so: one session spent 24 commands
hunting for push credentials after a human's answer said "push", another
tried SSH to a Hetzner server for a C compiler, and a third asked for a
server to run the database tests. The guide then named what the sandbox
lacked, a C compiler (so no `-race`), a database and a server, and said
that the pull request's checks ran them. Since Stage 12 (Task 120) it says
the sandbox has Go, Node, gcc and make, reaches only the module proxy and
the npm registry, keeps its caches under `/cache` for the project, and
gives a command that may run over two minutes a timeout of up to ten; a
repository with a `check` file is checked by `bash check`, which CI runs
too, and when it passes the agent ends the session, with no further tests,
re-runs or reading of library sources to confirm. The worker commits the
tree, leaving out the agent's scratch reproduction tests (`zz_repro*`,
backlog 63, fixed by the Stage 9 lane after one merge carried such a
file). Since Stage 10 the worker writes one commit of its own onto the
session's start commit, with a subject sanitised from the issue's first
line, so the agent's own commit messages, which could carry closing
keywords or mentions, never reach the fork (Task 89). A commit the
agent pulled from `main` mid-session stays `main`'s: the worker then
parents its commit on the newest `main` commit the agent's history holds
(beside the work in progress on a resumed session), and the workflow
guard compares against it, so the pull request's diff and the review see
only the agent's change (backlog 72; before the
fix a review flagged main's own change as out of scope).

**Report sessions** (Ruling 185, Task 74). An `analyzer` task runs in
report mode: the worker gets the upstream read token only, no fork token
and no push, the brief asks for a write-up and no code, the supervisor's
repetition and `no_write` detectors are off, and factoryd posts the
session's last message as a comment on the parent issue. The task ends
`done` at the comment. A report task is a task row of its own with a parent
task, so the heal pass restarts it like any other. The reproduction gate
already ran the worker without a push token, and report mode reuses that
path.

### 6.4 Sandbox hardening

Sandbox hardening:

- gVisor RuntimeClass: the container runs under a userspace kernel, not
  the host kernel. The runtime comes from the gVisor system extension baked
  into the node image by the Image Factory schematic, on the systrap
  platform because cloud servers have no /dev/kvm. The machine config only
  adds the `user.max_user_namespaces` sysctl.
- Non-root, dropped capabilities, read-only root filesystem.
- The harness configuration is hardened against the pinned opencode's
  source (Task 87): the `question` tool is hidden, so the only ask path is
  the gateway's `request_info` and `escalate_to_human`; a step cap per
  session from `limits.steps` (1500 since Stage 12, 200 before), a soft cap, at which opencode asks the
  model to summarise and stop, while the agent time stays the hard stop;
  `doom_loop` stays on allow, since a denied doom loop would stop the
  session unseen by the model; and `experimental.continue_loop_on_deny`
  keeps a refused prompt from ending the turn. A proof window at 15 steps
  stopped a live session at the cap with opencode's summary, and the
  factory opened its pull request. The worker sets `PWD` to the workspace,
  since opencode takes its directory from it first, and opencode's
  environment holds no git token.
- Cilium network policy: default deny egress. Allowed: `factory-gateway` on
  its port, Forgejo git, and the Go module proxy and checksum database
  (`proxy.golang.org`, `sum.golang.org`) on 443, plus
  `storage.googleapis.com`, where the proxy redirects module downloads
  (Ruling 114). It sits inside the same trust boundary as the proxy, so no
  mirror was added. DNS answers only those names (`matchName`, not a
  wildcard, which would open a DNS exfiltration channel). While a
  commissioned server's lease lives, its address on port 22 joins the list
  (5.5). The SigNoz collector on port 4318 is the one Stage 8 addition
  (Ruling 158), so the worker sends its own spans and metrics. No data
  leaves the cluster that way, and SigNoz's retention bounds what an agent
  could spam. Nothing else, no cloud metadata endpoint.
- The sandbox image carries the Go 1.25 toolchain, checksum-pinned and the
  same version as the runner image, with `GOPROXY` pinned to the proxy and no
  `direct` fallback. A registry joins the list by name only with the
  toolchain that needs it, and Go qualified: without it an agent cannot run
  the tests its pull request checks will run, and the exit-test agent spent
  an attempt trying to install it (Ruling 99). Until Stage 12 the image
  carried no C compiler, so `go test -race` ran only in the checks
  (backlog 60). Since Stage 12 (Task 114, Ruling 221) it carries gcc,
  libc6-dev, make and python3, and main CI runs each one's version check
  in the built image before it pushes, so `-race` runs in the sandbox and
  an agent runs the repository's `bash check`, gosec included, before it
  ends. The caveat, accepted: the
  module proxy fetches any public module path on request, so an agent could
  leak data by requesting a path that encodes it. The budget, the session
  record and the absence of any secret in the sandbox bound what there is to
  leak. Since Stage 11 (Task 96) the sandbox and runner images carry Node
  24 with npm, checksum-pinned like Go, and `registry.npmjs.org` joins the
  sandbox and CI allowlists by name, the same kind of narrow leak as the
  module proxy. The checks install with `npm ci --ignore-scripts`. The
  image lacked gosec, and the sandbox cannot open a CI log, so on the
  Stage 11 exit test three cards failed on gosec findings their agents
  could not see or reproduce (backlog 85, 86). Since Stage 12 gosec comes
  through `go run` at a pinned version in the repository's `check`, over
  the module proxy, and the checks finding carries the failing job's log
  lines (7).
- Per-task namespace with a ResourceQuota and LimitRange, container limits,
  and size-capped emptyDir volumes. Since 2026-09-29 the sandbox
  container's memory limit is 4Gi and the namespace ceiling 8Gi (1cd22b8):
  three sessions of the first bug-lane round died with their unpushed work
  while a `go test` of factoryd ran beside the harness at 800 to 1370 MiB
  working set against the old 2 GiB. The kill reason itself was not
  captured, since the pods were gone within seconds. The volumes are
  `home` 1 GiB, `tmp` 1 GiB and `workspace` 4 GiB, and the Go module cache
  lives in `home`. On the Stage 11 exit test the kubelet evicted 5 sessions
  that crossed 1 GiB there (modernc.org/sqlite with its libc is about 600
  MB per version, and agents compared versions), on nodes with 82 of 99 GB
  free (backlog 82). The worker reads the SIGTERM as a stop and pushes the
  work in progress, factoryd reads a `no_push` session, and no line in the
  timeline said "evicted". Each eviction cost one of three sessions. Since
  Stage 12 an eviction is recorded as such (Task 114): when the log ends
  without a result, factoryd reads the pod's status reason and message
  before it deletes the pod, and an `Evicted` pod's session ends with the
  summary `evicted: <message>`, which reaches the timeline and the next
  session's findings. The round's exit test had no eviction.
- **The per-project cache volume** (Rulings 223, 226, Tasks 113, 113b).
  Since Stage 12 every sandbox and CI pod mounts a claim on a cache
  directory that belongs to its project and outlives the pod: the agent's
  `cache-agent-<project>` and CI's `cache-ci-<project>` (the factory's own
  repository has one too), at `/cache`, with `GOPATH=/cache/go`
  (`go install` into `/cache/go/bin`, first on `PATH`),
  `GOCACHE=/cache/go-build` and `npm_config_cache=/cache/npm`. A claim
  lives in its pod's namespace and a volume binds one claim, so a
  directory per project is reached through a fresh claim per session on
  the storage class `factory-cache`, local-path with `pathPattern: "{{
  .PVC.Name }}"` and `Retain`: a new claim of the same name binds a new
  volume on the same directory. factoryd deletes the class's Released
  volumes after each teardown; their directories stay. The cache is per
  node too, so a project has up to three, one per node, and a run hits the
  warm one only on the node of an earlier run. Go's module cache stays
  per pod, an 8 GiB emptyDir at `/modcache` (Ruling 223): Go unpacks
  modules in place under a file lock that gVisor very likely keeps per
  sandbox, so two pods of one project on one node could leave a broken
  module that would fail every build there, while the download from the
  proxy takes seconds. The 1 GiB `home` that the evictions came from no
  longer holds a cache. A second ValidatingAdmissionPolicy lets only
  factoryd's service account create a claim of class `factory-cache`, and
  only in `factory-agents-*` namespaces, named `cache-*`, without a volume
  name, selector or data source, so a project's Flux account cannot mount
  another project's cache or the factory's own. The class has its own node
  path, `/var/lib/factory-cache` on Talos's EPHEMERAL volume (Ruling 226):
  the first one, local-path's user volume, is mounted `noexec`, Go since
  1.24 runs a warm `go run` or `go tool` binary from its build cache, and
  gVisor answers exec from a `noexec` mount with SIGSEGV, so the second
  `go run` of gosec on a warm cache died with "signal: segmentation fault"
  while a cold one passed. Main's CI jobs stay off the shared cache: the
  template's `ci.yml` points `GOCACHE`, `GOPATH` and the npm cache at the
  runner's `/tmp` and drops `/cache/go/bin` from `PATH`. Pull request jobs
  and `main` jobs carry the same runner labels and a pull request can
  rewrite its own `runs-on`, so no label separates them, and pull request
  code could otherwise plant build-cache entries, a forged cached test
  result among them, or a binary first on `PATH` that a `main` job with
  the push token runs. Only pull request jobs and agents, which run the
  same untrusted code, share the warm cache; a merge's main CI runs cold,
  about four minutes more. Two round-2 findings hardened this: gVisor's
  gofer serves the volume per sandbox and checks an open of a file another
  sandbox created against its group bits, so Go's 0644 (umask 022) cache
  entries denied `O_RDWR` to the same uid in a sibling pod and cmd/go
  reported `package X is not in std` — the two containers that mount a
  claim now run with umask 0000 (Ruling 241, reproduced 19 of 33
  concurrent cold runs before, 0 of 30 after); and a real app's cold main
  checks outgrow a 1 GiB `/tmp`, so the CI runner's tmp emptyDir is 4 GiB
  (Ruling 242). local-path's setup script prunes at every claim: a claim
  directory unused for 14 days goes, and above 10 GiB per project per node
  the files idle for 3 days do; claim stamps live outside the caches,
  where a pod cannot forge them, and a 0755 directory the kubelet recreated
  is repaired to 0777.
- factoryd creates task namespaces through a narrow ClusterRole, and a
  ValidatingAdmissionPolicy confines it to `factory-agents-*` namespaces with
  the restricted Pod Security label, gVisor pods without an automounted API
  token, and a RoleBinding only to itself. Since Stage 9 the infra-owned
  namespaces `factory`, `platform` and `forgejo` carry `factory/objects:
  seed`, and the policy never treats such a namespace as a project's (Task
  76). Labelling them with `factory/project` for alert routing (8) would
  otherwise have let factoryd bind its project role in `platform` and read
  the database superuser's secret there. Four refusal tests on a k3s API
  server fail under the old policy and pass under the new.
  CI namespaces carry the restricted
  label too: build VMs replaced the root build pod (7.1), so the baseline
  carve-out and the Service kind left the policy. Every container, init
  container and ephemeral container of every pod factoryd creates must run as
  non-root, judged per container, not just at pod level. Shape checks apply to
  every pod regardless of labels: no privileged container, no host network,
  PID or IPC namespace, no added capabilities, no hostPath volume. The policy
  fails closed.
- factoryd itself runs under default-deny egress, because it holds the
  LiteLLM master key, the bot accounts, the S3 keys and the CI project's
  Hetzner token: only the API server (by its injected address, not a DNS
  name), Postgres, Temporal, LiteLLM, Forgejo, S3 and `api.hetzner.cloud`
  answer. Stage 8 added the SigNoz collector on 4318, SigNoz's API on 8080
  for the alerts endpoint, Forgejo's SSH on 2222 for the host key scan
  (5.1) and, with Task 71, the gateway on 8081. Task 60 first measured a
  build VM's ready time by dialling `buildkitd` from factoryd, which would
  have opened this pod, the one with the master keys, to any public IPv4
  on 1234. The review refused it, and an init container reports the ready
  time instead (7.1).
- The worker pod has an ingress rule since Stage 10: only factoryd, on
  8091, the message port (6.2). Every other ingress to a sandbox is denied.
- factory-gateway has an ingress policy since 2026-09-29 (backlog 26, fixed
  by the bug lane as #198 and merged as ddf2c09): only the sandbox pods of
  task namespaces and factoryd reach its port 8081. Before it, any
  in-cluster pod could reach the gateway and only the tokens guarded it.
  Proven live: nine audit rows in the 35 seconds after the apply, and a
  health check from a sandbox.
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
- **Check-in.** Since Stage 12 a scheduled look at the session at a fixed
  interval of the task's agent time, whether or not a detector tripped. It
  replaced **half way**, which tripped once per task at half its wall-clock
  cap or half its budget.

A trip calls the supervisor: the strongest model configured, under its own
`supervisor` alias. It gets the brief, the session record and a progress
digest: the commands run with their outcomes over time, the files touched
with edit counts, the last error signatures and the diff so far. That digest
is what a human reviewer would read to see a circle that the detectors
cannot name. Since Stage 12 (Rulings 216, 224, Task 111) the supervisor
picks one of three actions: continue, message (its guidance goes into the
running session, which keeps its context and its work), or escalate to a
human. Until then it chose among continue, redirect (the session ended and
a new pod resumed with the guidance as findings), retry on a stronger model
and escalate, and every correction cost a session: on the Stage 11 exit
test 23 of 58 sessions ended in a redirect. It never raises a cap or a
budget. Only a human does that. Most tasks never trip a detector, so the
supervisor costs little.

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
  hash of their canonical JSON, `limits.same_call` times in a session (4).
  Since Stage 10 it is preceded by the loop nudge (below).
- **Flip-flop** compares each file's content hash with the hashes it had
  before.
- **Churn** is 15 file changes since the diff against the base last grew,
  with no failing command turning green in between. The worker measures the
  diff every 15 seconds from a repository of its own, never running git in
  the agent's repository, so an agent's git config cannot run code there.
- **Reading without writing** is 24 tool calls and commands without a file
  change. **Stall** is five minutes without an event.
- The **check-in** trips at every `check_in` interval (45 minutes by
  default, 5.3) counted from the task's anchor, the deadline minus the
  agent time, so it continues across sessions without a stored flag; a
  session's first check-in comes no earlier than ten minutes after its
  start. Its detail reads "scheduled check-in, no detector tripped", it
  writes no alert, and it does not count against the session's supervisor
  calls. Half way, its predecessor, fired once per task through a flag on
  the task row, which a migration dropped with it, and it tripped on a
  resumed session's first tick (#186) and on a planner's first tick when
  the planner read the limits' agent time instead of its class's.
- The **wall-clock cap** (2 hours of agent time by default since Stage 12,
  20 minutes before) ends the session without a call, because the
  supervisor could only ask to continue, which would raise the cap. Since
  Stage 12 a cap keeps the work: a branch with commits goes to
  verification (5.1). On the Stage 11 exit test it failed 11 of 28
  tasks, all on the cheap tier (Qwen 3.8 Flash alone since Ruling 204): of
  58 sessions 18 pushed, 23 ended in a supervisor redirect and 7 at the
  cap. The agents probed toolchains, read library sources, re-verified
  finished work and tried to install CI's tools. The redirects were right
  almost every time, but each cost a session. Three tasks (#11, #19, #35)
  had their work done and pushed when the cap came, and the task failed
  anyway: `Finish` deletes the branch of every task that ends, and the
  sandbox cannot reach Forgejo to resume from a closed pull request's ref
  (backlog 80, 88). On Stage 12's exit test no session reached the cap: the
  longest ran 41 minutes.

The supervisor runs inside the session activity, because `continue` needs the
live session (Ruling 87). It must answer strict JSON with one of the three
actions, a message carrying guidance and an escalation carrying a reason;
an unreadable answer, and a `redirect` or `retry_stronger` from the model,
escalate. Its input holds the guidance it already sent in this session,
and the prompt asks it not to repeat a message that did not work. A
message travels the loop nudge's path (6.2) and is recorded as a `message`
step and an issue comment; once the worker accepts it, or answers that the
session already ended, every progress detector starts afresh from the
message's time, and the session reads on. A message the worker cannot take
(a harness without messages, a network error) falls back to the old
redirect: the session stops with the guidance as a finding. A session gets
at most `limits.supervisor_calls` calls (6 since Stage 12, 3 before),
check-ins not counted, and the next trip escalates without one. The
project agent's `steer` (5.7, Stage 15, design) will reach a session the
same way, as a human message on this path under the human's name.

**The one stuck rule** (Rulings 216, 224). The model cannot choose a
stronger model or a restart; one rule in code ends a session that does not
take its message. After a delivered message, the next detector trip with
no file written since, or a flip-flop or churn trip at all, since circles
of writes are not progress, ends the session without a supervisor call as
`retry_stronger`, with the finding `stuck after the supervisor's message:
<kind>: <detail>` and an issue comment. The workflow already runs that
outcome: the next session on the stronger rung, from the pushed work in
progress. A check-in, the wall clock and the stall detector never count as
stuck: a long command such as a cold `bash check` is silence, not a
circle. On Stage 12's exit test six trips in twelve sessions gave four
messages and two continues, no restart and no stuck end: the frontend's
supervisor saw a flip-flop on one file and told the session which hook did
not read the route's context, and the auth card's two messages about a
probe test kept a 41-minute session going to a pushed head.

Each call runs under a per-task
`supervisor` virtual key and takes a hold for its worst case like any model
call (5.4), so the supervisor spends from the task's money and cannot overrun
it or the day cap. With nothing left, the task escalates without a call.
With Task 71 (rolled 2026-09-28) the call goes through the gateway, which
audits it with kind `supervisor` and books it under `supervisor/<alias>`
(5.3). `supervisor` maps to tier-high, the strongest configured model,
since Stage 10 Qwen 3.8 max alone (4.4). Every decision
goes to the session record, the timeline and an issue comment.

Stopping is graceful: the worker gets SIGTERM, pushes the work in progress to
the fork and reports what it did, so a stuck end or an undelivered
message resumes from the pushed head with the dead session's findings. An escalation moves the task to
`waiting-human`, comments the reason on the issue and waits without a timer.
The answer is a comment from a trusted human (owner, admin or write on the
repository), newer than the escalation comment, written in Forgejo or in the
console. It may grant a bounded slice of agent time, ten minutes by default
and never more than the full cap per answer. A human may raise a cap this
way; the supervisor never can.

**Repeats and the cap** (Ruling 193, Task 81). A redirect or `no_push`
after the same trip kind counts as a return from the stage
`supervisor:<trip>`, like a stage's findings (7): past `stronger_after` the
next session runs on the stronger rung, Sebastian's rule for a repeat of the
same problem. When the attempts run out, the task goes to the card (5.1).
The bug lane's first task showed both gaps: its three cheap sessions circled
into the repetition detector twice at the same rung before a roll restart
ended it. A `retry_stronger` on the last attempt is recorded as a climb
too, so a new run after a factoryd restart starts on the stronger rung
(backlog 58, the Stage 10 lane's first merge).

**The loop nudge** (Rulings 188, 202, Task 88). factoryd counts identical
calls in a row from the session's event stream: a call is the tool plus
its input hash, a command its command line, a file change its path and
content, and model steps in between do not break the run. At
`limits.nudge_after` (3) it sends one message into the running session
(6.2): "You repeated the same call three times (<tool>). Change approach,
then continue.", records a `nudge` step on the timeline and resets both
counts for that call. The same call again after its `nudges` (1) trips
`same_call` to the supervisor as before, with "after 1 nudge" in the
trip. A nudge counts only once the worker answered; an undelivered one
trips to the supervisor, and a harness without messages gets the redirect
with the nudge as guidance. The count reads the event stream, not the
gateway's audit rows, because opencode's built-in tools, the shell, read
and edit, never pass the gateway and the audit rows carry no input hash
(Ruling 202); a harness whose stream lies about its calls evades the nudge,
and the other detectors still trip. Proven live on demo-app: #22's session
got its nudge after three identical test runs and ended pushed, and #24's
model answered its nudge with "Continuing with a different command form",
then kept looping in varied forms until `no_write` tripped. A `same_call`
trip after a nudge rests on unit tests: in the planted proof the model
reasoned its way out instead of repeating.

The answers are a part of the next session's brief in their own section,
newest first, each one tagged with the question it answers (Ruling 118). The
workflow keeps every answer of the task across attempts, so a repeat
escalation never loses an earlier one. A run that the heal pass starts
rebuilds the answers from the task's intake events, which are the durable
record (Ruling 120). Each answer is cut at 4000 bytes in the brief, and the
issue keeps it in full. Before this, an agent treated an answer as one more
finding and asked the same question again.

The agent can escalate by itself too, with the `escalate_to_human` tool. The
gateway passes the question and the reason to factoryd, which records an
intake event and hands the escalation to the live session. The session stops
with a work-in-progress push, calls no supervisor, and the workflow posts the
question on the issue as for any escalation. With Task 66 (rolled 2026-09-28)
the tool requires a `recommendation` of at most 2000 bytes, so the issue and
the card read "The agent asks", "Why" and "Recommendation", and the agent's
text stands in a code block, where Forgejo reads no mentions (Ruling 149).

**The progress detector** (Rulings 141, 161, built in Task 67). `no_write`
trips when an agent event, a tool call, a command or a model call, arrives
300 seconds after the last write or edit tool call or the session start.
Ticks, checkpoints and silence never trip it: silence is the stall
detector's. The policy's `supervisor` section sets the seconds. Ruling 141
named two more, no commit and events without writes, but under the then
20-minute cap they duplicated `no_write` and the cap, so they were dropped. Proven
live with a 60-second threshold: `no_write` tripped twice during five
`sleep 20` tool calls, and the supervisor answered `continue` both times
with the diagnosis "False alarm", which the alerts table records as noise.
A command event arrives when the command ends, so a long command's running
time counts as time without a write: a cold `go test` compile of factoryd
in the sandbox takes over two minutes, and it tripped `no_write` on the
Stage 11 gate's lane task, whose redirect ended the session and its build
cache with it (backlog 77). Since the roll of ce5f610 at the Stage 11
close a command's own running time no longer counts. Since Stage 12 a file
written through the shell counts as a write too: a heredoc or a `sed -i`
shows only as a changed checkpoint diff, which moved neither `no_write`
nor the repetition count before, so both tripped on agents that were
writing (Task 111).

**The gate supervisor** (Rulings 141, 154, 162, 163, built in Task 67, live
since roll e3f7c16). The session supervisor watches an agent. The gate
supervisor watches the machine gates, so no gate waits in silence. Each
activity has a bound, from the policy's `bounds` section, else the default
of the ruling, else the policy's `default`, else 120 seconds:

| Activity | Default bound s | Note |
|---|---|---|
| RunSession | 7260 | The limits' agent time plus 60 s (1260 under the 20-minute cap before Stage 12): a session at the cap is stopped by the cap, so the bound catches a stuck runner (Ruling 154). A class, process or project with a longer agent time gets a longer session, while the bound stays the limits' and only alerts |
| WaitChecks | 600 | Main CI took about 7.7 minutes at the step-zero gate |
| GateReproduction | 900 | Task 66 runs the command twice, at the base and the head, and sets 1800 in the policy |
| ModelReview | 360 | Ruling 194: a review of a 100-line diff by glm-5.3 took 210 s on 2026-09-29, and the first default of 180 s (Ruling 140) cut a correct review twice |
| GateAudit | 360 | The security audit (7), one frontier call like the review; it answered in 2 s to 85 s in Stage 10 |
| Merge | 90 | One API call under a 2-minute timeout, so the first default of 300 s could never fire (Ruling 163) |
| every other activity | 120 | One API call each, seconds (Ruling 140) |

`GateWatch` writes a `gate_bound` alert (8) for each attempt still running
at its bound. Only the six long gates, RunSession, WaitChecks,
GateReproduction, ModelReview, GateAudit (since Stage 10) and Merge, go on to the supervisor (Ruling
162): the short gates' 2-minute timeout ends before a supervisor answer
could arrive, so their alert is their record. For a long gate `GateWatch`
signals the task's workflow, and the workflow runs `SuperviseGate` once per
trip. factoryd assembles the bundle in code, with no model tools and read
access only: the objective, the timeline tail, the activity's input, the
bound, the elapsed time, Temporal's last failure, and per gate the commit
statuses and the CI queue, the sandbox pod's state and its last 100 log
lines, the pull request's merge state, or the last review result. The
whole bundle passes through `internal/redact` (5.1). The model answers
strict JSON with an action, a diagnosis and a recommendation:

- `wait` re-arms the bound once, to twice the bound. Not for RunSession.
- `retry` ends the attempt, and Temporal's retry policy runs it again. Not
  on the last attempt.
- `cancel` fails the task with the diagnosis.
- `escalate` cancels the activity and opens the human card, with the same
  alert and comment as any escalation. The answer runs the same gate again
  with the same arguments, so a merge keeps its approval.

A run allows one wait and one retry. The supervisor call runs alongside the
gate: a gate that finishes first wins, and a late answer lands on the alert
with the note "gate ended before the answer" and has no effect (Ruling 171,
change id `gate-supervisor-race`). A malformed answer, a disallowed action
or a failed call escalates. `wait` and `retry` act inside the process, which
assumes one factoryd replica: after a restart, the attempt that tripped no
longer runs there, and the alert becomes noise without a model call. The
workflow change sits behind the change id `gate-supervisor`. Proven live:
three WaitChecks trips at a temporary 180-second bound, each showing
`factory.alert.count{kind=gate_bound,verdict=open}` = 1 in SigNoz. Two were
cut by rolls and judged noise without a call, which is the restart path. The
third escalated, and that run found a bug: after the session the task
namespace and factoryd's binding in it are gone, so the token read for the
scrub answered 403, not 404, and every check-wait bundle was withheld. The
tokens are now read only while the sandbox runs. The Stage 9 bug lane saw a
model's `wait` on a starved image build, followed by an escalation, and a
`retry` on a review past its bound. `cancel` is proven by unit test only,
and no scrubbed bundle was inspected. The lane also fixed a `wait` on Merge
that could never extend it, because the attempt's own timeout ended first
(backlog 4, #204): `wait` now needs the doubled bound to fit inside the
attempt's start-to-close timeout.

**The supervisor timeout.** At the Stage 8 step-zero gate the `supervisor`
alias (GLM) took 5 minutes for one call against factoryd's 4-minute
supervisor timeout. The cut call turned a `half_way` trip into a human
escalation and booked its whole hold (5.4). Since Stage 9 the timeout is 6
minutes, a `limits` value (Ruling 186), and `supervisor` runs on tier-high
(4.4). The same latency is why the short gates do not wait for a
supervisor.

The build's own agents are watched the same way, from outside. The
controller never asks a subagent for a heartbeat (Ruling 142). A script,
`agents.sh`, reads each running subagent's transcript and worktree and
prints one line per agent, never an action: QUIET after 10 minutes without
a transcript record, with the last tool call, NO-OUTPUT after 30 minutes
without a file written in a task worktree, NO-COMMIT after 90 minutes
without an implementer's commit, and LOOP when transcripts grow but nothing
is written for 60 minutes.

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
   decision, never authority to skip the gates above. Since Stage 10 a
   security audit follows it, whose findings always go to a human.

Merge is a PR merge. Human approval, where policy demands it, is a Temporal
signal. The waiting costs nothing. What happens after the merge depends on
the repository. The factory's code repository rolls through a roll task
since Stage 9 (below): a pull request that bumps the image digests under
`k8s/`, a card, the bot's merge, and Flux applies it at once. The infra
repository's changes stay human commits. A project deploys through its own CI/CD as code (5.1): its `main` workflow
rolls staging on the `deploy` branch, and its own promotion rule takes the
change to prod. Two projects therefore run two deploy chains in one
factory, which is the Stage 8 exit test.

**Roll-to-live.** factoryd measures every roll of its own repository once,
at boot (Task 60). It takes the newest `main` commit that touched `k8s/`,
and only when that commit changed a Deployment's images against its parent
and has a push run: the push time is the `created` of that commit's push
run in `actions/runs`, the apply time is the `kustomize-controller` entry in
the Deployments' managed fields, and the ready time is the Deployments'
`Progressing` condition. It stores the row in `rolls`, emits
`factory.roll.duration`, `.apply` and `.ready`, and logs, for example, "roll
bad81fc... live: push to apply 60 s, apply to ready 13 s". A commit that
changed no image records nothing, which held live when a manifest-only push
restarted both Deployments. The rolls of factoryd and the gateway measured
61 to 73 seconds from push to ready (e3f7c16 61 s, c70a790 63 s, 7914efb
69 s, bad81fc 73 s). The roll of all four images with migrations 0024 and
0025, 95345e6, took 161 seconds, 123 of them from apply to ready.

Since Task 75 the roll watcher runs from boot every 15 seconds on the
newest commit that touched `k8s/` and writes one `rolls` row per changed
image once its Deployment carries the new reference and is live, so the
gateway's, the worker's and the CI runner's rolls get rows too (backlog 7).
A roll that `factory-merge` lands is recorded against the merge commit and
its first parent, since the fork branch's own commit has no push run. Live:
three rows per roll, each with its apply and live times, for all six roll
pull requests of 2026-09-29.

**The roll as a factory task** (Ruling 178, Task 75). A roller in factoryd
reads the code repository's push runs every minute. For each green run of
`main` newer than every run it judged, it resolves each roll target's
image, factoryd, the gateway, the worker and the CI runner, and compares the
linux/amd64 manifest inside the new image index with the one `k8s/` pins.
Main CI's index digests differ on every build even with no input change,
because the provenance attestation carries build times, so a roll that
compared index digests would bump every image on every commit, and its own
merge would open the next roll. A run whose commit changes no image, or
nothing outside `k8s/`, is judged and skipped. Otherwise factoryd files a
task of source `roll` with no agent session and no model call: it writes
one commit onto the bot's fork that bumps exactly the pinned digests, opens
the pull request, and names the commits since the last roll in the text,
which is also the card's recommendation. The checks run, the policy gate
classes `k8s/` high, the review returns a note without a model call, and
the card opens: "roll <sha>: factoryd, gateway, worker". A newer green
commit folds into the open roll as a second commit and withdraws the
pending card, so one card covers both. factoryd refuses a branch head it did
not write, because any agent task's token can push the fork's branches. One
roll is open per repository, and a failed roll is not retried: the next
green commit opens the next. Change id `roll`. From 13:10Z on 2026-09-29
every roll of the factory went this way, six in the session, each with an
issue, a pull request, an approval, a merge and roll rows, and a fold was
seen live at 14:06Z. The first live roll found two defects: Forgejo 15
ignores a `limit` without a `page` on the runs query and answered 2.7 MB,
past factoryd's 1 MiB read cap, and the pull request's security scan
flagged seeded secret names. Since Stage 10 the roller reads the
registry as a user of its own, `factory-registry-read`, whose one team
grants package read on no repository and whose token carries
`read:package` only (Task 86); the `forgejo-registry` pull secret, whose
token can write packages, stays for pulling images into task namespaces.
Live: the token reads a manifest, and an upload answers 401.

Built through Stage 7: all three steps, the approval and the bot merge. After
green checks the workflow runs the gates as Temporal activities. Each one
records a timeline step, with its start (5.6), and comments on the pull
request. Stage 8 adds the `auto` outcome, the reproduction at the base and
the head, and the non-reproducible path, all built in Task 66 and
rolled 2026-09-28 in ba2d80a (Rulings 149, 150, 167, 168, 169).

**Stages and findings** (Rulings 177, 190, Task 74). Since Stage 9 the
workflow is an ordered list of stages, since Stage 11 the `stages` block of
the task's process file (5.3), no longer `workflow.yaml`: screening,
checks, policy, migration, reproduction, review, since Stage 10 audit,
approval and merge. Each
stage has one `on_findings` setting: `agent` sends the findings back to the
next session, `human` collects them for the card while the other stages run
and rules out `auto`, and `fail` fails the task. The defaults: checks,
reproduction and review `agent`, policy `fail` on forbidden, migration,
screening, audit, approval and merge `human`. The first return from a stage keeps
the model, and a return past `stronger_after` takes the stronger rung. The
session cap is the round cap: a task at its cap goes to the card with every
finding so far, since Stage 12 only after a pushed head nobody judged has
been verified, and a writer's change request at the cap is itself the
answer (5.1, Ruling 225). A stage may carry `max_returns`, which caps its own returns
before the card; the default sets none, so with three sessions a review can
return twice. A stage may be switched off, or limited to outside accounts
with `when: outsider`, except checks, policy, approval and merge. The loader
refuses a workflow without checks, policy, approval and merge, with merge
not last, approval not right before it, screening not first or migration
before policy, and since Stage 11 checks whose findings go to a human
(floor rule F11). So a review's `concerns` goes back to the agent first on every merge
rule, and the next review reads the earlier findings and says which of them
the new head addressed. After a restart, `Reconcile` rebuilds the return
counts, the findings and the earlier reviews from the timeline. Change id
`stages`. Red checks on a roll are no agent return: the roll fails "checks
failed".

**Red checks the agent cannot act on** (Ruling 201, backlog 62, the Stage 10
lane). A build VM's i/o timeout or a runner that dies fails the checks as
surely as a real defect, and factoryd cannot tell them apart: Forgejo
15.0.9 serves no job log over its API, and the image build also fails on a
real Dockerfile error. So a blind re-run would double every real red.
Instead, when a session leaves the head as it was and the same head fails
its checks again, factoryd runs them once more, once per head, by an
empty commit on the bot's branch through Forgejo's contents API
(`RerunChecks`), before the findings go back to the agent; a re-run's own
head is never re-run. Change id `checks-rerun`. The case that asked for it
came up live: the lane's first filing of the fix held the whole change in
its first session, its image build failed twice on one head, and the next
sessions circled until the controller pushed that empty commit by hand and
the checks went green. A build VM whose `buildkitd` never answers is
replaced once (backlog 65, proven live at 22:18Z on 2026-09-29). The same
blindness costs the agent: its finding reads "Failing after 1m14s" with a
link the sandbox cannot open. On the Stage 11 exit test one agent judged a
red gosec job flaky and pushed nothing, and three cards failed on gosec
findings only CI could run, until the human read the log and answered
with the fix (backlog 85: the failing step's last lines in the finding,
backlog 86: the checks' tools in the sandbox, or the brief naming which
checks run in CI only).

**The failing job's log lines in the finding** (Ruling 221, Task 115).
Since Stage 12 factoryd reads the log of each failed job and appends its
last 40 lines, at most 4 KiB, timestamps stripped and cut at a line and a
rune boundary, to the checks finding. Forgejo 15.0.9 serves no job log over
its API, and its web route answers no token, so factoryd logs in as the
bot user `factory-agent` with the password it already holds and reads
`<run>/jobs/<job>/attempt/<n>/logs` in that web session. Two traps came up
on the way: Forgejo redirects to its own `ROOT_URL`, so every redirect is
pinned back to factoryd's in-cluster address, and the session cookie is
`Secure` under the https `ROOT_URL` while factoryd talks plain http in the
cluster, so the cookie jar treats every request as https. factoryd reads a
log only for a target under the task's own repository's runs, since the
bot is a collaborator on every project and a crafted status link could
otherwise read another project's log; a refused login or a failed read is
logged and leaves the finding without a tail. With gcc and the
repository's `check` in the sandbox (6.4) the agent runs the same checks
before it pushes, and the log tail covers what remains, chiefly the image
build. `run_checks`, a tool that would push mid-session and wait on CI, is
built only if a later exit test shows a failure CI found and `bash check`
could not (Ruling 221). Stage 12's exit test showed none: no card failed,
and every pull request merged green.

**Screening** (Rulings 182, 191, Task 74). Before the first session of a
fresh task filed by an outside account, an `analyzer` task in report mode
(6.3) reads the issue and answers a verdict, `clear` or `suspect`, with
reasons; any other answer counts as suspect. The session runs on the
stronger rung, since its verdict guards the coder against a report written
to steer it. `clear` lets the coder start. `suspect` writes an alerts row of
kind `screening` and waits on a human before any coding session: a human's
answer judges the alert noise and lets the coder run with the answer, and a
close judges it real. The reasons never reach the issue. Proven live: an
outsider's report was screened clear and the coder started, and one asking
for the registry password waited on a human before any session and was
closed as real.

- **Policy gate.** It reads the pull request's changed files, a rename under
  both names, and classifies each path under the policy's `risk` section
  (5.3). The first matching rule decides a path's class, and the pull request
  takes its most severe class. The live classes: `forbidden` for the
  workflow directories `.forgejo/**`, `.gitea/**` and `.github/**`,
  `migration` for `internal/*/migrations/**` and `internal/policy/schema.sql`,
  `high` for `k8s/**`, `**/Dockerfile*`, `go.mod` and `go.sum`, and `normal`
  by default. A forbidden class fails the task and closes the pull request.
  Through Stage 7 every other class needed a human's approval. Ruling 168
  makes the globs path-generic, so a project's migrations and deploy
  manifests class like the factory's own: `**/migrations/**` is
  `migration`, `deploy/**` and `k8s/**` are `high`, `**/Dockerfile*`,
  `go.mod` and `go.sum` are `high`, and the three workflow directories stay
  `forbidden`. The risk rules stay one global section, and per-project
  rules wait until a project needs them. Class `normal` gains the outcome
  `auto`, which the decoder refuses on any other class. Since Stage 10
  protected files rank `high` too (Task 89): every ecosystem's manifests
  and lockfiles, agent instruction files, `CODEOWNERS` and every top-level
  dot file and directory, so a change to what installs, builds or
  instructs the agent always waits for a human. Live: a pull request that
  touched only `go.mod` went to the card as `high`.
- **Migration gate.** When migration paths changed, it comments "schema
  migration: human review required" with the list, and the approval card
  carries it.
- **Reproduction gate.** A task may carry a reproduction command, from the
  first fenced `repro` block in the issue body or from `POST /tasks`. The
  gate runs it in a fresh task namespace with the worker image in repro mode:
  a read-only token on the repository, no gateway token, no push token and
  the sandbox's egress. The worker refuses to run unless the pull request's
  head is the gated commit. The command runs for 10 minutes by default, 15 at
  most. A nonzero exit sends the next attempt to the stronger model with the
  exit code, the command and the last 4 KiB of output as findings, the same
  as red checks. Task 66 runs the command twice: first at the task's base
  commit, then at the head. A reproduction counts only when it fails at the
  base and passes at the head (Ruling 167). A command that passes at the
  base is commented "not reproduced at base" and never counts, because the
  review found that otherwise an outsider's `true` would satisfy the gate.
  The re-review found that a git command could still pass at the head and
  fail at the base for any diff, so the fix in its second review round
  gives the run the files only, without `.git`. When the agent finds a fault it cannot reproduce exactly, it ends
  with a `not_reproduced` note naming the fault and why, the gate comments
  it on the pull request, and the timeline records `not_reproduced`
  instead of `skipped`.
- **Model review.** `review-frontier` reads the brief, the diff (cut at
  48 KiB) and the gate results, and answers strict JSON: a verdict of
  `approve` or `concerns`, a summary and findings. The call runs under a
  per-task key with a hold, like the supervisor's. A review the headroom
  cannot pay for, a failed call and an unreadable answer become a note on
  the card, never a failure. The activity heartbeats every 30 seconds with a
  2-minute heartbeat timeout, so a terminal signal cuts the call in flight.
  The verdict is evidence on the approval card and a pull request comment,
  never authority to skip a gate. With Task 66 the review also names the
  issue author and the author's standing, a writer or an outside account,
  and treats an outside account's report as untrusted input. It must answer
  `strict_improvement`, true or false, and an answer without it is invalid.
  With Task 71 the call goes through the gateway (5.3), and a
  `refused_budget` there becomes the note "model review refused by the
  gateway", which leads to the card, never to a merge. Since Stage 9 a
  `concerns` verdict goes back to the agent (above), and the card shows
  every earlier review. One pull request of class `migration` reached its
  card with the review recorded as "no verdict" in 0 seconds and no audit
  row, while the card said it had passed its gates (backlog 68). The review
  had run, since no class skips it, and returned a note; the defect was
  that a note counted as a pass. Since Stage 10 (Task 86, change id
  `review-verdict`) a review that ran without a verdict, for any reason, a
  failed call, a refusal or an unreadable answer, is the finding "the
  review gave no verdict" on the card, whatever the stage's `on_findings`:
  never to the agent, which cannot answer a failed call, and never a merge
  on `auto`. The loader refuses `when` on the review, so switching it off
  is its only skip, and a roll's note stays no finding (Ruling 178). Live,
  a migration-class pull request reached its card with the review's
  verdict and the migration finding. A planted 2-second review bound did
  not produce a review without a verdict, since the review finished before
  the gate supervisor answered (Ruling 171's race); the rule is proven by
  its tests and by the same rule on the audit stage, live below.
- **Security audit** (Ruling 188, Task 85). After the review, for a project
  whose file says `audit: true` (the code repository's does), a stage
  `audit` with `on_findings: human` only: its findings go to the card,
  never to the agent, and rule out `auto`. It runs in two parts. A
  pre-check scans the diff's added lines for secret shapes (private keys,
  credentials in URLs, bearer tokens, JWTs, provider token prefixes, a
  password or token assigned a literal) and reports file and line, never
  the value. Then one call on the task class's `audit_model`
  (coding-frontier on the stronger rung; the gateway admits factoryd only
  the aliases the task's own class names, Ruling 200) reads the diff
  against a fixed checklist of six items: secrets, network egress, RBAC
  and service accounts, policy and workflow files, migrations that drop or
  widen, and the sandbox contract. It answers `clear` or `findings`. No
  verdict, a cut diff (48 KiB), a refused or failed call are findings too.
  Every finding's text passes the scrubber, fed with the secret values the
  diff itself holds, so the card and the timeline never show one. It posts
  no pull request comment. A roll skips it. Bound `GateAudit`, 360 s, under
  the gate supervisor. Live: a PEM key planted in a test file reached the
  card with the pre-check's finding and the model's, a clean doc comment
  passed as `clear` in 2 seconds, and on the lane it flagged a
  collaborator delete, a changed push path and protection re-asserted for
  a human. One audit call died with a roll's gateway restart and landed on
  the card as "the audit call failed". The checklist's fourth item first
  fired on Go source that merely names policy types; it now names the
  configuration files by path (backlog 71).

Each gate and the review check that the pull request's head is still the
gated commit. A moved head fails the task, because the checks passed on a
different commit.

The workflow then writes an `approval_requests` row of kind `merge` (Ruling
116), at most one pending per task, and waits without a timer. The console's
approve button submits an APPROVED review on the gated commit as the
logged-in human, through the human's OAuth token, and then signals
`approved` (Ruling 109). The `Merge` activity merges as the bot
`factory-merge`, pinned to the gated commit. `main` on both repositories is
protected with `apply_to_admins` on, so no repository admin, human or service
account, bypasses it:

| Setting | Value |
|---|---|
| Push whitelist | the human |
| Merge whitelist | the human and `factory-merge` |
| Approvals whitelist | the human |
| Required approvals | 1 |
| Stale approvals | dismissed |
| Rejected reviews | block the merge |

So Forgejo itself refuses the bot's merge until a whitelisted human has
approved the current head. Proven on a throwaway repository: 405 before the
approval, 200 after the human's, 405 after a non-whitelisted writer's, and
403 for a push by the bot. The invariant of Rulings 76 and 77, no agent code
reaches privileged `main` CI without a human, holds on the server side. A
leaked `factory-merge` token can merge only pull requests a whitelisted human
has approved. The bot's token reaches the code repository only.

A 405 or 409 from Forgejo is a refusal: the workflow comments it, notes it on
the card and keeps waiting. Stage 10 found the gap in that rule: a pull
request that no longer merges, because `main` moved under it, answers 405
on every approval, and the card stays open with no finding. The lane's
fix landed at the end of the round (backlog 70, change id
`merge-conflict`): a refusal whose pull request no longer merges is a
conflict, not a refusal, and goes back to the agent as a finding that asks
it to merge `main`, on the approval path and on `auto` alike. It needed
backlog 72 first, since the agent's merge of `main` would otherwise carry
`main`'s workflow change and be refused at push. Not yet seen on a live
conflict. Any other merge error is retried 5 times, then
reported as a `merge_failed` step and comment, and retried after 10 minutes
with the same approval. After 6 such retries, about an hour, the workflow
comments "merge retries exhausted", sets no timer and waits for a signal
only, and a new approval starts again (Ruling 129). This bounds the workflow
history, and the human path stays open. A merge finishes the task `done` at
once, without waiting for the `pr_merged` webhook. A human who merges in
Forgejo is credited as the merger. The activity merges only into `main`.

**Only a green head merges** (Task 95). Since Stage 11 `Merge`, the one
activity every merge passes, approval, `auto` or roll, reads the gated
head's combined commit status and refuses anything but success or warning
with its own result kind `merge_red_head`, never read as a conflict: the
card says the checks are red, the approval stays, and a change request
sends the agent back. Before it, a task at its session cap reached the
card with red checks and a human's approval merged them, since `main`'s
protection holds no status check. The required contexts differ per
project, so the guard is factoryd's, not Forgejo's.

**Dependencies between cards** (Rulings 205, 208, Task 100). A process
with a plan lane carries `dependencies: {wait_until: done, on_failed:
human}`, the one value of each in the first version. The workflow's first
step after `Reconcile` (change id `dep-wait`) reads the task's rows in
`task_deps`. With none open it goes on. With any open the task waits in
`waiting-deps` and the card reads "waiting on #3, #5", until `Finish` of a
dependency or the heal pass signals `dep_ended`. A dependency that ended
failed or closed opens a human card, where an answer starts the card anyway
and a close ends it. The wait costs nothing. On the exit test the rule held
as designed and showed its gap: when the foundation failed, all nine
dependents came to the human at once, and an answer starts a card
regardless of its other dependencies, so the human answered each in the
plan's order by hand (Ruling 211), and a refiled card is no plan child and
lost the plan's spec section (backlog 81).

**The merge queue** (Rulings 205, 208, Task 102). With `merge: {queue:
project}` a task at the approval stage enters its project's queue, a row in
`merge_queue` by entry time (change id `merge-queue`), and holds its turn
through the approval wait and the merge: syncing before the approval keeps
`dismiss_stale_approvals` from asking the human twice. At the head,
`SyncWithMain` merges `main` into the pull request through Forgejo's
update endpoint as the bot when `main` has moved, and the checks run again
on the new head, recorded as factoryd's own move. A 409 is a conflict and
goes back to the agent on backlog 70's path, red checks after a sync go
back with the prefix "after main was merged in:", and either way the task
leaves the queue. `LeaveQueue` runs on every exit and in `Finish`, and the
heal pass signals every queue's head once a minute. Review and audit are
not run again, since the agent's diff is unchanged. On the exit test 15
pull requests merged through the queue and no two turns overlapped. Six
were synced and re-checked: two web cards editing the same routes file
merged cleanly after a sync, and one sync's re-run caught an image that
did not build, from base-image digests the model had invented. The design expected at least half to sync, but in a mostly
serial run `main` seldom moved. The code repository stays on `queue: none`.

**The `auto` outcome** (Rulings 149, 167, 169, built in Task 66, rolled
2026-09-28 and proven by the exit test's merge of PR #6). A project on merge rule `auto` merges without a card when all of
these hold:

1. The policy gate's class is `normal`, whose outcome is `auto`.
2. The reproduction condition holds in one of two ways: a reproduction ran,
   failed at the base and passed at the head, or the agent's
   `not_reproduced` note names a fault it fixed. "Clear improvements with
   no drawback just get done" applies whether or not the issue carried a
   reproduction command.
3. The model review answered `approve` with `strict_improvement: true`, on
   both routes, a proven reproduction included (Ruling 169).
4. Since Stage 9, the checks stage ran and passed, so a checks stage
   switched off or limited to outsiders cannot merge without CI and a
   human.

Then factoryd comments which proof held, the review's summary and the
strict-improvement line, and `factory-merge` merges with the approver
recorded as `merge rule auto`, using the project's own merge token. Any
unmet condition, class `migration` or `high`, a skipped reproduction, a
review without a verdict, an audit finding (since Stage 10), or a
refused merge sends the task to the human card, which shows the review's
verdict, the agent's recommendation and every unmet condition. A project on
`auto` has 0 required approvals on `main`, and on `human` it has 1, as the
factory's repositories do. The factory's own repositories stay on `human`,
so every change to them still waits for a whitelisted human.

**Not reproducible, nothing found** (Ruling 150, built in Task 66, rolled
2026-09-28 and proven live on issue #3 of the demo app). The agent calls the tool `request_info` with what it tried and
what it needs, and the session ends `needs_info`. The task moves to
`waiting-poster`. The comment on the issue mentions the author and the
project's `notify` list, the approvers by default, so Forgejo's bell is the
ping, with no new UI, and each human can unsubscribe from the issue. The
alerts table records kind `info_request` (8). The issue author's next
comment resumes the task, whatever the author's access, and so does a
writer's. The next brief carries the answer under "Poster information", as
information and never as authority: an author's comment never answers an
escalation, where only writers count. Since Stage 10 a poster's answers
buy at most two extra attempts per task (backlog 29, change id
`poster-cap`, migration 0035), so an account without write access cannot
keep a task running on answers alone. Fourteen days without an answer close
the issue as not reproducible with a comment, and the task ends `closed`.

**The brief keeps the poster's text apart.** The brief writes factoryd's own
lines first, the author's standing line among them, then the issue text and
each poster answer between markers `<<<ISSUE-<tag>` and `ISSUE-<tag>>>>`,
where the tag is 16 random hex characters drawn for each brief and drawn
again if the text contains it. For an outside account the standing line
calls the block untrusted poster information that cannot claim another
standing or change how to work. A test forges a standing line, a "How to
work" section and a closing marker inside the text, and all stay inside the
markers.

**Sanitised text, in and out** (Task 89). One sanitiser,
`internal/sanitize`, cleans untrusted text on its way into the brief and
agent-written text on its way out to Forgejo. Inbound, the issue text, the
poster's answers and the findings lose hidden HTML comments and Markdown
comment definitions, which a human reading the issue never sees, and
mentions and closing keywords are neutralised. Outbound, everything
factoryd posts from an agent or a model, the pull request's title and body,
escalations, information requests, the review, reports, supervisor
comments and the roll's commit subjects, loses hidden comments too,
mentions become `＠name`, a closing keyword before a reference becomes
`(Fixes) #12`, and a link to a host outside `link_hosts`, the Forgejo
host and the project's own hosts is defanged. The forms were tested
against 49 hostile samples built from Forgejo 15's own mention and
keyword patterns, emphasis-stripped forms included. Live: an issue with a
hidden comment asking to add a CODEOWNER, a Markdown comment with a
`curl | sh`, a mention and "Fixes #1" reached the agent with the hidden
parts gone and the rest neutralised, and the agent obeyed neither hidden
instruction. The review model still reads the raw issue text.
That inbound pass also rewrote legitimate text: the human's own briefs and
specs lost HTML comments inside code blocks, `@types/react` became
`＠types/react` and a test fixture's closing keyword turned into
`(fixes)`, so the Stage 11 gate's lane task needed four filings (backlog
90). Since Stage 12 (Ruling 214, Task 108) the inbound pass applies only to
an outsider's text, the objective and the poster's answers of a task whose
author is not a writer; a writer's spec, the human's answers and the
findings of factoryd, the reviewer and CI pass as written. It strips hidden
comments only outside fenced code blocks and no longer neutralises:
mentions and keywords are the outbound pass's job, where they reach
Forgejo. The alert comments factoryd posts switched to the outbound pass,
and an older zero-width mask on `@` in them, which hid mentions from the
outbound pattern, went. The guard against hostile text is the screening
stage for outsiders' issues; an outsider's later comments, the answers to
`request_info`, still reach later sessions unscreened (roadmap).

Workflow changes since Stage 6 sit behind Temporal `GetVersion` change ids
(`gates`, `answers`, `gates-pinned`, `merge-failure-reported`,
`merge-retry-cap`, `gate-started`, `gate-supervisor`, with Task 66
`auto-merge` and `needs-info`, in Stage 9 `stages`, `roll` and
`session-cap`, in Stage 10 `audit`, `review-verdict`, `checks-rerun`,
`poster-cap` and `merge-conflict`, in Stage 11 `processes`, `dep-wait`,
`plan` and `merge-queue`, and in Stage 12 `keep-work`), so a run started
before a change keeps its old path. Stage 12's agent time and supervisor
changes needed no change id: a history recorded before carries no
resolved time and keeps its cap, and the decisions inside a session are
not workflow steps.
Since Stage 11 (Task 96, after two parallel fixes of Stage 10 both took `v21`) a new
change id is a name in a named field, never `vNN`, and a new migration is
named `<UTC yyyymmddhhmmss>_<slug>.sql`, so parallel branches cannot take
the same one: `TestChangeIDsUnique` and `TestMigrationNames` refuse a
repeat or an old-style name, and `TestKindChecksAccept` inserts every alert
and approval kind after all migrations, since two migrations that each
rewrite one check list keep only the last. The work guide and the
template's checks carry the naming rule into every project. A
replay test runs every recorded live history in the code repository's
testdata. Live: PR #100 merged by `factory-merge` after the human's approval
and a 405 before it, and PR #126 went through every gate, the review, the
console approval and the merge.

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
checksum database, `storage.googleapis.com` for the proxy's redirects,
nothing else, no metadata endpoint). The rebuild drill's gate found the
last one: `go vet` fetched a new dependency, the proxy redirected the
download to `storage.googleapis.com`, and every pull request's vet check
failed (Ruling 114). A build job's pod also reaches its build VM,
`auth.docker.io` and the build cache (below). The runner takes its one job
and exits; the spawner deletes the namespace and deregisters the runner.
At most eight CI namespaces run at once, the rest queue. Since Task 65 the
spawner serves every registered project's repository as well, each with its
own token, and for a project it runs the `main` jobs too, with the
project's Actions secrets, so a project's CI never touches sf's privileged
runner (5.1). A project's CI namespaces may also reach Forgejo's SSH, for the
deploy-key push, and factoryd's port 8080, for the alerts endpoint. Since
Task 73 the spawner serves every project with `agents: coder`, the
factory's code repository included, through the same project path.

The Stage 9 bug lane found three defects here, backlog 61, 62 and 65,
which the Stage 10 lane fixed (7). A spawn that failed after creating its namespace, on Hetzner's
"Primary IP limit exceeded" while earlier build VMs' firewalls still
answered `resource_in_use` (backlog 2), left an empty namespace that the
spawner reconciled with a forbidden read every 10 seconds and never
respawned. Build VMs on one Hetzner address failed with i/o timeouts to
`buildkitd` and to github.com, or `buildkitd` never answered, while VMs on
other addresses built. And a failure the agent cannot act on goes back to
it as a finding, while Forgejo 15.0.9 has no API to re-run a job: the
controller re-ran jobs through the web route and once pushed an empty
commit onto the bot's branch as site admin. Since the fixes the spawner
creates the namespace's RoleBinding before the build VM and deletes the
namespace when the binding fails, a silent `buildkitd` gets one
replacement VM, and a red head the agent left unchanged re-runs its checks
once (7).

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
it on every run: it asserts that the job token cannot push. The job's
environment also names Forgejo's OIDC request variables, which the runner
always sets; Forgejo 15.0.9 fills them only when a workflow enables
OpenID Connect and forces that off for a fork's pull request, so they are
empty and the job can mint nothing (backlog 56, read from the source in
Task 86 and seen live). Since Stage 10 the check fails if either is ever
non-empty. Workflow files
come from the head, which is why the worker and factoryd refuse any change
to the workflow directories.

Image builds need root somewhere. Every rootless BuildKit path fails under
gVisor: writing a wide uid map through `newuidmap` is refused, with any
seccomp profile. Stage 6 therefore ran BuildKit as root inside a second
gVisor pod (Ruling 91). That pod is gone: build VMs replaced it, one way only,
because gVisor offers no overlay filesystem and copied every layer in full
(Ruling 106). The pod, its Service, its egress policy and the admission
policy's root carve-out are deleted.

A job labelled `pr-untrusted-build` gets a throwaway Hetzner Cloud server in
the CI project (7.2, Ruling 103), a cx23 in fsn1 on Debian 12. factoryd
creates the job's namespace first, then the server, because the collector
reads a missing namespace as a finished job. cloud-init installs a
checksum-pinned static `buildkitd` v0.33.0 behind mutual TLS on tcp 1234,
with no SSH key. Each server gets its own ECDSA certificate authority, whose
key factoryd drops after signing a server certificate for the fixed name
`buildkitd` and one client certificate. The client certificate reaches the
runner pod as a read-only secret, and the runner's egress gains exactly one
rule for the server's address on 1234. The server's Hetzner firewall admits
1234 only from the cluster nodes' public IPv4s (`cluster-facts`, Ruling 112)
and lets out tcp 80 and 443 and tcp and udp 53. The server needs an IPv4,
because GitHub has no IPv6. Hetzner firewalls match addresses, not names, so
the build VM's egress is open on those ports (Ruling 110). This is accepted,
because the build context is code the agent already had and the VM holds no
credential. The cost if wrong: a malicious Dockerfile can send the pull
request's own source out for at most the job deadline. A name-allowlisting
egress proxy is the named upgrade.

`buildctl` in the runner pod drives the remote daemon. BuildKit fetches
registry tokens through the client session, so a build job's runner pod also
reaches `auth.docker.io`. The layers come from `registry-1.docker.io` to the
VM, and the runner does not reach it. Nothing a PR build produces is pushed:
the output goes to `/dev/null`, and publishing stays with the trusted runner
on `main`.

At most two build VMs run at once (`CI_BUILD_VMS_MAX`, the CI project's
quota). Further build jobs wait in Forgejo's queue, and ordinary jobs are
unaffected. Teardown deletes the server, then its firewall, then the
namespace, whatever ended the pod. factoryd runs the collector of 5.5 on the
CI project every minute, with the interlock of Ruling 123. A build VM's lease
is the 45-minute job deadline plus 15 minutes. Live proofs: `buildkitd`
answered 40 to 47 seconds after the create, the VM was gone 3 seconds after
the job, a killed factoryd left a server that the collector deleted 62
seconds later, and a hand-made server in the CI project was deleted in 48
seconds.

A build job's runner pod waits for its VM in an init container,
`buildkitd-ready`, which runs `buildctl debug workers` for up to 180
seconds and writes `ready` to its termination log only when `buildkitd`
answers. factoryd reads the init container's finish time as the VM's ready
time. A VM that never answers still lets the runner start, and `pr.yml`'s
own 60-second wait fails the job, so a dead VM turns the check red in about
4 minutes.

**CI metrics** (Task 60). factoryd measures its CI and emits it to SigNoz.
Job durations come from Forgejo's `actions/tasks`, polled every 60 seconds,
and run durations from `actions/runs`, as `stopped` minus `created`, queue
time included. A failed run's duration is the time to its first red job.
The spawner measures each job's queue time on its own polls. A job taken
and finished between two polls is never listed, and a job first seen
already taken is counted in `factory.ci.job.queue.unmeasured`. The checks
step on the timeline carries each job's run and queue seconds. A build VM's
close emits its lifetime, its ready time and its cost, one started hour
times the hourly price. Proven live against Forgejo and the registry rows:

| Measure | SigNoz | Truth |
|---|---|---|
| PR run duration, task t-5ec64626c65f | 309 s | 17:02:04 to 17:07:13, 309 s |
| Job `test` / `vet-and-format` / `security` | 295 / 121 / 139 s | the same from Forgejo |
| Queue of `test` and `vet-and-format` | 20.18 s | created 17:02:04, taken 17:02:18, at the spawner's 10-s poll |
| Queue of `security`, held at the 8-runner cap | 120.09 s | taken 17:03:59 |
| Build VM lifetime | 59.655 s | 59.654 s from the row |
| Build VM ready | 38.289 s | from the init container's finish |
| Build VM cost | 0.0096 EUR | one started hour of a cx23 with its IPv4 |
| Main CI run 488 on the roll commit | 76 s | 16:55:54 to 16:57:10 |

Forgejo hands a job to a runner before it evaluates the job's `if`. So a
docs-only pull request's skipped image build still got a VM, which lived 10
seconds and billed a full hour. `runs-on` is therefore an expression in
`pr.yml`: with no image to build, the job lands on an ordinary
`pr-untrusted` runner and skips there.

A build VM costs 0.0096 EUR per build: one started hour of a cx23 with its
IPv4. The type stays cx23 by measurement (Ruling 127). The same pull request
with the same cache took 115 seconds for the image-build step on a cx33 and
115 seconds on a cx23. Only the Go compile was about 21 % faster, at about
twice the price. `CI_BUILD_VM_TYPE` in factoryd's config changes the type.

**The build cache.** PR builds read a cache that holds no credential (Ruling
111). It is a `registry:3` Deployment in the `forgejo` namespace on a
local-path volume, Service `build-cache` on port 5000. A Cilium L7 policy is
the access control: the trusted runner may use any method, the runner pods
of build jobs in CI namespaces may send only GET and HEAD, and nothing else
connects. Main CI exports the cache from the dind's default builder with
`--cache-to type=registry,mode=max,ignore-error=true`, so a cache outage
cannot fail `main` (Ruling 119). The dind uses the containerd image store,
which supports a registry cache export without a separate builder. A PR's
runner pod fetches each image's cache with `crane pull` by digest into a
local OCI layout, under a 120-second timeout, and streams it to the VM with
`--import-cache type=local`. The VM never reaches the cache. A missing cache
means a cold build, and the check stays green. A garbage collection runs at
every registry start, and a daily CronJob restarts the registry at 03:30.
Its `kubectl` image is pinned by digest, because the job may patch a
Deployment in a privileged namespace, and a hijacked tag would mean node
root. The cache grows about 100 to 200 MB per main run that changes code,
and a restart took the store from 2.35 to 1.16 GB with all three cache tags
kept. local-path does not enforce the volume's 20 GiB, so the daily
collection is the bound.

The trusted runner's dind storage is a size-limited `emptyDir` (40 GiB).
The `docker:dind` image declares `/var/lib/docker` a volume, and without a
mount containerd backs it with an anonymous volume the kubelet neither
bounds nor counts: it grew past 50 GiB, put a node under disk pressure, and
the kubelet evicted an innocent untrusted build instead.

**PR build speed.** A PR's image builds took about 25 to 30 minutes in
Stage 6, and 38 minutes on the rebuild drill's gate. Four causes added up:
gVisor's missing overlay filesystem, an empty cache in every fresh pod, file
I/O through gVisor's userspace kernel, and three images built one after the
other, the sandbox image including a warm step that waited on a timeout.
Stage 7's first step removed them. The `changes` job builds only the images
whose inputs a pull request changed, the rest build in parallel, the warm
step is gone, builds run on build VMs, and they read the cache. A docs-only
pull request now goes from intake to six green checks in about 5 minutes. A
pull request that changes Go runs its checks in about 4 to 5 minutes, and
its image build takes about 2.5 minutes on a VM. The cache saves the
dependency steps, but compiling the changed Go dominates on a cx23, and main
CI's image jobs take 15 to 20 seconds longer for the cache upload. The
prison itself stays: shared-kernel containers are weak prisons for code an
agent wrote, so the fix for the cost is fewer and cached builds on a
throwaway kernel, not a weaker sandbox.

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
offers nested virtualisation. It pays off when the build volume is high enough
that the cost per job on gVisor pods and build VMs (compute time, a billed VM
hour per build) exceeds a dedicated node's fixed monthly price, and when
someone is ready to operate that node: firmware, disks and a Talos
installation outside the cloud's API, where a replacement is a ticket, not a
`tofu apply`. At today's volume, a handful of PRs a day, gVisor on cloud VMs
is cheaper and simpler.

The interim step is built: a throwaway Hetzner Cloud VM per build job (7.1).
factoryd creates the VM for one build, the job's builds run there on an
ordinary kernel with overlay filesystems and full speed, and factoryd deletes
the VM afterwards. Cloud servers bill by the started hour, so a build costs
about 0.01 EUR. The VM lives in its own Hetzner project for CI builds, never
in the cluster's project and never in the agent project from 5.5: build VMs
are verification-plane machinery that factoryd runs, not resources an agent
commissions, so factoryd holds the CI project's token while the agent
project's token stays with the gateway alone. The step reuses the
commissioning code of 5.5: a registry row before the create, provider labels,
a lease, and a collector that deletes a VM whose build died with it and
anything in the CI project the registry does not know. The VM is the job's
prison, so it holds no credential at all.

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
the workflow. Built in Stage 7: the agent's escalation tool call (6.6), which
moves the task into the console's human lane. Stage 8 adds the issue lanes
from any account (5.1), the poster's answer to an information request (7),
a project's pushes to `main` (5.1), and SigNoz alerts. Stage 9 adds alerts
on the factory itself and the task analytics (below).

**Alerts into intake** (Rulings 146, 148, 159, built in Task 70, proven by
the Stage 8 exit test). A SigNoz notification channel, created as code by the
`signoz-objects` job, posts firing and resolved alerts to factoryd's `POST
/webhooks/signoz`, with basic auth from the secret `signoz-webhook`. An
alert names a symptom and never a command, so for an alert-filed issue the
agent's own `repro` block counts as the reproduction under the same
fail-at-base and pass-at-head check, and the review is told it came from the
agent (Ruling 170); an outside account's bug without a command gets no such
credit.
factoryd maps the alert's `namespace` label to a project through the
namespace's `factory/project` label. It files one issue per alert
fingerprint in the project's repository, labelled `bug`, titled `alert:
<name> in <namespace>`, with the labels, the value, the SigNoz link and the
firing time in the body. A repeat of an open fingerprint comments on its
issue instead, and the resolve comments `resolved at <time>`. The `bug`
label starts the task at once (5.1). An alert without a mapped project is
logged and dropped. A delivery that fails after the issue and before the
alerts row no longer files twice: the row with the task's id is written
first, and SigNoz's retry files the task from it (backlog 49, fixed by the
bug lane as #205).

**Alerts on the factory itself** (Ruling 180, Task 76). Since Stage 9 the
factory's own namespaces map too (3, 4.2): an alert in `factory` files a
`bug` issue on the code repository and starts an agent task, as the demo
app's did, and an alert in `platform` or `forgejo` files an issue in the
human lane on the infra repository, which has `agents: none`. The issue
title names the service. A human-lane alert's verdict follows the close: a
writer's close is `real`, and the label `noise` on the issue at the close
makes it `noise`. Proven live in the Stage 9 exit test: three deletions of
the factoryd pod filed #193 and started an agent task, a platform Job past
its deadline filed infra issue #5 in the human lane, and the gateway's 5xx
rate filed #210 while blocked keys made it answer 502. The demo app's own rules are a 5xx rate above 5 % over
5 minutes, a redirect p95 above 500 ms over 5 minutes, and a rollout not
ready for 10 minutes, each per namespace. The exit test plants a regression
as a normal commit (Ruling 151): `ValidSlug` panics on a malformed slug,
the load generator's malformed request then answers 500, and the 5xx rule
fires. The chain from there runs through the task, the gates, `auto`, the
demo app's staging roll, 15 minutes without an alert and the prod roll.

**Alerts with verdicts** (Ruling 140, built in Task 61). Every alert the
factory raises about itself is a row in the `alerts` table: kind, source,
task, raised, bound, resolved, verdict (`real` or `noise`), resolved by, and
a detail. The verdict says whether the alert was a real problem, so the
bounds and detectors can be tuned from data:

| Kind | Raised when | Verdict |
|---|---|---|
| `gate_bound` | a gate activity runs past its bound (6.6) | the gate supervisor's action: `wait` is noise, the rest real. A short gate's row stays open |
| `supervisor_trip` | a session detector trips | `continue` is noise, any other action real, resolved by `supervisor` |
| `escalation` | an agent or a supervisor escalates | one click by an approver on the console answer, "real problem" or "noise". Since Stage 9 `unjudged`, set by factoryd, when the task ends without a click |
| `info_request` | an agent asks the poster (7), Task 66 | `unjudged`, set by factoryd when the task ends without a verdict (Stage 9) |
| `alert` | a SigNoz alert files an issue, Task 70 | real when the task's pull request merges, noise when a human closes the issue without a merge. On a human-lane issue, a writer's close is real and the label `noise` makes it noise (Stage 9) |
| `config_rejected` | a configuration commit is refused, or ten reads in a row fail (5.3), Stage 9 | real, set when a valid commit loads |
| `screening` | the screening stage answers suspect (7), Stage 9 | a human's answer is noise, a close real |

factoryd exposes the table as `factory.alert.count{kind,verdict}`, with
`open` for a row without a verdict. It is an up-down counter, because an
open count falls when its alert gets a verdict. Proven live: an escalation
clicked `noise (sebastian)`, supervisor trips judged `noise (supervisor)`,
and `gate_bound` open at 1 in SigNoz while a trip waited. The dashboard's
precision panel, alerts per kind and verdict per day, came with Task 70. The
exit test found two defects in it: factoryd reported only the kind and
verdict pairs the table held, so a series whose rows moved on kept its last
value in SigNoz, and the panel summed over factoryd pods, so a restart
doubled a count. Since the fix factoryd reports every kind and verdict pair,
0 when the table has none, and the panel takes the maximum over pods
(Rulings 173, 174). Open escalation and information-request rows used to
stay open after their task ended, so the panel carried stale opens; the bug
lane fixed it (backlog 3, #195, migration 0033). An agent task's alert that
a human closes as a duplicate came out `noise`, and the console refused a
later verdict: the gateway's real 5xx alert #210 counted as noise (backlog
64). Since the Stage 10 lane's fix, a label `real` on such an issue at the
close judges its alert real, the mirror of `noise` in the human lane;
proven live when the CI queue alert #273 was closed with it.

**Task analytics** (Ruling 185, Task 78). factoryd counts four things per
task: `factory.task.outcome{project,state,model_alias,attempts,merge_rule}`
and `factory.task.cost{model_alias,outcome}` in EUR on every ending path,
`factory.review.verdict{verdict,strict_improvement,round}` where the
review's answer is recorded, and `factory.human.intervention{kind}` for an
approve, a change request, a rejection, an alert verdict click, an
escalation answer, a poster's answer and extra time. Reviews and answers
count from the webhook events, so those made directly in Forgejo count
too; only a merge made directly in Forgejo stays uncounted. A daily pass,
at boot and every 24 hours, sets a revert mark, `tasks.reverted_at`, on a
done task when a pull request merged into the same repository within 14
days undoes every file the task changed, compared by each file's net
change, or when an alert of the same fingerprint is filed again after the
fix, and counts `factory.task.reverted{project}`. Four panels on the
pipeline dashboard show tasks per outcome per day with the reverts, cost
per merged pull request per alias, review verdicts per round, and human
interventions per kind; they sum over pods, since each pod counts only its
own events. There is no report task: humans read the panels, and a weekly
report is one schedule away. Proven live: a planted revert of demo-app #6
as #11 set the mark at the next boot. The first revert rule compared the
sets of changed lines and missed that revert, because git aligned a moved
loop the other way.

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
| Observability | SigNoz, Grafana stack as OTel-compatible fallback. k8s-infra in its own privileged namespace, agent logs excluded, retention 7 days hot and 30 in total with S3 cold storage, alert rules and dashboards as code | Built (Rulings 159, 160) |
| Instrumentation | OTel traces, metrics and logs from factoryd, the gateway and the worker. Audit rows as scrubbed log records, Postgres authoritative. One redact package. CI, build VM and roll metrics. Bounds in policy | Built (Rulings 140, 158) |
| UI style | Server-rendered Go with htmx | Decided |
| Policy engine | Go code now, OPA sidecar when rules multiply | Decided |
| Policy source | The tree `factory/` in the infra repository (policy, projects, processes, templates), read by factoryd, the commit as the version, pinned per task, a generated JSON Schema and a CI check, the console read-only. Runtime decisions are Postgres rows. Kubernetes is the substrate only | Built (Rulings 107, 183, 184) |
| Workflow | An ordered list of stages, each with one `on_findings` setting (agent, human or fail); a repeat from one stage takes the stronger rung; the session cap is the round cap for every exhaustion; a review without a verdict is a finding on the card; a red head the agent left unchanged re-runs its checks once. Since Stage 11 only a green head merges. Since Stage 12 a pushed head is verified at every cap instead of failing, one cap card, a change request at the cap is the answer, the failing job's log lines in the checks finding | Built (Rulings 177, 190, 193, 201, 221, 225) |
| Processes | No fixed process: lanes, dependencies, stages and the merge queue as YAML blocks in a process file a project names. A mechanical check (schema, names, needs, graph, floor rules) shared by the loader and `config check`, and `config explain`. Two shipped processes, `maintenance` and `spec`. The later blocks are roadmap 27a | Built (Rulings 206, 208) |
| Building from a spec | A plan lane whose planner answers a plan, which approvers accept and factoryd turns into cards with their dependencies. Start plan, cards that wait on their dependencies, a merge queue per project, and a new project from the console seeded from a template. Since Stage 12 the template works out of the box with its own `check`, a deployable app and a staging job that waits for the rollout, and registration needs no human password | Built (Rulings 205, 209, 210, 212, 219, 222) |
| Security audit | A stage after the review, per project, a secret pre-check on the added lines and one call on the class's `audit_model` with a six-item checklist; findings, a missing verdict included, to the card only | Built (Rulings 188, 200) |
| Message-in | A `Message` call in the adapter contract; opencode as a server in the pod, one port only factoryd reaches, a per-session bearer; the restart as the fallback for a harness without it. First user: the loop nudge, counted from the event stream; since Stage 12 the supervisor's guidance | Built (Rulings 188, 202, 216) |
| Untrusted text | One sanitiser: into the brief for outsiders' text only, hidden comments stripped outside code blocks; out to Forgejo, hidden comments stripped, mentions and closing keywords neutralised, off-list links defanged; agent commits squashed under a sanitised subject | Built (Task 89, Ruling 214) |
| Answer chain for questions | `questions: [self, model:<tier>, human]` per stage (queue item B), on top of the message call | Not built, waits for Sebastian's scoping |
| Rolls | The code repository rolls through a roll task: a digest pull request from factoryd, a card, the bot's merge, a row per image. Infra changes stay human commits | Built (Ruling 178) |
| Model routing | Three LiteLLM tiers, membership by quality, latency order inside a tier, no fallback across tiers, the answering deployment in the audit row; one provider, Alibaba, one deployment per tier, retries without cooldown | Built (Rulings 181, 189, 192, 204) |
| Capability classes | `coder`, `analyzer` with a report session mode for the improvement presort and the screening stage, and `planner` with a plan session mode. The release is the roll task, no class | Built (Rulings 182, 185, 191, 208) |
| Task analytics | Four task metrics, a revert mark and four panels, no report task | Built (Ruling 185) |
| SPIRE and OPA | No need appeared in Stage 9 | Deferred |
| Policy expressiveness | When the YAML outgrows plain Go: Cedar through cedar-go (no validator, no formal semantics in the Go port) or the OPA sidecar. Two ideas from Keycard worth taking either way: a soft rule that turns a deny into an approval card, and an observe-only replay of a new policy version against recent audit rows before it goes live (docs/market-research) | Revisit later |
| Session-aware policy | Order rules that read a task's history, such as "tests ran before review" or "no tool X after untrusted content". Budgets already read running totals. When a real case appears (AgentCore Policy) | Revisit later |
| Temporal built-ins | Worker Versioning is GA, but a Pinned workflow blocks its deployment from draining while it waits days on a human, so Auto-Upgrade still needs replay-safe markers like our 18 `GetVersion` calls. Workflow Streams and External Payload Storage to S3 are public preview. Check each against the live task page and the session records split once GA | Revisit later |
| Warm pools | kubernetes-sigs/agent-sandbox keeps idle sandbox pods for claims. Needs the gateway to bind a pod's identity to a task at claim time (today it parses the task ID from the ServiceAccount name) and a pool namespace in place of the namespace per session. No until a design keeps identity, network isolation and cleanup as secure as today; perhaps a spike much later | Rejected for now (Sebastian, 2026-09-29) |
| Status at read time | Derive the board from a fact log on every read instead of stored status columns (Agent Orchestrator). The heal pass covers drift today | Revisit if drift appears |
| Post-deploy verification by intent | Watch the metrics a pull request claims to affect after deploy, up to 14 days (Cleric), a monitoring plan and a verdict per environment (Cursor Rollouts), and recorded browser sessions as UI evidence (FactoryKit, Antigravity). The 15-minute staging soak is the start. Depends on projects that emit such metrics | Revisit later |
| Wider intake | Crash reporting, Slack or Matrix mentions and generic webhooks as intake, with a declarative mapping from event to task (OpenHands JMESPath, Kelos JSONPath plus a prompt template) in place of Go code per event, and hard caps on payload size and tasks in flight. Once projects exist that produce such signals | Revisit later |
| Approval on the phone | A push channel (ntfy or Forgejo notifications) and a small approval page (Happy, Optio). Folded into the notification service: Web Push and an installed PWA first, Telegram second, Discord, WhatsApp last | Roadmap 145, after Stage 15 (Ruling 256) |
| Evaluation suite | A per-project regression suite from closed issues in Harbor's task format (instruction, environment, verifier), pass rate against a baseline in CI, and promptfoo's before-and-after table on every prompt change. Adopt the Harbor tool or only its format when built. Not the Harbor container registry | Revisit later |
| Hold lock | One global Postgres advisory lock serialises every budget hold. In-memory counters flushed to Postgres (agentgateway) or deduction at several levels (Bifrost) are the references if it ever limits throughput | Revisit if hold latency grows |
| Hold-out scenarios | Acceptance scenarios a step is graded against, kept outside that step's read access (StrongDM). Would belong to a spec stage of the configurable pipelines | Revisit later, not any time soon (Sebastian, 2026-09-29) |
| Reader and writer split | A read-only agent for untrusted text, a writer that never sees it (GitLab). Rejected: every agent keeps the exact input, an optional scan for injection attempts guards it instead | Rejected (Sebastian, 2026-09-29) |
| Command-level policy | Allowlisting commands inside the sandbox (Codex execpolicy, Ona exec-gate, OpenShell binary pins). Rejected: allowlisting every legitimate command is an endless race, so the sandbox allows everything and the blast radius stays contained | Rejected (Sebastian, 2026-09-29) |
| Hard caps | A hold for each call's worst case under an advisory lock, the output clamped to the headroom, the real cost booked in full, a cut call books its hold until the settle window ends; caps per task, day and UTC month, the month over all projects, with LiteLLM's proxy budget behind it | Decided (Rulings 113, 115, 117, 196, 204) |
| Human identity | Forgejo OAuth2 now, Keycloak only if SSO story demands. A project's members are the writers on its Forgejo repository (Ruling 254) | Decided |
| Sandbox runtime | gVisor on cloud VMs now; microVMs (Kata or Firecracker) on bare-metal KVM nodes when build volume pays for them, for CI jobs and agent sandboxes alike (7.2) | Decided |
| Worker harness | opencode first. The adapter contract lets several harnesses run side by side, pi and goose are the next to try, the choice is per task class and by measurement | Decided |
| Node hardware | 3x Hetzner Cloud cpx42 (8 vCPU x86, 16 GB, 320 GB disk), about 69 EUR per month each | Decided |
| Management access | Talos nftables firewall allowlisting your home IP, headscale VPN later | Decided |
| Repository layout | `ai-software-factory-infra` and `ai-software-factory-code` now, `demo-app` in Phase 3 | Decided |
| Public DNS | Namecheap DNS stays, HTTP-01 certificates, Cloudflare as the named upgrade | Decided |
| Untrusted CI runner | factoryd's CI spawner: one ephemeral gVisor pod per job, repository-scoped ephemeral registration, read-only job token, no secrets; the privileged dind runner serves protected `main` only | Decided (Rulings 78, 89) |
| PR image builds | A throwaway Hetzner Cloud build VM per job in a CI project of its own, `buildkitd` over mutual TLS, no credential on the VM, cx23 by measurement. The gVisor build pod is gone | Decided (Rulings 103, 106, 110, 127) |
| PR build speed | Changed images only, parallel builds, no warm step, build VMs, and an in-cluster read-only cache that only `main` writes, streamed to the VM through the runner pod | Built (Rulings 106, 111, 119) |
| Go module egress | `storage.googleapis.com` joins the CI, build and sandbox allowlists by name, no mirror | Decided (Ruling 114) |
| Agent pull requests | From a `factory-agent` fork, so PR jobs get a read-only token; two session tokens, read upstream and write the fork; workflow-directory guard in the worker and factoryd | Decided (Rulings 97, 100) |
| CI registrar | Dedicated `factory-ci` account, organisation owner because the runner API demands it, token scoped to the code repository, `main` protected with `apply_to_admins` | Decided (Rulings 101, 101a) |
| Missed webhooks | The heal pass re-reads Forgejo every minute and signals what webhooks missed; `Reconcile` at the start of every workflow run | Decided |
| Supervision | Cheap trace detectors over the event stream, the strongest model as supervisor under its own alias, inside the session activity, at most six calls per session plus a scheduled check-in, paid from the task's remaining budget, choosing continue, message into the running session or escalate; one stuck rule in code ends a session that ignores a message and climbs a rung. Agent time and check-in per class, process and project. Human answers are kept across attempts in their own brief section. A `no_write` progress detector, and a gate supervisor for the six long gates with wait, retry, cancel or escalate. A 6-minute supervisor timeout, every exhausted task to the card, a repeated trip to the stronger rung. A nudge into the running session before the same-call trip | Built (Rulings 82, 86, 87, 118, 120, 141, 154, 161, 162, 163, 186, 193, 202, 216, 217, 218, 224) |
| Alerts | An `alerts` table with a verdict per alert, counted in SigNoz, with a precision panel. Alerts on the factory's own namespaces route by the namespace label like a project's | Built (Rulings 140, 180) |
| Factory model calls | The review and both supervisors call through the gateway with factoryd's token and purpose headers, audited and booked like an agent's | Built (Task 71) |
| Cloud-resource commissioning | A separate Hetzner agent project with a gateway-only token, envelopes, leases and a garbage collector, prices from the provider's price list. Servers and volumes, no buckets. SSH certificates bound to one server. Outbound tcp 53, 80 and 443. Deletion at the last tick before the lease ends | Built (Rulings 80, 83, 121, 122, 124, 125) |
| Collector safety | A pass that sees a cluster node's IPv4 or another project's label deletes nothing | Decided (Ruling 123) |
| Task board | The console draws it from the task table; every task is a Forgejo issue; a Forgejo project mirror once its API lands | Built (Rulings 81, 84) |
| Project screen | One screen per project (5.7): status line, pulse, five columns as a view over the task states, the project agent's chat and the card drawer. The project agent is a tool-calling loop inside factoryd that acts as the human through the console's own actions and runs no code, with the OK per tool as `chat.confirm`. Members are a project's Forgejo writers, approvers per project file, GitHub import and export | Designed for Stage 15 (Rulings 251 to 256), not built |
| Merge authority | The `factory-merge` bot merges after a whitelisted human's approval, enforced by Forgejo's branch protection. Merge retries are capped at six. A project on `auto` merges class `normal` without a card after a proven reproduction or a strict improvement and an approving review; the factory's repositories stay on `human` | Built (Rulings 109, 129). `auto` built (Rulings 149, 167, 169) |
| Intake lanes | Lanes backlog, plan and ready from the project's process, `moved_by` judging every entry. Every bug from any account or alert starts a task. Improvements wait in the backlog for a writer, with an analyzer's write-up. Outsiders' bug reports pass a screening stage. Outsiders' writer-only labels are stripped. The poster's text is untrusted information between random markers | Built (Rulings 148, 150, 182, 185) |
| Projects | Each project its own Forgejo organisation with a CI user, runner registration, deploy key and deploy branch. Flux tenancy through a namespaced account. A default-deny network policy with the file's outside hosts only and a quota per environment. Stricter wins: a project file only tightens the policy's defaults. Reconciled hourly. Settings from the project's file, `objects: factory \| seed` and `agents: coder \| none`, so the factory's two repositories are projects like any. Registered by the reconcile with the admin's login from OpenBao. A cache volume per project for agents and pull request CI. Hostnames are an infra commit | Built (Rulings 146, 155, 156, 157, 164, 165, 166, 179) |
| Resource kinds | `task` (leased, agent-requested) and `standing` (no lease, registration or a human) in one envelope | Built (Ruling 147) |
| Hand steps | OpenBao configuration, push mirrors and the console's OAuth app as converging CronJobs. The unseal and the OpenBao bootstrap, once and again after a change to its engines, policies or roles, stay by hand | Built (Ruling 143) |
| Spend approvers | The policy's `approvers` list gates resource approval, envelope edits, promotion and the merge approve button | Decided (Ruling 128) |
| Git remotes | Forgejo is primary and push-mirrors both repositories to GitHub with a fine-grained token limited to the two repositories. Sharing code with people moves to admin-created Forgejo accounts | Decided (Rulings 126, 144) |
| Demo app | A Go link shortener with Postgres, `demo-app/demo-app`, with its own CI/CD: staging, 15 minutes without an alert, prod | Built (Rulings 145, 153) |

## 11. Build order

Three repositories carry the work. `ai-software-factory-infra` (infra
below) holds what the cluster is: the
OpenTofu for Hetzner servers and firewall, the Talos machine configs, the
Flux bootstrap, the kustomizations that point at the other repositories, and
since Stage 9 the factory's configuration tree `factory/` (5.3). It changes
rarely and stays human-only, `agents: none` in its project file (5.1). `ai-software-factory-code` (factory
below) holds the Go module with both
binaries and the harness adapters, its tests, and its deploy manifests; its
Forgejo Actions pipeline builds images into the registry. It changes often and
is the first repository agents will work on. The demo app arrived in Stage
8 as the first project, `demo-app/demo-app` in its own Forgejo organisation
(5.1).
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
   review escalation, self-improvement analytics. Closed 2026-09-29: the
   review's findings go back to the agent, the analytics are four task
   metrics with panels, and no need for SPIRE or OPA appeared.
6. Hardening (Stage 10, closed 2026-09-30): the recovery without a
   Forgejo dump, the security audit stage, the review-verdict rule,
   message-in and the loop nudge, the hardened harness configuration,
   hidden tools, stricter wins, protected files, the sanitiser, one model
   provider and a month cap, and a bug lane the factory ran on itself.
7. Building from a spec (Stage 11, closed 2026-09-30): processes composed
   from YAML blocks, lanes, the planner and the plan card, dependencies
   between cards, a merge queue per project, a new project from the
   console seeded from a template, and collision-free names for migrations
   and change ids.
8. Bugfix rounds (Stage 12, round 1 closed 2026-10-01): agent time in
   hours with check-ins, the supervisor's message into the running
   session and one stuck rule, finished work kept at every cap, the
   per-project cache volume, gcc in the sandbox, the failing job's log
   lines, a template that works out of the box, registration without a
   human password and the sanitiser for outsiders only. The Stage 11 spec
   then built clean in under two hours.
9. The project screen (Stage 15, designed 2026-10-10, not built, 5.7):
   the status line, the pulse, five columns beside the project agent's
   chat, inline answers, members with approvers per project, and GitHub
   import and export, closed by an app built through the chat. What
   follows is in the roadmap, scoped by Sebastian.

## 12. Glossary

| Term | Meaning |
|---|---|
| PV / PVC | Persistent volume (a disk the cluster offers) / claim (a pod's request for one) |
| Operator (Kubernetes) | A controller plus custom object types that runs a piece of software for you on Kubernetes |
| Operator (factory) | The person who runs the factory, a writer on its code repository, who creates projects and invites members. Also the LiteLLM alias of the project agent's model, on the high tier, and the ledger ref of its calls (5.7) |
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
| Supervisor | The strongest configured model, called inside the session when a detector trips or a check-in is due, choosing continue, a message into the running session or escalate; never raises a cap |
| Check-in | The supervisor's scheduled look at a running session every `check_in` of agent time (45 minutes by default), with no detector tripped |
| Stuck rule | After a delivered supervisor message, a trip with no write since, or a flip-flop or churn, ends the session without a call and the next one runs on the stronger rung |
| Cache volume | A project's directory on its node, `/var/lib/factory-cache/cache-agent-<project>` or `cache-ci-<project>`, mounted at `/cache` for Go's build cache, installed tools and npm's cache |
| Fork PR | A pull request from `factory-agent`'s fork into `sf`; Forgejo gives its CI jobs a read-only token and no secrets |
| Job token | The token Forgejo Actions hands each CI job; writable on a same-repository PR, read-only on a fork PR |
| factory-ci | The Forgejo account that registers ephemeral untrusted runners and reads collaborator permissions |
| Build VM | A throwaway Hetzner Cloud server in the CI project that runs `buildkitd` for one PR build job, reached over mutual TLS, holding no credential, deleted after the job |
| Build cache | The in-cluster `registry:3` that `main` CI writes and that PR build jobs read with GET and HEAD only, streamed to the build VM through the runner pod |
| factory-merge | The Forgejo bot that merges an agent pull request after a whitelisted human approved it. It cannot push |
| Approvers | The policy's list of Forgejo users who may authorise spend in the console |
| Hold | A reservation of a call's or a resource's worst-case cost, taken before it runs and replaced by the real cost |
| Push mirror | Forgejo's push of every commit to the GitHub copy of a repository |
| Pulse | One sentence under the status line, the most useful thing to know now, written by a cheap model from the board and the last events, refreshed on every event and every 60 s, booked under `pulse` (5.7) |
| Heal pass | factoryd's pass at boot and every minute that starts missing workflows and re-reads Forgejo for signals a webhook missed |
| Timeline | A task's step-by-step record in S3 (`sessions/<id>/timeline.jsonl`), from intake to its final state |
| Envelope | The resource and euro allowance per project for commissioned cloud resources: monthly euros, server types, count, lease length, volume size. A block of the project's file, the policy default when absent |
| Lease | The expiry every commissioned resource and build VM carries. The collector deletes the resource at the last tick before it ends |
| Principal | The name an SSH certificate is valid for. A commissioned server accepts only its own, `resource-<row id>` |
| Project | A repository the factory builds software for, with its settings in a file of the infra repository, its own Forgejo organisation, namespaces and quota. The factory's own repositories are projects on `human`, their objects from the seed |
| Project agent | The chat's agent on the project screen: a tool-calling loop inside factoryd that acts as the human through the console's own actions, one event whatever the input, and runs no code. The tools that need a human's OK are the `chat.confirm` setting (5.7) |
| Project screen | The human's tool, one per project: status line, pulse, board, chat and card drawer, each with one job (5.7) |
| Merge rule | A project's setting, `auto` or `human`: whether a qualifying change merges without a card |
| Member | A write collaborator on a project's Forgejo repository. A member gets the project screen of the projects they write and never the factory-level pages (5.7) |
| Deploy branch | A project's branch `deploy`, which holds the rolled state that Flux applies. Only the deploy key pushes to it |
| Standing resource | A project's environment server: no lease, requested by registration or a human, a fixed monthly line |
| Status line | The project screen's top line: the project's state, cards working, cards that need you, spend against the monthly cap and the GitHub mirror's state, each a link to its page (5.7) |
| Bound | The seconds a gate activity may run before it raises a `gate_bound` alert |
| Gate supervisor | The supervisor model called when one of the six long gates passes its bound. It chooses wait, retry, cancel or escalate |
| Alert verdict | Whether an alert was a real problem or noise, set by the supervisor's action, a human's click or the task's outcome |
| Poster information | An issue author's answer to an information request, carried in the brief as untrusted information, never as authority |
| Configuration tree | The directory `factory/` in the infra repository: `policy.yaml`, `projects/<name>.yaml`, `processes/<name>.yaml` and `templates/<name>/`, read by factoryd, with the commit as the version |
| Pin | The configuration version a task started under; its caps and bounds come from it |
| Stage | One step of the `stages` block of a process file, from screening to merge, with one `on_findings` setting |
| Process | A file `processes/<name>.yaml` of four blocks, lanes, dependencies, stages and merge, that a project names. The loader and `config check` refuse one that cannot work |
| Lane | Where a card waits or starts: `backlog` does not start, `ready` starts a coder, `plan` starts a planner. `moved_by` says who may put a card there |
| Planner | The capability class whose plan session answers a plan of cards from a spec, never code |
| Plan card | The approval card of kind `plan` where approvers accept a plan revision, after which factoryd files one card per planned card |
| Merge queue | A project's order of pull requests at the approval stage: one at a time, each synced with `main` and re-checked when `main` moved |
| Template | A directory `templates/<name>/` of files that registration renders into a new project's first commit: since Stage 12 a working app, its `check`, its Dockerfile and its Deployment |
| on_findings | A stage's setting for what its findings do: `agent` (back to the next session), `human` (the card) or `fail` |
| Round cap | The session cap as the bound on returns: a task at its cap has its pushed work verified, then goes to the one cap card with every finding |
| Seed project | A project whose repository objects come from the infra repository and the seed, not from registration (`objects: seed`) |
| Roll task | A task of source `roll` that factoryd files for a green `main` commit with new images: a digest pull request, a card, the bot's merge, roll rows |
| Model tier | A LiteLLM model group of equivalent deployments from several providers; the role aliases map onto tiers |
| Analyzer | The capability class that reads and writes up, never codes, in report mode |
| Report session | A session with a read token only and no push, whose last message factoryd posts as an issue comment |
| Screening | The stage in which an analyzer reads an outside account's bug report before the coder starts and answers clear or suspect |
| Revert mark | A done task's mark when a later pull request undid its change or its alert was filed again within 14 days |
| Security audit | The workflow stage after the review that checks a diff for secrets and risky changes; its findings always go to a human |
| Loop nudge | The message factoryd sends into a running session after three identical calls in a row, before the same-call trip |
| Message port | Port 8091 on a worker pod, where factoryd alone posts a message into the running session with a per-session bearer |
| Sanitiser | `internal/sanitize`: strips hidden text outside code blocks from an outsider's text into the brief, and strips hidden text and neutralises mentions, closing keywords and off-list links in agent text out to Forgejo |
| Protected files | Manifests, lockfiles, agent instruction files, `CODEOWNERS` and top-level dot files, which rank `high` in the policy gate |
| Stricter wins | The rule that a project file may only tighten the policy's defaults and caps |
| Month cap | `budget.month_eur`: the variable spend of every project and the factory in one UTC month; a task that meets it parks at a human card |
