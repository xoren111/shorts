#!/bin/bash
# Group B: grab a strip of N frames from a remote/local video. Usage: B_peek_url.sh <url> <out.jpg> [n=8] [t0] [t1] [height=200]
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
url=$1; out=$2; n=${3:-8}; h=${6:-200}
UAO=(); case "$url" in http*) UAO=(-user_agent "$UA");; esac
dur=$(ffprobe -v error "${UAO[@]}" -show_entries format=duration -of csv=p=0 "$url")
t0=${4:-0}; t1=${5:-$dur}
tmp=$(mktemp -d)
for i in $(seq 0 $((n-1))); do
  t=$(python3 -c "print(round($t0+($t1-$t0)*($i+0.5)/$n,2))")
  ffmpeg -v error -y "${UAO[@]}" -ss $t -i "$url" -frames:v 1 -vf "scale=-2:$h,drawtext=text='$t':x=4:y=4:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.6" "$tmp/$i.jpg" </dev/null
done
ffmpeg -v error -y $(for i in $(seq 0 $((n-1))); do echo "-i $tmp/$i.jpg"; done) -filter_complex "$(for i in $(seq 0 $((n-1))); do printf '[%d:v]' $i; done)hstack=inputs=$n" "$out"
rm -rf "$tmp"; echo "dur=$dur -> $out"
