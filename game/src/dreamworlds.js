// Миры снов: у каждого — свой фон, жители и одна главная механика.
// build(s) получает сцену сна (dream.js) и собирает мир из её помощников: s.spr / s.img / s.wander / s.gift …
// Спрайты каталога смотрят влево; крупные жители (на них можно кататься) — те же спрайты ×2.
import Phaser from 'phaser';
import { canvasFor } from './furniture.js';
import { sfx } from './sfx.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
/** Псевдослучайное число 0…m-1 по номеру (фон одинаков при каждом входе). */
const rs = (i, m) => (i * 73 + i * i * 29 + 17) % m;

/** Пиксельный эллипс в canvas-текстуре (r — рисовалка canvasFor). */
function disc(r, cx, cy, rx, ry, col) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) r(x, y, 1, 1, col);
    }
  }
}

/** Пиксельный эллипс в Graphics (без сглаживания: строками). */
function gdisc(g, cx, cy, rx, ry, col, alpha = 1) {
  g.fillStyle(col, alpha);
  for (let dy = -Math.floor(ry); dy <= Math.floor(ry); dy++) {
    const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    if (w > 0) g.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2, 1);
  }
}

/** Небо полосами сверху вниз. */
function bands(g, W, y0, y1, cols) {
  const h = (y1 - y0) / cols.length;
  cols.forEach((c, i) => g.fillStyle(c).fillRect(0, Math.round(y0 + i * h), W, Math.ceil(h) + 1));
}

function stars(g, W, h, n, col = 0xffffff) {
  g.fillStyle(col);
  for (let i = 0; i < n; i++) {
    const x = (i * 73 + i * i * 29) % W;
    const y = (i * 37 + i * i * 13) % h;
    g.fillRect(x, y, 1, 1);
    if (i % 9 === 0) g.fillRect(x - 1, y, 3, 1).fillRect(x, y - 1, 1, 3);
  }
}

/** Копия спрайта каталога в другом цвете (тон 0…360; dark < 1 — темнее): мишка становится цвета съеденного. */
function hueTex(scene, rec, hue, dark = 1) {
  const key = `dw_hue_${rec.id}_${hue}_${dark}`;
  if (scene.textures.exists(key)) return key;
  const fr = scene.textures.getFrame(rec.cat, rec.frame);
  const c = document.createElement('canvas');
  c.width = fr.width;
  c.height = fr.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(fr.source.image, fr.cutX, fr.cutY, fr.width, fr.height, 0, 0, fr.width, fr.height);
  const im = g.getImageData(0, 0, c.width, c.height);
  const d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const mx = Math.max(d[i], d[i + 1], d[i + 2]);
    const mn = Math.min(d[i], d[i + 1], d[i + 2]);
    const sat = mx ? (mx - mn) / mx : 0;
    if (sat < 0.12 || mx < 60) continue; // контур и блики не трогаем
    const v = mx * dark;
    const h = (((hue % 360) + 360) % 360) / 60;
    const x = v * (1 - sat * Math.abs((h % 2) - 1));
    const m = v * (1 - sat);
    const [r, gg, b] = h < 1 ? [v, x, m] : h < 2 ? [x, v, m] : h < 3 ? [m, v, x] : h < 4 ? [m, x, v] : h < 5 ? [x, m, v] : [v, m, x];
    d[i] = r; d[i + 1] = gg; d[i + 2] = b;
  }
  g.putImageData(im, 0, 0);
  scene.textures.addCanvas(key, c);
  return key;
}

const SWEETS = ['cupcake', 'lollipop', 'cotton candy', 'candy cane', 'macaron', 'glazed donut'];
// в какой цвет красит мишку сладость (тон; шоколад — ещё и темнее)
const SWEET_HUE = { cupcake: 285, lollipop: 0, 'cotton candy': 200, 'candy cane': 350, macaron: 140, 'glazed donut': 32, 'heart shaped cookie': 48, 'sugar cookie': 48, 'chocolate bar': 24 };
const BERRIES = ['strawberry', 'blueberry', 'pair of cherries'];
const RB_LIFE = 12000; // сколько живёт радуга, нарисованная пальцем
const BLOCK_COLS = [['#ff7a8a', '#ffa8b4', '#d85a6a'], ['#7ac8f2', '#a8dcf8', '#5aa8d8'], ['#ffd84a', '#ffe88a', '#d8b030'], ['#8ad9a8', '#b0e8c4', '#62b888'], ['#c48ff2', '#dcb8f8', '#a06fd0']];

// гингерный домик: откуда откусывают (по порядку)
const BITES = [[3, 19, 5], [41, 30, 5], [33, 7, 5], [5, 38, 4], [40, 17, 4]];

export function makeDreamTextures(scene) {
  if (scene.textures.exists('dream_cloud')) return;
  const add = (key, canvas) => scene.textures.addCanvas(key, canvas);
  // облачко-дверь (в нём — картинка мира) и его маленькая копия для подсказок
  add('dream_cloud', canvasFor(26, 20, (r) => {
    disc(r, 13, 12.5, 13, 7.5, '#ffffff'); disc(r, 8, 7.5, 6, 6, '#ffffff'); disc(r, 16, 6.5, 7, 6.5, '#ffffff'); disc(r, 21, 10, 5, 5, '#ffffff');
    disc(r, 13, 17.5, 9, 1.6, '#e3e9ff');
  }));
  add('dream_cloud_icon', canvasFor(13, 10, (r) => {
    disc(r, 6.5, 6.5, 6.5, 3.5, '#bcd8ff'); disc(r, 4.5, 4, 3.5, 3.5, '#d6e8ff'); disc(r, 8.5, 3.5, 4, 3.5, '#d6e8ff'); // голубое: читается на белом облачке желания
    r(9, 1, 1, 3, '#ffd84a'); r(8, 2, 3, 1, '#ffd84a'); // искорка: это волшебное облачко
  }));
  // солнышко — «проснуться»
  add('dw_sun', canvasFor(13, 13, (r) => {
    disc(r, 6.5, 6.5, 4, 4, '#ffe066'); r(5, 5, 2, 2, '#fff4a8');
    r(6, 0, 1, 2, '#ffe066'); r(6, 11, 1, 2, '#ffe066'); r(0, 6, 2, 1, '#ffe066'); r(11, 6, 2, 1, '#ffe066');
    r(2, 2, 1, 1, '#ffe066'); r(10, 2, 1, 1, '#ffe066'); r(2, 10, 1, 1, '#ffe066'); r(10, 10, 1, 1, '#ffe066');
  }));
  // хвост русалки: закрывает ноги куклы (та же сетка 22 пикселя по ширине)
  add('dw_tail', canvasFor(22, 11, (r) => {
    r(6, 0, 10, 8, '#3fc8b0'); r(6, 0, 10, 1, '#ffd84a');
    for (let y = 2; y < 8; y += 2) for (let x = 7 + (y % 4 ? 0 : 1); x < 15; x += 2) r(x, y, 1, 1, '#9af0dc');
    r(4, 8, 14, 1, '#2fa890'); r(3, 9, 16, 1, '#2fa890'); r(3, 10, 5, 1, '#2fa890'); r(14, 10, 5, 1, '#2fa890');
    r(5, 9, 2, 1, '#7fe0cc'); r(15, 9, 2, 1, '#7fe0cc');
  }));
  // облако, на котором можно стоять и прыгать
  add('dw_cloud', canvasFor(46, 14, (r) => {
    disc(r, 23, 9.5, 23, 4.5, '#ffffff'); disc(r, 10, 6.5, 8, 6, '#ffffff'); disc(r, 22, 5.5, 10, 5.5, '#ffffff'); disc(r, 35, 7, 8, 5.5, '#ffffff');
    disc(r, 23, 12, 18, 1.8, '#dfe6fb');
  }));
  // ракушка: закрытая и открытая
  add('dw_clam', canvasFor(16, 10, (r) => {
    disc(r, 8, 6, 8, 4.5, '#f2a0b8'); disc(r, 8, 5, 6.5, 3, '#f8bccd');
    for (const x of [3, 6, 9, 12]) r(x, 3, 1, 6, '#d87898');
    r(2, 9, 12, 1, '#c8688a');
  }));
  add('dw_clam_open', canvasFor(16, 15, (r) => {
    disc(r, 8, 4.5, 8, 4.5, '#f2a0b8'); disc(r, 8, 5.5, 6.5, 3, '#ffe0ec');
    for (const x of [3, 6, 9, 12]) r(x, 0, 1, 3, '#d87898');
    disc(r, 8, 11.5, 8, 3.5, '#f2a0b8'); disc(r, 8, 10.5, 6.5, 2, '#ffe0ec');
    r(2, 14, 12, 1, '#c8688a');
  }));
  // лунный кратер
  add('dw_crater', canvasFor(30, 8, (r) => {
    disc(r, 15, 4, 15, 4, '#a8a3c4'); disc(r, 15, 4.5, 12.5, 3, '#5a557a'); disc(r, 15, 5.5, 10, 2, '#454064');
    r(6, 1, 18, 1, '#c8c3e0');
  }));
  // пряничный домик: 0…5 укусов
  for (let k = 0; k <= BITES.length; k++) {
    add(`dw_house_${k}`, canvasFor(44, 42, (r, clear) => {
      r(4, 17, 36, 25, '#c8843f'); r(4, 38, 36, 4, '#a8682f');
      for (let y = 0; y <= 17; y++) { const h = Math.round(2 + y * 1.2); r(22 - h, y, h * 2, 1, '#8a4a2a'); r(22 - h, y, 2, 1, '#ffffff'); r(20 + h, y, 2, 1, '#ffffff'); }
      r(0, 16, 44, 2, '#ffffff');
      for (let x = 1; x < 44; x += 5) r(x, 18, 3, 2, '#ffffff');
      r(18, 27, 8, 15, '#7a3f22'); r(17, 26, 10, 1, '#ffffff'); r(24, 34, 1, 1, '#ffd84a');
      for (const x of [7, 30]) { r(x, 23, 7, 7, '#ffe9a8'); r(x + 3, 23, 1, 7, '#ffffff'); r(x, 26, 7, 1, '#ffffff'); }
      r(13, 9, 2, 2, '#ff5a6f'); r(22, 5, 2, 2, '#7ad9b5'); r(29, 10, 2, 2, '#5ac4f2'); r(20, 12, 2, 2, '#ffd84a');
      r(9, 34, 2, 2, '#ff9ad5'); r(33, 34, 2, 2, '#7ad9b5'); r(11, 37, 2, 2, '#5ac4f2'); r(31, 38, 2, 2, '#ff5a6f');
      for (const [bx, by, br] of BITES.slice(0, k)) {
        for (let y = by - br; y <= by + br; y++) for (let x = bx - br; x <= bx + br; x++) if ((x - bx) ** 2 + (y - by) ** 2 <= br * br) clear(x, y);
      }
    }));
  }
  // пряничный человечек
  add('dw_ginger', canvasFor(12, 15, (r) => {
    disc(r, 6, 3.5, 3.5, 3.5, '#c8843f'); r(4, 7, 4, 5, '#c8843f'); r(1, 7, 10, 2, '#c8843f'); r(3, 12, 2, 3, '#c8843f'); r(7, 12, 2, 3, '#c8843f');
    r(4, 3, 1, 1, '#2b1d2e'); r(7, 3, 1, 1, '#2b1d2e'); r(5, 5, 2, 1, '#ffffff');
    r(5, 8, 2, 1, '#ff5a6f'); r(5, 10, 2, 1, '#7ad9b5');
    r(1, 7, 1, 2, '#ffffff'); r(10, 7, 1, 2, '#ffffff'); r(3, 14, 2, 1, '#ffffff'); r(7, 14, 2, 1, '#ffffff');
  }));
  // снежные шары и готовый снеговик
  const ball = (r, cx, cy, rx, ry) => { disc(r, cx, cy, rx, ry, '#cfe0f2'); disc(r, cx - 0.7, cy - 0.7, rx - 0.8, ry - 0.8, '#ffffff'); };
  add('dw_ball3', canvasFor(18, 16, (r) => ball(r, 9, 8, 9, 8)));
  add('dw_ball2', canvasFor(14, 12, (r) => ball(r, 7, 6, 7, 6)));
  add('dw_ball1', canvasFor(10, 9, (r) => ball(r, 5, 4.5, 5, 4.5)));
  add('dw_snowman', canvasFor(20, 36, (r) => {
    ball(r, 10, 28, 9, 8); ball(r, 10, 17, 7, 6); ball(r, 10, 8, 5, 4.5);
    r(5, 2, 10, 1, '#8a52cc'); r(7, 0, 6, 2, '#8a52cc'); r(7, 1, 6, 1, '#ffd84a');
    r(8, 6, 1, 1, '#2b1d2e'); r(11, 6, 1, 1, '#2b1d2e'); r(10, 8, 3, 1, '#ff9a3a');
    r(8, 10, 1, 1, '#2b1d2e'); r(9, 11, 2, 1, '#2b1d2e'); r(11, 10, 1, 1, '#2b1d2e');
    r(5, 12, 10, 2, '#ef5a6f'); r(13, 14, 2, 3, '#ef5a6f');
    r(10, 17, 1, 1, '#2b1d2e'); r(10, 20, 1, 1, '#2b1d2e');
    r(0, 16, 3, 1, '#8d5a3b'); r(17, 16, 3, 1, '#8d5a3b'); r(0, 14, 1, 2, '#8d5a3b'); r(19, 14, 1, 2, '#8d5a3b');
  }));
  // санки (нос слева — как у спрайтов каталога)
  add('dw_sled', canvasFor(26, 11, (r) => {
    r(2, 3, 22, 2, '#ef5a6f'); r(2, 3, 22, 1, '#ff8a9a'); r(8, 3, 1, 2, '#c8405a'); r(16, 3, 1, 2, '#c8405a');
    r(6, 5, 1, 5, '#8d5a3b'); r(19, 5, 1, 5, '#8d5a3b');
    r(3, 10, 22, 1, '#b8743a'); r(1, 9, 2, 1, '#b8743a'); r(0, 7, 1, 2, '#b8743a'); r(1, 6, 2, 1, '#b8743a');
    r(3, 5, 1, 1, '#ffd84a'); r(2, 6, 1, 1, '#ffd84a');
  }));
  // планета с кольцом и далёкая Земля
  add('dw_planet', canvasFor(36, 22, (r) => {
    const ring = (front) => {
      for (let y = 0; y < 22; y++) for (let x = 0; x < 36; x++) {
        const d = ((x + 0.5 - 18) / 17.5) ** 2 + ((y + 0.5 - 11) / 4.2) ** 2;
        if (d <= 1 && d >= 0.62 && (y >= 11) === front) r(x, y, 1, 1, '#ffe0a8');
      }
    };
    ring(false);
    disc(r, 18, 11, 9, 9, '#f2a65a'); disc(r, 16.5, 9.5, 6.5, 6.5, '#f8bc7a');
    for (const y of [8, 13]) for (let x = 9; x < 27; x++) if ((x + 0.5 - 18) ** 2 + (y + 0.5 - 11) ** 2 <= 78) r(x, y, 1, 1, '#e08a3a');
    ring(true);
  }));
  add('dw_earth', canvasFor(14, 14, (r) => {
    disc(r, 7, 7, 7, 7, '#5ac4f2'); r(3, 3, 4, 3, '#7ad98a'); r(8, 7, 4, 4, '#7ad98a'); r(4, 9, 2, 2, '#7ad98a'); r(6, 2, 4, 1, '#ffffff'); r(2, 7, 3, 1, '#ffffff');
  }));
  // след сна дома: снежная шапка и облачко под ногами
  add('dm_snow', canvasFor(14, 6, (r) => { disc(r, 7, 4, 7, 2.5, '#ffffff'); disc(r, 5, 2.5, 4, 2.5, '#ffffff'); disc(r, 9.5, 3, 3.5, 2, '#ffffff'); r(3, 5, 9, 1, '#cfe0f2'); }));
  add('dm_cloud', canvasFor(22, 8, (r) => { disc(r, 11, 5, 11, 3, '#ffffff'); disc(r, 7, 3.5, 4, 3, '#ffffff'); disc(r, 14, 3, 5, 3, '#ffffff'); r(4, 7, 14, 1, '#dfe6fb'); }));
  // воздушный шар с корзиной, в которую можно сесть: шар — за куклой, передняя стенка корзины — перед ней
  add('dw_balloon', canvasFor(34, 70, (r) => {
    disc(r, 17, 15, 17, 15, '#ef5a6f'); disc(r, 17, 15, 10, 15, '#ffd84a'); disc(r, 17, 15, 4, 15, '#ff9a5a');
    disc(r, 10, 9, 3, 4, '#ff8a9a');
    for (let y = 27; y < 37; y++) { const h = Math.round(13 - (y - 27) * 0.9); r(17 - h, y, h * 2, 1, '#ef5a6f'); r(17 - Math.round(h * 0.55), y, Math.round(h * 0.55) * 2, 1, '#ffd84a'); r(16, y, 2, 1, '#ff9a5a'); }
    r(12, 37, 10, 2, '#8d5a3b');
    for (let y = 39; y < 58; y++) { const k = (y - 39) / 19; r(Math.round(12 - k * 4), y, 1, 1, '#8d5a3b'); r(Math.round(21 + k * 4), y, 1, 1, '#8d5a3b'); }
    r(7, 57, 20, 13, '#a8682f'); r(7, 57, 20, 1, '#8d5a3b');
  }));
  add('dw_basket', canvasFor(20, 11, (r) => {
    r(0, 0, 20, 11, '#c8843f'); r(0, 0, 20, 2, '#8d5a3b'); r(0, 9, 20, 2, '#a8682f');
    for (let y = 3; y < 9; y += 2) for (let x = (y % 4 === 3 ? 1 : 3); x < 20; x += 4) r(x, y, 2, 1, '#e0a860');
  }));
  // шоколадный фонтан
  add('dw_fountain', canvasFor(28, 34, (r) => {
    disc(r, 14, 4, 2.5, 3, '#7a4a2a');
    disc(r, 14, 9, 5, 2.4, '#f2c94c'); disc(r, 14, 8.2, 3.6, 1.3, '#7a4a2a'); r(13, 10, 2, 8, '#d8b030');
    disc(r, 14, 19, 9, 3, '#f2c94c'); disc(r, 14, 18, 7.4, 1.7, '#7a4a2a'); r(12, 21, 4, 9, '#d8b030');
    disc(r, 14, 30, 14, 4, '#f2c94c'); disc(r, 14, 29, 12, 2.4, '#7a4a2a'); r(3, 32, 22, 1, '#d8b030');
    for (const [x, y, h] of [[10, 9, 8], [17, 9, 8], [6, 19, 9], [21, 19, 9], [14, 11, 6]]) r(x, y, 1, h, '#7a4a2a');
    r(9, 28, 3, 1, '#a8703f'); r(17, 29, 4, 1, '#a8703f');
  }));
  // дверь ледяного дворца и лунка во льду
  add('dw_door', canvasFor(10, 16, (r) => { r(0, 2, 10, 14, '#2e4486'); r(1, 1, 8, 1, '#2e4486'); r(2, 0, 6, 1, '#2e4486'); r(1, 3, 8, 13, '#3c5aa0'); r(3, 4, 4, 4, '#ffe9a8'); r(7, 10, 1, 1, '#ffd84a'); }));
  add('dw_door_open', canvasFor(10, 16, (r) => { r(0, 2, 10, 14, '#2e4486'); r(1, 1, 8, 1, '#2e4486'); r(2, 0, 6, 1, '#2e4486'); r(1, 3, 8, 13, '#fff4c0'); r(2, 5, 6, 11, '#ffe9a8'); }));
  add('dw_hole', canvasFor(24, 9, (r) => { disc(r, 12, 4.5, 12, 4.5, '#ffffff'); disc(r, 12, 5, 10, 3.2, '#2c6ab0'); disc(r, 12, 5.6, 8, 2, '#1f4f8c'); r(6, 3, 5, 1, '#7fc4ee'); }));
  // кубики: из них строят башню
  BLOCK_COLS.forEach(([col, hi, lo], i) => add(`dw_block_${i}`, canvasFor(14, 14, (r) => {
    r(0, 0, 14, 14, col); r(0, 0, 14, 2, hi); r(0, 0, 2, 14, hi); r(0, 12, 14, 2, lo); r(12, 0, 2, 14, lo);
    if (i % 2) { r(5, 4, 4, 6, '#ffffff'); r(4, 5, 6, 4, '#ffffff'); } else { r(6, 3, 2, 8, '#ffffff'); r(3, 6, 8, 2, '#ffffff'); }
  })));
}

/** Тап по жителю: подпрыгнул, сердечко и свой звук. */
const hello = (s, snd = sfx.squeak, h = 6) => (a) => { snd(); s.fxHearts.explode(1, a.x, a.y - a.displayHeight); s.jump(a, h, 140); };

// =====================================================================
export const WORLDS = {
  // ------------------------------------------------------------------ сказочный лес
  forest: {
    icon: 'unicorn', ground: 0.62, gravity: 'ground', music: 0,
    // кукла встаёт ниже грибов: не закрывает их и не перехватывает тапы
    start: (s) => ({ x: s.W * 0.3, y: s.GY + s.band * 0.84 }),
    wants: BERRIES,
    lures: [
      { key: 'mush', who: (s) => s.mush },
      { key: 'bush', who: (s) => s.bushes },
      { key: 'ride', who: (s) => [s.uni, s.dolls[0]] },
      { key: 'fairy', who: (s) => s.fairies },
    ],
    events: [
      (s) => s.skyfall('shooting star'),
      (s) => s.flyby(['butterfly', 'monarch butterfly', 'blue morpho butterfly', 'swallowtail butterfly', 'butterfly'], { y: 52, dys: [0, -9, 7, -4, 10], gap: 15, wave: 6, speed: 30 }),
    ],
    build(s) {
      const { W, H, GY, band } = s;
      const g = s.add.graphics().setDepth(-10);
      bands(g, W, 0, GY, [0x1b1846, 0x23205a, 0x2c2c70, 0x364084, 0x40589a]);
      stars(g, W, Math.round(GY * 0.6), 34);
      gdisc(g, W * 0.78, 20, 11, 11, 0xfff6c2);
      gdisc(g, W * 0.78 - 3, 17, 4, 4, 0xfffbe0);
      // дальние ели
      g.fillStyle(0x1c3050);
      for (let x = 4, i = 0; x < W; x += 13, i++) {
        const h = 20 + rs(i, 16);
        for (let y = 0; y < h; y++) { const half = 1 + Math.floor((y % 7) * 0.8 + y * 0.16); g.fillRect(x - half, GY - h + y, half * 2 + 1, 1); }
      }
      // трава и цветы
      g.fillStyle(0x2f7a5a).fillRect(0, GY, W, H - GY);
      g.fillStyle(0x58b888).fillRect(0, GY, W, 1);
      g.fillStyle(0x3f9a6c);
      for (let y = GY + 3, r = 0; y < H; y += 5, r++) for (let x = (r % 2) * 5; x < W; x += 10) { g.fillRect(x, y, 1, 2); g.fillRect(x + 2, y + 1, 1, 1); }
      for (let i = 0; i < 16; i++) {
        const x = 8 + rs(i, W - 16);
        const y = GY + 4 + rs(i + 5, Math.max(4, band - 8));
        g.fillStyle([0xff9ad5, 0xfff07a, 0xffffff, 0x9ad9ff][i % 4]).fillRect(x - 1, y, 3, 1).fillRect(x, y - 1, 1, 3);
        g.fillStyle(0xffd84a).fillRect(x, y, 1, 1);
      }
      // большие деревья по краям — кроны уходят за экран
      const f = s.add.graphics().setDepth(-9);
      for (const [tx, dir] of [[9, 1], [W - 10, -1]]) {
        f.fillStyle(0x3a2a3a).fillRect(tx - 4, 10, 9, GY - 6);
        f.fillStyle(0x4c3848).fillRect(tx - 4, 10, 2, GY - 6);
        f.fillStyle(0x3a2a3a).fillRect(tx - 7, GY + 1, 15, 3);
        gdisc(f, tx + dir * 6, 6, 30, 17, 0x1f4a44);
        gdisc(f, tx + dir * 16, 16, 19, 11, 0x2a6a58);
        gdisc(f, tx - dir * 4, 16, 14, 8, 0x256052);
      }
      // светлячки
      s.add.particles(0, 0, 'px', {
        x: { min: 6, max: W - 6 }, y: { min: 12, max: H - 8 }, lifespan: 2800, speed: { min: 2, max: 9 },
        tint: 0xfff07a, alpha: { onUpdate: (p, k, t) => Math.sin(t * Math.PI) }, frequency: 240,
      }).setDepth(400);

      // поющие грибы: каждый — своя нота; зажгли все четыре — подарок
      const NOTES = [0, 2, 4, 7];
      s.mush = ['glowcap mushroom', 'star mushroom', 'crystal mushroom', 'moon mushroom'].map((sub, i) => {
        const m = s.spr(sub, W * (0.2 + i * 0.145), GY + 6, { sc: 2, drag: false, noFlip: true });
        m.glow = s.add.image(m.x, m.y - 22, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(m.y + 1).setScale(0.5).setAlpha(0.75).setVisible(false);
        m.tap = () => {
          sfx.instrument('bell', NOTES[i]);
          s.fxNotes.explode(1, m.x, m.y - 30);
          s.jump(m, 3, 110);
          m.lit = true;
          m.glow.setVisible(true);
          m.offEv?.remove();
          m.offEv = s.time.delayedCall(9000, () => { m.lit = false; m.glow.setVisible(false); });
          if (!s.mush.every((x) => x.lit)) return;
          // хор грибов: аккорд, салют и подарок
          s.tried('mush');
          sfx.fanfare();
          for (const x of s.mush) { x.offEv?.remove(); s.fxSparks.explode(10, x.x, x.y - 22); x.offEv = s.time.delayedCall(1600, () => { x.lit = false; x.glow.setVisible(false); }); }
          s.gift(W * 0.42 + rnd(-20, 20), GY - 6);
        };
        return m;
      });

      // единорог: скачет через поляну с радужным следом; на нём можно кататься
      const gallop = (u) => {
        if (u.moving || u.dragging) return;
        sfx.whee(); sfx.sparkle();
        u.trailing = true;
        s.moveTo(u, u.x > W / 2 ? W * 0.14 : W * 0.86, u.y, { speed: 75, hops: true, hopH: 7, hopLen: 26, step: () => sfx.step(), done: () => { u.trailing = false; s.fxSparks.explode(8, u.x, u.y - 20); } });
      };
      s.uni = s.spr('unicorn', W * 0.84, GY + band * 0.55, { sc: 2, ride: { seat: 13, go: gallop }, tap: gallop });

      // феи: посыпают куклу пыльцой — и она летает
      const dust = (f2) => {
        const d = s.nearestDoll(f2);
        sfx.sparkle();
        s.fxSparks.explode(6, f2.x, f2.y - 8);
        if (!d || d.busy || d.mount || d.jumping || f2.busy) return;
        s.halt(f2);
        f2.busy = true;
        s.moveTo(f2, d.x + 12, d.y - d.displayHeight - 2, {
          speed: 90, done: () => {
            f2.busy = false;
            if (d.dragging || d.busy || d.mount) return;
            s.tried('fairy');
            sfx.whee();
            s.fxSparks.explode(16, d.x, d.y - 20);
            d.busy = true;
            d.setTexture(d.key + '_smile');
            const y0 = d.y;
            const ev = s.time.addEvent({ delay: 160, repeat: 22, callback: () => { if (d.busy && !d.dragging) s.fxSparks.explode(1, d.x + rnd(-8, 8), d.y - 2); } });
            s.act(d, {
              y: Math.max(40, y0 - 36), duration: 900, ease: 'Sine.easeOut', yoyo: true, hold: 2000,
              onComplete: () => { ev.remove(); d.busy = false; d.y = y0; d.setTexture(d.key); sfx.giggle(); },
            });
          },
        });
      };
      s.fairies = ['fairy', 'flower fairy', 'frost fairy'].map((sub, i) => {
        const fa = s.spr(sub, W * (0.3 + i * 0.22), 30 + i * 9, { fly: true, tap: dust });
        s.wander(fa, [20, W - 20, 16, GY - 12], { wave: 3, speed: 16, rest: 0.15, every: 2600 });
        return fa;
      });
      // лесные жители: любят ягоды и загадывают желания
      s.critters = ['deer', 'hedgehog', 'fox', 'rabbit', 'squirrel'].map((sub, i) => {
        const a = s.spr(sub, W * (0.28 + i * 0.1), GY + band * rnd(0.5, 0.85), { tap: hello(s), eats: true, wisher: true });
        s.wander(a, [22, W - 22, GY + 10, H - 4], { hops: true, speed: 18 });
        return a;
      });
      // прятки: за кустом кто-то сидит — тап, и зверёк выскакивает; пустой куст роняет ягоду
      const hide = (a, b) => { s.halt(a); a.hid = true; a.setVisible(false).disableInteractive(); a.x = b.x0; a.y = b.y + 1; b.hides = a; };
      const shake = (b) => {
        s.act(b, { x: b.x0 + 1, duration: 50, yoyo: true, repeat: 2, onComplete: () => { b.x = b.x0; } });
        s.fxCrumbs.setParticleTint(0x58b888);
        s.fxCrumbs.explode(5, b.x0, b.y - 18);
      };
      s.bushes = [[0.1, 22], [0.56, 47], [0.93, 27]].map(([fx, dy]) => {
        const b = s.spr('leafy bush', W * fx, GY + dy, { sc: 2, drag: false, noFlip: true });
        b.x0 = b.x;
        b.tap = () => {
          sfx.step(); sfx.dig();
          shake(b);
          const a = b.hides;
          if (a?.active) {
            b.hides = null;
            a.hid = false;
            a.setVisible(true).setInteractive();
            a.x = b.x0; a.y = b.y + 2;
            s.tried('bush');
            sfx.squeak(); sfx.giggle();
            s.fxHearts.explode(3, a.x, a.y - 16);
            const tx = Phaser.Math.Clamp(a.x + (a.x < W / 2 ? rnd(30, 70) : -rnd(30, 70)), 22, W - 22);
            s.jump(a, 14, 240, () => s.moveTo(a, tx, GY + band * rnd(0.4, 0.9), { hops: true, speed: 50 }));
            // нашли троих — подарок
            if (++s.found % 3 === 0) { sfx.fanfare(); s.fxSparks.explode(20, b.x0, b.y - 20); s.gift(b.x0 + (b.x0 < W / 2 ? 22 : -22), b.y - 20); }
            return;
          }
          if (s.time.now < (b.cool || 0)) return;
          b.cool = s.time.now + 1300;
          s.gift(b.x0 + rnd(-8, 8), b.y - 22, pick(BERRIES));
        };
        return b;
      });
      hide(s.critters[3], s.bushes[0]);
      hide(s.critters[4], s.bushes[2]);
      // время от времени кто-нибудь снова прячется
      s.time.addEvent({
        delay: 9000, loop: true, callback: () => {
          const now = s.time.now;
          const b = pick(s.bushes.filter((x) => !x.hides && !(x.going > now)));
          const a = pick(s.critters.filter((x) => x.active && !x.hid && !x.dragging && !x.moving && !x.busy && !x.jumping && x !== s.wishNow?.who));
          if (!a || !b || s.leaving || Math.random() < 0.3) return;
          b.going = now + 7000;
          s.moveTo(a, b.x0, b.y + 1, { hops: true, speed: 45, done: () => { b.going = 0; if (!a.dragging && !b.hides && a !== s.wishNow?.who) { hide(a, b); shake(b); } } });
        },
      });
      s.spr('owl', W - 26, Math.round(GY * 0.55), { fly: true, drag: false, noFlip: true, tap: (o) => { sfx.instrument('wind', 0); sfx.instrument('wind', 0, 0.3); s.fxNotes.explode(2, o.x, o.y - 14); s.jump(o, 2, 120); } });
    },
    walk: (s) => [22, s.W - 22, s.GY + 10, s.H - 4],
    update(s) {
      const u = s.uni;
      if (u?.active && u.trailing && u.moving) s.trailAdd(u.x + (u.flipX ? -12 : 12), u.y - 13);
    },
  },

  // ------------------------------------------------------------------ другая планета
  planet: {
    icon: 'flying saucer', ground: 0.66, gravity: 'moon', music: 1,
    wants: ['star', 'crescent moon', 'crystal ball', 'jar of stardust'],
    lures: [
      { key: 'crater', who: (s) => s.craters },
      { key: 'ufo', who: (s) => s.ufo },
      { key: 'ride', who: (s) => [s.rocket, s.dolls[0]] },
    ],
    events: [
      (s) => s.flyby(Array(5).fill('shooting star'), { y: 20, dys: [0, 14, 5, 24, 10], gap: 30, speed: 75, wave: 0 }),
      (s) => s.skyfall('star'),
      (s) => s.flyby(Array(3).fill('flying saucer'), { y: 62, dys: [0, -8, 0], gap: 24, speed: 42, wave: 5, tap: () => sfx.beam() }),
    ],
    build(s) {
      const { W, H, GY, band } = s;
      const g = s.add.graphics().setDepth(-10);
      bands(g, W, 0, GY, [0x08071e, 0x0c0b2a, 0x121138, 0x1a1848]);
      stars(g, W, GY - 8, 70);
      stars(g, W, GY - 20, 16, 0x9ad9ff);
      s.add.image(Math.round(W * 0.2), 24, 'dw_planet').setDepth(-9);
      s.add.image(Math.round(W * 0.8), 16, 'dw_earth').setDepth(-9);
      // горы на горизонте и лунная равнина
      g.fillStyle(0x3a3560);
      for (let x = 0; x < W; x++) { const h = Math.round(6 + 4 * Math.sin(x / 17) + 3 * Math.sin(x / 7 + 1)); g.fillRect(x, GY - h, 1, h); }
      g.fillStyle(0x8f8aa8).fillRect(0, GY, W, H - GY);
      g.fillStyle(0xb8b3d0).fillRect(0, GY, W, 1);
      for (let i = 0; i < 14; i++) {
        const x = 6 + rs(i, W - 12);
        const y = GY + 4 + rs(i + 3, Math.max(4, band - 6));
        gdisc(g, x, y, 3 + (i % 3), 1.5, 0x7a7596);
        g.fillStyle(0xa8a3c4).fillRect(x - 2, y - 2, 4, 1);
      }

      // кратеры: тап — из кратера выплывает подарок
      s.craters = [[0.2, 0.3], [0.56, 0.72], [0.86, 0.38]].map(([fx, fy]) => {
        const c = s.img('dw_crater', W * fx, GY + band * fy, { drag: false, noFlip: true });
        c.tap = () => {
          s.tried('crater');
          sfx.blub();
          s.fxPoof.setParticleTint(0xc8c3e0);
          s.fxPoof.explode(8, c.x, c.y - 4);
          if (s.time.now < (c.cool || 0)) return;
          c.cool = s.time.now + 1500;
          s.gift(c.x + rnd(-6, 6), c.y - 6);
        };
        return c;
      });

      // инопланетяне: медленно и высоко прыгают; повторяют прыжок куклы.
      // У каждого своя нота: они пищат мелодию из трёх нот — повтори её, и получишь подарок
      const NOTE = [0, 4, 7];
      const tune = { seq: [0, 1, 2], got: [], at: s.time.now + 3500, playing: false };
      s.tune = tune;
      const newTune = () => {
        do { tune.seq = [0, 1, 2].map(() => Math.floor(Math.random() * 3)); } while (new Set(tune.seq).size < 2);
        tune.got = [];
      };
      newTune();
      const beep = (i, h = 12) => {
        const a = s.aliens[i];
        sfx.instrument('bell', NOTE[i]);
        if (!a.active) return;
        s.fxNotes.explode(1, a.x, a.y - 18);
        if (!a.dragging) s.jump(a, h, 220);
      };
      s.playTune = () => {
        if (tune.playing) return;
        tune.playing = true;
        tune.got = [];
        tune.seq.forEach((n, k) => s.time.delayedCall(k * 560, () => beep(n)));
        s.time.delayedCall(tune.seq.length * 560 + 200, () => { tune.playing = false; });
      };
      s.aliens = ['moth fairy', 'firefly', 'moon rabbit'].map((sub, i) => {
        const a = s.spr(sub, W * (0.48 + i * 0.16), GY + band * rnd(0.35, 0.8), {
          wisher: true,
          tap: (x) => {
            beep(i, 20);
            s.fxHearts.explode(1, x.x, x.y - 16);
            if (tune.playing) return;
            tune.at = s.time.now + 9000;
            tune.got.push(i);
            if (!tune.got.every((n, k) => tune.seq[k] === n)) { tune.got = tune.seq[0] === i ? [i] : []; return; }
            if (tune.got.length < tune.seq.length) return;
            // мелодию повторили: все танцуют, подарок — и новая мелодия
            tune.got = [];
            tune.playing = true;
            s.tried('tune');
            s.time.delayedCall(450, () => {
              sfx.fanfare();
              for (const al of s.aliens) if (al.active && !al.dragging) { s.halt(al); s.dance(al, 6); s.fxSparks.explode(8, al.x, al.y - 14); }
              s.gift(x.x + rnd(-10, 10), x.y - 16);
              newTune();
              tune.playing = false;
              tune.at = s.time.now + 8000;
            });
          },
        });
        s.wander(a, [20, W - 20, GY + 6, H - 4], { hops: true, hopH: 8, speed: 12 });
        return a;
      });
      // пока ребёнок думает, они напевают мелодию снова
      s.time.addEvent({
        delay: 1000, loop: true, callback: () => {
          if (s.leaving || s.press || s.time.now < tune.at || performance.now() - s.lastInput < 2500) return;
          tune.at = s.time.now + (s.isTried('tune') ? 16000 : 10000);
          s.playTune();
        },
      });

      // летающая тарелка: подлетает, поднимает лучом и переносит на другое место
      const ufo = s.spr('flying saucer', W * 0.5, 34, { sc: 2, fly: true, drag: false, noFlip: true });
      s.ufo = ufo;
      s.beam = s.add.graphics().setDepth(550);
      s.wander(ufo, [34, W - 34, 30, 38], { speed: 18, rest: 0.1, every: 2400 });
      ufo.cancel = () => { if (ufo.target) ufo.target.busy = false; ufo.target = null; ufo.lift = false; ufo.busy = false; s.halt(ufo); };
      ufo.tap = () => {
        if (ufo.busy) return;
        const list = s.actors.filter((a) => a !== ufo && a.drag && a.visible && !a.fly && !a.dragging && !a.mount && !a.rider && !a.owner && !a.busy && a.kind !== 'item');
        const t = list.sort((p, q) => (p.kind === 'doll' ? 0 : 1) - (q.kind === 'doll' ? 0 : 1) || Math.abs(p.x - ufo.x) - Math.abs(q.x - ufo.x))[0];
        sfx.beam();
        if (!t) { s.jump(ufo, 3, 120); return; }
        s.tried('ufo');
        s.halt(ufo);
        s.halt(t);
        ufo.busy = true;
        ufo.target = t;
        t.busy = true;
        const y0 = t.y;
        const live = () => ufo.target === t && t.active && !t.dragging;
        s.act(ufo, {
          x: t.x, duration: 500 + Math.abs(t.x - ufo.x) * 6, ease: 'Sine.easeInOut', onComplete: () => {
            if (!live()) return;
            ufo.lift = true;
            sfx.beam();
            s.act(t, {
              y: ufo.y + Math.round(t.displayHeight * 0.6) + 8, duration: 1300, ease: 'Sine.easeInOut', onComplete: () => {
                if (!live()) return;
                const tx = Phaser.Math.Clamp(t.x < W / 2 ? t.x + rnd(70, 130) : t.x - rnd(70, 130), 26, W - 26);
                s.act(ufo, {
                  x: Math.round(tx), duration: 1500, ease: 'Sine.easeInOut', onUpdate: () => { if (live()) t.x = ufo.x; }, onComplete: () => {
                    if (!live()) return;
                    s.act(t, {
                      y: y0, duration: 1300, ease: 'Sine.easeInOut', onComplete: () => {
                        ufo.lift = false; ufo.target = null; ufo.busy = false; t.busy = false;
                        if (t.kind === 'doll') sfx.giggle(); else sfx.squeak();
                        s.fxSparks.explode(8, t.x, t.y - 10);
                      },
                    });
                  },
                });
              },
            });
          },
        });
      };

      // ракета: взлетает за край неба и садится в другом месте (можно лететь на ней)
      const launch = (r) => {
        if (r.busy || r.dragging) return;
        r.busy = true;
        r.flying = true;
        sfx.rocket();
        const y0 = r.y;
        s.act(r, {
          y: -50, duration: 1400, ease: 'Quad.easeIn', onComplete: () => {
            r.x = Math.round(rnd(30, W - 30));
            s.act(r, { y: y0, duration: 2300, ease: 'Sine.easeOut', onComplete: () => { r.busy = false; r.flying = false; sfx.thud(); s.fxPoof.setParticleTint(0xc8c3e0); s.fxPoof.explode(10, r.x, r.y); } });
          },
        });
      };
      s.rocket = s.spr('toy rocket', W * 0.12, GY + band * 0.6, { sc: 2, noFlip: true, ride: { seat: 10, go: launch }, tap: launch });
    },
    walk: (s) => [20, s.W - 20, s.GY + 6, s.H - 4],
    /** Кукла прыгает высоко и медленно — инопланетяне повторяют за ней. */
    dollTap(s, d) {
      if (!s.jump(d, 28, 640)) return true;
      sfx.whee(); sfx.giggle();
      s.aliens.forEach((a, i) => s.time.delayedCall(320 + i * 230, () => { if (a.active && !a.busy && s.jump(a, 20, 520)) sfx.blub(); }));
      return true;
    },
    update(s) {
      const u = s.ufo;
      const b = s.beam.clear();
      if (u.busy && (!u.target?.active || u.target.dragging)) u.cancel();
      if (u.lift && u.target) {
        const y0 = u.y - 6;
        const y1 = s.GY + s.band * 0.5;
        for (let y = y0; y < y1; y++) { const w = Math.round(5 + (y - y0) / (y1 - y0) * 9); b.fillStyle(0xfff07a, 0.38).fillRect(u.x - w, y, w * 2, 1); }
      }
      const r = s.rocket;
      if (r.active && r.flying && !r.dragging && Math.random() < 0.7) {
        s.fxCrumbs.setParticleTint(pick([0xffd84a, 0xff9a5a, 0xff5a6f]));
        s.fxCrumbs.explode(2, r.x, r.y);
      }
    },
  },

  // ------------------------------------------------------------------ подводное царство
  sea: {
    icon: 'goldfish', ground: 0.84, gravity: 'water', music: 1, tail: true,
    start: (s) => ({ x: s.W * 0.36, y: s.H * 0.6 }),
    wants: ['pearl', 'seashell', 'starfish'],
    lures: [
      { key: 'clam', who: (s) => s.clams.filter((c) => !c.open) },
      { key: 'chest', who: (s) => (s.chest.open ? [] : [s.crab, s.chest]) },
      { key: 'ride', who: (s) => [s.whale, s.dolls[0]] },
    ],
    events: [
      (s) => s.flyby(['sea turtle'], { y: 64, sc: 2, speed: 22, wave: 4, tap: () => sfx.blub() }),
      (s) => s.flyby(['fish', 'betta fish', 'fish', 'koi fish', 'fish', 'betta fish', 'fish'], { y: 52, dys: [0, -8, 8, -16, 16, -24, 24], gap: 11, speed: 62, wave: 2, tap: (a) => s.fxBub.explode(5, a.x, a.y - 8) }),
    ],
    build(s) {
      const { W, H, GY, band } = s;
      const g = s.add.graphics().setDepth(-10);
      bands(g, W, 0, GY, [0x7fd8f0, 0x62c6ea, 0x48b0e0, 0x3898d4, 0x2c80c4, 0x2468b0]);
      // лучи света сверху
      for (const [x0, w] of [[W * 0.18, 9], [W * 0.42, 14], [W * 0.7, 8]]) {
        g.fillStyle(0xffffff, 0.08);
        for (let y = 0; y < GY * 0.8; y++) g.fillRect(Math.round(x0 + y * 0.45), y, w, 1);
      }
      // песок, камни, водоросли
      g.fillStyle(0xf2dca0).fillRect(0, GY, W, H - GY);
      g.fillStyle(0xfff0c0).fillRect(0, GY, W, 1);
      g.fillStyle(0xd9c080);
      for (let i = 0; i < 40; i++) g.fillRect(rs(i, W), GY + 2 + rs(i + 7, Math.max(2, band - 3)), 1, 1);
      for (const [x, r] of [[14, 9], [W - 18, 11], [W * 0.5, 6]]) { gdisc(g, x, GY + 1, r, r * 0.6, 0x6f7f9a); gdisc(g, x - 2, GY - 1, r * 0.6, r * 0.3, 0x8f9fb8); }
      for (let i = 0; i < 9; i++) {
        const x = 10 + rs(i, W - 20);
        const h = 14 + rs(i + 2, 22);
        g.fillStyle(i % 2 ? 0x2f9a6a : 0x3fb880);
        for (let y = 0; y < h; y++) g.fillRect(x + Math.round(Math.sin(y / 4 + i) * 2), GY - y, 2, 1);
      }
      s.deco('bubble coral', W * 0.08, GY + 7, 2);
      s.deco('bubble coral', W * 0.93, GY + 8, 2).setFlipX(true);
      s.deco('bubble coral', W * 0.62, GY + 4, 1);
      s.add.particles(0, 0, 'px', {
        x: { min: 4, max: W - 4 }, y: H, lifespan: 6000, speedY: { min: -26, max: -12 }, speedX: { min: -3, max: 3 },
        scale: { onEmit: () => (Math.random() < 0.3 ? 2 : 1) }, alpha: { start: 0.7, end: 0 }, frequency: 300,
      }).setDepth(500);

      // рыбки: плывут за пальцем
      s.fish = ['goldfish', 'blue tang fish', 'koi fish', 'goldfish', 'seahorse'].map((sub, i) => {
        const f = s.spr(sub, W * (0.5 + i * 0.1), 30 + rs(i, 40), { fly: true, tap: (x) => { sfx.blub(); s.fxBub.explode(4, x.x, x.y - 8); s.halt(x); s.moveTo(x, x.x + (x.x < W / 2 ? 50 : -50), x.y + rnd(-10, 10), { speed: 90, wave: 3 }); } });
        f.lureOff = [rnd(-16, 16), rnd(-12, 12)];
        s.wander(f, [14, W - 14, 20, GY - 6], { wave: 3, speed: 20, rest: 0.15, every: 2400 });
        return f;
      });
      // кит: поёт и пускает фонтан; на нём можно кататься
      const whale = s.spr('whale', W * 0.74, H * 0.36, {
        sc: 2, fly: true, ride: { seat: 13 }, tap: (w) => {
          sfx.whale();
          [0, 200, 400].forEach((ms) => s.time.delayedCall(ms, () => { if (w.active) s.fxBub.explode(8, w.x + (w.flipX ? 8 : -8), w.y - 30); }));
        },
      });
      s.wander(whale, [44, W - 44, 44, GY - 14], { wave: 2, speed: 11, rest: 0.1, every: 4200 });
      s.whale = whale;
      // дельфин: прыгает дугой
      const dol = s.spr('dolphin', W * 0.2, H * 0.3, {
        fly: true, wisher: true, tap: (d) => { sfx.whee(); s.halt(d); s.fxBub.explode(6, d.x, d.y - 8); s.moveTo(d, d.x < W / 2 ? d.x + 90 : d.x - 90, d.y, { speed: 110, wave: 16 }); },
      });
      s.wander(dol, [20, W - 20, 22, GY - 20], { wave: 5, speed: 34, rest: 0.1, every: 2800 });
      for (let i = 0; i < 2; i++) {
        const j = s.spr('jellyfish', W * (0.3 + i * 0.5), 40 + i * 20, { fly: true, noFlip: true, tap: (x) => { sfx.sparkle(); s.fxSparks.explode(6, x.x, x.y - 8); s.halt(x); s.moveTo(x, x.x, x.y - 14, { speed: 40 }); } });
        s.wander(j, [16, W - 16, 24, GY - 20], { wave: 2, speed: 8, rest: 0.2 });
      }
      // на дне: осьминог пускает чернила и удирает, краб щёлкает клешнями
      s.fxInk = s.add.particles(0, 0, 'px', { emitting: false, lifespan: 1500, speed: { min: 6, max: 26 }, scale: { start: 3, end: 1 }, alpha: { start: 0.85, end: 0 }, tint: [0x2b1d4e, 0x4a3570] }).setDepth(6000);
      const oct = s.spr('octopus', W * 0.72, GY + band * 0.6, {
        ground: true, fly: true, noFlip: true, wisher: true, tap: (o) => { sfx.poof(); s.fxInk.explode(22, o.x, o.y - 8); s.halt(o); s.moveTo(o, o.x < W / 2 ? o.x + rnd(60, 110) : o.x - rnd(60, 110), o.y, { speed: 120 }); },
      });
      s.wander(oct, [20, W - 20, GY + 6, H - 3], { speed: 9, rest: 0.5 });
      // краб щёлкает клешнями и носит ключ от сундука: тап — роняет ключ
      const crab = s.spr('crab', W * 0.3, GY + band * 0.7, {
        ground: true, fly: true, noFlip: true, wisher: true, tap: (c) => {
          sfx.click(); s.time.delayedCall(120, () => sfx.click());
          s.halt(c); s.jump(c, 4, 110);
          const k = s.ckey;
          if (!k?.active || k.carrier !== c) return;
          k.carrier = null;
          k.x = Math.round(Phaser.Math.Clamp(c.x + (c.x < W / 2 ? 18 : -18), 10, W - 10));
          k.y = c.y - 8;
          s.fxSparks.explode(8, k.x, k.y - 8);
          sfx.jingle();
          s.settle(k);
        },
      });
      s.wander(crab, [16, W - 16, GY + 6, H - 3], { hops: true, hopH: 1, speed: 16 });
      s.crab = crab;
      // сундук на дне заперт: ключ у краба. Открыли — три подарка, первый — жемчужина
      const face = (sub) => { const r = s.room.findRec(sub); if (r) chest.setTexture(r.cat, r.frame); };
      const newKey = () => { s.ckey = s.spr('chest key', crab.x + 9, crab.y - 5, { kind: 'item', keyItem: true, fly: true, ground: true }); s.ckey.carrier = crab; };
      const chest = s.spr('locked treasure chest', W * 0.33, GY + 14, { sc: 2, drag: false, noFlip: true });
      chest.x0 = chest.x;
      chest.tap = () => {
        s.act(chest, { x: chest.x0 + 1, duration: 50, yoyo: true, repeat: 2, onComplete: () => { chest.x = chest.x0; } });
        if (chest.open) { sfx.sparkle(); s.fxSparks.explode(6, chest.x0, chest.y - 20); return; }
        // заперт: искорки показывают, где ключ
        sfx.click();
        const k = s.ckey;
        if (!k?.active) return;
        s.fxSparks.explode(8, k.x, k.y - 8);
        if (k.carrier) s.jump(k.carrier, 6, 140); else if (!k.owner) s.jump(k, 6, 140);
      };
      s.chest = chest;
      s.openChest = (key) => {
        chest.open = true;
        face('overflowing treasure chest');
        s.removeActor(key);
        s.ckey = null;
        s.tried('chest');
        sfx.chestOut(); sfx.fanfare();
        s.fxSparks.explode(24, chest.x0, chest.y - 18);
        s.fxBub.explode(12, chest.x0, chest.y - 20);
        [0, 350, 700].forEach((ms, i) => s.time.delayedCall(ms, () => {
          if (!s.leaving) s.gift(chest.x0 + (i - 1) * 18, chest.y - 24, i ? null : 'pearl', i ? {} : { keep: true });
        }));
        s.time.delayedCall(16000, () => {
          if (!chest.active || s.leaving) return;
          chest.open = false;
          face('locked treasure chest');
          if (crab.active) { newKey(); s.fxSparks.explode(6, crab.x, crab.y - 10); }
        });
      };
      newKey();
      s.spr('starfish', W * 0.46, GY + band * 0.8, { ground: true, fly: true, noFlip: true, wisher: true, tap: (x) => { sfx.sparkle(); s.fxSparks.explode(5, x.x, x.y - 8); s.halt(x); s.jump(x, 8, 200); } });
      // ракушки: открываются — внутри подарок
      s.clams = [0.16, 0.5, 0.84].map((fx, i) => {
        const c = s.img('dw_clam', W * fx, GY + 8 + (i % 2) * 5, { drag: false, noFlip: true });
        c.tap = () => {
          if (c.open) { sfx.boing(); return; }
          s.tried('clam');
          c.open = true;
          c.setTexture('dw_clam_open');
          sfx.chestOut();
          s.fxBub.explode(6, c.x, c.y - 8);
          s.gift(c.x, c.y - 10);
          s.time.delayedCall(3800, () => { if (c.active) { c.open = false; c.setTexture('dw_clam'); } });
        };
        return c;
      });
    },
    /** Ключ отпустили у сундука — он открывается. */
    drop(s, a, q) {
      const c = s.chest;
      if (!a.keyItem || c.open || Math.abs(q.x - c.x0) > 22 || q.y < c.y - 42 || q.y > c.y + 8) return false;
      s.openChest(a);
      return true;
    },
    update(s) {
      // краб несёт ключ в клешне, пока его не забрали
      const k = s.ckey;
      if (!k?.active || !k.carrier) return;
      if (k.dragging || k.owner || !k.carrier.active) { k.carrier = null; return; }
      k.x = k.carrier.x + 9;
      k.y = k.carrier.y - 5;
    },
    /** Русалка кружится в воде. */
    dollTap(s, d) {
      s.halt(d);
      sfx.giggle();
      s.fxBub.explode(10, d.x, d.y - 14);
      s.fxHearts.explode(2, d.x, d.y - d.displayHeight);
      d.busy = true;
      const x0 = d.x;
      s.act(d, {
        x: x0 + (x0 < s.W / 2 ? 12 : -12), duration: 240, yoyo: true, repeat: 1, ease: 'Sine.easeInOut',
        onYoyo: () => d.setFlipX(!d.flipX), onRepeat: () => d.setFlipX(!d.flipX),
        onComplete: () => { d.x = x0; d.busy = false; d.setFlipX(false); s.bob(d); },
      });
      return true;
    },
    lure(s, q, force = false) {
      const now = s.time.now;
      if (!force && now - (s.lureAt || 0) < 320) return;
      s.lureAt = now;
      for (const f of s.fish) {
        if (!f.active || f.dragging || f.owner) continue;
        s.halt(f);
        s.moveTo(f, q.x + f.lureOff[0], Math.min(q.y + f.lureOff[1], s.GY - 4), { speed: 70, wave: 2 });
      }
    },
    skyDown(s, q) { WORLDS.sea.lure(s, q, true); },
    skyMove(s, q) { WORLDS.sea.lure(s, q); },
    skyTap(s, q) { sfx.blub(); s.fxBub.explode(6, q.x, q.y); },
  },

  // ------------------------------------------------------------------ облачная страна
  clouds: {
    icon: 'rainbow', ground: 0.88, gravity: 'cloud', music: 0,
    start: (s) => ({ x: s.plats[0].x - 8, y: s.plats[0].y - 9, plat: s.plats[0] }),
    wants: ['star', 'rainbow', 'kite'],
    lures: [
      { key: 'star', who: (s) => s.stars.filter((x) => !x.hiding) },
      { key: 'rainbow', show: (s) => WORLDS.clouds.demo(s) },
      { key: 'ride', who: (s) => [s.bal, s.dolls[0]] },
    ],
    events: [
      (s) => { s.planes = s.flyby(['airplane'], { y: 34, sc: 2, speed: 58, wave: 0, tap: () => sfx.whee() }); },
      (s) => s.flyby(['swallow bird', 'robin bird', 'cardinal bird', 'bluebird', 'swallow bird'], { y: 44, dys: [0, -8, 8, -16, 16], gap: 12, speed: 55, wave: 2 }),
    ],
    build(s) {
      const { W, H, GY } = s;
      const g = s.add.graphics().setDepth(-10);
      bands(g, W, 0, H, [0x6fa8ff, 0x86b8ff, 0x9fcaff, 0xbcd8ff, 0xd8e2ff, 0xffd6e8, 0xffe6d0]);
      // далёкие облака
      for (let i = 0; i < 6; i++) {
        const x = 16 + rs(i, W - 32);
        const y = 12 + rs(i + 4, Math.round(GY * 0.6));
        gdisc(g, x, y, 12, 3, 0xffffff, 0.45); gdisc(g, x - 4, y - 2, 6, 3, 0xffffff, 0.45); gdisc(g, x + 5, y - 3, 7, 3, 0xffffff, 0.45);
      }
      // облачный пол
      for (let x = -4, i = 0; x < W + 8; x += 11, i++) gdisc(g, x, GY + 2 + (i % 3), 9, 6, 0xffffff);
      g.fillStyle(0xffffff).fillRect(0, GY + 3, W, H - GY);
      g.fillStyle(0xe6ecff);
      for (let x = 4, i = 0; x < W; x += 17, i++) g.fillRect(x, GY + 8 + (i % 3) * 3, 7, 1);
      const fr = s.add.graphics().setDepth(4000);
      for (let x = 2, i = 0; x < W + 8; x += 13, i++) gdisc(fr, x, H + 1 - (i % 2), 8, 4, 0xffffff);

      // облака-батуты
      s.plats = [[0.2, 22], [0.5, 44], [0.8, 26], [0.34, 68]].map(([fx, up]) => {
        const c = s.img('dw_cloud', W * fx, GY - up, { drag: false, noFlip: true, kind: 'plat' });
        c.tap = () => {
          sfx.boing();
          s.act(c, { y: c.y + 2, duration: 80, yoyo: true });
          for (const a of s.actors) if (a.plat === c && !a.dragging) s.jump(a, 16, 240);
        };
        return c;
      });

      // звёзды: тап — звезда падает подарком, а на небе загорается новая
      s.stars = [0, 1, 2, 3].map((i) => {
        const st = s.spr('star', W * (0.14 + i * 0.22), 14 + rs(i, 16), { fly: true, drag: false, noFlip: true });
        s.tweens.add({ targets: st, alpha: 0.55, duration: 700 + i * 130, yoyo: true, repeat: -1 });
        st.tap = () => {
          if (st.hiding) return;
          s.tried('star');
          st.hiding = true;
          sfx.sparkle();
          s.gift(st.x, st.y);
          st.setVisible(false);
          s.time.delayedCall(4500, () => { if (!st.active) return; st.x = Math.round(rnd(20, W - 20)); st.y = Math.round(rnd(12, 34)); st.setVisible(true); st.hiding = false; s.fxSparks.explode(6, st.x, st.y - 8); });
        };
        return st;
      });
      // солнышко смеётся
      s.spr('sun', W * 0.9, 34, { sc: 2, fly: true, drag: false, noFlip: true, tap: (x) => { sfx.giggle(); s.fxSparks.explode(14, x.x, x.y - 16); s.jump(x, 3, 130); } });
      // облачные барашки
      [[1, -10], [2, 6]].forEach(([pi, dx]) => {
        const p = s.plats[pi];
        const sh = s.spr('cloud sheep', p.x + dx, p.y - 9, { wisher: true, tap: (x) => { sfx.baa(); s.fxHearts.explode(1, x.x, x.y - 16); s.jump(x, 14, 240); } });
        sh.plat = p;
      });
      const sheep = s.spr('cloud sheep', W * 0.62, GY + 9, { wisher: true, tap: (x) => { sfx.baa(); s.fxHearts.explode(1, x.x, x.y - 16); s.jump(x, 14, 240); } });
      s.wander(sheep, [16, W - 16, GY + 6, H - 3], { hops: true, hopH: 4, speed: 16 });
      // летуны
      for (const [sub, fx, fy] of [['bluebird', 0.6, 30], ['winged pig', 0.3, 48], ['winged cat', 0.72, 60]]) {
        const a = s.spr(sub, W * fx, fy, { fly: true, wisher: sub !== 'bluebird', tap: (x) => { sfx.squeak(); s.fxHearts.explode(1, x.x, x.y - 16); s.halt(x); s.moveTo(x, x.x + (x.x < W / 2 ? 46 : -46), x.y, { speed: 80, wave: 10 }); } });
        s.wander(a, [18, W - 18, 16, GY - 20], { wave: 4, speed: 20, rest: 0.15, every: 2600 });
      }
      // небесный кит катает по небу
      const whale = s.spr('sky whale', W * 0.55, GY - 62, { sc: 2, fly: true, ride: { seat: 13 }, tap: (w) => { sfx.whale(); s.fxSparks.explode(10, w.x, w.y - 30); } });
      s.wander(whale, [40, W - 40, 44, GY - 30], { wave: 3, speed: 12, rest: 0.1, every: 4000 });
      // воздушный шар: в корзину можно сесть — и полететь, куда он понесёт
      const fly = (b) => {
        if (b.dragging) return;
        sfx.whee();
        s.halt(b);
        s.moveTo(b, rnd(30, W - 26), rnd(86, GY - 8), { speed: 30, wave: 3 });
      };
      const bal = s.img('dw_balloon', W * 0.13, 100, { fly: true, noFlip: true, ride: { seat: 3, over: true, zone: 34, go: fly }, tap: fly });
      s.bal = bal;
      s.balFront = s.add.image(bal.x, bal.y, 'dw_basket').setOrigin(0.5, 1);
      s.wander(bal, [30, W - 26, 88, GY - 8], { wave: 2, speed: 7, rest: 0.2, every: 4600 });
    },
    /** Радуга сама рисуется дугой через небо — так показываем, что её можно рисовать пальцем (и кататься с неё). */
    demo(s) {
      if (s.time.now < (s.rbDemoAt || 0)) return;
      s.rbDemoAt = s.time.now + 14000;
      const st = { pts: [], t: s.time.now };
      s.strokes.push(st);
      const N = 84;
      for (let k = 0; k <= N; k++) {
        s.time.delayedCall(k * 14, () => {
          const a = Math.PI * (1 - k / N);
          const x = s.W * 0.5 + Math.cos(a) * 64;
          const y = 82 - Math.sin(a) * 46;
          s.trailAdd(x, y, RB_LIFE);
          st.pts.push({ x: Math.round(x), y: Math.round(y) });
          st.t = s.time.now;
          if (k % 12 === 0) sfx.instrument('bell', (k / 12) % 8);
        });
      }
    },
    /** Куклу (или барашка) отпустили на радугу — она съезжает по ней, как с горки. */
    drop(s, a) {
      if (a.kind === 'item' || !a.drag) return false;
      const now = s.time.now;
      let best = null;
      for (const st of s.strokes) {
        if (now - st.t > RB_LIFE - 1500 || st.pts.length < 10) continue;
        st.pts.forEach((p, i) => {
          const d = Math.hypot(p.x - a.x, p.y - (a.y - 3));
          if (d < 10 && (!best || d < best.d)) best = { st, i, d };
        });
      }
      if (!best) return false;
      const pts = best.st.pts;
      const end = pts[pts.length - 1].y >= pts[0].y ? pts.length - 1 : 0; // радуга спускается к этому концу
      const n = Math.abs(end - best.i);
      if (n < 5) return false;
      s.tried('slide');
      a.busy = true;
      sfx.whee();
      if (a.kind === 'doll') { sfx.giggle(); a.setTexture(a.key + '_smile'); }
      a.tws.push(s.tweens.addCounter({
        from: best.i, to: end, duration: Math.max(350, n * 26), ease: 'Quad.easeIn',
        onUpdate: (tw) => {
          const p = pts[Math.round(tw.getValue())];
          a.x = p.x; a.y = p.y + 3;
          if (Math.random() < 0.4) s.fxSparks.explode(1, a.x, a.y);
        },
        onComplete: () => { a.busy = false; if (a.kind === 'doll') a.setTexture(a.key); s.settle(a); },
      }));
      return true;
    },
    update(s) {
      const b = s.bal;
      if (b?.active) s.balFront.setPosition(b.x, b.y).setDepth(b.depth + 0.2);
      // самолёт тянет за собой радужный след
      for (const p of s.planes || []) if (p.active) s.trailAdd(p.x + (p.flipX ? -14 : 14), p.y - 14, 2600);
    },
    /** Кукла прыгает как на батуте. */
    dollTap(s, d) {
      if (!s.jump(d, 24, 380)) return true;
      sfx.boing(); sfx.whee();
      s.fxHearts.explode(2, d.x, d.y - d.displayHeight);
      return true;
    },
    // пальцем по небу — радуга
    skyDown(s, q) {
      s.rb = { x: q.x, y: q.y, n: 0, at: 0, pts: [], t: s.time.now };
      s.strokes.push(s.rb);
      if (s.strokes.length > 6) s.strokes.shift();
    },
    skyMove(s, q) {
      const p = s.rb;
      if (!p) return;
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < 2) return;
      for (let k = 2; k <= d; k += 2) {
        const x = p.x + (q.x - p.x) * k / d;
        const y = p.y + (q.y - p.y) * k / d;
        s.trailAdd(x, y, RB_LIFE);
        p.pts.push({ x: Math.round(x), y: Math.round(y) });
      }
      p.t = s.time.now;
      if (p.pts.length > 12) s.tried('rainbow');
      p.x = q.x; p.y = q.y;
      if (s.time.now - p.at > 190) { p.at = s.time.now; sfx.instrument('bell', p.n++ % 8); }
    },
    skyTap(s, q) { sfx.sparkle(); s.fxSparks.explode(6, q.x, q.y); },
  },

  // ------------------------------------------------------------------ конфетная страна
  candy: {
    icon: 'cupcake', ground: 0.6, gravity: 'ground', music: 2, maxGifts: 10,
    wants: SWEETS,
    lures: [
      { key: 'house', who: (s) => s.house },
      { key: 'tree', who: (s) => s.trees },
      { key: 'fountain', who: (s) => s.fountain },
      { key: 'cloud', who: (s) => [s.candyCloud, s.dolls[0]] },
    ],
    events: [
      // конфетный салют
      (s) => {
        for (let i = 0; i < 6; i++) s.time.delayedCall(i * 240, () => { if (s.leaving) return; sfx.pop(); s.fxSparks.explode(18, rnd(40, s.W - 40), rnd(14, 50)); });
        for (let i = 0; i < 3; i++) s.time.delayedCall(500 + i * 300, () => { if (!s.leaving) s.gift(rnd(40, s.W - 40), 20, pick(SWEETS)); });
        s.room.stat('dreamevent');
      },
      // парад пряничных человечков
      (s) => s.flyby([0, 1, 2, 3], { tex: 'dw_ginger', ground: true, noFlip: true, y: s.GY + s.band * 0.78, gap: 20, speed: 34, tap: () => sfx.hello() }),
    ],
    build(s) {
      const { W, H, GY, band } = s;
      const g = s.add.graphics().setDepth(-10);
      bands(g, W, 0, GY, [0xffc2e0, 0xffcee6, 0xffdaec, 0xffe6f2]);
      for (let i = 0; i < 5; i++) {
        const x = 20 + rs(i, W - 40);
        const y = 10 + rs(i + 2, 22);
        const c = i % 2 ? 0xffffff : 0xffa8d4;
        gdisc(g, x, y, 13, 4, c); gdisc(g, x - 5, y - 3, 6, 4, c); gdisc(g, x + 5, y - 4, 7, 4, c);
      }
      // холмы с глазурью
      for (const [col, base, amp, k, ph] of [[0xa8ecd0, 20, 7, 31, 0], [0xd8b8f8, 11, 5, 19, 2]]) {
        for (let x = 0; x < W; x++) {
          const h = Math.round(base + amp * Math.sin(x / k + ph) + 2 * Math.sin(x / 7 + ph));
          g.fillStyle(col).fillRect(x, GY - h, 1, h);
          g.fillStyle(0xffffff).fillRect(x, GY - h, 1, 2 + (x % 6 === 0 ? 2 : 0));
        }
      }
      // печенье под ногами, глазурь и посыпка
      g.fillStyle(0xffe9b8).fillRect(0, GY, W, H - GY);
      g.fillStyle(0xffffff).fillRect(0, GY, W, 2);
      for (let x = 3; x < W; x += 9) g.fillRect(x, GY + 2, 3, 1 + (x % 2));
      for (let i = 0; i < 46; i++) g.fillStyle([0xff5a6f, 0x5ac4f2, 0x7ad9b5, 0xc48ff2, 0xffd84a][i % 5]).fillRect(rs(i, W - 2), GY + 5 + rs(i + 9, Math.max(3, band - 7)), 2, 1);

      // пряничный домик: от него можно откусывать
      const house = s.img('dw_house_0', W * 0.2, GY + 10, { drag: false, noFlip: true });
      house.bites = 0;
      house.tap = () => {
        if (house.bites >= BITES.length) { sfx.boing(); return; }
        s.tried('house');
        const [bx, by] = BITES[house.bites];
        house.bites++;
        house.setTexture(`dw_house_${house.bites}`);
        sfx.chew(); sfx.chew(0.12);
        s.fxCrumbs.setParticleTint(0xc8843f);
        s.fxCrumbs.explode(10, house.x - 22 + bx, house.y - 43 + by);
        s.gift(house.x - 22 + bx, house.y - 43 + by, pick(['heart shaped cookie', 'chocolate bar', 'sugar cookie']), { keep: true });
        if (house.bites < BITES.length) return;
        // доели — домик вырастает заново
        s.time.delayedCall(4500, () => { if (!house.active) return; house.bites = 0; house.setTexture('dw_house_0'); sfx.sparkle(); s.fxSparks.explode(20, house.x, house.y - 22); });
      };
      s.house = house;
      // леденцовые деревья: потряси — упадёт сладость
      s.trees = [['swirl lollipop', 0.44], ['lollipop', 0.56], ['cotton candy', 0.84], ['candy cane', 0.95]].map(([sub, fx]) => {
        const t = s.spr(sub, W * fx, GY + 5, { sc: 2, drag: false, noFlip: true });
        t.x0 = t.x;
        t.tap = () => {
          s.tried('tree');
          sfx.jingle();
          s.act(t, { x: t.x0 + 2, duration: 60, yoyo: true, repeat: 2, onComplete: () => { t.x = t.x0; } });
          if (s.time.now < (t.cool || 0)) return;
          t.cool = s.time.now + 900;
          s.gift(t.x0 + rnd(-8, 8), t.y - 26, pick(SWEETS));
        };
        return t;
      });
      // сладкая тучка: конфетный дождь; на ней можно кататься
      const rain = () => {
        if (s.time.now < (cloud.cool || 0)) { sfx.boing(); return; }
        cloud.cool = s.time.now + 2600;
        s.tried('cloud');
        sfx.sparkle();
        for (let i = 0; i < 6; i++) s.time.delayedCall(i * 170, () => { if (cloud.active) s.gift(cloud.x + rnd(-22, 22), cloud.y + 2, pick(SWEETS)); });
      };
      const cloud = s.img('dw_cloud', W * 0.72, 52, { drag: false, fly: true, noFlip: true, ride: { seat: 8, go: rain, key: 'cloud' }, tap: rain }).setTint(0xffb0d8);
      s.tweens.add({ targets: cloud, x: cloud.x - 60, duration: 9000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      s.candyCloud = cloud;
      // шоколадный фонтан: тап — брызги и шоколадка; что в него окунуть — станет шоколадным
      const fountain = s.img('dw_fountain', W * 0.7, GY + 9, { drag: false, noFlip: true });
      s.fountain = fountain;
      s.add.particles(fountain.x, fountain.y - 30, 'px', {
        lifespan: 700, speedX: { min: -14, max: 14 }, speedY: { min: -20, max: -6 }, gravityY: 130, tint: 0x7a4a2a, frequency: 150, scale: { onEmit: () => (Math.random() < 0.4 ? 2 : 1) },
      }).setDepth(fountain.y + 1);
      fountain.tap = () => {
        WORLDS.candy.splash(s);
        if (s.time.now < (fountain.cool || 0)) return;
        fountain.cool = s.time.now + 1500;
        s.gift(fountain.x + rnd(-12, 12), fountain.y - 24, 'chocolate bar', { keep: true });
      };
      // жители: мармеладные мишки и пряничный человечек — сладкоежки; мишка становится цвета того, что съел
      for (const fx of [0.4, 0.62]) {
        const b = s.spr('gummy bear', W * fx, GY + band * rnd(0.5, 0.85), { eats: true, gummy: true, wisher: true, noFlip: true, tap: (x) => { sfx.titter(); s.dance(x); } });
        s.wander(b, [20, W - 20, GY + 12, H - 4], { hops: true, hopH: 3, speed: 16 });
      }
      const gm = s.img('dw_ginger', W * 0.56, GY + band * 0.7, { eats: true, wisher: true, noFlip: true, tap: (x) => { sfx.hello(); s.dance(x, 8); } });
      s.wander(gm, [20, W - 20, GY + 12, H - 4], { hops: true, speed: 18 });
    },
    walk: (s) => [20, s.W - 20, s.GY + 12, s.H - 4],
    splash(s) {
      const f = s.fountain;
      s.tried('fountain');
      sfx.blub(); sfx.splash();
      s.fxCrumbs.setParticleTint(0x7a4a2a);
      s.fxCrumbs.explode(14, f.x, f.y - 22);
    },
    /** Отпустили над фонтаном: вещи и жители становятся шоколадными, кукла радуется брызгам. */
    drop(s, a, q) {
      const f = s.fountain;
      if (!f?.active || Math.abs(q.x - f.x) > 16 || q.y < f.y - 40 || q.y > f.y + 6) return false;
      WORLDS.candy.splash(s);
      a.x = Math.round(Phaser.Math.Clamp(f.x + (q.x < f.x ? -22 : 22), 10, s.W - 10));
      a.y = Math.max(a.y, f.y - 4);
      if (a.kind === 'doll') { sfx.giggle(); s.fxHearts.explode(3, a.x, a.y - a.displayHeight); } else {
        a.setTint(0xa8703f);
        a.dipped = true;
        s.fxSparks.explode(8, a.x, a.y - 8);
      }
      s.settle(a);
      return true;
    },
    /** Мишка съел сладость — и стал её цвета (окунутое в шоколад красит в шоколадный). */
    ate(s, who, rec, dipped) {
      if (!who.gummy || !who.rec || !who.active) return;
      const hue = dipped ? 24 : SWEET_HUE[rec.subject] ?? Math.floor(Math.random() * 12) * 30;
      who.clearTint();
      who.setTexture(hueTex(s, who.rec, hue, dipped || rec.subject === 'chocolate bar' ? 0.62 : 1));
      s.fxSparks.explode(10, who.x, who.y - 8);
      sfx.sparkle();
    },
  },

  // ------------------------------------------------------------------ ледяной дворец
  ice: {
    icon: 'penguin', ground: 0.6, gravity: 'ground', music: 2,
    wants: ['fish', 'snowflake'],
    lures: [
      { key: 'snowman', who: (s) => (s.snow.base.active ? [s.snow.base.level === 1 ? s.snow.mid : s.snow.head, s.snow.base] : []) },
      { key: 'hole', who: (s) => s.hole },
      { key: 'door', who: (s) => s.door },
      { key: 'ride', who: (s) => [s.sled, s.dolls[0]] },
    ],
    events: [
      (s) => { sfx.whee(); s.flyby(['penguin', 'emperor penguin', 'penguin', 'penguin'], { ground: true, hopH: 0, y: s.GY + s.band * 0.92, gap: 22, speed: 85 }); },
      (s) => s.flyby(['snowy owl'], { y: 40, sc: 2, speed: 45, wave: 6 }),
      (s) => s.skyfall('snowflake'),
    ],
    build(s) {
      const { W, H, GY, band } = s;
      const g = s.add.graphics().setDepth(-10);
      bands(g, W, 0, GY, [0x10143e, 0x182054, 0x22306c, 0x2e4486, 0x3c5aa0]);
      stars(g, W, Math.round(GY * 0.7), 40);
      // северное сияние: мерцает
      const au = s.add.graphics().setDepth(-9.5);
      [[0x7af2c0, 14, 0], [0x5ac4f2, 22, 2], [0xf29ad5, 9, 4]].forEach(([col, base, ph]) => {
        au.fillStyle(col, 0.22);
        for (let x = 0; x < W; x++) au.fillRect(x, Math.round(base + Math.sin(x / 27 + ph) * 6), 1, Math.round(9 + Math.sin(x / 13 + ph) * 4));
      });
      s.tweens.add({ targets: au, alpha: 0.35, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      // ледяной дворец
      const cx = Math.round(W * 0.5);
      for (const [dx, w, h] of [[-37, 12, 24], [-23, 14, 38], [-8, 16, 52], [9, 14, 38], [25, 12, 24]]) {
        const x = cx + dx;
        g.fillStyle(0x9fd8f0).fillRect(x, GY - h, w, h);
        g.fillStyle(0xd8f4ff).fillRect(x, GY - h, 2, h);
        g.fillStyle(0x6fb4dc).fillRect(x + w - 2, GY - h, 2, h);
        g.fillStyle(0xd8f4ff);
        for (let i = 0; i < w / 2; i++) g.fillRect(x + i, GY - h - (i + 1) * 2, w - i * 2, 2);
        g.fillStyle(0x2e4486).fillRect(x + Math.floor(w / 2) - 1, GY - h + 6, 2, 5);
      }
      g.fillStyle(0x2e4486).fillRect(cx - 4, GY - 14, 8, 14);
      g.fillStyle(0xffe9a8).fillRect(cx - 2, GY - 11, 4, 11);
      // сугробы, снег и каток
      for (let x = 0; x < W; x++) { const h = Math.round(4 + 3 * Math.sin(x / 21) + 2 * Math.sin(x / 8 + 2)); g.fillStyle(0xd3e3f2).fillRect(x, GY - h, 1, h); }
      g.fillStyle(0xeef6ff).fillRect(0, GY, W, H - GY);
      g.fillStyle(0xffffff).fillRect(0, GY, W, 1);
      g.fillStyle(0xd3e3f2);
      for (let i = 0; i < 30; i++) g.fillRect(rs(i, W - 3), GY + 3 + rs(i + 5, Math.max(3, band - 5)), 3, 1);
      const pond = { cx: Math.round(W * 0.62), cy: Math.round(GY + band * 0.58), rx: Math.round(W * 0.25), ry: Math.round(band * 0.3) };
      s.pond = pond;
      gdisc(g, pond.cx, pond.cy, pond.rx + 2, pond.ry + 2, 0xffffff);
      gdisc(g, pond.cx, pond.cy, pond.rx, pond.ry, 0xa8e0f8);
      gdisc(g, pond.cx - 6, pond.cy - 2, pond.rx * 0.7, pond.ry * 0.55, 0xc0ecff);
      g.fillStyle(0xffffff);
      for (const [dx, dy] of [[-30, -4], [-8, 3], [18, -6], [36, 2]]) for (let i = 0; i < 6; i++) g.fillRect(pond.cx + dx + i, pond.cy + dy - Math.floor(i / 2), 1, 1);
      s.add.particles(0, 0, 'px', {
        x: { min: 0, max: W }, y: -2, lifespan: 9000, speedY: { min: 12, max: 24 }, speedX: { min: -6, max: 6 }, alpha: 0.9, frequency: 170,
      }).setDepth(4500);

      // пингвины: катятся на пузе
      for (const [sub, fx] of [['penguin', 0.34], ['emperor penguin', 0.5], ['penguin', 0.9]]) {
        const p = s.spr(sub, W * fx, GY + band * rnd(0.3, 0.85), { eats: true, wisher: true, tap: (x) => { sfx.whee(); s.halt(x); s.fxPoof.setParticleTint(0xffffff); s.fxPoof.explode(5, x.x, x.y); s.moveTo(x, x.x < W / 2 ? x.x + 70 : x.x - 70, x.y, { speed: 120, ease: 'Cubic.easeOut' }); } });
        s.wander(p, [20, W - 20, GY + 6, H - 4], { hops: true, hopH: 1, speed: 13 });
      }
      const bear = s.spr('polar bear', W * 0.08, GY + band * 0.4, { eats: true, wisher: true, tap: hello(s, sfx.purr, 4) });
      s.wander(bear, [16, W - 16, GY + 6, H - 4], { hops: true, speed: 10, rest: 0.5 });
      s.spr('harp seal', pond.cx + pond.rx - 4, pond.cy - pond.ry + 2, { eats: true, tap: (x) => { sfx.squeak(); s.time.delayedCall(140, () => sfx.squeak()); s.fxHearts.explode(1, x.x, x.y - 14); s.jump(x, 5, 120); } });
      // санки: мчатся через поляну (можно ехать на них)
      const run = (sl) => {
        if (sl.moving || sl.dragging) return;
        sfx.whee();
        sl.spray = true;
        s.moveTo(sl, sl.x > W / 2 ? W * 0.12 : W * 0.88, sl.y, { speed: 130, ease: 'Cubic.easeInOut', done: () => { sl.spray = false; } });
      };
      s.sled = s.img('dw_sled', W * 0.14, GY + band * 0.85, { ride: { seat: 6, go: run }, tap: run });

      // лунка: тап — из воды выпрыгивает рыбка; ею кормят пингвинов, медведя и тюленя
      const hole = s.img('dw_hole', W * 0.93, GY + band * 0.62, { drag: false, noFlip: true });
      s.hole = hole;
      hole.tap = () => {
        s.tried('hole');
        sfx.splash();
        s.fxCrumbs.setParticleTint(0x9fdcff);
        s.fxCrumbs.explode(10, hole.x, hole.y - 4);
        if (s.time.now < (hole.cool || 0)) return;
        hole.cool = s.time.now + 1400;
        s.gift(hole.x - 14, hole.y - 12, 'fish', { keep: true, edible: 'res' });
      };
      // дверь дворца: тап — она открывается, и ледяная фея выносит подарок
      const door = s.img('dw_door', cx, GY + 1, { drag: false, noFlip: true });
      door.input.hitArea.setTo(-8, -40, 28, 58); // вся центральная башня: в саму дверь пальцем не попасть
      s.door = door;
      door.tap = () => {
        if (door.busy) { sfx.boing(); return; }
        door.busy = true;
        s.tried('door');
        door.setTexture('dw_door_open');
        sfx.chestOut(); sfx.sparkle();
        s.fxSparks.explode(14, door.x, door.y - 10);
        const f = s.spr('fairy queen', door.x, door.y - 4, { kind: 'guest', fly: true, drag: false, tap: (x) => { sfx.sparkle(); s.fxHearts.explode(2, x.x, x.y - 16); } }).setTint(0xbfe6ff);
        const close = () => { if (f.active) s.removeActor(f); if (door.active) { door.setTexture('dw_door'); door.busy = false; } };
        const tx = Phaser.Math.Clamp(door.x + (Math.random() < 0.5 ? -1 : 1) * rnd(30, 60), 20, W - 20);
        s.moveTo(f, tx, GY - 26, {
          speed: 55, wave: 4, done: () => {
            sfx.sparkle();
            s.fxSparks.explode(12, f.x, f.y - 8);
            s.gift(f.x, f.y + 4);
            s.time.delayedCall(1100, () => { if (f.active) s.moveTo(f, door.x, door.y - 4, { speed: 70, wave: 3, done: close }); else close(); });
          },
        });
        s.time.delayedCall(9000, close); // страховка: если фею перехватили по пути
      };
      // снеговик из трёх шаров: большой стоит, средний и маленький нужно поставить сверху
      const base = s.img('dw_ball3', W * 0.22, GY + band * 0.42, { drag: false, noFlip: true });
      base.level = 1;
      const mid = s.img('dw_ball2', W * 0.38, GY + band * 0.62, { kind: 'toy', noFlip: true, snow: 2 });
      const head = s.img('dw_ball1', W * 0.3, GY + band * 0.86, { kind: 'toy', noFlip: true, snow: 1 });
      s.snow = { base, mid, head };
      s.flakeAt = s.time.now + 6000;
      base.tap = () => { sfx.boing(); s.jump(base, 2, 100); for (const b of [mid, head]) if (b.active && !b.above) { s.fxSparks.explode(4, b.x, b.y - 8); s.jump(b, 5, 140); } };
    },
    walk: (s) => [20, s.W - 20, s.GY + 6, s.H - 4],
    inPond(s, a) { const p = s.pond; return ((a.x - p.cx) / p.rx) ** 2 + ((a.y - p.cy) / p.ry) ** 2 < 1; },
    /** Скольжение по льду до другого берега. */
    slide(s, a) {
      const p = s.pond;
      if (a.moving || a.dragging || a.busy) return;
      sfx.whee();
      s.fxPoof.setParticleTint(0xffffff);
      s.fxPoof.explode(4, a.x, a.y);
      const tx = a.x < p.cx ? p.cx + p.rx * 0.7 : p.cx - p.rx * 0.7;
      s.moveTo(a, tx, a.y, { dur: 850, ease: 'Cubic.easeOut', done: () => { if (a.kind === 'doll') sfx.giggle(); } });
    },
    landed(s, a) { if (a.kind !== 'plat' && !a.snow && !a.above && WORLDS.ice.inPond(s, a)) WORLDS.ice.slide(s, a); },
    dollTap(s, d) { if (!WORLDS.ice.inPond(s, d)) return false; WORLDS.ice.slide(s, d); return true; },
    drop(s, a, q) {
      if (!a.snow) return false;
      const { base, mid } = s.snow;
      if (!base.active || Math.abs(q.x - base.x) > 15 || q.y < base.y - 40 || q.y > base.y + 5) return false;
      if (a.snow === 2 && base.level === 1) {
        a.above = base; a.aboveDy = 13; a.drag = false; base.level = 2;
        sfx.thud(); sfx.sparkle();
        s.fxSparks.explode(8, base.x, base.y - 16);
        return true;
      }
      if (a.snow === 1 && base.level === 2) {
        // снеговик готов — он оживает и дарит подарок
        const x = base.x;
        const y = base.y;
        for (const b of [base, mid, a]) s.removeActor(b);
        const man = s.img('dw_snowman', x, y, { noFlip: true, tap: (m) => { sfx.hello(); s.dance(m, 6); } });
        s.snowman = man;
        s.tried('snowman');
        sfx.fanfare();
        s.fxSparks.explode(24, x, y - 18);
        s.time.delayedCall(500, () => { if (man.active) { s.dance(man, 8); s.gift(x + 18, y - 14); } });
        return true;
      }
      // не по порядку: шарик отскакивает, а нужный подпрыгивает с искорками
      sfx.boing();
      a.x = Math.round(Phaser.Math.Clamp(base.x + 24, 8, s.W - 8));
      s.settle(a);
      if (mid.active && !mid.above) { s.fxSparks.explode(5, mid.x, mid.y - 8); s.jump(mid, 6, 150); }
      return true;
    },
    update(s) {
      const sl = s.sled;
      if (sl?.active && sl.spray && sl.moving && Math.random() < 0.6) { s.fxPoof.setParticleTint(0xffffff); s.fxPoof.explode(1, sl.x + (sl.flipX ? -12 : 12), sl.y - 1); }
      // снежинки-подарки иногда падают с неба сами
      if (s.time.now > s.flakeAt && !s.leaving) {
        s.flakeAt = s.time.now + 11000;
        if (s.gifts.length < 3) s.gift(rnd(30, s.W - 30), 14, 'snowflake');
      }
    },
  },

  // ------------------------------------------------------------------ игрушечный мир
  toys: {
    icon: 'teddy bear', ground: 0.58, gravity: 'ground', music: 0,
    wants: ['balloon', 'spinning top', 'yo-yo', 'toy car'],
    lures: [
      { key: 'blocks', who: (s) => s.blocks },
      { key: 'train', who: (s) => s.train[0] },
      { key: 'chest', who: (s) => s.chest },
      { key: 'ride', who: (s) => [s.horse, s.dolls[0]] },
    ],
    events: [
      (s) => s.floatUp(['balloon', 'heart balloon', 'balloon', 'heart balloon', 'balloon', 'balloon']),
      (s) => { sfx.toot(); s.flyby(['toy car', 'race car', 'toy truck', 'police car'], { ground: true, hopH: 0, y: s.GY + 12, gap: 24, speed: 60 }); },
    ],
    build(s) {
      const { W, H, GY } = s;
      const g = s.add.graphics().setDepth(-10);
      // стена в горошек и флажки
      g.fillStyle(0xcfe8ff).fillRect(0, 0, W, GY);
      g.fillStyle(0xb4d8fb);
      for (let y = 8, r = 0; y < GY - 6; y += 10, r++) for (let x = r % 2 ? 9 : 2; x < W; x += 14) g.fillRect(x, y, 2, 2);
      g.fillStyle(0xffffff).fillRect(0, 3, W, 1);
      for (let x = 2, i = 0; x < W; x += 12, i++) {
        g.fillStyle([0xff5a6f, 0xffd84a, 0x7ad9b5, 0x5ac4f2, 0xc48ff2][i % 5]);
        for (let k = 0; k < 5; k++) g.fillRect(x + k, 4 + k, 9 - k * 2, 1);
      }
      g.fillStyle(0x8fb8e0).fillRect(0, GY - 3, W, 3);
      // башни из кубиков по углам
      const block = (x, y, col, hi, lo) => {
        g.fillStyle(col).fillRect(x, y, 16, 16);
        g.fillStyle(hi).fillRect(x, y, 16, 2).fillRect(x, y, 2, 16);
        g.fillStyle(lo).fillRect(x, y + 14, 16, 2).fillRect(x + 14, y, 2, 16);
        g.fillStyle(0xffffff).fillRect(x + 6, y + 5, 4, 6).fillRect(x + 5, y + 6, 6, 4);
      };
      const COLS = [[0xff7a8a, 0xffa8b4, 0xd85a6a], [0x7ac8f2, 0xa8dcf8, 0x5aa8d8], [0xffd84a, 0xffe88a, 0xd8b030], [0x8ad9a8, 0xb0e8c4, 0x62b888]];
      [[3, 3], [19, 2], [W - 19, 3], [W - 35, 1]].forEach(([x, n], i) => { for (let k = 0; k < n; k++) block(x, GY - 16 * (k + 1), ...COLS[(i + k) % 4]); });
      // пол и игровой коврик
      g.fillStyle(0xffe2b0).fillRect(0, GY, W, H - GY);
      g.fillStyle(0xf2cf96);
      for (let y = GY + 5; y < H; y += 6) g.fillRect(0, y, W, 1);
      const ry = GY + 5;
      const rh = Math.max(10, H - GY - 18);
      [0xff9ab8, 0xfff0a8, 0x9ae0c8, 0xa8c8ff].forEach((c, i) => g.fillStyle(c).fillRect(Math.round(W * 0.22), ry + Math.round(i * rh / 4), Math.round(W * 0.56), Math.ceil(rh / 4)));
      // рельсы
      const ty = H - 6;
      g.fillStyle(0x8d5a3b);
      for (let x = 1; x < W; x += 6) g.fillRect(x, ty, 3, 5);
      g.fillStyle(0x6b6b7b).fillRect(0, ty + 1, W, 1).fillRect(0, ty + 3, W, 1);

      // паровозик: гудит и делает круг; кукла может сесть в любой вагон
      const run = () => {
        if (s.trainRun) return;
        s.trainRun = true;
        s.tried('train');
        sfx.toot();
        const off = W + 150;
        for (const c of s.train) {
          const x0 = c.x;
          s.tweens.add({
            targets: c, x: x0 - off * 0.5, duration: 2300, ease: 'Sine.easeIn', onComplete: () => {
              c.x = x0 + off * 0.5;
              s.tweens.add({ targets: c, x: x0, duration: 2600, ease: 'Sine.easeOut', onComplete: () => { c.x = x0; if (c === s.train[0]) { s.trainRun = false; sfx.toot(); } } });
            },
          });
        }
      };
      s.train = ['toy train engine', 'train carriage', 'train carriage'].map((sub, i) => s.spr(sub, W * 0.5 - 30 + i * 30, H + 3, { sc: 2, drag: false, noFlip: true, ride: { seat: 13, go: run }, tap: run }));

      // живые игрушки
      const SOUND = { 'toy robot': sfx.beam, 'rubber duck': sfx.squeak, 'wind-up toy mouse': sfx.squeak, 'teddy bear': sfx.purr };
      ['teddy bear', 'toy robot', 'rag doll', 'nesting doll', 'wind-up toy mouse', 'rubber duck'].forEach((sub, i) => {
        const t = s.spr(sub, W * (0.3 + i * 0.09), GY + 8 + rs(i, Math.max(4, H - GY - 30)), { wisher: true, tap: (x) => { (SOUND[sub] || sfx.titter)(); s.dance(x); } });
        s.wander(t, WORLDS.toys.walk(s), { hops: true, speed: 16 });
      });
      // сундук: из него выскакивает игрушка-подарок
      const chest = s.img('big_chest', W * 0.86, GY + 12, { drag: false, noFlip: true });
      s.chest = chest;
      chest.tap = () => {
        s.tried('chest');
        if (s.time.now < (chest.cool || 0)) { sfx.boing(); return; }
        chest.cool = s.time.now + 1400;
        chest.setTexture('big_chestOpen');
        sfx.chestOut();
        s.gift(chest.x - 14, chest.y - 18);
        s.time.delayedCall(700, () => { if (chest.active) chest.setTexture('big_chest'); });
      };
      // попрыгунчик, мяч и лошадка-качалка
      s.spr('jack-in-the-box', W * 0.13, GY + 14, { sc: 2, noFlip: true, tap: (x) => { sfx.boing(); sfx.giggle(); s.fxSparks.explode(6, x.x, x.y - 30); s.jump(x, 18, 220); } });
      s.spr('beach ball', W * 0.6, GY + 16, { noFlip: true, kind: 'toy', tap: (b) => { sfx.boing(); s.jump(b, 20, 300, () => s.jump(b, 10, 220, () => s.jump(b, 4, 140))); } });
      const rock = (h) => {
        if (h.busy || h.dragging) return;
        h.busy = true;
        const x0 = h.x;
        s.act(h, { x: x0 + 3, duration: 170, yoyo: true, repeat: 5, ease: 'Sine.easeInOut', onRepeat: () => sfx.step(), onComplete: () => { h.x = x0; h.busy = false; } });
      };
      s.horse = s.spr('rocking horse', W * 0.72, GY + 18, { sc: 2, noFlip: true, ride: { seat: 13, go: rock }, tap: rock });
      // кубики: ставь один на другой — вырастет башня; тап по башне — она рассыпается
      s.blocks = [[0.19, 30], [0.245, 30], [0.3, 30], [0.215, 41], [0.27, 41]].map(([fx, dy], i) => {
        const b = s.img(`dw_block_${i}`, W * fx, GY + dy, { kind: 'toy', noFlip: true, block: true });
        b.tap = () => WORLDS.toys.topple(s, b);
        return b;
      });
    },
    walk: (s) => [24, s.W - 24, s.GY + 8, s.H - 22],
    /** Башня рассыпается (одиночный кубик просто подпрыгивает). */
    topple(s, b) {
      let r = b;
      while (r.above) r = r.above;
      if (!r.topB) { sfx.boing(); s.jump(b, 5, 130); return; }
      sfx.giggle();
      let c = r.topB;
      r.topB = null;
      for (let k = 0; c; k++) {
        const next = c.topB;
        const it = c;
        it.above = null;
        it.topB = null;
        s.halt(it);
        const tx = Math.round(Phaser.Math.Clamp(r.x + (k % 2 ? 1 : -1) * rnd(14, 38), 10, s.W - 10));
        s.act(it, { x: tx, duration: 380, ease: 'Quad.easeOut' });
        s.act(it, { y: Math.round(r.y + rnd(-3, 8)), duration: 480, ease: 'Bounce.easeOut', onComplete: () => sfx.thud() });
        c = next;
      }
      s.fxPoof.setParticleTint(0xffffff);
      s.fxPoof.explode(8, r.x, r.y - 20);
      s.jump(r, 3, 100);
    },
    /** Кубик сняли с башни (вместе с тем, что стоит на нём). */
    unstack(s, a) {
      if (!a.block || !a.above) return;
      a.above.topB = null;
      a.above = null;
    },
    /** Кубик отпустили над другим — он встаёт сверху. */
    drop(s, a) {
      if (!a.block) return false;
      const root = (b) => { while (b.above) b = b.above; return b; };
      const base = s.blocks
        .filter((b) => b !== a && b.active && !b.topB && !b.dragging && root(b) !== a && Math.abs(b.x - a.x) < 11 && a.y > b.y - 32 && a.y < b.y + 7)
        .sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x))[0];
      if (!base) return false;
      a.above = base;
      a.aboveDy = 15;
      base.topB = a;
      s.tried('blocks');
      sfx.click(); sfx.thud();
      let n = 1;
      for (let b = root(a); b.topB; b = b.topB) n++;
      s.fxSparks.explode(4 + n * 2, base.x, base.y - 20);
      if (n >= 3) s.fxHearts.explode(n - 1, base.x, base.y - 15 * n);
      // башня из всех кубиков — фанфары и подарок
      if (n === s.blocks.length) { sfx.fanfare(); s.gift(base.x + 24, base.y - 20); }
      return true;
    },
    update(s) {
      const e = s.train?.[0];
      if (e?.active && s.trainRun && Math.random() < 0.25) { s.fxPoof.setParticleTint(0xffffff); s.fxPoof.explode(1, e.x + 8, e.y - 30); }
    },
  },
};

export const WORLD_KEYS = Object.keys(WORLDS);
