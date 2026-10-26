#!/usr/bin/env python3
"""Pixabay API helper: search with a 24 h cache, download by id, log licence data.

Rules (pixabay.com/api/docs, checked 2026-10-24): ≤100 requests / 60 s, cache requests for 24 h,
real human-driven queries only, no systematic mass downloads, download images (no hotlinking).
Images: largeImageURL (1280 px) — originals need "full API access". Videos: large/medium/small/tiny.

usage:
  pixabay.py search images|videos "query" [--n 20] [--orientation vertical|horizontal] [--min-width 1080]
  pixabay.py get images|videos ID --dest DIR [--quality large|medium|small] [--name short_desc]
Key: PIXABAY_API_KEY in ~/shorts/SHORTS_PRODUCTION/.env.assets (never printed).
"""
import hashlib, json, os, re, sys, time, urllib.parse, urllib.request

ROOT = os.path.expanduser('~/shorts/SHORTS_PRODUCTION')
CACHE = f'{ROOT}/02_Research/pixabay_cache'
LOG = f'{ROOT}/02_Research/download_logs/pixabay.json'
TTL = 24 * 3600
UA = 'ShortsProduction/1.0 (personal YouTube Shorts asset search; Pixabay API)'


def key():
    for line in open(f'{ROOT}/.env.assets'):
        if line.startswith('PIXABAY_API_KEY='):
            return line.split('=', 1)[1].strip()
    sys.exit('PIXABAY_API_KEY missing in .env.assets')


def api(kind, params):
    os.makedirs(CACHE, exist_ok=True)
    base = 'https://pixabay.com/api/' + ('videos/' if kind == 'videos' else '')
    q = dict(sorted(params.items()))
    cf = f'{CACHE}/{hashlib.sha1((kind + json.dumps(q)).encode()).hexdigest()}.json'
    if os.path.exists(cf) and time.time() - os.path.getmtime(cf) < TTL:
        return json.load(open(cf))
    time.sleep(0.7)  # stay far below 100 req / 60 s
    url = base + '?' + urllib.parse.urlencode({'key': key(), 'safesearch': 'true', **q})
    # Cloudflare in front of the API rejects Python's default User-Agent; identify the client instead
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30) as r:
        data = json.load(r)
    json.dump(data, open(cf, 'w'))
    return data


def search(kind, query, n=20, orientation=None, min_width=None):
    # the videos endpoint has no orientation filter: fetch more and filter by frame size here
    p = {'q': query, 'per_page': 200 if kind == 'videos' and orientation else max(3, min(n, 200))}
    if orientation and kind == 'images':
        p['orientation'] = orientation
    if min_width:
        p['min_width'] = min_width
    hits = api(kind, p)['hits']
    if orientation and kind == 'videos':
        tall = lambda h: h['videos']['medium']['height'] > h['videos']['medium']['width']
        hits = [h for h in hits if tall(h) == (orientation == 'vertical')]
    for h in hits[:n]:
        if kind == 'images':
            dims = f"{h['imageWidth']}x{h['imageHeight']}"
        else:
            v = h['videos']['large'] if h['videos']['large'].get('url') else h['videos']['medium']
            dims = f"{v['width']}x{v['height']} {h['duration']}s"
        vert = ' VERTICAL' if (kind == 'images' and h['imageHeight'] > h['imageWidth']) or \
            (kind == 'videos' and h['videos']['medium']['height'] > h['videos']['medium']['width']) else ''
        print(f"{h['id']:>9}  {dims:<18}{vert:<9} {h['tags'][:60]:<60} {h['pageURL']}")


def get(kind, pid, dest, quality='large', name=None):
    h = api(kind, {'id': pid})['hits'][0]
    if kind == 'images':
        url, ext, info = h['largeImageURL'], 'jpg', f"{h['imageWidth']}x{h['imageHeight']} original, 1280 px delivered"
    else:
        v = h['videos'][quality] if h['videos'][quality].get('url') else h['videos']['medium']
        url, ext, info = v['url'], 'mp4', f"{v['width']}x{v['height']}, {h['duration']} s"
    slug = name or re.sub(r'[^a-z0-9]+', '_', h['tags'].split(',')[0].lower()).strip('_')
    os.makedirs(dest, exist_ok=True)
    out = os.path.join(dest, f"{'img' if kind == 'images' else 'vid'}_{slug}_pixabay_{pid}.{ext}")
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=120) as r, open(out, 'wb') as f:
        f.write(r.read())
    sha = hashlib.sha256(open(out, 'rb').read()).hexdigest()
    log = json.load(open(LOG)) if os.path.exists(LOG) else {'label': 'pixabay', 'downloaded': []}
    log['downloaded'].append({
        'file': os.path.relpath(out, ROOT) if out.startswith(ROOT) else out, 'source_name': 'Pixabay (API)',
        'source_page': h['pageURL'], 'author': h.get('user'), 'license_name': 'Pixabay Content License',
        'license_url': 'https://pixabay.com/service/license-summary/', 'commercial_ok': True,
        'attribution_required': False, 'bytes': os.path.getsize(out), 'sha256': sha, 'media_info': info,
        'tags': h['tags'], 'date': time.strftime('%Y-%m-%d')})
    json.dump(log, open(LOG, 'w'), ensure_ascii=False, indent=1)
    print(out)


if __name__ == '__main__':
    a = sys.argv[1:]
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    if len(a) >= 3 and a[0] == 'search':
        search(a[1], a[2], int(opt('--n', 20)), opt('--orientation'), opt('--min-width'))
    elif len(a) >= 3 and a[0] == 'get':
        get(a[1], a[2], opt('--dest', '.'), opt('--quality', 'large'), opt('--name'))
    else:
        print(__doc__)
