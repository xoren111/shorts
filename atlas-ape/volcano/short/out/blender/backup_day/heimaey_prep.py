"""Heimaey data for the Blender toon shots (system python: numpy, scipy, PIL) → data/blender/heimaey/
  - h_mod.npy   : the real relief (public/terrain/heimaey/height.bin, metres; today's island incl. the 1973 field + Eldfell)
  - h_pre.npy   : the island BEFORE 23 Jan 1973: inside the real 1973 field outline (lava.png R < 0.99) the ground east of the
                  pre-1973 coast (flows.json pre_1973_coast) is sea (−6 m), the rest is a harmonic (Laplace) fill of the
                  surrounding real ground — no Eldfell cone, no new land. The shot grows h_pre → h_mod where the lava arrives.
  - arr.npy     : lava arrival R at the grid vertices (0 vent … 0.99 = none)
  - cone.npy    : Eldfell footprint weight (1 at the crater … 0 at the cone foot), for the slower cone growth
  - land_pre.png: 4096 × 4006 land mask (land.png minus the sea that the 1973 lava later filled)
  - coast.png   : distance from the pre-1973 land, decimetres (16-bit PNG) → the shallow-water bands of the toon sea
  - zones.png   : smoothed land-cover fields from the EOX mosaic (R grass, G built-up, B red cinder) — thresholded in the shader
  - houses.json : one stylized house per roof blob of the mosaic (outside the 1973 field), km in the Blender frame
  - wide_zones.png, wide_coast.png : the same for heimaey_wide (mainland: grass / dark sand / snow)
  - wide_land.png : smooth 4× land mask of heimaey_wide (cubic-upsampled 100 m DEM, blurred): the toon shader draws the mainland
                    and the other islands' coastlines from it (the 100 m mesh alone gave stair-stepped coasts in the globe dive)
  python3 tools/blender/heimaey_prep.py [--wide]   (--wide: only the heimaey_wide outputs)"""
import json, math, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd
from scipy.sparse import lil_matrix
from scipy.sparse.linalg import spsolve

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'data/blender/heimaey'
OUT.mkdir(parents=True, exist_ok=True)
T = ROOT / 'public/terrain/heimaey'
meta = json.load(open(T / 'meta.json'))
nx, ny = meta['nx'], meta['ny']
WK, HK = meta['width_m'] / 1000, meta['height_m'] / 1000
mx = meta['mercator']
F = json.load(open(ROOT / 'data/flows.json'))['eldfell_1973']

def merc(lat, lon):
	x = (lon + 180) / 360
	y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2
	return x, y
def uvof(lat, lon):
	x, y = merc(lat, lon)
	return (x - mx['x0']) / (mx['x1'] - mx['x0']), (y - mx['y0']) / (mx['y1'] - mx['y0'])

WIDE_ONLY = '--wide' in sys.argv
def blur(m, s):
	return nd.gaussian_filter(m.astype(np.float32), s)
if not WIDE_ONLY:
	H = np.fromfile(T / 'height.bin', np.float32).reshape(ny, nx).astype(np.float64)
	lava = np.asarray(Image.open(T / 'lava.png')).astype(np.float32) / 255
	land = np.asarray(Image.open(T / 'land.png')).astype(np.float32) / 255
	LH, LW = land.shape
	R4 = lava[..., 0]

	# ---- the old coast: field pixels east of the pre-1973 shoreline were sea
	def poly_mask(pts_ll, w, h):
		img = Image.new('L', (w, h), 0)
		ImageDraw.Draw(img).polygon([(uvof(a, b)[0] * (w - 1), uvof(a, b)[1] * (h - 1)) for a, b in pts_ll], fill=255)
		return np.asarray(img) > 127
	coast = F['pre_1973_coast']
	# close the polyline far to the east (north end → NE → SE → south end)
	sea_poly = coast + [[coast[-1][0] - 0.01, coast[-1][1]], [coast[-1][0] - 0.01, -20.18], [coast[0][0] + 0.012, -20.18], [coast[0][0] + 0.012, coast[0][1]]]
	field4 = R4 < 0.99
	seaold4 = poly_mask(sea_poly, LW, LH)
	# the field's own pre-1973 sea = field ∩ east of the old coast; also the bit of harbour channel the lava later narrowed
	newsea4 = nd.binary_dilation(field4, iterations=3) & seaold4
	# slivers of today's lava coast just outside the (approximate) outline: low new land east of the old shore → sea as well
	Hup = np.asarray(Image.fromarray(H.astype(np.float32)).resize((LW, LH), Image.BILINEAR))
	sliver4 = nd.binary_dilation(field4, iterations=30) & seaold4 & ~field4 & (Hup < 25)
	newsea4 |= sliver4
	land_pre = land * (1 - newsea4)
	Image.fromarray((np.clip(land_pre, 0, 1) * 255).astype(np.uint8)).save(OUT / 'land_pre.png')
	dist = nd.distance_transform_edt(land_pre < 0.5) * (meta['width_m'] / (LW - 1))
	Image.fromarray(np.clip(dist * 10, 0, 65535).astype(np.uint16)).save(OUT / 'coast.png')      # decimetres (16 bit)

	# ---- grid-resolution masks
	def to_grid(a):
		return np.asarray(Image.fromarray(a.astype(np.float32)).resize((nx, ny), Image.BILINEAR), np.float64)
	Rg = to_grid(R4)
	fieldg = to_grid(field4.astype(np.float32)) > 0.02
	fieldg = nd.binary_dilation(fieldg, iterations=2)
	seag = to_grid(newsea4.astype(np.float32)) > 0.5
	slg = (to_grid(sliver4.astype(np.float32)) > 0.3) & ~fieldg
	H[slg] = -6.0
	# ---- harmonic fill of the old land inside the field (Dirichlet: real ground outside, −6 m in the old sea)
	Hpre = H.copy()
	Hpre[seag] = -6.0
	unk = fieldg & ~seag
	idx = -np.ones(H.shape, np.int64); ii = np.argwhere(unk); idx[unk] = np.arange(len(ii))
	n = len(ii)
	A = lil_matrix((n, n)); b = np.zeros(n)
	for k, (j, i) in enumerate(ii):
		A[k, k] = 4
		for dj, di in ((1, 0), (-1, 0), (0, 1), (0, -1)):
			jj, i2 = j + dj, i + di
			if idx[jj, i2] >= 0: A[k, idx[jj, i2]] = -1
			else: b[k] += Hpre[jj, i2]
	x = spsolve(A.tocsr(), b)
	Hpre[unk] = x
	# a gentle 4-cell blur only inside the field (no seam at the outline)
	bl = nd.gaussian_filter(Hpre, 2.0)
	wgt = nd.gaussian_filter(fieldg.astype(np.float64), 1.5)
	Hpre = Hpre * (1 - wgt * fieldg) + bl * (wgt * fieldg)
	Hpre[~fieldg] = H[~fieldg]
	np.save(OUT / 'h_mod.npy', H.astype(np.float32))
	np.save(OUT / 'h_pre.npy', Hpre.astype(np.float32))
	Rg[~fieldg] = 1.0
	np.save(OUT / 'arr.npy', Rg.astype(np.float32))
	# ---- Eldfell footprint (cone weight) around the crater
	cu, cv = uvof(*F['crater'])
	yy, xx = np.mgrid[0:ny, 0:nx]
	dkm = np.hypot((xx / (nx - 1) - cu) * WK, (yy / (ny - 1) - cv) * HK)
	cone = np.clip((0.40 - dkm) / 0.22, 0, 1)
	cone = cone * cone * (3 - 2 * cone) * fieldg
	np.save(OUT / 'cone.npy', cone.astype(np.float32))
	print('field cells', fieldg.sum(), 'old-sea cells', seag.sum(), 'fill', n,
	      'crater h_mod %.0f h_pre %.0f' % (H[int(cv * (ny - 1)), int(cu * (nx - 1))], Hpre[int(cv * (ny - 1)), int(cu * (nx - 1))]))

	# ---- story timing of the real field: the lava first spreads round the vent and east into the sea, then ONE tongue keeps going
	# north toward the harbour (Iceland.tsx: «Then the lava turns toward the harbor»). Same outline and the same arrival ORDER
	# along every lobe (lava.png R), only the clock of the non-harbour parts runs faster: A_eff = R · (0.62 + 0.38 · w_harbour).
	# w_harbour: 1 in the northern part of the field (the harbour side, north of ~63.4395 N), 0 in the south and east (smooth 250 m)
	yy4 = np.arange(LH, dtype=np.float32)[:, None]
	lat_px = uvof(63.4395, -20.25)[1] * (LH - 1)
	wh = np.clip((lat_px - yy4) / (250 / (meta['height_m'] / (LH - 1))) + 0.5, 0, 1)
	wh = np.broadcast_to(wh * wh * (3 - 2 * wh), R4.shape)
	Reff = np.where(R4 < 0.99, R4 * (0.62 + 0.38 * wh), 1.0)
	Image.fromarray(np.clip(Reff * 65535, 0, 65535).astype(np.uint16)).save(OUT / 'arr_eff.png')
	Rg2 = to_grid(Reff.astype(np.float32)); Rg2[~fieldg] = 1.0
	np.save(OUT / 'arr.npy', Rg2.astype(np.float32))
	print('A_eff: east lobe end %.2f, harbour tongue %.2f' % (Reff[int(uvof(63.4364, -20.2265)[1] * (LH - 1)), int(uvof(63.4364, -20.2265)[0] * (LW - 1))],
	      Reff[int(uvof(63.445, -20.2548)[1] * (LH - 1)), int(uvof(63.445, -20.2548)[0] * (LW - 1))]))

	# ---- main lava channels (flows.json lobe centrelines): distance in metres / 2 (8 bit) → warm, moving melt along them
	CW, CH = 2048, round(2048 * LH / LW)
	yy2, xx2 = np.mgrid[0:CH, 0:CW].astype(np.float64)
	best = np.full((CH, CW), 1e9)
	for nm in ('harbor_lobe', 'east_sea_lobe', 'south_lobe', 'town_lobe'):
		pts = np.array([(uvof(a, b)[0] * (CW - 1), uvof(a, b)[1] * (CH - 1)) for a, b in F['paths'][nm]])
		for k in range(len(pts) - 1):
			a_, b_ = pts[k], pts[k + 1]; d_ = b_ - a_; L2 = max(1e-9, d_ @ d_)
			u_ = np.clip(((xx2 - a_[0]) * d_[0] + (yy2 - a_[1]) * d_[1]) / L2, 0, 1)
			best = np.minimum(best, np.hypot(xx2 - a_[0] - u_ * d_[0], yy2 - a_[1] - u_ * d_[1]))
	best *= meta['width_m'] / (CW - 1)
	Image.fromarray(np.clip(best / 2, 0, 255).astype(np.uint8)).save(OUT / 'channel.png')

	# ---- land cover from the mosaic (outside the field; inside it the pre-1973 ground is pasture)
	sat = np.asarray(Image.open(T / 'sat.jpg').convert('RGB')).astype(np.float32) / 255
	SH, SW = sat.shape[:2]
	r, g, bb = sat[..., 0], sat[..., 1], sat[..., 2]
	lum = 0.3 * r + 0.59 * g + 0.11 * bb
	gr = g - np.maximum(r, bb)
	fieldS = np.asarray(Image.fromarray(field4.astype(np.uint8) * 255).resize((SW, SH), Image.NEAREST)) > 127
	landS = np.asarray(Image.fromarray((land * 255).astype(np.uint8)).resize((SW, SH), Image.BILINEAR)) > 127
	roof = ((lum > 0.40) | ((r - g > 0.05) & (r > 0.28) & (lum > 0.2))) & landS & ~fieldS
	grass = (gr > 0.012) & landS
	cinder = (r - g > 0.035) & (lum < 0.3) & (lum > 0.1) & landS & ~fieldS & ~roof
	# the red scoria along the 1973 fissure outside the field is from 1973 itself: not there before the eruption
	fa_, fb_ = [np.array([uvof(*p_)[0] * (SW - 1), uvof(*p_)[1] * (SH - 1)]) for p_ in F['fissure']]
	yyS, xxS = np.mgrid[0:SH, 0:SW].astype(np.float32)
	d_ = fb_ - fa_; u_ = np.clip(((xxS - fa_[0]) * d_[0] + (yyS - fa_[1]) * d_[1]) / (d_ @ d_), 0, 1)
	dfis = np.hypot(xxS - fa_[0] - u_ * d_[0], yyS - fa_[1] - u_ * d_[1]) * (meta['width_m'] / SW)
	cinder &= dfis > 110
	grass_fix = (dfis < 110) & landS & ~fieldS
	def blur(m, s):
		return nd.gaussian_filter(m.astype(np.float32), s)
	built = blur(roof, 9) > 0.12
	zones = np.stack([blur(grass | fieldS | grass_fix, 4), blur(built, 3), blur(cinder, 5), np.ones_like(lum)], -1)
	Image.fromarray((np.clip(zones, 0, 1) * 255).astype(np.uint8)).save(OUT / 'zones.png')
	# ---- houses: one per roof peak of the mosaic (bright / red roofs on the darker ground), inside the built-up zone
	hp = lum - nd.gaussian_filter(lum, 5)
	red = np.clip(r - g - 0.03, 0, 1)
	rf = nd.gaussian_filter(np.maximum(hp, red * 0.8), 0.8)
	cand = (lum > 0.30) | ((r - g > 0.05) & (r > 0.25))
	builtz = nd.gaussian_filter(cand.astype(np.float32), 10) > 0.10
	pk = (rf == nd.maximum_filter(rf, size=6)) & (rf > 0.03) & builtz & landS & ~fieldS
	ys, xs = np.nonzero(pk)
	# drop isolated peaks (a bright rock in a field): ≥ 3 other peaks within ~60 m
	cnt = nd.uniform_filter(pk.astype(np.float32), size=57) * 57 * 57
	keep = cnt[ys, xs] >= 4
	ys, xs = ys[keep], xs[keep]
	# local street direction: structure tensor of the roof field (houses stand along / across it)
	gy_, gx_ = np.gradient(nd.gaussian_filter(lum, 1.5))
	Jxx, Jyy, Jxy = (nd.gaussian_filter(q, 12) for q in (gx_ * gx_, gy_ * gy_, gx_ * gy_))
	mpp = meta['width_m'] / SW
	rng = np.random.default_rng(3)
	houses = []
	def add_house(u_, v_, ang, big=False):
		L = (9 + 5 * rng.random()) * (1.6 if big else 1.0); Wd = (7 + 4 * rng.random()) * (1.4 if big else 1.0)
		houses.append({'x': round((u_ - 0.5) * WK, 5), 'y': round((0.5 - v_) * HK, 5), 'u': round(float(u_), 6), 'v': round(float(v_), 6),
		               'l': round(L / 1000, 5), 'w': round(Wd / 1000, 5), 'a': round(float(ang), 3), 'big': bool(big),
		               'c': int(rng.integers(0, 6)), 'lit': bool(rng.random() < 0.75), 'h': round(float(rng.random()), 3)})
	for y_, x_ in zip(ys, xs):
		ang = 0.5 * math.atan2(2 * Jxy[y_, x_], Jxx[y_, x_] - Jyy[y_, x_])       # gradient direction (image axes)
		ang = -ang + (math.pi / 2 if rng.random() < 0.5 else 0)                      # north-up frame; long side along or across
		big = lum[y_, x_] > 0.62
		add_house(x_ / (SW - 1), y_ / (SH - 1), ang, big)
	nreal = len(houses)
	# the east part of the 1973 town (Austurbær) that the lava buried weeks later: today it is under the field, so the mosaic
	# has no roofs there. In the pre-eruption ground (old land inside the field, north of the cone) a jittered grid continues
	# the neighbouring town's density and street direction up to ~80 m from the old shore.
	oldland = to_grid((field4 & ~newsea4).astype(np.float32)) > 0.5
	lat_cut = uvof(63.4372, -20.26)[1]
	dsea = nd.distance_transform_edt(~seag) * (meta['width_m'] / (nx - 1))
	ang0 = -0.3                                         # rows of the neighbouring east town run ESE
	ca, sa = math.cos(ang0), math.sin(ang0)
	for gxk in np.arange(-1.2, 1.2, 0.026):
		for gyk in np.arange(-1.2, 1.2, 0.026):
			x_ = 0.25 + gxk * ca - gyk * sa + (rng.random() - 0.5) * 0.008
			y_ = 1.15 + gxk * sa + gyk * ca + (rng.random() - 0.5) * 0.008
			u_, v_ = x_ / WK + 0.5, 0.5 - y_ / HK
			if not (0 < u_ < 1 and 0 < v_ < 1) or v_ > lat_cut: continue
			j_, i_ = int(v_ * (ny - 1)), int(u_ * (nx - 1))
			if not oldland[j_, i_] or dsea[j_, i_] < 80 or rng.random() > 0.62: continue
			add_house(u_, v_, ang0 + (math.pi / 2 if rng.random() < 0.3 else 0))
	json.dump(houses, open(OUT / 'houses.json', 'w'))
	print('houses', nreal, 'from roofs +', len(houses) - nreal, 'old east town (pre-1973 ground)', 'grid angle %.2f' % ang0)

# ---- heimaey_wide: mainland land cover + coast distance
TW = ROOT / 'public/terrain/heimaey_wide'
mw = json.load(open(TW / 'meta.json'))
Hw = np.fromfile(TW / 'height.bin', np.float32).reshape(mw['ny'], mw['nx'])
sw = np.asarray(Image.open(TW / 'sat.jpg').convert('RGB')).astype(np.float32) / 255
r, g, bb = sw[..., 0], sw[..., 1], sw[..., 2]
lum = 0.3 * r + 0.59 * g + 0.11 * bb
gr = g - np.maximum(r, bb)
snow = (lum > 0.55) & (bb > 0.5)
grassw = (gr > 0.01) & (lum > 0.08)
sand = (lum < 0.2) & (np.abs(r - g) < 0.04) & (gr <= 0.01)
zw = np.stack([blur(grassw, 3), blur(sand, 3), blur(snow, 2), np.ones_like(lum)], -1)
Image.fromarray((np.clip(zw, 0, 1) * 255).astype(np.uint8)).save(OUT / 'wide_zones.png')
# smooth coast (fix round 18.10 night: the 100 m grid gave stair-stepped coasts in the dive): cubic-spline upsample of the DEM ×4
# (25 m), land = above 1.5 m, then a soft blur → smooth curves; wide_land.png keeps the blurred mask (thresholded at 0.5 in the
# shader, linear sampling → sub-texel smooth), wide_coast.png the distance to that land (metres, for the shallow-water bands)
# (the DEM is noisy near sea level: smoothed before the threshold, enclosed lagoons/wet sand filled — toon coast, no scallops)
UP = 4
Hf = nd.gaussian_filter(nd.zoom(Hw.astype(np.float64), UP, order=3), 2.5)
lb = nd.binary_fill_holes(Hf > 1.5)
# Heimaey itself is drawn from its own 2 m grid: the wide-grid copy of Heimaey (the blurred 70 m DEM pushes Stórhöfði ~300 m south
# of the heimaey box, which showed as a flat-topped «islet» cut by the box edge in the dive) is dropped. Only that one component
# (the one under the town): Bjarnarey / Elliðaey, which straddle the box edge, keep their outer parts
mwx = mw['mercator']
def wpx(lat, lon):
	X = (lon + 180) / 360; Y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2
	return int(round((Y - mwx['y0']) / (mwx['y1'] - mwx['y0']) * (lb.shape[0] - 1))), int(round((X - mwx['x0']) / (mwx['x1'] - mwx['x0']) * (lb.shape[1] - 1)))
lab, nlab = nd.label(lb)
k_h = lab[wpx(63.430, -20.27)]
if k_h > 0:
	lb[lab == k_h] = False
print('wide-grid copy of Heimaey dropped (component %d)' % k_h)
lf = blur(lb, 2.5)
Image.fromarray((np.clip(lf, 0, 1) * 255).astype(np.uint8)).save(OUT / 'wide_land.png')
lw = lf > 0.5
dw = nd.distance_transform_edt(~lw) * (mw['width_m'] / (lw.shape[1] - 1))
Image.fromarray(np.clip(dw, 0, 65535).astype(np.uint16)).save(OUT / 'wide_coast.png')   # metres (16 bit)
print('wide zones ok')
