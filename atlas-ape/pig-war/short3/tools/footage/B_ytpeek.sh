#!/bin/bash
# Group B: frame grid of a YouTube video from its low-res stream. Usage: B_ytpeek.sh <id> <out.jpg> [n=40] [t0] [t1] [h=150] [cols=8] [maxh=480]
id=$1; out=$2; n=${3:-40}; t0=${4:--}; t1=${5:--}; h=${6:-150}; cols=${7:-8}; mh=${8:-480}
url=$(yt-dlp -g -f "bv*[height<=$mh][ext=mp4]/bv*[height<=$mh]" "https://www.youtube.com/watch?v=$id" 2>/dev/null | head -1)
[ -z "$url" ] && { echo "no url for $id"; exit 1; }
python3 -E /Users/khorengrigoryan/shorts/atlas-ape/pig-war/short3/tools/footage/B_strip.py "$url" "$out" $n $t0 $t1 $h $cols
