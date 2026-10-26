#!/bin/zsh
# Resume the v2 («living oil painting») renders after a pause — frames already on disk are kept.
#   cd ~/shorts/atlas-ape/pig-war/short2 && out/resume_v2.sh
cd ~/shorts/atlas-ape/pig-war/short2
rm -rf out/.blender_lock
for v in caught shot british; do tools/blender/shot.sh farm2.py $v --variant $v; done
FRESH=1 tools/blender/shot.sh hook2.py hook        # the first v2 hook had the potato on the pig's back
for v in party; do tools/blender/shot.sh camp2.py $v --variant $v; done
tools/blender/shot.sh kaiser2.py kaiser
tools/blender/shot.sh finale2.py finale
for m in map mapfinal; do
  [ "$(ls public/blender/$m 2>/dev/null | wc -l)" -gt 100 ] && continue
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P tools/blender/paint_seq.py -- ../short/public/blender/$m public/blender/$m 14 > out/blender/paint_$m.log 2>&1
  echo "PAINTED $m $(ls public/blender/$m | wc -l)"
done
echo RESUME_V2_DONE $(date +%T)
