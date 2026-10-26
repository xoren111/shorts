#!/bin/bash
# Preview a remote stock clip without downloading it fully.
# usage: preview.sh <pexels-id | full mp4 url> <outdir> [nframes]
# Writes <outdir>/<key>.jpg (strip of N frames, 360 px wide each) and <outdir>/<key>.txt (url, w, h, fps, duration).
set -u
SRC="$1"; OUT="$2"; N="${3:-5}"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
mkdir -p "$OUT"
if [[ "$SRC" =~ ^[0-9]+$ ]]; then
  KEY="px$SRC"
  URL=$(curl -s -o /dev/null -w "%{redirect_url}" -A "$UA" "https://www.pexels.com/download/video/$SRC/")
else
  KEY=$(basename "$SRC" .mp4)
  URL="$SRC"
fi
[ -z "$URL" ] && { echo "$KEY: no url"; exit 1; }
INFO=$(ffprobe -v error -user_agent "$UA" -select_streams v:0 -show_entries stream=width,height,r_frame_rate:format=duration -of csv=p=0 "$URL" | tr '\n' ' ')
DUR=$(echo "$INFO" | awk '{print $NF}' | awk -F, '{print $NF}')
DUR=${DUR%.*}
[ -z "$DUR" ] && DUR=10
echo "$URL $INFO" > "$OUT/$KEY.txt"
TMP=$(mktemp -d)
for i in $(seq 0 $((N-1))); do
  T=$(awk -v d="$DUR" -v i="$i" -v n="$N" 'BEGIN{printf "%.2f", (d-0.5)*(i+0.5)/n}')
  ffmpeg -v error -user_agent "$UA" -ss "$T" -i "$URL" -frames:v 1 -vf "scale=360:-2" -y "$TMP/f$(printf %02d $i).jpg" 2>/dev/null || \
  ffmpeg -v error -user_agent "$UA" -ss "$T" -i "$URL" -frames:v 1 -vf "scale=360:-2" -y "$TMP/f$(printf %02d $i).jpg"
done
ffmpeg -v error -pattern_type glob -i "$TMP/f*.jpg" -vf "tile=4x$(( (N+3)/4 ))" -frames:v 1 -y "$OUT/$KEY.jpg"
rm -rf "$TMP"
echo "$KEY done: $INFO"
