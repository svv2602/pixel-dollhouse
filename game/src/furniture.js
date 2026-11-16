// Крупная мебель, нарисованная в коде (в датасете вся мебель 16×16 — для комнаты мала).
// Рисуется прямоугольниками с заливкой/бликом/тенью, затем автоматический тёмный контур —
// тот же стиль, что у персонажей и спрайтов датасета. Масштаб пикселя — 1, как у всего в сцене.

const OUTLINE = '#2b1d2e';

const C = {
  wood: '#c98a52', woodD: '#a8693c', woodL: '#e0a971', woodK: '#7a4a32',
  pink: '#f49ac1', pinkD: '#d97aa5', pinkL: '#ffd0e4',
  white: '#ffffff', whiteD: '#e3e3ef',
  gold: '#f2c94c', goldD: '#c99a2e',
  mint: '#7ad9b5', mintD: '#52b893', mintL: '#a8f0d4',
  lilac: '#e8d8f5', lilacD: '#c9b3e0', lilacL: '#fbf5ff', lilacK: '#9b7fb8',
  fridge: '#bff0de', fridgeD: '#93d9bf', fridgeL: '#e6fff5', fridgeK: '#6fb79c',
  shade: '#fff0a0', shadeD: '#f2d36b', pole: '#8d6e5a', poleL: '#b08f78',
};

export function outline(c) {
  const g = c.getContext('2d', { willReadFrequently: true }); // контур читает пиксели
  const img = g.getImageData(0, 0, c.width, c.height);
  const a = (x, y) => (x < 0 || y < 0 || x >= c.width || y >= c.height ? 0 : img.data[(y * c.width + x) * 4 + 3]);
  const edge = [];
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (a(x, y)) continue;
      if (a(x + 1, y) || a(x - 1, y) || a(x, y + 1) || a(x, y - 1)) edge.push([x, y]);
    }
  }
  g.fillStyle = OUTLINE;
  for (const [x, y] of edge) g.fillRect(x, y, 1, 1);
}

function canvasFor(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w + 2;
  c.height = h + 2;
  const g = c.getContext('2d', { willReadFrequently: true }); // контур читает пиксели
  const r = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x + 1, y + 1, ww, hh); };
  const clear = (x, y) => g.clearRect(x + 1, y + 1, 1, 1);
  draw(r, clear);
  outline(c);
  return c;
}

const PIECES = {
  // ------------------------------------------------------------ кровать 42×28
  bed: [42, 28, (r, clear) => {
    // изголовье
    r(0, 2, 5, 26, C.wood); r(1, 0, 3, 2, C.wood); r(1, 2, 1, 22, C.woodL); r(4, 2, 1, 26, C.woodD);
    r(1, 5, 1, 1, C.pink); r(3, 5, 1, 1, C.pink); r(1, 6, 3, 1, C.pink); r(2, 7, 1, 1, C.pink);
    // изножье
    r(37, 10, 5, 18, C.wood); r(38, 8, 3, 2, C.wood); r(38, 10, 1, 14, C.woodL); r(41, 10, 1, 18, C.woodD);
    // боковина
    r(5, 19, 32, 4, C.wood); r(5, 19, 32, 1, C.woodL); r(5, 22, 32, 1, C.woodD);
    // матрас и подушка
    r(5, 14, 32, 5, C.white); r(5, 18, 32, 1, C.whiteD);
    r(6, 10, 9, 5, C.white); r(6, 14, 9, 1, C.whiteD); r(14, 11, 1, 3, C.whiteD); r(7, 11, 3, 1, C.pinkL);
    // одеяло
    r(14, 12, 23, 8, C.pink); r(14, 12, 23, 2, C.pinkL); r(14, 19, 23, 1, C.pinkD); r(14, 12, 1, 8, C.pinkD);
    for (let x = 17; x < 36; x += 4) { r(x, 15, 1, 1, C.pinkL); r(x + 2, 17, 1, 1, C.pinkL); }
    clear(0, 2); clear(4, 2); clear(37, 10); clear(41, 10);
  }],

  // ------------------------------------------------------------ стол 34×22 (со скатертью)
  table: [34, 22, (r) => {
    r(0, 0, 34, 4, C.white); r(0, 0, 34, 1, C.white); r(0, 3, 34, 1, C.whiteD);
    for (let x = 0; x < 34; x += 2) r(x, 4, 1, 2, C.white);           // кружевной край
    for (let x = 2; x < 33; x += 6) r(x, 1, 2, 1, C.pinkL);            // узор
    r(2, 6, 30, 2, C.woodD);                                           // царга
    r(3, 8, 3, 14, C.wood); r(3, 8, 1, 14, C.woodL); r(5, 8, 1, 14, C.woodD);
    r(28, 8, 3, 14, C.wood); r(28, 8, 1, 14, C.woodL); r(30, 8, 1, 14, C.woodD);
  }],

  // ------------------------------------------------------------ шкаф 26×42 (контейнер)
  wardrobe: [26, 42, (r, clear) => {
    r(0, 0, 26, 3, C.lilacD); r(0, 0, 26, 1, C.lilacL);
    r(1, 3, 24, 37, C.lilac); r(1, 3, 1, 37, C.lilacL); r(24, 3, 1, 37, C.lilacD);
    r(12, 4, 1, 27, C.lilacK);                                         // щель между дверцами
    r(3, 6, 7, 22, C.lilacD); r(4, 7, 5, 20, C.lilac);                 // филёнки
    r(15, 6, 7, 22, C.lilacD); r(16, 7, 5, 20, C.lilac);
    r(10, 16, 1, 3, C.gold); r(14, 16, 1, 3, C.gold);                  // ручки
    r(1, 31, 24, 1, C.lilacK); r(2, 32, 22, 7, C.lilac); r(2, 38, 22, 1, C.lilacD);
    r(11, 34, 4, 2, C.gold); r(11, 35, 4, 1, C.goldD);                 // ящик
    r(6, 10, 3, 1, C.pinkL); r(18, 10, 3, 1, C.pinkL);                 // сердечко-узор
    r(1, 40, 3, 2, C.lilacK); r(22, 40, 3, 2, C.lilacK);               // ножки
    clear(0, 0); clear(25, 0);
  }],

  // ------------------------------------------------------------ диван 40×22
  sofa: [40, 22, (r, clear) => {
    r(2, 0, 36, 11, C.mint); r(3, 1, 34, 1, C.mintL); r(2, 10, 36, 1, C.mintD);
    for (let x = 7; x < 36; x += 7) r(x, 5, 1, 1, C.mintD);            // стёжка
    r(5, 11, 30, 5, C.mint); r(5, 11, 30, 1, C.mintL); r(20, 11, 1, 5, C.mintD); r(5, 15, 30, 1, C.mintD);
    r(0, 5, 6, 13, C.mint); r(1, 4, 4, 1, C.mint); r(1, 5, 3, 1, C.mintL); r(5, 5, 1, 13, C.mintD);
    r(34, 5, 6, 13, C.mint); r(35, 4, 4, 1, C.mint); r(35, 5, 3, 1, C.mintL); r(34, 5, 1, 13, C.mintD);
    r(2, 16, 36, 3, C.mintD);
    r(3, 19, 2, 3, C.woodK); r(35, 19, 2, 3, C.woodK);
    r(8, 7, 7, 4, C.pink); r(8, 7, 7, 1, C.pinkL); r(14, 7, 1, 4, C.pinkD); // подушка-сердечко
    clear(2, 0); clear(37, 0);
  }],

  // ------------------------------------------------------------ холодильник 22×38 (контейнер)
  fridge: [22, 38, (r, clear) => {
    r(0, 0, 22, 37, C.fridge); r(0, 1, 1, 35, C.fridgeL); r(21, 0, 1, 37, C.fridgeD);
    r(1, 0, 20, 1, C.fridgeL);
    r(0, 12, 22, 1, C.fridgeK);
    r(17, 4, 2, 5, C.fridgeK); r(17, 16, 2, 10, C.fridgeK);
    r(4, 18, 1, 1, C.pink); r(6, 18, 1, 1, C.pink); r(4, 19, 3, 1, C.pink); r(5, 20, 1, 1, C.pink); // магнит-сердце
    r(9, 24, 2, 2, C.gold); r(5, 28, 2, 2, C.mintD);                                            // магниты
    r(3, 4, 6, 4, C.white); r(3, 4, 6, 1, C.whiteD);                                            // записка
    r(1, 37, 3, 1, C.fridgeK); r(18, 37, 3, 1, C.fridgeK);
    clear(0, 0); clear(21, 0);
  }],

  // ------------------------------------------------------------ сундук для игрушек 28×18 (контейнер)
  chest: [28, 18, (r, clear) => {
    r(0, 6, 28, 12, C.pink); r(0, 6, 28, 1, C.pinkL); r(0, 17, 28, 1, C.pinkD);
    r(0, 0, 28, 6, C.pinkD); r(1, 0, 26, 1, C.pink); r(0, 5, 28, 1, C.woodK);
    r(5, 0, 2, 18, C.gold); r(21, 0, 2, 18, C.gold); r(6, 0, 1, 18, C.goldD); r(22, 0, 1, 18, C.goldD);
    r(12, 4, 4, 5, C.gold); r(13, 6, 2, 2, C.woodK);
    r(10, 11, 1, 1, C.white); r(17, 13, 1, 1, C.white); r(3, 12, 1, 1, C.white); r(25, 10, 1, 1, C.white);
    clear(0, 0); clear(27, 0);
  }],

  // ------------------------------------------------------------ торшер 14×40 (свет)
  lamp: [14, 40, (r) => {
    for (let y = 0; y < 10; y++) {
      const w = 8 + Math.floor((y * 6) / 9);
      const x = Math.floor((14 - w) / 2);
      r(x, y, w, 1, C.shade);
      r(x + w - 2, y, 2, 1, C.shadeD);
    }
    r(0, 10, 14, 1, C.pinkD);
    r(6, 11, 2, 26, C.pole); r(6, 11, 1, 26, C.poleL);
    r(3, 37, 8, 2, C.pole); r(2, 39, 10, 1, C.pole); r(3, 37, 8, 1, C.poleL);
  }],

  // ------------------------------------------------------------ волшебный котёл 26×22
  cauldron: [26, 22, (r) => {
    const body = '#3a2e48';
    const bodyL = '#5c4c70';
    const bodyD = '#2a2036';
    for (let y = 6; y < 19; y++) {
      const inset = y < 14 ? 0 : [1, 2, 3, 5, 7][y - 14];
      r(inset, y, 26 - inset * 2, 1, body);
      if (y > 7 && y < 16) { r(inset + 2, y, 2, 1, bodyL); r(26 - inset - 2, y, 1, 1, bodyD); }
    }
    r(0, 4, 26, 3, '#4a3a5a'); r(1, 4, 24, 1, '#7a6a8a');            // обод
    r(3, 2, 20, 2, '#5fe08a'); r(4, 2, 18, 1, '#9ff5b8');             // зелье
    r(6, 0, 3, 2, '#9ff5b8'); r(15, 1, 2, 1, '#c8ffd8'); r(19, 0, 2, 2, '#5fe08a'); // пузыри
    r(11, 10, 1, 3, C.gold); r(10, 11, 3, 1, C.gold);                 // звёздочки
    r(17, 13, 1, 1, C.gold); r(6, 13, 1, 1, C.gold);
    r(4, 19, 3, 3, bodyD); r(19, 19, 3, 3, bodyD);                     // ножки
  }],

  // ------------------------------------------------------------ альбом открытий 16×18
  album: [16, 18, (r) => {
    r(0, 0, 16, 18, '#c25a8a');
    r(3, 1, 12, 16, C.pink); r(3, 1, 12, 1, C.pinkL);
    r(15, 1, 1, 16, C.white);                                          // срез страниц
    r(1, 0, 1, 18, '#a8467a');                                         // корешок
    r(7, 6, 2, 1, C.gold); r(10, 6, 2, 1, C.gold); r(7, 7, 5, 2, C.gold); r(8, 9, 3, 1, C.gold); r(9, 10, 1, 1, C.gold);
    r(5, 13, 1, 1, C.white); r(12, 3, 1, 1, C.white); r(13, 14, 1, 1, C.white);
  }],

  // ------------------------------------------------------------ кухонная тумба 40×22 (поверхность)
  counter: [40, 22, (r) => {
    const m = '#f4f1ea';
    r(0, 0, 40, 3, m); r(0, 0, 40, 1, C.white); r(0, 2, 40, 1, '#d9d3c4');            // столешница
    r(6, 1, 3, 1, '#e6e1d4'); r(24, 1, 5, 1, '#e6e1d4');                               // прожилки
    r(1, 3, 38, 19, C.mint); r(1, 3, 1, 19, C.mintL); r(38, 3, 1, 19, C.mintD);
    r(13, 4, 1, 17, C.mintD); r(26, 4, 1, 17, C.mintD);                                // дверцы
    r(3, 5, 8, 6, C.mintL); r(15, 5, 9, 6, C.mintL); r(28, 5, 8, 6, C.mintL);          // филёнки
    r(10, 14, 2, 1, C.gold); r(15, 14, 2, 1, C.gold); r(28, 14, 2, 1, C.gold);         // ручки
    r(1, 21, 38, 1, C.mintD);
  }],

  // ------------------------------------------------------------ плита 24×26
  stove: [24, 26, (r) => {
    const w = '#f6f7fb';
    const d = '#c9ccd8';
    r(0, 0, 24, 4, '#5a5a6a'); r(0, 0, 24, 1, '#7a7a8a');                             // варочная панель
    r(3, 1, 6, 2, '#2b2b36'); r(15, 1, 6, 2, '#2b2b36'); r(5, 1, 2, 1, '#ff6b6b');    // конфорки
    r(0, 4, 24, 22, w); r(0, 4, 1, 22, C.white); r(23, 4, 1, 22, d);
    r(3, 6, 2, 2, C.pink); r(8, 6, 2, 2, C.pink); r(14, 6, 2, 2, C.gold); r(19, 6, 2, 2, C.gold); // ручки
    r(3, 10, 18, 11, d); r(4, 11, 16, 9, '#3a2e48'); r(5, 12, 4, 1, '#6a5a80');       // духовка
    r(6, 9, 12, 1, '#8a8ca0');                                                         // ручка духовки
    r(1, 24, 3, 2, '#5a5a6a'); r(20, 24, 3, 2, '#5a5a6a');
  }],

  // ------------------------------------------------------------ настенная полка 40×7 (на неё можно ставить)
  shelf: [40, 7, (r) => {
    r(0, 0, 40, 3, C.wood); r(0, 0, 40, 1, C.woodL); r(0, 2, 40, 1, C.woodD);
    r(4, 3, 2, 4, C.woodD); r(34, 3, 2, 4, C.woodD); r(5, 3, 1, 3, C.wood); r(35, 3, 1, 3, C.wood);
  }],

  // ------------------------------------------------------------ грядка 44×10 (3 лунки)
  gardenbed: [44, 10, (r) => {
    r(0, 2, 44, 8, C.woodD); r(0, 2, 44, 1, C.wood); r(0, 9, 44, 1, C.woodK);       // деревянный бортик
    r(2, 0, 40, 6, '#6b4a32'); r(2, 0, 40, 1, '#8a6446');                            // земля
    for (let x = 4; x < 42; x += 5) r(x, 2 + (x % 3), 1, 1, '#4f3524');               // комочки
    r(0, 2, 2, 8, C.wood); r(42, 2, 2, 8, C.wood);
  }],

  // ------------------------------------------------------------ яблоня 34×44
  tree: [34, 44, (r) => {
    r(14, 24, 6, 20, '#8d5a3b'); r(14, 24, 2, 20, '#a8714d'); r(19, 24, 1, 20, '#6e4430'); // ствол
    r(10, 42, 14, 2, '#6e4430');
    const crown = (cx, cy, rx, ry, col) => {
      for (let y = 0; y < 44; y++) for (let x = 0; x < 34; x++) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) r(x, y, 1, 1, col);
      }
    };
    crown(17, 14, 16, 13, '#4fa83d');
    crown(13, 10, 9, 7, '#6cc455');
    crown(22, 16, 8, 6, '#3f9030');
    for (const [x, y] of [[8, 12], [20, 7], [25, 17], [12, 20], [16, 13], [27, 10]]) {
      r(x, y, 3, 3, '#ef5a6f'); r(x, y, 1, 1, '#ffb0bb');                            // яблоки
    }
  }],

  // ------------------------------------------------------------ ковёр 50×11
  rug: [50, 11, (r) => {
    const ell = (k, col) => {
      for (let y = 0; y < 11; y++) {
        const dy = (y - 5) / (5.5 * k);
        if (Math.abs(dy) >= 1) continue;
        const hw = Math.round(25 * k * Math.sqrt(1 - dy * dy));
        if (hw > 0) r(25 - hw, y, hw * 2, 1, col);
      }
    };
    ell(1, C.pink); ell(0.78, C.pinkL); ell(0.5, C.pink); ell(0.25, C.white);
  }],
};

/** Каталог крупной мебели: subject — для правил поведения, icon — спрайт датасета для ящика. */
export const BIG_FURNITURE = [
  { key: 'bed', subject: 'bed', icon: 'bed' },
  { key: 'table', subject: 'table', icon: 'table' },
  { key: 'wardrobe', subject: 'wardrobe', icon: 'wardrobe' },
  { key: 'sofa', subject: 'sofa', icon: 'sofa' },
  { key: 'fridge', subject: 'refrigerator', icon: 'refrigerator' },
  { key: 'chest', subject: 'toy chest', icon: 'toy chest' },
  { key: 'lamp', subject: 'floor lamp', icon: 'floor lamp' },
  { key: 'rug', subject: 'round rug', icon: 'round rug' },
  { key: 'cauldron', subject: 'magic cauldron' },
  { key: 'counter', subject: 'kitchen counter' },
  { key: 'stove', subject: 'kitchen stove', icon: 'kitchen stove' },
  { key: 'shelf', subject: 'wall shelf', icon: 'wall shelf' },
  { key: 'gardenbed', subject: 'veggie patch' },
  { key: 'tree', subject: 'apple tree', icon: 'apple tree' },
  { key: 'album', subject: 'discovery album' },
];

export function makeFurnitureTextures(scene) {
  for (const [key, [w, h, draw]] of Object.entries(PIECES)) {
    const k = `big_${key}`;
    if (scene.textures.exists(k)) continue;
    const big = canvasFor(w, h, draw);
    scene.textures.addCanvas(k, big);
    // иконка 16×16 для ящика — уменьшенная копия той же мебели (без сглаживания)
    const ic = document.createElement('canvas');
    ic.width = ic.height = 16;
    const g = ic.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    // рисуем «внутренность» без старого контура в 14×14, затем обводим заново
    const sc = Math.min(14 / (big.width - 2), 14 / (big.height - 2));
    const dw = Math.max(1, Math.round((big.width - 2) * sc));
    const dh = Math.max(2, Math.round((big.height - 2) * sc));
    g.drawImage(big, 1, 1, big.width - 2, big.height - 2, 1 + Math.floor((14 - dw) / 2), 15 - dh, dw, dh);
    const d = g.getImageData(0, 0, 16, 16);
    for (let i = 0; i < d.data.length; i += 4) d.data[i + 3] = d.data[i + 3] > 127 ? 255 : 0; // без полупрозрачности
    g.putImageData(d, 0, 0);
    outline(ic);
    scene.textures.addCanvas(`${k}_icon`, ic);
  }
}
