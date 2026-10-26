"""Shot windows — the Python source of truth; tools/shots_ts.py writes src/data/shots.ts from it. SHOT(key) → (t0, t1 + XF + 0.05).
VO = ../vo_silas_v4_gen1_tight.wav (Eleven v4 «Silas», generation 1, pauses cut to 0.22 s, NO speed-up: owner 22.10)."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
_w = json.load(open(ROOT / 'data/words.json'))
LEAD, XF = 0.3, 0.4
VO_END = 43.15
END = 43.85          # VO end + 0.7 s loop dissolve back into frame 0
def at(i, lead=LEAD): return round(_w[i]['s'] - lead, 3)
S = {
	'hook': (0.0, at(10)),            # America and Britain almost went to war. Over one pig.
	'caught': (at(10), at(17)),       # A farmer caught it eating his potatoes.
	'shot': (at(17), at(21)),         # So he shot it.
	'british': (at(21), at(30)),      # Problem: the farmer was American. The pig was British.
	'price': (at(30), at(39)),        # He offered ten dollars. The owner wanted a hundred.
	'map': (at(39), at(45)),          # Worse, both countries claimed the island.
	'soldiers': (at(45), at(51)),     # America sent over four hundred soldiers.
	'warships': (at(51), at(55)),     # Britain sent five warships.
	'governor': (at(55), at(61)),     # The governor wanted the Americans gone.
	'admiral': (at(61), at(69)),      # The admiral said no. Not over a pig.
	'stayed': (at(69), at(77)),       # So both sides just stayed. For twelve years.
	'party': (at(77), at(80)),        # And partied together.
	'kaiser': (at(80), at(86)),       # Then a German emperor settled it.
	'mapfinal': (at(86), at(91)),     # The island went to America.
	'finale': (at(91), END),          # Total casualties: one pig. Team farmer, or team pig?
}
def SHOT(k, tail=XF + 0.05):
	a, b = S[k]
	return a, b + (tail if k != 'finale' else 0.0)
