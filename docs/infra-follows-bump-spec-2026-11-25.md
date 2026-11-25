# The running cluster follows the weekly bump

Status: a design, not built. Sebastian chose the direction on 2026-11-25: the factory upgrades the cluster by itself, and the few parts the factory cannot live without wait for his merge.

This spec continues [the bump spec](weekly-bump-lands-alone-spec-2026-11-24.md), section 9.

## 1. The fault

The weekly bump moves the pins in the code repository's `upstream-images.txt` and fills the store. The infra repository names the store's copies by tag and digest, and nothing moves those names. So the cluster keeps the old versions, and the bump's fixes never reach what runs.

The state on 2026-11-25, infra main `9dc57ff` against code main `e0ec821`:

- The infra repository names 51 different digests. 3 of them are a current line of the list.
- LiteLLM runs 1.102.4, and the list holds 1.108.16. SigNoz runs v0.143.0, and the list holds v0.151.0. Temporal runs 1.32.0, and the list holds 1.32.2.
- Nothing reports the distance. The infra repository's check runs `scripts/upstream-images-test/test.sh` without the list, so it tests only that each named copy is in the store. The store never deletes a copy, so this test passes for ever.

## 2. What the design must hold

1. A reference moves by a program. A model has no part in the lookup, as in the bump.
2. One part moves at a time. A fault then has one cause.
3. A step that is not a model judges each move, before the merge and after it.
4. A failed move returns the cluster and the repository to the state before it, and a human gets one card that says what failed.
5. A part whose failure stops the return path never moves without a human.
6. The list says what the cluster is meant to run. A line that the cluster never follows is a false statement.

## 3. Three lanes

Each part of the cluster is in one of three lanes. The lane is a field in the infra repository's project file, next to the part's paths, so it is configuration and not a rule in a prompt.

| Lane | Who merges | Parts |
|---|---|---|
| `alone` | The factory | LiteLLM, k8s-infra and its collector, the build-cache registry, local-path, the job images (kubectl, the k8s tools, aws-cli), the ts-go template's images and tools |
| `human` | A human, on a pull request the factory prepared and checked | The database (the CNPG operator, Postgres, the Barman plugin), Forgejo inside its major, Temporal, cert-manager, OpenBao, SigNoz |
| `hand` | A human, by the runbook. The factory opens no pull request | Talos and Kubernetes, Cilium, Flux, a new major of Forgejo, the runner |

The reasons for the parts that are not in `alone`:

- **The database, Forgejo and cert-manager** are on the return path. A revert is a commit in Forgejo, Forgejo's data is in the one database cluster, and Flux pulls from Forgejo through the edge, whose certificate is cert-manager's.
- **Temporal** stops factoryd when it is absent, and its schema moves one way.
- **OpenBao** seals at every restart, and only a human can unseal it. Each upgrade restarts it, so a human is needed in any case.
- **SigNoz** is tied to the code: factoryd parses the webhook of one SigNoz version, and the stored alert objects are in that version's form. It moves to `alone` when a test sends one alert through the new version and factoryd reads it. That test does not exist yet.
- **Talos, Kubernetes, Cilium and Flux** are upgraded by hand today, each by its own decision in the infra repository's README. This spec does not change that.
- **The runner** stays at 12.7.3 by an earlier decision, because 13 breaks the workflows.

### The list tells the truth about the `hand` lane

The bump program moved the lines of Talos, Kubernetes, Cilium and the runner this week, because their words allow it. The cluster does not follow, so those lines now name versions that run nowhere.

Each line of a `hand` part gets the word `hold`. The bump's text already lists every held line that has a newer version, so the weekly pull request is the reminder that an upgrade by hand is due. When a human upgrades such a part, the same change moves its line.

## 4. The follow program

A second command in the runner image, next to `upstream-bump`: `upstream-follow`.

- **Input:** the list at the code repository's main, and the infra repository's tree.
- **Work:** it finds each reference in the tree by the image or chart name, and writes the tag and digest of the list's line with the same name. A chart from the store's Helm repository gets the version of its archive line. The vendored manifests (CNPG, local-path) are replaced by the maker's file for the new version, which the list pins as a file line.
- **Output:** one change set for each part, with the part's lane and the versions before and after.
- **Refusals:** a reference with no line, and a line of a moved part that no reference uses, both stop the program with the name of the line. So a new image cannot enter the infra repository without its pin.

The program reads the parts and their paths from the project file. It holds no list of parts in its code.

## 5. The routine

The infra project gets one routine, `follow-bump`, weekly, one day after the bump, with "Run now" as for every routine.

The infra project has no agents, and that stays so. A project without agents refuses a routine that files a pull request today. The refusal changes to: such a routine is allowed when its pass is a program. No session ever starts for it, and each failure goes to a human card.

One run does this:

1. Run the program. If no part is behind, end with a report line.
2. Take the first part that is behind, in the project file's order. One run moves one part.
3. Open the pull request as the factory's bot, from its fork, as the schema copy does.
4. Wait for the checks on the pull request (section 6).
5. Lane `alone`: merge as the bot. Lane `human`: file one card with the versions, the maker's release notes as links, and the acts "Merge" and "Not this week".
6. After the merge, judge the move (section 7).
7. On a good move, start the next run at once while a part is behind. On a failed move, return (section 8) and stop until a human answers the card.

The first weeks work through the distance of 48 references with the same program, one part for each run. No second procedure exists for the first time.

## 6. Checks before the merge

The infra repository's `config-check` runs on a push to main only. It gets the pull request trigger, and it passes the list to `test.sh`. With the list, the test proves for the pull request's tree:

- each changed reference is exactly a line of the list, tag and digest
- the store holds each copy
- each chart renders with its values and patches

A reference that is behind the list is not a failure, since parts move one at a time. The test reports the count of references behind as a number, and the routine's report line carries it.

The factory merges only when these checks are green. The schema copy gets the same protection: today its rule "no check fails" is always true in the infra repository, because no check runs there before the merge.

## 7. The judgment after the merge

A move is good when all of these hold, read by factoryd without a model:

1. Flux applied the commit, and the part's HelmRelease or workload names the new reference.
2. The part's workloads are available.
3. The part's probe answers. The probe of factoryd's dependencies covers Forgejo, Postgres and Temporal today. It gets LiteLLM (one model call on the small class) and OpenBao (unsealed).
4. No alert of the platform fires for 10 minutes after that, the settle time the alerts already use.

The limit is the HelmRelease's own timeout plus the settle time. Two gaps close with this build:

- The Kustomizations `platform` and `factory` set no `wait`, so their green status means "applied" and not "healthy". They get `wait: true` with a timeout.
- No alert covers a HelmRelease that failed or went back. One rule is added.

## 8. The return after a failed move

Flux does the first half without Forgejo and without the factory: each HelmRelease already retries an upgrade three times and then goes back to the release before it, from Helm's own history in the cluster.

The factory does the second half: it opens the revert of the commit, checks it as in section 6, and merges it as the bot, so the repository says what runs again. Then it files one card: the part, both versions, the check that failed with its text, and the acts "Try again" and "Hold this version". "Hold this version" writes the word `hold` on the line through a pull request in the code repository.

**The limit of the return:** a schema that moved does not go back. LiteLLM's migration job is the one such case in the `alone` lane. After a return, the old LiteLLM runs on the newer schema. LiteLLM's makers keep minor steps compatible in that direction, and the list holds LiteLLM inside its minor steps by the word `patch`. If the old version does not start, the card says so, and the factory stays without model calls until a human acts. The factory's own state is not at risk in that case.

## 9. What is built, in order

| Step | Repository | Change |
|---|---|---|
| 1 | code | The word `hold` on the lines of the `hand` lane, and the comment above the LiteLLM line corrected |
| 2 | infra | `config-check` on pull requests, with the list. `wait` on the two Kustomizations. The alert rule for a failed HelmRelease |
| 3 | code | `upstream-follow` with its tests, built against a copy of the infra tree as it is today |
| 4 | code | The routine's pass `follow`, the lanes in the project schema, the refusal changed for a program pass, the judgment and the return |
| 5 | code | The two new probes |
| 6 | infra | The parts and lanes in the project file, and the routine |
| 7 | both | The first runs, watched: k8s-infra first (it is in step already, so the run must end with "nothing behind" for it), then the job images, then LiteLLM |

Steps 1 and 2 are useful alone and carry no risk for the running cluster.

## 10. What this spec leaves out

- **The Kubernetes version is pinned nowhere in the infra repository.** It is the default of the Talos tool at the time of the install. This needs its own decision with the Talos upgrade.
- **A routine for the `hand` lane.** The held lines in the bump's text are the reminder. A job behind such a card is later work.
- **The SigNoz webhook test** that moves SigNoz to `alone`.
