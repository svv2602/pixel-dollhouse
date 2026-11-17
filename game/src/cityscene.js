// Фон комнат Города (см. scenery.js): улица с четырьмя магазинами и сквером и сами магазины —
// супермаркет, кафе, магазин одежды, магазин игрушек. Улица — на улице: небо рисует общий слой.

/** Картинка из строк: буква — цвет из палитры. */
function px(g, rows, x, y, pal) {
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => { if (pal[ch] !== undefined) g.fillStyle(pal[ch]).fillRect(x + dx, y + dy, 1, 1); }));
}

/**
 * Магазины на улице: где стоит каждый фасад (в координатах комнаты) и в какую комнату ведёт.
 * По этим же прямоугольникам улица принимает тап: тап по магазину — входим (см. city.js).
 */
export function streetShops(L) {
  const { W, FLOOR_TOP } = L;
  const step = Math.floor((Math.round(W * 0.76) - 6) / 4);
  return ['market', 'cafe', 'clothes', 'toyshop'].map((key, i) => {
    const top = Math.max(2, FLOOR_TOP - [43, 38, 46, 40][i]);
    return { key, x: 4 + i * step, w: step - 3, top, h: FLOOR_TOP - top };
  });
}

/**
 * Дверь на улицу в каждом магазине: где она на стене (в координатах комнаты). Стоит слева, сразу за стрелкой:
 * улица — левее всех магазинов. По этому же прямоугольнику магазин принимает тап: тап по двери — выходим (см. city.js).
 */
export function exitDoor(L) {
  const h = Math.min(31, L.FLOOR_TOP - 10);
  return { x: 20, w: 17, h, top: L.FLOOR_TOP - 2 - h };
}

/** Распахнутая дверь на улицу: в проёме небо с солнцем, дома и тротуар; над дверью — табличка со светофором. */
function doorOut(g, x0, c, frame) {
  const d = exitDoor(c.L);
  const x = x0 + d.x;
  const { top, w, h } = d;
  g.fillStyle(0xffffff).fillRect(x - 2, top - 2, w + 4, h + 2);
  g.fillStyle(0x9fdcff).fillRect(x, top, w, h);
  g.fillStyle(0xc8ecff).fillRect(x, top + Math.round(h * 0.45), w, Math.round(h * 0.25));
  g.fillStyle(0xffe066).fillRect(x + w - 6, top + 2, 4, 4);
  g.fillStyle(0xff9ac8).fillRect(x + 1, top + h - 16, 5, 10);
  g.fillStyle(0x5a7fd9).fillRect(x + 6, top + h - 20, 5, 14);
  g.fillStyle(0xffffff).fillRect(x + 2, top + h - 14, 1, 1).fillRect(x + 2, top + h - 11, 1, 1).fillRect(x + 7, top + h - 18, 1, 1).fillRect(x + 9, top + h - 15, 1, 1).fillRect(x + 7, top + h - 12, 1, 1);
  g.fillStyle(0xd9dce8).fillRect(x, top + h - 6, w, 6);
  g.fillStyle(0x9aa0b4).fillRect(x, top + h - 6, w, 1);
  // створка, открытая наружу, и ручка
  g.fillStyle(frame).fillRect(x + w - 3, top, 3, h);
  g.fillStyle(0xffd84a).fillRect(x + w - 3, top + Math.round(h * 0.55), 2, 2);
  // табличка: светофор — «на улицу»
  const sy = Math.max(1, top - 12);
  g.fillStyle(0xffffff).fillRect(x + 3, sy, 11, 9);
  g.fillStyle(frame).fillRect(x + 3, sy + 8, 11, 1);
  g.fillStyle(0x3a3040).fillRect(x + 7, sy + 1, 3, 7);
  g.fillStyle(0xff4a4a).fillRect(x + 8, sy + 2, 1, 1);
  g.fillStyle(0xffd84a).fillRect(x + 8, sy + 4, 1, 1);
  g.fillStyle(0x5cf27a).fillRect(x + 8, sy + 6, 1, 1);
}

const SHOP_LOOK = {
  market: { wall: 0xfff3d6, dark: 0xe0c890, awn: 0x52b893, door: 0x52b893 },
  cafe: { wall: 0xffd9c2, dark: 0xe8a888, awn: 0xef5a6f, door: 0xa8683f },
  clothes: { wall: 0xe8d8f5, dark: 0xc9b3e0, awn: 0xb47cf2, door: 0x8a52cc },
  toyshop: { wall: 0xcfeeff, dark: 0x9fd2e2, awn: 0xf2c94c, door: 0x5a7fd9 },
};
const SIGN = {
  market: [['..G..', '.RRR.', 'RRRRR', 'RRRRR', '.RRR.'], { R: 0xef5a6f, G: 0x52b893 }],
  cafe: [['.S.S.', '.....', 'WWWWB', 'WWWWB', '.WW..'], { W: 0xa8683f, B: 0xa8683f, S: 0xb8bccc }],
  clothes: [['.P.P.', '.PPP.', '.PPP.', 'PPPPP', 'PPPPP'], { P: 0xff7ab8 }],
  toyshop: [['B...B', '.BBB.', 'BEBEB', '.BBB.', '..B..'], { B: 0xc98a52, E: 0x2b1d2e }],
};

/** Что стоит в витрине магазина. */
function shopWindow(g, key, x, y, w, h) {
  const by = y + h; // подоконник
  if (key === 'market') {
    for (let i = 0; i * 5 + 4 < w; i++) g.fillStyle([0xef5a6f, 0xffd84a, 0x7ad98a, 0xf2955a][i % 4]).fillRect(x + 1 + i * 5, by - 4, 4, 4);
    for (let i = 0; i * 5 + 7 < w; i++) g.fillStyle([0xffd84a, 0xef5a6f, 0xf2955a][i % 3]).fillRect(x + 3 + i * 5, by - 8, 4, 4);
  } else if (key === 'cafe') {
    g.fillStyle(0xffffff).fillRect(x + 2, by - 2, 10, 2);
    g.fillStyle(0xf2d39a).fillRect(x + 3, by - 7, 8, 5);
    g.fillStyle(0xff9ac8).fillRect(x + 3, by - 8, 8, 2);
    g.fillStyle(0xef5a6f).fillRect(x + 6, by - 10, 2, 2);
    if (w > 20) { g.fillStyle(0xffffff).fillRect(x + 15, by - 6, 5, 6); g.fillStyle(0xa8683f).fillRect(x + 15, by - 6, 5, 2); }
  } else if (key === 'clothes') {
    g.fillStyle(0x8f96b0).fillRect(x + 6, by - 4, 1, 4);
    g.fillStyle(0xff7ab8).fillRect(x + 4, by - 11, 5, 3).fillRect(x + 3, by - 8, 7, 5);
    g.fillStyle(0xf2d6a0).fillRect(x + 5, by - 14, 3, 3);
    if (w > 20) { g.fillStyle(0x5a7fd9).fillRect(x + 15, by - 4, 8, 2).fillRect(x + 17, by - 8, 4, 4); g.fillStyle(0xffd84a).fillRect(x + 17, by - 5, 4, 1); }
  } else {
    g.fillStyle(0xef5a6f).fillRect(x + 2, by - 6, 6, 6);
    g.fillStyle(0xffffff).fillRect(x + 2, by - 4, 6, 1);
    g.fillStyle(0x7ad98a).fillRect(x + 10, by - 4, 4, 4);
    g.fillStyle(0xb47cf2).fillRect(x + 14, by - 4, 4, 4);
    g.fillStyle(0xffd84a).fillRect(x + 12, by - 8, 4, 4);
  }
}

/** Фасад магазина: карниз, вывеска с картинкой, полосатый навес, витрина и дверь. */
function shopFront(g, x0, c, s) {
  const { FLOOR_TOP } = c.L;
  const look = SHOP_LOOK[s.key];
  const x = x0 + s.x;
  const { w, top } = s;
  g.fillStyle(look.wall).fillRect(x, top, w, FLOOR_TOP - top);
  g.fillStyle(look.dark).fillRect(x + w - 2, top, 2, FLOOR_TOP - top);
  g.fillStyle(look.dark).fillRect(x - 1, top, w + 2, 2);
  g.fillStyle(c.winter ? 0xffffff : look.awn).fillRect(x - 1, top - 2, w + 2, 2);
  // вывеска
  const sy = top + 4;
  g.fillStyle(0xffffff).fillRect(x + 8, sy, w - 16, 9);
  g.fillStyle(look.awn).fillRect(x + 8, sy + 8, w - 16, 1);
  const [rows, pal] = SIGN[s.key];
  px(g, rows, x + Math.floor(w / 2) - 2, sy + 2, pal);
  // навес в полоску с фестонами
  const ay = top + 15;
  for (let i = 0; i < w + 2; i++) {
    const col = Math.floor(i / 4) % 2 ? 0xffffff : look.awn;
    g.fillStyle(col).fillRect(x - 1 + i, ay, 1, 4);
    if (i % 4 === 1 || i % 4 === 2) g.fillRect(x - 1 + i, ay + 4, 1, 1);
  }
  // дверь справа, витрина слева
  const dy = ay + 6;
  const dx = x + w - 15;
  g.fillStyle(0xffffff).fillRect(dx - 1, dy - 1, 13, FLOOR_TOP - dy + 1);
  g.fillStyle(look.door).fillRect(dx, dy, 11, FLOOR_TOP - dy);
  g.fillStyle(0xcfeeff).fillRect(dx + 2, dy + 2, 7, Math.max(3, Math.round((FLOOR_TOP - dy) * 0.45)));
  g.fillStyle(0xffd84a).fillRect(dx + 8, dy + Math.round((FLOOR_TOP - dy) * 0.62), 2, 2);
  const wx = x + 3;
  const ww = dx - wx - 3;
  const wh = Math.max(6, FLOOR_TOP - dy - 5);
  g.fillStyle(0xffffff).fillRect(wx - 1, dy - 1, ww + 2, wh + 3);
  g.fillStyle(0xcfeeff).fillRect(wx, dy, ww, wh);
  g.fillStyle(0xffffff).fillRect(wx + 2, dy + 1, 1, Math.min(6, wh - 2)).fillRect(wx + 4, dy + 1, 1, Math.min(3, wh - 2));
  shopWindow(g, s.key, wx, dy, ww, wh);
  g.fillStyle(0x24123c).fillRect(x, FLOOR_TOP - 1, w, 1);
}

/** Края магазина: узкие простенки слева и справа — видно, где кончается комната. */
function trim(g, x0, { L }, color) {
  g.fillStyle(color).fillRect(x0, 0, 2, L.FLOOR_TOP).fillRect(x0 + L.W - 2, 0, 2, L.FLOOR_TOP);
}

/** Пол в клетку. */
function tiles(g, x0, { L }, a, b, size) {
  const { W, ROOM_H, FLOOR_TOP } = L;
  for (let y = FLOOR_TOP, r = 0; y < ROOM_H; y += size, r++) {
    for (let x = 0, k = r % 2; x < W; x += size, k ^= 1) g.fillStyle(k ? a : b).fillRect(x0 + x, y, size, size);
  }
}

export const CITY_SCENERY = {
  // ===== улица: тротуар из плитки, бордюр, дорога с разметкой и «зеброй»
  street: {
    bg(g, x0, c) {
      const { W, ROOM_H, FLOOR_TOP } = c.L;
      const side = Math.round((ROOM_H - FLOOR_TOP) * 0.42);
      const ry = FLOOR_TOP + side;
      g.fillStyle(c.winter ? 0xeef4fb : 0xd9dce8).fillRect(x0, FLOOR_TOP, W, side);
      g.fillStyle(c.winter ? 0xd9e8f5 : 0xc3c7d6).fillRect(x0, FLOOR_TOP + Math.floor(side / 2), W, 1);
      for (let x = 0; x < W; x += 12) g.fillRect(x0 + x, FLOOR_TOP, 1, side);
      g.fillStyle(0xf4f5fa).fillRect(x0, FLOOR_TOP, W, 1);
      g.fillStyle(0x9aa0b4).fillRect(x0, ry - 2, W, 2);
      g.fillStyle(0x6b6f84).fillRect(x0, ry, W, ROOM_H - ry);
      g.fillStyle(0x7d8198);
      for (let y = ry + 2, r = 0; y < ROOM_H; y += 4, r++) for (let x = (r % 3) * 5; x < W; x += 15) g.fillRect(x0 + x, y, 2, 1);
      const my = ry + Math.round((ROOM_H - ry) / 2);
      g.fillStyle(0xf4f5fa);
      for (let x = 4; x < W; x += 18) g.fillRect(x0 + x, my, 10, 1);
      // пешеходный переход
      const zx = Math.round(W * 0.44);
      g.fillStyle(0x6b6f84).fillRect(x0 + zx - 3, ry, 32, ROOM_H - ry);
      g.fillStyle(0xf4f5fa);
      for (let y = ry + 2; y < ROOM_H - 2; y += 5) g.fillRect(x0 + zx, y, 26, 3);
    },
    fg(g, x0, c) {
      const { W, FLOOR_TOP } = c.L;
      // дальние дома — бледные силуэты с окошками
      for (let x = 0, i = 0; x < W; x += 13, i++) {
        const h = Math.min(FLOOR_TOP - 4, 16 + ((i * 7) % 17));
        g.fillStyle(i % 2 ? 0xb9cbe8 : 0xc7d6ee).fillRect(x0 + x, FLOOR_TOP - h, 13, h);
        g.fillStyle(0xe6eefb);
        for (let y = FLOOR_TOP - h + 3; y < FLOOR_TOP - 4; y += 5) g.fillRect(x0 + x + 3, y, 2, 2).fillRect(x0 + x + 8, y, 2, 2);
      }
      const shops = streetShops(c.L);
      for (const s of shops) shopFront(g, x0, c, s);
      // сквер справа: дерево, куст и низкая оградка — здесь стоит остановка
      const last = shops[shops.length - 1];
      const gx = x0 + last.x + last.w + 3;
      const tx = gx + 9;
      g.fillStyle(0x8d5a3b).fillRect(tx, FLOOR_TOP - 16, 3, 16);
      g.fillStyle(c.winter ? 0xf4f9ff : 0x5fbf4a).fillRect(tx - 7, FLOOR_TOP - 29, 17, 13).fillRect(tx - 5, FLOOR_TOP - 32, 13, 3).fillRect(tx - 9, FLOOR_TOP - 26, 21, 8);
      g.fillStyle(c.winter ? 0xffffff : 0x8fe07a).fillRect(tx - 5, FLOOR_TOP - 30, 6, 3).fillRect(tx - 7, FLOOR_TOP - 26, 3, 3);
      g.fillStyle(0xfff8f0);
      for (let x = gx + 20; x < x0 + W; x += 7) g.fillRect(x, FLOOR_TOP - 7, 2, 7);
      g.fillRect(gx + 20, FLOOR_TOP - 5, x0 + W - gx - 20, 1);
    },
  },

  // ===== супермаркет: светлая стена с зелёной полосой и ценниками, пол в крупную клетку
  market: {
    bg(g, x0, c) {
      const { W, FLOOR_TOP } = c.L;
      g.fillStyle(0xfff3d6).fillRect(x0, 0, W, FLOOR_TOP);
      g.fillStyle(0x7ad98a).fillRect(x0, 0, W, 7);
      g.fillStyle(0x52b893).fillRect(x0, 7, W, 1);
      g.fillStyle(0xffffff);
      for (let x = 6; x < W; x += 16) g.fillRect(x0 + x, 2, 8, 3);
      // плакаты: яблоко, морковка, бутылка молока
      const poster = (x, rows, pal) => {
        g.fillStyle(0xffffff).fillRect(x0 + x, 13, 15, 15);
        g.fillStyle(0xf2c94c).fillRect(x0 + x, 13, 15, 1).fillRect(x0 + x, 27, 15, 1);
        px(g, rows, x0 + x + 4, 17, pal);
      };
      poster(Math.round(W * 0.12), ['...G...', '.RRRRR.', 'RRRRRRR', 'RRRRRRR', 'RRRRRRR', '.RRRRR.', '..R.R..'], { R: 0xef5a6f, G: 0x52b893 });
      poster(Math.round(W * 0.47), ['.....GG', '....GG.', '..OOO..', '.OOOO..', '.OOO...', 'OOO....', 'O......'], { O: 0xf2955a, G: 0x52b893 });
      poster(Math.round(W * 0.82), ['..BB...', '..WW...', '.WWWW..', '.WWWW..', '.WBBW..', '.WWWW..', '.WWWW..'], { W: 0xbfe6ff, B: 0x5a7fd9 });
      g.fillStyle(0xf2e2b8).fillRect(x0, FLOOR_TOP - 12, W, 10);
      g.fillStyle(0xe0c890).fillRect(x0, FLOOR_TOP - 13, W, 1);
      g.fillStyle(0x52b893).fillRect(x0, FLOOR_TOP - 2, W, 2);
      tiles(g, x0, c, 0xffffff, 0xd8e6f0, 8);
      trim(g, x0, c, 0x52b893);
      doorOut(g, x0, c, 0x52b893);
    },
  },

  // ===== кафе: тёплая стена, деревянные панели, грифельное меню, лампы на шнурах, дощатый пол
  cafe: {
    bg(g, x0, c) {
      const { W, ROOM_H, FLOOR_TOP } = c.L;
      g.fillStyle(0xffe3d0).fillRect(x0, 0, W, FLOOR_TOP);
      g.fillStyle(0xffd0b4);
      for (let y = 6, r = 0; y < FLOOR_TOP - 18; y += 9, r++) for (let x = r % 2 ? 11 : 3; x < W; x += 16) g.fillRect(x0 + x, y, 2, 2);
      // лампы
      for (let x = Math.round(W * 0.2); x < W; x += Math.round(W * 0.3)) {
        g.fillStyle(0x8d5a3b).fillRect(x0 + x, 0, 1, 7);
        g.fillStyle(0xef5a6f).fillRect(x0 + x - 3, 7, 7, 3).fillRect(x0 + x - 2, 6, 5, 1);
        g.fillStyle(0xfff07a).fillRect(x0 + x - 1, 10, 3, 2);
      }
      // меню на грифельной доске
      const mx = x0 + Math.round(W * 0.66);
      g.fillStyle(0xa8683f).fillRect(mx - 1, 14, 34, 22);
      g.fillStyle(0x3a4a44).fillRect(mx + 1, 16, 30, 18);
      px(g, ['.S.S.', '.....', 'WWWWW', 'WWWWW', '.WWW.'], mx + 4, 19, { W: 0xffffff, S: 0xb8ccc4 });
      px(g, ['..R..', '.PPP.', 'PPPPP', 'YYYYY', 'YYYYY'], mx + 4, 27, { P: 0xff9ac8, Y: 0xf2d39a, R: 0xef5a6f });
      g.fillStyle(0xffffff).fillRect(mx + 13, 20, 12, 1).fillRect(mx + 13, 23, 8, 1).fillRect(mx + 13, 28, 12, 1).fillRect(mx + 13, 31, 6, 1);
      // панели
      const wy = FLOOR_TOP - 15;
      g.fillStyle(0xc98a52).fillRect(x0, wy, W, 15);
      g.fillStyle(0xe0a971).fillRect(x0, wy, W, 1);
      g.fillStyle(0xa8693c);
      for (let x = 5; x < W; x += 11) g.fillRect(x0 + x, wy + 2, 1, 11);
      g.fillStyle(0x7a4a32).fillRect(x0, FLOOR_TOP - 2, W, 2);
      for (let y = FLOOR_TOP, r = 0; y < ROOM_H; y += 6, r++) {
        g.fillStyle(r % 2 ? 0xd9a066 : 0xe0ab74).fillRect(x0, y, W, 6);
        g.fillStyle(0xb98153).fillRect(x0, y + 5, W, 1);
        for (let x = (r % 2) * 14; x < W; x += 28) g.fillRect(x0 + x, y, 1, 5);
      }
      trim(g, x0, c, 0xa8683f);
      doorOut(g, x0, c, 0xa8683f);
    },
  },

  // ===== магазин одежды: сиреневая стена в полоску со звёздами, розовый ковролин
  clothes: {
    bg(g, x0, c) {
      const { W, ROOM_H, FLOOR_TOP } = c.L;
      g.fillStyle(0xf3e2ff).fillRect(x0, 0, W, FLOOR_TOP);
      g.fillStyle(0xe8d0fa);
      for (let x = 4; x < W; x += 10) g.fillRect(x0 + x, 0, 3, FLOOR_TOP);
      g.fillStyle(0xffd84a);
      for (let x = 14, i = 0; x < W; x += 34, i++) {
        const y = 8 + (i % 2) * 9;
        g.fillRect(x0 + x, y, 1, 1).fillRect(x0 + x - 1, y + 1, 3, 1).fillRect(x0 + x, y + 2, 1, 1);
      }
      g.fillStyle(0xe2c3f2).fillRect(x0, FLOOR_TOP - 12, W, 10);
      g.fillStyle(0xc9a3e0).fillRect(x0, FLOOR_TOP - 13, W, 1);
      g.fillStyle(0x8a52cc).fillRect(x0, FLOOR_TOP - 2, W, 2);
      g.fillStyle(0xf2c6d8).fillRect(x0, FLOOR_TOP, W, ROOM_H - FLOOR_TOP);
      g.fillStyle(0xe8b4ca);
      for (let y = FLOOR_TOP + 2, r = 0; y < ROOM_H; y += 4, r++) for (let x = (r % 2) * 4; x < W; x += 8) g.fillRect(x0 + x, y, 2, 1);
      g.fillStyle(0xfadbe8).fillRect(x0, FLOOR_TOP, W, 1);
      trim(g, x0, c, 0x8a52cc);
      doorOut(g, x0, c, 0x8a52cc);
    },
  },

  // ===== магазин игрушек: голубая стена с облаками и флажками, жёлто-оранжевый пол в клетку
  toyshop: {
    bg(g, x0, c) {
      const { W, FLOOR_TOP } = c.L;
      g.fillStyle(0xd6f0ff).fillRect(x0, 0, W, FLOOR_TOP);
      g.fillStyle(0xffffff);
      for (let x = 18, i = 0; x < W - 20; x += 46, i++) {
        const y = 16 + (i % 2) * 8;
        g.fillRect(x0 + x, y, 16, 4).fillRect(x0 + x + 3, y - 3, 8, 3).fillRect(x0 + x + 9, y - 2, 5, 2);
      }
      // гирлянда флажков
      const cols = [0xef5a6f, 0xffd84a, 0x7ad98a, 0x5a7fd9, 0xb47cf2];
      g.fillStyle(0x8d5a3b).fillRect(x0, 3, W, 1);
      for (let x = 3, i = 0; x < W - 5; x += 9, i++) {
        g.fillStyle(cols[i % cols.length]);
        for (let k = 0; k < 4; k++) g.fillRect(x0 + x + k, 4 + k, 7 - k * 2 > 0 ? 7 - k * 2 : 1, 1);
      }
      g.fillStyle(0xbfe6ff).fillRect(x0, FLOOR_TOP - 12, W, 10);
      g.fillStyle(0x9fd2e2).fillRect(x0, FLOOR_TOP - 13, W, 1);
      g.fillStyle(0x5a7fd9).fillRect(x0, FLOOR_TOP - 2, W, 2);
      tiles(g, x0, c, 0xffe38a, 0xf2c94c, 8);
      trim(g, x0, c, 0x5a7fd9);
      doorOut(g, x0, c, 0x5a7fd9);
    },
  },
};
