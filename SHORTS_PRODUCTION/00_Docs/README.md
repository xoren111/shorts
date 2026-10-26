# SHORTS_PRODUCTION — карта системы

Система производства Shorts для @ATLASAPE-S (EN, абсурдные правдивые истории; Atlas в роликах сейчас нет — решение владельца 25.10)
и других каналов в `~/shorts`. Корень: `/Users/khorengrigoryan/shorts/SHORTS_PRODUCTION`. Состояние на **2026-10-25**.
Стек: **Remotion 4.0.535** (монтаж, графика, субтитры, рендер) + **ffmpeg 9.0.1** (сведение, финальный энкод, QA) + **Blender 5.2.2** (3D, трекинг) + **whisper-cli** (тайминг слов) + **ElevenLabs PAID** (голос). Всё уже установлено; новое ставить не нужно.

## Папки

| Папка | Что лежит | Состояние |
|---|---|---|
| `00_Docs/` | документы системы (ниже) | готово |
| `01_Input/` | входящее: то, что владелец скачал вручную (Pixabay, Pexels, YTAL, Freesound…), референсы, брифы | пусто |
| `02_Research/download_logs/` | машинные логи загрузок `sfx.json`, `music.json`, `visuals.json`, `memes.json`, `graphics.json` + логи замен Mixkit `freesound.json`, `music_replacement.json`, `pixabay.json` — источник истины по ассетам; `mixkit_manual_redownload.md` — отменённый реестр ручного перекачивания (история) | готово |
| `03_Assets/` | лицензионно-чистая библиотека: 848 файлов, 785.7 MB (SFX, музыка, оверлеи, переходы, киноэффекты, LUT, реакции, шрифты, иконки, эмодзи, Lottie) + `Licenses/` (36 заметок) + `_quarantine/` (92 файла, из них 88 Mixkit; не использовать) | готово (Mixkit заменён 24.10) |
| `04_Templates/` | канонический Remotion-шаблон `remotion_short` (ai-farm-girl + pig-war/short3 + football-222 + QA-инструменты; `new_project.sh`, `project.json`) | готово, проверено 24.10 (tsc, check.mjs, mix, render, final pass, QA) |
| `05_Projects/<slug>/` | рабочие проекты Shorts (копия kit, VO, факты, сценарий) | пусто |
| `06_Exports/<slug>/` | финал: mp4 + srt + contact_sheet + CREDITS.md + YOUTUBE.md | пусто |
| `07_Thumbnails_Covers/` | обложки 9:16 (2160×3840, JPG/PNG ≤ 50 MB) | пусто |
| `08_QA_Reports/` | `<slug>_QA.md` + JSON замеров (measure.py, ffprobe, ebur128, OCR); сейчас — отчёты проверки установки (`SETUP_VERIFICATION*.md`) и `template_demo/` | есть отчёты установки |

## Документы

| Файл | О чём |
|---|---|
| `00_Docs/README.md` | эта карта |
| `00_Docs/ENVIRONMENT_AUDIT.md` | аудит машины: инструменты, ограничения, рекомендуемый workflow, что Claude делает сам, что нужно от владельца, какие программы реально нужны; существующие kits |
| `00_Docs/SOFTWARE_DECISION.md` | сравнение 14 монтажных программ по 10 критериям, выбранный стек, что не ставить, что требует денег или разрешения |
| `00_Docs/SHORTS_EDITING_STANDARD.md` | стандарт монтажа: хук, плотность, переходы, субтитры, звук, финал, спецификация, решения R1–R10 за владельцем, процесс A–F, QA-чек-лист |
| `00_Docs/ASSET_LIBRARY.md` | индекс всех ассетов по категориям + каталог «только вручную / нельзя / платно» + что уже есть в `~/shorts` + **точные строки атрибуции** |
| `00_Docs/ASSET_DOWNLOAD_LOG.md` | журнал каждой загрузки: байты, sha256, источник, лицензия, результат проверки; неудачи и ручные позиции |
| `03_Assets/Typography/CAPTION_PRESETS.md` | пресеты субтитров и текста A/B/C, safe zone |
| `03_Assets/Memes_Reactions/MEME_CATALOG.md` | 32 мем-формата: права, риски, легальные замены; эмоции Atlas |
| `03_Assets/Sound_Effects/README.md`, `index.json`, `CREDITS.md` · `03_Assets/Music/README.md` · `03_Assets/Overlays/README_visuals.md` · `03_Assets/Fonts/README.md` · `03_Assets/Graphics/README.md` · `03_Assets/Animations/lottie/README.md` | как пользоваться каждой категорией |
| `03_Assets/Licenses/*_LICENSE.md`, `ATTRIBUTION_visuals.md` | лицензия каждого источника (коммерция, атрибуция, ограничения, дата проверки) |

## Жёсткие правила (кратко; подробно — SHORTS_EDITING_STANDARD.md)

- **Сначала — обязательный минимум 4.0 G1–G7** (аудит 25.10; проверяет `tools/story_gate.py` через `check.mjs` п. 15 и `qa.sh`): 0–10 с без годов,
  месяцев, имён людей и подписей мест; вторая фраза поднимает ставку; твист на 35–55 % длины; хвост ≤ 1,5 с; скрин-момент; замороженная
  серия с одной переменной (`~/shorts/atlas-ape/RESULTS.md`); тема — через фильтр Т1–Т7 (`~/shorts/atlas-ape/TOPICS.md`).
- Строка 1 VO = ставки или абсурдное действие, **без спойлера**; без смертей родственников. Title и обложка тоже без спойлера.
- Одно визуальное событие на фразу, ничего статичного дольше 2–2.5 с; кадр 0 — живое и в движении (не карта, не дата). Motion в секунде 0–1 ≥ 20.
- Текст не дублирует голос (если фраза крупно на экране — её субтитр скрыт); белый + оранжевый, обводка, без наклона; субтитры только во время речи.
- **Atlas в роликах ATLAS APE сейчас нет** (решение владельца 25.10, F5 / G6). Когда вернут — только реакция и только из арта владельца (`~/shorts/orangutan`), ничего не дорисовывать.
- AI-кадры (Flow/Gemini/Veo владельца) — только в 4–6 ключевых моментах, никогда пачкой.
- Ассеты — только из `03_Assets` (не из `_quarantine`) или проверенных «existing»; FREE-key ElevenLabs и копирайтные мемы — нет (по умолчанию никогда: риск страйка и исключения из revenue sharing; исключение — письменное OK владельца на конкретный ролик).
- **Mixkit:** не используем. 24.10 все 88 файлов Mixkit перенесены в `03_Assets/_quarantine/mixkit/` и заменены (Freesound CC0, Kevin MacLeod CC BY 4.0, Pixabay); к mixkit.co скриптами не обращаемся.
- Музыка в Short > 60 с — только YouTube Audio Library. AI-раскрытие обязательно для фотореалистичного AI с реальными людьми, событиями, местами. Немецкие каналы — без американских немых фильмов 1920-х.
- Хронометраж Atlas Ape ≤ 59 с (Short > 60 с с любым Content ID claim блокируется по всему миру).
- `python3` для measure.py / mix.py / sheet.py — **без `-I`** (иначе нет numpy).

## Как начать новый Short (шаблон `04_Templates/remotion_short`, собран и проверен 24.10)

Шаблон = ai-farm-girl/short + движок переходов и рисованные примитивы pig-war/short3 + Vox-коллаж football-222 + QA-инструменты.
Все настройки ролика — в `short/project.json`; подробно — `04_Templates/remotion_short/README.md`. Исходные kits не трогаем.

**1. Папка проекта** (копия шаблона, symlink на общий `node_modules` Remotion 4.0.535):
```
SP=/Users/khorengrigoryan/shorts/SHORTS_PRODUCTION
bash $SP/04_Templates/remotion_short/new_project.sh my-story     # → $SP/05_Projects/my-story
cd $SP/05_Projects/my-story
```
**2. Тексты:** `FACTS.md` (источник у каждого факта + «DO NOT SAY»), `SCRIPT.md`, `voiceover.txt`, `EDIT_PLAN.md` (стандарт 9A–9C).

**3. Голос и часы монтажа.** VO — ElevenLabs **PAID** (`~/shorts/atlas-ape/.env.elevenlabs_paid`, ключ не печатать) → `vo_<name>.wav`,
путь в `short/project.json` → `vo`. Демо-голос `vo_demo.wav` (macOS `say`) публиковать нельзя, `check.mjs` его не пропустит.
```
cd short
ffmpeg -y -i ../vo_<name>.wav -ar 16000 -ac 1 data/vo16k.wav
whisper-cli -m ~/.cache/whisper/ggml-large-v3-turbo.bin -ml 1 -sow -dtw large.v3.turbo -nfa -ojf -of data/whisper_words -f data/vo16k.wav -np
/usr/bin/python3 tools/align.py      # → data/words.json (сверка с voiceover.txt; омофоны — project.json → align)
```
**4. Монтаж:** `src/data/beats.ts` (биты и переходы), `src/data/events.ts` (событие на слове + SFX-cues), `src/scenes.tsx` (сцены;
демо-сцены заменить). Ассеты — только из `03_Assets` (`ASSET_LIBRARY.md`): копировать в `public/`, SFX плоско в `public/sfx/` +
запись в `index.json` (пик −3 dBFS), каждый файл — строка в `short/CREDITS.md`; файлов Mixkit в библиотеке больше нет (карантин 24.10); SFX из FLAC/AIFF/96 кГц
перевести в WAV 48 кГц. Atlas — на ATLAS APE сейчас нет (`project.json` → `atlas: null`, F5 / G6); для других каналов — карточка из арта владельца в `atlas`. Просмотр: `npx remotion studio`.

**5. Сборка** (от сети, не на батарее):
```
npx tsc --noEmit && node tools/check.mjs && /usr/bin/python3 tools/mix.py && CONC=3 node tools/render.mjs \
  && bash tools/final_pass.sh && /usr/bin/python3 tools/srt.py
node tools/stills.mjs --comp Short --every 1 --from 0 --to <DUR> --out out/sheets/all   # лист кадров до сдачи
```
`final_pass.sh` — финальный энкод под рекомендации YouTube (BT.709, GOP = fps/2, AAC 384k, без edit lists).

**6. QA → `08_QA_Reports/<slug>/`:** `bash tools/qa.sh out/FINAL/<slug>_yt.mp4` (measure.py, ffprobe-спека, ebur128, стемы, dupes,
blinks, cut_frames, grep запрещённых файлов), затем вердикт `<slug>_QA.md` по чек-листу `SHORTS_EDITING_STANDARD.md`, 9E.

**7. Сдача → `06_Exports/<slug>/`:** mp4 + `.srt` + contact_sheet + `CREDITS.md` + `YOUTUBE.md` (title без спойлера, описание с
кредитами CC BY из `ASSET_LIBRARY.md` раздел 14, ответ на «AI use» по R8). Своя обложка 9:16 — `07_Thumbnails_Covers/<slug>/`
(загружает владелец в YouTube Studio на компьютере; нужен подтверждённый аккаунт, YPP не нужен). Загрузку, Checks и публикацию
делает владелец (сначала Private).

Запасной путь (если шаблон чем-то не подходит): копия kit `ai-farm-girl/short` по рецепту из `ENVIRONMENT_AUDIT.md` и истории
этого README (rsync без `node_modules`, `out`, мемов, FREE-key SFX и `public/atlas`).

## Что открыто (решает владелец)

- **FREE-key ElevenLabs в уже сданных роликах:** `crowd_cheer_short.wav` в ai-farm-girl и yellow-fleet (загружен 21.10), 8 `*_el.wav` в сданном Volcano. Бесплатный план — некоммерческий; держать эти ролики вне монетизации или перезалить с заменой звука.
- **Копирайтные мемы в ai-farm-girl** (Travolta, CJ, Stonks): кроме claim возможен страйк; при монетизации такой Short «неоригинальный».
- **Mixkit — решено 24.10:** 88 файлов в карантине, заменены (60 SFX Freesound CC0, 8 треков Kevin MacLeod CC BY 4.0, 19 клипов Pixabay; переход «рваная фигура» — без замены, кодом `JaggedReveal` — компонент ещё не написан). Осталось владельцу: прослушать и просмотреть замены (подбирались без прослушивания; 10 SFX и 4 видео — частичные совпадения, список — `ASSET_LIBRARY.md`, разделы 1 и 15), решить про запасные варианты (настоящий тромбон CC BY, записанное сердцебиение, возврат каретки).
- Право на бесплатную лицензию Remotion (физлицо / компания ≤ 3 человек); ручные загрузки из каталога «manual»; сверка лицензий треков `music_calm` в YouTube Audio Library; замена Baker 1946 копией NARA/DOE (если нужна); доход от Shorts с 01.02.2027 требует ≥ 10 млн просмотров Shorts за 90 дней; опционально ffmpeg-full и Resolve free; чистка диска.

Подробно — `08_QA_Reports/SETUP_VERIFICATION.md`, `ENVIRONMENT_AUDIT.md` (раздел 5) и решения R1–R13 в `SHORTS_EDITING_STANDARD.md`.
