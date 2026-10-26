#!/bin/zsh
cd ~/shorts/atlas-ape/pig-war/short
for v in stayed party; do tools/blender/shot.sh camp.py $v --variant $v; done
echo QUEUE4_DONE
