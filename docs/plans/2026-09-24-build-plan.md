# Software factory build plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the software factory from `docs/architecture.md` in ten stages, each with an exit test, from empty repos to a factory that works on its own code.

**Architecture:** Three Hetzner Robot AX41 nodes run Talos Linux with the built-in nftables firewall. Flux deploys the platform services from Forgejo. Two Go services, factoryd and factory-gateway, hold the control plane. opencode workers run in per-task gVisor sandboxes behind the adapter contract (architecture 6.2).

**Tech Stack:** OpenTofu, Talos 1.14, Cilium 1.20, Flux, CloudNativePG, Temporal, OpenBao, LiteLLM OSS, SigNoz, Forgejo plus Actions, Go 1.25, cert-manager with Let's Encrypt HTTP-01.

**Spec:** `docs/architecture.md`

## Global Constraints

- Nothing is implemented before Sebastian's explicit go.
- No secret enters Git, ever. Secrets live in the seed bundle (offline password manager plus printed copy) or in ignored `.env` files.
- Nodes: 3x Hetzner Robot AX41, about 39 EUR per month each, verify the price at order time. All three run control-plane and workloads.
- Talos 1.14, Cilium 1.20, OpenTofu (`tofu`). No SSH on nodes, Talos API only.
- Go module `github.com/sebastianrueckerai/ai-software-factory-code`, binaries `factoryd` and `factory-gateway`.
- New work happens in a git worktree. Every task ends with a commit to master and a push.
- Repositories: `ai-software-factory-infra` and `ai-software-factory-code`, private on GitHub now, Forgejo becomes the primary in Stage 2 with GitHub as backup remote. File paths below say `infra/` and `factory/` for short.
- British English in all documents.

## Review Focus

The five failure modes most likely to bite, each with the task that covers it:

1. A wrong CIDR in the firewall blocks every path into the nodes. Task 7 validates the rule set before apply and Task 9 proves reachability from home and blocking from outside. Task 8 documents the Robot rescue path.
2. OpenTofu state and tfvars carry Robot credentials. Task 2 ignores them in Git and Task 6 checks `git status` before every commit.
3. The Talos secrets bundle is the cluster root. Task 7 writes it to the seed bundle, never to the repo. Task 3 reserves the slot in the checklist.
4. The Robot provider could be stale or gone. Task 6 verifies the provider against the registry before use and names the manual-order fallback.
5. The healthz JSON shape becomes a contract that deploys and probes parse. Task 4 pins it in a test before anything depends on it.

## The stage cut

Each stage ends with an exit test. A stage starts only after the previous one passed. Stages 0 and 1 are fully tasked below. The plan for each later stage is written when the previous stage passes its gate, because later stages depend on what the earlier ones teach.

| Stage | Builds | Exit test |
|---|---|---|
| 0 Seed | Repo skeletons, toolchain | Tests green in both repos, CI workflow committed |
| 1 Metal | 3 AX41 nodes, Talos, firewall, Cilium | 3 nodes Ready, API reachable from home only |
| 2 Ranch | Forgejo, Flux, CNPG, Temporal, OpenBao, LiteLLM, SigNoz, TLS | git.aisoftwarefactory.world serves a valid cert, LiteLLM answers a smoke call |
| 3 Burn-down | The re-seed drill | Full destroy and rebuild, Postgres and Forgejo restored |
| 4 Gateway | factory-gateway v0 | JWT auth and virtual keys proven by tests on the cluster |
| 5 Worker | factoryd v0, sandbox, opencode adapter | A task produces a branch and a commit, network deny holds |
| 6 Loop | Intake to pull request | An issue becomes a merged PR, the human merges |
| 7 Teeth | Policy, budgets, approvals, verification gates | An over-budget call is refused, an approval flow completes |
| 8 Customer | Demo app, staging and prod | An alert creates a task, the fix deploys |
| 9 Self | Factory on its own repos | An agent PR to `factory` merges under policy |

The stages map to the build order in architecture 11: Ranch is stages 0 to 3, First loop is 4 to 6, Teeth is 7, Customer is 8, Self is 9.

Standing reminder at every stage boundary from here on: the cluster costs about 120 EUR per month once Stage 1 orders the nodes, plus storage and model spend. Hetzner Robot servers cannot be paused, only cancelled. Raise the shutdown question at every boundary.

---

## Stage 0: Seed

No money, no nodes. Two repositories exist with their toolchains proven.

### Task 1: Create the two repositories

**Files:**
- Create: `~/repos/ai-software-factory-infra` (clone of new GitHub repo)
- Create: `~/repos/ai-software-factory-code` (clone of new GitHub repo)

**Interfaces:**
- Produces: the two remotes every later task commits to.

- [ ] **Step 1: Create the private repos on GitHub**

```bash
gh repo create sebastianrueckerai/ai-software-factory-infra --private --description "Cluster substrate: OpenTofu, Talos configs, Flux"
gh repo create sebastianrueckerai/ai-software-factory-code --private --description "Control plane: factoryd, factory-gateway, harness adapters"
```

- [ ] **Step 2: Clone both**

```bash
cd ~/repos
gh repo clone sebastianrueckerai/ai-software-factory-infra
gh repo clone sebastianrueckerai/ai-software-factory-code
```

- [ ] **Step 3: Add a README to each and push**

`ai-software-factory-infra/README.md`:

```markdown
# ai-software-factory-infra

What the cluster is: OpenTofu for Hetzner Robot servers, Talos machine
configs, Flux bootstrap. Design lives in the ai-software-factory repo.
Human-only repository, agents never write here.
```

`ai-software-factory-code/README.md`:

```markdown
# ai-software-factory-code

Go module with factoryd and factory-gateway, harness adapters, tests,
deploy manifests. First repository the agents will work on.
```

```bash
git add README.md && git commit -m "Open the repository" && git push
```

Run in both repos.

### Task 2: OpenTofu skeleton in infra

**Files:**
- Create: `infra/versions.tf`
- Create: `infra/variables.tf`
- Create: `infra/terraform.tfvars.example`
- Create: `infra/.gitignore`

**Interfaces:**
- Produces: variables `cluster_name`, `node_count`, `server_type`, `home_cidr`, `hetzner_robot_user`, `hetzner_robot_password` used by Task 6.

- [ ] **Step 1: Write the files**

`versions.tf`:

```hcl
terraform {
  required_version = ">= 1.9"
}
```

`variables.tf`:

```hcl
variable "cluster_name" {
  type    = string
  default = "sf"
}

variable "node_count" {
  type    = number
  default = 3
  validation {
    condition     = var.node_count >= 3 && var.node_count % 2 == 1
    error_message = "Node count must be odd and at least three (etcd quorum)."
  }
}

variable "server_type" {
  type    = string
  default = "AX41"
}

variable "home_cidr" {
  description = "Home address allowlisted for the Talos and Kubernetes APIs"
  type        = string
}

variable "hetzner_robot_user" {
  type      = string
  sensitive = true
}

variable "hetzner_robot_password" {
  type      = string
  sensitive = true
}
```

`terraform.tfvars.example`:

```hcl
home_cidr               = "203.0.113.10/32"
hetzner_robot_user      = "not-in-git"
hetzner_robot_password  = "not-in-git"
```

`.gitignore`:

```
.terraform/
*.tfstate
*.tfstate.*
terraform.tfvars
*.auto.tfvars
secrets.yaml
talos/controlplane.yaml
talos/worker.yaml
talos/talosconfig
```

The provider lock file `.terraform.lock.hcl` stays committable: it pins provider versions, which the immutable re-seed constraint wants in Git. It appears with the first provider in Stage 1.

- [ ] **Step 2: Install OpenTofu if missing and validate**

```bash
cd ~/repos/ai-software-factory-infra
tofu init
tofu validate
```

Expected: `Success! The configuration is valid.`

- [ ] **Step 3: Prove the ignore works**

```bash
cp terraform.tfvars.example terraform.tfvars
git status --porcelain
```

Expected: no `terraform.tfvars` in the output. Delete the copy afterwards.

- [ ] **Step 4: Commit and push**

```bash
git add . && git commit -m "OpenTofu skeleton with quorum-guarded node count" && git push
```

### Task 3: Seed bundle checklist in infra

**Files:**
- Create: `infra/docs/seed-bundle.md`

**Interfaces:**
- Consumes: architecture 3.3, the seed bundle section.
- Produces: the checklist Task 7 fills when Talos secrets exist.

- [ ] **Step 1: Write the checklist**

`infra/docs/seed-bundle.md`:

```markdown
# Seed bundle checklist

The bundle lives in the offline password manager plus a printed copy.
No value below ever enters Git. Re-seed restores from Git plus S3 plus
this bundle.

- [ ] Hetzner Robot API user and password (account has API access on,
      home IP whitelisted in the Robot panel)
- [ ] Hetzner Object Storage access keys (S3)
- [ ] Namecheap account access, registrar and DNS for
      aisoftwarefactory.world
- [ ] Model provider keys: DeepSeek, Alibaba, z.ai, Groq
- [ ] Tool provider keys: Replicate, Firecrawl, fal.ai
- [ ] OpenBao unseal keys (created in Stage 2)
- [ ] Talos secrets bundle (created in Stage 1, secrets.yaml)
```

- [ ] **Step 2: Commit and push**

```bash
git add docs/seed-bundle.md
git commit -m "Seed bundle checklist"
git push
```

### Task 4: Go module in factory

**Files:**
- Create: `factory/go.mod`
- Create: `factory/internal/health/health.go`
- Test: `factory/internal/health/health_test.go`
- Create: `factory/cmd/factoryd/main.go`
- Create: `factory/cmd/factory-gateway/main.go`
- Create: `factory/internal/harness/types.go`
- Test: `factory/internal/harness/types_test.go`
- Create: `factory/Makefile`
- Create: `factory/.forgejo/workflows/ci.yml`

**Interfaces:**
- Produces: `health.Handler(service, version string) http.Handler`, the harness types from architecture 6.2 (`TaskBrief`, `Event`, `EventKind`, `Result`, `SandboxEnv`, `Harness`), used by Stages 4 and 5.

- [ ] **Step 1: Create the module**

```bash
cd ~/repos/ai-software-factory-code
go mod init github.com/sebastianrueckerai/ai-software-factory-code
```

- [ ] **Step 2: Write the failing health test**

`internal/health/health_test.go`:

```go
package health

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthz(t *testing.T) {
	srv := httptest.NewServer(Handler("factoryd", "test"))
	defer srv.Close()

	res, err := http.Get(srv.URL + "/healthz")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", res.StatusCode)
	}
	if got := res.Header.Get("Content-Type"); got != "application/json" {
		t.Fatalf("content-type = %q, want application/json", got)
	}
	var body struct {
		Service string `json:"service"`
		Status  string `json:"status"`
		Version string `json:"version"`
	}
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body.Service != "factoryd" || body.Status != "ok" || body.Version != "test" {
		t.Fatalf("body = %+v", body)
	}
}
```

- [ ] **Step 3: Run it and verify it fails**

Run: `go test ./internal/health/`
Expected: FAIL, `undefined: Handler`

- [ ] **Step 4: Implement**

`internal/health/health.go`:

```go
package health

import (
	"encoding/json"
	"net/http"
)

// Handler answers GET /healthz with the service name and version.
func Handler(service, version string) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"service": service,
			"status":  "ok",
			"version": version,
		})
	})
	return mux
}
```

- [ ] **Step 5: Run it and verify it passes**

Run: `go test ./internal/health/`
Expected: PASS

- [ ] **Step 6: Write the failing harness types test**

`internal/harness/types_test.go`:

```go
package harness

import (
	"encoding/json"
	"testing"
	"time"
)

func TestEventJSONRoundTrip(t *testing.T) {
	in := Event{
		Time:   time.Date(2026, 9, 24, 12, 0, 0, 0, time.UTC),
		Kind:   EventToolCall,
		Detail: map[string]any{"tool": "bash", "exit_code": float64(0)},
	}
	data, err := json.Marshal(in)
	if err != nil {
		t.Fatal(err)
	}
	var out Event
	if err := json.Unmarshal(data, &out); err != nil {
		t.Fatal(err)
	}
	if !out.Time.Equal(in.Time) || out.Kind != in.Kind {
		t.Fatalf("round trip = %+v, want %+v", out, in)
	}
	if out.Detail["tool"] != "bash" {
		t.Fatalf("detail = %v", out.Detail)
	}
}

func TestTaskBriefOmitsEmptyFields(t *testing.T) {
	data, err := json.Marshal(TaskBrief{Objective: "fix", Repository: "factory", SHA: "abc"})
	if err != nil {
		t.Fatal(err)
	}
	var raw map[string]any
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"issue_url", "findings", "artifacts"} {
		if _, ok := raw[key]; ok {
			t.Fatalf("key %q present, want omitted", key)
		}
	}
}
```

- [ ] **Step 7: Run it and verify it fails**

Run: `go test ./internal/harness/`
Expected: FAIL, `undefined: Event`

- [ ] **Step 8: Implement**

`internal/harness/types.go`:

```go
package harness

import (
	"context"
	"time"
)

// TaskBrief is the whole task as data, handed to a harness adapter
// (architecture 6.2).
type TaskBrief struct {
	Objective  string   `json:"objective"`
	Repository string   `json:"repository"`
	SHA        string   `json:"sha"`
	IssueURL   string   `json:"issue_url,omitempty"`
	Findings   []string `json:"findings,omitempty"`
	Artifacts  []string `json:"artifacts,omitempty"`
}

type EventKind string

const (
	EventModelCall  EventKind = "model_call"
	EventToolCall   EventKind = "tool_call"
	EventFileChange EventKind = "file_change"
	EventCommand    EventKind = "command"
	EventCheckpoint EventKind = "checkpoint"
	EventFinished   EventKind = "finished"
)

// Event is one normalized stream item from a running harness. The git
// diff and the artifact store stay the ground truth.
type Event struct {
	Time   time.Time      `json:"time"`
	Kind   EventKind      `json:"kind"`
	Detail map[string]any `json:"detail,omitempty"`
}

// Result is the adapter's final verdict.
type Result struct {
	Success bool   `json:"success"`
	Summary string `json:"summary"`
}

// SandboxEnv names where a task runs.
type SandboxEnv struct {
	Namespace      string `json:"namespace"`
	ServiceAccount string `json:"service_account"`
	Image          string `json:"image"`
}

// Harness is the only thing factoryd knows about harnesses
// (architecture 6.2).
type Harness interface {
	Prepare(ctx context.Context, env SandboxEnv, brief TaskBrief) error
	Run(ctx context.Context, brief TaskBrief, emit func(Event)) Result
}
```

- [ ] **Step 9: Run all tests**

Run: `go test ./...`
Expected: PASS in both packages

- [ ] **Step 10: Add the two binaries**

`cmd/factoryd/main.go`:

```go
package main

import (
	"flag"
	"log"
	"net/http"

	"github.com/sebastianrueckerai/ai-software-factory-code/internal/health"
)

var version = "dev"

func main() {
	addr := flag.String("addr", ":8080", "listen address")
	showVersion := flag.Bool("version", false, "print version and exit")
	flag.Parse()
	if *showVersion {
		log.Println(version)
		return
	}
	log.Fatal(http.ListenAndServe(*addr, health.Handler("factoryd", version)))
}
```

`cmd/factory-gateway/main.go`:

```go
package main

import (
	"flag"
	"log"
	"net/http"

	"github.com/sebastianrueckerai/ai-software-factory-code/internal/health"
)

var version = "dev"

func main() {
	addr := flag.String("addr", ":8081", "listen address")
	showVersion := flag.Bool("version", false, "print version and exit")
	flag.Parse()
	if *showVersion {
		log.Println(version)
		return
	}
	log.Fatal(http.ListenAndServe(*addr, health.Handler("factory-gateway", version)))
}
```

- [ ] **Step 11: Add the Makefile**

```make
test:
	go test ./...

vet:
	go vet ./...

build:
	go build ./cmd/factoryd ./cmd/factory-gateway
```

- [ ] **Step 12: Add the CI workflow**

`.forgejo/workflows/ci.yml`:

```yaml
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: "1.25"
      - run: go test ./...
      - run: go vet ./...
```

The workflow has no runner until Stage 2. Committing it now fixes the contract it must satisfy.

- [ ] **Step 13: Run the full gate and commit**

```bash
make test vet build
git add .
git commit -m "Go module with health handler and harness types, CI contract"
git push
```

**Stage 0 exit test:** `make test` green in factory, `tofu validate` green in infra, both repos pushed.

---

## Stage 1: Metal

Three AX41 nodes run Talos with the firewall proven. First money: about 120 EUR per month starts here.

### Task 5: Robot API access and seed facts

**Files:**
- Create: `infra/terraform.tfvars` (ignored, never committed)

**Interfaces:**
- Produces: `home_cidr`, `hetzner_robot_user`, `hetzner_robot_password` for Task 6. The public IPv4 of the home line.

- [ ] **Step 1: Enable the Robot API and whitelist the home IP**

In the Hetzner Robot panel: enable API access, whitelist the current public IP. Robot API calls from non-whitelisted addresses fail.

- [ ] **Step 2: Record the public IP**

```bash
curl -4 ifconfig.me
```

Expected: one IPv4 address. It goes into tfvars as `<ip>/32`.

- [ ] **Step 3: Verify AX41 price and stock**

Open the Robot order page for AX41. If the price moved from about 39 EUR per month, note the new number and update architecture 3 before ordering.

- [ ] **Step 4: Write tfvars**

`infra/terraform.tfvars`:

```hcl
home_cidr               = "<ip>/32"
hetzner_robot_user      = "<robot user>"
hetzner_robot_password  = "<robot password>"
```

- [ ] **Step 5: Export the credentials for OpenTofu**

```bash
export TF_VAR_hetzner_robot_user=...
export TF_VAR_hetzner_robot_password=...
```

Use the real values from the password manager. They never enter a command that logs them into Git history.

### Task 6: Order the three nodes

**Files:**
- Create: `infra/main.tf`
- Create: `infra/outputs.tf`

**Interfaces:**
- Consumes: variables from Task 2, credentials from Task 5.
- Produces: three running AX41 servers and their public IPv4 addresses, used by Tasks 7 and 8.

- [ ] **Step 1: Verify the Robot provider on the registry**

Check `registry.terraform.io` for `sophotechlabs/hetzner-robot` first, `driftstein/robot` second. Confirm the provider documents a `robot_server` resource and its address attribute. If both are unusable, use the fallback: order three AX41 by hand in the Robot console (Ubuntu image, FsN1), write the three IPs into `terraform.tfvars` as a `robot_ips` list, and skip Step 4's apply. The re-seed drill then includes a manual reorder, a few minutes of clicking, acceptable.

- [ ] **Step 2: Write main.tf**

`infra/main.tf` (field names verified against the chosen provider's docs in Step 1):

```hcl
terraform {
  required_providers {
    hetzner-robot = {
      source = "sophotechlabs/hetzner-robot"
    }
  }
}

provider "hetzner-robot" {}

resource "robot_server" "node" {
  count       = var.node_count
  name        = "${var.cluster_name}-${count.index}"
  server_type = var.server_type
  datacenter  = "fsn1-dc14"
  image       = "ubuntu-24.04"
}
```

The Ubuntu image is a placeholder boot disk. Task 8 overwrites it with the Talos installer.

- [ ] **Step 3: Write outputs.tf**

`infra/outputs.tf`:

```hcl
output "node_ips" {
  description = "Public IPv4 addresses of the three nodes"
  value       = robot_server.node[*].public_net_ipv4
}
```

Adjust the attribute name to what the provider documents.

- [ ] **Step 4: Plan and apply**

```bash
cd ~/repos/ai-software-factory-infra
tofu init
tofu plan
tofu apply
```

Expected: three servers created. `tofu output node_ips` prints three addresses. Confirm the servers show as active in the Robot panel.

- [ ] **Step 5: Check for secrets, then commit**

```bash
git status --porcelain
```

Expected: only `main.tf` and `outputs.tf` as new. Then:

```bash
git add main.tf outputs.tf
git commit -m "Order three AX41 nodes via the Robot provider"
git push
```

### Task 7: Talos configs and the firewall

**Files:**
- Create: `infra/talos/patches.yaml`
- Create: `infra/talos/README.md`

**Interfaces:**
- Consumes: node IPs from Task 6, home CIDR from Task 5.
- Produces: validated machine configs and the rule list Task 8 applies.

- [ ] **Step 1: Install talosctl 1.14**

```bash
curl -sL https://talos.dev/install | sh
talosctl version
```

Expected: client 1.14.x.

- [ ] **Step 2: Generate the cluster secrets**

```bash
cd ~/repos/ai-software-factory-infra/talos
talosctl gen secrets -o secrets.yaml
```

`secrets.yaml` is the cluster root: etcd, kubelet and OpenBao-adjacent trust all derive from it. Move it to the seed bundle, tick the slot in `infra/docs/seed-bundle.md`, never commit it. The infra `.gitignore` already excludes it.

- [ ] **Step 3: Generate the base configs**

```bash
IP0=<node0-ip> IP1=<node1-ip> IP2=<node2-ip>
talosctl gen config sf https://$IP0:6443 \
  --with-secrets secrets.yaml \
  --config-patch-control-plane @patches.yaml \
  --output-dir .
```

All three nodes run control-plane and workloads, so the control-plane config applies to every node. Patch only the endpoint per node when applying in Task 8.

- [ ] **Step 4: Write the firewall patch**

`infra/talos/patches.yaml`:

```yaml
machine:
  install:
    disk: /dev/nvme0n1
---
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: api-from-home
portSelector:
  ports:
    - 6443
    - 50000
  protocol: tcp
ingress:
  - subnet: <home-cidr>/32
---
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: node-mesh-tcp
portSelector:
  ports:
    - 2379
    - 2380
    - 6443
    - 10250
    - 4240
    - 50000
  protocol: tcp
ingress:
  - subnet: <node0-ip>/32
  - subnet: <node1-ip>/32
  - subnet: <node2-ip>/32
---
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: node-mesh-udp
portSelector:
  ports:
    - 8472
    - 6081
  protocol: udp
ingress:
  - subnet: <node0-ip>/32
  - subnet: <node1-ip>/32
  - subnet: <node2-ip>/32
---
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: web-from-world
portSelector:
  ports:
    - 80
    - 443
  protocol: tcp
ingress:
  - subnet: 0.0.0.0/0
---
apiVersion: v1alpha1
kind: NetworkDefaultActionConfig
ingress: block
```

The port list, with the reason each is open:

- 6443, 50000: Kubernetes and Talos APIs, from home only.
- 2379, 2380: etcd, node to node.
- 10250: kubelet, node to node.
- 4240: Cilium health checks, node to node.
- 8472, 6081: Cilium VXLAN and Geneve, node to node, UDP.
- 80, 443: Gateway endpoints for Let's Encrypt HTTP-01 and the public services from Stage 2 on.

Fill the placeholders with the real IPs and CIDR before validating. Verify the document names and field spellings against the Talos 1.14 docs page for the ingress firewall before applying, this plan was written against the 1.8-era schema names.

- [ ] **Step 5: Validate the configs**

```bash
talosctl validate --config controlplane.yaml --mode metal
```

Expected: valid. Fix and revalidate until it is.

- [ ] **Step 6: Document and commit**

`infra/talos/README.md`:

```markdown
# Talos configs

secrets.yaml is generated per cluster and lives in the seed bundle,
never here. The generated controlplane.yaml and worker.yaml embed the
cluster secrets too, so they are gitignored and regenerated on demand
from secrets.yaml with the command in the build plan
docs/plans/2026-09-24-build-plan.md Task 7 Step 3.
```

```bash
git add patches.yaml README.md
git commit -m "Talos machine config patch with nftables ingress rules"
git push
```

Commit only the patch and the README. The generated configs and talosconfig stay untracked and out of Git, they embed the cluster secrets.

### Task 8: Boot the nodes and apply the configs

**Files:** none in Git. This task touches machines.

**Interfaces:**
- Consumes: machine configs from Task 7, node IPs from Task 6.
- Produces: a running Talos cluster and a kubeconfig on the seed machine.

Rescue path, read first: if a node becomes unreachable because the firewall dropped the seed machine, activate the Robot rescue system from the panel, boot it, and re-apply the config with `talosctl apply-config --insecure`. A mis-typed home CIDR is the one error this stage can produce that costs an hour rather than a minute.

- [ ] **Step 1: Boot each node into the Talos installer**

For each node IP, in the Robot panel open the rescue console (or vKVM) and run:

```bash
wget https://github.com/siderolabs/talos/releases/download/v1.14.1/talos-amd64.iso
dd if=talos-amd64.iso of=/dev/nvme0n1 bs=4M status=progress
reboot
```

The node now boots the Talos ISO environment from disk, waiting for a config.

- [ ] **Step 2: Apply the config to each node**

From the seed machine, one node at a time:

```bash
talosctl apply-config --insecure --nodes <node-ip> --file controlplane.yaml
```

The same controlplane.yaml applies to all three nodes. Only the first node gets the bootstrap call in the next step.

- [ ] **Step 3: Bootstrap etcd on the first node**

```bash
talosctl bootstrap --nodes <node0-ip> --endpoints <node0-ip>
```

- [ ] **Step 4: Install kubectl and the Cilium CLI if missing**

```bash
command -v kubectl >/dev/null || {
  curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
  sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
}
command -v cilium >/dev/null || {
  curl -L --remote-name-all https://github.com/cilium/cilium-cli/releases/latest/bin/cilium-linux-amd64.tar.gz{,.sha256sum}
  sha256sum --check cilium-linux-amd64.tar.gz.sha256sum
  sudo tar xzf cilium-linux-amd64.tar.gz -C /usr/local/bin cilium
  rm cilium-linux-amd64.tar.gz*
}
```

- [ ] **Step 5: Get the kubeconfig**

```bash
talosctl kubeconfig -n <node0-ip> -e <node0-ip> sf
kubectl get nodes
```

Expected: three nodes, status NotReady (no CNI yet), roles control-plane+worker.

### Task 9: Cilium and the exit gate

**Files:** none in Git.

**Interfaces:**
- Consumes: the cluster from Task 8.
- Produces: a networked cluster, ready for Stage 2.

- [ ] **Step 1: Install Cilium**

```bash
cilium install --version 1.20.0
cilium status --wait
```

Expected: all agents healthy on three nodes.

- [ ] **Step 2: Run the connectivity test**

```bash
cilium connectivity test
```

Expected: all checks pass. If the node-mesh UDP rule is wrong, this fails here and the fix goes back to Task 7's patch, re-applied with `talosctl apply-config`.

- [ ] **Step 3: Gate check, nodes**

```bash
kubectl get nodes
```

Expected: three nodes Ready, roles control-plane+worker.

- [ ] **Step 4: Gate check, firewall from home**

```bash
curl -k -m 5 https://<node0-ip>:6443
```

Expected: a TLS response from the Kubernetes API, any HTTP code. Reachable.

- [ ] **Step 5: Gate check, firewall from outside**

From a phone on mobile data:

```bash
curl -k -m 5 https://<node0-ip>:6443
```

Expected: timeout. The nftables drop works.

- [ ] **Step 6: Record and remind**

Note the measured monthly cost if it moved from 39 EUR per node. Raise the standing shutdown question: the meter now runs at about 120 EUR per month.

**Stage 1 exit test:** all six gate checks above pass.

---

## Stages 2 to 9: outlines

The detailed task plan for each stage below is written when the previous stage passes its gate, with the same bite-sized format as Stages 0 and 1. Each outline names the goal, the steps in order, and the exit test that closes the stage.

### Stage 2: Ranch

Goal: the platform services run, deployed by Flux from Forgejo, with TLS.

Steps: hand-apply the bootstrap slice (CNPG plus Forgejo) from the seed machine, restore Forgejo repositories from the S3 dump if any exist, push `ai-software-factory-infra` and `ai-software-factory-code` to Forgejo and make it the primary remote with GitHub as backup, bootstrap Flux against Forgejo, deploy cert-manager and the Gateway with HTTP-01 solvers plus the Namecheap A records by hand, then roll out Temporal, OpenBao (init, unseal, first snapshot), LiteLLM with the three chat provider keys from the seed, SigNoz, and the Forgejo Actions Kubernetes runner. Make the S3 buckets and the nightly Forgejo dump job. Add seed-bundle slots for the credentials created before OpenBao is initialised (Forgejo admin password and token, LiteLLM master key, CNPG passwords).

Exit test: `https://git.aisoftwarefactory.world` serves a valid Let's Encrypt certificate, the factory repo's CI workflow runs green on the pod runner, a LiteLLM smoke call through a test virtual key answers with a DeepSeek completion.

### Stage 3: Burn-down

Goal: prove the immutability claim from goal.md on the real cluster.

Steps: back up (CNPG S3 backup, Forgejo dump, OpenBao snapshot), `tofu destroy`, `tofu apply`, re-apply configs, Flux converge, restore Postgres, Forgejo and OpenBao from the seed bundle plus S3, measure the wall-clock duration of the whole drill. This stage is also the off-switch rehearsal: the same path with cancellation instead of rebuild.

Exit test: the cluster is whole again, all Stage 2 exit tests still pass, and the drill duration is written down in architecture 3.

### Stage 4: factory-gateway v0

Goal: the enforcement point from architecture 5.1 exists.

Steps: TDD the JWT validation against the cluster OIDC issuer (unit tests forge tokens with a test signer, an integration test on the cluster uses a real projected ServiceAccount token), the task-row lookup in Postgres, virtual key minting through LiteLLM's OSS key API, the alias table (`coding-cheap`, `coding-frontier`, `review-frontier`), the audit row on every decision, and the first budget refusal. Deploy via Flux with an image built by the new CI.

Exit test: on the cluster, a call with a valid task JWT reaches LiteLLM under a per-task virtual key, a call with no or foreign JWT gets 401, and a call past the task budget gets 402 with an audit row for each outcome.

### Stage 5: worker plane

Goal: one task runs one agent in one sandbox, attributable end to end.

Steps: spot-check the three load-bearing opencode facts from architecture 9 (JSON run output, serve API, `OPENCODE_CONFIG_CONTENT`) before writing the adapter, build the pinned opencode sandbox image with the gVisor RuntimeClass, implement the adapter plus the localhost identity proxy from architecture 6.3 (it re-reads the rotating token file per request, unit test with a temp file that changes), the per-task Forgejo token minting and revocation, the factoryd task registry with Postgres, and session records streaming to S3. Verify the sandbox network policy: egress to factory-gateway and Forgejo git only. Decide whether TaskBrief grows the capability-hints field named in architecture 6.2.

Exit test: a task submitted to factoryd produces a branch and a commit on Forgejo, the session record lands in S3, and a curl from inside the sandbox to any other address fails.

### Stage 6: close the loop

Goal: a signal becomes a merged change.

Steps: Forgejo webhooks into factoryd intake, task rows from issues, the Temporal task workflow end to end (intake, sandbox, run, verify, PR), Forgejo Actions as the first verification gate, the human merge as the delivery step.

Exit test: an issue created on the factory repo becomes a pull request with green checks, a human merges it, and the session record shows the full path.

### Stage 7: teeth

Goal: the enforcement from architecture 5.3 and 5.4 is real.

Steps: the `coder` capability class in Postgres with gateway enforcement, hard euro caps per task and per day in the cost ledger, the approval workflow state with the console UI (server-rendered Go, htmx), the Temporal gate activities from architecture 7, model review last on surviving diffs.

Exit test: a task over budget has its next model call refused by the gateway, a risk-classed change waits in an approval state and completes when approved, and the cost dashboard shows both.

### Stage 8: customer

Goal: the demo app, the first external customer of the factory.

Steps: choose the demo app (fork still open, architecture 10), staging and prod namespaces deployed by Flux, OpenTelemetry emission, SigNoz alert rules feeding factoryd intake, fault injection.

Exit test: an injected fault raises an alert, the alert creates a task, the agent's fix passes verification, merges, deploys to staging, and promotes to prod on the rule.

### Stage 9: self

Goal: the factory works on its own repositories, the portfolio claim from goal.md.

Steps: grant the `coder` class scoped access to `factory` (never `infra`), let real issues drive real changes, add the self-improvement analytics from architecture 11, evaluate SPIRE and OPA only if a need appears that the current design fails to cover.

Exit test: an agent PR to `factory` merges under the same policy a human change would face, with the audit trail complete.
