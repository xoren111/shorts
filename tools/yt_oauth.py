#!/usr/bin/env python3
"""One-time YouTube OAuth (read-only) + smoke test of the Data and Analytics APIs.

  yt_oauth.py login   — prints a Google consent URL, catches the redirect on http://127.0.0.1:8765,
                        stores the refresh token in SHORTS_PRODUCTION/.youtube_token.json (0600), then runs `test`
  yt_oauth.py test    — channel of the token + 28-day per-video Analytics report
Scopes: youtube.readonly, yt-analytics.readonly (nothing can be changed on the channel with this token).
"""
import base64, datetime, hashlib, http.server, json, os, secrets, sys, urllib.parse, urllib.request

ROOT = os.path.expanduser('~/shorts/SHORTS_PRODUCTION')
TOKEN = f'{ROOT}/.youtube_token.json'
PORT = 8765
REDIRECT = f'http://127.0.0.1:{PORT}'
SCOPES = 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly'


def env(k):
    for line in open(f'{ROOT}/.env.assets'):
        if line.startswith(k + '='):
            return line.split('=', 1)[1].strip()
    sys.exit(f'{k} missing in .env.assets')


def post(url, data):
    req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode())
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        return json.loads(e.read() or b'{}') | {'http_status': e.code}


def get(url, token):
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        return json.loads(e.read() or b'{}') | {'http_status': e.code}


def login():
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
    state = secrets.token_urlsafe(16)
    url = 'https://accounts.google.com/o/oauth2/v2/auth?' + urllib.parse.urlencode({
        'client_id': env('YOUTUBE_OAUTH_CLIENT_ID'), 'redirect_uri': REDIRECT, 'response_type': 'code', 'scope': SCOPES,
        'access_type': 'offline', 'prompt': 'consent', 'state': state, 'code_challenge': challenge,
        'code_challenge_method': 'S256'})
    print('OPEN THIS URL:', url, flush=True)
    got = {}

    class H(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            if 'code' in q or 'error' in q:
                got.update({k: v[0] for k, v in q.items()})
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write('<h2>Готово, можно закрыть вкладку и вернуться в Claude.</h2>'.encode())

        def log_message(self, *a):
            pass

    srv = http.server.HTTPServer(('127.0.0.1', PORT), H)
    srv.timeout = 900
    while not got:
        srv.handle_request()
    if got.get('error') or got.get('state') != state:
        sys.exit(f"consent failed: {got.get('error', 'state mismatch')}")
    tok = post('https://oauth2.googleapis.com/token', {
        'client_id': env('YOUTUBE_OAUTH_CLIENT_ID'), 'client_secret': env('YOUTUBE_OAUTH_CLIENT_SECRET'),
        'code': got['code'], 'code_verifier': verifier, 'grant_type': 'authorization_code', 'redirect_uri': REDIRECT})
    if 'refresh_token' not in tok:
        sys.exit(f'token exchange failed: {tok}')
    old = os.umask(0o077)
    json.dump({'refresh_token': tok['refresh_token'], 'scope': tok.get('scope'),
               'created': datetime.datetime.now().isoformat(timespec='seconds')}, open(TOKEN, 'w'))
    os.umask(old)
    os.chmod(TOKEN, 0o600)
    print('token saved:', TOKEN, '| scopes:', tok.get('scope'))
    test()


def access_token():
    t = json.load(open(TOKEN))
    r = post('https://oauth2.googleapis.com/token', {
        'client_id': env('YOUTUBE_OAUTH_CLIENT_ID'), 'client_secret': env('YOUTUBE_OAUTH_CLIENT_SECRET'),
        'refresh_token': t['refresh_token'], 'grant_type': 'refresh_token'})
    if 'access_token' not in r:
        sys.exit(f'refresh failed: {r}')
    return r['access_token']


def test():
    at = access_token()
    ch = get('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', at)
    if 'items' not in ch:
        print('Data API:', ch)
        return
    for c in ch['items']:
        s = c['statistics']
        print(f"Data API OK: channel «{c['snippet']['title']}» {c['id']} subs={s.get('subscriberCount')} "
              f"views={s.get('viewCount')} videos={s.get('videoCount')}")
    end = datetime.date.today()
    start = end - datetime.timedelta(days=28)
    rep = get('https://youtubeanalytics.googleapis.com/v2/reports?' + urllib.parse.urlencode({
        'ids': 'channel==MINE', 'startDate': start.isoformat(), 'endDate': end.isoformat(),
        'metrics': 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,likes,shares,comments',
        'dimensions': 'video', 'sort': '-views', 'maxResults': 10}), at)
    if 'rows' not in rep:
        print('Analytics API:', rep)
        return
    heads = [h['name'] for h in rep['columnHeaders']]
    print('Analytics API OK (28 days):', ' | '.join(heads))
    for row in rep['rows']:
        print('  ', ' | '.join(str(x) for x in row))


if __name__ == '__main__':
    {'login': login, 'test': test}.get(sys.argv[1] if len(sys.argv) > 1 else '', lambda: print(__doc__))()
