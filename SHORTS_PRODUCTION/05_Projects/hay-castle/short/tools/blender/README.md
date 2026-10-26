# tools/blender — 3D-вставки для Short

JSON-спека → headless Blender 5.2 (Metal) → RGBA-секвенция `public/3d/<name>/f_0001.png …` + `meta.json` → в сцене
`<Clip3D name="<name>" …/>` (`src/ui/Clip3D.tsx`). Всё кодом, без открытия Blender.

| Файл | Что делает |
|---|---|
| `run.sh` | запускает Blender `-b --factory-startup` из папки `short/` с **одним GPU-слотом на весь Mac** (kernel flock `/tmp/shorts_blender_gpu.lock`, снимается сам даже после `kill -9`; занятость пишет, кем); ошибка Python → код ≠ 0 |
| `shot.py` | строит сцену из спеки (примитивы, звезда, 3D-текст, импорт glTF/OBJ/FBX/STL/PLY, PBR / toon / flat материалы, контур, свет, камера, анимация) и рендерит |
| `check3d.mjs` | проверка вставок (кадры на месте, CREDITS, лицензии, карантин, Atlas); вызывается из `tools/check.mjs` или отдельно |
| `sheet3d.py` | лист кадров поверх шахматки и фиолетового фона канала: края альфы, кадрирование, шов петли |
| `examples/coin.json` | тестовая вставка: золотая монета, один оборот, бесшовная петля, 24 кадра @ 30 fps, WebP; готовый рендер лежит в `public/3d/coin` для композиции `Gallery` (перерендер — та же команда, спека и `meta.json` должны совпадать) |

## Порядок работы

```
cd short
NOLOCK=1 tools/blender/run.sh tools/blender/shot.py -- tools/blender/examples/coin.json --probe      # кадрирование в px, без рендера
tools/blender/run.sh tools/blender/shot.py -- tools/blender/examples/coin.json --scale 50 --frames 1,12  # пробные кадры → out/3d_preview/coin/
tools/blender/run.sh tools/blender/shot.py -- tools/blender/examples/coin.json                          # всё → public/3d/coin/
python3 tools/blender/sheet3d.py public/3d/coin                                                          # → out/3d_sheets/coin.jpg
```
Затем в сцене: `<Clip3D name="coin" t0={W(5)} t1={W(9)} y={820} w={760} />`, в `CREDITS.md` строка с `` `3d/coin` `` (собственный
рендер + спека) и строка на каждый внешний файл спеки (модель, HDRI, текстура, шрифт — по имени файла, с лицензией), потом
`node tools/check.mjs` (или `node tools/blender/check3d.mjs`). Готовую строку для CREDITS `shot.py` печатает в конце.

Опции `shot.py`: `--scale <процент>`, `--frames 1,12,24` (пробные кадры, не трогают `public/`), `--out <папка>`, `--samples <n>`,
`--engine eevee|cycles`, `--name <имя>`, `--save <файл.blend>` (открыть собранную сцену в Blender), `--probe`.
Переменные `run.sh`: `NOLOCK=1` (без слота — для `--probe`), `BLENDER_LOCK=<файл>`, `BLENDER_LOCK_WAIT=<s>` (выход 75, если
слот занят дольше), `BLENDER=<бинарник>`. Полный рендер пишет в `<name>.part/` и подменяет папку только целиком (все кадры +
`meta.json`); оборванный рендер оставляет `.part` (check3d предупреждает).

## Спека

Цвета — sRGB как в CSS (`"#f2c14e"` или `[r, g, b]` 0–1), углы в градусах, Z вверх, «фронтальная» камера стоит на −Y и смотрит
на +Y. Ключи с `_` — комментарии; опечатка в ключе — предупреждение.

| Ключ | По умолчанию | Что задаёт |
|---|---|---|
| `name` | имя файла | папка `public/3d/<name>` (`a-z 0-9 _ -`) |
| `fps`, `frames` | 30, 48 | частота и длина секвенции; `Clip3D` берёт fps из `meta.json` и сам пересчитывает на 60 fps ролика |
| `size`, `scale` | `[1080, 1920]`, 100 | логический размер в кадре Short (не больше 1080 × 1920; кадрируйте под объект — `[1080, 1080]` для монеты), процент пикселей |
| `format`, `quality` | `"png"` | `"webp"` (q 90): та же картинка с альфой, в ~15 раз легче — для длинных и полноэкранных вставок |
| `engine`, `samples` | `"eevee"`, 32 (Cycles 64) | EEVEE — быстро (Metal); `"cycles"` — GPU Metal, ловец теней, точнее стекло; `denoise` (Cycles, true), `raytracing` (EEVEE, true) |
| `transparent` | true | прозрачный фон (RGBA) |
| `view`, `look`, `exposure` | `"Standard"` | Standard = цвета ровно как заданы (toon-лук канала); `"AgX"` — мягче для фотореализма |
| `loop` | false | бесшовная петля: кадр N+1 = кадр 1 (вращения и `bob` на целое число оборотов, орбита 360° с `"ease": "linear"`) |
| `motion_blur` | — | `true` или доля затвора (0.5) |
| `world` | `{"preset": "studio"}` | `studio` (тёмный пол, светлый горизонт — блик на металле; `ground`, `horizon`, `top`, `strength`), `{"preset": "plain", "color"}`, `{"hdri": "<файл>", "rotate", "strength", "license"}` |
| `materials` | — | `{"имя": {…}}`: `shader` `pbr` (`color`, `metallic`, `roughness`, `coat`, `ior`, `transmission`, `emission`, `alpha`), `toon` (ступени света `steps: [[порог, яркость], …]`, только EEVEE), `flat` (без света); `image` — текстура по UV (+ `license`) |
| `objects` | — | список объектов (ниже) |
| `lights` | `"studio"` | `"studio"` = key / rim / fill вокруг сцены под её размер; или список `{"type": "area"|"sun"|"point"|"spot", "location", "target" или "rotation", "energy", "color", "size", "angle", "cone"}` |
| `camera` | — | ниже |
| `not_the_host` | — | снимает проверку ИМЕНИ «atlas», если это не персонаж (`"Atlas Mountains relief"`); папки Atlas не снимает никогда |

Объект: `type` + `name`, `location`, `rotation`, `scale`, `material` (имя из `materials` или словарь), `parent` (имя; координаты
ребёнка — в системе родителя), `smooth` / `smooth_angle`, `bevel` / `bevel_segments`, `outline` (ширина контура в единицах сцены,
`outline_color`, по умолчанию INK `#120818`), `catcher` (пол-ловец теней, только Cycles), `holdout`, `hidden`.

| `type` | Параметры |
|---|---|
| `cube`, `plane` | `size` |
| `sphere` / `ico` | `radius`, `segments`, `rings` / `subdiv` |
| `cylinder`, `cone`, `torus` | `radius`, `depth`, `vertices` · `radius1`, `radius2` · `major`, `minor` |
| `star` | `points`, `outer`, `inner`, `depth` |
| `text` | `body`, `font` (по умолчанию `public/fonts/Anton-Regular.ttf`), `size`, `extrude` (толщина = 2 × extrude), `align` |
| `model` | `path` (`.glb .gltf .obj .fbx .stl .ply`; `03_Assets/…`, путь от `short/`, абсолютный), `fit` (наибольшая сторона в единицах), `license`, `credit`; `material` перекрашивает всю модель |
| `empty` | пустышка-родитель для групп |

Анимация (каждый кадр ключуется, поэтому easing точный и петля бесшовная):
- `spin`: `{"axis": "z", "turns": 1, "ease": "linear", "start": 0}` (или список; `f0` / `f1` — окно кадров);
- `keys`: `[{"f": 1, "scale": 0.2}, {"f": 10, "scale": 1, "ease": "out"}]` — `location`, `rotation`, `scale` (число или xyz), ease `linear | in | out | inout`;
- `bob`: `{"amp": 0.05, "turns": 1, "axis": "z"}` — покачивание.

Камера: `lens` (мм на 36-мм сенсоре по ДЛИННОЙ стороне) или `ortho` (масштаб), `target` (+ `target_to`) и один из путей —
`location` (+ `to`: проезд) или `orbit: {"radius": 6 | [r0, r1], "elev": 10 | [e0, e1], "from": 0, "to": 40, "ease": …}`;
`ease` (inout), `roll` (число или `[r0, r1]`), `dof: {"fstop": 2.8, "focus": "<объект>" | м}`, `clip`.
`fill: 0.75` подбирает расстояние так, чтобы сфера вокруг `target`, охватывающая все видимые объекты в кадре `fill_at`
(по умолчанию последний: после pop-in и прилёта), занимала 75 % короткой стороны кадра. Сфера консервативна — точные рамки в px
печатает `--probe`.

## Защиты (выход 2, ничего не рендерится)

- файл из `03_Assets/_quarantine` (по пути или по имени любого файла карантина) и любой Mixkit — как в `check.mjs`;
- Atlas: модели и любые файлы из `~/shorts/orangutan`, `atlas-3d`, `atlas-3d-ai`, `atlas-blender`; модель, объект или имя шота
  со словом «atlas» / «orangutan». Atlas — только 2D-арт владельца (карточки, риг), в 3D его не собирают и не перерисовывают;
- размер больше 1080 × 1920, имя не `a-z 0-9 _ -`.

`check3d.mjs` повторяет карантин / Mixkit / Atlas по `meta.json` (ловит и вставки, отрендеренные до появления защиты), требует
CREDITS и лицензию у каждого внешнего источника, сверяет число кадров и размер PNG, предупреждает, если спека изменилась после
рендера, о неиспользуемых папках и `.part`.

## Правила стандарта для 3D

- 3D — для предметов, карт, рельефа и 3D-текста; базовый лук — освещённый PBR или чистый toon (стандарт, раздел «3D»). **Никаких
  VFX из сфер** (дым, облака, взрывы — только реальные объёмы в Blender или оверлеи `03_Assets/Overlays`).
- Одна вставка = одно визуальное событие; удержанный последний кадр — статика (лимит разрыва уровня). Петлю (`loop`) можно держать дольше.
- 3D считается отдельным стилем в смене стилей каждые 2–3 плана (R-4).
- Atlas — только реакция и только из арта владельца, никогда не 3D.

## Скорость и вес (M2 Pro, 24.10)

- EEVEE: монета 1080 × 1080, 32 сэмпла — 24 кадра за 9.7 s вместе с запуском Blender (≈ 0.3 s на кадр).
- Cycles: первый запуск компилирует Metal-ядра (≈ 2 мин, потом кэш); дальше ≈ 2 s на кадр 540 × 540 при 32 сэмплах.
- Вес: PNG ≈ 0.55 MB на кадр 1080², WebP q90 ≈ 37 KB. Remotion копирует `public/` в каждый бандл — держите `public/3d` маленьким
  (`fps` 30, размер по объекту, `"format": "webp"`); check3d предупреждает выше 300 MB.
