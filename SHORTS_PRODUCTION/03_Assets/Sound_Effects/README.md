# Sound_Effects: стартовая библиотека SFX (2026-10-24, Mixkit заменён на Freesound в тот же день)

70 файлов, 151.8 МБ: 65 WAV, 4 FLAC, 1 AIFF. Источники: **Freesound** (60 оригиналов через официальный API, CC0 1.0) и **Kenney** (10 файлов, CC0, WAV 48 кГц).
Атрибуция не обязательна ни для одного файла. Коммерческое использование и монетизированный YouTube разрешены.
Кредиты лежат в `CREDITS.md`, лицензии в `../Licenses/`, логи: новые файлы — `../../02_Research/download_logs/freesound.json` (sha256, автор, `replaces_mixkit`, `match_quality`), Kenney — `sfx.json`.

**Mixkit больше нет.** 60 прежних файлов Mixkit были скачаны скриптом вопреки User Terms Mixkit (разд. 9); 24.10 владелец решил заменить их. Они лежат в `03_Assets/_quarantine/mixkit/Sound_Effects/` (не использовать), их записи — в массиве `quarantined` лога `sfx.json`. Каждый новый файл лежит в той же подпапке, что и заменённый, имя — `sfx_<описание>_freesound_<id>.<ext>`.

**Перед первым использованием прослушать.** Звуки выбирали по рейтингу, числу скачиваний, описанию автора и замеру огибающей, без прослушивания. 10 замен частичные: `whoosh_zoom_warp_in`, `riser_reverse_impact`, `riser_wind_rising`, `riser_build_noise_synth`, `glitch_tape_rewind`, `dizzy_whistle_birds`, `typewriter_bell`, `heartbeat_deep_bass`, `heartbeat_97bpm`, `drum_roll_snare` — чем отличаются, написано в `00_Docs/ASSET_LIBRARY.md` (раздел 1) и в поле `match_quality`.
Запасные варианты, если после прослушивания не понравится: настоящий тромбон Benboncan 73581 (CC BY 4.0, нужна атрибуция), записанное быстрое сердцебиение ultraaxvii 533909 (CC0), возврат каретки ramsamba 318686 (CC0), white-noise riser с чистым обрывом deadrobotmusic 555865 (CC0).

## Папки

| папка | файлов | что внутри |
|---|---|---|
| `whoosh/` | 7 | быстрые whoosh/swish (0.7–2.3 с), длинные (3.3 и 7.6 с), warp-in для zoom |
| `impact/` | 6 | кинобум 7.7 с, короткий дизайнерский удар, деревянный thud, stomp, панч, саб-бум |
| `riser/` | 5 | reverse-impact riser (вершина 10.05 с), ветровой подъём, синт-riser 8 с, гитарный reverse-swell с обрывом, тёмный swell |
| `glitch/` | 6 | электрические помехи, digital corruption, глитч-луп заголовка, перемотка ленты, микро-тик 30 мс, data chatter 5 с |
| `ui_pop_click/` | 7 | pop'ы, микро-клик, блипы select, confirm, error |
| `comedic/` | 6 | boing на варгане, swanee whistle вниз и вверх, валторна «вах-вах», «головокружение» с птичками (без удара), record scratch |
| `paper_typing_camera/` | 9 | машинка (очередь 8 с, одна клавиша, звонок без каретки), затвор (AIFF), страница, бумага по столу, сминание, газета, подпись |
| `cash_coin/` | 4 | монеты из руки в руку, мешок денег, «бленк» выигрыша, фишки |
| `crowd_reaction/` | 7 | вздохи (м/ж), смех небольшой толпы и зала бара, овация, хлопки одного человека, толпа со свистом (FLAC 17.8 с) |
| `tension_stinger/` | 6 | басовое сердцебиение, хоррор-стинг, трейлерный braam (FLAC), сердцебиение 97 BPM, тиканье будильника, три дубля дроби |
| `ambience/` | 7 | гул толпы, улица днём, лёгкий дождь, дождь с громом, воющий ветер, лес с птицами, room tone театра (26–90 с) |

## Как использовать в нашем пайплайне (Remotion-киты в `~/shorts/atlas-ape/*/short*/`)

1. Нужный файл копировать в `public/sfx/` своего проекта. Библиотеку целиком в проект не тащить. **Форматы разные** (44.1–96 кГц, 16/24/32-float бит, 4 FLAC, 1 AIFF), а `tools/mix.py` ищет `public/sfx/<name>.wav` — при копировании переводить в WAV 48 кГц / 16 бит: `ffmpeg -i <файл> -ar 48000 -c:a pcm_s16le public/sfx/<name>.wav` (оригинал здесь не трогать).
2. Запись взять из `index.json` этой папки. Формат совпадает с `public/sfx/index.json` китов: `name`, `file`, `duration`, `transient_at`, `description`, `loop` (у файлов Freesound ещё `author`, `source_page`, `format`, `replaces_mixkit`, `match_quality`). При копировании поменять расширение в `file` на `.wav`.
   - `transient_at` — момент пика, то есть точка синхронизации: удар ставить на кадр события. У riser'ов это вершина или обрыв, у whoosh'ей середина пролёта.
   - `onset_at` — когда звук реально начинается. У части whoosh'ей и riser'ов в начале 0.3–0.8 с тишины (room tone театра — 1 с).
   - `bed: true` — амбиенс-подложка. Ни один амбиенс не проверен как бесшовный луп (`loop: false` у всех): склеивать кроссфейдом.
3. Громкость: файлы не нормализованы, пики от −34 до 0 дБFS. Уровни сводит `tools/mix.py` проекта. Амбиенсы класть на −28…−35 LUFS под голос. **Тихие оригиналы — поднять гейн в копии проекта:** `ambience_forest_wind_birds` (пик −32 дБ, среднее −65 дБ: +25–30 дБ), `ambience_room_tone_theatre`, `ambience_crowd_murmur`, `ambience_rain_light`, `whoosh_long_windy`, `riser_wind_rising`, `clock_ticking_close`, `typewriter_typing`, `paper_signing_pen`.
4. Правило Vox-плотности: одно звуковое событие на визуальное событие. Один и тот же whoosh не ставить на каждую склейку подряд, чередовать 2–3 варианта.

## Чего нет и чем закрыть

- **Кассовый аппарат «ча-чинг».** Бесплатного файла с проверенной лицензией не нашлось: на Commons две загрузки с сомнительным происхождением, мы их отклонили.
  Можно взять `~/shorts/atlas-ape/ai-farm-girl/short/public/sfx/cash_register.wav` (ElevenLabs на платном ключе, коммерческое использование ОК).
  Другой вариант: владелец скачивает вручную с Pixabay или из YouTube Audio Library (см. `catalog_only` в логе).
- **Мемные звуки** (vine boom, bruh, цитаты из игр и фильмов) защищены авторским правом. В библиотеку их не кладём.

## Важно про старые SFX в проектах (не трогали, только инвентаризация)

- `crowd_cheer_short.wav` и все `*_el.wav` в `public/sfx` всех Atlas-проектов сгенерированы на **бесплатном** ключе ElevenLabs, то есть **некоммерческие**.
  В более поздних `index.json` они ошибочно помечены как «procedural».
  `crowd_cheer_short` используется в `ai-farm-girl/short` и `yellow-fleet/short*`, а `_el`-файлы в `volcano/short`.
  Замена из библиотеки: `crowd_reaction/sfx_crowd_ovation_small_freesound_32260.wav` и `impact/*`.
- Процедурные SFX (`tools/sfx.py` и др.) во всех проектах синтезированы нами самими, их можно использовать без ограничений.

## Ограничения лицензий

- Freesound CC0 и Kenney CC0: ограничений нет, атрибуция не нужна. Папку всё равно не публикуем целиком и не регистрируем звуки в Content ID на себя (мы не авторы).
- Mixkit: в карантине, не использовать (`03_Assets/_quarantine/README.md`).
