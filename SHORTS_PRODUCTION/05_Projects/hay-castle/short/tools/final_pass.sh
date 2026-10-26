#!/bin/bash
# YouTube delivery pass (standard section 3; ENVIRONMENT_AUDIT section 3 step 7): H.264 High, yuv420p, BT.709 tags,
# closed GOP = fps/2 (60 fps → 30), 2 B-frames, AAC-LC 48 kHz stereo 384 kbps, moov first, no edit lists.
#   bash tools/final_pass.sh                      out/FINAL/<out_name> + out/sound/final_mix.wav → out/FINAL/<stem>_yt.mp4
#   bash tools/final_pass.sh in.mp4 mix.wav out.mp4
#   VARIANT=B bash tools/final_pass.sh            A/B version (R2): out/FINAL/<stem>_B.mp4 → out/FINAL/<stem>_B_yt.mp4
# Every frame of the input is kept: the mix is padded / trimmed to the picture length (no -shortest — it dropped the last
# 3 frames and cut the loop dissolve short). After the pass check A/V sync on a hard word (standard 9E, S7).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME=$(/usr/bin/python3 -c "import json,sys;p=json.load(open(sys.argv[1]));print(p.get('out_name') or p['slug']+'.mp4')" "$ROOT/project.json")
[ -n "${VARIANT:-}" ] && NAME="${NAME%.mp4}_${VARIANT}.mp4"
IN="${1:-$ROOT/out/FINAL/$NAME}"
MIX="${2:-$ROOT/out/sound/final_mix.wav}"
OUT="${3:-$ROOT/out/FINAL/${NAME%.mp4}_yt.mp4}"
NIN=$(ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of default=nw=1:nk=1 "$IN")
VDUR=$(ffprobe -v error -select_streams v:0 -show_entries stream=duration -of default=nw=1:nk=1 "$IN")
[[ "$VDUR" =~ ^[0-9.]+$ ]] || VDUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$IN")   # e.g. mkv: no stream duration
ffmpeg -v error -y -i "$IN" -i "$MIX" -map 0:v -map 1:a -af "apad=whole_dur=$VDUR,atrim=0:$VDUR" \
  -vf "setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709,format=yuv420p" \
  -c:v libx264 -profile:v high -preset slow -crf 16 -maxrate 24M -bufsize 48M \
  -g 30 -keyint_min 30 -sc_threshold 0 -bf 2 -flags +cgop -x264-params open-gop=0 \
  -c:a aac -b:a 384k -ar 48000 -ac 2 -movflags +faststart+negative_cts_offsets -use_editlist 0 "$OUT"
ffprobe -v error -show_entries stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,color_space,color_primaries,color_transfer,sample_rate,channels,bit_rate -of compact "$OUT"
NOUT=$(ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of default=nw=1:nk=1 "$OUT")
if [ "$NOUT" = "$NIN" ]; then echo "✓ $NOUT / $NIN frames kept"; else echo "! $NOUT frames, input has $NIN — check the pass"; fi
echo "→ $OUT"
