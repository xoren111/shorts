#!/usr/bin/env python3
"""Shared YouTube helper for the topic hunt (PROMPT_TOPIC_HUNT.md §7). Safe to call from many agents at once:
every Innertube request takes a cross-process file lock and sleeps 2.5 s, so requests go out one at a time.

  hunt_yt.py search "<query>" [--lang en|ru|es|pt|hi|id|tr|ar|fr|th] [--all] [--sort views|recent] [--pages N]
      Shorts tab of the search (default) or --all results. Prints JSON {status, query, client, items[...]}.
      status = "ok" | "NOT_CHECKED" (403 / empty answer: competition is NOT verified, not "no competitors").
  hunt_yt.py info <id> [<id> ...]
      Data API videos.list: publishedAt, defaultAudioLanguage, defaultLanguage, duration_s, views, channel, title (original).
Everything is cached in yt_cache/. Innertube Shorts items carry no date and EN-client titles may be auto-translated:
use `info` for date / language / length of any video used as proof.
"""
import fcntl, hashlib, json, os, re, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.expanduser('~/shorts/markt-analyse/tools'))
sys.path.insert(0, os.path.expanduser('~/shorts/tools'))
import yt  # noqa: E402

CACHE = os.path.expanduser('~/shorts/atlas-ape/tools/.yt_cache')
LOCK = f'{CACHE}/.lock'
os.makedirs(CACHE, exist_ok=True)
LANGS = {'en': ('en', 'US'), 'ru': ('ru', 'RU'), 'es': ('es', 'MX'), 'pt': ('pt', 'BR'), 'hi': ('hi', 'IN'),
         'id': ('id', 'ID'), 'tr': ('tr', 'TR'), 'ar': ('ar', 'EG'), 'fr': ('fr', 'FR'), 'th': ('th', 'TH')}
SORT = {'views': 'CAM=', 'recent': 'CAI='}


def client(lang):
    hl, gl = LANGS[lang]
    return {'clientName': 'WEB', 'clientVersion': '2.20260915.01.00', 'hl': hl, 'gl': gl}


class Err:
    n = 0


def post(body, cl):
    """yt._post under the global lock; counts swallowed errors via stderr capture."""
    import io
    with open(LOCK, 'w') as lk:
        fcntl.flock(lk, fcntl.LOCK_EX)
        old, buf = sys.stderr, io.StringIO()
        sys.stderr = buf
        try:
            r = yt._post('search', body, client=cl)
        finally:
            sys.stderr = old
            time.sleep(2.5)
        errs = buf.getvalue().count('! search')
        Err.n += errs
        if errs:
            print(buf.getvalue().strip(), file=sys.stderr)
        return r


def search(q, lang='en', shorts=True, sort=None, pages=1):
    key = hashlib.sha1(json.dumps([q, lang, shorts, sort, pages]).encode()).hexdigest()[:16]
    path = f'{CACHE}/s_{key}.json'
    if os.path.exists(path):
        return json.load(open(path))
    cl = client(lang)
    body = {'query': q}
    if sort:
        body['params'] = SORT[sort]
    r = post(body, cl)
    items, status = [], 'ok'
    if shorts:
        tok = None
        for c in yt._walk(r, 'chipCloudChipRenderer'):
            if yt._text(c.get('text')).strip().lower() == 'shorts':
                tok = c.get('navigationEndpoint', {}).get('continuationCommand', {}).get('token')
        if not tok:
            status = 'NOT_CHECKED'
        else:
            r = post({'continuation': tok}, cl)
            items = yt.collect(r)
            for _ in range(pages - 1):
                t2 = yt._cont(r)
                if not t2:
                    break
                r = post({'continuation': t2}, cl)
                items += yt.collect(r)
    else:
        items = yt.collect(r)
        for _ in range(pages - 1):
            t2 = yt._cont(r)
            if not t2:
                break
            r = post({'continuation': t2}, cl)
            items += yt.collect(r)
    seen, res = set(), []
    for it in items:
        if it.get('id') and it['id'] not in seen:
            seen.add(it['id'])
            res.append({k: it.get(k) for k in ('id', 'title', 'views', 'views_text', 'kind', 'channel', 'len', 'published')
                        if it.get(k) is not None})
    if not res:
        status = 'NOT_CHECKED'
    out = {'status': status, 'query': q, 'lang': lang, 'shorts_tab': shorts, 'sort': sort, 'errors': Err.n, 'items': res}
    if status == 'ok':
        json.dump(out, open(path, 'w'), ensure_ascii=False)
    return out


def secs(d):
    m = re.match(r'P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', d or '')
    if not m:
        return None
    dd, h, mi, s = (int(x or 0) for x in m.groups())
    return dd * 86400 + h * 3600 + mi * 60 + s


def info(ids):
    path = f'{CACHE}/info.json'
    with open(LOCK + '.info', 'w') as lk:
        fcntl.flock(lk, fcntl.LOCK_EX)
        cache = json.load(open(path)) if os.path.exists(path) else {}
        todo = [i for i in dict.fromkeys(ids) if i not in cache]
        if todo:
            from yt_oauth import access_token, get
            at = access_token()
            for k in range(0, len(todo), 50):
                r = get('https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&maxResults=50&id='
                        + ','.join(todo[k:k + 50]), at)
                with open(os.path.expanduser('~/shorts/atlas-ape/analytics/newchan/quota_log.txt'), 'a') as ql:
                    ql.write(f"{time.strftime('%Y-%m-%dT%H:%M:%S')} topic-hunt videos.list {len(todo[k:k + 50])} ids 1 unit"
                             f" {r.get('http_status', 200)}\n")
                for it in r.get('items', []):
                    sn, st, cd = it['snippet'], it.get('statistics', {}), it['contentDetails']
                    cache[it['id']] = {'id': it['id'], 'title': sn.get('title'), 'channel': sn.get('channelTitle'),
                                       'channel_id': sn.get('channelId'), 'published': sn.get('publishedAt'),
                                       'audio_lang': sn.get('defaultAudioLanguage'), 'lang': sn.get('defaultLanguage'),
                                       'duration_s': secs(cd.get('duration')), 'views': int(st.get('viewCount', 0) or 0)}
                for i in todo[k:k + 50]:
                    cache.setdefault(i, {'id': i, 'missing': True})
            json.dump(cache, open(path, 'w'), ensure_ascii=False)
    return [cache[i] for i in ids]


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or a[0] not in ('search', 'info'):
        sys.exit(__doc__)
    if a[0] == 'info':
        print(json.dumps(info(a[1:]), ensure_ascii=False, indent=1))
    else:
        q, lang, shorts, sort, pages = a[1], 'en', True, None, 1
        i = 2
        while i < len(a):
            if a[i] == '--lang':
                lang = a[i + 1]; i += 2
            elif a[i] == '--all':
                shorts = False; i += 1
            elif a[i] == '--sort':
                sort = a[i + 1]; i += 2
            elif a[i] == '--pages':
                pages = int(a[i + 1]); i += 2
            else:
                sys.exit(f'unknown arg {a[i]}')
        print(json.dumps(search(q, lang, shorts, sort, pages), ensure_ascii=False, indent=1))
