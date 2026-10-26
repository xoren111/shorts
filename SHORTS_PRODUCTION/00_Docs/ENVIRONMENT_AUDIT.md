# Аудит окружения — система производства Shorts

Дата аудита: **2026-10-24**. Машина владельца, каналы @ATLASAPE-S (EN, гео/история, ведущий — орангутан Atlas) и остальные проекты в `~/shorts`.
Во время аудита в `~/shorts` ничего не менялось, ничего не устанавливалось и не покупалось. Ключи ElevenLabs не читались и не выводились.

**Главный вывод.** Всё нужное для выпуска Shorts уже стоит и работает: Remotion + ffmpeg + Blender + whisper + Python-инструменты.
Новая система строится **поверх** существующих Remotion-kits (`~/shorts/atlas-ape/*/short*/`), а не вместо них.
GUI-монтажка не нужна для конвейера. Обязательных покупок нет. Есть три вопроса, которые решает только владелец:
лицензия Remotion, FREE-key звуки в уже сданных роликах, ручные загрузки с сайтов за Cloudflare или логином (раздел 5).

---

## 0. Обновление 24.10 (вечер): установлены пакеты 1–3 (с разрешения владельца)

Закрыты пробелы для работы с исходным видео и тяжёлой обработки. Всё проверено на реальных файлах
(лист-доказательство: `08_QA_Reports/tooltests/tooltests_proof.jpg`). Общий `node_modules` kits **не менялся**.
Побочный эффект brew: обычный `ffmpeg` обновился 9.0.1 → 9.0.2 (патч).

| Инструмент | Версия | Как вызывать | Зачем | Проверка 24.10 |
|---|---|---|---|---|
| **ffmpeg-full** (keg-only, рядом с обычным) | 9.0.2 | `~/shorts/tools/bin/ffmpeg-full` (= `/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg`), `ffprobe-full` | drawtext, subtitles/ass (libass), vidstab, rubberband, zscale, libplacebo, frei0r, libwebp | все пункты раздела 2.1 проверены ✓ (libplacebo — после MoltenVK) |
| **molten-vk** (brew, Apache-2.0) | 1.4.2 | ставится как Vulkan-драйвер, вызывать не нужно | нужен libplacebo в ffmpeg-full (Vulkan поверх Metal) | libplacebo-тонмаппинг HLG → bt709 ✓ |
| **rubberband** | 4.0.0 | `rubberband` CLI или фильтр `rubberband=tempo=1.08` в ffmpeg-full | ускорение голоса без смены тона | VO 30.0 → 27.78 с (×1.08) ✓ |
| **auto-editor** (brew) | 31.7.2 | `auto-editor in.mp4 --margin 0.1s -o out.mp4 --no-open` | авто-вырезка пауз (jump cuts) в исходнике | 25.5 → 23.5 с, вставленная пауза 1.5 с убрана ✓ |
| **mediainfo** | 26.10 | `mediainfo file` | QA: цветовые теги, edit lists, битрейт | ✓ |
| **librsvg** | 2.63.4 | `rsvg-convert -w 512 in.svg -o out.png` | SVG (иконки, эмодзи) → PNG | ✓ |
| **uv** | 0.13.5 | `uv venv`, `VIRTUAL_ENV=… uv pip install` | окружения Python 3.12 | ✓ |
| **DeepFilterNet** (бинарник arm64, MIT/Apache) | 0.5.6 | `~/shorts/tools/bin/deep-filter -o outdir in.wav` (48 kHz) | чистка голоса от шума | шум в паузе −38.6 → −56.8 dB, голос без изменений ✓ |
| **RIFE** ncnn-vulkan (universal, MIT) | 20221029 | `~/shorts/tools/bin/rife-run -i frames_in -o frames_out` (модель rife-v4.6) | slow-mo, speed ramp, сглаживание 16–18 fps | GPU «Apple M2 Pro» через Vulkan/MoltenVK: 24 → 48 кадров за 3.4 с ✓ |
| **Real-ESRGAN** ncnn-vulkan (universal, BSD-3) | 20220424 | `~/shorts/tools/bin/esrgan-run -i in.jpg -o out.png -n realesrgan-x4plus` (или `-s 2`) | апскейл архивных фото/кадров (умеренно: не «дорисовывать» лица) | 400×264 → 1600×1056 за <1 с ✓ |
| **Python 3.12 env** | CPython 3.12.15 | `~/shorts/tools/py312/bin/python` | всё ниже | torch 2.14.1, MPS = True ✓ |
| ↳ **SAM 2** (Apache-2.0) | 1.1.0, модели `~/shorts/tools/models/sam2/sam2.1_hiera_{tiny,small}.pt` | `build_sam2_video_predictor('configs/sam2.1/sam2.1_hiera_t.yaml', …, device='mps')`, env `PYTORCH_ENABLE_MPS_FALLBACK=1` | ротоскоп и маски объектов по видео, основа трекинга | 50 кадров 540p за 34 с, маска стабильна ✓ (CUDA-постобработка недоступна — на результат не влияет) |
| ↳ **Demucs** (MIT) | 4.1.0, htdemucs | `python -m demucs --two-stems=vocals -d mps in.wav` | разделить голос и музыку | 12 с за 15 с; корреляция голоса с чистым VO 0.91 (у микса 0.41) ✓ |
| ↳ **librosa** (ISC) | 1.0.0 | `librosa.beat.beat_track`, `onset_detect` | бит-синк монтажа, транзиенты для SFX | 60 с трека: темп, 159 битов ✓ (первый запуск ~30 с — компиляция numba) |
| ↳ **PySceneDetect** (BSD-3) | 0.7.2 | `scenedetect.detect(path, ContentDetector())` | нарезка исходника на сцены | 56-с Short → 27 сцен за 3.9 с ✓ |
| ↳ **MediaPipe** (Apache-2.0) | 1.1.1, модель `~/shorts/tools/models/mediapipe/blaze_face_short_range.tflite` | Tasks API `vision.FaceDetector` | авто-рефрейм 16:9 → 9:16 по лицу | лицо в 101/101 кадре, рамка 9:16 рассчитана ✓ |
| ↳ **OpenCV contrib** (CSRT) | 5.0.0 | `cv2.TrackerCSRT_create()` | лёгкий трекинг бокса | 60/60 кадров ✓ |
| **Remotion extras** | @remotion/lottie, transitions, motion-blur, gif, layout-utils 4.0.535 + lottie-web 5.13.0 | overlay `~/shorts/tools/remotion_nm/node_modules` (ссылки на общий volcano/short/node_modules + реальные копии extras; список — `../EXTRAS.txt`). Шаблон и `new_project.sh` указывают на overlay | Lottie из `03_Assets/Animations`, готовые переходы, шлейф, автоподгон текста | tsc ✓, stills: Lottie, wipe, Trail, fitText ✓; кэш webpack теперь пишется в overlay, не в общий node_modules |

Диск: py312 1.2 GB, модели 337 MB, бинарники 563 MB, overlay 208 MB; свободно ≈ 91 GB.

### 0.1 API-доступы (ключи владельца, 24.10)

Все ключи — в `SHORTS_PRODUCTION/.env.assets` (0600), токен YouTube — в `SHORTS_PRODUCTION/.youtube_token.json` (0600). В логи и ответы не печатаются.

| Сервис | Статус | Инструмент | Проверка 24.10 |
|---|---|---|---|
| **Pixabay API** | ✅ работает | `~/shorts/tools/pixabay.py` | поиск и загрузка фото (1280 px) и видео (есть вертикальные 4K) |
| **YouTube Data API v3 + Analytics API** (OAuth, Google Cloud проект `lively-pursuit-512610-d1`, клиент «ai», тип Desktop, права только на чтение) | ✅ работает, канал **ATLAS APE** (`mapsauruss@gmail.com`) | `~/shorts/tools/yt_oauth.py test` (повторный вход: `yt_oauth.py login`) | канал: 4 подписчика, 5 видео; отчёт по видео за 28 дней (просмотры, средняя длительность, % досмотра, лайки, репосты, подписки); кривая удержания `audienceWatchRatio` — 100 точек на ролик. Данные Analytics отстают на ~2–3 дня |
| **Freesound API** | ✅ поиск + **оригиналы** (OAuth владельца выполнен 24.10; токен `SHORTS_PRODUCTION/.freesound_token.json`, 24 ч, обновляется сам по refresh token) | `~/shorts/tools/freesound.py search "…" --license cc0\|ccby --max-dur 3` / `get ID --dest DIR` (только CC0 и CC BY, лог в `download_logs/freesound.json`) | скачан оригинал WAV 24 bit / 48 kHz вместо превью MP3 ~186 kbps ✓. Права токена Freesound выдаёт «read write» (уже не сузить) — используем только чтение и скачивание. Лимиты: 60 запросов/мин, 2000/день |
| **Europeana API** | ✅ работает | REST `api.europeana.eu/record/v2/search.json?wskey=…` | «Berlin 1936» → 17 758 открытых материалов |
| **GIPHY API** (beta key: 100 запросов в час) | ✅ поиск | `~/shorts/tools/giphy.py search "…"` — таблица (кто загрузил, риск) + доска превью в `08_QA_Reports/giphy_boards/` | поиск «shocked» → 8 результатов ✓. **Медиа не скачиваем:** правила GIPHY API запрещают кэшировать/хранить их файлы без одобрения; мем для вставки — по решению владельца (стандарт, R7) |
| Pexels API | ✗ ключи больше не выдают | — | — |
| api.data.gov (NASA, Smithsonian) | ждём письмо | — | NASA работает и без ключа с меньшими лимитами |

**OAuth — решено 24.10:** приложение «ai» переведено в **In production** (Branding: главная https://xoren111.github.io/AdmTools/, политика https://xoren111.github.io/AdmTools/privacy.html, домен xoren111.github.io; сайт — репозиторий личного GitHub xoren111/AdmTools, исходники `~/shorts/tools/admtools_site`, отдельный вход gh в `~/.config/gh-xoren111`, рабочий gh не тронут). Токен перевыпущен после публикации — еженедельного сброса больше нет. Google помечает приложение как непроверенное (для личного использования до 100 пользователей проверка не нужна).

---

## 1. Доступные инструменты

### 1.1 Железо и программы

| Инструмент | Версия | Где лежит | Что умеет / роль в пайплайне |
|---|---|---|---|
| macOS + железо | macOS 26.5.2 (25F84), Darwin 25.5.0 arm64 | — | Apple M2 Pro: 12 CPU, 19 GPU-ядер, Metal 4. RAM 16 GB (при аудите занято 2.8 GB swap). Диск 460 GB, свободно **98 GB** при аудите (к вечеру 24.10 ≈ 96 GB после загрузки библиотеки). `~/shorts` = 128 GB, из них atlas-ape 53 GB (pig-war 21 GB, volcano 17 GB). Аудит шёл от батареи (52 %). |
| **Remotion** (ядро монтажа) | remotion 4.0.535 (на npm уже 4.0.538), React 19.2.0, three 0.186.1, @react-three/fiber 9.8.2, drei 10.7.9, postprocessing 6.39.5, @shopify/react-native-skia 2.14 | общий `node_modules` в `/Users/khorengrigoryan/shorts/atlas-ape/volcano/short/node_modules` (2.5 GB); остальные kits ссылаются на него symlink'ом | Установлены @remotion/*: bundler, cli, renderer, studio, three, skia, google-fonts, noise, paths, shapes, captions, media, media-utils, openai-whisper, elevenlabs, player, web-renderer, licensing. Свой chrome-headless-shell 157 в `node_modules/.remotion`. **Не установлены** (есть на npm в 4.0.535): @remotion/transitions, lottie, gif, motion-blur (MIT), light-leaks (Remotion License), layout-utils (MIT), animated-emoji (MIT). `remotion.config.ts`: jpeg q94, h264 CRF 16, `setChromiumOpenGlRenderer('angle')`. |
| **ffmpeg / ffprobe** | 9.0.1_1 (Homebrew) | `/opt/homebrew/bin/ffmpeg`, `/opt/homebrew/bin/ffprobe` | 481 фильтр (`ffmpeg -filters` печатает 489 строк, из них 8 — легенда). ЕСТЬ: loudnorm, ebur128, lut3d (.cube), haldclut, chromakey, colorkey, minterpolate, xfade, zoompan, gblur/boxblur, vignette, curves, eq, colorspace, scale_vt, scdet, freeze/black/silencedetect, sidechaincompress/sidechaingate, acompressor, alimiter, afftdn, arnndn, speechnorm, dynaudnorm, showwaves/showspectrum, lenscorrection, perspective. Энкодеры: libx264, libx265, h264/hevc/prores_videotoolbox, prores_ks, libsvtav1, libvpx-vp9, dnxhd, ffv1, qtrle, png/apng/gif, aac/aac_at, libmp3lame, libopus, flac. hwaccel videotoolbox. **НЕТ:** drawtext, subtitles/ass (нет libass и freetype), zscale, libplacebo, vidstab, rubberband, frei0r, whisper-фильтра, энкодера libwebp, scale_metal. |
| ffmpeg-full | 9.0.2, bottle, keg-only | **не установлен**; после установки — `/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg` | Опция через brew: добавит drawtext, libass, zscale, vidstab, rubberband и др. Обычный ffmpeg не заменяется. Отдельно есть libass 0.17.5. |
| **Blender** | 5.2.2 LTS (d13f752e3b9c, 2026-09-15), встроенный Python 3.13.13 | `/Applications/Blender.app`, обёртка `/opt/homebrew/bin/blender` | Headless (`-b --python`) работает. Cycles видит «Apple M2 Pro (GPU - 19 cores)», METAL. 13 встроенных add-ons (cycles, glTF, FBX, SVG, BVH, rigify, node_wrangler и др.). Отдельный профиль `~/shorts/tools/blender_user` с расширением MPFB 2.0.18 (GPL-3.0), ассеты MPFB в `~/shorts/tools/mpfb_assets` (863 MB). |
| **whisper.cpp** (`whisper-cli`) | 1.9.5, ggml 0.26.0 | `/opt/homebrew/bin/whisper-cli`; модели `~/.cache/whisper/ggml-large-v3-turbo.bin` (1.62 GB) и `ggml-small.bin` (488 MB) | Metal GPU и flash attention включены. Пословный тайминг через `-ml 1`. Тест: 11 с аудио на small — за 0.57 с. Вход: wav/flac/mp3/ogg. |
| Rhubarb Lip Sync | 1.14.0 | `/Users/khorengrigoryan/shorts/tools/rhubarb/rhubarb` (не в PATH) | Viseme для липсинка Atlas (orangutan rig, `atlas_scene.py`). |
| yt-dlp | 2026.08.19 | `/opt/homebrew/bin/yt-dlp` | PD/CC-исходники (archive.org, Commons) и референсы для анализа. Референсы не перезаливаем. |
| **Python 3.9.6** (системный) | 3.9.6 (Xcode) | `/usr/bin/python3`, пакеты в `~/Library/Python/3.9/lib/python/site-packages` | **Поправка к скауту: numpy ЕСТЬ.** numpy 2.0.2, Pillow 11.3.0 (webp и freetype есть, raqm нет), opencv-python-headless 5.0.0.93, scipy 1.13.1, scikit-image 0.24.0, rembg 2.0.61 + onnxruntime 1.19.2 (модели в `~/.u2net`: birefnet-general, birefnet-portrait, isnet-general-use, u2net, u2net_human_seg), rasterio 1.4.3, pyshp, numba, requests, sympy. **Ловушка:** `python3 -I` отключает user-site, и numpy/PIL/cv2 перестают импортироваться (см. 2.4). |
| Python 3.15 (Homebrew) | 3.15.0 | `/opt/homebrew/bin/python3.15` | Чистый, без numpy. В PATH первым стоит `/usr/bin/python3`. |
| venv'ы | — | `/Users/khorengrigoryan/shorts/barbarossa-1941-v2/.venv` (py3.9 + system-site: matplotlib 3.9.4, fpdf2, pyproj, fonttools); scratch-venv `/private/tmp/claude-501/-Users-khorengrigoryan--claude-spares-spare-DHLcMV/39eead59-aa4a-4c21-bbb2-8ef756811d60/scratchpad/venv` (py3.15, только numpy 2.5.4) | Относительный путь к scratch-venv из брифа не резолвится, рабочий путь — этот абсолютный. fonttools/ttx есть только в barbarossa venv. |
| Swift / Xcode | Swift 6.3.3, Xcode 26.6 | `xcrun swift` / `swiftc` | Apple Vision OCR (`tools/ocr.swift`) для QA-правила «текст не дважды» (`dupes.py`). |
| Google Chrome + Playwright | Chrome 155.0.8059.85; Playwright chromium 1169–1228, firefox 1522, webkit 2287 | `/Applications/Google Chrome.app`, `~/Library/Caches/ms-playwright` (2.5 GB) | Браузер владельца (общий). Агентам запрещён. Remotion использует свой chrome-headless-shell. |
| git / gh | git 2.50.1 (Apple), gh 2.92.0 | `/usr/bin/git`, `/opt/homebrew/bin/gh` | gh залогинен (аккаунт khoren-grigoryan, keyring). Проекты в `~/shorts` не являются git-репозиториями. |
| Node.js и менеджеры | node 25.9.0, npm 11.12.1, pnpm 9.15.0, deno 2.9.7 | `/opt/homebrew/bin/…` | Глобально: @anthropic-ai/claude-code 2.1.292, @google/gemini-cli 0.41.2, oh-my-codex 0.18.1, @cyberstrike-io/cyberstrike 1.1.16, pnpm. registry.npmjs.org доступен. |
| Мелкие CLI | fontconfig 2.18.3, webp 1.6.0 | `/opt/homebrew/bin/fc-scan`, `fc-list`, `cwebp`; `/usr/bin/jq`, `curl`, `bsdtar`, `sips`, `afconvert`, `afinfo`, `say`, `avconvert`, `shasum`, `file`, `unzip`, `textutil`, `qlmanage`, `rsync` | fc-scan проверяет шрифты, cwebp кодирует webp, bsdtar распаковывает zip/7z, sips ресайзит и конвертирует картинки (замена ImageMagick), afconvert/afinfo работают с аудио, shasum считает sha256. |
| Ключи ElevenLabs | — | `/Users/khorengrigoryan/shorts/atlas-ape/.env.elevenlabs_paid` (136 B, 0600) и `/Users/khorengrigoryan/shorts/orangutan/.env` (71 B, 0600) | Значения не читались. По памяти: `.env.elevenlabs_paid` — **PAID Starter** (коммерческое использование разрешено), `orangutan/.env` — **FREE** (некоммерческий, нужен «11.ai» в title, апгрейд задним числом не помогает). api.elevenlabs.io доступен. |

**Нет на машине:** sox, ImageMagick (magick/convert/montage), exiftool, inkscape, potrace, svgo, gifsicle, pngquant, optipng, 7z/7zz/unar, wget, aria2c, pipx, conda, bun, yarn, глобальный ttx. (mediainfo, rsvg-convert и uv установлены 24.10 — раздел 0.)
GUI-программы: DaVinci Resolve, Premiere, After Effects, CapCut, Final Cut, Motion, Audacity, OBS, VLC, GIMP, Inkscape, Krita.

### 1.2 Сеть (проверено 2026-10-24, curl -I/GET)

| Статус | Источники |
|---|---|
| Доступно скриптам (200 OK) | freesound.org (страницы), cdn.freesound.org (HQ mp3 previews без логина), commons.wikimedia.org + api.php (нужен **описательный User-Agent**: с браузерным UA один раз пришёл 429), upload.wikimedia.org, api.openverse.org (фильтр по лицензии), kenney.nl, opengameart.org, polyhaven.com и api.polyhaven.com (dl.polyhaven.org — только по точным путям), ambientcg.com, archive.org, loc.gov, images.nasa.gov, freemusicarchive.org (страницы), incompetech.com, fonts.google.com, fonts.googleapis.com, github.com/google/fonts, raw.githubusercontent.com, assets.mixkit.co (прямые файлы при известном ID) — технически отдаются, но User Terms Mixkit (разд. 9) запрещают скачивание скриптами: **не использовать** (с 24.10 Mixkit не берём совсем: 88 файлов библиотеки в карантине и заменены), pixabay.com/api/docs (сам API требует ключ), videezy.com, bensound.com, registry.npmjs.org, remotion.dev. studio.youtube.com отвечает 200, но нужен логин. |
| **Через API с ключом (с 24.10)** | **Pixabay**: фото и видео через официальный API, ключ владельца в `SHORTS_PRODUCTION/.env.assets` (0600). Инструмент `~/shorts/tools/pixabay.py` (кэш 24 ч, лог лицензий). Музыка и SFX Pixabay в API нет — вручную. Правила — `03_Assets/Licenses/pixabay_LICENSE.md`. |
| Закрыто для скриптов | Cloudflare challenge: pixabay.com и cdn.pixabay.com (403 на сайт; через API — работает), www.pexels.com и videos.pexels.com (403), mixkit.co (страницы, 429 при частых запросах), sonniss.com (403), zapsplat.com (403 + нужен логин). Прочее: svgrepo.com 429, uppbeat.io 429 (логин), freepik.com 403, unsplash.com 401. Такие источники в библиотеке помечены «manual» с точным URL. |

### 1.3 Существующие переиспользуемые kits и инструменты (не трогаем, берём за основу)

| Путь | Что внутри | Как переиспользовать |
|---|---|---|
| `/Users/khorengrigoryan/shorts/atlas-ape/ai-farm-girl/short` | **Самый новый kit** (Atlas Ape #6, 24.10). `src/Short.tsx`: 11 beats + transition engine (zoom-through, whip, push-up, punch, circle), loop-dissolve на кадр 0, grain. `src/ui`: `gfx.tsx` (BigText, Stamp, Chip, Pin, Counter, PhotoKB, LightLeak, KeyFact, Duotone, ImgSeq, палитры), `real.tsx` (Grade/Look/Clip/Photo/FlagBadge), `vox.tsx`, `Subtitles.tsx`. `src/data/events.ts` — события на словах VO + SFX cues. `tools`: check.mjs, mix.py, render.mjs, srt.py (en + pt-BR/es), stills.mjs, sheet.py, sfx_el.py, cutout_cards.py, crowd_screens.py, make_map.py, fix_meme_man.py. Финал: 1080×1920, **60 fps**, H.264 High CRF 16, yuv420p, AAC 320k/48k, faststart, −14 LUFS, TP −1.2 dBTP. Рендер ≈ 1 мин. | Базовый шаблон нового Short: структура Root/Short/scenes/data/ui/tools, `remotion.config.ts`, symlink `node_modules`. Цепочка `npx tsc --noEmit && node tools/check.mjs && /usr/bin/python3 tools/mix.py && CONC=3 node tools/render.mjs && /usr/bin/python3 tools/srt.py`. **Не переносить** `public/memes`, `public/sfx/cj_*.wav` и FREE-key SFX (`*_el.wav`, `crowd_cheer_short.wav`). |
| `/Users/khorengrigoryan/shorts/atlas-ape/pig-war/short3` | Kit полностью рисованной motion-графики (Pig War v3, 23.10). Transition engine: `Tr = none \| zoomthru \| whipL \| whipR \| up \| circle \| diag \| punch \| fade`, таблица DUR 0.2–0.6 с, парный exit у уходящего beat. Слой ShortFlow/FlowCtx для варианта с AI-кадрами. `src/ui/draw.tsx` (Bg rays, Flag, Coin, Soldier, Cannon, Ship, Sea, Island, Bust, Mug, Burst, Confetti, Seal, Document), `chars.tsx`, `Atlas.tsx` (AtlasWin/AtlasLayer/CardLayer). QA: `dupes.py` + `ocr.swift`, `blinks.py`, `cut_frames.py`, `align.py`/`align_vo.py`, `commons_meta.py`, `sfx.py` (1622 строки процедурных SFX), `sfx_pig.py`, `flags.py`, `make_palette.py`, `shots_ts.py`, `render_clip.mjs`. | Библиотека переходов и рисованных примитивов (роль «Transitions / Motion_Graphics» — в коде). QA-инструменты для `08_QA_Reports`. `sfx.py` даёт лицензионно-чистые whoosh/hit/riser/loop. |
| `/Users/khorengrigoryan/shorts/atlas-ape/football-222/short` | Vox torn-print collage kit (Atlas Ape #5). `src/ui/vox.tsx`: PaperBg, Torn, ArchivePhoto, MarkerRing, Grain, Shake, Dust, SpeedLines, Caption, Tag. `public/vox/paper.jpg`, `public/fx/grain_0–7.png`. Hook motion 0–1 с = 21.8. | Стиль «архив + рисованная графика» для исторических Shorts. |
| `/Users/khorengrigoryan/shorts/atlas-ape/tools/measure.py` | Метрика моментов: motion по секундам (gray 135×240 @30 fps), hard cuts (scene > 0.30) на 10 с, words/s через whisper-cli. Бенчмарки: viral 23.6 / flop 10.3 / наши старые 3.0 в секунде 0–1. | Обязательный QA-шаг перед сдачей: `/usr/bin/python3 measure.py VIDEO [--whisper ~/.cache/whisper/ggml-large-v3-turbo.bin]` **без -I**. Проверено: 4.2 с на 33-секундный ролик. |
| `~/shorts/atlas-ape/*/short*/public/sfx` (+ `index.json`) | Канальная SFX-библиотека, WAV 48 kHz 16 bit stereo, peak −3 dBFS; в index.json: name, file, duration, transient_at, source, description, loop. ai-farm-girl: 130 записей (94 procedural, 22 правки CC0/PD/CC BY, 12 ElevenLabs PAID, 1 мем). | Схема index.json (особенно `transient_at`) — стандарт и для `03_Assets/Sound_Effects` (там добавлены поля license/attribution). FREE-key файлы исключать. |
| `/Users/khorengrigoryan/shorts/atlas-ape/pig-war/short/assets/sfx_src` | Оригиналы SFX с `<звук>/meta.json` (24 звука: Freesound HQ previews CC0, Commons PD/CC BY 4.0) и `_packs/` Kenney CC0 (casino 55, impact 130, rpg 52, с License.txt). 324 MB. | Готовые CC0-паки; `meta.json` — образец лога загрузки. |
| `/Users/khorengrigoryan/shorts/atlas-ape/pig-war/short3/CREDITS.md` | Полный список лицензий SFX, Poly Haven HDRI, архива. | Источник attribution, шаблон CREDITS для новых проектов. |
| `/Users/khorengrigoryan/shorts/atlas-ape/music_calm` (+ `/Users/khorengrigoryan/shorts/atlas-ape/volcano/music_candidates`) | 6 треков YouTube Audio Library 320 kbps (A Single Step, **Frame-Dragging** — канальный bed, Marimba Chill, Quirk n Twerk, Science Montage, Taking Flight) + `analysis.json` (key, bpm, лучший фрагмент, stingers) + previews; ещё 6 cinematic YTAL-треков с mood.json. | Музыкальная основа канала. Лицензия YTAL — только YouTube; тип лицензии каждого трека владельцу нужно сверить в Studio. |
| `/Users/khorengrigoryan/shorts/channel-branding/kit` | `fonts/Montserrat-VF.ttf` + OFL.txt, kit.mjs, check.py, Faces.reference.tsx. | Канальный шрифт (та же версия лежит в `03_Assets/Fonts/Montserrat`). |
| `/Users/khorengrigoryan/shorts/orangutan` | Rig ведущего Atlas: TypeScript + PixiJS 8.22 + Vite 8 + vitest 5 + puppeteer-core. 31 анимация, 13 эмоций, сцены, pose_pack; export mp4 и `*_alpha.mov`, Rhubarb lipsync. Правила в `CLAUDE.md` и `CHARACTER_RULES.md`. | **Единственный легальный источник Atlas** — только из арта владельца, ничего не дорисовывать. Мосты в Shorts: `tools/atlas_scene.py`, `tools/atlas_webp.py`, `cutout_cards.py` (Gemini-карточки владельца). Atlas — только реакция. |
| `/Users/khorengrigoryan/shorts/atlas-ape/volcano/short/tools/blender` | `run.sh` (Blender `-b --factory-startup` с глобальным lock на 1 GPU-слот) + shot-скрипты (DEM terrain, toon, decals, камеры), terrain.py, lava_maps.py, cutout_planes.py, qa_frames.py, deglitch.py. | Шаблон 3D-вставок (рельеф, лава, карты) через Blender headless на Metal. |
| `/Users/khorengrigoryan/shorts/barbarossa-1941-v2/data/dl`, `/Users/khorengrigoryan/shorts/deutschland-geschichte/data/raw` | Natural Earth (ne_10m_land, реки, батиметрия, растры NE1_HR_LC и др.); `yellow-fleet/short/tools/geo/build-geo.mjs`, `ai-farm-girl/short/tools/make_map.py`. | Карты (PD). Для WW2 — границы 1937/39, не современные. |
| `/Users/khorengrigoryan/shorts/auto-technik/public` | 9 HDRI Poly Haven (CC0), 6 клипов Pexels с `stock_sources.txt`, 72 синтезированных SFX. | HDRI для Blender/three.js; образец stock-лога на случай ложного Content ID. |
| `/Users/khorengrigoryan/shorts/tools` | rhubarb 1.14.0 (с LICENSE.md), blender_user (профиль + MPFB 2.0.18), mpfb, mpfb_assets (863 MB). | Липсинк и генерация людей в Blender (вывод MPFB использовать можно). |

---

## 2. Ограничения

### 2.1 ffmpeg
**Статус на 24.10 (вечер): все ограничения ffmpeg сняты** — через `ffmpeg-full` (`~/shorts/tools/bin/ffmpeg-full`, стоит рядом с обычным).
Обычный `ffmpeg` в PATH остался урезанным: для функций ниже вызывать именно `ffmpeg-full`. Каждый пункт проверен на тестовом файле.

| Было ограничение | Сейчас | Проверка 24.10 |
|---|---|---|
| Нет drawtext | ✅ есть | текст с обводкой шрифтом Inter на кадре 1080×1920 |
| Нет libass (`subtitles`/`ass`) | ✅ есть — можно вшить `.srt/.ass` | вшит SRT в кадр Китона |
| Нет zscale | ✅ есть — ресайз lanczos и HDR→SDR (tonemap hable) | ресайз ✓; HLG-клип (bt2020) → bt709 ✓ |
| Нет libplacebo | ✅ есть — GPU-скейлинг и тонмаппинг bt.2390 | ✓ после установки **MoltenVK** (Vulkan-драйвер для Metal, brew, 87 MB) |
| Нет vidstab | ✅ есть — стабилизация хроники (`vidstabdetect` → `vidstabtransform`) | Keaton 1928 ✓ |
| Нет rubberband | ✅ есть — темп без смены тона (`rubberband=tempo=1.08`) | VO 30.0 → 27.78 с ✓ |
| Нет libwebp-энкодера | ✅ есть | кадр → .webp ✓ |
| LUT (.cube) | ✅ `lut3d`/`haldclut` работают после рендера | ✓ |

Что осталось ограничением — **не ffmpeg, а Remotion:** нативных LUT в Remotion нет. Варианты: LUT ffmpeg-проходом после рендера (работает)
или свой WebGL-шейдер. Основной текст и субтитры в роликах по-прежнему рендерит Remotion (`Subtitles.tsx`, `gfx.tsx`) — ffmpeg-текст нужен для
быстрых черновиков, превью и вшивания готовых `.srt`.

### 2.2 Программы и GUI
- GUI-монтажки не установлены. Claude не может надёжно управлять GUI и не создаёт осмысленные .drp/.prproj/.aep. Монтаж — только кодом: Remotion + ffmpeg + Blender headless.
- Нет sox, ImageMagick, exiftool, mediainfo, inkscape/rsvg-convert, 7z. Замены: ffmpeg/ffprobe, Pillow, sips, bsdtar.
- `npx remotion gpu` в chrome-headless-shell падает (chrome://gpu ERR_FAILED), но реальные рендеры с three.js через ANGLE проходят — это не поломка. Для 3D обязателен `setChromiumOpenGlRenderer('angle')`.
- `@remotion/google-fonts` качает шрифты в момент рендера: без сети рендер упадёт. Решение — локальные OFL-файлы из `03_Assets/Fonts` через `@font-face`/`staticFile`.
- Текущий `render.mjs` не задаёт `colorSpace: 'bt709'` (в Remotion 4.0.535 по умолчанию `'default'`) и пишет AAC 320k с edit list; официальные рекомендации YouTube — BT.709-теги, AAC 384k, без edit lists (см. 3, шаг 7).

### 2.3 Память, диск, питание
- 16 GB RAM: Remotion рендерить с `CONC=3` чанками по 300 кадров, stills — семафор `STILLS_SLOTS=2`. Blender — один GPU-рендер за раз (`run.sh` с lock). Параллельные рендеры разных агентов упираются в память (swap уже 2.8 GB).
- Диск: свободно 98 GB. В `DARWIN_USER_TEMP_DIR` лежат 113 старых Remotion-бандлов (499 MB); большие `out/chunks` и кадры в pig-war (21 GB) и volcano (17 GB). Чистка — решение владельца.
- Длинные рендеры Remotion и Blender — только от сети (аудит шёл на батарее).

### 2.4 Python
- `python3 -I` (так написано в usage у measure.py, contact_sheet.py, commons_meta.py) отключает user-site → `ModuleNotFoundError: numpy`. Запускать `/usr/bin/python3` **без -I** или из venv. Homebrew python3.15 пакетов не имеет.
- Whisper: на диске только модели small и large-v3-turbo; faster-whisper/WhisperX нет.
- **С 24.10:** для torch/SAM 2/Demucs/librosa/PySceneDetect/MediaPipe — отдельное окружение `~/shorts/tools/py312` (Python 3.12, раздел 0). Системный 3.9 не трогаем.

### 2.5 Источники ассетов
- Freesound без логина отдаёт только HQ mp3 previews (128 kbps); оригиналы WAV — с аккаунтом.
- Pixabay и Pexels: страницы и CDN за Cloudflare, API требует ключ, ключ — аккаунт (Claude аккаунты не создаёт).
- Mixkit: страницы при частых запросах закрываются Cloudflare (429); файлы `assets.mixkit.co` отдаются при известном ID. **У Mixkit две видеолицензии:** Free и Restricted (только личное, монетизируемый YouTube исключён). Почти все light leaks / film grain / lens flares там Restricted.
  **Важно (проверка лицензий 24.10):** User Terms Mixkit (разд. 9) запрещают массовое скачивание скриптами и ботами и перегрузку серверов, разд. 11 позволяет прекратить лицензию. 88 файлов Mixkit в библиотеке скачаны скриптом, поэтому с 24.10 к mixkit.co скриптами не обращаемся. **Решение владельца 24.10 (вечер):** ручное перекачивание отменено — все 88 файлов перенесены в `03_Assets/_quarantine/mixkit/` и заменены (60 SFX Freesound CC0, 8 треков Kevin MacLeod CC BY 4.0, 19 клипов Pixabay; 1 переход — кодом). Проверка — `08_QA_Reports/MIXKIT_REPLACEMENT_QA.md`.
- Wikimedia API: нужен описательный User-Agent и паузы, иначе 429.
- Google Flow / Gemini / Veo — только через аккаунт владельца, вручную; API-ключа Gemini в проектах нет. Правило владельца: AI-кадры только в 4–6 ключевых моментах, никаких пакетов.

### 2.6 Лицензии и юридические риски
- **Remotion License:** бесплатна для физлиц и компаний ≤ 3 сотрудников; иначе нужна Company License. Почтовый домен владельца корпоративный (listgroup.am), поэтому право на бесплатную лицензию нужно подтвердить.
- **FREE-key SFX в существующих kits.** 9 файлов `*_el.wav` и `crowd_cheer_short.wav` сделаны в volcano FREE-ключом ElevenLabs (некоммерческие). Их скопировали во все последующие kits (rabbits, yellow-fleet, pig-war/short3, football-222, ai-farm-girl) с тем же sha256, а в `index.json` они ошибочно помечены `procedural`. `crowd_cheer_short` реально звучит в сданных **ai-farm-girl** (events.ts, beat «crowd») и **yellow-fleet**. В новую библиотеку они не перенесены; замена — `03_Assets/Sound_Effects/crowd_reaction/sfx_crowd_ovation_small_freesound_32260.wav` (Freesound CC0; прежний файл Mixkit с 24.10 в карантине).
- В index.json старых kits у записей Freesound/Kenney пустое поле license; лицензии лежат только в CREDITS.md (pig-war/short3) и meta.json. В новой библиотеке license есть в каждой записи.
- `ai-farm-girl/short/public/memes` (cj, meme_man.png, stonks.jpg, travolta) и `public/sfx/cj_*.wav` — копирайтные мемы; владелец принял риск Content ID только для этого Short. Кроме claim возможны ручная жалоба и **страйк** (3 за 90 дней = удаление канала), а при монетизации такой Short считается «неоригинальным» и не участвует в revenue sharing. В библиотеке их нет (только каталог).
- **Проверка лицензий 24.10** (`08_QA_Reports/SETUP_VERIFICATION_license.md`): 2 файла перенесены в `03_Assets/_quarantine/` (Baker 1946 — копия из коммерческой документалки; Rolling eyes — CC BY-SA + личные права). Американские немые фильмы 1920-х в Германии, вероятно, ещё охраняются (соглашение США–Германия 1892 г.), поэтому на немецких каналах их не используем без решения владельца.
- Музыка `music_calm` и `volcano/music_candidates` — YouTube Audio Library: разрешена на YouTube; распространять вне YouTube или выдавать за CC нельзя. Тип лицензии каждого трека перепроверить в Studio (логин владельца).

---

## 3. Рекомендуемый workflow

Строим поверх существующего пайплайна, ничего не заменяем.

1. **Шаблон.** Собрать в `SHORTS_PRODUCTION/04_Templates/remotion_short` канонический kit из `ai-farm-girl/short`: Root/Short/scenes, `events.ts`, `remotion.config.ts` (jpeg q94, CRF 16, angle) и tools check.mjs, mix.py, render.mjs, srt.py, stills.mjs, sheet.py. Добавить transition engine и draw/chars из pig-war/short3, `vox.tsx` из football-222, QA-инструменты dupes.py + ocr.swift, blinks.py, cut_frames.py и копию measure.py. `node_modules` — symlink на `/Users/khorengrigoryan/shorts/atlas-ape/volcano/short/node_modules` (все @remotion/* на одной версии 4.0.535). **Собран 24.10:** `04_Templates/remotion_short` (`new_project.sh`, все настройки в `short/project.json`, валидатор `check.mjs` с порогами уровня и лицензионными шлюзами, локальные OFL-шрифты, `final_pass.sh`, `qa.sh`). Проверен на демо-VO: tsc, check.mjs, align, mix (−14.0 LUFS), рендер 11 s за 27 s, финальный проход (BT.709, keyframe каждые 0.5 s, moov перед mdat), srt, QA. Подробно — `04_Templates/remotion_short/README.md` и `08_QA_Reports/SETUP_VERIFICATION.md`.
2. **Текст.** `FACTS.md` → `SCRIPT.md` (строка 1 = ставки или абсурдное действие, без спойлера; твист на 35–55 % длины (с 25.10: R12, G2); без смертей родственников) → VO ElevenLabs **PAID** → `align.py` (whisper large-v3-turbo + waveform) → `data/words.json` = единые часы монтажа.
3. **Shots.** Одно визуальное событие на фразу, ничего статичного дольше 2–2.5 с, motion в секунде 0–1 ≥ 20 (viral-медиана 23.6). Кадр 0 — живое существо и абсурдное действие крупно, в движении; не карта и не дата. Atlas — только реакция (из рига владельца или его Gemini-карточек), не в первые секунды. Текст не повторяет голос; крупный текст с обводкой и scrim, без наклона, белый + золото. AI-кадры — только в 4–6 моментах.
4. **Ассеты.** Брать только из `03_Assets` (каталог — `ASSET_LIBRARY.md`). При сборке копировать нужные файлы в `public/` проекта; SFX — плоско в `public/sfx/` + запись в `index.json` (схема kits + license/attribution). Шрифты — локальные OFL из `03_Assets/Fonts`. Каждый использованный файл — строка в `CREDITS.md` проекта; CC BY — строка в описании ролика.
5. **Сборка.** `npx tsc --noEmit && node tools/check.mjs && /usr/bin/python3 tools/mix.py && CONC=3 node tools/render.mjs && /usr/bin/python3 tools/srt.py`. mix.py: −14 LUFS, −1.5 dBTP, sidechain-ducking музыки голосом. 3D-вставки — Blender через `run.sh` (один GPU-рендер за раз); Atlas — orangutan export → `atlas_webp.py`. LUT при необходимости — ffmpeg lut3d после рендера.
6. **QA** (отчёт `08_QA_Reports/<slug>_QA.md` + JSON замеров; полный чек-лист — `SHORTS_EDITING_STANDARD.md`, 9E): measure.py (без -I), dupes.py + OCR, blinks.py, cut_frames.py, ebur128, ffprobe-спека, сверка CREDITS, safe zone на контрольных кадрах, проверка на телефоне через private/unlisted.
7. **Экспорт** в `06_Exports/<slug>/`: mp4 + srt (en и др.) + contact_sheet + CREDITS.md + YOUTUBE.md; обложка в `07_Thumbnails_Covers/`. Профиль по официальной странице YouTube (https://support.google.com/youtube/answer/1722171): MP4, 1080×1920, H.264 High, yuv420p, progressive, 2 B-frames, closed GOP = fps/2, BT.709 (limited range), AAC-LC 48 kHz stereo 384 kbps, moov в начале, без edit lists; Shorts загружаются максимум в 1080p (https://support.google.com/youtube/answer/10059070). Наши kits рендерят **60 fps** → `-g 30`, ориентир YouTube 12 Mbps, у нас CRF 16 с потолком 24 Mbps. Финальный проход (вариант 30 fps проверен при исследовании; этот 60 fps вариант проверен 24.10 на тестовом клипе в ffmpeg 9.0.1: High, yuv420p, теги bt709/tv, keyframe каждые 30 кадров, 0 атомов elst, moov перед mdat):
   ```
   ffmpeg -i master.mp4 -i mix.wav -map 0:v -map 1:a \
     -vf "setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709,format=yuv420p" \
     -c:v libx264 -profile:v high -preset slow -crf 16 -maxrate 24M -bufsize 48M \
     -g 30 -keyint_min 30 -sc_threshold 0 -bf 2 -flags +cgop -x264-params open-gop=0 \
     -c:a aac -b:a 384k -ar 48000 -ac 2 -movflags +faststart+negative_cts_offsets -use_editlist 0 -shortest out_1080x1920.mp4
   ```
   Плюс в `renderMedia` добавить `colorSpace: 'bt709'`. Loudness: официального таргета у YouTube нет; ориентир (неофициально) −14 LUFS integrated, true peak ≤ −1 dBTP. Длинные рендеры — от сети; temp-бандлы удалять после рендера (render.mjs это делает).
8. **Публикация** (только владелец, YouTube Studio на компьютере): загрузить Private; своя обложка 9:16 из `07_Thumbnails_Covers/` (нужен только подтверждённый аккаунт, YPP не нужен; answer/72431); дождаться Checks (сейчас проверка copyright; оценка ad suitability — только после вступления в YPP); ответить на «AI use» — **Yes обязательно**, если есть фотореалистичные Flow/Veo-кадры с реальными людьми, событиями или местами (answer/14328491); затем публиковать. Хронометраж по умолчанию ≤ 59 с: Short длиннее 60 с с любым claim блокируется по всему миру (https://support.google.com/youtube/answer/15424877).

---

## 4. Что Claude может делать сам

- Писать и править Remotion-композиции (React/TS, three.js, skia), запускать tsc, check.mjs, stills, contact sheets и чанковый render.mjs. Финальный экспорт по профилю выше.
- ffmpeg: транскод, ProRes/HEVC/VideoToolbox, двухпроходный loudnorm до −14 LUFS / −1 dBTP с проверкой ebur128, sidechain ducking, LUT .cube (lut3d), chroma/color key, xfade, zoompan, minterpolate, scene/freeze/black/silence detect, мультиплексирование SRT.
- Blender headless (bpy): сцены, Cycles на Metal GPU, импорт glTF/FBX/SVG, DEM-рельефы, MPFB-люди, рендер кадров/видео с lock через run.sh.
- Пословный тайминг VO через whisper-cli (Metal, large-v3-turbo) + waveform (align.py), генерация SRT и переводов (srt.py).
- Генерировать VO и SFX через ElevenLabs API скриптами с **PAID**-ключом, не печатая его (тратит кредиты владельца, как и сейчас).
- Процедурный синтез SFX (`tools/sfx.py`, numpy/scipy) без лицензионных ограничений.
- Скачивать PD/CC0/CC BY/CC BY-SA ассеты без логина (постоянное разрешение от 19.10): Commons API (описательный UA), Openverse API, Freesound HQ previews, Kenney, OpenGameArt, Poly Haven, ambientCG, archive.org, LoC, NASA, Google Fonts, incompetech/FMA (с проверкой лицензии каждого трека). **Mixkit — нет:** их User Terms запрещают скачивание скриптами, ассеты Mixkit скачивает только владелец вручную. Проверять ffprobe / file / unzip -l / fc-scan, считать sha256, вести CREDITS и логи.
- Вырезать фон (rembg: birefnet/u2net), OpenCV, Pillow, sips, cwebp: фото-карточки, стикеры, текстуры.
- QA: measure.py, check.mjs (события на словах, паузы ≤ 2.5 с, числа из FACTS.md, credits), dupes.py + Vision OCR, blinks.py, cut_frames.py, ffprobe-спека.
- Анимировать Atlas через orangutan rig (JSON-сцены, Rhubarb, export с альфой) строго из арта владельца; `npm test`/qa проверяют целостность.
- Вести каталог `03_Assets` (index.json, лицензионные заметки, логи).
- Ставить npm-пакеты в новый шаблон в `04_Templates` (например @remotion/transitions, motion-blur, layout-utils, lottie **@4.0.535**), не меняя существующие kits и общий node_modules.

## 5. Что нужно от владельца

| # | Вопрос | Варианты | Срочность |
|---|---|---|---|
| 1 | **FREE-key SFX в сданных роликах.** `crowd_cheer_short.wav` (ElevenLabs FREE, некоммерческий) звучит в ai-farm-girl и yellow-fleet (загружен 21.10); ещё 9 `*_el.wav` лежат во всех kits с меткой `procedural`, по проверке лицензий 8 из них звучат в сданном Volcano. Бесплатный план — некоммерческий, апгрейд старые генерации не перелицензирует. | **Решено 24.10:** вариант (б) — ролики оставить, при вступлении в YPP рекламу на Volcano, Yellow Fleet и AI farm girl не включать. В новых роликах FREE-key звуки запрещены (`check.mjs`). | закрыто |
| 2 | ~~**Remotion License.**~~ **Решено 24.10:** канал ведёт частное лицо → бесплатная лицензия Remotion подходит. | — | закрыто |
| 3 | **Ручные загрузки** с Pexels, Sonniss, Uppbeat, Zapsplat, LottieFiles, YouTube Audio Library (Pixabay фото/видео и оригиналы Freesound с 24.10 идут через API — раздел 0.1). **Mixkit — не используем** (решение 24.10: 88 файлов в карантине и заменены, ручное перекачивание отменено, см. `08_QA_Reports/MIXKIT_REPLACEMENT_QA.md`). | Владелец скачивает по URL из каталога «manual» (`ASSET_LIBRARY.md`) в `01_Input`; или сам заводит бесплатные API-ключи и кладёт их в `SHORTS_PRODUCTION/.env.assets` (Claude аккаунты не создаёт). **Pixabay — ключ получен 24.10, работает.** Pexels и др. — ждём. | средняя |
| 4 | **YouTube Audio Library.** Сверить у треков `music_calm` и `music_candidates` колонку «License type» (нужна ли атрибуция); докачивать новые треки. | Один раз в Studio → Аудиотека. Для Frame-Dragging атрибуция не нужна (записано в прошлых CREDITS). | средняя |
| 5 | **Google Flow / Gemini / Veo.** Кадры только из аккаунта владельца, 4–6 ключевых моментов на ролик. | Claude готовит промпты и место в монтаже; генерирует владелец. | по проекту |
| 6 | ~~**ffmpeg-full**~~ — **установлен 24.10** с разрешения владельца вместе с пакетами 1–3 (раздел 0). | — | закрыто |
| 7 | **GUI-монтажка** (DaVinci Resolve free и т.п.) — только если владелец хочет сам править цвет/звук. Нужны Apple ID или регистрационная форма и EULA. | Ставить / не ставить. Claude ею не управляет. | низкая |
| 8 | **Копирайтные мемы и кадры фильмов** (Stonks, Confused Travolta, CJ и т.п.). | По умолчанию никогда. Только письменное решение владельца на конкретный ролик: риск не только Content ID, но и страйка (3 за 90 дней = удаление канала) и исключения «неоригинального» Short из revenue sharing. В библиотеке их нет. | по проекту |
| 11 | **Немецкие каналы и PD-фильмы США 1920-х** (Ллойд, Китон). | В Германии, вероятно, ещё охраняются (договор 1892 г.): не использовать / решать по каждому ролику. | по проекту |
| 12 | **Доход от Shorts с 01.02.2027** требует ≥ 10 млн квалифицированных просмотров Shorts за 90 дней (answer/12504220). | Пересчитать планы монетизации канала; сейчас ≈ 3,8 тыс. просмотров за 28 дней. | низкая |
| 9 | **Загрузка на YouTube**, «Altered or synthetic content», обложки и заголовки. | YouTube Studio владельца. | каждый ролик |
| 10 | **Чистка диска** (113 старых Remotion-бандлов 499 MB в temp; `out/chunks` и кадры pig-war 21 GB и volcano 17 GB) и питание от сети перед длинными рендерами. | Разрешить чистку / оставить. | низкая |

## 6. Какие программы и разрешения реально нужны

| Что | Нужно? | Зачем | Кто и как | Цена |
|---|---|---|---|---|
| Remotion 4.0.535, Node 25, ffmpeg 9.0.1, Blender 5.2.2, whisper-cli, Python 3.9 + numpy/opencv/rembg, rhubarb, yt-dlp | **Да, уже стоит** | Весь конвейер | — | $0 |
| Подтверждение права на Free License Remotion | **Да** | Юридическая чистота `npx remotion render` | Владелец | $0, иначе Company License |
| Доступ к YouTube Studio | **Да** (только владелец) | Загрузка, Checks, AI-раскрытие, обложки, Audio Library | Владелец | $0 |
| Аккаунт Google Flow/Gemini | Да, как сейчас | 4–6 AI-кадров на ролик | Владелец | как сейчас |
| ElevenLabs PAID Starter | Да, как сейчас | VO и SFX для коммерческих роликов | Ключ уже есть | как сейчас |
| npm-пакеты @remotion/transitions, lottie, motion-blur, gif, layout-utils @4.0.535 | **Установлены 24.10** (overlay `~/shorts/tools/remotion_nm`) | Lottie-эмодзи, готовые переходы, шлейф | — | $0 (MIT) |
| ffmpeg-full 9.0.2, rubberband, auto-editor, mediainfo, librsvg, uv, DeepFilterNet, RIFE, Real-ESRGAN, py312 (torch, SAM 2, Demucs, librosa, PySceneDetect, MediaPipe, OpenCV contrib) | **Установлены 24.10** (раздел 0) | Работа с исходным видео и тяжёлая обработка | — | $0 |
| Бесплатные API-ключи Pixabay / Pexels | Опционально | Автоматическая загрузка с этих стоков | Владелец создаёт аккаунт и кладёт ключ в `.env` | $0 |
| DaVinci Resolve 21.1.1 free | Опционально | Ручной цветокор/звук владельцем | Владелец (Mac App Store, Apple ID) | $0 |
| DaVinci Resolve Studio, Premiere, After Effects, Final Cut, CapCut Pro | **Нет** | Не дают выигрыша для кодового конвейера (разбор — `SOFTWARE_DECISION.md`) | — | — |
| Права macOS на управление GUI, браузер агентам | **Нет** | Конвейер работает из терминала | — | — |

Подробное сравнение программ — `SOFTWARE_DECISION.md`. Правила монтажа, спецификация и QA-чек-лист — `SHORTS_EDITING_STANDARD.md`. Библиотека ассетов — `ASSET_LIBRARY.md`, журнал загрузок — `ASSET_DOWNLOAD_LOG.md`, карта системы — `README.md`.
