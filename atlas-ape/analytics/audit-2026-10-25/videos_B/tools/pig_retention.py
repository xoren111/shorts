"""Map the Pig War (Eoxim0DO2g4) retention curve to seconds, spoken words and the visual beat.
Inputs: analytics snapshot per_video.json, whisper words of the published file, beats from short3/src/Short.tsx (/1.06 SPEED)."""
import json
D = 41.4  # published duration (ffprobe 41.40 s)
B = '/Users/khorengrigoryan/shorts/atlas-ape/analytics/audit-2026-10-25/videos_B/'
pv = json.load(open('/Users/khorengrigoryan/shorts/atlas-ape/analytics/data/2026-10-25/per_video.json'))['Eoxim0DO2g4']
ret = pv['retention']['rows']; org = pv['retention_organic']['rows']
words = json.load(open(B + 'words_Eoxim0DO2g4.json'))
BANG = None
beats = [('map 3D relief, pills Border 1846 / USA / BRITISH, US/UK claim lines', 0.0, 2.98), ('AI pig (Flow) before farmhouse + Union Jack', 2.98, 4.7),
         ('AI farmer (Veo) points at pig eating potatoes', 4.7, 7.07), ('shot (Veo) + white smoke wipe', 7.07, 8.0),
         ('US flag card + farmer badge (rays bg)', 8.0, 10.61), ('VS split farmer | pig', 10.61, 12.52), ('$10 gold coin', 12.52, 13.94),
         ('owner card AI (Flow) $100', 13.94, 15.81), ('San Juan island drawn, flags, red/blue halves', 15.81, 18.6),
         ('drawn blue soldiers 400+', 18.6, 21.56), ('drawn warships 70 guns', 21.56, 23.72), ('drawn governor', 23.72, 26.06),
         ('drawn admiral', 26.06, 27.89), ('AI pig again (circle)', 27.89, 29.42), ('AI sentries young -> aged', 29.42, 33.23),
         ('drawn mugs party', 33.23, 34.5), ('drawn Kaiser', 34.5, 35.97), ('seal', 35.97, 36.74), ('island -> USA map', 36.74, 38.54),
         ('AI angel pig + Atlas + VS poll', 38.54, 43.85)]
beats = [(n, a / 1.06, b / 1.06) for n, a, b in beats]
def beat(t):
    return next((n for n, a, b in beats if a <= t < b), beats[-1][0])
def said(t0, t1):
    return ' '.join(w['w'] for w in words if w['t0'] < t1 and w['t1'] > t0)
rows = []
for i, r in enumerate(ret):
    t = r['elapsedVideoTimeRatio'] * D
    prev = ret[i - 1]['audienceWatchRatio'] if i else None
    rows.append({'ratio': r['elapsedVideoTimeRatio'], 't': round(t, 2), 'awr': round(r['audienceWatchRatio'], 4),
                 'drop': round(prev - r['audienceWatchRatio'], 4) if prev is not None else None,
                 'rel': round(r['relativeRetentionPerformance'], 3), 'rel_organic': round(org[i]['relativeRetentionPerformance'], 3),
                 'words': said(t - D / 100, t), 'beat': beat(t)})
json.dump(rows, open(B + 'pig_retention_mapped.json', 'w'), indent=1)
# per-second view (interpolate awr at whole seconds)
import bisect
ts = [r['t'] for r in rows]; aw = [r['awr'] for r in rows]
def awr_at(t):
    if t <= ts[0]: return aw[0]
    j = bisect.bisect_left(ts, t); j = min(j, len(ts) - 1)
    a, b = ts[j - 1], ts[j]
    return aw[j - 1] + (aw[j] - aw[j - 1]) * (t - a) / (b - a)
print('sec | awr start->end | loss (pp of starters) | words | beat')
persec = []
for s in range(0, 42):
    a, b = awr_at(max(s, ts[0])), awr_at(min(s + 1, D))
    persec.append({'sec': s, 'awr_start': round(a, 3), 'awr_end': round(b, 3), 'loss': round(a - b, 3), 'words': said(s, s + 1), 'beat': beat(s + 0.5)})
    print(f"{s:2d} | {a:.3f}->{b:.3f} | {a-b:+.3f} | {said(s, s+1)} | {beat(s+0.5)}")
json.dump(persec, open(B + 'pig_retention_per_second.json', 'w'), indent=1)
top = sorted(persec, key=lambda r: -r['loss'])[:8]
print('\nTOP drops:'); [print(r) for r in top]
