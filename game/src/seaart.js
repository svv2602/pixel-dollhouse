// Море: рисунки и записи каталога (стиль — как в villageart.js и cityart.js).
// Поведение предмета задаёт поле beh: оно дописывается к правилам behaviorOf() в main.js.
import { canvasFor, iconFrom } from './furniture.js';

const disc = (r, cx, cy, rad, col) => {
  for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) if (x * x + y * y <= rad * rad + 1) r(cx + x, cy + y, 1, 1, col);
};
/** Эллипс. */
const oval = (r, cx, cy, rx, ry, col) => {
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x / rx) ** 2 + (y / ry) ** 2 <= 1) r(cx + x, cy + y, 1, 1, col);
};

// ---------------------------------------------------------------- пляж и остров
const palm = () => canvasFor(34, 46, (r) => {
  // изогнутый ствол с кольцами
  for (let y = 14; y < 46; y++) {
    const x = Math.round(15 + 4 * Math.sin((45 - y) / 14));
    r(x, y, 4, 1, '#b8834f'); r(x, y, 1, 1, '#d09a62'); r(x + 3, y, 1, 1, '#8d5a3b');
    if (y % 4 === 0) r(x, y, 4, 1, '#8d5a3b');
  }
  r(13, 44, 9, 2, '#8d5a3b');
  // листья веером
  const leaf = (dx, dy, len, col) => {
    for (let i = 0; i < len; i++) {
      const x = Math.round(17 + dx * i);
      const y = Math.round(12 + dy * i + (i * i) / (len * 1.6));
      r(x, y, 2, 2, col); if (i % 2) r(x, y + 2, 1, 1, col);
    }
  };
  leaf(-1.1, -0.5, 14, '#4fa83d'); leaf(1.1, -0.5, 14, '#4fa83d'); leaf(-0.8, -0.9, 11, '#6cc04a'); leaf(0.8, -0.9, 11, '#6cc04a');
  leaf(-1.2, 0.1, 13, '#3f8f33'); leaf(1.2, 0.1, 13, '#3f8f33'); leaf(0, -1, 9, '#6cc04a');
  disc(r, 15, 15, 2, '#8d5a3b'); disc(r, 20, 16, 2, '#7a4a32'); r(14, 14, 1, 1, '#b8834f'); // кокосы
});

/** Замок из песка: 0 — кучка, 1 — башня, 2 — замок, 3 — замок с флажком. */
const sandCastle = (n) => canvasFor(30, 26, (r) => {
  const S = '#f2d28a'; const L = '#fbe6ae'; const D = '#d9b06a';
  oval(r, 15, 24, 14, 3, D); oval(r, 15, 23, 13, 3, S);
  if (n === 0) { oval(r, 15, 19, 8, 5, S); r(10, 16, 4, 1, L); return; }
  const tower = (x, y, w, h) => {
    r(x, y, w, h, S); r(x, y, 1, h, L); r(x + w - 1, y, 1, h, D);
    for (let i = 0; i < w; i += 2) r(x + i, y - 2, 1, 2, S);
    r(x + Math.floor(w / 2) - 1, y + 2, 2, 3, D);
  };
  if (n === 1) { tower(11, 12, 8, 11); return; }
  tower(2, 13, 7, 10); tower(21, 13, 7, 10);
  r(8, 16, 14, 7, S); r(8, 16, 14, 1, L); for (let x = 8; x < 22; x += 2) r(x, 14, 1, 2, S);
  r(13, 19, 4, 4, '#b8834f'); r(14, 18, 2, 1, '#b8834f');
  tower(11, 7, 8, 9);
  if (n === 3) { r(15, 0, 1, 6, '#8d5a3b'); r(16, 0, 5, 3, '#ef5a6f'); r(16, 0, 5, 1, '#ff9aa8'); }
});

/** Кабинка для переодевания: шторка открыта или задёрнута. */
const cabin = (closed) => canvasFor(26, 44, (r) => {
  for (let i = 0; i < 7; i++) { const hw = 3 + i * 2; r(13 - hw, i, hw * 2, 1, i < 1 ? '#7ad9f2' : '#3fa8d9'); }
  r(1, 7, 24, 37, '#ffffff'); for (let x = 1; x < 25; x += 6) r(x, 7, 3, 37, '#5ac4f2');
  r(0, 7, 26, 1, '#2f7fb0'); r(24, 7, 1, 37, '#d6e6f0');
  r(4, 10, 18, 34, '#2f5a80');
  if (closed) { r(4, 11, 18, 31, '#ffd84a'); for (let x = 6; x < 22; x += 4) r(x, 11, 1, 31, '#e0a020'); for (let x = 4; x < 22; x += 4) r(x, 11, 1, 31, '#fff4a8'); } else {
    r(4, 11, 4, 31, '#ffd84a'); r(18, 11, 4, 31, '#ffd84a'); r(6, 11, 1, 31, '#e0a020'); r(20, 11, 1, 31, '#e0a020');
    r(10, 16, 6, 7, '#ff7ab8'); r(11, 23, 4, 3, '#ff7ab8'); r(9, 14, 8, 1, '#8f96b0'); r(12, 13, 2, 1, '#8f96b0'); // купальник на крючке
  }
  r(4, 10, 18, 1, '#8f96b0');
});

// ---------------------------------------------------------------- в море
const boat = () => canvasFor(46, 34, (r) => {
  r(22, 0, 2, 22, '#8d5a3b'); // мачта
  for (let i = 0; i < 17; i++) { const w = Math.round(1 + i * 0.85); r(24, 2 + i, w, 1, i % 4 < 2 ? '#ffffff' : '#ef5a6f'); } // парус
  for (let i = 0; i < 12; i++) { const w = Math.round(1 + i * 0.7); r(22 - w, 7 + i, w, 1, '#fff4a8'); }
  r(22, 0, 5, 3, '#5a7fd9'); // флажок
  r(2, 22, 42, 4, '#c98a52'); r(2, 22, 42, 1, '#e0a971'); // борт
  for (let i = 0; i < 6; i++) r(4 + i, 26 + i, 38 - i * 2, 1, i < 2 ? '#ef5a6f' : '#b8342c');
  r(4, 28, 36, 1, '#ffffff');
  r(8, 23, 3, 2, '#8d5a3b'); r(34, 23, 3, 2, '#8d5a3b');
});

/** Мостик с удочкой: поплавок спокоен или клюёт. */
const pier = (bite) => canvasFor(40, 30, (r) => {
  r(0, 16, 26, 3, '#c98a52'); r(0, 16, 26, 1, '#e0a971'); for (let x = 5; x < 26; x += 6) r(x, 16, 1, 3, '#a8693c');
  r(3, 19, 3, 11, '#8d5a3b'); r(18, 19, 3, 11, '#8d5a3b'); r(3, 19, 1, 11, '#a8714d'); r(18, 19, 1, 11, '#a8714d');
  r(8, 12, 6, 4, '#ef5a6f'); r(8, 12, 6, 1, '#ff9aa8'); // ведёрко
  // удочка от мостика вверх-вправо, леска вниз к поплавку
  for (let i = 0; i < 16; i++) r(20 + i, 14 - Math.round(i * 0.8) + (bite && i > 10 ? i - 10 : 0), 1, 2, '#8d5a3b');
  const tipY = bite ? 8 : 2;
  for (let y = tipY + 1; y < (bite ? 24 : 22); y++) r(36, y, 1, 1, '#d8dcec');
  const fy = bite ? 24 : 21;
  r(35, fy, 3, 2, '#ef5a6f'); r(35, fy + 2, 3, 2, '#ffffff');
});

/** Надувной круг: видна передняя половина — она закрывает ноги куклы, стоящей в воде. */
const swimRing = () => canvasFor(22, 6, (r) => {
  for (let x = 0; x < 22; x++) {
    const edge = x < 2 || x > 19 ? 1 : 0;
    r(x, edge, 1, 6 - edge * 2, Math.floor(x / 4) % 2 ? '#ffffff' : '#ef5a6f');
  }
  r(3, 1, 16, 1, '#ffd0d8');
});

// ---------------------------------------------------------------- под водой
const giantClam = (open) => canvasFor(26, 20, (r) => {
  if (open) {
    oval(r, 13, 6, 12, 6, '#f2a0b8'); oval(r, 13, 7, 10, 4, '#ffe0ec');
    for (const x of [5, 9, 13, 17, 21]) r(x, 0, 1, 4, '#d87898');
    disc(r, 13, 12, 3, '#ffffff'); r(12, 10, 1, 1, '#ffd0e4'); r(15, 13, 1, 1, '#d6e0ff'); // жемчужина
  } else { oval(r, 13, 12, 12, 6, '#f2a0b8'); oval(r, 13, 11, 10, 4, '#f8bccd'); for (const x of [5, 9, 13, 17, 21]) r(x, 7, 1, 9, '#d87898'); }
  oval(r, 13, 16, 12, 3, '#f2a0b8'); oval(r, 13, 15, 10, 2, open ? '#ffe0ec' : '#f8bccd'); r(3, 19, 20, 1, '#c8688a');
});

const seaChest = (open) => canvasFor(30, 24, (r) => {
  if (open) {
    r(1, 0, 28, 8, '#a8693c'); r(1, 0, 28, 1, '#c98a52'); r(3, 2, 24, 5, '#5a3a4a'); r(0, 0, 2, 8, '#f2c94c'); r(28, 0, 2, 8, '#f2c94c');
    r(4, 7, 22, 4, '#ffd84a'); r(6, 6, 4, 2, '#ef5a6f'); r(13, 5, 4, 3, '#5ac4f2'); r(20, 6, 4, 2, '#7ad98a'); r(9, 8, 2, 1, '#ffffff'); r(18, 8, 2, 1, '#ffffff'); // сокровища
  } else {
    for (let i = 0; i < 6; i++) r(1 + (i < 2 ? 2 - i : 0), 5 + i, 28 - (i < 2 ? (2 - i) * 2 : 0), 1, i < 1 ? '#c98a52' : '#a8693c');
    r(13, 4, 4, 2, '#f2c94c');
  }
  r(1, 11, 28, 13, '#a8693c'); r(1, 11, 28, 1, '#c98a52'); r(1, 22, 28, 2, '#7a4a32');
  r(0, 11, 2, 13, '#f2c94c'); r(28, 11, 2, 13, '#f2c94c'); r(9, 11, 2, 13, '#8d5a3b'); r(19, 11, 2, 13, '#8d5a3b');
  r(13, 12, 4, 5, '#f2c94c'); r(14, 14, 2, 2, '#5a3a4a');
  r(3, 18, 3, 2, '#4fa83d'); r(22, 15, 4, 2, '#4fa83d'); // водоросли на досках
});

const sub = () => canvasFor(44, 26, (r) => {
  oval(r, 22, 16, 20, 9, '#ffd84a');
  for (let x = 4; x < 40; x++) r(x, 9, 1, 1, '#fff4a8');
  oval(r, 22, 21, 18, 4, '#e0a020');
  r(17, 2, 12, 7, '#ffd84a'); r(17, 2, 12, 1, '#fff4a8'); r(27, 2, 2, 7, '#e0a020'); // рубка
  r(24, 0, 2, 3, '#8f96b0'); r(24, 0, 5, 1, '#8f96b0'); // перископ
  for (const x of [11, 22, 33]) { disc(r, x, 15, 3, '#3a8fc0'); disc(r, x, 15, 2, '#bfe6ff'); r(x - 1, 14, 1, 1, '#ffffff'); }
  r(0, 13, 3, 6, '#ef5a6f'); r(1, 11, 2, 2, '#ef5a6f'); r(1, 19, 2, 2, '#ef5a6f'); // винт
  r(41, 14, 2, 3, '#fff07a');
});

const coral = () => canvasFor(24, 26, (r) => {
  const br = (x, y, h, col) => { r(x, y, 3, h, col); r(x, y, 1, h, '#ffb0d0'); disc(r, x + 1, y, 2, col); };
  br(10, 6, 20, '#ff7ab8'); br(4, 12, 14, '#ff7ab8'); br(17, 10, 16, '#ff7ab8'); br(1, 18, 8, '#ef5a6f'); br(21, 17, 9, '#ef5a6f');
  r(6, 15, 4, 2, '#ff7ab8'); r(13, 13, 4, 2, '#ff7ab8');
  disc(r, 11, 2, 1, '#bfe6ff'); r(18, 5, 2, 2, '#bfe6ff'); r(5, 8, 1, 1, '#bfe6ff'); // пузырьки
  r(2, 24, 20, 2, '#d95a98');
});

// ---------------------------------------------------------------- остров
const xMark = () => canvasFor(14, 9, (r) => {
  oval(r, 7, 5, 7, 4, '#e0c078');
  for (let i = 0; i < 7; i++) { r(3 + i, 1 + i, 2, 1, '#e0483e'); r(10 - i, 1 + i, 2, 1, '#e0483e'); }
});

const nest = () => canvasFor(24, 14, (r) => {
  oval(r, 12, 10, 12, 4, '#e0c078'); oval(r, 12, 9, 10, 3, '#c9a05a');
  // три яйца: два сзади и одно спереди, между ними видно песок
  for (const [x, y] of [[5, 5], [18, 5], [12, 7]]) { oval(r, x, y, 2, 3, '#fffdf4'); r(x - 1, y - 2, 1, 2, '#ffffff'); r(x + 1, y + 1, 1, 2, '#d9cfb4'); r(x - 3, y + 4, 7, 1, '#b08a48'); }
  r(8, 4, 2, 5, '#c9a05a'); r(15, 4, 1, 5, '#c9a05a'); // песок между яйцами
});

/** Значок моря для карты и табло. */
const seaIcon = () => canvasFor(12, 10, (r) => {
  r(1, 0, 10, 5, '#9fdcff'); r(7, 1, 3, 3, '#ffe066');
  r(1, 5, 10, 4, '#3a8fc0'); r(1, 5, 3, 1, '#ffffff'); r(6, 6, 3, 1, '#ffffff'); r(3, 7, 2, 1, '#bfe6ff'); r(9, 8, 2, 1, '#bfe6ff');
  r(3, 2, 1, 3, '#8d5a3b'); r(4, 1, 2, 3, '#ffffff'); // парус
});
const postcard = () => canvasFor(18, 12, (r) => {
  r(0, 0, 18, 12, '#fff8e8');
  r(1, 1, 8, 5, '#9fdcff'); r(1, 6, 8, 2, '#3a8fc0'); r(1, 8, 8, 3, '#f2d28a'); r(6, 2, 2, 2, '#ffe066');
  r(3, 4, 1, 5, '#8d5a3b'); r(1, 3, 5, 1, '#4fa83d'); r(2, 2, 3, 1, '#4fa83d');
  r(13, 1, 4, 4, '#3a8fc0'); r(14, 2, 2, 2, '#ffffff');
  r(10, 6, 7, 1, '#c9b3e0'); r(10, 8, 6, 1, '#c9b3e0'); r(10, 10, 4, 1, '#c9b3e0');
});

export function makeSeaArt(scene) {
  const T = scene.textures;
  const add = (key, canvas, icon = true) => {
    if (T.exists(key)) return;
    T.addCanvas(key, canvas);
    if (icon) T.addCanvas(`${key}_icon`, iconFrom(canvas, false));
  };
  add('palm', palm());
  for (let n = 0; n < 4; n++) add(`sandcastle_${n}`, sandCastle(n), n === 0 || n === 3);
  add('cabin', cabin(false));
  add('cabin_closed', cabin(true), false);
  add('boat', boat());
  add('pier', pier(false));
  add('pier_b', pier(true), false);
  add('swimring', swimRing(), false);
  add('giantclam', giantClam(false));
  add('giantclam_open', giantClam(true), false);
  add('seachest', seaChest(false));
  add('seachest_open', seaChest(true), false);
  add('sub', sub());
  add('coral', coral());
  add('xmark', xMark());
  add('nest', nest());
  add('place_sea', seaIcon(), false);
  add('postcard_sea', postcard());

  const big = (id, subject, beh, order, extra = {}) => ({ id, subject, cat: 'furniture', tags: ['furniture'], tex: id, bbox: [0, 0, 15, 15], order, beh, ...extra });
  // названия подобраны так, чтобы правила behaviorOf() по словам (chest, basket, lamp, bed…) их не цепляли
  return [
    big('palm', 'coconut palm tree', { fruit: 'coconut', palm: true }, 100),
    big('sandcastle', 'sand castle', { sand: true }, 101, { tex: 'sandcastle_0' }),
    big('cabin', 'beach changing cabin', { fitting: true, cabin: true }, 102),
    big('boat', 'little sailing boat', { boat: true, perch: { dy: 10, lo: -12, hi: 12 } }, 103), // кукла сидит на борту перед парусом: за ним её не видно
    big('pier', 'fishing pier', { fishing: true }, 104),
    big('giantclam', 'giant clam', { clam: true }, 105),
    big('seachest', 'sunken treasure trunk', { seachest: true, container: false }, 106),
    big('sub', 'little submarine', { sub: true, perch: { dy: 12, lo: -2, hi: 8, behind: true } }, 107),
    big('coral', 'bubbling coral', { vent: true }, 108),
    big('xmark', 'treasure cross', { xmark: true, flat: true }, 110),
    big('nest', 'turtle sand nest', { nest: true }, 111),
    { id: 'postcard-sea', subject: 'postcard from the sea', cat: 'toy', tags: ['toy'], tex: 'postcard_sea', bbox: [0, 0, 15, 15], hidden: true, beh: { postcard: 'sea' } },
  ];
}
