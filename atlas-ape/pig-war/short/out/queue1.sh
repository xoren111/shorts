#!/bin/zsh
cd ~/shorts/atlas-ape/pig-war/short
for v in caught shot british price; do tools/blender/shot.sh farm.py $v --variant $v; done
echo QUEUE1_DONE
