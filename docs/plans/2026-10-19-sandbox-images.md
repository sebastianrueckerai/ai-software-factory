# Sandbox Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A project gets the tools it needs through a declared tool file, a signed per-project image pipeline, per-card image selection, and a respawn flow, with updates and cleanup by construction.

**Architecture:** One declarative file (`factory/images.yaml`) drives image builds from the store-only pipeline; pins live in the factory's policy tree; factoryd resolves every sandbox pod's digest from the task's pinned policy version and verifies each image against its project's own cosign key. A typed `missing_tool` blocked reason files a card, parks the task, and the pin's landing respawns it.

**Tech Stack:** Go 1.26 (factoryd, imagegen), Dockerfiles + BuildKit on the build VMs, cosign, Forgejo package API, the factory policy tree (YAML), Forgejo Actions.

**Spec:** [docs/sandbox-images-design-2026-10-19.md](../sandbox-images-design-2026-10-19.md) (same repository; executors read both)

## Global Constraints

- Digest-only image references. Never a tag. (spec, Build/sign/pin)
- Every build input from the store; apt only through the dated Debian snapshot (roadmap 203/242). A build reaches no upstream at build time.
- At most 4 image names per project; image size at most 4 GiB; both policy fields with these defaults, refused at `factoryd config check`.
- The agent never builds, pushes or signs an image. It edits `factory/images.yaml` through a card.
- Per-project cosign keys; factoryd verifies each image against its project's pinned public key; the factory's own images keep the factory key.
- No runtime installs beyond declared registries; amd64 only.
- The base image carries the harness (agent-worker, opencode, plugin) and runs no pod itself.
- House test style: `go test -race ./...` green, gofmt, gosec clean; hand-derived expectations, never tweak an assertion to force a pass.

## Review Focus

The five inputs most likely to bite a person, each with the test that pins it:

1. **A tool file naming a hostile or mismatched upstream input** (URL whose sha256 does not match the content, or content the project should not run). Expected: the build refuses or the content arrives exactly as hashed. Pinned by Task 5's checksum-line test and Task 6's candidate-check step.
2. **A card naming an image that is declared but not yet pinned** (the window between merge and pin). Expected: the task parks with `missing_tool` and never schedules an unpinned digest. Pinned by Task 10's park test.
3. **A leaked project signing key used on a factory image, or the factory key on a project image.** Expected: verification fails in both directions. Pinned by Task 4's cross-key test.
4. **Two cards asking for the same tool while one ask is open.** Expected: one tool card, the second ask joins it. Pinned by Task 10's join test.
5. **A factoryd roll while tasks are in flight.** Expected: in-flight tasks keep their already-resolved digest; only new tasks resolve again. Pinned by Task 11's fan-out test.

---

### Task 1: The images file schema and parser

**Files:**
- Create: `internal/policy/images.go` (code repo)
- Test: `internal/policy/images_test.go`

**Interfaces:**
- Produces: `type ImagesFile struct { Images map[string]ImageSpec }`; `type ImageSpec struct { Apt []string; Upstream []UpstreamLine; Egress []string }`; `type UpstreamLine struct { Name, URL, SHA256 string }`; `func ParseImagesFile(data []byte) (ImagesFile, []string)` — findings are the house findings style (`ValidatePlan`'s `[]string`); `func (f ImagesFile) Validate() []string` applying the caps.
- Consumes: nothing.

- [ ] **Step 1: Write the failing tests** — `TestParseImagesFileValid` (a file with `default` plus one variant parses to the exact maps), `TestValidateNoDefault` (no `default` name is a finding naming it), `TestValidateCaps` (5 names refused with the cap named; >64-char hostname refused), `TestValidateUpstreamSHA` (a sha256 that is not 64 hex is a finding; two upstream lines with one URL is a finding), `TestValidateEgressFormat` (an egress entry that is not a hostname is a finding).

- [ ] **Step 2: Run** `go test ./internal/policy/ -run TestParseImagesFile -v` — expect FAIL (undefined).

- [ ] **Step 3: Implement** the types and `ParseImagesFile` with `gopkg.in/yaml.v3` (already a dependency of the policy package's parsing), `Validate` applying: `default` present, at most 4 names, name matches `^[a-z0-9-]{1,32}$`, sha256 is 64 hex, egress entries are hostnames (`net.ParseHostname`-shaped check), no duplicate URLs per image.

- [ ] **Step 4: Run** the tests — expect PASS. `gofmt -l .` clean, `gosec ./internal/policy/` clean.

- [ ] **Step 5: Commit** `policy: the images file schema and parser`.

### Task 2: The policy tree's images block

**Files:**
- Modify: `internal/factoryd/project.go` (Project struct, after `Egress []string` near line 42)
- Modify: the generated schema sync test (the schema check that factoryd guards, the stale-copy PR machinery of ruling 303 — the test file next to the schema generation)
- Test: `internal/factoryd/project_test.go`

**Interfaces:**
- Consumes: Task 1's `ImagesFile` validation for the file side; this task is the policy side.
- Produces: `Project.Images map[string]string` (name → `sha256:<hex>` pin, empty without a block) and `Project.SigningKeyPEM string` (empty without); `func (p Project) ImageDigest(name string) (string, bool)` — true only for a pinned name.

- [ ] **Step 1: Write the failing test** — `TestProjectImagesBlock`: a project file with

```yaml
images:
  signing_key: |
    -----BEGIN PUBLIC KEY-----
    ...
  pins:
    default: sha256:aaa...
    analysis: sha256:bbb...
```

    parses to `Images["default"] == "sha256:aaa..."`, `SigningKeyPEM` set; a file without the block parses with `Images == nil`; a pin not matching `^sha256:[0-9a-f]{64}$` is a config-check finding.

- [ ] **Step 2: Run** `go test ./internal/factoryd/ -run TestProjectImagesBlock -v` — FAIL.

- [ ] **Step 3: Implement** the struct fields and the parse in the project-file reader; regenerate `factory/schema/project.schema.json` in the infra repo (`make schema` or the command the stale-copy test names); the generated-schema check passes.

- [ ] **Step 4: Run** the tests — PASS; the schema sync test passes with the regenerated schema.

- [ ] **Step 5: Commit** `policy: the project images block (pins and signing key)`.

### Task 3: PlanCard.Image and the plan validation

**Files:**
- Modify: `internal/factoryd/plan.go:162` (PlanCard struct)
- Modify: `internal/factoryd/plan.go:270` (ValidatePlan signature and its callers)
- Test: `internal/factoryd/plan_test.go`

**Interfaces:**
- Consumes: Task 2's `ImageDigest`.
- Produces: `PlanCard.Image string` json `image,omitempty`; `ValidatePlan(text string, shape policy.PlanShape, limits policy.Limits, bound int, pinnedImages map[string]bool) []string` — a nil map refuses any non-empty `image` field.

- [ ] **Step 1: Write the failing tests** — `TestValidatePlanImageUnknown` (a plan whose card names `analysis` against an empty map is refused, the finding names the card key and the image name), `TestValidatePlanImagePinned` (the same plan passes with `map[string]bool{"analysis": true, "default": true}`), `TestPlanCardImageOptional` (existing fixtures unchanged, no image field round-trips as today).

- [ ] **Step 2: Run** `go test ./internal/factoryd/ -run TestValidatePlanImage -v` — FAIL.

- [ ] **Step 3: Implement** the field, extend `ValidatePlan` with the `pinnedImages` parameter, update every caller to pass the task's project's pinned names (the call sites hold the project; the frozen pre-stages path passes the same map its task pinned).

- [ ] **Step 4: Run** `go test -race ./internal/factoryd/` — PASS (full package, the signature ripple).

- [ ] **Step 5: Commit** `plan: the per-card image, validated against the pinned set`.

### Task 4: Pod image resolution and per-project verification

**Files:**
- Modify: `internal/factoryd/runner.go` (Config, `sandboxPodSpec`, `setupNamespace`, the session start path)
- Modify: `internal/factoryd/gates.go` (`reproPodSpec`, the criteria-gate pod spec, the hold-out dry-run pod spec)
- Modify: `internal/factoryd/registry.go` (verification entry point)
- Test: `internal/factoryd/runner_test.go`, `internal/factoryd/registry_test.go`

**Interfaces:**
- Consumes: Task 2's `ImageDigest`, Task 3's card image name.
- Produces: `func (r *Runner) taskImage(t Task, cardImage string) (string, error)` returning the digest or a typed error naming the fitting action; `func VerifyImageDigest(ctx context.Context, ref string, digest string, keyPEM []byte) error` in registry.go; `sandboxPodSpec` and `reproPodSpec` take the digest as a parameter instead of reading `r.cfg.WorkerImage`.

- [ ] **Step 1: Write the failing tests** — `TestTaskImageResolvesCardName` (card image `analysis` resolves to the project pin; empty name resolves `default`; unknown name errors with a `missing_tool`-shaped reason), `TestSandboxPodSpecCarriesDigest` (the pod's container image equals the passed digest, not `cfg.WorkerImage`), `TestVerifyImageDigestWrongKey` (a signature made with key A refused when verified with key B, both directions, factory key and project key).

- [ ] **Step 2: Run** `go test ./internal/factoryd/ -run 'TestTaskImage|TestSandboxPodSpecCarriesDigest|TestVerifyImageDigest' -v` — FAIL.

- [ ] **Step 3: Implement** `taskImage`, thread the digest through the pod specs (session, repro, criteria gate, hold-out; each keeps its env and mounts unchanged), and `VerifyImageDigest` as a cosign signature check of the digest against the given PEM (the existing `ParseSigningKey` path, extended to accept any P-256 PEM). The task's row records the digest it resolved (one column, `image_digest`), which Task 12's variant cleanup reads.

- [ ] **Step 4: Run** `go test -race ./internal/factoryd/` — PASS.

- [ ] **Step 5: Commit** `runner: per-project image resolution and verification`.

### Task 5: imagegen

**Files:**
- Create: `internal/imagegen/imagegen.go` (code repo)
- Create: `cmd/imagegen/main.go`
- Test: `internal/imagegen/imagegen_test.go`

**Interfaces:**
- Consumes: Task 1's `ImagesFile`.
- Produces: `func Render(file policy.ImagesFile, name string, baseDigest string) (dockerfile []byte, manifest []byte, err error)`; CLI `imagegen -file <images.yaml> -name <image> -base <sha256:...> -out-dir <dir>` writing `Dockerfile` and `manifest.json`.

- [ ] **Step 1: Write the failing tests** — `TestRenderFROMPinsBase` (the Dockerfile's first FROM is `<store>/<project>@<baseDigest>`, digest only, no tag anywhere in the file), `TestRenderAptAndUpstream` (apt names become one RUN line shaped like Dockerfile.sandbox's snapshot install; each upstream line becomes an `ADD --checksum=sha256:<hex> <url> /inputs/<name>` plus unpack step), `TestRenderManifest` (manifest.json holds the tool names, egress names and base digest, byte-comparable to the golden), `TestRenderCaps` (the Render of a file failing `ImagesFile.Validate` errors naming the finding).

- [ ] **Step 2: Run** `go test ./internal/imagegen/ -v` — FAIL.

- [ ] **Step 3: Implement** the renderer; the apt RUN recipe copies the pattern of the current Dockerfile.sandbox's snapshot install stage verbatim.

- [ ] **Step 4: Run** the tests — PASS; `go vet ./internal/imagegen/ ./cmd/imagegen/`, gofmt, gosec clean.

- [ ] **Step 5: Commit** `imagegen: render a project image's Dockerfile and manifest from the images file`.

### Task 6: The image CI job

**Files:**
- Modify: `.forgejo/workflows/ci.yml` (code repo, after the `image-sandbox` job)
- Modify: `factory/templates/ts-go/.forgejo/workflows/ci.yml` (infra repo template's CI)
- Test: `internal/factoryd/ci_images_test.go` (code repo, house style: a Go test reading ci.yml and pinning the new job's step order)

- [ ] **Step 1: Write the failing test** — `TestCIImageProjectJob`: ci.yml defines `image-project` with steps in this order: imagegen, build (rootless buildkit, build VM), check-in-candidate, push, sign, pin-request; the job's `if:` guards on `factory/images.yaml`.

- [ ] **Step 2: Verify what this session can** — run the Go test and a YAML parse of both ci.yml files. Forgejo Actions themselves run only on the factory; the executor note at the bottom covers the live pass.

- [ ] **Step 3: Implement** the job in both ci.yml files; the candidate check runs the project's `check` against the freshly built image in a throwaway container on the build VM (the same shape the factory's own image jobs use for their build stage).

- [ ] **Step 4: Run** `go test ./... -run TestCIImageProjectJob -v` — PASS; YAML parse clean for both files.

- [ ] **Step 5: Commit** `ci: the project image job (build, check the candidate, push, sign, request the pin)`.

### Task 7: The pin endpoint and retention

**Files:**
- Create: `internal/factoryd/pins.go`
- Modify: `internal/factoryd/register.go` (the per-project scoped token for pin requests, alongside the existing tokens map)
- Test: `internal/factoryd/pins_test.go`

**Interfaces:**
- Consumes: Task 4's `VerifyImageDigest`; Task 2's `Project.Images`/`SigningKeyPEM`.
- Produces: `func (r *Registrar) AcceptImagePin(ctx context.Context, project string, pin ImagePin) error` where `type ImagePin struct { Image, Digest string }`; on acceptance factoryd commits the pin to the policy tree with the credentials it already uses for policy writes, deletes the project image's older digests (all but the new pin and the previous pin), and wakes parked `missing_tool` tasks waiting on that project+image (Task 10 registers the wake; this task provides the call site `r.wakeParkedTasks(project, image)` as a no-op interface until Task 10 fills it).

- [ ] **Step 1: Write the failing tests** — `TestAcceptImagePinVerifiesBeforeCommit` (a pin whose digest carries a signature from the project's key is committed; one signed by another key or unsigned is refused, and the policy tree is untouched), `TestAcceptImagePinRetention` (after a pin, the store's list for the image name holds exactly the new and the previous digest; the rest deleted), `TestAcceptImagePinAuth` (a request without the project's pin token is refused).

- [ ] **Step 2: Run** `go test ./internal/factoryd/ -run TestAcceptImagePin -v` — FAIL.

- [ ] **Step 3: Implement** the endpoint (a console-API route with the project's pin token as bearer), the policy commit, the retention delete via the Forgejo package API, and the wake call site.

- [ ] **Step 4: Run** `go test -race ./internal/factoryd/` — PASS.

- [ ] **Step 5: Commit** `pins: the verified pin endpoint, retention, the parked-task wake site`.

### Task 8: Registration generates the keypair; the template ships its file

**Files:**
- Modify: `internal/factoryd/register.go` (`Register`, after the existing secret seeding)
- Modify: `factory/templates/ts-go/factory/images.yaml` (infra repo, new)
- Modify: `factory/schema/project.schema.json` (infra repo, regenerate)
- Test: `internal/factoryd/register_test.go`

**Interfaces:**
- Consumes: Task 2's schema; Task 7's token seeding pattern.
- Produces: at registration: a P-256 cosign-shaped keypair per project (generated with `crypto/ecdsa`, PEM as `cosign generate-key-pair` writes it, matching `ParseSigningKey`), the private key seeded as a project secret `factory/signing-key` (the `Secrets []string` pattern), the public key committed into the project's policy file images block, and a pin token `factory/pin-token` seeded the same way.

- [ ] **Step 1: Write the failing test** — `TestRegisterSigningKeypair`: registering a project with a fake Forgejo creates the two secrets, the policy file gains `images.signing_key` with a PEM `ParseSigningKey` accepts, and a re-registration (rotate=false) keeps the existing key (idempotent).

- [ ] **Step 1b: Write the failing test** — `TestTemplateImagesFile`: the template's seeded files contain `factory/images.yaml` whose `default` names the template's stack, and the template's ci.yml contains the `image-project` job.

- [ ] **Step 2: Run** `go test ./internal/factoryd/ -run 'TestRegisterSigningKeypair|TestTemplateImagesFile' -v` — FAIL.

- [ ] **Step 3: Implement** the generation, seeding and policy-file write (the policy write via Task 7's commit path), and add the template's `factory/images.yaml` (default: Go 1.26 and Node 24 as upstream lines at today's pinned versions, egress empty) and the template's ci.yml job.

- [ ] **Step 4: Run** the tests — PASS; the schema check passes with the regenerated schema.

- [ ] **Step 5: Commit** `register: the per-project signing keypair and pin token; the template ships its images file`.

### Task 9: The brief's facts from the image manifest

**Files:**
- Modify: `internal/factoryd/sandbox.go` (`SandboxFacts`)
- Modify: `internal/factoryd/opencode.go:666` (the call site)
- Modify: `internal/factoryd/runner.go` (`workerEgressSpec`)
- Test: `internal/factoryd/sandbox_test.go`, `internal/factoryd/opencode_test.go`

**Interfaces:**
- Consumes: Task 5's manifest shape; Task 4's resolved digest.
- Produces: `func SandboxFacts(m Manifest) string` where `type Manifest struct { Tools []string; Egress []string; Base string }`; `func (r *Runner) imageManifest(ctx context.Context, digest string) (Manifest, error)` fetching the manifest package from the store by digest and caching by digest for the process lifetime; `workerEgressSpec` carries the manifest's egress names beside the project's own.

- [ ] **Step 1: Write the failing tests** — `TestSandboxFactsFromManifest` (the line names the manifest's tools and registries in today's sentence shape), `TestImageManifestCaches` (two calls, one store fetch with a fake store), `TestBriefCarriesImageFacts` (a session brief renders the resolved image's facts, not the global table), `TestEgressJoinsManifest` (a task namespace's Cilium egress spec contains the manifest's egress names beside the project's own).

- [ ] **Step 2: Run** `go test ./internal/factoryd/ -run 'TestSandboxFacts|TestImageManifest|TestBriefCarries|TestEgressJoins' -v` — FAIL.

- [ ] **Step 3: Implement** the manifest type, the fetch and cache, the brief switch, and the egress join in `workerEgressSpec`. The existing test holding `sandboxTools` to Dockerfile.sandbox becomes the base manifest's test.

- [ ] **Step 4: Run** `go test -race ./internal/factoryd/` — PASS.

- [ ] **Step 5: Commit** `brief and egress: facts and names from the image manifest`.

### Task 10: missing_tool, the tool card, the respawn

**Files:**
- Modify: `internal/factoryd/escalation.go` (typed reason intake)
- Modify: `internal/factoryd/activities.go` (the routing activity)
- Modify: `internal/factoryd/workflow.go` (park and wake)
- Test: `internal/factoryd/escalation_test.go`, `internal/factoryd/activities_test.go`

**Interfaces:**
- Consumes: Task 7's `AcceptImagePin` wake site; Task 4's typed error shape.
- Produces: request_info reason `missing_tool` with fields `{tool, need}`; `func (r *Runner) fileToolCard(ctx context.Context, t Task, tool, need string) error` — files a card titled `Add <tool>: <need>` on the project repository editing `factory/images.yaml`; a parked task stores `(task, project, image-name)` in the new `image_parks` table; `AcceptImagePin`'s wake requeues those tasks onto the new image (fresh session, the brief notes the tool arrived); a tool card closed without merging answers the parked tasks with the refusal.

- [ ] **Step 1: Write the failing tests** — `TestMissingToolFilesOneCard` (an ask files one card; a second ask for the same tool while open joins it, no second card), `TestPinWakeRespawns` (a pin on the waited image requeues the parked task, its card's image set), `TestToolCardRefusalAnswers` (closing the tool card without merge answers the parked tasks with the refusal).

- [ ] **Step 2: Run** `go test ./internal/factoryd/ -run 'TestMissingTool|TestPinWake|TestToolCardRefusal' -v` — FAIL.

- [ ] **Step 3: Implement** the typed reason (alongside the escalation intake's existing kinds), the card filing, the `image_parks` store table (migration named in the house style `20261020000000_image_parks.sql`), the wake and the refusal answer.

- [ ] **Postgres-backed tests skip without a database by design; run the PG suite with `FACTORYD_TEST_DATABASE_URL` set before claiming the table works.**

- [ ] **Step 4: Run** `go test -race ./internal/factoryd/` and the PG suite — PASS.

- [ ] **Step 5: Commit** `missing_tool: the typed blocked reason, the tool card, the respawn`.

### Task 11: The roll fans out

**Files:**
- Modify: `internal/factoryd/rolltask.go` (after the factory's own three image jobs are verified)
- Test: `internal/factoryd/rolltask_test.go`

**Interfaces:**
- Consumes: Task 6's job name `image-project` in every project repository.
- Produces: after a successful factoryd roll, factoryd dispatches the `image-project` job in every project repository that carries a tool file, via the Forgejo workflow-dispatch API the roller already uses. Old pins stay until each rebuild repins.

- [ ] **Step 1: Write the failing test** — `TestRollFanOutDispatchesImageJobs` (a fake store with two projects carrying files dispatches two jobs and no job for a project without one; a dispatch failure for one project does not stop the others, each failure alerts).

- [ ] **Step 2: Run** `go test ./internal/factoryd/ -run TestRollFanOut -v` — FAIL.

- [ ] **Step 3: Implement** the fan-out on the roll-complete path.

- [ ] **Step 4: Run** `go test -race ./internal/factoryd/` — PASS.

- [ ] **Step 5: Commit** `roll: fan out project image rebuilds after a factoryd roll`.

### Task 12: Weekly bump, sweep, variant cleanup, remove-project

**Files:**
- Modify: the factory's own project routine brief `routines/weekly-bump.md` (infra repo) and the project policy's routine list
- Modify: `k8s/remove-project.yaml` (code repo, one store-deletion step)
- Test: `internal/factoryd/pins_test.go` (the sweep)

**Interfaces:**
- Consumes: Task 7's retention delete; the routines machinery (`routines:` with cron, brief, `while_open`).
- Produces: the weekly bump brief gains the leg: bump each project's upstream lines (new tool versions), rebuild, repin, files `ai`. A weekly sweep routine in the factory's own project deletes unpinned project digests older than the previous pin (a call over the store's package list, the `AcceptImagePin` retention rule as a store-wide pass). A factory routine reads the `image_digest` each task recorded (Task 4) and files a removal card for a variant with no session for 30 days, approved like an addition. remove-project deletes the project's container packages.

- [ ] **Step 1: Write the failing test** — `TestSweepKeepsPinnedAndPrevious` (a fake store with three digests, one pinned, one previous, one older-unpinned: the sweep deletes exactly the third).

- [ ] **Step 2: Run** `go test ./internal/factoryd/ -run TestSweepKeeps -v` — FAIL.

- [ ] **Step 3: Implement** the sweep, the routine entries (policy + brief text), and the remove-project step.

- [ ] **Step 4: Run** the tests — PASS.

- [ ] **Step 5: Commit** `lifecycle: the weekly bump leg, the store sweep, variant cleanup, remove-project`.

### Task 13: Migration and the slim base

**Files:**
- Modify: `Dockerfile.sandbox` (code repo: Go and Node leave, the harness stays)
- Modify: `internal/factoryd/sandbox.go` (the tool table test becomes the base manifest's test)
- Modify: the factory's own project files: `sf/ai-software-factory-code` gains `factory/images.yaml` (Go 1.26, Node 24 at today's pins) and its policy file gains the images block; same for the demo app
- Modify: `docs/roadmap.md` (docs repo): 281 and the respawn half of 283 to built, 34 partially (missing_tool only)

- [ ] **Step 1: Execute the design's migration order:** seed both projects' `factory/images.yaml` (their content matches today's image's tools), build and pin their images through the new pipeline, then slim the base. In-flight tasks keep their resolved digests; a project with no own pin resolves `default` to its template's pin.

- [ ] **Step 2: Verify live:** the factory's next own session runs on the project image, its brief states the manifest's facts, `go test -race ./...` green in it.

- [ ] **Step 3: Update the roadmap** entries with the built state and the sources, in the house voice.

- [ ] **Step 4: Commit** `migration: the slim base, both projects on their images, the roadmap`.

---

## Notes for the executor

- The work spans the code repo and the infra repo; each task names its repo. Tasks 2, 6, 8, 12 touch both; commit each repo separately and let the factory's own chain roll them.
- Tasks 1-5 and 9 are pure code with unit tests and run anywhere. Task 6's job and Task 13's live verification need the factory (build VMs, the store, the runner); run them from a session with the factory reachable, in the house order (checks, image build, roll, live proof).
- The Forgejo package API's single-digest delete is a design assumption the executor verifies at Task 7 (the retention test's fake) and Task 12 (live). If the API lacks it, the fallback is the documented Forgejo package-version delete, and the retention keeps whole versions instead of bare digests; note the substitution in the plan file when it happens.
