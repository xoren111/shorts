import json, re, statistics as st, unicodedata
rows=json.load(open('/Users/khorengrigoryan/shorts/SHORTS_PRODUCTION/02_Research/titles/conman-russell_shorts_2026-10-25.json'))
EMO=re.compile('[\U0001F300-\U0001FAFF☀-➿\U0001F1E6-\U0001F1FF]')
def feats(t):
    t2=re.sub(r'#\S+','',t).strip()
    words=[w for w in re.findall(r"[A-Za-z0-9'’]+",t2)]
    return {'emoji':bool(EMO.search(t)),'emoji_end':bool(EMO.search(t2[-3:])) if t2 else False,'words':len(words),'chars':len(t),
            'digit':bool(re.search(r'\d',t2)),'question':'?' in t,'caps_word':any(len(w)>=3 and w.isupper() and not w.isdigit() for w in words),
            'hashtag':'#' in t,'pronoun_start':bool(re.match(r"(?i)(he|she|they|this|man|guy|bro|a man|this man)\b",t2)),
            'suffix_sep':bool(re.search(r'\s[·|]\s',t)),'ellipsis':'…' in t or '...' in t}
def en(t): return sum(bool(c.isascii() or EMO.match(c) or c in "…’“”—–") for c in t)/max(1,len(t))>0.95
R=[dict(r,**feats(r['title'])) for r in rows if en(r['title'])]
groups={'>=1M':[r for r in R if r['views']>=1e6],'100K-1M':[r for r in R if 1e5<=r['views']<1e6],'<100K':[r for r in R if r['views']<1e5]}
keys=['emoji','emoji_end','digit','question','caps_word','hashtag','pronoun_start','suffix_sep','ellipsis']
out={}
for g,rs in groups.items():
    n=len(rs)
    out[g]={'n':n,'median_words':st.median(r['words'] for r in rs),'median_chars':st.median(r['chars'] for r in rs),
            **{k+'_pct':round(100*sum(r[k] for r in rs)/n,1) for k in keys}}
print(json.dumps(out,indent=1))
ours=['Humans Picked a Fight With a Volcano · 11.ai','Australia Lost to 24 Rabbits · 11.ai','The Longest Traffic Jam in History: 8 YEARS  · 11.ai',
      'USA vs BRITISH EMPIRE… Over ONE Pig','He Sold Everything to Meet Her','He Escaped Prison Dressed as a Doctor']
for t in ours: print(feats(t),t)
print('suffix titles among all EN:',[ (r['title'],r['views']) for r in R if r['suffix_sep']][:10])
json.dump({'groups':out,'ours':[dict(title=t,**feats(t)) for t in ours]},open('titles_stats.json','w'),indent=1,ensure_ascii=False)
