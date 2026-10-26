#!/usr/bin/env python3
"""Pick the Short ids whose exact date/views we need (Data API videos.list via get_dates.py):
 every channel: oldest Short, newest Short, first Short ≥100K and first ≥1M (by flat-list order), newest 25;
 labeled big channels: additionally every 20th Short (position → date map for the fatigue windows).
Writes ids_dates.txt.
"""
import glob, json, os

D = os.path.dirname(os.path.abspath(__file__))
ids = []
big = set(x.strip() for x in open(f'{D}/ids_big.txt'))
for f in glob.glob(f'{D}/shorts_lists/*.json'):
    d = json.load(open(f))
    e = d['entries']
    if not e:
        continue
    old_first = list(reversed(e))
    pick = [e[0]['id'], e[-1]['id']] + [x['id'] for x in e[:25]]
    for thr in (100_000, 1_000_000):
        hit = next((x for x in old_first if (x['views'] or 0) >= thr), None)
        if hit:
            pick.append(hit['id'])
    if d['channel_id'] in big:
        pick += [e[i]['id'] for i in range(0, len(e), 20)]
    ids += pick
ids = list(dict.fromkeys(i for i in ids if i))
open(f'{D}/ids_dates.txt', 'w').write('\n'.join(ids))
print(len(ids), 'ids →', -(-len(ids) // 50), 'units')
