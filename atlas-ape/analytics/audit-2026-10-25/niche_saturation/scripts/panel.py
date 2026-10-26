"""Uploader panel = the least popularity-biased sample we can get.
Channels are picked because they uploaded a matching Short in the last 48 h (Innertube 'today' bucket, verified by Data API),
NOT because they were popular. For each picked channel we read its last 50 uploads (playlistItems, 1 unit) and keep its own
Shorts (<=180 s) aged 3-30 days -> what a typical ACTIVE uploader in this niche actually gets.
Output raw/panel.json"""
import json, os, sys, random, datetime as dt
sys.path.insert(0, os.path.dirname(__file__)); import dapi
R = '/Users/khorengrigoryan/shorts/atlas-ape/analytics/audit-2026-10-25/niche_saturation/raw'
vc = json.load(open(f'{R}/videos_cache.json')); cc = json.load(open(f'{R}/channels_cache.json'))
NOW = dt.datetime.utcnow()
P = lambda t: dt.datetime.strptime(t[:19], '%Y-%m-%dT%H:%M:%S')
LANG = {'es_historias': 'es', 'de_geschichte': 'de'}
PER_NICHE = int(sys.argv[1]) if len(sys.argv) > 1 else 40
ONLY = sys.argv[2:]
OWN = {'UCdHJ0uWdPkqHaevYJ6u6jng', 'UC-RPPsO5Z_GwO8D4d6-pQJw'}  # owner's own channels are excluded
random.seed(25)
out_path = f'{R}/panel.json'
out = json.load(open(out_path)) if os.path.exists(out_path) else {'channels': {}, 'niches': {}}
pv = {}  # panel videos cache
pv_path = f'{R}/panel_videos.json'
if os.path.exists(pv_path): pv = json.load(open(pv_path))
if os.environ.get('REBUILD'): out['niches'] = {}  # keep the per-channel upload cache, recompute samples


def is_lang(v, niche):
    want = LANG.get(niche, 'en'); l = (v.get('lang') or '').lower()
    if l: return l.startswith(want)
    return want != 'en' or sum(ch.isascii() for ch in v['title']) / max(len(v['title']), 1) > 0.9


import glob
for f in sorted(glob.glob(f'{R}/innertube_*.json')):
    niche = os.path.basename(f)[10:-5]
    if niche in out['niches'] or (ONLY and niche not in ONLY): continue
    raw = json.load(open(f))
    cands = {}
    for kw, bk in raw.items():
        for it in bk.get('today', []):
            v = vc.get(it['id'])
            if v and (NOW - P(v['publishedAt'])).total_seconds() <= 2 * 86400 and (dapi.iso_secs(v['duration']) or 999) <= 180 and is_lang(v, niche):
                if v['channelId'] not in OWN: cands.setdefault(v['channelId'], kw)
    picked = sorted(cands); random.shuffle(picked); picked = picked[:PER_NICHE]
    rows = []
    for cid in picked:
        if cid not in out['channels']:
            r = dapi.call('playlistItems', 1, part='contentDetails', playlistId='UU' + cid[2:], maxResults=50)
            vids = [it['contentDetails']['videoId'] for it in r.get('items', [])]
            dapi.videos(vids, pv)
            out['channels'][cid] = vids
        for vid in out['channels'][cid]:
            v = pv.get(vid)
            if not v: continue
            a = (NOW - P(v['publishedAt'])).total_seconds() / 86400
            if (dapi.iso_secs(v['duration']) or 999) <= 180 and 3 <= a <= 30:
                rows.append({'channel': cid, 'id': vid, 'views': v['views'], 'age_d': round(a, 1)})
    out['niches'][niche] = {'channels_candidates': len(cands), 'channels_picked': len(picked), 'picked': picked, 'rows': rows}
    print(niche, 'cands', len(cands), 'picked', len(picked), 'shorts aged 3-30d', len(rows), flush=True)
    json.dump(out, open(out_path, 'w')); json.dump(pv, open(pv_path, 'w'))
