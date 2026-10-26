#!/usr/bin/env python3
"""Rule-based niche label for discovered NEW channels (created ≥2025-01-01) whose discovered Shorts were all <100K
(the «denominator» sample). Same A/B/off scheme as labels_big.py, decided from the channel's discovered titles.
A = a story about a specific true event/person (he/she/the man who/escaped/war over/luckiest/dumbest/con man/heist…)
B = history facts / explainers / maps / lists
off = movies, celebrities, sports, games, horror, fiction drama, podcasts, memes, news…
Writes labels_small.json {channel_id: label}. A manual spot-check of 60 random rows is in census.md.
"""
import json, os, re

D = os.path.dirname(os.path.abspath(__file__))
OFF = re.compile(r"(?i)movie|film|cinema|netflix|#edit|\bedit\b|celebrit|hollywood|actor|actress|eminem|salma|travolta|"
                 r"affleck|steve harvey|\bnba\b|football|soccer|golf|cricket|roblox|\bgta\b|minecraft|\bsmp\b|horror|creepy|"
                 r"scary|podcast|react|bodycam|police|court|neighbo|reddit|meme|bully|drill sergeant|female soldier|"
                 r"humiliat|general salut|colonel|squad|workout|fitness|kids|cartoons that|recipe|food|bbq|lottery|"
                 r"pixar|interrogation|treasure|#ai\b|\bai\b|countryball|rap\*\*t|ki11|sentenced|mindset|motivat|"
                 r"inspirational|kindness|first class|flexing|vs\.? the last|king of soldiers|military moments|"
                 r"moves like one|elite soldier of|steve kerr|stunt|top 10 best")
A_KW = re.compile(r"(?i)\b(he|she|they|his|her|him)\b|man who|woman who|soldier who|king who|guy who|the \w+ who|"
                  r"escap|war over|luckiest|unluckiest|dumbest|survived|fooled|con man|conman|scam|heist|true story|"
                  r"real story|untold story|tricked|stole|fought .* for \d+ years|kept fighting|vanished|ransom|"
                  r"put a corpse|lost a war|declared war|attacked itself|went to war")
B_KW = re.compile(r"(?i)histor|ww ?[12i]|world war|war\b|wars\b|soldier|king|queen|empire|ancient|medieval|roman|victorian|"
                  r"nazi|hitler|napoleon|egypt|pharaoh|viking|samurai|army|battle|military|cleopatra|tsar|dynasty")

ch = json.load(open(f'{D}/channels_all.json'))
big = json.load(open(f'{D}/channels_100k.json'))


def ar(s):
    s = re.sub(r'[\s\d\W_]', '', s or '')
    return sum(c.isascii() for c in s) / max(1, len(s))


out = {}
for cid, c in ch.items():
    if cid in big or c.get('created', '0') < '2025-01-01':
        continue
    titles = [x['title'] for x in c['shorts_found']]
    if not titles or min(ar(t) for t in titles) < 0.9:
        continue
    if any(x['lang'] and not x['lang'].startswith('en') for x in c['shorts_found']):
        continue
    text = ' || '.join(titles) + ' || ' + c['channel']
    if not B_KW.search(text) and not A_KW.search(text):
        continue
    if OFF.search(text):
        lab = 'off'
    elif B_KW.search(text) and A_KW.search(text):
        lab = 'A'
    elif B_KW.search(text):
        lab = 'B'
    else:
        lab = 'off'  # story words but no history marker (life stories, moral fiction, …)
    out[cid] = lab
json.dump(out, open(f'{D}/labels_small.json', 'w'), indent=0)
from collections import Counter  # noqa: E402
print(Counter(out.values()))
