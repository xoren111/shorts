#!/bin/zsh
# exits when new owner-worthy previews exist (newer than out/.sent_marker): Blender test frames (out/blender/*test*/),
# diagram sheets (out/stills/diag*_sheet.jpg), integration sheets (out/stills/int_*_sheet.jpg); max wait $1 s
cd "$(dirname $0)/.."
MAX=${1:-1800}; NEED=${2:-4}
for i in $(seq 1 $((MAX / 15))); do
  T=$(find out/blender -newer out/.sent_marker -path "*test*" -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
  S=$(find out/stills -maxdepth 1 -newer out/.sent_marker \( -name "diag*_sheet.jpg" -o -name "int_*_sheet.jpg" \) 2>/dev/null | wc -l | tr -d ' ')
  if [ $((T + 3 * S)) -ge $NEED ]; then echo "new: test=$T sheets=$S"; exit 0; fi
  sleep 15
done
echo "timeout"
