# CREDITS — «Humans vs Volcano» (The Atlas Ape, YouTube Short, 76.8 s)

Каждый источник ниже — реальные данные или реальные фотографии. ИИ-видео и ИИ-изображения в ролике не используются.
Таймкоды указаны по финальному файлу humans_vs_volcano.mp4.

## Голос, ведущий, музыка
- **Голос:** ElevenLabs, голос «Silas», модель Eleven v4. Сгенерирован владельцем канала (тейк vo_silas_v4_gen1).
  ⚠️ Тариф, на котором сделан тейк, не записан. На бесплатном тарифе ElevenLabs запрещает коммерческое использование
  и требует «elevenlabs.io» или «11.ai» в названии (см. YOUTUBE.md, раздел 6).
- **Ведущий Atlas (орангутан):** оригинальные рисунки владельца канала, риг `~/shorts/orangutan` (сцена `scenes/volcano_short.json`).
  Липсинк — **Rhubarb Lip Sync 1.14.0**, © Daniel S. Wolf, лицензия MIT (https://github.com/DanielSWolf/rhubarb-lip-sync).
- **Музыка:** «Frame-Dragging» — The Grey Room / Density & Time, YouTube Audio Library (указание авторства не требуется).
- **Звуковые эффекты:** процедурные, созданы кодом проекта (`tools/sfx.py`). Десять эффектов с суффиксом `_el` сгенерированы
  через ElevenLabs Sound Effects на аккаунте владельца: explosion_big, steam_hiss_big, biplane_flyby, bomb_whistle, fissure_rip,
  lava_fountain, ship_horn_low, lava_crackle, boats_engines, crowd_cheer_short (в микс не вошёл).
  ⚠️ По брифу этот аккаунт бесплатный, значит те же условия, что выше. Для коммерческого канала эти 9 эффектов надо заменить.

## 3D-рельеф и спутниковые снимки
Высокодетальные данные (18.10, после замечаний о мыльности):
- **Гавайи, 8 км вокруг жерла 1935 года:** рельеф — U.S. Geological Survey, 3D Elevation Program (3DEP), лидар 1 м
  «HI Hawaii Island Lidar NOAA 2017» (public domain). Снимки — USDA Farm Service Agency, National Agriculture Imagery
  Program (NAIP) 2021, 0,6 м (public domain), через Microsoft Planetary Computer.
- **Гавайи, полоса потока до Хило:** рельеф — USGS 3DEP 1/3 arc-second, ~10 м (public domain). Снимки — USDA NAIP 2021
  (public domain; просимое указание: USDA Farm Production and Conservation - Business Center, Geospatial Enterprise
  Operations), Landsat 8/9 Collection 2 (U.S. Geological Survey, public domain); облачные пятна закрыты EOxCloudless 2016
  (EOX, CC BY 4.0).
- **Этна:** рельеф — Tarquini S., I. Isola, M. Favalli, A. Battistini, G. Dotta (2023). TINITALY, a digital elevation model
  of Italy with a 10 meters cell size (Version 1.1). INGV, https://doi.org/10.13127/tinitaly/1.1, **CC BY 4.0**.
  Изменения: перепроецирован в Web Mercator, пересэмплирован, построена карта нормалей.
- **Хеймаэй:** рельеф — ÍslandsDEM v1.0, 2 м, © Náttúrufræðistofnun (Natural Science Institute of Iceland), Veðurstofa
  Íslands, Polar Geospatial Center, **CC BY 4.0**. Основан на ArcticDEM (DEM courtesy of the Polar Geospatial Center).
  Изменения: пересэмплирован, обрезан по береговой линии, усилен по вертикали.
- **Микродетализация поверхности:** фотосканированные текстуры Poly Haven, **CC0**:
  - «Gray Rocks» (Dimitrios Savva) — https://polyhaven.com/a/gray_rocks
  - «Aerial Rocks 04» (Rob Tuytel) — https://polyhaven.com/a/aerial_rocks_04
  - «Dry Ground Rocks» (Rob Tuytel) — https://polyhaven.com/a/dry_ground_rocks
  - «Dark Rock 02» (Amal Kumar) — https://polyhaven.com/a/dark_rock_02

  Полный список с авторами — `public/tex/credits.json`.

Обзорные и окружающие сетки (без изменений):
- **Высоты:** AWS Terrain Tiles / Mapzen «terrarium» (s3.amazonaws.com/elevation-tiles-prod, Registry of Open Data on AWS):
  - **Гавайи:** SRTM, GMTED2010 и 3DEP — данные любезно предоставлены U.S. Geological Survey.
  - **Батиметрия:** ETOPO1 — U.S. National Oceanic and Atmospheric Administration.
  - **Сицилия:** EU-DEM — «Produced using Copernicus data and information funded by the European Union».
  - **Исландия:** ArcticDEM, финансирование National Science Foundation (гранты 1043681, 1559691, 1542736).
- **Спутниковые текстуры:** «EOxCloudless 2016 – https://cloudless.eox.at by EOX IT Services GmbH (Contains modified
  Copernicus Sentinel data 2016)», **CC BY 4.0**, слой WMTS `s2cloudless_3857` — именно 2016 год. Слои 2018–2025
  лицензированы BY-NC-SA, их не брать. Используются для Этны,
  Хеймаэя, всего острова Гавайи и окружения.
- **Глобус:** NASA Visible Earth, Blue Marble: Next Generation (Reto Stöckli, NASA Earth Observatory), public domain;
  NASA Earth Observatory, Black Marble 2016 (ночные огни), public domain. Маска воды глобуса и подложка
  исландского спуска — Natural Earth 10 m (public domain, указание авторства не требуется).

## Как собран v6 HYBRID (19.10) и где какая графика
- **0–29,5 с** — рендер v4 (three.js в Remotion, `public/v4_base.mp4`). Спутниковые снимки здесь показаны
  напрямую: NAIP, Landsat, EOX на рельефе 3DEP / TINITALY / AWS. Глобус — NASA и Natural Earth.
- **29,5–36,7 с** — процедурные векторные схемы проекта: «земляной вал» и «взрыв лавовой трубы».
- **Исландия (40–54,5, 57, 62–66 с)** — мультяшные 3D-кадры, отрендеренные в Blender 5.2 (свободный софт, GPL):
  - рельеф — ÍslandsDEM, большая земля — AWS terrarium;
  - цвета зон взяты из снимков EOX;
  - дома Хеймаэя расставлены процедурно по крышам, найденным на снимках EOX (не из OSM);
  - контур лавы — `flows.json` (USGS OF 97-724 и береговая линия OSM, ODbL);
  - лодки и корабль — Kenney Watercraft Kit (https://kenney.nl), **CC0**: `boat-fishing-small`, `ship-cargo-b`.
- **Не вошло в v6** (было только в Blender-кадрах Гавайев и Этны версии v5):
  - контуры зданий OSM для Дзафферана-Этнеа и Хило;
  - деревья Kenney Nature Kit.

## Пути лавовых потоков (по опубликованным картам; итог — `data/flows.json`)
- **Мауна-Лоа 1935–36:** USGS SIM 2932-A (Trusdell & Lockwood, 2017; геобаза данных) и USGS OF 2007-1089 (Sherrod et al.,
  Геологическая карта штата Гавайи, полигоны «AD 1935»). Точки бомбёжки приблизительные: источники пишут только «в пределах
  2 км от жерла».
- **Этна 1991–93:** OpenStreetMap, мультиполигон «Lave del 1992» (relation 6721741), © OpenStreetMap contributors, **ODbL**
  (https://www.openstreetmap.org/copyright). Также Barberi et al. 1993 и карта на italysvolcanoes.com (B. Behncke).
  Направление искусственного русла после взрыва — схематичное.
- **Хеймаэй / Эльдфедль 1973:** USGS OF 97-724 (Lava-cooling operations, Williams & Moore), брошюра USGS
  «Man Against Volcano», береговая линия по OpenStreetMap (ODbL).

## Фотографии (все настоящие; лицензии проверены через API Wikimedia Commons / USGS)
| Таймкод | Файл | Что на фото | Автор / источник | Лицензия |
|---|---|---|---|---|
| 0–2.5, 13.4–14.6 (вырезанные силуэты) | keystone_b6a_bombing.jpg | бомбардировщики Keystone B-6A Army Air Corps сбрасывают бомбы, 1930-е (вырезаны силуэты самолётов) | U.S. Air Force photo, National Museum of the U.S. Air Force (060421-F-1234P-025) — https://commons.wikimedia.org/wiki/File:Keystone_B-6As_dropping_bombs_060421-F-1234P-025.jpg | Public domain (US Gov) |
| 3.5–4.6 (панель «1935») | maunaloa_1935_bombing_2.jpg | разрыв бомбы на лаве Мауна-Лоа, 27.12.1935 | Army Air Corps, 11th Photo Section, via USGS HVO — https://www.usgs.gov/media/images/did-aerial-bombing-stop-1935-mauna-loa-lava-flow | Public domain (US Gov) |
| 3.5–4.6 (панель «1992») | etna_1992_heli_block.jpg | бетонный блок опускают вертолётом на лаву Этны, 15.04.1992 | JO2 Laurie Beers, U.S. Navy (DoD/NARA) — https://commons.wikimedia.org/wiki/File:A_View_from_a_Helicopter_as_a_Concrete_Block_is_Lowered_to_Block_the_Lava_Flow.jpg | Public domain (US Gov) |
| 3.5–6.4 (панель «1973»), 54.7–56.4 | heimaey_spray_1973.jpg | струи морской воды на фронт лавы, Хеймаэй, 1973 | U.S. Geological Survey, брошюра «Man Against Volcano» — https://pubs.usgs.gov/publication/70039211 | Public domain (USGS) |
| 14.5–17.1 (фон) | maunaloa_1935_bomber_bombs.jpg | биплан Army Air Corps с бомбами, 1935 | Kenichi Maehara (как указано USGS) — https://www.usgs.gov/media/images/us-army-air-corps-biplane-prepares-drop-bombs-1935-lava-flow | Public domain (по данным USGS) |
| 15.6–17.1 | patton_1918.jpg | George S. Patton, Франция, 1918 | U.S. Army Signal Corps — https://commons.wikimedia.org/wiki/File:George_S._Patton_-_France_-_1918.jpg | Public domain (US Army) |
| 20.9–23.9 | maunaloa_1935_bombing_1.jpg | бомба взрывается на потоке, 27.12.1935 | Army Air Corps, 11th Photo Section, via USGS HVO — https://www.usgs.gov/media/images/old-bombs-found-mauna-loa-rest-story-part-2 | Public domain (US Gov) |
| 36.7–38.0 | zafferana_town_2017.jpg | Дзафферана-Этнея, 2017 | Rabe! — https://commons.wikimedia.org/wiki/File:Zafferana_Etnea_2017-04-27h.jpg | **CC BY-SA 4.0** |
| 38.0–39.3 | etna_1992_flow_end_2016.jpg | фронт лавы 1992 года, где поток остановился (2016) | Wittylama — https://commons.wikimedia.org/wiki/File:Lava_flow_from_1992_Etna_eruption.jpg | **CC BY-SA 4.0** |
| 57.8–59.1 | heimaey_pumping_eruption_1973.jpg | город и гавань Хеймаэя во время извержения, насосы охлаждения, 1973 | Jack Lockwood, U.S. Geological Survey (via Smithsonian GVP) — https://commons.wikimedia.org/wiki/File:The_town_of_Vestmannaeyjar_and_the_harbor_during_the_eruption_of_Eldfell_in_1973.jpg | Public domain (US Gov) |
| 59.1–61.9 | heimaey_lava_town_1974.jpg | парящая новая лава у города, 1974 | Christian Bickel (fingalo) — https://commons.wikimedia.org/wiki/File:Heimaey_08.jpg | **CC BY-SA 2.0 DE** |
| 65.9–67.0 | heimaey_harbor_2012.jpg | гавань Хеймаэя и Эльдфедль, 2012 | Andreas Blome — https://commons.wikimedia.org/wiki/File:Heimaey_Island.jpg | **CC BY-SA 3.0** |

Все фото в ролике адаптированы: кадрирование, Ken Burns, цветокоррекция, дуотон для чёрно-белых. Адаптированные версии
CC BY-SA-фото остаются под той же лицензией. Полный список скачанных файлов (26 шт., включая неиспользованные) с
метаданными — `public/photos/credits.jsonl`.

## Шрифты и софт
- Montserrat и Anton — Google Fonts, SIL Open Font License 1.1.
- Remotion 4: собственная Remotion License. Бесплатна для частного лица и для компании до 3 сотрудников, иначе нужна
  Company License. Также three.js / React Three Fiber, postprocessing, Blender 5.2.
- whisper.cpp (large-v3-turbo) — тайминг слов.
- ffmpeg — сведение звука.

## Текст для описания на YouTube
Готовые блоки «CREDITS (required attribution)» и «THANKS» лежат в `YOUTUBE.md`, раздел 2. Они сверены с v6
19.10: полная цитата TINITALY, строка EOxCloudless, ссылки на лицензии, названия и ссылки CC BY-SA-фото, URL OSM,
строки AWS Terrain Tiles.
