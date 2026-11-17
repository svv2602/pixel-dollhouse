// «Мой дом»: обои и пол. Валик (paint roller из каталога; один лежит в игровой) отпустили на стену комнаты дома —
// стена получает следующие обои, на пол — следующий пол. Последний вариант в круге — «как было».
// Рисунок кладётся поверх фона комнаты отдельной запечённой картинкой (окна, двери и мебель остаются сверху).
// Выбор хранится в сохранении: flags.decor[комната] = [обои, пол] (0 — родной рисунок комнаты).
import { R, roomAt } from './places.js';

/** Где можно клеить обои: комнаты дома с обычными стенами (у зала — занавес, сад — на улице). */
export const DECOR_ROOMS = ['bedroom', 'kitchen', 'bath', 'playroom'];

const dots = (g, x0, W, top, bottom, col, step, dx = 0) => {
  g.fillStyle(col);
  for (let y = top + 4, r = 0; y < bottom - 4; y += step, r++) for (let x = (r % 2 ? step / 2 : 0) + 3 + dx; x < W; x += step) g.fillRect(x0 + x, y, 2, 2);
};
const heart = (g, x, y) => g.fillRect(x, y, 2, 1).fillRect(x + 3, y, 2, 1).fillRect(x, y + 1, 5, 1).fillRect(x + 1, y + 2, 3, 1).fillRect(x + 2, y + 3, 1, 1);
const star = (g, x, y) => g.fillRect(x + 2, y, 1, 5).fillRect(x, y + 2, 5, 1).fillRect(x + 1, y + 1, 3, 3);
const cloud = (g, x, y) => g.fillRect(x, y + 2, 12, 3).fillRect(x + 2, y, 6, 2).fillRect(x + 7, y + 1, 3, 1);
const flower = (g, x, y, c) => { g.fillStyle(c).fillRect(x + 1, y, 2, 1).fillRect(x, y + 1, 4, 2).fillRect(x + 1, y + 3, 2, 1); g.fillStyle(0xffd84a).fillRect(x + 1, y + 1, 2, 2); };

/** Обои: рисуют стену от потолка до плинтуса (FLOOR_TOP - 2). */
const WALLS = [
  // мятные полоски
  (g, x0, W, h) => { g.fillStyle(0xe2f7ee).fillRect(x0, 0, W, h); g.fillStyle(0xbfeedd); for (let x = 0; x < W; x += 10) g.fillRect(x0 + x, 0, 4, h); },
  // лимонные в белый горошек
  (g, x0, W, h) => { g.fillStyle(0xfff3b0).fillRect(x0, 0, W, h); dots(g, x0, W, 0, h, 0xffffff, 10); },
  // розовые с сердечками
  (g, x0, W, h) => { g.fillStyle(0xffe0ec).fillRect(x0, 0, W, h); g.fillStyle(0xff8fb5); for (let y = 6, r = 0; y < h - 8; y += 13, r++) for (let x = r % 2 ? 11 : 3; x < W - 5; x += 16) heart(g, x0 + x, y); },
  // сиреневые со звёздами
  (g, x0, W, h) => { g.fillStyle(0xe6dcff).fillRect(x0, 0, W, h); g.fillStyle(0xffd84a); for (let y = 5, r = 0; y < h - 8; y += 14, r++) for (let x = r % 2 ? 12 : 4; x < W - 5; x += 18) star(g, x0 + x, y); },
  // небо с облаками
  (g, x0, W, h) => { g.fillStyle(0xc8ecff).fillRect(x0, 0, W, h); g.fillStyle(0xffffff); for (let y = 6, r = 0; y < h - 8; y += 15, r++) for (let x = r % 2 ? 20 : 4; x < W - 12; x += 34) cloud(g, x0 + x, y); },
  // персиковые в цветочек
  (g, x0, W, h) => { g.fillStyle(0xffe6d2).fillRect(x0, 0, W, h); for (let y = 5, r = 0; y < h - 6; y += 12, r++) for (let x = r % 2 ? 9 : 2; x < W - 4; x += 14) flower(g, x0 + x, y, [0xff7ab8, 0x5ac4f2, 0xc48ff2][(r + x) % 3]); },
];

/** Полы: от плинтуса до низа комнаты. */
const FLOORS = [
  // розово-белая клетка
  (g, x0, W, top, h) => { for (let y = top, r = 0; y < top + h; y += 6, r++) for (let x = 0, c = r % 2; x < W; x += 6, c ^= 1) g.fillStyle(c ? 0xffffff : 0xffc4da).fillRect(x0 + x, y, 6, 6); },
  // разноцветные коврики-пазлы
  (g, x0, W, top, h) => { const cs = [0xff9ab8, 0xffd84a, 0x8fd3ff, 0x9ee6c4]; for (let y = top, r = 0; y < top + h; y += 10, r++) for (let x = 0, k = r; x < W; x += 10, k++) { g.fillStyle(cs[k % 4]).fillRect(x0 + x, y, 10, 10); g.fillStyle(cs[(k + 1) % 4]).fillRect(x0 + x + 4, y, 2, 1).fillRect(x0 + x, y + 4, 1, 2); } },
  // голубой ковёр с ворсинками
  (g, x0, W, top, h) => { g.fillStyle(0x8fb8f2).fillRect(x0, top, W, h); g.fillStyle(0xa8ccff); for (let y = top + 1, r = 0; y < top + h; y += 3, r++) for (let x = (r * 5) % 7; x < W; x += 7) g.fillRect(x0 + x, y, 1, 1); },
  // светлая «ёлочка»
  (g, x0, W, top, h) => { g.fillStyle(0xf0d2a8).fillRect(x0, top, W, h); g.fillStyle(0xd8b07c); for (let y = top, r = 0; y < top + h; y += 4, r++) for (let x = (r % 2) * 6; x < W; x += 12) g.fillRect(x0 + x, y, 6, 1).fillRect(x0 + x + 6, y + 2, 1, 2); },
  // травяной ковёр
  (g, x0, W, top, h) => { g.fillStyle(0x9ad873).fillRect(x0, top, W, h); g.fillStyle(0x7cc25a); for (let y = top + 1, r = 0; y < top + h; y += 3, r++) for (let x = (r % 2) * 3; x < W; x += 6) g.fillRect(x0 + x, y, 1, 2); },
];

export function installDecor(Room, { L, sfx }) {
  Object.assign(Room.prototype, {
    /** Вызывается из create(): нарисовать выбранные обои и полы. */
    initDecor() {
      this.decorImgs = {};
      for (const key of Object.keys(this.flags.decor || {})) this.renderDecor(key);
    },

    /** Перерисовать слой обоев и пола одной комнаты. */
    renderDecor(key) {
      const [wall = 0, floor = 0] = this.flags.decor?.[key] || [];
      this.decorImgs[key]?.destroy();
      this.decorImgs[key] = null;
      if (!wall && !floor) return;
      const x0 = R[key] * L.W;
      const { W, FLOOR_TOP, ROOM_H } = L;
      // поверх фона комнаты, но под дверными проёмами и небом в окне
      this.decorImgs[key] = this.bakeLayer(`decor_${key}`, x0, -9.97, (g) => {
        if (wall) {
          WALLS[wall - 1](g, x0, W, FLOOR_TOP - 2);
          g.fillStyle(0xffffff).fillRect(x0, FLOOR_TOP - 5, W, 1);
          g.fillStyle(0x8d6a5a).fillRect(x0, FLOOR_TOP - 4, W, 4); // плинтус
        }
        if (floor) FLOORS[floor - 1](g, x0, W, FLOOR_TOP, ROOM_H - FLOOR_TOP);
      });
    },

    /** Валик отпустили на стену или пол комнаты дома. true — обработано. */
    decorDrop(o, q) {
      if (o.kind !== 'item' || !o.beh.roller || q.y > L.ROOM_H) return false;
      const room = roomAt(Math.floor(q.x / L.W));
      if (!DECOR_ROOMS.includes(room.key)) return false;
      // по мебели и вещам валик не красит — только по пустой стене или полу
      if (this.objAt(q.x, q.y, (x) => x !== o && x.kind === 'item' && x.beh.furniture && !x.beh.flat)) return false;
      const d = ((this.flags.decor ||= {})[room.key] ||= [0, 0]);
      const onWall = q.y < L.FLOOR_TOP - 1;
      if (onWall) d[0] = (d[0] + 1) % (WALLS.length + 1); else d[1] = (d[1] + 1) % (FLOORS.length + 1);
      this.renderDecor(room.key);
      sfx.swish(); sfx.sparkle();
      this.fxSparks.explode(16, q.x, q.y);
      this.stat('decor');
      this.hintDone('decor');
      // валик остаётся там, где им красили (со стены падает на пол)
      o.x = Math.round(q.x); o.y = Math.round(q.y);
      this.settle(o);
      return true;
    },
  });
}
