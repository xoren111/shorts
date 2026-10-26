# CREDITS — <slug>

Каждый файл из `public/` — одна строка: файл · что это · источник (URL) · лицензия · атрибуция. `tools/check.mjs` проверяет,
что у каждой картинки и клипа из кода есть строка здесь, а у каждого мема из `public/memes/` — строка с `memes/<имя>`,
источником, владельцем и риском (стандарт R7). Файлы Mixkit (`*_mixkit.*`) не используются: файлы библиотеки заменены и перенесены
в `_quarantine`, `check.mjs` их отклоняет. Строки CC BY / BY-SA идут и в описание ролика (`YOUTUBE.md`, готовые тексты —
`00_Docs/ASSET_LIBRARY.md`, раздел 14).

## Голос
- `vo_demo.wav` — DEMO: синтез macOS `say` только для проверки пайплайна. **Не публиковать** (системные голоса — только личное некоммерческое использование). В настоящем ролике: ElevenLabs PAID (Starter), голос <имя>.

## Музыка
- Gymnopédie No. 1 — Erik Satie, piano Robin Alciatore (Musopen, public domain) — https://commons.wikimedia.org/wiki/File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg — PD; только Shorts ≤ 60 s (риск ложного Content ID «средний»). Файл берётся из `03_Assets/Music/documentary_neutral/` (путь в `project.json`).

## Звук (`public/sfx`, пики нормализованы до −3 dBFS)
- `impact_punch_heavy_kenney.wav`, `impact_sub_boom_kenney.wav`, `pop_drop_soft_kenney.wav`, `blip_confirm_kenney.wav` — Kenney (kenney.nl: impact-sounds, sci-fi-sounds, interface-sounds) — CC0 1.0 — атрибуция не нужна (из `03_Assets/Sound_Effects`).
- `whoosh_selfmade.wav` — собственный (ffmpeg, розовый шум) — своё.

## Графика и текстуры
- `vox/paper.jpg` — бумажная текстура канального kit (Pig War v3 / 222–0) — своё.
- `fx/grain_0.png … grain_7.png` — кадры плёночного зерна канального kit — своё.
- `fonts/Montserrat-VariableFont_wght.ttf`, `fonts/Anton-Regular.ttf`, `fonts/AlfaSlabOne-Regular.ttf` — Google Fonts — SIL OFL 1.1 (тексты лицензий рядом: `fonts/OFL_*.txt`).
- Рисованные сцены (`src/ui/draw.tsx`, `chars.tsx`, `gfx.tsx`, `vox.tsx`) — код канала, без сторонних исходников.

## Карты и трекинг (`data/maps`, `data/tracks` — данные в бандле, не `public/`)
- Natural Earth 10m (суша, озёра, реки, admin-0) — public domain (naturalearthdata.com), атрибуция не нужна — `tools/make_map.py` → `data/maps/*.json`.
- Тестовая карта `data/maps/demo_reich1937.json`: границы Deutsches Reich 31.12.1937 — OpenHistoricalMap relation 2693085 — CC0 1.0.
- Образец для исторических границ historical-basemaps (André Ourednik, world_YYYY) — GPL-3.0: строка здесь + атрибуция в описании (`tools/map_check.py` ищет имя источника).
- `data/tracks/keaton_wind.json` — трек `tools/track.py` (SAM 2 + CSRT), своё; сам клип (имя — поле `clip` трека) в шаблон не входит: `fetch_asset.py lib 03_Assets/Cinematic_Effects/pd_film_inserts/<clip>` (PD, Wikimedia Commons) копирует его и пишет его строку сюда — без неё `check.mjs` (п. 14) отказывает; немецкий канал — нет (L6).
- Фигуры морфинга (`src/ui/shapes.ts`) и иконки графиков (`src/ui/charts.tsx`) — свои: окружности, полигоны, кривые в коде, без клипарта и логотипов.

## Галерея компонентов (композиция `Gallery` — тест шаблона, не публикуется)
- `3d/coin` — 3D-вставка: собственный рендер Blender (`tools/blender/examples/coin.json`, WebP 24 кадра) — своё; знак «$» набран шрифтом `Anton-Regular.ttf` (SIL OFL 1.1, строка выше).
- `lottie/lottie_eyes_u1f440_noto_animated.json` — Noto Emoji Animation (Google), https://googlefonts.github.io/noto-emoji-animation/ — CC BY 4.0 — атрибуция обязательна, если стикер попадёт в Short: строка «Animated emoji: Noto Emoji Animation by Google, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)» в описание (`YOUTUBE.md`) (из `03_Assets/Animations/lottie`).
