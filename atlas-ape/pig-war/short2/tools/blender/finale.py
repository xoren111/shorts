"""FINALE 38.54–43.85 «Total casualties: one pig. Team farmer, or team pig?»  sunset over the island: the angel boar sits
on a soft cloud above the farm (both camps' flags below, the frigate at anchor in the bay), turns to us and waves a hoof on
«one pig»; slow drift. Atlas + the poll card are added in Remotion; the last 0.7 s dissolve back to frame 0 (loop)."""
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from island import *
import pw, env, frigate as FG
from shots_t import SHOT
t0, t1 = SHOT('finale')
setup2(t0, t1)
S = build(cabin=True, patch=True, hill_camp=True, ships=1, ship_loc=(10.2, 19.5), ship_yaw=math.radians(-8), soldiers=4, grass=260,
          clouds=True, sun_rot=(78, 0, 200))
S['sun'].data.color = (1.0, 0.72, 0.5); S['sun'].data.energy = 3.4
ukp, ukc = env.flagpole('ukcamp', (4.5, 2.5, 0), 'union_jack', h=2.6, size=(0.6, 0.33))
# the cloud seat
CLOUD = Vector((0.6, -0.6, 3.1))
cl = cloud2('seat', CLOUD + Vector((0, 0, -0.62)), 0.42, seed=5)
cl.location.z = CLOUD.z - 0.22      # visible top of the cumulus just under the angel's belly
ang = pig('angel', CLOUD + Vector((0, 0, 0.02)), math.radians(-95), angel=True, s=1.25); ang['mode'] = 'float'
t_wave = W(93) - 0.25
cam = camera(28)
def update(t):
	# the angel turns from looking down at the island to us, then waves a front hoof
	k = ease((t - (W(91) - 0.1)) / 0.6)
	ang['root'].rotation_euler.z = math.radians(-60) + math.radians(-35) * k
	ang['root'].location = CLOUD + Vector((0, 0, 0.02 + 0.03 * math.sin(t * 2.0)))
	u = (t - t0) / (t1 - t0)
	look(cam, Vector((1.15, -2.55, 3.42)).lerp(Vector((0.95, -2.2, 3.4)), ease(u)), Vector((0.55, -0.2, 3.3)).lerp(Vector((0.58, -0.3, 3.3)), ease(u)))
def wave_tick(t):
	if t >= t_wave:
		w = clamp01((t - t_wave) / 0.25)
		leg = ang['legs'][1]
		leg.rotation_euler = (math.radians(-20) * w, math.radians(-110) * w + math.sin((t - t_wave) * 12) * 0.35 * w, 0)
pw.UPDATERS.append(wave_tick)
cam.data.lens = 28
render2(update, 'finale')
