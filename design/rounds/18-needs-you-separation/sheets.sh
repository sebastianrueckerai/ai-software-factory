#!/usr/bin/env bash
# sheets.sh builds the sheets the critics judged from the round's shots,
# with tools/img.py montage. Run from the repository root. The first loop
# compares before, base, A, B and C (sheets.sh first); the compare loop
# compares A, B and C with the fusion F as the critics saw it, shots/F-judged
# (sheets.sh compare). shots/F is the pick after the fix round: the band
# follows the head row with a 32 px floor.
set -euo pipefail
R=design/rounds/18-needs-you-separation
S=$R/shots
J=$R/shots/F-judged
img=./tools/img.py
first() {
  $img montage --images $S/{before,base,A,B,C}/dark/seam-1440-n3.png $S/{before,base,A,B,C}/light/seam-1440-n3.png --labels "before dark" "base dark" "A dark" "B dark" "C dark" "before light" "base light" "A light" "B light" "C light" --cols 5 --cell 300 --out $R/contact-sheet-seam-1x.jpg
  for t in dark light; do
    $img montage --images $S/{base,A,B,C}/$t/seam-1440-n3-3x.png --labels "base $t 3x" "A $t 3x" "B $t 3x" "C $t 3x" --cols 2 --cell 900 --out $R/contact-sheet-seam-3x-$t.jpg
    $img montage --images $S/{before,base,A,B,C}/$t/strip-1440-n3.png --labels "before" "base" "A" "B" "C" --cols 5 --cell 280 --height 1700 --out $R/contact-sheet-strip-n3-$t.jpg
  done
  $img montage --images $S/{before,base,A,B,C}/dark/strip-1440-n5.png $S/{A,B,C}/light/strip-1440-n2.png --labels "before 5" "base 5" "A 5" "B 5" "C 5" "A light 2" "B light 2" "C light 2" --cols 5 --cell 280 --height 1500 --out $R/contact-sheet-strip-n5-n2.jpg
  $img montage --images $S/{before,base,A,B,C}/dark/seam-390-n3.png $S/{before,base,A,B,C}/light/seam-390-n3.png --labels "before dark" "base dark" "A dark" "B dark" "C dark" "before light" "base light" "A light" "B light" "C light" --cols 5 --cell 390 --out $R/contact-sheet-seam-390.jpg
  $img montage --images $S/{A,B,C}/dark/view-390-n3.png $S/{A,B,C}/light/view-390-n3.png --labels "A dark" "B dark" "C dark" "A light" "B light" "C light" --cols 6 --cell 390 --height 844 --out $R/contact-sheet-phone.jpg
}
compare() {
  mkdir -p $R/compare
  $img montage --images $S/{A,B,C}/dark/seam-1440-n3.png $J/dark/seam-1440-n3.png $S/{A,B,C}/light/seam-1440-n3.png $J/light/seam-1440-n3.png --labels "A dark" "B dark" "C dark" "F dark" "A light" "B light" "C light" "F light" --cols 4 --cell 300 --out $R/compare/contact-sheet-seam-1x.jpg
  for t in dark light; do
    $img montage --images $S/{A,B,C}/$t/seam-1440-n3-3x.png $J/$t/seam-1440-n3-3x.png --labels "A $t 3x" "B $t 3x" "C $t 3x" "F $t 3x" --cols 2 --cell 900 --out $R/compare/contact-sheet-seam-3x-$t.jpg
  done
  $img montage --images $S/{A,B,C}/dark/strip-1440-n5.png $J/dark/strip-1440-n5.png $S/{A,B,C}/light/strip-1440-n2.png $J/light/strip-1440-n2.png --labels "A dark 5" "B dark 5" "C dark 5" "F dark 5" "A light 2" "B light 2" "C light 2" "F light 2" --cols 8 --cell 280 --height 1500 --out $R/compare/contact-sheet-strips.jpg
  $img montage --images $S/{A,B,C}/dark/view-390-n3.png $J/dark/view-390-n3.png $S/{A,B,C}/light/view-390-n3.png $J/light/view-390-n3.png --labels "A dark" "B dark" "C dark" "F dark" "A light" "B light" "C light" "F light" --cols 4 --cell 390 --height 844 --out $R/compare/contact-sheet-phone.jpg
  $img montage --images $J/dark/view-1440-n3.png $J/light/view-1440-n3.png --labels "F dark, the screen" "F light, the screen" --cols 2 --cell 1440 --out $R/compare/contact-sheet-screen.jpg
}
"${1:-first}"
