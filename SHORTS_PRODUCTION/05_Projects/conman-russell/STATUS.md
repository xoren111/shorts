# STATUS — conman-russell (ATLAS APE #7, «He Walked Out of Prison 4 Times»)

Бриф: `~/shorts/atlas-ape/conman-russell/PRODUCTION_PROMPT.md` · факты: `FACTS.md` (копия из `~/shorts/atlas-ape/conman-russell/`).

## Где мы (25.10.2026, ночь)
- [x] Проект создан `new_project.sh conman-russell`, FACTS.md скопирован.
- [x] **Точка 1:** текст v5 утверждён владельцем 24.10 (`SCRIPT.md`, `voiceover.txt`; история A → B → v3 → v4 → v5 там же;
      хук-преувеличение — FACTS № 21).
- [x] **Точка 2:** владелец выбрал **C1** (24.10) → `vo_constantino_C1.wav`, `project.json` → `vo`. Было: `vo_paid/` (gen.py / tight.py / measure.py, копия из football-222, KEEP-паузы: «door» 0.24,
      «dead» 0.42, «wasn't» 0.24, «loved» 0.36). Constantino `ApsbCjXt5HguctE80a0i`, `eleven_v4`, speed 1.0, PAID-ключ, паузы 0.15 s:
      `take_C1_44s.wav` (= vo_paid/C1_tight15.wav) — 44.2 s, 3.28 сл/с, твист 30.3 s; `take_C2_48s.wav` (= C2_tight15.wav) — 47.7 s, 3.04 сл/с,
      твист 33.5 s, медленнее, слышны вдохи в паузах. Whisper: все 145 слов на месте (расхождения — только цифры и «guard/guards» на стыке «guard saw»).
      После выбора: файл → `vo_constantino_<take>.wav` + `project.json` → `vo`, затем часы монтажа.
- [x] Часы монтажа: `short/data/words.json` (142 слова, речь 0.00–44.04 s, твист «wasn't» 30.27 s); `align` в project.json: expand чисел,
      склейка «maximum-security», loose-сверка guard/guards, `el_words` = `vo_constantino_C1_el_words.json` (поправка слов после пауз).
- [x] **Точка 3 (ждём OK):** `EDIT_PLAN.md` (22 бита, 64 события) + эскизы всех сцен в коде (`short/src/scenes.tsx`, `src/ui/cast.tsx`,
      `src/data/beats.ts`), лист `keyframes_sheet.jpg` (= `short/out/sheets/keyframes_sheet.jpg`). Черновой замер 0–6 s: motion 0–1 = 20.1,
      1–6 = 10.1 (впритык). Atlas: карточки владельца shock / clap (`public/atlas`, cutout_cards). Фото: `public/img/701_jail_houston.jpg` (PD).
      Вопросы владельцу: 8 SFX Freesound CC0 (в 03_Assets нет тюремных звуков); музыка Mischief Maker (CC BY).
- [x] Точка 3 — OK владельца 24.10 (Freesound CC0 — да, музыка Mischief Maker).
- [x] Сборка 25.10: 39 SFX (30 библиотека + 9 Freesound CC0 через fetch_asset) → `events.ts` (62 события) → check.mjs OK → mix (−14.2 LUFS,
      TP −1.1, музыка −15.5 LU под голосом) → render → final_pass → srt. Правки по QA: заголовки бланков → символы (dupes), подпись фото
      «Houston, Texas», 3 «скачка кадра» сглажены, проезды камеры в тихих планах, пылинки и тени в финале, слой петли = камера хука.
- [x] Сдача: `06_Exports/conman-russell/` (mp4, `.en.srt`, contact sheet, CREDITS.md, YOUTUBE.md), обложка
      `07_Thumbnails_Covers/conman-russell/conman_russell_cover.jpg` (2160×3840), QA `08_QA_Reports/conman-russell/conman-russell_QA.md`,
      реестр разнообразия — delivered 25.10.
- [x] **v2 — правки владельца 25.10:** хук «4×» вместо зарубок у края, охранник дремлет (без бумаги на лице), живой город за дверью,
      библиотека — два заключённых тянутся к одной книге, стена с нарами / ложкой / меловыми значками, финал — сутки как часы (23 h решётка,
      1 h солнце), **бесшовная петля** (голос обрезан после «Because», бит `door` = дверь кадра 0, музыка на стыке 0.12 / 0.15 s), Atlas убран
      (отступление F5). Длина 43.64 s. QA v2: M1 20.06, M2 10.69, M4 0, mean 6.25.
- [x] **v3 — правки владельца 25.10, раунды 2–3:** на «four times» — четыре двери вместо «4×» (красные лучи, прожектор, свет на пол),
      сцена «He couldn't stay away…» — **«бинокль у мотеля»** (после «библиотеки», «большого сердца» и «красной нити»; владелец спросил про
      риски «мотеля / ЛГБТ» — YouTube не ограничивает, риск только по законам РФ и в основном в голосе; решил оставить), финал — настенные часы
      (только «12»), выход из камеры на солнце, жест «честь» убран. QA v3: M1 20.06, M2 10.97, M4 0, mean 6.36, петля 0.77.
- [x] **Финал принят владельцем 25.10:** M3 motion_mean 6.36 < 7 (FAIL гейта `qa.sh`) — принят как WARN («Принимаю финал, среднее
      движение 6,36 — как предупреждение»), записано в `08_QA_Reports/conman-russell/conman-russell_QA.md`.
- [x] Пакет загрузки 25.10 (`YOUTUBE.md`, по анализу 482 Shorts через YouTube Data API → `02_Research/titles/`): название
      «He Escaped Prison 4 Times Without Breaking a Lock 😳» (+2 запасных), описание с кредитами, теги, закреплённый комментарий,
      субтитры EN + ES / PT-BR / FR / DE (`project.json` → `srt_translations`), переводы названия и описания на 4 языка.
- [ ] Загрузка — делает владелец: Private → обложка `07_Thumbnails_Covers/conman-russell/conman_russell_cover.jpg` → Checks → AI use: No →
      публикация; после — `python3 short/tools/variety_check.py short/out/FINAL/conman_russell_yt.mp4 --register --status published --date <день>`;
      через 24 h / 7 дней — цифры Studio в memory `atlas-ape-retention`.
- [ ] Перед каждой AI-генерацией — спросить (≤ 4–6, в 0–3 s — ни одной).
- [ ] Сборка, QA (`08_QA_Reports/conman-russell/`), сдача (`06_Exports/conman-russell/`, обложка `07_Thumbnails_Covers/conman-russell/`),
      `variety_check.py --register`, TOPICS.md ✅.

## Что в шаблоне мешало (для доработки)
- В шаблоне нет инструментов голоса (gen / tight / measure) — копировал из `atlas-ape/football-222/vo_paid` и правил пути, ключ, KEEP-слова;
  `tight.py` падал бы на отдельном «—» в тексте (нет букв) и обрезал паузы перед твистом до GAP + 0.1 s. Стоит положить `tools/vo/` в шаблон.
- `align.py`: не умел склеивать дефисное слово сценария, которое whisper делит на два («maximum-security»), и путал guard / guards / guard's —
  добавил склейку соседей и «мягкую» сверку (апостроф / конечная s). Короткие слова после паузы («window — and») уезжали в остров до паузы —
  добавил опцию `align.el_words` (часы ElevenLabs переносят такое слово за паузу). Всё это стоит перенести в шаблон.
- `check.mjs` грузит `beats.ts` отдельным файлом из `out/` — импорт из соседнего модуля в beats.ts ломает проверку (константы раскладки пришлось
  держать прямо в beats.ts). Стоит написать это в README шаблона.
- Плоская рисованная графика даёт motion 0–1 ≈ 4 (порог L2 — 20): в шаблоне нет готового «хука-рывка» (crash-zoom + дрожь + пыль) для
  рисованных роликов — пришлось подбирать за 4 итерации. Стоит сделать компонент `HookPunch` и черновой `tools/hook_motion.sh` (рендер 0–6 s + measure).
- `render.mjs` молча берёт старые куски `out/chunks` после правки сцен (README это говорит только для `ONLY=`): один полный перерендер ушёл
  впустую, цифры QA не изменились. Стоит проверять mtime исходников против кусков или печатать «reused N chunks».
- `qa.sh` делает M3 (motion_mean, порог [L]) жёстким FAIL, а стандарт 9E пишет его как [L] без FAIL — надо договориться, гейт это или WARN.
- `dupes.py` (OCR) читает надписи-реквизит на рисованных бланках («BAIL BOND») как дубль голоса и ряды окон на фото как текст — для
  рисованных роликов про документы это частые ложные срабатывания; нужен белый список / маска зон реквизита.
- В шаблоне нет рисованных людей кроме персонажей Pig War (фермер, часовой) — герой, охранник, двери, стена, рация, фломастер написаны
  заново (`src/ui/cast.tsx`); их стоит перенести в шаблон как общий «каст».
- Петля «последняя строка → первая» в шаблоне только визуальная: нет готового способа обрезать голос в середине фразы (align.py ломался на
  «додуманном» whisper слове — добавил `align.drop_zero_tail`), музыка на стыке проваливается на 0.5 s (fade-in) — добавил `music_fade_in /
  music_fade_out / music_end_lead` в mix.py; бит-«предпросмотр кадра 0» (HookArt при t < 0) стоит сделать стандартным компонентом.
- `new_project.sh` оставляет в CREDITS.md строки демо (голос `vo_demo.wav`, Gymnopédie) — пришлось чистить руками.
