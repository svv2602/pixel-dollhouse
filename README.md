# Пиксельный домик

Песочница «цифровой кукольный домик» для детей 6–7 лет: персонажи, еда, одежда, питомцы, мебель, зелья, день и ночь. Без текста, очков и проигрыша. Работает в браузере и офлайн (PWA).

## Структура

- `game/` — игра (Vite + Phaser 3).
  - `src/main.js` — сцена комнаты, ящик предметов, гардероб, сохранение.
  - `src/character.js` — персонажи (рисуются в коде: причёски, наряды).
  - `src/furniture.js` — крупная мебель (рисуется в коде).
  - `src/sfx.js` — звуки (синтез WebAudio, без файлов).
  - `src/cast.js`, `src/life.js` — состав кукол и их поведение (идут следом, здороваются, следят глазами).
  - `src/nav.js`, `src/stickers.js`, `src/season.js` — карта комнат, альбом наклеек, посылка дня и зима.
  - `src/parent.js` — родительская зона (удержать шестерёнку 2 с): громкость, статистика, голоса, копия дома.
  - `tests/e2e.mjs` — сквозные тесты (`npm run test:e2e`).
  - `public/assets/items/` — атласы спрайтов и `items.json` (генерируются из датасета).
- `tools/` — подготовка ассетов (Python) и деплой.
- `doc/specMagicPixelDollhouse.md` — спецификация и дорожная карта.

## Запуск

```bash
cd game
npm install
npm run dev        # http://localhost:5317 (с --host доступно в локальной сети)
```

## Публикация

```bash
tools/deploy.sh    # сборка + ветка gh-pages
```

## Ассеты из датасета

Спрайты предметов — из датасета [Angais/pixel-art-atlas-1.4m](https://huggingface.co/datasets/Angais/pixel-art-atlas-1.4m) (CC0 1.0). Пересборка:

```bash
python3 -m venv .venv && .venv/bin/pip install numpy pillow
# скачать pixel-art-16x16-1.4m.zip в data/raw/ и распаковать
.venv/bin/python tools/classify.py .
.venv/bin/python tools/export.py . 1
```

Id предметов стабильны (`название-строка`), а `items.json` хранит алиасы старых id — сохранения переживают пересборку.
