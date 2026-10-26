#!/bin/bash
# Fast screening of Pexels videos via their 15 preview thumbnails (preview-0..14.jpg), tiled 5x3.
# usage: pxthumbs.sh <outdir> <id> [<id> ...]
OUT="$1"; shift
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
mkdir -p "$OUT"
one() {
  id="$1"; T=$(mktemp -d)
  for i in $(seq 0 14); do
    curl -s -f -A "$UA" -o "$T/p$(printf %02d $i).jpg" "https://images.pexels.com/videos/$id/pictures/preview-$i.jpg" &
  done; wait
  n=$(ls "$T"/*.jpg 2>/dev/null | wc -l | tr -d ' ')
  if [ "$n" -gt 0 ]; then
    ffmpeg -v error -pattern_type glob -i "$T/p*.jpg" -vf "scale=320:-2,tile=5x3:color=black" -frames:v 1 -y "$OUT/th$id.jpg"
    echo "$id: $n thumbs"
  else echo "$id: none"; fi
  rm -rf "$T"
}
for id in "$@"; do one "$id" & done; wait
