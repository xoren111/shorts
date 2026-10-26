# Выбор монтажного стека — решение

Дата: **2026-10-24**. Цены и версии проверены по официальным страницам (ссылки в разделе 7). Ничего не устанавливалось и не покупалось.

## Решение в двух строках

**Ядро не меняем.** Remotion (React + three.js) остаётся движком монтажа, графики, субтитров и рендера; FFmpeg — сведение, финальный энкод и QA; Blender — 3D-вставки, трекинг и ротоскоп. GUI-монтажка конвейеру не нужна; DaVinci Resolve free — только по желанию владельца для ручных правок. Стоимость стека — **$0** при бесплатной лицензии Remotion (физлицо или компания ≤ 3 человек).

---

## 1. Критерии

1. **Цена и лицензия** для монетизируемого YouTube-канала (включая лицензию на материалы внутри программы).
2. **Качество картинки** (кодеки, цвет, точность кадра).
3. **Динамичный монтаж** — частая смена визуальных событий, переходы, Vox-коллаж.
4. **Motion, маски, трекинг, композитинг.**
5. **Субтитры и типографика** — пословные субтитры, обводка, kinetic type.
6. **Звук** — сведение, ducking, громкость.
7. **Пакетная работа и скорость рендера** на M2 Pro / 16 GB.
8. **Автоматизация / API** — headless, CLI, детерминированный рендер.
9. **Совместимость с Claude** — может ли Claude вести монтаж из терминала без GUI.
10. **Шаблоны и переиспользование** между роликами.

## 2. Сводная таблица

Оценки по отдельным критериям (1–10) — моя сводка описаний из раздела 3; «Claude» и «Итог» — из исследования. Итог — не среднее: главный вес у критериев 8–9, потому что выпуск идёт кодом.

| Кандидат | Версия (24.10.2026) | Установлен | Цена | 1 Цена | 2 Картинка | 3 Монтаж | 4 Маски/трекинг | 5 Текст | 6 Звук | 7 Batch | 8 API | 9 Claude | 10 Шаблоны | **Итог** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Remotion** (+ @remotion/three) | 4.0.538 (у нас 4.0.535) | да | $0 для физлица / ≤ 3 чел.; иначе от $25/мес за сеат или $100/мес Automators | 8 | 9 | 10 | 6 | 10 | 5 | 9 | 10 | 10 | 9 | **9.5** |
| **FFmpeg** (CLI) | 9.0.1 (есть ffmpeg-full 9.0.2) | да | $0, LGPL/GPL | 10 | 10 | 4 | 4 | 1 (5 с ffmpeg-full) | 9 | 10 | 10 | 10 | 7 | **8.5** |
| **Blender** 5.2 LTS (3D + VSE + tracker + compositor) | 5.2.2 LTS | да | $0, GPL | 10 | 10 | 5 | 8 | 4 | 3 | 7 | 9 | 9 | 8 | **8** |
| DaVinci Resolve Studio 21 | 21.1.1 | нет | $295 разово (акция $236; App Store $239.99) | 6 | 10 | 9 | 9 | 7 | 10 | 7 | 7 | 7 | 8 | **7.5** |
| DaVinci Resolve 21 (free) | 21.1.1 | нет | $0, EULA; Apple ID или регистрационная форма | 9 | 9 | 9 | 8 | 5 | 9 | 4 | 1 | 3 | 7 | **6.5** |
| Adobe After Effects | 26.5 | нет | от US$22.99/мес, Adobe ID | 3 | 9 | 5 | 10 | 9 | 2 | 6 | 6 | 6 | 9 | **5.5** |
| Kdenlive / Shotcut (MLT) | Kdenlive 26.08.2, Shotcut 26.9.27, MLT 7.42.0 | нет | $0, GPL / LGPL | 10 | 6 | 6 | 5 | 5 | 5 | 7 | 6 | 6 | 5 | **5** |
| Revideo (форк Motion Canvas) | @revideo/core 0.11.0 | нет | $0, MIT | 9 | 7 | 6 | 4 | 5 | 5 | 8 | 8 | 7 | 6 | **5** |
| Adobe Premiere | 26.x | нет | US$22.99/мес, Adobe ID | 3 | 8 | 9 | 7 | 8 | 8 | 6 | 4 | 4 | 8 | **4.5** |
| Final Cut Pro | 12.4 (нужна macOS 26.6) | нет | $299.99 или Creator Studio $12.99/мес | 5 | 8 | 8 | 6 | 6 | 7 | 5 | 3 | 4 | 7 | **4.5** |
| Python: MoviePy / Manim / auto-editor | 2.2.1 / 0.22.0 / 29.3.1 | нет | $0, MIT / Unlicense | 10 | 4 | 4 | 3 | 5 | 4 | 6 | 9 | 8 | 5 | **4.5** |
| Motion Canvas | 3.17.2 (последний релиз 12.2024) | нет | $0, MIT | 10 | 7 | 5 | 4 | 6 | 2 | 2 | 4 | 5 | 6 | **4** |
| CapCut Desktop | 19.8.1 | нет | freemium; Pro ≈ $19.99/мес (по обзорам) | 2 | 6 | 7 | 5 | 7 | 4 | 1 | 1 | 1 | 4 | **2.5** |
| Natron | 2.5.0 (11.2022) | нет | $0, GPLv2 | 10 | 8 | 1 | 7 | 2 | 1 | 6 | 6 | 4 | 5 | **2.5** |

## 3. Кандидаты по критериям (кратко)

### Remotion — текущее ядро (9.5)
- **Цена/лицензия:** source-available, своя лицензия. Free License — физлица (в том числе коммерческое использование и автоматизация) и организации со штатом ≤ 3 человек, функционал тот же. Иначе Company License: «Remotion for Creators» $25/мес за каждого, кто пишет Remotion-код (в том числе через агентов), или «Remotion for Automators» $0.01 за рендер, минимум $100/мес. Наш скриптовый рендер (`tools/render.mjs`) — это автоматизация, но платный тариф из-за этого **не нужен**: по `LICENSE.md` Remotion Free License покрывает физлицо или компанию ≤ 3 сотрудников, включая коммерческое использование и автоматизацию. Тарифы Creators / Automators важны только тогда, когда нужна Company License. Открытый вопрос — на кого оформлен канал: если его ведут от имени работодателя с > 3 сотрудниками, нужна Company License.
- **Картинка:** детерминированный кадр Chrome/Skia + WebGL, полноценные CSS/SVG, кодеки H.264/H.265/ProRes 4444 с альфой/VP9. Честный motion blur — частично (@remotion/motion-blur), цветокор — LUT/CSS-фильтры.
- **Монтаж:** interpolate/spring, @remotion/transitions плюс собственный движок переходов pig-war/short3, Vox-коллаж football-222; смена события каждые 1–2 с задаётся данными — ложится на правила плотности монтажа.
- **Маски/композитинг:** CSS mask/clip-path, SVG-маски, blend modes, WebGL-шейдеры, 3D через @remotion/three, альфа-видео. Трекинга и ротоскопа нет — трек приносить извне (Blender → JSON).
- **Текст:** лучший вариант: любые веб-шрифты, пословные субтитры по whisper (свой `Subtitles.tsx`), обводка, kinetic type; правило «текст не дважды» проверяет check.mjs.
- **Звук:** точная синхронизация SFX с кадром, кривые громкости; DSP нет — сведение в `tools/mix.py` (ffmpeg).
- **Batch/скорость:** headless CLI/Node API, чанковый параллельный рендер (CONC=2–3), полный перерендер Short ≈ 1 мин, можно перерендерить один чанк (`ONLY=NN`).
- **API:** TSX + JSON props + zod, `npx remotion render/still`, `renderMedia()`/`selectComposition()`, tsc, свои валидаторы. Есть официальные Agent Skills Remotion.
- **Claude:** 10/10 — Claude уже пишет и рендерит эти проекты целиком из терминала.
- **Шаблоны:** компоненты React = kit (Subtitles, Atlas, gfx/draw/real, vox, переходы); Remotion Studio для визуальной подстройки props. С 24.10 kit вынесен в `04_Templates/remotion_short` (новый проект — `new_project.sh <slug>`), проект в проект больше не копируем.

### FFmpeg — сведение, финальный энкод, QA (8.5)
- Бесплатно, LGPL/GPL; выходные видео без ограничений. Эталонные энкодеры (libx264/x265/SVT-AV1, ProRes, VideoToolbox), lut3d, качественный scale — для финального энкода под YouTube 10/10.
- Монтаж: xfade (~50 переходов), zoompan, trim/concat — годится для склеек, не для Vox-монтажа.
- Маски: overlay, alphamerge, chromakey/colorkey, blend, maskedmerge; трекинга нет; vidstab только в ffmpeg-full.
- Текст: в текущей сборке **нет drawtext и libass** — текст только через Remotion.
- Звук — сильная сторона: loudnorm (двухпроходный, −14 LUFS), sidechaincompress, afade/acrossfade, amix; уже в `mix.py`.
- Самый быстрый инструмент стека, полностью CLI, ffprobe для проверки. Claude 10/10.

### Blender 5.2.2 LTS — 3D, трекинг, композитинг (8)
- Бесплатно, GPL; рендеры можно использовать коммерчески.
- Cycles/EEVEE (DEM-ландшафты, лава, объёмы), OpenColorIO/AgX, 32-bit compositor, вывод PNG/EXR и ProRes 4444 с альфой для Remotion — 10/10 для 3D-вставок.
- VSE рабочий, но громоздкий для частого монтажа Shorts (в 5.2 добавлены Compositor effect strips).
- **Единственный установленный инструмент с настоящим трекингом:** camera/object/planar tracking, маски для ротоскопа, node-compositor. Трек экспортируется в JSON для оверлеев Remotion.
- Текст: 3D-текст для «штампов»; пословные субтитры удобнее в Remotion. Звук — без нормализации, сводить в ffmpeg.
- Headless `blender -b file.blend -P script.py -a`, Metal; полный bpy API. Claude 9/10 (отладка 3D требует превью). Atlas — только из авторских слоёв владельца.

### DaVinci Resolve 21 (free) (6.5)
- Бесплатно, проприетарная EULA, коммерческое использование результата разрешено. Скачивание: Mac App Store (2.51 ГБ, Apple ID владельца, без формы) или blackmagicdesign.com (регистрационная форма с личными данными, архив ≈ 3 ГБ). Требования (macOS 15+, Apple Silicon, 16 ГБ для Fusion) машина выполняет.
- Лучший цветокор в классе; free ограничена 8-bit и UHD 60p — для 1080×1920 хватает. Полноценный NLE, Fusion, Fairlight.
- **Главное изменение 2026:** в 21.1 Python-скриптинг, UIManager, Workflow Integrations и встроенный MCP-сервер перенесены в Studio. В free остаётся только интерактивная консоль → Claude управлять free-версией не может; может только готовить импортируемые файлы (ProRes, SRT, FCPXML/OTIO).

### DaVinci Resolve Studio 21 (7.5)
- $295 разово по прейскуранту (сейчас акция $236; в Mac App Store $239.99), обновления бесплатны.
- Плюс к free: 10-bit/120p, temporal и AI noise reduction, Magic Mask (AI-ротоскоп), Voice Isolation, AI-субтитры, External Python/Lua API и нативный MCP-сервер (с 21.1). Claude 7/10: может собирать таймлайн и ставить рендер через MCP/API, но кадр-в-кадр по коду точнее в Remotion; детерминизм ниже.

### Adobe Premiere 26.x (4.5) и After Effects 26.5 (5.5)
- Только подписка: US$22.99/мес за каждое приложение (годовой план с ежемесячной оплатой; Creative Cloud Pro US$69.99/мес), Adobe ID обязателен.
- Premiere — отраслевой NLE, AI Object Masking, пословные captions (26.3); ExtendScript поддерживается до сентября 2026, переход на UXP; настоящего headless-рендера таймлайна нет. Claude 4/10.
- After Effects — лучший 2D motion design, Roto Brush, 3D camera tracker, Mocha; `aerender` CLI даёт headless-рендер, но `.aep` бинарный, UXP для AE всё ещё beta. Claude 6/10. Шаблоны AE дублировали бы то, что уже есть в Remotion.

### Final Cut Pro 12.4 (4.5)
- $299.99 разово или Apple Creator Studio $12.99/мес; Motion и Compressor по $49.99. Требует **macOS 26.6** (у владельца 26.5.2).
- Быстрый ручной монтаж на Apple Silicon, Auto Mask, Generate Captions. Нет headless-рендера и API — только генерация FCPXML для ручного импорта. Claude 4/10.

### CapCut Desktop 19.8.1 (2.5)
- Отпадает из-за **лицензии**, а не качества: по Materials License Agreement обычные материалы — только личное некоммерческое использование; «commercial»-звуки разрешены лишь для публикации на CapCut/TikTok, YouTube в списке нет; извлекать материалы в другие программы нельзя. По ToS ByteDance получает широкую лицензию на загруженный контент.
- Нет API и CLI, закрытый формат проекта. Claude 1/10.

### Kdenlive / Shotcut (MLT) (5)
- Бесплатно, GPL/LGPL. Проект — открытый MLT XML: Claude может генерировать XML и рендерить через `melt` без GUI. Kdenlive: OpenCV-трекер, автосубтитры через Whisper. Но графика заметно слабее Remotion, на Mac больше багов, документация скудная. Claude 6/10.

### Revideo (5) и Motion Canvas (4)
- Оба MIT, Canvas 2D, без 3D. Motion Canvas не выпускает релизов с декабря 2024 и не имеет штатного headless-рендера. Revideo (0.11.0, 07.2026) — живой форк с headless `renderVideo()`, телеметрия PostHog отключается переменной окружения. Экосистема (переходы, 3D, captions) значительно меньше Remotion; переход ничего не даст.

### Python: MoviePy 2.2.1 / Manim 0.22.0 / auto-editor 29.3.1 (4.5)
- Бесплатно, open source. MoviePy медленный и посредственный (TextClip требует ImageMagick, его нет); Manim хорош для математических схем; auto-editor режет тишину в сырой записи.
- **Поправка к исследованию:** системный `/usr/bin/python3` уже имеет numpy/opencv/scipy (user-site), но сами MoviePy/Manim/auto-editor не установлены. Пока не нужны.

### Natron 2.5.0 (2.5)
- Бесплатно, GPLv2, нодовый композитор, но стагнирует с 2022, нативную сборку под Apple Silicon подтвердить не удалось. Не нужен: трекинг и композитинг закрывает Blender.

*Cavalry (Canva) упоминается в источниках с противоречивыми данными о бесплатном Pro и CLI-рендере; проверить не удалось, в сравнение не включён.*

---

## 4. Выбранный основной стек

| Роль | Инструмент | Почему |
|---|---|---|
| Основной движок монтажа, графики, субтитров и рендера | **Remotion 4.0.535** (kits: `ai-farm-girl/short` — новейший; `pig-war/short3` — переходы и рисованная графика; `football-222/short` — Vox-коллаж, check.mjs, render.mjs) | Полная автоматизация Claude, детерминированный headless-рендер ≈ 1 мин на Short, пословные субтитры по whisper, плотный монтаж через данные, 3D через three.js. Уже работает. Следующий шаг — единый шаблон в `04_Templates` со сценарием JSON вместо копирования проектов. |
| Сведение звука, финальный энкод, проверка, метрики | **FFmpeg / ffprobe 9.0.1** (опционально keg-only ffmpeg-full 9.0.2) | loudnorm −14 LUFS, ducking, финальный H.264 под YouTube, ffprobe-спека, contact sheets. Отсутствие drawtext/libass не мешает — текст делает Remotion. |
| 3D-вставки, трекинг и ротоскоп, композитинг | **Blender 5.2.2 LTS** (headless bpy) | Уже используется (DEM-лава, 3D-«штампы», cut-out rig Atlas из авторских слоёв). Единственный установленный инструмент с camera/planar tracking; трек → JSON → оверлеи Remotion; шоты в ProRes 4444/PNG с альфой. |
| Голос и тайминг слов | **ElevenLabs PAID Starter** + **whisper-cli large-v3-turbo** | Существующий конвейер VO → words.json → Remotion. FREE-ключ для коммерческих роликов не использовать. |
| QA и контроль плотности монтажа | `tools/check.mjs` + `~/shorts/atlas-ape/tools/measure.py` (`/usr/bin/python3` без -I) + stills/contact sheets + dupes.py/OCR | Автоматически проверяет правила владельца (нет дублей текста, событие на фразу, motion/s, words/s, hard cuts) до финального рендера. |
| Опциональный GUI для ручных правок владельца | **DaVinci Resolve 21.1.1 free** (Mac App Store, 2.51 ГБ) | Только если владелец хочет сам крутить цвет, подрезать или чистить звук готового рендера. Claude готовит ProRes, SRT, FCPXML/OTIO. Мелкие правки дешевле делать в Remotion Studio (уже есть). |

## 5. Что НЕ ставить сейчас и почему

| Не ставим | Почему |
|---|---|
| DaVinci Resolve **Studio** ($295) | Нужна только ради MCP/Python, Magic Mask, Voice Isolation, AI-субтитров. При ядре на Remotion это дублирование; VO из ElevenLabs и так чистый. Вернуться к вопросу, если владелец захочет ручной монтаж с AI-ротоскопом. |
| Adobe Premiere / After Effects | Подписка US$22.99/мес за каждое, Adobe ID, хрупкая автоматизация (ExtendScript → UXP, у AE UXP в beta), бинарные проекты. Всё, что они дают для наших Shorts, уже есть в Remotion. |
| Final Cut Pro 12.4 | Требует обновить macOS до 26.6, нет headless-рендера и API. |
| CapCut | Лицензия материалов не покрывает монетизируемый YouTube; нет API; ToS даёт ByteDance широкую лицензию на контент. |
| Kdenlive / Shotcut, Revideo, Motion Canvas, Natron, MoviePy/Manim | Не закрывают ни одного пробела, которого не закрывают Remotion + Blender + FFmpeg; часть стагнирует. Manim можно поставить в venv позже, если понадобятся математические схемы. |
| Обновление Remotion 4.0.535 → 4.0.538 в общем `node_modules` | Общий `node_modules` (2.5 GB, `volcano/short`) используют все kits через symlink; обновлять только в новом шаблоне, все @remotion/* на одной версии, после проверки всех kits. |
| @remotion/light-leaks | Пакет под Remotion License, а владелец просил без вспышек/light-leak переходов; засветки как тихая фактура уже есть в `03_Assets/Overlays/light_leaks` (CC BY 3.0). |

## 6. Что требует разрешения или денег владельца

| Пункт | Деньги | Нужно ли сейчас | Что сделать владельцу |
|---|---|---|---|
| **Remotion License** | $0 при физлице / ≤ 3 сотрудниках; иначе Creators $25/мес за сеат или Automators $0.01/рендер (мин. $100/мес) | **Да, подтвердить** | Сообщить, на кого оформлен канал. |
| ffmpeg-full 9.0.2 (Homebrew, keg-only, 47 зависимостей) | $0 | Нет, опционально | Разрешить `brew install ffmpeg-full`, если нужна стабилизация архива (vidstab), ASS-превью, rubberband. |
| DaVinci Resolve 21.1.1 free | $0 | Нет, опционально | Поставить из Mac App Store под своим Apple ID (или через форму на blackmagicdesign.com). |
| DaVinci Resolve Studio | $295 (акция $236, App Store $239.99) | Не рекомендуется | — |
| Remotion 4.0.538 | $0 | Нет | Только для нового шаблона, после проверки. |
| Final Cut Pro / Premiere / After Effects / CapCut Pro | $12.99–$299.99 / US$22.99 мес / ≈ $19.99 мес | Не рекомендуется | — |
| Бесплатные API-ключи Pixabay / Pexels | $0 (нужен аккаунт) | Опционально | Создать аккаунт и положить ключ в `.env` (Claude аккаунты не создаёт). |

## 7. Источники

- Remotion: https://www.remotion.dev/docs/license/faq · https://www.remotion.dev/docs/license · https://www.remotion.dev/docs/ai/skills · https://registry.npmjs.org/remotion · https://github.com/remotion-dev/remotion/releases
- FFmpeg: https://ffmpeg.org/ffmpeg-filters.html · https://formulae.brew.sh/formula/ffmpeg-full · https://formulae.brew.sh/formula/ffmpeg
- Blender: https://developer.blender.org/docs/release_notes/5.2/sequencer/ · https://docs.blender.org/api/5.2/bpy.ops.sequencer.html · https://www.blender.org/about/license/
- DaVinci Resolve: https://www.blackmagicdesign.com/products/davinciresolve · https://www.blackmagicdesign.com/support/content/readme/59dd4eef1f4941c29fb8dc48b33f5c87 · https://www.blackmagicdesign.com/api/support/us/downloads.json · https://apps.apple.com/app/id571213070 · https://apps.apple.com/app/id900392332 · https://digitalproduction.com/2026/09/08/resolve-21-1-adds-mcp-and-finally-gets-presets/ · https://www.cined.com/es/davinci-resolve-21-1-released-ai-assistant-integration-via-mcp-individual-hdr-trims-and-python-scripting-moves-to-studio/
- Adobe: https://www.adobe.com/products/premiere/plans.html · https://ppro-scripting.docsforadobe.dev/ · https://developer.adobe.com/premiere-pro/uxp/ppro_reference · https://www.newsshooter.com/2026/01/20/whats-new-in-adobe-premiere-pro-26-0/ · https://www.adobe.com/products/aftereffects/plans.html · https://ae-scripting.docsforadobe.dev/introduction/changelog/ · https://developer.adobe.com/after-effects/uxp/ · https://ae-plugins.docsforadobe.dev/intro/other-integration-possibilities/
- CapCut: https://sf16-draftcdn-sg.ibytedtos.com/obj/ies-hotsoon-draft-sg/capcut/via_platform_materials_license_agreement_en.html · https://www.capcut.com/help/different-price-for-capcut-mobile-and-desktop · https://apps.apple.com/app/id1500855883 · https://www.techradar.com/pro/popular-video-editing-app-capcut-wants-to-use-any-content-you-produce-for-free-forever-heres-what-you-should-know
- Final Cut Pro: https://www.apple.com/final-cut-pro/ · https://apps.apple.com/app/id424389933
- Kdenlive / Shotcut / MLT: https://kdenlive.org/index.xml · https://kdenlive.org/news/releases/26.04.0/ · https://www.shotcut.org/download/ · https://github.com/mltframework/mlt/releases · https://forum.shotcut.org/t/export-at-the-command-line/44067
- Motion Canvas / Revideo: https://registry.npmjs.org/@motion-canvas%2Fcore · https://github.com/motion-canvas/motion-canvas · https://motioncanvas.io/blog/public-release · https://registry.npmjs.org/@revideo%2Fcore · https://cdn.jsdelivr.net/gh/midrender/revideo@main/README.md
- Python: https://pypi.org/project/moviepy/ · https://pypi.org/project/manim/ · https://pypi.org/project/auto-editor/
- Natron: https://github.com/NatronGitHub/Natron · https://natron.readthedocs.io/en/rb-2.6/maintainers/todo.html
