#!/usr/bin/env python3
"""GIPHY search for meme ideas: metadata table + preview board loaded straight from GIPHY (nothing stored).

GIPHY API rules (developers.giphy.com/docs/api, checked 2026-10-24): beta key = 100 calls/hour; media must be loaded
from the returned URLs and not cached, proxied or stored without GIPHY's approval; show "Powered By GIPHY".
So this tool never downloads GIF/MP4 files. Using a meme in a video is the owner's per-video decision; GIPHY does not
own most content (the uploader/studio does) — the table shows who uploaded it to judge the risk.

usage: giphy.py search "query" [--n 12] [--rating g|pg|pg-13]   → table + board HTML path
Key: GIPHY_API_KEY in ~/shorts/SHORTS_PRODUCTION/.env.assets (never printed).
"""
import html, json, os, re, sys, urllib.parse, urllib.request

ROOT = os.path.expanduser('~/shorts/SHORTS_PRODUCTION')
BOARDS = f'{ROOT}/08_QA_Reports/giphy_boards'


def key():
    for line in open(f'{ROOT}/.env.assets'):
        if line.startswith('GIPHY_API_KEY='):
            return line.split('=', 1)[1].strip()
    sys.exit('GIPHY_API_KEY missing in .env.assets')


def search(query, n=12, rating='pg'):
    url = 'https://api.giphy.com/v1/gifs/search?' + urllib.parse.urlencode(
        {'api_key': key(), 'q': query, 'limit': min(n, 50), 'rating': rating, 'lang': 'en'})
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'ShortsProduction/1.0'}), timeout=30) as r:
        data = json.load(r)['data']
    cards = []
    for g in data:
        user = g.get('user') or {}
        owner = user.get('display_name') or g.get('username') or '—'
        verified = bool(user.get('is_verified'))
        src = g.get('source_tld') or ''
        # no uploader usually means a TV/film/celebrity clip added by GIPHY editors — the studio owns it
        risk = ('HIGH: official brand/studio account' if verified else
                'MED: user upload (creator or rip)' if user else
                'HIGH?: no uploader — likely TV/film clip' + (f' ({src})' if src else ''))
        im = g['images']
        o = im.get('original', {})
        print(f"{g['id']:<20} {o.get('width', '?')}x{o.get('height', '?'):<5} {owner[:22]:<22} {'✔' if verified else ' '} "
              f"{risk:<34} {g.get('title', '')[:40]:<40} {g.get('url')}")
        prev = (im.get('fixed_height') or o).get('url', '')
        cards.append(f"<figure><img src=\"{html.escape(prev)}\" loading=lazy><figcaption><b>{html.escape(g.get('title', '')[:60])}</b><br>"
                     f"{html.escape(owner)}{' ✔' if verified else ''} · {o.get('width')}×{o.get('height')}<br><i>{html.escape(risk)}</i><br>"
                     f"<a href=\"{html.escape(g.get('url', ''))}\" target=_blank>GIPHY page</a></figcaption></figure>")
    os.makedirs(BOARDS, exist_ok=True)
    out = f"{BOARDS}/{re.sub(r'[^a-z0-9]+', '_', query.lower()).strip('_')}.html"
    open(out, 'w').write(
        f"<!doctype html><meta charset=utf-8><title>GIPHY: {html.escape(query)}</title><style>body{{background:#18181c;color:#ddd;"
        f"font:14px system-ui;margin:16px}}main{{display:flex;flex-wrap:wrap;gap:12px}}figure{{margin:0;width:260px}}img{{width:260px;"
        f"border-radius:6px}}a{{color:#8cf}}.pb{{margin:12px 0;font-weight:700}}</style><h2>«{html.escape(query)}» — {len(cards)} results</h2>"
        f"<div class=pb>Powered By GIPHY · media loaded directly from GIPHY, not stored · use in videos = owner's per-video decision</div>"
        f"<main>{''.join(cards)}</main>")
    print('board:', out)


if __name__ == '__main__':
    a = sys.argv[1:]
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    if len(a) >= 2 and a[0] == 'search':
        search(a[1], int(opt('--n', 12)), opt('--rating', 'pg'))
    else:
        print(__doc__)
