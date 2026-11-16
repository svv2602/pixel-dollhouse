// Спальня и сад, третья волна: фотоаппарат и фото на стену, тучка с дождём, клад, звёзды ночника.
import { canvasFor, outline } from './furniture.js';

const tex = (scene, key, canvas) => {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, canvas);
  return key;
};

export function makePlay(scene) {
  const recs = [];
  const add = (key, canvas) => { tex(scene, key, canvas); tex(scene, `${key}_icon`, canvas); };

  add('camera', canvasFor(15, 11, (r) => {
    r(0, 2, 15, 9, '#5ac4f2'); r(0, 2, 15, 1, '#9fdcff'); r(0, 10, 15, 1, '#2f96cc');   // корпус
    r(2, 0, 4, 2, '#2f96cc'); r(11, 0, 3, 2, '#ff7ab8');                               // видоискатель и кнопка
    r(4, 3, 7, 7, '#ffffff'); r(5, 4, 5, 5, '#2b1d2e'); r(6, 5, 2, 2, '#8fa8f2');      // объектив
    r(12, 4, 2, 2, '#fff6a8');                                                          // вспышка
  }));
  recs.push({ id: 'camera', subject: 'instant camera', cat: 'toy', tags: ['toy'], tex: 'camera', camera: true, bbox: [0, 0, 15, 15], order: 29 });
  // фото на стене: текстура у каждого снимка своя (photo_<id>); это — заглушка, пока картинка грузится
  add('photo_blank', canvasFor(32, 26, (r) => { r(0, 0, 32, 26, '#ffffff'); r(2, 2, 28, 18, '#d6dfe8'); }));
  recs.push({ id: 'photo', subject: 'photo', cat: 'toy', tags: ['toy'], tex: 'photo_blank', photo: true, wall: true, bbox: [0, 0, 15, 15], hidden: true });

  tex(scene, 'raincloud', canvasFor(30, 12, (r) => {
    r(2, 5, 26, 7, '#ffffff'); r(6, 2, 10, 4, '#ffffff'); r(14, 0, 9, 6, '#ffffff'); r(0, 7, 30, 4, '#ffffff');
    r(17, 1, 3, 2, '#ffffff'); r(2, 10, 26, 1, '#d6e4f0');
  }));
  tex(scene, 'raindrop', (() => { const c = document.createElement('canvas'); c.width = 1; c.height = 3; const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 1, 3); return c; })());
  tex(scene, 'dig_x', canvasFor(7, 5, (r) => {
    for (let i = 0; i < 5; i++) { r(i + 1, i, 1, 1, '#ffd84a'); r(5 - i, i, 1, 1, '#ffd84a'); }
  }));
  tex(scene, 'star_px', canvasFor(5, 5, (r) => { r(2, 0, 1, 5, '#fff6a8'); r(0, 2, 5, 1, '#fff6a8'); r(1, 1, 3, 3, '#fff6a8'); }));
  tex(scene, 'moon_px', canvasFor(8, 8, (r, clear) => {
    r(2, 0, 4, 8, '#fff6c2'); r(0, 2, 8, 4, '#fff6c2'); r(1, 1, 6, 6, '#fff6c2');
    for (let y = 0; y < 6; y++) for (let x = 4; x < 8; x++) if ((x - 6) ** 2 + (y - 2) ** 2 < 7) clear(x, y); // серп
  }));
  return recs;
}

/** Радуга — приплюснутая дуга w×h (полуэллипс), чтобы поместиться в небе над забором. */
export function rainbowTex(scene, w, h) {
  const key = `rainbow_${w}x${h}`;
  if (scene.textures.exists(key)) return key;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const bands = ['#ff5a6f', '#ff9a5a', '#ffd84a', '#7ad9b5', '#5ac4f2', '#8fa8f2', '#c48ff2'];
  const rx = w / 2;
  const ry = h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot((x + 0.5 - rx) / rx, (ry - y - 0.5) / ry);
      const k = Math.floor(((1 - d) * ry) / 2); // полосы по 2 пикселя (по высоте дуги)
      if (k >= 0 && k < bands.length) { g.fillStyle = bands[k]; g.fillRect(x, y, 1, 1); }
    }
  }
  scene.textures.addCanvas(key, c);
  return key;
}

/** Снимок экрана -> маленькая пиксельная фотография в белой рамке (data URL). */
export function makePhoto(img, cw, ch) {
  const a = document.createElement('canvas');
  a.width = cw; a.height = ch;
  const ga = a.getContext('2d');
  ga.imageSmoothingEnabled = false;
  ga.drawImage(img, 0, 0, img.width, img.height, 0, 0, cw, ch); // до арт-пикселей
  const pw = Math.max(8, Math.round(cw / 4));
  const ph = Math.max(6, Math.round(ch / 4));
  const b = document.createElement('canvas');
  b.width = pw; b.height = ph;
  const gb = b.getContext('2d');
  gb.imageSmoothingEnabled = true;
  gb.imageSmoothingQuality = 'high';
  gb.drawImage(a, 0, 0, pw, ph);
  const out = document.createElement('canvas');
  out.width = pw + 6; out.height = ph + 9;
  const g = out.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(1, 1, pw + 4, ph + 7);
  g.drawImage(b, 3, 3);
  outline(out);
  return out.toDataURL('image/png');
}
