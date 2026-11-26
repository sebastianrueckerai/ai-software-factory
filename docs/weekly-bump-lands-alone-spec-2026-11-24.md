# The weekly bump lands without a human

**Status:** built on 2026-11-24 and 2026-11-25. The code is on main at `4f4380891`, the infra changes at `9dc57ff`. Section 11 says what is live and what is not checked on the cluster yet. The sections 5.2, 5.3 and 6 say what was built where the build changed the first design.

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

The `changes` job of `.forgejo/workflows/pr.yml` runs `.forgejo/store-holds.sh` over the Dockerfiles the pull request builds. The script asks the store for each image line and file line those Dockerfiles read, and for the two tarballs. For each input the store lacks it prints `the store lacks <package> <version> <file>: the copy before the checks did not make it` and fails the job.

Two facts of the build moved the step from `image-build` to `changes`:

- factoryd makes the build VM before the first step of `image-build` runs. `image-build` needs `changes`, so only a step there fails before a VM exists.
- Forgejo starts the checks of a pushed head at the push, at the same time as the copy. The script therefore waits for the copy, 30 seconds between rounds and at most 30 minutes, which is longer than the copy pod may run.

After 5.1 the step fails only when the copy itself failed, and the card then holds the copy's finding too. The step is there because a refusal must name the state: the digest mismatch of 4.2 cost three wrong diagnoses.

### 5.3 A gate call that runs out of answer room says so and asks once more

`SupervisorModel.Chat` reads the answer's finish reason. The check-in's call shares this path. When the reason is `length`:

1. The gate calls once more with the same answer limit at low thinking depth: the request carries `reasoning_effort: low` and `allowed_openai_params: ["reasoning_effort"]`. The gateway forwards that list only as exactly this value.
2. When the second call ends at its limit too, the gate records "no verdict" with the cause in plain words: `the model used its whole answer limit of <n> tokens before it answered`. The gateway names the limit it gave in the response header `X-Gateway-Output-Limit`. The cause stands on the card and in the chat's tools, where `unexpected EOF (an answer of 2 bytes)` stood.
3. A call that times out at the caller reports `the model did not answer within <d>`.

The audit and the review record `thinking: low` on their step when their verdict came from the second call. The brief writer, the answer screening and the delta round take the same path.

The first design asked for twice the answer limit. Two facts ruled it out:

- The gateway gives the alias `big` at most 24576 output tokens, so a second call got 1.33 times the room. At the measured 55 to 140 tokens a second, such a call meets the 6-minute timeout at the slow end.
- A probe through the model gateway on 2026-11-24, three calls for each setting, shows what bounds the thinking: with no setting the model thought 2273, 4766 and 5004 tokens, with `reasoning_effort: high` 4429, 6187 and 4962, and with `low` 32, 43 and 45.

A second fault stood beside this one: LiteLLM dropped `response_format` and `reasoning_effort` for the provider behind `big`, so the gates' JSON mode and the low thinking depth never reached the model. LiteLLM's list of that provider's parameters names neither, in the deployed version and in the newer one, so an upgrade does not fix it. The gateway fixes it: it names both parameters in `allowed_openai_params` on every call, which makes LiteLLM pass them, and it refuses that field from a caller.

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

## 6. A program looks up the new versions

Sebastian decided on 2026-11-24: "Build it now, a program is the way to go."

The routine `weekly-bump` runs a pass, `pass: bump`, and files a pull request. No model takes part until a check fails.

1. factoryd reads the eleven files of a bump at main: the two lists, the three Dockerfiles, `go.mod`, `go.sum`, `factory/images.yaml` and the plugin's two package files.
2. A pod runs `upstream-bump`, which the CI runner image carries, with the release hosts in its fixed egress and with no store login. The program looks up each line, hashes each file it downloads, runs `go get -tool` for govulncheck and `npm install --package-lock-only --ignore-scripts`, and hands the changed files and a text back.
3. factoryd commits the files on the bot's fork, copies the new inputs into the store with the pod of 5.1, opens the pull request and files the routine's card with the pull request on its row.
4. The card is an ordinary agent card. When a check of the pull request fails, a session gets the failing check as its finding.

**The rule for the newest release of a line** is one function with a table test:

- A tag that starts with a version moves to the newest stable version with the same first number, the same suffix and the same number of parts.
- A tag that is no version keeps its tag and takes its digest of today.
- A word after a line's kind in `upstream-images.txt` refines it. `patch` keeps the line in its minor. `hold` never moves it. `with <name>` gives it the version of another line. `hold with <name>` holds it and names the line it follows.
- A newer major that the rule leaves is named in the pull request's text. So is each line the rule holds, and each pin the program could not resolve. An unresolved pin stays as it was and does not stop the bump.

A file's sha256 is always the program's own hash of its own download.

**The proof.** A dry run against the real hosts on the tree of the week before reproduced `go.mod`, `go.sum`, both package files and `factory/images.yaml` of pull request #2309 byte for byte. It differs in 7 other places, each explained: 4 releases or digests that came out after #2309's lookup, the Debian snapshot date, which the rule takes from the image's own date, the held cilium-envoy, and the barman plugin's v0.16.0.

## 7. Run 6: how it landed

Run 6 landed on 2026-11-24. `scripts/upstream-copy` and `scripts/upstream-files` ran by hand over the head of pull request #2309, inside the CI runner image, and uploaded the SigNoz chart, four files and the two tarballs. The script refused the Go vulnerability database, which had moved since its pin. The pin went to `20261124T155600Z` on the branch. All six checks went green, `image-build` among them, and the pull request merged as `0d2ead278`.

## 8. Order of work

All parts are built. The plan [2026-11-24-open-cards-root-causes.md](plans/2026-11-24-open-cards-root-causes.md) holds the order, the commits and the state of each.

## 9. Not in this spec

- **The infra repository's references.** A code bump moves the lists and fills the store. The infra project's routine `follow-bump` then moves the cluster to the lists, one part for each run. [The follow spec](infra-follows-bump-spec-2026-11-25.md) holds that design and its live state.

## 10. Not verified

- The log of `image-build` was not read. That the build hashed the 404 body comes from the cards' quotes of the log and from the matching sha256.
- Whether a gate's verdict at low thinking depth is as good as one at full depth is not measured.

## 11. Live state on 2026-11-25

All of it runs on the cluster. The routine's project file says `files: pull-request` with `pass: bump`.

Run 9 is the first bump that landed with no human and no session. The routine filed pull request #2332 at 18:38 UTC. The copy pod filled the store, all six checks went green, the review approved, and the audit made one finding on the new cosign sha256. The project agent checked that finding and approved the merge, and the pull request merged at 18:57 UTC, 19 minutes after it was filed.

Runs 7 and 8 failed on three faults that only the cluster showed: the copy pod's egress list, a queued card that could not enter review, and a new sha256 for the Go vulnerability database under an unchanged version. The plan's section 9.3 names each fix.

Not seen on the cluster:

- a gate call that is cut and answers at low thinking depth,
- a bump whose check fails and whose session repairs it to a merge. Run 8's session started on the failed check, and that check could not pass.

The run moved the lines of Kubernetes and Talos again, and the cluster does not follow them. Since 2026-11-26 those lines are back at the versions that run and carry `hold`, and the bump's text names the newer version. [The follow spec](infra-follows-bump-spec-2026-11-25.md) has the detail.
