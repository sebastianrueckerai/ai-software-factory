# The runner's docker volume past 50Gi: measured, and the bound (2026-11-02)

On 2026-11-02 at 14:43:34 UTC the kubelet evicted the trusted Forgejo runner's pod: its `docker-data` volume had passed its 50Gi `sizeLimit`. This is fault 8 of [needed-fixes.md](needed-fixes.md). This page measures what filled the volume, picks the bound that holds it, and gives the infra commit that sets the bound. That commit is Sebastian's: the infra repository sits outside every agent credential.

## The finding

Main's test job keeps its Go build cache and module cache in two named docker volumes, `ci-go-build` and `ci-go-mod` (the code repository's `.forgejo/workflows/ci.yml` and `nightly.yml`). The prune sidecar removes build cache, containers, networks and images. The only volume it removes is the state of a buildkitd a cancelled image job left. Go drops a build cache entry only once it has gone five days unused, and the evicted pod lived 4.9 days. Go never trims the module cache, 226 MB here. So the caches grow with each main run and nothing takes them away. On the evicted pod, the low point the prune could not pass rose by 0.25 to 0.28 GiB a run. On its successor, the caches hold 0.36 GiB a test job.

Once what the prune could not reach held more than 30 GiB, the prune ran each minute and freed nothing. The low point of the volume rose to 33.35 GiB in the night and 36.12 GiB before run 2316. Run 2316 added 11.14 GiB to that, inside the chart's 13.3 GiB per run, and run 2317's test job took the volume past 50 GiB.

The bound: the sidecar removes the volumes no container uses, last, when all else it removes has left the volume over `maxGiB`. Then what no job holds stays under 30 GiB again, and a run's 13.3 GiB keeps the volume under 44 GiB, as the chart counts.

## How the numbers were read

All reads were read-only. Times are UTC. The figures in GiB are bytes over 1,073,741,824.

SigNoz keeps its metrics in ClickHouse. ClickHouse sat at 2.68 to 2.82 GiB of its 3 GiB memory limit (`system.asynchronous_metrics`, `CGroupMemoryUsed`) and refused most queries with `MEMORY_LIMIT_EXCEEDED`, so each query below ran in a loop until it went through (up to 86 tries). At 21:40:02 the kubelet restarted ClickHouse after it missed its liveness probe while those retried queries ran. This is fault 10 of [needed-fixes.md](needed-fixes.md). The helper:

```sh
ch() { kubectl -n platform exec chi-signoz-clickhouse-cluster-0-0-0 -c clickhouse -- \
  clickhouse-client --max_threads=1 --max_block_size=512 -q "$1"; }
```

The series, found with `ch "SELECT metric_name, fingerprint, JSONExtractString(labels,'k8s.pod.name'), JSONExtractString(labels,'k8s.volume.name') FROM signoz_metrics.time_series_v4 PREWHERE metric_name IN ('k8s.volume.available','k8s.volume.capacity','k8s.pod.filesystem.usage') WHERE toDate(unix_milli/1000) = '2026-11-02' AND JSONExtractString(labels,'k8s.pod.name') LIKE 'forgejo-runner%' GROUP BY 1,2,3,4"`:

| Pod | Metric | Fingerprint |
|---|---|---|
| `forgejo-runner-6f89cff589-g85km` (evicted, sf-2) | `k8s.pod.filesystem.usage` | 6675310476704660258 |
| same | `k8s.volume.available`, volume `docker-data` | 6703533499836088606 |
| same | `k8s.volume.capacity`, volume `docker-data` | 10142631784318406203 |
| `forgejo-runner-6f89cff589-xqt8p` (its successor, sf-0) | `k8s.pod.filesystem.usage` | 11157187487345440369 |

The run and job times come from Forgejo's API, read with the `controller` credential in `~/.git-credentials`: read-only GETs, and the value is never printed. The helpers fetch the pages, keep each run or task once, and keep the `ci.yml` and `nightly.yml` workflows:

```sh
fj() { curl -s -u "$(sed -n 's#^https://\(controller:[^@]*\)@git\.aisoftwarefactory\.world$#\1#p' ~/.git-credentials)" \
  "https://git.aisoftwarefactory.world/api/v1/repos/sf/ai-software-factory-code/actions/$1"; }
runs() { for p in $(seq 1 14); do fj "runs?limit=50&page=$p"; done |
  jq -s -c '[.[].workflow_runs[]] | unique_by(.id)[] | select(.workflow_id == "ci.yml" or .workflow_id == "nightly.yml")'; }
tasks() { for p in $(seq 1 10); do fj "tasks?limit=50&page=$p"; done |
  jq -s -c '[.[].workflow_runs[]] | unique_by(.id)[] | select(.workflow_id == "ci.yml" or .workflow_id == "nightly.yml")'; }
runs > /tmp/runs.jsonl; tasks > /tmp/tasks.jsonl
```

Read at 22:10 on 11-02, the runs reached back to 2026-10-18 and the tasks to 2026-11-01 15:31. A later read needs more pages.

## 1. What the eviction said

`kubectl -n forgejo describe pod forgejo-runner-6f89cff589-g85km`:

```
Node:             sf-2/10.0.1.12
Start Time:       Wed, 28 Oct 2026 17:20:34 +0100
Status:           Failed
Reason:           Evicted
Message:          Usage of EmptyDir volume "docker-data" exceeds the limit "50Gi".
  dind:
    State:          Terminated
      Reason:       Error
      Exit Code:    137
      Started:      Wed, 28 Oct 2026 17:20:42 +0100
      Finished:     Mon, 02 Nov 2026 15:43:34 +0100
```

This is the evicted pod. It started on 2026-10-28 at 16:20:34 and died on 2026-11-02 at 14:43:34, after 4 days and 22 hours.

`kubectl -n forgejo get events --field-selector reason=Evicted` printed `No resources found in forgejo namespace.`: the events had expired. SigNoz keeps them as logs. The first query lists the log resources of the runner's pods. The evicted pod's own events sit under the row on sf-2 with an empty `k8s.object.fieldpath`, and the second query reads them by that row's fingerprint:

```sh
ch "SELECT fingerprint, any(labels) FROM signoz_logs.logs_v2_resource WHERE seen_at_ts_bucket_start >= 1793491200 AND labels LIKE '%forgejo-runner-6f89cff589%' GROUP BY fingerprint"
# k8s.cluster.name=sf;k8s.node.name=sf-2;hash=16827873046991454806  {"k8s.cluster.name":"sf","k8s.node.name":"sf-2",...,"k8s.object.fieldpath":"","k8s.object.kind":"Pod","k8s.object.name":"forgejo-runner-6f89cff589-g85km",...}
# and nine rows more: the evicted pod's three containers, its successor and the successor's four containers, the ReplicaSet
ch "SELECT toDateTime(intDiv(timestamp,1000000000)), body, attributes_string['k8s.event.reason'] FROM signoz_logs.logs_v2 WHERE ts_bucket_start >= 1793577600 AND resource_fingerprint LIKE '%hash=16827873046991454806'"
# 2026-11-02 14:43:32  Usage of EmptyDir volume "docker-data" exceeds the limit "50Gi".  Evicted
```

The kubelet log on sf-2, `TALOSCONFIG=~/repos/ai-software-factory-infra/talos/talosconfig talosctl -e <API endpoint> -n 10.0.1.12 logs kubelet`, holds `"Eviction manager: pod is evicted successfully"` at 14:43:34.654 and no figure of the usage.

None of the three names the usage. The message names the limit alone. The last usage SigNoz holds, `ch "SELECT unix_milli, value FROM signoz_metrics.samples_v4 WHERE metric_name='k8s.pod.filesystem.usage' AND fingerprint=6675310476704660258 AND unix_milli >= 1793630000000 ORDER BY unix_milli"`, is 50,385,059,840 bytes (46.92 GiB) at 14:43:09, within 70 KB of it since 14:41:39. That is the whole pod (the volume, the containers' own layers and logs), so the volume held at most that. The limit is 53,687,091,200 bytes. So at least 3.08 GiB came into the volume in the two minutes before the eviction, while run 2317's test job ran (from 14:39:28).

## 2. What the prune sidecar measured

The sidecar (`k8s/platform/forgejo/runner-chart/docker-prune.sh`) measures the volume with `du -skx /var/lib/docker` each minute. From 30 GiB on, it prunes build cache, containers stopped more than 10 minutes, dangling images and images no running job needs. It logs one line per such pass and does not log what it freed.

The evicted pod's sidecar log is gone: `kubectl -n forgejo logs forgejo-runner-6f89cff589-g85km -c docker-prune` answers `container "docker-prune" in pod "forgejo-runner-6f89cff589-g85km" is terminated`, and SigNoz holds no container logs of the pod, only its events.

The successor's log, `kubectl -n forgejo logs forgejo-runner-6f89cff589-xqt8p -c docker-prune --since=48h --timestamps`, has three start-up lines at 14:43:38, while dind's certificates were not yet there, and then six passes. What each freed comes from the kubelet's figure for the pod in SigNoz (fingerprint 11157187487345440369), the last value before the pass and the lowest within 150 seconds after it. The job then running comes from the tasks:

```sh
ch "SELECT toDateTime(p), argMaxIf(value, unix_milli, unix_milli <= p*1000)/1073741824, minIf(value, unix_milli > p*1000 AND unix_milli <= (p+150)*1000)/1073741824 FROM signoz_metrics.samples_v4 ARRAY JOIN [1793642860, 1793644902, 1793646945, 1793649364, 1793652026, 1793654252] AS p WHERE metric_name='k8s.pod.filesystem.usage' AND fingerprint=11157187487345440369 AND unix_milli BETWEEN 1793630614000 AND 1793656800000 GROUP BY p ORDER BY p"
# 18:07:40 28.29 11.40 | 18:41:42 30.04 11.76 | 19:15:45 29.85 11.20
# 19:56:04 28.56 10.72 | 20:40:26 29.54 11.36 | 21:17:32 27.51 10.44   (rounded to 0.01)
for t in 18:07:40 18:41:42 19:15:45 19:56:04 20:40:26 21:17:32; do
  jq -r --arg t "2026-11-02T${t}Z" 'select(.run_started_at <= $t and .updated_at >= $t) | "\($t[11:19]) \(.run_number) \(.name)"' /tmp/tasks.jsonl; done
# 18:07:40 2323 test | 18:41:42 2324 image-runner | 19:15:45 2326 image-runner
# 19:56:04 2334 test | 20:40:26 2336 image-sandbox | 21:17:32 2339 image-sandbox
```


| Pass | Sidecar's `du` | Job then running | Kubelet before | Kubelet after |
|---|---|---|---|---|
| 18:07:40 | 32,029,320 KiB (30.55 GiB) | 2323 test | 28.29 GiB | 11.40 GiB |
| 18:41:42 | 32,365,260 KiB (30.87 GiB) | 2324 image-runner | 30.04 GiB | 11.76 GiB |
| 19:15:45 | 32,272,292 KiB (30.78 GiB) | 2326 image-runner | 29.85 GiB | 11.20 GiB |
| 19:56:04 | 33,258,528 KiB (31.72 GiB) | 2334 test | 28.56 GiB | 10.72 GiB |
| 20:40:26 | 31,574,820 KiB (30.11 GiB) | 2336 image-sandbox | 29.54 GiB | 11.36 GiB |
| 21:17:32 | 32,288,200 KiB (30.79 GiB) | 2339 image-sandbox | 27.51 GiB | 10.44 GiB |

The kubelet's figure trails the sidecar's `du`. The kubelet measures the volume on its own period and SigNoz reads that figure every 30 seconds, so a figure can be a minute or more old: it held still from 14:41:39 to the eviction (section 1). So the last kubelet figure before a pass reads 27.51 to 30.04 GiB while the sidecar's `du` at the pass reads 30.11 to 31.72 GiB. The two agree to the byte when the volume holds still (section 3).

On a young volume each pass brings it from about 31 GiB to about 11 GiB. The evicted pod's volume could not come down so far. Its low point per day, `ch "SELECT toStartOfHour(toDateTime(intDiv(unix_milli,1000))) h, min(value)/1073741824, max(value)/1073741824 FROM signoz_metrics.samples_v4 WHERE metric_name='k8s.pod.filesystem.usage' AND fingerprint=6675310476704660258 AND unix_milli >= 1793204400000 GROUP BY h ORDER BY h"`, reduced to days, against the main runs of each day:

| Day | Lowest | Highest | Main runs (`ci.yml`, `nightly.yml`) |
|---|---|---|---|
| 10-28 (from 16:20) | 0 | 29.7 GiB | 5 |
| 10-29 | 6.6 GiB | 31.1 GiB | 30 |
| 10-30 | 11.7 GiB | 31.3 GiB | 16 |
| 10-31 | 15.8 GiB | 30.8 GiB | 20 |
| 11-01 | 20.9 GiB | 43.6 GiB | 53 |
| 11-02 (to 14:43) | 30.4 GiB | 47.9 GiB | 21 |

```sh
jq -r 'select(.started != null and .started >= "2026-10-28T16:20:34Z" and .started < "2026-11-02T14:43:34Z") | .started[5:10]' /tmp/runs.jsonl | sort | uniq -c
# 5 10-28   30 10-29   16 10-30   20 10-31   53 11-01   21 11-02
```

Two stretches with no main run show the low point the prune could not pass:

- From 03:28:09 to 09:13:09 on 11-02, between run 2290's end at 03:26:40 and run 2294's start at 09:21:14, 857 samples lie between 35,806,711,808 and 35,808,645,120 bytes (33.35 GiB). The volume sat over 30 GiB for 5 hours 45 minutes and did not move by more than 2 MB.
- From 14:04:39 to 14:19:09, between run 2313's end at 14:02:22 and run 2316's start at 14:19:26, 31 samples lie between 38,786,297,856 and 38,787,043,328 bytes (36.12 GiB).

```sh
ch "SELECT count(), min(value), max(value) FROM signoz_metrics.samples_v4 WHERE metric_name='k8s.pod.filesystem.usage' AND fingerprint=6675310476704660258 AND unix_milli BETWEEN 1793590089000 AND 1793610789999"
# 857  35806711808  35808645120
ch "SELECT count(), min(value), max(value) FROM signoz_metrics.samples_v4 WHERE metric_name='k8s.pod.filesystem.usage' AND fingerprint=6675310476704660258 AND unix_milli BETWEEN 1793628279000 AND 1793629149999"
# 31  38786297856  38787043328
jq -r 'select(.index_in_repo == (2290, 2294, 2313, 2316)) | "\(.index_in_repo) \(.started) \(.stopped)"' /tmp/runs.jsonl
# 2290 2026-11-02T02:59:54Z 2026-11-02T03:26:40Z
# 2294 2026-11-02T09:21:14Z 2026-11-02T09:40:12Z
# 2313 2026-11-02T13:43:50Z 2026-11-02T14:02:22Z
# 2316 2026-11-02T14:19:26Z 2026-11-02T14:38:38Z
```

Between the two, ten main runs (2294 to 2313) raised the low point by 2.78 GiB, 0.28 GiB a run. The 133 runs before the first stretch had raised it to 33.35 GiB, 0.25 GiB a run.

```sh
jq -r 'select(.started != null and .started >= "2026-10-28T16:20:34Z" and .started < "2026-11-02T03:28:09Z") | .id' /tmp/runs.jsonl | wc -l
# 133
jq -r 'select(.started != null and .started >= "2026-11-02T03:28:09Z" and .started < "2026-11-02T14:04:39Z") | .index_in_repo' /tmp/runs.jsonl | tr '\n' ' '
# 2294 2295 2297 2298 2299 2301 2304 2305 2310 2313
```

## 3. Docker's account against the kubelet's

No main run started while this was measured: the last one, 2342, ended at 21:30:53, and a sampler of `docker ps`, `du` and the kubelet's figure every 30 seconds saw no job from 21:37 to the page's commit. So the account below is of the idle volume, and the peak comes from history.

### The idle volume, 21:34 to 21:37

`kubectl -n forgejo exec forgejo-runner-6f89cff589-xqt8p -c dind -- docker system df`:

```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          6         0         13.11GB   10.4GB (79%)
Containers      0         0         0B        0B
Local Volumes   2         0         5.7GB     5.7GB (100%)
Build Cache     41        0         1.716GB   788.9MB
```

`docker system df -v` names the volumes: `ci-go-build` 5.474GB and `ci-go-mod` 226.3MB, each with 0 links.

`kubectl -n forgejo exec forgejo-runner-6f89cff589-xqt8p -c dind -- sh -c 'du -skx /var/lib/docker; du -skx /var/lib/docker/containerd /var/lib/docker/volumes/ci-go-build /var/lib/docker/volumes/ci-go-mod /var/lib/docker/buildkit'`:

```
18465708  /var/lib/docker
12824336  /var/lib/docker/containerd
 5391996  /var/lib/docker/volumes/ci-go-build
  245272  /var/lib/docker/volumes/ci-go-mod
    3968  /var/lib/docker/buildkit
```

The kubelet's own figure, the one the eviction compares with the limit, `kubectl get --raw /api/v1/nodes/sf-0/proxy/stats/summary` for the pod's volume `docker-data`: `usedBytes` 18,908,884,992 at 21:37:31. That is 18,465,708 KiB to the byte. The sidecar measures what the kubelet measures.

By `du`, the volume holds the image store with the build cache (`containerd`, 12.23 GiB), the two Go cache volumes (5.38 GiB), 3,968 KiB under `buildkit` and 136 KiB more. Docker's own lines show the same two parts: 13.11 GB of images and 5.7 GB of volumes, no container and no container log. These 5.38 GiB are the caches of 15 test jobs since the pod started at 14:43, 0.36 GiB a job with the first cold fill in it:

```sh
jq -r 'select(.name == "test" and .run_started_at >= "2026-11-02T14:43:34Z" and .run_started_at < "2026-11-02T21:59:00Z") | .run_number' /tmp/tasks.jsonl | wc -l
# 15
```

### The peak, from history

Per job, the evicted pod's usage before each job and its highest sample in the job. The usage comes from each change of the series from 14:19 to the eviction, the job times from the tasks:

```sh
ch "SELECT toDateTime(intDiv(unix_milli,1000)), round(value/1073741824,2) FROM (SELECT unix_milli, value, lagInFrame(value) OVER (ORDER BY unix_milli ROWS BETWEEN 1 PRECEDING AND CURRENT ROW) prev FROM signoz_metrics.samples_v4 WHERE metric_name='k8s.pod.filesystem.usage' AND fingerprint=6675310476704660258 AND unix_milli BETWEEN 1793629140000 AND 1793630614000) WHERE round(value/1073741824,2) != round(prev/1073741824,2) ORDER BY unix_milli"
# 14:19:09 36.12 | 14:20:09 41.69 | 14:22:09 46.31 | 14:23:39 47.26 | 14:25:09 46.59 | 14:26:39 46.83
# 14:27:39 47.14 | 14:29:09 46.36 | 14:30:09 39.96 | 14:31:39 40.02 | 14:33:39 43.11 | 14:35:09 43.29
# 14:36:39 45.31 | 14:38:09 47.05 | 14:39:39 42.39 | 14:40:39 45.68 | 14:41:39 46.92
jq -r 'select(.run_number == 2316 or .run_number == 2317) | "\(.run_number) \(.name) \(.run_started_at[11:19]) \(.updated_at[11:19])"' /tmp/tasks.jsonl | sort -k3 | head -7
# 2316 upstream 14:19:26 14:20:26 | 2316 test 14:20:30 14:29:16 | 2316 image 14:29:20 14:31:01
# 2316 image-sandbox 14:31:02 14:34:20 | 2316 image-runner 14:34:22 14:38:38
# 2317 upstream 14:38:40 14:39:25 | 2317 test 14:39:28 14:55:36
```


| Run | Job | Times | Before | Highest |
|---|---|---|---|---|
| 2316 | upstream | 14:19:26 to 14:20:26 | 36.12 GiB | 41.69 GiB |
| 2316 | test | 14:20:30 to 14:29:16 | 41.69 GiB | 47.26 GiB (14:23:39) |
| 2316 | image | 14:29:20 to 14:31:01 | 46.36 GiB | 46.36 GiB |
| 2316 | image-sandbox | 14:31:02 to 14:34:20 | 39.96 GiB | 43.11 GiB |
| 2316 | image-runner | 14:34:22 to 14:38:38 | 43.11 GiB | 47.05 GiB |
| 2317 | upstream | 14:38:40 to 14:39:25 | 47.05 GiB | 47.05 GiB |
| 2317 | test | 14:39:28 to the eviction | 47.05 GiB | 46.92 GiB in SigNoz, past 50 GiB by the eviction |

Run 2316 took the pod from 36.12 GiB to 47.26 GiB, 11.14 GiB, under the chart's 13.3. The run was in bounds. The low it started from was not. Run 2317's test job starts at 47.05 GiB because the kubelet's figure trails (section 2): the drop to 42.39 GiB after run 2316's last job came in at 14:39:39.

### `k8s.volume.available` does not measure the volume

`ch "SELECT metric_name, value FROM signoz_metrics.samples_v4 WHERE fingerprint IN (6703533499836088606,10142631784318406203) AND unix_milli = 1793630589346"` gives, at 14:43:09, `k8s.volume.available` 27,712,102,400 bytes and `k8s.volume.capacity` 99,932,889,088 bytes for `docker-data`. Those are sf-2's whole ephemeral filesystem (93.07 GiB), not the 50Gi volume. No metric in SigNoz gives the volume's own usage. `k8s.pod.filesystem.usage` comes closest: in the summary above, the pod's figure was 7,929,856 bytes over the volume's `usedBytes`.

## 4. What the difference names

There is no gap between the measures: the sidecar's `du` and the kubelet's `usedBytes` agree to the byte. The gap is in what the prune removes. Of docker's four lines it prunes three: build cache, containers and images. The fourth, Local Volumes, it never touches, apart from the state of a buildkitd a cancelled image job left. Docker counts the Go caches 100% reclaimable when no test job runs, and nothing reclaims them. With no job running, a pass removes every image, since none is any job's, so what a pass leaves at idle is the volumes.

The caches are what the low point is made of. Each main run adds new entries: 0.36 GiB a job on the young pod, 0.25 to 0.28 GiB a run in the evicted pod's low point. Go removes an entry only after five days unused (`trimLimit = 5 * 24 * time.Hour` in `src/cmd/go/internal/cache/cache.go` of go1.26.10, the CI image's Go), and the pod lived 4.9 days, so Go's own trim had nothing to remove. Left to run, it would keep five days of entries. The evicted pod saw 143 runs before run 2316, in 4.9 days, 29 a day, and five days of those at 0.25 GiB a run come to about 36 GiB, not under 30:

```sh
jq -r 'select(.started != null and .started >= "2026-10-28T16:20:34Z" and .started < "2026-11-02T14:19:26Z") | .id' /tmp/runs.jsonl | wc -l
# 143
```

## 5. The bound

| Candidate | What the measurement says |
|---|---|
| `maxGiB` 20, so that 20 + 2 × 13.3 < 50 | Does not hold. The prune would start sooner and remove the same three kinds. The low point was 33.35 GiB for hours with the prune past its threshold: a lower threshold does not reach the volumes. The eviction comes at the same low point. |
| `sizeLimit` and the ephemeral-storage request raised | Does not hold, and does not fit. Go keeps five days of entries, about 36 GiB at this pace. 36 GiB and a run's 13.3 GiB leave 0.7 GiB of the 50, and the pace rises with the factory's, so the limit would have to keep rising. The nodes allocate 83.5 GiB of ephemeral storage now (`kubectl get node sf-0 -o jsonpath='{.status.allocatable.ephemeral-storage}'` gives 89671164575), and 53 GiB once the 40Gi `systemReserved` of `talos/patches.yaml` applies, by the comment at `runner-helmrelease.yaml:44`. |
| The missing target added to the sidecar's prune command | Holds. The volumes are the target the prune lacks. |

The pick is the third, with the volumes last: when the build cache, the stopped containers and the images have gone and the volume is still over `maxGiB`, the sidecar runs `docker volume prune -af`. Docker keeps every volume a container uses. The test job mounts the caches only in its `docker run` step (the code repository's `.forgejo/workflows/ci.yml`, lines 86 to 90), so they stay while that step runs, and so does a running buildkitd's state. Between a test job and the image jobs the caches are unused, so even back-to-back runs leave the sidecar minutes in which to remove them. What no job holds then stays under 30 GiB, and a run's 13.3 GiB keeps the volume under 44 GiB.

The cost is a cold Go cache now and then. The one test job that ran with empty caches on 11-02, run 2317's second try on the fresh pod at 17:17:27, took 10 min 17 s. The other 32 test jobs that passed that day, to 21:59, took 4 min 0 s to 8 min 57 s:

```sh
jq -r 'select(.name == "test" and .status == "success" and .run_started_at[0:10] == "2026-11-02" and .run_started_at < "2026-11-02T21:59:00Z") | "\((.updated_at | fromdate) - (.run_started_at | fromdate)) \(.run_number) \(.run_started_at[11:19])"' /tmp/tasks.jsonl | sort -n | sed -n '1p;32p;33p;$='
# 240 2342 21:24:19
# 537 2335 20:09:21
# 617 2317 17:17:27
# 33
```

In the test job's checkout, login and image build steps the caches are unused too, so the second check can remove them then. That costs no more than a cold run: `docker run -v` makes the volume again, empty. On a young volume each pass got under 30 GiB without the volumes (section 2), so they go only once the caches have grown so large that a pass without them stays over 30 GiB, at the evicted pod's pace in about the fourth day. Four of the young pod's six passes came during image jobs, when no container held the caches. Removing them at every pass would have cleared them at least those four times, so the volumes come last and only when needed.

## The infra hand

### When to commit

The edit changes the sidecar's command, which sits in the pod template. Flux's next sync then rolls the runner pod: the job in flight dies and the new pod starts with an empty volume. Push between main runs: the Actions page of `sf/ai-software-factory-code` shows no `ci.yml` or `nightly.yml` run in progress (both run on this runner and mount the caches), or `kubectl -n forgejo exec <runner pod> -c dind -- docker ps --filter name=FORGEJO-ACTIONS-TASK- -q` prints nothing.

### The infra commit (sf/ai-software-factory-infra)

One commit on main, three files. The line numbers are those of infra main 2b59f75.

1. `k8s/platform/forgejo/runner-chart/docker-prune.sh`:
   - Line 11 of the head comment (`# the oldest running container. An unreadable size counts as over. Every`) becomes three lines that say the unused volumes go too when the rest leaves the volume over.
   - After line 49 (the `}` that closes `stale()`), add the function `over()`: it takes the `du` and the size check of lines 61 to 65 out of the loop, so the loop can measure twice.
   - Lines 61 to 65 become `  if over; then`.
   - After line 70 (`    { dangling; stale; } | rmi`), add the second check: if `over` still holds, log `docker-prune: still <KiB> KiB: removing unused volumes` and run `docker volume prune -af`.
2. `scripts/docker-prune-test/bin/docker`, line 11: the stub answers `volume prune -af`, and its `builder prune -af` sets the size to `$STATE/kb.after` when the test gives one.
3. `scripts/docker-prune-test/test.sh`: after line 9 a `VOLUMES` call list. Lines 34 to 35, 38 to 39 and 66 to 67 expect the volume prune and its log line where the size stays over. A new case after line 35: the size prune brings the volume under, and the volumes stay.

The whole edit, to save as `/tmp/volume-prune.diff`:

```diff
diff --git a/k8s/platform/forgejo/runner-chart/docker-prune.sh b/k8s/platform/forgejo/runner-chart/docker-prune.sh
index 6a40243..dbf2ee5 100644
--- a/k8s/platform/forgejo/runner-chart/docker-prune.sh
+++ b/k8s/platform/forgejo/runner-chart/docker-prune.sh
@@ -8,7 +8,9 @@
 # filesystem, hard links once), and from MAX_GIB on all that no running job
 # needs goes: build cache no build holds, stopped containers older than a
 # job's create-to-start gap, dangling images, and unused images seen before
-# the oldest running container. An unreadable size counts as over. Every
+# the oldest running container. If that leaves it over, the volumes no
+# container uses go too: main's test job keeps its Go caches in named
+# volumes, which grow each run. An unreadable size counts as over. Every
 # CHECK seconds with no job running, a buildkitd a cancelled image job left
 # goes too. Retries each check while dind is down; exits on SIGTERM.
 trap 'exit 0' TERM INT
@@ -47,6 +49,13 @@ stale() {
     { t[$1] = $2; if ($1 in up && $2 < oldest) oldest = $2 }
     END { for (id in t) if (id ~ /^sha256:/ && t[id] < oldest) print id }'
 }
+# the volume as the kubelet measures it; du exits 1 over files a build
+# removes mid-walk, and its total stands, as the kubelet skips them too
+over() {
+  kb=$(du -skx /var/lib/docker 2>/dev/null | cut -f1)
+  case $kb in *[!0-9]*) kb= ;; esac
+  [ -z "$kb" ] || [ "$kb" -ge $((MAX_GIB * 1048576)) ]
+}
 while :; do
   now=$(date +%s)
   sight
@@ -58,16 +67,17 @@ while :; do
     dangling | rmi
     next=$((now + EVERY))
   fi
-  # du exits 1 over files a build removes mid-walk; its total stands, as
-  # the kubelet skips them too
-  kb=$(du -skx /var/lib/docker 2>/dev/null | cut -f1)
-  case $kb in *[!0-9]*) kb= ;; esac
-  if [ -z "$kb" ] || [ "$kb" -ge $((MAX_GIB * 1048576)) ]; then
+  if over; then
     echo "docker-prune: /var/lib/docker holds ${kb:-?} KiB, over $MAX_GIB GiB: pruning"
     docker builder prune -af >/dev/null
     docker container prune -f --filter until=10m >/dev/null
     # the daemon refuses an image a container uses, a running job's base
     { dangling; stale; } | rmi
+    # the Go caches go last: a warm one shortens main's test job
+    if over; then
+      echo "docker-prune: still ${kb:-?} KiB: removing unused volumes"
+      docker volume prune -af >/dev/null
+    fi
   fi
   sleep "$CHECK" & wait $!
 done
diff --git a/scripts/docker-prune-test/bin/docker b/scripts/docker-prune-test/bin/docker
index 2213b68..9eb0d04 100755
--- a/scripts/docker-prune-test/bin/docker
+++ b/scripts/docker-prune-test/bin/docker
@@ -8,7 +8,9 @@ keep() { awk "$1" "$STATE/$2" > "$STATE/$2.t" && mv "$STATE/$2.t" "$STATE/$2"; }
 case "$*" in
   "image ls -q --no-trunc") cut -d' ' -f1 "$STATE/images" ;;
   "ps -q --no-trunc") awk '$3 == "running" { print $1 }' "$STATE/containers" ;;
-  "builder prune -af"|"builder prune -af --filter until="*|"network prune -f --filter until="*) echo "$*" >> "$STATE/calls" ;;
+  "builder prune -af --filter until="*|"network prune -f --filter until="*|"volume prune -af") echo "$*" >> "$STATE/calls" ;;
+  # after the size prune the size is $STATE/kb.after, if set
+  "builder prune -af") echo "$*" >> "$STATE/calls"; [ ! -e "$STATE/kb.after" ] || mv "$STATE/kb.after" "$STATE/kb" ;;
   "container prune -f --filter until="*)
     echo "$*" >> "$STATE/calls"
     u=${5#until=}; case $u in *h) s=$((${u%h} * 3600)) ;; *m) s=$((${u%m} * 60)) ;; *) exit 98 ;; esac
diff --git a/scripts/docker-prune-test/test.sh b/scripts/docker-prune-test/test.sh
index 300893b..770cced 100644
--- a/scripts/docker-prune-test/test.sh
+++ b/scripts/docker-prune-test/test.sh
@@ -7,6 +7,7 @@ ok() { if eval "$2"; then pass=$((pass+1)); echo "PASS $1"; else fail=$((fail+1)
 GIB=1048576
 AGE="builder prune -af --filter until=24h;container prune -f --filter until=24h;network prune -f --filter until=24h;"
 SHRINK="builder prune -af;container prune -f --filter until=10m;"
+VOLUMES="volume prune -af;"
 # new PASSES KIB: a daemon at second 100000 with no image and no container
 new() {
   STATE=$(mktemp -d); export STATE
@@ -31,12 +32,16 @@ ok "dind down: the age prune runs at the next check, not an hour on" '[ "$calls"
 new 1 $((24 * GIB - 1)); run
 ok "one KiB under 24 GiB: no size prune" '[ "$calls" = "$AGE-- pass 1;" ] && [ -z "$out" ]'
 new 1 $((24 * GIB)); run
-ok "at 24 GiB: the size prune" '[ "$calls" = "$AGE$SHRINK-- pass 1;" ]'
-ok "at 24 GiB: logged" '[ "$out" = "docker-prune: /var/lib/docker holds 25165824 KiB, over 24 GiB: pruning" ]'
+ok "at 24 GiB and still over: the size prune, then the unused volumes" '[ "$calls" = "$AGE$SHRINK$VOLUMES-- pass 1;" ]'
+ok "at 24 GiB and still over: both logged" '[ "$out" = "docker-prune: /var/lib/docker holds 25165824 KiB, over 24 GiB: pruning
+docker-prune: still 25165824 KiB: removing unused volumes" ]'
+new 1 $((24 * GIB)); echo $((10 * GIB)) > "$STATE/kb.after"; run
+ok "the size prune brings it under: the volumes stay" '[ "$calls" = "$AGE$SHRINK-- pass 1;" ] && [ "$out" = "docker-prune: /var/lib/docker holds 25165824 KiB, over 24 GiB: pruning" ]'
 
 new 1 0; rm "$STATE/kb"; echo 1 > "$STATE/du.rc"; echo "du: /var/lib/docker: No such file or directory" > "$STATE/du.err"; run
-ok "an unreadable size counts as over" '[ "$calls" = "$AGE$SHRINK-- pass 1;" ]'
-ok "an unreadable size: logged as such" '[ "$out" = "docker-prune: /var/lib/docker holds ? KiB, over 24 GiB: pruning" ]'
+ok "an unreadable size counts as over" '[ "$calls" = "$AGE$SHRINK$VOLUMES-- pass 1;" ]'
+ok "an unreadable size: logged as such" '[ "$out" = "docker-prune: /var/lib/docker holds ? KiB, over 24 GiB: pruning
+docker-prune: still ? KiB: removing unused volumes" ]'
 
 new 1 $((10 * GIB)); echo 1 > "$STATE/du.rc"
 echo "du: /var/lib/docker/containerd/daemon/io.containerd.snapshotter.v1.overlayfs/snapshots/80/fs/tmp/x: No such file or directory" > "$STATE/du.err"; run
@@ -63,8 +68,9 @@ X
 echo 'echo "sha256:built ci-runner:test" >> "$STATE/images"; echo "sha256:dang2 <none>" >> "$STATE/images"' > "$STATE/hook2"
 echo "echo $((30 * GIB)) > \"\$STATE/kb\"" > "$STATE/hook3"
 run
-ok "over while a job runs: the size prune in pass 4 only" '[ "$(grep -v "^image rm" "$STATE/calls" | tr "\n" ";")" = "$AGE-- pass 1;-- pass 2;-- pass 3;$SHRINK-- pass 4;" ]'
-ok "over while a job runs: logged" '[ "$out" = "docker-prune: /var/lib/docker holds 31457280 KiB, over 24 GiB: pruning" ]'
+ok "over while a job runs: the size prune in pass 4 only" '[ "$(grep -v "^image rm" "$STATE/calls" | tr "\n" ";")" = "$AGE-- pass 1;-- pass 2;-- pass 3;$SHRINK$VOLUMES-- pass 4;" ]'
+ok "over while a job runs: logged" '[ "$out" = "docker-prune: /var/lib/docker holds 31457280 KiB, over 24 GiB: pruning
+docker-prune: still 31457280 KiB: removing unused volumes" ]'
 ok "the hourly prune takes the dangling image in pass 1" '[ "$(sed -n "1,/-- pass 1/p" "$STATE/calls" | grep "^image rm")" = "image rm sha256:dang" ]'
 ok "over: the dangling image of the job's pass goes, unused images seen before the job too, one whose stopped container went past 10 minutes among them" '[ "$(sed -n "/-- pass 3/,/-- pass 4/p" "$STATE/calls" | grep "^image rm" | sort | tr "\n" ";")" = "image rm sha256:dang2;image rm sha256:old;image rm sha256:stopped;" ]'
 ok "the job's base image, the job's build, an image first seen with the job and one under a just-created container stay" '[ "$(images)" = "sha256:base sha256:built sha256:created sha256:same " ]'
```

Commit message: `runner: the prune sidecar removes unused volumes last, when all else leaves docker-data over maxGiB, since main's Go caches grew past its reach`.

### Check before the push

From `~/repos/ai-software-factory-infra` at main:

1. `git apply --check /tmp/volume-prune.diff && git apply /tmp/volume-prune.diff`. `git diff --stat` shows 3 files, 31 insertions, 13 deletions.
2. `sh -n k8s/platform/forgejo/runner-chart/docker-prune.sh` prints nothing.
3. The offline test, by the command in `scripts/docker-prune-test/test.sh`:
   ```sh
   docker run --rm -v "$PWD/scripts/docker-prune-test:/t:ro" -v "$PWD/k8s/platform/forgejo/runner-chart:/s:ro" \
     --entrypoint sh docker:29.5.2-dind@sha256:6b9cd914eb9c6b342c040a49a27a5eb3804453bae6ecc90f7ff96133595a95e8 /t/test.sh | tail -1
   ```
   It prints `pass=22 fail=0`.
4. The chart renders the new command:
   ```sh
   python3 -c 'import sys, yaml; yaml.safe_dump(yaml.safe_load(open(sys.argv[1]))["spec"]["values"], sys.stdout)' \
     k8s/platform/forgejo/runner-helmrelease.yaml > /tmp/runner-values.yaml
   helm template forgejo-runner k8s/platform/forgejo/runner-chart -n forgejo -f /tmp/runner-values.yaml | grep -c 'docker volume prune -af'
   ```
   It prints `1`.

The agent that wrote this page ran all four on a clone of infra main 2b59f75 with the diff applied, with these results. Before the edit the test printed `pass=21 fail=0`. The new test against the unedited script printed `pass=16 fail=6`: the six cases that expect the volume prune fail, so the test sees the change. `docker volume prune --help` in the pod's dind (docker 29.5.2) lists `-a, --all  Remove all unused volumes, not just anonymous ones`.

Push. Flux reconciles the HelmRelease within its 10 minutes and the runner pod rolls.

### After the push

1. The new pod runs the new command:
   ```sh
   kubectl -n forgejo get pods -l app.kubernetes.io/name=forgejo-runner
   kubectl -n forgejo get pod <new pod> -o jsonpath='{.spec.containers[?(@.name=="docker-prune")].command[2]}' | grep -c 'docker volume prune -af'
   ```
   The second prints `1`.
2. Each day, `kubectl -n forgejo logs <pod> -c docker-prune | grep -c 'removing unused volumes'`. Expect none for the first days, as on the young volume of section 2. If most passes log it from the first day, the images a pass removes have not yet left the disk when the second `du` runs. The bound still holds then, but the caches go cold more often than needed, and the second check should wait for the disk to settle.
3. In SigNoz, the pod's `k8s.pod.filesystem.usage`: its low point stays under 30 GiB. The fault leaves the register once a runner pod has lived past five days, longer than the evicted one, with no eviction and its low point under 30 GiB.

## Not verified

- What the evicted volume held. It went with the pod, and `docker system df` was never taken on it. That its low point was the Go caches rests on two things measured here, each apart from the other: it sat over the prune's threshold for hours without moving, and it rose by 0.25 to 0.28 GiB a run, near the young pod's 0.36 GiB a job for its caches.
- That the evicted pod's sidecar ran every minute on 11-02. Its log is gone. Its container shows one restart, at a time no source records, and was running at the eviction.
- The usage at the eviction. No source names it: the kubelet's last figure in SigNoz is 46.92 GiB at 14:43:09, so at least 3.08 GiB came in the last two minutes. Which writes of run 2317's test job those were is not measured.
- A live peak. No main run started while this was measured, so docker's account is of the idle volume and the peak is from SigNoz history.
- The edit on a live dind. It ran only offline against the stub docker, since the cluster was read-only for this measurement. Whether the space of removed images leaves the disk before the second `du` is the second check after the push.
