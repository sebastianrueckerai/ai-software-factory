#!/usr/bin/env bash
# Fix loop: regenerate the two carried directions in both themes.
set -e
cd "$(dirname "$0")/../../../.."
for d in 02r-glyph-cluster 06r-one-instrument; do
  for t in dark light; do
    cat design/rounds/10-compact-screen/prompts/_shared-shell.md \
        design/rounds/10-compact-screen/prompts/$d.md \
        design/rounds/10-compact-screen/prompts/_shared-content.md \
        design/rounds/10-compact-screen/prompts/_palette-$t.md > /tmp/p10-$d-$t.txt
    python3 tools/img.py gen --model google/nano-banana-2.1 \
      --prompt-file /tmp/p10-$d-$t.txt --label "round10-$d-$t" \
      --out design/rounds/10-compact-screen/cand/$d-$t.png
  done
done
