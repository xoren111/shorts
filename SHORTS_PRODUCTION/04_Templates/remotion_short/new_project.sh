#!/bin/bash
# New Short from the canonical template:
#   bash 04_Templates/remotion_short/new_project.sh <slug> [dest]      default dest: SHORTS_PRODUCTION/05_Projects/<slug>
# Copies the template (without node_modules / out / whisper temp files / fetch_asset downloads in data/fetch), links the shared node_modules (Remotion 4.0.535 —
# never npm install inside a project) and sets slug / out_name in short/project.json. The demo scenes, events and demo VO stay
# in place so the copy runs at once; replace them (README.md, «Новый Short»). check.mjs refuses vo_demo.wav for any slug
# other than template-demo.
set -euo pipefail
[ $# -ge 1 ] || { echo "usage: $0 <slug> [dest]"; exit 2; }
SLUG="$1"
[[ "$SLUG" =~ ^[a-z0-9][a-z0-9-]*$ ]] || { echo "slug: lowercase letters, digits, dashes"; exit 2; }
T="$(cd "$(dirname "$0")" && pwd)"
SP="$(cd "$T/../.." && pwd)"
DEST="${2:-$SP/05_Projects/$SLUG}"
NM=/Users/khorengrigoryan/shorts/tools/remotion_nm/node_modules   # overlay: shared Remotion 4.0.535 (symlinks) + lottie, transitions, motion-blur, gif, layout-utils
[ -e "$DEST" ] && { echo "already exists: $DEST"; exit 1; }
[ -d "$NM/remotion" ] || { echo "shared node_modules missing: $NM"; exit 1; }
mkdir -p "$DEST"
rsync -a --exclude node_modules --exclude out --exclude 'data/vo16k.wav' --exclude 'data/whisper_words.json' --exclude 'data/fetch' --exclude __pycache__ --exclude '*.part' --exclude new_project.sh "$T/" "$DEST/"
mv "$DEST/README.md" "$DEST/TEMPLATE_README.md"
ln -s "$NM" "$DEST/short/node_modules"
/usr/bin/python3 - "$DEST/short/project.json" "$SLUG" <<'PY'
import json, sys
p, slug = sys.argv[1], sys.argv[2]
j = json.load(open(p, encoding='utf-8'))
j['slug'] = slug
j['out_name'] = slug.replace('-', '_') + '.mp4'
json.dump(j, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
open(p, 'a').write('\n')
PY
echo "✓ $DEST"
echo "next: FACTS.md → SCRIPT.md → voiceover.txt → VO (ElevenLabs PAID) → align → EDIT_PLAN.md → beats/events/scenes (TEMPLATE_README.md)"
