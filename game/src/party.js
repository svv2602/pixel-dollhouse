// День рождения: торт со слоями украшений, глазурь, посыпка, свечи, подарки, гирлянда.
// Всё рисуется в коде. Торт собирается из слоёв одного размера (20×20), которые накладываются друг на друга.
import { canvasFor } from './furniture.js';

const W = '#ffffff';

export const ICINGS = [
  { color: 'pink', hex: 0xff9ac8, body: '#ff7ab8' },
  { color: 'blue', hex: 0x9fdcff, body: '#5ac4f2' },
  { color: 'yellow', hex: 0xffe680, body: '#ffd84a' },
];
const GIFT_COLORS = [['#ff7ab8', '#ffe066'], ['#5ac4f2', '#ffffff'], ['#b47cf2', '#ffd84a']];

function layer(draw) {
  const c = document.createElement('canvas');
  c.width = 20; c.height = 20;
  const g = c.getContext('2d');
  draw((x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); });
  return c;
}

export function makeParty(scene) {
  const recs = [];
  const add = (key, canvas, icon = true) => {
    if (scene.textures.exists(key)) return;
    scene.textures.addCanvas(key, canvas);
    if (icon) scene.textures.addCanvas(`${key}_icon`, canvas);
  };
  // торт: основа (бисквит + тарелка) с контуром
  add('cake_base', canvasFor(18, 12, (r) => {
    r(1, 0, 16, 8, '#f2d39a'); r(1, 3, 16, 1, '#e8b04a'); r(1, 0, 1, 8, '#f7e2b8'); r(16, 0, 1, 8, '#d9b071');
    r(0, 9, 18, 3, W); r(0, 11, 18, 1, '#d6dfe8');
  }), true);
  // слои поверх основы (без контура, тот же размер и якорь, что у основы: 20×14)
  scene.textures.exists('cake_frost') || scene.textures.addCanvas('cake_frost', layer((r) => {
    r(2, 7, 16, 3, W); r(3, 6, 14, 1, W);
    for (const x of [3, 7, 11, 15]) r(x, 10, 1, 2, W);
    r(9, 11, 1, 1, W);
  }));
  scene.textures.exists('cake_sprinkles') || scene.textures.addCanvas('cake_sprinkles', layer((r) => {
    const cols = ['#ef5a6f', '#5ac4f2', '#7ad9b5', '#ffd84a', '#b47cf2'];
    [[4, 7], [7, 8], [10, 7], [13, 8], [16, 7], [6, 6], [12, 6], [9, 9], [14, 9], [5, 9]].forEach(([x, y], i) => r(x, y, 1, 1, cols[i % cols.length]));
  }));
  scene.textures.exists('cake_candles') || scene.textures.addCanvas('cake_candles', layer((r) => {
    for (const [x, col] of [[5, '#ff7ab8'], [10, '#5ac4f2'], [15, '#ffd84a']]) { r(x, 2, 1, 5, col); r(x, 2, 1, 1, W); }
  }));
  scene.textures.exists('cake_flames') || scene.textures.addCanvas('cake_flames', layer((r) => {
    for (const x of [5, 10, 15]) { r(x, 1, 1, 1, '#ffe066'); r(x, 0, 1, 1, '#ff9a3c'); }
  }));
  recs.push({ id: 'party-cake', subject: 'party cake', cat: 'food', tags: ['edible'], tex: 'cake_base', cake: true, bbox: [0, 0, 17, 11], order: 0 });

  ICINGS.forEach((ic, i) => {
    add(`icing_${ic.color}`, canvasFor(8, 14, (r) => {
      r(2, 0, 2, 3, W); r(1, 3, 4, 1, '#c9ccd8');                    // носик
      r(0, 4, 6, 10, ic.body); r(0, 4, 6, 1, W); r(5, 5, 1, 9, '#00000022');
      r(1, 7, 2, 2, W);
    }));
    recs.push({ id: `icing-${ic.color}`, subject: `${ic.color} icing`, cat: 'food', tags: [], tex: `icing_${ic.color}`, icing: ic.hex, bbox: [0, 0, 15, 15], order: 1 + i });
  });
  add('sprinkles_jar', canvasFor(10, 13, (r) => {
    r(1, 0, 8, 3, '#ff7ab8'); r(1, 0, 8, 1, '#ffb0d0');
    r(0, 3, 10, 10, '#eaf6ff');
    const cols = ['#ef5a6f', '#5ac4f2', '#7ad9b5', '#ffd84a', '#b47cf2'];
    for (let i = 0; i < 16; i++) r(1 + (i * 3) % 8, 5 + Math.floor(i / 3) % 7, 1, 1, cols[i % 5]);
  }));
  recs.push({ id: 'sprinkles', subject: 'sprinkles', cat: 'food', tags: [], tex: 'sprinkles_jar', sprinkles: true, bbox: [0, 0, 15, 15], order: 4 });
  add('candle_box', canvasFor(12, 12, (r) => {
    for (const [x, col] of [[2, '#ff7ab8'], [5, '#5ac4f2'], [8, '#ffd84a']]) { r(x, 0, 2, 6, col); r(x, 0, 2, 1, W); }
    r(0, 5, 12, 7, '#f2c94c'); r(0, 5, 12, 1, '#ffe680'); r(4, 8, 4, 2, '#c99a2e');
  }));
  recs.push({ id: 'candles', subject: 'birthday candles', cat: 'food', tags: [], tex: 'candle_box', candles: true, bbox: [0, 0, 15, 15], order: 5 });

  GIFT_COLORS.forEach(([box, ribbon], i) => {
    add(`gift_${i}`, canvasFor(14, 14, (r) => {
      r(0, 4, 14, 10, box); r(0, 4, 14, 1, W + '88');
      r(6, 4, 2, 10, ribbon); r(0, 7, 14, 2, ribbon);
      r(3, 0, 3, 4, ribbon); r(8, 0, 3, 4, ribbon); r(6, 2, 2, 2, ribbon);         // бант
    }));
    recs.push({ id: `gift-${i}`, subject: 'gift box', cat: 'toy', tags: ['toy'], tex: `gift_${i}`, gift: true, bbox: [0, 0, 15, 15], order: 20 + i });
  });
  add('garland', canvasFor(44, 9, (r) => {
    for (let x = 0; x < 44; x++) r(x, Math.round(2 * Math.sin((x / 43) * Math.PI)), 1, 1, '#8d5a3b');
    const cols = ['#ff7ab8', '#ffd84a', '#5ac4f2', '#7ad9b5', '#b47cf2'];
    for (let i = 0; i < 6; i++) {
      const x0 = 2 + i * 7;
      const y0 = 1 + Math.round(2 * Math.sin(((x0 + 2) / 43) * Math.PI));
      for (let k = 0; k < 4; k++) r(x0 + Math.floor(k / 2), y0 + k, 5 - k, 1, cols[i % cols.length]);
    }
  }));
  recs.push({ id: 'garland', subject: 'party garland', cat: 'toy', tags: ['toy'], tex: 'garland', bbox: [0, 0, 15, 15], order: 23 });
  return recs;
}

// «С днём рождения» (народная мелодия, общественное достояние): [нота в полутонах от C4, длительность в долях]
export const BIRTHDAY_TUNE = [
  [7, 0.75], [7, 0.25], [9, 1], [7, 1], [12, 1], [11, 2],
  [7, 0.75], [7, 0.25], [9, 1], [7, 1], [14, 1], [12, 2],
  [7, 0.75], [7, 0.25], [19, 1], [16, 1], [12, 1], [11, 1], [9, 2],
  [17, 0.75], [17, 0.25], [16, 1], [12, 1], [14, 1], [12, 2],
];
