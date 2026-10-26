#!/bin/zsh
# Final Blender renders (one at a time via run.sh's lock) → post.py → public/blender/<shot>
cd "$(dirname $0)/../.."
SAMPLES=${SAMPLES:-20}
jobs=("dock.py|--variant eng:dock_eng" "dock.py|--variant mel:dock_mel" "lesson.py|:lesson" "burrows.py|:burrows" "trophy.py|:trophy" "trophy.py|--variant nobody:nobody" "island.py|:island" "fence.py|--variant pegs:pegs" "fence.py|--variant scratch:scratch" "wardang.py|:wardang" "ceremony.py|:ceremony" "score.py|:score")
[ -n "$ONLY" ] && jobs=(${(s:;:)ONLY})
for j in "${jobs[@]}"; do
  spec=${j%%:*}; shot=${j##*:}; script=${spec%%|*}; args=${spec#*|}
  [ -z "$FORCE" ] && [ -d public/blender/$shot ] && [ "$(ls public/blender/$shot | wc -l)" -gt 10 ] && { echo "skip $shot"; continue; }
  [ -n "$KEEP" ] && [ -d out/blender/$shot ] && [ "$(ls out/blender/$shot | grep -c "^f_")" -gt 10 ] && { echo "post-only $shot"; rm -rf public/blender/$shot; python3 tools/blender/post.py out/blender/$shot public/blender/$shot; continue; }
  rm -rf out/blender/$shot
  echo "$(date +%T) render $shot ($spec)"
  tools/blender/run.sh tools/blender/$script -- ${=args} --samples $SAMPLES > out/blender/$shot.log 2>&1
  n=$(ls out/blender/$shot 2>/dev/null | grep -c "^f_")
  [ "$n" -lt 10 ] && { echo "FAILED $shot"; tail -5 out/blender/$shot.log; continue; }
  rm -rf public/blender/$shot
  python3 tools/blender/post.py out/blender/$shot public/blender/$shot
done
echo ALL_RENDERS_DONE $(date +%T)
