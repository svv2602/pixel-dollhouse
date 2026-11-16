// Волшебный котёл: рецепты и альбом открытий.
// Результат ДЕТЕРМИНИРОВАН: одинаковая пара ингредиентов всегда даёт одно и то же,
// чтобы ребёнок мог повторить открытие и показать его взрослым.

// [ингредиент, ингредиент, результат] — названия субъектов из каталога (стабильны между пересборками)
export const RECIPES = [
  ['glass of milk', 'chocolate bar', 'chocolate milkshake'],
  ['apple', 'star', 'golden apple'],
  ['egg', 'star', 'golden egg'],
  ['egg', 'feather', 'hatchling chick'],
  ['strawberry', 'cupcake', 'strawberry cupcake'],
  ['banana', 'ice cream cone', 'banana split'],
  ['slice of bread', 'jar of honey', 'honey toast'],
  ['pair of cherries', 'slice of bread', 'cherry pie'],
  ['lemon', 'teacup and saucer', 'glass of lemonade'],
  ['tulip', 'potion bottle', 'crystal flower'],
  ['seed packet', 'watering can', 'sunflower'],
  ['daisy flower', 'crown', 'flower crown'],
  ['kitten', 'feather', 'winged cat'],
  ['rabbit', 'feather', 'winged bunny'],
  ['piglet', 'feather', 'winged pig'],
  ['pony', 'star', 'unicorn'],
  ['unicorn', 'feather', 'winged unicorn'],
  ['cloud', 'sun', 'rainbow'],
  ['sun', 'crescent moon', 'shooting star'],
  ['snowflake', 'crystal ball', 'snow globe'],
  ['teddy bear', 'magic wand', 'toy robot'],
];

const ALBUM_KEY = 'pixel-house-album-v1'; // отдельно от комнаты: сброс комнаты альбом не стирает

export const recipeKey = (a, b) => [a, b].sort().join(' + ');

function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}

function loadFound() {
  try { return JSON.parse(localStorage.getItem(ALBUM_KEY)) || {}; } catch { return {}; }
}

export class Alchemy {
  /** findRec(subject) -> запись каталога; pool — из чего выбирать результат для пар без рецепта. */
  constructor(findRec, pool) {
    this.findRec = findRec;
    this.pool = pool;
    this.recipes = new Map();
    for (const [a, b, r] of RECIPES) {
      const ra = findRec(a);
      const rb = findRec(b);
      const rr = findRec(r);
      if (ra && rb && rr) this.recipes.set(recipeKey(a, b), { a: ra, b: rb, result: rr });
      else console.warn('рецепт пропущен (нет в каталоге):', a, b, r);
    }
    this.found = loadFound();
  }

  /** Сварить пару. Возвращает { result, isNew }. */
  brew(recA, recB) {
    const key = recipeKey(recA.subject, recB.subject);
    const fixed = this.recipes.get(key);
    let result = fixed?.result;
    if (!result) {
      const pool = this.pool.filter((r) => r.subject !== recA.subject && r.subject !== recB.subject);
      result = pool[fnv1a(key) % pool.length];
    }
    const isNew = !this.found[key];
    if (isNew) {
      this.found[key] = { a: recA.subject, b: recB.subject, result: result.subject };
      try { localStorage.setItem(ALBUM_KEY, JSON.stringify(this.found)); } catch { /* без сохранения */ }
    }
    return { result, isNew };
  }

  /** Записи альбома: сначала все рецепты (открытые и нет), затем свои открытия вне рецептов. */
  entries() {
    const list = [];
    for (const [key, r] of this.recipes) list.push({ key, a: r.a, b: r.b, result: r.result, found: !!this.found[key] });
    for (const [key, f] of Object.entries(this.found)) {
      if (this.recipes.has(key)) continue;
      const a = this.findRec(f.a);
      const b = this.findRec(f.b);
      const result = this.findRec(f.result);
      if (a && b && result) list.push({ key, a, b, result, found: true });
    }
    return list;
  }
}
