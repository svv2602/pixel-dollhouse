// Ванная: мелкие предметы, нарисованные в коде (фен, пена), и текстуры пятен/пены.
import { canvasFor } from './furniture.js';

export const FOAMS = [
  { color: 'pink', hex: 0xff9ac8, body: '#ff7ab8', dark: '#e0559a' },
  { color: 'blue', hex: 0x9fdcff, body: '#5ac4f2', dark: '#2f96cc' },
  { color: 'green', hex: 0xb8f7cc, body: '#5fe08a', dark: '#38b866' },
];

function foamBottle(f) {
  return canvasFor(10, 15, (r) => {
    r(4, 0, 2, 2, '#c9ccd8'); r(2, 1, 4, 1, '#c9ccd8');            // дозатор
    r(3, 2, 4, 2, '#eaf6ff');
    r(1, 4, 8, 11, f.body); r(1, 4, 8, 1, '#ffffff'); r(8, 5, 1, 10, f.dark);
    r(3, 7, 2, 2, '#ffffff'); r(5, 10, 1, 1, '#ffffff'); r(2, 12, 1, 1, '#ffffff'); // пузырьки на этикетке
  });
}

function dryer() {
  return canvasFor(15, 14, (r) => {
    r(1, 1, 9, 7, '#f49ac1'); r(0, 2, 11, 5, '#f49ac1'); r(1, 1, 9, 1, '#ffd0e4');    // корпус
    r(11, 3, 4, 3, '#d97aa5');                                                        // сопло
    r(3, 3, 3, 3, '#ffd0e4'); r(4, 4, 1, 1, '#d97aa5');                              // решётка
    r(5, 8, 3, 6, '#d97aa5'); r(5, 8, 1, 6, '#f49ac1');                              // ручка
    r(6, 10, 1, 1, '#ffffff');
  });
}

/** Пятна (белые — тонируются цветом грязи/краски): для персонажа 22×36 и для питомца/предмета 16×16. */
function stains(w, h, spots) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  for (const [x, y, s] of spots) {
    g.fillRect(x, y, s, s);
    if (s > 1) { g.fillRect(x + 1, y - 1, 1, 1); g.fillRect(x - 1, y + 1, 1, 1); }
  }
  return c;
}

export function makeBath(scene) {
  const recs = [];
  const add = (key, canvas) => {
    if (scene.textures.exists(key)) return;
    scene.textures.addCanvas(key, canvas);
    scene.textures.addCanvas(`${key}_icon`, canvas);
  };
  add('hairdryer', dryer());
  recs.push({ id: 'hair-dryer', subject: 'hair dryer', cat: 'toy', tags: ['toy'], tex: 'hairdryer', dryer: true, bbox: [0, 0, 15, 15], order: 10 });
  FOAMS.forEach((f, i) => {
    add(`foam_${f.color}`, foamBottle(f));
    recs.push({ id: `foam-${f.color}`, subject: `${f.color} bubble bath`, cat: 'toy', tags: ['toy'], tex: `foam_${f.color}`, foam: f.hex, bbox: [0, 0, 15, 15], order: 11 + i });
  });
  if (!scene.textures.exists('stain_char')) {
    scene.textures.addCanvas('stain_char', stains(22, 36, [[7, 9, 2], [14, 6, 1], [8, 17, 2], [13, 20, 2], [10, 24, 1], [7, 27, 2], [15, 26, 2], [11, 30, 1], [6, 22, 1]]));
    scene.textures.addCanvas('stain_pet', stains(16, 16, [[4, 6, 2], [10, 9, 2], [7, 12, 1], [12, 4, 1], [5, 11, 1]]));
    // пена — бугристая шапка поверх воды (белая, тонируется цветом пены)
    scene.textures.addCanvas('foam', canvasFor(40, 7, (r) => {
      const bumps = [[0, 4, 6], [5, 2, 7], [11, 3, 6], [16, 1, 8], [23, 3, 6], [28, 2, 7], [34, 4, 6]];
      for (const [x, y, w] of bumps) { r(x, y, w, 7 - y, '#ffffff'); r(x + 1, y - 1, w - 2, 1, '#ffffff'); }
      r(0, 5, 40, 2, '#ffffff');
    }));
    scene.textures.addCanvas('bubble_p', canvasFor(3, 3, (r) => { r(1, 0, 1, 1, '#ffffff'); r(0, 1, 1, 1, '#ffffff'); r(2, 1, 1, 1, '#ffffff'); r(1, 2, 1, 1, '#ffffff'); }));
  }
  return recs;
}
