"""HOOK 0–4.56 s «America and Britain almost went to war. Over one pig.» — frame 0 is the standoff: the Berkshire boar
chewing a potato in the middle of the patch, the US line + flag + cannon on the hill (left), the British frigate in the bay
(right) running out her guns on «war». «Over one pig» → push in, the pig stops chewing, looks up at us, the potato drops."""
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from island import *
from shots_t import SHOT
t0, t1 = SHOT('hook')
setup2(t0, t1)
S = build(ships=1, ship_loc=(10.2, 19.5), ship_yaw=math.radians(-8), smoke=True, keep_clear=[(0.4, -1.3, 0.55), (0.3, -2.4, 0.75), (0.3, -2.0, 0.45)])
F = S['ships'][0]
pg = pig('pig', (0.4, -1.3, 0.07), math.radians(-108)); pg['mode'] = 'chew'
pot = potato('potmouth', 1.1); pot.parent = pg['jaw']; pot.location = (0.095, 0, -0.005)
cam = camera(24); dof(cam, 8.0)
P0, A0 = Vector((0.45, -3.05, 0.46)), Vector((0.9, 8.0, 2.5))
P1, A1 = Vector((0.22, -2.62, 0.36)), Vector((0.24, -1.5, 0.27))
t_push, t_look, t_drop = W(7) - 0.12, W(8) - 0.15, W(9) + 0.05
def update(t):
	k = ease((t - t_push) / (W(9) + 0.25 - t_push))
	pos = P0.lerp(P1, k); tgt = A0.lerp(A1, k)
	pos.x += 0.06 * math.sin(t * 0.6); pos.z += 0.015 * math.sin(t * 0.9)       # slow handheld drift (no shake)
	look(cam, pos, tgt)
	cam.data.lens = 24 + 8 * k
	cam.data.dof.focus_distance = (Vector((0.4, -1.3, 0.3)) - pos).length if k > 0.05 else 12.0
	cam.data.dof.aperture_fstop = 8.0 - 5.2 * k
	# the frigate runs out her guns on «war»
	FG.ports(F, t - (W(5) - 0.05))
	# pig: chewing → looks up at us on «Over one»
	pg['look'] = ease((t - t_look) / 0.45)
	pg['mode'] = 'chew' if t < t_look + 0.3 else 'idle'
	# the potato drops out of its mouth on «pig» and bounces
	if t >= t_drop:
		if pot.parent is not None:
			mw = pot.matrix_world.copy(); pot.parent = None; pot.matrix_world = mw; pot['p0'] = tuple(mw.to_translation())
		u = t - t_drop; p0 = Vector(pot['p0'])
		zf = max(0.07, p0.z - 4.9 * u * u) if u < 0.2 else 0.07 + abs(math.sin((u - 0.2) * 9.0)) * 0.05 * math.exp(-(u - 0.2) * 6)
		pot.location = (p0.x + 0.15 * u, p0.y - 0.25 * u, zf)
		pot.rotation_euler = (u * 7, u * 3, 0)
render2(update, 'hook')
