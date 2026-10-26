"""Metadata-only: yt-dlp --flat-playlist of each breakout channel's Shorts tab (newest first) -> raw/breakouts_flat.json"""
import json, subprocess, time
R = '/Users/khorengrigoryan/shorts/atlas-ape/analytics/audit-2026-10-25/niche_saturation/raw'
chans = json.load(open(f'{R}/breakout_channels.json'))
out = {}
try: out = json.load(open(f'{R}/breakouts_flat.json'))
except Exception: pass
for name, cid in chans.items():
    if name in out: continue
    p = subprocess.run(['yt-dlp', '--flat-playlist', '-J', '--playlist-end', '150', f'https://www.youtube.com/channel/{cid}/shorts'],
                       capture_output=True, text=True, timeout=300)
    try:
        d = json.loads(p.stdout)
        out[name] = {'id': cid, 'entries': [{'id': e.get('id'), 'title': e.get('title'), 'views': e.get('view_count')} for e in d.get('entries', [])]}
    except Exception as ex:
        out[name] = {'id': cid, 'error': str(ex)[:200], 'stderr': p.stderr[-300:]}
    print(name, len(out[name].get('entries', [])), flush=True)
    json.dump(out, open(f'{R}/breakouts_flat.json', 'w'), ensure_ascii=False)
    time.sleep(1)
