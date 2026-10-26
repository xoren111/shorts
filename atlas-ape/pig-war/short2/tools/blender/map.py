"""«Pig War» 3D relief-map shots (real DEM, tools/geo_pnw.py → data/terrain/pnw):
--variant map       «Worse, both countries claimed the island.»  (words 39–44)
                    49th parallel draws in from the east (Worse → both), Union Jack pops on Vancouver Island («both»), Stars and
                    Stripes (33 stars) on the mainland by Bellingham («countries»), the two claim lines fork around the San Juan
                    Islands (blue US claim via Boundary Pass + Haro Strait, red British claim via Rosario Strait, «countries» →
                    «claimed»), San Juan Island is circled and pulses red ↔ blue from «the island».
--variant mapfinal  «The island went to America.»  (words 86–90) same map: on «island» the red line retracts, the blue line
                    turns solid and brighter, the San Juan Islands tint blue; on «America» a US flag pops onto San Juan Island.
Look: bright tabletop diorama — displaced land (×EXAG) coloured by height/slope, separate water surface coloured by depth with
a crisp white foam line from the coast signed-distance texture, glowing ink-outlined tubes (rebuilt per frame: dashes, growing
head, retract), 3D flag poles with waving cloth (yf2.flagmat2), yf2 sunset HDRI + sun, slow push-in.
  tools/blender/run.sh tools/blender/map.py -- --variant map [--frames 1,90,160] [--scale 40] [--samples 8] [--track]"""
import sys, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import *
import kit
import yf2
from yf2 import setup2, world2, sun2, pbr, flagmat2
from shots_t import SHOT

VAR = arg('variant', 'map')
T0, T1 = SHOT(VAR)
sc_ = setup2(T0, T1)
try:
	sc_.eevee.shadow_resolution_scale = 1.0
except Exception:
	pass

# ------------------------------------------------------------------ geo data (1 Blender unit = 1 km)
GEO = kit.ROOT / 'data/terrain/pnw'
GM = json.load(open(GEO / 'meta.json')); GL = json.load(open(GEO / 'lines.json'))
GN, GS, GW, GE = GM['N'], GM['S'], GM['W'], GM['E']
DLAT, DLON, NXg, NYg = GM['dlat'], GM['dlon'], GM['nx'], GM['ny']
KX, KY, LAT0, LON0 = GM['km_per_deg_lon'], GM['km_per_deg_lat'], GM['lat0'], GM['lon0']
HG = np.load(GEO / 'height.npy'); SG = np.load(GEO / 'sdf.npy').astype(np.float32)
EXAG = float(arg('exag', 3.2))      # height exaggeration
LIFT = 0.03                          # land plate rises 30 m over the water within one mesh cell of the coast (crisp edge)
STEP = int(arg('step', 2))           # mesh = every STEP-th DEM sample (≈ 37 m each)
CELL = 37.0 * STEP

def P(lat, lon, z=0.0): return Vector(((lon - LON0) * KX, (lat - LAT0) * KY, z))
def ll2xy(ll):
	ll = np.asarray(ll, float); return np.c_[(ll[:, 1] - LON0) * KX, (ll[:, 0] - LAT0) * KY]
def xy2rc(x, y): return (GN - (y / KY + LAT0)) / DLAT, (x / KX + LON0 - GW) / DLON
def bil(a, r, c):
	r = np.clip(r, 0, a.shape[0] - 1.001); c = np.clip(c, 0, a.shape[1] - 1.001)
	r0, c0 = np.floor(r).astype(int), np.floor(c).astype(int); fr, fc = r - r0, c - c0
	return a[r0, c0] * (1 - fr) * (1 - fc) + a[r0 + 1, c0] * fr * (1 - fc) + a[r0, c0 + 1] * (1 - fr) * fc + a[r0 + 1, c0 + 1] * fr * fc
def zfun(h, s):
	"""mesh height (km): linear in the coast distance across ±1 cell (so the water plane cuts the mesh exactly on the SDF
	zero line, sub-cell accurate) + exaggerated DEM height faded in over 2 cells inland"""
	k = np.clip(s / (2 * CELL), 0, 1); k = k * k * (3 - 2 * k)
	return np.clip(s / CELL, -1, 1) * LIFT + np.clip(h, 0, None) * 0.001 * EXAG * k
def ground_z(x, y):
	r, c = xy2rc(np.asarray(x, float), np.asarray(y, float))
	return zfun(bil(HG, r, c), bil(SG, r, c))

# ------------------------------------------------------------------ camera
LENS = float(arg('lens', 50))
cam = camera(LENS); cam.data.clip_start = 5.0; cam.data.clip_end = 1500.0
TANV = 18.0 / LENS; TANH = TANV * 1080 / 1920
CAMS = {
	'map': dict(tgt=(48.600, -122.990), head=12.0, pitch=53.0, d0=183.0, d1=169.0),
	'mapfinal': dict(tgt=(48.595, -122.985), head=12.0, pitch=53.5, d0=177.0, d1=166.0),
}
CP = CAMS[VAR]
for k_ in ('head', 'pitch', 'd0', 'd1'):
	if arg(k_): CP[k_] = float(arg(k_))
def cam_at(t):
	u = clamp01((t - T0) / (T1 - T0)); k = 0.45 * u + 0.55 * smooth(u)
	d = lerp(CP['d0'], CP['d1'], k)
	tg = P(*CP['tgt'])
	h, p = math.radians(CP['head']), math.radians(CP['pitch'])
	fwd = Vector((math.sin(h) * math.cos(p), math.cos(h) * math.cos(p), -math.sin(p)))
	look(cam, tg - fwd * d, tg)

def project(pts):
	"""world points (n,3) → screen u, v (0..1, v up) and depth for the current camera"""
	Mi = np.array(cam.matrix_world.inverted())
	q = np.c_[pts, np.ones(len(pts))] @ Mi.T
	dep = -q[:, 2]
	return 0.5 + q[:, 0] / np.maximum(dep, 1e-6) / (2 * TANH), 0.5 + q[:, 1] / np.maximum(dep, 1e-6) / (2 * TANV), dep

# ------------------------------------------------------------------ shared texture: R = sdf, G = depth, B = San Juan, A = group
IMG = bpy.data.images.load(str(GEO / 'tex.png'), check_existing=True)
IMG.colorspace_settings.name = 'Non-Color'; IMG.alpha_mode = 'CHANNEL_PACKED'
def geo_tex(nt):
	g = node(nt, 'ShaderNodeNewGeometry')
	mp = node(nt, 'ShaderNodeMapping')
	mp.inputs['Scale'].default_value = (1 / (KX * DLON * NXg), 1 / (KY * DLAT * NYg), 1)
	mp.inputs['Location'].default_value = ((LON0 - GW) / (DLON * NXg) + 0.5 / NXg, (LAT0 - GS) / (DLAT * NYg) + 0.5 / NYg, 0)
	link(nt, g.outputs['Position'], mp.inputs['Vector'])
	ti = node(nt, 'ShaderNodeTexImage'); ti.image = IMG; ti.interpolation = 'Linear'; ti.extension = 'EXTEND'
	link(nt, mp.outputs['Vector'], ti.inputs['Vector'])
	sp = node(nt, 'ShaderNodeSeparateColor'); link(nt, ti.outputs['Color'], sp.inputs['Color'])
	sdf = M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', sp.outputs[0], 128 / 255), 255 * 8)       # metres, + land
	return dict(g=g, sdf=sdf, depth=sp.outputs[1], sj=sp.outputs[2], grp=ti.outputs['Alpha'])

def smoothstep_n(nt, e0, e1, x):
	n = nt.nodes.new('ShaderNodeMapRange'); n.interpolation_type = 'SMOOTHSTEP'
	n.inputs['From Min'].default_value = e0; n.inputs['From Max'].default_value = e1
	put(nt, n.inputs['Value'], x); return n.outputs['Result']

HAZE = C('#f2c3c6')
def haze(nt, shader_out, out_node, amt=0.58, d0=175.0, d1=320.0):
	cd = node(nt, 'ShaderNodeCameraData')
	f = M(nt, 'MULTIPLY', smoothstep_n(nt, d0, d1, cd.outputs['View Distance']), amt)
	e = node(nt, 'ShaderNodeEmission'); e.inputs['Color'].default_value = (*HAZE, 1); e.inputs['Strength'].default_value = 1.0
	mx = node(nt, 'ShaderNodeMixShader'); put(nt, mx.inputs['Fac'], f)
	link(nt, shader_out, mx.inputs[1]); link(nt, e.outputs[0], mx.inputs[2]); link(nt, mx.outputs[0], out_node.inputs['Surface'])

CTRL = {}    # animated value / colour nodes
def val_node(nt, key, v=0.0):
	n = node(nt, 'ShaderNodeValue'); n.outputs[0].default_value = v; CTRL.setdefault(key, []).append(n); return n.outputs[0]
def rgb_node(nt, key, c):
	n = node(nt, 'ShaderNodeRGB'); n.outputs[0].default_value = (*c, 1); CTRL.setdefault(key, []).append(n); return n.outputs[0]
def set_val(key, v):
	for n in CTRL.get(key, []): n.outputs[0].default_value = v
def set_rgb(key, c):
	for n in CTRL.get(key, []): n.outputs[0].default_value = (*c, 1)

RED, BLUE, CREAM = C('#f0261c'), C('#2f6dff'), C('#fff1d2')
TINT_BLUE = C('#3a62f2')
TINT_RED = C('#ff3326')

def land_mat():
	m = bpy.data.materials.new('land'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial'); bs = node(nt, 'ShaderNodeBsdfPrincipled')
	G = geo_tex(nt); g = G['g']
	z = SEP(nt, g.outputs['Position'])[2]
	hm = M(nt, 'MULTIPLY', z, 1000.0 / EXAG / 2000.0)                         # height / 2000 m
	nz = SEP(nt, g.outputs['Normal'])[2]
	slope = M(nt, 'SUBTRACT', 1.0, nz)
	base = RAMP(nt, hm, [(0.0, C('#9fd062')), (0.012, C('#86c558')), (0.04, C('#61ae4a')), (0.1, C('#46953f')),
	                     (0.2, C('#337e39')), (0.4, C('#2b6c37')), (0.55, C('#566a48')), (0.65, C('#8c8172')),
	                     (0.72, C('#aaa196')), (0.77, C('#eef1f4')), (1.0, C('#ffffff'))], interp='LINEAR')
	# rock on steep slopes above the lowland
	rk = M(nt, 'MULTIPLY', smoothstep_n(nt, 0.42, 0.72, slope), smoothstep_n(nt, 0.14, 0.4, hm))
	base = MIX(nt, M(nt, 'MULTIPLY', rk, 0.75), base, C('#8b7d6c'))
	# soft natural variation (meadow / forest patches)
	n1 = node(nt, 'ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 0.22; n1.inputs['Detail'].default_value = 3.0
	link(nt, g.outputs['Position'], n1.inputs['Vector'])
	var = M(nt, 'MULTIPLY_ADD', n1.outputs['Fac'], 0.32, 0.84)
	vm = node(nt, 'ShaderNodeMixRGB'); vm.blend_type = 'MULTIPLY'; vm.inputs['Fac'].default_value = 1.0
	link(nt, base, vm.inputs['Color1']); cmb = node(nt, 'ShaderNodeCombineColor'); link(nt, var, cmb.inputs[0]); link(nt, var, cmb.inputs[1]); link(nt, var, cmb.inputs[2])
	link(nt, cmb.outputs[0], vm.inputs['Color2']); base = vm.outputs['Color']
	# pale shore band right at the coast
	shore = M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', 1.0, smoothstep_n(nt, 45.0, 85.0, G['sdf'])), M(nt, 'SUBTRACT', 1.0, smoothstep_n(nt, 0.01, 0.03, hm)))
	base = MIX(nt, M(nt, 'MULTIPLY', shore, 0.8), base, C('#efe3b8'))
	# overlays: San Juan Island pulse (map) and the San Juan Islands going blue (mapfinal)
	pa = M(nt, 'MULTIPLY', G['sj'], val_node(nt, 'sj_amt'))
	pc = rgb_node(nt, 'sj_col', RED)
	base = MIX(nt, M(nt, 'MINIMUM', M(nt, 'MULTIPLY', pa, 1.15), 1.0), base, pc)
	ga = M(nt, 'MULTIPLY', G['grp'], val_node(nt, 'grp_amt'))
	base = MIX(nt, M(nt, 'MULTIPLY', ga, 0.72), base, TINT_BLUE)
	link(nt, base, bs.inputs['Base Color'])
	bs.inputs['Roughness'].default_value = 0.85
	try: bs.inputs['Specular IOR Level'].default_value = 0.25
	except Exception: pass
	glow = M(nt, 'ADD', M(nt, 'MULTIPLY', pa, 0.3), M(nt, 'MULTIPLY', ga, 0.12))
	ecol = MIX(nt, M(nt, 'GREATER_THAN', ga, 0.001), pc, TINT_BLUE)
	link(nt, ecol, bs.inputs['Emission Color']); put(nt, bs.inputs['Emission Strength'], glow)
	haze(nt, bs.outputs[0], out)
	return m

def water_mat():
	m = bpy.data.materials.new('water'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial'); bs = node(nt, 'ShaderNodeBsdfPrincipled')
	G = geo_tex(nt); g = G['g']
	col = RAMP(nt, G['depth'], [(0.0, C('#8eeedb')), (0.08, C('#55d8cf')), (0.18, C('#2bb8c8')), (0.3, C('#1f9cc0')),
	                            (0.5, C('#1b86b4')), (0.75, C('#1b70a6')), (1.0, C('#1d6098'))], interp='LINEAR')
	# crisp white foam line hugging every coast (≈ 120 m wide) + a faint second ripple line offshore
	w = M(nt, 'MULTIPLY', G['sdf'], -1.0)                                 # metres from the coast (water side > 0)
	foam = M(nt, 'SUBTRACT', 1.0, smoothstep_n(nt, 95.0, 135.0, w))
	rip = M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', 1.0, smoothstep_n(nt, 0.0, 40.0, M(nt, 'ABSOLUTE', M(nt, 'SUBTRACT', w, 340.0)))), 0.2)
	col = MIX(nt, M(nt, 'MAXIMUM', foam, rip), col, C('#ffffff'))
	link(nt, col, bs.inputs['Base Color'])
	bs.inputs['Roughness'].default_value = 0.32
	try: bs.inputs['Specular IOR Level'].default_value = 0.4
	except Exception: pass
	link(nt, col, bs.inputs['Emission Color']); bs.inputs['Emission Strength'].default_value = 0.22
	n1 = node(nt, 'ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 1.4; n1.inputs['Detail'].default_value = 4.0
	link(nt, g.outputs['Position'], n1.inputs['Vector'])
	bp = node(nt, 'ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.05; bp.inputs['Distance'].default_value = 0.05
	link(nt, n1.outputs['Fac'], bp.inputs['Height']); link(nt, bp.outputs['Normal'], bs.inputs['Normal'])
	haze(nt, bs.outputs[0], out)
	return m

# ------------------------------------------------------------------ terrain mesh (frustum- and deep-water-culled grid)
def mesh_from(name, V, quads, tris=None, mat=None, smooth_=True):
	me = bpy.data.meshes.new(name)
	fill_mesh(me, V, quads, tris)
	if smooth_: me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
	o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
	if mat: me.materials.append(mat)
	return o

def fill_mesh(me, V, quads, tris=None):
	quads = np.asarray(quads, np.int32).reshape(-1, 4)
	tris = np.zeros((0, 3), np.int32) if tris is None else np.asarray(tris, np.int32).reshape(-1, 3)
	loops = np.r_[quads.ravel(), tris.ravel()].astype(np.int32)
	tot = np.r_[np.full(len(quads), 4), np.full(len(tris), 3)].astype(np.int32)
	starts = np.r_[0, np.cumsum(tot)[:-1]].astype(np.int32)
	me.vertices.add(len(V)); me.vertices.foreach_set('co', np.asarray(V, np.float32).ravel())
	me.loops.add(len(loops)); me.loops.foreach_set('vertex_index', loops)
	me.polygons.add(len(tot)); me.polygons.foreach_set('loop_start', starts); me.polygons.foreach_set('loop_total', tot)
	me.update(calc_edges=True)

def visible_cells(X, Y, Z, margin=0.12):
	ok = np.zeros(X.shape, bool)
	pts = np.c_[X.ravel(), Y.ravel(), Z.ravel()]
	for t in (T0, (T0 + T1) / 2, T1):
		cam_at(t); bpy.context.view_layer.update()
		u, v, d = project(pts)
		ok |= ((u > -margin) & (u < 1 + margin) & (v > -margin) & (v < 1 + margin) & (d > 0)).reshape(X.shape)
	return ok

def build_terrain(mat):
	t_ = time.time()
	la0, la1, lo0, lo1 = GS + 0.03, GN - 0.01, GW + 0.02, GE - 0.02
	r0, r1 = int((GN - la1) / DLAT), int((GN - la0) / DLAT); c0, c1 = int((lo0 - GW) / DLON), int((lo1 - GW) / DLON)
	rs, cs = np.arange(r0, r1 + 1, STEP), np.arange(c0, c1 + 1, STEP)
	h, s = HG[np.ix_(rs, cs)], SG[np.ix_(rs, cs)]
	X, Y = np.meshgrid((GW + cs * DLON - LON0) * KX, (GN - rs * DLAT - LAT0) * KY)
	Z = zfun(h, s)
	ny, nx = Z.shape
	idx = np.arange(ny * nx).reshape(ny, nx)
	q = np.stack([idx[1:, :-1], idx[1:, 1:], idx[:-1, 1:], idx[:-1, :-1]], -1).reshape(-1, 4)
	smax = np.maximum.reduce([s[1:, :-1], s[1:, 1:], s[:-1, 1:], s[:-1, :-1]]).ravel()
	vis = visible_cells(X, Y, Z)
	vq = (vis[1:, :-1] | vis[1:, 1:] | vis[:-1, 1:] | vis[:-1, :-1]).ravel()
	keep = (smax > -1.5 * CELL) & vq
	q = q[keep]
	used, inv = np.unique(q, return_inverse=True)
	V = np.c_[X.ravel()[used], Y.ravel()[used], Z.ravel()[used]]
	o = mesh_from('terrain', V, inv.reshape(-1, 4), mat=mat)
	print('terrain', len(V), 'verts', len(q), 'quads', '%.1fs' % (time.time() - t_), flush=True)
	return o

def build_water(mat, half=260.0):
	V = np.array([[-half, -half, 0], [half, -half, 0], [half, half, 0], [-half, half, 0]], np.float32)
	return mesh_from('water', V, [[0, 1, 2, 3]], mat=mat, smooth_=False)

# ------------------------------------------------------------------ glowing ink-outlined tubes (per-frame rebuilt)
def line_mat(name, col, strength=1.4):
	m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial'); bs = node(nt, 'ShaderNodeBsdfPrincipled')
	c = rgb_node(nt, name + '_col', col)
	link(nt, c, bs.inputs['Base Color']); link(nt, c, bs.inputs['Emission Color'])
	link(nt, val_node(nt, name + '_em', strength), bs.inputs['Emission Strength'])
	bs.inputs['Roughness'].default_value = 0.3
	link(nt, bs.outputs[0], out.inputs['Surface'])
	return m

def tube_geom(Pp, s, segs, R, nr=12, closed_full=False):
	"""capsule tubes along the polyline Pp (n,3) with arc lengths s for each arc range (a, b) in segs"""
	Vs, Qs, Ts = [], [], []
	off = 0
	ang = np.linspace(0, 2 * np.pi, nr, endpoint=False)
	cs_, sn_ = np.cos(ang), np.sin(ang)
	up = np.array([0.0, 0.0, 1.0])
	for a, b in segs:
		if b - a < 0.02: continue
		n = max(3, int((b - a) / 0.25) + 1)
		ss = np.linspace(a, b, n)
		C_ = np.c_[np.interp(ss, s, Pp[:, 0]), np.interp(ss, s, Pp[:, 1]), np.interp(ss, s, Pp[:, 2])]
		T = np.gradient(C_, axis=0); T /= np.linalg.norm(T, axis=1)[:, None] + 1e-9
		side = np.cross(T, up); side /= np.linalg.norm(side, axis=1)[:, None] + 1e-9
		up2 = np.cross(side, T)
		rad = np.full(n, R)
		# hemispherical caps: extra rings before/after
		phis = np.radians([72, 45, 20])
		pre = [(C_[0] - T[0] * R * math.sin(p), R * math.cos(p), T[0], side[0], up2[0]) for p in phis]
		post = [(C_[-1] + T[-1] * R * math.sin(p), R * math.cos(p), T[-1], side[-1], up2[-1]) for p in phis[::-1]]
		rings_c = np.r_[np.array([p[0] for p in pre]), C_, np.array([p[0] for p in post])]
		rings_r = np.r_[[p[1] for p in pre], rad, [p[1] for p in post]]
		rings_s = np.r_[np.array([p[3] for p in pre]), side, np.array([p[3] for p in post])]
		rings_u = np.r_[np.array([p[4] for p in pre]), up2, np.array([p[4] for p in post])]
		K = len(rings_c)
		V = rings_c[:, None, :] + rings_r[:, None, None] * (cs_[None, :, None] * rings_s[:, None, :] + sn_[None, :, None] * rings_u[:, None, :])
		V = V.reshape(-1, 3)
		tip0 = C_[0] - T[0] * R; tip1 = C_[-1] + T[-1] * R
		V = np.r_[V, [tip0, tip1]]
		k_, j_ = np.meshgrid(np.arange(K - 1), np.arange(nr), indexing='ij')
		j1 = (j_ + 1) % nr
		Q = np.stack([k_ * nr + j_, (k_ + 1) * nr + j_, (k_ + 1) * nr + j1, k_ * nr + j1], -1).reshape(-1, 4)
		i0, i1 = K * nr, K * nr + 1
		jj = np.arange(nr); jn = (jj + 1) % nr
		Tr = np.r_[np.c_[np.full(nr, i0), jj, jn], np.c_[np.full(nr, i1), (K - 1) * nr + jn, (K - 1) * nr + jj]]
		Vs.append(V); Qs.append(Q + off); Ts.append(Tr + off); off += len(V)
	if not Vs:
		return np.zeros((0, 3)), np.zeros((0, 4), int), np.zeros((0, 3), int)
	return np.concatenate(Vs), np.concatenate(Qs), np.concatenate(Ts)

class Line:
	def __init__(self, name, ll, col, R=0.42, dash=2.8, gap=1.5, ink=0.13, strength=1.4, z_extra=0.0, start_xy=None):
		xy = ll2xy(ll)
		d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(xy, axis=0), axis=1))]
		ss = np.linspace(0, d[-1], max(2, int(d[-1] / 0.2) + 1))
		xy = np.c_[np.interp(ss, d, xy[:, 0]), np.interp(ss, d, xy[:, 1])]
		z = np.maximum(ground_z(xy[:, 0], xy[:, 1]), 0.0) + R * 0.85 + z_extra
		# smooth the draped height a little so the tube does not follow every DEM bump
		if len(z) > 9:
			kern = np.ones(7) / 7; zp = np.r_[np.full(3, z[0]), z, np.full(3, z[-1])]
			z = np.maximum(np.convolve(zp, kern, 'valid'), z)
		self.P = np.c_[xy, z]
		self.s = np.r_[0, np.cumsum(np.linalg.norm(np.diff(self.P, axis=0), axis=1))]
		self.L = float(self.s[-1])
		self.R, self.dash, self.gap, self.name = R, dash, gap, name
		self.mat = line_mat(name, col, strength)
		self.me = bpy.data.meshes.new(name)
		self.o = bpy.data.objects.new(name, self.me); bpy.context.scene.collection.objects.link(self.o)
		self.me.materials.append(self.mat)
		if ink: outline(self.o, ink)
		self.head = prim('sphere', name + '_head', line_mat(name + 'H', col, 6.0), (0, 0, 0), (1, 1, 1), u=20, v=12)
		self.head.hide_render = True
	def at(self, sv):
		return Vector([float(np.interp(sv, self.s, self.P[:, k])) for k in range(3)])
	def pose(self, reveal, fill=0.0, rscale=1.0, head=0.0, start=0.0):
		"""reveal: km drawn from the start; fill 0 = dashed … 1 = solid (dashes grow in place); head: glow-ball size 0…1"""
		reveal = max(0.0, min(self.L, reveal)); R = self.R * rscale
		segs = []
		if fill >= 0.999:
			segs = [(start, reveal)]
		else:
			per = self.dash + self.gap; ln = self.dash + self.gap * fill
			k = 0
			while k * per < reveal:
				c = k * per + self.dash / 2
				a, b = max(start, c - ln / 2), min(reveal, c + ln / 2)
				if b > a: segs.append((a, b))
				k += 1
		V, Q, Tr = tube_geom(self.P, self.s, segs, R)
		mats = [m for m in self.me.materials]
		self.me.clear_geometry()
		if len(self.me.materials) == 0:
			for m in mats: self.me.materials.append(m)
		if len(V):
			fill_mesh(self.me, V, Q, Tr)
			self.me.polygons.foreach_set('use_smooth', np.ones(len(self.me.polygons), bool))
		self.o.hide_render = len(V) == 0
		if head > 0.01 and 0 < reveal < self.L:
			self.head.hide_render = False; self.head.location = self.at(reveal); hs = self.R * 1.75 * head
			self.head.scale = (hs, hs, hs)
		else:
			self.head.hide_render = True

# ------------------------------------------------------------------ flags on poles
def nearest_land(lat, lon, min_m=900.0, rad_km=6.0):
	"""nudge a site onto land at least min_m from the coast"""
	r, c = xy2rc(*ll2xy([(lat, lon)])[0])
	rr, cc = int(round(r)), int(round(c)); w = int(rad_km * 1000 / 37)
	win = SG[rr - w:rr + w + 1, cc - w:cc + w + 1]
	yy, xx = np.mgrid[-w:w + 1, -w:w + 1]
	cost = np.where(win > min_m, np.hypot(yy, xx), 1e9)
	k = np.unravel_index(np.argmin(cost), cost.shape)
	return GN - (rr + k[0] - w) * DLAT, GW + (cc + k[1] - w) * DLON

def flag_pole(name, png, lat, lon, fly=1, H=11.5, w=8.2, aspect=0.6, lean=12.0):
	lat, lon = nearest_land(lat, lon)
	base = P(lat, lon); base.z = float(ground_z(base.x, base.y))
	root = empty(name, base)
	root.rotation_euler = (math.radians(-lean), 0, math.radians(-CP['head']))     # face the camera, lean a little to it
	m_pole = pbr(name + '_pole', '#f5f0e6', rough=0.35); m_gold = pbr(name + '_gold', '#f2c24e', rough=0.28, metal=0.85)
	m_base = pbr(name + '_base', '#6b5240', rough=0.7)
	b_ = prim('cyl', name + '_plinth', m_base, (0, 0, 0.18), (1.05, 1.05, 0.22), seg=28, ink=0.07, parent=root)
	pl = prim('cyl', name + '_pole', m_pole, (0, 0, H / 2), (0.17, 0.17, H / 2), seg=16, ink=0.06, parent=root)
	prim('sphere', name + '_ball', m_gold, (0, 0, H + 0.25), (0.42, 0.42, 0.42), ink=0.05, parent=root)
	h = w * aspect; nu, nv = 24, 14
	ii, jj = np.meshgrid(np.arange(nu + 1), np.arange(nv + 1), indexing='ij')
	a = ii / nu; b = jj / nv
	X0 = np.c_[(fly * (0.16 + a * w)).ravel(), np.zeros(a.size), (H - 0.35 - b * h).ravel()]
	idx = np.arange((nu + 1) * (nv + 1)).reshape(nu + 1, nv + 1)
	Q = np.stack([idx[:-1, :-1], idx[1:, :-1], idx[1:, 1:], idx[:-1, 1:]], -1).reshape(-1, 4)
	if fly < 0: Q = Q[:, ::-1]
	me = bpy.data.meshes.new(name + '_cloth'); fill_mesh(me, X0, Q)
	me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
	uvl = me.uv_layers.new(); uv = np.c_[a.ravel(), 1 - b.ravel()]
	lv = np.zeros(len(me.loops), np.int32); me.loops.foreach_get('vertex_index', lv)
	uvl.data.foreach_set('uv', uv[lv].ravel())
	cl = bpy.data.objects.new(name + '_cloth', me); bpy.context.scene.collection.objects.link(cl); cl.parent = root
	me.materials.append(flagmat2(png))
	F = dict(root=root, cloth=cl, X0=X0, a=a.ravel(), b=b.ravel(), w=w, h=h, fly=fly, H=H, seed=hash(name) % 7, top=Vector((0, 0, H + 0.4)))
	set_visible(root, False)
	return F

def wave_flag(F, t):
	a, b, w = F['a'], F['b'], F['w']
	ph = 2 * np.pi * (a * 1.35 - t * 1.25) + F['seed']
	amp = w * (0.035 + 0.075 * a ** 1.2)
	V = F['X0'].copy()
	V[:, 1] = amp * np.sin(ph) + amp * 0.35 * np.sin(2.3 * ph + b * 2.0)
	V[:, 0] = F['X0'][:, 0] - F['fly'] * w * 0.03 * a * (1 + np.cos(ph)) / 2
	V[:, 2] = F['X0'][:, 2] - F['h'] * 0.05 * a ** 2 + w * 0.012 * a * np.sin(ph + 1.3)
	F['cloth'].data.vertices.foreach_set('co', V.astype(np.float32).ravel()); F['cloth'].data.update()

def back_out(u, s=1.9):
	u = clamp01(u) - 1.0
	return 1 + (s + 1) * u ** 3 + s * u ** 2

def pop_flag(F, t, t_on, dur=0.48):
	u = (t - t_on) / dur
	if u <= 0:
		set_visible(F['root'], False); return
	set_visible(F['root'], True)
	k = max(0.001, back_out(u))
	F['root'].scale = (k, k, k * (1 + 0.12 * math.sin(clamp01(u) * math.pi)))

# ================================================================== build the scene
world2(light=0.75)
sun_pos = Vector((math.sin(math.radians(248)) * math.cos(math.radians(36)), math.cos(math.radians(248)) * math.cos(math.radians(36)), math.sin(math.radians(36))))
sn = sun2(energy=4.3, color=(1.0, 0.9, 0.78), rot=(0, 0, 0), angle=2.5)
sn.rotation_euler = sun_pos.to_track_quat('Z', 'Y').to_euler()

LAND, WATER = land_mat(), water_mat()
terrain = build_terrain(LAND)
water = build_water(WATER)

# lines: 49th parallel enters at the right frame edge (visible part only), forks into the two claims
l49 = np.array(GL['l49'])
cam_at(T0); bpy.context.view_layer.update()
xy49 = ll2xy(l49); u49, v49, _ = project(np.c_[xy49, np.zeros(len(xy49))])
first = int(np.argmax(u49 < 1.04)) if VAR == "map" else 0
print("l49 u range", float(u49.min()), float(u49.max()), "first", first, flush=True)
L49 = Line('l49', l49[max(0, first - 1):], CREAM, R=0.40, strength=0.75)
HARO = Line('haro', GL['haro'], BLUE, R=0.45, ink=0.14, strength=1.1)
ROS = Line('rosario', GL['rosario'], RED, R=0.45, ink=0.14, strength=1.0)
RING = Line('sj_ring', GL['san_juan_ring'], RED, R=0.36, dash=999, gap=0.0, ink=0.13, strength=1.0)

UK = flag_pole('flag_uk', 'union_jack', 48.47, -123.33, fly=-1)
US = flag_pole('flag_us', 'us_1859', 48.73, -122.49, fly=-1)
SJF = flag_pole('flag_sj', 'us_1859', *GL['san_juan_centroid'], fly=-1, H=10.5, w=7.6) if VAR == 'mapfinal' else None
SJ_C = P(*GL['san_juan_centroid']); SJ_C.z = float(ground_z(SJ_C.x, SJ_C.y))
print('l49 visible length %.1f km, haro %.1f, rosario %.1f, ring %.1f' % (L49.L, HARO.L, ROS.L, RING.L), flush=True)

def drawk(t, a, b): return ease((t - a) / (b - a))
def lerp3(a, b, k): return tuple(lerp(a[i], b[i], k) for i in range(3))

def update(t):
	cam_at(t)
	for F in (UK, US, SJF):
		if F: wave_flag(F, t)
	if VAR == 'map':
		k49 = drawk(t, W(39), W(40) + 0.05)
		L49.pose(k49 * L49.L, head=1.0 if 0 < k49 < 1 else 0.0)
		pop_flag(UK, t, W(40)); pop_flag(US, t, W(41))
		kc = drawk(t, W(41), W(43))
		HARO.pose(kc * HARO.L, head=1.0); ROS.pose(kc * ROS.L, head=1.0)
		# San Juan Island: circled on «the island», then alternately red / blue (both claim it)
		t3 = W(43)
		kr = drawk(t, t3 - 0.05, t3 + 0.32)
		# red → blue → red → blue (soft square wave; switches at +0.28 / +0.64 / +1.00 s, so the shot ends on a steady blue)
		ph = 0.5 - 0.5 * max(-1.0, min(1.0, 2.6 * math.cos(math.pi * max(0.0, t - t3 - 0.10) / 0.36)))
		col = lerp3(RED, BLUE, ph)
		RING.pose(kr * RING.L, fill=1.0, head=1.0)
		set_rgb('sj_ring_col', col); set_rgb('sj_ringH_col', col); set_rgb('sj_col', lerp3(TINT_RED, TINT_BLUE, ph))
		set_val('sj_amt', 0.66 * smooth((t - t3) / 0.25))
		set_val('grp_amt', 0.0)
	else:
		L49.pose(L49.L); UK['root'].scale = US['root'].scale = (1, 1, 1)
		set_visible(UK['root'], True); set_visible(US['root'], True)
		t1 = W(87)
		kr = drawk(t, t1 + 0.02, t1 + 0.55)
		ROS.pose(ROS.L * (1 - kr), rscale=1 - 0.35 * kr)
		set_val('rosario_em', 1.0 * (1 - 0.6 * kr))
		kb = drawk(t, t1, t1 + 0.45)
		HARO.pose(HARO.L, fill=kb, rscale=1 + 0.12 * kb)
		set_val('haro_em', 1.1 + 1.1 * kb); set_rgb('haro_col', lerp3(BLUE, C('#3f86ff'), kb))
		kring = drawk(t, t1 + 0.05, t1 + 0.42)
		RING.pose(kring * RING.L, fill=1.0, head=1.0)
		set_rgb('sj_ring_col', BLUE); set_rgb('sj_ringH_col', BLUE); set_rgb('sj_col', BLUE)
		set_val('sj_amt', 0.0)
		set_val('grp_amt', smooth((t - t1 - 0.1) / 0.5))
		pop_flag(SJF, t, W(90))

def flag_top(F):
	return lambda: F['root'].matrix_world @ F['top']
track = {'san_juan': lambda: SJ_C, 'flag_uk': flag_top(UK), 'flag_us': flag_top(US)}
if SJF: track['flag_sj'] = flag_top(SJF)
render(update, VAR, track=track)
