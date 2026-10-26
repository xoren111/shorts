#!/bin/bash
# Commons video screening via server-side stills (thumb with seek=), sequential to avoid 429.
# usage: cmthumbs.sh <outdir> <duration_s> <upload-url>
OUT="$1"; DUR="$2"; URL="$3"
UA="pigwar-footage/1.0 (research; khoren)"
mkdir -p "$OUT"; T=$(mktemp -d)
P=${URL#https://upload.wikimedia.org/wikipedia/commons/}; H=${P%/*}; F=${P##*/}
for i in 0 1 2 3 4 5 6 7; do
  S=$(awk -v d="$DUR" -v i="$i" 'BEGIN{printf "%d", (d-1)*(i+0.5)/8}')
  curl -s -f -A "$UA" -o "$T/f0$i.jpg" "https://upload.wikimedia.org/wikipedia/commons/thumb/$H/$F/500px-seek%3D$S-$F.jpg" || echo "miss $S"
  sleep 0.5
done
ffmpeg -v error -pattern_type glob -i "$T/f*.jpg" -vf "scale=360:-2,tile=4x2" -frames:v 1 -y "$OUT/$(basename "$F").jpg"
rm -rf "$T"; echo "done $F"
