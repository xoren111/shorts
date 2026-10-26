#!/bin/bash
# QA run of a finished Short (standard 9E) → 08_QA_Reports/<slug>/ (measure.json, spec.txt, loudness.txt, dupes/blinks logs).
#   bash tools/qa.sh [video]        default: out/FINAL/<out_name>
#   VARIANT=B bash tools/qa.sh      A/B version (R2): out/FINAL/<stem>_B_yt.mp4 (else <stem>_B.mp4) → 08_QA_Reports/<slug>/ab_B/
#   QA_DIR=<folder> bash tools/qa.sh            report files elsewhere (tests)
#   VARIETY_REGISTRY=<folder> bash tools/qa.sh  feed-variety registry elsewhere (tests; default 06_Exports/_variety_registry)
# <stem> = project.json out_name without .mp4 (new_project.sh: the slug with «-» → «_»).
# The <slug>_QA.md verdict is written by hand from these files (thresholds by level: standard section 8).
# Gates printed as PASS / FAIL: motion M1–M4 by project.level (standard 8 / 9E → motion_gates.txt), forbidden files by content
# (tools/quarantine_gate.mjs → quarantine_gate.txt), by name (forbidden.txt) and feed variety (tools/variety_check.py →
# variety.txt + variety_sheet.jpg: frame 0 near-identical to one of the channel's last Shorts). Exit 1 if any gate FAILs; M1 below the gate
# may still be accepted as WARN with the reason written into <slug>_QA.md (9E M1).
# python3 WITHOUT -I (numpy / Pillow come from the user site-packages).
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SP="$(cd "$ROOT/../../.." && pwd)"   # SHORTS_PRODUCTION (template and projects sit two levels below it)
read -r SLUG NAME LEVEL < <(/usr/bin/python3 -c "import json,sys;p=json.load(open(sys.argv[1]));print(p['slug'], p.get('out_name') or p['slug']+'.mp4', p.get('level') or 'L2')" "$ROOT/project.json")
FAILS=0
Q="$SP/08_QA_Reports/$SLUG"
if [ -n "${VARIANT:-}" ]; then
  NAME="${NAME%.mp4}_${VARIANT}.mp4"; Q="$Q/ab_${VARIANT}"
  [ -f "$ROOT/out/FINAL/${NAME%.mp4}_yt.mp4" ] && NAME="${NAME%.mp4}_yt.mp4"
fi
V="${1:-$ROOT/out/FINAL/$NAME}"
[ "${QA_DIR:-}" ] && Q="$QA_DIR"
mkdir -p "$Q"
echo "QA of $V → $Q"
/usr/bin/python3 "$ROOT/tools/measure.py" "$V" --whisper ~/.cache/whisper/ggml-large-v3-turbo.bin > "$Q/measure.json" && echo "✓ measure.json"
/usr/bin/python3 - "$Q/measure.json" "$LEVEL" <<'PY' | tee "$Q/motion_gates.txt"
import json, sys
try:
    m = json.load(open(sys.argv[1]))
except Exception as e:
    print('FAIL motion gates: measure.json unreadable (%s)' % e)
    sys.exit(1)
mps = m.get('motion_per_sec', [])
run = c = 0
for x in mps:
    c = c + 1 if x < 1 else 0
    run = max(run, c)
m16 = round(sum(mps[1:6]) / 5, 2) if len(mps) >= 6 else None
print('  motion_0_1', m.get('motion_0_1'), '| motion 1-6', m16,
      '| motion_mean', m.get('motion_mean'), '| static run', run, '| cuts/10s', m.get('cuts_per_10s'), '| words/s', m.get('words_per_s'))
# standard section 8 / 9E: M1 motion 0-1 >=, M2 mean of seconds 1-6 >=, M3 motion_mean >=, M4 seconds in a row < 1.0 <=
G = {'L1': (12, 6, 4, 1), 'L2': (20, 10, 7, 0), 'L3': (24, 15, 10, 0)}
lv = sys.argv[2] if sys.argv[2] in G else 'L2'
if lv != sys.argv[2]:
    print('  level %r unknown -> L2 gates (R1 default)' % sys.argv[2])
fails = 0
for code, name, val, need, at_most in [('M1', 'motion 0-1', m.get('motion_0_1'), G[lv][0], False),
                                       ('M2', 'motion 1-6 mean', m16, G[lv][1], False),
                                       ('M3', 'motion_mean', m.get('motion_mean'), G[lv][2], False),
                                       ('M4', 'static run (s with motion < 1.0)', run if mps else None, G[lv][3], True)]:
    ok = val is not None and (val <= need if at_most else val >= need)
    fails += not ok
    hint = ' -> redo the hook or write the reason into the QA verdict (9E M1: then WARN)' if code == 'M1' and not ok else ''
    print('%s %s %s = %s (%s %s %s)%s' % ('PASS' if ok else 'FAIL', code, name, val, lv, '<=' if at_most else '>=', need, hint))
sys.exit(1 if fails else 0)
PY
[ "${PIPESTATUS[0]}" -eq 0 ] || { n=$(grep -c '^FAIL' "$Q/motion_gates.txt"); FAILS=$((FAILS + (n > 0 ? n : 1))); }
ffprobe -v error -show_entries stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,color_space,color_primaries,color_transfer,color_range,sample_rate,channels,bit_rate -show_entries format=duration -of default=nw=1 "$V" > "$Q/spec.txt" && echo "✓ spec.txt"
ffprobe -v trace "$V" 2>&1 | grep -o "type:'\(moov\|mdat\)'" | head -2 >> "$Q/spec.txt"
ffprobe -v error -select_streams v:0 -skip_frame nokey -show_entries frame=pts_time -of csv=p=0 "$V" | head -5 | sed 's/^/keyframe /' >> "$Q/spec.txt"
ffmpeg -hide_banner -nostats -i "$V" -af ebur128=peak=true -f null - 2>&1 | tail -12 > "$Q/loudness.txt" && echo "✓ loudness.txt"
if [ -f "$ROOT/out/sound/music_ducked.wav" ]; then
  for s in "$ROOT/out/sound/final_mix.wav" "$ROOT/out/sound/music_ducked.wav"; do printf "%s " "$(basename "$s")"; ffmpeg -hide_banner -nostats -i "$s" -af ebur128 -f null - 2>&1 | awk '/Summary/{f=1} f&&/ I:/{print $2" LUFS"; exit}'; done > "$Q/stems.txt"
fi
(cd "$ROOT" && /usr/bin/python3 tools/dupes.py "$V") > "$Q/dupes.txt" 2>&1; echo "dupes exit $? (0 = no DUP/CLUTTER)"
(cd "$ROOT" && /usr/bin/python3 tools/blinks.py "$V") > "$Q/blinks.txt" 2>&1; echo "blinks done"
(cd "$ROOT" && /usr/bin/python3 tools/cut_frames.py "$V") > "$Q/cut_frames.txt" 2>&1; echo "cut sheets → $ROOT/out/qa/cuts"
# FREE-key ElevenLabs SFX, Mixkit (replaced + quarantined), quarantine (_quarantine/README.md); memes are checked by check.mjs
# (standard R7), not forbidden. In index.json the library-log keys replaces_mixkit* name the Mixkit file a legal replacement
# replaced — they are dropped before matching (standard 9D п. 1 copies only name/file/duration/transient_at/license/attribution_required).
PAT='_el\.wav|crowd_cheer_short|mixkit|_quarantine|rolling_eyes|baker_1946|safety_last'
{
  grep -rliE "$PAT" "$ROOT/src" 2>/dev/null
  /usr/bin/python3 - "$ROOT/public/sfx/index.json" "$PAT" <<'PY'
import json, re, sys
d = json.load(open(sys.argv[1]))
for s in d:
    for k in [k for k in s if k.startswith('replaces_mixkit')]:
        s.pop(k)
if re.search(sys.argv[2], json.dumps(d, ensure_ascii=False), re.I):
    print(sys.argv[1])
PY
} > "$Q/forbidden.txt"
if [ -s "$Q/forbidden.txt" ]; then echo "FAIL forbidden files referenced:"; cat "$Q/forbidden.txt"; FAILS=$((FAILS + 1)); else echo "PASS no forbidden files referenced"; fi
# the same files renamed or byte-identical: sha256 of public/ (+ local project.music) vs quarantine, download logs, FREE-key
# ElevenLabs (a re-encoded copy has other bytes and is not caught)
if [ -f "$ROOT/tools/quarantine_gate.mjs" ]; then
  if (cd "$ROOT" && node tools/quarantine_gate.mjs) > "$Q/quarantine_gate.txt" 2>&1; then echo "PASS $(tail -1 "$Q/quarantine_gate.txt" | sed 's/^✓ //')"
  else echo "FAIL quarantine hash gate:"; grep -v '^$' "$Q/quarantine_gate.txt"; FAILS=$((FAILS + 1)); fi
fi
# feed variety (standard 4.1 H14, 4.2 R-13, 9E D1–D3): frames 0 / 1 / 2 s and the EDIT_PLAN lines «Визуальная идея» / «Кадр 0»
# against the channel's last Shorts (SHORTS_PRODUCTION/06_Exports/_variety_registry or $VARIETY_REGISTRY, project.variety.window;
# time search ±0.5 s, so a trimmed or padded copy is still caught) → variety.txt + variety_sheet.jpg. ERROR (frame 0
# near-identical) or a tool failure = FAIL; WARNING = WARN, reason into <slug>_QA.md. The template demo (slug template-demo) is
# skipped. Registration after delivery: step 9F (variety_check.py --register).
if [ -f "$ROOT/tools/variety_check.py" ]; then
  /usr/bin/python3 "$ROOT/tools/variety_check.py" "$V" --sheet "$Q/variety_sheet.jpg" > "$Q/variety.txt" 2>&1; VRC=$?
  if [ "$VRC" -eq 0 ]; then
    tail -1 "$Q/variety.txt"; grep '^WARNING' "$Q/variety.txt" | sed 's/^/  /'
    [ -n "${VARIETY_REGISTRY:-}" ] && echo "  (registry: VARIETY_REGISTRY=$VARIETY_REGISTRY)"
  else
    echo "FAIL feed variety (variety_check.py exit $VRC):"
    if grep -qE '^(ERROR|FAIL)' "$Q/variety.txt"; then grep -E '^(ERROR|WARNING|FAIL)' "$Q/variety.txt" | sed 's/^/  /'; else tail -3 "$Q/variety.txt" | sed 's/^/  /'; fi
    FAILS=$((FAILS + 1))
  fi
fi
echo "QA gates: $FAILS FAIL → $Q"
[ "$FAILS" -eq 0 ]
