#!/usr/bin/env bash
# Сборка игры и публикация на GitHub Pages (ветка gh-pages, раздаётся как есть).
# Использование: tools/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE="$(git -C "$ROOT" remote get-url origin)"

# Справка для родителей не должна отставать от игры: механика без строки в справке не выкладывается
node "$ROOT/.claude/skills/gamepixel-release-check/scripts/check_help.mjs"

cd "$ROOT/game"
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
