import bpy, sys, os, math
bpy.ops.preferences.addon_enable(module="bl_ext.user_default.mpfb")
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
D = LocationService.get_user_data()
print('USERDATA', D)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.preferences.addon_enable(module="bl_ext.user_default.mpfb")
mac = TargetService.get_default_macro_info_dict()
mac.update({'gender': 1.0, 'age': 0.55, 'muscle': 0.6, 'weight': 0.55, 'height': 0.6, 'proportions': 0.6})
mac['race'] = {'african': 0.0, 'asian': 0.0, 'caucasian': 1.0}
h = HumanService.create_human(macro_detail_dict=mac)
print('HUMAN', h.name, tuple(round(x, 3) for x in h.dimensions))
def p(*a): return os.path.join(D, *a)
HumanService.set_character_skin(p('skins', 'jartur69_middleage_slavic_male_with_genitals_and_beard', 'jartur69_middleage_slavic_male_with_genitals_and_beard.mhmat'), h, skin_type='ENHANCED_SSS')
for kind, rel in (('Eyes', 'eyes/high-poly/high-poly.mhclo'), ('Eyebrows', 'eyebrows/eyebrow001/eyebrow001.mhclo'), ('Eyelashes', 'eyelashes/eyelashes01/eyelashes01.mhclo'),
                  ('Hair', 'hair/short02/short02.mhclo'), ('Clothes', 'clothes/male_worksuit01/male_worksuit01.mhclo'), ('Clothes', 'clothes/shoes02/shoes02.mhclo'),
                  ('Clothes', 'clothes/mindfront_patrol_cap/mindfront_patrol_cap.mhclo')):
	f = p(rel)
	if not os.path.exists(f):
		import glob; c = glob.glob(os.path.join(os.path.dirname(f), '*.mhclo')); f = c[0] if c else f
	try:
		HumanService.add_mhclo_asset(f, h, asset_type=kind, subdiv_levels=1)
		print('ADDED', kind, os.path.basename(f))
	except Exception as e:
		print('FAIL', kind, f, e)
HumanService.add_builtin_rig(h, 'default')
for o in bpy.data.objects: print('OBJ', o.name, o.type, tuple(round(x, 3) for x in o.dimensions))
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('out/mh_test.blend'))
