# STATUS — hay-castle (ATLAS APE, серия A, ролик A1: «This Farmer Hid a CASTLE Behind Hay»)

Тема: фермер спрятал «замок» за стеной из тюков, суд решил, что тюки — часть стройки (Fidler v SSCLG [2010] EWHC 143 (Admin)).
Выбрана владельцем 25.10 из подбора «с чистого листа» (`~/shorts/atlas-ape/TOPICS.md`, верх). Серия A, переменная baseline
(`~/shorts/atlas-ape/RESULTS.md`, строка A1).

## Где мы (25.10.2026, ночь) — СДАНО
- [x] Сценарий: 3 автора → сверка фраз с решением суда и прессой → 3 судьи → сборка → финальная проверка («ready»).
      `voiceover.txt` (124 слова), `FACTS.md`, `SCRIPT.md` (карточка темы, план на 22 сцены, упаковка), шапка `EDIT_PLAN.md`.
- [x] Голос: ElevenLabs PAID, Constantino `ApsbCjXt5HguctE80a0i`, eleven_v4, speed 1.0; `vo_paid/` (gen / tight / measure, KEEP-паузы
      won 0.42 / started 0.30 / rejected 0.30 / jail 0.24, остальные 0.15 s). Дубли: `take_C1_39s.wav` (39.13 s, 123/124 — «bales/bails»),
      `take_C2_38s.wav` (38.12 s, 124/124). Взят **C2** (`vo_constantino_C2.wav`) по разрешению владельца «делай и собирай»; C1 — запасной,
      замена дешёвая (события привязаны к словам).
- [x] Часы монтажа: `short/data/words.json` (align.py из conman-russell с `el_words`), речь 0.00–38.12 s, твист «hiding» 18.16 s (47.3 %),
      «Bats.» 25.04 s. `story_gate.py`: все гейты пройдены.
- [x] Рисунки и сцены (workflow `hay-castle-build`): `src/ui/hay_a.tsx` (фермер, тюки, замок, таймер), `src/ui/hay_b.tsx` (поле, машина,
      молоток, штампы, страница суда, летучая мышь, тритон, экскаватор, двери), `src/scenes.tsx`, `src/data/beats.ts` (23 бита),
      `src/data/events.ts` (52 события, 118 SFX-cues из библиотеки); 2 круга проверки скептиком + правки.
- [x] Ключевые кадры отправлены владельцу (R9), рендер, final_pass, субтитры EN / ES / PT-BR / FR.
- [x] QA (`08_QA_Reports/hay-castle/hay-castle_QA.md`): 0 FAIL; правки по QA — страница суда и коврик без текста, плавная стрела
      экскаватора, флаг не обрезается в углу, трава без «!!!» для OCR. Независимая проверка: «ready».
- [x] Сдача: `06_Exports/hay-castle/` (hay_castle_yt.mp4 38.44 s, 4 × .srt, CREDITS.md, YOUTUBE.md, contact sheet), обложка
      `07_Thumbnails_Covers/hay-castle/hay_castle_cover.jpg` (2160×3840), реестр разнообразия — delivered 25.10.
- [ ] Загрузка — делает владелец (YOUTUBE.md): Private → обложка → субтитры → Checks → AI use: No → публикация; закрепить вопрос
      в первый час; затем `python3 short/tools/variety_check.py short/out/FINAL/hay_castle_yt.mp4 --register --status published --date <день>`
      и дата в строке A1 `~/shorts/atlas-ape/RESULTS.md`; через 24 ч / 72 ч / 7 дн — `python3 ~/shorts/atlas-ape/analytics/pull.py`.

## Решения и ловушки
- «hay» на экране текстом не писать (в суде straw) — только пиктограмма тюка, в том числе в субтитрах (слова 6, 72, 119).
- Тюрьма — только условие («or face jail»): срок условный, он подчинился. Герой жив: только суд и пресса.
- Если монтаж потребует < 38 s — ничего не резать; если правки текста — перезапуск `vo_paid/gen.py`, `tight.py`, align.
