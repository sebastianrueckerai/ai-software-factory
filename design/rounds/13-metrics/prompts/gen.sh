#!/bin/bash
# Round 13 breadth: 6 directions x dark+light. Continues past failures; exits 1 if any failed.
cd /home/womb/repos/ai-software-factory || exit 1
set -a; . ./.env.tools; set +a
R=/home/womb/repos/ai-software-factory/design/rounds/13-metrics
rc=0
for d in 01-rows 02-twin 03-strip 04-figures 05-headline 06-free; do
  for th in dark light; do
    out=$R/cand/${d}-${th}.png
    [ -f "$out" ] && { echo "skip $d-$th (exists)"; continue; }
    cat $R/prompts/_shared-shell.md $R/prompts/$d.md $R/prompts/_shared-content.md $R/prompts/_palette-${th}.md > /tmp/p13-$d-$th.md
    if python3 tools/img.py gen --model google/nano-banana-2.1 \
        --prompt-file /tmp/p13-$d-$th.md \
        --label "13 ${d#*-} ${th}" --out "$out" >> $R/gen.log 2>&1; then
      echo "done $d-$th"
    else
      echo "FAIL $d-$th"; rc=1
    fi
  done
done
exit $rc
