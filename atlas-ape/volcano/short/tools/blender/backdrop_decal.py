"""Wide toon backdrop around a toon decal, for the globe dives (GlobeHop.tsx Dest.toon.bg).

The Blender decal (hawaii_decal.py / iceland_decal.py) only covers its terrain grid. Outside it the dive used to show a constant
sea, so the neighbour islands (Maui, Molokai, Lanai, Kahoolawe, Oahu, Kauai) or the rest of Iceland vanished while the toon
look took over. This paints the land around it in the decal's own toon style from Natural Earth 10 m land (public domain,
~/shorts/berlin-1945/data/raw/ne_10m_land): every pixel gets the decal's most frequent colour at the same signed distance from
the coast (deep sea → shallow band → surf line → coastal land → inland), measured on the decal itself, so the bands match.
The backdrop is Web-Mercator-linear over BOX (lat/lon), north up; far from land it is exactly the decal's deep-sea colour (=
GlobeHop's uToonSea outside the backdrop).
For Iceland the coast inside the heimaey_wide box is taken from heimaey_prep's smooth mask (wide_land.png, the coast Blender
draws), morphing to the Natural Earth coast at the box edge, so the decal's feathered edge (GlobeHop fe) blends matching coasts.
Iceland's LAND (night fix round 19.10: it was a flat purple/green blob) is painted from real relief in Iceland A's own toon rules:
AWS Terrain Tiles zoom 6 (~1 km; cached PNGs, see CFG relief.tiles) + the heimaey_wide DEM inside the box → iceland_a.py's
WRAMP altitude colours (±80 m wobble), glaciers ≥ 1150 m, and the moonlit light bands under its key light (relief ×2.6 so the
highland edges, fjords and volcanoes read); the sea gets a shallow band + surf line visible at the dive's scale.
  python3 tools/blender/backdrop_decal.py hawaii|iceland   → public/blender/<dest>_backdrop.jpg (+ out/blender/<dest>_backdrop.json)
  (iceland also converts out/blender/iceland_decal/decal.png → public/blender/iceland_decal.jpg)"""
import json, math, struct, sys
from pathlib import Path
import numpy as np
import cv2
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
NE = Path.home() / 'shorts/berlin-1945/data/raw/ne_10m_land/ne_10m_land.shp'
CFG = {
	# BOX = (lat_s, lat_n, lon_w, lon_e) — GlobeHop.tsx DESTS[…].toon.bg.box must be the same numbers
	'hawaii': dict(box=(18.3, 22.7, -160.8, -154.2), decal='public/blender/hawaii_decal.jpg', region='hawaii', margin=0.08, W=4096),
	'iceland': dict(box=(62.9, 67.0, -25.5, -12.5), decal='out/blender/iceland_decal/decal.png', region='heimaey_wide', margin=0.0, W=4096,
	                own_coast='data/blender/heimaey/wide_land.png', morph_km=4.6,
	                # night fix round 19.10 («the backdrop is a flat purple/green blob»): the land is painted from real relief in Iceland A's
	                # own toon rules (iceland_a.py WRAMP altitude colours + moonlit NIGHT_BAND light bands under its key light): AWS Terrain
	                # Tiles zoom 6 (~1 km, the same public dataset as heimaey_wide), the heimaey_wide DEM inside the decal box
	                relief=dict(tiles=str(Path.home() / 'shorts/barbarossa-1941-v2/data/dl/terrarium/6'), z=6, ex=2.6, blur_km=1.3),
	                # highlands: violet as the decal's high ground (iceland_a.py wide ramp ≥ ~480 m); outside the box from the globe's
	                # snow cover (public/globe/day.jpg, winter: the snow line ≈ the highland edge), inside from the heimaey_wide DEM
	                highland=dict(alt=(380.0, 580.0), inset_km=2.5, blur_km=6.0, min_km2=250.0)),
}
mercX = lambda lon: (lon + 180) / 360
mercY = lambda lat: 0.5 - math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)) / (2 * math.pi)
KM_MERC = 40075.017     # km per mercator unit at the equator


def ne_rings(box):
	"""all Natural Earth land rings whose bbox meets box (lat_s, lat_n, lon_w, lon_e), as (lon, lat) arrays"""
	s, n, w, e = box
	d = NE.read_bytes()
	pos, rings = 100, []
	while pos < len(d):
		_, clen = struct.unpack('>ii', d[pos:pos + 8]); pos += 8
		rec = d[pos:pos + clen * 2]; pos += clen * 2
		if struct.unpack('<i', rec[:4])[0] != 5: continue
		x0, y0, x1, y1 = struct.unpack('<4d', rec[4:36])
		if x1 < w or x0 > e or y1 < s or y0 > n: continue
		npart, npt = struct.unpack('<ii', rec[36:44])
		parts = list(struct.unpack('<%di' % npart, rec[44:44 + 4 * npart])) + [npt]
		pts = np.frombuffer(rec[44 + 4 * npart:44 + 4 * npart + 16 * npt], '<f8').reshape(-1, 2)
		for a, b in zip(parts[:-1], parts[1:]):
			r = pts[a:b]
			if r[:, 0].max() < w or r[:, 0].min() > e or r[:, 1].max() < s or r[:, 1].min() > n: continue
			rings.append(r)
	return rings


# ---- Iceland A's toon rules (keep in sync with tools/blender/iceland_a.py): display colours on FLAT ground by altitude (WRAMP, on
# altitude/1600 with a ±80 m wobble), glaciers, and the moonlit light bands (shadow / middle / lit) relative to the middle band
WRAMP = [(0.0, '#42a07a'), (0.06, '#348e6c'), (0.22, '#2a806a'), (0.38, '#8682c8'), (0.6, '#a29edc')]
GLACIER = ('#e6ecff', 1150.0)
NIGHT_BAND = ('#7a72c8', '#c2c8f4', '#e6ecff')
KEY_L = np.array([-0.779, -0.284, 0.559])        # toward iceland_a.py's key light (rotation 56°, 0, −70°): from the WSW, 34° up
def lin(h):
	c = np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)])
	return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def disp(c):
	c = np.clip(c, 0, 1)
	return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055) * 255


def terrarium(tiles, z, X0, X1, Y0, Y1, W, H):
	"""heights (m) of the AWS terrarium tiles (zoom z, cached PNGs tiles/x/y.png) resampled onto a Web-Mercator-linear W × H grid"""
	n = 2 ** z
	tx0, tx1 = int(math.floor(X0 * n)), int(math.floor(X1 * n))
	ty0, ty1 = int(math.floor(Y0 * n)), int(math.floor(Y1 * n))
	rows = []
	for ty in range(ty0, ty1 + 1):
		row = []
		for tx in range(tx0, tx1 + 1):
			a = np.asarray(Image.open(f'{tiles}/{tx}/{ty}.png').convert('RGB')).astype(np.float64)
			row.append(a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768)
		rows.append(np.hstack(row))
	M = np.vstack(rows).astype(np.float32)
	xs = ((X0 + (np.arange(W) + 0.5) / W * (X1 - X0)) * n - tx0) * 256 - 0.5
	ys = ((Y0 + (np.arange(H) + 0.5) / H * (Y1 - Y0)) * n - ty0) * 256 - 0.5
	mx_, my_ = np.meshgrid(xs.astype(np.float32), ys.astype(np.float32))
	return cv2.remap(M, mx_, my_, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def main(name):
	C = CFG[name]
	s, n, w, e = C['box']
	X0, X1, Y0, Y1 = mercX(w), mercX(e), mercY(n), mercY(s)
	Wd = C['W']; Hd = int(round(Wd * (Y1 - Y0) / (X1 - X0)))
	SS = 2                                   # paint at 2× and downsample (anti-aliased band edges)
	Ws, Hs = Wd * SS, Hd * SS
	# km per (supersampled) pixel, per row (Mercator scale = cos(lat))
	rows_y = Y0 + (np.arange(Hs) + 0.5) / Hs * (Y1 - Y0)
	lat_r = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * rows_y))))
	kmpx = ((X1 - X0) / Ws * KM_MERC * np.cos(np.radians(lat_r))).astype(np.float32)
	# ---- land mask from Natural Earth (rings XOR-filled: holes cut out)
	land = np.zeros((Hs, Ws), np.uint8)
	for r in ne_rings(C['box']):
		px = (np.array([mercX(v) for v in r[:, 0]]) - X0) / (X1 - X0) * Ws
		py = (np.array([mercY(v) for v in r[:, 1]]) - Y0) / (Y1 - Y0) * Hs
		m = np.zeros_like(land)
		cv2.fillPoly(m, [np.round(np.stack([px, py], -1) * 16).astype(np.int32)], 1, lineType=cv2.LINE_8, shift=4)
		land ^= m
	def sdf(mask):
		"""signed distance to the coast in km (+ in the sea, − on land)"""
		ds = cv2.distanceTransform((mask == 0).astype(np.uint8), cv2.DIST_L2, 5)     # sea pixels: distance to land
		dl = cv2.distanceTransform((mask > 0).astype(np.uint8), cv2.DIST_L2, 5)      # land pixels: distance to sea
		return ((ds - dl) * kmpx[:, None]).astype(np.float32)
	D = sdf(land)
	# ---- the decal (display colours) and its own signed coast distance
	dec = np.asarray(Image.open(ROOT / C['decal']).convert('RGB'))
	if name == 'iceland':
		Image.fromarray(dec).save(ROOT / 'public/blender/iceland_decal.jpg', quality=92, subsampling=0)
	mr = json.load(open(ROOT / f'public/terrain/{C["region"]}/meta.json'))['mercator']
	mg = C['margin']
	bx0, bx1 = mr['x0'] - mg * (mr['x1'] - mr['x0']), mr['x1'] + mg * (mr['x1'] - mr['x0'])
	by0, by1 = mr['y0'] - mg * (mr['y1'] - mr['y0']), mr['y1'] + mg * (mr['y1'] - mr['y0'])
	f = dec.astype(np.float32) / 255
	sea_d = ((f[..., 1] - f[..., 0]) > 0.18) & (f[..., 2] > f[..., 1])
	sea_d = cv2.morphologyEx(sea_d.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))   # boats / specks are not land
	dlat = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * (by0 + (np.arange(dec.shape[0]) + 0.5) / dec.shape[0] * (by1 - by0))))))
	dkm = (bx1 - bx0) / dec.shape[1] * KM_MERC * np.cos(np.radians(dlat))
	Dd = (cv2.distanceTransform(sea_d, cv2.DIST_L2, 5) - cv2.distanceTransform(1 - sea_d, cv2.DIST_L2, 5)) * dkm[:, None]
	# ---- colour profile: the decal's most frequent colour per signed-distance bin (±2 bins pooled → no stripes)
	BIN = 0.08
	lo, hi = -14.0, 14.0
	nb = int((hi - lo) / BIN)
	bi = np.clip(((Dd - lo) / BIN).astype(int), 0, nb - 1).ravel()
	q = (dec // 8).astype(np.int32)
	qi = (q[..., 0] * 1024 + q[..., 1] * 32 + q[..., 2]).ravel()
	# only pixels well inside the decal box (its outer rim may be cut terrain)
	keep = np.zeros(dec.shape[:2], bool); bd = int(0.04 * min(dec.shape[:2])); keep[bd:-bd, bd:-bd] = True
	keep = keep.ravel()
	order = np.argsort(bi[keep], kind='stable')
	bk, qk, ck = bi[keep][order], qi[keep][order], dec.reshape(-1, 3)[keep][order].astype(np.float64)
	starts = np.searchsorted(bk, np.arange(nb + 1))
	prof = np.zeros((nb, 3))
	valid = np.zeros(nb, bool)
	# the deep sea: the most frequent colour of the decal's open sea (farther than 60 % of its largest coast distance)
	fs_ = (Dd > 0.6 * Dd.max()).ravel()
	vals, cnt = np.unique(qi[fs_], return_counts=True)
	deep = dec.reshape(-1, 3)[fs_][qi[fs_] == vals[cnt.argmax()]].astype(np.float64).mean(0)
	for b in range(nb):
		a0, a1 = starts[max(0, b - 2)], starts[min(nb, b + 3)]
		if a1 - a0 < 200: continue
		vals, cnt = np.unique(qk[a0:a1], return_counts=True)
		top = vals[cnt.argmax()]
		prof[b] = ck[a0:a1][qk[a0:a1] == top].mean(0)
		valid[b] = True
	# sea bins without samples (farther out than the decal reaches): the deep sea; land bins: the nearest measured land colour
	mid = lo + (np.arange(nb) + 0.5) * BIN
	vl = np.nonzero(valid & (mid < 0))[0]
	for b in range(nb):
		if valid[b]: continue
		prof[b] = deep if mid[b] >= 0 else prof[vl[np.abs(vl - b).argmin()]]
	# far sea = exactly the deep colour (GlobeHop's uToonSea outside the backdrop)
	prof[(mid > 0) & (np.abs(prof - deep).max(1) < 6)] = deep
	prof = np.clip(np.round(prof), 0, 255).astype(np.uint8)
	# interior: beyond L0 inland the decal's mix of zones would draw rings that follow the coast → one colour, its most frequent
	# green (and, for the Iceland highlands, its most frequent violet)
	L0 = 2.0
	fl = dec.reshape(-1, 3).astype(np.float32) / 255
	inl = (Dd < -L0).ravel() & keep
	def mode_of(mk):
		vals, cnt = np.unique(qi[mk], return_counts=True)
		return np.round(dec.reshape(-1, 3)[mk][qi[mk] == vals[cnt.argmax()]].astype(np.float64).mean(0)).astype(np.uint8)
	green = mode_of(inl & (fl[:, 1] > fl[:, 2]))
	violet = mode_of(inl & (fl[:, 2] > fl[:, 1] + 0.06)) if C.get('highland') else None
	print(name, 'interior green', '%02x%02x%02x' % tuple(green), 'violet', None if violet is None else '%02x%02x%02x' % tuple(violet))
	print(name, 'profile (km: rgb):', ' '.join(f'{mid[b]:.2f}:{"%02x%02x%02x" % tuple(int(v) for v in prof[b])}' for b in range(0, nb, 5) if abs(mid[b]) < 6))
	# ---- own coast inside the decal box (Iceland): heimaey_prep's smooth mask, morphing to Natural Earth at the box edge
	if C.get('own_coast'):
		wl = np.asarray(Image.open(ROOT / C['own_coast']).convert('L')).astype(np.float32) / 255
		# window: the box + 20 km (distances near the window edge are not needed: the weight is 0 at the box edge)
		padx = 20 / (KM_MERC * math.cos(math.radians((s + n) / 2))) / (X1 - X0) * Ws
		i0 = max(0, int((mr['x0'] - X0) / (X1 - X0) * Ws - padx)); i1 = min(Ws, int((mr['x1'] - X0) / (X1 - X0) * Ws + padx) + 1)
		j0 = max(0, int((mr['y0'] - Y0) / (Y1 - Y0) * Hs - padx)); j1 = min(Hs, int((mr['y1'] - Y0) / (Y1 - Y0) * Hs + padx) + 1)
		cols = X0 + (np.arange(i0, i1) + 0.5) / Ws * (X1 - X0)
		u = ((cols - mr['x0']) / (mr['x1'] - mr['x0'])).astype(np.float32)
		v = ((rows_y[j0:j1] - mr['y0']) / (mr['y1'] - mr['y0'])).astype(np.float32)
		uu, vv = np.meshgrid(u, v)
		inb = (uu > 0) & (uu < 1) & (vv > 0) & (vv < 1)
		wls = cv2.remap(wl, uu * wl.shape[1] - 0.5, vv * wl.shape[0] - 0.5, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
		own = np.where(inb, wls > 0.5, land[j0:j1, i0:i1] > 0).astype(np.uint8)
		ko = kmpx[j0:j1, None]
		Do = (cv2.distanceTransform((own == 0).astype(np.uint8), cv2.DIST_L2, 5) - cv2.distanceTransform(own, cv2.DIST_L2, 5)) * ko
		# distance inside the box from its edge (km) → weight 1 at ≥ morph_km, 0 at the edge
		ein = np.minimum(np.minimum(uu, 1 - uu) * (mr['x1'] - mr['x0']), np.minimum(vv, 1 - vv) * (mr['y1'] - mr['y0'])) * KM_MERC * np.cos(np.radians(lat_r[j0:j1]))[:, None]
		wgt = np.where(inb, np.clip(ein / C['morph_km'], 0, 1), 0).astype(np.float32)
		wgt = wgt * wgt * (3 - 2 * wgt)
		D[j0:j1, i0:i1] = D[j0:j1, i0:i1] * (1 - wgt) + Do * wgt
	# ---- land painted from real relief in Iceland A's toon rules (night fix round 19.10)
	LAND = None
	if C.get('relief'):
		rc = C['relief']
		Hr = terrarium(rc['tiles'], rc['z'], X0, X1, Y0, Y1, Wd, Hd)
		if C.get('own_coast'):
			# inside the heimaey_wide box its own 100 m DEM (what the decal is rendered from), morphing at the box edge
			mwm = json.load(open(ROOT / f'public/terrain/{C["region"]}/meta.json'))
			Hw = np.fromfile(ROOT / f'public/terrain/{C["region"]}/height.bin', np.float32).reshape(mwm['ny'], mwm['nx'])
			hw = cv2.remap(Hw, uu * (mwm['nx'] - 1), vv * (mwm['ny'] - 1), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
			full = cv2.resize(Hr, (Ws, Hs), interpolation=cv2.INTER_CUBIC)
			full[j0:j1, i0:i1] = full[j0:j1, i0:i1] * (1 - wgt) + hw * wgt
			Hr = cv2.resize(full, (Wd, Hd), interpolation=cv2.INTER_AREA)
		kb = (X1 - X0) / Wd * KM_MERC * math.cos(math.radians((s + n) / 2))         # km per (1×) pixel
		Hb = cv2.GaussianBlur(np.maximum(Hr, 0), (0, 0), rc['blur_km'] / kb)
		# light bands: Iceland A's flat ground sits in the middle band; slopes toward the key light (≳ 12°) are lit, slopes away
		# (≳ 10°) in shadow — relief exaggerated ×ex so the ~1 km DEM shows the highland edges, valleys and volcanoes
		kmr = ((X1 - X0) / Wd * KM_MERC * np.cos(np.radians(lat_r[::SS]))).astype(np.float32)[:Hd, None] * 1000
		gx = np.gradient(Hb, axis=1) / kmr * 1.35 * rc['ex']
		gy = -np.gradient(Hb, axis=0) / kmr * 1.35 * rc['ex']            # rows run south → north-gradient is minus the row gradient
		nl = (-gx * KEY_L[0] - gy * KEY_L[1] + KEY_L[2]) / np.sqrt(gx * gx + gy * gy + 1)
		# altitude for the colour ramp with a ±80 m wobble (as the wide material's noise, ~3 km features)
		rng = np.random.default_rng(3)
		cell = max(2, int(round(3.0 / kb)))
		nz = rng.random((Hd // cell + 3, Wd // cell + 3)).astype(np.float32)
		nz = cv2.resize(nz, ((Wd // cell + 3) * cell, (Hd // cell + 3) * cell), interpolation=cv2.INTER_CUBIC)[:Hd, :Wd]
		alt = Hb + (nz - 0.5) * 160
		up = lambda a: cv2.resize(a.astype(np.float32), (Ws, Hs), interpolation=cv2.INTER_LINEAR)
		alt2, nl2 = up(alt), up(nl)
		mid = lin(NIGHT_BAND[1])
		bands = [lin(h) / mid for h in NIGHT_BAND]
		LAND = np.zeros((Hs, Ws, 3), np.uint8)
		band_i = np.where(nl2 >= 0.72, 2, np.where(nl2 < 0.4, 0, 1))
		cls = np.zeros((Hs, Ws), np.int8)
		for k, (p_, _) in enumerate(WRAMP):
			cls[alt2 / 1600 >= p_] = k
		cls[alt2 >= GLACIER[1]] = len(WRAMP)
		cols = [h for _, h in WRAMP] + [GLACIER[0]]
		for k, h in enumerate(cols):
			for b in range(3):
				m = (cls == k) & (band_i == b)
				if m.any(): LAND[m] = np.round(disp(lin(h) * bands[b])).astype(np.uint8)
		print(name, 'relief: km/px %.2f, lit %.0f %% shadow %.0f %% of the land' % (kb, 100 * (band_i[D < 0] == 2).mean(), 100 * (band_i[D < 0] == 0).mean()))
	# ---- highland field (0..1, thresholded at 0.5)
	HL = None
	if C.get('highland') and LAND is None:
		hc = C['highland']
		Image.MAX_IMAGE_PIXELS = None
		day = np.asarray(Image.open(ROOT / 'public/globe/day.jpg').convert('RGB')).astype(np.float32) / 255
		lum = 0.3 * day[..., 0] + 0.59 * day[..., 1] + 0.11 * day[..., 2]
		sat = day.max(-1) - day.min(-1)
		snow = (np.clip((lum - 0.42) / 0.18, 0, 1) * np.clip((0.22 - sat) / 0.1, 0, 1)).astype(np.float32)
		rb = Y0 + (np.arange(Hd) + 0.5) / Hd * (Y1 - Y0)
		latb = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * rb))))
		lonb = (X0 + (np.arange(Wd) + 0.5) / Wd * (X1 - X0)) * 360 - 180
		LO, LA = np.meshgrid(lonb.astype(np.float32), latb.astype(np.float32))
		HB = cv2.remap(snow, (LO + 180) / 360 * day.shape[1] - 0.5, (90 - LA) / 180 * day.shape[0] - 0.5, cv2.INTER_LINEAR)
		kb = (X1 - X0) / Wd * KM_MERC * math.cos(math.radians((s + n) / 2))
		HB = cv2.GaussianBlur(HB, (0, 0), hc['blur_km'] / kb)
		HL = cv2.resize(HB, (Ws, Hs), interpolation=cv2.INTER_LINEAR)
		if C.get('own_coast'):
			mwm = json.load(open(ROOT / f'public/terrain/{C["region"]}/meta.json'))
			Hw = np.fromfile(ROOT / f'public/terrain/{C["region"]}/height.bin', np.float32).reshape(mwm['ny'], mwm['nx'])
			hw = cv2.remap(Hw, uu * (mwm['nx'] - 1), vv * (mwm['ny'] - 1), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
			a0_, a1_ = hc['alt']
			fin = np.clip((hw - a0_) / (a1_ - a0_), 0, 1)
			HL[j0:j1, i0:i1] = HL[j0:j1, i0:i1] * (1 - wgt) + fin * wgt
	# ---- paint (2×, then area-downsampled: anti-aliased band edges)
	idx = np.clip(((D - lo) / BIN).astype(int), 0, nb - 1)
	img = prof[idx]
	if LAND is not None:
		# the land in the relief colours right up to the coast; the sea keeps the decal's measured bands, plus a visible shallow
		# band and surf line at the dive's scale (the decal's own are 0.1–0.5 km: sub-pixel while all Iceland is on screen)
		img[D < 0] = LAND[D < 0]
		sh = (D >= 0) & (D < C['relief'].get('shallow_km', 1.3)); fo = (D >= 0) & (D < C['relief'].get('foam_km', 0.35))
		img[sh] = np.array([0x14, 0x70, 0xb6], np.uint8); img[fo] = np.array([0x3c, 0x88, 0xc8], np.uint8)
	else:
		img[D < -L0] = green
	if HL is not None:
		# clean toon shapes: no violet specks in the lowlands, no green holes in the highlands (< min_km2)
		hi = ((HL > 0.5) & (D < -C['highland']['inset_km'])).astype(np.uint8)
		amin = C['highland']['min_km2'] / float(np.median(kmpx)) ** 2
		for val in (1, 0):
			msk = (hi == val).astype(np.uint8)
			nc, lab, st, _ = cv2.connectedComponentsWithStats(msk, connectivity=8)
			small = np.nonzero(st[:, cv2.CC_STAT_AREA] < amin)[0]
			small = small[small > 0]
			if len(small): hi[np.isin(lab, small) & (msk > 0)] = 1 - val
		hi &= (D < -C['highland']['inset_km'])
		img[hi > 0] = violet
	img = cv2.resize(img, (Wd, Hd), interpolation=cv2.INTER_AREA)
	out = ROOT / f'public/blender/{name}_backdrop.jpg'
	Image.fromarray(img).save(out, quality=92, subsampling=0)
	info = {'box_lat_s_n_lon_w_e': C['box'], 'mercator': {'x0': X0, 'y0': Y0, 'x1': X1, 'y1': Y1}, 'w': Wd, 'h': Hd,
	        'deep_srgb': [float(x) for x in deep], 'deep_linear': [float(((x / 255 + 0.055) / 1.055) ** 2.4 if x / 255 > 0.04045 else x / 255 / 12.92) for x in deep],
	        'decal_box_mercator': [bx0, by0, bx1, by1]}
	(ROOT / 'out/blender').mkdir(parents=True, exist_ok=True)
	json.dump(info, open(ROOT / f'out/blender/{name}_backdrop.json', 'w'), indent=1)
	print(name, '→', out, Wd, Hd, 'deep', info['deep_srgb'], 'linear', ['%.4f' % x for x in info['deep_linear']])


if __name__ == '__main__':
	for nm in (sys.argv[1:] or ['hawaii', 'iceland']):
		main(nm)
