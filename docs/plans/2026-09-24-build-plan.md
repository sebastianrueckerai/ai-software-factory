# Software factory build plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the software factory from `docs/architecture.md` in ten stages, each with an exit test, from empty repos to a factory that works on its own code.

**Architecture:** Three Hetzner Cloud cpx42 nodes run Talos Linux with the built-in nftables firewall behind a Hetzner Cloud firewall. Flux deploys the platform services from Forgejo. Two Go services, factoryd and factory-gateway, hold the control plane. opencode workers run in per-task gVisor sandboxes behind the adapter contract (architecture 6.2).

**Tech Stack:** OpenTofu, Talos 1.14, Cilium 1.20, Flux, CloudNativePG, Temporal, OpenBao, LiteLLM OSS, SigNoz, Forgejo plus Actions, Go 1.25, cert-manager with Let's Encrypt HTTP-01.

**Spec:** `docs/architecture.md`

## Global Constraints

- Stages 0 to 2 ran under Sebastian's per-stage go; Stages 3 to 9 carry his standing authorization (2026-09-25), no stage-end check-ins.
- No secret enters Git, ever. Secrets live in the seed bundle (offline password manager plus printed copy) or in ignored `.env` files.
- Nodes: 3x Hetzner Cloud cpx42 (x86, 8 shared vCPU, 16 GB, 320 GB), 69.49 EUR per month each net, verify orderability with a create-and-delete probe at order time, the API availability lists are unreliable. All three run control-plane and workloads.
- Talos 1.14, Cilium 1.20, OpenTofu (`tofu`). No SSH on nodes, Talos API only.
- Go module `github.com/sebastianrueckerai/ai-software-factory-code`, binaries `factoryd` and `factory-gateway`.
- New work happens in a git worktree. Every task ends with a commit to master and a push. (Exception, Ruling 1: the infra repo works on main directly so untracked tofu and Talos state survives task and stage boundaries.)
- Repositories: `ai-software-factory-infra` and `ai-software-factory-code`, private on GitHub now, Forgejo becomes the primary in Stage 2 with GitHub as backup remote. File paths below say `infra/` and `factory/` for short.
- British English in all documents.

## Review Focus

The five failure modes most likely to bite, each with the task that covers it:

1. A wrong CIDR in the firewall blocks every path into the nodes. Task 7 validates the rule set before apply and Task 9 proves reachability from home and blocking from outside. The Hetzner Cloud firewall is the outer layer and stays editable from the console when a node is unreachable.
2. OpenTofu state and tfvars carry the Hetzner Cloud token. Task 2 ignores tfvars in Git and Task 6 checks `git status` before every commit.
3. The Talos secrets bundle is the cluster root. Task 7 writes it to the seed bundle, never to the repo. Task 3 reserves the slot in the checklist.
4. A cloud provider schema mismatch breaks the apply. Task 6 pins the official hetznercloud/hcloud provider version and validates attribute names against its registry docs before use.
5. The healthz JSON shape becomes a contract that deploys and probes parse. Task 4 pins it in a test before anything depends on it.

## The stage cut

Each stage ends with an exit test. A stage starts only after the previous one passed. Stages 0 to 2 are fully tasked below. The plan for each later stage is written when the previous stage passes its gate, because later stages depend on what the earlier ones teach.

| Stage | Builds | Exit test |
|---|---|---|
| 0 Seed | Repo skeletons, toolchain | Tests green in both repos, CI workflow committed |
| 1 Metal | 3 cpx42 cloud nodes, Talos, firewall, Cilium | 3 nodes Ready, API reachable from home only |
| 2 Ranch | Forgejo, Flux, CNPG, Temporal, OpenBao, LiteLLM, SigNoz, TLS | git.aisoftwarefactory.world serves a valid cert, LiteLLM answers a smoke call |
| 3 Burn-down | The re-seed drill | Full destroy and rebuild, Postgres and Forgejo restored |
| 4 Gateway | factory-gateway v0 | JWT auth and virtual keys proven by tests on the cluster |
| 5 Worker | factoryd v0, sandbox, opencode adapter | A task produces a branch and a commit, network deny holds |
| 6 Loop | Intake to pull request | An issue becomes a merged PR, the human merges |
| 7 Teeth | Policy, budgets, approvals, verification gates | An over-budget call is refused, an approval flow completes |
| 8 Customer | Demo app, staging and prod | An alert creates a task, the fix deploys |
| 9 Self | Factory on its own repos | An agent PR to `factory` merges under policy |

The stages map to the build order in architecture 11: Ranch is stages 0 to 3, First loop is 4 to 6, Teeth is 7, Customer is 8, Self is 9.

No shutdown question at stage boundaries: Stages 3 to 9 run under standing authorization and stop only when stuck or when Sebastian's input is genuinely needed (Rulings 56, 62, 69). At a real stopping point, take a completed base backup of the live Postgres generation (Ruling 63), then `tofu destroy` stops the meter; the Stage 3 drill is the way back.

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

Three cpx42 cloud nodes run Talos with the firewall proven. First money: about 210 EUR per month starts here, billed hourly. Stage 1 runs as a test and destroys everything at the end (Sebastian, 2026-09-24): run every gate check, then leave the account empty.

### Task 5: Cloud API access and seed facts

**Files:**
- Create: `infra/terraform.tfvars` (ignored, never committed)

**Interfaces:**
- Produces: `hcloud_token`, `home_cidr` for Task 6. The public IPv4 of the home line.

- [ ] **Step 1: Record the public IP**

```bash
curl -4 ifconfig.me
```

Expected: one IPv4 address. It goes into tfvars as `<ip>/32`.

- [ ] **Step 2: Verify cpx42 price and orderability**

Ask the Hetzner Cloud API (`GET /v1/server_types`) for the price, and probe orderability by creating and deleting one server of the type: the `/v1/datacenters` availability lists are unreliable (2026-09-24: every ARM cax type was listed available yet failed creation with "unsupported location for server type" in fsn1, nbg1 and hel1). Expected: cpx42 at about 69.49 EUR per month net, orderable in fsn1. If the price moved or the type is unorderable, note the new number and update architecture 3 before ordering.

- [ ] **Step 3: Write tfvars**

`infra/terraform.tfvars`:

```hcl
home_cidr   = "<ip>/32"
hcloud_token = "<hcloud API token>"
```

The token lives in `.env.tools` on the seed machine (`HETZNER_KEY`). Copy the value without echoing it and never commit it.

- [ ] **Step 4: Export the token for OpenTofu**

```bash
export TF_VAR_hcloud_token=...
```

Set it in the shell that runs tofu, without echoing the value. tfvars auto-loads anyway; the export is belt and braces.

- [ ] **Step 5: Set a cost alert (Sebastian)**

In the Hetzner Cloud Console, project settings: create a cost alert that emails when the month's spend crosses a low threshold, 20 EUR is right for this cluster. The platform has no hard spend cap; each server alone is capped at its monthly price.

### Task 6: The cluster substrate in OpenTofu

**Files:**
- Edit: `infra/versions.tf`
- Edit: `infra/variables.tf`
- Edit: `infra/terraform.tfvars.example`
- Edit: `infra/docs/seed-bundle.md`
- Edit: `infra/README.md`
- Create: `infra/main.tf`
- Create: `infra/outputs.tf`

**Interfaces:**
- Consumes: `hcloud_token`, `home_cidr` from Task 5, the per-node Talos machine config files that Task 7 generates (`infra/talos/controlplane-<N>.yaml`, referenced as files, generated before the full apply).
- Produces: tofu definitions for three cpx42 servers, a private network, reserved public IPv4 addresses and an outer firewall, plus their IP outputs, used by Tasks 7 and 8.

- [ ] **Step 1: Pin the provider and fix the variables**

In `versions.tf` add the required provider `hetznercloud/hcloud` pinned to 1.69.0 (current release, verified 2026-09-24), and run `tofu init` so the lock file records it. In `variables.tf` replace the two Robot credential variables with one `hcloud_token` (string, sensitive), set `server_type` default to `cpx42`, and add `location` (string, default `fsn1`). Update `terraform.tfvars.example` to match. In `docs/seed-bundle.md` change the Robot API slot to "Hetzner Cloud API token". In `README.md` change "OpenTofu for Hetzner Robot servers" to "OpenTofu for Hetzner Cloud servers".

- [ ] **Step 2: Write main.tf**

`infra/main.tf` (attribute names verified against the provider docs):

```hcl
provider "hcloud" {
  token = var.hcloud_token
}

resource "hcloud_network" "cluster" {
  name     = var.cluster_name
  ip_range = "10.0.0.0/16"
}

resource "hcloud_network_subnet" "nodes" {
  network_id   = hcloud_network.cluster.id
  type         = "cloud"
  network_zone = "eu-central"
  ip_range     = "10.0.1.0/24"
}

resource "hcloud_firewall" "cluster" {
  name = var.cluster_name
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "6443"
    source_ips = [var.home_cidr]
  }
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "50000"
    source_ips = [var.home_cidr]
  }
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
}

resource "hcloud_primary_ip" "node" {
  count       = var.node_count
  name        = "${var.cluster_name}-${count.index}"
  location    = var.location
  type        = "ipv4"
  auto_delete = false
}

resource "hcloud_server" "node" {
  count        = var.node_count
  name         = "${var.cluster_name}-${count.index}"
  server_type  = var.server_type
  location     = var.location
  image        = data.hcloud_image.talos.id
  user_data    = file("${path.module}/talos/controlplane-${count.index}.yaml")
  firewall_ids = [hcloud_firewall.cluster.id]

  public_net {
    ipv4 = hcloud_primary_ip.node[count.index].id
  }
}

resource "hcloud_server_network" "node" {
  count     = var.node_count
  server_id = hcloud_server.node[count.index].id
  subnet_id = hcloud_network_subnet.nodes.id
  ip        = cidrhost(hcloud_network_subnet.nodes.ip_range, 10 + count.index)
}

data "hcloud_image" "talos" {
  with_selector     = "os=talos,version=1.14.1,arch=amd64"
  with_architecture = "x86"
  most_recent       = true
}
```

Four decisions live here. The reserved primary IPv4 addresses exist before the servers do, so Task 7 can generate configs against a known endpoint address, and a node replacement or a full re-seed keeps the same addresses (`auto_delete = false` so a server deletion never releases one). The server-to-network attachment is a separate `hcloud_server_network` resource because the provider's inline `network` block has a detach and reattach bug. The machine config ships as user-data through the metadata service, which keeps the cluster secrets off the public wire: `apply-config --insecure` would send them as plaintext HTTP. The Talos image lookup goes through labels, not name, because snapshot images carry no name; Task 8's snapshot build sets the labels this selector matches, and `with_architecture` spells x86 as `x86`.

- [ ] **Step 3: Write outputs.tf**

`infra/outputs.tf`:

```hcl
output "api_endpoint_ip" {
  description = "Reserved public IPv4 of node 0, the Kubernetes API endpoint"
  value       = hcloud_primary_ip.node[0].ip_address
}

output "node_public_ips" {
  description = "Public IPv4 addresses of the three nodes"
  value       = hcloud_server.node[*].ipv4_address
}

output "node_private_ips" {
  description = "Private network addresses of the three nodes"
  value       = hcloud_server_network.node[*].ip
}
```

Adjust the attribute expressions to what the provider documents.

- [ ] **Step 4: Validate**

```bash
cd ~/repos/ai-software-factory-infra
tofu init
tofu validate
```

Expected: `Success! The configuration is valid.` `tofu plan` and `tofu apply` wait for Task 7's config file and run in Task 8.

- [ ] **Step 5: Check for secrets, then commit**

```bash
git status --porcelain
```

Expected: `versions.tf`, `variables.tf`, `terraform.tfvars.example`, `docs/seed-bundle.md` changed, `main.tf` and `outputs.tf` new, `.terraform.lock.hcl` new or changed. No tfvars, no state file. Then:

```bash
git add versions.tf variables.tf terraform.tfvars.example docs/seed-bundle.md README.md main.tf outputs.tf .terraform.lock.hcl
git commit -m "Hetzner Cloud substrate: three cpx42 servers, private network, firewall"
git push
```

### Task 7: Talos configs and the firewall

**Files:**
- Create: `infra/talos/patches.yaml`
- Create: `infra/talos/node-0.yaml`, `infra/talos/node-1.yaml`, `infra/talos/node-2.yaml`
- Create: `infra/talos/README.md`
- Edit: `infra/.gitignore` (widen `talos/controlplane.yaml` to `talos/controlplane*.yaml`, the per-node generated files embed secrets too)
- Edit: `infra/docs/seed-bundle.md` (tick the Talos secrets slot)

**Interfaces:**
- Consumes: the reserved endpoint IP from Task 6's primary addresses, the private node addresses from Task 6's deterministic `cidrhost` allocation, home CIDR from Task 5.
- Produces: validated per-node machine configs and the rule list Task 8 applies.

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

- [ ] **Step 3: Write the patches**

`infra/talos/patches.yaml` is one multi-document file: an untyped cluster patch pinning etcd to the private network, then 1.14 typed documents (the install section as `UnattendedInstallConfig` with a disk selector that matches the cpx42's 320 GB virtio disk rather than a device name):

```yaml
cluster:
  etcd:
    listenSubnets:
      - 10.0.1.0/24
    advertisedSubnets:
      - 10.0.1.0/24
---
apiVersion: v1alpha1
kind: UnattendedInstallConfig
provisioning:
  diskSelector:
    match: disk.size > 100000000000u
  wipe: true
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
  - subnet: <home-cidr>
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
    # Kubernetes NodePort range; pods reach the local node address
    # unmasqueraded, so the pod subnet needs entry too
    - 30000-32767
  protocol: tcp
ingress:
  - subnet: 10.0.1.0/24
  - subnet: 10.244.0.0/16
---
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: node-mesh-udp
portSelector:
  ports:
    - 8472
    - 6081
    # Cilium wireguard default port; the 1.20 helm chart has no listenPort override
    - 51871
  protocol: udp
ingress:
  - subnet: 10.0.1.0/24
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

Then `infra/talos/node-0.yaml` (node-1 and node-2 take `.11` and `.12`), forcing the kubelet onto the private address that Task 6's `hcloud_server_network` assigns the node:

```yaml
apiVersion: v1alpha1
kind: KubeNodeConfig
nodeIP:
  validSubnets:
    - 10.0.1.10/32
```

The port list, with the reason each is open:

- 6443, 50000: Kubernetes and Talos APIs, from home only.
- 2379, 2380: etcd, node to node.
- 10250: kubelet, node to node.
- 30000-32767: Kubernetes NodePort range, node to node and pod to local node. A pod calling the local node address keeps its pod-CIDR source address, so the rule admits `10.244.0.0/16` next to `10.0.1.0/24`; without it the Cilium suite's NodePort probe times out on the local node only.
- 4240: Cilium health checks, node to node.
- 8472, 6081: Cilium VXLAN and Geneve, node to node, UDP.
- 51871: Cilium wireguard, node to node, UDP. Task 9 turns encryption on. Cilium 1.20 defaults to 51871, not the standard wireguard port 51820, and the 1.20 helm chart exposes no listenPort override, so the rule matches the default (verified: with only 51820 allowed, the wireguard tunnel never handshakes and every cross-node pod packet drops; with 51871 allowed, ping passes at about 1 ms).
- 80, 443: Gateway endpoints for Let's Encrypt HTTP-01 and the public services from Stage 2 on.

Node-to-node traffic rides the private network `10.0.1.0/24`. The etcd patch and the kubelet patches keep etcd and the node addresses on that network: the hcloud platform configures both NICs and the defaults pick the public side. The disk selector matches any disk over 100,000,000,000 bytes (100 GB decimal) because the cpx42's nominal 320 GB disk reports about 300 GiB, and an exact `320GB` match could fail; the match is a CEL expression because 1.14's `DiskSelectorSpec` has only `match`, no `size` key. Fill the home CIDR with the tfvars value verbatim, it already carries the `/32`. Field spellings verified against the Talos 1.14.1 source (2026-09-24, empirically by generation and validation): etcd takes `listenSubnets` and `advertisedSubnets` as lists, `UnattendedInstallConfig` and `KubeNodeConfig` take no `name` key, and kubelet node IP is a `KubeNodeConfig` document, not `KubeletConfig`.

- [ ] **Step 4: Reserve the endpoint IP, then generate the configs**

```bash
cd ~/repos/ai-software-factory-infra
tofu apply -target=hcloud_primary_ip.node
ENDPOINT=$(tofu output -raw api_endpoint_ip)
cd talos
talosctl gen config sf https://$ENDPOINT:6443 \
  --with-secrets secrets.yaml \
  --with-docs=false --with-examples=false \
  --config-patch-control-plane @patches.yaml \
  --output-dir .
for i in 0 1 2; do
  talosctl machineconfig patch controlplane.yaml \
    --patch @node-$i.yaml -o controlplane-$i.yaml
done
```

The targeted apply reserves the three public IPv4 addresses (about 1.50 EUR per month, part of the 65) and reveals the endpoint address the configs need. It is the first write operation against the cloud account, so a token with read-only scope fails here. The stripped generation flags keep the config under the 32 KiB user-data limit. All three nodes run control-plane and workloads, so one base config plus one per-node kubelet patch serves every node: each config ships as that node's user-data at server creation.

- [ ] **Step 5: Validate the configs**

```bash
for i in 0 1 2; do
  talosctl validate --config controlplane-$i.yaml --mode cloud
done
```

Expected: `valid` for all three. `cloud` is the mode the hcloud platform reports for itself. Fix and revalidate until they are.

- [ ] **Step 6: Document and commit**

`infra/talos/README.md`:

```markdown
# Talos configs

secrets.yaml is generated per cluster and lives in the seed bundle,
never here. The generated controlplane-<N>.yaml files, worker.yaml and
talosconfig embed the cluster secrets too, so they are gitignored and
regenerated on demand from secrets.yaml, patches.yaml and node-<N>.yaml
with the commands in docs/plans/2026-09-24-build-plan.md Task 7 Step 4.
```

```bash
git add patches.yaml node-0.yaml node-1.yaml node-2.yaml README.md ../.gitignore ../docs/seed-bundle.md
git commit -m "Talos patches: nftables ingress, private etcd and kubelet node IP"
git push
```

Commit the patches, the README, the widened gitignore and the seed-bundle tick. The generated configs and talosconfig stay untracked and out of Git, they embed the cluster secrets.

### Task 8: Create the nodes and form the cluster

**Files:** none in Git. This task spends money: the throwaway cx23 in Step 1 costs about 0.01 EUR once, the three cpx42 cost about 0.29 EUR per hour together. Tell Sebastian the moment the servers are created.

**Interfaces:**
- Consumes: the substrate from Task 6, the machine config from Task 7.
- Produces: a running Talos cluster and a kubeconfig on the seed machine.

Rescue paths, read first: nodes are disposable. A broken node is `tofu destroy`/`tofu apply` away from a clean replacement, and Stage 3 re-seeds the whole cluster anyway. If the seed machine is locked out by a mis-typed home CIDR, fix the cloud firewall in the Hetzner console first: it is editable without node access and mirrors the same allowlist.

- [ ] **Step 1: Build the Talos snapshot**

Hetzner Cloud has no Talos machine image to create servers from, only a public ISO that attaches after creation and has no tofu-clean path. Build one instead: boot a throwaway cx23 into the rescue system, write the Talos factory image to its disk, snapshot it. The nodes then boot that snapshot, x86 to x86. The token comes from `.env.tools`, never echoed.

```bash
set -a; source ~/repos/ai-software-factory/.env.tools; set +a
HC="Authorization: Bearer $HETZNER_KEY"
ssh-keygen -t ed25519 -N '' -f /tmp/snap-key
KEY=$(curl -s -H "$HC" -H "Content-Type: application/json" -X POST \
  https://api.hetzner.cloud/v1/ssh_keys \
  -d "{\"name\":\"snapshot-build\",\"public_key\":\"$(cat /tmp/snap-key.pub)\"}" | jq -r .ssh_key.id)
FW=$(curl -s -H "$HC" -H "Content-Type: application/json" -X POST \
  https://api.hetzner.cloud/v1/firewalls \
  -d "{\"name\":\"snapshot-build\",\"rules\":[{\"direction\":\"in\",\"protocol\":\"tcp\",\"port\":\"22\",\"source_ips\":[\"<home-cidr>\"]}]}" | jq -r .firewall.id)
SRV=$(curl -s -H "$HC" -H "Content-Type: application/json" -X POST \
  https://api.hetzner.cloud/v1/servers \
  -d "{\"name\":\"snapshot-build\",\"server_type\":\"cx23\",\"image\":\"ubuntu-24.04\",\"location\":\"fsn1\",\"ssh_keys\":[$KEY],\"firewalls\":[{\"firewall\":$FW}],\"public_net\":{\"enable_ipv4\":true,\"enable_ipv6\":false}}" | jq -r .server.id)
if [ -z "$KEY" ] || [ -z "$FW" ] || [ -z "$SRV" ]; then
  echo "create rejected (key=$KEY fw=$FW srv=$SRV)"
  [ -n "$KEY" ] && curl -s -H "$HC" -X DELETE https://api.hetzner.cloud/v1/ssh_keys/$KEY
  [ -n "$FW" ] && curl -s -H "$HC" -X DELETE https://api.hetzner.cloud/v1/firewalls/$FW
  exit 1
fi
curl -s -H "$HC" -X POST https://api.hetzner.cloud/v1/servers/$SRV/actions/enable_rescue -d "{\"ssh_keys\":[$KEY]}" >/dev/null
curl -s -H "$HC" -X POST https://api.hetzner.cloud/v1/servers/$SRV/actions/reset >/dev/null
IP=$(curl -s -H "$HC" https://api.hetzner.cloud/v1/servers/$SRV | jq -r .server.public_net.ipv4.ip)
```

`enable_rescue` fails silently (returns a null action) while the server is still `initializing`, and rescue boot needs the reset after the enable. Poll `GET /v1/servers/$SRV` until `status` is `running`, then run the two actions in the order shown (`/actions/reset`, not `power_reset`, which is not a route). Firewall names are unique per project: a leftover `snapshot-build` firewall from an earlier run makes the create fail with a null id, which the guard above turns into a clean exit instead of a null id chained into the server create. The teardown prints each DELETE's status code and waits for the server to be gone before deleting the firewall, so no stray survives a run that reports success.

Wait about a minute for the rescue boot, then write the image and power off. The shutdown before the snapshot is the order the Talos guide uses, for a consistent disk:

```bash
ssh -i /tmp/snap-key -o StrictHostKeyChecking=no root@$IP \
  'wget -qO /tmp/talos.raw.xz https://factory.talos.dev/image/376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba/v1.14.1/hcloud-amd64.raw.xz && xz -d -c /tmp/talos.raw.xz | dd of=/dev/sda && sync && shutdown -h now'
until [ "$(curl -s -H "$HC" https://api.hetzner.cloud/v1/servers/$SRV | jq -r .server.status)" = off ]; do sleep 5; done
curl -s -H "$HC" -H "Content-Type: application/json" -X POST \
  https://api.hetzner.cloud/v1/servers/$SRV/actions/create_image \
  -d '{"description":"talos-1.14.1-amd64","type":"snapshot","labels":{"os":"talos","version":"1.14.1","arch":"amd64"}}' >/dev/null
```

Wait for the image to report `available` (GET `/v1/images?type=snapshot`, the one labelled `os=talos`). If the API rejects labels on create, set them with PATCH on the image, the selector lookup in Task 6 depends on them. Then delete the throwaway pieces:

```bash
curl -s -o /dev/null -w 'server delete: %{http_code}\n' -H "$HC" -X DELETE https://api.hetzner.cloud/v1/servers/$SRV
until [ "$(curl -s -H "$HC" https://api.hetzner.cloud/v1/servers/$SRV | jq -r '.error.code // .server.status')" = not_found ]; do sleep 5; done
curl -s -o /dev/null -w 'firewall delete: %{http_code}\n' -H "$HC" -X DELETE https://api.hetzner.cloud/v1/firewalls/$FW
curl -s -o /dev/null -w 'key delete: %{http_code}\n' -H "$HC" -X DELETE https://api.hetzner.cloud/v1/ssh_keys/$KEY
rm -f /tmp/snap-key /tmp/snap-key.pub
```

- [ ] **Step 2: Create the servers**

```bash
cd ~/repos/ai-software-factory-infra
tofu plan
tofu apply
```

Expected: three servers created from the Talos image, each booting straight into Talos with the machine config from user-data. `tofu output node_public_ips` and `node_private_ips` print the addresses.

If the project hits the shared-vCPU core limit (the default allows 16 shared cores; three cpx42 need 24), the apply fails for the last server with `resource_limit_exceeded` on every retry. Sebastian can raise the limit in the Cloud Console under Limits. Stage 1 may proceed on two nodes: etcd keeps quorum at 2 of 3, and the pending third server joins later with one `tofu apply` once the limit rises. When the attachments of the blocked server are created by hand (API `attach_to_network` plus `tofu import`), patch the imported state's `subnet_id` with `tofu state pull`/edit/`tofu state push -force`; the import leaves it null and any plan then wants to replace the attachment.

- [ ] **Step 3: Wait for the Talos API on each node**

```bash
talosctl --nodes <node0-ip> status
```

Repeat per node. Expected: each node answers with its Talos version. The first boot installs Talos to disk and reboots once, give it a few minutes.

- [ ] **Step 4: Bootstrap etcd on the first node**

```bash
talosctl bootstrap --nodes <node0-ip> --endpoints <node0-ip>
```

- [ ] **Step 5: Install kubectl and the Cilium CLI if missing**

The seed machine is x86; the node architecture does not change these downloads. The `releases/latest/bin/...` download URL 404s, the published checksum file has no parseable SHA256 line, and sudo needs a password on the seed machine, so the cilium CLI comes from the GitHub API asset URL into `~/.local/bin` (on PATH).

```bash
command -v kubectl >/dev/null || {
  curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
  sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
}
command -v cilium >/dev/null || {
  U=$(curl -s https://api.github.com/repos/cilium/cilium-cli/releases/latest \
    | jq -r '.assets[] | select(.name=="cilium-linux-amd64.tar.gz").browser_download_url')
  curl -L -o /tmp/cilium.tar.gz "$U"
  tar xzf /tmp/cilium.tar.gz -C ~/.local/bin cilium
  rm /tmp/cilium.tar.gz
}
```

- [ ] **Step 6: Get the kubeconfig**

```bash
talosctl kubeconfig -n <node0-ip> -e <node0-ip> ~/.kube/config
chmod 600 ~/.kube/config
kubectl get nodes
```

The positional argument is a file path, not a cluster name: `talosctl kubeconfig sf` writes a file named `sf` into the current directory. Wait for the API server first (`curl -k https://<node0-ip>:6443/readyz` answers 200); before it is up the command fails silently.

Expected: the nodes, status NotReady (no CNI yet), roles control-plane+worker.

### Task 9: Cilium and the exit gate

**Files:** none in Git.

**Interfaces:**
- Consumes: the cluster from Task 8.
- Produces: a networked cluster, ready for Stage 2.

- [ ] **Step 1: Install Cilium**

Flannel must not run: the config generator always emits a KubeFlannelCNIConfig document, `cluster.network.cni.name: none` does not remove it, and the document makes Talos run flannel. The generator also registers the control-plane NoSchedule taint, which blocks every workload on a control-plane-only cluster. The strip in the Task 7 README removes both after generation (config patches cannot delete these fields; the typed patcher ignores null keys), and `talosctl apply-config` per node drops the live taint with it. If the flannel DaemonSet still exists at this point, delete it:

```bash
kubectl -n kube-system delete ds/kube-flannel
```

Talos does not let workloads load kernel modules, so Cilium runs with the capability lists from the official Talos guide (no SYS_MODULE) and cgroup automount off. cilium-cli 0.20.1 has no `--encryption` flag; wireguard encryption goes through `--set`:

```bash
cilium install --version 1.20.0 \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=false \
  --set 'securityContext.capabilities.ciliumAgent={CHOWN,KILL,NET_ADMIN,NET_RAW,IPC_LOCK,SYS_ADMIN,SYS_RESOURCE,DAC_OVERRIDE,FOWNER,SETGID,SETUID}' \
  --set 'securityContext.capabilities.cleanCiliumState={NET_ADMIN,SYS_ADMIN,SYS_RESOURCE}' \
  --set cgroup.autoMount.enabled=false \
  --set cgroup.hostRoot=/sys/fs/cgroup \
  --set encryption.enabled=true \
  --set encryption.type=wireguard
cilium status --wait
```

With the default capabilities the agents stay Pending: the `clean-cilium-state` init container dies with `unable to apply caps: can't apply capabilities: operation not permitted`. If a release is already installed with wrong values, the same sets go through `cilium upgrade --version 1.20.0 ...`; it merges the last release's values by default. That merge does NOT cover `k8sServiceHost`/`k8sServicePort`: cilium-cli auto-detects the cluster endpoint and overrides them with the public `138.199.224.193:6443` on every upgrade. Only the endpoint's own node can reach that address, so agents on the other nodes crash in the `config` init (exit 255, dial timeout) and the operator follows. Always pass the complete flag set to `cilium upgrade`, never a partial one.

Expected: all agents healthy on the nodes.

- [ ] **Step 2: Run the connectivity test**

The CLI creates its `cilium-test-*` namespaces without PodSecurity labels, and the Talos API server then enforces baseline on them by default; the CLI's own pods add NET_RAW, which baseline forbids. Relabel before the suite, or every deployment fails with `Error creating: ... violates PodSecurity "baseline:latest"`. Relabel after the namespaces exist; a `--force-deploy` run recreates them, and recreated namespaces are unlabeled again:

```bash
for ns in $(kubectl get ns -o name | grep cilium-test); do
  kubectl label $ns pod-security.kubernetes.io/enforce=privileged --overwrite
done
cilium connectivity test
```

Expected: all checks pass. If the node-mesh UDP rule is wrong, this fails here and the fix goes back to Task 7's patch, re-applied with `talosctl apply-config`.

- [ ] **Step 3: Gate check, nodes**

```bash
kubectl get nodes
```

Expected: all cluster nodes Ready, roles control-plane+worker. On the 2-of-3 limit run this is two nodes.

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

Note the measured monthly cost if it moved from 69.49 EUR per node. Raise the standing shutdown question: the meter now runs at about 210 EUR per month, and `tofu destroy` stops it.

- [ ] **Step 7: Destroy the cluster**

Sebastian's instruction (2026-09-24): run Stage 1 as a test and leave nothing billing. Destroy what tofu manages with `tofu destroy`, then delete the Talos snapshot from Task 8 Step 1 (`DELETE /v1/images/<id>`), which lives outside tofu. Verify afterwards: zero servers, zero primary IPs, zero networks, zero images in the project. The stage report names any gate check that could not run while the cluster lived.

**Stage 1 exit test:** all six gate checks above pass. The from-outside check in Step 5 needs Sebastian during the live window; if he is unavailable, defer it and name it in the stage report.

---

## Stage 2: Ranch

Goal: the platform services run on the persistent cluster, deployed by Flux from Forgejo, with TLS.

The cluster PERSISTS through this stage (ruling 38): about 0.29 EUR per hour, about 7 EUR per day, the 20 EUR cost alert from ruling 37 stands. Hetzner Object Storage adds 6.49 EUR per month from the first bucket (Task 12), storage and traffic included up to 1 TB each. Stage 3 is the destroy and rebuild drill, nothing here is torn down.

Research basis: `.superpowers/sdd/2026-09-24-build-plan/research-g2-{edge,storage,git,platform}.md`, web verified 2026-09-25. No Forgejo dump exists to restore, so the restore path stays a Stage 3 concern.

Sebastian's queued steps. Each blocks the named task, not the plan:

1. S3 access keys from the Hetzner Console (Object Storage, then S3 Credentials; the secret shows once and cannot be fetched again). Record in the seed bundle, append `HETZNER_S3_ACCESS_KEY_ID` and `HETZNER_S3_SECRET_ACCESS_KEY` to `.env.tools`. Blocks Task 12.
2. Namecheap A records for `git.aisoftwarefactory.world` to the three node public IPv4 addresses from Task 10, TTL 300 or lower. Blocks the certificate in Task 13.
3. DeepSeek API key, appended to `.env.tools` as `DEEPSEEK_API_KEY`. Blocks the Task 19 smoke call.

Names used throughout, fixed here so tasks stay consistent: namespaces `platform` (CNPG, cert-manager, Temporal, OpenBao, LiteLLM, SigNoz), `forgejo` (Forgejo and its runner), `local-path-storage`, `cnpg-system`. CNPG Cluster `sf-cluster` in `platform`, services `sf-cluster-rw`, `sf-cluster-ro`, `sf-cluster-r`. Forgejo organisation `sf` holding both repositories. Buckets `aisoftwarefactory-forgejo` (Forgejo object data) and `aisoftwarefactory-backups` (prefixes `cnpg/`, `forgejo-dumps/`, `openbao/`). S3 endpoint `https://fsn1.your-objectstorage.com`, region string `fsn1`.

Cilium, Talos and the tofu substrate stay OUTSIDE Flux, hand-managed from the seed machine: Cilium must run before any Flux pod schedules, so it cannot be a Flux payload. Its full install command lives in Task 10 and in the infra README. Everything above that line (operators, charts, manifests) is Flux-managed from Task 15 on.

Shell blocks in this stage run from the infra repo root, `~/repos/ai-software-factory-infra`; the `infra/` prefix in Files blocks is the plan-wide shorthand for that repo.

Stage 2 review focus, the failure modes most likely to bite:

1. A secret value lands in Git through a values file or a manifest. Every task below checks `git status --porcelain` before its commit, secrets are created imperatively with kubectl, and the Files blocks name only secret-free paths.
2. The first certificate never issues because DNS or the port 80 listener is missing when the Certificate is applied. Task 13 applies the Gateway and routes before the Certificate and gates on Sebastian's A records, the port 80 listener works from the start and the solver route's exact path match beats the redirect rule.
3. A password with `$`, `/` or `@` breaks the LiteLLM database URL, which the chart composes from secret parts. All generated database passwords are `openssl rand -hex 24`, URL-safe by construction.
4. The runner pod is rejected because PodSecurity baseline forbids the privileged dind container. Task 16 labels namespace `forgejo` enforce=privileged before the install.
5. Flux adoption reverts hand-applied state instead of adopting it. Task 15 commits the same manifests that were hand-applied, HelmReleases match release name and namespace exactly, and the verification step greps the Flux events for field reverts.

### Task 10: Cluster bring-up, kube-proxy-free

**Files:** Modify: `infra/talos/patches.yaml` (two new documents), `infra/talos/README.md`. Controller-run: machine and money ops, not subagent work. The three cpx42 cost about 0.29 EUR per hour, tell Sebastian when they are created.

**Interfaces:**
- Consumes: the substrate from Task 6, the Stage 1 `secrets.yaml` (reused as-is, same cluster identity, the existing talosconfig stays valid), the twice-validated Stage 1 bring-up procedure.
- Produces: a kube-proxy-free cluster with Gateway API ready and a 200 GB user volume per node mounted at `/var/mnt/local-path-provisioner`. Node public IPv4 addresses for the DNS step.

Why the change: Cilium 1.20 hard-disables the Gateway API controller when `kubeProxyReplacement=false` (operator source `operator/pkg/gateway-api/cell.go` at v1.20.0). A fresh cluster installs kube-proxy-free from the start, so no live migration and no wedged Envoy listeners. KubePrism serves the Kubernetes API on `localhost:7445` on every node by default, that is the service host Cilium points at. Envoy binds 80 and 443 on the host network, which needs NET_BIND_SERVICE.

The UserVolumeConfig goes into the committed patch set before the nodes install, because user volumes are carved at install time from the matched disk's free space. The cpx42 has one 320 GB virtio disk, so the selector matches by size exactly like the install document. `disk.transport == 'nvme'` matches nothing (virtio disk) and `!system_disk` excludes the only disk there is. EPHEMERAL must be capped too: with no `maxSize` it grows to fill the whole disk at install, and Talos volumes grow only and never shrink, so the user volume then fails with "not enough space" on every node (found live in Stage 2; the fix re-laid the disks through server replacement, since hcloud user_data is immutable and `talosctl reset` would re-read the old user_data and re-grow EPHEMERAL).

- [ ] **Step 1: Commit the machine-config documents**

Append to `talos/patches.yaml`:

```yaml
---
apiVersion: v1alpha1
kind: KubeProxyConfig
enabled: false
---
apiVersion: v1alpha1
kind: VolumeConfig
name: EPHEMERAL
provisioning:
  diskSelector:
    match: disk.size > 100000000000u
  maxSize: 100GB
---
apiVersion: v1alpha1
kind: UserVolumeConfig
name: local-path-provisioner
provisioning:
  diskSelector:
    match: disk.size > 100000000000u
  minSize: 200GB
  maxSize: 200GB
```

Add one paragraph to `talos/README.md`: kube-proxy is disabled at generation time so Cilium runs kube-proxy-free (`KubeProxyConfig` document), and each node caps EPHEMERAL at 100 GB (`VolumeConfig` document) and carves a 200 GB user volume at install time (`UserVolumeConfig` document, auto-mounted at `/var/mnt/local-path-provisioner`, Task 11 consumes it).

Commit: `Kube-proxy off and a 200 GB user volume per node`.

- [ ] **Step 2: Build the Talos snapshot**

Task 8 Step 1 verbatim: throwaway cx23, rescue boot, dd the factory image `376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba/v1.14.1/hcloud-amd64.raw.xz`, snapshot with labels `os=talos,version=1.14.1,arch=amd64`, delete the throwaway pieces. The Stage 1 snapshots were deleted at teardown, this builds a new one.

- [ ] **Step 3: Reserve the primary IPs**

```bash
cd ~/repos/ai-software-factory-infra
tofu apply -target=hcloud_primary_ip.node
tofu output -raw api_endpoint_ip
```

Record the endpoint IP, the regeneration command in the README reads it.

- [ ] **Step 4: Regenerate, strip, validate**

Run the regeneration block from `talos/README.md` (gen config with `--with-secrets secrets.yaml --config-patch-control-plane @patches.yaml`, per-node `node-<N>.yaml` patches, then the python strip of the KubeFlannelCNIConfig document and the taints block, then `talosctl validate --mode cloud` for all three).

- [ ] **Step 5: Create the servers**

```bash
tofu apply
```

Expected: 9 resources applied, three servers from the snapshot, `tofu output node_public_ips` and `node_private_ips` print the addresses. Tell Sebastian the meter is running the moment this succeeds.

- [ ] **Step 6: Bootstrap and kubeconfig**

Per Task 8 Steps 3 to 6: wait for the Talos API on each node, `talosctl bootstrap` on node 0, `curl -k https://<node0>:6443/readyz` answers 200, `talosctl kubeconfig`, `chmod 600 ~/.kube/config`.

- [ ] **Step 7: Install Cilium kube-proxy-free**

```bash
cilium install --version 1.20.0 \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=localhost \
  --set k8sServicePort=7445 \
  --set 'securityContext.capabilities.ciliumAgent={CHOWN,KILL,NET_ADMIN,NET_RAW,IPC_LOCK,SYS_ADMIN,SYS_RESOURCE,DAC_OVERRIDE,FOWNER,SETGID,SETUID}' \
  --set 'securityContext.capabilities.cleanCiliumState={NET_ADMIN,SYS_ADMIN,SYS_RESOURCE}' \
  --set cgroup.autoMount.enabled=false \
  --set cgroup.hostRoot=/sys/fs/cgroup \
  --set encryption.enabled=true \
  --set encryption.type=wireguard \
  --set gatewayAPI.enabled=true \
  --set gatewayAPI.hostNetwork.enabled=true \
  --set envoy.securityContext.capabilities.keepCapNetBindService=true \
  --set 'envoy.securityContext.capabilities.envoy={NET_ADMIN,SYS_ADMIN,NET_BIND_SERVICE}'
cilium status --wait
```

Expected: cilium 3/3, cilium-envoy 3/3, operator 1/1. Then verify the two properties this task exists for:

```bash
kubectl -n kube-system get ds | grep -c kube-proxy || echo "no kube-proxy"
kubectl get gatewayclass
```

Expected: no kube-proxy DaemonSet exists, and a GatewayClass named `cilium` is present (the chart auto-creates it).

- [ ] **Step 8: Connectivity suite**

Pre-create the labelled namespaces as in Stage 1 (empty `cilium-test-*` namespaces with `pod-security.kubernetes.io/enforce=privileged`, no `--force-deploy`), run `cilium connectivity test`. Expected: all tests pass, wireguard active on UDP 51871.

- [ ] **Step 9: Gate and handoff**

```bash
kubectl get nodes
curl -k -m 5 https://<node0-ip>:6443
```

Expected: 3 nodes Ready control-plane, API reachable from home. Print the three public IPv4 addresses and queue Sebastian's A-record step against them.

### Task 11: Local-path provisioner

**Files:** Create: `infra/k8s/platform/local-path/kustomization.yaml`.

**Interfaces:**
- Consumes: the user volume at `/var/mnt/local-path-provisioner` from Task 10.
- Produces: StorageClass `local-path` as cluster default. Every later PVC (CNPG, Forgejo, OpenBao, ClickHouse) names it or falls through to it.

- [ ] **Step 1: Write the kustomization**

`infra/k8s/platform/local-path/kustomization.yaml`, pinned to the version the Talos guide uses:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- github.com/rancher/local-path-provisioner/deploy?ref=v0.0.31
patches:
- patch: |-
    kind: ConfigMap
    apiVersion: v1
    metadata:
      name: local-path-config
      namespace: local-path-storage
    data:
      config.json: |-
        {
                "nodePathMap":[
                {
                        "node":"DEFAULT_PATH_FOR_NON_LISTED_NODES",
                        "paths":["/var/mnt/local-path-provisioner"]
                }
                ]
        }
- patch: |-
    apiVersion: storage.k8s.io/v1
    kind: StorageClass
    metadata:
      name: local-path
      annotations:
        storageclass.kubernetes.io/is-default-class: "true"
- patch: |-
    apiVersion: v1
    kind: Namespace
    metadata:
      name: local-path-storage
      labels:
        pod-security.kubernetes.io/enforce: privileged
```

The privileged label on the namespace is required: the helper pods are privileged and Talos namespaces default to baseline enforcement.

- [ ] **Step 2: Apply and commit**

```bash
kubectl apply -k k8s/platform/local-path
kubectl -n local-path-storage rollout status deploy/local-path-provisioner
git status --porcelain
git add k8s/platform/local-path/kustomization.yaml
git commit -m "local-path provisioner on the Talos user volumes"
```

Expected: deployment ready. Check the StorageClass: `kubectl get sc` shows `local-path (default)`.

- [ ] **Step 3: Prove a volume binds**

```bash
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata: {name: lp-test, namespace: default}
spec: {accessModes: [ReadWriteOnce], resources: {requests: {storage: 1Gi}}}
EOF
kubectl -n default wait --for=jsonpath='{.status.phase}'=Bound pvc/lp-test --timeout=120s
kubectl -n default delete pvc lp-test
```

Expected: Bound within the timeout (local-path binds at pod attach, `kubectl wait` on phase may need a writer pod first: if it stays Pending, attach a one-off pod mounting the claim, confirm Running, then delete both).

### Task 12: Object Storage and CloudNativePG

**Files:** Create: `infra/k8s/platform/cnpg/operator.yaml` (vendored), `infra/k8s/platform/cnpg/cluster.yaml`, `infra/k8s/platform/cnpg/databases.yaml`, `infra/k8s/platform/cnpg/backup.yaml`. Modify: `infra/docs/seed-bundle.md` (slots). Money: the first bucket starts the 6.49 EUR per month Object Storage base price.

**Interfaces:**
- Consumes: Sebastian's S3 access keys, StorageClass `local-path`.
- Produces: Cluster `sf-cluster` (3 instances, service `sf-cluster-rw.platform.svc.cluster.local:5432`), roles `forgejo`, `litellm`, `temporal` with passwords in secrets `pg-forgejo`, `pg-litellm`, `pg-temporal` (namespace `platform`), databases `forgejo`, `litellm`, `temporal`, `temporal_visibility`, nightly base backups plus WAL to `s3://aisoftwarefactory-backups/cnpg/sf-cluster`.

- [ ] **Step 1: Install the AWS CLI v2**

```bash
command -v aws >/dev/null || {
  curl -sLo /tmp/awscliv2.zip https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip
  unzip -q /tmp/awscliv2.zip -d /tmp/awscli
  /tmp/awscli/aws/install -i ~/.local/aws-cli -b ~/.local/bin
  rm -rf /tmp/awscliv2.zip /tmp/awscli
}
```

No sudo on the seed machine, the user-local install path avoids it. `aws --version` answers 2.x.

- [ ] **Step 2: Sebastian's keys, then buckets**

BLOCKED until the S3 keys are in `.env.tools`. Configure once:

```bash
set -a; source ~/repos/ai-software-factory/.env.tools; set +a
mkdir -p ~/.aws
cat > ~/.aws/config <<'EOF'
[default]
region = fsn1
services = hetzner

[services hetzner]
s3 =
    endpoint_url = https://fsn1.your-objectstorage.com
EOF
cat > ~/.aws/credentials <<EOF
[default]
aws_access_key_id = $HETZNER_S3_ACCESS_KEY_ID
aws_secret_access_key = $HETZNER_S3_SECRET_ACCESS_KEY
EOF
chmod 600 ~/.aws/credentials
aws s3 ls
```

Expected: an empty listing, no error (SigV4 against fsn1 works). Then create both buckets and the dump expiry:

```bash
aws s3 mb s3://aisoftwarefactory-forgejo --region fsn1
aws s3 mb s3://aisoftwarefactory-backups --region fsn1
cat > /tmp/lifecycle.json <<'EOF'
{"Rules":[{"ID":"expire-forgejo-dumps","Filter":{"Prefix":"forgejo-dumps/"},"Status":"Enabled","Expiration":{"Days":14}}]}
EOF
aws s3api put-bucket-lifecycle-configuration \
  --bucket aisoftwarefactory-backups --lifecycle-configuration file:///tmp/lifecycle.json
```

Bucket names are immutable and globally unique across Hetzner customers. If a name is taken, stop and pick a new one with Sebastian, then use it consistently from here on.

- [ ] **Step 3: Install the CNPG operator (hand-applied, adopted by Flux in Task 15)**

```bash
mkdir -p k8s/platform/cnpg
curl -sLo k8s/platform/cnpg/operator.yaml \
  https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.30/releases/cnpg-1.30.1.yaml
kubectl apply --server-side -f k8s/platform/cnpg/operator.yaml
kubectl -n cnpg-system rollout status deploy/cnpg-controller-manager --timeout=300s
```

Expected: deployment ready. `--server-side` is required, the CRDs are too large for client-side apply.

- [ ] **Step 4: Create the secrets (imperative, never in Git)**

All passwords `openssl rand -hex 24`, URL-safe. Namespace `platform` holds the CNPG-facing secrets:

```bash
set -a; source ~/repos/ai-software-factory/.env.tools; set +a
kubectl create namespace platform
SUPER=$(openssl rand -hex 24); APP=$(openssl rand -hex 24)
FORGEJO=$(openssl rand -hex 24); LITELLM=$(openssl rand -hex 24); TEMPORAL=$(openssl rand -hex 24)
kubectl -n platform create secret generic sf-cluster-superuser --type=kubernetes.io/basic-auth \
  --from-literal=username=postgres --from-literal=password=$SUPER
kubectl -n platform create secret generic app-secret --type=kubernetes.io/basic-auth \
  --from-literal=username=app --from-literal=password=$APP
kubectl -n platform create secret generic pg-forgejo --type=kubernetes.io/basic-auth \
  --from-literal=username=forgejo --from-literal=password=$FORGEJO
kubectl -n platform label secret pg-forgejo cnpg.io/reload=true
kubectl -n platform create secret generic pg-litellm --type=kubernetes.io/basic-auth \
  --from-literal=username=litellm --from-literal=password=$LITELLM
kubectl -n platform label secret pg-litellm cnpg.io/reload=true
kubectl -n platform create secret generic pg-temporal --type=kubernetes.io/basic-auth \
  --from-literal=username=temporal --from-literal=password=$TEMPORAL
kubectl -n platform label secret pg-temporal cnpg.io/reload=true
kubectl -n platform create secret generic cnpg-s3-creds \
  --from-literal=ACCESS_KEY_ID=$HETZNER_S3_ACCESS_KEY_ID --from-literal=ACCESS_SECRET_KEY=$HETZNER_S3_SECRET_ACCESS_KEY
```

Print all five passwords for the seed bundle (Sebastian records them), tick the S3 slot.

- [ ] **Step 5: Apply the Cluster**

`infra/k8s/platform/cnpg/cluster.yaml`:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: sf-cluster
  namespace: platform
spec:
  instances: 3
  superuserSecret:
    name: sf-cluster-superuser
  enableSuperuserAccess: true
  storage:
    storageClass: local-path
    size: 20Gi
  affinity:
    enablePodAntiAffinity: true
    topologyKey: kubernetes.io/hostname
    podAntiAffinityType: required
  bootstrap:
    initdb:
      database: app
      owner: app
      secret:
        name: app-secret
  managed:
    roles:
      - name: forgejo
        ensure: present
        login: true
        superuser: false
        passwordSecret:
          name: pg-forgejo
      - name: litellm
        ensure: present
        login: true
        superuser: false
        passwordSecret:
          name: pg-litellm
      - name: temporal
        ensure: present
        login: true
        superuser: false
        passwordSecret:
          name: pg-temporal
  backup:
    barmanObjectStore:
      destinationPath: s3://aisoftwarefactory-backups/cnpg/sf-cluster
      endpointURL: https://fsn1.your-objectstorage.com
      s3Credentials:
        accessKeyId:
          name: cnpg-s3-creds
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: cnpg-s3-creds
          key: ACCESS_SECRET_KEY
      wal:
        compression: gzip
        maxParallel: 4
    retentionPolicy: 30d
```

```bash
kubectl apply -f k8s/platform/cnpg/cluster.yaml
kubectl -n platform wait --for=condition=Ready cluster/sf-cluster --timeout=900s
```

Expected: three instances ready, one per node (hard anti-affinity). The native barmanObjectStore method is deprecated since v1.26 but remains the default and fully functional in v1.30, one moving part less than the plugin. If barman logs show `x-amz-content-sha256` errors against Hetzner, add `spec.env` `AWS_REQUEST_CHECKSUM_CALCULATION=when_required` and `AWS_RESPONSE_CHECKSUM_VALIDATION=when_required` to the Cluster and re-apply.

- [ ] **Step 6: Databases and the backup schedule**

`infra/k8s/platform/cnpg/databases.yaml`:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Database
metadata: {name: forgejo-db, namespace: platform}
spec: {name: forgejo, owner: forgejo, cluster: {name: sf-cluster}}
---
apiVersion: postgresql.cnpg.io/v1
kind: Database
metadata: {name: litellm-db, namespace: platform}
spec: {name: litellm, owner: litellm, cluster: {name: sf-cluster}}
---
apiVersion: postgresql.cnpg.io/v1
kind: Database
metadata: {name: temporal-db, namespace: platform}
spec: {name: temporal, owner: temporal, cluster: {name: sf-cluster}}
---
apiVersion: postgresql.cnpg.io/v1
kind: Database
metadata: {name: temporal-visibility-db, namespace: platform}
spec: {name: temporal_visibility, owner: temporal, cluster: {name: sf-cluster}}
```

`infra/k8s/platform/cnpg/backup.yaml` (six-field cron with seconds, daily 02:00 UTC):

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata: {name: sf-cluster-daily, namespace: platform}
spec:
  schedule: "0 0 2 * * *"
  backupOwnerReference: self
  immediate: true
  cluster:
    name: sf-cluster
```

```bash
kubectl apply -f k8s/platform/cnpg/databases.yaml -f k8s/platform/cnpg/backup.yaml
```

Expected: each Database reports `status.applied: true` within a minute, and the immediate backup reaches `phase: completed`:

```bash
kubectl -n platform get databases.postgresql.cnpg.io
kubectl -n platform get backups.postgresql.cnpg.io
```

- [ ] **Step 7: Seed-bundle slots and commit**

Add unchecked slots to `infra/docs/seed-bundle.md`: `CNPG passwords (superuser, app, forgejo, litellm, temporal)`, and tick the S3 keys slot. Commit the manifests and the checklist, never a secret:

```bash
git status --porcelain
git add k8s/platform/cnpg docs/seed-bundle.md
git commit -m "CNPG cluster, service databases, S3 backups"
```

### Task 13: TLS edge

**Files:** Create: `infra/k8s/platform/gateway-api/crds.yaml` (vendored), `infra/k8s/platform/gateway-api/edge.yaml`.

**Interfaces:**
- Consumes: the Cilium Gateway API support from Task 10, the `web-from-world` firewall rule (80 and 443 from anywhere, in the committed patch set since Stage 1).
- Produces: `https://git.aisoftwarefactory.world` with a Let's Encrypt certificate, secret `git-aisoftwarefactory-world-tls` in namespace `forgejo`, Gateway `edge-gateway` with an HTTP to HTTPS redirect. The exit route for every later HTTPS need.

- [ ] **Step 1: Gateway API CRDs first**

```bash
mkdir -p k8s/platform/gateway-api
curl -sLo k8s/platform/gateway-api/crds.yaml \
  https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.6.1/standard-install.yaml
kubectl apply --server-side -f k8s/platform/gateway-api/crds.yaml
```

CRDs before cert-manager starts: cert-manager checks for them at startup and disables the Gateway API support otherwise.

- [ ] **Step 2: Install helm (if missing) and cert-manager**

```bash
command -v helm >/dev/null || {
  curl -sLo /tmp/helm.tgz https://get.helm.sh/helm-v3.18.4-linux-amd64.tar.gz
  tar xzf /tmp/helm.tgz -C ~/.local/bin --strip-components=1 linux-amd64/helm
  rm /tmp/helm.tgz
}
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager --version v1.21.2 \
  --namespace platform --create-namespace \
  --set crds.enabled=true --set config.gatewayAPI.enabled=true
kubectl -n platform wait --for=condition=Available deploy --all --timeout=300s
```

Namespace `platform` per the architecture's namespace layout. `config.gatewayAPI.enabled=true` switches on the Gateway HTTP-01 solver, off by default. The two `--set` flags are exactly the values the Task 15 HelmRelease repeats for adoption.

- [ ] **Step 3: Gateway, routes, issuer, certificate**

```bash
kubectl create namespace forgejo
```

Then `infra/k8s/platform/gateway-api/edge.yaml`:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: edge-gateway
  namespace: forgejo
spec:
  gatewayClassName: cilium
  listeners:
    - name: http
      protocol: HTTP
      port: 80
      allowedRoutes:
        namespaces:
          from: Same
    - name: https
      protocol: HTTPS
      port: 443
      hostname: git.aisoftwarefactory.world
      tls:
        mode: Terminate
        certificateRefs:
          - kind: Secret
            name: git-aisoftwarefactory-world-tls
      allowedRoutes:
        namespaces:
          from: Same
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: git-redirect
  namespace: forgejo
spec:
  parentRefs:
    - name: edge-gateway
      sectionName: http
  hostnames: [git.aisoftwarefactory.world]
  rules:
    - filters:
        - type: RequestRedirect
          requestRedirect: {scheme: https, port: 443, statusCode: 301}
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: git-app
  namespace: forgejo
spec:
  parentRefs:
    - name: edge-gateway
      sectionName: https
  hostnames: [git.aisoftwarefactory.world]
  rules:
    - backendRefs:
        - name: forgejo-http
          port: 3000
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-production
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-production-account-key
    solvers:
      - http01:
          gatewayHTTPRoute:
            parentRefs:
              - name: edge-gateway
                namespace: forgejo
                kind: Gateway
            serviceType: ClusterIP
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: git-aisoftwarefactory-world
  namespace: forgejo
spec:
  secretName: git-aisoftwarefactory-world-tls
  dnsNames: [git.aisoftwarefactory.world]
  issuerRef:
    name: letsencrypt-production
    kind: ClusterIssuer
```

The https listener stays not-ready until the certificate exists, that ordering is normal on first issue. cert-manager creates its own solver HTTPRoute named `cm-acme-http-solver-*` in namespace `forgejo`, its exact path match takes precedence over the redirect rule per the Gateway API v1.6.1 spec.

- [ ] **Step 4: DNS and issuance**

BLOCKED on Sebastian's A records. After they exist:

```bash
kubectl apply -f k8s/platform/gateway-api/edge.yaml
kubectl -n forgejo wait --for=condition=Ready certificate/git-aisoftwarefactory-world --timeout=600s
```

Expected: certificate Ready. If issuance retries before DNS lands, that is expected, it succeeds on the next attempt once the records resolve.

- [ ] **Step 5: Verify the edge**

```bash
curl -sI http://git.aisoftwarefactory.world | head -1
curl -sI https://git.aisoftwarefactory.world | head -1
```

Expected: 301 on port 80, and on 443 a served response (503 from Envoy is correct at this point, the backend Service does not exist until Task 14) with a valid certificate chain:

```bash
curl -s https://git.aisoftwarefactory.world -o /dev/null -w '%{ssl_verify_result}\n'
```

Expected: 0. Listener ports are fixed after this point: editing a listener port wedges Envoy on Cilium 1.20.0 (issue 48132), change means delete and recreate the Gateway.

- [ ] **Step 6: Commit**

```bash
git status --porcelain
git add k8s/platform/gateway-api
git commit -m "Gateway API edge with Let's Encrypt HTTP-01"
```

### Task 14: Forgejo

**Files:** Create: `infra/k8s/platform/forgejo/values.yaml`.

**Interfaces:**
- Consumes: `sf-cluster-rw.platform.svc.cluster.local:5432`, database `forgejo`, role `forgejo`, password secret `pg-forgejo` (namespace `platform`). Bucket `aisoftwarefactory-forgejo`. The TLS edge from Task 13.
- Produces: Forgejo 15.0.9 LTS at `https://git.aisoftwarefactory.world`, admin secret `forgejo-admin-secret`, S3 creds `hetzner-s3-creds` (namespace `forgejo`, keys `access-key`, `secret-key`), helm release `forgejo` in namespace `forgejo` (adopted by Flux in Task 15, same name and namespace).

- [ ] **Step 1: Create the secrets**

```bash
ADMIN_PW=$(openssl rand -hex 16)
set -a; source ~/repos/ai-software-factory/.env.tools; set +a
FORGEJO_DB_PW=$(kubectl -n platform get secret pg-forgejo -o jsonpath='{.data.password}' | base64 -d)
kubectl -n forgejo create secret generic forgejo-admin-secret \
  --from-literal=username=sebastian --from-literal=password=$ADMIN_PW
kubectl -n forgejo create secret generic forgejo-db-creds --from-literal=password=$FORGEJO_DB_PW
kubectl -n forgejo create secret generic hetzner-s3-creds \
  --from-literal=access-key=$HETZNER_S3_ACCESS_KEY_ID --from-literal=secret-key=$HETZNER_S3_SECRET_ACCESS_KEY
echo "forgejo admin password: $ADMIN_PW"
```

`forgejo-db-creds` is the namespace-local copy of `pg-forgejo`'s password (Kubernetes secrets do not cross namespaces). Print the admin password for the seed bundle. Keys are exactly `username` and `password` for the admin secret, the chart's templates read those names.

- [ ] **Step 2: Write the values and install**

`infra/k8s/platform/forgejo/values.yaml`:

```yaml
replicaCount: 1
persistence:
  enabled: true
  size: 10Gi
  storageClass: local-path
service:
  http:
    type: ClusterIP
    port: 3000
gitea:
  admin:
    existingSecret: forgejo-admin-secret
    email: admin@aisoftwarefactory.world
    passwordMode: keepUpdated
  config:
    server:
      ROOT_URL: https://git.aisoftwarefactory.world/
      DOMAIN: git.aisoftwarefactory.world
      SSH_DOMAIN: git.aisoftwarefactory.world
    database:
      DB_TYPE: postgres
      HOST: sf-cluster-rw.platform.svc.cluster.local:5432
      NAME: forgejo
      USER: forgejo
    storage:
      STORAGE_TYPE: minio
      MINIO_ENDPOINT: fsn1.your-objectstorage.com
      MINIO_USE_SSL: true
      MINIO_BUCKET: aisoftwarefactory-forgejo
      MINIO_LOCATION: fsn1
      MINIO_BUCKET_LOOKUP: auto
    actions:
      ENABLED: true
      DEFAULT_ACTIONS_URL: https://data.forgejo.org
  additionalConfigFromEnvs:
    - name: FORGEJO__database__PASSWD
      valueFrom:
        secretKeyRef: {name: forgejo-db-creds, key: password}
    - name: FORGEJO__storage__MINIO_ACCESS_KEY_ID
      valueFrom:
        secretKeyRef: {name: hetzner-s3-creds, key: access-key}
    - name: FORGEJO__storage__MINIO_SECRET_ACCESS_KEY
      valueFrom:
        secretKeyRef: {name: hetzner-s3-creds, key: secret-key}
```

`MINIO_USE_SSL: true` matters, the default is false and the traffic would leak plaintext credentials to a public endpoint. `ROOT_URL` makes clone URLs and Actions callbacks point at the real domain. The chart ships no database subchart in v17, external Postgres is the only path, and no ingress is configured, the Gateway routes to the ClusterIP Service on 3000.

```bash
helm install forgejo oci://code.forgejo.org/forgejo-helm/forgejo \
  --version 17.1.7 -n forgejo -f k8s/platform/forgejo/values.yaml
kubectl -n forgejo rollout status deploy/forgejo --timeout=600s
```

- [ ] **Step 3: Verify through the edge**

```bash
curl -s https://git.aisoftwarefactory.world/api/v1/version | head -1
curl -s -u sebastian:$ADMIN_PW https://git.aisoftwarefactory.world/api/v1/user | jq -r .login
```

Expected: a version string, then `sebastian`. Admin login works over TLS, Actions and the S3 storage initialised at boot (check `kubectl -n forgejo logs deploy/forgejo | grep -i minio` returns no errors).

- [ ] **Step 4: Seed-bundle slot and commit**

Add the slot `Forgejo admin password` to `infra/docs/seed-bundle.md`, ticked. Commit:

```bash
git status --porcelain
git add k8s/platform/forgejo/values.yaml docs/seed-bundle.md
git commit -m "Forgejo on CNPG and S3 behind the gateway"
```

### Task 15: Git primary and Flux bootstrap

**Files:** Create: `infra/k8s/platform/kustomization.yaml`, `infra/k8s/platform/namespaces.yaml`, `infra/k8s/platform/coredns.yaml`, `infra/clusters/sf/platform.yaml`, `infra/clusters/sf/kustomization.yaml`, `infra/k8s/platform/cert-manager/helmrelease.yaml`, `infra/k8s/platform/forgejo/helmrelease.yaml`, `infra/k8s/platform/sources.yaml`. Delete: `infra/k8s/platform/forgejo/values.yaml` (Task 14's applied-values record, superseded by the HelmRelease's inline values). Modify: `infra/README.md` (Flux layout, the Cilium-outside-Flux ruling, the push ritual).

**Interfaces:**
- Consumes: Forgejo from Task 14 with admin credentials, the hand-applied slice (Tasks 11 to 14).
- Produces: Flux v2.9.5 bootstrapped against `https://git.aisoftwarefactory.world/sf/ai-software-factory-infra`, sync path `clusters/sf`. Forgejo is the primary remote (`origin`) for both factory repos, GitHub stays as `github`. From this task on, platform changes ship as commits to `k8s/platform` and Flux applies them.

- [ ] **Step 1: Organisation, repositories, PAT**

```bash
ADMIN_PW=<admin password from Task 14>
AUTH="sebastian:$ADMIN_PW"
curl -s -u "$AUTH" -X POST https://git.aisoftwarefactory.world/api/v1/orgs \
  -H 'Content-Type: application/json' \
  -d '{"username":"sf","visibility":"private"}'
for r in ai-software-factory-infra ai-software-factory-code; do
  curl -s -u "$AUTH" -X POST https://git.aisoftwarefactory.world/api/v1/orgs/sf/repos \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"$r\",\"private\":true,\"default_branch\":\"main\"}"
done
FLUX_PAT=$(curl -s -u "$AUTH" -X POST https://git.aisoftwarefactory.world/api/v1/users/sebastian/tokens \
  -H 'Content-Type: application/json' \
  -d '{"name":"flux-bootstrap","scopes":["read:misc","write:repository"]}' | jq -r .sha1)
echo "Forgejo PAT: $FLUX_PAT"
```

The token prints once for the seed bundle (slot `Forgejo PAT for Flux`), it is not retrievable again. The org is named `sf` to keep clone URLs short.

- [ ] **Step 2: Remotes and credential store**

In BOTH `~/repos/ai-software-factory-infra` and `~/repos/ai-software-factory-code`:

```bash
git remote rename origin github
git remote add origin https://git.aisoftwarefactory.world/sf/$(basename $PWD).git
git config --global credential.helper store
echo "https://sebastian:$FLUX_PAT@git.aisoftwarefactory.world" >> ~/.git-credentials
chmod 600 ~/.git-credentials
git push origin main
```

The docs repository (`ai-software-factory`) stays on GitHub only, it is not a factory payload.

- [ ] **Step 3: Bootstrap Flux**

```bash
command -v flux >/dev/null || {
  U=$(curl -s https://api.github.com/repos/fluxcd/flux2/releases/latest \
    | jq -r '.assets[] | select(.name=="flux_2.9.5_linux_amd64.tar.gz").browser_download_url')
  curl -sL "$U" | tar xz -C ~/.local/bin flux
}
export GITEA_TOKEN=$FLUX_PAT
flux bootstrap gitea --token-auth \
  --hostname=git.aisoftwarefactory.world \
  --owner=sf --repository=ai-software-factory-infra \
  --branch=main --path=clusters/sf
```

The bootstrap targets the infra repo itself, not a separate fleet repo: architecture 11 makes the infra repository the human-owned source of truth, and one repository fewer to re-seed. Let's Encrypt is a public CA, no `--ca-file` needed. Bootstrap commits `gotk-components.yaml` and `gotk-sync.yaml` to `clusters/sf` on the remote.

The first sync after bootstrap fails while source-controller sits on sf-0: DNS points `git.aisoftwarefactory.world` at sf-0's own public IPv4, and Cilium 1.20's host-network gateway drops pod traffic to the node's own IP on 80 and 443 (cross-node, ClusterIP and outside paths all answer 200, found live 2026-09-25). Unblock it with a CoreDNS split-DNS rewrite to the gateway Service, applied by hand before the platform tree exists, then poke the source:

```bash
kubectl apply -f k8s/platform/coredns.yaml
flux reconcile source git flux-system
```

`infra/k8s/platform/coredns.yaml` is the live Corefile plus one rewrite block, committed byte-identical so Flux adopts it:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health {
            lameduck 5s
        }
        ready
        log . {
            class error
        }
        prometheus :9153

        rewrite stop {
            name exact git.aisoftwarefactory.world cilium-gateway-edge-gateway.forgejo.svc.cluster.local
        }

        kubernetes cluster.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
            ttl 30
        }
        forward . /etc/resolv.conf {
           max_concurrent 1000
        }
        cache 30 {
           disable success cluster.local
           disable denial cluster.local
        }
        loop
        reload
        loadbalance
    }
```

The `reload` plugin picks the change up without a pod restart. On a re-seed this hand-apply is part of the drill: bootstrap recreates the same deadlock until the rewrite exists, and the file sits in the tree Flux cannot yet fetch. The rewrite is safe for the ACME solver, Let's Encrypt validates from outside the cluster and only cluster DNS clients see the override.

- [ ] **Step 4: Pull the bootstrap commit and wire the platform tree**

```bash
cd ~/repos/ai-software-factory-infra
git pull --rebase origin main
```

`infra/clusters/sf/kustomization.yaml` (the build root the sync path loads, without it `kubectl kustomize clusters/sf` has nothing to build):

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- flux-system
- platform.yaml
```

`infra/clusters/sf/platform.yaml` (the Flux Kustomization that owns the platform tree):

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata: {name: platform, namespace: flux-system}
spec:
  interval: 10m
  path: ./k8s/platform
  prune: true
  sourceRef: {kind: GitRepository, name: flux-system}
```

`infra/k8s/platform/sources.yaml` (chart sources, all in namespace `flux-system`):

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata: {name: jetstack, namespace: flux-system}
spec: {interval: 10m, url: https://charts.jetstack.io}
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata: {name: forgejo, namespace: flux-system}
spec:
  interval: 10m
  url: oci://code.forgejo.org/forgejo-helm/forgejo
  layerSelector:
    mediaType: application/vnd.cncf.helm.chart.content.v1.tar+gzip
    operation: copy
  ref:
    semver: ">=17.1.7 <17.2.0"
```

`infra/k8s/platform/cert-manager/helmrelease.yaml` (adopts the Task 13 release, identical values, matching release name and namespace):

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata: {name: cert-manager, namespace: platform}
spec:
  interval: 10m
  releaseName: cert-manager
  targetNamespace: platform
  chart:
    spec:
      chart: cert-manager
      version: v1.21.2
      sourceRef: {kind: HelmRepository, name: jetstack, namespace: flux-system}
  values:
    crds: {enabled: true}
    config: {gatewayAPI: {enabled: true}}
```

`infra/k8s/platform/forgejo/helmrelease.yaml` (adopts the Task 14 release the same way):

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata: {name: forgejo, namespace: forgejo}
spec:
  interval: 10m
  releaseName: forgejo
  targetNamespace: forgejo
  chartRef:
    kind: OCIRepository
    name: forgejo
    namespace: flux-system
  values:
    replicaCount: 1
    persistence:
      enabled: true
      size: 10Gi
      storageClass: local-path
    service:
      http:
        type: ClusterIP
        port: 3000
    gitea:
      admin:
        existingSecret: forgejo-admin-secret
        email: admin@aisoftwarefactory.world
        passwordMode: keepUpdated
      config:
        server:
          ROOT_URL: https://git.aisoftwarefactory.world/
          DOMAIN: git.aisoftwarefactory.world
          SSH_DOMAIN: git.aisoftwarefactory.world
        database:
          DB_TYPE: postgres
          HOST: sf-cluster-rw.platform.svc.cluster.local:5432
          NAME: forgejo
          USER: forgejo
        storage:
          STORAGE_TYPE: minio
          MINIO_ENDPOINT: fsn1.your-objectstorage.com
          MINIO_USE_SSL: true
          MINIO_BUCKET: aisoftwarefactory-forgejo
          MINIO_LOCATION: fsn1
          MINIO_BUCKET_LOOKUP: auto
        actions:
          ENABLED: true
          DEFAULT_ACTIONS_URL: https://data.forgejo.org
      additionalConfigFromEnvs:
        - name: FORGEJO__database__PASSWD
          valueFrom:
            secretKeyRef: {name: forgejo-db-creds, key: password}
        - name: FORGEJO__storage__MINIO_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef: {name: hetzner-s3-creds, key: access-key}
        - name: FORGEJO__storage__MINIO_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef: {name: hetzner-s3-creds, key: secret-key}
```

`infra/k8s/platform/kustomization.yaml` (the tree root, in apply order):

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- namespaces.yaml
- coredns.yaml
- sources.yaml
- gateway-api/crds.yaml
- gateway-api/edge.yaml
- cert-manager/helmrelease.yaml
- cnpg/operator.yaml
- cnpg/cluster.yaml
- cnpg/databases.yaml
- cnpg/backup.yaml
- local-path
- forgejo/helmrelease.yaml
```

With `infra/k8s/platform/namespaces.yaml` holding plain `Namespace` objects for `platform` and `forgejo` with no labels (labels for `forgejo` arrive with the runner in Task 16, which edits this file). `local-path` is referenced as a directory, kustomize cannot load a kustomization by file path. Delete `k8s/platform/forgejo/values.yaml` in the same commit, the HelmRelease carries the values inline and the file is no longer referenced (one way only, a re-seed deploys through Flux, not the hand install). The previously hand-applied manifests are already byte-identical in the tree, so Flux adopts them: prune is inventory-driven and only removes objects a Kustomization itself applied, and the HelmReleases find the existing helm release storage by name and upgrade in place with unchanged values.

- [ ] **Step 5: Push, reconcile, verify adoption**

```bash
git status --porcelain
git add clusters/sf k8s/platform README.md
git commit -m "Flux owns the platform tree"
git push origin main
flux get kustomizations
flux tree kustomization platform | head -40
flux get helmreleases -A
kubectl -n platform get cluster sf-cluster -o jsonpath='{.status.phase}'
```

Expected: kustomization `platform` Ready, `flux tree` lists the adopted objects, both HelmReleases Ready with no upgrade diff. Then check for silent drift correction:

```bash
kubectl -n forgejo get httproutes -o yaml | grep -c 'managed-by: kustomize-controller'
```

and read `kubectl -n flux-system events` for `FieldManager` conflicts. Expected: none, the committed manifests match what was applied by hand.

- [ ] **Step 6: The push ritual from here on**

Record in `infra/README.md`: after every task commit, `git push origin main && git push github main`. Forgejo is primary (Flux reads it), GitHub is the off-site backup.

### Task 16: Actions runner and first green CI

**Files:** Create: `infra/k8s/platform/forgejo/runner-chart/` (vendored chart 0.7.5), `infra/k8s/platform/forgejo/runner-helmrelease.yaml`. Modify: `infra/k8s/platform/namespaces.yaml` (privileged label on `forgejo`), `docs/architecture.md` sections 7 and 9 (this repository).

**Interfaces:**
- Consumes: Forgejo Actions enabled (Task 14), org `sf`, the code repo's existing `ci.yml` from Stage 0.
- Produces: runner `sf-runner` online with label `ubuntu-latest:docker://catthehacker/ubuntu:act-22.04`, green CI on Forgejo. This is the first stage exit element.

The runner has NO Kubernetes job backend: the label schemes in the runner source are `host`, `docker` and `lxc` only, and forgejo/act ships docker executors only. Jobs run as containers inside a privileged docker-in-docker sidecar of the runner pod. architecture.md's claim of a "native Kubernetes pod backend" is wrong and gets corrected in this task.

- [ ] **Step 1: Vendor the chart**

The chart is git-only (the OCI path 404s):

```bash
git clone --depth 1 https://code.forgejo.org/forgejo-helm/forgejo-runner /tmp/forgejo-runner
helm show chart /tmp/forgejo-runner | grep -E '^(version|appVersion)'
cp -r /tmp/forgejo-runner k8s/platform/forgejo/runner-chart
rm -rf /tmp/forgejo-runner
```

Expected: version 0.7.5, appVersion 12.7.3. The clone may carry a `.git` directory, remove it inside the vendored copy.

- [ ] **Step 2: Registration token**

```bash
AUTH="sebastian:<admin password>"
RUNNER_TOKEN=$(curl -s -u "$AUTH" -X POST \
  https://git.aisoftwarefactory.world/api/v1/orgs/sf/actions/runners/registration-token | jq -r .token)
kubectl -n forgejo create secret generic runner-init \
  --from-literal=CONFIG_NAME=sf-runner \
  --from-literal=CONFIG_INSTANCE=https://git.aisoftwarefactory.world \
  --from-literal=CONFIG_TOKEN=$RUNNER_TOKEN
```

If the org endpoint answers 404, fall back to the repo-scoped endpoint `POST /api/v1/repos/sf/ai-software-factory-code/actions/runners/registration-token`. If that also fails, take the token from the Forgejo UI (org settings, Actions, Runners, Create new runner), a Sebastian step. The token is a registration credential, it lives in the secret, not in Git.

- [ ] **Step 3: Label the namespace and write the HelmRelease**

```bash
kubectl label ns forgejo pod-security.kubernetes.io/enforce=privileged --overwrite
```

Baseline rejects the privileged dind pod, so namespace `forgejo` runs privileged enforcement. Record the label on the Namespace object in `infra/k8s/platform/namespaces.yaml` (Flux would otherwise revert it).

`infra/k8s/platform/forgejo/runner-helmrelease.yaml`:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata: {name: forgejo-runner, namespace: forgejo}
spec:
  interval: 10m
  releaseName: forgejo-runner
  targetNamespace: forgejo
  chart:
    spec:
      chart: ./k8s/platform/forgejo/runner-chart
      sourceRef: {kind: GitRepository, name: flux-system}
  values:
    runner:
      config:
        create: true
        existingInitSecret: runner-init
        file:
          runner:
            labels:
              - ubuntu-latest:docker://catthehacker/ubuntu:act-22.04
    dind:
      image:
        tag: "29.5.2-dind"
    securityContext:
      privileged: true
```

Add `forgejo/runner-helmrelease.yaml` to the resources list in `k8s/platform/kustomization.yaml`.

- [ ] **Step 4: Roll out and prove CI green**

```bash
git status --porcelain
git add k8s/platform
git commit -m "Forgejo runner with dind jobs"
git push origin main && git push github main
kubectl -n forgejo rollout status deploy/forgejo-runner --timeout=600s
kubectl -n forgejo logs deploy/forgejo-runner | grep -i 'connected\|registered'
```

Expected: the runner registers and connects. Then trigger CI in the code repo:

```bash
cd ~/repos/ai-software-factory-code
git commit --allow-empty -m "ci: runner smoke"
git push origin main
```

Watch the run finish green: `https://git.aisoftwarefactory.world/sf/ai-software-factory-code/actions` (login as admin), or the runner logs showing the job container pull and the workflow steps. The workflow's `uses:` references resolve against `data.forgejo.org`, `actions/checkout@v4` and `actions/setup-go@v5` exist there.

- [ ] **Step 5: Correct architecture.md**

In `docs/architecture.md`: section 7's "Forgejo Actions runs PR checks on its Kubernetes pod runner" and section 9's "a native Kubernetes pod backend, a Helm chart and KEDA autoscale" are wrong (runner source verified 2026-09-25: docker, host and lxc backends only). Rewrite both to the dind sidecar reality, one chart instance, no KEDA. Commit in this repository: `Correct the runner backend claim`.

### Task 17: OpenBao

**Files:** Create: `infra/k8s/platform/openbao/helmrelease.yaml`.

**Interfaces:**
- Consumes: StorageClass `local-path`, bucket `aisoftwarefactory-backups`.
- Produces: OpenBao 2.6.3 (chart 0.29.6) at `openbao.platform.svc:8200`, HA raft with one replica, sealed by default after restarts, unseal keys and root token in the seed bundle, first raft snapshot in S3.

- [ ] **Step 1: HelmRelease**

`infra/k8s/platform/openbao/helmrelease.yaml`:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata: {name: openbao, namespace: flux-system}
spec: {interval: 10m, url: https://openbao.github.io/openbao-helm}
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata: {name: openbao, namespace: platform}
spec:
  interval: 10m
  releaseName: openbao
  targetNamespace: platform
  chart:
    spec:
      chart: openbao
      version: 0.29.6
      sourceRef: {kind: HelmRepository, name: openbao, namespace: flux-system}
  values:
    injector:
      enabled: false
    server:
      ha:
        enabled: true
        replicas: 1
        raft:
          enabled: true
          setNodeId: true
          config: |
            ui = true
            listener "tcp" {
              tls_disable = 1
              address = "[::]:8200"
              cluster_address = "[::]:8201"
            }
            storage "raft" {
              path = "/openbao/data"
            }
            service_registration "kubernetes" {}
      dataStorage:
        enabled: true
        size: 2Gi
        storageClass: local-path
        accessMode: ReadWriteOnce
        mountPath: /openbao/data
      auditStorage:
        enabled: false
      dev:
        enabled: false
      updateStrategyType: OnDelete
    ui:
      enabled: true
      serviceType: ClusterIP
      externalPort: 8200
```

HA raft with one replica rather than the file backend: `bao operator raft snapshot` needs raft storage, the file backend has no snapshot command. The injector is off, Stage 2 uses OpenBao through the API only. Add the file to the kustomization resources, commit, push both remotes, wait:

```bash
kubectl -n platform rollout status statefulset/openbao --timeout=600s
```

- [ ] **Step 2: Init and unseal**

Two key shares, threshold one: the second key is the spare for the printed seed bundle, a restart still needs just one.

```bash
kubectl -n platform exec -ti openbao-0 -- bao operator init -key-shares=2 -key-threshold=1
```

Print both unseal keys and the initial root token for the seed bundle, tick the slot `OpenBao unseal keys (created in Stage 2)`. Verify:

```bash
kubectl -n platform exec -ti openbao-0 -- bao status | grep -i sealed
```

Expected: `Sealed false`. After any pod restart the server seals again and unsealing is the manual step above, that is the design (identity belongs to the task, not the machine).

- [ ] **Step 3: First snapshot to S3**

```bash
kubectl -n platform exec openbao-0 -- bao operator raft snapshot save /tmp/openbao.snap
kubectl -n platform cp openbao-0:/tmp/openbao.snap /tmp/openbao-$(date +%F).snap
aws s3 cp /tmp/openbao-$(date +%F).snap s3://aisoftwarefactory-backups/openbao/
rm /tmp/openbao-$(date +%F).snap
```

Expected: the object lists under `s3://aisoftwarefactory-backups/openbao/`. The chart's snapshotAgent stays off in Stage 2, it needs a Kubernetes auth role that no consumer requires yet.

### Task 18: Temporal

**Files:** Create: `infra/k8s/platform/temporal/helmrelease.yaml`.

**Interfaces:**
- Consumes: `sf-cluster-rw.platform.svc:5432`, databases `temporal` and `temporal_visibility`, role `temporal`, password secret `pg-temporal` (namespace `platform`, key `password`).
- Produces: Temporal 1.32.0 (chart 1.7.0), namespace `default` with 3 day retention, UI on service `temporal-ui` port 8080.

- [ ] **Step 1: HelmRelease**

`infra/k8s/platform/temporal/helmrelease.yaml`:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata: {name: temporalio, namespace: flux-system}
spec: {interval: 10m, url: https://go.temporal.io/helm-charts}
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata: {name: temporal, namespace: platform}
spec:
  interval: 10m
  releaseName: temporal
  targetNamespace: platform
  chart:
    spec:
      chart: temporal
      version: 1.7.0
      sourceRef: {kind: HelmRepository, name: temporalio, namespace: flux-system}
  values:
    server:
      config:
        persistence:
          defaultStore: default
          visibilityStore: visibility
          numHistoryShards: 512
          datastores:
            default:
              sql:
                pluginName: postgres12
                driverName: postgres12
                databaseName: temporal
                connectAddr: sf-cluster-rw.platform.svc:5432
                connectProtocol: tcp
                user: temporal
                existingSecret: pg-temporal
                secretKey: password
                createDatabase: false
                manageSchema: true
                maxConns: 20
                maxIdleConns: 20
                maxConnLifetime: 1h
            visibility:
              sql:
                pluginName: postgres12
                driverName: postgres12
                databaseName: temporal_visibility
                connectAddr: sf-cluster-rw.platform.svc:5432
                connectProtocol: tcp
                user: temporal
                existingSecret: pg-temporal
                secretKey: password
                createDatabase: false
                manageSchema: true
        namespaces:
          create: true
          useHelmHooks: false
          namespace:
            - name: default
              retention: 3d
      resources:
        requests: {cpu: 100m, memory: 256Mi}
        limits: {cpu: 500m, memory: 512Mi}
    schema:
      useHelmHooks: false
      resources:
        requests: {cpu: 100m, memory: 128Mi}
    web:
      resources:
        requests: {cpu: 50m, memory: 64Mi}
        limits: {memory: 128Mi}
    admintools:
      resources:
        requests: {cpu: 50m, memory: 128Mi}
```

`numHistoryShards` is immutable after first deploy. `schema.useHelmHooks: false` and `namespaces.useHelmHooks: false` are REQUIRED under Flux, the chart's own values comment says so. `createDatabase: false` because the CNPG Database CRs own database creation. The repo URL is `go.temporal.io/helm-charts`, `helm.temporal.io` does not resolve. Add to the kustomization resources, commit, push both remotes.

- [ ] **Step 2: Verify**

```bash
kubectl -n platform get jobs | grep temporal
kubectl -n platform rollout status deploy/temporal-frontend --timeout=600s
kubectl -n platform get deploy
kubectl -n platform port-forward svc/temporal-ui 8080:8080 &
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080
```

Expected: the schema job reaches Completion, frontend and its siblings roll out (history, matching, worker), the UI answers 200 through the port-forward. If the service is named differently, `kubectl -n platform get svc | grep temporal` shows the chart's actual names.

### Task 19: LiteLLM

**Files:** Create: `infra/k8s/platform/litellm/helmrelease.yaml`.

**Interfaces:**
- Consumes: `sf-cluster-rw.platform.svc`, database `litellm`, role `litellm`, secret `pg-litellm` (namespace `platform`, keys `username`, `password`), Sebastian's DeepSeek key from `.env.tools`.
- Produces: LiteLLM proxy 1.102.1 (chart 1.102.1, OCI) at `litellm.platform.svc:4000`, model alias `deepseek-chat`. The smoke call is the third stage exit element.

- [ ] **Step 1: Secrets**

```bash
set -a; source ~/repos/ai-software-factory/.env.tools; set +a
MASTER="sk-$(openssl rand -hex 24)"
kubectl -n platform create secret generic litellm-master-key --from-literal=masterkey=$MASTER
kubectl -n platform create secret generic litellm-deepseek --from-literal=DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY
echo "LiteLLM master key: $MASTER"
```

Print the master key for the seed bundle (slot `LiteLLM master key`).

- [ ] **Step 2: HelmRelease**

`infra/k8s/platform/litellm/helmrelease.yaml`:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata: {name: litellm, namespace: flux-system}
spec:
  interval: 10m
  url: oci://ghcr.io/berriai/litellm-helm
  layerSelector:
    mediaType: application/vnd.cncf.helm.chart.content.v1.tar+gzip
    operation: copy
  ref:
    semver: ">=1.102.1 <1.103.0"
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata: {name: litellm, namespace: platform}
spec:
  interval: 10m
  releaseName: litellm
  targetNamespace: platform
  chartRef:
    kind: OCIRepository
    name: litellm
    namespace: flux-system
  values:
    replicaCount: 1
    masterkeySecretName: litellm-master-key
    db:
      deployStandalone: false
      useExisting: true
      endpoint: sf-cluster-rw.platform.svc
      database: litellm
      url: postgresql://$(DATABASE_USERNAME):$(DATABASE_PASSWORD)@$(DATABASE_HOST)/$(DATABASE_NAME)
      secret:
        name: pg-litellm
        usernameKey: username
        passwordKey: password
    proxyConfigMap:
      create: true
    proxy_config:
      model_list:
        - model_name: deepseek-chat
          litellm_params:
            model: deepseek/deepseek-chat
            api_key: os.environ/DEEPSEEK_API_KEY
      general_settings:
        master_key: os.environ/PROXY_MASTER_KEY
    environmentSecrets:
      - litellm-deepseek
    migrationJob:
      enabled: true
      hooks:
        argocd:
          enabled: false
    service:
      type: ClusterIP
      port: 4000
    resources:
      requests: {cpu: 200m, memory: 512Mi}
      limits: {cpu: "1", memory: 1Gi}
```

`pg-litellm` is the same secret CNPG manages the role from, both consumers live in namespace `platform` so one secret serves both. The composed `db.url` is why the password is hex. Add to the kustomization resources, commit, push both remotes, wait for the migration job and the deployment.

- [ ] **Step 3: Smoke call through a virtual key (stage exit element)**

```bash
kubectl -n platform port-forward svc/litellm 4000:4000 &
curl -s http://localhost:4000/key/generate \
  -H "Authorization: Bearer $MASTER" -H 'Content-Type: application/json' \
  -d '{"models":["deepseek-chat"],"max_budget":5,"duration":"30d","key_alias":"sf-smoke-test"}' | jq -r .key
curl -s http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer sk-<the virtual key just printed>" \
  -H 'Content-Type: application/json' \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"Reply with the single word: pong"}]}' \
  | jq -r '.choices[0].message.content'
```

Expected: a virtual key starting `sk-`, then `pong` from DeepSeek through the proxy. Record the response and the token usage line as the evidence.

### Task 20: SigNoz

**Files:** Create: `infra/k8s/platform/signoz/helmrelease.yaml`.

**Interfaces:**
- Consumes: StorageClass `local-path`.
- Produces: SigNoz 0.143.0 (unified UI and query service on port 8080), otel-collector on OTLP 4317 and 4318, ClickHouse through the bundled Altinity operator, ZooKeeper one replica.

- [ ] **Step 1: HelmRelease**

`infra/k8s/platform/signoz/helmrelease.yaml`:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata: {name: signoz, namespace: flux-system}
spec: {interval: 10m, url: https://charts.signoz.io}
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata: {name: signoz, namespace: platform}
spec:
  interval: 10m
  releaseName: signoz
  targetNamespace: platform
  chart:
    spec:
      chart: signoz
      version: 0.143.0
      sourceRef: {kind: HelmRepository, name: signoz, namespace: flux-system}
  values:
    global:
      storageClass: local-path
    clickhouse:
      persistence:
        enabled: true
        storageClass: local-path
        size: 20Gi
      zookeeper:
        enabled: true
    signoz:
      replicaCount: 1
    otelCollector:
      replicaCount: 1
```

The chart no longer bundles k8s-infra (node telemetry), that chart arrives when Stage 8 needs infra metrics. Add to the kustomization resources, commit, push both remotes.

- [ ] **Step 2: Verify**

```bash
kubectl -n platform get pods | grep -E 'signoz|clickhouse|zookeeper'
kubectl -n platform port-forward svc/signoz-signoz 8080:8080 &
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080
```

Expected: pods Running, UI answers 200. Port 8080 is the unified service, 3301 was the removed separate frontend. Retention is set in the UI (Settings, General) when first used, it is not a chart value. If PodSecurity rejects any Altinity or ClickHouse pod under baseline, move that component to its own labelled namespace and record the deviation in `infra/README.md`.

### Task 21: Nightly Forgejo dump and stage close

**Files:** Create: `infra/k8s/platform/cronjobs/forgejo-dump.yaml`. Modify: `infra/docs/seed-bundle.md` (final ticks).

**Interfaces:**
- Consumes: helm release forgejo, bucket `aisoftwarefactory-backups` with the 14 day expiry on `forgejo-dumps/`.
- Produces: a nightly zip of Forgejo (database, repos, config) in S3 at 02:30 UTC, and the stage report.

- [ ] **Step 1: The CronJob**

`infra/k8s/platform/cronjobs/forgejo-dump.yaml`:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata: {name: forgejo-dump, namespace: forgejo}
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: {name: forgejo-dump, namespace: forgejo}
rules:
  - apiGroups: [""]
    resources: [pods]
    verbs: [get, list]
  - apiGroups: [""]
    resources: [pods/exec]
    verbs: [create, get]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata: {name: forgejo-dump, namespace: forgejo}
roleRef: {apiGroup: rbac.authorization.k8s.io, kind: Role, name: forgejo-dump}
subjects: [{kind: ServiceAccount, name: forgejo-dump}]
---
apiVersion: batch/v1
kind: CronJob
metadata: {name: forgejo-dump, namespace: forgejo}
spec:
  schedule: "30 2 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: forgejo-dump
          restartPolicy: Never
          initContainers:
            - name: dump
              image: alpine/kubectl:1.36.1
              command: [/bin/sh, -c]
              args:
                - |
                  set -e
                  POD=$(kubectl -n forgejo get pod -l app.kubernetes.io/name=forgejo -o jsonpath='{.items[0].metadata.name}')
                  kubectl -n forgejo exec $POD -- forgejo dump --type zip --file /tmp/forgejo-dump.zip
                  kubectl -n forgejo cp $POD:/tmp/forgejo-dump.zip /dump/forgejo-dump.zip
              volumeMounts: [{name: dump, mountPath: /dump}]
          containers:
            - name: upload
              image: amazon/aws-cli:2.28.5
              command: [/bin/sh, -c]
              args:
                - aws s3 cp /dump/forgejo-dump.zip s3://aisoftwarefactory-backups/forgejo-dumps/forgejo-$(date +%F).zip
              env:
                - name: AWS_ACCESS_KEY_ID
                  valueFrom: {secretKeyRef: {name: hetzner-s3-creds, key: access-key}}
                - name: AWS_SECRET_ACCESS_KEY
                  valueFrom: {secretKeyRef: {name: hetzner-s3-creds, key: secret-key}}
                - name: AWS_ENDPOINT_URL
                  value: https://fsn1.your-objectstorage.com
                - name: AWS_REGION
                  value: fsn1
              volumeMounts: [{name: dump, mountPath: /dump}]
          volumes: [{name: dump, emptyDir: {}}]
```

InitContainers run in order before the main container, so the dump lands in the emptyDir before the upload starts. The five-field schedule is Kubernetes cron, the six-field form belongs to CNPG's barman only. Add `cronjobs/forgejo-dump.yaml` to the resources list in `k8s/platform/kustomization.yaml`. If `forgejo dump` cannot find its config, check `kubectl exec $POD -- env | grep -i gitea` for the config path the deployment uses and pass it with `--config`.

- [ ] **Step 2: Prove it once, then commit**

```bash
git status --porcelain
git add k8s/platform/cronjobs k8s/platform/kustomization.yaml
git commit -m "Nightly Forgejo dump to S3"
git push origin main && git push github main
flux reconcile kustomization platform --with-source
kubectl -n forgejo get cronjob forgejo-dump
kubectl -n forgejo create job --from=cronjob/forgejo-dump forgejo-dump-manual
kubectl -n forgejo wait --for=condition=complete job/forgejo-dump-manual --timeout=600s
aws s3 ls s3://aisoftwarefactory-backups/forgejo-dumps/
kubectl -n forgejo delete job forgejo-dump-manual
```

Expected: today's zip listed in the bucket.

- [ ] **Step 3: Seed bundle and stage close**

Tick every Stage 2 slot in `infra/docs/seed-bundle.md` and commit. Run the stage exit test in full:

1. `curl -sI https://git.aisoftwarefactory.world` answers 200 or 301 with a valid Let's Encrypt certificate (Task 13 evidence refreshed).
2. The code repo's latest CI run on Forgejo is green on the runner (Task 16 evidence refreshed).
3. The LiteLLM smoke call through a fresh virtual key answers with a DeepSeek completion (Task 19 evidence refreshed).

Then write the stage report to Sebastian: what runs where, the month's cost line (about 210 EUR servers plus 6.49 EUR storage plus model spend), every deferred item, and the shutdown question. Stage 3 is not started without his go.

**Stage 2 exit test:** `https://git.aisoftwarefactory.world` serves a valid Let's Encrypt certificate, the factory repo's CI workflow runs green on the runner, and a LiteLLM smoke call through a test virtual key answers with a DeepSeek completion.

---

## Stages 3 to 9: outlines

The detailed task plan for each stage below is written when the previous stage passes its gate, with the same bite-sized format as Stages 0 to 2. Each outline names the goal, the steps in order, and the exit test that closes the stage.

### Stage 3: Burn-down

Goal: prove the immutability claim from goal.md on the real cluster.

Steps: back up (ScheduledBackup through the barman-cloud plugin, Forgejo dump, OpenBao snapshot), `tofu destroy`, `tofu apply`, re-apply configs, Flux converge, restore Postgres through the plugin's ObjectStore CR (the in-tree `barmanObjectStore` path is dead at CNPG 1.31, Ruling 59), Forgejo from its dump extracted into `gitea-repositories`, OpenBao from its S3 snapshot with the seed unseal key, then re-create the imperative state the restores do not carry: the gateway database role, the Forgejo tokens, the imperative namespace secrets, and any OpenBao KV newer than the last snapshot. The recovery origin always names the newest generation holding a completed base backup while the live archive runs one sibling ahead; a teardown that must preserve Postgres state takes that base backup first; a rebuild is green only when the restored repositories' HEADs match the last pushed commits (Rulings 61, 63). Measure the wall-clock duration (about five hours, 2026-09-25). This stage is also the off-switch rehearsal: the same path with cancellation instead of rebuild. Closed 2026-09-25; the drill is the standing rebuild recipe for every later stage.

Exit test: the cluster is whole again, all Stage 2 exit tests still pass, the restored repositories' HEADs match the last pushed commits, and the drill duration is written down in architecture 3.

### Stage 4: factory-gateway v0

Goal: the enforcement point from architecture 5.1 exists.

Steps: TDD the JWT validation against the cluster OIDC issuer (unit tests forge tokens with a test signer, an integration test on the cluster uses a real projected ServiceAccount token), the task-row lookup in Postgres, virtual key minting through LiteLLM's OSS key API, the alias table (`coding-cheap`, `coding-frontier`, `review-frontier`), the audit row on every decision, and the first budget refusal. Deploy via Flux with an image built by the new CI.

Exit test: on the cluster, a call with a valid task JWT reaches LiteLLM under a per-task virtual key, a call with no or foreign JWT gets 401, and a call past the task budget gets 402 with an audit row for each outcome.

Closed 2026-09-26. Standing contracts: `coding-cheap` is a load-balanced DeepSeek and Qwen pair and `review-frontier` maps to GLM (Ruling 64); the gateway tracks budget itself and maps LiteLLM's proactive 429 `budget_exceeded` to 402 at the edge, LiteLLM is the second line (Ruling 65); `deepseek-chat` stays pinned unless the API rejects it (Ruling 66). Architecture 5.1 step 4b, the tool path and OpenBao minting, lands in Stage 7.

### Stage 5: worker plane

Goal: one task runs one agent in one sandbox, attributable end to end.

Steps: land the Stage 4 runner gate before any commit the controller did not push can trigger CI: a runner egress NetworkPolicy limiting job containers to the architecture 5.3 allowlist plus the image pulls dind needs, or a second runner whose job containers use dind bridge networking with untrusted builds routed by label; the code repo's `k8s/` tree is risk-classed: changes by anyone but the controller merge only through a human. Spot-check the three load-bearing opencode facts from architecture 9 (JSON run output, serve API, `OPENCODE_CONFIG_CONTENT`) before writing the adapter, build the pinned opencode sandbox image with the gVisor RuntimeClass, implement the adapter plus the localhost identity proxy from architecture 6.3 (it re-reads the rotating token file per request, unit test with a temp file that changes), the per-task Forgejo token minting, and revocation of both the Forgejo token and the LiteLLM virtual key in the task-completion path, the factoryd task registry with Postgres: priority, required capabilities, risk class and cost ledger per task (architecture 6), and session records (prompts, tool calls, output, files touched, commits, cost) streaming full history to S3 and a compact restart state to Postgres; a dead session resumes as a new pod carrying its findings and the parent session id. Session supervision: a no-progress watchdog (no harness events for a set interval), a wall-clock cap per task, and a repetition detector (no file changes across a set number of events) — each trips the same path: snapshot findings, kill the sandbox, resume as a new pod or retry with a stronger model (architecture 6.5's resume semantics). The adapter sets caller-side token budgets (GLM is reasoning-always-on, architecture 4.4) so tier budgets hold. One namespace and one ServiceAccount `task-<id>` per task; the pod non-root with dropped capabilities and a read-only root filesystem; gVisor on the systrap platform (no /dev/kvm on cloud, architecture 3). Verify the sandbox network policy: egress to factory-gateway, Forgejo git and the package registries, with the cloud metadata endpoint unreachable. Decide whether TaskBrief grows the capability-hints field named in architecture 6.2.

Exit test: a task submitted to factoryd produces a branch and a commit on Forgejo, the session record lands in S3, and a curl from inside the sandbox to any address outside that allowlist fails.

Closed 2026-09-26 after three review rounds. Standing contracts:
- **The runner gate:** CI runs on push to protected `main` only, and only the human pushes or merges there (Rulings 76, 77). The unprivileged pull-request runner is Stage 6's first step.
- **Git credentials:** the agent never holds the Forgejo token. The worker clones with it before the harness starts, kills every agent process, and pushes from a clean repository of its own.
- **Egress:** the sandbox reaches the gateway and Forgejo, and DNS resolves only their names. The Go module proxy was dropped because the sandbox image has no Go toolchain; a registry joins by name with the toolchain that needs it.
- **factoryd itself:** it is confined by a ValidatingAdmissionPolicy to `factory-agents-*` namespaces. Its intake takes a bearer token and clamps the budget. It restarts with `Recreate`, and a mid-run restart requeues the task, anchored to its persisted start time.
- **Spend:** the gateway books each call's own cost, and factoryd settles each finished task to LiteLLM's recorded key spend.
- **TaskBrief:** capability hints stay out of it, because capabilities are policy the gateway enforces.
- **Node image:** the schematic and `talos/build-snapshot.sh` live in the infra repo, proven end to end.

### Stage 6: close the loop

Goal: a signal becomes a merged change.

Steps: first the untrusted-CI runner, because Forgejo Actions checks on agent pull requests are this stage's first verification gate and Stage 5 closed its runner exposure only by running CI on protected `main` alone (Ruling 76): privileged dind is node root regardless of egress policy, so pull-request builds run on a separate runner (Ruling 78): an ephemeral runner pod under the gVisor RuntimeClass that takes one job and exits, jobs on the host executor inside that unprivileged pod, image builds through rootless BuildKit, the architecture 5.3 egress allowlist, and no registry or repository credentials, with image publishing staying on the `main` runner; then Forgejo webhooks into factoryd intake (issues, pull request comments and reviews; priority from labels and severity), task rows from issues, the Temporal task workflow end to end (intake, sandbox, run, verify, PR), durable across crashes, with retry on a stronger model while the previous attempt's artifacts stay in place, the run activity carrying heartbeat and wall-clock timeouts enforced by the workflow, the supervisor from architecture 6.6: the Stage 5 detectors stay (stall, wall-clock cap, tool calls without file changes) and four join them over the stored event stream (the same command failing with the same error signature repeatedly, the same tool call repeated, a file flipping back to earlier content, churn while the diff against base stops growing), and a detector trip or a task past half its wall-clock cap or half its budget calls the supervisor activity with a progress digest (commands and outcomes over time, files with edit counts, last error signatures, the diff so far), which runs the strongest configured model under the new `supervisor` alias over the brief, the session record and the work-tree history and picks one bounded action: continue, redirect (resume as a new pod with its guidance as findings), retry on a stronger model, or stop and escalate to a human; it never raises a cap or a budget, Forgejo Actions as the first verification gate, the human merge as the delivery step.

Exit test: an issue created on the factory repo becomes a pull request with green checks, a human merges it, and the session record shows the full path.

Closed 2026-09-27: issue #37 became fork pull request #43 with five green checks on fresh unprivileged gVisor runner pods, the merge finished the workflow and the task within two seconds, and the timeline in S3 shows the path from intake to done. The controller merged as Sebastian's delegate after reading the diff and the checks (Ruling 88). Standing contracts:
- **The runner gate:** agent pull requests come from the `factory-agent` fork, so their jobs get a read-only job token and no secrets (Ruling 97); `job-env-audit` asserts on every run that the token cannot push. factoryd's CI spawner runs each `pr-untrusted` job in one ephemeral gVisor pod with a repository-scoped ephemeral registration (Ruling 89). Image builds run BuildKit as sandbox root in a separate gVisor build pod without credentials, because gVisor has no working rootless path (Ruling 91). The worker refuses a push whose `.forgejo`, `.gitea` or `.github` tree entries differ from the base, and factoryd re-checks before the pull request (Rulings 90, 100). The privileged runner still builds protected `main` only, its dind storage bounded to a 40 GiB `emptyDir`.
- **Git credentials:** two tokens per session, read on the upstream repository and write on the fork only, both revoked at session end; the worker clones from upstream and pushes `factory/<id>` to the fork.
- **The workflow:** factoryd runs the Temporal worker; every task is an issue with one `state/*` label; the wall-clock cap counts agent time across attempts (Ruling 93); attempts start on `coding-cheap` and climb to `coding-frontier` (Ruling 86). The heal pass (boot and every minute) starts missing workflows and re-reads Forgejo for signals a webhook missed, because Forgejo never retries a delivery; every run starts with `Reconcile`. Signals count only from owner, admin or write authors.
- **Supervision:** the detectors from architecture 6.6 run inside the session activity (Ruling 87); at most three supervisor calls per session under a per-task `supervisor` key capped at the remaining budget; stops push the work in progress; escalation waits in `waiting-human` for a trusted comment, which may grant a bounded time slice.
- **factory-ci:** the CI registrar is its own account, an organisation owner because Forgejo's runner API demands it, with a token scoped to the code repository; `main` on both repositories has `apply_to_admins` on and refuses its pushes (Rulings 101, 101a).
- **The sandbox:** carries the Go 1.25 toolchain and reaches the Go module proxy and checksum database by name (Ruling 99). factoryd itself runs under default-deny egress (Ruling 94).
- **Rebuild:** the drill took about 21 minutes (2026-09-26 to 27) with every trap pre-solved; the Forgejo `SECRET_KEY` lives in the seed bundle (Ruling 85), the webhook secret and a fresh CI registrar token are re-seed items.

### Stage 7: teeth

Goal: the enforcement from architecture 5.3 and 5.4 is real.

Steps: first PR build speed, because a pull request's image builds take 25 to 30 minutes on the untrusted runner (architecture 7.1): build only the Dockerfiles a pull request changes, give PR builds a credential-free read-only cache that trusted `main` builds export to an in-cluster cache registry reachable only from CI namespaces, drop the `Dockerfile.sandbox` warm step, build in parallel, and run each build job on a throwaway Hetzner Cloud build VM that factoryd creates and deletes in a separate Hetzner project for CI builds (its token held by factoryd; the agent project's token stays with the gateway alone), billed by the hour, reusing the commissioning pattern of architecture 5.5: a registry row before the create, provider labels, a lease, and a collector that deletes orphaned build VMs and anything the registry does not know in the CI project. Then the `coder` capability class as policy data in Postgres, edited through the console or API and versioned in Git, enforced in the gateway (capability, budget and approval state on every call), the gateway tool path from architecture 5.1 step 4b: proxy tool calls to their MCP servers or mint short-lived OpenBao credentials for the narrow case where the agent must connect itself, tool spend per call in the cost ledger, and the paid non-chat capabilities (Replicate, Firecrawl, fal.ai) as connectors with per-task request and euro caps, the cloud-resource commissioning connector from architecture 5.5: a separate Hetzner project for agent resources whose token only the gateway holds, a resource envelope per project set by a human from a standard default (servers, a fixed IP, block storage, a bucket), prices from Hetzner's pricing API so every request is priced before the create and accrued per hour after it, agent requests beyond the envelope as approval cards, a registry row written before each create and provider labels carrying task and project, a lease on every resource that task completion ends and the garbage collector enforces, human promotion of a resource to project-owned, and the collector deleting anything in the agent project the registry does not know, hard euro caps per task and per day in the cost ledger, the approval workflow state with the console UI (server-rendered Go, htmx) served at console.aisoftwarefactory.world through the Gateway, human login through Forgejo OAuth2, the kanban board from architecture 5.6: agent cards in columns derived from factoryd task states, a lane for human tasks (approvals, escalations, and tasks a human files for themself), a new-task button that files a Forgejo issue labelled `agent` or `human`, and factoryd mirroring task state onto issue labels, plus the commissioned-resource view per project and task with cost so far, the SigNoz UI exposed at signoz.aisoftwarefactory.world behind its own login, both hostnames getting Gateway listeners and certificates per architecture 3.4, the agent's human-escalation tool call as one more intake event that raises an approval task and pings the console, the Temporal gate activities from architecture 7, model review last on surviving diffs.

Exit test: a task over budget has its next model call refused by the gateway, a risk-classed change waits in an approval state, completes when approved, and the workflow merges the pull request, and the cost dashboard shows both. A server commissioned by a task whose sandbox is killed mid-run is deleted when its lease expires, a server created in the agent project by hand is deleted by the collector, and the console board shows the tasks and the resources with their cost.

Closed 2026-09-28. Exit test run verbatim on 2026-09-28 (task 57, code
f46c350, roll 7254da0): all seven steps pass. Step 3 failed on the first run
because the console showed every EUR amount with two decimals, so a 0.000543
EUR spend read 0.00; fixed in the final fix wave (ruling 135, four decimals)
and re-checked live after roll 552d477. Measured: a Go-only pull request
finishes its six checks in about 4 minutes, a Dockerfile pull request builds
on a throwaway cx23 that is gone seconds after the job, the CI project ends
at zero servers, a 60-minute lease books one hour and both provider deletes
of a server with a volume are issued before the lease end (ruling 130,
cutoff 210 s), a hand-made server in the agent project is deleted by the
collector's next pass, and the ledger's spent_eur equals the LiteLLM key
spend to the cent. Standing contracts from this stage, all in the ledger as
rulings 114 to 137: egress by name including storage.googleapis.com; policy
in Git with `risk` and `approvers` sections and a strict decoder; holds
booked or released exactly once with real cost over hold and one shared
over-hold flag; commissioning with servers and volumes only, outbound
53/80/443, deletion at the last tick before the lease end, per-server SSH
principals `resource-<id>`, a collector interlock on node addresses and
foreign labels; the console's spend actions limited to the policy's
approvers; merge by `factory-merge` after a whitelisted approval with six
bounded retries; every workflow change behind a Temporal change id with a
recorded replay history; Forgejo as the primary remote with push mirrors to
GitHub; cx23 build VMs (cx33 measured equal). What Stage 7 leaves for Stage
8 is in the "step zero" paragraph below and in the handover.

### Stage 8: customer

Goal: the demo app, the first external customer of the factory.

Steps, amended 2026-09-28 with Sebastian (rulings 140 to 152 in the ledger,
the discussion in stage8-answers.md): step zero, factory instrumentation and
the three hand steps as CronJobs; the gate supervisor and the alerts table
with a verdict per alert; project registration and per-project settings
(merge rule, notify list, the envelope with task and standing resources, an
in-cluster quota); every bug from any source starts a task, the `auto` merge
outcome, the non-reproducible path with a question to the poster and
Forgejo's bell; the demo app, a Go link shortener with Postgres in its own
repository with its own CI/CD as code (staging, 15 minutes without an alert,
prod); OpenTelemetry emission from the demo app and from the factory itself:
factoryd, factory-gateway and the worker adapters emit OTel, and gateway
audit rows go to OTel as well as Postgres (architecture 5.1 step 5); the
k8s-infra chart for node telemetry and CronJob failure watching into SigNoz,
ClickHouse resource requests, and SigNoz retention tiered to object storage
(architecture 4); SigNoz alert rules feeding factoryd intake, which files
each alert as a Forgejo issue in the repository of the namespace's project;
fault injection as a planted regression; Forgejo accounts for collaborators.

Exit test, amended 2026-09-28: two projects with two deploy chains in one
factory. A planted regression in the demo app raises an alert, the alert
files an issue that starts a task, the agent's fix passes the gates, merges
on the demo app's `auto` setting, and the demo app's own workflow takes it to
staging and, after 15 minutes without an alert, to prod. The factory's own
repositories keep their roll and their `human` setting. The alerts panel
shows the run's alerts with their verdicts.

Closed 2026-09-28. Exit test run on 2026-09-28 (task 70), passed: the planted
regression merged into the demo app's main at 21:02:25 UTC and reached
staging at 21:07:41; SigNoz's `5xx rate above 5 %` fired at 21:13:19 (6.67
percent), factoryd filed issue #5 and started the task 31 seconds later, the
agent opened its fix as PR #6 at 21:18:22, four checks ran green on the
ephemeral runners, the reproduction gate proved the agent's own repro block
red at the base and green at the head, the frontier review approved it as a
strict improvement, and factory-merge merged it on `auto` at 21:23:36, 9
minutes 47 seconds after the issue. The demo app's own workflow took the fix
to staging at 21:29:32, SigNoz resolved the alert at 21:37:19 and factoryd
commented the resolve on the issue, and prod ran the fix at 21:44:42 after
15 minutes on staging without an alert; the regression's own promotion to
prod had failed on the firing alert, so prod never ran the fault. Alert to
prod: 31 minutes 23 seconds; the task cost EUR 0.037. The factory's own
repositories rolled in the same window on their `human` setting, none of it
by factory-merge. The alerts panel showed the run's alert with verdict
`real`, and the run found the panel's two defects (a series whose rows moved
on kept its last value, and a sum across factoryd pods), fixed and rolled
before the stage closed. The rebuild that opened the stage
took 62 minutes end to end, the platform whole after 18, and the step-zero
gate passed on its intent (one supervisor call cut by its timeout booked its
hold, ruling 115). Measured: a roll takes 61 to 73 s from push to ready for
two images and 161 s for four; the demo app's own chain builds on a build VM
in about a minute and rolls staging and prod by its own CI, and its 15-minute
promote gate refused prod once on eight load-generator failures; a task's
gate durations equal its timeline to the hundredth of a second; the
factory's spend equals LiteLLM's key spend to the last digit once every
model call, review and supervisor included, passes the gateway. Standing
contracts from this stage, all in the ledger as rulings 140 to 172: step
zero's metrics, dashboard, bounds and alerts table with verdicts; the gate
supervisor for the five long gates with one wait and one retry per run, a
finished gate winning over a late answer; transcripts instead of heartbeats;
the three hand steps as CronJobs and a one-time OpenBao bootstrap; a project
as its own Forgejo organisation with a deploy branch as its rolled state,
registration reconciled from Postgres, hostnames as an infra commit, a
default-deny policy and Flux tenancy per namespace, two resource kinds in
one envelope; every bug from any account or alert starts a task, `auto`
needs the review's approve and strict_improvement true plus a reproduction
that fails at base and passes at head or the agent's fault note, the
poster's text as untrusted information, request_info with a 14-day close;
every factoryd model call through the gateway; OpenTelemetry from all three
binaries with the audit rows as scrubbed log records and one redact package;
node telemetry, the Job-failure alert on the failure event, tiered retention
with S3 cold storage; project alert rules as project code applied by one
platform job. What Stage 8 leaves for Stage 9 is in the handover.

Stage 8 step zero, agreed with Sebastian on 2026-09-28: factory
instrumentation. What the Stage 7 session lacked: pipeline and roll durations
as metrics, a per-task timeline of gate durations, visible progress from
long-running work, and a log line per applied migration. The plan: (1) main
CI and PR check durations, CI queue time, build VM lifetime and roll-to-live
time as OpenTelemetry metrics from factoryd into SigNoz, with one dashboard
as code; (2) the task timeline records the start and end of every gate and
the console shows the durations per task; (3) a factoryd log line per applied
migration and per policy version (done in Stage 7's final fix wave); (4) the
three hand steps of the rebuild recipe become Flux-managed CronJobs: the
OpenBao auth role, the Forgejo push mirrors to GitHub, the console OAuth app
secret. Sebastian's steer: every stage gets a check when it appears to stall,
the bounds are configurable, and the factory counts its alerts and how many
were real problems, so the bounds can be tuned from data. Controller
monitoring reads the subagents' transcripts instead of asking agents for
heartbeats. About three days.

### Stage 9: self

Goal: the factory works on its own repositories, the portfolio claim from goal.md.

Steps: grant the `coder` class scoped access to `factory` (never `infra`), let real issues drive real changes, model review escalation from architecture 11: a failed review verdict escalates the task, back to the worker with findings or to a human, rather than dead-ending, grow the capability classes beyond `coder` as the loops need them (analyzer, integration tester, release agent; architecture 6), add the self-improvement analytics from architecture 11, evaluate SPIRE and OPA only if a need appears that the current design fails to cover.

Exit test: an agent PR to `factory` merges under the same policy a human change would face, with the audit trail complete.

Steps, amended 2026-09-28 with Sebastian (rulings 176 to 188 in the ledger,
the discussion in stage9-answers.md). What the plan's steps asked for is
partly built: agents have worked on the code repository from a fork with
per-task tokens since Stage 6, a review verdict of `concerns` ends at a
human card and never dead-ends, and no need for SPIRE or OPA appeared (one
cluster, projected service account tokens, nine policy sections read by Go
code). Stage 9 adds: configuration as files, factoryd reads its
configuration tree straight from the infra repository with the commit as the
version, a generated JSON Schema for IDE completion and a CI check, every
limit in one `limits` section, per-project settings as files, and Git as the
editing surface with a read-only console; Kubernetes stays the substrate and
none of the factory's own files carries its vocabulary; the workflow as an
ordered list of stages with one `on_findings` setting each (agent, human or
fail), so the review's `concerns` goes back to the agent first, a repeat
from the same stage takes the stronger model, and the session cap is the
round cap; the factory as a normal project, every project row with the same
settings and flows, one setting for who owns the repository objects (the
factory or the seed) and one for agent access (the infra repository has
none), no repository name in code; the roll as a factory task, a digest
pull request that factoryd opens, a card, the bot's merge and a roll row per
image; alerts on the factory itself routed by the namespace label like any
project's, with rules as code; model tiers in LiteLLM across z.ai, Alibaba,
DeepSeek and Groq, ranked by measurement, the role aliases mapped onto
tiers, the answering deployment in the audit row; the `analyzer` class with
a report session mode for the improvement lane; a reusable, switchable
screening stage, on for outsider bug reports; four task metrics with a
revert mark and panels; the supervisor timeout at 6 minutes; the open
defects of Stage 8 fixed by the factory's own agents as bug issues, the
first of them the blocked gateway key. Subagents build the machinery, the
factory fixes the defects. About 10 subagent days.

Exit test, amended 2026-09-28: all on the factory's own code repository, in
one session, with a human doing card clicks only. The open defect "Key is
blocked" is filed as a bug issue, fixed by an agent task through the
checks, the gates and the review, merged on `human` through the card,
rolled by the roll task's pull request and card, and proven fixed live; five
more open defects from the Stage 8 backlog are fixed the same way; one
review loop is seen live if one occurs; one alert on the factory files an
issue; one improvement issue is written up by the lane; and the audit trail
is complete for every task: every model call audited, the spend equal to
LiteLLM's to the last digit, the timeline, the alert rows, the roll row.

Closed 2026-09-29. The rebuild that opened the stage ran from 07:29Z to
08:16Z, the platform whole after 29 minutes, and the step-zero gate passed
with the spend equal to LiteLLM's to the last digit (EUR 0.01831564 over 17
rows). Landed, rolled and proven, with rulings 176 to 195 in the ledger:
Task 72, configuration as files (ruling 183): factoryd reads the tree
`factory/` from the infra repository's `main` every 30 seconds
(`policy.yaml` with a `limits` section, `projects/<name>.yaml`,
`workflow.yaml`), the commit is the version, every task pins the version it
started under, a JSON Schema generated from the Go types, `factoryd config
check` as a CI job on the infra repository, and a refused commit keeps the
old version and files a `config_rejected` issue in the human lane (proven
with a bad push and its revert, versions 155 and 156); Task 73, the factory
as a normal project (ruling 179): every project's settings from its file,
`objects: factory | seed` and `agents: coder | none`, the infra repository
on `agents: none` (`POST /tasks` answers 422, infra issue #4 ran in the
human lane), no repository name in code; Task 74, the workflow as an
ordered list of stages with one `on_findings` setting each (rulings 177,
190), the review loop, the `analyzer` class with its `report` session mode,
the improvement presort and the screening stage for outside accounts on the
stronger rung (rulings 182, 185, 191); Task 75, the roll as a factory task
(ruling 178): from 13:10Z every roll was a pull request the roller opened,
six merged through the card (#185, #188, #190, #192, #202, #213), a newer
commit folded into an open roll at 14:06Z, and the roll watcher records a
row per image; Task 76, alerts on the factory routed by the namespace label
(ruling 180), ten rules as code, and a fix to factoryd's admission policy
that keeps it out of the infra-owned namespaces; Task 77, model tiers in
LiteLLM (rulings 181, 189, 192): tier-high holds zai/glm-5.3,
dashscope/qwen3.8-max and deepseek/deepseek-v4-pro at equal weight for
`supervisor`, `review-frontier` and `coding-frontier`, tier-low serves
`coding-cheap`, no fallback crosses a tier, the audit row names the
deployment that answered, and Groq left both lower tiers after it refused
multi-turn sessions; Task 78, four task metrics, the revert mark (live:
demo-app #6 marked reverted by #11) and four panels (ruling 185); Task 79,
backlog items 23, 27, 44 and 45, memory limits set from measured cgroup
peaks; Task 81, every exhaustion of the session loop opens the card, and a
repeated supervisor trip takes the stronger rung (ruling 193); Task 82, the
work guide states the sandbox contract; and from the lane itself, six
merged fixes (backlog 26, 3, 32, 4, 49, 63). The controller's fixes during the
run: the supervisor timeout at 6 minutes (ruling 186), the sandbox limit at
4Gi with an 8Gi namespace ceiling after three sessions died with their
unpushed work (1cd22b8), a resumed session whose branch already holds the
work counts as a pushed result (f870bdb), the ModelReview bound at 360 s
(infra 0c86925, ruling 194), and the "Key is blocked" fix landed from the
lane's pull request (c6f374a, ruling 195). Exit test run on 2026-09-29
(task 80, 14:29Z to 16:10Z), passed with two deviations. Step 1, deviation
(ruling 195): the "Key is blocked" fix came from agent task #203 through
the checks in pull request #209; the task ended at its wall-clock cap on
one gosec line, the controller added that line and pushed c6f374a, and roll
task #213 took it live through card 104 at 16:02Z; no key was blocked
after that roll (#216 took three answered supervisor calls), the planted
restarts at 16:02Z cut #214's running attempt twice and it resumed and
pushed, and the planted bound trip was not run.
Step 2 passed: five more backlog items (26, 3, 32, 4, 49) went through the
lane end to end, pull requests #200, #208, #206, #207 and #211, merged by
`factory-merge` after the card and rolled in #213. Step 3 passed live: #214's
review answered `concerns` at 16:18Z (the agent had committed its scratch
test, the defect the task fixes), the findings went back to the agent, and
the second review approved at 16:34Z; pull request #217 merged as f333477.
Step 4 passed: factoryd's restarts filed code issues #193 and #216, each
starting an agent task, and a failed platform Job filed infra issue #5 in
the human lane; the gateway's 5xx alert #210 was real but came out `noise`
(backlog 64), and #215 was a false "roll not live" alert (backlog 67).
Step 5 passed: improvement #178 was written up by the lane. Step 6,
deviation (backlog 66): every model call has its audit row, 31 to 87 per
task, `spent_eur` equals the ledger on every task and LiteLLM's key spend
on five of seven, and the other two book calls cut by the gate at their
hold. The bug lane: 11 issues filed by the controller on seven backlog
items (1 three times, 4 and 49 twice, 3, 26, 32, 63 once), five merged by
the lane, one landed by the controller, five failed (one at the round cap
before ruling 193, four at the wall-clock cap, two of them after sandbox
memory kills), and #214 (backlog 63) merged after a concerns loop; EUR 2.92 over the
eleven finished tasks, EUR 1.30 of it on the six merges. The first
round of six issues produced one merge; the controller fixed four
machinery defects before the second. Measured: checks 2 min 24 s to 8 min
41 s, a review 4 s to 1 min 27 s (210 s once, cut at the old 180 s bound),
an approval click 31 s to 1 min 56 s, a merge 1 s, a session 17 s to 7 min
51 s. Standing contracts from this stage, all in the ledger as rulings 176
to 195: configuration and processes as typed files in the infra
repository, Git as the editing surface and the console read-only, the
commit as the version and a pin per task; Kubernetes as the substrate only;
findings from any stage go back to the agent, to the card or fail the task
as the stage's setting says, a repeat from one stage takes the stronger
rung, and the session cap is the round cap for every exhaustion; the
factory as a normal project; the roll as a task with a card; alerts on the
factory by namespace label; model tiers by quality, ordered by latency
inside a tier, never crossing tiers; the screening stage on the stronger
rung; four task metrics and a revert mark; a defect that blocks the lane
itself is landed by the controller from the lane's pull request, once.
Sebastian's ruling 196 at the close, "settle down": a task past the settle
window is set to LiteLLM's final figure once (code 7dc76e8, migration
0034, not rolled). The close itself went wrong: at 17:57Z the controller's
`tofu apply` for a second home-address change of the day replaced the
three nodes, because `hcloud_server.node` takes its `user_data` from the
Talos config files the morning's recovery had told the controller to edit,
and the controller applied a plan that said "6 to add, 6 to destroy"
without reading the replacement lines. The fresh nodes had empty disks;
the close's backups could not be taken. What survived: the CNPG generation
v8 in S3 with its base backup of 07:42Z and WAL segments to 17:52Z (every
database, so every table of the exit test), every repository on this
machine and on GitHub, demo-app's tree. Lost: SigNoz's data, OpenBao's
raft since Stage 8 (re-seeded), Forgejo's git storage (re-pushed at the
rebuild) and the merge commits of demo-app #11 and #12. The README names
the trap; the next rebuild's step-zero gate is the test of the recovery.
What Stage 9 leaves: backlog items 58 to 68 in stage9-backlog.md as the
next bug lane (66 closed by ruling 196), the Stage 8 items not yet worked
in their lanes, the thirteen accepted risks (14, 16, 21, 22, 30, 31, 41,
46, 48, 50, 51, 53, 54), and the proofs the exit test left open; the
handover lists them.

After Stage 9, at Sebastian's explicit wish that neither is forgotten
(ruling 188): messages into a running agent session and agent-to-agent
interaction, through the harness's serve mode, about 1.5 days; and a final
security audit stage whose findings always go to a human.

Also after Stage 9, at Sebastian's wish (2026-09-29), from the harness
discussion (research-harnesses.md and stage10-queue.md in the ledger
folder hold the evidence and the detail): seven items. Stage 10 built the
headless config, the loop nudge and the housekeeping, and the rest are in
[the roadmap](../roadmap.md).

A UX phase after Stage 9, at Sebastian's wish (2026-09-29), from the
market research: the kanban board stays the one interface, every new view
opens from a card. Its items (the live task page, inline diff comments back
to the agent, progress on the issue, "I am going in", the board patterns)
are in [the roadmap](../roadmap.md).

Also after Stage 9, from the market research's worker, credential and
policy items Sebastian accepted (2026-09-29, detail in stage10-queue.md
section I): nine items. Stage 10 built five of them (Task 89), and the
rest are in [the roadmap](../roadmap.md).

### Stage 10: hardening

Settled 2026-09-29 at the Stage 9 close (rulings 197 to 199), on
Sebastian's steer: hardening, security, small incremental improvements and
bug fixes first; the larger items of the lists above (the UX phase, the pi
adapter, parallelism, setup snapshots, no credential in the pod, composite
attribution) wait for his scoping and are Stage 11 at the earliest. The
handover `handover-stage10.md` in the ledger folder holds the round in
full; the ledger holds the rulings.

Steps: the rebuild with the recovery from CNPG generation v8 and the
re-push of every repository from the controller's machine (the test of the
close's recovery), the step-zero gate with the mirror check; Task 85, the
security audit stage of ruling 188 (`on_findings: human`, an analyzer
session on the stronger rung over the diff with a fixed checklist); Task
86, the merge path (a model review with a verdict for every risk class,
backlog 68; the roller's registry read on a read-only package token;
backlog 56 checked); Task 87, opencode's headless config hardened (the
`question` tool removed, a step cap from `limits`, denials the model sees);
Task 89, the small hardening items accepted from the market research
(credentials minted inside activities and a history scan for tokens, deny
hides the tool, stricter wins, protected files as `high`, sanitised text
in and out); the bug lane by the factory itself from the gate's first roll
on (backlog 58, 59, 61, 62, 64, 65, 67, then Stage 8's 2, 8, 9, 11, 18, 20,
24, 25, 29, 33, 34, 37, 47 and demo-app 15, 17); last, Task 88, message-in
in its smallest form (one adapter call, opencode's serve mode on one port
only factoryd reaches, the loop nudge as its first user), the item ruling
188 asked not to forget; the answer chain only if 88 lands with days to
spare.

Exit test (ruling 199), on the factory's own repository, a human clicking
cards only: the recovery brings back every table of Stage 9's exit test
and Forgejo's issues and pull requests; a planted secret in a test file
reaches the card with the audit stage's finding and a clean pull request
passes; a migration-class pull request gets a model review with a verdict,
and a review without a verdict goes to the card as a finding; five
bug-lane fixes merged through the card and rolled, with cost and gate
durations; one loop nudge into a running session that changes its course
and one repetition trip after a nudge that did not help; the audit trail
complete, the ledger equal to LiteLLM's figure on every finished task after
the settle window (ruling 196). Fallbacks named in the report: a planted
pull request for the audit and the review cases; the nudge reported as not
built if Task 88 does not land.

Closed 2026-09-30. The rebuild that opened the stage ran from 19:43Z on
2026-09-29 and was the test of the Stage 9 close's recovery: CNPG recovered
generation v8 into v9 with every WAL to 17:52:36Z in 2.8 minutes, and every
table of Stage 9's exit test came back (tasks 160, audit 3213, ledger 1986,
alerts 73, rolls 34). Forgejo came back with its database and without its
git storage, since the close took no dump: an empty bare repository per
row, the re-push of code, infra, docs and demo-app from the controller's
machine, the pull request refs of 19 merged pull requests restored from
their merge commits, and the push mirrors created again. OpenBao was
initialised fresh and re-seeded. The step-zero gate passed at 20:30Z with
the spend equal to LiteLLM's to the last digit (EUR 0.008096722 over 8
calls) and `github/main` equal to Forgejo's for code and infra; the gate's
roll went live at 20:37Z and its lane task merged at 20:57Z. Landed, rolled
and proven, with rulings 200 to 204 in the ledger: Task 85, the security
audit stage of ruling 188: stage `audit` between review and approval,
`on_findings: human` only, switched on per project, a secret pre-check on
the diff's added lines and one call on the class's `audit_model`
(coding-frontier, ruling 200) with a six-item checklist, findings to the
card and never to the agent, and no verdict counted as a finding; Task 86,
the merge path: a review without a verdict is a finding on the card, never
a pass (backlog 68, change id `review-verdict`), the roller reads the
registry as a read-only package user, and the untrusted PR job's OIDC
variables proven empty with a check that fails if they are not (backlog
56); Task 87, opencode's headless config: the `question` tool hidden, a
step cap from `limits.steps`, `doom_loop` on allow and denials the model
sees; Task 89, the small hardening items: no credential in any workflow
history (a whole task's 54 payloads scanned), a denied tool hidden from
`tools/list` and still refused, stricter wins for project files, protected
files in the `high` class, and one sanitiser for untrusted text into the
brief and agent text out to Forgejo, with every agent commit squashed onto
the session's start with a sanitised subject; Task 88, message-in in its
smallest form: a `Message` call in the adapter contract, opencode under
`serve`, a port on the worker pod only factoryd reaches with a
per-session bearer, and the loop nudge after three identical calls as its
first user, counted from the session's event stream (ruling 202); Task 91,
one model provider (ruling 204): the three tiers on Alibaba's Qwen 3.8 max,
3.7 plus and 3.8 flash, one deployment each, retries without a cooldown,
and a LiteLLM proxy budget of 55 USD a month behind the factory's cap; and
Task 92, the month cap: `budget.month_eur` 50 over every project and the
factory, a task that meets it parks at a human card
(`refused_month_cap`), alerts at 50 and 80 percent and an infra issue at
the cap. The bug lane, run by the factory itself: 28 issues on 26 backlog
items, 25 merged through the card (23 on the code repository, 2 on
demo-app), every code merge rolled by 01:29Z on 2026-09-30, 3 failed and
each refiled and merged; EUR 3.55 over the lane, EUR 1.91 on the merges,
19 of the 25 in one cheap session. It fixed Stage 9's own findings (58, 59, 61,
62 as a re-run of an unchanged red head once, ruling 201, 64, 65, 67),
Stage 8's items 11, 20 (a per-project egress host list in place of `world`
on 443), 24, 25 and 29 and demo-app's 15 and 17 (ruling 203 closed 2, 9 and
33 and accepted 8, 18, 34, 37 and 47), and the round's own findings 69 to
76 and 89a, among them a merge conflict sent back to the agent (70) and
the spend repair (73). Exit test run on 2026-09-29 and 30 (task 90), passed
with named fallbacks and deviations. Step 1 passed with deviations: every
table and every issue came back, #179 to #181 excepted (purged with an
outside account before the close), and task-80-report.md's own counts
held three errors. Step 2 passed: the planted PEM key in a test file
(#241, PR #245) reached card 147 with the pre-check's and the model's
findings, and a clean pull request (#252) passed with `clear` in 2 s and
merged. Step 3's first half passed live: the migration-class pull request
#249 reached its card with the review's verdict, the migration finding and
an audit finding, and lane #281 did the same on a real migration; the
planted 2 s review bound (#288) did not yield a review without a verdict,
because the review finished before the gate supervisor's answer (ruling
171's race), so the second half rests on the fallback: Task 86's tests and
the live no-verdict audit finding on #276, whose audit call died with a
roll's gateway restart. Step 4 passed: backlog 58, 59, 61, 64 and 65
merged through the card and rolled first, with cost and gate durations,
and 20 more followed. Step 5's first half passed live: demo-app #22's
session ended pushed after the nudge, and #24's model changed its command
right after its nudge; the trip after a nudge that did not help happened
live through `no_write`, and the `same_call` trip after a nudge rests on
unit tests, since the planted proof's model reasoned its way out. Step 6
passed with two defects that the lane then fixed and rolled: every model call has its
audit row except one cut by a roll (backlog 74), the ledger equals
LiteLLM's figure on every task past the settle window, and the final
settle pass had doubled `spent_eur` on 41 tasks from before the ledger
(backlog 73, +4.84 EUR, the ledger itself right); since the fix
`spent_eur` is set from the ledger sum, and after the repair migration no
settled task's spend differs from its ledger. The final check of every
Stage 10 task after its settle window, at 03:43Z on 2026-09-30: all 221
finished tasks settled, `spent_eur` equal to the ledger on all and to
LiteLLM on every task with a key. Measured on the 25
merges: checks 2 min 44 s (demo-app) and 4 min 46 s to 12 minutes (code),
a review 4 s to 2 min 56 s, an audit 2 s to 1 min 13 s, an approval click
8 s to 6 min 11 s, a merge 1 to 2 s, a session 13 s to 7 min 53 s, issue
to merge 5 min 37 s to 36 min, median 16 min; a roll from merge to live
11 s to 3 min 13 s. Under the proofs and the lane together the throughput limit
showed: eight CI runners and two build VMs queue the image builds, and a
roll that folds every lane merge restarts its build and trips its 10-minute
checks bound (three times on one roll). Model spend of the round through
LiteLLM, rebuild included: EUR 6.14 over 1950 calls. Sebastian's two
additions after the Stage 9 close, one model provider and the month cap,
were found late: he added them to the handover at 20:34Z, after the
controller had read it once, and they surfaced at 00:4xZ; until Task 91
landed at 00:56Z every tier spent on three providers and only `day_eur`
bounded spend, about EUR 5.9 by then. Both were applied that night (ruling
204): the proof window at 18 EUR, below September's 18.26, parked a
planted task at its card with spend 0 and filed the infra issue. Standing
contracts from this stage, in the ledger as rulings 200 to 204: the audit
stage on the task class's `audit_model`; a red head the agent left as it
was re-runs its checks once before its findings go back; the loop nudge
counts from the harness's event stream; the Stage 8 lane items settled as
built, closed or accepted; one model provider, Alibaba, and a month cap of
50 EUR on all variable spend with a LiteLLM budget behind it. What Stage 10 leaves: an empty lane queue, the
month cap's 50 and 80 percent alerts to see in October's first days, the
accepted risks, the open proofs of task-90-report.md, and the rotation of
the Forgejo admin password, which reached two local transcripts; the
handover `handover-stage11.md` lists them.

A second round of accepted items (2026-09-29, detail in stage10-queue.md
section J, revisit-later items and rejections in architecture 10):
thirteen worker, budget and dispatch items, now in [the
roadmap](../roadmap.md).

The UX phase also gets a stop button on the card that closes the issue.

A third round of accepted items (2026-09-29, detail in stage10-queue.md
section K, revisit-later items in architecture 10): fourteen items on
configurable pipelines, verification, signals and the gateway, now in [the
roadmap](../roadmap.md).

After Stage 10: Stage 11 below, settled with Sebastian after the close.
Every other future topic is in [the roadmap](../roadmap.md).

### Stage 11: building software from a spec

Settled 2026-09-30 after the Stage 10 close (rulings 205 to 208). The
factory so far fixes and improves
existing code; this stage makes it build a new application from a written
spec, with several agents in parallel. Sebastian's principle (ruling 206):
no fixed development process, only primitives, each a plain YAML block with
a schema and a fixed list of options, composed by the user and checked by
`factoryd config check`, which refuses a composition that cannot work.

Steps: the rebuild and the step-zero gate; a design task for the primitives'
YAML, schemas and refusals; then a new project from the console (a button
that opens a pull request on infra, ruling 183 kept, with a loading
indicator, step status and tooltips); board lanes Backlog and Ready as
configuration; a planner class whose accepted plan factoryd turns into
child cards with dependencies; "Start plan", with a card that waits on its
dependencies and starts by itself; a foundation card first and an
integration card last; `merge.queue` per project; collision-free numbering
for migrations and change ids; the checks stage on an empty repository and
Node in the worker image and CI.

Exit test, in outline: on a new, empty project, one spec card for a link
shortener with a TypeScript single-page frontend and a Go API becomes a plan
of about ten cards, at least four agents work in parallel, the merge queue
lands them, the integration card passes and the app deploys to staging,
with no controller code in the new repository and a human clicking cards
only.

Closed 2026-09-30. The rebuild that opened the stage was the first clean
recovery: CNPG recovered generation v9 into v10 with every WAL to the
close in 2.3 minutes, Forgejo came back from its dump with every repository
and pull request ref, OpenBao from its snapshot, and nothing was set by
hand but one empty commit to start main CI. The step-zero gate passed at
09:04Z. Its lane task merged at 10:35Z as the fourth filing (#325, the
SigNoz alert text through the sanitiser, roadmap 48 in part) after the
controller's own drafts had failed #321 and #324: closing keywords, an HTML
comment and a zero-width space in the test fixtures, which the inbound
sanitiser neutralised before the agent read them. Landed and rolled in
four rolls (517e29f, f6016eb, 2a4bbb0, 5e6119e) and the infra pin 0213ad7,
Tasks 93 to 104. Task 93 was the design (stage11-design.md, after two
review rounds). Task 94 made processes YAML blocks in infra's
`factory/processes/`, with `factoryd config check` and its 61 refusal
subtests (schema, names, needs in order, the graph and the floor rules F1
to F11) and `factoryd config explain`. Task 95 made the engine read each
task's process from its pinned version (change id `processes`), deleted
`workflow.yaml` in one infra commit that the old factoryd refused and the
new one loaded, and made `Merge` refuse a head without green checks
(`merge_red_head`). Task 96 named migrations by UTC timestamp and change
ids by name, each held by a test, and put Node 24 with npm into the
sandbox and runner images. Task 97 built the lanes backlog, plan and
ready, with `moved_by` judging every entry. Task 98 recorded the five
events, refused a head that removes a lane still holding open cards, and
added the labels `process` and `lane` to the task metrics. Task 99 put
templates into `factory/templates/` and made registration seed the empty
repository, proven live on a scratch project. Task 100 made cards wait on
their dependencies (`waiting-deps`), with a human card on a failed one.
Task 101 built the planner class, plan revisions, the approval kind `plan`
and `CreateChildren`. Task 102 built the merge queue per project with
`SyncWithMain`. Task 103 gave the console lane columns, moves, the plan
card and Start plan, and Task 104 the new-project button and its status
panel. Exit test run on 2026-09-30 (Task 105, ruling 210), passed at
18:16Z, 6 h 12 min into the 7-hour window. The button's infra pull request
merged from the panel, and registration seeded `linkshort` from template
`ts-go`. The planner answered 9 cards, took one change request and
answered 10, which the human accepted, and factoryd filed them with 25
dependency rows. One Start plan click started the foundation, and the rest
waited on it. The peak was 4 sessions at once at 13:08:52Z, held 10.8
minutes. 14 merges went through the queue by the step's count, 15 by the
end, and no two turns overlapped. 6 were synced with main, below the
design's half, since main seldom moved in a mostly serial run. A1 to A9
pass under `-race` on main, the staging smoke passed (health, the app
page, sign-up, log-in, a link, its redirect and its clicks), and main holds
commits by `factory-projects`, `factory-agent` and `factory-merge` only,
none by the controller. The cost was far above the design's. 12 of 28
tasks failed, 11 at the 20-minute wall-clock cap, and the controller filed
17 refile, split or fix cards as the human (ruling 211), answered 20 cards
and made 3 acts outside the console. The causes, by cost: the cheap tier
looped on probes, library sources and tool installs within 20 minutes (58
sessions: 18 pushed, 23 supervisor redirects), finished work was discarded
at the cap (backlog 80, 88), the kubelet evicted 5 sessions at the `home`
emptyDir's 1 GiB (backlog 82), gosec and `-race` run only in CI and the
finding carries no log (backlog 85, 86), and the template seeded no deploy
skeleton for Pod Security `restricted` and the registry pull secret, so
staging ran no pod while its CI job read green, until two fix cards
(backlog 89). Spend: linkshort EUR 5.99, the day EUR 7.33, the month EUR
24.33. Standing contracts from this stage, in the ledger as rulings 209 to
211. Infra `main` needs 0 approvals, so a console-authored pull request can
merge, and sebastian stays its only pusher and merger. The exit test ran
as designed, with its named fallbacks. A plan card that fails at a cap is
refiled by the human in cards that fit one session, and its dependents are
answered in the plan's order. The round's findings are backlog 77 to 89,
now in [the roadmap](../roadmap.md).

After Stage 11: Stage 12 below, a series of short bugfix rounds settled
with Sebastian after the close (ruling 213). Every other future topic is in
[the roadmap](../roadmap.md).

### Stage 12: bugfix rounds

Settled 2026-09-30 after the Stage 11 close. Ruling 213, Sebastian's: the
next rounds are short bugfix rounds, no features, until the factory builds
the Stage 11 test software reliably and quicker, with fewer loops and gates
rather than more. Each round ends with that build as its test: linkshort
from the same spec (exit11-spec.md) on a fresh project, with no refile, the
human's clicks only the plan and the approvals, in under three hours,
measured in time, refiles, clicks, failures and spend, and the next round
fixes what it shows. The work of round 1 was the Stage 11 root cause
analysis's seven suggestions, with Sebastian's rulings 212 and 214 to 217
of the same evening: no human types a password for an internal service,
the sanitiser for outsiders' text only, a board he can watch live, an
agent-time cap of hours with a periodic check-in in place of the half-way
check, check-ins and detectors that message the running session instead of
ending it, and the cap and the check-in configurable per class, process and
project.

Round 1 ran on 2026-09-30 and 2026-10-01. The rebuild recovered generation
v10 into v11 to the close's last transaction, brought Forgejo back from
its dump and OpenBao from its snapshot, and passed the step-zero gate at
22:29Z: the gate's roll of 2060cdf live at 22:16:58Z, and its lane task,
the board's 3-second refresh (Task 107, ruling 215, code #342), merged in
one session, with its 14 ledger rows equal to LiteLLM's at 0.01137014 EUR.
Task 106 was the design (stage12-design.md), with six open questions ruled
as 218 to 221. The tasks:

- Task 107, the board refreshes every 3 seconds (the gate's lane task).
- Task 108, the sanitiser for outsiders' text only (ruling 214, backlog
  90): hidden comments stripped outside code blocks, no neutralising on
  the way in, a writer's text as written. Built by a subagent, not the
  lane, since its test data is the very text the old sanitiser rewrote.
- Task 109, registration from OpenBao (rulings 212, 219): the reconcile
  registers with the admin's login read from OpenBao, and the console's
  password field and register click went.
- Task 110, agent time and check-in per class, process and project
  (rulings 216 to 218).
- Task 111, the supervisor's continue, message or escalate, with its
  message delivered into the running session, the check-in in place of
  half way, shell writes counted, and one stuck rule (ruling 224).
- Task 112, finished work kept at every cap, one cap card, a change
  request at the cap as the answer (ruling 225), and first sessions from
  main's head (change id `keep-work`).
- Task 113, the per-project cache volume for sandboxes and CI, with Go's
  module cache per pod (ruling 223); Task 113b moved the cache to its own
  exec-capable node path and kept main CI off it (ruling 226), after a
  warm cache segfaulted the second `go run` of gosec on scratch12.
- Task 114, gcc, make and python3 in the worker image, and evictions
  recorded as such.
- Task 115, the failing job's log lines in the checks finding, read
  through the bot's web session, since Forgejo 15.0.9 serves job logs to
  no token.
- Task 118, the alerts endpoint's digest query, which the template's
  staging job waits on.
- Task 119, the template `ts-go` that works out of the box, with its
  `check` (ruling 222: CI fails a `check` that drops gosec or
  `go test -race`).
- Task 120, the guides: bash check, then end; named tests; cards sized by
  what they produce; the foundation's contracts.
- Task 122, the gateway's 499 for a caller's cancel, after an alert on 502s
  from sessions the supervisor ended filed code #348 (debug-gateway-5xx.md).
- Tasks 116 and 117, `run_checks`, were not built (ruling 221): the
  sandbox runs the same `bash check` CI runs.

Three rolls carried the code. Roll 1, be962f6 (Tasks 109, 113, 114, 118),
was live at 23:05Z (roll #346, pull request #347), after the infra commits
that it needed first: the StorageClass `factory-cache` (d9f3fa3, 78f857e)
and OpenBao's kv mount, policy and role with the seeded admin login
(04d932d, 4084d88), applied by the bootstrap and the seed by hand. The
template followed on infra (40c677d, 001e04a). Roll 2, of 026ded8 (Tasks
110, 111, 112, 115, 120, 108, the controller's guide fix 4506bbb and its
gosec fix 026ded8), was live at 00:10Z (#351, pull request #352), with the
time values on infra in the same window (6925852, d0fb868: agent time 2 h,
check-in 45 min, steps 1500, supervisor calls 6, the planner 30 min with
no check-in) and the config check's pin (72ac1cb). Its first roll task
#349 failed on gosec G104 in Task 115's code, which the implementer and the
landing had checked with vet and `-race` only. Roll 3, 549e32b (Task 122),
was live at 00:36Z (#353, pull request #354), with the pin bumped
(462d803). Ruling 226's cache path and main CI's env landed on infra as
61c4fde without a roll. The live proofs ran on a scratch project,
`scratch12` (infra 88b207d): the button and Merge registered it from
OpenBao with no password in 30 seconds, its seed's main CI went green
through staging with the pod on the run's digest (checks 4 min 11 s,
image 39 s, staging 39 s), and two smoke cards merged, one through a queue
conflict settled by a session that merged `main`.

Closed 2026-10-01. The round's exit test (Task 121, ruling 220) built the
spec on the fresh project `linkshort2`, beside `linkshort`, which stays
registered. It passed clean: no refile, no failed card, no answer to a
card and no cap card. From the button at 00:36:50Z the planner's seven
cards (foundation, auth, links, stats-qr, ratelimit, frontend,
integration) were all merged at 1 h 43 min and staging served `main` at
1 h 52 min. Against Stage 11's exit test: 1 h 43 min to all cards merged
where Stage 11 took 6 h 12 min with its fixes; 0 refiles, splits or fix
cards against 17; 0 of 8 tasks failed against 12 of 28; 12 human clicks
(the button, the project's Merge, the spec card, Accept plan, Start plan
and seven merge approvals) against about 45, most of them answers and
refiles; 12 sessions against 58, four of them a short session merging
`main` after the queue found a conflict; 6 supervisor trips, four
messages into the running session and two continues, with no restart and
no stuck end, against 30 redirects that each ended a session; 0
evictions against 5; a peak of 5 sessions at once against 4; and 1.69 EUR
against 5.99, on the cheap tier throughout, so the stronger tier was not
needed for coding cards (suggestion 7). The foundation finished in one
session of 19 minutes where Stage 11's failed at the 20-minute cap and was
split. The longest session ran 41 minutes, the auth card's, held on track
by two messages. A1 to A9 pass under `-race` on `main` 9e879d7, and the
staging smoke passes from a pod in the namespace. The run's findings, in
[the roadmap](../roadmap.md): every feature card conflicted once with
`main` on the template's one route list and spent a short session on it,
and staging serves only plain http in the cluster, so a `Secure` cookie
does not round-trip there. Standing contracts from this round, in the
ledger as rulings 218 to 226: agent time 2 hours, check-in 45 minutes,
1500 steps and 6 supervisor calls by default, the planner 30 minutes;
registration in the reconcile with no human step; `run_checks` only if a
run shows a failure CI found and `bash check` could not; a repository's
`check` the agents may extend and not weaken; Go's module cache per pod;
the supervisor chooses only continue, message or escalate, and the stuck
rule in code climbs the rung; a writer's change request at a cap is the
answer; the cache class on its own exec-capable node path, and `main` CI
off the shared cache. At the close Forgejo's self-registration, open since
the start (no `[service]` section in its configuration), was switched off
(infra a668a94); every factory repository and organisation is private.
Ruling 213's goal is met in round 1.

Round 2 ran on 2026-10-01, ruled by Sebastian as 228 (round2-proposal.md
with every recommendation taken) and closed by this build. The rebuild
recovered generation v11 into v12, passed the step-zero gate (the gate's
roll needed a second try: the first failed at its own checks, root-caused
as gVisor's gofer permission-checking an open of a 0644 file another
sandbox wrote on the shared build cache — fixed by umask 0000 in the two
containers that mount a project claim, ruling 241), and the lane task
proved the content-filter escalation end to end with its ledger spend
equal to LiteLLM's to the cent. Ruling 227's account work landed first
(Task 123, rulings 229 and 239): a machine admin `factory-admin` and the
controller's own account `controller` now hold every credential the
factory uses — the chart's admin, OpenBao's registration login, the seed,
both CronJobs, the OAuth app, the registry, Flux — and Sebastian's
account holds no token at all, so he may switch TOTP on whenever he
likes; the audit trail names the controller's clicks as its own. Forgejo
now requires a login to view anything (item 138) and probe_sent's two
repositories went private. The security review (Task 125, ruling 230)
walked every accepted risk and kept all of them, none reachable under
the agent-PR-outsider threat model; its one finding, demo-app's main CI
still sharing the warm cache with its untrusted PR jobs, was fixed the
same hour. Two rolls carried the build: Roll 1 the security half (item
40: the clone in an init container and the push token minted only after
the agent's processes are dead, proven live by scripts/agent-sees-no-token;
screening of an outsider's later answers; outsiders' text sanitised into
the review and both supervisors and activity errors scrubbed of every
secret factoryd loads; CPU and memory limits required by the admission
policy; a euro cap per project, drilled live), Roll 2 the flow half (the
answer slice as a quarter of the card's agent time; one route file per
feature in the template; Retry of a failed plan card, proven live end to
end after its missing wiring panicked in drill 2 and was fixed in Roll 3;
the roller comparing against the last merged roll; roll-window 5xx
alerts recorded, not filed; the content-filter refusal escalated at once;
cache and branch pruning with the claim-directory repair; the project
key `model: stronger`). The drills on scratch12 passed six of nine
clean, and the two failures became Roll 3's fixes: the Retry route's
nil wiring (now guarded by a test that every console function field is
wired) and the stuck rule's alternation memory, which a delivered
message used to clear, letting a circling agent buy message after
message for 38 minutes (ruling 224's intent restored: flip_flop and
churn stay armed across messages). The eviction drill found its wording
cannot make the cheap tier sit in the loop the kubelet needs to sample
usage, and that gVisor plus an emptyDir sizeLimit gives no write-time
protection — recorded; Stage 11's five real evictions remain the proof
of the recording. The next eviction drill (item 140, settled 2026-10-10
as the drill's wording, no factory change) keeps the over-limit pod
alive past the kubelet's volume sampling, which about 50 s did not
reach: the long-running allocation is the card's deliverable — a server
whose start fills /tmp past the 1 GiB sizeLimit and whose acceptance
holds it serving for over two minutes — or the fill comes from tooling
(an exec into the session pod), never from asking the agent to sit in a
sleep loop. The timed stronger-tier run built the linkshort spec
in 1 h 10 min for 3.99 EUR on a ten-card plan (the cheap tier's round 1:
1 h 43 min, 1.69 EUR, seven cards): a third faster at 2.4 times the
cost, with a review that caught real code-level defects the cheap tier
passed; the speed breakdown (Task 141) shows model wait at 58 percent of
session time and dependency waits dominating wall time, which no tier
touches. The exit test built two specs at once from the button —
linkshort3 from the Stage 11 spec and a new notes app spec (tags,
search, pinning, share links) — with no refile, no failed card and no
cap card, acceptance 9/9 under `-race` each and staging smokes passing;
one genuine design question (a root catch-all route against the
foundation's store hand-back) was asked well and answered with the
agent's own three-line fix. Its one finding became the round's last fix:
ruling 226 keeps main's jobs off the shared cache, and their cold caches
filled the runner pod's 1 GiB tmp emptyDir until the kubelet killed the
pod mid-run — tmp is now 4 GiB (ruling 242, Roll 4), and linkshort3's
rerun went green with staging rolling the digest. Standing contracts
from this round, in the ledger as rulings 229 to 242.

After Stage 12: the next scope is Sebastian's. [The roadmap](../roadmap.md),
"Next", holds what round 1 found, and every other future topic is there
too.
