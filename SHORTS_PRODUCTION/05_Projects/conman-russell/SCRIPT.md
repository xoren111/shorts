# SCRIPT — conman-russell («He Walked Out of Prison 4 Times»)

Правила (`00_Docs/SHORTS_EDITING_STANDARD.md`, 4.1 и 9B):
- строка 1 = ставки или абсурдный поступок, **без спойлера**; полная аномалия понятна к 3 s; в первых 3 s нет годов, имён, мест;
- одна дуга: один герой, одна проблема, один твист; твист на 60–70 % слов VO;
- без смерти родственников как крючка; финальная строка перетекает в первую (loop);
- темп по уровню (L2: 2.8–3.3 слова/с), паузы 0.15–0.22 s, перед твистом и финалом 0.3–0.5 s.

Статус: **v5 на OK владельца (точка 1 брифа)** = `voiceover.txt`. Хук по просьбе владельца (24.10): «максимально приукрасить» —
**преувеличение хука записано в FACTS.md № 21** (maximum-security верно только для побега 3). Тело ролика — строго по FACTS.
v5 (24.10, владелец: «детали оставь, но уложись в ~45 с») — v4 (166 слов, ≈ 54 s) ужата: в каждом побеге осталась цепочка
«что сделал → что получилось», убрано то, что показывает картинка (список — ниже).

## v5 (текущая) = `voiceover.txt`

142 слов · твист «He wasn't.» = слово 98 из 142 (**69.0 %**) · хук 15 слов ≈ 4.8 s · оценка ≈ 43–49 s при 3.35–2.95 слова/с
(≈ 46 s при 3.15) + хвост 0.9 s; если дубль выйдет > 47 s — паузы 0.15 s (`tight.py`), затем `atempo` ≤ 1.05.

| # | Строка VO | Слова | Факты (FACTS.md) | Визуальная идея (одно событие на фразу; детали — EDIT_PLAN) |
|---|---|---|---|---|
| 1 | This man walked out of a maximum-security prison four times. The guards held the door. | 15 | № 2, 21 (преувеличение — решение владельца) | кадр 0: рисованный мужчина в белой робе спокойно выходит из открытой двери, руки в карманах, охранник держит ему дверь; на «four» — 4 зарубки на стене камеры |
| 2 | First: dressed as a workman, he tapped a police radio on the guards' window — and walked out. | 17 | № 4 | зарубка I; он в робе рабочего, рация стучит в стекло поста охраны (тук-тук) → дверь отъезжает, он выходит |
| 3 | Second: posing as a judge, he phoned the jail and cut his own bail from nine hundred thousand to forty-five thousand. | 21 | № 6 | зарубка II; телефон + судейский молоток; документ залога: $900,000 зачёркнуто → $45,000 (штамп; «dollars» голосом не звучит — знак $ на экране) |
| 4 | Third: he colored his uniform green with markers. The guard saw a doctor — and opened the front door. | 18 | № 8 | зарубка III; фломастеры красят белую робу в зелёный (как хирургический костюм); охранник видит «доктора» и открывает парадную дверь (рифма с кадром 0) |
| 5 | Fourth: fake medical records convinced the prison he was dying. They sent him to a hospice. Then Texas got the news: Steven Russell was dead. | 25 | № 10, 12 | зарубка IV; поддельная медкарта; койка хосписа → бумага штата со штампом «DECEASED» (имя на бумаге, без фото) |
| 6 | He wasn't. | 2 | № 12 | твист: пауза, линия кардиограммы снова прыгает; **Atlas — шок** |
| 7 | Posing as a doctor, he'd checked himself out — and declared himself dead. | 12 | № 11, 12 (PN) | телефон хосписа «Dr.» (звонок видно, голосом не говорим); он уходит из хосписа; сам ставит штамп «DECEASED» |
| 8 | The one mistake that caught him? He couldn't stay away from the man he loved. | 15 | № 15, 16 (PN) | тюремная библиотека: две руки тянутся к одной книге; подпись «Phillip Morris» (имя только на экране); уважительно, без шуток; тихая подпись про фильм с Джимом Керри (№ 20) — на OK владельца |
| 9 | Texas gave him one hundred forty-four years. One hour a day outside his cell. Because this man… | 17 | № 18, 19 | стена заполняется зарубками до «144»; часы «1 hour»; камера отъезжает → loop в кадр 0; **Atlas — медленные хлопки / ухмылка** |

Что убрано из v4 (−24 слова) и куда ушло:
- побег 1: «and they opened the door» → «and walked out» (что охрана открывает, уже сказал хук);
- побег 2: «dollars» — знак $ на экране;
- побег 3: «white», «like doctor's scrubs» — белая роба и превращение в хирургический костюм видны в кадре, «saw a doctor» объясняет;
- побег 4: «lost weight» (самый слабый факт — только по словам Рассела); «he faked… and» → «fake medical records convinced»;
- после твиста: «phoned the hospice», «for a fake treatment» — звонок видно в кадре;
- Моррис: имя «Phillip Morris» — подписью на экране (меньше имён в голосе, R-1), «And» в начале строки;
- финал: «— and» → точка (два коротких удара: 144 года. Один час в сутки).

Петля (правка владельца 25.10): голос обрезан после «Because» → «…outside his cell. Because… | this man walked out of a maximum-security prison four times.» — без двойного «this man»; дверь кадра 0 открывается на «Because».


## История вариантов (24.10)

- v3 (118 слов, ≈ 36–41 s) — та же структура, но побеги одной строкой; владелец: деталей мало.
- **v4** (166 слов, ≈ 50–57 s) — подробно; владелец: «детали оставь, но уложись в ~45 с» → v5:
```
This man walked out of a maximum-security prison four times. The guards held the door.
First: dressed as a workman, he tapped a police radio on the guards' window — and they opened the door.
Second: posing as a judge, he phoned the jail and cut his own bail from nine hundred thousand dollars to forty-five thousand.
Third: he colored his white uniform with green markers, like doctor's scrubs. The guard saw a doctor and opened the front door.
Fourth: he faked his medical records and lost weight — until the prison believed he was dying. They sent him to a hospice. Then Texas got the news: Steven Russell was dead.
He wasn't.
He'd phoned the hospice posing as a doctor, checked himself out for a fake treatment — and declared himself dead.
And the one mistake that caught him? He couldn't stay away from Phillip Morris — the man he loved.
Texas gave him one hundred forty-four years — and one hour a day outside his cell. Because this man…
```
- **A — черновик владельца** (`PRODUCTION_PROMPT.md` §2): хук «This man walked out of prison four times. He never dug a tunnel.» —
  владелец: «такие себе» хуки, нужен жёстче.
- **B — мои правки A** (135 слов, 67 %): «This time, the police knew where to look», «fell in love with», «The guard opened the front door».
- **GPT** (115 слов, 64 %): взяты «And the one mistake that caught him?» и «the man he loved»; не взяты: пропущен побег с рацией
  (обещает 4, показывает 3; залог назван «First»), «No tunnels. No weapons. Just lies…» отвечает на «как?» уже на 3–5 s.
- **Grok** (230 слов ≈ 70–79 s, твист 94 %): взят только «maximum-security»; остальное — ошибки против FACTS (AIDS голосом,
  «body bag», «toy walkie-talkie», «bleached», «multi-million fraud», 144 года до 4-го побега, «former police officer», «IQ»).

## Проверка фактов (24.10)

- «maximum-security»: Houston Press 14.05.1998 и Dallas Observer 13.05.1998 — «Estelle Unit in Huntsville, a maximum-security prison»
  (побег 3). Побеги 1–2 — Harris County Jail, 4 — через хоспис. «Four times» из maximum-security — **преувеличение по решению владельца**.
- «The guards held the door»: дверь открывали в побегах 1 (HP97 «A jailer opened the door») и 3 (HP97 «she opened the prison door»);
  в 2 и 4 его выпустили сами — тоже преувеличение хука.
- «phoned the jail» как судья: HP97 — «a detention clerk at the jail received a call…»; UPI 23.12.1996 — «called a court clerk».
- «the one mistake that caught him»: PinkNews — «He was caught because he refused to let go of something law officials could track:
  Phillip Morris» (о последней поимке; ранние поимки 1992/1996 с Моррисом не связаны — HP97).
- Побег 4 подробно: PN — подделанные медкарты, потеря веса (по его словам), звонок в хоспис «врачом экспериментального лечения», «had himself
  taken away… for the fictitious treatment and later declared himself dead»; HP00 — куратору сообщили о смерти. Слово AIDS не звучит.
- «dressed as a workman»: HP97 («Dressed as a workman and holding the walkie-talkie, he tapped on the window of a guard station»).
- Слово AIDS, даты, Джим Кемпл, растрата, «всё ради Морриса», «пятница 13-е» — в тексте нет (DO NOT SAY).
- «В 2024 его выпустили» — не подтверждено (TDCJ: Стивена Джея Рассела в базе нет; пресса молчит; у Wikipedia — Instagram), не вошло.

Title (без спойлера): **He Walked Out of Prison 4 Times 🚪**
