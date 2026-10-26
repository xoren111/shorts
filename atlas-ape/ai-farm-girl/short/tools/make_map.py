"""Brazil + South America outlines for the route map → src/data/map.json (SVG paths in a 1080 × 1920 frame).
Natural Earth 10m admin-0 (public domain), equirectangular with cos(lat0) x-scale, Douglas–Peucker simplified.
python3 tools/make_map.py"""
import json, math, pathlib
import shapefile
ROOT = pathlib.Path(__file__).resolve().parents[1]
SHP = pathlib.Path.home() / 'shorts/barbarossa-1941-v2/data/geo/ne_10m_admin_0_countries/ne_10m_admin_0_countries.shp'
r = shapefile.Reader(str(SHP), encoding='latin1')
f = [x[0] for x in r.fields[1:]]
iso = f.index('ADM0_A3'); cont = f.index('CONTINENT')
# view: Brazil fills the frame width; lat0 for the x-scale
LAT0, LON0 = -14.0, -52.0
W, H, CX, CY, S = 1080, 1920, 540, 900, 22.0      # px per degree (latitude)
def proj(lon, lat):
    return CX + (lon - LON0) * S * math.cos(math.radians(LAT0)), CY - (lat - LAT0) * S
def dp(pts, eps):
    if len(pts) < 3: return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1; n = math.hypot(dx, dy) or 1e-9
    dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / n
        if d > dmax: dmax, idx = d, i
    if dmax > eps: return dp(pts[:idx + 1], eps)[:-1] + dp(pts[idx:], eps)
    return [pts[0], pts[-1]]
out = {'countries': [], 'cities': {}}
for sr in r.iterShapeRecords():
    rec = sr.record
    if rec[cont] != 'South America': continue
    shp = sr.shape; parts = list(shp.parts) + [len(shp.points)]
    d = []
    for a, b in zip(parts[:-1], parts[1:]):
        pts = [proj(*p) for p in shp.points[a:b]]
        if len(pts) < 8: continue
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        if (max(xs) - min(xs)) * (max(ys) - min(ys)) < 30: continue
        # closed ring: first == last breaks Douglas–Peucker (zero-length chord) → simplify the two halves
        h = len(pts) // 2
        s = dp(pts[:h + 1], 1.2)[:-1] + dp(pts[h:], 1.2)
        d.append('M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in s) + ' Z')
    if d: out['countries'].append({'iso': rec[iso], 'd': ' '.join(d)})
for name, lon, lat in [('Imperatriz', -47.4917, -5.5264), ('Belo Horizonte', -43.9378, -19.9208)]:
    out['cities'][name] = [round(v, 1) for v in proj(lon, lat)]
(ROOT / 'src/data').mkdir(parents=True, exist_ok=True)
json.dump(out, open(ROOT / 'src/data/map.json', 'w'))
print(len(out['countries']), 'countries', out['cities'], sum(len(c['d']) for c in out['countries']) // 1000, 'k chars')
