// Рисунки игровой комнаты (дом, шестая комната): лошадка-качалка, шалаш, сухой бассейн с шариками,
// кукольный театр и его куклы-перчатки, значок «обои». Всё рисуется кодом, как мебель в furniture.js.
import { canvasFor, iconFrom } from './furniture.js';

export const BALLS = ['#ff5a7a', '#ffd84a', '#5ac4f2', '#7ad9b5', '#c48ff2', '#ff9a4a'];

const rockhorse = () => canvasFor(30, 23, (r) => {
  // полозья-дуга
  for (let x = 0; x < 30; x++) {
    const y = 19 + Math.round(((x - 14.5) / 14.5) ** 2 * 3);
    r(x, y - 3, 1, 2, '#b8743a'); r(x, y - 1, 1, 1, '#8d5a3b');
  }
  r(7, 14, 2, 4, '#8d5a3b'); r(21, 14, 2, 4, '#8d5a3b');          // ножки
  r(6, 8, 18, 7, '#fff8f0'); r(6, 13, 18, 2, '#e8dcd0');            // туловище
  r(11, 7, 8, 3, '#ff7ab8'); r(11, 7, 8, 1, '#ffb3d6');             // седло
  r(13, 10, 4, 3, '#ff7ab8');                                        // попона
  r(21, 2, 6, 8, '#fff8f0'); r(24, 4, 5, 4, '#fff8f0');             // шея и голова
  r(27, 6, 2, 1, '#2b1d2e'); r(25, 4, 1, 1, '#2b1d2e');              // ноздря и глаз
  r(21, 0, 2, 3, '#ffd84a'); r(19, 2, 2, 6, '#ffd84a'); r(20, 3, 1, 6, '#f2b84a'); // грива
  r(2, 8, 4, 2, '#ffd84a'); r(1, 10, 3, 4, '#ffd84a');              // хвост
  r(23, 1, 1, 2, '#fff8f0');                                         // ушко
});

const tent = (lights) => canvasFor(32, 30, (r) => {
  for (let y = 4; y < 30; y++) {
    const hw = Math.round((y - 3) * 0.6);
    for (let x = -hw; x <= hw; x++) r(16 + x, y, 1, 1, Math.floor((x + 40) / 4) % 2 ? '#ff9ab8' : '#fff4f8');
  }
  // вход: тёмный треугольник посередине
  for (let y = 15; y < 30; y++) { const hw = Math.round((y - 14) * 0.45); r(16 - hw, y, hw * 2 + 1, 1, '#5a2b4a'); }
  r(16, 0, 1, 5, '#8d5a3b'); r(13, 1, 1, 3, '#8d5a3b'); r(19, 1, 1, 3, '#8d5a3b'); // жерди
  r(17, 0, 4, 2, '#ffd84a');                                                         // флажок
  if (lights) {
    for (let y = 6, k = 0; y < 30; y += 3, k++) {
      const hw = Math.round((y - 3) * 0.6);
      r(16 - hw, y, 1, 1, ['#ffd84a', '#5ac4f2', '#ff5a7a'][k % 3]);
      r(16 + hw, y, 1, 1, ['#7ad9b5', '#ffd84a', '#c48ff2'][k % 3]);
    }
    r(14, 22, 1, 1, '#ffe98a'); r(18, 25, 1, 1, '#ffe98a'); r(15, 27, 1, 1, '#ffe98a'); // огоньки внутри
  }
});

const ballpit = () => canvasFor(42, 15, (r) => {
  r(0, 4, 42, 11, '#5ac4f2'); r(0, 4, 42, 2, '#8fd3ff'); r(0, 13, 42, 2, '#2f96cc'); // бортик
  for (let x = 2, k = 0; x < 40; x += 3, k++) r(x, 1 + (k % 2), 2, 2, BALLS[(k * 7) % BALLS.length]);   // шарики сверху
  for (let x = 1, k = 0; x < 41; x += 3, k++) r(x, 3 - (k % 2), 2, 2, BALLS[(k * 5 + 2) % BALLS.length]);
  for (let x = 4; x < 40; x += 7) r(x, 8, 3, 3, '#fff8f0');                          // кружочки на бортике
});

const theater = (open) => canvasFor(32, 38, (r) => {
  r(0, 18, 32, 20, '#c98a52'); r(0, 18, 32, 2, '#e0a870'); r(0, 36, 32, 2, '#8d5a3b'); // тумба
  for (let x = 3; x < 30; x += 7) r(x, 23, 4, 10, '#b8743a');
  r(2, 2, 28, 16, open ? '#3b2160' : '#ef5a6f');                                       // сцена или занавес
  if (!open) { r(15, 2, 2, 16, '#b8264a'); for (let x = 4; x < 29; x += 4) r(x, 2, 1, 16, '#d8406a'); }
  else { r(2, 2, 5, 16, '#ef5a6f'); r(25, 2, 5, 16, '#ef5a6f'); r(5, 2, 1, 16, '#b8264a'); r(26, 2, 1, 16, '#b8264a'); }
  r(0, 0, 32, 3, '#ffd84a'); r(0, 0, 32, 1, '#fff0a0');                                // арка
  r(0, 2, 2, 16, '#c98a52'); r(30, 2, 2, 16, '#c98a52');
  r(13, 20, 6, 3, '#ffd84a');                                                          // звёздочка-табличка
});

/** Куклы-перчатки: зайка и мишка. */
const puppet = (bear) => canvasFor(9, 12, (r) => {
  const fur = bear ? '#c98a52' : '#fff8f0';
  const dark = bear ? '#8d5a3b' : '#f2c4d6';
  if (bear) { r(1, 2, 2, 2, fur); r(6, 2, 2, 2, fur); } else { r(2, 0, 2, 4, fur); r(5, 0, 2, 4, fur); r(3, 1, 1, 2, dark); r(5, 1, 1, 2, dark); }
  r(1, 3, 7, 5, fur); r(3, 5, 1, 1, '#2b1d2e'); r(5, 5, 1, 1, '#2b1d2e'); r(4, 6, 1, 1, dark);
  r(2, 8, 5, 4, bear ? '#5ac4f2' : '#ff7ab8'); r(0, 8, 2, 2, fur); r(7, 8, 2, 2, fur);
});

/** Значок «обои и пол»: кусочек полосатой стены над клетчатым полом. */
const decorIcon = () => canvasFor(12, 12, (r) => {
  for (let x = 0; x < 12; x += 3) r(x, 0, 2, 7, '#ff9ab8'), r(x + 2, 0, 1, 7, '#fff4f8');
  for (let y = 7; y < 12; y += 2) for (let x = (y % 4 === 3 ? 0 : 2); x < 12; x += 4) r(x, y, 2, 2, '#5ac4f2');
  r(0, 7, 12, 1, '#8d5a78');
});

export function makePlayroomArt(scene) {
  const T = scene.textures;
  const add = (key, canvas, icon = true) => {
    if (T.exists(key)) return;
    T.addCanvas(key, canvas);
    if (icon) T.addCanvas(`${key}_icon`, iconFrom(canvas, false));
  };
  add('rockhorse', rockhorse());
  add('tent', tent(false));
  add('tent_b', tent(true), false);
  add('ballpit', ballpit());
  add('puppets', theater(false));
  add('puppets_open', theater(true), false);
  add('puppet_bunny', puppet(false), false);
  add('puppet_bear', puppet(true), false);
  add('decor', decorIcon(), false);
  add('decor_icon', decorIcon(), false);

  // валик из каталога красит стены и пол комнат дома (decor.js)
  const roller = scene.items?.find((x) => x.subject === 'paint roller');
  if (roller) roller.beh = { roller: true };

  const big = (id, subject, beh, order, extra = {}) => ({ id, subject, cat: 'furniture', tags: ['furniture'], tex: id, bbox: [0, 0, 15, 15], order, beh, ...extra });
  // названия подобраны так, чтобы правила behaviorOf() по словам (chair, bed, chest, curtain…) их не цепляли
  return [
    big('rockhorse', 'rocking horse toy', { rocker: true, perch: { dy: 14, lo: -4, hi: 1 } }, 140),
    big('tent', 'play teepee', { tent: true, perch: { dy: 3, lo: -6, hi: 6, behind: true } }, 141),
    big('ballpit', 'ball pit', { pit: true, perch: { dy: 6, lo: -15, hi: 15, behind: true } }, 142),
    big('puppets', 'puppet show booth', { puppets: true }, 143),
  ];
}
