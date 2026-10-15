#!/usr/bin/env bash
# Full-height screenshots of an HTML file at 1440 and 390 wide. Usage: tools/shoot.sh <dir> [page.html]   (from the repo root, for example design/prototypes/06-mission-control)
# Uses Playwright when it is installed (PW_NODE_PATH, default /tmp/claude-1000/pw/node_modules), else headless Chrome with tall windows.
set -e
d="$1"; page="${2:-index.html}"
PW="${PW_NODE_PATH:-/tmp/claude-1000/pw/node_modules}"
if [ -d "$PW/playwright" ]; then
  NODE_PATH="$PW" PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}" node "$(dirname "$0")/shoot.js" "$d" "$page"
  exit
fi
stem=shot; [ "$page" != index.html ] && stem="${page%.html}"
url="file://$PWD/$d/$page"
for w in 1440 390; do
  h=$([ $w = 1440 ] && echo 7000 || echo 12000)
  google-chrome --headless=new --hide-scrollbars --no-sandbox --disable-gpu --autoplay-policy=no-user-gesture-required --virtual-time-budget=5000 --window-size=$w,$h --screenshot="$d/$stem-$w.png" "$url" 2>/dev/null
  echo "$d/$stem-$w.png"
done
