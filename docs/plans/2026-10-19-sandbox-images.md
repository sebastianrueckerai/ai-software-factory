# Sandbox Images Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A project declares the tools its sessions need in `factory/images.yaml`; one trusted builder turns each declared image into a signed image; factoryd pins it through the policy tree, runs each card on the image it names, and a session that misses a tool asks for it, waits, and restarts on the new image.

**Spec:** [docs/sandbox-images-design-2026-10-19.md](../sandbox-images-design-2026-10-19.md), as amended by Sebastian's answers of 2026-10-22 below. Where the two differ, this plan's decisions hold.

**Revised 2026-10-22.** The first version (2026-10-19) assumed a demo-app project, factoryd commits to the policy tree, per-project CI with cosign on untrusted runners, and a slimmed base for every project. None of that holds today. Code maps of today's code: `.superpowers/sdd/2026-10-19-sandbox-images/survey-*.md` in the docs repo.

## Decisions (Sebastian, 2026-10-22)

1. **Pins live in the infra repo.** factoryd opens a pull request on `sf/ai-software-factory-infra` that changes only the `images` block of `factory/projects/<project>.yaml`, and merges it itself once it has checked the PR is images-only and the tree passes factoryd's own config check. Every other infra change stays human.
2. **One trusted builder.** A workflow in the code repo, on the trusted runner, builds every project's images from the project's declaration and signs them with a separate **images key**. No project holds a key. factoryd verifies project images with the images key and factory images with the factory key; neither verifies the other.
3. **Each project chooses its default image at the start.** A template ships `factory/images.yaml` with its `default`. The factory's own project keeps its image (today's `opencode-worker`) as its default and declares variants only. A project whose file declares no `default` runs the factory image.

## Controller rulings (each in the ledger with its cost)

- **The harness rides an init container.** Project images are built FROM a new slim **sandbox base** (`sf/sandbox-base`: Debian snapshot, git, curl, ripgrep, ssh, gcc, make, python3, PostgreSQL 17, user 1000), which carries no harness. Every sandbox pod copies agent-worker, opencode and the opencode bake out of the factory image (`WORKER_IMAGE`) through an init container. So a factoryd roll never makes project images stale; they rebuild only when the sandbox base or their declaration changes.
- **Image names:** project images live at `git.aisoftwarefactory.world/sf/sandbox-<project>.<image>`, tagged by a content key (`BuildKey`) over the declaration and the base digest. The dot cannot occur in either name, so the split is unambiguous.
- **Resolution reads the policy version in force at session start,** and the task row records the digest it ran on. (A task pins its policy version at start; a pin that lands while it waits is newer than that pin.)
- **A declared `default` that is not pinned yet runs the factory image.** Only a named variant that is not pinned parks.
- **No separate candidate check.** A card's gates run on the card's own image, so the first card on a new image proves it.

## Global Constraints

- Digest-only references at run time. Tags exist only as build keys in the store.
- Every build input comes from the store: apt through the dated Debian snapshot the base configures, every upstream file through the store's existing copy machinery (`scripts/upstream-files`, owner `upstream`, package = line name, version = sha256).
- At most `policy.MaxImages` (4) names per project; compressed size at most `policy.MaxImageBytes` (4 GiB), refused at pin time.
- The agent never builds, pushes or signs an image. It asks with `request_tool`; a card edits `factory/images.yaml`.
- The images key signs only project images; the factory key only factory images. Tests prove cross-key refusal both ways.
- No runtime installs; egress per image is the image's declared `egress` (the factory image keeps today's `sandboxRegistries`).
- House style: `go test -race ./...` green (PG-backed tests through `scripts/pg-test.sh`), gofmt, vet; hand-derived expectations; minimal comments; any Temporal workflow-shape change behind `workflow.GetVersion`.
- Code repo work in worktree `~/repos/worktrees/asf-code-images` (branch `sandbox-images`), infra in `~/repos/worktrees/asf-infra-images`. Implementers commit, never push.

---

### Task 1: The images file, its parser and its checks

Done in its own brief (`task-1-brief.md`): `internal/policy/images.go`, `ParseImagesFile`, `ImagesFile.Validate`, `MaxImages`, `MaxImageBytes`, values safe to render into a Dockerfile.

### Task 2: The sandbox base image and the harness init container

**Files:** `Dockerfile.sandbox`, `.forgejo/workflows/ci.yml` (job `image-sandbox`), `internal/factoryd/roll.go` (RollTargets), `k8s/factoryd.yaml` (env `SANDBOX_BASE_IMAGE`), `cmd/factoryd/main.go` and `internal/factoryd/runner.go` (Config), `internal/factoryd/runner.go` (`sandboxPodSpec`), `internal/factoryd/gates.go` (`reproPodSpec` clones the container: keep it working), `cmd/agent-worker/main.go`, tests beside each, `internal/reproducible/dockerfile_test.go` if it pins stage structure.

- [ ] **Dockerfile.sandbox:** a named stage `base` holding everything that is not harness and not stack: the Debian snapshot and PGDG apt setup and install (git, ca-certificates, tzdata, curl, ripgrep, openssh-client, xz-utils, gcc, libc6-dev, make, python3, PostgreSQL 17), `useradd worker` (uid 1000), the snakeoil and log removals, `ENV HOME=/home/worker`, `WORKDIR /workspace`, `USER 1000:1000`. The apt sources stay configured in `base` so images built FROM it can `apt-get install` from the same snapshot. The final stage becomes `FROM base` plus root steps for the harness (opencode, agent-worker, the opencode bake), Go and Node, and today's ENV block. The final image's content (tools, paths, env, entrypoint) stays as today.
- [ ] **CI `image-sandbox`:** also builds `--target base` and pushes `git.aisoftwarefactory.world/sf/sandbox-base:$SHA` (same builder, cache, `SOURCE_DATE_EPOCH`, `rewrite-timestamp`), and signs it with the factory key exactly as the worker image is signed. Both images under the one job status `ci / image-sandbox (push)`.
- [ ] **Roll target:** `{Name: "sandbox-base", File: "k8s/factoryd.yaml", Image: "sandbox-base", Deployment: "factoryd"}`; `k8s/factoryd.yaml` gains env `SANDBOX_BASE_IMAGE` (a digest reference; seed it with the current base digest after the first main build: until then the value is the worker image digest of today's pin, which the first roll replaces). `Config.SandboxBaseImage` (required, like `WorkerImage`). Read the roller's tests to see how a target is pinned and verified and follow them.
- [ ] **Harness init container:** every sandbox pod (session and repro paths both go through `sandboxPodSpec`) gets an init container `harness` running `WORKER_IMAGE` with `command: ["/bin/sh","-c","cp /usr/local/bin/agent-worker /usr/local/bin/opencode /factory/bin/ && cp -a /opt/opencode-home /factory/"]` (create `/factory/bin` first), a shared `emptyDir` volume `harness` mounted at `/factory` in both containers, and the main container runs `/factory/bin/agent-worker` (keep today's `cacheUmaskSh` wrapper). The init container gets the same security context and resource class as the main one. `sandboxPodSpec` gains an `image string` parameter for the main container; every caller passes `r.cfg.WorkerImage` in this task.
- [ ] **agent-worker:** finds the opencode bake relative to its own executable (`filepath.Dir(os.Executable())/../opencode-home/.config/opencode`) instead of the constant `/opt/opencode-home/...`, and prepends its own directory to `PATH` before it starts opencode, so `opencode` resolves to `/factory/bin/opencode` in any image.
- [ ] **Tests:** the pod spec carries the init container, the volume and the main image passed in; the repro pod's cloned `fetch` container still works with the volume; agent-worker's bake path and PATH from a temp executable path; `TestSandboxToolsAreTheImages` and `dockerfile_test.go` still hold (adapt them to the stage split, never weaken what they pin).
- [ ] **Commit:** `sandbox: a base image without the harness; pods take the harness from an init container`.

### Task 3: imagegen

**Files:** create `internal/imagegen/imagegen.go`, `internal/imagegen/imagegen_test.go`; `cmd/factoryd/` gains a subcommand `factoryd image` (`render`, `key`) beside `config check` and `schema` (read `cmd/factoryd/config.go` for the subcommand shape).

**Interfaces:**
```go
type Manifest struct {
	Tools  []string `json:"tools"`  // apt names then upstream names, in file order
	Egress []string `json:"egress"`
}
// BuildKey is "k-" + the first 24 hex characters of sha256 over the
// canonical JSON of spec, a newline, baseDigest, a newline, and Version.
func BuildKey(spec policy.ImageSpec, baseDigest string) string
const Version = "1" // bumped when Render's output changes for the same inputs
func Render(spec policy.ImageSpec, baseRef string) (dockerfile []byte, copies []byte, m Manifest, err error)
func StoreURL(u policy.UpstreamLine) string // https://git.aisoftwarefactory.world/api/packages/upstream/generic/<name>/<sha256>/<basename of url path>
```
- [ ] `Render` refuses a spec that fails `policy.ImagesFile{Images: {"x": spec}}.Validate()`. `baseRef` must be `<registry path>@sha256:<64 hex>`; anything else is an error.
- [ ] Dockerfile: `FROM <baseRef>`; `USER root`; if apt: one `RUN apt-get update && apt-get install -y --no-install-recommends <names...> && rm -rf /var/lib/apt/lists/*` (mirror the base stage's apt flags); per upstream line an `ADD --checksum=sha256:<hex> <StoreURL> /tmp/factory-inputs/<name>` then a `RUN` that unpacks archives into `to` (`mkdir -p`, `tar -xf ... -C <to> --strip-components=<strip> --no-same-owner`) or installs a plain file at `to` with mode 0755, and removes `/tmp/factory-inputs/<name>`; `ENV` per env key in sorted order with the value double-quoted and `\`, `"` and `$` escaped; if path: `ENV PATH=<entries joined by :>:$PATH`; `LABEL world.aisoftwarefactory.manifest=<json, quoted and escaped>`; `USER 1000:1000`.
- [ ] `copies` is the store copy list in `upstream-files.txt`'s line format (read `upstream-files.txt`'s header and `scripts/upstream-files`): one line per upstream line, package = name, version = sha256, file = basename, then URL and sha256.
- [ ] `factoryd image render -file <images.yaml> -name <image> -base <ref@digest> -out <dir>` writes `Dockerfile`, `upstream-files.txt`, `manifest.json`; `factoryd image key -file <images.yaml> -name <image> -base <digest>` prints `BuildKey`. Exit 1 with the findings on an invalid file.
- [ ] **Tests:** golden Dockerfile for a spec with apt, an archive line with strip, a plain file line, two env keys (one value holding `"`, `\` and `$`) and a path; `FROM` is digest-only; a tag-only base refused; `BuildKey` changes when one apt name, one sha256 or the base changes and is stable otherwise (hand-derive one exact key value); the copy line for one upstream line, byte for byte; the subcommands' output files.
- [ ] **Commit:** `imagegen: render a project image from its declaration; factoryd image render and key`.

### Task 4: The trusted builder workflow

**Files:** create `.forgejo/workflows/project-image.yml`; create `internal/factoryd/ci_images_test.go` (a Go test reading the workflow YAML).

- [ ] `on: workflow_dispatch` with inputs `project`, `image`, `file` (the project's `factory/images.yaml`, base64), `base` (sandbox base `ref@sha256:...`), `key` (the expected `BuildKey`). `runs-on: ubuntu-latest`. Concurrency group per `project`+`image`, no cancel.
- [ ] Steps, in order: checkout; registry login (as `image-sandbox`); **render**: decode `file`, get the factoryd binary from `sf/factory-gateway:main` the way infra's `config-check.yml` does (copy the static binary out of the image), run `factoryd image key` and fail if it differs from input `key`, then `factoryd image render`; **copy inputs**: run `scripts/upstream-files` on the rendered `upstream-files.txt` the way the `upstream` job runs it (inside `CI_RUNNER_IMAGE`, `crane auth login`); **build and push**: the `image-sandbox` buildx recipe (builder over the dind TLS context, `$BUILDKIT`, cache under `$CACHE/sandbox-<project>.<image>`) building the rendered Dockerfile, output `git.aisoftwarefactory.world/sf/sandbox-<project>.<image>:<key>`; **sign**: cosign from `Dockerfile.runner --target cosign`, `--key env://IMAGES_COSIGN_PRIVATE_KEY` with `IMAGES_COSIGN_PASSWORD`, by digest.
- [ ] Inputs reach shell steps only through `env:`, never by `${{ }}` inside a `run:` script (injection).
- [ ] **Test** `TestProjectImageWorkflow`: the trigger is `workflow_dispatch` only, the five inputs exist, the steps run in the order above, the sign step uses the images key secrets and not `COSIGN_PRIVATE_KEY`, and no `run:` script contains `${{ inputs.`.
- [ ] **Commit:** `ci: the trusted builder of project images`.

### Task 5: The pins block in the project file

**Files:** `internal/policy/project.go` (`ProjectConfig`, `Validate`), `internal/policy/schema.go` tables if caps or enums need entries, `internal/factoryd/project.go` (`Project`, `projectsOf`), tests; regenerate the infra copy of `factory/schema/project.schema.json` with `factoryd schema --out` into `~/repos/worktrees/asf-infra-images/factory/schema` and commit it there.

```go
type ImagePin struct {
	Digest string   `yaml:"digest" json:"digest"`   // sha256:<64 hex>
	Key    string   `yaml:"key" json:"key"`         // the BuildKey it was built under
	Tools  []string `yaml:"tools" json:"tools"`
	Egress []string `yaml:"egress,omitempty" json:"egress,omitempty"`
}
// ProjectConfig.Images map[string]ImagePin `yaml:"images,omitempty" json:"images,omitempty"`
```
- [ ] Validate: names as in Task 1, at most `MaxImages`, digest `^sha256:[0-9a-f]{64}$`, key `^k-[0-9a-f]{24}$`, egress hostnames (reuse Task 1's checker), at least one tool. Each field gets a doc comment (the schema reads them).
- [ ] `factoryd.Project.Images` copied in `projectsOf`.
- [ ] **Tests:** a block parses; absent is nil; each bad field one error naming project, image and field; the schema output contains the block.
- [ ] **Commit (code):** `policy: a project's image pins`. **Commit (infra):** `schema: a project's image pins`.

### Task 6: The imager: build, verify, pin by pull request

**Files:** create `internal/factoryd/imager.go`, `imager_test.go`; `internal/factoryd/forgejo.go` (dispatch, contents read if missing); `internal/factoryd/registry.go` (tag resolve and size if missing); a migration in `internal/schema/migrations/factoryd/` (timestamp above the newest); `cmd/factoryd/main.go` (wiring, env `IMAGES_COSIGN_PUB`); `k8s/factoryd.yaml` + `k8s/kustomization.yaml` (the images public key as a ConfigMap like `image-signing`).

The imager is a reconciler, one pass a minute, like the roller's poll.

- [ ] **Desired:** for each project whose agents are not `none`, read `factory/images.yaml` at the head of its default branch (Forgejo contents API; 404 means no images). Invalid file: one alert event per file blob sha, and the project's pins stay as they are. Desired key per name = `imagegen.BuildKey(spec, digest of cfg.SandboxBaseImage)`.
- [ ] **Build:** for a name whose pin key differs from the desired key: if the store holds tag `<key>` in `sf/sandbox-<project>.<name>` signed by the images key, it is ready (digest, compressed size from the manifest's layers; above `MaxImageBytes` is one alert and no pin). Otherwise dispatch `project-image.yml` (inputs as Task 4) unless a dispatch for the same project, name and key is under 45 minutes old; record dispatches in a table `image_builds(project, image, key, dispatched_at, read_at)`.
- [ ] **Pin:** when any name is ready or a pinned name is no longer declared, write the project file's `images` block (ready names get `ImagePin{digest, key, manifest tools, egress}`, undeclared names leave, the rest stay) on branch `factory-pins/<project>` of the bot's fork of the infra repo and open or update one PR per project (the `SchemaCopier` pattern in `schemasync.go`).
- [ ] **Auto-merge:** merge the PR as the bot when (a) its diff touches only `factory/projects/<project>.yaml`, (b) decoding the file before and after with the policy decoder gives two configs equal except `Images`, and (c) the whole tree at the PR head passes `CheckTree` (the check `factoryd config check` runs). Otherwise leave it open and raise one alert naming why.
- [ ] **Verification at use** (consumed by Task 7): `func (r *Runner) verifyProjectImage(ctx, project, image, digest string) error` checks the signature with the images key through `Registry.Verify` and caches verified digests.
- [ ] **Tests (fakes for Forgejo and the registry):** a declared, unbuilt name dispatches once and not again within 45 minutes; a ready signed tag opens a pin PR with the exact block; a tag signed with the factory key is not ready (cross-key, and the factory roll's verification refuses a digest signed only by the images key); an invalid file alerts once; an undeclared pinned name leaves the block; the auto-merge refuses a PR that touches a second file or another field of the project file.
- [ ] **Commit:** `imager: build declared images, verify them and pin them through the infra repo`.

### Task 7: Run each card on its image

**Files:** `internal/factoryd/plan.go` (`PlanCard`, `readPlan` and its callers, `planGuide`, `fileChildren`), `split.go`, `verdict.go`, `store.go` (task columns), a migration (`tasks.image`, `tasks.image_digest`), `runner.go` (`workerPodSpec`/`sandboxPodSpec` callers, `setupNamespace`, `workerEgressSpec`, `sandboxNames`), `gates.go`, `sandbox.go` (`SandboxFacts`), `opencode.go` (brief), tests.

- [ ] `PlanCard.Image string` (`json:"image,omitempty"`). `readPlan` takes the project's image names; a card naming one not in the project's pins (policy version of the call) is a finding naming card and image. `CheckSplit` passes none. `planGuide` shows the field and lists the project's images with their tools. `fileChildren` stores it on `tasks.image`.
- [ ] `func (r *Runner) taskImage(ctx context.Context, t Task) (digest string, m *imagegen.Manifest, err error)`: name = `t.Image`, else `default`; a pin in the policy version in force resolves after `verifyProjectImage`; `default` without a pin is `cfg.WorkerImage` with a nil manifest; any other name without a pin is `ErrImageNotPinned` (typed; Task 8 parks on it). The session and repro paths call it, pass the digest to `sandboxPodSpec`, and record it on `tasks.image_digest`.
- [ ] Egress per image: `workerEgressSpec` and `sandboxNames` take the image's registries (`sandboxRegistries` for the factory image, the manifest's egress otherwise); the policy is applied again at every session and repro start (server-side apply is idempotent).
- [ ] `SandboxFacts(m *imagegen.Manifest)`: nil gives today's text; otherwise the base's tools (git, curl, ripgrep, ssh, gcc and make, python3, PostgreSQL 17), the manifest's tools and its registries. Keep `TestSandboxToolsAreTheImages` holding the factory image to Dockerfile.sandbox and add a test holding the base list to the `base` stage.
- [ ] **Tests:** plan with an unknown image refused, a pinned one accepted and stored on the child task; `taskImage` for pinned, default-unpinned and variant-unpinned; the pod carries the resolved digest; egress names follow the manifest; facts text for both cases.
- [ ] **Commit:** `cards run on the image they name`.

### Task 8: request_tool, the tool card, the wait and the restart

**Files:** `internal/gateway/tools.go` (tool, schema, description), the escalation path (`internal/factoryd/escalation.go` `AgentAsk`, `runner.go` `EscalateSession`, `supervise.go`, `activities.go` outcome mapping, `workflow.go` attempt loop behind `GetVersion`), a migration (`image_parks`), `internal/factoryd/imager.go` (wake), `sandbox.go` (facts sentence), tests incl. the PG suite.

- [ ] Gateway tool `request_tool {tool, need}` (both required, bounded lengths). Description: ask for a tool this sandbox lacks instead of trying to install it; the work in progress is pushed, a card adds the tool to one of the project's images, and this card restarts on that image from its branch once the image is built. New ask kind `missing_tool` end to end (gateway `Escalation`, `AgentAsk` with `Tool`, `Need`, validation, supervisor trip, `SessionOutcome`).
- [ ] **Park:** the workflow does not charge an attempt for it. Activity `ParkForTool`: target = `t.Image` if set, else a slug of the tool (`[a-z0-9-]`, at most 32, `tools` if empty); if the target is new and the project already has `MaxImages` names, answer the session at once with a refusal naming the cap. Else file the tool card or join the open one for (project, target) (`FileAgentTask`, on the project repo, the `delegate.go` pattern for a child card; size small, rung cheap; title `Add <tool> to image <target>`; body: the need, the asking card, `factory/images.yaml`'s current content, the file format with an example, the base's tools, the cap, and that the factory builds, pins and restarts the asking card after merge). A join posts the second need on the open card's issue. Row in `image_parks(task, project, target, tool_task, created_at, woken_at)`. Status: the one a card waiting on another card already shows (read how dependencies render on the board); if none fits, add `waiting-image` and render it beside `waiting-human` with the word.
- [ ] **Not-pinned park:** a session start that gets `ErrImageNotPinned` parks the same way with no tool card.
- [ ] **Wake:** each imager pass signals `image_ready` for a park whose (a) tool card ended merged and the target's pin in force carries the desired key read in a pass that began after the merge, or (b) has no tool card and the target is pinned. A tool card closed unmerged, or merged without declaring the target, signals with a refusal text. On `image_ready` the workflow sets `tasks.image = target` (unless refused), records the arrival or the refusal in the next session's findings, and continues to a new session on the same branch.
- [ ] Facts sentence: replace "It has no browser and none can be installed..." with one that names `request_tool` as the way to get a tool.
- [ ] **Tests:** one ask files one card, a second ask for the same target joins; the cap refusal; the wake rules (a) and (b) and both refusals; no attempt charged; the PG suite for `image_parks`.
- [ ] **Commit:** `request_tool: a missing tool becomes a card, the card waits and restarts on the new image`.

### Task 9: Lifecycle

**Files:** `internal/factoryd/imager.go`, `remove.go`, tests; infra `factory/routines/weekly-bump.md`; infra `factory/templates/ts-go/factory/images.yaml` and the code repo's copy under `internal/policy/testdata/tree/templates/ts-go/`.

- [ ] **Retention:** after a pin merges, delete every tag of that image's package except the pinned key and the previous pinned key, together with their `sha256-<hex>` signature tags (Forgejo package API, the admin path `AdminDeletePackages` uses).
- [ ] **Unused variant:** a non-`default` name pinned for 30 days with no task whose `image_digest` is its pin in 30 days gets one removal card on the project repo (dedupe by a marker).
- [ ] **remove-project** also deletes the packages `sf/sandbox-<project>.*`.
- [ ] **Weekly bump brief:** one bullet: bump the upstream lines of `factory/images.yaml` (new version, new sha256); the sandbox base follows the Debian snapshot bump by itself.
- [ ] **Template:** `ts-go` ships `factory/images.yaml` with `default`: Go (the template's Dockerfile version) and Node 24 as upstream lines with their store-copied URLs and sha256, the Go env (`GOTOOLCHAIN=local`, `GOPROXY`, `GOSUMDB`), PATH entries, egress `proxy.golang.org`, `sum.golang.org`, `storage.googleapis.com`, `registry.npmjs.org`.
- [ ] **Tests:** retention keeps exactly pinned, previous and their signature tags; the unused rule files once; remove-project lists the right packages.
- [ ] **Commits:** code `images: retention, unused variants, removal with the project`; infra `images: the template's default image and the weekly bump`.

### Task 10: Live

- [ ] Generate the images key pair (cosign); Actions secrets `IMAGES_COSIGN_PRIVATE_KEY` and `IMAGES_COSIGN_PASSWORD` on `sf/ai-software-factory-code`; the public key into the code repo's `k8s/` ConfigMap.
- [ ] Infra main's branch protection lets the bot merge (only the imager uses it).
- [ ] Push code main and infra main; main CI green; the roll lands; `SANDBOX_BASE_IMAGE` pinned.
- [ ] Proof: a card on the factory's project that needs a browser calls `request_tool`; the tool card merges; the builder builds and signs; the pin PR auto-merges; the card restarts on the image and its brief names the tools. Record every step with times in the ledger.
- [ ] Docs: amend the design doc to these decisions (in place, dated note on top), roadmap 281 and 283's respawn half to built, the code repo README's sandbox paragraph, `docs/architecture.md`'s brief facts line.
