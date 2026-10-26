# SCRIPT — milk-carton («Girl Found Herself MISSING on a Milk Carton»)

Правила (`00_Docs/SHORTS_EDITING_STANDARD.md`, 4.0 G1–G7, 4.1 и 9B; чек-лист Т1–Т7 в `~/shorts/atlas-ape/TOPICS.md`; карточка серии A
в `~/shorts/atlas-ape/RESULTS.md`):
- строка 1 звучит с 0,0 s, разговорно, ≤ 8 слов (≤ 2,5 s), продаёт абсурд и **не раскрывает твист**; полная аномалия понятна к 3 s;
- **0–10 s: ни одного года, месяца, имени, города, штата, острова, страны** — ни в голосе, ни на экране; к 5,0 s завязка сказана, строка 2
  поднимает ставку и открывает «как?» / «что дальше?», а не «кто?» / «когда?»; до твиста никакой справки («Back then…», «In the '80s…») и меты;
- одна ясная линия; **твист на 35–55 % длины**, не в строке 1, после него ≥ 3 бита; после последней фразы ≤ 1,5 s, затем петля в кадр 0;
- **скрин-момент**: один факт абсурднее строк 1–2, пересказывается одной фразой, в теле или на твисте (не в последних 5 s);
- формат серии A не меняем (переменная `baseline`): рисуем кодом в шаблоне, голос ElevenLabs PAID Constantino, L2, 30–45 s, музыка
  Mischief Maker уходит перед твистом, концовка — факт-панчлайн с петлёй; Atlas, карты, мемы и AI-кадры — нет;
- реальная жертва, сейчас взрослая: похищение не смакуем, лица взрослых не показываем (только руки), девочку не рисуем похожей,
  встречу с отцом не досочиняем, мать не демонизируем;
- настоящее время; темп L2 (2,8–3,3 слова/с), паузы 0,15 s, «Hush.» 0,30 s, перед твистом 0,42 s, перед «Except…» 0,30 s.

## Карточка темы (чек-лист Т1–Т7 из `~/shorts/atlas-ape/TOPICS.md`)

| | Вопрос | Ответ |
|---|---|---|
| Т1 | Кадр 0 | ECU у открытого холодильника: девочка лет семи уже в движении с 0,0 s (поворачивает голову к въезжающему пакету, подаётся вперёд, глаза расширяются), мужская рука (только манжета и часы) подносит к её щеке пакет молока, на нём её зеркальная копия под огромным MISSING; на 1,0 s она тычет пальцем себе в щёку. Без звука: «девочка видит себя на пакете "пропал ребёнок", а пакет ей суёт взрослый». |
| Т2 | Строки 1–2 | «This girl finds her own face on milk.» / «Under a word she can't read: MISSING.» — без дат, имён и мест; строка 2 открывает «что дальше?», строка 3 «The man holding it can.» — холодок к ≈5,6 s. |
| Т3 | Одна арка | Одна девочка, один пакет, один поворот. До твиста нужно знать только: мужчина рядом понимает надпись и сам помог её забрать. |
| Т4 | Твист | «He BUYS it.» — слово 56 из 126 (≈45 % по времени), после него 10 битов: «keep it?» → вырезает → кейс → у соседей → настоящее имя → полиция → незнакомый отец → «Her dad put it there» → «Billions… Except…» → строка 1. |
| Т5 | Скрин-момент | Мужчина, который помог её похитить, увидел её фото под MISSING, купил пакет и сам спросил: «Do you want to keep it?» Закреп: «…She calls it arrogance. Do you buy that, or did he WANT her found?» |
| Т6 | Факты / безопасность / интерес | 99PI 2015 и 2026 (её собственный голос) + AP 1985, NCMEC, Mental Floss, Fstoppers, NZ Herald (`FACTS.md`). Спорное убрано из голоса: «tell nobody», «searched for years», «at three», «he cut», «hides». Тема дважды взяла ≈5M в 2026. Судьи: base Y — удержание 8, повод переслать 8,5, ясность 7,5. |
| Т7 | Формат серии A | Рисуем кодом, без Atlas, карт, мемов и AI; новый простой элемент — сквозной нарисованный пакет с её лицом; «кто» в кадре 0 — лицо крупно + рука с предметом (у A1 — фермер в полный рост на лестнице). |

## Текст озвучки (= `voiceover.txt`, 126 слов, ≈40 s)

```
This girl finds her own face on milk.
Under a word she can't read: MISSING.
The man holding it can.
"Hey, you're famous!" he says.
"Is that me?"
"Hush."
He helped take her from her dad.
With her own MOM.
Years on the run. Barely let outside.
He doesn't run.
He doesn't hide the carton.
He BUYS it.
Then he asks: "Do you want to keep it?"
She cuts out her own face.
Tosses it in her Barbie case.
Leaves the case next door.
A neighbor reads her REAL name.
Police show up. A LOT of police.
She's handed back to a dad she doesn't know.
The face on that milk? Her dad put it there.
Billions of cartons. Almost none brought a kid home.
Except…
```

- Твист: «BUYS» — 0-based index 56 of 126 words (split on spaces). That is 44.4 % by words and ≈45 % by time: ≈17.9 s of ≈39.6 s
  (Constantino ≈3.2 w/s overall with 0.15 s pauses; 0.30 s after «Hush.», 0.42 s of silence after the music cut on «carton.»; tail 0.6 s).
  Conservative model (3.2 w/s of pure speech + the same pauses): ≈19.9 s of ≈44.2 s, also ≈45 %. The music bed cuts on «carton.»
  (index 54). The twist sentence starts on «He» (index 55). Ten beats follow the twist.
- Скрин-момент: «keep» — 0-based index 65 (≈20.2 s, ≈51 %, in the body right after the twist; the conservative model gives ≈22.5 s).
  Fact in one sentence: the man who helped take her saw her MISSING photo on the milk, bought the carton and then asked her himself,
  «Do you want to keep it?» Held ≈2.2 s with constant micro-motion and a big card.
- Строка 1: 8 words, ≈1.9 s (≤ 2.5 s). Lines 1–2 end at ≈4.2 s (≤ 5.0 s). 0–10 s = words 0–34, no dates, names or places.
- Если готовая озвучка длиннее 45 s — первой убрать «A LOT of police.» (останется 122 слова; индексы твиста и скрин-момента не сдвигаются),
  затем «Barely let outside.» (119 слов; тогда твист — слово 53/119, скрин-момент — слово 62).
- Перед «can» — пауза ≈0.2 s внутри строки (KEEP-пауза в `tight.py`), иначе эллипсис «she can't read… The man holding it can.» теряется на слух.

## Покадровый план

| # | VO line | words (0-based) / ~time | visual event (one per phrase, readable in 1.5 s) | style | SFX idea |
|---|---|---|---|---|---|
| 1 | This girl finds her own face on milk. | 0–7 / 0.0–1.9 s | FRAME 0, staged from her account (he grabbed the milk and showed her). ECU at an open grocery dairy fridge on a girl of about 7 (messy bangs, red hair clip; generic, not drawn after the real girl) who is ALREADY MOVING on frame 0: she turns her head toward the carton swinging in and leans forward, her eyes widening. A big man's hand (cuff and wristwatch only, his face never in frame) swings the milk carton up beside her cheek. The black-and-white photo on the carton is her mirror copy (same clip, same bangs) under a huge MISSING with a smaller CHILD; the name and date lines are illegible squiggles with no digits. 0.0 s: the carton swings in while she turns and leans in. 0.45 s: the printed eyes line up with hers — bass hit with NO freeze: her lean, the carton swing and the mist keep moving. 1.0 s: her finger jabs her own cheek, 1.5 s: the printed face. Both she and the hand move on every frame of 0–1 s (G3; motion 0–1 ≥ 20 for L2, H6). | scene | fridge-door hiss + cardboard swish, bass hit at 0.45 s (no frame hold), two soft finger taps; Mischief Maker bed from 0.0 s |
| 2 | Under a word she can't read: MISSING. | 8–14 / 2.1–4.2 s | Macro, her POV: her fingertip drags along the carton header and the letters wriggle into squiggles she can't read. On the spoken «MISSING» they snap into sharp red MISSING; her lips try to sound it out. | document | rubbery squiggle squeak → stamp snap on «MISSING» |
| 3 | The man holding it can. | 15–19 / 4.4–5.8 s | Low angle from her height: the camera tilts up his arm from the watch to a coat silhouette against the fridge light (no face). The MISSING letters light up one by one, left to right, as if he is reading them; his shadow slides over her. CAN in orange in the subtitle. | scene | low string drone enters, 7 soft letter blips |
| 4 | "Hey, you're famous!" he says. | 20–24 / 6.0–7.5 s | Back on the split-match: his index finger taps her printed face twice, like a proud joke, and two small comic flash-bulb bursts pop around the carton. Her eyes go wide. | scene | two cardboard taps, two camera-flash pops |
| 5 | "Is that me?" | 25–27 / 7.7–8.4 s | Mouth open, she jabs a finger at her own chest, then at the printed face, then back; a tiny sparkle flicks on the red clip in the photo and on her own clip at once. | scene | thin «ooh» chime, two tiny boops |
| 6 | "Hush." | 28 / 8.5–8.8 s (+0.30 s) | On the fridge door his huge silhouette shadow raises one finger to its lips; no facial detail, no contact with her. The flash bursts freeze and fall like flat confetti; the store colours dim a notch. | scene (silhouette) | breathy «shh», store ambience ducks out, fridge hum stays |
| 7 | He helped take her from her dad. | 29–35 / 9.1–11.0 s | Desaturated flashback with paper grain on a plain backdrop (no room, no house, no place): an empty checked jacket hangs on the back of a chair — her dad only as a sign, he is not in the scene. In front of it a man's hand with the SAME wristwatch holds a toddler's small hand and gently walks her out of frame; the jacket stays alone and still. No grabbing, no struggle, no faces. Symbol only (FACTS «Постановка в кадре»): the voice doesn't say how or where she was taken. | scene (flashback) | reverse whoosh, one soft heartbeat |
| 8 | With her own MOM. | 36–39 / 11.1–12.1 s | Same flashback, wider on the hands: a woman's hand with a bangle takes the toddler's other hand, and the child walks off calmly between the two adult hands (tender, not villainous, no hurry). The bangle glints on «MOM». MOM in orange. | scene (flashback) | bangle jingle, one low piano note |
| 9 | Years on the run. Barely let outside. | 40–46 / 12.3–14.8 s | One compound move, no map, no coastlines, no names: night road lights streak past a car window, the streaks turn into rain on the tin roof of a shack among trees; a little hand pulls a curtain aside to the sun, and the curtain slips back by itself and falls shut — the sunbeam on the floor narrows to a thin strip. No adult hand here (no bangle, no watch): the sources don't say who kept her in, and mom is never shown as a jailer. | scene (flashback) | road hum → rain on tin → curtain-ring swish, soft cloth fall |
| 10 | He doesn't run. | 47–49 / 14.9–15.6 s | Colour snaps back, the store in the frame-0 angle, wider: his shoes stay planted beside her small sneakers by the cart; shoppers' feet stream past in a soft blur. RUN in orange. | scene | store ambience back, shoppers' footsteps whoosh past |
| 11 | He doesn't hide the carton. | 50–54 / 15.8–17.2 s | Mid shot from her height: without hiding it, his hand drops the carton into the shopping cart like any ordinary milk (her MISSING face happens to land toward the viewer, not shown off to the aisle or to anyone) and the cart rolls on toward the checkout with her small hand on its side; no hesitation, nothing put back, no bravado. MUSIC (Mischief Maker) HARD CUT on «carton.», then 0.42 s of dead air; the cart and the mist slow to a crawl (no full freeze). | scene | carton thunk in the wire cart, cart-wheel rattle, hard music cut → fridge hum only |
| 12 | He BUYS it. | 55–57 / 17.6–18.4 s | TWIST (index 56), readable without sound: the carton thumps onto the checkout belt, a red scanner laser sweeps across HER printed face — BEEP on «BUYS» — and the till drawer pops open. Giant card «HE BUYS IT.» with BUYS in orange; this phrase's subtitle is hidden (H9). | scene + big text | belt thump → dry scanner BEEP on «BUYS» → till ka-chunk, all in silence |
| 13 | Then he asks: "Do you want to keep it?" | 58–66 / 18.5–20.7 s | SCREENSHOT MOMENT (word «keep», 65). Kitchen table from above: the empty carton (the milk is finished) lies with her MISSING face up; the hand with the watch slides it across to her small hands. Big card «DO YOU WANT TO KEEP IT?» with KEEP in orange; subtitle hidden (H9). Held ≈2.2 s with micro-motion: the carton wobbles to a stop, her fingers hover, she blinks. | scene + big text | cardboard slide across wood, kitchen-clock tick |
| 14 | She cuts out her own face. | 67–72 / 20.8–22.3 s | Macro on her small hands only, holding round-tip kid scissors: they snip around the photo panel, the cardboard curls and the square cutout (MISSING over her face) lifts free, leaving a hole in the carton. OWN in orange. | document | scissor snips ×4, card peel |
| 15 | Tosses it in her Barbie case. | 73–78 / 22.4–24.1 s | A pink doll case (no logo, no brand) pops open on tiny doll shoes and a comb; the cutout flutters in on top, the lid snaps shut and the latch clicks. | scene | paper flutter, plastic latch pop, lid snap |
| 16 | Leaves the case next door. | 79–83 / 24.2–25.7 s | Wide, side-on: she skips across a lawn to the house next door swinging the case, sets it on the neighbors' carpet and skips home empty-handed; the screen door swings shut and the camera eases in on the lone case. No signs, house numbers or street names. | scene | footsteps on grass, screen door creak and slap |
| 17 | A neighbor reads her REAL name. | 84–89 / 25.8–27.5 s | Over the neighbor's shoulder, no face: adult fingers lift the cutout from the case and a fingertip slides along the name line under the photo (illegible squiggles, never readable). The hand pins the cutout to her own fridge with a magnet. REAL in orange. | document | paper rustle, fingertip squeak, magnet clack |
| 18 | Police show up. A LOT of police. | 90–96 / 27.7–29.9 s | Red and blue light washes over that fridge and the cutout; through the window, police-car silhouettes pull up one by one, each on a beat (no badges, text or plates). On «A LOT» the cars keep stacking past the frame edge. LOT in orange. | scene | short siren chirps ×5 stacking, brakes, car doors |
| 19 | She's handed back to a dad she doesn't know. | 97–105 / 30.1–32.5 s | Doorway: a tall man in the checked sleeve (her dad, seen from behind, no face) crouches with one hand held out; she steps behind the doorframe and peeks out with one eye. No hug, no tears, nothing in his hand. KNOW in orange. | scene | quiet room tone, one soft floor creak |
| 20 | The face on that milk? Her dad put it there. | 106–115 / 32.6–35.1 s | Sepia, earlier: the checked-sleeve hand slides her toddler photo across a plain desk (no logos); cut to a dairy line printing that face onto carton after carton; one carton rides off the line straight into the frame-0 store fridge. The music bed returns low on «The». DAD in orange. | scene → schema | photo slide, press thunk-thunk, conveyor rattle; music fade-in 0.5 s at −24 dB |
| 21 | Billions of cartons. | 116–118 / 35.3–36.5 s | Pull back: the fridge becomes an endless scrolling wall of cartons, each with a different generic drawn child (no real missing kids). A big BILLIONS (orange, no digits) stamps over it; this phrase's subtitle is hidden (H9). | schema | rising whoosh, rattling cardboard swell, stamp thud |
| 22 | Almost none brought a kid home. | 119–124 / 36.6–38.2 s | Row by row the faces on the wall dim to grey; one carton keeps its colour; slow push toward it (F4: calm but moving). No big text — subtitles only. NONE in orange. | schema | three descending lights-off clunks |
| 23 | Except… | 125 / 38.5–39.0 s (+ tail ≤ 0.6 s) | The one coloured carton slides out of the wall into the store dairy fridge; the hand with the watch reaches in and lifts it — MATCH CUT (≤ 0.35 s crossfade) into FRAME 0: same hand, same carton swinging up to her cheek, same mist = LOOP. Voice cut right on «Except…», no breath. | scene | reverse whoosh −22 dB into the frame-0 fridge-door hiss; music bed runs across the cut |

Rules for the whole edit:
- Subtitles are white with orange accent words: OWN (word 4), MISSING, CAN, FAMOUS, MOM, RUN (word 49), BUYS, KEEP, OWN (word 71), REAL, LOT,
  KNOW, DAD (word 112), BILLIONS, NONE. BUYS, KEEP and BILLIONS live in big cards with their phrase's subtitle hidden: `hide_subs`
  [[55, 57], [58, 66], [116, 118]].
- First 10 s (words 0–34, up to ≈10.6 s): the only text on screen is MISSING / CHILD on the drawn carton and illegible squiggles for the name and
  date. No years, months, names, places, no big text cards. `qa.sh` OCR will warn on «CHILD» (capitalised, not spoken) — expected, not a name.
- Adults are hands only: watch = stepdad, bangle = mom, checked sleeve = dad (in beat 7 only an empty checked jacket on a chair — a sign,
  the dad is not in the scene; the child never slips out of his hand). No adult face ever; mom shown tenderly, never as a villain
  (the bangle appears only in beat 8; in beat 9 the curtain falls by itself, no hand). No detail of haste or struggle in the flashback
  (no dropped shoe, no running, no tugging). The stepdad's hand never shows the carton off to
  anyone (beat 11: an ordinary drop into the cart); the only showing is to her, as in her account («Hey, you're famous!»).
- The girl is generic (red clip, bangs) and not modelled on the real person; no real photos, no logos (NCSC, Anderson Erickson, Barbie, police).
- No mascot, no maps, no memes, no AI frames. Everything is drawn in code.

## Упаковка

- Title (без спойлера): **Girl Found Herself MISSING on a Milk Carton 🥛😳** · запасной: Girl Saw Her OWN Face on Milk 🥛😳
- Закреплённый вопрос (в первый час): He saw her MISSING face on the milk… and BOUGHT it. She calls it arrogance. Do you buy that, or did he WANT her found? 👇
- Описание:
```
She found her own face on a milk carton, under a word she couldn't read. The man holding it could.
A family abduction, told in her own words on 99% Invisible (2015, 2026). A 1985 AP report tells a different version of how she was recognized; this Short follows her account. "Billions" is an estimate (3–5 billion cartons at the peak); only a handful of kids were ever found because of a carton.
Sources: 99% Invisible ep. 181 "Milk Carton Kids" (2015, article + transcript); 99% Invisible "100 Objects #9: Missing Children Milk Carton" (2026, transcript); AP via Rapid City Journal (Oct 1985); NCMEC blog (2024); Mental Floss; Fstoppers; NZ Herald (2019).
Music: «Mischief Maker — Kevin MacLeod (incompetech.com), CC BY 4.0»
```

## Почему эта версия

За основу взята версия Y (уклон share): у неё лучшая сумма баллов — 8 + 8,5 + 7,5 = 24 (X — 22,5, Z — 20). От Y остались непрерывная сцена в
магазине с её настоящими репликами («Hey, you're famous!» / «Is that me?» / «Hush»), лучший разгон к твисту «He doesn't run. / He doesn't hide
the carton. / He BUYS it.» (его выделили судьи удержания и повода переслать), срез музыки на «carton.» с 0,42 s тишины, твист, читаемый без
звука (лазер сканера по её лицу, карточка HE BUYS IT.), скрин-момент крупной карточкой DO YOU WANT TO KEEP IT?, катарсис «The face on that milk?
Her dad put it there.» и петля через пакет, уехавший с линии в холодильник кадра 0.

Пересажено из X: «The man holding it can.» — холодок уже на ≈5 s, лучшая строка по удержанию и поводу переслать; «A neighbor reads her REAL
name.» — тихий удар про чужое имя; «Police show up. A LOT of police.» — подъём энергии перед незнакомым отцом; сцена в дверях с выглядыванием
из-за косяка; руки-идентификаторы (часы, браслет, клетчатый рукав). Из Z: «Almost none brought a kid home.» вместо корявого «Almost no kid was
found by one»; настоящее время «finds» в строке 1; «Leaves the case next door.»; пакет MISSING над CHILD с закорючками без цифр (OCR-safe).

Применённые правки судей:
- удержание (Y): «couldn't» → «can't»; «The man with her points.» убрана; MOM капсом; «Forgets it next door.» → «Leaves the case next door.»;
  «Then the police come.» → «Police show up. A LOT of police.»; «Almost no kid was found by one.» → «Almost none brought a kid home.»;
- удержание (X): «An island shack» убрана из голоса; пауза ≈0,2 s перед «can» и CAN оранжевым; атрибуции сокращены («She asks» убрано);
- повод переслать (Y): вставлено «The man holding it can.»; «Because» убрано; MOM капсом; «REAL name»; «A LOT of police»; «Almost none…»;
- повод переслать (X, Z): ожидание названо перед твистом («He doesn't hide…»); KEEP — крупной карточкой; пакет с линии уезжает в холодильник кадра 0;
  «One rule: keep it secret» убрана; «Is that me?» на месте; встреча — сценой в дверях, а не схемой;
- ясность (Y): из плана убраны выдуманные двери выхода и рука, почти ставящая пакет на полку; убрана рука, прижимающая её палец (вместо — силуэт
  «тсс» без контакта); самолёт над океаном заменён нейтральной дорогой → лачугой; «it» → «the case»; «forgets» → «leaves»;
- ясность (Z): «a dad she doesn't know», а не «doesn't remember»; «Her dad» назван прямо, чтобы финал не спутали с похитителем.

Не применено, потому что ломает факты или правила:
- «"Hey, you're famous!" he grins» (удержание, X) — улыбки в источниках нет; оставлено нейтральное «he says»;
- «He points.» / «The man with her points.» (повод переслать, Y) — жеста «points» в источниках нет (сверка фраз Y); указывание осталось только
  картинкой (палец стучит по фото — опора «Look. Look. You're here», 2026);
- «Her mom's boyfriend points.» (ясность, Y) — он отчим, а не «boyfriend», и «points» не подтверждено; роль ясна из «He helped take her… With her
  own MOM.»;
- «"Our secret," he says.» (повод переслать, Z) — выдуманная цитата: его слова — «Hush» и «keep it in a safe place»;
- фото в руке отца при встрече (повод переслать, X) — досочиняет встречу с отцом, а этого правила запрещают; фото у отца есть только в сцене
  «Her dad put it there»;
- самолёт над океаном и колебание у дверей выхода из плана Y — как они переезжали и колебался ли он, источники не говорят.

Не применено по другим причинам (судьи расходятся, выбран вариант большинства или более короткий):
- «The man holding it can read it.» (ясность, X) — удержание просит наоборот «can.»; эллипсис держится на соседнем «she can't read» плюс пауза и CAN оранжевым;
- «He helped her own MOM take her from her dad.» (ясность) — теряется удар «With her own MOM.», который хвалят два других судьи; «helped» уже делает его соучастником;
- «A neighbor reads the name under her face.» (ясность, X) — «REAL name» подтверждено (она жила как Bonnie Smith), это вывод, записан в FACTS;
- удалить «He doesn't run. / He doesn't hide the carton.» (ясность, Y) — два судьи называют эту тройку лучшим разгоном; сверка фраз считает
  обе строки допустимыми (вывод из хронологии и строка только про пакет); выдуманные картинки под ними убраны;
- «Back then, milk cartons showed missing kids.» (ясность любит, удержание и повод переслать просят вырезать) — это справка до твиста (G1); механику
  объясняют MISSING на пакете, катарсис с линией печати и «Billions of cartons.»;
- «ever» в «Almost none ever brought a kid home.» — лишнее слово при 126 из 128.

Правки финальной проверки (повторная сборка 26.10; текст озвучки и индексы не менялись, правился только план):
- кадр 0 (строка 1 плана и «Кадр 0» в шапке EDIT_PLAN): девочка в движении уже с 0,0 s — поворачивает голову к въезжающему пакету, подаётся
  вперёд, глаза расширяются; микрозаморозка 0,15 s на 0,45 s заменена ударом баса без остановки кадра. Раньше до 1,0 s двигалась только рука
  с пакетом, а G3 требует героя в действии на 0,0 и на 1,0 s; заморозка просаживала motion 0–1 (H6, L2 ≥ 20);
- строка 11 («He doesn't hide the carton.»): вместо пакета на уровне груди, развёрнутого лицом с MISSING к проходу (бравада и насмешка, которых
  нет в источниках, плюс подсказка мотива «taunting», запрещённая в FACTS), он просто кладёт пакет в тележку, как обычное молоко, и везёт к кассе;
- строка 9 («Barely let outside.»): занавеску больше не задёргивает рука с браслетом (это делало мать тюремщицей, а источники пишут пассивом —
  «rarely allowed outdoors», «hardly ever allowed to leave the house»); занавеска сама падает и закрывает свет, рук взрослых в кадре нет.

Правки финальной проверки, второй круг (повторная сборка 26.10; текст озвучки и индексы снова не менялись):
- строка 7 плана («He helped take her from her dad.»): убрана рука отца, из которой выскальзывает малышка, и его пальцы, сжимающие пустоту.
  Ни один источник не говорит, что её забрали из его рук или при нём (99PI 2015: «kidnapped by her mother when she was 3, after her parents
  got divorced»), а FACTS запрещает события, которых нет в источниках. Теперь отец только знак — пустой клетчатый пиджак на спинке стула на
  нейтральном фоне, рука с часами мягко уводит малышку из кадра. Это записано в FACTS «Постановка в кадре» как символ с опорой «Taken from
  her father by her mother and stepfather»; в голосе не утверждается;
- строка 8 плана («With her own MOM.»): убраны упавшая туфелька и SFX «soft shoe thud» — деталь спешки или борьбы, которой нет в источниках;
  она нарушает правило «похищение не смакуем» и тон её слов «I was kidnapped by people that loved me». Остались блеск браслета на «MOM»
  и низкая нота пианино;
- FACTS: у закрепа «She calls it arrogance» появилась опора — реплика ведущего из стенограммы 99PI 2015 «Looking back now, Bonnie sees her step
  dad's actions as arrogance.» и её слова «He was so confident in himself that he could show me that, because nothing's going to happen with it.»
  (факт 3 и «Выводы»). Закреп и голос не менялись.

Итог: 126 слов (≈40 s по оценке ≈3,2 сл/с, ≈44 s в консервативной модели), твист «BUYS» на ≈45 %, скрин-момент «keep» на ≈51 %, в 0–10 s
ни дат, ни имён, ни мест; в голосе нет ни одной фразы с пометками [conflict] / [unsupported] из сверки фактов.
