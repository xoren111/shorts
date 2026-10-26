#!/bin/bash
# nvariant.sh <name> <patch.py|none> <times> → st/<name>/ (PNG, scale 1) from neg/short (MotionDemo restored afterwards)
set -e
W=/private/tmp/claude-501/-Users-khorengrigoryan-shorts/39eead59-aa4a-4c21-bbb2-8ef756811d60/scratchpad/work_motion_fixverify
P=/private/tmp/claude-501/-Users-khorengrigoryan-shorts/39eead59-aa4a-4c21-bbb2-8ef756811d60/scratchpad/work_motion_fix
cp "$W/neg/short/MotionDemo.orig.tsx" "$W/neg/short/src/MotionDemo.tsx"
if [ "$2" != none ]; then /usr/bin/python3 "$P/$2" "$W/neg/short/src/MotionDemo.tsx"; fi
cd "$W/neg/short" && node tools/stills.mjs --comp MotionDemo --t "$3" --out "$W/st/$1" --scale 1 --png --sheet 0 2>&1 | tail -1
cp "$W/neg/short/MotionDemo.orig.tsx" "$W/neg/short/src/MotionDemo.tsx"
