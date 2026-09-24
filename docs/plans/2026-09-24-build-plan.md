# Software factory build plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the software factory from `docs/architecture.md` in ten stages, each with an exit test, from empty repos to a factory that works on its own code.

**Architecture:** Three Hetzner Cloud cpx42 nodes run Talos Linux with the built-in nftables firewall behind a Hetzner Cloud firewall. Flux deploys the platform services from Forgejo. Two Go services, factoryd and factory-gateway, hold the control plane. opencode workers run in per-task gVisor sandboxes behind the adapter contract (architecture 6.2).

**Tech Stack:** OpenTofu, Talos 1.14, Cilium 1.20, Flux, CloudNativePG, Temporal, OpenBao, LiteLLM OSS, SigNoz, Forgejo plus Actions, Go 1.25, cert-manager with Let's Encrypt HTTP-01.

**Spec:** `docs/architecture.md`

## Global Constraints

- Nothing is implemented before Sebastian's explicit go.
- No secret enters Git, ever. Secrets live in the seed bundle (offline password manager plus printed copy) or in ignored `.env` files.
- Nodes: 3x Hetzner Cloud cpx42 (x86, 8 shared vCPU, 16 GB, 320 GB), 69.49 EUR per month each net, verify orderability with a create-and-delete probe at order time, the API availability lists are unreliable. All three run control-plane and workloads.
- Talos 1.14, Cilium 1.20, OpenTofu (`tofu`). No SSH on nodes, Talos API only.
- Go module `github.com/sebastianrueckerai/ai-software-factory-code`, binaries `factoryd` and `factory-gateway`.
- New work happens in a git worktree. Every task ends with a commit to master and a push.
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

Each stage ends with an exit test. A stage starts only after the previous one passed. Stages 0 and 1 are fully tasked below. The plan for each later stage is written when the previous stage passes its gate, because later stages depend on what the earlier ones teach.

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

Standing reminder at every stage boundary from here on: the cluster costs about 210 EUR per month once Stage 1 orders the nodes, plus storage and model spend. Hetzner Cloud servers bill hourly and deletion stops the meter. Raise the shutdown question at every boundary anyway.

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
    # Kubernetes NodePort range; the Cilium connectivity suite probes it node to node
    - 30000-32767
  protocol: tcp
ingress:
  - subnet: 10.0.1.0/24
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
- 30000-32767: Kubernetes NodePort range, node to node. The Cilium connectivity suite probes a NodePort service on a node IP; without the range the probe times out.
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
curl -s -H "$HC" -X POST https://api.hetzner.cloud/v1/servers/$SRV/actions/enable_rescue -d "{\"ssh_keys\":[$KEY]}" >/dev/null
curl -s -H "$HC" -X POST https://api.hetzner.cloud/v1/servers/$SRV/actions/reset >/dev/null
IP=$(curl -s -H "$HC" https://api.hetzner.cloud/v1/servers/$SRV | jq -r .server.public_net.ipv4.ip)
```

`enable_rescue` fails silently (returns a null action) while the server is still `initializing`, and rescue boot needs the reset after the enable. Poll `GET /v1/servers/$SRV` until `status` is `running`, then run the two actions in the order shown (`/actions/reset`, not `power_reset`, which is not a route).

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
curl -s -H "$HC" -X DELETE https://api.hetzner.cloud/v1/servers/$SRV
curl -s -H "$HC" -X DELETE https://api.hetzner.cloud/v1/firewalls/$FW
curl -s -H "$HC" -X DELETE https://api.hetzner.cloud/v1/ssh_keys/$KEY
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

With the default capabilities the agents stay Pending: the `clean-cilium-state` init container dies with `unable to apply caps: can't apply capabilities: operation not permitted`. If a release is already installed with wrong values, the same sets go through `cilium upgrade --version 1.20.0 ...`; it merges the last release's values by default.

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
