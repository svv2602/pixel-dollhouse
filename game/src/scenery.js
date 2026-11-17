// Фон комнат. Каждая комната рисует себя сама: bg — стены и пол (или земля), fg — то, что поверх неба
// (холмы, забор, оконные рамы). Оба слоя один раз «запекаются» в текстуры: комната на экране — две картинки,
// а не тысячи прямоугольников, которые пришлось бы пересчитывать каждый кадр.
// Между ними лежит небо — единственный живой слой: оно перерисовывается при смене дня и ночи.
//
// Рисунок пишется в координатах мира (x0 — левый край комнаты); при запекании он сдвигается к нулю.
import { ROOMS, R } from './places.js';
import { VILLAGE_SCENERY } from './villagescene.js';
import { CITY_SCENERY } from './cityscene.js';
import { SEA_SCENERY } from './seascene.js';

const HOME_SCENERY = {
  // ===== спальня: обои в полоску с точками, пол — доски
  bedroom: {
    bg(g, x0, { L }) {
      const { W, ROOM_H, FLOOR_TOP } = L;
      g.fillStyle(0xf8dce8).fillRect(x0, 0, W, FLOOR_TOP);
      g.fillStyle(0xf2cadb);
      for (let x = 0; x < W; x += 8) g.fillRect(x0 + x, 0, 3, FLOOR_TOP);
      g.fillStyle(0xe6aec7);
      for (let y = 5, r = 0; y < FLOOR_TOP - 16; y += 10, r++) for (let x = r % 2 ? 9 : 1; x < W; x += 16) g.fillRect(x0 + x, y, 1, 1);
      const wy = FLOOR_TOP - 14;
      g.fillStyle(0xe7b6cd).fillRect(x0, wy, W, 14);
      g.fillStyle(0xd197b4).fillRect(x0, wy - 1, W, 1);
      g.fillStyle(0xdba8c0);
      for (let x = 3; x < W - 14; x += 18) g.fillRect(x0 + x, wy + 3, 13, 7);
      g.fillStyle(0x8d5a78).fillRect(x0, FLOOR_TOP - 2, W, 2);
      g.fillStyle(0xd39a68).fillRect(x0, FLOOR_TOP, W, ROOM_H - FLOOR_TOP);
      for (let y = FLOOR_TOP, row = 0; y < ROOM_H; y += 6, row++) {
        g.fillStyle(0xdeab7c).fillRect(x0, y, W, 1);
        g.fillStyle(0xb98153).fillRect(x0, y + 5, W, 1);
        for (let x = (row % 2) * 12; x < W; x += 24) g.fillRect(x0 + x, y + 1, 1, 4);
      }
    },
    fg(g, x0, { L }) {
      const { x, y, w, h } = L.WINDOWS[0];
      windowFrame(g, L.WINDOWS[0]);
      g.fillStyle(0xd197b4).fillRect(x - 4, y + h + 2, w + 8, 2); // подоконник
      g.fillStyle(0xfff4a8).fillRect(x - 7, y - 4, 5, h + 7).fillRect(x + w + 2, y - 4, 5, h + 7);
      g.fillStyle(0xf2df7a).fillRect(x - 5, y - 4, 1, h + 7).fillRect(x + w + 4, y - 4, 1, h + 7);
      g.fillStyle(0xc98aa9).fillRect(x - 9, y - 5, w + 18, 1); // карниз
    },
  },

  // ===== кухня: мятная стена, плитка-фартук, пол в клетку
  kitchen: {
    bg(g, k, { L }) {
      const { W, ROOM_H, FLOOR_TOP } = L;
      g.fillStyle(0xe6f6ef).fillRect(k, 0, W, FLOOR_TOP);
      g.fillStyle(0xcdeee0);
      for (let y = 6, r = 0; y < FLOOR_TOP - 26; y += 9, r++) for (let x = k + (r % 2 ? 10 : 2); x < k + W; x += 16) g.fillRect(x, y, 2, 2);
      const ty = FLOOR_TOP - 24;
      g.fillStyle(0xd8f3e8).fillRect(k, ty, W, 22);
      g.fillStyle(0xbfe6d5);
      for (let y = ty; y < FLOOR_TOP - 2; y += 6) g.fillRect(k, y, W, 1);
      for (let y = ty, r = 0; y < FLOOR_TOP - 2; y += 6, r++) for (let x = k + (r % 2) * 3; x < k + W; x += 6) g.fillRect(x, y, 1, 6);
      g.fillStyle(0x5f9c85).fillRect(k, FLOOR_TOP - 2, W, 2);
      for (let y = FLOOR_TOP, r = 0; y < ROOM_H; y += 6, r++) {
        for (let x = k, c = r % 2; x < k + W; x += 6, c ^= 1) g.fillStyle(c ? 0xf4ead8 : 0xe3cfae).fillRect(x, y, 6, 6);
      }
    },
    fg(g, x0, { L }) {
      const { x, y, w, h } = L.WINDOWS[1];
      windowFrame(g, L.WINDOWS[1]);
      // короткая занавеска-«кафе» в клетку
      g.fillStyle(0x5f9c85).fillRect(x - 4, y + h + 2, w + 8, 2);
      for (let cx = 0; cx < w; cx += 2) for (let cy = 0; cy < 6; cy += 2) {
        g.fillStyle((cx + cy) % 4 ? 0xff9ab8 : 0xffffff).fillRect(x + cx, y - 1 + cy, 2, 2);
      }
    },
  },

  // ===== сад: трава; небо — на своём слое, холмы и белый заборчик — поверх неба
  garden: {
    bg(g, gx, { L, winter }) {
      const { W, ROOM_H, FLOOR_TOP } = L;
      g.fillStyle(winter ? 0xf4f9ff : 0x8fd16a).fillRect(gx, FLOOR_TOP, W, ROOM_H - FLOOR_TOP);
      for (let y = FLOOR_TOP + 2, r = 0; y < ROOM_H; y += 5, r++) {
        g.fillStyle(winter ? 0xd9e8f5 : 0x7cc25a);
        for (let x = gx + (r % 2) * 5; x < gx + W; x += 10) { g.fillRect(x, y, 1, 2); g.fillRect(x + 2, y + 1, 1, 1); }
      }
      g.fillStyle(winter ? 0xffffff : 0xb5e38f).fillRect(gx, FLOOR_TOP, W, 1);
    },
    fg(hz, gx, { L, winter }) {
      const { W, FLOOR_TOP } = L;
      for (let x = gx; x < gx + W; x++) {
        const hgt = Math.round(7 + 4 * Math.sin((x - gx) / 23) + 2 * Math.sin((x - gx) / 9));
        hz.fillStyle(winter ? 0xd3e3f2 : 0x7cc25a).fillRect(x, FLOOR_TOP - hgt, 1, hgt);
      }
      hz.fillStyle(0xfff8f0);
      for (let x = gx + 3; x < gx + W; x += 8) { hz.fillRect(x, FLOOR_TOP - 13, 3, 13); hz.fillRect(x + 1, FLOOR_TOP - 14, 1, 1); }
      hz.fillRect(gx, FLOOR_TOP - 10, W, 2).fillRect(gx, FLOOR_TOP - 5, W, 2);
      hz.fillStyle(0xe0d6cc);
      for (let x = gx + 5; x < gx + W; x += 8) hz.fillRect(x, FLOOR_TOP - 13, 1, 13);
    },
  },

  // ===== ванная: голубая плитка, пол в крупную клетку
  bath: {
    bg(g, bx, { L }) {
      const { W, ROOM_H, FLOOR_TOP } = L;
      g.fillStyle(0xdff6fb).fillRect(bx, 0, W, FLOOR_TOP);
      g.fillStyle(0xc2e6f0);
      for (let y = 0; y < FLOOR_TOP; y += 8) g.fillRect(bx, y, W, 1);
      for (let x = bx; x < bx + W; x += 8) g.fillRect(x, 0, 1, FLOOR_TOP);
      g.fillStyle(0xb7e0ec).fillRect(bx, FLOOR_TOP - 16, W, 14);
      g.fillStyle(0x9fd2e2);
      for (let x = bx; x < bx + W; x += 8) g.fillRect(x, FLOOR_TOP - 16, 1, 14);
      g.fillStyle(0x7fbfd2).fillRect(bx, FLOOR_TOP - 17, W, 1).fillRect(bx, FLOOR_TOP - 2, W, 2);
      for (let y = FLOOR_TOP, r = 0; y < ROOM_H; y += 8, r++) {
        for (let x = bx, c = r % 2; x < bx + W; x += 8, c ^= 1) g.fillStyle(c ? 0xffffff : 0xd6eef6).fillRect(x, y, 8, 8);
      }
    },
  },

  // ===== концертный зал: тёмная стена со звёздочками, бархатный занавес, паркет
  hall: {
    bg(g, hx, { L }) {
      const { W, ROOM_H, FLOOR_TOP } = L;
      g.fillStyle(0x3b2160).fillRect(hx, 0, W, FLOOR_TOP);
      g.fillStyle(0xffd84a);
      for (let y = 6, r = 0; y < FLOOR_TOP - 20; y += 11, r++) for (let x = hx + (r % 2 ? 12 : 4); x < hx + W; x += 17) {
        g.fillRect(x, y, 1, 1); if ((x + y) % 3 === 0) g.fillRect(x - 1, y, 3, 1).fillRect(x, y - 1, 1, 3);
      }
      const cw = Math.round(W * 0.16);
      for (const [x1, dir] of [[hx, 1], [hx + W - cw, -1]]) {
        g.fillStyle(0xb8264a).fillRect(x1, 0, cw, FLOOR_TOP);
        g.fillStyle(0x8e1838);
        for (let x = 3; x < cw; x += 6) g.fillRect(x1 + x, 0, 2, FLOOR_TOP);
        g.fillStyle(0xd8406a);
        for (let x = 1; x < cw; x += 6) g.fillRect(x1 + x, 0, 1, FLOOR_TOP);
        g.fillStyle(0xffd84a).fillRect(dir > 0 ? x1 + cw - 3 : x1, Math.round(FLOOR_TOP * 0.55), 3, 3); // подхват
      }
      g.fillStyle(0xb8264a).fillRect(hx, 0, W, 8);
      g.fillStyle(0x8e1838);
      for (let x = hx; x < hx + W; x += 12) g.fillRect(x, 8, 12, 2).fillRect(x + 3, 10, 6, 1);
      g.fillStyle(0xffd84a).fillRect(hx, 7, W, 1);
      g.fillStyle(0x24123c).fillRect(hx, FLOOR_TOP - 2, W, 2);
      for (let y = FLOOR_TOP, r = 0; y < ROOM_H; y += 4, r++) {
        g.fillStyle(r % 2 ? 0x9a5a3a : 0xa8683f).fillRect(hx, y, W, 4);
        g.fillStyle(0x7d4529);
        for (let x = hx + (r % 3) * 7; x < hx + W; x += 21) g.fillRect(x, y, 1, 4);
      }
    },
  },
};

const SCENERY = { ...HOME_SCENERY, ...VILLAGE_SCENERY, ...CITY_SCENERY, ...SEA_SCENERY };

/** Белая рама окна с переплётом. */
function windowFrame(f, { x, y, w, h }) {
  const mx = x + w / 2;
  const my = y + Math.floor(h / 2);
  f.fillStyle(0xffffff)
    .fillRect(x - 2, y - 2, w + 4, 2).fillRect(x - 2, y + h, w + 4, 2)
    .fillRect(x - 2, y, 2, h).fillRect(x + w, y, 2, h)
    .fillRect(mx - 1, y, 2, h).fillRect(x, my - 1, w, 2);
}

export function installScenery(Room, { L }) {
  Object.assign(Room.prototype, {
    /** Запечь рисунок комнаты в текстуру и поставить её картинкой на место комнаты. */
    bakeLayer(key, x0, depth, draw) {
      const g = this.make.graphics({}, false);
      g.translateCanvas(-x0, 0);
      draw(g);
      // сцена пересоздаётся при смене размера экрана: старую картинку уже никто не держит, а размер у новой другой
      if (this.textures.exists(key)) this.textures.remove(key);
      g.generateTexture(key, L.W, L.ROOM_H);
      g.destroy();
      return this.add.image(x0, 0, key).setOrigin(0).setDepth(depth);
    },

    drawRoom() {
      const { W, FLOOR_TOP } = L;
      const ctx = { L, winter: this.winter };
      for (const r of ROOMS) {
        const sc = SCENERY[r.key];
        const x0 = r.idx * W;
        this.bakeLayer(`bg_${r.key}`, x0, -10, (g) => sc.bg(g, x0, ctx));
        if (sc.fg) this.bakeLayer(`fg_${r.key}`, x0, -8, (g) => sc.fg(g, x0, ctx));
      }
      // дверные проёмы дома стоят на стыке двух комнат — рисуются отдельно, под небом сада
      const j = this.add.graphics().setDepth(-9.95);
      j.fillStyle(0xc9a3b9).fillRect(R.kitchen * W - 2, 0, 4, FLOOR_TOP - 2);
      j.fillStyle(0xa77f97).fillRect(R.kitchen * W + 1, 0, 1, FLOOR_TOP - 2);
      j.fillStyle(0xb0d8e4).fillRect(R.bath * W - 2, 0, 4, FLOOR_TOP);
      j.fillStyle(0x6e3a8a).fillRect(R.hall * W - 2, 0, 4, FLOOR_TOP);
      j.fillStyle(0x8d5a3b).fillRect(R.garden * W - 2, 0, 4, FLOOR_TOP);
      j.fillStyle(0xa8714d).fillRect(R.garden * W - 2, 0, 1, FLOOR_TOP);
      // небо: отдельный слой, перерисовывается днём/ночью
      this.sky = this.add.graphics().setDepth(-9);
    },

    drawSky() {
      const s = this.sky.clear();
      for (const win of L.WINDOWS) this.drawSkyIn(s, win);
      // уличные комнаты: днём — голубое небо с солнцем и облаками, ночью — тёмное с луной и звёздами
      ROOMS.filter((r) => r.outdoor).forEach((r, n) => {
        const gx = r.idx * L.W;
        const { x: sx, y: sy } = L.SUNS[n];
        if (!this.night) {
          s.fillStyle(0x9fdcff).fillRect(gx, 0, L.W, L.FLOOR_TOP);
          s.fillStyle(0xc8ecff).fillRect(gx, L.FLOOR_TOP - 22, L.W, 22);
          s.fillStyle(0xffe066).fillRect(sx + 2, sy, 10, 14).fillRect(sx, sy + 2, 14, 10);
          s.fillStyle(0xfff4a8).fillRect(sx + 3, sy + 3, 4, 4);
          s.fillStyle(0xffffff);
          for (const [cx, cy] of r.clouds || [[30, 10], [110, 18], [190, 8]]) {
            s.fillRect(gx + cx, cy, 16, 4).fillRect(gx + cx + 3, cy - 3, 8, 3).fillRect(gx + cx + 9, cy - 2, 5, 2);
          }
        } else {
          s.fillStyle(0x24205a).fillRect(gx, 0, L.W, L.FLOOR_TOP);
          s.fillStyle(0xfff6c2).fillRect(sx + 2, sy, 10, 14).fillRect(sx, sy + 2, 14, 10);
          s.fillStyle(0x24205a).fillRect(sx + 6, sy - 1, 9, 12);
          s.fillStyle(0xffffff);
          for (let i = 0; i < 40; i++) s.fillRect(gx + ((i * 73 + i * i * 29) % L.W), (i * 37 + i * i * 13) % (L.FLOOR_TOP - 16), 1, 1); // разбросанные звёзды
        }
      });
    },

    drawSkyIn(s, { x, y, w, h }) {
      if (!this.night) {
        s.fillStyle(0x8fd3ff).fillRect(x, y, w, h);
        s.fillStyle(0xffe066).fillRect(x + w - 9, y + 3, 5, 5);
        s.fillStyle(0xffffff).fillRect(x + 3, y + 8, 8, 2).fillRect(x + 5, y + 6, 4, 2)
          .fillRect(x + 17, y + 14, 9, 2).fillRect(x + 19, y + 12, 4, 2);
        s.fillStyle(this.winter ? 0xf4f9ff : 0x7ccf6a).fillRect(x, y + h - 4, w, 4);
      } else {
        s.fillStyle(0x24205a).fillRect(x, y, w, h);
        s.fillStyle(0xfff6c2).fillRect(x + w - 10, y + 3, 6, 6);
        s.fillStyle(0x24205a).fillRect(x + w - 8, y + 2, 5, 5);
        s.fillStyle(0xffffff);
        [[3, 4], [9, 12], [13, 3], [5, 17], [20, 19], [24, 14], [11, 20]].forEach(([dx, dy]) => s.fillRect(x + dx, y + dy, 1, 1));
        s.fillStyle(this.winter ? 0x9aa8c8 : 0x2f5a4a).fillRect(x, y + h - 4, w, 4);
      }
    },
  });
}
