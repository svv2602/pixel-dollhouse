// Фон комнат Моря (см. scenery.js): пляж, открытая вода, морское дно и остров.
// Пляж, вода и остров — на улице: небо рисует общий слой. Под водой неба нет — вся стена из воды.

export const SEA_BAND = 16; // высота полосы моря у горизонта на пляже и острове (по ней же — тап «волна», см. sea.js)

/** Полоса моря у горизонта: вода, блики, пена у берега. */
function seaBand(g, x0, { L }, h = SEA_BAND, foam = true) {
  const { W, FLOOR_TOP } = L;
  const top = FLOOR_TOP - h;
  g.fillStyle(0x3a9bd9).fillRect(x0, top, W, h);
  g.fillStyle(0x2f86c4).fillRect(x0, top, W, 2);
  g.fillStyle(0x6cc0f0);
  for (let y = top + 3, r = 0; y < FLOOR_TOP - 2; y += 4, r++) for (let x = (r % 2) * 9; x < W; x += 18) g.fillRect(x0 + x, y, 7, 1);
  if (!foam) return;
  g.fillStyle(0xffffff);
  for (let x = 0; x < W; x += 2) g.fillRect(x0 + x, FLOOR_TOP - 1 - (Math.floor(x / 6) % 2), 2, 2);
}

/** Песок: заливка, крапинки, редкие ракушки. */
function sand(g, x0, { L }) {
  const { W, ROOM_H, FLOOR_TOP } = L;
  g.fillStyle(0xf2dca0).fillRect(x0, FLOOR_TOP, W, ROOM_H - FLOOR_TOP);
  g.fillStyle(0xe3c682);
  for (let y = FLOOR_TOP + 3, r = 0; y < ROOM_H; y += 5, r++) for (let x = (r % 2) * 6; x < W; x += 12) { g.fillRect(x0 + x, y, 2, 1); g.fillRect(x0 + x + 5, y + 2, 1, 1); }
  g.fillStyle(0xfbeec4);
  for (let i = 0; i < 18; i++) g.fillRect(x0 + ((i * 61 + 9) % (W - 4)), FLOOR_TOP + 5 + ((i * 23) % Math.max(4, ROOM_H - FLOOR_TOP - 8)), 2, 1);
}

/** Далёкий островок с пальмой на горизонте. */
function farIsle(g, x, y) {
  g.fillStyle(0xe8d39a).fillRect(x - 9, y - 2, 18, 2).fillRect(x - 6, y - 3, 12, 1);
  g.fillStyle(0x8d5a3b).fillRect(x, y - 9, 1, 6);
  g.fillStyle(0x4fa83d).fillRect(x - 3, y - 10, 7, 1).fillRect(x - 2, y - 11, 5, 1).fillRect(x - 4, y - 9, 2, 1).fillRect(x + 3, y - 9, 2, 1);
}

/** Парусник вдалеке. */
function farSail(g, x, y) {
  g.fillStyle(0xffffff).fillRect(x, y - 8, 1, 7).fillRect(x + 1, y - 7, 2, 2).fillRect(x + 1, y - 5, 3, 2).fillRect(x + 1, y - 3, 4, 2);
  g.fillStyle(0xef5a6f).fillRect(x - 3, y - 1, 9, 2);
}

export const SEA_SCENERY = {
  // ===== пляж: песок, мокрая кромка у воды, море у горизонта с островком и парусником
  beach: {
    bg(g, x0, c) {
      const { W, FLOOR_TOP } = c.L;
      sand(g, x0, c);
      g.fillStyle(0xe0c58a).fillRect(x0, FLOOR_TOP, W, 4);
      g.fillStyle(0xfff8e0).fillRect(x0, FLOOR_TOP, W, 1);
    },
    fg(g, x0, c) {
      const { W, FLOOR_TOP } = c.L;
      seaBand(g, x0, c);
      farIsle(g, x0 + Math.round(W * 0.22), FLOOR_TOP - SEA_BAND + 1);
      farSail(g, x0 + Math.round(W * 0.6), FLOOR_TOP - SEA_BAND + 3);
    },
  },

  // ===== в море: вода вместо пола, у горизонта маяк на скале
  waves: {
    bg(g, x0, c) {
      const { W, ROOM_H, FLOOR_TOP } = c.L;
      g.fillStyle(0x4fb3e8).fillRect(x0, FLOOR_TOP, W, ROOM_H - FLOOR_TOP);
      g.fillStyle(0x3fa3dc).fillRect(x0, FLOOR_TOP + Math.round((ROOM_H - FLOOR_TOP) * 0.55), W, ROOM_H);
      for (let y = FLOOR_TOP + 3, r = 0; y < ROOM_H; y += 5, r++) {
        g.fillStyle(r % 2 ? 0x8fd6f7 : 0xc8ecff);
        for (let x = (r % 3) * 7; x < W; x += 21) { g.fillRect(x0 + x, y, 8, 1); g.fillRect(x0 + x + 2, y - 1, 4, 1); }
      }
      g.fillStyle(0xffffff).fillRect(x0, FLOOR_TOP, W, 1);
    },
    fg(g, x0, c) {
      const { W, FLOOR_TOP } = c.L;
      seaBand(g, x0, c, 10, false);
      // маяк на скале
      const lx = x0 + Math.round(W * 0.16);
      g.fillStyle(0x8f96b0).fillRect(lx - 12, FLOOR_TOP - 8, 26, 8).fillRect(lx - 8, FLOOR_TOP - 11, 16, 3);
      g.fillStyle(0xb8bccc).fillRect(lx - 12, FLOOR_TOP - 8, 26, 1);
      g.fillStyle(0xffffff).fillRect(lx - 3, FLOOR_TOP - 34, 7, 23);
      g.fillStyle(0xef5a6f).fillRect(lx - 3, FLOOR_TOP - 30, 7, 4).fillRect(lx - 3, FLOOR_TOP - 20, 7, 4);
      g.fillStyle(0x3a3040).fillRect(lx - 4, FLOOR_TOP - 38, 9, 4);
      g.fillStyle(0xfff07a).fillRect(lx - 2, FLOOR_TOP - 37, 5, 2);
      g.fillStyle(0xef5a6f).fillRect(lx - 3, FLOOR_TOP - 41, 7, 3).fillRect(lx - 1, FLOOR_TOP - 43, 3, 2);
      farIsle(g, x0 + Math.round(W * 0.72), FLOOR_TOP - 9);
      farSail(g, x0 + Math.round(W * 0.47), FLOOR_TOP - 6);
    },
  },

  // ===== под водой: толща воды с лучами света, скалы и водоросли вдали, песчаное дно
  deep: {
    bg(g, x0, c) {
      const { W, ROOM_H, FLOOR_TOP } = c.L;
      const bands = [0x5cc0ee, 0x4fb0e4, 0x429fd8, 0x378ecb, 0x2f7fbe, 0x2a72b0];
      const bh = Math.ceil(FLOOR_TOP / bands.length);
      bands.forEach((col, i) => g.fillStyle(col).fillRect(x0, i * bh, W, bh));
      // рябь поверхности
      g.fillStyle(0xc8ecff);
      for (let x = 0; x < W; x += 14) g.fillRect(x0 + x + ((x / 14) % 2) * 3, 1, 8, 1);
      // лучи света
      for (const sx of [0.18, 0.46, 0.8]) {
        g.fillStyle(0xffffff, 0.1);
        for (let y = 2; y < FLOOR_TOP; y++) g.fillRect(x0 + Math.round(W * sx - y * 0.35), y, 9, 1);
      }
      g.fillStyle(0xffffff, 1);
      // скалы вдали
      for (let x = 0, i = 0; x < W; x += 29, i++) {
        const h = 8 + ((i * 11) % 13);
        g.fillStyle(0x2a66a0).fillRect(x0 + x, FLOOR_TOP - h, 22, h).fillRect(x0 + x + 4, FLOOR_TOP - h - 3, 12, 3);
      }
      // водоросли
      for (let x = 9, i = 0; x < W; x += 23, i++) {
        const h = 12 + ((i * 7) % 12);
        g.fillStyle(i % 2 ? 0x3fa86a : 0x2f8f58);
        for (let y = 0; y < h; y++) g.fillRect(x0 + x + Math.round(Math.sin(y / 3 + i) * 1.5), FLOOR_TOP - y - 1, 2, 1);
      }
      // дно
      g.fillStyle(0xe8d39a).fillRect(x0, FLOOR_TOP, W, ROOM_H - FLOOR_TOP);
      g.fillStyle(0xd6bd7c);
      for (let y = FLOOR_TOP + 3, r = 0; y < ROOM_H; y += 5, r++) for (let x = (r % 2) * 7; x < W; x += 14) g.fillRect(x0 + x, y, 4, 1);
      g.fillStyle(0xb8bccc);
      for (let i = 0; i < 9; i++) g.fillRect(x0 + ((i * 71 + 15) % (W - 6)), FLOOR_TOP + 6 + ((i * 17) % Math.max(4, ROOM_H - FLOOR_TOP - 10)), 3, 2);
      g.fillStyle(0xf6e6b8).fillRect(x0, FLOOR_TOP, W, 1);
    },
  },

  // ===== остров: песок, вода по краям и снизу, у горизонта море и заросли
  island: {
    bg(g, x0, c) {
      const { W, ROOM_H, FLOOR_TOP } = c.L;
      sand(g, x0, c);
      g.fillStyle(0xfff8e0).fillRect(x0, FLOOR_TOP, W, 1);
      // вода обнимает остров: слева, справа и узкой полосой снизу
      const edge = (x, w) => {
        g.fillStyle(0x4fb3e8).fillRect(x0 + x, FLOOR_TOP, w, ROOM_H - FLOOR_TOP);
        g.fillStyle(0xc8ecff);
        for (let y = FLOOR_TOP + 4; y < ROOM_H; y += 6) g.fillRect(x0 + x + 1, y, Math.max(2, w - 3), 1);
      };
      edge(0, 7); edge(W - 7, 7);
      g.fillStyle(0xffffff);
      for (let y = FLOOR_TOP; y < ROOM_H; y += 2) { g.fillRect(x0 + 7 + (Math.floor(y / 4) % 2), y, 1, 2); g.fillRect(x0 + W - 8 - (Math.floor(y / 4) % 2), y, 1, 2); }
      g.fillStyle(0x4fb3e8).fillRect(x0, ROOM_H - 3, W, 3);
      g.fillStyle(0xffffff);
      for (let x = 0; x < W; x += 2) g.fillRect(x0 + x, ROOM_H - 4 + (Math.floor(x / 6) % 2), 2, 1);
    },
    fg(g, x0, c) {
      const { W, FLOOR_TOP } = c.L;
      seaBand(g, x0, c);
      // заросли в глубине острова
      for (let x = Math.round(W * 0.2); x < W * 0.8; x++) {
        const k = (x - W * 0.2) / (W * 0.6);
        const h = Math.round(6 + 9 * Math.sin(k * Math.PI) + 2 * Math.sin(x / 5));
        g.fillStyle(x % 7 < 3 ? 0x3f8f33 : 0x4fa83d).fillRect(x0 + x, FLOOR_TOP - h, 1, h);
      }
      g.fillStyle(0xff7ab8);
      for (let x = Math.round(W * 0.26); x < W * 0.76; x += 19) g.fillRect(x0 + x, FLOOR_TOP - 5 - ((x * 3) % 5), 2, 2);
      farSail(g, x0 + Math.round(W * 0.1), FLOOR_TOP - SEA_BAND + 3);
    },
  },
};
