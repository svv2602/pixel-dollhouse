// Фон комнат Центра (см. scenery.js): вокзал (на улице: платформа и рельсы), школа, больница, театр.

/** Окно с переплётом и небом (в школе и больнице). */
function win(g, x, y, w, h, frame = 0xffffff) {
  g.fillStyle(frame).fillRect(x - 2, y - 2, w + 4, h + 4);
  g.fillStyle(0x9fdcff).fillRect(x, y, w, h);
  g.fillStyle(0xc8ecff).fillRect(x, y + Math.round(h * 0.6), w, h - Math.round(h * 0.6));
  g.fillStyle(0xffffff).fillRect(x + 3, y + 3, 6, 2).fillRect(x + 5, y + 1, 3, 2);
  g.fillStyle(frame).fillRect(x + Math.floor(w / 2) - 1, y, 2, h).fillRect(x, y + Math.floor(h / 2) - 1, w, 2);
}

/** Пол из плитки или досок. */
function floor(g, x0, L, a, b, tile = 10) {
  const { W, ROOM_H, FLOOR_TOP } = L;
  g.fillStyle(a).fillRect(x0, FLOOR_TOP, W, ROOM_H - FLOOR_TOP);
  g.fillStyle(b);
  for (let y = FLOOR_TOP, k = 0; y < ROOM_H; y += tile, k++) {
    g.fillRect(x0, y, W, 1);
    for (let x = (k % 2) * Math.round(tile / 2); x < W; x += tile) g.fillRect(x0 + x, y, 1, tile);
  }
}

/**
 * Доска в школе: где она на стене (в координатах комнаты) и полочка с мелками под ней.
 * По этому же прямоугольнику школа принимает касания: водить пальцем — рисовать мелом (center.js).
 */
export function boardRect(L) {
  const { W, FLOOR_TOP } = L;
  const w = Math.min(112, Math.round(W * 0.44));
  const h = Math.max(20, Math.min(40, FLOOR_TOP - 16));
  return { x: Math.round(W * 0.28), y: Math.max(4, FLOOR_TOP - h - 10), w, h, tray: 6 };
}
/** Цвета мелков на полочке (последнее место на полочке — губка: стирает, где провели; два тапа по ней — всё). */
export const CHALKS = [0xffffff, 0xffd84a, 0xff9ac8, 0x8fd6f7];

export const CENTER_SCENERY = {
  // ===== вокзал: под открытым небом; за платформой — рельсы и здание вокзала с часами, табло над платформой
  station: {
    bg(g, x0, { L, winter }) {
      const { W, ROOM_H, FLOOR_TOP } = L;
      // рельсы у горизонта
      g.fillStyle(winter ? 0xf4f9ff : 0xb8a888).fillRect(x0, FLOOR_TOP, W, 8);
      g.fillStyle(0x8d5a3b);
      for (let x = 2; x < W; x += 7) g.fillRect(x0 + x, FLOOR_TOP + 1, 3, 6);
      g.fillStyle(0x8f96b0).fillRect(x0, FLOOR_TOP + 2, W, 1).fillRect(x0, FLOOR_TOP + 5, W, 1);
      // платформа: плитка и жёлтая линия у края
      floor(g, x0, { W, ROOM_H, FLOOR_TOP: FLOOR_TOP + 8 }, winter ? 0xe8eef8 : 0xd9dce8, winter ? 0xc8d4e4 : 0xc0c4d4, 12);
      g.fillStyle(0xffd84a).fillRect(x0, FLOOR_TOP + 10, W, 2);
      g.fillStyle(0xf2f4fa).fillRect(x0, FLOOR_TOP + 8, W, 1);
    },
    fg(g, x0, { L, winter }) {
      const { W, FLOOR_TOP } = L;
      // здание вокзала вдали
      const bx = x0 + 8;
      const bw = W - 16;
      const top = Math.max(6, FLOOR_TOP - 40);
      g.fillStyle(0xe8c9a0).fillRect(bx, top + 8, bw, FLOOR_TOP - top - 8);
      g.fillStyle(0xc98a52).fillRect(bx, top + 8, bw, 2);
      g.fillStyle(winter ? 0xffffff : 0xb8342c).fillRect(bx - 3, top + 4, bw + 6, 4);
      for (let x = bx + 8; x < bx + bw - 10; x += 22) {
        g.fillStyle(0xffffff).fillRect(x - 1, top + 14, 12, 14);
        g.fillStyle(0x8fd3ff).fillRect(x, top + 15, 10, 13);
        g.fillStyle(0xffffff).fillRect(x + 4, top + 15, 1, 13);
      }
      // башенка с часами посередине
      const cx = x0 + Math.round(W / 2);
      g.fillStyle(0xe8c9a0).fillRect(cx - 9, top - 4, 18, 12);
      g.fillStyle(winter ? 0xffffff : 0xb8342c).fillRect(cx - 11, top - 8, 22, 4).fillRect(cx - 6, top - 12, 12, 4);
      g.fillStyle(0xffffff).fillRect(cx - 5, top - 3, 10, 9);
      g.fillStyle(0x3a3040).fillRect(cx, top - 1, 1, 4).fillRect(cx, top + 2, 3, 1);
      // навес над платформой
      g.fillStyle(0x5a5068).fillRect(x0, 2, W, 3);
      for (let x = 20; x < W; x += 60) g.fillStyle(0x5a5068).fillRect(x0 + x, 5, 2, FLOOR_TOP + 4);
      // табло отправления
      const tx = x0 + Math.round(W * 0.2);
      g.fillStyle(0x3a3040).fillRect(tx, 7, 34, 11);
      g.fillStyle(0xffd84a).fillRect(tx + 2, 9, 12, 2).fillRect(tx + 2, 13, 9, 2);
      g.fillStyle(0x7af28a).fillRect(tx + 22, 9, 10, 2).fillRect(tx + 22, 13, 8, 2);
    },
  },

  // ===== школа: зелёные стены, доска с полочкой, окна, буквы над доской; пол — паркет
  school: {
    bg(g, x0, { L }) {
      const { W, FLOOR_TOP } = L;
      g.fillStyle(0xdff2d8).fillRect(x0, 0, W, FLOOR_TOP);
      g.fillStyle(0xb8dcae).fillRect(x0, FLOOR_TOP - 10, W, 10);
      g.fillStyle(0x9ac88e).fillRect(x0, FLOOR_TOP - 10, W, 1);
      floor(g, x0, L, 0xd9a874, 0xc08a58, 8);
      // доска
      const b = boardRect(L);
      const x = x0 + b.x;
      g.fillStyle(0xa8693c).fillRect(x - 3, b.y - 3, b.w + 6, b.h + 6);
      g.fillStyle(0x2f5a4a).fillRect(x, b.y, b.w, b.h);
      g.fillStyle(0xc98a52).fillRect(x - 4, b.y + b.h + 3, b.w + 8, 3); // полочка
      // мелки и губку на полочку кладёт center.js (выбранный приподнят)
      // азбука над доской
      const cols = [0xef5a6f, 0xffd84a, 0x5ac4f2, 0x7ad98a, 0xc48ff2];
      for (let i = 0; i < 5; i++) g.fillStyle(cols[i]).fillRect(x + 8 + i * Math.floor((b.w - 16) / 5), Math.max(0, b.y - 9), 5, 5);
      // окно слева от доски и часы справа
      win(g, x0 + W - 46, 8, 22, Math.min(24, FLOOR_TOP - 22));
      const cx = x0 + b.x + b.w + 14;
      g.fillStyle(0xffffff).fillRect(cx - 5, 8, 11, 11);
      g.fillStyle(0x3a3040).fillRect(cx, 10, 1, 4).fillRect(cx, 13, 3, 1);
    },
  },

  // ===== больница: голубые стены, крест на стене, окно, плитка
  hospital: {
    bg(g, x0, { L }) {
      const { W, FLOOR_TOP } = L;
      g.fillStyle(0xe6f6fb).fillRect(x0, 0, W, FLOOR_TOP);
      g.fillStyle(0xc8e8f2).fillRect(x0, FLOOR_TOP - 12, W, 12);
      g.fillStyle(0x8fd3e8).fillRect(x0, FLOOR_TOP - 12, W, 1);
      floor(g, x0, L, 0xf2f4fa, 0xd8dcec, 10);
      // красный крест на стене
      const cx = x0 + Math.round(W * 0.42);
      g.fillStyle(0xffffff).fillRect(cx - 9, 6, 18, 18);
      g.fillStyle(0xef5a6f).fillRect(cx - 3, 8, 6, 14).fillRect(cx - 7, 12, 14, 6);
      win(g, x0 + Math.round(W * 0.14), 8, 24, Math.min(24, FLOOR_TOP - 22));
      // сердечко-рисунок на стене
      const hx = x0 + Math.round(W * 0.66);
      g.fillStyle(0xff9ac8).fillRect(hx, 10, 3, 3).fillRect(hx + 4, 10, 3, 3).fillRect(hx, 12, 7, 2).fillRect(hx + 1, 14, 5, 1).fillRect(hx + 2, 15, 3, 1).fillRect(hx + 3, 16, 1, 1);
    },
  },

  // ===== театр: бархатные стены, золотые узоры, ложи; пол — тёмный паркет
  theater: {
    bg(g, x0, { L }) {
      const { W, FLOOR_TOP } = L;
      g.fillStyle(0x5a2a4a).fillRect(x0, 0, W, FLOOR_TOP);
      g.fillStyle(0x6e3a5a);
      for (let x = 0; x < W; x += 8) g.fillRect(x0 + x, 0, 3, FLOOR_TOP);
      g.fillStyle(0xffd84a).fillRect(x0, FLOOR_TOP - 3, W, 1);
      floor(g, x0, L, 0x8d5a3b, 0x6e4430, 9);
      // ложи с огоньками по бокам
      for (const lx of [6, W - 34]) {
        g.fillStyle(0x8a2a3a).fillRect(x0 + lx, 10, 28, 14);
        g.fillStyle(0xffd84a).fillRect(x0 + lx, 10, 28, 1).fillRect(x0 + lx, 23, 28, 1);
        for (let i = 0; i < 4; i++) g.fillStyle(0xfff4a8).fillRect(x0 + lx + 3 + i * 7, 7, 2, 2);
      }
      // люстра
      const cx = x0 + Math.round(W / 2);
      g.fillStyle(0xffd84a).fillRect(cx, 0, 1, 4).fillRect(cx - 6, 4, 13, 2);
      for (const dx of [-6, -2, 2, 6]) g.fillStyle(0xfff4a8).fillRect(cx + dx, 6, 1, 2);
    },
  },
};
