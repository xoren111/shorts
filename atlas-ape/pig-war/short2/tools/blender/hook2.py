"""v2 HOOK (painting look) 0–4.56 s — the standoff over a black Berkshire boar munching a potato: US infantry + flag +
cannon on the rise (left), the British frigate under the Union Jack in the bay (right); «Over one pig» → push in, it looks up."""
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from island2 import *
from shots_t import SHOT
t0, t1 = SHOT('hook')
setup_hist(t0, t1, hdri=arg('hdri', 'kloofendal_48d_partly_cloudy_puresky'), sky_rot=float(arg('skyrot', 150)), sky=1.0, paint_size=7)
sun2(3.6, (1.0, 0.8, 0.58), (58, 0, 215), 1.5)
rim = sun2(1.2, (0.85, 0.9, 1.0), (70, 0, 20), 3.0)      # cool back light: rims the black boar against the soil
PIG = Vector((0.6, -1.6, 0.0))
S = build2(keep_clear=[(PIG.x, PIG.y, 1.4), (1.0, -5.5, 2.0)], grass=420)
F = S['ships'][0]
B = animals.boar_pd('boar', PIG, math.radians(-30)); B['mode'] = 'chew'
pot = animals.mouth_potato(B)
UPDATERS.append(lambda t: [animals.boar_pd_tick(b, t) for b in animals.BOARS])
cam = camera(24); dof(cam, 5.6)
P0, A0 = Vector((0.15, -4.05, 0.72)), Vector((1.4, 30.0, 5.6))
P1, A1 = Vector((0.15, -3.55, 0.62)), Vector((0.55, -1.5, 0.52))
def update(t):
	k = ease((t - (W(7) - 0.12)) / (W(9) + 0.25 - (W(7) - 0.12)))
	pos = P0.lerp(P1, k); tgt = A0.lerp(A1, k)
	look(cam, pos, tgt); cam.data.lens = 24 + 8 * k
	cam.data.dof.focus_distance = (PIG + Vector((0, 0, 0.5)) - pos).length if k > 0.05 else 30.0
	cam.data.dof.aperture_fstop = 8.0 - 5.0 * k
	FG.ports(F, t - (W(5) - 0.05))
	B['look'] = ease((t - (W(8) - 0.15)) / 0.45)
	B['mode'] = 'chew' if t < W(8) + 0.15 else 'idle'
	t_drop = W(9) + 0.05
	if t >= t_drop:
		if pot.parent is not None:
			bpy.context.view_layer.update(); mw = pot.matrix_world.copy(); pot.parent = None; pot.matrix_world = mw; pot['p0'] = tuple(mw.to_translation())
		u = t - t_drop; p0 = Vector(pot['p0'])
		zf = max(0.3, p0.z - 4.9 * u * u) if u < 0.25 else 0.3 + abs(math.sin((u - 0.25) * 9.0)) * 0.06 * math.exp(-(u - 0.25) * 6)
		pot.location = (p0.x - 0.12 * u, p0.y - 0.3 * u, zf); pot.rotation_euler = (u * 7, u * 3, 0)
render2(update, 'hook')
