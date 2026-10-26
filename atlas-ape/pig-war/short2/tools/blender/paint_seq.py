"""paint an existing image sequence with the v2 oil look (for shots kept from v1, e.g. the real-DEM maps):
  blender -b -P tools/blender/paint_seq.py -- <src_dir> <dst_dir> [size]"""
import bpy, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import paint
a = sys.argv[sys.argv.index('--') + 1:]
src, dst = a[0], a[1]; size = int(a[2]) if len(a) > 2 else 14
os.makedirs(dst, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
cd = bpy.data.cameras.new('c'); co = bpy.data.objects.new('c', cd); sc.collection.objects.link(co); sc.camera = co
sc.render.engine = 'BLENDER_EEVEE'; sc.eevee.taa_render_samples = 1
try: sc.render.compositor_device = 'GPU'
except Exception: pass
nt = paint.comp_tree(sc)
inode = nt.nodes.new('CompositorNodeImage')
out = paint.paint_tree(nt, inode.outputs['Image'], size=size, fine=5, sat=1.0)
go = nt.nodes.new('NodeGroupOutput'); nt.links.new(out, go.inputs[0])
sc.render.use_compositing = True; sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 93
fs = sorted(f for f in os.listdir(src) if f.startswith('f_') and f.endswith(('.jpg', '.png')))
for f in fs:
	im = bpy.data.images.load(os.path.join(src, f)); inode.image = im
	sc.render.filepath = os.path.join(dst, os.path.splitext(f)[0] + '.jpg')
	bpy.ops.render.render(write_still=True)
	bpy.data.images.remove(im)
print('painted', len(fs), '→', dst)
