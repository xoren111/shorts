"""Negative tests of the fixed gates on the copy neg/short (each case patches files, runs a command, restores)."""
import subprocess, shutil, re, json
R = 'neg/short'
ORIG = {'src/scenes.tsx': 'scenes.orig.tsx', 'src/data/beats.ts': 'beats.orig.ts', 'project.json': 'project.orig.json'}
def restore():
    for dst, src in ORIG.items(): shutil.copy(f'{R}/{src}', f'{R}/{dst}')
def run(cmd):
    p = subprocess.run(cmd, cwd=R, shell=True, capture_output=True, text=True, env={'DEMO_OK': '1', 'PATH': '/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin'})
    return p.returncode, p.stdout + p.stderr
def patch(f, a, b):
    s = open(f'{R}/{f}').read(); assert a in s, (f, a[:60]); open(f'{R}/{f}', 'w').write(s.replace(a, b, 1))
IMP_K = "import {Bg, Burst, Confetti, Document, Sea, Seal, Ship} from './ui/draw';"
HOOK_END = """			<Stamp text="NEW" t0={W(3)} t1={t1} y={860} />"""
MAPSCENE = """
import {MapBase, MapCamera, MovingToken, asMap, routePath} from './ui/maps';
import lrJson from '../data/maps/demo_lisbon_rio.json';
const LRM = asMap(lrJson);
const RT = routePath(LRM, ['Lisboa', 'Rio de Janeiro'], {mode: 'smooth'});
export const MapHook: React.FC<SceneProps> = ({t0, t1}) => (
	<MapCamera map={LRM} keys={[{t: t0, at: 'Lisboa', zoom: 2}, {t: t1, at: 'Rio de Janeiro', zoom: 2}]} t0={t0}>
		<MapBase look="chart" />
		TOKEN
	</MapCamera>
);
"""
TOKEN = '<MovingToken d={RT} t0={t0} dur={1.2} kind="ship" size={100} />'
def mapcase(beats_new, token):
    patch('src/scenes.tsx', IMP_K, IMP_K + MAPSCENE.replace('TOKEN', TOKEN if token else ''))
    s = open(f'{R}/src/scenes.tsx').read()
    if 'MapHook,' not in s and 'MapHook}' not in s:
        s = re.sub(r'(export const SCENES[^=]*=\s*\{)', r'\1MapHook, ', s); open(f'{R}/src/scenes.tsx', 'w').write(s)
    patch('src/data/beats.ts', "	{k: 'hook', t0: 0.0, t1: W(8) - 0.05, tr: 'none', subY: 1300, scene: 'Hook'},", beats_new)
cases = []
def case(name, expect, setup, cmd='node tools/check.mjs', grep=r'R4|slam|kinetic|hide_subs'):
    restore(); setup()
    rc, out = run(cmd)
    lines = [l for l in out.splitlines() if re.search(grep, l) and l.strip()[:1] in '✗!✓' and 'test' not in l.lower()]
    cases.append((name, expect, rc, lines))
    print(f'## {name}\n   expect: {expect}\n   exit {rc}'); [print('   ', l[:330]) for l in lines]
K = '<Kinetic fromWord={0} toWord={3} preset="slam" />'
def k_setup(el, fix=False):
    def f():
        patch('src/scenes.tsx', IMP_K, IMP_K + "\nimport {Kinetic} from './ui/kinetic';")
        patch('src/scenes.tsx', HOOK_END, HOOK_END + '\n			' + el)
    return f
case('K1 slam 0–3 in the Short hook, hide_subs not set', 'exit 1 (T6) + warnings: frame 0 landed, This+is one hit', k_setup(K), 'node tools/kinetic_check.mjs')
case('K1b same after kinetic_check --fix', 'exit 0, hide_subs += [0, 3], the two slam warnings stay', k_setup(K), 'node tools/kinetic_check.mjs --fix && node tools/check.mjs')
case('K2 control: slam 8–10 (starts 2.06 s, gaps ≥ 0.22 s)', 'no slam warning', k_setup('<Kinetic fromWord={8} toWord={10} preset="slam" />'), 'node tools/kinetic_check.mjs --fix')
case('K3 slam oneWord 0–3', 'warnings: frame 0 + «oneWord: pushed to +0.12 s»', k_setup('<Kinetic fromWord={0} toWord={3} preset="slam" oneWord />'), 'node tools/kinetic_check.mjs --fix')
HB = "	{k: 'hook', t0: 0.0, t1: W(8) - 0.05, tr: 'none', subY: 1300, scene: 'MapHook'{live}},"
case('N3 map first shot at 0 s, no live', 'exit 1 (R4/H1)', lambda: mapcase(HB.replace('{live}', ''), False))
case('N3b map at 0 s, live: true, no token', 'exit 1 (R4/H1 frame 0) + live-without-action warning', lambda: mapcase(HB.replace('{live}', ', live: true'), False))
case('N3c map at 0 s, live: true + MovingToken', 'exit 1 (R4/H1 frame 0)', lambda: mapcase(HB.replace('{live}', ', live: true'), True))
SPLIT = "	{k: 'hook', t0: 0.0, t1: 0.5, tr: 'none', subY: 1300, scene: 'Hook'},\n	{k: 'maphook', t0: 0.5, t1: W(8) - 0.05, tr: 'none', subY: 1300, scene: 'MapHook'{live}},"
case('N3d live footage 0–0.5 s, then map at 0.5 s with live: true + MovingToken', 'exit 0 (R4 ok: live in the hook, not frame 0)', lambda: mapcase(SPLIT.replace('{live}', ', live: true'), True))
case('N3e map at 0.5 s without live', 'exit 1 (R4)', lambda: mapcase(SPLIT.replace('{live}', ''), True))
restore()
json.dump([{'case': c[0], 'expect': c[1], 'exit': c[2], 'lines': c[3]} for c in cases], open('negtests.json', 'w'), ensure_ascii=False, indent=1)
