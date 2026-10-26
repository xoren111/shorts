# Freesound.org — CC0 / CC BY / CC BY-NC (у каждого звука своя)

- **Источник:** https://freesound.org
- **Лицензии на сайте:** CC0 1.0, CC BY 4.0 (и старые 3.0), CC BY-NC (запрещено для канала!), устаревший Sampling+ (не брать).
- **Правило проекта:** только CC0 (или CC BY с кредитом). NC — никогда.
- **Логин:** скачивание оригинального файла требует аккаунта (FAQ Freesound). Аккаунты мы не создаём → **catalog only / manual**.
- **Прецедент:** в Pig War (atlas-ape/pig-war/short*/CREDITS.md) использовались публичные HQ-превью CC0-звуков (MP3 ~128 кбит/с, без логина). Это допустимо по лицензии CC0, но качество ниже оригинала — для новой библиотеки предпочтительнее владельцу скачать оригиналы WAV вручную, или брать CC0-зеркала Freesound на Wikimedia Commons (там полный WAV).
- **Коммерческое использование:** CC0 и CC BY — да; CC BY — с атрибуцией (автор, название, ссылка, лицензия).
- **Дата проверки:** 2026-10-24

## Дополнение 2026-10-24 — оригиналы через официальный API

- Статус «catalog only / manual» выше устарел: с 24.10 оригиналы качаются через официальный API Freesound (APIv2, OAuth2-токен аккаунта владельца)
  инструментом `~/shorts/tools/freesound.py search … --license cc0` и `get ID --dest DIR`. Инструмент берёт только CC0 и CC BY, NC не скачивает;
  лимиты API — 60 запросов в минуту и 2000 в сутки. Токен лежит в `SHORTS_PRODUCTION/.freesound_token.json` (права 0600), в чат и логи не печатается.
- Так получены 60 SFX в `03_Assets/Sound_Effects/` (все **CC0 1.0**, атрибуция не нужна) — замена 60 файлов Mixkit. Лог со sha256, автором, URL лицензии,
  полями `replaces_mixkit` и `match_quality` — `02_Research/download_logs/freesound.json`.
- Отклонены как возможные перезаливы чужих звуков или с неясным источником: craigsmith «Kabong» (из лупов Hanna-Barbera), Kinoton «Micheal Bay Hit»,
  plasterbrain «Cartoon Fall», правка simkiott чужого record scratch, ремикс Proxima4 «High Mountain», TheTVBunny jumpscare, а также оригиналы только в MP3.
