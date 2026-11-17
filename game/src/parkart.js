// Парк развлечений: рисунки и записи каталога (стиль — как в villageart.js, cityart.js и seaart.js).
// Поведение предмета задаёт поле beh: оно дописывается к правилам behaviorOf() в main.js.
import { canvasFor, iconFrom } from './furniture.js';

const disc = (r, cx, cy, rad, col) => {
  for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) if (x * x + y * y <= rad * rad + 1) r(cx + x, cy + y, 1, 1, col);
};
const oval = (r, cx, cy, rx, ry, col) => {
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x / rx) ** 2 + (y / ry) ** 2 <= 1) r(cx + x, cy + y, 1, 1, col);
};

// ---------------------------------------------------------------- зоопарк
/** Бамбуковая роща (peek — из неё выглядывает панда). */
const bamboo = (peek) => canvasFor(30, 44, (r) => {
  const stalk = (x, top, col, hi) => {
    r(x, top, 3, 44 - top, col); r(x, top, 1, 44 - top, hi);
    for (let y = top + 6; y < 44; y += 8) r(x, y, 3, 1, '#3f8f33');
  };
  stalk(3, 6, '#6cc04a', '#a0e070'); stalk(9, 0, '#4fa83d', '#7fd060'); stalk(15, 4, '#6cc04a', '#a0e070'); stalk(21, 1, '#4fa83d', '#7fd060'); stalk(26, 8, '#6cc04a', '#a0e070');
  for (const [x, y, d] of [[5, 9, 1], [11, 4, 1], [17, 8, 1], [23, 5, 1], [0, 14, -1], [12, 16, -1], [18, 20, 1], [6, 26, -1], [24, 18, 1], [0, 30, 1], [23, 32, -1]]) {
    r(x, y, 4, 1, '#3f8f33'); r(x + d, y + 1, 3, 1, '#5fb84a');
  }
  if (peek) {
    oval(r, 15, 28, 6, 5, '#ffffff');
    r(9, 22, 3, 3, '#2b1d2e'); r(19, 22, 3, 3, '#2b1d2e'); // уши
    r(11, 26, 3, 3, '#2b1d2e'); r(17, 26, 3, 3, '#2b1d2e'); r(12, 27, 1, 1, '#ffffff'); r(18, 27, 1, 1, '#ffffff'); // глаза
    r(14, 30, 3, 1, '#2b1d2e');
  }
  r(0, 42, 30, 2, '#4fa83d');
});

/** Ледяная скала с прорубью (splash — кто-то выныривает). */
const icePool = (splash) => canvasFor(38, 24, (r) => {
  r(1, 8, 22, 14, '#e6f6ff'); r(3, 5, 16, 3, '#f4fbff'); r(7, 2, 8, 3, '#ffffff');
  r(19, 8, 4, 14, '#bfe0f2'); r(1, 20, 22, 2, '#bfe0f2'); r(4, 10, 1, 4, '#ffffff'); r(13, 6, 3, 1, '#bfe0f2');
  r(8, 13, 8, 9, '#6aa8d0'); r(9, 12, 6, 1, '#6aa8d0'); r(8, 13, 1, 9, '#4f8fbc'); // вход в пещеру
  oval(r, 27, 20, 10, 3, '#e6f6ff'); oval(r, 27, 20, 8, 2, '#3a9bd9'); r(23, 19, 5, 1, '#8fd6f7'); // прорубь в льдине
  if (splash) {
    r(26, 6, 2, 9, '#ffffff'); r(22, 9, 2, 6, '#dff4ff'); r(30, 9, 2, 6, '#dff4ff'); r(19, 13, 1, 3, '#dff4ff'); r(34, 13, 1, 3, '#dff4ff');
    r(24, 3, 1, 2, '#dff4ff'); r(29, 4, 1, 2, '#dff4ff');
  }
});

/** Слон смотрит вправо (up — хобот поднят: трубит и брызгает). На спине — попона: туда садятся. */
const elephant = (up) => canvasFor(48, 34, (r) => {
  r(3, 13, 2, 8, '#8d9ab8'); r(2, 20, 2, 3, '#5a5068'); // хвост
  oval(r, 20, 17, 15, 10, '#a8b4cc');
  r(8, 23, 6, 11, '#94a0ba'); r(27, 23, 6, 11, '#94a0ba'); // дальние ноги
  r(13, 25, 6, 9, '#a8b4cc'); r(22, 25, 6, 9, '#a8b4cc');
  for (const x of [8, 13, 22, 27]) r(x, 33, 6, 1, '#e6eaf4');
  r(8, 12, 22, 1, '#bcc6da');
  disc(r, 35, 14, 8, '#a8b4cc');
  oval(r, 29, 14, 5, 8, '#8d9ab8'); oval(r, 29, 14, 3, 6, '#d8b8cc'); // ухо
  r(38, 12, 2, 2, '#2b1d2e'); r(38, 12, 1, 1, '#ffffff');
  r(39, 20, 4, 1, '#ffffff'); // бивень
  if (up) {
    for (let i = 0; i < 9; i++) r(41 + Math.round(i * 0.5), 17 - i * 2, 3, 2, '#a8b4cc');
    r(45, 0, 3, 2, '#8d9ab8');
  } else {
    for (let y = 15; y < 31; y++) r(41 + (y > 26 ? 1 : 0), y, 4 - (y > 23 ? 1 : 0), 1, '#a8b4cc');
    r(42, 31, 4, 1, '#8d9ab8');
    for (let y = 18; y < 30; y += 3) r(41, y, 3, 1, '#94a0ba');
  }
  r(12, 6, 15, 5, '#ef5a6f'); r(12, 6, 15, 1, '#ff9aa8'); r(12, 10, 15, 1, '#ffd84a'); // попона
  for (let x = 13; x < 27; x += 3) r(x, 11, 1, 2, '#ffd84a');
  r(18, 7, 3, 3, '#ffd84a');
});

/** Дерево с обезьянкой на ветке (wave — машет бананом). */
const monkeyTree = (wave) => canvasFor(34, 46, (r) => {
  r(14, 18, 6, 28, '#a8693c'); r(14, 18, 2, 28, '#c98a52'); r(19, 18, 1, 28, '#7a4a32'); r(11, 44, 12, 2, '#7a4a32');
  r(19, 24, 14, 2, '#a8693c'); r(19, 24, 14, 1, '#c98a52');
  disc(r, 17, 11, 10, '#4fa83d'); disc(r, 8, 14, 7, '#5fb84a'); disc(r, 26, 9, 6, '#3f8f33'); disc(r, 17, 6, 6, '#6cc04a');
  r(5, 15, 3, 2, '#ffd84a'); r(15, 4, 3, 2, '#ffd84a'); r(10, 9, 3, 2, '#ffd84a'); r(21, 5, 3, 2, '#ffd84a'); // бананы
  // обезьянка
  r(24, 24, 1, 7, '#8d5a3b'); r(22, 30, 2, 1, '#8d5a3b'); // хвост
  r(25, 17, 6, 7, '#8d5a3b'); r(27, 19, 2, 4, '#c98c62');
  disc(r, 28, 14, 3, '#8d5a3b'); r(27, 13, 3, 3, '#e8b48f'); r(24, 13, 1, 2, '#e8b48f'); r(32, 13, 1, 2, '#e8b48f');
  r(27, 13, 1, 1, '#2b1d2e'); r(29, 13, 1, 1, '#2b1d2e'); r(27, 15, 3, 1, '#b86a52');
  r(24, 19, 1, 4, '#8d5a3b');
  if (wave) { r(31, 10, 1, 8, '#8d5a3b'); r(31, 7, 2, 3, '#ffd84a'); r(32, 6, 1, 1, '#fff4a8'); } else r(31, 19, 1, 4, '#8d5a3b');
});

// ---------------------------------------------------------------- аквапарк
/** Горка: слева башня с лесенкой, от неё вправо вниз — жёлоб. Форму жёлоба знает и SLIDE_PATH. */
const slideY = (cx) => 12 + (cx - 18) * 1.2 + Math.sin((cx - 18) / 5) * 2;
export const SLIDE = { w: 48, h: 50, x0: 18, x1: 46, y: slideY };
const slide = () => canvasFor(48, 50, (r) => {
  r(4, 10, 2, 40, '#8f96b0'); r(16, 10, 2, 40, '#8f96b0'); r(4, 10, 1, 40, '#d8dcec');
  for (let y = 17; y < 48; y += 5) r(6, y, 10, 1, '#b8bccc');
  r(30, 30, 2, 20, '#8f96b0'); r(40, 42, 2, 8, '#8f96b0');
  for (let x = 18; x <= 46; x++) {
    const y = Math.round(slideY(x));
    r(x, y, 1, 6, '#5ac4f2'); r(x, y, 1, 1, '#dff4ff'); r(x, y + 1, 1, 2, '#9fe4f7'); r(x, y + 5, 1, 1, '#2f86c4');
  }
  r(2, 10, 18, 3, '#ef5a6f'); r(2, 10, 18, 1, '#ff9aa8');
  r(3, 4, 1, 6, '#8f96b0'); r(18, 4, 1, 6, '#8f96b0');
  r(1, 2, 20, 3, '#ffd84a'); r(4, 0, 14, 2, '#ffe98a'); r(1, 4, 20, 1, '#e0a020');
});

/** Башня с опрокидывающимся ведром (tilt — ведро вылилось). */
const tipBucket = (tilt) => canvasFor(28, 48, (r) => {
  r(4, 8, 2, 40, '#8f96b0'); r(22, 8, 2, 40, '#8f96b0'); r(4, 8, 1, 40, '#d8dcec'); r(22, 8, 1, 40, '#d8dcec');
  r(2, 8, 24, 2, '#5a7fd9'); r(2, 8, 24, 1, '#8fa8f2');
  r(1, 46, 8, 2, '#5a5068'); r(19, 46, 8, 2, '#5a5068');
  r(13, 0, 2, 8, '#b8bccc'); r(11, 0, 6, 2, '#8f96b0');
  if (tilt) {
    for (let i = 0; i < 13; i++) { const off = Math.floor((12 - i) / 5); r(7 + off, 12 + i, 14 - off * 2, 1, '#ef5a6f'); }
    r(6, 24, 16, 2, '#ff9aa8'); r(8, 17, 12, 2, '#ffffff');
    r(8, 26, 12, 20, '#8fd6f7'); r(10, 26, 2, 20, '#dff4ff'); r(16, 28, 1, 17, '#dff4ff'); r(4, 44, 20, 2, '#dff4ff');
  } else {
    for (let i = 0; i < 14; i++) { const off = Math.floor(i / 5); r(7 + off, 12 + i, 14 - off * 2, 1, '#ef5a6f'); }
    r(6, 11, 16, 2, '#ff9aa8'); r(8, 12, 12, 1, '#8fd6f7'); r(8, 18, 12, 2, '#ffffff');
    r(14, 9, 1, 2, '#8fd6f7'); // капает из трубы
  }
  r(4, 17, 3, 3, '#ffd84a'); r(21, 17, 3, 3, '#ffd84a');
});

/** Площадка-фонтанчик в плитке. */
const geyser = () => canvasFor(24, 6, (r) => {
  oval(r, 12, 3, 11, 2, '#5a7fd9'); r(4, 2, 16, 1, '#8fa8f2');
  for (const x of [6, 10, 14, 18]) r(x, 3, 1, 1, '#2b1d2e');
});
const geyserJet = () => canvasFor(6, 26, (r) => {
  r(1, 2, 4, 24, '#8fd6f7'); r(2, 1, 2, 25, '#dff4ff'); r(0, 0, 6, 2, '#ffffff'); r(0, 3, 1, 2, '#dff4ff'); r(5, 4, 1, 2, '#dff4ff');
});

/** Надувной плот-ватрушка: кукла сидит внутри. */
const raft = () => canvasFor(32, 11, (r) => {
  oval(r, 16, 5, 15, 5, '#ffd84a'); oval(r, 16, 4, 10, 2, '#e0a020');
  r(5, 2, 22, 1, '#fff4a8'); r(3, 8, 26, 1, '#e0a020');
  r(8, 7, 3, 2, '#ef5a6f'); r(21, 7, 3, 2, '#ef5a6f'); r(2, 4, 2, 2, '#ef5a6f'); r(28, 4, 2, 2, '#ef5a6f');
});

// ---------------------------------------------------------------- аттракционы
/** Карусель: крыша, столб и помост (alt — полоски на столбе сдвинуты: «крутится»). Лошадки — отдельные картинки. */
const carousel = (alt, roofOnly = false) => canvasFor(54, 58, (r) => {
  r(26, 0, 1, 5, '#8d5a3b'); r(27, 0, 5, 3, '#5ac4f2');
  for (let i = 0; i < 10; i++) {
    const hw = Math.round(5 + i * 2.4);
    for (let s = -hw; s < hw; s++) r(27 + s, 4 + i, 1, 1, Math.floor((s + 60 + (alt ? 3 : 0)) / 6) % 2 ? '#ef5a6f' : '#fff4a8');
  }
  r(0, 14, 54, 2, '#ffd84a');
  for (let x = 1; x < 54; x += 6) r(x, 16, 4, 1, '#ffd84a');
  if (roofOnly) return; // крыша ещё раз рисуется поверх седоков: головы кукол уходят под неё
  r(24, 16, 6, 36, '#ffd0e4'); r(24, 16, 1, 36, '#ffffff');
  for (let y = 18 + (alt ? 3 : 0); y < 50; y += 6) r(24, y, 6, 2, '#ff7ab8');
  r(1, 52, 52, 4, '#5a7fd9'); r(1, 52, 52, 1, '#8fa8f2'); r(3, 56, 48, 2, '#3a5fb0');
  for (let x = 3 + (alt ? 2 : 0); x < 52; x += 4) r(x, 54, 1, 1, '#fff07a');
});

/** Лошадка карусели на золотом шесте. */
const caroHorse = (col, mane) => canvasFor(14, 34, (r) => {
  r(7, 0, 1, 23, '#f2c94c');
  r(1, 23, 1, 5, mane);
  r(2, 24, 10, 5, col); r(10, 19, 3, 6, col); r(11, 18, 4, 3, col); r(11, 17, 1, 1, col);
  r(9, 19, 1, 5, mane); r(13, 19, 1, 1, '#2b1d2e');
  r(3, 29, 2, 4, col); r(9, 29, 2, 4, col); r(3, 33, 2, 1, '#5a3a4a'); r(9, 33, 2, 1, '#5a3a4a');
  r(5, 23, 4, 2, '#ef5a6f'); r(5, 25, 4, 1, '#ffd84a');
});

/** Вагончик-гусеница: три сиденья и голова. */
const coaster = () => canvasFor(46, 16, (r) => {
  for (const x of [5, 15, 26, 36]) r(x, 14, 3, 2, '#3a3040');
  for (const sx of [1, 12, 23]) {
    r(sx, 5, 10, 9, '#6cc04a'); r(sx, 5, 10, 1, '#a0e070'); r(sx, 12, 10, 2, '#4fa83d');
    r(sx + 3, 8, 2, 2, '#ffd84a'); r(sx + 7, 10, 1, 1, '#ffd84a');
  }
  disc(r, 39, 8, 6, '#7fd060');
  r(37, 0, 1, 3, '#3f8f33'); r(41, 0, 1, 3, '#3f8f33'); r(36, 0, 2, 1, '#ffd84a'); r(41, 0, 2, 1, '#ffd84a');
  r(41, 6, 2, 2, '#ffffff'); r(42, 7, 1, 1, '#2b1d2e'); r(41, 11, 3, 1, '#2b1d2e'); r(38, 10, 2, 1, '#ff9ac8');
});

/** Силомер: столб со шкалой и колокол наверху (lit — колокол звенит). Шайба — отдельная картинка. */
const hammer = (lit) => canvasFor(18, 52, (r) => {
  r(1, 46, 16, 6, '#ef5a6f'); r(1, 46, 16, 1, '#ff9aa8'); r(11, 44, 6, 2, '#3a3040');
  r(5, 7, 8, 39, '#fff4a8'); r(5, 7, 1, 39, '#ffffff'); r(12, 7, 1, 39, '#e0c060');
  r(10, 34, 2, 10, '#7ad98a'); r(10, 22, 2, 12, '#ffd84a'); r(10, 10, 2, 12, '#ef5a6f');
  for (let y = 10; y < 44; y += 4) r(6, y, 3, 1, '#c9a05a');
  disc(r, 9, 3, 3, lit ? '#ffffff' : '#ffd84a'); r(8, 1, 1, 1, '#fff4a8'); r(8, 6, 3, 1, '#c99a2e');
  if (lit) { r(2, 1, 2, 1, '#fff07a'); r(14, 1, 2, 1, '#fff07a'); r(1, 4, 2, 1, '#fff07a'); r(15, 4, 2, 1, '#fff07a'); r(9, 0, 1, 1, '#fff07a'); }
});
const hammerPuck = () => canvasFor(4, 3, (r) => { r(0, 0, 4, 3, '#ef5a6f'); r(0, 0, 4, 1, '#ff9aa8'); });

/** Ларёк со сладостями: сладкая вата, попкорн. */
const treats = () => canvasFor(36, 42, (r) => {
  r(2, 2, 32, 2, '#b8342c');
  for (let x = 0; x < 36; x += 4) { r(x, 4, 4, 6, (x / 4) % 2 ? '#ffffff' : '#ef5a6f'); r(x, 10, 4, 1, (x / 4) % 2 ? '#ffffff' : '#ef5a6f'); r(x + 1, 11, 2, 1, (x / 4) % 2 ? '#ffffff' : '#ef5a6f'); }
  r(2, 12, 2, 18, '#8d5a3b'); r(32, 12, 2, 18, '#8d5a3b');
  disc(r, 10, 20, 4, '#ff9ac8'); r(8, 18, 2, 1, '#ffd0e4'); r(10, 24, 1, 4, '#ffffff');
  disc(r, 19, 19, 4, '#bfe6ff'); r(17, 17, 2, 1, '#ffffff'); r(19, 23, 1, 5, '#ffffff');
  r(25, 21, 7, 7, '#ffffff'); r(26, 21, 1, 7, '#ef5a6f'); r(29, 21, 1, 7, '#ef5a6f'); r(24, 18, 9, 3, '#fff4a8'); r(26, 17, 2, 1, '#fff4a8'); r(30, 17, 2, 1, '#fff4a8');
  r(1, 28, 34, 14, '#ffd84a'); r(1, 28, 34, 2, '#fff4a8'); r(1, 40, 34, 2, '#e0a020');
  r(16, 33, 4, 4, '#ef5a6f'); r(15, 34, 6, 2, '#ef5a6f'); r(6, 33, 2, 4, '#ff9ac8'); r(28, 33, 2, 4, '#5ac4f2');
});

// ---------------------------------------------------------------- спортплощадка
/** Ворота с сеткой (hit — мяч в сетке). */
const goal = (hit, solid = false) => canvasFor(38, 30, (r) => {
  const d = hit ? 2 : 0;
  r(4, 4, 30, 26, solid ? '#dfe6f2' : 'rgba(255,255,255,0.4)'); // сетка полупрозрачная: сплошная заливка не даёт контуру обвести каждую ячейку (для значка — непрозрачная)
  for (let x = 5 + d; x < 34; x += 4) r(x, 4, 1, 26, '#ffffff');
  for (let y = 6 + d; y < 30; y += 4) r(4, y, 30, 1, '#ffffff');
  r(2, 2, 34, 2, '#ffffff'); r(2, 2, 2, 28, '#ffffff'); r(34, 2, 2, 28, '#ffffff'); r(3, 4, 1, 26, '#b8bccc'); r(35, 4, 1, 26, '#b8bccc');
  if (hit) { disc(r, 19, 20, 4, '#ffffff'); r(18, 19, 2, 2, '#2b1d2e'); r(15, 21, 1, 2, '#2b1d2e'); r(22, 17, 1, 2, '#2b1d2e'); }
});

/** Кольцо на стойке (вид сбоку: щит слева, кольцо с сеткой смотрит вправо). */
const hoop = () => canvasFor(22, 50, (r) => {
  r(3, 16, 3, 34, '#8f96b0'); r(3, 16, 1, 34, '#d8dcec'); r(0, 48, 10, 2, '#5a5068');
  r(5, 2, 3, 18, '#ffffff'); r(5, 2, 3, 1, '#d8dcec'); r(7, 2, 1, 18, '#b8bccc'); r(6, 9, 1, 6, '#ef5a6f');
  r(8, 14, 12, 2, '#ef7a3a'); r(8, 14, 12, 1, '#ffa868');
  for (let i = 0; i < 6; i++) { const off = Math.floor(i / 2); r(9 + off, 16 + i, 10 - off * 2, 1, i % 2 ? '#d8dcec' : '#ffffff'); }
});
export const HOOP = { dx: 3, dy: 35 }; // кольцо: смещение от середины рисунка и высота над его низом

const trampoline = () => canvasFor(36, 12, (r) => {
  r(4, 6, 2, 6, '#8f96b0'); r(30, 6, 2, 6, '#8f96b0'); r(17, 7, 2, 5, '#8f96b0');
  oval(r, 18, 4, 17, 4, '#ef5a6f'); oval(r, 18, 4, 14, 2, '#3a5fb0'); r(8, 3, 14, 1, '#5a7fd9');
  for (const x of [3, 9, 26, 32]) r(x, 6, 1, 1, '#ffffff');
});

/** Пьедестал: первое место посередине, второе слева, третье справа. */
export const PEDESTAL = [{ lo: -23, hi: -9, dy: 12 }, { lo: -8, hi: 8, dy: 18 }, { lo: 9, hi: 23, dy: 8 }];
const pedestal = () => canvasFor(46, 18, (r) => {
  r(15, 0, 16, 18, '#ffd84a'); r(15, 0, 16, 1, '#fff4a8'); r(29, 1, 2, 17, '#e0a020');
  r(0, 6, 15, 12, '#d8dcec'); r(0, 6, 15, 1, '#ffffff'); r(0, 16, 15, 2, '#b8bccc');
  r(31, 10, 15, 8, '#e0a971'); r(31, 10, 15, 1, '#f2c79a'); r(44, 11, 2, 7, '#c98a52');
  r(22, 5, 2, 8, '#b8862e'); r(21, 6, 1, 1, '#b8862e'); r(21, 13, 4, 1, '#b8862e');
  for (const [x, y, w] of [[5, 10, 4], [8, 11, 1], [5, 12, 4], [5, 13, 1], [5, 14, 4]]) r(x, y, w, 1, '#8f96b0');
  for (const [x, y, w] of [[36, 12, 4], [39, 13, 1], [37, 14, 3], [39, 15, 1], [36, 16, 4]]) r(x, y, w, 1, '#a8693c');
});

/** Значок парка для карты и табло: колесо обозрения. */
const parkIcon = () => canvasFor(12, 10, (r) => {
  r(1, 0, 10, 7, '#9fdcff'); r(1, 7, 10, 2, '#e8c9a0');
  r(5, 0, 3, 1, '#ef5a6f'); r(4, 1, 1, 1, '#ef5a6f'); r(8, 1, 1, 1, '#ef5a6f'); r(3, 2, 1, 3, '#ffd84a'); r(9, 2, 1, 3, '#ffd84a');
  r(4, 5, 1, 1, '#5ac4f2'); r(8, 5, 1, 1, '#5ac4f2'); r(5, 6, 3, 1, '#5ac4f2');
  r(6, 3, 1, 1, '#ffffff'); r(5, 6, 1, 3, '#8f96b0'); r(7, 6, 1, 3, '#8f96b0');
});
const postcard = () => canvasFor(18, 12, (r) => {
  r(0, 0, 18, 12, '#fff8e8');
  r(1, 1, 8, 6, '#9fdcff'); r(1, 7, 8, 4, '#9ad873');
  r(3, 5, 4, 3, '#a8b4cc'); r(7, 5, 2, 2, '#a8b4cc'); r(8, 7, 1, 2, '#a8b4cc'); r(3, 8, 1, 2, '#94a0ba'); r(6, 8, 1, 2, '#94a0ba');
  r(2, 2, 2, 2, '#ef5a6f'); r(3, 4, 1, 1, '#8f96b0');
  r(13, 1, 4, 4, '#ef5a6f'); r(14, 2, 2, 2, '#ffffff');
  r(10, 6, 7, 1, '#c9b3e0'); r(10, 8, 6, 1, '#c9b3e0'); r(10, 10, 4, 1, '#c9b3e0');
});

/** На чём катаются по спортплощадке (предметы каталога): кукла встаёт сверху, тап — поехали. */
export const WHEELS = ['skateboard', 'kick scooter', 'bicycle'];

export function makeParkArt(scene) {
  const T = scene.textures;
  const add = (key, canvas, icon = true) => {
    if (T.exists(key)) return;
    T.addCanvas(key, canvas);
    if (icon) T.addCanvas(`${key}_icon`, iconFrom(canvas, false));
  };
  add('bamboo', bamboo(false));
  add('bamboo_b', bamboo(true), false);
  add('icepool', icePool(false));
  add('icepool_b', icePool(true), false);
  add('elephant', elephant(false));
  add('elephant_b', elephant(true), false);
  add('monkeytree', monkeyTree(false));
  add('monkeytree_b', monkeyTree(true), false);
  add('slide', slide());
  add('tipbucket', tipBucket(false));
  add('tipbucket_b', tipBucket(true), false);
  add('geyser', geyser());
  add('geyser_jet', geyserJet(), false);
  add('raft', raft());
  add('carousel', carousel(false));
  add('carousel_b', carousel(true), false);
  add('carousel_roof', carousel(false, true), false);
  add('carousel_b_roof', carousel(true, true), false);
  [['#ffffff', '#ff9ac8'], ['#ffd0e4', '#c48ff2'], ['#bfe6ff', '#ffd84a']].forEach(([c, m], i) => add(`carohorse_${i}`, caroHorse(c, m), false));
  add('coaster', coaster());
  add('hammer', hammer(false));
  add('hammer_b', hammer(true), false);
  add('hammer_puck', hammerPuck(), false);
  add('treats', treats());
  add('goal', goal(false), false);
  if (!T.exists('goal_icon')) T.addCanvas('goal_icon', iconFrom(goal(false, true), false));
  add('goal_b', goal(true), false);
  add('hoop', hoop());
  add('trampoline', trampoline());
  add('pedestal', pedestal());
  add('place_park', parkIcon(), false);
  add('postcard_park', postcard());

  // скейт, самокат и велосипед из каталога: на них можно встать и прокатиться (и дома тоже)
  for (const sub of WHEELS) {
    const rec = scene.items?.find((x) => x.subject === sub);
    if (rec) rec.beh = { wheels: true, perch: { dy: sub === 'bicycle' ? 7 : 4, lo: -2, hi: 2, stand: sub !== 'bicycle' } };
  }

  const big = (id, subject, beh, order, extra = {}) => ({ id, subject, cat: 'furniture', tags: ['furniture'], tex: id, bbox: [0, 0, 15, 15], order, beh, ...extra });
  // названия подобраны так, чтобы правила behaviorOf() по словам (chest, basket, lamp, bed, hat…) их не цепляли
  return [
    big('bamboo', 'bamboo grove', { bamboo: true }, 120),
    big('icepool', 'penguin ice rock', { icepool: true }, 121),
    big('elephant', 'zoo elephant', { elephant: true, perch: { dy: 19, lo: -10, hi: 4 } }, 122),
    big('monkeytree', 'monkey jungle tree', { monkey: true, hatter: true }, 123, { bbox: [18, -21, 19, 15] }), // bbox — «где голова обезьянки»: по нему садится шапка
    big('slide', 'water slide', { slide: true }, 124),
    big('tipbucket', 'tipping water tower', { tipbucket: true }, 125),
    big('geyser', 'splash pad', { geyser: true, flat: true }, 126),
    big('raft', 'tube raft', { raft: true, perch: { dy: 3, lo: -6, hi: 6, behind: true } }, 127),
    big('carousel', 'merry-go-round', { carousel: true, perch: { dy: 16, lo: -19, hi: 19 } }, 128),
    big('coaster', 'caterpillar coaster', { coaster: true, perch: { dy: 7, lo: -17, hi: 8, behind: true } }, 129),
    big('hammer', 'strength tester', { hammer: true }, 130),
    big('treats', 'fairground treat stand', { treats: true }, 131),
    big('goal', 'soccer goal', { goal: true }, 132),
    big('hoop', 'ball hoop', { hoop: true }, 133),
    big('trampoline', 'trampoline', { trampoline: true, perch: { dy: 8, lo: -10, hi: 10, stand: true } }, 134),
    big('pedestal', 'winners pedestal', { pedestal: true, perch: { dy: 18, lo: -22, hi: 22, stand: true } }, 135),
    { id: 'postcard-park', subject: 'postcard from the park', cat: 'toy', tags: ['toy'], tex: 'postcard_park', bbox: [0, 0, 15, 15], hidden: true, beh: { postcard: 'park' } },
  ];
}
