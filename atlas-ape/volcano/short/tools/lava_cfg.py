"""data/flows.json (+ GIS outlines in data/flowmaps) → data/lava_cfg.json for tools/lava_maps.py"""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
F = json.load(open(ROOT / 'data/flows.json'))

def ring_ll(ring):  # GeoJSON [lon, lat] → [lat, lon]
	return [[p[1], p[0]] for p in ring]

ml = json.load(open(ROOT / 'data/flowmaps/ml1935_main.json'))
ml_poly = [[ring_ll(r) for r in ml['coordinates']]]
et = json.load(open(ROOT / 'data/flowmaps/etna/lave1992_osm.geojson.json'))
et_poly = [[ring_ll(r) for r in et['coordinates']]]
M, E, H = F['mauna_loa_1935'], F['etna_1991_93'], F['eldfell_1973']
cfg = {
	'hawaii': {'flows': [
		{'channel': 0, 'polygon': ml_poly, 'centerline': M['paths']['main'], 'width_m': 900, 'lateral': 0.3, 'front_wobble': 0.012},
	]},
	'etna': {'flows': [
		{'channel': 0, 'polygon': et_poly, 'centerline': E['paths']['original'], 'ribbon': True, 'width_m': 700, 'width_end_m': 220, 'lateral': 0.3, 'front_wobble': 0.02},
		{'channel': 1, 'centerline': E['paths']['diverted'], 'width_m': 260, 'width_end_m': 520, 'lateral': 0.4},
	]},
	'heimaey': {'flows': [
		{'channel': 0, 'polygon': [[H['field_outline']]], 'lobes': [
			{'centerline': H['paths']['east_sea_lobe'], 'offset': 0.0, 'scale': 0.22},
			{'centerline': H['paths']['south_lobe'], 'offset': 0.04, 'scale': 0.2},
			{'centerline': H['paths']['harbor_lobe'], 'offset': 0.2, 'scale': 0.6},
			{'centerline': H['paths']['town_lobe'], 'offset': 0.55, 'scale': 0.4},
		], 'width_m': 450, 'lateral': 0.25, 'front_wobble': 0.01},
		{'channel': 2, 'kind': 'fissure', 'line': H['fissure'], 'width_m': 45},
	]},
}
cfg['hawaii_flow'] = cfg['hawaii']
cfg['hawaii_vent'] = cfg['hawaii']
json.dump(cfg, open(ROOT / 'data/lava_cfg.json', 'w'))
print('lava_cfg.json written')
