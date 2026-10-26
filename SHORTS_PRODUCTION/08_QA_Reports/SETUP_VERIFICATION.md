# SETUP_VERIFICATION — итог проверки и исправлений системы SHORTS_PRODUCTION

Дата: **2026-10-24**. Корень: `/Users/khorengrigoryan/shorts/SHORTS_PRODUCTION`.

> **Обновление 24.10 (вечер):** всё, что ниже сказано про ручное перекачивание Mixkit, устарело. Владелец решил заменить файлы: 88 файлов Mixkit перенесены в `03_Assets/_quarantine/mixkit/` и заменены. Проверка замены — `08_QA_Reports/MIXKIT_REPLACEMENT_QA.md`.
Этот отчёт сводит две независимые проверки и то, что по ним исправлено:
- `08_QA_Reports/SETUP_VERIFICATION_disk.md` — сверка диска, логов и документов (вердикт: PASS с мелкими замечаниями);
- `08_QA_Reports/SETUP_VERIFICATION_license.md` — повторная проверка лицензий всех 24 источников и правил YouTube (1 high, 9 medium).

Всё ниже перепроверено после исправлений скриптом `final_verify.py` (рабочая папка вне проекта:
`/private/tmp/claude-501/-Users-khorengrigoryan-shorts/39eead59-aa4a-4c21-bbb2-8ef756811d60/scratchpad/work_fix/`). Это рабочая проверка,
а не юридическая консультация.

## 0. Вердикт

**PASS.** Библиотека, логи и документы совпадают с диском до байта и sha256. Два спорных файла перенесены в карантин (ничего не удалено).
Все high- и medium-замечания по документам исправлены, правила YouTube сверены с официальными страницами (перечитаны в этот же день).
Шаблон `04_Templates/remotion_short` собран и проверен полным прогоном: от выравнивания VO до финального энкода и QA.
Главное, что остаётся за владельцем: **ручное перекачивание файлов Mixkit перед публикацией** (high) и решения по уже сданным роликам
с FREE-ключом ElevenLabs и копирайтными мемами.


> **Поправка 24.10, основная сессия (после отчёта fix-агента).** Ещё два клипа перенесены в `03_Assets/_quarantine/Cinematic_Effects/pd_film_inserts/`:
> `pdfilm_lloyd_clock_hang_safety_last_1923_commons.mp4` (587fafb6c6cd) и `pdfilm_crowd_gasps_safety_last_1923_commons.mp4` (bc2d732eb183).
> Причина: копия — рип пиратской группы YIFY с реставрации Criterion; держать такой источник в библиотеке нельзя, даже если сам фильм в PD.
> Итог после поправки: **849 активных ассетов, 4 в карантине**, PD-киновставок **16**. Логи (`memes.json` → `quarantined`), ASSET_LIBRARY, ASSET_DOWNLOAD_LOG,
> MEME_CATALOG и `_quarantine/README.md` обновлены. Цифры в таблицах ниже — состояние до этой поправки.

## 1. Итоговые числа по категориям

Активные ассеты = файлы из записей `downloaded` / `generated_selfmade` логов (папки Kenney — по пофайловому манифесту).
«Служебные» = README, превью, index.json, CREDITS, каталоги, лицензионные заметки.

| Папка `03_Assets` | Активных ассетов | MB ассетов | Служебных | Всего файлов | Всего MB |
|---|---:|---:|---:|---:|---:|
| Sound_Effects | 70 | 98.7 | 3 | 73 | 98.7 |
| Music | 13 | 80.6 | 1 | 14 | 80.6 |
| Overlays | 204 | 573.0 | 1 | 205 | 573.0 |
| Transitions | 82 | 151.3 | 1 | 83 | 151.3 |
| Cinematic_Effects | 176 | 100.9 | 1 | 177 | 100.9 |
| Templates_Presets (LUT) | 15 | 14.6 | 2 | 17 | 14.9 |
| Memes_Reactions | 6 | 24.3 | 1 | 7 | 24.3 |
| Fonts | 21 | 3.8 | 2 | 23 | 4.1 |
| Graphics | 244 | 2.7 | 2 | 246 | 3.2 |
| Animations (Lottie) | 20 | 1.5 | 2 | 22 | 1.7 |
| Typography | 0 | 0 | 1 | 1 | 0.01 |
| Motion_Graphics | 0 | 0 | 0 | 0 | 0 (пусто намеренно: motion-графика живёт кодом в шаблоне) |
| Licenses | 0 | 0 | 36 | 36 | 0.08 |
| **_quarantine** | 2 (не использовать) | 9.8 | 1 | 3 | 9.9 |
| **Итого** | **851 активный + 2 в карантине** | **1051.5 + 9.8** | **54** | **907** | **1062.8** |

Записей в логах: **448 активных** (444 файла + 4 папки Kenney-паков с 407 файлами) + **2** в массиве `quarantined` (`memes.json`).
Атрибуция обязательна у **36** активных ассетов (было 37: ушёл CC BY-SA «Rolling eyes»).

Весь проект: 995 файлов, ≈ 1.07 GB (`00_Docs` 6, `02_Research` 6, `03_Assets` 907, `04_Templates` 65, `08_QA_Reports` 12 файлов).
Свободно на диске ≈ 95 GB.

## 2. Что проверено после исправлений

| Проверка | Результат |
|---|---|
| Логи → диск: каждая активная запись (и каждый файл Kenney-манифеста) существует, размер и sha256 совпадают | **851 / 851**, 0 расхождений |
| Карантин: оба файла лежат в `03_Assets/_quarantine/…`, sha256 тот же, по старому пути файлов нет | 2 / 2 |
| Файлы на диске вне логов (кроме служебных) | **0**; служебных 54 (список — `final_verify.json`) |
| `ASSET_LIBRARY.md`: каждый путь `03_Assets/…` (включая развёрнутые шаблоны имён иконок, эмодзи, Lottie) существует | **480 путей, 0 отсутствуют** (единственный шаблон без списка — `Licenses/<source>_LICENSE.md`, это подсказка, не файл) |
| Каждая активная запись логов перечислена в `ASSET_LIBRARY.md` | да, 0 пропусков |
| `ASSET_DOWNLOAD_LOG.md`: каждая строка (446 файлов + 4 папки) — путь, байты, префикс sha256 | **450 / 450** (2 строки карантина — по новому пути); 407 строк приложения A (Kenney) тоже совпали |
| Итоги в README / ASSET_LIBRARY / ASSET_DOWNLOAD_LOG / MEME_CATALOG (851 файл, 1051.5 MB, 18 клипов + 2 в карантине) | совпадают с диском |
| Исполняемые файлы, symlink'и, скрытые файлы в `03_Assets` | нет |
| Изменения в `~/shorts` вне `SHORTS_PRODUCTION` | **0 файлов**. Рендер шаблона записал кэш webpack (175 MB) в общий `volcano/short/node_modules/.cache` — я перенёс его в рабочую папку вне проекта |
| Документы на русском | да (машинные логи JSON — на английском, как и раньше) |

Ранее (и без изменений по этим файлам) проверено агентом verify-disk: 128 аудио/видео декодируются (1 предупреждение — хвостовой тег
Bumblebee, см. 3.3), 388 картинок, 276 SVG без скриптов и внешних ссылок, 20 Lottie, 11 шрифтов, 15 LUT, zip Lucide. Агент verify-license
заново открыл лицензии всех 24 источников: NC / ND / платного / логин-only / Mixkit Restricted среди скачанного нет.

## 3. Карантин (`03_Assets/_quarantine/`, причины — его `README.md`)

Перед переносом обе причины перепроверены по Commons API (extmetadata + вики-текст):

| Файл | Причина | Проверено 24.10 | Замена |
|---|---|---|---|
| `Cinematic_Effects/pd_gov_footage/govpd_atomic_test_baker_1946_commons.mp4` | кадры правительства США (PD), но копия взята из коммерческого документального фильма «Trinity & Beyond» (1995) с его синим грейдом → вероятен матч Content ID; ядерные испытания — чувствительная тема | поля `Credit` и `source` = «Trinity & Beyond: The Atomic Bomb Movie», шаблон `PD-USGov-DOE` | прямая копия NARA / DOE (не скачана) |
| `Memes_Reactions/sarcasm/reaction_rolling_eyes_commons_ccbysa.mp4` | CC BY-SA 3.0 + личные права: обрезка и наложение «поверх кадра» (правило мемов владельца) делают адаптацию, которая сама должна быть BY-SA | `LicenseShortName` CC BY-SA 3.0, `Restrictions: personality`, шаблон `{{Personality rights}}` | Atlas `sarcastic` / `skeptical` / `wink`, рисованная реакция, реакция Mixkit Free |

Записи о файлах не удалены: в `memes.json` они перенесены в массив `quarantined` (новый путь, `original_file`, причина, замена),
в `ASSET_DOWNLOAD_LOG.md` строки помечены «КАРАНТИН», в `ASSET_LIBRARY.md` и `MEME_CATALOG.md` вместо строк стоят пометки о карантине,
строка атрибуции «Rolling eyes» убрана из раздела 14. Папка `Memes_Reactions/sarcasm/` теперь пустая.

### 3.1 Оставлено с ограничениями (записано в логах `usage_restrictions` и в документах)

| Файлы | Ограничение |
|---|---|
| Safety Last! (2 клипа) | копия на Commons — рип YIFY с Blu-ray реставрации Criterion 2013 (риск claim средне-высокий): ≤ 1,5–2 s, только Shorts ≤ 60 s, никогда на обложке и в заголовке, не на немецких каналах |
| Keaton / The General (4 клипа) | не на немецких каналах (в Германии, вероятно, охрана до 2036–2038) |
| Nosferatu (2) | немецкие каналы — только после отдельного решения (реставрация FWMS) |
| Duck and Cover | основание PD исправлено: «вероятно, непродление; основание спорное» (не «работа правительства США»); только лёгкие гэги |
| Artemis II (NASA) | только редакционно, в космической истории; никогда на обложке и в промо; без насмешливых подписей |
| Apollo 17 (320×240) | только маленьким PiP или в рамке ТВ |
| PD-классика (Grieg, Bumblebee, Satie) | риск Content ID поднят до «средний»; только Shorts ≤ 60 s; Bumblebee — чистая копия без хвостового тега, в монетизируемых роликах лучше другой трек (ID3 «ASCAP, BMI», аранжировщик не указан) |
| Все 88 файлов Mixkit | только после ручного перекачивания владельцем (раздел 5) |

### 3.2 Низкие замечания, которые тоже закрыты

- `ENVIRONMENT_AUDIT.md`: 481 фильтр ffmpeg (а не 489: 8 строк — легенда), свободный диск уточнён.
- `visuals.json`: у 4 Kenney-паков `sha256` → `source_zip_sha256` (zip не хранится) + пофайловый манифест `files` (407 файлов; совпадает с приложением A).
- Схемы логов выровнены: ключ `label` везде (было `agent` в visuals.json), пути в `music.json` относительные, у 14 лицензионных текстов в `graphics.json` заполнен `license_url`.
- 3 WAV Mixkit с вырезанной обложкой: в `sfx.json` поле `modification_note` (при ручном перекачивании хранить оригинал байт-в-байт).
- Bumblebee: оригинал не трогали (побайтно = Commons), рецепт чистой копии записан в `usaf_band_LICENSE.md`, `Music/README.md`, `music.json`.
- Нестандартные форматы PD-вставок (17.98 fps, 1472×1072, 1134×1080, 1920×800) — рецепт подгонки в `ASSET_LIBRARY.md` 5.6.
- `SOFTWARE_DECISION.md`: формулировка про Remotion исправлена — Free License покрывает физлицо / компанию ≤ 3 сотрудников, включая автоматизацию.
- Дубликат по sha256 (одинаковый текст Apache-2.0 у эмодзи и Permanent Marker) — не трогали, оба текста нужны рядом со своими ассетами.

## 4. Исправления в документах (high / medium)

| # | Проблема | Что сделано | Файлы |
|---|---|---|---|
| P1 (high) | 88 файлов Mixkit скачаны скриптом; User Terms разд. 9 это запрещают, разд. 11 позволяет прекратить лицензию | честно записан способ получения; правило «никаких скриптовых обращений к mixkit.co»; у каждой записи Mixkit в логах поля `acquisition` и `publish_gate`; реестр ручного перекачивания на 88 строк; QA-пункт L5 и проверка в `check.mjs` шаблона (файл Mixkit без `manual ГГГГ-ММ-ДД` в CREDITS = FAIL) | `Licenses/mixkit_*_LICENSE.md`, 4 лога, `02_Research/download_logs/mixkit_manual_redownload.md`, стандарт 5 и 9E, ENVIRONMENT_AUDIT 2.5 / 4 / 5, ASSET_LIBRARY 0, README |
| P2 | «Свою обложку Short может загрузить только YPP» — неверно | H12 и раздел 6: загрузка в YouTube Studio на компьютере, нужен только подтверждённый аккаунт; 9:16, рекомендуемо 2160×3840, мин. высота 640 px, JPG/PNG ≤ 50 MB; запасной вариант — сильный кадр в 0–3 s; шаг обложки в 9F | стандарт, ENVIRONMENT_AUDIT шаг 8, README |
| P3 | не учтён порог дохода Shorts | раздел 6: с 01.02.2027 доля Creator Pool / Premium — при ≥ 10 млн квалифицированных просмотров Shorts за 90 дней; «неоригинальные» Shorts не засчитываются; пересчёт для канала (3,8 тыс. просмотров за 28 дней → нужен рост ≈ в 800 раз, доход от Shorts в 2027 закладываем как 0) | стандарт 6 и R7, `music.json`, `Music/README.md`, MEME_CATALOG, ENVIRONMENT_AUDIT 5 |
| P4 | противоречие о музыке для Short > 60 s | единое правило: > 60 s — **только YouTube Audio Library** (или своя музыка с подтверждёнными правами); Mixkit, MacLeod, PD-классика — только ≤ 60 s | стандарт 4.5, 5, L4; `Music/README.md`; `incompetech_LICENSE.md`, `mixkit_music_LICENSE.md`; ASSET_LIBRARY 2; `music.json` |
| P5 | R8 делал обязательное AI-раскрытие выбором | R8: фотореалистичный AI с реальным человеком, событием или местом → Yes обязательно; владелец решает только пограничные случаи; QA L7 | стандарт R8, 6, 9E; ENVIRONMENT_AUDIT шаг 8; EDIT_PLAN шаблона |
| P6 | риск копирайтных мемов описан неполно | добавлены: страйки (3 за 90 дней = удаление канала), исключение «неоригинальных» Shorts из revenue sharing, «зелёные» копии = перезаливы, yt-dlp нарушает ToS YouTube; по умолчанию — никогда | стандарт R7, 4.3 п. 9, раздел 6; MEME_CATALOG п. 7 и раздел 2; ENVIRONMENT_AUDIT 2.6 и 5 |
| P7 | «ЕС/UK считают американские фильмы PD» — неверно для Германии | исключение «Германия» (договор 1892 г., OLG Frankfurt 2003) с оценкой сроков; запрет для немецких каналов без решения; QA L6 и проверка `channel` в `check.mjs` | `us_public_domain_films_LICENSE.md`, `memes.json` (`pd_basis`), стандарт 4.3 п. 9 и 5, MEME_CATALOG, ASSET_LIBRARY |
| — | Safety Last!: провенанс YIFY/Criterion | записан в `memes.json` (`copy_provenance`, `youtube_risk`, `usage_restrictions`), MEME_CATALOG, лицензионной заметке, ASSET_LIBRARY | там же |
| — | Artemis II: действующие сотрудники и инсигнии NASA | только редакционно, в космическом контексте; замены в MEME_CATALOG (Success Kid, DiCaprio toast) больше не ведут на этот клип вне космоса | `nasa_LICENSE.md`, MEME_CATALOG, `memes.json`, ASSET_LIBRARY, стандарт 5 |
| — | шаблон `04_Templates` пуст | собран и проверен (раздел 6) | `04_Templates/remotion_short/`, README, ENVIRONMENT_AUDIT, стандарт 2 и 9, SOFTWARE_DECISION, ASSET_LIBRARY 10 |
| low | дата автометок AI «с 05.2026» без источника; «Checks: ad suitability» до YPP | дата убрана (официальная страница её не даёт); 9F: сейчас Checks = copyright, оценка ad suitability — только после YPP | стандарт R8, 9F; ENVIRONMENT_AUDIT шаг 8 |

Официальные страницы, перечитанные при исправлениях (24.10): support.google.com/youtube/answer/72431 (обложки, в т. ч. Shorts),
12504220 (revenue sharing Shorts, порог с 01.02.2027, неоригинальные Shorts), 14328491 (AI-раскрытие и автометки), 57407 (Checks),
2814000 (страйки), Условия использования YouTube (скачивание и автоматический доступ). Версия стандарта поднята до 1.1, журнал
изменений — в конце `SHORTS_EDITING_STANDARD.md`.

## 5. Что остаётся вручную владельцу

1. **Mixkit перед каждой публикацией.** Если в ролик идёт файл Mixkit, владелец скачивает этот же ассет вручную со страницы
   (`02_Research/download_logs/mixkit_manual_redownload.md` — страница и хэш для сверки у каждого из 88 файлов), кладёт в
   `01_Input/mixkit_manual/`, сверяет sha256 и пишет дату. Без даты `check.mjs` шаблона ролик не пропустит.
2. **Уже сданные ролики вне этой системы** (ничего не менялось, только отчёт): `crowd_cheer_short.wav` (FREE-ключ ElevenLabs,
   некоммерческий) в yellow-fleet (загружен 21.10) и ai-farm-girl; 8 `*_el.wav` в сданном Volcano; копирайтные мемы в ai-farm-girl
   (Travolta, CJ, Stonks — возможен страйк, а не только claim). Решение: держать эти ролики вне монетизации или перезалить с заменой.
3. **Загрузка в YouTube Studio:** своя обложка (нужен подтверждённый аккаунт), Checks, ответ на «AI use» по R8, публикация.
4. **Ручные загрузки из каталога «manual»** (`ASSET_LIBRARY.md` 12.A): YouTube Audio Library, Pixabay, Pexels, Freesound-оригиналы и т. д.
5. **Сверить тип лицензии треков `music_calm`** в Studio → Аудиотека (у 5 из 6 не записан).
6. **Подтвердить право на Remotion Free License** (физлицо или компания ≤ 3 сотрудников).
7. **Голос для настоящих роликов** — только ElevenLabs PAID. Демо-голос шаблона (`vo_demo.wav`, macOS `say`) публиковать нельзя:
   системные голоса macOS лицензированы только для личного некоммерческого использования.

## 6. Шаблон `04_Templates/remotion_short` (собран и проверен 24.10)

Состав: копия `ai-farm-girl/short` (Short, gfx, real, vox, Subtitles, tools), движок переходов и `draw.tsx` / `chars.tsx` / `Atlas.tsx`
из `pig-war/short3`, `vox.tsx` (как в football-222), QA-инструменты `align.py`, `dupes.py` + `ocr.swift`, `blinks.py`, `cut_frames.py`,
`measure.py`. Новое: все настройки ролика в `short/project.json`; движок переходов вынесен в `src/engine/transitions.tsx`, биты — в
`src/data/beats.ts` (данные); `check.mjs` с порогами уровня (L1 2.5 / L2 2.0 / L3 1.2 s), проверкой битов и лицензионными шлюзами
(карантин, FREE-key, мемы, Mixkit без ручного перекачивания, немецкий канал, > 60 s, демо-голос); локальные OFL-шрифты Montserrat VF и
Anton (рендер без сети, правило T12); `render.mjs` с BT.709 и AAC 384k; `final_pass.sh` (профиль YouTube); `qa.sh` (QA в
`08_QA_Reports/<slug>/`); `new_project.sh` (копия в `05_Projects/<slug>` + symlink на общий `node_modules`). Исходные kits не менялись.

Прогон на копии, созданной `new_project.sh` во временной папке, демо-VO 10.2 s (macOS `say`):

| Шаг | Результат |
|---|---|
| `new_project.sh` | копия без `node_modules` / `out`, symlink на `volcano/short/node_modules`, slug и имя файла выставлены |
| `check.mjs` без `DEMO_OK` | FAIL «VO is still vo_demo.wav» — защита от публикации демо-голоса работает |
| whisper + `align.py` | 32 / 32 слова совпали с `voiceover.txt` (омофон «comm → calm» из `project.json`); `words.json` идентичен шаблонному |
| `npx tsc --noEmit` | OK (все модули, включая draw / chars / Atlas) |
| `check.mjs` | все проверки пройдены: 15 событий, макс. разрыв 1.57 s (лимит L2 2.0), 13.5 событий / 10 s, 6 битов без дыр. Первый прогон поймал настоящую дыру 2.08 s в финале — добавлено событие |
| `mix.py` | −14.0 LUFS integrated, true peak −5.2 dBTP; музыка (PD Satie) −32.4 LUFS против голоса −16.8 → 15.6 LU под голосом (правило ≥ 12) |
| `render.mjs` (CONC=3) | 664 кадра 1080×1920 60 fps за 27 s, 3 чанка |
| `final_pass.sh` | H.264 High, yuv420p, BT.709 (tv), keyframe каждые 0.5 s, moov перед mdat, AAC-LC 48 kHz stereo (фактический битрейт AAC ≈ 270 kbps при заданных 384k) |
| `srt.py`, `stills.mjs` | 5 реплик; лист кадров каждую секунду — шрифты, субтитры, переходы, loop в норме |
| `qa.sh` | dupes: 0 из 22 кадров с DUP/CLUTTER; grep запрещённых файлов пуст; blinks: 1 пик на 4.83 s — посадка документа (проверено по кадрам, не сбой рендера) и 5 слабых (≤ 0.72) во время рисования обводки |

Демо-ролик — образец API, а не эталон хука: motion 0–1 = 6.4, motion 1–6 = 4.6 при гейтах L2 ≥ 20 / ≥ 10 (плоская рисованная графика,
кадр 0 без живого действия). Для настоящего ролика эти пороги проверяет `qa.sh`.
Доказательства: `08_QA_Reports/template_demo/` (лист кадров, `measure.json`, `spec.txt`, `loudness.txt`, `stems.txt`, `dupes.txt`,
`blinks.txt`, `check.txt`, `timeline.json`). Сам демо-mp4 в проект не копировался (в нём демо-голос macOS).

## 7. Открытые вопросы владельцу

1. FREE-ключ ElevenLabs и копирайтные мемы в уже сданных Volcano / yellow-fleet / ai-farm-girl: держать вне монетизации или перезалить с заменой звука и мемов?
2. Mixkit: перекачивать вручную только по мере использования (как записано) или сразу заменить часть набора файлами из других источников (Kenney, YouTube Audio Library)?
3. Нужна ли замена Baker 1946 прямой копией NARA / DOE, или «взрыв мозга» закрываем баком SLS и Atlas?
4. Немецкие каналы: по умолчанию не использовать американские немые фильмы 1920-х — подтверждаете, или нужна отдельная юридическая проверка?
5. Монетизация Shorts с 01.02.2027 требует ≥ 10 млн просмотров Shorts за 90 дней: пересматриваем план дохода (long-form, другие каналы)?
6. На кого оформлен канал (Remotion Free License: физлицо или компания ≤ 3 человек)?
7. Ставить ли в шаблон отдельный `node_modules` с `@remotion/lottie` и `@remotion/transitions` @4.0.535 (для 20 Lottie-эмодзи), не трогая общий?


**Ответы владельца 24.10 (вечер):** 1 — старые ролики оставить, при вступлении в YPP не монетизировать (Volcano, Yellow Fleet, AI farm girl);
2 — Mixkit заменить источниками с API (Pixabay, Freesound CC0 и др.), файлы Mixkit → карантин; 3 — Baker 1946: замена копией NARA по мере надобности
(решение по умолчанию); 4 — немецкие каналы: американские немые фильмы 1920-х не использовать без проверки по каждому имени (по умолчанию);
5 — порог монетизации 2027 — отметка на будущее; 6 — канал ведёт **частное лицо** → бесплатная лицензия Remotion подходит;
7 — Lottie/transitions установлены в overlay `~/shorts/tools/remotion_nm` (закрыто).

## 8. Файлы, изменённые этим проходом

- Перенесены: 2 файла → `03_Assets/_quarantine/…`; новый `03_Assets/_quarantine/README.md`.
- Логи: `02_Research/download_logs/{sfx,music,visuals,memes,graphics}.json`; новый `mixkit_manual_redownload.md`.
- Документы: `00_Docs/README.md`, `ENVIRONMENT_AUDIT.md`, `SOFTWARE_DECISION.md`, `SHORTS_EDITING_STANDARD.md` (v1.1), `ASSET_LIBRARY.md`, `ASSET_DOWNLOAD_LOG.md`.
- Лицензии и каталоги: `03_Assets/Licenses/{mixkit,mixkit_music,mixkit_video,us_public_domain_films,wikimedia_commons_video,nasa,usaf_band,musopen,incompetech}_LICENSE.md`, `03_Assets/Music/README.md`, `03_Assets/Memes_Reactions/MEME_CATALOG.md`.
- Новое: `04_Templates/remotion_short/` (65 файлов), `08_QA_Reports/template_demo/`, этот отчёт.
- Копии исходных версий документов и логов до правок: `/private/tmp/claude-501/-Users-khorengrigoryan-shorts/39eead59-aa4a-4c21-bbb2-8ef756811d60/scratchpad/work_fix/backup_docs/` и `…/work_fix/*.json`.
