# Библиотека ассетов — индекс

Дата сверки: **2026-10-24**. Корень: `/Users/khorengrigoryan/shorts/SHORTS_PRODUCTION`; все пути ниже — относительно него.
Источник истины — машинные логи `02_Research/download_logs/*.json`: sfx, music, visuals, memes, graphics и логи замен Mixkit `freesound.json` (60 SFX), `music_replacement.json` (8 треков), `pixabay.json` (19 клипов).
Сверка (обновлено 24.10 после карантина Mixkit): в `03_Assets` **994** файла = **848** активных ассетов (все перечислены ниже; 445 записей логов `downloaded` / `generated_selfmade` / `replacements`, из них 4 записи — папки Kenney-паков) + **92** файла в `_quarantine` (88 Mixkit + 4 прочих) и его README + **53** служебных (раздел 11). Все 445 активных записей найдены на диске; sha256 и размер совпали у всех (0 расхождений); ffprobe открыл все 87 файлов-замен; sha256 всех 88 файлов Mixkit после переноса совпал с логом. Вне `_quarantine` файлов Mixkit нет (остались только 3 лицензионные заметки `Licenses/mixkit_*.md` как история).

Добавлено после сверки (24.10, вечер): `03_Assets/Fonts/AlfaSlabOne/` — 2 файла (шрифт + OFL), записи в `graphics.json` и в `ASSET_DOWNLOAD_LOG.md` (№ 286–287); числа сверки выше их не включают.
Лицензионная заметка по каждому источнику — `03_Assets/Licenses/<source>_LICENSE.md`. Журнал загрузок с sha256 и результатами проверки — `00_Docs/ASSET_DOWNLOAD_LOG.md`.

### Итог по категориям
| Категория (папка в 03_Assets) | Файлов | Объём | Источники (файлов) | Нужна атрибуция |
|---|---|---|---|---|
| Sound_Effects | 70 | 151.8 MB | Freesound 60, Kenney 10 | — |
| Music | 13 | 110.9 MB | Incompetech 10, Wikimedia Commons 3 | 10 |
| Overlays | 204 | 317.9 MB | Kenney 178, Pixabay 10, ambientCG 8, Commons / VFX FOOTAGE 7, Poly Haven 1 | 7 |
| Transitions | 81 | 35.1 MB | Kenney 75, Pixabay 4, Commons / VFX FOOTAGE 1, Internet Archive 1 | 2 |
| Cinematic_Effects | 174 | 67.2 MB | Kenney 154, self-made 9, Wikimedia Commons 8, Commons / LoC 1, NASA 1, Pixabay 1 | — |
| Templates_Presets | 15 | 14.6 MB | self-made 10, slay (GitHub) 5 | 5 |
| Memes_Reactions | 6 | 80.2 MB | Pixabay 4, NASA 1, Commons (NASA) 1 | — |
| Fonts | 21 | 3.8 MB | Google Fonts 21 | — |
| Graphics | 244 | 2.7 MB | Lucide 97, Tabler 79, Noto Emoji 56, Openclipart 12 | — |
| Animations | 20 | 1.5 MB | Noto Animated Emoji 20 | 20 |
| **Итого ассетов** | **848** | **785.7 MB** | | **44** |
| _quarantine (не использовать) | 92 | 823.6 MB | Mixkit 88 (`_quarantine/mixkit/`), Wikimedia Commons 4 (Baker 1946, Rolling eyes, 2 × Safety Last!) | — |

## 0. Как пользоваться

1. Ассеты для роликов брать **только отсюда** или из раздела 13 («уже есть в ~/shorts») с указанной там лицензией. Не брать `ai-farm-girl/short/public/memes`, `cj_*.wav` и FREE-key SFX (`*_el.wav` из volcano, `crowd_cheer_short.wav`).
2. Нужный файл копировать в `public/` проекта (`05_Projects/<slug>/short/public/...`). SFX — плоско в `public/sfx/<name>.wav` (FLAC, AIFF, 96 кГц и 32-бит float из библиотеки при копировании перевести в WAV 48 кГц / 16 бит: `ffmpeg -i <файл> -ar 48000 -c:a pcm_s16le public/sfx/<name>.wav`) + запись в `public/sfx/index.json` (поля как в `03_Assets/Sound_Effects/index.json`: name, file, duration, transient_at, onset_at, license, attribution_required…); `tools/mix.py` ищет звук по имени `public/sfx/<name>.wav`.
3. Каждый использованный файл → строка в `CREDITS.md` проекта (источник, лицензия, URL). «Атр. = да» → готовая строка из раздела 14 идёт в описание ролика **до публикации**.
4. **Mixkit не используем (решение владельца 24.10).** 88 файлов Mixkit были скачаны скриптом, а User Terms Mixkit (разд. 9) это запрещают. Все 88 перенесены в `03_Assets/_quarantine/mixkit/<прежний путь>` и заменены лицензированными аналогами из официальных API и прямых загрузок: 60 SFX — Freesound CC0, 8 треков — Kevin MacLeod CC BY 4.0, 19 клипов — Pixabay Content License; 1 переход остался без замены (4.1). Таблицы ниже уже показывают замены; полный список «было → стало» — раздел 15. К mixkit.co скриптами не обращаемся. Библиотеку целиком публично не выкладывать (Pixabay и Freesound-оригиналы тоже нельзя раздавать «как есть» отдельными файлами).
8. Файлы из `03_Assets/_quarantine/` не использовать (причины — его README). Американские немые фильмы 1920-х (Ллойд, Китон) — не на немецких каналах без решения владельца. Ложный claim возможен у любого стока и даже у PD-записей — URL и лицензию держать под рукой для спора.
5. Засветки и film burn — только тихая фактура, не вспышки-переходы (правило владельца: плавные dissolve, без flash/whip/shake).
6. Ни у одного видео нет альфы: оверлей на чёрном → **Screen**, на белом → **Multiply**, на зелёном → **colorkey**. Рецепты для Remotion и ffmpeg — `03_Assets/Overlays/README_visuals.md`.
7. Atlas — только из арта владельца (`~/shorts/orangutan`), только реакция; здесь его нет и не будет.

---

## 1. Sound_Effects — 70 файлов (65 WAV, 4 FLAC, 1 AIFF)
С 24.10: 60 оригиналов Freesound (CC0 1.0, официальный API, без перекодирования; 44.1–96 кГц, шесть WAV — 32-бит float) вместо 60 файлов Mixkit + 10 Kenney (WAV 48 кГц). Совпадение с прежним звуком — в поле `match_quality` лога `freesound.json`; 10 замен частичные (помечены ниже). Звук никто не слушал — выбор по рейтингу, описанию автора и замеру огибающей: **перед первым использованием прослушать**. Тихие файлы (пик ниже −10 дБ: лес с птицами −32 дБ, room tone, толпа, часы, подпись, ветер-riser, длинный whoosh) — поднять гейн в проекте. Запасные варианты после прослушивания: настоящий тромбон Benboncan 73581 (CC BY 4.0, нужна атрибуция), записанное быстрое сердцебиение ultraaxvii 533909 (CC0), возврат каретки ramsamba 318686 (CC0), white-noise riser с чистым обрывом deadrobotmusic 555865 (CC0).
У каждого файла в `03_Assets/Sound_Effects/index.json` есть `transient_at` (пик для синхронизации с кадром) и `onset_at`. Подробности и пробелы — `03_Assets/Sound_Effects/README.md`, кредиты — `03_Assets/Sound_Effects/CREDITS.md`.
**Пробел:** бесплатного «ча-чинг» кассы с проверенной лицензией нет (две загрузки на Commons отклонены как отмывание лицензии). Закрывает существующий `~/shorts/atlas-ape/ai-farm-girl/short/public/sfx/cash_register.wav` (ElevenLabs PAID, коммерция да) или ручная загрузка с Pixabay / YouTube Audio Library.

### 1.1 whoosh — проходы и переходы
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Sound_Effects/whoosh/sfx_whoosh_fast_transition_freesound_169867.wav` | «swoosh» — Halgrimm; 2.32 с, WAV 44.1 кГц / 16 бит, стерео; средний быстрый swoosh, автор делал его именно для переходов. Заменяет `whoosh_fast_transition_mixkit` | [Freesound](https://freesound.org/people/Halgrimm/sounds/169867/) | CC0 1.0 | нет | стандартный быстрый переход между планами, смена карточки |
| `03_Assets/Sound_Effects/whoosh/sfx_whoosh_cinematic_fast_freesound_648729.wav` | «Cinematic Woosh SFX-010.wav» — AudioPapkin; 1.75 с, WAV 96 кГц / 24 бит, стерео; резкий дизайнерский кино-woosh, 96 кГц. Заменяет `whoosh_cinematic_fast_mixkit` | [Freesound](https://freesound.org/people/AudioPapkin/sounds/648729/) | CC0 1.0 | нет | резкий кинематографичный whoosh под punch-переход |
| `03_Assets/Sound_Effects/whoosh/sfx_whoosh_air_soft_freesound_425693.wav` | «Woosh_Low_01.wav» — moogy73; 2.34 с, WAV 44.1 кГц / 16 бит, стерео; мягкий шумовой woosh, сделан для motion graphics. Заменяет `whoosh_air_short_mixkit` | [Freesound](https://freesound.org/people/moogy73/sounds/425693/) | CC0 1.0 | нет | мягкий воздушный проход: выезд подписи, движение камеры по карте |
| `03_Assets/Sound_Effects/whoosh/sfx_swish_quick_accent_freesound_72190.wav` | «whip02.wav» — snowflakes; 0.67 с, WAV 44.1 кГц / 16 бит, стерео; один яркий взмах прутом (запись Zoom H2); короче прежнего (0.67 с против 1.1 с). Заменяет `swish_quick_accent_mixkit` | [Freesound](https://freesound.org/people/snowflakes/sounds/72190/) | CC0 1.0 | нет | короткий swish-акцент на появление стрелки или цифры |
| `03_Assets/Sound_Effects/whoosh/sfx_whoosh_zoom_warp_in_freesound_735062.wav` | «Fast Warp In» — GammaGool; 1.23 с, WAV 48 кГц / 24 бит, стерео; **частичная замена:** быстрый warp-in с металлическим звоном — скорее sci-fi, чем воздушное «засасывание». Заменяет `whoosh_zoom_vacuum_mixkit` | [Freesound](https://freesound.org/people/GammaGool/sounds/735062/) | CC0 1.0 | нет | zoom-in / zoomthru-переход, «влёт» в кадр |
| `03_Assets/Sound_Effects/whoosh/sfx_whoosh_long_windy_freesound_423799.wav` | «Little Whoosh 2» — ch_ase; 3.31 с, WAV 44.1 кГц / 32 бит float, стерео; ветряной whoosh с питч-шифтом; **тихий** (пик −16 дБ) — поднять гейн. Заменяет `whoosh_long_windy_mixkit` | [Freesound](https://freesound.org/people/ch_ase/sounds/423799/) | CC0 1.0 | нет | длинный ветреный проход: пролёт над картой, смена эпохи |
| `03_Assets/Sound_Effects/whoosh/sfx_whoosh_long_dark_tail_freesound_341281.wav` | «TITLEFLIGHT-DARK.wav» — newagesoup; 7.62 с, WAV 48 кГц / 24 бит, стерео; тёмный титульный whoosh с растворяющимся хвостом. Заменяет `whoosh_long_tunnel_reverb_mixkit` | [Freesound](https://freesound.org/people/newagesoup/sounds/341281/) | CC0 1.0 | нет | длинный whoosh с хвостом: интро, большой переход между актами |

### 1.2 impact — удары
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Sound_Effects/impact/sfx_impact_cinematic_boom_freesound_255111.wav` | «Cinematic_Boom_Rhapsodize.wav» — rhapsodize; 7.73 с, WAV 44.1 кГц / 16 бит, стерео; низкий трейлерный бум с долгим резонансом, удар сразу (пик 0.17 с). Заменяет `impact_boom_intro_mixkit` | [Freesound](https://freesound.org/people/rhapsodize/sounds/255111/) | CC0 1.0 | нет | тяжёлый кинобум: ключевая цифра, раскрытие факта |
| `03_Assets/Sound_Effects/impact/sfx_impact_quick_hit_freesound_755054.wav` | «Sound Design Elements Impact SFX PS 017» — AudioPapkin; 1.73 с, WAV 96 кГц / 32 бит float, стерео; короткий дизайнерский удар, пик 0.17 с, 96 кГц. Заменяет `impact_quick_zoom_mixkit` | [Freesound](https://freesound.org/people/AudioPapkin/sounds/755054/) | CC0 1.0 | нет | короткий удар под crash-zoom / punch-in |
| `03_Assets/Sound_Effects/impact/sfx_impact_wood_thud_freesound_447922.wav` | «Thud / Falling on wooden floor / Snapping, breaking neck» — Breviceps; 0.39 с, WAV 44.1 кГц / 16 бит, стерео; сухой глухой удар о деревянный пол (в названии у автора есть и «падение тела», но звук — обычный удар). Заменяет `impact_wood_hard_hit_mixkit` | [Freesound](https://freesound.org/people/Breviceps/sounds/447922/) | CC0 1.0 | нет | сухой деревянный удар: штамп, падение таблички, «бум» по столу |
| `03_Assets/Sound_Effects/impact/sfx_impact_stomp_heavy_freesound_372517.wav` | «BIG_STRUCTURE_FALLING_IMPACT_STOMP.wav» — magejim; 3.61 с, WAV 48 кГц / 24 бит, моно; большой stomp из 7 слоёв, моно; главный удар на 1.19 с — точка синхронизации. Заменяет `impact_stomp_heavy_mixkit` | [Freesound](https://freesound.org/people/magejim/sounds/372517/) | CC0 1.0 | нет | тяжёлый stomp: появление большой надписи или героя, конец фразы-хука |
| `03_Assets/Sound_Effects/impact/impact_punch_heavy_kenney.wav` | «impactPunch_heavy_000.ogg (impact-sounds)», 0.65 с; OGG → WAV 48 kHz | [Kenney](https://kenney.nl/assets/impact-sounds) | CC0 1.0 | нет | тяжёлый удар-панч: печать штампа, удар по карте |
| `03_Assets/Sound_Effects/impact/impact_sub_boom_kenney.wav` | «lowFrequency_explosion_000.ogg (sci-fi-sounds)», 2.00 с; OGG → WAV 48 kHz | [Kenney](https://kenney.nl/assets/sci-fi-sounds) | CC0 1.0 | нет | низкий саб-бум 2 с: подложка под большой удар |

### 1.3 riser — нарастания и swell
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Sound_Effects/riser/sfx_riser_reverse_impact_freesound_244249.wav` | «impact riser 01» — soramoosic; 14.58 с, WAV 44.1 кГц / 16 бит, стерео; **частичная замена:** reverse-impact riser, вершина на 10.05 с, дальше ~1.5 с хвоста (дилей/реверб) вместо жёсткого обрыва → резать на 10.05 с, начало подрезать. Заменяет `riser_reverse_build_hardstop_mixkit` | [Freesound](https://freesound.org/people/soramoosic/sounds/244249/) | CC0 1.0 | нет | reverse-build: точку 10.05 с ставить на кадр reveal |
| `03_Assets/Sound_Effects/riser/sfx_riser_wind_rising_freesound_403003.wav` | «magical rising wind or sea .wav» — martian; 11.43 с, WAV 48 кГц / 24 бит, стерео; **частичная замена:** нарастающий ветер: растёт ~4.5 с, держится до ~9 с, затем гаснет — не сплошное крещендо; **тихий** (пик −15.6 дБ). Заменяет `riser_wind_swell_mixkit` | [Freesound](https://freesound.org/people/martian/sounds/403003/) | CC0 1.0 | нет | ветровое нарастание перед катастрофой или твистом (брать первые ~5 с) |
| `03_Assets/Sound_Effects/riser/sfx_riser_build_noise_synth_freesound_334525.wav` | «rise5.wav» — soneproject; 8.00 с, WAV 44.1 кГц / 32 бит float, стерео; **частичная замена:** синт-шумовой riser, растёт до самого конца (пик 7.95 с); 8 с вместо 12 с и без хора (хорошего CC0-хорового riser нет). Заменяет `riser_tech_choir_mixkit` | [Freesound](https://freesound.org/people/soneproject/sounds/334525/) | CC0 1.0 | нет | нарастание к большому reveal: конец файла = момент раскрытия |
| `03_Assets/Sound_Effects/riser/sfx_swell_reverse_guitar_short_freesound_564442.wav` | «Guitar Swell.wav» — Fester993; 3.06 с, WAV 48 кГц / 24 бит, стерео; реверсный гитарный аккорд Maj7, резко обрывается на 2.98 с; «волшебный» тон. Заменяет `swell_magic_whip_short_mixkit` | [Freesound](https://freesound.org/people/Fester993/sounds/564442/) | CC0 1.0 | нет | короткий reverse-swell с обрывом: быстрый reveal, появление карточки |
| `03_Assets/Sound_Effects/riser/sfx_swell_dark_creepy_whoosh_freesound_840812.wav` | «Creepy Whoosh Subtle» — SoundEffectsForAll; 8.01 с, WAV 48 кГц / 16 бит, стерео; жуткий whoosh: подъём ~1.5 с и длинный хвост до 8 с (та же форма, что у прежнего). Заменяет `swell_dark_sweep_mixkit` | [Freesound](https://freesound.org/people/SoundEffectsForAll/sounds/840812/) | CC0 1.0 | нет | тёмный swell: зловещий переход |

### 1.4 glitch — глитч
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Sound_Effects/glitch/sfx_glitch_static_interference_freesound_347698.wav` | «Electric static interference sound» — dotY21; 2.72 с, WAV 44.1 кГц / 16 бит, стерео; электрические помехи, плотные (среднее −12 дБ); резать по длине. Заменяет `glitch_static_short_mixkit` | [Freesound](https://freesound.org/people/dotY21/sounds/347698/) | CC0 1.0 | нет | короткий статический глитч на смену кадра или ошибку |
| `03_Assets/Sound_Effects/glitch/sfx_glitch_digital_corruption_freesound_348585.wav` | «Glitch Corruption» — dotY21; 1.34 с, WAV 44.1 кГц / 16 бит, стерео; компьютерный глитч-«порча». Заменяет `glitch_digital_break_mixkit` | [Freesound](https://freesound.org/people/dotY21/sounds/348585/) | CC0 1.0 | нет | цифровой break: pixel break-up, AI-reveal |
| `03_Assets/Sound_Effects/glitch/sfx_glitch_text_loop_freesound_350614.wav` | «glitch1.wav» — sandufi; 4.44 с, WAV 44.1 кГц / 16 бит, стерео; глитч-луп для появления заголовка; тихий (пик −12.6 дБ). Заменяет `glitch_intro_text_mixkit` | [Freesound](https://freesound.org/people/sandufi/sounds/350614/) | CC0 1.0 | нет | глитч под появление заголовка |
| `03_Assets/Sound_Effects/glitch/sfx_glitch_tape_rewind_freesound_753653.wav` | «Tape Spinback» — hydroxian; 3.50 с, WAV 44.1 кГц / 32 бит float, стерео; **частичная замена:** настоящая аналоговая перемотка ленты (spinback) вместо sci-fi-глитча; задачу «назад во времени» решает так же. Заменяет `glitch_rewind_transition_mixkit` | [Freesound](https://freesound.org/people/hydroxian/sounds/753653/) | CC0 1.0 | нет | перемотка: «вернёмся назад», флешбэк |
| `03_Assets/Sound_Effects/glitch/glitch_micro_tick_kenney.wav` | «glitch_002.ogg (interface-sounds)», 0.03 с; OGG → WAV 48 kHz | [Kenney](https://kenney.nl/assets/interface-sounds) | CC0 1.0 | нет | микро-глитч 30 мс: на каждый кадр pixel break-up |
| `03_Assets/Sound_Effects/glitch/glitch_data_chatter_kenney.wav` | «computerNoise_000.ogg (sci-fi-sounds)», 5.00 с; OGG → WAV 48 kHz | [Kenney](https://kenney.nl/assets/sci-fi-sounds) | CC0 1.0 | нет | компьютерный шум-болтовня 5 с: экран, данные, AI |

### 1.5 ui_pop_click — UI, pop, клики
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Sound_Effects/ui_pop_click/sfx_pop_light_mouth_freesound_245645.flac` | «Cartoon Pop (Clean)» — unfa; 0.17 с, FLAC 48 кГц / 16 бит, стерео; чистый мультяшный pop ртом, без whoosh-слоя; FLAC 48 кГц. Заменяет `pop_light_whoosh_mixkit` | [Freesound](https://freesound.org/people/unfa/sounds/245645/) | CC0 1.0 | нет | лёгкий pop: появление иконки или стикера |
| `03_Assets/Sound_Effects/ui_pop_click/sfx_pop_hard_lips_freesound_202230.wav` | «Pop sound» — deraj; 0.65 с, WAV 44.1 кГц / 16 бит, моно; плотный pop губами, моно, транзиент на 0.21 с. Заменяет `pop_hard_click_mixkit` | [Freesound](https://freesound.org/people/deraj/sounds/202230/) | CC0 1.0 | нет | плотный pop-клик: стикер, пузырь, бейдж |
| `03_Assets/Sound_Effects/ui_pop_click/click_tiny_kenney.wav` | «click_002.ogg (interface-sounds)», 0.01 с; OGG → WAV 48 kHz | [Kenney](https://kenney.nl/assets/interface-sounds) | CC0 1.0 | нет | микро-клик 10 мс: курсор, тап по кнопке |
| `03_Assets/Sound_Effects/ui_pop_click/pop_drop_soft_kenney.wav` | «drop_002.ogg (interface-sounds)», 0.19 с; OGG → WAV 48 kHz | [Kenney](https://kenney.nl/assets/interface-sounds) | CC0 1.0 | нет | мягкий «дроп»-поп: элемент встаёт на место |
| `03_Assets/Sound_Effects/ui_pop_click/blip_select_kenney.wav` | «select_001.ogg (interface-sounds)», 0.04 с; OGG → WAV 48 kHz | [Kenney](https://kenney.nl/assets/interface-sounds) | CC0 1.0 | нет | UI-блип выбора: подсветка пункта списка |
| `03_Assets/Sound_Effects/ui_pop_click/blip_confirm_kenney.wav` | «confirmation_002.ogg (interface-sounds)», 0.54 с; OGG → WAV 48 kHz | [Kenney](https://kenney.nl/assets/interface-sounds) | CC0 1.0 | нет | подтверждение 0.5 с: «галочка», правильный ответ |
| `03_Assets/Sound_Effects/ui_pop_click/blip_error_kenney.wav` | «error_004.ogg (interface-sounds)», 0.10 с; OGG → WAV 48 kHz | [Kenney](https://kenney.nl/assets/interface-sounds) | CC0 1.0 | нет | короткий error-блип: «неверно», крестик |

### 1.6 comedic — комедийные
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Sound_Effects/comedic/sfx_boing_jaw_harp_freesound_540790.wav` | «Boing 2» — magnuswaker; 1.13 с, WAV 96 кГц / 24 бит, стерео; мультяшный boing на варгане, 96 кГц. Заменяет `boing_hit_mixkit` | [Freesound](https://freesound.org/people/magnuswaker/sounds/540790/) | CC0 1.0 | нет | cartoon boing: отскок, нелепость |
| `03_Assets/Sound_Effects/comedic/sfx_slide_whistle_down_freesound_497093.wav` | «FX swanee whistle down.wav» — v0idation; 1.17 с, WAV 44.1 кГц / 16 бит, стерео; настоящий slide (swanee) whistle вниз; короче прежнего (1.17 с против 2.69 с). Заменяет `slide_whistle_falling_mixkit` | [Freesound](https://freesound.org/people/v0idation/sounds/497093/) | CC0 1.0 | нет | свист падения: провал, падение графика |
| `03_Assets/Sound_Effects/comedic/sfx_slide_whistle_up_freesound_497092.wav` | «FX swanee whistle up.wav» — v0idation; 1.20 с, WAV 44.1 кГц / 16 бит, стерео; тот же swanee whistle вверх. Заменяет `slide_whistle_toy_up_mixkit` | [Freesound](https://freesound.org/people/v0idation/sounds/497092/) | CC0 1.0 | нет | свисток вверх: подскок, «ой» |
| `03_Assets/Sound_Effects/comedic/sfx_horn_wahwah_fail_freesound_362205.wav` | «horn_fail_wahwah_2.wav» — TaranP; 4.28 с, WAV 48 кГц / 16 бит, стерео; настоящая валторна «вах-вах» (фейл); запись тромбона есть только под CC BY (Benboncan, id 73581). Заменяет `trombone_sad_fail_mixkit` | [Freesound](https://freesound.org/people/TaranP/sounds/362205/) | CC0 1.0 | нет | грустный «вах-вах»: фейл, провал плана |
| `03_Assets/Sound_Effects/comedic/sfx_dizzy_whistle_birds_freesound_403002.wav` | «classic dizzy take slide whistle.wav» — martian; 1.08 с, WAV 48 кГц / 24 бит, стерео; **частичная замена:** мультяшный «головокружительный» slide whistle с птичками, но без удара → для «бонка» подложить `sfx_impact_wood_thud_freesound_447922` или boing. Заменяет `bonk_dazzle_birds_mixkit` | [Freesound](https://freesound.org/people/martian/sounds/403002/) | CC0 1.0 | нет | ошеломление после удара: птички вокруг головы |
| `03_Assets/Sound_Effects/comedic/sfx_record_scratch_freesound_431774.flac` | «Record Scratch #1» — musicvision31; 1.88 с, FLAC 96 кГц / 24 бит, стерео; игла по винилу, скретч 0.46–1.05 с; FLAC 96 кГц. Заменяет `record_scratch_freeze_mixkit` | [Freesound](https://freesound.org/people/musicvision31/sounds/431774/) | CC0 1.0 | нет | record scratch: стоп-кадр «да, это я… как я тут оказался» |

### 1.7 paper_typing_camera — бумага, машинка, камера
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Sound_Effects/paper_typing_camera/sfx_typewriter_typing_freesound_204465.wav` | «typewriter at work.wav» — NHumphrey; 8.00 с, WAV 44.1 кГц / 24 бит, стерео; настоящая машинка, непрерывная печать; тихо (пик −11.5 дБ). Заменяет `typewriter_typing_burst_mixkit` | [Freesound](https://freesound.org/people/NHumphrey/sounds/204465/) | CC0 1.0 | нет | очередь печатной машинки: печать заголовка или даты |
| `03_Assets/Sound_Effects/paper_typing_camera/sfx_typewriter_single_key_freesound_380138.wav` | «Typewriter - single key - type 1.wav» — yottasounds; 0.28 с, WAV 96 кГц / 32 бит float, стерео; одиночный удар клавиши классической машинки, 96 кГц. Заменяет `typewriter_single_key_mixkit` | [Freesound](https://freesound.org/people/yottasounds/sounds/380138/) | CC0 1.0 | нет | побуквенная печать (повторять) |
| `03_Assets/Sound_Effects/paper_typing_camera/sfx_typewriter_bell_freesound_318687.wav` | «Typewriter Bell.wav» — ramsamba; 0.89 с, WAV 44.1 кГц / 16 бит, стерео; **частичная замена:** только звонок «дзынь», без возврата каретки (у того же автора отдельно — id 318686). Заменяет `typewriter_return_bell_mixkit` | [Freesound](https://freesound.org/people/ramsamba/sounds/318687/) | CC0 1.0 | нет | конец строки, точка в документе |
| `03_Assets/Sound_Effects/paper_typing_camera/sfx_camera_shutter_dslr_freesound_170229.aiff` | «Camera Shutter» — roachpowder; 0.30 с, AIFF 44.1 кГц / 16 бит, моно; затвор Canon T2i; оригинал AIFF, моно. Заменяет `camera_shutter_click_mixkit` | [Freesound](https://freesound.org/people/roachpowder/sounds/170229/) | CC0 1.0 | нет | щелчок затвора: «фото» в кадре, freeze-frame |
| `03_Assets/Sound_Effects/paper_typing_camera/sfx_paper_page_turn_freesound_346835.wav` | «PageTurn.wav» — yatoimtop; 0.52 с, WAV 48 кГц / 16 бит, моно; перелистывание страницы, моно; тихо (пик −11 дБ). Заменяет `paper_page_turn_big_mixkit` | [Freesound](https://freesound.org/people/yatoimtop/sounds/346835/) | CC0 1.0 | нет | смена главы или года |
| `03_Assets/Sound_Effects/paper_typing_camera/sfx_paper_slide_table_freesound_464302.wav` | «PaperSlide.wav» — eyesonlegs; 1.64 с, WAV 44.1 кГц / 16 бит, моно; бумага скользит по столу, моно. Заменяет `paper_slide_mixkit` | [Freesound](https://freesound.org/people/eyesonlegs/sounds/464302/) | CC0 1.0 | нет | вырезка или карточка въезжает в коллаж |
| `03_Assets/Sound_Effects/paper_typing_camera/sfx_paper_crumple_quick_freesound_398897.wav` | «paper - crumple 02.wav» — Anthousai; 1.39 с, WAV 96 кГц / 24 бит, стерео; сминание бумаги в руке; тихо (пик −10 дБ). Заменяет `paper_crumple_quick_mixkit` | [Freesound](https://freesound.org/people/Anthousai/sounds/398897/) | CC0 1.0 | нет | «план отменён», выброс |
| `03_Assets/Sound_Effects/paper_typing_camera/sfx_paper_newspaper_drop_freesound_67034.wav` | «Newspaper_1.wav» — waterboy920; 0.45 с, WAV 44.1 кГц / 16 бит, стерео; газета (журнал) падает на пол; записано для спектакля. Заменяет `paper_newspaper_drop_mixkit` | [Freesound](https://freesound.org/people/waterboy920/sounds/67034/) | CC0 1.0 | нет | газета падает: появляется заголовок газеты |
| `03_Assets/Sound_Effects/paper_typing_camera/sfx_paper_signing_pen_freesound_326961.wav` | «PEN SIGNATURE SIGNING 2.wav» — ListenTonyBoy; 2.54 с, WAV 48 кГц / 32 бит float, моно; подпись ручкой, моно; тихо (пик −16.7 дБ). Заменяет `paper_signing_pen_mixkit` | [Freesound](https://freesound.org/people/ListenTonyBoy/sounds/326961/) | CC0 1.0 | нет | договор, указ, приказ |

### 1.8 cash_coin — деньги и монеты
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Sound_Effects/cash_coin/sfx_coins_clinking_hands_freesound_336567.wav` | «coins 04.wav» — Anthousai; 1.25 с, WAV 96 кГц / 24 бит, стерео; монеты пересыпают из руки в руку, 96 кГц. Заменяет `coins_clinking_mixkit` | [Freesound](https://freesound.org/people/Anthousai/sounds/336567/) | CC0 1.0 | нет | звон монет: деньги, цена, бюджет |
| `03_Assets/Sound_Effects/cash_coin/sfx_money_bag_freesound_338260.wav` | «Money Bag» — PhilSavlem; 1.72 с, WAV 44.1 кГц / 16 бит, стерео; короткий удар мешка с деньгами, транзиент 0.51 с. Заменяет `money_bag_drop_mixkit` | [Freesound](https://freesound.org/people/PhilSavlem/sounds/338260/) | CC0 1.0 | нет | появилась большая сумма |
| `03_Assets/Sound_Effects/cash_coin/sfx_coin_bling_win_freesound_443334.wav` | «MONEY_001.wav» — rolandseer; 2.11 с, WAV 48 кГц / 16 бит, стерео; дизайнерский «бленк» монеты-выигрыша (автор делал его для своей игры). Заменяет `coin_gold_prize_mixkit` | [Freesound](https://freesound.org/people/rolandseer/sounds/443334/) | CC0 1.0 | нет | прибыль, выигрыш |
| `03_Assets/Sound_Effects/cash_coin/chips_stack_kenney.wav` | «chips-stack-1.ogg (casino-audio)», 0.28 с; OGG → WAV 48 kHz | [Kenney](https://kenney.nl/assets/casino-audio) | CC0 1.0 | нет | стопка фишек/монет: счёт растёт |

### 1.9 crowd_reaction — толпа и реакции
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Sound_Effects/crowd_reaction/sfx_gasp_male_shocked_freesound_677888.wav` | «Man Gasping» — ranman22; 0.66 с, WAV 44.1 кГц / 16 бит, моно; мужской вздох шока, моно. Заменяет `gasp_male_astonished_mixkit` | [Freesound](https://freesound.org/people/ranman22/sounds/677888/) | CC0 1.0 | нет | шокирующая цифра |
| `03_Assets/Sound_Effects/crowd_reaction/sfx_gasp_female_freesound_509883.wav` | «female_gasp.wav» — slamaxu; 1.16 с, WAV 44.1 кГц / 16 бит, стерео; женский вздох; тихо (пик −12.5 дБ). Заменяет `gasp_female_astonished_mixkit` | [Freesound](https://freesound.org/people/slamaxu/sounds/509883/) | CC0 1.0 | нет | женский вздох удивления |
| `03_Assets/Sound_Effects/crowd_reaction/sfx_crowd_laugh_small_freesound_324894.wav` | «Crowd laugh.wav» — deleted_user_2104797; 3.31 с, WAV 48 кГц / 24 бит, моно; настоящий смех небольшой толпы, моно (аккаунт автора удалён, звук остаётся CC0). Заменяет `crowd_laugh_short_mixkit` | [Freesound](https://freesound.org/people/deleted_user_2104797/sounds/324894/) | CC0 1.0 | нет | смех зала: абсурдный факт |
| `03_Assets/Sound_Effects/crowd_reaction/sfx_crowd_laugh_clap_bar_freesound_397034.wav` | «Crowd laughing and clapping inside a bar in Chile (Valparaiso)» — felix.blume; 8.96 с, WAV 48 кГц / 24 бит, стерео; зал бара смеётся и хлопает на импровизации (полевой рекордист felix.blume); есть аплодисменты. Заменяет `crowd_laugh_big_mixkit` | [Freesound](https://freesound.org/people/felix.blume/sounds/397034/) | CC0 1.0 | нет | большой смех зала |
| `03_Assets/Sound_Effects/crowd_reaction/sfx_crowd_ovation_small_freesound_32260.wav` | «smallcrowd.wav» — moxobna; 6.67 с, WAV 44.1 кГц / 16 бит, стерео; бинауральная запись: небольшая толпа ликует и хлопает. Заменяет `crowd_ovation_small_mixkit` | [Freesound](https://freesound.org/people/moxobna/sounds/32260/) | CC0 1.0 | нет | овация: победа, рекорд |
| `03_Assets/Sound_Effects/crowd_reaction/sfx_clap_solo_freesound_151219.wav` | «Solo Clap» — OwlStorm; 3.42 с, WAV 44.1 кГц / 16 бит, стерео; хлопает один человек (медленный саркастичный темп по метаданным не подтвердить — проверить на слух). Заменяет `clap_slow_single_man_mixkit` | [Freesound](https://freesound.org/people/OwlStorm/sounds/151219/) | CC0 1.0 | нет | одинокие хлопки: саркастичная «медленная овация» |
| `03_Assets/Sound_Effects/crowd_reaction/sfx_crowd_cheer_whistle_freesound_453863.flac` | «crowd ext cheering whistling crazy.flac» — kyles; 17.75 с, FLAC 48 кГц / 16 бит, стерео; толпа на улице ликует с громким свистом; FLAC. Заменяет `crowd_cheer_whistle_big_mixkit` | [Freesound](https://freesound.org/people/kyles/sounds/453863/) | CC0 1.0 | нет | ликование со свистом: большой финал |

### 1.10 tension_stinger — напряжение и стингеры
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Sound_Effects/tension_stinger/sfx_heartbeat_deep_bass_freesound_595050.wav` | «Clean Deep Heartbeat.wav» — insaind; 4.94 с, WAV 44.1 кГц / 32 бит float, стерео; **частичная замена:** глубокое басовое сердцебиение — серия ударов, а не один стингер «удар + сердце» (брать первый удар). Заменяет `stinger_deep_heartbeat_impact_mixkit` | [Freesound](https://freesound.org/people/insaind/sounds/595050/) | CC0 1.0 | нет | «и тут…»: один глухой удар |
| `03_Assets/Sound_Effects/tension_stinger/sfx_stinger_horror_stab_freesound_271945.wav` | «Stingers and Stabs 001.wav» — OverlookHotelRecords; 4.00 с, WAV 44.1 кГц / 24 бит, стерео; синтезаторный хоррор-стинг (Korg Triton), удар на 0.31 с. Заменяет `stinger_horror_hit_mixkit` | [Freesound](https://freesound.org/people/OverlookHotelRecords/sounds/271945/) | CC0 1.0 | нет | хоррор-удар: жуткий факт |
| `03_Assets/Sound_Effects/tension_stinger/sfx_stinger_braam_freesound_647712.flac` | «Braam» — unfa; 10.00 с, FLAC 48 кГц / 16 бит, стерео; трейлерный «braam», собран в Ardour из CC0-сэмплов (источники описаны автором); FLAC. Заменяет `stinger_eerie_trailer_horn_mixkit` | [Freesound](https://freesound.org/people/unfa/sounds/647712/) | CC0 1.0 | нет | зловещий трейлерный horn: угроза, война |
| `03_Assets/Sound_Effects/tension_stinger/sfx_heartbeat_97bpm_freesound_688735.wav` | «Heartbeat 97 BPM» — Cloud-10; 9.90 с, WAV 44.1 кГц / 24 бит, стерео; **частичная замена:** сердцебиение из бочки, 97 BPM — только умеренно быстрое; запасной вариант — настоящая запись ultraaxvii, id 533909 (CC0). Заменяет `heartbeat_fast_mixkit` | [Freesound](https://freesound.org/people/Cloud-10/sounds/688735/) | CC0 1.0 | нет | напряжение перед раскрытием, страх |
| `03_Assets/Sound_Effects/tension_stinger/sfx_clock_ticking_close_freesound_408741.wav` | «Alarm clock ticking.wav» — straget; 10.01 с, WAV 48 кГц / 24 бит, стерео; тиканье будильника, микрофоны в ~5 см; тихо (пик −17.8 дБ). Заменяет `clock_tick_tock_close_mixkit` | [Freesound](https://freesound.org/people/straget/sounds/408741/) | CC0 1.0 | нет | обратный отсчёт, «время уходит» |
| `03_Assets/Sound_Effects/tension_stinger/sfx_drum_roll_snare_freesound_111653.wav` | «snare - Premier Artist Maple - loose - buzz roll x3.wav» — bigjoedrummer; 12.57 с, WAV 44.1 кГц / 16 бит, стерео; **частичная замена:** настоящая дробь малого барабана, но три отдельных дубля-крещендо по ~4 с (0–4, 5–9, 9.5–12.5 с), а не одна дробь на 14 с. Заменяет `drum_roll_tension_mixkit` | [Freesound](https://freesound.org/people/bigjoedrummer/sounds/111653/) | CC0 1.0 | нет | подводка к цифре или ответу (взять один дубль) |

### 1.11 ambience — атмосферы
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Sound_Effects/ambience/sfx_ambience_crowd_murmur_freesound_432331.wav` | «Medium Crowd Murmering» — jentlemen; 57.39 с, WAV 44.1 кГц / 16 бит, стерео; гул средней толпы в зале; тихо (пик −18.6 дБ); не бесшовный луп — склеивать кроссфейдом. Заменяет `ambience_crowd_talking_loop_mixkit` | [Freesound](https://freesound.org/people/jentlemen/sounds/432331/) | CC0 1.0 | нет | гул толпы: площадь, рынок, зал |
| `03_Assets/Sound_Effects/ambience/sfx_ambience_city_street_day_freesound_723607.wav` | «Ciudad de Mexico DF Colonia Roma Busy Street traffic urban city ambience Ed Larez VSNR» — visionear; 87.84 с, WAV 48 кГц / 24 бит, стерео; оживлённая дневная улица Мехико; трафик ближе и плотнее, чем «вдали» у прежнего файла. Заменяет `ambience_city_day_urban_mixkit` | [Freesound](https://freesound.org/people/visionear/sounds/723607/) | CC0 1.0 | нет | дневной город: улица, трафик |
| `03_Assets/Sound_Effects/ambience/sfx_ambience_rain_light_freesound_167034.wav` | «Light Rain» — soundrecorder7; 26.32 с, WAV 44.1 кГц / 16 бит, стерео; лёгкий дождь без грома; автор пишет, что подходит для лупа (бесшовность не проверена); короче прежнего (26 с против 39 с). Заменяет `ambience_rain_light_loop_mixkit` | [Freesound](https://freesound.org/people/soundrecorder7/sounds/167034/) | CC0 1.0 | нет | лёгкий дождь, подложка |
| `03_Assets/Sound_Effects/ambience/sfx_ambience_rain_thunder_freesound_237729.wav` | «Rain and Thunder 4» — FlatHill; 32.88 с, WAV 44.1 кГц / 16 бит, стерео; дождь с громом (около 132 тыс. скачиваний, оценка 4.4 из 689). Заменяет `ambience_rain_thunderstorm_mixkit` | [Freesound](https://freesound.org/people/FlatHill/sounds/237729/) | CC0 1.0 | нет | шторм, мрачный исторический момент |
| `03_Assets/Sound_Effects/ambience/sfx_ambience_wind_howl_freesound_117611.wav` | «wind_howl2_stereo.wav» — swiftoid; 36.50 с, WAV 96 кГц / 24 бит, стерео; воющий ветер, 96 кГц (записан у окна, а не на вершине). Заменяет `ambience_wind_mountain_mixkit` | [Freesound](https://freesound.org/people/swiftoid/sounds/117611/) | CC0 1.0 | нет | ветер: горы, пустыня, пустота |
| `03_Assets/Sound_Effects/ambience/sfx_ambience_forest_wind_birds_freesound_288899.wav` | «Rocky Mountain Outdoors: wind and birds» — petebuchwald; 89.72 с, WAV 44.1 кГц / 16 бит, стерео; ветер в сосновом лесу и птицы (Скалистые горы); **очень тихо** (пик −32 дБ, среднее −65 дБ) — нужно +25–30 дБ. Заменяет `ambience_forest_wind_birds_mixkit` | [Freesound](https://freesound.org/people/petebuchwald/sounds/288899/) | CC0 1.0 | нет | лес с ветром и птицами: природа, остров, утро |
| `03_Assets/Sound_Effects/ambience/sfx_ambience_room_tone_theatre_freesound_144042.wav` | «Room_Tone_Ambience_Large_Theatre_Low_Hum.wav» — gchase; 62.00 с, WAV 48 кГц / 24 бит, стерео; room tone большого театра с низким гулом; тихо, как и положено room tone. Заменяет `ambience_room_tone_cinematic_mixkit` | [Freesound](https://freesound.org/people/gchase/sounds/144042/) | CC0 1.0 | нет | тишина помещения под VO, пауза |

---

## 2. Music — 13 треков
Подробный каталог, правила Shorts и советы по миксу — `03_Assets/Music/README.md`.
**Порядок выбора музыки (единое правило с 24.10):** Short > 60 с → **только YouTube Audio Library** (`~/shorts/atlas-ape/music_calm`) или своя музыка с подтверждёнными правами. Все 13 треков этой папки — только в Shorts ≤ 60 с: Kevin MacLeod (10 треков) — только с кредитом в описании ДО публикации (строки — раздел 14.1), PD-классика (риск «средний»: ложные совпадения). 8 треков Mixkit 24.10 заменены треками MacLeod (`02_Research/download_logs/music_replacement.json`: ISRC, sha256, сравнение громкости и тембра); их никто не слушал — перед использованием прослушать и выровнять громкость (Eternal Hope −23.8, Immersed −21.5 LUFS). Short > 60 с с любым claim блокируется по всему миру. Pixabay Music — не брать.

### 2.1 curious_light — любопытство, лёгкость
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Music/curious_light/music_teddy_bear_waltz_kevin_macleod_incompetech_usuan1700064.mp3` | «Teddy Bear Waltz» — Kevin MacLeod; глокеншпиль, флейта, кларнет и струнные; лёгкий и ровный (LRA 3.7); вальс 6/8 вместо ровного минималистичного пульса; на 8.7 дБ тише прежнего; 195 с, -16.7 LUFS. Заменяет «Little Bells» (Diego Nava, Mixkit) | [Incompetech](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700064) | CC BY 4.0 | **да** | завязка «а знаете ли вы», наезды на карту; приседать под голос. Content ID: средний (управляемый) — кредит в описании ДО публикации |
| `03_Assets/Music/curious_light/music_investigations_kevin_macleod_incompetech.mp3` | «Investigations» — Kevin MacLeod; пиццикато, загадочно-юмористический; 94 с, −18.7 LUFS | [Incompetech](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100646) | CC BY 4.0 | **да** | «что-то тут не так»: поиск улик, хитрая завязка перед твистом. Content ID: средний — трек заранее зарегистрирован, кредит в описании ДО публикации |

### 2.2 tension_mystery — напряжение, загадка
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Music/tension_mystery/music_mirage_drone_kevin_macleod_incompetech_usuan1100877.mp3` | «Mirage» — Kevin MacLeod; тёмный синт-дрон без бита, с напряжением; спокойнее и мягче прежнего (без электрогитары); 240 с, -14.7 LUFS. Заменяет «Selpan» (Eugenio Mininni, Mixkit) | [Incompetech](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100877) | CC BY 4.0 | **да** | подложка напряжения под голос: расследование, нарастание катастрофы; легко резать и зацикливать. Content ID: средний (управляемый) — кредит в описании ДО публикации |
| `03_Assets/Music/tension_mystery/music_hall_of_the_mountain_king_grieg_musopen_commons.flac` | Григ, «В пещере горного короля» — Musopen Symphony (Czech National SO); FLAC 48 kHz 24 bit; 154 с, LRA 24.8 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Grieg_-_Peer_Gynt_Suite_No._1,_Op._46_-_IV._In_the_Hall_of_the_Mountain_King_(Musopen_Symphony).flac) | PD (запись и произведение) | нет | монтаж эскалации, комичное нарастание; брать с середины или сжимать. Классика может ловить ложные совпадения Content ID Content ID: **средний** (ложные совпадения), только Shorts ≤ 60 с. |

### 2.3 epic_reveal — раскрытие, масштаб
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Music/epic_reveal/music_americana_orchestral_kevin_macleod_incompetech_usuan1200092.mp3` | «Americana» — Kevin MacLeod; воодушевляющий оркестр: от виолончелей и деревянных к большой меди; ведут оркестр и медь, а не фортепиано; динамичнее (LRA 10.8) — брать участок с медью; 202 с, -16.9 LUFS. Заменяет «Dreaming Big» (Ahjay Stelino, Mixkit) | [Incompetech](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1200092) | CC BY 4.0 | **да** | развязка/payoff «и это сработало» — торжественно, но не мрачно. Content ID: средний (управляемый) — кредит в описании ДО публикации |
| `03_Assets/Music/epic_reveal/music_eternal_hope_piano_kevin_macleod_incompetech_usuan1100238.mp3` | «Eternal Hope» — Kevin MacLeod; медленное светлое нарастание: фортепиано, струнные, валторна, хор; тише и динамичнее прежнего (−23.8 LUFS) — поднять гейн или сжать; 284 с, -23.8 LUFS. Заменяет «Life's a Movie» (Arulo, Mixkit) | [Incompetech](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100238) | CC BY 4.0 | **да** | момент масштаба (большая цифра, общий план), задумчивый финал. Content ID: средний (управляемый) — кредит в описании ДО публикации |

### 2.4 comedic_quirky — комедия, абсурд
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Music/comedic_quirky/music_mischief_maker_kevin_macleod_incompetech_usuan1700009.mp3` | «Mischief Maker» — Kevin MacLeod; пружинистый юмористический трек: бас, ксилофон, цимбалы, ударные; ярче и «взрослее» прежнего; 202 с, -13.4 LUFS. Заменяет «Kidding Around» (Ahjay Stelino, Mixkit) | [Incompetech](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700009) | CC BY 4.0 | **да** | абсурдные моменты истории, хвост реакции Atlas, комичный провал плана. Content ID: средний (управляемый) — кредит в описании ДО публикации |
| `03_Assets/Music/comedic_quirky/music_sneaky_snitch_kevin_macleod_incompetech.mp3` | «Sneaky Snitch» — Kevin MacLeod; крадущийся; 137 с, −17.5 LUFS | [Incompetech](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100772) | CC BY 4.0 | **да** | хитрый план, «ограбление», контрабанда; очень заезженный — редко. Content ID: средний, кредит в описании обязателен |

### 2.5 documentary_neutral — документально, нейтрально (+ ambient bed)
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Music/documentary_neutral/music_immersed_piano_strings_kevin_macleod_incompetech_usuan1600010.mp3` | «Immersed» — Kevin MacLeod; минималистичные фортепиано и струнные, местами дроном; темнее прежнего — больше места голосу; тише, поднять гейн; 249 с, -21.5 LUFS. Заменяет «Forest Mist Whispers» (Alejandro Magaña (A. M.), Mixkit) | [Incompetech](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600010) | CC BY 4.0 | **да** | нейтральная документальная подложка под плотный голос и архив. Content ID: средний (управляемый) — кредит в описании ДО публикации |
| `03_Assets/Music/documentary_neutral/music_soaring_ambient_bed_kevin_macleod_incompetech_usuan1600040.mp3` | «Soaring» — Kevin MacLeod; 6:20 меняющийся синт-пэд без бита, спокойный, с мистическим оттенком; 380 с, -17.4 LUFS. Заменяет «Voxscape» (Eugenio Mininni, Mixkit) | [Incompetech](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600040) | CC BY 4.0 | **да** | ambient bed под карты и 3D-пролёты; резать любые 30–60 с. Content ID: средний (управляемый) — кредит в описании ДО публикации |
| `03_Assets/Music/documentary_neutral/music_gymnopedie_1_satie_alciatore_musopen_commons.ogg` | Сати, «Гимнопедия № 1» — фортепиано Robin Alciatore (Musopen); Ogg Vorbis; 184 с, тихий мастер −25.9 LUFS | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg) | PD (запись и произведение) | нет | грустный или тихий итог, задумчивый финал; перед mix.py поднять гейн Content ID: **средний** (ложные совпадения), только Shorts ≤ 60 с. |

### 2.6 upbeat_energy — энергия, скорость
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Music/upbeat_energy/music_exit_the_premises_kevin_macleod_incompetech_usuan1500029.mp3` | «Exit the Premises» — Kevin MacLeod; напористая электроника с большими барабанами, 128 BPM (dance/chiptune, а не трейлерный брейкбит); почти тот же спектр и плотность ритма; 210 с, -10.6 LUFS. Заменяет «Games Music» (Grigoriy Nuzhny, Mixkit) | [Incompetech](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1500029) | CC BY 4.0 | **да** | быстрый монтаж, погоня, гонка, первые секунды хука. Content ID: средний (управляемый) — кредит в описании ДО публикации |
| `03_Assets/Music/upbeat_energy/music_flight_of_the_bumblebee_usaf_strolling_strings_commons.mp3` | Римский-Корсаков, «Полёт шмеля» — U.S. Air Force Band Strolling Strings (1994); 82 с, −19.3 LUFS | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Flight_of_the_Bumblebee_-_Strolling_Strings_-_United_States_Air_Force_Band.mp3) | PD (US gov + PD-old) | нет | хаос/паника, комичные ускорения «всё сразу». Аранжировщик не указан, в ID3 «ASCAP, BMI» — риск ложного claim Content ID: **средний**, только Shorts ≤ 60 с; в проект — чистая копия без хвостового тега (`ffmpeg -i in.mp3 -map 0:a -c copy -map_metadata -1 out.mp3`); в монетизируемых роликах лучше другой трек, пока аранжировка не подтверждена. |

---

## 3. Overlays — оверлеи
Что уже умеет код kits (Grain, LightLeak, Dust, SpeedLines, Duotone) и что добавляют файлы — `03_Assets/Overlays/README_visuals.md`.

### 3.1 smoke_fog — дым и туман
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Overlays/smoke_fog/overlay_smoke_white_on_black_4k_pixabay_98025.mp4` | клубящийся белый дым на тёмном, заполняет кадр; 4K-горизонталь → вертикальный кроп 1215×2160 без потери; 3840×2160, 25 fps, 15.0 с; автор svetjekolem. Заменяет `overlay_smoke_white_on_black_1080p_mixkit` | [Pixabay #98025](https://pixabay.com/videos/id-98025/) | Pixabay Content License | нет | Screen 20–50 % — атмосфера поверх архива и 3D, война/пожар, загадка |
| `03_Assets/Overlays/smoke_fog/overlay_fog_mist_flowing_4k_pixabay_197704.mp4` | серая полоса тумана плывёт через кадр (сделано как оверлей); медленнее и реже прежнего; 3840×2160, 30 fps, 10.0 с; автор EnchantedStudios. Заменяет `overlay_mist_thick_flowing_1080p_mixkit` | [Pixabay #197704](https://pixabay.com/videos/id-197704/) | Pixabay Content License | нет | Screen: туман, морская или боевая дымка, мягкий «fog wipe» |
| `03_Assets/Overlays/smoke_fog/kenney_smoke_particles_cc0/` | папка: 77 PNG с альфой (`black_smoke/`, `white_puff/`, `explosion/`, `flash/`, `cartoon_puff/`) + License + превью/образец; 80 файлов | [Kenney](https://kenney.nl/assets/smoke-particles) | CC0 1.0 | нет | мультяшные клубы и взрывы для рисованного kit (стиль pig-war/short3); не для реалистичных VFX |

### 3.2 sparks_particles — искры, огонь, частицы
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Overlays/sparks_particles/overlay_flames_embers_on_black_1080p_pixabay_106366.mp4` | оранжевое пламя по низу кадра и летящие угли на чёрном; луп 60 с; 1920×1080, 60 fps, 60.0 с; автор Joe_hackney. Заменяет `overlay_flames_and_sparks_1080p_mixkit` | [Pixabay #106366](https://pixabay.com/videos/id-106366/) | Pixabay Content License | нет | Screen/Add: огонь, взрывы, горящие документы |
| `03_Assets/Overlays/sparks_particles/overlay_fire_sparks_on_black_4k_pixabay_299601.mp4` | оранжевые искры поднимаются снизу на чистом чёрном, к концу гуще; **не вертикаль** (вертикальной версии без AI нет), но в 4K кроп 9:16 = 1215×2160; 3840×2160, 23.976 fps, 22.1 с; автор hari0127sound. Заменяет `overlay_sparks_fire_on_black_vertical_mixkit` | [Pixabay #299601](https://pixabay.com/videos/id-299601/) | Pixabay Content License | нет | Screen на весь кадр Shorts: битва, кузня, вулкан |
| `03_Assets/Overlays/sparks_particles/overlay_embers_particles_on_black_4k_pixabay_45595.mp4` | **частичная замена:** светящиеся угли плывут по всему кадру на чёрном; реже и желтее прежних красных частиц — дублировать слой или утеплить грейд; 3840×2160, 25 fps, 10.0 с; автор Motion_doctor. Заменяет `overlay_embers_lava_particles_1080p_mixkit` | [Pixabay #45595](https://pixabay.com/videos/id-45595/) | Pixabay Content License | нет | Screen: жар, вулкан, «после пожара» |
| `03_Assets/Overlays/sparks_particles/overlay_flames_on_black_4k_pixabay_210799.mp4` | **частичная замена:** языки пламени снизу на чистом чёрном, 4K → кроп 1215×2160; грейд бледный жёлто-зелёный — утеплить к оранжевому в проекте; 3840×2160, 60 fps, 24.5 с; автор Jaisungwani_1. Заменяет `overlay_flames_blazing_on_black_vertical_mixkit` | [Pixabay #210799](https://pixabay.com/videos/id-210799/) | Pixabay Content License | нет | Screen: горящий reveal, огонь под заголовком |
| `03_Assets/Overlays/sparks_particles/kenney_particle_pack_cc0/` | папка: 80 PNG 512 px с альфой + 16 повёрнутых (`png_transparent/`, `rotated/`) + License + превью; 98 файлов | [Kenney](https://kenney.nl/assets/particle-pack) | CC0 1.0 | нет | спрайты искр, звёзд, бликов, дыма, следов — искровые взрывы и блики в Remotion/Blender |

### 3.3 glitch_vhs — глитч и ТВ-помехи
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Overlays/glitch_vhs/overlay_glitch_digital_artifacts_1080p_pixabay_177755.mp4` | **частичная замена:** короткие вспышки цветных блочных глитчей на чёрном, а не сплошной пиксельный шум — брать кадры со вспышкой; немая AAC-дорожка (−91 дБ) — отключить; 1920×1080, 60 fps, 13.4 с; автор OWNFILTERS. Заменяет `overlay_glitch_static_pixel_noise_1080p_mixkit` | [Pixabay #177755](https://pixabay.com/videos/id-177755/) | Pixabay Content License | нет | glitch-cut на 4–8 кадров: «AI / фейк / взлом» |
| `03_Assets/Overlays/glitch_vhs/overlay_tv_static_crt_4k_pixabay_58013.mp4` | настоящие снятые помехи ЭЛТ-телевизора с бегущей полосой; синеватые — обесцветить для ч/б; 3840×2160, 29.97 fps, 30.1 с; автор padrinan. Заменяет `overlay_tv_static_bw_1080p_mixkit` | [Pixabay #58013](https://pixabay.com/videos/id-58013/) | Pixabay Content License | нет | переключение канала, потеря сигнала, ретро-ТВ вставка |

### 3.4 lens_flare_bokeh — боке и грязь линзы
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Overlays/lens_flare_bokeh/overlay_bokeh_city_round_lights_1080p_pixabay_10711.mp4` | круглое тёплое, красное и синее городское боке на тёмном, медленно меняется; 1920×1080, 23.976 fps, 33.6 с; автор MakinoSena. Заменяет `overlay_bokeh_round_lights_blinking_1080p_mixkit` | [Pixabay #10711](https://pixabay.com/videos/id-10711/) | Pixabay Content License | нет | низкая прозрачность Screen: за заголовками, финальные карточки, ночь |
| `03_Assets/Overlays/lens_flare_bokeh/overlay_bokeh_white_on_black_4k_pixabay_17433.mp4` | белые диски боке на чёрном; гуще и ярче прежнего — низкая прозрачность или затемнить; немая AAC-дорожка; 3840×2160, 23.976 fps, 10.0 с; автор victorsteep. Заменяет `overlay_bokeh_monochrome_floating_1080p_mixkit` | [Pixabay #17433](https://pixabay.com/videos/id-17433/) | Pixabay Content License | нет | мечта/воспоминание, фон финальной карточки |
| `03_Assets/Overlays/lens_flare_bokeh/texture_lens_dirt_smudges_2k_ambientcg.jpg` | карта грязи и отпечатков на линзе; JPG 2048×2048 | [ambientCG](https://ambientcg.com/a/Fingerprints005) | CC0 1.0 | нет | Screen 10–25 %: засветки «бьют» в грязное стекло |

### 3.5 dust_scratches — пыль и царапины
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Overlays/dust_scratches/overlay_dust_particles_screen_720p_vfxfootage_ccby.webm` | настоящая плавающая пыль на чёрном; 1280×720, луп 90 с | [Commons / VFX FOOTAGE](https://commons.wikimedia.org/wiki/File:Dust_Particles_1_--FREE_FOOTAGE--.webm) | CC BY 3.0 | **да** | Screen поверх архивных фото и тёмных сцен |
| `03_Assets/Overlays/dust_scratches/overlay_dust_particles_multiply_720p_vfxfootage_ccby.webm` | тёмные пылинки на белом; 1280×720, 90 с | [Commons / VFX FOOTAGE](https://commons.wikimedia.org/wiki/File:Dust_Particles_3_(multiply)_--FREE_FOOTAGE--.webm) | CC BY 3.0 | **да** | Multiply по светлому: бумага Vox, кремовые карточки, карты |
| `03_Assets/Overlays/dust_scratches/overlay_film_damage_scratches_720p_vfxfootage_ccby.webm` | янтарные волоски и царапины плёнки на чёрном; 1280×720, 10 с | [Commons / VFX FOOTAGE](https://commons.wikimedia.org/wiki/File:Film_Damage_1_--FREE_FOOTAGE--.webm) | CC BY 3.0 | **да** | Screen: PD-хроника и фото читаются как настоящая архивная плёнка |
| `03_Assets/Overlays/dust_scratches/texture_scratches_random_white_on_black_2k_ambientcg.jpg` | белые случайные царапины на чёрном; JPG 2048×2048 | [ambientCG](https://ambientcg.com/a/Scratches002) | CC0 1.0 | нет | Screen-кадр; сдвигать каждый кадр — анимированные царапины |
| `03_Assets/Overlays/dust_scratches/texture_scratches_fine_lines_white_on_black_2k_ambientcg.jpg` | тонкие параллельные линии на чёрном; JPG 2048×2048 | [ambientCG](https://ambientcg.com/a/Scratches004) | CC0 1.0 | нет | повернуть на 90° — вертикальные царапины плёнки (низкий Screen) |
| `03_Assets/Overlays/dust_scratches/texture_dust_specks_white_on_black_2k_ambientcg.jpg` | белые пылинки на чёрном; JPG 2048×2048 | [ambientCG](https://ambientcg.com/a/SurfaceImperfections009) | CC0 1.0 | нет | статичная пыль (Screen), смещать по кадрам |

### 3.6 light_leaks — засветки (только как тихая фактура)
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Overlays/light_leaks/overlay_light_leaks_01_720p_vfxfootage_ccby.webm` | тёплые оранжевые органичные засветки; 1280×720, 90 с | [Commons / VFX FOOTAGE](https://commons.wikimedia.org/wiki/File:Light_Leaks_1_--FREE_FOOTAGE--.webm) | CC BY 3.0 | **да** | Screen как тихая фактура; **не** вспышка-переход (правило владельца) |
| `03_Assets/Overlays/light_leaks/overlay_light_leaks_05_720p_vfxfootage_ccby.webm` | сине-фиолетовые засветки; 1280×720, 90 с | [Commons / VFX FOOTAGE](https://commons.wikimedia.org/wiki/File:Light_Leaks_5_--FREE_FOOTAGE--.webm) | CC BY 3.0 | **да** | под фиолетовый грейд канала: открытия, финальные карточки |
| `03_Assets/Overlays/light_leaks/overlay_light_leaks_06_720p_vfxfootage_ccby.webm` | голубые и белые засветки, похожие на боке; 1280×720, 30 с | [Commons / VFX FOOTAGE](https://commons.wikimedia.org/wiki/File:Light_Leaks_6_--FREE_FOOTAGE--.webm) | CC BY 3.0 | **да** | мечтательные моменты, небо, океан |

### 3.7 film_grain — плёнка 8 мм
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Overlays/film_grain/overlay_old_8mm_film_grain_gate_720p_vfxfootage_ccby.webm` | проекция 8 мм: кремовая основа, зерно, пыль, скруглённая рамка, мерцание; 1280×720, 30 с | [Commons / VFX FOOTAGE](https://commons.wikimedia.org/wiki/File:Old8mm_(HD)_--FREE_FOOTAGE--.webm) | CC BY 3.0 | **да** | Multiply/Overlay — вид домашнего кино или архива |

### 3.8 paper_grunge_textures — бумага и гранж
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Overlays/paper_grunge_textures/texture_paper_grey_kraft_2k_ambientcg.jpg` | серый крафт-картон с волокнами; JPG 1588×2048 | [ambientCG](https://ambientcg.com/a/Paper002) | CC0 1.0 | нет | фон коллажа; Multiply поверх графики — «печатный» вид |
| `03_Assets/Overlays/paper_grunge_textures/texture_paper_crumpled_white_2k_ambientcg.jpg` | мятая белая бумага; JPG 2048×2048 (gray) | [ambientCG](https://ambientcg.com/a/Paper003) | CC0 1.0 | нет | основа Vox-коллажа; Multiply по плоской графике и картам |
| `03_Assets/Overlays/paper_grunge_textures/texture_paper_crumple_heightmap_2k_ambientcg.jpg` | карта высот складок бумаги; JPG 2048×2048 | [ambientCG](https://ambientcg.com/a/Paper003) | CC0 1.0 | нет | Overlay/Soft-light 20–40 % — складки на любой графике или карте |
| `03_Assets/Overlays/paper_grunge_textures/texture_grunge_mottled_grey_2k_ambientcg.jpg` | пятнистый серый гранж; JPG 2048×2048 | [ambientCG](https://ambientcg.com/a/SurfaceImperfections008) | CC0 1.0 | нет | Overlay/Multiply — состарить документы, карты, титульные карточки |
| `03_Assets/Overlays/paper_grunge_textures/texture_grunge_decrepit_wallpaper_2k_polyhaven.jpg` | облезлые обои с пятнами; JPG 2048×2048 (MD5 совпал с API) | [Poly Haven](https://polyhaven.com/a/decrepit_wallpaper) | CC0 1.0 | нет | Multiply/Overlay — старение карточек, документов, карт |

---

## 4. Transitions — органические переходы (геометрические — в коде kits: zoomthru, whip, up, circle, diag, punch, fade)

### 4.1 chroma_ink_reveals — вайпы (с 24.10: два luma-матте и один двойной хромакей)
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Transitions/chroma_ink_reveals/transition_liquid_wipe_luma_matte_1080p_pixabay_19427.mp4` | чёрно-белые «пальцы» жидкости в несколько проходов — это **luma-матте, а не хромакей**; немая AAC-дорожка; 1920×1080, 25 fps, 5.0 с; автор MilanWulf. Заменяет `transition_black_liquid_covers_greenscreen_1080p_mixkit` | [Pixabay #19427](https://pixabay.com/videos/id-19427/) | Pixabay Content License | нет | liquid-wipe: в Remotion как маска (белое = план A, чёрное = план B) |
| `03_Assets/Transitions/chroma_ink_reveals/transition_ink_spill_luma_matte_1080p_pixabay_119211.mp4` | **частичная замена:** одна чернильная клякса с жёстким краем растёт из центра и за ~1 с закрывает белый кадр (luma-матте); горизонталь, для маски масштабировать под 9:16; немая AAC-дорожка; 1920×1080, 30 fps, 5.0 с; автор hirken8. Заменяет `transition_black_drops_cover_greenscreen_vertical_mixkit` | [Pixabay #119211](https://pixabay.com/videos/id-119211/) | Pixabay Content License | нет | ink-wipe для Vox/исторического стиля |
| `03_Assets/Transitions/chroma_ink_reveals/transition_paper_sheet_greenscreen_pixabay_245762.mp4` | **частичная замена:** рваная бумага отворачивается и скручивается; двойной ключ (зелёный = план A, синий = план B); 4K-горизонталь — кроп 1215×2160, проверить, что отворот в кропе; 3840×2160, 60 fps, 8.4 с; автор OWNFILTERS. Заменяет `transition_white_sheet_covers_greenscreen_vertical_mixkit` | [Pixabay #245762](https://pixabay.com/videos/id-245762/) | Pixabay Content License | нет | бумажный переход для Vox-кита |

**Без замены:** `transition_shapes_reveal_greenscreen_vertical_mixkit.mp4` (рваная фигура открывает зелёное окно) — в карантине. На Pixabay нейтральной вертикальной версии нет (только мультяшные шаблоны; кандидат 153127 отклонён после покадровой проверки). Замена кодом в Remotion-ките: `JaggedReveal` — SVG-полигон из 12–16 точек со случайными радиусами (фиксированный seed), масштаб 0 → ~3.5 за 8–12 кадров с пружинным перелётом и лёгким поворотом, как `clipPath` для плана B поверх плана A, тёмная обводка 2–4 px. Тот же компонент с круглыми кляксами заменит и «капли». Компонента `JaggedReveal` в шаблоне и kits пока нет (проверено 24.10): это спецификация, написать при первом ролике, где нужен такой переход.

### 4.2 ink_luma_mattes — чернильные luma-маски
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Transitions/ink_luma_mattes/transition_black_ink_bleed_on_white_4k_pixabay_42157.mp4` | чёрные чернила распускаются с перистыми краями на белом; пятно доходит примерно до половины кадра — для полного reveal увеличить; 3840×2160, 25 fps, 14.3 с; автор ArtSqb. Заменяет `transition_black_ink_splash_on_white_1080p_mixkit` | [Pixabay #42157](https://pixabay.com/videos/id-42157/) | Pixabay Content License | нет | luma как track matte для ink-bleed reveal или Multiply по бумаге |
| `03_Assets/Transitions/ink_luma_mattes/transition_black_ink_reveal_01_720p_vfxfootage_ccby.webm` | чёрные чернила растекаются по белому; 1280×720 VP9, 9.4 с | [Commons / VFX FOOTAGE](https://commons.wikimedia.org/wiki/File:Black_Reveal_1_--FREE_FOOTAGE--.webm) | CC BY 3.0 | **да** | luma-матте для ink reveal |

### 4.3 film_burn — прожог плёнки
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Transitions/film_burn/transition_film_burn_flicker_1080p_beachfront_ccby.mp4` | сепия-прожоги плёнки на чёрном; 1920×1080, 30 с; перекодировано из MPEG-2 94 MB | [Internet Archive](https://archive.org/details/FilmBurn) | CC BY 3.0 | **да** | Screen: burn-переход 0.5–1 с или слой «повреждённой плёнки» — тихо |

### 4.4 paint_splat_masks — кляксы-маски
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Transitions/paint_splat_masks/kenney_splat_pack_cc0/` | папка: 36 PNG 512 px (`png_512/`) + 36 SVG и overview.svg (`svg/`) + превью + License; 75 файлов | [Kenney](https://kenney.nl/assets/splat-pack) | CC0 1.0 | нет | SVG clipPath 0 → 3 за 0.3 с = ink-splat переход; кляксы-штампы |

---

## 5. Cinematic_Effects — киноэффекты и вставки

### 5.1 old_film — ракорд
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Cinematic_Effects/old_film/cinematic_film_leader_countdown_sepia_1080p_pixabay_144961.mp4` | классический сепийный ракорд с отсчётом 7→0, стрелкой, зерном и виньеткой; не зеркальный (hflip не нужен), без перфорации; 1920×1080, 25 fps, 8.0 с; автор Mjm31. Заменяет `cinematic_film_leader_countdown_1080p_mixkit` | [Pixabay #144961](https://pixabay.com/videos/id-144961/) | Pixabay Content License | нет | открытие архивного блока или флешбэка на 1–2 с |

### 5.2 light_masks — световые маски
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Cinematic_Effects/light_masks/kenney_light_masks_cc0/` | папка: 152 маски белое-на-чёрном PNG 512 px (`png_default/`) + License + превью; 154 файла | [Kenney](https://kenney.nl/assets/light-masks) | CC0 1.0 | нет | reveal прожектором/фонарём, лучи, фигурные виньетки; Screen или альфа-маска |

### 5.3 letterbox — кашеты (self-made)
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Cinematic_Effects/letterbox/cinematic_letterbox_1-85_window_1080x1920_selfmade.png` | PNG-матте: окно 1.85:1 внутри 1080×1920 | self-made | собственное | нет | кинокашет помягче |
| `03_Assets/Cinematic_Effects/letterbox/cinematic_letterbox_2-39_1920x1080_selfmade.png` | PNG-матте: полосы 2.39:1 для 1920×1080 | self-made | собственное | нет | горизонтальные ролики |
| `03_Assets/Cinematic_Effects/letterbox/cinematic_letterbox_2-39_window_1080x1920_selfmade.png` | PNG-матте: окно 2.39:1 внутри 1080×1920 | self-made | собственное | нет | кинокашет для вертикали |
| `03_Assets/Cinematic_Effects/letterbox/cinematic_letterbox_4x5_window_1080x1920_selfmade.png` | PNG-матте: окно 4:5 внутри 1080×1920 | self-made | собственное | нет | рамка «фото в кадре» |

### 5.4 vignette — виньетки (self-made)
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Cinematic_Effects/vignette/cinematic_vignette_soft_1080x1920_selfmade.png` | RGBA-виньетка мягкая, 1080×1920 | self-made | собственное | нет | затемнение краёв под текст и фокус |
| `03_Assets/Cinematic_Effects/vignette/cinematic_vignette_soft_1920x1080_selfmade.png` | RGBA-виньетка мягкая, 1920×1080 | self-made | собственное | нет | горизонтальные ролики |
| `03_Assets/Cinematic_Effects/vignette/cinematic_vignette_strong_1080x1920_selfmade.png` | RGBA-виньетка сильная, 1080×1920 | self-made | собственное | нет | драматичный фокус, ночь |

### 5.5 film_gate — рамка проектора (self-made)
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Cinematic_Effects/film_gate/cinematic_film_gate_rounded_1080x1920_selfmade.png` | RGBA-рамка кинопроектора со скруглёнными углами, 1080×1920 | self-made | собственное | нет | вид «старый проектор» поверх любого плана |
| `03_Assets/Cinematic_Effects/film_gate/cinematic_film_gate_rounded_1920x1080_selfmade.png` | RGBA-рамка кинопроектора, 1920×1080 | self-made | собственное | нет | то же для горизонтали |

### 5.6 pd_film_inserts — узнаваемые моменты PD-фильмов (≤ 8 с, без звука, H.264)
Форматы нестандартные (Nosferatu 17.98 fps 1440×1080, Safety Last! 1472×1072 23.976 fps, NASA SLS 1134×1080, Artemis II 1920×800): в Remotion кадрировать / масштабировать в карточку или под 1080×1920 и задавать `playbackRate` под 60 fps; Apollo 17 (320×240) — только маленьким PiP. Правило владельца (ep. 6): PD-вставка — только узнаваемый момент, поставленный как мем **поверх предыдущего кадра** с нашим SFX, а не отдельная склейка со «случайной хроникой». Таймкоды исходника ±0.1 с — в логе `memes.json`.
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/_quarantine/Cinematic_Effects/pd_film_inserts/pdfilm_lloyd_clock_hang_safety_last_1923_commons.mp4` **[КАРАНТИН 24.10: рип YIFY реставрации Criterion]** | Гарольд Ллойд висит на стрелке часов («Safety Last!», 1923); 1472×1072, 8.0 с, без звука | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Safety_Last!_(1923)_by_Fred_C._Newmeyer.webm) | PD (истёкший срок) | нет | напряжение, саспенс — 1–2 с поверх предыдущего кадра. Копия — рип реставрации: средний риск Content ID (оспаривается как PD) **Ограничения:** копия — рип YIFY реставрации Criterion (риск claim средне-высокий): ≤ 1,5–2 с, только Shorts ≤ 60 с, никогда на обложке и в заголовке, не на немецких каналах. |
| `03_Assets/_quarantine/Cinematic_Effects/pd_film_inserts/pdfilm_crowd_gasps_safety_last_1923_commons.mp4` **[КАРАНТИН 24.10: рип YIFY реставрации Criterion]** | толпа на улице ахает и хватается за грудь («Safety Last!», 1923); 2.0 с | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Safety_Last!_(1923)_by_Fred_C._Newmeyer.webm) | PD (истёкший срок) | нет | шок-реакция, cutaway **Ограничения:** как у клипа с часами (YIFY/Criterion): ≤ 1,5–2 с, только Shorts ≤ 60 с, не на немецких каналах. |
| `03_Assets/Cinematic_Effects/pd_film_inserts/pdfilm_keaton_facade_falls_steamboat_bill_jr_1928_commons.mp4` | на Китона падает фасад дома («Steamboat Bill, Jr.», 1928); 960×720, 7.3 с | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Steamboat_Bill_Jr._(1928).webm) | PD (истёкший срок) | нет | чудом уцелел / неожиданный поворот (узнаваемая сцена) Не на немецких каналах (DE: охрана, вероятно, до конца 2036). |
| `03_Assets/Cinematic_Effects/pd_film_inserts/pdfilm_keaton_wind_struggle_steamboat_bill_jr_1928_commons.mp4` | Китон против урагана (там же); 8.0 с | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Steamboat_Bill_Jr._(1928).webm) | PD (истёкший срок) | нет | борьба против обстоятельств, неудачная попытка Не на немецких каналах. |
| `03_Assets/Cinematic_Effects/pd_film_inserts/pdfilm_train_bridge_collapse_the_general_1926_commons.mp4` | поезд проваливается с горящего моста («The General», 1926); сепия, 1440×1080, 8.0 с | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:The_General_(1926).webm) | PD (истёкший срок) | нет | план рушится, катастрофа Не на немецких каналах (DE: вероятно, до 2038). |
| `03_Assets/Cinematic_Effects/pd_film_inserts/pdfilm_keaton_sad_on_coupling_rod_the_general_1926_commons.mp4` | грустный Китон на дышле паровоза («The General», 1926); 8.0 с | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:The_General_(1926).webm) | PD (истёкший срок) | нет | разочарование, отказ; легальная замена мема Sad Keanu Не на немецких каналах. |
| `03_Assets/Cinematic_Effects/pd_film_inserts/pdfilm_nosferatu_shadow_on_stairs_1922_commons.mp4` | тень Носферату на лестнице (1922, тонированная реставрация 2006); 4.6 с | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Nosferatu_(1922).webm) | PD (истёкший срок) | нет | угроза приближается, драматичный reveal. Рип реставрации: средний риск Content ID Немецкие каналы — только после отдельного решения (реставрация FWMS). |
| `03_Assets/Cinematic_Effects/pd_film_inserts/pdfilm_nosferatu_stare_at_window_1922_commons.mp4` | Носферату смотрит в окно (1922); 4.8 с | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Nosferatu_(1922).webm) | PD (истёкший срок) | нет | «за ними наблюдают», жуткий взгляд Немецкие каналы — только после отдельного решения. |
| `03_Assets/Cinematic_Effects/pd_film_inserts/pdfilm_rocket_in_moon_eye_trip_to_the_moon_1902_commons.mp4` | ракета в глазу Луны (Méliès, «Путешествие на Луну», 1902), ч/б; 8.0 с | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Le_Voyage_dans_la_Lune_(1902).webm) | PD (истёкший срок) | нет | «прямо в глаз»: неожиданный удар, комедия |
| `03_Assets/Cinematic_Effects/pd_film_inserts/pdfilm_gunman_fires_at_camera_great_train_robbery_1903_commons.mp4` | бандит стреляет в камеру («The Great Train Robbery», 1903); 1280×720, 6.5 с | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Edwin_Stanton_Porter_The_Great_Train_Robbery_(1903)_-_Final_Scene.webm) | PD (истёкший срок) | нет | внезапный шок, «бах!» |
| `03_Assets/Cinematic_Effects/pd_film_inserts/pdfilm_bert_turtle_ducks_duck_and_cover_1951_commons.mp4` | черепаха Берт прячется в панцирь («Duck and Cover», 1951, скан LoC); 8.0 с | [Commons / LoC](https://commons.wikimedia.org/wiki/File:Duck_and_Cover_1440_x_1080_01836081.webm) | PD, вероятно, по непродлению; основание спорное (снял подрядчик Archer Productions, не правительство) | нет | «прячься!» — паника-гэг |

### 5.7 pd_gov_footage — госкадры США (PD)
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Cinematic_Effects/pd_gov_footage/govpd_rocket_tank_burst_sls_test_nasa_2020.mp4` | бак SLS разрывается на испытании NASA (2020), slow motion; 1134×1080, 8.0 с | [NASA](https://images.nasa.gov/details/MSFC_2020_XP_SLS_V_0130_PD002-Test-Case-TTF-4697%20LOX%20Tank%20Test-to-Failure%20color-1_06242020_timelapse) | NASA, US gov (без копирайта) | нет | «и тут всё лопнуло»: провал испытания |

**В карантине с 24.10:** `govpd_atomic_test_baker_1946_commons.mp4` перенесён в `03_Assets/_quarantine/Cinematic_Effects/pd_gov_footage/`. Кадры PD, но копия на Commons взята из коммерческой документалки «Trinity & Beyond» (1995) с её грейдом → вероятен матч Content ID; тема чувствительная. Замена — прямая копия NARA / DOE (ещё не скачана). Причины — `03_Assets/_quarantine/README.md`.

---

## 6. Templates_Presets / LUTs — 15 .cube 33³ (все проверены ffmpeg lut3d)
Применение: только ffmpeg (`lut3d`) после рендера или в стороннем редакторе; в Remotion LUT нативно нет. Контакт-лист — `03_Assets/Templates_Presets/LUTs/_previews/luts_contact_sheet.jpg`.

### 6.1 slay_cc_by — 5 LUT, CC BY 4.0 (атрибуция обязательна)
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Templates_Presets/LUTs/slay_cc_by/slay-01-amber.cube` | 3D LUT 33³ «amber» | [slay (GitHub)](https://github.com/slaycamera/luts) | CC BY 4.0 | **да** | тёплый golden hour |
| `03_Assets/Templates_Presets/LUTs/slay_cc_by/slay-02-fade.cube` | 3D LUT 33³ «fade» | [slay (GitHub)](https://github.com/slaycamera/luts) | CC BY 4.0 | **да** | матовая выцветшая плёнка |
| `03_Assets/Templates_Presets/LUTs/slay_cc_by/slay-03-neon.cube` | 3D LUT 33³ «neon» | [slay (GitHub)](https://github.com/slaycamera/luts) | CC BY 4.0 | **да** | циан и маджента, ночь |
| `03_Assets/Templates_Presets/LUTs/slay_cc_by/slay-04-film.cube` | 3D LUT 33³ «film» | [slay (GitHub)](https://github.com/slaycamera/luts) | CC BY 4.0 | **да** | кинолук: тиловые тени, тёплая кожа |
| `03_Assets/Templates_Presets/LUTs/slay_cc_by/slay-05-portrait.cube` | 3D LUT 33³ «portrait» | [slay (GitHub)](https://github.com/slaycamera/luts) | CC BY 4.0 | **да** | мягкий тёплый портретный |

### 6.2 selfmade_atlas_kit — 10 LUT, собственные (грейды Remotion-kit, экспортированные в .cube)
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Templates_Presets/LUTs/selfmade_atlas_kit/lut_atlas_duotone_cool_selfmade.cube` | 3D LUT 33³: холодный дуотон | self-made | собственное | нет | дуотон-фото, холодная гамма |
| `03_Assets/Templates_Presets/LUTs/selfmade_atlas_kit/lut_atlas_duotone_warm_selfmade.cube` | 3D LUT 33³: тёплый дуотон | self-made | собственное | нет | дуотон-фото (как Duotone в gfx.tsx) |
| `03_Assets/Templates_Presets/LUTs/selfmade_atlas_kit/lut_atlas_photo_violet_selfmade.cube` | 3D LUT 33³: фиолетовый тон PhotoKB | self-made | собственное | нет | фото под фиолетовый грейд канала |
| `03_Assets/Templates_Presets/LUTs/selfmade_atlas_kit/lut_atlas_pop_neutral_selfmade.cube` | 3D LUT 33³: GRADE kit без тёплого Look | self-made | собственное | нет | нейтральный вариант канального грейда |
| `03_Assets/Templates_Presets/LUTs/selfmade_atlas_kit/lut_atlas_pop_warm_selfmade.cube` | 3D LUT 33³: GRADE kit (sat 1.22, con 1.07, bri 1.03, warm 0.12) + тёплый Look | self-made | собственное | нет | тот же грейд, что в Remotion (`real.tsx`), для ffmpeg/Resolve/CapCut или предкраски стока |
| `03_Assets/Templates_Presets/LUTs/selfmade_atlas_kit/lut_bleach_bypass_selfmade.cube` | 3D LUT 33³: bleach bypass | self-made | собственное | нет | жёсткий десатурированный лук: война, катастрофа |
| `03_Assets/Templates_Presets/LUTs/selfmade_atlas_kit/lut_bw_high_contrast_selfmade.cube` | 3D LUT 33³: ч/б высокий контраст | self-made | собственное | нет | драматичное ч/б |
| `03_Assets/Templates_Presets/LUTs/selfmade_atlas_kit/lut_faded_film_warm_selfmade.cube` | 3D LUT 33³: тёплая выцветшая плёнка | self-made | собственное | нет | ретро-вставки |
| `03_Assets/Templates_Presets/LUTs/selfmade_atlas_kit/lut_teal_orange_selfmade.cube` | 3D LUT 33³: teal & orange | self-made | собственное | нет | кинематографичный блокбастер-лук |
| `03_Assets/Templates_Presets/LUTs/selfmade_atlas_kit/lut_vox_sepia_archive_selfmade.cube` | 3D LUT 33³: SEPIA Vox-кита | self-made | собственное | нет | архивная сепия для фото и хроники |

---

## 7. Memes_Reactions — легальные реакции (копирайтные мемы — только каталог, см. 12.C)
Полный разбор 32 мем-форматов с правами, рисками и легальными заменами, матрица «эмоция → ассет», инвентарь эмоций Atlas — `03_Assets/Memes_Reactions/MEME_CATALOG.md`. Люди в стоковых клипах — модели: не выдавать их за реальных героев истории и не ставить в оскорбительный контекст.

### 7.1 success — успех
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Memes_Reactions/success/reaction_mission_control_cheers_artemis2_nasa_2026.mp4` | ЦУП ликует при приводнении Artemis II (NASA, 2026); 1920×800, 8.0 с | [NASA](https://images.nasa.gov/details/jsc2026m000354-Artemis-II-Orion-Mission-Evaluation-Room-Team-During-Splashdown) | NASA, US gov (без копирайта) | нет | успех, облегчение, аплодисменты; без намёка на одобрение NASA **Только редакционно, в космической истории** (действующие сотрудники и инсигнии NASA): не как универсальный «успех», никогда на обложке и в промо, без насмешливых подписей. |

### 7.2 failure — провал
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Memes_Reactions/failure/reaction_astronaut_falls_apollo17_nasa_1972.mp4` | астронавт падает на Луне (Apollo 17, 1972); **320×240**, 7.7 с | [Commons (NASA)](https://commons.wikimedia.org/wiki/File:Ap17_schmitt_falls.ogv) | PD (US gov, NASA) | нет | «упс», неуклюжее падение; только как PiP или «экран ТВ» |
| `03_Assets/Memes_Reactions/failure/reaction_frustrated_man_head_in_hand_vertical_pixabay_272633.mp4` | мужчина читает счёт, голова в ладони, на столе мятая бумага; единственная замена в нативной вертикали (без кропа); мужчина вместо женщины у ноутбука; **вертикаль 1080×1920**, 23.976 fps, 10.0 с; автор DespiertaYa. Заменяет `reaction_frustrated_woman_head_in_hand_mixkit` | [Pixabay #272633](https://pixabay.com/videos/id-272633/) | Pixabay Content License | нет | facepalm на плохое решение, «ну почему!» |

### 7.3 sarcasm — сарказм
**Пусто с 24.10:** единственный файл `reaction_rolling_eyes_commons_ccbysa.mp4` перенесён в `03_Assets/_quarantine/Memes_Reactions/sarcasm/` (CC BY-SA 3.0 + личные права: обрезка и наложение поверх кадра делают адаптацию, которая сама должна быть BY-SA). Для сарказма — Atlas `sarcastic` / `skeptical` / `wink` или рисованная реакция.

### 7.4 shock_surprise — шок
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Memes_Reactions/shock_surprise/reaction_shocked_man_hand_over_mouth_4k_pixabay_122389.mp4` | мужчина на студийном фоне закрывает рот рукой, потом открывает рот от шока; другой жест, 4K; немая AAC-дорожка; 3840×2160, 25 fps, 15.8 с; автор u_n92ynpt32e. Заменяет `reaction_surprised_man_hands_on_head_mixkit` | [Pixabay #122389](https://pixabay.com/videos/id-122389/) | Pixabay Content License | нет | шок, «не может быть!» |

### 7.5 comedy_laugh — смех
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Memes_Reactions/comedy_laugh/reaction_man_laughing_on_phone_4k_pixabay_204420.mp4` | **частичная замена:** крупно мужчина смеётся во время звонка, тёмный фон; не смотрит прямо в камеру (такого клипа без AI на Pixabay нет); немая AAC-дорожка; 3840×2160, 50 fps, 15.5 с; автор conte_public. Заменяет `reaction_man_laughing_closeup_mixkit` | [Pixabay #204420](https://pixabay.com/videos/id-204420/) | Pixabay Content License | нет | смех над абсурдом |

### 7.6 disappointment — разочарование
| Файл | Что это | Источник | Лицензия | Атр. | Где использовать |
|---|---|---|---|---|---|
| `03_Assets/Memes_Reactions/disappointment/reaction_sad_man_teary_closeup_1080p_pixabay_122390.mp4` | тесный профиль пожилого мужчины со слезами на глазах; профиль, меньше растерянности; немая AAC-дорожка; 1920×1080, 30 fps, 9.4 с; автор u_n92ynpt32e. Заменяет `reaction_sad_confused_man_mixkit` | [Pixabay #122390](https://pixabay.com/videos/id-122390/) | Pixabay Content License | нет | разочарование, грусть; легальная замена Sad Keanu / Confused Travolta |

---

## 8. Fonts — 10 семейств (Google Fonts, github.com/google/fonts)
Образец всех шрифтов — `03_Assets/Fonts/_specimen_fonts.png`; README — `03_Assets/Fonts/README.md`. Локальные файлы позволяют рендерить без сети (`@remotion/google-fonts` качает шрифт в момент рендера). Лицензия проверена по METADATA.pb, name-таблице TTF и файлу лицензии рядом.
| Папка и файлы | Начертания и языки | Лицензия | Атр. | Для чего |
|---|---|---|---|---|
| `03_Assets/Fonts/Montserrat/` — `Montserrat-Italic-VariableFont_wght.ttf`, `Montserrat-VariableFont_wght.ttf`, `OFL.txt` | variable wght 100–900 + Italic, v9.000; латиница, ÄÖÜß, **кириллица** | OFL-1.1 ([Google Fonts](https://github.com/google/fonts)) | нет | основной шрифт субтитров (900) и заголовков RU/DE/EN |
| `03_Assets/Fonts/AlfaSlabOne/` — `AlfaSlabOne-Regular.ttf`, `OFL.txt` | Regular v2.0; латиница + ÄÖÜß, без кириллицы; OFL с Reserved Font Name «Alfa Slab» (используем без изменений) | OFL-1.1 ([Google Fonts](https://github.com/google/fonts)) | нет | **крупный шрифт канала** (палитра A «Экспедиция», 24.10 вечером): числа, хук-слова, штампы |
| `03_Assets/Fonts/Anton/` — `Anton-Regular.ttf`, `OFL.txt` | Regular v2.116; латиница + ÄÖÜß, без кириллицы | OFL-1.1 ([Google Fonts](https://github.com/google/fonts)) | нет | крупные числа и хук-слова (пресет Punch) до 24.10; в новых роликах — Alfa Slab One |
| `03_Assets/Fonts/BebasNeue/` — `BebasNeue-Regular.ttf`, `OFL.txt` | Regular v2.000; только латиница | OFL-1.1 ([Google Fonts](https://github.com/google/fonts)) | нет | узкие заголовки, плашки дат |
| `03_Assets/Fonts/Inter/` — `Inter-VariableFont_opsz_wght.ttf`, `OFL.txt` | variable opsz 14–32, wght 100–900, v4.001; латиница, кириллица, греческий | OFL-1.1 ([Google Fonts](https://github.com/google/fonts)) | нет | лейблы, UI-карточки, подписи документов (пресет C1) |
| `03_Assets/Fonts/Oswald/` — `OFL.txt`, `Oswald-VariableFont_wght.ttf` | variable wght 200–700, v4.103; латиница + кириллица | OFL-1.1 ([Google Fonts](https://github.com/google/fonts)) | нет | кириллическая замена Anton/Bebas |
| `03_Assets/Fonts/Rubik/` — `OFL.txt`, `Rubik-VariableFont_wght.ttf` | variable wght 300–900, v2.300; латиница + кириллица | OFL-1.1 ([Google Fonts](https://github.com/google/fonts)) | нет | мягкие жирные подписи |
| `03_Assets/Fonts/RussoOne/` — `OFL.txt`, `RussoOne-Regular.ttf` | Regular v1.001; латиница + кириллица | OFL-1.1 (Reserved Font Name «Russo») ([Google Fonts](https://github.com/google/fonts)) | нет | тяжёлые заголовки RU, 3D-текст в Blender |
| `03_Assets/Fonts/Bangers/` — `Bangers-Regular.ttf`, `OFL.txt` | Regular v2.100; только латиница | OFL-1.1 ([Google Fonts](https://github.com/google/fonts)) | нет | комикс/мем-вставки (пресет C3) |
| `03_Assets/Fonts/PermanentMarker/` — `LICENSE.txt`, `PermanentMarker-Regular.ttf` | Regular v1.001; только латиница | Apache-2.0 ([Google Fonts](https://github.com/google/fonts)) | нет | рукописные пометки у стрелок (EN/DE) |
| `03_Assets/Fonts/Caveat/` — `Caveat-VariableFont_wght.ttf`, `OFL.txt` | variable wght 400–700, v2.000; латиница + кириллица | OFL-1.1 ([Google Fonts](https://github.com/google/fonts)) | нет | рукописные пометки по-русски |

---

## 9. Graphics и Animations

### 9.1 Иконки
| Файлы | Что это | Источник | Лицензия | Атр. | Для чего |
|---|---|---|---|---|---|
| `03_Assets/Graphics/icons/lucide/svg/icon_<имя>_lucide.svg` — 95 шт.: alarm_clock, anchor, arrow_big_down, arrow_big_right, arrow_big_up, arrow_down, arrow_down_right, arrow_left, arrow_right, arrow_up, arrow_up_right, ban, banknote, bird, bomb, book_open, calendar, camera, car, castle, chart_line, check, chevrons_right, circle_alert, circle_check, circle_question_mark, circle_x, clock, cloud_lightning, coins, compass, corner_down_right, crosshair, crown, dollar_sign, droplet, earth, euro, eye, film, fish, flag, flame, footprints, gavel, globe, heart_crack, heart, hourglass, key, landmark, lock, map, map_pin, megaphone, message_circle, mountain, move_right, newspaper, piggy_bank, plane, play, rabbit, redo_2, rocket, ruler, sailboat, scale, scroll, search, shield, ship, skull, snowflake, sun, swords, target, tent, thermometer, thumbs_down, thumbs_up, timer, train_front, tree_pine, trending_down, trending_up, triangle_alert, trophy, user, users, volume_2, waves_horizontal, wind, x, zap | контурные SVG 24×24, `stroke=currentColor` (цвет задаётся CSS) | [Lucide 1.61.0](https://lucide.dev/icons/) | ISC | нет | пиктограммы в инфо-карточках, маршруты, коллауты |
| `03_Assets/Graphics/icons/lucide/_archive/lucide-icons-1.61.0.zip` | официальный zip релиза, 3807 записей (1903 SVG + JSON-теги); не распакован, брать иконки по запросу | [GitHub release 1.61.0](https://github.com/lucide-icons/lucide/releases/tag/1.61.0) | ISC (иконки из Feather — MIT) | нет | полный набор Lucide |
| `03_Assets/Graphics/icons/lucide/LICENSE.txt` | текст лицензии из тега 1.61.0 (в zip его нет) | Lucide | ISC | — | — |
| `03_Assets/Graphics/icons/tabler/filled/icon_<имя>_filled_tabler.svg` — 46 шт.: alert_triangle, arrow_big_down, arrow_big_left, arrow_big_right, arrow_big_up, award, bell, bolt, bomb, calendar, circle_check, circle_x, clock, cloud, coin, confetti, crown, diamond, droplet, eye, flag_3, flag, flame, ghost_2, heart, help_circle, home, hourglass, location, lock, map_pin, message_circle, mood_crazy_happy, mood_sad, mood_smile, moon, pin, plane, player_play, shield, star, sun, thumb_down, thumb_up, trophy, user | залитые SVG — читаются в мелком размере | [Tabler v3.49.0](https://github.com/tabler/tabler-icons/tree/v3.49.0/icons) | MIT | нет | значки на карте, бейджи, реакции |
| `03_Assets/Graphics/icons/tabler/outline/icon_<имя>_outline_tabler.svg` — 32 шт.: arrow_autofit_right, arrow_back_up, arrow_badge_right, arrow_bear_right, arrow_big_down_lines, arrow_big_right_lines, arrow_curve_left, arrow_curve_right, arrow_down_right_circle, arrow_forward_up, arrow_loop_left, arrow_loop_right, arrow_move_right, arrow_narrow_right, arrow_ramp_right, arrow_rotary_right, arrow_roundabout_right, arrow_wave_right_down, arrow_wave_right_up, arrow_zig_zag, circle_dashed, confetti, flame, map_pin_2, radar, scribble, skull, sword, swords, target_arrow, world, writing | контурные SVG: изогнутые/петлевые/зигзаг-стрелки, scribble, radar, мечи | Tabler v3.49.0 | MIT | нет | стрелки-указатели, маршруты; логотипы брендов сознательно не брали |
| `03_Assets/Graphics/icons/tabler/LICENSE.txt` | текст лицензии | Tabler | MIT | — | — |

### 9.2 Эмодзи (статичные SVG)
| Файлы | Что это | Источник | Лицензия | Атр. | Для чего |
|---|---|---|---|---|---|
| `03_Assets/Graphics/emoji/noto_svg/emoji_<имя>_<codepoint>_noto.svg` — 54 шт.: alarm_clock_u23f0, bomb_u1f4a3, chart_decreasing_u1f4c9, chart_increasing_u1f4c8, check_mark_button_u2705, clapping_u1f44f, clown_u1f921, collision_explosion_u1f4a5, confetti_ball_u1f38a, cross_mark_u274c, crossed_swords_u2694, crown_u1f451, direct_hit_target_u1f3af, dollar_banknote_u1f4b5, double_exclamation_u203c, exclamation_mark_u2757, exploding_head_u1f92f, eye_roll_u1f644, eyes_u1f440, face_open_mouth_u1f62e, fire_u1f525, flushed_face_u1f633, globe_europe_africa_u1f30d, high_voltage_u26a1, hourglass_u23f3, hundred_points_u1f4af, interrobang_u2049, loudly_crying_u1f62d, money_bag_u1f4b0, money_with_wings_u1f4b8, monocle_face_u1f9d0, party_popper_u1f389, point_down_u1f447, point_left_u1f448, point_right_u1f449, point_up_u1f446, police_light_siren_u1f6a8, prohibited_u1f6ab, pushpin_u1f4cc, question_mark_u2753, rofl_u1f923, round_pushpin_map_pin_u1f4cd, screaming_face_u1f631, ship_u1f6a2, skull_u1f480, sparkles_u2728, sunglasses_face_u1f60e, thinking_face_u1f914, thumbs_down_u1f44e, thumbs_up_u1f44d, trophy_u1f3c6, volcano_u1f30b, warning_u26a0, world_map_u1f5fa | цветные SVG-эмодзи Noto | [Noto Emoji](https://github.com/googlefonts/noto-emoji/tree/main/2D/svg) | Apache-2.0 (по README; корневой LICENSE репозитория с 2024-07 — OFL-1.1, обе разрешительные) | нет | стикеры-реакции, мем-акценты, маркеры на карте |
| `03_Assets/Graphics/emoji/LICENSE_Apache-2.0.txt`, `LICENSE_noto-emoji_repo_OFL.txt` | обе копии лицензии | Noto Emoji | — | — | — |

### 9.3 Рисованные стрелки и маркеры (Openclipart, CC0)
Все SVG проверены: нет `<script>`, on*-обработчиков, внешних ссылок, foreignObject и встроенного растра.
| Файл | Что это | Источник | Лицензия | Атр. | Для чего |
|---|---|---|---|---|---|
| `03_Assets/Graphics/arrows_markers/arrow_brush_right_black_openclipart.svg` | чёрная кистевая стрелка вправо (AdamStanislav) | [Openclipart](https://openclipart.org/detail/245791) | CC0 1.0 | нет | обвести, указать, подчеркнуть деталь на карте или фото; подложка под текст |
| `03_Assets/Graphics/arrows_markers/arrow_hollow_right_outline_openclipart.svg` | контурная стрелка вправо (AdamStanislav) | [Openclipart](https://openclipart.org/detail/245800) | CC0 1.0 | нет | обвести, указать, подчеркнуть деталь на карте или фото; подложка под текст |
| `03_Assets/Graphics/arrows_markers/arrow_hand_right_red_openclipart.svg` | красная рисованная стрелка вправо (AdamStanislav) | [Openclipart](https://openclipart.org/detail/245801) | CC0 1.0 | нет | обвести, указать, подчеркнуть деталь на карте или фото; подложка под текст |
| `03_Assets/Graphics/arrows_markers/arrow_curved_down_black_openclipart.svg` | маркерная стрелка с изгибом вниз-вправо (fanna1119) | [Openclipart](https://openclipart.org/detail/253206) | CC0 1.0 | нет | обвести, указать, подчеркнуть деталь на карте или фото; подложка под текст |
| `03_Assets/Graphics/arrows_markers/arrow_curved_up_red_openclipart.svg` | красная изогнутая стрелка вверх (f_featherbrain) | [Openclipart](https://openclipart.org/detail/161695) | CC0 1.0 | нет | обвести, указать, подчеркнуть деталь на карте или фото; подложка под текст |
| `03_Assets/Graphics/arrows_markers/marker_circles_set_black_openclipart.svg` | набор из 12 рисованных кругов «обвести» (dominiquechappard) | [Openclipart](https://openclipart.org/detail/292748) | CC0 1.0 | нет | обвести, указать, подчеркнуть деталь на карте или фото; подложка под текст |
| `03_Assets/Graphics/arrows_markers/marker_underline_gold_openclipart.svg` | золотое рисованное подчёркивание (nerdy) | [Openclipart](https://openclipart.org/detail/349303) | CC0 1.0 | нет | обвести, указать, подчеркнуть деталь на карте или фото; подложка под текст |
| `03_Assets/Graphics/arrows_markers/marker_check_and_cross_openclipart.svg` | зелёная галочка + красный крест (gcross) | [Openclipart](https://openclipart.org/detail/169757) | CC0 1.0 | нет | обвести, указать, подчеркнуть деталь на карте или фото; подложка под текст |
| `03_Assets/Graphics/arrows_markers/marker_brush_stroke_grunge_black_openclipart.svg` | чёрный гранж-мазок кистью — подложка под текст, «цензура» (liftarn) | [Openclipart](https://openclipart.org/detail/213817) | CC0 1.0 | нет | обвести, указать, подчеркнуть деталь на карте или фото; подложка под текст |
| `03_Assets/Graphics/arrows_markers/marker_brush_circle_red_openclipart.svg` | красный круг кистью — фон стикера (viziba) | [Openclipart](https://openclipart.org/detail/333609) | CC0 1.0 | нет | обвести, указать, подчеркнуть деталь на карте или фото; подложка под текст |
| `03_Assets/Graphics/arrows_markers/marker_scribble_crossout_black_openclipart.svg` | чёрное маркерное зачёркивание (NicholasJudy567) | [Openclipart](https://openclipart.org/detail/322297) | CC0 1.0 | нет | обвести, указать, подчеркнуть деталь на карте или фото; подложка под текст |
| `03_Assets/Graphics/arrows_markers/marker_splat_burst_black_openclipart.svg` | колючая клякса/взрыв — удар за текстом (NicholasJudy567) | [Openclipart](https://openclipart.org/detail/323225) | CC0 1.0 | нет | обвести, указать, подчеркнуть деталь на карте или фото; подложка под текст |

### 9.4 Animations / lottie — 20 анимированных эмодзи Noto (CC BY 4.0, атрибуция обязательна)
Lottie v5.8.1, 1024×1024, 60 fps, 0.8–5 с, бесшовный цикл, без растра; все 20 проверены рендером в lottie-web 5.12.2 (`03_Assets/Animations/lottie/_preview_midframe.png`). В Remotion нужен пакет `@remotion/lottie` (сейчас ни в одном проекте не установлен; ставить в новый шаблон: `npx remotion add @remotion/lottie`, версия = 4.0.535).
| Файлы | Что это | Источник | Лицензия | Атр. | Для чего |
|---|---|---|---|---|---|
| `03_Assets/Animations/lottie/lottie_<имя>_<codepoint>_noto_animated.json` — 20 шт.: bomb_u1f4a3, chart_increasing_u1f4c8, check_mark_u2705, collision_explosion_u1f4a5, cross_mark_u274c, exclamation_mark_u2757, exploding_head_u1f92f, eyes_u1f440, fire_u1f525, globe_spinning_u1f30d, money_with_wings_u1f4b8, party_popper_confetti_u1f389, point_down_u1f447, point_right_u1f449, police_light_siren_u1f6a8, question_mark_u2753, screaming_face_u1f631, skull_u1f480, thinking_face_u1f914, warning_u26a0_fe0f | анимированные эмодзи Lottie JSON | [Noto Animated Emoji](https://googlefonts.github.io/noto-emoji-animation/) | CC BY 4.0 | **да** (одна строка на ролик, раздел 14.3) | стикеры-реакции, указатели, алерты поверх кадра через `@remotion/lottie` |

---

## 10. Typography и Motion_Graphics
- `03_Assets/Typography/CAPTION_PRESETS.md` — 3 пресета текста: **A «Atlas Standard»** (текущий `Subtitles.tsx`: Montserrat 900, 54 px, обводка INK, ключевые слова акцентом — оранжевым с 24.10 (до этого золотым), показ только во время речи, **без наклона**), **B «Punch»** (числа и хук: Anton/Oswald), **C** «Doc Label / Hand note / Meme» (Inter, Caveat/Permanent Marker, Bangers). Там же safe zone и правило «ничего дважды».
- `03_Assets/Motion_Graphics/` — **пусто намеренно**: motion-графика канала живёт кодом в kits (`pig-war/short3/src/ui/draw.tsx`, `chars.tsx`, `gfx.tsx`, `football-222/short/src/ui/vox.tsx`). С 24.10 они собраны в общем шаблоне `04_Templates/remotion_short/short/src/ui/` (`draw.tsx`, `chars.tsx`, `gfx.tsx`, `vox.tsx`, `real.tsx`, `Subtitles.tsx`, `Atlas.tsx`) и `src/engine/transitions.tsx`.

## 11. Служебные файлы в 03_Assets (не ассеты, но лежат в библиотеке)
| Файл | Что это |
|---|---|
| `03_Assets/Animations/lottie/README.md` | README агента (на русском) |
| `03_Assets/Animations/lottie/_preview_midframe.png` | превью: кадр на 45 % каждой Lottie |
| `03_Assets/Cinematic_Effects/README_visuals.md` | README по визуальным ассетам / указатель |
| `03_Assets/Fonts/README.md` | README агента (на русском) |
| `03_Assets/Fonts/_specimen_fonts.png` | образец всех шрифтов |
| `03_Assets/Graphics/README.md` | README агента (на русском) |
| `03_Assets/Graphics/_preview_graphics.png` | превью всей графики |
| `03_Assets/Memes_Reactions/MEME_CATALOG.md` | каталог мемов, права, легальные замены, инвентарь Atlas |
| `03_Assets/Music/README.md` | README агента (на русском) |
| `03_Assets/Overlays/README_visuals.md` | README по визуальным ассетам / указатель |
| `03_Assets/Sound_Effects/CREDITS.md` | кредиты SFX по файлам |
| `03_Assets/Sound_Effects/README.md` | README агента (на русском) |
| `03_Assets/Sound_Effects/index.json` | индекс SFX в схеме Remotion-kits + license |
| `03_Assets/Templates_Presets/LUTs/README_visuals.md` | README по визуальным ассетам / указатель |
| `03_Assets/Templates_Presets/LUTs/_previews/luts_contact_sheet.jpg` | контакт-лист всех LUT |
| `03_Assets/Transitions/README_visuals.md` | README по визуальным ассетам / указатель |
| `03_Assets/Typography/CAPTION_PRESETS.md` | пресеты субтитров и текста, safe zone |
| `03_Assets/_quarantine/README.md` | карантин: какие файлы выведены из библиотеки, почему и чем заменить (с 24.10) |
| `03_Assets/Licenses/` — 36 файлов: `ATTRIBUTION_visuals.md`, `ambientcg_LICENSE.md`, `bbc_sound_effects_LICENSE.md`, `freesound_LICENSE.md`, `google-fonts_LICENSE.md`, `incompetech_LICENSE.md`, `internet_archive_beachfront_LICENSE.md`, `kenney_LICENSE.md`, `kenney_vfx_LICENSE.md`, `lottiefiles_LICENSE.md`, `lucide_LICENSE.md`, `mixkit_LICENSE.md`, `mixkit_music_LICENSE.md`, `mixkit_video_LICENSE.md`, `musopen_LICENSE.md`, `nasa_LICENSE.md`, `noto-animated-emoji_LICENSE.md`, `noto-emoji_LICENSE.md`, `openclipart_LICENSE.md`, `pexels_LICENSE.md`, `pexels_pixabay_video_LICENSE.md`, `pixabay_LICENSE.md`, `pixabay_music_LICENSE.md`, `polyhaven_LICENSE.md`, `scott_buckley_LICENSE.md`, `selfmade_visuals_LICENSE.md`, `slaycamera_luts_LICENSE.md`, `sonniss_LICENSE.md`, `tabler_LICENSE.md`, `us_public_domain_films_LICENSE.md`, `usaf_band_LICENSE.md`, `wikimedia_commons_LICENSE.md`, `wikimedia_commons_vfxfootage_LICENSE.md`, `wikimedia_commons_video_LICENSE.md`, `youtube_audio_library_LICENSE.md`, `zapsplat_LICENSE.md` | лицензионные заметки по источникам (лицензия, URL, коммерция, атрибуция, ограничения, дата проверки 2026-10-24) и `ATTRIBUTION_visuals.md`. Три заметки `mixkit_*` оставлены как история (файлы Mixkit в карантине); `freesound_LICENSE.md`, `pixabay_LICENSE.md`, `pexels_pixabay_video_LICENSE.md`, `incompetech_LICENSE.md` дополнены 24.10 |

---

## 12. Только каталог (не скачано)

### 12.A Бесплатно и допустимо, но скачать может только владелец вручную (manual)
Скачанное класть в `01_Input/<source>/`, затем Claude проверит, переименует, занесёт в библиотеку и лог.

| Ресурс и ссылка | Что внутри · форматы · совместимость | Цена | Лицензия · коммерция | Атрибуция | Ограничения | Для чего нам · почему не скачано |
|---|---|---|---|---|---|---|
| **YouTube Audio Library** (музыка + SFX) — studio.youtube.com → Аудиотека; правила https://support.google.com/youtube/answer/3376882 | MP3 320 kbps; любой монтаж | бесплатно | стандартная лицензия YTAL или CC BY (по треку); монетизация на YouTube — да | только у треков CC BY (текст из Studio — в описание) | нужен вход в Studio канала; гарантия «без claim» только для YouTube; вне YouTube не описано | основной выбор для Shorts > 60 с (самый низкий риск Content ID); отсюда канальный bed Frame-Dragging. Manual: логин владельца |
| **Pixabay** — музыка https://pixabay.com/music/ · звуки https://pixabay.com/sound-effects/ (касса: https://pixabay.com/sound-effects/search/cash%20register/) · видео https://pixabay.com/videos/search/light%20leak/ , https://pixabay.com/videos/search/old%20film%20grain%20overlay/ , https://pixabay.com/videos/search/film%20dust/ , https://pixabay.com/videos/search/scratch%20overlay/ , https://pixabay.com/videos/search/surprised/ | MP3; MP4 HD/4K (часть на хромакее); любой редактор / Remotion (звук конвертировать в WAV 48k) | бесплатно | Pixabay Content License; коммерция да | не нужна | нельзя распространять отдельно и использовать как товарный знак; **музыка — риск Content ID средний–высокий** (часть авторов регистрирует треки; спор до 30 дней, Short > 60 с всё это время заблокирован) | «ча-чинг» кассы, запасные whoosh/riser, засветки, плёночная пыль, реакции; музыку — только в Shorts ≤ 60 с с сохранённым License Certificate. Сайт отдаёт скриптам Cloudflare 403; **видео и фото с 24.10 — через официальный API** (`~/shorts/tools/pixabay.py`, ключ владельца: 19 клипов разделов 3, 4, 5.1, 7), музыки и звуков в API нет → manual |
| **Pexels Videos** — https://www.pexels.com/video/a-light-leak-flash-9255045/ · https://www.pexels.com/video/a-bright-light-leak-overlay-9255046/ (и 9255041) · https://www.pexels.com/video/dynamic-light-leak-transitions-for-vintage-videos-30042779/ (и 30042778) · реакции https://www.pexels.com/search/videos/facepalm/ | MP4 до 4K (≈ 33 с у Baarast); любой редактор | бесплатно | Pexels License; коммерция да | не нужна | нельзя перепродавать неизменённые копии и выкладывать на другие стоки; узнаваемых людей не показывать в плохом свете | засветки/film burn (тихо), реакции людей. Cloudflare 403, API — ключ |
| **Freesound.org** (только CC0 / CC BY) — https://freesound.org | оригиналы WAV/FLAC/AIFF/MP3; публичные превью MP3/OGG ~128–192 kbps. **С 24.10 оригиналы качаются через официальный API** (`~/shorts/tools/freesound.py`, токен владельца; лимит 60 запросов/мин, 2000/день) — так получены 60 SFX раздела 1 | бесплатно | у каждого звука своя: CC0 / CC BY 4.0 — да; **CC BY-NC — нельзя**; Sampling+ — пропускать | CC BY — да; CC0 — нет | оригиналы только с аккаунтом | реальные записи (животные, предметы эпохи, толпы) под конкретные истории. Без логина можно HQ-превью CC0 (так сделано в Pig War, качество ниже) |
| **Zapsplat** — https://www.zapsplat.com | MP3 (free), WAV (Premium) | free с аккаунтом / Premium платно | Zapsplat Standard License; коммерция да | на free-плане обязательна: «Sound effects from zapsplat.com» | аккаунт; нельзя распространять отдельно; 403 для скриптов | большая общая библиотека (касса, мультяшные, foley) |
| **Uppbeat** — https://uppbeat.io/ | MP3 | free с аккаунтом / Premium | лицензия Uppbeat (credit-код на видео); коммерция по плану | free: credit-код в описании каждого видео | аккаунт; 429 для скриптов; Content ID средний на free (claim снимается кредитом) | современная «креаторская» музыка |
| **Free Music Archive** (напр. HoliznaCC0) — https://freemusicarchive.org/music/holiznacc0/ | MP3 | бесплатно | по треку: CC0 / CC BY / CC BY-SA — да; **много NC/ND — нельзя** | по лицензии | скачивание ведёт на /login + оверлей «I understand and agree» | CC0 lo-fi и ambient-подложки |
| **LottieFiles** free animations — https://lottiefiles.com/free-animations/arrow | Lottie JSON / dotLottie; @remotion/lottie, lottie-web, After Effects | бесплатно | Lottie Simple License; коммерция да | не обязательна | распространение на тех же условиях; нельзя собирать конкурирующий сервис | анимированные стрелки, подчёркивания, конфетти. Кнопка Download требует логина. Класть в `03_Assets/Animations/lottie/` |
| **Sonniss #GameAudioGDC** (2015–2026) — https://sonniss.com/gameaudiogdc | WAV 24 bit 48–96 kHz | бесплатно | Sonniss GDC Bundle License v2.0; коммерция да, без ограничения проектов | не нужна | 20–30+ ГБ на бандл; нельзя распространять звуки (сырые и изменённые), нельзя для обучения AI; делиться только внутри команды | профессиональные whoosh/impact/ambience/foley. Огромные архивы + Cloudflare 403; владелец может взять 1–2 папки категорий |
| **FreeVisuals** LUT-паки — https://www.freevisuals.net/luts/free-10-cinematic-luts-pack | .cube; Premiere, Resolve, FCP, CapCut, ffmpeg | бесплатно (аккаунт) | FreeVisuals Free Asset licence (ToS §3); коммерция да | не нужна | по ToS бесплатное — только для зарегистрированных | кинематографичные LUT. Нужен аккаунт |
| **IWLTBAP / Lutify.me / Ground Control** — https://iwltbap.com · https://lutify.me · https://groundcontrolcolor.com | .cube | бесплатно по e-mail подписке | EULA вендоров; коммерция в основном да | по-разному | нужна подписка e-mail | плёночные эмуляции |
| **Lordicon** — https://lordicon.com | Lottie JSON | free tier / платно | free-лицензия Lordicon (детально не проверена) | на free — обязательна | аккаунт; ограничения на распространение | анимированные UI-иконки — **не рекомендуем** (есть Noto + Lucide/Tabler) |

### 12.B Бесплатно и допустимо, сознательно не брали (запас и альтернативы — можно скачать скриптом позже)

| Ресурс и ссылка | Что внутри · форматы | Цена | Лицензия · коммерция | Атрибуция | Ограничения | Для чего · почему не взяли |
|---|---|---|---|---|---|---|
| **Wikimedia Commons, аудио** — https://commons.wikimedia.org/wiki/Category:Sound_effects | OGG/OPUS/WAV/FLAC/MP3 | бесплатно | по файлу: PD / CC0 / CC BY / CC BY-SA — да | CC BY / BY-SA — да | качество разное (многие PD — перекодировки 128 kbps с pdsounds.org); бывают «own work»-перезаливы чужих звуков | оценены и отложены: «277021 sandermotions applause-2.wav» (CC0), «72844 lonemonk approx-800-laughter-and-clapter-1.wav» (CC BY 3.0), «WWS Typewriter.ogg» (CC BY 4.0), «406243 stubb typewriter-ding-near-mono.wav» (CC0), «Turning a page.ogg», «Holga shuttersound.ogg», PD-атмосферы (Restaurant ambience, Shopping mall less crowded, Gentle breeze and birds singing, Rain against the window). С 24.10 стартовые SFX — оригиналы Freesound CC0 (раздел 1) |
| **OpenGameArt.org** (CC0 audio) — https://opengameart.org/art-search-advanced?field_art_type_tid%5B%5D=13 | OGG/WAV/MP3 в zip | бесплатно | по ассету: CC0 / CC BY / CC BY-SA — да; GPL/OGA-BY — осторожно | по лицензии | игровая направленность, качество разное | CC0 boing, ретро-SFX, атмосферы парков (уже были в Pig War); стартовые категории закрыли Freesound CC0 + Kenney |
| **SoundBible** — https://soundbible.com | MP3/WAV | бесплатно | по файлу: PD / CC BY 3.0 / часть только личное | CC BY 3.0 — имя автора | перезаливы в других местах часто теряют лицензию | классика мультяшных звуков и кассы — только после проверки лицензии на самом SoundBible |
| **ccMixter** — https://ccmixter.org/ | MP3 | бесплатно | CC по треку (много BY-NC — нельзя); только CC BY / CC0 | по лицензии | смешанные лицензии | альтернативные CC BY инструменталы; для старта не понадобились |
| **Scott Buckley** — https://www.scottbuckley.com.au/library/ | MP3/WAV, cinematic/оркестр/ambient | бесплатно | CC BY 4.0; коммерция да | обязательна: «<Title> by Scott Buckley – released under CC-BY 4.0. www.scottbuckley.com.au» | Smart Content ID: без кредита — claim; 6 треков claim'ятся всегда (Undertow, Growing Up, Childhood, Horizons, Jul, Filaments) | не брали: тот же механизм, что у Incompetech, а эпичный оркестр владелец считает пугающим |
| **Incompetech** — остальные 1 443 трека — https://incompetech.com/music/royalty-free/music.html | MP3 320 kbps | бесплатно (CC BY 4.0) / платная Standard License без кредита | CC BY 4.0; коммерция да | в описании обязательна | Content ID средний (кредит в описании снимает claim) | следующие кандидаты: Hidden Agenda, Fluffing a Duck, Scheming Weasel (faster), Wallpaper, Carefree |
| **Mixkit** — остальная музыка https://mixkit.co/free-stock-music/ — **с 24.10 не берём** (все 88 файлов Mixkit в карантине; скриптами к mixkit.co не обращаемся) | MP3 256 kbps | бесплатно | Mixkit Stock Music Free License; YouTube/соцсети/реклама — да | не нужна | нельзя ТВ/радио, CD/DVD, игры, ремикс в чисто музыкальный трек; страницы mixkit.co ограничивают скрипты (429) | шорт-лист: Sicilian Coffee #613, Fallen (Asper) #565, Feedback Dreams #588, Year 2001 #860, Epic Games #76 |
| **Mixkit Free** (**с 24.10 не берём**, см. выше) — запасные реакции: #8741 man laughing at phone https://mixkit.co/free-stock-video/man-laughing-out-loud-at-his-cell-phone-8741/ , #100849 employee celebrating | MP4 720/1080 | бесплатно | Mixkit Stock Video Free License; коммерция да | не нужна | User Terms запрещают массовое скачивание | комедия/успех; не брали, чтобы держать набор в 20 клипах |
| **Musopen.org** напрямую — https://musopen.org/music/ | MP3/FLAC | бесплатно с лимитами / платное членство | в основном PD-записи (проверять каждую) | вежливый кредит Musopen | 403 для скриптов, аккаунт и лимиты | PD-классика; взяты официальные копии с Commons |
| **VFX FOOTAGE «--FREE FOOTAGE--»** — остальная серия на Commons: https://commons.wikimedia.org/w/index.php?search=intitle%3A%22FREE+FOOTAGE%22&ns6=1 | WebM, в основном 720p (Smoke 1–4, Color Explosion 1080p, Unsharp Lights, Water Surface, Flicker Plane, Horizontal Shutter Flicker 01–06, Film Damage 2, Black Reveal 2–6, Black Ink) | бесплатно | CC BY 3.0; коммерция да | обязательна | 720p | дым, цветная пудра, боке, мерцание проектора, ещё ink reveal. Не взяли из-за лимита 25 клипов и 429 на upload.wikimedia.org |
| **VHS Glitch Vol. 1 (cut-down) и Vol. 4** — Christopher Huppertz — https://archive.org/details/vhs_glitch_vol_01_cutdown | MOV 1080p 13.4 ГБ / MP4 4K 15–20 ГБ / превью 480p | бесплатно | CC BY 4.0 (автор просит не перезаливать сырые кадры); коммерция да | обязательна | очень большие файлы | настоящие повреждения VHS. Не влезли в бюджет 900 MB; превью 480p слишком мягкие |
| **Film Countdown 1–4** — Ivan Bridgewater — https://archive.org/details/IMB_SF_R30_C4 | AVI/MPG 640×480 | бесплатно | CC BY 3.0; коммерция да | обязательна | только SD 4:3 | ракорд; с 24.10 взят сепийный 1080p с Pixabay (#144961, раздел 5.1) |
| **Commons, CC BY-SA ролики эмоций** (Pleclown: Surprised, Badly surprised, Frowning; Facepalm.webm) — https://commons.wikimedia.org/wiki/Category:Videos_of_facial_expressions | WebM 720p/480p | бесплатно | CC BY-SA 3.0 / 4.0; коммерция да | обязательна + ShareAlike | любительская веб-камера | просмотрены, отклонены по качеству и дублям |
| **Frenchman weeps (1940, Capra)** — https://commons.wikimedia.org/wiki/File:Frenchmanweeps1940.ogv | OGV | бесплатно | PD (US gov); коммерция да | не нужна | реальное горе — только серьёзный контекст WW2 | не мем-реакция по тону |
| **Noto Animated Emoji** — остальные ~860 — https://googlefonts.github.io/noto-emoji-animation/ | Lottie JSON, GIF/WebP/AVIF 512 px | бесплатно | CC BY 4.0; коммерция да | обязательна | — | любые другие реакции: `https://fonts.gstatic.com/s/e/notoemoji/latest/<codepoint>/lottie.json` |
| **Twemoji** (форк jdecked) — https://github.com/jdecked/twemoji · **OpenMoji** — https://openmoji.org · **Phosphor Icons** — https://github.com/phosphor-icons/core | SVG/PNG | бесплатно | Twemoji CC BY 4.0 (графика) / OpenMoji CC BY-SA 4.0 / Phosphor MIT; коммерция да | Twemoji и OpenMoji — да (+SA); Phosphor — нет | — | альтернативные наборы; выбраны Noto (без атрибуции) и Lucide + Tabler |
| **Archivo Black, Unbounded** — https://fonts.google.com/specimen/Unbounded | TTF; Remotion/Blender | бесплатно | OFL-1.1; коммерция да | не нужна | Archivo Black — только латиница; у Unbounded есть кириллица | доп. display-шрифты; лимит 10 семейств |
| **rough-notation / roughjs** — https://github.com/rough-stuff/rough-notation | npm-библиотека JS; Remotion/React | бесплатно | MIT | не нужна | зависимость в проекте | процедурные рисованные подчёркивания/обводки синхронно со словами; есть кодовая альтернатива MarkerRing в `football-222/short/src/ui/vox.tsx` |
| **Q-DDL** 800+ LUT — https://www.cgchannel.com/2020/01/download-800-free-3d-luts/ | .cube/.3dl | бесплатно | CC BY 4.0 (по прессе 2020, перепроверить) | обязательна | ссылки через рекламный сокращатель — не официальный прямой источник | плёночные LUT; не брали до проверки лицензии |

### 12.C Нельзя использовать на монетизируемом канале (статус «не использовать»)

| Ресурс и ссылка | Что это | Лицензия · почему нельзя | Легальная замена |
|---|---|---|---|
| **BBC Sound Effects (RemArc)** — https://sound-effects.bbcrewind.co.uk | WAV/MP3 | RemArc Licence: только личное, учебное, исследовательское; монетизируемый YouTube — коммерция (платно через Pro Sound Effects) | Freesound CC0 / Kenney из раздела 1 |
| **Mixkit Restricted License** — засветки https://mixkit.co/free-stock-video/light-leaks/ (48011, 48012, 48013, 48495, 47259, 47283, 47284, 30722, 30728, 25284, 16110, 46235/46236/46237); плёнка/пыль https://mixkit.co/free-stock-video/film-grain/ (26656, 26657, 25362, 26677, 26676, 47285, 47356); блики https://mixkit.co/free-stock-video/lens-flare/ (21189, 21209, 20380, 48494); дым/огонь https://mixkit.co/free-stock-video/overlay/ (45298, 8461, 46316, 18142, 8468, 38818, 48288); реакции (#22056, #49366, #5647, #23971, #23839, #46376, #5953, #9248, #5416, #23719, #32846) | MP4 720p бесплатно, 4K через Envato | Restricted = только личные некоммерческие проекты, монетизируемый YouTube прямо исключён. Лицензию проверять на странице КАЖДОГО клипа (`videoFree` / `videoRestricted`) | CC BY засветки и плёнка с Commons (раздел 3), клипы Pixabay (раздел 3) |
| **Cinecom LOOK LUT pack** — https://cinecom.gumroad.com/l/LookPack | .cube | free-уровень — только личное некоммерческое | slay (CC BY) и self-made LUT |
| **RawTherapee Film Simulation HaldCLUT** — https://rawpedia.rawtherapee.com/Film_Simulation · **RocketStock / Shutterstock «35 Free LUTs»** — https://www.rocketstock.com/free-after-effects-templates/35-free-luts-for-color-grading-videos/ | HaldCLUT PNG / .cube | лицензию проверить не удалось (404 / 403) — до проверки не использовать | slay и self-made LUT |
| **Фильмы Чаплина** (The Gold Rush 1925, The Kid 1921, короткие 1910-х) — https://commons.wikimedia.org/wiki/File:The_Gold_Rush_(1925).webm | WebM 480×360 | PD только в США; Чаплин — британец, правило более короткого срока не действует: в UK/EU охраняется до 2047; претензии Roy Export; товарный знак | Китон/Ллойд из раздела 5.6 |
| **Metropolis (1927)** — https://archive.org/details/metropolis-1927_202511 | MP4 | PD в США с 2023, в ЕС охраняется до 2046 (Ланг умер в 1976); претензии реставраций | Nosferatu (5.6) |
| **Steamboat Willie (1928)** — https://commons.wikimedia.org/wiki/File:Steamboat_Willie_(1928)_by_Walt_Disney.webm | WebM | фильм PD в США с 2024, но Микки Маус — действующий товарный знак, Content ID | — |
| **32 копирайтных мем-формата** (Confused Travolta, Surprised Pikachu, Stonks, CJ, Drake, Distracted Boyfriend, This Is Fine, Coffin Dance, To Be Continued, Curb credits, Sad Keanu и др.) — `03_Assets/Memes_Reactions/MEME_CATALOG.md` | разное | все права защищены: Content ID, страйки, reused content, товарные знаки | по каждому мему — замена в MEME_CATALOG.md (например, Sad Keanu → Китон на дышле; Confused Travolta → reaction_sad_man_teary_closeup) |
| **Мем-звуки** (vine boom, bruh, «emotional damage», GTA SA «here we go again», цитаты из кино/ТВ) | разное | копирайт игр/кино/ТВ; саундборды лицензии не дают | SFX раздела 1 (record_scratch, boing_jaw_harp, dizzy_whistle_birds, horn_wahwah_fail) |
| **Материалы CapCut** | звуки, шрифты, стили | Materials License: обычные — только личное некоммерческое; «commercial» — только для публикации на CapCut/TikTok, YouTube нет | — |
| **FreePD.com** — https://freepd.com/ | — | сайт закрыт навсегда (2008–2025) | Commons PD-записи |

### 12.D Платные (на случай роста канала; сейчас не нужны)

| Ресурс и ссылка | Что внутри · форматы | Цена (проверять на сайте) | Лицензия · коммерция | Атрибуция | Ограничения | Для чего |
|---|---|---|---|---|---|---|
| **Epidemic Sound** — https://www.epidemicsound.com/ | MP3/WAV/stems | подписка | лицензия подписки; коммерция пока подписка активна | нет | аккаунт; Content ID низкий после привязки канала | большой безопасный музыкальный каталог |
| **Artlist** — https://artlist.io/ | WAV/MP3 | подписка | лицензия Artlist; коммерция да | нет | аккаунт; низкий риск после whitelist | премиальная кино-музыка |
| **Envato Elements** — https://elements.envato.com/ | ProRes 4444 с альфой, MP4, .cube, шаблоны, музыка, SFX | ≈ $16.50/мес при годовой оплате (≈ $33 помесячно) | лицензия Elements; коммерция при активной подписке на момент скачивания | нет | платно | оверлеи с альфой, засветки, film burn, Mixkit 4K |
| **Motion Array** — https://motionarray.com/pricing/ | MOV/MP4, .cube, шаблоны | ≈ $20–30/мес | лицензия Motion Array; коммерция да | нет | платно | оверлеи, переходы |
| **RocketStock (платные паки) / Rampant Design Tools** — https://www.rocketstock.com/ · https://rampantdesigntools.com/ | ProRes с альфой 4K–8K | от десятков до сотен USD за пак | EULA вендора; коммерция да | нет | платно | high-end film burn, засветки, ink-переходы |
| **Zapsplat Premium**, **Uppbeat Premium**, **Incompetech Standard License**, **Lordicon** (платный) | WAV без атрибуции / музыка без credit-кода / треки MacLeod без кредита / анимированные иконки | подписка или разово | коммерция да | нет | платно, аккаунт | если надоест ставить кредиты |
| **BBC Sound Effects — коммерческая лицензия** через Pro Sound Effects | WAV | платно | коммерция по договору | по договору | платно | архивные звуки BBC |

---

## 13. Уже есть в ~/shorts (переиспользовать; в 03_Assets не копировалось)

### 13.1 Звук
| Путь | Что | Лицензия | Как использовать |
|---|---|---|---|
| `~/shorts/atlas-ape/ai-farm-girl/short/public/sfx` (+ копии в football-222/short, pig-war/short{,2,3}, yellow-fleet/short{,_b,_bf,_f}, rabbits/short, volcano/short) | канальная SFX-библиотека, 130 записей index.json; 94 процедурных (`tools/sfx.py`, `sfx_rabbits.py`, `sfx_yf.py`) | собственный синтез, без ограничений | копировать нужный WAV + запись index.json |
| `~/shorts/atlas-ape/pig-war/short3/public/sfx` (pig_grunt … wind_meadow, 22 файла) + `~/shorts/atlas-ape/pig-war/short/assets/sfx_src/<звук>/meta.json` | правки реальных записей (`tools/sfx_pig.py`): свинья, мушкет, птицы, дверь, арфа, хор, банкнота, рвущаяся бумага, перо, флейта и барабан, марш, пушка, скрип корабля, паруса, фейерверк, кружки, смех вечеринки, сезонный whoosh, ветер на лугу | в основном CC0 (Freesound HQ previews, Kenney, OpenGameArt) + Commons PD/CC0; **есть CC BY / CC BY-SA источники** — см. раздел 14.4 | брать вместе со строками из `~/shorts/atlas-ape/pig-war/short3/CREDITS.md` |
| `~/shorts/atlas-ape/pig-war/short/assets/sfx_src/_packs` | Kenney CC0: kenney_casino (55), kenney_impact (130), kenney_rpg (52) с License.txt | CC0 1.0 | свободно |
| `~/shorts/atlas-ape/football-222/short/data/sfx_el` (4) и `~/shorts/atlas-ape/ai-farm-girl/short/data/sfx_el` (8) | ElevenLabs: clap_single, crowd_1916, brass_sting, crowd_ooh / cow_moo, city_street, radio_static, heartbeat, meme_boom, **cash_register**, projector, phone_buzz | ElevenLabs **PAID** Starter (`tools/sfx_el.py`), коммерция да | `cash_register.wav` (в ai-farm-girl/short/public/sfx) закрывает единственный пробел библиотеки |
| `~/shorts/auto-technik/public/sfx` (72 WAV, `data/sfx.json`) | механика, UI, whoosh, riser (whoosh_fast, sub_drop, glitch_short, camera_shutter_soft, heartbeat_low, riser_tension …) | собственный синтез (ASSETS.md: без сэмплов и загрузок) | свободно |
| `~/shorts/oel-1941/out/sfx` (55 WAV) | мультяшные и картографические: boing, record_scratch, pop, click, paper_rustle, riser_hit … | собственный синтез | свободно |
| `~/shorts/deutschland-geschichte/public/sfx` (14 WAV) | boom, swoosh, paper, pop, stamp, sting, tick, type, water … | собственный синтез | свободно |
| `~/shorts/atlas-ape/music_calm` | 6 треков YouTube Audio Library: **Frame-Dragging** (The Grey Room / Density & Time, 201.6 с, 136 BPM, E major, спокойная часть с 99.5 с — канальный bed), A Single Step (173.3 с, 144 BPM), Science Montage (195.5 с, 118 BPM, 30 stingers), Marimba Chill (149.3 с, 161 BPM), Quirk n Twerk (116.7 с, 74 BPM, quirky), Taking Flight (106.4 с, 130 BPM); `analysis.json` (key, BPM, яркость, бас, stingers, спокойный фрагмент), `previews/` (3 по 1.8 MB) | YouTube Audio Library — только YouTube. Frame-Dragging: атрибуция не нужна (записано в CREDITS rabbits/yellow-fleet/ai-farm-girl); у остальных пяти тип лицензии **не сверен** | Content ID — самый низкий риск; в миксе −21.6 dB + ducking. Владельцу один раз сверить «License type» в Studio |
| `~/shorts/atlas-ape/volcano/music_candidates` | 6 cinematic-треков YTAL + mood.json + fit.png | YouTube Audio Library | то же |
| **НЕ использовать:** `~/shorts/atlas-ape/volcano/short/data/sfx_el/*.mp3` → `public/sfx/*_el.wav` + `crowd_cheer_short.wav` (скопированы во все 11 Atlas-библиотек) | explosion_big_el, steam_hiss_big_el, biplane_flyby_el, bomb_whistle_el, fissure_rip_el, lava_fountain_el, ship_horn_low_el, lava_crackle_el, boats_engines_el, crowd_cheer_short | ElevenLabs **FREE** (`~/shorts/orangutan/.env` через `tools/sfx_eleven.py`) = некоммерческие, нужен «11.ai» в title; апгрейд не перелицензирует. В поздних index.json ошибочно помечены `procedural` | `crowd_cheer_short` (sha256 33a2c5a0…) звучит в ai-farm-girl и yellow-fleet. Замена: `03_Assets/Sound_Effects/crowd_reaction/sfx_crowd_ovation_small_freesound_32260.wav`, удары из раздела 1.2, или перегенерация на PAID-ключе |
| **НЕ использовать:** `~/shorts/atlas-ape/ai-farm-girl/short/public/sfx/cj_here_we_go.wav`, `cj_cut.wav` | цитата из GTA San Andreas | копирайт Rockstar Games; OK владельца только для ep. 6 | в общую библиотеку не копировать |
| `~/shorts/*/out/sound`, `~/shorts/barbarossa-1941-v2/data/sound`; `~/shorts/autokrise-2026-v2/public/sfx` | рендеры миксов и стемов; пустая папка | производные | не источники |

### 13.2 Визуальный код и графика
| Путь | Что | Лицензия | Заметка |
|---|---|---|---|
| `~/shorts/atlas-ape/football-222/short/src/ui/vox.tsx` + `public/fx/grain_0..7.png` + `public/vox/paper.jpg` | Vox-кит в коде: Grain (8 кадров шума 1080×1920, overlay), PaperBg с виньеткой, Torn с лентой, MarkerRing, Shake, Dust, SpeedLines, SEPIA | собственный код; `paper.jpg` в CREDITS проекта помечен «channel kit, Pig War v3» | зерно процедурное — поэтому зерно не скачивали; файлы библиотеки добавляют реальные повреждения плёнки, пыль, бумагу и складки |
| `~/shorts/atlas-ape/pig-war/short3/src/ui/gfx.tsx` (то же в football-222 и ai-farm-girl) | LightLeak (круглый аддитивный блоб), Flash, Duotone, PhotoKB, BigText с RGB-split, Layer cross-dissolve; токены GOLD/GOLD2/TEAL/INK, stroke(), Pin | собственный код | кодовая засветка — идеальный круг; CC BY засветки дают органику |
| `~/shorts/atlas-ape/pig-war/short3/src/ui/real.tsx` | GRADE {sat 1.22, con 1.07, bri 1.03, warm 0.12} + Look | собственный код | воспроизведён в self-made LUT `lut_atlas_pop_warm/neutral` |
| `~/shorts/atlas-ape/pig-war/short3/src/Short.tsx` | transition engine: zoomthru, whipL/R, up, circle, diag, punch, fade | собственный код | файлы библиотеки добавляют органические маски (жидкость, чернила, бумага, прожог, кляксы) |
| `~/shorts/atlas-ape/pig-war/short3/src/ui/draw.tsx` | Burst, Confetti, Seal, Coin, лучи фона | собственный код | спрайты Kenney подходят к этому стилю |
| `~/shorts/atlas-ape/ai-farm-girl/short` (CREDITS: glitch / pixel break-up в коде) | пиксельный мозаичный глитч для стоп-кадров | собственный код | клипы Pixabay из 3.3 добавляют движущиеся ТВ-помехи и цифровой глитч |
| `~/shorts/atlas-ape/ai-farm-girl/short/public/film/keaton_run.mp4` | вставка «The General» (1926) | PD | владелец отклонил как случайный кадр → урок: только узнаваемые моменты поверх предыдущего кадра |
| `~/shorts/auto-technik/public/hdri` (9 HDRI), `stock/` (6 клипов Pexels + `stock_sources.txt`) | студийные HDRI Poly Haven 2k; стоковые клипы с лицензией и таймкодами | CC0; Pexels License | HDRI для Blender/three.js; образец stock-лога для спора с ложным Content ID |
| `~/shorts/barbarossa-1941-v2/data/dl`, `~/shorts/deutschland-geschichte/data/raw` | Natural Earth: ne_10m_land, реки, батиметрия, растры NE1_HR_LC, NE1_HR_LC_SR_W_DR, SR_HR | Public domain | для WW2 — границы 1937/39 |

### 13.3 Шрифты, субтитры, Atlas
| Путь | Что | Лицензия | Заметка |
|---|---|---|---|
| `~/shorts/channel-branding/kit/fonts/Montserrat-VF.ttf` | Montserrat variable v9.000 + OFL.txt | OFL-1.1 | та же версия, что `03_Assets/Fonts/Montserrat` |
| `~/shorts/atlas-ape/rabbits/short/assets/fonts/Anton-Regular.ttf` | Anton Regular v2.116 | OFL-1.1 | побайтно совпадает (sha256) с `03_Assets/Fonts/Anton/Anton-Regular.ttf` |
| `~/shorts/atlas-ape/pig-war/short3/src/ui/Subtitles.tsx` | пословные субтитры (Montserrat 900, 54 px, stroke 9 INK, золотые ключевые слова, показ только во время речи) | собственный код | основа пресета A; убрать rotate −6° из pop-анимации |
| `~/shorts/atlas-ape/pig-war/short3/src/fonts.ts` | `@remotion/google-fonts` loadFont Montserrat + Anton, subsets `['latin']` | собственный код | для RU/DE добавить `cyrillic` / `latin-ext` или перейти на локальные файлы |
| `~/shorts/orangutan` | rig Atlas: 13 эмоций (neutral, sarcastic, happy, laughing, excited, surprised, thinking, sad, angry, confused, skeptical, suspicious, sleepy), 31 анимация (surprise_reaction, facepalm, laugh, shrug, thumbs_up, ok_sign, wink, nod, shake_head, thinking, look_left/right, point, magnifier_look, phone_look …; sit недоступна); ProRes 4444 alpha: `out/reel_2_emotions/reel_2_emotions_alpha.mov` (20 с, все эмоции), `out/reel_3_gestures/reel_3_gestures_alpha.mov` | арт владельца (assets/source, SHA-256 зафиксированы) | только из арта владельца, только реакция (хук/твист/финал) |
| `~/shorts/atlas-ape/football-222/short/public/atlas/atlas_shock.png`, `atlas_clap.png`; `~/shorts/atlas-ape/ai-farm-girl/short/public/atlas/atlas_thumbs_phone.png`; `~/shorts/orangutan/pose_pack/in/*.png` | Gemini pose cards Atlas (shock, clap, thumbs-up с телефоном, salute, gen_2–5) | генерации владельца по его референсам | одобрены в сданных Shorts; новые делает только владелец, считаются в лимит AI-кадров |

---

## 14. ATTRIBUTION — точные строки кредитов

Из замен Mixkit 24.10 атрибуция обязательна только у 8 треков Kevin MacLeod (CC BY 4.0, 14.1). 60 SFX Freesound — CC0, 19 клипов Pixabay — Pixabay Content License: подпись не нужна (14.5).

Правило: строку ставить в **описание ролика** (и в `CREDITS.md` проекта) только для файлов, которые реально вошли в ролик, и **до публикации**. Если файл кадрировали, красили, смешивали или перекодировали — дописать «(modified)»: CC BY требует указать изменения. Ссылка на текст лицензии обязательна.

### 14.1 Музыка — CC BY 4.0 (обязательно; без кредита в описании будет Content ID claim) — 10 треков Kevin MacLeod
```
"Investigations" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/
```
```
"Sneaky Snitch" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/
```

```
"Teddy Bear Waltz" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/
```
```
"Mirage" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/
```
```
"Americana" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/
```
```
"Eternal Hope" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/
```
```
"Mischief Maker" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/
```
```
"Immersed" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/
```
```
"Soaring" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/
```
```
"Exit the Premises" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/
```
Кредит ставить только для треков, которые вошли в ролик; если в ролике несколько треков MacLeod — каждый своим блоком. Готовый блок всех восьми — поле `description_credits_block` в `music_replacement.json`.

### 14.2 Визуальные эффекты — CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/) и CC BY 4.0
```
"Light Leaks 1 --FREE FOOTAGE--" by VFX FOOTAGE, via Wikimedia Commons, CC BY 3.0 — https://commons.wikimedia.org/wiki/File:Light_Leaks_1_--FREE_FOOTAGE--.webm
"Light Leaks 5 --FREE FOOTAGE--" by VFX FOOTAGE, via Wikimedia Commons, CC BY 3.0 — https://commons.wikimedia.org/wiki/File:Light_Leaks_5_--FREE_FOOTAGE--.webm
"Light Leaks 6 --FREE FOOTAGE--" by VFX FOOTAGE, via Wikimedia Commons, CC BY 3.0 — https://commons.wikimedia.org/wiki/File:Light_Leaks_6_--FREE_FOOTAGE--.webm
"Old8mm (HD) --FREE FOOTAGE--" by VFX FOOTAGE, via Wikimedia Commons, CC BY 3.0 — https://commons.wikimedia.org/wiki/File:Old8mm_(HD)_--FREE_FOOTAGE--.webm
"Film Damage 1 --FREE FOOTAGE--" by VFX FOOTAGE, via Wikimedia Commons, CC BY 3.0 — https://commons.wikimedia.org/wiki/File:Film_Damage_1_--FREE_FOOTAGE--.webm
"Dust Particles 1 --FREE FOOTAGE--" by VFX FOOTAGE, via Wikimedia Commons, CC BY 3.0 — https://commons.wikimedia.org/wiki/File:Dust_Particles_1_--FREE_FOOTAGE--.webm
"Dust Particles 3 (multiply) --FREE FOOTAGE--" by VFX FOOTAGE, via Wikimedia Commons, CC BY 3.0 — https://commons.wikimedia.org/wiki/File:Dust_Particles_3_(multiply)_--FREE_FOOTAGE--.webm
"Black Reveal 1 --FREE FOOTAGE--" by VFX FOOTAGE, via Wikimedia Commons, CC BY 3.0 — https://commons.wikimedia.org/wiki/File:Black_Reveal_1_--FREE_FOOTAGE--.webm
"Film Burn Special Effect" by Jeffrey Beach (Beachfront Productions), CC BY 3.0, via Internet Archive — https://archive.org/details/FilmBurn (re-encoded)
LUT: slay — slaycamera.com (CC BY 4.0, https://creativecommons.org/licenses/by/4.0/)
```
Соответствие файлам: `overlay_light_leaks_01/05/06_720p_vfxfootage_ccby.webm`, `overlay_old_8mm_film_grain_gate_720p_vfxfootage_ccby.webm`, `overlay_film_damage_scratches_720p_vfxfootage_ccby.webm`, `overlay_dust_particles_screen/multiply_720p_vfxfootage_ccby.webm`, `transition_black_ink_reveal_01_720p_vfxfootage_ccby.webm`, `transition_film_burn_flicker_1080p_beachfront_ccby.mp4`, `slay-01…05-*.cube`. Список по файлам — `03_Assets/Licenses/ATTRIBUTION_visuals.md`.
Короткий вариант, если вошло несколько: `Visual FX: VFX FOOTAGE via Wikimedia Commons (CC BY 3.0); Film burn: Jeffrey Beach / Beachfront Productions (CC BY 3.0); LUT: slay — slaycamera.com (CC BY 4.0). Links: <ссылки на страницы файлов выше>`

### 14.3 Реакции и анимации
```
Animated emoji: Noto Emoji Animation by Google, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)
```
Строка Noto — одна на ролик, сколько бы эмодзи ни вошло. CC BY-SA «Rolling eyes» в карантине с 24.10: строка не нужна, пока файл не вернут (тогда текст — в `03_Assets/Licenses/wikimedia_commons_video_LICENSE.md`).

### 14.4 Уже существующие звуки с CC BY / CC BY-SA (если берёте правки из pig-war/short3)
Из `~/shorts/atlas-ape/pig-war/short3/CREDITS.md` (переносить строки целиком, с URL):
```
«WWS Woodenwagon.ogg» — Work With Sounds / Museum of Municipal Engineering — CC BY 4.0 — https://commons.wikimedia.org/wiki/File:WWS_Woodenwagon.ogg (used in: cannon_roll)
```
Там же есть другие CC BY / CC BY-SA источники (Menschen-Lachen.ogg — CC BY-SA 4.0; 72842 lonemonk approx-800-laugh-1.wav — CC BY 3.0; Pig grunt - Erdie.ogg — CC BY 3.0; Mudchute pig 1–3.ogg — CC BY-SA 3.0; Boar.Grwls(1).ogg — CC BY-SA 4.0; WWS Cattleshed.ogg — CC BY 4.0). Лог агента SFX называл только cannon_roll — **перед использованием любой правки pig-war проверять её строку в CREDITS.md**.

### 14.5 По желанию (не обязательно, вежливость)
- PD-музыка: `In the Hall of the Mountain King — Edvard Grieg, Musopen Symphony (Musopen, public domain)` · `Gymnopédie No. 1 — Erik Satie, piano Robin Alciatore (Musopen, public domain)` · `Flight of the Bumblebee — Rimsky-Korsakov, U.S. Air Force Band Strolling Strings (public domain)`.
- PD-фильмы и NASA (готовые строки — поле `attribution_text` в `02_Research/download_logs/memes.json`), например: `Safety Last! (1923), Hal Roach Studios / Pathé — public domain (Wikimedia Commons)`, `Footage: NASA/JSC (Rad Sinyak) — public domain`. Для NASA — без намёка на одобрение агентства.
- Freesound CC0, Pixabay, Kenney, ambientCG, Poly Haven, Google Fonts, Lucide, Tabler, Noto Emoji (статичные), Openclipart, self-made — атрибуция не нужна; в `CREDITS.md` проекта всё равно пишем источник и лицензию. Вежливые строки по желанию: `Sound effects: freesound.org (CC0) — <автор>` (автор — поле `author` в `freesound.json`), `Video by <автор> from Pixabay` (поле `author` в `pixabay.json`).

---

## 15. Карантин Mixkit (24.10): 88 файлов, не использовать

Причина: файлы скачаны скриптом с assets.mixkit.co, а User Terms Mixkit (разд. 9) запрещают массовое скачивание скриптами и ботами. Решение владельца 24.10 — заменить лицензированными аналогами и убрать Mixkit из библиотеки. Ничего не удалено: путь внутри `03_Assets/_quarantine/mixkit/` повторяет прежний путь в `03_Assets/`; sha256 после переноса совпал у всех 88. Записи логов перенесены в массив `quarantined` (`sfx.json`, `music.json`, `visuals.json`, `memes.json`; поля `original_file`, `replaced_by`, `replacement_match`). Подробности и порядок возврата — `03_Assets/_quarantine/README.md`.

| # | Файл Mixkit — где лежит сейчас | Замена | Совпадение |
|---|---|---|---|
| 1 | `03_Assets/_quarantine/mixkit/Sound_Effects/whoosh/whoosh_fast_transition_mixkit.wav` | `03_Assets/Sound_Effects/whoosh/sfx_whoosh_fast_transition_freesound_169867.wav` | хорошее |
| 2 | `03_Assets/_quarantine/mixkit/Sound_Effects/whoosh/whoosh_cinematic_fast_mixkit.wav` | `03_Assets/Sound_Effects/whoosh/sfx_whoosh_cinematic_fast_freesound_648729.wav` | хорошее |
| 3 | `03_Assets/_quarantine/mixkit/Sound_Effects/whoosh/whoosh_air_short_mixkit.wav` | `03_Assets/Sound_Effects/whoosh/sfx_whoosh_air_soft_freesound_425693.wav` | хорошее |
| 4 | `03_Assets/_quarantine/mixkit/Sound_Effects/whoosh/swish_quick_accent_mixkit.wav` | `03_Assets/Sound_Effects/whoosh/sfx_swish_quick_accent_freesound_72190.wav` | хорошее |
| 5 | `03_Assets/_quarantine/mixkit/Sound_Effects/whoosh/whoosh_zoom_vacuum_mixkit.wav` | `03_Assets/Sound_Effects/whoosh/sfx_whoosh_zoom_warp_in_freesound_735062.wav` | частичное |
| 6 | `03_Assets/_quarantine/mixkit/Sound_Effects/whoosh/whoosh_long_windy_mixkit.wav` | `03_Assets/Sound_Effects/whoosh/sfx_whoosh_long_windy_freesound_423799.wav` | хорошее |
| 7 | `03_Assets/_quarantine/mixkit/Sound_Effects/whoosh/whoosh_long_tunnel_reverb_mixkit.wav` | `03_Assets/Sound_Effects/whoosh/sfx_whoosh_long_dark_tail_freesound_341281.wav` | хорошее |
| 8 | `03_Assets/_quarantine/mixkit/Sound_Effects/impact/impact_boom_intro_mixkit.wav` | `03_Assets/Sound_Effects/impact/sfx_impact_cinematic_boom_freesound_255111.wav` | хорошее |
| 9 | `03_Assets/_quarantine/mixkit/Sound_Effects/impact/impact_quick_zoom_mixkit.wav` | `03_Assets/Sound_Effects/impact/sfx_impact_quick_hit_freesound_755054.wav` | хорошее |
| 10 | `03_Assets/_quarantine/mixkit/Sound_Effects/impact/impact_wood_hard_hit_mixkit.wav` | `03_Assets/Sound_Effects/impact/sfx_impact_wood_thud_freesound_447922.wav` | хорошее |
| 11 | `03_Assets/_quarantine/mixkit/Sound_Effects/impact/impact_stomp_heavy_mixkit.wav` | `03_Assets/Sound_Effects/impact/sfx_impact_stomp_heavy_freesound_372517.wav` | хорошее |
| 12 | `03_Assets/_quarantine/mixkit/Sound_Effects/riser/riser_reverse_build_hardstop_mixkit.wav` | `03_Assets/Sound_Effects/riser/sfx_riser_reverse_impact_freesound_244249.wav` | частичное |
| 13 | `03_Assets/_quarantine/mixkit/Sound_Effects/riser/riser_wind_swell_mixkit.wav` | `03_Assets/Sound_Effects/riser/sfx_riser_wind_rising_freesound_403003.wav` | частичное |
| 14 | `03_Assets/_quarantine/mixkit/Sound_Effects/riser/riser_tech_choir_mixkit.wav` | `03_Assets/Sound_Effects/riser/sfx_riser_build_noise_synth_freesound_334525.wav` | частичное |
| 15 | `03_Assets/_quarantine/mixkit/Sound_Effects/riser/swell_magic_whip_short_mixkit.wav` | `03_Assets/Sound_Effects/riser/sfx_swell_reverse_guitar_short_freesound_564442.wav` | хорошее |
| 16 | `03_Assets/_quarantine/mixkit/Sound_Effects/riser/swell_dark_sweep_mixkit.wav` | `03_Assets/Sound_Effects/riser/sfx_swell_dark_creepy_whoosh_freesound_840812.wav` | хорошее |
| 17 | `03_Assets/_quarantine/mixkit/Sound_Effects/glitch/glitch_static_short_mixkit.wav` | `03_Assets/Sound_Effects/glitch/sfx_glitch_static_interference_freesound_347698.wav` | хорошее |
| 18 | `03_Assets/_quarantine/mixkit/Sound_Effects/glitch/glitch_digital_break_mixkit.wav` | `03_Assets/Sound_Effects/glitch/sfx_glitch_digital_corruption_freesound_348585.wav` | хорошее |
| 19 | `03_Assets/_quarantine/mixkit/Sound_Effects/glitch/glitch_intro_text_mixkit.wav` | `03_Assets/Sound_Effects/glitch/sfx_glitch_text_loop_freesound_350614.wav` | хорошее |
| 20 | `03_Assets/_quarantine/mixkit/Sound_Effects/glitch/glitch_rewind_transition_mixkit.wav` | `03_Assets/Sound_Effects/glitch/sfx_glitch_tape_rewind_freesound_753653.wav` | частичное |
| 21 | `03_Assets/_quarantine/mixkit/Sound_Effects/ui_pop_click/pop_light_whoosh_mixkit.wav` | `03_Assets/Sound_Effects/ui_pop_click/sfx_pop_light_mouth_freesound_245645.flac` | хорошее |
| 22 | `03_Assets/_quarantine/mixkit/Sound_Effects/ui_pop_click/pop_hard_click_mixkit.wav` | `03_Assets/Sound_Effects/ui_pop_click/sfx_pop_hard_lips_freesound_202230.wav` | хорошее |
| 23 | `03_Assets/_quarantine/mixkit/Sound_Effects/comedic/boing_hit_mixkit.wav` | `03_Assets/Sound_Effects/comedic/sfx_boing_jaw_harp_freesound_540790.wav` | хорошее |
| 24 | `03_Assets/_quarantine/mixkit/Sound_Effects/comedic/slide_whistle_falling_mixkit.wav` | `03_Assets/Sound_Effects/comedic/sfx_slide_whistle_down_freesound_497093.wav` | хорошее |
| 25 | `03_Assets/_quarantine/mixkit/Sound_Effects/comedic/slide_whistle_toy_up_mixkit.wav` | `03_Assets/Sound_Effects/comedic/sfx_slide_whistle_up_freesound_497092.wav` | хорошее |
| 26 | `03_Assets/_quarantine/mixkit/Sound_Effects/comedic/trombone_sad_fail_mixkit.wav` | `03_Assets/Sound_Effects/comedic/sfx_horn_wahwah_fail_freesound_362205.wav` | хорошее |
| 27 | `03_Assets/_quarantine/mixkit/Sound_Effects/comedic/bonk_dazzle_birds_mixkit.wav` | `03_Assets/Sound_Effects/comedic/sfx_dizzy_whistle_birds_freesound_403002.wav` | частичное |
| 28 | `03_Assets/_quarantine/mixkit/Sound_Effects/comedic/record_scratch_freeze_mixkit.wav` | `03_Assets/Sound_Effects/comedic/sfx_record_scratch_freesound_431774.flac` | хорошее |
| 29 | `03_Assets/_quarantine/mixkit/Sound_Effects/paper_typing_camera/typewriter_typing_burst_mixkit.wav` | `03_Assets/Sound_Effects/paper_typing_camera/sfx_typewriter_typing_freesound_204465.wav` | хорошее |
| 30 | `03_Assets/_quarantine/mixkit/Sound_Effects/paper_typing_camera/typewriter_single_key_mixkit.wav` | `03_Assets/Sound_Effects/paper_typing_camera/sfx_typewriter_single_key_freesound_380138.wav` | хорошее |
| 31 | `03_Assets/_quarantine/mixkit/Sound_Effects/paper_typing_camera/typewriter_return_bell_mixkit.wav` | `03_Assets/Sound_Effects/paper_typing_camera/sfx_typewriter_bell_freesound_318687.wav` | частичное |
| 32 | `03_Assets/_quarantine/mixkit/Sound_Effects/paper_typing_camera/camera_shutter_click_mixkit.wav` | `03_Assets/Sound_Effects/paper_typing_camera/sfx_camera_shutter_dslr_freesound_170229.aiff` | хорошее |
| 33 | `03_Assets/_quarantine/mixkit/Sound_Effects/paper_typing_camera/paper_page_turn_big_mixkit.wav` | `03_Assets/Sound_Effects/paper_typing_camera/sfx_paper_page_turn_freesound_346835.wav` | хорошее |
| 34 | `03_Assets/_quarantine/mixkit/Sound_Effects/paper_typing_camera/paper_slide_mixkit.wav` | `03_Assets/Sound_Effects/paper_typing_camera/sfx_paper_slide_table_freesound_464302.wav` | хорошее |
| 35 | `03_Assets/_quarantine/mixkit/Sound_Effects/paper_typing_camera/paper_crumple_quick_mixkit.wav` | `03_Assets/Sound_Effects/paper_typing_camera/sfx_paper_crumple_quick_freesound_398897.wav` | хорошее |
| 36 | `03_Assets/_quarantine/mixkit/Sound_Effects/paper_typing_camera/paper_newspaper_drop_mixkit.wav` | `03_Assets/Sound_Effects/paper_typing_camera/sfx_paper_newspaper_drop_freesound_67034.wav` | хорошее |
| 37 | `03_Assets/_quarantine/mixkit/Sound_Effects/paper_typing_camera/paper_signing_pen_mixkit.wav` | `03_Assets/Sound_Effects/paper_typing_camera/sfx_paper_signing_pen_freesound_326961.wav` | хорошее |
| 38 | `03_Assets/_quarantine/mixkit/Sound_Effects/cash_coin/coins_clinking_mixkit.wav` | `03_Assets/Sound_Effects/cash_coin/sfx_coins_clinking_hands_freesound_336567.wav` | хорошее |
| 39 | `03_Assets/_quarantine/mixkit/Sound_Effects/cash_coin/money_bag_drop_mixkit.wav` | `03_Assets/Sound_Effects/cash_coin/sfx_money_bag_freesound_338260.wav` | хорошее |
| 40 | `03_Assets/_quarantine/mixkit/Sound_Effects/cash_coin/coin_gold_prize_mixkit.wav` | `03_Assets/Sound_Effects/cash_coin/sfx_coin_bling_win_freesound_443334.wav` | хорошее |
| 41 | `03_Assets/_quarantine/mixkit/Sound_Effects/crowd_reaction/gasp_male_astonished_mixkit.wav` | `03_Assets/Sound_Effects/crowd_reaction/sfx_gasp_male_shocked_freesound_677888.wav` | хорошее |
| 42 | `03_Assets/_quarantine/mixkit/Sound_Effects/crowd_reaction/gasp_female_astonished_mixkit.wav` | `03_Assets/Sound_Effects/crowd_reaction/sfx_gasp_female_freesound_509883.wav` | хорошее |
| 43 | `03_Assets/_quarantine/mixkit/Sound_Effects/crowd_reaction/crowd_laugh_short_mixkit.wav` | `03_Assets/Sound_Effects/crowd_reaction/sfx_crowd_laugh_small_freesound_324894.wav` | хорошее |
| 44 | `03_Assets/_quarantine/mixkit/Sound_Effects/crowd_reaction/crowd_laugh_big_mixkit.wav` | `03_Assets/Sound_Effects/crowd_reaction/sfx_crowd_laugh_clap_bar_freesound_397034.wav` | хорошее |
| 45 | `03_Assets/_quarantine/mixkit/Sound_Effects/crowd_reaction/crowd_ovation_small_mixkit.wav` | `03_Assets/Sound_Effects/crowd_reaction/sfx_crowd_ovation_small_freesound_32260.wav` | хорошее |
| 46 | `03_Assets/_quarantine/mixkit/Sound_Effects/crowd_reaction/clap_slow_single_man_mixkit.wav` | `03_Assets/Sound_Effects/crowd_reaction/sfx_clap_solo_freesound_151219.wav` | хорошее |
| 47 | `03_Assets/_quarantine/mixkit/Sound_Effects/crowd_reaction/crowd_cheer_whistle_big_mixkit.wav` | `03_Assets/Sound_Effects/crowd_reaction/sfx_crowd_cheer_whistle_freesound_453863.flac` | хорошее |
| 48 | `03_Assets/_quarantine/mixkit/Sound_Effects/tension_stinger/stinger_deep_heartbeat_impact_mixkit.wav` | `03_Assets/Sound_Effects/tension_stinger/sfx_heartbeat_deep_bass_freesound_595050.wav` | частичное |
| 49 | `03_Assets/_quarantine/mixkit/Sound_Effects/tension_stinger/stinger_horror_hit_mixkit.wav` | `03_Assets/Sound_Effects/tension_stinger/sfx_stinger_horror_stab_freesound_271945.wav` | хорошее |
| 50 | `03_Assets/_quarantine/mixkit/Sound_Effects/tension_stinger/stinger_eerie_trailer_horn_mixkit.wav` | `03_Assets/Sound_Effects/tension_stinger/sfx_stinger_braam_freesound_647712.flac` | хорошее |
| 51 | `03_Assets/_quarantine/mixkit/Sound_Effects/tension_stinger/heartbeat_fast_mixkit.wav` | `03_Assets/Sound_Effects/tension_stinger/sfx_heartbeat_97bpm_freesound_688735.wav` | частичное |
| 52 | `03_Assets/_quarantine/mixkit/Sound_Effects/tension_stinger/clock_tick_tock_close_mixkit.wav` | `03_Assets/Sound_Effects/tension_stinger/sfx_clock_ticking_close_freesound_408741.wav` | хорошее |
| 53 | `03_Assets/_quarantine/mixkit/Sound_Effects/tension_stinger/drum_roll_tension_mixkit.wav` | `03_Assets/Sound_Effects/tension_stinger/sfx_drum_roll_snare_freesound_111653.wav` | частичное |
| 54 | `03_Assets/_quarantine/mixkit/Sound_Effects/ambience/ambience_crowd_talking_loop_mixkit.wav` | `03_Assets/Sound_Effects/ambience/sfx_ambience_crowd_murmur_freesound_432331.wav` | хорошее |
| 55 | `03_Assets/_quarantine/mixkit/Sound_Effects/ambience/ambience_city_day_urban_mixkit.wav` | `03_Assets/Sound_Effects/ambience/sfx_ambience_city_street_day_freesound_723607.wav` | хорошее |
| 56 | `03_Assets/_quarantine/mixkit/Sound_Effects/ambience/ambience_rain_light_loop_mixkit.wav` | `03_Assets/Sound_Effects/ambience/sfx_ambience_rain_light_freesound_167034.wav` | хорошее |
| 57 | `03_Assets/_quarantine/mixkit/Sound_Effects/ambience/ambience_rain_thunderstorm_mixkit.wav` | `03_Assets/Sound_Effects/ambience/sfx_ambience_rain_thunder_freesound_237729.wav` | хорошее |
| 58 | `03_Assets/_quarantine/mixkit/Sound_Effects/ambience/ambience_wind_mountain_mixkit.wav` | `03_Assets/Sound_Effects/ambience/sfx_ambience_wind_howl_freesound_117611.wav` | хорошее |
| 59 | `03_Assets/_quarantine/mixkit/Sound_Effects/ambience/ambience_forest_wind_birds_mixkit.wav` | `03_Assets/Sound_Effects/ambience/sfx_ambience_forest_wind_birds_freesound_288899.wav` | хорошее |
| 60 | `03_Assets/_quarantine/mixkit/Sound_Effects/ambience/ambience_room_tone_cinematic_mixkit.wav` | `03_Assets/Sound_Effects/ambience/sfx_ambience_room_tone_theatre_freesound_144042.wav` | хорошее |
| 61 | `03_Assets/_quarantine/mixkit/Music/curious_light/music_little_bells_diego_nava_mixkit.mp3` | `03_Assets/Music/curious_light/music_teddy_bear_waltz_kevin_macleod_incompetech_usuan1700064.mp3` | близкое |
| 62 | `03_Assets/_quarantine/mixkit/Music/tension_mystery/music_selpan_drone_eugenio_mininni_mixkit.mp3` | `03_Assets/Music/tension_mystery/music_mirage_drone_kevin_macleod_incompetech_usuan1100877.mp3` | близкое |
| 63 | `03_Assets/_quarantine/mixkit/Music/epic_reveal/music_dreaming_big_ahjay_stelino_mixkit.mp3` | `03_Assets/Music/epic_reveal/music_americana_orchestral_kevin_macleod_incompetech_usuan1200092.mp3` | приемлемое–хорошее |
| 64 | `03_Assets/_quarantine/mixkit/Music/epic_reveal/music_lifes_a_movie_arulo_mixkit.mp3` | `03_Assets/Music/epic_reveal/music_eternal_hope_piano_kevin_macleod_incompetech_usuan1100238.mp3` | хорошее |
| 65 | `03_Assets/_quarantine/mixkit/Music/comedic_quirky/music_kidding_around_ahjay_stelino_mixkit.mp3` | `03_Assets/Music/comedic_quirky/music_mischief_maker_kevin_macleod_incompetech_usuan1700009.mp3` | хорошее |
| 66 | `03_Assets/_quarantine/mixkit/Music/documentary_neutral/music_forest_mist_whispers_alejandro_magana_mixkit.mp3` | `03_Assets/Music/documentary_neutral/music_immersed_piano_strings_kevin_macleod_incompetech_usuan1600010.mp3` | по роли |
| 67 | `03_Assets/_quarantine/mixkit/Music/documentary_neutral/music_ambient_bed_voxscape_eugenio_mininni_mixkit.mp3` | `03_Assets/Music/documentary_neutral/music_soaring_ambient_bed_kevin_macleod_incompetech_usuan1600040.mp3` | хорошее |
| 68 | `03_Assets/_quarantine/mixkit/Music/upbeat_energy/music_games_music_grigoriy_nuzhny_mixkit.mp3` | `03_Assets/Music/upbeat_energy/music_exit_the_premises_kevin_macleod_incompetech_usuan1500029.mp3` | очень хорошее |
| 69 | `03_Assets/_quarantine/mixkit/Overlays/smoke_fog/overlay_smoke_white_on_black_1080p_mixkit.mp4` | `03_Assets/Overlays/smoke_fog/overlay_smoke_white_on_black_4k_pixabay_98025.mp4` | хорошее |
| 70 | `03_Assets/_quarantine/mixkit/Overlays/smoke_fog/overlay_mist_thick_flowing_1080p_mixkit.mp4` | `03_Assets/Overlays/smoke_fog/overlay_fog_mist_flowing_4k_pixabay_197704.mp4` | хорошее |
| 71 | `03_Assets/_quarantine/mixkit/Overlays/sparks_particles/overlay_flames_and_sparks_1080p_mixkit.mp4` | `03_Assets/Overlays/sparks_particles/overlay_flames_embers_on_black_1080p_pixabay_106366.mp4` | хорошее |
| 72 | `03_Assets/_quarantine/mixkit/Overlays/sparks_particles/overlay_sparks_fire_on_black_vertical_mixkit.mp4` | `03_Assets/Overlays/sparks_particles/overlay_fire_sparks_on_black_4k_pixabay_299601.mp4` | по функции |
| 73 | `03_Assets/_quarantine/mixkit/Overlays/sparks_particles/overlay_embers_lava_particles_1080p_mixkit.mp4` | `03_Assets/Overlays/sparks_particles/overlay_embers_particles_on_black_4k_pixabay_45595.mp4` | частично хорошее |
| 74 | `03_Assets/_quarantine/mixkit/Overlays/sparks_particles/overlay_flames_blazing_on_black_vertical_mixkit.mp4` | `03_Assets/Overlays/sparks_particles/overlay_flames_on_black_4k_pixabay_210799.mp4` | частичное |
| 75 | `03_Assets/_quarantine/mixkit/Overlays/glitch_vhs/overlay_glitch_static_pixel_noise_1080p_mixkit.mp4` | `03_Assets/Overlays/glitch_vhs/overlay_glitch_digital_artifacts_1080p_pixabay_177755.mp4` | частичное |
| 76 | `03_Assets/_quarantine/mixkit/Overlays/glitch_vhs/overlay_tv_static_bw_1080p_mixkit.mp4` | `03_Assets/Overlays/glitch_vhs/overlay_tv_static_crt_4k_pixabay_58013.mp4` | хорошее |
| 77 | `03_Assets/_quarantine/mixkit/Overlays/lens_flare_bokeh/overlay_bokeh_round_lights_blinking_1080p_mixkit.mp4` | `03_Assets/Overlays/lens_flare_bokeh/overlay_bokeh_city_round_lights_1080p_pixabay_10711.mp4` | хорошее |
| 78 | `03_Assets/_quarantine/mixkit/Overlays/lens_flare_bokeh/overlay_bokeh_monochrome_floating_1080p_mixkit.mp4` | `03_Assets/Overlays/lens_flare_bokeh/overlay_bokeh_white_on_black_4k_pixabay_17433.mp4` | хорошее / частичное |
| 79 | `03_Assets/_quarantine/mixkit/Cinematic_Effects/old_film/cinematic_film_leader_countdown_1080p_mixkit.mp4` | `03_Assets/Cinematic_Effects/old_film/cinematic_film_leader_countdown_sepia_1080p_pixabay_144961.mp4` | хорошее |
| 80 | `03_Assets/_quarantine/mixkit/Transitions/chroma_ink_reveals/transition_black_liquid_covers_greenscreen_1080p_mixkit.mp4` | `03_Assets/Transitions/chroma_ink_reveals/transition_liquid_wipe_luma_matte_1080p_pixabay_19427.mp4` | по функции |
| 81 | `03_Assets/_quarantine/mixkit/Transitions/chroma_ink_reveals/transition_black_drops_cover_greenscreen_vertical_mixkit.mp4` | `03_Assets/Transitions/chroma_ink_reveals/transition_ink_spill_luma_matte_1080p_pixabay_119211.mp4` | частичное |
| 82 | `03_Assets/_quarantine/mixkit/Transitions/chroma_ink_reveals/transition_shapes_reveal_greenscreen_vertical_mixkit.mp4` | нет (код `JaggedReveal` — ещё не написан, спецификация в разделе 4.1) | — |
| 83 | `03_Assets/_quarantine/mixkit/Transitions/chroma_ink_reveals/transition_white_sheet_covers_greenscreen_vertical_mixkit.mp4` | `03_Assets/Transitions/chroma_ink_reveals/transition_paper_sheet_greenscreen_pixabay_245762.mp4` | частичное |
| 84 | `03_Assets/_quarantine/mixkit/Transitions/ink_luma_mattes/transition_black_ink_splash_on_white_1080p_mixkit.mp4` | `03_Assets/Transitions/ink_luma_mattes/transition_black_ink_bleed_on_white_4k_pixabay_42157.mp4` | очень хорошее |
| 85 | `03_Assets/_quarantine/mixkit/Memes_Reactions/failure/reaction_frustrated_woman_head_in_hand_mixkit.mp4` | `03_Assets/Memes_Reactions/failure/reaction_frustrated_man_head_in_hand_vertical_pixabay_272633.mp4` | по эмоции |
| 86 | `03_Assets/_quarantine/mixkit/Memes_Reactions/shock_surprise/reaction_surprised_man_hands_on_head_mixkit.mp4` | `03_Assets/Memes_Reactions/shock_surprise/reaction_shocked_man_hand_over_mouth_4k_pixabay_122389.mp4` | хорошее |
| 87 | `03_Assets/_quarantine/mixkit/Memes_Reactions/comedy_laugh/reaction_man_laughing_closeup_mixkit.mp4` | `03_Assets/Memes_Reactions/comedy_laugh/reaction_man_laughing_on_phone_4k_pixabay_204420.mp4` | частичное |
| 88 | `03_Assets/_quarantine/mixkit/Memes_Reactions/disappointment/reaction_sad_confused_man_mixkit.mp4` | `03_Assets/Memes_Reactions/disappointment/reaction_sad_man_teary_closeup_1080p_pixabay_122390.mp4` | хорошее |
