#!/usr/bin/env python3
"""Step 2 — resolve every discovered Short via Data API videos.list (1 unit / 50 ids) → channel, exact views, date,
duration, language; then channels.list (1 unit / 50) for creation date, subs, video count.
Seeds (reference channels named in the task) are added by handle.
Writes videos_resolved.json, channels_all.json, channels_100k.json (channels with ≥1 discovered Short ≥100K).
"""
import json, os, re, sys, time, urllib.parse
sys.path.insert(0, '/Users/khorengrigoryan/shorts/tools')
from yt_oauth import access_token, get  # noqa: E402

D = os.path.dirname(os.path.abspath(__file__))
AT = access_token()
API = 'https://www.googleapis.com/youtube/v3/'
UNITS = 0


def data(path, **q):
    global UNITS
    UNITS += 1
    r = get(API + path + '?' + urllib.parse.urlencode(q), AT)
    if 'error' in r:
        print('API error', path, r.get('error', {}).get('message'), file=sys.stderr)
    return r


def iso_dur(s):
    m = re.match(r'P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', s or '')
    if not m: return None
    d, h, mi, se = (int(x or 0) for x in m.groups())
    return d * 86400 + h * 3600 + mi * 60 + se


raw = json.load(open(f'{D}/raw_search.json'))
ids = [k for k in raw if k != '_empty']
vids = {}
for i in range(0, len(ids), 50):
    r = data('videos', part='snippet,statistics,contentDetails', id=','.join(ids[i:i + 50]), maxResults=50)
    for it in r.get('items', []):
        sn, st = it['snippet'], it.get('statistics', {})
        vids[it['id']] = {
            'id': it['id'], 'title': sn['title'], 'channel_id': sn['channelId'], 'channel': sn['channelTitle'],
            'published': sn['publishedAt'], 'views': int(st.get('viewCount', 0)), 'likes': int(st.get('likeCount', 0) or 0),
            'dur': iso_dur(it['contentDetails'].get('duration')), 'lang': sn.get('defaultAudioLanguage') or sn.get('defaultLanguage'),
            'hits': raw[it['id']]['hits'],
        }
json.dump(vids, open(f'{D}/videos_resolved.json', 'w'), ensure_ascii=False, indent=0)

# seeds: reference channels from the task + channels seen in earlier research notes
SEEDS = ['@zackdfilms', '@LowPolyShorts', '@LoadedDiceShorts', '@BigDanBabys', '@GeoGlobeTales']
# Pomegranate: channel of its «24 Rabbits Ruined Australia» Short (jkHI4JKBd2A, rabbits/research/research.json);
# Curiosity Engine: @CuriosityEngine-b4p (Innertube channel search); MapSecrets: no plausible channel found (best hit 22 subs)
seed_ids = {'UCKCpduTtDsy9aVvE2BqcqGA': '@CuriosityEngine-b4p'}
r0 = data('videos', part='snippet', id='jkHI4JKBd2A')
if r0.get('items'):
    seed_ids[r0['items'][0]['snippet']['channelId']] = 'Pomegranate (via jkHI4JKBd2A)'
for h in SEEDS:
    r = data('channels', part='id', forHandle=h)
    if r.get('items'):
        seed_ids[r['items'][0]['id']] = h
    else:
        print('seed not found', h, file=sys.stderr)

chans = {}
for v in vids.values():
    c = chans.setdefault(v['channel_id'], {'channel_id': v['channel_id'], 'channel': v['channel'], 'shorts_found': [],
                                           'seed': None})
    c['shorts_found'].append({k: v[k] for k in ('id', 'title', 'views', 'published', 'dur', 'lang')})
for cid, h in seed_ids.items():
    chans.setdefault(cid, {'channel_id': cid, 'channel': h, 'shorts_found': [], 'seed': None})['seed'] = h

cids = list(chans)
for i in range(0, len(cids), 50):
    r = data('channels', part='snippet,statistics,brandingSettings', id=','.join(cids[i:i + 50]), maxResults=50)
    for it in r.get('items', []):
        c = chans[it['id']]
        sn, st = it['snippet'], it.get('statistics', {})
        c.update({'channel': sn['title'], 'handle': sn.get('customUrl'), 'created': sn['publishedAt'][:10],
                  'country': sn.get('country'), 'subs': int(st.get('subscriberCount', 0) or 0),
                  'total_views': int(st.get('viewCount', 0) or 0), 'video_count': int(st.get('videoCount', 0) or 0),
                  'desc': (sn.get('description') or '')[:200],
                  'lang': it.get('brandingSettings', {}).get('channel', {}).get('defaultLanguage')})
for c in chans.values():
    c['shorts_found'].sort(key=lambda x: -x['views'])
    c['max_found'] = c['shorts_found'][0]['views'] if c['shorts_found'] else 0
json.dump(chans, open(f'{D}/channels_all.json', 'w'), ensure_ascii=False, indent=0)
big = {k: v for k, v in chans.items() if v['max_found'] >= 100_000 or v['seed']}
json.dump(big, open(f'{D}/channels_100k.json', 'w'), ensure_ascii=False, indent=0)
print(f'videos {len(vids)}  channels {len(chans)}  with ≥100K short or seed {len(big)}  units used {UNITS}', file=sys.stderr)
