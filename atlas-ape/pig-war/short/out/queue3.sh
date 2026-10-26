#!/bin/zsh
cd ~/shorts/atlas-ape/pig-war/short
for v in governor admiral; do tools/blender/shot.sh deck.py $v --variant $v; done
echo QUEUE3_DONE
