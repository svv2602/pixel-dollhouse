// Фон комнат Парка развлечений (см. scenery.js): зоопарк, аквапарк, аттракционы и спортплощадка.
// Все четыре комнаты — на улице: небо рисует общий слой, здесь — земля (bg) и то, что стоит у горизонта (fg).

export const POOL_TOP = 17; // аквапарк: на столько ниже линии пола начинается вода бассейна (по ней же — круг на кукле, см. park.js)

/** Круглая крона или куст. */
function blob(g, cx, cy, rx, ry, col) {
  g.fillStyle(col);
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry + 0.01)));
    g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
}

/** Гирлянда флажков от края до края. */
function bunting(g, x0, W, y, sag = 4) {
  const cols = [0xef5a6f, 0xffd84a, 0x5ac4f2, 0x7ad98a, 0xff9ac8];
  for (let x = 0, i = 0; x < W; x += 9, i++) {
    const k = (x % 90) / 90;
    const yy = Math.round(y + sag * Math.sin(k * Math.PI));
    g.fillStyle(0x8f96b0).fillRect(x0 + x, yy, 9, 1);
    g.fillStyle(cols[i % cols.length]).fillRect(x0 + x + 2, yy + 1, 5, 2).fillRect(x0 + x + 3, yy + 3, 3, 1).fillRect(x0 + x + 4, yy + 4, 1, 1);
  }
}

/** Полосатый шатёр. */
function tent(g, x, base, w, h, c1, c2) {
  const roof = Math.round(h * 0.45);
  for (let i = 0; i < roof; i++) {
    const hw = Math.round((w / 2) * ((i + 1) / roof));
    for (let s = -hw; s < hw; s++) g.fillStyle(Math.floor((s + 400) / 4) % 2 ? c1 : c2).fillRect(x + s, base - h + i, 1, 1);
  }
  for (let s = -Math.floor(w / 2); s < Math.floor(w / 2); s++) g.fillStyle(Math.floor((s + 400) / 4) % 2 ? c1 : c2).fillRect(x + s, base - h + roof, 1, h - roof);
  g.fillStyle(0x5a3a4a).fillRect(x - 3, base - Math.round((h - roof) * 0.8), 6, Math.round((h - roof) * 0.8));
  g.fillStyle(0xffd84a).fillRect(x, base - h - 4, 1, 4).fillRect(x + 1, base - h - 4, 3, 2);
}

export const PARK_SCENERY = {
  // ===== зоопарк: трава, песчаная дорожка; у горизонта — забор вольера, за ним жираф и лев на камне
  zoo: {
    bg(g, x0, { L }) {
      const { W, ROOM_H, FLOOR_TOP } = L;
      g.fillStyle(0x9ad873).fillRect(x0, FLOOR_TOP, W, ROOM_H - FLOOR_TOP);
      g.fillStyle(0x7fc45a);
      for (let y = FLOOR_TOP + 3, r = 0; y < ROOM_H; y += 5, r++) for (let x = (r % 2) * 7; x < W; x += 14) { g.fillRect(x0 + x, y, 1, 2); g.fillRect(x0 + x + 2, y + 1, 1, 1); }
      // дорожка
      const py = FLOOR_TOP + Math.round((ROOM_H - FLOOR_TOP) * 0.52);
      g.fillStyle(0xe8d39a).fillRect(x0, py, W, 11);
      g.fillStyle(0xd6bd7c);
      for (let x = 3; x < W; x += 11) g.fillRect(x0 + x, py + 3 + ((x * 7) % 6), 2, 1);
      g.fillStyle(0xf6e6b8).fillRect(x0, py, W, 1);
      g.fillStyle(0xc8ad6a).fillRect(x0, py + 10, W, 1);
      // цветы
      for (let i = 0; i < 12; i++) {
        const fx = x0 + ((i * 53 + 17) % (W - 6));
        const fy = FLOOR_TOP + 4 + ((i * 29) % Math.max(4, py - FLOOR_TOP - 8));
        g.fillStyle(i % 3 ? 0xffffff : 0xff9ac8).fillRect(fx, fy, 2, 2);
        g.fillStyle(0xffd84a).fillRect(fx, fy, 1, 1);
      }
    },
    fg(g, x0, { L }) {
      const { W, FLOOR_TOP } = L;
      // деревья вдали
      for (let x = 8, i = 0; x < W; x += 31, i++) blob(g, x0 + x, FLOOR_TOP - 14 - (i % 3) * 2, 13, 9, i % 2 ? 0x4fa83d : 0x5fb84a);
      // лев на камне
      const lx = x0 + Math.round(W * 0.27);
      g.fillStyle(0xb8bccc).fillRect(lx - 12, FLOOR_TOP - 14, 24, 8).fillRect(lx - 8, FLOOR_TOP - 16, 15, 2);
      g.fillStyle(0xd8dcec).fillRect(lx - 12, FLOOR_TOP - 14, 24, 1);
      g.fillStyle(0xe8b04a).fillRect(lx - 8, FLOOR_TOP - 22, 13, 6).fillRect(lx - 11, FLOOR_TOP - 20, 3, 1); // туловище и хвост
      g.fillStyle(0x8d5a3b).fillRect(lx - 12, FLOOR_TOP - 21, 2, 2);
      blob(g, lx + 6, FLOOR_TOP - 23, 5, 5, 0xa8693c); // грива
      g.fillStyle(0xf2c46a).fillRect(lx + 4, FLOOR_TOP - 25, 5, 5);
      g.fillStyle(0x2b1d2e).fillRect(lx + 5, FLOOR_TOP - 24, 1, 1).fillRect(lx + 7, FLOOR_TOP - 24, 1, 1).fillRect(lx + 6, FLOOR_TOP - 22, 1, 1);
      // жираф за забором
      const gx = x0 + Math.round(W * 0.56);
      g.fillStyle(0xf2c94c).fillRect(gx - 8, FLOOR_TOP - 20, 16, 9).fillRect(gx + 5, FLOOR_TOP - 40, 4, 22).fillRect(gx + 5, FLOOR_TOP - 44, 8, 5);
      g.fillStyle(0xf2c94c).fillRect(gx - 7, FLOOR_TOP - 11, 2, 9).fillRect(gx + 5, FLOOR_TOP - 11, 2, 9);
      g.fillStyle(0xc98a3c);
      for (const [dx, dy] of [[-6, -18], [-1, -15], [3, -19], [6, -25], [7, -31], [6, -37], [-3, -19]]) g.fillRect(gx + dx, FLOOR_TOP + dy, 2, 2);
      g.fillRect(gx + 6, FLOOR_TOP - 47, 1, 3); g.fillRect(gx + 9, FLOOR_TOP - 47, 1, 3);
      g.fillStyle(0x2b1d2e).fillRect(gx + 10, FLOOR_TOP - 43, 1, 1);
      g.fillStyle(0xe8a8a0).fillRect(gx + 12, FLOOR_TOP - 41, 1, 2);
      // забор вольера
      g.fillStyle(0xc98a52).fillRect(x0, FLOOR_TOP - 8, W, 2).fillRect(x0, FLOOR_TOP - 4, W, 2);
      for (let x = 2; x < W; x += 8) { g.fillStyle(0xa8693c).fillRect(x0 + x, FLOOR_TOP - 10, 2, 10); g.fillStyle(0xe0a971).fillRect(x0 + x, FLOOR_TOP - 10, 1, 9); }
    },
  },

  // ===== аквапарк: плитка у бортика, ниже — бассейн; у горизонта — живая изгородь, пальмы и цветные трубы-горки
  aqua: {
    bg(g, x0, { L }) {
      const { W, ROOM_H, FLOOR_TOP } = L;
      const py = FLOOR_TOP + POOL_TOP;
      for (let y = FLOOR_TOP, r = 0; y < py; y += 6, r++) {
        for (let x = 0, c = r % 2; x < W; x += 12, c ^= 1) g.fillStyle(c ? 0xfdf3df : 0xf2e2c2).fillRect(x0 + x, y, 12, 6);
      }
      g.fillStyle(0xffffff).fillRect(x0, FLOOR_TOP, W, 1);
      // бортик и вода
      g.fillStyle(0xffffff).fillRect(x0, py - 2, W, 2);
      g.fillStyle(0x9fd2e2).fillRect(x0, py, W, 1);
      g.fillStyle(0x4fc4e8).fillRect(x0, py + 1, W, ROOM_H - py - 1);
      g.fillStyle(0x3fb4dc).fillRect(x0, py + 1 + Math.round((ROOM_H - py) * 0.55), W, ROOM_H);
      for (let y = py + 4, r = 0; y < ROOM_H; y += 5, r++) {
        g.fillStyle(r % 2 ? 0x9fe4f7 : 0xd4f4ff);
        for (let x = (r % 3) * 6; x < W; x += 19) { g.fillRect(x0 + x, y, 7, 1); g.fillRect(x0 + x + 2, y - 1, 3, 1); }
      }
    },
    fg(g, x0, { L }) {
      const { W, FLOOR_TOP } = L;
      // изгородь
      for (let x = 0; x < W; x += 9) blob(g, x0 + x + 4, FLOOR_TOP - 5, 6, 5, (x / 9) % 2 ? 0x4fa83d : 0x5fb84a);
      // трубы-горки вдали: два витка
      const tube = (cx, col, hi) => {
        for (let i = 0; i < 46; i++) {
          const y = FLOOR_TOP - 6 - Math.round((i / 46) * 26);
          const x = cx + Math.round(Math.sin(i / 6) * 10);
          g.fillStyle(col).fillRect(x0 + x, y, 5, 2);
          g.fillStyle(hi).fillRect(x0 + x, y, 2, 1);
        }
        g.fillStyle(0x8f96b0).fillRect(x0 + cx + 1, FLOOR_TOP - 34, 2, 28);
        g.fillStyle(0xffffff).fillRect(x0 + cx - 4, FLOOR_TOP - 37, 12, 3);
      };
      tube(Math.round(W * 0.36), 0xff7ab8, 0xffb0d0);
      tube(Math.round(W * 0.62), 0xffd84a, 0xfff4a8);
      // пальмы
      for (const fx of [0.08, 0.5, 0.86]) {
        const px = x0 + Math.round(W * fx);
        g.fillStyle(0xb8834f).fillRect(px, FLOOR_TOP - 24, 2, 18);
        g.fillStyle(0x4fa83d).fillRect(px - 6, FLOOR_TOP - 26, 14, 2).fillRect(px - 4, FLOOR_TOP - 28, 10, 2).fillRect(px - 8, FLOOR_TOP - 24, 3, 2).fillRect(px + 7, FLOOR_TOP - 24, 3, 2);
      }
    },
  },

  // ===== аттракционы: брусчатка с конфетти; у горизонта — колесо обозрения, шатры, гирлянда флажков
  rides: {
    bg(g, x0, { L }) {
      const { W, ROOM_H, FLOOR_TOP } = L;
      g.fillStyle(0xe8c9a0).fillRect(x0, FLOOR_TOP, W, ROOM_H - FLOOR_TOP);
      g.fillStyle(0xd6b386);
      for (let y = FLOOR_TOP + 4, r = 0; y < ROOM_H; y += 6, r++) {
        g.fillRect(x0, y, W, 1);
        for (let x = (r % 2) * 8; x < W; x += 16) g.fillRect(x0 + x, y - 5, 1, 5);
      }
      g.fillStyle(0xf6e2c0).fillRect(x0, FLOOR_TOP, W, 1);
      const cols = [0xef5a6f, 0xffd84a, 0x5ac4f2, 0x7ad98a, 0xff9ac8, 0xffffff];
      for (let i = 0; i < 26; i++) g.fillStyle(cols[i % cols.length]).fillRect(x0 + ((i * 47 + 5) % (W - 3)), FLOOR_TOP + 3 + ((i * 31) % Math.max(4, ROOM_H - FLOOR_TOP - 5)), 1 + (i % 2), 1);
    },
    fg(g, x0, { L }) {
      const { W, FLOOR_TOP } = L;
      // колесо обозрения
      const cx = x0 + Math.round(W * 0.64);
      const R0 = Math.min(22, Math.floor((FLOOR_TOP - 8) / 2));
      const cy = FLOOR_TOP - R0 - 6;
      g.fillStyle(0x8f96b0);
      for (let i = 0; i <= R0 + 6; i++) { g.fillRect(cx - Math.round(i * 0.45), cy + i, 1, 1); g.fillRect(cx + Math.round(i * 0.45), cy + i, 1, 1); } // опоры
      for (let a = 0; a < 360; a += 3) {
        const t = (a * Math.PI) / 180;
        g.fillStyle(0xff7ab8).fillRect(cx + Math.round(Math.cos(t) * R0), cy + Math.round(Math.sin(t) * R0), 1, 1);
      }
      for (let k = 0; k < 8; k++) {
        const t = (k * Math.PI) / 4;
        for (let i = 2; i < R0; i++) g.fillStyle(0x8f96b0).fillRect(cx + Math.round(Math.cos(t) * i), cy + Math.round(Math.sin(t) * i), 1, 1);
        const kx = cx + Math.round(Math.cos(t) * R0);
        const ky = cy + Math.round(Math.sin(t) * R0);
        g.fillStyle([0xef5a6f, 0xffd84a, 0x5ac4f2, 0x7ad98a][k % 4]).fillRect(kx - 2, ky, 5, 4);
        g.fillStyle(0xffffff).fillRect(kx - 1, ky + 1, 3, 1);
      }
      g.fillStyle(0xffd84a).fillRect(cx - 1, cy - 1, 3, 3);
      tent(g, x0 + Math.round(W * 0.1), FLOOR_TOP, 30, 26, 0xef5a6f, 0xffffff);
      tent(g, x0 + Math.round(W * 0.36), FLOOR_TOP, 24, 20, 0x5ac4f2, 0xffffff);
      tent(g, x0 + Math.round(W * 0.84), FLOOR_TOP, 26, 22, 0xffd84a, 0xffffff);
      bunting(g, x0, W - 34, Math.max(1, FLOOR_TOP - 52)); // до солнца: по нему тапают
    },
  },

  // ===== спортплощадка: беговая дорожка с разметкой и полоса газона; у горизонта — трибуны со зрителями и табло
  sport: {
    bg(g, x0, { L }) {
      const { W, ROOM_H, FLOOR_TOP } = L;
      const gy = FLOOR_TOP + 12;
      g.fillStyle(0x7fc45a).fillRect(x0, FLOOR_TOP, W, 12);
      for (let x = 0; x < W; x += 16) g.fillStyle(0x8fd16a).fillRect(x0 + x, FLOOR_TOP, 8, 12);
      g.fillStyle(0xffffff).fillRect(x0, FLOOR_TOP, W, 1).fillRect(x0, gy - 1, W, 1);
      g.fillStyle(0xd9764a).fillRect(x0, gy, W, ROOM_H - gy);
      g.fillStyle(0xc4623a);
      for (let i = 0; i < 40; i++) g.fillRect(x0 + ((i * 37 + 11) % (W - 2)), gy + 2 + ((i * 23) % Math.max(4, ROOM_H - gy - 3)), 2, 1);
      g.fillStyle(0xffffff);
      const lane = Math.max(7, Math.floor((ROOM_H - gy) / 3));
      for (let y = gy + lane; y < ROOM_H - 2; y += lane) g.fillRect(x0, y, W, 1);
    },
    fg(g, x0, { L }) {
      const { W, FLOOR_TOP } = L;
      // трибуны
      const rows = 4;
      for (let r = 0; r < rows; r++) {
        const y = FLOOR_TOP - 6 - r * 6;
        g.fillStyle(r % 2 ? 0x8f96b0 : 0xa8aec4).fillRect(x0, y, W, 6);
        const cols = [0xef5a6f, 0xffd84a, 0x5ac4f2, 0x7ad98a, 0xff9ac8, 0xffffff, 0xc48ff2];
        for (let x = 3 + (r % 2) * 4, i = r * 3; x < W - 3; x += 8, i++) {
          g.fillStyle(cols[(i * 5 + r) % cols.length]).fillRect(x0 + x, y + 2, 4, 4);
          g.fillStyle([0xf6d3b8, 0xe8b48f, 0xc98c62][(i + r) % 3]).fillRect(x0 + x + 1, y, 2, 2);
        }
      }
      g.fillStyle(0x5a5068).fillRect(x0, FLOOR_TOP - rows * 6 - 1, W, 1);
      // табло
      const sx = x0 + Math.round(W * 0.47);
      g.fillStyle(0x3a3040).fillRect(sx - 14, FLOOR_TOP - 46, 28, 12);
      g.fillStyle(0x8f96b0).fillRect(sx - 12, FLOOR_TOP - 34, 2, 4).fillRect(sx + 10, FLOOR_TOP - 34, 2, 4);
      g.fillStyle(0xffd84a).fillRect(sx - 10, FLOOR_TOP - 43, 3, 6).fillRect(sx - 5, FLOOR_TOP - 43, 3, 6);
      g.fillStyle(0xef5a6f).fillRect(sx + 3, FLOOR_TOP - 43, 3, 6).fillRect(sx + 8, FLOOR_TOP - 43, 3, 6);
      g.fillStyle(0xffffff).fillRect(sx - 1, FLOOR_TOP - 42, 1, 1).fillRect(sx - 1, FLOOR_TOP - 39, 1, 1);
      bunting(g, x0, W - 34, Math.max(1, FLOOR_TOP - 54), 3);
    },
  },
};
