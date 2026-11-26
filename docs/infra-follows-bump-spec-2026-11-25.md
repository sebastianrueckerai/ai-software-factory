# The running cluster follows the weekly bump

Status: built and deployed on 2026-11-26. Sebastian chose the direction on 2026-11-25: the factory upgrades the cluster by itself, and the few parts the factory cannot live without wait for his merge. Section 11 names where the build differs from the first design, and section 12 holds the live state.

This spec continues [the bump spec](weekly-bump-lands-alone-spec-2026-11-24.md), section 9.

## 1. The fault

The weekly bump moves the pins in the code repository's `upstream-images.txt` and fills the store. The infra repository names the store's copies by tag and digest, and nothing moved those names. So the cluster kept the old versions, and the bump's fixes never reached what runs.

The state on 2026-11-25:

- The infra repository named 51 different digests. 3 of them were a current line of the list.
- LiteLLM ran 1.102.4, and the list held 1.108.17. SigNoz ran v0.143.0, and the list held v0.151.0. Temporal ran 1.32.0, and the list held 1.32.2.
- Nothing reported the distance. The infra repository's check tested only that each named copy is in the store. The store never deletes a copy, so that test passes for ever.

## 2. What the design holds

1. A reference moves by a program. A model has no part in it.
2. One part moves at a time. A fault then has one cause.
3. A step that is not a model judges each move, before the merge and after it.
4. A failed move returns the cluster and the repository to the state before it, and a human gets one card that says what failed.
5. A part whose failure stops the return path never moves without a human.
6. The list says what the cluster is meant to run. A line that the cluster never follows is a false statement.

## 3. Three lanes

Each part of the cluster is in one of three lanes. The lane is a field of the part in the infra repository's project file, so it is configuration and not a rule in a prompt.

| Lane | Who merges | Parts |
|---|---|---|
| `alone` | The factory | k8s-infra and its collector, the job images (kubectl, the k8s tools, aws-cli), the ts-go template's images and tools, the build-cache registry, local-path, LiteLLM |
| `human` | A human, on a pull request the factory prepared | SigNoz, cert-manager, Temporal, OpenBao, Forgejo inside its major, the database (the CNPG operator, Postgres, the Barman plugin) |
| `hand` | A human, by the runbook. The factory opens no pull request | Talos and Kubernetes, Cilium, Flux, the runner, the Gateway API manifest |

The order in the table is the order of moves: from the least central part to the most central one.

The reasons for the parts that are not in `alone`:

- **The database, Forgejo and cert-manager** are on the return path. A revert is a commit in Forgejo, Forgejo's data is in the one database cluster, and Flux pulls from Forgejo through the edge, whose certificate is cert-manager's.
- **Temporal** stops factoryd when it is absent, and its schema moves one way.
- **OpenBao** seals at every restart, and only a human can unseal it. Its pod also keeps the old image until a human deletes it.
- **SigNoz** is tied to the code: factoryd parses the webhook of one SigNoz version. It moves to `alone` when a test sends one alert through the new version and factoryd reads it. That test does not exist yet.
- **Talos, Kubernetes, Cilium and Flux** are upgraded by hand, each by its own decision in the infra repository's README.
- **The runner** stays at 12.7.3 by an earlier decision. It also runs the checks of a revert, so it is on the return path.

### The list tells the truth about the `hand` lane

The bump program had moved the lines of Talos, Kubernetes, Cilium, Flux and the runner, because their words allowed it. The cluster did not follow, so those lines named versions that ran nowhere.

15 lines are back at the versions the cluster runs, and each carries the word `hold`. The bump now looks up a held line too. It never moves the line, and its pull request's text says "held at X, newest Y" when a newer version exists. So the weekly pull request is the reminder that an upgrade by hand is due. When a human upgrades such a part, the same change moves its line.

`upstream-files.txt` takes the same words after a line's sha256.

## 4. Markers and the follow program

The infra tree names its references in nine different forms: a tag and a digest in one value, a digest alone, a chart's version, a full image string, an entry of kustomize, and more. A program that guesses the list line from the form is wrong sooner or later. So each reference carries a marker, a comment line directly above the line that holds the value:

```yaml
# pin ghcr.io/berriai/litellm
tag: "1.102.4@sha256:..."
```

| Marker | Names | The program writes |
|---|---|---|
| `# pin <name>` | the one image or chart line with that name. Where several lines share a name, the marker adds the tag, with `*` for a run of digits | tag and digest, or the digest alone, by the shape of the value |
| `# pin chart <chart>` | the archive line of a chart in the store's Helm repository | the version |
| `# pin image-of <archive>` | the line of a file that the store turned into an image | the tag from the file's sha256, the digest from the store |
| `# pin file <package>` | a line of `upstream-files.txt` | the version, the URL or the sha256 that stands on the marked line |
| `# pin copy <package>` | the same kind of line. The marked line names a file that is the maker's file, unedited | the file's bytes, checked against the line's sha256 |

The vendored manifests of the CNPG operator, the Barman plugin and local-path were copies with digests edited in. They are the makers' unedited files now. Their digests are kustomize `images:` entries under markers, and every other local change is a kustomize patch. Each has a line in `upstream-files.txt`, bound to its image line's version.

The program is the package `internal/follow` inside factoryd. It calls no outside host, so it needs no pod.

- **Input:** the tree, the two lists at the tree's root, and the parts from the project file.
- **Work:** it finds every marker, checks that it lies in exactly one part, and writes the marked value from the list's line.
- **Output:** for each part, the changed files and each move with the version before and after.
- **Refusals,** each with file, line and key: a key with no line, a value of no known shape, a marker outside every part, a digest in the tree with no marker, and a tree that is newer than its line.

The lists reach the infra repository by the copy that already carries the generated schemas: after each roll the factory opens a pull request with its build's copies and merges it by itself.

A human runs the same program as `factoryd follow <dir>`, which prints what is behind. `factoryd follow check <dir>` is the check of the markers, and the infra repository's `config-check` runs it on each push to main.

## 5. The routine

The infra project has one routine, `follow-bump`, on Tuesday at 05:00 UTC, one day after the bump, with "Run now" as for every routine.

The infra project has no agents, and that stays so. A project without agents refuses a routine whose pull request an agent must repair. The pass `follow` is allowed there, because a program does the work and no session ever starts.

One run does this:

1. If a move runs, or a failure card of the project is open, end with a report line that names it.
2. Run the program. If no part is behind, end with a report line.
3. Take the first part behind that has no try yet for its target versions. A try is a pull request of the branch `factory/follow-<part>-<hash of the target>`, in any state. So each target gets one try by itself, and a later version of the part gets a new try.
4. Check that the store holds every reference the program wrote. A missing copy ends the run with a line that names it, and no pull request opens.
5. Commit on the bot's fork, open the pull request, and start the move.

The move is a Temporal workflow, one for each project at a time:

1. Lane `alone`: merge as the bot. Lane `human`: file one card with the versions, a link to the maker's release notes and the part's own words, with the acts "Merge" and "Reject". Reject leaves the part until its next version. The move waits up to 14 days for the human.
2. After the merge, judge the move (section 7).
3. On a good move, start the next run at once. On a failed move, return (section 8).

The first runs work through the distance with the same program, one part for each run. No second procedure exists for the first time.

## 6. Checks before the merge

A pull request of a move is the program's own output, so its content is right by construction. Three checks guard the rest:

- **The store holds each reference,** checked before the pull request opens.
- **The head is pinned.** The factory merges only the commit that the pass pushed. The merge call names that commit, so a later push to the branch cannot ride in. The human card's Merge does the same.
- **An open pull request from an earlier run is taken over** only when its files equal what the program writes now.

The infra repository runs no job on a pull request. Its one runner is privileged and runs only what a human pushed to main, and the sandboxed runner of the code repository needs a credential for the infra repository that only a human can mint. A chart that does not render fails in Flux before anything in the cluster changes, and the judgment after the merge sees it.

## 7. The judgment after the merge

A move is good when all of these hold, read by factoryd without a model:

1. The commit statuses `flux/flux-system` and `flux/platform` are success on the merge commit, or on a later commit of main that contains it. The Kustomizations `platform` and `factory` wait for healthy objects now, so success means that every HelmRelease is ready and every workload is available. A failure status fails the move at once, and so does no status after 30 minutes.
2. The probes of factoryd's dependencies answer: Forgejo, Postgres, Temporal and OpenBao (unsealed).
3. One model call on the small class answers through the gateway.
4. No alert of the platform's namespaces fires in the 10 minutes after that, the settle time the alerts already use.
5. After those 10 minutes, the probes of step 2 and the model call of step 3 answer once more. The gateway keeps LiteLLM's prices for 5 minutes, so the first call still runs on what the gateway read before the move.

Two alert rules are new: a HelmRelease that failed or went back, and a volume claim that a provisioner refused.

The judgment sees only what something uses inside the settle time. A fault that shows later, on a path nothing took in those 10 minutes, passes it. The alert then files its card, and a human returns the move.

## 8. The return after a failed move

Flux does the first half without Forgejo and without the factory: each HelmRelease retries an upgrade three times and then goes back to the release before it, from Helm's own history in the cluster.

The factory does the second half: it reverts the merge commit, merges the revert as the bot with the same pinned head, and waits for Flux's statuses on it. Then it files one card: the part, both versions, what failed with its text, and whether the return held. The card's act is "Try again", which starts a new try for the same target.

A failed target gets no second try by itself. The next version of the part does. A human who wants a line to stay writes `hold` on it.

**The limit of the return:** a schema that moved does not go back. LiteLLM's migration job is the one such case in the `alone` lane. After a return, the old LiteLLM runs on the newer schema. LiteLLM's makers keep minor steps compatible in that direction, and the list holds LiteLLM inside its minor steps by the word `patch`. If the old version does not start, the card says so, and the factory stays without model calls until a human acts. The factory's own state is not at risk in that case.

## 9. What was built

| Repository | Change |
|---|---|
| code | The bump looks up held lines and reports the newer version. `upstream-files.txt` takes the words. 15 lines of the `hand` lane are back at what runs, with `hold`. File lines for the three vendored manifests and the template's go tool |
| code | The package `internal/follow`, `factoryd follow` and `factoryd follow check`. The schema copy carries the two lists, and it waits for pending checks before it merges |
| code | `parts:` in the project schema, the pass `follow`, the move's workflow, the judgment, the return, the failure card with "Try again", and the OpenBao probe |
| infra | A marker above every reference of the lanes `alone` and `human`. The three vendored manifests as unedited copies under kustomize. `wait` on the Kustomizations `platform` and `factory`. The alert rule for a failed HelmRelease |
| infra | The parts and lanes in the project file, the routine, and the marker check in `config-check` |

## 10. What this spec leaves out

- **The Kubernetes version is pinned nowhere in the infra repository.** It is the default of the Talos tool at the time of the install. This needs its own decision with the Talos upgrade.
- **A routine for the `hand` lane.** The held lines in the bump's text are the reminder.
- **The SigNoz webhook test** that moves SigNoz to `alone`.
- **A check job on the infra repository's pull requests.** It needs a runner registration for that repository on the sandboxed runner, which a human mints.

## 11. Where the build differs from the first design

| First design | Built | Why |
|---|---|---|
| The program finds a reference by the image or chart name | A marker names the list line | Nine forms of reference, and some name their image only by a key's path |
| A command in the runner image, run in a pod | A package inside factoryd | The program calls no outside host |
| The program reads the list at the code repository's main | The lists are copied into the infra repository | The check there needs no second repository |
| `config-check` runs on pull requests | The store check, the pinned head, and the judgment after the merge | Section 6 |
| The judgment reads each part's workloads | It reads Flux's two commit statuses | With `wait`, the status already means healthy, and it needs no new read rights and no list of workloads |
| The failure card has "Try again" and "Hold this version" | "Try again" only | A failed target is never tried again by itself, so a hold has nothing to stop |
| The human card has "Merge" and "Not this week" | "Merge" and "Reject" | Reject means the same: the part waits for its next version |
| The lines of the `hand` lane get `hold` | They also went back to the versions that run | With `hold` alone they still named versions that run nowhere |

## 12. Live state on 2026-11-26

The routine ran for the first time at 01:47 UTC by "Run now". Each good move started the next run by itself.

| Run | Part | Move | Pull request | Result |
|---|---|---|---|---|
| 1 | job-images | kubectl 1.36.1 to 1.36.4, the k8s tools 1.36.1 to 1.36.6, aws-cli 2.28.5 to 2.42.3, in 12 places | #353 | good, 13 minutes |
| 2 | ts-go-template | the node and debian base images, the node tool | #354 | good, 13 minutes |
| 3 | build-cache | the registry image's digest | #355 | good, 13 minutes |
| 4 | local-path | the maker's manifest and the image, v0.0.31 to v0.0.37 | #356 | judged good, and it was not. See below |
| 5 | litellm | the chart and the image, 1.102.4 to 1.108.17 | #357 | judged good, and it was not. See below |
| 6 | signoz | the chart 0.143.0 to 0.151.0 and six images | #360 | the first card of the lane `human`, infra #361, waits for its answer |

The part k8s-infra was in step with its lines, so the first run passed it by.

Each move's steps are comments on its pull request: the head's checks, the merge, Flux's statuses, the probes and the model call, and the 10 minutes with no alert.

Four faults showed on the cluster, and all four are fixed:

- **A red check on main did not fail a move.** The new local-path manifest writes its image name with `docker.io/` in front. The kustomize entry no longer matched, so the image ran by its tag with no digest. Flux's statuses were success, and the judgment read only those. The infra repository's check on the merge commit failed, and the factory filed its card for a red chain. The entry is corrected on infra main as `e722297`, and the card closed by itself. The judgment now reads the whole chain by the rule that card uses: the push's check and Flux's statuses. A red check fails the move, and the return follows.
- **The store check asked Forgejo's Helm endpoint with HEAD,** which that endpoint refuses with 405. The sixth run, the first with a chart archive, stopped there. The check reads a chart with GET now, and an answer that is neither "there" nor "missing" ends the run after three tries with a line that says so.

- **A move broke a path that nothing took in the settle time.** local-path refuses, from v0.0.33, a storage class whose path does not start with the claim's namespace. The cache class shares one path on purpose. The first new cache claim came 95 minutes after the move, and from then on no CI runner pod started, for ten hours. The roll of the two fixes above waited on its checks and asked a human. The cache class now carries the maker's switch for a shared path (infra `a41cc58`), and the new alert rule for a refused volume claim files a card within minutes.
- **A move broke the model calls after the judgment's model call.** LiteLLM 1.108.17 adds the field `pricing_overrides` to its model info, the names of the rates a deployment sets itself. The gateway refuses a cost field it does not know, so it refused every model call, for eleven hours. The judgment's call came two minutes after the merge, while the gateway still held the prices it read before the move. The judgment now asks again after the settle time, the gateway reads the field as the list of names it is, and LiteLLM went back to 1.102.4 by hand and then to 1.108.17 again on the fixed gateway.

Not seen on the cluster yet: a card of the lane `human` answered with Merge, a failed move with its return and its card, "Try again", and either new alert rule in the fired state.
