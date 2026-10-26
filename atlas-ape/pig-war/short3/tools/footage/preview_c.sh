#!/bin/zsh
# Preview remote/local videos without full download: 4 frames per clip tiled into one jpg.
# Usage: preview_c.sh <outdir> <name> <url> [<name> <url> ...]
out=$1; shift
mkdir -p "$out"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
while [ $# -ge 2 ]; do
  name=$1; url=$2; shift 2
  uaopt=(); [[ $url == http* ]] && uaopt=(-user_agent "$UA")
  dur=$(ffprobe -v error $uaopt -show_entries format=duration -of csv=p=0 "$url" 2>/dev/null)
  [ -z "$dur" ] && { echo "$name: no duration"; continue; }
  info=$(ffprobe -v error $uaopt -select_streams v:0 -show_entries stream=width,height,r_frame_rate -of csv=p=0 "$url" 2>/dev/null)
  echo "$name dur=$dur $info"
  i=0
  for f in 0.1 0.35 0.6 0.85; do
    t=$(python3 -c "print(round($dur*$f,2))")
    ffmpeg -v error -y $uaopt -ss $t -i "$url" -frames:v 1 -vf "scale=-2:360" "$out/${name}_$i.jpg" </dev/null
    i=$((i+1))
  done
  ffmpeg -v error -y -i "$out/${name}_0.jpg" -i "$out/${name}_1.jpg" -i "$out/${name}_2.jpg" -i "$out/${name}_3.jpg" -filter_complex hstack=inputs=4 "$out/${name}.jpg" </dev/null
  rm -f "$out/${name}_0.jpg" "$out/${name}_1.jpg" "$out/${name}_2.jpg" "$out/${name}_3.jpg"
done
