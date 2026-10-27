#!/usr/bin/env bash
# Writes launch/revision/pitch.pdf, the investor case, from launch/revision/pitch.md.
set -euo pipefail
dir="$(cd "$(dirname "$0")/revision" && pwd)"
style="$(mktemp --suffix=.html)"
trap 'rm -f "$style" "$dir/pitch.html"' EXIT
cat > "$style" <<'CSS'
<style>
@page { size: A4; margin: 18mm 20mm; }
html { font: 10.5pt/1.45 -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #111; }
body { margin: 0; max-width: none; }
h1 { font-size: 20pt; margin: 0 0 4pt; }
h2 { font-size: 13pt; margin: 18pt 0 6pt; break-after: avoid; }
p, li { orphans: 3; widows: 3; }
li { margin: 2pt 0; }
table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 6pt 0 10pt; }
tr { break-inside: avoid; }
th, td { border: 1px solid #bbb; padding: 3pt 5pt; vertical-align: top; text-align: left; }
th { background: #eee; }
code { font-size: 9pt; }
a { color: #0b5aa8; text-decoration: none; overflow-wrap: anywhere; }
</style>
CSS
pandoc -s "$dir/pitch.md" -o "$dir/pitch.html" --metadata pagetitle="AI Software Factory: the investor case" -H "$style"
google-chrome --headless=new --no-sandbox --disable-gpu --no-pdf-header-footer --print-to-pdf="$dir/pitch.pdf" "file://$dir/pitch.html" 2>/dev/null
pdfinfo "$dir/pitch.pdf" | grep Pages
