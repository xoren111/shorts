#!/bin/zsh
cd ~/shorts/atlas-ape/pig-war/short2
for v in caught shot british price; do tools/blender/shot.sh farm2.py $v --variant $v; done
for v in soldiers warships; do tools/blender/shot.sh bay2.py $v --variant $v; done
for v in governor admiral; do tools/blender/shot.sh deck2.py $v --variant $v; done
for v in stayed party; do tools/blender/shot.sh camp2.py $v --variant $v; done
tools/blender/shot.sh kaiser2.py kaiser
tools/blender/shot.sh finale2.py finale
for m in map mapfinal; do /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P tools/blender/paint_seq.py -- ../short/public/blender/$m public/blender/$m 14 > out/blender/paint_$m.log 2>&1; echo "PAINTED $m $(ls public/blender/$m | wc -l)"; done
echo QUEUE_V2_DONE $(date +%T)
