"""Map data for the animated-map kit (src/ui/maps.tsx) → data/maps/<name>.json: land, coast, lakes, rivers, graticule and
region paths plus named points, projected into the 1080 × 1920 frame (SVG user units = screen px at camera zoom 1).

  python3 tools/make_map.py NAME --bbox W,S,E,N [options]          → data/maps/NAME.json + data/maps/NAME.spec.json
  python3 tools/make_map.py --spec data/maps/NAME.spec.json        rebuild from the saved spec (flags given as well override it)
  python3 tools/make_map.py --list-sources                         Natural Earth layers found locally + known border GeoJSONs

Area and projection
  --bbox W,S,E,N        degrees that must be visible at zoom 1 (W > E = across the antimeridian, e.g. 150,-50,-120,10)
  --proj merc|eqc|laea  merc (default: web-map look, conformal), eqc (plate carrée with cos(lat0), small areas), laea (Lambert
                        azimuthal equal-area around the bbox centre: continents, oceans, polar views)
  --fit contain|cover   contain = the whole bbox inside --fitbox (default); cover = the fitbox is filled, bbox cut on one axis
  --fitbox X0,Y0,X1,Y1  screen box the bbox is fitted into (default 60,300,1020,1380: full width, above the subtitle band)
  --pad F               extra geometry around the frame, as a fraction of its size (default 0.4), so MapCamera can pan and zoom out
                        (outside the frame the geometry is simplified for zoom ≤ 1: it is only seen when the camera zooms out)
  --zoom-max Z          deepest MapCamera zoom planned (default 2.5): tolerance inside the frame = --eps / Z
  --eps PX              Douglas–Peucker tolerance in screen px (default 0.8)
Layers
  --layers LIST         default land,lakes,graticule,regions (MapBase strokes the land outline as the coast); +rivers adds
                        ne_10m_rivers_lake_centerlines, +coast separate coast polylines (only for a camera that zooms out so far
                        that the clip edge shows); `-x` drops one, a plain list replaces the default
  --lake-rank N --river-rank N   Natural Earth scalerank cut (default 4 / 5; smaller = only the big ones)
  --region-pad F        regions kept when they reach into the frame ± F of its size (default 0.05; 0 = frame only)
  --grid DEG            graticule step (default: auto from the bbox)
Borders (owner rule: WW2 / historical maps need PERIOD borders, never today's)
  --borders modern|none modern = Natural Earth admin-0 countries (2020s borders) — the JSON says period.borders = "modern" and
                        tools/map_check.py warns when a historical project uses them; none = land and coast only (physical map;
                        coastlines are fine for any period, except changed coasts: Aral Sea, Zuiderzee polders, reservoirs)
                        default: modern, or none when --geojson is given
  --geojson FILE        period borders from a GeoJSON (repeatable; Polygon / MultiPolygon features → regions with "src": "geojson",
                        filled clipped to the modern land in RegionFill). Licence / year are guessed for known files
                        (historical-basemaps world_YYYY = GPL-3.0, OpenHistoricalMap = CC0), else pass them:
  --license TEXT --source TEXT --year N --id-field F --name-field F   (apply to the --geojson given just before them)
  --select ID,ID        keep only these region ids (ADM0_A3 for Natural Earth, e.g. PRT,BRA; GeoJSON ids as printed)
  --lang de|en|ru|…     region names from NAME_<LANG> (Natural Earth) / name_<lang>, label_<lang> (GeoJSON); default en
  --period-note TEXT    free note shown by map_check (e.g. «Grenzen 1937, OHM»)
Points
  --point NAME=LON,LAT  named point (repeatable): MapCamera / PinPop / routePath take the NAME
Output
  --out FILE            default data/maps/NAME.json      --preview [PNG]  quick raster check (default out/maps/NAME_preview.png)

Data: Natural Earth 10m shapefiles (public domain) read with pyshp from the local data dirs (NE_DIR=… adds one); nothing is
downloaded. The JSON carries "proj" so src/ui/maps.tsx projects any lon/lat at render time with the same formulas (project()).
python3 without -I (numpy and pyshp live in the user site-packages).
"""
from __future__ import annotations

import argparse, datetime, json, math, os, re, sys
from pathlib import Path

import numpy as np
import shapefile

ROOT = Path(__file__).resolve().parents[1]            # short/
FRAME_W, FRAME_H = 1080, 1920
SAFE = (48, 288, 887, 1247)                           # standard 4.4: key action inside x 48–887, y 288–1247
HOME = Path.home()
NE_DIRS = [Path(p) for p in os.environ.get('NE_DIR', '').split(':') if p] + [
	HOME / 'shorts/barbarossa-1941-v2/data/geo',
	HOME / 'shorts/barbarossa-1941-v2/data/dl',
	HOME / 'shorts/deutschland-geschichte/data/raw',
]
BORDER_DIRS = [HOME / 'shorts/deutschland-geschichte/data/raw', HOME / 'shorts/deutschland-geschichte/data/raw/hb', HOME / 'shorts/barbarossa-1941-v2/data/geo']
NE_LICENSE = 'public domain (Natural Earth, naturalearthdata.com — no attribution required)'
MODERN_WARNING = ('MODERN borders (Natural Earth admin-0, 2020s): not for maps of events before ~1992 — WW2 needs 1937/39 borders '
                  '(--geojson with period borders, or --borders none)')
DEFAULT_LAYERS = ['land', 'lakes', 'graticule', 'regions']


# ---------------------------------------------------------------- data sources

def ne_path(layer):
	"""<dir>/<layer>/<layer>.shp of the first local data dir that has it."""
	for d in NE_DIRS:
		p = d / layer / f'{layer}.shp'
		if p.exists():
			return p
	sys.exit(f'✗ Natural Earth layer {layer} not found in {", ".join(str(d) for d in NE_DIRS)} (NE_DIR=… adds a folder)')


def ne_version(layer):
	p = ne_path(layer).with_suffix('.VERSION.txt')
	return p.read_text().strip() if p.exists() else '?'


def guess_geojson_meta(path, features):
	"""licence / source / year for the border files we already have (README of deutschland-geschichte, barbarossa-1941-v2)."""
	name = path.name
	props = [f.get('properties') or {} for f in features]
	src_txt = ' '.join(str(p.get('source', '')) for p in props[:5])
	meta = {'source': None, 'license': None, 'year': None}
	m = re.match(r'world_(bc)?(\d+)\.geojson$', name)
	if m:
		meta.update(source='historical-basemaps by André Ourednik (github.com/aourednik/historical-basemaps)', license='GPL-3.0 (attribution in the description)',
		            year=-int(m.group(2)) if m.group(1) else int(m.group(2)))
	elif 'OpenHistoricalMap' in src_txt:
		meta.update(source=src_txt.split('(')[0].strip() or 'OpenHistoricalMap', license='CC0 1.0 (OpenHistoricalMap)')
		dates = [str(p.get('start_date', '')) for p in props if p.get('start_date')]
		if dates:
			meta['year'] = int(dates[0][:4])
	elif name.startswith('europe1941'):
		meta.update(source='barbarossa-1941-v2 build: historical-basemaps (André Ourednik) revised for 21/22 June 1941', license='GPL-3.0 (derived; attribution in the description)', year=1941)
	return meta


# ---------------------------------------------------------------- projection (same formulas as src/ui/maps.tsx project())

def wrap180(x):
	return (np.asarray(x, dtype=float) + 180.0) % 360.0 - 180.0


class Proj:
	"""unit projection of (relative lon, lat) in degrees; screen = (x0 + k·fx, y0 + k·fy)."""

	def __init__(self, kind, lon0, lat0):
		if kind not in ('merc', 'eqc', 'laea'):
			sys.exit(f'✗ --proj {kind}: merc | eqc | laea')
		self.kind, self.lon0, self.lat0 = kind, float(lon0), float(lat0)
		self.k = 1.0
		self.x0 = self.y0 = 0.0

	def unit(self, rl, lat):
		lam = np.radians(np.asarray(rl, dtype=float))
		phi = np.radians(np.clip(np.asarray(lat, dtype=float), -89.999, 89.999))
		if self.kind == 'merc':
			phi = np.clip(phi, -math.radians(85), math.radians(85))
			return lam, -np.log(np.tan(math.pi / 4 + phi / 2))
		if self.kind == 'eqc':
			return lam * math.cos(math.radians(self.lat0)), -phi
		p0 = math.radians(self.lat0)
		c = 1 + math.sin(p0) * np.sin(phi) + math.cos(p0) * np.cos(phi) * np.cos(lam)
		kk = np.sqrt(2 / np.maximum(c, 1e-12))
		return kk * np.cos(phi) * np.sin(lam), -kk * (math.cos(p0) * np.sin(phi) - math.sin(p0) * np.cos(phi) * np.cos(lam))

	def inv_unit(self, fx, fy):
		fx, fy = np.asarray(fx, dtype=float), np.asarray(fy, dtype=float)
		if self.kind == 'merc':
			return np.degrees(fx), np.degrees(2 * np.arctan(np.exp(-fy)) - math.pi / 2)
		if self.kind == 'eqc':
			return np.degrees(fx / math.cos(math.radians(self.lat0))), np.degrees(-fy)
		p0 = math.radians(self.lat0)
		x, y = fx, -fy
		rho = np.hypot(x, y)
		with np.errstate(invalid='ignore', divide='ignore'):
			c = 2 * np.arcsin(np.clip(rho / 2, -1, 1))
			phi = np.arcsin(np.cos(c) * math.sin(p0) + np.where(rho > 1e-12, y * np.sin(c) * math.cos(p0) / rho, 0))
			lam = np.arctan2(x * np.sin(c), rho * math.cos(p0) * np.cos(c) - y * math.sin(p0) * np.sin(c))
		bad = rho > 2 - 1e-9
		return np.where(bad, np.nan, np.degrees(lam)), np.where(bad, np.nan, np.degrees(phi))

	def screen(self, rl, lat):
		fx, fy = self.unit(rl, lat)
		return np.stack([self.x0 + self.k * fx, self.y0 + self.k * fy], axis=-1)

	def json(self):
		return {'kind': self.kind, 'lon0': round(self.lon0, 6), 'lat0': round(self.lat0, 6), 'k': round(self.k, 6), 'x0': round(self.x0, 3), 'y0': round(self.y0, 3)}


# ---------------------------------------------------------------- geometry helpers

def clip_ring(P, box):
	"""Sutherland–Hodgman of a closed ring (N×2) against the rectangle box = (x0, y0, x1, y1), vectorised per edge."""
	x0, y0, x1, y1 = box
	for axis, val, keep_greater in ((0, x0, True), (0, x1, False), (1, y0, True), (1, y1, False)):
		if len(P) < 3:
			return P[:0]
		Q = np.roll(P, -1, axis=0)
		a = P[:, axis] >= val if keep_greater else P[:, axis] <= val
		b = Q[:, axis] >= val if keep_greater else Q[:, axis] <= val
		with np.errstate(invalid='ignore', divide='ignore'):
			t = (val - P[:, axis]) / (Q[:, axis] - P[:, axis])
			I = P + (Q - P) * t[:, None]          # NaN only where a == b (never emitted)
		I[:, axis] = val
		first = np.where((a & b)[:, None], Q, I)
		pts = np.stack([first, Q], axis=1)
		mask = np.stack([a | b, (~a) & b], axis=1)
		P = pts[mask]
	return P


def clip_polyline(P, box):
	"""Liang–Barsky per segment → list of polylines inside box."""
	if len(P) < 2:
		return []
	x0, y0, x1, y1 = box
	A, B = P[:-1], P[1:]
	d = B - A
	t0 = np.zeros(len(A))
	t1 = np.ones(len(A))
	keep = np.ones(len(A), bool)
	for p, q in ((-d[:, 0], A[:, 0] - x0), (d[:, 0], x1 - A[:, 0]), (-d[:, 1], A[:, 1] - y0), (d[:, 1], y1 - A[:, 1])):
		par = np.abs(p) < 1e-12
		keep &= ~(par & (q < 0))
		with np.errstate(divide='ignore', invalid='ignore'):
			r = np.where(par, 0, q / np.where(par, 1, p))
		t0 = np.where(~par & (p < 0), np.maximum(t0, r), t0)
		t1 = np.where(~par & (p > 0), np.minimum(t1, r), t1)
	keep &= t0 <= t1
	out, cur = [], None
	for i in np.nonzero(keep)[0]:
		a = A[i] + d[i] * t0[i]
		b = A[i] + d[i] * t1[i]
		if cur is not None and last_i == i - 1 and t0[i] == 0 and last_t1 == 1:
			cur.append(b)
		else:
			if cur is not None and len(cur) > 1:
				out.append(np.array(cur))
			cur = [a, b]
		last_i, last_t1 = i, t1[i]
	if cur is not None and len(cur) > 1:
		out.append(np.array(cur))
	return out


def dp_chain(P, eps, inner=None, eps_out=None):
	"""Douglas–Peucker of an open chain (iterative, numpy distances); keeps both ends. With `inner` (per-point bool) a stretch
	without any inner point uses the coarser eps_out (geometry outside the frame is only seen when the camera zooms out)."""
	n = len(P)
	if n < 3:
		return P
	cnt = np.concatenate([[0], np.cumsum(inner)]) if inner is not None else None
	keep = np.zeros(n, bool)
	keep[0] = keep[-1] = True
	stack = [(0, n - 1)]
	while stack:
		i, j = stack.pop()
		if j - i < 2:
			continue
		a, b = P[i], P[j]
		seg = P[i + 1:j]
		d = b - a
		L = math.hypot(d[0], d[1])
		if L < 1e-9:
			dist = np.hypot(seg[:, 0] - a[0], seg[:, 1] - a[1])
		else:
			dist = np.abs(d[1] * (seg[:, 0] - a[0]) - d[0] * (seg[:, 1] - a[1])) / L
		m = int(np.argmax(dist))
		e = eps if cnt is None or cnt[j + 1] - cnt[i] > 0 else eps_out
		if dist[m] > e:
			k = i + 1 + m
			keep[k] = True
			stack.append((i, k))
			stack.append((k, j))
	return P[keep]


def dp_ring(P, eps, inner=None, eps_out=None):
	"""closed ring: split at the point farthest from P[0] (a zero-length chord breaks Douglas–Peucker)."""
	if len(P) < 4:
		return P
	m = int(np.argmax(np.hypot(P[:, 0] - P[0, 0], P[:, 1] - P[0, 1])))
	if m == 0:
		return P[:1]
	ia = ib = None
	if inner is not None:
		ia, ib = inner[:m + 1], np.concatenate([inner[m:], inner[:1]])
	a = dp_chain(P[:m + 1], eps, ia, eps_out)
	b = dp_chain(np.vstack([P[m:], P[:1]]), eps, ib, eps_out)
	return np.vstack([a[:-1], b[:-1]])


def ring_area(P):
	x, y = P[:, 0], P[:, 1]
	return 0.5 * float(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))


def fmt(v):
	s = f'{v:.1f}'
	return s[:-2] if s.endswith('.0') else s


def ring_d(P):
	return 'M' + fmt(P[0, 0]) + ',' + fmt(P[0, 1]) + 'L' + ' '.join(fmt(x) + ',' + fmt(y) for x, y in P[1:]) + 'Z'


def line_d(P):
	return 'M' + fmt(P[0, 0]) + ',' + fmt(P[0, 1]) + 'L' + ' '.join(fmt(x) + ',' + fmt(y) for x, y in P[1:])


def on_box(P, box, tol=1e-6):
	"""per point: which box side it lies on (0 none, 1..4 = x0, x1, y0, y1)."""
	x0, y0, x1, y1 = box
	side = np.zeros(len(P), int)
	side[np.abs(P[:, 0] - x0) < tol] = 1
	side[np.abs(P[:, 0] - x1) < tol] = 2
	side[np.abs(P[:, 1] - y0) < tol] = 3
	side[np.abs(P[:, 1] - y1) < tol] = 4
	return side


def coast_of_ring(P, box):
	"""the ring as open coast polylines: segments that run along the clip box are not coast."""
	side = on_box(P, box)
	n = len(P)
	nxt = np.roll(side, -1)
	cut = (side > 0) & (side == nxt)          # segment i → i+1 lies on one box side
	if not cut.any():
		return [np.vstack([P, P[:1]])]
	start = (int(np.nonzero(cut)[0][0]) + 1) % n
	order = np.r_[start:n, 0:start]
	Q, C = P[order], cut[order]
	out, cur = [], [Q[0]]
	for i in range(n):
		j = (i + 1) % n
		if C[i]:
			if len(cur) > 1:
				out.append(np.array(cur))
			cur = [Q[j]]
		else:
			cur.append(Q[j])
	if len(cur) > 1:
		out.append(np.array(cur))
	return out


def label_point(P):
	"""pole of inaccessibility (coarse grid + one refinement): the interior point farthest from the edges."""
	x0, y0 = P.min(axis=0)
	x1, y1 = P.max(axis=0)
	A, B = P, np.roll(P, -1, axis=0)

	def best(gx0, gy0, gx1, gy1, n=24):
		gx, gy = np.meshgrid(np.linspace(gx0, gx1, n), np.linspace(gy0, gy1, n))
		S = np.stack([gx.ravel(), gy.ravel()], axis=1)
		# inside (even-odd ray cast)
		ay, by = A[None, :, 1], B[None, :, 1]
		ax, bx = A[None, :, 0], B[None, :, 0]
		sx, sy = S[:, None, 0], S[:, None, 1]
		cond = (ay > sy) != (by > sy)
		with np.errstate(divide='ignore', invalid='ignore'):
			xin = ax + (sy - ay) * (bx - ax) / (by - ay)
		inside = (cond & (sx < xin)).sum(axis=1) % 2 == 1
		# distance to the edges
		dx, dy = bx - ax, by - ay
		L2 = np.maximum(dx * dx + dy * dy, 1e-12)
		t = np.clip(((sx - ax) * dx + (sy - ay) * dy) / L2, 0, 1)
		dist = np.hypot(sx - (ax + t * dx), sy - (ay + t * dy)).min(axis=1)
		dist = np.where(inside, dist, -1)
		i = int(np.argmax(dist))
		return S[i], dist[i]

	if len(P) > 4000:                      # keep the S×E arrays small
		A = P[:: len(P) // 4000 + 1]
		B = np.roll(A, -1, axis=0)
	p, d = best(x0, y0, x1, y1)
	if d < 0:
		return P.mean(axis=0)
	sx, sy = (x1 - x0) / 23, (y1 - y0) / 23
	p2, d2 = best(p[0] - sx, p[1] - sy, p[0] + sx, p[1] + sy, 12)
	return p2 if d2 > d else p


# ---------------------------------------------------------------- map builder

class Builder:
	def __init__(self, a):
		self.a = a
		W, S, E, N = a.bbox
		span = (E - W) % 360 or 360
		lonc = float(wrap180(W + span / 2))
		self.proj = Proj(a.proj, lonc, (S + N) / 2)
		rw = float(wrap180(W - lonc))
		lons = np.linspace(rw, rw + span, 96)
		lats = np.linspace(S, N, 96)
		edge = np.vstack([np.stack([lons, np.full(96, S)], 1), np.stack([lons, np.full(96, N)], 1),
		                  np.stack([np.full(96, rw), lats], 1), np.stack([np.full(96, rw + span), lats], 1)])
		fx, fy = self.proj.unit(edge[:, 0], edge[:, 1])
		bx0, bx1, by0, by1 = fx.min(), fx.max(), fy.min(), fy.max()
		X0, Y0, X1, Y1 = a.fitbox
		kx, ky = (X1 - X0) / (bx1 - bx0), (Y1 - Y0) / (by1 - by0)
		self.proj.k = min(kx, ky) if a.fit == 'contain' else max(kx, ky)
		self.focus = ((X0 + X1) / 2, (Y0 + Y1) / 2)
		self.proj.x0 = self.focus[0] - self.proj.k * (bx0 + bx1) / 2
		self.proj.y0 = self.focus[1] - self.proj.k * (by0 + by1) / 2
		p = a.pad
		self.clip = (-p * FRAME_W, -p * FRAME_H, FRAME_W * (1 + p), FRAME_H * (1 + p))
		self.eps = a.eps / a.zoom_max          # inside the frame (+ 5 %): seen at up to zoom_max
		self.eps_out = a.eps                   # outside: only seen when the camera zooms out (≤ 1)
		m = 0.05
		self.inner = (-m * FRAME_W, -m * FRAME_H, FRAME_W * (1 + m), FRAME_H * (1 + m))
		rp = a.region_pad
		self.region_box = (-rp * FRAME_W, -rp * FRAME_H, FRAME_W * (1 + rp), FRAME_H * (1 + rp))
		self.min_area = 4.0 / a.zoom_max ** 2
		self.geo_bounds()
		self.stats = {}

	def geo_bounds(self):
		"""lon (relative) / lat range of the padded clip window (inverse projection on a grid), + 2° margin."""
		c = self.clip
		gx, gy = np.meshgrid(np.linspace(c[0], c[2], 41), np.linspace(c[1], c[3], 41))
		rl, lat = self.proj.inv_unit((gx.ravel() - self.proj.x0) / self.proj.k, (gy.ravel() - self.proj.y0) / self.proj.k)
		if np.isnan(rl).any() or self.proj.kind == 'laea' and (np.nanmax(lat) > 80 or np.nanmin(lat) < -80):
			self.gb = (-540.0, 540.0, -90.0, 90.0)
		else:
			self.gb = (float(np.nanmin(rl)) - 2, float(np.nanmax(rl)) + 2, max(-90.0, float(np.nanmin(lat)) - 2), min(90.0, float(np.nanmax(lat)) + 2))

	def rel_ring(self, lonlat):
		"""relative, unwrapped lon + lat of a ring / line; None when it misses the window."""
		rl = np.degrees(np.unwrap(np.radians(wrap180(lonlat[:, 0] - self.proj.lon0))))
		lat = lonlat[:, 1]
		l0, l1, a0, a1 = self.gb
		if lat.max() < a0 or lat.min() > a1:
			return None
		for sh in (0.0, -360.0, 360.0):
			if rl.max() + sh >= l0 and rl.min() + sh <= l1:
				return np.stack([rl + sh, lat], 1)
		return None

	def is_inner(self, P, box=None):
		x0, y0, x1, y1 = box or self.inner
		return (P[:, 0] >= x0) & (P[:, 0] <= x1) & (P[:, 1] >= y0) & (P[:, 1] <= y1)

	def polygons(self, rings, coast=None, min_area=None):
		"""lon/lat rings → clipped, simplified screen rings (+ coast polylines when coast is a list)."""
		out = []
		min_area = self.min_area if min_area is None else min_area
		for r in rings:
			if len(r) < 4:
				continue
			rr = self.rel_ring(r)
			if rr is None:
				continue
			P = self.proj.screen(rr[:, 0], rr[:, 1])
			if np.allclose(P[0], P[-1]):
				P = P[:-1]
			P = clip_ring(P, self.clip)
			if len(P) < 3:
				continue
			inner = self.is_inner(P)
			P = dp_ring(P, self.eps, inner, self.eps_out)
			if len(P) < 3:
				continue
			area = abs(ring_area(P))
			if area < min_area or (area < min_area * self.a.zoom_max ** 2 and not self.is_inner(P).any()):
				continue
			out.append(P)
			if coast is not None:
				coast.extend(c for c in coast_of_ring(P, self.clip) if len(c) > 1)
		return out

	def covers(self, rings, box):
		"""a ring encloses the box centre (a region bigger than the box with no vertex inside it)."""
		cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
		n = 0
		for P in rings:
			A, B = P, np.roll(P, -1, axis=0)
			cond = (A[:, 1] > cy) != (B[:, 1] > cy)
			with np.errstate(divide='ignore', invalid='ignore'):
				xin = A[:, 0] + (cy - A[:, 1]) * (B[:, 0] - A[:, 0]) / (B[:, 1] - A[:, 1])
			n += int((cond & (cx < xin)).sum())
		return n % 2 == 1

	def lines(self, lonlat_lines):
		out = []
		for ln in lonlat_lines:
			if len(ln) < 2:
				continue
			rr = self.rel_ring(ln)
			if rr is None:
				continue
			P = self.proj.screen(rr[:, 0], rr[:, 1])
			for seg in clip_polyline(P, self.clip):
				seg = dp_chain(seg, self.eps, self.is_inner(seg), self.eps_out)
				if len(seg) > 1:
					out.append(seg)
		return out

	# ---- layers
	def shp_rings(self, shape):
		pts = np.asarray(shape.points, dtype=float)
		parts = list(shape.parts) + [len(pts)]
		return [pts[a:b] for a, b in zip(parts[:-1], parts[1:])]

	def land(self):
		r = shapefile.Reader(str(ne_path('ne_10m_land')))
		rings, coast = [], []
		for i in range(len(r)):
			rings.extend(self.polygons(self.shp_rings(r.shape(i)), coast))
		self.stats['land rings'] = len(rings)
		return ' '.join(ring_d(P) for P in rings), ' '.join(line_d(c) for c in coast)

	def lakes(self):
		r = shapefile.Reader(str(ne_path('ne_10m_lakes')), encoding='utf-8')
		rank = r.fields[1:].index(next(f for f in r.fields[1:] if f[0] == 'scalerank'))
		rings = []
		for sr in r.iterShapeRecords():
			if sr.record[rank] is not None and sr.record[rank] > self.a.lake_rank:
				continue
			rings.extend(self.polygons(self.shp_rings(sr.shape), min_area=24.0 / self.a.zoom_max ** 2))
		self.stats['lakes'] = len(rings)
		return ' '.join(ring_d(P) for P in rings)

	def rivers(self):
		r = shapefile.Reader(str(ne_path('ne_10m_rivers_lake_centerlines')), encoding='utf-8')
		names = [f[0] for f in r.fields[1:]]
		out = []
		for sr in r.iterShapeRecords():
			rec = dict(zip(names, sr.record))
			if (rec.get('scalerank') or 99) > self.a.river_rank or 'Lake' in str(rec.get('featurecla', '')):
				continue
			segs = self.lines(self.shp_rings(sr.shape))
			if segs:
				nm = rec.get(f'name_{self.a.lang}') or rec.get('name') or ''
				out.append({'name': nm, 'r': rec.get('scalerank'), 'd': ' '.join(line_d(s) for s in segs)})
		self.stats['rivers'] = len(out)
		return out

	def graticule(self):
		l0, l1, a0, a1 = self.gb
		if l1 - l0 >= 360:                 # whole-world window: one set of meridians
			l0, l1 = -180.0, 180.0
		span = l1 - l0
		step = self.a.grid or next((s for s in (1, 2, 5, 10, 15, 20, 30) if span / s <= 8), 30)
		lines = []
		lat_lo, lat_hi = max(a0, -85), min(a1, 85)
		for lon in np.arange(math.ceil((l0 + self.proj.lon0) / step) * step, l1 + self.proj.lon0 + 1e-9, step):
			lats = np.linspace(lat_lo, lat_hi, 240)
			lines.append(np.stack([np.full_like(lats, lon), lats], 1))
		for lat in np.arange(math.ceil(lat_lo / step) * step, lat_hi + 1e-9, step):
			lons = np.linspace(l0, l1, 480) + self.proj.lon0
			lines.append(np.stack([lons, np.full_like(lons, lat)], 1))
		segs = self.lines(lines)
		self.stats['graticule step'] = step
		return ' '.join(line_d(s) for s in segs)

	def region_entry(self, rid, name, rings_ll, label_ll, src, extra=None):
		rings = self.polygons(rings_ll)
		if not rings:
			return None
		allp = np.vstack(rings)
		if not self.is_inner(allp, self.region_box).any() and not self.covers(rings, self.region_box):
			return None
		big = max(rings, key=lambda P: abs(ring_area(P)))
		c = None
		if label_ll is not None:
			rr = self.rel_ring(np.array([label_ll, label_ll], dtype=float))
			if rr is not None:
				c = self.proj.screen(rr[:1, 0], rr[:1, 1])[0]
		if c is None:
			c = label_point(big)
		e = {'id': rid, 'name': name, 'src': src, 'd': ' '.join(ring_d(P) for P in rings),
		     'c': [round(float(c[0]), 1), round(float(c[1]), 1)],
		     'box': [round(float(v), 1) for v in (*allp.min(axis=0), *allp.max(axis=0))],
		     'area': round(sum(abs(ring_area(P)) for P in rings))}
		if extra:
			e.update(extra)
		return e

	def regions_ne(self):
		r = shapefile.Reader(str(ne_path('ne_10m_admin_0_countries')), encoding='utf-8')
		names = [f[0] for f in r.fields[1:]]
		lang = self.a.lang.upper()
		out = []
		for sr in r.iterShapeRecords():
			rec = dict(zip(names, sr.record))
			rid = rec['ADM0_A3']
			if self.a.select and rid not in self.a.select:
				continue
			nm = rec.get(f'NAME_{lang}') or rec.get('NAME') or rid
			lab = (rec['LABEL_X'], rec['LABEL_Y']) if rec.get('LABEL_X') is not None else None
			e = self.region_entry(rid, nm, self.shp_rings(sr.shape), lab, 'ne')
			if e:
				out.append(e)
		return out

	def regions_geojson(self, g):
		gj = json.load(open(g['file'], encoding='utf-8'))
		feats = gj['features'] if gj.get('type') == 'FeatureCollection' else [gj]
		lang = self.a.lang
		out, seen = [], {}
		for i, f in enumerate(feats):
			geom = f.get('geometry') or {}
			props = f.get('properties') or {}
			if geom.get('type') == 'Polygon':
				polys = [geom['coordinates']]
			elif geom.get('type') == 'MultiPolygon':
				polys = geom['coordinates']
			else:
				continue
			rings = [np.asarray(r, dtype=float)[:, :2] for poly in polys for r in poly if len(r) >= 4]
			idf = g.get('id_field') or next((k for k in ('id', 'ADM0_A3', 'ABBREVN', 'zone', 'sector', 'NAME', 'name') if props.get(k)), None)
			rid = str(props.get(idf)) if idf else f'{Path(g["file"]).stem}_{i}'
			rid = re.sub(r'[^\w-]+', '_', rid).strip('_') or f'r{i}'
			if self.a.select and rid not in self.a.select:
				continue
			seen[rid] = seen.get(rid, 0) + 1
			if seen[rid] > 1:
				rid = f'{rid}_{seen[rid]}'
			nf = g.get('name_field')
			nm = props.get(nf) if nf else next((props[k] for k in (f'label_{lang}', f'name_{lang}', f'NAME_{lang.upper()}', 'name', 'NAME', 'ABBREVN') if props.get(k)), rid)
			lab = props.get('label_pt')
			e = self.region_entry(rid, str(nm), rings, tuple(lab) if isinstance(lab, (list, tuple)) and len(lab) == 2 else None, 'geojson',
			                      {'clip': 'land', 'file': Path(g['file']).name})
			if e:
				out.append(e)
		return out

	def points(self):
		out = {}
		for name, (lon, lat) in self.a.points.items():
			rr = np.degrees(np.unwrap(np.radians(wrap180(np.array([lon, lon]) - self.proj.lon0))))
			P = self.proj.screen(rr[:1], np.array([lat]))[0]
			out[name] = {'x': round(float(P[0]), 1), 'y': round(float(P[1]), 1), 'lon': lon, 'lat': lat}
		return out


# ---------------------------------------------------------------- CLI

def parse_args(argv):
	# «--bbox -50,-28,-2,44»: a value that starts with a minus sign would read as an option → glue it to its flag
	glued = []
	for t in argv:
		if glued and glued[-1].startswith('--') and '=' not in glued[-1] and re.match(r'^-\d', t):
			glued[-1] += '=' + t
		else:
			glued.append(t)
	argv = glued
	ap = argparse.ArgumentParser(description=__doc__.split('\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter)
	ap.add_argument('name', nargs='?')
	ap.add_argument('--spec')
	ap.add_argument('--bbox')
	ap.add_argument('--proj')
	ap.add_argument('--fit', choices=['contain', 'cover'])
	ap.add_argument('--fitbox')
	ap.add_argument('--pad', type=float)
	ap.add_argument('--zoom-max', type=float)
	ap.add_argument('--eps', type=float)
	ap.add_argument('--layers')
	ap.add_argument('--lake-rank', type=int)
	ap.add_argument('--region-pad', type=float)
	ap.add_argument('--river-rank', type=int)
	ap.add_argument('--grid', type=float)
	ap.add_argument('--borders', choices=['modern', 'none'])
	ap.add_argument('--geojson', action='append', default=[])
	ap.add_argument('--license', action='append', default=[])
	ap.add_argument('--source', action='append', default=[])
	ap.add_argument('--year', action='append', default=[])
	ap.add_argument('--id-field', action='append', default=[])
	ap.add_argument('--name-field', action='append', default=[])
	ap.add_argument('--select')
	ap.add_argument('--lang')
	ap.add_argument('--period-note')
	ap.add_argument('--point', action='append', default=[])
	ap.add_argument('--out')
	ap.add_argument('--preview', nargs='?', const='')
	ap.add_argument('--list-sources', action='store_true')
	# per-GeoJSON options follow the --geojson they belong to: rebuild that pairing from the raw argv order
	a = ap.parse_args(argv)
	gj, cur = [], None
	it = iter(range(len(argv)))
	for i in it:
		t = argv[i]
		key, val = (t.split('=', 1) + [None])[:2] if t.startswith('--') else (t, None)
		def nxt():
			return val if val is not None else argv[i + 1]
		if key == '--geojson':
			cur = {'file': nxt()}
			gj.append(cur)
		elif key in ('--license', '--source', '--year', '--id-field', '--name-field') and cur is not None:
			cur[key[2:].replace('-', '_')] = nxt()
	a.geojson_list = gj
	return a


def merge_spec(a):
	"""spec file (if any) + flags → one settings namespace (flags win)."""
	spec = {}
	if a.spec:
		spec = json.load(open(a.spec, encoding='utf-8'))
	def pick(k, default=None):
		v = getattr(a, k, None)
		return v if v not in (None, [], '') else spec.get(k, default)
	s = argparse.Namespace()
	s.name = a.name or spec.get('name')
	if not s.name:
		sys.exit('✗ NAME missing (python3 tools/make_map.py NAME --bbox W,S,E,N …)')
	bbox = pick('bbox')
	if not bbox:
		sys.exit('✗ --bbox W,S,E,N missing')
	s.bbox = [float(v) for v in (bbox.split(',') if isinstance(bbox, str) else bbox)]
	if len(s.bbox) != 4 or not (-90 <= s.bbox[1] < s.bbox[3] <= 90):
		sys.exit(f'✗ --bbox {bbox}: W,S,E,N with S < N')
	s.proj = pick('proj', 'merc')
	s.fit = pick('fit', 'contain')
	fb = pick('fitbox', [60, 300, 1020, 1380])
	s.fitbox = [float(v) for v in (fb.split(',') if isinstance(fb, str) else fb)]
	s.pad = float(pick('pad', 0.4))
	s.zoom_max = float(pick('zoom_max', 2.5))
	s.eps = float(pick('eps', 0.8))
	lay = pick('layers', DEFAULT_LAYERS)
	lay = lay.split(',') if isinstance(lay, str) else list(lay)
	layers = list(DEFAULT_LAYERS) if any(x.startswith(('+', '-')) for x in lay) else []
	for x in lay:
		x = x.strip()
		if x.startswith('-'):
			layers = [l for l in layers if l != x[1:]]
		elif x:
			layers.append(x.lstrip('+'))
	s.layers = list(dict.fromkeys(layers))
	unknown = set(s.layers) - {'land', 'coast', 'lakes', 'rivers', 'graticule', 'regions'}
	if unknown:
		sys.exit(f'✗ --layers: unknown {", ".join(sorted(unknown))}')
	s.lake_rank = int(pick('lake_rank', 4))
	s.region_pad = float(pick('region_pad', 0.05))
	s.river_rank = int(pick('river_rank', 5))
	s.grid = pick('grid')
	s.geojson = a.geojson_list or spec.get('geojson', [])
	for g in s.geojson:
		p = Path(os.path.expanduser(g['file']))
		if not p.is_absolute() and not p.exists():
			p = next((d / g['file'] for d in BORDER_DIRS if (d / g['file']).exists()), p)
		if not p.exists():
			sys.exit(f'✗ --geojson {g["file"]}: file not found (also looked in {", ".join(str(d) for d in BORDER_DIRS)})')
		g['file'] = str(p)
	s.borders = pick('borders', 'none' if s.geojson else 'modern')
	sel = pick('select')
	s.select = set(sel.split(',') if isinstance(sel, str) else sel) if sel else None
	s.lang = pick('lang', 'en')
	s.period_note = pick('period_note', '')
	pts = dict(spec.get('points', {}))
	for p in a.point:
		m = re.match(r'^(.+?)=\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*$', p)
		if not m:
			sys.exit(f'✗ --point {p}: NAME=LON,LAT')
		pts[m.group(1).strip()] = [float(m.group(2)), float(m.group(3))]
	s.points = {k: [float(v[0]), float(v[1])] for k, v in pts.items()}
	s.out = pick('out') or str(ROOT / 'data/maps' / f'{s.name}.json')
	s.preview = a.preview
	return s


def spec_of(s):
	return {'name': s.name, 'bbox': s.bbox, 'proj': s.proj, 'fit': s.fit, 'fitbox': s.fitbox, 'pad': s.pad, 'zoom_max': s.zoom_max, 'eps': s.eps,
	        'layers': s.layers, 'lake_rank': s.lake_rank, 'region_pad': s.region_pad, 'river_rank': s.river_rank, 'grid': s.grid, 'borders': s.borders,
	        'geojson': s.geojson, 'select': sorted(s.select) if s.select else None, 'lang': s.lang, 'period_note': s.period_note,
	        'points': s.points}


def list_sources():
	print('Natural Earth layers (public domain):')
	for layer in ('ne_10m_land', 'ne_10m_coastline', 'ne_10m_lakes', 'ne_10m_rivers_lake_centerlines', 'ne_10m_admin_0_countries', 'ne_10m_admin_1_states_provinces'):
		p = next((d / layer / f'{layer}.shp' for d in NE_DIRS if (d / layer / f'{layer}.shp').exists()), None)
		print(f'  {layer:34s} {p or "— not found"}')
	print('Border GeoJSONs found (pass with --geojson; licence guessed for the known ones):')
	for d in BORDER_DIRS:
		for p in sorted(d.glob('*.geojson')):
			try:
				feats = json.load(open(p, encoding='utf-8')).get('features', [])
			except Exception:
				continue
			m = guess_geojson_meta(p, feats)
			print(f'  {str(p):90s} {len(feats):4d} features · {m["license"] or "licence UNKNOWN → --license"}' + (f' · {m["year"]}' if m['year'] is not None else ''))


def preview(data, path):
	"""raster check at 0.5 scale: sea, land, region outlines, coast, points, safe zone and fitbox."""
	from PIL import Image, ImageDraw
	sc = 0.5
	img = Image.new('RGB', (int(FRAME_W * sc), int(FRAME_H * sc)), (15, 34, 56))
	dr = ImageDraw.Draw(img)
	num = re.compile(r'[ML]|Z|-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?')

	def rings(d):
		cur = []
		for tok in num.findall(d or ''):
			if tok == 'M':
				if len(cur) > 1:
					yield cur, False
				cur = []
			elif tok == 'Z':
				if len(cur) > 1:
					yield cur, True
				cur = []
			elif tok != 'L':
				x, y = tok.split(',')
				cur.append((float(x) * sc, float(y) * sc))
		if len(cur) > 1:
			yield cur, False

	for r, closed in rings(data.get('graticule')):
		dr.line(r, fill=(40, 70, 100), width=1)
	for r, closed in rings(data.get('land')):
		if closed and len(r) > 2:
			dr.polygon(r, fill=(239, 227, 200))
	for r, closed in rings(data.get('lakes')):
		if closed and len(r) > 2:
			dr.polygon(r, fill=(15, 34, 56))
	for reg in data.get('regions', []):
		col = (200, 16, 46) if reg['src'] == 'geojson' else (140, 122, 91)
		for r, closed in rings(reg['d']):
			dr.line(r + ([r[0]] if closed else []), fill=col, width=1)
		cx, cy = reg['c']
		dr.text((cx * sc + 3, cy * sc), reg['id'], fill=col)
	for r, closed in rings(data.get('coast')):
		dr.line(r, fill=(18, 8, 24), width=1)
	for rv in data.get('rivers', []):
		for r, closed in rings(rv['d']):
			dr.line(r, fill=(42, 157, 143), width=1)
	for nm, p in data.get('points', {}).items():
		x, y = p['x'] * sc, p['y'] * sc
		dr.ellipse([x - 4, y - 4, x + 4, y + 4], fill=(255, 122, 31), outline=(18, 8, 24))
		dr.text((x + 6, y - 6), nm, fill=(255, 255, 255))
	s = [v * sc for v in SAFE]
	dr.rectangle(s, outline=(255, 200, 58), width=1)
	f = [v * sc for v in data['view']['fitbox']]
	dr.rectangle(f, outline=(42, 157, 143), width=1)
	Path(path).parent.mkdir(parents=True, exist_ok=True)
	img.save(path)
	return path


def main(argv):
	a = parse_args(argv)
	if a.list_sources:
		list_sources()
		return 0
	s = merge_spec(a)
	b = Builder(s)
	sources, period = [], {}
	data = {'version': 1, 'name': s.name, 'tool': 'tools/make_map.py', 'made': datetime.date.today().isoformat(),
	        'frame': [FRAME_W, FRAME_H], 'proj': b.proj.json(),
	        'view': {'focus': [round(b.focus[0], 1), round(b.focus[1], 1)], 'fitbox': s.fitbox, 'clip': [round(v, 1) for v in b.clip],
	                 'bbox': s.bbox, 'safe': list(SAFE), 'zoom_max': s.zoom_max},
	        'land': '', 'coast': '', 'lakes': '', 'graticule': '', 'rivers': [], 'regions': [], 'points': {}}
	phys = [l for l in ('land', 'coast', 'lakes', 'rivers') if l in s.layers]
	if 'land' in s.layers or 'coast' in s.layers:
		land, coast = b.land()
		data['land'] = land if 'land' in s.layers else ''
		data['coast'] = coast if 'coast' in s.layers else ''
	if 'lakes' in s.layers:
		data['lakes'] = b.lakes()
	if 'rivers' in s.layers:
		data['rivers'] = b.rivers()
	if 'graticule' in s.layers:
		data['graticule'] = b.graticule()
	if phys:
		sources.append({'what': ', '.join(phys), 'source': f'Natural Earth 10m physical (v{ne_version("ne_10m_land")})', 'license': NE_LICENSE, 'period': 'modern coastline'})
	regions = []
	if 'regions' in s.layers and s.borders == 'modern':
		regions += b.regions_ne()
		sources.append({'what': 'regions (admin-0 countries)', 'source': f'Natural Earth 10m admin-0 (v{ne_version("ne_10m_admin_0_countries")})', 'license': NE_LICENSE, 'period': 'modern (2020s borders)'})
	years = []
	for g in s.geojson:
		feats = json.load(open(g['file'], encoding='utf-8')).get('features', [])
		guess = guess_geojson_meta(Path(g['file']), feats)
		lic = g.get('license') or guess['license'] or 'UNKNOWN'
		src = g.get('source') or guess['source'] or Path(g['file']).name
		yr = int(g['year']) if g.get('year') not in (None, '') else guess['year']
		g.update(license=lic, source=src, year=yr)
		if yr is not None:
			years.append(yr)
		got = b.regions_geojson(g) if 'regions' in s.layers else []
		for e in got:
			e['year'] = yr
		regions += got
		sources.append({'what': f'regions ({Path(g["file"]).name}, {len(got)} in frame)', 'source': src, 'license': lic, 'period': str(yr) if yr is not None else 'unknown'})
	data['regions'] = regions
	data['points'] = b.points()
	has_ne = any(r['src'] == 'ne' for r in regions)
	has_gj = any(r['src'] == 'geojson' for r in regions)
	kind = 'mixed' if has_ne and has_gj else 'modern' if has_ne else 'historical' if has_gj else 'none'
	period = {'borders': kind, 'political': bool(regions), 'year': (min(years) if years else None),
	          'note': s.period_note or ('physical map (land and coast only)' if kind == 'none' else '')}
	if kind in ('modern', 'mixed'):
		period['warning'] = MODERN_WARNING
	data['period'] = period
	data['sources'] = sources
	out = Path(s.out)
	out.parent.mkdir(parents=True, exist_ok=True)
	txt = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
	out.write_text(txt, encoding='utf-8')
	spec_path = out.with_name(out.stem + '.spec.json')
	spec_path.write_text(json.dumps(spec_of(s), ensure_ascii=False, indent=1), encoding='utf-8')
	kb = len(txt.encode()) / 1024
	print(f'✓ {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}  {kb:.0f} KB · proj {s.proj} k={b.proj.k:.1f} · '
	      + ' · '.join(f'{k} {v}' for k, v in b.stats.items()) + f' · regions {len(regions)} · points {len(data["points"])}')
	print(f'  borders: {kind}' + (f' (year {period["year"]})' if period['year'] is not None else '') + (f' — ! {MODERN_WARNING}' if kind in ('modern', 'mixed') else ''))
	for src in sources:
		print(f'  source: {src["what"]} — {src["source"]} — {src["license"]}')
		if src['license'] == 'UNKNOWN':
			print('  ! licence UNKNOWN: pass --license "…" after that --geojson (tools/map_check.py warns otherwise)')
	if kb > 700:
		print(f'  ! {kb:.0f} KB is heavy for the bundle: raise --eps, lower --zoom-max / --pad, or --select fewer regions')
	for nm, p in data['points'].items():
		x, y = p['x'], p['y']
		where = 'inside the safe zone' if SAFE[0] <= x <= SAFE[2] and SAFE[1] <= y <= SAFE[3] else 'outside the safe zone at zoom 1 (frame it with MapCamera)'
		print(f'  point {nm}: ({x:.0f}, {y:.0f}) {where}')
	if s.preview is not None:
		pv = s.preview or str(ROOT / 'out/maps' / f'{s.name}_preview.png')
		print(f'  preview → {preview(data, pv)}')
	return 0


if __name__ == '__main__':
	sys.exit(main(sys.argv[1:]))
