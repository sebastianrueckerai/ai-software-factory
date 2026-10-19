#!/bin/bash
# Round 10 breadth: 8 directions x dark+light. Continues past failures; exits 1 if any failed.
cd "$(dirname "$0")/../../../.." || exit 1   # the design repo root (the worktree)
set -a; . ./.env.tools; set +a
R=$PWD/design/rounds/10-compact-screen
rc=0
for d in 01-edge-tabs 02-glyph-cluster 03-swap-words 04-snap-drag 05-popover 06-one-instrument 07-quiet-hover 08-panel-tabs; do
  for th in dark light; do
    out=$R/cand/${d}-${th}.png
    [ -f "$out" ] && { echo "skip $d-$th (exists)"; continue; }
    cat $R/prompts/_shared-shell.md $R/prompts/$d.md $R/prompts/_shared-content.md $R/prompts/_palette-${th}.md > /tmp/p10-$d-$th.md
    if python3 tools/img.py gen --model google/nano-banana-2.1 \
        --prompt-file /tmp/p10-$d-$th.md \
        --label "10 ${d#*-} ${th}" --out "$out" >> /tmp/p10-gen.log 2>&1; then
      echo "done $d-$th"
    else
      echo "FAIL $d-$th"; rc=1
    fi
  done
done
exit $rc
