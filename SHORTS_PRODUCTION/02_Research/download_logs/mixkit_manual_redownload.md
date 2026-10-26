# Mixkit: ручное перекачивание — ОТМЕНЕНО 24.10 (заменено заменой файлов)

> **Superseded by replacement 2026-10-24.** Владелец решил не перекачивать файлы Mixkit вручную, а заменить их лицензированными аналогами. Все 88 файлов из таблицы ниже перенесены в `03_Assets/_quarantine/mixkit/<прежний путь>` (пути в таблице — прежние) и заменены: 60 SFX — Freesound CC0 (`freesound.json`), 8 треков — Kevin MacLeod CC BY 4.0 (`music_replacement.json`), 19 клипов — Pixabay (`pixabay.json`); 1 переход без замены. Реестр больше не заполняется: файлов Mixkit в роликах нет совсем, ручное перекачивание не нужно. Подробности — `03_Assets/_quarantine/README.md` и `00_Docs/ASSET_LIBRARY.md`, раздел 15.

## История (исходный текст реестра)

Создано 2026-10-24 при проверке лицензий. 88 файлов Mixkit в библиотеке скачаны скриптом, а User Terms Mixkit (разд. 9) запрещают массовое скачивание скриптами и ботами; разд. 11 позволяет Envato прекратить лицензию при нарушении. Подробно: `03_Assets/Licenses/mixkit_LICENSE.md`.

**Правило.** Больше никаких скриптовых обращений к mixkit.co (ни curl, ни агентов). Перед тем как файл Mixkit попадёт в публикуемый ролик, владелец:

1. открывает страницу из колонки «Страница» в своём браузере и скачивает этот же ассет кнопкой Download (страницы SFX и музыки — категории: искать по названию);
2. кладёт файл в `01_Input/mixkit_manual/` и сверяет `shasum -a 256 <файл>` с колонкой «Сверка»: у неизменённых файлов хэш должен совпасть с библиотечным, у обработанных — с хэшем оригинала; если хэша оригинала нет, ручной файл становится новым исходником, а обработку (обрезка, перекодирование) повторяют в копии проекта;
3. заполняет дату и результат в этой таблице. Без даты файл в публикуемый ролик не идёт (QA-пункт L5 в `SHORTS_EDITING_STANDARD.md`, 9E).

Для `impact_stomp_heavy`, `pop_light_whoosh`, `record_scratch_freeze` ручной оригинал (со встроенной обложкой/метаданными) хранится байт-в-байт вместо библиотечной копии, чистка делается только в проекте.

| # | Лог | Файл в библиотеке | Название | Страница | Сверка sha256 | Дата ручного скачивания | Результат |
|---|---|---|---|---|---|---|---|
| 1 | sfx | `03_Assets/Sound_Effects/whoosh/whoosh_fast_transition_mixkit.wav` | Fast whoosh transition | https://mixkit.co/free-sound-effects/transition/ | `2f914dcec127` | | |
| 2 | sfx | `03_Assets/Sound_Effects/whoosh/whoosh_cinematic_fast_mixkit.wav` | Cinematic whoosh fast transition | https://mixkit.co/free-sound-effects/transition/ | `02b8cd40b376` | | |
| 3 | sfx | `03_Assets/Sound_Effects/whoosh/whoosh_air_short_mixkit.wav` | Air woosh | https://mixkit.co/free-sound-effects/whoosh/ | `fdc4f87eb2c6` | | |
| 4 | sfx | `03_Assets/Sound_Effects/whoosh/swish_quick_accent_mixkit.wav` | Quick swoosh accent | https://mixkit.co/free-sound-effects/swoosh/ | `c281bc7a87f7` | | |
| 5 | sfx | `03_Assets/Sound_Effects/whoosh/whoosh_zoom_vacuum_mixkit.wav` | Air zoom vacuum | https://mixkit.co/free-sound-effects/transition/ | `62d46c7faeaa` | | |
| 6 | sfx | `03_Assets/Sound_Effects/whoosh/whoosh_long_windy_mixkit.wav` | Transition windy swoosh | https://mixkit.co/free-sound-effects/swoosh/ | `ebd16aaf114f` | | |
| 7 | sfx | `03_Assets/Sound_Effects/whoosh/whoosh_long_tunnel_reverb_mixkit.wav` | Cinematic tunnel reverb woosh | https://mixkit.co/free-sound-effects/swoosh/ | `0c5943e1f934` | | |
| 8 | sfx | `03_Assets/Sound_Effects/impact/impact_boom_intro_mixkit.wav` | Movie impact intro presentation | https://mixkit.co/free-sound-effects/boom/ | `fa492598b602` | | |
| 9 | sfx | `03_Assets/Sound_Effects/impact/impact_quick_zoom_mixkit.wav` | Quick zoom impact | https://mixkit.co/free-sound-effects/impact/ | `a9acddce67b0` | | |
| 10 | sfx | `03_Assets/Sound_Effects/impact/impact_wood_hard_hit_mixkit.wav` | Wood hard hit | https://mixkit.co/free-sound-effects/impact/ | `3076e618e540` | | |
| 11 | sfx | `03_Assets/Sound_Effects/impact/impact_stomp_heavy_mixkit.wav` | Apocalyptic stomp impact | https://mixkit.co/free-sound-effects/transition/ | оригинал `48ccce0ec93e` | | |
| 12 | sfx | `03_Assets/Sound_Effects/riser/riser_reverse_build_hardstop_mixkit.wav` | Reverse cinematic impact trailer | https://mixkit.co/free-sound-effects/impact/ | оригинал `a6a4ef938614` | | |
| 13 | sfx | `03_Assets/Sound_Effects/riser/riser_wind_swell_mixkit.wav` | Cinematic wind swell | https://mixkit.co/free-sound-effects/swell/ | `feba4917fb19` | | |
| 14 | sfx | `03_Assets/Sound_Effects/riser/riser_tech_choir_mixkit.wav` | Tech choir cinematic riser | https://mixkit.co/free-sound-effects/swell/ | оригинал `bbfb2d11dc08` | | |
| 15 | sfx | `03_Assets/Sound_Effects/riser/swell_magic_whip_short_mixkit.wav` | Magic whip swell | https://mixkit.co/free-sound-effects/swell/ | `f678f48d7833` | | |
| 16 | sfx | `03_Assets/Sound_Effects/riser/swell_dark_sweep_mixkit.wav` | Terror sweep of darkness | https://mixkit.co/free-sound-effects/horror/ | `93625f174aa1` | | |
| 17 | sfx | `03_Assets/Sound_Effects/glitch/glitch_static_short_mixkit.wav` | Glitch static | https://mixkit.co/free-sound-effects/glitch/ | `cc9f5435e533` | | |
| 18 | sfx | `03_Assets/Sound_Effects/glitch/glitch_digital_break_mixkit.wav` | Digital glitch break | https://mixkit.co/free-sound-effects/glitch/ | `17f28a9bca1c` | | |
| 19 | sfx | `03_Assets/Sound_Effects/glitch/glitch_intro_text_mixkit.wav` | Intro text glitch | https://mixkit.co/free-sound-effects/glitch/ | `fd8eb50fab45` | | |
| 20 | sfx | `03_Assets/Sound_Effects/glitch/glitch_rewind_transition_mixkit.wav` | Glitch sci fi rewind transition | https://mixkit.co/free-sound-effects/glitch/ | `d8ad4c58b819` | | |
| 21 | sfx | `03_Assets/Sound_Effects/ui_pop_click/pop_light_whoosh_mixkit.wav` | Explainer video pops whoosh light pop | https://mixkit.co/free-sound-effects/whoosh/ | оригинал `2ae8c9395cb0` | | |
| 22 | sfx | `03_Assets/Sound_Effects/ui_pop_click/pop_hard_click_mixkit.wav` | Hard pop click | https://mixkit.co/free-sound-effects/cartoon/ | `9b80f4c8f013` | | |
| 23 | sfx | `03_Assets/Sound_Effects/comedic/boing_hit_mixkit.wav` | Boing hit sound | https://mixkit.co/free-sound-effects/cartoon/ | `9d0611005031` | | |
| 24 | sfx | `03_Assets/Sound_Effects/comedic/slide_whistle_falling_mixkit.wav` | Cartoon falling whistle | https://mixkit.co/free-sound-effects/cartoon/ | `e7d5268140d1` | | |
| 25 | sfx | `03_Assets/Sound_Effects/comedic/slide_whistle_toy_up_mixkit.wav` | Cartoon toy whistle | https://mixkit.co/free-sound-effects/cartoon/ | `b4b3a111a8c4` | | |
| 26 | sfx | `03_Assets/Sound_Effects/comedic/trombone_sad_fail_mixkit.wav` | Trombone disappoint | https://mixkit.co/free-sound-effects/cartoon/ | `5f8ef1f18907` | | |
| 27 | sfx | `03_Assets/Sound_Effects/comedic/bonk_dazzle_birds_mixkit.wav` | Cartoon dazzle hit and birds | https://mixkit.co/free-sound-effects/cartoon/ | `7cefd3617cad` | | |
| 28 | sfx | `03_Assets/Sound_Effects/comedic/record_scratch_freeze_mixkit.wav` | Record player vinyl scratch | https://mixkit.co/free-sound-effects/dj-record-scratch/ | оригинал `64ddb70bbb8e` | | |
| 29 | sfx | `03_Assets/Sound_Effects/paper_typing_camera/typewriter_typing_burst_mixkit.wav` | Data input on typewriter | https://mixkit.co/free-sound-effects/typewriter/ | `39056c98ee38` | | |
| 30 | sfx | `03_Assets/Sound_Effects/paper_typing_camera/typewriter_single_key_mixkit.wav` | Mechanical typewriter hit | https://mixkit.co/free-sound-effects/typewriter/ | `d23b563a38a9` | | |
| 31 | sfx | `03_Assets/Sound_Effects/paper_typing_camera/typewriter_return_bell_mixkit.wav` | Typewriter return bell | https://mixkit.co/free-sound-effects/typewriter/ | `8a26e22c4424` | | |
| 32 | sfx | `03_Assets/Sound_Effects/paper_typing_camera/camera_shutter_click_mixkit.wav` | Camera shutter click | https://mixkit.co/free-sound-effects/camera/ | `0a38265f9328` | | |
| 33 | sfx | `03_Assets/Sound_Effects/paper_typing_camera/paper_page_turn_big_mixkit.wav` | Big paper page turn | https://mixkit.co/free-sound-effects/paper/ | `5d72362b8084` | | |
| 34 | sfx | `03_Assets/Sound_Effects/paper_typing_camera/paper_slide_mixkit.wav` | Paper slide | https://mixkit.co/free-sound-effects/paper/ | `2e945267f562` | | |
| 35 | sfx | `03_Assets/Sound_Effects/paper_typing_camera/paper_crumple_quick_mixkit.wav` | Quick paper crumple sound | https://mixkit.co/free-sound-effects/paper/ | `c8fb179dd5ac` | | |
| 36 | sfx | `03_Assets/Sound_Effects/paper_typing_camera/paper_newspaper_drop_mixkit.wav` | Newspaper falling to the floor | https://mixkit.co/free-sound-effects/paper/ | `68513061f5e2` | | |
| 37 | sfx | `03_Assets/Sound_Effects/paper_typing_camera/paper_signing_pen_mixkit.wav` | Signing on a paper | https://mixkit.co/free-sound-effects/paper/ | `74b3a69c93db` | | |
| 38 | sfx | `03_Assets/Sound_Effects/cash_coin/coins_clinking_mixkit.wav` | Clinking coins | https://mixkit.co/free-sound-effects/coin/ | `0c24f5172586` | | |
| 39 | sfx | `03_Assets/Sound_Effects/cash_coin/money_bag_drop_mixkit.wav` | Money bag drop | https://mixkit.co/free-sound-effects/coin/ | `2bf1ae861a32` | | |
| 40 | sfx | `03_Assets/Sound_Effects/cash_coin/coin_gold_prize_mixkit.wav` | Gold coin prize | https://mixkit.co/free-sound-effects/coin/ | `ef9e8681a327` | | |
| 41 | sfx | `03_Assets/Sound_Effects/crowd_reaction/gasp_male_astonished_mixkit.wav` | Male astonished gasp | https://mixkit.co/free-sound-effects/gasp/ | `56dae0bdbf89` | | |
| 42 | sfx | `03_Assets/Sound_Effects/crowd_reaction/gasp_female_astonished_mixkit.wav` | Female astonished gasp | https://mixkit.co/free-sound-effects/gasp/ | `19e2f37ddadc` | | |
| 43 | sfx | `03_Assets/Sound_Effects/crowd_reaction/crowd_laugh_short_mixkit.wav` | Crowd laugh | https://mixkit.co/free-sound-effects/crowd/ | `64f5e7fbb28c` | | |
| 44 | sfx | `03_Assets/Sound_Effects/crowd_reaction/crowd_laugh_big_mixkit.wav` | Big crowd laughing | https://mixkit.co/free-sound-effects/crowd/ | `a6ed78822e78` | | |
| 45 | sfx | `03_Assets/Sound_Effects/crowd_reaction/crowd_ovation_small_mixkit.wav` | Small crowd ovation | https://mixkit.co/free-sound-effects/applause/ | `e977854f7157` | | |
| 46 | sfx | `03_Assets/Sound_Effects/crowd_reaction/clap_slow_single_man_mixkit.wav` | One man clapping | https://mixkit.co/free-sound-effects/applause/ | `4d7b31d55cdf` | | |
| 47 | sfx | `03_Assets/Sound_Effects/crowd_reaction/crowd_cheer_whistle_big_mixkit.wav` | Cheering crowd loud whistle | https://mixkit.co/free-sound-effects/applause/ | `bb1470ac5f18` | | |
| 48 | sfx | `03_Assets/Sound_Effects/tension_stinger/stinger_deep_heartbeat_impact_mixkit.wav` | Deep heartbeat impact | https://mixkit.co/free-sound-effects/impact/ | `6097c4b9350b` | | |
| 49 | sfx | `03_Assets/Sound_Effects/tension_stinger/stinger_horror_hit_mixkit.wav` | Horror impact | https://mixkit.co/free-sound-effects/horror/ | `2fa559679f33` | | |
| 50 | sfx | `03_Assets/Sound_Effects/tension_stinger/stinger_eerie_trailer_horn_mixkit.wav` | Eerie trailer horn transition | https://mixkit.co/free-sound-effects/transition/ | `d6ca8fe997b3` | | |
| 51 | sfx | `03_Assets/Sound_Effects/tension_stinger/heartbeat_fast_mixkit.wav` | Fast Heartbeat | https://mixkit.co/free-sound-effects/heartbeat/ | `7b3f0226ee74` | | |
| 52 | sfx | `03_Assets/Sound_Effects/tension_stinger/clock_tick_tock_close_mixkit.wav` | Tick tock clock close up | https://mixkit.co/free-sound-effects/suspense-music/ | `bbcda2007cd8` | | |
| 53 | sfx | `03_Assets/Sound_Effects/tension_stinger/drum_roll_tension_mixkit.wav` | Tension and suspense drum roll | https://mixkit.co/free-sound-effects/suspense-music/ | `fbb18b16864e` | | |
| 54 | sfx | `03_Assets/Sound_Effects/ambience/ambience_crowd_talking_loop_mixkit.wav` | Big crowd talking loop | https://mixkit.co/free-sound-effects/crowd/ | оригинал `54669eec2b4b` | | |
| 55 | sfx | `03_Assets/Sound_Effects/ambience/ambience_city_day_urban_mixkit.wav` | Urban ambience during the day | https://mixkit.co/free-sound-effects/wind/ | `442914133fab` | | |
| 56 | sfx | `03_Assets/Sound_Effects/ambience/ambience_rain_light_loop_mixkit.wav` | Light rain loop | https://mixkit.co/free-sound-effects/rain/ | `843c7ef2dbff` | | |
| 57 | sfx | `03_Assets/Sound_Effects/ambience/ambience_rain_thunderstorm_mixkit.wav` | Rain and thunder storm | https://mixkit.co/free-sound-effects/rain/ | `69ca82bbd8b9` | | |
| 58 | sfx | `03_Assets/Sound_Effects/ambience/ambience_wind_mountain_mixkit.wav` | Wind in the top of the mountain | https://mixkit.co/free-sound-effects/wind/ | `886294777224` | | |
| 59 | sfx | `03_Assets/Sound_Effects/ambience/ambience_forest_wind_birds_mixkit.wav` | Windy humming forest with birds | https://mixkit.co/free-sound-effects/wind/ | оригинал `c3030fc6db86` | | |
| 60 | sfx | `03_Assets/Sound_Effects/ambience/ambience_room_tone_cinematic_mixkit.wav` | Cinematic room tone | https://mixkit.co/free-sound-effects/suspense-music/ | оригинал `6b61483c0780` | | |
| 61 | music | `03_Assets/Music/curious_light/music_little_bells_diego_nava_mixkit.mp3` | Little Bells | https://mixkit.co/free-stock-music/mood/playful/ | `f69583e38a06` | | |
| 62 | music | `03_Assets/Music/tension_mystery/music_selpan_drone_eugenio_mininni_mixkit.mp3` | Selpan | https://mixkit.co/free-stock-music/mood/mysterious/ | `3d46ec4a1572` | | |
| 63 | music | `03_Assets/Music/epic_reveal/music_dreaming_big_ahjay_stelino_mixkit.mp3` | Dreaming Big | https://mixkit.co/free-stock-music/mood/hopeful/ | `8c89819547b4` | | |
| 64 | music | `03_Assets/Music/epic_reveal/music_lifes_a_movie_arulo_mixkit.mp3` | Life's a Movie | https://mixkit.co/free-stock-music/mood/epic/ | `0756e185c635` | | |
| 65 | music | `03_Assets/Music/comedic_quirky/music_kidding_around_ahjay_stelino_mixkit.mp3` | Kidding Around | https://mixkit.co/free-stock-music/mood/quirky/ | `be3b80ed1ddf` | | |
| 66 | music | `03_Assets/Music/documentary_neutral/music_forest_mist_whispers_alejandro_magana_mixkit.mp3` | Forest Mist Whispers | https://mixkit.co/free-stock-music/mood/hopeful/ | `30232da0b952` | | |
| 67 | music | `03_Assets/Music/documentary_neutral/music_ambient_bed_voxscape_eugenio_mininni_mixkit.mp3` | Voxscape | https://mixkit.co/free-stock-music/mood/neutral/ | `926b63a89893` | | |
| 68 | music | `03_Assets/Music/upbeat_energy/music_games_music_grigoriy_nuzhny_mixkit.mp3` | Games Music | https://mixkit.co/free-stock-music/mood/energetic/ | `c1129accbe28` | | |
| 69 | visuals | `03_Assets/Overlays/smoke_fog/overlay_smoke_white_on_black_1080p_mixkit.mp4` | overlay_smoke_white_on_black_1080p_mixkit | https://mixkit.co/free-stock-video/white-smoke-with-black-background-1960/ | `35ea3598041b` | | |
| 70 | visuals | `03_Assets/Overlays/smoke_fog/overlay_mist_thick_flowing_1080p_mixkit.mp4` | overlay_mist_thick_flowing_1080p_mixkit | https://mixkit.co/free-stock-video/white-thick-mist-continuously-flows-at-a-fast-pace-50943/ | `1cbb8f683299` | | |
| 71 | visuals | `03_Assets/Overlays/sparks_particles/overlay_flames_and_sparks_1080p_mixkit.mp4` | overlay_flames_and_sparks_1080p_mixkit | https://mixkit.co/free-stock-video/flames-and-sparks-684/ | `5f9ea619cd74` | | |
| 72 | visuals | `03_Assets/Overlays/sparks_particles/overlay_sparks_fire_on_black_vertical_mixkit.mp4` | overlay_sparks_fire_on_black_vertical_mixkit | https://mixkit.co/free-stock-video/sparks-of-fire-on-a-black-background-3463/ | `b1c2665437e0` | | |
| 73 | visuals | `03_Assets/Overlays/sparks_particles/overlay_embers_lava_particles_1080p_mixkit.mp4` | overlay_embers_lava_particles_1080p_mixkit | https://mixkit.co/free-stock-video/burning-lava-particles-leaping-through-the-air-4426/ | `02bc0a33e590` | | |
| 74 | visuals | `03_Assets/Overlays/sparks_particles/overlay_flames_blazing_on_black_vertical_mixkit.mp4` | overlay_flames_blazing_on_black_vertical_mixkit | https://mixkit.co/free-stock-video/vertical-video-of-blazing-flames-over-a-black-backdrop-52284/ | `1269b4df9624` | | |
| 75 | visuals | `03_Assets/Overlays/glitch_vhs/overlay_glitch_static_pixel_noise_1080p_mixkit.mp4` | overlay_glitch_static_pixel_noise_1080p_mixkit | https://mixkit.co/free-stock-video/screen-with-static-and-pixel-noise-4111/ | `b49026b9df4d` | | |
| 76 | visuals | `03_Assets/Overlays/glitch_vhs/overlay_tv_static_bw_1080p_mixkit.mp4` | overlay_tv_static_bw_1080p_mixkit | https://mixkit.co/free-stock-video/television-screen-with-static-in-black-and-white-4135/ | `474d596dbf8c` | | |
| 77 | visuals | `03_Assets/Overlays/lens_flare_bokeh/overlay_bokeh_round_lights_blinking_1080p_mixkit.mp4` | overlay_bokeh_round_lights_blinking_1080p_mixkit | https://mixkit.co/free-stock-video/blinking-round-lights-with-bokeh-effect-38/ | `d93981e6e3a9` | | |
| 78 | visuals | `03_Assets/Overlays/lens_flare_bokeh/overlay_bokeh_monochrome_floating_1080p_mixkit.mp4` | overlay_bokeh_monochrome_floating_1080p_mixkit | https://mixkit.co/free-stock-video/monochrome-bokeh-lights-floating-softly-99828/ | `5130e7ad645f` | | |
| 79 | visuals | `03_Assets/Cinematic_Effects/old_film/cinematic_film_leader_countdown_1080p_mixkit.mp4` | cinematic_film_leader_countdown_1080p_mixkit | https://mixkit.co/free-stock-video/vintage-film-roll-effect-with-countdown-4421/ | `5358dfd08b7b` | | |
| 80 | visuals | `03_Assets/Transitions/chroma_ink_reveals/transition_black_liquid_covers_greenscreen_1080p_mixkit.mp4` | transition_black_liquid_covers_greenscreen_1080p_mixkit | https://mixkit.co/free-stock-video/black-liquid-covering-a-green-screen-3993/ | `6d31adea812f` | | |
| 81 | visuals | `03_Assets/Transitions/chroma_ink_reveals/transition_black_drops_cover_greenscreen_vertical_mixkit.mp4` | transition_black_drops_cover_greenscreen_vertical_mixkit | https://mixkit.co/free-stock-video/black-drops-covering-a-green-background-4900/ | `f423a4ee55f5` | | |
| 82 | visuals | `03_Assets/Transitions/chroma_ink_reveals/transition_shapes_reveal_greenscreen_vertical_mixkit.mp4` | transition_shapes_reveal_greenscreen_vertical_mixkit | https://mixkit.co/free-stock-video/abstract-figures-reveal-a-green-screen-3998/ | `2b7d895a8228` | | |
| 83 | visuals | `03_Assets/Transitions/chroma_ink_reveals/transition_white_sheet_covers_greenscreen_vertical_mixkit.mp4` | transition_white_sheet_covers_greenscreen_vertical_mixkit | https://mixkit.co/free-stock-video/white-sheet-covering-a-chroma-background-3996/ | `3e8fd8f40ece` | | |
| 84 | visuals | `03_Assets/Transitions/ink_luma_mattes/transition_black_ink_splash_on_white_1080p_mixkit.mp4` | transition_black_ink_splash_on_white_1080p_mixkit | https://mixkit.co/free-stock-video/black-ink-splashing-505/ | `806576e24949` | | |
| 85 | memes | `03_Assets/Memes_Reactions/failure/reaction_frustrated_woman_head_in_hand_mixkit.mp4` | Frustrated young woman at a laptop drops her head into her hand | https://mixkit.co/free-stock-video/young-very-frustrated-woman-in-front-of-her-computer-25575/ | обработан: ручной файл = новый исходник | | |
| 86 | memes | `03_Assets/Memes_Reactions/shock_surprise/reaction_surprised_man_hands_on_head_mixkit.mp4` | Surprised man grabs his head with both hands | https://mixkit.co/free-stock-video/surprised-man-with-hands-on-head-4508/ | обработан: ручной файл = новый исходник | | |
| 87 | memes | `03_Assets/Memes_Reactions/comedy_laugh/reaction_man_laughing_closeup_mixkit.mp4` | Man laughs head-on into the camera | https://mixkit.co/free-stock-video/man-laughing-head-on-closeup-4760/ | обработан: ручной файл = новый исходник | | |
| 88 | memes | `03_Assets/Memes_Reactions/disappointment/reaction_sad_confused_man_mixkit.mp4` | Sad, confused young man close-up | https://mixkit.co/free-stock-video/face-of-a-sad-and-confused-man-43850/ | обработан: ручной файл = новый исходник | | |
