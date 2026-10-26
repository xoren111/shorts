# _quarantine: файлы, выведенные из библиотеки

Файлы здесь **не используются в роликах**, пока их не заменят или владелец не примет отдельное решение.
Ничего не удалено. Путь внутри `_quarantine/` повторяет прежний путь в `03_Assets/`. Записи в логах
(`02_Research/download_logs/memes.json`, массив `quarantined`) и в `00_Docs/ASSET_DOWNLOAD_LOG.md` сохранены с новым путём.

| Дата | Файл (прежний путь в 03_Assets) | sha256 | Причина | Чем заменить |
|---|---|---|---|---|
| 2026-10-24 | `Cinematic_Effects/pd_gov_footage/govpd_atomic_test_baker_1946_commons.mp4` | `f3c8e96bb849…` | Съёмка правительства США (PD), но Commons указывает источником копии коммерческий документальный фильм «Trinity & Beyond: The Atomic Bomb Movie» (1995). Синий тон взят из грейда этого фильма. Поэтому вероятен матч Content ID с документалкой. Кроме того, ядерные испытания — чувствительная тема. Проверено 24.10 по Commons API: в поле `Credit` и в `source` стоит «Trinity & Beyond» | прямая копия Operation Crossroads «Baker» от NARA или DOE (Commons-файл, где источником указан NARA или DOE, или archive.org с гос. происхождением) |
| 2026-10-24 | `Memes_Reactions/sarcasm/reaction_rolling_eyes_commons_ccbysa.mp4` | `898610cdc682…` | Лицензия CC BY-SA 3.0, и на Commons стоит шаблон Personality rights (проверено 24.10: `Restrictions: personality`). Любая правка делает из клипа адаптацию, которая сама должна выйти под BY-SA. Правка неизбежна: правило владельца требует обрезать мем до 0,8–2 с и класть поверх предыдущего кадра, а звук уже вырезан. Так ролик владельца сдвигается к лицензии BY-SA | реакция Atlas `eye_roll` / `skeptical` из рига владельца, рисованная реакция или реакция Pixabay через официальный API (Mixkit с 24.10 не используем) |
| 2026-10-24 | `Cinematic_Effects/pd_film_inserts/pdfilm_lloyd_clock_hang_safety_last_1923_commons.mp4` | `587fafb6c6cd…` | Фильм в США в PD, но эта копия — рип YIFY (пиратская группа) с Blu-ray реставрации Criterion 2013 (Commons: категория «Media from YIFY»). Правообладатель активен: Harold Lloyd Entertainment судилась в 2014 г. из-за копии сцены с часами. Источник копии недопустим независимо от статуса фильма | копия оригинальной эпохи без реставрации (archive.org / Library of Congress) или реакция Atlas |
| 2026-10-24 | `Cinematic_Effects/pd_film_inserts/pdfilm_crowd_gasps_safety_last_1923_commons.mp4` | `bc2d732eb183…` | та же копия YIFY/Criterion | то же |

Вернуть файл в библиотеку можно только решением владельца. Тогда его надо перенести обратно, убрать запись из `quarantined` в логе
и вернуть строки в `ASSET_LIBRARY.md`.

## 2026-10-24 — Mixkit: 88 файлов (`_quarantine/mixkit/`)

**Причина.** Все 88 файлов Mixkit скачаны скриптом (curl) с assets.mixkit.co; около 200 быстрых запросов к mixkit.co вызвали Cloudflare/429. User Terms Mixkit (разд. 9) запрещают массовое скачивание скриптами и ботами, а разд. 11 позволяет Envato прекратить лицензию при нарушении. **Решение владельца 24.10:** не перекачивать вручную, а заменить все файлы лицензированными аналогами из официальных API и источников с разрешённой прямой загрузкой, а файлы Mixkit убрать в карантин. Ничего не удалено.

**Что перенесено.** 88 файлов, 802318611 байт (802.3 MB): 60 SFX, 8 треков музыки, 16 визуалов (оверлеи, переходы, ракорд), 4 реакции. Путь: `03_Assets/_quarantine/mixkit/<прежний путь внутри 03_Assets>` (например, `Sound_Effects/whoosh/whoosh_fast_transition_mixkit.wav`). sha256 всех 88 файлов после переноса совпал с логом.

**Где замены.** В той же папке библиотеки, что и прежний файл:
- 60 SFX → оригиналы Freesound, CC0 1.0 (`03_Assets/Sound_Effects/<подпапка>/sfx_*_freesound_<id>.*`), лог `02_Research/download_logs/freesound.json`;
- 8 треков → Kevin MacLeod (Incompetech), CC BY 4.0, кредит в описании обязателен (`03_Assets/Music/<настроение>/music_*_kevin_macleod_incompetech_<isrc>.mp3`), лог `music_replacement.json`;
- 19 клипов → Pixabay, Pixabay Content License (`*_pixabay_<id>.mp4`), лог `pixabay.json`;
- без замены 1: `Transitions/chroma_ink_reveals/transition_shapes_reveal_greenscreen_vertical_mixkit.mp4` — кодом (`JaggedReveal`, `00_Docs/ASSET_LIBRARY.md`, 4.1; компонент ещё не написан, там только спецификация).

В логах замен у каждой записи есть поле `replaces_mixkit` (в музыке `replaces_mixkit_file`) и `replaces_mixkit_quarantined_at`. Записи Mixkit в `sfx.json`, `music.json`, `visuals.json`, `memes.json` перенесены в массив `quarantined` (новый путь, `original_file`, `quarantine_reason`, `replaced_by`, `replacement_match`). Список «файл → замена → совпадение» — `00_Docs/ASSET_LIBRARY.md`, раздел 15. Лицензионные заметки `03_Assets/Licenses/mixkit_*.md` оставлены на месте как история условий.

| # | Файл в карантине (`03_Assets/_quarantine/mixkit/…`) | sha256 | Замена |
|---|---|---|---|
| 1 | `Sound_Effects/whoosh/whoosh_fast_transition_mixkit.wav` | `2f914dcec127…` | `sfx_whoosh_fast_transition_freesound_169867.wav` |
| 2 | `Sound_Effects/whoosh/whoosh_cinematic_fast_mixkit.wav` | `02b8cd40b376…` | `sfx_whoosh_cinematic_fast_freesound_648729.wav` |
| 3 | `Sound_Effects/whoosh/whoosh_air_short_mixkit.wav` | `fdc4f87eb2c6…` | `sfx_whoosh_air_soft_freesound_425693.wav` |
| 4 | `Sound_Effects/whoosh/swish_quick_accent_mixkit.wav` | `c281bc7a87f7…` | `sfx_swish_quick_accent_freesound_72190.wav` |
| 5 | `Sound_Effects/whoosh/whoosh_zoom_vacuum_mixkit.wav` | `62d46c7faeaa…` | `sfx_whoosh_zoom_warp_in_freesound_735062.wav` |
| 6 | `Sound_Effects/whoosh/whoosh_long_windy_mixkit.wav` | `ebd16aaf114f…` | `sfx_whoosh_long_windy_freesound_423799.wav` |
| 7 | `Sound_Effects/whoosh/whoosh_long_tunnel_reverb_mixkit.wav` | `0c5943e1f934…` | `sfx_whoosh_long_dark_tail_freesound_341281.wav` |
| 8 | `Sound_Effects/impact/impact_boom_intro_mixkit.wav` | `fa492598b602…` | `sfx_impact_cinematic_boom_freesound_255111.wav` |
| 9 | `Sound_Effects/impact/impact_quick_zoom_mixkit.wav` | `a9acddce67b0…` | `sfx_impact_quick_hit_freesound_755054.wav` |
| 10 | `Sound_Effects/impact/impact_wood_hard_hit_mixkit.wav` | `3076e618e540…` | `sfx_impact_wood_thud_freesound_447922.wav` |
| 11 | `Sound_Effects/impact/impact_stomp_heavy_mixkit.wav` | `af791e5f05a3…` | `sfx_impact_stomp_heavy_freesound_372517.wav` |
| 12 | `Sound_Effects/riser/riser_reverse_build_hardstop_mixkit.wav` | `b91da0deeb64…` | `sfx_riser_reverse_impact_freesound_244249.wav` |
| 13 | `Sound_Effects/riser/riser_wind_swell_mixkit.wav` | `feba4917fb19…` | `sfx_riser_wind_rising_freesound_403003.wav` |
| 14 | `Sound_Effects/riser/riser_tech_choir_mixkit.wav` | `faf059c29e02…` | `sfx_riser_build_noise_synth_freesound_334525.wav` |
| 15 | `Sound_Effects/riser/swell_magic_whip_short_mixkit.wav` | `f678f48d7833…` | `sfx_swell_reverse_guitar_short_freesound_564442.wav` |
| 16 | `Sound_Effects/riser/swell_dark_sweep_mixkit.wav` | `93625f174aa1…` | `sfx_swell_dark_creepy_whoosh_freesound_840812.wav` |
| 17 | `Sound_Effects/glitch/glitch_static_short_mixkit.wav` | `cc9f5435e533…` | `sfx_glitch_static_interference_freesound_347698.wav` |
| 18 | `Sound_Effects/glitch/glitch_digital_break_mixkit.wav` | `17f28a9bca1c…` | `sfx_glitch_digital_corruption_freesound_348585.wav` |
| 19 | `Sound_Effects/glitch/glitch_intro_text_mixkit.wav` | `fd8eb50fab45…` | `sfx_glitch_text_loop_freesound_350614.wav` |
| 20 | `Sound_Effects/glitch/glitch_rewind_transition_mixkit.wav` | `d8ad4c58b819…` | `sfx_glitch_tape_rewind_freesound_753653.wav` |
| 21 | `Sound_Effects/ui_pop_click/pop_light_whoosh_mixkit.wav` | `3fb3679ca07a…` | `sfx_pop_light_mouth_freesound_245645.flac` |
| 22 | `Sound_Effects/ui_pop_click/pop_hard_click_mixkit.wav` | `9b80f4c8f013…` | `sfx_pop_hard_lips_freesound_202230.wav` |
| 23 | `Sound_Effects/comedic/boing_hit_mixkit.wav` | `9d0611005031…` | `sfx_boing_jaw_harp_freesound_540790.wav` |
| 24 | `Sound_Effects/comedic/slide_whistle_falling_mixkit.wav` | `e7d5268140d1…` | `sfx_slide_whistle_down_freesound_497093.wav` |
| 25 | `Sound_Effects/comedic/slide_whistle_toy_up_mixkit.wav` | `b4b3a111a8c4…` | `sfx_slide_whistle_up_freesound_497092.wav` |
| 26 | `Sound_Effects/comedic/trombone_sad_fail_mixkit.wav` | `5f8ef1f18907…` | `sfx_horn_wahwah_fail_freesound_362205.wav` |
| 27 | `Sound_Effects/comedic/bonk_dazzle_birds_mixkit.wav` | `7cefd3617cad…` | `sfx_dizzy_whistle_birds_freesound_403002.wav` |
| 28 | `Sound_Effects/comedic/record_scratch_freeze_mixkit.wav` | `172597b86486…` | `sfx_record_scratch_freesound_431774.flac` |
| 29 | `Sound_Effects/paper_typing_camera/typewriter_typing_burst_mixkit.wav` | `39056c98ee38…` | `sfx_typewriter_typing_freesound_204465.wav` |
| 30 | `Sound_Effects/paper_typing_camera/typewriter_single_key_mixkit.wav` | `d23b563a38a9…` | `sfx_typewriter_single_key_freesound_380138.wav` |
| 31 | `Sound_Effects/paper_typing_camera/typewriter_return_bell_mixkit.wav` | `8a26e22c4424…` | `sfx_typewriter_bell_freesound_318687.wav` |
| 32 | `Sound_Effects/paper_typing_camera/camera_shutter_click_mixkit.wav` | `0a38265f9328…` | `sfx_camera_shutter_dslr_freesound_170229.aiff` |
| 33 | `Sound_Effects/paper_typing_camera/paper_page_turn_big_mixkit.wav` | `5d72362b8084…` | `sfx_paper_page_turn_freesound_346835.wav` |
| 34 | `Sound_Effects/paper_typing_camera/paper_slide_mixkit.wav` | `2e945267f562…` | `sfx_paper_slide_table_freesound_464302.wav` |
| 35 | `Sound_Effects/paper_typing_camera/paper_crumple_quick_mixkit.wav` | `c8fb179dd5ac…` | `sfx_paper_crumple_quick_freesound_398897.wav` |
| 36 | `Sound_Effects/paper_typing_camera/paper_newspaper_drop_mixkit.wav` | `68513061f5e2…` | `sfx_paper_newspaper_drop_freesound_67034.wav` |
| 37 | `Sound_Effects/paper_typing_camera/paper_signing_pen_mixkit.wav` | `74b3a69c93db…` | `sfx_paper_signing_pen_freesound_326961.wav` |
| 38 | `Sound_Effects/cash_coin/coins_clinking_mixkit.wav` | `0c24f5172586…` | `sfx_coins_clinking_hands_freesound_336567.wav` |
| 39 | `Sound_Effects/cash_coin/money_bag_drop_mixkit.wav` | `2bf1ae861a32…` | `sfx_money_bag_freesound_338260.wav` |
| 40 | `Sound_Effects/cash_coin/coin_gold_prize_mixkit.wav` | `ef9e8681a327…` | `sfx_coin_bling_win_freesound_443334.wav` |
| 41 | `Sound_Effects/crowd_reaction/gasp_male_astonished_mixkit.wav` | `56dae0bdbf89…` | `sfx_gasp_male_shocked_freesound_677888.wav` |
| 42 | `Sound_Effects/crowd_reaction/gasp_female_astonished_mixkit.wav` | `19e2f37ddadc…` | `sfx_gasp_female_freesound_509883.wav` |
| 43 | `Sound_Effects/crowd_reaction/crowd_laugh_short_mixkit.wav` | `64f5e7fbb28c…` | `sfx_crowd_laugh_small_freesound_324894.wav` |
| 44 | `Sound_Effects/crowd_reaction/crowd_laugh_big_mixkit.wav` | `a6ed78822e78…` | `sfx_crowd_laugh_clap_bar_freesound_397034.wav` |
| 45 | `Sound_Effects/crowd_reaction/crowd_ovation_small_mixkit.wav` | `e977854f7157…` | `sfx_crowd_ovation_small_freesound_32260.wav` |
| 46 | `Sound_Effects/crowd_reaction/clap_slow_single_man_mixkit.wav` | `4d7b31d55cdf…` | `sfx_clap_solo_freesound_151219.wav` |
| 47 | `Sound_Effects/crowd_reaction/crowd_cheer_whistle_big_mixkit.wav` | `bb1470ac5f18…` | `sfx_crowd_cheer_whistle_freesound_453863.flac` |
| 48 | `Sound_Effects/tension_stinger/stinger_deep_heartbeat_impact_mixkit.wav` | `6097c4b9350b…` | `sfx_heartbeat_deep_bass_freesound_595050.wav` |
| 49 | `Sound_Effects/tension_stinger/stinger_horror_hit_mixkit.wav` | `2fa559679f33…` | `sfx_stinger_horror_stab_freesound_271945.wav` |
| 50 | `Sound_Effects/tension_stinger/stinger_eerie_trailer_horn_mixkit.wav` | `d6ca8fe997b3…` | `sfx_stinger_braam_freesound_647712.flac` |
| 51 | `Sound_Effects/tension_stinger/heartbeat_fast_mixkit.wav` | `7b3f0226ee74…` | `sfx_heartbeat_97bpm_freesound_688735.wav` |
| 52 | `Sound_Effects/tension_stinger/clock_tick_tock_close_mixkit.wav` | `bbcda2007cd8…` | `sfx_clock_ticking_close_freesound_408741.wav` |
| 53 | `Sound_Effects/tension_stinger/drum_roll_tension_mixkit.wav` | `fbb18b16864e…` | `sfx_drum_roll_snare_freesound_111653.wav` |
| 54 | `Sound_Effects/ambience/ambience_crowd_talking_loop_mixkit.wav` | `9acc8ff8d9ed…` | `sfx_ambience_crowd_murmur_freesound_432331.wav` |
| 55 | `Sound_Effects/ambience/ambience_city_day_urban_mixkit.wav` | `442914133fab…` | `sfx_ambience_city_street_day_freesound_723607.wav` |
| 56 | `Sound_Effects/ambience/ambience_rain_light_loop_mixkit.wav` | `843c7ef2dbff…` | `sfx_ambience_rain_light_freesound_167034.wav` |
| 57 | `Sound_Effects/ambience/ambience_rain_thunderstorm_mixkit.wav` | `69ca82bbd8b9…` | `sfx_ambience_rain_thunder_freesound_237729.wav` |
| 58 | `Sound_Effects/ambience/ambience_wind_mountain_mixkit.wav` | `886294777224…` | `sfx_ambience_wind_howl_freesound_117611.wav` |
| 59 | `Sound_Effects/ambience/ambience_forest_wind_birds_mixkit.wav` | `1a982b6de80d…` | `sfx_ambience_forest_wind_birds_freesound_288899.wav` |
| 60 | `Sound_Effects/ambience/ambience_room_tone_cinematic_mixkit.wav` | `86dd084cb51b…` | `sfx_ambience_room_tone_theatre_freesound_144042.wav` |
| 61 | `Music/curious_light/music_little_bells_diego_nava_mixkit.mp3` | `f69583e38a06…` | `music_teddy_bear_waltz_kevin_macleod_incompetech_usuan1700064.mp3` |
| 62 | `Music/tension_mystery/music_selpan_drone_eugenio_mininni_mixkit.mp3` | `3d46ec4a1572…` | `music_mirage_drone_kevin_macleod_incompetech_usuan1100877.mp3` |
| 63 | `Music/epic_reveal/music_dreaming_big_ahjay_stelino_mixkit.mp3` | `8c89819547b4…` | `music_americana_orchestral_kevin_macleod_incompetech_usuan1200092.mp3` |
| 64 | `Music/epic_reveal/music_lifes_a_movie_arulo_mixkit.mp3` | `0756e185c635…` | `music_eternal_hope_piano_kevin_macleod_incompetech_usuan1100238.mp3` |
| 65 | `Music/comedic_quirky/music_kidding_around_ahjay_stelino_mixkit.mp3` | `be3b80ed1ddf…` | `music_mischief_maker_kevin_macleod_incompetech_usuan1700009.mp3` |
| 66 | `Music/documentary_neutral/music_forest_mist_whispers_alejandro_magana_mixkit.mp3` | `30232da0b952…` | `music_immersed_piano_strings_kevin_macleod_incompetech_usuan1600010.mp3` |
| 67 | `Music/documentary_neutral/music_ambient_bed_voxscape_eugenio_mininni_mixkit.mp3` | `926b63a89893…` | `music_soaring_ambient_bed_kevin_macleod_incompetech_usuan1600040.mp3` |
| 68 | `Music/upbeat_energy/music_games_music_grigoriy_nuzhny_mixkit.mp3` | `c1129accbe28…` | `music_exit_the_premises_kevin_macleod_incompetech_usuan1500029.mp3` |
| 69 | `Overlays/smoke_fog/overlay_smoke_white_on_black_1080p_mixkit.mp4` | `35ea3598041b…` | `overlay_smoke_white_on_black_4k_pixabay_98025.mp4` |
| 70 | `Overlays/smoke_fog/overlay_mist_thick_flowing_1080p_mixkit.mp4` | `1cbb8f683299…` | `overlay_fog_mist_flowing_4k_pixabay_197704.mp4` |
| 71 | `Overlays/sparks_particles/overlay_flames_and_sparks_1080p_mixkit.mp4` | `5f9ea619cd74…` | `overlay_flames_embers_on_black_1080p_pixabay_106366.mp4` |
| 72 | `Overlays/sparks_particles/overlay_sparks_fire_on_black_vertical_mixkit.mp4` | `b1c2665437e0…` | `overlay_fire_sparks_on_black_4k_pixabay_299601.mp4` |
| 73 | `Overlays/sparks_particles/overlay_embers_lava_particles_1080p_mixkit.mp4` | `02bc0a33e590…` | `overlay_embers_particles_on_black_4k_pixabay_45595.mp4` |
| 74 | `Overlays/sparks_particles/overlay_flames_blazing_on_black_vertical_mixkit.mp4` | `1269b4df9624…` | `overlay_flames_on_black_4k_pixabay_210799.mp4` |
| 75 | `Overlays/glitch_vhs/overlay_glitch_static_pixel_noise_1080p_mixkit.mp4` | `b49026b9df4d…` | `overlay_glitch_digital_artifacts_1080p_pixabay_177755.mp4` |
| 76 | `Overlays/glitch_vhs/overlay_tv_static_bw_1080p_mixkit.mp4` | `474d596dbf8c…` | `overlay_tv_static_crt_4k_pixabay_58013.mp4` |
| 77 | `Overlays/lens_flare_bokeh/overlay_bokeh_round_lights_blinking_1080p_mixkit.mp4` | `d93981e6e3a9…` | `overlay_bokeh_city_round_lights_1080p_pixabay_10711.mp4` |
| 78 | `Overlays/lens_flare_bokeh/overlay_bokeh_monochrome_floating_1080p_mixkit.mp4` | `5130e7ad645f…` | `overlay_bokeh_white_on_black_4k_pixabay_17433.mp4` |
| 79 | `Cinematic_Effects/old_film/cinematic_film_leader_countdown_1080p_mixkit.mp4` | `5358dfd08b7b…` | `cinematic_film_leader_countdown_sepia_1080p_pixabay_144961.mp4` |
| 80 | `Transitions/chroma_ink_reveals/transition_black_liquid_covers_greenscreen_1080p_mixkit.mp4` | `6d31adea812f…` | `transition_liquid_wipe_luma_matte_1080p_pixabay_19427.mp4` |
| 81 | `Transitions/chroma_ink_reveals/transition_black_drops_cover_greenscreen_vertical_mixkit.mp4` | `f423a4ee55f5…` | `transition_ink_spill_luma_matte_1080p_pixabay_119211.mp4` |
| 82 | `Transitions/chroma_ink_reveals/transition_shapes_reveal_greenscreen_vertical_mixkit.mp4` | `2b7d895a8228…` | нет (код `JaggedReveal`) |
| 83 | `Transitions/chroma_ink_reveals/transition_white_sheet_covers_greenscreen_vertical_mixkit.mp4` | `3e8fd8f40ece…` | `transition_paper_sheet_greenscreen_pixabay_245762.mp4` |
| 84 | `Transitions/ink_luma_mattes/transition_black_ink_splash_on_white_1080p_mixkit.mp4` | `806576e24949…` | `transition_black_ink_bleed_on_white_4k_pixabay_42157.mp4` |
| 85 | `Memes_Reactions/failure/reaction_frustrated_woman_head_in_hand_mixkit.mp4` | `7906c795cbf5…` | `reaction_frustrated_man_head_in_hand_vertical_pixabay_272633.mp4` |
| 86 | `Memes_Reactions/shock_surprise/reaction_surprised_man_hands_on_head_mixkit.mp4` | `55db1d1913ac…` | `reaction_shocked_man_hand_over_mouth_4k_pixabay_122389.mp4` |
| 87 | `Memes_Reactions/comedy_laugh/reaction_man_laughing_closeup_mixkit.mp4` | `41f7e29384ab…` | `reaction_man_laughing_on_phone_4k_pixabay_204420.mp4` |
| 88 | `Memes_Reactions/disappointment/reaction_sad_confused_man_mixkit.mp4` | `267761268cd3…` | `reaction_sad_man_teary_closeup_1080p_pixabay_122390.mp4` |

Вернуть файл Mixkit в библиотеку можно только решением владельца и только после ручного скачивания со страницы Mixkit (не скриптом); затем убрать запись из `quarantined` и вернуть строку в `ASSET_LIBRARY.md`.
