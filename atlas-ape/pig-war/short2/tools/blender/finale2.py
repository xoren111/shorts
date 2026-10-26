"""v2 FINALE (painting look) «Total casualties: one pig. Team farmer, or team pig?»  the angel boar hovers in a blue sky
above the island (gold halo, flapping white wings, warm 3/4 key), seen from below so it reads against clean sky in the upper
middle — clear of the poll card (top) and Atlas (bottom left); it turns to us on «pig?». Atlas + poll in Remotion."""
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from island2 import *
from shots_t import SHOT
import pw, env, animals
t0, t1 = SHOT('finale')
setup_hist(t0, t1)
SUN = sun2(3.0, (1.0, 0.86, 0.68), (62, 0, 139), 1.5)
S = build2(patch=True, cabin=True, hill_camp=True, ships=1, soldiers=4, grass=360, keep_clear=[(0, 0, 0.1)])
ukp, ukc = env.flagpole('ukcamp', (12.0, 7.0, 0), 'union_jack', h=7.0, size=(1.6, 0.85))
PIG = Vector((1.5, -1.8, 8.5))
A = animals.boar_pd('angel', PIG, math.radians(40), angel=True, s=1.2); A['mode'] = 'float'
bpy.data.objects['angel_halo'].data.materials[0] = pbr('halo_gold', '#e2aa3c', rough=0.25, metal=0.6, emit=('#ffb02a', 3.0))
next(n for n in bpy.data.materials['angel_wing'].node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Emission Strength'].default_value = 0.6
UPDATERS.append(lambda t: [animals.boar_pd_tick(b, t) for b in animals.BOARS])
cam = camera(35); dof(cam, 8.0)
DIR = Vector((0.22, -0.975, 0)).normalized()
def update(t):
	k = ease((t - (W(91) - 0.1)) / 0.6)
	A['root'].rotation_euler.z = math.radians(40) + math.radians(-47) * k
	A['root'].location = PIG + Vector((0, 0, 0.1 * math.sin(t * 2.0)))
	u = ease((t - t0) / (t1 - t0))
	d = 4.7 + (4.3 - 4.7) * u                     # slow push-in
	c = PIG + DIR * d; c.z = 7.3
	look(cam, c, Vector((PIG.x, PIG.y, 7.3 + d * math.tan(math.radians(13.5)))))
	cam.data.dof.focus_distance = d
render2(update, 'finale')
