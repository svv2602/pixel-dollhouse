// Кухня и ванная, вторая волна: блендер и коктейли, косметика, зубная щётка, пузыри.
// Всё рисуется в коде прямоугольниками, затем общий тёмный контур (как у мебели).
import { canvasFor } from './furniture.js';

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

/** Блендер 12×20: в кувшине слои ингредиентов (снизу вверх) или одна смешанная жидкость. */
function blender(layers = [], mixed = null) {
  return canvasFor(12, 20, (r) => {
    r(3, 0, 6, 2, '#9aa3b5'); r(3, 0, 6, 1, '#c9ccd8');                    // крышка
    r(2, 2, 8, 12, '#e6f7ff'); r(2, 2, 1, 12, '#ffffff'); r(9, 2, 1, 12, '#b8d8e8'); // кувшин
    r(10, 4, 2, 6, '#b8d8e8');                                              // ручка
    if (mixed !== null) r(3, 5, 6, 9, hex(mixed));
    else layers.forEach((c, i) => r(3, 11 - i * 3, 6, 3, hex(c)));
    r(1, 14, 10, 6, '#f27aa6'); r(1, 14, 10, 1, '#ffb0d0'); r(10, 15, 1, 5, '#d4558a'); // мотор
    r(4, 16, 4, 2, '#ffffff'); r(5, 16, 2, 2, '#7ad9b5');                   // кнопка
  });
}

/** Стакан коктейля 10×14 с соломинкой; цвет — смесь фруктов. */
function smoothie(color) {
  return canvasFor(10, 14, (r) => {
    r(6, 0, 1, 5, '#ff7ab8'); r(7, 0, 2, 1, '#ff7ab8');                     // соломинка
    r(1, 3, 8, 11, '#e6f7ff'); r(1, 3, 1, 11, '#ffffff');                   // стакан
    r(2, 5, 6, 8, hex(color)); r(2, 4, 6, 1, '#ffffff'); r(3, 5, 2, 1, '#ffffff'); // коктейль и пенка
    r(6, 0, 1, 5, '#ff7ab8');
  });
}

const tex = (scene, key, canvas) => {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, canvas);
  return key;
};

export function blenderTex(scene, layers, mixed = null) {
  const key = mixed !== null ? `blender_m${mixed.toString(16)}` : `blender_${layers.map((c) => c.toString(16)).join('_')}`;
  return tex(scene, key, blender(layers, mixed));
}

export function smoothieTex(scene, color) {
  return tex(scene, `smoothie_${color.toString(16)}`, smoothie(color));
}

/** Баночка аквагрима 10×12 с картинкой-подсказкой на этикетке. */
function paintJar(lid, pic) {
  return canvasFor(10, 12, (r) => {
    r(1, 0, 8, 3, lid); r(1, 0, 8, 1, '#ffffff');
    r(0, 3, 10, 9, '#ffffff'); r(9, 4, 1, 8, '#e3e3ef');
    pic(r);
  });
}

const MAKEUP_ITEMS = [
  {
    key: 'lipstick', subject: 'pink lipstick', makeup: 'lips',
    draw: () => canvasFor(6, 13, (r) => {
      r(1, 0, 3, 2, '#ff2f6d'); r(1, 1, 4, 4, '#ff2f6d'); r(1, 1, 1, 3, '#ff7aa0');  // помада
      r(0, 5, 6, 3, '#f2c94c'); r(0, 5, 6, 1, '#fff0a0');                         // ободок
      r(0, 8, 6, 5, '#c48ff2'); r(0, 8, 1, 5, '#e2ccff');                         // футляр
    }),
  },
  {
    key: 'blush', subject: 'blush compact', makeup: 'blush',
    draw: () => canvasFor(12, 8, (r) => {
      r(1, 0, 10, 8, '#ffffff'); r(0, 1, 12, 6, '#ffffff');
      r(2, 1, 8, 6, '#ff8fb0'); r(1, 2, 10, 4, '#ff8fb0'); r(3, 2, 3, 2, '#ffc0d4'); // румяна
    }),
  },
  {
    key: 'paint_whiskers', subject: 'cat face paint', makeup: 'whiskers',
    draw: () => paintJar('#2b1d2e', (r) => {
      r(4, 6, 2, 1, '#ff6f9a'); r(1, 6, 2, 1, '#2b1d2e'); r(7, 6, 2, 1, '#2b1d2e');
      r(1, 8, 2, 1, '#2b1d2e'); r(7, 8, 2, 1, '#2b1d2e');
    }),
  },
  {
    key: 'paint_hearts', subject: 'heart face paint', makeup: 'hearts',
    draw: () => paintJar('#ff3b6b', (r) => { r(2, 5, 2, 2, '#ff3b6b'); r(6, 5, 2, 2, '#ff3b6b'); r(3, 7, 4, 2, '#ff3b6b'); r(4, 9, 2, 1, '#ff3b6b'); }),
  },
  {
    key: 'paint_freckles', subject: 'freckle face paint', makeup: 'freckles',
    draw: () => paintJar('#b8703f', (r) => { for (const [x, y] of [[2, 5], [6, 5], [4, 7], [2, 9], [7, 8]]) r(x, y, 1, 1, '#b8703f'); }),
  },
];

export function makeSalon(scene) {
  const recs = [];
  const add = (key, canvas) => { tex(scene, key, canvas); tex(scene, `${key}_icon`, canvas); };

  add('blender', blender());
  recs.push({ id: 'blender', subject: 'fruit blender', cat: 'kitchen', tags: ['kitchen'], tex: 'blender', blender: true, bbox: [0, 0, 15, 15], order: 0 });
  // коктейль: в ящике не показывается — только из блендера; цвет хранится в предмете
  add('smoothie', smoothie(0xff9ac8));
  recs.push({ id: 'smoothie', subject: 'fruit smoothie', cat: 'drink', tags: ['edible', 'drink'], tex: 'smoothie', smoothie: true, bbox: [0, 0, 15, 15], hidden: true });

  MAKEUP_ITEMS.forEach((m, i) => {
    add(m.key, m.draw());
    recs.push({ id: m.key.replace('_', '-'), subject: m.subject, cat: 'toy', tags: ['toy'], tex: m.key, makeup: m.makeup, bbox: [0, 0, 15, 15], order: 20 + i });
  });

  add('toothbrush', canvasFor(16, 6, (r) => {
    r(0, 3, 11, 2, '#7ad9b5'); r(0, 3, 11, 1, '#a8f0d4');                     // ручка
    r(11, 2, 5, 3, '#ffffff'); for (let x = 11; x < 16; x += 2) r(x, 1, 1, 1, '#ffffff'); // щетинки
    r(12, 0, 3, 1, '#5ac4f2'); r(11, 1, 1, 1, '#5ac4f2');                    // паста
  }));
  recs.push({ id: 'toothbrush', subject: 'toothbrush', cat: 'toy', tags: ['toy'], tex: 'toothbrush', toothbrush: true, bbox: [0, 0, 15, 15], order: 26 });

  // концертный зал: микрофон, диско-шар (2 кадра блеска), иконка занавеса для подсказки
  add('microphone', canvasFor(7, 15, (r) => {
    r(1, 0, 5, 5, '#c9ccd8'); r(0, 1, 7, 3, '#c9ccd8'); r(1, 0, 5, 1, '#eef0f6');   // сетка
    r(2, 1, 1, 1, '#8a8fa3'); r(4, 1, 1, 1, '#8a8fa3'); r(3, 2, 1, 1, '#8a8fa3'); r(2, 3, 1, 1, '#8a8fa3'); r(4, 3, 1, 1, '#8a8fa3');
    r(1, 5, 5, 1, '#f2c94c');                                                       // ободок
    r(2, 6, 3, 9, '#ff7ab8'); r(2, 6, 1, 9, '#ffb0d0'); r(3, 9, 1, 2, '#ffffff');   // ручка с кнопкой
  }));
  recs.push({ id: 'microphone', subject: 'karaoke microphone', cat: 'toy', tags: ['toy'], tex: 'microphone', mic: true, bbox: [0, 0, 15, 15], order: 27 });
  const ball = (shift) => canvasFor(13, 20, (r) => {
    r(6, 0, 1, 7, '#8a8fa3');                                                       // подвес
    r(3, 7, 7, 13, '#c9ccd8'); r(1, 9, 11, 9, '#c9ccd8'); r(2, 8, 9, 11, '#c9ccd8'); r(0, 11, 13, 5, '#c9ccd8');
    const tile = ['#ffffff', '#9fdcff', '#ff9ac8', '#fff6a8', '#e6e8f0', '#b8f7cc'];
    for (let y = 8; y < 19; y += 2) for (let x = 1; x < 12; x += 2) {
      const dx = x - 6; const dy = y - 13;
      if (dx * dx + dy * dy <= 30) r(x, y, 1, 1, tile[(x + y + shift) % tile.length]);
    }
  });
  add('disco_ball', ball(0));
  tex(scene, 'disco_ball_b', ball(3));
  recs.push({ id: 'disco-ball', subject: 'disco ball', cat: 'toy', tags: ['toy'], tex: 'disco_ball', disco: true, wall: true, bbox: [0, 0, 15, 15], order: 28 });
  tex(scene, 'curtain_icon', canvasFor(14, 14, (r) => {
    r(0, 0, 14, 3, '#b8264a'); r(0, 3, 14, 1, '#ffd84a');
    r(0, 4, 5, 10, '#b8264a'); r(9, 4, 5, 10, '#b8264a'); r(2, 4, 1, 10, '#8e1838'); r(11, 4, 1, 10, '#8e1838');
    r(5, 4, 4, 10, '#3b2160'); r(6, 8, 2, 2, '#ffd84a');
  }));

  // большой пузырь 9×9 — кольцо с бликом (белый, тонируется цветом пены); лопается от касания
  if (!scene.textures.exists('bubble_big')) {
    const c = document.createElement('canvas');
    c.width = c.height = 9;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff';
    for (const [x, y, w, h] of [[3, 0, 3, 1], [3, 8, 3, 1], [0, 3, 1, 3], [8, 3, 1, 3], [1, 1, 2, 1], [6, 1, 2, 1], [1, 7, 2, 1], [6, 7, 2, 1],
      [1, 2, 1, 1], [7, 2, 1, 1], [1, 6, 1, 1], [7, 6, 1, 1], [2, 2, 2, 1], [2, 3, 1, 1]]) g.fillRect(x, y, w, h);
    scene.textures.addCanvas('bubble_big', c);
  }
  return recs;
}
