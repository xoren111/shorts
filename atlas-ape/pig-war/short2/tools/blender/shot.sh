#!/bin/zsh
# final render of one shot (GPU lock via run.sh) + grade → public/blender/<shot>.  Usage: tools/blender/shot.sh <script.py> <shot> [extra args]
cd "$(dirname $0)/../.."
script=$1; shot=$2; shift 2
[ -n "$FRESH" ] && rm -rf out/blender/$shot      # default: keep frames already rendered (resume)
tools/blender/run.sh tools/blender/$script -- --samples ${SAMPLES:-10} "$@" > out/blender/$shot.log 2>&1
n=$(ls out/blender/$shot 2>/dev/null | grep -c "^f_")
[ "$n" -lt 10 ] && { echo "FAILED $shot"; tail -5 out/blender/$shot.log; exit 1; }
rm -rf public/blender/$shot && python3 tools/blender/post3.py out/blender/$shot public/blender/$shot
echo "DONE $shot $n frames $(date +%T)"
