// Центр — шестая локация: рисунки и записи каталога (стиль — как в parkart.js).
// Поведение предмета задаёт поле beh: оно дописывается к правилам behaviorOf() в core.js.
import { canvasFor, iconFrom } from './furniture.js';

const disc = (r, cx, cy, rad, col) => {
  for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) if (x * x + y * y <= rad * rad + 1) r(cx + x, cy + y, 1, 1, col);
};

// ---------------------------------------------------------------- вокзал
/** Паровозик с вагончиком, мордой влево (steam — из трубы валит пар). Стоит у платформы: не предмет. */
const train = (steam) => canvasFor(96, 36, (r) => {
  // паровоз
  r(2, 14, 30, 14, '#ef5a6f'); r(2, 14, 30, 1, '#ff8a9a'); r(2, 26, 30, 2, '#b8342c'); // котёл
  r(6, 8, 6, 6, '#3a3040'); r(5, 6, 8, 2, '#5a5068'); // труба
  r(16, 10, 4, 4, '#ffd84a'); r(17, 9, 2, 1, '#ffd84a'); // колокол
  r(26, 4, 16, 24, '#5a7fd9'); r(26, 4, 16, 1, '#8fa8f2'); r(24, 2, 20, 3, '#3a3040'); // кабина
  r(29, 8, 10, 8, '#bfe6ff'); r(30, 9, 3, 2, '#ffffff'); r(33, 8, 1, 8, '#5a7fd9');
  r(0, 22, 4, 6, '#3a3040'); for (let i = 0; i < 4; i++) r(-1 + i, 28 - i, 1, 1, '#8f96b0'); // скотосбрасыватель
  r(1, 18, 2, 3, '#fff4a8'); // фонарь
  // вагончик
  r(46, 6, 48, 22, '#7ad98a'); r(46, 6, 48, 1, '#b8ffc8'); r(44, 3, 52, 3, '#52b893'); r(46, 26, 48, 2, '#3f9a6a');
  for (const x of [49, 61, 73, 85]) { r(x, 10, 8, 8, '#bfe6ff'); r(x + 1, 11, 2, 2, '#ffffff'); }
  r(44, 22, 2, 2, '#5a5068'); // сцепка
  // колёса
  for (const x of [8, 20, 34, 52, 64, 78, 88]) { disc(r, x, 30, 4, '#3a3040'); disc(r, x, 30, 2, '#8f96b0'); r(x, 30, 1, 1, '#3a3040'); }
  r(6, 29, 30, 1, '#b8bccc');
  if (steam) {
    disc(r, 9, 3, 3, '#ffffff'); disc(r, 4, 1, 2, '#f4f6fb'); disc(r, 14, 0, 2, '#f4f6fb');
  }
});
/** Маленький поезд для дороги (экран между локациями) и значка-подсказки. */
const trainSmall = () => canvasFor(30, 14, (r) => {
  r(1, 5, 11, 6, '#ef5a6f'); r(3, 2, 3, 3, '#3a3040'); r(9, 1, 6, 10, '#5a7fd9'); r(10, 3, 4, 3, '#bfe6ff');
  r(16, 3, 13, 8, '#7ad98a'); r(17, 4, 3, 3, '#bfe6ff'); r(22, 4, 3, 3, '#bfe6ff'); r(16, 2, 13, 1, '#52b893');
  for (const x of [3, 9, 18, 26]) { r(x, 11, 3, 3, '#3a3040'); r(x + 1, 12, 1, 1, '#8f96b0'); }
});
/** Билетный автомат (lit — выдаёт билет). */
const ticketBox = (lit) => canvasFor(20, 32, (r) => {
  r(1, 2, 18, 30, '#5a7fd9'); r(1, 2, 18, 1, '#8fa8f2'); r(17, 2, 2, 30, '#3f5fb0'); r(0, 0, 20, 3, '#3f5fb0');
  r(4, 6, 12, 8, lit ? '#b8ffc8' : '#2b3d6e'); if (lit) { r(6, 8, 8, 1, '#3f9a6a'); r(6, 11, 5, 1, '#3f9a6a'); }
  for (let y = 0; y < 2; y++) for (let x = 0; x < 3; x++) r(5 + x * 4, 17 + y * 3, 2, 2, ['#ffd84a', '#ef5a6f', '#7ad98a'][x]);
  r(5, 25, 10, 2, '#2b1d2e'); if (lit) r(7, 26, 6, 4, '#fff4a8');
});
/** Билет на поезд. */
const ticket = () => canvasFor(12, 8, (r) => {
  r(0, 0, 12, 8, '#fff4a8'); r(0, 0, 12, 1, '#ffffff'); r(8, 0, 1, 8, '#e0c060');
  r(1, 2, 6, 1, '#ef5a6f'); r(1, 4, 5, 1, '#c8a040'); r(1, 6, 3, 1, '#c8a040'); r(9, 3, 2, 2, '#ef5a6f');
});
/** Вокзальные часы на столбе: n — где минутная стрелка (0…3). */
const stationClock = (n) => canvasFor(20, 42, (r) => {
  r(9, 18, 3, 24, '#5a5068'); r(9, 18, 1, 24, '#8f96b0'); r(5, 40, 11, 2, '#3a3040');
  disc(r, 10, 9, 9, '#3a3040'); disc(r, 10, 9, 8, '#ffffff');
  for (const [x, y] of [[10, 2], [17, 9], [10, 16], [3, 9]]) r(x, y, 1, 1, '#3a3040');
  r(10, 9, 1, 1, '#ef5a6f');
  r(10, 6, 1, 4, '#3a3040'); // часовая
  const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][n % 4];
  for (let i = 1; i <= 6; i++) r(10 + dx * i, 9 + dy * i, 1, 1, '#ef5a6f'); // минутная
  r(8, 0, 5, 1, '#ffd84a');
});
/** Тележка для багажа: в неё кладут вещи, на неё садятся; тап — едет. */
const bagCart = () => canvasFor(30, 20, (r) => {
  r(2, 0, 2, 16, '#8f96b0'); r(0, 0, 6, 2, '#5a5068'); // ручка
  r(4, 12, 24, 3, '#b8bccc'); r(4, 12, 24, 1, '#e6e8f0');
  r(8, 4, 9, 8, '#c98a52'); r(8, 4, 9, 1, '#e0a971'); r(11, 3, 3, 1, '#8d5a3b'); // чемодан
  r(18, 6, 8, 6, '#5a7fd9'); r(18, 6, 8, 1, '#8fa8f2'); r(21, 5, 2, 1, '#3f5fb0');
  disc(r, 8, 17, 2, '#3a3040'); disc(r, 24, 17, 2, '#3a3040');
});
/** Чемодан (в него можно складывать вещи). */
const suitcase = () => canvasFor(16, 13, (r) => {
  r(0, 3, 16, 10, '#ef5a6f'); r(0, 3, 16, 1, '#ff8a9a'); r(0, 12, 16, 1, '#b8342c');
  r(5, 0, 6, 1, '#5a5068'); r(5, 0, 1, 3, '#5a5068'); r(10, 0, 1, 3, '#5a5068');
  r(3, 3, 1, 10, '#ffd84a'); r(12, 3, 1, 10, '#ffd84a'); r(6, 6, 3, 2, '#9fdcff'); r(7, 7, 1, 1, '#ffffff');
});

// ---------------------------------------------------------------- школа
/** Парта со скамейкой: кукла садится за неё (позади столешницы). */
const desk = () => canvasFor(26, 22, (r) => {
  r(0, 6, 26, 3, '#c98a52'); r(0, 6, 26, 1, '#e0a971'); r(1, 9, 24, 6, '#a8693c'); // столешница и короб
  r(2, 15, 2, 7, '#8d5a3b'); r(22, 15, 2, 7, '#8d5a3b');
  r(4, 4, 6, 2, '#ffffff'); r(4, 4, 6, 1, '#5ac4f2'); r(15, 3, 1, 3, '#ffd84a'); r(15, 2, 1, 1, '#ef5a6f'); // тетрадь и карандаш
});
/** Школьный звонок на стойке (ring — качается). */
const schoolBell = (ring) => canvasFor(20, 26, (r) => {
  // деревянная рамка-виселица, на перекладине — колокольчик с язычком и красным бантом
  r(2, 2, 2, 24, '#8d5a3b'); r(16, 2, 2, 24, '#8d5a3b'); r(1, 0, 18, 3, '#a8693c'); r(0, 24, 20, 2, '#6e4430');
  const dx = ring ? 2 : 0;
  r(9, 3, 2, 2, '#5a5068');
  r(8 + dx, 5, 4, 2, '#ffd84a'); r(7 + dx, 7, 6, 3, '#f2c94c'); r(6 + dx, 10, 8, 3, '#f2c94c'); r(5 + dx, 13, 10, 2, '#e0a838');
  r(8 + dx, 7, 1, 5, '#fff4a8'); r(9 + dx * 2, 15, 2, 2, '#8d5a3b'); // блик и язычок
  r(7, 3, 2, 2, '#ef5a6f'); r(11, 3, 2, 2, '#ef5a6f');
  if (ring) { r(4, 8, 1, 3, '#ffffff'); r(15, 8, 1, 3, '#ffffff'); r(3, 12, 1, 2, '#ffffff'); r(16, 12, 1, 2, '#ffffff'); }
});
/** Глобус на подставке: k — как повёрнут (0…2). */
const globe = (k) => canvasFor(18, 24, (r) => {
  r(8, 18, 2, 4, '#c98a52'); r(4, 22, 10, 2, '#a8693c');
  for (let i = 0; i < 9; i++) r(1 + Math.round(8 - 8 * Math.cos(i * 0.4)), 2 + i * 2, 1, 1, '#c98a52'); // дуга
  disc(r, 9, 10, 7, '#5ac4f2');
  const land = [[[5, 6, 4, 3], [4, 9, 3, 4], [11, 12, 4, 3], [12, 5, 2, 2]], [[8, 5, 5, 3], [7, 10, 3, 5], [3, 12, 2, 2], [13, 9, 2, 3]], [[3, 6, 3, 4], [10, 7, 4, 2], [10, 12, 3, 3], [6, 14, 2, 1]]][k];
  for (const [x, y, w, h] of land) r(x, y, w, h, '#7ad98a');
  r(6, 5, 2, 1, '#ffffff');
});
/** Счёты: n — сколько бусин отодвинуто (0…5). */
const abacus = (n) => canvasFor(22, 18, (r) => {
  r(0, 0, 2, 18, '#c98a52'); r(20, 0, 2, 18, '#c98a52'); r(0, 0, 22, 2, '#a8693c'); r(0, 16, 22, 2, '#a8693c');
  const cols = ['#ef5a6f', '#ffd84a', '#7ad98a', '#5ac4f2'];
  for (let row = 0; row < 4; row++) {
    const y = 3 + row * 3;
    r(2, y + 1, 18, 1, '#8f96b0');
    for (let i = 0; i < 5; i++) {
      const moved = row === 0 ? i < n : row === 1 ? i < Math.max(0, n - 2) : false;
      r(moved ? 3 + i * 2 : 10 + i * 2, y, 2, 3, cols[row]);
    }
  }
});

// ---------------------------------------------------------------- больница
/** Кушетка доктора: кукла или питомец садится сверху. */
const couch = () => canvasFor(36, 18, (r) => {
  r(0, 4, 36, 6, '#ffffff'); r(0, 4, 36, 1, '#f4f6fb'); r(0, 9, 36, 1, '#d8dcec');
  r(26, 1, 10, 4, '#d8f2ff'); r(26, 1, 10, 1, '#ffffff'); // подушка
  r(0, 10, 36, 2, '#8fa8f2'); r(2, 12, 2, 6, '#8f96b0'); r(32, 12, 2, 6, '#8f96b0'); r(17, 12, 2, 6, '#8f96b0');
  r(10, 6, 3, 1, '#ef5a6f'); r(11, 5, 1, 3, '#ef5a6f'); // крестик
});
/** Рентген: экран на стойке (who — 'doll' или 'pet': на экране скелетик). */
const xray = (who = null) => canvasFor(26, 36, (r) => {
  r(0, 0, 26, 28, '#d8dcec'); r(0, 0, 26, 1, '#ffffff'); r(24, 0, 2, 28, '#b8bccc');
  r(2, 2, 22, 24, who ? '#1e3a5a' : '#2b3d6e');
  r(4, 30, 2, 6, '#8f96b0'); r(20, 30, 2, 6, '#8f96b0'); r(2, 28, 22, 2, '#8f96b0');
  r(20, 3, 2, 2, who ? '#7af28a' : '#ef5a6f');
  const b = '#e6f6ff';
  if (who === 'doll') {
    disc(r, 13, 7, 3, b); r(12, 7, 1, 1, '#1e3a5a'); r(14, 7, 1, 1, '#1e3a5a'); r(12, 9, 3, 1, '#1e3a5a'); // череп с улыбкой
    r(13, 11, 1, 9, b); for (let y = 12; y < 18; y += 2) r(10, y, 7, 1, b); // позвоночник и рёбра
    r(9, 12, 1, 6, b); r(17, 12, 1, 6, b); r(10, 20, 7, 1, b); r(11, 21, 1, 4, b); r(15, 21, 1, 4, b);
  } else if (who === 'pet') {
    disc(r, 18, 11, 3, b); r(19, 10, 1, 1, '#1e3a5a'); r(16, 7, 1, 2, b); r(20, 7, 1, 2, b); // голова с ушками
    r(5, 13, 11, 1, b); for (let x = 6; x < 15; x += 2) r(x, 14, 1, 3, b); // позвоночник и рёбра
    r(6, 17, 1, 5, b); r(14, 17, 1, 5, b); r(3, 11, 2, 1, b); r(2, 10, 1, 1, b); // лапы и хвост
  } else {
    r(5, 5, 4, 1, '#5a78a8'); r(5, 8, 7, 1, '#5a78a8');
  }
});
/** Аптечка: тап — пластырь. */
const firstAid = () => canvasFor(20, 15, (r) => {
  r(0, 2, 20, 13, '#ffffff'); r(0, 2, 20, 1, '#f4f6fb'); r(0, 14, 20, 1, '#d8dcec');
  r(7, 0, 6, 2, '#ef5a6f'); r(8, 5, 4, 8, '#ef5a6f'); r(6, 7, 8, 4, '#ef5a6f');
});
/** Пластырь (предмет) и он же — маленький, на кукле. */
const plaster = () => canvasFor(10, 5, (r) => { r(0, 0, 10, 5, '#f2c8a0'); r(3, 1, 4, 3, '#ffe0c8'); r(1, 2, 1, 1, '#d8a878'); r(8, 2, 1, 1, '#d8a878'); });
const plasterOn = () => {
  const c = document.createElement('canvas');
  c.width = 5; c.height = 3;
  const g = c.getContext('2d');
  g.fillStyle = '#c8946a'; g.fillRect(0, 0, 5, 3);
  g.fillStyle = '#f2c8a0'; g.fillRect(0, 1, 5, 1); g.fillRect(1, 0, 3, 3);
  g.fillStyle = '#ffe0c8'; g.fillRect(2, 1, 1, 1);
  return c;
};
/** Шкафчик с витаминами (open — дверца открыта). */
const medCab = (open) => canvasFor(22, 32, (r) => {
  r(0, 0, 22, 32, '#f4f6fb'); r(0, 0, 22, 1, '#ffffff'); r(20, 0, 2, 32, '#d8dcec'); r(0, 30, 22, 2, '#b8bccc');
  if (open) {
    r(2, 2, 16, 26, '#d8f2ff'); r(2, 10, 16, 1, '#b8bccc'); r(2, 19, 16, 1, '#b8bccc');
    for (const [x, y, c] of [[4, 5, '#ef5a6f'], [9, 6, '#ffd84a'], [13, 4, '#7ad98a'], [4, 14, '#c48ff2'], [10, 13, '#ff9ac8'], [5, 22, '#5ac4f2'], [11, 23, '#f2955a']]) r(x, y, 3, 5, c);
    r(-4, 2, 4, 26, '#e6e8f0');
  } else {
    r(2, 2, 16, 26, '#e6e8f0'); r(8, 9, 4, 12, '#ef5a6f'); r(4, 13, 12, 4, '#ef5a6f'); r(15, 14, 2, 3, '#8f96b0');
  }
});
/** Скорая помощь, мордой вправо (lit — мигалка горит). */
const ambulance = (lit) => canvasFor(42, 24, (r) => {
  r(0, 4, 30, 15, '#ffffff'); r(0, 4, 30, 1, '#f4f6fb'); r(30, 9, 11, 10, '#ffffff'); r(31, 10, 7, 5, '#bfe6ff'); r(32, 11, 2, 2, '#ffffff');
  r(0, 13, 41, 2, '#ef5a6f'); r(10, 6, 3, 7, '#ef5a6f'); r(8, 8, 7, 3, '#ef5a6f');
  r(18, 1, 6, 3, lit ? '#5ac4f2' : '#8fa8f2'); if (lit) { r(16, 0, 2, 2, '#bfe6ff'); r(24, 0, 2, 2, '#bfe6ff'); }
  r(40, 15, 2, 2, '#fff4a8'); r(0, 18, 41, 1, '#b8bccc');
  for (const x of [8, 33]) { disc(r, x, 20, 3, '#3a3040'); r(x, 20, 1, 1, '#8f96b0'); }
});

// ---------------------------------------------------------------- театр
/** Декорации на заднике сцены: лес, замок, море, звёздное небо. */
const BACKDROPS = [
  (r) => { r(0, 0, 72, 30, '#bfe6ff'); for (const [x, h] of [[4, 18], [16, 22], [30, 16], [44, 24], [58, 20]]) { r(x + 3, 30 - h + 8, 3, h - 8, '#8d5a3b'); disc(r, x + 4, 30 - h + 6, 6, '#5fb84a'); } },
  (r) => { r(0, 0, 72, 30, '#ffd0e4'); r(22, 8, 28, 22, '#c9b3e0'); r(20, 4, 6, 26, '#b49ad0'); r(46, 4, 6, 26, '#b49ad0'); r(33, 2, 6, 6, '#b49ad0'); r(34, 0, 4, 2, '#ef5a6f'); r(32, 18, 8, 12, '#8d5a3b'); for (const x of [21, 23, 47, 49, 22, 48]) r(x, 2, 1, 2, '#b49ad0'); },
  (r) => { r(0, 0, 72, 16, '#9fdcff'); r(0, 16, 72, 14, '#3a9bd9'); for (let x = 2; x < 72; x += 8) r(x, 18 + (x % 3), 4, 1, '#8fd6f7'); r(50, 4, 6, 6, '#ffe066'); r(12, 10, 10, 6, '#ffffff'); r(16, 6, 1, 4, '#8d5a3b'); r(17, 6, 5, 4, '#ef5a6f'); },
  (r) => { r(0, 0, 72, 30, '#24205a'); for (let i = 0; i < 24; i++) r((i * 29) % 72, (i * 17) % 26, 1, 1, '#ffffff'); disc(r, 56, 8, 5, '#fff6c2'); disc(r, 58, 7, 4, '#24205a'); for (const [x, y] of [[14, 6], [30, 12], [42, 4]]) { r(x, y, 3, 1, '#ffd84a'); r(x + 1, y - 1, 1, 3, '#ffd84a'); } },
];
/** Сцена театра с задником k. Занавес — отдельной картинкой поверх (curtain). */
const tStage = (k) => canvasFor(80, 46, (r) => {
  r(0, 0, 80, 4, '#8a2a3a'); r(0, 0, 80, 1, '#b8424f'); for (let x = 2; x < 80; x += 6) r(x, 4, 4, 2, '#8a2a3a'); // ламбрекен
  r(2, 6, 76, 30, '#3a2546');
  const back = (x, y, w, h, c) => r(4 + x, 6 + y, w, h, c);
  BACKDROPS[k](back);
  r(0, 4, 4, 32, '#ffd84a'); r(76, 4, 4, 32, '#ffd84a'); // золотая рама
  r(0, 36, 80, 6, '#c98a52'); r(0, 36, 80, 1, '#e0a971'); r(0, 41, 80, 1, '#8d5a3b'); // помост
  r(0, 42, 80, 4, '#6e3a4a'); for (let x = 6; x < 80; x += 14) r(x, 37, 3, 2, '#fff4a8'); // рампа
});
/** Занавес: closed — задёрнут, иначе собран по бокам. Только ткань (прозрачное — насквозь). */
const tCurtain = (closed) => canvasFor(80, 46, (r) => {
  const red = (x, w) => { r(x, 4, w, 32, '#c83a4a'); for (let i = x + 2; i < x + w; i += 5) r(i, 4, 1, 32, '#a82a3a'); };
  if (closed) { red(4, 36); red(40, 36); r(39, 4, 2, 32, '#8a2a3a'); r(18, 22, 4, 2, '#ffd84a'); r(58, 22, 4, 2, '#ffd84a'); }
  else { red(4, 7); red(69, 7); r(5, 20, 6, 2, '#ffd84a'); r(69, 20, 6, 2, '#ffd84a'); }
});
/** Прожектор на треноге. */
const spotlight = (on) => canvasFor(16, 28, (r) => {
  r(7, 12, 2, 12, '#5a5068'); for (let i = 0; i < 5; i++) { r(7 - i, 23 + i, 1, 1, '#5a5068'); r(8 + i, 23 + i, 1, 1, '#5a5068'); }
  r(2, 2, 10, 9, '#3a3040'); r(2, 2, 10, 1, '#5a5068'); r(12, 3, 3, 7, on ? '#fff4a8' : '#8f96b0'); r(13, 4, 2, 5, on ? '#ffffff' : '#b8bccc');
  r(0, 5, 2, 3, '#5a5068');
});
/** Сундук с костюмами: из-под крышки торчат шляпы и перья. */
const costumes = () => canvasFor(26, 20, (r) => {
  r(4, 0, 3, 5, '#ffd84a'); r(3, 4, 5, 2, '#ffd84a'); // корона
  r(12, 1, 6, 5, '#3a3040'); r(10, 5, 10, 1, '#3a3040'); // цилиндр
  r(20, 0, 1, 6, '#ff9ac8'); r(21, 1, 1, 3, '#ff9ac8'); // перо
  r(0, 6, 26, 5, '#8a52cc'); r(0, 6, 26, 1, '#b47cf2'); r(0, 11, 26, 9, '#a86ad9'); r(0, 19, 26, 1, '#6e3a8a');
  r(11, 9, 4, 4, '#ffd84a'); r(12, 10, 2, 2, '#c8a040'); r(4, 11, 2, 9, '#ffd84a'); r(20, 11, 2, 9, '#ffd84a');
});
/** Ширма для переодевания (closed — за ней кто-то есть: видны туфельки). */
const tScreen = (closed) => canvasFor(28, 32, (r) => {
  for (let i = 0; i < 3; i++) {
    const x = i * 9;
    r(x, 0, 9, 30, i % 2 ? '#ffd0e4' : '#ff9ac8'); r(x, 0, 9, 1, '#ffffff'); r(x + 8, 0, 1, 30, '#d97aa5');
    for (let y = 4; y < 28; y += 6) r(x + 3, y, 2, 2, '#ffffff');
  }
  r(1, 30, 2, 2, '#8d5a3b'); r(25, 30, 2, 2, '#8d5a3b');
  if (closed) { r(10, 29, 3, 2, '#ef5a6f'); r(15, 29, 3, 2, '#ef5a6f'); r(5, -2, 2, 3, '#c48ff2'); }
});
/** Зритель в зале, спиной к нам: голова над спинкой кресла. */
const fan = (kind) => canvasFor(16, 16, (r) => {
  const c = { bunny: '#ffffff', bear: '#c98a52', cat: '#f2955a', fox: '#ef8a3a' }[kind];
  if (kind === 'bunny') { r(4, 0, 2, 6, c); r(10, 0, 2, 6, c); r(5, 1, 1, 4, '#ffd0e4'); r(10, 1, 1, 4, '#ffd0e4'); }
  else if (kind === 'bear') { disc(r, 4, 4, 2, c); disc(r, 12, 4, 2, c); }
  else { r(3, 2, 3, 3, c); r(10, 2, 3, 3, c); r(4, 3, 1, 1, '#2b1d2e'); r(11, 3, 1, 1, '#2b1d2e'); }
  disc(r, 8, 8, 5, c);
  r(1, 11, 14, 5, '#c83a4a'); r(1, 11, 14, 1, '#e05a6a'); r(0, 12, 1, 4, '#8a2a3a'); r(15, 12, 1, 4, '#8a2a3a'); // спинка кресла
});

/** Значок Центра для карты и табло: башенка с часами. */
const centerIcon = () => canvasFor(12, 10, (r) => {
  r(0, 0, 12, 10, '#9fdcff'); r(0, 8, 12, 2, '#d8dcec');
  r(3, 3, 6, 6, '#e0a971'); r(4, 0, 4, 3, '#ef5a6f'); r(5, -1, 2, 1, '#ef5a6f');
  r(4, 4, 4, 3, '#ffffff'); r(6, 5, 1, 1, '#3a3040'); r(5, 7, 2, 2, '#8d5a3b');
});
const postcard = () => canvasFor(18, 12, (r) => {
  r(0, 0, 18, 12, '#fff8e8');
  r(1, 1, 8, 7, '#9fdcff'); r(1, 8, 8, 3, '#d8dcec'); r(2, 6, 3, 2, '#ef5a6f'); r(5, 5, 3, 3, '#7ad98a'); r(2, 8, 6, 1, '#3a3040'); r(3, 4, 1, 2, '#3a3040');
  r(13, 1, 4, 4, '#ef5a6f'); r(14, 2, 2, 2, '#ffffff');
  r(10, 6, 7, 1, '#c9b3e0'); r(10, 8, 6, 1, '#c9b3e0'); r(10, 10, 4, 1, '#c9b3e0');
});
/** Губка для доски: жёлтый поролон в дырочках на синей основе. */
const sponge = () => canvasFor(14, 7, (r) => {
  r(0, 0, 14, 4, '#ffd84a'); r(0, 0, 14, 1, '#fff4a8');
  for (const [x, y] of [[2, 1], [6, 2], [10, 1], [4, 3], [12, 3]]) r(x, y, 1, 1, '#e0a838');
  r(0, 4, 14, 3, '#5ac4f2'); r(0, 6, 14, 1, '#3a8fc0');
});
/** Мелок для значка-подсказки «нарисуй на доске». */
const chalkIcon = () => canvasFor(14, 12, (r) => {
  r(0, 0, 14, 10, '#2f5a4a'); r(0, 10, 14, 2, '#c98a52');
  r(2, 6, 2, 1, '#ffffff'); r(4, 4, 2, 2, '#ffffff'); r(6, 3, 2, 1, '#ffffff'); r(8, 4, 2, 2, '#ffffff'); r(10, 6, 2, 1, '#ffffff');
  r(5, 10, 4, 1, '#ffffff');
});

/** Что приносит глобус: зверь с другого конца света. */
export const GLOBE_PETS = ['kiwi bird', 'polar bear', 'parrot', 'red-eyed tree frog', 'arctic fox', 'river otter', 'flamingo', 'hedgehog'];
/** Что в шкафчике доктора: витамины и полезное. */
export const MEDCAB = ['vitamin jar', 'green apple', 'carrot', 'glass of milk', 'glass of orange juice'];
/** Что в сундуке с костюмами. */
export const COSTUMES = ['tiara', 'jester hat', 'wizard hat', 'king\'s crown', 'tricorne hat', 'feathered hat', 'top hat', 'flower crown'];

export function makeCenterArt(scene) {
  const T = scene.textures;
  const add = (key, canvas, icon = true) => {
    if (T.exists(key)) return;
    T.addCanvas(key, canvas);
    if (icon) T.addCanvas(`${key}_icon`, iconFrom(canvas, false));
  };
  add('train', train(false), false);
  add('train_b', train(true), false);
  add('train_side', trainSmall(), false);
  if (!T.exists('train_icon')) T.addCanvas('train_icon', iconFrom(trainSmall(), false));
  add('ticketbox', ticketBox(false));
  add('ticketbox_b', ticketBox(true), false);
  add('ticket', ticket());
  for (let n = 0; n < 4; n++) add(`stationclock_${n}`, stationClock(n), n === 0);
  add('bagcart', bagCart());
  add('suitcase', suitcase());
  add('schooldesk', desk());
  add('schoolbell', schoolBell(false));
  add('schoolbell_b', schoolBell(true), false);
  for (let k = 0; k < 3; k++) add(`globe_${k}`, globe(k), k === 0);
  for (let n = 0; n <= 5; n++) add(`abacus_${n}`, abacus(n), n === 0);
  add('couch', couch());
  add('xray', xray());
  add('xray_doll', xray('doll'), false);
  add('xray_pet', xray('pet'), false);
  add('firstaid', firstAid());
  add('plaster', plaster());
  if (!T.exists('plaster_on')) T.addCanvas('plaster_on', plasterOn());
  add('medcab', medCab(false));
  add('medcab_b', medCab(true), false);
  add('ambulance', ambulance(false));
  add('ambulance_b', ambulance(true), false);
  for (let k = 0; k < BACKDROPS.length; k++) add(`tstage_${k}`, tStage(k), k === 0);
  add('tcurtain', tCurtain(false), false);
  add('tcurtain_closed', tCurtain(true), false);
  add('spot', spotlight(false));
  add('spot_on', spotlight(true), false);
  add('costumes', costumes());
  add('tscreen', tScreen(false));
  add('tscreen_closed', tScreen(true), false);
  for (const k of ['bunny', 'bear', 'cat', 'fox']) add(`fan_${k}`, fan(k), false);
  add('place_center', centerIcon(), false);
  add('postcard_center', postcard());
  add('chalk_icon', chalkIcon(), false);
  add('sponge', sponge());

  const big = (id, subject, beh, order, extra = {}) => ({ id, subject, cat: 'furniture', tags: ['furniture'], tex: id, bbox: [0, 0, 15, 15], order, beh, ...extra });
  // названия подобраны так, чтобы правила behaviorOf() по словам (chest, basket, lamp, bed, hat, chair…) их не цепляли
  return [
    big('ticketbox', 'ticket machine', { tickets: true }, 150),
    big('stationclock', 'station clock post', { sclock: true }, 151, { tex: 'stationclock_0' }),
    big('bagcart', 'luggage trolley', { trolley: true, container: true, perch: { dy: 9, lo: -6, hi: 8, behind: true } }, 152),
    big('schooldesk', 'pupil desk', { desk: true, perch: { dy: 9, lo: -6, hi: 6, behind: true } }, 153),
    big('schoolbell', 'school bell stand', { sbell: true }, 154),
    big('globe', 'classroom globe', { globe: true }, 155, { tex: 'globe_0' }),
    big('abacus', 'counting frame', { abacus: true }, 156, { tex: 'abacus_0' }),
    big('couch', 'doctor exam table', { couch: true, perch: { dy: 12, lo: -12, hi: 10 } }, 157),
    big('xray', 'x-ray screen', { xray: true }, 158),
    big('firstaid', 'first aid kit', { firstaid: true }, 159),
    big('medcab', 'medicine cupboard', { medcab: true }, 160),
    big('ambulance', 'ambulance van', { ambulance: true, perch: { dy: 13, lo: 2, hi: 12, behind: true } }, 161),
    big('tstage', 'theater stage', { tstage: true, perch: { dy: 9, lo: -30, hi: 30, stand: true } }, 162, { tex: 'tstage_0' }),
    big('spot', 'stage spotlight', { spot: true }, 163),
    big('costumes', 'costume trunk', { costumes: true }, 164),
    big('tscreen', 'dressing screen', { fitting: true }, 165),
    { id: 'suitcase', subject: 'travel suitcase', cat: 'toy', tags: ['toy'], tex: 'suitcase', bbox: [0, 0, 15, 15], order: 166, beh: { container: true } },
    { id: 'train-ticket', subject: 'train ticket', cat: 'toy', tags: ['toy'], tex: 'ticket', bbox: [0, 0, 15, 15], hidden: true, beh: { ticket: true } },
    { id: 'plaster', subject: 'sticking plaster', cat: 'toy', tags: ['toy'], tex: 'plaster', bbox: [0, 0, 15, 15], hidden: true, beh: { plaster: true } },
    { id: 'postcard-center', subject: 'postcard from the center', cat: 'toy', tags: ['toy'], tex: 'postcard_center', bbox: [0, 0, 15, 15], hidden: true, beh: { postcard: 'center' } },
  ];
}
