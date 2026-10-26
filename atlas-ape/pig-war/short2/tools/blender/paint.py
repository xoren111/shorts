"""«Living oil painting» look for the v2 renders — Blender 5.2 compositor (GPU):
anisotropic Kuwahara brush strokes (+ a finer pass for detail) → 19th-c. palette grade (warm umber shadows, creamy
highlights, a little less saturation) → linen canvas grain → soft vignette.
setup_paint(scene, size=…) wires it after the render layer; paint_tree() builds the chain on any socket (for tests)."""
import bpy

def _n(nt, kind, loc=(0, 0), **kw):
	n = nt.nodes.new(kind); n.location = loc
	for k, v in kw.items():
		try: setattr(n, k, v)
		except Exception: pass
	return n

def _set(n, name, v):
	if name in n.inputs:
		s = n.inputs[name]
		try: s.default_value = v; return True
		except Exception:
			try: s.default_value = str(v).capitalize(); return True
			except Exception: return False
	return False

def _mix(nt, blend, fac, a, b, loc):
	m = _n(nt, 'ShaderNodeMix', loc); m.data_type = 'RGBA'; m.blend_type = blend; m.clamp_result = True
	m.inputs['Factor'].default_value = fac
	nt.links.new(a, m.inputs[6]); nt.links.new(b, m.inputs[7]) if not isinstance(b, tuple) else None
	if isinstance(b, tuple): m.inputs[7].default_value = b
	return m

def _kuw(nt, src, size, loc, unif=4, sharp=1.0, ecc=1.0):
	k = _n(nt, 'CompositorNodeKuwahara', loc)
	_set(k, 'Size', size)
	if not _set(k, 'Type', 'Anisotropic'): _set(k, 'Type', 'ANISOTROPIC')
	_set(k, 'Uniformity', unif); _set(k, 'Sharpness', sharp); _set(k, 'Eccentricity', ecc); _set(k, 'High Precision', True)
	nt.links.new(src, k.inputs['Image'])
	return k

def paint_tree(nt, src, size=18, fine=6, canvas=0.08, sat=1.04, vignette=0.3, detail=0.22):
	k1 = _kuw(nt, src, size, (200, 0))
	k2 = _kuw(nt, src, fine, (200, -250))
	m = _mix(nt, 'MIX', detail, k1.outputs[0], k2.outputs[0], (420, 0))
	hs = _n(nt, 'CompositorNodeHueSat', (620, 0))
	_set(hs, 'Saturation', sat); _set(hs, 'Value', 1.0); _set(hs, 'Factor', 1.0); _set(hs, 'Fac', 1.0)
	nt.links.new(m.outputs[2], hs.inputs['Image'])
	# warm umber shadows / cream highlights: gentle curves per channel via lift-gamma-gain
	cb = _n(nt, 'CompositorNodeColorBalance', (820, 0))
	for nm, v in (('Lift', (1.035, 1.0, 0.95, 1)), ('Gamma', (1.02, 1.0, 0.965, 1)), ('Gain', (1.03, 1.0, 0.93, 1))):
		_set(cb, nm, v)
	try:
		cb.correction_method = 'LIFT_GAMMA_GAIN'; cb.lift = (1.035, 1.0, 0.95); cb.gamma = (1.02, 1.0, 0.965); cb.gain = (1.03, 1.0, 0.93)
	except Exception: pass
	nt.links.new(hs.outputs[0], cb.inputs['Image'])
	# linen canvas: fine noise × weave (two wave textures) in image space
	ic = _n(nt, 'CompositorNodeImageCoordinates', (620, -500))
	nt.links.new(src, ic.inputs[0]) if ic.inputs else None
	coord = ic.outputs.get('Pixel Coordinates') or ic.outputs[0]
	w1 = _n(nt, 'ShaderNodeTexWave', (820, -500)); w1.wave_type = 'BANDS'; w1.bands_direction = 'X'
	w1.inputs['Scale'].default_value = 0.35; w1.inputs['Distortion'].default_value = 2.0; w1.inputs['Detail'].default_value = 1.0
	w2 = _n(nt, 'ShaderNodeTexWave', (820, -700)); w2.wave_type = 'BANDS'; w2.bands_direction = 'Y'
	w2.inputs['Scale'].default_value = 0.35; w2.inputs['Distortion'].default_value = 2.0; w2.inputs['Detail'].default_value = 1.0
	nz = _n(nt, 'ShaderNodeTexNoise', (820, -900)); nz.inputs['Scale'].default_value = 0.08; nz.inputs['Detail'].default_value = 8
	sc_ = _n(nt, 'ShaderNodeVectorMath', (700, -600)); sc_.operation = 'SCALE'; sc_.inputs['Scale'].default_value = 0.01
	nt.links.new(coord, sc_.inputs[0])
	for t in (w1, w2, nz): nt.links.new(sc_.outputs[0], t.inputs['Vector'])
	gm = _n(nt, 'ShaderNodeMath', (1000, -600)); gm.operation = 'MULTIPLY'
	nt.links.new(w1.outputs['Fac'], gm.inputs[0]); nt.links.new(w2.outputs['Fac'], gm.inputs[1])
	gm2 = _n(nt, 'ShaderNodeMath', (1150, -650)); gm2.operation = 'MULTIPLY_ADD'
	nt.links.new(gm.outputs[0], gm2.inputs[0]); gm2.inputs[1].default_value = 0.6; nt.links.new(nz.outputs['Fac'], gm2.inputs[2])
	ov = _n(nt, 'ShaderNodeMix', (1300, 0)); ov.data_type = 'RGBA'; ov.blend_type = 'OVERLAY'; ov.clamp_result = True
	ov.inputs['Factor'].default_value = canvas
	nt.links.new(cb.outputs[0], ov.inputs[6]); nt.links.new(gm2.outputs[0], ov.inputs[7])
	# vignette (warm, soft)
	el = _n(nt, 'CompositorNodeEllipseMask', (1100, -1000))
	_set(el, 'Size', (1.15, 1.0)); _set(el, 'Width', 1.15); _set(el, 'Height', 1.0)
	try: el.width = 1.15; el.height = 1.0
	except Exception: pass
	bl = _n(nt, 'CompositorNodeBlur', (1300, -1000))
	_set(bl, 'Size', (260, 260))
	try: bl.size_x = 260; bl.size_y = 260
	except Exception: pass
	nt.links.new(el.outputs[0], bl.inputs['Image'] if 'Image' in bl.inputs else bl.inputs[0])
	inv = _n(nt, 'ShaderNodeMath', (1500, -1000)); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0
	nt.links.new(bl.outputs[0], inv.inputs[1])
	vf = _n(nt, 'ShaderNodeMath', (1650, -1000)); vf.operation = 'MULTIPLY'; vf.inputs[1].default_value = vignette
	nt.links.new(inv.outputs[0], vf.inputs[0])
	vg = _n(nt, 'ShaderNodeMix', (1800, 0)); vg.data_type = 'RGBA'; vg.blend_type = 'MULTIPLY'; vg.clamp_result = True
	nt.links.new(vf.outputs[0], vg.inputs['Factor']); nt.links.new(ov.outputs[2], vg.inputs[6]); vg.inputs[7].default_value = (0.55, 0.42, 0.32, 1)
	return vg.outputs[2]

def comp_tree(sc_):
	nt = getattr(sc_, 'compositing_node_group', None)
	if nt is None:
		nt = bpy.data.node_groups.new('paint', 'CompositorNodeTree')
		sc_.compositing_node_group = nt
	for n in list(nt.nodes): nt.nodes.remove(n)
	if not any(s.in_out == 'OUTPUT' for s in nt.interface.items_tree):
		nt.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
	return nt

def setup_paint(sc_, size=18, fine=6, canvas=0.08, sat=1.04, vignette=0.3, detail=0.22):
	try: sc_.render.use_compositing = True
	except Exception: pass
	nt = comp_tree(sc_)
	rl = _n(nt, 'CompositorNodeRLayers', (-200, 0))
	out = paint_tree(nt, rl.outputs['Image'], size, fine, canvas, sat, vignette, detail)
	go = _n(nt, 'NodeGroupOutput', (2000, 0)); nt.links.new(out, go.inputs[0])
	return nt
