"""Replace single bad frames (render races) in the final video with clean stills, re-encode once, keep the audio.
  python3 tools/patch_frames.py <video> <stills_dir> <frames_json>   (frames_json: [{"frame": n}, ...] in stills order)
→ <video> is replaced (the original is kept as <video>.orig.mp4)"""
import json, subprocess, sys, shutil
from pathlib import Path
import numpy as np
from PIL import Image
video = Path(sys.argv[1]); sdir = Path(sys.argv[2]); hits = json.load(open(sys.argv[3]))
stills = sorted(sdir.glob('*.png'))
assert len(stills) == len(hits), (len(stills), len(hits))
rep = {h['frame']: s for h, s in zip(hits, stills)}
W, H = 1080, 1920
orig = video.with_suffix('.orig.mp4')
if not orig.exists():
	shutil.copy(video, orig)
tmp = video.with_suffix('.patched.mp4')
dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', str(orig), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '60', '-i', '-', '-i', str(orig),
	'-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
	'-c:a', 'copy', '-movflags', '+faststart', str(tmp)], stdin=subprocess.PIPE)
n = 0; done = 0
while True:
	b = dec.stdout.read(W * H * 3)
	if len(b) < W * H * 3:
		break
	if n in rep:
		b = np.asarray(Image.open(rep[n]).convert('RGB'), np.uint8).tobytes(); done += 1
	enc.stdin.write(b); n += 1
enc.stdin.close(); enc.wait(); dec.wait()
shutil.move(tmp, video)
print(f'{n} frames, {done} replaced → {video}')
