# Визуальные ассеты: оверлеи, переходы, кинематографические эффекты, LUT

Собрано 2026-10-24. Полный машинный лог (источник, лицензия, SHA-256, ffprobe) — `02_Research/download_logs/visuals.json`; 19 клипов-замен Mixkit (24.10) — `02_Research/download_logs/pixabay.json` (поля `replaces_mixkit`, `match_quality`).
**Mixkit больше нет:** 16 клипов Mixkit этих папок были скачаны скриптом вопреки User Terms Mixkit (разд. 9); 24.10 они перенесены в `03_Assets/_quarantine/mixkit/` и заменены клипами Pixabay (официальный API) в тех же папках; 1 переход остался без замены (код `JaggedReveal`, см. `00_Docs/ASSET_LIBRARY.md`, 4.1).
Лицензии — `03_Assets/Licenses/` (pixabay, wikimedia_commons_vfxfootage, internet_archive_beachfront, ambientcg, polyhaven,
kenney_vfx, slaycamera_luts, selfmade_visuals, pexels_pixabay_video). Обязательные подписи для CC BY — `Licenses/ATTRIBUTION_visuals.md`.

## Сначала правила владельца (важно для Atlas Ape)

- «Максимально плавно»: между сценами — cross-dissolve. **Вспышки, light leaks, whip-переходы и тряска как переходы — нет**
  (замечание к «Humans vs Volcano», раунд 3). Light leaks / film burn ниже — только как *тихая фактура* (Screen 10–25 %)
  или для других каналов / по прямой просьбе.
- Органические переходы (чернила, жидкость, бумага) — только на сюжетном повороте, не на каждой склейке.
- Ничего статичного дольше 2–3 с (Vox edit density): пыль, зерно, дымка как раз «оживляют» статичную фотографию.
- Атрибуция CC BY обязательна (описание видео). Pixabay / CC0 / self-made — без подписи (для Pixabay по желанию «Video by <автор> from Pixabay»).

## Что уже умеет наш код (не дублируем)

| Эффект | Где | Чего коду не хватает → что добавили файлы |
|---|---|---|
| Зерно (8 PNG-кадров 1080×1920, overlay) | `football-222/short/src/ui/vox.tsx` `Grain` + `public/fx/grain_*.png` | ничего — зерно процедурное, не скачивали; добавили только 8 mm-фактуру (гейт, мерцание) |
| Бумага + виньетка | `vox.tsx` `PaperBg` (paper.jpg) | одна текстура → +4 бумаги/гранжа и карта мятой бумаги |
| Пыль-«взрыв» частицами | `vox.tsx` `Dust` | нет «живой» парящей пыли и царапин плёнки → Dust Particles 1/3, Film Damage 1, film burn, ambientCG-царапины |
| Light leak (круглое пятно) | `gfx.tsx` `LightLeak`, `Flash` | пятно идеально круглое → настоящие плёночные засветки (CC BY) |
| Глитч текста (RGB-split) | `gfx.tsx` `BigText glitch` | нет полнокадрового шума → CRT-помехи и блочный цифровой глитч (Pixabay) |
| Грейд + виньетка | `real.tsx` `GRADE`, `Look`; `gfx.tsx` `PhotoKB`, `Duotone` | грейд живёт только в Remotion → те же грейды как .cube LUT (self-made) |
| Переходы zoomthru/whip/up/circle/diag/punch/fade | `pig-war/short3/src/Short.tsx` | нет органических масок → жидкость/чернила/бумага (Pixabay), чернильная маска (Commons), брызги Kenney |

Код рисует геометрию и простые частицы; файлы дают то, что код не нарисует: реальную физику жидкости/дыма/огня,
оптику (боке, засветки), аналоговый шум, фактуру старой плёнки и бумаги.

## Overlays/

Все клипы без альфы: **на чёрном → Screen (или Add/Lighten); на белом → Multiply; на сером → Overlay/Soft-light.**
Горизонтальные 1920×1080 в вертикальном кадре — `objectFit: 'cover'` (кроп по центру) или поворот на 90° для абстрактных фактур. Клипы Pixabay в 4K (3840×2160) дают кроп 9:16 1215×2160 без потери; 1080p-клипы при вертикальном кропе масштабируются ~×1,78. У 7 клипов Pixabay есть немая AAC-дорожка (−91 дБ) — `muted` в Remotion или `-an` в ffmpeg.

| Папка | Файлы | Как применять |
|---|---|---|
| `film_grain/` | 8 mm-кадр проектора VFX FOOTAGE (CC BY, 720p): кремовая основа, зерно, пыль, тёмная скруглённая рамка, мерцание | Multiply (или Overlay) 40–80 % поверх архива/фото = «домашнее кино» |
| `dust_scratches/` | Film Damage 1 (янтарные волоски/царапины на чёрном), Dust Particles 1 (Screen), Dust Particles 3 (Multiply, для светлого фона/бумаги) — CC BY 720p; 3 still-плиты ambientCG (царапины, тонкие линии, пылинки) — CC0 2K | видео — Screen 30–70 %; still — Screen, каждые 2 кадра случайный сдвиг/поворот = «живые» царапины |
| `light_leaks/` | Light Leaks 1 (тёплые оранжевые), 5 (сине-фиолетовые — под фиолетовый грейд канала), 6 (циан-боке) — VFX FOOTAGE, CC BY, 720p | Screen 10–40 %, мягко, не как вспышка-переход |
| `paper_grunge_textures/` | бумага серый крафт, мятая белая, карта сгибов (height), пятнистый гранж (ambientCG CC0); облезлые обои (Poly Haven CC0) | фон коллажа; Multiply 40–80 % на графику/карты; карта сгибов — Overlay 20–40 % |
| `smoke_fog/` | белый дым 4K, полоса тумана 4K (Pixabay); `kenney_smoke_particles_cc0/` — мультяшные клубы/взрывы PNG с альфой | дым — Screen 20–50 %; туман медленнее и реже прежнего; Kenney — для «рисованного» кита (pig-war/short3) |
| `sparks_particles/` | искры 4K, пламя с углями 1080p (луп 60 с), тлеющие угли 4K, языки пламени 4K (Pixabay; вертикальных версий без AI нет); `kenney_particle_pack_cc0/` — 80 спрайтов с альфой | Screen; 4K-клипы кропать в 9:16; угли редкие и желтоватые — дублировать слой или утеплить; пламя 210799 жёлто-зелёное — утеплить к оранжевому |
| `glitch_vhs/` | вспышки блочного цифрового глитча 1080p, снятые помехи ЭЛТ-телевизора 4K (Pixabay) | 4–8 кадров на «фейк/ИИ/взлом», Screen или Difference; у глитча брать кадры со вспышкой; ТВ-помехи синеватые — обесцветить для ч/б |
| `lens_flare_bokeh/` | городское боке 1080p, белое боке на чёрном 4K (Pixabay; плотное и яркое — низкая прозрачность); карта «грязной линзы» (ambientCG) | Screen 15–40 % под титрами/финалом; грязь линзы — 10–25 % вместе с бликом |

### Remotion (пример)
```tsx
<AbsoluteFill style={{mixBlendMode: 'screen', opacity: 0.35}}>
  <OffthreadVideo src={staticFile('fx/overlay_dust_particles_screen_720p_vfxfootage_ccby.webm')} muted
    style={{width: '100%', height: '100%', objectFit: 'cover'}} />
</AbsoluteFill>
```
Файл скопировать в `public/fx/` проекта (Remotion читает только `public/`). WebM (VP9) Remotion читает напрямую.
Для светлого фона — `mixBlendMode: 'multiply'` и версия «multiply».

### ffmpeg (без Remotion)
```bash
# Screen-оверлей поверх клипа, 35 % (оверлей зациклен; shortest=1 обязателен, иначе ffmpeg не остановится)
ffmpeg -i base.mp4 -stream_loop -1 -i overlay.mp4 -filter_complex \
 "[0]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=gbrp[b];\
  [1]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=gbrp[o];\
  [b][o]blend=all_mode=screen:all_opacity=0.35:shortest=1,format=yuv420p" -c:v libx264 -crf 16 out.mp4
# чернильная luma-маска: A = текущий кадр, B = следующий, M = клип чернил на белом (проверено)
ffmpeg -i A.mp4 -i B.mp4 -i transition_black_ink_bleed_on_white_4k_pixabay_42157.mp4 -filter_complex \
 "[0]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,format=yuva420p[A];\
  [2]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,negate,format=gray[m];\
  [1]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,format=yuva420p[B0];\
  [B0][m]alphamerge[Bm];[A][Bm]overlay=shortest=1,format=yuv420p" -c:v libx264 -crf 16 out.mp4
```

## Transitions/

| Папка | Что | Как |
|---|---|---|
| `chroma_ink_reveals/` | С 24.10 (Pixabay): жидкие «пальцы» в несколько проходов (**luma-матте**, 16:9), одна чернильная клякса из центра (**luma-матте**, 16:9), рваная бумага с двойным ключом (зелёный = план A, синий = план B, 4K). Рваной фигуры на зелёном больше нет — кодом (`JaggedReveal`) | luma-матте: яркость = маска (белое = план A, чёрное = план B), в Remotion — как маска, без кеинга; ffmpeg — как у `ink_luma_mattes` ниже. Бумага: сначала ключ зелёного (`colorkey=<цвет>:0.30:0.08`, цвет снять пипеткой), затем синего; для Remotion заранее сделать WebM с альфой: `ffmpeg -i in.mp4 -vf "colorkey=<цвет>:0.30:0.08,format=yuva420p" -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 24 out.webm`. Переход — только на сюжетном повороте |
| `ink_luma_mattes/` | Чернила с перистыми краями на белом (Pixabay 4K; пятно ~½ кадра — увеличить для полного reveal), Black Reveal 1 (Commons CC BY) | яркость = маска: чёрное = кадр B. ffmpeg: `[matte]negate,format=gray[m];[B][m]alphamerge[Bm];[A][Bm]overlay`. Или просто Multiply поверх бумаги |
| `film_burn/` | Сепийные прожиги плёнки на чёрном, 30 с (CC BY, перекодировано в H.264) | Screen; взять 0.5–1 с самого плотного места как «прожиг» между архивными кадрами |
| `paint_splat_masks/` | 36 клякс Kenney (PNG 512 + SVG) | SVG-клякса как `clipPath`/маска, scale 0→3 за 0.3 с = «брызг-переход»; или штамп-клякса под цифрой |

## Cinematic_Effects/ (мои папки)

- `letterbox/` — чёрные полосы с прозрачным окном 2.39:1, 1.85:1, 4:5 внутри 1080×1920 и 2.39:1 для 1920×1080 (self-made PNG).
- `vignette/` — мягкая и сильная виньетка с альфой (self-made PNG).
- `film_gate/` — скруглённая «рамка проектора» (self-made PNG) — вместе с 8 mm-фактурой и Film Damage.
- `old_film/` — сепийный ракорд-отсчёт 7→0 1080p (Pixabay #144961, с 24.10 вместо Mixkit). Не зеркальный, `hflip` не нужен; перфорации нет.
- `light_masks/kenney_light_masks_cc0/` — 152 светомаски (пятна, конусы, лучи, окна): «луч прожектора», god-rays, фигурные виньетки.
- Папки `pd_film_inserts/`, `pd_gov_footage/` — не мои (агент кино-вставок), см. его лог.

## LUT — `Templates_Presets/LUTs/`

- `selfmade_atlas_kit/` — 10 своих LUT (33³): `atlas_pop_warm` / `atlas_pop_neutral` (= GRADE + Look кита), `vox_sepia_archive` (= SEPIA из vox.tsx),
  `atlas_photo_violet` (= PhotoKB), `atlas_duotone_warm/cool` (= Duotone), `bw_high_contrast`, `faded_film_warm`, `teal_orange`, `bleach_bypass`.
  Права — наши. Тёплый слой Look в коде — градиент сверху вниз; LUT берёт его средний цвет (приближение).
- `slay_cc_by/` — 5 LUT от slay (CC BY 4.0, нужна подпись «LUT: slay — slaycamera.com»).
- `_previews/luts_contact_sheet.jpg` — проверка всех LUT на одном кадре (ffmpeg lut3d). Порядок слева направо, сверху вниз:
  оригинал, duotone_cool, duotone_warm, photo_violet, pop_neutral, pop_warm, bleach_bypass, bw_high_contrast, faded_film_warm, teal_orange,
  vox_sepia_archive, slay amber, fade, neon, film, portrait.

```bash
ffmpeg -i in.mp4 -vf "lut3d=file=lut_atlas_pop_warm_selfmade.cube:interp=tetrahedral" -c:v libx264 -crf 16 out.mp4
# ослабить LUT до 50 %:
ffmpeg -i in.mp4 -filter_complex "[0]split[a][b];[b]lut3d=file=look.cube[g];[a][g]blend=all_mode=normal:all_opacity=0.5" out.mp4
```
В Remotion LUT не применяется напрямую — красим исходник ffmpeg-ом заранее, либо оставляем CSS-грейд кита (он и есть источник этих LUT).

## Чего нет и почему (подробно — catalog_only в логе)

- Настоящих light leaks / film grain / lens flare в 1080p+ с коммерческой лицензией скачать скриптом не удалось:
  на Mixkit они под **Restricted License** (только личное), Pexels закрыт Cloudflare (ручная загрузка — ссылки в логе). Pixabay с 24.10 доступен через официальный API — засветки и зерно там можно поискать отдельной задачей (кандидатов проверять покадрово, AI-клипы не брать).
- Готовых паков с альфой (ProRes 4444) бесплатно с чистой лицензией нет — это Envato Elements / Motion Array / RocketStock (платно, только каталог).
