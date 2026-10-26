#!/usr/bin/env python3
"""Freesound API helper: search (token), download originals (OAuth, auto-refresh), log licence data.

Only CC0 and CC BY are offered/downloaded (NC and Sampling+ are skipped). Freesound API limits (standard):
60 requests/min, 2000/day — keep downloads targeted to a project.

usage:
  freesound.py search "query" [--n 15] [--license cc0|ccby|any] [--max-dur 10]
  freesound.py get ID --dest DIR [--name short_desc]
Credentials: FREESOUND_CLIENT_ID / FREESOUND_API_KEY in ~/shorts/SHORTS_PRODUCTION/.env.assets,
OAuth token in ~/shorts/SHORTS_PRODUCTION/.freesound_token.json (both 0600, never printed).
"""
import hashlib, json, os, re, sys, time, urllib.parse, urllib.request

ROOT = os.path.expanduser('~/shorts/SHORTS_PRODUCTION')
TOKEN = f'{ROOT}/.freesound_token.json'
LOG = f'{ROOT}/02_Research/download_logs/freesound.json'
API = 'https://freesound.org/apiv2'
LIC = {'cc0': 'license:"Creative Commons 0"', 'ccby': 'license:"Attribution"',
       'any': '(license:"Creative Commons 0" OR license:"Attribution")'}


def env(k):
    for line in open(f'{ROOT}/.env.assets'):
        if line.startswith(k + '='):
            return line.split('=', 1)[1].strip()
    sys.exit(f'{k} missing in .env.assets')


def call(url, headers, data=None):
    req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode() if data else None, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def bearer():
    t = json.load(open(TOKEN))
    if time.time() > t['obtained_at'] + t['expires_in'] - 300:
        t = json.loads(call(f'{API}/oauth2/access_token/', {}, {
            'client_id': env('FREESOUND_CLIENT_ID'), 'client_secret': env('FREESOUND_API_KEY'),
            'grant_type': 'refresh_token', 'refresh_token': t['refresh_token']}))
        t['obtained_at'] = int(time.time())
        old = os.umask(0o077)
        json.dump(t, open(TOKEN, 'w'))
        os.umask(old)
    return {'Authorization': f"Bearer {t['access_token']}"}


def search(query, n=15, lic='any', max_dur=None):
    f = LIC[lic] + (f' duration:[0 TO {max_dur}]' if max_dur else '')
    q = urllib.parse.urlencode({'query': query, 'filter': f, 'page_size': min(n, 150), 'sort': 'rating_desc',
                                'fields': 'id,name,license,duration,type,samplerate,bitdepth,username,avg_rating'})
    d = json.loads(call(f'{API}/search/text/?{q}', {'Authorization': f"Token {env('FREESOUND_API_KEY')}"}))
    for s in d['results']:
        lic_s = 'CC0' if 'zero' in s['license'] else 'CC BY' if '/by/' in s['license'] else s['license']
        print(f"{s['id']:>8}  {s['duration']:6.2f}s  {s['type']:<4} {int(s['samplerate'] or 0):>6} Hz {s.get('bitdepth') or '':>2}bit  "
              f"{lic_s:<6} {s['username'][:16]:<16} {s['name'][:50]}")


def get(sid, dest, name=None):
    h = bearer()
    m = json.loads(call(f'{API}/sounds/{sid}/?fields=id,name,license,type,username,url,duration,samplerate,bitdepth', h))
    if not ('zero' in m['license'] or '/by/' in m['license']):
        sys.exit(f"skip {sid}: licence {m['license']} is not CC0 / CC BY")
    slug = name or re.sub(r'[^a-z0-9]+', '_', os.path.splitext(m['name'])[0].lower()).strip('_')[:40]
    os.makedirs(dest, exist_ok=True)
    out = os.path.join(dest, f"sfx_{slug}_freesound_{sid}.{m['type']}")
    open(out, 'wb').write(call(f'{API}/sounds/{sid}/download/', h))
    cc0 = 'zero' in m['license']
    log = json.load(open(LOG)) if os.path.exists(LOG) else {'label': 'freesound', 'downloaded': []}
    log['downloaded'].append({
        'file': os.path.relpath(out, ROOT) if out.startswith(ROOT) else out, 'source_name': 'Freesound (API, original)',
        'source_page': m['url'], 'author': m['username'], 'license_name': 'CC0 1.0' if cc0 else 'CC BY',
        'license_url': m['license'], 'commercial_ok': True, 'attribution_required': not cc0,
        'attribution_text': None if cc0 else f"\"{m['name']}\" by {m['username']} (freesound.org), {m['license']}",
        'bytes': os.path.getsize(out), 'sha256': hashlib.sha256(open(out, 'rb').read()).hexdigest(),
        'media_info': f"{m['type']} {m.get('samplerate')} Hz {m.get('bitdepth')} bit, {m['duration']:.2f} s",
        'date': time.strftime('%Y-%m-%d')})
    json.dump(log, open(LOG, 'w'), ensure_ascii=False, indent=1)
    print(out)


if __name__ == '__main__':
    a = sys.argv[1:]
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    if len(a) >= 2 and a[0] == 'search':
        search(a[1], int(opt('--n', 15)), opt('--license', 'any'), opt('--max-dur'))
    elif len(a) >= 2 and a[0] == 'get':
        get(a[1], opt('--dest', '.'), opt('--name'))
    else:
        print(__doc__)
