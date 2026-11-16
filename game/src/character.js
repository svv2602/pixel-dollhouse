// Персонаж-кукла 20×34 (+1px авто-контур = 22×36). Рисуется попиксельно в canvas
// из шаблона: база + причёска + наряд. Цвета подставляются из палитры персонажа.

// Буквы: H волосы, h блик волос, S кожа, E глаз, W блик глаза, B румянец, M рот,
// D одежда (верх), d тень одежды, C воротник, P брюки, p тень брюк, L ноги, O обувь
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
};
export const HAIR_STYLE_KEYS = Object.keys(HAIR_STYLES);
export const OUTFIT_KEYS = ['dress', 'pants'];

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

function buildMap(look, face) {
  const rows = BASE.slice();
  if (look.outfit === 'pants') for (const [y, r] of Object.entries(PANTS)) rows[+y] = r;
  // выражение лица (до причёски: у пучка строки сдвигаются)
  if (face === 'open') {
    rows[10] = '..HHSSSSSmmSSSSSHH..';
    rows[11] = '..HHHSSSSmmSSSSHHH..';
  } else if (face === 'blink' || face === 'yuck') {
    rows[7] = '..HHSSSSSSSSSSSSHH..';
    rows[8] = '..HHSEEESSSSEEESHH..';
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
export function makeCharTextures(scene, key, look) {
  for (const [suffix, face] of [['', 'normal'], ['_open', 'open'], ['_blink', 'blink'], ['_yuck', 'yuck'], ['_sour', 'sour'], ['_hot', 'hot'], ['_smile', 'smile']]) {
    const k = key + suffix;
    if (scene.textures.exists(k)) scene.textures.remove(k);
    scene.textures.addCanvas(k, draw(buildMap(look, face), look));
  }
}
