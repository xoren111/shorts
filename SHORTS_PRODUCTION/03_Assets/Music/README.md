# Музыка и ambient-подложки — стартовая библиотека

Проверено 2026-10-24 (исправления по проверке лицензий и замена Mixkit — тот же день). 13 треков, 110.9 МБ, 6 настроений: 10 треков Kevin MacLeod (CC BY 4.0, кредит обязателен) и 3 PD-записи классики. Машинные логи (sha256, URL, лицензии, LUFS): `02_Research/download_logs/music.json` (5 треков) и `music_replacement.json` (8 замен Mixkit: ISRC, sha256/sha1, сравнение громкости и тембра с прежним треком, готовый блок кредитов).
Лицензии: `03_Assets/Licenses/` → `incompetech_LICENSE.md` (+ доказательства в `02_Research/download_logs/music_replacement_proof/`), `musopen_LICENSE.md`, `usaf_band_LICENSE.md`, `youtube_audio_library_LICENSE.md` (+ каталог: `pixabay_music_LICENSE.md`, `scott_buckley_LICENSE.md`).

## Главное правило Shorts (YouTube, официально)

- **Short длиннее 1 минуты + любой активный Content ID claim = ролик заблокирован во всём мире** (не играет, не рекомендуется, не монетизируется), пока claim не снят. Страйка нет. Shorts ≤ 60 с так не блокируются. — https://support.google.com/youtube/answer/15424877
- Shorts = вертикальные/квадратные ролики до 3 мин, загруженные с 15.10.2024. — там же
- Музыка из **YouTube Audio Library** не получает claim — YouTube прямо советует её для Shorts > 1 мин. — https://support.google.com/youtube/answer/13486873
- Shorts Audio Library (лейблы через редактор Shorts): до 90 с в 3-минутном Short, у части треков 60/30 с; такие claim скрыты и не оспариваются. — https://support.google.com/youtube/answer/13053317
- Монетизация: музыка партнёров YouTube уменьшает вклад Short в Creator Pool (1 трек → 1/2, 2 трека → 1/3), но не ваши 45 %; прочий сторонний контент с Content ID — не уменьшает. — https://support.google.com/youtube/answer/12504220
- **С 01.02.2027** доля из Creator Pool и YouTube Premium за месяц положена только каналу, у которого **≥ 10 млн квалифицированных просмотров Shorts за последние 90 дней**. Просмотры «неоригинальных» Shorts (неотредактированные клипы чужих фильмов и ТВ, перезаливы, компиляции без своего вклада) не засчитываются. — там же

**Вывод для канала (единое правило, исправлено 24.10):** ролик > 60 с → **только YouTube Audio Library** (`~/shorts/atlas-ape/music_calm`) или собственная музыка с подтверждёнными правами. Все треки этой папки (Kevin MacLeod, PD-классика) — **только в Shorts ≤ 60 с**: у каждого из них возможен claim, а для Short > 60 с любой claim = блокировка во всём мире на время спора (MacLeod ≤ 72 ч, Pixabay до 30 дней). Kevin MacLeod — только с кредитом в описании ДО публикации; Pixabay — не брать. **Mixkit больше нет:** 8 треков Mixkit были скачаны скриптом вопреки User Terms Mixkit (разд. 9); 24.10 они перенесены в `03_Assets/_quarantine/mixkit/Music/` и заменены треками Kevin MacLeod того же настроения (в тех же папках). Замены подобраны по тегам каталога и замерам (LUFS, LRA, спектр, плотность ритма), **без прослушивания — перед использованием прослушать**.

## Шкала риска Content ID

| Риск | Источник | Почему |
|---|---|---|
| минимальный | YouTube Audio Library | YouTube официально: claim не ставится |
| **средний** (повышено 24.10) | PD-записи (Musopen, USAF Band через Wikimedia Commons) | запись в общественном достоянии, но «Mountain King», «Bumblebee» и «Gymnopédie» записаны сотни раз → ложные совпадения с записями лейблов вероятны; dispute со ссылкой на страницу Commons (до 30 дней). Только Shorts ≤ 60 с |
| — | Mixkit | **в библиотеке больше нет** (с 24.10 в карантине) |
| средний (управляемый) | Kevin MacLeod (Incompetech), Scott Buckley | музыка заранее зарегистрирована в Content ID; claim не ставится, если в ОПИСАНИИ есть кредит; иначе dispute ≤ 72 ч |
| средний–высокий | Pixabay Music | часть авторов регистрирует треки через дистрибьюторов; dispute до 30 дней |

## Треки

### `curious_light/` — Любопытство / лёгкость

| Файл | Трек — автор | Длит. | LUFS | Content ID | Кредит | Когда брать |
|---|---|---|---|---|---|---|
| `music_teddy_bear_waltz_kevin_macleod_incompetech_usuan1700064.mp3` | Teddy Bear Waltz — Kevin MacLeod (Incompetech), ISRC USUAN1700064; заменяет Little Bells — Diego Nava (Mixkit) | 195 с | -16.7 | средний (снимается кредитом) | **обязателен** | завязка «а знаете ли вы», наезды на карту; приседать под голос; глокеншпиль, флейта, кларнет и струнные; лёгкий и ровный (LRA 3.7); вальс 6/8 вместо ровного минималистичного пульса; на 8.7 дБ тише прежнего |
| `music_investigations_kevin_macleod_incompetech.mp3` | Investigations — Kevin MacLeod (Incompetech (Kevin MacLeod)) | 94 с | -18.7 | средний (снимается кредитом) | **обязателен** | «что-то тут не так»: поиск улик, хитрая завязка перед поворотом; 93 с — хватает на весь Short |

### `tension_mystery/` — Напряжение / загадка

| Файл | Трек — автор | Длит. | LUFS | Content ID | Кредит | Когда брать |
|---|---|---|---|---|---|---|
| `music_mirage_drone_kevin_macleod_incompetech_usuan1100877.mp3` | Mirage — Kevin MacLeod (Incompetech), ISRC USUAN1100877; заменяет Selpan — Eugenio Mininni (Mixkit) | 240 с | -14.7 | средний (снимается кредитом) | **обязателен** | подложка напряжения под голос: расследование, нарастание катастрофы; легко резать и зацикливать; тёмный синт-дрон без бита, с напряжением; спокойнее и мягче прежнего (без электрогитары) |
| `music_hall_of_the_mountain_king_grieg_musopen_commons.flac` | Peer Gynt Suite No. 1, Op. 46 – IV. In the Hall of the Mountain King — Edvard Grieg; Czech National Symphony Orchestra as Musopen Symphony (Musopen Kickstarter Project, 2012) (Wikimedia Commons (Musopen recording)) | 154 с | -12.4 | средний | не нужен | монтаж эскалации («дальше стало только хуже»), комическое нарастание до кульминации; огромная динамика (LRA 24,8) — брать с середины или сжимать |

### `epic_reveal/` — Эпик / раскрытие

| Файл | Трек — автор | Длит. | LUFS | Content ID | Кредит | Когда брать |
|---|---|---|---|---|---|---|
| `music_americana_orchestral_kevin_macleod_incompetech_usuan1200092.mp3` | Americana — Kevin MacLeod (Incompetech), ISRC USUAN1200092; заменяет Dreaming Big — Ahjay Stelino (Mixkit) | 202 с | -16.9 | средний (снимается кредитом) | **обязателен** | развязка/payoff «и это сработало» — торжественно, но не мрачно; воодушевляющий оркестр: от виолончелей и деревянных к большой меди; ведут оркестр и медь, а не фортепиано; динамичнее (LRA 10.8) — брать участок с медью |
| `music_eternal_hope_piano_kevin_macleod_incompetech_usuan1100238.mp3` | Eternal Hope — Kevin MacLeod (Incompetech), ISRC USUAN1100238; заменяет Life's a Movie — Arulo (Mixkit) | 284 с | -23.8 | средний (снимается кредитом) | **обязателен** | момент масштаба (большая цифра, общий план), задумчивый финал; медленное светлое нарастание: фортепиано, струнные, валторна, хор; тише и динамичнее прежнего (−23.8 LUFS) — поднять гейн или сжать |

### `comedic_quirky/` — Комедия / чудаковато

| Файл | Трек — автор | Длит. | LUFS | Content ID | Кредит | Когда брать |
|---|---|---|---|---|---|---|
| `music_mischief_maker_kevin_macleod_incompetech_usuan1700009.mp3` | Mischief Maker — Kevin MacLeod (Incompetech), ISRC USUAN1700009; заменяет Kidding Around — Ahjay Stelino (Mixkit) | 202 с | -13.4 | средний (снимается кредитом) | **обязателен** | абсурдные моменты истории, хвост реакции Atlas, комичный провал плана; пружинистый юмористический трек: бас, ксилофон, цимбалы, ударные; ярче и «взрослее» прежнего |
| `music_sneaky_snitch_kevin_macleod_incompetech.mp3` | Sneaky Snitch — Kevin MacLeod (Incompetech (Kevin MacLeod)) | 137 с | -17.5 | средний (снимается кредитом) | **обязателен** | крадущийся план, «ограбление», контрабандисты/шпионы; очень узнаваемый «ютубный» трек — редко |

### `documentary_neutral/` — Документально / нейтрально (+ ambient bed)

| Файл | Трек — автор | Длит. | LUFS | Content ID | Кредит | Когда брать |
|---|---|---|---|---|---|---|
| `music_immersed_piano_strings_kevin_macleod_incompetech_usuan1600010.mp3` | Immersed — Kevin MacLeod (Incompetech), ISRC USUAN1600010; заменяет Forest Mist Whispers — Alejandro Magaña (A. M.) (Mixkit) | 249 с | -21.5 | средний (снимается кредитом) | **обязателен** | нейтральная документальная подложка под плотный голос и архив; минималистичные фортепиано и струнные, местами дроном; темнее прежнего — больше места голосу; тише, поднять гейн |
| `music_soaring_ambient_bed_kevin_macleod_incompetech_usuan1600040.mp3` | Soaring — Kevin MacLeod (Incompetech), ISRC USUAN1600040; заменяет Voxscape — Eugenio Mininni (Mixkit) | 380 с | -17.4 | средний (снимается кредитом) | **обязателен** | ambient bed под карты и 3D-пролёты; резать любые 30–60 с; 6:20 меняющийся синт-пэд без бита, спокойный, с мистическим оттенком |
| `music_gymnopedie_1_satie_alciatore_musopen_commons.ogg` | Gymnopédie No. 1 (Lent et douloureux) — Erik Satie; piano: Robin Alciatore (Musopen) (Wikimedia Commons (Musopen recording)) | 184 с | -25.9 | средний | не нужен | грустное/тихое «после», финал «всё было зря», момент раздумья |

### `upbeat_energy/` — Драйв / энергия

| Файл | Трек — автор | Длит. | LUFS | Content ID | Кредит | Когда брать |
|---|---|---|---|---|---|---|
| `music_exit_the_premises_kevin_macleod_incompetech_usuan1500029.mp3` | Exit the Premises — Kevin MacLeod (Incompetech), ISRC USUAN1500029; заменяет Games Music — Grigoriy Nuzhny (Mixkit) | 210 с | -10.6 | средний (снимается кредитом) | **обязателен** | быстрый монтаж, погоня, гонка, первые секунды хука; напористая электроника с большими барабанами, 128 BPM (dance/chiptune, а не трейлерный брейкбит); почти тот же спектр и плотность ритма |
| `music_flight_of_the_bumblebee_usaf_strolling_strings_commons.mp3` | Flight of the Bumblebee — Nikolai Rimsky-Korsakov; U.S. Air Force Band Strolling Strings (1994) (Wikimedia Commons (U.S. Air Force Band recording)) | 82 с | -19.3 | средний | не нужен | монтаж хаоса/паники, комичные ускорения «всё сразу». В конце файла хвостовой тег (оригинал не трогать) → в проект чистая копия `ffmpeg -i in.mp3 -map 0:a -c copy -map_metadata -1 out.mp3`. В ID3 «ASCAP, BMI», аранжировщик не указан → в монетизируемых роликах лучше другой трек |

## Готовые кредиты для описания

Обязательные (CC BY 4.0) — только для треков, которые вошли в ролик, каждый своим блоком, в ТЕКСТЕ описания до публикации:
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
По желанию (вежливость, PD): «In the Hall of the Mountain King — Edvard Grieg, Musopen Symphony (Musopen, public domain)», «Gymnopédie No. 1 — Erik Satie, piano Robin Alciatore (Musopen, public domain)», «Flight of the Bumblebee — Rimsky-Korsakov, U.S. Air Force Band Strolling Strings (public domain)».

## Уже есть у владельца (не копировалось): `~/shorts/atlas-ape/music_calm/`

YouTube Audio Library, 6 треков + `analysis.json` (тональность, BPM, «спокойный участок» offset) + `previews/`:
Frame-Dragging (The Grey Room / Density & Time — фирменная подложка канала, кредит не нужен), A Single Step (Density & Time), Science Montage (Jeremy Blake), Marimba Chill (Jimena Contreras), Quirk n Twerk (The Soundlings), Taking Flight (Blue Deer Studio).
У пяти последних тип лицензии в проектах не записан → один раз сверить в Studio → Аудиотека (колонка «License type»: значок CC = нужен кредит).

## Как использовать в нашем пайплайне

- Для Atlas Ape музыка — **фон**: как в действующем правиле, ≈ −21,6 дБ к уровню трека + приседание под голос (≈ 14 дБ ниже голоса в паузах); драматизм — через SFX и монтаж, не через громкую музыку. LUFS в таблице — чтобы выровнять треки перед `tools/mix.py`.
- Большой динамический диапазон: Mountain King (LRA 24,8) — брать с середины/финала или сжимать; Gymnopédie записана тихо (−25,9 LUFS) — поднять гейн. Замены Mixkit заметно тише прежних треков: Eternal Hope −23,8, Immersed −21,5, Teddy Bear Waltz −16,7 LUFS (Little Bells был −8,0) — выровнять громкость до `tools/mix.py`; у Americana (LRA 10,8) и Eternal Hope (LRA 13,1) брать участок нужной плотности.
- 10 из 13 треков — Kevin MacLeod: Content ID claim появится, если кредита нет в тексте описания (в кадре — не считается). Порядок: кредит в описание до публикации; если claim всё же пришёл — проверить кредит, затем dispute (автор пишет, что снимает за ≤ 72 ч). Short > 60 с — MacLeod не брать.
- FLAC/OGG Remotion и Chrome читают, но для единообразия можно сделать WAV 48 кГц: `ffmpeg -i in.flac -ar 48000 -c:a pcm_s16le out.wav` (результат класть в проект, не сюда).
- Не выкладывать библиотеку целиком в открытый доступ (CC BY это разрешает, но мы библиотеку не публикуем; Pixabay запрещает перераспространение «как есть»).
