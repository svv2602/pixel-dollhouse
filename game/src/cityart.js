// Город: рисунки и записи каталога (см. villageart.js — стиль тот же: заливка + блик + тень, общий тёмный контур).
// Поведение предмета задаёт поле beh: оно дописывается к правилам behaviorOf() в main.js.
import { canvasFor, iconFrom } from './furniture.js';

/** Мелочь без контура (клешня автомата): контур съел бы весь рисунок. */
const plain = (rows, pal) => {
  const c = document.createElement('canvas');
  c.width = Math.max(...rows.map((r) => r.length));
  c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
  return c;
};
const disc = (r, cx, cy, rad, col) => {
  for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) if (x * x + y * y <= rad * rad + 1) r(cx + x, cy + y, 1, 1, col);
};

// ---------------------------------------------------------------- улица
/** Светофор: горит красный или зелёный. */
const trafficLight = (green) => canvasFor(12, 40, (r) => {
  r(5, 17, 2, 21, '#8f96b0'); r(5, 17, 1, 21, '#b8bccc'); r(2, 38, 8, 2, '#5a5068');
  r(1, 0, 10, 17, '#3a3040'); r(1, 0, 10, 1, '#5a5068');
  disc(r, 6, 3, 2, green ? '#7a2a30' : '#ff4a4a');
  disc(r, 6, 8, 2, '#8a7a2a');
  disc(r, 6, 13, 2, green ? '#5cf27a' : '#2a6a3a');
  if (green) r(5, 12, 1, 1, '#d0ffd8'); else r(5, 2, 1, 1, '#ffc0c0');
});

const iceCart = () => canvasFor(34, 32, (r) => {
  for (let i = 0; i < 7; i++) { // зонт в полоску
    const hw = 5 + i * 2;
    for (let x = -hw; x < hw; x++) r(17 + x, i, 1, 1, Math.floor((x + 40) / 4) % 2 ? '#ff9ac8' : '#ffffff');
  }
  r(4, 7, 26, 1, '#d97aa5');
  r(16, 8, 2, 8, '#8f96b0');
  r(3, 16, 26, 10, '#fff8ee'); r(3, 16, 26, 1, '#ffffff'); r(3, 24, 26, 2, '#7ad9b5'); r(27, 16, 2, 10, '#e3d6c4');
  // рожок на борту
  r(13, 18, 5, 3, '#ff9ac8'); r(14, 17, 3, 1, '#ff9ac8'); r(14, 18, 1, 1, '#ffffff');
  r(13, 21, 5, 1, '#e0a971'); r(14, 22, 3, 1, '#e0a971'); r(15, 23, 1, 1, '#c98a52');
  r(6, 19, 3, 3, '#7ad9b5'); r(22, 19, 3, 3, '#ffd84a');
  r(29, 14, 4, 1, '#8f96b0'); r(32, 14, 1, 6, '#8f96b0'); // ручка
  disc(r, 9, 28, 3, '#3a3040'); disc(r, 9, 28, 1, '#f2c94c');
  disc(r, 23, 28, 3, '#3a3040'); disc(r, 23, 28, 1, '#f2c94c');
});

const fountain = () => canvasFor(40, 24, (r) => {
  r(2, 14, 36, 8, '#b8bccc'); r(4, 22, 32, 2, '#8f96b0'); r(2, 20, 36, 1, '#8f96b0');
  for (const x of [8, 16, 23, 31]) r(x, 16, 1, 3, '#8f96b0');
  r(0, 11, 40, 4, '#d8dcec'); r(0, 14, 40, 1, '#8f96b0');
  r(3, 12, 34, 2, '#5ac4f2'); r(6, 12, 8, 1, '#bfe6ff'); r(24, 13, 7, 1, '#bfe6ff');
  r(18, 4, 4, 9, '#d8dcec'); r(21, 4, 1, 9, '#8f96b0');
  r(13, 3, 14, 2, '#d8dcec'); r(13, 4, 14, 1, '#8f96b0'); r(15, 2, 10, 1, '#5ac4f2');
  r(19, 0, 2, 2, '#bfe6ff');
});

/** Машина (едет вправо). */
const car = (body, light, dark) => canvasFor(30, 14, (r) => {
  r(7, 0, 15, 6, body); r(7, 0, 15, 1, light);
  r(9, 1, 5, 4, '#bfe6ff'); r(15, 1, 5, 4, '#bfe6ff'); r(9, 1, 5, 1, '#ffffff');
  r(0, 5, 30, 6, body); r(0, 5, 30, 1, light); r(0, 10, 30, 1, dark);
  r(28, 6, 2, 2, '#fff07a'); r(0, 6, 1, 2, '#ef5a6f'); r(14, 7, 2, 1, dark);
  disc(r, 7, 11, 2, '#3a3040'); disc(r, 22, 11, 2, '#3a3040'); r(7, 11, 1, 1, '#b8bccc'); r(22, 11, 1, 1, '#b8bccc');
});

// ---------------------------------------------------------------- супермаркет
const fruitStand = () => canvasFor(38, 32, (r) => {
  for (let x = 0; x < 38; x++) r(x, 0, 1, 5, Math.floor(x / 4) % 2 ? '#7ad98a' : '#ffffff'); // навес
  r(0, 5, 38, 1, '#52b893');
  r(2, 6, 2, 26, '#a8714d'); r(34, 6, 2, 26, '#a8714d'); r(4, 30, 30, 2, '#8d5a3b');
  const crate = (x, y, cols) => {
    r(x, y + 3, 12, 6, '#c98a52'); r(x, y + 3, 12, 1, '#e0a971'); r(x, y + 6, 12, 1, '#a8693c');
    cols.forEach((c, i) => { r(x + 1 + i * 3, y + 1, 2, 2, c); r(x + 1 + i * 3, y + 1, 1, 1, '#ffffff'); });
    r(x + 2, y, 2, 1, cols[1]); r(x + 7, y, 2, 1, cols[2]);
  };
  crate(6, 8, ['#ef5a6f', '#ffd84a', '#ef5a6f', '#ffd84a']);
  crate(20, 8, ['#f2955a', '#f2955a', '#7ad98a', '#f2955a']);
  crate(6, 19, ['#7ad98a', '#ef5a6f', '#7ad98a', '#b47cf2']);
  crate(20, 19, ['#ffd84a', '#b47cf2', '#ffd84a', '#ef5a6f']);
});

const breadRack = () => canvasFor(30, 38, (r) => {
  r(0, 0, 30, 38, '#e0a971'); r(0, 0, 30, 2, '#f6d6a0'); r(0, 0, 2, 38, '#c98a52'); r(28, 0, 2, 38, '#a8693c');
  r(2, 2, 26, 34, '#fff3d6');
  for (const y of [11, 22, 33]) { r(2, y, 26, 2, '#c98a52'); r(2, y, 26, 1, '#e0a971'); }
  const loaf = (x, y, w) => {
    r(x, y + 1, w, 4, '#d9a066'); r(x + 1, y, w - 2, 1, '#d9a066'); r(x + 1, y + 1, w - 2, 1, '#f2c98a');
    for (let i = 2; i < w - 1; i += 3) r(x + i, y + 2, 1, 2, '#b07840');
  };
  loaf(4, 6, 10); loaf(16, 6, 9); loaf(3, 17, 7); loaf(11, 17, 7); loaf(19, 17, 7);
  for (const x of [4, 10, 16, 22]) { disc(r, x + 2, 30, 2, '#e8b04a'); r(x + 1, 29, 1, 1, '#ffe7a8'); }
  r(0, 36, 30, 2, '#a8693c');
});

const cooler = () => canvasFor(28, 42, (r) => {
  r(0, 0, 28, 42, '#bff0de'); r(0, 0, 28, 1, '#e6fff5'); r(26, 0, 2, 42, '#93d9bf'); r(0, 38, 28, 4, '#6fb79c');
  r(3, 2, 22, 5, '#5ac4f2'); r(5, 3, 3, 3, '#ffffff'); r(10, 4, 12, 1, '#ffffff');
  r(3, 9, 22, 27, '#eaf6ff'); r(3, 9, 22, 1, '#ffffff');
  for (const y of [18, 27, 35]) r(3, y, 22, 1, '#9fd2e2');
  const bottle = (x, y, cap) => { r(x, y + 2, 3, 5, '#ffffff'); r(x + 1, y, 1, 2, '#ffffff'); r(x + 1, y, 1, 1, cap); r(x, y + 4, 3, 1, '#bfe6ff'); };
  bottle(5, 11, '#5a7fd9'); bottle(10, 11, '#ef5a6f'); bottle(15, 11, '#5a7fd9'); bottle(20, 11, '#ef5a6f');
  r(5, 22, 7, 5, '#ffd84a'); r(7, 23, 1, 1, '#e0a020'); r(10, 25, 1, 1, '#e0a020');
  for (const x of [14, 19]) { r(x, 22, 4, 5, '#ffd0e4'); r(x, 22, 4, 1, '#ff9ac8'); }
  for (const x of [5, 10, 15, 20]) { r(x, 30, 4, 5, x % 10 ? '#fff8ee' : '#c8ecff'); r(x, 30, 4, 1, '#8fa8f2'); }
  r(24, 20, 1, 8, '#8f96b0');
});

/** Тележка покупателя: пустая и с покупками. */
const shopCart = (full) => canvasFor(26, 22, (r) => {
  if (full) { r(4, 1, 5, 4, '#ef5a6f'); r(10, 0, 4, 5, '#7ad98a'); r(15, 2, 4, 3, '#ffd84a'); r(6, 0, 1, 1, '#52b893'); }
  r(2, 5, 19, 10, '#d8dcec'); r(2, 5, 19, 1, '#ffffff'); r(2, 14, 19, 1, '#8f96b0'); r(2, 9, 19, 1, '#8f96b0');
  for (let x = 4; x < 21; x += 3) r(x, 6, 1, 8, '#8f96b0');
  r(21, 3, 5, 2, '#ef5a6f'); r(21, 5, 1, 4, '#8f96b0');
  r(4, 15, 1, 3, '#8f96b0'); r(18, 15, 1, 3, '#8f96b0'); r(4, 17, 15, 1, '#8f96b0');
  disc(r, 5, 20, 1, '#3a3040'); disc(r, 18, 20, 1, '#3a3040');
});

/** Касса с лентой; lit — сканер пикнул. */
const checkout = (lit) => canvasFor(46, 24, (r) => {
  r(0, 8, 46, 16, '#5ac4f2'); r(0, 8, 46, 1, '#bfe6ff'); r(0, 21, 46, 3, '#3a8fc0'); r(44, 8, 2, 16, '#3a8fc0');
  r(1, 6, 28, 3, '#3a3040'); for (let x = 3; x < 28; x += 4) r(x, 7, 2, 1, '#5a5068'); // лента
  r(29, 4, 3, 5, lit ? '#5cf27a' : '#ef5a6f'); r(29, 3, 3, 1, '#8f96b0'); // сканер
  r(33, 0, 11, 9, '#f4ead8'); r(34, 1, 9, 4, lit ? '#b8ff9a' : '#7ad9b5'); // касса
  r(34, 6, 2, 1, '#8f96b0'); r(37, 6, 2, 1, '#8f96b0'); r(40, 6, 2, 1, '#ef5a6f');
  r(6, 13, 12, 6, '#ffffff'); r(8, 15, 8, 1, '#5ac4f2'); r(8, 17, 5, 1, '#5ac4f2');
});

const paperBag = (full) => canvasFor(12, 16, (r) => {
  if (full) { r(2, 0, 2, 5, '#e8b04a'); r(5, 1, 3, 4, '#7ad98a'); r(8, 2, 2, 3, '#ef5a6f'); }
  else { r(3, 2, 1, 3, '#b07840'); r(8, 2, 1, 3, '#b07840'); r(3, 2, 6, 1, '#b07840'); }
  r(0, 5, 12, 11, '#d9a066'); r(0, 5, 12, 1, '#f2c98a'); r(10, 5, 2, 11, '#b07840');
  r(4, 9, 4, 4, '#ffffff'); r(5, 10, 2, 2, '#52b893');
});

// ---------------------------------------------------------------- кафе
const showcase = () => canvasFor(40, 26, (r) => {
  r(0, 14, 40, 12, '#ff9ac8'); r(0, 14, 40, 1, '#ffd0e4'); r(0, 23, 40, 3, '#d97aa5');
  for (let x = 3; x < 40; x += 6) r(x, 17, 2, 4, '#ffd0e4');
  r(0, 0, 40, 2, '#d8dcec');
  r(1, 2, 38, 12, '#eaf6ff'); r(1, 2, 38, 1, '#ffffff'); r(1, 8, 38, 1, '#9fd2e2');
  for (const [x, c] of [[4, '#ff7ab8'], [11, '#ffd84a'], [18, '#7ad9b5'], [25, '#b47cf2'], [32, '#ef5a6f']]) {
    r(x, 5, 4, 3, '#f2d39a'); r(x, 4, 4, 2, c); r(x + 1, 3, 1, 1, '#ef5a6f'); // пирожные
  }
  for (const x of [4, 12, 20, 28]) { r(x, 10, 6, 3, '#d9a066'); r(x + 1, 10, 4, 1, x % 8 ? '#ff9ac8' : '#7a4a32'); r(x + 2, 11, 2, 1, '#eaf6ff'); } // пончики
});

const drinkBar = () => canvasFor(26, 36, (r) => {
  r(0, 18, 26, 18, '#c98a52'); r(0, 18, 26, 2, '#e0a971'); r(0, 33, 26, 3, '#a8693c');
  for (let x = 4; x < 26; x += 7) r(x, 21, 1, 11, '#a8693c');
  r(3, 2, 15, 16, '#ef5a6f'); r(3, 2, 15, 1, '#ff9aa8'); r(16, 2, 2, 16, '#b8342c'); // кофемашина
  r(5, 4, 6, 4, '#3a3040'); r(6, 5, 2, 1, '#5cf27a'); r(13, 4, 2, 2, '#ffd84a'); r(13, 7, 2, 2, '#ffffff');
  r(6, 10, 9, 1, '#8f96b0'); r(9, 11, 2, 2, '#8f96b0');
  r(7, 14, 6, 4, '#ffffff'); r(7, 14, 6, 1, '#d8dcec'); r(13, 15, 2, 2, '#ffffff'); // чашка под носиком
  r(20, 9, 4, 9, '#ffd84a'); r(20, 9, 4, 1, '#ffffff'); r(21, 6, 1, 3, '#ef5a6f'); // сок с трубочкой
});

const cafeTable = () => canvasFor(26, 20, (r) => {
  r(1, 0, 24, 3, '#ffffff'); for (let x = 1; x < 25; x += 4) r(x, 0, 2, 3, '#ef5a6f');
  r(0, 3, 26, 2, '#ffffff'); for (let x = 2; x < 26; x += 4) r(x, 3, 2, 2, '#ef5a6f');
  r(0, 5, 26, 1, '#d8dcec');
  r(11, 6, 4, 11, '#a8714d'); r(11, 6, 1, 11, '#c98a52'); r(6, 17, 14, 3, '#8d5a3b');
});

// ---------------------------------------------------------------- магазин одежды
const hatRack = () => canvasFor(24, 40, (r) => {
  r(11, 3, 2, 34, '#a8714d'); r(11, 3, 1, 34, '#c98a52'); r(5, 37, 14, 3, '#8d5a3b'); disc(r, 12, 2, 2, '#f2c94c');
  for (const [y, left] of [[9, true], [17, false], [25, true], [32, false]]) r(left ? 3 : 13, y, 8, 1, '#8d5a3b');
  const hat = (x, y, c, band) => { r(x + 2, y, 5, 4, c); r(x, y + 4, 9, 2, c); r(x + 2, y + 3, 5, 1, band); r(x + 2, y, 1, 1, '#ffffff'); };
  hat(0, 3, '#ef5a6f', '#ffffff'); hat(14, 11, '#5a7fd9', '#ffd84a'); hat(0, 19, '#f2c94c', '#8a52cc'); hat(14, 26, '#7ad9b5', '#ffffff');
});

const rail = () => canvasFor(38, 32, (r) => {
  r(1, 0, 2, 30, '#8f96b0'); r(35, 0, 2, 30, '#8f96b0'); r(1, 1, 36, 2, '#b8bccc'); r(0, 30, 5, 2, '#5a5068'); r(33, 30, 5, 2, '#5a5068');
  const dress = (x, c, l) => {
    r(x + 2, 3, 1, 2, '#5a5068'); r(x + 1, 5, 3, 3, c); r(x, 8, 5, 6, c); r(x - 1, 14, 7, 7, c);
    r(x, 8, 1, 6, l); r(x - 1, 20, 7, 1, l); r(x, 12, 5, 1, l);
  };
  dress(6, '#ff7ab8', '#ffd0e4'); dress(13, '#5ac4f2', '#bfe6ff'); dress(20, '#ffd84a', '#fff4a8'); dress(27, '#b47cf2', '#e2ccff');
});

/** Примерочная: шторка открыта (видно зеркало) или задёрнута. */
const fitting = (closed) => canvasFor(28, 44, (r) => {
  r(0, 0, 28, 44, '#c9b3e0'); r(0, 0, 28, 1, '#fbf5ff'); r(26, 0, 2, 44, '#9b7fb8'); r(0, 0, 2, 44, '#e8d8f5');
  r(9, 1, 10, 4, '#ffd84a'); r(13, 2, 2, 2, '#ffffff');
  r(3, 6, 22, 38, '#5a3a6a'); r(3, 6, 22, 1, '#8f96b0');
  if (closed) {
    r(3, 7, 22, 35, '#ff7ab8');
    for (let x = 5; x < 25; x += 4) r(x, 7, 1, 35, '#d95a98');
    for (let x = 3; x < 25; x += 4) r(x, 7, 1, 35, '#ffb0d0');
  } else {
    r(3, 7, 5, 35, '#ff7ab8'); r(20, 7, 5, 35, '#ff7ab8'); r(5, 7, 1, 35, '#d95a98'); r(22, 7, 1, 35, '#d95a98');
    r(3, 7, 1, 35, '#ffb0d0'); r(20, 7, 1, 35, '#ffb0d0');
    r(10, 12, 8, 22, '#cfeeff'); r(10, 12, 8, 1, '#ffffff'); r(12, 15, 1, 6, '#ffffff');
    r(9, 11, 10, 1, '#f2c94c'); r(9, 34, 10, 1, '#f2c94c');
  }
});

const mannequin = () => canvasFor(14, 36, (r) => {
  r(4, 0, 6, 7, '#f2d6a0'); r(4, 0, 2, 2, '#fff0cc'); r(5, 7, 4, 2, '#e0c088');
  r(1, 9, 12, 4, '#ff9ac8'); r(2, 13, 10, 8, '#ff9ac8'); r(1, 21, 12, 3, '#ff9ac8');
  r(1, 9, 12, 1, '#ffd0e4'); r(11, 10, 2, 13, '#d97aa5'); r(5, 12, 4, 1, '#ffffff');
  r(6, 24, 2, 9, '#8f96b0'); r(2, 33, 10, 3, '#5a5068');
});

const podium = (lit) => canvasFor(46, 9, (r) => {
  r(0, 0, 46, 9, '#b47cf2'); r(0, 0, 46, 2, '#e2ccff'); r(0, 7, 46, 2, '#8a52cc');
  for (let x = 3; x < 46; x += 8) r(x, 4, 2, 2, lit ? '#ffffff' : '#ffd84a');
  if (lit) for (let x = 7; x < 46; x += 8) r(x, 4, 2, 2, '#fff07a');
});

const shopMirror = () => canvasFor(16, 38, (r) => {
  r(1, 0, 14, 32, '#f2c94c'); r(1, 0, 14, 1, '#fff07a'); r(13, 0, 2, 32, '#c99a2e');
  r(3, 2, 10, 28, '#cfeeff'); r(3, 2, 10, 1, '#ffffff'); r(5, 5, 1, 9, '#ffffff'); r(7, 5, 1, 5, '#ffffff');
  r(3, 32, 2, 6, '#c99a2e'); r(11, 32, 2, 6, '#c99a2e'); r(0, 36, 16, 2, '#c99a2e');
});

// ---------------------------------------------------------------- магазин игрушек
const toyStand = () => canvasFor(38, 42, (r) => {
  r(0, 0, 38, 42, '#5ac4f2'); r(0, 0, 38, 2, '#bfe6ff'); r(36, 0, 2, 42, '#3a8fc0'); r(2, 2, 34, 38, '#eaf6ff');
  for (const y of [13, 26, 38]) { r(2, y, 34, 2, '#3a8fc0'); r(2, y, 34, 1, '#5ac4f2'); }
  // мишка, мяч, пирамидка
  r(5, 6, 6, 7, '#c98a52'); r(4, 4, 2, 2, '#c98a52'); r(10, 4, 2, 2, '#c98a52'); r(6, 5, 4, 3, '#e0a971'); r(7, 9, 2, 2, '#f2d6a0');
  disc(r, 19, 9, 3, '#ef5a6f'); r(17, 8, 5, 1, '#ffffff'); r(18, 7, 1, 1, '#ffffff');
  r(27, 11, 8, 2, '#ef5a6f'); r(28, 9, 6, 2, '#ffd84a'); r(29, 7, 4, 2, '#7ad98a'); r(30, 5, 2, 2, '#5a7fd9');
  // машинка, уточка, кубики
  r(4, 20, 10, 4, '#ef5a6f'); r(6, 18, 5, 2, '#bfe6ff'); disc(r, 6, 24, 1, '#3a3040'); disc(r, 12, 24, 1, '#3a3040');
  r(18, 20, 6, 5, '#ffd84a'); r(21, 17, 4, 4, '#ffd84a'); r(25, 19, 2, 1, '#f2955a'); r(23, 18, 1, 1, '#2b1d2e');
  r(28, 22, 4, 4, '#7ad98a'); r(32, 22, 3, 4, '#b47cf2'); r(30, 18, 4, 4, '#ff9ac8');
  // ракета, кукла, барабан
  r(6, 29, 4, 8, '#ffffff'); r(7, 28, 2, 1, '#ef5a6f'); r(5, 35, 1, 3, '#ef5a6f'); r(10, 35, 1, 3, '#ef5a6f'); r(7, 31, 2, 2, '#5ac4f2');
  r(17, 29, 4, 3, '#f6d3b8'); r(16, 28, 6, 2, '#6b3f2a'); r(16, 32, 6, 6, '#ff7ab8');
  r(27, 31, 8, 7, '#ef5a6f'); r(27, 31, 8, 1, '#ffffff'); r(27, 37, 8, 1, '#ffffff'); r(29, 33, 1, 3, '#ffd84a'); r(32, 33, 1, 3, '#ffd84a');
  r(0, 40, 38, 2, '#3a8fc0');
});

/** Автомат-хваталка; alt — второй кадр мигающей вывески. */
const clawMachine = (alt) => canvasFor(26, 44, (r) => {
  r(0, 0, 26, 44, '#ef5a6f'); r(0, 0, 26, 1, '#ff9aa8'); r(24, 0, 2, 44, '#b8342c');
  r(2, 1, 22, 4, '#ffd84a'); for (let x = alt ? 6 : 4; x < 23; x += 4) r(x, 2, 2, 2, '#ef5a6f');
  r(2, 6, 22, 22, '#cfeeff'); r(2, 6, 22, 1, '#8f96b0'); r(4, 8, 1, 8, '#ffffff');
  r(3, 22, 20, 6, '#ffd0e4'); // горка игрушек
  disc(r, 7, 22, 3, '#c98a52'); disc(r, 14, 23, 3, '#7ad98a'); disc(r, 20, 22, 3, '#b47cf2');
  for (const x of [6, 8, 19, 21]) r(x, 21, 1, 1, '#2b1d2e');
  r(13, 22, 1, 1, '#2b1d2e'); r(15, 22, 1, 1, '#2b1d2e');
  r(2, 28, 22, 2, '#b8342c');
  r(4, 32, 3, 3, '#3a3040'); r(5, 30, 1, 2, '#8f96b0'); r(4, 29, 3, 2, '#ffd84a'); // рычаг
  r(10, 32, 3, 2, '#5cf27a');
  r(15, 31, 8, 9, '#3a3040'); r(16, 32, 6, 7, '#5a3a4a'); // лоток
});

const gumball = () => canvasFor(16, 32, (r) => {
  disc(r, 8, 8, 7, '#cfeeff');
  const cols = ['#ef5a6f', '#ffd84a', '#7ad98a', '#5a7fd9', '#b47cf2', '#ff9ac8'];
  [[3, 8], [6, 9], [9, 8], [12, 9], [4, 11], [7, 12], [10, 11], [5, 5], [8, 5], [11, 6], [7, 2]].forEach(([x, y], i) => r(x, y, 2, 2, cols[i % cols.length]));
  r(4, 3, 1, 3, '#ffffff');
  r(5, 15, 6, 2, '#b8342c');
  r(2, 17, 12, 10, '#ef5a6f'); r(2, 17, 12, 1, '#ff9aa8'); r(12, 17, 2, 10, '#b8342c');
  r(7, 19, 2, 3, '#3a3040'); r(6, 23, 4, 1, '#d8dcec'); r(5, 25, 6, 2, '#3a3040');
  r(1, 27, 14, 3, '#b8342c'); r(3, 30, 2, 2, '#5a5068'); r(11, 30, 2, 2, '#5a5068');
});

const giftWrap = () => canvasFor(36, 24, (r) => {
  r(0, 8, 36, 4, '#e0a971'); r(0, 8, 36, 1, '#f6d6a0'); r(0, 11, 36, 1, '#a8693c');
  r(2, 12, 3, 12, '#c98a52'); r(31, 12, 3, 12, '#c98a52');
  r(5, 12, 26, 5, '#ffd0e4'); for (let x = 7; x < 30; x += 4) r(x, 13, 2, 3, '#ff7ab8');
  r(3, 2, 3, 6, '#5ac4f2'); r(3, 2, 3, 1, '#bfe6ff'); r(7, 0, 3, 8, '#ffd84a'); r(7, 0, 3, 1, '#fff4a8'); r(11, 3, 3, 5, '#7ad98a'); // рулоны бумаги
  disc(r, 30, 5, 2, '#ef5a6f'); r(30, 5, 1, 1, '#ffffff'); r(24, 7, 6, 1, '#ef5a6f'); // катушка ленты
});

/** Значок города для карты и табло. */
const cityIcon = () => canvasFor(12, 10, (r) => {
  r(2, 3, 3, 6, '#5a7fd9'); r(3, 4, 1, 1, '#fff07a'); r(3, 6, 1, 1, '#fff07a');
  r(5, 1, 3, 8, '#ff9ac8'); r(6, 2, 1, 1, '#ffffff'); r(6, 4, 1, 1, '#ffffff'); r(6, 6, 1, 1, '#ffffff');
  r(8, 5, 2, 4, '#7ad9b5'); r(8, 6, 1, 1, '#ffffff');
});
/** Открытка из города: дома и светофор, строчки и марка. */
const postcard = () => canvasFor(18, 12, (r) => {
  r(0, 0, 18, 12, '#fff8e8');
  r(1, 1, 8, 10, '#9fdcff'); r(1, 9, 8, 2, '#b8bccc');
  r(2, 4, 2, 5, '#5a7fd9'); r(4, 2, 3, 7, '#ff9ac8'); r(7, 5, 2, 4, '#7ad9b5'); r(5, 3, 1, 1, '#ffffff'); r(5, 5, 1, 1, '#ffffff');
  r(13, 1, 4, 4, '#5a7fd9'); r(14, 2, 2, 2, '#ffd84a');
  r(10, 6, 7, 1, '#c9b3e0'); r(10, 8, 6, 1, '#c9b3e0'); r(10, 10, 4, 1, '#c9b3e0');
});

export function makeCityArt(scene) {
  const T = scene.textures;
  const add = (key, canvas, icon = true) => {
    if (T.exists(key)) return;
    T.addCanvas(key, canvas);
    if (icon) T.addCanvas(`${key}_icon`, iconFrom(canvas, false));
  };
  add('trafficlight', trafficLight(false));
  add('trafficlight_g', trafficLight(true), false);
  add('icecart', iceCart());
  add('fountain', fountain());
  add('car_0', car('#ef5a6f', '#ff9aa8', '#b8342c'));
  add('car_1', car('#5a7fd9', '#9fb6f2', '#3a55a0'), false);
  add('car_2', car('#7ad98a', '#b8f0c0', '#4a9a5a'), false);
  add('fruitstand', fruitStand());
  add('breadrack', breadRack());
  add('cooler', cooler());
  add('shopcart', shopCart(false));
  add('shopcart_full', shopCart(true), false);
  add('checkout', checkout(false));
  add('checkout_lit', checkout(true), false);
  add('paperbag', paperBag(false));
  add('paperbag_full', paperBag(true), false);
  add('showcase', showcase());
  add('drinkbar', drinkBar());
  add('cafetable', cafeTable());
  add('hatrack', hatRack());
  add('rail', rail());
  add('fitting', fitting(false));
  add('fitting_closed', fitting(true), false);
  add('mannequin', mannequin());
  add('podium', podium(false));
  add('podium_b', podium(true), false);
  add('shopmirror', shopMirror());
  add('toystand', toyStand());
  add('claw', clawMachine(false));
  add('claw_b', clawMachine(true), false);
  add('gumball', gumball());
  add('giftwrap', giftWrap());
  add('place_city', cityIcon(), false);
  add('postcard_city', postcard());
  add('clawhand', plain(['..K..', '..K..', '.KKK.', 'K.K.K', 'K...K'], { K: '#5a5068' }), false);
  add('capsule', plain(['.RRR.', 'RRRRR', 'WWWWW', 'WWWWW', '.WWW.'], { R: '#ef5a6f', W: '#ffffff' }), false);

  const big = (id, subject, beh, order, extra = {}) => ({ id, subject, cat: 'furniture', tags: ['furniture'], tex: id, bbox: [0, 0, 15, 15], order, beh, ...extra });
  // названия подобраны так, чтобы правила behaviorOf() по словам (hat, shelf, window, cabinet…) их не цепляли
  return [
    big('trafficlight', 'traffic signal', { traffic: true }, 70),
    big('icecart', 'ice cream cart', { stock: 'ice' }, 71),
    big('fountain', 'city fountain', { fountain: true }, 72),
    big('fruitstand', 'fruit stand', { stock: 'fruit' }, 73),
    big('breadrack', 'bakery rack', { stock: 'bread' }, 74),
    big('cooler', 'dairy cooler', { stock: 'dairy' }, 75),
    big('shopcart', 'shopping trolley', { trolley: true, container: true, perch: { dy: 9, lo: -3, hi: 1, behind: true } }, 76),
    big('checkout', 'checkout counter', { checkout: true }, 77),
    big('showcase', 'pastry showcase', { stock: 'pastry' }, 78),
    big('drinkbar', 'drink bar', { stock: 'drink' }, 79),
    big('cafetable', 'cafe table', {}, 80),
    big('hatrack', 'headwear stand', { stock: 'hat' }, 81),
    big('rail', 'clothes rail', { stock: 'acc' }, 82),
    big('fitting', 'fitting booth', { fitting: true }, 83),
    big('mannequin', 'shop mannequin', { mannequin: true }, 84, { bbox: [7, -20, 8, 15] }), // bbox — «где голова»: по нему садится шапка
    big('podium', 'fashion podium', { podium: true, perch: { dy: 9, lo: -17, hi: 17, stand: true } }, 85), // stand — на подиуме стоят, а не сидят
    big('shopmirror', 'shop mirror', {}, 86), // зеркало — гардероб, как дома
    big('toystand', 'toy display', { stock: 'toy' }, 87),
    big('claw', 'claw machine', { claw: true }, 88),
    big('gumball', 'capsule machine', { gumball: true }, 89),
    big('giftwrap', 'gift wrapping table', { giftwrap: true }, 90),
    // пакет с покупками появляется у кассы; он «игрушка» — его можно дать кукле в руку и посадить на повозку
    { id: 'paper-bag', subject: 'paper shopping bag', cat: 'toy', tags: ['toy'], tex: 'paperbag', bbox: [0, 0, 15, 15], hidden: true, beh: { bag: true, container: true } },
    { id: 'postcard-city', subject: 'postcard from the city', cat: 'toy', tags: ['toy'], tex: 'postcard_city', bbox: [0, 0, 15, 15], hidden: true, beh: { postcard: 'city' } },
  ];
}
