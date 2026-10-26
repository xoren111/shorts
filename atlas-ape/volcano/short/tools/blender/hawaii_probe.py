"""Render-free framing probe for the Hawaii hook / raid toon shots: for a CamPath it prints, per sampled time, the screen y
of the terrain skyline (min / median / max over the frame width, from the real nested relief) and of key points, so a camera
can be framed in seconds instead of test renders. Used by `--probe` in tools/blender/hawaii_hook.py
(no GPU, no render: NOLOCK=1 tools/blender/run.sh tools/blender/hawaii_hook.py -- --probe)."""
import math
import numpy as np
import hawaii_lib_hookraid as L
from mathutils import Vector


def basis(pos, tg):
	f = (tg - pos).normalized()
	r = f.cross(Vector((0, 0, 1))).normalized()
	u = r.cross(f)
	return f, r, u


def project(pos, tg, fov, p):
	f, r, u = basis(pos, tg)
	d = Vector(p) - pos
	zc = d.dot(f)
	if zc <= 1e-6: return None
	k = 960 / math.tan(math.radians(fov) / 2)
	return 540 + d.dot(r) / zc * k, 960 - d.dot(u) / zc * k


def skyline(pos, tg, fov, ncol=19, rmax=90.0):
	"""screen y of the highest terrain point per screen column (sampled along the column's azimuth)"""
	f, r, u = basis(pos, tg)
	k = 960 / math.tan(math.radians(fov) / 2)
	rs = np.concatenate([np.arange(0.2, 6, 0.03), np.arange(6, 25, 0.1), np.arange(25, rmax, 0.3)])
	ys = []
	for i in range(ncol):
		x = 30 + (1020 * i) / (ncol - 1)
		dirv = f + r * ((x - 540) / k)
		dh = Vector((dirv.x, dirv.y, 0)).normalized()
		px = pos.x + dh.x * rs; py = pos.y + dh.y * rs
		h = L.best_h(px, py) / 1000 * L.EXAG
		h = np.where(h < 0.001, 0.004, h)              # sea plane
		el = np.arctan2(h - pos.z, rs)
		j = int(np.argmax(el))
		sp = project(pos, tg, fov, (float(px[j]), float(py[j]), float(h[j])))
		ys.append(sp[1] if sp else float('nan'))
	return np.array(ys)


def report(path, pts, times, T=None):
	print('   t    | sky min  med  max | ' + ' | '.join('%-12s' % k for k in pts))
	for t in times:
		pos, tg, fov = path.at(t)
		sy = skyline(pos, tg, fov)
		row = []
		for k, p in pts.items():
			q = project(pos, tg, fov, p)
			row.append('%5.0f,%5.0f' % q if q else '   behind  ')
		print('%6.2f  | %5.0f %5.0f %5.0f | ' % (t, np.nanmin(sy), np.nanmedian(sy), np.nanmax(sy)) + ' | '.join('%-12s' % s for s in row)
		      + '   cam z %.2f dist %.2f fov %.1f' % (pos.z, (pos - tg).length, fov))
