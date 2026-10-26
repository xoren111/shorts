# Google Fonts (репозиторий google/fonts) — лицензии шрифтов

- **Источник:** https://github.com/google/fonts (ветка `main`), каталог https://fonts.google.com
- **Проверено:** 2026-10-24 — по `METADATA.pb` каждого семейства (поле `license`), по OFL.txt / LICENSE.txt рядом со шрифтом и по таблице `name` внутри TTF (ID 13/14).
- **Скачано:** Montserrat, Alfa Slab One (24.10, вечер), Anton, Bebas Neue, Inter, Oswald, Rubik, Russo One, Bangers, Caveat — **SIL Open Font License 1.1 (OFL-1.1)**; Permanent Marker — **Apache License 2.0**.

## SIL Open Font License 1.1 — https://openfontlicense.org
- Коммерческое использование: **да**. Шрифт можно использовать в видео, превью, обложках, логотипах, продавать готовые ролики.
- Атрибуция в видео: **не требуется** (текст, отрисованный шрифтом, не подпадает под OFL).
- Ограничения: нельзя продавать сам файл шрифта отдельно; при распространении файла шрифта (например, в шаблоне для других людей) — класть рядом OFL.txt и копирайт.
- Reserved Font Name: изменённую версию шрифта нельзя называть зарезервированным именем. Из нашего набора RFN объявлено только у **Russo One** («Russo»). Для работы с видео это не важно — мы шрифты не модифицируем.
- OFL.txt лежит в папке каждого семейства: `03_Assets/Fonts/<Family>/OFL.txt`.

## Apache License 2.0 (Permanent Marker) — https://www.apache.org/licenses/LICENSE-2.0
- Коммерческое использование: **да**; атрибуция в видео: **не требуется**.
- При распространении самого файла шрифта — приложить LICENSE.txt (лежит в `Fonts/PermanentMarker/`) и не удалять уведомления об авторстве.

## Покрытие алфавитов (проверено fontTools по cmap)
| Семейство | Латиница | Немецкие ÄÖÜß | Кириллица |
|---|---|---|---|
| Montserrat, Inter, Oswald, Rubik, Russo One, Caveat | да | да | да |
| Alfa Slab One, Anton, Bebas Neue, Bangers, Permanent Marker | да | да | **нет** (браузер подставит другой шрифт) |
