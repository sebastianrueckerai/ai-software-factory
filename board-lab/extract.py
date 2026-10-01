#!/usr/bin/env python3
"""Extract the board dummy's demo data from the destroyed factory's backups.

Restores the CNPG base backup 20261001T202539 from
s3://aisoftwarefactory-backups/cnpg/sf-cluster/sf-cluster-v12/ into a
throwaway postgres:18 container, then writes data/cards.json (the console's
boardData shape per card, extended with timeline events and approvals) and
data/sessions/<task>/<session>.jsonl (the harness transcripts).

Restore steps (already run for this round; re-run if /tmp/claude-1000/boardux
is gone):

  mkdir -p /tmp/claude-1000/boardux/{base,wals,pgdata}
  aws --endpoint-url https://fsn1.your-objectstorage.com s3 cp \
    s3://aisoftwarefactory-backups/cnpg/sf-cluster/sf-cluster-v12/base/20261001T202539/ \
    /tmp/claude-1000/boardux/base/ --recursive
  # WALs 0000000C000000050000005C..61 from .../wals/0000000C00000005/,
  # gunzipped into pgdata/pg_wal/ (16 MiB each)
  tar -xf /tmp/claude-1000/boardux/base/data.tar -C /tmp/claude-1000/boardux/pgdata
  touch /tmp/claude-1000/boardux/pgdata/recovery.signal
  rm -f /tmp/claude-1000/boardux/pgdata/standby.signal
  sed -i '1i host all all 127.0.0.1/32 trust\nhost all all ::1/128 trust' \
    /tmp/claude-1000/boardux/pgdata/pg_hba.conf
  docker run -d --name boardux-pg -p 127.0.0.1:54329:5432 --user 1000:1000 \
    -v /tmp/claude-1000/boardux/pgdata:/var/lib/postgresql/data \
    -e PGDATA=/var/lib/postgresql/data postgres:18 \
    -c archive_mode=off -c restore_command=/bin/false -c archive_command=/bin/true \
    -c shared_buffers=256MB -c logging_collector=off -c ssl=off \
    -c unix_socket_directories=/tmp

The recovery replays to the last archived WAL (transaction 2026-10-01
20:46:38 UTC): the destroy-adjacent state. Credentials come from ~/.aws
(the aws CLI reads them itself); no secret is read or written here.
"""

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPOS = ["linkshort2/linkshort2", "linkshort4/linkshort4",
         "linkshort3/linkshort3", "notes/notes"]
GATEWAY = ["docker", "exec", "boardux-pg", "psql", "-h", "127.0.0.1",
           "-U", "postgres", "-d", "gateway", "-At", "-c"]
S3 = ["aws", "--endpoint-url", "https://fsn1.your-objectstorage.com", "s3", "cp"]
BUCKET = "s3://aisoftwarefactory-sessions/sessions"
GIT = "https://git.aisoftwarefactory.world"
HERE = Path(__file__).resolve().parent


def sql(query: str):
    wrapped = ("select coalesce(json_agg(row_to_json(t)), '[]'::json) "
               f"from ({query}) t")
    out = subprocess.run(GATEWAY + [wrapped], capture_output=True, text=True,
                         check=True).stdout.strip()
    return json.loads(out) if out else []


def minutes(a: str, b: str) -> int:
    ta = datetime.fromisoformat(a.replace("Z", "+00:00"))
    tb = datetime.fromisoformat(b.replace("Z", "+00:00"))
    return round((tb - ta).total_seconds() / 60)


def s3_text(key: str) -> str:
    return subprocess.run(S3 + [f"{BUCKET}/{key}", "-"], capture_output=True,
                          text=True, check=True).stdout


def main() -> None:
    repos = ",".join(f"'{r}'" for r in REPOS)
    tasks = sql(f"select * from tasks where repository in ({repos}) order by created_at")
    deps = sql(f"select * from task_deps where task_id in (select id from tasks where repository in ({repos})) or depends_on in (select id from tasks where repository in ({repos}))")
    approvals = sql(f"select * from approval_requests where task_id in (select id from tasks where repository in ({repos})) order by id")
    sessions = sql(f"select id, task_id, created_at, model, findings from sessions where task_id in (select id from tasks where repository in ({repos})) order by created_at")
    ledger = sql(f"select task_id, kind, eur, created_at from ledger where task_id in (select id from tasks where repository in ({repos})) order by created_at")
    by_task = {t["id"]: t for t in tasks}

    cards = []
    for t in tasks:
        repo = t["repository"]
        card = {
            "id": t["id"], "repository": repo, "objective": t["objective"],
            "status": t["status"], "lane": t["lane"], "kind": t["kind"],
            "source": t["source"], "plan_key": t["plan_key"],
            "parent_task": t["parent_task"], "author": t["author"],
            "issue_number": t["issue_number"], "pr_number": t["pr_number"],
            "spent_eur": float(t["spent_eur"]), "budget_eur": float(t["budget_eur"]),
            "model_alias": t["model_alias"], "agent_summary": t["agent_summary"],
            "attempts": t["attempts"],
            "created_at": t["created_at"], "finished_at": t["finished_at"],
            "issue_url": f"{GIT}/{repo}/issues/{t['issue_number']}" if t["issue_number"] else "",
            "pr_url": f"{GIT}/{repo}/pulls/{t['pr_number']}" if t["pr_number"] else "",
            "deps": [by_task[d]["issue_number"] for d in
                     (x["depends_on"] for x in deps if x["task_id"] == t["id"]) if d in by_task],
        }
        if t["created_at"] and t["finished_at"]:
            card["total_minutes"] = minutes(t["created_at"], t["finished_at"])
        tid = t["id"]
        card["approvals"] = [{k: a[k] for k in
                              ("id", "kind", "status", "pr_number", "reason",
                               "spec", "decided_by", "decision_note", "created_at")}
                             for a in approvals if a["task_id"] == tid]
        card["sessions"] = [{k: s[k] for k in ("id", "created_at", "model", "findings")}
                            for s in sessions if s["task_id"] == tid]
        card["ledger"] = [{"kind": l["kind"], "eur": float(l["eur"]),
                           "created_at": l["created_at"]}
                          for l in ledger if l["task_id"] == tid]
        timeline = [json.loads(line) for line in
                    s3_text(f"{tid}/timeline.jsonl").splitlines() if line.strip()]
        card["timeline"] = timeline
        for s in card["sessions"]:
            dest = HERE / "data" / "sessions" / tid
            dest.mkdir(parents=True, exist_ok=True)
            (dest / f"{s['id']}.jsonl").write_text(
                s3_text(f"{tid}/{s['id']}.jsonl"))
        cards.append(card)

    data = {
        "extracted_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": {
            "backup": "s3://aisoftwarefactory-backups/cnpg/sf-cluster/sf-cluster-v12/base/20261001T202539",
            "wal_through": "0000000C0000000500000061 (last transaction 2026-10-01 20:46:38 UTC)",
            "method": "postgres:18 container recovery, gateway database",
        },
        "columns": ["Backlog", "Plan", "Ready", "Running", "Waiting on a human",
                    "Waiting on the author", "In review", "Done", "Failed", "Closed"],
        "projects": [{"name": r.split("/")[0], "repository": r} for r in REPOS],
        "cards": cards,
    }
    out = HERE / "data" / "cards.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, indent=1))
    print(f"{out}: {len(cards)} cards, {sum(len(c['timeline']) for c in cards)} timeline events, "
          f"{sum(len(c['approvals']) for c in cards)} approvals, "
          f"{sum(len(c['sessions']) for c in cards)} session transcripts")


if __name__ == "__main__":
    sys.exit(main())
