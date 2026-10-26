# Мемы, реакции, киновставки — легальная система

Канал **ATLAS APE** (@ATLASAPE-S) и другие каналы из `~/shorts`. Составлено 24.10.2026, исправлено по проверке лицензий в тот же день.
Машинный лог: `02_Research/download_logs/memes.json`. Лицензии: `03_Assets/Licenses/` (`us_public_domain_films_LICENSE.md`,
`wikimedia_commons_video_LICENSE.md`, `nasa_LICENSE.md`, `pixabay_LICENSE.md`, `pexels_LICENSE.md`; `mixkit_video_LICENSE.md` — только история).
Это рабочие правила канала, а не юридическая консультация.

## 0. Коротко

- Скачано **20 клипов** (каждый ≤ 8 с, H.264, без звука) и 24.10 — **4 замены с Pixabay**. **В карантине 8** (причины — `03_Assets/_quarantine/README.md`):
  Baker 1946, Rolling eyes, 2 клипа Safety Last! (рип YIFY реставрации Criterion) и 4 реакции Mixkit. В библиотеке **16**: 9 сцен из фильмов
  в общественном достоянии, 1 госкадр NASA (PD), 6 реакций людей (4 Pixabay, 2 NASA). Список — раздел 3.
- **Немецкие каналы:** американские немые фильмы 1920-х (Ллойд, Китон) в Германии, вероятно, ещё охраняются (раздел 2). Там их
  не используем без отдельного решения владельца.
- **Mixkit:** 4 реакции были скачаны скриптом, а User Terms Mixkit (разд. 9) это запрещают. 24.10 они перенесены в
  `03_Assets/_quarantine/mixkit/Memes_Reactions/` и заменены клипами Pixabay (официальный API, Pixabay Content License, атрибуция не нужна).
  Замены другие по кадру (см. раздел 3.3) — перед монтажом посмотреть.
- **32 известных мема** описаны в разделе 4. Почти все — кадры чужих фильмов, сериалов, игр, фото или музыки:
  статус «не использовать как есть». Для каждого есть легальная замена из нашей библиотеки, из Atlas или рисованная.
- **Atlas** — только реакция (хук, поворот, финал), только из рисунков владельца. Инвентарь — раздел 5.
- Pexels блокирует скрипты (Cloudflare) — только вручную (раздел 7). Pixabay с 24.10 доступен через официальный API (`~/shorts/tools/pixabay.py`, только по реальной задаче, без массовых загрузок).

## 1. Как мем работает в нашем монтаже (правила владельца)

1. **Мем лежит поверх предыдущего кадра**, отдельным катом его не ставим: карточка или вырезка влетает поверх сцены, 0,8–2 с, потом уходит.
   Обычно 1–2 мема на Short, на одну эмоцию.
2. **Мем должен быть узнаваемым.** На эп. 6 владелец отверг вставку Китона из «Генерала»: «зачем кадры из какого-то фильма».
   Поэтому из PD-фильмов берём только **иконические** моменты (часы Ллойда, падающий фасад, ракета в глазу Луны, тень Носферату,
   выстрел в зрителя) и подаём их **как мем**: punch-in, рамка или «старый ТВ», наш SFX. Случайные архивные кадры не берём.
3. **Текст не дублируем.** Подпись к мему не повторяет голос или субтитр. Тексты белые и золотые, без наклона.
4. **Звук оригинала не берём никогда.** У всех клипов он уже вырезан: партитуры поздних реставраций и озвучки защищены.
   Звук мема — наш SFX из `03_Assets/Sound_Effects`.
5. **Atlas** появляется только в хуке, на ключевом повороте и в финале, маленький, над пустым местом. Собирается только из
   рисунков владельца. Новые позы или эмоции делает владелец, мы ничего не генерируем.
6. **AI-кадры** — максимум 4–6 на Short, по одному на нужный момент, перед генерацией спрашиваем.
7. **Настоящие мемы** (Travolta, Stonks, CJ и т. п.): **решение владельца 24.10 — разрешены как короткие вставки** по правилам R7
   стандарта (≤ 1,5 с, без звука оригинала, ≤ 2 на ролик, не в названии/обложке/кадре 0, Short ≤ 59 с, строка в EDIT_PLAN и CREDITS).
   Легальные замены из раздела 4 по-прежнему предпочтительнее. Риск не сводится к Content ID и блокировке Short > 60 s:
   - правообладатель может подать ручную жалобу → **страйк за нарушение авторских прав**; 3 страйка за 90 дней = канал удаляют
     (support.google.com/youtube/answer/2814000). Спор claim без веского основания тоже может закончиться жалобой и страйком;
   - Short из чужого клипа без своего вклада считается **«неоригинальным»**: его просмотры не засчитываются в revenue sharing Shorts
     (support.google.com/youtube/answer/12504220), а с 01.02.2027 для дохода из Creator Pool нужно ≥ 10 млн квалифицированных
     просмотров Shorts за 90 дней;
   - «зелёные» копии мемов на YouTube — сами нелицензионные перезаливы, прав они не дают; а скачивание с YouTube (yt-dlp)
     нарушает Условия использования YouTube (скачивать можно только там, где сервис это явно разрешает).
   На эп. 6 владелец принял риск разово. Если владелец письменно разрешит мем для конкретного ролика: ≤ 2 с, без оригинального
   звука, запись в CREDITS, после публикации отслеживать заявки в Studio.
8. **4:3-кадр в 9:16** ставим карточкой (рамка, рваная бумага `vox.tsx`, «телевизор»), не на весь экран: растянутый 720p
   выглядит мыльно. Сверху добавляем зерно и свой грейд.
9. **Кредиты** пишем в описание ролика: PD-фильмы для порядка, CC BY-SA обязательно (текст есть в `attribution_text` лога).

## 2. Риски YouTube (почему «не использовать как есть»)

| Риск | Что происходит | Как избегаем |
|---|---|---|
| **Content ID** | Автоматическое совпадение видео или звука → доход уходит владельцу прав, ролик блокируют в странах или глушат звук. Страйка нет, но Short может потерять монетизацию и показы. | Только PD, CC и сток с правильной лицензией. Без чужой музыки. PD-кадр коротко и со своим грейдом. Ошибочные заявки оспариваем, указывая год публикации и страницу Commons. |
| **Страйк за нарушение авторских прав** | Ручная жалоба правообладателя (не автоматический claim). 3 страйка за 90 дней → канал удаляют; страйк истекает через 90 дней только после Copyright School. Необоснованный dispute claim тоже может кончиться жалобой и страйком (answer/2814000). Для молодого канала критично. | Никаких клипов из фильмов, сериалов и игр после 1930 г. без лицензии. Мемы-копии — по умолчанию никогда. |
| **Revenue sharing Shorts** | «Неоригинальные» Shorts (неотредактированные клипы чужих фильмов и ТВ, перезаливы, компиляции без своего вклада) не участвуют в доходе; с 01.02.2027 доход из Creator Pool только при ≥ 10 млн квалифицированных просмотров Shorts за 90 дней (answer/12504220). | Своя история, свой VO и монтаж; чужой кадр — короткая вставка. |
| **Зелёные копии и yt-dlp** | Мем «на зелёном фоне» на YouTube — нелицензионный перезалив, прав не даёт. Скачивание с YouTube вне функций, которые сервис явно разрешает, нарушает Условия использования YouTube. | Мемы с YouTube не качаем и в библиотеку не кладём. |
| **Германия и американские фильмы 1920-х** | Соглашение США–Германия 1892 г. действует; OLG Frankfurt (2003): правило короткого срока к работам США не применяется → Ллойд и Китон в DE, вероятно, охраняются до 2036–2062 (`Licenses/us_public_domain_films_LICENSE.md`). | На немецких каналах эти вставки не используем без отдельного решения. |
| **Reused / inauthentic content (YPP)** | Канал, собранный из чужих клипов без своего вклада, могут не пустить в партнёрку или исключить из неё. | Мем — 1–2 с внутри нашей авторской истории (свой VO, графика, монтаж). |
| **Fair use** | Защита только по праву США и только в суде, решается по каждому случаю отдельно. Content ID её не учитывает. | На fair use не рассчитываем. |
| **Товарные знаки и образ человека** | Pokémon, Disney, Микки, «Charlie Chaplin», лица знаменитостей на обложке выглядят как реклама. | Не ставим в заголовок и обложку чужие персонажи и знаменитостей. |
| **PD тоже может получить заявку** | Владельцы реставраций (Criterion, Murnau-Stiftung, Lobster, Cohen) регистрируют свои копии. | Без новых титров и звука, коротко, с наложением. Заявку оспариваем. |

## 3. Наша легальная библиотека (18 клипов + 2 в карантине)

Пути от `03_Assets/`. Видео без звука, H.264, у всех `sha256` записан в `memes.json`.
Таймкоды — по исходному файлу на Commons, ≈ ±0,1 с.

### 3.1 Вставки из PD-фильмов — `Cinematic_Effects/pd_film_inserts/`

| Файл | Эмоция | Что в кадре | Длит., разрешение | Фильм, источник, таймкод | Лицензия / риск |
|---|---|---|---|---|---|
| `_quarantine/…/pdfilm_lloyd_clock_hang_safety_last_1923_commons.mp4` **[КАРАНТИН 24.10]** | напряжение, саспенс | Гарольд Ллойд висит на стрелках часов над улицей, циферблат откидывается | 7,97 с, 1472×1072 | Safety Last! (1923). [Commons](https://commons.wikimedia.org/wiki/File:Safety_Last!_(1923)_by_Fred_C._Newmeyer.webm), ≈01:04:11–01:04:19 | US PD. **Копия на Commons — рип YIFY с Blu-ray реставрации Criterion 2013** (Commons: yts.mx, категория «Media from YIFY»); Harold Lloyd Entertainment судилась в 2014 г. из-за копии сцены с часами → риск заявки **средне-высокий**. Ограничения: ≤ 1,5–2 с, только Shorts ≤ 60 s, никогда на обложке и в заголовке, не на немецких каналах. «Harold Lloyd» — товарный знак |
| `_quarantine/…/pdfilm_crowd_gasps_safety_last_1923_commons.mp4` **[КАРАНТИН 24.10]** | шок, реакция толпы | толпа внизу ахает и хватается за сердце | 2,04 с, 1472×1072 | Safety Last! (1923), ≈00:59:24–00:59:26 | US PD, та же копия YIFY/Criterion и те же ограничения |
| `pdfilm_keaton_facade_falls_steamboat_bill_jr_1928_commons.mp4` | неожиданный поворот, «пронесло» | на Китона падает фасад дома, его спасает проём окна | 7,34 с, 960×720 | Steamboat Bill, Jr. (1928). [Commons](https://commons.wikimedia.org/wiki/File:Steamboat_Bill_Jr._(1928).webm), ≈00:59:03–00:59:11 | US PD, копирайт не продлевался. Риск низкий–средний. Не на немецких каналах (DE: вероятно, охрана до конца 2036) |
| `pdfilm_keaton_wind_struggle_steamboat_bill_jr_1928_commons.mp4` | борьба, провал | Китон идёт против урагана, его сносит | 7,97 с, 960×720 | Steamboat Bill, Jr. (1928), ≈00:59:31–00:59:39 | US PD; не на немецких каналах |
| `pdfilm_train_bridge_collapse_the_general_1926_commons.mp4` | провал, катастрофа | паровоз на горящем мосту, мост рушится в реку | 7,97 с, 1440×1080 (сепия) | The General (1926). [Commons](https://commons.wikimedia.org/wiki/File:The_General_(1926).webm), ≈01:05:24–01:05:32 | US PD; не на немецких каналах (DE: вероятно, до 2038) |
| `pdfilm_keaton_sad_on_coupling_rod_the_general_1926_commons.mp4` | разочарование | отвергнутый Китон сидит на шатуне паровоза, поезд увозит его | 7,97 с, 1440×1080 | The General (1926), ≈00:10:44–00:10:52 | US PD; не на немецких каналах. Легальная замена «Sad Keanu» |
| `pdfilm_nosferatu_shadow_on_stairs_1922_commons.mp4` | саспенс, раскрытие | тень Орлока поднимается по лестнице | 4,56 с, 1440×1080 (ночной тон) | Nosferatu (1922). [Commons](https://commons.wikimedia.org/wiki/File:Nosferatu_(1922).webm), ≈01:26:56–01:27:01 | PD в США и ЕС. Реставрация FWMS 2006 → средний риск; для немецких каналов только после отдельного решения |
| `pdfilm_nosferatu_stare_at_window_1922_commons.mp4` | жуть, «за нами следят» | Орлок смотрит через переплёт окна | 4,84 с, 1440×1080 | Nosferatu (1922), ≈01:24:15–01:24:20 | как выше |
| `pdfilm_rocket_in_moon_eye_trip_to_the_moon_1902_commons.mp4` | неожиданно, «прямо в глаз», комедия | Луна приближается, капсула врезается ей в глаз | 8,00 с, 1440×1080 | Le Voyage dans la Lune (1902), ч/б. [Commons](https://commons.wikimedia.org/wiki/File:Le_Voyage_dans_la_Lune_(1902).webm), ≈00:06:07–00:06:15 | PD (Méliès † 1938). Цветную версию 2011 г. и музыку Air не брать |
| `pdfilm_gunman_fires_at_camera_great_train_robbery_1903_commons.mp4` | шок, внезапно | бандит стреляет прямо в зрителя | 6,50 с, 1280×720 | The Great Train Robbery (1903), финальный план. [Commons](https://commons.wikimedia.org/wiki/File:Edwin_Stanton_Porter_The_Great_Train_Robbery_(1903)_-_Final_Scene.webm) | PD, риск низкий |
| `pdfilm_bert_turtle_ducks_duck_and_cover_1951_commons.mp4` | паника, «спрятаться!», комедия | обезьяна с петардой, черепаха Берт прячется в панцирь | 8,00 с, 1440×1080 | Duck and Cover (1951, FCDA США), скан Library of Congress. [Commons](https://commons.wikimedia.org/wiki/File:Duck_and_Cover_1440_x_1080_01836081.webm), ≈00:00:23–00:00:31 | **Вероятно, PD по непродлению; основание спорное** (снял частный подрядчик Archer Productions для FCDA, а 17 USC 105 работы подрядчиков не покрывает; шаблон Commons «PD US Government» — не настоящее основание). Риск низкий. Ядерный контекст: только для лёгких гэгов |

### 3.2 Госкадры США (PD) — `Cinematic_Effects/pd_gov_footage/`

| Файл | Эмоция | Что в кадре | Длит., разрешение | Источник | Лицензия / риск |
|---|---|---|---|---|---|
| `govpd_rocket_tank_burst_sls_test_nasa_2020.mp4` | провал, «лопнуло» | бак SLS разрывается, из него бьёт вода (замедленная съёмка) | 7,97 с, 1134×1080 | [NASA MSFC](https://images.nasa.gov/details/MSFC_2020_XP_SLS_V_0130_PD002-Test-Case-TTF-4697%20LOX%20Tank%20Test-to-Failure%20color-1_06242020_timelapse), 0:13–0:21 | NASA, без копирайта. Не намекать на одобрение NASA |

**В карантине с 24.10:** `govpd_atomic_test_baker_1946_commons.mp4` (Operation Crossroads «Baker»). Кадры PD, но копия на Commons взята из
коммерческой документалки «Trinity & Beyond» (1995) с её грейдом → вероятен матч Content ID. Замена — прямая копия NARA / DOE (ещё не скачана).

### 3.3 Реакции людей — `Memes_Reactions/<эмоция>/`

| Файл | Эмоция | Что в кадре | Длит., разрешение | Источник | Лицензия / атрибуция |
|---|---|---|---|---|---|
| `shock_surprise/reaction_shocked_man_hand_over_mouth_4k_pixabay_122389.mp4` | шок, «не может быть» | мужчина на студийном фоне закрывает рот рукой, потом открывает рот от шока | 15,77 с, 3840×2160 | [Pixabay #122389](https://pixabay.com/videos/id-122389/), автор u_n92ynpt32e | Pixabay Content License, атрибуция не нужна. Заменяет `reaction_surprised_man_hands_on_head_mixkit` (в карантине); немая AAC-дорожка — отключить |
| `comedy_laugh/reaction_man_laughing_on_phone_4k_pixabay_204420.mp4` | смех | крупно мужчина смеётся во время телефонного звонка; не в камеру | 15,51 с, 3840×2160 | [Pixabay #204420](https://pixabay.com/videos/id-204420/), автор conte_public | Pixabay Content License, атрибуция не нужна. Заменяет `reaction_man_laughing_closeup_mixkit` (в карантине); немая AAC-дорожка — отключить |
| `disappointment/reaction_sad_man_teary_closeup_1080p_pixabay_122390.mp4` | разочарование, грусть | профиль пожилого мужчины со слезами на глазах | 9,45 с, 1920×1080 | [Pixabay #122390](https://pixabay.com/videos/id-122390/), автор u_n92ynpt32e | Pixabay Content License, атрибуция не нужна. Заменяет `reaction_sad_confused_man_mixkit` (в карантине); немая AAC-дорожка — отключить |
| `failure/reaction_frustrated_man_head_in_hand_vertical_pixabay_272633.mp4` | провал, фейспалм | мужчина читает счёт и роняет голову в ладонь, на столе мятая бумага | 10,01 с, 1080×1920 (**вертикаль**) | [Pixabay #272633](https://pixabay.com/videos/id-272633/), автор DespiertaYa | Pixabay Content License, атрибуция не нужна. Заменяет `reaction_frustrated_woman_head_in_hand_mixkit` (в карантине) |
| `failure/reaction_astronaut_falls_apollo17_nasa_1972.mp4` | «упс», провал, комедия | астронавт Шмитт спотыкается и падает на Луне | 7,70 с, **320×240** | [Commons (NASA)](https://commons.wikimedia.org/wiki/File:Ap17_schmitt_falls.ogv) | PD NASA. Только маленьким планом или в рамке ТВ |
| `success/reaction_mission_control_cheers_artemis2_nasa_2026.mp4` | успех, облегчение | команда Artemis II в ЦУПе аплодирует на приводнении | 7,97 с, 1920×800 | [NASA JSC](https://images.nasa.gov/details/jsc2026m000354-Artemis-II-Orion-Mission-Evaluation-Room-Team-During-Splashdown), 2:28–2:36 | NASA, без копирайта. **Действующие сотрудники и инсигнии NASA:** только редакционно, в космическом / NASA-контексте; не как универсальный «успех» в чужой истории; никогда на обложке и в промо канала; без насмешливых подписей |

**В карантине с 24.10:** `sarcasm/reaction_rolling_eyes_commons_ccbysa.mp4` (CC BY-SA 3.0 + личные права: обрезка и наложение поверх кадра
делают адаптацию, которая сама должна быть BY-SA). Замена для сарказма — Atlas `sarcastic` / `skeptical` / `wink` или рисованная реакция.

## 4. Каталог известных мемов: права и легальные замены

Колонка «Статус» везде одна и та же, если не сказано иное: **не использовать как есть**.
Длительность — сколько мем обычно держат в Short. Замену берём из раздела 3, из Atlas (раздел 5) или рисуем сами
(`gfx.tsx`, `draw.tsx`, `vox.tsx` из китов pig-war/short3 и football-222/short).

| # | Мем (что это) | Эмоция · контекст · длит. | Права (кому принадлежит) | Риск YouTube | Легальная замена |
|---|---|---|---|---|---|
| 1 | **Confused Travolta**: Винсент Вега растерянно озирается | растерянность · «где логика?», что-то пропало · 1,5–2 с | кадр «Криминального чтива» (1994, Miramax) | высокий: Content ID на кадры фильма, зелёный фон прав не меняет | Atlas `confused` + `look_left`/`look_right` над пустым кадром; `disappointment/reaction_sad_man_teary_closeup_1080p_pixabay_122390.mp4`; рисованные «?» |
| 2 | **Surprised Pikachu**: Пикачу с открытым ртом | наигранное удивление · «кто бы мог подумать» · 1 с | аниме «Покемон» (The Pokémon Company / Nintendo) | высокий + товарный знак | Atlas `surprised` / `surprise_reaction`; `shock_surprise/reaction_shocked_man_hand_over_mouth_4k_pixabay_122389.mp4` |
| 3 | **Stonks**: 3D-голова Meme Man и стрелка вверх | ирония над «успехом» · 1–1,5 с | Meme Man неясного происхождения, не наш | средний: права неясны | своя рисованная стрелка-график + денежный дождь (уже есть в ai-farm-girl) + Atlas `thumbs_up` |
| 4 | **«Ah sh*t, here we go again»** (CJ) | дежавю, повтор ошибки · 1,5–2 с | игра GTA: San Andreas (Rockstar / Take-Two), голос актёра | высокий: игра и голос | Atlas `facepalm`; фраза своими словами в нашем VO; `pdfilm_keaton_wind_struggle…` |
| 5 | **Distracted Boyfriend**: парень оглядывается на другую | соблазн, выбор · 2 с | стоковое фото Antonio Guillem (Shutterstock / iStock), нужна платная лицензия | средний–высокий: автор преследует нелицензионное использование | рисованная сцена из трёх силуэтов с подписями в стиле Vox (страны / варианты) |
| 6 | **Drake Hotline Bling**: «нет»/«да» | предпочтение · сравнение · 2 с | клип Drake (2015, Cash Money / Universal) | высокий | две панели: Atlas `shake_head` («нет») / `thumbs_up` («да») |
| 7 | **Woman Yelling at Cat** | спор, обвинение · 2 с | кадр «Real Housewives of Beverly Hills» (Bravo / NBCU) + фото кота Smudge | высокий | сплит-скрин: PD-портреты исторических оппонентов + наш рисованный «крик» |
| 8 | **Success Kid**: малыш сжимает кулак | маленькая победа · 1 с | фото Laney Griner (2007), лицензирует, возражала против политики | средний–высокий | Atlas `excited` / `thumbs_up`; Gemini-карточка `atlas_clap.png`; Artemis II (`success/reaction_mission_control_cheers…`) — только если история про космос |
| 9 | **Disaster Girl**: девочка ухмыляется на фоне пожара | злорадство, хаос · 1,5 с | фото Dave Roth (2004), права у семьи (NFT 2021) | средний–высокий | `pdfilm_train_bridge_collapse_the_general_1926…` + маленький Atlas `sarcastic` в углу |
| 10 | **This Is Fine**: пёс в горящей комнате | отрицание кризиса · 2 с | комикс KC Green «Gunshow» (2013), автор защищает права | высокий | `pdfilm_keaton_facade_falls…` (невозмутимость посреди катастрофы) + оверлей огня из `Overlays/sparks_particles/` |
| 11 | **Hide the Pain Harold** | скрытая боль, натянутая улыбка · 1,5 с | стоковые фото András Arató (Dreamstime), нужна лицензия | средний | `reaction_sad_man_teary_closeup_1080p_pixabay_122390.mp4`; Atlas `happy` на низкой интенсивности → `sad` |
| 12 | **Roll Safe «Think about it»**: палец у виска | «хитрая» логика, сарказм · 1,5 с | Kayode Ewumi, «#HoodDocumentary» (BBC Three, 2016) | высокий | Atlas `thinking` + `wink` |
| 13 | **Mind Blown** (Tim & Eric) | «взрыв мозга» · 1–1,5 с | «Tim and Eric Awesome Show» (Adult Swim) | высокий | `govpd_rocket_tank_burst_sls…` + наш «бум»; Atlas `surprised` |
| 14 | **Coffin Dance**: танцующие носильщики гроба | провал «насмерть» · 2–3 с | видео Benjamin Aidoo / Dancing Pallbearers + трек «Astronomia» (Vicetone & Tony Igy) | очень высокий: музыка в Content ID | `pdfilm_train_bridge_collapse…` + барабанный SFX или трек из YouTube Audio Library |
| 15 | **To Be Continued**: стоп-кадр, стрелка, рифф | клиффхэнгер перед провалом · 2 с | титр «JoJo's Bizarre Adventure» (David Production) + «Roundabout» (Yes) | очень высокий: музыка | свой стоп-кадр с сепией + рисованная плашка-стрелка (сама фраза не охраняется) + свой бас-рифф из библиотеки |
| 16 | **Curb Your Enthusiasm credits** («Directed by Robert B. Weide») | неловкий финал · 2–3 с | титры HBO + музыка «Frolic» (Luciano Michelini) | очень высокий: музыка | свои титры + шутливый трек из YouTube Audio Library; `pdfilm_keaton_sad_on_coupling_rod…` |
| 17 | **Dramatic Chipmunk**: зверёк резко поворачивается | драматическое раскрытие · 1 с | японское ТВ-шоу (2007) + оркестровый стинг из «Молодого Франкенштейна» (1974) | высокий | `pdfilm_nosferatu_stare_at_window…` + резкий punch-in + наш стинг «дун-дун-ДУН»; Atlas `turn_to_camera` (эксперимент) |
| 18 | **Sad Keanu**: Киану один на скамейке | одиночество, грусть · 1,5 с | папарацци-фото (2010), права у фотоагентства | высокий | `pdfilm_keaton_sad_on_coupling_rod_the_general_1926…` — то же настроение одиночества |
| 19 | **Kermit «But that's none of my business»** | пассивная агрессия · 1,5 с | Маппеты (Disney), реклама Lipton | высокий + персонаж | Atlas `sarcastic` + `phone_look` или `suspicious` |
| 20 | **Gru's Plan**: план на доске, последний пункт провален | план идёт не так · 3–4 с | «Гадкий я» (Illumination / Universal, 2010) | высокий | своя 4-панельная доска (Vox-коллаж) + Atlas `surprised` на 4-й панели |
| 21 | **Spider-Man Pointing**: два Человека-паука показывают друг на друга | «это одно и то же» · 1,5 с | мультсериал 1967 г. (Marvel / Disney) | высокий | две PD-фотографии или две наши рисованные фигуры с указкой |
| 22 | **Blinking White Guy** (Drew Scanlon) | недоверие · 1 с | видео Giant Bomb (2013) | высокий | Atlas `skeptical` + `blink` |
| 23 | **Side-eye Chloe**: девочка косится | подозрение · 1 с | семейное видео (2013), права у семьи (NFT) | высокий | Atlas `suspicious` (взгляд искоса) / `look_left` |
| 24 | **DiCaprio Toast** («Великий Гэтсби») | «за победу», успех · 1,5 с | Warner Bros. (2013) | высокий | Atlas `happy` + `wink`; Artemis II — только в космической истории |
| 25 | **DiCaprio pointing at TV** | «я его знаю!» · 1,5 с | «Однажды в… Голливуде» (Sony, 2019) | высокий | Atlas `point` + `surprised` |
| 26 | **Crying Michael Jordan** | поражение, слёзы · 1 с | фото агентства (2009) | высокий + образ знаменитости | Atlas `sad`; `reaction_sad_man_teary_closeup_1080p_pixabay_122390.mp4` |
| 27 | **«Always has been»**: астронавт с пистолетом за спиной другого | «так было всегда», раскрытие · 2–3 с | рисованный шаблон, автор неизвестен | средний | **перерисовать** своими силуэтами астронавтов поверх NASA PD «Blue Marble». Самая лёгкая легальная пересборка |
| 28 | **«Is this a pigeon?»** | неправильное понимание · 2 с | аниме «Taiyō no Yūsha Fighbird» (1991, Sunrise) | высокий | Atlas `magnifier_look` + рисованная бабочка и подпись |
| 29 | **Galaxy Brain / Expanding Brain** | ироничная «эскалация гениальности» · 3–4 с | набор стоковых картинок мозга | средний | рисованный мозг в 4 стадиях (`gfx.tsx`) со свечением |
| 30 | **«Oh no! Anyway»** (Кларксон) | равнодушие · 1,5 с | «Top Gear» (BBC) | высокий | Atlas `shrug` |
| 31 | **Benny Hill chase** («Yakety Sax») | хаотичная погоня · 2–4 с | запись «Yakety Sax» (Boots Randolph) + шоу Thames TV | очень высокий: музыка | PD-погоня Китона «Cops» (1922, US PD, только каталог: ещё не скачано) + PD-рэгтайм в PD-записи (Musopen) или трек из Audio Library |
| 32 | **Звуковые мемы**: Wilhelm scream, Vine boom, проигрышный горн «The Price Is Right», грустный тромбон | провал, удар, «бум» · 0,5–1 с | Wilhelm — из «Distant Drums» (Warner, 1951); горн — Fremantle; Vine boom — происхождение неясно | средний: звуки попадают в Content ID | свои SFX из `03_Assets/Sound_Effects` (бум, фейл-тромбон, свист). Задача агента SFX |

## 5. Atlas — инвентарь реакций (только чтение)

**Правило:** Atlas собирается только из рисунков владельца (`~/shorts/orangutan/assets/source/`, SHA-256 зафиксированы в тестах).
Ничего не дорисовываем и не генерируем. Если нужной части нет, называем спрайт, ракурс, позу, размер холста и pivot
(формат `ASSET_MANIFEST.md`). Atlas — реакция, не украшение.

- **Риг:** `~/shorts/orangutan` (TS + PixiJS). Правила проекта — `CLAUDE.md`, `CHARACTER_RULES.md`, `ASSET_MANIFEST.md`.
- **13 эмоций** (`emotions/*.json`, все доступны): neutral (ленивая ухмылка), sarcastic, happy, laughing, excited, surprised (≤ 0,6 с пик),
  thinking, sad (моргает), angry, confused, skeptical (поднятая бровь), suspicious (взгляд искоса), sleepy.
  Без моргания: angry, confused, skeptical.
- **Анимации-реакции** (`animations/*.json`): `surprise_reaction` (подпрыгивает от испуга), `facepalm` (ладонь к лицу, IK), `laugh`, `shrug`,
  `thumbs_up`, `ok_sign`, `wink`, `nod`, `shake_head` (приблизительно), `thinking`, `look_left`, `look_right`, `point`, `point_stick`,
  `magnifier_look`, `phone_look`, `show_globe`, `count_three`, `peace_sign`, `wave`.
  Эксперименты (владельцу 2.5D не понравилось): `shake_head_3d`, `nod_3d`, `turn_to_camera`, `glance_away`, `look_up`;
  на теле «legs»: `walk`, `dance_meme`. **Недоступно:** `sit` (нет рисунка `body_sitting.png`).
- **Ракурсы головы:** 3/4 вправо (базовый), анфас, профиль, левые — зеркало. Тело — только 3/4 вправо.
- **Готовые плашки с альфой** (ProRes 4444, 1080×1920):
  - `~/shorts/orangutan/out/reel_2_emotions/reel_2_emotions_alpha.mov` — 20 с, все 13 эмоций по 1,5 с; удобно вырезать реакцию-мем;
  - `~/shorts/orangutan/out/reel_3_gestures/reel_3_gestures_alpha.mov` — 27,7 с, жесты;
  - `~/shorts/orangutan/out/reel/atlas_showreel.mp4` — 97,6 с, шоурил «что умеет Atlas»;
  - экспорты из прошлых Short: `out/volcano_short`, `out/rabbits_short`, `out/yf_short`, `out/pw_short`; WebP-секвенции в
    `~/shorts/atlas-ape/*/short*/public/atlas/` (1101–2304 кадра).
- **Новая реакция:** `scenes/<имя>.json` (timeline: emotion / play / lookAt) → `npm run export -- <имя>` →
  `out/<имя>/<имя>_alpha.mov`. Липсинк — Rhubarb (`~/shorts/tools/rhubarb`).
- **Карточки поз из Gemini** (делал владелец по своим референсам, одобрены в выпущенных Short):
  - `~/shorts/atlas-ape/football-222/short/public/atlas/atlas_shock.png`, `atlas_clap.png` (исходники `football-222/gemini/*.jpg`, в т. ч. `atlas_sheet_clap_shock.jpg`);
  - `~/shorts/atlas-ape/ai-farm-girl/short/public/atlas/atlas_thumbs_phone.png`;
  - `~/shorts/orangutan/pose_pack/in/gen_2.png … gen_5.png`, `pose_salute.png` → `out/pose_cards/salute/card_cutout.png`.
  Список запланированных поз (паника-бег, выглядывает сбоку, прыжок радости, бинокль, селфи-подмигивание…) — в `pose_pack/PROMPTS.md`.
  Новые карточки генерирует только владелец. Они идут в лимит AI-кадров.
- **Эталоны** (в риг не входят): `assets/source/expressions_sheet.png` (8 голов: smug, happy, laugh, shock, think, annoyed, bliss, sad), `poses_sheet.png`.

## 6. Эмоция → что брать

| Эмоция | PD-фильм / госкадр | Люди (сток / NASA / CC) | Atlas | Своё (графика, звук) |
|---|---|---|---|---|
| Шок / удивление | `pdfilm_gunman_fires…` | `reaction_shocked_man_hand_over_mouth_4k_pixabay_122389` | `surprised`, `surprise_reaction`, Gemini `atlas_shock.png` | punch-in + «бум» |
| Растерянность | — | — (замена Mixkit — грусть, а не растерянность) | `confused` + `look_left`/`look_right` | рисованные «?» |
| Недоверие | — (Safety Last! в карантине) | — | `skeptical` | — |
| Сарказм | — | — | `sarcastic`, `wink` | — |
| Комедия | `pdfilm_rocket_in_moon_eye…`, `pdfilm_bert_turtle_ducks…` | `reaction_man_laughing_on_phone_4k_pixabay_204420` | `laugh`, `laughing` | — |
| Провал | `pdfilm_train_bridge_collapse…`, `pdfilm_keaton_wind_struggle…`, `govpd_rocket_tank_burst_sls…` | `reaction_frustrated_man_head_in_hand_vertical_pixabay_272633`, `reaction_astronaut_falls_apollo17_nasa_1972` | `facepalm`, `shake_head` | фейл-тромбон |
| Успех | — | `reaction_mission_control_cheers_artemis2_nasa_2026` (только космос / NASA) | `thumbs_up`, `ok_sign`, `excited`, Gemini `atlas_clap.png` | конфетти / золотой текст |
| Напряжение | — (Safety Last! в карантине) | — | `thinking` | сердцебиение (SFX) |
| Драматическое раскрытие | `pdfilm_nosferatu_shadow_on_stairs…` | — | `turn_to_camera` (эксперимент) | zoom-through, glitch-раскрытие (ai-farm-girl) |
| Саспенс | `pdfilm_nosferatu_stare_at_window…` | — | `suspicious`, `look_left` | гул / стинг |
| Разочарование | `pdfilm_keaton_sad_on_coupling_rod…` | `reaction_sad_man_teary_closeup_1080p_pixabay_122390` | `sad` | — |
| Уверенность | — | — | `neutral` (ухмылка), `wink`, `thumbs_up`, Gemini `atlas_thumbs_phone.png` | — |
| Реакция-план | — | реакции Pixabay, MER NASA | плашки из `reel_2_emotions_alpha.mov` | — |
| Неожиданный поворот | `pdfilm_keaton_facade_falls…` | — | `surprise_reaction` | glitch / пиксельный распад |

## 7. Что докачать вручную (скрипты заблокированы или лимит)

- **Pexels** (Pexels License, коммерция ок, атрибуция не нужна): facepalm, аплодисменты, «confused» → вручную со страниц
  https://www.pexels.com/search/videos/facepalm/ , https://www.pexels.com/search/videos/applause/ . Скрипты получают 403 (Cloudflare).
- **Pixabay** (Pixabay Content License): сайт отдаёт скриптам 403, но с 24.10 работает официальный API (`~/shorts/tools/pixabay.py search videos …`):
  по одной реакции под задачу, кандидатов смотреть покадрово (на Pixabay много AI-клипов — их не берём).
- **Mixkit:** не используем — 24.10 все файлы Mixkit перенесены в карантин и заменены (решение владельца). Скриптами к mixkit.co не обращаемся.
- **Ещё PD-иконы на будущее** (US PD, Commons / Internet Archive): Keaton «Cops» (1922, погоня полицейских), «One Week» (1920,
  дом-конструктор), «Sherlock Jr.» (1924, прыжок в экран), Lloyd «Never Weaken» (1921), Lumière «L'Arrivée d'un train» (1896).
  Только иконические моменты, по правилу из раздела 1.2.
- **Не брать:** Чаплин (в UK/ЕС охраняется до 2047 г.), «Метрополис» (в ЕС до 2046 г.), «Пароход Вилли» (товарный знак Микки),
  цветную «Луну» 2011 г. (Lobster), звук любых реставраций.

## 8. Чек-лист перед рендером

- [ ] Мем лежит поверх предыдущего кадра, 0,8–2 с, ≤ 2 мемов на Short, эмоция понятна за 1 с.
- [ ] PD-вставка узнаваема (из списка икон), не «случайный архив».
- [ ] Звука оригинала нет, SFX наш.
- [ ] Текст мема не повторяет VO или субтитр; не перекрывает субтитры и UI.
- [ ] Atlas — только хук, поворот или финал, только из рисунков владельца.
- [ ] Для CC BY / BY-SA строка кредита есть в описании (`attribution_text` в `memes.json`).
- [ ] Американские немые 1920-х — не на немецком канале; Safety Last! ≤ 1,5–2 с и только в Short ≤ 60 s; Artemis II — только в космической истории.
- [ ] Нет ни одного файла Mixkit (все в карантине с 24.10); у клипа Pixabay есть строка в `CREDITS.md` проекта (источник, автор, лицензия); немая AAC-дорожка снята.
- [ ] Настоящий защищённый мем — по умолчанию нет; только с письменного «да» владельца на этот ролик (риск страйка и исключения из revenue sharing); после публикации проверить заявки в Studio.
