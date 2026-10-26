# SCRIPT — hay-castle («This Farmer Hid a CASTLE Behind Hay»)

Правила (`00_Docs/SHORTS_EDITING_STANDARD.md`, 4.0 G1–G7, 4.1 и 9B; тема — фильтр Т1–Т7 в `~/shorts/atlas-ape/TOPICS.md`):
- строка 1 = абсурдный поступок или ставки, **без спойлера**; полная аномалия понятна к 3 s;
- **0–10 s: ни одного года, месяца, имени человека, подписи места** — ни в голосе, ни на экране (страна или армия, которая сама и есть
  конфликт, допустима); к 5 s завязка сказана, вторая фраза поднимает ставку и открывает «как?» / «что дальше?», а не «кто?» / «когда?»;
  никакой предыстории, справки (организации, цифры-источники) и меты («that's not even the craziest…») до твиста;
- одна дуга: один герой, одна проблема, один твист; **твист на 35–55 % длины**; после последней фразы ≤ 1,5 s, затем петля в кадр 0;
- **скрин-момент**: один факт абсурднее строк 1–2, пересказывается одной фразой, стоит в теле или на твисте (не только в финале);
- формат серии из `~/shorts/atlas-ape/RESULTS.md` (голос, длина, концовка, музыка; Atlas в роликах нет) не меняем — отличие от пары ровно одно;
- без смерти родственников как крючка; финальная строка перетекает в первую (loop);
- темп по уровню (L2: 2.8–3.3 слова/с), паузы 0.15–0.22 s, перед твистом и финалом 0.3–0.5 s.

## Карточка темы (фильтр Т1–Т7 из `~/shorts/atlas-ape/TOPICS.md`)

| | Вопрос | Ответ |
|---|---|---|
| Т1 | Кадр 0 | Фермер на шатающейся лестнице заталкивает последний тюк в стену из сена высотой с дом; из щели торчит ствол пушки на дорогу. Без звука: «мужик прячет замок с пушкой в стоге сена». |
| Т2 | Строки 1–2 | «He's hiding a whole castle behind hay so it can never be torn down.» / «His bet: stay unseen for four years.» — без годов, имён и мест. |
| Т3 | Одна арка | Один фермер, один замок, одна хитрость; до разворота нужно знать только «4 года незамеченным». |
| Т4 | Твист | «hiding it was part of building it» — слово 59 из 124 (≈48 %), после него 9 битов, петля «Beaten by the hay he hid it with.» → строка 1. |
| Т5 | Скрин-момент | Суд решил, что прятать стройку — тоже стройка, поэтому четыре года даже не начинали идти; последний довод — летучие мыши и тритоны. |
| Т6 | Факты / безопасность / интерес | Решение Высокого суда + 6 изданий (FACTS.md); герой жив — только судебные записи и пресса; тюрьма — условие, он подчинился. Судьи: интерес 8, удержание 8, факты 8,5. |
| Т7 | Формат серии A | Рисуем кодом, без Atlas, без карт, без мемов; новый простой элемент — таймер «4 YEARS»; «кто» в кадре 0 — фермер с тюком (у Russell — заключённый в двери). |

## Текст озвучки (= `voiceover.txt`, 124 слова, ≈43 с)

```
He's hiding a whole castle behind hay so it can never be torn down.
His bet: stay unseen for four years.
One look from the council, and they can order it gone.
Battlements. Cannons. His family living inside.
The council never sees a thing.
Four years later, the bales come down.
He thinks he's won.
Then the court rules: hiding it was part of building it.
So it wasn't finished until the hay came down.
The clock hadn't even started.
His last stand? Bats. And newts.
Apparently they've moved in.
Knock it down, he says, and you'd break wildlife law.
Rejected.
The judge: tear it down, or face jail.
So he tears down his own castle.
Beaten by the hay he hid it with.
```

- Твист: "hiding" (the paradox "hiding it was part of building it"), 0-based index 59 of 124 words. That is 47.6 % by words and about 48 % by time (≈20.5 s of ≈42.8 s; Constantino at 3.15 w/s with 0.15 s pauses, plus 0.35 s of silence after the music cut). The music bed cuts on "won." (index 54). The twist sentence starts on "Then" (index 55, 44 %). The gavel lands on "part" (index 62, 50 %). Nine beats follow the twist.
- Скрин-момент: "Bats." — 0-based index 83 (≈28.7 s, 67 %, in the body after the twist; the bat beat is held about 3 s with constant micro-motion). Fact in one sentence: ordered to tear down the castle he'd hidden, the farmer argued that bats and newts had moved in, so knocking it down would break wildlife law, and the judge rejected it.
- Если готовая озвучка длиннее 45 s — первой убрать «Apparently they've moved in.» (останется 120 слов).
- Слово «hay» в субтитрах всегда пиктограмма тюка, никогда текстом (в суде — straw).

## Покадровый план

| # | VO line | words (0-based) / ~time | visual event (one per phrase, readable in 1.5 s) | style | SFX idea |
|---|---|---|---|---|---|
| 1 | He's hiding a whole castle behind hay | 0–6 / 0.0–2.2 s | FRAME 0. A farmer on a swaying ladder rams the last bale into a gap in a house-high bale wall. A stone battlement and a fat black cannon muzzle aimed at the road show through the shrinking gap. A blue tarp covers the top. The bale thumps in at 0.3 s with a straw puff. No text. | scene | bale thump + straw rustle, ladder creak |
| 2 | so it can never be torn down. | 7–13 / 2.2–4.4 s | A wrecking ball swings in from the right. On "never" (~3.2 s) a giant padlock snaps across the bale wall, and the ball clangs off it and droops. Subtitles: NEVER in orange. | scene | whoosh → padlock click → metal clang |
| 3 | His bet: stay unseen for four years. | 14–20 / 4.6–6.9 s | A big flip timer "4 YEARS" slams onto the bales. A crossed-out eye icon blinks above it and the digits start rolling. The farmer gives a thumbs-up from the ladder. | schema | stamp thud + clock tick loop starts |
| 4 | One look from the council, | 21–25 / 7.1–8.7 s | A plain car (no logo, no plates, no clipboard) crawls along the road. The driver's head starts turning toward the field. The farmer freezes on the ladder with a sweat drop, and the ticking stops. | scene | engine putter, tick cuts out, tense string pluck |
| 5 | and they can order it gone. | 26–31 / 8.7–10.6 s | A giant blank rubber stamp (no text) hovers over the wall and wobbles. The car rolls on with the driver looking ahead, the stamp lifts away, and the ticking resumes. | scene | low drone → relief sting |
| 6 | Battlements. | 32 / 10.7–11.0 s | An X-ray wipe through the bales: battlements pop up on two silo-shaped towers. They stay on screen as the next items add up. | schema (cutaway) | ka-chunk |
| 7 | Cannons. | 33 / 11.1–11.4 s | Inside the same cutaway a cannon rolls forward on the rampart with a small smoke puff. It does not fire. | schema (cutaway) | wooden roll + soft puff (no boom) |
| 8 | His family living inside. | 34–37 / 11.5–12.8 s | Cutaway rooms light up one by one: family silhouettes at a table (no faces, no ages), TV glow, a laundry line. | schema (cutaway) | light-switch clicks ×3, faint TV murmur |
| 9 | The council never sees a thing. | 38–43 / 13.0–14.9 s | Outside again. The same plain car passes three times as the seasons flip (snow, blossom, leaves), and the driver never turns. The timer digits race. | scene | car whoosh ×3 + fast tick riser |
| 10 | Four years later, the bales come down. | 44–50 / 15.0–17.2 s | The timer hits "4 YEARS ✓" with a DING. The tarp whips off and the bales topple like dominoes. They reveal the whole mock-Tudor house: timber framing, two battlemented towers, a cannon. | scene | ding + domino thuds + tarp whip |
| 11 | He thinks he's won. | 51–54 / 17.4–18.7 s | The farmer pops a party popper on the battlements and confetti flies. The MUSIC BED («Mischief Maker») CUTS on "won", followed by 0.35 s of dead air. | scene | popper pop → hard music cut |
| 12 | Then the court rules: | 55–58 / 19.2–20.4 s | In silence a giant gavel descends from the top of the frame and its shadow swallows the farmer. The confetti freezes in mid-air. | scene | low sub-boom swell |
| 13 | hiding it was part of building it. | 59–65 / 20.5–22.7 s | TWIST. The gavel slams onto a bale on "part" and the bale snaps into the castle wall like a Lego brick. Big card: "HIDING IT = BUILDING IT", with BUILDING in orange. No "hay" text anywhere. | schema | gavel crack + brick click |
| 14 | So it wasn't finished until the hay came down. | 66–74 / 22.9–25.8 s | The bales rewind back onto the wall. A "COMPLETED" progress bar (no digits) stalls just short of full and fills only as the last bale hits the ground. In the corner, a drawn court page gets a highlighter swipe over "part of the totality of the operations". | schema + document | rewind zip + bar tick + highlighter squeak |
| 15 | The clock hadn't even started. | 75–79 / 25.9–27.5 s | The "4 YEARS ✓" timer drops its check mark and the needle snaps back to START (not "reset"). The farmer's party hat deflates. | schema | slide-whistle down + clunk |
| 16 | His last stand? Bats. And newts. | 80–85 / 27.6–29.7 s | SCREENSHOT MOMENT. The farmer stands on the battlements, arms crossed, as an excavator rolls up. On "Bats" a bat in a tiny barrister wig drops upside-down from the eave. On "newts" a newt pops out of a rain-butt by the wall, not out of the roof. Blinks and a wig wobble every ~1 s. | scene | wing flutter + water "plip" + pop |
| 17 | Apparently they've moved in. | 86–89 / 29.9–31.2 s | A "HOME" doormat slides under them. The newt sets down a tiny suitcase and the bat hangs a little picture frame. | scene | doormat slide + tiny suitcase thunk |
| 18 | Knock it down, he says, and you'd break wildlife law. | 90–99 / 31.3–34.5 s | The excavator claw creeps in. The bat flips up a sign reading "WILDLIFE LAW" and the claw screeches to a stop inches short. | scene | hydraulic whine → brake screech |
| 19 | Rejected. | 100 / 34.6–35.0 s | A huge red "REJECTED" stamp slams onto the sign. The bat flaps off and the newt slides away. | document | rubber-stamp SLAM |
| 20 | The judge: tear it down, or face jail. | 101–108 / 35.1–37.7 s | Split frame with two doors: an excavator behind the left one, cell bars behind the right one. A deadline clock ticks above both, and a gavel swings between them like a pendulum. No numbers on screen. | schema | door creaks + pendulum tick-tock |
| 21 | So he tears down his own castle. | 109–115 / 37.9–40.1 s | The farmer steps through the excavator door. The claw bites a tower and the flag topples while the farmer stands aside, cap in hand, in puffs of dust. The music bed fades back in, low. | scene | crunch + rubble tumble, music returns |
| 22 | Beaten by the hay he hid it with. | 116–123 / 40.3–42.8 s | The dust clears to an empty plot and one lone bale rolls in. The farmer sits on it under a slow push-in. On "with" he lifts the bale and climbs the ladder: MATCH CUT to FRAME 0 no later than 0.6 s after the last word (LOOP). | scene | reverse whoosh straight into the frame-0 bale thump |

Rules for the whole edit:
- Subtitles are white with orange accent words: CASTLE, NEVER, FOUR YEARS, UNSEEN, WON, PART, BUILDING, STARTED, BATS, NEWTS, REJECTED, JAIL, OWN.
- The "hay" token (word indexes 6, 72, 119) is ALWAYS rendered as a bale pictogram in the subtitles. This is a hard rule, never the word.
- First 10 s (words 0–29, up to ≈9.9 s): the only text on screen is "4 YEARS" (a duration) and the eye icon. No years, months, names or places.
- No mascot, no maps, no memes, no AI frames. Everything is drawn in code.

## Упаковка

- Title (без спойлера): **This Farmer Hid a CASTLE Behind Hay 🏰🤫** · запасной: This Farmer Built a SECRET Castle 🏰🤯
- Закреплённый вопрос (в первый час): Fair or not? 🏰 KEEP IT or 🔨 TEAR IT DOWN 👇
- Описание:
```
He hid a whole castle behind a wall of bales and waited for the clock to run out. The court saw those bales very differently.
Straw/hay bales; enforcement immunity under s.171B TCPA 1990; 3-month suspended sentence, he complied and the house was demolished in 2016.
Sources: High Court, Fidler v SSCLG [2010] EWHC 143 (Admin); Local Government Lawyer; Farmers Weekly (2015–16); The Independent (2008); AP/NBC (2010); HOA (2015).
Music: «Mischief Maker — Kevin MacLeod (incompetech.com), CC BY 4.0»
```

## Почему эта версия

За основу взят вариант max_share. Его все три судьи поставили наверх (8 / 8 / 8.5). От него — чистый кадр 0, настоящее время до разворота, связка «Bats. And newts. Apparently they've moved in.», удар «Rejected.» и петля «Beaten by the hay he hid it with.». Начало взято из max_hook — так советовал судья по удержанию: первая строка сразу даёт и картинку, и ставку («so it can never be torn down»), и к 4.4 с завязка уже сказана. Строку 2 переписали по замечанию судьи по фактам: «His bet:» делает правило четырёх лет его планом, а не словами диктора. При этом осталась угроза «One look from the council…», а финальное «The council never sees a thing» стало её развязкой. В развороте — «the court» в единственном числе (Высокий суд, его не спутать с «The judge» про тюрьму) и точная фраза «The clock hadn't even started» вместо неверного «Clock reset». Вместо «Next defence» стоит «His last stand?» — вопрос с паузой, как в «His comeback?» у judges_fixes, плюс каламбур про замок, и без британского написания «defence». Тюрьма звучит только как условие («or face jail»), снос — в настоящем времени, «by hand» и «went to jail» в тексте нет. Получилось 124 слова, примерно 43 с, разворот на 47.6 %, после него 9 битов. Если готовая озвучка выйдет длиннее 45 с, первой убираем фразу «Apparently they've moved in.» — останется 120 слов.
