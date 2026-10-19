# Sandbox images: how a project gets the tools it needs

Written 2026-10-19, from the design discussion of the same day. This file
turns the discussion into a design: the decided parts, the constraints, and
what the builder settles. It covers roadmap 281 (tools per project) and the
respawn half of 283. Status: design, approved by Sebastian in conversation.
Nothing here is built.

## Why

Every agent session runs in the one sandbox image today: git, curl, ripgrep,
ssh, gcc and make, python3, PostgreSQL 17, Go 1.26, Node 24 with npm
(Dockerfile.sandbox, the tool table test-pinned in
internal/factoryd/sandbox.go). Go and Node are in the image because the
factory's own projects are Go; for any other stack that default is wrong.
The sandbox cannot install at runtime: no root, no capabilities, apt cannot
run, and the DNS allowlist answers two registries only (the Go module proxy
and npm). Card #854 spent calls trying to install a browser it could not
reach. A project that needs another tool has no door.

The design opens one door: the project declares its tools in a file of its
own repository, the factory's CI builds a per-project image from that file,
signs it, and pins its digest; a session runs on the image the project or
the card names; a builder that misses a tool says so through a typed blocked
reason, and the tool arrives by card, not by prompt.

## Decided (Sebastian)

- **AI approval is the default.** A tool addition does not wait for a human
  as long as the image is signed, so a session runs only what was built and
  signed from a declarative file. The sandbox is the containment; even
  hostile software in a session can do little. No new autonomy setting: the
  tool file's cards are ordinary cards and ride the project's existing
  merge rule, so a human-merge project gets human-approved tool changes and
  an auto-merge project gets AI-approved ones.
- **The initial image is a choice made at creation.** The universal default
  must not carry a stack. The project template carries the stack instead:
  the template ships a tool file and the factory prebuilds its image, so a
  project starts on its template's image with no build and no delay. The
  console's creation flow may run a short AI pass over the repository or
  spec to draft additions to the tool file; they build in the background
  while the first session already runs, and the next session respawns onto
  the richer image. A wrong guess costs one background build.
- **Matching is per card.** A stage or lane property would fail the
  occasional case: one data-analysis task among twenty Go tasks. The image
  is an optional field on the card. The planner writes it; factoryd
  validates the name against the project's declared set at plan
  validation; an undeclared name refuses the plan before work starts.
- **Updates and cleanup are by construction**, not by anyone remembering:
  see Updates and Cleanup below.

## The pieces

### 1. The tool file

A project declares images in `factory/images.yaml` at the root of its
repository. Shape:

```yaml
images:
  default:
    apt: [golang, nodejs]      # names in the dated Debian snapshot
    upstream:
      - name: opencode v1.18
        url: https://example.com/opencode.tar.gz
        sha256: 3046e0404fdc60fb80307e7a47824ba07477364178a4d09baa8548496dd6d43b
    egress: []                 # extra registry names, empty by default
  analysis:                    # a variant, optional
    apt: [python3.13, python3-pandas]
    egress:
      - pypi.org
```

Tools come in two kinds, and the file names store inputs, not nicknames.
Apt packages resolve from the dated Debian snapshot the base image already
uses. Anything else is an upstream line: URL and sha256, the line shape of
upstream-files.txt, which the store's copy machinery uploads into the
project's own namespace before the build reads it (roadmap 203). There is
no closed recipe library in a factory repository: a new tool needs no
factory repository change, so the AI-approved default covers the whole
loop (settled from the AI-approval decision; a factory-held library would
have put a human gate in front of every genuinely new tool).

The template ships the same file (infra repository,
`factory/templates/ts-go/factory/images.yaml`), and project creation seeds
it as the first commit's copy. One file, two uses.

The declared facts are the source of truth for two artefacts: the image
build, and the brief's sandbox facts line (piece 6). A tool the file does
not name is not in the image, and the brief never claims it.

### 2. The images

Three kinds, one pipeline:

- **The base image** is today's Dockerfile.sandbox slimmed to what every
  project needs regardless of stack: git, curl, ripgrep, ssh, gcc and
  make, python3 as a scripting tool, and the PostgreSQL 17 server and
  client the test harness uses (this split is my call: a test database is
  test infrastructure, not a stack). Go and Node leave it. The base also
  carries the agent harness today's Dockerfile.sandbox carries:
  agent-worker, opencode and its plugin, since a session runs inside one
  container. The base image itself runs no pod; it is the parent of every
  other image.
- **Template images** are the base plus a template's tool file, built by
  the factory's own CI on template change and on the weekly bump. They
  exist prebuilt so creation needs no build.
- **Project images** are the base plus the project's tool file, built by
  the project's own CI. A new project's first build reproduces its
  template's image content; it diverges as the project amends its file.

Every image builds the way the factory's images build today: BuildKit on
the build VMs, every input from the store (roadmap 203; apt rides the dated
Debian snapshot, roadmap 242's documented exception), reproducible from the
commit, amd64 only. Project images build rootless, as today's builds do, so
a project-declared input executes contained; its blast radius is the image
itself, which sessions run sandboxed.

Caps, refused by `factoryd config check` and by the build: at most 4 image
names per project, image size at most 4 GiB (both policy fields with these
defaults).

### 3. Build, sign, pin

A change to a tool file runs the owning repository's image job (the
factory's ci.yml gains a template-image job; the project template's ci.yml
gains the project-image job, guarded on the file's path). The job builds
the image, then runs the project's own `check` on the candidate inside the
job, before push: the gates' proof for a tool card is the candidate
passing the project's tests, and factoryd never schedules an unpinned
digest. On green the job pushes to the store under the project's own
repository namespace (the project's Forgejo repository is its container
package namespace), signs it, and writes the digest pin into the factory's
policy tree: the project's file (`factory/projects/<name>.yaml`) gains an
`images` block naming each image's digest. factoryd reads the policy tree
already, the commit is the version, and the version is pinned per task, so
a task's image is as reproducible as its process.

Signing keys are per project. Registration generates a keypair, seeds the
private key into the project repository's secrets for signing only, and
pins the public key in the project's policy file. factoryd verifies each
image against its project's pinned key, and the factory's own images keep
the factory key. One leaked project key can forge only that project's
images, which the project's AI curates anyway; it cannot forge factory
images (my call, from the standing constraint of fine-grained roles).

The agent never builds, pushes or signs. It edits the declarative file
through a card; the pipeline does the rest.

### 4. Choosing the image for a pod

The plan gains an optional image name per card. Resolution order: the
card's image name, else the project's `default`. A name resolves only
against a signed, pinned digest in the task's pinned policy version:
declared but unpinned behaves exactly as undeclared, and a task asking for
it parks with `missing_tool`, waiting for the pin. That parked wait is the
respawn trigger. factoryd hands the resolved digest to every sandbox pod
the card's work starts: the session pod, the repro pod, the criteria gate
pod, the hold-out dry run. Gates run the project's tests on the project's
image, or their verdicts prove nothing. The factory's own project's pods
run the factory's image, which is its project image.

Validation sits where the other impossibilities sit: ValidatePlan
(internal/factoryd/plan.go) refuses an image name with no signed pin in
the task's policy version, the same pass that refuses cycles and
impossible compositions. The model chooses, from a closed list the tool
file declares.

### 5. The ask flow: a missing tool becomes a card

The typed blocked reason comes first in build order (roadmap 34, not built
today): a builder that cannot go on reports `missing_tool` through
`request_info`, naming the tool and what it needed it for. factoryd files a
card against the tool file on the project's repository, titled with the
tool and the asking card. The card is an ordinary change: it edits
`factory/images.yaml`, the project's gates judge it, and it merges by the
project's merge rule (AI-approved by default, per the decision above).

When the merged file's image is built and pinned, factoryd respawns the
parked task on the new image; the respawned session's brief states the
image's facts from the new manifest. If the tool card is refused or closed
without merging, the refusal is the parked task's answer through the
answer chain. One asking card per tool per project, so twenty cards do not
file twenty builds; a second ask rides the open card.

Egress follows the tool: a variant's `egress` names join the task
namespace's DNS and Cilium allowlist (workerEgressSpec) when a pod runs on
that image, the way the Go module proxy and npm joined. The gateway's
resolved-address guard (roadmap 42) stands in front of every new name, and
each name lands in the audit trail with the card that asked for it.

### 6. The brief's facts line

SandboxFacts() today renders one global table. It becomes a render of the
image's manifest: the build publishes, beside the digest in the store, a
small manifest (the tool list, the egress names, the size, the base
digest), generated by the build from the same file it built from. The
brief of a session on an image states that image's tools and registries.
The existing test that holds the tool table to Dockerfile.sandbox adapts
to hold the base image's manifest to its Dockerfile.

### 7. Updates

The harness rides the base image, so a factoryd or opencode change must
reach project sessions. A factoryd roll therefore rebuilds the base and
the factory's own images in its existing gate, then triggers an
asynchronous rebuild and repin of every template and project image from
the new base, the way the roller watches today's three image jobs. A
project keeps its previous pin until its own rebuild lands, so the skew
window is the rebuild queue, minutes, not a week; a red rebuild keeps the
old pin and files like any red build.

Upstream tool versions move on the weekly bump, which exists (the roller's
weekly bump card). It grows one leg: each template image and each project
image rebuilds from a bumped tool file on the same weekly schedule, reruns
the project's checks, and repins. The project policy file's routine
machinery (`routines:`) carries it: the project's bump routine runs
`files: ai` by default, per the decision above; the factory's own project
keeps its human rule.

### 8. Cleanup

Four rules, all by construction:

1. **Store retention.** The store keeps the pinned digest and the one
   before it per image name. A successful pin deletes older digests of
   that name; a weekly sweep deletes unpinned digests. The store's
   package API must delete single container digests; the plan verifies
   this before relying on it.
2. **Nodes.** The kubelet's image GC already runs at 75 percent (roadmap
   252); per-session pulls fall under it. No extra work.
3. **Variants.** A variant no card used for 30 days files a removal card,
   approved like an addition. Removal unpins it; the next sweep drops the
   digests.
4. **Projects.** remove-project deletes the project's images with its
   namespace.

The caps bound the worst case per project: size cap times (4 names plus
one) times two digests.

## Constraints

- Immutable and re-seedable end to end: every image rebuilds from a commit
  of its tool file plus the store; the pin lives in the policy tree in
  git; deleting everything and re-seeding rebuilds all of it.
- Security: no direct credentials to agents, signed images, digest-only
  references (never a tag), no runtime installs outside the declared
  registries, egress names audited, caps refused at config check.
- The build's inputs stay store-only (roadmap 203); a new toolchain
  version enters through the store's existing copy machinery, never
  straight from an upstream at build time.
- Fewest tools: one file format, one pipeline, one pin home. No image
  registry service beyond the store's, no new daemon.

## Non-goals

- Demo instances of built software: roadmap 283's second half, untouched.
- New project templates (a python template, and so on): the mechanism must
  make adding one trivial, but none ship in this work.
- Per-session runtime installs beyond declared registries, nested
  virtualisation, multi-arch images: unchanged refusals.

## Migration

One order, no fallback image: seed `factory/images.yaml` into both
existing projects (the factory's code project declaring Go and Node, the
demo app its template's stack), build and pin their images, then slim the
base. In-flight tasks keep their already-resolved digest, since a task
pins its policy version. A project with no pin of its own resolves its
`default` to its template's pin; that is the creation flow's promise, not
a legacy path, and it is also why a freshly created project runs its
first session with no build and no delay.

## Left to the builder

- The exact schema of `factory/images.yaml`, the JSON Schema, and the
  generated schema check.
- The manifest's format and its store path beside the image.
- The least-privilege mechanism the image job uses to write the pin into
  the policy tree (a scoped token is the shape; the schema must reject a
  pin factoryd cannot verify).
- The store's delete API for single digests, verified against the running
  Forgejo before the retention step lands.
- The exact plan JSON field and the ValidatePlan change.
- The respawn bookkeeping: where a parked `missing_tool` task waits and
  what wakes it.

## Sources

Sebastian 2026-10-19 (the design conversation: the initial image as a
creation choice, per-card matching, AI approval as the default under
signing, cleanup by construction). Roadmap 281 and 283 (the concept),
34 (typed blocked reasons), 42 (egress guard, built), 71 (per-project
cache, first half built), 203 (the store, built), 252 (image GC, applied).
The escalation-ladder redesign, section "Beside the ladder" (the origin:
card #854's browser). target-architecture.md, "Build speed, and the road
to microVMs" (the hardware fact that keeps nested container runtimes out).
