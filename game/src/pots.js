// Котёл в каждой локации. Это тот же волшебный котёл, что на кухне дома: те же рецепты, тот же альбом —
// только свой вид: чугунок на печке у бабушки во дворе, большая кастрюля в кафе, котелок на костре на острове,
// медный таз на полосатой тележке среди аттракционов парка.
// Новой механики здесь нет — ребёнок узнаёт знакомую вещь и сразу знает, что делать.
// Рецепты (alchemy.js) помечены местом: подсказка-облачко над куклой выбирает рецепт из того,
// что можно достать там, где она стоит, а альбом котла сгруппирован по местам.
import { canvasFor, iconFrom } from './furniture.js';
import { R, PLACES } from './places.js';

/** Где чей котёл: локация -> запись каталога, комната и место в ней (доля ширины; dy — от линии пола). */
export const POTS = {
  village: { id: 'ironpot', room: 'yard', fx: 0.44, dy: 12 }, // между сараем и курятником
  city: { id: 'cafepot', room: 'cafe', fx: 0.54, dy: 10 }, // рядом со стойкой
  sea: { id: 'campot', room: 'island', fx: 0.5, dy: 14 },
  park: { id: 'fairpot', room: 'rides', fx: 0.41, dy: 10 }, // между каруселью и силомером
  center: { id: 'flaskpot', room: 'school', fx: 0.92, dy: 14 }, // кабинет химии в углу класса
};
/** Значки групп в альбоме котла: локации, «привези издалека» и свои открытия. */
export const RECIPE_GROUPS = [...PLACES.map((p) => [p.key, p.icon]), ['far', 'busstop_icon'], ['own', 'big_cauldron_icon']];

/** Чугунок на дворовой печке. */
const ironPot = (alt) => canvasFor(26, 30, (r) => {
  r(1, 14, 24, 16, '#c8644a'); r(1, 14, 24, 1, '#e08a6e'); r(23, 14, 2, 16, '#a04a36'); // печка из кирпича
  for (let y = 18; y < 30; y += 4) r(1, y, 24, 1, '#a04a36');
  for (let y = 15, k = 0; y < 30; y += 4, k++) for (let x = 4 + (k % 2) * 4; x < 25; x += 8) r(x, y, 1, 3, '#a04a36');
  r(8, 20, 10, 8, '#3a3040'); // топка
  const f = alt ? [[10, 23, 2, 5], [13, 22, 2, 6]] : [[9, 22, 2, 6], [12, 24, 2, 4], [15, 23, 2, 5]];
  for (const [x, y, w, h] of f) { r(x, y, w, h, '#f2955a'); r(x, y + 2, 1, h - 2, '#ffd84a'); }
  r(0, 12, 26, 2, '#8f96b0');
  r(6, 3, 14, 2, '#5a5068'); r(5, 5, 16, 7, '#3a3040'); r(5, 5, 1, 6, '#5a5068'); r(3, 6, 2, 2, '#5a5068'); r(21, 6, 2, 2, '#5a5068'); // чугунок
  r(8, 3, 10, 1, '#9ff5b8'); r(10, 2, 2, 1, '#c8ffd8'); r(15, 1, 1, 1, '#c8ffd8');
});

/** Большая кастрюля на плитке в кафе. */
const cafePot = (alt) => canvasFor(26, 30, (r) => {
  r(2, 16, 22, 14, '#ff9ac8'); r(2, 16, 22, 1, '#ffd0e4'); r(22, 16, 2, 14, '#d97aa5'); r(2, 27, 22, 3, '#d97aa5'); // тумба
  for (let x = 6; x < 22; x += 6) r(x, 19, 2, 6, '#ffd0e4');
  r(4, 13, 18, 3, '#5a5068'); r(4, 13, 18, 1, '#8f96b0'); // плитка
  r(alt ? 9 : 8, 14, 3, 1, '#f2955a'); r(alt ? 14 : 15, 14, 3, 1, '#f2955a');
  r(5, 3, 16, 10, '#d8dcec'); r(5, 3, 16, 1, '#ffffff'); r(19, 3, 2, 10, '#8f96b0'); r(7, 5, 1, 6, '#ffffff'); // кастрюля
  r(2, 5, 3, 2, '#8f96b0'); r(21, 5, 3, 2, '#8f96b0');
  r(6, 2, 14, 1, '#9ff5b8'); r(9, 1, 2, 1, '#c8ffd8'); r(15, 0, 1, 1, '#c8ffd8');
});

/** Котелок на костре (alt — второй кадр огня). */
const camPot = (alt) => canvasFor(26, 30, (r) => {
  for (let i = 0; i < 22; i++) { r(2 + Math.round(i * 0.5), 2 + i, 1, 1, '#8d5a3b'); r(23 - Math.round(i * 0.5), 2 + i, 1, 1, '#8d5a3b'); } // тренога
  r(12, 0, 2, 9, '#8f96b0'); r(10, 1, 6, 1, '#8d5a3b');
  r(6, 9, 14, 2, '#5a5068'); r(7, 11, 12, 7, '#3a3040'); r(8, 18, 10, 1, '#3a3040'); r(7, 11, 1, 6, '#5a5068');
  r(8, 9, 10, 1, '#9ff5b8'); r(10, 8, 2, 1, '#c8ffd8'); r(15, 7, 1, 1, '#c8ffd8');
  r(4, 26, 18, 2, '#8d5a3b'); r(6, 24, 14, 2, '#a8714d'); r(2, 28, 22, 2, '#b8bccc'); // дрова и камни
  const f = alt ? [[9, 20, 3, 5], [13, 19, 3, 6], [16, 22, 2, 3]] : [[8, 21, 3, 4], [12, 20, 3, 5], [15, 19, 3, 6]];
  for (const [x, y, w, h] of f) { r(x, y, w, h, '#f2955a'); r(x + 1, y + 2, 1, h - 2, '#ffd84a'); }
});

/** Медный таз на полосатой тележке со сладостями (alt — второй кадр огня). */
const fairPot = (alt) => canvasFor(26, 30, (r) => {
  r(2, 17, 22, 9, '#ef5a6f'); for (let x = 5; x < 24; x += 6) r(x, 17, 3, 9, '#ffffff'); r(2, 17, 22, 1, '#ffd0d8'); r(2, 25, 22, 1, '#b8342c'); // тележка
  r(4, 26, 5, 4, '#3a3040'); r(17, 26, 5, 4, '#3a3040'); r(6, 27, 1, 2, '#8f96b0'); r(19, 27, 1, 2, '#8f96b0');
  r(8, 14, 10, 3, '#5a5068'); r(alt ? 10 : 9, 15, 3, 1, '#f2955a'); r(alt ? 13 : 14, 15, 3, 1, '#f2955a'); // горелка
  r(4, 5, 18, 2, '#e0a971'); r(5, 7, 16, 6, '#c98a52'); r(6, 13, 14, 1, '#a8693c'); r(5, 7, 1, 5, '#e0a971'); r(1, 6, 3, 2, '#a8693c'); r(22, 6, 3, 2, '#a8693c'); // таз
  r(6, 4, 14, 1, '#9ff5b8'); r(9, 3, 2, 1, '#c8ffd8'); r(15, 2, 1, 1, '#c8ffd8');
  r(alt ? 11 : 12, 0, 3, 2, '#ffd0e4'); // сладкий пар
});

/** Колба на лабораторном столике в школе (alt — второй кадр огонька горелки). */
const flaskPot = (alt) => canvasFor(26, 30, (r) => {
  r(1, 18, 24, 3, '#c98a52'); r(1, 18, 24, 1, '#e0a971'); r(3, 21, 2, 9, '#a8693c'); r(21, 21, 2, 9, '#a8693c'); // столик
  r(9, 15, 8, 3, '#5a5068'); r(alt ? 11 : 12, 13, 2, 2, '#5ac4f2'); r(alt ? 13 : 12, 12, 1, 1, '#bfe6ff'); // горелка
  // колба: круглое донышко, горлышко
  for (let y = -6; y <= 6; y++) for (let x = -7; x <= 7; x++) if (x * x + y * y <= 44) r(13 + x, 6 + y, 1, 1, y < -1 ? '#e6f6ff' : '#9ff5b8');
  r(11, -2, 4, 3, '#e6f6ff'); r(10, -3, 6, 1, '#ffffff'); r(8, 4, 2, 2, '#ffffff');
  r(16, 3, 1, 1, '#c8ffd8'); r(12, 1, 1, 1, '#c8ffd8'); r(alt ? 13 : 14, -5, 1, 1, '#c8ffd8'); // пузырьки
  r(19, 14, 4, 4, '#ff9ac8'); r(20, 12, 2, 2, '#ffd0e4'); // пробирка рядом
});

export function makePots(scene) {
  const T = scene.textures;
  const add = (key, canvas, icon = true) => {
    if (T.exists(key)) return;
    T.addCanvas(key, canvas);
    if (icon) T.addCanvas(`${key}_icon`, iconFrom(canvas, false));
  };
  const big = (id, subject, order) => ({ id, subject, cat: 'furniture', tags: ['furniture'], tex: id, bbox: [0, 0, 15, 15], order, beh: { cauldron: true, firepot: true } });
  const recs = [];
  for (const [id, draw, subject, order] of [['ironpot', ironPot, 'granny cauldron', 63], ['cafepot', cafePot, 'cafe cauldron', 91], ['campot', camPot, 'campfire cauldron', 109], ['fairpot', fairPot, 'fairground cauldron', 136], ['flaskpot', flaskPot, 'science cauldron', 149]]) {
    add(id, draw(false));
    add(`${id}_b`, draw(true), false);
    recs.push(big(id, subject, order));
  }
  return recs;
}

export function installPots(Room, { L }) {
  Object.assign(Room.prototype, {
    /** Котёл каждой локации один раз встаёт на своё место — и в старых сохранениях. */
    ensurePots() {
      const done = (this.flags.pots ||= {});
      let added = false;
      for (const [place, p] of Object.entries(POTS)) {
        if (done[place]) continue;
        done[place] = 1;
        added = true;
        this.spawnItem(this.byId.get(p.id), Math.round(R[p.room] * L.W + L.W * p.fx), L.FLOOR_TOP + p.dy);
      }
      if (added) this.save();
    },

    /** Вызывается из create(): огонь под котлами горит (два кадра), пока котёл видно. */
    initPots() {
      this.time.addEvent({
        delay: 260, loop: true, callback: () => {
          for (const o of this.objs) {
            if (!o.beh?.firepot || !this.visible(o)) continue;
            o.fireB = !o.fireB;
            o.setTexture(o.fireB ? `${o.rec.tex}_b` : o.rec.tex);
          }
        },
      });
    },
  });
}
