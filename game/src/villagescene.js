// Фон комнат Села (см. scenery.js): двор с красным сараем, огород с плетнём и подсолнухами,
// фруктовый сад за каменной оградкой, поле с пшеницей. Все четыре — на улице: небо рисует общий слой.
// Зимой (winter) трава и холмы в снегу — как в саду у дома.

/** Холмы на горизонте: волнистая полоса высотой около base (поверх неба). */
function hills(g, x0, { L }, base, color, a = 23, b = 9, ph = 0) {
  g.fillStyle(color);
  for (let x = 0; x < L.W; x++) {
    const h = Math.round(base + base * 0.5 * Math.sin((x + ph) / a) + base * 0.25 * Math.sin((x + ph) / b));
    if (h > 0) g.fillRect(x0 + x, L.FLOOR_TOP - h, 1, h);
  }
}

/** Земля: заливка, верхняя кромка и редкие «травинки» в шахматном порядке. */
function ground(g, x0, { L }, fill, speck, edge) {
  const { W, ROOM_H, FLOOR_TOP } = L;
  g.fillStyle(fill).fillRect(x0, FLOOR_TOP, W, ROOM_H - FLOOR_TOP);
  g.fillStyle(speck);
  for (let y = FLOOR_TOP + 2, r = 0; y < ROOM_H; y += 5, r++) {
    for (let x = (r % 2) * 5; x < W; x += 10) { g.fillRect(x0 + x, y, 1, 2); g.fillRect(x0 + x + 2, y + 1, 1, 1); }
  }
  g.fillStyle(edge).fillRect(x0, FLOOR_TOP, W, 1);
}

/** Маленькое круглое дерево вдалеке. */
function farTree(g, x, y, crown, trunk = 0x8d5a3b) {
  g.fillStyle(trunk).fillRect(x, y - 3, 1, 3);
  g.fillStyle(crown).fillRect(x - 2, y - 7, 5, 4).fillRect(x - 1, y - 8, 3, 1).fillRect(x - 3, y - 6, 7, 2);
}

export const VILLAGE_SCENERY = {
  // ===== двор: утоптанная земля, красный сарай с воротами, жердяная изгородь
  yard: {
    bg(g, x0, c) {
      const { W, ROOM_H, FLOOR_TOP } = c.L;
      if (c.winter) { ground(g, x0, c, 0xf4f9ff, 0xd9e8f5, 0xffffff); return; }
      ground(g, x0, c, 0xdcbb82, 0xc9a56a, 0xeed3a0);
      // клочки травы по краям двора
      g.fillStyle(0x8fd16a);
      for (let i = 0; i < 14; i++) {
        const x = (i * 67 + 13) % (W - 6);
        const y = FLOOR_TOP + 3 + ((i * 29) % Math.max(4, ROOM_H - FLOOR_TOP - 6));
        g.fillRect(x0 + x, y, 3, 1).fillRect(x0 + x + 1, y - 1, 1, 1);
      }
    },
    fg(g, x0, c) {
      const { W, FLOOR_TOP } = c.L;
      hills(g, x0, c, 8, c.winter ? 0xd3e3f2 : 0x86c964, 31, 11, 40);
      // изгородь из жердей — справа от сарая до края двора
      const fx = x0 + 126;
      g.fillStyle(0xb8834f).fillRect(fx, FLOOR_TOP - 10, x0 + W - fx, 2).fillRect(fx, FLOOR_TOP - 5, x0 + W - fx, 2);
      g.fillStyle(0xd09a62).fillRect(fx, FLOOR_TOP - 10, x0 + W - fx, 1);
      for (let x = fx + 6; x < x0 + W; x += 14) {
        g.fillStyle(0xa8714d).fillRect(x, FLOOR_TOP - 13, 3, 13);
        g.fillStyle(0xd09a62).fillRect(x, FLOOR_TOP - 13, 1, 13);
      }
      // сарай: красные доски, белая отделка, двускатная крыша, ворота с крестовинами
      const bx = x0 + 14;
      const bw = 108;
      const cx = bx + bw / 2;
      const top = 15;
      g.fillStyle(0xc8443a).fillRect(bx, top, bw, FLOOR_TOP - top);
      g.fillStyle(0xa8342e);
      for (let x = bx + 5; x < bx + bw; x += 7) g.fillRect(x, top, 1, FLOOR_TOP - top);
      g.fillStyle(0xdc5a4e).fillRect(bx, top, 2, FLOOR_TOP - top);
      g.fillStyle(0x8e2a26).fillRect(bx + bw - 2, top, 2, FLOOR_TOP - top);
      for (let i = 0; i < 14; i++) { // крыша
        const hw = Math.round(10 + i * 3.7);
        g.fillStyle(i < 2 ? 0x8a6470 : 0x6b4a58).fillRect(cx - hw, top - 13 + i, hw * 2, 1);
      }
      g.fillStyle(0xffffff).fillRect(bx - 4, top, bw + 8, 2);
      // окошко сеновала: торчит сено
      g.fillStyle(0xffffff).fillRect(cx - 8, top + 5, 16, 11);
      g.fillStyle(0x4a2a30).fillRect(cx - 6, top + 7, 12, 9);
      g.fillStyle(0xf2c94c).fillRect(cx - 5, top + 12, 10, 4).fillRect(cx - 3, top + 10, 5, 2);
      g.fillStyle(0xd8a838).fillRect(cx - 4, top + 13, 1, 3).fillRect(cx + 1, top + 11, 1, 5).fillRect(cx + 3, top + 13, 1, 3);
      // ворота
      const dh = Math.max(14, Math.min(30, FLOOR_TOP - top - 20));
      const dy = FLOOR_TOP - dh;
      g.fillStyle(0xffffff).fillRect(cx - 19, dy - 2, 38, dh + 2);
      g.fillStyle(0x9a2f2a).fillRect(cx - 17, dy, 16, dh).fillRect(cx + 1, dy, 16, dh);
      g.fillStyle(0xffffff);
      for (const sx of [cx - 17, cx + 1]) {
        for (let i = 0; i < 16; i++) {
          const y = dy + Math.round((i * (dh - 1)) / 15);
          g.fillRect(sx + i, y, 1, 1).fillRect(sx + 15 - i, y, 1, 1);
        }
      }
      g.fillStyle(0x24123c).fillRect(bx, FLOOR_TOP - 1, bw, 1);
    },
  },

  // ===== огород: трава с вскопанными полосами, плетень, за ним подсолнухи
  veg: {
    bg(g, x0, c) {
      const { W, ROOM_H, FLOOR_TOP } = c.L;
      if (c.winter) { ground(g, x0, c, 0xf4f9ff, 0xd9e8f5, 0xffffff); return; }
      ground(g, x0, c, 0x93d46e, 0x7cc25a, 0xb5e38f);
      // вскопанные полосы
      const rows = Math.max(1, Math.floor((ROOM_H - FLOOR_TOP - 8) / 13));
      for (let r = 0; r < rows; r++) {
        const y = FLOOR_TOP + 7 + r * 13;
        g.fillStyle(0x8a5f3c).fillRect(x0 + 6, y, W - 12, 6);
        g.fillStyle(0x6f4a2e).fillRect(x0 + 6, y + 5, W - 12, 1);
        g.fillStyle(0xa87a52);
        for (let x = 10 + (r % 2) * 4; x < W - 12; x += 9) g.fillRect(x0 + x, y + 1, 3, 1);
        g.fillStyle(0x6f4a2e);
        for (let x = 14 + (r % 2) * 5; x < W - 12; x += 11) g.fillRect(x0 + x, y + 3, 2, 1);
      }
    },
    fg(g, x0, c) {
      const { W, FLOOR_TOP } = c.L;
      hills(g, x0, c, 6, c.winter ? 0xd3e3f2 : 0x7cc25a, 27, 8, 90);
      // подсолнухи за плетнём (зимой их нет)
      if (!c.winter) {
        for (let x = 16; x < W - 8; x += 31) {
          const h = 19 + ((x * 7) % 5);
          g.fillStyle(0x4fa83d).fillRect(x0 + x, FLOOR_TOP - h, 1, h).fillRect(x0 + x - 3, FLOOR_TOP - h + 8, 3, 2).fillRect(x0 + x + 1, FLOOR_TOP - h + 11, 3, 2);
          g.fillStyle(0xffd84a).fillRect(x0 + x - 3, FLOOR_TOP - h - 4, 7, 5).fillRect(x0 + x - 2, FLOOR_TOP - h - 5, 5, 7);
          g.fillStyle(0x8a5a2a).fillRect(x0 + x - 1, FLOOR_TOP - h - 3, 3, 3);
        }
      }
      // плетень: колья и переплетённые прутья
      const top = FLOOR_TOP - 11;
      g.fillStyle(0xb98a52).fillRect(x0, top + 1, W, 10);
      for (let row = 0; row < 5; row++) {
        g.fillStyle(row % 2 ? 0x9a6c3c : 0xd3a66a);
        for (let x = (row % 2) * 6; x < W; x += 12) g.fillRect(x0 + x, top + 1 + row * 2, 6, 2);
      }
      for (let x = 5; x < W; x += 12) {
        g.fillStyle(0x7a4a32).fillRect(x0 + x, top - 2, 2, 13);
        g.fillStyle(0xa8714d).fillRect(x0 + x, top - 2, 1, 13);
      }
    },
  },

  // ===== фруктовый сад: трава с цветами, дальние деревья рядами, низкая каменная оградка
  orchard: {
    bg(g, x0, c) {
      const { W, ROOM_H, FLOOR_TOP } = c.L;
      if (c.winter) { ground(g, x0, c, 0xf4f9ff, 0xd9e8f5, 0xffffff); return; }
      ground(g, x0, c, 0x9ad873, 0x84c95f, 0xbce99a);
      const cols = [0xffffff, 0xffe066, 0xff9ac8, 0xffffff];
      for (let i = 0; i < 46; i++) {
        const x = (i * 53 + 7) % (W - 4);
        const y = FLOOR_TOP + 4 + ((i * 37) % Math.max(4, ROOM_H - FLOOR_TOP - 6));
        g.fillStyle(cols[i % cols.length]).fillRect(x0 + x, y, 1, 1);
        if (i % 3 === 0) g.fillRect(x0 + x + 1, y + 1, 1, 1).fillRect(x0 + x - 1, y + 1, 1, 1).fillRect(x0 + x, y + 2, 1, 1);
      }
    },
    fg(g, x0, c) {
      const { W, FLOOR_TOP } = c.L;
      hills(g, x0, c, 12, c.winter ? 0xe3eef8 : 0xa8dc8c, 41, 13, 10);
      hills(g, x0, c, 7, c.winter ? 0xd3e3f2 : 0x7cc25a, 25, 9, 150);
      for (let x = 9; x < W; x += 17) farTree(g, x0 + x, FLOOR_TOP - 7 - ((x * 5) % 4), c.winter ? 0xf4f9ff : (x % 2 ? 0x4fa83d : 0x5fbf4a));
      // оградка из камней
      g.fillStyle(0xb8bccc).fillRect(x0, FLOOR_TOP - 6, W, 6);
      g.fillStyle(0xd8dcec).fillRect(x0, FLOOR_TOP - 6, W, 1);
      g.fillStyle(0x8f96b0);
      for (let row = 0; row < 2; row++) for (let x = (row % 2) * 5; x < W; x += 10) g.fillRect(x0 + x, FLOOR_TOP - 5 + row * 3, 1, 2);
      g.fillRect(x0, FLOOR_TOP - 3, W, 1);
      if (c.winter) g.fillStyle(0xffffff).fillRect(x0, FLOOR_TOP - 7, W, 2);
    },
  },

  // ===== поле: стерня рядами, по горизонту — стена спелой пшеницы
  field: {
    bg(g, x0, c) {
      const { W, ROOM_H, FLOOR_TOP } = c.L;
      if (c.winter) { ground(g, x0, c, 0xf4f9ff, 0xd9e8f5, 0xffffff); return; }
      g.fillStyle(0xe9cb6a).fillRect(x0, FLOOR_TOP, W, ROOM_H - FLOOR_TOP);
      for (let y = FLOOR_TOP + 3, r = 0; y < ROOM_H; y += 6, r++) {
        g.fillStyle(0xd6b250).fillRect(x0, y + 2, W, 1);
        g.fillStyle(0xc49a3c);
        for (let x = (r % 2) * 4; x < W; x += 8) g.fillRect(x0 + x, y, 1, 2);
      }
      g.fillStyle(0xf6e08e).fillRect(x0, FLOOR_TOP, W, 1);
    },
    fg(g, x0, c) {
      const { W, FLOOR_TOP } = c.L;
      hills(g, x0, c, 10, c.winter ? 0xe3eef8 : 0xb8dc7c, 37, 12, 200);
      if (c.winter) { hills(g, x0, c, 5, 0xd3e3f2, 21, 7, 60); return; }
      // пшеница: плотная золотая полоса с колосками разной высоты
      g.fillStyle(0xe0b848).fillRect(x0, FLOOR_TOP - 9, W, 9);
      for (let x = 0; x < W; x += 2) {
        const h = 10 + ((x * 13) % 5);
        g.fillStyle(x % 4 ? 0xd9a93a : 0xf2cf62).fillRect(x0 + x, FLOOR_TOP - h, 1, h);
        g.fillStyle(0xf6dc7a).fillRect(x0 + x, FLOOR_TOP - h - 2, 1, 3);
        if (x % 6 === 0) g.fillRect(x0 + x + 1, FLOOR_TOP - h - 1, 1, 2);
      }
      g.fillStyle(0xb8862c).fillRect(x0, FLOOR_TOP - 1, W, 1);
    },
  },
};
