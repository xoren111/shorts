import sys, json
sys.path.insert(0, '/Users/khorengrigoryan/shorts/atlas-ape/tools')
import measure
ws = measure.words(sys.argv[1], '/Users/khorengrigoryan/.cache/whisper/ggml-large-v3-turbo.bin')
json.dump([{'t0': a, 't1': b, 'w': t} for a, b, t in ws], open(sys.argv[2], 'w'), indent=0)
print(' '.join(f'{a:.2f}:{t}' for a, b, t in ws))
