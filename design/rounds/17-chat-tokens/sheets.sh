#!/usr/bin/env bash
# sheets.sh rebuilds the sheets the critics judged, from the round's shots,
# with tools/img.py montage. Run from the repository root. The first loop's
# sheets come from shots/{before,A,B,C}; the compare loop's from those and
# shots/F-judged, the pick as the critics saw it, before the build's last
# two changes (the row header's hairline, the project's name).
set -euo pipefail
R=design/rounds/17-chat-tokens
S=$R/shots
J=$R/shots/F-judged
img=./tools/img.py
for t in dark light; do
  $img montage --images $S/{before,A,B,C}/$t/crop-label-1440.png --labels "before" "A: via words" "B: chip" "C: dashed avatar" --cols 2 --cell 760 --out $R/sheet-label-$t-1x.png
  $img montage --images $S/{before,A,B,C}/$t/crop-label-1440-3x.png --labels "before 3x" "A 3x" "B 3x" "C 3x" --cols 2 --cell 1100 --out $R/sheet-label-$t-3x.png
  $img montage --images $S/{before,A,B,C}/$t/crop-shown-1440.png --labels "before" "A: block on top, select boxes" "B: block under the new row" "C: command panel, Copy" --cols 1 --cell 1300 --out $R/sheet-shown-$t-1440.png
  $img montage --images $S/{before,A,B,C}/$t/crop-tokens-1440.png --labels "before" "A: lamp on last use, form in one row" "B: lamp before the name, form label beside field" "C: lamp on last use, form folded" --cols 1 --cell 1300 --out $R/sheet-tokens-$t-1440.png
done
$img montage --images $S/{before,A,B,C}/dark/crop-label-390.png $S/{before,A,B,C}/light/crop-label-390.png --labels "before dark" "A dark" "B dark" "C dark" "before light" "A light" "B light" "C light" --cols 4 --cell 390 --out $R/sheet-label-390.png
$img montage --images $S/{before,A,B,C}/dark/made-landing-390.png $S/{before,A,B,C}/light/made-landing-390.png --labels "before dark" "A dark" "B dark" "C dark" "before light" "A light" "B light" "C light" --cols 4 --cell 844 --out $R/sheet-landing-390.png
$img montage --images $S/{before,A,B,C}/dark/notifications-390.png --labels "before" "A" "B" "C" --cols 4 --cell 1700 --out $R/sheet-page-390-dark.png
$img montage --images $S/{before,A,B,C}/dark/made-landing-1440.png --labels "before" "A" "B" "C" --cols 2 --cell 1000 --out $R/sheet-landing-1440-dark.png
mkdir -p $R/compare
$img montage --images $S/A/dark/crop-label-1440.png $J/dark/crop-label-1440.png $S/A/light/crop-label-1440.png $J/light/crop-label-1440.png --labels "A dark: via words" "F dark: dashed avatar + via" "A light" "F light" --cols 2 --cell 760 --out $R/compare/label-1x.png
$img montage --images $S/A/dark/crop-label-1440-3x.png $J/dark/crop-label-1440-3x.png $S/A/light/crop-label-1440-3x.png $J/light/crop-label-1440-3x.png --labels "A dark 3x" "F dark 3x" "A light 3x" "F light 3x" --cols 2 --cell 1100 --out $R/compare/label-3x.png
$img montage --images $S/A/dark/crop-label-390.png $J/dark/crop-label-390.png $S/A/light/crop-label-390.png $J/light/crop-label-390.png --labels "A dark" "F dark" "A light" "F light" --cols 4 --cell 390 --out $R/compare/label-390.png
$img montage --images $S/{A,B}/dark/made-landing-1440.png $J/dark/made-landing-1440.png --labels "A" "B" "F" --cols 3 --cell 1000 --out $R/compare/landing-1440-dark.png
$img montage --images $S/{A,B}/dark/made-landing-390.png $J/dark/made-landing-390.png $S/{A,B}/light/made-landing-390.png $J/light/made-landing-390.png --labels "A dark" "B dark" "F dark" "A light" "B light" "F light" --cols 3 --cell 844 --out $R/compare/landing-390.png
$img montage --images $S/A/light/crop-shown-1440.png $J/light/crop-shown-1440.png --labels "A light" "F light" --cols 1 --cell 1300 --out $R/compare/shown-light-1440.png
$img montage --images $S/{A,B}/dark/notifications-390.png $J/dark/notifications-390.png --labels "A" "B" "F" --cols 3 --cell 1800 --out $R/compare/page-390-dark.png
