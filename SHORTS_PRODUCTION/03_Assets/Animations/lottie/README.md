# Lottie — 20 анимированных эмодзи Noto (JSON)

Источник: https://googlefonts.github.io/noto-emoji-animation/ (Google). Файлы `fonts.gstatic.com/s/e/notoemoji/latest/<cp>/lottie.json`.
Лицензия: **CC BY 4.0, атрибуция обязательна** (`../../Licenses/noto-animated-emoji_LICENSE.md`). Строка для описания ролика:

    Animated emoji: Noto Emoji Animation by Google, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)

Все файлы: Lottie v5.8.1, 1024×1024, 60 fps, длительность 0.8–5 s, бесшовный цикл. Растра внутри нет. Маркер `rest` — статичный кадр.
Проверено: все 20 загружаются и рисуются в lottie-web 5.12.2 (`_preview_midframe.png` — кадр на 45 % анимации).

Набор: fire, party_popper_confetti, warning, money_with_wings, question_mark, exclamation_mark, collision_explosion, check_mark,
cross_mark, screaming_face, exploding_head, eyes, skull, point_down, point_right (вместо стрелок), police_light_siren, thinking_face,
chart_increasing, globe_spinning, bomb.

Воспроизведение в Remotion: пакет `@remotion/lottie` ни в одном проекте пока не установлен →
`npx remotion add @remotion/lottie` (версия = remotion 4.0.535), затем
```tsx
import {Lottie} from '@remotion/lottie';
import data from './lottie_fire_u1f525_noto_animated.json';
<Lottie animationData={data} loop playbackRate={1} style={{width: 220}} />
```
Ещё ~860 анимированных эмодзи доступны по тому же шаблону URL (список: `.../noto-emoji-animation/data/api.json`).
Стрелки и конфетти из LottieFiles не скачаны: для скачивания нужен логин (см. `../../Licenses/lottiefiles_LICENSE.md`).
