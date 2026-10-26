# Pexels Videos / Pixabay Videos — только каталог (manual)

- **Pexels License:** https://www.pexels.com/license/ — бесплатно, коммерческое использование и YouTube разрешены, атрибуция не нужна; нельзя продавать немодифицированные копии, выдавать за свои, использовать узнаваемых людей в оскорбительном контексте.
- **Pixabay Content License:** https://pixabay.com/service/license-summary/ — бесплатно, коммерческое использование разрешено, атрибуция не нужна; нельзя распространять как самостоятельные файлы/на других стоках.
- **Статус:** **manual / catalog only.** pexels.com и pixabay.com отвечают на скриптовые запросы Cloudflare-проверкой (HTTP 403 «Just a moment…»); API обоих требует ключ (= аккаунт) → по правилам проекта не используем. Ссылки на поиски/страницы для ручной загрузки — в catalog_only лога `visuals.json`.
- **Как скачать вручную:** открыть ссылку в браузере, проверить, что под роликом написано «Free to use» (Pexels) / «Free for use under the Pixabay Content License», скачать 1080p, положить в нужную подпапку 03_Assets и дописать запись в лог.
- **Дата проверки:** 2026-10-24

## Дополнение 2026-10-24

- Для **Pixabay** статус «manual / catalog only» устарел: с 24.10 видео и фото доступны через официальный API по ключу владельца (`~/shorts/tools/pixabay.py`,
  правила API и лицензия — `pixabay_LICENSE.md`). В библиотеке 19 клипов Pixabay (лог `02_Research/download_logs/pixabay.json`).
- **Pexels** — без изменений: только вручную.
