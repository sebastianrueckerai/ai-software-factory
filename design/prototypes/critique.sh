#!/usr/bin/env bash
# The critic's pass over one built prototype. Usage: prototypes/critique.sh <slug> <n>   (from the docs worktree root)
set -e
slug=$1; n=${2:-1}; P=design/prototypes/$slug; S=$P/shots
python3 tools/img.py critique --critic gemini --prompt-file design/prototypes/critique-prompt.txt --max-side 2000 --max-tokens 5000 \
  --images design/rounds/01-directions/$slug-dark.png $S/busy-dark-1440.png $S/busy-light-1440.png $S/idle-dark-1440.png $S/drawer-busy-dark-1440.png $S/phone-busy-dark-390.png \
  --out $P/critique-$n.json > /dev/null
python3 - "$P/critique-$n.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1])); a = d.get("answer") or d.get("text") or d
if isinstance(a, str):
    s = a.strip()
    if s.startswith("```"): s = s.split("\n", 1)[1].rsplit("```", 1)[0]
    try: a = json.loads(s)
    except Exception: print(s[:2500]); sys.exit()
print("match", a.get("match"), "| wow", a.get("wow"), "| verdict", a.get("verdict"))
for c in a.get("craft", []): print(f"- [{c.get('severity')}] {c.get('where')}: {c.get('what')}")
print("keep:", a.get("keep")); print("hierarchy:", a.get("hierarchy"))
PY
