#!/usr/bin/env bash
# demo/run.sh [scene...] records the named scenes, or every scene in demo/scenes, against the console lab.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
export CODE_REPO=${CODE_REPO:-/home/womb/repos/ai-software-factory-code}
export CONSOLE_LAB_DIR=${CONSOLE_LAB_DIR:-/tmp/claude-1000/console-lab-demo}
export CONSOLE_LAB_ADDR=${CONSOLE_LAB_ADDR:-127.0.0.1:8147}
export BASE=http://$CONSOLE_LAB_ADDR
export NODE_PATH=${NODE_PATH:-/tmp/claude-1000/pw/node_modules}
export PLAYWRIGHT_BROWSERS_PATH=${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}
export CONSOLE_COMMIT=$(git -C "$CODE_REPO" rev-parse HEAD 2>/dev/null || echo unknown)
export DESIGN_COMMIT=$(git -C "$here" rev-parse HEAD)

scenes=("$@")
if [ ${#scenes[@]} -eq 0 ]; then
  for f in "$here"/scenes/*.js; do scenes+=("$(basename "$f" .js)"); done
fi

mkdir -p "$CONSOLE_LAB_DIR" "$here/out"
rm -f "$CONSOLE_LAB_DIR/cookie.txt" "$CONSOLE_LAB_DIR/stop"
log=$CONSOLE_LAB_DIR/lab.log
(cd "$CODE_REPO" && CONSOLE_LAB=1 exec go test -count=1 -run '^TestLab$' -timeout 0 ./internal/console/) >"$log" 2>&1 &
lab=$!
trap 'touch "$CONSOLE_LAB_DIR/stop"; wait "$lab" 2>/dev/null || true' EXIT

for _ in $(seq 1 240); do
  [ -f "$CONSOLE_LAB_DIR/cookie.txt" ] && break
  kill -0 "$lab" 2>/dev/null || break
  sleep 0.5
done
[ -f "$CONSOLE_LAB_DIR/cookie.txt" ] || { echo "the lab did not start; see $log" >&2; exit 1; }

status=0
node "$here/record.js" "${scenes[@]}" || status=1
for s in "${scenes[@]}"; do
  if [ -f "$here/out/$s.webm" ]; then
    secs=$(node -p "require('$here/out/$s.json').durationMs / 1000")
    ffmpeg -y -loglevel error -i "$here/out/$s.webm" -t "$secs" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "$here/out/$s.mp4"
  fi
done
exit $status
