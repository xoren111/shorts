#!/bin/zsh
cd ~/shorts/atlas-ape/pig-war/short2
for v in caught shot british; do tools/blender/shot.sh farm2.py $v --variant $v; done
tools/blender/shot.sh hook2.py hook
echo QUEUE_FIX_DONE $(date +%T)
