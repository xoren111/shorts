#!/bin/bash
# Group B: resolve a Pexels video id to its direct file URL, probe it and grab a 6-frame strip.
# Usage: B_pexels_peek.sh <id> <outdir>
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
id=$1; out=$2; mkdir -p "$out"
url=$(curl -sI -A "$UA" "https://www.pexels.com/download/video/$id/" | grep -i '^location:' | head -1 | awk '{print $2}' | tr -d '\r')
[ -z "$url" ] && { echo "$id NO-URL"; exit 1; }
info=$(ffprobe -v error -user_agent "$UA" -select_streams v:0 -show_entries stream=width,height,r_frame_rate:format=duration -of csv=p=0:s=x "$url" | tr '\n' ' ')
echo "$id | $info | $url"
dur=$(ffprobe -v error -user_agent "$UA" -show_entries format=duration -of csv=p=0 "$url")
n=6; args=()
for i in $(seq 0 $((n-1))); do
  t=$(python3 -c "print(round($dur*($i+0.5)/$n,2))")
  ffmpeg -v error -y -user_agent "$UA" -ss $t -i "$url" -frames:v 1 -vf "scale=-2:270,drawtext=text='$t':x=5:y=5:fontsize=20:fontcolor=yellow:box=1:boxcolor=black" "$out/${id}_$i.jpg" 2>/dev/null || ffmpeg -v error -y -user_agent "$UA" -ss $t -i "$url" -frames:v 1 -vf "scale=-2:270" "$out/${id}_$i.jpg"
done
ffmpeg -v error -y $(for i in $(seq 0 $((n-1))); do echo "-i $out/${id}_$i.jpg"; done) -filter_complex "$(for i in $(seq 0 $((n-1))); do printf '[%d:v]' $i; done)hstack=inputs=$n" "$out/${id}_strip.jpg"
rm -f "$out/${id}_"[0-9].jpg
