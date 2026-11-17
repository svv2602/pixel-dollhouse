#!/usr/bin/env node
// Проверка «новая механика попала в справку для родителей».
// Ничего не запускает и не собирает: читает исходники игры и сверяет три списка —
//   1) счётчики механик, которые код реально отправляет в статистику (stat / statHit / hintDone / tried во снах);
//   2) подписи этих счётчиков в родительской зоне (FEATS в parent.js);
//   3) строки справки (HELP в help.js).
// Запуск из корня репозитория: node .claude/skills/gamepixel-release-check/scripts/check_help.mjs
// Код выхода 1 — есть расхождения (список печатается), 0 — всё сходится.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const SRC = join(ROOT, 'game/src');
const read = (f) => readFileSync(join(SRC, f), 'utf8');
const files = readdirSync(SRC).filter((f) => f.endsWith('.js'));

// Счётчики, которым строка в справке не нужна: это не действие ребёнка, а итог или служебная отметка.
const NO_HELP = {
  sticker: 'итог (новая наклейка), не действие',
  tree: 'сезонная ёлка — только зимой',
  bedtime: 'срабатывает таймер сна, выставленный родителями, — не действие ребёнка (строка-пояснение в «Общем»)',
};

// ---- 1. что код отправляет в статистику
const used = new Map(); // ключ -> файл
const note = (k, f) => { if (!used.has(k)) used.set(k, f); };
for (const f of files) {
  const src = read(f);
  for (const m of src.matchAll(/(?:\bstat|statHit|hintDone)\(\s*'([A-Za-z0-9_]+)'/g)) note(m[1], f);
}
// двери снов: счётчик приходит через hintDone(DOOR_HINT[kind])
for (const m of (read('dream.js').match(/const DOOR_HINT = \{([^}]*)\}/)?.[1] || '').matchAll(/'([a-z]+)'/g)) note(m[1], 'dream.js');
// подсказки-цепочки и потребности (ключи HINTS): отмечаются через hintDone(name)
// (общие таблицы игры живут в core.js с тех пор, как main.js разбит на модули)
const core = read('core.js');
const hintsBlock = core.slice(core.indexOf('const HINTS = {'), core.indexOf('const BED_HINTS'));
if (!hintsBlock) throw new Error('не нашёл HINTS в core.js — проверка справки устарела');
for (const m of hintsBlock.matchAll(/^\s{2}([a-z]+):\s*\{/gm)) note(m[1], 'core.js (HINTS)');

// ---- 2. подписи в родительской зоне
const parent = read('parent.js');
const featsBlock = parent.slice(parent.indexOf('const FEATS = {'), parent.indexOf('const fresh'));
const feats = new Set([...featsBlock.matchAll(/\b([A-Za-z0-9_]+):\s*'/g)].map((m) => m[1]));

// ---- 3. строки справки
const { helpKeys } = await import(pathToFileURL(join(SRC, 'help.js')).href);
const help = new Set(helpKeys());

// ---- миры снов: что в каждом мире отмечается как «попробовали»
const worldsSrc = read('dreamworlds.js');
const body = worldsSrc.slice(worldsSrc.indexOf('export const WORLDS = {'));
const starts = [...body.matchAll(/^ {2}([a-z]+): \{\s*$/gm)].map((m) => ({ name: m[1], at: m.index }));
const dream = new Map(); // 'мир.фича' -> true
starts.forEach((w, i) => {
  const block = body.slice(w.at, starts[i + 1]?.at ?? body.length);
  for (const m of block.matchAll(/tried\('([a-z]+)'\)/g)) dream.set(`${w.name}.${m[1]}`, true);
  for (const m of block.matchAll(/\{ key: '([a-z]+)'/g)) dream.set(`${w.name}.${m[1]}`, true); // приманки мира
  for (const m of block.matchAll(/ride: \{[^}]*\}/g)) dream.set(`${w.name}.${m[0].match(/key: '([a-z]+)'/)?.[1] || 'ride'}`, true);
});

// ---- сверка
const problems = [];
const worldCounter = (k) => /^w_/.test(k);
for (const [k, f] of used) {
  if (!feats.has(k) && !worldCounter(k)) problems.push(`нет подписи в статистике: счётчик «${k}» (${f}) — добавьте его в FEATS в game/src/parent.js`);
  if (!help.has(k) && !(k in NO_HELP) && !worldCounter(k)) problems.push(`нет строки в справке: механика «${k}» (${f}) — добавьте ['${k}', 'что сделать', 'что будет'] в HELP в game/src/help.js`);
}
for (const k of help) {
  if (k.startsWith('d:')) { if (!dream.has(k.slice(2))) problems.push(`справка ссылается на то, чего в мирах снов нет: «${k}» — такой отметки tried() нет в dreamworlds.js`); continue; }
  if (!used.has(k)) problems.push(`справка ссылается на несуществующий счётчик: «${k}» — отметка никогда не станет ✓`);
}
for (const k of dream.keys()) if (!help.has(`d:${k}`)) problems.push(`нет строки в справке: фича мира снов «${k}» — добавьте ['d:${k}', 'что сделать', 'что будет'] в HELP в game/src/help.js`);

if (problems.length) {
  console.error(`Справка для родителей расходится с игрой (${problems.length}):`);
  for (const p of problems) console.error(`  • ${p}`);
  process.exit(1);
}
console.log(`Справка в порядке: механик в коде — ${used.size}, фич в мирах снов — ${dream.size}, строк справки с отметкой — ${help.size}.`);
