// Село: рисунки и записи каталога. Всё нарисовано в коде в том же стиле, что и крупная мебель
// (заливка + блик + тень, потом общий тёмный контур), масштаб пикселя — 1.
// Поведение предмета задаёт поле beh: оно дописывается к правилам behaviorOf() в main.js.
import { canvasFor, iconFrom } from './furniture.js';

/** Рисунок из строк: буква — цвет из палитры, точка — пусто. */
const art = (rows, pal) => canvasFor(Math.max(...rows.map((r) => r.length)), rows.length,
  (r) => rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) r(x, y, 1, 1, pal[ch]); })));
/** Зеркально: животные нарисованы мордой влево, а в игре спрайты смотрят вправо. */
const mirror = (rows) => { const w = Math.max(...rows.map((r) => r.length)); return rows.map((r) => [...r.padEnd(w, '.')].reverse().join('')); };
/** Мелочь без контура (пчела, ворона): контур съел бы весь рисунок. */
const plain = (rows, pal) => {
  const c = document.createElement('canvas');
  c.width = Math.max(...rows.map((r) => r.length));
  c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
  return c;
};
const disc = (r, cx, cy, rad, col) => {
  for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) if (x * x + y * y <= rad * rad + 1) r(cx + x, cy + y, 1, 1, col);
};

// ---------------------------------------------------------------- животные (мордой влево, см. mirror)
const COW = [
  '.H..H.......................',
  '.HWWH.......................',
  'BWWWWB.....WWWWWWWWWWWWWW...',
  '.WEWWWWWWWWWWWBBBBWWWWWWWW..',
  '.WWWWWWWWWWWWBBBBBBWWWWWWWW.',
  'PPPWWWWWWWWWWBBBBBBWWWWBBWWT',
  'PEPWWWWWWWWWWWBBBBWWWWBBBBWT',
  'PPPWWWWWWBBWWWWWWWWWWWBBBBWT',
  '.PP..WWWBBBBWWWWWWWWWWWBBWWT',
  '.....WWWBBBBWWWWWWWWWWWWWWWT',
  '.....WWWWBBWWWWWWWWWWWWWWW.T',
  '.....GGGGGGGGGPPPPGGGGGGGG.T',
  '.....WWW.WWW..PPPP.WWW.WWW.B',
  '.....WWW.WWW...PP..WWW.WWW..',
  '.....WWW.WWW.......WWW.WWW..',
  '.....KKK.KKK.......KKK.KKK..',
];
const COW_PAL = { W: '#ffffff', G: '#d8dcec', B: '#4a3f55', P: '#f7a8b8', E: '#2b1d2e', H: '#e8d8a0', T: '#4a3f55', K: '#3a3040' };
const PIG = [
  '..PP..PP............',
  '.PPPPPPPPPPPPPPPPP..',
  '.PPPPPPPPPPPPPPPPPP.',
  'PPEPPPPPPPPPPPPPPPPC',
  'DDDDPPPPPPPPPPPPPPP.C',
  'DEDDPPPPPPPPPPPPPPPC',
  'DDDDPPPPPPPPPPPPPPP.',
  '.PPPPPPPPPPPPPPPPPP.',
  '..DDDDDDDDDDDDDDDD..',
  '..PPP.PPP...PPP.PPP.',
  '..KKK.KKK...KKK.KKK.',
];
const PIG_PAL = { P: '#f7a8b8', D: '#e0809a', E: '#2b1d2e', K: '#8a4a5a', C: '#e0809a' };
const SHEEP = [
  '.....WWWW.WWWW.WWW..',
  '...WWWWWWWWWWWWWWWW.',
  '.FFWWWSWWWWWSWWWWWWW',
  'FFFFWWWWWWWWWWWWSWWW',
  'FeFFWWWWSWWWWWWWWWWW',
  'FFFFWWWWWWWWWSWWWWWW',
  '.FFWWWWWWWWWWWWWWWWW',
  '...WWSWWWWWWWWWWSWW.',
  '....WWWWWWWWWWWWWW..',
  '....FF.FF....FF.FF..',
  '....FF.FF....FF.FF..',
  '....FF.FF....FF.FF..',
];
const SHEEP_PAL = { W: '#ffffff', S: '#d8dcec', F: '#5a5068', e: '#ffffff' };
const HEN = [
  '..RR.......',
  '.RWWW......',
  'YWEWW....WS',
  '.RWWWW..WWS',
  '..WWWWWWWWS',
  '..WWSSWWWW.',
  '..WWWSSWWW.',
  '...WWWWWW..',
  '....Y..Y...',
  '...YY.YY...',
];
const HEN_PAL = { W: '#fff8ee', S: '#f2dcc0', R: '#ef5a6f', Y: '#f2a83a', E: '#2b1d2e' };

// ---------------------------------------------------------------- постройки и техника
const coop = (hen) => canvasFor(30, 30, (r) => {
  r(4, 23, 2, 7, '#8d5a3b'); r(24, 23, 2, 7, '#8d5a3b');                              // ножки
  r(2, 10, 26, 14, '#e8b87a'); r(2, 10, 26, 1, '#f6d6a0'); r(2, 23, 26, 1, '#b8834f'); r(27, 10, 1, 14, '#c99a5c');
  r(2, 15, 26, 1, '#c99a5c'); r(2, 20, 26, 1, '#c99a5c');
  for (let i = 0; i < 10; i++) { const hw = Math.round(3 + i * 1.35); r(15 - hw, i, hw * 2, 1, i < 2 ? '#e0685c' : '#c8443a'); } // крыша
  r(0, 9, 30, 1, '#8e2a26');
  r(7, 14, 8, 9, '#4a2a30'); r(8, 13, 6, 1, '#4a2a30');                               // лаз
  r(19, 13, 6, 6, '#ffffff'); r(20, 14, 4, 4, '#9fdcff'); r(22, 14, 1, 4, '#ffffff'); // окошко
  for (let i = 0; i < 6; i++) { r(Math.round(8 - i * 1.3), 24 + i, 6, 1, i % 2 ? '#c99a5c' : '#a8693c'); } // трап
  if (hen) {
    r(9, 17, 5, 6, '#fff8ee'); r(10, 15, 3, 2, '#fff8ee'); r(10, 14, 2, 1, '#ef5a6f');
    r(8, 16, 2, 1, '#f2a83a'); r(11, 16, 1, 1, '#2b1d2e');
  }
});

const haystack = () => canvasFor(36, 22, (r) => {
  const hw = (y) => Math.round(18 * Math.sqrt(1 - ((21 - y) / 22) ** 2));
  for (let y = 0; y < 22; y++) r(18 - hw(y), y, hw(y) * 2, 1, y > 19 ? '#d8a838' : '#f2c94c');
  for (let i = 0; i < 60; i++) {
    const x = ((i * 23 + 5) % 34) + 1;
    const y = ((i * 17 + 3) % 17) + 2;
    if (Math.abs(x - 18) < hw(y) - 1) r(x, y, 1, 2, i % 3 ? '#d8a838' : '#ffe78a');
  }
});

const well = () => canvasFor(26, 32, (r) => {
  for (let i = 0; i < 6; i++) { const hw = 3 + i * 2; r(13 - hw, i, hw * 2, 1, i < 1 ? '#e0685c' : '#c8443a'); } // крыша
  r(4, 6, 2, 14, '#a8714d'); r(4, 6, 1, 14, '#c98a52'); r(20, 6, 2, 14, '#a8714d'); r(20, 6, 1, 14, '#c98a52');
  r(6, 9, 14, 1, '#7a4a32'); r(22, 9, 3, 1, '#7a4a32'); r(24, 9, 1, 4, '#7a4a32');    // ворот с ручкой
  r(13, 10, 1, 5, '#e8d8a0');                                                         // верёвка
  r(11, 15, 5, 4, '#8fa8f2'); r(11, 15, 5, 1, '#d6e0ff');                             // ведро
  r(2, 19, 22, 13, '#b8bccc'); r(2, 19, 22, 2, '#d8dcec'); r(2, 30, 22, 2, '#8f96b0'); // каменный сруб
  r(2, 24, 22, 1, '#8f96b0'); r(2, 27, 22, 1, '#8f96b0');
  for (const x of [8, 15, 20]) r(x, 21, 1, 3, '#8f96b0');
  for (const x of [5, 12, 18]) r(x, 25, 1, 2, '#8f96b0');
  for (const x of [9, 16, 21]) r(x, 28, 1, 2, '#8f96b0');
});

const scarecrow = () => canvasFor(22, 34, (r) => {
  r(10, 12, 2, 22, '#8d5a3b');                                                         // шест
  r(0, 13, 22, 2, '#8d5a3b');                                                          // перекладина
  r(3, 11, 16, 6, '#e0483e'); r(6, 17, 10, 8, '#e0483e');                              // рубаха в клетку
  r(3, 13, 16, 1, '#b8342c'); r(8, 11, 1, 14, '#b8342c'); r(13, 11, 1, 14, '#b8342c'); r(6, 20, 10, 1, '#b8342c');
  r(0, 12, 3, 4, '#f2c94c'); r(19, 12, 3, 4, '#f2c94c'); r(0, 16, 1, 2, '#d8a838'); r(21, 16, 1, 2, '#d8a838'); // соломенные кисти
  r(5, 25, 12, 2, '#f2c94c'); for (let x = 5; x < 17; x += 2) r(x, 27, 1, 2, '#d8a838'); // солома из-под рубахи
  r(7, 2, 8, 9, '#f2d6a0'); r(8, 1, 6, 1, '#f2d6a0'); r(8, 11, 6, 1, '#d8b878');        // голова-мешок
  r(9, 5, 1, 2, '#2b1d2e'); r(12, 5, 1, 2, '#2b1d2e');
  r(9, 8, 4, 1, '#b8342c'); r(8, 7, 1, 1, '#b8342c'); r(13, 7, 1, 1, '#b8342c');        // улыбка
  r(9, 0, 1, 1, '#f2c94c'); r(11, 0, 2, 1, '#f2c94c');
});

/** Фруктовое дерево: та же форма, что у яблони у дома, — другие листья и плоды. */
const fruitTree = ([leaf, leafL, leafD], fruit) => canvasFor(34, 44, (r) => {
  r(14, 24, 6, 20, '#8d5a3b'); r(14, 24, 2, 20, '#a8714d'); r(19, 24, 1, 20, '#6e4430');
  r(10, 42, 14, 2, '#6e4430');
  const crown = (cx, cy, rx, ry, col) => {
    for (let y = 0; y < 44; y++) for (let x = 0; x < 34; x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) r(x, y, 1, 1, col);
    }
  };
  crown(17, 14, 16, 13, leaf);
  crown(13, 10, 9, 7, leafL);
  crown(22, 16, 8, 6, leafD);
  for (const [x, y] of [[8, 12], [20, 7], [25, 17], [12, 20], [16, 13], [27, 10]]) fruit(r, x, y);
});
const pearFruit = (r, x, y) => { r(x + 1, y, 1, 1, '#e6e85a'); r(x, y + 1, 3, 3, '#e6e85a'); r(x, y + 1, 1, 1, '#fafcc0'); r(x + 1, y - 1, 1, 1, '#6e4430'); };
const cherryFruit = (r, x, y) => { r(x + 1, y - 1, 2, 1, '#2f6a28'); r(x, y, 2, 2, '#e0203a'); r(x + 2, y + 1, 2, 2, '#e0203a'); r(x, y, 1, 1, '#ff9aa8'); };
const plumFruit = (r, x, y) => { r(x, y, 3, 3, '#8a52cc'); r(x, y, 1, 1, '#c8a8f0'); };

const hive = () => canvasFor(16, 20, (r) => {
  for (let y = 0; y < 15; y++) {
    const hw = Math.round(7 * Math.sqrt(1 - (((14 - y) / 15) ** 2) * 0.95));
    r(8 - hw, y, hw * 2, 1, y % 3 === 2 ? '#d8a838' : '#f2c94c');
  }
  r(3, 2, 2, 1, '#ffe78a'); r(2, 5, 2, 1, '#ffe78a');
  r(6, 9, 4, 4, '#4a2a30'); r(7, 8, 2, 1, '#4a2a30');                                  // леток
  r(0, 15, 16, 2, '#a8714d'); r(0, 15, 16, 1, '#c98a52'); r(2, 17, 2, 3, '#8d5a3b'); r(12, 17, 2, 3, '#8d5a3b');
});

const hammock = () => canvasFor(46, 22, (r) => {
  r(1, 2, 3, 19, '#a8714d'); r(1, 2, 1, 19, '#c98a52'); r(42, 2, 3, 19, '#a8714d'); r(42, 2, 1, 19, '#c98a52');
  r(0, 20, 6, 2, '#8d5a3b'); r(40, 20, 6, 2, '#8d5a3b');
  for (let x = 4; x < 42; x++) {
    const sag = Math.round(7 * Math.sin((Math.PI * (x - 4)) / 37));
    r(x, 5 + sag, 1, 4, ['#ff9ac8', '#ffffff', '#7ad9b5', '#ffffff'][Math.floor(x / 3) % 4]);
    r(x, 9 + sag, 1, 1, '#d97aa5');
  }
});

const birdhouse = () => canvasFor(14, 36, (r) => {
  r(6, 15, 2, 21, '#a8714d'); r(6, 15, 1, 21, '#c98a52'); r(4, 34, 6, 2, '#8d5a3b');
  r(1, 5, 12, 11, '#7ad9b5'); r(1, 5, 1, 11, '#a8f0d4'); r(12, 5, 1, 11, '#52b893');
  for (let i = 0; i < 5; i++) { const hw = Math.round(1 + i * 1.5); r(7 - hw, i, hw * 2, 1, i < 1 ? '#e0685c' : '#c8443a'); }
  r(5, 8, 4, 4, '#4a2a30'); r(6, 13, 2, 1, '#8d5a3b');
});

/** Мельница: два кадра крыльев — «плюсом» и «крестом» (чередуются, пока она крутится). */
const windmill = (diag) => canvasFor(36, 50, (r) => {
  for (let y = 16; y < 50; y++) { const hw = Math.round(7 + (y - 16) * 0.16); r(18 - hw, y, hw * 2, 1, '#f4ead8'); r(18 + hw - 2, y, 2, 1, '#e3cfae'); }
  r(15, 41, 6, 9, '#8d5a3b'); r(15, 41, 6, 1, '#6e4430'); r(19, 45, 1, 1, '#f2c94c');
  r(16, 30, 4, 5, '#5a7fd9'); r(16, 30, 4, 1, '#9fdcff');
  for (let i = 0; i < 6; i++) { const hw = Math.round(3 + i * 1.6); r(18 - hw, 10 + i, hw * 2, 1, i < 1 ? '#e0685c' : '#c8443a'); }
  const cx = 18;
  const cy = 14;
  const dirs = diag ? [[1, -1], [1, 1], [-1, 1], [-1, -1]] : [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const len = diag ? 10 : 13;
  for (const [sx, sy] of dirs) {
    for (let i = 1; i <= len; i++) {
      r(cx + sx * i, cy + sy * i, 1, 1, '#7a4a32');
      if (i < 4) continue;
      for (let k = 1; k <= 3; k++) r(cx + sx * i - sy * k, cy + sy * i + sx * k, 1, 1, (i + k) % 3 ? '#fff8e8' : '#e0d2b4'); // парус
    }
  }
  r(cx - 1, cy - 1, 3, 3, '#f2c94c');
});

const tractor = () => canvasFor(40, 26, (r) => {
  r(12, 12, 24, 6, '#e0483e'); r(12, 17, 24, 1, '#b8342c');                            // рама
  r(20, 6, 16, 7, '#e0483e'); r(20, 6, 16, 1, '#ff7a6e'); r(35, 7, 2, 9, '#8e2a26'); r(36, 9, 1, 2, '#ffe066'); // капот, решётка, фара
  r(29, 0, 2, 6, '#8f96b0'); r(28, 0, 4, 1, '#5a5068');                                // труба
  r(5, 0, 2, 8, '#3a3040'); r(5, 7, 9, 2, '#3a3040');                                  // сиденье
  r(18, 3, 1, 4, '#3a3040'); r(16, 2, 5, 1, '#3a3040');                                // руль
  disc(r, 10, 16, 9, '#3a3040'); disc(r, 10, 16, 5, '#f2c94c'); disc(r, 10, 16, 2, '#c99a2e');
  disc(r, 31, 20, 5, '#3a3040'); disc(r, 31, 20, 2, '#f2c94c');
});

const cart = (full) => canvasFor(46, 22, (r) => {
  if (full) { r(10, 1, 6, 5, '#f2955a'); r(12, 0, 2, 1, '#4fa83d'); r(18, 0, 7, 6, '#7ad98a'); r(27, 2, 6, 4, '#ef5a6f'); r(29, 1, 2, 1, '#4fa83d'); } // груз
  r(5, 6, 36, 9, '#c98a52'); r(5, 6, 36, 1, '#e0a971'); r(5, 14, 36, 1, '#a8693c');
  for (let x = 11; x < 41; x += 6) r(x, 7, 1, 7, '#a8693c');
  r(4, 5, 1, 10, '#8d5a3b'); r(41, 5, 1, 10, '#8d5a3b'); r(41, 10, 5, 1, '#8d5a3b');   // стойки и оглобля
  for (const cx of [13, 33]) {
    disc(r, cx, 16, 5, '#7a4a32'); disc(r, cx, 16, 3, '#e0a971');
    r(cx - 3, 16, 7, 1, '#7a4a32'); r(cx, 13, 1, 7, '#7a4a32'); r(cx, 16, 1, 1, '#f2c94c');
  }
});

const houseIcon = (r, x, y) => {
  r(x + 3, y, 2, 1, '#e0483e'); r(x + 2, y + 1, 4, 1, '#e0483e'); r(x + 1, y + 2, 6, 1, '#e0483e'); r(x, y + 3, 8, 1, '#e0483e');
  r(x + 1, y + 4, 6, 4, '#ffd0e4'); r(x + 3, y + 5, 2, 3, '#8d5a3b');
};
const barnIcon = (r, x, y) => {
  r(x + 2, y, 4, 1, '#6b4a58'); r(x + 1, y + 1, 6, 1, '#6b4a58'); r(x, y + 2, 8, 6, '#c8443a');
  r(x + 3, y + 4, 2, 4, '#ffffff'); r(x + 3, y + 2, 2, 1, '#f2c94c');
};
/** Указатель у калитки: доска-стрелка с картинкой места, куда он ведёт. */
const sign = (icon) => canvasFor(16, 26, (r) => {
  r(7, 10, 2, 16, '#a8714d'); r(7, 10, 1, 16, '#c98a52');
  r(0, 0, 14, 11, '#f4ead8'); r(0, 0, 14, 1, '#ffffff'); r(0, 10, 14, 1, '#d8c8a8');
  r(14, 2, 1, 7, '#f4ead8'); r(15, 4, 1, 3, '#f4ead8');
  icon(r, 3, 2);
});
/** Значок локации для карты. */
const placeIcon = (icon) => canvasFor(12, 10, (r) => icon(r, 2, 1));

const sheaf = () => canvasFor(10, 13, (r) => {
  for (const x of [1, 3, 5, 7]) { r(x, 0, 2, 4, '#f6dc7a'); r(x, 1, 1, 2, '#d9a93a'); } // колосья
  r(2, 4, 6, 3, '#e0b848'); r(3, 7, 4, 1, '#c8443a');
  r(1, 8, 8, 5, '#e0b848'); for (const x of [2, 4, 6, 8]) r(x, 8, 1, 5, '#c49a3c');
});

const CROW_PAL = { K: '#3a3040', W: '#ffffff', Y: '#f2a83a' };

export function makeVillageArt(scene) {
  const T = scene.textures;
  const add = (key, canvas, icon = true) => {
    if (T.exists(key)) return;
    T.addCanvas(key, canvas);
    if (icon) T.addCanvas(`${key}_icon`, iconFrom(canvas, false));
  };
  add('farm_cow', art(mirror(COW), COW_PAL));
  add('farm_pig', art(mirror(PIG), PIG_PAL));
  add('farm_sheep', art(mirror(SHEEP), SHEEP_PAL));
  add('farm_hen', art(mirror(HEN), HEN_PAL));
  add('coop', coop(false));
  add('coop_hen', coop(true), false);
  add('haystack', haystack());
  add('well', well());
  add('scarecrow', scarecrow());
  add('peartree', fruitTree(['#7cc25a', '#9ad873', '#5fa844'], pearFruit));
  add('cherrytree', fruitTree(['#3f9a4a', '#5cc06a', '#2f7a3a'], cherryFruit));
  add('plumtree', fruitTree(['#4a9a6a', '#6cc08a', '#3a7a54'], plumFruit));
  add('hive', hive());
  add('hammock', hammock());
  add('birdhouse', birdhouse());
  add('windmill', windmill(false));
  add('windmill_b', windmill(true), false);
  add('tractor', tractor());
  add('cart', cart(false));
  add('cart_full', cart(true), false);
  add('sheaf', sheaf());
  add('sign_home', sign(houseIcon));
  add('sign_village', sign(barnIcon));
  add('place_home', placeIcon(houseIcon), false);
  add('place_village', placeIcon(barnIcon), false);
  add('bucket', canvasFor(5, 5, (r) => { r(0, 0, 5, 5, '#8fa8f2'); r(0, 0, 5, 1, '#d6e0ff'); r(1, 1, 3, 1, '#5ac4f2'); }), false);
  add('bee', plain(['WW..', 'YKYK', 'YKYK'], { W: '#ffffff', Y: '#ffd84a', K: '#2b1d2e' }), false);
  add('crow', plain(['...KKK...', '..KKWKY..', '.KKKKK...', 'KKKKKK...', '.KKKK....', '..Y.Y....'], CROW_PAL), false);
  add('crow_fly', plain(['K.......K', 'KK.KKK.KK', '.KKKWKYK.', '..KKKKK..', '...KKK...'], CROW_PAL), false);

  // bbox животных — «где голова»: по нему садятся шапки и бантики (см. наряды питомцев в update)
  const animal = (id, subject, tex, farm, bbox, order) => ({ id, subject, cat: 'animal', tags: [], tex, bbox, order, beh: { farm } });
  const big = (id, subject, beh, order, extra = {}) => ({ id, subject, cat: 'furniture', tags: ['furniture'], tex: id, bbox: [0, 0, 15, 15], order, beh, ...extra });
  return [
    animal('farm-cow', 'farm cow', 'farm_cow', 'cow', [19, -1, 19, 15], 1),
    animal('farm-pig', 'farm pig', 'farm_pig', 'pig', [15, 3, 15, 15], 2),
    animal('farm-sheep', 'farm sheep', 'farm_sheep', 'sheep', [15, 2, 16, 15], 3),
    animal('farm-hen', 'farm hen', 'farm_hen', 'hen', [10, 4, 11, 15], 4),
    big('coop', 'hen house', { coop: true }, 50),
    big('haystack', 'haystack', { hay: true, perch: { dy: 13, lo: -9, hi: 9 } }, 51),
    big('well', 'village well', { well: true }, 52),
    big('scarecrow', 'scarecrow', { scarecrow: true }, 53, { bbox: [7, -17, 8, 15] }),
    big('peartree', 'pear tree', { fruit: 'pear' }, 54),
    big('cherrytree', 'cherry tree', { fruit: 'pair of cherries' }, 55),
    big('plumtree', 'plum tree', { fruit: 'plum' }, 56),
    big('hive', 'straw beehive', { hive: true }, 57),
    big('hammock', 'garden hammock', {}, 58),
    big('birdhouse', 'bird house on a pole', { birdhouse: true }, 59),
    big('windmill', 'windmill', { mill: true }, 60),
    big('tractor', 'red tractor', { tractor: true, perch: { dy: 9, lo: -10, hi: -10, behind: true } }, 61),
    big('cart', 'travel cart', { cart: true, container: true, perch: { dy: 10, lo: -13, hi: 11, behind: true } }, 62),
    { id: 'sheaf', subject: 'wheat sheaf', cat: 'garden', tags: ['garden'], tex: 'sheaf', bbox: [0, 0, 15, 15], hidden: true, beh: { sheaf: true } },
  ];
}
