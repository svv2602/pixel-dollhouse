#!/usr/bin/env bash
# Сборка игры и публикация на GitHub Pages (ветка gh-pages, раздаётся как есть).
# Использование: tools/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE="$(git -C "$ROOT" remote get-url origin)"

# Справка для родителей не должна отставать от игры: механика без строки в справке не выкладывается
node "$ROOT/.claude/skills/gamepixel-release-check/scripts/check_help.mjs"

cd "$ROOT/game"

# Дымовой набор e2e (~3–5 мин): загрузка, еда, котёл, сохранение, два пальца, поворот, починка дома,
# локации, родительская зона, ошибки в консоли. Без зелёного дыма не выкладываем.
# Полный набор — npm run test:e2e (перед большими волнами). Свой порт — чтобы не мешать идущему полному прогону.
if [[ "${SKIP_SMOKE:-}" != "1" ]]; then
  E2E_PORT="${E2E_PORT:-5323}" npm run --silent test:smoke
fi

npm run build

cd dist
touch .nojekyll                      # отдавать файлы как есть, без обработки Jekyll
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -qm "deploy $(git -C "$ROOT" rev-parse --short HEAD) $(date -u +%Y-%m-%dT%H:%MZ)"
git push -qf "$REMOTE" gh-pages
rm -rf .git
echo "Опубликовано в ветку gh-pages ($REMOTE)"
