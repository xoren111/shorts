#!/bin/zsh
cd ~/shorts/atlas-ape/pig-war/short
for v in soldiers warships; do tools/blender/shot.sh bay.py $v --variant $v; done
echo QUEUE2_DONE
