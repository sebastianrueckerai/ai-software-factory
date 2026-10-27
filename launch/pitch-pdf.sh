#!/usr/bin/env bash
# Writes launch/revision/pitch.pdf, the investor case, from launch/revision/pitch.md.
set -euo pipefail
dir="$(cd "$(dirname "$0")/revision" && pwd)"
style="$(mktemp --suffix=.html)"
trap 'rm -f "$style" "$dir/pitch.html"' EXIT
cat > "$style" <<'CSS'
<style>
@page { size: A4; margin: 22mm 22mm 24mm 22mm; }
html { font: 10.5pt/1.5 Georgia, "Bitstream Charter", serif; color: #1a1a1a; }
body { margin: 0; max-width: none; }
h1 { font-size: 26pt; font-weight: normal; margin: 0 0 2pt; color: #0b3d4a; }
h1 + p { margin: 0 0 20pt; padding-bottom: 10pt; border-bottom: 1.5pt solid #0b3d4a; color: #5c6b70; font-size: 10pt; letter-spacing: 0.08em; text-transform: uppercase; }
h2 { font-size: 14pt; font-weight: bold; color: #0b3d4a; margin: 22pt 0 7pt; break-after: avoid; page-break-after: avoid; }
p { margin: 0 0 8pt; orphans: 3; widows: 3; }
ol, ul { margin: 0 0 8pt; padding-left: 1.5em; }
li { margin: 0 0 5pt; }
li p { margin: 0; }
table { width: 100%; border-collapse: collapse; font-size: 9.5pt; line-height: 1.35; margin: 8pt 0 14pt; }
thead { display: table-header-group; }
tr { break-inside: avoid; page-break-inside: avoid; }
th { text-align: left; font-weight: bold; padding: 5pt 8pt; border-bottom: 1pt solid #0b3d4a; vertical-align: bottom; }
td { padding: 5pt 8pt; border-bottom: 0.5pt solid #cfd6d9; vertical-align: top; }
tbody tr:nth-child(even) td { background: #f3f6f7; }
a { color: #0b5aa8; text-decoration: none; overflow-wrap: anywhere; }
blockquote { margin: 0 0 8pt 1.5em; color: #444; }
#sources ~ ul, #sources ~ ul li { font-size: 9pt; color: #333; }
</style>
CSS
pandoc -s "$dir/pitch.md" -o "$dir/pitch.html" --metadata pagetitle="AI Software Factory: the investor case" --metadata lang=en-GB -H "$style"
google-chrome --headless=new --no-sandbox --disable-gpu --no-pdf-header-footer --print-to-pdf="$dir/pitch.pdf" "file://$dir/pitch.html" 2>/dev/null
pdfinfo "$dir/pitch.pdf" | grep Pages
