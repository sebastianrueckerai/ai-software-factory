#!/bin/bash
# Round 09 fix loop: readout + ledger, dark + light.
cd /home/womb/repos/ai-software-factory || exit 1
set -a; . ./.env.tools; set +a
R=/home/womb/repos/worktrees/asf-docs-round09/design/rounds/09-secondary
rc=0
for d in 01-readout-fix 02-ledger-fix; do
  for th in dark light; do
    out=$R/cand/${d}-${th}.png
    [ -f "$out" ] && { echo "skip $d-$th (exists)"; continue; }
    cat $R/prompts/_shared-shell.md $R/prompts/$d.md $R/prompts/_shared-content.md $R/prompts/_palette-${th}.md > /tmp/p09-$d-$th.md
    if python3 tools/img.py gen --model google/nano-banana-2.1 \
        --prompt-file /tmp/p09-$d-$th.md \
        --label "09 ${d%%-*} fix ${th}" --out "$out" >> /tmp/p09-genfix.log 2>&1; then
      echo "done $d-$th"
    else
      echo "FAIL $d-$th"; rc=1
    fi
  done
done
exit $rc
