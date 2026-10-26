#!/usr/bin/env python3
"""Step 3 — full Shorts tab of each channel (yt-dlp --flat-playlist, newest first, view_count as YouTube shows it).
  fetch_lists.py ids.txt      (one UC… id per line; skips channels already fetched)
Saves shorts_lists/<UC>.json = {"channel_id", "n", "entries":[{"id","title","views"}...]} (newest first).
"""
import json, os, subprocess, sys, time

D = os.path.dirname(os.path.abspath(__file__))
OUT = f'{D}/shorts_lists'
os.makedirs(OUT, exist_ok=True)
ids = [x.strip() for x in open(sys.argv[1]) if x.strip()]
for i, cid in enumerate(ids):
    dst = f'{OUT}/{cid}.json'
    if os.path.exists(dst):
        continue
    try:
        p = subprocess.run(['yt-dlp', '--flat-playlist', '-J', '--playlist-end', '3000', '--no-warnings',
                            f'https://www.youtube.com/channel/{cid}/shorts'], capture_output=True, text=True, timeout=600)
        d = json.loads(p.stdout) if p.stdout.strip() else {}
    except Exception as e:  # noqa: BLE001
        print('!', cid, e, file=sys.stderr); d = {}
    ents = [{'id': e.get('id'), 'title': e.get('title'), 'views': e.get('view_count')} for e in (d.get('entries') or []) if e]
    json.dump({'channel_id': cid, 'channel': d.get('channel'), 'n': len(ents), 'entries': ents,
               'err': None if d else (p.stderr[-300:] if 'p' in dir() else 'fail')}, open(dst, 'w'), ensure_ascii=False)
    print(f'{i + 1}/{len(ids)} {cid} {d.get("channel")} shorts={len(ents)}', file=sys.stderr, flush=True)
    time.sleep(0.5)
