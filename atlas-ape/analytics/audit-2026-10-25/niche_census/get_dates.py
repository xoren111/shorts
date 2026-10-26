#!/usr/bin/env python3
"""Step 4 — exact views + publish dates for selected Shorts via Data API videos.list (1 unit / 50 ids).
  get_dates.py ids.txt   → appends to video_dates.json {id: {published, views, dur, channel_id}}
"""
import json, os, re, sys, urllib.parse
sys.path.insert(0, '/Users/khorengrigoryan/shorts/tools')
from yt_oauth import access_token, get  # noqa: E402

D = os.path.dirname(os.path.abspath(__file__))
DST = f'{D}/video_dates.json'
AT = access_token()
have = json.load(open(DST)) if os.path.exists(DST) else {}
ids = [x.strip() for x in open(sys.argv[1]) if x.strip() and x.strip() not in have]
ids = list(dict.fromkeys(ids))


def iso_dur(s):
    m = re.match(r'P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', s or '')
    d, h, mi, se = (int(x or 0) for x in m.groups())
    return d * 86400 + h * 3600 + mi * 60 + se


units = 0
for i in range(0, len(ids), 50):
    r = get('https://www.googleapis.com/youtube/v3/videos?' + urllib.parse.urlencode(
        {'part': 'snippet,statistics,contentDetails', 'id': ','.join(ids[i:i + 50]), 'maxResults': 50}), AT)
    units += 1
    if 'error' in r:
        print('API error', r['error'].get('message'), file=sys.stderr); break
    for it in r.get('items', []):
        have[it['id']] = {'published': it['snippet']['publishedAt'], 'views': int(it.get('statistics', {}).get('viewCount', 0)),
                          'dur': iso_dur(it['contentDetails'].get('duration')), 'channel_id': it['snippet']['channelId'],
                          'lang': it['snippet'].get('defaultAudioLanguage')}
json.dump(have, open(DST, 'w'), ensure_ascii=False)
print(f'requested {len(ids)} new ids, units {units}, total stored {len(have)}', file=sys.stderr)
