"""Verify every Innertube-sampled id with Data API videos.list (publishedAt, views, duration, lang, channelId) and channels.list.
Caches: raw/videos_cache.json, raw/channels_cache.json"""
import json, os, sys, glob
sys.path.insert(0, os.path.dirname(__file__)); import dapi
R = '/Users/khorengrigoryan/shorts/atlas-ape/analytics/audit-2026-10-25/niche_saturation/raw'
vc_path, cc_path = f'{R}/videos_cache.json', f'{R}/channels_cache.json'
vc = json.load(open(vc_path)) if os.path.exists(vc_path) else {}
vc.update({k: v for k, v in json.load(open(f'{R}/dapi_search_videos.json')).items() if k not in vc})
cc = json.load(open(cc_path)) if os.path.exists(cc_path) else {}
ids = []
for f in sorted(glob.glob(f'{R}/innertube_*.json')):
    for kw, buckets in json.load(open(f)).items():
        for b, items in buckets.items():
            ids += [i['id'] for i in items if i.get('id') and i.get('kind') == 'short']
before = len(vc)
dapi.videos(ids, vc)
json.dump(vc, open(vc_path, 'w'), ensure_ascii=False)
dapi.channels([v['channelId'] for v in vc.values() if v], cc)
json.dump(cc, open(cc_path, 'w'), ensure_ascii=False)
print('videos', before, '->', len(vc), 'channels', len(cc))
