#!/usr/bin/env bash
# sheets.sh lays the shots out as the contact sheets the critics judge.
# Run from the repository root after shoot.js: design/rounds/21-card-room/sheets.sh [slug ...]
# The slugs default to the four candidates; the compare loop names its two.
set -euo pipefail
d=design/rounds/21-card-room
s=$d/shots
slugs=("$@")
[ ${#slugs[@]} -gt 0 ] || slugs=(a-stepper b-five c-sentence d-table)
tag=$([ ${#slugs[@]} -eq 4 ] && echo contact || echo compare)
cols=2
name() { echo "$(echo "${1%%-*}" | tr a-z A-Z) ${1#*-}"; }
mont() { # out, per-slug file, cols, cell, height
  local imgs=() lbls=()
  for x in "${slugs[@]}"; do imgs+=("$s/$x/$2"); lbls+=("$(name "$x")"); done
  uv run tools/img.py montage --images "${imgs[@]}" --labels "${lbls[@]}" --cols "$3" --cell "$4" --height "$5" --out "$d/$tag-$1.jpg" >/dev/null
}
mont ahead3-desk-dark room-ahead-n3-desk-dark.png "$cols" 660 700
mont ahead3-desk-light room-ahead-n3-desk-light.png "$cols" 660 700
mont ahead1-desk-dark room-ahead-n1-desk-dark.png "$cols" 660 700
mont ahead2off-desk-dark room-ahead-n2-off-desk-dark.png "$cols" 660 700
mont money-desk-dark room-money-n1-desk-dark.png "$cols" 660 900
mont money-desk-light room-money-n1-desk-light.png "$cols" 660 900
mont chat-desk-dark room-chat-chat-desk-dark.png "$cols" 660 700
mont chat-desk-light room-chat-chat-desk-light.png "$cols" 660 700
n=${#slugs[@]}
mont ahead3-phone-dark room-ahead-n3-phone-dark.png "$n" 400 900
mont ahead3-phone-light room-ahead-n3-phone-light.png "$n" 400 900
mont money-phone-dark room-money-n1-phone-dark.png "$n" 400 900
mont chat-phone-light room-chat-chat-phone-light.png "$n" 400 900
imgs=() lbls=()
for t in dark light; do for x in "${slugs[@]}"; do imgs+=("$s/$x/count-$t-3x.png"); lbls+=("$(name "$x"), $t"); done; done
uv run tools/img.py montage --images "${imgs[@]}" --labels "${lbls[@]}" --cols "$n" --cell 420 --height 300 --out "$d/$tag-count-3x.jpg" >/dev/null
echo "$d/$tag-*.jpg"
