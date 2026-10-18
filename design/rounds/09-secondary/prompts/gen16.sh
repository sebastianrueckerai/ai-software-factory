#!/bin/bash
# Round 09 breadth: 8 directions x dark+light. Continues past failures; exits 1 if any failed.
cd /home/womb/repos/ai-software-factory || exit 1
set -a; . ./.env.tools; set +a
R=/home/womb/repos/worktrees/asf-docs-round09/design/rounds/09-secondary
rc=0
for d in 01-readout 02-ledger 03-sheet 04-figures 05-rail 06-cards 07-terminal 08-fold; do
  for th in dark light; do
    out=$R/cand/${d}-${th}.png
    [ -f "$out" ] && { echo "skip $d-$th (exists)"; continue; }
    cat $R/prompts/_shared-shell.md $R/prompts/$d.md $R/prompts/_shared-content.md $R/prompts/_palette-${th}.md > /tmp/p09-$d-$th.md
    if python3 tools/img.py gen --model google/nano-banana-2.1 \
        --prompt-file /tmp/p09-$d-$th.md \
        --label "09 ${d#*-} ${th}" --out "$out" >> /tmp/p09-gen.log 2>&1; then
      echo "done $d-$th"
    else
      echo "FAIL $d-$th"; rc=1
    fi
  done
done
exit $rc
