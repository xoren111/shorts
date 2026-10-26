#!/bin/zsh
# Final render + glitch repair + QA (see STATUS.md): render single-threaded, find one-frame render races, replace them
# with clean stills, repair remaining large single-frame dropouts on Heimaey, rebuild the contact sheet, OCR text check.
set -e
cd "$(dirname $0)/.."
node tools/check.mjs | tail -1
python3 tools/mix.py | tail -1
# v6 hybrid: the v4 audio before the seam (matches the v4 picture there)
python3 tools/hybrid_audio.py
rm -f out/chunks/part_*.mp4 out/FINAL/humans_vs_volcano.orig.mp4
CONC=${CONC:-3} node tools/render.mjs > out/render_final.log 2>&1
mkdir -p out/patch/final && cp out/FINAL/humans_vs_volcano.mp4 out/patch/final/raw.mp4
python3 tools/blinks.py out/patch/final/raw.mp4 | tail -15
cp out/glitches.json out/patch/final/glitches.json
# (v5: the 3D shots are pre-rendered image sequences now — no render-race repair; glitches.json is a report to review)
python3 - <<'PY'
import glob, subprocess, tempfile
T=tempfile.mkdtemp(dir='out')
subprocess.run(['ffmpeg','-v','error','-i','out/FINAL/humans_vs_volcano.mp4','-vf','fps=1,scale=324:576','-start_number','0',T+'/f_%03d.jpg'],check=True)
fs=sorted(glob.glob(T+'/f_*.jpg')); a=[]
for i,f in enumerate(fs): a+=[f,f'{i}s']
subprocess.run(['python3','tools/sheet.py','out/FINAL/contact_sheet.jpg','11',*a],check=True)
subprocess.run(['rm','-rf',T])
PY
python3 tools/dupes.py | tail -1 || true
ffprobe -v error -show_entries stream=codec_name,r_frame_rate -show_entries format=duration,size -of compact out/FINAL/humans_vs_volcano.mp4 | sort -u
