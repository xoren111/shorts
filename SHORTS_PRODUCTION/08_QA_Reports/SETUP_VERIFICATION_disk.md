# Проверка установки по диску (verify-disk)

Дата: **2026-10-24**. Корень: `/Users/khorengrigoryan/shorts/SHORTS_PRODUCTION`. Это независимая сверка: я заново обошёл диск,
пересчитал sha256 каждого файла, открыл медиа и сравнил результат с логами и документами. Файлы ассетов не менялись.
Рабочие скрипты лежат вне проекта: `/private/tmp/claude-501/-Users-khorengrigoryan-shorts/39eead59-aa4a-4c21-bbb2-8ef756811d60/scratchpad/work_verify-disk/`
(`inventory.py`, `media.py`, `compare.py`, `docs_check.py`, результаты `inv.json`, `media.json`, `compare_out.json`).

## Вердикт

**PASS с мелкими замечаниями.** Всё, что заявлено в логах и документах, лежит на диске: размеры и sha256 совпадают, файлов вне учёта нет,
медиа открываются, исполняемых файлов и файлов больше 200 MB нет. Я перепроверил факты об окружении командами, и они верны.
Блокирующих проблем нет. Есть три содержательных вопроса: не собран шаблон `04_Templates`, у одного mp3 мусор в конце файла,
в одной цифре аудита ошибка. Остальное касается оформления логов.

## 1. Инвентаризация

| Область | Файлов | Объём (MB, десятичные) |
|---|---:|---:|
| 00_Docs | 6 | 0.43 |
| 02_Research/download_logs | 5 | 0.51 |
| 03_Assets/Animations | 22 | 1.67 |
| 03_Assets/Cinematic_Effects | 178 | 109.10 |
| 03_Assets/Fonts | 23 | 4.05 |
| 03_Assets/Graphics | 246 | 3.22 |
| 03_Assets/Licenses | 36 | 0.07 |
| 03_Assets/Memes_Reactions | 8 | 26.00 |
| 03_Assets/Music | 14 | 80.64 |
| 03_Assets/Overlays | 205 | 573.01 |
| 03_Assets/Sound_Effects | 73 | 98.74 |
| 03_Assets/Templates_Presets | 17 | 14.90 |
| 03_Assets/Transitions | 83 | 151.33 |
| 03_Assets/Typography | 1 | 0.01 |
| 03_Assets/Motion_Graphics | 0 | 0 (пусто намеренно, см. ASSET_LIBRARY §10) |
| **Всего** | **917** | **1063.7 MB (1014.4 MiB)** |

- В `03_Assets` лежат **906** файлов: **853 ассета** (1060.9 MB) и **53 служебных** файла (36 лицензионных заметок, README, превью, CREDITS, index.json,
  CAPTION_PRESETS, MEME_CATALOG). Это совпадает с README, ASSET_LIBRARY и ASSET_DOWNLOAD_LOG: 853 / 53 / 1061.3 MB. Разница в 0.4 MB объясняется округлением
  и тем, что служебные файлы Kenney (preview/License) входят в паки.
- Ни одного файла по 0 байт. Ни одного файла > 200 MB: самый большой — `Overlays/smoke_fog/overlay_mist_thick_flowing_1080p_mixkit.mp4`, 58 MB.
- Нет исполняемых битов, symlink'ов, скрытых файлов, `.sh/.py/.js/.app/.pkg/.dmg/.exe`. В SVG нет `<script>`, `on*`, `foreignObject`, `<image>`
  и внешних `href`. Секретов (ключей ElevenLabs и т. п.) в дереве нет.
- Типы по расширениям: png 378, svg 276, wav 70, md 54, mp4 37, json 26, txt 18, cube 15, ttf 11, mp3 11, jpg 10, webm 8, zip 1, ogg 1, flac 1.
  `file(1)` подтверждает тип у каждого файла. 6 `.md` file(1) называет «HTML/Java source», но это ложная тревога: внутри обычный Markdown.
- Пустые служебные папки: `01_Input`, `04_Templates`, `05_Projects`, `06_Exports`, `07_Thumbnails_Covers`. `08_QA_Reports` до этого отчёта тоже была пустой.

## 2. Проверка содержимого

| Проверка | Результат |
|---|---|
| Аудио/видео (128 файлов): ffprobe + декодирование первой секунды (`-t 1`) и последней (`-sseof -1`) | **127 без ошибок, у 1 предупреждение** (см. п. 4.2). Полное декодирование проблемного файла проходит с rc=0 на всю длину (81.68 с) |
| Картинки png/jpg (388): полное декодирование через ffmpeg | 388 / 388 OK |
| SVG (276): `xmllint --noout` | 276 / 276 валидный XML |
| Lottie (20): JSON-парсинг, ключи v/fr/ip/op/w/h/layers, внешние ассеты | 20 / 20 OK, Lottie 5.8.1, 60 fps, 1024×1024. Внешних картинок нет (assets — только precomps) |
| JSON (6: 5 логов + `Sound_Effects/index.json`) | все парсятся. В index.json 70 записей, все файлы на месте |
| Шрифты (11 ttf): разбор таблиц (head magic, обязательные таблицы, границы) и `fc-scan` | 11 / 11 OK. Montserrat и Anton побайтно совпадают с канальными (`channel-branding/kit`, `rabbits`) |
| LUT (15 .cube): `LUT_3D_SIZE` × строки и пробный `lut3d` в ffmpeg | 15 / 15: 33³ = 35937 строк, ffmpeg без ошибок |
| zip (1): `unzip -t` | `Graphics/icons/lucide/_archive/lucide-icons-1.61.0.zip`: «No errors», внутри только 1903 svg и 1903 json |
| Дубли по sha256 | 1 пара, безвредная: `Graphics/emoji/LICENSE_Apache-2.0.txt` = `Fonts/PermanentMarker/LICENSE.txt` (одинаковый текст Apache-2.0) |

## 3. Сверка с логами и документами

**`02_Research/download_logs/*.json`.** 450 записей `downloaded` и `generated_selfmade`: graphics 285, sfx 70, visuals 43+19, memes 20, music 13.
- Пропавших файлов: **0**. 4 записи visuals — это папки Kenney-паков (`.../kenney_*_cc0/`). Число файлов в них (98 / 80 / 154 / 75) и суммарный
  размер (5455244 / 6009920 / 5041641 / 385859 байт) совпали с логом.
- Расхождений по размеру: **0**. Расхождений по sha256: **0** (446 одиночных файлов).
- Повторов одного файла в логах: 0.
- Файлов на диске вне логов: 460. Из них 407 — содержимое 4 Kenney-паков, 53 — служебные файлы. Неучтённых ассетов нет.

**`00_Docs/ASSET_DOWNLOAD_LOG.md`.** 446 строк таблиц и 407 строк Kenney из приложения A. Для всех 853 я сверил размер и префикс sha256 с диском:
**0 расхождений**. Итоговая таблица (450 записей / 853 файла / 1061.3 MB) верна.

**`00_Docs/ASSET_LIBRARY.md`.** Итоги по категориям (SFX 70, Music 13, Overlays 204, Transitions 82, Cinematic 177, Templates 15, Memes 7,
Fonts 21, Graphics 244, Animations 20, всего 853) совпали с моим подсчётом. Иконки и эмодзи перечислены шаблоном имени со списком (`icon_<имя>_lucide.svg` — 95 шт.: …),
каждое имя есть на диске. Ссылки, которых нет в `03_Assets`, — это файлы существующих kits в `~/shorts` (раздел «уже есть») или сокращения вида
`overlay_light_leaks_01/05/06_…`. Все абсолютные пути из ASSET_LIBRARY, README и SHORTS_EDITING_STANDARD существуют. Единственный путь,
которого нет, — `04_Templates/remotion_short`, и сами документы называют его «следующим шагом».

**Лицензии.** У каждого источника скачанных файлов есть заметка в `03_Assets/Licenses`:

| Источник (файлов) | Заметка |
|---|---|
| Mixkit SFX (60) / Music (8) / Video (16 visuals + 4 memes) | `mixkit_LICENSE.md`, `mixkit_music_LICENSE.md`, `mixkit_video_LICENSE.md` |
| Kenney SFX (10) / паки (4 → 407 файлов) | `kenney_LICENSE.md`, `kenney_vfx_LICENSE.md` |
| Google Fonts (21) | `google-fonts_LICENSE.md` |
| Lucide (97), Tabler (79), Noto Emoji (56), Noto Animated (20), Openclipart (12) | `lucide_`, `tabler_`, `noto-emoji_`, `noto-animated-emoji_`, `openclipart_LICENSE.md` |
| Commons PD-фильмы (9), гос. PD (2+2 NASA), CC BY-SA «Rolling eyes» (1) | `us_public_domain_films_`, `wikimedia_commons_video_`, `nasa_LICENSE.md` |
| Commons VFX FOOTAGE CC BY 3.0 (8), Internet Archive Beachfront (1) | `wikimedia_commons_vfxfootage_`, `internet_archive_beachfront_LICENSE.md` |
| ambientCG (8), Poly Haven (1), slay LUT (5), self-made (19) | `ambientcg_`, `polyhaven_`, `slaycamera_luts_`, `selfmade_visuals_LICENSE.md` |
| Incompetech (2), Musopen/Commons (2), USAF Band (1) | `incompetech_`, `musopen_`, `usaf_band_LICENSE.md` |

У каждой заметки есть название лицензии, ссылка (у self-made ссылки нет, и она не нужна), коммерческое использование, атрибуция и дата проверки 2026-10-24.
Заметки по Pixabay, Pexels, Freesound, Sonniss, BBC, Zapsplat, YTAL, Scott Buckley и LottieFiles относятся к источникам, которые только в каталоге.
Строгий поиск NC/ND по полям лицензии в логах ничего не нашёл. У всех записей `commercial_ok = true`. У всех 37 позиций, где нужна атрибуция,
`attribution_text` заполнен, а готовые строки есть в ASSET_LIBRARY §14.
Я выборочно открыл 3 страницы Mixkit (#4508, #43850, #1960): на всех метка `data-license="videoFree"` и «Stock Video Free License». Это совпадает с логом.

**Существующие проекты в `~/shorts` не тронуты.** Вне `SHORTS_PRODUCTION` (без node_modules) нет ни одного файла, изменённого после 11:30 24.10.

## 4. Найденные проблемы

### 4.1 [средне] Не собран шаблон `04_Templates/remotion_short`
Папка пуста. README, ENVIRONMENT_AUDIT (§3 шаг 1) и SHORTS_EDITING_STANDARD (стр. 93) это признают и дают обходной путь: копия kit через rsync в README §2.
Брифу «шаблоны / templates» пока отвечают только LUT, CAPTION_PRESETS и инструкции.
**Что сделать:** собрать `04_Templates/remotion_short` по плану из ENVIRONMENT_AUDIT §3.1, с symlink на общий node_modules и проверкой `tsc` + `check.mjs` на демо-VO.

### 4.2 [низко] `Music/upbeat_energy/music_flight_of_the_bumblebee_usaf_strolling_strings_commons.mp3`: мусор в конце файла
ffmpeg пишет `Header missing / Invalid data found` на последнем пакете. После аудио идёт текстовый ID3v1-хвост: при полном декодировании rc=0,
длина 81.68 с, звук не пострадал. Файл побайтно совпадает с Commons (sha1 сверен агентом).
Отдельно в ID3 стоит `copyright=ASCAP, BMI`, а аранжировщик не назван. Агент музыки это уже отметил (`usaf_band_LICENSE.md`, risk low-medium).
**Что сделать:** при использовании брать `ffmpeg -i in.mp3 -map 0:a -c copy -map_metadata -1 out.mp3`, оригинал не трогать.
Для монетизируемых роликов этот трек ставить после других, пока не подтверждена аранжировка.

### 4.3 [низко] ENVIRONMENT_AUDIT: «489 фильтров»
На самом деле фильтров **481**. Число 489 — это строки вывода `ffmpeg -filters` вместе с 8 строками легенды. Остальные факты аудита верны (раздел 5).
**Что сделать:** поправить на 481.

### 4.4 [низко] Записи Kenney в `visuals.json`
В 4 записях `file` указывает на папку, `bytes` — сумма файлов папки, а `sha256` — от исходного zip, которого на диске нет. Поэтому sha256 по логу не проверить.
Хэши всех 407 файлов есть только в приложении A к ASSET_DOWNLOAD_LOG.md (я их сверил: совпали).
**Что сделать:** добавить в лог (или в `kenney_*_cc0/manifest.json`) список файлов с размером и sha256 и переименовать поле в `source_zip_sha256`.

### 4.5 [низко] Логи оформлены по-разному
`music.json` хранит абсолютные пути, остальные логи — относительные. В `visuals.json` ключ называется `agent` вместо `label`.
У 12 записей с текстами лицензий (`OFL.txt`, `LICENSE.txt`) в `graphics.json` пустой `license_url`.
**Что сделать:** привести к одной схеме (относительные пути, `label`, `license_url` у всех).

### 4.6 [инфо] Ограничения отдельных ассетов (агенты их уже пометили)
- `Memes_Reactions/failure/reaction_astronaut_falls_apollo17_nasa_1972.mp4` — всего 320×240, годится только для PiP или «кадра в телевизоре».
- PD-вставки идут в нестандартных форматах: Nosferatu 17.98 fps, Safety Last 1472×1072, NASA SLS 1134×1080, Artemis 1920×800. В Remotion их нужно приводить к 1080×1920 / 60 fps (кадрирование, `playbackRate`).
- LUT slay (CC BY 4.0) взяты из репозитория, созданного 2026-10-06, и лицензию автор заявил сам. Это записано в `slaycamera_luts_LICENSE.md`, а в приоритете self-made LUT.
- Внутри библиотеки лежит zip релиза Lucide (1.4 MB). Он проверен, исполняемых файлов нет. Можно оставить как архив исходника.

## 5. Проверка фактов об окружении (команды выполнены 24.10)

| Утверждение в документах | Проверка | Итог |
|---|---|---|
| macOS 26.5.2 (25F84), arm64, M2 Pro, 12 CPU, 19 GPU, Metal 4, 16 GB | `sw_vers`, `sysctl`, `system_profiler` | верно |
| свободно 98 GB | `df -h` → сейчас **95 GB** | было верно на момент аудита, после загрузок свободного места меньше |
| ffmpeg 9.0.1_1 Homebrew; есть loudnorm/ebur128/lut3d/haldclut/chromakey/colorkey/minterpolate/xfade/zoompan/scale_vt/scdet/sidechaincompress/arnndn/speechnorm; энкодеры x264/x265/videotoolbox/prores/svtav1/vp9/mp3lame/opus/aac_at; нет drawtext/subtitles/ass/zscale/libplacebo/vidstab/rubberband/frei0r/whisper/scale_metal/libwebp | `ffmpeg -filters/-encoders/-hwaccels` | верно (кроме числа фильтров, п. 4.3) |
| ffmpeg-full 9.0.2 keg-only не установлен; libass 0.17.5 | `brew info` | верно (libass доступен в brew, но не установлен) |
| Blender 5.2.2 LTS 2026-09-15, Python 3.13.13, обёртка `/opt/homebrew/bin/blender` | `--version`, `python3.13 --version` | верно |
| whisper-cli 1.9.5; модели large-v3-turbo 1.62 GB, small 488 MB; флаги `-ml -sow -dtw -nfa -ojf` | `--version`, `ls -la`, `--help` | верно |
| rhubarb 1.14.0 в `~/shorts/tools/rhubarb`, не в PATH | `--version`, `which` | верно |
| yt-dlp 2026.08.19 | `--version` | верно |
| `/usr/bin/python3` 3.9.6 + numpy 2.0.2, Pillow 11.3.0, cv2, scipy 1.13.1, skimage 0.24.0, rembg 2.0.61, onnxruntime 1.19.2, модели `~/.u2net`; при `-I` numpy не импортируется | импорт с `-I` и без | верно. В брифе-скауте было «без numpy», это ошибка, и аудит её исправил |
| python3.15 Homebrew без numpy; scratch-venv py3.15 + numpy 2.5.4 по абсолютному пути; относительный путь из брифа не работает | запуск | верно |
| Remotion 4.0.535 (npm 4.0.538), React 19.2.0, three 0.186.1, fiber 9.8.2, drei 10.7.9, postprocessing 6.39.5, skia 2.14.0; transitions/lottie/gif/motion-blur/light-leaks/layout-utils/animated-emoji не стоят; node_modules 2.5 GB; kits ссылаются symlink'ом; `remotion.config.ts` jpeg 94 / CRF 16 / angle | `package.json`, `ls`, `npm view`, `cat` | верно |
| node 25.9.0, npm 11.12.1, pnpm 9.15.0, deno 2.9.7; глобальные пакеты | `--version`, `npm -g ls` | верно |
| Swift 6.3.3, Xcode 26.6; Chrome 155.0.8059.85; Playwright 1169–1228; git 2.50.1, gh 2.92.0 (вход выполнен) | `--version` | верно |
| fc-scan 2.18.3, cwebp 1.6.0 есть; sox/ImageMagick/exiftool/mediainfo/inkscape/7z/wget/uv/bun/yarn/ttx и др. нет | `command -v` | верно |
| GUI: только Blender и Chrome; Resolve/Premiere/AE/CapCut/FCP нет | `ls /Applications` | верно |
| `.env.elevenlabs_paid` 136 B 0600, `orangutan/.env` 71 B 0600 | `stat` (значения не читались) | верно |
| 113 Remotion-бандлов, 499 MB в temp; atlas-ape 53 GB (pig-war 21, volcano 17); mpfb_assets 863 MB; Playwright 2.5 GB | `ls`, `du` | верно |
| FREE-key: 9 `*_el.wav` + `crowd_cheer_short.wav` в volcano; одинаковый sha256 во всех kits; в ai-farm-girl index.json помечены `procedural`; используются в events.ts beat «crowd»; index 130 записей | `shasum`, `grep`, JSON | верно |
| music_calm: 6 треков YTAL + analysis.json + previews; measure.py существует | `ls` | верно |

**Язык документов.** ENVIRONMENT_AUDIT, SOFTWARE_DECISION, SHORTS_EDITING_STANDARD, README, ASSET_LIBRARY и ASSET_DOWNLOAD_LOG написаны по-русски.
Английские остались только термины, пути, команды и таблицы с именами файлов и хэшами (поэтому у DOWNLOAD_LOG доля кириллицы около 7 %). Лицензионные заметки тоже на русском.

## 6. Что сделать дальше
1. Собрать `04_Templates/remotion_short` (п. 4.1). Это главный открытый пункт системы.
2. Мелкие правки: «481 фильтр» в аудите; манифест Kenney-паков; единая схема логов (п. 4.3–4.5).
3. Bumblebee: на этапе монтажа брать копию без хвоста; для монетизации ставить после других треков (п. 4.2).
