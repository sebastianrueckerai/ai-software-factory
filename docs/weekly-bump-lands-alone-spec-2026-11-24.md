# The weekly bump lands without a human

**Status:** design, written 2026-11-24. Code main at `d5f0078ae`, infra main at `dbfc6c2c`.

**Code:** `~/repos/ai-software-factory-code`. Paths below are relative to that repository.

## 1. Intent

The routine `weekly-bump` files one card each Monday. The card moves every pinned outside input of the factory's builds to the newest release of its line, in one pull request. The routine's own why line says that an agent updates the pins and the checks prove the update.

No agent run of the routine landed without a human. Sebastian asked on 2026-11-24, on card #2305: "Why would a version bump ever land with me?" This spec answers the question with the facts of the six runs and gives the changes that make the bump land alone.

## 2. Terms

- **Store:** the factory's own copy of every outside image and file its builds read. It is the organisation `upstream` of the Forgejo at `git.aisoftwarefactory.world`. A build reads only the store and never an outside host.
- **Pin:** a version with its digest or sha256. The image pins are the lines of `upstream-images.txt`. The file pins are the lines of `upstream-files.txt`.
- **Copy:** the step that downloads a pinned input from its maker, checks it against the pin and uploads it into the store.
- **Gate:** a check that a pull request passes before its merge. The audit and the review are gates that call a model.

## 3. The six runs

No agent run landed alone. The five agent runs cost 24.93 EUR.

| Run | Date | Filed as | End | Cost EUR |
|---|---|---|---|---|
| 1 | 2026-10-19 | human card | A human did the bump | 0 |
| 2 | 2026-11-02 | agent card #1471 | Sebastian closed it | 3.23 |
| 3 | 2026-11-09 | agent card #1540 | The factory closed it | 4.37 |
| 4 | 2026-11-09 | agent card #1574 | Merged on 2026-11-10 as pull request #1598 with the check `image-build` red, which a human accepted | 6.56 |
| 5 | 2026-11-16 | agent card #2091 | Sebastian closed it after the third `image-build` failure | 0.59 |
| 6 | 2026-11-24 | agent cards #2272, #2292, #2298, #2301, #2306 | Open. It waits on a human on #2305 and on #2306 | 10.18 |

Run 6 wrote the whole bump in its first session. The 20 files were right at 08:20 UTC. The 13 hours after that went into four plan revisions, five cards and two asks to a human, and none of them changed a pin.

## 4. Why a bump stops

### 4.1 The store gets the new files only after the merge, and the merge needs them before

A pull request's `image-build` check builds the changed images from the store. The store has two ways in:

| Input | Copied before the checks | Copied by |
|---|---|---|
| Image lines of `upstream-images.txt` | Yes | The copy pod that factoryd starts for each pushed head (`internal/factoryd/upstream_pod.go`, activity `CopyUpstreamImages`) |
| Chart archive lines and file lines of `upstream-images.txt` (the lines that start with `https://`) | No | The `upstream` job of `.forgejo/workflows/ci.yml`, on a push to `main` |
| Lines of `upstream-files.txt` | No | The same job |
| The Go module tarball of `go.sum` | No | The same job |
| The npm tarball of `opencode-plugin/package-lock.json` | No | The same job |

A bump that moves a file pin, `go.sum` or the lockfile cannot pass `image-build` before its merge. Every bump moves at least the Go vulnerability database, so every bump stops here.

The facts of run 6:

- The copy pod copied 29 of the 29 new image lines on 2026-11-24 between 08:24 and 08:28 UTC. The image half works.
- The store answers 404 for `node/v24.22.3` and `buildkit/v0.35.1`, read on 2026-11-24 at 21:00 UTC. It answers 206 for `node/v24.22.2`, which is the pin on `main`.
- The one new chart archive line, SigNoz 0.151.0, is not in the store either.

### 4.2 A missing file reports itself as a wrong checksum

The store answers a missing file with status 404 and the 22 bytes `package does not exist`. The build hashed that body and reported `digest mismatch sha256:8425f766…`. The sha256 of the text `package does not exist` is `8425f766421f942a5abece43fa71c854440e089309fb32871d5037dbf40a3eff`.

No step said "the store lacks this file". Three steps then gave three wrong causes:

- Run 5 named a "mirror lag" and re-ran the checks three times.
- Plan revision 2 of run 6 told the agent to write `8425f766…` into the pins. That value is the hash of the error text. The session did not obey, and it found the 404.
- A check-in of run 6 reported that the store "now serves node v24.22.3 with sha256 8425f766…".

### 4.3 The gates' model calls spend the whole answer limit on thinking

The cards of run 6 say that the gates "returned truncated model answers" and call it a provider question. It is not the provider. Each failed call used exactly its answer limit of 18432 output tokens. The model thinks first, the thinking counts against the limit, and 2 bytes of answer remain. The gate reads the 2 bytes, reports `the answer is not one JSON object: unexpected EOF`, and does not read why the answer stopped (`internal/factoryd/audit.go:143`, `internal/factoryd/supervisor.go`).

The gateway's audit table for the 14 days to 2026-11-24, model alias `big`:

| Gate | Calls | Used the whole limit | Timed out at the caller | Cards with a call that used the whole limit |
|---|---|---|---|---|
| audit | 354 | 13 | 13 | 9 |
| review | 444 | 63 | 18 | 22 |

For run 6 the audit used the whole limit in 6 of 7 calls, and the review in 7 of 19. A bump is the worst input for the audit: 30 changed image lines in a diff of 20 files give the model much to think about and little to say.

The fault is not the bump's alone. It hit 28 cards in two weeks. A bump cannot land while it stands: the audit of run 6 has no verdict on any head.

### 4.4 One pin lives in many files

Run 6 changed 20 files. Seven are tests that hold a version as a literal. Three are Go sources that repeat a pin of the lists or of `factory/images.yaml`: `internal/factoryd/buildvm.go`, `internal/factoryd/sandbox.go` and `internal/factoryd/agentdocloop.go`.

Each run lost a round here. Run 4 failed `TestFactoryStackIsTheFactoryImage` on a Node pin in `sandbox.go`. Run 5 fixed two such findings. Run 6's first pull request was red on two tests that expected the old version strings.

### 4.5 The brief describes a flow that no longer exists

The brief `factory/routines/weekly-bump.md` in the infra repository ends with: "The pull request's image-build builds the changed images from the upstreams at the new digests. Its merge has main CI's upstream job copy the new lines into the store." The first sentence was true before the builds moved to the store. Every planner and every session of run 6 started from it.

`docs/manual/operations.md` says the routine files a human card, "since no agent sandbox reaches a registry or a release page". The project file says `files: agent`.

### 4.6 The ask to the human named an act that does not exist

Card #2305 recommends: "Run the upstream copy workflow on main, then re-run checks on #2301". No workflow can do that. The copy is a job of `ci.yml`, which only a push to `main` starts, and it reads the lists of `main`, which hold the old pins. Card #2301 was closed 7 minutes after the ask, and its work moved to #2306.

Card #2306 then asked the same human for the same act a second time, in other words. Its text has the correct act: run `scripts/upstream-files` at the pull request's head with the store's login.

## 5. Design

### 5.1 One copy before the checks, for every kind of input

The copy pod copies everything a pushed head adds, before the checks of that head start:

1. each new line of `upstream-images.txt`, of all three kinds: image, chart archive and file for a pod,
2. each new line of `upstream-files.txt`,
3. the Go module tarball, when the store has none for the head's `go.sum`,
4. the npm tarball, when the store has none for the head's lockfile.

The pod runs the two scripts that `main` CI runs, `scripts/upstream-copy` and `scripts/upstream-files`, as `main` holds them, over the lists, `go.mod`, `go.sum` and `opencode-plugin/` of the head. The tarballs need `go` and `npm`, and only the CI runner image has them, so the pod runs the runner image at the digest factoryd pins. The Go copier of `internal/factoryd/upstream_copy.go` goes: it repeats `scripts/upstream-copy` for one of the five kinds, and one program must fill the store.

The `upstream` job of `ci.yml` stays as it is. It fills an empty store from the lists of `main` after a re-seed. In a normal week it finds every copy in place and uploads nothing.

Rules of the pod, which hold what a pull request can do with it:

- **The code is main's, the data is the head's.** The pod never runs a script, a Makefile or a hook of the head.
- **No code of a dependency runs.** The npm step runs with `--ignore-scripts`. The Go step runs `go mod download` only, with `GOTOOLCHAIN=local` and `GOFLAGS=-mod=mod`.
- **The egress is a fixed list in code**, as today: the registries, plus the hosts the file lines name (`github.com` and its release hosts, `code.forgejo.org`, `nodejs.org`, `vuln.go.dev`, `www.postgresql.org`), `proxy.golang.org` and `registry.npmjs.org`. A line that names another host is a finding, and the list grows by a commit a human sees.
- **The login is the run's own**, minted for the run and revoked after it, with package write on the organisation `upstream` and nothing else, as today.
- **A line the pod cannot copy is a finding on the card**, as today for images: the line, and what its URL served.

The store keeps the first upload of a path. A pull request can therefore put the bytes of one real file under the path of a version that does not exist yet. No build can use those bytes, since every reader checks the pin's sha256. A later true bump of that version gets the finding "the store holds other bytes", and a human deletes the one package version. The spec accepts this. A store path that carries the sha256 closes it, at the price of a new URL shape in every Dockerfile, and nothing asks for that yet.

### 5.2 A missing copy names itself

`image-build` gets a first step that asks the store for each line of both lists that the changed Dockerfiles read. For each line the store lacks, the step prints `the store lacks <package> <version> <file>: the copy before the checks did not make it` and fails the job. The step runs before the build VM is made, so a miss costs seconds and no VM.

After 5.1 the step fails only when the copy itself failed, and the card then holds the copy's finding too. The step is there because a refusal must name the state: the digest mismatch of 4.2 cost three wrong diagnoses.

### 5.3 A gate call that runs out of answer room says so and asks once more

`SupervisorModel.Chat` reads the answer's finish reason. When the reason is `length`:

1. The gate calls once more with twice the answer limit, inside the card's free budget.
2. When the second call ends at its limit too, the gate records "no verdict" with the cause in plain words: `the model used its whole answer limit of <n> tokens before it answered`. The cause stands on the card and in the chat's tools, where `unexpected EOF (an answer of 2 bytes)` stands today.

The same holds for the brief writer, which failed three times in run 6 with `the model's answer is no brief: {"`.

The plan for this part measures two things first, on the 76 calls of 4.3: how many would pass at twice the limit, and whether the gateway's model map can cap the thinking of the `big` alias for JSON-mode calls. When a cap is possible, it is the better fix, since it costs nothing per call.

The 31 calls that timed out at the caller after about 404 seconds are the same fault in most cases: the model was still thinking. The measurement covers them.

### 5.4 A pin lives in the lists

A Go source that needs a pin reads it from the list, compiled into the binary with `go:embed`. A test that checks a pin compares two places with each other and holds no version literal.

- `buildvm.go`, `sandbox.go` and `agentdocloop.go` take version and sha256 from `upstream-files.txt` and `factory/images.yaml`.
- The seven tests of run 6's diff lose their literals. `TestDockerfileDownloadsCarryAChecksum` shows the shape: it compares each `ADD --checksum` with its list line.

After this a bump changes the two lists, the three Dockerfiles, `go.mod`, `go.sum`, `factory/images.yaml` and the plugin's two package files, and no `.go` file.

### 5.5 The brief and the manual say what the factory does

The brief's last paragraph becomes: the factory copies every new line of the head into the store before the checks, a line it cannot copy comes back as a finding, and the finding names what the URL served. The sentence on the Go vulnerability database keeps its rule to hash the zip just before the push.

`docs/manual/operations.md` loses "a human's, since no agent sandbox reaches a registry or a release page" and gains the copy before the checks.

### 5.6 When a bump goes to a human

After 5.1 to 5.5 no step of a bump needs a human by its construction. A bump reaches a human only by the ordinary ladder, when a new version breaks a test and the sessions cannot repair it inside the card's budget.

A newer major line, such as opencode v2 next to the pinned v1 line, is not an ask. The session keeps the line and names the newer one in its summary, as run 6 did.

### 5.7 One ask for one act

Run 6 put two cards in Needs you for one act, and the first named a workflow that does not exist. Two changes, both in code:

- A card that stops on a question which another open card of the same plan already asks does not ask again. It waits on that card and says so on its face: "waits on #2305".
- The chat's tool `escalate`, which files such a card, gets an optional field `act`: the exact command or press that the human does outside the factory. The card shows it as its own block. Today a choice of this card is free text of at most 60 characters, and a press only posts the words and closes the card, so the card has no place for the act itself.

Section 5.1 removes this ask. The two changes are for the next act that only a human can do.

## 6. Not built now: a program that looks up the new versions

The lookup of a bump is deterministic: the newest tag of a line, its digest, a file's sha256. A program could do it in the copy pod, which has the egress, and file the result as a pull request card, as the template pass does. The agent would then work only when a check fails.

This spec does not build it. Run 6's first session did the whole lookup correctly, and every loss after it came from 4.1 to 4.6. The program needs about eight resolvers (registry tags, GitHub and Forgejo releases, nodejs.org, go.dev, the vulnerability database, the Debian snapshot, the PGDG archive, chart indexes) and their upkeep.

**The decision for Sebastian:** build the lookup program now, or measure first. The recommendation is to measure. When two of the four runs after 5.1 to 5.5 need a human or cost more than 3 EUR, build it.

## 7. Run 6: the acts that land it by hand

1. Check out the head of pull request #2309 of the code repository.
2. Export the store's login as `REGISTRY_USER` and `REGISTRY_PASSWORD`.
3. Run `scripts/upstream-files` inside the CI runner image, as the `upstream` job of `ci.yml` does. Each upload prints `uploaded <package> <version> <file>`.
4. If the script prints `its URL does not serve the pinned sha256` for `vulndb.zip`, the database moved since the pin. Answer #2306 with that line, and the session pins the new sum.
5. Answer #2305 with "the store holds the files", and re-run the checks on #2306.
6. The audit has a verdict on no head of run 6. When it has none on the green head either, merge #2309 by hand: the review approved the heads `57c84a87` and `e89590bb`.

## 8. Order of work

1. **5.3, the gates.** It hit 28 cards in two weeks, the bump among them. It is a plan of its own.
2. **5.1 with 5.2 and 5.5, the copy.** One plan. Its proof is a pull request that moves one file pin and goes green with no human act.
3. **5.4, the pins.** One card, a refactoring with no change in behaviour.
4. **5.7, the ask.** One card.

## 9. Not in this spec

- **The infra repository's references.** A code bump moves the lists and fills the store. The manifests of the infra repository keep the old digests until someone moves them, and no routine does. Run 6's list moves Forgejo, CloudNativePG, Talos, Cilium and Flux, and each of these is an upgrade of the running cluster. That work needs its own design.

## 10. Not verified

- The log of `image-build` was not read. That the build hashes the 404 body comes from the cards' quotes of the log and from the matching sha256.
- How the sessions read the makers' checksums is not known. The sandbox's egress for these cards is `proxy.golang.org`, `sum.golang.org`, `storage.googleapis.com` and `registry.npmjs.org`.
- Whether the CI runner image runs as the copy pod under the pod's security rules was not tried.
- The share of the 76 calls that would pass at twice the answer limit is not measured.
