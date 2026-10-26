#!/bin/zsh
# Final Blender renders (one at a time via run.sh's lock) → post.py → public/blender/<shot>
cd "$(dirname $0)/../.."
SAMPLES=${SAMPLES:-28}
jobs=("suez.py|--variant then:then" "suez.py|--variant later:later" "suez.py|--variant war:war" "suez.py|--variant front:front" "suez.py|--variant lake:lake" "suez.py|--variant storm:storm" "decks.py|--variant friends:friends" "decks.py|--variant football:football" "decks.py|--variant stamps:stamps" "decks.py|--variant race:race" "decks.py|--variant dive:dive" "decks.py|--variant sprint:sprint" "decks.py|--variant podium:podium" "suez.py|--variant twosail:twosail" "hamburg.py|:hamburg" "hold.py|:hold")
[ -n "$ONLY" ] && jobs=(${(s:;:)ONLY})
mkdir -p out/blender
for j in "${jobs[@]}"; do
  spec=${j%%:*}; shot=${j##*:}; script=${spec%%|*}; args=${spec#*|}
  [ -z "$FORCE" ] && [ -d public/blender/$shot ] && [ "$(ls public/blender/$shot | wc -l)" -gt 10 ] && { echo "skip $shot"; continue; }
  rm -rf out/blender/$shot
  echo "$(date +%T) render $shot ($spec)"
  tools/blender/run.sh tools/blender/$script -- ${=args} --samples $SAMPLES > out/blender/$shot.log 2>&1
  n=$(ls out/blender/$shot 2>/dev/null | grep -c "^f_")
  [ "$n" -lt 10 ] && { echo "FAILED $shot"; tail -5 out/blender/$shot.log; continue; }
  rm -rf public/blender/$shot
  python3 tools/blender/post2.py out/blender/$shot public/blender/$shot
done
echo ALL_RENDERS_DONE $(date +%T)
