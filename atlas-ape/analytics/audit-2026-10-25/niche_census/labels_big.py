"""Manual niche labels for discovered channels with a Short ≥100K (English-titled), by channel title.
A = core niche: Shorts that narrate a specific weird/absurd TRUE story from history / crime / war / scams / escapes
    («the man who…», «he escaped prison with…», «the dumbest war…»), faceless or mascot/animated/archive.
B = adjacent history Shorts: facts lists, explainers, maps, history memes/countryballs, art-history, veteran archive.
F = history/true stories but face-led creator (host on camera) — reported separately.
? = unclear from the found titles → decided after reading the channel's own Shorts list (see labels_check in census.py).
Anything not listed = off-niche (movie clips, celebrity, fiction/AI drama, horror, sports, comedy skits, podcasts, …).
Labels are the analyst's judgment from titles; no video of these channels was downloaded.
"""
A = """Holoo|studby|Cosmopolite|Warlogue|Low Poly Shorts|Hoodie Guy|POP Lore|Past Diary|Nolas Studio|History by Luna|
Zeck Felms|Military History AI|Wit & Wonder|Underground Bullets|Echoes of the Past|Factsonly360 |TimeTales Unfold|History Dude|
History Unleashed|MORGAR ¦ Human History|Plip|Rom|Mr. History|onca|Zack D. Films|How Much?|Unspoken Stories|The Art Of War|
Duty & Valor: Stories of Cou|Jacked History|Extra History|SolarSpheres|Absolute History|RogCast|Artworks of Scanhead|
Thomas Mulligan|Luke Davidson Facts|HistoryHQ|Loaded Dice|Curiosity Engine|Pomegranate|JerryThink|The Giant Killer""".replace('\n', '')
B = """Far Animations|Maps Happened|GeoFactGuy|A3TH3RN ¦ Human History|EduMap India|Behind the Frame|History Explorer|H D Films |
PastLens|De Oracle Tutorials|History by Lina|Fact-Checked|History Secrets Usa|The Secret Timeline|Real History With Sam|
Histographix|Silent Souls Stories|Echoes of Empire|𝐈𝐦𝐓𝐡𝐚𝐭𝐀𝐄 [𝗜𝗧𝗔𝗘]|Nightmare archives |Hidden Episodes|Timeline History|
MONICA ROVOLT|Roe Jogan's History|Madmam|Circle Toon History|Polaroid Pete|HistoryFactMan|History by Mae|Timeless Tale Stories|
History Intrigue|Gengy |GeoGlobeTales|ImpHist|Glore|Past Perplex|Jabreel Sagas|Histography|History Hideout|The AI Historian|
Historically|curiousitygeek|That's So History|Geo Gravity|Learn History Simply|Knowledgia|History on Maps|Kings and Generals|
Fireside Unsolved|Daily Dose of History |History BiteSize|Hot For History|Factinate|Sips of History|Historyia|History Piece|
History's Mysteries|Restful Historian|Tale Twine|Black Discoveries|1keaa History|Histovar Lucis|History TV|WorldHistory|
Ancient History Lol|Soar  history (documentary)|The History Girl|RollUpHistory|Echoes of America|HistoryLegends|
Discoveries Unexplained|Conqr|History Now|Rare Stuff|THE LOST LEGACY|MahdiArdi|King Animations|Geoballz Animations|
Polandball Official|camelot historia|MerryMemes|Pree Logic|Histomex|Geographier|Ruined Mapping|Willdude|Happy Earth|
TimeTravelTales|Call of Historia|Explore history|Historical Lens|Our History|American Veterans Center|Memoirs of WWII|
The Vietnam Experience|Hidden History|MilitaryMindset|conseq.|Unmasking Crimes|Truecrime Stories|Crime Cases|SAOZ|
Military History Talks|History Unfiltered|Rare Historical Stories|Unseen Myth|History Snap92|Pint-Sized History|
The Voices Of Glory|OffizierAmira |Daniel Steiner|Urban Atlas|Geography Now|Forbidden Histories|History of Everything Podcas""".replace('\n', '')
F = """Sambucha|Helen Christie|Adrian Bliss|Ninjas Are Butterflies |Adorian|Andy Jiang|Davidjustinn|Miniminuteman|
Ryan Kelly Comedy|Em August|Adrian Gray Comedy|Danny Rayes|onlyjayus|Chris Williamson|MrBallen|MrBallen Shorts|Law By Mike|
Tyler Morgan - Japan Adventu|Peakzmotivation""".replace('\n', '')
Q = """PolySoldier|Deepigma|FSL|DARK LOGS |MindsetBecoming|Fact Byte|AceFlow|NeonFrag|doggyzuko|Allcast|DesertFilm|Nash Knows|
The Why Side|BigDanBabys|TestBiz|WIN 4 EVER|Daily Buzz Shorts|Inspect|SimpliHow|boatfenatic|Bloopo|filspixel|
i think it's george|Jonathan’s Corner|Historic Foods|Minhphu Nguyen|StorySnap Studio|ArchiveHeist|Secret of the Past|
knowledge hub|PB The Author|Uncomforting|kubestein|hxsain|Emil|Gneef|Wit & Wonder|Military Madness|The Outliners |
Icycol|BREEZE|GURT|Sierra Whitaker|Historical Lens""".replace('\n', '')


def label_map():
    m = {}
    for lab, s in (('Q', Q), ('F', F), ('B', B), ('A', A)):  # later wins → A/B/F override Q
        for name in s.split('|'):
            if name.strip():
                m[name] = lab
    return m


def norm(name):
    return (name or '').replace('|', '¦').strip()[:28]


def label_of(channel_title, _m={}):
    if not _m:
        _m.update({norm(k): v for k, v in label_map().items()})
    return _m.get(norm(channel_title), 'off')
