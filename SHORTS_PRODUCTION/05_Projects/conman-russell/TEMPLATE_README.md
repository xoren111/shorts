# remotion_short — канонический шаблон Short (Remotion 4.0.535)

Собран 2026-10-24 по плану `00_Docs/ENVIRONMENT_AUDIT.md`, раздел 3, шаг 1. Основа — `~/shorts/atlas-ape/ai-farm-girl/short`
(самый новый сданный kit), плюс движок переходов и рисованные примитивы `pig-war/short3`, Vox-коллаж `football-222`
(`vox.tsx`, он же в ai-farm-girl) и QA-инструменты. Исходные kits **не менялись** — всё скопировано.
Доработан 24.10 (вечер): окна Atlas из арта владельца, 3D-вставки Blender, Lottie-стикеры, переход `jagged`, A/B-тест (R2),
`fetch_asset.py`, sha256-защита карантина, композиция `Gallery`. Демо-ролик (`template-demo`) остался техническим тестом.
Ночью 24.10 добавлен набор моушн-дизайна (раздел «Моушн-дизайн»): кинетическая типографика, текст на объектах с трекингом,
анимированные карты и графики, морфинг фигур; их правила проверяет `check.mjs` (п. 6, 12–14), тест-композиции — `MotionDemo` и др.
Правила монтажа — `00_Docs/SHORTS_EDITING_STANDARD.md`; этот README — только «как пользоваться».

## Что внутри

```
remotion_short/
  new_project.sh        копия шаблона в 05_Projects/<slug> + symlink node_modules (без out/, data/fetch, __pycache__)
  FACTS.md SCRIPT.md EDIT_PLAN.md voiceover.txt   тексты проекта (шаблоны; FACTS проверяет check.mjs)
  vo_demo.wav           ДЕМО-голос (macOS say) — только для проверки пайплайна, НЕ публиковать
  short/
    project.json        ВСЕ настройки ролика (см. ниже) — единственный файл, который правят tools
    CREDITS.md          строка на каждый файл из public/ (check.mjs проверяет)
    data/words.json     часы монтажа (tools/align.py)
    src/Root.tsx        композиции: Short, Short-A / Short-B (только при ab.enabled) + тесты: Gallery, KineticGallery, ChartsGallery,
                        MapsDemo, MorphShowcase, MorphReveal, MotionDemo (раздел «Моушн-дизайн»)
    src/Short.tsx fonts.ts index.ts
    src/Gallery.tsx     тест компонентов (окно Atlas, Clip3D, LottieSticker, jagged + по сцене на группу моушн-дизайна) — не
                        публикуется, демо не трогает
    src/MotionDemo.tsx  тест: весь набор моушн-дизайна в одной плотной L2-последовательности (~22 s)
    src/KineticGallery.tsx ChartsGallery.tsx MapsDemo.tsx   тесты пресетов кинетики, графиков, карт
    src/engine/transitions.tsx   движок переходов (none/fade/up/circle/zoomthru/diag/whipL/whipR/punch/jagged), Timeline, subYAt
    src/engine/jagged.tsx  переход «рваное раскрытие» (jagged, 0.4 s): звезда из точки at или рваный фронт от края; JaggedRim — кромка
    src/data/beats.ts   таблица битов (данные), src/data/events.ts — события на словах + SFX-cues
    src/scenes.tsx      сцены ролика (в шаблоне — демо из рисованных примитивов), экспорт SCENES + FirstFrame
    src/lib/time.ts     FPS 60, W(i)/We(i), VO_END / DURATION / LOOP_T из project.json и words.json
    src/ui/gfx.tsx real.tsx vox.tsx Subtitles.tsx   (ai-farm-girl) · draw.tsx chars.tsx (pig-war/short3)
    src/ui/Atlas.tsx    окна Atlas из project.atlas (+ A/B-окно), AtlasWindowView; AtlasLayer / CardLayer для ручных кадров
    src/ui/Clip3D.tsx   3D-вставка: RGBA-секвенция из public/3d/<name>/ (fps/кадры/размер из meta.json, loop / pingpong / hold /
                        once, x/y/w или fill, pop-in, тень)
    src/ui/LottieSticker.tsx  Lottie-стикеры из public/lottie (@remotion/lottie, delayRender, speed/loop/hold/offset)
    src/ui/kinetic.tsx  кинетическая типографика <Kinetic> (6 пресетов, автоподгонка в safe zone)
    src/ui/Tracked.tsx  текст и маркеры на движущемся объекте: TrackedVideo + Label / Ring / Arrow / Spotlight / Outline
    src/ui/maps.tsx     анимированные карты: MapCamera, MapBase, RegionFill, MapRoute, MovingToken, AdvanceArrow, PinPop, MapLabel
    src/ui/charts.tsx   графики: BarGrow, LineDraw, CompareBeforeAfter, DonutFill, IconRow (R6 в коде)
    src/ui/morph.tsx shapes.ts morph_demo.tsx   морфинг фигур: Morph, MorphMask, библиотека из 11 своих фигур, тесты
    data/maps/          карты make_map.py (в шаблоне — 3 тестовые demo_*, 0.9 MB); data/tracks/ — треки track.py (keaton_wind, 124 KB)
    public/sfx          5 демо-SFX (Kenney CC0 + свой whoosh), пик −3 dBFS, index.json с license
    public/fonts        Montserrat VF + Alfa Slab One (крупный шрифт канала, HEAD) + Anton (OFL) — офлайн-шрифты (правило T12), public/fx/grain_*, public/vox/paper.jpg
    public/3d/coin      тестовая 3D-вставка для Gallery (WebP, 24 кадра, 0.9 MB, examples/coin.json)
    public/lottie/      Lottie проекта из 03_Assets/Animations/lottie; в шаблоне — Noto «eyes» для Gallery (CC BY 4.0)
    public/atlas/       (пусто в шаблоне) карточки и кадры Atlas проекта — делает tools/atlas
    public/memes/       (нет в шаблоне) мем-вставки проекта по R7: файл или папка кадров на мем, ≤ 2, строка «Мем:» в EDIT_PLAN.md
    tools/check.mjs     валидатор до рендера (см. ниже) → out/timeline.json
    tools/align.py      whisper large-v3-turbo + waveform → data/words.json, сверка с voiceover.txt
    tools/mix.py        сведение: SFX-стем, музыка с sidechain, two-pass loudnorm −14 LUFS / TP ≤ −1 dBTP
    tools/render.mjs    чанковый рендер (300 кадров, CONC, ONLY=…, VARIANT=A|B), BT.709, AAC 384k; звук дополняется / обрезается
                        под картинку — в файле все кадры композиции (печатает «✓ 665 / 665 frames»)
    tools/final_pass.sh финальный энкод под рекомендации YouTube (GOP = fps/2, без edit lists; VARIANT=A|B), тоже все кадры
    tools/srt.py        SRT для загрузки (+ переводы из project.json)
    tools/stills.mjs sheet.py    стопкадры и листы кадров (--comp Short | Short-A | Short-B | Gallery)
    tools/fetch_asset.py  один ассет → public/ + CREDITS.md (+ public/sfx/index.json): lib <путь в 03_Assets> | pixabay images|videos <id> |
                        freesound <id>; лицензия из 02_Research/download_logs, отказ: карантин, Mixkit, FREE-key, NC/ND, Atlas
    tools/quarantine_gate.mjs   sha256 каждого файла public/ (+ project.music) против _quarantine (кэш SHA256SUMS), «quarantined» в
                        download_logs и FREE-key ElevenLabs — ловит переименованные и побайтно одинаковые копии, перекодированные —
                        нет (вызывают check.mjs п. 8 и qa.sh)
    tools/qa.sh         QA-прогон → 08_QA_Reports/<slug>/ (measure.py + гейты M1–M4 по level → motion_gates.txt, ffprobe, ebur128, dupes,
                        blinks, cut_frames, запрещённое по имени и по sha256, разнообразие ленты → variety.txt + variety_sheet.jpg);
                        exit 1 при FAIL; VARIANT=B → …/<slug>/ab_B/
    tools/variety_check.py  разнообразие ленты (стандарт 4.1 H14): кадры 0 / 1 / 2 s и строки «Визуальная идея» / «Кадр 0» из
                        EDIT_PLAN против 5 последних Shorts канала в реестре 06_Exports/_variety_registry; --register в 9F
                        (раздел «Разнообразие ленты»; вызывают check.mjs п. 11 и qa.sh)
    tools/ab_corner.py  A/B: ранжирует углы tl / tr / bl на стопкадрах версии A — куда поставить Atlas, чтобы не закрыть объект кадра 0
    tools/vdiff.py      структурное сравнение двух рендеров по кадрам (кадр «отличается», если > 0.1 % пикселей разнятся > 24 уровней)
    tools/kinetic_check.mjs  <Kinetic> → hide_subs (--fix), T5 / T7 / T11 (п. 12 check.mjs)
    tools/track.py      трекер SAM 2.1 + CSRT (py312) → data/tracks/<name>.json + лист кадров
    tools/make_map.py map_check.py   карты из Natural Earth / границ эпохи; проверка границ, лицензий, R4 (п. 13 check.mjs)
    tools/chart_facts.mjs  числа графиков против FACTS.md и счётчики R6 (п. 6 check.mjs)
    tools/morph_check.mjs  геометрия морфа без браузера: самопересечения, «вытекшие» дырки
    tools/atlas/        мост к Atlas: cutout_cards.py, atlas_scene.py, atlas_webp.py, atlas_check.py, common.py (раздел «Atlas»)
    tools/blender/      3D-вставки: run.sh (Blender 5.2 headless --factory-startup, ОДИН GPU-слот на весь Mac — flock
                        /tmp/shorts_blender_gpu.lock), shot.py (JSON-спека → PNG/WebP-секвенция + meta.json), check3d.mjs, sheet3d.py,
                        examples/coin.json, README.md
    tools/measure.py dupes.py ocr.swift blinks.py cut_frames.py   метрики и проверки (QA 9E)
    node_modules -> ~/shorts/tools/remotion_nm/node_modules   (overlay: ссылки на общий volcano/short/node_modules + @remotion/lottie, transitions, motion-blur, gif, layout-utils 4.0.535 и lottie-web; не npm install)
```

## project.json

| Поле | Что задаёт |
|---|---|
| `slug`, `out_name` | имя проекта и файла в `out/FINAL/` (ставит `new_project.sh`) |
| `channel` | `atlas-ape` или `de-…` (немецкий канал → check.mjs запрещает американские немые фильмы 1920-х, L6) |
| `level` | `L1` / `L2` / `L3` → лимит разрыва событий 2.5 / 2.0 / 1.2 s и полоса событий на 10 s (раздел 8 стандарта) |
| `library_root` | путь к `SHORTS_PRODUCTION` (для путей `03_Assets/…`) |
| `vo` | файл голоса в папке проекта (рядом с `voiceover.txt`) |
| `music`, `music_license`, `music_gain_db` | трек (`03_Assets/…` или путь от папки проекта; `null` = без музыки), его лицензия, усиление (эталон канала −21.6 dB для трека нормальной громкости) |
| `music_out_word`, `music_in_word`, `music_end_word` | индексы слов: музыка уходит за 0.25 s до слова (reveal на одних SFX), возвращается за 0.1 s, заканчивается после слова (`null` = нет) |
| `tail_s`, `loop_s`, `vo_end`, `duration` | хвост после последнего слова, длина loop-растворения в кадр 0; `vo_end` / `duration` — ручная правка (иначе считаются) |
| `allow_over_60` | Short > 59 s только с `true` (отдельное решение владельца для этого ролика) и музыкой из YouTube Audio Library (R10, L4); с мемами не действует (R7) |
| `gold_words`, `teal_words`, `break_after` | субтитры: слова-акцент (1 на фразу; с 24.10 оранжевые, имя поля осталось), «водные» слова, разрыв группы после «…»/«—» |
| `hide_subs` | диапазоны слов `[a, b]`, чей субтитр скрыт, потому что фраза показана крупно (текст не дважды, T6): KeyFact / BigText, каждая `<Kinetic>` (`kinetic_check.mjs --fix` дописывает сам), слова под бегущим счётчиком графика (R6). Слова диапазона не возвращаются и в соседней группе субтитров |
| `map_period` | (необязательно) год событий карт (`1941`) или `"modern"`; без него ролик считается историческим, если в FACTS / SCRIPT / voiceover есть год до 1992 или канал `de-…` — тогда карта с современными границами = предупреждение (`map_check.py`) |
| `atlas` | `null` или окна Atlas из арта владельца: `{"source": "cards"/"rig", "poses": [...], "windows": [{"from_word", "to_word"/"end", "pose", "corner": "tl/tr/bl"}], "rig": {...}}` — раздел «Atlas»; старая одиночная карточка `{"card", "in_word", …}` работает |
| `ab` | A/B-тест (R2): `{"enabled": false, "variants": {"A": {"atlas_hook": false}, "B": {"atlas_hook": true, "atlas_hook_pose": "shock", "atlas_hook_corner": "tr", "atlas_hook_h": 300, "atlas_hook_until": 1.0}}}` — раздел «A/B-тест»; по умолчанию выключен |
| `variety` | `{"window": 5}` — со сколькими последними Shorts того же `channel` сравнивает `tools/variety_check.py` (раздел «Разнообразие ленты») |
| `align` | правки выравнивания: `expand` (цифры whisper → слова), `homophones` (`{"comm": "calm"}`), `numwords`, `dtw_shift` |
| `srt_translations` | `{"es": ["строка на каждую EN-реплику", …]}` |

## Новый Short

```
SP=/Users/khorengrigoryan/shorts/SHORTS_PRODUCTION
bash $SP/04_Templates/remotion_short/new_project.sh my-story        # → $SP/05_Projects/my-story
cd $SP/05_Projects/my-story
# 1. тексты: FACTS.md (источник у каждого факта + DO NOT SAY), SCRIPT.md, voiceover.txt, EDIT_PLAN.md (стандарт 9A–9C;
#    в шапке «Визуальная идея: …» и «Кадр 0: …» — не как у последних Shorts канала: python3 short/tools/variety_check.py --list)
# 2. голос: ElevenLabs PAID (ключ ~/shorts/atlas-ape/.env.elevenlabs_paid, не печатать) → vo_<name>.wav; в project.json "vo"
# 3. часы монтажа
cd short
ffmpeg -y -i ../vo_<name>.wav -ar 16000 -ac 1 data/vo16k.wav
whisper-cli -m ~/.cache/whisper/ggml-large-v3-turbo.bin -ml 1 -sow -dtw large.v3.turbo -nfa -ojf -of data/whisper_words -f data/vo16k.wav -np
/usr/bin/python3 tools/align.py          # MISMATCH → поправить align.homophones / expand в project.json
# 4. монтаж: src/data/beats.ts, src/data/events.ts, src/scenes.tsx; ассеты — по одному, вместе с лицензией:
/usr/bin/python3 tools/fetch_asset.py lib 03_Assets/Sound_Effects/impact/sfx_impact_quick_hit_freesound_755054.wav --as impact_quick_hit
/usr/bin/python3 tools/fetch_asset.py freesound 73581 --as trombone_sad --cat comedic --desc "…"   # CC BY → строка атрибуции в YOUTUBE.md
/usr/bin/python3 tools/fetch_asset.py pixabay images <id> --as <name>
/usr/bin/python3 tools/fetch_asset.py lib 03_Assets/Memes_Reactions/<cat>/<file>.mp4 --as shock --from 3 --dur 1.3   # мем: public/memes, без звука, строка «Мем:» печатается для EDIT_PLAN
/usr/bin/python3 tools/fetch_asset.py lib 03_Assets/Animations/lottie/<file>.json                  # → public/lottie + строка CREDITS (CC BY 4.0)
/usr/bin/python3 tools/fetch_asset.py lib 03_Assets/Music/<mood>/<file>.mp3 --set-music
#    (+ Atlas: раздел «Atlas»; 3D: раздел «3D-вставки»; кинетика, трекинг, карты, графики, морф: раздел «Моушн-дизайн»)
node tools/kinetic_check.mjs --fix         # диапазоны <Kinetic> → hide_subs (T6), до check.mjs
npx remotion studio                      # просмотр (композиции Short, Gallery; Short-A / Short-B при ab.enabled)
# 5. сборка
npx tsc --noEmit && node tools/check.mjs && /usr/bin/python3 tools/mix.py && CONC=3 node tools/render.mjs \
  && bash tools/final_pass.sh && /usr/bin/python3 tools/srt.py
node tools/stills.mjs --comp Short --every 1 --from 0 --to <DUR> --out out/sheets/all
# 6. QA → 08_QA_Reports/<slug>/ + вердикт <slug>_QA.md по чек-листу 9E (variety.txt / variety_sheet.jpg — пункты D1–D3)
#    <stem> = out_name из project.json без .mp4: new_project.sh пишет slug с «_» вместо «-» (my-story → my_story_yt.mp4)
bash tools/qa.sh out/FINAL/<stem>_yt.mp4
# 7. сдача (9F): ролик — в реестр разнообразия ленты; после загрузки владельцем — ещё раз с --status published --date <день>
/usr/bin/python3 tools/variety_check.py out/FINAL/<stem>_yt.mp4 --register
```
`python3` для инструментов — **без `-I`** (numpy и Pillow лежат в user site-packages).
`fetch_asset.py`: скачанное сначала ложится в `short/data/fetch/<источник>_<id>/` (этот файл записан в лог хелпера вместе с sha256),
потом копируется в `public/`. Если файл уже есть в `03_Assets`, берётся он (повторно скачивается только с `--download`).
Куда кладёт: SFX → `sfx/<name>.wav` (WAV 48 kHz / 16 bit, пик −3 dBFS, запись в `index.json`), музыка → `music/`, мемы → `memes/`,
PD-кинохроника → `video/`, остальные эффекты и оверлеи → `fx/`, графика → `img/`, Lottie → `lottie/`, шрифты → `fonts/`, LUT → `luts/`;
`--to SUBDIR` меняет папку (`--to atlas` всегда отказ).

## Что проверяет `tools/check.mjs`

Пороги — из стандарта (R1, R2, R3, R7, R10, раздел 8). «Ошибка» останавливает цепочку сборки, «предупреждение» печатается и
записывается в QA.

1. каждое событие привязано к существующему слову, текст слова совпадает;
2. разрыв между событиями ≤ лимита уровня; событий на 10 s в полосе уровня (вне полосы — предупреждение);
3. биты начинаются с 0, идут без дыр, кончаются на `DURATION`, переход допустим, сцена экспортирована из `scenes.tsx`;
   субтитры (R3): центр `subY` вне 1180–1300 — ошибка (при ≤ 1300 ни один пиксель строки не ниже y 1440); последний бит —
   только `fade` (R1, иначе ошибка, в том числе для `jagged`); whip / zoomthru / diag / punch / jagged при `level: L1` — предупреждение (R1);
   больше 2 `jagged` на ролик — предупреждение (стандарт 4.3);
4. SFX-cues есть в `public/sfx/index.json`, у каждой записи есть license (у CC BY — ещё и текст атрибуции); нет FREE-key
   ElevenLabs, Mixkit и оригинального звука мемов (запись с `source`, начинающимся на «meme», или файл в `memes/`);
5. каждая картинка, клип или шрифт из кода (комментарии не считаются) лежит в `public/` и есть в `CREDITS.md`; каждый
   `lottie/*.json` есть и записан в CREDITS (у Noto — «CC BY 4.0» в строке); если Short использует Noto-стикер, а файла `../YOUTUBE.md`
   нет или в нём нет строки «Animated emoji: Noto Emoji Animation by Google, CC BY 4.0 …» — предупреждение (`new_project.sh` этот
   файл не создаёт; `src/Gallery.tsx` не считается); строки «✓» блока картинок и блока Lottie печатаются только без ошибок в блоке;
   5b. 3D-вставки (`tools/blender/check3d.mjs`): все кадры на месте, строка CREDITS `3d/<name>` и строка на каждый внешний файл
   спеки, нет источников из карантина, Mixkit и папок Atlas, спека не менялась после рендера;
6. каждое число на экране есть в `../FACTS.md`, в том числе данные графиков (`data`, `values`, `display`, подписи-годы, `delta`, `n` / `k` —
   `tools/chart_facts.mjs`; данные не в JSX (`data={DATA}`) — предупреждение). Счётчики графиков (R6 / T10: `count`, `LineDraw tag="follow"`):
   бег ≤ 1.1 s держит `charts.tsx` (запрос дольше — предупреждение), слова, звучащие во время бега, должны быть в `hide_subs` — иначе
   ошибка с готовым диапазоном; старт не из `W(i)` / `We(i)` / чисел — предупреждение. Тест-композиции (`*Gallery.tsx`, `*Demo.tsx`,
   `*_demo.tsx`) не считаются ни здесь, ни в п. 12–13;
7. окна Atlas (`project.atlas` + A/B-окно из `project.ab`) через `tools/atlas/atlas_check.py`: слова есть, угол tl / tr / bl
   (br — ошибка), ручной `at` в зоне x 48–887 / y 288–1150, окна не пересекаются, у каждого окна есть файл и строка CREDITS,
   карточка не из `_quarantine`, Atlas в 0–3 s только с `"variant"` (R2 / H10), окно посреди ролика > 4 s — предупреждение (E5),
   Atlas Ape без окна в финале — предупреждение, если в EDIT_PLAN нет отступления F5;
8. лицензионные шлюзы: ничего из `03_Assets/_quarantine`, нет FREE-key ElevenLabs; **любой файл Mixkit** (`*_mixkit.*`, вообще
   «mixkit» в пути или в `project.music`) — ошибка: файлы Mixkit библиотеки заменены и перенесены в `_quarantine` (решение
   владельца 24.10, QA L5); то же **по содержимому** (sha256, `tools/quarantine_gate.mjs`): переименованная или побайтно одинаковая
   копия файла из карантина, из массивов «quarantined» в логах или FREE-key ElevenLabs — ошибка (перекодированную копию — тот же
   звук или картинка, другие байты — sha256 не ловит: нужен аудио- или видеоотпечаток, его нет); немецкий канал — без
   американских немых фильмов 1920-х; длина > 59 s только с `allow_over_60` и музыкой YouTube Audio Library, вне цели 30–45 s —
   предупреждение (R10); демо-голос `vo_demo.wav` в реальном проекте — ошибка;
9. мемы (R7, QA L8). Мем = элемент `public/memes/<имя>`: клип (mp4/webm/mov/gif), картинка или папка PNG-кадров для `ImgSeq`.
   Для каждого:
   - строка в `../EDIT_PLAN.md`: `Мем: memes/<имя> · источник: … · владелец: … · риск: … · длит.: 1.2 s · слово: <w>`
     (источник, владелец, риск и длительность ≤ 1.5 s обязательны);
   - строка в `CREDITS.md` с `memes/<имя>` и полями `источник:` / `владелец:` / `риск:` (или `source:` / `owner:` / `risk:`);
   - без звука: аудиофайлы в `memes/` и аудиодорожка в клипе (ffprobe) — ошибка (`ffmpeg -i in.mp4 -t 1.5 -an out.mp4`);
   - клип ≤ 1.5 s, папка кадров ≤ 90 кадров (1.5 s даже при 60 fps);
   - пометка `yt-dlp` в строке — ошибка (скачивание с YouTube запрещено);

   всего мемов ≤ 2 (по `public/memes/` и по строкам «Мем:»), ролик с мемами ≤ 59 s даже с `allow_over_60`. Мем в названии,
   на обложке и в кадре 0 проверяется вручную (QA V4, L8). Файлы мемов через GIPHY API не скачиваются (R7, «Источник файлов»);
10. A/B-тест (R2), только при `ab.enabled`: ≥ 2 варианта с простыми именами (буквы / цифры), Atlas в 0–1 s есть только в вариантах
    с `atlas_hook` и хотя бы в одном варианте его нет (R2: «Atlas в 0–1 s против без Atlas»); печатает окна каждой версии и имена
    файлов. Место окна над пустым фоном — ручная проверка (`tools/ab_corner.py`, стопкадры).
11. разнообразие ленты (стандарт 4.1 H14, `tools/variety_check.py --plan-only`): в `../EDIT_PLAN.md` есть строки «Визуальная идея: …»
    и «Кадр 0: …» (нет или шаблонная заглушка `<…>` — ошибка, кроме демо `template-demo`); их формулировки не слишком близки к тем же
    строкам 5 последних Shorts канала (похожесть ≥ 0.35 — предупреждение); печатает строки предыдущего Short для ручной проверки D2.

12. кинетическая типографика (`tools/kinetic_check.mjs`): диапазон слов каждой `<Kinetic>` в `hide_subs` (иначе ошибка; `--fix` дописывает),
    слова есть, пресет известен, числа (и `display`) в FACTS, ≤ 1 золотого слова (T5), две фразы одновременно (T7) и чаще 10 / 8 / 5 s
    на L1 / L2 / L3 (T11) — предупреждения, `x` / `y` вне safe box, `slam` с тряской на L1;
13. карты (`tools/map_check.py`): каждый импортированный `data/maps/*.json` есть (нет — ошибка: Root собирает все композиции) и сделан
    `make_map.py`; современные границы в историческом ролике (`map_period`, год до 1992 в FACTS / SCRIPT / voiceover, канал `de-…`) —
    предупреждение; год карты эпохи далёк от `map_period` — предупреждение; лицензии источников и строка CREDITS для GPL / CC BY;
    **R4:** бит со сценой-картой, начинающийся раньше 3 s, — ошибка, если у бита нет `live: true` (в `beats.ts`: на карте идёт живое
    действие); `live: true` без `MovingToken` / `AdvanceArrow` / видео в сцене — предупреждение; карта в кадре 0 — предупреждение (H1);
14. трекинг: каждый импортированный `data/tracks/*.json` есть и сделан `track.py`; у трека, который использует Short, клип (поле `clip`)
    лежит в `public/` и записан в CREDITS (иначе ошибка), > 0.3 s неуверенного трекинга — предупреждение.

Кэш sha256 карантина — `03_Assets/_quarantine/SHA256SUMS`: создаётся при первом запуске `check.mjs` / `qa.sh` (≈ 0.6 s), дальше
пересчитываются только изменённые файлы (≈ 0.02 s). `QUARANTINE_SUMS=<файл>` переносит кэш (только чтение библиотеки, тесты).

## Atlas

Atlas — только арт владельца: риг `~/shorts/orangutan` или Gemini-карточки владельца (`pose_pack`). Инструменты только вырезают,
анимируют и экспортируют то, что уже есть, и ничего не дорисовывают. Atlas — только реакция: окно на твисте и в финале. На Atlas Ape
финал обязателен (F5). В 0–3 s Atlas бывает только в A/B-версии (R2).
```json
"atlas": {
 "source": "cards",
 "poses": [{"id": "shock", "card": "gemini/atlas_shock.jpg"},
           {"id": "facepalm", "card": "~/shorts/atlas-ape/football-222/gemini/atlas_sheet_clap_shock.jpg", "pick": 4}],
 "windows": [{"from_word": 23, "to_word": 24, "pose": "facepalm", "corner": "tr", "style": "pip", "zoom": 1.05, "h": 380},
             {"from_word": 26, "to_word": "end", "pose": "laugh", "corner": "bl", "source": "rig"}],
 "rig": {"scene": "atlas_<slug>", "view": "front", "lipsync": false}
}
```
- Окно: от `W(from_word) − lead` (0.1 s) до `We(to_word) + tail` (0.3 s); `"end"` — до конца ролика; `"from_s"` / `"until"` (секунды)
  заменяют начало / конец. Угол `tl` / `tr` / `bl` в безопасной зоне: x 48–887, верх ≥ 300, низ ≤ 1140, то есть над субтитрами.
  `br` — ошибка: там кнопки Shorts (4.4). `"at": [x, y]` — низ-центр Atlas вручную. `h` — рост, по умолчанию 460.
  `"style": "pip"` — скруглённое окно с головой и грудью (`zoom`: 1.45 для фигуры в полный рост, ≈ 1.05 для поясной). `flip` —
  зеркало. `"variant": "B"` — окно только в версии B (R2). У окна может быть свой `"source"`.
- Пути в `poses`: абсолютный, `~/…`, `03_Assets/…` или от папки проекта (например `gemini/…`).
- Карточки: `python3 tools/atlas/cutout_cards.py [--only id] [--credits]` → `public/atlas/<id>.png` + `out/atlas/cards_qa.jpg`. По листу
  проверить, что шляпа, ступни, глаза и кисти целые (9D п. 2). На листе с несколькими позами сначала `--split <файл>` →
  `out/atlas/split_*.jpg` с номерами, номер нужной позы пишется в `"pick"`. `"talk": true` — ЭКСПЕРИМЕНТ: липсинк глазами и ртами
  рига (pose_card.py рига, Rhubarb) → `public/atlas/<id>_talk/`.
- Риг: `python3 tools/atlas/atlas_scene.py` → `data/atlas_scene.json` (позы: shock, laugh, thinking, thumbs_up, wink, wave, facepalm,
  shrug, nod, no, point, ok, peace, count, phone, magnifier, globe, smirk или id эмоции рига; можно задать `"emotion"` / `"play"` в окне).
  Затем `--install` (копия сцены в `~/shorts/orangutan/scenes/`, единственная запись в репозиторий рига) →
  `cd ~/shorts/orangutan && npm run export -- atlas_<slug> --w 1800 --h 1400` → `python3 tools/atlas/atlas_webp.py --credits` →
  `public/atlas/rig/f_NNNNN.webp`. Пишутся только кадры окон, обрезанные по общему боксу. `ATLAS_RIG=<папка>` — копия рига для проб.
- Проверка: `python3 tools/atlas/atlas_check.py` (её же вызывает `check.mjs`, п. 7).
- В коде: `<AtlasWindows variant={variant} />` в `Short.tsx` (уже стоит, и ещё раз в loop-слое с `at={0}`: последний кадр
  растворяется в тот же кадр 0 вместе с окном версии B). Ручные кадры — `AtlasLayer` / `CardLayer`.

## 3D-вставки (`tools/blender`, подробно — `tools/blender/README.md`)

```
cd short
NOLOCK=1 tools/blender/run.sh tools/blender/shot.py -- tools/blender/examples/coin.json --probe        # рамки в px, без рендера
tools/blender/run.sh tools/blender/shot.py -- <spec>.json --scale 50 --frames 1,12                    # пробные кадры → out/3d_preview/
tools/blender/run.sh tools/blender/shot.py -- <spec>.json                                             # → public/3d/<name>/ + meta.json
python3 tools/blender/sheet3d.py public/3d/<name>                                                     # лист кадров (альфа, шов петли)
```
В сцене: `<Clip3D name="<name>" t0={W(5)} t1={W(9)} y={820} w={760} />`; в `CREDITS.md` — строка `3d/<name>` и строка на каждый
внешний файл спеки с лицензией (готовую строку печатает `shot.py`). Защиты: карантин / Mixkit / Atlas (папки и имена) → выход 2;
`check.mjs` (5b) повторяет их по `meta.json`. `"format": "webp"` ≈ в 15 раз легче PNG (монета: 0.9 MB вместо 13 MB). Рендер Blender —
по одному на весь Mac (`run.sh` ждёт свободный GPU-слот). Первый запуск Cycles компилирует ядра Metal (~2 мин).

## Lottie и переход `jagged`

- `<LottieSticker src="lottie/<имя из библиотеки>.json" t0={W(12)} t1={W(14)} x={760} y={520} size={240} />` — кадр Lottie считается
  от `t0` (speed, offset, loop / hold), поэтому рендер детерминирован в любом порядке. Файл — `fetch_asset.py lib …` (имя не менять).
  Noto Emoji Animation — CC BY 4.0: строка в CREDITS и ОДНА строка в описании ролика, сколько бы стикеров ни было:
  `Animated emoji: Noto Emoji Animation by Google, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)` (+ «(modified)», если
  перекрашен, обрезан, отзеркален или ускорен). Стикер — реакция: не повторяет голос и субтитр (T6), в безопасной зоне, не на полосе
  субтитров.
- `tr: 'jagged'` в `beats.ts` — рваное раскрытие на ударном слове, 0.4 s: `at` внутри кадра → рваная звезда из точки,
  `at` на краю (`[540, 1920]` — снизу, `[0, 700]` — слева) → рваный фронт от края; без `at` — из центра. Только L2+, не больше
  2 на ролик, никогда в финале и loop (там только `fade`). Свой звук: свиш + бумага / удар (например
  `sfx_swish_quick_accent_freesound_72190` + `sfx_paper_crumple_quick_freesound_398897` около −14 dB из `03_Assets/Sound_Effects`).

## A/B-тест (R2: Atlas в 0–1 s против без Atlas)

1. В `project.json`: `"ab": {"enabled": true, "variants": {"A": {"atlas_hook": false}, "B": {"atlas_hook": true, "atlas_hook_pose":
   "shock", "atlas_hook_corner": "tr", "atlas_hook_h": 300, "atlas_hook_until": 1.0}}}`. Поза — `id` из `atlas.poses` (карточка
   владельца, `cutout_cards.py`) или поза рига при `"source": "rig"`. Вместо краткой формы можно своё окно в `atlas.windows` с
   `"variant": "B"`. Окно B стоит с кадра 0 (кадр 0 = обложка и шов петли) и уходит к 1.0 s; маленькое (h ≤ 360, больше — предупреждение).
2. Угол — над пустым фоном, не над объектом кадра 0:
   ```
   node tools/stills.mjs --comp Short-A --t 0,0.25,0.5,0.75,0.95 --out out/stills/ab_A --sheet 0
   python3 tools/ab_corner.py out/stills/ab_A --sheet out/stills/ab_corners.jpg      # ранжирует tl / tr / bl (фактура + «редкие» цвета объекта)
   node tools/stills.mjs --comp Short-B --t 0,0.5,0.95,1.1 --out out/stills/ab_B    # глазами: Atlas не закрывает объект
   ```
3. `node tools/check.mjs` (п. 7 и 10) → `python3 tools/mix.py` (звук один на обе версии) →
   `VARIANT=A CONC=3 node tools/render.mjs` и `VARIANT=B CONC=3 node tools/render.mjs` → `out/FINAL/<stem>_A.mp4` / `<stem>_B.mp4`
   (свои папки чанков) → `VARIANT=A bash tools/final_pass.sh`, `VARIANT=B bash tools/final_pass.sh` → `<stem>_A_yt.mp4` /
   `<stem>_B_yt.mp4` → `VARIANT=A bash tools/qa.sh`, `VARIANT=B bash tools/qa.sh` (→ `08_QA_Reports/<slug>/ab_A/`, `ab_B/`).
   Композиция `Short` без варианта = картинка версии A. Версии отличаются только первыми ~1 s и loop-растворением — проверено
   структурно: `python3 tools/vdiff.py out/chunks_Short-A/video_noaudio.mp4 out/chunks_Short-B/video_noaudio.mp4`. Рендер не
   побайтно повторяем (два рендера одной композиции расходятся шумом: в среднем ~1–2 уровня, < 0.03 % пикселей больше 24), поэтому md5 и
   точное равенство для сравнения не годятся — только доля пикселей с разницей > 24 уровней (`vdiff.py`).
4. Публикация — решение владельца: как и когда выкладывать две версии (по очереди, в разные дни, одну как контроль), шаблон только
   готовит оба файла с одинаковыми настройками. Две почти одинаковые загрузки на одном канале YouTube может счесть повтором — это
   тоже учитывает владелец.
5. Сравнение — удержание в YouTube Analytics: в Studio у каждого ролика — «Удержание аудитории» и доля «Остались смотреть /
   Пролистали»; через API — `~/shorts/tools/yt_oauth.py` (только чтение; `login` один раз, `test` — отчёт по роликам за 28 дней: просмотры,
   averageViewDuration, averageViewPercentage). Кривая удержания одного ролика — отчёт Analytics API с измерением
   `elapsedVideoTimeRatio` и метрикой `audienceWatchRatio` (фильтр `video==<id>`). Сравнивать одинаковые окна времени после
   публикации; итог записать в QA / STATUS проекта.

## Разнообразие ленты (`tools/variety_check.py`, стандарт 4.1 H14, 4.2 R-13, 9E D1–D3, 9F)

Все Shorts собираются из этого шаблона, поэтому лента канала не должна выглядеть шаблонной. Правило: два Shorts подряд на одном
канале не начинаются с кадра 0 одного типа и не держатся на одном главном визуальном приёме; строки шапки EDIT_PLAN
«Визуальная идея: …» (одна фраза: приём, а не тема) и «Кадр 0: …» (тип кадра и что в нём) отличаются от 5 последних Shorts канала.
**Тип кадра 0 выбирается внутри H1** (кадр 0 всегда живое существо в действии): кто — человек / животное / толпа / лицо крупно /
руки с предметом; материал — архив / 3D / рисунок / свой UI (AI-кадр — только по H15 / R11). Тип совпадает, если у двух Shorts
подряд совпадают оба признака; достаточно сменить один. Карта, документ, пейзаж, титр, карточка с датой и мем кадром 0 не бывают
(H1, H15, R4, R7, R11 и V4 главнее H14; стандарт, раздел 7 «Проверено, не конфликт»).
**Идентичность канала повтором не считается и остаётся одинаковой:** стиль субтитров (полоса y 1080–1450 вырезается из сравнения),
цвета белый + оранжевый, палитра «A · Экспедиция» (`src/theme.ts`) и крупный шрифт Alfa Slab One (`HEAD`), Atlas как реакция / финал, loop-концовка, громкость.

Реестр — `SHORTS_PRODUCTION/06_Exports/_variety_registry/`: `registry.json` (запись на ролик: slug, канал, дата, статус, путь к видео,
хэши и гистограммы кадров 0 / 1 / 2 s и «полоски» после каждого из них — кадр каждые 0.1 s до +0.5 s, обе строки, заметка) и
`thumbs/` (кадры 0 / 1 / 2 s, 270×480). Правится только инструментом (`--register` / `--unregister`). Другой реестр (тесты) —
`--registry <папка>` или `VARIETY_REGISTRY=<папка>` (переменную видят и `qa.sh`, и `check.mjs`). Засеян 24.10 финалами ATLAS APE
(файлы только читались); в тот же день записи перерегистрированы с полосками (признаки v2, поиск по времени), даты и строки те же:

| slug | дата | статус | файл |
|---|---|---|---|
| `volcano` | 19.10 | published | `volcano/short/out/FINAL/humans_vs_volcano.mp4` |
| `rabbits` | 20.10 | published | `rabbits/short/out/FINAL/australia_vs_rabbits.mp4` |
| `yellow-fleet` | 22.10 | published | `yellow-fleet/short_bf/out/FINAL/the_yellow_fleet_B_friend.mp4` — залитая версия B + голос друга (UPLOAD.md, аудит Studio 23.10); день загрузки точно не записан |
| `pig-war` | 23.10 | published | `pig-war/short3/out/FINAL/the_pig_war_v3.mp4` — какой файл залит (рисованный или `_v3_flow`), не записано; кадры 0 / 1 / 2 s у них одинаковые (D ≤ 0.001) |
| `football-222` | 23.10 | delivered | `football-222/short/out/FINAL/the_222_game.mp4` (загрузка не подтверждена) |
| `ai-farm-girl` | 24.10 | delivered | `ai-farm-girl/short/out/FINAL/sold_everything_ai.mp4` — рендер раунда 6, 32.75 s (STATUS.md); загрузка не подтверждена |

Пути — от `~/shorts/atlas-ape/`. Демо шаблона (`template-demo`) не сравнивается и не регистрируется.

```
python3 tools/variety_check.py --list                                    # реестр, новые сверху (смотреть перед EDIT_PLAN)
node tools/check.mjs                                                      # п. 11: строки EDIT_PLAN до рендера
bash tools/qa.sh out/FINAL/<stem>_yt.mp4                                  # кадры → 08_QA_Reports/<slug>/variety.txt + variety_sheet.jpg
python3 tools/variety_check.py out/FINAL/<stem>_yt.mp4 --sheet out/qa/variety.jpg            # то же отдельно
python3 tools/variety_check.py out/FINAL/<stem>_yt.mp4 --register                           # 9F: после финального экспорта (delivered)
python3 tools/variety_check.py out/FINAL/<stem>_yt.mp4 --register --status published --date 2026-10-26   # после загрузки (заменяет запись)
VARIANT=B python3 tools/variety_check.py out/FINAL/<stem>_B_yt.mp4 --register                # A/B-версия: запись <slug>_B
python3 tools/variety_check.py --unregister <slug>                                           # ролик не выйдет — убрать запись
python3 tools/variety_check.py --matrix [a.mp4 b.mp4 …]                  # таблица расстояний: перекалибровка (без файлов — по реестру)
VARIETY_REGISTRY=/tmp/reg bash tools/qa.sh out/FINAL/<stem>_yt.mp4       # тест на временном реестре (настоящий не трогается)
```
`<stem>` — `out_name` из `project.json` без `.mp4` (у `new_project.sh` это slug с `_` вместо `-`: `variety-test` → `variety_test_yt.mp4`).
`python3` — без `-I`. Выход: 0 — прошло (предупреждения допустимы), 1 — ERROR, 2 — нет видео / реестр не читается (в `qa.sh` тоже FAIL).

**Что сравнивается.** Моменты 0.0, 1.0 и 2.0 s (ffmpeg, 270×480) без полосы субтитров, у каждого — **поиск по времени ±0.5 s**:
у проверяемого ролика берутся все кадры от t до t + 0.5 s (30 к/с, один вызов ffmpeg на момент), у записи реестра — кадры через
0.1 s на том же отрезке; считается ближайшая пара. Поэтому копия, обрезанная в начале на ≤ 0.5 s (в отчёте сдвиг «@+0.25»: ролик
начинается на 0.25 s позже в том же плане) или с вставкой ≤ 0.5 s перед началом («@-0.25»), всё равно встречает оригинал. Пара
«точный момент — точный момент» считается всегда; однотонные кадры (чёрный, белый, заливка: σ яркости < 8, у настоящих кадров 0
засева 28–67) — только в ней, чтобы два затемнения не совпадали друг с другом. Признаки кадра: dHash 16×16 и pHash 16×16 (по 256 бит) и
RGB-гистограмма 4×4×4 (расстояние Хеллингера). Расстояние кадров `D = 0.35·dHash + 0.35·pHash + 0.30·цвет` (0 — тот же кадр,
≈ 0.5 — не связаны), «структура» = среднее двух хэшей (цвет не учитывается, у перекраски ≈ 0). Кадр проверяемого ролика сравнивается
ещё и зеркально (зеркальная копия — тоже копия, в отчёте «m»). Окно — последние `variety.window` (5) Shorts того же `channel` по дате;
записи с тем же slug (сам проект, его A/B-версии) пропускаются. Строки EDIT_PLAN — похожесть Дайса по основам слов (нижний регистр,
ё → е, слова от 3 букв без служебных, первые 5 букв); из «Визуальной идеи» выкидываются слова идентичности канала (Atlas, финал,
субтитры, золото, loop).

| Вердикт | Условие |
|---|---|
| ERROR (FAIL в qa.sh) | кадр 0 почти тот же, что у ролика из окна (с поиском по времени ±0.5 s): D ≤ 0.10 или структура ≤ 0.06 (перекраска того же кадра); ближайший кадр 0 тогда печатается строкой INFO, а не OK |
| WARNING | кадр 0 очень похож: D ≤ 0.35 |
| WARNING | кадр 1.0 s или 2.0 s почти тот же (D ≤ 0.10 / структура ≤ 0.06), что в тот же момент у ролика из окна: тот же приём открытия |
| WARNING | «Визуальная идея» или «Кадр 0» похожи на строку ролика из окна: ≥ 0.35 |
| WARNING / ошибка | строки нет или в ней заглушка `<…>`: WARNING в `qa.sh`, ошибка в `check.mjs` п. 11; `--register` без обеих строк отказывает |
| вручную (D2) | тип кадра 0 и главный приём не как у предыдущего Short — инструмент печатает его строки рядом с новыми и лист `variety_sheet.jpg` |

**Калибровка 24.10.2026** (режим проверки, с зеркалом и поиском по времени ±0.5 s; копии — первые 3.5 s через libx264 crf 28,
720×1280; в квадратных скобках — значение без поиска по времени, как в первой версии; полная таблица — в docstring инструмента):

| Пары | D кадра 0 | Итог |
|---|---|---|
| 15 пар разных эпизодов (6 засеянных) | 0.444–0.596, медиана 0.556 (ближе всех volcano – ai-farm-girl 0.444, football-222 – ai-farm-girl 0.463) [0.467–0.623] | не срабатывает |
| все 828 сравнений разных эпизодов на каждый момент (обе стороны, другие версии эпизодов, демо и все сдвинутые копии ниже как проверяемый ролик) | кадр 0 ≥ 0.423 (структура ≥ 0.383); 1 s / 2 s ≥ 0.401 / 0.380 | 0 срабатываний |
| тот же эпизод, тот же кадр: yellow-fleet v8 – голос друга, B – B+друг, pig-war v3 – v3 flow | 0.000 / 0.000 / 0.000 | ERROR |
| yellow-fleet v8 – B: тот же канал + титр «1-DAY TRIP» | 0.092 (1 s / 2 s: 0.163 / 0.184 — там у v8 карточка-карта) | ERROR (WARNING на 1–2 s) |
| pig-war v1 – v2 – v3: та же постановка в другом стиле | 0.509 / 0.559 / 0.600 | не ловится (см. ограничения) |
| перекодирование, без сдвига (6 эпизодов + демо) | 0.008–0.021 [0.008–0.029] | ERROR 7 из 7 |
| **копия, обрезанная в начале на 0.04 s (2 кадра при 60 к/с)** | 0.015–0.030 [0.025–0.385] | ERROR 7 из 7 |
| **обрезанная на 0.1 s** | 0.008–0.017 [0.032–0.312: демо и быстрые хуки — только WARNING] | ERROR 7 из 7 |
| **обрезанная на 0.25 s** | 0.014–0.032 [0.036–0.362: ai-farm-girl — PASS без предупреждений] | ERROR 7 из 7 |
| **обрезанная на 0.5 s** | 0.010–0.021 [0.055–0.377] | ERROR 7 из 7 |
| **0.25 s / 0.5 s чёрного перед началом** | 0.013–0.047 / 0.006–0.024 [0.478–0.647] | ERROR 7 из 7 |
| обрезанная на 0.75 s (за пределом поиска) | 0.032–0.213 | 3 ERROR (медленное начало), 4 WARNING (быстрый хук) |
| жёсткое перекодирование crf 38, 540×960, +3 % яркость, +5 % контраст (первая калибровка) | 0.023–0.072 | ERROR |
| демо, заново отрендеренное со свежей копии (`new_project.sh` → `render.mjs` → `final_pass.sh`), против превью 24.10 | 0.000 (1 s, 2 s: 0.000) | ERROR |
| правки кадра 0 каждого эпизода: яркость +15 % / тёплая перекраска / зеркало | 0.039–0.134 / 0.059–0.165 (структура ≤ 0.041) / 0.000–0.001 | ERROR |
| маленькое окно Atlas 75×90 (из 270×480) поверх кадра 0 | 0.081–0.148 | 1 ERROR, 5 WARNING |
| титр-плашка сверху · сдвиг 5 % · большая карточка 150×180 | 0.119–0.204 · 0.207–0.278 · 0.199–0.302 | WARNING |
| zoom 1.10 | 0.081–0.253 | 1 ERROR (football-222: его наезд камеры доходит до такого кадра на +0.4 s), 5 WARNING |
| zoom 1.25 | 0.232–0.371 | 3 из 6 WARNING |
| строки EDIT_PLAN разных эпизодов | ≤ 0.29 («Кадр 0» volcano – rabbits: у обоих «Atlas внизу слева»), «Визуальная идея» ≤ 0.14 | не срабатывает |
| пересказ строки из реестра другими словами | 0.50–0.67 | WARNING |
| «бумажный Vox-коллаж + архивные фото» против идеи football-222 | 0.36 | WARNING |

Запас: ERR_D 0.10 выше всех копий, в том числе сдвинутых (≤ 0.047), и кадра «тот же + титр» (0.092), ниже «та же сцена, другая
плашка» (0.163); структура 0.06 выше перекрасок (≤ 0.041) и копий (≤ 0.055), ниже ближайшей не-копии (0.076); WARN_D 0.35 на 0.073
ниже ближайших разных эпизодов в кадре 0 (0.423; без поиска по времени запас был 0.109).
Пороги — константы `ERR_D`, `WARN_D`, `STRUCT_ERR`, `TEXT_WARN` в начале `variety_check.py`; когда в реестре станет 10–15 роликов,
пересчитать `--matrix` и записать новую таблицу.

**Ограничения.** Хэши ловят почти-копии и очень похожие кадры, а не «тип»: та же постановка в другом стиле (pig-war v1 – v2, 0.517)
или два разных животных крупным планом проходят — для этого строки EDIT_PLAN и ручной пункт D2 по листу `variety_sheet.jpg`.
Похожесть строк — по словам: синонимы («судно» / «корабль») не сходятся, поэтому строки пишутся конкретно (материал, стиль, что в
кадре). Сдвиг больше 0.5 s ловится, только если кадр почти не меняется (обрезка 0.75 s: у медленных открытий ERROR, у быстрых хуков —
WARNING). Субтитры засеянных эпизодов (старые kits, `subY` 1330–1570) стоят примерно на y 1500–1560, ниже вырезаемой полосы
y 1080–1450, и попадают в хэши вместе с картинкой; на вердикты это почти не влияет (мелкий текст, таблица выше), а у роликов из
шаблона субтитры стоят внутри полосы (R3). Реестр полон, только если каждый сданный ролик зарегистрирован (9F); ролик, который не выйдет, убирают `--unregister`.

## Моушн-дизайн (кинетика, трекинг, карты, графики, морфинг)

Набор поднимает motion в секундах 1–6 — самую слабую метрику канала (стандарт, раздел 8: L2 ≥ 10 по `measure.py`). Общее для всех
компонентов: время — секунды на часах монтажа (`W(i)` / `We(i)`); текст белый + оранжевый акцент (T5; «gold» в именах пропсов = этот акцент), прямой, обводка INK + тёмный scrim; всё
текстовое само держится в safe zone (x 48–887, y 288–1140 / 1150 — над полосой субтитров R3, не в правом нижнем углу); фигуры, иконки,
токены и рисунки — свои (код), без клипарта и логотипов. Правила, которые компоненты не могут удержать сами, проверяет `check.mjs`
(п. 6, 12–14). Когда что брать — стандарт 4.6.

### Кинетическая типографика — `src/ui/kinetic.tsx`
```tsx
<Kinetic fromWord={21} toWord={22} preset="slam" display={{21: '3'}} />          // «3» падает на слове «Three», затем TRANSITIONS
<Kinetic fromWord={15} toWord={20} preset="stack" t1={t1} />                     // строки на всю ширину, держится до конца бита
<Kinetic fromWord={23} toWord={24} preset="punchKey" keyWords={[24]} zone="center" />
```
- Фраза = диапазон слов VO; каждое слово стартует на своём `W(i) − lead` (0.03 s, как субтитры); уход через `hold` (0.35 s) после
  последнего слова или в `t1`, за 0.2 s.
- Пресеты: `pop` (пружина), `slam` (падение 2.3× → 1, удар на старте слова, 2 кадра impact, тряска блока 6 px — на L1 `shake={0}`),
  `stack` (строки на всю ширину, `lines` — вручную), `maskRise` (из маски, золотая плашка ключевого слова), `typewriter` (символы за
  время слова), `punchKey` (бьёт и золотеет только ключевое слово).
- Пропсы: `keyWords` (по умолчанию `gold_words` внутри диапазона), `display` (свой текст слова, `''` — убрать слово), `oneWord`,
  `zone` upper / center / lower (y 480 / 700 / 930) или `x` / `y`, `size`, `maxWidth`, `font` head / mont / anton, `scrim`, `outline`.
  Блок подгоняется `@remotion/layout-utils` в x 48–887, y 288–1140 и только уменьшается или сдвигается. Кириллица — `font="mont"`.
- Правила: после сцен `node tools/kinetic_check.mjs --fix` (диапазоны → `hide_subs`, T6); одна крупная фраза за раз (T7); не чаще
  1 на 10 / 8 / 5 s на L1 / L2 / L3 (T11); числа — из FACTS; фраза = одно событие в `events.ts` (slam — удар на каждое слово, `dt −0.03`).
- Тест `KineticGallery` (6 пресетов + автоподгонка, 3 момента на пресет):
  `node tools/stills.mjs --comp KineticGallery --t 0.7167,1.35,2.4833,3.6,3.8667,4.7,5.9333,6.9667,7.6,8.7667,9.4333,10.4333,11.5,12.1667,13.3333,14.7,15.3333,16.4667,17.7667,18.75,19.35,20.7333,22.6833,24.5 --out out/stills/kinetic --cols 6`

### Трекинг: текст на движущемся объекте — `tools/track.py` + `src/ui/Tracked.tsx`
```
PYTORCH_ENABLE_MPS_FALLBACK=1 ~/shorts/tools/py312/bin/python tools/track.py public/video/<clip>.mp4 --name <n> \
  --point 0.74,0.52 --point 0.665,0.475 --t 0 [--box X0,Y0,X1,Y1] [--from S --to S] [--step 2] [--poly 32] [--preview]
```
→ `data/tracks/<n>.json` (координаты 0–1 клипа, `t` — секунды клипа, `tx` / `ty` — верхняя точка: голова стоящего человека, у
ползущего — спина) и лист `out/tracks/<n>_sheet.jpg` — смотреть до сцены. SAM 2.1 tiny на MPS, неуверенные кадры заполняет CSRT (при
сбое SAM 2 — только CSRT), сглаживание — медиана + гаусс по уверенности; ≈ 0.7 s на кадр (8 s клипа ≈ 2.5 мин), > 300 кадров —
`--from` / `--to` или `--step`. Выход: 0 — готово, 1 — трекинг не удался, 2 — плохой ввод.
```tsx
import keaton from '../data/tracks/keaton_wind.json';
<TrackedVideo src="video/<clip>.mp4" track={keaton as TrackData} t0={W(3)} t1={W(9)} box={{x: 0, y: 260, w: 1080, h: 1180}} zoom={[1.1, 1.2]} follow>
  <TrackedRing t0={W(3)} t1={W(4)} kind="brackets" />
  <TrackedLabel text="Buster Keaton" sub="Steamboat Bill, Jr." t0={W(4)} t1={W(9)} />
</TrackedVideo>
```
- `TrackedVideo`: клип в `box` (по умолчанию весь кадр, вокруг бокса — размытая копия), `fit`, `zoom [a, b]`, `focus`, `follow` (камера
  держит объект у x ≈ 468; `{lag, dead, x, axis}`), `from` (секунда клипа), `rate`. Дети — оверлеи в px кадра: `TrackedLabel`
  (рядом с объектом, никогда на нём; сторона выбирается на весь отрезок, смена — растворение 0.25 s; x 48–887, y 300–1140),
  `TrackedRing` (кольцо или `brackets`), `TrackedArrow`, `TrackedSpotlight`, `TrackedOutline` (силуэт SAM 2, нужен `--poly`),
  `TrackedDebug` (только QA). У каждого — `lead` / `lag` / `minConf`: при низкой уверенности оверлей гаснет, а не прыгает.
  `trackClip(track)` — путь клипа трека в `public/` или `null`.
- Правила (4.6): трекать архив, только где подпись обязана «прилипнуть»; одна аннотация за раз (рамка → стрелка → подпись); подпись
  добавляет то, чего нет в голосе (имя, место, дата); апскейл ≤ 2× (бокс высотой ≈ 1180 для 4:3); клип — через `fetch_asset.py`
  (п. 14). Тестовый клип Keaton в шаблон не входит (лицензия — строкой проекта, на немецком канале L6).

### Карты — `tools/make_map.py` + `src/ui/maps.tsx`
```
python3 tools/make_map.py <name> --bbox W,S,E,N [--proj merc|eqc|laea] --point "Lisboa=-9.139,38.722" [--preview]
python3 tools/make_map.py <name> --bbox W,S,E,N --geojson <границы эпохи>.geojson [--year 1941 --license "…" --source "…"]
python3 tools/make_map.py --spec data/maps/<name>.spec.json            # пересборка (байт в байт, кроме даты)
```
→ `data/maps/<name>.json` + `.spec.json`, только из локального Natural Earth 10m. По умолчанию современные границы
(`period.borders = "modern"`, в файле предупреждение); `--borders none` — суша и берег; `--geojson` — границы эпохи, регионы
обрезаются по суше (world_YYYY из historical-basemaps = GPL-3.0, OpenHistoricalMap = CC0 — распознаётся само). Ещё: `--select`,
`--lang de`, `--layers +rivers`, `--fit`, `--fitbox`, антимеридиан, `--list-sources`. Единица карты = px кадра при zoom 1.
```tsx
import lr from '../data/maps/demo_lisbon_rio.json'; const MAP = asMap(lr);
const R = routePath(MAP, ['Lisboa', {lon: -26.5, lat: 13}, 'Rio de Janeiro'], {mode: 'smooth'});
<MapCamera map={MAP} t0={t0} keys={[{t: t0, at: 'Lisboa', zoom: 4.2}, ...trackKeys(R, W(5), 3.6, (u) => 2.6 - 1.7 * Math.sin(Math.PI * u)), {t: W(9), at: 'Rio de Janeiro', zoom: 2.6, kick: 0.1}]}>
  <MapBase look="chart" />
  <RegionFill id="BRA" t0={W(9)} reveal="grow" from="Rio de Janeiro" color={PAL.teal} />
  <MapRoute d={R} t0={W(5)} dur={3.6} dashed ghost={0.5} />
  <MovingToken d={R} t0={W(5)} dur={3.6} kind="ship" size={120} />
  <PinPop at="Rio de Janeiro" t0={W(9)} text="Rio de Janeiro" gold />
</MapCamera>
```
- `MapCamera` (ключи `{t, at, zoom, kick, flight}`, длинный перелёт = отъезд и наезд, `t0` сцены обязателен), `MapBase` (chart / night /
  parchment), `RegionFill` (grow / wipe / fade, `hatch`), `MapRoute`, `MovingToken` (ship / plane / arrow / dot), `AdvanceArrow`,
  `PinPop`, `MapLabel`. Подписи держатся в x 48–887, y 300–1130; линии и подписи не растут с зумом.
- Правила: R4 — карта не главный план 0–3 s, в хуке только с живым действием и `live: true` у бита (без него `check.mjs` п. 13 —
  ошибка); исторический ролик — границы эпохи (WW2 — 1937/39) и `map_period` в `project.json`; GPL / CC BY — строка CREDITS + описание.
- Тест `MapsDemo`: `node tools/stills.mjs --comp MapsDemo --t 0.6,2.8,5.4,8.6,9.9,11.4,12.6 --out out/stills/maps --cols 4`

### Графики — `src/ui/charts.tsx`
```tsx
<BarGrow t0={W(4)} t1={We(9)} tFocus={W(8)} unit=" t" title="Cargo by port" data={[{label: 'North', value: 420}, {label: 'West', value: 1250, gold: true}]} />
<LineDraw t0={W(10)} t1={We(14)} values={[12, 19, 31, 46]} labels={['1990', '2000', '2010', '2020']} display="46 k" mark={2} />
<CompareBeforeAfter t0={W(15)} tSwitch={W(17)} t1={We(19)} before={{value: 50, label: 'Before', icon: 'tree'}} after={{value: 1000, label: 'After', icon: 'factory'}} count delta="×20" />
<DonutFill t0={W(20)} tFill={W(21)} t1={We(23)} value={71} label="covered" count />
<IconRow t0={W(24)} tFill={W(25)} t1={We(27)} n={10} k={3} icon="person" order="spread" />
```
- Общие пропсы: `box` (по умолчанию x 96, y 340, 788 × 760, всегда внутри x 48–887 / y 288–1150; `allowLow` — до y 1420, только при
  скрытом субтитре), `panel` / `scrim` (0.7 — видео просвечивает), `title`, `source`, `cam` (auto: камера едет за данными и к итогу
  возвращается к полному виду), `enter` rise / slam / wipe, `locale` en / de / ru. Иконки (свои): person, house, coin, tree, drop, car,
  ship, factory, bolt, heart, crate.
- R6 в коде: бегущее число ≤ 1.1 s при любом `dur`; пока бежит — белое, приглушённое, без финальных цифр; точный `display` — только
  в кадре приземления, золотом.
- Правила: числа — прямо в JSX (`check.mjs` п. 6 сверяет их с FACTS); под бегущим счётчиком субтитр скрыт (п. 6 печатает диапазон для
  `hide_subs`); график — поверх меняющейся картинки (видео, летящая карта, рисованная сцена), не плоский слайд; не главный план 0–3 s.
- Тест `ChartsGallery` (`guides` — safe zone и полоса субтитров, `footage` — клип под графиками):
  `node tools/stills.mjs --comp ChartsGallery --t 0.65,1.05,2.8,3.85,4.4,6 --props '{"guides":true}' --out out/stills/charts`

### Морфинг фигур — `src/ui/morph.tsx` + `src/ui/shapes.ts`
```tsx
<Morph shapes={['coin', 'pin', 'island']} keys={[W(3), W(7), W(12)]} morph={0.45} x={540} y={[860, 760, 860]} size={[600, 660, 720]} trail={2} burst idle={1} show={[W(3) - 0.3, W(14)]} />
<Morph from={countryD} to="pin" span={[W(5), W(6)]} fill="none" stroke="#fff" strokeWidth={12} />      // сырой path вписывается в коробку
<MorphMask shapes={['pin', 'circle']} keys={[W(9), W(9) + 0.5]} size={[60, 2600]} show={[W(9) - 0.2, W(12)]}>{/* видео / фото */}</MorphMask>
```
- Фигура: имя из библиотеки (coin, pin, house, ship, heart, star, arrow, island, flag, circle, square), `ShapeDef` или сырой SVG path
  (контур страны из карты). Коробка 200 × 200, `size` — сколько px она занимает; `x` / `y` / `size` / `fill` — числом или по фигурам.
- Тайминг: `keys` (секунда, когда фигура i готова; `morph` — длина морфа перед ключом) / `span` / `progress`. Вид: `fill` (смешивание
  в OKLCH), `stroke` INK 10 px, `shadow`, `spin`, `squash`, `trail` 0–4, `burst`, `idle` (держащаяся фигура не стоит), `show`.
- `MorphMask` — дети обрезаны по морфящейся фигуре; `size [60, 2600]` — раскрытие на весь кадр (сильнейший по motion приём набора);
  `show` задавать всегда, иначе ждущая фигура уже видна.
- Сырой путь — до рендера: `node tools/morph_check.mjs --pairs @file.d:pin` (выход 1 — самопересечение или «вытекшая» дырка; без
  аргументов — все 110 пар библиотеки).
- Тесты `MorphShowcase` (8 s; `plain` — без опций, `clip` — видео в маске) и `MorphReveal` (4 s, раскрытия).

### MotionDemo — весь набор в одной L2-последовательности
`src/MotionDemo.tsx`, 21.8 s, тест: демо-VO шаблона дважды (проход A с 0 s, проход B с 10.7 s; у каждого свой `Timeline` и свои
субтитры со скрытыми крупными фразами). A: архив с камерой follow, crash zoom и slam «THIS IS THE DEMO» → окно архива на бумаге
(силуэт SAM 2, подпись) → маршрут Лиссабон — Рио → IconRow → морф → maskRise. B: карта 1937 с самолётом → Compare со счётчиком поверх
летящей карты → LineDraw поверх видео → slam «3» → раскрытие MorphMask → физическая карта со стрелкой. Без клипа Keaton в `public/`
на месте видео — подписанная пустая рамка.
```
python3 tools/fetch_asset.py lib 03_Assets/Cinematic_Effects/pd_film_inserts/pdfilm_keaton_wind_struggle_steamboat_bill_jr_1928_commons.mp4   # тест-копия
node tools/stills.mjs --comp MotionDemo --every 0.5 --from 0 --to 21.5 --out out/stills/motion_demo --cols 8 --scale 0.35
COMP=MotionDemo OUT=motion_demo.mp4 CONC=3 node tools/render.mjs        # нужен любой out/sound/final_mix.wav (тест)
```
**Замер 24.10** (`measure.py`, рендер свежей копии; файлы — `08_QA_Reports/motion_kit/`): motion 0–1 = 9.2, среднее 1–6 = 8.0,
mean = 7.1 (демо-Short шаблона: 7.1 / 4.8 / 4.8). Цель L2 (≥ 20 / ≥ 10) не достигнута: архив 1928 года снят статичной камерой в 4:3.
Больше всего motion дают перелёт камеры карты с kick (11–17 в секунду), slam со speed lines (11), раскрытие MorphMask (9); графики
на тёмной панели и спокойные планы — 2–6. Набор поднимает секунды 1–6, но хук ≥ 20 делает монтаж (частые склейки, быстрое видео).

## Gallery — тест компонентов

`Gallery` (`src/Gallery.tsx`, 23.4 s) показывает каждый новый компонент по разу на своих часах, не меняя демо-ролик:
0–2.6 s окно Atlas (вырезка tl, потом pip tr) — первая карточка из `public/atlas/` проекта, а без неё — подписанная пустая рамка
(ничего не рисуется); 2.6 s `jagged`-звезда → `Clip3D` (`public/3d/coin`); 5.2 s `jagged` от нижнего края → `LottieSticker`
(Noto «eyes»); моушн-дизайн по сцене на группу: 7.8 s `up` → `Kinetic` stack; 10.6 s `whipL` → трекинг (рамка → стрелка → подпись на
клипе Keaton; без клипа в `public/` — подписанная пустая рамка); 13.4 s `zoomthru` → маршрут на карте; 16.2 s `up` → `BarGrow` со
счётчиком; 19.0 s `circle` → `Morph`; 21.6 s `fade` → список. Сцены идут через настоящий `Timeline`, так что проверяется и движок
переходов. Полные прогоны групп — `KineticGallery`, `ChartsGallery`, `MapsDemo`, `MorphShowcase` / `MorphReveal`, `MotionDemo`.
```
node tools/stills.mjs --comp Gallery --t 0.6,1.9,2.75,3.6,5.35,6.5,8.45,9.6,11.2,12.6,13.9,14.9,16.9,17.9,19.4,20.6,22.4 --out out/stills/gallery --cols 6
```
Ассеты Gallery (`3d/coin`, Noto «eyes») записаны в CREDITS; в ролик они не попадают, пока сцены их не используют.

## Проверка шаблона

- 24.10 (базовый шаблон): прогон на копии шаблона, демо-VO 10.2 s (macOS `say`, 32 слова, align 32/32 после правки омофона
  «comm → calm») — `08_QA_Reports/SETUP_VERIFICATION.md`, раздел «Шаблон».
- 24.10 (доработка): копия через `new_project.sh` — `tsc`, `check.mjs`, `mix.py`, рендер демо, стопкадры Gallery (без карточки и с
  карточкой владельца), A/B (`VARIANT=A`/`B`, попиксельное сравнение версий, `final_pass`) — стопкадры в
  `08_QA_Reports/template_upgrade/`.
- 24.10 (исправления по `08_QA_Reports/template_upgrade/VERIFY.md`, З1–З6): Noto без `YOUTUBE.md`, формулировка про sha256, кэш
  webpack по умолчанию выключен, все кадры в готовом файле (шов петли), `vdiff.py`, «✓» только без ошибок — повторная проверка
  на свежей копии там же, раздел «Повторная проверка».
- 24.10 (разнообразие ленты): копии `new_project.sh` (`variety-test` и `template-demo`) во временной папке. `check.mjs` п. 11: заглушки
  → 2 ошибки, заполненные строки → ✓ (ближайшая похожесть 0.17), пересказ «Кадра 0» ai-farm-girl → предупреждение (0.70), демо → только
  справка. `qa.sh`: демо против реестра → PASS (D ≥ 0.595), пересказ строки → WARN, перекодированная копия ai-farm-girl → FAIL (D 0.003),
  нет видео → FAIL. `--register` в тестовый реестр (строки из EDIT_PLAN), замена записи, `VARIANT=B` → `<slug>_B`, `--unregister`
  с миниатюрами; отказы: slug демо, заглушки. Демо, заново отрендеренное со свежей копии, против превью 24.10 → ERROR (D 0.001).
- 24.10 (разнообразие ленты, исправления по `08_QA_Reports/variety_gate_VERIFY.md`, З1, З2, М1–М5): тип кадра 0 внутри H1 (стандарт
  H14, D2, 9C, раздел 7; шаблон EDIT_PLAN), поиск по времени ±0.5 s (признаки v2, реестр перерегистрирован), INFO вместо OK при ERROR,
  `VARIETY_REGISTRY`, имя файла `<stem>` в шагах 6–7. Повторная проверка на свежей копии с временным реестром — там же, раздел
  «Исправления и повторная проверка».

- 24.10 (моушн-дизайн): копия `new_project.sh template-demo` во временной папке + клип Keaton через `fetch_asset.py`. `tsc` чисто,
  `DEMO_OK=1 check.mjs` — все проверки, 3 старых предупреждения; рендер `MotionDemo` (1306 / 1306 кадров) и замер (раздел «Моушн-дизайн»),
  стопкадры `Gallery`, `MotionDemo` и всех тест-композиций. `check.mjs` на второй копии: `<Kinetic>` без `hide_subs` → ошибка, `--fix` →
  ✓; число графика не из FACTS и счётчик над видимым субтитром → 2 ошибки; карта в кадре 0 → ошибка R4, с `live: true` → предупреждения
  (без токена; H1), современные границы при 1941 в FACTS → предупреждение, `map_period: "modern"` → ✓; трек без клипа / клип без строки
  CREDITS → ошибка, после `fetch_asset.py` → ✓, канал `de-…` → L6; импорт несуществующих `data/maps` / `data/tracks` → 2 ошибки.
  Найдено и исправлено: группа субтитров на краю скрытого диапазона показывала скрытое слово снова («DEMO OF OUR» после крупного
  «THIS IS THE DEMO») — `Subtitles` получил `skip`, `Short.tsx` передаёт слова `hide_subs`. Файлы — `08_QA_Reports/motion_kit/`.

## Ограничения

- Демо-сцены — только образец API (рисованные примитивы); для настоящего ролика их заменяют. `chars.tsx` и `draw.tsx` несут персонажей
  и предметы Pig War (Pig, Farmer, Ship, Island…) — это библиотека, а не стиль по умолчанию.
- Карточки и кадры Atlas в шаблон не входят: их делает `tools/atlas` из арта владельца для каждого ролика.
- 3D — только предметы, карты, рельеф, 3D-текст; никаких VFX из сфер; Atlas никогда не 3D (`shot.py` отказывает).
- `@remotion/lottie`, `@remotion/transitions`, `motion-blur`, `gif`, `layout-utils` 4.0.535 и `lottie-web` уже есть в overlay
  `~/shorts/tools/remotion_nm/node_modules`; отдельный `node_modules` для шаблона не ставится (ENVIRONMENT_AUDIT, раздел 4).
- Кэш webpack по умолчанию выключен: он лёг бы в общий overlay `node_modules/.cache` (≈ 180 MB на каждый вариант бандла).
  `render.mjs` / `stills.mjs` его не пишут (включить — `BUNDLE_CACHE=1`: бандл быстрее, но запись в общий overlay), `npx remotion
  render | still | bundle` — тоже нет (`Config.setCachingEnabled(false)` в `remotion.config.ts`). `npx remotion studio` выключателя
  не имеет и пишет `node_modules/.cache/webpack/remotion-development-4.0.535`. Побочный эффект Remotion: CLI с выключенным кэшем
  сам удаляет найденный `remotion-production-4.0.535/` («Cache disabled but found. Deleting»), так что кэш от `BUNDLE_CACHE=1`
  живёт до первого `npx remotion render | still`. Так 24.10 в 19:47 повторная проверка удалила три старые папки кэша из overlay
  (≈ 530 MB, см. `08_QA_Reports/template_upgrade/VERIFY.md`); сейчас `node_modules/.cache/webpack/` пуст.
- Моушн-дизайн: тест-композиции (`MotionDemo`, `KineticGallery`, `Gallery`) рассчитаны на демо-слова шаблона; в проекте с меньшим
  числом слов они показывают заметку или пустые слоты (бандл не ломается). Карты `data/maps/demo_*` (0.9 MB) и трек `keaton_wind`
  (124 KB) копируются в каждый проект — это данные тестов; удалить их можно только вместе с `MapsDemo` / `MotionDemo` / сценами `Gallery`.
- Стандарт (`00_Docs/SHORTS_EDITING_STANDARD.md` §2, 4.3, 9D, 9E) ещё ссылается на копии `atlas_scene.py` / `cutout_cards.py` /
  3D-скриптов из эпизодов: теперь они в `short/tools/atlas/` и `short/tools/blender/` шаблона (правка стандарта — за владельцем).
