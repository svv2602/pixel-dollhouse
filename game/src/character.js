// Персонаж-кукла 20×34 (+1px авто-контур = 22×36). Рисуется попиксельно в canvas
// из шаблона: база + причёска + наряд. Цвета подставляются из палитры персонажа.

// Буквы: H волосы, h блик волос, S кожа, E глаз, W блик глаза, B румянец, M рот,
// D одежда (верх), d тень одежды, C воротник, P брюки, p тень брюк, L ноги, O обувь,
// Q светлая отделка (в тон одежды), q её тень, G золото, K кремовая ткань, k её тень
const BASE = [
  '......HHHHHHHH......',
  '....HHHHHHHHHHHH....',
  '...HHHhhHHHHHHHHH...',
  '..HHHhhHHHHHHHHHHH..',
  '..HHHSSSSSSSSSSHHH..',
  '..HHSSSSSSSSSSSSHH..',
  '..HHSSSSSSSSSSSSHH..',
  '..HHSSEESSSSEESSHH..',
  '..HHSSEWSSSSEWSSHH..',
  '..HHSBBSSSSSSBBSHH..',
  '..HHSSSSSMMSSSSSHH..',
  '..HHHSSSSSSSSSSHHH..',
  '..HHHHSSSSSSSSHHHH..',
  '..HHH...SSSS...HHH..',
  '......DDDDDDDD......',
  '.....DDDCCCCDDD.....',
  '....SDDDDDDDDDDS....',
  '...SSDDDDDDDDDDSS...',
  '...SS.DDDDDDDD.SS...',
  '...SS.DDDDDDDD.SS...',
  '...SS.DDDDDDDD.SS...',
  '...SS.DDDDDDDD.SS...',
  '....S.DDDDDDDD.S....',
  '.....DDDDDDDDDD.....',
  '....DDDDDDDDDDDD....',
  '....DddDDDDDDddD....',
  '...DDDDDDDDDDDDDD...',
  '...dddddddddddddd...',
  '.......LL..LL.......',
  '.......LL..LL.......',
  '.......LL..LL.......',
  '.......LL..LL.......',
  '......OOO..OOO......',
  '......OOO..OOO......',
];

// Наряд «кофта + брюки»: заменяет строки 23–31
const PANTS = {
  23: '......DDDDDDDD......',
  24: '......PPPPPPPP......',
  25: '......PPPPPPPP......',
  26: '......PPP..PPP......',
  27: '......PPP..PPP......',
  28: '......PPP..PPP......',
  29: '......PpP..PpP......',
  30: '......PPP..PPP......',
  31: '.......LL..LL.......',
};

// Остальные наряды: строки шаблона, которые они заменяют
const OUTFITS = {
  dress: {},
  pants: PANTS,
  // кофточка + светлая юбка-колокольчик
  skirt: {
    23: '......DDDDDDDD......',
    24: '.....KKKKKKKKKK.....',
    25: '....KKKKKKKKKKKK....',
    26: '....KkKKKKKKKKkK....',
    27: '...kkkkkkkkkkkkkk...',
  },
  // пижама в горошек: длинные рукава, штанишки, тапочки
  pajamas: {
    16: '....DDDDDDDDDDDD....',
    17: '...DDDDQDDDDQDDDD...',
    18: '...DD.DDDDDDDD.DD...',
    19: '...DD.DQDDDDQD.DD...',
    20: '...DD.DDDDDDDD.DD...',
    21: '...DD.DDQDDQDD.DD...',
    23: '......DDDDDDDD......',
    24: '......DDDDDDDD......',
    25: '......DQDDDDQD......',
    26: '......DDD..DDD......',
    27: '......DDD..DQD......',
    28: '......DQD..DDD......',
    29: '......DDD..DDD......',
    30: '......DDD..DDD......',
    31: '......ddd..ddd......',
    32: '......QQQ..QQQ......',
    33: '......QQQ..QQQ......',
  },
  // платье принцессы: пышные плечи, золотой пояс, юбка до пола с оборкой
  princess: {
    15: '....DDDGGGGGGDDD....',
    16: '...DDDDDDDDDDDDDD...',
    20: '...SS.GGGGGGGG.SS...',
    22: '....SDDDDDDDDDDS....',
    23: '....DDDDDDDDDDDD....',
    24: '...DDDDDDDDDDDDDD...',
    25: '...DDdDDDDDDDDdDD...',
    26: '..DDDDDDDDDDDDDDDD..',
    27: '..DDdDDDDDDDDDDdDD..',
    28: '..DDDDDDDDDDDDDDDD..',
    29: '.DDDDDdDDDDDDdDDDDD.',
    30: '.DDDDDDDDDDDDDDDDDD.',
    31: '.DDDDDDDDDDDDDDDDDD.',
    32: '.GGGGGGGGGGGGGGGGGG.',
    33: '.QQQQQQQQQQQQQQQQQQ.',
  },
  // купальник: открытые плечи и ноги, босиком
  swimsuit: {
    14: '......DSSSSSSD......',
    15: '.....SDDSSSSDDS.....',
    16: '....SSDDDDDDDDSS....',
    17: '...SSSDDDDDDDDSSS...',
    19: '...SS.DDQQQQDD.SS...',
    23: '......DDDDDDDD......',
    24: '......dDDDDDDd......',
    25: '......LLL..LLL......',
    26: '.......LL..LL.......',
    27: '.......LL..LL.......',
    32: '......LLL..LLL......',
    33: '....................',
  },
  // комбинезон на лямках поверх футболки
  overalls: {
    16: '....DDPDDDDDDPDD....',
    17: '...SSDPDDDDDDPDSS...',
    18: '...SS.PPPPPPPP.SS...',
    19: '...SS.PPGPPGPP.SS...',
    20: '...SS.PPPPPPPP.SS...',
    21: '...SS.PPPPPPPP.SS...',
    22: '....S.PPPPPPPP.S....',
    23: '......PPPPPPPP......',
    24: '......PPPPPPPP......',
    25: '......PPPPPPPP......',
    26: '......PPP..PPP......',
    27: '......PPP..PPP......',
    28: '......PPP..PPP......',
    29: '......PpP..PpP......',
    30: '......PPP..PPP......',
    31: '.......LL..LL.......',
  },
  // футболка с рукавами + шорты
  shorts: {
    16: '....DDDDDDDDDDDD....',
    17: '...SSDDDDDDDDDDSS...',
    23: '......DDDDDDDD......',
    24: '......PPPPPPPP......',
    25: '......PPPPPPPP......',
    26: '......PPP..PPP......',
    27: '......PpP..PpP......',
  },
};

const set = (rows, y, x, ch, onlyEmpty = true) => {
  const r = rows[y].split('');
  if (!onlyEmpty || r[x] === '.') r[x] = ch;
  rows[y] = r.join('');
};

// Причёски — модификации базы
const HAIR_STYLES = {
  bob: () => {},
  long: (rows) => {
    for (let y = 13; y <= 20; y++) for (const x of [2, 3, 16, 17]) set(rows, y, x, 'H');
    for (const x of [3, 16]) set(rows, 21, x, 'H');
  },
  pigtails: (rows) => {
    for (let y = 4; y <= 9; y++) for (const x of [0, 1, 18, 19]) set(rows, y, x, 'H');
    for (const x of [1, 18]) { set(rows, 10, x, 'H'); set(rows, 3, x, 'H'); }
    set(rows, 5, 0, 'h', false); set(rows, 5, 18, 'h', false);
  },
  bun: (rows) => {
    // пучок на макушке — рисуется поверх двух верхних строк, без сдвига тела (якоря не меняются)
    rows[0] = '........HhHH........';
    rows[1] = '.......HHHHHH.......';
  },
  // короткая стрижка: волосы только сверху, уши открыты
  short: (rows) => {
    for (let y = 7; y <= 10; y++) { set(rows, y, 2, '.', false); set(rows, y, 3, 'S', false); set(rows, y, 16, 'S', false); set(rows, y, 17, '.', false); }
    for (const x of [2, 3, 16, 17]) set(rows, 11, x, '.', false);
    set(rows, 11, 4, 'S', false); set(rows, 11, 15, 'S', false);
    for (const x of [2, 3, 4, 5, 14, 15, 16, 17]) set(rows, 12, x, '.', false);
    for (const x of [2, 3, 4, 15, 16, 17]) set(rows, 13, x, '.', false);
  },
  // хвост набок с резинкой
  ponytail: (rows) => {
    for (let y = 4; y <= 15; y++) set(rows, y, 18, 'H');
    for (let y = 6; y <= 13; y++) set(rows, y, 19, 'H');
    set(rows, 16, 18, 'H');
    set(rows, 5, 18, 'h', false); set(rows, 4, 18, 'h', false);
  },
  // кудряшки: волнистый край
  curly: (rows) => {
    rows[0] = '.....HH.HHHH.HH.....';
    for (const y of [3, 4, 6, 7, 9, 10, 12, 13]) { set(rows, y, 1, 'H'); set(rows, y, 18, 'H'); }
    for (const y of [5, 11]) { set(rows, y, 2, 'h', false); set(rows, y, 17, 'h', false); }
    for (const x of [1, 4, 15, 18]) set(rows, 14, x, 'H');
  },
};
export const HAIR_STYLE_KEYS = Object.keys(HAIR_STYLES);
export const OUTFIT_KEYS = Object.keys(OUTFITS);

export const CHAR_W = 22;
export const CHAR_H = 36;

// Якоря на текстуре (в пикселях от низа персонажа)
export const ANCHOR = {
  hatY: 30,   // линия макушки
  faceY: 27.5,
  mouthY: 25,
  handX: 7, handY: 13,
};

export const HAIR = ['#6b3f2a', '#2a2433', '#e8b04a', '#d9653b', '#b46ad9', '#4fb3d9', '#f28fb5', '#f2f2f2'];
export const SKIN = ['#f6d3b8', '#e8b48f', '#c98c62', '#8d5a3b', '#ffe0cc'];
export const DRESS = ['#f27aa6', '#7ad9b5', '#8fa8f2', '#f2c94c', '#c48ff2', '#f2955a', '#5ac4f2', '#ef5a6f'];
const PANTS_COLOR = '#5b6fc2';

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}
function lighten(hex, t) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.round(v + (255 - v) * t);
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

// Косметика из ванной: ключ -> [[цвет, [[x, y], ...]], ...] (координаты в шаблоне 20×34)
export const MAKEUP = {
  lips: [],  // помада перекрашивает рот (см. draw)
  blush: [['#ff5f8a', [[5, 9], [6, 9], [13, 9], [14, 9], [5, 10], [14, 10]]]],
  freckles: [['#b8703f', [[5, 10], [7, 9], [12, 9], [14, 10], [6, 11], [13, 11]]]],
  whiskers: [['#ff6f9a', [[9, 9], [10, 9]]], ['#2b1d2e', [[4, 9], [5, 9], [5, 11], [6, 11], [14, 9], [15, 9], [13, 11], [14, 11]]]],
  hearts: [['#ff3b6b', [[4, 9], [6, 9], [5, 10], [13, 9], [15, 9], [14, 10]]]],
};

function buildMap(look, face, pose = null) {
  const rows = BASE.slice();
  for (const [y, r] of Object.entries(OUTFITS[look.outfit] || {})) rows[+y] = r;
  // выражение лица (до причёски: у пучка строки сдвигаются)
  if (face === 'open') {
    rows[10] = '..HHSSSSSmmSSSSSHH..';
    rows[11] = '..HHHSSSSmmSSSSHHH..';
  } else if (face === 'blink' || face === 'yuck' || face === 'yawn') {
    rows[7] = '..HHSSSSSSSSSSSSHH..';
    rows[8] = '..HHSEEESSSSEEESHH..';
  } else if (face === 'lookl') {  // косится влево / вправо — следит за тем, что несут
    rows[7] = '..HHSEESSSSEESSSHH..';
    rows[8] = '..HHSEWSSSSEWSSSHH..';
  } else if (face === 'lookr') {
    rows[7] = '..HHSSSEESSSSEESHH..';
    rows[8] = '..HHSSSEWSSSSEWSHH..';
  }
  if (face === 'yawn') {          // зевает: глаза закрыты, рот открыт
    rows[10] = '..HHSSSSSmmSSSSSHH..';
    rows[11] = '..HHHSSSSmmSSSSHHH..';
  }
  if (face === 'yuck') {          // зажмурилась и высунула язык
    rows[10] = '..HHSSSSMMMMSSSSHH..';
    rows[11] = '..HHHSSSSTTSSSSHHH..';
    rows[12] = '..HHHHSSSTTSSSHHHH..';
  } else if (face === 'sour') {   // глаза-щёлочки > <, губы дугой вниз
    rows[6] = '..HHSSESSSSSSESSHH..';
    rows[7] = '..HHSSSESSSSESSSHH..';
    rows[8] = '..HHSSESSSSSSESSHH..';
    rows[10] = '..HHSSSSSmmSSSSSHH..';
    rows[11] = '..HHHSSSmSSmSSSHHH..';
  } else if (face === 'hot') {    // рот широко открыт — «ой, горячо!»
    rows[10] = '..HHSSSSmmmmSSSSHH..';
    rows[11] = '..HHHSSSmmmmSSSHHH..';
  } else if (face === 'smile') {  // улыбка до ушей — видно чистые зубки
    rows[10] = '..HHSSSSMWWMSSSSHH..';
  }
  (HAIR_STYLES[look.hairStyle] || HAIR_STYLES.bob)(rows);
  if (look.frazzled) {            // волосы дыбом после взрыва в котле (до купания)
    rows[0] = '..H..H..H..H..H..H..';
    rows[1] = '..HH.HH.HHHH.HH.HH..';
  }
  // сидит: голеней не видно (строки 28–31), туфли сразу под подолом; голова и руки остаются на месте
  if (pose === 'sit') { rows.splice(28, 4); rows.push(...Array(4).fill('....................')); }
  return rows;
}

function draw(map, look) {
  const c = document.createElement('canvas');
  c.width = CHAR_W;
  c.height = CHAR_H;
  const g = c.getContext('2d');
  const col = {
    H: look.hair, h: lighten(look.hair, 0.35), S: look.skin, D: look.dress, d: shade(look.dress, 0.75), C: '#ffffff',
    E: '#2b1d2e', W: '#ffffff', B: '#f59aa8', M: '#a8434f', m: '#6e2233', L: look.skin, O: '#5a3a4a',
    P: PANTS_COLOR, p: shade(PANTS_COLOR, 0.8), T: '#ff7a9a',
    Q: lighten(look.dress, 0.55), q: lighten(look.dress, 0.25), G: '#ffd84a', K: '#fff6e0', k: '#e6d3b0',
  };
  const mk = look.makeup || [];
  if (mk.includes('lips')) col.M = '#ff2f6d';
  const solid = new Set();
  map.forEach((row, y) => {
    for (let x = 0; x < 20; x++) {
      const ch = row[x] || '.';
      if (ch === '.') continue;
      g.fillStyle = col[ch];
      g.fillRect(x + 1, y + 1, 1, 1);
      solid.add(`${x + 1},${y + 1}`);
    }
  });
  // косметика и «усы» от коктейля — поверх лица (внутри силуэта, контур не меняется)
  const dot = (list, color) => { g.fillStyle = color; for (const [x, y] of list) g.fillRect(x + 1, y + 1, 1, 1); };
  for (const k of mk) if (MAKEUP[k]) for (const [color, list] of MAKEUP[k]) dot(list, color);
  // усы (папа) — цвета волос; очки (бабушка) — тонкая оправа вокруг глаз
  if (look.stache) dot([[7, 9], [8, 9], [9, 9], [10, 9], [11, 9], [12, 9], [7, 10], [12, 10]], shade(look.hair, 0.85));
  if (look.glasses) {
    const fr = [];
    for (const x0 of [5, 11]) {
      for (let x = x0; x <= x0 + 3; x++) fr.push([x, 6], [x, 9]);
      fr.push([x0, 7], [x0, 8], [x0 + 3, 7], [x0 + 3, 8]);
    }
    fr.push([9, 7], [10, 7]);
    dot(fr, '#7a5aa8');
  }
  if (look.mustache) dot([[8, 9], [9, 9], [10, 9], [11, 9], [7, 10], [12, 10]], look.mustache);
  g.fillStyle = '#2b1d2e';
  for (let y = 0; y < CHAR_H; y++) {
    for (let x = 0; x < CHAR_W; x++) {
      if (solid.has(`${x},${y}`)) continue;
      if (solid.has(`${x + 1},${y}`) || solid.has(`${x - 1},${y}`) || solid.has(`${x},${y + 1}`) || solid.has(`${x},${y - 1}`)) {
        g.fillRect(x, y, 1, 1);
      }
    }
  }
  return c;
}

/** Создаёт (или пересоздаёт) текстуры персонажа: обычная, рот открыт, глаза закрыты и реакции (фу, кисло, горячо, улыбка).
 *  После пересоздания у изображений надо заново вызвать setTexture(). */
const FACES = [['', 'normal'], ['_open', 'open'], ['_blink', 'blink'], ['_yuck', 'yuck'], ['_sour', 'sour'], ['_hot', 'hot'], ['_smile', 'smile'],
  ['_lookl', 'lookl'], ['_lookr', 'lookr'], ['_yawn', 'yawn']];

export function makeCharTextures(scene, key, look, onlyBase = false, pose = null) {
  for (const [suffix, face] of onlyBase ? FACES.slice(0, 1) : FACES) {
    const k = key + suffix;
    if (scene.textures.exists(k)) scene.textures.remove(k);
    scene.textures.addCanvas(k, draw(buildMap(look, face, pose), look));
  }
}

/** Иконка-портрет 18×16 (голова) для ящика и карты комнат. */
export function makeHeadIcon(scene, key, look) {
  const full = draw(buildMap(look, 'normal'), look);
  const c = document.createElement('canvas');
  c.width = 18;
  c.height = 16;
  c.getContext('2d').drawImage(full, 2, 0, 18, 16, 0, 0, 18, 16);
  // текстуру обновляем на месте: на неё уже могут ссылаться картинки ящика
  const t = scene.textures.exists(key) ? scene.textures.get(key) : scene.textures.createCanvas(key, 18, 16);
  t.context.clearRect(0, 0, 18, 16);
  t.context.drawImage(c, 0, 0);
  t.refresh();
}

// проверка шаблонов при загрузке: каждая строка — ровно 20 символов
for (const [name, rows] of Object.entries(OUTFITS)) {
  for (const [y, r] of Object.entries(rows)) if (r.length !== 20) console.error('наряд', name, 'строка', y, 'длина', r.length);
}
