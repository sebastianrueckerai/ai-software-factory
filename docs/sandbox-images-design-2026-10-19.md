# Sandbox images: how a project gets the tools it needs

Written 2026-10-19, from the design conversation of the same day. It covers
roadmap 281 (tools per project) and the respawn half of 283.

Status: built and proven live. Sebastian decided on 2026-10-22 how the
design meets the infrastructure as it stands, and the build followed
those decisions. This file now describes what was built. The build plan
([plans/2026-10-19-sandbox-images.md](plans/2026-10-19-sandbox-images.md))
holds the decisions and rulings with their costs. On 2026-10-23 card #1234
asked for chromium, tool card #1235 added it, the build took about 3
minutes, the bot merged pin pull request infra #137, and the card restarted
on the image about 90 seconds after the pin.

## Why

Before this work, every agent session ran in the one sandbox image: git, curl, ripgrep,
ssh, gcc and make, python3, PostgreSQL 17, Go 1.26, Node 24 with npm
(Dockerfile.sandbox, the tool table test-pinned in
internal/factoryd/sandbox.go). Go and Node are in the image because the
factory's own projects are Go; for any other stack that default is wrong.
The sandbox cannot install at runtime, and still cannot: no root, no capabilities, apt cannot
run, and the DNS allowlist answers two registries only (the Go module proxy
and npm). Card #854 spent calls trying to install a browser it could not
reach. A project that needs another tool has no door.

The design opens one door: the project declares its tools in a file of its
own repository, one trusted builder builds an image from that file, signs
it, and factoryd pins its digest; a session runs on the image the project
or the card names; a session that misses a tool asks for it with
`request_tool`, and the tool arrives by card, not by prompt.

## Decided (Sebastian)

- **AI approval is the default.** A tool addition does not wait for a human
  as long as the image is signed, so a session runs only what was built and
  signed from a declarative file. The sandbox is the containment; even
  hostile software in a session can do little. No new autonomy setting: the
  tool file's cards are ordinary cards and ride the project's existing
  merge rule, so a human-merge project gets human-approved tool changes and
  an auto-merge project gets AI-approved ones.
- **The initial image is a choice made at creation.** The universal default
  must not carry a stack. A project template ships `factory/images.yaml`
  with its `default`, so a project starts on its template's image. The
  factory's own project keeps its image (`opencode-worker`) as its default
  and declares variants only. A project whose file declares no `default`
  runs the factory image. A declared `default` that is not pinned yet also
  runs the factory image. Only a named variant that is not pinned parks.
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
it as the first commit's copy. One file, two uses. The file allows at most
4 names, and values must be safe to render into a Dockerfile.

The declared facts are the source of truth for two artefacts: the image
build and the image's manifest, which feeds the brief's sandbox facts
(piece 6). A tool the file does not name is not in the image, and the
brief never claims it.

### 2. The images

Three images:

- **The factory image** (`Dockerfile.sandbox`, pushed as
  `sf/opencode-worker`) carries the harness: agent-worker, opencode and
  its bake. It is the default of the factory's own project and the image
  every other project runs when its file declares no `default`. The
  factory keeps its static sandbox facts and its registry allowlist
  (`sandboxRegistries`).
- **The sandbox base** (`sf/sandbox-base`, the `base` stage of the same
  Dockerfile) holds what every project needs regardless of stack: the
  Debian snapshot with apt sources kept, git, curl, ripgrep, ssh, gcc and
  make, python3, PostgreSQL 17 (a test database is test infrastructure,
  not a stack) and user 1000. It carries no harness, no Go and no Node. It
  runs no pod. It is the parent of every project image.
- **Project images** are the base plus the project's declaration, named
  `git.aisoftwarefactory.world/sf/sandbox-<project>.<image>` and tagged by
  a content key over the declaration and the base digest. The dot cannot
  occur in either name, so the split is unambiguous. A template prebuilds
  nothing: the template's `default` is an ordinary entry in the new
  project's file, built by the same pipeline.

The harness rides an init container. Every sandbox pod runs an init
container `harness` from the factory image (`WORKER_IMAGE`) that copies
agent-worker, opencode and the opencode bake into an `emptyDir` at
`/factory`. The main container runs `/factory/bin/agent-worker` from that
volume, whatever image it runs, and agent-worker puts `/factory/bin` on
`PATH`. A factoryd roll therefore never makes a project image stale. A
project image rebuilds only when the base or its declaration changes.

Every image builds from the store alone: apt through the dated Debian
snapshot, every upstream file through the store's copy machinery (roadmap
203). The builder unpacks upstream files as root in a stage of their own
and the image takes only `/opt` and `/usr/local` from it by `COPY` after
its apt step, with nothing run after. An upstream line that plants a
symlink cannot carry another line's write elsewhere. A build is
reproducible from the commit, amd64 only. A project-declared input
executes during the build; its blast radius is the image, which sessions
run sandboxed.

Caps, refused by `factoryd config check` and at pin time: at most 4 image
names per project (`policy.MaxImages`) and a compressed size of at most
4 GiB (`policy.MaxImageBytes`).

### 3. Build, sign, pin

One workflow in the code repository, on the trusted runner, builds every
project's images from the project's declaration and signs them with a
separate images key. No project holds a key and no project runs its own
build. factoryd verifies project images with the images key and factory
images with the factory key. Neither key verifies the other, and tests
prove the refusal both ways.

The imager inside factoryd watches each project's `factory/images.yaml`,
dispatches the build for the key the file asks for and reads the signed
result from the store. It does not run a candidate check: a card's gates
run on the card's own image, so the first card on a new image proves it.

The pin lives in the infra repository. factoryd opens a pull request on
`sf/ai-software-factory-infra` that changes only the `images` block of
`factory/projects/<project>.yaml` (digest, key, tools, egress), and merges
it itself once it has checked that the pull request touches the images
block alone and that the tree passes factoryd's own config check. Every
other infra change stays human. factoryd reads the policy tree already,
the commit is the version, and a task pins the version at start, so a
task's image is as reproducible as its process.

The agent never builds, pushes or signs. It edits the declarative file
through a card; the pipeline does the rest.

### 4. Choosing the image

The plan gains an optional image name per card. Resolution order: the
card's image name, else the project's `default`, else the factory image.
A name resolves only against a signed pin in the policy version in force
when the session starts, and the task row records the digest it ran on.
A named variant with no pin parks the card in `waiting-image` until the
pin lands. factoryd hands the resolved digest to every sandbox pod the
card's work starts: the session pod, the repro pod, the criteria gate pod
and the hold-out dry run. Gates run the project's tests on the project's
image, or their verdicts prove nothing. A reproduction, criteria or
hold-out sandbox whose image has no pin is a start escalation at step
`image pin`.

Plan validation (ValidatePlan) refuses an image name the project's
declaration does not list, the same pass that refuses cycles and
impossible compositions. The model chooses from a closed list the tool
file declares.

### 5. The ask flow: a missing tool becomes a card

A session that lacks a tool calls `request_tool` (`tool`, `need`). The
call is free and ends the session with outcome `missing_tool`, the work
kept on the branch. A report session cannot call it. factoryd parks the
card in `waiting-image` (no work slot) and files a tool card on the
project's repository: small, the cheap rung, a child the asking card
depends on. Its body starts from the asking card's image entry, or from a
ready-made fragment of the factory image's stack (Go, Node, env, egress)
where the asking card ran on the factory image, so a cheap model does not
reconstruct that stack. The tool card edits `factory/images.yaml`, the
project's gates judge it, and it merges by the project's merge rule: a
human-merge project gets human-approved tool changes, an auto-merge
project gets AI-approved ones. One open tool card per image: a second ask
joins it with a comment while no session has started it.

When the merged file's image is built and pinned, the imager wakes the
card (`image_ready`) and the next session runs on the new image, its
findings naming the tool's arrival. A tool card closed unmerged, merged
without declaring the image, or merged with an image whose builds left no
signed image, reaches the next session as why the tool did not come. After
24 hours without a wake the card asks a human.

Egress follows the tool: an image's declared `egress` names join the task
namespace's DNS and Cilium allowlist (workerEgressSpec) when a pod runs on
that image. The gateway's resolved-address guard (roadmap 42) stands in
front of every new name, and each name lands in the audit trail with the
card that asked for it.

### 6. The brief's facts line

On a project image the brief's sandbox facts come from the image's
manifest: the tool list, the egress names and the base digest, generated
by the build from the file it built from. The factory image keeps the
static facts, derived from the image and `sandboxRegistries`. The test
that holds the factory's tool table to Dockerfile.sandbox still holds it
to the factory image.

### 7. Updates

A factoryd roll changes the factory image only. Project images rebuild
when the sandbox base is bumped (the roller's weekly bump) or when their
declaration changes, and the imager repins them through the same pull
request. A project keeps its previous pin until its rebuild lands. A red
rebuild keeps the old pin and raises an alert like any red build: after
three builds of a key leave no signed image, one alert names the builder.

### 8. Cleanup

1. **Store retention.** Once a pin changes in force, the store keeps of
   that image the pinned build, the one pinned before it and the build of
   the key the file asks for now. Every other version of
   `sf/sandbox-<project>.<image>` goes, through Forgejo's package API. A
   build pushed in the last 45 minutes or in flight stays.
2. **Unpinned names.** A name that leaves the pins keeps its last build
   for 30 days, so pinning it again undoes an unpin by mistake. Then every
   version goes. The rule keys on the image name, not the digest, because
   a weekly base bump repins every image.
3. **Nodes.** The kubelet's image GC already runs at 75 percent (roadmap
   252). No extra work.
4. **Unused variants.** Once a day per image, an image other than
   `default` that has been pinned for 30 days and that no card of the
   project named or ran on in those 30 days gets a removal card (source
   `image_removal`, small, the cheap rung) that deletes its entry from
   `factory/images.yaml`. It merges by the project's merge rule. No second
   card is filed while one is open or within 30 days of its end.
5. **Projects.** `remove-project` deletes the project's
   `sf/sandbox-<project>.*` packages and its image rows.

The caps bound the worst case per project: size cap times 4 names times
the pinned build plus the one before it.

## Constraints

- Immutable and re-seedable end to end: every image rebuilds from a commit
  of its tool file plus the store; the pin lives in the infra repository
  in git; deleting everything and re-seeding rebuilds all of it. A pin
  whose build the store lacks, as after a re-seed, is built again.
- Security: no direct credentials to agents, signed images (project images with the images key, factory images with
  the factory key), digest-only references (never a tag), no runtime installs outside the declared
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

One order, no fallback image: the factory's code project declares its
variants in `factory/images.yaml` and keeps the factory image as its
default. In-flight tasks keep their already-resolved digest, since a task
pins its policy version. A project with no `default` runs the factory
image; that is the rule of piece 2, not a legacy path.

## Sources

Sebastian 2026-10-19 and his decisions of 2026-10-22 (the design conversation: the initial image as a
creation choice, per-card matching, AI approval as the default under
signing, cleanup by construction). Roadmap 281 and 283 (the concept),
34 (typed blocked reasons), 42 (egress guard, built), 71 (per-project
cache, first half built), 203 (the store, built), 252 (image GC, applied).
The escalation-ladder redesign, section "Beside the ladder" (the origin:
card #854's browser). target-architecture.md, "Build speed, and the road
to microVMs" (the hardware fact that keeps nested container runtimes out).
